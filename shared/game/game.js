import * as THREE from '../vendor/three.module.min.js';
import { buildFloor, floorPlan, MOODS, box, EYE, RD, HALF, TOP_FLOOR, BOSS_GROUPS, MINI_GROUPS, bossTowerFloor } from '../content/floors/builder.js';
import { Enemy, Projectile, SUPER_ABILITIES } from '../content/enemies/ai.js';
import { DEFS, rosterFor, isFlyer, isMelee } from '../content/enemies/roster.js';
import { bossFor, bossKindFor, BOSS_LIST } from '../content/bosses/bosses.js';
import { initDev, devOn, devTick, devOpen, refreshDevUi } from './dev.js';
import { initSpirit, spiritUse, spiritUpdate, spiritOverdrive, spiritOverdriveStart, spiritGauge, spiritFill, spiritState, spiritDebug } from './spirit.js';
import { Post } from '../engine/post.js';
import { Effects } from '../engine/effects.js';
import * as TX from '../engine/textures.js';
import { initAudio, sfx, setMuted, isMuted, setVolumes, tone, noise as noiseFx } from '../audio/sfx.js';
import { SCHEMA, DEV_BUILD, settings, setSetting, onSettingsChange, AIM_MULT, SENS_MULT, RES_MOBILE, RES_PC, FX_MULT, tutorialDone, setTutorialDone } from './settings.js';
import { saveRun, loadRun, clearRun } from './save.js';
import { Tutorial } from './tutorial.js';
import { PERKS, PERK, PERK_RARITY, rollPerks, mods } from '../content/perks/perks.js';
import { MUTATIONS, MUTATION, applyMutations, rollMutations, mutationTint } from '../content/perks/mutations.js';
import { profile, addCash, stat, statMax, touch, flushProfile } from './profile.js';
import { applyUpgrades, weaponBonus } from '../content/meta/upgrades.js';
import { CHAR } from '../content/meta/characters.js';
import { DIFFS, diffOf } from './difficulty.js';
import { completion, roamUnlocked, allEndings, endingsDone } from './completion.js';
import { playEnding } from './cutscene/endings.js';
import { ENDINGS, ENDING_NGP } from '../content/meta/endings.js';
import { MODES, MODE, modeOpen, RUSH_FLOORS, dailySetup, todayKey, recordRun, DAILY_MODS as DAILY_MODS_REF } from './modes.js';
import { LORE, LORE_BY_ID } from '../content/meta/lore.js';
import { ACHIEVEMENTS } from '../content/meta/achievements.js';
import { initHQ, bindHQ, openHQ, closeHQ, openCharSelect, openDiffSelect, unreadFiles, unlockedCount, allUnlocked, money } from './hq.js';
import { setMusic, setMusicIntense } from '../audio/music.js';
import { GUN, GUNS, RARITY, rollGun, setNgpGuns, buildGunModel, statLine, setSleeve, aimSpeed, goldPlate, setMutationTint } from '../content/weapons/weapons.js';
import { rand, pick, shuffle, ease, lerp, clamp, storeGet, storeSet, mulberry32 } from '../engine/util.js';

// ------------------------------------------------------------------ DOM
const $ = (id) => document.getElementById(id);
const gameEl = $('game'), canvas = $('view');
const ui = {
  hud: $('hud'), floor: $('floorLbl'), area: $('areaLbl'), score: $('scoreLbl'), combo: $('comboLbl'),
  hp: $('hpLbl'), ammo: $('ammoLbl'), reload: $('reloadLbl'), weapon: $('weaponLbl'),
  banner: $('banner'), sub: $('subBanner'), markers: $('markers'), hurt: $('hurt'), fade: $('fade'),
  bossbar: $('bossbar'), bossName: $('bossName'), bossFill: $('bossFill'), gunChoice: $('gunChoice'), bossState: $('bossState'), perks: $('perks'), cash: $('cashLbl'), settings: $('settings'), confirm: $('confirm'), continueBtn: $('continueBtn'),
  tutHint: $('tutHint'), tutRing: $('tutRing'), tutSkip: $('tutSkip'), toast: $('toast'), slotLbl: $('slotLbl'),
  title: $('title'), pause: $('pause'), floorClear: $('floorClear'), gameOver: $('gameOver'), win: $('win'),
};

// ------------------------------------------------------------------ renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.autoClear = false;
const post = new Post(renderer);
// colour grade per lighting mood (applied in the post pass)
const GRADES = {
  normal: { tint: 0xfff4e6, lift: 0x060504, sat: 1.12, contrast: 1.08 },
  night: { tint: 0xc4d0ff, lift: 0x03050c, sat: 0.92, contrast: 1.14 },
  emergency: { tint: 0xffd2c6, lift: 0x0c0202, sat: 1.18, contrast: 1.16 },
  blackout: { tint: 0xe4e6f0, lift: 0x000000, sat: 0.85, contrast: 1.22 },
  toxic: { tint: 0xd6ffc4, lift: 0x030a00, sat: 1.06, contrast: 1.12 },
  nightmare: { tint: 0xffc8d0, lift: 0x0e0204, sat: 1.2, contrast: 1.22 },
};
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
// flashlight for dark floors (always present so the light count never changes)
const flashlight = new THREE.SpotLight(0xfff0d8, 0, 15, 0.42, 0.65, 1.6);
camera.add(flashlight); flashlight.position.set(0.15, -0.15, 0); camera.add(flashlight.target); flashlight.target.position.set(0, -0.3, -5);
let roomBase = 9, moodNow = 'normal', lightningT = 6, boltT = 0, hemiBase = 1.5;

// Viewmodel scene
const gunScene = new THREE.Scene();
const gunCam = new THREE.PerspectiveCamera(55, 0.5, 0.01, 10);
gunScene.add(new THREE.AmbientLight(0xffffff, 0.9));
const gunSun = new THREE.DirectionalLight(0xffffff, 1.6); gunSun.position.set(-1, 2, 1.5); gunScene.add(gunSun);
const gunFlash = new THREE.PointLight(0xffc070, 0, 2.5, 2); gunScene.add(gunFlash); // muzzle flash lights up your gun and hands
const gunRoot = new THREE.Group(); gunRoot.scale.setScalar(0.62); gunScene.add(gunRoot);
// melee swings pivot at the shoulder (behind and below the hand), not at the fist
const SHOULDER = new THREE.Vector3(0.28, -0.5, 0.55), ELBOW = new THREE.Vector3(0.04, -0.2, 0.3);
function setPivot(v) { swingPivot.position.copy(v); swingInner.position.copy(v).negate(); }
const swingPivot = new THREE.Group(); swingPivot.position.copy(SHOULDER); gunRoot.add(swingPivot);
const swingInner = new THREE.Group(); swingInner.position.copy(SHOULDER).negate(); swingPivot.add(swingInner);
const gunBase = new THREE.Vector3();

const effects = new Effects(scene, camera);
const raycaster = new THREE.Raycaster();

// ------------------------------------------------------------------ weapons
const FLASH_MAT = new THREE.MeshBasicMaterial({ map: TX.flash(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
const models = {};
function viewModel(id) {
  if (!models[id]) {
    const md = buildGunModel(GUN[id], true);
    const def = GUN[id];
    // energy weapons get a flash in their own colour; heavy guns a bigger one
    const fm = def.tracer ? FLASH_MAT.clone() : FLASH_MAT; if (def.tracer) fm.color.set(def.tracer);
    const fs = 0.22 * (0.8 + Math.min(1.2, (def.kick || 0.5) * 0.35));
    md.flash = new THREE.Mesh(new THREE.PlaneGeometry(fs, fs), fm);
    md.flash.position.copy(md.tip); md.flash.visible = false; md.g.add(md.flash);
    if (md.pump) md.pumpZ = md.pump.position.z;
    md.g.visible = false; swingInner.add(md.g);
    models[id] = md;
  }
  return models[id];
}

// ------------------------------------------------------------------ game state
const G = {
  scene, camera, fx: effects, sfx,
  camPos: new THREE.Vector3(0, EYE, 0),
  playerPos: new THREE.Vector3(0, EYE, 0), duck: 0, // where you can be hit (lower while ducking)
  lowReach: PC ? 3.1 : 2.1, // how close floor crawlers get (kept above the status bar)
  floorNum: 1, floor: null, room: null, roomIdx: 0,
  combatActive: false,
  enemies: [], projectiles: [], pickups: [],
};
const P = { duckT: 0, duckCd: 0, punch: 0, swing: 0, swingDir: 1, hp: 100, inv: [{ id: 'pistol', ammo: 12 }], slot: 0, invAtFloor: null, burstLeft: 0, burstT: 0, reloadT: 0, cd: 0, recoil: 0, flashT: 0, aimYaw: 0, aimPitch: 0, aimTY: 0, aimTP: 0, swapT: 0 };
let score = 0, floorStartScore = 0, combo = 0, lastKill = -10, now = 0;
let stats = newStats();
let mode = 'title', paused = false;
const BASE_PITCH = PC ? -0.06 : -0.1;
let yaw = 0, pitch = BASE_PITCH, roll = 0, shake = 0;
// THE GOLDEN WATCH state (see the watch section below)
let roomStart = null, watchUsed = false, rewinding = false, rewindT = 0, histT = 0, worldRoll = 0, worldRollGoal = 0;
const rewindHist = [];
let area = null;
let hold = null;
let titleT = 0, drawCalls = 0;
const best = storeGet('overtime.best', { floor: 0, score: 0 });

function newStats() { return { shots: 0, hits: 0, kills: 0, heads: 0, orbs: 0, dmg: 0, t: 0 }; }
const cur = () => GUN[P.inv[P.slot].id];
const curSlot = () => P.inv[P.slot];
const hasSpirit = () => P.inv.some((x) => x.id === 'spirit'); // the spirit stays out while it's anywhere in your inventory
let pendingGuns = [], choiceOpen = false, gunsThisFloor = 0;
// run perks: level per perk id, derived modifiers M, free rerolls left
let perkLv = {}, M = applyUpgrades(mods(perkLv), profile.upgrades), rerolls = 1, perkOffer = null;
const recalc = () => {
  M = applyUpgrades(mods(perkLv), profile.upgrades);
  // daily challenge twists
  const T = G.twist;
  if (T) {
    if (T.dmgOut) M.dmg *= T.dmgOut;
    if (T.headHeal) M.headHeal += T.headHeal;
    if (T.killHeal) M.killHeal += T.killHeal;
    if (T.maxHp) M.maxHp = T.maxHp;
    if (T.fire) M.cd /= T.fire;
    if (T.reload) M.reload *= T.reload;
    if (T.mag) M.mag *= T.mag;
    if (T.projSpeed) M.projSpeed *= T.projSpeed;
    if (T.score) M.score *= T.score;
    if (T.cash) M.cash *= T.cash;
    if (T.gold) M.goldChance = (M.goldChance || 1) * T.gold;
  }
  if (mutLv && Object.keys(mutLv).length) applyMutations(M, mutLv);
  G.mutHp = M.enemyHpMul || 1;
  if (G.ngp) M.cash *= 1.5; // NG+ OVERTIME PAY
  setMutationTint(mutationTint(mutLv));
};
const wlv = (id) => weaponBonus(profile.weapons[id] || 0); // Armory upgrade level
const magOf = (def) => (def.melee ? 0 : Math.max(1, Math.round(def.mag * M.mag * wlv(def.id).mag)));
// this run: cash earned, revives left, character, best combo (for achievements)
let runCash = 0, runChar = 'temp', runMaxCombo = 0;
// difficulty mode for this run (index into DIFFS); G.dd is read by enemies
let runDiff = 1, D = diffOf(1);
// game mode of this run (see modes.js)
let runMode = 'story', runId = 0, daily = null, rushIdx = 0, rushTime = 0, noteThisFloor = false;
// The tower has 30 floors; each maps evenly onto the 50 "layout" floors the content was built for
// (themes, rooms, enemies). Past 30 (endless) floors reuse the upper half of the content.
// Boss Rush works directly in layout floors (its 10 boss floors).
const layoutOf = (n) => (runMode === 'rush' ? n : n <= TOP_FLOOR ? Math.round(1 + (n - 1) * 49 / (TOP_FLOOR - 1)) : 26 + ((n - TOP_FLOOR - 1) % 25));
// difficulty follows the content's floor, and keeps climbing in endless
const effFloor = (n) => (runMode === 'rush' || n <= TOP_FLOOR ? layoutOf(n) : 50 + (n - TOP_FLOOR) * 1.5);
// which of the authored bosses a boss floor gets: the nearest boss (or mini) floor of the layout
function bossKey(n) {
  const kind = bossKindFor(n), lf = layoutOf(n);
  if (runMode !== 'rush' && n <= TOP_FLOOR) { // Story: pick one of this floor's boss groups, fixed for the run
    const groups = kind === 'mini' ? MINI_GROUPS : BOSS_GROUPS, opts = groups[kind === 'mini' ? (n - 3) / 5 : n / 5 - 1];
    if (opts) return opts[(Math.floor(runId / 1000) + n * 7) % opts.length];
  }
  return kind === 'mini' ? clamp(5 * Math.round((lf - 3) / 5) + 3, 3, 48) : clamp(5 * Math.round(lf / 5), 5, 50);
}
// New Game+: unlocked by beating Story once. Tougher enemies, six new ones, more Supers,
// a darker title screen and a faster, harsher soundtrack. Daily runs are never NG+.
const ngpUnlocked = () => !!(profile.allModes || allEndings());
const ngpWanted = () => ngpUnlocked() && !!profile.ngp;
function setNgp(on, lv) {
  G.ngp = !!on; setNgpGuns(G.ngp);
  // NG+ levels: every New Game+ you beat makes the next one tougher (up to NG+5)
  G.ngpLv = G.ngp ? Math.max(1, Math.min(5, lv || profile.ngpLevel || 1)) : 0;
  G.ngpHp = 1.5 + 0.15 * Math.max(0, G.ngpLv - 1); G.ngpDmg = 1.3 + 0.1 * Math.max(0, G.ngpLv - 1);
  recalc(); // OVERTIME PAY: +50% cash in NG+
  setMusicIntense(G.ngp);
  document.body.classList.toggle('ngp', G.ngp);
}
function titleNgp() { // the title screen shows NG+ while it's switched on
  setNgp(ngpWanted());
  const lg = document.querySelector('#title .logo'), tg = document.querySelector('#title .tag');
  if (lg) lg.innerHTML = G.ngp ? `OVER<span>TIME</span><i>+${G.ngpLv > 1 ? G.ngpLv : ''}</i>` : 'OVER<span>TIME</span>';
  if (tg) tg.textContent = G.ngp ? (G.ngpLv > 1 ? `NEW GAME+${G.ngpLv}. YOU KEEP COMING BACK.` : 'NEW GAME+. YOU HAVE BEEN HERE BEFORE.') : '30 FLOORS. NO WAY DOWN.';
}
// FREE ROAM add-on (unlocked at 100% completion): walk around the room during fights.
// PC: WASD / arrow keys (duck moves to C, Ctrl or Space). Mobile: the joystick on the left.
const roamWanted = () => roamUnlocked() && !!profile.roam;
const roamKeys = new Set();
let propBoxT = 0;
const roamStick = { x: 0, y: 0 }, lookStick = { x: 0, y: 0 }, roamBox = new THREE.Box3();
function roamUpdate(dt) {
  const show = G.roam && !PC && (mode === 'combat' || mode === 'moving') && !paused;
  if (show !== G.stickShown) { G.stickShown = show; $('roamStick').classList.toggle('hidden', !show); $('lookStick').classList.toggle('hidden', !show); }
  if (!G.roam || paused || P.hp <= 0) return;
  // looking around: the right stick on phones (mouse-look on PC is in moveAim)
  if (roamLooking()) {
    yaw -= lookStick.x * 2.4 * dt * (0.4 + Math.abs(lookStick.x) * 0.6);
    pitch = clamp(pitch - lookStick.y * 1.7 * dt * (0.4 + Math.abs(lookStick.y) * 0.6), BASE_PITCH - 1.15, BASE_PITCH + 1.05);
  }
  // during the automatic walk between areas the view drifts back to straight ahead
  if (mode === 'moving' && seq && !(area && area.ambush)) {
    yaw += (Math.atan2(Math.sin(-yaw), Math.cos(-yaw))) * Math.min(1, dt * 2.5);
    pitch += (BASE_PITCH - pitch) * Math.min(1, dt * 2.5);
  }
  if (mode !== 'combat' || !area || (seq && !area.ambush)) return;
  let mx = roamStick.x, mz = roamStick.y;
  if (roamKeys.has('a') || roamKeys.has('arrowleft')) mx -= 1;
  if (roamKeys.has('d') || roamKeys.has('arrowright')) mx += 1;
  if (roamKeys.has('w') || roamKeys.has('arrowup')) mz -= 1;
  if (roamKeys.has('s') || roamKeys.has('arrowdown')) mz += 1;
  const len = Math.hypot(mx, mz);
  if (len < 0.08) return;
  const sp = 3.4 * (G.duck > 0.5 ? 0.5 : 1) * Math.min(1, len) / len;
  // movement follows where you're looking
  const c = Math.cos(yaw), sn = Math.sin(yaw);
  G.camPos.x += (mx * c + mz * sn) * sp * dt; G.camPos.z += (-mx * sn + mz * c) * sp * dt;
  // an ambush happens between two rooms: you can move around the corridor you were caught in
  const room = area.room, st = room.stand;
  const zMin = area.ambush ? area.zMin : room.zf + 1.4, zMax = area.ambush ? area.zMax : st.z + 0.4;
  const rooms = area.ambush ? G.floor.rooms.slice(area.idx, area.idx + 2) : [room];
  solveCollisions(rooms, zMin, zMax, true);
  G.roamBob = (G.roamBob || 0) + dt * 9;
  G.camPos.y = st.y + Math.abs(Math.sin(G.roamBob)) * 0.035;
}
// is this point inside something solid? (enemy shots stop there): walls, floor, pillars, furniture, props
const propBoxes = [];
function refreshPropBoxes() {
  propBoxes.length = 0;
  if (!G.floor || !G.room) return;
  const i = G.floor.rooms.indexOf(G.room);
  for (const r of G.floor.rooms.slice(Math.max(0, i), i + 2)) for (const p of r.props || []) { if (!p.visible) continue; const b = new THREE.Box3().setFromObject(p); if (b.max.y > 0.3) propBoxes.push(b); }
}
G.solidAt = (p) => {
  if (Math.abs(p.x) > HALF - 0.03 || p.y < 0.03) return true;
  if (!G.floor) return false;
  for (const r of G.floor.rooms) {
    if (p.z > r.z0 + 0.5 || p.z < r.zf - 0.5) continue;
    for (const c of r.colliders || []) if (p.x > c.x0 && p.x < c.x1 && p.z > c.z0 && p.z < c.z1 && p.y > c.y0 && p.y < c.y1) return true;
  }
  for (const b of propBoxes) if (b.containsPoint(p)) return true;
  return false;
};
const roamLooking = () => G.roam && (mode === 'combat' || mode === 'moving') && !paused && !choiceOpen && !cutscene;
// keeps you out of walls, pillars, furniture, props (and enemies, when you walk yourself)
function solveCollisions(rooms, zMin, zMax, enemies) {
  const R = 0.32;
  const push = (x0, x1, z0, z1) => {
    const cx = G.camPos.x, cz = G.camPos.z;
    if (cx < x0 - R || cx > x1 + R || cz < z0 - R || cz > z1 + R) return;
    const l = cx - (x0 - R), r = x1 + R - cx, f = cz - (z0 - R), b = z1 + R - cz, m = Math.min(l, r, f, b);
    if (m === l) G.camPos.x = x0 - R; else if (m === r) G.camPos.x = x1 + R; else if (m === f) G.camPos.z = z0 - R; else G.camPos.z = z1 + R;
  };
  for (let pass = 0; pass < 2; pass++) {
    for (const room of rooms) {
      if (!room) continue;
      for (const c of room.colliders || []) if (c.y0 < 1.1) push(c.x0, c.x1, c.z0, c.z1);
      for (const p of room.props || []) {
        if (!p.visible || Math.abs(p.position.z - G.camPos.z) > 3) continue;
        roamBox.setFromObject(p); if (roamBox.max.y < 0.35 || roamBox.min.y > 1.1) continue;
        push(roamBox.min.x, roamBox.max.x, roamBox.min.z, roamBox.max.z);
      }
    }
    if (enemies) for (const e of G.enemies) {
      if (!e.alive || e.off) continue;
      const r = 0.55 * e.scale + 0.45, dx = G.camPos.x - e.pos.x, dz = G.camPos.z - e.pos.z, d = Math.hypot(dx, dz);
      if (d < r && d > 0.001 && (e.pos.y || 0) < 1.6) { G.camPos.x = e.pos.x + dx / d * r; G.camPos.z = e.pos.z + dz / d * r; }
    }
    G.camPos.x = clamp(G.camPos.x, -HALF + 0.55, HALF - 0.55);
    if (zMin != null) G.camPos.z = clamp(G.camPos.z, zMin, zMax);
  }
}
function setRoam(on) {
  G.roam = !!on; roamKeys.clear(); roamStick.x = roamStick.y = 0; lookStick.x = lookStick.y = 0;
  document.body.classList.toggle('roam', G.roam);
}
function setDiff(i) { runDiff = DIFFS[i] ? i : 1; D = diffOf(runDiff); G.dd = D; }
setDiff(1);
const healP = (n) => { if (n > 0) P.hp = Math.min(M.maxHp, P.hp + n * (M.healMul || 1)); };
// Extra Hard: mutations instead of perks
let mutLv = {};
const mutating = () => runDiff === 3;
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
// screen fades: a retro pixel dissolve of the 3D view (CSS fade when post-processing is off)
let dissolveGoal = 0, dissolveRate = 1;
function fade(to, dur) {
  if (post.enabled) { ui.fade.style.transition = 'none'; ui.fade.style.opacity = 0; dissolveGoal = to; dissolveRate = 1 / Math.max(0.05, dur); return; }
  ui.fade.style.transition = `opacity ${dur}s linear`; ui.fade.style.opacity = to;
}

// ------------------------------------------------------------------ floor setup
function clearFloor() {
  flying.length = 0;
  for (const h of holes) scene.remove(h.g); holes.length = 0;
  for (const c of corpses) scene.remove(c.e.root); corpses.length = 0;
  for (const e of G.enemies) e.remove();
  for (const p of G.projectiles) p.kill();
  for (const p of G.pickups) scene.remove(p.mesh);
  G.enemies = []; G.projectiles = []; G.pickups = [];
  effects.clearAll();
  if (G.floor) scene.remove(G.floor.group);
  G.floor = null;
}

// keep = rebuild only the building (enemies, shots and pickups stay): used by The Golden Watch
function loadFloor(n, variant, keep = false) {
  if (!keep) { worldRoll = worldRollGoal = 0; rewinding = false; vhs(false); }
  if (keep) { if (G.floor) scene.remove(G.floor.group); flying.length = 0; } else clearFloor();
  G.floorNum = n;
  const ef = effFloor(n); G.eff = ef;
  G.diff = ef <= 20 ? ef : 20 + (ef - 20) * 0.85; // balance: late floors were too easy with a full perk set
  G.variant = variant;
  const lf = layoutOf(n); G.layout = lf;
  const plan = floorPlan(lf, variant); plan.display = n; plan.rush = runMode === 'rush'; plan.isBoss = bossKindFor(n) === 'boss';
  if (G.twist && G.twist.mood) { plan.mood = G.twist.mood; plan.name = plan.theme.name + ' · ' + (MOODS[plan.mood].name || ''); }
  const f = buildFloor(lf, plan);
  G.floor = f; scene.add(f.group);
  const th = f.theme, md = MOODS[plan.mood];
  const fogCol = md.fogCol ?? th.fog;
  scene.fog = new THREE.Fog(fogCol, G.twist && G.twist.fog ? 1 : 3, G.twist && G.twist.fog ? G.twist.fog : md.fog || 22);
  scene.background = new THREE.Color(fogCol);
  renderer.setClearColor(fogCol);
  hemi.color.set(th.hemi[0]); hemi.groundColor.set(th.hemi[1]);
  // bright themes (white tile, marble, gold) get duller lights so enemy heads don't wash out
  const wb = th.wall ? (th.wall[0] + th.wall[1] + th.wall[2]) / 3 : 150, bright = wb > 165 ? 0.62 : wb > 140 ? 0.78 : 0.9;
  hemi.intensity = hemiBase = 1.25 * (md.hemi || 1) * (bright < 0.7 ? 0.85 : 1); amb.intensity = 0.35 * (md.hemi || 1);
  const lc = new THREE.Color(md.light || th.light); if (md.tint) lc.lerp(new THREE.Color(md.tint), 0.4);
  roomBase = 7.5 * (md.room || 1) * bright; moodNow = plan.mood;
  for (const l of roomLights) { l.color.copy(lc); l.intensity = roomBase; }
  flashlight.intensity = plan.mood === 'blackout' ? 11 : plan.mood === 'night' ? 5 : 0;
  gunScene.children[0].color.copy(lc); gunScene.children[0].intensity = 0.9 * Math.max(0.5, md.hemi || 1);
  post.grade(GRADES[plan.mood] || GRADES.normal);
  if (keep) return;
  setRoom(0);
  setLights(f.rooms[0], f.rooms[0], 0);
}

function setRoom(i) {
  G.roomIdx = i; G.room = G.floor.rooms[i];
  // only draw the rooms you can actually see: the one behind (you walk out of it) and two ahead
  G.floor.rooms.forEach((r, j) => { r.group.visible = j >= i - 1 && j <= i + 2; });
}
function setLights(a, b, k) {
  roomLights.forEach((l, j) => l.position.lerpVectors(a.lightPos[j], b.lightPos[j], k));
}

// ------------------------------------------------------------------ area planning
function weightedType() {
  const pool = rosterFor(G.layout || G.floorNum, G.floor && G.floor.plan.focus, G.ngp);
  let total = pool.reduce((a, [, d]) => a + d.w, 0), r = Math.random() * total;
  for (const [id, d] of pool) if ((r -= d.w) <= 0) return id;
  return 'grunt';
}

function prepareArea(i) {
  const f = G.floorNum, room = G.floor.rooms[i];
  const last = i === G.floor.rooms.length - 1;
  room.spots.forEach((s) => (s.taken = null));
  const df = G.diff || f;
  const n = Math.max(2, Math.min(18, Math.round((3 + Math.floor(df * 0.55) + Math.floor(i * 0.5)) * D.count * (G.twist && G.twist.enemyCount || 1))));
  const initialN = Math.min(n, 3 + Math.floor(df / 7));
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
  if (i === 0 && tutorialPending) { area = { idx: 0, room, queue: [], waveT: 99, maxAlive: 0, clearing: false, boss: null, tutorial: true }; return; }
  area = { idx: i, room, queue: [], waveT: 2.5, maxAlive: Math.max(2, Math.min(8, 3 + Math.floor((G.diff || f) / 6) + D.alive)), clearing: false, boss: null };
  const bk = bossKindFor(f);
  if (last && bk) {
    const id = runMode === 'story' && f === TOP_FLOOR ? 'boss_chairman' : bossFor(bossKey(f), G.variant || 0); // the story always ends with the Chairman
    const bossSpot = { x: 0, y: 1.9, z: room.z0 - 8.2, cover: false };
    // Extra Hard (and New Game+): a third of bosses arrive as their SUPER version
    const b = new Enemy(G, id, bossSpot, (runDiff === 3 || G.ngp) && Math.random() < (G.ngp ? 0.5 : 0.35) ? { isSuper: true } : {});
    G.enemies.push(b); area.boss = b;
    ui.bossName.textContent = (bk === 'mini' ? 'MINI BOSS: ' : '') + (b.displayName || DEFS[id].name);
    // mini bosses bring a couple of regulars; Bosses bring their own help
    if (bk === 'mini') { spawnAt(weightedType()); if (f > 10) spawnAt(weightedType()); }
    return;
  }
  // a memo lying around (story & endless): one chance per floor, in a random area
  if (!noteThisFloor && (runMode === 'story' || runMode === 'endless') && Math.random() < (i === G.floor.rooms.length - 2 ? 1 : 0.3)) {
    noteThisFloor = true;
    if (Math.random() < 0.75) spawnNote(room);
  }
  const initial = types.slice(0, initialN), rest = types.slice(initialN);
  for (const t of initial) spawnAt(t);
  area.queue = rest;
}


// a spot is only usable if you can see a standing enemy's head there from where you stand
// (some props, like the lobby pillar, used to hide a spot completely)
const losRay = new THREE.Raycaster();
function spotInSight(room, s) {
  if (s.los != null) return s.los;
  const from = room.stand.clone();
  let ok = false;
  for (const x of [s.x + (s.peek || 0), s.x]) {
    const to = new THREE.Vector3(x, 1.55, s.z), dir = to.clone().sub(from), dist = dir.length();
    losRay.set(from, dir.normalize()); losRay.far = dist - 0.35;
    const hit = losRay.intersectObject(room.group, true).find((h) => !h.object.material.transparent);
    if (!hit) { ok = true; break; }
  }
  s.los = ok;
  return ok;
}

function enemyInSight(e) {
  const to = e.centerWorld(new THREE.Vector3()), from = G.camPos.clone(), dir = to.clone().sub(from), dist = dir.length();
  losRay.set(from, dir.normalize()); losRay.far = Math.max(0.1, dist - 0.4);
  const hit = losRay.intersectObjects(G.floor.group.children.filter((c) => c.visible), true).find((h) => !h.object.material.transparent && h.object.material.fog !== false);
  if (!hit) return true;
  // head visible counts too
  if (e.head) { const h = e.head.getWorldPosition(new THREE.Vector3()), d2 = h.clone().sub(from); const dl = d2.length(); losRay.set(from, d2.normalize()); losRay.far = Math.max(0.1, dl - 0.3); return !losRay.intersectObjects(G.floor.group.children.filter((c) => c.visible), true).some((x) => !x.object.material.transparent && x.object.material.fog !== false); }
  return false;
}

function visibleSpots(room) {
  const hw = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
  return room.spots.filter((s) => (!s.taken || !s.taken.alive) && Math.abs(s.x) < hw * (room.stand.z - s.z) - 0.45 && spotInSight(room, s));
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
  if (mode === 'title' || seenTypes.has(type) || DEFS[type].boss) return;
  seenTypes.add(type); storeSet('overtime.seen', [...seenTypes]); statMax('typesSeen', seenTypes.size);
  pendingIntro.push(DEFS[type].name);
}

// Extra Hard: now and then an enemy arrives as its SUPER version
function superRoll(type) {
  const d = DEFS[type];
  if ((runDiff !== 3 && !G.ngp) || d.boss || d.minion || mode === 'title') return null;
  const base = 0.04 + Math.min(0.1, (G.eff || G.floorNum) * 0.002);
  // New Game+ has Supers on every difficulty (fewer below Extra Hard), and more of them on Extra Hard
  const ch = runDiff === 3 ? (G.ngp ? base * 1.8 : base) : base * 0.6;
  return Math.random() < ch ? { isSuper: true } : null;
}
function announceSuper(e) {
  if (!e.isSuper) return;
  const names = e.abilities.map((id) => SUPER_ABILITIES.find((a) => a.id === id).name).join(' · ');
  toast(`⚠ ${e.displayName}: ${names}`, '#d070ff'); sfx.rail();
  post.u.flash.value = Math.max(post.u.flash.value, 0.25); post.u.flashCol.value.set(0x8020c0);
}
function spawnAt(type) {
  const s = freeSpot(type);
  const e = new Enemy(G, type, s, superRoll(type) || {});
  announceSuper(e);
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
    const e = new Enemy(G, type, s, { active: true, ...(superRoll(type) || {}) }); announceSuper(e);
    s.taken = e; G.enemies.push(e); effects.dust(e.pos.clone().setY(0.1), 12); introduce(type);
    return e;
  }
  const entry = pick(Math.random, room.doorSpawns).clone();
  const s = isMelee(type) ? { x: entry.x, z: entry.z + 1.6, cover: false } : freeSpot(type);
  const e = new Enemy(G, type, s, { enter: entry, ...(superRoll(type) || {}) }); announceSuper(e);
  s.taken = e;
  G.enemies.push(e);
  introduce(type);
  for (const el of room.elevators) if (Math.abs(el.x - entry.x) < 0.5 && el !== room.exitElevator) { el.target = 1; el.closeAt = now + 2.8; sfx.ding(); }
  return e;
}
// ------------------------------------------------------------------ environmental destruction
// Small props can be shot: light ones get knocked flying (and hurt enemies they slam into),
// everything breaks apart when it runs out of health. Windows shatter.
const PROPS = {
  monitor: { hp: 1.5, mass: 1, fx: 'spark' }, keyboard: { hp: 0.8, mass: 0.4, fx: 'chip' }, mug: { hp: 0.3, mass: 0.2, fx: 'chip' },
  chair: { hp: 4, mass: 2, fx: 'chip' }, plant: { hp: 2.5, mass: 1.5, fx: 'dirt' }, cooler: { hp: 3, mass: 2.5, fx: 'water' },
  box: { hp: 2, mass: 0.8, fx: 'card' }, copier: { hp: 14, mass: 30, fx: 'spark', heavy: true }, vending: { hp: 18, mass: 50, fx: 'glass', heavy: true },
};
const flying = [];
function findProp(o) { while (o) { if (o.userData && o.userData.prop) return o; o = o.parent; } return null; }
function propCenter(p) { return new THREE.Box3().setFromObject(p).getCenter(new THREE.Vector3()); }
function propFx(kind, at, n) {
  const fx = PROPS[kind].fx;
  if (fx === 'spark') { effects.sparks(at, n); if (n > 6) { effects.smoke(at, 2, 0x303030, 0.3, 0.5, 1.2); effects.light(at, 0x80c0ff, 6, 4, 0.12); } }
  else if (fx === 'water') { effects.emit(at, n * 2, 'ice', 2.5, 9, 0.7); if (n > 6) effects.floorDecal(at.x, at.z, 'water', 1.1); }
  else if (fx === 'dirt') { effects.emit(at, n, 'dust', 2, 9, 0.8); effects.emit(at, n, 'goo', 1.8, 9, 0.6); }
  else if (fx === 'glass') { effects.emit(at, n * 2, 'ice', 3, 9, 0.8); effects.sparks(at, n); }
  else effects.emit(at, n, 'dust', 2.2, 9, 0.6);
}
function hitProp(p, dmg, point, dir, impulse = 3) {
  const st = p.userData.prop, def = PROPS[st.kind] || PROPS.box;
  st.hp = (st.hp ?? def.hp) - dmg;
  propFx(st.kind, point, 3);
  if (st.hp <= 0) { breakProp(p, dir, impulse); return; }
  if (!def.heavy) launchProp(p, dir.clone().setY(0).normalize().multiplyScalar(impulse / def.mass).add(new THREE.Vector3(0, 1.2 + impulse / def.mass * 0.4, 0)));
}
function launchProp(p, v) {
  const room = G.floor.rooms.find((r) => r.props.includes(p));
  if (room && p.parent !== room.group) room.group.attach(p);
  p.matrixAutoUpdate = true;
  let f = flying.find((x) => x.p === p);
  if (!f) { const b = new THREE.Box3().setFromObject(p); f = { p, v: new THREE.Vector3(), av: new THREE.Vector3(), h: p.position.y - b.min.y, mass: (PROPS[p.userData.prop.kind] || PROPS.box).mass }; flying.push(f); }
  f.v.add(v); f.av.set(rand(Math.random, -6, 6), rand(Math.random, -6, 6), rand(Math.random, -6, 6)).multiplyScalar(Math.min(1.5, v.length() / 4));
}
function breakProp(p, dir, impulse) {
  const kind = p.userData.prop.kind, at = propCenter(p);
  stat('propsBroken');
  propFx(kind, at, 12);
  if (PROPS[kind] && PROPS[kind].heavy) { effects.explosion(at, 0.5); sfx.explode(); }
  else sfx.metalHit();
  for (const r of G.floor.rooms) { const i = r.props.indexOf(p); if (i >= 0) r.props.splice(i, 1); }
  const fi = flying.findIndex((x) => x.p === p); if (fi >= 0) flying.splice(fi, 1);
  p.updateMatrixWorld(true);
  const meshes = []; p.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const m of meshes) {
    scene.attach(m); m.matrixAutoUpdate = true;
    effects.debris(m, dir.clone().setY(0).normalize().multiplyScalar(rand(Math.random, 0.5, 1.5) * Math.min(3, impulse * 0.4)).add(new THREE.Vector3(rand(Math.random, -1, 1), rand(Math.random, 1.5, 3), rand(Math.random, -1, 1))));
  }
  p.removeFromParent();
}
function updateProps(dt) {
  for (let i = flying.length - 1; i >= 0; i--) {
    const f = flying[i], p = f.p;
    f.v.y -= 9.8 * dt;
    p.position.addScaledVector(f.v, dt);
    p.rotation.x += f.av.x * dt; p.rotation.y += f.av.y * dt; p.rotation.z += f.av.z * dt;
    if (Math.abs(p.position.x) > HALF_W) { p.position.x = Math.sign(p.position.x) * HALF_W; f.v.x *= -0.4; }
    if (p.position.y - f.h < 0) {
      p.position.y = f.h; f.v.y = Math.abs(f.v.y) > 1.2 ? -f.v.y * 0.3 : 0; f.v.x *= 0.55; f.v.z *= 0.55; f.av.multiplyScalar(0.5);
      if (f.v.y === 0) { p.rotation.x *= 0.8; p.rotation.z *= 0.8; }
    }
    // slamming into enemies hurts them
    const sp = f.v.length();
    if (sp > 2.2) {
      const c = p.position;
      for (const e of G.enemies) {
        if (!e.alive || e.state === 'dormant' || e.off) continue;
        const ec = e.centerWorld(V3());
        if (Math.abs(ec.x - c.x) < 0.5 * e.scale && Math.abs(ec.z - c.z) < 0.5 * e.scale && c.y < ec.y + 0.9 * e.scale && c.y > e.pos.y - 0.2) {
          const r = e.damage(sp * f.mass * 0.35, 'body', c.clone());
          if (r && r !== 'immune') { e.stagger = 1; popText(ec.clone().add(new THREE.Vector3(0, 0.5, 0)), 'SMACK!', '#ffe070'); }
          f.v.multiplyScalar(-0.3); break;
        }
      }
    }
    if (sp < 0.15 && p.position.y - f.h < 0.01) { p.matrixAutoUpdate = false; p.updateMatrix(); flying.splice(i, 1); }
  }
}
// explosions and black holes shove props around
function propsInRange(at, r, fn) {
  if (!G.floor) return;
  for (const room of G.floor.rooms) {
    if (!room.group.visible) continue;
    for (const p of room.props.slice()) { p.updateMatrixWorld(true); const c = propCenter(p); const d = c.distanceTo(at); if (d < r) fn(p, c, d); }
    for (const g of room.glass.slice()) if (g.parent && g.getWorldPosition(V3()).distanceTo(at) < r * 0.9) shatterGlass(g, room);
  }
}
function blastProps(at, r, dmg) {
  propsInRange(at, r + 0.6, (p, c, d) => hitProp(p, dmg * (1 - d / (r + 0.6)) + 0.5, c, c.clone().sub(at).setY(0.3), 9));
}
G.pullProps = (h, dt, pull) => propsInRange(h.at, h.R, (p, c, d) => {
  const kind = p.userData.prop.kind; if ((PROPS[kind] || {}).heavy) return;
  if (d < 0.6) { breakProp(p, new THREE.Vector3(0, 1, 0), 1); return; }
  launchProp(p, h.at.clone().sub(c).normalize().multiplyScalar(14 * dt).add(new THREE.Vector3(0, 9.8 * dt * 1.05, 0)));
});
function shatterGlass(pane, room) {
  if (!pane.parent) return;
  const at = pane.getWorldPosition(new THREE.Vector3());
  for (let k = 0; k < 8; k++) effects.emit(at.clone().add(new THREE.Vector3(0, rand(Math.random, -0.7, 0.7), rand(Math.random, -0.9, 0.9))), 4, 'ice', 1.5, 9, 0.9);
  sfx.metalHit(); pane.removeFromParent(); stat('windowsBroken');
  const i = room.glass.indexOf(pane); if (i >= 0) room.glass.splice(i, 1);
}

// ------------------------------------------------------------------ black holes
// The Black Hole Gun opens a singularity where the shot lands: for a few seconds it drags in
// enemies, their shots, gibs and loose props (never you), crushing what reaches the middle,
// then collapses in a blast.
const holes = [];
const HALF_W = 3.25;
const HOLE_CORE = new THREE.MeshBasicMaterial({ color: 0x000000 });
function spawnBlackHole(at, w) {
  stat('blackholes');
  const p = at.clone(); p.y = clamp(p.y, 0.8, 2.3);
  const g = new THREE.Group(); g.position.copy(p); scene.add(g);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), HOLE_CORE); g.add(core);
  const mk = (size, col, op) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.ring(), color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: op })); sp.scale.setScalar(size); g.add(sp); return sp; };
  const disc = [mk(1.6, 0xb050ff, 0.9), mk(2.4, 0x6020c0, 0.6), mk(1.1, 0xffffff, 0.7)];
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glow(), color: 0x8030ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 })); gl.scale.setScalar(3); g.add(gl);
  holes.push({ g, core, disc, t: 0, life: 3.6, R: 4.2, dps: w.dmg * 0.55 * M.dmg * wlv(w.id).dmg, burst: w.dmg * M.dmg * wlv(w.id).dmg, at: p });
  sfx.rail(); shake = Math.min(1, shake + 0.3);
}
function updateHoles(dt) {
  post.u.hole.value.z = 0;
  for (let i = holes.length - 1; i >= 0; i--) {
    const h = holes[i]; h.t += dt;
    const grow = Math.min(1, h.t / 0.3) * (h.t > h.life - 0.3 ? Math.max(0, (h.life - h.t) / 0.3) : 1);
    h.core.scale.setScalar(0.4 + grow * (1 + Math.sin(h.t * 30) * 0.05));
    h.disc.forEach((d, k) => { d.material.rotation += dt * (k % 2 ? -5 : 7); d.scale.setScalar((1.1 + k * 0.65) * grow * (1 + Math.sin(h.t * 9 + k) * 0.08)); });
    effects.light(h.at, 0x9040ff, 10 * grow, 6, 0.06);
    if (Math.random() < dt * 30) { const a = Math.random() * 6.28, r = rand(Math.random, 1.2, h.R * 0.7); effects.emit(h.at.clone().add(new THREE.Vector3(Math.cos(a) * r, rand(Math.random, -0.8, 0.8), Math.sin(a) * r)), 1, 'pop', 0.1, 0, 0.3); }
    const pull = (pos, strength) => { const d = h.at.clone().sub(pos); const dist = d.length(); if (dist > h.R || dist < 0.01) return dist; pos.addScaledVector(d.normalize(), Math.min(dist, strength * (1.3 - dist / h.R) * dt)); return dist; };
    // enemies
    for (const e of G.enemies) {
      if (!e.alive || e.state === 'dormant' || e.off) continue;
      const c = e.centerWorld(V3()), dist = c.distanceTo(h.at);
      if (dist > h.R) continue;
      const y0 = e.pos.y;
      pull(e.pos, e.def.boss ? 0.6 : 4.5); e.pos.y = y0;
      if (e.goal) e.goal.copy(e.pos);
      e.stagger = 1; e.yawExtra = (e.yawExtra || 0) + dt * 6 * (1 - dist / h.R);
      e.damage(h.dps * dt * (dist < 0.9 ? 3 : 1), 'body', c, true);
    }
    // enemy shots, gibs and loose props get swallowed
    for (const p of G.projectiles) if (p.alive) { const d = pull(p.mesh.position, 9); if (d < 0.4) { p.kill(); stats.orbs++; score += 25; } }
    for (const d of effects.debrisList) { const dist = pull(d.m.position, 7); if (dist < h.R) { d.v.multiplyScalar(0.9); if (dist < 0.35) d.life = 99; } }
    if (G.pullProps) G.pullProps(h, dt, pull);
    // lens distortion on screen
    const r = canvasRect(), s = toScreen(h.at, r);
    if (!s.behind) post.u.hole.value.set(s.x / r.width, 1 - s.y / r.height, grow);
    if (h.t >= h.life) {
      scene.remove(h.g); holes.splice(i, 1);
      effects.explosion(h.at, 1.6); sfx.explode(); shake = Math.min(1, shake + 0.7);
      post.u.flash.value = 0.5; post.u.flashCol.value.set(0xa060ff);
      for (const e of G.enemies) { if (!e.alive || e.state === 'dormant') continue; const c = e.centerWorld(V3()); if (c.distanceTo(h.at) < 2.6) e.damage(h.burst, 'body', c); }
    }
  }
}

// ------------------------------------------------------------------ death animations
// Bodies that don't gib stay in the world for a few seconds: humans fall backward, critters flip
// over, flyers drop and explode, machines spark and blow, bosses go out in a chain of blasts.
const corpses = [];
G.addCorpse = (e, style, center) => {
  if (corpses.length >= 10) { const old = corpses.shift(); scene.remove(old.e.root); }
  e.root.rotation.order = 'YXZ';
  const away = center.clone().sub(G.camPos).setY(0).normalize();
  corpses.push({ e, style, t: 0, y0: e.root.position.y, vy: 0, away, spin: rand(Math.random, -4, 4), side: Math.random() < 0.5 ? -1 : 1, boom: 0, smokeT: 0 });
};
function updateCorpses(dt) {
  for (let i = corpses.length - 1; i >= 0; i--) {
    const c = corpses[i], e = c.e, R = e.root;
    c.t += dt;
    const done = () => { scene.remove(R); corpses.splice(i, 1); };
    const blowUp = (r) => { const p = e.centerWorld(new THREE.Vector3()); effects.explosion(p, r); sfx.explode(); shake = Math.min(1, shake + r * 0.25); e.gib(p, false); corpses.splice(i, 1); };
    if (c.style === 'fall' || c.style === 'flip') {
      const k = Math.min(1, c.t / (c.style === 'flip' ? 0.4 : 0.6));
      const fall = k < 1 ? k * k * 1.12 : 1 + Math.sin(Math.min(1, (c.t - 0.6) / 0.25) * Math.PI) * 0.06;
      if (c.style === 'fall') { R.rotation.x = -fall * 1.5; R.rotation.z = c.side * fall * 0.15; }
      else { R.rotation.z = c.side * fall * Math.PI * 0.95; R.position.y = c.y0 + Math.sin(k * Math.PI) * 0.35; }
      R.position.addScaledVector(c.away, dt * Math.max(0, 0.8 - c.t) * 0.9);
      if (e.gore === 'spark') { c.smokeT -= dt; if (c.smokeT <= 0 && c.t < 3) { c.smokeT = 0.25; const p = e.centerWorld(new THREE.Vector3()); p.y = 0.4; effects.smoke(p, 1, 0x2a2826, 0.3, 0.6, 1.2); if (Math.random() < 0.5) effects.sparks(p, 3); } }
      if (c.t > 3.6) R.position.y -= dt * 0.45;
      if (c.t > 5.2) done();
    } else if (c.style === 'crash') {
      c.vy -= 9.8 * dt; R.position.y += c.vy * dt; R.rotation.x += c.spin * dt; R.rotation.z += c.spin * 0.6 * dt;
      R.position.addScaledVector(c.away, dt * 0.8);
      if (Math.random() < dt * 25) effects.smoke(e.centerWorld(new THREE.Vector3()), 1, 0x2a2826, 0.25, 0.3, 0.9);
      if (R.position.y < 0.15 || c.t > 2) blowUp(0.8);
    } else if (c.style === 'wreck') {
      R.position.x += (Math.random() - 0.5) * 0.03;
      if (Math.random() < dt * 20) effects.sparks(e.centerWorld(new THREE.Vector3()), 2);
      if (c.t > 0.55) blowUp(0.7);
    } else if (c.style === 'boss') {
      // slow chain of blasts, then the big one
      c.boom -= dt;
      R.position.x += (Math.random() - 0.5) * 0.05;
      if (c.boom <= 0) {
        c.boom = 0.22;
        const p = e.centerWorld(new THREE.Vector3()).add(new THREE.Vector3(rand(Math.random, -0.8, 0.8), rand(Math.random, -0.6, 0.8), rand(Math.random, -0.4, 0.4)).multiplyScalar(e.scale));
        effects.explosion(p, 0.6); sfx.explode(); shake = Math.min(1, shake + 0.2);
      }
      if (c.t > 1.7) { blowUp(2); post.u.flash.value = 0.6; post.u.flashCol.value.set(0xffd8a0); }
    }
  }
}

// gore: a kill sprays the nearby walls, floor and ceiling
const goreRay = new THREE.Raycaster();
G.splatter = (center, kind, n) => {
  const gl = settings.gore ?? 2;
  if (!G.floor || gl === 0 || kind === 'spark' && Math.random() < 0.5) return;
  const objs = G.floor.group.children.filter((c) => c.visible);
  for (let k = 0; k < n * gl; k++) {
    const d = new THREE.Vector3(rand(Math.random, -1, 1), rand(Math.random, -0.8, 0.6), rand(Math.random, -1, 0.3)).normalize();
    goreRay.set(center, d); goreRay.far = 3;
    const h = goreRay.intersectObjects(objs, true).find((x) => !x.object.material.transparent && x.object.material.fog !== false);
    if (h) effects.decal(h.point, h.face.normal.clone().transformDirection(h.object.matrixWorld), kind, rand(Math.random, 0.25, 0.7));
  }
};
// bullet wounds stay on the enemy that took them
const WOUND_G = new THREE.PlaneGeometry(0.09, 0.09);
const WOUND_M = { blood: new THREE.MeshBasicMaterial({ map: TX.splat(1), color: 0x5a0000, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }),
  spark: new THREE.MeshBasicMaterial({ map: TX.bulletHole(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }),
  goo: new THREE.MeshBasicMaterial({ map: TX.splat(2), color: 0x2a6a10, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }) };
function wound(e, obj, point, dir) {
  if (!obj || !(settings.gore ?? 2) || (e.wounds || 0) >= 10 || !obj.parent) return;
  e.wounds = (e.wounds || 0) + 1;
  const w = new THREE.Mesh(WOUND_G, WOUND_M[e.gore] || WOUND_M.blood);
  obj.add(w); w.position.copy(obj.worldToLocal(point.clone().addScaledVector(dir, -0.01)));
  const ws = obj.getWorldScale(new THREE.Vector3()); w.scale.set(1 / ws.x, 1 / ws.y, 1 / ws.z).multiplyScalar(rand(Math.random, 0.7, 1.3));
  w.lookAt(point.clone().addScaledVector(dir, -1)); w.rotateZ(Math.random() * 6);
}

G.goldChance = () => M.goldChance || 1;
G.spawnReinforcement = (t) => { if (area) spawnReinforcement(t); };

// minions (summons, splits) appear right where their parent is
G.spawnMinion = (type, pos, n) => {
  const made = [];
  if (!area) return made;
  for (let k = 0; k < n; k++) {
    // balance: summoners can't flood the room (minions were the #1 killer past floor 20)
    if (G.enemies.filter((e) => e.alive).length >= 12) break;
    if (G.enemies.filter((e) => e.alive && e.def.minion).length >= 5) break;
    const at = pos.clone().add(new THREE.Vector3(rand(Math.random, -0.6, 0.6), 0, rand(Math.random, -0.3, 0.6)));
    at.x = clamp(at.x, -2.6, 2.6);
    const spot = isFlyer(type) ? airSpot(area.room) : isMelee(type) ? { x: at.x, z: at.z, cover: false } : freeSpot(type);
    const e = new Enemy(G, type, spot, { at, active: true });
    if (!isMelee(type) && !isFlyer(type)) e.goal.set(spot.x, 0, spot.z);
    G.enemies.push(e); introduce(type); made.push(e);
  }
  return made;
};
G.randomSpot = (e) => {
  const room = area ? area.room : G.room;
  const list = visibleSpots(room).filter((s) => !s.cover && s !== e.spot);
  return list.length ? pick(Math.random, list) : laneSpot(room);
};
// ---- boss support
G.spawnBomb = (from, k, n, kind, dmg) => {
  // lob toward the floor just in front of the player: it explodes on impact unless shot down
  const target = G.camPos.clone().add(new THREE.Vector3((k - (n - 1) / 2) * 0.8 + rand(Math.random, -0.3, 0.3), -1.55, -rand(Math.random, 0.2, 0.9)));
  G.projectiles.push(new Projectile(G, from, target, 3.6 * M.projSpeed, dmg, kind, { lob: true, bomb: true }));
};
G.spawnFixed = (type, pos) => {
  if (!area) return null;
  const e = new Enemy(G, type, { x: pos.x, z: pos.z, cover: false }, { at: pos, active: true });
  effects.sparks(pos.clone().setY(1), 12);
  G.enemies.push(e); return e;
};
G.spawnDecoys = (boss, n) => {
  const made = [];
  for (let k = 0; k < n; k++) {
    const at = new THREE.Vector3(clamp(rand(Math.random, -2, 2), -2.2, 2.2), boss.pos.y, boss.pos.z + rand(Math.random, -1, 1.2));
    const e = new Enemy(G, boss.type, { x: at.x, y: at.y, z: at.z, cover: false }, { at, active: true, decoy: true });
    e.atkOverride = { type: 'spread', n: 3, angle: 0.12, kind: 'big' };
    e.atkT = rand(Math.random, 0.8, 1.8);
    effects.sparks(e.centerWorld(new THREE.Vector3()), 12);
    G.enemies.push(e); made.push(e);
  }
  return made;
};
let bossMsgT = 0, bossMsgText = '', immuneT = 0;
G.bossMsg = (t) => { bossMsgText = t; bossMsgT = 1.6; };
G.bossImmune = (e) => { if (immuneT <= 0) { immuneT = 0.5; popText(e.centerWorld(new THREE.Vector3()), 'IMMUNE', '#9aa4b0'); } };
G.bossEnraged = (e) => { banner('ENRAGED!', e.def.name, 1.4); sfx.explode(); shake = 1; };
G.shakeCam = (a) => { shake = Math.min(1, shake + a); };

// enemy bombs and shots hurt other enemies too
G.splashEnemies = (center, r, dmg, owner) => {
  for (const o of G.enemies) {
    if (!o.alive || o.off || o.state === 'dormant') continue;
    const c = o.centerWorld(new THREE.Vector3());
    if (c.distanceTo(center) < r) { const res = o.damage(dmg, 'body', c); if (res && res !== 'immune') G.onFriendlyFire(o, c); }
  }
};
let ffT = 0;
G.onFriendlyFire = (o, p) => {
  if (!o.alive) stat('friendlyKills'); if (now - ffT > 1.2) { ffT = now; popText(p.clone().add(new THREE.Vector3(0, 0.4, 0)), 'FRIENDLY FIRE!', '#ffb040'); } };
G.blast = (center, r, dmg) => {
  blastProps(center, r, dmg);
  effects.explosion(center, r); sfx.explode(); shake = Math.min(1, shake + 0.4);
  for (const o of G.enemies) {
    if (!o.alive || o.state === 'dormant') continue;
    const c = o.centerWorld(new THREE.Vector3());
    if (c.distanceTo(center) < r) o.damage(dmg, 'body', c);
  }
};

// ------------------------------------------------------------------ game callbacks
G.spawnProjectile = (from, target, speed, dmg, kind, opts) => { G.projectiles.push(new Projectile(G, from, target, speed * M.projSpeed, dmg, kind, opts)); };

const PNAME = { orb: 'FIREBALL', big: 'PLASMA ORB', bolt: 'ENERGY BOLT', shard: 'SHARDS', plasma: 'PLASMA', fire: 'FIREBALL', coffee: 'HOT COFFEE', acid: 'ACID', grenade: 'GRENADE', package: 'PARCEL BOMB', missile: 'MISSILE', pitch: 'SALES PITCH', sonic: 'SONIC BLAST', bomb: 'BOMB', mine: 'MINE' };
let deathCause = '';
function causeOf(src, proj) {
  const who = src || (proj && proj.owner);
  const name = who && who.def ? who.displayName || who.def.name : null;
  if (proj) return `${name ? name + "'S " : 'A '}${PNAME[proj.kind] || 'PROJECTILE'}`;
  return name || 'THE BUILDING';
}
G.hurtPlayer = (dmg, src, proj) => {
  if (!G.combatActive || mode !== 'combat') return;
  if (devOn('god')) { sfx.hurt(); return; }
  if (hasSpirit() && Math.random() < 0.15) { popText(G.camPos.clone().add(new THREE.Vector3(0, -0.2, -1.2)), 'LUCKY!', '#80ffff'); return; } // the spirit's luck
  if (M.dodge && Math.random() < M.dodge) { popText(G.camPos.clone().add(new THREE.Vector3(0, -0.2, -1.2)), 'PHASED', '#a0b0ff'); return; } // Phase Skin
  if (M.thorns && src && !proj && src.alive && src.damage) src.damage(M.thorns, 'body', src.centerWorld(new THREE.Vector3())); // Spines
  if (M.acidBlood) G.splashEnemies(G.camPos, 2.6, M.acidBlood); // Acid Blood
  dmg *= D.dmg * Math.min(1, 0.8 + G.floorNum * 0.02) * (G.twist && G.twist.dmgIn || 1); // gentler first floors while players learn
  if (tutorial && !tutorial.done) dmg *= 0.5;
  if (!src && M.deflect && Math.random() < M.deflect) { popText(G.camPos.clone().add(new THREE.Vector3(0, -0.2, -1.2)), 'DEFLECTED', '#80e0ff'); sfx.zap(); return; }
  dmg *= M.armor;
  P.hp = Math.max(0, P.hp - dmg);
  if (P.hp <= 0 && M.secondWind && !P.windUsed) { P.windUsed = true; P.hp = 30; banner('SECOND WIND!', null, 1.2); sfx.unlock(); stat('saves'); }
  if (P.hp <= 0 && P.revives > 0) { P.revives--; P.hp = Math.round(M.maxHp / 2); banner('INSURANCE CLAIM!', `${P.revives} REVIVE${P.revives === 1 ? '' : 'S'} LEFT`, 1.6); sfx.unlock(); stat('saves'); for (const pr of G.projectiles) pr.kill(); }
  stats.dmg += dmg;
  sfx.hurt();
  shake = Math.min(1, shake + 0.5);
  dmgDir(proj ? proj.mesh.position : src && src.pos ? src.pos : null);
  ui.hp.classList.remove('hit'); void ui.hp.offsetWidth; ui.hp.classList.add('hit');
  post.u.hurt.value = Math.min(1, 0.5 + dmg / 25); post.u.chroma.value = Math.min(1, dmg / 20);
  ui.hurt.style.transition = 'none'; ui.hurt.style.opacity = post.enabled ? 0.35 : 0.9;
  requestAnimationFrame(() => { ui.hurt.style.transition = 'opacity .5s'; ui.hurt.style.opacity = 0; });
  combo = 0;
  if (P.hp <= 0) { deathCause = causeOf(src, proj); playerDied(); }
};

G.onEnemyKilled = (e, head, noScore) => {
  if (noScore) return;
  // enemy log: first kill adds the entry, every skin you kill is recorded
  const bl = profile.bestiary || (profile.bestiary = {});
  const be = bl[e.type] || (bl[e.type] = { k: 0, s: {} });
  be.k++; be.s[e.skinIdx || 0] = 1; if (e.isSuper) { be.rq = 1; stat('superKills'); } touch();
  if (be.k === 1 && !e.def.boss) toast(`NEW LOG ENTRY: ${e.def.name}`, '#80c0ff');
  if (e.skin && e.skin.rare) { stat('goldKills'); popText(e.centerWorld(new THREE.Vector3()).add(new THREE.Vector3(0, 0.8, 0)), 'GOLDEN! x5 CASH', '#ffd040'); }
  if (head) hitStop = 0.05; // tiny freeze-frame sells a headshot
  stats.kills++; if (head) stats.heads++;
  combo = now - lastKill < M.comboWindow ? Math.min(M.comboMax, combo + 1) : 1;
  lastKill = now;
  const pts = Math.round((e.st.score + (head ? 50 : 0)) * combo * M.score * D.score * (e.isSuper ? 3 : 1));
  runMaxCombo = Math.max(runMaxCombo, combo);
  const f = G.floorNum;
  const ef = G.eff || f;
  const cash = addCash((e.def.boss ? (e.def.mini ? 60 + ef * 6 : 150 + ef * 12) : Math.max(1, Math.round(e.st.score / 40))) * M.cash * D.cash * (e.skin && e.skin.rare ? 5 : 1) * (e.isSuper ? 4 : 1));
  runCash += cash;
  popText(e.centerWorld(new THREE.Vector3()).add(new THREE.Vector3(0, -0.35, 0)), `$${cash}`, '#ffd040');
  stat('kills'); if (G.ngp) stat('ngpKills'); if (head) stat('heads'); if (cur().melee) stat('meleeKills');
  if (e.def.boss) stat(e.def.mini ? 'miniKills' : 'bossKills');
  checkAch();
  // perk rewards for the kill
  healP(M.killHeal + (head ? M.headHeal : 0));
  if (M.reloadKill && !cur().melee) curSlot().ammo = Math.min(magOf(cur()), curSlot().ammo + M.reloadKill);
  if (M.chainKill && Math.random() < M.chainKill) G.blast(e.centerWorld(new THREE.Vector3()), 2.2, 3 * M.dmg);
  score += pts;
  popText(e.centerWorld(new THREE.Vector3()), `+${pts}`);
  if (e === area?.boss) {
    for (const o of G.enemies) if (o !== e && o.alive) o.die(false);
    for (const p of G.projectiles) p.kill();
    shake = 1;
  }
  // weapon drops: bosses always drop something good; floor 1 guarantees an early find
  const gunChance = e.def.boss ? 1 : ((G.floorNum === 1 && gunsThisFloor === 0 && area && area.idx >= 1) ? 0.35 : 0.075) * M.scavenge;
  if (Math.random() < gunChance) {
    const minR = e.def.boss ? (e.def.mini ? 'uncommon' : 'rare') : null, have = P.inv.map((s) => s.id);
    let id = rollGun(G.floorNum, Math.random, have, minR);
    if (id && Math.random() < M.luck + (hasSpirit() ? 0.4 : 0)) { // Lucky Charm: roll again, keep the rarer one
      const order = Object.keys(RARITY), id2 = rollGun(G.floorNum, Math.random, have, minR);
      if (id2 && order.indexOf(GUN[id2].rarity) > order.indexOf(GUN[id].rarity)) id = id2;
    }
    if (id) { dropGun(e.pos, id); return; }
  }
  if (!(G.twist && G.twist.noMedkits) && P.hp < M.maxHp && Math.random() < (P.hp < 40 ? 0.3 : 0.12) * M.medkit) dropMedkit(e.pos);
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
  const hal = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glow(), color: r.hex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 }));
  hal.scale.setScalar(0.9); hal.position.y = 0.3; p.mesh.add(hal);
  popText(new THREE.Vector3(pos.x, 1.2, pos.z), def.short, r.color);
  sfx.gunPickup();
  return p;
}

const NOTE_M = new THREE.MeshBasicMaterial({ color: 0xfff8e0, side: THREE.DoubleSide });
function spawnNote(room) {
  // which memo: an unfound one from this part of the tower (or any unfound one)
  const zone = Math.min(9, Math.floor(ZONE_OF(G.layout || G.floorNum)));
  const left = LORE.filter((l) => !profile.lore || !profile.lore[l.id]);
  if (!left.length) return;
  const pickL = left.find((l) => l.zone === zone) || (Math.random() < 0.35 ? left[0] : null);
  if (!pickL) return;
  const s = visibleSpots(room).filter((x) => !x.cover);
  const at = s.length ? pick(Math.random, s) : laneSpot(room);
  const g = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.36), NOTE_M); paper.position.y = 0.45; paper.rotation.x = -0.3; g.add(paper);
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glow(), color: 0xfff0a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
  gl.scale.setScalar(0.9); gl.position.y = 0.45; g.add(gl);
  addPickup('note', new THREE.Vector3(at.x + rand(Math.random, -0.4, 0.4), 0, at.z + 1), g, { id: pickL.id });
}
const ZONE_OF = (f) => (f <= 4 ? 0 : f <= 9 ? 1 : f <= 14 ? 2 : f <= 20 ? 3 : 4 + Math.floor((f - 21) / 5));

function collectPickup(p) {
  if (p.collect) return;
  p.collect = true; p.ct = 0;
  if (p.kind === 'note') {
    profile.lore = profile.lore || {}; profile.lore[p.id] = Date.now(); touch(); checkAch();
    sfx.unlock(); const l = LORE_BY_ID[p.id];
    toast(`FOUND: ${l.title}`, '#fff0a0'); popText(p.mesh.position.clone().setY(0.9), 'READ IT AT HQ > FILES', '#fff0a0');
    return;
  }
  if (p.kind === 'gun') { giveGun(p.id); return; }
  sfx.pickup(); stat('medkits');
  const amt = Math.round(25 * M.medkit);
  healP(amt);
  popText(p.mesh.position, `+${amt} HP`, '#60ff80');
}

// ------------------------------------------------------------------ inventory
function foundGun(id) { if (!profile.found[id]) { profile.found[id] = 1; touch(); } }
function giveGun(id) {
  foundGun(id); checkAch();
  if (id === 'watch' && !hasWatch()) banner('THE GOLDEN WATCH', PC ? 'RIGHT CLICK TO REWIND TIME' : 'TAP \u25C0\u25C0 TO REWIND TIME', 3);
  const def = GUN[id];
  const have = P.inv.findIndex((s) => s.id === id);
  sfx.gunPickup();
  if (have >= 0) { P.inv[have].ammo = magOf(def); toast(`${def.short} AMMO REFILLED`, RARITY[def.rarity].color); return; }
  if (P.inv.length < M.maxGuns) {
    P.inv.push({ id, ammo: magOf(def) });
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
      P.inv[i] = { id, ammo: magOf(def) };
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
// continuing a run as a different employee: swap the old employee's starting perks and weapon
// for the new one's (guns you found along the way are kept)
const RANK = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
function switchChar(sv, id) {
  const old = CHAR[sv.char] || CHAR.temp, nw = CHAR[id];
  if (!nw || nw.id === old.id) return sv;
  const perks = { ...(sv.perks || {}) };
  for (const [k, v] of Object.entries(old.perks)) { perks[k] = (perks[k] || 0) - v; if (perks[k] <= 0) delete perks[k]; }
  for (const [k, v] of Object.entries(nw.perks)) perks[k] = (perks[k] || 0) + v;
  const inv = sv.inv.filter((x) => GUN[x.id]).map((x) => ({ ...x }));
  if (!inv.some((x) => x.id === nw.weapon)) {
    const give = { id: nw.weapon, ammo: 999 };
    const oi = inv.findIndex((x) => x.id === old.weapon);
    if (oi >= 0) inv[oi] = give;
    else if (inv.length < M.maxGuns) inv.push(give);
    else { let lo = 0; inv.forEach((x, i) => { if (RANK[GUN[x.id].rarity] < RANK[GUN[inv[lo].id].rarity]) lo = i; }); inv[lo] = give; }
  }
  foundGun(nw.weapon);
  return { ...sv, char: nw.id, perks, inv, slot: Math.max(0, inv.findIndex((x) => x.id === nw.weapon)) };
}

function continueRun(sv, fullHp = false) {
  initAudio();
  hideScreens();
  score = sv.score || 0; floorStartScore = score;
  perkLv = { ...(sv.perks || {}) }; mutLv = { ...(sv.mut || {}) }; rerolls = sv.rerolls ?? 1; recalc();
  P.revives = sv.revives ?? M.revives; runCash = sv.cash || 0; runChar = sv.char || 'temp'; setDiff(sv.diff ?? 1); setRunMode(sv.rmode || 'story', sv.dailyKey); runId = sv.runId || Date.now(); rushIdx = sv.rushIdx || 0; rushTime = sv.rushTime || 0; setNgp(!!sv.ngp && sv.rmode !== 'daily', sv.ngp); setRoam(!!sv.roam && roamUnlocked()); setSleeve(CHAR[runChar]?.sleeve ?? 0xd2d2cc);
  P.hp = fullHp ? M.maxHp : Math.max(1, Math.min(M.maxHp, sv.hp || M.maxHp));
  P.inv = sv.inv.filter((s) => GUN[s.id]).map((s) => ({ ...s }));
  if (!P.inv.length) P.inv = [{ id: 'pistol', ammo: GUN.pistol.mag }];
  P.slot = Math.min(sv.slot || 0, P.inv.length - 1);
  autoReload();
  pendingGuns = []; choiceOpen = false; ui.gunChoice.classList.add('hidden');
  G.floorNum = sv.floor; G.variant = sv.variant;
  startFloor(sv.floor, true);
}

function startGame(floor = 1, keepScore = false) {
  initAudio();
  hideScreens();
  if (!keepScore) {
    // new run: the chosen employee's perks, permanent upgrades, fresh counters
    const ch = CHAR[profile.char] || CHAR.temp;
    runChar = ch.id; setSleeve(ch.sleeve); setDiff(profile.diff ?? 1);
    score = 0; perkLv = { ...ch.perks }; recalc(); rerolls = 1 + M.extraRerolls; P.revives = M.revives; runCash = 0;
    stat('runs'); runId = Date.now(); rushIdx = 0; rushTime = 0; mutLv = {};
    setNgp(runMode !== 'daily' && ngpWanted()); if (G.ngp) stat('ngpRuns');
    setRoam(roamWanted()); if (G.roam) stat('roamRuns');
    for (let k = 0; k < (M.startPerks || 0); k++) { const o = rollPerks(perkLv, 1); if (o[0]) perkLv[o[0]] = (perkLv[o[0]] || 0) + 1; } recalc(); // Orientation upgrade
    if (runMode === 'daily') {
      stat('dailyRuns');
      // everyone gets the same run today: The Temp, medium, a seeded weapon and two seeded perks
      daily = daily || dailySetup();
      const r = mulberry32(daily.seed);
      runChar = 'temp'; setSleeve(CHAR.temp.sleeve); setDiff(1);
      perkLv = {}; for (let k = 0; k < 2; k++) { const o = rollPerks(perkLv, 1, r); if (o[0]) perkLv[o[0]] = (perkLv[o[0]] || 0) + 1; }
      recalc(); daily.gun = rollGun(10, r, ['pistol'], 'uncommon');
    }
  }
  floorStartScore = score;
  P.hp = M.maxHp;
  if (keepScore && P.invAtFloor) P.inv = P.invAtFloor.map((s) => ({ ...s }));
  else {
    const ch = CHAR[runChar] || CHAR.temp;
    P.inv = [{ id: ch.weapon, ammo: magOf(GUN[ch.weapon]) }];
    if (runMode === 'daily' && daily && daily.mod.gun) P.inv = [{ id: daily.mod.gun, ammo: magOf(GUN[daily.mod.gun]) }];
    else if (runMode === 'daily' && daily && daily.gun) P.inv.push({ id: daily.gun, ammo: magOf(GUN[daily.gun]) });
    if (M.luckyStart) { const id = rollGun(Math.max(4, floor), Math.random, [ch.weapon], 'uncommon'); if (id) P.inv.push({ id, ammo: magOf(GUN[id]) }); }
    for (const s2 of P.inv) foundGun(s2.id);
  }
  P.slot = 0;
  autoReload();
  pendingGuns = []; choiceOpen = false; ui.gunChoice.classList.add('hidden'); pendingIntro = [];
  G.floorNum = floor;
  startFloor(floor, keepScore);
}

function startFloor(n, sameVariant = false) {
  endRide();
  noteThisFloor = false;
  endTutorial(true);
  mode = 'intro'; G.combatActive = false;
  stats = newStats(); combo = 0;
  // each floor has 3 versions; roll one (a retry replays the same version)
  loadFloor(n, sameVariant && G.variant != null && G.floorNum === n ? G.variant : runMode === 'daily' && daily ? daily.variants[(n - daily.start) % 8] : G.ngp && Math.random() < 0.4 ? 3 : Math.floor(Math.random() * 3)); // NG+: 40% nightmare floors
  floorStartScore = score;
  ui.hud.classList.remove('hidden');
  ui.bossbar.classList.add('hidden');
  P.invAtFloor = P.inv.map((s) => ({ ...s }));
  gunsThisFloor = 0;
  equip(P.slot, true);
  // autosave: a run can always be continued from the start of this floor
  saveRun({ floor: n, variant: G.variant, score, hp: P.hp, inv: P.inv.map((s) => ({ id: s.id, ammo: s.ammo })), slot: P.slot, perks: perkLv, rerolls, revives: P.revives, cash: runCash, char: runChar, diff: runDiff, rmode: runMode, runId, rushIdx, rushTime, dailyKey: daily && daily.key, mut: mutLv, ngp: G.ngp ? G.ngpLv : 0, roam: G.roam ? 1 : 0 });
  statMax('maxFloor', n); checkAch();
  P.windUsed = false;
  tutorialPending = n === 1 && !tutorialDone();
  const room0 = G.floor.rooms[0];
  prepareArea(0);
  setMusic('calm');
  run(function* () {
    const el = room0.entryElevator;
    yaw = 0; pitch = BASE_PITCH; roll = 0;
    if (el) { G.camPos.copy(el.inside); } else G.camPos.copy(room0.stand).add(new THREE.Vector3(0, 0, 1.2));
    applyCamera();
    fade(0, 0.8);
    const bk = bossKindFor(n);
    floorCard(runMode === 'rush' ? rushIdx + 1 : n, G.floor.plan.name, MOODS[G.floor.plan.mood]?.name, bk, runMode === 'rush' ? 'BOSS' : 'FLOOR');
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
    if (G.floor && k < 0.98) solveCollisions(lights || [G.room], null, null, false); // never through pillars or props
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
  if (area.tutorial && !tutorial) { tutorial = new Tutorial(tutCtx); tutorial.start(); ui.tutSkip.classList.remove('hidden'); }
  snapRoomStart();
  if (area.boss) { ui.bossbar.classList.remove('hidden'); bossCard({ ...area.boss.def, name: area.boss.displayName || area.boss.def.name }, area.boss.def.brain ? area.boss.def.brain.hint : 'PERFORMANCE REVIEW'); }
  updateHud(true);
}

function startAmbush(room) {
  area = { idx: area.idx, room, queue: [], waveT: 99, maxAlive: 0, clearing: false, boss: null, ambush: true, zMax: G.camPos.z + 1.2, zMin: G.camPos.z - 2.4 };
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
  snapRoomStart();
  updateHud(true);
}

function ambushCleared() {
  area.clearing = true; resetWorldRoll();
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
  area.clearing = true; resetWorldRoll();
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
      if (G.forceAmbush || Math.random() < Math.min(0.5, 0.22 + G.floorNum * 0.01)) {
        G.forceAmbush = false;
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
  } else if (runMode === 'story' && G.floorNum >= TOP_FLOOR) {
    banner('THE CHAIRMAN IS DEAD', null, 1.6);
    run(function* () { yield 1.6; fade(1, 0.5); yield 0.6; endingAfterBoss(); });
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
      yield 0.3;
      startRide(el);
      floorComplete();
    });
  }
}

// ------------------------------------------------------------------ ending cutscenes
// Beating the Chairman on floor 30 in Story plays the ending for this run's difficulty (cutscene/endings.js).
// They can also be replayed from HQ > RECORDS and the dev panel.
let cutscene = null, csReturn = null;
function playCutscene(diff, done) {
  if (cutscene) return;
  csReturn = { mode, hud: !ui.hud.classList.contains('hidden') };
  mode = 'cutscene'; G.combatActive = false;
  ui.hud.classList.add('hidden'); hideScreens();
  if (PC && locked()) document.exitPointerLock();
  setMusic('off'); initAudio();
  cutscene = playEnding(diff, {
    renderer, post, PC, char: runChar, mutTint: mutationTint(mutLv),
    aspect: () => camera.aspect, height: () => post.u.res.value.y,
    onDone: () => {
      cutscene = null;
      post.grade(GRADES[moodNow] || GRADES.normal); post.u.flash.value = 0;
      fade(0, 0.6);
      done && done();
    },
  });
}
function endingAfterBoss() { // the last floor of Story: straight from the fight into the ending
  playCutscene(runDiff, () => { mode = 'floorclear'; floorComplete(); });
}

// ------------------------------------------------------------------ the elevator ride between floors
// Instead of a black screen you ride up in the elevator while you look at your stats and pick a
// perk: the cab rumbles, the light flickers and the floor display counts up.
let ride = null;
function floorDisplay(text) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 24;
  const x = c.getContext('2d'); x.fillStyle = '#100604'; x.fillRect(0, 0, 64, 24);
  x.fillStyle = '#ff5030'; x.font = 'bold 18px monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 32, 13);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; return t;
}
function startRide(el) {
  endRide();
  const n = G.floorNum, dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(-1); // where you're looking (the doors)
  const mat = new THREE.SpriteMaterial({ map: floorDisplay('▲ ' + String(n).padStart(2, '0')), depthTest: false, depthWrite: false });
  const sign = new THREE.Sprite(mat); sign.scale.set(0.42, 0.16, 1);
  sign.position.copy(el.inside).addScaledVector(dir, 0.95); sign.position.y = EYE + 0.34;
  scene.add(sign);
  ride = { el, sign, mat, t: 0, n, shown: n };
  for (const l of roomLights) { l.position.copy(el.inside).add(new THREE.Vector3(0, 0.75, 0)); l.intensity = roomBase * 0.55; }
}
function updateRide(dt) {
  if (!ride) return;
  ride.t += dt;
  // the display ticks up to the next floor, then just blinks the arrow
  const target = ride.n + 1, show = ride.t > 2.2 ? target : ride.n;
  if (show !== ride.shown || Math.floor(ride.t * 2) !== ride.blink) {
    ride.shown = show; ride.blink = Math.floor(ride.t * 2);
    ride.mat.map.dispose(); ride.mat.map = floorDisplay((ride.blink % 2 ? '  ' : '▲ ') + String(show).padStart(2, '0')); ride.mat.needsUpdate = true;
  }
  shake = Math.max(shake, 0.1 + Math.sin(ride.t * 1.3) * 0.04);
  for (const l of roomLights) l.intensity = roomBase * (Math.random() < 0.02 ? 0.15 : 0.55);
}
function endRide() { if (ride) { scene.remove(ride.sign); ride.mat.map.dispose(); ride = null; } }

function autoReload() { for (const s of P.inv) s.ammo = magOf(GUN[s.id]); P.reloadT = 0; P.burstLeft = 0; }

function floorComplete() {
  mode = 'floorclear';
  const n = G.floorNum;
  if (n > best.floor || score > best.score) { best.floor = Math.max(best.floor, n); best.score = Math.max(best.score, score); storeSet('overtime.best', best); }
  if (runMode === 'story' && n >= TOP_FLOOR) { showWin(); return; }
  if (runMode === 'daily' && daily && n >= daily.end) { showModeEnd(); return; }
  if (runMode === 'rush' && rushIdx >= RUSH_FLOORS.length - 1) { showModeEnd(); return; }
  const acc = stats.shots ? Math.round((stats.hits / stats.shots) * 100) : 0;
  const bonus = addCash((20 + (G.eff || n) * 4) * M.cash * D.cash); runCash += bonus;
  stat('orbs', stats.orbs); statMax('maxFloor', n + 1); stat('floors'); if (stats.dmg === 0) stat('noDmgFloors');
  if (runMode === 'endless') statMax('endlessFloor', n);
  checkAch({ floorCleared: true, floorDmg: stats.dmg, shots: stats.shots, hits: stats.hits, floorTime: stats.t });
  flushProfile(true);
  $('fcTitle').textContent = `FLOOR ${String(n).padStart(2, '0')} CLEARED`;
  $('fcStats').textContent = [
    `KILLS       ${stats.kills}`, `HEADSHOTS   ${stats.heads}`, `ORBS POPPED ${stats.orbs}`,
    `ACCURACY    ${acc}%`, `TIME        ${fmtTime(stats.t)}`, `SCORE       ${score}`,
    `CASH        +${money(bonus)} BONUS`, `WALLET      ${money(profile.cash)}`,
  ].join('\n');
  const heal = G.twist && G.twist.noCoffee ? 0 : Math.max(0, Math.min(M.maxHp - P.hp, Math.round((30 + M.coffee) * D.heal * (M.coffeeMul ?? 1))));
  P.hp += heal;
  let unlock = heal > 0 ? `+${heal} HP COFFEE BREAK` : '';
  unlock += (unlock ? '\n' : '') + 'LOADOUT: ' + P.inv.map((s) => GUN[s.id].short).join(' / ');
  $('fcUnlock').textContent = unlock;
  perkOffer = mutating() ? rollMutations(mutLv, M.perkChoices) : rollPerks(perkLv, M.perkChoices, Math.random, n % 5 === 0 || n % 5 === 3);
  $('nextBtn').textContent = perkOffer.length ? (mutating() ? 'MUTATE' : 'CHOOSE A PERK') : 'GOING UP';
  showScreen(ui.floorClear);
}

function fmtTime(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${String(s).padStart(2, '0')}`; }

function nextFloor() {
  hideScreens();
  endRide();
  healP(M.floorHeal); // First Aid Kit upgrade
  const n = runMode === 'rush' ? RUSH_FLOORS[++rushIdx] : G.floorNum + 1;
  G.floorNum = n;
  startFloor(n);
}

// local records for the RECORDS tab
function logRun(finished) {
  recordRun(profile, { mode: runMode, run: runId, score, floor: G.floorNum, char: runChar, diff: runDiff, date: Date.now(),
    time: Math.round(rushTime), bosses: runMode === 'rush' ? rushIdx + (finished ? 1 : 0) : undefined, dailyKey: daily && daily.key });
  touch(); flushProfile(true);
}
function showModeEnd() {
  $('winStory').innerHTML = ''; $('winTitle').style.color = '';
  logRun(true);
  if (runMode === 'daily') { stat('dailyDone'); profile.twists = profile.twists || {}; profile.twists[daily.mod.id] = 1; }
  if (runMode === 'rush') { stat('rushDone'); if (!profile.stats.rushBest || rushTime < profile.stats.rushBest) profile.stats.rushBest = Math.round(rushTime); }
  checkAch(); clearRun(); flushProfile(true);
  const m = MODE[runMode];
  $('winTitle').textContent = runMode === 'rush' ? 'BOSS RUSH COMPLETE' : 'DAILY COMPLETE';
  $('winTag').textContent = runMode === 'rush' ? `ALL 10 BOSSES IN ${fmtTime(rushTime)}` : `TODAY: ${daily.mod.name}`;
  const recs = runMode === 'daily' ? `TODAY'S BEST ${(profile.records.daily || {})[daily.key] || score}` : `BEST TIME ${fmtTime((profile.records.rush[0] || {}).time || rushTime)}`;
  $('winStats').textContent = `${m.name}\nSCORE ${score}\n${recs}`;
  $('keepBtn').classList.add('hidden');
  showScreen(ui.win); setMusic('calm');
}

function playerDied() {
  logRun(false);
  G.combatActive = false; mode = 'dead';
  setMusic('off');
  for (const p of G.projectiles) p.kill();
  G.projectiles = [];
  if (score > best.score) { best.score = score; storeSet('overtime.best', best); }
  stat('orbs', stats.orbs); flushProfile(true);
  run(function* () {
    const y0 = G.camPos.y;
    yield* tween(1.0, (k) => { G.camPos.y = lerp(y0, 0.35, ease(k)); roll = ease(k) * 1.1; pitch = BASE_PITCH + k * 0.3; });
    fade(0.7, 0.5); yield 0.6;
    $('goCause').textContent = deathCause ? `KILLED BY ${deathCause}` : '';
    $('goStats').textContent = `FLOOR ${G.floorNum}\nSCORE ${score}\nCASH EARNED ${money(runCash)}\nWALLET ${money(profile.cash)}\nBEST FLOOR ${Math.max(best.floor, G.floorNum)}`;
    showScreen(ui.gameOver);
  });
}

function showWin() {
  logRun(true); stat('win_' + runChar); stat('wind_' + runDiff);
  clearRun(); stat('wins'); if (G.ngp) { stat('ngpWins'); stat('ngpwin_' + runDiff); profile.ngpLevel = Math.min(5, Math.max(profile.ngpLevel || 1, G.ngpLv + 1)); } statMax('maxFloor', TOP_FLOOR); checkAch({ won: true }); flushProfile(true);
  // every difficulty has its own ending
  const E = G.ngp ? ENDING_NGP : ENDINGS[runDiff] || ENDINGS[1];
  $('winTitle').textContent = E.title; $('winTitle').style.color = E.color; $('winTag').textContent = E.tag; $('keepBtn').classList.remove('hidden');
  $('winStory').innerHTML = E.lines.map((l, i) => `<p style="animation-delay:${0.6 + i * 1.6}s">${l}</p>`).join('');
  profile.endings = profile.endings || {}; profile.endings[runDiff] = 1; if (G.ngp) profile.endings.ngp = 1;
  $('winStats').textContent = `FINAL SCORE ${score}\nBEST ${best.score}\nKEEP CLIMBING TO PLAY ON IN ENDLESS MODE`;
  showScreen(ui.win);
  setMusic('calm');
}

function toTitle() {
  hideScreens();
  endRide();
  ui.hud.classList.add('hidden');
  mode = 'title'; G.combatActive = false; seq = null;
  loadFloor(1, 0);
  prepareArea(0);
  G.camPos.copy(G.floor.rooms[0].stand);
  yaw = 0; pitch = BASE_PITCH; roll = 0;
  fade(0, 0.8);
  titleNgp(); setRoam(false);
  setMusic('calm');
  { const n = unreadFiles(); $('hqBtn').innerHTML = 'HQ · UPGRADES' + (n ? ` <span class="new-tag">${n} NEW FILE${n > 1 ? 'S' : ''}</span>` : ''); }
  { const c = completion(); $('bestLbl').textContent = (best.floor ? `BEST: FLOOR ${best.floor} / ${best.score} PTS` : '') + (profile.stats.runs ? `${best.floor ? ' · ' : ''}${c}% COMPLETE` : ''); }
  const sv = loadRun();
  ui.continueBtn.classList.toggle('hidden', !sv);
  if (sv) ui.continueBtn.textContent = `CONTINUE · FLOOR ${String(sv.floor).padStart(2, '0')}`;
  $('startBtn').textContent = sv ? 'NEW RUN' : 'CLOCK IN';
  $('titleCash').textContent = profile.cash || profile.stats.runs ? `WALLET ${money(profile.cash)}` : '';
  flushProfile(true); checkAch();
  endTutorial(true);
  showScreen(ui.title);
}

function showScreen(el) { el.classList.remove('hidden'); }
function hideScreens() { $('hq').classList.add('hidden'); $('charSelect').classList.add('hidden'); $('diffSelect').classList.add('hidden'); $('modeSelect').classList.add('hidden'); for (const k of ['title', 'pause', 'floorClear', 'gameOver', 'win', 'settings', 'confirm', 'perks']) ui[k].classList.add('hidden'); }

let bannerTimer = null;
// big presentation cards (floor intro, boss intro)
const cardEl = $('card');
function showCard(html, cls, dur) {
  cardEl.className = ''; cardEl.innerHTML = html; void cardEl.offsetWidth;
  cardEl.className = 'show ' + (cls || '');
  cardEl.style.animationDuration = dur + 's';
}
function floorCard(n, zone, mood, bk, label = 'FLOOR') {
  const chip = bk === 'boss' ? '<span class="chip" style="color:#ff5040">BOSS FLOOR</span>' : bk === 'mini' ? '<span class="chip" style="color:#ff9040">MINI BOSS</span>' : mood ? `<span class="chip" style="color:#80c0ff">${mood}</span>` : '';
  showCard(`<div class="stripe"></div><div class="row"><div class="lbl">${label}</div><div class="num${bk === 'boss' ? ' boss' : ''}">${String(n).padStart(2, '0')}</div><div class="zone">${zone}</div>${chip}</div><div class="stripe"></div>`, '', 2.6);
}
let slowT = 0, hitStop = 0;
function bossCard(def, hint) {
  $('letterbox').classList.add('on');
  showCard(`<div class="row"><div class="lbl">${def.mini ? 'MINI BOSS' : 'BOSS'}</div><div class="num boss">${def.name}</div><div class="zone">${hint}</div></div>`, 'bossCard', 2.8);
  setTimeout(() => $('letterbox').classList.remove('on'), 2300);
  slowT = 0.9; sfx.unlock(); shake = Math.min(1, shake + 0.4);
  post.u.flash.value = 0.35; post.u.flashCol.value.set(0xff3020);
}

// red arc pointing at whatever hurt you
function dmgDir(from) {
  if (!from) return;
  const d = from.clone().sub(G.camPos);
  const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const ang = Math.atan2(fwd.x * d.z - fwd.z * d.x, fwd.x * d.x + fwd.z * d.z);
  const el = document.createElement('i'); el.style.transform = `rotate(${-ang}rad)`;
  $('dmgDir').appendChild(el); setTimeout(() => el.remove(), 900);
}

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
  { const md0 = models[id]; if (md0 && !md0.gold && (profile.weapons[id] || 0) >= 10) { goldPlate(md0.g); md0.gold = true; } } // armory LEGEND
  for (const k in models) models[k].g.visible = k === id;
  P.swapT = silent || M.fastSwap ? 0 : 1; P.reloadT = 0; P.burstLeft = 0;
  if (M.autoload) for (const s2 of P.inv) if (s2 !== curSlot()) s2.ammo = magOf(GUN[s2.id]);
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
  if (w.spirit) { if (spiritOverdriveStart()) stat('overdrives'); else if (spiritGauge() < 1) toast(`OVERDRIVE ${Math.floor(spiritGauge() * 100)}%`, '#80ffff'); return; }
  if (w.watch) { useWatch(); return; }
  if (w.melee || P.reloadT > 0 || curSlot().ammo >= magOf(w)) return;
  P.reloadT = P.reloadDur = w.reload * M.reload * wlv(w.id).reload; P.burstLeft = 0;
  sfx.reload();
}

function tryFire(x, y) {
  if (!G.combatActive || mode !== 'combat' || paused) return;
  const w = cur();
  if (w.spirit) { if (P.cd > 0) return; if (spiritUse(x, y)) P.cd = w.cd * M.cd; return; }
  if (w.watch) { if (P.cd > 0) return; P.cd = w.cd; useWatch(); return; }
  if (P.reloadT > 0 || P.cd > 0 || P.swapT > 0.3 || P.burstLeft > 0) return;
  if (!w.melee && curSlot().ammo <= 0) { sfx.empty(); startReload(); P.cd = 0.25; return; }
  P.cd = w.cd * M.cd * wlv(w.id).cd;
  if (w.burst) { P.burstLeft = w.burst; P.burstT = 0; P.burstX = x; P.burstY = y; return; }
  fireOnce(x, y);
}

function fireOnce(x, y) {
  const w = cur(), slot = curSlot();
  if (!w.melee && slot.ammo <= 0) { P.burstLeft = 0; startReload(); return; }
  if (!w.melee && !devOn('ammo')) slot.ammo--;
  stats.shots++;
  sfx[w.sound]();
  if (w.melee) {
    // a swing: also bats away any projectile that has got close
    const style = viewModel(w.id).style;
    P.swing = 1; P.swingDir = -P.swingDir || 1;
    P.swingDur = style === 'saw' ? 0.3 : style === 'chop' ? Math.min(0.62, Math.max(0.42, w.cd * 0.8)) : Math.min(0.36, Math.max(0.24, w.cd * 0.9));
    for (const p of G.projectiles) if (p.alive && p.mesh.position.distanceTo(G.camPos) < 2.6 + (w.parry || 0)) { effects.pop(p.mesh.position.clone()); p.kill(); stats.orbs++; score += 25; }
  } else {
    P.recoil = Math.min(1.8, P.recoil + w.kick);
    P.flashT = 0.05;
    muzzleLight.intensity = w.explode ? 10 : 6;
    if (w.tracer) muzzleLight.color.set(w.tracer); else muzzleLight.color.set(0xffc070);
    P.punch = Math.min(0.035, P.punch + 0.003 + w.kick * 0.006); // camera kick
    gunFx(w);
  }
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
  if (!w.melee && slot.ammo <= 0) setTimeout(startReload, 180);
  updateHud();
}

const V3 = () => new THREE.Vector3();

// weapon feel: brass casings out of the ejection port, smoke at the muzzle, a glow on big guns
const ENERGY = new Set(['tesla', 'laserrifle', 'plasmacannon', 'railgun', 'flamer', 'cryo', 'blackhole', 'seeker', 'leech', 'golden', 'shockgun']);
const NO_CASING = new Set([...ENERGY, 'revolver', 'crossbow', 'harpoon', 'grenade', 'rocket', 'rocketpod', 'flaregun', 'coffeecannon', 'stapler', 'nailgun', 'shredgun']);
function gunFx(w) {
  const md = viewModel(w.id);
  md.g.updateMatrixWorld(true);
  if (!NO_CASING.has(w.id)) {
    const at = md.g.localToWorld(new THREE.Vector3(0.05, 0.04, -0.12));
    const n = w.pellets > 4 ? 1 : w.burst ? 1 : 1;
    for (let k = 0; k < n; k++) effects.casing(gunScene, at, new THREE.Vector3(rand(Math.random, 0.5, 0.9), rand(Math.random, 0.8, 1.3), rand(Math.random, -0.1, 0.25)));
  }
  // world-space muzzle point a little in front of the camera, toward the gun side
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const mz = camera.position.clone().addScaledVector(fwd, 0.9).addScaledVector(right, PC ? 0.18 : 0.22).add(new THREE.Vector3(0, -0.22, 0));
  if (settings.gfx > 0 && (w.kick >= 1 || Math.random() < 0.35)) effects.smoke(mz, w.kick >= 1.4 ? 2 : 1, 0x8a8680, 0.12 + w.kick * 0.05, 0.35, 0.7);
  if (w.kick >= 1.4 || ENERGY.has(w.id)) effects.glowAt(mz, w.tracer || 0xffb050, 0.35 + w.kick * 0.15, 0.06);
}

function resolveShot(x, y, w, rect, primary) {
  const range = w.melee ? w.melee + M.meleeReach : w.range;
  // 1. incoming projectiles: generous screen-space hit
  let bp = null, bd = PC ? 34 : 46;
  for (const p of G.projectiles) {
    if (!p.alive) continue;
    const s = toScreen(p.mesh.position, rect);
    if (s.behind) continue;
    const dist = Math.hypot(s.x - x, s.y - y);
    const r = ((PC ? 20 : 30) + (PC ? 20 : 30) / Math.max(0.6, p.mesh.position.distanceTo(G.camPos))) * (0.8 + 0.15 * settings.aim);
    if (dist < r && dist < bd) { bd = dist; bp = p; }
  }
  if (bp) {
    effects.pop(bp.mesh.position.clone()); sfx.orbPop();
    bp.kill(); stats.orbs++; score += 25 * Math.max(1, combo); healP(M.orbHeal);
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
  const hitsL = raycaster.intersectObjects(G.floor.group.children.filter((c) => c.visible), true).filter((h) => !h.object.material.transparent && h.object.material.fog !== false);
  const levelHit = hitsL[0];
  const wallD = levelHit ? levelHit.distance : Infinity;
  const maxD = Math.min(wallD + 0.05, range || Infinity);
  const pk = raycaster.intersectObjects(G.pickups.filter((p) => !p.collect).map((p) => p.hit), false)[0];
  if (pk && pk.distance < wallD + 0.3 && !(hitsT[0] && hitsT[0].distance < maxD)) { collectPickup(pk.object.userData.pickup); return 'pickup'; }

  const hits = [], seen = new Set();
  for (const h of hitsT) {
    if (h.distance > maxD) break;
    const e = h.object.userData.enemy;
    if (seen.has(e)) continue;
    seen.add(e);
    hits.push({ e, part: h.object.userData.part, point: h.point, dist: h.distance, obj: h.object });
    if (hits.length > w.pierce) break;
  }
  // 3. aim assist (screen space, small radius, not through walls, not on hidden enemies)
  if (!hits.length) {
    let ae = null, ad = (w.seek || (w.melee ? (PC ? 45 : 70) : PC ? 12 : 30)) * AIM_MULT[settings.aim]; // mice are precise, fingers are not; melee & seekers are forgiving
    for (const e of G.enemies) {
      if (!e.targetable || e.crouch > 0.5) continue;
      const c = e.centerWorld(V3());
      const s = toScreen(c, rect);
      if (s.behind) continue;
      const d = Math.hypot(s.x - x, s.y - y);
      const dist = c.distanceTo(G.camPos);
      if (range && dist > range) continue;
      if (d < ad && (!levelHit || dist < levelHit.distance + 0.4 || (e.crouch < 0.2 && levelHit.distance > dist - 1.6))) { ad = d; ae = { e, part: e.shieldHp > 0 ? 'shield' : 'body', point: c, dist }; }
    }
    if (ae) hits.push(ae);
  }

  const muzzle = camera.localToWorld(new THREE.Vector3(0.08, -0.16, -0.45));
  const far = levelHit ? levelHit.point.clone() : ray.at(range || 30, V3());
  if (range && levelHit && levelHit.distance > range) far.copy(ray.at(range, V3()));

  if (w.explode) {
    const at = hits.length ? hits[0].point.clone() : far.clone().addScaledVector(ray.direction, -0.25);
    if (w.melee && !hits.length) return null;
    if (!w.melee) effects.beam(muzzle, at, w.tracer || 0xffa040, 0.03, 0.06);
    return explode(at, w);
  }

  let best = null;
  hits.forEach((h, i) => {
    const r = applyHit(h.e, h.part, h.point, w, primary && i === 0, ray.direction);
    if (r === 'head' || r === 'body') wound(h.e, h.obj, h.point, ray.direction);
    if (!best || r === 'head') best = r;
    // exit splatter on the wall or floor just behind the target
    if ((r === 'head' || r === 'body') && primary && !w.melee && (settings.gore ?? 2) > 0 && levelHit && levelHit.distance - h.dist < 2.6 && Math.random() < 0.35 + 0.3 * (settings.gore ?? 2)) {
      const n = levelHit.face.normal.clone().transformDirection(levelHit.object.matrixWorld);
      effects.decal(levelHit.point, n, h.e.gore, r === 'head' ? 0.55 : 0.4);
    }
  });

  if (w.tracer) {
    const end = w.pierce >= 99 || !hits.length ? far : hits[hits.length - 1].point;
    if (w.chain) effects.lightning(muzzle, end, w.tracer);
    else effects.beam(muzzle, end, w.tracer, w.pierce >= 99 ? 0.07 : 0.025, w.pierce >= 99 ? 0.25 : 0.08);
  }
  if (w.burn && primary) {
    const stop = hits.length ? hits[0].dist : Math.min(wallD, range || 30);
    for (let t = 1.2; t < stop; t += 1.3) effects.fire(ray.at(t, V3()), 1);
  }
  // windows the shot passes through shatter
  if (!w.melee) {
    const panes = []; for (const r of G.floor.rooms) if (r.group.visible) panes.push(...r.glass);
    const stop = hits.length ? hits[hits.length - 1].dist : levelHit ? levelHit.distance : 40;
    for (const gh of raycaster.intersectObjects(panes, false)) if (gh.distance < stop) shatterGlass(gh.object, G.floor.rooms.find((r) => r.glass.includes(gh.object)));
  }
  // props the shot hits get damaged and knocked back
  if (!hits.length && levelHit && !(range && levelHit.distance > range)) {
    const pr = findProp(levelHit.object);
    if (pr) hitProp(pr, w.dmg * w.pellets * M.dmg * (w.melee ? 2 : 1), levelHit.point, ray.direction, (w.kick || 1) * 2.2 + (w.melee ? 4 : 0));
  }
  if (!hits.length && levelHit && !(range && levelHit.distance > range)) {
    const n = levelHit.face.normal.clone().transformDirection(levelHit.object.matrixWorld);
    if (w.burn) effects.fire(levelHit.point.clone().addScaledVector(n, 0.05), 3);
    else {
      if (!levelHit.object.userData.noHole && !levelHit.object.userData.dyn && !findProp(levelHit.object)) effects.hole(levelHit.point, n);
      effects.dust(levelHit.point.clone().addScaledVector(n, 0.03), 3);
      if (primary) effects.impact(levelHit.point.clone().addScaledVector(n, 0.05));
    }
  }
  return best;
}

function applyHit(e, part, point, w, sound, dir) {
  const head = part === 'head' && e.type !== 'bot';
  let amt = head ? (w.dmg * w.headMult * M.head) / 3 : w.dmg;
  amt *= M.dmg * wlv(w.id).dmg * (w.melee ? M.meleeDmg : 1);
  if (e.hp >= e.maxHp) amt *= M.firstStrike;
  else if (e.hp < e.maxHp * 0.3) amt *= M.exec;
  if (e.def.boss) amt *= M.boss;
  if (M.lowHpDmg && P.hp < M.maxHp / 2) amt *= 1 + M.lowHpDmg; // Bloodlust
  if (M.crit && Math.random() < M.crit) { amt *= 2; popText(point.clone().add(new THREE.Vector3(0, 0.3, 0)), 'CRIT!', '#ffe040'); } // Eyestalks
  const TW = G.twist;
  if (TW && TW.headOnly) amt *= head ? 1.5 : 0.25;
  if (TW && TW.meleeOnly && !w.melee) amt *= 0.5;
  if (devOn('onehit')) amt = 1e5;
  e.damage(amt, part, point);
  if (M.burn && e.alive && !w.burn) { e.burnT = 3; e.burnDps = Math.max(e.burnDps || 0, M.burn); }
  if (M.freezeChance && e.alive && Math.random() < M.freezeChance) { e.slowT = 2; effects.ice(point, 5); }
  if (M.explodeChance && !w.explode && Math.random() < M.explodeChance) perkBlast(point);
  if (w.burn) { e.burnT = 3; e.burnDps = w.burn; }
  if (w.freeze) { e.slowT = w.freeze; effects.ice(point, 6); }
  if (w.knock && e.alive && !e.def.boss && area) {
    e.pos.addScaledVector(dir.clone().setY(0).normalize(), w.knock); // negative knock = pull toward you
    e.pos.z = clamp(e.pos.z, area.room.zf + 0.6, G.roam ? area.room.z0 - 0.6 : G.camPos.z - 1.4); e.pos.x = clamp(e.pos.x, -3, 3);
  }
  if (w.leech) { healP(w.leech); effects.emit(point, 3, 'ice', 1); }
  if (w.execute && e.alive && !e.def.boss && e.hp < e.maxHp * w.execute) { e.damage(1e5, 'head', point, true); popText(point.clone().add(new THREE.Vector3(0, 0.4, 0)), 'TERMINATED', '#ff4060'); }
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
  for (const { o, c } of others) { effects.lightning(prev, c, w.tracer || 0x80e0ff); o.damage(w.dmg * 0.8 * M.dmg * wlv(w.id).dmg, 'body', c); prev = c; }
}

// Explosive Rounds perk: a small blast at the hit point
function perkBlast(at) {
  effects.explosion(at, 1.1); sfx.explode();
  for (const e of G.enemies) {
    if (!e.alive || e.state === 'dormant') continue;
    const c = e.centerWorld(V3());
    if (c.distanceTo(at) < 1.4) e.damage(1.5 * M.dmg, 'body', c, true);
  }
}

function explode(at, w) {
  if (w.pull) { spawnBlackHole(at, w); return 'body'; }
  blastProps(at, w.explode, w.dmg);
  sfx.explode();
  shake = Math.min(1, shake + 0.6);
  effects.explosion(at, w.explode);
  let hit = null;
  for (const e of G.enemies) {
    if (!e.alive || e.state === 'dormant') continue;
    const c = e.centerWorld(V3());
    const d = c.distanceTo(at);
    if (d < w.explode + 0.3) { e.damage(w.dmg * M.dmg * wlv(w.id).dmg * (e.def.boss ? M.boss : 1) * (1 - Math.min(1, d / w.explode) * 0.6), 'body', c); hit = 'body'; }
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
// PC: the mouse is captured (pointer lock) during play and moves a virtual crosshair, so the
// MOUSE SPEED and GUN WEIGHT settings can scale it. Without capture it follows the system cursor.
let lockLostT = 0;
const locked = () => document.pointerLockElement === gameEl;
const inPlay = () => mode !== 'title' && mode !== 'cutscene' && mode !== 'floorclear' && mode !== 'dead' && !paused && !choiceOpen;
function wantLock() {
  if (!PC || (!settings.lock && !G.roam) || locked() || !inPlay()) return; // Free Roam always captures the mouse to look around
  try { const r = gameEl.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch { /* not supported */ }
}
document.addEventListener('pointerlockchange', () => {
  // Esc releases the capture in the browser before our key handler sees it: treat that as pause
  if (!locked() && inPlay() && mode !== 'win') { lockLostT = performance.now(); togglePause(); }
});
function moveAim(dx, dy) {
  const r = canvasRect();
  const k = SENS_MULT[settings.sens ?? 2] * (settings.weight ? aimSpeed(cur()) : 1);
  if (roamLooking()) { // Free Roam: the mouse turns your head; the crosshair stays in the middle
    yaw -= dx * k * 0.0024; pitch = clamp(pitch - dy * k * 0.0024, BASE_PITCH - 1.15, BASE_PITCH + 1.05);
    mouse = { x: r.width / 2, y: r.height / 2 }; return;
  }
  mouse = mouse || { x: r.width / 2, y: r.height / 2 };
  mouse.x = clamp(mouse.x + dx * k, 0, r.width); mouse.y = clamp(mouse.y + dy * k, 0, r.height);
}
gameEl.addEventListener('pointerdown', (ev) => {
  if (cutscene) return;
  if (ev.target.closest('button') || ev.target.closest('.screen')) return;
  initAudio();
  if (ev.pointerType === 'mouse' && ev.button === 2) { if (hasWatch() && mode === 'combat') useWatch(); else startReload(); ev.preventDefault(); return; }
  if (ev.pointerType === 'mouse' && ev.button !== 0) return;
  let { x, y } = localXY(ev);
  if (PC && ev.pointerType === 'mouse') {
    if (locked() && mouse) {
      x = mouse.x; y = mouse.y;
    } else { mouse = { x, y }; wantLock(); }
  }
  hold = { id: ev.pointerId, x, y };
  tryFire(x, y);
  ev.preventDefault();
});
gameEl.addEventListener('pointermove', (ev) => {
  if (ev.pointerType === 'mouse' && PC && !locked() && roamLooking() && (ev.movementX || ev.movementY)) { moveAim(ev.movementX, ev.movementY); return; }
  if (ev.pointerType === 'mouse' && PC && locked()) {
    // some browsers report a bogus jump on the first events after capture: ignore spikes
    if (Math.abs(ev.movementX) < 250 && Math.abs(ev.movementY) < 250) moveAim(ev.movementX, ev.movementY);
    return;
  }
  const p = localXY(ev);
  if (ev.pointerType === 'mouse') mouse = p;
  if (hold && hold.id === ev.pointerId) { hold.x = p.x; hold.y = p.y; }
});
gameEl.addEventListener('pointerleave', (ev) => { if (ev.pointerType === 'mouse' && !locked()) { mouse = null; hold = null; } });
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
  if (cutscene) return;
  if (e.key === 'r' || e.key === 'R') startReload();
  const k = e.key.toLowerCase();
  if (G.roam && ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { e.preventDefault(); roamKeys.add(k); }
  else if (k === 's' || k === 'arrowdown') { e.preventDefault(); duck(); }
  if (G.roam && (k === 'c' || k === 'control' || k === ' ')) { e.preventDefault(); duck(); }
  if (e.key === 'q' || e.key === 'Q' || e.key === 'Tab') { e.preventDefault(); swapWeapon(); }
  if ((e.key === 'Escape' && performance.now() - lockLostT > 400) || e.key === 'p' || e.key === 'P') togglePause();
  if (e.key === 'e' || e.key === 'E') swapWeapon();
  if (['1', '2', '3'].includes(e.key) && !choiceOpen && mode !== 'title') { const i = +e.key - 1; if (i < P.inv.length && i !== P.slot) { equip(i); toast(cur().name, RARITY[cur().rarity].color); } }
  if (e.key === 'f' || e.key === 'F') { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch { /* ignore */ } }
  if (e.key === 'm' || e.key === 'M') { setMuted(!isMuted()); toast(isMuted() ? 'SOUND OFF' : 'SOUND ON'); }
  if (e.key === 'Enter' && mode === 'title') $('startBtn').click();
});

window.addEventListener('keyup', (e) => roamKeys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => roamKeys.clear());
// mobile joysticks: move (left) and look (right)
for (const [id, st] of [['roamStick', roamStick], ['lookStick', lookStick]]) {
  const pad = $(id), knob = pad.querySelector('i');
  let pid = null;
  const move = (ev) => {
    const r = pad.getBoundingClientRect(), R = r.width / 2;
    let x = (ev.clientX - r.left - R) / R, y = (ev.clientY - r.top - R) / R; const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    st.x = x; st.y = y; knob.style.transform = `translate(${x * R * 0.6}px, ${y * R * 0.6}px)`;
  };
  pad.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); ev.preventDefault(); pid = ev.pointerId; pad.setPointerCapture(pid); move(ev); });
  pad.addEventListener('pointermove', (ev) => { if (ev.pointerId === pid) move(ev); });
  const up = (ev) => { if (ev.pointerId !== pid) return; pid = null; st.x = st.y = 0; knob.style.transform = ''; };
  pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up);
}
const onBtn = (id, fn) => $(id).addEventListener('click', (e) => { e.stopPropagation(); initAudio(); fn(); });
const launchRun = () => { sfx.tap(); fade(1, 0.3); setTimeout(() => startGame(startFloorFor(runMode)), 320); };
// with more than one employee unlocked, pick who starts the run
// a new run: pick a difficulty, then (with more than one employee unlocked) who starts it
function setRunMode(m, dkey) {
  runMode = m;
  daily = m === 'daily' ? dailySetup(dkey || todayKey()) : null;
  G.mod = daily ? daily.mod.id : null; G.twist = daily ? daily.mod : null;
}
const startFloorFor = (m) => (m === 'daily' ? daily.start : m === 'rush' ? RUSH_FLOORS[0] : 1);
const newRun = () => {
  ui.title.classList.add('hidden');
  openModeSelect((m) => {
    setRunMode(m);
    if (m === 'daily') { launchRun(); return; }
    openDiffSelect(DIFFS, () => { if (unlockedCount() > 1) openCharSelect(() => launchRun()); else launchRun(); });
  });
};
function openModeSelect(onPick) {
  const box = $('modeList'); box.innerHTML = '';
  { // New Game+ switch (once Story has been beaten)
    const row = document.createElement('div'); row.className = 'hq-row ngp-row' + (ngpUnlocked() ? '' : ' dim');
    row.innerHTML = `<div class="hq-info"><b style="color:#ff4040">NEW GAME+</b><span>Tougher enemies, six new enemies, six new weapons, ten NIGHTMARE floors, more SUPER enemies, +50% cash (OVERTIME PAY), a darker soundtrack and its own ending. Every NG+ you beat raises the NG+ level (up to 5). Works with every mode except the Daily.</span>${ngpUnlocked() ? `<small style="color:#ff8070">NG+ LEVEL ${Math.min(5, profile.ngpLevel || 1)}</small>` : ''}${ngpUnlocked() ? '' : `<small class="req">UNLOCK: BEAT STORY ON EASY, MEDIUM, HARD AND EXTRA HARD (${endingsDone()}/4)</small>`}</div>`;
    const b = document.createElement('button'); b.className = 'hq-buy' + (ngpUnlocked() ? (profile.ngp ? ' on' : '') : ' off');
    b.textContent = ngpUnlocked() ? (profile.ngp ? 'ON' : 'OFF') : 'LOCKED';
    b.addEventListener('click', (e) => { e.stopPropagation(); if (!ngpUnlocked()) { sfx.empty(); return; } sfx.tap(); profile.ngp = !profile.ngp; flushProfile(true); titleNgp(); openModeSelect(onPick); });
    row.append(b); box.append(row);
  }
  { // FREE ROAM add-on (100% completion)
    const un = roamUnlocked();
    const row = document.createElement('div'); row.className = 'hq-row roam-row' + (un ? '' : ' dim');
    row.innerHTML = `<div class="hq-info"><b style="color:#60ff80">FREE ROAM ADD-ON</b><span>Walk around the room during fights instead of standing in one spot. ${PC ? 'WASD / arrow keys to move, C / Ctrl / Space to duck.' : 'Move with the joystick on the left.'} Works with every mode.</span>${un ? '' : `<small class="req">UNLOCK: BEAT STORY ON EASY, MEDIUM, HARD AND EXTRA HARD (${endingsDone()}/4)</small>`}</div>`;
    const b = document.createElement('button'); b.className = 'hq-buy' + (un ? (profile.roam ? ' on' : '') : ' off');
    b.textContent = un ? (profile.roam ? 'ON' : 'OFF') : 'LOCKED';
    b.addEventListener('click', (e) => { e.stopPropagation(); if (!un) { sfx.empty(); return; } sfx.tap(); profile.roam = !profile.roam; flushProfile(true); openModeSelect(onPick); });
    row.append(b); box.append(row);
  }
  for (const m of MODES) {
    const open = modeOpen(m, profile);
    const row = document.createElement('div'); row.className = 'hq-row' + (open ? '' : ' dim');
    let extra = '';
    const rec = profile.records || {};
    if (m.id === 'daily') { const d = dailySetup(); extra = `<small style="color:#60ff80">TODAY: ${d.mod.name} · ${d.mod.desc} FLOORS ${d.start}-${d.end}${rec.daily && rec.daily[d.key] ? ' · BEST ' + rec.daily[d.key] : ''}</small>`; }
    if (m.id === 'endless' && rec.endless && rec.endless[0]) extra = `<small>BEST: FLOOR ${rec.endless[0].floor}</small>`;
    if (m.id === 'rush' && rec.rush && rec.rush[0]) extra = `<small>BEST: ${rec.rush[0].bosses}/10 BOSSES · ${fmtTime(rec.rush[0].time)}</small>`;
    if (m.id === 'story' && rec.story && rec.story[0]) extra = `<small>BEST: ${rec.story[0].score} PTS · FLOOR ${rec.story[0].floor}</small>`;
    row.innerHTML = `<div class="hq-info"><b style="color:${m.color}">${m.name}</b><span>${m.desc}</span>${extra}${open ? '' : `<small class="req">UNLOCK: ${m.lock.text}</small>`}</div>`;
    const b = document.createElement('button'); b.className = 'hq-buy' + (open ? '' : ' off'); b.textContent = open ? 'PLAY' : 'LOCKED';
    b.addEventListener('click', (e) => { e.stopPropagation(); if (!open) { sfx.empty(); return; } sfx.tap(); $('modeSelect').classList.add('hidden'); onPick(m.id); });
    row.append(b); box.append(row);
  }
  $('modeSelect').classList.remove('hidden');
}
// continuing: you may swap to a different employee for the rest of the run
const resumeRun = (sv) => { sfx.tap(); fade(1, 0.3); setTimeout(() => continueRun(sv), 320); };
onBtn('hqBtn', () => { sfx.tap(); ui.title.classList.add('hidden'); openHQ(); });
onBtn('hqBack', () => { sfx.tap(); closeHQ(); toTitle(); });
onBtn('charBack', () => { sfx.tap(); $('charSelect').classList.add('hidden'); showScreen(ui.title); });
onBtn('startBtn', () => {
  const sv = loadRun();
  if (sv) askConfirm(`START A NEW RUN?\nYOUR FLOOR ${sv.floor} SAVE WILL BE LOST.`, () => { clearRun(); newRun(); }, ui.title);
  else newRun();
});
onBtn('continueBtn', () => {
  const sv = loadRun(); if (!sv) return;
  if (unlockedCount() > 1) {
    sfx.tap(); ui.title.classList.add('hidden');
    profile.char = sv.char || 'temp';
    openCharSelect((ch) => resumeRun(switchChar(sv, ch.id)), `CONTINUE FLOOR ${sv.floor} AS...`);
  } else resumeRun(sv);
});
onBtn('modeBack', () => { sfx.tap(); $('modeSelect').classList.add('hidden'); showScreen(ui.title); });
onBtn('keepBtn', () => { sfx.tap(); runMode = 'endless'; hideScreens(); nextFloor(); });
onBtn('diffBack', () => { sfx.tap(); $('diffSelect').classList.add('hidden'); showScreen(ui.title); });
onBtn('settingsBtn', () => openSettings(ui.title));
onBtn('pSettingsBtn', () => openSettings(ui.pause));
onBtn('restartBtn', () => askConfirm('RESTART THIS FLOOR?', () => { paused = false; restartFloor(); }, ui.pause));
onBtn('settingsBack', closeSettings);
onBtn('confirmYes', () => { const fn = confirmFn; closeConfirm(false); fn && fn(); });
onBtn('confirmNo', () => closeConfirm(true));
onBtn('tutSkip', () => { sfx.tap(); if (tutorial) tutorial.finish(); });
onBtn('reloadBtn', startReload);
onBtn('duckBtn', duck);
$('rewindBtn').addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); initAudio(); useWatch(); });
onBtn('weaponBtn', swapWeapon);
onBtn('pauseBtn', togglePause);
onBtn('resumeBtn', togglePause);
onBtn('quitBtn', () => { paused = false; toTitle(); }); // the run stays saved at the start of this floor
onBtn('nextBtn', () => { sfx.tap(); if (perkOffer && perkOffer.length) openPerks(); else nextFloor(); });
onBtn('perkReroll', () => { if (rerolls <= 0) return; rerolls--; sfx.reload(); perkOffer = mutating() ? rollMutations(mutLv, M.perkChoices) : rollPerks(perkLv, M.perkChoices); openPerks(); });
onBtn('retryBtn', () => restartFloor());
onBtn('menuBtn', toTitle);
onBtn('gcLeave', () => { sfx.tap(); openChoice(); });
onBtn('winBtn', toTitle);
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'combat' && !paused && !cutscene) togglePause(); });

// duck: a quick crouch that lets shots fly over your head (S / down arrow / DUCK button)
function duck() {
  if (P.duckCd > 0 || mode !== 'combat' || paused || M.noDuck) return;
  stat('ducks'); P.duckT = 0.75; P.duckCd = 1.1 * (M.duckCd || 1); sfx.swing && sfx.swing();
}

function togglePause() {
  if (choiceOpen || settingsOpen || confirmOpen || devOpen()) return;
  if (mode === 'title' || mode === 'floorclear' || mode === 'dead') return;
  paused = !paused;
  ui.pause.classList.toggle('hidden', !paused);
  if (paused) $('pausePerks').innerHTML = `<div class="diffTag">${MODE[runMode].name} · DIFFICULTY: <span style="color:${D.color}">${D.name}</span></div>` + (runMode === 'daily' && daily ? `<div class="diffTag" style="color:#60ff80">TODAY: ${daily.mod.name} · ${daily.mod.desc}</div>` : '') + perkSummary();
  setMusic(paused ? 'off' : mode === 'combat' ? 'combat' : 'calm');
}

// ------------------------------------------------------------------ achievements
let flushT = 2, achT = 0;
const achQueue = [];
function checkAch(extra = {}) {
  const run = { maxCombo: runMaxCombo, perkCount: Object.values(perkLv).reduce((a, b) => a + b, 0), mutCount: Object.values(mutLv || {}).reduce((a, b) => a + b, 0), diff: runDiff, floor: G.floorNum, ngp: G.ngp, ...extra };
  for (const a of ACHIEVEMENTS) {
    if (profile.ach[a.id]) continue;
    let ok = false;
    try { ok = a.test(profile, run, allUnlocked); } catch { ok = false; }
    if (ok) { profile.ach[a.id] = Date.now(); addCash(a.reward); touch(); achQueue.push(a); }
  }
}
function showAch(a) {
  achT = 3.2;
  const el = $('achPop');
  el.innerHTML = `<small>ACHIEVEMENT UNLOCKED</small><b>${a.name}</b><span>${a.desc} · +${money(a.reward)}</span>`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  sfx.pickup();
}

// ------------------------------------------------------------------ perks
function perkSummary() {
  const ids = Object.keys(perkLv).filter((k) => perkLv[k] > 0);
  const mids = Object.keys(mutLv).filter((k) => mutLv[k] > 0 && MUTATION[k]);
  const mt = mids.length ? '<div class="mutList">MUTATIONS: ' + mids.map((k) => `<span title="${MUTATION[k].up} / ${MUTATION[k].down}">${MUTATION[k].name}${mutLv[k] > 1 ? ' x' + mutLv[k] : ''}</span>`).join(' · ') + '</div>' : '';
  if (!ids.length) return mt;
  return mt + 'PERKS: ' + ids.map((k) => `<span style="color:${PERK_RARITY[PERK[k].rarity].color}">${PERK[k].name}${perkLv[k] > 1 ? ' x' + perkLv[k] : ''}</span>`).join(' · ');
}
function openPerks() {
  ui.floorClear.classList.add('hidden');
  const box = $('perkCards'); box.innerHTML = '';
  const mut = mutating();
  $('perkTitle').textContent = mut ? 'CHOOSE A MUTATION' : 'CHOOSE A PERK';
  $('perkTag').textContent = mut ? 'THE SUPPLEMENT IS CHANGING YOU. EVERY GIFT HAS A PRICE.' : 'IT LASTS FOR THE REST OF THE RUN';
  for (const id of perkOffer) {
    if (mut) {
      const m = MUTATION[id], lv = (mutLv[id] || 0) + 1;
      const b = document.createElement('button');
      b.className = 'perkCard mutCard';
      b.innerHTML = `<div class="pk-top"><span class="pk-cat">MUTATION</span><span class="pk-rar" style="color:#c060ff">${m.max > 1 ? lv + '/' + m.max : 'ONCE'}</span></div>`
        + `<div class="pk-name" style="color:#d080ff">${m.name}</div><div class="pk-desc mut-up">+ ${m.up}</div><div class="pk-desc mut-down">− ${m.down}</div>`;
      b.addEventListener('click', (e) => { e.stopPropagation(); takePerk(id); });
      box.append(b);
      continue;
    }
    const p = PERK[id], lv = (perkLv[id] || 0) + 1, r = PERK_RARITY[p.rarity];
    const b = document.createElement('button');
    b.className = 'perkCard'; b.style.borderColor = r.color;
    b.innerHTML = `<div class="pk-top"><span class="pk-cat">${p.cat}</span><span class="pk-rar" style="color:${r.color}">${r.name}</span></div>`
      + `<div class="pk-name" style="color:${r.color}">${p.name}${p.max > 1 ? ` <small>${lv}/${p.max}</small>` : ''}</div><div class="pk-desc">${p.desc(lv)}</div>`;
    b.addEventListener('click', (e) => { e.stopPropagation(); takePerk(id); });
    box.append(b);
  }
  $('perkReroll').textContent = `REROLL (${rerolls})`;
  $('perkReroll').classList.toggle('hidden', rerolls <= 0);
  $('perkOwned').innerHTML = perkSummary();
  showScreen(ui.perks);
}
function takePerk(id) {
  const before = M.maxHp;
  if (mutating() && MUTATION[id]) { mutLv[id] = (mutLv[id] || 0) + 1; stat('mutations'); post.u.flash.value = 0.4; post.u.flashCol.value.set(0xa040ff); }
  else perkLv[id] = (perkLv[id] || 0) + 1;
  recalc(); stat('perksTaken'); checkAch();
  if (M.maxHp > before) P.hp += M.maxHp - before; // new max health arrives filled
  P.hp = Math.min(P.hp, M.maxHp);
  for (const s2 of P.inv) s2.ammo = magOf(GUN[s2.id]);
  sfx.unlock();
  toast(MUTATION[id] && mutating() ? 'MUTATED: ' + MUTATION[id].name : PERK[id].name, MUTATION[id] && mutating() ? '#d080ff' : PERK_RARITY[PERK[id].rarity].color);
  perkOffer = null;
  ui.perks.classList.add('hidden');
  nextFloor();
}

// ------------------------------------------------------------------ settings, confirm, restart, tutorial
let settingsOpen = false, settingsFrom = null, confirmOpen = false, confirmFn = null, confirmFrom = null;
let tutorial = null, tutorialPending = false;

function buildSettings() {
  const rows = $('settingsRows'); rows.innerHTML = '';
  for (const it of SCHEMA) {
    if ((it.mobileOnly && PC) || (it.pcOnly && !PC) || (it.dev && !DEV_BUILD)) continue;
    const row = document.createElement('div'); row.className = 'setRow';
    row.innerHTML = `<div class="setLbl">${it.label}${it.hint ? `<small>${it.hint}</small>` : ''}</div>`;
    const ctl = document.createElement('div'); ctl.className = 'setCtl';
    if (it.type === 'range') {
      const r = document.createElement('input'); r.type = 'range'; r.min = 0; r.max = 100; r.step = 5; r.value = settings[it.key];
      const v = document.createElement('span'); v.className = 'setVal'; v.textContent = settings[it.key];
      r.addEventListener('input', () => { v.textContent = r.value; setSetting(it.key, +r.value); });
      r.addEventListener('change', () => sfx.tap());
      ctl.append(r, v);
    } else if (it.type === 'choice') {
      it.options.forEach((o, i) => {
        const b = document.createElement('button'); b.className = 'seg' + (settings[it.key] === i ? ' on' : ''); b.textContent = o;
        b.addEventListener('click', (e) => { e.stopPropagation(); sfx.tap(); setSetting(it.key, i); buildSettings(); });
        ctl.append(b);
      });
    } else if (it.type === 'action') {
      const b = document.createElement('button'); b.className = 'seg'; b.textContent = tutorialDone() ? it.text : 'WILL PLAY';
      b.addEventListener('click', (e) => { e.stopPropagation(); sfx.tap(); setTutorialDone(false); buildSettings(); });
      ctl.append(b);
    }
    row.append(ctl); rows.append(row);
  }
}
function openSettings(from) {
  sfx.tap(); settingsOpen = true; settingsFrom = from;
  from.classList.add('hidden'); buildSettings(); showScreen(ui.settings);
}
function closeSettings() {
  sfx.tap(); settingsOpen = false; ui.settings.classList.add('hidden');
  if (settingsFrom) showScreen(settingsFrom);
}
function askConfirm(text, fn, from) {
  confirmOpen = true; confirmFn = fn; confirmFrom = from;
  $('confirmText').textContent = text; from.classList.add('hidden'); showScreen(ui.confirm);
}
function closeConfirm(back) {
  confirmOpen = false; ui.confirm.classList.add('hidden');
  if (back && confirmFrom) showScreen(confirmFrom);
}
function restartFloor() {
  // replay the current floor from its autosave (same version of the floor, full health)
  const sv = loadRun();
  if (sv && sv.floor === G.floorNum) continueRun(sv, true);
  else { score = floorStartScore; startGame(G.floorNum, true); }
}

onSettingsChange((s, key) => {
  setVolumes(s.music / 100, s.sfx / 100);
  effects.mult = FX_MULT[s.gfx];
  effects.gore = s.gore ?? 2;
  post.enabled = s.post !== 0;
  post.u.useBloom.value = s.gfx > 0 ? 1 : 0;
  post.u.retro.value = [0, 0.35, 1][s.retro ?? 1];
  post.u.scan.value = [0, 0, 1][s.retro ?? 1];
  if (!post.enabled) post.u.dissolve.value = 0;
  document.body.classList.toggle('lefty', !PC && s.lefty === 1);
  if (key === 'dev') refreshDevUi();
  if (!key || key === 'gfx' || key === 'lefty') resize();
});

const tutCtx = {
  PC, G, P, sfx,
  stats: () => stats,
  spawn(type, x, d, passive) {
    const room = area.room, spot = { x, z: room.z0 - d, cover: false };
    const e = new Enemy(G, type, spot, { active: true });
    if (passive) e.atkT = 9999;
    effects.dust(e.pos.clone().setY(0.1), 10);
    G.enemies.push(e);
    return e;
  },
  dropGun(x, d, id) { return dropGun(new THREE.Vector3(x, 0, area.room.z0 - d), id); },
  hint(text, i, n) {
    ui.tutHint.classList.toggle('hidden', !text);
    if (text) ui.tutHint.innerHTML = `<small>TUTORIAL ${i}/${n}</small>${text}`;
  },
  ring(pos) {
    if (!pos) { ui.tutRing.classList.add('hidden'); return; }
    const sp = toScreen(pos, canvasRect());
    ui.tutRing.classList.toggle('hidden', sp.behind);
    ui.tutRing.style.left = `${sp.x - 26}px`; ui.tutRing.style.top = `${sp.y - 26}px`;
  },
  toast: (t, c) => toast(t, c),
  finish() {
    setTutorialDone(true);
    ui.tutSkip.classList.add('hidden');
    if (area && area.tutorial) {
      area.tutorial = false;
      for (const e of G.enemies) if (e.alive && e.atkT > 100) e.atkT = 1; // passive dummies wake up
    }
    P.hp = M.maxHp;
    toast('TUTORIAL COMPLETE', '#f0c860');
  },
};
function endTutorial(silent) {
  if (tutorial && !tutorial.done) { tutorial.done = true; }
  tutorial = null; tutorialPending = false;
  ui.tutHint.classList.add('hidden'); ui.tutRing.classList.add('hidden'); ui.tutSkip.classList.add('hidden');
}

// ------------------------------------------------------------------ HUD
const hudCache = {};
function setText(el, key, v) { if (hudCache[key] !== v) { hudCache[key] = v; el.textContent = v; return true; } return false; }
function updateHud(force) {
  if (force) for (const k in hudCache) delete hudCache[k];
  setText(ui.floor, 'f', runMode === 'rush' ? 'BOSS RUSH' : `FLOOR ${String(G.floorNum).padStart(2, '0')}`);
  if (G.floor) setText(ui.area, 'a', runMode === 'rush' ? `BOSS ${rushIdx + 1}/10 · ${fmtTime(rushTime)}` : runMode === 'daily' && daily ? `DAILY ${G.floorNum - daily.start + 1}/8` : `AREA ${Math.min(G.roomIdx + 1, G.floor.rooms.length)}/${G.floor.rooms.length}`);
  setText(ui.score, 's', String(score).padStart(6, '0'));
  setText(ui.cash, 'cash', money(profile.cash));
  setText(ui.combo, 'c', combo > 1 && now - lastKill < M.comboWindow ? `x${combo} COMBO` : '');
  setText(ui.hp, 'h', String(Math.ceil(P.hp)));
  setText(ui.ammo, 'am', cur().spirit ? (spiritGauge() >= 1 ? 'READY' : `${Math.floor(spiritGauge() * 100)}%`) : cur().watch ? (watchUsed ? 'USED' : 'READY') : cur().melee ? '∞' : String(curSlot().ammo));
  setText(ui.reload, 'r', cur().spirit ? (spiritGauge() >= 1 ? 'R: OVERDRIVE' : spiritState()) : cur().watch ? (PC ? 'RIGHT CLICK: REWIND' : 'REWIND') : P.reloadT > 0 ? 'RELOADING' : 'AMMO');
  ui.hp.classList.toggle('low', P.hp <= M.maxHp * 0.25);
  { const rb = $('rewindBtn'); const show = !PC && hasWatch() && (mode === 'combat' || mode === 'moving'); rb.classList.toggle('hidden', !show); rb.classList.toggle('used', watchUsed); }
  ui.ammo.classList.toggle('low', !cur().melee && !cur().spirit && !cur().watch && curSlot().ammo <= Math.ceil(magOf(cur()) * 0.25));
  ui.reload.classList.toggle('reloading', P.reloadT > 0);
  if (setText(ui.weapon, 'w', cur().short)) ui.weapon.style.color = RARITY[cur().rarity].color;
  setText(ui.slotLbl, 'sl', `SWAP ${P.slot + 1}/${P.inv.length}`);
  if (area?.boss && area.boss.alive) {
    const b = area.boss;
    ui.bossFill.style.width = `${Math.max(0, (b.hp / b.maxHp) * 100)}%`;
    let st, col;
    if (bossMsgT > 0) { st = bossMsgText; col = '#ffd060'; }
    else if (b.brain) {
      const v = b.brain.vulnerableNow();
      st = b.brain.shield > 0 ? `SHIELD ${Math.ceil(b.brain.shield)}` : v ? 'VULNERABLE' : 'IMMUNE';
      col = b.brain.shield > 0 ? '#60c0ff' : v ? '#60ff80' : '#9aa4b0';
    } else { st = ''; col = '#fff'; }
    setText(ui.bossState, 'bs', st); ui.bossState.style.color = col;
  }
}

// ------------------------------------------------------------------ resize
function resize() {
  const r = gameEl.getBoundingClientRect();
  const H = Math.min((PC ? RES_PC : RES_MOBILE)[settings.gfx] ?? 340, Math.round(r.height));
  const W = Math.max(1, Math.round(r.width * (H / r.height)));
  renderer.setSize(W, H, false); post.setSize(W, H);
  camera.aspect = W / H; camera.updateProjectionMatrix();
  G.viewHalfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect; // enemies stay inside this
  gunCam.aspect = W / H; gunCam.updateProjectionMatrix();
  const d = 0.55, hh = d * Math.tan(THREE.MathUtils.degToRad(gunCam.fov / 2)), hw = hh * gunCam.aspect;
  const lefty = !PC && settings.lefty === 1;
  gunBase.set((PC ? hw * 0.3 : hw * 0.55) * (lefty ? -1 : 1), -hh * (PC ? 0.7 : 0.74), -d);
  gunRoot.scale.set(lefty ? -0.62 : 0.62, 0.62, 0.62);
}
window.addEventListener('resize', resize);
resize();

// ------------------------------------------------------------------ loop
function applyCamera() {
  const s = shake * shake * 0.08 * (settings.shake ? 1 : 0);
  camera.position.set(G.camPos.x + (Math.random() - 0.5) * s, G.camPos.y - G.duck * 0.65 + (Math.random() - 0.5) * s, G.camPos.z);
  const breathe = mode === 'combat' ? Math.sin(now * 1.3) * 0.006 : 0;
  P.punch = Math.max(0, (P.punch || 0) - 0.016 * 0.4 - P.punch * 0.12);
  camera.rotation.set(pitch + breathe + (P.punch || 0) + (Math.random() - 0.5) * s * 0.5, yaw, roll + worldRoll, 'YXZ');
}

function updateGun(dt) {
  P.recoil = Math.max(0, P.recoil - dt * 7);
  if (PC && mouse) aimGunAt(mouse.x, mouse.y); // gun tracks the cursor
  else { P.aimTY *= Math.pow(0.02, dt); P.aimTP *= Math.pow(0.02, dt); }
  P.aimYaw += (P.aimTY - P.aimYaw) * Math.min(1, dt * 25);
  P.aimPitch += (P.aimTP - P.aimPitch) * Math.min(1, dt * 25);
  P.swapT = Math.max(0, P.swapT - dt * 3);
  let ry = (!PC && settings.lefty === 1 ? -0.16 : 0.16) + P.aimYaw, rx = P.aimPitch + P.recoil * 0.22, rz = 0;
  let sx = 0, sy = 0, sz = 0;
  swingPivot.rotation.set(0, 0, 0);
  if (P.swing > 0) {
    // melee swing: quick strike (the hit lands on click), then a slower follow-through and recovery
    P.swing = Math.max(0, P.swing - dt / (P.swingDur || 0.3));
    const t = 1 - P.swing, style = viewModel(cur().id).style, d = P.swingDir || 1;
    const out = (a, b, x) => clamp((x - a) / (b - a), 0, 1);
    const strike = 1 - Math.pow(1 - out(0.04, 0.3, t), 3);             // fast ease-out
    const back = out(0.5, 1, t), settle = back * back * (3 - 2 * back);  // smooth return
    const lift = Math.sin(out(0, 0.08, t) * Math.PI / 2);                // tiny wind-up
    if (style === 'saw') {
      const k = strike * (1 - settle);
      rx += Math.sin(now * 60) * 0.02; ry += Math.sin(now * 47) * 0.02; sz -= k * 0.08;
    } else if (style === 'chop') {
      // overhead chop: raised, then driven down and in toward the centre of the screen
      setPivot(ELBOW);
      const k = strike * (1 - settle);
      const a = (lift * 0.4) * (1 - strike) - 0.42 * k;
      swingPivot.rotation.set(a, k * 0.2, k * 0.45, 'YXZ');
      sx -= k * 0.09; sy += k * 0.03;
    } else {
      // diagonal slash from one side to the other, alternating each swing
      setPivot(SHOULDER);
      const a = d > 0 ? 1 : -1, w = (1 - settle);
      const sweep = (-0.55 + 1.3 * strike) * a * w;
      swingPivot.rotation.set((0.12 - 0.35 * strike) * w, sweep, -sweep * 0.9, 'YXZ');
    }
  }
  let px = gunBase.x + sx, py = gunBase.y - P.swapT * 0.3 + sy, pz = gunBase.z + P.recoil * 0.05 + sz;
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
  if (md.hands) { md.hands[0].rotation.z = -now * 2; md.hands[1].rotation.z = -now * 0.3; } // the Golden Watch ticks
  if (P.pump > 0) { P.pump = Math.max(0, P.pump - dt * 2.2); if (md.pump) md.pump.position.z = md.pumpZ + Math.sin(P.pump * Math.PI) * 0.1; }
  muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 80);
  if (md.flash.visible) { md.flash.updateMatrixWorld(); md.flash.getWorldPosition(gunFlash.position); gunFlash.color.copy(md.flash.material.color.getHex() === 0xffffff ? new THREE.Color(0xffc070) : md.flash.material.color); gunFlash.intensity = 4; }
  else gunFlash.intensity = Math.max(0, gunFlash.intensity - dt * 60);
}

function update(dt) {
  now += dt;
  stepSeq(dt);
  if (G.floor) {
    G.floor.update(dt);
    for (const el of G.floor.elevators) if (el.closeAt && now > el.closeAt) { el.target = 0; el.closeAt = 0; }
  }
  roamUpdate(dt);
  propBoxT -= dt; if (propBoxT <= 0) { propBoxT = 0.25; refreshPropBoxes(); }
  if (mode === 'combat') { stats.t += dt; if (runMode === 'rush' && !paused) rushTime += dt; }

  const peace = devOn('peace');
  const tStop = rewinding; // THE GOLDEN WATCH: the world is frozen while the tape rewinds
  if (!tStop) for (const e of G.enemies) { if (e.off) continue; G.actor = e; if (peace && e.atkState === 'cool') e.atkT = Math.max(e.atkT, 1); e.update(dt); }
  G.actor = null;
  G.enemies = G.enemies.filter((e) => e.alive || e === area?.boss);
  if (!tStop) for (const p of G.projectiles) if (!p.off) p.update(dt);
  G.projectiles = G.projectiles.filter((p) => p.alive);
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const p = G.pickups[i]; p.t += dt;
    p.spin.rotation.y += dt * 2; p.spin.position.y = (p.kind === 'gun' ? 0.45 : 0.25) + Math.sin(p.t * 3) * 0.06;
    if (p.collect) {
      p.ct += dt; p.mesh.position.lerp(G.camPos, Math.min(1, dt * 6)); p.mesh.scale.setScalar(Math.max(0.01, 1 - p.ct * 2));
      if (p.ct > 0.5) { scene.remove(p.mesh); G.pickups.splice(i, 1); }
    }
  }
  if (G.twist && G.twist.regen && mode === 'combat' && P.hp > 0) healP(G.twist.regen * dt);
  if (M.regen && mode === 'combat' && P.hp > 0) healP(M.regen * dt); // Gills
  P.duckT = Math.max(0, P.duckT - dt); P.duckCd = Math.max(0, P.duckCd - dt);
  G.duck += ((P.duckT > 0 ? 1 : 0) - G.duck) * Math.min(1, dt * 16);
  G.playerPos.copy(G.camPos); G.playerPos.y -= G.duck * 0.65;
  effects.update(dt);
  updateCorpses(dt);
  updateRide(dt);
  if (!tStop) { updateHoles(dt); updateProps(dt); }
  // ambient life: broken lights spark, vents steam, lab vats bubble, lightning on stormy nights
  if (G.room && G.floor && settings.gfx > 0) {
    for (const em of G.room.emitters || []) {
      em.t = (em.t ?? Math.random() * 3) - dt;
      if (em.t > 0) continue;
      if (em.type === 'spark') { em.t = rand(Math.random, 1.5, 5); effects.sparks(em.pos, 6); effects.light(em.pos, 0xfff0b0, 6, 4, 0.08); }
      else if (em.type === 'steam') { em.t = 0.12; effects.sprite(em.pos.clone().add(new THREE.Vector3(rand(Math.random, -0.1, 0.1), 0, 0)), { color: 0xd8d8d8, s0: 0.15, s1: 0.9, a: 0.35, life: 1.6, v: new THREE.Vector3(rand(Math.random, -0.2, 0.2), -0.5, rand(Math.random, -0.2, 0.2)) }); }
      else if (em.type === 'vapor') { em.t = 0.25; effects.sprite(em.pos.clone().add(new THREE.Vector3(rand(Math.random, -0.3, 0.3), 0, rand(Math.random, -0.3, 0.3))), { color: 0x80ff70, add: true, s0: 0.1, s1: 0.5, a: 0.3, life: 1.8, v: new THREE.Vector3(0, 0.35, 0) }); }
    }
    if (moodNow === 'night' && G.room.windows) {
      lightningT -= dt;
      if (lightningT <= 0) { lightningT = rand(Math.random, 7, 18); post.u.flash.value = 0.45; post.u.flashCol.value.set(0xc8d8ff); boltT = 0.12; }
    }
  }
  if (boltT > 0) { boltT -= dt; hemi.intensity = hemiBase * (boltT > 0 ? 3.5 : 1); }
  // lockdown floors: the room lights pulse like an alarm
  // the flashlight follows your aim on PC
  if (flashlight.intensity > 0) {
    let nx = 0, ny = -0.15;
    if (PC && mouse) { const r = canvasRect(); nx = (mouse.x / r.width) * 2 - 1; ny = -(mouse.y / r.height) * 2 + 1; }
    const th = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    flashlight.target.position.lerp(new THREE.Vector3(nx * th * camera.aspect * 5, ny * th * 5, -5), Math.min(1, dt * 12));
  }
  if (moodNow === 'emergency') for (const l of roomLights) l.intensity = roomBase * (0.55 + 0.45 * Math.abs(Math.sin(now * 2.4)));
  effects.updateMotes(G.camPos, dt, settings.gfx > 0);
  bossMsgT -= dt; immuneT -= dt;
  flushT -= dt; if (flushT <= 0) { flushT = 2; flushProfile(); }
  achT -= dt;
  if (achT <= 0 && achQueue.length) {
    // lots at once (e.g. an old profile meeting new achievements): one combined banner
    if (achQueue.length > 3) { const n = achQueue.length, cash = achQueue.reduce((t, a) => t + a.reward, 0); achQueue.length = 0; showAch({ name: `${n} ACHIEVEMENTS`, desc: 'See them all at HQ > AWARDS', reward: cash }); }
    else showAch(achQueue.shift());
  }
  if (tutorial && !tutorial.done && mode === 'combat') tutorial.update(dt);
  if (PC && mouse) crosshair.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;
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
  devTick(dt);
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
      // and one you haven't been able to see for 10s (hidden behind a prop) steps into the open
      if (!e.def.boss && e.targetable && mode === 'combat') {
        e.losT = (e.losT || 0) - dt;
        if (e.losT <= 0) { e.losT = 0.5; e.hiddenT = enemyInSight(e) ? 0 : (e.hiddenT || 0) + 0.5; }
        if (e.hiddenT >= 10) { e.hiddenT = 0; const ls = laneSpot(area.room); e.spot = ls; e.pos.set(ls.x, e.pos.y, ls.z); if (e.goal) e.goal.set(ls.x, e.goal.y, ls.z); e.crouchTarget = 0; effects.dust(e.pos.clone().setY(0.1), 10); }
      }
      if (e.off || e.ally) continue; // switched off / on your side: don't hold the area open
      alive++;
    }
    if (area.ambush) {
      if (alive === 0) ambushCleared();
    } else {
      area.waveT -= dt;
      if (tStop) area.waveT += dt; // nobody new walks in while time is stopped
      if (area.queue.length && alive < area.maxAlive && area.waveT <= 0) {
        spawnReinforcement(area.queue.shift()); area.waveT = rand(Math.random, 0.9, 2.0);
        alive++; // count it now, or the area could "clear" the same frame the last wave spawns
      }
      if (!area.queue.length && alive === 0 && !area.tutorial && (!area.boss || !area.boss.alive)) areaCleared();
    }
  }

  // weapon timers
  P.cd = Math.max(0, P.cd - dt);
  if (P.reloadT > 0) { P.reloadT -= dt; if (P.reloadT <= 0) { P.reloadT = 0; if (!cur().melee) curSlot().ammo = magOf(cur()); sfx.tap(); } }
  if (P.burstLeft > 0) {
    P.burstT -= dt;
    if (P.burstT <= 0) {
      P.burstLeft--; P.burstT = 0.07;
      if (G.combatActive && mode === 'combat') fireOnce(P.burstX, P.burstY); else P.burstLeft = 0;
    }
  }
  if (PC && locked() && hold && mouse) { hold.x = mouse.x; hold.y = mouse.y; }
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
  let dt = Math.min(0.05, (t - last) / 1000); last = t;
  if (cutscene) { // a cutscene owns the screen: its own scene and camera through the same post pass
    cutscene.update(dt);
    post.update(dt);
    post.u.lowHp.value = 0; post.u.dissolve.value = 0; dissolveGoal = 0;
    post.begin(); renderer.clear();
    if (cutscene) cutscene.render(renderer); else renderer.render(scene, camera);
    post.end();
    requestAnimationFrame(frame);
    return;
  }
  if (PC && locked() && !inPlay()) document.exitPointerLock(); // menus need the real cursor
  // dev GAME SPEED runs several fixed updates per rendered frame; G.bot is the balance-test autoplayer
  if (hitStop > 0) { hitStop -= dt; dt = 0; }
  if (slowT > 0 && !paused) slowT -= dt;
  const sdt = (slowT > 0 ? dt * 0.35 : dt) * (spiritOverdrive() ? 0.18 : 1); // boss intro slow-motion / spirit OVERDRIVE
  if (!paused) tickRewind(dt);
  if (!paused) { spiritUpdate(dt, hasSpirit() && mode !== 'title' && mode !== 'dead', !!cur().spirit); rewindRecord(sdt); }
  for (let k = 0; k < (G.timeScale || 1); k++) if (!paused) { if (G.bot) G.bot(sdt); update(sdt); }
  post.update(dt);
  { const dv = post.u.dissolve; dv.value += clamp(dissolveGoal - dv.value, -dissolveRate * dt, dissolveRate * dt); }
  post.u.lowHp.value = mode === 'combat' || mode === 'moving' ? clamp(1 - P.hp / (M.maxHp * 0.3), 0, 1) : 0;
  post.begin();
  renderer.clear();
  renderer.render(scene, camera); drawCalls = renderer.info.render.calls;
  if (mode !== 'title' && mode !== 'floorclear') { renderer.clearDepth(); renderer.render(gunScene, gunCam); }
  post.end();
  requestAnimationFrame(frame);
}

initHQ({ sfx, changed: () => { recalc(); checkAch(); }, watchEnding: (i) => playCutscene(i, () => { mode = 'title'; setMusic('calm'); openHQ('records'); }) });
bindHQ();
toTitle();
requestAnimationFrame(frame);

// expose for debugging / automated checks
// what's under the cursor for the special weapons: an enemy (incl. switched-off ones) or a projectile
function pickTarget(x, y) {
    const rect = canvasRect();
    let bp = null, bd = PC ? 40 : 52;
    for (const p of G.projectiles) { if (!p.alive) continue; const s2 = toScreen(p.mesh.position, rect); if (s2.behind) continue; const d = Math.hypot(s2.x - x, s2.y - y); if (d < bd) { bd = d; bp = p; } }
    if (bp) return { p: bp };
    raycaster.setFromCamera(new THREE.Vector2((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1), camera);
    const ms = []; for (const e of G.enemies) if (e.alive && e.state !== 'dormant') ms.push(...e.meshes);
    const h = raycaster.intersectObjects(ms, false)[0];
    if (h) return { e: h.object.userData.enemy };
    // a little forgiveness
    let be = null, bde = PC ? 30 : 46;
    for (const e of G.enemies) { if (!e.alive || e.state === 'dormant') continue; const s2 = toScreen(e.centerWorld(new THREE.Vector3()), rect); if (s2.behind) continue; const d = Math.hypot(s2.x - x, s2.y - y); if (d < bde) { bde = d; be = e; } }
    return be ? { e: be } : null;
  }

// ------------------------------------------------------------------ GRAVEYARD SHIFT (spirit)
initSpirit({
  inCombat: () => mode === 'combat' && G.combatActive, G, scene, camera, effects, sfx, post, PC, pick: (x, y) => pickTarget(x, y), marker: (x, y, c) => marker(x, y, c),
  pop: (e, text, color) => popText(e ? e.centerWorld(new THREE.Vector3()).add(new THREE.Vector3(0, 0.55, 0)) : camera.localToWorld(new THREE.Vector3(0, -0.2, -1.6)), text, color),
  popAt: (p, text, color) => popText(p, text, color), shake: (v) => { shake = Math.max(shake, v); }, stat,
  orb: () => { stats.orbs++; score += 25; healP(M.orbHeal); },
  hit: (e, amt, p) => { const r = e.damage(amt, 'body', p); if (r && r !== 'immune') stats.hits++; },
  punchDmg: () => GUN.spirit.dmg * M.dmg * wlv('spirit').dmg * M.meleeDmg,
  yaw: () => yaw, banner: (a, b) => banner(a, b, 1.6), moodGrade: () => GRADES[moodNow] || GRADES.normal,
});

// ------------------------------------------------------------------ THE GOLDEN WATCH
// You don't have to hold it: once it's in your pockets, RIGHT CLICK (or the rewind button on phones)
// rewinds time to the moment the room started: you see everything run backwards, then your health,
// ammo, score and every enemy go back to how they were. But reality never reassembles the same way:
// the room's faces are turned around (the floor might be a wall now, or the ceiling), the lights are
// somewhere else and the enemies come back in new places. Once per room.
const hasWatch = () => P.inv.some((s) => s.id === 'watch');
function snapRoomStart() {
  roomStart = {
    hp: P.hp, score, runCash, cam: G.camPos.clone(), ammo: P.inv.map((s) => [s.id, s.ammo]),
    en: G.enemies.filter((e) => e.alive && !e.decoy && !e.def.boss).map((e) => ({ type: e.type, sup: !!e.isSuper })),
    queue: area.queue.slice(), bossHp: area.boss ? area.boss.maxHp : 0,
  };
  watchUsed = false; rewindHist.length = 0; histT = 0;
}
function rewindRecord(dt) {
  if (mode !== 'combat' || rewinding) return;
  histT -= dt; if (histT > 0) return;
  histT = 0.08;
  rewindHist.push({ cam: G.camPos.clone(), yaw, pitch, en: G.enemies.filter((e) => e.alive).map((e) => [e, e.pos.clone()]) });
  if (rewindHist.length > 500) for (let i = 1; i < rewindHist.length; i++) rewindHist.splice(i, 1); // keep the whole room, thinned out
}
function vhs(on) {
  let o = $('vhs');
  if (!o) { o = document.createElement('div'); o.id = 'vhs'; o.innerHTML = '<b>&#9664;&#9664; REWIND</b><i></i><i class="b2"></i><span></span>'; document.body.append(o); }
  o.classList.toggle('on', on);
  return o;
}
function useWatch() {
  if (!hasWatch() || mode !== 'combat' || !G.combatActive || rewinding || !roomStart || P.hp <= 0) return;
  if (watchUsed) { toast('THE WATCH IS SPENT UNTIL THE NEXT ROOM', '#c0a060'); sfx.empty(); return; }
  watchUsed = true; rewinding = true; rewindT = 0;
  stat('remoteUses'); if (area.boss) stat('bossRewinds');
  hold = null;
  vhs(true);
  post.grade({ tint: 0xb8ccff, lift: 0x060a14, sat: 0.3, contrast: 1.25 });
  post.u.scan.value = 1; post.u.flash.value = 0.3; post.u.flashCol.value.set(0xc8d8ff);
  // the tape squeals backwards
  tone('sawtooth', 240, 2400, 1.6, 0.06); tone('square', 120, 900, 1.6, 0.03); noiseFx(1.6, 0.25, 'bandpass', 800, 5000);
}
function tickRewind(dt) {
  worldRoll += (worldRollGoal - worldRoll) * Math.min(1, dt * 4.5);
  if (!rewinding) return;
  rewindT += dt;
  const D = 1.6, k = Math.min(1, rewindT / D);
  // play the room backwards, faster and faster
  const n = rewindHist.length;
  if (n) {
    const h = rewindHist[Math.max(0, Math.floor((1 - k * k) * (n - 1)))];
    G.camPos.copy(h.cam); yaw = h.yaw; pitch = h.pitch;
    for (const [e, p] of h.en) if (e.alive && !e.def.boss) { e.pos.copy(p); if (e.place) e.place(); }
  }
  post.u.chroma.value = 0.5 + Math.random() * 0.6; shake = Math.max(shake, 0.15);
  const t = Math.max(0, Math.round((1 - k) * n * 0.08));
  vhs(true).querySelector('span').textContent = `PLAY ${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  if (k >= 1) finishRewind();
}
function finishRewind() {
  rewinding = false; vhs(false); post.u.scan.value = settings.retro >= 2 ? 1 : 0;
  post.grade(GRADES[moodNow] || GRADES.normal);
  for (const p of G.projectiles) p.kill();
  G.projectiles = [];
  // everything goes back to how the room started...
  if (area.boss) {
    if (area.boss.alive) area.boss.hp = roomStart.bossHp;
  } else {
    for (const e of G.enemies) e.remove();
    G.enemies = [];
    area.room.spots.forEach((s2) => (s2.taken = null));
    for (const r of roomStart.en) {
      const sp = freeSpot(r.type), e = new Enemy(G, r.type, sp, { active: true, ...(r.sup ? { isSuper: true } : {}) });
      sp.taken = e; e.atkT = rand(Math.random, 1.2, 2.4); G.enemies.push(e);
    }
    area.queue = roomStart.queue.slice(); area.waveT = 2.5;
  }
  P.hp = Math.max(1, roomStart.hp); score = roomStart.score; runCash = roomStart.runCash;
  for (const [id, ammo] of roomStart.ammo) { const sl = P.inv.find((x) => x.id === id); if (sl) sl.ammo = ammo; }
  P.reloadT = 0;
  G.camPos.copy(roomStart.cam); yaw = 0; pitch = BASE_PITCH;
  rewindHist.length = 0;
  // ...but not quite the same: the room's faces are turned, the lights moved
  const rolls = [Math.PI / 2, Math.PI, -Math.PI / 2, 0].filter((r) => Math.abs(r - worldRollGoal) > 0.1);
  worldRollGoal = pick(Math.random, rolls);
  const room = area.room;
  for (const l of roomLights) l.position.set(rand(Math.random, -HALF + 0.6, HALF - 0.6), rand(Math.random, 0.6, 2.8), rand(Math.random, room.zf + 1, room.z0 - 1));
  for (const e of G.enemies) if (e.flyer && !e.def.boss) { e.pos.y = rand(Math.random, 1.2, 2.6); if (e.place) e.place(); }
  post.u.flash.value = 0.7; post.u.flashCol.value.set(0xffe090); post.u.chroma.value = 1;
  banner('DÉJÀ VU', worldRollGoal === 0 ? 'EVERYTHING IS SOMEWHERE ELSE' : worldRollGoal === Math.PI ? 'THE CEILING IS THE FLOOR NOW' : 'THE FLOOR IS A WALL NOW', 1.6);
  sfx.unlock(); tone('sine', 90, 40, 0.5, 0.5);
  updateHud(true);
}
function resetWorldRoll() { worldRollGoal = 0; }

// ------------------------------------------------------------------ developer tools
let devWasPaused = false;
initDev({
  sfx, enabled: () => DEV_BUILD && settings.dev === 1,
  inRun: () => mode !== 'title' && mode !== 'dead' && mode !== 'cutscene' && !choiceOpen,
  onTitle: () => mode === 'title',
  ending: (i) => {
    const wasTitle = mode === 'title', was = mode;
    playCutscene(i, () => {
      if (wasTitle) { mode = 'title'; showScreen(ui.title); setMusic('calm'); return; }
      mode = was === 'cutscene' ? 'combat' : was; ui.hud.classList.remove('hidden'); setMusic(mode === 'combat' ? 'combat' : 'calm');
      if (mode === 'combat') G.combatActive = true;
    });
  },
  allEndings: () => { profile.endings = { ...(profile.endings || {}), 0: 1, 1: 1, 2: 1, 3: 1 }; touch(); flushProfile(true); toast('NEW GAME+ AND FREE ROAM UNLOCKED'); },
  addon: (k) => !!profile[k],
  toggleAddon: (k) => { if (k === 'ngp' ? !ngpUnlocked() : !roamUnlocked()) { profile.endings = { ...(profile.endings || {}), 0: 1, 1: 1, 2: 1, 3: 1 }; } profile[k] = !profile[k]; touch(); flushProfile(true); if (mode === 'title') titleNgp(); toast(`${k === 'ngp' ? 'NEW GAME+' : 'FREE ROAM'} ${profile[k] ? 'ON' : 'OFF'} (NEXT RUN)`); },
  pause: () => { devWasPaused = paused; paused = true; ui.pause.classList.add('hidden'); hold = null; },
  resume: () => { paused = devWasPaused; if (paused) { ui.pause.classList.remove('hidden'); $('pausePerks').innerHTML = perkSummary(); } },
  info: () => `${G.enemies.filter((e) => e.alive).length} ENEMIES · ${drawCalls} DRAWS`,
  heal: () => { P.hp = M.maxHp; },
  timeScale: (k) => (k ? (G.timeScale = k) : G.timeScale || 1),
  killAll: () => { for (const e of G.enemies) if (e.alive && !e.decoy) e.die(false); },
  finishFloor: () => { paused = false; ui.pause.classList.add('hidden'); for (const e of G.enemies) if (e.alive) e.die(false, null, true); G.combatActive = false; hideScreens(); floorComplete(); },
  gotoFloor: (n) => { paused = false; hideScreens(); for (const pr of G.projectiles) pr.kill(); G.projectiles = []; G.floorNum = n; startFloor(n); },
  cash: (n) => { addCash(n); touch(); flushProfile(true); },
  unlockAll: () => { profile.allModes = true; for (const c of Object.keys(CHAR)) profile.chars[c] = 1; for (const g of GUNS) profile.found[g.id] = 1; touch(); flushProfile(true); checkAch(); toast('EVERYTHING UNLOCKED'); },
  floor: () => G.floorNum,
  guns: () => GUNS.map((g) => ({ id: g.id, short: g.short, color: RARITY[g.rarity].color })),
  giveGun: (id) => { giveGun(id); },
  perks: () => PERKS.map((p) => ({ id: p.id, name: p.name, color: PERK_RARITY[p.rarity].color, lv: perkLv[p.id] || 0 })),
  addPerk: (id) => { const before = M.maxHp; perkLv[id] = (perkLv[id] || 0) + 1; recalc(); if (M.maxHp > before) P.hp += M.maxHp - before; P.hp = Math.min(P.hp, M.maxHp); toast(PERK[id].name, PERK_RARITY[PERK[id].rarity].color); },
  clearPerks: () => { perkLv = {}; recalc(); P.hp = Math.min(P.hp, M.maxHp); },
  enemies: () => Object.entries(DEFS).filter(([, d]) => !d.boss && !d.minion && d.floors && d.floors[1] > 0).map(([id, d]) => [id, d.name]),
  bosses: () => BOSS_LIST.map((b) => [b.id, `F${bossTowerFloor(b.floor, b.mini)} ${b.mini ? 'MINI · ' : ''}${b.name}`]),
  spawn: (t, rq) => { if (!area) return; let e; if (rq) { const s2 = freeSpot(t); e = new Enemy(G, t, s2, { isSuper: true }); s2.taken = e; G.enemies.push(e); announceSuper(e); } else e = spawnAt(t); if (G.combatActive) e.activate(); },
  spawnBoss: (id) => { if (!area) return; const b = new Enemy(G, id, { x: 0, y: 1.9, z: area.room.z0 - 8.2, cover: false }); b.activate(); G.enemies.push(b); if (!area.boss) area.boss = b; ui.bossbar.classList.remove('hidden'); ui.bossName.textContent = DEFS[id].name; },
});

window.__game = { get draws() { return drawCalls; }, get spirit() { return spiritState(); }, get spiritDbg() { return spiritDebug(); }, get watch() { return { used: watchUsed, rewinding, roll: worldRollGoal, hist: rewindHist.length, start: roomStart && roomStart.en.length }; }, useWatch, get yaw() { return yaw; }, get pitch() { return pitch; }, moveAim, solidAt: (x, y, z) => G.solidAt(new THREE.Vector3(x, y, z)), ending: (i, done) => playCutscene(i, done || (() => {})), get cs() { return cutscene; }, setChar: (c) => { runChar = c; }, setMutLv: (m) => { mutLv = m; }, spiritFill, get overdrive() { return spiritOverdrive(); }, get mut() { return mutLv; }, forceTwist(id) { setRunMode("daily"); const t = DAILY_MODS_REF.find((x) => x.id === id); daily.mod = t; G.twist = t; G.mod = id; recalc(); }, get run() { return { runMode, daily, rushIdx, rushTime, layout: G.layout, mod: G.mod }; }, goto(n) { hideScreens(); G.floorNum = n; startFloor(n); }, spawnNote: () => spawnNote(G.room), nextFloor: () => nextFloor(), cards: { floorCard, bossCard, dmgDir }, post, profile, checkAch, setPerks(lv) { perkLv = lv; recalc(); }, rollPerks, rollGun, PERKS, setDiff, startReload, equip, magOf, get M() { return M; }, collect: (p) => collectPickup(p), get stats() { return stats; }, get seq() { return !!seq; }, get perks() { return { perkLv, M, rerolls, perkOffer }; }, takePerk: (id) => takePerk(id), spawnSpot(type, spot) { const e = new Enemy(G, type, spot); e.activate(); G.enemies.push(e); return e; }, spawnBoss(id) { const room = area.room; const b = new Enemy(G, id, { x: 0, y: 1.9, z: room.z0 - 9.6, cover: false }); b.activate(); G.enemies.push(b); area.boss = b; ui.bossbar.classList.remove('hidden'); ui.bossName.textContent = DEFS[id].name; return b; }, get dbg() { return { paused, seq: !!seq, seqWait, until: !!seqUntil, fade: ui.fade.style.opacity, choiceOpen, pending: pendingGuns.length }; }, preview(n, v, room = 0) { loadFloor(n, v); setRoom(room); prepareArea(room); G.camPos.copy(G.floor.rooms[room].stand); setLights(G.room, G.room, 0); return G.floor.plan.name + ' / ' + G.floor.rooms.map(r => r.type).join(','); }, get area() { return area; }, DEFS, spawnAt: (t) => spawnAt(t), giveGun, dropGun: (id) => dropGun(G.camPos.clone().add(new THREE.Vector3(0.6, 0, -4)), id), GUNS, cur, openChoice, get choiceOpen() { return choiceOpen; }, probe(x, y) {
  const rect = canvasRect(); const ndc = new THREE.Vector2((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const targets = []; for (const e of G.enemies) if (e.alive) targets.push(...e.meshes);
  const ht = raycaster.intersectObjects(targets, false).map(h => [h.distance, G.enemies.indexOf(h.object.userData.enemy), h.object.userData.part, h.object.parent && h.object.parent.type, h.point.toArray().map(v => +v.toFixed(2))]);
  const hl = raycaster.intersectObject(G.floor.group, true).slice(0, 3).map(h => [h.distance, h.object.geometry.type, h.point.toArray().map(v => +v.toFixed(2))]);
  return { rect: [rect.width, rect.height], cam: camera.position.toArray(), ht, hl };
}, G, P, get mode() { return mode; }, startGame, tryFire, toScreen: (v) => toScreen(v, canvasRect()) };
