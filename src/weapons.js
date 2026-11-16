// The armory: 20 guns with distinct behaviours, plus a procedural model builder
// so each one looks different in your hands and as a floor pickup.
import * as THREE from '../vendor/three.module.min.js';
import * as TX from './textures.js';
import { box } from './level.js';

export const RARITY = {
  common: { name: 'COMMON', color: '#d8d0c0', hex: 0xd8d0c0, weight: 50, minFloor: 1 },
  uncommon: { name: 'UNCOMMON', color: '#60e070', hex: 0x60e070, weight: 30, minFloor: 1 },
  rare: { name: 'RARE', color: '#50a0ff', hex: 0x50a0ff, weight: 15, minFloor: 2 },
  epic: { name: 'EPIC', color: '#c060ff', hex: 0xc060ff, weight: 6, minFloor: 4 },
  legendary: { name: 'LEGENDARY', color: '#ffc830', hex: 0xffc830, weight: 1.6, minFloor: 6 },
};

// Stats: dmg per pellet, cd = seconds between shots, spread in screen px.
// Specials: pierce (extra enemies), explode (radius m), chain (arcs), burn (dps),
// freeze (s), leech (hp/hit), range (m), headMult, burst, knock (m), tracer colour.
export const GUNS = [
  { id: 'pistol', name: 'PISTOL', rarity: 'common', desc: 'Reliable office-issue sidearm.', mag: 12, reload: 1.0, cd: 0.13, dmg: 1, sound: 'pistol', kick: 1,
    m: { len: 0.3, h: 0.075, col: 'dark', blen: 0.04 } },
  { id: 'revolver', name: 'REVOLVER', rarity: 'common', desc: 'Six heavy rounds. 4x headshots.', mag: 6, reload: 1.4, cd: 0.36, dmg: 2.4, headMult: 4, sound: 'revolver', kick: 1.8,
    m: { len: 0.2, h: 0.08, col: 'metal', blen: 0.22, bt: 0.035, grip: 'wood', drum: true } },
  { id: 'stapler', name: 'STAPLE GUN', short: 'STAPLER', rarity: 'common', desc: 'Tap fast. Light hits, huge clip.', mag: 24, reload: 1.0, cd: 0.06, dmg: 0.6, sound: 'staple', kick: 0.5,
    m: { len: 0.26, h: 0.1, col: 'red', blen: 0.02, w: 0.06 } },
  { id: 'shotgun', name: 'PUMP SHOTGUN', short: 'SHOTGUN', rarity: 'common', desc: '7 pellets. Brutal up close.', mag: 6, reload: 1.5, cd: 0.6, dmg: 0.8, pellets: 7, spread: 34, range: 14, sound: 'shotgun', kick: 2.2,
    m: { len: 0.26, h: 0.08, col: 'dark', blen: 0.46, tube: true, stock: 'wood' } },
  { id: 'smg', name: 'SMG', rarity: 'common', desc: 'Hold to spray.', mag: 32, reload: 1.35, cd: 0.085, dmg: 0.55, spread: 12, auto: true, sound: 'smg', kick: 0.55,
    m: { len: 0.36, h: 0.1, col: 'dark', blen: 0.14, bt: 0.035, mag: 'box' } },
  { id: 'dbarrel', name: 'DOUBLE BARREL', short: 'DBL BARREL', rarity: 'uncommon', desc: '12 pellets. 2 shells. Pure violence.', mag: 2, reload: 1.1, cd: 0.22, dmg: 0.9, pellets: 12, spread: 46, range: 11, sound: 'shotgun', kick: 2.8,
    m: { len: 0.22, h: 0.08, col: 'wood', blen: 0.5, barrels: 2, stock: 'wood' } },
  { id: 'rifle', name: 'ASSAULT RIFLE', short: 'RIFLE', rarity: 'uncommon', desc: 'Accurate full-auto.', mag: 30, reload: 1.6, cd: 0.11, dmg: 0.85, spread: 6, auto: true, sound: 'rifle', kick: 0.7,
    m: { len: 0.42, h: 0.1, col: 'dark', blen: 0.2, mag: 'box', stock: 'dark' } },
  { id: 'burst', name: 'BURST RIFLE', short: 'BURST', rarity: 'uncommon', desc: 'Three-round bursts per tap.', mag: 24, reload: 1.4, cd: 0.42, burst: 3, dmg: 1.1, spread: 4, sound: 'rifle', kick: 0.8,
    m: { len: 0.4, h: 0.1, col: 'blue', blen: 0.16, mag: 'box', stock: 'dark', scope: true } },
  { id: 'nailgun', name: 'NAIL GUN', short: 'NAILGUN', rarity: 'uncommon', desc: 'Full-auto nails pierce 1 enemy.', mag: 50, reload: 1.4, cd: 0.075, dmg: 0.45, pierce: 1, spread: 8, auto: true, sound: 'staple', kick: 0.4,
    m: { len: 0.34, h: 0.12, col: 'orange', blen: 0.1, mag: 'drum' } },
  { id: 'sniper', name: 'SNIPER RIFLE', short: 'SNIPER', rarity: 'rare', desc: 'Massive damage, pierces 1. 4x heads.', mag: 5, reload: 2.0, cd: 0.9, dmg: 6, pierce: 1, headMult: 4, tracer: 0xffffff, sound: 'sniper', kick: 2.4,
    m: { len: 0.46, h: 0.09, col: 'green', blen: 0.42, bt: 0.03, scope: true, stock: 'green', mag: 'box' } },
  { id: 'grenade', name: 'GRENADE LAUNCHER', short: 'GRENADES', rarity: 'rare', desc: 'Explosive rounds hit everyone nearby.', mag: 6, reload: 2.0, cd: 0.55, dmg: 3.5, explode: 2.2, sound: 'launcher', kick: 1.8,
    m: { len: 0.3, h: 0.1, col: 'green', blen: 0.24, bt: 0.07, mag: 'drum', stock: 'dark' } },
  { id: 'tesla', name: 'TESLA COIL', short: 'TESLA', rarity: 'rare', desc: 'Lightning arcs to 3 more enemies.', mag: 40, reload: 1.6, cd: 0.12, dmg: 0.6, chain: 3, auto: true, tracer: 0x80e0ff, sound: 'zap', kick: 0.3,
    m: { len: 0.32, h: 0.1, col: 'metal', blen: 0.24, coil: 'cyan', glow: 'cyan' } },
  { id: 'flamer', name: 'FLAMETHROWER', short: 'FLAMER', rarity: 'rare', desc: 'Short range. Sets enemies on fire.', mag: 60, reload: 2.0, cd: 0.06, dmg: 0.2, pellets: 2, spread: 30, range: 8, burn: 1.3, auto: true, sound: 'flame', kick: 0.15,
    m: { len: 0.36, h: 0.09, col: 'dark', blen: 0.18, bt: 0.05, tank: true, glow: 'orange' } },
  { id: 'cryo', name: 'CRYO BLASTER', short: 'CRYO', rarity: 'rare', desc: 'Freezes targets, slowing them down.', mag: 20, reload: 1.5, cd: 0.2, dmg: 0.75, freeze: 2.5, tracer: 0xa0e8ff, sound: 'zap', kick: 0.6,
    m: { len: 0.3, h: 0.11, col: 'white', blen: 0.16, coil: 'cyan', glow: 'cyan' } },
  { id: 'cannon', name: 'HAND CANNON', short: 'CANNON', rarity: 'rare', desc: '3 huge rounds that knock enemies back.', mag: 3, reload: 1.6, cd: 0.5, dmg: 4, knock: 1.2, sound: 'sniper', kick: 3,
    m: { len: 0.26, h: 0.11, col: 'metal', blen: 0.18, bt: 0.06, w: 0.09 } },
  { id: 'minigun', name: 'MINIGUN', rarity: 'epic', desc: '120-round belt of pure lead.', mag: 120, reload: 2.6, cd: 0.05, dmg: 0.5, spread: 20, auto: true, sound: 'smg', kick: 0.35,
    m: { len: 0.3, h: 0.13, col: 'dark', blen: 0.4, barrels: 6, mag: 'drum', w: 0.11 } },
  { id: 'railgun', name: 'RAILGUN', rarity: 'epic', desc: 'Beam pierces every enemy in line.', mag: 4, reload: 2.2, cd: 0.8, dmg: 4.5, pierce: 99, tracer: 0x40ffff, sound: 'rail', kick: 2,
    m: { len: 0.4, h: 0.09, col: 'blue', blen: 0.36, coil: 'cyan', glow: 'cyan', stock: 'dark' } },
  { id: 'rocket', name: 'ROCKET LAUNCHER', short: 'ROCKETS', rarity: 'epic', desc: 'One rocket. One huge explosion.', mag: 1, reload: 1.7, cd: 0.3, dmg: 8, explode: 3.2, sound: 'launcher', kick: 3,
    m: { len: 0.6, h: 0.14, col: 'green', blen: 0.04, w: 0.14, glow: 'red' } },
  { id: 'leech', name: 'LEECH PISTOL', short: 'LEECH', rarity: 'epic', desc: 'Every hit heals you 3 HP.', mag: 10, reload: 1.0, cd: 0.16, dmg: 1.2, leech: 3, tracer: 0x60ff60, sound: 'zap', kick: 1,
    m: { len: 0.28, h: 0.08, col: 'green', blen: 0.08, glow: 'green', coil: 'green' } },
  { id: 'golden', name: 'GOLDEN GUN', short: 'GOLDEN', rarity: 'legendary', desc: 'One shot. Kills anything in its path.', mag: 1, reload: 2.4, cd: 0.3, dmg: 60, pierce: 99, headMult: 3, tracer: 0xffd040, sound: 'sniper', kick: 2.5,
    m: { len: 0.3, h: 0.08, col: 'gold', blen: 0.1, grip: 'gold' } },

  // ---------------------------------------------------------------- 20 new weapons
  // melee: no ammo, short reach (melee = metres), every swing also swats nearby projectiles out of the air
  { id: 'chainsaw', name: 'CHAINSAW', rarity: 'epic', desc: 'Hold to shred anything within reach.', melee: 3.6, auto: true, cd: 0.08, dmg: 0.9, sound: 'chainsaw', kick: 0.2,
    m: { melee: 'chainsaw' } },
  { id: 'katana', name: 'KATANA', rarity: 'rare', desc: 'Long reach. Slices through 2 enemies.', melee: 4.2, cd: 0.34, dmg: 5, pierce: 1, sound: 'slash', kick: 1,
    m: { melee: 'katana' } },
  { id: 'fireaxe', name: 'FIRE AXE', rarity: 'uncommon', desc: 'Heavy chops that knock enemies back.', melee: 3.6, cd: 0.6, dmg: 6, knock: 1, sound: 'chop', kick: 1.4,
    m: { melee: 'axe' } },
  { id: 'slugger', name: 'SLUGGER', rarity: 'common', desc: 'Bat. Huge knockback, swats projectiles.', melee: 3.4, cd: 0.42, dmg: 3, knock: 1.6, parry: 2, sound: 'chop', kick: 1.2,
    m: { melee: 'bat' } },
  { id: 'sledge', name: 'SLEDGEHAMMER', rarity: 'rare', desc: 'Slow. Smashes everything near the impact.', melee: 3.6, cd: 1.0, dmg: 8, explode: 1.3, sound: 'chop', kick: 2.4,
    m: { melee: 'hammer' } },
  { id: 'baton', name: 'STUN BATON', rarity: 'uncommon', desc: 'Fast zaps that freeze enemies in place.', melee: 3.2, cd: 0.28, dmg: 2.2, freeze: 1.5, sound: 'zap', kick: 0.6,
    m: { melee: 'baton' } },
  { id: 'plasmablade', name: 'PLASMA BLADE', rarity: 'epic', desc: 'Burning energy blade with long reach.', melee: 4.6, cd: 0.24, dmg: 4, burn: 1.2, pierce: 1, sound: 'slash', kick: 0.8,
    m: { melee: 'blade' } },
  // ranged
  { id: 'crossbow', name: 'CROSSBOW', rarity: 'uncommon', desc: 'Silent bolt that pierces one enemy.', mag: 1, reload: 0.85, cd: 0.2, dmg: 5, pierce: 1, headMult: 4, tracer: 0xc0a070, sound: 'staple', kick: 1,
    m: { len: 0.36, h: 0.07, col: 'wood', blen: 0.05, bow: true } },
  { id: 'harpoon', name: 'HARPOON GUN', rarity: 'rare', desc: 'Skewers 3 enemies and drags them closer.', mag: 1, reload: 1.1, cd: 0.3, dmg: 4, pierce: 2, knock: -1.2, tracer: 0x909aa4, sound: 'launcher', kick: 1.6,
    m: { len: 0.36, h: 0.09, col: 'blue', blen: 0.36, bt: 0.035, tube: true } },
  { id: 'flaregun', name: 'FLARE GUN', rarity: 'common', desc: 'Sets one target ablaze.', mag: 1, reload: 0.8, cd: 0.2, dmg: 1.5, burn: 2.2, tracer: 0xff5020, sound: 'launcher', kick: 1,
    m: { len: 0.2, h: 0.1, col: 'orange', blen: 0.08, bt: 0.06 } },
  { id: 'akimbo', name: 'AKIMBO PISTOLS', short: 'AKIMBO', rarity: 'uncommon', desc: 'Two pistols, one trigger. Hold to fire.', mag: 24, reload: 1.3, cd: 0.09, dmg: 0.8, spread: 8, auto: true, sound: 'pistol', kick: 0.6,
    m: { len: 0.3, h: 0.075, col: 'metal', blen: 0.04, akimbo: true } },
  { id: 'laserrifle', name: 'LASER RIFLE', short: 'LASER', rarity: 'rare', desc: 'Pinpoint full-auto beam.', mag: 40, reload: 1.5, cd: 0.07, dmg: 0.55, auto: true, tracer: 0xff3030, sound: 'zap', kick: 0.15,
    m: { len: 0.42, h: 0.09, col: 'white', blen: 0.2, coil: 'red', glow: 'red', scope: true } },
  { id: 'plasmacannon', name: 'PLASMA CANNON', short: 'PLASMA', rarity: 'epic', desc: 'Explosive plasma balls.', mag: 4, reload: 1.8, cd: 0.5, dmg: 4, explode: 1.6, tracer: 0x50ff70, sound: 'rail', kick: 1.8,
    m: { len: 0.36, h: 0.13, col: 'green', blen: 0.22, bt: 0.08, coil: 'green', glow: 'green' } },
  { id: 'shockgun', name: 'SHOCK SHOTGUN', short: 'SHOCKGUN', rarity: 'rare', desc: 'Pellets arc to a nearby enemy.', mag: 6, reload: 1.5, cd: 0.6, dmg: 0.7, pellets: 6, spread: 32, chain: 1, range: 13, tracer: 0x80e0ff, sound: 'shotgun', kick: 2,
    m: { len: 0.26, h: 0.09, col: 'blue', blen: 0.42, tube: true, coil: 'cyan' } },
  { id: 'blunderbuss', name: 'BLUNDERBUSS', rarity: 'common', desc: '14 pellets, one shot, wide spread.', mag: 1, reload: 1.1, cd: 0.3, dmg: 0.55, pellets: 14, spread: 60, range: 10, sound: 'shotgun', kick: 3,
    m: { len: 0.24, h: 0.08, col: 'wood', blen: 0.4, bt: 0.07, stock: 'wood' } },
  { id: 'rocketpod', name: 'MINI ROCKET POD', short: 'ROCKETPOD', rarity: 'epic', desc: '4-rocket bursts with splash.', mag: 8, reload: 2.0, cd: 0.7, burst: 4, dmg: 2.5, explode: 1.3, sound: 'launcher', kick: 1.2,
    m: { len: 0.4, h: 0.16, col: 'green', blen: 0.04, w: 0.16, barrels: 6, glow: 'red' } },
  { id: 'seeker', name: 'SEEKER PISTOL', short: 'SEEKER', rarity: 'rare', desc: 'Smart rounds curve onto the nearest target.', mag: 10, reload: 1.0, cd: 0.15, dmg: 1.3, seek: 90, tracer: 0xffe060, sound: 'zap', kick: 0.8,
    m: { len: 0.28, h: 0.08, col: 'white', blen: 0.06, glow: 'orange', scope: true } },
  { id: 'shredgun', name: 'PAPER SHREDDER', short: 'SHREDDER', rarity: 'uncommon', desc: 'Sprays a cloud of razor paper.', mag: 60, reload: 1.6, cd: 0.08, dmg: 0.35, pellets: 3, spread: 20, auto: true, sound: 'staple', kick: 0.3,
    m: { len: 0.36, h: 0.16, col: 'white', blen: 0.04, w: 0.14, mag: 'box' } },
  { id: 'coffeecannon', name: 'COFFEE CANNON', short: 'COFFEE', rarity: 'common', desc: 'Scalding splash that burns.', mag: 6, reload: 1.3, cd: 0.4, dmg: 1.5, explode: 0.9, burn: 0.6, sound: 'launcher', kick: 1,
    m: { len: 0.3, h: 0.12, col: 'dark', blen: 0.16, bt: 0.08, tank: true } },
  { id: 'blackhole', name: 'BLACK HOLE GUN', short: 'BLACKHOLE', rarity: 'legendary', desc: 'Collapses a singularity that drags enemies in.', mag: 1, reload: 3, cd: 0.4, dmg: 10, explode: 2.8, pull: true, tracer: 0xa040ff, sound: 'rail', kick: 2.6,
    m: { len: 0.34, h: 0.14, col: 'dark', blen: 0.12, bt: 0.1, coil: 'purple', glow: 'purple', w: 0.12 } },
];
export const GUN = Object.fromEntries(GUNS.map((g) => [g.id, g]));
for (const g of GUNS) { if (g.melee) { g.mag = 0; g.reload = 0; } g.pellets ||= 1; g.spread ||= 0; g.pierce ||= 0; g.headMult ||= 3; g.short ||= g.name; }

export function rollGun(floor, rng = Math.random, exclude = [], minRarity = null) {
  const order = Object.keys(RARITY);
  const minIdx = minRarity ? order.indexOf(minRarity) : 0;
  const pool = GUNS.filter((g) => g.id !== 'pistol' && !exclude.includes(g.id)
    && floor >= RARITY[g.rarity].minFloor && order.indexOf(g.rarity) >= minIdx);
  if (!pool.length) return null;
  let total = pool.reduce((a, g) => a + RARITY[g.rarity].weight, 0), r = rng() * total;
  for (const g of pool) if ((r -= RARITY[g.rarity].weight) <= 0) return g.id;
  return pool[0].id;
}

export function statLine(g) {
  const rate = g.burst ? 'BURST' : g.auto ? 'AUTO' : g.cd < 0.2 ? 'FAST' : g.cd < 0.45 ? 'MED' : 'SLOW';
  const dmg = Math.round(g.dmg * g.pellets * 10) / 10;
  return g.melee ? `MELEE  DMG ${dmg}  REACH ${g.melee}M  ${rate}` : `DMG ${dmg}  MAG ${g.mag}  ${rate}`;
}

// ---------------------------------------------------------------- models
let MATS = null;
function mats() {
  if (MATS) return MATS;
  const L = (c, k) => new THREE.MeshLambertMaterial({ map: TX.metal(c, 'gm' + k) });
  const B = (c) => new THREE.MeshBasicMaterial({ color: c });
  MATS = {
    dark: L([46, 48, 54], 'dark'), metal: L([140, 144, 152], 'metal'), red: L([180, 40, 36], 'red'),
    blue: L([50, 70, 120], 'blue'), green: L([62, 80, 50], 'green'), white: L([210, 214, 220], 'white'),
    orange: L([220, 120, 30], 'orange'), gold: L([230, 180, 50], 'gold'),
    wood: new THREE.MeshLambertMaterial({ map: TX.wood([96, 58, 30], 'g') }),
    skin: new THREE.MeshLambertMaterial({ map: TX.plastic([214, 168, 130], 'skin') }),
    sleeve: new THREE.MeshLambertMaterial({ map: TX.plastic([210, 210, 204], 'slv') }),
    cuff: new THREE.MeshLambertMaterial({ map: TX.plastic([60, 62, 72], 'cuff') }),
    gcyan: B(0x60f0ff), gorange: B(0xff9a30), ggreen: B(0x70ff60), gred: B(0xff4030), gpurple: B(0xb050ff),
  };
  return MATS;
}

function part(g, w, h, d, mat, x, y, z, rx = 0) {
  const m = new THREE.Mesh(box(w, h, d), mat); m.position.set(x, y, z); m.rotation.x = rx; g.add(m); return m;
}

// withArm=false for world pickups.
function buildMelee(def, withArm) {
  const M = mats(), k = def.m.melee;
  const g = new THREE.Group();
  const P = (w, h, d, mat, x, y, z, rx = 0) => part(g, w, h, d, mat, x, y, z, rx);
  let tip = new THREE.Vector3(0, 0, -0.5);
  if (k === 'chainsaw') {
    P(0.14, 0.16, 0.34, M.orange, 0, 0, 0); P(0.06, 0.06, 0.12, M.dark, 0, 0.12, 0.02);
    P(0.03, 0.09, 0.62, M.metal, 0, 0, -0.48); P(0.035, 0.11, 0.6, M.dark, 0, 0, -0.48);
    tip = new THREE.Vector3(0, 0, -0.8);
  } else if (k === 'katana' || k === 'blade') {
    P(0.04, 0.05, 0.2, k === 'blade' ? M.metal : M.dark, 0, 0, 0.02); P(0.1, 0.02, 0.04, M.gold, 0, 0, -0.09);
    P(0.015, 0.05, 0.8, k === 'blade' ? M.gcyan : M.white, 0, 0, -0.5);
    tip = new THREE.Vector3(0, 0, -0.9);
  } else if (k === 'axe' || k === 'hammer' || k === 'bat') {
    P(0.04, 0.04, 0.7, M.wood, 0, 0, -0.25);
    if (k === 'axe') { P(0.03, 0.2, 0.14, M.red, 0, 0.08, -0.52); P(0.035, 0.22, 0.03, M.metal, 0, 0.08, -0.6); }
    if (k === 'hammer') P(0.16, 0.16, 0.3, M.dark, 0, 0, -0.6);
    if (k === 'bat') P(0.07, 0.07, 0.4, M.wood, 0, 0, -0.5);
    tip = new THREE.Vector3(0, 0, -0.7);
  } else if (k === 'baton') {
    P(0.05, 0.05, 0.55, M.dark, 0, 0, -0.2); P(0.06, 0.06, 0.06, M.gcyan, 0, 0, -0.5);
    tip = new THREE.Vector3(0, 0, -0.5);
  }
  if (withArm) {
    part(g, 0.1, 0.1, 0.12, M.skin, 0, -0.06, 0.08);
    part(g, 0.13, 0.13, 0.5, M.sleeve, 0.02, -0.14, 0.42, -0.35);
  }
  g.rotation.x = withArm ? 0.5 : 0;
  return { g, tip, melee: true };
}

export function buildGunModel(def, withArm = true) {
  if (def.melee) return buildMelee(def, withArm);
  const M = mats(), s = def.m;
  const g = new THREE.Group();
  const col = M[s.col] || M.dark, w = s.w || 0.07, h = s.h, len = s.len;
  const z0 = 0.06;
  part(g, w, h, len, col, 0, 0, z0 - len / 2);
  part(g, w * 0.9, h * 0.6, len * 0.7, M.dark, 0, -h * 0.55, z0 - len * 0.4);
  part(g, 0.06, 0.16, 0.08, M[s.grip] || M.dark, 0, -h / 2 - 0.07, 0.0, 0.25);
  const bt = s.bt || 0.04, by = h * 0.15, bz = z0 - len - s.blen / 2;
  if (s.barrels === 2) { part(g, bt, bt, s.blen, M.metal, -0.022, by, bz); part(g, bt, bt, s.blen, M.metal, 0.022, by, bz); }
  else if (s.barrels === 6) {
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; part(g, 0.025, 0.025, s.blen, M.metal, Math.cos(a) * 0.035, Math.sin(a) * 0.035, bz); }
    part(g, 0.1, 0.1, 0.03, M.dark, 0, 0, bz - s.blen * 0.3); part(g, 0.1, 0.1, 0.03, M.dark, 0, 0, bz + s.blen * 0.3);
  } else part(g, bt, bt, s.blen, s.col === 'gold' ? M.gold : M.metal, 0, by, bz);
  const tip = new THREE.Vector3(0, s.barrels === 6 ? 0 : by, z0 - len - s.blen - 0.02);
  let pump = null;
  if (s.tube) { part(g, 0.045, 0.045, s.blen * 0.8, M.dark, 0, by - 0.055, bz + 0.05); pump = part(g, 0.085, 0.075, 0.2, M.wood, 0, by - 0.06, z0 - len - 0.12); }
  if (s.mag === 'box') part(g, 0.045, 0.18, 0.06, M.metal, 0, -h / 2 - 0.08, z0 - len * 0.45, 0.15);
  if (s.mag === 'drum' || s.drum) part(g, s.drum ? 0.09 : 0.11, s.drum ? 0.09 : 0.11, s.drum ? 0.08 : 0.1, M.dark, 0, s.drum ? h * 0.1 : -h / 2 - 0.06, z0 - len * (s.drum ? 0.75 : 0.5));
  if (s.stock) part(g, 0.06, 0.11, 0.3, M[s.stock] || M.dark, 0, -0.03, z0 + 0.15, 0.1);
  if (s.scope) { part(g, 0.045, 0.05, 0.22, M.dark, 0, h / 2 + 0.04, z0 - len * 0.45); part(g, 0.035, 0.035, 0.01, M.gcyan, 0, h / 2 + 0.04, z0 - len * 0.45 - 0.115); }
  if (s.tank) { part(g, 0.1, 0.16, 0.18, M.red, 0.075, -0.02, z0 - len * 0.35); part(g, 0.03, 0.03, 0.06, M.metal, 0.075, 0.08, z0 - len * 0.35); }
  if (s.coil) for (let k = 0; k < 3; k++) part(g, bt + 0.05, bt + 0.05, 0.025, M['g' + s.coil], 0, by, bz - s.blen * 0.3 + k * s.blen * 0.3);
  if (s.glow) part(g, bt + 0.012, bt + 0.012, 0.03, M['g' + s.glow], 0, tip.y, tip.z + 0.02);
  if (s.bow) { const l = part(g, 0.5, 0.03, 0.04, M.dark, 0, by, z0 - len + 0.02); l.rotation.z = 0; part(g, 0.48, 0.01, 0.01, M.white, 0, by, z0 - len + 0.06); }
  if (s.akimbo) { const g2 = new THREE.Group(); g2.position.x = -0.32; g.add(g2); part(g2, w, h, len, col, 0, 0, z0 - len / 2); part(g2, 0.06, 0.16, 0.08, M.dark, 0, -h / 2 - 0.07, 0, 0.25); if (withArm) part(g2, 0.1, 0.1, 0.12, M.skin, 0, -h / 2 - 0.07, 0); }
  if (withArm) {
    part(g, 0.1, 0.1, 0.12, M.skin, 0, -h / 2 - 0.07, 0.0);
    part(g, 0.13, 0.13, 0.08, M.cuff, 0.01, -h / 2 - 0.1, 0.09, -0.35);
    part(g, 0.13, 0.13, 0.5, M.sleeve, 0.02, -h / 2 - 0.17, 0.36, -0.35);
    if (len + s.blen > 0.55) part(g, 0.1, 0.09, 0.12, M.skin, 0, by - 0.1, z0 - len - 0.1);
  }
  return { g, tip, pump };
}
