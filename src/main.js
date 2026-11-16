import * as THREE from '../vendor/three.module.min.js';
import { buildFloor, floorPlan, MOODS, box, EYE, RD, TOP_FLOOR } from './level.js';
import { Enemy, Projectile } from './enemies.js';
import { DEFS, rosterFor, isFlyer, isMelee } from './enemydefs.js';
import { Effects } from './effects.js';
import * as TX from './textures.js';
import { initAudio, sfx, setMusic, setMuted, isMuted } from './audio.js';
import { GUN, GUNS, RARITY, rollGun, buildGunModel, statLine } from './weapons.js';
import { rand, pick, shuffle, ease, lerp, clamp, storeGet, storeSet } from './util.js';

// ------------------------------------------------------------------ DOM
const $ = (id) => document.getElementById(id);
const gameEl = $('game'), canvas = $('view');
const ui = {
  hud: $('hud'), floor: $('floorLbl'), area: $('areaLbl'), score: $('scoreLbl'), combo: $('comboLbl'),
  hp: $('hpLbl'), ammo: $('ammoLbl'), reload: $('reloadLbl'), weapon: $('weaponLbl'),
  banner: $('banner'), sub: $('subBanner'), markers: $('markers'), hurt: $('hurt'), fade: $('fade'),
  bossbar: $('bossbar'), bossName: $('bossName'), bossFill: $('bossFill'), gunChoice: $('gunChoice'), toast: $('toast'), slotLbl: $('slotLbl'),
  title: $('title'), pause: $('pause'), floorClear: $('floorClear'), gameOver: $('gameOver'), win: $('win'),
};

// ------------------------------------------------------------------ renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.autoClear = false;
const scene = new THREE.Scene();
// PC build: set by the PC page (or ?pc in the URL). Landscape, mouse + keyboard.
const PC = !!window.OVERTIME_PC || new URLSearchParams(location.search).has('pc');
if (PC) document.body.classList.add('pc');
const camera = new THREE.PerspectiveCamera(PC ? 64 : 80, 0.5, 0.05, 80);
scene.add(camera);
const hemi = new THREE.HemisphereLight(0xffffff, 0x333333, 1.5);
scene.add(hemi);
const amb = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(amb);
const roomLights = [0, 1].map(() => { const l = new THREE.PointLight(0xffffff, 9, 16, 1.4); scene.add(l); return l; });
const muzzleLight = new THREE.PointLight(0xffc070, 0, 9, 1.6);
camera.add(muzzleLight); muzzleLight.position.set(0.2, -0.2, -0.6);

// Viewmodel scene
const gunScene = new THREE.Scene();
const gunCam = new THREE.PerspectiveCamera(55, 0.5, 0.01, 10);
gunScene.add(new THREE.AmbientLight(0xffffff, 0.9));
const gunSun = new THREE.DirectionalLight(0xffffff, 1.6); gunSun.position.set(-1, 2, 1.5); gunScene.add(gunSun);
const gunRoot = new THREE.Group(); gunRoot.scale.setScalar(0.62); gunScene.add(gunRoot);
const gunBase = new THREE.Vector3();

const effects = new Effects(scene, camera);
const raycaster = new THREE.Raycaster();

// ------------------------------------------------------------------ weapons
const MAX_GUNS = 3;
const FLASH_MAT = new THREE.MeshBasicMaterial({ map: TX.flash(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
const models = {};
function viewModel(id) {
  if (!models[id]) {
    const md = buildGunModel(GUN[id], true);
    md.flash = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), FLASH_MAT);
    md.flash.position.copy(md.tip); md.flash.visible = false; md.g.add(md.flash);
    if (md.pump) md.pumpZ = md.pump.position.z;
    md.g.visible = false; gunRoot.add(md.g);
    models[id] = md;
  }
  return models[id];
}

// ------------------------------------------------------------------ game state
const G = {
  scene, camera, fx: effects, sfx,
  camPos: new THREE.Vector3(0, EYE, 0),
  floorNum: 1, floor: null, room: null, roomIdx: 0,
  combatActive: false,
  enemies: [], projectiles: [], pickups: [],
};
const P = { hp: 100, inv: [{ id: 'pistol', ammo: 12 }], slot: 0, invAtFloor: null, burstLeft: 0, burstT: 0, reloadT: 0, cd: 0, recoil: 0, flashT: 0, aimYaw: 0, aimPitch: 0, aimTY: 0, aimTP: 0, swapT: 0 };
let score = 0, floorStartScore = 0, combo = 0, lastKill = -10, now = 0;
let stats = newStats();
let mode = 'title', paused = false;
const BASE_PITCH = PC ? -0.06 : -0.1;
let yaw = 0, pitch = BASE_PITCH, roll = 0, shake = 0;
let area = null;
let hold = null;
let titleT = 0;
const best = storeGet('overtime.best', { floor: 0, score: 0 });

function newStats() { return { shots: 0, hits: 0, kills: 0, heads: 0, orbs: 0, dmg: 0, t: 0 }; }
const cur = () => GUN[P.inv[P.slot].id];
const curSlot = () => P.inv[P.slot];
let pendingGuns = [], choiceOpen = false, gunsThisFloor = 0;
const seenTypes = new Set(storeGet('overtime.seen', []));
let pendingIntro = [], introT = 0;

// ------------------------------------------------------------------ sequences (generator coroutines)
let seq = null, seqWait = 0, seqUntil = null;
function run(gen) { seq = gen(); seqWait = 0; seqUntil = null; seq.next(0); }
function* tween(dur, fn) { let t = 0; fn(0); while (t < dur) { t += yield; fn(Math.min(1, t / dur)); } }
function stepSeq(dt) {
  if (!seq) return;
  if (seqWait > 0) { seqWait -= dt; if (seqWait > 0) return; dt = -seqWait; seqWait = 0; }
  if (seqUntil) { if (!seqUntil()) return; seqUntil = null; }
  const r = seq.next(dt);
  if (r.done) seq = null;
  else if (typeof r.value === 'number' && r.value > 0) seqWait = r.value;
  else if (typeof r.value === 'function') seqUntil = r.value;
}
function fade(to, dur) { ui.fade.style.transition = `opacity ${dur}s linear`; ui.fade.style.opacity = to; }

// ------------------------------------------------------------------ floor setup
function clearFloor() {
  for (const e of G.enemies) e.remove();
  for (const p of G.projectiles) p.kill();
  for (const p of G.pickups) scene.remove(p.mesh);
  G.enemies = []; G.projectiles = []; G.pickups = [];
  effects.clearAll();
  if (G.floor) scene.remove(G.floor.group);
  G.floor = null;
}

function loadFloor(n, variant) {
  clearFloor();
  G.floorNum = n;
  G.diff = n <= 20 ? n : 20 + (n - 20) * 0.5;
  G.variant = variant;
  const plan = floorPlan(n, variant);
  const f = buildFloor(n, plan);
  G.floor = f; scene.add(f.group);
  const th = f.theme, md = MOODS[plan.mood];
  const fogCol = md.fogCol ?? th.fog;
  scene.fog = new THREE.Fog(fogCol, 3, md.fog || 22);
  scene.background = new THREE.Color(fogCol);
  renderer.setClearColor(fogCol);
  hemi.color.set(th.hemi[0]); hemi.groundColor.set(th.hemi[1]);
  hemi.intensity = 1.5 * (md.hemi || 1); amb.intensity = 0.35 * (md.hemi || 1);
  const lc = new THREE.Color(md.light || th.light); if (md.tint) lc.lerp(new THREE.Color(md.tint), 0.4);
  for (const l of roomLights) { l.color.copy(lc); l.intensity = 9 * (md.room || 1); }
  gunScene.children[0].color.copy(lc); gunScene.children[0].intensity = 0.9 * Math.max(0.5, md.hemi || 1);
  setRoom(0);
  setLights(f.rooms[0], f.rooms[0], 0);
}

function setRoom(i) { G.roomIdx = i; G.room = G.floor.rooms[i]; }
function setLights(a, b, k) {
  roomLights.forEach((l, j) => l.position.lerpVectors(a.lightPos[j], b.lightPos[j], k));
}

// ------------------------------------------------------------------ area planning
function weightedType() {
  const pool = rosterFor(G.floorNum, G.floor && G.floor.plan.focus);
  let total = pool.reduce((a, [, d]) => a + d.w, 0), r = Math.random() * total;
  for (const [id, d] of pool) if ((r -= d.w) <= 0) return id;
  return 'grunt';
}

function prepareArea(i) {
  const f = G.floorNum, room = G.floor.rooms[i];
  const last = i === G.floor.rooms.length - 1;
  room.spots.forEach((s) => (s.taken = null));
  const df = G.diff || f;
  const n = Math.min(12, 3 + Math.floor(df * 0.55) + Math.floor(i * 0.5));
  const initialN = Math.min(n, 3 + Math.floor(df / 5));
  const types = [];
  // cap the heavy hitters so an area is never a wall of tanks
  let heavy = 0;
  const maxHeavy = f > 20 ? 2 : 1;
  for (let k = 0; k < n; k++) {
    let t = weightedType();
    for (let tries = 0; tries < 8 && DEFS[t].hp >= 12 && heavy >= maxHeavy; tries++) t = weightedType();
    if (DEFS[t].hp >= 12) heavy++;
    types.push(t);
  }
  area = { idx: i, room, queue: [], waveT: 2.5, maxAlive: Math.min(7, 3 + Math.floor((G.diff || f) / 4)), clearing: false, boss: null };
  if (last && G.floor.isBoss) {
    const bossSpot = { x: 0, z: room.z0 - 9.8, cover: false };
    const b = new Enemy(G, 'boss', bossSpot);
    G.enemies.push(b); area.boss = b;
    ui.bossName.textContent = bossName(f);
    spawnAt(weightedType()); spawnAt(weightedType());
    return;
  }
  const initial = types.slice(0, initialN), rest = types.slice(initialN);
  for (const t of initial) spawnAt(t);
  area.queue = rest;
}

function bossName(f) { return ['', 'REGIONAL MANAGER', 'VP OF OPERATIONS', 'CHIEF FINANCIAL OFFICER', 'CHIEF OPERATING OFFICER', 'HEAD OF R&D', 'DIRECTOR OF ROBOTICS', 'CHIEF ARCHIVIST', 'CHIEF EXECUTIVE OFFICER', 'THE PRESIDENT', 'THE CHAIRMAN'][f / 5] || 'THE MANAGER'; }

function visibleSpots(room) {
  const hw = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
  return room.spots.filter((s) => (!s.taken || !s.taken.alive) && Math.abs(s.x) < hw * (room.stand.z - s.z) - 0.45);
}

function airSpot(room) { return { x: rand(Math.random, -2, 2), y: rand(Math.random, 1.8, 2.4), z: room.z0 - rand(Math.random, 5.5, 10), cover: false }; }
function laneSpot(room) { return { x: rand(Math.random, -1.5, 1.5), z: room.z0 - rand(Math.random, 6, 10.5), cover: false }; }

function freeSpot(type) {
  const room = area ? area.room : G.room;
  if (isFlyer(type)) return airSpot(room);
  const d = DEFS[type];
  // only use spots the fixed camera can actually see (portrait screens are narrow)
  let list = visibleSpots(room);
  if (d.move !== 'stand' || d.nocover) list = list.filter((s) => !s.cover);
  const cover = list.filter((s) => s.cover);
  const pool = cover.length && Math.random() < 0.7 ? cover : list;
  if (!pool.length) return laneSpot(room);
  return pick(Math.random, pool);
}

function introduce(type) {
  if (seenTypes.has(type) || DEFS[type].boss) return;
  seenTypes.add(type); storeSet('overtime.seen', [...seenTypes]);
  pendingIntro.push(DEFS[type].name);
}

function spawnAt(type) {
  const s = freeSpot(type);
  const e = new Enemy(G, type, s);
  s.taken = e;
  G.enemies.push(e);
  introduce(type);
  return e;
}

function spawnReinforcement(type) {
  const room = area.room;
  const d = DEFS[type];
  if (d.move === 'turret' || d.move === 'burrow') {
    // stationary things and burrowers just pop up out of the floor
    const s = freeSpot(type);
    const e = new Enemy(G, type, s, { active: true });
    s.taken = e; G.enemies.push(e); effects.dust(e.pos.clone().setY(0.1), 12); introduce(type);
    return e;
  }
  const entry = pick(Math.random, room.doorSpawns).clone();
  const s = isMelee(type) ? { x: entry.x, z: entry.z + 1.6, cover: false } : freeSpot(type);
  const e = new Enemy(G, type, s, { enter: entry });
  s.taken = e;
  G.enemies.push(e);
  introduce(type);
  for (const el of room.elevators) if (Math.abs(el.x - entry.x) < 0.5 && el !== room.exitElevator) { el.target = 1; el.closeAt = now + 2.8; sfx.ding(); }
  return e;
}
G.spawnReinforcement = (t) => { if (area) spawnReinforcement(t); };

// minions (summons, splits) appear right where their parent is
G.spawnMinion = (type, pos, n) => {
  if (!area) return;
  for (let k = 0; k < n; k++) {
    if (G.enemies.filter((e) => e.alive).length >= 14) break;
    const at = pos.clone().add(new THREE.Vector3(rand(Math.random, -0.6, 0.6), 0, rand(Math.random, -0.3, 0.6)));
    at.x = clamp(at.x, -2.6, 2.6);
    const spot = isFlyer(type) ? airSpot(area.room) : isMelee(type) ? { x: at.x, z: at.z, cover: false } : freeSpot(type);
    const e = new Enemy(G, type, spot, { at, active: true });
    if (!isMelee(type) && !isFlyer(type)) e.goal.set(spot.x, 0, spot.z);
    G.enemies.push(e); introduce(type);
  }
};
G.randomSpot = (e) => {
  const room = area ? area.room : G.room;
  const list = visibleSpots(room).filter((s) => !s.cover && s !== e.spot);
  return list.length ? pick(Math.random, list) : laneSpot(room);
};
G.blast = (center, r, dmg) => {
  effects.explosion(center, r); sfx.explode(); shake = Math.min(1, shake + 0.4);
  for (const o of G.enemies) {
    if (!o.alive || o.state === 'dormant') continue;
    const c = o.centerWorld(new THREE.Vector3());
    if (c.distanceTo(center) < r) o.damage(dmg, 'body', c);
  }
};

// ------------------------------------------------------------------ game callbacks
G.spawnProjectile = (from, target, speed, dmg, kind, opts) => { G.projectiles.push(new Projectile(G, from, target, speed, dmg, kind, opts)); };

G.hurtPlayer = (dmg, src) => {
  if (!G.combatActive || mode !== 'combat') return;
  P.hp = Math.max(0, P.hp - dmg);
  stats.dmg += dmg;
  sfx.hurt();
  shake = Math.min(1, shake + 0.5);
  ui.hurt.style.transition = 'none'; ui.hurt.style.opacity = 0.9;
  requestAnimationFrame(() => { ui.hurt.style.transition = 'opacity .5s'; ui.hurt.style.opacity = 0; });
  combo = 0;
  if (P.hp <= 0) playerDied();
};

G.onEnemyKilled = (e, head, noScore) => {
  if (noScore) return;
  stats.kills++; if (head) stats.heads++;
  combo = now - lastKill < 2.5 ? Math.min(8, combo + 1) : 1;
  lastKill = now;
  const pts = (e.st.score + (head ? 50 : 0)) * combo;
  score += pts;
  popText(e.centerWorld(new THREE.Vector3()), `+${pts}`);
  if (e === area?.boss) {
    for (const o of G.enemies) if (o !== e && o.alive) o.die(false);
    for (const p of G.projectiles) p.kill();
    shake = 1;
  }
  // weapon drops: bosses always drop something good; floor 1 guarantees an early find
  const gunChance = e.type === 'boss' ? 1 : (G.floorNum === 1 && gunsThisFloor === 0 && area && area.idx >= 1) ? 0.35 : 0.075;
  if (Math.random() < gunChance) {
    const id = rollGun(G.floorNum, Math.random, P.inv.map((s) => s.id), e.type === 'boss' ? 'rare' : null);
    if (id) { dropGun(e.pos, id); return; }
  }
  if (P.hp < 100 && Math.random() < (P.hp < 40 ? 0.3 : 0.12)) dropMedkit(e.pos);
};

const MED_M = new THREE.MeshLambertMaterial({ map: TX.medkit() });
const HIT_M = new THREE.MeshBasicMaterial({ visible: false });
function addPickup(kind, pos, mesh, extra = {}) {
  const root = new THREE.Group();
  root.position.set(pos.x, 0, pos.z);
  const spin = new THREE.Group(); spin.add(mesh); root.add(spin);
  const hit = new THREE.Mesh(box(0.9, 0.8, 0.9), HIT_M); hit.position.y = 0.35; root.add(hit);
  scene.add(root);
  const p = { kind, mesh: root, spin, hit, t: Math.random() * 6, collect: false, ...extra };
  hit.userData.pickup = p;
  G.pickups.push(p);
  return p;
}
function dropMedkit(pos) {
  addPickup('med', pos, new THREE.Mesh(box(0.34, 0.22, 0.26), MED_M));
}
const beamCache = {};
function dropGun(pos, id) {
  gunsThisFloor++;
  const def = GUN[id], r = RARITY[def.rarity];
  const md = buildGunModel(def, false);
  md.g.scale.setScalar(1.5); md.g.rotation.z = 0.3;
  const p = addPickup('gun', pos, md.g, { id });
  if (!beamCache[def.rarity]) beamCache[def.rarity] = new THREE.MeshBasicMaterial({ color: r.hex, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending });
  const beam = new THREE.Mesh(box(0.08, 2.4, 0.08), beamCache[def.rarity]); beam.position.y = 1.2; p.mesh.add(beam);
  popText(new THREE.Vector3(pos.x, 1.2, pos.z), def.short, r.color);
  sfx.gunPickup();
}

function collectPickup(p) {
  if (p.collect) return;
  p.collect = true; p.ct = 0;
  if (p.kind === 'gun') { giveGun(p.id); return; }
  sfx.pickup();
  P.hp = Math.min(100, P.hp + 25);
  popText(p.mesh.position, '+25 HP', '#60ff80');
}

// ------------------------------------------------------------------ inventory
function giveGun(id) {
  const def = GUN[id];
  const have = P.inv.findIndex((s) => s.id === id);
  sfx.gunPickup();
  if (have >= 0) { P.inv[have].ammo = def.mag; toast(`${def.short} AMMO REFILLED`, RARITY[def.rarity].color); return; }
  if (P.inv.length < MAX_GUNS) {
    P.inv.push({ id, ammo: def.mag });
    equip(P.inv.length - 1, true);
    toast(`GOT ${def.name}`, RARITY[def.rarity].color);
    return;
  }
  pendingGuns.push(id);
  if (!choiceOpen) openChoice();
}

function gunCardHTML(def, extra = '') {
  const r = RARITY[def.rarity];
  return `<div class="gname" style="color:${r.color}">${def.name}</div><div class="grar" style="color:${r.color}">${r.name}</div>`
    + `<div class="gdesc">${def.desc}</div><div class="gstat">${statLine(def)}</div>${extra}`;
}

function openChoice() {
  const id = pendingGuns.shift();
  if (!id) { choiceOpen = false; ui.gunChoice.classList.add('hidden'); if (mode !== 'title') paused = false; return; }
  choiceOpen = true; paused = true; hold = null;
  const def = GUN[id];
  $('gcNew').innerHTML = gunCardHTML(def);
  $('gcNew').style.borderColor = RARITY[def.rarity].color;
  const slots = $('gcSlots'); slots.innerHTML = '';
  P.inv.forEach((s, i) => {
    const d = GUN[s.id];
    const b = document.createElement('button');
    b.className = 'slotBtn'; b.style.borderColor = RARITY[d.rarity].color;
    b.innerHTML = `<span class="drop">DROP</span>${gunCardHTML(d)}`;
    b.addEventListener('click', (e) => {
      e.stopPropagation(); sfx.tap();
      P.inv[i] = { id, ammo: def.mag };
      equip(i, true);
      toast(`GOT ${def.name}`, RARITY[def.rarity].color);
      openChoice();
    });
    slots.appendChild(b);
  });
  ui.gunChoice.classList.remove('hidden');
}

let toastTimer = null;
function toast(text, color) {
  ui.toast.textContent = text; ui.toast.style.color = color || '#e8e0c8';
  ui.toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1600);
}

// ------------------------------------------------------------------ flow
function startGame(floor = 1, keepScore = false) {
  initAudio();
  hideScreens();
  if (!keepScore) { score = 0; }
  floorStartScore = score;
  P.hp = 100;
  if (keepScore && P.invAtFloor) P.inv = P.invAtFloor.map((s) => ({ ...s }));
  else P.inv = [{ id: 'pistol', ammo: GUN.pistol.mag }];
  P.slot = 0;
  autoReload();
  pendingGuns = []; choiceOpen = false; ui.gunChoice.classList.add('hidden');
  G.floorNum = floor;
  startFloor(floor, keepScore);
}

function startFloor(n, sameVariant = false) {
  mode = 'intro'; G.combatActive = false;
  stats = newStats(); combo = 0;
  // each floor has 3 versions; roll one (a retry replays the same version)
  loadFloor(n, sameVariant && G.variant != null && G.floorNum === n ? G.variant : Math.floor(Math.random() * 3));
  floorStartScore = score;
  ui.hud.classList.remove('hidden');
  ui.bossbar.classList.add('hidden');
  P.invAtFloor = P.inv.map((s) => ({ ...s }));
  gunsThisFloor = 0;
  equip(P.slot, true);
  const room0 = G.floor.rooms[0];
  prepareArea(0);
  setMusic('calm');
  run(function* () {
    const el = room0.entryElevator;
    yaw = 0; pitch = BASE_PITCH; roll = 0;
    if (el) { G.camPos.copy(el.inside); } else G.camPos.copy(room0.stand).add(new THREE.Vector3(0, 0, 1.2));
    applyCamera();
    fade(0, 0.8);
    banner(`FLOOR ${String(n).padStart(2, '0')}`, (G.floor.isBoss ? 'EXECUTIVE PRESENT · ' : '') + G.floor.plan.name, 2.4);
    yield 0.6;
    if (el) { sfx.ding(); yield 0.4; el.target = 1; sfx.door(); yield 0.9; }
    const from = G.camPos.clone();
    yield* walk(from, room0.stand, null);
    if (el) { el.target = 0; }
    beginCombat();
  });
}

function* walk(from, to, lights) {
  const dist = from.distanceTo(to);
  const dur = Math.max(0.6, dist / 3.6);
  let lastStep = 0;
  yield* tween(dur, (k) => {
    const e = ease(k);
    G.camPos.lerpVectors(from, to, e);
    const travelled = dist * e;
    G.camPos.y = to.y + Math.abs(Math.sin(travelled * 2.2)) * 0.05 - 0.02;
    roll = Math.sin(travelled * 1.1) * 0.012;
    if (travelled - lastStep > 1.43) { lastStep = travelled; sfx.step(); }
    if (lights) setLights(lights[0], lights[1], e);
  });
  roll = 0;
}

function beginCombat() {
  mode = 'combat'; G.combatActive = true;
  setMusic('combat');
  let k = 0;
  for (const e of G.enemies) if (e.state === 'dormant') { const en = e; setTimeout(() => en.activate(), 150 + k++ * 220); }
  if (area.boss) { ui.bossbar.classList.remove('hidden'); banner(bossName(G.floorNum), 'PERFORMANCE REVIEW', 2); }
  updateHud(true);
}

function startAmbush(room) {
  area = { idx: area.idx, room, queue: [], waveT: 99, maxAlive: 0, clearing: false, boss: null, ambush: true };
  mode = 'combat'; G.combatActive = true;
  setMusic('combat');
  banner('AMBUSH!', null, 0.9);
  sfx.telegraph(); sfx.door();
  const n = 1 + (G.floorNum >= 6 ? 1 : 0) + (G.floorNum >= 25 ? 1 : 0);
  for (let k = 0; k < n; k++) {
    let type = 'grunt';
    for (let tries = 0; tries < 12; tries++) { type = weightedType(); const d = DEFS[type]; if (d.move !== 'turret' && d.move !== 'burrow') break; }
    const side = n === 1 ? (Math.random() < 0.5 ? -1 : 1) : (k % 2 ? 1 : -1);
    const spot = { x: side * rand(Math.random, 0.5, 1.3), y: 2.0, z: G.camPos.z - rand(Math.random, 3.0, 4.4), cover: false };
    const e = new Enemy(G, type, spot, { active: true });
    // pop up from behind the furniture
    if (!isFlyer(type)) { e.crouch = 1; e.crouchTarget = 0; }
    e.atkT = rand(Math.random, 0.7, 1.2) + k * 0.4;
    effects.dust(e.pos.clone().setY(0.1), 10);
    G.enemies.push(e); introduce(type);
  }
  updateHud(true);
}

function ambushCleared() {
  area.clearing = true;
  G.combatActive = false;
  mode = 'moving';
  setMusic('calm');
  for (const p of G.projectiles) p.kill();
  G.projectiles = [];
  for (const p of G.pickups) collectPickup(p);
  sfx.clear();
  banner('CLEAR', null, 0.8);
}

function areaCleared() {
  area.clearing = true;
  G.combatActive = false;
  mode = 'moving';
  setMusic('calm');
  ui.bossbar.classList.add('hidden');
  for (const p of G.projectiles) p.kill();
  G.projectiles = [];
  for (const p of G.pickups) collectPickup(p);
  sfx.clear();
  const rooms = G.floor.rooms;
  const i = area.idx;
  if (i < rooms.length - 1) {
    banner('AREA CLEAR', null, 1.2);
    run(function* () {
      yield 1.1;
      autoReload();
      const to = rooms[i + 1].stand;
      if (Math.random() < Math.min(0.5, 0.22 + G.floorNum * 0.01)) {
        // AMBUSH: stop halfway and make the player react
        const mid = G.camPos.clone().lerp(to, 0.45);
        yield* walk(G.camPos.clone(), mid, null);
        startAmbush(rooms[i]);
        yield () => area.clearing;
        yield 0.7;
      }
      prepareArea(i + 1);
      yield* walk(G.camPos.clone(), to, [rooms[i], rooms[i + 1]]);
      setRoom(i + 1);
      beginCombat();
    });
  } else {
    banner('FLOOR CLEAR', null, 1.6);
    const room = rooms[i], el = room.exitElevator;
    run(function* () {
      yield 1.0;
      autoReload();
      sfx.ding(); yield 0.3; el.target = 1; sfx.door();
      yield 0.6;
      const front = new THREE.Vector3(0, EYE, room.zf + 1.2);
      yield* walk(G.camPos.clone(), front, null);
      yield* walk(front, el.inside, null);
      const y0 = yaw;
      el.target = 0; sfx.door();
      yield* tween(1.1, (k) => { yaw = y0 + Math.PI * ease(k); });
      yield 0.4;
      fade(1, 0.6); yield 0.7;
      floorComplete();
    });
  }
}

function autoReload() { for (const s of P.inv) s.ammo = GUN[s.id].mag; P.reloadT = 0; P.burstLeft = 0; }

function floorComplete() {
  mode = 'floorclear';
  const n = G.floorNum;
  if (n > best.floor || score > best.score) { best.floor = Math.max(best.floor, n); best.score = Math.max(best.score, score); storeSet('overtime.best', best); }
  if (n >= TOP_FLOOR) { showWin(); return; }
  const acc = stats.shots ? Math.round((stats.hits / stats.shots) * 100) : 0;
  $('fcTitle').textContent = `FLOOR ${String(n).padStart(2, '0')} CLEARED`;
  $('fcStats').textContent = [
    `KILLS       ${stats.kills}`, `HEADSHOTS   ${stats.heads}`, `ORBS POPPED ${stats.orbs}`,
    `ACCURACY    ${acc}%`, `TIME        ${fmtTime(stats.t)}`, `SCORE       ${score}`,
  ].join('\n');
  const heal = Math.min(100 - P.hp, 30);
  P.hp += heal;
  let unlock = heal > 0 ? `+${heal} HP COFFEE BREAK` : '';
  unlock += (unlock ? '\n' : '') + 'LOADOUT: ' + P.inv.map((s) => GUN[s.id].short).join(' / ');
  $('fcUnlock').textContent = unlock;
  showScreen(ui.floorClear);
}

function fmtTime(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${String(s).padStart(2, '0')}`; }

function nextFloor() {
  hideScreens();
  const n = G.floorNum + 1;
  G.floorNum = n;
  startFloor(n);
}

function playerDied() {
  G.combatActive = false; mode = 'dead';
  setMusic('off');
  for (const p of G.projectiles) p.kill();
  G.projectiles = [];
  if (score > best.score) { best.score = score; storeSet('overtime.best', best); }
  run(function* () {
    const y0 = G.camPos.y;
    yield* tween(1.0, (k) => { G.camPos.y = lerp(y0, 0.35, ease(k)); roll = ease(k) * 1.1; pitch = BASE_PITCH + k * 0.3; });
    fade(0.7, 0.5); yield 0.6;
    $('goStats').textContent = `FLOOR ${G.floorNum}\nSCORE ${score}\nBEST FLOOR ${Math.max(best.floor, G.floorNum)}`;
    showScreen(ui.gameOver);
  });
}

function showWin() {
  $('winStats').textContent = `FINAL SCORE ${score}\nBEST ${best.score}`;
  showScreen(ui.win);
  setMusic('calm');
}

function toTitle() {
  hideScreens();
  ui.hud.classList.add('hidden');
  mode = 'title'; G.combatActive = false; seq = null;
  loadFloor(1, 0);
  prepareArea(0);
  G.camPos.copy(G.floor.rooms[0].stand);
  yaw = 0; pitch = BASE_PITCH; roll = 0;
  fade(0, 0.8);
  setMusic('calm');
  $('bestLbl').textContent = best.floor ? `BEST: FLOOR ${best.floor} / ${best.score} PTS` : '';
  showScreen(ui.title);
}

function showScreen(el) { el.classList.remove('hidden'); }
function hideScreens() { for (const k of ['title', 'pause', 'floorClear', 'gameOver', 'win']) ui[k].classList.add('hidden'); }

let bannerTimer = null;
function banner(text, sub, dur) {
  ui.banner.textContent = text; ui.sub.textContent = sub || '';
  ui.banner.classList.add('show'); ui.sub.classList.toggle('show', !!sub);
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { ui.banner.classList.remove('show'); ui.sub.classList.remove('show'); }, dur * 1000);
}

// ------------------------------------------------------------------ shooting
function canvasRect() { return canvas.getBoundingClientRect(); }
const tmp = new THREE.Vector3();
function toScreen(v, rect) {
  tmp.copy(v).project(camera);
  return { x: (tmp.x + 1) / 2 * rect.width, y: (1 - tmp.y) / 2 * rect.height, behind: tmp.z > 1 };
}

function equip(i, silent) {
  P.slot = clamp(i, 0, P.inv.length - 1);
  const id = cur().id;
  viewModel(id);
  for (const k in models) models[k].g.visible = k === id;
  P.swapT = silent ? 0 : 1; P.reloadT = 0; P.burstLeft = 0;
  if (!silent) sfx.reload();
  updateHud(true);
}

function swapWeapon() {
  if (choiceOpen) return;
  if (P.inv.length < 2) { sfx.empty(); toast('ONLY 1 GUN - FIND MORE'); return; }
  equip((P.slot + 1) % P.inv.length);
  toast(cur().name, RARITY[cur().rarity].color);
}

function startReload() {
  const w = cur();
  if (P.reloadT > 0 || curSlot().ammo >= w.mag) return;
  P.reloadT = w.reload; P.reloadDur = w.reload; P.burstLeft = 0;
  sfx.reload();
}

function tryFire(x, y) {
  if (!G.combatActive || mode !== 'combat' || paused) return;
  const w = cur();
  if (P.reloadT > 0 || P.cd > 0 || P.swapT > 0.3 || P.burstLeft > 0) return;
  if (curSlot().ammo <= 0) { sfx.empty(); startReload(); P.cd = 0.25; return; }
  P.cd = w.cd;
  if (w.burst) { P.burstLeft = w.burst; P.burstT = 0; P.burstX = x; P.burstY = y; return; }
  fireOnce(x, y);
}

function fireOnce(x, y) {
  const w = cur(), slot = curSlot();
  if (slot.ammo <= 0) { P.burstLeft = 0; startReload(); return; }
  slot.ammo--;
  stats.shots++;
  sfx[w.sound]();
  P.recoil = Math.min(1.8, P.recoil + w.kick);
  P.flashT = 0.05;
  muzzleLight.intensity = w.explode ? 10 : 6;
  aimGunAt(x, y);
  if (viewModel(w.id).pump) P.pump = 1;
  const rect = canvasRect();
  let best = null;
  for (let i = 0; i < w.pellets; i++) {
    let ox = 0, oy = 0;
    if (w.spread) { const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * w.spread; ox = Math.cos(a) * r; oy = Math.sin(a) * r; }
    const res = resolveShot(x + ox, y + oy, w, rect, i === 0);
    if (res && (!best || res === 'head')) best = res;
  }
  if (best === 'head' || best === 'body') stats.hits++;
  marker(x, y, best === 'head' ? 'head' : best ? '' : 'miss');
  if (slot.ammo <= 0) setTimeout(startReload, 180);
  updateHud();
}

const V3 = () => new THREE.Vector3();

function resolveShot(x, y, w, rect, primary) {
  // 1. incoming projectiles: generous screen-space hit
  let bp = null, bd = PC ? 34 : 46;
  for (const p of G.projectiles) {
    if (!p.alive) continue;
    const s = toScreen(p.mesh.position, rect);
    if (s.behind) continue;
    const dist = Math.hypot(s.x - x, s.y - y);
    const r = (PC ? 20 : 30) + (PC ? 20 : 30) / Math.max(0.6, p.mesh.position.distanceTo(G.camPos));
    if (dist < r && dist < bd) { bd = dist; bp = p; }
  }
  if (bp) {
    effects.pop(bp.mesh.position.clone()); sfx.orbPop();
    bp.kill(); stats.orbs++; score += 25 * Math.max(1, combo);
    popText(bp.mesh.position, '+25', '#80e0ff');
    return 'orb';
  }
  // 2. raycast
  const ndc = new THREE.Vector2((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const ray = raycaster.ray;
  const targets = [];
  for (const e of G.enemies) if (e.targetable) targets.push(...e.meshes);
  const hitsT = raycaster.intersectObjects(targets, false);
  const hitsL = raycaster.intersectObject(G.floor.group, true).filter((h) => !h.object.material.transparent && h.object.material.fog !== false);
  const levelHit = hitsL[0];
  const wallD = levelHit ? levelHit.distance : Infinity;
  const maxD = Math.min(wallD + 0.05, w.range || Infinity);
  const pk = raycaster.intersectObjects(G.pickups.filter((p) => !p.collect).map((p) => p.hit), false)[0];
  if (pk && pk.distance < wallD + 0.3 && !(hitsT[0] && hitsT[0].distance < maxD)) { collectPickup(pk.object.userData.pickup); return 'pickup'; }

  const hits = [], seen = new Set();
  for (const h of hitsT) {
    if (h.distance > maxD) break;
    const e = h.object.userData.enemy;
    if (seen.has(e)) continue;
    seen.add(e);
    hits.push({ e, part: h.object.userData.part, point: h.point, dist: h.distance });
    if (hits.length > w.pierce) break;
  }
  // 3. aim assist (screen space, small radius, not through walls, not on hidden enemies)
  if (!hits.length) {
    let ae = null, ad = PC ? 12 : 30; // mice are precise, fingers are not
    for (const e of G.enemies) {
      if (!e.targetable || e.crouch > 0.5) continue;
      const c = e.centerWorld(V3());
      const s = toScreen(c, rect);
      if (s.behind) continue;
      const d = Math.hypot(s.x - x, s.y - y);
      const dist = c.distanceTo(G.camPos);
      if (w.range && dist > w.range) continue;
      if (d < ad && (!levelHit || dist < levelHit.distance + 0.4 || (e.crouch < 0.2 && levelHit.distance > dist - 1.6))) { ad = d; ae = { e, part: e.shieldHp > 0 ? 'shield' : 'body', point: c, dist }; }
    }
    if (ae) hits.push(ae);
  }

  const muzzle = camera.localToWorld(new THREE.Vector3(0.08, -0.16, -0.45));
  const far = levelHit ? levelHit.point.clone() : ray.at(w.range || 30, V3());
  if (w.range && levelHit && levelHit.distance > w.range) far.copy(ray.at(w.range, V3()));

  if (w.explode) {
    const at = hits.length ? hits[0].point.clone() : far.clone().addScaledVector(ray.direction, -0.25);
    effects.beam(muzzle, at, 0xffa040, 0.03, 0.06);
    return explode(at, w);
  }

  let best = null;
  hits.forEach((h, i) => {
    const r = applyHit(h.e, h.part, h.point, w, primary && i === 0, ray.direction);
    if (!best || r === 'head') best = r;
  });

  if (w.tracer) {
    const end = w.pierce >= 99 || !hits.length ? far : hits[hits.length - 1].point;
    if (w.chain) effects.lightning(muzzle, end, w.tracer);
    else effects.beam(muzzle, end, w.tracer, w.pierce >= 99 ? 0.07 : 0.025, w.pierce >= 99 ? 0.25 : 0.08);
  }
  if (w.burn && primary) {
    const stop = hits.length ? hits[0].dist : Math.min(wallD, w.range);
    for (let t = 1.2; t < stop; t += 1.3) effects.fire(ray.at(t, V3()), 1);
  }
  if (!hits.length && levelHit && !(w.range && levelHit.distance > w.range)) {
    const n = levelHit.face.normal.clone().transformDirection(levelHit.object.matrixWorld);
    if (w.burn) effects.fire(levelHit.point.clone().addScaledVector(n, 0.05), 3);
    else {
      effects.hole(levelHit.point, n);
      effects.dust(levelHit.point.clone().addScaledVector(n, 0.03), 3);
      if (primary) effects.impact(levelHit.point.clone().addScaledVector(n, 0.05));
    }
  }
  return best;
}

function applyHit(e, part, point, w, sound, dir) {
  const head = part === 'head' && e.type !== 'bot';
  e.damage(head ? (w.dmg * w.headMult) / 3 : w.dmg, part, point);
  if (w.burn) { e.burnT = 3; e.burnDps = w.burn; }
  if (w.freeze) { e.slowT = w.freeze; effects.ice(point, 6); }
  if (w.knock && e.alive && e.type !== 'boss' && area) {
    e.pos.addScaledVector(dir.clone().setY(0).normalize(), w.knock);
    e.pos.z = Math.max(e.pos.z, area.room.zf + 0.6); e.pos.x = clamp(e.pos.x, -3, 3);
  }
  if (w.leech) { P.hp = Math.min(100, P.hp + w.leech); effects.emit(point, 3, 'ice', 1); }
  if (w.chain) chainFrom(e, point, w);
  if (sound) sfx[head ? 'headshot' : e.type === 'bot' ? 'metalHit' : 'hit']();
  return head ? 'head' : 'body';
}

function chainFrom(e, point, w) {
  const from = point.clone();
  const others = G.enemies.filter((o) => o !== e && o.targetable)
    .map((o) => ({ o, c: o.centerWorld(V3()) }))
    .filter((x) => x.c.distanceTo(from) < 5.5)
    .sort((a, b) => a.c.distanceTo(from) - b.c.distanceTo(from))
    .slice(0, w.chain);
  let prev = from;
  for (const { o, c } of others) { effects.lightning(prev, c, w.tracer || 0x80e0ff); o.damage(w.dmg * 0.8, 'body', c); prev = c; }
}

function explode(at, w) {
  sfx.explode();
  shake = Math.min(1, shake + 0.6);
  effects.explosion(at, w.explode);
  let hit = null;
  for (const e of G.enemies) {
    if (!e.alive || e.state === 'dormant') continue;
    const c = e.centerWorld(V3());
    const d = c.distanceTo(at);
    if (d < w.explode + 0.3) { e.damage(w.dmg * (1 - Math.min(1, d / w.explode) * 0.6), 'body', c); hit = 'body'; }
  }
  for (const p of G.projectiles) if (p.alive && p.mesh.position.distanceTo(at) < w.explode) { effects.pop(p.mesh.position.clone()); p.kill(); stats.orbs++; }
  return hit;
}

function aimGunAt(x, y) {
  const rect = canvasRect();
  const nx = (x / rect.width) * 2 - 1, ny = -(y / rect.height) * 2 + 1;
  const h3 = 3 * Math.tan(THREE.MathUtils.degToRad(gunCam.fov / 2));
  const tx = nx * h3 * gunCam.aspect, ty = ny * h3;
  const dx = tx - gunBase.x, dy = ty - gunBase.y, dz = -3 - gunBase.z;
  P.aimTY = Math.atan2(-dx, -dz);
  P.aimTP = Math.atan2(dy, Math.hypot(dx, dz));
}

function marker(x, y, cls) {
  const m = document.createElement('div');
  m.className = 'mark ' + cls; m.style.left = x + 'px'; m.style.top = y + 'px';
  ui.markers.appendChild(m); setTimeout(() => m.remove(), 260);
}
function popText(pos, text, color) {
  const rect = canvasRect();
  const s = toScreen(pos, rect);
  if (s.behind) return;
  const d = document.createElement('div');
  d.className = 'pts'; d.textContent = text; d.style.left = s.x + 'px'; d.style.top = s.y + 'px';
  if (color) d.style.color = color;
  ui.markers.appendChild(d); setTimeout(() => d.remove(), 720);
}

// ------------------------------------------------------------------ input
function localXY(ev) { const r = canvasRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; }
let mouse = null;
const crosshair = $('crosshair');
gameEl.addEventListener('pointerdown', (ev) => {
  if (ev.target.closest('button') || ev.target.closest('.screen')) return;
  initAudio();
  if (ev.pointerType === 'mouse' && ev.button === 2) { startReload(); ev.preventDefault(); return; }
  if (ev.pointerType === 'mouse' && ev.button !== 0) return;
  const { x, y } = localXY(ev);
  hold = { id: ev.pointerId, x, y };
  tryFire(x, y);
  ev.preventDefault();
});
gameEl.addEventListener('pointermove', (ev) => {
  const p = localXY(ev);
  if (ev.pointerType === 'mouse') { mouse = p; crosshair.style.transform = `translate(${p.x}px, ${p.y}px)`; }
  if (hold && hold.id === ev.pointerId) { hold.x = p.x; hold.y = p.y; }
});
gameEl.addEventListener('pointerleave', (ev) => { if (ev.pointerType === 'mouse') { mouse = null; hold = null; } });
let wheelT = 0;
gameEl.addEventListener('wheel', (ev) => {
  if (performance.now() - wheelT < 180 || mode === 'title' || choiceOpen) return;
  wheelT = performance.now();
  if (P.inv.length > 1) { equip((P.slot + (ev.deltaY > 0 ? 1 : P.inv.length - 1)) % P.inv.length); toast(cur().name, RARITY[cur().rarity].color); }
}, { passive: true });
const release = (ev) => { if (hold && hold.id === ev.pointerId) hold = null; };
gameEl.addEventListener('pointerup', release);
gameEl.addEventListener('pointercancel', release);
gameEl.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') startReload();
  if (e.key === 'q' || e.key === 'Q' || e.key === 'Tab') { e.preventDefault(); swapWeapon(); }
  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') togglePause();
  if (e.key === 'e' || e.key === 'E') swapWeapon();
  if (['1', '2', '3'].includes(e.key) && !choiceOpen && mode !== 'title') { const i = +e.key - 1; if (i < P.inv.length && i !== P.slot) { equip(i); toast(cur().name, RARITY[cur().rarity].color); } }
  if (e.key === 'f' || e.key === 'F') { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch { /* ignore */ } }
  if (e.key === 'm' || e.key === 'M') { setMuted(!isMuted()); $('muteBtn').textContent = `SOUND: ${isMuted() ? 'OFF' : 'ON'}`; toast(isMuted() ? 'SOUND OFF' : 'SOUND ON'); }
  if (e.key === 'Enter' && mode === 'title') $('startBtn').click();
});

const onBtn = (id, fn) => $(id).addEventListener('click', (e) => { e.stopPropagation(); initAudio(); fn(); });
onBtn('startBtn', () => { sfx.tap(); fade(1, 0.3); setTimeout(() => startGame(1), 320); });
onBtn('reloadBtn', startReload);
onBtn('weaponBtn', swapWeapon);
onBtn('pauseBtn', togglePause);
onBtn('resumeBtn', togglePause);
onBtn('muteBtn', () => { setMuted(!isMuted()); $('muteBtn').textContent = `SOUND: ${isMuted() ? 'OFF' : 'ON'}`; });
onBtn('quitBtn', () => { paused = false; toTitle(); });
onBtn('nextBtn', () => { sfx.tap(); nextFloor(); });
onBtn('retryBtn', () => { score = floorStartScore; startGame(G.floorNum, true); });
onBtn('menuBtn', toTitle);
onBtn('gcLeave', () => { sfx.tap(); openChoice(); });
onBtn('winBtn', toTitle);
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'combat' && !paused) togglePause(); });

function togglePause() {
  if (choiceOpen) return;
  if (mode === 'title' || mode === 'floorclear' || mode === 'dead') return;
  paused = !paused;
  ui.pause.classList.toggle('hidden', !paused);
  setMusic(paused ? 'off' : mode === 'combat' ? 'combat' : 'calm');
}

// ------------------------------------------------------------------ HUD
const hudCache = {};
function setText(el, key, v) { if (hudCache[key] !== v) { hudCache[key] = v; el.textContent = v; return true; } return false; }
function updateHud(force) {
  if (force) for (const k in hudCache) delete hudCache[k];
  setText(ui.floor, 'f', `FLOOR ${String(G.floorNum).padStart(2, '0')}`);
  if (G.floor) setText(ui.area, 'a', `AREA ${Math.min(G.roomIdx + 1, G.floor.rooms.length)}/${G.floor.rooms.length}`);
  setText(ui.score, 's', String(score).padStart(6, '0'));
  setText(ui.combo, 'c', combo > 1 && now - lastKill < 2.5 ? `x${combo} COMBO` : '');
  setText(ui.hp, 'h', String(Math.ceil(P.hp)));
  setText(ui.ammo, 'am', String(curSlot().ammo));
  setText(ui.reload, 'r', P.reloadT > 0 ? 'RELOADING' : 'AMMO');
  ui.reload.classList.toggle('reloading', P.reloadT > 0);
  if (setText(ui.weapon, 'w', cur().short)) ui.weapon.style.color = RARITY[cur().rarity].color;
  setText(ui.slotLbl, 'sl', `SWAP ${P.slot + 1}/${P.inv.length}`);
  if (area?.boss && area.boss.alive) ui.bossFill.style.width = `${Math.max(0, (area.boss.hp / area.boss.maxHp) * 100)}%`;
}

// ------------------------------------------------------------------ resize
function resize() {
  const r = gameEl.getBoundingClientRect();
  const H = Math.min(PC ? 400 : 340, Math.round(r.height));
  const W = Math.max(1, Math.round(r.width * (H / r.height)));
  renderer.setSize(W, H, false);
  camera.aspect = W / H; camera.updateProjectionMatrix();
  gunCam.aspect = W / H; gunCam.updateProjectionMatrix();
  const d = 0.55, hh = d * Math.tan(THREE.MathUtils.degToRad(gunCam.fov / 2)), hw = hh * gunCam.aspect;
  gunBase.set(PC ? hw * 0.3 : hw * 0.55, -hh * (PC ? 0.7 : 0.74), -d);
}
window.addEventListener('resize', resize);
resize();

// ------------------------------------------------------------------ loop
function applyCamera() {
  const s = shake * shake * 0.08;
  camera.position.set(G.camPos.x + (Math.random() - 0.5) * s, G.camPos.y + (Math.random() - 0.5) * s, G.camPos.z);
  const breathe = mode === 'combat' ? Math.sin(now * 1.3) * 0.006 : 0;
  camera.rotation.set(pitch + breathe + (Math.random() - 0.5) * s * 0.5, yaw, roll, 'YXZ');
}

function updateGun(dt) {
  P.recoil = Math.max(0, P.recoil - dt * 7);
  if (PC && mouse) aimGunAt(mouse.x, mouse.y); // gun tracks the cursor
  else { P.aimTY *= Math.pow(0.02, dt); P.aimTP *= Math.pow(0.02, dt); }
  P.aimYaw += (P.aimTY - P.aimYaw) * Math.min(1, dt * 25);
  P.aimPitch += (P.aimTP - P.aimPitch) * Math.min(1, dt * 25);
  P.swapT = Math.max(0, P.swapT - dt * 3);
  let ry = 0.16 + P.aimYaw, rx = P.aimPitch + P.recoil * 0.22, rz = 0;
  let px = gunBase.x, py = gunBase.y - P.swapT * 0.3, pz = gunBase.z + P.recoil * 0.05;
  if (P.reloadT > 0) {
    const k = 1 - P.reloadT / P.reloadDur, s = Math.sin(k * Math.PI);
    py -= s * 0.14; rz += s * 0.7; rx -= s * 0.5;
  }
  const moving = mode === 'moving' || mode === 'intro';
  if (moving) { py += Math.sin(now * 8) * 0.008; px += Math.cos(now * 4) * 0.006; }
  if (mode === 'dead') py -= 0.4;
  gunRoot.position.set(px, py, pz);
  gunRoot.rotation.set(rx, ry, rz, 'YXZ');
  const md = viewModel(cur().id);
  P.flashT -= dt;
  md.flash.visible = P.flashT > 0;
  if (md.flash.visible) { md.flash.rotation.z = Math.random() * 6; md.flash.scale.setScalar(rand(Math.random, 0.8, 1.4)); }
  if (P.pump > 0) { P.pump = Math.max(0, P.pump - dt * 2.2); if (md.pump) md.pump.position.z = md.pumpZ + Math.sin(P.pump * Math.PI) * 0.1; }
  muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 80);
}

function update(dt) {
  now += dt;
  stepSeq(dt);
  if (G.floor) {
    G.floor.update(dt);
    for (const el of G.floor.elevators) if (el.closeAt && now > el.closeAt) { el.target = 0; el.closeAt = 0; }
  }
  if (mode === 'combat') stats.t += dt;

  for (const e of G.enemies) e.update(dt);
  G.enemies = G.enemies.filter((e) => e.alive || e === area?.boss);
  for (const p of G.projectiles) p.update(dt);
  G.projectiles = G.projectiles.filter((p) => p.alive);
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const p = G.pickups[i]; p.t += dt;
    p.spin.rotation.y += dt * 2; p.spin.position.y = (p.kind === 'gun' ? 0.45 : 0.25) + Math.sin(p.t * 3) * 0.06;
    if (p.collect) {
      p.ct += dt; p.mesh.position.lerp(G.camPos, Math.min(1, dt * 6)); p.mesh.scale.setScalar(Math.max(0.01, 1 - p.ct * 2));
      if (p.ct > 0.5) { scene.remove(p.mesh); G.pickups.splice(i, 1); }
    }
  }
  effects.update(dt);
  if (PC && mouse && G.floor) {
    let hot = false;
    if (G.combatActive && !paused) {
      const rect = canvasRect();
      raycaster.setFromCamera(new THREE.Vector2((mouse.x / rect.width) * 2 - 1, -(mouse.y / rect.height) * 2 + 1), camera);
      const t = []; for (const e of G.enemies) if (e.targetable) t.push(...e.meshes);
      hot = raycaster.intersectObjects(t, false).length > 0;
    }
    crosshair.classList.toggle('hot', hot);
  }
  introT -= dt;
  if (pendingIntro.length && introT <= 0 && mode === 'combat' && !choiceOpen) { toast(`NEW HOSTILE: ${pendingIntro.shift()}`, '#ff7050'); introT = 1.8; }

  if (G.combatActive && area && !area.clearing) {
    let alive = 0;
    for (const e of G.enemies) {
      if (!e.alive) continue;
      // safety net: an enemy stranded outside the current room (behind the camera, deep in
      // another room, or outside the walls) for 2s is removed so the area can always finish
      const out = !e.def.boss && (e.pos.z > G.camPos.z + 0.3 || e.pos.z < area.room.zf - 3 || Math.abs(e.pos.x) > 4);
      e.strayT = out ? (e.strayT || 0) + dt : 0;
      if (e.strayT > 2) { e.remove(); e.state = 'dead'; continue; }
      alive++;
    }
    if (area.ambush) {
      if (alive === 0) ambushCleared();
    } else {
      area.waveT -= dt;
      if (area.queue.length && alive < area.maxAlive && area.waveT <= 0) {
        spawnReinforcement(area.queue.shift()); area.waveT = rand(Math.random, 0.9, 2.0);
        alive++; // count it now, or the area could "clear" the same frame the last wave spawns
      }
      if (!area.queue.length && alive === 0 && (!area.boss || !area.boss.alive)) areaCleared();
    }
  }

  // weapon timers
  P.cd = Math.max(0, P.cd - dt);
  if (P.reloadT > 0) { P.reloadT -= dt; if (P.reloadT <= 0) { P.reloadT = 0; curSlot().ammo = cur().mag; sfx.tap(); } }
  if (P.burstLeft > 0) {
    P.burstT -= dt;
    if (P.burstT <= 0) {
      P.burstLeft--; P.burstT = 0.07;
      if (G.combatActive && mode === 'combat') fireOnce(P.burstX, P.burstY); else P.burstLeft = 0;
    }
  }
  if (hold && cur().auto) tryFire(hold.x, hold.y);

  if (mode === 'title') {
    titleT += dt;
    yaw = Math.sin(titleT * 0.15) * 0.25; pitch = BASE_PITCH + 0.04 + Math.sin(titleT * 0.11) * 0.04;
  }
  shake = Math.max(0, shake - dt * 2.2);
  applyCamera();
  updateGun(dt);
  if (mode !== 'title') updateHud();
}

let last = performance.now();
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  if (!paused) update(dt);
  renderer.clear();
  renderer.render(scene, camera);
  if (mode !== 'title' && mode !== 'floorclear') { renderer.clearDepth(); renderer.render(gunScene, gunCam); }
  requestAnimationFrame(frame);
}

toTitle();
requestAnimationFrame(frame);

// expose for debugging / automated checks
window.__game = { get dbg() { return { paused, seq: !!seq, seqWait, until: !!seqUntil, fade: ui.fade.style.opacity, choiceOpen, pending: pendingGuns.length }; }, preview(n, v, room = 0) { loadFloor(n, v); setRoom(room); prepareArea(room); G.camPos.copy(G.floor.rooms[room].stand); setLights(G.room, G.room, 0); return G.floor.plan.name + ' / ' + G.floor.rooms.map(r => r.type).join(','); }, get area() { return area; }, DEFS, spawnAt: (t) => spawnAt(t), giveGun, dropGun: (id) => dropGun(G.camPos.clone().add(new THREE.Vector3(0.6, 0, -4)), id), GUNS, cur, openChoice, get choiceOpen() { return choiceOpen; }, probe(x, y) {
  const rect = canvasRect(); const ndc = new THREE.Vector2((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const targets = []; for (const e of G.enemies) if (e.alive) targets.push(...e.meshes);
  const ht = raycaster.intersectObjects(targets, false).map(h => [h.distance, G.enemies.indexOf(h.object.userData.enemy), h.object.userData.part, h.object.parent && h.object.parent.type, h.point.toArray().map(v => +v.toFixed(2))]);
  const hl = raycaster.intersectObject(G.floor.group, true).slice(0, 3).map(h => [h.distance, h.object.geometry.type, h.point.toArray().map(v => +v.toFixed(2))]);
  return { rect: [rect.width, rect.height], cam: camera.position.toArray(), ht, hl };
}, G, P, get mode() { return mode; }, startGame, tryFire, toScreen: (v) => toScreen(v, canvasRect()) };
