import * as THREE from '../vendor/three.module.min.js';
import { buildFloor, themeFor, box, EYE, RD, TOP_FLOOR } from './level.js';
import { Enemy, Projectile } from './enemies.js';
import { Effects } from './effects.js';
import * as TX from './textures.js';
import { initAudio, sfx, setMusic, setMuted, isMuted } from './audio.js';
import { rand, pick, shuffle, ease, lerp, clamp, storeGet, storeSet } from './util.js';

// ------------------------------------------------------------------ DOM
const $ = (id) => document.getElementById(id);
const gameEl = $('game'), canvas = $('view');
const ui = {
  hud: $('hud'), floor: $('floorLbl'), area: $('areaLbl'), score: $('scoreLbl'), combo: $('comboLbl'),
  hp: $('hpLbl'), ammo: $('ammoLbl'), reload: $('reloadLbl'), weapon: $('weaponLbl'),
  banner: $('banner'), sub: $('subBanner'), markers: $('markers'), hurt: $('hurt'), fade: $('fade'),
  bossbar: $('bossbar'), bossName: $('bossName'), bossFill: $('bossFill'),
  title: $('title'), pause: $('pause'), floorClear: $('floorClear'), gameOver: $('gameOver'), win: $('win'),
};

// ------------------------------------------------------------------ renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.autoClear = false;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(80, 0.5, 0.05, 80);
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
const WEAPONS = {
  pistol: { name: 'PISTOL', mag: 12, reload: 1.0, cd: 0.13, dmg: 1, pellets: 1, spread: 0, auto: false, unlock: 1, sound: 'pistol', kick: 1 },
  shotgun: { name: 'SHOTGUN', mag: 6, reload: 1.5, cd: 0.6, dmg: 0.8, pellets: 7, spread: 34, auto: false, unlock: 4, sound: 'shotgun', kick: 2.2 },
  smg: { name: 'SMG', mag: 32, reload: 1.35, cd: 0.085, dmg: 0.55, pellets: 1, spread: 12, auto: true, unlock: 8, sound: 'smg', kick: 0.55 },
};
const ORDER = ['pistol', 'shotgun', 'smg'];

const gunMats = {
  metal: new THREE.MeshLambertMaterial({ map: TX.gunMetal() }),
  dark: new THREE.MeshLambertMaterial({ map: TX.metal([30, 30, 34], 'gd') }),
  wood: new THREE.MeshLambertMaterial({ map: TX.wood([96, 58, 30], 'g') }),
  skin: new THREE.MeshLambertMaterial({ map: TX.plastic([214, 168, 130], 'skin') }),
  sleeve: new THREE.MeshLambertMaterial({ map: TX.plastic([210, 210, 204], 'slv') }),
  cuff: new THREE.MeshLambertMaterial({ map: TX.plastic([60, 62, 72], 'cuff') }),
  flash: new THREE.MeshBasicMaterial({ map: TX.flash(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
};
function gm(parent, w, h, d, mat, x, y, z, rx = 0) {
  const m = new THREE.Mesh(box(w, h, d), mat); m.position.set(x, y, z); m.rotation.x = rx; parent.add(m); return m;
}
function arm(g, x, y, z) {
  gm(g, 0.1, 0.1, 0.12, gunMats.skin, x, y, z);
  gm(g, 0.13, 0.13, 0.08, gunMats.cuff, x + 0.01, y - 0.03, z + 0.09, -0.35);
  gm(g, 0.13, 0.13, 0.5, gunMats.sleeve, x + 0.02, y - 0.1, z + 0.36, -0.35);
}
const models = {};
{
  const p = new THREE.Group();
  gm(p, 0.07, 0.075, 0.32, gunMats.metal, 0, 0, -0.16);
  gm(p, 0.064, 0.05, 0.26, gunMats.dark, 0, -0.055, -0.13);
  gm(p, 0.06, 0.16, 0.08, gunMats.dark, 0, -0.13, -0.02, 0.25);
  gm(p, 0.02, 0.02, 0.02, gunMats.dark, 0, 0.045, -0.3);
  arm(p, 0, -0.12, 0.0);
  models.pistol = { g: p, tip: new THREE.Vector3(0, 0, -0.34) };
  const s = new THREE.Group();
  gm(s, 0.05, 0.05, 0.72, gunMats.metal, 0, 0, -0.36);
  gm(s, 0.045, 0.045, 0.55, gunMats.dark, 0, -0.055, -0.3);
  gm(s, 0.085, 0.075, 0.2, gunMats.wood, 0, -0.06, -0.4);
  gm(s, 0.075, 0.1, 0.24, gunMats.dark, 0, -0.02, 0.0);
  gm(s, 0.065, 0.13, 0.32, gunMats.wood, 0, -0.08, 0.24, 0.12);
  arm(s, 0, -0.11, 0.06);
  gm(s, 0.1, 0.09, 0.12, gunMats.skin, 0, -0.12, -0.4);
  models.shotgun = { g: s, tip: new THREE.Vector3(0, 0, -0.74), pump: s.children[2] };
  const m = new THREE.Group();
  gm(m, 0.075, 0.1, 0.38, gunMats.dark, 0, 0, -0.12);
  gm(m, 0.035, 0.035, 0.16, gunMats.metal, 0, 0.01, -0.38);
  gm(m, 0.045, 0.2, 0.06, gunMats.metal, 0, -0.14, -0.16, 0.15);
  gm(m, 0.06, 0.13, 0.07, gunMats.dark, 0, -0.11, 0.04, 0.25);
  gm(m, 0.02, 0.04, 0.02, gunMats.metal, 0, 0.07, -0.26);
  arm(m, 0, -0.12, 0.02);
  models.smg = { g: m, tip: new THREE.Vector3(0, 0.01, -0.47) };
  for (const k of ORDER) {
    const md = models[k];
    md.flash = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), gunMats.flash);
    md.flash.position.copy(md.tip); md.flash.visible = false; md.g.add(md.flash);
    md.g.visible = false; gunRoot.add(md.g);
  }
}

// ------------------------------------------------------------------ game state
const G = {
  scene, camera, fx: effects, sfx,
  camPos: new THREE.Vector3(0, EYE, 0),
  floorNum: 1, floor: null, room: null, roomIdx: 0,
  combatActive: false,
  enemies: [], projectiles: [], pickups: [],
};
const P = { hp: 100, weapon: 'pistol', ammo: {}, reloadT: 0, cd: 0, recoil: 0, flashT: 0, aimYaw: 0, aimPitch: 0, aimTY: 0, aimTP: 0, swapT: 0 };
let score = 0, floorStartScore = 0, combo = 0, lastKill = -10, now = 0;
let stats = newStats();
let mode = 'title', paused = false;
const BASE_PITCH = -0.1;
let yaw = 0, pitch = BASE_PITCH, roll = 0, shake = 0;
let area = null;
let hold = null;
let titleT = 0;
const best = storeGet('overtime.best', { floor: 0, score: 0 });

function newStats() { return { shots: 0, hits: 0, kills: 0, heads: 0, orbs: 0, dmg: 0, t: 0 }; }
function unlocked(k) { return G.floorNum >= WEAPONS[k].unlock; }

// ------------------------------------------------------------------ sequences (generator coroutines)
let seq = null, seqWait = 0;
function run(gen) { seq = gen(); seqWait = 0; seq.next(0); }
function* tween(dur, fn) { let t = 0; fn(0); while (t < dur) { t += yield; fn(Math.min(1, t / dur)); } }
function stepSeq(dt) {
  if (!seq) return;
  if (seqWait > 0) { seqWait -= dt; if (seqWait > 0) return; dt = -seqWait; seqWait = 0; }
  const r = seq.next(dt);
  if (r.done) seq = null; else if (typeof r.value === 'number' && r.value > 0) seqWait = r.value;
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

function loadFloor(n) {
  clearFloor();
  G.floorNum = n;
  const f = buildFloor(n);
  G.floor = f; scene.add(f.group);
  const th = f.theme;
  scene.fog = new THREE.Fog(th.fog, 3, 22);
  scene.background = new THREE.Color(th.fog);
  renderer.setClearColor(th.fog);
  hemi.color.set(th.hemi[0]); hemi.groundColor.set(th.hemi[1]);
  for (const l of roomLights) l.color.set(th.light);
  gunScene.children[0].color.set(th.light);
  setRoom(0);
  setLights(f.rooms[0], f.rooms[0], 0);
}

function setRoom(i) { G.roomIdx = i; G.room = G.floor.rooms[i]; }
function setLights(a, b, k) {
  roomLights.forEach((l, j) => l.position.lerpVectors(a.lightPos[j], b.lightPos[j], k));
}

// ------------------------------------------------------------------ area planning
function weightedType() {
  const f = G.floorNum;
  const w = [['grunt', 1]];
  if (f >= 2) w.push(['rusher', 0.45]);
  if (f >= 3) w.push(['guard', 0.22 + f * 0.02]);
  if (f >= 6) w.push(['bot', 0.3]);
  let s = w.reduce((a, b) => a + b[1], 0), r = Math.random() * s;
  for (const [t, v] of w) { if ((r -= v) <= 0) return t; }
  return 'grunt';
}

function prepareArea(i) {
  const f = G.floorNum, room = G.floor.rooms[i];
  const last = i === G.floor.rooms.length - 1;
  room.spots.forEach((s) => (s.taken = null));
  const n = Math.min(12, 3 + Math.floor(f * 0.55) + Math.floor(i * 0.5));
  const initialN = Math.min(n, 3 + Math.floor(f / 5));
  const types = [];
  for (let k = 0; k < n; k++) types.push(k === 0 ? 'grunt' : weightedType());
  area = { idx: i, room, queue: [], waveT: 2.5, maxAlive: Math.min(7, 3 + Math.floor(f / 4)), clearing: false, boss: null };
  if (last && G.floor.isBoss) {
    const bossSpot = { x: 0, z: room.z0 - 9.8, cover: false };
    const b = new Enemy(G, 'boss', bossSpot);
    G.enemies.push(b); area.boss = b;
    ui.bossName.textContent = bossName(f);
    spawnAt('grunt'); spawnAt(f >= 10 ? 'guard' : 'grunt');
    return;
  }
  const initial = types.slice(0, initialN), rest = types.slice(initialN);
  for (const t of initial) spawnAt(t);
  area.queue = rest;
}

function bossName(f) { return ['', 'REGIONAL MANAGER', 'VP OF OPERATIONS', 'CHIEF FINANCIAL OFFICER', 'THE CHAIRMAN'][f / 5] || 'THE MANAGER'; }

function freeSpot(type) {
  const room = area ? area.room : G.room;
  if (type === 'bot') return { x: rand(Math.random, -2, 2), y: rand(Math.random, 1.8, 2.4), z: room.z0 - rand(Math.random, 5.5, 10), cover: false };
  // only use spots the fixed camera can actually see (portrait screens are narrow)
  const hw = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
  let list = room.spots.filter((s) => (!s.taken || !s.taken.alive) && Math.abs(s.x) < hw * (room.stand.z - s.z) - 0.45);
  if (type === 'rusher') list = list.filter((s) => !s.cover);
  const cover = list.filter((s) => s.cover);
  const pool = (type === 'grunt' || type === 'guard') && cover.length && Math.random() < 0.7 ? cover : list;
  if (!pool.length) return { x: rand(Math.random, -1.5, 1.5), z: room.z0 - rand(Math.random, 6, 10.5), cover: false };
  return pick(Math.random, pool);
}

function spawnAt(type) {
  const s = freeSpot(type);
  const e = new Enemy(G, type, s);
  s.taken = e;
  G.enemies.push(e);
  return e;
}

function spawnReinforcement(type) {
  const room = area.room;
  const entry = pick(Math.random, room.doorSpawns).clone();
  const s = type === 'rusher' ? { x: entry.x, z: entry.z + 1.6, cover: false } : freeSpot(type);
  if (s.taken !== undefined) s.taken = null;
  const e = new Enemy(G, type, s, { enter: entry });
  s.taken = e;
  G.enemies.push(e);
  for (const el of room.elevators) if (Math.abs(el.x - entry.x) < 0.5 && el !== room.exitElevator) { el.target = 1; el.closeAt = now + 2.8; sfx.ding(); }
  return e;
}
G.spawnReinforcement = (t) => { if (area) spawnReinforcement(t); };

// ------------------------------------------------------------------ game callbacks
G.spawnProjectile = (from, target, speed, dmg, kind) => { G.projectiles.push(new Projectile(G, from, target, speed, dmg, kind)); };

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

G.onEnemyKilled = (e, head) => {
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
  } else if (P.hp < 100 && Math.random() < (P.hp < 40 ? 0.3 : 0.12)) dropMedkit(e.pos);
};

const MED_M = new THREE.MeshLambertMaterial({ map: TX.medkit() });
function dropMedkit(pos) {
  const m = new THREE.Mesh(box(0.34, 0.22, 0.26), MED_M);
  m.position.set(pos.x, 0.25, pos.z);
  scene.add(m);
  G.pickups.push({ mesh: m, t: Math.random() * 6, collect: false });
}

function collectPickup(p) {
  if (p.collect) return;
  p.collect = true; p.ct = 0;
  sfx.pickup();
  P.hp = Math.min(100, P.hp + 25);
  popText(p.mesh.position, '+25 HP', '#60ff80');
}

// ------------------------------------------------------------------ flow
function startGame(floor = 1, keepScore = false) {
  initAudio();
  hideScreens();
  if (!keepScore) { score = 0; }
  floorStartScore = score;
  P.hp = 100;
  for (const k of ORDER) P.ammo[k] = WEAPONS[k].mag;
  P.reloadT = 0;
  G.floorNum = floor;
  if (!unlocked(P.weapon)) P.weapon = 'pistol';
  startFloor(floor);
}

function startFloor(n) {
  mode = 'intro'; G.combatActive = false;
  stats = newStats(); combo = 0;
  loadFloor(n);
  floorStartScore = score;
  ui.hud.classList.remove('hidden');
  ui.bossbar.classList.add('hidden');
  equip(P.weapon, true);
  const room0 = G.floor.rooms[0];
  prepareArea(0);
  setMusic('calm');
  run(function* () {
    const el = room0.entryElevator;
    yaw = 0; pitch = BASE_PITCH; roll = 0;
    if (el) { G.camPos.copy(el.inside); } else G.camPos.copy(room0.stand).add(new THREE.Vector3(0, 0, 1.2));
    applyCamera();
    fade(0, 0.8);
    banner(`FLOOR ${String(n).padStart(2, '0')}`, G.floor.isBoss ? 'WARNING: EXECUTIVE PRESENT' : themeFor(n).name, 2.2);
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
      prepareArea(i + 1);
      yield* walk(G.camPos.clone(), rooms[i + 1].stand, [rooms[i], rooms[i + 1]]);
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

function autoReload() { for (const k of ORDER) P.ammo[k] = WEAPONS[k].mag; P.reloadT = 0; }

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
  for (const k of ORDER) if (WEAPONS[k].unlock === n + 1) unlock = `NEW WEAPON: ${WEAPONS[k].name}`;
  $('fcUnlock').textContent = unlock;
  showScreen(ui.floorClear);
}

function fmtTime(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${String(s).padStart(2, '0')}`; }

function nextFloor() {
  hideScreens();
  const n = G.floorNum + 1;
  G.floorNum = n;
  for (const k of ORDER) if (WEAPONS[k].unlock === n) { P.weapon = k; sfx.unlock(); }
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
  loadFloor(1);
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

function equip(k, silent) {
  P.weapon = k;
  for (const w of ORDER) models[w].g.visible = w === k;
  P.swapT = silent ? 0 : 1;
  if (!silent) sfx.reload();
  updateHud(true);
}

function swapWeapon() {
  const avail = ORDER.filter(unlocked);
  if (avail.length < 2) { sfx.empty(); return; }
  const i = avail.indexOf(P.weapon);
  equip(avail[(i + 1) % avail.length]);
  P.reloadT = 0;
}

function startReload() {
  const w = WEAPONS[P.weapon];
  if (P.reloadT > 0 || P.ammo[P.weapon] >= w.mag) return;
  P.reloadT = w.reload; P.reloadDur = w.reload;
  sfx.reload();
}

function tryFire(x, y) {
  if (!G.combatActive || mode !== 'combat' || paused) return;
  const w = WEAPONS[P.weapon];
  if (P.reloadT > 0 || P.cd > 0 || P.swapT > 0.3) return;
  if (P.ammo[P.weapon] <= 0) { sfx.empty(); startReload(); P.cd = 0.25; return; }
  P.ammo[P.weapon]--; P.cd = w.cd;
  stats.shots++;
  sfx[w.sound]();
  P.recoil = Math.min(1.6, P.recoil + w.kick);
  P.flashT = 0.05;
  muzzleLight.intensity = 6;
  aimGunAt(x, y);
  if (P.weapon === 'shotgun') P.pump = 1;
  const rect = canvasRect();
  let best = null;
  for (let i = 0; i < w.pellets; i++) {
    let ox = 0, oy = 0;
    if (w.spread) { const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * w.spread; ox = Math.cos(a) * r; oy = Math.sin(a) * r; }
    const res = resolveShot(x + ox, y + oy, w.dmg, rect, i === 0);
    if (res && (!best || res === 'head')) best = res;
  }
  if (best === 'head' || best === 'body') stats.hits++;
  marker(x, y, best === 'head' ? 'head' : best ? '' : 'miss');
  if (P.ammo[P.weapon] <= 0) setTimeout(startReload, 180);
  updateHud();
}

function resolveShot(x, y, dmg, rect, primary) {
  // 1. incoming projectiles: generous screen-space hit
  let bp = null, bd = 46;
  for (const p of G.projectiles) {
    if (!p.alive) continue;
    const s = toScreen(p.mesh.position, rect);
    if (s.behind) continue;
    const dist = Math.hypot(s.x - x, s.y - y);
    const r = 30 + 30 / Math.max(0.6, p.mesh.position.distanceTo(G.camPos));
    if (dist < Math.max(r, bd) && dist < r) { bd = dist; bp = p; }
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
  const targets = [];
  for (const e of G.enemies) if (e.alive && e.state !== 'dormant') targets.push(...e.meshes);
  for (const p of G.pickups) if (!p.collect) targets.push(p.mesh);
  const hitsT = raycaster.intersectObjects(targets, false);
  const hitsL = raycaster.intersectObject(G.floor.group, true).filter((h) => !h.object.material.transparent && h.object.material.fog !== false);
  const levelHit = hitsL[0];
  const th = hitsT[0];
  if (th && (!levelHit || th.distance < levelHit.distance + 0.05)) {
    if (th.object.userData.enemy) {
      const r = th.object.userData.enemy.damage(dmg, th.object.userData.part, th.point);
      if (primary) sfx[r === 'head' || th.object.userData.part === 'head' ? 'headshot' : th.object.userData.enemy.type === 'bot' ? 'metalHit' : 'hit']();
      return th.object.userData.part === 'head' && th.object.userData.enemy.type !== 'bot' ? 'head' : 'body';
    }
    const pk = G.pickups.find((p) => p.mesh === th.object);
    if (pk) { collectPickup(pk); return 'pickup'; }
  }
  // 3. aim assist (screen space, small radius, not through walls, not on hidden enemies)
  let ae = null, ad = 30;
  for (const e of G.enemies) {
    if (!e.alive || e.state === 'dormant' || e.crouch > 0.5) continue;
    const c = e.centerWorld(new THREE.Vector3());
    const s = toScreen(c, rect);
    if (s.behind) continue;
    const d = Math.hypot(s.x - x, s.y - y);
    const dist = c.distanceTo(G.camPos);
    if (d < ad && (!levelHit || dist < levelHit.distance + 0.4 || (e.crouch < 0.2 && levelHit.distance > dist - 1.6))) { ad = d; ae = { e, c }; }
  }
  if (ae) {
    ae.e.damage(dmg, 'body', ae.c);
    if (primary) sfx[ae.e.type === 'bot' ? 'metalHit' : 'hit']();
    return 'body';
  }
  if (levelHit) {
    const n = levelHit.face.normal.clone().transformDirection(levelHit.object.matrixWorld);
    effects.hole(levelHit.point, n);
    effects.dust(levelHit.point.clone().addScaledVector(n, 0.03), 3);
    if (primary) effects.impact(levelHit.point.clone().addScaledVector(n, 0.05));
  }
  return null;
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
gameEl.addEventListener('pointerdown', (ev) => {
  if (ev.target.closest('button') || ev.target.closest('.screen')) return;
  initAudio();
  const { x, y } = localXY(ev);
  hold = { id: ev.pointerId, x, y };
  tryFire(x, y);
  ev.preventDefault();
});
gameEl.addEventListener('pointermove', (ev) => { if (hold && hold.id === ev.pointerId) { const p = localXY(ev); hold.x = p.x; hold.y = p.y; } });
const release = (ev) => { if (hold && hold.id === ev.pointerId) hold = null; };
gameEl.addEventListener('pointerup', release);
gameEl.addEventListener('pointercancel', release);
gameEl.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') startReload();
  if (e.key === 'q' || e.key === 'Q' || e.key === 'Tab') { e.preventDefault(); swapWeapon(); }
  if (e.key === 'Escape' || e.key === 'p') togglePause();
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
onBtn('winBtn', toTitle);
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'combat' && !paused) togglePause(); });

function togglePause() {
  if (mode === 'title' || mode === 'floorclear' || mode === 'dead') return;
  paused = !paused;
  ui.pause.classList.toggle('hidden', !paused);
  setMusic(paused ? 'off' : mode === 'combat' ? 'combat' : 'calm');
}

// ------------------------------------------------------------------ HUD
const hudCache = {};
function setText(el, key, v) { if (hudCache[key] !== v) { hudCache[key] = v; el.textContent = v; } }
function updateHud(force) {
  if (force) for (const k in hudCache) delete hudCache[k];
  setText(ui.floor, 'f', `FLOOR ${String(G.floorNum).padStart(2, '0')}`);
  if (G.floor) setText(ui.area, 'a', `AREA ${Math.min(G.roomIdx + 1, G.floor.rooms.length)}/${G.floor.rooms.length}`);
  setText(ui.score, 's', String(score).padStart(6, '0'));
  setText(ui.combo, 'c', combo > 1 && now - lastKill < 2.5 ? `x${combo} COMBO` : '');
  setText(ui.hp, 'h', String(Math.ceil(P.hp)));
  setText(ui.ammo, 'am', String(P.ammo[P.weapon]));
  setText(ui.reload, 'r', P.reloadT > 0 ? 'RELOADING' : 'AMMO');
  ui.reload.classList.toggle('reloading', P.reloadT > 0);
  setText(ui.weapon, 'w', WEAPONS[P.weapon].name);
  if (area?.boss && area.boss.alive) ui.bossFill.style.width = `${Math.max(0, (area.boss.hp / area.boss.maxHp) * 100)}%`;
}

// ------------------------------------------------------------------ resize
function resize() {
  const r = gameEl.getBoundingClientRect();
  const H = Math.min(340, Math.round(r.height));
  const W = Math.max(1, Math.round(r.width * (H / r.height)));
  renderer.setSize(W, H, false);
  camera.aspect = W / H; camera.updateProjectionMatrix();
  gunCam.aspect = W / H; gunCam.updateProjectionMatrix();
  const d = 0.55, hh = d * Math.tan(THREE.MathUtils.degToRad(gunCam.fov / 2)), hw = hh * gunCam.aspect;
  gunBase.set(hw * 0.55, -hh * 0.74, -d);
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
  P.aimTY *= Math.pow(0.02, dt); P.aimTP *= Math.pow(0.02, dt);
  P.aimYaw += (P.aimTY - P.aimYaw) * Math.min(1, dt * 25);
  P.aimPitch += (P.aimTP - P.aimPitch) * Math.min(1, dt * 25);
  P.swapT = Math.max(0, P.swapT - dt * 3);
  let ry = 0.04 + P.aimYaw, rx = P.aimPitch + P.recoil * 0.22, rz = 0;
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
  const md = models[P.weapon];
  P.flashT -= dt;
  md.flash.visible = P.flashT > 0;
  if (md.flash.visible) { md.flash.rotation.z = Math.random() * 6; md.flash.scale.setScalar(rand(Math.random, 0.8, 1.4)); }
  if (P.pump > 0) { P.pump = Math.max(0, P.pump - dt * 2.2); models.shotgun.pump.position.z = -0.4 + Math.sin(P.pump * Math.PI) * 0.1; }
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
    p.mesh.rotation.y += dt * 2; p.mesh.position.y = 0.25 + Math.sin(p.t * 3) * 0.06;
    if (p.collect) {
      p.ct += dt; p.mesh.position.lerp(G.camPos, Math.min(1, dt * 6)); p.mesh.scale.setScalar(Math.max(0.01, 1 - p.ct * 2));
      if (p.ct > 0.5) { scene.remove(p.mesh); G.pickups.splice(i, 1); }
    }
  }
  effects.update(dt);

  if (G.combatActive && area && !area.clearing) {
    const alive = G.enemies.filter((e) => e.alive).length;
    area.waveT -= dt;
    if (area.queue.length && alive < area.maxAlive && area.waveT <= 0) { spawnReinforcement(area.queue.shift()); area.waveT = rand(Math.random, 0.9, 2.0); }
    if (!area.queue.length && alive === 0 && (!area.boss || !area.boss.alive)) areaCleared();
  }

  // weapon timers
  P.cd = Math.max(0, P.cd - dt);
  if (P.reloadT > 0) { P.reloadT -= dt; if (P.reloadT <= 0) { P.reloadT = 0; P.ammo[P.weapon] = WEAPONS[P.weapon].mag; sfx.tap(); } }
  if (hold && WEAPONS[P.weapon].auto) tryFire(hold.x, hold.y);

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
window.__game = { probe(x, y) {
  const rect = canvasRect(); const ndc = new THREE.Vector2((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const targets = []; for (const e of G.enemies) if (e.alive) targets.push(...e.meshes);
  const ht = raycaster.intersectObjects(targets, false).map(h => [h.distance, G.enemies.indexOf(h.object.userData.enemy), h.object.userData.part, h.object.parent && h.object.parent.type, h.point.toArray().map(v => +v.toFixed(2))]);
  const hl = raycaster.intersectObject(G.floor.group, true).slice(0, 3).map(h => [h.distance, h.object.geometry.type, h.point.toArray().map(v => +v.toFixed(2))]);
  return { rect: [rect.width, rect.height], cam: camera.position.toArray(), ht, hl };
}, G, P, get mode() { return mode; }, startGame, tryFire, toScreen: (v) => toScreen(v, canvasRect()) };
