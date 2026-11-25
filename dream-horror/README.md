# Hollow Lullaby — first-person 3D dream horror (browser prototype)

Single-page Three.js game. Textures, models and audio are all procedural, so there are no assets to download.

## Run
```
cd dream-horror
python3 -m http.server 8000     # then open http://localhost:8000
```
(Opening `index.html` directly also works.) Use headphones.

Debug: `index.html?debug#ch=2` jumps straight to chapter 3 (0-based).

## Controls
WASD move · Shift run · mouse look (arrow keys also work) · **E** interact · **F** flashlight · hold **Q** close your eyes

## The dream
0. **The Bedroom**: wind the music box. Something watches from the dark and leaves when you look.
1. **The Hallway That Repeats**: a P.T.-style loop. The paintings and lights change each lap, doors slam behind you. Forward is not the way out.
2. **The Drowned House**: find the horse, the ball and the letter while the **Watcher** stalks you. It only moves when you aren't looking at it. Staring drains your grip. Closing your eyes restores it, but the Watcher advances faster.
3. **The Sleeper**: a long walk between statues that turn toward you whenever you look away, to a bed with someone already in it.

Sanity ("grip") shows as the small bar bottom-left and drives the image warp, grain, whispers, flashlight flicker and hallucinated figures at the edge of your vision.

`UE5_TUTOR_ROADMAP.md` maps each mechanic to Unreal Engine 5 C++ lessons.

`three.min.js` is vendored (three r160, MIT licence).
