// THE REMOTE: a legendary "weapon" that is a TV remote for reality. While it's equipped a 2D
// remote sits on screen; click (or tap) its buttons, then click things in the world.
//   POWER  - switch an enemy, a projectile or a bomb off (frozen, grey). Off enemies count as
//            killed when the area ends, unless you switch them back on. Bosses reboot after 6s.
//   INFO   - open an enemy's (or projectile's) stat sheet and edit it: health, damage, speed,
//            fire rate, size, delete or add attacks and traits, switch sides, burn, freeze, clone, delete.
//   PAUSE  - stop time for everything but you. Press again to resume.
//   REWIND - hold to run time backwards (up to 15s): enemies walk back, shots fly back into
//            guns, your health comes back. The dead stay dead.
//   FWD    - skip something ahead in time: a bomb or shot jumps to its end (bombs go off right
//            where they are, shots have already flown past), an enemy ages 30 years in a second.
import * as THREE from '../vendor/three.module.min.js';

let C = null;            // context from game.js
let mode = 'power';      // selected button for world clicks
let frozen = false;      // PAUSE
let rewinding = false;   // REWIND held
const snaps = [];        // rewind history (every 0.1s, up to 15s)
let snapT = 0, rewAcc = 0, panelFor = null;
const OFF_MAT = new THREE.MeshLambertMaterial({ color: 0x3a3c40 });
const ALLY_MAT = new THREE.SpriteMaterial({ color: 0x60ff80, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
const $ = (id) => document.getElementById(id);

export const remoteFrozen = () => frozen;
export const remoteRewinding = () => rewinding;

export function initRemote(ctx) {
  C = ctx;
  ALLY_MAT.map = ctx.glowTex;
  for (const b of document.querySelectorAll('#remote .rbtn')) {
    const act = b.dataset.act;
    const down = (e) => { e.stopPropagation(); e.preventDefault(); press(act, true); };
    const up = (e) => { e.stopPropagation(); press(act, false); };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointerleave', up);
  }
  $('rpClose').addEventListener('click', (e) => { e.stopPropagation(); closePanel(); });
  lcd();
}

// a press from the DOM or (PC, mouse captured) from the virtual crosshair
export function press(act, down) {
  if (!C.active()) return;
  if (act === 'rew') { if (down && C.inCombat()) startRewind(); else if (!down) stopRewind(); return; }
  if (!down) return;
  C.sfx.tap();
  if (act === 'pause') { setFrozen(!frozen); return; }
  mode = act; lcd();
}
export function remoteButtonAt(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  const b = el && el.closest && el.closest('#remote .rbtn');
  return b ? b.dataset.act : null;
}

function setFrozen(on) {
  if (on && !C.inCombat()) return;
  frozen = on;
  C.post.grade(on ? { tint: 0xb8c8ff, lift: 0x000008, sat: 0.35, contrast: 1.15 } : C.moodGrade());
  if (on) C.toast('TIME PAUSED', '#9ab8ff'); else C.toast('TIME RESUMED', '#e8e0c8');
  lcd();
}
function startRewind() { rewinding = true; C.post.u.scan.value = 1; lcd(); }
function stopRewind() { if (!rewinding) return; rewinding = false; C.applySettings(); lcd(); }

function lcd() {
  const el = $('rLcd'); if (!el) return;
  el.textContent = rewinding ? '◀◀ REWIND' : frozen ? '❚❚ PAUSED' : { power: 'POWER', info: 'INFO', fwd: 'SKIP ▶▶' }[mode] || mode.toUpperCase();
  for (const b of document.querySelectorAll('#remote .rbtn')) b.classList.toggle('on', b.dataset.act === mode || (b.dataset.act === 'pause' && frozen) || (b.dataset.act === 'rew' && rewinding));
}

export function showRemote(on) {
  $('remote').classList.toggle('hidden', !on);
  if (!on) { if (frozen) setFrozen(false); stopRewind(); }
  lcd();
}

// -------------------------------------------------------------- clicking the world
export function remoteUse(x, y) {
  const t = C.pick(x, y);
  if (!t) { C.marker(x, y, 'miss'); return; }
  C.marker(x, y, '');
  if (mode === 'power') t.e ? toggleEnemy(t.e) : toggleShot(t.p);
  else if (mode === 'info') openPanel(t);
  else if (mode === 'fwd') t.e ? ageEnemy(t.e) : skipShot(t.p);
}

function setOff(e, off) {
  e.off = off;
  if (off) { for (const m of e.meshes) m.material = OFF_MAT; if (e.glow) e.glow.visible = false; e.atkState = 'cool'; e.atkT = Math.max(e.atkT || 0, 0.8); }
  else e.applyMats();
}
function toggleEnemy(e) {
  const g = C.G;
  if (!e.off) {
    setOff(e, true);
    g.fx.sparks(e.centerWorld(new THREE.Vector3()), 8); C.sfx.zap();
    C.pop(e, e.def.boss ? 'OFF (REBOOTING...)' : 'POWERED OFF', '#9aa4b0');
    if (e.def.boss) e.rebootT = 6;
  } else {
    setOff(e, false); e.rebootT = 0;
    C.sfx.unlock(); C.pop(e, 'BACK ON', '#60ff80');
  }
}
function toggleShot(p) {
  p.off = !p.off;
  if (p.off) { p.savedMat = p.mesh.material; p.mesh.material = OFF_MAT; } else if (p.savedMat) p.mesh.material = p.savedMat;
  C.sfx.zap(); C.G.fx.sparks(p.mesh.position.clone(), 4);
}
function ageEnemy(e) {
  const c = e.centerWorld(new THREE.Vector3());
  C.G.fx.dust(c, 30); C.G.fx.smoke(c, 4, 0xb0a890, 0.5, 0.4, 1.6);
  e.interrupt && e.interrupt();
  e.age = (e.age || 0) + 30;
  C.pop(e, `+30 YEARS`, '#d8c8a0');
  if (e.def.boss) { e.damage(e.maxHp * 0.12, 'body', c); return; }
  edit(e); e.def.speed *= 0.5; e.fireMul *= 1.6;
  e.damage(e.maxHp * 0.5, 'body', c);
}
function skipShot(p) {
  const at = p.mesh.position.clone();
  if (p.bomb || p.kind === 'grenade' || p.kind === 'mine') {
    C.G.fx.explosion(at, 1.2); C.sfx.explode();
    C.G.splashEnemies(at, 1.8, p.dmg * 1.2, null);
    if (at.distanceTo(C.G.camPos) < 2.2) C.G.hurtPlayer(p.dmg * 0.5, null, p);
  } else C.G.fx.pop(at);
  p.kill();
}

// -------------------------------------------------------------- stat editor
function edit(e) {
  // give this enemy its own copy of its definition before changing anything
  if (e.ownDef) return;
  const d = e.def;
  e.def = { ...d, atk: Array.isArray(d.atk) ? d.atk.map((a) => ({ ...a })) : d.atk ? { ...d.atk } : d.atk, traits: { ...(d.traits || {}) }, fire: d.fire ? [...d.fire] : d.fire };
  e.traits = e.def.traits; e.st = e.def; e.ownDef = true;
}
const ATTACKS = ['shot', 'burst', 'spread', 'rapid', 'lob', 'homing', 'laser', 'sonic'];
const TRAIT_NAMES = { armor: 'ARMOR', shield: 'SHIELD', regen: 'REGEN', enrage: 'ENRAGE', reflect: 'REFLECT', phase: 'PHASE', teleportOnHit: 'BLINK', kamikaze: 'KAMIKAZE', leech: 'LEECH', split: 'SPLITS', deathBlast: 'DEATH BLAST', hover: 'HOVER', cloak: 'CLOAK' };

function openPanel(t) {
  panelFor = t;
  C.pause();
  renderPanel();
  $('remotePanel').classList.remove('hidden');
}
function closePanel() {
  $('remotePanel').classList.add('hidden');
  panelFor = null;
  C.resume();
}
function row(label, value, onSet, step = 1) {
  const r = document.createElement('div'); r.className = 'rp-row';
  r.innerHTML = `<span>${label}</span>`;
  const i = document.createElement('input'); i.type = 'number'; i.step = step; i.value = Math.round(value * 100) / 100; i.className = 'rp-in';
  i.addEventListener('change', () => { const v = parseFloat(i.value); if (!isNaN(v)) { onSet(v); C.sfx.tap(); renderPanel(); } });
  r.append(i); return r;
}
function btn(label, fn, cls = '') {
  const b = document.createElement('button'); b.className = 'rp-b ' + cls; b.textContent = label;
  b.addEventListener('click', (ev) => { ev.stopPropagation(); C.sfx.tap(); fn(); });
  return b;
}
function renderPanel() {
  const box = $('rpBody'); box.innerHTML = '';
  const t = panelFor; if (!t) return;
  const sec = (title) => { const h = document.createElement('div'); h.className = 'rp-h'; h.textContent = title; box.append(h); };
  const wrap = () => { const w = document.createElement('div'); w.className = 'rp-wrap'; box.append(w); return w; };
  if (t.p) {
    const p = t.p;
    $('rpTitle').textContent = `PROJECTILE: ${p.kind.toUpperCase()}`;
    box.append(row('DAMAGE', p.dmg, (v) => { p.dmg = Math.max(0, v); }));
    box.append(row('SPEED', p.vel ? p.vel.length() : 0, (v) => { if (p.vel) p.vel.setLength(Math.max(0, v)); }, 0.5));
    const w = wrap();
    w.append(btn('SEND IT BACK', () => { const o = p.owner; if (o && o.alive) { p.vel = o.centerWorld(new THREE.Vector3()).sub(p.mesh.position).setLength(Math.max(4, p.vel.length())); p.gravity = 0; p.homing = 0; p.owner = null; p.reflected = true; } closePanel(); }));
    w.append(btn(p.off ? 'POWER ON' : 'POWER OFF', () => { toggleShot(p); renderPanel(); }));
    w.append(btn('DELETE', () => { p.kill(); closePanel(); }, 'warn'));
    return;
  }
  const e = t.e;
  if (!e.alive) { closePanel(); return; }
  $('rpTitle').textContent = e.def.name + (e.ally ? ' (ALLY)' : '') + (e.off ? ' (OFF)' : '');
  sec('STATS');
  box.append(row('HEALTH', e.hp, (v) => { e.hp = Math.max(0.1, v); if (e.hp > e.maxHp) e.maxHp = e.hp; }));
  box.append(row('MAX HEALTH', e.maxHp, (v) => { e.maxHp = Math.max(0.1, v); e.hp = Math.min(e.hp, e.maxHp); }));
  box.append(row('DAMAGE', e.dmg, (v) => { e.dmg = Math.max(0, v); }));
  box.append(row('MOVE SPEED', e.def.speed || 0, (v) => { edit(e); e.def.speed = Math.max(0, v); }, 0.1));
  box.append(row('ATTACK DELAY ×', e.fireMul, (v) => { e.fireMul = Math.max(0.05, v); }, 0.1));
  box.append(row('SIZE', e.scale, (v) => { e.scale = Math.min(4, Math.max(0.2, v)); e.root.scale.setScalar(e.scale); }, 0.1));
  sec('ATTACKS');
  const aw = wrap();
  const atks = Array.isArray(e.def.atk) ? e.def.atk : e.def.atk ? [e.def.atk] : [];
  if (!atks.length) aw.append(Object.assign(document.createElement('small'), { textContent: 'NONE' }));
  atks.forEach((a, i) => aw.append(btn(`✕ ${String(a.type).toUpperCase()}${a.kind ? ' · ' + a.kind.toUpperCase() : ''}${a.n ? ' ×' + a.n : ''}`, () => {
    edit(e); const list = (Array.isArray(e.def.atk) ? e.def.atk : [e.def.atk]).filter((_, k) => k !== i);
    e.def.atk = list.length ? list : null; e.atkIdx = 0; renderPanel();
  })));
  const sel = document.createElement('select'); sel.className = 'rp-in';
  for (const a of ATTACKS) { const o = document.createElement('option'); o.value = a; o.textContent = a.toUpperCase(); sel.append(o); }
  aw.append(sel, btn('+ ADD', () => {
    edit(e); const list = Array.isArray(e.def.atk) ? e.def.atk : e.def.atk ? [e.def.atk] : [];
    list.push({ type: sel.value, n: sel.value === 'spread' ? 3 : sel.value === 'rapid' ? 6 : sel.value === 'burst' ? 3 : undefined });
    e.def.atk = list; if (!e.def.fire) e.def.fire = [2.4, 3.6]; if (!e.def.wind) e.def.wind = 0.7;
    if (e.def.move === 'charge' || e.def.move === 'crawl') e.def.move = 'strafe';
    renderPanel();
  }));
  sec('TRAITS');
  const tw = wrap();
  const tr = Object.keys(e.traits || {}).filter((k) => e.traits[k]);
  if (!tr.length) tw.append(Object.assign(document.createElement('small'), { textContent: 'NONE' }));
  for (const k of tr) tw.append(btn(`✕ ${TRAIT_NAMES[k] || k.toUpperCase()}`, () => { edit(e); delete e.traits[k]; if (k === 'shield') { e.shieldHp = 0; } renderPanel(); }));
  if (e.shieldHp > 0) tw.append(btn('✕ BREAK SHIELD', () => { e.shieldHp = 0; renderPanel(); }));
  sec('DO SOMETHING');
  const dw = wrap();
  dw.append(btn(e.ally ? 'SWITCH BACK' : 'SWITCH SIDES', () => { setAlly(e, !e.ally); renderPanel(); }));
  dw.append(btn(e.off ? 'POWER ON' : 'POWER OFF', () => { toggleEnemy(e); renderPanel(); }));
  dw.append(btn('SET ON FIRE', () => { e.burnT = 6; e.burnDps = 2; renderPanel(); }));
  dw.append(btn('FREEZE', () => { e.slowT = 8; renderPanel(); }));
  dw.append(btn('HEAL', () => { e.hp = e.maxHp; renderPanel(); }));
  dw.append(btn('CLONE', () => { C.clone(e); renderPanel(); }));
  dw.append(btn('FULL STOP', () => { edit(e); e.def.speed = 0; e.def.atk = null; renderPanel(); }));
  dw.append(btn('DELETE', () => { C.erase(e); closePanel(); }, 'warn'));
}

function setAlly(e, on) {
  e.ally = on;
  if (on) {
    if (!e.allyMark) { e.allyMark = new THREE.Sprite(ALLY_MAT); e.allyMark.scale.setScalar(0.35); e.allyMark.position.y = (e.centerY || 1) * 2.1; e.root.add(e.allyMark); }
    e.allyMark.visible = true; C.pop(e, 'ON YOUR SIDE', '#60ff80');
  } else if (e.allyMark) e.allyMark.visible = false;
}

// -------------------------------------------------------------- per-frame (called by game.js)
export function remoteUpdate(dt) {
  const G = C.G;
  // boss reboots
  for (const e of G.enemies) if (e.off && e.rebootT > 0) { e.rebootT -= dt; if (e.rebootT <= 0 && e.alive) { setOff(e, false); C.pop(e, 'REBOOTED', '#ff6040'); } }
  if (!C.inCombat()) { snaps.length = 0; if (rewinding) stopRewind(); if (frozen) setFrozen(false); return; }
  if (rewinding) { rewindStep(dt); return; }
  if (frozen) return;
  snapT -= dt;
  if (snapT <= 0) { snapT = 0.1; record(); }
}
function record() {
  const G = C.G;
  snaps.push({
    hp: C.P.hp,
    en: G.enemies.filter((e) => e.alive).map((e) => ({ e, pos: e.pos.clone(), goal: e.goal ? e.goal.clone() : null, hp: e.hp, atkState: e.atkState, atkT: e.atkT, timer: e.timer, crouch: e.crouch, off: !!e.off })),
    pr: G.projectiles.filter((p) => p.alive).map((p) => ({ p, pos: p.mesh.position.clone(), vel: p.vel ? p.vel.clone() : null, life: p.life })),
  });
  if (snaps.length > 150) snaps.shift();
}
function rewindStep(dt) {
  const G = C.G;
  C.post.u.chroma.value = 0.5;
  rewAcc += dt * 2; // twice real speed
  let s = null;
  while (rewAcc >= 0.1 && snaps.length) { s = snaps.pop(); rewAcc -= 0.1; }
  if (!s) { if (!snaps.length) { C.toast('NOTHING LEFT TO REWIND', '#9aa4b0'); stopRewind(); } return; }
  const inSnap = new Set(s.en.map((x) => x.e));
  // enemies that arrived after this moment go back where they came from
  for (const e of G.enemies) if (e.alive && !inSnap.has(e) && !e.def.boss) { C.unspawn(e); }
  for (const x of s.en) {
    const e = x.e; if (!e.alive) continue; // the dead stay dead
    e.pos.copy(x.pos); if (x.goal && e.goal) e.goal.copy(x.goal);
    e.hp = x.hp; e.atkState = x.atkState; e.atkT = x.atkT; e.timer = x.timer; e.crouch = x.crouch;
    if (!!e.off !== x.off) setOff(e, x.off);
    e.place && e.place();
  }
  const pset = new Set(s.pr.map((x) => x.p));
  for (const p of G.projectiles) if (p.alive && !pset.has(p)) p.kill(); // un-fired
  for (const x of s.pr) {
    const p = x.p;
    if (!p.alive) { p.alive = true; G.scene.add(p.mesh); if (!G.projectiles.includes(p)) G.projectiles.push(p); }
    p.mesh.position.copy(x.pos); if (x.vel && p.vel) p.vel.copy(x.vel); p.life = x.life;
  }
  G.projectiles = G.projectiles.filter((p) => p.alive);
  C.P.hp = Math.max(C.P.hp, s.hp);
}

// called when an area is about to end: powered-off enemies count as killed, allies clock out
export function remoteSettle() {
  for (const e of C.G.enemies) {
    if (!e.alive) continue;
    if (e.off) { setOff(e, false); e.die(false, e.centerWorld(new THREE.Vector3())); }
    else if (e.ally) { C.G.fx.pop(e.centerWorld(new THREE.Vector3())); C.erase(e, true); }
  }
  snaps.length = 0;
}
