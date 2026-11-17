// Shared geometry helpers (cached). box() gets world-scaled UVs so textures tile by size.
import * as THREE from '../vendor/three.module.min.js';

// ---------------------------------------------------------------- geometry
const geoCache = new Map();
// Box with UVs scaled to world size so textures tile at `s` meters per repeat.
export function box(w, h, d, s = 0) {
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${s}`;
  let g = geoCache.get(key);
  if (g) return g;
  g = new THREE.BoxGeometry(w, h, d);
  if (s > 0) {
    const uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * dims[f][0] / s, uv.getY(i) * dims[f][1] / s);
    }
  }
  geoCache.set(key, g);
  return g;
}
export function plane(w, h, ru = 1, rv = 1) {
  const key = `p${w}|${h}|${ru}|${rv}`;
  let g = geoCache.get(key);
  if (g) return g;
  g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv);
  geoCache.set(key, g);
  return g;
}


// Merge the static meshes under `root` into one mesh per material (huge draw-call saving on
// phones). Meshes with userData.keep / dyn / noHole, transparent or reordered materials stay as
// they are. Multi-material boxes are split by their material groups.
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const victims = [];
  const nm = new THREE.Matrix3(), m4 = new THREE.Matrix4(), v = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || o.userData.keep || o.userData.dyn || o.userData.noHole || o.renderOrder !== 0) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.some((m) => m.transparent || m.fog === false)) return;
    const geo = o.geometry;
    if (!geo.index || !geo.attributes.uv || !geo.attributes.normal) return;
    m4.multiplyMatrices(inv, o.matrixWorld); nm.getNormalMatrix(m4);
    const groups = geo.groups.length ? geo.groups : [{ start: 0, count: geo.index.count, materialIndex: 0 }];
    for (const gr of groups) {
      const mat = mats[gr.materialIndex] || mats[0];
      let b = buckets.get(mat);
      if (!b) { b = { pos: [], nor: [], uv: [], idx: [] }; buckets.set(mat, b); }
      const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv, I = geo.index;
      const remap = new Map();
      for (let k = gr.start; k < gr.start + gr.count; k++) {
        const src = I.getX(k);
        let dst = remap.get(src);
        if (dst === undefined) {
          dst = b.pos.length / 3; remap.set(src, dst);
          v.fromBufferAttribute(P, src).applyMatrix4(m4); b.pos.push(v.x, v.y, v.z);
          v.fromBufferAttribute(N, src).applyMatrix3(nm).normalize(); b.nor.push(v.x, v.y, v.z);
          b.uv.push(U.getX(src), U.getY(src));
        }
        b.idx.push(dst);
      }
    }
    victims.push(o);
  });
  if (victims.length < 2) return 0;
  for (const o of victims) o.parent.remove(o);
  for (const [mat, b] of buckets) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
    g.setIndex(b.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(b.idx, 1) : new THREE.Uint16BufferAttribute(b.idx, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    const mesh = new THREE.Mesh(g, mat); mesh.userData.merged = true;
    root.add(mesh);
  }
  return victims.length;
}
