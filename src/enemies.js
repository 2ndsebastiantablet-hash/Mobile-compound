// Enemy roster: blocky office workers (and a security drone) built from boxes.
import * as THREE from '../vendor/three.module.min.js';
import * as TX from './textures.js';
import { box } from './level.js';
import { rand, randi, clamp } from './util.js';

const matCache = new Map();
const lm = (t) => {
  if (!matCache.has(t.uuid)) matCache.set(t.uuid, new THREE.MeshLambertMaterial({ map: t }));
  return matCache.get(t.uuid);
};
const FLASH = new THREE.MeshBasicMaterial({ color: 0xffffff });
const GLOW = new THREE.MeshBasicMaterial({ color: 0xffa020 });
const GLOW_BOT = new THREE.MeshBasicMaterial({ color: 0xff3020 });
const GUN = new THREE.MeshLambertMaterial({ map: TX.gunMetal() });

export const STATS = {
  grunt: { hp: 3, speed: 1.5, fire: [2.4, 4.0], aim: 0.65, score: 100, dmg: 9, pspeed: 4.6 },
  rusher: { hp: 2, speed: 3.2, score: 120, dmg: 11 },
  guard: { hp: 7, speed: 1.1, fire: [2.8, 4.2], aim: 0.75, burst: 3, score: 220, dmg: 7, pspeed: 5.2 },
  bot: { hp: 4, speed: 2.0, fire: [1.8, 3.0], aim: 0.55, score: 160, dmg: 6, pspeed: 6.4 },
  boss: { hp: 60, speed: 0.9, fire: [1.4, 2.1], aim: 0.8, score: 2500, dmg: 9, pspeed: 4.8 },
};

const tmpV = new THREE.Vector3();

export class Enemy {
  constructor(game, type, spot, opts = {}) {
    this.game = game; this.type = type; this.spot = spot;
    const st = STATS[type];
    const f = game.floorNum;
    this.st = st;
    this.maxHp = this.hp = type === 'boss' ? st.hp + f * 4 : Math.round(st.hp * (1 + f * 0.04) * 10) / 10;
    this.dmg = st.dmg * (1 + f * 0.03);
    this.pspeed = (st.pspeed || 5) * (1 + f * 0.015);
    this.fireMul = Math.max(0.55, 1 - f * 0.025);
    this.meshes = [];
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.scale = type === 'boss' ? 1.55 : 1;
    this.root.scale.setScalar(this.scale);
    if (type === 'bot') this.buildBot(); else this.buildHuman(type);
    this.pos = new THREE.Vector3(spot.x, spot.y || 0, spot.z);
    if (opts.enter) { this.pos.copy(opts.enter); if (type === 'bot') this.pos.y = 2.2; }
    this.state = opts.enter ? 'enter' : 'dormant';
    this.goal = new THREE.Vector3(spot.x, spot.y || 0, spot.z);
    this.timer = 0; this.fireTimer = rand(Math.random, 0.4, 1.4); this.phase = Math.random() * 6;
    this.crouch = spot.cover && type !== 'bot' && type !== 'rusher' ? 1 : 0;
    this.crouchTarget = this.crouch;
    this.flashT = 0; this.stagger = 0; this.aimAmt = 0; this.burstLeft = 0; this.swing = 0;
    this.pattern = 0; this.summoned = 0; this.bob = Math.random() * 6;
    this.root.position.copy(this.pos);
    game.scene.add(this.root);
  }

  part(parent, geo, mat, x, y, z, kind = 'body') {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.userData.enemy = this; m.userData.part = kind; m.userData.mat = mat;
    parent.add(m); this.meshes.push(m);
    return m;
  }

  buildHuman(type) {
    const v = { type, skin: randi(Math.random, 0, 4), hair: randi(Math.random, 0, 5), glasses: Math.random() < 0.3 };
    const side = lm(TX.headSide(v, false)), back = lm(TX.headSide(v, true)), top = lm(TX.hairTop(v));
    const headMats = [side, side, top, side, lm(TX.face(v)), back];
    const tb = lm(TX.torsoBack(type)), tf = lm(TX.torsoFront(type));
    const torsoMats = [tb, tb, tb, tb, tf, tb];
    const armM = lm(TX.arm(type, v.skin)), legM = lm(TX.leg(type));
    const bulk = type === 'guard' ? 1.12 : 1;
    const B = this.body;
    this.legL = new THREE.Group(); this.legL.position.set(-0.11, 0.86, 0); B.add(this.legL);
    this.legR = new THREE.Group(); this.legR.position.set(0.11, 0.86, 0); B.add(this.legR);
    this.part(this.legL, box(0.18, 0.86, 0.2), legM, 0, -0.43, 0);
    this.part(this.legR, box(0.18, 0.86, 0.2), legM, 0, -0.43, 0);
    this.torso = new THREE.Group(); this.torso.position.set(0, 0.86, 0); B.add(this.torso);
    this.part(this.torso, box(0.52 * bulk, 0.62, 0.28 * bulk), torsoMats, 0, 0.31, 0);
    this.neck = new THREE.Group(); this.neck.position.set(0, 0.62, 0); this.torso.add(this.neck);
    this.head = this.part(this.neck, box(0.3, 0.32, 0.3), headMats, 0, 0.17, 0, 'head');
    this.armL = new THREE.Group(); this.armL.position.set(-0.34 * bulk, 0.56, 0); this.torso.add(this.armL);
    this.armR = new THREE.Group(); this.armR.position.set(0.34 * bulk, 0.56, 0); this.torso.add(this.armR);
    this.part(this.armL, box(0.14, 0.62, 0.16), armM, 0, -0.29, 0);
    this.part(this.armR, box(0.14, 0.62, 0.16), armM, 0, -0.29, 0);
    if (type !== 'rusher') {
      const gl = type === 'boss' ? 0.34 : type === 'guard' ? 0.3 : 0.22;
      this.part(this.armR, box(0.07, 0.11, gl), GUN, 0, -0.6, gl / 2 - 0.04);
      this.glow = new THREE.Mesh(box(0.1, 0.1, 0.1), GLOW);
      this.glow.position.set(0, -0.6, gl - 0.02); this.glow.visible = false; this.armR.add(this.glow);
    }
    this.shoulderY = 1.42;
  }

  buildBot() {
    const f = lm(TX.botFace()), s = lm(TX.botSide());
    const mats = [s, s, s, s, f, s];
    const B = this.body;
    this.torso = new THREE.Group(); B.add(this.torso);
    this.head = this.part(this.torso, box(0.56, 0.42, 0.5), mats, 0, 0, 0, 'head');
    this.part(this.torso, box(0.16, 0.12, 0.3), GUN, -0.36, -0.08, 0.05);
    this.part(this.torso, box(0.16, 0.12, 0.3), GUN, 0.36, -0.08, 0.05);
    this.part(this.torso, box(0.04, 0.25, 0.04), GUN, 0.15, 0.32, 0);
    this.part(this.torso, box(0.3, 0.1, 0.3), GUN, 0, -0.26, 0);
    this.glow = new THREE.Mesh(box(0.34, 0.1, 0.05), GLOW_BOT);
    this.glow.position.set(0, 0.03, 0.26); this.glow.visible = false; this.torso.add(this.glow);
    this.shoulderY = 0;
  }

  get alive() { return this.state !== 'dead'; }

  centerWorld(out) {
    out.copy(this.pos);
    out.y += this.type === 'bot' ? 0 : (1.15 - this.crouch * 0.75) * this.scale;
    return out;
  }

  activate() {
    if (this.state !== 'dormant') return;
    if (this.type === 'rusher') { this.state = 'charge'; return; }
    this.state = 'idle';
    this.fireTimer = rand(Math.random, 1.0, 2.4) + (this.type === 'boss' ? 1.2 : 0);
  }

  update(dt) {
    if (this.state === 'dead') return;
    const g = this.game, cam = g.camPos;
    const st = this.st;
    this.phase += dt;
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) this.setFlash(false); }
    this.stagger = Math.max(0, this.stagger - dt * 4);

    let moving = false;
    const moveTo = (goal, speed) => {
      tmpV.subVectors(goal, this.pos); if (this.type !== 'bot') tmpV.y = 0;
      const d = tmpV.length();
      if (d < 0.05) return true;
      this.pos.addScaledVector(tmpV, Math.min(1, (speed * dt) / d)); moving = true;
      return false;
    };

    switch (this.state) {
      case 'dormant': break;
      case 'enter':
        if (moveTo(this.goal, st.speed * 1.4)) { this.state = this.type === 'rusher' ? 'charge' : 'idle'; this.fireTimer = rand(Math.random, 0.3, 1.0); }
        break;
      case 'idle': {
        if (this.type === 'bot') {
          if (moveTo(this.goal, st.speed)) this.pickGoal();
        } else if (!this.spot.cover && this.type !== 'rusher') {
          if (!moveTo(this.goal, st.speed)) { /* strafing */ } else if (Math.random() < dt * 0.6) this.pickGoal();
        }
        this.fireTimer -= dt;
        if (this.fireTimer <= 0 && g.combatActive) {
          this.crouchTarget = 0;
          this.state = this.crouch > 0.05 ? 'rise' : 'aim';
          this.timer = this.state === 'rise' ? 0.3 : st.aim;
          if (this.state === 'aim') g.sfx.telegraph();
        }
        break;
      }
      case 'rise':
        this.timer -= dt;
        if (this.timer <= 0) { this.state = 'aim'; this.timer = st.aim; g.sfx.telegraph(); }
        break;
      case 'aim':
        this.timer -= dt; this.aimAmt = Math.min(1, this.aimAmt + dt * 5);
        if (this.glow) { this.glow.visible = Math.floor(this.timer * 18) % 2 === 0; this.glow.scale.setScalar(1 + (1 - this.timer / st.aim) * 1.2); }
        if (this.timer <= 0) {
          if (this.type === 'boss') this.bossAttack();
          else { this.burstLeft = (st.burst || 1) - 1; this.shoot(); }
          this.state = this.burstLeft > 0 ? 'burst' : 'recover'; this.timer = this.burstLeft > 0 ? 0.2 : 0.45;
        }
        break;
      case 'burst':
        this.timer -= dt;
        if (this.timer <= 0) { this.shoot(); this.burstLeft--; this.timer = this.burstLeft > 0 ? 0.2 : 0.45; if (this.burstLeft <= 0) this.state = 'recover'; }
        break;
      case 'recover':
        this.timer -= dt; this.aimAmt = Math.max(0, this.aimAmt - dt * 3);
        if (this.timer <= 0) {
          this.state = 'idle';
          const [a, b] = st.fire; this.fireTimer = rand(Math.random, a, b) * this.fireMul;
          if (this.spot.cover && Math.random() < 0.7) this.crouchTarget = 1;
          if (this.type !== 'bot') this.pickGoal();
        }
        break;
      case 'charge': {
        const goal = tmpV.set(cam.x, 0, cam.z - 1.3).clone();
        if (moveTo(goal, st.speed * (1 + g.floorNum * 0.02))) { this.state = 'melee'; this.timer = 0.35; this.swing = 0; }
        break;
      }
      case 'melee':
        this.timer -= dt; this.swing += dt;
        if (this.timer <= 0) {
          g.sfx.swing(); g.hurtPlayer(this.dmg, this);
          this.timer = 1.05;
        }
        break;
    }

    // crouch & posture
    this.crouch += (this.crouchTarget - this.crouch) * Math.min(1, dt * 10);
    if (this.type === 'bot') {
      this.bob += dt * 3;
      this.root.position.set(this.pos.x, this.pos.y + Math.sin(this.bob) * 0.08, this.pos.z);
      this.torso.rotation.z = Math.sin(this.bob * 0.7) * 0.15;
      this.torso.rotation.x = -this.stagger * 0.5;
    } else {
      this.root.position.copy(this.pos);
      this.body.position.y = -this.crouch * 0.75;
      const w = moving ? Math.sin(this.phase * (this.type === 'rusher' ? 14 : 9)) : 0;
      this.legL.rotation.x = w * 0.7; this.legR.rotation.x = -w * 0.7;
      const pitch = Math.atan2(cam.y - (this.shoulderY * this.scale - this.crouch * 0.75), Math.hypot(cam.x - this.pos.x, cam.z - this.pos.z));
      if (this.type === 'rusher') {
        const sw = this.state === 'melee' ? Math.sin(this.swing * 6) : 0;
        this.armL.rotation.x = -1.2 + w * 0.4 + sw * 0.9;
        this.armR.rotation.x = -1.2 - w * 0.4 - sw * 0.9;
        this.torso.rotation.x = 0.35 - this.stagger * 0.6;
      } else {
        const aim = this.state === 'aim' || this.state === 'burst' ? 1 : this.aimAmt;
        this.armR.rotation.x = (-w * 0.5) * (1 - aim) + (-Math.PI / 2 - pitch) * aim;
        this.armL.rotation.x = w * 0.5 * (1 - aim) + -0.4 * aim;
        this.armL.rotation.z = 0.25 * aim;
        this.torso.rotation.x = -this.stagger * 0.5;
      }
      this.neck.rotation.x = -pitch * 0.5;
    }
    this.root.rotation.y = Math.atan2(cam.x - this.pos.x, cam.z - this.pos.z) + (this.type === 'bot' ? 0 : Math.sin(this.phase * 0.8) * 0.05);
  }

  pickGoal() {
    if (this.type === 'bot') {
      const r = this.game.room;
      this.goal.set(rand(Math.random, -2.2, 2.2), rand(Math.random, 1.7, 2.5), r.z0 - rand(Math.random, 5, 10.5));
      return;
    }
    if (this.spot.cover || this.type === 'rusher') { this.goal.set(this.spot.x, 0, this.spot.z); return; }
    const lim = this.type === 'boss' ? 1.8 : 2.6;
    this.goal.set(clamp(this.spot.x + rand(Math.random, -1.4, 1.4), -lim, lim), 0, this.spot.z + rand(Math.random, -0.6, 0.6));
  }

  muzzle(out) {
    this.root.updateMatrixWorld(true);
    if (this.glow) this.glow.getWorldPosition(out); else this.centerWorld(out);
    return out;
  }

  shoot(spread = 0, offset = 0) {
    const g = this.game;
    const from = this.muzzle(new THREE.Vector3());
    const target = g.camPos.clone();
    const miss = this.type === 'bot' ? 0.35 : 0.4;
    target.x += rand(Math.random, -miss, miss) + offset; target.y += rand(Math.random, -miss * 0.6, miss * 0.4);
    if (spread) { const dir = target.clone().sub(from); dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), spread); target.copy(from).add(dir); }
    g.spawnProjectile(from, target, this.pspeed, this.dmg, this.type === 'bot' ? 'bolt' : this.type === 'boss' ? 'big' : 'orb');
    g.sfx.enemyShot();
    if (this.glow) this.glow.visible = false;
  }

  bossAttack() {
    const g = this.game;
    const p = this.pattern++ % 4;
    if (p === 0 || p === 2) { for (let k = -2; k <= 2; k++) this.shoot(k * 0.09); }
    else if (p === 1) { this.burstLeft = 2; this.shoot(); }
    else {
      const frac = this.hp / this.maxHp;
      if (this.summoned < 3 && frac < 1 - (this.summoned + 1) * 0.25) { this.summoned++; g.spawnReinforcement('grunt'); g.spawnReinforcement(g.floorNum >= 10 ? 'guard' : 'rusher'); }
      else for (let k = -1; k <= 1; k++) this.shoot(k * 0.14);
    }
  }

  setFlash(on) {
    for (const m of this.meshes) m.material = on ? FLASH : m.userData.mat;
  }

  damage(amount, part, point) {
    if (this.state === 'dead' || this.state === 'enter' && this.type === 'boss') return false;
    const head = part === 'head' && this.type !== 'bot';
    const mult = head ? (this.type === 'boss' ? 2 : 3) : 1;
    this.hp -= amount * mult;
    this.flashT = 0.07; this.setFlash(true); this.stagger = 1;
    const g = this.game;
    if (this.type === 'bot') g.fx.sparks(point, 6); else g.fx.blood(point, head ? 10 : 6);
    if (this.hp <= 0) { this.die(head, point); return true; }
    if (this.state === 'dormant') this.activate();
    if (this.type === 'grunt' && (this.state === 'aim' || this.state === 'rise')) {
      this.state = 'recover'; this.timer = 0.3; if (this.glow) this.glow.visible = false;
    }
    if (this.type === 'rusher' && this.state === 'charge') this.pos.z -= 0.25;
    return head ? 'head' : 'body';
  }

  die(headshot, point) {
    this.state = 'dead';
    const g = this.game;
    this.setFlash(false);
    if (this.glow) this.glow.visible = false;
    this.root.updateMatrixWorld(true);
    const center = this.centerWorld(new THREE.Vector3());
    for (const m of this.meshes) {
      g.scene.attach(m);
      const vel = m.getWorldPosition(new THREE.Vector3()).sub(center).setY(0).normalize().multiplyScalar(rand(Math.random, 1, 3));
      vel.y = rand(Math.random, 2, 4.5);
      if (point) vel.add(tmpV.subVectors(center, g.camPos).setY(0).normalize().multiplyScalar(2));
      if (headshot && m === this.head) vel.y += 3;
      g.fx.debris(m, vel);
    }
    if (this.type === 'bot') { g.fx.sparks(center, 24); g.sfx.botDeath(); }
    else { g.fx.blood(center, 22); g.sfx.death(); }
    g.scene.remove(this.root);
    g.onEnemyKilled(this, headshot);
  }

  remove() { this.game.scene.remove(this.root); for (const m of this.meshes) if (m.parent) m.parent.remove(m); }
}

// ---------------------------------------------------------------- projectiles
const ORB_GEO = new THREE.IcosahedronGeometry(0.09, 0);
const BIG_GEO = new THREE.IcosahedronGeometry(0.17, 0);
const BOLT_GEO = new THREE.BoxGeometry(0.07, 0.07, 0.35);
const ORB_M = new THREE.MeshBasicMaterial({ color: 0xff8a1a });
const ORB_CORE = new THREE.MeshBasicMaterial({ color: 0xfff0a0 });
const BIG_M = new THREE.MeshBasicMaterial({ color: 0xd030ff });
const BOLT_M = new THREE.MeshBasicMaterial({ color: 0x40e0ff });

export class Projectile {
  constructor(game, from, target, speed, dmg, kind) {
    this.game = game; this.dmg = dmg; this.kind = kind; this.alive = true; this.life = 0;
    const geo = kind === 'bolt' ? BOLT_GEO : kind === 'big' ? BIG_GEO : ORB_GEO;
    this.mesh = new THREE.Mesh(geo, kind === 'bolt' ? BOLT_M : kind === 'big' ? BIG_M : ORB_M);
    if (kind !== 'bolt') { const core = new THREE.Mesh(geo, ORB_CORE); core.scale.setScalar(0.55); this.mesh.add(core); }
    this.mesh.position.copy(from);
    this.vel = target.clone().sub(from).normalize().multiplyScalar(speed);
    if (kind === 'bolt') this.mesh.lookAt(target);
    game.scene.add(this.mesh);
  }
  update(dt) {
    this.life += dt;
    this.mesh.position.addScaledVector(this.vel, dt);
    if (this.kind !== 'bolt') { this.mesh.rotation.x += dt * 9; this.mesh.rotation.y += dt * 7; this.mesh.scale.setScalar(1 + Math.sin(this.life * 30) * 0.12); }
    const cam = this.game.camPos;
    if (this.mesh.position.distanceTo(cam) < 0.42) { this.game.hurtPlayer(this.dmg, null); this.kill(); return; }
    if (this.mesh.position.z > cam.z + 0.5 || this.life > 7) this.kill();
  }
  kill() { this.alive = false; this.game.scene.remove(this.mesh); }
}
