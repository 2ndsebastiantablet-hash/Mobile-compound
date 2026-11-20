// Enemy skins: alternate colour variants an enemy can spawn with. Not new enemies (the log
// lists them under the same entry). Three themed variants per family, plus a rare GOLDEN one
// that is tougher and pays 5x cash. Skins tint the enemy's textures; glowing parts stay as they are.
import * as THREE from '../../vendor/three.module.min.js';

const FAMILY_SKINS = {
  human: [
    { id: 'night', name: 'NIGHT SHIFT', tint: [0.55, 0.62, 0.95] },
    { id: 'friday', name: 'CASUAL FRIDAY', tint: [1.18, 0.92, 0.7] },
    { id: 'burnout', name: 'BURNOUT', tint: [0.72, 0.72, 0.68], desat: 0.7 },
  ],
  robot: [
    { id: 'rust', name: 'RUSTED', tint: [1.05, 0.66, 0.45] },
    { id: 'arctic', name: 'ARCTIC', tint: [0.78, 0.97, 1.22] },
    { id: 'stealth', name: 'STEALTH', tint: [0.36, 0.36, 0.42] },
  ],
  mutant: [
    { id: 'toxic', name: 'TOXIC', tint: [0.72, 1.25, 0.5] },
    { id: 'pale', name: 'PALE', tint: [1.22, 1.16, 1.1], desat: 0.5 },
    { id: 'bloody', name: 'BLOODY', tint: [1.22, 0.5, 0.48] },
  ],
};
export const GOLDEN = { id: 'golden', name: 'GOLDEN', tint: [1.45, 1.12, 0.38], emissive: 0x2a1800, rare: true };

export function familyOf(def) {
  const k = def.model.kind, st = def.model.style;
  if (k === 'human' && def.model.outfit !== 'glitch') return 'human';
  if (k === 'blob' || k === 'swarm' || (k === 'quad' && st !== 'robot' && st !== 'hound') || (k === 'floater' && st !== 'eye') || k === 'pod') return 'mutant';
  return 'robot';
}
// every skin of an enemy, index 0 = standard
export function skinsFor(def) { return [{ id: 'std', name: 'STANDARD', tint: null }, ...FAMILY_SKINS[familyOf(def)], GOLDEN]; }

// which skin a newly spawned enemy wears (76% standard, 22% one of the three variants, 2% golden)
export function rollSkin(def, rng = Math.random) {
  if (def.boss || def.minion) return 0;
  const r = rng();
  if (r < 0.02) return 4;
  if (r < 0.24) return 1 + Math.floor(rng() * 3);
  return 0;
}

const cache = new Map();
function skinMat(mat, skin) {
  if (!skin.tint || !mat || mat.isMeshBasicMaterial || mat.transparent) return mat;
  const key = mat.uuid + skin.id;
  if (cache.has(key)) return cache.get(key);
  const m = mat.clone();
  const c = m.color.clone();
  if (skin.desat) { const l = (c.r + c.g + c.b) / 3; c.lerp(new THREE.Color(l, l, l), skin.desat); }
  c.r *= skin.tint[0]; c.g *= skin.tint[1]; c.b *= skin.tint[2];
  m.color.copy(c);
  if (skin.emissive && m.emissive) m.emissive.set(skin.emissive);
  cache.set(key, m);
  return m;
}
export function applySkin(enemy, skin) {
  if (!skin || !skin.tint) return;
  for (const m of enemy.meshes) {
    const base = m.userData.mat;
    const nm = Array.isArray(base) ? base.map((b) => skinMat(b, skin)) : skinMat(base, skin);
    m.userData.mat = nm; m.material = nm;
  }
}
