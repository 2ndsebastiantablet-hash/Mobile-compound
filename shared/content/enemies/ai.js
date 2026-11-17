// Generic, data-driven enemy: body from models.js, behaviour from roster.js.
import * as THREE from '../../vendor/three.module.min.js';
import { DEFS, isFlyer, rosterFor } from './roster.js';
import { BUILDERS } from './models.js';
import { BossBrain } from '../bosses/bosses.js';
import { rand, clamp, pick } from '../../engine/util.js';
import * as TX from '../../engine/textures.js';

const FLASH = new THREE.MeshBasicMaterial({ color: 0xffffff });
const CLOAK = new THREE.MeshBasicMaterial({ color: 0x8090a0, transparent: true, opacity: 0.12, depthWrite: false });
const REFL = new THREE.MeshBasicMaterial({ color: 0xff2a20 });
const PHASE = new THREE.MeshBasicMaterial({ color: 0x80c0ff, transparent: true, opacity: 0.35, depthWrite: false });
const ROBOT = new Set(['drone', 'mech', 'turret', 'tank', 'swarm']);
const tmpV = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export { DEFS };

export class Enemy {
  constructor(game, type, spot, opts = {}) {
    const def = DEFS[type];
    this.game = game; this.type = type; this.def = def; this.st = def; this.spot = spot;
    const f = game.diff || game.floorNum; // difficulty curve flattens above floor 20
    this.traits = def.traits || {};
    this.maxHp = this.hp = def.brain ? def.hp : def.boss ? def.hp + f * 4 : Math.round(def.hp * (1 + f * 0.025) * 10) / 10;
    const dd = game.dd || {}; // difficulty mode
    const late = Math.max(0, f - 20); // past floor 20 a full perk set made enemies trivial
    this.maxHp = this.hp = Math.round(this.hp * (dd.hp || 1) * (def.brain ? 1 + late * 0.012 : 1 + late * 0.03) * 10) / 10;
    if (game.mod === 'headcount') this.maxHp = this.hp = Math.round(this.hp * 0.7 * 10) / 10;
    if (game.mod === 'onehit') this.maxHp = this.hp = def.boss ? Math.round(this.hp * 0.25) : 0.1;
    if (opts.decoy) this.maxHp = this.hp = 1;
    this.decoy = !!opts.decoy; this.yawExtra = 0;
    this.dmg = def.dmg * (1 + f * 0.015) * (1 + late * 0.015); // balance pass: was 3% per floor, far too steep past floor 10
    this.pspeed = 4.6 * (1 + f * 0.015) * (dd.proj || 1);
    this.fireMul = Math.max(0.72, 1 - f * 0.014) * (dd.fire || 1);
    this.shieldHp = this.traits.shield || 0;
    this.scale = def.scale || 1;
    const mk = def.model.kind, ms = def.model.style;
    this.gore = ROBOT.has(mk) || (mk === 'spider') || (mk === 'quad' && (ms === 'robot' || ms === 'hound')) || (mk === 'floater' && ms === 'wraith') ? 'spark'
      : mk === 'blob' ? 'goo' : (mk === 'human' && def.model.outfit === 'glitch') ? 'spark' : 'blood';
    this.flyer = isFlyer(type);
    this.meshes = [];
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.root.scale.setScalar(this.scale);
    this.phase = Math.random() * 6; this.bob = Math.random() * 6;
    this.flashT = 0; this.stagger = 0; this.aimAmt = 0; this.swingT = 0; this.crouch = 0; this.crouchTarget = 0;
    this.centerY = 1.15; this.shoulderY = 1.42;
    BUILDERS[mk](this, def.model);
    if (game.mod === 'bigheads' && this.head && this.head.userData.part === 'head') this.head.scale.multiplyScalar(1.9); // daily twist
    this.hover = this.traits.hover || 0;
    this.yOff = this.flyer && mk === 'human' ? -1.3 : 0; // jetpack humans: flight height is measured at the chest
    this.pos = new THREE.Vector3(spot.x, this.flyer ? (spot.y || 2.1) : this.hover, spot.z);
    if (opts.enter) { this.pos.copy(opts.enter); this.pos.y = this.flyer ? 2.2 : this.hover; }
    if (opts.at) this.pos.copy(opts.at).setY(this.flyer ? Math.max(1.6, opts.at.y) : this.hover);
    this.goal = new THREE.Vector3(spot.x, this.flyer ? (spot.y || 2.1) : this.hover, spot.z);
    this.state = opts.enter ? 'enter' : opts.active ? 'active' : 'dormant';
    this.atkIdx = 0; this.atkState = 'cool'; this.atkT = rand(Math.random, 1.0, 2.2); this.timer = 0; this.burstLeft = 0; this.burstGap = 0.18;
    this.meleeT = 0.6; this.blinkT = rand(Math.random, 2, 3.5); this.hopT = 0.3; this.leap = null;
    this.burrow = def.move === 'burrow' ? { phase: 'up', t: 2.4 } : null;
    this.burrowY = 0;
    this.cloak = this.traits.cloak ? { on: false, t: rand(Math.random, 1.5, 2.5) } : null;
    this.orbitA = Math.random() * 6.28;
    this.lastHit = -10; this.dive = null;
    this.peekGoal = new THREE.Vector3();
    if (def.move === 'stand' && spot.cover && !def.nocover && !spot.peek) this.crouch = this.crouchTarget = 1;
    if (def.brain && !opts.decoy) this.brain = new BossBrain(this);
    this.place();
    game.scene.add(this.root);
  }

  part(parent, geo, mat, x, y, z, kind = 'body') {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.userData.enemy = this; m.userData.part = kind; m.userData.mat = mat;
    parent.add(m); this.meshes.push(m);
    return m;
  }

  get alive() { return this.state !== 'dead'; }
  get targetable() {
    return this.alive && this.state !== 'dormant' && !(this.cloak && this.cloak.on)
      && !(this.burrow && (this.burrow.phase === 'under' || this.burrow.phase === 'sinking'));
  }

  centerWorld(out) {
    out.copy(this.pos);
    out.y += (this.centerY - this.crouch * 0.75) * this.scale + this.burrowY + this.yOff + (this.leap ? this.leap.y : 0);
    return out;
  }

  activate() {
    if (this.state !== 'dormant') return;
    this.state = 'active';
    this.atkT = rand(Math.random, 1.0, 2.4) + (this.def.boss ? 1.2 : 0);
  }

  // ------------------------------------------------------------------ update
  update(dt) {
    if (this.state === 'dead') return;
    const g = this.game, def = this.def, T = this.traits;
    this.phase += dt; this.bob += dt * 3;
    this.lastHit += dt;
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) this.applyMats(); }
    this.stagger = Math.max(0, this.stagger - dt * 4);
    this.kick = Math.max(0, (this.kick || 0) - dt * 1.6);
    this.swingT = Math.max(0, this.swingT - dt);
    if (this.burnT > 0) {
      this.burnT -= dt; this.burnTick = (this.burnTick || 0) - dt;
      if (this.burnTick <= 0) {
        this.burnTick = 0.35;
        const c = this.centerWorld(new THREE.Vector3());
        g.fx.fire(c, 4);
        if (this.state !== 'dormant') { this.damage(this.burnDps * 0.35, 'body', c, true); if (this.state === 'dead') return; }
      }
    }
    if (this.slowT > 0) { this.slowT -= dt; if (Math.random() < dt * 8) g.fx.ice(this.centerWorld(new THREE.Vector3()), 1); dt *= 0.35; }
    if ((T.reflect || T.phase) && this.state === 'active') {
      // periodic stance: reflect (shots bounce back at you) / phase (intangible)
      this.stanceT = (this.stanceT ?? rand(Math.random, 1.5, 3)) - dt;
      if (this.stanceT <= 0) {
        this.stanceOn = !this.stanceOn; this.stanceT = this.stanceOn ? 1.6 : rand(Math.random, 2.4, 3.6);
        if (this.stanceOn) g.sfx.zap();
        this.applyMats();
      }
    }
    if (T.enrage && !this.enraged && this.hp < this.maxHp * 0.5) { this.enraged = true; this.fireMul *= 0.55; g.fx.fire(this.centerWorld(new THREE.Vector3()), 10); }
    if (this.enraged) dt *= 1.4;
    if (T.regen && this.lastHit > 2 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + T.regen * dt);
    if (this.cloak && this.state === 'active' && !this.brain) {
      this.cloak.t -= dt;
      const near = this.pos.distanceTo(g.camPos) < 2.8;
      if (this.cloak.t <= 0 || (this.cloak.on && near)) {
        this.cloak.on = !this.cloak.on && !near;
        this.cloak.t = this.cloak.on ? rand(Math.random, 1.8, 2.6) : rand(Math.random, 2.2, 3.2);
        g.fx.sparks(this.centerWorld(new THREE.Vector3()), 6); g.sfx.zap();
        this.applyMats();
      }
    }

    this.moving = false;
    if (this.state === 'enter') {
      if (this.moveTo(this.goal, def.speed * 1.4, dt)) { this.state = 'active'; this.atkT = rand(Math.random, 0.3, 1.0); }
    } else if (this.state === 'active') {
      if (this.brain) this.brain.update(dt);
      else { this.updateMove(dt); if (this.state === 'dead') return; this.updateAttack(dt); }
      if (this.decoy && Math.random() < dt * 1.5) { this.flashT = 0.06; for (const m of this.meshes) m.material = CLOAK; }
    }
    this.crouch += (this.crouchTarget - this.crouch) * Math.min(1, dt * 10);
    this.place();
    if (this.anim) this.anim(dt, this.moving);
  }

  place() {
    const cam = this.game.playerPos || this.game.camPos;
    if (this.flyer || this.hover) this.root.position.set(this.pos.x, this.pos.y + this.yOff + Math.sin(this.bob) * 0.08, this.pos.z);
    else this.root.position.copy(this.pos);
    this.body.position.z = -(this.kick || 0) / this.scale; // hit knockback (visual)
    this.body.position.y = -this.crouch * 0.75 + this.burrowY / this.scale + (this.leap ? this.leap.y / this.scale : 0);
    this.root.rotation.y = Math.atan2(cam.x - this.pos.x, cam.z - this.pos.z) + (this.yawExtra || 0);
  }

  moveTo(goal, speed, dt) {
    tmpV.subVectors(goal, this.pos);
    if (!this.flyer) tmpV.y = 0;
    const d = tmpV.length();
    if (d < 0.05) return true;
    this.pos.addScaledVector(tmpV, Math.min(1, (speed * dt) / d)); this.moving = true;
    return false;
  }

  roomZ() { const r = this.game.room; return r ? [r.zf + 0.8, r.z0 - 3.5] : [-100, 100]; }

  pickGoal() {
    const def = this.def;
    if (this.flyer) {
      const r = this.game.room;
      this.goal.set(rand(Math.random, -2.2, 2.2), rand(Math.random, 1.7, 2.5), r.z0 - rand(Math.random, 5, 10.5));
      return;
    }
    if (def.move === 'stand' && this.spot.cover && !def.nocover) { this.goal.set(this.spot.x, 0, this.spot.z); return; }
    const lim = def.boss ? 1.8 : 2.5, wide = def.move === 'strafe' ? 2.2 : 1.4;
    const [zmin, zmax] = this.roomZ();
    this.goal.set(clamp(this.spot.x + rand(Math.random, -wide, wide), -lim, lim), this.hover, clamp(this.spot.z + rand(Math.random, -1, 1), zmin, zmax));
  }

  // low critters stop further away so they stay above the HUD and stay tappable
  meleeTarget() { const c = this.game.camPos; const low = !this.hover && this.centerY * this.scale < 0.7; return new THREE.Vector3(c.x, this.hover, c.z - (low ? (this.game.lowReach || 2.1) : 1.3)); }

  doMelee(dt) {
    this.meleeT -= dt;
    if (this.meleeT <= 0) {
      if (this.cloak && this.cloak.on) { this.cloak.on = false; this.applyMats(); }
      this.swingT = 0.3; this.game.sfx.swing();
      if (this.ally) { const f = this.nearestFoe(); if (f && f.pos.distanceTo(this.pos) < 2) f.damage(this.dmg * 0.6, 'body', f.centerWorld(new THREE.Vector3())); }
      else this.game.hurtPlayer(this.dmg, this);
      if (this.traits.leech) this.hp = Math.min(this.maxHp, this.hp + 2);
      this.meleeT = 1.35;
    }
  }

  updateMove(dt) {
    const g = this.game, def = this.def, sp = def.speed * (1 + (g.diff || g.floorNum) * 0.015);
    const planted = this.atkState === 'wind' || this.atkState === 'burst';
    switch (def.move) {
      case 'stand':
        if (this.spot.peek && this.spot.cover && !def.nocover) {
          // behind a pillar/shelf: hide fully, step out into the open to attack, then step back
          const out = this.atkState !== 'cool';
          this.moveTo(this.peekGoal.set(this.spot.x + (out ? this.spot.peek : 0), this.hover, this.spot.z), 4.5, dt);
          break;
        }
        if (!planted && (!this.spot.cover || def.nocover)) { if (this.moveTo(this.goal, sp, dt) && Math.random() < dt * 0.6) this.pickGoal(); }
        break;
      case 'strafe': case 'boss': case 'fly':
        if (!planted && this.moveTo(this.goal, sp, dt)) this.pickGoal();
        break;
      case 'turret': break;
      case 'orbit': {
        const c = this.spot;
        this.orbitA += dt * sp / 1.4;
        this.pos.set(c.x * 0.5 + Math.cos(this.orbitA) * 1.5, (c.y || 2.1) + Math.sin(this.orbitA * 2) * 0.25, c.z + Math.sin(this.orbitA) * 0.9);
        this.moving = true;
        break;
      }
      case 'charge': case 'crawl': {
        const t = this.meleeTarget();
        if (def.move === 'crawl' && this.pos.distanceTo(t) > 2) t.x += Math.sin(this.phase * 2.5) * 1.2;
        if (this.moveTo(t, sp, dt) || this.pos.distanceTo(this.meleeTarget()) < 0.3) this.doMelee(dt);
        break;
      }
      case 'leap': {
        const t = this.meleeTarget();
        if (this.leap) {
          this.leap.k += dt / this.leap.dur;
          const k = Math.min(1, this.leap.k);
          this.pos.lerpVectors(this.leap.from, this.leap.to, k); this.leap.y = Math.sin(k * Math.PI) * 0.9;
          this.moving = true;
          if (k >= 1) { this.leap = null; this.hopT = rand(Math.random, 0.35, 0.8); g.fx.dust(this.pos.clone().setY(0.05), 4); }
        } else if (this.pos.distanceTo(t) < 0.4) this.doMelee(dt);
        else {
          this.hopT -= dt;
          if (this.hopT <= 0) {
            const to = this.pos.clone().add(tmpV.subVectors(t, this.pos).setY(0).clampLength(0, 2.6));
            this.leap = { from: this.pos.clone(), to, k: 0, dur: 0.55, y: 0 };
          }
        }
        break;
      }
      case 'dive': {
        if (this.dive) {
          tmpV.subVectors(g.camPos, this.pos);
          const d = tmpV.length();
          this.pos.addScaledVector(tmpV, Math.min(1, (7 * dt) / d)); this.moving = true;
          if (this.glow) this.glow.visible = Math.floor(this.phase * 20) % 2 === 0;
          if (d < 0.7) { g.hurtPlayer(this.traits.kamikaze || this.dmg, this); this.die(false, null, true); }
          return;
        }
        if (this.atkState === 'cool' && this.moveTo(this.goal, sp, dt)) this.pickGoal();
        break;
      }
      case 'blink':
        if (this.atkState === 'cool') {
          this.blinkT -= dt;
          if (this.blinkT <= 0 && g.combatActive) {
            g.fx.sparks(this.centerWorld(new THREE.Vector3()), 10);
            const s = g.randomSpot(this);
            this.pos.set(s.x, 0, s.z); this.goal.copy(this.pos); this.spot = s;
            g.fx.sparks(this.centerWorld(new THREE.Vector3()), 10); g.fx.pop(this.centerWorld(new THREE.Vector3())); g.sfx.zap();
            this.blinkT = rand(Math.random, 2.5, 4); this.atkT = Math.min(this.atkT, 0.35);
          }
        }
        break;
      case 'burrow': {
        const b = this.burrow;
        b.t -= dt;
        if (b.phase === 'up') { if (b.t <= 0 && this.atkState === 'cool') { b.phase = 'sinking'; b.t = 0.5; } }
        else if (b.phase === 'sinking') { this.burrowY = -2 * (1 - Math.max(0, b.t) / 0.5); if (b.t <= 0) { b.phase = 'under'; b.t = 1.2; const s = g.randomSpot(this); this.goal.set(s.x, 0, s.z); g.fx.dust(this.pos.clone().setY(0.05), 8); } }
        else if (b.phase === 'under') { this.burrowY = -2; this.moveTo(this.goal, 4, dt); this.moving = false; if (b.t <= 0) { b.phase = 'rising'; b.t = 0.5; g.fx.dust(this.pos.clone().setY(0.05), 10); } }
        else if (b.phase === 'rising') { this.burrowY = -2 * (Math.max(0, b.t) / 0.5); if (b.t <= 0) { b.phase = 'up'; b.t = 2.4; this.burrowY = 0; this.atkT = rand(Math.random, 0.3, 0.7); } }
        break;
      }
    }
  }

  // ------------------------------------------------------------------ attacks
  curAtk() { if (this.atkOverride) return this.atkOverride; const a = this.def.atk; return Array.isArray(a) ? a[this.atkIdx % a.length] : a; }

  canAttack() {
    if (!this.game.combatActive) return false;
    if (this.cloak && this.cloak.on) return false;
    if (this.burrow && this.burrow.phase !== 'up') return false;
    // don't shoot through a teammate: hold fire and step aside for a clear line
    const atk = this.curAtk && this.curAtk();
    if (atk && DIRECT.has(atk.type) && !this.ally && this.lineBlocked()) {
      this.blockedT = (this.blockedT || 0) + 0.5;
      if (this.blockedT < 5) { // after ~5s of waiting they lose patience and fire anyway
        this.atkT = 0.5;
        if (this.def.move !== 'turret' && !(this.spot && this.spot.cover && this.def.move === 'stand')) {
          const side = this.pos.x > (this.game.camPos.x) ? 1 : -1;
          this.goal.set(clamp(this.pos.x + side * rand(Math.random, 0.8, 1.6), -2.8, 2.8), this.goal.y, this.goal.z);
          if (this.def.move === 'stand') { this.spot = { ...this.spot, x: this.goal.x }; }
        }
        return false;
      }
    }
    this.blockedT = 0;
    return true;
  }

  nearestFoe() {
    let best = null, bd = 1e9;
    for (const o of this.game.enemies) { if (o === this || !o.alive || o.ally || o.off || o.state === 'dormant') continue; const d = o.pos.distanceTo(this.pos); if (d < bd) { bd = d; best = o; } }
    return best;
  }

  // is another enemy standing between this one and the player?
  lineBlocked() {
    const g = this.game, from = this.muzzle(new THREE.Vector3()), to = (g.playerPos || g.camPos);
    const seg = tmpV.subVectors(to, from), len = seg.length(); seg.normalize();
    for (const o of g.enemies) {
      if (o === this || !o.alive || o.state === 'dormant' || o.off) continue;
      const c = o.centerWorld(new THREE.Vector3());
      const t = c.clone().sub(from).dot(seg);
      if (t < 0.3 || t > len - 0.6) continue;
      const d = c.distanceTo(from.clone().addScaledVector(seg, t));
      if (d < 0.38 * o.scale + 0.15) return true;
    }
    return false;
  }

  updateAttack(dt) {
    const def = this.def, g = this.game;
    if (def.move === 'dive') {
      if (this.dive) return;
      if (this.atkState === 'cool') { this.atkT -= dt; if (this.atkT <= 0 && this.canAttack()) { this.atkState = 'wind'; this.timer = def.wind; g.sfx.telegraph(); } }
      else if (this.atkState === 'wind') { this.timer -= dt; if (this.glow) this.glow.visible = Math.floor(this.timer * 18) % 2 === 0; if (this.timer <= 0) this.dive = true; }
      return;
    }
    if (!def.atk && !this.atkOverride) return;
    const atk = this.curAtk();
    switch (this.atkState) {
      case 'cool':
        this.atkT -= dt;
        if (this.atkT <= 0 && this.canAttack()) {
          this.crouchTarget = 0;
          if (this.spot.peek && this.spot.cover && !def.nocover) { this.atkState = 'rise'; this.timer = 0.38; }
          else if (this.crouch > 0.05) { this.atkState = 'rise'; this.timer = 0.3; } else this.startWind();
        }
        break;
      case 'rise':
        this.timer -= dt; if (this.timer <= 0) this.startWind();
        break;
      case 'wind':
        this.timer -= dt; this.aimAmt = Math.min(1, this.aimAmt + dt * 5);
        if (this.glow) { this.glow.visible = Math.floor(this.timer * 18) % 2 === 0; this.glow.scale.setScalar(1 + (1 - this.timer / this.windDur) * 1.4); }
        if (atk.type === 'laser') {
          const k = 1 - this.timer / this.windDur;
          g.fx.beam(this.muzzle(new THREE.Vector3()), g.camPos.clone().add(new THREE.Vector3(0, -0.12, 0)), 0xff2010, 0.008 + k * 0.03, 0.04);
        }
        if (this.timer <= 0) {
          this.execute(atk);
          if (this.state === 'dead') return;
          this.atkState = this.burstLeft > 0 ? 'burst' : 'recover'; this.timer = this.burstLeft > 0 ? this.burstGap : 0.45;
        }
        break;
      case 'burst':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.shoot(atk.kind || (atk.type === 'rapid' ? 'shard' : atk.type === 'boss' ? 'big' : 'orb'), 0, atk.type === 'rapid' && this.burstAtk ? this.burstAtk : atk);
          this.burstLeft--; this.timer = this.burstLeft > 0 ? this.burstGap : 0.45;
          if (this.burstLeft <= 0) this.atkState = 'recover';
        }
        break;
      case 'recover':
        this.timer -= dt; this.aimAmt = Math.max(0, this.aimAmt - dt * 3);
        if (this.timer <= 0) {
          this.atkState = 'cool';
          const [a, b] = def.fire; this.atkT = rand(Math.random, a, b) * this.fireMul;
          this.atkIdx++;
          if (def.move === 'stand' && this.spot.cover && !def.nocover && !this.spot.peek && Math.random() < 0.7) this.crouchTarget = 1;
          if (!this.flyer && def.move !== 'turret') this.pickGoal();
          if (this.burrow && this.burrow.phase === 'up') this.burrow.t = Math.min(this.burrow.t, 0.4);
        }
        break;
    }
  }

  startWind() {
    this.atkState = 'wind';
    this.windDur = this.timer = this.def.wind || 0.6;
    this.game.sfx.telegraph();
  }

  interrupt() {
    if (this.atkState === 'wind' || this.atkState === 'rise') {
      this.atkState = 'recover'; this.timer = 0.3; if (this.glow) this.glow.visible = false;
      return true;
    }
    return false;
  }

  muzzle(out) {
    this.root.updateMatrixWorld(true);
    if (this.glow) this.glow.getWorldPosition(out); else this.centerWorld(out);
    return out;
  }

  execute(atk) {
    const g = this.game, kind = atk.kind || 'orb';
    this.burstLeft = 0; this.burstGap = 0.18;
    switch (atk.type) {
      case 'shot': this.shoot(kind, 0, atk); break;
      case 'burst': this.burstLeft = (atk.n || 3) - 1; this.shoot(kind, 0, atk); break;
      case 'rapid': { this.burstLeft = (atk.n || 6) - 1; this.burstGap = 0.13; this.burstAtk = { ...atk, dmg: (atk.dmg || 1) * Math.min(1, 5 / (atk.n || 6)) }; this.shoot(atk.kind || 'shard', 0, this.burstAtk); break; }
      case 'spread': { const n = atk.n || 3, a = atk.angle || 0.12, sa = { ...atk, dmg: (atk.dmg || 1) * (n >= 3 ? 0.7 : 1) }; for (let k = 0; k < n; k++) this.shoot(kind, (k - (n - 1) / 2) * a, sa); break; }
      case 'lob': { const n = atk.n || 1; for (let k = 0; k < n; k++) this.shoot(kind, (k - (n - 1) / 2) * 0.15, { ...atk, lob: true }); break; }
      case 'homing': { const n = atk.n || 1; for (let k = 0; k < n; k++) this.shoot(kind === 'orb' ? 'missile' : kind, (k - (n - 1) / 2) * 0.5, { ...atk, homing: true }); break; }
      case 'sonic': { const n = atk.n || 5; for (let k = 0; k < n; k++) this.shoot('sonic', (k - (n - 1) / 2) * 0.13, atk); g.sfx.rail(); break; }
      case 'laser': {
        g.fx.beam(this.muzzle(new THREE.Vector3()), g.camPos.clone().add(new THREE.Vector3(0, -0.15, 0)), 0xff3020, 0.09, 0.22);
        g.sfx.rail();
        if (this.ally) { const f = this.nearestFoe(); if (f) f.damage(this.dmg * 0.5, 'body', f.centerWorld(new THREE.Vector3())); }
        else if (!(g.duck > 0.5)) g.hurtPlayer(this.dmg * 0.75, this); // ducking under a laser dodges it // can't be shot down, so lasers hit a bit softer
        break;
      }
      case 'summon': {
        g.fx.pop(this.muzzle(new THREE.Vector3())); g.sfx.zap();
        g.spawnMinion(atk.minion, this.pos, atk.n || 1);
        break;
      }
      case 'heal': {
        const from = this.muzzle(new THREE.Vector3());
        let healed = 0;
        for (const o of g.enemies) {
          if (o === this || !o.alive || o.hp >= o.maxHp || o.pos.distanceTo(this.pos) > 7) continue;
          o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.4);
          g.fx.lightning(from, o.centerWorld(new THREE.Vector3()), 0x60ff60); healed++;
        }
        if (healed) g.sfx.pickup(); else this.shoot('orb', 0, atk);
        break;
      }
      case 'boss': this.bossAttack(); break;
      case 'bombs': { const from = this.muzzle(new THREE.Vector3()); const n = atk.n || 1; for (let k = 0; k < n; k++) g.spawnBomb(from, k, n, atk.kind || 'bomb', this.dmg); g.sfx.launcher(); break; }
      case 'mines': {
        const from = this.muzzle(new THREE.Vector3());
        for (let k = 0; k < (atk.n || 2); k++) g.spawnProjectile(from, new THREE.Vector3(rand(Math.random, -2, 2), rand(Math.random, 1.1, 2.4), g.camPos.z - rand(Math.random, 3.5, 6)), 3.5, this.dmg, 'mine', { mine: 1.3 + k * 0.4 });
        break;
      }
      case 'rain': {
        for (let k = 0; k < (atk.n || 3); k++) {
          const from = new THREE.Vector3(rand(Math.random, -2.2, 2.2), 2.85, g.camPos.z - rand(Math.random, 3.5, 6.5));
          g.spawnProjectile(from, g.camPos.clone().add(new THREE.Vector3(rand(Math.random, -0.5, 0.5), -0.2, 0)), this.pspeed * 0.55, this.dmg, kind, { delay: k * 0.2 });
        }
        break;
      }
      case 'wall': {
        const from = this.muzzle(new THREE.Vector3()), n = atk.n || 5;
        for (let k = 0; k < n; k++) { const off = (k - (n - 1) / 2) * 0.55; g.spawnProjectile(from.clone().add(new THREE.Vector3(off, 0, 0)), g.camPos.clone().add(new THREE.Vector3(off, 0, 0)), this.pspeed * 0.75, this.dmg, kind); }
        g.sfx.enemyShot(); break;
      }
    }
    if (this.glow) this.glow.visible = false;
  }

  shoot(kind, spread = 0, atk = {}) {
    const g = this.game;
    if (!this.alive) return;
    const from = this.muzzle(new THREE.Vector3());
    const foe = this.ally ? this.nearestFoe() : null; // switched sides with THE REMOTE: shoot the others
    const target = foe ? foe.centerWorld(new THREE.Vector3()) : (g.playerPos || g.camPos).clone(); // aims where you are now (ducking after the shot is fired dodges it)
    const miss = 0.4;
    target.x += rand(Math.random, -miss, miss); target.y += rand(Math.random, -miss * 0.6, miss * 0.4);
    if (spread) { const dir = target.clone().sub(from); dir.applyAxisAngle(UP, spread); target.copy(from).add(dir); }
    const speed = this.pspeed * (atk.speed || 1) * (kind === 'shard' ? 1.2 : kind === 'sonic' ? 0.8 : 1);
    const dmg = this.dmg * (atk.dmg || 1);
    g.spawnProjectile(from, target, speed, dmg, kind, { lob: atk.lob || kind === 'grenade', homing: atk.homing });
    const pk = PKINDS[kind]; if (pk && !NO_HALO.has(kind)) g.fx.glowAt(from, pk.mat.color.getHex(), 0.4, 0.07); // muzzle flash
    g.sfx.enemyShot();
  }

  bossAttack() {
    const g = this.game;
    const p = (this.pattern = (this.pattern || 0) + 1) % 4;
    if (p === 0 || p === 2) { for (let k = -2; k <= 2; k++) this.shoot('big', k * 0.09); }
    else if (p === 1) { this.burstLeft = 2; this.burstGap = 0.18; this.shoot('big'); }
    else {
      const frac = this.hp / this.maxHp;
      this.summoned = this.summoned || 0;
      if (this.summoned < 3 && frac < 1 - (this.summoned + 1) * 0.25) {
        this.summoned++;
        const pool = rosterFor(g.floorNum).filter(([id, d]) => !isFlyer(id) && d.move !== 'burrow' && d.move !== 'turret' && d.hp < 12).map(([id]) => id);
        for (let k = 0; k < 2; k++) g.spawnReinforcement(pick(Math.random, pool.length ? pool : ['grunt']));
      } else for (let k = -1; k <= 1; k++) this.shoot('big', k * 0.14);
    }
  }

  applyMats() {
    const cloaked = this.cloak && this.cloak.on;
    const st = this.stanceOn ? (this.traits.reflect ? REFL : PHASE) : null;
    for (const m of this.meshes) m.material = cloaked ? CLOAK : st || m.userData.mat;
    if (this.glow && cloaked) this.glow.visible = false;
  }
  setFlash() { for (const m of this.meshes) m.material = FLASH; }

  damage(amount, part, point, quiet = false) {
    if (this.state === 'dead') return false;
    if (this.state === 'enter' && this.def.boss) return false;
    if (this.burrow && this.burrow.phase === 'under') return false;
    const g = this.game;
    if (this.tutorialShield) { g.fx.sparks(point, 3); g.sfx.metalHit(); return 'immune'; }
    if (this.brain) {
      const r = this.brain.gate(part);
      // wind-ups and charges can still be broken by hits on armored parts (at half value)
      if (r === 'immune') { this.brain.onHit(amount * 0.5); g.fx.sparks(point, 4); g.sfx.metalHit(); g.bossImmune(this); return 'immune'; }
      if (r === 'reflect') { g.fx.sparks(point, 6); g.sfx.zap(); g.hurtPlayer(3 + amount * 0.6, this); return 'immune'; }
      if (r === 'shield') {
        this.brain.shield -= amount; this.brain.shieldRegen = 0; g.fx.sparks(point, 5); g.sfx.metalHit();
        if (this.brain.shield <= 0) { g.bossMsg('SHIELD BROKEN!'); g.sfx.botDeath(); g.fx.explosion(this.centerWorld(new THREE.Vector3()), 1.2); }
        return 'shield';
      }
      this.brain.onHit(amount);
      if (part === 'core') { part = 'body'; amount *= 1.5; }
    }
    if (this.stanceOn) {
      if (this.traits.reflect) { g.fx.sparks(point, 6); g.sfx.zap(); if (!quiet) g.hurtPlayer(2 + amount * 0.5, this); }
      else { g.fx.ice(point, 3); }
      g.bossImmune(this);
      return 'immune';
    }
    if (part === 'shield' && this.shieldHp > 0) {
      this.shieldHp -= amount;
      g.fx.sparks(point, 5); g.sfx.metalHit();
      if (this.shieldHp <= 0) {
        for (const m of this.meshes.filter((m) => m.userData.part === 'shield')) {
          g.scene.attach(m); g.fx.debris(m, new THREE.Vector3(rand(Math.random, -1, 1), 2.5, 1.5));
          this.meshes.splice(this.meshes.indexOf(m), 1);
        }
        this.shieldMesh = null; g.sfx.botDeath();
      }
      return 'shield';
    }
    if (part === 'shield') part = 'body';
    const human = this.def.model.kind === 'human';
    const head = part === 'head';
    let mult = head ? (human ? (this.def.boss ? 2 : 3) : 2) : 1;
    if (!head && this.traits.armor) { mult *= this.traits.armor; if (!quiet) g.fx.sparks(point, 3); }
    this.hp -= amount * mult;
    this.lastHit = 0; this.lastAmt = amount * mult;
    if (!quiet && !this.def.boss) this.kick = Math.min(0.28, (this.kick || 0) + 0.04 + amount * mult * 0.03);
    if (!quiet) {
      this.flashT = 0.07; this.setFlash(); this.stagger = 1;
      if (this.gore === 'spark') g.fx.sparks(point, 6); else if (this.gore === 'goo') g.fx.goo(point, 7); else g.fx.blood(point, head ? 10 : 6);
    }
    if (this.hp <= 0) { this.die(head && human, point); return head ? 'head' : 'body'; }
    if (this.state === 'dormant') this.activate();
    if (quiet) return 'body';
    if (this.def.interrupt) this.interrupt();
    if (this.traits.teleportOnHit && (this.tpCd || 0) < this.phase) {
      this.tpCd = this.phase + 2.5;
      g.fx.sparks(this.centerWorld(new THREE.Vector3()), 10);
      const s2 = g.randomSpot(this); this.pos.x = s2.x; this.pos.z = s2.z; this.goal.copy(this.pos);
      g.fx.pop(this.centerWorld(new THREE.Vector3())); g.sfx.zap();
    }
    if (this.def.move === 'charge') this.pos.z -= 0.2;
    return head ? 'head' : 'body';
  }

  die(headshot, point, noScore = false) {
    if (this.state === 'dead') return;
    if (this.decoy) noScore = true;
    this.state = 'dead';
    const g = this.game;
    for (const m of this.meshes) m.material = m.userData.mat;
    if (this.glow) this.glow.visible = false;
    this.root.updateMatrixWorld(true);
    const center = this.centerWorld(new THREE.Vector3());
    const style = this.deathStyle(headshot);
    if (style === 'gib') this.gib(center, headshot);
    else {
      // the body stays: game.js animates the fall (or crash, or wreck) and cleans it up
      if (headshot && this.head && style === 'fall') {
        g.scene.attach(this.head);
        g.fx.debris(this.head, tmpV.subVectors(center, g.camPos).setY(0).normalize().multiplyScalar(1.5).add(new THREE.Vector3(rand(Math.random, -0.6, 0.6), 4, 0)));
        this.meshes.splice(this.meshes.indexOf(this.head), 1);
        g.fx.blood(this.head.position, 14);
      }
      g.addCorpse(this, style, center);
    }
    if (this.gore === 'spark') { g.fx.sparks(center, 24); g.sfx.botDeath(); }
    else if (this.gore === 'goo') { g.fx.goo(center, 24); g.sfx.death(); }
    else { g.fx.blood(center, 22); g.sfx.death(); }
    if (!this.flyer) g.fx.floorDecal(this.pos.x, this.pos.z - 0.2, this.gore, 0.6 + this.scale * 0.5);
    const T = this.traits;
    if (g.mod === 'volatile' && !this.def.boss) g.blast(center, 1.7, 3);
    if (T.deathBlast) g.blast(center, T.deathBlast, 4);
    if (T.split) g.spawnMinion(T.split.type, this.pos, T.split.n);
    g.onEnemyKilled(this, headshot, noScore);
  }

  // how this enemy dies: 'gib' (blown apart), 'fall' (collapses backward), 'flip' (critters
  // land on their backs), 'crash' (flyers drop and explode), 'wreck' (machines spark and blow), 'boss'
  deathStyle(headshot) {
    const mk = this.def.model.kind;
    if (this.def.boss) return 'boss';
    // most enemies burst apart (the classic look); a few fall, flip, crash or wreck for variety
    if (this.gore === 'goo' || mk === 'swarm' || mk === 'blob') return 'gib';
    if ((this.lastAmt || 0) >= Math.max(4, this.maxHp * 0.9)) return 'gib';
    if (this.flyer) return Math.random() < 0.6 ? 'crash' : 'gib';
    if (mk === 'human') return Math.random() < 0.25 ? 'fall' : 'gib';
    if (mk === 'mech') return Math.random() < 0.3 ? 'fall' : 'gib';
    if (mk === 'spider' || mk === 'quad') return Math.random() < 0.3 ? 'flip' : 'gib';
    return Math.random() < 0.5 ? 'wreck' : 'gib';
  }

  // blow the model apart into tumbling pieces
  gib(center, headshot) {
    const g = this.game;
    this.root.updateMatrixWorld(true);
    for (const m of this.meshes) {
      if (m.material.visible === false || !m.parent) continue;
      g.scene.attach(m);
      const vel = m.getWorldPosition(new THREE.Vector3()).sub(center).setY(0).normalize().multiplyScalar(rand(Math.random, 1, 3));
      vel.y = rand(Math.random, 2, 4.5);
      vel.add(tmpV.subVectors(center, g.camPos).setY(0).normalize().multiplyScalar(1.5));
      if (headshot && m === this.head) vel.y += 3;
      g.fx.debris(m, vel, this.gore);
    }
    g.scene.remove(this.root);
    g.splatter(center, this.gore, 5);
  }

  remove() { this.game.scene.remove(this.root); for (const m of this.meshes) if (m.parent) m.parent.remove(m); }
}

// ---------------------------------------------------------------- projectiles
const G_ORB = new THREE.IcosahedronGeometry(0.09, 0);
const G_BIG = new THREE.IcosahedronGeometry(0.17, 0);
const G_BOLT = new THREE.BoxGeometry(0.07, 0.07, 0.35);
const G_SHARD = new THREE.BoxGeometry(0.05, 0.05, 0.2);
const G_BOX = new THREE.BoxGeometry(0.2, 0.16, 0.2);
const G_MISSILE = new THREE.BoxGeometry(0.09, 0.09, 0.32);
const G_SONIC = new THREE.BoxGeometry(0.5, 0.08, 0.06);
const B = (c) => new THREE.MeshBasicMaterial({ color: c });
const CORE = B(0xfff0a0);
const DIRECT = new Set(['shot', 'burst', 'rapid', 'spread', 'laser', 'homing', 'sonic', 'boss']);
const PKINDS = {
  orb: { geo: G_ORB, mat: B(0xff8a1a), core: true },
  big: { geo: G_BIG, mat: B(0xd030ff), core: true },
  bolt: { geo: G_BOLT, mat: B(0x40e0ff), aligned: true },
  shard: { geo: G_SHARD, mat: B(0xf0f0f0), aligned: true },
  plasma: { geo: G_ORB, mat: B(0x40ff80), core: true },
  fire: { geo: G_ORB, mat: B(0xff5010), core: true },
  coffee: { geo: G_ORB, mat: B(0x6a3a14) },
  acid: { geo: G_ORB, mat: B(0x90ff20), core: true },
  grenade: { geo: G_ORB, mat: B(0x405030), blink: true },
  package: { geo: G_BOX, mat: new THREE.MeshLambertMaterial({ color: 0xa07040 }) },
  missile: { geo: G_MISSILE, mat: B(0xd03020), aligned: true },
  pitch: { geo: G_ORB, mat: B(0xff60c0), core: true },
  sonic: { geo: G_SONIC, mat: B(0xc080ff), aligned: true },
  bomb: { geo: new THREE.IcosahedronGeometry(0.16, 0), mat: B(0x202020), blink: true },
  mine: { geo: new THREE.OctahedronGeometry(0.14, 0), mat: B(0xff3060), core: true },
};

// glowing halo around energy projectiles (and a red one on bombs and missiles), shared per kind
const HALO = {};
const NO_HALO = new Set(['coffee', 'package', 'shard', 'grenade']);
function halo(kind, k) {
  if (NO_HALO.has(kind)) return null;
  if (!HALO[kind]) {
    const col = kind === 'bomb' || kind === 'missile' ? 0xff4020 : k.mat.color.getHex();
    HALO[kind] = new THREE.SpriteMaterial({ map: TX.glow(), color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85 });
  }
  const sp = new THREE.Sprite(HALO[kind]);
  sp.scale.setScalar(kind === 'big' || kind === 'bomb' ? 0.75 : 0.5);
  return sp;
}

export class Projectile {
  constructor(game, from, target, speed, dmg, kind, opts = {}) {
    this.game = game; this.dmg = dmg; this.kind = kind; this.alive = true; this.life = 0;
    this.owner = game.actor || null; // who fired it (for the cause of death)
    const k = PKINDS[kind] || PKINDS.orb;
    this.k = k;
    this.mesh = new THREE.Mesh(k.geo, k.mat);
    if (k.core) { const c = new THREE.Mesh(k.geo, CORE); c.scale.setScalar(0.55); this.mesh.add(c); }
    const h = halo(kind, k); if (h) this.mesh.add(h);
    this.mesh.position.copy(from);
    this.homing = opts.homing ? 2.2 : 0;
    this.gravity = opts.lob ? 7 : 0;
    this.speed = opts.homing ? speed * 0.7 : speed;
    if (opts.lob) {
      const g = this.gravity, CEIL = 2.7;
      from = from.clone(); from.y = Math.min(from.y, CEIL - 0.1); this.mesh.position.copy(from);
      let T = Math.max(0.9, from.distanceTo(target) / (speed * 0.75));
      const dy = target.y - from.y;
      let vy = dy / T + 0.5 * g * T;
      // keep the whole arc under the ceiling so the player can always see and shoot it
      if (from.y + (vy > 0 ? (vy * vy) / (2 * g) : 0) > CEIL) {
        vy = Math.sqrt(2 * g * (CEIL - from.y));
        T = (vy + Math.sqrt(Math.max(0, vy * vy - 2 * g * dy))) / g;
      }
      this.vel = target.clone().sub(from).divideScalar(T); this.vel.y = vy;
    } else {
      this.vel = target.clone().sub(from).normalize().multiplyScalar(this.speed);
      if (opts.homing) this.vel.add(new THREE.Vector3(rand(Math.random, -2, 2), rand(Math.random, 1, 2.5), 0));
    }
    if (k.aligned) this.mesh.lookAt(target);
    this.bomb = !!opts.bomb;
    this.delay = opts.delay || 0;
    if (this.delay) this.mesh.visible = false;
    if (opts.mine) { this.mineT = opts.mine; this.park = target.clone(); this.vel = target.clone().sub(from).multiplyScalar(1.6); }
    game.scene.add(this.mesh);
  }
  update(dt) {
    if (this.delay > 0) { this.delay -= dt; if (this.delay <= 0) this.mesh.visible = true; return; }
    this.life += dt;
    const cam = this.game.playerPos || this.game.camPos;
    if (this.mineT != null) {
      // mines drift to a parking spot, hover and blink, then dart straight at the player
      this.mineT -= dt;
      if (this.mineT > 0) {
        this.mesh.position.lerp(this.park, Math.min(1, dt * 3));
        this.mesh.rotation.y += dt * 4;
        this.mesh.material = this.mineT < 0.6 && Math.floor(this.life * 14) % 2 ? PKINDS.orb.mat : this.k.mat;
        return;
      }
      this.mineT = null; this.vel = cam.clone().sub(this.mesh.position).normalize().multiplyScalar(6.5);
      this.game.sfx.telegraph();
    }
    if (this.homing) {
      const want = cam.clone().sub(this.mesh.position).normalize().multiplyScalar(this.speed);
      this.vel.lerp(want, Math.min(1, this.homing * dt));
      if (Math.random() < dt * 20) this.game.fx.emit(this.mesh.position.clone(), 1, 'dust', 0.3, -1, 0.4);
    }
    this.vel.y -= this.gravity * dt;
    this.mesh.position.addScaledVector(this.vel, dt);
    if (this.mesh.position.y > 2.85) { this.mesh.position.y = 2.85; if (this.vel.y > 0) this.vel.y = 0; }
    if (this.k.aligned) this.mesh.lookAt(this.mesh.position.clone().add(this.vel));
    else { this.mesh.rotation.x += dt * 9; this.mesh.rotation.y += dt * 7; this.mesh.scale.setScalar(1 + Math.sin(this.life * 30) * 0.12); }
    if (this.k.blink) this.mesh.material = Math.floor(this.life * 10) % 2 ? PKINDS.orb.mat : this.k.mat;
    if (this.bomb) {
      // bombs blow up on impact with the floor (or you) and hurt you if they land close
      const p = this.mesh.position;
      if (p.y < 0.15 || p.distanceTo(cam) < 0.7) {
        this.game.fx.explosion(p.clone().setY(Math.max(0.3, p.y)), 1.4); this.game.sfx.explode(); this.game.shakeCam(0.5);
        if (Math.hypot(p.x - cam.x, p.z - cam.z) < 2.3) this.game.hurtPlayer(this.dmg, null, this);
        if (this.game.splashEnemies) this.game.splashEnemies(p, 1.8, this.dmg * 0.5, this.owner);
        this.kill(); return;
      }
    }
    const friendly = this.reflected || (this.owner && this.owner.ally);
    if (!friendly && this.mesh.position.distanceTo(cam) < 0.45) { this.game.hurtPlayer(this.dmg, null, this); this.kill(); return; }
    // friendly fire: enemy shots hurt any enemy they run into (not the shooter right after firing)
    if (this.mineT == null && !this.bomb) {
      const p = this.mesh.position;
      for (const o of this.game.enemies) {
        if (!o.alive || o.off || o.state === 'dormant' || (o === this.owner && this.life < 0.6) || (this.owner && this.owner.ally && o.ally)) continue;
        if (Math.abs(o.pos.z - p.z) > 1.5 || Math.abs(o.pos.x - p.x) > 1.5) continue;
        const c = o.centerWorld(tmpV);
        const r = 0.33 * o.scale * (o.def.boss ? 1.3 : 1);
        if (Math.abs(p.x - c.x) < r && Math.abs(p.z - c.z) < r + 0.1 && Math.abs(p.y - c.y) < (o.centerY || 0.9) * o.scale + 0.1) {
          const r2 = o.damage(this.dmg * 0.45, 'body', p.clone());
          if (r2 && r2 !== 'immune' && this.game.onFriendlyFire) this.game.onFriendlyFire(o, p.clone());
          if (this.k.explode || this.kind === 'grenade' || this.kind === 'missile') this.game.fx.explosion(p.clone(), 0.6);
          this.kill(); return;
        }
      }
    }
    if (this.mesh.position.z > cam.z + 0.5 || this.life > 8 || this.mesh.position.y < -0.5) this.kill();
  }
  kill() { this.alive = false; this.game.scene.remove(this.mesh); }
}
