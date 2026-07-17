// Cosmic Billiards — shared namespace + small engine utilities.
var CB = window.CB = {};

(function () {
  const U = CB.util = {};

  U.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.pick = arr => arr[(Math.random() * arr.length) | 0];
  U.easeOut = t => 1 - Math.pow(1 - t, 3);
  U.easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  // Format huge deadpan numbers: "4.7 × 10⁹"
  const SUP = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹' };
  U.bignum = function (mantissa, exp) {
    const e = String(exp).split('').map(c => SUP[c] || c).join('');
    return mantissa.toFixed(1) + ' × 10' + e;
  };
})();

// ---------------------------------------------------------------------------
// Particles: sparks (collisions), stars (backdrop), galaxy swirl (universes).
// ---------------------------------------------------------------------------
(function () {
  const P = CB.particles = { list: [] };

  P.clear = function () { P.list.length = 0; };

  P.spark = function (x, y, n, speed, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      P.list.push({
        kind: 'spark', x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0, maxLife: 0.25 + Math.random() * 0.35,
        size: 1 + Math.random() * 2, color
      });
    }
  };

  // A slowly-forming spiral galaxy centered on (x, y).
  P.galaxy = function (x, y, n) {
    for (let i = 0; i < n; i++) {
      const arm = (Math.random() * 3) | 0;
      const r = 4 + Math.random() * 150;
      const a = arm * (Math.PI * 2 / 3) + r * 0.035 + Math.random() * 0.5;
      P.list.push({
        kind: 'star', cx: x, cy: y,
        r, a, spin: (0.9 + Math.random() * 0.6) * (26 / (r + 10)),
        life: 0, maxLife: 6 + Math.random() * 4,
        size: 0.6 + Math.random() * 1.8,
        color: Math.random() < 0.12 ? '#ffd9a0' : (Math.random() < 0.5 ? '#bfe6ff' : '#ffffff')
      });
    }
  };

  P.update = function (dt) {
    const L = P.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.life += dt;
      if (p.life >= p.maxLife) { L.splice(i, 1); continue; }
      if (p.kind === 'spark') {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.9; p.vy *= 0.9;
      } else if (p.kind === 'star') {
        p.a += p.spin * dt;
        p.r += 2.5 * dt; // slow expansion of the newborn cosmos
      }
    }
  };

  P.draw = function (ctx) {
    for (const p of P.list) {
      const t = p.life / p.maxLife;
      ctx.globalAlpha = p.kind === 'star'
        ? Math.min(1, p.life * 2) * (1 - t * t)
        : 1 - t;
      ctx.fillStyle = p.color;
      if (p.kind === 'spark') {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else {
        const x = p.cx + Math.cos(p.a) * p.r;
        const y = p.cy + Math.sin(p.a) * p.r * 0.62; // slight galactic tilt
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };
})();

// ---------------------------------------------------------------------------
// Camera: pan/zoom with tweening + screen shake. World is 1280x720.
// ---------------------------------------------------------------------------
(function () {
  const cam = CB.camera = {
    x: 640, y: 360, scale: 1,
    shake: 0,
    tween: null
  };

  cam.reset = function () {
    cam.x = 640; cam.y = 360; cam.scale = 1; cam.shake = 0; cam.tween = null;
  };

  cam.zoomTo = function (x, y, scale, dur) {
    cam.tween = { fx: cam.x, fy: cam.y, fs: cam.scale, tx: x, ty: y, ts: scale, t: 0, dur };
  };

  cam.addShake = function (amt) { cam.shake = Math.min(18, cam.shake + amt); };

  cam.update = function (dt) {
    if (cam.tween) {
      const tw = cam.tween;
      tw.t += dt;
      const k = CB.util.easeInOut(Math.min(1, tw.t / tw.dur));
      cam.x = CB.util.lerp(tw.fx, tw.tx, k);
      cam.y = CB.util.lerp(tw.fy, tw.ty, k);
      cam.scale = CB.util.lerp(tw.fs, tw.ts, k);
      if (tw.t >= tw.dur) cam.tween = null;
    }
    cam.shake = Math.max(0, cam.shake - 40 * dt);
  };

  cam.apply = function (ctx) {
    const sx = (Math.random() - 0.5) * cam.shake;
    const sy = (Math.random() - 0.5) * cam.shake;
    ctx.translate(640, 360);
    ctx.scale(cam.scale, cam.scale);
    ctx.translate(-cam.x + sx, -cam.y + sy);
  };
})();

// ---------------------------------------------------------------------------
// Static starfield backdrop (the table floats in regulated space).
// ---------------------------------------------------------------------------
(function () {
  const stars = [];
  for (let i = 0; i < 130; i++) {
    stars.push({
      x: Math.random() * 1280, y: Math.random() * 720,
      s: Math.random() * 1.4 + 0.3,
      tw: Math.random() * Math.PI * 2,
      sp: 0.5 + Math.random() * 1.5
    });
  }
  CB.drawBackdrop = function (ctx, time) {
    ctx.fillStyle = '#04070c';
    ctx.fillRect(0, 0, 1280, 720);
    for (const s of stars) {
      ctx.globalAlpha = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(time * s.sp + s.tw));
      ctx.fillStyle = '#cfe2ee';
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    ctx.globalAlpha = 1;
  };
})();
