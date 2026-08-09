# DEMON BILLIARDS
### Bureau of Recreational Cosmology · Table Inspection Division

You're a cosmic billiards operator. The objective is simple:

> **Pot the balls. Don't create a universe. Don't create a Mandelbrot set. Don't create a demon.**

The problem is that every shot is recorded by reality.

The balls are fundamental particles, and every collision slightly alters the
mathematics of reality. Most shots are safe. Some create runaway complexity.
The referee treats accidentally inventing a cosmos as an ordinary pool foul.

> **FOUL:** Created sentient life. −2 points

## Play

No build step, no dependencies, **no server**. Just open the file:

| | |
| --- | --- |
| macOS / Linux | `open index.html` |
| Windows (CMD or PowerShell) | `start index.html` |
| any OS | double-click `index.html` |

It runs fully from `file://`, including the cross-session scar memory. A local
server is optional and buys you nothing — but if you want one anyway, use
`npx serve`, or `py -m http.server 8000` on Windows (plain `python3` is usually
a Microsoft Store stub that isn't installed).

**Controls**

| Input | Action |
| --- | --- |
| Click + drag from the cue ball | Aim. The **ghost-ball futures** show the shot's uncertainty cloud |
| Release | Shoot |
| `U`, then click the table | Deploy a sanctioned micro-universe (when permits are issued) |
| `Esc` | Cancel Big Bang placement |

## The core mechanic: the probability wave

When you aim, the game fans out dozens of tiny variations of your shot into a
**probability wave** — a big glowing cloud of possible futures. It's computed in
two passes: the first measures where those futures pile up (a density field);
the second re-simulates the wave with **gravity toward the densest regions**, so
it self-focuses into the channels reality prefers. The wave is repelled by the
spacetime scars of past shots (see below), so it weaves around your history.

Gentle shots produce a tight, bright wave; hard breaks spray into chaos. When
you **let go, the wave collapses** — the whole superposition of futures contracts
to the single realized trajectory, and then you watch the sim play it out.

The wave is the most expensive thing the game does, and it runs while you aim, so
it **adapts to your machine**: it measures its own recompute cost and sheds
trajectories (down to a floor) and recomputes less often until it fits inside the
frame. A fast machine shows a denser cloud; a slow one shows a thinner cloud but
keeps the aim responsive. That trade is deliberate — dragging to aim needs to
feel immediate more than the cloud needs to be thick.

### Constant motion

There is **no friction**. The slingshot sets a kinetic energy and the table
holds it exactly — particles careen and bounce at constant speed and never slow
down. A shot ends when you **pot a ball** (everything freezes and you line up the
next one), when the game ends, or when the **shot clock** runs out — because with
no friction a miss would otherwise careen forever while you watched it. The
Bureau gives a shot 5 seconds to achieve something, or 12 while a micro-universe
is deployed, since watching particles fall into **orbit** is the point there.

### Complexity is deviation from prediction

When a shot fires, the Bureau records the **predicted Newtonian trajectory** of
every ball — where pure physics says they'll go. The accumulated history (the
spacetime-scar field) then bends the real balls *off* that prediction, and the
size of that deviation is the causal complexity. Enough sustained deviation and
you get **UNIVERSE DETECTED**. A clean table predicts perfectly, so it's safe;
a heavily-scarred one drags reality far from prediction and is dangerous. Orbits
count as predicted motion, so they never raise complexity. The lesson is the
same: **keep the history simple.**

Every trajectory you actually shoot is then recorded **permanently** on the
felt as faint residue. The table slowly accumulates a history of every shot
ever taken, and that history is not just decoration — it drives the third loss
condition, it physically **scars spacetime**, and it survives page reloads.

### Spacetime scarring

Accumulated history calcifies into **scar tissue**: a deterministic force field
that pushes balls *away* from ground previous shots have worn down. The more you
play the same lines, the more the table fights you — worn regions visibly glow
and bend your shots off course. Because the scar force is deterministic (no
randomness), the ghost-futures cloud simulates it exactly, so what you see while
aiming is what you get.

### The table remembers across sessions

The scar grid persists in `localStorage`, so the felt genuinely remembers every
session you've ever played — the title screen tells you how many trajectories it
has kept. Use **Clear Timeline History** to wipe it and start on clean felt.

## Reading the instruments

Each regulatory meter shows the bar, the **raw value against this sector's
threshold** (`9.7 / 14`), and a status word — `STABLE` / `ELEVATED` / `CRITICAL`,
banded to the tick marks on the bar. A rule that isn't armed in the current
sector reads a dimmed `OFFLINE` rather than a reassuring zero — so a rule that
doesn't exist yet no longer looks like a rule you're comfortably passing. In
sector 1 that means *both* meters read `OFFLINE`, which is the honest reading
(see Progression).

## How you lose

**Rule 1 — No Universes.** Causal complexity (the top meter) is *deviation from
prediction*: the Bureau records where pure Newtonian physics says every ball will
go, and the accumulated scar field then drags the real balls off that path. The
size of that gap accumulates as complexity, and dissipates when the table is
calm. Push it past the sector threshold and:

> **GAME OVER — Universe Formation Detected**

The camera zooms into the collision point and galaxies start forming. You've
created a spacetime region that now requires administration.

**Rule 2 — No Mandelbrot Sets.** Each shot secretly seeds an iteration
sequence *z = z² + c* near the Mandelbrot boundary; every collision iterates
it. Most sequences diverge harmlessly. If yours stays bounded, the table
starts spawning smaller copies of itself — *Iteration 42… 87… 213…* — until:

> **GAME OVER — Mandelbrot Containment Failure**

You accidentally created infinite mathematics. Potting a particle vents
accumulated mathematics through the pocket aperture.

**Rule 3 — No Demons.** The accumulated trajectory memory is treated as
information (the bottom meter, *EMERGENT INFORMATION*). The game estimates how
complex the stored history has become — how poorly it compresses, how
self-referential it is (new shots retracing old ones), how well it predicts
future shots. When the memory effectively becomes an entity:

> **GAME OVER — Demon Detected. Emergent Information Structure Exceeds Safe Limits.**

You accidentally created life. **The ideal player doesn't just sink balls —
they leave behind the simplest possible history.**

## Color-sorting pockets

**Tap any pocket** to cycle a colour filter onto it. A filtered pocket *attracts*
that particle flavour and *repels* the wrong ones — a gravitational sorting bin.
Sink the right particle in the right bin for a bonus; drop a wrong one in and
it's a foul that strains causality (and the referee will let you know). The
sorting field is deterministic and lives inside the physics step, so the shadow
prediction and the probability wave both account for it — it steers your shots
but never counts as history-deviation on its own.

## Tidiness rating

Clearing a sector grades you on how little you disturbed reality — the pitch's
"leave the simplest possible history." It's read straight off the real
peak-complexity metric (S = reality didn't notice you; D = a cosmos-adjacent
mess), because the whole point is that the disturbance is *real*.

## Progression

Eight sectors, and the hazards arm one at a time. Sectors 1–2 are genuinely
unloseable: complexity comes only from scar-driven deviation, and the early felt
has no scars, so both meters read `OFFLINE`. Recursion (Rule 2) switches on in
sector 3. Sector 4 is the real beginning — it turns on scarring, so Rule 1
finally becomes reachable, and introduces the memory and Rule 3 together. Late
sectors run all three disasters at once with lowered thresholds — and sometimes
require you to deploy a permitted, pocket-sized Big Bang to move a particle that
has *declined to participate in causality*.

| Sector | Rule 1 universe | Rule 2 mandelbrot | Rule 3 demon |
| --- | --- | --- | --- |
| 1–2 | — | — | — |
| 3 | — | ✓ | — |
| 4 | ✓ | — | ✓ |
| 5–8 | ✓ | ✓ | ✓ |

The opening sectors being safe is deliberate: the Bureau threatens you long
before it can actually do anything about you.

## Tone

The joke is that everyone in this universe considers accidentally creating a
cosmos to be a routine billiards mistake. The game never explains whether the
universes, mathematics, or demons are *actually* being created. It just acts
like it's obvious.

> Referee Decision: Universe Invalid
>
> Shot Cancelled Due To Excessive Ontology
>
> Penalty: 2 Points For Demon Formation

## Tests

There is a browser smoke test that loads the game the way players actually load
it — `file://`, no server, no bundler — and asserts the things that would rot
silently:

- all six scripts land on the `CB` namespace, and `localStorage` works from a
  file origin (so scar persistence survives);
- a shot can be aimed and fired, and **the probability wave predicts the speed
  the shot actually fires at** — the preview and the real shot read their speed
  from one `shotSpeed()`, and drift between them is a bug;
- **a missed shot ends on its own.** There is no friction, so nothing else can
  end one;
- no ball tunnels a cushion at top speed, and travel per substep stays inside
  the ball radius;
- the gauges read correctly armed *and* unarmed, and the rail placard clears both
  the meter panel and the centre pocket.

```bash
cd test && npm install && npm test
```

**The game itself still has zero dependencies.** The harness is confined to
`test/` with its own `package.json`, so nothing in the repo root needs
installing to play. It runs on every push via `.github/workflows/ci.yml`.

## Code layout

- `js/engine.js` — utilities, particles, camera, starfield
- `js/physics.js` — table geometry, ball collisions, pockets, aim raycasts, and the forward simulator that generates ghost futures
- `js/cosmic.js` — Rule 1 (`deviationStrain`: complexity accumulated from departure off the predicted path) and Rule 2 (the hidden Mandelbrot iterator), plus micro-universe gravity wells
- `js/memory.js` — Rule 3: the permanent trajectory memory, its compressibility / self-reference / predictiveness estimate, and demon detection
- `js/levels.js` — the eight sectors and their thresholds
- `js/game.js` — game states, input, rendering, cinematics, the deadpan referee

Plain ES5-ish scripts on a shared `CB` namespace so the game runs from
`file://` with no server and no bundler.
