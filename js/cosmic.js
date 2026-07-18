// Cosmic Billiards — the part of the rules that shouldn't exist.
//
//   1. Complexity = deviation. History (the scar field) bends balls off the
//      deterministic Newtonian path predicted at shot time; accumulated
//      deviation is complexity. Enough of it: UNIVERSE DETECTED. A clean table
//      predicts perfectly, so it stays safe.
//   2. A Mandelbrot iterator z = z^2 + c, with c seeded by the shot.
//      If the sequence stays bounded, iterations accumulate and the
//      table begins to recurse. At containment limit: game over.
(function () {
  const K = CB.cosmic = {};

  const MANDEL_LIMIT = 500;
  const DEV_K = 0.011;         // complexity gained per (px of deviation · second)

  K.reset = function (levelCfg) {
    K.cfg = levelCfg;
    K.complexity = 0;
    K.threshold = levelCfg.universeThreshold;
    K.time = 0;

    K.zr = 0; K.zi = 0;        // Mandelbrot state
    K.cr = 0; K.ci = 0;
    K.iter = 0;
    K.nestDepth = 0;
    K.warned = {};             // iteration warnings already shown

    K.wells = [];              // active micro-universes
    K.events = [];             // consumed by game.js
    K.shotFlags = {};
    K.doomed = false;          // a loss event has fired; stop evaluating
  };

  K.risk = function () { return Math.min(1.2, K.complexity / K.threshold); };

  function emit(type, data) { K.events.push(Object.assign({ type }, data || {})); }

  // ---- Shots -------------------------------------------------------------
  // Each cue strike seeds c near the Mandelbrot boundary; angle and power
  // decide whether the shot's mathematics converges or escapes.
  K.onShot = function (angle, power01) {
    K.cr = -0.78 + 0.62 * power01 * Math.cos(angle);
    K.ci = 0.42 * power01 * Math.sin(angle) + 0.13;
    K.zr = 0; K.zi = 0;
    K.shotFlags = {};
  };

  // ---- Collisions ----------------------------------------------------------
  K.onCollision = function (a, b, impact, x, y) {
    if (K.doomed) return;

    // Collisions no longer create complexity directly — complexity now comes
    // only from history bending balls off their predicted path (deviationStrain).
    // Collisions still iterate the Mandelbrot sequence (Rule 2).
    stepMandel(x, y);

    // Mid-band foul: somewhere in that cluster, something woke up.
    if (!K.shotFlags.sentience && K.risk() > 0.62 && K.risk() < 1 && Math.random() < 0.4) {
      K.shotFlags.sentience = true;
      emit('foul', { msg: 'FOUL: Created sentient life. It draws one breath and says, “' + CB.util.hamlet() + '” −2 points', pts: -2 });
    }
  };

  // Rule 1 — complexity = how far history forces balls off their predicted
  // Newtonian path. `dev` is summed clamped deviation (px) over the live balls.
  K.deviationStrain = function (dt, dev) {
    if (K.doomed) return;
    K.complexity += DEV_K * dev * dt * (K.cfg.complexityMult || 1);
    if (K.complexity > K.threshold) {
      K.doomed = true;
      emit('universe', { x: 640, y: 360 });
    }
  };

  function stepMandel(x, y) {
    const mult = K.cfg.mandelMult || 0;
    if (mult <= 0) return;
    for (let i = 0; i < 8; i++) {
      const zr2 = K.zr * K.zr - K.zi * K.zi + K.cr;
      K.zi = 2 * K.zr * K.zi + K.ci;
      K.zr = zr2;
      if (K.zr * K.zr + K.zi * K.zi > 4) {
        // Escaped: the mathematics diverges harmlessly.
        K.zr = 0; K.zi = 0;
        K.iter = Math.max(0, K.iter - 6);
        return;
      }
      K.iter += mult;
    }

    K.nestDepth = K.iter > 213 ? 3 : K.iter > 87 ? 2 : K.iter > 42 ? 1 : 0;

    for (const th of [42, 87, 213]) {
      if (K.iter >= th && !K.warned[th]) {
        K.warned[th] = true;
        emit('warn', {
          msg: 'Iteration ' + Math.floor(K.iter) + '… ' +
            (th === 42 ? 'you’ve wandered into a recursive attractor, goof. Please stop touching the mathematics.'
             : th === 87 ? 'we asked nicely. Please avoid creating additional mathematics. Have you considered a walk?'
             : 'geometry is self-hosting now. Final advisory: it is genuinely not too late to go outside.')
        });
      }
    }

    if (K.iter >= MANDEL_LIMIT && !K.doomed) {
      K.doomed = true;
      emit('mandelbrot', { x, y });
    }
  }

  // ---- Micro-universes (sanctioned Big Bangs) ------------------------------
  K.placeWell = function (x, y) {
    K.wells.push({ x, y, life: 0, maxLife: 7, strength: 2.6e6, reach: 300 });
    emit('ok', { msg: 'Micro-universe deployed under permit 7741-B. Look at you, playing god. A little guy. A goof god.' });
  };

  // ---- Frame update --------------------------------------------------------
  K.update = function (dt, balls) {
    K.time += dt;

    // Complexity dissipates (half-life ~2.6 s) — deviation must be sustained to
    // build toward a universe; brief bends relax back down.
    K.complexity *= Math.exp(-0.27 * dt);
    if (K.complexity < 0.01) K.complexity = 0;

    // Recursion slowly relaxes while nothing is colliding.
    K.iter = Math.max(0, K.iter - 2.2 * dt);
    if (K.iter < 42) K.warned[42] = false;
    if (K.iter < 87) K.warned[87] = false;
    if (K.iter < 213) K.warned[213] = false;
    K.nestDepth = K.iter > 213 ? 3 : K.iter > 87 ? 2 : K.iter > 42 ? 1 : 0;

    // Micro-universe gravity. No core damping, so balls can enter stable orbits
    // instead of being dragged in — and orbits, being predicted motion, add no
    // complexity.
    for (let i = K.wells.length - 1; i >= 0; i--) {
      const w = K.wells[i];
      w.life += dt;
      if (w.life >= w.maxLife) {
        K.wells.splice(i, 1);
        emit('ok', { msg: 'Your little universe reached heat death on schedule. Everyone in it died wishing you’d gone outside. Permit closed.' });
        continue;
      }
      for (const b of balls) {
        if (b.potted) continue;
        const dx = w.x - b.x, dy = w.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > w.reach * w.reach) continue;
        const d = Math.sqrt(d2) || 1;
        const acc = Math.min(1400, w.strength / Math.max(d2, 1600));
        b.vx += (dx / d) * acc * dt;
        b.vy += (dy / d) * acc * dt;
      }
    }
  };

  // ---- Bookkeeping from game ----------------------------------------------
  K.onPot = function () {
    // Potting a particle vents accumulated mathematics through the pocket.
    K.iter = Math.max(0, K.iter - 55);
    K.complexity *= 0.85;
  };

  K.onSettle = function () {
    K.iter = Math.max(0, K.iter - 18);
  };
})();
