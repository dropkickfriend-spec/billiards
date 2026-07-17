// Demon Billiards — Rule 3: the table remembers.
//
// Every shot's trajectory is stored permanently. The accumulated history is
// treated as information. The game estimates how complex the memory has become:
// how poorly it compresses, how self-referential it is, how well old shots
// predict new ones. When the stored trajectories effectively become an entity:
//
//   GAME OVER — Demon Detected. Emergent Information Structure Exceeds Safe Limits.
(function () {
  const M = CB.memory = {};

  const CELL = 22;               // spatial quantization for the occupancy grid
  const GX = Math.ceil(1280 / CELL), GY = Math.ceil(720 / CELL);

  M.reset = function (levelCfg) {
    M.cfg = levelCfg;
    M.shots = [];                // { pts:[{x,y}], cells:Set, len }
    M.grid = new Int16Array(GX * GY); // visit counts per cell (compressibility proxy)
    M.uniqueCells = 0;
    M.ontology = 0;              // emergent-information load; demon at threshold
    M.threshold = levelCfg.demonThreshold || Infinity;
    M.lastSelfSim = 0;          // Jaccard similarity of the most recent shot
    M.events = [];
    M.doomed = false;
  };

  function emit(type, data) { M.events.push(Object.assign({ type }, data || {})); }

  function cellIndex(x, y) {
    let cx = (x / CELL) | 0, cy = (y / CELL) | 0;
    if (cx < 0) cx = 0; else if (cx >= GX) cx = GX - 1;
    if (cy < 0) cy = 0; else if (cy >= GY) cy = GY - 1;
    return cy * GX + cx;
  }

  // Commit one completed shot trajectory to permanent memory and re-estimate
  // the information content of the whole history.
  M.record = function (track) {
    if (!track || track.length < 2 || M.doomed) return;

    // Downsample to a compact polyline and build this shot's cell signature.
    const pts = [];
    const cells = new Set();
    for (let i = 0; i < track.length; i += 2) {
      const p = track[i];
      pts.push({ x: p.x, y: p.y });
      cells.add(cellIndex(p.x, p.y));
    }

    // Self-similarity: does this shot retrace history? (self-reference / predictive)
    let bestJ = 0;
    for (const s of M.shots) {
      let inter = 0;
      for (const c of cells) if (s.cells.has(c)) inter++;
      const uni = cells.size + s.cells.size - inter;
      const j = uni ? inter / uni : 0;
      if (j > bestJ) bestJ = j;
    }
    M.lastSelfSim = bestJ;

    // Compressibility proxy: how many NEW cells vs revisits of hot cells.
    let fresh = 0, revisitLoad = 0;
    for (const c of cells) {
      const v = M.grid[c];
      if (v === 0) { fresh++; M.uniqueCells++; }
      else revisitLoad += Math.min(v, 8); // revisiting hot ground = self-reference
      if (M.grid[c] < 30000) M.grid[c]++;
    }

    M.shots.push({ pts, cells, len: track.length });

    // Ontology grows from three pressures the pitch names directly:
    //   too hard to compress  — high revisit load on an already-dense grid
    //   too self-referential  — high Jaccard overlap with a prior shot
    //   too predictive        — many shots covering overlapping ground
    const density = M.uniqueCells / (GX * GY);       // 0..1 table coverage
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
      // Detonate at the hottest region of memory — where the entity woke up.
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

  // Densest cell of the grid, in world coordinates.
  M.hotspot = function () {
    let best = 0, bi = 0;
    for (let i = 0; i < M.grid.length; i++) if (M.grid[i] > best) { best = M.grid[i]; bi = i; }
    const cx = bi % GX, cy = (bi / GX) | 0;
    return { x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2, heat: best };
  };

  // Draw accumulated history as faint residue on the felt (the growing memory).
  M.draw = function (ctx) {
    const T = CB.physics.TABLE;
    ctx.save();
    ctx.beginPath();
    ctx.rect(T.x, T.y, T.w, T.h);
    ctx.clip();
    ctx.lineWidth = 1;
    const n = M.shots.length;
    for (let i = 0; i < n; i++) {
      const s = M.shots[i];
      // Older memories are fainter; recent ones glow slightly.
      const age = (i + 1) / n;
      ctx.strokeStyle = 'rgba(150, 210, 255, ' + (0.04 + 0.06 * age) + ')';
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
