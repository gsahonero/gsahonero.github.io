/**
 * assets/js/post_mrijs.js
 * Scrollytelling Interactive Driver for MRIjs Blog Post
 * Synchronizes article reading steps with real-time 3D Bloch simulations
 * using the official online MRIjs BlochSimulator engine.
 * Supports adjustable speed and dynamic sequence parameters (TE/TR for SE, FA/TE/TR for GRE).
 */

(function () {
  'use strict';

  // 3D Canvas & Graphics State
  let stageCanvas, stageCtx;
  let signalCanvas, signalCtx;
  let animFrameId = null;

  // Viewport Orbit Angles
  let viewPitch = 0.45; // Elevation
  let viewYaw = 0.85;   // Azimuth
  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  // Playback State
  let isPlaying = true;
  let currentStepIdx = 0;
  let playbackSpeed = 1.0;
  let lastTimeMs = performance.now();

  // Active Simulation Run
  let currentScenario = 'MATH'; // 'MATH', 'FID', 'SE', 'GRE', 'EXPLORE'
  let currentSimResult = null;
  let currentSpins = [];
  let simTimeLimit = 250; // ms
  let dt = 1.0;           // ms

  // Sequence Parameters State (Adjustable by User)
  const seqParams = {
    FID: { flipAngle: 90, TR: 250 },
    SE: { flipAngle: 90, TE: 80, TR: 160 },
    GRE: { flipAngle: 30, TE: 60, TR: 120 }
  };

  // Spin Palette Colors
  const SPINS_PALETTE = [
    '#3b82f6', // Bright Blue
    '#10b981', // Emerald Green
    '#f59e0b', // Amber Orange
    '#ec4899', // Pink
    '#8b5cf6'  // Violet Purple
  ];

  // DOM Elements Cache
  let dom = {};

  // Wait for DOM
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheDomElements();
    if (!stageCanvas) return;
    setupCanvas();
    setupEventListeners();
    setupParameterControls();
    setupSpeedControls();
    setupScrollytellingObserver();

    // Register with layout StageController
    window.PostInteractiveController = {
      onStepChange(stepData) {
        if (stepData && stepData.scenario) {
          loadScenario(stepData.scenario);
        }
      }
    };

    window.addEventListener('post:stage-step', (e) => {
      if (e.detail && e.detail.scenario) {
        loadScenario(e.detail.scenario);
      }
    });

    // Initial setup with Math/Physics overview
    loadScenario('MATH');

    // Notify stage controller that simulation is mounted and ready
    if (window.StageController && typeof window.StageController.markReady === 'function') {
      window.StageController.markReady();
    }

    // Start render/animation loop
    lastTimeMs = performance.now();
    animFrameId = requestAnimationFrame(animationLoop);
  }

  function cacheDomElements() {
    stageCanvas = document.getElementById('stage-canvas');
    signalCanvas = document.getElementById('signal-canvas');

    if (stageCanvas) stageCtx = stageCanvas.getContext('2d');
    if (signalCanvas) signalCtx = signalCanvas.getContext('2d');

    dom = {
      title: document.getElementById('stage-panel-title'),
      subtitle: document.getElementById('stage-panel-subtitle'),
      tag: document.getElementById('stage-scenario-tag'),
      hudTime: document.getElementById('hud-time'),
      hudMxy: document.getElementById('hud-mxy'),
      hudMz: document.getElementById('hud-mz'),
      hudSpins: document.getElementById('hud-spins'),
      btnPlayPause: document.getElementById('btn-play-pause'),
      playPauseIcon: document.getElementById('play-pause-icon'),
      btnRestart: document.getElementById('btn-restart'),
      btnOverride: document.getElementById('btn-scenario-override'),
      timeSlider: document.getElementById('stage-time-slider'),
      sliderMax: document.getElementById('slider-max-time'),
      plotIndicator: document.getElementById('plot-indicator'),
      speedDisplay: document.getElementById('speed-display')
    };
  }

  function setupCanvas() {
    handleResize();
    window.addEventListener('resize', handleResize);
  }

  function handleResize() {
    const dpr = window.devicePixelRatio || 1;
    if (stageCanvas && stageCtx) {
      const rect = stageCanvas.getBoundingClientRect();
      stageCanvas.width = rect.width * dpr;
      stageCanvas.height = rect.height * dpr;
      stageCtx.resetTransform();
      stageCtx.scale(dpr, dpr);
    }
    if (signalCanvas && signalCtx) {
      const rect = signalCanvas.getBoundingClientRect();
      signalCanvas.width = rect.width * dpr;
      signalCanvas.height = rect.height * dpr;
      signalCtx.resetTransform();
      signalCtx.scale(dpr, dpr);
    }
  }

  // =========================================================================
  // Scrollytelling Intersection Observer
  // =========================================================================
  function setupScrollytellingObserver() {
    const steps = document.querySelectorAll('.scroll-step');
    if (!steps || steps.length === 0) return;

    const scroller = document.getElementById('post-scroller') || null;

    const observerOptions = {
      root: window.innerWidth > 1024 ? scroller : null,
      rootMargin: '-25% 0px -35% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          steps.forEach(s => s.classList.remove('is-active'));
          entry.target.classList.add('is-active');

          const scenario = entry.target.getAttribute('data-scenario') || 'MATH';
          const stepId = entry.target.id;
          updateOutlineActive(stepId);
          loadScenario(scenario);
        }
      });
    }, observerOptions);

    steps.forEach(step => observer.observe(step));
  }

  function updateOutlineActive(stepId) {
    document.querySelectorAll('.outline-item').forEach(item => {
      if (item.getAttribute('data-step-target') === stepId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  // =========================================================================
  // Speed Adjustment Controls
  // =========================================================================
  function setupSpeedControls() {
    const speedButtons = document.querySelectorAll('.speed-pill-btn');
    speedButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        speedButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const speedVal = parseFloat(this.getAttribute('data-speed')) || 1.0;
        playbackSpeed = speedVal;
        if (dom.speedDisplay) {
          dom.speedDisplay.textContent = `${speedVal}x`;
        }
      });
    });
  }

  // =========================================================================
  // Sequence Parameter Controls (TE/TR for SE, FA/TE/TR for GRE, FA for FID)
  // =========================================================================
  function setupParameterControls() {
    // SE Controls: TE and TR
    const sliderSeTe = document.getElementById('slider-se-te');
    const valSeTe = document.getElementById('val-se-te');
    const sliderSeTr = document.getElementById('slider-se-tr');
    const valSeTr = document.getElementById('val-se-tr');

    if (sliderSeTe) {
      sliderSeTe.addEventListener('input', function () {
        const teVal = parseInt(this.value, 10);
        seqParams.SE.TE = teVal;
        if (valSeTe) valSeTe.textContent = `${teVal} ms`;

        // Ensure TR > TE + 10 ms
        if (seqParams.SE.TR <= teVal + 10) {
          seqParams.SE.TR = teVal + 20;
          if (sliderSeTr) sliderSeTr.value = seqParams.SE.TR;
          if (valSeTr) valSeTr.textContent = `${seqParams.SE.TR} ms`;
        }
        recalculateActiveSimulation();
      });
    }

    if (sliderSeTr) {
      sliderSeTr.addEventListener('input', function () {
        const trVal = parseInt(this.value, 10);
        seqParams.SE.TR = trVal;
        if (valSeTr) valSeTr.textContent = `${trVal} ms`;

        // Ensure TE < TR - 10 ms
        if (seqParams.SE.TE >= trVal - 10) {
          seqParams.SE.TE = Math.max(20, trVal - 20);
          if (sliderSeTe) sliderSeTe.value = seqParams.SE.TE;
          if (valSeTe) valSeTe.textContent = `${seqParams.SE.TE} ms`;
        }
        recalculateActiveSimulation();
      });
    }

    // GRE Controls: FA, TE, and TR
    const sliderGreFa = document.getElementById('slider-gre-fa');
    const valGreFa = document.getElementById('val-gre-fa');
    const sliderGreTe = document.getElementById('slider-gre-te');
    const valGreTe = document.getElementById('val-gre-te');
    const sliderGreTr = document.getElementById('slider-gre-tr');
    const valGreTr = document.getElementById('val-gre-tr');

    if (sliderGreFa) {
      sliderGreFa.addEventListener('input', function () {
        const faVal = parseInt(this.value, 10);
        seqParams.GRE.flipAngle = faVal;
        if (valGreFa) valGreFa.textContent = `${faVal}°`;
        recalculateActiveSimulation();
      });
    }

    if (sliderGreTe) {
      sliderGreTe.addEventListener('input', function () {
        const teVal = parseInt(this.value, 10);
        seqParams.GRE.TE = teVal;
        if (valGreTe) valGreTe.textContent = `${teVal} ms`;

        if (seqParams.GRE.TR <= teVal + 15) {
          seqParams.GRE.TR = teVal + 25;
          if (sliderGreTr) sliderGreTr.value = seqParams.GRE.TR;
          if (valGreTr) valGreTr.textContent = `${seqParams.GRE.TR} ms`;
        }
        recalculateActiveSimulation();
      });
    }

    if (sliderGreTr) {
      sliderGreTr.addEventListener('input', function () {
        const trVal = parseInt(this.value, 10);
        seqParams.GRE.TR = trVal;
        if (valGreTr) valGreTr.textContent = `${trVal} ms`;

        if (seqParams.GRE.TE >= trVal - 15) {
          seqParams.GRE.TE = Math.max(15, trVal - 25);
          if (sliderGreTe) sliderGreTe.value = seqParams.GRE.TE;
          if (valGreTe) valGreTe.textContent = `${seqParams.GRE.TE} ms`;
        }
        recalculateActiveSimulation();
      });
    }

    // FID Controls: FA
    const sliderFidFa = document.getElementById('slider-fid-fa');
    const valFidFa = document.getElementById('val-fid-fa');
    if (sliderFidFa) {
      sliderFidFa.addEventListener('input', function () {
        const faVal = parseInt(this.value, 10);
        seqParams.FID.flipAngle = faVal;
        if (valFidFa) valFidFa.textContent = `${faVal}°`;
        recalculateActiveSimulation();
      });
    }
  }

  function updateParamPanelsVisibility(scenario) {
    const mathPanel = document.getElementById('params-math');
    const fidPanel = document.getElementById('params-fid');
    const sePanel = document.getElementById('params-se');
    const grePanel = document.getElementById('params-gre');
    const headerTitle = document.getElementById('params-header-title');

    if (mathPanel) mathPanel.style.display = 'none';
    if (fidPanel) fidPanel.style.display = 'none';
    if (sePanel) sePanel.style.display = 'none';
    if (grePanel) grePanel.style.display = 'none';

    if (scenario === 'SE') {
      if (sePanel) sePanel.style.display = 'block';
      if (headerTitle) headerTitle.textContent = 'Spin Echo Parameters (TE / TR)';
    } else if (scenario === 'GRE') {
      if (grePanel) grePanel.style.display = 'block';
      if (headerTitle) headerTitle.textContent = 'Gradient Echo (FA / TE / TR)';
    } else if (scenario === 'FID') {
      if (fidPanel) fidPanel.style.display = 'block';
      if (headerTitle) headerTitle.textContent = 'FID Parameters (Flip Angle)';
    } else {
      if (mathPanel) mathPanel.style.display = 'block';
      if (headerTitle) headerTitle.textContent = 'Sequence Parameters';
    }
  }

  function recalculateActiveSimulation() {
    if (currentScenario === 'SE') {
      simTimeLimit = seqParams.SE.TR;
      runSimulation('SE', currentSpins, simTimeLimit, {
        flipAngle: seqParams.SE.flipAngle,
        TE: seqParams.SE.TE,
        TR: seqParams.SE.TR
      });
    } else if (currentScenario === 'GRE') {
      simTimeLimit = seqParams.GRE.TR;
      runSimulation('GRE', currentSpins, simTimeLimit, {
        flipAngle: seqParams.GRE.flipAngle,
        TE: seqParams.GRE.TE,
        TR: seqParams.GRE.TR
      });
    } else if (currentScenario === 'FID') {
      simTimeLimit = seqParams.FID.TR;
      runSimulation('FID', currentSpins, simTimeLimit, {
        flipAngle: seqParams.FID.flipAngle,
        TR: seqParams.FID.TR
      });
    }

    if (dom.timeSlider) dom.timeSlider.max = simTimeLimit;
    if (dom.sliderMax) dom.sliderMax.textContent = `${simTimeLimit} ms`;
  }

  // =========================================================================
  // Scenario Configuration & Bloch Simulation Execution
  // =========================================================================
  function loadScenario(scenario) {
    currentScenario = scenario;
    currentStepIdx = 0;

    let scenarioTitle = 'Bloch Dynamics Engine';
    let scenarioSubtitle = 'Rotating Reference Frame';
    let badgeText = scenario;

    let isochromats = [];
    let params = {};
    let simTime = 250;

    updateParamPanelsVisibility(scenario);

    if (scenario === 'MATH' || scenario === 'INTRO') {
      scenarioTitle = 'NMR Equilibrium & Coordinate Frame';
      scenarioSubtitle = 'Equilibrium Magnetization M₀ along +z';
      badgeText = 'PHYSICS';
      simTime = 150;
      isochromats = [
        { id: 1, x: 0, T1: 800, T2: 80, PD: 1.0, w: 0 }
      ];
      params = { flipAngle: 0, TR: simTime };

    } else if (scenario === 'FID') {
      scenarioTitle = 'Free Induction Decay (FID)';
      scenarioSubtitle = 'Single Isochromat • Pure T₂ Exponential Decay';
      badgeText = 'FID (1 SPIN)';
      simTime = seqParams.FID.TR;
      // EXACT USER REQUIREMENT: FID WITH ONLY ONE SPIN
      isochromats = [
        { id: 1, x: 0, T1: 800, T2: 80, PD: 1.0, w: 0 }
      ];
      params = { flipAngle: seqParams.FID.flipAngle, TR: simTime };

    } else if (scenario === 'SE') {
      scenarioTitle = 'Hahn Spin Echo (SE)';
      scenarioSubtitle = '5 Spins • Dephasing & 180° Refocusing Pulse';
      badgeText = 'SPIN ECHO (5 SPINS)';
      simTime = seqParams.SE.TR;
      // EXACT USER REQUIREMENT: SPIN ECHO WITH 5 SPINS
      isochromats = [
        { id: 1, x: 0, T1: 800, T2: 120, PD: 1.0, w: -15 },
        { id: 2, x: 0, T1: 800, T2: 120, PD: 1.0, w: -7.5 },
        { id: 3, x: 0, T1: 800, T2: 120, PD: 1.0, w: 0 },
        { id: 4, x: 0, T1: 800, T2: 120, PD: 1.0, w: 7.5 },
        { id: 5, x: 0, T1: 800, T2: 120, PD: 1.0, w: 15 }
      ];
      params = {
        flipAngle: seqParams.SE.flipAngle,
        TE: seqParams.SE.TE,
        TR: simTime
      };

    } else if (scenario === 'GRE') {
      scenarioTitle = 'Gradient Echo (GRE)';
      scenarioSubtitle = '5 Spatial Spins • Gradient Dephase & Rephase';
      badgeText = 'GRAD ECHO (5 SPINS)';
      simTime = seqParams.GRE.TR;
      // EXACT USER REQUIREMENT: GRADIENT ECHO WITH 5 SPINS
      isochromats = [
        { id: 1, x: -0.8, T1: 800, T2: 100, PD: 1.0, w: 0 },
        { id: 2, x: -0.4, T1: 800, T2: 100, PD: 1.0, w: 0 },
        { id: 3, x: 0.0,  T1: 800, T2: 100, PD: 1.0, w: 0 },
        { id: 4, x: 0.4,  T1: 800, T2: 100, PD: 1.0, w: 0 },
        { id: 5, x: 0.8,  T1: 800, T2: 100, PD: 1.0, w: 0 }
      ];
      params = {
        flipAngle: seqParams.GRE.flipAngle,
        TE: seqParams.GRE.TE,
        TR: simTime
      };

    } else if (scenario === 'EXPLORE') {
      scenarioTitle = 'Interactive Sandbox';
      scenarioSubtitle = 'Explore Custom Sequences in MRIjs';
      badgeText = 'EXPLORE';
      simTime = 160;
      isochromats = [
        { id: 1, x: -0.5, T1: 800, T2: 90, PD: 1.0, w: -10 },
        { id: 2, x: 0.0,  T1: 800, T2: 90, PD: 1.0, w: 0 },
        { id: 3, x: 0.5,  T1: 800, T2: 90, PD: 1.0, w: 10 }
      ];
      params = { flipAngle: 90, TE: 80, TR: simTime };
    }

    // Update DOM Header Badges
    if (dom.title) dom.title.textContent = scenarioTitle;
    if (dom.subtitle) dom.subtitle.textContent = scenarioSubtitle;
    if (dom.tag) dom.tag.textContent = badgeText;
    if (dom.hudSpins) dom.hudSpins.textContent = isochromats.length;

    simTimeLimit = simTime;
    currentSpins = isochromats;

    if (dom.timeSlider) {
      dom.timeSlider.max = simTime;
      dom.timeSlider.value = 0;
    }
    if (dom.sliderMax) {
      dom.sliderMax.textContent = `${simTime} ms`;
    }

    // Execute Bloch Simulation
    runSimulation(scenario === 'MATH' ? 'FID' : scenario, isochromats, simTime, params);
  }

  function runSimulation(scenarioName, isochromats, simTimeMs, params) {
    const effectiveScenario = (scenarioName === 'MATH' || scenarioName === 'EXPLORE') ? 'FID' : scenarioName;

    // Use official MRIjs BlochSimulator from https://gsahonero.github.io/MRIjs/bloch.js
    if (typeof BlochSimulator !== 'undefined') {
      try {
        const sim = new BlochSimulator(
          isochromats,
          simTimeMs,
          dt,
          'rotating',
          effectiveScenario,
          params
        );
        currentSimResult = sim.run();
        return;
      } catch (err) {
        console.warn('[post_mrijs] Error running official BlochSimulator:', err);
      }
    }

    // Fallback: Generate analytical trajectory if offline
    generateFallbackTrajectory(scenarioName, isochromats, simTimeMs, params);
  }

  function generateFallbackTrajectory(scenarioName, isochromats, simTimeMs, params) {
    const timeSteps = [];
    const signals = [];
    const spinHistory = [];
    const numSteps = Math.floor(simTimeMs / dt);

    for (let step = 0; step <= numSteps; step++) {
      const t = step * dt;
      timeSteps.push(t);

      const tSec = t / 1000.0;
      let totalMx = 0, totalMy = 0, totalMz = 0;
      const currentStates = [];

      isochromats.forEach(iso => {
        const T1 = iso.T1 / 1000;
        const T2 = iso.T2 / 1000;
        let Mx = 0, My = 0, Mz = 1.0;

        if (scenarioName === 'FID') {
          const alpha = ((params.flipAngle || 90) * Math.PI) / 180.0;
          My = Math.sin(alpha) * Math.exp(-tSec / T2);
          Mz = Math.cos(alpha) * Math.exp(-tSec / T1) + (1.0 - Math.exp(-tSec / T1));
        } else if (scenarioName === 'SE') {
          const TE = (params.TE || 80) / 1000;
          const w = (iso.w || 0) * 2 * Math.PI;
          let phase = w * tSec;
          if (tSec >= TE / 2) {
            phase = Math.PI - (w * (TE / 2)) + w * (tSec - TE / 2);
          }
          const env = Math.exp(-tSec / T2);
          Mx = env * Math.cos(phase);
          My = env * Math.sin(phase);
          Mz = 1.0 - Math.exp(-tSec / T1);
        } else if (scenarioName === 'GRE') {
          const TE = (params.TE || 60) / 1000;
          const G0 = 2 * Math.PI * 30.0;
          let phase = 0;
          if (tSec < TE / 2) {
            phase = -G0 * iso.x * tSec;
          } else {
            phase = -G0 * iso.x * (TE / 2) + G0 * iso.x * (tSec - TE / 2);
          }
          const env = Math.exp(-tSec / T2);
          const alpha = ((params.flipAngle || 30) * Math.PI) / 180.0;
          Mx = Math.sin(alpha) * env * Math.cos(phase);
          My = Math.sin(alpha) * env * Math.sin(phase);
          Mz = Math.cos(alpha) + (1.0 - Math.cos(alpha)) * (1.0 - Math.exp(-tSec / T1));
        } else {
          My = Math.exp(-tSec / T2);
          Mz = 1.0 - Math.exp(-tSec / T1);
        }

        currentStates.push([Mx, My, Mz]);
        totalMx += Mx;
        totalMy += My;
        totalMz += Mz;
      });

      const n = isochromats.length;
      spinHistory.push(currentStates);
      signals.push({
        t: t,
        Mxy: Math.sqrt(totalMx * totalMx + totalMy * totalMy) / n,
        Mz: totalMz / n
      });
    }

    currentSimResult = { timeSteps, signals, spinHistory };
  }

  // =========================================================================
  // Interactive Event Listeners (3D Mouse Drag, Sliders, Buttons)
  // =========================================================================
  function setupEventListeners() {
    if (stageCanvas) {
      stageCanvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        viewYaw += dx * 0.01;
        viewPitch = Math.max(-1.4, Math.min(1.4, viewPitch + dy * 0.01));
      });

      window.addEventListener('mouseup', () => { isDragging = false; });

      // Touch orbit
      stageCanvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          isDragging = true;
          lastMouseX = e.touches[0].clientX;
          lastMouseY = e.touches[0].clientY;
        }
      });

      window.addEventListener('touchmove', (e) => {
        if (!isDragging || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - lastMouseX;
        const dy = e.touches[0].clientY - lastMouseY;
        lastMouseX = e.touches[0].clientX;
        lastMouseY = e.touches[0].clientY;

        viewYaw += dx * 0.01;
        viewPitch = Math.max(-1.4, Math.min(1.4, viewPitch + dy * 0.01));
      });

      window.addEventListener('touchend', () => { isDragging = false; });

      // Double-click reset orientation
      stageCanvas.addEventListener('dblclick', () => {
        viewPitch = 0.45;
        viewYaw = 0.85;
      });
    }

    // Play / Pause Button
    if (dom.btnPlayPause) {
      dom.btnPlayPause.addEventListener('click', () => {
        isPlaying = !isPlaying;
        dom.playPauseIcon.textContent = isPlaying ? '⏸️' : '▶️';
        dom.btnPlayPause.innerHTML = `${dom.playPauseIcon.outerHTML} ${isPlaying ? 'Pause' : 'Play'}`;
      });
    }

    // Restart Button
    if (dom.btnRestart) {
      dom.btnRestart.addEventListener('click', () => {
        currentStepIdx = 0;
        isPlaying = true;
        if (dom.btnPlayPause) {
          dom.btnPlayPause.innerHTML = `<span>⏸️</span> Pause`;
        }
      });
    }

    // Presets Override Button
    if (dom.btnOverride) {
      const cycle = ['FID', 'SE', 'GRE', 'MATH'];
      dom.btnOverride.addEventListener('click', () => {
        const next = cycle[(cycle.indexOf(currentScenario) + 1) % cycle.length];
        loadScenario(next);
      });
    }

    // Timeline Scrub Slider
    if (dom.timeSlider) {
      dom.timeSlider.addEventListener('input', (e) => {
        currentStepIdx = parseInt(e.target.value, 10);
        isPlaying = false;
        if (dom.btnPlayPause) {
          dom.btnPlayPause.innerHTML = `<span>▶️</span> Play`;
        }
      });
    }
  }

  // =========================================================================
  // Main Animation & Render Loop
  // =========================================================================
  function animationLoop(timestamp) {
    const deltaMs = timestamp - lastTimeMs;
    lastTimeMs = timestamp;

    if (currentSimResult && currentSimResult.timeSteps && currentSimResult.timeSteps.length > 0) {
      const maxSteps = currentSimResult.timeSteps.length - 1;

      if (isPlaying) {
        // Step forward with smooth pacing multiplied by user-adjustable speed
        currentStepIdx += Math.max(1, Math.round((deltaMs / 16.6) * playbackSpeed));
        if (currentStepIdx > maxSteps) {
          currentStepIdx = 0; // Loop animation
        }
      }

      currentStepIdx = Math.max(0, Math.min(maxSteps, currentStepIdx));

      // Update Slider Position
      if (dom.timeSlider && document.activeElement !== dom.timeSlider) {
        dom.timeSlider.value = currentStepIdx;
      }

      // Update HUD Numbers
      updateHudReadouts();

      // Render 3D Bloch Canvas
      render3DBlochSphere();

      // Render 2D Signal Plot
      renderSignalPlot();
    }

    animFrameId = requestAnimationFrame(animationLoop);
  }

  function updateHudReadouts() {
    if (!currentSimResult) return;
    const currentTime = currentSimResult.timeSteps[currentStepIdx] || 0;
    const signal = currentSimResult.signals[currentStepIdx] || { Mxy: 0, Mz: 0 };

    if (dom.hudTime) dom.hudTime.textContent = `${Math.round(currentTime)} ms`;
    if (dom.hudMxy) dom.hudMxy.textContent = signal.Mxy.toFixed(2);
    if (dom.hudMz) dom.hudMz.textContent = signal.Mz.toFixed(2);
    if (dom.plotIndicator) dom.plotIndicator.textContent = `t = ${Math.round(currentTime)} ms`;
  }

  // =========================================================================
  // 3D Bloch Sphere Vector Drawing
  // =========================================================================
  function project3D(x, y, z, cx, cy, scale) {
    // Rotation around Z (Yaw)
    const cosY = Math.cos(viewYaw);
    const sinY = Math.sin(viewYaw);
    const x1 = x * cosY - y * sinY;
    const y1 = x * sinY + y * cosY;
    const z1 = z;

    // Rotation around X (Pitch)
    const cosP = Math.cos(viewPitch);
    const sinP = Math.sin(viewPitch);
    const x2 = x1;
    const y2 = y1 * cosP - z1 * sinP;
    const z2 = y1 * sinP + z1 * cosP;

    // Isometric / Orthographic projection
    return {
      x: cx + x2 * scale,
      y: cy - z2 * scale, // Inverted Y for screen coords
      depth: y2
    };
  }

  function render3DBlochSphere() {
    if (!stageCtx || !stageCanvas) return;
    const w = stageCanvas.getBoundingClientRect().width;
    const h = stageCanvas.getBoundingClientRect().height;

    stageCtx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 + 10;
    const sphereRadius = Math.min(w, h) * 0.36;

    // 1. Draw Translucent Unit Sphere Outline
    stageCtx.beginPath();
    stageCtx.arc(cx, cy, sphereRadius, 0, Math.PI * 2);
    stageCtx.strokeStyle = 'rgba(156, 163, 175, 0.22)';
    stageCtx.lineWidth = 1;
    stageCtx.stroke();

    // 2. Draw Equator Ellipse
    stageCtx.beginPath();
    for (let angle = 0; angle <= Math.PI * 2; angle += 0.1) {
      const px = Math.cos(angle);
      const py = Math.sin(angle);
      const pt = project3D(px, py, 0, cx, cy, sphereRadius);
      if (angle === 0) stageCtx.moveTo(pt.x, pt.y);
      else stageCtx.lineTo(pt.x, pt.y);
    }
    stageCtx.closePath();
    stageCtx.strokeStyle = 'rgba(156, 163, 175, 0.25)';
    stageCtx.setLineDash([3, 3]);
    stageCtx.stroke();
    stageCtx.setLineDash([]);

    // 3. Coordinate Axes X (Red), Y (Green), Z (Blue)
    const axisLen = 1.25;
    drawAxis([axisLen, 0, 0], '+x', '#ef4444', cx, cy, sphereRadius);
    drawAxis([0, axisLen, 0], '+y', '#10b981', cx, cy, sphereRadius);
    drawAxis([0, 0, axisLen], '+z (B₀)', '#3b82f6', cx, cy, sphereRadius);

    // 4. Draw Active Isochromat Vectors
    const stepStates = (currentSimResult && currentSimResult.spinHistory)
      ? currentSimResult.spinHistory[currentStepIdx]
      : [];

    if (stepStates && stepStates.length > 0) {
      stepStates.forEach((M, idx) => {
        const color = SPINS_PALETTE[idx % SPINS_PALETTE.length];
        const isSingle = stepStates.length === 1;
        drawVector(M, color, isSingle ? 3.5 : 2.5, cx, cy, sphereRadius);
      });

      // If multiple spins, draw net magnetization vector in bold gold
      if (stepStates.length > 1) {
        let sumX = 0, sumY = 0, sumZ = 0;
        stepStates.forEach(M => {
          sumX += M[0]; sumY += M[1]; sumZ += M[2];
        });
        const n = stepStates.length;
        const netM = [sumX / n, sumY / n, sumZ / n];
        drawVector(netM, '#eab308', 3.5, cx, cy, sphereRadius, true);
      }
    }
  }

  function drawAxis(vec, label, color, cx, cy, scale) {
    const origin = project3D(0, 0, 0, cx, cy, scale);
    const tip = project3D(vec[0], vec[1], vec[2], cx, cy, scale);

    stageCtx.beginPath();
    stageCtx.moveTo(origin.x, origin.y);
    stageCtx.lineTo(tip.x, tip.y);
    stageCtx.strokeStyle = color;
    stageCtx.lineWidth = 1.2;
    stageCtx.stroke();

    // Axis label
    stageCtx.fillStyle = color;
    stageCtx.font = '10px monospace';
    stageCtx.fillText(label, tip.x + 4, tip.y + 4);
  }

  function drawVector(M, color, width, cx, cy, scale, isNet = false) {
    const origin = project3D(0, 0, 0, cx, cy, scale);
    const tip = project3D(M[0], M[1], M[2], cx, cy, scale);

    // Vector line
    stageCtx.beginPath();
    stageCtx.moveTo(origin.x, origin.y);
    stageCtx.lineTo(tip.x, tip.y);
    stageCtx.strokeStyle = color;
    stageCtx.lineWidth = width;
    stageCtx.stroke();

    // Arrowhead Tip
    stageCtx.beginPath();
    stageCtx.arc(tip.x, tip.y, isNet ? 5 : 4, 0, Math.PI * 2);
    stageCtx.fillStyle = color;
    stageCtx.fill();
    stageCtx.strokeStyle = '#ffffff';
    stageCtx.lineWidth = 1;
    stageCtx.stroke();
  }

  // =========================================================================
  // 2D Real-Time Signal Plot
  // =========================================================================
  function renderSignalPlot() {
    if (!signalCtx || !signalCanvas || !currentSimResult) return;
    const w = signalCanvas.getBoundingClientRect().width;
    const h = signalCanvas.getBoundingClientRect().height;

    signalCtx.clearRect(0, 0, w, h);

    const signals = currentSimResult.signals || [];
    if (signals.length === 0) return;

    const padLeft = 10;
    const padRight = 10;
    const padTop = 10;
    const padBottom = 15;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Grid baseline
    signalCtx.beginPath();
    signalCtx.moveTo(padLeft, padTop + plotH);
    signalCtx.lineTo(padLeft + plotW, padTop + plotH);
    signalCtx.strokeStyle = 'rgba(156, 163, 175, 0.2)';
    signalCtx.lineWidth = 1;
    signalCtx.stroke();

    const maxSteps = signals.length - 1;

    // Draw Mz Curve (Longitudinal - Green dashed)
    signalCtx.beginPath();
    for (let i = 0; i < signals.length; i++) {
      const sx = padLeft + (i / maxSteps) * plotW;
      const sy = padTop + plotH - signals[i].Mz * plotH;
      if (i === 0) signalCtx.moveTo(sx, sy);
      else signalCtx.lineTo(sx, sy);
    }
    signalCtx.strokeStyle = 'rgba(16, 185, 129, 0.65)';
    signalCtx.setLineDash([3, 2]);
    signalCtx.lineWidth = 1.5;
    signalCtx.stroke();
    signalCtx.setLineDash([]);

    // Draw |Mxy| Curve (Transverse - Blue solid)
    signalCtx.beginPath();
    for (let i = 0; i < signals.length; i++) {
      const sx = padLeft + (i / maxSteps) * plotW;
      const sy = padTop + plotH - Math.max(0, Math.min(1.0, signals[i].Mxy)) * plotH;
      if (i === 0) signalCtx.moveTo(sx, sy);
      else signalCtx.lineTo(sx, sy);
    }
    signalCtx.strokeStyle = '#3b82f6';
    signalCtx.lineWidth = 2;
    signalCtx.stroke();

    // Moving Vertical Playhead Cursor
    const cursorX = padLeft + (currentStepIdx / maxSteps) * plotW;
    signalCtx.beginPath();
    signalCtx.moveTo(cursorX, padTop);
    signalCtx.lineTo(cursorX, padTop + plotH);
    signalCtx.strokeStyle = '#ef4444';
    signalCtx.lineWidth = 1.5;
    signalCtx.stroke();

    // Playhead dot on Mxy
    const currentMxy = signals[currentStepIdx] ? signals[currentStepIdx].Mxy : 0;
    const dotY = padTop + plotH - Math.max(0, Math.min(1.0, currentMxy)) * plotH;
    signalCtx.beginPath();
    signalCtx.arc(cursorX, dotY, 4, 0, Math.PI * 2);
    signalCtx.fillStyle = '#ef4444';
    signalCtx.fill();
    signalCtx.strokeStyle = '#ffffff';
    signalCtx.lineWidth = 1;
    signalCtx.stroke();
  }

})();
