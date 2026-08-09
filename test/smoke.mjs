// Demon Billiards — browser smoke test.
//
// Loads the game the way players actually load it (file://, no server, no
// bundler) and asserts the things that would silently rot: the CB namespace,
// file-origin localStorage, an aimable and firable shot, the probability wave
// agreeing with the speed the shot really fires at, a missed shot terminating
// on its own, cushion containment at top speed, the gauges reading correctly
// both armed and unarmed, and the rail placard clearing the meter panel.
//
//   cd test && npm install && npm test
//
// PLAYWRIGHT_CHROMIUM_PATH overrides the browser binary for environments that
// ship their own Chromium.

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAME_URL = 'file://' + path.join(ROOT, 'index.html');

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

const launchOpts = {};
if (process.env.PLAYWRIGHT_CHROMIUM_PATH) {
  launchOpts.executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
}

const browser = await chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

// Record the placard's real draw calls rather than recomputing its position —
// a layout assertion that hardcodes the coordinate it is checking cannot fail.
await page.addInitScript(() => {
  // Sample ball containment and speed continuously: tunnelling through a cushion
  // is transient and would be invisible to a check that only reads end state.
  window.__esc = 0;
  window.__maxSpeed = 0;
  setInterval(() => {
    if (typeof CB === 'undefined' || !CB.physics || !CB.game) return;
    const T = CB.physics.TABLE, r = CB.physics.BALL_R;
    for (const b of (CB.game.balls || [])) {
      if (b.potted) continue;
      const worst = Math.max((T.x + r) - b.x, b.x - (T.x + T.w - r),
                             (T.y + r) - b.y, b.y - (T.y + T.h - r));
      if (worst > window.__esc) window.__esc = worst;
      const s = Math.hypot(b.vx, b.vy);
      if (s > window.__maxSpeed) window.__maxSpeed = s;
    }
  }, 8);

  window.__placard = [];
  const orig = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (text, x, y) {
    if (typeof text === 'string' && /TABLE CERTIFIED|BUREAU OF RECREATIONAL/.test(text)) {
      const seen = window.__placard.find(p => p.text === text);
      const w = this.measureText(text).width;
      if (seen) { seen.x = x; seen.y = y; seen.w = w; }
      else window.__placard.push({ text, x, y, w });
    }
    return orig.apply(this, arguments);
  };
});

// Any error at all is a failure — the game is expected to load clean off disk.
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

try {
  await page.goto(GAME_URL);
  await page.waitForTimeout(1200);

  // ---- Namespace ------------------------------------------------------------
  const EXPECTED = ['util', 'particles', 'camera', 'physics', 'cosmic', 'memory', 'LEVELS', 'game'];
  const keys = await page.evaluate(() => (typeof CB === 'undefined' ? [] : Object.keys(CB)));
  const missing = EXPECTED.filter(k => !keys.includes(k));
  check('all six scripts populate the CB namespace', missing.length === 0,
    missing.length ? 'missing: ' + missing.join(', ') : keys.length + ' keys');

  // ---- Persistence works from file:// --------------------------------------
  // The scar grid lives in localStorage; an opaque file:// origin would break it.
  const ls = await page.evaluate(() => {
    try {
      localStorage.setItem('__probe', '1');
      const v = localStorage.getItem('__probe');
      localStorage.removeItem('__probe');
      return v === '1';
    } catch (e) { return String(e.message); }
  });
  check('localStorage available over file:// (scar persistence)', ls === true, ls === true ? '' : String(ls));

  // ---- Title -> briefing -> play -------------------------------------------
  await page.click('#btn-start');
  await page.waitForTimeout(400);
  const briefingUp = await page.isVisible('#screen-briefing');
  check('title screen advances to the sector briefing', briefingUp);

  await page.click('#btn-begin');
  await page.waitForTimeout(600);
  const playing = await page.evaluate(() =>
    !document.getElementById('meter-wrap').classList.contains('hidden') &&
    document.getElementById('screen-briefing').classList.contains('hidden'));
  check('briefing advances into play with meters shown', playing);

  // ---- Gauges, sector 1: Rule 3 is not armed yet ---------------------------
  const readGauges = () => page.evaluate(() => ({
    cVal: document.getElementById('meter-val').textContent,
    cStat: document.getElementById('meter-stat').textContent,
    oVal: document.getElementById('onto-val').textContent,
    oStat: document.getElementById('onto-stat').textContent,
    oOffline: document.getElementById('onto-row').classList.contains('offline'),
    cOffline: document.getElementById('meter-row').classList.contains('offline'),
    cThreshold: CB.cosmic.threshold,
    mThreshold: CB.memory.threshold
  }));

  const g1 = await readGauges();
  // Sector 1 arms nothing: no scars means complexity cannot move, and Rule 3's
  // threshold is infinite. Both must say so rather than showing a passing zero.
  check('unarmed Rule 1 reads OFFLINE (no scars, so complexity cannot move)',
    g1.cStat === 'OFFLINE' && g1.cOffline === true,
    `stat "${g1.cStat}", val "${g1.cVal}", dimmed ${g1.cOffline}`);
  check('unarmed Rule 3 reads OFFLINE, not a passing zero',
    g1.oStat === 'OFFLINE' && g1.oVal === '— / —' && g1.oOffline === true,
    `stat "${g1.oStat}", val "${g1.oVal}", dimmed ${g1.oOffline}`);

  // ---- A shot can actually be aimed and fired ------------------------------
  // Record the speeds the probability wave simulates its futures at, so we can
  // check the preview agrees with the shot the player actually gets.
  await page.evaluate(() => {
    window.__waveSpeeds = [];
    const orig = CB.physics.simulate;
    CB.physics.simulate = function (balls, id, vx, vy) {
      window.__waveSpeeds.push(Math.hypot(vx, vy));
      return orig.apply(this, arguments);
    };
  });

  // Pull far enough to max the power, measured in canvas units (power saturates
  // at a 250px pull), so the shot exercises the top of the speed range.
  const geo = await page.evaluate(() => {
    const f = document.getElementById('frame').getBoundingClientRect();
    const c = (CB.game.balls || []).find(b => b.cue && !b.potted);
    return { l: f.left, t: f.top, s: f.width / 1280, cx: c.x, cy: c.y };
  });
  const ox = geo.l + geo.cx * geo.s, oy = geo.t + geo.cy * geo.s;
  const pull = 260 * geo.s;
  await page.mouse.move(ox, oy);
  await page.mouse.down();
  await page.mouse.move(ox - pull * 0.7, oy - pull * 0.7, { steps: 12 });
  const waveWhileAiming = await page.evaluate(() => window.__waveSpeeds.length > 0);
  check('aiming fans out a probability wave', waveWhileAiming,
    (await page.evaluate(() => window.__waveSpeeds.length)) + ' futures simulated');

  await page.evaluate(() => { window.__maxSpeed = 0; });   // reset before release
  await page.mouse.up();
  await page.waitForTimeout(600);   // wave collapse (0.28s) must finish before the shot exists
  const speeds = await page.evaluate(() => {
    // Only the final wave batch corresponds to the full pull — earlier batches
    // were computed at intermediate, weaker pulls as the drag grew.
    const w = window.__waveSpeeds.slice(-50).sort((a, b) => a - b);
    return { realized: window.__maxSpeed, waveMedian: w.length ? w[Math.floor(w.length / 2)] : 0 };
  });
  // Ghost futures jitter their speed by up to ~10%, so allow that but no more:
  // a systematic mismatch means the two formulas have drifted apart.
  const drift = speeds.waveMedian ? Math.abs(speeds.realized - speeds.waveMedian) / speeds.realized : 1;
  check('probability wave predicts the speed the shot actually fires at', drift < 0.12,
    `realized ${speeds.realized.toFixed(0)}px/s vs wave median ${speeds.waveMedian.toFixed(0)}px/s (${(drift * 100).toFixed(1)}% drift)`);

  await page.waitForTimeout(900);
  const moving = await page.evaluate(() =>
    (CB.game.balls || []).filter(b => Math.hypot(b.vx || 0, b.vy || 0) > 0.01).length);
  check('released shot puts a particle in motion (frictionless: still moving)', moving > 0,
    moving + ' ball(s) in motion');

  // ---- The shot clock bounds a miss ----------------------------------------
  // Nothing else can end a frictionless miss, so without a clock the shot runs
  // until the player gives up. Assert it terminates on its own.
  const CLOCK_BOUND_MS = 9000;   // SHOT_CLOCK is 5s; leave room for collapse + slow-mo
  const clockStart = Date.now();
  let liveMs = 0;
  while (await page.evaluate(() => CB.game.state) === 'shot') {
    liveMs = Date.now() - clockStart;
    if (liveMs > CLOCK_BOUND_MS) break;
    await page.waitForTimeout(150);
  }
  const stillLive = await page.evaluate(() => CB.game.state) === 'shot';
  check('a missed shot ends on its own (shot clock)', !stillLive,
    stillLive ? `still live after ${(liveMs / 1000).toFixed(1)}s` : `resolved`);

  // ---- Cushion containment at the raised top speed -------------------------
  const phys = await page.evaluate(() => ({ esc: window.__esc, maxSpeed: window.__maxSpeed }));
  check('no ball tunnels through a cushion', phys.esc < 2,
    `worst escape ${phys.esc.toFixed(2)}px at peak ${phys.maxSpeed.toFixed(0)}px/s`);
  check('peak speed stays inside the substep budget', phys.maxSpeed * 0.033 / 4 < 14,
    `${(phys.maxSpeed * 0.033 / 4).toFixed(1)}px per substep vs 14px ball radius`);

  // ---- Gauges, Rule 3 armed ------------------------------------------------
  // Drive both meters to known risks rather than waiting on emergent play.
  await page.evaluate(() => {
    CB.memory.threshold = 100;
    CB.memory.ontology = 98;             // 0.98 -> CRITICAL
    CB.memory.scarStrength = 50;         // arms Rule 1
    CB.cosmic.complexity = CB.cosmic.threshold * 0.75;  // 0.75 -> ELEVATED
  });
  await page.waitForTimeout(300);
  const g2 = await readGauges();
  check('armed Rule 3 clears the OFFLINE dim', g2.oOffline === false);
  check('armed Rule 1 clears the OFFLINE dim and shows numbers',
    g2.cOffline === false && /^\d+\.\d \/ \d+$/.test(g2.cVal),
    `dimmed ${g2.cOffline}, val "${g2.cVal}"`);   // value decays: match format, not a number
  check('gauge bands at 0.75 -> ELEVATED', g2.cStat === 'ELEVATED', `got "${g2.cStat}"`);
  check('gauge bands at 0.98 -> CRITICAL', g2.oStat === 'CRITICAL', `got "${g2.oStat}"`);
  check('armed gauge reads value against threshold', g2.oVal === '98.0 / 100', `got "${g2.oVal}"`);

  // ---- Layout: rail placard must not collide with the meter panel ----------
  // The placard is drawn on the canvas in 1280x720 space; the meter panel is a
  // DOM element in a uniformly scaled #frame. Compare them in canvas space.
  const layout = await page.evaluate(() => {
    const T = CB.physics.TABLE;
    const frame = document.getElementById('frame').getBoundingClientRect();
    const meter = document.getElementById('meter-wrap').getBoundingClientRect();
    const scale = frame.width / 1280;
    const plates = window.__placard.slice();
    // Centre pocket keep-out band on the bottom rail.
    const pocketX = T.x + T.w / 2, pocketR = CB.physics.POCKET_R;
    return {
      plates,
      placardY: plates.length ? Math.max(...plates.map(p => p.y)) : null,
      meterTopY: (meter.top - frame.top) / scale,
      railBottomY: T.y + T.h + 34,
      // A plate is centred on its x (textAlign is 'center' when drawn).
      throughPocket: plates.filter(p =>
        p.x - p.w / 2 < pocketX + pocketR && p.x + p.w / 2 > pocketX - pocketR).map(p => p.text)
    };
  });
  check('placard draw calls were observed', layout.plates.length > 0,
    layout.plates.length + ' plate(s)');
  check('rail placard sits above the meter panel',
    layout.placardY !== null && layout.placardY < layout.meterTopY,
    `placard y=${layout.placardY}, panel top y=${layout.meterTopY.toFixed(0)}`);
  check('rail placard sits on the rail, not floating below it',
    layout.placardY !== null && layout.placardY < layout.railBottomY,
    `placard y=${layout.placardY}, rail bottom y=${layout.railBottomY}`);
  check('no placard plate runs through the centre pocket',
    layout.throughPocket.length === 0,
    layout.throughPocket.length ? 'collides: ' + layout.throughPocket.join(' / ') : '');

  // ---- No errors anywhere along the way ------------------------------------
  check('no console or page errors during a full shot cycle', errors.length === 0,
    errors.join(' | '));
} finally {
  await browser.close();
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length) {
  console.log('Failed: ' + failed.map(r => r.name).join('; '));
  process.exit(1);
}
