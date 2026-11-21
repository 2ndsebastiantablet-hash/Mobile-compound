// Cutscene sets, built from the same chunky pixel textures as the tower:
//   boardroom  - the top floor after the fight (windows onto the city, the Chairman's desk, the elevator)
//   city       - the tower from outside at night, the street, a paper-recycling dumpster
//   diner      - a small all-night diner on a rainy street (inside and out)
//   sunset     - a neon highway running into a striped synthwave sun
//   photo      - a holiday snapshot rendered into a texture (for the briefcase)
import * as THREE from '../../vendor/three.module.min.js';
import * as TX from '../../engine/textures.js';
import { box, plane, mergeStatic } from '../../engine/geometry.js';
import { V, padLights, rnd } from './engine.js';
import { lam, col, part, piv, GOLD, makeChairman, crown } from './rig.js';

const tex = TX.tex;
const sh = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
export function neon(hex, k = 2.2) { const m = new THREE.MeshBasicMaterial({ color: hex }); m.color.multiplyScalar(k); return m; }
const basicTex = (t, o = {}) => new THREE.MeshBasicMaterial({ map: t, ...o });
function own(m) { m.userData.own = true; return m; }
function mesh(parent, geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; }
function pl(parent, w, h, mat, x, y, z, ry = 0, rx = 0, ru = 1, rv = 1) { const m = new THREE.Mesh(plane(w, h, ru, rv), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0, 'YXZ'); parent.add(m); return m; }
export function glowSprite(parent, color, s, x, y, z, o = 0.9) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glow(), color, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false }));
  sp.scale.set(s, s, 1); sp.position.set(x, y, z); parent.add(sp); return sp;
}
const repeat = (t, u, v) => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(u, v); c.wrapS = c.wrapT = THREE.RepeatWrapping; return c; };

// ------------------------------------------------------------------ textures
const T = {
  boardCarpet: () => tex('cs_bcarpet', 32, 32, (p, r) => {
    p.noise([92, 14, 22], 0.12, r);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const d = Math.abs(((x + 8) % 16) - 8) + Math.abs(((y + 8) % 16) - 8); if (d === 7) p.set(x, y, [170, 130, 50]); if (d < 2) p.set(x, y, [140, 100, 36]); }
  }),
  woodPanel: () => tex('cs_wpanel', 32, 32, (p, r) => {
    p.noise([66, 38, 22], 0.1, r);
    for (let x = 0; x < 32; x++) for (let y = 0; y < 32; y++) if (r() < 0.18) p.mul(x, y, 0.85);
    for (let y = 0; y < 32; y++) { p.set(0, y, [36, 20, 12]); p.set(15, y, [40, 24, 14]); p.set(16, y, [90, 56, 32]); }
    for (let x = 0; x < 32; x++) { p.set(x, 0, [36, 20, 12]); p.set(x, 31, [100, 64, 36]); }
  }),
  marble: () => tex('cs_marble', 16, 16, (p, r) => { p.noise([30, 36, 34], 0.15, r); for (let i = 0; i < 3; i++) { let x = r() * 16, y = 0; for (let k = 0; k < 20; k++) { p.set(x, y, [120, 130, 120]); x += r() * 2 - 1; y += 0.9; } } }),
  ceilDark: () => tex('cs_ceil', 16, 16, (p, r) => { p.noise([40, 36, 34], 0.08, r); for (let i = 0; i < 16; i++) { p.set(i, 0, [24, 22, 20]); p.set(0, i, [24, 22, 20]); } }),
  city: (seed, horizon = 70) => tex('cs_city' + seed, 256, 128, (p, r) => {
    for (let y = 0; y < 128; y++) { const t = y / 128; const c = [8 + 30 * t, 10 + 18 * t, 30 + 40 * t]; for (let x = 0; x < 256; x++) p.set(x, y, sh(c, 0.97 + r() * 0.05)); }
    for (let i = 0; i < 70; i++) p.set(r() * 256, r() * horizon * 0.7, [200, 200, 230]);
    for (let layer = 0; layer < 2; layer++) {
      let x = 0;
      while (x < 256) {
        const bw = 6 + r() * 16 | 0, top = horizon + layer * 12 + r() * 26 | 0, c0 = layer ? [16, 16, 26] : [26, 26, 40];
        const c = sh(c0, 0.8 + r() * 0.4);
        for (let yy = top; yy < 128; yy++) for (let xx = x; xx < Math.min(256, x + bw); xx++) p.set(xx, yy, c);
        for (let yy = top + 2; yy < 128; yy += 3) for (let xx = x + 1; xx < Math.min(255, x + bw - 1); xx += 2) if (r() < (layer ? 0.4 : 0.25)) p.set(xx, yy, r() < 0.75 ? [250, 200, 110] : [150, 210, 255]);
        if (r() < 0.3) p.set(x + (bw >> 1), top - 1, [255, 40, 40]);
        x += bw + (r() * 2 | 0);
      }
    }
    for (let x = 0; x < 256; x++) for (let y = 118; y < 128; y++) if (r() < 0.3) p.set(x, y, r() < 0.5 ? [255, 190, 90] : [255, 120, 60]); // street glow
  }, { mip: false }),
  // 12 m square: 4 floors of 3 m (16 px each: spandrel, window band, slab) x 8 windows of 1.5 m
  facade: (k, base, lit) => tex('cs_fac' + k, 64, 64, (p, r) => {
    p.noise(base, 0.08, r);
    for (let fy = 0; fy < 4; fy++) {
      const floorLit = r() < 0.5 ? lit * 1.6 : lit * 0.4;
      for (let fx = 0; fx < 8; fx++) {
        const on = r() < floorLit, c = on ? (r() < 0.8 ? [250, 206, 128] : [160, 210, 255]) : [18, 24, 38];
        for (let y = 5; y < 15; y++) for (let x = 1; x < 8; x++) p.set(fx * 8 + x, fy * 16 + y, sh(c, on ? (y < 7 ? 1 : 0.8 + r() * 0.15) : 0.85 + r() * 0.35));
        if (!on && r() < 0.5) p.set(fx * 8 + 2, fy * 16 + 6, [60, 80, 110]);
      }
      for (let x = 0; x < 64; x++) { p.set(x, fy * 16 + 15, sh(base, 0.55)); p.set(x, fy * 16 + 4, sh(base, 1.2)); }
    }
  }),
  fireWindows: () => tex('cs_firewin', 64, 16, (p, r) => {
    for (let fx = 0; fx < 8; fx++) for (let y = 5; y < 15; y++) for (let x = 1; x < 8; x++) p.set(fx * 8 + x, y, y < 8 ? [255, 210, 90] : r() < 0.5 ? [255, 140, 40] : [255, 80, 20], r() < 0.92 ? 255 : 0);
  }),
  road: () => tex('cs_road', 32, 32, (p, r) => { p.noise([34, 34, 38], 0.15, r); for (let x = 0; x < 16; x++) { p.set(x, 15, [200, 180, 80]); p.set(x, 16, [200, 180, 80]); } }),
  asphalt: () => tex('cs_asph', 32, 32, (p, r) => { p.noise([30, 30, 34], 0.18, r); for (let i = 0; i < 6; i++) p.set(r() * 32, r() * 32, [70, 70, 74]); }),
  sidewalk: () => tex('cs_walk', 16, 16, (p, r) => { p.noise([92, 90, 86], 0.1, r); for (let i = 0; i < 16; i++) { p.set(i, 0, [60, 58, 56]); p.set(0, i, [60, 58, 56]); } }),
  sky: (k, stops, stars = 0) => tex('cs_sky' + k, 4, 128, (p, r) => {
    for (let y = 0; y < 128; y++) {
      const t = y / 127; let c = stops[0][1];
      for (let i = 0; i < stops.length - 1; i++) if (t >= stops[i][0] && t <= stops[i + 1][0]) { const k2 = (t - stops[i][0]) / (stops[i + 1][0] - stops[i][0]); c = stops[i][1].map((v, j) => v + (stops[i + 1][1][j] - v) * k2); }
      for (let x = 0; x < 4; x++) p.set(x, y, c);
    }
  }, { mip: false }),
  stars: () => tex('cs_stars', 128, 64, (p, r) => { for (let i = 0; i < 90; i++) p.set(r() * 128, r() * 64, [255, 255, 255], 120 + r() * 135); }, { mip: false }),
  dumpster: () => tex('cs_dump', 64, 32, (p, r) => {
    p.noise([40, 92, 54], 0.12, r); for (let x = 0; x < 64; x += 8) for (let y = 0; y < 32; y++) p.set(x, y, [30, 70, 40]);
    p.rect(4, 10, 56, 12, [230, 230, 220]); p.text('PAPER', 22, 11, [30, 70, 40]); p.text('RECYCLING', 14, 17, [30, 70, 40]);
    for (let i = 0; i < 30; i++) p.set(r() * 64, r() * 32, [90, 60, 30]);
  }),
  paperPile: () => tex('cs_papers', 16, 16, (p, r) => { p.noise([220, 218, 205], 0.08, r); for (let i = 0; i < 14; i++) { const x = r() * 14 | 0, y = r() * 14 | 0; p.rect(x, y, 3, 2, r() < 0.5 ? [250, 250, 240] : [190, 190, 180]); p.set(x, y + 1, [80, 80, 100]); } }),
  text: (k, str, fg, bg, w, h, s = 1, mirror = false) => tex('cs_txt' + k, w, h, (p) => {
    if (bg) p.rect(0, 0, w, h, bg);
    const tw = TX.textWidth(str, s); p.text(str, Math.floor((w - tw) / 2), Math.floor((h - 5 * s) / 2), fg, s);
    if (mirror) for (let y = 0; y < h; y++) for (let x = 0; x < w / 2; x++) { const a = p.get(x, y), b = p.get(w - 1 - x, y); p.set(x, y, b, b[3]); p.set(w - 1 - x, y, a, a[3]); }
  }, { mip: false }),
  checker: () => tex('cs_check', 16, 16, (p, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, ((x >> 3) + (y >> 3)) % 2 ? sh([235, 232, 220], 0.95 + r() * 0.06) : sh([24, 24, 26], 0.9 + r() * 0.2)); }),
  tiles: () => tex('cs_tiles', 16, 16, (p, r) => { p.noise([70, 170, 160], 0.06, r); for (let i = 0; i < 16; i++) { p.set(i, 7, [40, 110, 100]); p.set(i, 15, [40, 110, 100]); p.set(7, i, [40, 110, 100]); p.set(15, i, [40, 110, 100]); } }),
  cream: () => tex('cs_cream', 16, 16, (p, r) => p.noise([228, 214, 186], 0.05, r)),
  vinyl: () => tex('cs_vinyl', 16, 16, (p, r) => { p.noise([170, 24, 34], 0.08, r); for (let x = 0; x < 16; x += 4) for (let y = 0; y < 16; y++) p.set(x, y, [120, 14, 22]); }),
  menu: () => tex('cs_menu', 64, 32, (p, r) => { p.rect(0, 0, 64, 32, [20, 18, 16]); p.text('BURGER 2.99', 4, 3, [250, 240, 200]); p.text('FRIES  0.99', 4, 10, [250, 240, 200]); p.text('SHAKE  1.49', 4, 17, [250, 240, 200]); p.text('COFFEE 0.50', 4, 24, [250, 200, 120]); }),
  grid: () => tex('cs_grid', 32, 32, (p) => { p.rect(0, 0, 32, 32, [14, 4, 26]); for (let i = 0; i < 32; i++) { p.set(i, 0, [255, 40, 200]); p.set(0, i, [255, 40, 200]); p.set(i, 1, [120, 20, 100]); p.set(1, i, [120, 20, 100]); } }, { mip: false }),
  hiway: () => tex('cs_hiway', 16, 32, (p, r) => { p.noise([20, 16, 26], 0.15, r); for (let y = 0; y < 16; y++) { p.set(7, y, [255, 220, 120]); p.set(8, y, [255, 220, 120]); } for (let y = 0; y < 32; y++) { p.set(0, y, [80, 230, 255]); p.set(15, y, [80, 230, 255]); } }, { mip: false }),
  sun: () => tex('cs_sun', 64, 64, (p) => {
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const d = Math.hypot(x - 31.5, y - 31.5); if (d > 31) continue;
      const t = y / 63, c = [255, 230 - 170 * t, 80 + 60 * t];
      const band = y > 30 && ((y - 30) % Math.max(2, 9 - Math.floor((y - 30) / 5))) < Math.floor((y - 28) / 6);
      if (!band) p.set(x, y, c);
    }
  }, { mip: false }),
  cityNeon: () => tex('cs_cityneon', 128, 32, (p, r) => {
    let x = 0;
    while (x < 128) { const bw = 4 + r() * 10 | 0, top = 4 + r() * 20 | 0; for (let y = top; y < 32; y++) for (let xx = x; xx < Math.min(128, x + bw); xx++) p.set(xx, y, [30, 8, 46]); for (let y = top + 2; y < 32; y += 3) for (let xx = x + 1; xx < x + bw - 1; xx += 2) if (r() < 0.3) p.set(xx, y, r() < 0.5 ? [255, 60, 200] : [60, 220, 255]); x += bw; }
  }, { mip: false }),
  windowGlow: () => tex('cs_winglow', 32, 16, (p, r) => { p.noise([200, 140, 70], 0.2, r); for (let i = 0; i < 4; i++) p.rect(r() * 28 | 0, 8 + r() * 6 | 0, 4, 2, [60, 40, 30]); }),
};

const skyDome = (parent, t, r = 900) => {
  const m = own(new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false })));
  m.renderOrder = -10; parent.add(m); return m;
};

// ------------------------------------------------------------------ BOARDROOM
// x -6.5..6.5, z -12..3, ceiling 3.6. The window wall is on the left (x = -6.5), the elevator on the right.
export function buildBoardroom() {
  const g = new THREE.Group();
  const carpet = lam(repeat(T.boardCarpet(), 6.5, 7.5)), wood = lam(T.woodPanel()), marble = lam(T.marble());
  pl(g, 13, 15, carpet, 0, 0, -4.5, 0, -Math.PI / 2);
  pl(g, 13, 15, lam(repeat(T.ceilDark(), 13, 15)), 0, 3.6, -4.5, 0, Math.PI / 2);
  const wallM = lam(repeat(T.woodPanel(), 5, 1.4));
  pl(g, 15, 3.6, wallM, 6.5, 1.8, -4.5, -Math.PI / 2);
  pl(g, 13, 3.6, wallM, 0, 1.8, 3, Math.PI);
  // ceiling light panels
  const lightM = neon(0xfff0d0, 1.6);
  for (const x of [-2.5, 2.5]) for (const z of [-0.5, -4.5, -8.5]) { part(g, 1.4, 0.04, 0.7, lightM, x, 3.58, z); }
  // window walls (left + back), mullions and glass; the city outside
  const frame = col(0x1c1c22), glass = new THREE.MeshBasicMaterial({ color: 0x7090b0, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false });
  const panes = [];
  for (let z = 3; z >= -12; z -= 2.5) part(g, 0.14, 3.6, 0.14, frame, -6.5, 1.8, z);
  part(g, 0.16, 0.12, 15, frame, -6.5, 0.3, -4.5); part(g, 0.16, 0.2, 15, frame, -6.5, 3.5, -4.5); part(g, 0.2, 0.3, 15, wood, -6.5, 0.15, -4.5);
  for (let z = 1.75; z > -12; z -= 2.5) panes.push(pl(g, 2.4, 3.1, glass, -6.48, 1.9, z, Math.PI / 2));
  for (let x = -6.5; x <= 6.5; x += 2.6) part(g, 0.14, 3.6, 0.14, frame, x, 1.8, -12);
  part(g, 13, 0.12, 0.16, frame, 0, 0.3, -12); part(g, 13, 0.2, 0.16, frame, 0, 3.5, -12); part(g, 13, 0.3, 0.2, wood, 0, 0.15, -12);
  pl(g, 13, 3.2, glass, 0, 1.9, -11.98);
  const cityM = basicTex(T.city('a', 60), { fog: false });
  pl(g, 320, 130, cityM, -110, -30, -4.5, Math.PI / 2);
  pl(g, 320, 130, basicTex(T.city('b', 64), { fog: false }), 0, -30, -110, 0);
  // elevator on the right wall
  const doorM = lam(TX.elevDoor()), metal = col(0x50545c);
  part(g, 0.2, 2.8, 2.2, metal, 6.45, 1.4, -5.5);
  const doors = [part(g, 0.06, 2.4, 0.78, doorM, 6.36, 1.2, -5.1), part(g, 0.06, 2.4, 0.78, doorM, 6.36, 1.2, -5.9)];
  part(g, 2.2, 3.2, 2.0, col(0x2a0a0a), 7.6, 1.6, -5.5); // the cab behind
  const cabGlow = mesh(g, plane(1.6, 2.4), neon(0xff2020, 0.4), 6.6, 1.2, -5.5); cabGlow.rotation.y = -Math.PI / 2;
  const ind = pl(g, 0.6, 0.25, basicTex(T.text('30', '30', [255, 80, 40], [16, 4, 4], 16, 8)), 6.3, 2.75, -5.5, -Math.PI / 2);
  // boardroom table (front right) and chairs
  part(g, 1.9, 0.08, 4.6, wood, 2.7, 0.76, 0.6); for (const [x, z] of [[2.0, -1.4], [3.4, -1.4], [2.0, 2.6], [3.4, 2.6]]) part(g, 0.1, 0.74, 0.1, col(0x2a1a10), x, 0.37, z);
  const chair = (x, z, ry, fallen) => {
    const c = piv(g, x, 0, z); c.rotation.y = ry; const lea = col(0x24181a);
    part(c, 0.52, 0.1, 0.5, lea, 0, 0.48, 0); part(c, 0.52, 0.7, 0.1, lea, 0, 0.85, -0.22); part(c, 0.06, 0.45, 0.06, col(0x101010), 0, 0.22, 0);
    if (fallen) { c.rotation.x = -Math.PI / 2; c.position.y = 0.24; }
    return c;
  };
  for (let k = 0; k < 4; k++) { chair(1.45, -0.9 + k * 1.1, Math.PI / 2, k === 2); chair(3.95, -0.9 + k * 1.1, -Math.PI / 2, false); }
  chair(-3.4, -7.4, 2.2, true); chair(1.2, -7.8, -0.6, true);
  // the Chairman's desk and throne
  part(g, 3.2, 0.85, 1.1, wood, 0, 0.43, -10.3); part(g, 3.24, 0.06, 1.14, GOLD, 0, 0.87, -10.3);
  part(g, 0.9, 0.3, 0.02, basicTex(T.text('hp', 'H-P', [255, 220, 120], [60, 34, 20], 16, 8)), 0, 0.5, -9.74);
  part(g, 1.1, 0.12, 0.9, col(0x5a0c14), 0, 0.5, -11.3); part(g, 1.1, 1.9, 0.2, col(0x5a0c14), 0, 1.4, -11.7); part(g, 1.2, 0.12, 0.24, GOLD, 0, 2.4, -11.7);
  // pillars, plants, portrait
  for (const [x, z] of [[-3.8, -3], [3.8, -3], [-3.8, -8.5], [3.8, -8.5]]) { part(g, 0.6, 3.6, 0.6, marble, x, 1.8, z); part(g, 0.7, 0.12, 0.7, GOLD, x, 3.5, z); part(g, 0.7, 0.12, 0.7, GOLD, x, 0.06, z); }
  const plantM = new THREE.MeshLambertMaterial({ map: TX.plant(), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
  for (const [x, z] of [[-5.8, 2.3], [5.8, 2.3], [-5.8, -11.3], [5.8, -11.3]]) { part(g, 0.5, 0.5, 0.5, col(0x3a2a20), x, 0.25, z); for (const ry of [0, Math.PI / 2]) pl(g, 0.9, 1.1, plantM, x, 1.0, z, ry); }
  part(g, 0.06, 1.6, 1.3, GOLD, 6.42, 1.9, -9.6); pl(g, 1.1, 1.4, lam(TX.face({ style: 'grey', skin: 0, hair: 4 })), 6.38, 1.9, -9.6, -Math.PI / 2);
  // battle damage
  const scorch = new THREE.MeshBasicMaterial({ map: TX.scorch(), transparent: true, depthWrite: false, color: 0x000000 });
  for (const [x, z, s] of [[-1.8, -5.6, 3.6], [1.8, -5.5, 1.6], [-0.4, -3.4, 1.4], [0.6, -9.4, 1.8]]) pl(g, s, s, scorch, x, 0.012, z, rnd(0, 6), -Math.PI / 2);
  const pylonM = col(0x3a3a44);
  for (const [x, z, rz] of [[-3, -9.8, 1.2], [3.1, -6.8, -1.4]]) { const p = own(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.6, 8), pylonM)); p.position.set(x, 0.25, z); p.rotation.z = rz; g.add(p); }
  const paperM = col(0xe8e6dc, true);
  for (let i = 0; i < 26; i++) pl(g, 0.22, 0.3, paperM, rnd(-5, 5), 0.015, rnd(-10, 1), rnd(0, 6), -Math.PI / 2);
  // the Chairman, on his back, crown knocked off
  const boss = makeChairman();
  boss.root.position.set(-2.2, 0.22, -4.0); boss.root.rotation.set(-Math.PI / 2, 0, 0.1);
  boss.set({ shL: [0.3, 0, 1.25], shR: [-0.2, 0, -1.0], elL: [-0.4], elR: [-1.2], neck: [0.1, 0.6, 0], hipL: [-0.1, 0, 0.15], hipR: [0.15, 0, -0.1], knR: [0.5] }, true);
  boss.neck.remove(boss.crown);
  g.add(boss.root);
  const fallenCrown = crown(1.7); fallenCrown.position.set(-1.45, 0.07, -7.35); fallenCrown.rotation.set(0.25, 0.6, 0.4); g.add(fallenCrown);
  const bigGun = piv(g, -0.5, 0.08, -5.4); part(bigGun, 0.2, 0.22, 0.75, lam(TX.gunMetal()), 0, 0, 0); part(bigGun, 0.08, 0.08, 0.36, col(0xc8a030), 0, 0.02, 0.5); bigGun.rotation.y = 0.9;
  // lights
  const warm1 = new THREE.PointLight(0xffe0b0, 7, 14, 1.4); warm1.position.set(0, 3.2, -1.5); g.add(warm1);
  const warm2 = new THREE.PointLight(0xffd8a0, 6, 14, 1.4); warm2.position.set(0, 3.2, -8); g.add(warm2);
  const red = new THREE.PointLight(0xff1810, 0, 18, 1.2); red.position.set(5.6, 2.6, -5.5); g.add(red);
  const fire = new THREE.PointLight(0xff8030, 2.2, 7, 1.6); fire.position.set(-1.6, 0.6, -5.0); g.add(fire);
  const spot = new THREE.SpotLight(0xffe8d0, 40, 14, 0.62, 0.7, 1.3); spot.position.set(-1.2, 3.5, -4.2); spot.target.position.set(-2.1, 0.2, -5.7); g.add(spot); g.add(spot.target);
  const moon = new THREE.DirectionalLight(0x8098d0, 0.7); moon.position.set(-10, 6, -3); g.add(moon);
  g.add(new THREE.HemisphereLight(0x48506a, 0x180808, 0.8));
  padLights(g);
  return {
    group: g, fog: 0x0a0a12, fogNear: 14, fogFar: 140, bg: 0x05060c, groundY: 0, panes, doors, cabGlow, ind, boss, crown: fallenCrown, bigGun,
    lights: { warm1, warm2, red, fire, moon, spot }, chair,
    grade: { tint: 0xfff0e0, lift: 0x050304, sat: 1.1, contrast: 1.12 },
  };
}

// ------------------------------------------------------------------ CITY (the tower from outside, at night)
// Tower: x/z -12..12, 30 floors of 3 m (top floor y 87..90). Street runs along x at z 17..27.
export const FLOOR_H = 3, TOWER_H = 90;
export function buildCity() {
  const g = new THREE.Group();
  skyDome(g, T.sky('night', [[0, [6, 8, 22]], [0.45, [14, 16, 40]], [0.52, [40, 30, 60]], [1, [8, 8, 14]]]));
  const stars = own(new THREE.Mesh(new THREE.SphereGeometry(880, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), new THREE.MeshBasicMaterial({ map: repeat(T.stars(), 4, 2), transparent: true, fog: false, depthWrite: false, side: THREE.BackSide })));
  stars.renderOrder = -9; g.add(stars);
  const moon = glowSprite(g, 0xe8e4c8, 60, -260, 380, -600, 0.9); moon.material.fog = false;
  // ground, road, sidewalks
  pl(g, 1600, 1600, lam(repeat(T.asphalt(), 400, 400)), 0, -0.01, 0, 0, -Math.PI / 2);
  pl(g, 1600, 10, lam(repeat(T.road(), 200, 1.25)), 0, 0.005, 22, 0, -Math.PI / 2);
  const walk = lam(repeat(T.sidewalk(), 1, 1));
  for (const [z, d] of [[14.5, 5], [29, 4]]) { const s = part(g, 1600, 0.15, d, walk, 0, 0.075, z); s.material = lam(repeat(T.sidewalk(), 800, d / 2)); }
  // the tower
  const fac = lam(T.facade('tower', [52, 56, 66], 0.32));
  const tower = mesh(g, box(24, TOWER_H, 24, 12), fac, 0, TOWER_H / 2, 0);
  part(g, 18, 6, 18, col(0x30343c), 0, TOWER_H + 3, 0);
  part(g, 0.5, 26, 0.5, col(0x60646c), 0, TOWER_H + 19, 0);
  const beacon = glowSprite(g, 0xff2020, 6, 0, TOWER_H + 32.5, 0, 1);
  const sign = pl(g, 20, 3.2, neon(0xff3030, 2.2), 0, TOWER_H + 3.2, 9.05, 0); sign.material.map = T.text('hpsign', 'HALVORSEN-PIKE', [255, 255, 255], null, 64, 8);
  sign.material.transparent = true; sign.material.alphaTest = 0.5; sign.material.needsUpdate = true;
  part(g, 26, 0.8, 26, col(0x26282e), 0, 0.4, 0);
  pl(g, 9, 3.4, new THREE.MeshBasicMaterial({ map: T.windowGlow(), color: 0x7a6048 }), 0, 2.5, 12.82); part(g, 9.4, 0.3, 0.3, col(0x1a1a20), 0, 4.3, 12.8); for (let x = -4.5; x <= 4.5; x += 1.5) part(g, 0.12, 3.4, 0.1, col(0x1a1a20), x, 2.5, 12.86); // lobby
  // top floor detail (the window you jump through)
  const top = new THREE.Group(); top.position.set(0, TOWER_H - FLOOR_H, 12.02); g.add(top);
  const frameM = col(0x1a1a20);
  const inner = pl(top, 23.8, 2.6, lam(T.windowGlow()), 0, 1.5, -0.6); inner.material = new THREE.MeshBasicMaterial({ map: T.windowGlow(), color: 0xd09868 });
  const glassM = new THREE.MeshBasicMaterial({ color: 0x8ab0d8, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
  const panes = [];
  for (let x = -12; x <= 12; x += 3) part(top, 0.18, 3, 0.18, frameM, x, 1.5, 0.05);
  part(top, 24.2, 0.3, 0.3, frameM, 0, 0.15, 0.05); part(top, 24.2, 0.3, 0.3, frameM, 0, 2.85, 0.05);
  for (let x = -10.5; x <= 10.5; x += 3) panes.push(pl(top, 2.8, 2.4, glassM, x, 1.5, 0.12));
  // burning floor bands (lit up as the explosions run down the tower)
  const fireTex = T.fireWindows();
  const bands = [];
  for (let f = 0; f < 30; f++) {
    const bm = new THREE.MeshBasicMaterial({ map: repeat(fireTex, 2, 1), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0x000000 });
    const y = f * FLOOR_H + 1.5;
    const faces = [[0, y, 12.08, 0], [0, y, -12.08, Math.PI], [12.08, y, 0, Math.PI / 2], [-12.08, y, 0, -Math.PI / 2]].map(([x, yy, z, ry]) => pl(g, 24, FLOOR_H * 0.95, bm, x, yy, z, ry));
    bands.push({ mat: bm, faces, heat: 0 });
  }
  // the rest of the city (merged into a few draw calls)
  const st = new THREE.Group(); g.add(st);
  const facs = [lam(T.facade('a', [40, 42, 52], 0.25)), lam(T.facade('b', [58, 50, 46], 0.2)), lam(T.facade('c', [36, 46, 52], 0.3)), lam(T.facade('d', [70, 66, 60], 0.18))];
  const rng = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let i = 0; i < 90; i++) {
    const x = (rng() - 0.5) * 520, z = -40 - rng() * 420 + (rng() < 0.35 ? 470 : 0);
    if (Math.abs(x) < 30 && z > -60) continue;
    if (z > 12 && z < 45) continue;
    const w = 14 + rng() * 22, h = 20 + rng() * 80, d = 14 + rng() * 22;
    mesh(st, box(w, h, d, 12), facs[i % 4], x, h / 2, z);
  }
  // across the street: low shops with neon
  for (let k = 0; k < 9; k++) {
    const x = -64 + k * 16, h = 10 + (k % 3) * 6;
    mesh(st, box(14, h, 10, 12), facs[k % 4], x, h / 2, 37);
    pl(g, 10, 2.6, lam(T.windowGlow()), x, 1.6, 31.98, Math.PI).material = new THREE.MeshBasicMaterial({ map: T.windowGlow(), color: k % 2 ? 0x9070a0 : 0xa08050 });
    if (k % 2 === 0) { const nm = pl(g, 4, 0.8, neon(k % 4 ? 0x40e0ff : 0xff40c0, 2.4), x + 1, 3.4, 31.9, Math.PI); nm.material.map = T.text('shop' + k, ['24H', 'BAR', 'PAWN', 'NOODLE', 'MOTEL'][k / 2], [255, 255, 255], null, 32, 8); nm.material.transparent = true; nm.material.alphaTest = 0.4; }
  }
  // street lamps
  const pole = col(0x26282c), LAMP = neon(0xffd890, 1.8);
  const lamps = [];
  for (let x = -70; x <= 70; x += 16) for (const z of [16.6, 28]) {
    part(st, 0.18, 6, 0.18, pole, x, 3, z); part(st, 0.14, 0.14, 1.6, pole, x, 6, z + (z < 20 ? 0.8 : -0.8));
    part(st, 0.5, 0.12, 0.3, LAMP, x, 5.9, z + (z < 20 ? 1.5 : -1.5));
    lamps.push(glowSprite(g, 0xffc070, 3.2, x, 5.8, z + (z < 20 ? 1.5 : -1.5), 0.55));
  }
  mergeStatic(st);
  // the paper recycling dumpster (right next to the tower)
  const dump = new THREE.Group(); dump.position.set(7.5, 0, 15.2); g.add(dump);
  const dm = lam(T.dumpster());
  part(dump, 2.6, 1.3, 1.5, [col(0x285a36), col(0x285a36), lam(T.paperPile()), col(0x285a36), dm, col(0x285a36)], 0, 0.75, 0);
  const lid = piv(dump, 0, 1.4, -0.75); part(lid, 2.6, 0.08, 1.5, col(0x1e4a2a), 0, 0, 0.75); lid.rotation.x = -1.9;
  for (const x of [-1.1, 1.1]) for (const z of [-0.6, 0.6]) part(dump, 0.14, 0.1, 0.14, col(0x101010), x, 0.05, z);
  // parked cars, a hydrant, bags
  const cars = [makeCar(0x7a2a28), makeCar(0x2a4a6a), makeCar(0x4a4a40)];
  cars[0].position.set(-16, 0, 19.2); cars[0].rotation.y = Math.PI / 2;
  cars[1].position.set(24, 0, 19.2); cars[1].rotation.y = -Math.PI / 2;
  cars[2].position.set(-30, 0, 24.8); cars[2].rotation.y = Math.PI / 2;
  for (const c of cars) g.add(c);
  part(g, 0.3, 0.7, 0.3, col(0xb02020), 13, 0.5, 16.8);
  for (let i = 0; i < 4; i++) part(g, 0.6, 0.5, 0.5, col(0x18181a), 10.5 + i * 0.5, 0.4, 14.6 + (i % 2) * 0.3);
  // lights
  const lampL = new THREE.PointLight(0xffc880, 28, 22, 1.5); lampL.position.set(8, 5.5, 18); g.add(lampL);
  const key = new THREE.SpotLight(0xfff0e0, 0, 40, 0.5, 0.7, 1.2); g.add(key); g.add(key.target);
  const fireL = new THREE.PointLight(0xff7020, 0, 80, 1.2); fireL.position.set(0, TOWER_H - 1, 16); g.add(fireL);
  const neonL = new THREE.PointLight(0xff40c0, 14, 22, 1.5); neonL.position.set(-8, 3, 30); g.add(neonL);
  const flashL = new THREE.PointLight(0xc0d0ff, 0, 400, 0.5); flashL.position.set(-40, 200, 60); g.add(flashL);
  const moonL = new THREE.DirectionalLight(0x7080c0, 0.9); moonL.position.set(-1, 2, 1.2); g.add(moonL);
  g.add(new THREE.HemisphereLight(0x485478, 0x2a2224, 1.5));
  padLights(g);
  return {
    group: g, fog: 0x0b0d1a, fogNear: 60, fogFar: 520, bg: 0x06070f, groundY: 0, panes, bands, dump, lid, tower, beacon, lamps, cars,
    lights: { lampL, fireL, neonL, flashL, moonL, key }, top,
    grade: { tint: 0xd8dcff, lift: 0x03040a, sat: 1.05, contrast: 1.12 },
  };
}

// ------------------------------------------------------------------ CAR (front is +z)
export function makeCar(paint = 0x7a2a28) {
  const c = new THREE.Group();
  const body = col(paint), chrome = col(0xb0b4bc), dark = col(0x111216);
  const glass = TX.tex('cs_carglass', 16, 8, (p, r) => { p.noise([30, 40, 56], 0.2, r); p.rect(1, 1, 6, 6, [60, 80, 110]); p.rect(9, 1, 6, 6, [60, 80, 110]); p.set(2, 2, [150, 180, 210]); p.set(10, 2, [150, 180, 210]); }, { mip: false });
  const gm = lam(glass);
  part(c, 1.9, 0.52, 4.6, body, 0, 0.6, 0);
  part(c, 1.66, 0.56, 2.3, [gm, gm, body, body, lam(TX.tex('cs_carws', 8, 8, (p, r) => p.noise([40, 54, 74], 0.25, r))), gm], 0, 1.12, -0.25);
  part(c, 1.7, 0.06, 2.34, body, 0, 1.41, -0.25);
  part(c, 1.96, 0.16, 0.2, chrome, 0, 0.42, 2.32); part(c, 1.96, 0.16, 0.2, chrome, 0, 0.42, -2.32);
  const hl = neon(0xfff4d0, 1.8), tl = neon(0xff2010, 1.5);
  c.heads = [part(c, 0.36, 0.16, 0.04, hl, -0.62, 0.68, 2.31), part(c, 0.36, 0.16, 0.04, hl, 0.62, 0.68, 2.31)];
  c.tails = [part(c, 0.4, 0.14, 0.04, tl, -0.62, 0.7, -2.31), part(c, 0.4, 0.14, 0.04, tl, 0.62, 0.7, -2.31)];
  part(c, 1.4, 0.08, 0.04, dark, 0, 0.55, 2.31);
  c.wheels = [];
  const wg = own(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 12), dark)).geometry;
  for (const [x, z] of [[-0.9, 1.45], [0.9, 1.45], [-0.9, -1.45], [0.9, -1.45]]) { const w = new THREE.Mesh(wg, dark); w.userData.own = true; w.rotation.z = Math.PI / 2; w.position.set(x, 0.36, z); c.add(w); c.wheels.push(w); part(c, 0.27, 0.18, 0.18, chrome, x * 1.01, 0.36, z); }
  const door = piv(c, -0.96, 0.62, 0.55); part(door, 0.06, 0.48, 1.15, body, 0, 0, -0.57); part(door, 0.05, 0.4, 0.9, gm, 0, 0.5, -0.6); c.door = door;
  // headlight beams (switched on later)
  const beamM = new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  c.beams = [-0.62, 0.62].map((x) => { const b = own(new THREE.Mesh(new THREE.ConeGeometry(1.1, 11, 12, 1, true), beamM)); b.rotation.x = -Math.PI / 2; b.position.set(x, 0.5, 7.8); c.add(b); return b; });
  c.beamM = beamM; c.hlM = hl; c.tlM = tl;
  c.lights = (on) => { beamM.opacity = on ? 0.035 : 0; hl.color.setRGB(on ? 3 : 0.5, on ? 2.8 : 0.48, on ? 2.4 : 0.4); tl.color.setRGB(on ? 2.4 : 0.5, on ? 0.3 : 0.05, on ? 0.2 : 0.03); };
  c.lights(false);
  return c;
}

// ------------------------------------------------------------------ DINER
// Inside: x -5..5, z -3..4, ceiling 3. Front windows (z = 4) look onto the street; the door is at x 3.6.
// The booth: you sit at x -4.25 facing +x; the stranger sits at x -2.45. The table is at x -3.35, z 3.1.
export function buildDiner() {
  const g = new THREE.Group();
  pl(g, 10, 7, lam(repeat(T.checker(), 10, 7)), 0, 0, 0.5, 0, -Math.PI / 2);
  pl(g, 10, 7, lam(repeat(T.cream(), 6, 4)), 0, 3, 0.5, 0, Math.PI / 2);
  const tiles = lam(repeat(T.tiles(), 10, 1)), cream = lam(repeat(T.cream(), 6, 2)), chrome = col(0xc8ccd4);
  for (const [x, z, ry, w] of [[0, -3, 0, 10], [-5, 0.5, Math.PI / 2, 7], [5, 0.5, -Math.PI / 2, 7]]) {
    pl(g, w, 1.1, tiles, x, 0.55, z, ry); pl(g, w, 1.9, cream, x, 2.05, z, ry);
    const s = pl(g, w, 0.06, chrome, x, 1.12, z, ry); s.position.add(V(Math.sin(ry) * 0.01, 0, Math.cos(ry) * 0.01));
  }
  // front wall: windows + door
  const frameM = col(0xb8bcc4), glass = new THREE.MeshBasicMaterial({ color: 0x405a70, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false });
  part(g, 10, 0.9, 0.2, tiles, 0, 0.45, 4); part(g, 10, 0.5, 0.2, cream, 0, 2.75, 4);
  for (const x of [-5, -2.6, -0.2, 2.2, 3.0, 4.2, 5]) part(g, 0.1, 3, 0.22, frameM, x, 1.5, 4);
  for (const x of [-3.8, -1.4, 1.0]) pl(g, 2.4, 1.6, glass, x, 1.7, 4.0, 0);
  part(g, 0.8, 0.9, 0.2, tiles, 4.6, 0.45, 4); pl(g, 0.8, 1.6, glass, 4.6, 1.7, 4, 0);
  const doorP = piv(g, 3.0, 0, 4.0); part(doorP, 1.2, 2.5, 0.06, frameM, 0.6, 1.25, 0); pl(doorP, 1.0, 2.1, glass, 0.6, 1.3, 0.04, 0); pl(doorP, 1.0, 2.1, glass, 0.6, 1.3, -0.04, 0);
  part(doorP, 0.04, 0.3, 0.05, chrome, 1.05, 1.2, -0.06);
  part(g, 1.3, 0.25, 0.3, cream, 3.6, 2.62, 4); const bell = part(g, 0.08, 0.08, 0.08, GOLD, 3.1, 2.45, 3.85);
  // neon in the window (we see it from behind, so it's mirrored)
  const dn = pl(g, 1.8, 0.45, neon(0xff3fb0, 2.4), -1.4, 2.2, 3.9, Math.PI); dn.material.map = T.text('diner', 'DINER', [255, 255, 255], null, 24, 8, 1, false); dn.material.transparent = true; dn.material.alphaTest = 0.4;
  const on = pl(g, 0.9, 0.3, neon(0x40d0ff, 2.4), 4.6, 2.0, 3.9, Math.PI); on.material.map = T.text('open', 'OPEN', [255, 255, 255], null, 16, 8); on.material.transparent = true; on.material.alphaTest = 0.4;
  // booth
  const vinyl = lam(T.vinyl());
  const bench = (x, ry) => { const b = piv(g, x, 0, 3.1); b.rotation.y = ry; part(b, 0.6, 0.45, 1.3, vinyl, 0, 0.225, 0); part(b, 0.18, 0.75, 1.3, vinyl, -0.3, 0.8, 0); part(b, 0.62, 0.06, 1.32, chrome, 0, 0.46, 0); return b; };
  bench(-4.4, 0); bench(-2.3, Math.PI);
  const table = piv(g, -3.35, 0, 3.1);
  part(table, 1.1, 0.05, 1.3, col(0xe8e0d0), 0, 0.76, 0); part(table, 1.14, 0.04, 1.34, chrome, 0, 0.73, 0); part(table, 0.1, 0.72, 0.1, chrome, 0, 0.36, 0);
  // what's on the table: ketchup, mustard, napkins, fries, a shake
  part(table, 0.05, 0.16, 0.05, col(0xc01818), 0.3, 0.86, 0.5); part(table, 0.05, 0.16, 0.05, col(0xe0c020), 0.38, 0.86, 0.5); part(table, 0.1, 0.12, 0.06, chrome, 0.2, 0.84, 0.52);
  const plate = own(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.02, 16), col(0xf4f4ee))); plate.position.set(-0.32, 0.79, -0.05); table.add(plate);
  for (let i = 0; i < 9; i++) { const f = part(table, 0.015, 0.015, 0.11, col(0xf0c040), -0.4 + rnd(-0.06, 0.06), 0.81, -0.12 + rnd(-0.04, 0.04)); f.rotation.y = rnd(0, 3); }
  const cup = own(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.2, 10), col(0xe8e0e0))); cup.position.set(-0.32, 0.88, 0.3); table.add(cup); part(table, 0.01, 0.16, 0.01, col(0xff3030), -0.3, 1.02, 0.31);
  // counter, stools, pie case, menu, kitchen window, jukebox, clock, lamps
  part(g, 7, 1.05, 0.7, col(0xd8d0c0), 0.5, 0.525, -1.9); part(g, 7.1, 0.06, 0.8, chrome, 0.5, 1.07, -1.9); part(g, 7, 0.1, 0.7, col(0x40a0a0), 0.5, 0.95, -1.54);
  for (let k = 0; k < 6; k++) { const x = -2.4 + k * 1.15; part(g, 0.08, 0.7, 0.08, chrome, x, 0.35, -1.1); const s = own(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 12), vinyl)); s.position.set(x, 0.74, -1.1); g.add(s); }
  part(g, 0.9, 0.5, 0.5, new THREE.MeshBasicMaterial({ color: 0xa0d0e0, transparent: true, opacity: 0.3 }), 2.6, 1.35, -1.95);
  for (let k = 0; k < 2; k++) { const pie = own(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 12), col(0xd09050))); pie.position.set(2.4 + k * 0.4, 1.15 + 0.0, -1.95); g.add(pie); }
  pl(g, 2.4, 1.2, lam(T.menu()), -0.4, 2.3, -2.98, 0);
  pl(g, 2.0, 0.9, neon(0xffa050, 1.4), 2.6, 1.9, -2.98, 0);
  const juke = piv(g, 4.3, 0, -2.3); part(juke, 0.9, 1.4, 0.6, col(0x5a2a1a), 0, 0.7, 0); part(juke, 0.7, 0.5, 0.05, neon(0xff8040, 1.6), 0, 1.0, 0.31); part(juke, 0.78, 0.12, 0.05, neon(0x40e0ff, 2), 0, 1.45, 0.31);
  const jukeGlow = juke.children[2];
  part(g, 0.45, 0.45, 0.05, col(0xf4f0e0), -4.96, 2.4, 1.0).rotation.y = Math.PI / 2;
  for (const x of [-3.35, 0, 2.6]) { part(g, 0.02, 0.6, 0.02, col(0x202020), x, 2.7, x < -3 ? 3.1 : -1.2); part(g, 0.4, 0.25, 0.4, col(0xc04020), x, 2.3, x < -3 ? 3.1 : -1.2); glowSprite(g, 0xffd090, 1.1, x, 2.15, x < -3 ? 3.1 : -1.2, 0.5); }
  // the outside: shell, sidewalk, road, the car, a lamp, buildings across the street
  const shell = col(0x5a3a40);
  part(g, 10.4, 0.3, 7.4, col(0x2a2228), 0, 3.15, 0.5); part(g, 0.2, 3.3, 7.4, shell, -5.2, 1.65, 0.5); part(g, 0.2, 3.3, 7.4, shell, 5.2, 1.65, 0.5); part(g, 10.4, 3.3, 0.2, shell, 0, 1.65, -3.2);
  const roofSign = pl(g, 5, 1.2, neon(0xff3fb0, 2.6), -1, 3.9, 4.1, 0); roofSign.material.map = T.text('dinerout', 'DINER', [255, 255, 255], null, 24, 8); roofSign.material.transparent = true; roofSign.material.alphaTest = 0.4;
  part(g, 5.2, 0.12, 0.12, neon(0x40d0ff, 2.2), -1, 3.25, 4.12); part(g, 0.1, 1.2, 0.1, col(0x222222), -1, 3.4, 4.0);
  const stripe = part(g, 10.4, 0.15, 0.05, neon(0x40d0ff, 1.8), 0, 2.98, 4.22);
  pl(g, 400, 400, lam(repeat(T.asphalt(), 100, 100)), 0, -0.01, 0, 0, -Math.PI / 2);
  part(g, 400, 0.12, 3.4, lam(repeat(T.sidewalk(), 200, 2)), 0, 0.06, 5.8);
  pl(g, 400, 8, lam(repeat(T.road(), 50, 1)), 0, 0.004, 11.5, 0, -Math.PI / 2);
  part(g, 400, 0.12, 3, lam(repeat(T.sidewalk(), 200, 2)), 0, 0.06, 17);
  const facs = [lam(T.facade('a', [40, 42, 52], 0.25)), lam(T.facade('b', [58, 50, 46], 0.2))];
  for (let k = 0; k < 8; k++) { const x = -42 + k * 12, h = 8 + (k % 3) * 7; mesh(g, box(11, h, 8, 12), facs[k % 2], x, h / 2, 23); }
  for (let k = 0; k < 6; k++) { const x = -40 + k * 16; if (Math.abs(x) < 9) continue; mesh(g, box(10, 9, 8, 12), facs[k % 2], x, 4.5, 0); }
  const car = makeCar(0x3a6a9a); car.position.set(-1.5, 0, 9.2); car.rotation.y = -Math.PI / 2; g.add(car);
  part(g, 0.16, 5.5, 0.16, col(0x26282c), 7, 2.75, 6.8); part(g, 0.5, 0.12, 0.3, neon(0xffd890, 1.8), 7, 5.4, 7.6); glowSprite(g, 0xffc070, 3, 7, 5.3, 7.6, 0.5);
  // lights
  const boothL = new THREE.PointLight(0xffd8a0, 3.2, 8, 1.5); boothL.position.set(-3.3, 2.1, 3.1); g.add(boothL);
  const counterL = new THREE.PointLight(0xffe0b0, 3.4, 10, 1.5); counterL.position.set(1, 2.4, -1); g.add(counterL);
  const neonL = new THREE.PointLight(0xff40b0, 6, 9, 1.6); neonL.position.set(-1.4, 2.1, 4.4); g.add(neonL);
  const streetL = new THREE.PointLight(0xffc070, 26, 20, 1.5); streetL.position.set(7, 5, 7.8); g.add(streetL);
  const head = new THREE.SpotLight(0xfff0c8, 0, 40, 0.5, 0.6, 1.2); g.add(head); g.add(head.target);
  const moon = new THREE.DirectionalLight(0x5060a0, 0.35); moon.position.set(-1, 3, 2); g.add(moon);
  g.add(new THREE.HemisphereLight(0x303850, 0x201814, 0.7));
  padLights(g);
  return {
    group: g, fog: 0x0a0b14, fogNear: 12, fogFar: 90, bg: 0x05060c, groundY: 0, door: doorP, bell, car, table, jukeGlow, stripe,
    lights: { boothL, counterL, neonL, streetL, head, moon },
    rainMask: (x, z) => z > 4.3 || x > 5.4 || x < -5.4 || z < -3.4,
    grade: { tint: 0xffe8f0, lift: 0x060308, sat: 1.15, contrast: 1.1 },
  };
}

// ------------------------------------------------------------------ SUNSET HIGHWAY
export function buildSunset() {
  const g = new THREE.Group();
  skyDome(g, T.sky('sunset', [[0, [34, 6, 60]], [0.36, [90, 20, 110]], [0.47, [230, 60, 120]], [0.5, [255, 150, 70]], [0.53, [60, 10, 60]], [1, [10, 2, 20]]]));
  const sun = pl(g, 230, 230, new THREE.MeshBasicMaterial({ map: T.sun(), transparent: true, fog: false, depthWrite: false }), 0, 62, -700, 0);
  sun.material.color.setRGB(1.6, 1.4, 1.4); sun.renderOrder = -8;
  glowSprite(g, 0xff6080, 420, 0, 70, -720, 0.35).material.fog = false;
  pl(g, 3000, 3000, new THREE.MeshBasicMaterial({ map: repeat(T.grid(), 300, 300) }), 0, -0.02, 0, 0, -Math.PI / 2);
  pl(g, 14, 1800, new THREE.MeshBasicMaterial({ map: repeat(T.hiway(), 1, 120) }), 0, 0.01, -800, 0, -Math.PI / 2);
  const sil = pl(g, 1400, 110, new THREE.MeshBasicMaterial({ map: repeat(T.cityNeon(), 5, 1), transparent: true, fog: false, depthWrite: false }), 0, 42, -560, 0);
  sil.renderOrder = -7;
  // wireframe mountains
  const mMat = new THREE.LineBasicMaterial({ color: 0xff40d0, fog: false }); mMat.color.multiplyScalar(1.6);
  for (const [x, s] of [[-330, 150], [-180, 110], [210, 130], [360, 170]]) {
    const geo = own(new THREE.Mesh(new THREE.ConeGeometry(s, s * 0.7, 4, 3), new THREE.MeshBasicMaterial({ color: 0x14041e, fog: false })));
    geo.position.set(x, s * 0.35, -620); geo.rotation.y = Math.PI / 4; g.add(geo);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo.geometry), mMat); e.position.copy(geo.position); e.rotation.copy(geo.rotation); e.userData.own = true; g.add(e);
  }
  // palms and neon posts along the road
  const black = col(0x060208, true), palms = new THREE.Group(); g.add(palms);
  const NP = neon(0xff40c0, 2.2), NC = neon(0x40e0ff, 2.2);
  for (let z = 20; z > -900; z -= 40) for (const s of [-1, 1]) {
    const x = s * (13 + (Math.abs(z) % 7));
    const p = piv(palms, x, 0, z); p.rotation.z = -s * 0.08;
    for (let k = 0; k < 6; k++) part(p, 0.5 - k * 0.04, 1.4, 0.5 - k * 0.04, black, s * k * 0.08, 0.7 + k * 1.35, 0);
    for (let k = 0; k < 7; k++) { const f = piv(p, s * 0.5, 8.4, 0); f.rotation.set(0.6, k * 0.9, 0); part(f, 0.3, 0.06, 3.4, black, 0, 0, 1.6).rotation.x = 0.35; }
    part(palms, 0.2, 2.4, 0.2, s < 0 ? NP : NC, s * 7.4, 1.2, z + 20);
  }
  mergeStatic(palms);
  const car = makeCar(0x3a6a9a); g.add(car); car.lights(true);
  const head = new THREE.SpotLight(0xfff0c8, 30, 60, 0.45, 0.6, 1.2); g.add(head); g.add(head.target);
  const sunL = new THREE.DirectionalLight(0xff9070, 1.2); sunL.position.set(0, 30, -100); g.add(sunL);
  g.add(new THREE.HemisphereLight(0xc040a0, 0x200818, 1.0));
  padLights(g);
  return { group: g, fog: 0x3a0c3c, fogNear: 120, fogFar: 760, bg: 0x200830, groundY: 0, car, head, grade: { tint: 0xffe4f4, lift: 0x0a0210, sat: 1.25, contrast: 1.12 } };
}

// ------------------------------------------------------------------ the holiday snapshot (a texture)
export function renderPhoto(renderer) {
  const rt = new THREE.WebGLRenderTarget(192, 144, { type: THREE.HalfFloatType });
  const s = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(40, 192 / 144, 0.1, 400);
  cam.position.set(0.3, 2.3, 6.4); cam.lookAt(0, 2.1, 0);
  skyDome(s, T.sky('beach', [[0, [40, 120, 220]], [0.44, [130, 190, 240]], [0.5, [250, 200, 150]], [1, [250, 210, 160]]]), 200);
  glowSprite(s, 0xfff0c0, 30, -30, 20, -120, 1).material.fog = false;
  pl(s, 400, 400, col(0x2a80c0), 0, 0, -150, 0, -Math.PI / 2);
  pl(s, 60, 14, col(0xe8d090), 0, 0.02, 4, 0, -Math.PI / 2);
  for (let i = 0; i < 14; i++) pl(s, rnd(2, 6), 0.08, col(0xf0f8ff, true), rnd(-20, 20), 0.03, rnd(-30, -6), 0, -Math.PI / 2);
  // palm
  const p = piv(s, -3.4, 0, -0.5); p.rotation.z = 0.15;
  for (let k = 0; k < 7; k++) part(p, 0.32 - k * 0.02, 0.9, 0.32 - k * 0.02, col(0x7a5a38), -k * 0.06, 0.45 + k * 0.86, 0);
  for (let k = 0; k < 7; k++) { const f = piv(p, -0.4, 6.2, 0); f.rotation.set(0.7, k * 0.9, 0); part(f, 0.5, 0.06, 2.6, col(0x2a8a30), 0, 0, 1.2).rotation.x = 0.3; }
  // the Chairman, on holiday: sunglasses, a flower garland and a drink with an umbrella
  const b = makeChairman();
  b.root.position.set(0.2, 0, 0); b.root.rotation.y = 0.25; b.root.scale.setScalar(1.15);
  b.set({ shR: [-2.4, 0, -0.3], elR: [-0.6], shL: [-0.3, 0, 0.4], elL: [-1.4], neck: [0, -0.15, 0.08] }, true);
  b.update(0.016);
  part(b.neck, 0.32, 0.07, 0.04, col(0x101010), 0, 0.2, 0.16);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; part(b.neck, 0.06, 0.06, 0.06, col([0xff4080, 0xffe040, 0xff8020][i % 3]), Math.sin(a) * 0.22, 0.02, Math.cos(a) * 0.17); }
  const drink = piv(b.haL, 0, -0.12, 0.05); part(drink, 0.07, 0.12, 0.07, col(0xff9040), 0, 0, 0); const um = own(new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.05, 8), col(0xff3080))); um.position.y = 0.12; drink.add(um);
  s.add(b.root);
  s.add(new THREE.HemisphereLight(0xfff0e0, 0x806040, 1.4));
  const sunD = new THREE.DirectionalLight(0xfff0d0, 2.2); sunD.position.set(-2, 4, 5); s.add(sunD);
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(s, cam);
  renderer.setRenderTarget(prev);
  s.traverse((o) => { if (o.isMesh && o.userData.own) o.geometry.dispose(); });
  return rt;
}
