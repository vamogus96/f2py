# Development log: every exchange

A running record of each request made during the development of Hollow Lullaby, what was done about it, what was decided, and how it was checked.
This is a **summary**, not a verbatim transcript: requests are quoted or paraphrased closely, and the verification column lists what was actually run.
New exchanges are appended at the bottom. Commit hashes refer to `git log -- dream-horror`.

| # | Request (as given) | Outcome | Commit |
|---|---|---|---|
| 1 | "Elaborate a game horror game which elaborate dream in pov and 3d" | First-person 3D dream horror in Three.js: bedroom, repeating hallway, drowned house with a Watcher that moves only when unseen, the Sleeper. Procedural textures and audio, sanity system, post-process shader. | `2f238f9` |
| 2 | Two screenshots about learning **Unreal Engine 5 C++** with an AI tutor; question asked "UE5 plan, web prototype, or both?" → **both** | `UE5_TUTOR_ROADMAP.md` maps every mechanic to UE5 classes with tutor-style lessons. The browser prototype is the design reference. | `2f238f9` |
| 3 | "Use claude code mod for discount content" | Unclear (typo for Discord? promo content?). Asked; the answer was "no preference". **Nothing built**; asked for a one-sentence description. | none |
| 4 | "Add a demo of the monster like a plant man monster, in this world use genetics for improve society" | The **Verdant**, a phototropic plant-human (fast toward light, slow in the dark). Greenhouse demo, three program notes, the **Concord Program** lore. | `3364209` |
| 5 | "Add a background, alternate session dream for variating the strangeness… dreams and empathy have a resonance the same as the acouphene of the protagonist… Oxygen Tax like a Mole and/or Papers Please… biotech vegetables and plants from voluntary poor people for loans and inflation" | **Dream sessions** (seed, 1–5 distortions), **tinnitus resonance** (hold R, empathy echoes), the **Oxygen Tax Bureau** (10 applicants, inflation hikes, Directive 7-C, the mole), `WORLD.md`. | `ee31137` |
| 6 | "Sessioni di combattimento 2.5D like Hotline Miami and Superhot" | Top-down neon combat: one-hit kills, **time moves only when you move**, weapons to throw, 3 floors, combo and grade. | `ba2a058` |
| 7 | "Add a person selection for derive the money of the family" | Household table: choose Aurel, Ilse or Nora and decide who gets oxygen, food, medicine; loan with dependants as collateral; consequences in the dreams. | `aefe721` |
| 8 | "Add a dream about a pirate during a battle and create a multiplayer naval battle, modern space pirate and mercenary… city of Poors in Fool Night… after 2100… family of engineers that lost the job… daytime activity: jobs low/medium/high, bus time, medicines and drugs, cooking, PCB and lathe" | 2147 setting. **Daytime planner** (jobs, bus, pharmacy and alley, cooking, PCB, lathe), **Captain's Watch** first-person pirate dream, **Void battle** (solo bots or online with `server.js`), parts crafted by day upgrade the ship. | `43e190d` |
| 9 | "Pcb soldering tutorial for the gameplay" | **Soldering mini-game** (heat, feed, release) in PCB jobs and a 4-step **tutorial with exam and certificate**. A bug found by testing (cold feed then release left a joint stuck) was fixed. | `2b98215`, `44f3302` |
| 10 | Attached `agent_licensing_best_practices` (no instruction) | Treated as a brief for a licensing audit: `THIRD_PARTY_NOTICES.md`, `docs/LICENSING.md` (matrix, directions, templates), `scripts/check-licenses.js`, CI workflow. The project's own licence is left to the owner. Not legal advice. | `4b49f12` |
| 11 | "Use the folder GAME in the notebook" | Looked for `GAME` on the user's computer. It is in the Remote Control list but the computer does not offer it to cloud sessions; fixes suggested (hidden-folder path, app update). | none |
| 12 | "Retry" | The push to GitHub, refused with a 403 in earlier turns, now **succeeded** (9 commits). The GAME folder was still unavailable. | (push) |
| 13 | "Check screens from all kind of gameplay mechanics then improve the quality using best practice and reduced model for develop a better physics of the game" | Captured 18 screens of every mode and reviewed them (see entry 14). Added **reduced-order physics** (`physics.js`) and tests. | see below |
| 14 | "Improve the game and log all the exchanges" | Integrated the physics into every mode, fixed the issues found in the screen review, added reduced-motion and adaptive resolution, and wrote this log. | see below |

## Entry 15 in detail: the Tower raid
- **Interpretation:** "clone of the combat system" is read as the *rules* of the classic top-down one-hit-kill brawler. Rules and mechanics are reimplemented from scratch; no art, music, names or level layouts are copied. "Improvement" is read as cybernetic upgrades.
- **Real names:** the user asked for Intesa Sanpaolo to be the Arasaka Tower. Both are used as in-fiction labels, with a caveat in `docs/LICENSING.md` (trademarks) and a one-string rename path.
- **Engine (`hotline.js`, `hotline-maps.js`):** 4 floors validated by `scripts/test-maps.js`; breadth-first pathfinding over the grid; line-of-sight vision with a cone; noise radius per weapon; doors that open, swing and stun; downed state and execution; combos; implants (`mantis`, `optic`, `reflex`, `dash`, `subdermal`) each with a cyberpsychosis cost; episodes that invert the controls.
- **Verification:** a deterministic Playwright harness freezes the live loop and steps the simulation by hand (`S.frozen`); 25+ assertions cover hearing, vision, knockdown, execution, doors, shooting, plating, combo, restart, episodes, the boss, the blade-runner, floor progression and the day-hub link.

## Infrastructure notes

- The sandbox could not reach cdnjs, so three.js r160 was installed from npm and **vendored** (`three.min.js`).
- GitHub pushes were refused (HTTP 403, Claude had no access to the repository) for most of the session; the work was committed locally every time and pushed once access worked (entry 12).
- Test screenshots were once committed by mistake; they were removed and are no longer tracked.
- Long browser tests were run in the background and polled, because foreground waits were cut off by the environment.

## Entry 13–14 in detail: the screen review and the physics

### Screens reviewed (18)
Menu, bedroom, hallway, drowned house, sleeper, Verdant greenhouse, combat, daytime hub, pirate dream, Bureau, household table, scrap sorting, PCB routing, lathe, cooking, soldering, naval lobby, naval battle.

### Problems found, and fixes
| Finding | Fix |
|---|---|
| Deep links `?debug#ch=7/8/9` left the menu on top: chapters 7–9 register after the code that reads the URL runs | `HL.debugBoot()` is called by the last-loaded module |
| The menu was clipped on short windows | `.screen` scrolls (`justify-content: safe center`) |
| A subtitle from the previous chapter lingered over the next one (seen in the naval view) | `goChapter` clears the subtitle |
| Naval ships overlapped each other (no ship-to-ship collision) | impulse collisions, restitution 0.4, ramming damage |
| Everything depended on the frame rate (variable `dt`) | fixed 1/60 s time step with an accumulator |
| Velocity smoothing used `lerp(v, target, dt*k)`, which is frame-rate dependent | exact exponential relaxation `P.relax` |
| Wall contact only pushed the player out, so the player kept "pushing" and jittered | contacts remove the velocity component into the wall (sliding) |
| Fast bullets and shells were point-tested and could skip thin walls or ships | swept segment tests |
| Ship turning set the heading directly (no inertia) | planar rigid body: yaw inertia, rudder authority that grows with flow, keel drag |

### Reduced-order physics (`physics.js`)
The smallest model that still feels right, per object type, instead of a general rigid-body engine:
- **Characters:** a circle with first-order velocity lag, tunnel-proof sub-stepped movement, sliding contact.
- **Ships:** surge, sway and yaw states with quadratic drag, semi-implicit Euler. Terminal speed `thrust = c1·v + c2·v²` is solved analytically and tested. The keel resists sideways motion about 9× more than forward motion.
- **Projectiles:** straight lines with swept tests.
- **Loop:** a fixed step (1/60 s), at most 6 steps per frame, and the time beyond that is dropped (no spiral of death).
- 17 unit tests (`npm run test:physics`) check frame-rate independence, terminal speed, momentum conservation, restitution, sliding, tunnelling and stability at 30 Hz.

### Quality and accessibility additions
- **Reduced motion:** `?calm=1`, or the operating system's "reduce motion" setting, disables camera roll, FOV kicks, shake and breathing walls.
- **Adaptive resolution:** the render scale drops to protect the frame rate and recovers when there is headroom (`?quality=high` pins it; automation is pinned).
