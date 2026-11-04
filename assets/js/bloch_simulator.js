/**
 * assets/js/bloch_simulator.js
 * Core Bloch Equation Simulation Engine & Visualizer for MRI
 * Works in both Node.js (for unit testing) and Browser (for interactive canvas rendering).
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BlochSimulator = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // Vector helpers
  function rotateX(v, theta) {
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    return [
      v[0],
      v[1] * cosT - v[2] * sinT,
      v[1] * sinT + v[2] * cosT
    ];
  }

  function rotateY(v, theta) {
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    return [
      v[0] * cosT + v[2] * sinT,
      v[1],
      -v[0] * sinT + v[2] * cosT
    ];
  }

  function rotateZ(v, theta) {
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    return [
      v[0] * cosT - v[1] * sinT,
      v[0] * sinT + v[1] * cosT,
      v[2]
    ];
  }

  /**
   * Apply RF excitation to magnetization vector M
   * Under MRI convention (positive gamma), RF pulse along x tips +Mz towards +My.
   * @param {Array<number>} M - [Mx, My, Mz]
   * @param {number} flipAngleDeg - in degrees (e.g. 90 or 180)
   * @param {number} phaseRad - RF phase angle in radians (default 0, along x)
   */
  function applyRFPulse(M, flipAngleDeg, phaseRad = 0) {
    const alpha = (flipAngleDeg * Math.PI) / 180;
    // Rotate to align RF axis with x
    let v = rotateZ(M, -phaseRad);
    // Apply nutation about RF axis (-alpha so +Mz rotates towards +My)
    v = rotateX(v, -alpha);
    // Rotate back
    v = rotateZ(v, phaseRad);
    return v;
  }

  /**
   * Free precession and relaxation over time dt
   * @param {Array<number>} M - [Mx, My, Mz]
   * @param {number} dt - time step in seconds
   * @param {number} T1 - longitudinal relaxation time in seconds
   * @param {number} T2 - transverse relaxation time in seconds
   * @param {number} omega - off-resonance frequency in rad/s
   * @param {number} M0 - equilibrium thermal magnetization (default 1.0)
   */
  function relax(M, dt, T1, T2, omega = 0, M0 = 1.0) {
    const e1 = Math.exp(-dt / T1);
    const e2 = Math.exp(-dt / T2);
    const theta = omega * dt;

    // Transverse precession
    const rot = rotateZ([M[0], M[1], 0], theta);
    const Mx = rot[0] * e2;
    const My = rot[1] * e2;

    // Longitudinal recovery
    const Mz = M0 - (M0 - M[2]) * e1;

    return [Mx, My, Mz];
  }

  /**
   * Simulate MRI Sequences (FID, Spin Echo, Gradient Echo)
   */
  function simulateSequence(seqType, options = {}) {
    const T1 = (options.T1 || 800) / 1000; // ms to s
    const T2 = (options.T2 || 100) / 1000; // ms to s
    const TE = (options.TE || 40) / 1000;
    const TR = (options.TR || 200) / 1000;
    const flipAngle = options.flipAngle || (seqType === 'SE' ? 90 : (seqType === 'GRE' ? 30 : 90));
    const dt = 0.001; // 1 ms time step
    const steps = Math.floor(TR / dt);

    // Multiple isochromats to simulate dephasing & rephasing
    const numIso = 15;
    const maxOffsetHz = 25; // off-resonance spread
    const isochromats = [];
    for (let i = 0; i < numIso; i++) {
      const frac = numIso === 1 ? 0 : (i / (numIso - 1)) * 2 - 1; // -1 to +1
      isochromats.push({
        M: [0, 0, 1.0],
        omega: 2 * Math.PI * frac * maxOffsetHz
      });
    }

    // Step 1: Initial excitation pulse
    isochromats.forEach(iso => {
      iso.M = applyRFPulse(iso.M, flipAngle, 0);
    });

    const trajectory = [];
    const teStep = Math.floor(TE / dt);
    const halfTeStep = Math.floor(teStep / 2);

    for (let step = 0; step < steps; step++) {
      const t = step * dt;

      // Handle 180 refocusing pulse for Spin Echo
      if (seqType === 'SE' && step === halfTeStep) {
        isochromats.forEach(iso => {
          iso.M = applyRFPulse(iso.M, 180, Math.PI / 2); // 180 degree pulse along y
        });
      }

      // Precession & relaxation for all isochromats
      let sumMx = 0;
      let sumMy = 0;
      let sumMz = 0;

      isochromats.forEach(iso => {
        iso.M = relax(iso.M, dt, T1, T2, iso.omega, 1.0);
        sumMx += iso.M[0];
        sumMy += iso.M[1];
        sumMz += iso.M[2];
      });

      const avgM = [sumMx / numIso, sumMy / numIso, sumMz / numIso];
      const Mxy = Math.sqrt(avgM[0] * avgM[0] + avgM[1] * avgM[1]);

      trajectory.push({
        timeMs: Math.round(t * 1000),
        M: avgM,
        Mxy,
        Mz: avgM[2]
      });
    }

    return {
      seqType,
      flipAngle,
      TE: Math.round(TE * 1000),
      TR: Math.round(TR * 1000),
      trajectory
    };
  }

  return {
    applyRFPulse,
    relax,
    simulateSequence,
    rotateX,
    rotateY,
    rotateZ
  };
}));
