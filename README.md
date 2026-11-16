# OVERTIME

A portrait, touch-first on-rails shooter set in a 20-floor office tower. You stand in place with a fixed camera. Tap enemies to shoot them. When an area is clear you walk to the next one automatically. Clear every area on a floor, ride the elevator up, and keep climbing until you reach the boardroom.

The look is a low-res, chunky-pixel 3D style in the spirit of mid-90s shooters. Everything is drawn in code at runtime: blocky box models, tiny nearest-filtered textures, flat fluorescent lighting and fog. The game ships no image or audio files. Every texture, model, sound effect and music loop is generated procedurally.

## Play

It's a static web page with no build step. Serve the folder over HTTP (ES modules don't load from `file://`):

```sh
python3 -m http.server 8000
# then open http://localhost:8000 on your phone (same Wi-Fi: http://<your-computer-ip>:8000)
```

On a phone, use "Add to Home Screen" to get a full-screen, portrait app. It also works on desktop with the mouse. Keys: `R` reload, `Q` swap weapon, `Esc` pause.

To host it, push the repo to GitHub and enable **Pages** (Settings → Pages → deploy from branch, root). Any static host works.

## How it plays

- **Tap enemies** to shoot. Headshots do triple damage.
- **Tap incoming fireballs** to destroy them before they hit you.
- Enemies glow and raise their gun just before they fire. Some duck behind desks, cubicle walls and pillars, then pop up to shoot.
- Fast kills chain into a **combo multiplier**.
- Dead enemies sometimes drop **medkits**. Tap them, or they get collected when the area is cleared.
- Each floor has 3–6 areas and ends in an elevator lobby. Reinforcements walk in through the far door, or come out of the side elevators.

### Enemies
| | |
|---|---|
| **Clerk** | Basic gunman. Getting hit cancels his shot. |
| **Temp** | Fast melee rusher. Charges straight at you. |
| **Security** | Armored. Fires three-shot bursts. |
| **Drone** | Flying security bot with fast laser bolts. |
| **Executives** | Bosses on floors 5, 10, 15 and 20. They fire spread shots and call in reinforcements. |

### Weapons
- **Pistol**: 12 rounds, accurate.
- **Shotgun** (unlocks on floor 4): 7-pellet spread.
- **SMG** (unlocks on floor 8): hold to spray.

### The tower
| Floors | Zone |
|---|---|
| 1–4 | Mailroom levels: offices, mailroom, break room |
| 5–9 | Cubicle farm |
| 10–14 | Data center |
| 15–19 | Executive suites |
| 20 | The boardroom |

The city skyline outside the windows sinks lower as you climb.

## Code layout

```
index.html / style.css     HUD, menus, status bar
src/main.js                game loop, input, shooting, area/floor flow, viewmodel
src/level.js               floor + room generator, furniture kits, elevators
src/enemies.js             enemy models, AI, projectiles
src/effects.js             gibs, particles, bullet holes
src/textures.js            procedural pixel-art textures + 3x5 pixel font
src/audio.js               WebAudio synth SFX and music
vendor/three.module.min.js three.js r170 (MIT)
```

## Single-file build

`dist/overtime.html` is the whole game in one self-contained file. It opens directly from disk, so no server is needed. To rebuild it:

```sh
npx esbuild src/main.js --bundle --format=iife --minify --outfile=bundle.js
# then inline style.css and bundle.js into index.html (see commit history)
```
