// Procedural enemy bodies. Each builder attaches meshes to the enemy via e.part(),
// sets e.head (weak point), e.glow (muzzle / telegraph light) and e.anim(dt, moving).
import * as THREE from '../../vendor/three.module.min.js';
import * as TX from '../../engine/textures.js';
import { box } from '../../engine/geometry.js';
import { randi } from '../../engine/util.js';

const matCache = new Map();
export const lm = (t) => {
  if (!matCache.has(t.uuid)) matCache.set(t.uuid, new THREE.MeshLambertMaterial({ map: t }));
  return matCache.get(t.uuid);
};
const colMats = new Map();
const cm = (hex, basic = false) => {
  const k = hex + (basic ? 'b' : 'l');
  if (!colMats.has(k)) colMats.set(k, basic ? new THREE.MeshBasicMaterial({ color: hex }) : new THREE.MeshLambertMaterial({ color: hex }));
  return colMats.get(k);
};
const rgbHex = (c) => (c[0] << 16) | (c[1] << 8) | c[2];
export const GUN = new THREE.MeshLambertMaterial({ map: TX.gunMetal() });
const arr6 = (side, front, top = side) => [side, side, top, side, front, side];
const glowMesh = (e, parent, color, size, x, y, z) => {
  const g = new THREE.Mesh(box(size, size, size), cm(color, true));
  g.position.set(x, y, z); g.visible = false; parent.add(g); e.glow = g; return g;
};
const pivot = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

// ------------------------------------------------------------------ humans
export function human(e, m) {
  const v = { style: m.face || 'normal', skin: m.skin ?? randi(Math.random, 0, 4), hair: m.hair ?? randi(Math.random, 0, 5), glasses: m.glasses ?? Math.random() < 0.2, capCol: m.capCol };
  let headMats;
  if (m.head) {
    const base = m.headCol || { helmet: [40, 42, 48], gasmask: [52, 58, 52], mask: [24, 24, 30] }[m.head] || [70, 74, 82];
    const front = lm(TX.eyes(m.head, m.eyeCol || [255, 40, 30], base));
    const side = m.head === 'mutant' ? lm(TX.flesh(base, 'h' + base)) : m.head === 'glitch' ? front : lm(TX.plastic(base, 'hs' + base));
    headMats = arr6(side, front);
  } else {
    const side = lm(TX.headSide(v, false));
    headMats = [side, side, lm(TX.hairTop(v)), side, lm(TX.face(v)), lm(TX.headSide(v, true))];
  }
  const o = m.outfit;
  const tb = lm(TX.torsoBack(o)), tf = lm(TX.torsoFront(o));
  const armM = lm(TX.arm(o, v.skin)), legM = lm(TX.leg(o));
  const bulk = m.bulk || 1, B = e.body;
  e.legL = pivot(B, -0.11 * bulk, 0.86, 0); e.legR = pivot(B, 0.11 * bulk, 0.86, 0);
  e.part(e.legL, box(0.18 * bulk, 0.86, 0.2), legM, 0, -0.43, 0);
  e.part(e.legR, box(0.18 * bulk, 0.86, 0.2), legM, 0, -0.43, 0);
  e.torso = pivot(B, 0, 0.86, 0);
  e.part(e.torso, box(0.52 * bulk, 0.62, 0.28 * bulk), arr6(tb, tf, tb), 0, 0.31, 0);
  e.neck = pivot(e.torso, 0, 0.62, 0);
  const hs = m.head === 'mutant' ? 0.34 : 0.3;
  e.head = e.part(e.neck, box(hs, 0.32, hs), headMats, 0, 0.17, m.hunch ? 0.06 : 0, 'head');
  if (m.hat === 'beret') { const b = e.part(e.neck, box(0.33, 0.07, 0.33), cm(0x701818), 0.03, 0.36, 0, 'head'); b.rotation.z = -0.15; }
  if (m.hat === 'helmet') e.part(e.neck, box(0.36, 0.14, 0.36), cm(0x3a4038), 0, 0.38, 0, 'head');
  e.armL = pivot(e.torso, -0.34 * bulk, 0.56, 0); e.armR = pivot(e.torso, 0.34 * bulk, 0.56, 0);
  e.part(e.armL, box(0.14, 0.62, 0.16), armM, 0, -0.29, 0);
  e.part(e.armR, box(0.14, 0.62, 0.16), armM, 0, -0.29, 0);
  if (m.extraArm) {
    e.armX = pivot(e.torso, -0.3 * bulk, 0.22, 0.08); e.armX.rotation.z = -0.6;
    e.part(e.armX, box(0.12, 0.55, 0.14), armM, 0, -0.26, 0);
    for (let k = -1; k <= 1; k++) e.part(e.armX, box(0.03, 0.03, 0.18), cm(0xe8e0c0), k * 0.04, -0.56, 0.06);
  }
  // weapon in the right hand
  const R = e.armR, w = m.weapon || 'pistol';
  let tip = [0, -0.6, 0.18];
  const W = (gw, gh, gd, mat, x, y, z) => e.part(R, box(gw, gh, gd), mat, x, y, z);
  if (w === 'pistol') { W(0.07, 0.11, 0.22, GUN, 0, -0.6, 0.07); }
  else if (w === 'rifle') { W(0.07, 0.11, 0.55, GUN, 0, -0.6, 0.16); W(0.04, 0.12, 0.06, GUN, 0, -0.7, 0.12); tip = [0, -0.6, 0.45]; }
  else if (w === 'big') { W(0.12, 0.14, 0.42, GUN, 0, -0.6, 0.14); W(0.05, 0.05, 0.2, cm(0xc8a030), 0, -0.58, 0.42); tip = [0, -0.58, 0.54]; }
  else if (w === 'minigun') {
    W(0.16, 0.16, 0.36, GUN, 0, -0.6, 0.1);
    for (let k = 0; k < 3; k++) W(0.04, 0.04, 0.4, cm(0x9098a0), Math.cos(k * 2.1) * 0.04, -0.6 + Math.sin(k * 2.1) * 0.04, 0.42);
    tip = [0, -0.6, 0.64];
  } else if (w === 'mug') { W(0.09, 0.11, 0.09, cm(0xe8e8e0), 0, -0.62, 0.05); W(0.07, 0.01, 0.07, cm(0x4a2a10), 0, -0.56, 0.05); tip = [0, -0.6, 0.08]; }
  else if (w === 'package') { W(0.26, 0.2, 0.26, lm(TX.cardboard()), 0, -0.66, 0.1); tip = [0, -0.6, 0.25]; }
  else if (w === 'mop') { const s = W(0.04, 1.3, 0.04, cm(0x9a7040), 0, -0.55, 0.1); s.rotation.x = 0.3; W(0.34, 0.12, 0.12, cm(0xc8c0a0), 0, -1.15, 0.28); tip = [0, -0.6, 0.2]; }
  else if (w === 'laptop') { W(0.32, 0.02, 0.22, cm(0x303034), 0, -0.6, 0.12); const sc = W(0.32, 0.2, 0.02, cm(0x40a0ff, true), 0, -0.5, 0.02); sc.rotation.x = -0.3; tip = [0, -0.5, 0.2]; }
  else if (w === 'clipboard') { W(0.2, 0.27, 0.02, cm(0x8a6038), 0, -0.6, 0.1); W(0.17, 0.2, 0.01, cm(0xf0f0e8), 0, -0.62, 0.115); tip = [0, -0.55, 0.15]; }
  else if (w === 'briefcase') { W(0.32, 0.24, 0.08, lm(TX.leather()), 0, -0.7, 0.04); W(0.1, 0.04, 0.02, cm(0xc8a030), 0, -0.56, 0.04); tip = [0, -0.6, 0.12]; }
  else if (w === 'claw') { for (let k = -1; k <= 1; k++) W(0.03, 0.03, 0.22, cm(0xe8e0c0), k * 0.045, -0.64, 0.08); }
  else if (w === 'blade') { W(0.025, 0.05, 0.62, cm(0xd0d8e0), 0, -0.6, 0.28); W(0.08, 0.04, 0.04, cm(0x202020), 0, -0.6, 0.0); }
  else if (w === 'sprayer') { W(0.06, 0.06, 0.4, cm(0x404040), 0, -0.6, 0.14); W(0.08, 0.08, 0.06, cm(0xd0b030), 0, -0.6, 0.36); tip = [0, -0.6, 0.4]; }
  glowMesh(e, R, 0xffa020, 0.1, ...tip);
  if (m.shield) {
    const sm = new THREE.MeshLambertMaterial({ map: TX.panel([60, 66, 76], null, 'shield') });
    e.shieldMesh = e.part(e.torso, box(0.62, 1.0, 0.06), sm, -0.05, 0.12, 0.34, 'shield');
    e.part(e.torso, box(0.3, 0.1, 0.02), cm(0x90c0e0, true), -0.05, 0.42, 0.38, 'shield');
  }
  if (m.pack === 'jet') {
    e.part(e.torso, box(0.34, 0.42, 0.16), GUN, 0, 0.32, -0.22);
    e.flames = [];
    for (const x of [-0.1, 0.1]) {
      e.part(e.torso, box(0.1, 0.16, 0.1), cm(0x606870), x, 0.04, -0.24);
      const f = new THREE.Mesh(box(0.08, 0.3, 0.08), cm(0xff9020, true)); f.position.set(x, -0.18, -0.24); e.torso.add(f); e.flames.push(f);
    }
  } else if (m.pack === 'tank') e.part(e.torso, box(0.26, 0.46, 0.16), cm(0xc8b030), 0, 0.3, -0.22);
  e.hunch = m.hunch ? 0.45 : 0;
  e.centerY = 1.15; e.shoulderY = 1.42;
  e.anim = (dt, moving) => {
    const g = e.game, cam = g.camPos;
    const run = e.def.move === 'charge' || e.def.move === 'leap' || e.def.move === 'crawl';
    const wv = moving ? Math.sin(e.phase * (run ? 14 : 9)) : 0;
    e.legL.rotation.x = wv * 0.7; e.legR.rotation.x = -wv * 0.7;
    const pitch = Math.atan2(cam.y - (e.shoulderY * e.scale - e.crouch * 0.75 + e.pos.y), Math.hypot(cam.x - e.pos.x, cam.z - e.pos.z));
    if (run || m.weapon === 'claw' || m.weapon === 'blade') {
      const sw = e.swingT > 0 ? Math.sin(e.swingT * 14) : 0;
      e.armL.rotation.x = -1.2 + wv * 0.4 + sw * 0.9;
      e.armR.rotation.x = -1.2 - wv * 0.4 - sw * 0.9;
      e.torso.rotation.x = (run ? 0.35 : 0) + e.hunch * 0.6 - e.stagger * 0.6;
    } else {
      const aim = e.aimAmt;
      e.armR.rotation.x = -wv * 0.5 * (1 - aim) + (-Math.PI / 2 - pitch) * aim;
      e.armL.rotation.x = wv * 0.5 * (1 - aim) - (m.shield ? 1.2 : 0.4) * aim - (m.shield ? 0.6 : 0) * (1 - aim);
      e.armL.rotation.z = 0.25 * aim;
      e.torso.rotation.x = e.hunch - e.stagger * 0.5;
    }
    if (e.armX) e.armX.rotation.x = Math.sin(e.phase * 5) * 0.6 - 0.6;
    e.neck.rotation.x = -pitch * 0.5 - e.hunch * 0.6;
    if (e.flames) for (const f of e.flames) { f.scale.y = 0.6 + Math.random() * 0.8; }
  };
}

// ------------------------------------------------------------------ drones
export function drone(e, m) {
  const side = lm(TX.panel(m.col, m.accent, 'd' + m.col)), front = lm(TX.eyes(m.eye, m.eyeCol, m.col));
  const T = e.torso = pivot(e.body, 0, 0, 0);
  e.head = e.part(T, box(0.56, 0.38, 0.5), arr6(side, front), 0, 0, 0, 'body');
  e.rotors = [];
  const rotor = (x, z) => {
    e.part(T, box(0.05, 0.12, 0.05), GUN, x, 0.24, z);
    const r = new THREE.Mesh(box(0.42, 0.015, 0.06), cm(0x202024)); r.position.set(x, 0.31, z); T.add(r); e.rotors.push(r);
  };
  if (m.rotors === 2) { e.part(T, box(1.0, 0.05, 0.07), GUN, 0, 0.2, 0); rotor(-0.5, 0); rotor(0.5, 0); }
  if (m.rotors === 4) {
    const a1 = e.part(T, box(1.1, 0.05, 0.07), GUN, 0, 0.2, 0); a1.rotation.y = 0.7;
    const a2 = e.part(T, box(1.1, 0.05, 0.07), GUN, 0, 0.2, 0); a2.rotation.y = -0.7;
    for (const [x, z] of [[-0.42, -0.36], [0.42, -0.36], [-0.42, 0.36], [0.42, 0.36]]) rotor(x, z);
  }
  if (m.ring) {
    e.ring = pivot(T, 0, 0, 0);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; const s = e.part(e.ring, box(0.22, 0.06, 0.08), cm(0xa060ff, true), Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55); s.rotation.y = -a + Math.PI / 2; }
  }
  if (m.bomb) { e.part(T, box(0.3, 0.3, 0.42), lm(TX.panel([40, 40, 40], [230, 200, 40], 'bomb')), 0, -0.32, 0); }
  else { e.part(T, box(0.08, 0.08, 0.3), GUN, -0.2, -0.24, 0.08); e.part(T, box(0.08, 0.08, 0.3), GUN, 0.2, -0.24, 0.08); }
  glowMesh(e, T, rgbHex(m.eyeCol), 0.12, 0, 0, 0.27);
  e.centerY = 0;
  e.anim = (dt, moving) => {
    for (const r of e.rotors) r.rotation.y += dt * 40;
    if (e.ring) e.ring.rotation.y += dt * 3;
    T.rotation.z = Math.sin(e.bob * 0.7) * 0.12 + (moving ? 0.1 : 0);
    T.rotation.x = -e.stagger * 0.5 + (moving ? 0.15 : 0);
  };
}

// ------------------------------------------------------------------ bipedal mechs
export function mech(e, m) {
  const side = lm(TX.panel(m.col, null, 'm' + m.col)), acc = lm(TX.panel(m.col, m.accent, 'ma' + m.col + m.accent));
  const front = lm(TX.eyes(m.eye, m.eyeCol, m.col));
  const B = e.body;
  e.legs = [];
  for (const s of [-1, 1]) {
    const hip = pivot(B, s * 0.24, 1.0, 0);
    e.part(hip, box(0.18, 0.5, 0.2), side, 0, -0.2, 0.08).rotation.x = -0.4;
    e.part(hip, box(0.16, 0.5, 0.16), GUN, 0, -0.62, -0.02).rotation.x = 0.35;
    e.part(hip, box(0.28, 0.08, 0.38), side, 0, -0.95, 0.04);
    e.legs.push(hip);
  }
  const T = e.torso = pivot(B, 0, 1.0, 0);
  e.part(T, box(0.72, 0.56, 0.52), arr6(side, acc, side), 0, 0.3, 0);
  e.head = e.part(T, box(0.36, 0.26, 0.32), arr6(side, front), 0, 0.68, 0.06, 'head');
  for (const s of [-1, 1]) {
    e.part(T, box(0.2, 0.2, m.cannons ? 0.6 : 0.4), GUN, s * 0.48, 0.35, 0.12);
    e.part(T, box(0.08, 0.08, 0.2), cm(0x303034), s * 0.48, 0.35, m.cannons ? 0.5 : 0.4);
  }
  if (m.cannons) e.part(T, box(0.3, 0.22, 0.3), acc, 0, 0.66, -0.26);
  glowMesh(e, T, rgbHex(m.eyeCol), 0.14, 0.48, 0.35, m.cannons ? 0.62 : 0.52);
  e.centerY = 1.25;
  e.anim = (dt, moving) => {
    const w = moving ? Math.sin(e.phase * 6) : 0;
    e.legs[0].rotation.x = w * 0.45; e.legs[1].rotation.x = -w * 0.45;
    T.position.y = 1.0 + Math.abs(w) * 0.05;
    T.rotation.x = -e.stagger * 0.3;
  };
}

// ------------------------------------------------------------------ spiders
export function spider(e, m) {
  const side = lm(TX.panel(m.col, m.accent, 's' + m.col + m.accent)), front = lm(TX.eyes(m.eye, m.eyeCol, m.col));
  const B = e.body;
  const T = e.torso = pivot(B, 0, 0.45, 0);
  e.part(T, box(0.62, 0.36, 0.72), side, 0, 0.05, -0.15);
  e.head = e.part(T, box(0.42, 0.3, 0.3), arr6(side, front), 0, 0, 0.36, 'head');
  e.legs = [];
  const n = m.legs / 2;
  for (const s of [-1, 1]) for (let i = 0; i < n; i++) {
    const fan = (i / Math.max(1, n - 1) - 0.5) * 1.2;
    const g = pivot(T, s * 0.28, 0.05, -0.15 + (i / Math.max(1, n - 1) - 0.5) * 0.5);
    g.rotation.y = s > 0 ? -fan : Math.PI + fan;
    e.part(g, box(0.46, 0.06, 0.06), GUN, 0.2, 0.14, 0).rotation.z = 0.55;
    e.part(g, box(0.06, 0.6, 0.06), side, 0.42, -0.1, 0);
    g.userData.base = g.rotation.y; g.userData.ph = i * 1.7 + (s > 0 ? 0 : Math.PI);
    e.legs.push(g);
  }
  if (m.cannon) {
    const tur = pivot(T, 0, 0.3, -0.1);
    e.part(tur, box(0.3, 0.2, 0.3), GUN, 0, 0, 0);
    e.part(tur, box(0.08, 0.08, 0.5), cm(0x404048), 0, 0.02, 0.3);
    glowMesh(e, tur, 0xff3020, 0.12, 0, 0.02, 0.56);
  } else glowMesh(e, T, rgbHex(m.eyeCol), 0.12, 0, 0, 0.52);
  e.centerY = 0.5;
  e.anim = (dt, moving) => {
    for (const g of e.legs) {
      g.rotation.y = g.userData.base + (moving ? Math.sin(e.phase * 14 + g.userData.ph) * 0.3 : 0);
      g.rotation.z = moving ? Math.max(0, Math.sin(e.phase * 14 + g.userData.ph)) * 0.25 : 0;
    }
    T.position.y = 0.45 + (moving ? Math.abs(Math.sin(e.phase * 14)) * 0.03 : 0);
    T.rotation.x = -e.stagger * 0.3;
  };
}

// ------------------------------------------------------------------ four-legged things & slugs
export function quad(e, m) {
  const robot = m.style === 'robot' || m.style === 'hound';
  const skin = robot ? lm(TX.panel(m.col, null, 'q' + m.col)) : lm(TX.flesh(m.col, 'q' + m.col));
  const front = lm(TX.eyes(m.eye, m.eyeCol || [255, 40, 30], m.eyeBase || m.col));
  const B = e.body;
  const T = e.torso = pivot(B, 0, 0, 0);
  e.legs = [];
  if (m.style === 'slug') {
    e.segs = [];
    for (let k = 0; k < 4; k++) {
      const s = 0.5 - k * 0.08;
      const seg = e.part(T, box(s, s * 0.6, 0.34), skin, 0, s * 0.3, -k * 0.3);
      e.segs.push(seg);
    }
    e.head = e.part(T, box(0.46, 0.34, 0.24), arr6(skin, front), 0, 0.2, 0.28, 'head');
    glowMesh(e, T, 0x60ff40, 0.1, 0, 0.2, 0.42);
    e.centerY = 0.25;
  } else {
    const low = m.style === 'robot';
    const by = low ? 0.32 : 0.55;
    e.part(T, box(0.42, low ? 0.22 : 0.36, m.style === 'flesh' ? 0.8 : 0.9), skin, 0, by, 0);
    if (m.style === 'flesh') e.part(T, box(0.5, 0.3, 0.45), skin, 0, by + 0.25, -0.1);
    e.head = e.part(T, box(0.34, 0.3, 0.34), arr6(skin, front), 0, by + 0.1, 0.58, 'head');
    if (m.style === 'hound') { e.part(T, box(0.08, 0.16, 0.06), skin, -0.11, by + 0.32, 0.5); e.part(T, box(0.08, 0.16, 0.06), skin, 0.11, by + 0.32, 0.5); }
    for (const [x, z] of [[-0.17, 0.32], [0.17, 0.32], [-0.17, -0.32], [0.17, -0.32]]) {
      const g = pivot(T, x, by - 0.05, z);
      e.part(g, box(0.1, by, 0.1), robot ? GUN : skin, 0, -by / 2, 0);
      e.legs.push(g);
    }
    if (m.tail) { const t = e.part(T, box(0.06, 0.06, 0.6), robot ? GUN : skin, 0, by + 0.1, -0.7); t.rotation.x = 0.4; }
    glowMesh(e, T, 0x60ff40, 0.12, 0, by + 0.1, 0.78);
    e.centerY = by + 0.05;
  }
  e.anim = (dt, moving) => {
    const sp = e.def.speed > 3 ? 18 : 12;
    e.legs.forEach((g, i) => { g.rotation.x = moving ? Math.sin(e.phase * sp + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.7 : 0; });
    if (e.segs) e.segs.forEach((s, i) => { s.scale.y = 1 + Math.sin(e.phase * 10 - i) * (moving ? 0.25 : 0.08); });
    T.rotation.x = -e.stagger * 0.4;
  };
}

// ------------------------------------------------------------------ ooze
export function blob(e, m) {
  const sk = lm(TX.slime(m.col, 'b' + m.col));
  const front = lm(TX.eyes('mono', m.eyeCol, m.col));
  const T = e.torso = pivot(e.body, 0, 0, 0);
  const parts = [e.part(T, box(0.95, 0.5, 0.95), sk, 0, 0.25, 0), e.part(T, box(0.7, 0.42, 0.7), sk, 0.03, 0.68, 0.02)];
  e.head = e.part(T, box(0.44, 0.36, 0.44), arr6(sk, front), -0.02, 1.05, 0.04, 'head');
  parts.push(e.head);
  glowMesh(e, T, 0x80ff40, 0.12, 0, 1.05, 0.28);
  e.centerY = 0.6;
  e.anim = () => {
    const s = Math.sin(e.phase * 6);
    T.scale.set(1 - s * 0.08, 1 + s * 0.12, 1 - s * 0.08);
    parts[1].position.x = Math.sin(e.phase * 3) * 0.05; parts[2].position.x = Math.sin(e.phase * 3 + 1) * 0.08;
  };
}

// ------------------------------------------------------------------ turrets
export function turret(e, m) {
  const T = e.torso = pivot(e.body, 0, 0, 0);
  if (m.style === 'pylon') {
    e.part(T, box(0.6, 0.25, 0.6), lm(TX.panel([60, 64, 72], [230, 180, 40], 'py')), 0, 0.12, 0);
    e.part(T, box(0.22, 1.5, 0.22), GUN, 0, 0.95, 0);
    e.head = e.part(T, box(0.42, 0.42, 0.42), cm(0x60d0ff, true), 0, 1.85, 0, 'head');
    for (const y of [0.6, 1.1]) e.part(T, box(0.36, 0.06, 0.36), cm(0x60d0ff, true), 0, y, 0);
    e.centerY = 1.4;
    e.anim = () => { e.head.rotation.y += 0.05; e.head.scale.setScalar(1 + Math.sin(e.phase * 6) * 0.1); };
    return;
  }
  if (m.style === 'copier') {
    const beige = lm(TX.vents()), front = lm(TX.eyes('copier', [255, 60, 40], [196, 188, 164]));
    e.part(T, box(1.0, 0.9, 0.72), arr6(beige, front, beige), 0, 0.45, 0);
    e.lid = pivot(T, 0, 0.92, -0.36);
    e.part(e.lid, box(1.0, 0.1, 0.72), lm(TX.plastic([170, 164, 140], 'lid')), 0, 0.05, 0.36);
    for (let k = -4; k <= 4; k++) e.part(e.lid, box(0.06, 0.08, 0.06), cm(0xf0f0e8), k * 0.1, -0.02, 0.7);
    e.head = e.part(T, box(0.6, 0.06, 0.4), cm(0xff4020, true), 0, 0.92, 0.05, 'head');
    glowMesh(e, T, 0xff6030, 0.14, 0, 0.98, 0.3);
    e.centerY = 0.6;
    e.anim = () => { e.lid.rotation.x = -(e.aimAmt * 0.7 + Math.max(0, Math.sin(e.phase * 2)) * 0.1); };
    return;
  }
  const side = lm(TX.panel(m.col, [230, 180, 40], 't' + m.col)), front = lm(TX.eyes(m.eye, m.eyeCol, m.col));
  e.part(T, box(0.6, 0.3, 0.6), side, 0, 0.15, 0);
  e.part(T, box(0.14, 0.7, 0.14), GUN, 0, 0.65, 0);
  e.headG = pivot(T, 0, 1.1, 0);
  e.head = e.part(e.headG, box(0.42, 0.32, 0.46), arr6(side, front), 0, 0, 0, 'head');
  for (const x of [-0.13, 0.13]) e.part(e.headG, box(0.07, 0.07, 0.45), GUN, x, -0.05, 0.4);
  glowMesh(e, e.headG, 0xff3020, 0.12, 0, -0.05, 0.64);
  e.centerY = 1.0;
  e.anim = () => {
    const cam = e.game.camPos;
    e.headG.rotation.x = -Math.atan2(cam.y - 1.1, Math.hypot(cam.x - e.pos.x, cam.z - e.pos.z)) - e.stagger * 0.3;
  };
}

// ------------------------------------------------------------------ floaters
export function floater(e, m) {
  const T = e.torso = pivot(e.body, 0, 0, 0);
  const wraith = m.style === 'wraith';
  const sk = wraith ? lm(TX.panel([22, 26, 24], null, 'wr')) : lm(TX.flesh([170, 90, 90], 'eye'));
  const front = lm(TX.eyes(wraith ? 'wraith' : 'eyeball', m.eyeCol, [22, 26, 24]));
  e.head = e.part(T, box(wraith ? 0.5 : 0.62, wraith ? 0.62 : 0.62, wraith ? 0.4 : 0.6), arr6(sk, front), 0, 0, 0, wraith ? 'head' : 'body');
  e.tent = [];
  for (let k = 0; k < 5; k++) {
    const g = pivot(T, (k - 2) * 0.11, -0.28, (k % 2) * 0.1 - 0.05);
    e.part(g, box(0.05, 0.6, 0.05), wraith ? cm(0x40ff80, true) : lm(TX.flesh([150, 70, 80], 'tent')), 0, -0.3, 0);
    e.tent.push(g);
  }
  glowMesh(e, T, rgbHex(m.eyeCol), 0.14, 0, 0, wraith ? 0.22 : 0.32);
  e.centerY = 0;
  e.anim = () => {
    e.tent.forEach((g, i) => { g.rotation.x = Math.sin(e.phase * 3 + i) * 0.4; g.rotation.z = Math.cos(e.phase * 2.3 + i) * 0.3; });
    T.rotation.x = -e.stagger * 0.4;
  };
}

// ------------------------------------------------------------------ tank
export function tank(e, m) {
  const side = lm(TX.panel(m.col, null, 'tk' + m.col)), acc = lm(TX.panel(m.col, m.accent, 'tka' + m.col));
  const front = lm(TX.eyes(m.eye, m.eyeCol, m.col)), tr = lm(TX.tread());
  const T = e.torso = pivot(e.body, 0, 0, 0);
  e.part(T, box(0.24, 0.36, 1.1), tr, -0.4, 0.18, 0); e.part(T, box(0.24, 0.36, 1.1), tr, 0.4, 0.18, 0);
  e.part(T, box(0.62, 0.3, 0.94), arr6(side, acc, side), 0, 0.42, 0);
  e.headG = pivot(T, 0, 0.7, -0.05);
  e.head = e.part(e.headG, box(0.48, 0.26, 0.48), arr6(side, front), 0, 0, 0, 'head');
  e.part(e.headG, box(0.11, 0.11, 0.55), GUN, 0, 0, 0.45);
  glowMesh(e, e.headG, 0xff8020, 0.14, 0, 0, 0.74);
  e.centerY = 0.55;
  e.anim = (dt, moving) => { T.position.y = moving ? Math.sin(e.phase * 30) * 0.01 : 0; e.headG.rotation.x = -e.stagger * 0.3; };
}

// ------------------------------------------------------------------ nano swarm
export function swarm(e, m) {
  const T = e.torso = pivot(e.body, 0, 0, 0);
  const sk = lm(TX.panel(m.col, null, 'sw')), eye = cm(rgbHex(m.eyeCol), true);
  e.bugs = [];
  for (let k = 0; k < m.n; k++) {
    const g = pivot(T, 0, 0, 0);
    e.part(g, box(0.12, 0.1, 0.12), sk, 0, 0, 0);
    e.part(g, box(0.05, 0.03, 0.02), eye, 0, 0.01, 0.065);
    g.userData = { a: Math.random() * 6.28, r: 0.15 + Math.random() * 0.3, h: (Math.random() - 0.5) * 0.5, s: 3 + Math.random() * 4 };
    e.bugs.push(g);
  }
  e.head = e.part(T, box(0.75, 0.6, 0.75), new THREE.MeshBasicMaterial({ visible: false }), 0, 0, 0, 'body');
  e.centerY = 0;
  e.anim = (dt) => {
    for (const g of e.bugs) { const u = g.userData; u.a += dt * u.s; g.position.set(Math.cos(u.a) * u.r, u.h + Math.sin(u.a * 2) * 0.08, Math.sin(u.a) * u.r); g.rotation.y = -u.a; }
  };
}

// ------------------------------------------------------------------ brood pod
export function pod(e, m) {
  const sk = lm(TX.flesh(m.col, 'pod' + m.col)), front = lm(TX.eyes('pod', m.eyeCol, m.col));
  const T = e.torso = pivot(e.body, 0, 0, 0);
  e.part(T, box(0.95, 0.3, 0.95), sk, 0, 0.15, 0);
  e.part(T, box(0.7, 0.6, 0.7), sk, 0, 0.6, 0);
  e.bulb = pivot(T, 0, 1.15, 0);
  e.head = e.part(e.bulb, box(0.62, 0.52, 0.62), arr6(sk, front), 0, 0, 0, 'head');
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; const t = e.part(T, box(0.08, 0.05, 0.7), sk, Math.cos(a) * 0.6, 0.03, Math.sin(a) * 0.6); t.rotation.y = -a + Math.PI / 2; }
  glowMesh(e, e.bulb, 0xffe060, 0.16, 0, 0, 0.32);
  e.centerY = 0.8;
  e.anim = () => { const s = 1 + Math.sin(e.phase * 4) * 0.07 + e.aimAmt * 0.15; e.bulb.scale.setScalar(s); };
}

export const BUILDERS = { human, drone, mech, spider, quad, blob, turret, floater, tank, swarm, pod };
