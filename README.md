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

No build step, no dependencies. Either:

- open `index.html` directly in a browser, or
- serve the folder: `python3 -m http.server` and visit http://localhost:8000

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

### Constant motion

There is **no friction**. The slingshot sets a kinetic energy and the table
holds it exactly — particles careen and bounce at constant speed and never slow
down. A shot only ends when you **pot a ball** (everything freezes and you line
up the next one) or when the game ends. The longer particles run unpotted, the
faster causal complexity accrues, so a shot that pots nothing eventually strains
reality into a universe. The pressure is simple: **pot something, fast.**

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

## How you lose

**Rule 1 — No Universes.** Every collision generates causal complexity (the
top meter). Normally it dissipates. But if collisions form a self-sustaining
causal loop (A → B → C → A) while complexity is critical:

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

## Progression

Eight sectors. Early on it's just *don't create a universe*. Then recursion
switches on (Rule 2). Sector 4 introduces the memory and Rule 3. Late sectors
run all three disasters at once with lowered thresholds — and sometimes require
you to deploy a permitted, pocket-sized Big Bang to move a particle that has
*declined to participate in causality*.

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

## Code layout

- `js/engine.js` — utilities, particles, camera, starfield
- `js/physics.js` — table geometry, ball collisions, pockets, aim raycasts, and the forward simulator that generates ghost futures
- `js/cosmic.js` — Rule 1 (causal graph + loop detection) and Rule 2 (the hidden Mandelbrot iterator), plus micro-universe gravity wells
- `js/memory.js` — Rule 3: the permanent trajectory memory, its compressibility / self-reference / predictiveness estimate, and demon detection
- `js/levels.js` — the eight sectors and their thresholds
- `js/game.js` — game states, input, rendering, cinematics, the deadpan referee

Plain ES5-ish scripts on a shared `CB` namespace so the game runs from
`file://` with no server and no bundler.
