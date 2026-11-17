// Particles, gibs, bullet holes and impact flashes.
import * as THREE from '../vendor/three.module.min.js';
import * as TX from './textures.js';
import { rand } from './util.js';

const CUBE = new THREE.BoxGeometry(0.06, 0.06, 0.06);
const MATS = {
  blood: [0x8a0c0c, 0xb01818, 0x5a0606].map((c) => new THREE.MeshBasicMaterial({ color: c })),
  spark: [0xfff080, 0xffb020, 0xffffff].map((c) => new THREE.MeshBasicMaterial({ color: c })),
  dust: [0x8a8478, 0x6a645a, 0xb0a898].map((c) => new THREE.MeshLambertMaterial({ color: c })),
  pop: [0xff9a20, 0xfff0a0, 0xd040ff].map((c) => new THREE.MeshBasicMaterial({ color: c })),
  fire: [0xff6010, 0xffb020, 0xfff080, 0xd02008].map((c) => new THREE.MeshBasicMaterial({ color: c })),
  ice: [0xa0e8ff, 0xffffff, 0x60a8ff].map((c) => new THREE.MeshBasicMaterial({ color: c })),
  goo: [0x70d040, 0x40a020, 0xb0ff60].map((c) => new THREE.MeshBasicMaterial({ color: c })),
};
const BEAM_G = new THREE.BoxGeometry(1, 1, 1);
const beamMats = new Map();
const beamMat = (c) => {
  if (!beamMats.has(c)) beamMats.set(c, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  return beamMats.get(c);
};
const HOLE_M = new THREE.MeshBasicMaterial({ map: TX.bulletHole(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
const HOLE_G = new THREE.PlaneGeometry(0.09, 0.09);
const FLASH_M = new THREE.MeshBasicMaterial({ map: TX.flash(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
const FLASH_G = new THREE.PlaneGeometry(0.35, 0.35);
const bbCache = new Map();

// ---- phase 5 effects: pooled lights, smoke, shockwaves, decals, dust motes, shell casings
const RING_G = new THREE.PlaneGeometry(1, 1);
const DECAL_G = new THREE.PlaneGeometry(1, 1);
const decalMat = (map, color, opacity = 0.92) => new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
const SPLAT_COL = { blood: 0x6a0808, spark: 0x101010, goo: 0x3c8a18 };
const CASING_G = new THREE.BoxGeometry(0.009, 0.009, 0.024);
const CASING_M = new THREE.MeshLambertMaterial({ color: 0xd8a83c, emissive: 0x2a1800 });

export class Effects {
  constructor(scene, camera) {
    this.scene = scene; this.camera = camera;
    this.parts = []; this.debrisList = []; this.holes = []; this.flashes = [];
    this.pool = [];
    for (let i = 0; i < 220; i++) { const m = new THREE.Mesh(CUBE, MATS.blood[0]); m.visible = false; scene.add(m); this.pool.push(m); }
    this.pi = 0;
    // a few pooled point lights for flashes (fixed count so shaders never recompile)
    this.lights = [];
    for (let i = 0; i < 3; i++) { const l = new THREE.PointLight(0xffa040, 0, 7, 1.6); l.position.set(0, -50, 0); scene.add(l); this.lights.push({ l, life: 0, max: 1, peak: 0 }); }
    // smoke / glow sprites
    this.sprites = [];
    this.spritePool = [];
    for (let i = 0; i < 48; i++) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.smoke(), transparent: true, depthWrite: false, opacity: 0 }));
      m.visible = false; scene.add(m); this.spritePool.push(m);
    }
    this.si = 0;
    this.decals = [];
    this.decalMats = {
      scorch: decalMat(TX.scorch(), 0xffffff, 0.85),
      blood: [0, 1, 2].map((k) => decalMat(TX.splat(k), SPLAT_COL.blood)),
      spark: [0, 1, 2].map((k) => decalMat(TX.splat(k), SPLAT_COL.spark, 0.8)),
      goo: [0, 1, 2].map((k) => decalMat(TX.splat(k), SPLAT_COL.goo)),
      water: [0, 1, 2].map((k) => decalMat(TX.splat(k), 0x6aa8ff, 0.45)),
    };
    // floating dust in the light
    const N = 160, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = rand(Math.random, -3.3, 3.3); pos[i * 3 + 1] = rand(Math.random, 0.2, 2.9); pos[i * 3 + 2] = rand(Math.random, -12, 0); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.motes = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xfff0d0, size: 0.022, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.motes.frustumCulled = false; scene.add(this.motes); this.moteT = 0;
    this.casings = [];
  }

  // ---- lights
  light(pos, color = 0xffa040, intensity = 12, dist = 7, life = 0.25) {
    if ((this.mult ?? 1) < 0.75) return; // LOW graphics: no dynamic flash lights
    let best = this.lights[0];
    for (const L of this.lights) if (L.life <= 0 || L.peak * (L.life / L.max) < best.peak * (best.life / best.max)) { best = L; if (L.life <= 0) break; }
    best.l.position.copy(pos); best.l.color.set(color); best.l.distance = dist;
    best.life = best.max = life; best.peak = intensity; best.l.intensity = intensity;
  }

  // ---- sprites (smoke, glows, shockwave rings)
  sprite(pos, o) {
    const m = this.spritePool[this.si = (this.si + 1) % this.spritePool.length];
    const old = this.sprites.indexOf(m); if (old >= 0) this.sprites.splice(old, 1);
    const mat = m.material;
    mat.map = o.map || TX.smoke(); mat.color.set(o.color ?? 0xffffff);
    mat.blending = o.add ? THREE.AdditiveBlending : THREE.NormalBlending; mat.rotation = Math.random() * 6.28; mat.needsUpdate = true;
    m.position.copy(pos); m.visible = true;
    const sp = { m, life: o.life || 1, max: o.life || 1, s0: o.s0 || 0.3, s1: o.s1 || 1, a0: o.a ?? 0.7, v: o.v || new THREE.Vector3(0, 0.4, 0), spin: o.spin ?? rand(Math.random, -1, 1) };
    m.scale.setScalar(sp.s0); mat.opacity = sp.a0;
    this.sprites.push(sp);
    return sp;
  }
  smoke(pos, n = 4, color = 0x5a5650, size = 0.6, rise = 0.5, life = 1.4) {
    n = Math.max(1, Math.round(n * (this.mult ?? 1)));
    for (let i = 0; i < n; i++) {
      const p = pos.clone().add(new THREE.Vector3(rand(Math.random, -0.2, 0.2), rand(Math.random, -0.1, 0.2), rand(Math.random, -0.2, 0.2)).multiplyScalar(size * 2));
      this.sprite(p, { color, s0: size * 0.5, s1: size * rand(Math.random, 1.4, 2.2), a: 0.55, life: life * rand(Math.random, 0.7, 1.2),
        v: new THREE.Vector3(rand(Math.random, -0.25, 0.25), rise * rand(Math.random, 0.6, 1.3), rand(Math.random, -0.25, 0.25)) });
    }
  }
  glowAt(pos, color, size = 0.5, life = 0.15) { this.sprite(pos, { map: TX.glow(), color, add: true, s0: size, s1: size * 1.4, a: 1, life, v: new THREE.Vector3() }); }
  shock(pos, r = 1, color = 0xffd8a0) { this.sprite(pos, { map: TX.ring(), color, add: true, s0: 0.2, s1: r * 4, a: 1, life: 0.35, v: new THREE.Vector3(), spin: 0 }); }

  // ---- decals (scorch marks, blood / oil / goo splats) on floors and walls
  decal(point, normal, kind = 'blood', size = 0.6) {
    const mats = this.decalMats[kind] || this.decalMats.blood;
    const mat = Array.isArray(mats) ? mats[Math.floor(Math.random() * mats.length)] : mats;
    let m;
    if (this.decals.length > 110) { m = this.decals.shift(); m.material = mat; } else m = new THREE.Mesh(DECAL_G, mat);
    m.position.copy(point).addScaledVector(normal, 0.012);
    m.lookAt(point.clone().add(normal)); m.rotateZ(Math.random() * 6.28);
    m.scale.setScalar(size * rand(Math.random, 0.8, 1.25));
    this.scene.add(m); this.decals.push(m);
  }
  floorDecal(x, z, kind, size) { this.decal(new THREE.Vector3(x, 0.0, z), new THREE.Vector3(0, 1, 0), kind, size); }

  // ---- shell casings: thrown from the viewmodel in its own scene (see game.js)
  casing(scene, pos, vel) {
    let c = this.casings.find((k) => k.life <= 0);
    if (!c) { if (this.casings.length > 24) c = this.casings.shift(); else c = { m: new THREE.Mesh(CASING_G, CASING_M) }; }
    if (c.m.parent !== scene) scene.add(c.m);
    c.m.visible = true; c.m.position.copy(pos); c.v = vel; c.life = 0.7; c.av = new THREE.Vector3(rand(Math.random, -20, 20), rand(Math.random, -20, 20), 0);
    if (!this.casings.includes(c)) this.casings.push(c);
  }

  updateMotes(center, dt, on) {
    this.motes.visible = on;
    if (!on) return;
    this.moteT += dt;
    this.motes.position.set(0, 0, center.z);
    const a = this.motes.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) {
      let y = a.getY(i) + Math.sin(this.moteT * 0.6 + i) * 0.0015 - dt * 0.03;
      if (y < 0.1) y = 2.9;
      a.setXYZ(i, a.getX(i) + Math.sin(this.moteT * 0.4 + i * 1.7) * 0.002, y, a.getZ(i));
    }
    a.needsUpdate = true;
  }

  emit(point, n, kind, speed = 2.5, grav = 9.8, life = 0.8) {
    n = Math.max(1, Math.round(n * (this.mult ?? 1))); // graphics setting scales particle counts
    const mats = MATS[kind];
    for (let i = 0; i < n; i++) {
      const m = this.pool[this.pi = (this.pi + 1) % this.pool.length];
      m.material = mats[i % mats.length];
      m.position.copy(point); m.visible = true;
      const s = rand(Math.random, 0.6, 1.6); m.scale.setScalar(s);
      const v = new THREE.Vector3(rand(Math.random, -1, 1), rand(Math.random, -0.2, 1.2), rand(Math.random, -1, 1)).normalize().multiplyScalar(speed * rand(Math.random, 0.4, 1));
      const existing = this.parts.find((p) => p.m === m);
      if (existing) { existing.v = v; existing.life = life; existing.g = grav; }
      else this.parts.push({ m, v, life: life * rand(Math.random, 0.6, 1), g: grav });
    }
  }
  blood(p, n) { this.emit(p, n * (0.5 + 0.5 * (this.gore ?? 1)), 'blood', 2.6); if ((this.gore ?? 1) > 1 && n >= 6) this.sprite(p, { color: 0x8a0a0a, s0: 0.15, s1: 0.55, a: 0.55, life: 0.45, v: new THREE.Vector3(0, -0.2, 0) }); }
  sparks(p, n) { this.emit(p, n, 'spark', 4, 6, 0.5); }
  dust(p, n) { this.emit(p, n, 'dust', 1.5, 6, 0.5); }
  pop(p) { this.emit(p, 10, 'pop', 3, 0, 0.3); }
  fire(p, n) { this.emit(p, n, 'fire', 1.2, -3, 0.45); }
  ice(p, n) { this.emit(p, n, 'ice', 1.5, 4, 0.5); }
  goo(p, n) { this.emit(p, n, 'goo', 2.4); }

  // straight beam between two points (tracers, railgun)
  beam(a, b, color, width = 0.03, life = 0.1) {
    const len = a.distanceTo(b);
    const m = new THREE.Mesh(BEAM_G, beamMat(color));
    m.position.lerpVectors(a, b, 0.5); m.lookAt(b); m.scale.set(width, width, len);
    this.scene.add(m); this.flashes.push({ m, life, fadeScale: width });
  }
  lightning(a, b, color) {
    let prev = a.clone();
    const n = 5;
    for (let i = 1; i <= n; i++) {
      const p = new THREE.Vector3().lerpVectors(a, b, i / n);
      if (i < n) p.add(new THREE.Vector3(rand(Math.random, -0.25, 0.25), rand(Math.random, -0.25, 0.25), rand(Math.random, -0.25, 0.25)));
      this.beam(prev, p, color, 0.035, 0.12); prev = p;
    }
  }
  explosion(p, r) {
    this.light(p, 0xff8a30, 18 * Math.min(2, r), 4 + r * 4, 0.35);
    this.shock(p, r);
    this.glowAt(p, 0xffb050, r * 2.2, 0.18);
    this.smoke(p, 6 + Math.round(r * 3), 0x3c3834, 0.5 + r * 0.35, 0.7, 1.8);
    this.emit(p, 12, 'fire', 3.5, -2, 0.9); // embers drifting up
    if (p.y < 1.2) this.floorDecal(p.x, p.z, 'scorch', 0.9 + r * 0.9);
    this.emit(p, 30, 'fire', 4 * r / 2, -1, 0.6);
    this.emit(p, 14, 'spark', 5, 6, 0.5);
    this.emit(p, 10, 'dust', 2.5, 3, 0.9);
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(FLASH_G, FLASH_M);
      f.position.copy(p).add(new THREE.Vector3(rand(Math.random, -0.4, 0.4), rand(Math.random, -0.3, 0.5), rand(Math.random, -0.4, 0.4)));
      f.quaternion.copy(this.camera.quaternion); f.rotation.z = Math.random() * 6; f.scale.setScalar(r * rand(Math.random, 1.2, 2.2));
      this.scene.add(f); this.flashes.push({ m: f, life: 0.12 + i * 0.03 });
    }
  }

  debris(mesh, vel, gore) {
    const geo = mesh.geometry;
    if (!bbCache.has(geo.uuid)) { geo.computeBoundingBox(); const s = new THREE.Vector3(); geo.boundingBox.getSize(s); bbCache.set(geo.uuid, Math.min(s.x, s.y, s.z) / 2); }
    this.debrisList.push({ gore, m: mesh, v: vel, av: new THREE.Vector3(rand(Math.random, -8, 8), rand(Math.random, -8, 8), rand(Math.random, -8, 8)), life: 0, r: bbCache.get(geo.uuid) * mesh.getWorldScale(new THREE.Vector3()).x });
  }

  hole(point, normal, obj) {
    let h;
    if (this.holes.length > 60) h = this.holes.shift(); else h = new THREE.Mesh(HOLE_G, HOLE_M);
    h.position.copy(point).addScaledVector(normal, 0.01);
    h.lookAt(point.clone().add(normal));
    h.rotation.z = Math.random() * 6;
    this.scene.add(h); this.holes.push(h);
  }

  impact(point) {
    this.smoke(point, 1, 0x8a8478, 0.18, 0.25, 0.6);
    const f = new THREE.Mesh(FLASH_G, FLASH_M);
    f.position.copy(point); f.quaternion.copy(this.camera.quaternion); f.rotation.z = Math.random() * 6;
    f.scale.setScalar(rand(Math.random, 0.5, 1));
    this.scene.add(f); this.flashes.push({ m: f, life: 0.06 });
  }

  clearAll() {
    for (const d of this.debrisList) this.scene.remove(d.m);
    for (const h of this.holes) this.scene.remove(h);
    for (const p of this.parts) p.m.visible = false;
    for (const d of this.decals) this.scene.remove(d);
    for (const s2 of this.sprites) s2.m.visible = false;
    for (const L of this.lights) { L.life = 0; L.l.intensity = 0; }
    this.debrisList = []; this.holes = []; this.parts = []; this.decals = []; this.sprites = [];
  }

  update(dt) {
    for (const L of this.lights) if (L.life > 0) { L.life -= dt; const k = Math.max(0, L.life / L.max); L.l.intensity = L.peak * k * k; }
    for (let i = this.sprites.length - 1; i >= 0; i--) {
      const sp = this.sprites[i];
      sp.life -= dt;
      const k = 1 - Math.max(0, sp.life / sp.max);
      sp.m.position.addScaledVector(sp.v, dt); sp.v.multiplyScalar(1 - dt * 0.8);
      sp.m.scale.setScalar(sp.s0 + (sp.s1 - sp.s0) * (1 - (1 - k) * (1 - k)));
      sp.m.material.opacity = sp.a0 * (1 - k);
      sp.m.material.rotation += sp.spin * dt;
      if (sp.life <= 0) { sp.m.visible = false; this.sprites.splice(i, 1); }
    }
    for (const c of this.casings) {
      if (c.life <= 0) continue;
      c.life -= dt; c.v.y -= 6 * dt; c.m.position.addScaledVector(c.v, dt);
      c.m.rotation.x += c.av.x * dt; c.m.rotation.y += c.av.y * dt;
      if (c.life <= 0) c.m.visible = false;
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      p.v.y -= p.g * dt;
      p.m.position.addScaledVector(p.v, dt);
      if (p.m.position.y < 0.03) { p.m.position.y = 0.03; p.v.set(0, 0, 0); }
      if (p.life <= 0) { p.m.visible = false; this.parts.splice(i, 1); }
    }
    for (let i = this.debrisList.length - 1; i >= 0; i--) {
      const d = this.debrisList[i];
      d.life += dt;
      if (d.life < 3.5) {
        d.v.y -= 11 * dt;
        d.m.position.addScaledVector(d.v, dt);
        d.m.rotation.x += d.av.x * dt; d.m.rotation.y += d.av.y * dt; d.m.rotation.z += d.av.z * dt;
        // gibs bleed while they fly and leave a splat where they land
        if (d.gore && d.gore !== 'spark' && (this.gore ?? 1) > 0 && Math.random() < dt * 14 * (this.gore ?? 1)) this.emit(d.m.position, 1, d.gore === 'goo' ? 'goo' : 'blood', 0.4, 9, 0.5);
        if (d.m.position.y < d.r) {
          if (!d.landed && d.gore && (this.gore ?? 1) > 0) { d.landed = true; if (Math.random() < 0.5 + 0.25 * (this.gore ?? 1)) this.floorDecal(d.m.position.x, d.m.position.z, d.gore, 0.25 + Math.random() * 0.25); }
          d.m.position.y = d.r; d.v.y = -d.v.y * 0.3; d.v.x *= 0.6; d.v.z *= 0.6; d.av.multiplyScalar(0.5);
          if (Math.abs(d.v.y) < 0.4) { d.v.y = 0; d.av.set(0, 0, 0); }
        }
      } else {
        d.m.position.y -= dt * 0.4;
        if (d.life > 5) { this.scene.remove(d.m); this.debrisList.splice(i, 1); }
      }
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i]; f.life -= dt;
      if (f.fadeScale) { const k = Math.max(0.05, f.life / 0.1); f.m.scale.x = f.m.scale.y = f.fadeScale * k; }
      if (f.life <= 0) { this.scene.remove(f.m); this.flashes.splice(i, 1); }
    }
  }
}
