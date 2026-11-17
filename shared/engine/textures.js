// Procedural low-res pixel textures. Everything is painted at tiny sizes and
// sampled with nearest filtering for a chunky mid-90s software-renderer look.
import * as THREE from '../vendor/three.module.min.js';
import { mulberry32, hashStr } from './util.js';

const cache = new Map();

class Painter {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  set(x, y, c, a) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2];
    this.d[i + 3] = a != null ? a : (c.length > 3 ? c[3] : 255);
  }
  get(x, y) {
    x = ((Math.floor(x) % this.w) + this.w) % this.w; y = ((Math.floor(y) % this.h) + this.h) % this.h;
    const i = (y * this.w + x) * 4;
    return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]];
  }
  mul(x, y, f) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const c = this.get(x, y); this.set(x, y, [c[0] * f, c[1] * f, c[2] * f], c[3]);
  }
  rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c); }
  noise(base, amt, r, x0 = 0, y0 = 0, w = this.w, h = this.h) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const f = 1 + (r() - 0.5) * amt; this.set(x, y, [base[0] * f, base[1] * f, base[2] * f]);
    }
  }
  frame(x, y, w, h, c) {
    for (let i = x; i < x + w; i++) { this.set(i, y, c); this.set(i, y + h - 1, c); }
    for (let j = y; j < y + h; j++) { this.set(x, j, c); this.set(x + w - 1, j, c); }
  }
  text(str, x, y, c, s = 1) {
    let cx = x;
    for (const ch of str.toUpperCase()) {
      const g = FONT[ch] || FONT[' '];
      for (let row = 0; row < 5; row++) for (let col = 0; col < 3; col++) {
        if (g[row][col] === '1') this.rect(cx + col * s, y + row * s, s, s, c);
      }
      cx += 4 * s;
    }
  }
}

export function textWidth(str, s = 1) { return str.length * 4 * s - s; }

const FONT = Object.fromEntries(Object.entries({
  A: '010 101 111 101 101', B: '110 101 110 101 110', C: '011 100 100 100 011', D: '110 101 101 101 110',
  E: '111 100 110 100 111', F: '111 100 110 100 100', G: '011 100 101 101 011', H: '101 101 111 101 101',
  I: '111 010 010 010 111', J: '001 001 001 101 010', K: '101 101 110 101 101', L: '100 100 100 100 111',
  M: '101 111 111 101 101', N: '110 101 101 101 101', O: '010 101 101 101 010', P: '110 101 110 100 100',
  Q: '010 101 101 110 011', R: '110 101 110 101 101', S: '011 100 010 001 110', T: '111 010 010 010 010',
  U: '101 101 101 101 111', V: '101 101 101 101 010', W: '101 101 111 111 101', X: '101 101 010 101 101',
  Y: '101 101 010 010 010', Z: '111 001 010 100 111', 0: '111 101 101 101 111', 1: '010 110 010 010 111',
  2: '110 001 010 100 111', 3: '110 001 010 001 110', 4: '101 101 111 001 001', 5: '111 100 110 001 110',
  6: '011 100 111 101 111', 7: '111 001 010 010 010', 8: '111 101 111 101 111', 9: '111 101 111 001 110',
  '-': '000 000 111 000 000', '!': '010 010 010 000 010', '.': '000 000 000 000 010', ' ': '000 000 000 000 000',
  '^': '010 111 010 010 010', '+': '000 010 111 010 000', ':': '000 010 000 010 000', '/': '001 001 010 100 100',
}).map(([k, v]) => [k, v.split(' ')]));

const sh = (c, f) => [c[0] * f, c[1] * f, c[2] * f];

export function tex(key, w, h, draw, opts = {}) {
  if (cache.has(key)) return cache.get(key);
  const p = new Painter(w, h);
  const r = mulberry32(hashStr(key));
  draw(p, r);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').putImageData(new ImageData(p.d, w, h), 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = opts.mip === false ? THREE.NearestFilter : THREE.NearestMipmapNearestFilter;
  t.generateMipmaps = opts.mip !== false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, t);
  return t;
}

// ---------------------------------------------------------------- environment
export const carpet = (th) => tex('carpet' + th.key, 64, 64, (p, r) => {
  p.noise(th.carpet, 0.38, r);
  for (let i = 0; i < 700; i++) p.set(r() * 64, r() * 64, sh(th.carpet2, 0.85 + r() * 0.3));
  if (th.carpetPattern) {
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const a = (x + y) % 32, b = (x - y + 64) % 32;
      if (a === 0 || b === 0) p.set(x, y, sh(th.carpetPattern, 0.85 + r() * 0.3));
    }
  }
  for (let i = 0; i < 64; i++) { p.mul(i, 0, 0.72); p.mul(0, i, 0.72); }
});

export const floorTex = (th) => {
  const st = th.floorStyle || 'carpet';
  if (st === 'carpet') return carpet(th);
  return tex('floor' + st + th.key, 64, 64, (p, r) => {
    const a = th.carpet, b = th.carpet2;
    if (st === 'tile') {
      p.noise(a, 0.06, r);
      for (let i = 0; i < 64; i++) for (let k = 0; k < 64; k += 16) { p.set(i, k, b); p.set(k, i, b); }
      for (let i = 0; i < 30; i++) p.set(r() * 64, r() * 64, sh(a, 0.85));
    } else if (st === 'metal') {
      p.noise(a, 0.12, r);
      for (let y = 0; y < 64; y += 8) for (let x = ((y >> 3) % 2) * 4; x < 64; x += 8) { p.rect(x, y + 2, 3, 1, sh(a, 1.35)); p.rect(x + 1, y + 3, 3, 1, sh(a, 0.6)); }
      for (let i = 0; i < 64; i++) { p.set(i, 0, b); p.set(0, i, b); }
    } else if (st === 'wood') {
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        const plank = ((y >> 3) + ((x >> 5) % 2) * 3) % 4;
        const base = plank % 2 ? a : b;
        p.set(x, y, sh(base, (0.9 + 0.1 * Math.sin(x * 0.7 + plank * 2)) * (0.95 + r() * 0.08)));
      }
      for (let i = 0; i < 64; i++) for (let k = 0; k < 64; k += 8) p.set(i, k, sh(b, 0.6));
    } else if (st === 'marble') {
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) p.set(x, y, sh(((x >> 5) + (y >> 5)) % 2 ? a : b, 0.95 + r() * 0.06));
      for (let i = 0; i < 6; i++) { let x = r() * 64, y = r() * 64; for (let k = 0; k < 40; k++) { p.set(x, y, sh(a, 0.7)); x += r() * 2 - 0.5; y += r() * 2 - 1; } }
      for (let i = 0; i < 64; i++) { p.set(i, 0, sh(b, 0.7)); p.set(0, i, sh(b, 0.7)); p.set(i, 32, sh(b, 0.7)); p.set(32, i, sh(b, 0.7)); }
    } else if (st === 'grass') {
      p.noise(a, 0.35, r);
      for (let i = 0; i < 400; i++) { const x = r() * 64, y = r() * 64; p.set(x, y, sh(b, 1.2)); p.set(x, y - 1, sh(b, 1.4)); }
    }
  });
};

export const lino = (th) => tex('lino' + th.key, 64, 64, (p, r) => {
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const chk = ((x >> 4) + (y >> 4)) % 2;
    const base = chk ? [190, 186, 170] : [120, 60, 52];
    const f = 0.92 + r() * 0.12; p.set(x, y, sh(base, f));
  }
  for (let i = 0; i < 60; i++) p.set(r() * 64, r() * 64, [80, 76, 70]);
});

export const ceiling = (th) => tex('ceil' + th.key, 32, 32, (p, r) => {
  p.noise(th.ceil || [186, 184, 172], 0.09, r);
  for (let i = 0; i < 70; i++) p.set(r() * 32, r() * 32, [130, 128, 120]);
  for (let i = 0; i < 32; i++) { p.set(i, 0, [118, 118, 114]); p.set(0, i, [118, 118, 114]); p.set(i, 31, [150, 150, 146]); p.set(31, i, [150, 150, 146]); }
  if (r() < 0.9) { const sx = r() * 24 | 0, sy = r() * 24 | 0; for (let i = 0; i < 12; i++) p.mul(sx + r() * 8, sy + r() * 8, 0.78); }
});

export const wall = (th) => tex('wall' + th.key, 64, 64, (p, r) => {
  if (th.wallStyle === 'tile') {
    p.noise(th.wall, 0.05, r);
    for (let i = 0; i < 64; i++) for (let k = 0; k < 64; k += 16) { p.set(i, k, sh(th.wall, 0.72)); p.set(k, i, sh(th.wall, 0.72)); }
    for (let i = 0; i < 6; i++) { const x = r() * 60 | 0, y = r() * 60 | 0; p.rect(x, y, 2, 1, sh(th.wall, 0.85)); }
    return;
  }
  if (th.wallStyle === 'metal') {
    p.noise(th.wall, 0.1, r);
    for (let i = 0; i < 64; i++) for (let k = 0; k < 64; k += 32) { p.set(i, k, sh(th.wall, 0.55)); p.set(k, i, sh(th.wall, 0.55)); p.set(i, k + 1, sh(th.wall, 1.25)); }
    for (let y = 4; y < 64; y += 32) for (let x = 4; x < 64; x += 24) { p.set(x, y, sh(th.wall, 0.4)); p.set(x + 1, y + 1, sh(th.wall, 1.4)); }
    for (let y = 44; y < 52; y++) for (let x = 0; x < 64; x++) p.set(x, y, ((x + y) >> 2) % 2 ? sh(th.wall, 0.75) : sh(th.wall, 0.95));
    return;
  }
  if (th.wallStyle === 'marble') {
    p.noise(th.wall, 0.05, r);
    for (let i = 0; i < 5; i++) { let x = r() * 64, y = 0; for (let k = 0; k < 80; k++) { p.set(x, y, sh(th.wall, 0.78)); x += r() * 2 - 0.9; y += 0.8; } }
    for (let i = 0; i < 64; i++) p.set(i, 31, sh(th.wall, 0.82));
    return;
  }
  if (th.wallStyle === 'concrete') {
    p.noise(th.wall, 0.2, r);
    for (let i = 0; i < 64; i++) { p.set(i, 21, sh(th.wall, 0.75)); p.set(i, 42, sh(th.wall, 0.75)); }
    for (const [x, y] of [[10, 10], [42, 10], [26, 31], [10, 52], [42, 52]]) p.rect(x, y, 2, 2, sh(th.wall, 0.55));
    return;
  }
  if (th.wallStyle === 'panel') {
    for (let x = 0; x < 64; x++) {
      const plank = Math.floor(x / 16), f0 = 0.85 + ((plank * 37) % 7) / 30;
      for (let y = 0; y < 64; y++) {
        const g = 0.9 + 0.1 * Math.sin(y * 0.35 + plank * 3 + Math.sin(x * 0.4) * 1.5);
        p.set(x, y, sh(th.wall, f0 * g * (0.94 + r() * 0.1)));
      }
      if (x % 16 === 0) for (let y = 0; y < 64; y++) p.set(x, y, sh(th.wall, 0.5));
    }
    return;
  }
  p.noise(th.wall, 0.09, r);
  for (let i = 0; i < 6; i++) {
    const x = r() * 64 | 0, f = 0.93 + r() * 0.04;
    for (let y = 0; y < 64; y++) p.mul(x, y, f);
  }
  for (let i = 0; i < 3; i++) {
    const cx = r() * 64, cy = r() * 64, rad = 2 + r() * 5;
    for (let y = -rad; y < rad; y++) for (let x = -rad; x < rad; x++) if (x * x + y * y < rad * rad && r() < 0.7) p.mul(cx + x, cy + y, 0.9);
  }
});

export const trim = (th) => tex('trim' + th.key, 16, 16, (p, r) => { p.noise(th.trim, 0.2, r); for (let i = 0; i < 16; i++) p.set(i, 0, sh(th.trim, 1.3)); });

export const wood = (base = [124, 80, 46], key = 'a') => tex('wood' + key, 64, 64, (p, r) => {
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const g = 0.82 + 0.18 * Math.sin(y * 0.9 + Math.sin(x * 0.08 + y * 0.05) * 3);
    p.set(x, y, sh(base, g * (0.94 + r() * 0.1)));
  }
  for (let i = 0; i < 4; i++) { const y = r() * 64 | 0; for (let x = 0; x < 64; x++) p.mul(x, y, 0.8); }
});

export const fabric = (th) => tex('fabric' + th.key, 32, 32, (p, r) => {
  p.noise(th.fabric, 0.4, r);
  for (let i = 0; i < 32; i += 2) for (let j = 0; j < 32; j++) p.mul(i, j, 0.95);
});

export const metal = (base = [128, 132, 138], key = 'm') => tex('metal' + key, 32, 32, (p, r) => {
  p.noise(base, 0.12, r);
  for (let i = 0; i < 4; i++) { const y = r() * 32 | 0, x0 = r() * 32 | 0; for (let x = 0; x < 8; x++) p.mul(x0 + x, y, 1.15); }
  for (const [x, y] of [[2, 2], [29, 2], [2, 29], [29, 29]]) { p.set(x, y, sh(base, 0.5)); p.set(x + 1, y + 1, sh(base, 1.3)); }
  for (let i = 0; i < 32; i++) { p.mul(i, 0, 0.7); p.mul(0, i, 0.7); }
});

export const plastic = (base = [196, 188, 164], key = 'p') => tex('plastic' + key, 16, 16, (p, r) => {
  p.noise(base, 0.06, r);
});

export const vents = () => tex('vents', 32, 32, (p, r) => {
  p.noise([196, 188, 164], 0.06, r);
  for (let y = 6; y < 26; y += 3) for (let x = 6; x < 26; x++) p.set(x, y, [120, 114, 100]);
});

export const screen = (v = 0) => tex('screen' + v, 32, 32, (p, r) => {
  const bgs = [[8, 24, 14], [10, 22, 90], [22, 14, 4]];
  const fgs = [[60, 230, 110], [210, 220, 255], [255, 170, 40]];
  p.noise(bgs[v], 0.2, r);
  for (let y = 4; y < 28; y += 3) {
    const len = 4 + r() * 20 | 0;
    for (let x = 4; x < 4 + len; x++) if (r() < 0.85) p.set(x, y, sh(fgs[v], 0.7 + r() * 0.3));
  }
  p.frame(0, 0, 32, 32, [40, 40, 36]); p.frame(1, 1, 30, 30, [60, 58, 52]);
}, { mip: false });

export const lightPanel = (on = true) => tex('light' + on, 32, 16, (p, r) => {
  const base = on ? [250, 252, 238] : [92, 94, 98];
  p.noise(base, on ? 0.03 : 0.15, r);
  const line = on ? [196, 200, 190] : [60, 62, 64];
  for (let x = 0; x < 32; x += 8) for (let y = 0; y < 16; y++) p.set(x, y, line);
  for (let y = 0; y < 16; y += 8) for (let x = 0; x < 32; x++) p.set(x, y, line);
  p.frame(0, 0, 32, 16, on ? [170, 170, 160] : [50, 50, 52]);
}, { mip: false });

export const skyline = (floor) => tex('sky' + floor, 128, 64, (p, r) => {
  const horizon = Math.max(10, 44 - floor * 0.7); // the city sinks as you climb
  for (let y = 0; y < 64; y++) {
    const t = y / 64;
    const c = [14 + 40 * t, 14 + 22 * t, 40 + 50 * t];
    for (let x = 0; x < 128; x++) p.set(x, y, sh(c, 0.96 + r() * 0.06));
  }
  for (let i = 0; i < 40; i++) p.set(r() * 128, r() * horizon * 0.8, [220, 220, 240]);
  // moon
  for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (x * x + y * y <= 16) p.set(98 + x, 10 + y, [230, 226, 200]);
  let x = 0;
  while (x < 128) {
    const bw = 6 + r() * 14 | 0, top = horizon + r() * 20 | 0;
    const col = sh([22, 22, 34], 0.8 + r() * 0.5);
    for (let yy = top; yy < 64; yy++) for (let xx = x; xx < Math.min(128, x + bw); xx++) p.set(xx, yy, col);
    for (let yy = top + 2; yy < 64; yy += 3) for (let xx = x + 1; xx < Math.min(127, x + bw - 1); xx += 2) {
      if (r() < 0.32) p.set(xx, yy, r() < 0.8 ? [240, 200, 110] : [150, 200, 255]);
    }
    if (r() < 0.3) p.set(x + (bw >> 1), top - 1, [255, 40, 40]);
    x += bw + (r() * 3 | 0);
  }
}, { mip: false });

export const elevDoor = () => tex('elevdoor', 32, 64, (p, r) => {
  for (let x = 0; x < 32; x++) {
    const f = 0.9 + r() * 0.2;
    for (let y = 0; y < 64; y++) p.set(x, y, sh([150, 156, 162], f * (0.96 + r() * 0.06)));
  }
  for (let y = 0; y < 64; y++) { p.set(0, y, [80, 84, 90]); p.set(31, y, [190, 196, 200]); }
});

export const cabinet = () => tex('cabinet', 32, 64, (p, r) => {
  p.noise([150, 148, 136], 0.08, r);
  for (let d = 0; d < 4; d++) {
    const y0 = d * 16;
    p.frame(1, y0 + 1, 30, 14, [92, 90, 84]);
    p.rect(12, y0 + 5, 8, 2, [60, 60, 58]); p.rect(12, y0 + 4, 8, 1, [200, 200, 190]);
    p.rect(13, y0 + 9, 6, 3, [230, 228, 210]);
  }
});

export const rack = () => tex('rack', 32, 64, (p, r) => {
  p.noise([22, 24, 28], 0.2, r);
  for (let y = 0; y < 64; y += 4) {
    for (let x = 1; x < 31; x++) p.set(x, y, [48, 50, 56]);
    for (let x = 3; x < 29; x += 2) if (r() < 0.5) p.set(x, y + 2, [36, 38, 42]);
    const leds = 1 + r() * 4 | 0;
    for (let i = 0; i < leds; i++) p.set(24 + i, y + 2, pickC(r, [[60, 255, 90], [60, 255, 90], [255, 180, 40], [255, 50, 40], [80, 160, 255]]));
  }
  p.frame(0, 0, 32, 64, [70, 72, 78]);
}, { mip: false });
function pickC(r, a) { return a[Math.floor(r() * a.length)]; }

export const vending = () => tex('vending', 32, 64, (p, r) => {
  p.noise([170, 30, 34], 0.1, r);
  p.rect(3, 4, 19, 40, [30, 34, 40]);
  for (let row = 0; row < 6; row++) for (let c = 0; c < 4; c++) {
    const col = pickC(r, [[220, 40, 40], [40, 120, 220], [240, 200, 40], [60, 200, 80], [240, 240, 240]]);
    p.rect(5 + c * 4, 6 + row * 6, 3, 4, col); p.set(5 + c * 4, 6 + row * 6, [255, 255, 255]);
  }
  p.rect(24, 8, 5, 14, [40, 40, 44]);
  for (let i = 0; i < 4; i++) p.rect(25, 9 + i * 3, 3, 2, [200, 200, 80]);
  p.rect(4, 50, 18, 8, [16, 16, 18]);
  p.text('SODA', 6, 45, [255, 240, 200]);
}, { mip: false });

export const whiteboard = () => tex('wb', 64, 32, (p, r) => {
  p.noise([236, 236, 230], 0.04, r);
  p.frame(0, 0, 64, 32, [150, 150, 156]);
  p.text('Q4 GOALS', 4, 4, [30, 60, 170]);
  let y = 13;
  for (let i = 0; i < 3; i++) { p.text('-', 4, y, [40, 40, 40]); for (let x = 9; x < 9 + 10 + r() * 30; x++) if (r() < 0.8) p.set(x, y + 2, [40, 40, 40]); y += 6; }
  // a downward graph
  let gy = 6; for (let x = 44; x < 60; x++) { gy += r() < 0.6 ? 1 : 0; p.set(x, gy + 4, [200, 30, 30]); }
}, { mip: false });

const POSTERS = [
  ['SYNERGY', [40, 70, 120], [240, 200, 80]], ['TEAMWORK', [30, 90, 70], [230, 230, 230]],
  ['HUSTLE', [120, 30, 30], [250, 220, 120]], ['COMPLY', [50, 50, 60], [220, 60, 60]],
  ['SMILE', [140, 110, 40], [30, 30, 30]], ['OVERTIME', [70, 40, 100], [255, 255, 255]],
];
export const poster = (i) => tex('poster' + i, 32, 48, (p, r) => {
  const [word, bg, fg] = POSTERS[i % POSTERS.length];
  p.rect(0, 0, 32, 48, [16, 16, 16]);
  p.noise(bg, 0.15, r, 2, 2, 28, 32);
  // mountain + sun
  for (let x = 2; x < 30; x++) { const h = 10 - Math.abs(x - 14) * 0.7 + r() * 2; for (let y = 34 - Math.max(0, h); y < 34; y++) p.set(x, y, sh(bg, 0.55)); }
  for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (x * x + y * y <= 16) p.set(22 + x, 12 + y, fg);
  const tw = textWidth(word); p.text(word, Math.max(1, (32 - tw) >> 1), 39, fg);
}, { mip: false });

export const plant = () => tex('plant', 32, 32, (p, r) => {
  for (let i = 0; i < 18; i++) {
    const ang = -Math.PI / 2 + (r() - 0.5) * 2.6, len = 8 + r() * 12;
    const col = pickC(r, [[40, 120, 40], [60, 150, 50], [30, 90, 36], [80, 170, 60]]);
    for (let t = 0; t < len; t++) {
      const x = 16 + Math.cos(ang) * t, y = 31 + Math.sin(ang) * t;
      const wdt = Math.sin((t / len) * Math.PI) * 2;
      for (let w = -wdt; w <= wdt; w++) p.set(x + w, y, sh(col, 0.85 + r() * 0.3));
    }
  }
}, { mip: false });

export const floorSign = (floor) => tex('sign' + floor, 64, 32, (p, r) => {
  p.noise([30, 30, 36], 0.1, r);
  p.frame(1, 1, 62, 30, [190, 170, 90]);
  p.text('FLOOR', (64 - textWidth('FLOOR')) >> 1, 5, [200, 200, 200]);
  const n = String(floor).padStart(2, '0');
  p.text(n, (64 - textWidth(n, 3)) >> 1, 13, [240, 210, 110], 3);
}, { mip: false });

export const exitSign = () => tex('exit', 32, 16, (p, r) => {
  p.rect(0, 0, 32, 16, [30, 8, 8]);
  p.text('EXIT', (32 - textWidth('EXIT', 2)) >> 1, 3, [255, 50, 40], 2);
}, { mip: false });

export const upArrow = () => tex('uparrow', 16, 16, (p) => {
  p.rect(0, 0, 16, 16, [24, 20, 16]);
  p.text('^', 3, 1, [255, 170, 40], 3);
}, { mip: false });

export const cardboard = () => tex('box', 32, 32, (p, r) => {
  p.noise([160, 118, 72], 0.14, r);
  p.rect(13, 0, 6, 32, [196, 170, 120]);
  for (let i = 0; i < 32; i++) { p.mul(i, 0, 0.7); p.mul(0, i, 0.7); }
  p.text('A4', 3, 22, [70, 40, 20]);
});

export const concrete = () => tex('concrete', 32, 32, (p, r) => {
  p.noise([146, 144, 138], 0.22, r);
  for (let i = 0; i < 40; i++) p.set(r() * 32, r() * 32, [96, 94, 90]);
});

export const leather = () => tex('leather', 16, 16, (p, r) => { p.noise([70, 40, 30], 0.25, r); });

export const books = () => tex('books', 32, 32, (p, r) => {
  p.rect(0, 0, 32, 32, [70, 44, 26]);
  for (let shelf = 0; shelf < 2; shelf++) {
    let x = 1; const y0 = shelf * 16 + 2;
    while (x < 31) {
      const w = 1 + r() * 3 | 0, h = 9 + r() * 4 | 0;
      const col = pickC(r, [[120, 30, 30], [30, 60, 110], [40, 90, 50], [150, 130, 70], [60, 40, 70], [180, 170, 150]]);
      p.rect(x, y0 + 13 - h, w, h, sh(col, 0.85 + r() * 0.3)); x += w;
    }
    p.rect(0, y0 + 13, 32, 1, [40, 24, 14]);
  }
});

export const medkit = () => tex('medkit', 16, 16, (p, r) => {
  p.noise([230, 230, 224], 0.06, r);
  p.rect(6, 3, 4, 10, [210, 30, 30]); p.rect(3, 6, 10, 4, [210, 30, 30]);
  p.frame(0, 0, 16, 16, [160, 160, 156]);
}, { mip: false });

export const bulletHole = () => tex('hole', 8, 8, (p) => {
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const d = Math.hypot(x - 3.5, y - 3.5);
    if (d < 1.6) p.set(x, y, [10, 10, 10], 255); else if (d < 3) p.set(x, y, [40, 38, 34], 150); else p.set(x, y, [0, 0, 0], 0);
  }
}, { mip: false });

export const flash = () => tex('flash', 32, 32, (p, r) => {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) p.set(x, y, [0, 0, 0], 0);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + r() * 0.3, len = 8 + r() * 8;
    for (let t = 0; t < len; t++) {
      const w = (1 - t / len) * 2.5;
      for (let k = -w; k <= w; k++) p.set(16 + Math.cos(a) * t - Math.sin(a) * k, 16 + Math.sin(a) * t + Math.cos(a) * k, t < len * 0.4 ? [255, 255, 210] : [255, 190, 60]);
    }
  }
  for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) if (x * x + y * y <= 25) p.set(16 + x, 16 + y, [255, 255, 230]);
}, { mip: false });

// ---------------------------------------------------------------- effect sprites (phase 5)
// chunky pixel smoke puff (white, tinted by the material)
export const smoke = () => tex('smoke', 16, 16, (p, r) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.hypot(x - 7.5, y - 7.5) / 7.5 + (r() - 0.5) * 0.35;
    const a = d < 1 ? Math.round((1 - d) * 4) / 4 : 0;
    p.set(x, y, [255, 255, 255], Math.round(a * 230));
  }
}, { mip: false });
// soft round glow for additive halos (projectiles, lights)
export const glow = () => tex('glow', 16, 16, (p) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.hypot(x - 7.5, y - 7.5) / 7.5;
    const a = d < 1 ? Math.pow(1 - d, 1.6) : 0;
    p.set(x, y, [255, 255, 255], Math.round(Math.round(a * 6) / 6 * 255));
  }
}, { mip: false });
// expanding shockwave ring
export const ring = () => tex('ring', 32, 32, (p) => {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const d = Math.hypot(x - 15.5, y - 15.5);
    const a = Math.max(0, 1 - Math.abs(d - 13) / 2.5);
    p.set(x, y, [255, 230, 180], Math.round(a * 255));
  }
}, { mip: false });
// scorch mark left by explosions
export const scorch = () => tex('scorch', 32, 32, (p, r) => {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const a = Math.atan2(y - 15.5, x - 15.5);
    const d = Math.hypot(x - 15.5, y - 15.5) / (13 + Math.sin(a * 5) * 2 + r() * 2);
    p.set(x, y, [14, 12, 10], d < 1 ? Math.round((d < 0.55 ? 230 : 230 * (1 - (d - 0.55) / 0.45)) / 40) * 40 : 0);
  }
}, { mip: false });
// blood / oil / goo splat (white-ish, tinted by the material)
export const splat = (seed = 0) => tex('splat' + seed, 32, 32, (p, r) => {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) p.set(x, y, [0, 0, 0], 0);
  const blobs = [[15.5, 15.5, 8 + r() * 3]];
  for (let i = 0; i < 9; i++) { const a = r() * 6.28, d = 6 + r() * 8; blobs.push([15.5 + Math.cos(a) * d, 15.5 + Math.sin(a) * d, 1 + r() * 3]); }
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    for (const [bx, by, br] of blobs) if (Math.hypot(x - bx, y - by) < br) { const sh2 = 200 + Math.floor(r() * 3) * 25; p.set(x, y, [sh2, sh2, sh2], 255); break; }
  }
}, { mip: false });

// ---------------------------------------------------------------- characters
export const SKINS = [[226, 180, 140], [196, 146, 108], [150, 100, 70], [110, 72, 50], [236, 196, 160], [170, 190, 150]];
export const HAIRS = [[40, 28, 20], [90, 60, 30], [20, 20, 22], [160, 130, 70], [120, 120, 120], [130, 50, 24]];

// face styles: normal, cap, grey, messy, shades, mustache, bald
export function face(v) {
  const st = v.style || 'normal';
  const key = `face${st}${v.skin}${v.hair}${v.glasses ? 1 : 0}${v.capCol || ''}`;
  return tex(key, 16, 16, (p, r) => {
    const skin = SKINS[v.skin], hair = st === 'grey' ? [150, 150, 150] : HAIRS[v.hair];
    const capC = v.capCol || [34, 44, 74];
    p.noise(skin, 0.06, r);
    if (st === 'cap') {
      p.noise(capC, 0.1, r, 0, 0, 16, 4); p.rect(0, 4, 16, 1, sh(capC, 0.55));
      p.rect(6, 1, 4, 2, [200, 170, 60]);
    } else if (st === 'bald') {
      for (let y = 2; y < 6; y++) { p.set(0, y, hair); p.set(15, y, hair); }
      p.set(5, 1, sh(skin, 1.12)); p.set(6, 1, sh(skin, 1.12));
    } else {
      p.noise(hair, 0.15, r, 0, 0, 16, 3);
      for (let x = 0; x < 16; x++) if (r() < 0.5) p.set(x, 3, sh(hair, 0.9));
      if (st === 'messy') for (let x = 0; x < 16; x += 2) if (r() < 0.5) p.set(x, 0, sh(hair, 1.25));
    }
    [[3, 5], [4, 5], [5, 6], [6, 6], [9, 6], [10, 6], [11, 5], [12, 5]].forEach(([x, y]) => p.set(x, y, sh(hair, 0.6)));
    const dark = [24, 14, 12];
    const pupil = st === 'messy' ? [220, 20, 20] : v.eye || dark;
    if (st === 'cap' || st === 'shades') {
      p.rect(3, 7, 4, 2, [20, 20, 24]); p.rect(9, 7, 4, 2, [20, 20, 24]); p.rect(7, 7, 2, 1, [20, 20, 24]);
      p.set(4, 7, [120, 160, 200]); p.set(10, 7, [120, 160, 200]);
    } else {
      p.set(4, 7, [240, 240, 230]); p.set(5, 7, pupil); p.set(10, 7, pupil); p.set(11, 7, [240, 240, 230]);
      if (v.glasses) {
        [[3, 7], [6, 7], [9, 7], [12, 7], [7, 7], [8, 7]].forEach(([x, y]) => p.set(x, y, [20, 20, 20]));
        for (let x = 3; x <= 6; x++) p.set(x, 8, [20, 20, 20]); for (let x = 9; x <= 12; x++) p.set(x, 8, [20, 20, 20]);
      }
    }
    p.set(7, 9, sh(skin, 0.75)); p.set(8, 9, sh(skin, 0.7)); p.set(7, 10, sh(skin, 0.8));
    if (st === 'grey') {
      for (let x = 4; x <= 11; x++) p.set(x, 12, [80, 20, 20]); p.set(4, 11, [80, 20, 20]); p.set(11, 11, [80, 20, 20]);
      for (let x = 5; x <= 10; x += 1) p.set(x, 12, x % 2 ? [240, 240, 230] : [80, 20, 20]);
    } else if (st === 'messy') {
      p.rect(5, 11, 6, 3, [70, 10, 10]); for (let x = 5; x < 11; x += 2) p.set(x, 11, [240, 240, 230]);
    } else {
      for (let x = 5; x <= 10; x++) p.set(x, 12, [100, 30, 30]); p.set(6, 12, [230, 230, 220]); p.set(8, 12, [230, 230, 220]);
    }
    if (st === 'mustache') { p.rect(4, 10, 8, 2, sh(hair, 0.8)); p.set(3, 11, sh(hair, 0.8)); p.set(12, 11, sh(hair, 0.8)); }
    for (let y = 0; y < 16; y++) { p.mul(15, y, 0.8); p.mul(0, y, 0.9); }
    for (let x = 0; x < 16; x++) p.mul(x, 15, 0.82);
  }, { mip: false });
}

function hairCol(v) { return v.style === 'cap' ? (v.capCol || [34, 44, 74]) : v.style === 'grey' ? [150, 150, 150] : v.style === 'bald' ? SKINS[v.skin] : HAIRS[v.hair]; }
export function headSide(v, back) {
  const key = `hside${back ? 'b' : 's'}${v.style}${v.skin}${v.hair}${v.capCol || ''}`;
  return tex(key, 16, 16, (p, r) => {
    const skin = SKINS[v.skin], hair = hairCol(v);
    p.noise(skin, 0.06, r);
    const hh = back ? (v.style === 'cap' ? 5 : 11) : (v.style === 'cap' ? 4 : 5);
    p.noise(hair, 0.15, r, 0, 0, 16, hh);
    if (v.style === 'bald') p.noise(HAIRS[v.hair], 0.15, r, 0, 4, 16, 3);
    if (!back) p.rect(7, 7, 2, 3, sh(skin, 0.8));
    for (let x = 0; x < 16; x++) p.mul(x, 15, 0.82);
  }, { mip: false });
}
export function hairTop(v) {
  return tex(`htop${v.style}${v.hair}${v.skin}${v.capCol || ''}`, 8, 8, (p, r) => p.noise(hairCol(v), 0.18, r), { mip: false });
}

// style: suit, shirt, uniform, polo, overalls, vest, blouse, military, armor, hazmat, glitch, ninja, flesh
export const OUTFITS = {
  grunt: { style: 'suit', jacket: [64, 66, 76], shirt: [222, 222, 214], tie: [150, 30, 30], pants: [40, 40, 48] },
  rusher: { style: 'shirt', jacket: [150, 172, 206], shirt: [150, 172, 206], tie: [200, 50, 50], pants: [150, 130, 92] },
  guard: { style: 'uniform', jacket: [38, 48, 80], shirt: [38, 48, 80], tie: [20, 20, 24], pants: [30, 36, 60] },
  boss: { style: 'suit', pin: true, jacket: [42, 30, 44], shirt: [235, 230, 220], tie: [220, 180, 50], pants: [36, 26, 38] },
  intern: { style: 'polo', jacket: [200, 60, 50], shirt: [230, 220, 200], pants: [150, 130, 92] },
  mail: { style: 'polo', jacket: [120, 90, 50], shirt: [200, 170, 90], pants: [90, 70, 40] },
  janitor: { style: 'overalls', jacket: [90, 110, 90], shirt: [180, 170, 140], pants: [80, 100, 80], gloves: [200, 180, 40] },
  it: { style: 'polo', jacket: [40, 44, 52], shirt: [90, 200, 120], pants: [60, 60, 70] },
  accountant: { style: 'vest', jacket: [110, 80, 50], shirt: [226, 226, 216], tie: [40, 60, 120], pants: [60, 56, 50] },
  hr: { style: 'blouse', jacket: [200, 120, 150], shirt: [240, 220, 220], pants: [60, 50, 60] },
  manager: { style: 'suit', jacket: [110, 80, 54], shirt: [220, 210, 180], tie: [60, 120, 60], pants: [80, 60, 40] },
  major: { style: 'military', jacket: [86, 96, 58], shirt: [86, 96, 58], pants: [70, 78, 46], gloves: [40, 34, 26] },
  riot: { style: 'armor', jacket: [34, 36, 42], shirt: [34, 36, 42], pants: [30, 30, 36], gloves: [20, 20, 22] },
  consultant: { style: 'suit', jacket: [220, 220, 214], shirt: [40, 40, 44], tie: [200, 40, 40], pants: [210, 210, 204] },
  sales: { style: 'suit', jacket: [40, 70, 160], shirt: [240, 240, 230], tie: [250, 200, 40], pants: [36, 56, 130] },
  glitch: { style: 'glitch', jacket: [40, 220, 200], shirt: [240, 40, 200], pants: [30, 30, 40] },
  hazmat: { style: 'hazmat', jacket: [220, 190, 40], shirt: [220, 190, 40], pants: [210, 180, 36], gloves: [30, 30, 30] },
  flesh: { style: 'flesh', jacket: [170, 110, 110], shirt: [170, 110, 110], pants: [110, 60, 60], gloves: [150, 90, 90] },
  brute: { style: 'flesh', jacket: [120, 140, 100], shirt: [120, 140, 100], pants: [60, 50, 40], gloves: [100, 120, 80] },
  assistant: { style: 'blouse', jacket: [30, 30, 34], shirt: [220, 220, 220], pants: [30, 30, 34] },
  bodyguard: { style: 'suit', jacket: [22, 22, 26], shirt: [230, 230, 230], tie: [20, 20, 22], pants: [20, 20, 24] },
  lawyer: { style: 'suit', pin: true, jacket: [56, 58, 66], shirt: [230, 225, 215], tie: [120, 20, 40], pants: [50, 52, 60] },
  ninja: { style: 'ninja', jacket: [24, 24, 30], shirt: [24, 24, 30], pants: [20, 20, 26], gloves: [16, 16, 20] },
  heavy: { style: 'military', jacket: [70, 72, 78], shirt: [70, 72, 78], pants: [56, 58, 62], gloves: [30, 30, 30] },
  jet: { style: 'military', jacket: [50, 70, 110], shirt: [50, 70, 110], pants: [40, 54, 86], gloves: [30, 30, 30] },
  shadow: { style: 'suit', pin: true, jacket: [16, 12, 22], shirt: [60, 20, 80], tie: [180, 40, 255], pants: [14, 10, 20] },
};

export function torsoFront(type) {
  return tex('tfront' + type, 16, 16, (p, r) => {
    const o = OUTFITS[type], st = o.style;
    p.noise(o.jacket, 0.1, r);
    if (o.pin) for (let x = 1; x < 16; x += 3) for (let y = 0; y < 16; y++) p.set(x, y, sh(o.jacket, 1.5));
    if (st === 'uniform' || st === 'military') {
      p.rect(3, 3, 2, 2, [220, 190, 70]); p.rect(10, 4, 3, 3, sh(o.jacket, 0.75)); p.rect(3, 6, 3, 3, sh(o.jacket, 0.75));
      p.rect(0, 13, 16, 2, [20, 20, 20]); p.rect(7, 13, 2, 2, [200, 180, 80]);
      for (let y = 0; y < 12; y++) p.set(8, y, sh(o.jacket, 0.7));
      if (st === 'military') { [[2, 2, [200, 40, 40]], [3, 2, [40, 80, 200]], [4, 2, [230, 200, 60]], [5, 2, [60, 160, 60]]].forEach(([x, y, c]) => p.set(x, y, c)); p.rect(11, 1, 3, 1, [230, 200, 60]); }
      return;
    }
    if (st === 'shirt') {
      for (let i = 0; i < 6; i++) p.set(9 + r() * 4, 6 + r() * 4, [120, 80, 50]);
      p.rect(7, 0, 2, 2, o.tie); p.rect(8, 2, 2, 7, o.tie); p.set(9, 9, o.tie);
      p.rect(0, 14, 16, 2, [80, 60, 40]); return;
    }
    if (st === 'polo') { p.rect(5, 0, 6, 2, sh(o.jacket, 1.25)); p.rect(7, 2, 2, 3, sh(o.jacket, 0.8)); p.rect(11, 4, 2, 2, o.shirt); p.rect(0, 14, 16, 2, sh(o.pants, 0.8)); return; }
    if (st === 'overalls') { p.noise(o.shirt, 0.1, r, 0, 0, 16, 5); p.rect(3, 4, 10, 12, o.pants); p.rect(3, 0, 2, 5, o.pants); p.rect(11, 0, 2, 5, o.pants); p.rect(6, 6, 4, 3, sh(o.pants, 0.8)); p.set(4, 4, [200, 200, 60]); p.set(11, 4, [200, 200, 60]); return; }
    if (st === 'vest') { p.noise(o.shirt, 0.06, r); for (let y = 3; y < 15; y++) for (let x = 2; x < 14; x++) if (Math.abs(x - 7.5) + 1 > (y < 6 ? 6 - y : 0)) p.set(x, y, sh(o.jacket, ((x + y) % 4 === 0) ? 1.25 : 1)); p.rect(7, 0, 2, 5, o.tie); return; }
    if (st === 'blouse') { for (let y = 0; y < 5; y++) for (let x = 7 - (4 - y); x <= 8 + (4 - y); x++) p.set(x, y, sh(o.shirt, 0.95)); p.set(7, 6, [230, 200, 80]); p.set(8, 6, [230, 200, 80]); return; }
    if (st === 'armor') { for (let y = 0; y < 16; y += 5) for (let x = 0; x < 16; x++) p.set(x, y, sh(o.jacket, 0.55)); for (let x = 0; x < 16; x += 8) for (let y = 0; y < 16; y++) p.set(x, y, sh(o.jacket, 0.55)); p.text('SWAT', 0, 6, [200, 200, 200]); return; }
    if (st === 'hazmat') { p.rect(7, 0, 2, 16, sh(o.jacket, 0.7)); for (let a = 0; a < 6.28; a += 0.3) p.set(11 + Math.cos(a) * 2.4, 5 + Math.sin(a) * 2.4, [20, 20, 20]); p.set(11, 5, [20, 20, 20]); return; }
    if (st === 'glitch') { for (let y = 0; y < 16; y++) { const c = [[40, 220, 200], [240, 40, 200], [30, 30, 40], [250, 250, 250], [40, 40, 240]][Math.floor(r() * 5)]; const x0 = r() * 10 | 0; for (let x = x0; x < x0 + 3 + r() * 10; x++) p.set(x, y, c); } return; }
    if (st === 'ninja') { for (let i = 0; i < 16; i++) { p.set(i, i, sh(o.jacket, 1.8)); p.set(i, Math.min(15, i + 1), sh(o.jacket, 1.8)); } p.rect(0, 12, 16, 2, [120, 20, 20]); return; }
    if (st === 'flesh') {
      for (let i = 0; i < 5; i++) { let x = r() * 16, y = r() * 16; for (let k = 0; k < 10; k++) { p.set(x, y, sh(o.jacket, 0.6)); x += r() * 2 - 1; y += 1; } }
      for (let i = 0; i < 4; i++) { const x = r() * 14 | 0, y = r() * 14 | 0; p.rect(x, y, 2, 2, sh(o.jacket, 1.3)); }
      p.rect(6, 4, 4, 1, sh(o.jacket, 0.7)); p.rect(5, 8, 6, 1, sh(o.jacket, 0.75)); p.rect(5, 11, 6, 1, sh(o.jacket, 0.75)); return;
    }
    // suit
    for (let y = 0; y < 11; y++) {
      const hw = Math.max(0, 3 - Math.floor(y / 4));
      for (let x = 8 - hw - 1; x <= 8 + hw; x++) p.set(x, y, sh(o.shirt, 0.95 + r() * 0.08));
    }
    p.rect(7, 0, 2, 2, sh(o.tie, 0.8)); p.rect(7, 2, 2, 8, o.tie); p.set(7, 10, o.tie);
    p.set(5, 1, sh(o.jacket, 0.6)); p.set(10, 1, sh(o.jacket, 0.6)); p.set(5, 2, sh(o.jacket, 0.6)); p.set(10, 2, sh(o.jacket, 0.6));
    p.set(8, 12, [20, 20, 20]); p.set(8, 14, [20, 20, 20]);
    p.rect(11, 4, 3, 1, [230, 230, 230]);
  }, { mip: false });
}

export function torsoBack(type) {
  return tex('tback' + type, 16, 16, (p, r) => {
    const o = OUTFITS[type]; p.noise(o.jacket, 0.1, r);
    if (o.pin) for (let x = 1; x < 16; x += 3) for (let y = 0; y < 16; y++) p.set(x, y, sh(o.jacket, 1.5));
    if (type === 'guard') p.text('SEC', 2, 4, [220, 220, 220]);
    if (o.style === 'glitch') for (let y = 0; y < 16; y += 2) p.rect(r() * 8 | 0, y, 6, 1, [240, 40, 200]);
  }, { mip: false });
}

export function arm(type, skin) {
  return tex(`arm${type}${skin}`, 8, 16, (p, r) => {
    const o = OUTFITS[type], st = o.style;
    p.noise(st === 'shirt' || st === 'polo' ? o.jacket : o.jacket, 0.1, r);
    if (st === 'shirt' || st === 'polo' || st === 'flesh') p.noise(o.gloves && st === 'flesh' ? o.jacket : SKINS[skin], 0.06, r, 0, 6, 8, 10);
    else if (st === 'suit' || st === 'vest') p.rect(0, 11, 8, 1, o.shirt);
    if (st === 'glitch') p.rect(0, r() * 10 | 0, 8, 2, [240, 40, 200]);
    p.noise(o.gloves || SKINS[skin], 0.08, r, 0, 12, 8, 4);
  }, { mip: false });
}

export function leg(type) {
  return tex('leg' + type, 8, 16, (p, r) => {
    const o = OUTFITS[type]; p.noise(o.pants, 0.12, r);
    p.rect(0, 14, 8, 2, o.style === 'hazmat' ? [30, 30, 30] : o.style === 'flesh' ? sh(o.pants, 0.7) : [18, 16, 16]);
  }, { mip: false });
}

// ---- robots & monsters
export const panel = (base, accent, key) => tex('panel' + key, 16, 16, (p, r) => {
  p.noise(base, 0.12, r);
  for (let i = 0; i < 16; i++) { p.set(i, 0, sh(base, 0.6)); p.set(0, i, sh(base, 0.6)); p.set(i, 15, sh(base, 1.2)); }
  for (let i = 4; i < 12; i++) p.set(i, 8, sh(base, 0.75));
  for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) { p.set(x, y, sh(base, 0.45)); p.set(x + 1, y, sh(base, 1.35)); }
  if (accent) for (let y = 11; y < 15; y++) for (let x = 1; x < 15; x++) p.set(x, y, ((x + y) >> 1) % 2 ? accent : [20, 20, 20]);
}, { mip: false });

export const flesh = (base, key) => tex('flesh' + key, 16, 16, (p, r) => {
  p.noise(base, 0.25, r);
  for (let i = 0; i < 3; i++) { let x = r() * 16, y = 0; for (let k = 0; k < 18; k++) { p.set(x, y, sh(base, 0.55)); x += r() * 2 - 1; y += 1; } }
  for (let i = 0; i < 4; i++) { const x = r() * 14 | 0, y = r() * 14 | 0; p.rect(x, y, 2, 2, sh(base, 1.35)); p.set(x, y, [240, 230, 160]); }
}, { mip: false });

export const slime = (base, key) => tex('slime' + key, 16, 16, (p, r) => {
  p.noise(base, 0.12, r);
  for (let i = 0; i < 5; i++) { const x = r() * 13 | 0, y = r() * 13 | 0; p.frame(x, y, 3, 3, sh(base, 1.4)); }
  p.rect(2, 2, 3, 1, sh(base, 1.7)); p.set(2, 3, sh(base, 1.7));
}, { mip: false });

export const tread = () => tex('tread', 16, 16, (p, r) => {
  p.noise([30, 30, 32], 0.2, r);
  for (let y = 0; y < 16; y += 4) { p.rect(0, y, 16, 2, [60, 60, 64]); }
}, { mip: false });

// kinds: helmet, gasmask, mutant, mask, glitch, visor, mono, multi, eyeball, pod, hound, copier, wraith
export function eyes(kind, col = [255, 40, 30], base = [70, 74, 82]) {
  const key = `eyes${kind}${col}${base}`;
  return tex(key, 16, 16, (p, r) => {
    const glow = col, hot = sh(col, 1.6);
    if (kind === 'helmet') { p.noise([40, 42, 48], 0.1, r); p.rect(1, 5, 14, 5, [12, 12, 16]); p.set(3, 6, [120, 140, 170]); p.set(4, 6, [80, 100, 130]); p.rect(5, 12, 6, 2, [30, 30, 34]); return; }
    if (kind === 'gasmask') {
      p.noise([52, 58, 52], 0.12, r);
      for (const cx of [4, 11]) for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= 5) p.set(cx + x, 7 + y, x * x + y * y > 3 ? [20, 20, 20] : [110, 160, 120]);
      p.rect(5, 11, 6, 5, [90, 92, 90]); for (let x = 6; x < 10; x += 2) p.set(x, 13, [30, 30, 30]); return;
    }
    if (kind === 'mutant') {
      p.noise(base, 0.22, r);
      for (const [x, y, s] of [[3, 4, 2], [10, 5, 3], [7, 2, 1]]) { p.rect(x, y, s, s, [250, 230, 60]); p.set(x + (s >> 1), y + (s >> 1), [20, 10, 10]); }
      p.rect(3, 10, 10, 5, [60, 10, 10]); for (let x = 3; x < 13; x += 2) { p.set(x, 10, [240, 230, 200]); p.set(x + 1, 14, [240, 230, 200]); }
      return;
    }
    if (kind === 'mask') { p.noise([24, 24, 30], 0.1, r); p.rect(2, 6, 12, 3, SKINS[0]); p.set(4, 7, [200, 20, 20]); p.set(11, 7, [200, 20, 20]); return; }
    if (kind === 'glitch') { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, [[40, 220, 200], [240, 40, 200], [20, 20, 30], [250, 250, 250]][Math.floor(r() * 4)]); p.rect(3, 6, 3, 2, [0, 0, 0]); p.rect(10, 6, 3, 2, [0, 0, 0]); return; }
    p.noise(base, 0.12, r);
    p.frame(0, 0, 16, 16, sh(base, 0.6));
    if (kind === 'visor') { p.rect(1, 5, 14, 5, [10, 10, 12]); p.rect(3, 6, 10, 3, glow); p.rect(6, 6, 4, 3, hot); for (let x = 2; x < 14; x += 3) p.set(x, 12, sh(base, 0.5)); return; }
    if (kind === 'mono' || kind === 'eyeball') {
      if (kind === 'eyeball') { p.noise([230, 220, 210], 0.06, r); for (let i = 0; i < 4; i++) { let x = 0, y = r() * 16; for (let k = 0; k < 6; k++) { p.set(x, y, [200, 40, 40]); x += 1; y += r() * 2 - 1; } } }
      for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) { const d = x * x + y * y; if (d <= 25) p.set(8 + x, 8 + y, kind === 'eyeball' ? (d <= 9 ? (d <= 3 ? [10, 10, 10] : glow) : d <= 25 && d > 20 ? sh(glow, 0.6) : p.get(8 + x, 8 + y)) : d <= 4 ? hot : d <= 16 ? glow : [12, 12, 14]); }
      p.set(6, 6, [255, 255, 255]); return;
    }
    if (kind === 'multi') { for (const [x, y, s] of [[4, 5, 2], [10, 5, 2], [6, 3, 1], [9, 3, 1], [3, 8, 1], [12, 8, 1], [7, 8, 2]]) { p.rect(x, y, s, s, glow); p.set(x, y, hot); } p.rect(5, 12, 6, 2, [20, 20, 20]); return; }
    if (kind === 'hound') { p.rect(2, 5, 4, 2, glow); p.rect(10, 5, 4, 2, glow); p.rect(3, 11, 10, 3, [20, 20, 20]); for (let x = 4; x < 12; x += 2) p.set(x, 11, [220, 220, 220]); return; }
    if (kind === 'copier') { p.rect(1, 4, 14, 3, [20, 20, 20]); for (let x = 2; x < 14; x += 2) p.set(x, 4, [240, 240, 230]); p.rect(2, 10, 4, 2, glow); p.rect(9, 10, 5, 2, [60, 200, 80]); return; }
    if (kind === 'pod') { for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (x * x + y * y < 16) p.set(8 + x, 8 + y, x * x + y * y < 6 ? glow : [60, 10, 20]); return; }
    if (kind === 'wraith') { p.noise([16, 20, 18], 0.3, r); p.rect(3, 6, 3, 2, glow); p.rect(10, 6, 3, 2, glow); for (let y = 9; y < 16; y += 2) p.rect(4, y, 8, 1, sh(glow, 0.3)); return; }
  }, { mip: false });
}

export const botFace = () => eyes('visor', [230, 30, 20], [70, 74, 82]);
export const botSide = () => panel([86, 90, 98], null, 'bot');
export const gunMetal = () => metal([46, 48, 54], 'gun');
