// Floor data: tower layout constants, the 10 zones x 3 alternate themes, lighting moods,
// and floorPlan() which turns (floor, variant) into the theme/mood/enemy-focus for that floor.
import { mulberry32 } from '../../engine/util.js';

export const RD = 12, RW = 7, RH = 3, HALF = RW / 2, EYE = 1.6;
export const TOP_FLOOR = 50;

// Each zone of the tower has three alternate themes. When the player reaches a
// floor, one of its three variants is rolled at random (theme + lighting mood +
// which kind of enemy dominates), so every floor has 3 distinct versions.
const T = (key, name, o) => ({ key, name, trim: [60, 50, 40], fabric: [90, 90, 90], carpet2: o.carpet ? o.carpet.map((v) => v * 0.72) : undefined, ...o });
export const ZONES = [
  { from: 1, to: 4, themes: [
    T('lobby', 'MAILROOM LEVELS', { carpet: [92, 86, 80], carpet2: [64, 60, 56], wall: [176, 166, 136], trim: [80, 62, 46], fabric: [112, 100, 88], fog: 0x16120c, light: 0xfff0d0, hemi: [0xfff2dc, 0x4a3c2c], rooms: ['office', 'mailroom', 'breakroom', 'cubicles', 'office'], focus: 'office' }),
    T('records', 'RECORDS DEPARTMENT', { carpet: [84, 90, 64], wall: [150, 150, 120], trim: [70, 56, 36], fabric: [100, 104, 80], fog: 0x10120a, light: 0xfff4c8, hemi: [0xf4f0c8, 0x3a3a24], rooms: ['archive', 'mailroom', 'office', 'archive'], focus: 'office' }),
    T('recep', 'RECEPTION WING', { floorStyle: 'marble', carpet: [200, 196, 188], carpet2: [150, 146, 140], wall: [196, 190, 176], trim: [120, 100, 70], fabric: [120, 110, 100], fog: 0x18160f, light: 0xfff8e8, hemi: [0xfffaf0, 0x50483c], rooms: ['lobby', 'lounge', 'breakroom', 'conference'], focus: 'security' }),
  ] },
  { from: 5, to: 9, themes: [
    T('cube', 'CUBICLE FARM', { carpet: [66, 74, 92], carpet2: [48, 54, 68], wall: [156, 162, 146], trim: [60, 64, 70], fabric: [78, 94, 124], fog: 0x0d1214, light: 0xe6fff2, hemi: [0xe6f6ff, 0x2c343c], rooms: ['cubicles', 'cubicles', 'office', 'breakroom', 'conference'], focus: 'office' }),
    T('call', 'CALL CENTER', { carpet: [80, 60, 96], wall: [170, 160, 170], fabric: [110, 80, 120], fog: 0x100c14, light: 0xf8f0ff, hemi: [0xf0e8ff, 0x302438], rooms: ['cubicles', 'cubicles', 'cubicles', 'breakroom'], focus: 'office' }),
    T('open', 'OPEN PLAN', { floorStyle: 'wood', carpet: [170, 130, 84], carpet2: [140, 104, 64], wall: [210, 206, 196], fabric: [140, 120, 90], fog: 0x141210, light: 0xfffbea, hemi: [0xfffaf0, 0x4a4030], rooms: ['office', 'conference', 'lounge', 'garden', 'breakroom'], focus: 'security' }),
  ] },
  { from: 10, to: 14, themes: [
    T('it', 'DATA CENTER', { carpet: [54, 60, 58], carpet2: [36, 40, 40], wall: [104, 116, 108], trim: [40, 44, 44], fabric: [70, 80, 76], fog: 0x050907, light: 0xc0ffd6, hemi: [0xb8ffd8, 0x102018], ceil: [150, 156, 150], rooms: ['servers', 'servers', 'office', 'mailroom', 'cubicles'], focus: 'robot' }),
    T('vault', 'SERVER VAULT', { floorStyle: 'metal', carpet: [70, 76, 86], carpet2: [40, 44, 50], wall: [70, 80, 96], wallStyle: 'metal', fog: 0x04060c, light: 0x90c0ff, hemi: [0x9ac0ff, 0x0a1020], ceil: [120, 126, 140], rooms: ['servers', 'servers', 'archive', 'factory'], focus: 'robot' }),
    T('help', 'IT HELLDESK', { carpet: [70, 64, 56], wall: [140, 140, 130], fabric: [96, 90, 80], fog: 0x0c0a08, light: 0xfff0c0, hemi: [0xfff0d0, 0x302820], rooms: ['office', 'cubicles', 'servers', 'mailroom'], focus: 'security' }),
  ] },
  { from: 15, to: 20, themes: [
    T('exec', 'EXECUTIVE SUITES', { carpet: [112, 30, 36], carpet2: [80, 20, 26], carpetPattern: [170, 140, 60], wall: [118, 76, 46], wallStyle: 'panel', trim: [60, 36, 20], fabric: [90, 40, 40], fog: 0x120806, light: 0xffd8a8, hemi: [0xffe0c0, 0x3a1810], rooms: ['executive', 'conference', 'office', 'breakroom'], focus: 'security' }),
    T('gold', 'GOLD FLOOR', { floorStyle: 'marble', carpet: [226, 220, 204], carpet2: [196, 170, 110], wall: [220, 210, 180], wallStyle: 'marble', trim: [180, 140, 50], fog: 0x18140a, light: 0xfff0c0, hemi: [0xfff4d0, 0x5a4420], rooms: ['lounge', 'executive', 'conference'], focus: 'security' }),
    T('trophy', 'TROPHY HALL', { carpet: [30, 70, 50], carpetPattern: [170, 140, 60], wall: [80, 56, 36], wallStyle: 'panel', trim: [40, 26, 16], fabric: [40, 80, 60], fog: 0x060c08, light: 0xffe0b0, hemi: [0xffe8c0, 0x182014], rooms: ['executive', 'archive', 'lounge'], focus: 'mutant' }),
  ] },
  { from: 21, to: 25, themes: [
    T('lab', 'R&D LABS', { floorStyle: 'tile', carpet: [200, 204, 206], carpet2: [150, 156, 160], wall: [214, 220, 222], wallStyle: 'tile', fog: 0x0a1010, light: 0xe8fff8, hemi: [0xf0fffc, 0x304040], rooms: ['lab', 'lab', 'office', 'archive'], focus: 'mutant' }),
    T('bio', 'BIOHAZARD WING', { floorStyle: 'tile', carpet: [150, 170, 140], carpet2: [100, 120, 90], wall: [150, 180, 150], wallStyle: 'tile', fog: 0x081408, light: 0xb8ff90, hemi: [0xc0ffa0, 0x103010], rooms: ['lab', 'lab', 'reactor', 'mailroom'], focus: 'mutant' }),
    T('clean', 'CLEAN ROOM', { floorStyle: 'tile', carpet: [210, 220, 230], carpet2: [170, 180, 196], wall: [200, 210, 220], wallStyle: 'metal', fog: 0x0c1018, light: 0xd8ecff, hemi: [0xe0f0ff, 0x304050], rooms: ['lab', 'factory', 'servers'], focus: 'robot' }),
  ] },
  { from: 26, to: 30, themes: [
    T('robo', 'ROBOTICS WING', { floorStyle: 'metal', carpet: [90, 92, 96], carpet2: [50, 52, 56], wall: [110, 114, 120], wallStyle: 'metal', fog: 0x08080a, light: 0xfff0d0, hemi: [0xfff0e0, 0x202024], rooms: ['factory', 'factory', 'servers', 'lab'], focus: 'robot' }),
    T('assembly', 'ASSEMBLY LINE', { floorStyle: 'metal', carpet: [110, 104, 80], carpet2: [60, 56, 40], wall: [130, 128, 120], wallStyle: 'concrete', fog: 0x0e0c08, light: 0xffe0a0, hemi: [0xffe8b0, 0x302818], rooms: ['factory', 'mailroom', 'factory'], focus: 'robot' }),
    T('test', 'TEST CHAMBERS', { floorStyle: 'tile', carpet: [60, 64, 70], carpet2: [30, 32, 36], wall: [220, 224, 228], wallStyle: 'tile', fog: 0x0a0a0c, light: 0xffffff, hemi: [0xffffff, 0x202024], rooms: ['lab', 'factory', 'reactor'], focus: 'mutant' }),
  ] },
  { from: 31, to: 35, themes: [
    T('arch', 'THE ARCHIVES', { floorStyle: 'wood', carpet: [110, 76, 46], carpet2: [86, 58, 34], wall: [120, 100, 70], fabric: [90, 70, 50], fog: 0x0c0804, light: 0xffd890, hemi: [0xffe0a0, 0x281808], rooms: ['archive', 'archive', 'office', 'mailroom'], focus: 'office' }),
    T('library', 'THE LIBRARY', { carpet: [100, 40, 34], carpetPattern: [150, 120, 60], wall: [96, 66, 40], wallStyle: 'panel', fog: 0x0c0604, light: 0xffd8a0, hemi: [0xffe0b0, 0x281410], rooms: ['archive', 'lounge', 'executive'], focus: 'mutant' }),
    T('cold', 'COLD STORAGE', { floorStyle: 'metal', carpet: [150, 170, 184], carpet2: [100, 120, 136], wall: [150, 180, 200], wallStyle: 'metal', fog: 0x081420, light: 0xc0e8ff, hemi: [0xd0f0ff, 0x102030], rooms: ['archive', 'servers', 'mailroom'], focus: 'robot' }),
  ] },
  { from: 36, to: 40, themes: [
    T('garden', 'SKY GARDEN', { floorStyle: 'grass', carpet: [70, 120, 50], carpet2: [100, 160, 70], wall: [190, 200, 180], fog: 0x0c140a, light: 0xfff8e0, hemi: [0xfff8e0, 0x304020], rooms: ['garden', 'garden', 'lounge', 'breakroom'], focus: 'mutant' }),
    T('atrium', 'THE ATRIUM', { floorStyle: 'marble', carpet: [230, 230, 226], carpet2: [180, 184, 190], wall: [236, 236, 230], wallStyle: 'marble', fog: 0x141414, light: 0xffffff, hemi: [0xffffff, 0x404040], rooms: ['garden', 'lounge', 'lobby'], focus: 'security' }),
    T('green', 'GREENHOUSE', { floorStyle: 'grass', carpet: [80, 110, 50], carpet2: [120, 150, 70], wall: [140, 170, 140], wallStyle: 'tile', fog: 0x0a160a, light: 0xe0ffc0, hemi: [0xe8ffd0, 0x203818], rooms: ['garden', 'lab', 'garden'], focus: 'mutant' }),
  ] },
  { from: 41, to: 45, themes: [
    T('pent', 'THE PENTHOUSE', { floorStyle: 'marble', carpet: [236, 228, 210], carpet2: [200, 170, 110], wall: [230, 220, 196], wallStyle: 'marble', trim: [190, 150, 60], fog: 0x14100a, light: 0xfff0d0, hemi: [0xfff4e0, 0x504030], rooms: ['lounge', 'executive', 'lounge'], focus: 'security' }),
    T('casino', 'CASINO LOUNGE', { carpet: [120, 20, 30], carpetPattern: [220, 180, 60], wall: [90, 20, 30], wallStyle: 'panel', trim: [180, 140, 50], fog: 0x100406, light: 0xffc890, hemi: [0xffd0a0, 0x300810], rooms: ['lounge', 'lounge', 'executive'], focus: 'security' }),
    T('halls', 'MARBLE HALLS', { floorStyle: 'marble', carpet: [70, 70, 80], carpet2: [40, 40, 48], wall: [90, 90, 100], wallStyle: 'marble', fog: 0x08080c, light: 0xe0e8ff, hemi: [0xe8eeff, 0x181820], rooms: ['executive', 'conference', 'garden'], focus: 'robot' }),
  ] },
  { from: 46, to: 50, themes: [
    T('reactor', 'REACTOR CORE', { floorStyle: 'metal', carpet: [80, 70, 64], carpet2: [40, 34, 30], wall: [100, 90, 84], wallStyle: 'metal', fog: 0x140604, light: 0xffa070, hemi: [0xffb080, 0x300c04], rooms: ['reactor', 'reactor', 'factory'], focus: 'robot' }),
    T('black', 'BLACK SITE', { floorStyle: 'tile', carpet: [50, 54, 50], carpet2: [24, 26, 24], wall: [70, 74, 70], wallStyle: 'concrete', fog: 0x040604, light: 0xd0ffd0, hemi: [0xc8ffc8, 0x081008], rooms: ['lab', 'reactor', 'servers'], focus: 'mutant' }),
    T('top', "CHAIRMAN'S SANCTUM", { carpet: [40, 20, 46], carpet2: [26, 12, 30], carpetPattern: [190, 150, 60], wall: [70, 46, 36], wallStyle: 'panel', trim: [30, 20, 14], fabric: [60, 30, 60], fog: 0x0a0408, light: 0xffc8a0, hemi: [0xffd0c0, 0x200810], rooms: ['executive', 'lounge', 'conference'], focus: 'security' }),
  ] },
];

export const MOODS = {
  normal: { name: '', w: 0.45 },
  night: { name: 'NIGHT SHIFT', w: 0.2, hemi: 0.55, room: 0.7, fog: 17, tint: 0x8090ff, off: 0.25 },
  emergency: { name: 'LOCKDOWN', w: 0.15, hemi: 0.75, room: 0.85, fog: 19, light: 0xff4a30, flicker: 0.35 },
  blackout: { name: 'BLACKOUT', w: 0.1, hemi: 0.32, room: 0.5, fog: 13, off: 0.7, flicker: 0.2 },
  toxic: { name: 'CONTAMINATED', w: 0.1, hemi: 0.8, room: 0.85, fog: 15, light: 0xb0ff80, fogCol: 0x0c2208 },
};

export function zoneFor(floor) { return ZONES.find((z) => floor >= z.from && floor <= z.to) || ZONES[ZONES.length - 1]; }

// The three options for a floor. Deterministic per (floor, variant) so a retry replays the same floor.
export function floorPlan(floor, variant) {
  const z = zoneFor(floor);
  const th = z.themes[variant % 3];
  const r = mulberry32(floor * 131 + variant * 977 + 5);
  let mood = 'normal';
  if (floor > 1) {
    const ms = Object.entries(MOODS);
    let tw = ms.reduce((a, [, m]) => a + m.w, 0), x = r() * tw;
    for (const [k, m] of ms) if ((x -= m.w) <= 0) { mood = k; break; }
  }
  const foci = ['office', 'security', 'robot', 'mutant'];
  const focus = r() < 0.7 ? th.focus : foci[Math.floor(r() * 4)];
  const md = MOODS[mood];
  return { floor, variant, theme: th, mood, focus, name: th.name + (md.name ? ' · ' + md.name : '') };
}

export function themeFor(floor) { return zoneFor(floor).themes[0]; }

