const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

const state = {
  scenario: 'single',
  isoCount: 7,
  lineOrientation: 'horizontal',
  b0Scale: 1,
  t1: 1200,
  t2: 120,
  offResHzSpan: 18,
  flipAngleDeg: 90,
  rfPhaseDeg: 0,
  timeMs: 0,
  paused: false,
  tissueName: 'generic',
  isochromats: [],
  signalTrace: [],
  eventLog: [],
  history: [],
  historyIndex: -1,
  activeSoftPulse: null,
  sequenceQueue: [],
};

const el = {
  mainCanvas: document.getElementById('mainCanvas'),
  signalCanvas: document.getElementById('signalCanvas'),
  isoCount: document.getElementById('isoCount'),
  isoCountValue: document.getElementById('isoCountValue'),
  lineOrientation: document.getElementById('lineOrientation'),
  b0Scale: document.getElementById('b0Scale'),
  b0ScaleValue: document.getElementById('b0ScaleValue'),
  t1: document.getElementById('t1'),
  t1Value: document.getElementById('t1Value'),
  t2: document.getElementById('t2'),
  t2Value: document.getElementById('t2Value'),
  offRes: document.getElementById('offRes'),
  offResValue: document.getElementById('offResValue'),
  flipAngle: document.getElementById('flipAngle'),
  flipAngleValue: document.getElementById('flipAngleValue'),
  rfPhase: document.getElementById('rfPhase'),
  rfPhaseValue: document.getElementById('rfPhaseValue'),
  timeValue: document.getElementById('timeValue'),
  mxyValue: document.getElementById('mxyValue'),
  mzValue: document.getElementById('mzValue'),
  phaseValue: document.getElementById('phaseValue'),
  historyList: document.getElementById('historyList'),
  pauseToggle: document.getElementById('pauseToggle'),
  loadInput: document.getElementById('loadInput'),
  themeToggle: document.querySelector('[data-theme-toggle]'),
};

const ctx = el.mainCanvas.getContext('2d');
const signalCtx = el.signalCanvas.getContext('2d');
let lastTs = performance.now();

function gammaColor(name) {
  const styles = getComputedStyle(document.documentElement);
  return styles.getPropertyValue(name).trim();
}

function createIsochromat(xNorm, yNorm, zNorm = 0) {
  const m0 = Math.max(0, state.b0Scale);
  return {
    position: { x: xNorm, y: yNorm, z: zNorm },
    M: { x: 0, y: 0, z: m0 },
    phaseRad: 0,
    baseOffResHz: ((xNorm + yNorm + zNorm) / 3) * state.offResHzSpan,
    tissue: state.tissueName,
  };
}

function rebuildIsochromats() {
  const arr = [];
  const count = state.scenario === 'single' ? 1 : state.isoCount;
  if (state.scenario === 'single') {
    arr.push(createIsochromat(0, 0, 0));
  } else if (state.scenario === 'line') {
    for (let i = 0; i < count; i += 1) {
      const frac = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
      arr.push(
        state.lineOrientation === 'horizontal'
          ? createIsochromat(frac, 0, 0)
          : createIsochromat(0, frac, 0)
      );
    }
  } else {
    const n = count;
    for (let row = 0; row < n; row += 1) {
      for (let col = 0; col < n; col += 1) {
        const x = n === 1 ? 0 : (col / (n - 1)) * 2 - 1;
        const y = n === 1 ? 0 : (row / (n - 1)) * 2 - 1;
        arr.push(createIsochromat(x, y, 0));
      }
    }
  }
  state.isochromats = arr;
  state.signalTrace = [];
  state.timeMs = 0;
  pushHistory('Scenario rebuilt');
}

function rotateVectorAroundAxis(v, axis, angleRad) {
  const ux = axis.x;
  const uy = axis.y;
  const uz = axis.z;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dot = ux * v.x + uy * v.y + uz * v.z;
  return {
    x: v.x * cos + (uy * v.z - uz * v.y) * sin + ux * dot * (1 - cos),
    y: v.y * cos + (uz * v.x - ux * v.z) * sin + uy * dot * (1 - cos),
    z: v.z * cos + (ux * v.y - uy * v.x) * sin + uz * dot * (1 - cos),
  };
}

function getB1Axis() {
  const p = state.rfPhaseDeg * DEG2RAD;
  return { x: Math.cos(p), y: Math.sin(p), z: 0 };
}

function applyPulse(angleDeg, label = 'RF pulse') {
  const axis = getB1Axis();
  const angleRad = angleDeg * DEG2RAD;
  state.isochromats.forEach((iso) => {
    iso.M = rotateVectorAroundAxis(iso.M, axis, angleRad);
    iso.phaseRad = Math.atan2(iso.M.y, iso.M.x);
  });
  addEvent(label, `${angleDeg.toFixed(1)}° @ phase ${state.rfPhaseDeg.toFixed(1)}°`);
  pushHistory(label);
}

function startSoftPulse() {
  const durationMs = 24;
  state.activeSoftPulse = {
    remainingMs: durationMs,
    totalMs: durationMs,
    angleDeg: state.flipAngleDeg,
  };
  addEvent('Soft pulse', `${state.flipAngleDeg.toFixed(1)}° over ${durationMs} ms`);
  pushHistory('Soft pulse started');
}

function applyRelaxationAndPrecession(dtMs) {
  const e1 = Math.exp(-dtMs / state.t1);
  const e2 = Math.exp(-dtMs / state.t2);
  const gradientHzPerAxis = currentGradientHzPerAxis();
  state.isochromats.forEach((iso) => {
    const totalHz =
      iso.baseOffResHz +
      gradientHzPerAxis.x * iso.position.x +
      gradientHzPerAxis.y * iso.position.y +
      gradientHzPerAxis.z * iso.position.z;
    const dphi = 2 * Math.PI * totalHz * (dtMs / 1000);
    const cos = Math.cos(dphi);
    const sin = Math.sin(dphi);
    const mx = iso.M.x * e2;
    const my = iso.M.y * e2;
    iso.M.x = mx * cos - my * sin;
    iso.M.y = mx * sin + my * cos;
    const m0 = state.b0Scale;
    iso.M.z = m0 - (m0 - iso.M.z) * e1;
    iso.phaseRad = Math.atan2(iso.M.y, iso.M.x);
  });
}

function currentGradientHzPerAxis() {
  const active = { x: 0, y: 0, z: 0 };
  state.sequenceQueue.forEach((event) => {
    if (event.type === 'gradient' && event.remainingMs > 0) {
      active[event.axis] += event.amplitudeHz;
    }
  });
  return active;
}

function updateSequenceQueue(dtMs) {
  state.sequenceQueue.forEach((event) => {
    event.remainingMs -= dtMs;
    if (event.type === 'pulse' && !event.applied && event.remainingMs <= event.durationMs - event.triggerAtMs) {
      applyPulse(event.flipDeg, event.label);
      event.applied = true;
    }
  });
  state.sequenceQueue = state.sequenceQueue.filter((event) => event.remainingMs > 0 || (event.type === 'pulse' && !event.applied));
}

function addGradient(axis, amplitudeHz, durationMs, label) {
  state.sequenceQueue.push({ type: 'gradient', axis, amplitudeHz, remainingMs: durationMs, durationMs, label });
  addEvent(label, `${axis.toUpperCase()} gradient ${amplitudeHz.toFixed(1)} Hz/unit for ${durationMs.toFixed(1)} ms`);
}

function schedulePulse(delayMs, flipDeg, label) {
  state.sequenceQueue.push({ type: 'pulse', flipDeg, label, remainingMs: delayMs + 0.01, durationMs: delayMs + 0.01, triggerAtMs: delayMs, applied: false });
}

function runFID() {
  clearSequence();
  resetEquilibrium(false);
  applyPulse(90, 'FID excitation');
  addEvent('Acquisition', 'Observe free induction decay in the lab frame');
}

function runSpinEcho() {
  clearSequence();
  resetEquilibrium(false);
  applyPulse(90, 'Spin echo excitation');
  addGradient('x', 18, 22, 'Readout prephaser');
  schedulePulse(40, 180, 'Spin echo refocusing');
  addGradient('x', -18, 22, 'Readout rephasing');
  addEvent('Sequence', 'Single-line spin echo template');
}

function runGradientEcho() {
  clearSequence();
  resetEquilibrium(false);
  applyPulse(30, 'Gradient echo excitation');
  addGradient('x', 24, 18, 'Readout dephasing');
  addGradient('x', -24, 18, 'Readout rephasing');
  addEvent('Sequence', 'Single-line gradient echo template');
}

function clearSequence() {
  state.sequenceQueue = [];
  state.activeSoftPulse = null;
}

function resetEquilibrium(push = true) {
  const m0 = state.b0Scale;
  state.timeMs = 0;
  state.signalTrace = [];
  clearSequence();
  state.isochromats.forEach((iso) => {
    iso.M = { x: 0, y: 0, z: m0 };
    iso.phaseRad = 0;
  });
  addEvent('Reset', 'Return to equilibrium');
  if (push) pushHistory('Reset equilibrium');
}

function netMag() {
  const n = state.isochromats.length || 1;
  const sum = state.isochromats.reduce((acc, iso) => {
    acc.x += iso.M.x;
    acc.y += iso.M.y;
    acc.z += iso.M.z;
    return acc;
  }, { x: 0, y: 0, z: 0 });
  return { x: sum.x / n, y: sum.y / n, z: sum.z / n };
}

function addEvent(title, description) {
  state.eventLog.unshift({ timeMs: state.timeMs, title, description });
  state.eventLog = state.eventLog.slice(0, 16);
  renderHistory();
}

function renderHistory() {
  el.historyList.innerHTML = '';
  state.eventLog.forEach((item) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${item.title}</strong> · ${item.timeMs.toFixed(1)} ms<br>${item.description}`;
    el.historyList.appendChild(li);
  });
}

function snapshot() {
  return JSON.stringify({
    scenario: state.scenario,
    isoCount: state.isoCount,
    lineOrientation: state.lineOrientation,
    b0Scale: state.b0Scale,
    t1: state.t1,
    t2: state.t2,
    offResHzSpan: state.offResHzSpan,
    flipAngleDeg: state.flipAngleDeg,
    rfPhaseDeg: state.rfPhaseDeg,
    timeMs: state.timeMs,
    isochromats: state.isochromats,
    signalTrace: state.signalTrace,
    eventLog: state.eventLog,
  });
}

function restoreSnapshot(raw) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  Object.assign(state, {
    scenario: data.scenario,
    isoCount: data.isoCount,
    lineOrientation: data.lineOrientation,
    b0Scale: data.b0Scale,
    t1: data.t1,
    t2: data.t2,
    offResHzSpan: data.offResHzSpan,
    flipAngleDeg: data.flipAngleDeg,
    rfPhaseDeg: data.rfPhaseDeg,
    timeMs: data.timeMs,
    isochromats: data.isochromats,
    signalTrace: data.signalTrace,
    eventLog: data.eventLog,
  });
  syncControls();
  renderHistory();
}

function pushHistory(label) {
  const snap = snapshot();
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push({ label, snap });
  state.historyIndex = state.history.length - 1;
}

function undoHistory() {
  if (state.historyIndex <= 0) return;
  state.historyIndex -= 1;
  restoreSnapshot(state.history[state.historyIndex].snap);
}

function redoHistory() {
  if (state.historyIndex >= state.history.length - 1) return;
  state.historyIndex += 1;
  restoreSnapshot(state.history[state.historyIndex].snap);
}

function saveAnimation() {
  const blob = new Blob([JSON.stringify({ version: 1, savedAt: new Date().toISOString(), snapshot: JSON.parse(snapshot()) }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mri-physics-demo-state.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function loadAnimation(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const data = JSON.parse(reader.result);
    restoreSnapshot(data.snapshot);
    pushHistory('Loaded animation');
  };
  reader.readAsText(file);
}

function syncControls() {
  el.isoCount.value = state.isoCount;
  el.isoCountValue.textContent = String(state.isoCount);
  el.lineOrientation.value = state.lineOrientation;
  el.b0Scale.value = state.b0Scale;
  el.b0ScaleValue.textContent = state.b0Scale.toFixed(2);
  el.t1.value = state.t1;
  el.t1Value.textContent = String(state.t1);
  el.t2.value = state.t2;
  el.t2Value.textContent = String(state.t2);
  el.offRes.value = state.offResHzSpan;
  el.offResValue.textContent = String(state.offResHzSpan);
  el.flipAngle.value = state.flipAngleDeg;
  el.flipAngleValue.textContent = String(state.flipAngleDeg);
  el.rfPhase.value = state.rfPhaseDeg;
  el.rfPhaseValue.textContent = String(state.rfPhaseDeg);
  document.querySelectorAll('[data-scenario]').forEach((button) => {
    const active = button.dataset.scenario === state.scenario;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });
}

function updateReadouts() {
  const net = netMag();
  const mxy = Math.hypot(net.x, net.y);
  const phase = Math.atan2(net.y, net.x) * RAD2DEG;
  el.timeValue.textContent = `${state.timeMs.toFixed(1)} ms`;
  el.mxyValue.textContent = mxy.toFixed(3);
  el.mzValue.textContent = net.z.toFixed(3);
  el.phaseValue.textContent = `${Number.isFinite(phase) ? phase.toFixed(1) : '0.0'}°`;
  state.signalTrace.push({ timeMs: state.timeMs, mxy, mz: net.z });
  if (state.signalTrace.length > 300) state.signalTrace.shift();
}

function drawArrow(x, y, dx, dy, color, width = 3) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx, y + dy);
  ctx.stroke();
  const angle = Math.atan2(dy, dx);
  const head = 10;
  ctx.beginPath();
  ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(x + dx - head * Math.cos(angle - 0.4), y + dy - head * Math.sin(angle - 0.4));
  ctx.lineTo(x + dx - head * Math.cos(angle + 0.4), y + dy - head * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();
}

function renderMainCanvas() {
  const w = el.mainCanvas.width;
  const h = el.mainCanvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = gammaColor('--color-surface-2');
  ctx.fillRect(0, 0, w, h);

  const leftW = w * 0.56;
  ctx.strokeStyle = gammaColor('--color-border');
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftW, 24);
  ctx.lineTo(leftW, h - 24);
  ctx.stroke();

  ctx.fillStyle = gammaColor('--color-text-muted');
  ctx.font = '14px "General Sans", sans-serif';
  ctx.fillText('Isochromat ensemble', 28, 30);
  ctx.fillText('Net magnetization vector', leftW + 28, 30);

  const points = layoutPositions(leftW, h);
  state.isochromats.forEach((iso, i) => {
    const p = points[i];
    const lenXY = Math.hypot(iso.M.x, iso.M.y);
    const arrowScale = 32;
    const zLen = -iso.M.z * arrowScale;
    ctx.strokeStyle = gammaColor('--color-border');
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 34);
    ctx.lineTo(p.x, p.y + 34);
    ctx.moveTo(p.x - 34, p.y);
    ctx.lineTo(p.x + 34, p.y);
    ctx.stroke();
    drawArrow(p.x, p.y, iso.M.x * arrowScale, -iso.M.y * arrowScale, '#f5b04b', 2.5);
    drawArrow(p.x, p.y, 0, zLen, '#85f2ab', 2.5);
    drawArrow(p.x, p.y, iso.M.x * arrowScale, zLen, gammaColor('--color-primary'), 3);
    ctx.fillStyle = gammaColor('--color-text-muted');
    ctx.fillText(`${(iso.phaseRad * RAD2DEG).toFixed(0)}°`, p.x - 14, p.y + 52);
  });

  const net = netMag();
  const origin = { x: leftW + (w - leftW) * 0.45, y: h * 0.72 };
  const axisScale = 180;
  ctx.strokeStyle = gammaColor('--color-border');
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y - 220);
  ctx.lineTo(origin.x, origin.y + 20);
  ctx.moveTo(origin.x - 160, origin.y);
  ctx.lineTo(origin.x + 160, origin.y);
  ctx.stroke();
  ctx.fillStyle = gammaColor('--color-text-muted');
  ctx.fillText('+z', origin.x + 10, origin.y - 190);
  ctx.fillText('+x', origin.x + 140, origin.y - 10);
  drawArrow(origin.x, origin.y, net.x * axisScale, -net.z * axisScale, gammaColor('--color-primary'), 4);
  drawArrow(origin.x, origin.y, net.x * axisScale, -net.y * axisScale, '#f5b04b', 3);
}

function layoutPositions(leftW, h) {
  if (state.scenario === 'single') {
    return [{ x: leftW * 0.5, y: h * 0.5 }];
  }
  if (state.scenario === 'line') {
    return state.isochromats.map((_, i) => {
      const n = state.isochromats.length;
      const frac = n === 1 ? 0.5 : i / (n - 1);
      return state.lineOrientation === 'horizontal'
        ? { x: 70 + frac * (leftW - 140), y: h * 0.5 }
        : { x: leftW * 0.5, y: 80 + frac * (h - 160) };
    });
  }
  const n = Math.round(Math.sqrt(state.isochromats.length));
  return state.isochromats.map((_, idx) => {
    const row = Math.floor(idx / n);
    const col = idx % n;
    const gx = 80 + (col / Math.max(1, n - 1)) * (leftW - 160);
    const gy = 80 + (row / Math.max(1, n - 1)) * (h - 160);
    return { x: gx, y: gy };
  });
}

function renderSignalCanvas() {
  const w = el.signalCanvas.width;
  const h = el.signalCanvas.height;
  signalCtx.clearRect(0, 0, w, h);
  signalCtx.fillStyle = gammaColor('--color-surface-2');
  signalCtx.fillRect(0, 0, w, h);
  signalCtx.strokeStyle = gammaColor('--color-border');
  signalCtx.beginPath();
  signalCtx.moveTo(36, 16);
  signalCtx.lineTo(36, h - 28);
  signalCtx.lineTo(w - 16, h - 28);
  signalCtx.stroke();
  signalCtx.fillStyle = gammaColor('--color-text-muted');
  signalCtx.font = '12px "General Sans", sans-serif';
  signalCtx.fillText('|Mxy|', 10, 18);
  signalCtx.fillText('t', w - 20, h - 10);

  if (state.signalTrace.length < 2) return;
  const maxTime = Math.max(1, state.signalTrace[state.signalTrace.length - 1].timeMs);
  signalCtx.strokeStyle = gammaColor('--color-primary');
  signalCtx.lineWidth = 2;
  signalCtx.beginPath();
  state.signalTrace.forEach((s, i) => {
    const x = 36 + (s.timeMs / maxTime) * (w - 56);
    const y = h - 28 - s.mxy * (h - 56);
    if (i === 0) signalCtx.moveTo(x, y);
    else signalCtx.lineTo(x, y);
  });
  signalCtx.stroke();
}

function step(dtMs) {
  if (state.paused) return;
  state.timeMs += dtMs;
  if (state.activeSoftPulse) {
    const chunk = Math.min(dtMs, state.activeSoftPulse.remainingMs);
    const frac = chunk / state.activeSoftPulse.totalMs;
    applyPulse(state.activeSoftPulse.angleDeg * frac, 'Soft pulse substep');
    state.activeSoftPulse.remainingMs -= chunk;
    if (state.activeSoftPulse.remainingMs <= 0) state.activeSoftPulse = null;
  }
  updateSequenceQueue(dtMs);
  applyRelaxationAndPrecession(dtMs);
  updateReadouts();
}

function animate(ts) {
  const dtMs = Math.min(40, ts - lastTs);
  lastTs = ts;
  step(dtMs);
  renderMainCanvas();
  renderSignalCanvas();
  requestAnimationFrame(animate);
}

function bindControls() {
  document.querySelectorAll('[data-scenario]').forEach((button) => {
    button.addEventListener('click', () => {
      state.scenario = button.dataset.scenario;
      syncControls();
      rebuildIsochromats();
    });
  });
  el.isoCount.addEventListener('input', (e) => {
    state.isoCount = Number(e.target.value);
    el.isoCountValue.textContent = e.target.value;
    rebuildIsochromats();
  });
  el.lineOrientation.addEventListener('change', (e) => {
    state.lineOrientation = e.target.value;
    rebuildIsochromats();
  });
  el.b0Scale.addEventListener('input', (e) => {
    state.b0Scale = Number(e.target.value);
    el.b0ScaleValue.textContent = state.b0Scale.toFixed(2);
    resetEquilibrium();
  });
  el.t1.addEventListener('input', (e) => {
    state.t1 = Number(e.target.value);
    el.t1Value.textContent = e.target.value;
    pushHistory('Changed T1');
  });
  el.t2.addEventListener('input', (e) => {
    state.t2 = Number(e.target.value);
    el.t2Value.textContent = e.target.value;
    pushHistory('Changed T2');
  });
  el.offRes.addEventListener('input', (e) => {
    state.offResHzSpan = Number(e.target.value);
    el.offResValue.textContent = e.target.value;
    rebuildIsochromats();
  });
  el.flipAngle.addEventListener('input', (e) => {
    state.flipAngleDeg = Number(e.target.value);
    el.flipAngleValue.textContent = e.target.value;
  });
  el.rfPhase.addEventListener('input', (e) => {
    state.rfPhaseDeg = Number(e.target.value);
    el.rfPhaseValue.textContent = e.target.value;
  });
  document.getElementById('applyHardPulse').addEventListener('click', () => applyPulse(state.flipAngleDeg, 'Hard pulse'));
  document.getElementById('applySoftPulse').addEventListener('click', startSoftPulse);
  document.getElementById('runFID').addEventListener('click', runFID);
  document.getElementById('runSpinEcho').addEventListener('click', runSpinEcho);
  document.getElementById('runGradientEcho').addEventListener('click', runGradientEcho);
  document.getElementById('resetState').addEventListener('click', () => resetEquilibrium());
  el.pauseToggle.addEventListener('click', () => {
    state.paused = !state.paused;
    el.pauseToggle.textContent = state.paused ? 'Resume' : 'Pause';
  });
  document.getElementById('saveAnimation').addEventListener('click', saveAnimation);
  document.getElementById('loadAnimation').addEventListener('click', () => el.loadInput.click());
  el.loadInput.addEventListener('change', (e) => {
    const [file] = e.target.files;
    if (file) loadAnimation(file);
  });
  document.getElementById('undoStep').addEventListener('click', undoHistory);
  document.getElementById('redoStep').addEventListener('click', redoHistory);
  el.themeToggle.addEventListener('click', () => {
    const root = document.documentElement;
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  });
}

rebuildIsochromats();
syncControls();
bindControls();
updateReadouts();
renderHistory();
requestAnimationFrame((ts) => {
  lastTs = ts;
  animate(ts);
});
