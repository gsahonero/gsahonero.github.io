/**
 * assets/js/bloch_widget.js
 * Interactive Bloch Simulation Widget & 3D Orbit Canvas Renderer
 * Allows full drag-and-drop 3D coordinate system rotation (mouse & touch).
 */

(function () {
  let canvas, ctx;
  let animFrameId = null;
  let currentTrajectory = [];
  let currentStepIdx = 0;
  let isPlaying = true;
  let currentSequence = 'FID';

  // 3D View Angles (Pitch and Yaw)
  let viewAngleX = 0.42; // elevation angle
  let viewAngleZ = 0.75; // azimuth angle

  // Drag interaction state
  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  // Simulation parameters
  const params = {
    flipAngle: 90,
    T1: 800,
    T2: 80,
    TE: 40,
    TR: 150
  };

  function initBlochWidget() {
    canvas = document.getElementById('bloch-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    // Handle high DPI displays
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Bind Controls and 3D Drag
    bindControls();
    bindMouseDrag();

    // Run initial simulation
    runSimulation();

    // Start animation loop
    startAnimationLoop();
  }

  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }

  function runSimulation() {
    if (typeof BlochSimulator === 'undefined') return;

    // 1. Official online MRIjs BlochSimulator class (from https://gsahonero.github.io/MRIjs/bloch.js)
    if (typeof BlochSimulator === 'function') {
      try {
        const isochromats = [{ x: 0, T1: params.T1, T2: params.T2, PD: 1, w: 0, id: 0 }];
        const sim = new BlochSimulator(isochromats, 200, 2, 'rotating', currentSequence, {
          flipAngle: params.flipAngle,
          TE: params.TE,
          TR: params.TR
        });
        const res = sim.run();
        currentTrajectory = (res.spinHistory || []).map((step, idx) => ({
          time: res.timeSteps ? res.timeSteps[idx] : idx * 2,
          M: step[0] || [0, 0, 1]
        }));
        currentStepIdx = 0;
        return;
      } catch (err) {
        console.warn('[bloch_widget] Fallback from online class error:', err);
      }
    }

    // 2. Fallback to simulateSequence if using offline helper
    if (BlochSimulator.simulateSequence) {
      const result = BlochSimulator.simulateSequence(currentSequence, {
        flipAngle: params.flipAngle,
        T1: params.T1,
        T2: params.T2,
        TE: params.TE,
        TR: params.TR
      });

      currentTrajectory = result.trajectory || [];
      currentStepIdx = 0;
    }
  }

  function bindControls() {
    // Sequence buttons
    const seqBtns = document.querySelectorAll('[data-seq]');
    seqBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        seqBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentSequence = this.getAttribute('data-seq');
        
        // Update presets
        if (currentSequence === 'FID') {
          params.flipAngle = 90;
        } else if (currentSequence === 'SE') {
          params.flipAngle = 90;
        } else if (currentSequence === 'GRE') {
          params.flipAngle = 30;
        }

        const angleSlider = document.getElementById('sim-angle-slider');
        if (angleSlider) angleSlider.value = params.flipAngle;
        updateSliderVal('sim-angle-val', `${params.flipAngle}°`);

        runSimulation();
      });
    });

    // Flip angle slider
    const angleSlider = document.getElementById('sim-angle-slider');
    if (angleSlider) {
      angleSlider.addEventListener('input', function () {
        params.flipAngle = parseInt(this.value, 10);
        updateSliderVal('sim-angle-val', `${params.flipAngle}°`);
        runSimulation();
      });
    }

    // T2 slider
    const t2Slider = document.getElementById('sim-t2-slider');
    if (t2Slider) {
      t2Slider.addEventListener('input', function () {
        params.T2 = parseInt(this.value, 10);
        updateSliderVal('sim-t2-val', `${params.T2} ms`);
        runSimulation();
      });
    }

    // Play / Pause toggle
    const playBtn = document.getElementById('sim-play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', function () {
        isPlaying = !isPlaying;
        this.textContent = isPlaying ? '⏸ Pause' : '▶ Play';
      });
    }

    // Reset button
    const resetBtn = document.getElementById('sim-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        currentStepIdx = 0;
      });
    }
  }

  // Bind mouse and touch drag to rotate 3D coordinate system
  function bindMouseDrag() {
    if (!canvas) return;

    canvas.style.cursor = 'grab';

    canvas.addEventListener('mousedown', function (e) {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
    });

    window.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;

      viewAngleZ += dx * 0.012;
      // Clamp elevation between -85 deg and +85 deg
      viewAngleX = Math.max(-1.45, Math.min(1.45, viewAngleX + dy * 0.012));
    });

    window.addEventListener('mouseup', function () {
      if (isDragging) {
        isDragging = false;
        canvas.style.cursor = 'grab';
      }
    });

    // Touch events for mobile/tablets
    canvas.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) {
        isDragging = true;
        lastMouseX = e.touches[0].clientX;
        lastMouseY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchmove', function (e) {
      if (!isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - lastMouseX;
      const dy = e.touches[0].clientY - lastMouseY;
      lastMouseX = e.touches[0].clientX;
      lastMouseY = e.touches[0].clientY;

      viewAngleZ += dx * 0.012;
      viewAngleX = Math.max(-1.45, Math.min(1.45, viewAngleX + dy * 0.012));
    }, { passive: true });

    window.addEventListener('touchend', function () {
      isDragging = false;
    });

    // Double-click to reset view angle
    canvas.addEventListener('dblclick', function () {
      viewAngleX = 0.42;
      viewAngleZ = 0.75;
    });
  }

  function updateSliderVal(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // 3D Orbit projection with user-controlled azimuth (Z) and elevation (X)
  function project(x, y, z, cx, cy, r) {
    // 1. Rotate around Z axis by viewAngleZ
    const cosZ = Math.cos(viewAngleZ);
    const sinZ = Math.sin(viewAngleZ);
    const x1 = x * cosZ - y * sinZ;
    const y1 = x * sinZ + y * cosZ;
    const z1 = z;

    // 2. Rotate around X axis by viewAngleX
    const cosX = Math.cos(viewAngleX);
    const sinX = Math.sin(viewAngleX);
    const x2 = x1;
    const y2 = y1 * cosX - z1 * sinX;
    const z2 = y1 * sinX + z1 * cosX;

    // 3. Project to 2D canvas coordinates
    return {
      x: cx + x2 * r,
      y: cy - z2 * r,
      depth: y2
    };
  }

  function draw() {
    if (!ctx || !canvas) return;
    const width = canvas.getBoundingClientRect().width;
    const height = canvas.getBoundingClientRect().height;

    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2 + 8;
    const radius = Math.min(width, height) * 0.36;

    // Outer Sphere Silhouette
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-subtle').trim() || 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 3D Equator circle (in xy-plane at z=0)
    ctx.beginPath();
    const equatorSteps = 48;
    for (let i = 0; i <= equatorSteps; i++) {
      const beta = (i / equatorSteps) * Math.PI * 2;
      const pt = project(Math.cos(beta), Math.sin(beta), 0, cx, cy, radius);
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Axes: X, Y, Z
    const origin = project(0, 0, 0, cx, cy, radius);
    const zAxis = project(0, 0, 1.25, cx, cy, radius);
    const xAxis = project(1.25, 0, 0, cx, cy, radius);
    const yAxis = project(0, 1.25, 0, cx, cy, radius);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = 1;

    // Z Axis (B0)
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(zAxis.x, zAxis.y);
    ctx.stroke();

    // X Axis
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(xAxis.x, xAxis.y);
    ctx.stroke();

    // Y Axis
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(yAxis.x, yAxis.y);
    ctx.stroke();

    // Labels
    ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('z (B0)', zAxis.x - 12, zAxis.y - 4);
    ctx.fillText('x', xAxis.x + 4, xAxis.y + 4);
    ctx.fillText('y', yAxis.x - 12, yAxis.y + 6);

    // Draw Spin Trajectory trail
    if (currentTrajectory.length > 0) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const trailLimit = Math.min(currentStepIdx, currentTrajectory.length);
      for (let i = 0; i < trailLimit; i++) {
        const pt = currentTrajectory[i].M;
        const p2d = project(pt[0], pt[1], pt[2], cx, cy, radius);
        if (i === 0) ctx.moveTo(p2d.x, p2d.y);
        else ctx.lineTo(p2d.x, p2d.y);
      }
      ctx.stroke();

      // Current Magnetization Vector M
      const currentPoint = currentTrajectory[currentStepIdx] || currentTrajectory[0];
      const tip = project(currentPoint.M[0], currentPoint.M[1], currentPoint.M[2], cx, cy, radius);

      // Draw Vector Line
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();

      // Draw Vector Tip Arrow head
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Transverse projection vector (Mxy)
      const transTip = project(currentPoint.M[0], currentPoint.M[1], 0, cx, cy, radius);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(transTip.x, transTip.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Readouts
      const mzEl = document.getElementById('sim-mz-readout');
      const mxyEl = document.getElementById('sim-mxy-readout');
      const timeEl = document.getElementById('sim-time-readout');

      if (mzEl) mzEl.textContent = currentPoint.Mz.toFixed(2);
      if (mxyEl) mxyEl.textContent = currentPoint.Mxy.toFixed(2);
      if (timeEl) timeEl.textContent = `${currentPoint.timeMs} ms`;
    }
  }

  function startAnimationLoop() {
    function animate() {
      if (isPlaying && currentTrajectory.length > 0) {
        currentStepIdx = (currentStepIdx + 1) % currentTrajectory.length;
      }
      draw();
      animFrameId = requestAnimationFrame(animate);
    }
    animate();
  }

  // Auto initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBlochWidget);
  } else {
    initBlochWidget();
  }
})();
