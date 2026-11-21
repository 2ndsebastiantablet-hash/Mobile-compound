// GRAVEYARD SHIFT: a legendary fighting spirit. Once you pick it up it stays out for the rest of
// the run, whatever you're holding (drop it and it's gone). It thinks for itself:
//   GUARD        - floats beside you and protects you: it punches incoming shots out of the air,
//                  or snipes them with its FINGER LASER, and the laser also cancels enemy wind-ups.
//   BULLET CATCH - sometimes it catches a shot instead and throws it straight back at the shooter.
//   BARRAGE      - when nothing is coming at you it picks an enemy and punches it until it's DEAD.
//                  Every punch freezes; every 12th is an ICE FIST that locks the target solid.
//   SHOCKWAVE    - when enemies bunch up it slams the floor between them: damage, knockback, freeze.
//   OVERDRIVE    - punches fill a gauge; with it full press RELOAD while holding the spirit: time
//                  slows to a crawl and it punches its way through the whole room.
//   LUCK         - while it's out, 15% of hits on you are shrugged off and weapon drops are luckier.
// Its one weakness: it can't multitask. While it's punching something (or slamming), it is FOCUSED
// and won't defend you; shots can get through. Select it (hold it as your weapon) to give orders:
// click an enemy to send it there, click a shot to have it grab that, click empty space to call it
// back to GUARD you.
import * as THREE from '../vendor/three.module.min.js';
import * as TX from '../engine/textures.js';

let C = null, S = null;
const V = () => new THREE.Vector3();
const mat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
const BODY = mat(0x40d8ff, 0.42), TRIM = mat(0xffd860, 0.8), EYES = mat(0xffffff, 1), GHOST = mat(0x60e0ff, 0.25), ICE = mat(0xa0f0ff, 0.9);
const HIT_EVERY = 0.075, ICE_EVERY = 12;

function box(g, w, h, d, m, x, y, z) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); g.add(o); return o; }

function label(text, col) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 16;
  const x = c.getContext('2d'); x.font = 'bold 12px monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, 2, 64, 12); x.fillStyle = col; x.fillText(text, 32, 8.5);
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; return t;
}
let LABELS = null;

function buildSpirit() {
  const g = new THREE.Group();
  box(g, 0.5, 0.62, 0.28, BODY, 0, 1.25, 0);
  box(g, 0.52, 0.08, 0.3, TRIM, 0, 1.52, 0);
  box(g, 0.3, 0.3, 0.28, BODY, 0, 1.75, 0);
  box(g, 0.22, 0.05, 0.02, EYES, 0, 1.78, -0.145);
  box(g, 0.34, 0.08, 0.3, TRIM, 0, 1.93, 0);
  const armL = new THREE.Group(); armL.position.set(-0.34, 1.48, 0); g.add(armL);
  const armR = new THREE.Group(); armR.position.set(0.34, 1.48, 0); g.add(armR);
  for (const a of [armL, armR]) { box(a, 0.15, 0.5, 0.15, BODY, 0, -0.25, 0); box(a, 0.2, 0.2, 0.2, TRIM, 0, -0.55, 0); }
  box(g, 0.42, 0.4, 0.24, GHOST, 0, 0.78, 0);
  box(g, 0.3, 0.3, 0.2, GHOST, 0, 0.45, 0.05);
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glow(), color: 0x40c8ff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
  aura.scale.set(1.6, 2.2, 1); aura.position.y = 1.3; g.add(aura);
  LABELS = LABELS || { guard: label('GUARD', '#80e0ff'), focus: label('FOCUSED', '#ff9040'), od: label('OVERDRIVE', '#ffe080') };
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: LABELS.guard, transparent: true, depthTest: false, depthWrite: false }));
  tag.scale.set(0.8, 0.2, 1); tag.position.y = 2.25; tag.renderOrder = 20; g.add(tag);
  g.scale.setScalar(0.82);
  return { g, armL, armR, aura, tag };
}

export function initSpirit(ctx) { C = ctx; }
export const spiritOverdrive = () => !!(S && S.od > 0);
export const spiritGauge = () => (S ? S.gauge : 0);
export const spiritState = () => (S ? (S.od > 0 ? 'OVERDRIVE' : focused() ? 'FOCUSED' : 'GUARD') : '');
const focused = () => S && (S.state === 'dash' || S.state === 'punch' || S.state === 'slam');

function ensure() {
  if (S) return S;
  const m = buildSpirit();
  S = { ...m, state: 'guard', t: 0, target: null, shot: null, home: V(), pos: V(), laserT: 0.5, slamT: 4, thinkT: 0.4, gauge: 0, od: 0, odQueue: [], ghosts: [], focusT: 0, restT: 0, hits: 0, holdT: 0 };
  C.scene.add(S.g); S.g.visible = false;
  for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), TRIM); f.visible = false; C.scene.add(f); S.ghosts.push(f); }
  return S;
}

function homePos(out) { return C.camera.localToWorld(out.set(C.PC ? 1.55 : 0.8, -1.5, C.PC ? -2.9 : -2.5)); }

export function spiritShow(on) {
  ensure();
  S.g.visible = on;
  if (on) { homePos(S.pos); S.g.position.copy(S.pos); S.state = 'guard'; S.target = null; }
  for (const f of S.ghosts) f.visible = false;
}

const alive = (e) => e && e.alive && e.state !== 'dormant';
const hittable = (e) => alive(e) && e.targetable && !e.off;

// the shot that's about to hit you (closest one flying your way)
function threatShot() {
  const cam = C.camera.position;
  let best = null, bd = 9;
  for (const p of C.G.projectiles) {
    if (!p.alive || p.off || (p.mineT != null && p.mineT > 0) || p.reflected) continue;
    const pos = p.mesh.position, d = pos.distanceTo(cam);
    if (d > bd) continue;
    if (p.vel && p.vel.lengthSq() > 0.01 && cam.clone().sub(pos).dot(p.vel) <= 0) continue;
    bd = d; best = p;
  }
  return best;
}
// who to fight: whoever is about to attack, else the closest; bosses last
function pickTarget() {
  const cam = C.camera.position;
  let best = null, bs = -1e9;
  for (const e of C.G.enemies) {
    if (!hittable(e) || e.decoy) continue;
    const d = e.pos.distanceTo(cam);
    const s = (e.atkState === 'wind' ? 30 : 0) - d * 2 - (e.def.boss ? 40 : 0) + (e.isSuper ? 6 : 0);
    if (s > bs) { bs = s; best = e; }
  }
  return best;
}
function cluster() {
  const foes = C.G.enemies.filter((e) => hittable(e) && !e.def.boss);
  for (const a of foes) {
    const near = foes.filter((b) => b.pos.distanceTo(a.pos) < 2.6);
    if (near.length >= 3) { const c = V(); for (const b of near) c.add(b.pos); return { at: c.multiplyScalar(1 / near.length), n: near.length }; }
  }
  return null;
}

function focusOn(e) { S.side = 0; S.target = e; S.state = 'dash'; S.t = 0; S.focusT = 0; S.restT = 0; S.waitT = 0; C.sfx.slash(); }
function laser(to, col = 0x80ffff) {
  const from = S.g.localToWorld(V().set(0.34, 0.95, -0.2));
  C.effects.beam(from, to, col, 0.04, 0.12);
  C.effects.glowAt(to, col, 0.5, 0.1);
  C.sfx.zap();
}
function setTag(k) { const t = LABELS[k]; if (S.tag.material.map !== t) { S.tag.material.map = t; S.tag.material.needsUpdate = true; } }

// click / tap while holding the spirit: orders
export function spiritUse(x, y) {
  ensure();
  const t = C.pick(x, y);
  if (t && t.p) { S.shot = t.p; S.state = 'intercept'; S.t = 0; C.marker(x, y, ''); return true; }
  if (t && t.e) { focusOn(t.e); C.marker(x, y, ''); C.pop(t.e, 'GET HIM!', '#80ffff'); return true; }
  // nothing there: back to guarding you
  S.target = null; S.state = 'return'; S.holdT = 2.0; C.marker(x, y, 'miss');
  C.pop(null, 'GUARD!', '#80e0ff');
  return true;
}

export function spiritOverdriveStart() {
  ensure();
  if (S.gauge < 1 || S.od > 0) return false;
  const foes = C.G.enemies.filter((e) => hittable(e));
  if (!foes.length) return false;
  S.gauge = 0; S.od = 4.5; S.odQueue = foes.slice(0, 10);
  C.post.u.flash.value = 0.6; C.post.u.flashCol.value.set(0xffe080);
  C.post.grade({ tint: 0xffe8b0, lift: 0x080600, sat: 0.55, contrast: 1.2 });
  C.banner('OVERDRIVE', 'THE SPIRIT TAKES OVER');
  S.state = 'guard';
  return true;
}

// a stray shot: punch it out of the air, or catch it and throw it back
function intercept(dt) {
  const p = S.shot;
  S.t += dt;
  if (!p || !p.alive || S.t > 0.7) { S.shot = null; S.state = 'return'; return; }
  const at = p.mesh.position;
  S.pos.lerp(at.clone().add(V().set(0, -1.1, 0)), Math.min(1, dt * 28));
  S.g.position.copy(S.pos);
  S.armR.rotation.x = -1.6;
  if (S.pos.distanceTo(at.clone().add(V().set(0, -1.1, 0))) < 0.45) {
    const owner = p.owner;
    if (alive(owner) && !owner.def.boss && Math.random() < 0.4) {
      // caught it: straight back at whoever fired it
      const c = owner.centerWorld(V());
      C.effects.beam(at.clone(), c, 0xffe080, 0.06, 0.18); C.effects.impact(c);
      C.hit(owner, C.punchDmg() * 9, c); owner.slowT = Math.max(owner.slowT || 0, 2); C.effects.ice(c, 6);
      C.pop(owner, 'RETURNED!', '#ffe080'); C.sfx.zap(); C.stat && C.stat('spiritReturns');
    } else {
      C.effects.pop(at.clone()); C.effects.sparks(at.clone(), 6); C.sfx.chop();
      C.popAt(at.clone(), 'BLOCKED', '#80ffff');
    }
    p.kill(); C.orb(); S.gauge = Math.min(1, S.gauge + 0.03);
    S.shot = null; S.state = 'return';
  }
}

function punch(dt) {
  const e = S.target;
  if (!alive(e)) { if (e && !e.alive && !S.od) C.pop(e, 'K.O.!', '#80ffff'); S.target = null; S.state = 'return'; for (const f of S.ghosts) f.visible = false; return; }
  const c = e.centerWorld(V());
  const toCam = C.camera.position.clone().sub(c).setY(0).normalize();
  // it fights from the side, so it doesn't stand between you and the target
  if (!S.side) S.side = Math.random() < 0.5 ? -1 : 1;
  const side = V().set(-toCam.z, 0, toCam.x).multiplyScalar(S.side);
  const spot = c.clone().addScaledVector(toCam, 0.25).addScaledVector(side, 0.7 * e.scale + 0.4); spot.y = Math.max(0, c.y - 1.15);
  if (S.state === 'dash') {
    S.pos.lerp(spot, Math.min(1, dt * 20));
    if (S.pos.distanceTo(spot) < 0.25) { S.state = 'punch'; S.t = 0; }
  } else {
    S.pos.lerp(spot, Math.min(1, dt * 10));
    // it waits for a cloaked / phased target to come back, but not forever
    if (!hittable(e)) { S.waitT += dt; for (const f of S.ghosts) f.visible = false; if (S.waitT > 1.5) { S.target = null; S.state = 'return'; } return; }
    S.waitT = 0; S.focusT += dt;
    // even a spirit has to breathe against a boss
    if (e.def.boss && S.focusT > 5) { S.restT = 0.8; S.focusT = 0; }
    if (S.restT > 0) { S.restT -= dt; S.armL.rotation.x = -0.3; S.armR.rotation.x = -0.3; for (const f of S.ghosts) f.visible = false; return; }
    S.armL.rotation.x = -1.5 + Math.sin(S.t * 70) * 0.5; S.armR.rotation.x = -1.5 + Math.cos(S.t * 70) * 0.5;
    for (const f of S.ghosts) { f.visible = true; f.position.copy(c).add(V().set((Math.random() - 0.5) * 0.6 * e.scale, (Math.random() - 0.3) * 0.7 * e.scale, (Math.random() - 0.5) * 0.3)).addScaledVector(toCam, 0.3); }
    S.hitT -= dt;
    if (S.hitT <= 0) {
      S.hitT = HIT_EVERY; S.hits++;
      const p = c.clone().add(V().set((Math.random() - 0.5) * 0.4 * e.scale, (Math.random() - 0.3) * 0.5 * e.scale, 0)).addScaledVector(toCam, 0.2);
      const ice = S.hits % ICE_EVERY === 0;
      C.hit(e, C.punchDmg() * (ice ? 4 : 1), p);
      C.effects.impact(p); if (Math.random() < 0.45) C.sfx.chop();
      S.gauge = Math.min(1, S.gauge + 0.006);
      if (e.alive && !e.def.boss) { e.stagger = 1; e.kick = 0.25; if (e.interrupt) e.interrupt(); }
      if (e.alive) e.slowT = Math.max(e.slowT || 0, e.def.boss ? 0.5 : 1.4); // every punch freezes
      if (ice && e.alive) { e.slowT = e.def.boss ? 1.2 : 3; C.effects.ice(p, 14); for (const f of S.ghosts) f.material = ICE; C.pop(e, 'ICE FIST!', '#a0f0ff'); C.sfx.zap(); setTimeout(() => { for (const f of S.ghosts) f.material = TRIM; }, 150); }
      else if (Math.random() < 0.3) C.effects.ice(p, 2);
      if (S.od > 0 && S.hits >= S.odHits) { S.target = null; S.state = 'guard'; for (const f of S.ghosts) f.visible = false; }
    }
  }
  S.g.position.copy(S.pos); S.g.lookAt(c.x, S.pos.y, c.z); S.g.rotateY(Math.PI);
}

function slam(dt) {
  S.t += dt;
  const at = S.slamAt;
  if (S.t < 0.35) { S.pos.lerp(at.clone().add(V().set(0, 1.4, 0)), Math.min(1, dt * 14)); S.armL.rotation.x = S.armR.rotation.x = -2.8; }
  else if (!S.slammed) {
    S.slammed = true; S.pos.copy(at);
    C.effects.explosion(at.clone().setY(0.3), 0.9); C.effects.dust(at.clone().setY(0.1), 20); C.effects.ice(at.clone().setY(0.5), 18);
    C.sfx.explode(); C.shake(0.5);
    for (const e of C.G.enemies) {
      if (!hittable(e)) continue;
      const d = e.pos.distanceTo(at); if (d > 3.3) continue;
      const c = e.centerWorld(V());
      C.hit(e, C.punchDmg() * 7 * (1 - d / 5), c);
      if (e.alive) { e.slowT = Math.max(e.slowT || 0, e.def.boss ? 1 : 2.5); if (!e.def.boss) { const out = e.pos.clone().sub(at).setY(0).normalize(); e.pos.addScaledVector(out, 1.3 * (1 - d / 4)); e.stagger = 1; if (e.interrupt) e.interrupt(); } }
    }
    C.popAt(at.clone().add(V().set(0, 1.6, 0)), 'SHOCKWAVE!', '#80ffff');
    S.gauge = Math.min(1, S.gauge + 0.08);
  } else if (S.t > 0.75) { S.state = 'return'; S.slammed = false; }
  S.g.position.copy(S.pos);
}

// called every frame with REAL time (it keeps full speed while OVERDRIVE slows the world)
export function spiritUpdate(dt, active, equipped) {
  if (!S) { if (!active) return; ensure(); }
  if (!active) { if (S.g.visible) spiritShow(false); S.od = 0; return; }
  if (!S.g.visible) spiritShow(true);
  S.t += dt; S.laserT -= dt; S.slamT -= dt; S.holdT -= dt;
  const home = homePos(S.home);
  const fighting = C.inCombat();
  if (!fighting && S.state !== 'guard' && S.state !== 'return') { S.target = null; S.shot = null; S.state = 'return'; }
  if (S.state === 'guard' || S.state === 'return') {
    S.pos.lerp(home, Math.min(1, dt * (S.state === 'return' ? 14 : 8)));
    if (S.state === 'return' && S.pos.distanceTo(home) < 0.15) { S.state = 'guard'; S.thinkT = 0.25; }
    S.g.position.copy(S.pos); S.g.position.y += Math.sin(S.t * 2.5) * 0.04;
    S.g.rotation.set(0, C.yaw() + Math.sin(S.t * 0.9) * 0.08, 0);
    S.armL.rotation.x = Math.sin(S.t * 2) * 0.1 - 0.4; S.armR.rotation.x = -Math.sin(S.t * 2) * 0.1 - 0.4; // fists up: on guard
    for (const f of S.ghosts) f.visible = false;
    if (fighting) {
      // 1. protect you: shots first
      const shot = threatShot();
      if (shot) {
        const ds = shot.mesh.position.distanceTo(S.pos.clone().add(V().set(0, 1.2, 0)));
        if (ds < 4) { S.shot = shot; S.state = 'intercept'; S.t = 0; }
        else if (S.laserT <= 0) { laser(shot.mesh.position.clone()); C.effects.pop(shot.mesh.position.clone()); shot.kill(); C.orb(); S.laserT = 0.7; }
      } else if (S.laserT <= 0) {
        // 2. finger laser: cancel an attack that's winding up
        const w = C.G.enemies.find((e) => hittable(e) && e.atkState === 'wind');
        if (w) { const c = w.centerWorld(V()); laser(c); if (w.interrupt) w.interrupt(); w.atkState = 'recover'; w.timer = 0.6; w.slowT = Math.max(w.slowT || 0, 1.2); C.hit(w, C.punchDmg() * 3, c); C.pop(w, 'CANCELLED', '#80ffff'); S.laserT = 1.6; }
        else S.laserT = 0.15;
      }
      S.thinkT -= dt;
      if (S.state === 'guard' && S.thinkT <= 0 && S.holdT <= 0) {
        S.thinkT = 0.35;
        if (S.od > 0) {
          while (S.odQueue.length && !hittable(S.odQueue[0])) S.odQueue.shift();
          if (S.odQueue.length) { focusOn(S.odQueue.shift()); S.hits = 0; S.odHits = 10; }
        } else {
          // 3. bunched-up enemies: SHOCKWAVE
          const cl = S.slamT <= 0 ? cluster() : null;
          if (cl) { S.slamAt = cl.at.setY(0); S.state = 'slam'; S.t = 0; S.slammed = false; S.slamT = 9; C.sfx.slash(); }
          else { const t = pickTarget(); if (t) { focusOn(t); S.hits = 0; S.odHits = 1e9; } } // 4. pick a fight and finish it
        }
      }
    }
  } else if (S.state === 'intercept') intercept(dt);
  else if (S.state === 'dash' || S.state === 'punch') punch(dt);
  else if (S.state === 'slam') slam(dt);
  setTag(S.od > 0 ? 'od' : focused() ? 'focus' : 'guard');
  S.tag.material.opacity = equipped || focused() ? 1 : 0.55;
  S.aura.material.opacity = (S.od > 0 ? 0.75 : focused() ? 0.55 : 0.4) + Math.sin(S.t * 6) * 0.08;
  S.aura.material.color.set(focused() ? 0xff9a40 : 0x40c8ff);
  if (S.od > 0) { S.od -= dt; if (S.od <= 0 || (!S.odQueue.length && S.state === 'guard')) { S.od = 0; C.post.grade(C.moodGrade()); } }
}
export function spiritFill() { ensure(); S.gauge = 1; } // dev / tests
