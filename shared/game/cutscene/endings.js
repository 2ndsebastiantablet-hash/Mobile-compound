// The four endings, one per difficulty, played when you beat the Chairman on floor 30.
//   EASY        SEVERANCE PACKAGE    - detonate the tower, dive out of the window, land in the paper recycling, walk away
//   MEDIUM      HOSTILE TAKEOVER     - take the crown; the hooded board comes out of the elevator and kneels
//   HARD        UNFINISHED BUSINESS  - the Easy escape, then 2 years later a stranger leaves a briefcase at a diner
//   EXTRA HARD  THE LAST SHIFT       - you see what the supplement made of you, leap into the street and scream at the city
import * as THREE from '../../vendor/three.module.min.js';
import { Cutscene, V, tween, smooth, easeIO, easeOut, easeIn, linear, lerp, rnd } from './engine.js';
import { makePlayer, makeCloak, makeStranger, makeMutant, walkTo, turnTo, part, piv, col, pistol, detonator, briefcase, burger, crown } from './rig.js';
import { buildBoardroom, buildCity, buildDiner, buildSunset, renderPhoto, FLOOR_H, TOWER_H, glowSprite } from './sets.js';
import { au, bed } from './audio.js';

export const ENDING_NAMES = ['SEVERANCE PACKAGE', 'HOSTILE TAKEOVER', 'UNFINISHED BUSINESS', 'THE LAST SHIFT'];

export function playEnding(diff, ctx) {
  const cs = new Cutscene(ctx);
  const script = [easy, medium, hard, xhard][diff] || medium;
  cs.ctx.post.u.lowHp.value = 0; cs.ctx.post.u.hurt.value = 0; cs.ctx.post.u.dissolve.value = 0;
  cs.run(function* () { yield* script(cs, ctx); cs.finish(); });
  return cs;
}

// ------------------------------------------------------------------ shared helpers
const POSE = {
  stand: { hipL: [0], hipR: [0], knL: [0], knR: [0], shL: [0, 0, 0.05], shR: [0, 0, -0.05], elL: [-0.12], elR: [-0.12], spine: [0], neck: [0], haL: [0], haR: [0], off: [0, 0, 0] },
  sit: { hipL: [-1.5, 0, 0.06], hipR: [-1.5, 0, -0.06], knL: [1.5], knR: [1.5], spine: [0.1], neck: [0], off: [0, -0.44, 0], shL: [-0.55, 0, 0.12], shR: [-0.55, 0, -0.12], elL: [-1.0], elR: [-1.0] },
  kneel: { hipR: [-1.45], knR: [1.5], hipL: [0.15], knL: [1.75], spine: [0.45], neck: [0.45], off: [0, -0.42, 0], shL: [0.1, 0, 0.08], shR: [0.1, 0, -0.08], elL: [-0.3], elR: [-0.3] },
  dive: { shL: [-3.0, 0, 0.15], shR: [-3.0, 0, -0.15], elL: [-0.1], elR: [-0.1], hipL: [0.15], hipR: [0.05], knL: [0.3], knR: [0.15], neck: [-0.7], spine: [-0.1] },
  crouch: { hipL: [-1.2, 0, 0.2], hipR: [-1.2, 0, -0.2], knL: [2.0], knR: [2.0], spine: [0.6], neck: [-0.5], off: [0, -0.5, 0.1], shL: [-0.6, 0, 0.3], shR: [-1.2, 0, -0.2], elL: [-0.3], elR: [-0.2] },
};
const gradeNow = (cs, g) => { const p = cs.ctx.post; p.grade(g); p.u.tint.value.set(g.tint); p.u.lift.value.set(g.lift); p.u.sat.value = g.sat; p.u.contrast.value = g.contrast; };
function addRig(cs, rig, parent) { (parent || cs.set.group).add(rig.root); cs.every((w) => rig.update(w)); return rig; }

// first-person camera: position + yaw (0 looks down -z, + turns left) + pitch, with walking bob
function fpCam(cs) {
  const f = { pos: V(), yaw: 0, pitch: 0, roll: 0, bob: 0, bobAmt: 0, on: true };
  cs.every(() => {
    if (!f.on) return;
    const bx = Math.sin(f.bob) * 0.04 * f.bobAmt, by = Math.abs(Math.cos(f.bob)) * 0.07 * f.bobAmt, cy = Math.cos(f.pitch);
    cs.cam.pos.set(f.pos.x + Math.cos(f.yaw) * bx, f.pos.y + by, f.pos.z - Math.sin(f.yaw) * bx);
    cs.cam.look.set(cs.cam.pos.x - Math.sin(f.yaw) * cy, cs.cam.pos.y + Math.sin(f.pitch), cs.cam.pos.z - Math.cos(f.yaw) * cy);
    cs.cam.roll = f.roll + Math.sin(f.bob) * 0.015 * f.bobAmt;
  });
  return f;
}
function* look(f, yaw, pitch, d, ez = easeIO) { const y0 = f.yaw, p0 = f.pitch; yield* tween(d, (k) => { if (yaw != null) f.yaw = lerp(y0, yaw, k); if (pitch != null) f.pitch = lerp(p0, pitch, k); }, ez); }
function* fpWalk(f, to, speed, o = {}) {
  const from = f.pos.clone(), d = from.distanceTo(to), dur = d / speed;
  let t = 0, step = 0;
  while (t < dur) {
    const dt = yield; t += dt;
    const k = Math.min(1, t / dur), e = o.ease ? o.ease(k) : k;
    f.pos.lerpVectors(from, to, e);
    f.bob += dt * (o.run ? 13 : 8.5); f.bobAmt = Math.min(o.run ? 1.6 : 1, f.bobAmt + dt * 4);
    if (Math.floor(f.bob / Math.PI) !== step) { step = Math.floor(f.bob / Math.PI); o.onStep && o.onStep(); }
  }
  f.bobAmt = 0;
}
// first-person arms (in camera space), dressed like the player
function fpArms(cs, src) {
  const g = new THREE.Group(); cs.camera.add(g);
  const fore = src.elR.children[0].material, hand = src.handR.material;
  const mk = (s) => {
    const a = new THREE.Group(); a.position.set(s * 0.22, -0.8, -0.2); g.add(a);
    part(a, 0.07, 0.07, 0.42, Array.isArray(fore) ? fore[0] : fore, 0, 0, -0.2);
    const h = piv(a, 0, 0, -0.42); part(h, 0.085, 0.055, 0.1, hand, 0, 0, -0.03);
    return { a, h };
  };
  const arms = { g, R: mk(1), L: mk(-1) };
  arms.to = function* (arm, pos, rot, d, ez = easeIO) {
    const a = arms[arm].a, p0 = a.position.clone(), r0 = V(a.rotation.x, a.rotation.y, a.rotation.z);
    yield* tween(d, (k) => { a.position.lerpVectors(p0, pos, k); a.rotation.set(lerp(r0.x, rot.x, k), lerp(r0.y, rot.y, k), lerp(r0.z, rot.z, k)); }, ez);
  };
  return arms;
}
// keep something burning while the set is on screen
function* emitter(cs, setName, kind, pos, every, n, o = {}) { while (cs.alive && cs.set === cs.sets[setName]) { cs.fx.emit(kind, typeof pos === 'function' ? pos() : pos, n, o); yield every; } }
function* bedLoop(cs, kind, vol, until) { const b = bed(kind, vol); while (cs.alive && (!until || !until())) { b.fn(0); yield 0.5; } }
function flicker(cs, light, base, amt = 0.25, speed = 18) { cs.every(() => { light.intensity = base.v * (1 - amt + Math.random() * amt * (0.5 + 0.5 * Math.sin(cs.time * speed))); }); }

// small fires and smoke around the dead Chairman
function boardroomAmbience(cs, B) {
  cs.run(emitter(cs, 'board', 'fire', V(-1.55, 0.25, -5.1), 0.08, 2, { s: 0.45, spread: 0.3, v: 0.5 })).fire = true;
  cs.run(emitter(cs, 'board', 'fire', V(3.1, 0.3, -6.8), 0.1, 1, { s: 0.35, spread: 0.2, v: 0.4 }));
  cs.run(emitter(cs, 'board', 'smoke', V(-1.9, 0.6, -5.5), 0.3, 1, { s: 0.6, spread: 0.6, v: 0.4 }));
  cs.run(emitter(cs, 'board', 'ember', V(-1.6, 0.4, -5.1), 0.25, 1, { v: 0.5, spread: 0.4 }));
  cs.run(emitter(cs, 'board', 'haze', V(0, 2.2, -5), 1.2, 1, { spread: 4 }));
  const fb = { v: 2.2 }; flicker(cs, B.lights.fire, fb, 0.45, 23);
  return fb;
}

// ------------------------------------------------------------------ the escape: detonate, run, dive (EASY + HARD)
function* escape(cs, ctx) {
  const B = cs.addSet('board', buildBoardroom());
  const C = cs.addSet('city', buildCity());
  cs.use('board'); gradeNow(cs, B.grade);
  const player = makePlayer(ctx.char);
  const f = fpCam(cs); f.pos.set(-0.3, 1.62, 1.4); f.yaw = 0.27; f.pitch = -0.2;
  const arms = fpArms(cs, player);
  const gun = pistol(); gun.position.set(0, 0.03, -0.06); gun.rotation.x = 0.1; arms.R.h.add(gun);
  const det = detonator(); det.position.set(0.0, 0.06, -0.05); det.rotation.set(-0.95, 0.2, 0); arms.L.h.add(det);
  arms.R.a.position.set(0.16, -0.21, -0.22); arms.R.a.rotation.set(0.1, 0.22, 0);
  boardroomAmbience(cs, B);
  cs.run(bedLoop(cs, 'fire', 0.8, () => cs.set !== B));
  cs.fadeCol = '#fff'; cs.fadeV = 1; cs.handheld = 0.5;
  yield* cs.fade(0, 1.4);
  au.breath(0); au.breath(2.2);
  // lower the gun, look at what's left of him
  cs.run(arms.to('R', V(0.25, -0.5, -0.2), V(-0.5, 0.25, 0), 2.2));
  yield* look(f, 0.25, -0.3, 2.4);
  // the detonator
  yield* arms.to('L', V(-0.15, -0.36, -0.2), V(0.95, -0.25, 0), 1.0, easeOut);
  let blink = true;
  cs.run(function* () { while (blink && cs.alive) { det.led.visible = !det.led.visible; yield 0.25; } det.led.visible = true; });
  yield 1.0;
  yield* tween(0.15, (k) => { det.btn.position.y = 0.066 - 0.006 * k; });
  au.click(); blink = false;
  for (let i = 0; i < 4; i++) au.beep(1600 + i * 200, 0.3 + i * 0.28);
  yield 1.4;
  // the first charge goes off below; the alarm starts
  au.boom(0.9); au.rumble(3, 0.4); cs.shake = 0.7;
  const red = { v: 0 }; let alarm = true;
  cs.every(() => { B.lights.red.intensity = alarm ? (0.5 + 0.5 * Math.sin(cs.time * 7)) * 6 : B.lights.red.intensity; });
  cs.run(function* () { while (alarm && cs.alive) { au.klaxon(); yield 0.9; } });
  cs.run(function* () { for (let i = 0; i < 40 && cs.set === B; i++) { cs.fx.emit('ceilingdust', V(rnd(-5, 5), 3.5, rnd(-10, 2)), 3, { spread: 0.3 }); yield 0.08; } });
  const w1 = { v: 7 }, w2 = { v: 6 }; flicker(cs, B.lights.warm1, w1, 0.6, 30); flicker(cs, B.lights.warm2, w2, 0.6, 27);
  cs.run(arms.to('L', V(-0.25, -0.7, -0.1), V(-0.6, 0, 0), 0.8));
  yield 0.5;
  // the elevator blows in
  yield* look(f, -0.62, -0.05, 0.45, easeOut);
  B.lights.spot.intensity = 0;
  const ep = V(6.2, 1.4, -5.5);
  cs.fx.boom(ep, 2.2, { dir: V(-4, 0, 0) }); cs.debris.burst('metal', ep, 14, 7, V(-6, 1, 0), { floor: 0 }); cs.debris.burst('concrete', ep, 14, 5, V(-4, 1, 0));
  for (const [i, d] of B.doors.entries()) cs.run(tween(1.2, (k) => { d.position.x = 6.36 - k * 3.5; d.position.y = 1.2 + Math.sin(k * Math.PI) * 0.8 - k * 0.9; d.rotation.set(k * 2 * (i ? -1 : 1), 0, k * 1.6); }, easeOut));
  au.boom(1.6); cs.shake = 1.4; cs.ctx.post.u.flash.value = 0.5; cs.ctx.post.u.flashCol.value.set(0xffa040);
  cs.run(emitter(cs, 'board', 'fire', V(6.0, 1.2, -5.5), 0.05, 3, { s: 1.2, spread: 0.8, dir: V(-1.5, 0, 0) }));
  cs.run(emitter(cs, 'board', 'smoke', V(5.6, 2.2, -5.5), 0.15, 2, { s: 1.2, spread: 0.8, dir: V(-1, 0, 0) }));
  B.lights.fire.position.set(5.2, 1.4, -5.5); const fb2 = { v: 6 }; flicker(cs, B.lights.fire, fb2, 0.5, 20);
  yield 0.35;
  // turn and run for the window
  yield* look(f, 1.22, 0.02, 0.55, easeIO);
  cs.run(arms.to('R', V(0.2, -0.32, -0.25), V(0.4, 0, 0), 0.3));
  cs.run(arms.to('L', V(-0.2, -0.36, -0.22), V(0.3, 0, 0), 0.3));
  cs.run(function* () { // arms pump while running
    let t = 0; while (t < 1.4) { t += yield; arms.R.a.position.y = -0.34 + Math.sin(t * 13) * 0.07; arms.L.a.position.y = -0.34 - Math.sin(t * 13) * 0.07; }
  });
  cs.run(function* () { yield 0.5; au.boom(1.2); cs.fx.boom(V(2, 1.5, -9), 2.4); cs.shake = 1.0; yield 0.45; au.boom(1.4); cs.fx.boom(V(-2, 2.5, -10), 2.6); cs.shake = 1.2; });
  yield* fpWalk(f, V(-5.55, 1.66, -0.75), 4.2, { run: true, onStep: () => au.step(false) });
  // through the glass
  B.panes[1].visible = false;
  au.glass(); au.whoosh(0, 0.8);
  cs.debris.burst('glass', V(-6.4, 1.7, -0.75), 40, 4, V(-4, 1, 0), { floor: -50, s: 0.25 });
  yield* tween(0.22, (k) => { f.pos.x = -5.55 - k * 1.3; f.pos.y = 1.66 + k * 0.25; f.pitch = 0.02 - k * 0.2; });
  alarm = false;

  // ---- outside: the dive, in slow motion
  cs.use('city'); gradeNow(cs, { tint: 0xffe0c8, lift: 0x06030a, sat: 1.1, contrast: 1.12 });
  f.on = false; arms.g.visible = false;
  cs.handheld = 0.35;
  const P = addRig(cs, makePlayer(ctx.char));
  const win = C.panes[4], wy = TOWER_H - FLOOR_H;
  P.root.position.set(1.5, wy + 1.0, 11.2); P.root.rotation.set(1.35, 0, 0);
  P.set(POSE.dive, true);
  cs.place(V(5.0, wy + 0.6, 18.2), V(1.6, wy + 1.2, 13.6), 40);
  C.lights.fireL.position.set(2.5, wy + 1.6, 16.5); C.lights.fireL.intensity = 26;
  cs.slow = 0.22;
  win.visible = false;
  const wp = V(1.5, wy + 1.5, 12.4);
  cs.debris.burst('glass', wp, 70, 3.2, V(0, 0.4, 3.5), { floor: -10, s: 0.3, g: 2.2 });
  cs.fx.emit('glint', wp, 50, { spread: 1.2, v: 0.7, dir: V(0, 0, 2) });
  au.glass(); au.wind(4, 0.3);
  cs.run(bedLoop(cs, 'wind', 1, () => cs.set !== C));
  cs.run(function* () { // the fireball chases you out of the window
    yield 1.5;
    au.boom(2.6);
    for (let i = 0; i < 10; i++) { cs.fx.boom(V(rnd(-4, 0), wy + 1.5 + rnd(-0.5, 0.5), 11.8), 1.0, { dir: V(0, 0.5, 2.2) }); yield 0.09; }
  });
  cs.run(function* () { yield 1.5; yield* tween(1.0, (k) => { C.lights.fireL.intensity = 26 + k * 40; }); });
  // slow drift out
  yield* tween(2.9, (k) => {
    P.root.position.set(1.5, wy + 1.0 + Math.sin(k * Math.PI) * 0.5 - k * 0.6, 11.2 + k * 5.2);
    P.root.rotation.x = 1.35 + k * 0.3;
    cs.cam.look.lerp(P.root.position.clone().add(V(0, 0.2, 0)), 0.08);
  }, linear);
  // and fall
  cs.slow = 1;
  P.set({ shL: [-2.2, 0, 0.9], shR: [-2.2, 0, -0.9], hipL: [-0.4], hipR: [0.2], knL: [0.8], knR: [0.4], neck: [-0.3] });
  const fy = P.root.position.y;
  yield* tween(1.1, (k) => {
    P.root.position.y = fy - 30 * k * k; P.root.rotation.x = 1.65 - k * 1.2;
    P.set({ shL: [-2 + Math.sin(cs.time * 9) * 0.6, 0, 1], shR: [-2 - Math.sin(cs.time * 9) * 0.6, 0, -1], hipL: [-0.5 + Math.sin(cs.time * 8) * 0.4], hipR: [-0.5 - Math.sin(cs.time * 8) * 0.4] });
  }, linear);

  // ---- wide: the tower goes up floor by floor
  cs.place(V(-46, 3.2, 96), V(0, 44, 0), 52);
  cs.handheld = 0.6; cs.shake = 0.3;
  C.lights.fireL.intensity = 30;
  for (let fl = 29; fl >= 26; fl--) C.bands[fl].heat = 1;
  cs.every(() => { for (const b of C.bands) { if (b.heat > 0) { const h = b.heat * (0.75 + Math.random() * 0.35); b.mat.color.setRGB(h * 1.6, h * 0.9, h * 0.35); } } });
  cs.run(function* () {
    for (let fl = 25; fl >= 6; fl--) {
      const y = fl * FLOOR_H + 1.5;
      C.bands[fl].heat = 1;
      const face = Math.floor(Math.random() * 3);
      const p = face === 0 ? V(rnd(-10, 10), y, 12.5) : face === 1 ? V(12.5, y, rnd(-10, 10)) : V(-12.5, y, rnd(-10, 10));
      cs.fx.boom(p, 3.5, { dir: face === 0 ? V(0, 0, 5) : V(face === 1 ? 5 : -5, 0, 0) });
      cs.debris.burst('concrete', p, 3, 6, face === 0 ? V(0, 1, 6) : V(face === 1 ? 6 : -6, 1, 0), { s: 0.8, life: 6 });
      C.lights.fireL.position.set(p.x, y, p.z + 6);
      if (fl % 3 === 0) { au.boom(1.8); cs.shake = Math.max(cs.shake, 0.5); }
      yield 0.17;
    }
  });
  cs.run(emitter(cs, 'city', 'smoke', () => V(rnd(-10, 10), TOWER_H - rnd(0, 20), rnd(-10, 12)), 0.08, 2, { s: 6, v: 3, spread: 3 }));
  cs.run(emitter(cs, 'city', 'fire', () => V(rnd(-11, 11), TOWER_H - rnd(0, 12), 12.6), 0.05, 2, { s: 3, v: 2, spread: 1 }));
  P.root.position.set(1.5, 78, 16); P.root.rotation.set(0.3, 0, 0);
  yield* tween(3.6, (k) => {
    P.root.position.y = 78 - 74 * k * k; P.root.rotation.x = 0.3 + k * 6;
    P.set({ shL: [-2 + Math.sin(cs.time * 9) * 0.7, 0, 1], shR: [-2 - Math.sin(cs.time * 9) * 0.7, 0, -1], hipL: [-0.5 + Math.sin(cs.time * 8) * 0.5], hipR: [-0.5 - Math.sin(cs.time * 8) * 0.5] });
    cs.cam.look.y = 44 - k * 8;
  }, linear);

  // ---- street: the paper recycling breaks your fall
  const D = C.dump.position;
  cs.place(V(12.2, 1.25, 21.5), V(7.4, 1.9, 15.2), 50);
  cs.handheld = 0.4;
  C.lights.key.position.set(13, 7, 23); C.lights.key.target.position.set(8.6, 0.8, 16.8); C.lights.key.intensity = 70;
  C.lights.fireL.position.set(4, 30, 14); C.lights.fireL.intensity = 18;
  P.root.rotation.set(0.25, 0.4, 0); P.root.position.set(D.x, 16, D.z);
  P.set({ shL: [-2.6, 0, 0.6], shR: [-2.6, 0, -0.6], hipL: [-0.9], hipR: [-0.5], knL: [1], knR: [0.6], neck: [0.3] }, true);
  cs.run(bedLoop(cs, 'fire', 0.6, () => cs.set !== C));
  yield 0.25;
  yield* tween(0.42, (k) => { P.root.position.y = 16 - 16.4 * k * k; }, linear);
  P.root.visible = false;
  au.paper(); au.thud(0.9); cs.shake = 0.7;
  cs.fx.emit('paper', V(D.x, 1.6, D.z), 160, { spread: 0.9, v: 1.5 });
  cs.debris.burst('paper', V(D.x, 1.6, D.z), 50, 5, V(0, 4, 0), { floor: 0.15, s: 0.22, g: 2.5, life: 7 });
  cs.fx.emit('dust', V(D.x, 1.2, D.z), 10, { s: 0.6, v: 0.3, spread: 1 });
  yield 1.6;
  // you climb out
  P.root.visible = true; P.root.rotation.set(0, 0.1, 0); P.root.position.set(D.x, -0.9, D.z);
  P.set({ ...POSE.stand, neck: [0.1, 0, 0] }, true);
  const papers = [part(P.neck, 0.16, 0.01, 0.12, col(0xf0eee4, true), 0.05, 0.34, 0.02), part(P.spine, 0.14, 0.01, 0.1, col(0xe8e6dc, true), -0.22, 0.64, 0.05)];
  papers[1].rotation.z = 0.4;
  yield* tween(0.7, (k) => { P.root.position.y = -0.9 + 1.0 * k; }, easeOut);
  au.paper();
  yield* tween(0.5, (k) => { P.set({ neck: [0.1, 0.7 * Math.sin(k * Math.PI), 0] }); });
  yield* tween(0.4, (k) => { P.set({ neck: [0.1, -0.6 * Math.sin(k * Math.PI), 0] }); });
  P.set({ shL: [-1.2, 0, 0.3], shR: [-1.2, 0, -0.3], elL: [-0.6], elR: [-0.6] });
  yield* tween(0.9, (k) => {
    P.root.position.set(D.x + 0.2 * k, 0.1 + Math.sin(k * Math.PI) * 0.7 + (1 - k) * 0, D.z + 1.45 * k);
    P.set({ hipL: [-1.2 * Math.sin(k * Math.PI)], knL: [1.4 * Math.sin(k * Math.PI)], hipR: [-0.6 * Math.sin(k * Math.PI)], knR: [0.8 * Math.sin(k * Math.PI)] });
  }, easeIO);
  au.step(); au.step(false, 0.1); P.root.position.y = 0;
  P.set(POSE.stand);
  yield 0.3;
  // dust yourself off, fix the tie
  for (let i = 0; i < 2; i++) { P.set({ shR: [-0.7, 0, 0.5], elR: [-1.6] }); au.whoosh(0, 0.2); yield 0.22; P.set({ shR: [-0.4, 0, 0.1], elR: [-1.0] }); yield 0.22; }
  papers[1].visible = false; cs.debris.spawn('paper', P.spine.getWorldPosition(V()).add(V(0, 0.5, 0.2)), V(0.5, 1, 1), { s: 0.18, floor: 0.12, g: 2 });
  P.set({ shL: [-0.6, 0, 0.5], elL: [-2.0], shR: [-0.6, 0, -0.5], elR: [-2.0], neck: [0.35] }); yield 0.7;
  papers[0].visible = false;
  P.set({ ...POSE.stand, neck: [-0.05] });
  yield 0.4;
  // and walk away without looking back
  cs.run(walkTo(P, [V(9.6, 0, 18.8), V(13.1, 0, 23.6)], { speed: 1.15, onStep: () => au.step() }));
  cs.run(cs.move(5.5, V(14.5, 1.35, 26.4), null, easeIO));
  cs.run(function* () { let t = 0; while (t < 6) { t += yield; C.lights.key.target.position.lerp(P.root.position.clone().add(V(0, 1, 0)), 0.1); } });
  cs.run(function* () { let t = 0; while (t < 5.5) { t += yield; cs.cam.look.lerp(P.root.position.clone().add(V(0, 1.45, 0)), 0.1); } });
  yield 1.6;
  // the top of the tower goes
  au.boom(3); au.rumble(4, 0.7); cs.shake = 0.9;
  cs.ctx.post.u.flash.value = 0.35; cs.ctx.post.u.flashCol.value.set(0xff8030);
  for (let i = 0; i < 6; i++) cs.fx.boom(V(rnd(-10, 10), TOWER_H - rnd(0, 6), 12.5), 6, { dir: V(0, 2, 5) });
  yield* tween(0.6, (k) => { C.lights.fireL.intensity = 18 + 50 * Math.sin(k * Math.PI); });
  yield 2.4;
  return { P, C, B };
}

// ------------------------------------------------------------------ EASY
function* easy(cs, ctx) {
  yield* escape(cs, ctx);
  // hold on the burning tower
  yield* cs.move(2.6, null, V(4, 40, 0), easeIO);
  yield* cs.fade(1, 1.6, '#000');
}

// ------------------------------------------------------------------ MEDIUM
function* medium(cs, ctx) {
  const B = cs.addSet('board', buildBoardroom());
  cs.use('board'); gradeNow(cs, B.grade);
  const player = makePlayer(ctx.char);
  const f = fpCam(cs); f.pos.set(-0.3, 1.62, 1.4); f.yaw = 0.27; f.pitch = -0.2;
  const arms = fpArms(cs, player);
  const gun = pistol(); gun.position.set(0, 0.03, -0.06); gun.rotation.x = 0.1; arms.R.h.add(gun);
  arms.R.a.position.set(0.16, -0.21, -0.22); arms.R.a.rotation.set(0.1, 0.22, 0);
  boardroomAmbience(cs, B);
  cs.run(bedLoop(cs, 'room', 1));
  cs.fadeCol = '#fff'; cs.fadeV = 1; cs.handheld = 0.45;
  yield* cs.fade(0, 1.4);
  au.breath(0); au.breath(2.4);
  cs.run(arms.to('R', V(0.26, -0.8, -0.15), V(-0.7, 0.2, 0), 2.0));
  yield* look(f, 0.25, -0.28, 2.2);
  // look around: the city through the glass, the elevator, his portrait
  yield* look(f, 0.95, 0.02, 1.8);
  yield 0.8;
  yield* look(f, -0.75, 0.05, 2.2);
  yield 0.9;
  // walk up to him
  yield* look(f, 0.2, -0.3, 1.2);
  const stop = V(-1.1, 1.62, -6.7), cpos = B.crown.position;
  let walking = true;
  cs.run(function* () { while (walking) { const dt = yield; const to = cpos.clone().sub(f.pos); f.yaw += (Math.atan2(-to.x, -to.z) - f.yaw) * Math.min(1, dt * 1.5); f.pitch += (Math.atan2(to.y, Math.hypot(to.x, to.z)) * 0.55 - f.pitch) * Math.min(1, dt * 1.5); } });
  yield* fpWalk(f, stop, 1.2, { onStep: () => au.step(true), ease: (k) => smooth(k) * 0.3 + k * 0.7 });
  walking = false;
  yield 0.6;
  // kneel, pick up the crown
  const cw = B.crown.position.clone();
  yield* tween(1.1, (k) => { f.pos.y = lerp(1.62, 1.22, k); const to = cw.clone().sub(f.pos); f.yaw = lerp(f.yaw, Math.atan2(-to.x, -to.z), k * 0.3); f.pitch = lerp(f.pitch, Math.atan2(to.y, Math.hypot(to.x, to.z)), k * 0.4); });
  yield 0.4;
  cs.run(arms.to('R', V(0.12, -0.27, -0.42), V(-0.6, 0.35, 0), 0.9));
  yield* arms.to('L', V(-0.12, -0.27, -0.42), V(-0.6, -0.35, 0), 0.9);
  au.latch(); au.click(0.05);
  // the crown moves into your hands
  B.crown.visible = false;
  const held = crown(0.8); cs.camera.add(held);
  held.position.set(0, -0.3, -0.62); held.rotation.set(0.5, 0, 0);
  const shine = glowSprite(held, 0xffe090, 0.35, 0, 0.1, 0.2, 0.5);
  yield* tween(1.5, (k) => { f.pos.y = lerp(1.22, 1.64, k); f.pitch = lerp(f.pitch, -0.08, k * 0.2); held.position.set(0, lerp(-0.32, -0.16, k), lerp(-0.62, -0.5, k)); held.rotation.x = lerp(0.5, 0.15, k); }, easeIO);
  cs.run(arms.to('R', V(0.14, -0.2, -0.32), V(0.2, 0.25, 0), 0.5));
  cs.run(arms.to('L', V(-0.14, -0.2, -0.32), V(0.2, -0.25, 0), 0.5));
  // look at it for a moment
  cs.run(function* () { let t = 0; while (t < 2) { t += yield; shine.material.opacity = 0.3 + Math.sin(t * 4) * 0.25; held.rotation.y = Math.sin(t * 0.8) * 0.2; } });
  au.pad([62, 66, 69], 2.5, 0.03);
  yield 2.0;
  // and put it on
  cs.run(arms.to('R', V(0.14, 0.12, -0.12), V(1.4, 0.2, 0), 1.0));
  cs.run(arms.to('L', V(-0.14, 0.12, -0.12), V(1.4, -0.2, 0), 1.0));
  yield* tween(1.0, (k) => { held.position.set(0, lerp(-0.16, 0.32, k), lerp(-0.5, -0.08, k)); held.rotation.x = lerp(0.15, -0.3, k); f.pitch = lerp(-0.08, 0.1, k); }, easeIO);
  yield* tween(0.35, (k) => { held.position.set(0, lerp(0.32, 0.215, k), -0.13); held.rotation.x = lerp(-0.3, 0.25, k); f.pitch = lerp(0.1, -0.06, k); }, easeOut);
  au.thud(0.25); au.choir(0, 7);
  cs.run(arms.to('R', V(0.24, -0.8, -0.1), V(-0.6, 0, 0), 0.8));
  cs.run(arms.to('L', V(-0.24, -0.8, -0.1), V(-0.6, 0, 0), 0.8));
  yield* tween(1.2, (k) => { f.pitch = lerp(-0.06, 0.02, k); held.position.y = lerp(0.215, 0.24, k); });
  yield 0.6;

  // ---- third person: the new chairman
  f.on = false; arms.g.visible = false; held.visible = false;
  cs.tasks = cs.tasks.filter((t) => !t.fire); // the fire burns down
  const P = addRig(cs, makePlayer(ctx.char));
  const pc = crown(0.92); pc.position.set(0, 0.35, 0); P.neck.add(pc);
  P.root.position.set(-1.1, 0, -6.7); P.root.rotation.y = 0;
  P.set({ ...POSE.stand, neck: [-0.06] }, true);
  cs.handheld = 0.2;
  cs.place(V(-1.1, 1.76, -5.55), V(-1.1, 1.74, -6.7), 38);
  gradeNow(cs, { tint: 0xffe8d8, lift: 0x080204, sat: 1.15, contrast: 1.16 });
  yield 1.6;
  // the camera slowly backs away; he never looks away from it
  cs.run(cs.path(13.5, [V(-1.1, 1.76, -5.55), V(-0.5, 1.95, -4.4), V(0.1, 2.5, -2.9), V(-0.2, 3.15, -1.3)], (k) => P.root.position.clone().add(V(0, lerp(1.74, 1.2, k), 0)), easeIO));
  cs.run(function* () { let t = 0; while (t < 14) { t += yield; const to = cs.camera.position.clone().sub(P.neck.getWorldPosition(V())); P.set({ neck: [-Math.atan2(to.y, Math.hypot(to.x, to.z)) * 0.6, Math.atan2(to.x, to.z) * 0.8, 0] }); } });
  yield 1.4;
  // the elevator: ding, red light, the board arrives
  au.ding();
  yield 0.6;
  cs.run(tween(1.4, (k) => { B.doors[0].position.z = -5.1 + k * 0.72; B.doors[1].position.z = -5.9 - k * 0.72; }, easeIO));
  cs.run(tween(2, (k) => { B.lights.red.position.set(6.3, 1.6, -5.5); B.lights.red.intensity = k * 5; B.cabGlow.material.color.setRGB(0.4 + k * 2, 0.04, 0.04); }));
  cs.run(emitter(cs, 'board', 'haze', V(6.3, 0.6, -5.5), 0.25, 1, { spread: 0.6, dir: V(-0.6, 0, 0), tint: [1.6, 0.4, 0.4] }));
  const w1 = { v: 7 }, w2 = { v: 6 }; cs.run(tween(4, (k) => { w1.v = 7 - 4 * k; w2.v = 6 - 3.5 * k; B.lights.warm1.intensity = w1.v; B.lights.warm2.intensity = w2.v; }));
  yield 1.0;
  const ring = [55, 100, 145, 190, 235, 285].map((a) => { const r = 2.35, t = a * Math.PI / 180; return V(-1.1 + Math.sin(t) * r, 0, -6.7 + Math.cos(t) * r); });
  const cloaks = [];
  for (let i = 0; i < 6; i++) {
    const c = addRig(cs, makeCloak());
    c.root.position.set(7.3, 0, -5.5 + (i % 2 ? 0.35 : -0.35)); c.root.rotation.y = -Math.PI / 2;
    cloaks.push(c);
    const dest = ring[i];
    cs.run(function* () {
      const via = [[], [], [V(2.5, 0, -8.6)], [V(2.0, 0, -9.2)], [V(2.0, 0, -9.2), V(-1.5, 0, -9.3)], [V(2.0, 0, -9.2), V(-1.5, 0, -9.3), V(-3.6, 0, -8.4)]][i];
      yield* walkTo(c, [V(5.4, 0, -5.5 + (i - 2.5) * 0.1), ...via, dest], { speed: i >= 3 ? 1.35 : 1.0, onStep: () => au.step(true) });
      yield* turnTo(c, Math.atan2(-1.1 - dest.x, -6.7 - dest.z), 0.8);
      c.done = true;
    });
    yield 0.75;
  }
  yield () => cloaks.every((c) => c.done);
  yield 0.6;
  // they kneel together
  for (const c of cloaks) c.set(POSE.kneel);
  au.thud(0.6); au.thud(0.4, 0.08); au.choir(0.1, 6); au.pad([38, 45], 6, 0.08, 0.1, 'sawtooth');
  cs.shake = 0.15;
  P.set({ shL: [0.1, 0, 0.25], shR: [0.1, 0, -0.25] });
  yield 4.2;
  yield* cs.fade(1, 2.2, '#000');
}

// ------------------------------------------------------------------ HARD
function* hard(cs, ctx) {
  const photoRT = renderPhoto(ctx.renderer);
  const prevDispose = () => photoRT.dispose();
  const D = cs.addSet('diner', buildDiner());
  const S = cs.addSet('sunset', buildSunset());
  D.dispose = prevDispose;
  yield* escape(cs, ctx);
  yield* cs.fade(1, 1.2, '#000');
  yield 0.8;
  cs.caption('2 YEARS LATER', 3.2);
  yield 3.6;

  // ---- the diner, from across the street
  cs.use('diner'); gradeNow(cs, D.grade);
  cs.set.rain = true; cs.rain.on = true; cs.rain.mask = D.rainMask; cs.rain.amount = 0.9;
  const rainVol = { v: 1 };
  cs.run(function* () { const b = bed('rain', 1); while (cs.alive && cs.set === D) { b.v = rainVol.v; b.fn(0); yield 0.45; } });
  const P = addRig(cs, makePlayer(ctx.char));
  P.root.position.set(-4.3, 0, 3.1); P.root.rotation.y = Math.PI / 2;
  P.set({ ...POSE.sit, shR: [-0.9, 0, -0.15], elR: [-1.5], shL: [-0.7, 0, 0.15], elL: [-1.2] }, true);
  const bg = burger(); bg.position.set(0.0, -0.1, 0.06); bg.rotation.set(-0.3, 0, 0); P.haR.add(bg);
  // neon flicker, jukebox colours
  cs.every(() => { D.lights.neonL.intensity = 6 * (Math.random() < 0.03 ? 0.2 : 1); D.jukeGlow.material.color.setHSL((cs.time * 0.1) % 1, 1, 0.5).multiplyScalar(2); });
  cs.fadeV = 1;
  cs.place(V(6.2, 1.7, 16.5), V(-3.35, 1.2, 3.4), 42);
  cs.handheld = 0.3;
  cs.run(cs.fade(0, 1.6));
  // a little tune on the jukebox
  let juke = true;
  cs.run(function* () { const notes = [64, 67, 71, 69, 67, 64, 62, 64]; let i = 0; while (juke && cs.alive) { const n = notes[i++ % notes.length]; au.pad([n], 0.5, 0.012, 0, 'triangle'); yield 0.5; } });
  yield* cs.move(4.2, V(1.8, 1.5, 10.2), V(-3.4, 1.15, 3.2), easeIO);

  // ---- inside: eating
  cs.place(V(-2.05, 1.32, 2.0), V(-4.1, 1.12, 3.15), 40);
  rainVol.v = 0.45;
  const eat = function* () {
    P.set({ shR: [-1.55, 0, -0.35], elR: [-1.95] }); yield 0.7;
    au.bite(); bg.scale.set(0.9, 1, 0.82); P.set({ neck: [0.12] }); yield 0.3;
    P.set({ shR: [-0.9, 0, -0.15], elR: [-1.5], neck: [0] });
    for (let i = 0; i < 4; i++) { au.chew(); P.set({ neck: [0.05 + (i % 2) * 0.06] }); yield 0.28; }
  };
  yield* eat();
  yield 0.5;
  P.set({ neck: [0, -0.6, 0] }); yield 1.4; // glance out at the rain
  P.set({ neck: [0, 0, 0] }); yield 0.6;
  yield* eat();
  yield 0.4;

  // ---- first person: the door
  const f = fpCam(cs); f.pos.set(-4.15, 1.22, 3.1); f.yaw = -Math.PI / 2; f.pitch = -0.16;
  P.root.visible = false;
  const arms = fpArms(cs, P);
  const fb = burger(); fb.position.set(0, 0.02, -0.05); fb.scale.set(0.9, 1, 0.82); arms.R.h.add(fb);
  arms.R.a.position.set(0.24, -0.33, -0.2); arms.R.a.rotation.set(0.35, 0.3, 0);
  cs.handheld = 0.2;
  yield 1.0;
  au.bell(); au.creak(); rainVol.v = 1.1;
  cs.run(tween(0.8, (k) => { D.door.rotation.y = -1.3 * k; }, easeOut));
  const X = addRig(cs, makeStranger());
  X.root.position.set(3.6, 0, 6.0); X.root.rotation.y = Math.PI;
  const bc = briefcase(); bc.position.set(0, -0.2, 0.02); bc.rotation.set(Math.PI / 2, 0, Math.PI / 2); X.haR.add(bc);
  X.rest = { shR: [0.05, 0, -0.05], elR: [-0.05] };
  juke = false; au.pad([50, 53, 56], 4, 0.035, 0, 'sawtooth');
  // follow him with your eyes
  cs.run(function* () { while (cs.alive && X.root.visible && !X.seated) { const to = X.neck.getWorldPosition(V()).sub(f.pos); f.yaw += (Math.atan2(-to.x, -to.z) - f.yaw) * 0.06; f.pitch += (Math.atan2(to.y - 0.1, Math.hypot(to.x, to.z)) * 0.5 - 0.1 - f.pitch) * 0.05; yield; } });
  yield* walkTo(X, [V(3.6, 0, 3.3), V(-0.6, 0, 2.15), V(-1.9, 0, 2.15), V(-1.95, 0, 3.1)], { speed: 1.0, onStep: () => au.step(true), turn: 5 });
  au.bell(0.1); cs.run(tween(0.9, (k) => { D.door.rotation.y = -1.3 * (1 - k); }, easeIO)); rainVol.v = 0.45;
  yield* turnTo(X, -Math.PI / 2, 0.7);
  X.set(POSE.sit); X.seated = true;
  yield* tween(0.8, (k) => { X.root.position.x = lerp(-1.95, -2.4, k); });
  yield* look(f, -Math.PI / 2, -0.02, 0.6);
  // the briefcase goes on the table
  X.set({ shR: [-1.3, 0, -0.2], elR: [-0.6] });
  yield 0.6;
  bc.removeFromParent(); bc.position.set(-3.3, 0.79, 3.12); bc.rotation.set(0, -Math.PI / 2, 0); D.group.add(bc);
  au.thud(0.35);
  X.set({ shR: [-0.55, 0, -0.12], elR: [-1.0] });
  // the lights flicker; nobody speaks
  const bl = { v: 3.2 }; let flick = true;
  cs.every(() => { if (flick) D.lights.boothL.intensity = bl.v * (Math.random() < 0.06 ? 0.15 : 1); });
  yield 2.6;
  flick = false; D.lights.boothL.intensity = 3.2;
  // and he leaves
  X.set(POSE.stand);
  yield* tween(0.6, (k) => { X.root.position.x = lerp(-2.4, -1.95, k); });
  X.seated = false;
  cs.run(function* () { while (cs.alive && X.root.visible) { const to = X.neck.getWorldPosition(V()).sub(f.pos); f.yaw += (Math.atan2(-to.x, -to.z) - f.yaw) * 0.05; f.pitch += (-0.02 - f.pitch) * 0.05; yield; } });
  yield* walkTo(X, [V(-1.9, 0, 2.15), V(3.6, 0, 3.2)], { speed: 1.15, onStep: () => au.step(true) });
  au.bell(); au.creak(); rainVol.v = 1.1;
  yield* tween(0.6, (k) => { D.door.rotation.y = -1.3 * k; }, easeOut);
  yield* walkTo(X, [V(3.6, 0, 6.4), V(9, 0, 7)], { speed: 1.2, onStep: () => au.step(true) });
  X.root.visible = false;
  au.bell(0.2); cs.run(tween(0.9, (k) => { D.door.rotation.y = -1.3 * (1 - k); }, easeIO)); rainVol.v = 0.45;
  yield 0.4;

  // ---- the briefcase
  cs.run(arms.to('R', V(0.3, -0.8, -0.1), V(-0.6, 0, 0), 0.6));
  yield* look(f, -Math.PI / 2, -0.62, 1.4);
  yield 0.6;
  cs.run(arms.to('R', V(0.07, -0.35, -0.32), V(-0.9, 0.1, 0), 0.9));
  yield* arms.to('L', V(-0.07, -0.35, -0.32), V(-0.9, -0.1, 0), 0.9);
  fb.visible = false;
  au.latch(); yield 0.3; au.latch(); yield 0.4;
  au.creak();
  const photo = new THREE.Group(); bc.add(photo); photo.position.set(0, 0.072, 0.01); photo.rotation.x = -Math.PI / 2;
  part(photo, 0.42, 0.3, 0.002, col(0xf4f2ea), 0, 0, 0);
  const img = new THREE.Mesh(new THREE.PlaneGeometry(0.39, 0.27), new THREE.MeshBasicMaterial({ map: photoRT.texture })); img.position.z = 0.002; img.userData.own = true; photo.add(img);
  photo.rotation.z = 0.06;
  cs.run(arms.to('R', V(0.12, -0.1, -0.5), V(0.5, 0.1, 0), 1.0));
  cs.run(arms.to('L', V(-0.12, -0.1, -0.5), V(0.5, -0.1, 0), 1.0));
  yield* tween(1.1, (k) => { bc.lid.rotation.x = -1.95 * k; }, easeIO);
  cs.run(arms.to('R', V(0.3, -0.9, -0.1), V(-0.6, 0, 0), 0.45));
  yield* arms.to('L', V(-0.3, -0.9, -0.1), V(-0.6, 0, 0), 0.45);
  // lean in: it's him. On a beach. Alive.
  au.sting();
  yield* tween(2.2, (k) => { f.pos.set(lerp(-4.15, -3.62, k), lerp(1.22, 1.2, k), 3.1); f.pitch = lerp(-0.62, -0.98, k); }, easeIO);
  yield 2.6;
  // look up
  yield* tween(1.6, (k) => { f.pos.set(lerp(-3.62, -4.15, k), 1.22, 3.1); f.pitch = lerp(-0.98, 0.0, k); }, easeIO);
  yield 1.2;
  // get up and go
  yield* tween(1.2, (k) => { f.pos.set(lerp(-4.15, -3.9, k), lerp(1.22, 1.64, k), lerp(3.1, 2.1, k)); f.yaw = lerp(-Math.PI / 2, -1.72, k); }, easeIO);
  cs.run(function* () { yield 3.2; yield* tween(1.2, (k) => { f.yaw = lerp(-1.72, -2.6, k); }); });
  yield* fpWalk(f, V(3.3, 1.64, 2.7), 1.5, { onStep: () => au.step(true) });
  au.bell(); au.creak(); rainVol.v = 1.3;
  cs.run(tween(0.6, (k) => { D.door.rotation.y = -1.3 * k; }, easeOut));
  yield* tween(0.6, (k) => { f.yaw = lerp(-2.6, -Math.PI, k); });
  yield* fpWalk(f, V(3.6, 1.64, 5.2), 1.5, { onStep: () => au.step(true) });

  // ---- outside: the car
  f.on = false; arms.g.visible = false;
  P.root.visible = true; P.set(POSE.stand, true); P.root.position.set(3.6, 0, 5.2); P.root.rotation.y = 0;
  bg.visible = false;
  cs.place(V(-7.2, 1.45, 6.2), V(-1.2, 1.1, 7.6), 46);
  cs.handheld = 0.35;
  rainVol.v = 1.4;
  yield* walkTo(P, [V(1.0, 0, 7.0), V(-1.15, 0, 7.45)], { speed: 1.3, onStep: () => au.step(true) });
  yield* turnTo(P, Math.PI, 0.4);
  const car = D.car;
  au.click(); P.set({ shR: [-1.0, 0, -0.2], elR: [-0.5] });
  yield* tween(0.7, (k) => { car.door.rotation.y = 1.15 * k; }, easeOut);
  yield 0.2;
  yield* tween(0.9, (k) => { P.root.position.set(lerp(-1.15, -1.25, k), 0, lerp(7.45, 8.7, k)); P.root.rotation.y = lerp(Math.PI, Math.PI / 2 + Math.PI, k); P.set({ hipL: [-1.2 * k], knL: [1.2 * k], off: [0, -0.3 * k, 0] }); }, easeIO);
  P.root.visible = false;
  yield* tween(0.5, (k) => { car.door.rotation.y = 1.15 * (1 - k); }, easeIn);
  au.carDoor();
  yield 0.7;
  au.engineStart();
  yield 0.6;
  car.lights(true); D.lights.head.intensity = 30; D.lights.head.position.copy(car.position).add(V(-2.4, 0.7, 0)); D.lights.head.target.position.copy(car.position).add(V(-20, 0, 0));
  au.synthwave(0.6, 6);
  yield 1.0;
  // drive off into the night
  const x0 = car.position.x;
  cs.run(function* () { let t = 0; while (t < 4.4) { t += yield; au.engine(0.12, 45 + t * 14, 0.08); yield 0.1; t += 0.1; } });
  yield* tween(4.4, (k) => {
    car.position.x = x0 - 70 * k * k;
    for (const w of car.wheels) w.rotation.x -= 0.4 * k;
    D.lights.head.position.copy(car.position).add(V(-2.4, 0.7, 0)); D.lights.head.target.position.copy(car.position).add(V(-20, 0, 0));
    cs.cam.look.lerp(car.position.clone().add(V(0, 0.8, 0)), 0.12);
  }, linear);

  // ---- into the neon sunset
  cs.use('sunset'); gradeNow(cs, S.grade); cs.rain.on = false;
  const sc = S.car; sc.rotation.y = Math.PI; sc.position.set(0, 0, 0); sc.beamM.opacity = 0;
  cs.handheld = 0.25;
  const camOff = V(0.0, 1.5, 7.5);
  let speed = 26;
  cs.every((w, dt) => {
    sc.position.z -= speed * dt;
    for (const wh of sc.wheels) wh.rotation.x -= speed * dt / 0.36;
    S.head.position.copy(sc.position).add(V(0, 0.8, -2.4)); S.head.target.position.copy(sc.position).add(V(0, 0, -30));
  });
  cs.place(sc.position.clone().add(camOff), sc.position.clone().add(V(0, 1, -10)), 52);
  cs.fadeV = 0;
  yield* tween(4.5, (k) => { cs.cam.pos.copy(sc.position).add(V(lerp(0, 2.4, k), lerp(1.5, 2.8, k), lerp(7.5, 9.5, k))); cs.cam.look.copy(sc.position).add(V(0, 1, -10)); }, linear);
  // the camera stops; the car keeps going
  const stopAt = cs.cam.pos.clone();
  yield* tween(5.5, (k) => { cs.cam.pos.copy(stopAt).add(V(0, k * 6, -k * 4)); cs.cam.look.lerp(sc.position.clone().add(V(0, 1, -40)), 0.05); }, easeOut);
  yield* cs.fade(1, 2.4, '#000');
}

// ------------------------------------------------------------------ EXTRA HARD
function* xhard(cs, ctx) {
  const B = cs.addSet('board', buildBoardroom());
  const C = cs.addSet('city', buildCity());
  cs.use('board');
  const sick = { tint: 0xe0ffd0, lift: 0x040a02, sat: 1.0, contrast: 1.18 };
  gradeNow(cs, sick);
  const M = makeMutant(ctx.char, ctx.mutTint);
  const f = fpCam(cs); f.pos.set(-0.3, 2.05, 1.4); f.yaw = 0.27; f.pitch = -0.3;
  const arms = fpArms(cs, M);
  for (const s of ['R', 'L']) {
    arms[s].a.scale.set(1.5, 1.5, 1.1);
    for (let k = -1; k <= 1; k++) { const c = part(arms[s].h, 0.022, 0.022, 0.15, col(0x2a2418), k * 0.03, -0.01, -0.13); c.rotation.x = -0.25; }
  }
  arms.R.a.position.set(0.2, -0.3, -0.26); arms.R.a.rotation.set(0.15, 0.3, -0.2);
  arms.L.a.position.set(-0.22, -0.32, -0.26); arms.L.a.rotation.set(0.1, -0.3, 0.2);
  boardroomAmbience(cs, B);
  cs.run(bedLoop(cs, 'room', 1, () => cs.set !== B));
  cs.every(() => { // twitching hands, dripping
    if (!arms.g.visible) return;
    arms.R.a.rotation.z = Math.sin(cs.time * 23) * 0.03 * (Math.random() < 0.1 ? 4 : 1); arms.L.a.rotation.z = Math.cos(cs.time * 19) * 0.03;
  });
  cs.run(function* () { while (cs.alive && arms.g.visible) { for (const s of ['R', 'L']) cs.fx.emit('slime', arms[s].h.getWorldPosition(V()), 1, { spread: 0.02, v: 0.2 }); yield 0.12; } });
  cs.run(function* () { while (cs.alive && cs.set === B) { au.heartbeat(); yield 0.95; } });
  cs.fadeCol = '#fff'; cs.fadeV = 1; cs.handheld = 0.7;
  yield* cs.fade(0, 1.4);
  au.breath(0, true); au.breath(2.0, true);
  yield* look(f, 0.25, -0.34, 2.4);
  // you raise your hands into view: claws, dripping
  cs.run(arms.to('R', V(0.2, -0.24, -0.3), V(0.6, 0.12, -0.35), 1.4));
  yield* arms.to('L', V(-0.21, -0.25, -0.3), V(0.55, -0.12, 0.35), 1.4);
  au.growl(0, 1.0);
  yield* tween(1.2, (k) => { arms.R.a.rotation.z = -0.3 + Math.sin(k * 7) * 0.4; arms.L.a.rotation.z = 0.3 - Math.sin(k * 6) * 0.4; });
  yield 0.6;

  // ---- out of your own head
  addRig(cs, M);
  M.root.position.set(-0.3, 0, 1.4); M.root.rotation.y = Math.PI + 0.27;
  M.set({}, true); M.root.visible = false;
  f.on = false; arms.g.visible = false;
  B.lights.spot.position.set(0.6, 3.5, 3.0); B.lights.spot.target.position.set(-0.3, 1.4, 1.4); B.lights.spot.intensity = 10; B.lights.spot.color.set(0xd8f0d0);
  cs.run(function* () { while (cs.alive && cs.set === B) { for (const o of [M.haL, M.haR, M.jaw]) cs.fx.emit('slime', o.getWorldPosition(V()), 1, { spread: 0.04, v: 0.3 }); for (const t of M.tentacles) if (Math.random() < 0.3) cs.fx.emit('slime', t.segs[t.segs.length - 1].getWorldPosition(V()), 1, { spread: 0.02 }); yield 0.1; } });
  const head = () => M.neck.getWorldPosition(V()).add(V(0, 0.2, 0));
  cs.cam.pos.copy(cs.camera.position);
  // back out of the skull...
  yield* tween(1.8, (k) => { cs.cam.pos.set(-0.3 - 0.15 * k, lerp(2.05, 2.3, k), lerp(1.4, 3.4, k)); cs.cam.look.lerp(head(), 0.06); if (k > 0.35) M.root.visible = true; }, easeIO);
  // ...and slowly around to the front
  au.breath(0, true); au.growl(1.4, 1.6);
  const c0 = V(-0.3, 0, 1.4);
  yield* tween(7.5, (k) => {
    const a = (0.08 + k * 0.95) * Math.PI, r = lerp(1.95, 2.5, k);
    cs.cam.pos.set(c0.x + Math.sin(a) * r * -1, lerp(2.3, 1.95, k), c0.z + Math.cos(a) * r);
    cs.cam.look.lerp(head().add(V(0, -0.35 * k, 0)), 0.08);
    M.set({ neck: [0.05 * Math.sin(cs.time * 3), 0.25 * Math.sin(cs.time * 0.7), 0] });
  }, easeIO);
  au.breath(0, true);
  // it looks at its hands
  cs.run(cs.move(1.6, V(0.95, 2.0, -0.45), null));
  cs.run(function* () { let t = 0; while (t < 4) { t += yield; cs.cam.look.lerp(M.neck.getWorldPosition(V()).add(V(0, -0.1, 0)), 0.08); } });
  M.set({ shL: [-1.35, 0.3, 0.1], shR: [-1.35, -0.3, -0.1], elL: [-1.3], elR: [-1.3], neck: [0.35, 0, 0] });
  yield 1.0;
  au.squelch();
  yield* tween(2.2, (k) => { M.set({ haL: [0, Math.sin(k * 6) * 0.9, 0], haR: [0, -Math.sin(k * 6) * 0.9, 0], neck: [0.35, Math.sin(k * 4) * 0.2, 0] }); });
  au.growl(0, 1.4);
  // at its body
  M.set({ shL: [-0.2, 0, 0.6], shR: [-0.2, 0, -0.6], elL: [-0.4], elR: [-0.4], neck: [0.75, 0.2, 0], haL: [0], haR: [0] });
  M.tentAmp = 1.6; M.tentSpeed = 1.8;
  cs.run(cs.move(2.2, V(0.1, 1.8, -1.0), V(-0.3, 1.5, 1.4)));
  yield 1.6;
  M.set({ neck: [0.6, -0.5, 0] }); yield 1.0;
  // and screams at the window
  M.set({ neck: [-0.4, 0, 0], jaw: [0.7], shL: [-0.3, 0, 1.1], shR: [-0.3, 0, -1.1] });
  au.growl(0, 1.0); au.screech(0.1, 0.9);
  cs.shake = 0.5;
  yield 1.1;
  M.set({ jaw: [0.1] });
  M.tentAmp = 1.2;
  // to the window
  const camAt = V(-1.6, 1.7, -1.9);
  cs.run(cs.move(1.6, camAt, null));
  cs.run(function* () { let t = 0; while (t < 4) { t += yield; cs.cam.look.lerp(M.spine.getWorldPosition(V()).add(V(0, 0.5, 0)), 0.1); } });
  yield* walkTo(M, [V(-2.6, 0, 1.6), V(-5.2, 0, 1.75)], { speed: 2.2, run: true, onStep: () => au.heavyStep(), turn: 5 });
  M.set({ shR: [-2.4, 0.4, -0.3], elR: [-0.3], spine: [-0.1] }); yield 0.18;
  M.set({ shR: [-1.5, -0.3, 0.2], elR: [0], spine: [0.3] });
  B.panes[0].visible = false; au.glass(); au.boom(0.4); cs.shake = 0.6;
  cs.debris.burst('glass', V(-6.4, 1.6, 1.75), 50, 5, V(-5, 1, 0), { floor: -60, s: 0.28 });
  cs.fx.emit('glint', V(-6.4, 1.6, 1.75), 30, { v: 1.2 });
  au.wind(3, 0.35);
  yield 0.35;
  // leap
  const p0 = M.root.position.clone();
  M.set(POSE.crouch); yield 0.3;
  au.growl(0, 0.6);
  M.set({ ...POSE.dive, off: [0, 0, 0] });
  yield* tween(0.9, (k) => { M.root.position.set(p0.x - 4.5 * k, Math.sin(k * Math.PI * 0.7) * 1.2 - k * k * 3, p0.z); M.root.rotation.z = k * 0.6; }, linear);
  M.root.visible = false;
  cs.run(function* () { for (let i = 0; i < 30; i++) { cs.fx.emit('paper', V(rnd(-5, -3), 0.5, rnd(-2, 4)), 2, { dir: V(-5, 1, 0), v: 0.6 }); yield 0.04; } });
  yield 1.2;

  // ---- the street: it lands
  cs.use('city'); gradeNow(cs, { tint: 0xd8e4ff, lift: 0x030508, sat: 0.95, contrast: 1.15 });
  C.group.add(M.root); M.root.visible = true;
  M.root.rotation.set(0, 0.5, 0);
  const L = V(-9, 0, 15.6);
  cs.place(V(-4.8, 1.0, 24.5), V(-9, 2.4, 15.6), 50);
  cs.handheld = 0.35;
  C.lights.key.position.set(-5, 9, 22); C.lights.key.target.position.copy(L); C.lights.key.intensity = 80; C.lights.key.color.set(0xd8e0ff);
  cs.run(bedLoop(cs, 'city', 1, () => cs.set !== C));
  M.set({ ...POSE.dive, off: [0, 0, 0] }, true);
  yield 0.5;
  M.root.position.set(L.x, 30, L.z);
  au.whoosh(0, 0.5);
  yield* tween(0.42, (k) => { M.root.position.y = 30 * (1 - k * k); }, linear);
  M.root.position.y = 0; M.set(POSE.crouch, true);
  au.boom(1.8); au.heavyStep(); au.rumble(2, 0.6); cs.shake = 1.6;
  const crater = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.8, depthWrite: false }));
  crater.userData.own = true; crater.material.map = (await_crack()); crater.rotation.x = -Math.PI / 2; crater.position.set(L.x, 0.16, L.z); C.group.add(crater);
  cs.debris.burst('concrete', L.clone().add(V(0, 0.3, 0)), 26, 7, V(0, 3, 0), { s: 0.35 });
  for (let i = 0; i < 4; i++) cs.fx.emit('dust', L.clone().add(V(0, 0.4, 0)), 40, { s: 2.2 + i * 0.5, v: 1.3 + i * 0.35, spread: 1, dir: V(1.5, 0.6, 5.5).multiplyScalar(0.6 + i * 0.25) });
  cs.ctx.post.u.flash.value = 0.25; cs.ctx.post.u.flashCol.value.set(0x887766);
  // the dust swallows the camera
  cs.run(function* () { for (let i = 0; i < 12; i++) { cs.fx.emit('dust', cs.cam.pos.clone().add(V(rnd(-2, 2), rnd(-1, 1), rnd(-4, -1))), 6, { s: 3, v: 0.4, spread: 1 }); yield 0.05; } });
  yield 0.3;
  yield* cs.fade(1, 0.7, '#5c564c');
  cs.fadeCol = '#000';
  yield 0.6;

  // ---- black. Rain.
  const rv = { v: 0 };
  cs.run(function* () { const b = bed('rain', 1); while (cs.alive) { b.v = rv.v; b.fn(0); yield 0.45; } });
  yield* tween(2.4, (k) => { rv.v = k * 1.3; });
  au.thunder();
  yield 1.4;

  // ---- the screech
  C.rain = true; cs.rain.on = true; cs.rain.amount = 1; cs.rain.mask = null;
  crater.position.set(0.4, 0.02, 22); M.root.position.set(0, 0, 22); M.root.rotation.set(0, 0.35, 0);
  M.set({ ...POSE.stand, jaw: [0.05] }, true); M.update(0.016);
  cs.fx.clear(); cs.debris.clear();
  gradeNow(cs, { tint: 0xa8b8e0, lift: 0x02030a, sat: 0.8, contrast: 1.25 });
  cs.scene.fog.color.set(0x070a14); cs.scene.fog.near = 20; cs.scene.fog.far = 260;
  for (const l of C.lamps) l.material.opacity = 0.35;
  C.lights.lampL.position.set(4, 5.5, 18.5); C.lights.lampL.intensity = 3.2;
  cs.every(() => { C.lights.lampL.intensity = Math.random() < 0.04 ? 0.4 : 3.2; });
  cs.place(V(1.6, 1.55, 25.4), V(0, 2.0, 22), 44);
  cs.handheld = 0.4;
  C.lights.key.position.set(3, 8, 27); C.lights.key.target.position.set(0, 1.4, 22); C.lights.key.intensity = 60; C.lights.key.color.set(0xa8c0ff);
  C.lights.neonL.position.set(-3, 2.5, 24); C.lights.neonL.intensity = 10;
  yield* cs.fade(0, 1.6);
  au.breath(0, true);
  cs.run(function* () { while (cs.alive) { cs.fx.emit('slime', M.jaw.getWorldPosition(V()), 1, { v: 0.2 }); yield 0.15; } });
  yield 1.6;
  // it straightens up, throws its head back...
  M.set({ spine: [-0.45], neck: [-0.9], shL: [-0.5, 0, 1.4], shR: [-0.5, 0, -1.4], elL: [-0.4], elR: [-0.4], jaw: [0.15] });
  M.speed = 4;
  au.growl(0, 1.2);
  yield 1.2;
  // ...and screams into the night as the camera rips away
  M.speed = 10; M.set({ jaw: [0.85] }); M.tentAmp = 2.4; M.tentSpeed = 3.4;
  au.screech(0, 3.8);
  cs.shake = 0.6;
  cs.run(function* () { yield 0.9; C.lights.flashL.intensity = 40; cs.ctx.post.u.flash.value = 0.45; cs.ctx.post.u.flashCol.value.set(0xc0d0ff); au.thunder(0.3); yield 0.12; C.lights.flashL.intensity = 0; yield 0.1; C.lights.flashL.intensity = 30; yield 0.08; C.lights.flashL.intensity = 0; });
  yield* cs.path(3.4, [V(1.6, 1.55, 25.4), V(4, 3.5, 30), V(10, 12, 40), V(18, 30, 56)], () => M.neck.getWorldPosition(V()), easeOut);
  // cut to black on the scream
  cs.fadeV = 1;
  yield 1.6;
}
// the landing crack texture
function await_crack() { return (window.__csCrack ||= (() => { const c = document.createElement('canvas'); c.width = 32; c.height = 32; const x = c.getContext('2d'); x.strokeStyle = '#000'; x.lineWidth = 1.5; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(16, 16); let px = 16, py = 16; const a = i * 0.7 + Math.random(); for (let k = 0; k < 5; k++) { px += Math.cos(a + (Math.random() - 0.5)) * 3; py += Math.sin(a + (Math.random() - 0.5)) * 3; x.lineTo(px, py); } x.stroke(); } x.fillStyle = 'rgba(0,0,0,0.7)'; x.beginPath(); x.arc(16, 16, 5, 0, 7); x.fill(); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t; })()); }
