// GRAVEYARD SHIFT: a legendary fighting spirit (an original "guardian spirit" in the style of
// fighting-spirit anime). Once you pick it up it stays out for the rest of the run, whatever
// weapon you're holding (drop it and it's gone). While you hold something else it fights on its
// own: it barrages the nearest enemy every few seconds. Every punch FREEZES what it hits.
// Select it to command it directly:
//   - CLICK/TAP an enemy: it dashes over and unloads a blur of punches, then snaps back.
//     Clicking an incoming shot punches it out of the air.
//   - FINGER LASER (automatic): every couple of seconds it shoots an enemy that is winding up an
//     attack (cancelling it) or a shot that's about to hit you.
//   - LUCK: while it's out, 15% of hits on you are shrugged off and weapon drops are luckier.
//   - OVERDRIVE: punches fill a gauge; when it's full press RELOAD (R / right click / RELOAD button):
//     time slows to a crawl and the spirit punches every enemy in the room.
import * as THREE from '../vendor/three.module.min.js';
import * as TX from '../engine/textures.js';

let C = null, S = null;
const V = () => new THREE.Vector3();
const mat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
const BODY = mat(0x40d8ff, 0.42), TRIM = mat(0xffd860, 0.8), EYES = mat(0xffffff, 1), GHOST = mat(0x60e0ff, 0.25);

function box(g, w, h, d, m, x, y, z) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); g.add(o); return o; }

function buildSpirit() {
  const g = new THREE.Group();
  box(g, 0.5, 0.62, 0.28, BODY, 0, 1.25, 0);               // torso
  box(g, 0.52, 0.08, 0.3, TRIM, 0, 1.52, 0);               // shoulder line
  box(g, 0.3, 0.3, 0.28, BODY, 0, 1.75, 0);                // head
  box(g, 0.22, 0.05, 0.02, EYES, 0, 1.78, -0.145);         // visor eyes
  box(g, 0.34, 0.08, 0.3, TRIM, 0, 1.93, 0);               // crown band
  const armL = new THREE.Group(); armL.position.set(-0.34, 1.48, 0); g.add(armL);
  const armR = new THREE.Group(); armR.position.set(0.34, 1.48, 0); g.add(armR);
  for (const a of [armL, armR]) { box(a, 0.15, 0.5, 0.15, BODY, 0, -0.25, 0); box(a, 0.2, 0.2, 0.2, TRIM, 0, -0.55, 0); }
  box(g, 0.42, 0.4, 0.24, GHOST, 0, 0.78, 0);              // fading legs
  box(g, 0.3, 0.3, 0.2, GHOST, 0, 0.45, 0.05);
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glow(), color: 0x40c8ff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
  aura.scale.set(1.6, 2.2, 1); aura.position.y = 1.3; g.add(aura);
  g.scale.setScalar(0.82);
  return { g, armL, armR, aura };
}

export function initSpirit(ctx) { C = ctx; }
export const spiritOverdrive = () => !!(S && S.od > 0);
export const spiritGauge = () => (S ? S.gauge : 0);

function ensure() {
  if (S) return S;
  const m = buildSpirit();
  S = { ...m, state: 'idle', t: 0, target: null, home: V(), pos: V(), laserT: 1, gauge: 0, od: 0, odQueue: [], hits: 0, ghosts: [] };
  C.scene.add(S.g); S.g.visible = false;
  for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), TRIM); f.visible = false; C.scene.add(f); S.ghosts.push(f); }
  return S;
}

// where it floats when idle: beside you, a little ahead, so you can see it
function homePos(out) {
  const cam = C.camera;
  return cam.localToWorld(out.set(C.PC ? 1.55 : 0.8, -1.5, C.PC ? -2.9 : -2.5));
}

export function spiritShow(on) {
  ensure();
  S.g.visible = on;
  if (on) { homePos(S.pos); S.g.position.copy(S.pos); S.state = 'idle'; }
  for (const f of S.ghosts) f.visible = false;
}

// click / tap: barrage the enemy (or punch a shot out of the air)
export function spiritUse(x, y) {
  ensure();
  if (S.state !== 'idle' && S.state !== 'return') return false;
  const t = C.pick(x, y);
  if (!t) { C.marker(x, y, 'miss'); return false; }
  if (t.p) { // a shot: a quick jab destroys it
    C.effects.pop(t.p.mesh.position.clone()); C.effects.sparks(t.p.mesh.position.clone(), 6); t.p.kill(); C.orb(); C.sfx.chop();
    laser(t.p.mesh.position.clone());
    return true;
  }
  startBarrage(t.e, 14);
  C.marker(x, y, '');
  return true;
}

function startBarrage(e, hits) {
  S.target = e; S.state = 'dash'; S.t = 0; S.hitsLeft = hits; S.hitT = 0;
  C.sfx.slash();
}

function laser(to) {
  const from = S.g.localToWorld(V().set(0.34, 0.95, -0.2));
  C.effects.beam(from, to, 0x80ffff, 0.04, 0.12);
  C.effects.glowAt(to, 0x80ffff, 0.5, 0.1);
  C.sfx.zap();
}

// RELOAD with a full gauge
export function spiritOverdriveStart() {
  ensure();
  if (S.gauge < 1 || S.od > 0) return false;
  const foes = C.G.enemies.filter((e) => e.alive && e.targetable);
  if (!foes.length) return false;
  S.gauge = 0; S.od = 4.5; S.odQueue = foes.slice(0, 10);
  C.post.u.flash.value = 0.6; C.post.u.flashCol.value.set(0xffe080);
  C.post.grade({ tint: 0xffe8b0, lift: 0x080600, sat: 0.55, contrast: 1.2 });
  C.banner('OVERDRIVE', 'THE SPIRIT TAKES OVER');
  return true;
}

// called every frame with REAL time (it keeps full speed while OVERDRIVE slows the world)
export function spiritUpdate(dt, active, equipped) {
  if (!S) { if (!active) return; ensure(); }
  if (!active) { if (S.g.visible) spiritShow(false); S.od = 0; return; }
  if (!S.g.visible) spiritShow(true);
  S.t += dt;
  const home = homePos(S.home);
  const G = C.G;
  // idle float
  if (S.state === 'idle' || S.state === 'return') {
    const k = S.state === 'return' ? 14 : 8;
    S.pos.lerp(home, Math.min(1, dt * k));
    if (S.state === 'return' && S.pos.distanceTo(home) < 0.1) S.state = 'idle';
    S.g.position.copy(S.pos); S.g.position.y += Math.sin(S.t * 2.5) * 0.04;
    S.g.rotation.y = C.yaw() + Math.sin(S.t * 0.9) * 0.08;
    S.armL.rotation.x = Math.sin(S.t * 2) * 0.1; S.armR.rotation.x = -Math.sin(S.t * 2) * 0.1;
    for (const f of S.ghosts) f.visible = false;
    // fighting on its own while you hold another weapon
    if (!equipped && S.state === 'idle' && S.od <= 0) {
      S.autoT = (S.autoT ?? 2) - dt;
      if (S.autoT <= 0 && C.inCombat()) {
        S.autoT = 3.5;
        let best = null, bd = 1e9;
        for (const e of G.enemies) { if (!e.alive || !e.targetable || e.off) continue; const d = e.pos.distanceTo(C.camera.position); if (d < bd) { bd = d; best = e; } }
        if (best) startBarrage(best, 8);
      }
    }
    // next OVERDRIVE victim
    if (S.od > 0 && S.state === 'idle') { while (S.odQueue.length && !S.odQueue[0].alive) S.odQueue.shift(); if (S.odQueue.length) startBarrage(S.odQueue.shift(), 10); }
  }
  if (S.state === 'dash' || S.state === 'punch') {
    const e = S.target;
    if (!e || !e.alive) { S.state = 'return'; }
    else {
      const c = e.centerWorld(V());
      const toCam = C.camera.position.clone().sub(c).setY(0).normalize();
      const spot = c.clone().addScaledVector(toCam, 0.75 * e.scale + 0.35); spot.y = Math.max(0, c.y - 1.15);
      if (S.state === 'dash') {
        S.pos.lerp(spot, Math.min(1, dt * 22));
        if (S.pos.distanceTo(spot) < 0.2) { S.state = 'punch'; S.t = 0; }
      } else {
        S.pos.copy(spot);
        S.hitT -= dt;
        // a blur of fists
        S.armL.rotation.x = -1.5 + Math.sin(S.t * 70) * 0.5; S.armR.rotation.x = -1.5 + Math.cos(S.t * 70) * 0.5;
        for (const f of S.ghosts) { f.visible = true; f.position.copy(c).add(V().set((Math.random() - 0.5) * 0.6 * e.scale, (Math.random() - 0.3) * 0.7 * e.scale, (Math.random() - 0.5) * 0.3)).addScaledVector(toCam, 0.3); }
        if (S.hitT <= 0) {
          S.hitT = 0.05; S.hitsLeft--;
          const p = c.clone().add(V().set((Math.random() - 0.5) * 0.4 * e.scale, (Math.random() - 0.3) * 0.5 * e.scale, 0)).addScaledVector(toCam, 0.2);
          C.hit(e, C.punchDmg(), p);
          C.effects.impact(p); if (Math.random() < 0.5) C.sfx.chop();
          S.gauge = Math.min(1, S.gauge + 0.012);
          if (e.alive && !e.def.boss) { e.stagger = 1; e.kick = 0.25; if (e.interrupt) e.interrupt(); }
          if (e.alive) { e.slowT = Math.max(e.slowT || 0, e.def.boss ? 0.6 : 1.6); if (Math.random() < 0.4) C.effects.ice(p, 2); } // its touch freezes
        }
        if (S.hitsLeft <= 0 || !e.alive) { C.pop(e, S.od > 0 ? 'OVERDRIVE!' : 'BARRAGE!', '#80ffff'); S.state = 'return'; for (const f of S.ghosts) f.visible = false; }
      }
      S.g.position.copy(S.pos); S.g.lookAt(c.x, S.pos.y, c.z); S.g.rotateY(Math.PI);
    }
  }
  S.aura.material.opacity = (S.od > 0 ? 0.75 : 0.4) + Math.sin(S.t * 6) * 0.08;
  // finger laser: cancel a wind-up or a shot that's about to land
  S.laserT -= dt;
  if (S.laserT <= 0 && S.state === 'idle') {
    let done = false;
    for (const pr of G.projectiles) {
      if (!pr.alive || pr.off) continue;
      if (pr.mesh.position.distanceTo(C.camera.position) < 3.2) { laser(pr.mesh.position.clone()); C.effects.pop(pr.mesh.position.clone()); pr.kill(); C.orb(); done = true; break; }
    }
    if (!done) for (const e of G.enemies) {
      if (!e.alive || e.off || e.atkState !== 'wind' || !e.targetable) continue;
      const c = e.centerWorld(V()); laser(c); e.interrupt && e.interrupt(); e.atkState = 'recover'; e.timer = 0.6;
      C.hit(e, C.punchDmg() * 2, c); C.pop(e, 'CANCELLED', '#80ffff'); done = true; break;
    }
    S.laserT = done ? 2.2 : 0.2;
  }
  if (S.od > 0) { S.od -= dt; if (S.od <= 0 || (!S.odQueue.length && S.state === 'idle')) { S.od = 0; C.post.grade(C.moodGrade()); } }
}
export function spiritFill() { ensure(); S.gauge = 1; } // dev / tests
