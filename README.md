# OVERTIME

A retro on-rails shooter set in a 50-floor office tower, with a mobile (portrait, touch) version and a PC (landscape, mouse & keyboard) version. A free-roam PC version is planned. You stand in place with a fixed camera and shoot enemies. When an area is clear you walk to the next one automatically. Clear every area on a floor, ride the elevator up, and keep climbing until you reach the boardroom.

The look is a low-res, chunky-pixel 3D style in the spirit of mid-90s shooters. Everything is drawn in code at runtime: blocky box models, tiny nearest-filtered textures, flat fluorescent lighting and fog. The game ships no image or audio files. Every texture, model, sound effect and music loop is generated procedurally.

## Project layout
```
index.html                 launcher page: pick a version to test
docs/ROADMAP.md            development timeline for the remaining features
play.bat / play.sh         double-click: start the local test server + open the launcher
package.json               npm scripts (start / build)
tools/
  serve.mjs                zero-dependency local test server (node tools/serve.mjs)
  build.mjs                builds a standalone single-file copy of each version into dist/
shared/                    everything the versions have in common
  vendor/                  three.js r170 (MIT)
  engine/                  util.js, geometry.js, textures.js (procedural pixel art), effects.js (gibs, particles)
  audio/                   sfx.js (synth sound effects), music.js (soundtrack)
  content/
    floors/                zones.js (10 zones x 3 themes, moods, floor plans), builder.js (rooms, furniture, elevators)
    enemies/               roster.js (85 enemy definitions), models.js (procedural bodies), ai.js (behaviour + projectiles)
    bosses/                bosses.js (60 bosses: attack scripts + vulnerability rules)
    weapons/               weapons.js (40 weapons + procedural gun/melee models)
    perks/                 perks.js (31 run perks, offer rolls, stat modifiers)
    meta/                  upgrades.js (HQ upgrades + weapon levels), characters.js (employees), achievements.js
  game/                    game.js (game loop, input, shooting, floor/area flow, HUD, viewmodel),
                           settings.js, save.js (autosave), tutorial.js, profile.js (wallet, unlocks, stats), hq.js (HQ screens)
  ui/                      base.css (HUD, menus, overlays shared by all versions)
versions/
  mobile/                  index.html + mobile.css (portrait, touch)
  pc/                      index.html + pc.css (landscape, mouse & keyboard)
  pc-freeroam/             reserved for the free-roam PC version
dist/
  mobile/overtime-mobile.html   standalone builds: open by double-click, work offline
  pc/overtime-pc.html
```
Every version runs the same `shared/` code. Each version folder owns its own page and styles, so a change made for one version does not overwrite another. All models, textures, sounds and music are generated in code at runtime, so there are no separate asset files.

## Testing the game
- **Quickest:** open `dist/pc/overtime-pc.html` on a computer, or `dist/mobile/overtime-mobile.html` on a phone. No install needed.
- **From the source code** (shows your edits immediately): install [Node.js](https://nodejs.org), then double-click `play.bat` on Windows or run `./play.sh` on Mac/Linux. It opens `http://localhost:8080` with the launcher. To test on a phone, connect it to the same Wi-Fi and open the "Network" address the server prints.
- **Rebuild the standalone files** after changing code: `node tools/build.mjs` (or `npm run build`).

### PC controls
| Input | Action |
|---|---|
| Mouse | Aim (crosshair turns red over an enemy) |
| Left click / hold | Shoot / automatic fire |
| Right click or `R` | Reload |
| `S` or down arrow | Duck (mobile: DUCK button) |
| Mouse wheel, `1` `2` `3`, `Q`/`E`/`Tab` | Switch gun |
| `Esc` / `P` | Pause |
| `F` | Fullscreen |
| `M` | Mute |
| `Enter` | Start from the title screen |
| `` ` `` (backtick) | Developer tools (when Developer Mode is on) |

The PC version shows the whole room in widescreen, the gun follows your cursor, and aim assist is reduced because a mouse is more precise than a finger. Clicking into the game captures the mouse (Esc releases it and pauses), so **Settings > Mouse Speed** (0.5x–2x) and **Gun Weight** work: heavy weapons like the minigun, rocket launcher, sledgehammer or chainsaw move the crosshair slower than a pistol. Turn **Capture Mouse** off to use the normal system cursor instead. During development, add `?pc` to the URL to get the PC mode.

## How it plays
- **Saving:** your run is autosaved at the start of every floor. **Continue** on the title screen picks it up again, even after closing the game. Retrying after death, or choosing *Restart floor* from the pause menu, replays that floor's save with full health.
- **Look & feel:** the 3D view goes through a retro post-processing pass: glow on lights and muzzle flashes, a colour grade for each lighting mood, and an optional dither/scanline **Retro Filter** (Settings: Off, Soft, Full). Explosions and gunfire light up the room, dark floors give you a flashlight, lockdown floors pulse with alarm lights, and night floors flash with lightning. Enemies get knocked back, splatter the walls, and die in different ways: humans fall, robots spark and blow, flyers crash, bosses explode in a chain. Every floor opens with an intro card and every boss with a letterboxed slow-motion intro. Turn **Effects** off in Settings for very old devices.
- **Duck:** press `S` / down arrow (or the DUCK button on mobile) to drop down for a moment. Shots fired at you before you ducked fly over your head, and lasers miss. Homing shots and melee still get you.
- **Destruction:** monitors, keyboards, mugs, chairs, plants, water coolers and boxes can be shot. Light ones get knocked flying (and hurt any enemy they slam into), everything breaks apart when wrecked. Copiers and vending machines take a beating, then blow. Windows shatter. Explosions and black holes throw props around.
- **Friendly fire:** enemy shots and bombs hurt other enemies. Enemies try not to shoot through each other and sidestep for a clear line, but if you get one standing in front of another, the one behind may hit its friend anyway.
- **Gore:** most enemies burst into bleeding pieces, kills spray the walls, floor and ceiling, shots leave wounds on enemies and splatter behind them. Settings > Gore: Low / Normal / Extra.
- **Difficulty:** every new run starts by picking **Easy, Medium, Hard or Extra Hard**. It changes the damage you take, enemy health, how often enemies attack, projectile speed, how many enemies come, and healing between floors. Harder modes pay more cash and score. It's fixed for that run and shown in the pause menu.
- **Settings** (title screen or pause menu): music and sound volume, aim assist (off/low/normal/high), mouse speed, gun weight and mouse capture (PC), graphics quality (render resolution and particles), screen shake, left-handed HUD (mobile), developer mode, and replaying the tutorial.
- **Continue as someone else:** when you continue a saved run with more than one employee unlocked, you can switch who you play as. The old employee's starting perks and weapon are swapped for the new one's; weapons you found are kept.
- **Game over** shows what killed you (for example *KILLED BY JANITOR'S FIREBALL*).
- **Perks:** after every floor you choose **1 of 3 random perks**, and they last for the rest of the run. There are 31 across offense, defense and utility, for example Hollow Points, Marksman, Explosive Rounds, Second Wind, Bloodsucker, Deflector Field, Auto-Loader and Lucky Charm. Many stack (shown as 1/3, 2/3…). After a boss or mini-boss floor at least one rare-or-better perk is offered. You get one free reroll per run. Your perks are listed in the pause menu and saved with the run.
- **Cash & HQ:** kills, bosses and cleared floors pay cash, which goes into a permanent wallet (dying never loses it). Spend it at **HQ** on the title screen:
  - **Upgrades:** 11 permanent boosts for every future run (Vitality, Firepower, Speed Loader, Body Plating, First Aid Kit, Bounty Hunter, Perk Scholar, More Options, Backpack, Signing Bonus, Life Insurance).
  - **Armory:** level up any weapon you've found, up to level 5 (+12% damage and +10% magazine per level; level 5 also reloads faster).
  - **Employees:** 8 starting characters, each with their own weapon and perks (The Temp, Night Guard, The Intern, The Janitor, IT Technician, Junior Executive, The Contractor, The Chairman's Heir). Unlock them through milestones or buy them.
  - **Awards:** 31 achievements with cash rewards.
- **Developer mode** (for testing; Settings > Developer Mode, then the green **DEV** button or the `` ` `` key): god mode, infinite ammo, one-hit kills, enemies that don't attack, FPS counter, game speed 1x/2x/4x, full heal, kill all, finish floor, go to any floor, +cash, unlock everything, give any weapon or perk, spawn any enemy or boss. Before a public release, set `DEV_BUILD = false` in `shared/game/settings.js` to hide it.
- **Tutorial:** a new player's first area on floor 1 walks through shooting, headshots, shooting fireballs, reloading, picking up and switching weapons. It can be skipped.

- **Tap enemies** to shoot. Headshots do triple damage.
- **Tap incoming fireballs** to destroy them before they hit you.
- Enemies glow and raise their gun just before they fire. Some duck behind desks, cubicle walls and pillars, then pop up to shoot.
- Fast kills chain into a **combo multiplier**.
- Dead enemies sometimes drop **medkits**. Tap them, or they get collected when the area is cleared.
- Each floor has 3–6 areas and ends in an elevator lobby. Reinforcements walk in through the far door, or come out of the side elevators.
- **Ambushes:** while you walk between areas, enemies sometimes pop out of hiding. You stop, they fire quickly, and you have to react before the walk continues.

### Enemies
There are 85 regular enemy types (the 4 originals, plus 50, plus 30 more), and the 60 bosses. Each one has a floor range, and areas fill up with random picks from the enemies allowed on that floor. Low floors are mostly office staff. Robots, drones and turrets show up in the data center, and mutants, oozes and lab horrors appear higher up. Bosses appear every 5 floors. The first time you meet a new enemy type, a **NEW HOSTILE** callout appears.

Things to know:
- Enemies behind tall cover such as pillars and shelves stay hidden, then step out into the open to shoot.
- Lobbed boxes, coffee and bombs always arc below the ceiling, so you can shoot them down.
- Shoot charging lasers to cancel them. A red beam means one is warming up.
- Armored enemies take reduced body damage, so aim for the head, visor or core.
- Shields absorb hits until they break.
- Cloaked enemies can't be hit until they reappear.
- Kamikaze drones blow up anything near them when shot down.
- Healers patch up their allies, and summoners and splitters add more enemies to the fight.

| Enemy | Floors | Behavior |
|---|---|---|
| **CLERK** | 1–9 | takes cover, pops up; shoots |
| **TEMP** | 2–10 | charges you (melee) |
| **SECURITY** | 3–13 | takes cover, pops up; burst fire |
| **SECURITY DRONE** | 6–14 | flies around; shoots |
| **COFFEE INTERN** | 1–6 | strafes side to side; lobs coffee |
| **MAIL CLERK** | 1–5 | takes cover, pops up; spread shot |
| **JANITOR** | 1–7 | charges you (melee) |
| **IT GUY** | 2–8 | takes cover, pops up; summons mouse bots + shoots |
| **MOUSE BOT** | 2–9 | zig-zags in (melee) |
| **AUDITOR** | 3–10 | takes cover, pops up; charged laser (shoot it to cancel) |
| **HR REP** | 2–12 | strafes side to side; heals allies + shoots |
| **SHREDDER BOT** | 3–9 | strafes side to side; rapid fire |
| **COPIER MIMIC** | 2–8 | stationary; spread shot; armored (aim for the weak point) |
| **MIDDLE MANAGER** | 5–12 | takes cover, pops up; burst fire + summons coffee interns |
| **THE MAJOR** | 6–14 | strafes side to side; burst fire + lobs grenade |
| **RIOT GUARD** | 4–12 | takes cover, pops up; shoots; front shield |
| **SPIDER BOT** | 4–12 | leaps at you (melee) |
| **QUAD DRONE** | 5–13 | flies around; burst fire |
| **KAMIKAZE DRONE** | 5–15 | kamikaze dive; explodes |
| **MUTATED TEMP** | 6–14 | leaps at you (melee) |
| **CUBICLE LURKER** | 5–11 | burrows under the floor; shoots |
| **CONSULTANT** | 7–15 | teleports; spread shot |
| **SALES REP** | 6–13 | strafes side to side; homing orbs |
| **SENTRY TURRET** | 9–16 | stationary; rapid fire; armored (aim for the weak point) |
| **MECH WALKER** | 10–18 | strafes side to side; homing missiles + burst fire; armored (aim for the weak point) |
| **SPIDER MECH** | 11–19 | strafes side to side; charged laser (shoot it to cancel); armored (aim for the weak point) |
| **SERVER WRAITH** | 10–17 | flies around; shoots; cloaks |
| **CABLE CRAWLER** | 10–16 | zig-zags in (melee) |
| **GLITCH** | 11–18 | teleports; shoots; splits into glitch shards |
| **GLITCH SHARD** | 11–18 | charges you (melee) |
| **FIREWALL TANK** | 12–19 | strafes side to side; spread shot; armored (aim for the weak point) |
| **NANO SWARM** | 10–18 | charges you (melee) |
| **HAZMAT TECH** | 9–15 | takes cover, pops up; spread shot |
| **CYBER HOUND** | 10–17 | leaps at you (melee) |
| **OOZE** | 8–16 | zig-zags in (melee); splits into oozelings |
| **OOZELING** | 8–16 | zig-zags in (melee) |
| **SPITTER** | 12–18 | strafes side to side; lobs acid |
| **BRUTE** | 13–20 | charges you (melee); armored (aim for the weak point) |
| **WATCHER** | 12–20 | flies around; charged laser (shoot it to cancel) |
| **BROOD POD** | 13–20 | stationary; summons larvas |
| **LARVA** | summoned | zig-zags in (melee) |
| **LEECH** | 11–17 | zig-zags in (melee); regenerates |
| **SCREAMER** | 14–20 | takes cover, pops up; sonic waves |
| **ABOMINATION** | 15–20 | strafes side to side; burst fire + spread shot; regenerates |
| **EXEC ASSISTANT** | 15–20 | strafes side to side; burst fire |
| **BODYGUARD** | 15–20 | takes cover, pops up; burst fire; front shield |
| **LAWYER** | 14–20 | takes cover, pops up; homing orbs + summons clerks |
| **GOLD DRONE** | 15–20 | circles the room; burst fire |
| **ASSASSIN** | 16–20 | charges you (melee); cloaks |
| **LASER SENTINEL** | 16–20 | takes cover, pops up; charged laser (shoot it to cancel); armored (aim for the weak point) |
| **HEAVY GUNNER** | 14–20 | takes cover, pops up; rapid fire |
| **JETPACK TROOPER** | 13–20 | flies around; burst fire |
| **ORBITAL DRONE** | 17–20 | circles the room; spread shot |
| **SHADOW BOARD MEMBER** | 18–20 | takes cover, pops up; spread shot + homing missiles + summons bodyguards |
| **BOX TOSSER** | 2–9 | takes cover, pops up; throws impact bombs (shoot them) |
| **PRINTER JAM** | 3–10 | stationary; drops hovering mines; armored (aim for the weak point) |
| **CUBICLE CREEPER** | 4–11 | zig-zags in (melee); teleports when hit |
| **OFFICE MANAGER** | 4–12 | takes cover, pops up; fires a wall of shots |
| **ESPRESSO BOT** | 2–8 | flies around; rains shots from the ceiling |
| **PARALEGAL** | 6–14 | strafes side to side; shoots; reflects shots while red |
| **PAPER SWARM** | 3–10 | charges you (melee) |
| **SECURITY K9** | 5–12 | leaps at you (melee) |
| **VENDING BOT** | 3–10 | strafes side to side; spread shot |
| **TELEMARKETER** | 6–13 | takes cover, pops up; homing orbs; teleports when hit |
| **FIREWALL DRONE** | 10–18 | flies around; burst fire; phases out (immune) at times |
| **VIRUS** | 11–19 | flies around; spread shot; splits into glitch shards |
| **TROJAN HORSE** | 12–20 | charges you (melee); armored (aim for the weak point); splits into mouse bots |
| **CRYPTO MINER** | 12–20 | strafes side to side; rapid fire; enrages when hurt |
| **SNIPER DRONE** | 13–24 | flies around; charged laser (shoot it to cancel) |
| **LOGIC BOMB** | 11–22 | kamikaze dive; explodes |
| **DATA WORM** | 10–18 | zig-zags in (melee); regenerates |
| **LAB RAT KING** | 21–32 | charges you (melee); splits into larvas |
| **TOXIC SPRAYER** | 21–34 | takes cover, pops up; rains shots from the ceiling |
| **GENE SPLICER** | 22–36 | strafes side to side; heals allies + summons larvas |
| **TWO-HEADED HOUND** | 22–36 | leaps at you (melee); enrages when hurt |
| **SPORE POD** | 23–38 | stationary; drops hovering mines |
| **HUSK** | 24–40 | charges you (melee); phases out (immune) at times |
| **WELDER BOT** | 26–40 | strafes side to side; spread shot |
| **ASSEMBLY DRONE** | 26–42 | flies around; throws impact bombs (shoot them) |
| **RIVET TURRET** | 26–44 | stationary; fires a wall of shots; armored (aim for the weak point) |
| **CRUSHER** | 27–46 | charges you (melee); armored (aim for the weak point) |
| **GARDEN GOLEM** | 36–46 | zig-zags in (melee); splits into oozelings; regenerates |
| **DEALER BOT** | 41–50 | strafes side to side; spread shot; reflects shots while red |
| **REACTOR WRAITH** | 44–50 | flies around; charged laser (shoot it to cancel); cloaks |


### Bosses: 60 in total
Floors run in a 5-floor cycle: normal, normal, **mini boss**, normal, **Boss**. Mini bosses are on floors 3, 8, 13 … 48 and Bosses on 5, 10 … 50. Each of those floors has **3 possible bosses**, so there are 30 mini bosses and 30 Bosses (60 total). The one you face matches the version of the floor you rolled.

Every boss has its own attack script. Below 50% health it becomes **ENRAGED**, gets faster and adds new attacks. The boss bar shows whether it can be hurt right now (VULNERABLE, IMMUNE or SHIELD) and calls out its tells.

Boss attacks:
- **Bombs** are lobbed at you and explode when they hit the floor. Shoot them in the air.
- **Lasers, heals and slams** wind up first. Hit the boss enough during the wind-up to stagger it and cancel the move.
- **Charges:** deal enough damage mid-charge to stun the boss before it reaches you.
- **Mines** park in the air, blink, then dart at you.
- **Rain** falls from the ceiling.
- **Walls** of shots come at you side by side.
- **Spin** fires a sweeping spiral, and **barrage** is a long stream of shots.
- **Pylons** make the boss immune until every pylon is destroyed.
- **Clones:** only the real boss takes damage. The decoys flicker.
- **Reflect:** while it glows red, your shots bounce back at you.
- **Cloak:** it vanishes and repositions.

Mini bosses always have a condition for when they can be hurt.

#### Mini bosses (floors 3, 8, 13 ... 48)
| Floor | Mini boss | When it can be hurt | Attacks |
|---|---|---|---|
| 3 | **PAPERWEIGHT** | Only right after it attacks | bombs, fan |
| 3 | **THE STAPLER** | Only when it turns its back | barrage, turn |
| 3 | **FRONT DESK FIONA** | Immune while its minions live | summon, fan |
| 8 | **TEAM LEAD TODD** | Break its regenerating shield first | fan, summon, homing |
| 8 | **COPIER KING** | Only while winding up / charging | wall, fan |
| 8 | **HEADSET HARRY** | Headshots only | homing, mines |
| 13 | **SERVER BEAST** | Only right after it attacks | barrage, wall |
| 13 | **FIREWALL WARDEN** | Always + pylons | pylons, fan, barrage |
| 13 | **PACKET SPIDER** | Only its glowing weak point | mines, charge |
| 18 | **BOARD SECRETARY** | Always | clones, fan, teleport |
| 18 | **BRASS KNUCKLES** | Only while winding up / charging | charge, slam |
| 18 | **TROPHY HUNTER** | Only right after it attacks | bombs, homing |
| 23 | **SPECIMEN 23** | Headshots only | charge, slam, rain |
| 23 | **THE INCUBATOR** | Immune while its minions live | summon, rain |
| 23 | **DR. CLEANROOM** | Only while winding up / charging | bombs, heal |
| 28 | **FOREMAN-9** | Only when it turns its back | slam, barrage, turn |
| 28 | **ASSEMBLY ARM** | Only its glowing weak point | wall, laser |
| 28 | **CRASH TEST HOUND** | Only right after it attacks | charge, fan |
| 33 | **HEAD ARCHIVIST** | Only while visible | cloak, homing, fan |
| 33 | **BOOKWORM** | Headshots only | rain, charge |
| 33 | **FREEZER UNIT** | Break its regenerating shield first | wall, barrage |
| 38 | **GROUNDSKEEPER** | Always + pylons | pylons, bombs, charge |
| 38 | **ROSE QUEEN** | Only while winding up / charging | laser, rain |
| 38 | **MOLD MOTHER** | Only its glowing weak point | summon, bombs |
| 43 | **THE DEALER** | Shots reflect while it glows red | fan, reflect, teleport |
| 43 | **HIGH ROLLER** | Only right after it attacks | spin, homing |
| 43 | **MARBLE GOLEM** | Only its glowing weak point | slam, bombs |
| 48 | **CORE TECH** | Always + pylons | pylons, laser, mines |
| 48 | **BLACK OPS** | Only while visible | cloak, charge, fan |
| 48 | **GATEKEEPER** | Break its regenerating shield first | laser, wall |

#### Bosses (floors 5, 10 ... 50)
| Floor | Boss | When it can be hurt | Attacks |
|---|---|---|---|
| 5 | **REGIONAL MANAGER** | Always | bombs, fan, summon |
| 5 | **MAILROOM MONARCH** | Always | bombs, wall, summon |
| 5 | **RECEPTIONIST FROM HELL** | Always | homing, clones, fan |
| 10 | **VP OF OPERATIONS** | Always + pylons | pylons, barrage, homing |
| 10 | **CALL CENTER OVERLORD** | Always | spin, mines, summon |
| 10 | **OPEN PLAN ARCHITECT** | Always | teleport, rain, wall |
| 15 | **CHIEF FINANCIAL OFFICER** | Break its regenerating shield first | bombs, summon, fan |
| 15 | **THE DATA LORD** | Always + pylons | laser, mines, pylons |
| 15 | **MAINFRAME** | Only its glowing weak point | barrage, wall, summon |
| 20 | **CHIEF OPERATING OFFICER** | Always | teleport, homing, clones, fan |
| 20 | **GOLDEN EXECUTIVE** | Always | fan, reflect, bombs |
| 20 | **TROPHY WYRM** | Always | charge, rain, summon |
| 25 | **HEAD OF R&D** | Always | bombs, summon, heal |
| 25 | **PATIENT ZERO** | Always | charge, slam, sonic |
| 25 | **THE STERILIZER** | Always + pylons | pylons, wall, laser |
| 30 | **DIRECTOR OF ROBOTICS** | Always | homing, slam, summon |
| 30 | **ASSEMBLY TITAN** | Always | charge, mines, barrage |
| 30 | **TEST SUBJECT OMEGA** | Always | laser, rain, clones |
| 35 | **CHIEF ARCHIVIST** | Always | cloak, homing, summon |
| 35 | **THE LIBRARIAN** | Only when it turns its back | sonic, rain, turn |
| 35 | **ICE QUEEN UNIT** | Always | spin, wall, mines |
| 40 | **THE GARDENER** | Always | bombs, summon, heal |
| 40 | **ATRIUM ANGEL** | Always | spin, rain, teleport |
| 40 | **VENUS MANTRAP** | Immune while its minions live | summon, rain, laser |
| 45 | **CHIEF EXECUTIVE OFFICER** | Always | bombs, homing, clones, fan |
| 45 | **THE HOUSE** | Shots reflect while it glows red | spin, wall, reflect |
| 45 | **MARBLE COLOSSUS** | Only its glowing weak point | slam, bombs, homing |
| 50 | **THE CHAIRMAN** | Always + pylons | bombs, pylons, homing, clones, laser |
| 50 | **REACTOR HEART** | Always + pylons | pylons, rain, mines, laser |
| 50 | **BLACK SITE ABOMINATION** | Always | charge, sonic, summon, bombs |


### THE REMOTE (legendary)
Not a gun: a TV remote for reality. While it's equipped a remote appears on screen; click (PC) or tap (mobile) its buttons, then click things in the world:
- **POWER:** switch an enemy, a shot or a bomb off (it freezes, grey). Switch it back on whenever you like: turn a bomb off before it lands and back on when it's over someone else. Enemies still off when the area ends count as killed. Bosses reboot after 6 seconds.
- **INFO:** open the stat sheet of whatever you click and edit it: health, damage, move speed, attack delay, size; delete or add attacks; delete traits (armor, shield, regen...); switch sides (it fights for you), set on fire, freeze, heal, clone, full stop, delete. For a shot: change its damage or speed, or send it back at whoever fired it.
- **PAUSE:** stop time for everything except you. Shoot, swap, reposition the fight, then resume.
- **REWIND (hold):** time runs backwards at double speed, up to 15 seconds: enemies walk back, shots fly back into the guns, newly arrived enemies walk back out, your health returns. The dead stay dead.
- **SKIP (fast-forward):** push something ahead in time: a bomb or grenade goes off right now where it is, a shot has already flown past, an enemy ages 30 years (half its health, slow and sluggish).

### Weapons
There are 41 weapons: 33 guns, 7 melee weapons and The Remote. You start with a pistol. Enemies randomly drop weapons, shown as a spinning model with a light beam in the gun's rarity color. Bosses always drop a rare or better gun. Tap a drop to grab it; anything left on the floor is collected automatically when the area is clear. You can carry **3 guns**, and **SWAP** cycles through them. If your hands are full when you pick one up, you choose which gun to drop, or leave the new one behind. Picking up a gun you already carry refills its ammo.

| Gun | Rarity | What it does |
|---|---|---|
| Pistol | Common | Starter sidearm |
| Revolver | Common | Heavy rounds, 4x headshots |
| Staple Gun | Common | Tap fast, huge clip |
| Pump Shotgun | Common | 7-pellet spread |
| SMG | Common | Hold to spray |
| Double Barrel | Uncommon | 12 pellets, 2 shells |
| Assault Rifle | Uncommon | Accurate full-auto |
| Burst Rifle | Uncommon | 3-round burst per tap |
| Nail Gun | Uncommon | Full-auto, pierces 1 enemy |
| Sniper Rifle | Rare | Huge damage, pierces, 4x heads |
| Grenade Launcher | Rare | Explosive splash damage |
| Tesla Coil | Rare | Lightning chains to 3 more enemies |
| Flamethrower | Rare | Short range, sets enemies on fire |
| Cryo Blaster | Rare | Freezes and slows enemies |
| Hand Cannon | Rare | Knocks enemies back |
| Minigun | Epic | 120-round belt |
| Railgun | Epic | Beam pierces every enemy in line |
| Rocket Launcher | Epic | One rocket, massive explosion |
| Leech Pistol | Epic | Each hit heals you |
| Golden Gun | Legendary | One shot kills anything in its path |
| **Chainsaw** | Epic | Melee. Hold to shred anything within reach |
| **Katana** | Rare | Melee. Long reach, slices 2 enemies |
| **Fire Axe** | Uncommon | Melee. Heavy chops with knockback |
| **Slugger** | Common | Melee. Bat with huge knockback, swats projectiles |
| **Sledgehammer** | Rare | Melee. Slow, smashes everything near the impact |
| **Stun Baton** | Uncommon | Melee. Fast zaps that freeze enemies |
| **Plasma Blade** | Epic | Melee. Burning blade with long reach |
| Crossbow | Uncommon | Piercing bolt, 4x headshots |
| Harpoon Gun | Rare | Skewers 3 enemies and drags them closer |
| Flare Gun | Common | Sets a target ablaze |
| Akimbo Pistols | Uncommon | Two pistols, hold to fire |
| Laser Rifle | Rare | Pinpoint full-auto beam |
| Plasma Cannon | Epic | Explosive plasma balls |
| Shock Shotgun | Rare | Pellets arc to a nearby enemy |
| Blunderbuss | Common | 14 pellets, one shot |
| Mini Rocket Pod | Epic | 4-rocket bursts with splash |
| Seeker Pistol | Rare | Rounds curve onto the nearest target |
| Paper Shredder | Uncommon | Sprays razor paper |
| Coffee Cannon | Common | Scalding splash that burns |
| Black Hole Gun | Legendary | Opens a singularity where it hits: drags in enemies, their shots, gibs and props for a few seconds, then collapses in a blast |
| The Remote | Legendary | Not a gun: power things off, pause and rewind time, edit enemies (see above) |

**Melee weapons** need no ammo but only reach a few metres. Every swing also knocks nearby projectiles out of the air, so they double as a shield.

Higher rarities only start dropping on later floors.

### The tower: 50 floors, 3 versions each
The tower has 10 zones. Each zone has **three alternate themes**, and when you reach a floor one version is picked at random. A version is a theme (look, floor and wall materials, room types) plus a lighting mood (normal, **Night Shift**, red **Lockdown**, **Blackout**, toxic **Contaminated**) plus an enemy focus (office staff, security, robots or mutants). Retrying a floor replays the same version.

| Floors | Version A | Version B | Version C |
|---|---|---|---|
| 1–4 | Mailroom Levels | Records Department | Reception Wing |
| 5–9 | Cubicle Farm | Call Center | Open Plan |
| 10–14 | Data Center | Server Vault | IT Helldesk |
| 15–20 | Executive Suites | Gold Floor | Trophy Hall |
| 21–25 | R&D Labs | Biohazard Wing | Clean Room |
| 26–30 | Robotics Wing | Assembly Line | Test Chambers |
| 31–35 | The Archives | The Library | Cold Storage |
| 36–40 | Sky Garden | The Atrium | Greenhouse |
| 41–45 | The Penthouse | Casino Lounge | Marble Halls |
| 46–50 | Reactor Core | Black Site | Chairman's Sanctum |

Room types are offices, cubicles, break rooms, conference rooms, mailrooms, server rooms, executive offices, labs (specimen tanks), factories (conveyors and robot arms), archives, roof gardens, lounges (bar, piano, pool table) and reactor rooms. There's a boss every 5 floors, ending with the Chairman on floor 50. The city skyline outside the windows sinks as you climb. Above floor 20 the whole upper-tower roster is in play, and the difficulty curve flattens.
