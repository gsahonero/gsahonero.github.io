/**
 * assets/js/home_isochromat.js
 * Editorial Centerpiece: Living Isochromat Ensemble & Precession Visualizer
 * Simulates NMR spin dynamics (RF excitation, isochromat dephasing, spin echo)
 * with interactive 3D perspective steering via mouse/touch.
 */

(function () {
  'use strict';

  let canvas, ctx;
  let animId = null;
  let isVisible = false;

  // 3D Camera / Perspective angles
  let pitch = 0.45; // Elevation
  let yaw = 0.65;   // Azimuth
  let targetPitch = 0.45;
  let targetYaw = 0.65;
  let isPointerOver = false;

  // Spin ensemble parameters
  const NUM_SPINS = 16;
  const spins = [];
  const maxDeltaW = 1.8; // Max off-resonance spread

  // Dynamics state
  let time = 0;
  let stateTimer = 0;
  let pulsePhase = 0; // 0: resting, 1: 90 pulse, 2: dephasing, 3: 180 pulse, 4: rephasing / echo
  let netM = [0, 0, 1];

  function initSpins() {
    spins.length = 0;
    for (let i = 0; i < NUM_SPINS; i++) {
      const frac = NUM_SPINS === 1 ? 0 : (i / (NUM_SPINS - 1)) * 2 - 1; // -1 to +1
      spins.push({
        deltaW: frac * maxDeltaW,
        M: [0, 0, 1], // Start at thermal equilibrium +Mz
        colorAlpha: 0.35 + 0.5 * (1 - Math.abs(frac)),
        trail: []
      });
    }
  }

  // 3D rotation helpers
  function project(x, y, z, width, height, scale) {
    // Yaw around Z
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const x1 = x * cosY - y * sinY;
    const y1 = x * sinY + y * cosY;
    const z1 = z;

    // Pitch around X
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    const y2 = y1 * cosP - z1 * sinP;
    const z2 = y1 * sinP + z1 * cosP;
    const x2 = x1;

    // Isometric / weak perspective
    const fov = 3.5;
    const depth = fov / (fov + y2 * 0.4);
    const px = width / 2 + x2 * scale * depth;
    const py = height * 0.55 - z2 * scale * depth;

    return { x: px, y: py, depth: y2 };
  }

  function stepPhysics(dt) {
    time += dt;
    stateTimer += dt;

    // Automated sequence cycle: 90 pulse -> dephase -> 180 pulse -> echo -> relax
    if (stateTimer > 9.5) {
      stateTimer = 0;
      trigger90Pulse();
    } else if (stateTimer > 4.2 && stateTimer < 4.2 + dt * 1.5) {
      trigger180Pulse();
    }

    // Step each isochromat according to Bloch rotating-frame precession & relaxation
    let sumX = 0, sumY = 0, sumZ = 0;
    const T1 = 6.0;
    const T2 = 3.5;

    spins.forEach(s => {
      // Precession about z-axis at off-resonance deltaW
      const phi = s.deltaW * dt;
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);

      const mx = s.M[0] * cosP - s.M[1] * sinP;
      const my = s.M[0] * sinP + s.M[1] * cosP;
      let mz = s.M[2];

      // T2 decay in transverse plane
      const decayT2 = Math.exp(-dt / T2);
      s.M[0] = mx * decayT2;
      s.M[1] = my * decayT2;

      // T1 recovery along z-axis
      s.M[2] = 1 - (1 - mz) * Math.exp(-dt / T1);

      // Record faint trail of tip
      if (Math.random() < 0.4) {
        s.trail.push([s.M[0], s.M[1], s.M[2]]);
        if (s.trail.length > 22) s.trail.shift();
      }

      sumX += s.M[0];
      sumY += s.M[1];
      sumZ += s.M[2];
    });

    netM = [sumX / NUM_SPINS, sumY / NUM_SPINS, sumZ / NUM_SPINS];

    // Smooth spring interpolation of camera angles
    if (!isPointerOver) {
      targetYaw += dt * 0.22; // gentle continuous rotation when idle
      targetPitch = 0.45 + Math.sin(time * 0.3) * 0.08;
    }
    yaw += (targetYaw - yaw) * 0.08;
    pitch += (targetPitch - pitch) * 0.08;
  }

  function trigger90Pulse() {
    // Nutate +Mz to transverse plane (+My)
    spins.forEach(s => {
      s.M = [0, 1, 0];
      s.trail = [];
    });
  }

  function trigger180Pulse() {
    // 180 refocusing pulse around X-axis: [x, y, z] -> [x, -y, -z]
    spins.forEach(s => {
      s.M[1] = -s.M[1];
      s.M[2] = -s.M[2];
    });
  }

  function render() {
    if (!ctx || !canvas) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;

    ctx.clearRect(0, 0, width, height);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const scale = Math.min(width, height) * 0.27;

    // Style tokens
    const axisColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.09)';
    const sphereColor = isDark ? 'rgba(96, 165, 250, 0.07)' : 'rgba(37, 99, 235, 0.05)';
    const spinBaseColor = isDark ? '147, 197, 253' : '37, 99, 235';
    const netColor = isDark ? '#60a5fa' : '#1d4ed8';

    const origin = project(0, 0, 0, width, height, scale);

    // 1. Draw faint equatorial circle (transverse plane)
    ctx.beginPath();
    const circleSteps = 48;
    for (let i = 0; i <= circleSteps; i++) {
      const a = (i / circleSteps) * Math.PI * 2;
      const pt = project(Math.cos(a), Math.sin(a), 0, width, height, scale);
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.strokeStyle = sphereColor;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Draw subtle axes: Z (B0 axis) and X, Y
    const zTip = project(0, 0, 1.25, width, height, scale);
    const zBase = project(0, 0, -1.25, width, height, scale);
    ctx.beginPath();
    ctx.moveTo(zBase.x, zBase.y);
    ctx.lineTo(zTip.x, zTip.y);
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Subtle label for B0
    ctx.font = '10px monospace';
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)';
    ctx.textAlign = 'center';
    const labelY = Math.max(16, zTip.y - 8);
    const labelX = Math.max(26, Math.min(width - 26, zTip.x));
    ctx.fillText('+B₀ (z)', labelX, labelY);

    // 3. Render individual isochromat vectors & silk trails
    spins.forEach(s => {
      // Trail
      if (s.trail.length > 2) {
        ctx.beginPath();
        for (let j = 0; j < s.trail.length; j++) {
          const tPt = project(s.trail[j][0], s.trail[j][1], s.trail[j][2], width, height, scale);
          if (j === 0) ctx.moveTo(tPt.x, tPt.y);
          else ctx.lineTo(tPt.x, tPt.y);
        }
        ctx.strokeStyle = `rgba(${spinBaseColor}, ${s.colorAlpha * 0.18})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Vector from origin to tip
      const tip = project(s.M[0], s.M[1], s.M[2], width, height, scale);
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.strokeStyle = `rgba(${spinBaseColor}, ${s.colorAlpha * 0.55})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Small tip dot
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${spinBaseColor}, ${s.colorAlpha * 0.85})`;
      ctx.fill();
    });

    // 4. Render net magnetization vector (M_net) prominently
    const netTip = project(netM[0], netM[1], netM[2], width, height, scale);
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(netTip.x, netTip.y);
    ctx.strokeStyle = netColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Arrow head on M_net
    ctx.beginPath();
    ctx.arc(netTip.x, netTip.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = netColor;
    ctx.fill();

    // Center pivot dot
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)';
    ctx.fill();
  }

  let lastTimestamp = 0;
  function loop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
    lastTimestamp = timestamp;

    if (isVisible) {
      stepPhysics(dt);
      render();
    }

    animId = requestAnimationFrame(loop);
  }

  function resize() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  function bindEvents() {
    canvas.addEventListener('mousemove', (e) => {
      isPointerOver = true;
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1; // -1 to 1
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;

      targetYaw = nx * Math.PI * 0.9;
      targetPitch = 0.45 - ny * 0.55;
    });

    canvas.addEventListener('mouseleave', () => {
      isPointerOver = false;
    });

    // On touch devices
    canvas.addEventListener('touchmove', (e) => {
      if (!e.touches.length) return;
      isPointerOver = true;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const nx = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((touch.clientY - rect.top) / rect.height) * 2 - 1;

      targetYaw = nx * Math.PI * 0.9;
      targetPitch = 0.45 - ny * 0.55;
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      isPointerOver = false;
    });

    // Click canvas to manually trigger RF Nutation
    canvas.addEventListener('click', () => {
      trigger90Pulse();
      stateTimer = 0;
    });
  }

  function init() {
    canvas = document.getElementById('home-spin-canvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    initSpins();
    resize();
    bindEvents();

    window.addEventListener('resize', () => {
      resize();
    });

    const stageHome = document.getElementById('stage-home');
    let isIntersecting = true;

    function updateVisibility() {
      const stageActive = !stageHome || stageHome.classList.contains('is-active');
      const shouldBeVisible = isIntersecting && stageActive;
      if (shouldBeVisible !== isVisible) {
        isVisible = shouldBeVisible;
        if (isVisible) {
          resize();
        }
      }
    }

    if (stageHome && window.MutationObserver) {
      const mo = new MutationObserver(updateVisibility);
      mo.observe(stageHome, { attributes: true, attributeFilter: ['class'] });
    }

    // Use IntersectionObserver to sleep when scrolled away
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        isIntersecting = entry.isIntersecting;
        updateVisibility();
      });
    }, { threshold: 0.1 });

    observer.observe(canvas);
    updateVisibility();

    // Initial pulse
    trigger90Pulse();

    // Start requestAnimationFrame
    animId = requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
