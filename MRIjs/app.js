// MRI Isochromat Simulator UI and Graphics Glue

// State variables
let isochromats = [];
let simResults = null;
let animationCurrentTimeMs = 0.0;
let isAnimating = false;
let playbackSpeed = 1.0;
let lastFrameTime = 0.0;
let selectedSpinId = null;
let currentSimTime = 300.0;
let currentSphereRadius = 0.08;

// Three.js variables
let scene, camera, renderer, controls;
let spinVisuals = {}; // Maps spinId -> { group, sphereMesh, arrowHelper, color }
const baseArrowLength = 1.3;

// Chart.js variables
let signalChart = null;
let sequenceChart = null;

// Default colors for spins
const spinPalette = [
    '#3b82f6', // blue
    '#10b981', // green
    '#ec4899', // pink
    '#f59e0b', // orange
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#ef4444', // red
    '#14b8a6'  // teal
];

// Document Ready
document.addEventListener('DOMContentLoaded', () => {
    initThree();
    initChart();
    initDefaultSpins();
    setupEventListeners();
    runSimulation();
    runPhysicsTests();
    
    // Trigger Lucide icons
    lucide.createIcons();
    
    // Start animation render loop
    requestAnimationFrame(animateLoop);
});

// Initialize Three.js 3D View
function initThree() {
    const container = document.getElementById('threeCanvasContainer');
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 300;

    // Create Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06080d);

    // Create Camera (vertical Z is up)
    camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.up.set(0, 0, 1);
    camera.position.set(0, -9, 3.5);

    // Create WebGL Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Orbit Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 20;
    // Don't allow rotating under the grid
    controls.maxPolarAngle = Math.PI / 2 + 0.1;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight1.position.set(5, -10, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 0.3);
    dirLight2.position.set(-5, 5, -5);
    scene.add(dirLight2);

    // Draw Placement Axis (X-axis)
    const axisPoints = [new THREE.Vector3(-5.5, 0, 0), new THREE.Vector3(5.5, 0, 0)];
    const axisGeo = new THREE.BufferGeometry().setFromPoints(axisPoints);
    const axisMat = new THREE.LineBasicMaterial({ color: 0x374151, linewidth: 2 });
    const axisLine = new THREE.Line(axisGeo, axisMat);
    scene.add(axisLine);

    // Draw X-axis Ticks
    for (let i = -5; i <= 5; i++) {
        const tickPoints = [new THREE.Vector3(i, -0.15, 0), new THREE.Vector3(i, 0.15, 0)];
        const tickGeo = new THREE.BufferGeometry().setFromPoints(tickPoints);
        const tickMat = new THREE.LineBasicMaterial({ color: 0x4b5563 });
        const tickLine = new THREE.Line(tickGeo, tickMat);
        scene.add(tickLine);
    }

    // Draw grid plane at Z=0 for reference
    const gridHelper = new THREE.GridHelper(11, 11, 0x4b5563, 0x1f2937);
    gridHelper.rotation.x = Math.PI / 2; // Lie flat in XY plane (remember Z is up)
    gridHelper.position.y = 0;
    gridHelper.position.z = -0.01; // slightly below spins
    scene.add(gridHelper);

    // Labeled main magnetic field vector B0 at the side
    createB0Vector();

    // Raycasting for placements
    container.addEventListener('pointerdown', onCanvasClick);

    // Handle Resize
    window.addEventListener('resize', () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });
}

// Draw B0 Field indicator on the right side
function createB0Vector() {
    const origin = new THREE.Vector3(6.0, 0, -1.0);
    const dir = new THREE.Vector3(0, 0, 1.0);
    const length = 2.0;
    const hex = 0xf59e0b; // Gold
    
    const arrow = new THREE.ArrowHelper(dir, origin, length, hex, 0.4, 0.2);
    scene.add(arrow);

    // Add a text-like representation or label in future? Simply the gold arrow represents B0.
}

// Initialize Chart.js Signal and Sequence Plots
function initChart() {
    const ctxSignal = document.getElementById('signalChart').getContext('2d');
    const ctxSequence = document.getElementById('sequenceChart').getContext('2d');
    
    // Custom vertical line cursor plugin
    const timeCursorPlugin = {
        id: 'timeCursor',
        afterDraw: (chart) => {
            const ctx = chart.ctx;
            const xAxis = chart.scales.x;
            const yAxis = chart.scales.y;
            const xPos = xAxis.getPixelForValue(animationCurrentTimeMs);
            
            if (xPos >= xAxis.left && xPos <= xAxis.right) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(xPos, yAxis.top);
                ctx.lineTo(xPos, yAxis.bottom);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.restore();
            }
        }
    };

    signalChart = new Chart(ctxSignal, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: '|Mxy| (Transverse Signal)',
                    borderColor: '#10b981', // emerald
                    borderWidth: 2.5,
                    pointRadius: 0,
                    data: [],
                    tension: 0.1
                },
                {
                    label: 'Mz (Longitudinal)',
                    borderColor: '#ec4899', // pink
                    borderWidth: 2,
                    pointRadius: 0,
                    data: [],
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    type: 'linear',
                    display: false, // Hide X axis labels on the top chart to save space and align vertical lines
                    title: { display: false },
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    ticks: { color: '#6b7280', font: { family: 'Space Grotesk' } }
                },
                y: {
                    min: -1.05,
                    max: 1.05,
                    title: {
                        display: true,
                        text: 'Magnetization',
                        color: '#9ca3af',
                        font: { family: 'Outfit', size: 10 }
                    },
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    ticks: { color: '#6b7280', font: { family: 'Space Grotesk', size: 9 } }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#f3f4f6',
                        font: { family: 'Outfit', size: 10 },
                        boxWidth: 10,
                        padding: 8
                    }
                }
            }
        },
        plugins: [timeCursorPlugin]
    });

    sequenceChart = new Chart(ctxSequence, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'RF Amplitude',
                    borderColor: '#3b82f6', // blue
                    borderWidth: 2,
                    pointRadius: 0,
                    data: [],
                    tension: 0.1,
                    fill: 'origin',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)'
                },
                {
                    label: 'Gradient Gx',
                    borderColor: '#f59e0b', // orange
                    borderWidth: 2,
                    pointRadius: 0,
                    data: [],
                    tension: 0.1,
                    fill: 'origin',
                    backgroundColor: 'rgba(245, 158, 11, 0.05)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Time (ms)',
                        color: '#9ca3af',
                        font: { family: 'Outfit', size: 10 }
                    },
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    ticks: { color: '#6b7280', font: { family: 'Space Grotesk', size: 9 } }
                },
                y: {
                    min: -1.15,
                    max: 1.15,
                    title: {
                        display: true,
                        text: 'Sequence (Norm)',
                        color: '#9ca3af',
                        font: { family: 'Outfit', size: 10 }
                    },
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    ticks: { color: '#6b7280', font: { family: 'Space Grotesk', size: 9 } }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#f3f4f6',
                        font: { family: 'Outfit', size: 10 },
                        boxWidth: 10,
                        padding: 8
                    }
                }
            }
        },
        plugins: [timeCursorPlugin]
    });
}

// Populate default spins
function initDefaultSpins() {
    const defaults = [
        { id: 'spin_1', x: -0.8, T1: 600, T2: 80, PD: 1.0, w: 0 },
        { id: 'spin_2', x: -0.4, T1: 800, T2: 100, PD: 1.0, w: 0.5 },
        { id: 'spin_3', x: 0.0, T1: 1000, T2: 120, PD: 1.0, w: 0 },
        { id: 'spin_4', x: 0.4, T1: 1200, T2: 140, PD: 1.0, w: -0.5 },
        { id: 'spin_5', x: 0.8, T1: 1400, T2: 160, PD: 1.0, w: 1.0 }
    ];

    defaults.forEach((d, idx) => {
        addSpinState(d, idx);
    });

    updateSpinListTable();
}

// Add a spin to state and create 3D visuals
function addSpinState(spin, index) {
    isochromats.push(spin);
    
    // Assign color
    const colorStr = spinPalette[index % spinPalette.length];
    
    // Create 3D visuals
    const group = new THREE.Group();
    group.position.set(spin.x * 5.0, 0, 0);

    // Sphere
    const sphereGeo = new THREE.SphereGeometry(1.0, 32, 32);
    const sphereMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorStr),
        roughness: 0.2,
        metalness: 0.8
    });
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    sphereMesh.scale.setScalar(currentSphereRadius);
    group.add(sphereMesh);

    // Arrow (initially pointing straight up along Z axis)
    const dir = new THREE.Vector3(0, 0, 1.0);
    const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), baseArrowLength, new THREE.Color(colorStr), 0.3, 0.15);
    group.add(arrow);

    scene.add(group);

    spinVisuals[spin.id] = {
        group: group,
        sphereMesh: sphereMesh,
        arrowHelper: arrow,
        color: colorStr
    };
}

// Remove spin from scene and list
function removeSpinState(spinId) {
    const visual = spinVisuals[spinId];
    if (visual) {
        scene.remove(visual.group);
        delete spinVisuals[spinId];
    }
    isochromats = isochromats.filter(iso => iso.id !== spinId);
    updateSpinListTable();
    runSimulation();
}

// Set up UI listeners
function setupEventListeners() {
    // Scenario Combobox
    const scenarioSelect = document.getElementById('scenarioSelect');
    scenarioSelect.addEventListener('change', () => {
        const scenario = scenarioSelect.value;
        
        // Toggle input groups
        if (scenario === 'FID') {
            document.getElementById('paramFlipGroup').style.display = 'flex';
            document.getElementById('paramTeTrGroup').style.display = 'none';
        } else if (scenario === 'GRE') {
            document.getElementById('paramFlipGroup').style.display = 'flex';
            document.getElementById('paramTeTrGroup').style.display = 'grid';
        } else if (scenario === 'SE') {
            document.getElementById('paramFlipGroup').style.display = 'none';
            document.getElementById('paramTeTrGroup').style.display = 'grid';
        }
        
        runSimulation();
    });

    // Parameter changes (real-time recalculation on input and change events)
    ['simTimeInput', 'frameSelect', 'flipAngleInput', 'teInput', 'trInput'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            ['input', 'change'].forEach(evtType => {
                element.addEventListener(evtType, () => {
                    runSimulation();
                });
            });
        }
    });

    // Run Tests Button
    document.getElementById('runTestsBtn').addEventListener('click', () => {
        runPhysicsTests();
    });

    // Top Dropdown Menu Listeners
    // File -> Save Experiment
    document.getElementById('menuSaveExp').addEventListener('click', (e) => {
        e.preventDefault();
        saveExperiment();
    });

    // File -> Load Experiment
    document.getElementById('menuLoadExp').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('experimentFileInput').click();
    });

    // Hidden Input loader
    document.getElementById('experimentFileInput').addEventListener('change', (e) => {
        loadExperiment(e);
    });

    // Settings -> Interface Configuration
    document.getElementById('menuInterfaceConfig').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('sphereRadiusSlider').value = currentSphereRadius;
        document.getElementById('sphereRadiusVal').innerText = currentSphereRadius.toFixed(2);
        document.getElementById('interfaceDialog').showModal();
    });

    // Sphere size slider input
    document.getElementById('sphereRadiusSlider').addEventListener('input', (e) => {
        const rad = parseFloat(e.target.value);
        document.getElementById('sphereRadiusVal').innerText = rad.toFixed(2);
        updateSphereRadius(rad);
    });

    // Help -> Quick Guide
    document.getElementById('menuQuickGuide').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('quickGuideDialog').showModal();
    });

    // Help -> About
    document.getElementById('menuAbout').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('aboutDialog').showModal();
    });

    // Playback Buttons
    const playPauseBtn = document.getElementById('playPauseBtn');
    playPauseBtn.addEventListener('click', () => {
        isAnimating = !isAnimating;
        if (isAnimating) {
            playPauseBtn.innerHTML = '<i data-lucide="pause"></i> Pause';
            lastFrameTime = performance.now();
        } else {
            playPauseBtn.innerHTML = '<i data-lucide="play"></i> Animate';
        }
        lucide.createIcons();
    });

    const resetBtn = document.getElementById('resetBtn');
    resetBtn.addEventListener('click', () => {
        animationCurrentTimeMs = 0.0;
        isAnimating = false;
        playPauseBtn.innerHTML = '<i data-lucide="play"></i> Animate';
        lucide.createIcons();
        updateSpinVisualsAtTime(0);
        signalChart.update();
        updateTimeDisplay(0);
    });

    // Speed Control Buttons
    const speedBtns = document.querySelectorAll('.speed-btn');
    speedBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            speedBtns.forEach(b => {
                b.classList.remove('active');
                b.style.borderColor = 'var(--border-color)';
            });
            btn.classList.add('active');
            btn.style.borderColor = 'var(--accent-blue)';
            playbackSpeed = parseFloat(btn.dataset.speed);
        });
    });

    // Add Default Spin
    document.getElementById('addDefaultSpinBtn').addEventListener('click', () => {
        // Find empty spot or random spot
        const randX = Math.round((Math.random() * 2.0 - 1.0) * 10.0) / 10.0;
        const newId = 'spin_' + Math.random().toString(36).substr(2, 9);
        const spin = {
            id: newId,
            x: randX,
            T1: 800,
            T2: 100,
            PD: 1.0,
            w: 0
        };
        addSpinState(spin, isochromats.length);
        updateSpinListTable();
        runSimulation();
    });

    // Clear all spins
    document.getElementById('clearSpinsBtn').addEventListener('click', () => {
        isochromats.forEach(spin => {
            scene.remove(spinVisuals[spin.id].group);
        });
        isochromats = [];
        spinVisuals = {};
        updateSpinListTable();
        runSimulation();
    });

    // Dialog Buttons
    document.getElementById('cancelDialogBtn').addEventListener('click', () => {
        document.getElementById('spinDialog').close();
    });

    document.getElementById('deleteSpinBtn').addEventListener('click', () => {
        if (selectedSpinId) {
            removeSpinState(selectedSpinId);
            document.getElementById('spinDialog').close();
        }
    });

    document.getElementById('spinForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('spinIdInput').value;
        const posX = parseFloat(document.getElementById('spinXInput').value);
        const t1 = parseFloat(document.getElementById('spinT1Input').value);
        const t2 = parseFloat(document.getElementById('spinT2Input').value);
        const pd = parseFloat(document.getElementById('spinPdInput').value);
        const w = parseFloat(document.getElementById('spinWInput').value);

        if (id) {
            // Edit existing
            const spin = isochromats.find(iso => iso.id === id);
            if (spin) {
                spin.x = posX;
                spin.T1 = t1;
                spin.T2 = t2;
                spin.PD = pd;
                spin.w = w;

                // Update visual group location
                spinVisuals[id].group.position.set(posX * 5.0, 0, 0);
            }
        } else {
            // Create new
            const newId = 'spin_' + Math.random().toString(36).substr(2, 9);
            const spin = { id: newId, x: posX, T1: t1, T2: t2, PD: pd, w: w };
            addSpinState(spin, isochromats.length);
        }

        updateSpinListTable();
        runSimulation();
        document.getElementById('spinDialog').close();
    });

    // Scroll Zoom listeners for charts (scrolling mouse wheel adjusts simulation time dynamically)
    const handleZoomWheel = (e) => {
        e.preventDefault();
        
        // Step size scales with currentSimTime to feel smooth at both low and high ranges
        let step = Math.round((currentSimTime * 0.1) / 10) * 10;
        step = Math.max(10, step); // min step 10ms
        
        let newSimTime = currentSimTime;
        if (e.deltaY < 0) {
            // Scroll Up -> Zoom In -> Decrease simulation time
            newSimTime = Math.max(20, currentSimTime - step); // clamp min to 20ms
        } else {
            // Scroll Down -> Zoom Out -> Increase simulation time
            newSimTime = Math.min(2000, currentSimTime + step); // clamp max to 2000ms
        }
        
        if (newSimTime !== currentSimTime) {
            document.getElementById('simTimeInput').value = newSimTime;
            // Dispatch input event to trigger recalculation and update the chart axis
            document.getElementById('simTimeInput').dispatchEvent(new Event('input'));
        }
    };

    document.getElementById('signalChart').addEventListener('wheel', handleZoomWheel, { passive: false });
    document.getElementById('sequenceChart').addEventListener('wheel', handleZoomWheel, { passive: false });
}

// Raycaster to handle user click on the 3D panel
function onCanvasClick(event) {
    const container = document.getElementById('threeCanvasContainer');
    const rect = renderer.domElement.getBoundingClientRect();
    
    // Normalized coordinates
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    // 1. Raycast against existing spin spheres
    const sphereMeshes = Object.values(spinVisuals).map(v => v.sphereMesh);
    const intersects = raycaster.intersectObjects(sphereMeshes);

    if (intersects.length > 0) {
        const hitSphere = intersects[0].object;
        const hitSpinId = Object.keys(spinVisuals).find(key => spinVisuals[key].sphereMesh === hitSphere);
        if (hitSpinId) {
            const hitSpin = isochromats.find(iso => iso.id === hitSpinId);
            if (hitSpin) {
                openEditSpinDialog(hitSpin);
                return;
            }
        }
    }

    // 2. Project onto XZ vertical plane (Y = 0) to add spin
    const planeY = new THREE.Plane(new THREE.Vector3(0, 1.0, 0), 0);
    const intersection = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(planeY, intersection)) {
        // If user clicks near the line (let's say Z is close to 0, e.g. within 1.5 units)
        if (Math.abs(intersection.z) < 1.5 && Math.abs(intersection.x) <= 5.5) {
            const xNorm = Math.max(-1.0, Math.min(1.0, intersection.x / 5.0));
            const roundedX = Math.round(xNorm * 10) / 10;
            openAddSpinDialog(roundedX);
        }
    }
}

// Open modal to add spin
function openAddSpinDialog(posX) {
    selectedSpinId = null;
    document.getElementById('dialogTitle').innerText = 'Add Isochromat';
    document.getElementById('spinIdInput').value = '';
    document.getElementById('spinXInput').value = posX;
    document.getElementById('spinT1Input').value = 600;
    document.getElementById('spinT2Input').value = 80;
    document.getElementById('spinPdInput').value = 1.0;
    document.getElementById('spinWInput').value = 0.0;
    
    document.getElementById('deleteSpinBtn').style.display = 'none';
    document.getElementById('spinDialog').showModal();
}

// Open modal to edit existing spin
function openEditSpinDialog(spin) {
    selectedSpinId = spin.id;
    document.getElementById('dialogTitle').innerText = 'Edit Isochromat';
    document.getElementById('spinIdInput').value = spin.id;
    document.getElementById('spinXInput').value = spin.x;
    document.getElementById('spinT1Input').value = spin.T1;
    document.getElementById('spinT2Input').value = spin.T2;
    document.getElementById('spinPdInput').value = spin.PD;
    document.getElementById('spinWInput').value = spin.w;

    document.getElementById('deleteSpinBtn').style.display = 'block';
    document.getElementById('spinDialog').showModal();
}

// Update the list of spins in the sidebar table
function updateSpinListTable() {
    const tbody = document.getElementById('spinListBody');
    tbody.innerHTML = '';

    if (isochromats.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No active spins. Click on the 3D grid to place one.</td></tr>';
        return;
    }

    isochromats.forEach((spin) => {
        const visual = spinVisuals[spin.id];
        const color = visual ? visual.color : '#ffffff';
        
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.innerHTML = `
            <td>
                <span class="spin-color-dot" style="background-color: ${color}"></span>
                ${spin.id.substring(5, 9)}
            </td>
            <td style="font-family: var(--font-mono);">${spin.x.toFixed(1)}</td>
            <td>${spin.T1}</td>
            <td>${spin.T2}</td>
            <td>${spin.PD.toFixed(1)}</td>
            <td>${spin.w}</td>
            <td style="text-align: right;">
                <button class="btn btn-danger" style="padding: 0.1rem 0.3rem; font-size: 0.65rem;" onclick="event.stopPropagation(); removeSpinState('${spin.id}')">
                    <i data-lucide="trash" style="width: 10px; height: 10px;"></i>
                </button>
            </td>
        `;

        tr.addEventListener('click', () => {
            openEditSpinDialog(spin);
        });

        tbody.appendChild(tr);
    });

    lucide.createIcons();
}

// Run the Bloch equations simulator
function runSimulation() {
    const frame = document.getElementById('frameSelect').value;
    const scenario = document.getElementById('scenarioSelect').value;
    
    // Read parameters
    const flipAngle = parseFloat(document.getElementById('flipAngleInput').value) || 90;
    const TE = parseFloat(document.getElementById('teInput').value) || 60;
    const TR = parseFloat(document.getElementById('trInput').value) || 250;

    // Simulation time is read from global input for all scenarios
    currentSimTime = parseFloat(document.getElementById('simTimeInput').value) || 300;

    // Validate parameters to prevent pulse/gradient overlap in UI
    const warningEl = document.getElementById('parameterWarning');
    const warningTextEl = document.getElementById('parameterWarningText');
    if (warningEl && warningTextEl) {
        warningEl.style.display = 'none'; // reset
        
        const rfDurationMs = 2.0; // 2 ms RF duration
        const minTE = 3.0 * rfDurationMs; // 6 ms minimum
        
        if (scenario === 'GRE') {
            const maxTE = (TR + 0.5 * rfDurationMs) / 1.5;
            if (TE < minTE) {
                warningTextEl.innerText = `TE must be at least ${minTE} ms to accommodate RF duration and dephasing.`;
                warningEl.style.display = 'flex';
            } else if (TE >= maxTE) {
                const recommendedTE = Math.floor(maxTE - 1);
                warningTextEl.innerText = `TE (${TE} ms) is too large for TR (${TR} ms) in GRE. To prevent gradient overlap, TE must be < (TR + 1) / 1.5 (~${recommendedTE} ms). The simulation will internally clamp TE.`;
                warningEl.style.display = 'flex';
            }
        } else if (scenario === 'SE') {
            const maxTE = TR - 4;
            if (TE < minTE) {
                warningTextEl.innerText = `TE must be at least ${minTE} ms to accommodate RF duration.`;
                warningEl.style.display = 'flex';
            } else if (TE >= TR) {
                warningTextEl.innerText = `TE must be less than TR (${TR} ms). The simulation will internally clamp TE to prevent refocusing pulse overlap.`;
                warningEl.style.display = 'flex';
            } else if (TE >= maxTE) {
                warningTextEl.innerText = `TE (${TE} ms) is too close to TR (${TR} ms). The simulation will internally clamp TE to leave room for the echo.`;
                warningEl.style.display = 'flex';
            }
        }
    }

    // Run simulation
    const dt = 0.2; // 0.2 ms simulation resolution for high-performance JS computation
    const simulator = new BlochSimulator(isochromats, currentSimTime, dt, frame, scenario, { flipAngle, TE, TR });
    simResults = simulator.run();

    // Reset animation state
    animationCurrentTimeMs = 0.0;
    
    // Update chart representation
    updateChartData();
    updateSpinVisualsAtTime(0);
    updateTimeDisplay(0);
}

// Update Chart.js datasets with simulation results
function updateChartData() {
    if (!simResults) return;

    const dataLabels = [];
    const mxyData = [];
    const mzData = [];
    const rfData = [];
    const gradData = [];

    // Find max RF magnitude for normalization
    const maxRF = Math.max(...simResults.sequenceRF, 1.0); // prevent divide by zero
    // Find max gradient magnitude for normalization
    const maxGrad = 2 * Math.PI * 30.0;

    // Decimate data points slightly for Chart.js drawing speed (max 600 points)
    const stride = Math.max(1, Math.floor(simResults.signals.length / 500));

    for (let i = 0; i < simResults.signals.length; i += stride) {
        const pt = simResults.signals[i];
        const rfVal = simResults.sequenceRF[i] / maxRF;
        const gradVal = simResults.sequenceGrad[i] / maxGrad;

        dataLabels.push(pt.t); // in ms
        mxyData.push({ x: pt.t, y: pt.Mxy });
        mzData.push({ x: pt.t, y: pt.Mz });
        rfData.push({ x: pt.t, y: rfVal });
        gradData.push({ x: pt.t, y: gradVal });
    }

    // Always include final point
    const finalIdx = simResults.signals.length - 1;
    const finalPt = simResults.signals[finalIdx];
    const finalRfVal = simResults.sequenceRF[finalIdx] / maxRF;
    const finalGradVal = simResults.sequenceGrad[finalIdx] / maxGrad;

    dataLabels.push(finalPt.t);
    mxyData.push({ x: finalPt.t, y: finalPt.Mxy });
    mzData.push({ x: finalPt.t, y: finalPt.Mz });
    rfData.push({ x: finalPt.t, y: finalRfVal });
    gradData.push({ x: finalPt.t, y: finalGradVal });

    // Update signal chart
    signalChart.data.datasets[0].data = mxyData;
    signalChart.data.datasets[1].data = mzData;
    signalChart.options.scales.x.max = currentSimTime;
    signalChart.options.scales.x.min = 0;
    signalChart.update();

    // Update sequence chart
    sequenceChart.data.datasets[0].data = rfData;
    sequenceChart.data.datasets[1].data = gradData;
    sequenceChart.options.scales.x.max = currentSimTime;
    sequenceChart.options.scales.x.min = 0;
    sequenceChart.update();
}

// Animates the 3D spheres/arrows based on current time step
function updateSpinVisualsAtTime(timeMs) {
    if (!simResults || isochromats.length === 0) return;

    // Find the closest index in history
    const stepIdx = Math.min(
        simResults.spinHistory.length - 1,
        Math.max(0, Math.floor(timeMs / (simResults.timeSteps[1] - simResults.timeSteps[0])))
    );

    const stepStates = simResults.spinHistory[stepIdx];

    // Loop over each spin and update its arrow helper direction and length
    isochromats.forEach((spin, idx) => {
        const visual = spinVisuals[spin.id];
        if (visual && stepStates[idx]) {
            const M = stepStates[idx]; // [Mx, My, Mz]
            const mxyMag = Math.sqrt(M[0] * M[0] + M[1] * M[1]);
            const totalMag = Math.sqrt(mxyMag * mxyMag + M[2] * M[2]);

            // Set vector direction (normalize)
            if (totalMag > 1e-6) {
                const dir = new THREE.Vector3(M[0], M[1], M[2]).normalize();
                visual.arrowHelper.setDirection(dir);
                visual.arrowHelper.setLength(totalMag * baseArrowLength, 0.25, 0.12);
            } else {
                visual.arrowHelper.setLength(0.001); // invisible
            }

            // Optional: update visual position in case user edited position
            visual.group.position.set(spin.x * 5.0, 0, 0);
        }
    });
}

// Display current time in header
function updateTimeDisplay(timeMs) {
    document.getElementById('signalTimeDisplay').innerText = `t = ${timeMs.toFixed(1)} ms`;
}

// Main Playback Loop
function animateLoop(now) {
    requestAnimationFrame(animateLoop);

    // Update Controls (orbit camera physics)
    if (controls) controls.update();

    if (isAnimating && simResults) {
        const delta = now - lastFrameTime; // real-time elapsed in ms
        lastFrameTime = now;

        const maxSimTime = currentSimTime;
        
        // Advance simulation time: real elapsed time multiplied by user speed factor
        animationCurrentTimeMs += delta * playbackSpeed;

        if (animationCurrentTimeMs >= maxSimTime) {
            // Loop back to 0
            animationCurrentTimeMs = 0.0;
        }

        updateSpinVisualsAtTime(animationCurrentTimeMs);
        updateTimeDisplay(animationCurrentTimeMs);

        // Request chart draw (triggers vertical line drawing at new time cursor location)
        signalChart.draw();
        sequenceChart.draw();
    } else {
        lastFrameTime = now;
    }

    // Render WebGL
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Run Physics Tests in the browser
function runPhysicsTests() {
    console.log("Running In-App Physics Verification Tests...");
    
    // Helper to update visual row state
    const setRowState = (rowId, status, message) => {
        const row = document.getElementById(rowId);
        if (!row) return;
        
        let iconHtml = '';
        if (status === 'passing') {
            iconHtml = '<i data-lucide="check-circle" style="width: 14px; height: 14px; color: #10b981;"></i>';
            row.style.color = '#10b981'; // emerald
        } else if (status === 'failing') {
            iconHtml = '<i data-lucide="x-circle" style="width: 14px; height: 14px; color: #ef4444;"></i>';
            row.style.color = '#ef4444'; // red
        } else {
            iconHtml = '<i data-lucide="circle-dashed" style="width: 14px; height: 14px; color: var(--text-muted);"></i>';
            row.style.color = 'var(--text-secondary)';
        }
        
        const titleText = row.innerText.split(':')[0];
        row.innerHTML = `${iconHtml} <span title="${message}">${titleText}: ${message}</span>`;
        lucide.createIcons();
    };

    // 1. FID Test
    try {
        const fidSpins = [{ id: 'test_fid', x: 0, T1: 800, T2: 100, PD: 1.0, w: 0 }];
        const sim = new BlochSimulator(fidSpins, 150, 0.2, 'rotating', 'FID', { flipAngle: 90 });
        const res = sim.run();
        
        const step2 = Math.round(2.0 / 0.2);
        const step102 = Math.round(102.0 / 0.2);
        
        const mxyInit = res.signals[step2].Mxy;
        const mxyDecay = res.signals[step102].Mxy;
        const expectedDecay = Math.exp(-100.0 / 100.0); // e^-1 = 0.3679
        
        const okExcitation = Math.abs(mxyInit - 1.0) < 0.05;
        const okDecay = Math.abs(mxyDecay - expectedDecay) < 0.05;
        
        if (okExcitation && okDecay) {
            setRowState('testFidRow', 'passing', 'PASSED (Excited to 98%+, decay fits e^-t/T2)');
        } else {
            setRowState('testFidRow', 'failing', `FAILED (Mxy init: ${mxyInit.toFixed(2)}, decay: ${mxyDecay.toFixed(2)}, expected decay: ${expectedDecay.toFixed(2)})`);
        }
    } catch (e) {
        setRowState('testFidRow', 'failing', 'ERROR: ' + e.message);
    }

    // 2. GRE Test
    try {
        const greSpins = [
            { id: 'test_gre_1', x: -1.0, T1: 1000, T2: 200, PD: 1.0, w: 0 },
            { id: 'test_gre_2', x: 1.0, T1: 1000, T2: 200, PD: 1.0, w: 0 }
        ];
        const sim = new BlochSimulator(greSpins, 80, 0.2, 'rotating', 'GRE', { TE: 40, TR: 100, flipAngle: 90 });
        const res = sim.run();
        
        const stepDephase = Math.round(11.0 / 0.2); // 11 ms
        const stepEcho = Math.round(40.0 / 0.2);    // TE = 40 ms
        
        const mxyDephase = res.signals[stepDephase].Mxy;
        const mxyEcho = res.signals[stepEcho].Mxy;
        
        const dephasedOk = mxyDephase < 0.20;
        const echoOk = mxyEcho > 0.79 && mxyEcho > mxyDephase;
        
        if (dephasedOk && echoOk) {
            setRowState('testGreRow', 'passing', `PASSED (Dephased to ${mxyDephase.toFixed(2)}, rephased to echo ${mxyEcho.toFixed(2)})`);
        } else {
            setRowState('testGreRow', 'failing', `FAILED (Dephase: ${mxyDephase.toFixed(2)}, Echo: ${mxyEcho.toFixed(2)})`);
        }
    } catch (e) {
        setRowState('testGreRow', 'failing', 'ERROR: ' + e.message);
    }

    // 3. SE Test
    try {
        const seSpins = [
            { id: 'test_se_1', x: 0, T1: 1000, T2: 200, PD: 1.0, w: -25.0 },
            { id: 'test_se_2', x: 0, T1: 1000, T2: 200, PD: 1.0, w: 25.0 }
        ];
        const sim = new BlochSimulator(seSpins, 100, 0.2, 'rotating', 'SE', { TE: 60, TR: 150 });
        const res = sim.run();
        
        const stepDephase = Math.round(12.0 / 0.2); // 12 ms
        const stepEcho = Math.round(60.0 / 0.2);    // TE = 60 ms
        
        const mxyDephase = res.signals[stepDephase].Mxy;
        const mxyEcho = res.signals[stepEcho].Mxy;
        
        const dephasedOk = mxyDephase < 0.25;
        const echoOk = mxyEcho > 0.72 && mxyEcho > mxyDephase;
        
        if (dephasedOk && echoOk) {
            setRowState('testSeRow', 'passing', `PASSED (Dephased to ${mxyDephase.toFixed(2)}, refocused to echo ${mxyEcho.toFixed(2)})`);
        } else {
            setRowState('testSeRow', 'failing', `FAILED (Dephase: ${mxyDephase.toFixed(2)}, Echo: ${mxyEcho.toFixed(2)})`);
        }
    } catch (e) {
        setRowState('testSeRow', 'failing', 'ERROR: ' + e.message);
    }
}

// Save experiment parameters and spins array to JSON
function saveExperiment() {
    const data = {
        isochromats: isochromats,
        scenario: document.getElementById('scenarioSelect').value,
        simTime: parseFloat(document.getElementById('simTimeInput').value) || 300,
        frame: document.getElementById('frameSelect').value,
        flipAngle: parseFloat(document.getElementById('flipAngleInput').value) || 90,
        TE: parseFloat(document.getElementById('teInput').value) || 60,
        TR: parseFloat(document.getElementById('trInput').value) || 250,
        sphereRadius: currentSphereRadius
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mri_experiment_${data.scenario.toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log("Experiment configuration exported successfully.");
}

// Load experiment parameters and spins array from JSON
function loadExperiment(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (!data.isochromats) {
                throw new Error("Invalid experiment file format (missing spins array)");
            }

            // 1. Clear all existing spins
            clearAllSpins();

            // 2. Add loaded spins
            data.isochromats.forEach((spin, idx) => {
                addSpinState(spin, idx);
            });
            updateSpinListTable();

            // 3. Set parameters in UI
            if (data.scenario) document.getElementById('scenarioSelect').value = data.scenario;
            if (data.simTime) document.getElementById('simTimeInput').value = data.simTime;
            if (data.frame) document.getElementById('frameSelect').value = data.frame;
            if (data.flipAngle) document.getElementById('flipAngleInput').value = data.flipAngle;
            if (data.TE) document.getElementById('teInput').value = data.TE;
            if (data.TR) document.getElementById('trInput').value = data.TR;

            // Trigger change event to update UI display toggles
            document.getElementById('scenarioSelect').dispatchEvent(new Event('change'));

            // 4. Update sphere radius
            if (data.sphereRadius) {
                currentSphereRadius = data.sphereRadius;
                updateSphereRadius(currentSphereRadius);
            }

            // 5. Run simulation
            runSimulation();
            
            console.log("Experiment configuration loaded successfully.");
        } catch (err) {
            alert("Error loading experiment: " + err.message);
        }
        
        // Reset input value to allow loading same file multiple times
        e.target.value = '';
    };
    reader.readAsText(file);
}

// Clear all spins helper
function clearAllSpins() {
    isochromats.forEach(spin => {
        const visual = spinVisuals[spin.id];
        if (visual) {
            scene.remove(visual.group);
        }
    });
    isochromats = [];
    spinVisuals = {};
}

// Update the 3D sphere radius in real-time
function updateSphereRadius(radius) {
    currentSphereRadius = radius;
    Object.values(spinVisuals).forEach(visual => {
        if (visual && visual.sphereMesh) {
            visual.sphereMesh.scale.setScalar(radius);
        }
    });
}
