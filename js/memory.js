// Demon Billiards — Rule 3: the table remembers. Permanently. Across reloads.
//
// Every shot's trajectory is stored. The accumulated history is treated as
// information, and the game estimates how complex the memory has become — how
// poorly it compresses, how self-referential it is, how well old shots predict
// new ones. When the stored trajectories effectively become an entity:
//
//   GAME OVER — Demon Detected. Emergent Information Structure Exceeds Safe Limits.
//
// The history is not passive. It calcifies into SCAR TISSUE on the felt: a
// deterministic force field that deflects balls away from ground you've already
// worn down. The more you play, the more the table fights you — until you clear
// the timeline. The scar grid persists in localStorage, so the table genuinely
// remembers every session you've ever played.
(function () {
  const M = CB.memory = {};

  const CELL = 22;               // spatial quantization for the occupancy grid
  const GX = Math.ceil(1280 / CELL), GY = Math.ceil(720 / CELL);
  const STORE_KEY = 'demon_billiards_scars_v1';
  const ZERO = { fx: 0, fy: 0 };

  // ---- Persistence ---------------------------------------------------------
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (!o || !o.grid || o.grid.length !== GX * GY) return null;
      return o;
    } catch (e) { return null; }
  }
  function save() {
    try {
      // Int16Array isn't JSON-friendly; store as a plain array.
      localStorage.setItem(STORE_KEY, JSON.stringify({
        grid: Array.from(M.grid), lifetime: M.lifetime, sessions: M.sessions
      }));
    } catch (e) { /* quota or private mode — history simply won't outlive the tab */ }
  }

  M.lifetimeShots = function () { return M.lifetime || 0; };

  M.clearPersisted = function () {
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    M.grid = new Int16Array(GX * GY);
    M.lifetime = 0; M.sessions = 0;
  };

  // ---- Lifecycle -----------------------------------------------------------
  M.reset = function (levelCfg) {
    M.cfg = levelCfg;
    // Persistent scar grid + lifetime counters survive across levels & reloads.
    const stored = load();
    M.grid = new Int16Array(GX * GY);
    if (stored) { M.grid.set(stored.grid); M.lifetime = stored.lifetime || 0; M.sessions = stored.sessions || 0; }
    else { M.lifetime = 0; M.sessions = 0; }

    // Per-level state for the demon estimate stays fresh so sectors are winnable.
    M.levelGrid = new Int16Array(GX * GY);
    M.levelUnique = 0;
    M.shots = [];                // { pts:[{x,y}], cells:Set }
    M.ontology = 0;
    M.threshold = levelCfg.demonThreshold || Infinity;
    M.lastSelfSim = 0;
    M.scarStrength = (levelCfg.scarMult || 0) * 58;
    M.events = [];
    M.doomed = false;
    M._nagged = false;
    M._scarNoted = false;
  };

  // Mark the start of a new play session exactly once per page load.
  M.beginSession = function () {
    if (M._sessionCounted) return;
    M._sessionCounted = true;
    M.sessions = (M.sessions || 0) + 1;
    save();
  };

  function emit(type, data) { M.events.push(Object.assign({ type }, data || {})); }

  function cellIndex(x, y) {
    let cx = (x / CELL) | 0, cy = (y / CELL) | 0;
    if (cx < 0) cx = 0; else if (cx >= GX) cx = GX - 1;
    if (cy < 0) cy = 0; else if (cy >= GY) cy = GY - 1;
    return cy * GX + cx;
  }

  // ---- Recording -----------------------------------------------------------
  // Commit one completed shot trajectory and re-estimate the information content.
  M.record = function (track) {
    if (!track || track.length < 2 || M.doomed) return;

    const pts = [];
    const cells = new Set();
    for (let i = 0; i < track.length; i += 2) {
      const p = track[i];
      pts.push({ x: p.x, y: p.y });
      cells.add(cellIndex(p.x, p.y));
    }

    // Self-similarity vs this level's shots (self-reference / predictiveness).
    let bestJ = 0;
    for (const s of M.shots) {
      let inter = 0;
      for (const c of cells) if (s.cells.has(c)) inter++;
      const uni = cells.size + s.cells.size - inter;
      const j = uni ? inter / uni : 0;
      if (j > bestJ) bestJ = j;
    }
    M.lastSelfSim = bestJ;

    // Compressibility proxy from the per-level grid (fresh each sector).
    let revisitLoad = 0;
    for (const c of cells) {
      const v = M.levelGrid[c];
      if (v === 0) M.levelUnique++;
      else revisitLoad += Math.min(v, 8);
      if (M.levelGrid[c] < 30000) M.levelGrid[c]++;
      if (M.grid[c] < 30000) M.grid[c]++;   // persistent scar tissue accretes forever
    }
    M.shots.push({ pts, cells });
    M.lifetime = (M.lifetime || 0) + 1;
    save();

    // Ontology grows from the three pressures the pitch names directly.
    const density = M.levelUnique / (GX * GY);
    const compressPressure = revisitLoad * 0.05 * (0.5 + density);
    const selfRefPressure = bestJ > 0.28 ? (bestJ - 0.28) * 14 : 0;
    const predictPressure = M.shots.length > 3 ? density * M.shots.length * 0.35 : 0;

    const gain = (compressPressure + selfRefPressure + predictPressure) * (M.cfg.memoryMult || 1);
    M.ontology += gain;

    if (selfRefPressure > 0) {
      emit('warn', { msg: 'Shot ' + M.shots.length + ' is ' + Math.round(bestJ * 100)
        + '% the same as one you already took. You’re repeating yourself, goof. The table noticed. It’s writing this down.' });
    }

    if (M.ontology >= M.threshold && !M.doomed) {
      M.doomed = true;
      const spot = M.hotspot();
      emit('demon', { x: spot.x, y: spot.y });
    } else if (M.threshold < Infinity && M.ontology > M.threshold * 0.7 && !M._nagged) {
      M._nagged = true;
      emit('warn', { msg: 'Your shot history is getting suspiciously self-aware. This is usually the part where we suggest you go outside. So: go outside, goof.' });
    }
  };

  M.risk = function () {
    return M.threshold === Infinity ? 0 : Math.min(1.15, M.ontology / M.threshold);
  };

  M.hotspot = function () {
    let best = -1, bi = 0;
    for (let i = 0; i < M.grid.length; i++) if (M.grid[i] > best) { best = M.grid[i]; bi = i; }
    const cx = bi % GX, cy = (bi / GX) | 0;
    return { x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2, heat: best };
  };

  // ---- Spacetime scarring --------------------------------------------------
  // A deterministic repulsion down the gradient of history density: balls are
  // pushed out of ground previous shots have worn thin. Deterministic (no RNG)
  // so the ghost-futures cloud can simulate it honestly.
  M.scarForce = function (x, y) {
    const s = M.scarStrength;
    if (!s) return ZERO;
    const cx = (x / CELL) | 0, cy = (y / CELL) | 0;
    if (cx < 1 || cy < 1 || cx >= GX - 1 || cy >= GY - 1) return ZERO;
    const g = M.grid, idx = cy * GX + cx;
    const here = g[idx];
    if (here <= 0 && g[idx - 1] <= 0 && g[idx + 1] <= 0 && g[idx - GX] <= 0 && g[idx + GX] <= 0) return ZERO;
    const gx = g[idx + 1] - g[idx - 1];
    const gy = g[idx + GX] - g[idx - GX];
    const mag = Math.hypot(gx, gy);
    if (mag < 0.001) return ZERO;
    const f = s * (2 + Math.min(here, 12));   // fiercer inside dense scar tissue
    return { fx: -(gx / mag) * f, fy: -(gy / mag) * f };
  };

  // Apply scarring to moving balls only, so it curves live shots without ever
  // waking a ball that has come to rest (which would break settle detection).
  M.applyScars = function (dt, balls) {
    if (!M.scarStrength) return;
    const rest = CB.physics.REST_SPEED;
    let maxKick = 0;
    for (const b of balls) {
      if (b.potted) continue;
      if (Math.hypot(b.vx, b.vy) < rest) continue;
      const f = M.scarForce(b.x, b.y);
      b.vx += f.fx * dt; b.vy += f.fy * dt;
      const k = Math.hypot(f.fx, f.fy);
      if (k > maxKick) maxKick = k;
    }
    if (!M._scarNoted && maxKick > s_threshold()) {
      M._scarNoted = true;
      emit('warn', { msg: 'Your shot just glanced off the scar tissue of an earlier shot. The past isn’t done with you, goof.' });
    }
  };
  function s_threshold() { return 260; }

  // ---- Drawing -------------------------------------------------------------
  // Persistent scar tissue as a faint heat field, plus this level's crisp lines.
  M.draw = function (ctx) {
    const T = CB.physics.TABLE;
    ctx.save();
    ctx.beginPath();
    ctx.rect(T.x, T.y, T.w, T.h);
    ctx.clip();

    // Scar tissue (persists across sessions): worn ground glows faintly.
    const g = M.grid;
    for (let cy = 0; cy < GY; cy++) {
      const yy = cy * CELL;
      if (yy + CELL < T.y || yy > T.y + T.h) continue;
      for (let cx = 0; cx < GX; cx++) {
        const c = g[cy * GX + cx];
        if (c <= 0) continue;
        const a = Math.min(c, 10) / 10 * 0.11;
        ctx.fillStyle = 'rgba(150, 205, 255, ' + a + ')';
        ctx.fillRect(cx * CELL, yy, CELL, CELL);
      }
    }

    // This level's trajectories, crisper on top.
    ctx.lineWidth = 1;
    const n = M.shots.length;
    for (let i = 0; i < n; i++) {
      const s = M.shots[i];
      const age = (i + 1) / n;
      ctx.strokeStyle = 'rgba(180, 225, 255, ' + (0.05 + 0.08 * age) + ')';
      ctx.beginPath();
      for (let k = 0; k < s.pts.length; k++) {
        const p = s.pts[k];
        k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  };
})();
