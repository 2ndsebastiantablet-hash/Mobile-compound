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
There are 55 enemy types: the 4 original grunts plus 50 new ones, and the floor bosses. Each one has a floor range, and areas fill up with random picks from the enemies allowed on that floor. Low floors are mostly office staff. Robots, drones and turrets show up in the data center, and mutants, oozes and lab horrors appear higher up. Bosses still appear on floors 5, 10, 15 and 20. The first time you meet a new enemy type, a **NEW HOSTILE** callout appears.

Things to know:
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


### Weapons
You start with a pistol. Enemies randomly drop guns, shown as a spinning model with a light beam in the gun's rarity color. Bosses always drop a rare or better gun. Tap a drop to grab it; anything left on the floor is collected automatically when the area is clear. You can carry **3 guns**, and **SWAP** cycles through them. If your hands are full when you pick one up, you choose which gun to drop, or leave the new one behind. Picking up a gun you already carry refills its ammo.

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

Higher rarities only start dropping on later floors.

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
src/weapons.js             the 20 guns, rarity rolls, procedural gun models
src/enemydefs.js           the enemy roster (data: floors, movement, attacks, traits)
src/enemymodels.js         procedural bodies: humans, drones, mechs, spiders, quads, blobs, turrets...
src/enemies.js             generic enemy AI + projectiles
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
