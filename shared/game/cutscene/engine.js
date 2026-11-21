// Cutscene engine: a self-contained 3D scene with its own camera, rendered through the game's
// post-processing (bloom, grade, retro filter). Scripts are generator coroutines:
//   yield 1.5          wait 1.5 seconds
//   yield () => cond   wait until cond() is true
//   yield              wait one frame (returns dt)
//   yield* tween(d, (k) => ...)   animate over d seconds
// Several scripts can run at once (cs.run). The overlay draws letterbox bars, captions, fades and
// a SKIP button. Particles (fire, smoke, dust, sparks, slime, paper...), flying debris (glass,
// concrete, paper) and rain are built in.
import * as THREE from '../../vendor/three.module.min.js';
import * as TX from '../../engine/textures.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (k) => k * k * (3 - 2 * k);
export const easeIO = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const easeOut = (k) => 1 - Math.pow(1 - k, 3);
export const easeIn = (k) => k * k * k;
export const linear = (k) => k;
export function* tween(d, fn, ez = smooth) { let t = 0; fn(0); while (t < d) { t += yield; fn(ez(Math.min(1, t / d))); } }
export const rnd = (a, b) => a + Math.random() * (b - a);

// ------------------------------------------------------------------ particles (one draw call per blend mode)
const PVERT = `
attribute float size; attribute vec4 col; uniform float scale; varying vec4 vC;
void main() { vC = col; vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = clamp(size * scale / max(0.05, -mv.z), 0.0, 600.0); gl_Position = projectionMatrix * mv; }`;
const PFRAG = `
uniform sampler2D map; varying vec4 vC;
void main() { vec4 t = texture2D(map, gl_PointCoord); float a = t.a * vC.a; if (a < 0.01) discard; gl_FragColor = vec4(vC.rgb * t.rgb, a); }`;

// cols: colour + alpha at t = 0, 0.35 and 1 (linear-ish values; the post pass converts to sRGB)
const PRESETS = {
  fire: { add: 1, life: [0.45, 1.0], size: [0.9, 2.2], g: -2.2, drag: 1.6, spd: 1.6, up: 1.2, cols: [[1.6, 1.3, 0.6, 1], [1.4, 0.45, 0.08, 0.9], [0.3, 0.05, 0.01, 0]] },
  flash: { add: 1, life: [0.18, 0.3], size: [4, 7], g: 0, drag: 0, spd: 0, up: 0, cols: [[2, 1.7, 1.1, 1], [1.6, 0.8, 0.3, 0.6], [0.6, 0.2, 0.05, 0]] },
  smoke: { add: 0, life: [2.2, 4.2], size: [1.4, 4.6], g: -0.5, drag: 0.7, spd: 0.8, up: 0.9, cols: [[0.12, 0.1, 0.09, 0], [0.09, 0.085, 0.08, 0.72], [0.07, 0.07, 0.07, 0]] },
  haze: { add: 0, life: [5, 8], size: [3, 6], g: -0.05, drag: 0.4, spd: 0.15, up: 0.1, cols: [[0.2, 0.18, 0.17, 0], [0.16, 0.15, 0.14, 0.22], [0.15, 0.14, 0.13, 0]] },
  spark: { add: 1, life: [0.35, 0.9], size: [0.12, 0.05], g: 9, drag: 0.4, spd: 6, up: 1.5, cols: [[2, 1.8, 1, 1], [1.8, 0.9, 0.2, 1], [0.8, 0.2, 0.02, 0]] },
  ember: { add: 1, life: [1.5, 3], size: [0.09, 0.04], g: -0.8, drag: 0.8, spd: 1.2, up: 1, cols: [[1.8, 1, 0.3, 1], [1.5, 0.5, 0.08, 1], [0.5, 0.1, 0.0, 0]] },
  dust: { add: 0, life: [1.6, 3.2], size: [1.6, 6], g: -0.15, drag: 2.2, spd: 6, up: 0.6, cols: [[0.36, 0.33, 0.29, 0.9], [0.3, 0.28, 0.25, 0.75], [0.25, 0.24, 0.22, 0]] },
  ceilingdust: { add: 0, life: [1.2, 2], size: [0.18, 0.5], g: 3, drag: 1.5, spd: 0.3, up: -0.5, cols: [[0.5, 0.48, 0.44, 0.7], [0.45, 0.43, 0.4, 0.5], [0.4, 0.4, 0.38, 0]] },
  slime: { add: 0, life: [0.6, 1.2], size: [0.07, 0.05], g: 9, drag: 0.2, spd: 0.4, up: 0, cols: [[0.35, 0.9, 0.15, 1], [0.3, 0.75, 0.1, 1], [0.2, 0.5, 0.06, 0]] },
  slimeglow: { add: 1, life: [0.8, 1.4], size: [0.25, 0.1], g: 3, drag: 1, spd: 0.3, up: 0, cols: [[0.4, 1.2, 0.2, 0.7], [0.3, 0.9, 0.1, 0.5], [0.1, 0.3, 0.0, 0]] },
  paper: { add: 0, life: [2.2, 3.6], size: [0.16, 0.14], g: 1.6, drag: 1.4, spd: 5, up: 3, cols: [[0.9, 0.9, 0.86, 1], [0.85, 0.85, 0.8, 1], [0.8, 0.8, 0.76, 0]] },
  steam: { add: 0, life: [1.4, 2.4], size: [0.08, 0.45], g: -0.4, drag: 1, spd: 0.1, up: 0.25, cols: [[0.7, 0.7, 0.7, 0], [0.7, 0.7, 0.7, 0.25], [0.7, 0.7, 0.7, 0]] },
  splash: { add: 0, life: [0.15, 0.3], size: [0.06, 0.12], g: 4, drag: 0, spd: 1, up: 1, cols: [[0.6, 0.65, 0.75, 0.6], [0.5, 0.55, 0.65, 0.4], [0.5, 0.55, 0.65, 0]] },
  glint: { add: 1, life: [0.4, 0.9], size: [0.1, 0.02], g: 6, drag: 0.3, spd: 4, up: 1, cols: [[1.4, 1.6, 2, 1], [0.8, 1, 1.4, 0.8], [0.3, 0.4, 0.6, 0]] },
  neon: { add: 1, life: [0.08, 0.12], size: [1, 1], g: 0, drag: 0, spd: 0, up: 0, cols: [[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 0]] },
};
const KINDS = Object.keys(PRESETS);

class ParticleSystem {
  constructor(scene, additive, max = 2400) {
    this.max = max; this.n = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.size = new Float32Array(max); this.col = new Float32Array(max * 4);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('col', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxL = new Float32Array(max);
    this.kind = new Uint8Array(max); this.sc = new Float32Array(max); this.tint = new Float32Array(max * 3);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: PVERT, fragmentShader: PFRAG, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { map: { value: additive ? TX.glow() : TX.smoke() }, scale: { value: 300 } },
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 5;
    scene.add(this.points);
  }
  add(k, p, v, life, sc, tint) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.pos.set([p.x, p.y, p.z], i * 3); this.vel.set([v.x, v.y, v.z], i * 3);
    this.life[i] = 0; this.maxL[i] = life; this.kind[i] = k; this.sc[i] = sc;
    this.tint.set(tint || [1, 1, 1], i * 3);
  }
  kill(i) {
    const j = --this.n; if (i === j) return;
    for (let a = 0; a < 3; a++) { this.pos[i * 3 + a] = this.pos[j * 3 + a]; this.vel[i * 3 + a] = this.vel[j * 3 + a]; this.tint[i * 3 + a] = this.tint[j * 3 + a]; }
    this.life[i] = this.life[j]; this.maxL[i] = this.maxL[j]; this.kind[i] = this.kind[j]; this.sc[i] = this.sc[j];
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      this.life[i] += dt;
      if (this.life[i] >= this.maxL[i]) { this.kill(i); i--; continue; }
      const P = PRESETS[KINDS[this.kind[i]]], t = this.life[i] / this.maxL[i];
      const dr = Math.max(0, 1 - P.drag * dt);
      this.vel[i * 3 + 1] -= P.g * dt;
      for (let a = 0; a < 3; a++) { this.vel[i * 3 + a] *= dr; this.pos[i * 3 + a] += this.vel[i * 3 + a] * dt; }
      if (P === PRESETS.paper) { this.pos[i * 3] += Math.sin(this.life[i] * 7 + i) * dt * 0.8; this.pos[i * 3 + 2] += Math.cos(this.life[i] * 6 + i) * dt * 0.8; }
      const c = P.cols, a = t < 0.35 ? 0 : 1, k = t < 0.35 ? t / 0.35 : (t - 0.35) / 0.65, c0 = c[a], c1 = c[a + 1];
      this.col[i * 4] = lerp(c0[0], c1[0], k) * this.tint[i * 3]; this.col[i * 4 + 1] = lerp(c0[1], c1[1], k) * this.tint[i * 3 + 1];
      this.col[i * 4 + 2] = lerp(c0[2], c1[2], k) * this.tint[i * 3 + 2]; this.col[i * 4 + 3] = lerp(c0[3], c1[3], k);
      this.size[i] = lerp(P.size[0], P.size[1], t) * this.sc[i];
    }
    this.geo.setDrawRange(0, this.n);
    for (const k of ['position', 'size', 'col']) this.geo.attributes[k].needsUpdate = true;
  }
  clear() { this.n = 0; this.geo.setDrawRange(0, 0); }
}

export class Particles {
  constructor(scene) { this.add = new ParticleSystem(scene, true, 2600); this.alpha = new ParticleSystem(scene, false, 2600); }
  // o: s (size x), v (speed x), dir (Vector3 bias), spread (position jitter radius), life (x), tint [r,g,b]
  emit(kind, p, n = 1, o = {}) {
    const P = PRESETS[kind], k = KINDS.indexOf(kind), sys = P.add ? this.add : this.alpha;
    for (let i = 0; i < n; i++) {
      const sp = o.spread ?? 0.2;
      const q = V(p.x + rnd(-sp, sp), p.y + rnd(-sp, sp) * (o.flat ? 0.2 : 1), p.z + rnd(-sp, sp));
      const s = P.spd * (o.v ?? 1);
      const v = V(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(s * rnd(0.3, 1));
      v.y += P.up * (o.v ?? 1);
      if (o.dir) v.addScaledVector(o.dir, 1);
      sys.add(k, q, v, rnd(P.life[0], P.life[1]) * (o.life ?? 1), (o.s ?? 1) * rnd(0.75, 1.25), o.tint);
    }
  }
  // a full explosion: flash, fireball, smoke, sparks, embers
  boom(p, s = 1, o = {}) {
    this.emit('flash', p, 2, { s: Math.min(s, 1.4), spread: 0.2 * s });
    this.emit('fire', p, Math.round(26 * Math.min(2.5, s)), { s, v: s * 1.3, spread: 0.5 * s, dir: o.dir });
    this.emit('smoke', p, Math.round(14 * Math.min(2.5, s)), { s: s * 0.9, v: s, spread: 0.7 * s, dir: o.dir && o.dir.clone().multiplyScalar(0.5) });
    this.emit('spark', p, Math.round(20 * Math.min(2, s)), { v: 1 + s * 0.4, spread: 0.3 * s });
    this.emit('ember', p, Math.round(10 * s), { v: s, spread: 0.6 * s });
  }
  setScale(v) { this.add.mat.uniforms.scale.value = v; this.alpha.mat.uniforms.scale.value = v; }
  update(dt) { this.add.update(dt); this.alpha.update(dt); }
  clear() { this.add.clear(); this.alpha.clear(); }
}

// ------------------------------------------------------------------ flying debris (real meshes that tumble and bounce)
const DMATS = {};
function dmat(kind) {
  if (DMATS[kind]) return DMATS[kind];
  const m = {
    glass: () => new THREE.MeshBasicMaterial({ color: 0xa8d0f0, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
    concrete: () => new THREE.MeshLambertMaterial({ color: 0x77736c }),
    metal: () => new THREE.MeshLambertMaterial({ color: 0x55585e }),
    wood: () => new THREE.MeshLambertMaterial({ color: 0x5a3820 }),
    paper: () => new THREE.MeshBasicMaterial({ color: 0xe8e6dc, side: THREE.DoubleSide }),
    ember: () => new THREE.MeshBasicMaterial({ color: 0xff8030 }),
    flesh: () => new THREE.MeshLambertMaterial({ color: 0x3c7a24 }),
  }[kind]();
  DMATS[kind] = m; return m;
}
const DGEO = { glass: new THREE.PlaneGeometry(1, 1), paper: new THREE.PlaneGeometry(1, 0.75) };
const DBOX = new THREE.BoxGeometry(1, 1, 1);
export class Debris {
  constructor(scene) { this.scene = scene; this.list = []; }
  spawn(kind, p, v, o = {}) {
    if (this.list.length > 260) { const d = this.list.shift(); this.scene.remove(d.m); }
    const m = new THREE.Mesh(DGEO[kind] || DBOX, dmat(kind));
    const s = o.s ?? rnd(0.08, 0.22);
    m.scale.set(s * rnd(0.6, 1.4), s * rnd(0.6, 1.4), DGEO[kind] ? 1 : s * rnd(0.5, 1.2));
    m.position.copy(p); m.rotation.set(rnd(0, 6), rnd(0, 6), rnd(0, 6));
    this.scene.add(m);
    this.list.push({ m, v: v.clone(), w: V(rnd(-9, 9), rnd(-9, 9), rnd(-9, 9)), life: o.life ?? rnd(3, 5), floor: o.floor ?? 0, drag: DGEO[kind] ? 1.2 : 0.1, g: o.g ?? 9.8 });
  }
  burst(kind, p, n, spd, dir = null, o = {}) {
    for (let i = 0; i < n; i++) {
      const v = V(rnd(-1, 1), rnd(-0.3, 1), rnd(-1, 1)).normalize().multiplyScalar(spd * rnd(0.3, 1));
      if (dir) v.addScaledVector(dir, rnd(0.6, 1.2));
      this.spawn(kind, p.clone().add(V(rnd(-0.3, 0.3), rnd(-0.3, 0.3), rnd(-0.3, 0.3)).multiplyScalar(o.spread ?? 1)), v, o);
    }
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const d = this.list[i];
      d.life -= dt;
      if (d.life <= 0) { this.scene.remove(d.m); this.list.splice(i, 1); continue; }
      d.v.y -= d.g * dt; d.v.multiplyScalar(Math.max(0, 1 - d.drag * dt));
      d.m.position.addScaledVector(d.v, dt);
      if (d.m.position.y < d.floor + 0.02) { d.m.position.y = d.floor + 0.02; d.v.y *= -0.3; d.v.x *= 0.6; d.v.z *= 0.6; d.w.multiplyScalar(0.5); }
      d.m.rotation.x += d.w.x * dt; d.m.rotation.y += d.w.y * dt; d.m.rotation.z += d.w.z * dt;
      if (d.life < 0.5) d.m.scale.multiplyScalar(Math.max(0, 1 - dt * 3));
    }
  }
  clear() { for (const d of this.list) this.scene.remove(d.m); this.list = []; }
}

// ------------------------------------------------------------------ rain (streaks that follow the camera)
export class Rain {
  constructor(scene, n = 1100) {
    this.n = n; this.on = false; this.amount = 1; this.wind = 0.15;
    this.p = new Float32Array(n * 6); this.d = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { this.d[i * 3] = rnd(-16, 16); this.d[i * 3 + 1] = rnd(-2, 20); this.d[i * 3 + 2] = rnd(-16, 16); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x8fa8c8, transparent: true, opacity: 0.42, depthWrite: false }));
    this.mesh.frustumCulled = false; this.mesh.visible = false; scene.add(this.mesh);
  }
  update(dt, cam, fx, groundY = 0) {
    this.mesh.visible = this.on; if (!this.on) return;
    const n = Math.floor(this.n * this.amount);
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      this.d[j + 1] -= 22 * dt; this.d[j] += this.wind * 22 * dt;
      let x = cam.x + this.d[j], y = this.d[j + 1] + cam.y - 6, z = cam.z + this.d[j + 2];
      if (y < groundY) {
        if (fx && i % 9 === 0 && Math.abs(this.d[j]) < 8 && Math.abs(this.d[j + 2]) < 8 && (!this.mask || this.mask(x, z))) fx.emit('splash', V(x, groundY + 0.02, z), 1, { spread: 0 });
        this.d[j + 1] += 24; this.d[j] = rnd(-16, 16); this.d[j + 2] = rnd(-16, 16);
        x = cam.x + this.d[j]; y = this.d[j + 1] + cam.y - 6; z = cam.z + this.d[j + 2];
      }
      const k = i * 6;
      if (this.mask && !this.mask(x, z)) y = -999;
      this.p[k] = x; this.p[k + 1] = y; this.p[k + 2] = z;
      this.p[k + 3] = x - this.wind * 0.6; this.p[k + 4] = y + 0.6; this.p[k + 5] = z;
    }
    this.geo.setDrawRange(0, n * 2); this.geo.attributes.position.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ overlay (letterbox, captions, fades, skip)
function overlay() {
  let o = document.getElementById('cs');
  if (!o) {
    o = document.createElement('div'); o.id = 'cs'; o.className = 'hidden';
    o.innerHTML = '<div class="cs-bar cs-top"></div><div class="cs-bar cs-bot"></div><div class="cs-cap"></div><div class="cs-title"><b></b><span></span></div><div class="cs-fade"></div><button class="cs-skip">SKIP &#9656;&#9656;</button>';
    document.body.append(o);
  }
  return o;
}

// ------------------------------------------------------------------ the cutscene
export class Cutscene {
  constructor(ctx) {
    this.ctx = ctx; // { renderer, post, PC, onDone, sfxOn }
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x000000, 10, 200);
    this.scene.background = new THREE.Color(0x000000);
    this.camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.04, 1400);
    this.scene.add(this.camera);
    this.cam = { pos: V(0, 1.6, 0), look: V(0, 1.6, -1), roll: 0, fov: 50 };
    this.tasks = []; this.time = 0; this.shake = 0; this.handheld = 0.15; this.alive = true; this.slow = 1;
    this.fx = new Particles(this.scene); this.debris = new Debris(this.scene); this.rain = new Rain(this.scene);
    this.groundY = 0; this.updaters = []; this.sets = {}; this.set = null;
    this.ov = overlay(); this.ov.classList.remove('hidden');
    this.bars = 0; this.barGoal = 1; this.fadeV = 1; this.fadeCol = '#000';
    this.skipArmed = 0;
    this.$ = (s) => this.ov.querySelector(s);
    this.$('.cs-cap').textContent = ''; this.$('.cs-title').classList.remove('on');
    const skip = this.$('.cs-skip');
    skip.textContent = 'SKIP ▸▸';
    this.onSkip = (e) => { e.stopPropagation(); e.preventDefault(); this.trySkip(); };
    skip.addEventListener('pointerdown', this.onSkip);
    this.onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.trySkip(); } };
    window.addEventListener('keydown', this.onKey, true);
  }
  trySkip() {
    if (!this.alive) return;
    if (this.skipArmed > 0) { this.finish(); return; }
    this.skipArmed = 2.2; this.$('.cs-skip').textContent = this.ctx.PC ? 'PRESS AGAIN TO SKIP' : 'TAP AGAIN TO SKIP';
  }
  run(fn) { const g = typeof fn === 'function' ? fn.call(this) : fn; const t = { g, wait: 0, until: null, done: false }; this.tasks.push(t); return t; }
  every(fn) { this.updaters.push(fn); return fn; }
  // register a set (a Group with its own lights, fog and background); only one is visible at a time
  addSet(name, s) { this.sets[name] = s; s.group.visible = false; this.scene.add(s.group); return s; }
  use(name) {
    for (const k in this.sets) this.sets[k].group.visible = k === name;
    const s = this.set = this.sets[name];
    this.fx.clear(); this.debris.clear();
    this.scene.fog.color.set(s.fog ?? 0x000000); this.scene.fog.near = s.fogNear ?? 10; this.scene.fog.far = s.fogFar ?? 200;
    this.scene.background = new THREE.Color(s.bg ?? s.fog ?? 0x000000);
    this.groundY = s.groundY ?? 0;
    this.rain.on = !!s.rain; this.rain.mask = s.rainMask || null;
    if (s.grade) this.ctx.post.grade(s.grade);
    if (s.enter) s.enter();
    return s;
  }
  // camera helpers
  place(pos, look, fov) { this.cam.pos.copy(pos); this.cam.look.copy(look); if (fov) this.cam.fov = fov; }
  *move(d, pos, look, ez = easeIO, fov) {
    const p0 = this.cam.pos.clone(), l0 = this.cam.look.clone(), f0 = this.cam.fov;
    yield* tween(d, (k) => { if (pos) this.cam.pos.lerpVectors(p0, pos, k); if (look) this.cam.look.lerpVectors(l0, look, k); if (fov) this.cam.fov = lerp(f0, fov, k); }, ez);
  }
  *path(d, pts, look, ez = easeIO) { // along a smooth curve; look: Vector3 or (k) => Vector3
    const c = new THREE.CatmullRomCurve3(pts);
    yield* tween(d, (k) => { c.getPoint(k, this.cam.pos); this.cam.look.copy(typeof look === 'function' ? look(k) : look); }, ez);
  }
  *fade(to, d = 0.6, col) { if (col) this.fadeCol = col; const f0 = this.fadeV; yield* tween(d, (k) => { this.fadeV = lerp(f0, to, k); }, linear); }
  caption(text, hold = 2.4) {
    const c = this.$('.cs-cap'); c.textContent = text; c.classList.remove('on'); void c.offsetWidth; c.classList.add('on');
    clearTimeout(this.capT); this.capT = setTimeout(() => c.classList.remove('on'), hold * 1000);
  }
  title(a, b, col) { const t = this.$('.cs-title'); t.querySelector('b').textContent = a; t.querySelector('b').style.color = col || '#f0c860'; t.querySelector('span').textContent = b || ''; t.classList.add('on'); }
  update(dt) {
    if (!this.alive) return;
    dt = Math.min(dt, 0.05);
    this.time += dt;
    for (const t of this.tasks) {
      if (t.done) continue;
      if (t.wait > 0) { t.wait -= dt; if (t.wait > 0) continue; }
      if (t.until) { if (!t.until()) continue; t.until = null; }
      let r;
      try { r = t.g.next(dt); } catch (err) { console.error(err); t.done = true; continue; }
      if (r.done) { t.done = true; continue; }
      if (typeof r.value === 'number') t.wait = r.value; else if (typeof r.value === 'function') t.until = r.value;
    }
    this.tasks = this.tasks.filter((t) => !t.done);
    const wdt = dt * this.slow;
    for (const u of this.updaters) u(wdt, dt);
    this.fx.update(wdt); this.debris.update(wdt);
    this.rain.update(dt, this.camera.position, this.fx, this.groundY);
    this.shake = Math.max(0, this.shake - dt * 1.4);
    this.skipArmed = Math.max(0, this.skipArmed - dt);
    if (this.skipArmed <= 0) this.$('.cs-skip').textContent = 'SKIP ▸▸';
    this.applyCamera();
    this.drawOverlay(dt);
  }
  applyCamera() {
    const c = this.camera, t = this.time, s = this.handheld * 0.012 + this.shake * this.shake * 0.12;
    const ox = (Math.sin(t * 1.7) * 0.6 + Math.sin(t * 4.3 + 1.3) * 0.25 + (this.shake > 0.05 ? (Math.random() - 0.5) * this.shake : 0)) * s;
    const oy = (Math.sin(t * 1.3 + 2) * 0.6 + Math.sin(t * 3.7) * 0.25 + (this.shake > 0.05 ? (Math.random() - 0.5) * this.shake : 0)) * s;
    c.position.copy(this.cam.pos);
    c.lookAt(this.cam.look);
    c.rotateZ(this.cam.roll);
    c.rotateX(oy); c.rotateY(ox);
    // keep roughly the same framing on tall phone screens: widen the vertical field of view
    const a = this.ctx.aspect(), vr = THREE.MathUtils.degToRad(this.cam.fov);
    let need = vr;
    if (a < 16 / 9) { const h = 2 * Math.atan(Math.tan(vr / 2) * 16 / 9); need = Math.min(vr * 1.8, 2 * Math.atan(Math.tan(h / 2) / a)); }
    c.aspect = a; c.fov = THREE.MathUtils.radToDeg(need); c.updateProjectionMatrix();
    this.fx.setScale(this.ctx.height() / (2 * Math.tan(need / 2)));
  }
  drawOverlay(dt) {
    const portrait = this.ctx.aspect() < 1;
    this.bars += (this.barGoal - this.bars) * Math.min(1, dt * 3);
    const bh = this.bars * (portrait ? 7 : 11);
    this.$('.cs-top').style.height = bh + '%'; this.$('.cs-bot').style.height = bh + '%';
    const f = this.$('.cs-fade'); f.style.opacity = this.fadeV.toFixed(3); f.style.background = this.fadeCol;
  }
  render(renderer) { renderer.render(this.scene, this.camera); }
  finish() {
    if (!this.alive) return;
    this.alive = false;
    this.cleanup();
    this.ctx.onDone && this.ctx.onDone();
  }
  cleanup() {
    this.ov.classList.add('hidden'); this.$('.cs-title').classList.remove('on'); this.$('.cs-cap').classList.remove('on');
    this.$('.cs-skip').removeEventListener('pointerdown', this.onSkip);
    window.removeEventListener('keydown', this.onKey, true);
    clearTimeout(this.capT);
    if (this.stopAudio) this.stopAudio();
    this.scene.traverse((o) => { if ((o.isMesh || o.isLineSegments) && (o.userData.own || o.userData.merged)) o.geometry.dispose(); });
    for (const k in this.sets) if (this.sets[k].dispose) this.sets[k].dispose();
    this.fx.clear(); this.debris.clear();
  }
}

// keep the number of lights identical in every set, so switching sets never recompiles shaders
export function padLights(group, budget = { point: 4, spot: 1, dir: 1, hemi: 1 }) {
  const have = { point: 0, spot: 0, dir: 0, hemi: 0 };
  group.traverse((o) => { if (o.isPointLight) have.point++; else if (o.isSpotLight) have.spot++; else if (o.isDirectionalLight) have.dir++; else if (o.isHemisphereLight) have.hemi++; });
  for (let i = have.point; i < budget.point; i++) { const l = new THREE.PointLight(0, 0, 1); l.position.set(0, -500, 0); group.add(l); }
  for (let i = have.spot; i < budget.spot; i++) { const l = new THREE.SpotLight(0, 0, 1); l.position.set(0, -500, 0); group.add(l); group.add(l.target); }
  for (let i = have.dir; i < budget.dir; i++) group.add(new THREE.DirectionalLight(0, 0));
  for (let i = have.hemi; i < budget.hemi; i++) group.add(new THREE.HemisphereLight(0, 0, 0));
  return group;
}
