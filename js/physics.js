// Cosmic Billiards — table geometry and rigid ball physics.
(function () {
  const PH = CB.physics = {};

  // Playfield rectangle (inside the cushions), in world pixels.
  const TABLE = PH.TABLE = { x: 140, y: 130, w: 1000, h: 480 };
  PH.BALL_R = 14;
  PH.POCKET_R = 26;
  PH.REST_SPEED = 7;          // below this a ball is considered at rest
  PH.HEAD_SPOT = { x: TABLE.x + TABLE.w * 0.25, y: TABLE.y + TABLE.h / 2 };

  PH.pockets = [
    { x: TABLE.x,               y: TABLE.y },
    { x: TABLE.x + TABLE.w / 2, y: TABLE.y - 6 },
    { x: TABLE.x + TABLE.w,     y: TABLE.y },
    { x: TABLE.x,               y: TABLE.y + TABLE.h },
    { x: TABLE.x + TABLE.w / 2, y: TABLE.y + TABLE.h + 6 },
    { x: TABLE.x + TABLE.w,     y: TABLE.y + TABLE.h }
  ];

  let nextId = 1;
  PH.makeBall = function (x, y, opts) {
    opts = opts || {};
    return {
      id: nextId++,
      x, y, vx: 0, vy: 0,
      r: PH.BALL_R,
      cue: !!opts.cue,
      inert: !!opts.inert,           // declines to participate in causality
      mass: opts.inert ? 40 : 1,     // impacts barely move it; gravity still does
      color: opts.color || '#e8e8e8',
      glow: opts.glow || '#9adcff',
      label: opts.label || '',
      potted: false,
      potAnim: 0,                    // 0..1 shrink into pocket
      potX: 0, potY: 0
    };
  };

  PH.ballsAtRest = function (balls) {
    for (const b of balls) {
      if (b.potted) continue;
      if (Math.hypot(b.vx, b.vy) > PH.REST_SPEED) return false;
    }
    return true;
  };

  // Advance the world. Calls hooks: onCollision(a, b, speed, x, y),
  // onCushion(ball, speed), onPot(ball, pocket).
  PH.step = function (balls, dt, hooks) {
    const SUB = 4;
    const h = dt / SUB;
    for (let s = 0; s < SUB; s++) {
      substep(balls, h, hooks);
    }
    // Pot animations run outside the substep loop.
    for (const b of balls) {
      if (b.potted && b.potAnim < 1) b.potAnim = Math.min(1, b.potAnim + dt * 3.5);
    }
  };

  function substep(balls, h, hooks) {
    const friction = Math.exp(-0.88 * h);

    for (const b of balls) {
      if (b.potted) continue;
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.vx *= friction;
      b.vy *= friction;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp < PH.REST_SPEED * 0.6) { b.vx = 0; b.vy = 0; }

      // Pockets — checked before cushions so balls can fall in at corners.
      for (const p of PH.pockets) {
        if (CB.util.dist(b.x, b.y, p.x, p.y) < PH.POCKET_R * 0.92) {
          b.potted = true;
          b.potX = p.x; b.potY = p.y;
          b.vx = 0; b.vy = 0;
          if (hooks.onPot) hooks.onPot(b, p);
          break;
        }
      }
      if (b.potted) continue;

      // Cushions.
      const T = TABLE, e = 0.9;
      let hit = 0;
      if (b.x - b.r < T.x)          { b.x = T.x + b.r; if (b.vx < 0) { hit = -b.vx; b.vx *= -e; } }
      else if (b.x + b.r > T.x + T.w) { b.x = T.x + T.w - b.r; if (b.vx > 0) { hit = b.vx; b.vx *= -e; } }
      if (b.y - b.r < T.y)          { b.y = T.y + b.r; if (b.vy < 0) { hit = Math.max(hit, -b.vy); b.vy *= -e; } }
      else if (b.y + b.r > T.y + T.h) { b.y = T.y + T.h - b.r; if (b.vy > 0) { hit = Math.max(hit, b.vy); b.vy *= -e; } }
      if (hit > 30 && hooks.onCushion) hooks.onCushion(b, hit);
    }

    // Ball-ball collisions.
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i];
      if (a.potted) continue;
      for (let j = i + 1; j < balls.length; j++) {
        const b = balls[j];
        if (b.potted) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const minD = a.r + b.r;
        if (d >= minD || d === 0) continue;

        const nx = dx / d, ny = dy / d;
        // Positional correction, split by inverse mass.
        const invA = 1 / a.mass, invB = 1 / b.mass;
        const invSum = invA + invB;
        const overlap = minD - d;
        a.x -= nx * overlap * (invA / invSum);
        a.y -= ny * overlap * (invA / invSum);
        b.x += nx * overlap * (invB / invSum);
        b.y += ny * overlap * (invB / invSum);

        const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
        const velN = rvx * nx + rvy * ny;
        if (velN > 0) continue; // separating

        const rest = 0.96;
        const jImp = -(1 + rest) * velN / invSum;
        a.vx -= jImp * nx * invA; a.vy -= jImp * ny * invA;
        b.vx += jImp * nx * invB; b.vy += jImp * ny * invB;

        const impact = -velN;
        if (impact > 12 && hooks.onCollision) {
          hooks.onCollision(a, b, impact, (a.x + b.x) / 2, (a.y + b.y) / 2);
        }
      }
    }
  }

  // Forward-simulate a hypothetical shot without touching real balls or cosmology.
  // Returns the cue ball's path (array of {x,y}) and the settled clone set.
  // Used for the ghost-futures uncertainty cloud shown while aiming.
  PH.simulate = function (balls, cueId, vx, vy, steps, dt, wells, scarFn, fieldFn) {
    const clones = [];
    for (const b of balls) {
      if (b.potted) continue;
      clones.push({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, r: b.r, mass: b.mass,
                    potted: false, cue: b.cue, id: b.id, potX: 0, potY: 0 });
    }
    const cue = clones.find(c => c.id === cueId);
    if (!cue) return { path: [], clones };
    cue.vx = vx; cue.vy = vy;
    const path = [{ x: cue.x, y: cue.y }];
    const noHooks = {};
    for (let s = 0; s < steps; s++) {
      // Approximate active gravity wells so ghosts curve like the real shot will.
      if (wells) for (const w of wells) {
        for (const b of clones) {
          if (b.potted) continue;
          const dx = w.x - b.x, dy = w.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > w.reach * w.reach) continue;
          const d = Math.sqrt(d2) || 1;
          const acc = Math.min(1400, w.strength / Math.max(d2, 1600));
          b.vx += (dx / d) * acc * dt; b.vy += (dy / d) * acc * dt;
        }
      }
      // Spacetime scarring curves the ghosts exactly as it will the real shot,
      // and probability gravity pulls them toward the densest futures.
      if (scarFn || fieldFn) {
        for (const b of clones) {
          if (b.potted) continue;
          if (Math.hypot(b.vx, b.vy) < PH.REST_SPEED) continue;
          if (scarFn)  { const f = scarFn(b.x, b.y);  b.vx += f.fx * dt; b.vy += f.fy * dt; }
          if (fieldFn) { const g = fieldFn(b.x, b.y); b.vx += g.fx * dt; b.vy += g.fy * dt; }
        }
      }
      PH.step(clones, dt, noHooks);
      if (cue.potted) { path.push({ x: cue.potX, y: cue.potY, potted: true }); break; }
      path.push({ x: cue.x, y: cue.y });
      if (PH.ballsAtRest(clones)) break;
    }
    return { path, clones };
  };

  // First cushion intersection of a ray from (x, y) along (dx, dy) — for the aim guide.
  PH.rayToCushion = function (x, y, dx, dy) {
    const T = TABLE, r = PH.BALL_R;
    let best = Infinity;
    if (dx < 0) best = Math.min(best, (T.x + r - x) / dx);
    if (dx > 0) best = Math.min(best, (T.x + T.w - r - x) / dx);
    if (dy < 0) best = Math.min(best, (T.y + r - y) / dy);
    if (dy > 0) best = Math.min(best, (T.y + T.h - r - y) / dy);
    if (!isFinite(best) || best < 0) best = 0;
    return { x: x + dx * best, y: y + dy * best, t: best };
  };

  // First ball hit by a ray (ghost-ball position), or null.
  PH.rayToBall = function (x, y, dx, dy, balls, ignore) {
    let best = null, bestT = Infinity;
    for (const b of balls) {
      if (b === ignore || b.potted) continue;
      const R = b.r + PH.BALL_R;
      const ox = b.x - x, oy = b.y - y;
      const proj = ox * dx + oy * dy;
      if (proj <= 0) continue;
      const perp2 = ox * ox + oy * oy - proj * proj;
      if (perp2 > R * R) continue;
      const t = proj - Math.sqrt(R * R - perp2);
      if (t < bestT) { bestT = t; best = b; }
    }
    if (!best) return null;
    return { ball: best, x: x + dx * bestT, y: y + dy * bestT, t: bestT };
  };
})();
