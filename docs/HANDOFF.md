# OVERTIME — Complete Project Handoff

> For the next Claude Code session or account (and any human) picking up this project.
> Read this file first, then `README.md` (player-facing feature list) and `docs/ROADMAP.md` (phase checklist).
> Snapshot: **v0.21.0** (Phase 7 Free Roam), November 2026. Branch: `claude/mobile-vertical-shooter-3tyouf`.

---

## 1. What OVERTIME is

**OVERTIME** is a retro, Doom-era-looking **on-rails office-tower shooter** built with **Three.js**, running in the browser as a
single HTML file. You are an office worker climbing a **30-floor corporate tower** (Halvorsen-Pike Holdings) that has gone
wrong: the staff are armed, mutated or replaced by robots. Each floor is 3–6 rooms ("areas"). You shoot everything in an
area, the game walks you to the next area (or you walk yourself in Free Roam), and at the end of each floor you ride the
elevator up, picking a perk on the way. Floor 30 is the Chairman. Beating him plays an **ending cutscene that depends on the
difficulty**.

- **Two builds from one codebase:** `mobile` (portrait, tap-to-shoot) and `pc` (landscape, mouse + keyboard with pointer lock).
- **Look:** chunky low-res pixel textures generated in code (no image files). There's a post-processing pass (bloom, colour
  grading, retro dither and scanlines) plus lots of particles, gore and destruction.
- **Inspiration:** the user likes the feel of "Compound" (a retro VR shooter). **OVERTIME must stay original**: no names,
  characters or art from Compound, JoJo or any other franchise. The fighting spirit and the time-rewind watch are original
  takes on genre ideas. Keep it that way, including in names of achievements and text.
- **Audience:** mobile first (free with ads planned), then Steam (paid, PC + full Free Roam).

### Content at a glance (v0.21)
| Thing | Count | Where |
|---|---|---|
| Floors | 30 tower floors. 10 zones × 3 versions, plus 1 NG+ nightmare version per zone; endless repeats past 30 | `shared/content/floors/zones.js`, `builder.js` |
| Enemy types | 91 (6 of them New Game+ only) | `shared/content/enemies/roster.js` |
| Bosses | 60 (30 mini + 30 big), each with its own attack script | `shared/content/bosses/bosses.js` |
| Weapons | 48 (6 NG+ only). Includes 2 specials: GRAVEYARD SHIFT (spirit) and THE GOLDEN WATCH | `shared/content/weapons/weapons.js` |
| Run perks | 31 | `shared/content/perks/perks.js` |
| Mutations (Extra Hard) | 30 | `shared/content/perks/mutations.js` |
| Permanent upgrades | 22, plus armory weapon levels 1–10 | `shared/content/meta/upgrades.js` |
| Employees (characters) | 8 | `shared/content/meta/characters.js` |
| Achievements | 191 | `shared/content/meta/achievements.js` |
| Lore memos | 80 | `shared/content/meta/lore.js` |
| Daily twists | 36 | `shared/game/modes.js` |
| Endings | 4 cutscenes + NG+ ending text | `shared/game/cutscene/`, `shared/content/meta/endings.js` |

---

## 2. Quick start (for the new Claude Code)

```bash
# get the code (pick one)
git clone <repo-url>                               # if you have the GitHub repo
git clone overtime-full-history.bundle overtime    # from the handoff package (full history, no GitHub needed)

cd overtime
node tools/build.mjs            # builds dist/mobile/overtime-mobile.html and dist/pc/overtime-pc.html (single files, play offline)
node tools/serve.mjs 8080       # dev server: http://localhost:8080/versions/pc/ and /versions/mobile/
./play.sh  (or play.bat)        # convenience launcher
```

- **Build needs Node.js and, the first time, internet:** `tools/build.mjs` runs esbuild through `npx` to bundle each
  version into one offline HTML file. Three.js r170 is vendored at `shared/vendor/three.module.min.js`. The dev server needs
  no build: it serves the ES modules straight from `shared/`.
- **Tests:** see `tools/tests/README.md`. You need Playwright with Chromium; run `tools/tests/run-all.sh` with the dev
  server up.
- **Dev mode in-game:** SETTINGS > DEVELOPER MODE (only while `DEV_BUILD = true` in `shared/game/settings.js`). Then use
  the DEV button, the `` ` `` key, or DEV TOOLS on the title screen. It has:
  - god mode, infinite ammo and one-hit kills
  - go to any floor, give any weapon or perk
  - spawn any enemy or boss (Super versions too)
  - unlock everything, mark all endings seen, toggle New Game+ and Free Roam (OFF/ROOM/FULL)
  - play any ending cutscene

### Read order for code
1. `shared/game/game.js`: the whole game loop (~2,800 long lines). Start at `frame()`, then `update()`, `startFloor`,
   `beginCombat`, `areaCleared`.
2. `shared/content/enemies/ai.js`: the `Enemy` class (movement, attacks, damage, death) and projectiles.
3. `shared/content/floors/builder.js` + `zones.js`: how floors and rooms are generated.
4. `shared/content/weapons/weapons.js`: weapon stats and procedural gun models.
5. `shared/game/spirit.js`, the Golden Watch section in `game.js`, `shared/game/cutscene/*`.

---

## 3. How the user works (very important)

The user is the designer and producer. They don't write the code: they send playtest notes and feature lists, often long and
spoken-style (voice-to-text typos are common: "Death Mode" meant "Dev Mode", "free rome" means "Free Roam", "recreate
enemies" meant "Requiem enemies").

**Conventions that have worked:**
- **Interpret generously, confirm only real ambiguity.** If a request is unclear, do the obvious reading and say so, or
  ask one clear question at the end. The user answers short ("Yes", "you're correct about the watch").
- **Big lists get split:** the user often says "take as long as you want" or "do X first, then the rest in the next
  prompts". Respect the order they give.
- **After every change, deliver:**
  1. `node tools/build.mjs`
  2. commit with a descriptive message and push to `claude/mobile-vertical-shooter-3tyouf`
  3. `git archive --format=zip -o OVERTIME-project.zip HEAD`
  4. send the user **OVERTIME-project.zip**, **dist/mobile/overtime-mobile.html**, **dist/pc/overtime-pc.html** and a
     **screenshot montage** (`vNNN-screens.png` in the repo root; they're git-ignored)
- **Verify visually.** Drive the real game in headless Chromium, take screenshots, look at them, fix what looks wrong,
  repeat. The cutscenes went through several of these passes.
- **Summaries in plain language:** what changed, what was already done, what you deferred and why, and anything they need
  to know or decide. No jargon or internal IDs.
- **Commits:** end messages with the attribution trailer your environment requires. Never put model names in commits.
  Don't open pull requests unless asked.
- **Audio was deliberately saved for last.** The user said "save audio for the very end" and is about to start it now
  (see §9).
- **Balance numbers are guesses** until the user playtests. Say which numbers are guesses.

---

## 4. Version history (how we got here)

| Version | Date | What happened (and what the user asked for) |
|---|---|---|
| prototype | 2026-11-16 | Portrait tap-to-shoot on-rails shooter through a 20-floor office tower (`src/` single folder). |
| 0.2–0.6 | 11-16 | Single-file offline build. 20 guns with a 3-slot inventory. 50 enemy types with floor-based spawning. Tower grown to 50 floors × 3 variants; ambushes. **PC version** (landscape, mouse crosshair). **60 bosses** with unique scripts. 20 more weapons + 30 more enemies. Reorganised into `shared/` + `versions/`. Roadmap written. |
| 0.7 | 11-16 | Phase 1: save & continue, settings menu, tutorial, pause menu. |
| 0.8 | 11-16 | Phase 2: run perks (1 of 3 after each floor). |
| 0.9 | 11-16 | Phase 3: cash, HQ upgrades, armory, employees, achievements. |
| 0.10 | 11-17 | Phase 4: playtest fixes (HUD overlaps, PC mouse speed + gun weight, melee rework, pillar visibility), difficulty modes (Easy/Medium/Hard/Extra Hard), dev mode, a long balance pass (each knob its own commit), performance. |
| 0.11 | 11-17 | Phase 5 "the biggest visual phase": post-processing, dynamic lights, explosions, smoke, decals, intro cards with letterbox + slow-mo, damage arcs, muzzle flashes, death animations, flashlight, lightning. |
| 0.12 | 11-17 | Gibs + gore setting, **duck** (S / down / DUCK), enemy friendly fire + clear-shot AI, black hole rework, environmental destruction, **THE REMOTE** weapon (later removed). |
| 0.13 | 11-17 | Phase 6: modes (Story, Endless, Daily Challenge, Boss Rush), 30 lore memos + HQ FILES, records. User: "fewer dust motes". |
| 0.14 | 11-20 | Enemy skins (3 themed + rare golden), **enemy LOG** with 3D previews, duller bright lights, 11 more upgrades, armory 6–10, 36 daily twists, 124 achievements, 50 more memos. |
| 0.14.1 | 11-20 | QA/polish pass the user asked for before new features. |
| 0.15 | 11-20 | Extra Hard only: **mutations** replace perks (upside + listed downside), **Requiem** enemies (later renamed Super). "There is no Ultra Hard." |
| 0.16 | 11-20 | **GRAVEYARD SHIFT** fighting spirit + **THE GOLDEN WATCH** (replaced The Remote). |
| 0.17 | 11-21 | Requiem → **SUPER** (bosses too). Spirit always out once picked up. Enemies kept in view. NEW tags on unread files. **Tower cut to 30 floors** (content mapped onto it). Difficulty endings. **Elevator ride between floors** (no black screen). **New Game+** (6 enemies, red title, intense music). Completion %. **Free Roam add-on** (move inside fights). |
| 0.18 | 11-21 | **Four ending cutscenes** (own engine). NG+ and Free Roam unlock after beating all 4 difficulties. Free Roam furniture collisions. Dev tools on the title. Every boss group reachable in 30 floors; floor 30 is always the Chairman. |
| 0.19 | 11-21 | Free Roam look (mouse-look / right stick), movement in ambushes. Enemy shots stop at walls, pillars, furniture and props. **Golden Watch rework:** right-click rewind to the room's start with a VHS effect, then the room comes back rotated (floor becomes a wall or the ceiling). Time stop removed. |
| 0.20 | 11-21/22 | **Spirit rework** (autonomous GUARD / BARRAGE-until-dead / BULLET CATCH / SHOCKWAVE / ICE FIST, FOCUSED weakness, orders). **NG+ content:** 10 nightmare floors, 6 NG+ weapons (execute mechanic), 15 more NG+ achievements, NG+ levels 1–5, +50% cash. |
| 0.21 | 11-22 | **Phase 7 Free Roam:** OFF/ROOM/FULL. FULL = walk between rooms, fights start on entry, doorway ambushes, keycard-locked doors, walk into the elevator and press E. Sprint/crouch. AI for a moving player (slides around furniture, re-picks cover, flanks, leads shots). |

`git log` has every step. Every version's playable builds are in the handoff package under `builds/`.

### Notable design decisions and reversals (so they aren't undone by accident)
- **The Remote → The Golden Watch.** The Remote (TV-remote powers) was removed at the user's request. The Watch went
  through three versions:
  1. rewind 4 s + reload a different floor version
  2. plus a click-to-stop-time ability
  3. the current one: **no time stop**, right-click rewinds to the **start of the room**, and the room returns **rotated**
     with lights and enemies moved
- **Requiem → Super** (renamed by the user). Supers appear on Extra Hard and in NG+.
- **50 floors → 30 floors.** Content is still authored on 50 "layout" floors; `layoutOf(n)` in `game.js` maps tower
  floor → layout floor. Each tower boss floor draws from 1–2 boss groups (`BOSS_GROUPS` / `MINI_GROUPS` in `zones.js`).
  Floor 30 in Story is always the Chairman.
- **NG+ / Free Roam unlock:** beating Story on all four difficulties (not 100% completion).
- **Free Roam levels:** `profile.roam` is 0/1/2 (OFF/ROOM/FULL). Old saves with `true` count as FULL.
- **No enemy may sit behind the player** on rails (`keepInView`). That's disabled in Free Roam because you can turn.
- **Spirit downside:** it can't defend you while FOCUSED. The user asked for this explicitly.

---

## 5. Architecture

```
index.html                 landing page linking both versions
versions/mobile/           index.html (portrait HUD) + css
versions/pc/               index.html (landscape HUD, crosshair) + pc.css
shared/
  vendor/three.module.min.js      Three.js r170 (vendored)
  engine/   textures.js (procedural pixel textures + 3x5 pixel font), geometry.js (cached boxes, mergeStatic),
            effects.js (pooled particles, decals, beams, debris), post.js (bloom/grade/retro/dissolve composite), util.js
  audio/    sfx.js (WebAudio synth: tone()/noise() + named sfx), music.js (procedural loop, calm/combat, NG+ intense)
  content/  enemies/ (roster.js defs, ai.js Enemy+Projectile, models.js procedural bodies, skins.js, lore.js)
            bosses/bosses.js (60 bosses + BossBrain scripts), floors/ (zones.js themes, builder.js rooms/props/colliders)
            weapons/weapons.js, perks/ (perks.js, mutations.js), meta/ (achievements, characters, upgrades, lore, endings)
  game/     game.js (everything that runs the game), hq.js (HQ screens), modes.js, profile.js (localStorage profile),
            save.js (run save), settings.js, difficulty.js, tutorial.js, dev.js, completion.js, spirit.js,
            cutscene/ (engine.js, rig.js, sets.js, endings.js, audio.js)
  ui/base.css
tools/      build.mjs (single-file builds into dist/), serve.mjs (static dev server), tests/ (regression suite)
dist/       built single-file games (committed)
docs/       ROADMAP.md, HANDOFF.md (this file)
```

### Core concepts in `game.js`
- **`G`** is the shared game state that enemies and projectiles see. It holds `G.enemies`, `G.projectiles`, `G.floor`,
  `G.room`, `G.camPos`, `G.playerPos`, and the flags `G.ngp`, `G.roam`/`G.roamFull`, `G.twist` and so on.
  **`P`** is the player (hp, inventory `P.inv`, slot). **`M`** is the computed modifiers: `recalc()` rebuilds it from
  perks → HQ upgrades → daily twist → mutations → NG+ cash.
- **`mode`** is one of `'title' | 'intro' | 'combat' | 'moving' | 'floorclear' | 'dead' | 'cutscene' | 'win'`.
  `area` is the current fight (`idx`, `room`, `queue` of reinforcements, `boss`, `ambush`).
- **Scripted sequences are generator coroutines:** `run(function*(){ yield 1.2; yield () => cond; yield* tween(d, fn) })`,
  stepped in `update()`. `walk(from, to)` moves the camera on rails.
- **Floors:** `startFloor(n)` → `loadFloor(n, variant)` → `buildFloor(plan)` (rooms along −z, 12 m each, 7 m wide).
  `prepareArea(i)` spawns that room's enemies (dormant), `beginCombat()` wakes them, and `areaCleared()` moves on.
  Free Roam FULL uses `explore` state instead of the walk.
- **Difficulty curve:** `effFloor(n)` (the layout floor, keeps climbing in endless) drives enemy hp and damage. The
  difficulty mode multiplies on top (`difficulty.js`).
- **Saves (localStorage):**
  - `overtime.profile`: wallet, upgrades, weapons, chars, found, ach, stats, lore/loreRead, bestiary, records, endings,
    ngp, ngpLevel, roam
  - `overtime.run`: the current run, saved at each floor start
  - `overtime.settings`, `overtime.dev`, `overtime.best`, `overtime.seen`
- **`window.__game`** is a debug object (bottom of `game.js`) used by the tests. It's safe to extend.
- **Rendering:** the scene and the gun viewmodel are rendered to a low-res target, then `post.end()` composites.
  Cutscenes render their own scene through the same post pass (`frame()` hands off to the cutscene when `cutscene` is set).

### Systems map (where things live)
| System | Where |
|---|---|
| Shooting, hitscan, aim assist, pierce/chain/explode/execute | `game.js` `tryFire` / `fireRay` / `applyHit` |
| Enemy movement and attacks, Supers, skins, friendly fire | `ai.js` (`updateMove`, `updateAttack`, `makeSuper`, `Projectile`) |
| Boss scripts | `bosses.js` `BossBrain` |
| Duck / crouch, Free Roam move/look, collisions | `game.js` `duck`, `roamUpdate`, `solveCollisions`, `G.solidAt`, `G.solidPush`; colliders built in `builder.js collectColliders` (before `mergeStatic`) |
| FULL Free Roam, keycards, elevator use | `game.js` `exploreUpdate`, `placeKeycard`, `useThing` |
| Perks / mutations / upgrades | `perks.js`, `mutations.js`, `upgrades.js` + `recalc()` |
| HQ (upgrades, armory, employees, awards, log, files, records + endings replay) | `hq.js` |
| Modes, daily twists, records | `modes.js` |
| NG+ (levels, guns, nightmare floors, music) | `setNgp()` in `game.js`, `ngp:` flags in roster/weapons, `NGP_THEMES` in `zones.js`, `setMusicIntense` |
| GRAVEYARD SHIFT | `spirit.js` (state machine: guard / intercept / dash / punch / slam / return) |
| Golden Watch | `game.js` "THE GOLDEN WATCH" section (`snapRoomStart`, `rewindRecord`, `useWatch`, `tickRewind`, `finishRewind`, `worldRoll`) |
| Elevator ride + perk pick | `game.js` `startRide` / `updateRide` / `floorComplete` |
| Ending cutscenes | `cutscene/engine.js` (scene, camera, particles, debris, rain, overlay, skip), `rig.js` (jointed characters: player per employee, Chairman, hooded board, stranger, mutant), `sets.js` (boardroom, city tower, diner, neon sunset, holiday photo render), `endings.js` (scripts), `audio.js` (synth SFX + score) |
| Dev tools | `dev.js` + the `initDev({...})` context in `game.js` |

### Gotchas
- **`game.js` initialises in order and calls `toTitle()` near the end.** Any `let` used by `loadFloor`/`setRoam`/`setNgp`
  must be declared *above* that call, or you get a temporal-dead-zone ReferenceError at startup.
  This bit us with `worldRoll` and `explore`.
- **`mergeStatic` merges room meshes into a few draw calls.** Anything that needs its own mesh later (doors, props,
  glass) must be `userData.dyn`/`keep`/transparent. Colliders are collected **before** merging.
- **Cutscene sets keep the same light count** (`padLights`), so switching sets doesn't recompile shaders.
- **Particles and sprites** use small nearest-filtered textures on purpose, for the retro look.
- **Headless test timing:** SwiftShader is slow (a few fps; `dt` is capped at 0.05). Game time runs slower than wall
  time, so tests that count kills per second undercount. Some tests occasionally flake: rerun them alone.
- **Mobile layout:** portrait HUD, both joysticks in Free Roam, a gold ◀◀ rewind button, and a "TAKE THE ELEVATOR"
  button (`#useBtn`).

---

## 6. Controls reference
- **Mobile:** tap to shoot, tap fireballs to destroy them, SWAP, DUCK, RELOAD buttons. Free Roam: left stick to move
  (full push = sprint), right stick to look. Golden Watch: ◀◀ button. Elevator: TAKE THE ELEVATOR button.
- **PC:**
  - Basics: click to shoot (hold for auto), R / right click to reload, wheel / 1-3 / Q / E to swap, S / ↓ to duck,
    ESC to pause, F for fullscreen, M to mute.
  - Free Roam: WASD to move, mouse to look, SHIFT to sprint, hold C / CTRL to crouch, SPACE to duck, E to use.
  - Specials: right click = Golden Watch rewind (when carried); R = spirit OVERDRIVE (when held with a full gauge).

---

## 7. Testing
`tools/tests/` has the regression suite (Playwright). See its README for what each test covers. The workflow:
1. build
2. start the server
3. run the relevant tests
4. look at the screenshots in `tools/tests/out/`

For cutscenes, `node tools/tests/cs.js <diff> <times>` captures frames at exact script times, and `mont.py` makes
montages.

---

## 8. Open items and known limitations
- Playtest-driven balance (bosses, spirit damage, NG+ drop rates, Free Roam difficulty) needs the user's notes.
- Phase 7 leftovers: **wider rooms, side offices, branching paths** (needs a level-generator rework: rooms are a straight
  line along −z, 7 m wide).
- Online leaderboards need a backend (records are local only).
- Real-device testing for graphics presets (old phones).
- The first 2026-11-16 prototype has no build file; its source is in the history (`git show 9ec1e9a`).

---

## 9. Future features and full vision

### Next up: Phase 9, Audio (the user is ready to start this)
All audio is currently **synthesised in code** (`sfx.js` tone/noise, `music.js` loop, `cutscene/audio.js`). The plan:
- **Full soundtrack:** a unique 3+ minute track per zone (10 zones, plus NG+ nightmare variants) with sections (calm
  exploration, combat, boss), plus title, boss, ending and NG+ themes. It can stay procedural (a sequencer with patterns per
  zone) or use recorded files: ask the user which they prefer. Procedural keeps the single-file build small.
- **Jukebox** on the title screen (unlock tracks as you reach zones).
- **Sound effects pass:**
  - weapon punch per gun, impacts by surface
  - enemy barks/voices per family (office staff mutter, robots beep, mutants growl)
  - ambience per zone (servers hum, labs bubble, rain on night floors)
  - UI sounds, and spatial panning by enemy position
- **Mixing:** a music/SFX volume split already exists in Settings; add ducking under explosions and the boss intro sting.

### Phase 8: Monetisation and packaging
- **Mobile (free):**
  - rewarded ads (revive, double cash, reroll), a "Remove Ads" purchase, a cosmetic shop (skins for guns and employees)
  - Capacitor wrappers for Android/iOS, AdMob, in-app purchases
- **Steam (paid, ~$5–10):** Electron/Tauri desktop build, Steam achievements (map the 191), cloud saves.
- A privacy policy, age ratings and store listings.
- **The user needs:** Google Play ($25), Apple Developer ($99/yr), Steam Direct ($100), and a Mac or cloud Mac for iOS.

### Phase 10: Launch
Closed beta (TestFlight / Play internal / Steam playtest), a trailer, screenshots and store art, short clips, the Steam
page up early for wishlists, and a soft launch on Android → full launch, mobile first, then Steam with Free Roam.

### Longer-term ideas (from the conversation and the roadmap)
- Wider rooms, side offices, branching floors and secret rooms in FULL Free Roam. Keycards could grow into a
  colour-coded key system.
- Online leaderboards (daily challenge, boss rush times, endless floors).
- More NG+ depth: NG+ bosses, NG+ lore, NG+-only twists.
- Controller support on PC.
- Accessibility: colour-blind palettes for telegraphs, an aim-assist slider (exists), subtitles for barks once there are voices.

### The vision in one paragraph
OVERTIME should feel like a lost 90s arcade-FPS cartridge reimagined for phones: instantly readable, punchy and
over-the-top (gibs, glass, explosions), packed with silly corporate satire (memos, achievements, enemy names) and
surprisingly deep long-term hooks:
- a perk/mutation build every run
- HQ upgrades and the armory
- 8 employees and 191 achievements
- enemy skins to collect in the log
- four difficulty endings with cutscenes, and NG+ levels

On PC it grows into a full free-roam retro shooter on the same content. The player always moves forward: up the tower,
through the Chairman, and into one of four very different endings.

---

## 10. What's in the handoff package
```
OVERTIME-HANDOFF/
  START-HERE.md                     short orientation (points here)
  HANDOFF.md                        this document
  overtime-full-history.bundle      git bundle with every commit (git clone it)
  source/                           the repository at v0.21 (same as the bundle's HEAD), incl. tools/tests
  builds/<version>/                 playable single-file builds for every version: mobile + pc HTML
                                    (v0.1 prototype: source folder; open its index.html through a local server)
  builds/LATEST/                    v0.21 builds
  screenshots/                      montages from recent versions
```
Open any `.html` build directly in a browser to play it offline.
