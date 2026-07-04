const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

const tissuePresets = {
  generic: { t1: 1200, t2: 120 },
  water: { t1: 2500, t2: 800 },
  fat: { t1: 320, t2: 90 },
  shortT2: { t1: 900, t2: 35 },
};

const state = {
  scenario: 'single',
  isoCount: 7,
  lineOrientation: 'horizontal',
  initialPhaseSpreadDeg: 0,
  b0Scale: 1,
  t1: 1200,
  t2: 120,
  offResHzSpan: 18,
  flipAngleDeg: 90,
  rfPhaseDeg: 0,
  softDurationMs: 24,
  timeMs: 0,
  paused: false,
  tissueName: 'generic',
  isochromats: [],
  signalTrace: [],
  eventLog: [],
  history: [],
  historyIndex: -1,
  sequenceQueue: [],
  kSpace: { x: 0, y: 0, z: 0 },
  view: { zoom: 1, offsetX: 0, offsetY: 0, dragging: false, dragStartX: 0, dragStartY: 0, dragOffsetStartX: 0, dragOffsetStartY: 0 },
};

const el = {
  mainCanvas: document.getElementById('mainCanvas'),
  signalCanvas: document.getElementById('signalCanvas'),
  queueList: document.getElementById('queueList'),
  historyList: document.getElementById('historyList'),
  isoCount: document.getElementById('isoCount'),
  isoCountValue: document.getElementById('isoCountValue'),
  lineOrientation: document.getElementById('lineOrientation'),
  initialPhaseSpread: document.getElementById('initialPhaseSpread'),
  initialPhaseSpreadValue: document.getElementById('initialPhaseSpreadValue'),
  tissuePreset: document.getElementById('tissuePreset'),
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
  softDuration: document.getElementById('softDuration'),
  softDurationValue: document.getElementById('softDurationValue'),
  gradX: document.getElementById('gradX'),
  gradXValue: document.getElementById('gradXValue'),
  gradY: document.getElementById('gradY'),
  gradYValue: document.getElementById('gradYValue'),
  gradZ: document.getElementById('gradZ'),
  gradZValue: document.getElementById('gradZValue'),
  gradDuration: document.getElementById('gradDuration'),
  gradDurationValue: document.getElementById('gradDurationValue'),
  isoZoom: document.getElementById('isoZoom'),
  timeValue: document.getElementById('timeValue'),
  mxyValue: document.getElementById('mxyValue'),
  mzValue: document.getElementById('mzValue'),
  phaseValue: document.getElementById('phaseValue'),
  kxValue: document.getElementById('kxValue'),
  kyValue: document.getElementById('kyValue'),
  kzValue: document.getElementById('kzValue'),
  pauseToggle: document.getElementById('pauseToggle'),
  loadInput: document.getElementById('loadInput'),
  themeToggle: document.querySelector('[data-theme-toggle]'),
};

const ctx = el.mainCanvas.getContext('2d');
const signalCtx = el.signalCanvas.getContext('2d');
let lastTs = performance.now();

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function normalizedAxis(axis) {
  const n = Math.hypot(axis.x, axis.y, axis.z) || 1;
  return { x: axis.x / n, y: axis.y / n, z: axis.z / n };
}

function createIsochromat(xNorm, yNorm, zNorm = 0, idx = 0, total = 1) {
  const m0 = Math.max(0, state.b0Scale);
  const spread = state.initialPhaseSpreadDeg * DEG2RAD;
  const centered = total === 1 ? 0 : idx / (total - 1) - 0.5;
  return {
    position: { x: xNorm, y: yNorm, z: zNorm },
    M: { x: 0, y: 0, z: m0 },
    phaseRad: centered * spread,
    baseOffResHz: ((xNorm + yNorm + zNorm) / 3) * state.offResHzSpan,
    tissue: state.tissueName,
  };
}

function rebuildIsochromats(logLabel = 'Scenario rebuilt') {
  const arr = [];
  const count = state.scenario === 'single' ? 1 : state.isoCount;
  if (state.scenario === 'single') {
    arr.push(createIsochromat(0, 0, 0, 0, 1));
  } else if (state.scenario === 'line') {
    for (let i = 0; i < count; i += 1) {
      const frac = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
      arr.push(state.lineOrientation === 'horizontal' ? createIsochromat(frac, 0, 0, i, count) : createIsochromat(0, frac, 0, i, count));
    }
  } else {
    const n = count;
    const total = n * n;
    let idx = 0;
    for (let row = 0; row < n; row += 1) {
      for (let col = 0; col < n; col += 1) {
        const x = n === 1 ? 0 : (col / (n - 1)) * 2 - 1;
        const y = n === 1 ? 0 : (row / (n - 1)) * 2 - 1;
        arr.push(createIsochromat(x, y, 0, idx, total));
        idx += 1;
      }
    }
  }
  state.isochromats = arr;
  state.signalTrace = [];
  state.timeMs = 0;
  state.kSpace = { x: 0, y: 0, z: 0 };
  addEvent(logLabel, `Scenario ${state.scenario} with ${arr.length} isochromat(s)`);
  pushHistory(logLabel);
}

function rotateVectorAroundAxis(v, axis, angleRad) {
  const a = normalizedAxis(axis);
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dot = a.x * v.x + a.y * v.y + a.z * v.z;
  return {
    x: v.x * cos + (a.y * v.z - a.z * v.y) * sin + a.x * dot * (1 - cos),
    y: v.y * cos + (a.z * v.x - a.x * v.z) * sin + a.y * dot * (1 - cos),
    z: v.z * cos + (a.x * v.y - a.y * v.x) * sin + a.z * dot * (1 - cos),
  };
}

function getB1Axis() {
  const p = state.rfPhaseDeg * DEG2RAD;
  return { x: Math.cos(p), y: Math.sin(p), z: 0 };
}

function applyPulse(angleDeg, label = 'RF pulse', logEvent = true) {
  const axis = getB1Axis();
  const angleRad = angleDeg * DEG2RAD;
  state.isochromats.forEach((iso) => {
    iso.M = rotateVectorAroundAxis(iso.M, axis, angleRad);
    iso.phaseRad = Math.atan2(iso.M.y, iso.M.x);
  });
  if (logEvent) addEvent(label, `${angleDeg.toFixed(1)}° @ RF phase ${state.rfPhaseDeg.toFixed(1)}°`);
}

function queueBlock(block) {
  state.sequenceQueue.push({ ...block, elapsedMs: 0, id: `${block.type}-${Math.random().toString(36).slice(2, 8)}` });
  renderQueue();
}

function queueFreePrecession(durationMs, label = 'Free precession') {
  queueBlock({ type: 'free', durationMs, label });
}

function queueHardPulse(delayMs, flipDeg, rfPhaseDeg, label) {
  queueBlock({ type: 'pulse', durationMs: delayMs + 0.001, triggerAtMs: delayMs, applied: false, flipDeg, rfPhaseDeg, label });
}

function queueSoftPulse(flipDeg, durationMs, rfPhaseDeg, label = 'Soft pulse') {
  queueBlock({ type: 'softPulse', durationMs, deliveredDeg: 0, flipDeg, rfPhaseDeg, label });
}

function queueGradient(axis, amplitudeHz, durationMs, label) {
  queueBlock({ type: 'gradient', axis, amplitudeHz, durationMs, label });
}

function clearSequence(log = true) {
  state.sequenceQueue = [];
  renderQueue();
  if (log) addEvent('Sequence queue', 'Cleared queued blocks');
}

function resetEquilibrium(push = true) {
  const m0 = state.b0Scale;
  state.timeMs = 0;
  state.signalTrace = [];
  state.kSpace = { x: 0, y: 0, z: 0 };
  clearSequence(false);
  state.isochromats.forEach((iso) => {
    iso.M = { x: 0, y: 0, z: m0 };
    iso.phaseRad = 0;
  });
  addEvent('Reset', 'Return to equilibrium');
  if (push) pushHistory('Reset equilibrium');
}

function currentGradientHzPerAxis() {
  const active = { x: 0, y: 0, z: 0 };
  state.sequenceQueue.forEach((block) => {
    if (block.type === 'gradient' && block.elapsedMs < block.durationMs) {
      active[block.axis] += block.amplitudeHz;
    }
  });
  return active;
}

function updateSequenceQueue(dtMs) {
  state.sequenceQueue.forEach((block) => {
    const prevElapsed = block.elapsedMs;
    block.elapsedMs = Math.min(block.durationMs, block.elapsedMs + dtMs);
    if (block.type === 'pulse' && !block.applied && prevElapsed <= block.triggerAtMs && block.elapsedMs >= block.triggerAtMs) {
      const prevPhase = state.rfPhaseDeg;
      state.rfPhaseDeg = block.rfPhaseDeg;
      applyPulse(block.flipDeg, block.label, true);
      state.rfPhaseDeg = prevPhase;
      block.applied = true;
    }
    if (block.type === 'softPulse') {
      const fracNow = block.elapsedMs / block.durationMs;
      const targetDelivered = fracNow * block.flipDeg;
      const delta = targetDelivered - block.deliveredDeg;
      if (Math.abs(delta) > 1e-9) {
        const prevPhase = state.rfPhaseDeg;
        state.rfPhaseDeg = block.rfPhaseDeg;
        applyPulse(delta, `${block.label} substep`, false);
        state.rfPhaseDeg = prevPhase;
        block.deliveredDeg = targetDelivered;
      }
    }
  });
  state.sequenceQueue = state.sequenceQueue.filter((block) => block.elapsedMs < block.durationMs || (block.type === 'pulse' && !block.applied));
  renderQueue();
}

function applyRelaxationAndPrecession(dtMs) {
  const e1 = Math.exp(-dtMs / state.t1);
  const e2 = Math.exp(-dtMs / state.t2);
  const gradientHzPerAxis = currentGradientHzPerAxis();
  state.kSpace.x += gradientHzPerAxis.x * (dtMs / 1000);
  state.kSpace.y += gradientHzPerAxis.y * (dtMs / 1000);
  state.kSpace.z += gradientHzPerAxis.z * (dtMs / 1000);
  state.isochromats.forEach((iso) => {
    const totalHz = iso.baseOffResHz + gradientHzPerAxis.x * iso.position.x + gradientHzPerAxis.y * iso.position.y + gradientHzPerAxis.z * iso.position.z;
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

function addEvent(title, description) {
  state.eventLog.unshift({ timeMs: state.timeMs, title, description });
  state.eventLog = state.eventLog.slice(0, 24);
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

function renderQueue() {
  el.queueList.innerHTML = '';
  if (!state.sequenceQueue.length) {
    const li = document.createElement('li');
    li.textContent = 'No active queued blocks.';
    el.queueList.appendChild(li);
    return;
  }
  state.sequenceQueue.forEach((block) => {
    const li = document.createElement('li');
    const rem = Math.max(0, block.durationMs - block.elapsedMs).toFixed(1);
    li.innerHTML = `<strong>${block.label}</strong> · ${block.type}<br>remaining ${rem} ms`;
    el.queueList.appendChild(li);
  });
}

function snapshot() {
  return JSON.stringify({
    scenario: state.scenario,
    isoCount: state.isoCount,
    lineOrientation: state.lineOrientation,
    initialPhaseSpreadDeg: state.initialPhaseSpreadDeg,
    b0Scale: state.b0Scale,
    t1: state.t1,
    t2: state.t2,
    offResHzSpan: state.offResHzSpan,
    flipAngleDeg: state.flipAngleDeg,
    rfPhaseDeg: state.rfPhaseDeg,
    softDurationMs: state.softDurationMs,
    timeMs: state.timeMs,
    tissueName: state.tissueName,
    isochromats: state.isochromats,
    signalTrace: state.signalTrace,
    eventLog: state.eventLog,
    kSpace: state.kSpace,
    view: { zoom: state.view.zoom, offsetX: state.view.offsetX, offsetY: state.view.offsetY },
  });
}

function restoreSnapshot(raw) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  Object.assign(state, {
    scenario: data.scenario,
    isoCount: data.isoCount,
    lineOrientation: data.lineOrientation,
    initialPhaseSpreadDeg: data.initialPhaseSpreadDeg ?? 0,
    b0Scale: data.b0Scale,
    t1: data.t1,
    t2: data.t2,
    offResHzSpan: data.offResHzSpan,
    flipAngleDeg: data.flipAngleDeg,
    rfPhaseDeg: data.rfPhaseDeg,
    softDurationMs: data.softDurationMs ?? 24,
    timeMs: data.timeMs,
    tissueName: data.tissueName ?? 'generic',
    isochromats: data.isochromats,
    signalTrace: data.signalTrace,
    eventLog: data.eventLog,
    kSpace: data.kSpace ?? { x: 0, y: 0, z: 0 },
  });
  state.view.zoom = data.view?.zoom ?? 1;
  state.view.offsetX = data.view?.offsetX ?? 0;
  state.view.offsetY = data.view?.offsetY ?? 0;
  syncControls();
  renderHistory();
  renderQueue();
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
  const blob = new Blob([JSON.stringify({ version: 2, savedAt: new Date().toISOString(), snapshot: JSON.parse(snapshot()) }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mri-physics-demo-state-v2.json';
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
  el.initialPhaseSpread.value = state.initialPhaseSpreadDeg;
  el.initialPhaseSpreadValue.textContent = String(state.initialPhaseSpreadDeg);
  el.tissuePreset.value = state.tissueName;
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
  el.softDuration.value = state.softDurationMs;
  el.softDurationValue.textContent = String(state.softDurationMs);
  el.isoZoom.value = state.view.zoom;
  document.querySelectorAll('[data-scenario]').forEach((button) => {
    const active = button.dataset.scenario === state.scenario;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });
}

function netMag() {
  const n = state.isochromats.length || 1;
  return state.isochromats.reduce((acc, iso) => {
    acc.x += iso.M.x / n;
    acc.y += iso.M.y / n;
    acc.z += iso.M.z / n;
    return acc;
  }, { x: 0, y: 0, z: 0 });
}

function updateReadouts() {
  const net = netMag();
  const mxy = Math.hypot(net.x, net.y);
  const phase = Math.atan2(net.y, net.x) * RAD2DEG;
  el.timeValue.textContent = `${state.timeMs.toFixed(1)} ms`;
  el.mxyValue.textContent = mxy.toFixed(3);
  el.mzValue.textContent = net.z.toFixed(3);
  el.phaseValue.textContent = `${Number.isFinite(phase) ? phase.toFixed(1) : '0.0'}°`;
  el.kxValue.textContent = state.kSpace.x.toFixed(3);
  el.kyValue.textContent = state.kSpace.y.toFixed(3);
  el.kzValue.textContent = state.kSpace.z.toFixed(3);
  state.signalTrace.push({ timeMs: state.timeMs, mxy, mz: net.z });
  if (state.signalTrace.length > 500) state.signalTrace.shift();
}

function drawArrow(localCtx, x, y, dx, dy, color, width = 3) {
  localCtx.strokeStyle = color;
  localCtx.fillStyle = color;
  localCtx.lineWidth = width;
  localCtx.beginPath();
  localCtx.moveTo(x, y);
  localCtx.lineTo(x + dx, y + dy);
  localCtx.stroke();
  const angle = Math.atan2(dy, dx);
  const head = 10;
  localCtx.beginPath();
  localCtx.moveTo(x + dx, y + dy);
  localCtx.lineTo(x + dx - head * Math.cos(angle - 0.4), y + dy - head * Math.sin(angle - 0.4));
  localCtx.lineTo(x + dx - head * Math.cos(angle + 0.4), y + dy - head * Math.sin(angle + 0.4));
  localCtx.closePath();
  localCtx.fill();
}

function ensembleRect(w, h) {
  return { x: 24, y: 52, width: w * 0.56 - 36, height: h - 92 };
}

function worldToScreen(point, rect) {
  const zoom = state.view.zoom;
  const baseScale = Math.min(rect.width, rect.height) * 0.3;
  return {
    x: rect.x + rect.width / 2 + state.view.offsetX + point.x * baseScale * zoom,
    y: rect.y + rect.height / 2 + state.view.offsetY + point.y * baseScale * zoom,
  };
}

function drawEnsemblePanel(w, h) {
  const rect = ensembleRect(w, h);
  ctx.save();
  ctx.strokeStyle = cssVar('--color-border');
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  ctx.fillStyle = cssVar('--color-text-muted');
  ctx.font = '14px "General Sans", sans-serif';
  ctx.fillText('Isochromat ensemble (zoomable)', rect.x + 4, 30);
  ctx.fillText(`zoom ${state.view.zoom.toFixed(2)}×`, rect.x + rect.width - 74, 30);

  state.isochromats.forEach((iso) => {
    const p = worldToScreen({ x: iso.position.x, y: iso.position.y }, rect);
    const axisHalf = 18;
    ctx.strokeStyle = cssVar('--color-border');
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - axisHalf);
    ctx.lineTo(p.x, p.y + axisHalf);
    ctx.moveTo(p.x - axisHalf, p.y);
    ctx.lineTo(p.x + axisHalf, p.y);
    ctx.stroke();
    const arrowScale = 30;
    const zLen = -iso.M.z * arrowScale;
    drawArrow(ctx, p.x, p.y, iso.M.x * arrowScale, -iso.M.y * arrowScale, '#f5b04b', 2.2);
    drawArrow(ctx, p.x, p.y, 0, zLen, '#85f2ab', 2.2);
    drawArrow(ctx, p.x, p.y, iso.M.x * arrowScale, zLen, cssVar('--color-primary'), 2.6);
    ctx.fillStyle = cssVar('--color-text-muted');
    ctx.fillText(`${(iso.phaseRad * RAD2DEG).toFixed(0)}°`, p.x - 14, p.y + 34);
  });
  ctx.restore();
}

function drawNetPanel(w, h) {
  const leftW = w * 0.56;
  const origin = { x: leftW + (w - leftW) * 0.45, y: h * 0.72 };
  const axisScale = 180;
  const net = netMag();
  const grads = currentGradientHzPerAxis();
  ctx.strokeStyle = cssVar('--color-border');
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y - 220);
  ctx.lineTo(origin.x, origin.y + 20);
  ctx.moveTo(origin.x - 160, origin.y);
  ctx.lineTo(origin.x + 160, origin.y);
  ctx.stroke();
  ctx.fillStyle = cssVar('--color-text-muted');
  ctx.font = '14px "General Sans", sans-serif';
  ctx.fillText('Net magnetization vector and gradient state', leftW + 28, 30);
  ctx.fillText('+z', origin.x + 10, origin.y - 190);
  ctx.fillText('+x', origin.x + 140, origin.y - 10);
  drawArrow(ctx, origin.x, origin.y, net.x * axisScale, -net.z * axisScale, cssVar('--color-primary'), 4);
  drawArrow(ctx, origin.x, origin.y, net.x * axisScale, -net.y * axisScale, '#f5b04b', 3);
  ctx.fillStyle = '#e889ff';
  ctx.fillText(`Gx ${grads.x.toFixed(1)}  Gy ${grads.y.toFixed(1)}  Gz ${grads.z.toFixed(1)}`, leftW + 28, h - 36);
}

function renderMainCanvas() {
  const w = el.mainCanvas.width;
  const h = el.mainCanvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = cssVar('--color-surface-2');
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = cssVar('--color-border');
  ctx.beginPath();
  ctx.moveTo(w * 0.56, 24);
  ctx.lineTo(w * 0.56, h - 24);
  ctx.stroke();
  drawEnsemblePanel(w, h);
  drawNetPanel(w, h);
}

function renderSignalCanvas() {
  const w = el.signalCanvas.width;
  const h = el.signalCanvas.height;
  signalCtx.clearRect(0, 0, w, h);
  signalCtx.fillStyle = cssVar('--color-surface-2');
  signalCtx.fillRect(0, 0, w, h);
  signalCtx.strokeStyle = cssVar('--color-border');
  signalCtx.beginPath();
  signalCtx.moveTo(36, 16);
  signalCtx.lineTo(36, h - 28);
  signalCtx.lineTo(w - 16, h - 28);
  signalCtx.stroke();
  signalCtx.fillStyle = cssVar('--color-text-muted');
  signalCtx.font = '12px "General Sans", sans-serif';
  signalCtx.fillText('|Mxy|', 10, 18);
  signalCtx.fillText('t', w - 20, h - 10);
  if (state.signalTrace.length < 2) return;
  const maxTime = Math.max(1, state.signalTrace[state.signalTrace.length - 1].timeMs);
  signalCtx.strokeStyle = cssVar('--color-primary');
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
  updateSequenceQueue(dtMs);
  applyRelaxationAndPrecession(dtMs);
  updateReadouts();
}

function animate(ts) {
  const dtMs = Math.min(30, ts - lastTs);
  lastTs = ts;
  step(dtMs);
  renderMainCanvas();
  renderSignalCanvas();
  requestAnimationFrame(animate);
}

function resetView() {
  state.view.zoom = 1;
  state.view.offsetX = 0;
  state.view.offsetY = 0;
  el.isoZoom.value = '1';
}

function applyTissuePreset(name) {
  state.tissueName = name;
  const preset = tissuePresets[name];
  if (!preset) return;
  state.t1 = preset.t1;
  state.t2 = preset.t2;
  syncControls();
  pushHistory(`Applied tissue preset ${name}`);
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
  el.initialPhaseSpread.addEventListener('input', (e) => {
    state.initialPhaseSpreadDeg = Number(e.target.value);
    el.initialPhaseSpreadValue.textContent = e.target.value;
    rebuildIsochromats('Phase spread changed');
  });
  el.tissuePreset.addEventListener('change', (e) => applyTissuePreset(e.target.value));
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
    rebuildIsochromats('Off-resonance span changed');
  });
  el.flipAngle.addEventListener('input', (e) => {
    state.flipAngleDeg = Number(e.target.value);
    el.flipAngleValue.textContent = e.target.value;
  });
  el.rfPhase.addEventListener('input', (e) => {
    state.rfPhaseDeg = Number(e.target.value);
    el.rfPhaseValue.textContent = e.target.value;
  });
  el.softDuration.addEventListener('input', (e) => {
    state.softDurationMs = Number(e.target.value);
    el.softDurationValue.textContent = e.target.value;
  });
  ['X', 'Y', 'Z'].forEach((axis) => {
    const slider = el[`grad${axis}`];
    const label = el[`grad${axis}Value`];
    slider.addEventListener('input', (e) => {
      label.textContent = e.target.value;
    });
  });
  el.gradDuration.addEventListener('input', (e) => {
    el.gradDurationValue.textContent = e.target.value;
  });

  document.getElementById('applyHardPulse').addEventListener('click', () => {
    applyPulse(state.flipAngleDeg, 'Hard pulse');
    pushHistory('Hard pulse');
  });
  document.getElementById('applySoftPulse').addEventListener('click', () => {
    queueSoftPulse(state.flipAngleDeg, state.softDurationMs, state.rfPhaseDeg, 'Soft pulse');
    addEvent('Soft pulse queued', `${state.flipAngleDeg.toFixed(1)}° over ${state.softDurationMs.toFixed(1)} ms`);
    pushHistory('Soft pulse queued');
  });

  document.getElementById('applyGradX').addEventListener('click', () => {
    const a = Number(el.gradX.value);
    const d = Number(el.gradDuration.value);
    queueGradient('x', a, d, 'Manual Gx');
    addEvent('Gradient', `Gx ${a.toFixed(1)} for ${d.toFixed(1)} ms`);
    pushHistory('Applied Gx');
  });
  document.getElementById('applyGradY').addEventListener('click', () => {
    const a = Number(el.gradY.value);
    const d = Number(el.gradDuration.value);
    queueGradient('y', a, d, 'Manual Gy');
    addEvent('Gradient', `Gy ${a.toFixed(1)} for ${d.toFixed(1)} ms`);
    pushHistory('Applied Gy');
  });
  document.getElementById('applyGradZ').addEventListener('click', () => {
    const a = Number(el.gradZ.value);
    const d = Number(el.gradDuration.value);
    queueGradient('z', a, d, 'Manual Gz');
    addEvent('Gradient', `Gz ${a.toFixed(1)} for ${d.toFixed(1)} ms`);
    pushHistory('Applied Gz');
  });
  document.getElementById('zeroGradients').addEventListener('click', () => {
    state.sequenceQueue = state.sequenceQueue.filter((block) => block.type !== 'gradient');
    renderQueue();
    addEvent('Gradients', 'Removed queued gradients');
    pushHistory('Zero gradients');
  });

  document.getElementById('runFID').addEventListener('click', () => {
    resetEquilibrium(false);
    clearSequence(false);
    queueHardPulse(0, 90, state.rfPhaseDeg, 'FID excitation');
    queueFreePrecession(180, 'FID free precession');
    addEvent('Sequence', 'Queued FID');
    pushHistory('Run FID');
  });

  document.getElementById('runSpinEcho').addEventListener('click', () => {
    resetEquilibrium(false);
    clearSequence(false);
    queueHardPulse(0, 90, state.rfPhaseDeg, 'Spin echo excitation');
    queueGradient('x', 20, 16, 'Readout prephaser');
    queueFreePrecession(24, 'TE/2 evolution');
    queueHardPulse(40, 180, state.rfPhaseDeg, 'Spin echo refocusing');
    queueGradient('x', -20, 16, 'Readout rephasing');
    queueFreePrecession(48, 'Echo formation');
    addEvent('Sequence', 'Queued one-line spin echo');
    pushHistory('Run spin echo');
  });

  document.getElementById('runGradientEcho').addEventListener('click', () => {
    resetEquilibrium(false);
    clearSequence(false);
    queueHardPulse(0, 30, state.rfPhaseDeg, 'Gradient echo excitation');
    queueGradient('x', 24, 18, 'Readout dephasing');
    queueGradient('x', -24, 18, 'Readout rephasing');
    queueFreePrecession(64, 'GRE evolution');
    addEvent('Sequence', 'Queued one-line gradient echo');
    pushHistory('Run gradient echo');
  });

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

  el.isoZoom.addEventListener('input', (e) => {
    state.view.zoom = Number(e.target.value);
  });
  document.getElementById('zoomIn').addEventListener('click', () => {
    state.view.zoom = Math.min(6, state.view.zoom + 0.2);
    el.isoZoom.value = String(state.view.zoom);
  });
  document.getElementById('zoomOut').addEventListener('click', () => {
    state.view.zoom = Math.max(0.5, state.view.zoom - 0.2);
    el.isoZoom.value = String(state.view.zoom);
  });
  document.getElementById('resetView').addEventListener('click', resetView);

  el.mainCanvas.addEventListener('pointerdown', (event) => {
    const rect = ensembleRect(el.mainCanvas.width, el.mainCanvas.height);
    const bounds = el.mainCanvas.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * el.mainCanvas.width;
    const y = ((event.clientY - bounds.top) / bounds.height) * el.mainCanvas.height;
    if (x < rect.x || x > rect.x + rect.width || y < rect.y || y > rect.y + rect.height) return;
    state.view.dragging = true;
    state.view.dragStartX = event.clientX;
    state.view.dragStartY = event.clientY;
    state.view.dragOffsetStartX = state.view.offsetX;
    state.view.dragOffsetStartY = state.view.offsetY;
    el.mainCanvas.classList.add('is-dragging');
  });
  window.addEventListener('pointerup', () => {
    state.view.dragging = false;
    el.mainCanvas.classList.remove('is-dragging');
  });
  window.addEventListener('pointermove', (event) => {
    if (!state.view.dragging) return;
    state.view.offsetX = state.view.dragOffsetStartX + (event.clientX - state.view.dragStartX) * (el.mainCanvas.width / el.mainCanvas.getBoundingClientRect().width);
    state.view.offsetY = state.view.dragOffsetStartY + (event.clientY - state.view.dragStartY) * (el.mainCanvas.height / el.mainCanvas.getBoundingClientRect().height);
  });
  el.mainCanvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.08 : 0.92;
    state.view.zoom = Math.min(6, Math.max(0.5, state.view.zoom * factor));
    el.isoZoom.value = String(state.view.zoom);
  }, { passive: false });
}

rebuildIsochromats('Initial build');
syncControls();
bindControls();
updateReadouts();
renderHistory();
renderQueue();
requestAnimationFrame((ts) => {
  lastTs = ts;
  animate(ts);
});