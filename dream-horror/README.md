# Hollow Lullaby — first-person 3D dream horror (browser prototype)

Single-page Three.js game. Textures, models and audio are all procedural, so there are no assets to download.

## Run
```
cd dream-horror
python3 -m http.server 8000     # then open http://localhost:8000
```
(Opening `index.html` directly also works.) Use headphones.

Debug: `index.html?debug#ch=2` jumps to a chapter (0 bedroom, 1 hallway, 5 Bureau, 2 house, 3 sleeper, 4 Verdant demo, 6 combat sessions).
Add `seed=1234` to the query string to replay a specific dream session.

**The world and its story are in [`WORLD.md`](WORLD.md)**: the Oxygen Tax, inflation, the Concord Greening Loans that grow poor volunteers into crops, and Aurel's tinnitus resonance.

## Controls
WASD move · Shift run · mouse look (arrow keys also work) · **E** interact · **F** flashlight · hold **Q** close your eyes · hold **R** listen (tinnitus)

In the Oxygen Tax Bureau: click the buttons or press **1** approve · **2** deny · **3** refer.

## New systems
- **Dream sessions:** each run rolls a seed with 1–5 strangeness modifiers (tilted horizon, child height, breathing walls, red tide, negative moon, double vision…). The seed is shown on the title screen, and **Reroll the dream** picks another.
- **Tinnitus resonance:** a constant ringing that rises with fear. Hold **R** to tune into it. Colour drains and the sound ducks, and **empathy echoes** of the people you processed appear. Press **E** on an echo to hear it (+sanity). There are 10 to find.
- **Waking: the Oxygen Tax Bureau:** a Papers, Please-style shift. Check permits, receipts, seals and Greening Loans against changing rules (two inflation hikes and Directive 7-C). Choices (citations, the mole) carry into the ending.

- **Combat sessions (2.5D, Hotline Miami × Superhot):** click **Combat sessions** on the title screen. A top-down neon raid on three floors of a Concord clinic. Everyone dies in one hit, including you. **Time moves only when you move:** standing still nearly freezes bullets, and shooting or swinging lets time run briefly. Pick up and throw pipes, pistols and shotguns, swing a melee weapon to slice incoming bullets, and chain kills for combos. Restart a floor instantly with **R**. Enemy weapons and random enemies vary with the dream-session seed. Grade at the end (S/A/B/C).
  Controls: WASD move · mouse aim · left click attack/shoot · right click or E throw / pick up · R restart · Esc pause.

## The dream
0. **The Bedroom**: wind the music box. Something watches from the dark and leaves when you look.
1. **The Hallway That Repeats**: a P.T.-style loop. The paintings and lights change each lap, doors slam behind you. Forward is not the way out.
   - **Waking: The Oxygen Tax Bureau**: Aurel's day job, between the hallway and the house.
2. **The Drowned House**: find the horse, the ball and the letter while the **Watcher** stalks you. It only moves when you aren't looking at it. Staring drains your grip. Closing your eyes restores it, but the Watcher advances faster.
3. **The Sleeper**: a long walk between statues that turn toward you whenever you look away, to a bed with someone already in it.

### Demo: The Verdant (plant-man monster)
Click **Demo: The Verdant** on the title screen (or open `index.html?debug#ch=4`).

*World:* the city's **Concord Program** used genetics to improve society: no hunger, no disease, no violence. Plant genes made
volunteers calm, cooperative and fed by light. Nobody asked what they were becoming. The **Verdant** is the result: a hunched plant-human with a
face inside an opening flower collar, glowing ribs and a pulsing seed pod, drifting spores and thorned arms.

*Behaviour (the opposite of the Watcher):* it is **phototropic**. With your flashlight on it grows toward you fast; in the dark it is slower, but darkness drains your grip.
Running is loud and attracts it. It stays rooted like an ordinary plant until you take the first page. Read all three program notes to open the hatch.

Sanity ("grip") shows as the small bar bottom-left and drives the image warp, grain, whispers, flashlight flicker and hallucinated figures at the edge of your vision.

`UE5_TUTOR_ROADMAP.md` maps each mechanic to Unreal Engine 5 C++ lessons.

`three.min.js` is vendored (three r160, MIT licence).
