// Cutscene characters: jointed versions of the game's blocky people (same pixel textures, same
// proportions), so they can walk, sit, kneel, dive, eat and look around smoothly.
// Every joint eases toward a target rotation; scripts set targets (rig.set) every frame or once.
// Facing: +Z is the front of the body (like the game's enemy models).
import * as THREE from '../../vendor/three.module.min.js';
import * as TX from '../../engine/textures.js';
import { box } from '../../engine/geometry.js';
import { V, rnd, lerp } from './engine.js';

const mats = new Map();
export const lam = (t) => { if (!mats.has(t.uuid)) mats.set(t.uuid, new THREE.MeshLambertMaterial({ map: t })); return mats.get(t.uuid); };
export const col = (hex, basic = false, o = {}) => {
  const k = hex + (basic ? 'b' : 'l') + JSON.stringify(o);
  if (!mats.has(k)) mats.set(k, basic ? new THREE.MeshBasicMaterial({ color: hex, ...o }) : new THREE.MeshLambertMaterial({ color: hex, ...o }));
  return mats.get(k);
};
export const solid = (rgb, key, amt = 0.08) => TX.tex('cs_' + key + rgb, 8, 8, (p, r) => p.noise(rgb, amt, r), { mip: false });
const arr6 = (side, front, top = side) => [side, side, top, side, front, side];
export function part(parent, w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(box(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m; }
export function piv(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
export const GOLD = col(0xd8a830), GOLD_HI = col(0xffd860);

// the player's employees, as outfits
Object.assign(TX.OUTFITS, {
  p_temp: { style: 'shirt', jacket: [214, 214, 206], shirt: [214, 214, 206], tie: [52, 62, 112], pants: [58, 58, 66] },
  p_exec: { style: 'suit', jacket: [42, 30, 44], shirt: [230, 225, 215], tie: [160, 30, 40], pants: [36, 26, 38] },
  p_heir: { style: 'suit', pin: true, jacket: [20, 16, 26], shirt: [235, 230, 220], tie: [220, 180, 50], pants: [18, 14, 22] },
  p_robe: { style: 'robe', jacket: [120, 14, 18], shirt: [120, 14, 18], pants: [60, 8, 10] },
  p_coat: { style: 'coat', jacket: [138, 108, 70], shirt: [60, 56, 52], pants: [40, 38, 40] },
});
const PLAYER = {
  temp: { o: 'p_temp', face: { style: 'normal', skin: 1, hair: 0 }, short: true },
  guard: { o: 'guard', face: { style: 'cap', skin: 2, hair: 2, capCol: [38, 48, 80] } },
  intern: { o: 'intern', face: { style: 'normal', skin: 4, hair: 3 }, short: true },
  janitor: { o: 'janitor', face: { style: 'mustache', skin: 0, hair: 1 }, sleeve: [180, 170, 140] },
  ittech: { o: 'it', face: { style: 'normal', skin: 3, hair: 2, glasses: true }, short: true },
  exec: { o: 'p_exec', face: { style: 'normal', skin: 0, hair: 1 } },
  contractor: { o: 'major', face: { style: 'normal', skin: 2, hair: 5 } },
  heir: { o: 'p_heir', face: { style: 'normal', skin: 0, hair: 3 } },
};

// a custom torso texture for the robe and the trench coat
function torsoTex(key) {
  const o = TX.OUTFITS[key];
  if (o.style === 'robe') return TX.tex('cs_robe', 16, 16, (p, r) => { p.noise(o.jacket, 0.12, r); for (let y = 0; y < 16; y++) p.set(8, y, [70, 6, 8]); p.rect(0, 13, 16, 1, [200, 160, 60]); }, { mip: false });
  if (o.style === 'coat') return TX.tex('cs_coat', 16, 16, (p, r) => {
    p.noise(o.jacket, 0.1, r);
    for (let y = 0; y < 9; y++) { p.set(6 - Math.floor(y / 3), y, [100, 76, 48]); p.set(9 + Math.floor(y / 3), y, [100, 76, 48]); }
    p.rect(7, 0, 2, 4, [40, 36, 34]); p.rect(0, 11, 16, 2, [90, 66, 40]); p.rect(7, 11, 2, 2, [180, 150, 80]);
    for (const y of [4, 7, 10]) { p.set(5, y, [40, 30, 20]); p.set(10, y, [40, 30, 20]); }
  }, { mip: false });
  return null;
}

const JOINTS = ['hips', 'spine', 'neck', 'shL', 'elL', 'haL', 'shR', 'elR', 'haR', 'hipL', 'knL', 'hipR', 'knR', 'jaw'];

export class Rig {
  // o: { outfit (TX.OUTFITS key), face (TX face spec) | headMats, bulk, scale, short (rolled sleeves), sleeve rgb, gloves rgb }
  constructor(o) {
    this.o = o;
    const b = o.bulk ?? 1, out = TX.OUTFITS[o.outfit];
    const skin = TX.SKINS[o.face ? o.face.skin : 0];
    this.root = new THREE.Group(); this.root.scale.setScalar(o.scale ?? 1);
    const R = this.root;
    const tf = torsoTex(o.outfit);
    const tFront = lam(tf || TX.torsoFront(o.outfit)), tBack = lam(tf || TX.torsoBack(o.outfit));
    const sleeveM = lam(solid(o.sleeve || out.jacket, 'sl' + o.outfit));
    const foreM = o.short ? lam(solid(skin, 'skin')) : sleeveM;
    const handM = lam(solid(out.gloves || o.gloves || skin, 'hand' + (out.gloves || o.gloves || 's')));
    const pantsM = lam(solid(out.pants, 'pants' + o.outfit, 0.12)), shoeM = col(0x141214);
    // legs
    this.hips = piv(R, 0, 0.9, 0); this.hipBase = 0.9;
    const leg = (s) => {
      const hp = piv(this.hips, s * 0.11 * b, 0, 0);
      part(hp, 0.18 * b, 0.46, 0.2, pantsM, 0, -0.23, 0);
      const kn = piv(hp, 0, -0.45, 0);
      part(kn, 0.17 * b, 0.42, 0.19, pantsM, 0, -0.21, 0);
      part(kn, 0.17 * b, 0.07, 0.28, shoeM, 0, -0.415, 0.04);
      return [hp, kn];
    };
    [this.hipL, this.knL] = leg(-1); [this.hipR, this.knR] = leg(1);
    // torso, head
    this.spine = piv(this.hips, 0, 0, 0);
    this.torso = part(this.spine, 0.52 * b, 0.62, 0.28 * b, arr6(tBack, tFront, tBack), 0, 0.31, 0);
    this.neck = piv(this.spine, 0, 0.62, 0);
    if (o.headMats) this.head = part(this.neck, o.headSize || 0.3, 0.32, o.headSize || 0.3, o.headMats, 0, 0.17, 0);
    else if (o.face) {
      const v = o.face, side = lam(TX.headSide(v, false));
      this.head = part(this.neck, 0.3, 0.32, 0.3, [side, side, lam(TX.hairTop(v)), side, lam(TX.face(v)), lam(TX.headSide(v, true))], 0, 0.17, 0);
    }
    // arms
    const arm = (s) => {
      const sh = piv(this.spine, s * 0.34 * b, 0.56, 0);
      part(sh, 0.14 * b, 0.32, 0.15 * b, sleeveM, 0, -0.15, 0);
      const el = piv(sh, 0, -0.3, 0);
      part(el, 0.13 * b, 0.28, 0.14 * b, foreM, 0, -0.13, 0);
      if (!o.short && out.style !== 'robe') part(el, 0.135 * b, 0.04, 0.145 * b, lam(solid(out.shirt, 'cuff' + o.outfit)), 0, -0.26, 0);
      const ha = piv(el, 0, -0.28, 0);
      const hand = part(ha, 0.11 * b, 0.13, 0.12, handM, 0, -0.05, 0);
      return [sh, el, ha, hand];
    };
    [this.shL, this.elL, this.haL, this.handL] = arm(-1); [this.shR, this.elR, this.haR, this.handR] = arm(1);
    this.jaw = new THREE.Group();
    this.j = { hips: this.hips, spine: this.spine, neck: this.neck, shL: this.shL, elL: this.elL, haL: this.haL, shR: this.shR, elR: this.elR, haR: this.haR, hipL: this.hipL, knL: this.knL, hipR: this.hipR, knR: this.knR, jaw: this.jaw };
    this.tgt = {}; for (const k of JOINTS) this.tgt[k] = [0, 0, 0];
    this.rest = {}; // a base pose added under whatever is set
    this.off = V(); this.offT = V(); // hips offset (crouch / sit / bob)
    this.speed = 9; this.time = rnd(0, 10); this.breath = 1;
    this.extra = []; // per-frame extras (tentacles, cloth)
  }
  // pose: { joint: [rx, ry, rz] } (missing joints keep their target unless reset)
  set(pose, snap = false, reset = false) {
    if (reset) for (const k of JOINTS) this.tgt[k] = [0, 0, 0];
    for (const k in pose) {
      if (k === 'off') { this.offT.set(...pose.off); if (snap) this.off.copy(this.offT); continue; }
      const v = pose[k]; this.tgt[k] = [v[0] || 0, v[1] || 0, v[2] || 0];
      if (snap) this.j[k].rotation.set(...this.tgt[k]);
    }
    return this;
  }
  update(dt) {
    this.time += dt;
    const k = 1 - Math.exp(-this.speed * dt);
    // idle breathing on top of the pose
    const br = Math.sin(this.time * 2.1) * 0.025 * this.breath;
    for (const n of JOINTS) {
      const j = this.j[n], t = this.tgt[n], r = this.rest[n] || [0, 0, 0];
      let ax = t[0] + r[0];
      if (n === 'spine') ax -= br; if (n === 'neck') ax += br * 0.6;
      if (n === 'shL' || n === 'shR') ax += br * 0.5;
      j.rotation.x += (ax - j.rotation.x) * k; j.rotation.y += (t[1] + r[1] - j.rotation.y) * k; j.rotation.z += (t[2] + r[2] - j.rotation.z) * k;
    }
    this.off.lerp(this.offT, k);
    this.hips.position.set(this.off.x, this.hipBase + this.off.y, this.off.z);
    for (const f of this.extra) f(dt, this);
  }
  // walking / running pose for a phase (radians)
  walkPose(ph, amt = 1, run = false) {
    const s = Math.sin(ph), c = Math.cos(ph), A = amt * (run ? 1.25 : 1);
    return {
      hipL: [-s * 0.55 * A], hipR: [s * 0.55 * A],
      knL: [Math.max(0, -c) * (run ? 1.3 : 0.75) * A + 0.05], knR: [Math.max(0, c) * (run ? 1.3 : 0.75) * A + 0.05],
      shL: [s * (run ? 0.9 : 0.45) * A, 0, 0.06], shR: [-s * (run ? 0.9 : 0.45) * A, 0, -0.06],
      elL: [-(run ? 1.3 : 0.25) * amt], elR: [-(run ? 1.3 : 0.25) * amt],
      spine: [(run ? 0.28 : 0.04) * amt, Math.sin(ph) * 0.06 * amt],
      off: [0, -Math.abs(c) * (run ? 0.07 : 0.035) * amt + (run ? -0.06 : 0), 0],
    };
  }
  worldOf(obj, out = V()) { return obj.getWorldPosition(out); }
}

// ------------------------------------------------------------------ walking along a path (a coroutine)
// pts: Vector3 list on the floor. Turns smoothly to face where it's going; no foot sliding.
export function* walkTo(rig, pts, o = {}) {
  const speed = o.speed ?? 1.25, run = !!o.run, stride = run ? 1.05 : 0.7;
  const pos = rig.root.position, prevSpeed = rig.speed;
  rig.speed = run ? 24 : 16;
  let ph = o.phase ?? 0, lastStep = 0;
  for (const p of pts) {
    for (;;) {
      const dt = yield;
      const to = p.clone().sub(pos); to.y = 0;
      const d = to.length();
      const yaw = Math.atan2(to.x, to.z);
      let dy = yaw - rig.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      rig.root.rotation.y += dy * Math.min(1, dt * (o.turn ?? 7));
      const step = Math.min(d, speed * dt);
      if (d < 0.02) break;
      pos.addScaledVector(to.normalize(), step);
      ph += (step / stride) * Math.PI;
      rig.set(rig.walkPose(ph, 1, run));
      if (o.onStep && Math.floor(ph / Math.PI) !== lastStep) { lastStep = Math.floor(ph / Math.PI); o.onStep(); }
      if (o.y) pos.y = o.y(pos);
    }
  }
  rig.speed = prevSpeed;
  if (!o.keep) rig.set({ hipL: [0], hipR: [0], knL: [0], knR: [0], shL: [0, 0, 0.04], shR: [0, 0, -0.04], elL: [-0.1], elR: [-0.1], spine: [0], off: [0, 0, 0] });
}
export function* turnTo(rig, yaw, d = 0.6) {
  const y0 = rig.root.rotation.y; let dy = yaw - y0; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  let t = 0;
  while (t < d) { t += yield; const k = Math.min(1, t / d), e = k * k * (3 - 2 * k); rig.root.rotation.y = y0 + dy * e; rig.set(rig.walkPose(e * Math.PI * 1.2, 0.35)); }
  rig.set({ hipL: [0], hipR: [0], knL: [0], knR: [0], shL: [0], shR: [0], elL: [-0.1], elR: [-0.1], spine: [0], off: [0, 0, 0] });
}

// ------------------------------------------------------------------ characters
export function makePlayer(charId = 'temp') {
  const c = PLAYER[charId] || PLAYER.temp;
  const r = new Rig({ outfit: c.o, face: c.face, short: c.short, sleeve: c.sleeve });
  r.set({ shL: [0, 0, 0.04], shR: [0, 0, -0.04], elL: [-0.1], elR: [-0.1] }, true);
  return r;
}
export function crown(scale = 1) {
  const g = new THREE.Group();
  part(g, 0.34, 0.08, 0.34, GOLD, 0, 0, 0);
  for (const [x, z] of [[-0.12, 0.15], [0, 0.15], [0.12, 0.15], [-0.15, 0], [0.15, 0], [-0.12, -0.15], [0, -0.15], [0.12, -0.15]]) part(g, 0.06, 0.1, 0.06, GOLD, x, 0.08, z);
  for (const x of [-0.08, 0.08]) part(g, 0.04, 0.04, 0.02, col(0xd02030, true), x, 0.0, 0.172);
  part(g, 0.05, 0.05, 0.02, col(0x3060ff, true), 0, 0.0, 0.172);
  g.scale.setScalar(scale);
  return g;
}
export function makeChairman() {
  const r = new Rig({ outfit: 'shadow', face: { style: 'grey', skin: 0, hair: 4 }, bulk: 1.4, scale: 1.7 });
  const cr = crown(); cr.position.set(0, 0.36, 0); r.neck.add(cr); r.crown = cr;
  const cape = part(r.spine, 0.62, 1.1, 0.04, col(0x701018), 0, 0.12, -0.2); cape.rotation.x = 0.12; r.cape = cape;
  for (const s of [-1, 1]) part(r.spine, 0.24, 0.12, 0.34, GOLD, s * 0.4, 0.66, 0);
  return r;
}
export function makeCloak() {
  const robe = lam(TX.tex('cs_robecloth', 16, 16, (p, r) => { p.noise([150, 18, 24], 0.14, r); for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x++) if (r() < 0.5) p.set(x, y, [110, 10, 16]); for (let x = 0; x < 16; x++) p.set(x, 15, [210, 170, 70]); }, { mip: false })), dark = col(0x2a0406);
  const hood = arr6(robe, lam(TX.tex('cs_hoodface2', 16, 16, (p, r) => {
    p.noise([150, 18, 24], 0.12, r); p.rect(3, 3, 10, 13, [8, 2, 3]); for (let y = 0; y < 16; y++) { p.set(2, y, [210, 170, 70]); p.set(13, y, [210, 170, 70]); }
    p.set(5, 8, [255, 60, 40]); p.set(10, 8, [255, 60, 40]); p.set(6, 8, [120, 20, 10]); p.set(9, 8, [120, 20, 10]);
  }, { mip: false })));
  const r = new Rig({ outfit: 'p_robe', headMats: hood, headSize: 0.36, gloves: [40, 8, 10], face: { skin: 3 } });
  r.head.scale.set(1.08, 1.25, 1.08); r.head.position.y = 0.2;
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.52, 0.92, 8), robe); skirt.userData.own = true;
  skirt.position.y = -0.44; r.hips.add(skirt); r.skirt = skirt;
  part(r.spine, 0.56, 0.06, 0.32, col(0xc89838), 0, 0.02, 0); // gold rope belt
  part(r.neck, 0.44, 0.12, 0.4, robe, 0, 0.36, -0.03); // hood peak
  part(r.spine, 0.6, 0.9, 0.05, dark, 0, 0.2, -0.18); // back drape
  r.extra.push((dt, R) => { skirt.rotation.x = -R.hipL.rotation.x * 0.15 - R.hipR.rotation.x * 0.15; });
  return r;
}
export function makeStranger() {
  const face = arr6(col(0x101012), lam(TX.tex('cs_strface', 16, 16, (p, r) => { p.noise([22, 20, 22], 0.2, r); p.set(5, 8, [150, 140, 120]); p.set(10, 8, [150, 140, 120]); p.rect(5, 12, 6, 1, [12, 10, 10]); }, { mip: false })), col(0x101012));
  const r = new Rig({ outfit: 'p_coat', headMats: face, gloves: [20, 18, 18], scale: 1.06, face: { skin: 3 } });
  const coat = col(0x8a6c46);
  part(r.hips, 0.56, 0.62, 0.32, coat, 0, -0.3, 0); // coat skirt
  for (const s of [-1, 1]) { const cl = part(r.neck, 0.12, 0.2, 0.3, coat, s * 0.17, 0.05, 0); cl.rotation.z = -s * 0.25; } // collar up
  const hat = new THREE.Group(); hat.position.set(0, 0.34, 0); r.neck.add(hat);
  const cyl = (rt, rb, h, m, y) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 12), m); c.userData.own = true; c.position.y = y; hat.add(c); return c; };
  cyl(0.3, 0.3, 0.025, col(0x0e0e10), 0); cyl(0.17, 0.18, 0.34, col(0x141416), 0.18); cyl(0.182, 0.182, 0.06, col(0x401016), 0.05);
  r.hat = hat;
  return r;
}
// the Extra Hard ending: what the supplement made of you
export function makeMutant(charId = 'temp', tint = null) {
  const base = PLAYER[charId] || PLAYER.temp;
  const fl = tint ? [Math.round(60 + tint.r * 90), Math.round(110 + tint.g * 80), Math.round(40 + tint.b * 40)] : [70, 140, 50];
  const fleshM = lam(TX.flesh(fl, 'mut' + fl)), slimeM = lam(TX.slime([90, 200, 60], 'mutslime'));
  const darkM = lam(TX.flesh(sh3(fl, 0.55), 'mutd' + fl)), boneM = col(0xe8e0c8), veinM = col(0x30601c);
  const skull = arr6(fleshM, lam(TX.eyes('mutant', [255, 240, 80], fl)), fleshM);
  const r = new Rig({ outfit: base.o, headMats: skull, headSize: 0.36, bulk: 1.4, scale: 1.24, face: { skin: 5 }, gloves: fl, short: true, sleeve: fl });
  for (const el of [r.elL, r.elR]) el.children[0].material = fleshM;
  r.handL.material = fleshM; r.handR.material = fleshM;
  // the shirt is mostly gone: rags of it cling to swollen flesh
  const out = TX.OUTFITS[base.o];
  const ragFront = lam(TX.tex('cs_mutfront' + base.o + fl, 16, 16, (p, rr) => {
    p.noise(fl, 0.28, rr);
    for (let i = 0; i < 4; i++) { let x = rr() * 16, y = 0; for (let k = 0; k < 16; k++) { p.set(x, y, sh3(fl, 0.5)); x += rr() * 2 - 1; y += 1; } }
    for (const [x, y, w, h] of [[0, 0, 4, 5], [12, 0, 4, 4], [0, 9, 3, 4], [13, 10, 3, 5], [5, 13, 6, 3]]) for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (rr() < 0.8) p.set(xx, yy, sh3(out.shirt || out.jacket, 0.75 + rr() * 0.2));
    if (out.tie) { p.rect(7, 0, 2, 4, out.tie); p.set(8, 4, out.tie); }
    for (let i = 0; i < 5; i++) { const x = 3 + rr() * 9 | 0, y = 3 + rr() * 9 | 0; p.rect(x, y, 2, 2, [230, 240, 120]); p.set(x, y, [40, 20, 10]); } // boils
    p.rect(0, 14, 16, 2, sh3(out.pants, 0.8));
  }, { mip: false }));
  const ragBack = lam(TX.tex('cs_mutback' + base.o + fl, 16, 16, (p, rr) => { p.noise(sh3(fl, 0.85), 0.3, rr); for (let i = 0; i < 6; i++) p.rect(rr() * 14 | 0, rr() * 14 | 0, 2, 3, sh3(out.jacket, 0.7)); }, { mip: false }));
  r.torso.material = [ragBack, ragBack, fleshM, fleshM, ragFront, ragBack];
  // the old clothes split open: flesh bursts through the shirt, ribs show
  for (const [x, y, z, w, h] of [[0.15, 0.42, 0.15, 0.22, 0.2], [-0.19, 0.18, 0.145, 0.24, 0.22], [0.08, 0.08, 0.15, 0.18, 0.12], [-0.12, 0.5, 0.15, 0.14, 0.18]]) part(r.spine, w, h, 0.06, slimeM, x, y, z);
  for (let i = 0; i < 4; i++) part(r.spine, 0.34, 0.025, 0.04, boneM, -0.02, 0.2 + i * 0.07, 0.17);
  // a huge growth over the right shoulder, pulsing
  const growth = piv(r.spine, 0.32, 0.6, 0.0);
  for (const [x, y, z, s2] of [[0, 0.05, 0, 0.36], [0.12, 0.2, -0.05, 0.24], [-0.08, 0.22, 0.06, 0.2], [0.1, -0.04, 0.12, 0.18]]) part(growth, s2, s2, s2, s2 > 0.3 ? darkM : slimeM, x, y, z);
  for (const [x, y] of [[0.05, 0.12], [-0.06, 0.02], [0.14, 0.26]]) part(growth, 0.05, 0.05, 0.03, col(0xe8ff60, true), x, y, 0.19);
  r.extra.push((dt, R) => { const p = 1 + Math.sin(R.time * 3.1) * 0.06 + Math.sin(R.time * 7.3) * 0.02; growth.scale.set(p, p, p); });
  // bone spikes down the back
  for (let i = 0; i < 6; i++) { const sp = part(r.spine, 0.05, 0.26 - i * 0.02, 0.05, boneM, 0, 0.66 - i * 0.11, -0.16); sp.rotation.x = -0.9; }
  // veins
  for (const [x, y, rz] of [[-0.25, 0.3, 0.4], [0.24, 0.12, -0.6], [-0.05, 0.56, 1.2]]) { const v = part(r.spine, 0.02, 0.3, 0.02, veinM, x, y, 0.15); v.rotation.z = rz; }
  // jaw that opens, extra eyes
  r.head.position.y = 0.2;
  r.jaw = piv(r.neck, 0, 0.08, 0.1); r.j.jaw = r.jaw;
  part(r.jaw, 0.32, 0.07, 0.26, fleshM, 0, -0.03, 0.04);
  for (let i = 0; i < 7; i++) part(r.jaw, 0.022, 0.06, 0.022, col(0xf0e8d0), -0.12 + i * 0.04, 0.02, 0.16);
  for (let i = 0; i < 3; i++) { const d = part(r.jaw, 0.02, 0.12 + i * 0.05, 0.02, slimeM, -0.08 + i * 0.08, -0.12 - i * 0.02, 0.15); d.userData.drip = i; }
  const eyeM = col(0xe8ff60, true);
  for (const [x, y, s2] of [[-0.12, 0.3, 0.05], [0.13, 0.27, 0.06], [0.0, 0.37, 0.04], [0.18, 0.12, 0.035], [-0.17, 0.16, 0.04], [0.07, 0.42, 0.03]]) part(r.neck, s2, s2, 0.03, eyeM, x, y, 0.19);
  // claws, long arms (the left one longer)
  for (const ha of [r.haL, r.haR]) for (let k = -1; k <= 1; k++) { const c = part(ha, 0.03, 0.2, 0.03, col(0x2a2418), k * 0.045, -0.19, 0.03); c.rotation.x = 0.45; }
  r.elL.children[0].scale.set(1.2, 1.7, 1.2); r.elL.children[0].position.y = -0.23; r.haL.position.y = -0.47;
  r.elR.children[0].scale.set(1.15, 1.4, 1.15); r.elR.children[0].position.y = -0.19; r.haR.position.y = -0.4;
  part(r.shL, 0.2, 0.18, 0.2, darkM, 0, 0.02, 0); // swollen shoulder
  // tentacles from the back and shoulders, curling up around the silhouette
  r.tentacles = [];
  const tm = [fleshM, slimeM, darkM];
  const roots = [[-0.22, 0.58, -0.6, 0.9], [0.22, 0.58, 0.6, 0.9], [-0.15, 0.4, -1.1, 0.6], [0.15, 0.4, 1.1, 0.6], [0, 0.62, -0.25, 1.15], [0, 0.62, 0.25, 1.15], [-0.25, 0.2, -1.5, 0.3], [0.25, 0.2, 1.5, 0.3]];
  roots.forEach(([x, y, rz, up], i) => {
    let p = piv(r.spine, x, y, -0.14);
    p.rotation.set(-1.2 - up * 0.6, 0, rz);
    const segs = [];
    for (let k = 0; k < 11; k++) {
      const s2 = 0.13 * (1 - k / 13);
      part(p, s2, 0.17, s2, tm[k % 3], 0, 0.085, 0);
      if (k === 10) part(p, 0.03, 0.12, 0.03, boneM, 0, 0.2, 0);
      const q = piv(p, 0, 0.16, 0); segs.push(q); p = q;
    }
    r.tentacles.push({ segs, ph: i * 1.1, amp: 0.3 + (i % 3) * 0.06 });
  });
  r.tentAmp = 1; r.tentSpeed = 1;
  r.extra.push((dt, R) => {
    for (const t of R.tentacles) t.segs.forEach((q, k) => {
      q.rotation.x = (Math.sin(R.time * 2.2 * R.tentSpeed + t.ph + k * 0.7) * t.amp * R.tentAmp + 0.08) * (0.4 + k * 0.08);
      q.rotation.z = Math.cos(R.time * 1.7 * R.tentSpeed + t.ph * 0.7 + k * 0.5) * t.amp * R.tentAmp * 0.6;
    });
  });
  r.rest = { spine: [0.36, 0, 0.05], neck: [-0.3, 0.1, 0.05], shL: [0, 0, 0.3], shR: [0, 0, -0.25], elL: [-0.35], elR: [-0.35], knL: [0.25], knR: [0.2], hipL: [-0.18], hipR: [-0.15] };
  r.hipBase = 0.84;
  return r;
}
const sh3 = (c, f) => c.map((v) => Math.round(v * f));

// ------------------------------------------------------------------ props
export function pistol() {
  const g = new THREE.Group(), m = lam(TX.gunMetal());
  part(g, 0.05, 0.08, 0.2, m, 0, 0, 0.04); part(g, 0.045, 0.12, 0.06, m, 0, -0.08, -0.03).rotation.x = 0.25;
  return g;
}
export function detonator() {
  const g = new THREE.Group();
  part(g, 0.07, 0.12, 0.035, col(0x30333a), 0, 0, 0);
  part(g, 0.008, 0.08, 0.008, col(0x202020), 0.025, 0.1, 0);
  const btn = part(g, 0.035, 0.012, 0.035, col(0xd02020), 0, 0.066, 0); g.btn = btn;
  const led = part(g, 0.014, 0.014, 0.008, col(0xff2020, true), -0.02, 0.03, 0.019); g.led = led;
  part(g, 0.05, 0.02, 0.004, col(0xe0c040, true), 0, -0.02, 0.019);
  return g;
}
export function briefcase() {
  const g = new THREE.Group(), lea = lam(TX.leather()), dark = col(0x3a1418);
  part(g, 0.5, 0.06, 0.34, lea, 0, 0.03, 0); // base shell
  part(g, 0.47, 0.01, 0.31, dark, 0, 0.061, 0); // lining
  const lid = piv(g, 0, 0.06, -0.17);
  part(lid, 0.5, 0.06, 0.34, lea, 0, 0.03, 0.17);
  for (const x of [-0.16, 0.16]) { part(g, 0.04, 0.03, 0.01, GOLD_HI, x, 0.06, 0.172); }
  const handle = part(lid, 0.14, 0.03, 0.03, col(0x2a1a10), 0, 0.03, 0.36); handle.userData.handle = true;
  g.lid = lid;
  return g;
}
export function burger() {
  const g = new THREE.Group();
  const cyl = (r, h, c, y, s = 1) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * s, h, 10), col(c)); m.userData.own = true; m.position.y = y; g.add(m); return m; };
  cyl(0.06, 0.025, 0xc8893c, 0);
  cyl(0.064, 0.022, 0x4a2410, 0.024);
  const ch = part(g, 0.13, 0.006, 0.13, col(0xf0b020), 0, 0.038, 0); ch.rotation.y = 0.4;
  cyl(0.066, 0.008, 0x40a030, 0.044);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), col(0xd09040)); top.userData.own = true; top.scale.y = 0.7; top.position.y = 0.048; g.add(top);
  for (let i = 0; i < 6; i++) part(g, 0.006, 0.003, 0.01, col(0xf8f0d8), Math.cos(i) * 0.03, 0.08, Math.sin(i * 2) * 0.03);
  return g;
}
