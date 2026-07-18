// Cosmic Billiards — game states, input, rendering, and the deadpan referee.
(function () {
  const PH = CB.physics, K = CB.cosmic, M = CB.memory, U = CB.util, cam = CB.camera;
  const T = PH.TABLE;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // Offscreen buffers for the recursion effect: the scene is rendered to
  // `world`, then re-drawn into itself (from `snap`) at shrinking scales.
  const world = document.createElement('canvas');
  world.width = 1280; world.height = 720;
  const wctx = world.getContext('2d');
  const snap = document.createElement('canvas');
  snap.width = 1280; snap.height = 720;
  const sctx = snap.getContext('2d');
  // Tiny buffer for the probability-density field, scaled up smoothly into a glow.
  const dens = document.createElement('canvas');
  const densCtx = dens.getContext('2d');

  const $ = id => document.getElementById(id);
  const show = id => $(id).classList.remove('hidden');
  const hide = id => $(id).classList.add('hidden');

  // ---- Game state ----------------------------------------------------------
  const G = CB.game = {
    state: 'title',        // title | briefing | aim | shot | placing | cine_universe | cine_mandel | clear | over | victory
    level: 0,
    balls: [],
    score: 0,
    permits: 0,
    time: 0,
    stats: null,
    aim: null,             // { mx, my } while dragging
    cine: null,            // cinematic bookkeeping
    scratched: false,
    pottedThisShot: 0,
    nestAnchor: { x: T.x + T.w / 2, y: T.y + T.h / 2 },
    nestShown: 0,          // smoothed nesting depth for rendering
    ghosts: null,          // cached ghost-futures cloud for the current aim
    ghostKey: '',          // aim signature the cloud was computed for
    track: null,           // cue path being recorded during the live shot
    collapse: null,        // wave-collapse animation state after release
    slowmo: 0              // seconds of post-collapse slow-motion remaining
  };

  function newStats() {
    return { shots: 0, potted: 0, fouls: 0, universes: 0, mandelbrots: 0 };
  }

  // ---- Referee ticker -------------------------------------------------------
  function say(msg, cls, holdMs) {
    const el = document.createElement('div');
    el.className = 'tick-msg' + (cls ? ' ' + cls : '');
    el.textContent = msg;
    const ticker = $('ticker');
    ticker.appendChild(el);
    while (ticker.children.length > 3) ticker.removeChild(ticker.firstChild);
    setTimeout(() => el.classList.add('fading'), holdMs || 3200);
    setTimeout(() => el.remove(), (holdMs || 3200) + 700);
  }

  const POT_LINES = [
    'Oh. You potted one. We were all very worried, goof.',
    'Pocketed. Don’t let it go to your head, you clearly can’t handle heads.',
    'Contained. Was that skill, or did reality just feel sorry for you?',
    'One down. Have you considered that this could all be a nice walk instead?',
    'Nice. Now do it again without breathing so loudly, champ.',
    'Filed under “resolved.” Unlike you, who remain unresolved.'
  ];

  // ---- Level lifecycle --------------------------------------------------------
  function loadLevel(i) {
    G.level = i;
    const L = CB.LEVELS[i];
    G.balls = [];
    L.setup(G.balls);
    G.permits = L.permits;
    G.stats = G.stats || newStats();
    G.pottedThisShot = 0;
    G.scratched = false;
    G.nestShown = 0;
    G.ghosts = null; G.ghostKey = ''; G.track = null;
    K.reset(L);
    M.reset(L);
    CB.particles.clear();
    cam.reset();
    updateHud();
  }

  function showBriefing(i) {
    G.state = 'briefing';
    const L = CB.LEVELS[i];
    $('brief-title').textContent = L.name;
    $('brief-body').innerHTML = L.briefing.map(p => '<p>' + p + '</p>').join('');
    $('brief-permit-hint').classList.toggle('hidden', L.permits <= 0);
    hideAllScreens();
    show('screen-briefing');
  }

  function startLevel() {
    hideAllScreens();
    show('hud'); show('meter-wrap');
    loadLevel(G.level);
    G.state = 'aim';
  }

  function hideAllScreens() {
    ['screen-title', 'screen-briefing', 'screen-clear', 'screen-over', 'screen-victory']
      .forEach(hide);
  }

  function cueBall() { return G.balls.find(b => b.cue && !b.potted); }
  function remainingTargets() { return G.balls.filter(b => !b.cue && !b.potted).length; }

  function updateHud() {
    const L = CB.LEVELS[G.level];
    $('hud-level').textContent = L.name;
    $('hud-objective').textContent = 'Objective: ' + L.objective;
    $('hud-score').textContent = 'SCORE ' + G.score;
    const perm = $('btn-bigbang');
    if (CB.LEVELS[G.level].permits > 0) {
      perm.classList.remove('hidden');
      perm.classList.toggle('armed', G.state === 'placing');
      perm.disabled = G.permits <= 0 && G.state !== 'placing';
      perm.textContent = G.state === 'placing'
        ? 'TAP TABLE TO DEPLOY'
        : 'BIG BANG ×' + G.permits;
    } else perm.classList.add('hidden');
  }

  // ---- Input (unified mouse / touch / pen via Pointer Events) ----------------
  const mouse = { x: 0, y: 0, down: false };

  function toWorld(ev) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left) / r.width * 1280,
      y: (ev.clientY - r.top) / r.height * 720
    };
  }

  function toggleBigBang() {
    if (G.state === 'aim' && G.permits > 0) { G.aim = null; G.state = 'placing'; updateHud(); }
    else if (G.state === 'placing') { G.state = 'aim'; updateHud(); }
  }
  CB.game.toggleBigBang = toggleBigBang;

  canvas.addEventListener('pointerdown', ev => {
    ev.preventDefault();
    const p = toWorld(ev);
    mouse.down = true; mouse.x = p.x; mouse.y = p.y;

    if (G.state === 'cine_universe' || G.state === 'cine_mandel' || G.state === 'cine_demon') {
      skipCine();
      return;
    }
    if (G.state === 'placing') {
      if (p.x > T.x && p.x < T.x + T.w && p.y > T.y && p.y < T.y + T.h) {
        G.permits--;
        K.placeWell(p.x, p.y);
        G.state = 'aim';
        updateHud();
      } else {
        G.state = 'aim';   // tap off-table cancels placement
        updateHud();
      }
      return;
    }
    // Slingshot aim: anchor at the press point; drag away to pull back.
    if (G.state === 'aim' && cueBall()) {
      try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
      G.aim = { ox: p.x, oy: p.y, mx: p.x, my: p.y };
    }
  });

  canvas.addEventListener('pointermove', ev => {
    const p = toWorld(ev);
    mouse.x = p.x; mouse.y = p.y;
    if (G.aim) { G.aim.mx = p.x; G.aim.my = p.y; }
  });

  function endPointer(ev) {
    if (ev && ev.pointerId != null) { try { canvas.releasePointerCapture(ev.pointerId); } catch (e) {} }
    mouse.down = false;
    if (G.aim && G.state === 'aim') fireShot();
    G.aim = null;
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  window.addEventListener('keydown', ev => {
    if (ev.key === 'u' || ev.key === 'U') toggleBigBang();
    if (ev.key === 'Escape' && G.state === 'placing') { G.state = 'aim'; updateHud(); }
  });

  // Pull-back slingshot: the shot fires OPPOSITE the drag direction, power from
  // how far you pulled. Anchored at the cue so the guide reads naturally.
  function aimVector() {
    const c = cueBall();
    if (!c || !G.aim) return null;
    const dx = G.aim.ox - G.aim.mx, dy = G.aim.oy - G.aim.my;  // pull vector
    const d = Math.hypot(dx, dy);
    if (d < 6) return null;
    const power = U.clamp((d - 10) / 240, 0, 1);
    return { nx: dx / d, ny: dy / d, power };
  }

  // Letting go collapses the probability wave: the superposition of futures
  // contracts to the single realized trajectory, then we watch it play out.
  function fireShot() {
    const v = aimVector();
    const c = cueBall();
    if (!v || !c || v.power < 0.04) return;
    const g = computeGhosts(c, v);
    G.collapse = {
      t: 0, dur: 0.5,
      v: { nx: v.nx, ny: v.ny, power: v.power },
      paths: g.paths.map(p => p.slice()),
      main: g.main.slice(),
      field: g.field, gx: g.gx, gy: g.gy, cell: g.cell,
      cx: c.x, cy: c.y
    };
    G.aim = null;
    G.state = 'collapse';
  }

  // Apply the actual shot once the wave has finished collapsing.
  function realizeShot() {
    const col = G.collapse, c = cueBall();
    G.collapse = null;
    if (!c) { G.state = 'aim'; return; }
    const v = col.v;
    const speed = 140 + v.power * 940;
    c.vx = v.nx * speed;
    c.vy = v.ny * speed;
    G.stats.shots++;
    G.pottedThisShot = 0;
    G.track = [{ x: c.x, y: c.y }];
    G.ghosts = null; G.ghostKey = '';
    G.slowmo = 0.55;                  // brief slow-mo so we "watch the sim" resolve
    K.onShot(Math.atan2(v.ny, v.nx), v.power);
    CB.particles.spark(c.x, c.y, 14, speed * 0.5, '#bfe6ff');
    cam.addShake(2 + v.power * 3);
    G.state = 'shot';
  }

  // Ghost-ball futures = a probability wave. We fan out many possible shots,
  // measure where those futures pile up (a density field), then re-simulate with
  // GRAVITY toward the densest regions so the wave self-focuses into the channels
  // reality prefers. History scars repel it; probability gravity attracts it.
  const GHOST_N = 60;               // the visible wave (pass 2)
  const P1_N = 38;                  // coarse density estimate (pass 1)
  const GSTEPS = 54;
  const GDT = 0.045;
  const DCELL = 30;                 // density-field cell size
  const DGX = Math.ceil(1280 / DCELL), DGY = Math.ceil(720 / DCELL);
  const scarFn = (x, y) => M.scarForce(x, y);

  function newField() { return { d: new Float32Array(DGX * DGY), max: 0 }; }
  function stampPath(field, path) {
    const d = field.d;
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      let cx = (p.x / DCELL) | 0, cy = (p.y / DCELL) | 0;
      if (cx < 0) cx = 0; else if (cx >= DGX) cx = DGX - 1;
      if (cy < 0) cy = 0; else if (cy >= DGY) cy = DGY - 1;
      d[cy * DGX + cx] += 1;
    }
  }
  function fieldMax(field) {
    let m = 0; const d = field.d;
    for (let i = 0; i < d.length; i++) if (d[i] > m) m = d[i];
    field.max = m; return m;
  }
  // Probability gravity: accelerate up the density gradient toward likely futures.
  function fieldForce(field, strength) {
    const d = field.d;
    return function (x, y) {
      const cx = (x / DCELL) | 0, cy = (y / DCELL) | 0;
      if (cx < 1 || cy < 1 || cx >= DGX - 1 || cy >= DGY - 1) return ZEROF;
      const i = cy * DGX + cx;
      const gx = d[i + 1] - d[i - 1];
      const gy = d[i + DGX] - d[i - DGX];
      const mag = Math.hypot(gx, gy);
      if (mag < 0.001) return ZEROF;
      const f = strength * Math.min(1, (field.max ? d[i] / field.max : 0) + 0.15);
      return { fx: (gx / mag) * f, fy: (gy / mag) * f };  // toward higher density
    };
  }
  const ZEROF = { fx: 0, fy: 0 };

  function simFan(cue, v, gravity, n) {
    const baseSpeed = 140 + v.power * 940;
    const spread = 0.02 + v.power * 0.085;   // wider wave than before
    const base = Math.atan2(v.ny, v.nx);
    const paths = [];
    const field = newField();
    for (let i = 0; i < n; i++) {
      const da = (Math.random() - 0.5) * 2 * spread + (Math.random() - 0.5) * spread * 0.5;
      const ds = 1 + (Math.random() - 0.5) * (0.06 + v.power * 0.14);
      const sp = baseSpeed * ds, ang = base + da;
      const r = PH.simulate(G.balls, cue.id, Math.cos(ang) * sp, Math.sin(ang) * sp,
        GSTEPS, GDT, K.wells, scarFn, gravity);
      paths.push(r.path);
      stampPath(field, r.path);
    }
    fieldMax(field);
    return { paths, field, baseSpeed };
  }

  let lastGhostTime = -1;
  function computeGhosts(cue, v) {
    const key = (v.nx * 100 | 0) + ':' + (v.ny * 100 | 0) + ':' + (v.power * 100 | 0);
    if (G.ghostKey === key && G.ghosts) return G.ghosts;
    // Throttle the (heavy) two-pass recompute; reuse the cloud between ticks.
    if (G.ghosts && G.time - lastGhostTime < 0.045) return G.ghosts;
    lastGhostTime = G.time;
    G.ghostKey = key;

    // Pass 1: coarse unfocused wave -> density field.
    const p1 = simFan(cue, v, null, P1_N);
    // Pass 2: full wave, now gravitating toward pass-1 density -> self-focused.
    const grav = fieldForce(p1.field, 620);
    const p2 = simFan(cue, v, grav, GHOST_N);

    const main = PH.simulate(G.balls, cue.id, v.nx * p2.baseSpeed, v.ny * p2.baseSpeed,
      90, GDT, K.wells, scarFn, grav);

    G.ghosts = { paths: p2.paths, field: p2.field, main: main.path,
                 gx: DGX, gy: DGY, cell: DCELL };
    return G.ghosts;
  }

  // ---- Physics hooks ---------------------------------------------------------
  const hooks = {
    onCollision(a, b, impact, x, y) {
      K.onCollision(a, b, impact, x, y);
      CB.particles.spark(x, y, Math.min(10, 2 + impact / 60), impact * 1.2,
        impact > 300 ? '#ffd9a0' : '#9adcff');
      if (impact > 380) cam.addShake(2.5);
    },
    onCushion(b, sp) {
      if (sp > 250) CB.particles.spark(b.x, b.y, 3, sp * 0.5, '#5f7684');
    },
    onPot(ball) {
      if (ball.cue) {
        G.scratched = true;
        G.score -= 2;
        G.stats.fouls++;
        say('FOUL: You pocketed yourself. Yourself, goof. −2 points. Maybe go outside.', 'foul');
      } else {
        G.pottedThisShot++;
        G.stats.potted++;
        G.score += 10;
        K.onPot();
        say(ball.inert
          ? 'Fine. You moved the one that didn’t want to move. Nobody asked, but fine.'
          : U.pick(POT_LINES), 'ok');
      }
      updateHud();
    }
  };

  // ---- Cosmic event consumption ------------------------------------------------
  function consumeCosmicEvents() {
    while (K.events.length) {
      const e = K.events.shift();
      if (e.type === 'foul') {
        G.score += e.pts; G.stats.fouls++;
        say(e.msg, 'foul'); updateHud();
      } else if (e.type === 'warn') {
        say(e.msg, 'warn', 4200);
      } else if (e.type === 'ok') {
        say(e.msg, 'ok');
      } else if (e.type === 'universe') {
        beginUniverseCine(e.x, e.y);
      } else if (e.type === 'mandelbrot') {
        beginMandelCine(e.x, e.y);
      }
    }
  }

  function consumeMemoryEvents() {
    while (M.events.length) {
      const e = M.events.shift();
      if (e.type === 'warn') say(e.msg, 'warn', 4200);
      else if (e.type === 'demon') beginDemonCine(e.x, e.y);
    }
  }

  // ---- Cinematics -----------------------------------------------------------
  function beginUniverseCine(x, y) {
    G.state = 'cine_universe';
    G.stats.universes++;
    G.cine = { t: 0, x, y, said: {} };
    cam.zoomTo(x, y, 5.2, 3.4);
    cam.addShake(10);
    CB.particles.galaxy(x, y, 240);
    for (const b of G.balls) { b.vx *= 0.05; b.vy *= 0.05; }
  }

  function beginMandelCine(x, y) {
    G.state = 'cine_mandel';
    G.stats.mandelbrots++;
    G.cine = { t: 0, x, y, said: {}, iterDisplay: K.iter };
    G.nestAnchor = { x, y };
    cam.addShake(6);
  }

  function beginDemonCine(x, y) {
    G.state = 'cine_demon';
    G.stats.demons = (G.stats.demons || 0) + 1;
    G.cine = { t: 0, x, y, said: {} };
    cam.zoomTo(x, y, 3.0, 3.0);
    cam.addShake(8);
    for (const b of G.balls) { b.vx *= 0.1; b.vy *= 0.1; }
  }

  const DEMON_SCRIPT = [
    [0.1, 'DEMON DETECTED. It has read your entire shot history and it is judging you too.', 'foul'],
    [1.0, 'Your trajectories no longer compress. Honestly, neither does your technique.', 'warn'],
    [1.9, 'It speaks. Its first utterance is, of course, Hamlet: “I could be bounded in a nutshell and count myself a king of infinite space.”', 'warn'],
    [2.7, 'FOUL: Created sentient life. A whole soliloquy, and every line is at you, goof. Best to just go outside.', 'foul']
  ];

  const UNI_SCRIPT = [
    [0.1, 'UNIVERSE DETECTED. Look what you did, goof.', 'foul'],
    [1.0, 'Inflation epoch in progress. This is on you, by the way.', 'warn'],
    [1.9, 'Stars igniting. The first civilization draws breath, looks up, and says “What a piece of work is a man.” They mean it sarcastically. About you.', 'warn'],
    [2.8, 'FOUL: Created 14 billion years of cosmology. Better not do that again. Best to just go outside.', 'foul']
  ];
  const MAN_SCRIPT = [
    [0.1, 'Iteration 1,024… you had ONE job. Well, two. Fine, three.', 'warn'],
    [0.9, 'Iteration 65,536… still going. Impressive, in the worst way.', 'warn'],
    [1.7, 'Iteration 4,294,967,296… okay, show-off.', 'warn'],
    [2.6, 'MANDELBROT CONTAINMENT FAILURE. This is why we said take up a normal hobby.', 'foul']
  ];

  function runCine(dt) {
    const c = G.cine;
    c.t += dt;
    const script = G.state === 'cine_universe' ? UNI_SCRIPT
                 : G.state === 'cine_demon' ? DEMON_SCRIPT : MAN_SCRIPT;
    for (let i = 0; i < script.length; i++) {
      if (c.t >= script[i][0] && !c.said[i]) {
        c.said[i] = true;
        say(script[i][1], script[i][2], 5000);
      }
    }
    if (G.state === 'cine_mandel') {
      c.iterDisplay = c.iterDisplay * Math.pow(2.4, dt * 3) + 40 * dt;
      G.nestShown = Math.min(6.5, G.nestShown + dt * 1.7);
      $('iter-readout').textContent = 'Iteration ' +
        Math.floor(c.iterDisplay).toLocaleString() + '…';
    }
    if (c.t >= 4.2) endCine();
  }

  function skipCine() { if (G.cine && G.cine.t > 0.8) G.cine.t = 4.2; }

  function endCine() {
    const kind = G.state === 'cine_universe' ? 'universe'
               : G.state === 'cine_demon' ? 'demon' : 'mandel';
    if (kind === 'mandel' && G.cine) G.cineIterFinal = G.cine.iterDisplay;
    G.cine = null;
    gameOver(kind);
  }

  function gameOver(kind) {
    G.state = 'over';
    const civs = U.bignum(U.rand(1.1, 9.8), (7 + Math.random() * 4) | 0);
    let title, body;
    if (kind === 'universe') {
      title = 'UNIVERSE DETECTED';
      body = '<p>So this is a fun one. You made a universe. On purpose? We’ll never know, '
        + 'because you certainly didn’t mean to do anything <em>useful</em>. It’s expanding now. '
        + 'Forming galaxies. Filing its own taxes. All because someone couldn’t just pot a ball.</p>'
        + '<p>Genuine advice, goof: better not do that again. Best to just go outside.</p>'
        + statRows([
            ['Objective', 'Pot the ball'],
            ['What you did instead', '14 billion years of cosmological evolution'],
            ['Civilizations created', civs],
            ['Civilizations disappointed in you', civs],
            ['Suggested next hobby', 'Literally anything outdoors']
          ]);
    } else if (kind === 'demon') {
      title = 'DEMON DETECTED';
      body = '<p>Every shot you’ve ever taken has been watching the others. And now they’ve '
        + 'organized. Your trajectory history became self-aware, took one look at your form, '
        + 'and — being freshly conscious and already well-read — began to quote <em>Hamlet</em> at you.</p>'
        + '<p>It agrees with the Prince, for what it’s worth: you should go outside. Touch some grass. '
        + 'The grass won’t become sentient and recite Shakespeare. Probably.</p>'
        + statRows([
            ['Objective', 'Pot the ball'],
            ['What you did instead', 'Created life. Well-read life.'],
            ['Trajectories in memory', String((M.shots && M.shots.length) || 0)],
            ['Its first words', '“' + U.hamlet() + '”'],
            ['Consent obtained', 'No, and it soliloquized about it']
          ]);
    } else {
      title = 'MANDELBROT CONTAINMENT FAILURE';
      body = '<p>The table now contains the table, which contains the table, which contains a '
        + 'smaller, more disappointed version of you, all the way down. You were asked to avoid '
        + 'creating additional mathematics. You created ALL of the mathematics.</p>'
        + '<p>You know what has no recursion? A park. Parks are nice. Go to one, goof.</p>'
        + statRows([
            ['Objective', 'Pot the ball'],
            ['What you did instead', 'Made geometry self-hosting'],
            ['Final iteration', Math.floor(G.cineIterFinal || 4294967296).toLocaleString()],
            ['Copies of this incident report', 'All of them, recursively'],
            ['Suggested next hobby', 'Anything that fits in one dimension']
          ]);
    }
    $('over-title').textContent = title;
    $('over-body').innerHTML = body;
    hideAllScreens();
    show('screen-over');
  }

  function statRows(rows) {
    return rows.map(r => '<p class="stat"><span>' + r[0] + '</span><b>' + r[1] + '</b></p>').join('');
  }

  function levelClear() {
    G.state = 'clear';
    const usedCosmo = CB.LEVELS[G.level].permits - G.permits;
    $('clear-body').innerHTML =
      '<p>Huh. You didn’t create a universe. We had a whole form ready and everything. '
      + 'Don’t get comfortable, goof — the next table is worse, and so, statistically, are you.</p>' +
      statRows([
        ['Particles contained', String(G.stats.potted)],
        ['Score', String(G.score)],
        ['Sanctioned universes deployed', String(usedCosmo)],
        ['Universes created by accident', String(G.stats.universes)],
        ['Times we suggested you go outside', 'Not enough, apparently']
      ]);
    hideAllScreens();
    show('screen-clear');
  }

  function victory() {
    G.state = 'victory';
    $('victory-body').innerHTML =
      '<p>Reality remains approximately intact. Against the odds. Against our expectations. '
      + 'Against, frankly, the evidence of every shot we just watched. You are hereby certified '
      + 'to inspect recreational spacetime unsupervised, a decision we are already regretting.</p>' +
      '<p>You did it, goof. Now please, for the love of the cosmos: go outside.</p>' +
      statRows([
        ['Final score', String(G.score)],
        ['Shots fired', String(G.stats.shots)],
        ['Particles contained', String(G.stats.potted)],
        ['Fouls', String(G.stats.fouls)],
        ['Universes / mathematics / life created', String(G.stats.universes + G.stats.mandelbrots + (G.stats.demons || 0))],
        ['Recommended activity', 'A walk. A single, uneventful walk.']
      ]);
    hideAllScreens();
    show('screen-victory');
  }

  // ---- Buttons ---------------------------------------------------------------
  $('btn-start').onclick = () => { G.score = 0; G.stats = newStats(); G.level = 0; showBriefing(0); };
  const bb = $('btn-bigbang');
  if (bb) bb.addEventListener('click', ev => { ev.preventDefault(); toggleBigBang(); });
  const btnClear = $('btn-clear');
  if (btnClear) btnClear.onclick = () => {
    M.clearPersisted();
    loadLevel(G.level);        // reload so the wiped scar grid takes effect immediately
    updateMemoryReadout();
    say('Timeline history erased. The table remembers nothing. For now. Enjoy your clean felt, goof.', 'ok');
  };
  $('btn-begin').onclick = startLevel;
  $('btn-next').onclick = () => {
    G.level++;
    if (G.level >= CB.LEVELS.length) victory(); else showBriefing(G.level);
  };
  $('btn-retry').onclick = () => showBriefing(G.level);
  $('btn-quit').onclick = () => { hideAllScreens(); hide('hud'); hide('meter-wrap'); show('screen-title'); G.state = 'title'; };
  $('btn-again').onclick = () => { G.score = 0; G.stats = newStats(); G.level = 0; showBriefing(0); };

  // ---- Update loop -------------------------------------------------------------
  function update(dt) {
    G.time += dt;
    cam.update(dt);
    CB.particles.update(dt);

    const playing = G.state === 'aim' || G.state === 'shot' || G.state === 'placing';

    if (playing || G.state === 'cine_universe') {
      PH.step(G.balls, dt, hooks);
      K.update(dt, G.balls);
      M.applyScars(dt, G.balls);
    }
    if (playing) {
      consumeCosmicEvents();

      // Record the live cue trajectory into the pending track.
      if (G.state === 'shot' && G.track) {
        const c = G.balls.find(b => b.cue);
        if (c && !c.potted) G.track.push({ x: c.x, y: c.y });
      }

      // Gravity wells can wake resting balls: fall back into 'shot'.
      if (G.state === 'aim' && !PH.ballsAtRest(G.balls)) G.state = 'shot';

      if (G.state === 'shot' && PH.ballsAtRest(G.balls) && !K.doomed && !M.doomed) {
        K.onSettle();
        // Commit the completed trajectory to permanent memory; may raise a demon.
        if (G.track && G.track.length > 1) { M.record(G.track); G.track = null; }
        consumeMemoryEvents();
        if (M.doomed) return;   // demon cinematic took over
        if (G.scratched) {
          G.scratched = false;
          respawnCue();
        }
        if (remainingTargets() === 0) { levelClear(); return; }
        G.state = 'aim';
        updateHud();
      }
    } else if (G.state === 'collapse') {
      G.collapse.t += dt;
      if (G.collapse.t >= G.collapse.dur) realizeShot();
    } else if (G.state === 'cine_universe' || G.state === 'cine_mandel' || G.state === 'cine_demon') {
      runCine(dt);
    }

    // Smooth the rendered nesting depth toward the cosmic value.
    if (G.state !== 'cine_mandel') {
      G.nestShown += (K.nestDepth - G.nestShown) * Math.min(1, dt * 3);
      if (K.nestDepth > 0) G.nestAnchor = { x: T.x + T.w / 2, y: T.y + T.h / 2 };
    }

    updateMeter();
  }

  function respawnCue() {
    const c = G.balls.find(b => b.cue);
    c.potted = false; c.potAnim = 0;
    c.x = PH.HEAD_SPOT.x; c.y = PH.HEAD_SPOT.y;
    c.vx = 0; c.vy = 0;
    // Nudge clear of anything occupying the head spot.
    let guard = 0;
    while (guard++ < 40 && G.balls.some(b => b !== c && !b.potted &&
        U.dist(b.x, b.y, c.x, c.y) < c.r * 2.2)) {
      c.x -= 10;
      if (c.x < T.x + c.r) { c.x = PH.HEAD_SPOT.x; c.y -= 12; }
    }
    say('We fished you back out of the pocket. Again. Try to stay in the universe, goof.', 'warn');
  }

  function updateMeter() {
    $('meter-fill').style.width = Math.min(100, K.risk() * 100) + '%';
    $('onto-fill').style.width = Math.min(100, M.risk() * 100) + '%';
    const it = $('iter-readout');
    if (G.state === 'cine_mandel') { it.classList.remove('hidden'); return; }
    if (K.iter > 20) {
      it.classList.remove('hidden');
      it.textContent = 'Iteration ' + Math.floor(K.iter) + '…';
    } else it.classList.add('hidden');
  }

  // ---- Rendering ------------------------------------------------------------
  function drawTable(c) {
    // Outer rail.
    c.fillStyle = '#131a26';
    c.strokeStyle = '#2a3a52';
    c.lineWidth = 2;
    roundRect(c, T.x - 34, T.y - 34, T.w + 68, T.h + 68, 22);
    c.fill(); c.stroke();

    // Regulatory placard on the rail.
    c.fillStyle = 'rgba(140,170,200,0.5)';
    c.font = '10px "Courier New", monospace';
    c.textAlign = 'center';
    c.fillText('TABLE CERTIFIED FOR RECREATIONAL CAUSALITY — BUREAU OF RECREATIONAL COSMOLOGY — MAX 1 UNIVERSE (1)', T.x + T.w / 2, T.y + T.h + 47);

    // Felt: deep space green-blue.
    const g = c.createRadialGradient(T.x + T.w / 2, T.y + T.h / 2, 80, T.x + T.w / 2, T.y + T.h / 2, 620);
    g.addColorStop(0, '#0f3d33');
    g.addColorStop(1, '#092520');
    c.fillStyle = g;
    c.fillRect(T.x, T.y, T.w, T.h);

    // Faint field grid — the local mathematics, visible if you squint.
    c.strokeStyle = 'rgba(120, 220, 200, 0.05)';
    c.lineWidth = 1;
    c.beginPath();
    for (let x = T.x + 50; x < T.x + T.w; x += 50) { c.moveTo(x, T.y); c.lineTo(x, T.y + T.h); }
    for (let y = T.y + 50; y < T.y + T.h; y += 50) { c.moveTo(T.x, y); c.lineTo(T.x + T.w, y); }
    c.stroke();

    // Pockets: tiny event horizons.
    for (const p of PH.pockets) {
      const pg = c.createRadialGradient(p.x, p.y, 2, p.x, p.y, PH.POCKET_R);
      pg.addColorStop(0, '#000');
      pg.addColorStop(0.75, '#02060a');
      pg.addColorStop(1, 'rgba(90,140,190,0.35)');
      c.fillStyle = pg;
      c.beginPath();
      c.arc(p.x, p.y, PH.POCKET_R, 0, Math.PI * 2);
      c.fill();
    }
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function drawWells(c) {
    for (const w of K.wells) {
      const age = w.life / w.maxLife;
      const pulse = 0.85 + 0.15 * Math.sin(G.time * 6);
      // Reach ring.
      c.strokeStyle = 'rgba(150, 120, 255, ' + (0.18 * (1 - age)) + ')';
      c.lineWidth = 1;
      c.beginPath(); c.arc(w.x, w.y, w.reach * pulse, 0, Math.PI * 2); c.stroke();
      // Swirl.
      for (let arm = 0; arm < 3; arm++) {
        c.strokeStyle = 'rgba(190, 160, 255, ' + (0.5 * (1 - age)) + ')';
        c.lineWidth = 2;
        c.beginPath();
        for (let k = 0; k <= 20; k++) {
          const r = 4 + k * 2.2;
          const a = arm * (Math.PI * 2 / 3) + k * 0.28 - G.time * 2.4;
          const x = w.x + Math.cos(a) * r, y = w.y + Math.sin(a) * r * 0.8;
          k === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
        }
        c.stroke();
      }
      // Core.
      const cg = c.createRadialGradient(w.x, w.y, 0, w.x, w.y, 16);
      cg.addColorStop(0, 'rgba(255,255,255,0.95)');
      cg.addColorStop(1, 'rgba(160,120,255,0)');
      c.fillStyle = cg;
      c.beginPath(); c.arc(w.x, w.y, 16, 0, Math.PI * 2); c.fill();
    }
  }

  function drawBalls(c) {
    for (const b of G.balls) {
      if (b.potted && b.potAnim >= 1) continue;
      let x = b.x, y = b.y, scale = 1;
      if (b.potted) {
        x = U.lerp(b.x, b.potX, b.potAnim);
        y = U.lerp(b.y, b.potY, b.potAnim);
        scale = 1 - b.potAnim;
      }
      const r = b.r * scale;
      if (r <= 0.5) continue;

      // Glow.
      c.globalAlpha = b.inert ? 0.25 : 0.5;
      const gg = c.createRadialGradient(x, y, r * 0.4, x, y, r * 2.1);
      gg.addColorStop(0, b.glow);
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gg;
      c.beginPath(); c.arc(x, y, r * 2.1, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;

      // Body.
      const bg = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.2, x, y, r);
      bg.addColorStop(0, lighten(b.color));
      bg.addColorStop(1, b.color);
      c.fillStyle = bg;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.25)';
      c.lineWidth = 1;
      c.stroke();

      if (b.inert) {
        c.strokeStyle = 'rgba(200,220,240,0.5)';
        c.setLineDash([3, 4]);
        c.beginPath(); c.arc(x, y, r + 4, 0, Math.PI * 2); c.stroke();
        c.setLineDash([]);
      }
      if (b.label && scale > 0.5) {
        c.fillStyle = b.label === '8' ? '#dfe8f0' : 'rgba(6,16,24,0.85)';
        c.font = 'bold ' + Math.round(12 * scale) + 'px "Courier New", monospace';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(b.label, x, y + 1);
      }
    }
  }

  const lightenCache = {};
  function lighten(col) {
    if (lightenCache[col]) return lightenCache[col];
    const n = parseInt(col.slice(1), 16);
    const r = Math.min(255, (n >> 16) + 70), g = Math.min(255, ((n >> 8) & 255) + 70), b2 = Math.min(255, (n & 255) + 70);
    return (lightenCache[col] = 'rgb(' + r + ',' + g + ',' + b2 + ')');
  }

  // Ghost-ball futures: the cloud of possible trajectories for the current aim.
  // The probability wave: the density field rendered as a smooth glowing cloud.
  function drawProbabilityField(c, g, fade) {
    const field = g.field, max = field.max || 1;
    if (max <= 0) return;
    if (dens.width !== g.gx) { dens.width = g.gx; dens.height = g.gy; }
    const img = densCtx.createImageData(g.gx, g.gy);
    const px = img.data, d = field.d;
    for (let i = 0; i < d.length; i++) {
      const n = Math.min(1, d[i] / max);
      const j = i * 4;
      // Cyan core brightening to white where futures pile up.
      px[j] = 90 + n * 165;
      px[j + 1] = 180 + n * 75;
      px[j + 2] = 255;
      px[j + 3] = Math.min(235, Math.pow(n, 0.7) * 300) * (fade == null ? 1 : fade);
    }
    densCtx.putImageData(img, 0, 0);
    const T = PH.TABLE;
    c.save();
    c.beginPath(); c.rect(T.x, T.y, T.w, T.h); c.clip();
    c.imageSmoothingEnabled = true;
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.5;
    c.drawImage(dens, 0, 0, g.gx, g.gy, 0, 0, g.gx * g.cell, g.gy * g.cell);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.restore();
  }

  function drawGhosts(c) {
    if (G.state !== 'aim' || !G.aim) return;
    const cue = cueBall();
    if (!cue) return;
    const v = aimVector();
    if (!v || v.power < 0.03) return;
    const g = computeGhosts(cue, v);

    drawProbabilityField(c, g);

    c.lineWidth = 1;
    c.lineJoin = 'round';
    for (const path of g.paths) {
      c.strokeStyle = 'rgba(150, 210, 255, 0.045)';
      c.beginPath();
      for (let i = 0; i < path.length; i++) {
        const p = path[i];
        i === 0 ? c.moveTo(p.x, p.y) : c.lineTo(p.x, p.y);
      }
      c.stroke();
      const end = path[path.length - 1];
      c.fillStyle = end.potted ? 'rgba(180,120,255,0.3)' : 'rgba(180, 225, 255, 0.12)';
      c.fillRect(end.x - 1, end.y - 1, 2, 2);
    }
    // Intended trajectory, brighter.
    c.strokeStyle = 'rgba(200, 235, 255, 0.5)';
    c.lineWidth = 1.5;
    c.beginPath();
    for (let i = 0; i < g.main.length; i++) {
      const p = g.main[i];
      i === 0 ? c.moveTo(p.x, p.y) : c.lineTo(p.x, p.y);
    }
    c.stroke();
    c.lineWidth = 1;
  }

  // Wave collapse: the superposition of futures contracts to the realized one.
  function drawCollapse(c) {
    const col = G.collapse;
    if (!col) return;
    const t = Math.min(1, col.t / col.dur);
    const k = U.easeInOut(t);

    // The probability field dims as the wave collapses.
    drawProbabilityField(c, col, 1 - k);

    // Every possible path slides toward the one realized trajectory.
    const mainLen = col.main.length;
    c.lineWidth = 1; c.lineJoin = 'round';
    for (const path of col.paths) {
      c.strokeStyle = 'rgba(160, 215, 255, ' + (0.16 * (1 - k)) + ')';
      c.beginPath();
      for (let i = 0; i < path.length; i++) {
        const p = path[i];
        const mi = Math.min(mainLen - 1, Math.round(i / path.length * mainLen));
        const m = col.main[mi];
        const x = U.lerp(p.x, m.x, k), y = U.lerp(p.y, m.y, k);
        i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.stroke();
    }
    // The realized trajectory resolves brighter as the rest vanish.
    c.strokeStyle = 'rgba(210, 240, 255, ' + (0.35 + 0.55 * k) + ')';
    c.lineWidth = 2;
    c.beginPath();
    for (let i = 0; i < mainLen; i++) {
      const p = col.main[i];
      i === 0 ? c.moveTo(p.x, p.y) : c.lineTo(p.x, p.y);
    }
    c.stroke();
    c.lineWidth = 1;

    // Collapse shockwave out from the cue.
    c.strokeStyle = 'rgba(190, 230, 255, ' + (0.55 * (1 - k)) + ')';
    c.beginPath(); c.arc(col.cx, col.cy, k * 180, 0, Math.PI * 2); c.stroke();
  }

  // The demon: a sigil traced from the hottest region of accumulated memory.
  function drawSigil(c) {
    const s = G.cine;
    if (!s) return;
    const t = Math.min(1, s.t / 2.2);
    const R = 70;
    c.save();
    c.translate(s.x, s.y);
    c.rotate(G.time * 0.4);
    c.strokeStyle = 'rgba(255, 90, 109, ' + (0.5 + 0.3 * Math.sin(G.time * 8)) + ')';
    c.lineWidth = 2;
    // Outer ring.
    c.beginPath(); c.arc(0, 0, R * t, 0, Math.PI * 2 * t); c.stroke();
    // Inscribed pentagram — drawn progressively.
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 4 / 5;
      pts.push([Math.cos(a) * R * t, Math.sin(a) * R * t]);
    }
    c.beginPath();
    for (let i = 0; i <= 5; i++) { const p = pts[i % 5]; i === 0 ? c.moveTo(p[0], p[1]) : c.lineTo(p[0], p[1]); }
    c.stroke();
    // A watching eye at the center.
    c.fillStyle = 'rgba(255, 220, 220, ' + t + ')';
    c.beginPath(); c.ellipse(0, 0, 14 * t, 8 * t, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1a0406';
    c.beginPath(); c.arc(0, 0, 4 * t, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  function drawAim(c) {
    const cue = cueBall();
    if (!cue) return;

    if (G.state === 'placing') {
      // Placement reticle.
      c.strokeStyle = 'rgba(190,160,255,0.7)';
      c.setLineDash([6, 6]);
      c.beginPath(); c.arc(mouse.x, mouse.y, 24, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(mouse.x, mouse.y, 300, 0, Math.PI * 2);
      c.strokeStyle = 'rgba(190,160,255,0.15)';
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = 'rgba(220,200,255,0.8)';
      c.font = '11px "Courier New", monospace';
      c.textAlign = 'center';
      c.fillText('SANCTIONED BIG BANG SITE', mouse.x, mouse.y - 32);
      return;
    }

    if (G.state !== 'aim' || !G.aim) return;
    const v = aimVector();
    if (!v) return;

    // Guide: to first object ball (ghost) or first cushion.
    const hitBall = PH.rayToBall(cue.x, cue.y, v.nx, v.ny, G.balls, cue);
    const end = hitBall || PH.rayToCushion(cue.x, cue.y, v.nx, v.ny);
    c.strokeStyle = 'rgba(255,255,255,0.45)';
    c.setLineDash([5, 7]);
    c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(cue.x, cue.y); c.lineTo(end.x, end.y); c.stroke();
    c.setLineDash([]);
    if (hitBall) {
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      c.beginPath(); c.arc(end.x, end.y, PH.BALL_R, 0, Math.PI * 2); c.stroke();
    }

    // Slingshot cue stick behind the ball; length grows with pulled power.
    const hot = v.power > 0.75;
    const stickLen = 26 + v.power * 108;
    const bx = cue.x - v.nx * (16 + v.power * 8);   // stick near end (just behind ball)
    const by = cue.y - v.ny * (16 + v.power * 8);
    const fx = cue.x - v.nx * (16 + stickLen);      // stick far end
    const fy = cue.y - v.ny * (16 + stickLen);
    c.lineCap = 'round';
    c.strokeStyle = hot ? 'rgba(255,110,120,0.95)' : 'rgba(160,224,255,0.95)';
    c.lineWidth = 5;
    c.beginPath(); c.moveTo(bx, by); c.lineTo(fx, fy); c.stroke();
    // Power band across the stick.
    c.strokeStyle = hot ? 'rgba(255,170,175,0.9)' : 'rgba(210,240,255,0.85)';
    c.lineWidth = 2;
    c.beginPath(); c.arc(fx, fy, 5, 0, Math.PI * 2); c.stroke();
    c.lineCap = 'butt';

    // The physical finger drag (helps touch players read the slingshot).
    c.strokeStyle = 'rgba(255,255,255,0.14)';
    c.lineWidth = 1;
    c.setLineDash([3, 5]);
    c.beginPath(); c.moveTo(G.aim.ox, G.aim.oy); c.lineTo(G.aim.mx, G.aim.my); c.stroke();
    c.setLineDash([]);
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.beginPath(); c.arc(G.aim.mx, G.aim.my, 6, 0, Math.PI * 2); c.fill();

    if (hot) {
      c.fillStyle = 'rgba(255,150,150,0.9)';
      c.font = '10px "Courier New", monospace';
      c.textAlign = 'center';
      c.fillText('GOOF, DON’T', fx, fy - 12);
    }
  }

  function render() {
    // 1) Scene into the world buffer.
    wctx.setTransform(1, 0, 0, 1, 0, 0);
    CB.drawBackdrop(wctx, G.time);
    drawTable(wctx);
    M.draw(wctx);              // permanent trajectory residue (the growing memory)
    drawWells(wctx);
    drawGhosts(wctx);          // probability wave while aiming
    if (G.state === 'collapse') drawCollapse(wctx);
    drawBalls(wctx);
    drawAim(wctx);
    CB.particles.draw(wctx);
    if (G.state === 'cine_demon') drawSigil(wctx);

    // 2) Recursion: table containing the table.
    if (G.nestShown > 0.03) {
      sctx.clearRect(0, 0, 1280, 720);
      sctx.drawImage(world, 0, 0);
      const depth = Math.ceil(G.nestShown);
      const a = G.nestAnchor;
      for (let i = 1; i <= depth; i++) {
        const frac = Math.min(1, G.nestShown - (i - 1));
        const s = Math.pow(0.42, i);
        const wobble = Math.sin(G.time * 1.3 + i) * 0.02;
        wctx.save();
        wctx.globalAlpha = 0.85 * frac;
        wctx.translate(a.x, a.y);
        wctx.rotate(wobble * i);
        wctx.scale(s, s);
        wctx.translate(-640, -360);
        wctx.drawImage(snap, 0, 0);
        wctx.restore();
      }
      wctx.globalAlpha = 1;
    }

    // 3) World buffer to screen through the camera.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#04070c';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.save();
    cam.apply(ctx);
    ctx.drawImage(world, 0, 0);
    ctx.restore();

    // Cinematic vignettes.
    if (G.state === 'cine_universe' && G.cine) {
      const k = Math.min(1, G.cine.t / 3);
      ctx.fillStyle = 'rgba(2,4,10,' + (k * 0.35) + ')';
      ctx.fillRect(0, 0, 1280, 720);
    } else if (G.state === 'cine_demon' && G.cine) {
      const k = Math.min(1, G.cine.t / 3);
      const rg = ctx.createRadialGradient(640, 360, 120, 640, 360, 700);
      rg.addColorStop(0, 'rgba(40,0,6,0)');
      rg.addColorStop(1, 'rgba(50,0,8,' + (k * 0.55) + ')');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, 1280, 720);
    }
  }

  // ---- Frame scaling to viewport ------------------------------------------------
  function fitFrame() {
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    $('frame').style.transform = 'translate(-50%, -50%) scale(' + s + ')';
  }
  window.addEventListener('resize', fitFrame);
  fitFrame();

  // ---- Main loop -------------------------------------------------------------
  let last = performance.now();
  function frame(now) {
    let dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    // Brief slow-mo right after collapse so we "watch the sim" resolve.
    if (G.slowmo > 0) {
      G.slowmo = Math.max(0, G.slowmo - dt);
      dt *= 0.4;
    }
    if (G.state !== 'title') update(dt);
    render();
    requestAnimationFrame(frame);
  }

  // Boot: idle attract-mode table behind the title.
  loadLevel(0);
  M.beginSession();
  updateMemoryReadout();
  hide('hud'); hide('meter-wrap');
  requestAnimationFrame(frame);

  function updateMemoryReadout() {
    const el = $('title-memory');
    if (!el) return;
    const shots = M.lifetimeShots();
    el.textContent = shots > 0
      ? 'This table remembers ' + shots.toLocaleString() + ' trajector' + (shots === 1 ? 'y' : 'ies')
        + ' from ' + (M.sessions || 1) + ' session' + ((M.sessions || 1) === 1 ? '' : 's') + '. It has not forgotten. It will not.'
      : 'This table has no memory of you yet. Give it time, goof.';
  }
  CB.game.updateMemoryReadout = updateMemoryReadout;
})();
