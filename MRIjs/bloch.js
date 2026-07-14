/**
 * Bloch Equation Simulation Engine for MRI Isochromats
 * All physics calculations use SI units (seconds, radians, Hz, Tesla/meters)
 */

class BlochSimulator {
    constructor(isochromats, simulationTimeMs, dtMs, frameType, scenario, params) {
        this.isochromats = isochromats; // Array of { x, T1, T2, PD, w, id }
        this.simulationTime = simulationTimeMs / 1000.0; // convert to seconds
        this.dt = dtMs / 1000.0; // convert to seconds
        this.frameType = frameType; // 'lab' or 'rotating'
        this.scenario = scenario; // 'FID', 'GRE', 'SE'
        this.params = params; // Scenario-specific params: flipAngle, TE, TR

        // Visual base frequency for Lab Frame (e.g., 2.0 Hz so precession is clearly visible)
        this.f0 = 2.0; 
        this.omega0 = this.frameType === 'lab' ? 2 * Math.PI * this.f0 : 0.0;

        // Gradient strength (rad/s per unit distance)
        // Set to create noticeable dephasing over typical TE times (e.g., 30 Hz max offset at x = 1)
        this.G0 = 2 * Math.PI * 30.0; // 30 Hz off-resonance at edge (x = 1)

        // RF pulse parameters
        this.rfDuration = 0.002; // 2 ms RF pulse duration
    }

    /**
     * Helper to compute Rodrigues' rotation of vector M around unit axis W by angle theta
     */
    rotateVector(M, W, theta) {
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        // Cross product: W x M
        const crossX = W[1] * M[2] - W[2] * M[1];
        const crossY = W[2] * M[0] - W[0] * M[2];
        const crossZ = W[0] * M[1] - W[1] * M[0];

        // Dot product: W . M
        const dot = W[0] * M[0] + W[1] * M[1] + W[2] * M[2];

        // Rodrigues Formula
        const rx = M[0] * cosT + crossX * sinT + W[0] * dot * (1 - cosT);
        const ry = M[1] * cosT + crossY * sinT + W[1] * dot * (1 - cosT);
        const rz = M[2] * cosT + crossZ * sinT + W[2] * dot * (1 - cosT);

        return [rx, ry, rz];
    }

    /**
     * Computes the RF excitation vector and Gradient field at time t (in seconds)
     * Returns { omegaX, omegaY, G }
     */
    getSequenceState(t) {
        let omegaX = 0.0;
        let omegaY = 0.0;
        let G = 0.0;

        let TR = (this.params.TR || 1000) / 1000.0; // to seconds
        let TE = (this.params.TE || 100) / 1000.0; // to seconds
        const flipAngleRad = ((this.params.flipAngle || 90.0) * Math.PI) / 180.0;

        // Prevent physical pulse overlapping
        const minTE = 3.0 * this.rfDuration; // 6 ms minimum to accommodate RF duration and dephasing
        if (this.scenario === 'GRE') {
            // For GRE, readout gradient must finish before next TR begins:
            // tEnd = TE + (TE/2 - rfDuration/2) < TR => 1.5 * TE - 0.5 * rfDuration < TR
            const maxTE = (TR + 0.5 * this.rfDuration) / 1.5 - 0.001; // leave 1ms margin
            TE = Math.max(minTE, Math.min(maxTE, TE));
        } else if (this.scenario === 'SE') {
            // For SE, 180 refocusing pulse is at TE/2. Echo peaks at TE.
            // Echo must peak before next TR begins.
            const maxTE = TR - 0.004; // leave 4ms margin
            TE = Math.max(minTE, Math.min(maxTE, TE));
        }

        const tInTR = t % TR;

        if (this.scenario === 'FID') {
            // RF pulse at t = 0 (duration rfDuration)
            if (tInTR >= 0 && tInTR < this.rfDuration) {
                omegaX = flipAngleRad / this.rfDuration;
            }
        } 
        else if (this.scenario === 'GRE') {
            // RF pulse at t = 0 (duration rfDuration)
            if (tInTR >= 0 && tInTR < this.rfDuration) {
                omegaX = flipAngleRad / this.rfDuration;
            }
            
            // Dephasing and Rephasing gradients
            // For GRE, we want the echo to occur at t = TE.
            // RF pulse ends at rfDuration.
            // Switch gradient sign at t_mid = TE / 2 + rfDuration / 2
            const tMid = TE / 2.0 + this.rfDuration / 2.0;
            // The readout gradient is symmetric around TE, ending at tEnd
            const tEnd = TE + (TE / 2.0 - this.rfDuration / 2.0);

            if (tInTR >= this.rfDuration && tInTR < tMid) {
                G = -this.G0;
            } else if (tInTR >= tMid && tInTR < tEnd) {
                G = this.G0;
            } else {
                G = 0.0; // Turn off gradient for the rest of the TR interval
            }
        } 
        else if (this.scenario === 'SE') {
            // Excitation 90-degree RF pulse (around +x axis)
            if (tInTR >= 0 && tInTR < this.rfDuration) {
                omegaX = (Math.PI / 2.0) / this.rfDuration;
            }
            // Refocusing 180-degree RF pulse (around +y axis)
            const tRefocusStart = TE / 2.0 - this.rfDuration / 2.0;
            const tRefocusEnd = TE / 2.0 + this.rfDuration / 2.0;
            if (tInTR >= tRefocusStart && tInTR < tRefocusEnd) {
                omegaY = Math.PI / this.rfDuration;
            }
        }

        return { omegaX, omegaY, G };
    }

    /**
     * Run the simulation for all isochromats
     */
    run() {
        const numSteps = Math.ceil(this.simulationTime / this.dt);
        const timeSteps = [];
        const signals = []; // Array of { t, Mxy, Mz }
        
        // Initialize spins' magnetizations to [0, 0, PD]
        const spins = this.isochromats.map(iso => ({
            id: iso.id,
            x: iso.x,
            T1: iso.T1 / 1000.0, // to seconds
            T2: iso.T2 / 1000.0, // to seconds
            PD: iso.PD,
            w: 2 * Math.PI * iso.w, // convert off-resonance from Hz to rad/s
            M: [0.0, 0.0, iso.PD]  // [Mx, My, Mz] at equilibrium
        }));

        // Track state history for animation: spinHistory[step_idx][spin_idx] = [Mx, My, Mz]
        const spinHistory = [];
        const sequenceRF = [];
        const sequenceGrad = [];

        for (let step = 0; step <= numSteps; step++) {
            const t = step * this.dt;
            timeSteps.push(t * 1000.0); // store in ms

            // Get RF and Gradient at current time
            const { omegaX, omegaY, G } = this.getSequenceState(t);
            
            // Record sequence envelope magnitude (rad/s) and Gradient G (rad/s/unit)
            const rfMag = Math.sqrt(omegaX * omegaX + omegaY * omegaY);
            sequenceRF.push(rfMag);
            sequenceGrad.push(G);

            // Record current spin states
            const currentStepStates = spins.map(spin => [...spin.M]);
            spinHistory.push(currentStepStates);

            // Calculate collective signal (normalized by total proton density)
            let totalMx = 0.0;
            let totalMy = 0.0;
            let totalMz = 0.0;
            let totalPD = 0.0;

            for (let i = 0; i < spins.length; i++) {
                totalMx += spins[i].M[0];
                totalMy += spins[i].M[1];
                totalMz += spins[i].M[2];
                totalPD += spins[i].PD;
            }

            const normMxy = totalPD > 0 ? Math.sqrt(totalMx * totalMx + totalMy * totalMy) / totalPD : 0.0;
            const normMz = totalPD > 0 ? totalMz / totalPD : 0.0;

            signals.push({
                t: t * 1000.0, // in ms
                Mxy: normMxy,
                Mz: normMz
            });

            // Update each spin using rotation + relaxation for the NEXT step
            if (step < numSteps) {
                for (let i = 0; i < spins.length; i++) {
                    const spin = spins[i];

                    // Combined precession frequency around Z:
                    // base Larmor frequency (if lab frame) + local off-resonance w + gradient frequency
                    const omegaZ = this.omega0 + spin.w + G * spin.x;

                    // Combined rotational velocity vector
                    const W = [omegaX, omegaY, omegaZ];
                    const wMag = Math.sqrt(W[0] * W[0] + W[1] * W[1] + W[2] * W[2]);

                    let M_rot = [...spin.M];
                    if (wMag > 1e-9) {
                        const unitW = [W[0] / wMag, W[1] / wMag, W[2] / wMag];
                        const theta = wMag * this.dt;
                        M_rot = this.rotateVector(spin.M, unitW, theta);
                    }

                    // Apply Relaxation
                    const expT1 = Math.exp(-this.dt / spin.T1);
                    const expT2 = Math.exp(-this.dt / spin.T2);

                    spin.M[0] = M_rot[0] * expT2;
                    spin.M[1] = M_rot[1] * expT2;
                    spin.M[2] = M_rot[2] * expT1 + spin.PD * (1.0 - expT1);
                }
            }
        }

        return {
            timeSteps,
            signals,
            spinHistory,
            sequenceRF,
            sequenceGrad
        };
    }
}

// Export for browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BlochSimulator;
} else {
    window.BlochSimulator = BlochSimulator;
}
