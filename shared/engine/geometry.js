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

