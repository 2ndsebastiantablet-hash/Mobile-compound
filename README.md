# OVERTIME

A portrait, touch-first on-rails shooter set in a 50-floor office tower. You stand in place with a fixed camera. Tap enemies to shoot them. When an area is clear you walk to the next one automatically. Clear every area on a floor, ride the elevator up, and keep climbing until you reach the boardroom.

The look is a low-res, chunky-pixel 3D style in the spirit of mid-90s shooters. Everything is drawn in code at runtime: blocky box models, tiny nearest-filtered textures, flat fluorescent lighting and fog. The game ships no image or audio files. Every texture, model, sound effect and music loop is generated procedurally.

## Downloads
- **`dist/overtime-pc.html`** is the **PC version**: landscape, mouse and keyboard. Double-click it to play in Chrome, Edge or Firefox.
- **`dist/overtime.html`** is the **mobile version**: portrait, touch. Open it in your phone's browser.

Both are single self-contained files that work offline. Rebuild them with `node tools/build.mjs`.

### PC controls
| Input | Action |
|---|---|
| Mouse | Aim (crosshair turns red over an enemy) |
| Left click / hold | Shoot / automatic fire |
| Right click or `R` | Reload |
| Mouse wheel, `1` `2` `3`, `Q`/`E`/`Tab` | Switch gun |
| `Esc` / `P` | Pause |
| `F` | Fullscreen |
| `M` | Mute |
| `Enter` | Start from the title screen |

The PC version shows the whole room in widescreen, the gun follows your cursor, and aim assist is reduced because a mouse is more precise than a finger. During development, add `?pc` to the URL to get the PC mode.

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


### Weapons
There are 40 weapons: 33 guns and 7 melee weapons. You start with a pistol. Enemies randomly drop weapons, shown as a spinning model with a light beam in the gun's rarity color. Bosses always drop a rare or better gun. Tap a drop to grab it; anything left on the floor is collected automatically when the area is clear. You can carry **3 guns**, and **SWAP** cycles through them. If your hands are full when you pick one up, you choose which gun to drop, or leave the new one behind. Picking up a gun you already carry refills its ammo.

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
| Black Hole Gun | Legendary | Singularity that drags enemies in |

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

## Code layout

```
index.html / style.css     HUD, menus, status bar
src/main.js                game loop, input, shooting, area/floor flow, viewmodel
src/level.js               floor + room generator, furniture kits, elevators
src/weapons.js             the 20 guns, rarity rolls, procedural gun models
src/enemydefs.js           the enemy roster (data: floors, movement, attacks, traits)
src/enemymodels.js         procedural bodies: humans, drones, mechs, spiders, quads, blobs, turrets...
src/enemies.js             generic enemy AI + projectiles
src/bosses.js              the 60 bosses: data + BossBrain (attack scripts, vulnerability rules)
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
