// Builds one floor of the tower: a straight chain of rooms joined by doorways,
// ending in an elevator lobby. Everything is chunky boxes with pixel textures.
// Floor data (zones, moods, layout constants) lives in zones.js.
import * as THREE from '../../vendor/three.module.min.js';
import * as TX from '../../engine/textures.js';
import { mulberry32, rand, pick, shuffle } from '../../engine/util.js';
import { box, plane } from '../../engine/geometry.js';
import { RD, RW, RH, HALF, EYE, MOODS } from './zones.js';
export { RD, RW, RH, HALF, EYE, TOP_FLOOR, ZONES, MOODS, zoneFor, floorPlan, themeFor } from './zones.js';
export { box } from '../../engine/geometry.js';

// ---------------------------------------------------------------- materials
const matCache = new Map();
const lam = (key, map, o = {}) => {
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial({ map, ...o }));
  return matCache.get(key);
};
const basic = (key, map, o = {}) => {
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshBasicMaterial({ map, ...o }));
  return matCache.get(key);
};

function themeMats(th, mood) {
  const k = th.key;
  return {
    floor: lam('floor' + k, TX.floorTex(th)),
    grass: lam('grassP', TX.floorTex({ key: 'gp', floorStyle: 'grass', carpet: [70, 120, 50], carpet2: [100, 160, 70] })),
    hazard: lam('hazard', TX.panel([50, 50, 50], [230, 190, 40], 'hz')),
    tread: lam('treadL', TX.tread()),
    green: lam('leaf', TX.plastic([60, 130, 50], 'leaf')),
    yellow: lam('ylw', TX.metal([210, 170, 40], 'ylw')),
    flesh: lam('fleshL', TX.flesh([110, 60, 70], 'lab')),
    felt: lam('felt', TX.plastic([30, 110, 60], 'felt')),
    glowG: basic('glowG', null, { color: 0x60ff90 }), glowO: basic('glowO', null, { color: 0xff9030 }), glowC: basic('glowC', null, { color: 0x60e0ff }),
    tank: basic('tankglass', null, { color: 0x40ff90, transparent: true, opacity: 0.28, depthWrite: false }),
    lino: lam('lino' + k, TX.lino(th)),
    ceiling: lam('ceil' + k, TX.ceiling(th)),
    wall: lam('wall' + k, TX.wall(th)),
    trim: lam('trim' + k, TX.trim(th)),
    fabric: lam('fabric' + k, TX.fabric(th)),
    fabricDark: lam('fabricD', TX.fabric({ key: 'dk', fabric: [44, 46, 52] })),
    wood: lam('wood', TX.wood()),
    woodDark: lam('woodD', TX.wood([70, 40, 24], 'd')),
    woodLight: lam('woodL', TX.wood([170, 130, 84], 'l')),
    metal: lam('metal', TX.metal()),
    metalDark: lam('metalD', TX.metal([70, 72, 78], 'd')),
    beige: lam('beige', TX.plastic()),
    vents: lam('vents', TX.vents()),
    white: lam('white', TX.plastic([230, 230, 224], 'w')),
    black: lam('black', TX.plastic([30, 30, 32], 'k')),
    blueWater: basic('water', TX.plastic([90, 150, 220], 'b')),
    concrete: lam('concrete', TX.concrete()),
    cabinet: lam('cabinet', TX.cabinet()),
    cardboard: lam('cardboard', TX.cardboard()),
    leather: lam('leather', TX.leather()),
    books: lam('books', TX.books()),
    elevDoor: lam('elevdoor', TX.elevDoor()),
    rack: basic('rack', TX.rack()),
    vending: basic('vending', TX.vending()),
    whiteboard: lam('whiteboard', TX.whiteboard()),
    screens: [0, 1, 2].map((v) => basic('screen' + v, TX.screen(v))),
    lightOn: basic('lightOn' + k + (mood.light || mood.tint || ''), TX.lightPanel(true), { color: new THREE.Color(mood.light || th.light).lerp(new THREE.Color(mood.tint || mood.light || th.light), 0.5) }),
    lightOff: lam('lightOff', TX.lightPanel(false)),
    exit: basic('exit', TX.exitSign()),
    arrow: basic('arrow', TX.upArrow()),
    plant: lam('plant', TX.plant(), { alphaTest: 0.5, side: THREE.DoubleSide }),
    posters: [0, 1, 2, 3, 4, 5].map((i) => lam('poster' + i, TX.poster(i))),
    glass: basic('glass', null, { color: 0x203040, transparent: true, opacity: 0.35, depthWrite: false }),
  };
}

// ---------------------------------------------------------------- floor
export function buildFloor(floor, plan) {
  const th = plan.theme, mood = MOODS[plan.mood];
  const M = themeMats(th, mood);
  const rng = mulberry32(floor * 7919 + plan.variant * 104729 + 17);
  const group = new THREE.Group();
  const isBoss = floor % 5 === 0;
  const nCombat = Math.min(2 + Math.ceil(floor / 4), 5);
  const types = [];
  const pool = shuffle(rng, th.rooms.slice());
  for (let i = 0; i < nCombat; i++) types.push(floor === 1 && i === 0 ? 'lobby' : pool[i % pool.length]);
  types.push('elevator');

  const sky = basic('sky' + floor, TX.skyline(floor), { fog: false });
  const sign = basic('sign' + floor, TX.floorSign(floor));
  const flicker = [];
  const elevators = [];
  const rooms = types.map((type, i) => buildRoom({ i, type, floor, th, M, rng, group, sky, sign, flicker, elevators, mood, last: i === types.length - 1, isBoss }));

  group.traverse((o) => { if (!o.userData.dyn) { o.updateMatrix(); o.matrixAutoUpdate = false; } });

  let ft = 0;
  return {
    floor, plan, theme: th, group, rooms, isBoss, elevators,
    update(dt) {
      ft += dt;
      for (const e of elevators) {
        e.open += Math.sign(e.target - e.open) * Math.min(Math.abs(e.target - e.open), dt / 1.1);
        e.doorL.position.x = e.x - 0.35 - e.open * 0.68;
        e.doorR.position.x = e.x + 0.35 + e.open * 0.68;
      }
      for (const f of flicker) {
        f.t -= dt;
        if (f.t <= 0) {
          f.on = !f.on; f.t = f.on ? rand(Math.random, 0.3, 3.5) : rand(Math.random, 0.03, 0.18);
          f.mesh.material = f.on ? M.lightOn : M.lightOff;
        }
      }
    },
  };
}

function buildRoom(c) {
  const { i, type, th, M, rng, group, floor } = c;
  const z0 = -i * RD, zf = z0 - RD, zc = z0 - RD / 2;
  const g = new THREE.Group();
  group.add(g);
  const Z = (d) => z0 - d;
  const add = (parent, geo, mat, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m;
  };
  const piece = (x, z, ry = 0, y = 0) => { const p = new THREE.Group(); p.position.set(x, y, z); p.rotation.y = ry; g.add(p); return p; };

  const room = { type, z0, zf, group: g, stand: new THREE.Vector3(0, EYE, z0 - 1.0), spots: [], lightPos: [], doorSpawns: [], elevators: [] };
  // tall cover (pillars, shelves) hides the whole body, so those spots get a sideways "peek" offset
  const spot = (x, d, cover = false, extra = {}) => room.spots.push({ x, z: Z(d), cover, ...extra,
    ...(cover && (extra.coverH || 0) >= 1.5 ? { peek: (x > 0 ? -1 : 1) * 0.95 } : {}) });

  // floor / ceiling
  add(g, box(RW, 0.1, RD, 2), type === 'breakroom' && !th.floorStyle ? M.lino : M.floor, 0, -0.05, zc);
  add(g, box(RW, 0.1, RD, 1.2), M.ceiling, 0, RH + 0.05, zc);

  // side walls (left may have windows)
  const windows = !['servers', 'mailroom', 'archive', 'reactor', 'factory'].includes(type) && rng() < (type === 'garden' ? 0.9 : 0.55);
  for (const side of [-1, 1]) {
    const x = side * (HALF + 0.1);
    if (side === -1 && windows) {
      add(g, box(0.2, 0.9, RD, 2), M.wall, x, 0.45, zc);
      add(g, box(0.2, 0.55, RD, 2), M.wall, x, RH - 0.275, zc);
      for (let k = 0; k <= 6; k++) add(g, box(0.12, 1.55, 0.1), M.metalDark, x + 0.04, 1.675, z0 - k * 2);
      add(g, box(0.3, 0.06, RD), M.metalDark, x + 0.1, 0.92, zc);
      const sp = add(g, plane(RD * 2.4, 7, 2, 1), c.sky, -(HALF + 6), 1.2, zc, Math.PI / 2);
      sp.renderOrder = -1;
      add(g, plane(RD, 1.55), M.glass, x + 0.02, 1.675, zc, Math.PI / 2);
    } else {
      add(g, box(0.2, RH, RD, 2), M.wall, x, RH / 2, zc);
      // posters
      if (rng() < 0.7) add(g, plane(0.55, 0.82), pick(rng, M.posters), x - side * 0.115, 1.6, Z(rand(rng, 3, 10)), -side * Math.PI / 2);
    }
    add(g, box(0.04, 0.14, RD, 1), M.trim, side * (HALF - 0.02), 0.07, zc);
  }

  // far wall
  if (c.last) {
    wallX(g, M, zf, [{ x: -2.2, w: 1.4, h: 2.3 }, { x: 0, w: 1.4, h: 2.3 }, { x: 2.2, w: 1.4, h: 2.3 }], add);
    for (const ex of [-2.2, 0, 2.2]) {
      const e = addElevator(g, M, add, ex, zf, -1);
      c.elevators.push(e); room.elevators.push(e);
      if (ex !== 0) room.doorSpawns.push(new THREE.Vector3(ex, 0, zf - 0.9));
    }
    room.exitElevator = room.elevators[1];
    add(g, plane(0.9, 0.45), c.sign, -HALF + 0.115, 2.1, Z(2.4), Math.PI / 2);
  } else {
    wallX(g, M, zf, [{ x: 0, w: 1.8, h: 2.3 }], add);
    add(g, box(0.1, 2.3, 0.26), M.metalDark, -0.95, 1.15, zf);
    add(g, box(0.1, 2.3, 0.26), M.metalDark, 0.95, 1.15, zf);
    add(g, box(2.0, 0.1, 0.26), M.metalDark, 0, 2.35, zf);
    add(g, box(0.6, 0.25, 0.06), M.exit, 0, 2.6, zf + 0.14);
    room.doorSpawns.push(new THREE.Vector3(0, 0, zf - 1.2));
  }

  // near wall (first room only)
  if (i === 0) {
    if (floor === 1) {
      wallX(g, M, z0, [{ x: 0, w: 5, h: 2.6 }], add);
      for (let k = -2; k <= 2; k++) add(g, box(0.1, 2.6, 0.12), M.metalDark, k * 1.25, 1.3, z0);
      add(g, plane(5, 2.6), M.glass, 0, 1.3, z0 + 0.01);
      add(g, plane(30, 9, 2, 1), c.sky, 0, 2, z0 + 9).rotation.y = Math.PI;
    } else {
      wallX(g, M, z0, [{ x: 0, w: 1.4, h: 2.3 }], add);
      const e = addElevator(g, M, add, 0, z0, 1);
      e.open = 0; e.target = 0;
      c.elevators.push(e); room.entryElevator = e;
    }
  }

  // ceiling lights
  for (let k = 0; k < 4; k++) for (const lx of [-1.6, 1.6]) {
    const off = rng() < (c.mood.off || 0.07);
    const m = add(g, box(1.2, 0.04, 0.6), off ? M.lightOff : M.lightOn, lx, RH - 0.01, Z(1.6 + k * 3));
    if (!off && rng() < (c.mood.flicker || 0.08)) { m.userData.dyn = false; c.flicker.push({ mesh: m, t: rand(rng, 0, 2), on: true }); }
  }
  room.lightPos.push(new THREE.Vector3(0, RH - 0.3, Z(3)), new THREE.Vector3(0, RH - 0.3, Z(9)));

  // ---------------- furniture kits
  const K = {
    desk(x, d, ry = 0, screenFront = false) {
      const p = piece(x, Z(d), ry);
      add(p, box(1.6, 0.05, 0.8, 1), M.wood, 0, 0.75, 0);
      add(p, box(1.56, 0.62, 0.04, 1), M.metal, 0, 0.42, 0.36);
      add(p, box(0.04, 0.73, 0.78), M.metal, -0.78, 0.365, 0);
      add(p, box(0.04, 0.73, 0.78), M.metal, 0.78, 0.365, 0);
      const scr = pick(rng, M.screens);
      const mats = [M.beige, M.beige, M.beige, M.beige, screenFront ? scr : M.vents, screenFront ? M.vents : scr];
      add(p, box(0.44, 0.36, 0.38), mats, rand(rng, -0.3, 0.3), 0.98, -0.05);
      add(p, box(0.14, 0.06, 0.14), M.beige, 0, 0.8, -0.05);
      add(p, box(0.42, 0.03, 0.14), M.beige, 0, 0.79, screenFront ? 0.25 : -0.27);
      if (rng() < 0.7) add(p, box(0.22, 0.012, 0.3), M.white, rand(rng, -0.65, -0.4), 0.78, rand(rng, -0.2, 0.2), rand(rng, -0.4, 0.4));
      if (rng() < 0.5) add(p, box(0.08, 0.1, 0.08), M.white, 0.6, 0.83, 0.1);
      K.chair(p, 0, screenFront ? 0.75 : -0.75, screenFront ? Math.PI : 0);
      return p;
    },
    chair(parent, x, z, ry) {
      const p = new THREE.Group(); p.position.set(x, 0, z); p.rotation.y = ry; parent.add(p);
      add(p, box(0.5, 0.08, 0.5), M.fabricDark, 0, 0.46, 0);
      add(p, box(0.5, 0.6, 0.07), M.fabricDark, 0, 0.8, -0.26);
      add(p, box(0.06, 0.42, 0.06), M.metalDark, 0, 0.22, 0);
      add(p, box(0.56, 0.04, 0.56), M.metalDark, 0, 0.03, 0);
    },
    cubicle(xc, d, side) {
      const H = 1.3, CW = 1.9;
      const panel = (len, x, z, ry) => {
        add(g, box(len, H, 0.06, 1), M.fabric, x, H / 2, z, ry);
        add(g, box(len, 0.04, 0.09), M.metalDark, x, H + 0.02, z, ry);
      };
      panel(CW, xc, Z(d - 1.0), 0);
      panel(CW, xc, Z(d + 1.0), 0);
      panel(1.4, xc - side * CW / 2, Z(d + 0.3), Math.PI / 2);
      K.desk(xc + side * 0.5, d, -side * Math.PI / 2, true);
      spot(xc - side * 0.25, d + 0.25, true, { coverH: H });
    },
    cabinet(x, d, ry) {
      const p = piece(x, Z(d), ry);
      add(p, box(0.5, 1.3, 0.6), [M.metal, M.metal, M.metal, M.metal, M.cabinet, M.metal], 0, 0.65, 0);
      if (rng() < 0.4) add(p, box(0.3, 0.12, 0.4), M.cardboard, 0, 1.36, 0, rand(rng, -0.3, 0.3));
    },
    plant(x, d) {
      add(g, box(0.4, 0.4, 0.4), M.metalDark, x, 0.2, Z(d));
      const p = piece(x, Z(d), rand(rng, 0, 3));
      add(p, plane(0.9, 1.1), M.plant, 0, 0.95, 0);
      add(p, plane(0.9, 1.1), M.plant, 0, 0.95, 0, Math.PI / 2);
    },
    cooler(x, d) {
      add(g, box(0.36, 0.95, 0.36), M.white, x, 0.475, Z(d));
      add(g, box(0.28, 0.42, 0.28), M.blueWater, x, 1.16, Z(d));
    },
    copier(x, d, ry) {
      const p = piece(x, Z(d), ry);
      add(p, box(1.0, 0.95, 0.7), M.beige, 0, 0.475, 0);
      add(p, box(0.9, 0.08, 0.6), M.metalDark, 0, 1.0, 0);
      add(p, box(0.3, 0.06, 0.2), M.screens[0], 0.25, 1.06, 0.2);
    },
    boxes(x, d, n) {
      for (let k = 0; k < n; k++) {
        const s = rand(rng, 0.45, 0.6);
        add(g, box(s, s * 0.8, s), M.cardboard, x + rand(rng, -0.3, 0.3), s * 0.4 + Math.floor(k / 2) * s * 0.8, Z(d + rand(rng, -0.3, 0.3)), rand(rng, -0.4, 0.4));
      }
    },
    pillar(x, d) { add(g, box(0.6, RH, 0.6, 1), M.concrete, x, RH / 2, Z(d)); },
    shelf(x, d, ry) {
      const p = piece(x, Z(d), ry);
      for (const sx of [-0.68, 0.68]) add(p, box(0.05, 2.0, 0.5), M.metalDark, sx, 1.0, 0);
      for (let k = 0; k < 4; k++) {
        add(p, box(1.4, 0.04, 0.5), M.metal, 0, 0.1 + k * 0.6, 0);
        for (let b = 0; b < 3; b++) if (rng() < 0.75) add(p, box(0.38, 0.3, 0.4), M.cardboard, -0.45 + b * 0.45, 0.27 + k * 0.6, 0, rand(rng, -0.2, 0.2));
      }
    },
    vending(x, d, ry) {
      const p = piece(x, Z(d), ry);
      add(p, box(1.0, 1.9, 0.8), [M.metalDark, M.metalDark, M.metalDark, M.metalDark, M.vending, M.metalDark], 0, 0.95, 0);
    },
    table(x, d) {
      add(g, box(1.0, 0.05, 1.0, 1), M.woodLight, x, 0.74, Z(d));
      add(g, box(0.08, 0.72, 0.08), M.metalDark, x, 0.36, Z(d));
      add(g, box(0.5, 0.04, 0.5), M.metalDark, x, 0.02, Z(d));
      K.chair(g, x - 0.7, Z(d), Math.PI / 2); K.chair(g, x + 0.7, Z(d), -Math.PI / 2);
    },
    rack(x, d, ry) {
      const p = piece(x, Z(d), ry);
      add(p, box(0.7, 2.1, 1.0), [M.metalDark, M.metalDark, M.metalDark, M.metalDark, M.rack, M.metalDark], 0, 1.05, 0);
    },
    sofa(x, d, ry) {
      const p = piece(x, Z(d), ry);
      add(p, box(1.8, 0.42, 0.8), M.leather, 0, 0.21, 0);
      add(p, box(1.8, 0.5, 0.2), M.leather, 0, 0.6, -0.3);
      add(p, box(0.2, 0.3, 0.8), M.leather, -0.85, 0.55, 0);
      add(p, box(0.2, 0.3, 0.8), M.leather, 0.85, 0.55, 0);
    },
    bookcase(x, d, ry) {
      const p = piece(x, Z(d), ry);
      add(p, box(1.2, 2.2, 0.4), [M.woodDark, M.woodDark, M.woodDark, M.woodDark, M.books, M.woodDark], 0, 1.1, 0);
    },
  };

  const lane = () => {
    spot(-1.0, 7); spot(1.0, 7.5); spot(0, 9.5); spot(-1.3, 10.5); spot(1.3, 10.8); spot(0.4, 5.8);
  };

  switch (type) {
    case 'lobby': {
      add(g, box(0.7, 1.1, 3.4, 1), M.woodDark, 2.5, 0.55, Z(7.5));
      add(g, box(0.9, 0.06, 3.6, 1), M.wood, 2.45, 1.13, Z(7.5));
      spot(3.05, 7.6, true, { coverH: 1.1 });
      K.sofa(-2.9, 4.5, Math.PI / 2); K.plant(-3.1, 2.2); K.plant(3.1, 10.5); K.plant(-3.1, 7);
      K.pillar(-1.9, 9); K.pillar(1.9, 4.5);
      spot(-1.9, 9.7, true, { coverH: 3 }); spot(-2.6, 10.6);
      lane(); break;
    }
    case 'office': {
      for (const d of [4.5, 7.5, 10.2]) for (const x of [-2.3, 2.3]) {
        K.desk(x, d, 0, false); spot(x + rand(rng, -0.3, 0.3), d + 0.85, true, { coverH: 0.8 });
      }
      K.cabinet(-3.2, 3, Math.PI / 2); K.cabinet(-3.2, 6, Math.PI / 2); K.cabinet(3.2, 6, -Math.PI / 2);
      K.copier(3.1, 2.3, -Math.PI / 2); K.cooler(-3.25, 9); K.plant(3.1, 11.4);
      lane(); break;
    }
    case 'cubicles': {
      for (const d of [4.0, 7.1, 10.2]) for (const s of [-1, 1]) K.cubicle(s * 2.5, d, s);
      K.plant(-1.6, 11.4); K.plant(1.6, 11.4);
      lane(); break;
    }
    case 'breakroom': {
      add(g, box(0.6, 0.9, 4.5, 1), M.woodLight, HALF - 0.3, 0.45, Z(4.2));
      add(g, box(0.62, 0.05, 4.5, 1), M.white, HALF - 0.3, 0.92, Z(4.2));
      add(g, box(0.5, 0.3, 0.35), [M.metal, M.metal, M.metal, M.metal, M.metal, M.metal], HALF - 0.32, 1.1, Z(3));
      add(g, box(0.25, 0.35, 0.25), M.black, HALF - 0.3, 1.12, Z(4.6));
      add(g, box(0.4, 0.6, 4.5, 1), M.woodLight, HALF - 0.2, 2.1, Z(4.2));
      add(g, box(0.75, 1.8, 0.7), M.white, HALF - 0.38, 0.9, Z(7.2));
      K.vending(-HALF + 0.45, 7.5, Math.PI / 2); K.vending(-HALF + 0.45, 8.7, Math.PI / 2);
      K.table(-2.0, 4.5); K.table(2.0, 9.5); K.table(-2.0, 10.5);
      spot(-2.0, 11.2, true, { coverH: 0.75 }); spot(2.0, 10.3, true, { coverH: 0.75 }); spot(-2.8, 9.8);
      spot(2.9, 8.3, true, { coverH: 1.8 });
      lane(); break;
    }
    case 'conference': {
      add(g, box(1.3, 0.07, 6.5, 1), M.woodDark, -2.15, 0.76, Z(7));
      add(g, box(1.1, 0.72, 6.0, 1), M.woodDark, -2.15, 0.36, Z(7));
      for (let k = 0; k < 4; k++) { K.chair(g, -1.25, Z(4.6 + k * 1.6), -Math.PI / 2); K.chair(g, -3.05, Z(4.6 + k * 1.6), Math.PI / 2); }
      add(g, plane(2.2, 1.1), M.whiteboard, HALF - 0.115, 1.6, Z(6), -Math.PI / 2);
      add(g, box(0.5, 0.9, 2.6, 1), M.woodDark, HALF - 0.3, 0.45, Z(9.5));
      spot(-2.15, 10.9, false); spot(-3.0, 8.6, false); spot(2.9, 11.2, true, { coverH: 0.9 }); spot(2.2, 7.5);
      K.plant(3.1, 2.4);
      lane(); break;
    }
    case 'servers': {
      for (const s of [-1, 1]) {
        for (const d of [3, 3.7, 4.4, 5.1, 7.4, 8.1, 8.8, 11.2]) K.rack(s * 2.75, d, -s * Math.PI / 2);
        spot(s * 2.5, 6.25, false); spot(s * 2.5, 10.0, false);
        add(g, box(0.4, 0.08, RD), M.metalDark, s * 2.75, RH - 0.25, zc);
      }
      lane(); break;
    }
    case 'mailroom': {
      for (const d of [3, 4.6, 8.4, 10]) { K.shelf(-HALF + 0.3, d, Math.PI / 2); }
      K.shelf(HALF - 0.3, 3, -Math.PI / 2); K.shelf(HALF - 0.3, 10.4, -Math.PI / 2);
      K.boxes(-1.9, 8.5, 4); K.boxes(1.9, 9.6, 5); K.boxes(1.8, 4.0, 2);
      add(g, box(1.6, 0.08, 0.9, 1), M.woodLight, 2.5, 0.85, Z(7.0));
      add(g, box(1.5, 0.82, 0.04), M.metal, 2.5, 0.42, Z(7.0) + 0.42);
      spot(-1.9, 9.3, true, { coverH: 0.9 }); spot(1.9, 10.4, true, { coverH: 1.0 }); spot(2.5, 7.8, true, { coverH: 0.85 }); spot(-2.6, 7.0);
      lane(); break;
    }
    case 'executive': {
      const p = piece(2.2, Z(8.8), 0);
      add(p, box(2.2, 0.08, 1.1, 1), M.woodDark, 0, 0.78, 0);
      add(p, box(2.1, 0.76, 0.06, 1), M.woodDark, 0, 0.38, 0.5);
      add(p, box(0.06, 0.76, 1.0), M.woodDark, -1.04, 0.38, 0); add(p, box(0.06, 0.76, 1.0), M.woodDark, 1.04, 0.38, 0);
      add(p, box(0.3, 0.2, 0.25), M.black, 0.5, 0.92, -0.1);
      spot(2.2, 9.7, true, { coverH: 0.85 });
      for (const d of [3.5, 5, 8.5, 10]) K.bookcase(-HALF + 0.22, d, Math.PI / 2);
      K.sofa(-2.3, 9.2, Math.PI / 2); spot(-2.6, 10.3, true, { coverH: 0.8 });
      K.plant(3.1, 3); K.plant(-1.4, 11.4); K.plant(3.1, 11.3);
      lane(); break;
    }
    case 'lab': {
      // island benches with glowing glassware, specimen tanks along the walls
      for (const d of [4.5, 8.2]) for (const s of [-1, 1]) {
        const x = s * 2.2;
        add(g, box(1.2, 0.86, 0.8), M.metal, x, 0.43, Z(d));
        add(g, box(1.26, 0.05, 0.86), M.white, x, 0.88, Z(d));
        for (let k = 0; k < 3; k++) add(g, box(0.08, 0.16, 0.08), pick(rng, [M.glowG, M.glowO, M.glowC]), x - 0.4 + k * 0.4, 0.99, Z(d) + rand(rng, -0.2, 0.2));
        spot(x + rand(rng, -0.2, 0.2), d + 0.85, true, { coverH: 0.9 });
      }
      for (const d of [6.3, 10.6]) for (const s of [-1, 1]) {
        const x = s * 3.0;
        add(g, box(0.8, 0.3, 0.8), M.metalDark, x, 0.15, Z(d));
        add(g, box(0.8, 0.12, 0.8), M.metalDark, x, 2.06, Z(d));
        add(g, box(0.3, 0.62, 0.26), M.flesh, x, 1.1, Z(d));
        add(g, box(0.7, 1.7, 0.7), M.tank, x, 1.15, Z(d));
      }
      add(g, box(1.2, 2.0, 0.7), M.white, -2.6, 1.0, Z(11.4));
      lane(); break;
    }
    case 'factory': {
      for (const s of [-1, 1]) {
        add(g, box(0.9, 0.6, 9.5, 1), M.tread, s * 2.95, 0.3, Z(6.5));
        add(g, box(0.06, 0.62, 9.5), M.yellow, s * 2.48, 0.31, Z(6.5));
        for (let k = 0; k < 4; k++) add(g, box(0.5, 0.4, 0.5), M.cardboard, s * 2.95, 0.8, Z(2.6 + k * 2.4 + rand(rng, 0, 0.6)), rand(rng, -0.3, 0.3));
        for (const d of [4.2, 9]) {
          const p = piece(s * 1.95, Z(d), s > 0 ? -0.6 : 0.6);
          add(p, box(0.5, 0.3, 0.5), M.hazard, 0, 0.15, 0);
          const a1 = add(p, box(0.16, 1.1, 0.16), M.yellow, 0, 0.8, 0.1); a1.rotation.x = 0.35;
          const a2 = add(p, box(0.13, 0.9, 0.13), M.yellow, 0, 1.45, 0.5); a2.rotation.x = 1.3;
          add(p, box(0.2, 0.18, 0.2), M.metalDark, 0, 1.3, 0.95);
        }
      }
      for (const s of [-1, 1]) add(g, box(0.04, 0.02, RD - 1), M.hazard, s * 1.25, 0.005, zc);
      K.boxes(-1.8, 7, 4); K.boxes(1.8, 10.5, 4);
      spot(-1.8, 7.8, true, { coverH: 0.9 }); spot(1.8, 11.2, true, { coverH: 0.9 }); spot(2.2, 6.5); spot(-2.2, 10.2);
      lane(); break;
    }
    case 'archive': {
      for (const d of [2.5, 4.1, 5.7, 8.3, 9.9]) K.bookcase(-HALF + 0.22, d, Math.PI / 2);
      for (const d of [2.5, 6.4, 10.4]) K.shelf(HALF - 0.3, d, -Math.PI / 2);
      for (const [x, d] of [[-2.0, 7.2], [2.1, 8.6]]) {
        const p = piece(x, Z(d), 0);
        add(p, box(1.4, 2.2, 0.45), [M.woodDark, M.woodDark, M.woodDark, M.woodDark, M.books, M.books], 0, 1.1, 0);
        spot(x + (x < 0 ? 0.55 : -0.55), d + 0.75, true, { coverH: 2.2 });
      }
      K.cabinet(-1.7, 4.2, 0); K.cabinet(1.8, 4.6, 0);
      spot(-1.7, 4.9, true, { coverH: 1.3 }); spot(1.8, 5.3, true, { coverH: 1.3 });
      lane(); break;
    }
    case 'garden': {
      for (const [x, d] of [[-2.4, 4.2], [2.4, 6.0], [-2.4, 9.0], [2.4, 10.6]]) {
        add(g, box(1.2, 0.5, 1.2), M.woodDark, x, 0.25, Z(d));
        add(g, box(1.1, 0.06, 1.1), M.grass, x, 0.52, Z(d));
        add(g, box(0.2, 1.6, 0.2), M.woodDark, x, 1.3, Z(d));
        add(g, box(1.0, 0.7, 1.0), M.green, x, 2.2, Z(d)); add(g, box(0.7, 0.4, 0.7), M.green, x + 0.1, 2.65, Z(d) + 0.1);
        spot(x + (x < 0 ? 0.4 : -0.4), d + 0.9, true, { coverH: 0.55 });
      }
      add(g, box(1.4, 0.4, 1.4, 1), M.concrete, 2.5, 0.2, Z(2.6));
      add(g, box(1.2, 0.05, 1.2), M.blueWater, 2.5, 0.41, Z(2.6));
      add(g, box(0.15, 0.8, 0.15), M.concrete, 2.5, 0.8, Z(2.6));
      K.plant(-3.1, 6.8); K.plant(3.1, 8.4);
      lane(); break;
    }
    case 'lounge': {
      add(g, box(0.6, 1.05, 4.2, 1), M.woodDark, HALF - 0.75, 0.52, Z(5));
      add(g, box(0.7, 0.06, 4.3, 1), M.wood, HALF - 0.75, 1.07, Z(5));
      add(g, box(0.3, 1.6, 4.2), M.woodDark, HALF - 0.12, 1.6, Z(5));
      for (let k = 0; k < 9; k++) add(g, box(0.07, 0.24, 0.07), pick(rng, [M.glowG, M.glowO, M.glowC, M.blueWater]), HALF - 0.18, 1.55 + (k % 2) * 0.5, Z(3.3 + k * 0.4));
      for (let k = 0; k < 3; k++) { add(g, box(0.3, 0.06, 0.3), M.leather, HALF - 1.35, 0.7, Z(3.6 + k * 1.3)); add(g, box(0.06, 0.66, 0.06), M.metal, HALF - 1.35, 0.35, Z(3.6 + k * 1.3)); }
      spot(HALF - 0.4, 5.6, true, { coverH: 1.05 });
      K.sofa(-2.8, 4, Math.PI / 2);
      add(g, box(1.3, 0.9, 0.7), M.black, -2.3, 0.45, Z(9.4)); add(g, box(1.3, 0.06, 0.22), M.white, -2.3, 0.92, Z(9.4) + 0.25);
      spot(-2.3, 10.1, true, { coverH: 0.95 });
      add(g, box(1.0, 0.75, 1.8), M.woodDark, 2.2, 0.38, Z(10)); add(g, box(0.9, 0.05, 1.7), M.felt, 2.2, 0.78, Z(10));
      spot(2.2, 11.2, true, { coverH: 0.8 }); K.plant(-3.1, 6.6);
      lane(); break;
    }
    case 'reactor': {
      for (const s of [-1, 1]) {
        add(g, box(0.25, 0.25, RD), M.metalDark, s * (HALF - 0.2), 2.5, zc);
        add(g, box(0.18, 0.18, RD), M.yellow, s * (HALF - 0.2), 0.35, zc);
        for (let k = 0; k < 4; k++) add(g, box(0.2, RH, 0.2), M.metal, s * (HALF - 0.25), RH / 2, Z(1.5 + k * 3));
      }
      // the core
      add(g, box(1.1, 0.3, 1.1), M.hazard, 2.4, 0.15, Z(7.5));
      add(g, box(0.75, 2.4, 0.75), M.glowO, 2.4, 1.5, Z(7.5));
      for (let k = 0; k < 4; k++) add(g, box(0.95, 0.1, 0.95), M.metalDark, 2.4, 0.6 + k * 0.6, Z(7.5));
      add(g, box(1.1, 0.3, 1.1), M.hazard, 2.4, 2.85, Z(7.5));
      for (const d of [4, 10]) {
        add(g, box(1.0, 1.0, 0.6), M.metalDark, -2.3, 0.5, Z(d));
        const sc = add(g, box(0.8, 0.4, 0.05), pick(rng, M.screens), -2.3, 1.15, Z(d) + 0.2); sc.rotation.x = -0.4;
        spot(-2.3, d + 0.75, true, { coverH: 1.1 });
      }
      spot(1.4, 8.4); spot(2.4, 9.0, true, { coverH: 2.9 });
      for (const s of [-1, 1]) add(g, box(0.05, 0.02, RD - 1), M.hazard, s * 1.25, 0.005, zc);
      lane(); break;
    }
    case 'elevator': {
      K.pillar(-1.9, 7.5); K.pillar(1.9, 7.5);
      spot(-1.9, 8.2, true, { coverH: 3 }); spot(1.9, 8.2, true, { coverH: 3 });
      K.sofa(-3.0, 3.8, Math.PI / 2); K.plant(3.1, 3); K.plant(-1.1, 11.5); K.plant(1.1, 11.5); K.cooler(3.15, 5);
      lane(); break;
    }
  }
  return room;
}

function wallX(g, M, z, openings, add) {
  const ops = openings.slice().sort((a, b) => a.x - b.x);
  let cur = -HALF;
  const seg = (a, b) => {
    add(g, box(b - a, RH, 0.2, 2), M.wall, (a + b) / 2, RH / 2, z);
    add(g, box(b - a, 0.14, 0.26, 1), M.trim, (a + b) / 2, 0.07, z);
  };
  for (const o of ops) {
    const l = o.x - o.w / 2;
    if (l > cur + 0.001) seg(cur, l);
    add(g, box(o.w, RH - o.h, 0.2, 2), M.wall, o.x, o.h + (RH - o.h) / 2, z);
    cur = o.x + o.w / 2;
  }
  if (cur < HALF - 0.001) seg(cur, HALF);
}

// Elevator car: dir = -1 means the car extends toward -z behind the wall.
function addElevator(g, M, add, x, z, dir) {
  const D = 2.0, W = 1.8, zi = z + dir * (D / 2 + 0.1);
  const shaft = new THREE.Group(); g.add(shaft);
  add(shaft, box(W, 0.1, D, 1), M.metalDark, x, -0.05, zi);
  add(shaft, box(W, 0.1, D, 1), M.metal, x, 2.45, zi);
  add(shaft, box(0.1, 2.5, D, 1), M.elevDoor, x - W / 2, 1.25, zi);
  add(shaft, box(0.1, 2.5, D, 1), M.elevDoor, x + W / 2, 1.25, zi);
  add(shaft, box(W, 2.5, 0.1, 1), M.wood, x, 1.25, z + dir * (D + 0.15));
  add(shaft, box(1.0, 0.03, 0.6), M.lightOn, x, 2.39, zi);
  add(shaft, box(0.05, 0.06, D - 0.2), M.metal, x - W / 2 + 0.08, 0.95, zi);
  // frame
  add(g, box(0.1, 2.35, 0.3), M.metal, x - 0.75, 1.175, z);
  add(g, box(0.1, 2.35, 0.3), M.metal, x + 0.75, 1.175, z);
  add(g, box(1.6, 0.1, 0.3), M.metal, x, 2.35, z);
  add(g, box(0.3, 0.3, 0.06), M.arrow, x, 2.62, z - dir * 0.13);
  const doorL = add(g, box(0.7, 2.3, 0.05), M.elevDoor, x - 0.35, 1.15, z);
  const doorR = add(g, box(0.7, 2.3, 0.05), M.elevDoor, x + 0.35, 1.15, z);
  doorL.userData.dyn = doorR.userData.dyn = true;
  return { x, z, dir, doorL, doorR, open: 0, target: 0, inside: new THREE.Vector3(x, EYE, z + dir * 1.1) };
}
