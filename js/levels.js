// Cosmic Billiards — sector definitions.
(function () {
  const PH = CB.physics;
  const T = PH.TABLE;

  // Particle flavors for object balls.
  const FLAVORS = [
    { label: 'e⁻', color: '#4fc3f7', glow: '#4fc3f7' },
    { label: 'μ',  color: '#ba68c8', glow: '#ba68c8' },
    { label: 'τ',  color: '#f06292', glow: '#f06292' },
    { label: 'ν',  color: '#aed581', glow: '#aed581' },
    { label: 'γ',  color: '#ffd54f', glow: '#ffd54f' },
    { label: 'q',  color: '#ff8a65', glow: '#ff8a65' },
    { label: 'H',  color: '#90a4ae', glow: '#cfd8dc' },
    { label: 'Ω',  color: '#7986cb', glow: '#7986cb' },
    { label: 'W',  color: '#4db6ac', glow: '#4db6ac' },
    { label: 'Z',  color: '#dce775', glow: '#dce775' }
  ];

  // Triangle rack of n rows with apex at (ax, ay), opening toward -x.
  function rack(rows, ax, ay, out, opts) {
    const r = PH.BALL_R, gap = r * 2 + 1.5;
    let f = 0;
    for (let row = 0; row < rows; row++) {
      for (let k = 0; k <= row; k++) {
        const fl = FLAVORS[f++ % FLAVORS.length];
        out.push(PH.makeBall(
          ax + row * gap * 0.87,
          ay + (k - row / 2) * gap,
          Object.assign({}, fl, opts)
        ));
      }
    }
  }

  function cue(out) {
    out.push(PH.makeBall(PH.HEAD_SPOT.x, PH.HEAD_SPOT.y, {
      cue: true, color: '#f4f6f8', glow: '#ffffff', label: ''
    }));
  }

  function eight(x, y, inert) {
    return PH.makeBall(x, y, {
      label: '8', color: '#1c2430', glow: '#8899aa', inert: !!inert
    });
  }

  const cx = T.x + T.w * 0.68, cy = T.y + T.h / 2;

  CB.LEVELS = [
    {
      name: 'SECTOR 01 — ORIENTATION',
      objective: 'Pot all particles. Do not create a universe.',
      universeThreshold: 14, complexityMult: 0.8, mandelMult: 0, demonThreshold: Infinity, memoryMult: 1, permits: 0,
      briefing: [
        'Welcome to the Table Inspection Division, goof. We had other applicants. We chose you. We think about this daily.',
        'The balls are fundamental particles. When you aim, you’ll see the ghost-ball futures: hundreds of faint trajectories, one for every way this could go wrong. Reality records every single one, including the ones where you clearly weren’t trying.',
        'Keep the CAUSAL COMPLEXITY meter out of the GAME OVER band. Form a self-sustaining loop while it’s critical and you make a universe. Or — thought exercise — don’t, and go outside instead. Your call. It’s three particles. How hard could it be. (Very.)'
      ],
      setup(out) { cue(out);
        out.push(PH.makeBall(cx - 40, cy, FLAVORS[0]));
        out.push(PH.makeBall(cx + 60, cy - 70, FLAVORS[4]));
        out.push(PH.makeBall(cx + 60, cy + 70, FLAVORS[5]));
      }
    },
    {
      name: 'SECTOR 02 — STANDARD INSPECTION',
      objective: 'Pot all particles. Do not create a universe.',
      universeThreshold: 12, complexityMult: 1, mandelMult: 0, demonThreshold: Infinity, memoryMult: 1, permits: 0,
      briefing: [
        'A routine six-particle table. The last inspector retired after “an incident involving geometry.” They also should have gone outside. They did not. Learn from them, goof.',
        'Gentle shots make less complexity and a tighter cloud. Hard breaks are spectacular, legal, and how most universes get made by people exactly like you.'
      ],
      setup(out) { cue(out); rack(3, cx, cy, out); }
    },
    {
      name: 'SECTOR 03 — RECURSION ADVISORY',
      objective: 'Pot all particles. Avoid creating additional mathematics.',
      universeThreshold: 12, complexityMult: 1, mandelMult: 1, demonThreshold: Infinity, memoryMult: 1, permits: 0,
      briefing: [
        'This table sits inside a recursive attractor. Each shot seeds an iteration sequence; most diverge harmlessly. Yours won’t, because nothing you do is harmless, goof.',
        'If it stays bounded, the table starts containing smaller copies of itself, and at iteration 500 containment fails. Potting a particle vents the mathematics. You know what else vents mathematics? Being at a park, having none of these problems.'
      ],
      setup(out) { cue(out); rack(3, cx, cy, out); }
    },
    {
      name: 'SECTOR 04 — THE TABLE REMEMBERS',
      objective: 'Pot all particles. Leave behind a simple history.',
      universeThreshold: 12, complexityMult: 1, mandelMult: 0, demonThreshold: 32, memoryMult: 1, permits: 0,
      briefing: [
        'New meter, goof: EMERGENT INFORMATION. Every trajectory you’ve ever shot is stored on the felt forever, as faint residue, like a permanent record of your worst decisions. Which it is.',
        'We treat that history as information. When it gets too self-referential — new shots retracing old ones, the memory predicting itself — it stops being a record and becomes an entity. An entity that has watched you play. Imagine.',
        'Take simple, varied shots. Fill the second meter and it’s DEMON DETECTED: you’ll have created life, and the paperwork for life is enormous. The paperwork for going outside is zero. Just saying.'
      ],
      setup(out) { cue(out); rack(3, cx, cy, out); }
    },
    {
      name: 'SECTOR 05 — CAUSAL STORM',
      objective: 'Pot all particles during elevated background causality.',
      universeThreshold: 8.5, complexityMult: 1.25, mandelMult: 1.2, demonThreshold: 40, memoryMult: 1, permits: 0,
      briefing: [
        'Background causality is elevated here, so all three thresholds are lower. Is it unfair? Yes. Are we lowering them anyway? Also yes. Consider it motivation to go outside, goof.',
        'Complexity dissipates over time; the memory never does. Waiting cools the first meter, never the second. The simplest history wins — a bar so low that even you, allegedly, could clear it.'
      ],
      setup(out) { cue(out); rack(3, cx, cy, out);
        out.push(PH.makeBall(T.x + 180, T.y + 110, FLAVORS[7]));
      }
    },
    {
      name: 'SECTOR 06 — SANCTIONED BIG BANG',
      objective: 'Pot all particles. The inert particle requires gravitational assistance.',
      universeThreshold: 11, complexityMult: 1, mandelMult: 1, demonThreshold: 44, memoryMult: 1, permits: 2,
      briefing: [
        'The dark particle has DECLINED TO PARTICIPATE IN CAUSALITY. Cue impacts barely move it. Frankly, relatable — it also saw you coming and wants no part of this.',
        'You’ve been issued 2 (two) BIG BANG PERMITS. Press U, click the table, deploy a micro-universe; its gravity moves what billiards can’t, and the ghost futures will curve to show it. Yes, you get to make a universe on purpose now. Try to act normal about it, goof.',
        'Micro-universes hit heat death in ~7 seconds and cost complexity while running. You are being asked to solve pool with cosmology. There is no other way. There is, however, a door, and outside it, a normal afternoon.'
      ],
      setup(out) { cue(out);
        out.push(PH.makeBall(cx - 30, cy - 90, FLAVORS[1]));
        out.push(PH.makeBall(cx + 40, cy + 60, FLAVORS[3]));
        out.push(eight(T.x + T.w - 90, T.y + 90, true));
      }
    },
    {
      name: 'SECTOR 07 — ADMINISTRATIVE ZONE',
      objective: 'Pot all particles. Two inert. Recursion and memory both active.',
      universeThreshold: 10, complexityMult: 1.1, mandelMult: 1.3, demonThreshold: 34, memoryMult: 1.15, permits: 3,
      briefing: [
        'Two inert particles, an active recursive attractor, a brisk complexity ceiling, and a memory that fills faster than standard. We set it up special. For you, goof.',
        'Deploying a universe to fix a problem caused by a universe is a proud tradition. Note that dropping Big Bangs in the same spot over and over looks, to the memory, a lot like intent — and to us, a lot like someone who should be at a park.'
      ],
      setup(out) { cue(out); rack(2, cx, cy, out);
        out.push(eight(T.x + T.w - 80, T.y + T.h - 80, true));
        out.push(PH.makeBall(T.x + 90, T.y + 80, Object.assign({}, FLAVORS[6], { inert: true })));
      }
    },
    {
      name: 'SECTOR 08 — THE FULL RACK',
      objective: 'Final certification. All three disasters at once.',
      universeThreshold: 9, complexityMult: 1.2, mandelMult: 1.4, demonThreshold: 30, memoryMult: 1.2, permits: 3,
      briefing: [
        'Ten particles. One inert. Low cosmogenesis ceiling, active recursion, an itchy memory, three permits. Every disaster at once, because we believe in you the exact right amount, which is a little.',
        'Clear this and you’re certified to inspect spacetime unsupervised, a sentence that keeps us up at night. We’ve pre-filled three incident reports — universe, mathematics, life — and one leaflet titled “Have You Considered Going Outside?” Read whichever applies, goof.'
      ],
      setup(out) { cue(out); rack(4, cx, cy, out);
        out.push(eight(T.x + T.w - 80, T.y + 70, true));
      }
    }
  ];
})();
