# OVERTIME regression tests

Headless-browser tests that play the real game (Playwright + Chromium, software WebGL via SwiftShader).
They poke the game through `window.__game` (a debug object exported at the bottom of `shared/game/game.js`).

## Running
1. `npm i -D playwright && npx playwright install chromium` (once)
2. `node tools/build.mjs` (tests load `versions/pc` and `versions/mobile` straight from source, but build anyway)
3. In one terminal: `node tools/serve.mjs 8080`
4. In another: `tools/tests/run-all.sh` (or `tools/tests/run-all.sh fr frk` for a few)

Every test prints `errors []` / `errs []` / `ERRORS []` at the end when no page errors happened. Some print
extra facts worth eyeballing (modes, counts, states). Screenshots go to `tools/tests/out/`.
Headless SwiftShader runs at only a few frames per second, so timings inside tests are generous and a test
occasionally flakes on timing: rerun it alone before assuming a bug.

## What each test covers
| test | covers |
|---|---|
| phase1 | settings, graphics presets, save/continue, new-run confirm |
| meta | cash, HQ shopping, employees, insurance revive |
| perks | perk offers, reroll, pick, perks saved and shown in pause (PC + mobile) |
| p4 | continue-as-another-employee, difficulty |
| modes | game modes, records, lore pickup, completion breakdown |
| twists | daily twists (knob system) |
| upg | upgrades + armory math |
| mut | Extra Hard mutations, Super enemies |
| wpn | GRAVEYARD SHIFT + Golden Watch basics |
| od | spirit OVERDRIVE |
| ride | elevator ride between floors + perk pick |
| ngp / ngp2 | New Game+ title, enemies, NG+ levels, nightmare floors, NG+ guns, achievements |
| roam / roam2 | Free Roam movement and furniture collisions |
| v19 | free look, solid world, Golden Watch rewind, ambush movement (PC; `node v19.js m` for mobile) |
| sp2 | spirit AI states and kills |
| fr / frk | FULL Free Roam: room-to-room, ambushes, keycard lock, elevator E |
| fin | floor 30 → ending cutscene → skip → win screen → HQ replay → dev panel |
| logall / log | enemy log entries and 3D previews |
| cs | capture an ending cutscene at given times: `node cs.js <0-3> 2,5,9 [m]`; montage with `python3 mont.py 'cs0_pc_*.png' out.png 4` |
