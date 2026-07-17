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
        'Welcome to the Table Inspection Division.',
        'The balls on this table are fundamental particles. When you aim, you will see the ghost-ball futures: hundreds of faint trajectories, one for every tiny variation of your shot. This is the cloud of everything the shot could become. Reality records all of it.',
        'Keep the CAUSAL COMPLEXITY meter out of the GAME OVER band. If interactions form a self-sustaining loop while complexity is critical, a universe will occur, and you will be responsible for it.'
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
        'A routine six-particle table. Prior inspector retired abruptly after what the file describes only as “an incident involving geometry.”',
        'Gentle shots generate less causal complexity, and a tighter uncertainty cloud. Hard breaks are legal, spectacular, and how most universes happen.'
      ],
      setup(out) { cue(out); rack(3, cx, cy, out); }
    },
    {
      name: 'SECTOR 03 — RECURSION ADVISORY',
      objective: 'Pot all particles. Avoid creating additional mathematics.',
      universeThreshold: 12, complexityMult: 1, mandelMult: 1, demonThreshold: Infinity, memoryMult: 1, permits: 0,
      briefing: [
        'This table sits inside a known recursive attractor. Each shot seeds an iteration sequence; most sequences diverge harmlessly.',
        'If yours remains bounded, iterations will accumulate and the table will begin to contain smaller copies of itself. At iteration 500 containment fails. Potting a particle vents accumulated mathematics through the pocket aperture.'
      ],
      setup(out) { cue(out); rack(3, cx, cy, out); }
    },
    {
      name: 'SECTOR 04 — THE TABLE REMEMBERS',
      objective: 'Pot all particles. Leave behind a simple history.',
      universeThreshold: 12, complexityMult: 1, mandelMult: 0, demonThreshold: 32, memoryMult: 1, permits: 0,
      briefing: [
        'New this sector: the EMERGENT INFORMATION meter. Every trajectory you have ever shot is stored permanently on the felt — you can see it accumulating as faint residue.',
        'The Bureau treats that history as information. When it becomes too self-referential — when new shots retrace old ones, when the memory starts predicting itself — it stops being a record and becomes an entity.',
        'Take simple, varied shots. If the second meter fills: DEMON DETECTED. You will have accidentally created life, and the paperwork for life is enormous.'
      ],
      setup(out) { cue(out); rack(3, cx, cy, out); }
    },
    {
      name: 'SECTOR 05 — CAUSAL STORM',
      objective: 'Pot all particles during elevated background causality.',
      universeThreshold: 8.5, complexityMult: 1.25, mandelMult: 1.2, demonThreshold: 40, memoryMult: 1, permits: 0,
      briefing: [
        'Background causality in this sector is elevated. All three thresholds have been lowered accordingly, which the Bureau agrees is unfair.',
        'Complexity dissipates over time; the memory does not. Waiting between shots cools the first meter but never the second. The simplest possible history is the winning history.'
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
        'The dark particle on this table has DECLINED TO PARTICIPATE IN CAUSALITY. Cue impacts will barely move it. This is legal under the Particle Autonomy Act.',
        'You have been issued 2 (two) BIG BANG PERMITS. Press U, then click the table, to deploy a temporary micro-universe. Its gravitational field will move what billiards cannot — the ghost futures will curve to show it.',
        'Micro-universes expire at heat death (~7 seconds) and generate administrative complexity while active. Yes, you are being asked to solve pool with cosmology. No, there is no other way.'
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
        'Two inert particles, an active recursive attractor, a brisk complexity ceiling, and a memory that fills faster than standard.',
        'Deploying a universe to fix a problem caused by a universe is a proud Bureau tradition. Note that repeated Big Bang placements in the same region look, to the memory, a great deal like intent.'
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
        'Ten particles. One inert. Low cosmogenesis ceiling, active recursion, an itchy memory, three permits.',
        'Clear this table and you will be certified to inspect recreational spacetime unsupervised. The Bureau thanks you in advance and has pre-filled three incident reports — universe, mathematics, and life — just in case.'
      ],
      setup(out) { cue(out); rack(4, cx, cy, out);
        out.push(eight(T.x + T.w - 80, T.y + 70, true));
      }
    }
  ];
})();
