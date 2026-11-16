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
};
const HOLE_M = new THREE.MeshBasicMaterial({ map: TX.bulletHole(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
const HOLE_G = new THREE.PlaneGeometry(0.09, 0.09);
const FLASH_M = new THREE.MeshBasicMaterial({ map: TX.flash(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
const FLASH_G = new THREE.PlaneGeometry(0.35, 0.35);
const bbCache = new Map();

export class Effects {
  constructor(scene, camera) {
    this.scene = scene; this.camera = camera;
    this.parts = []; this.debrisList = []; this.holes = []; this.flashes = [];
    this.pool = [];
    for (let i = 0; i < 220; i++) { const m = new THREE.Mesh(CUBE, MATS.blood[0]); m.visible = false; scene.add(m); this.pool.push(m); }
    this.pi = 0;
  }

  emit(point, n, kind, speed = 2.5, grav = 9.8, life = 0.8) {
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
  blood(p, n) { this.emit(p, n, 'blood', 2.6); }
  sparks(p, n) { this.emit(p, n, 'spark', 4, 6, 0.5); }
  dust(p, n) { this.emit(p, n, 'dust', 1.5, 6, 0.5); }
  pop(p) { this.emit(p, 10, 'pop', 3, 0, 0.3); }

  debris(mesh, vel) {
    const geo = mesh.geometry;
    if (!bbCache.has(geo.uuid)) { geo.computeBoundingBox(); const s = new THREE.Vector3(); geo.boundingBox.getSize(s); bbCache.set(geo.uuid, Math.min(s.x, s.y, s.z) / 2); }
    this.debrisList.push({ m: mesh, v: vel, av: new THREE.Vector3(rand(Math.random, -8, 8), rand(Math.random, -8, 8), rand(Math.random, -8, 8)), life: 0, r: bbCache.get(geo.uuid) * mesh.getWorldScale(new THREE.Vector3()).x });
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
    const f = new THREE.Mesh(FLASH_G, FLASH_M);
    f.position.copy(point); f.quaternion.copy(this.camera.quaternion); f.rotation.z = Math.random() * 6;
    f.scale.setScalar(rand(Math.random, 0.5, 1));
    this.scene.add(f); this.flashes.push({ m: f, life: 0.06 });
  }

  clearAll() {
    for (const d of this.debrisList) this.scene.remove(d.m);
    for (const h of this.holes) this.scene.remove(h);
    for (const p of this.parts) p.m.visible = false;
    this.debrisList = []; this.holes = []; this.parts = [];
  }

  update(dt) {
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
        if (d.m.position.y < d.r) {
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
      if (f.life <= 0) { this.scene.remove(f.m); this.flashes.splice(i, 1); }
    }
  }
}
