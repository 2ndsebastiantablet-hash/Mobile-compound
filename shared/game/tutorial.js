// Guided first area on floor 1 for new players. Each step shows a hint (and a ring on the
// thing to shoot), waits for the player to do it, then moves on. Skippable at any time.
// game.js passes in `ctx`, a small API onto the game, so this file stays self-contained.

export class Tutorial {
  constructor(ctx) {
    this.ctx = ctx;
    this.i = -1; this.t = 0; this.done = false;
    const pc = ctx.PC;
    const tap = pc ? 'CLICK' : 'TAP';
    this.steps = [
      { // 1. basic shooting
        hint: `${tap} THE ENEMY TO SHOOT`,
        enter: () => { this.e = ctx.spawn('grunt', 0, 8, true); },
        ring: () => this.e && this.e.alive && this.e.centerWorld(this.e.pos.clone()),
        check: () => !this.e.alive,
        praise: 'NICE SHOT!',
      },
      { // 2. headshots
        hint: 'AIM FOR THE HEAD - HEADSHOTS DO 3X DAMAGE',
        enter: () => { this.kills = ctx.stats().heads; this.e = ctx.spawn('grunt', 0.9, 8.5, true); },
        ring: () => this.e && this.e.alive && this.e.head.getWorldPosition(this.e.pos.clone()),
        check: () => !this.e.alive,
        praise: () => (ctx.stats().heads > this.kills ? 'HEADSHOT!' : 'GOT HIM - TRY THE HEAD NEXT TIME'),
      },
      { // 3. shooting projectiles out of the air
        hint: 'ENEMIES FLASH BEFORE THEY FIRE - SHOOT THE FIREBALL!',
        enter: () => { this.orbs = ctx.stats().orbs; this.e = ctx.spawn('grunt', -0.8, 9, false); this.e.atkT = 1.2; },
        ring: () => { const p = ctx.G.projectiles.find((q) => q.alive); return p ? p.mesh.position : null; },
        update: () => { if (!this.e.alive && ctx.stats().orbs <= this.orbs) { this.e = ctx.spawn('grunt', -0.8, 9, false); this.e.atkT = 1.0; } },
        check: () => ctx.stats().orbs > this.orbs,
        praise: 'FIREBALL DESTROYED!',
      },
      { // 3b. finish off the shooter
        hint: 'NOW TAKE HIM OUT',
        enter: () => { if (!this.e.alive) this.skipNow = true; },
        ring: () => this.e && this.e.alive && this.e.centerWorld(this.e.pos.clone()),
        check: () => this.skipNow || !this.e.alive,
      },
      { // 4. reloading
        hint: pc ? 'RELOAD ANY TIME: R OR RIGHT-CLICK (EMPTY GUNS RELOAD THEMSELVES)' : 'TAP RELOAD ANY TIME (EMPTY GUNS RELOAD THEMSELVES)',
        enter: () => { ctx.P.inv[ctx.P.slot].ammo = Math.min(ctx.P.inv[ctx.P.slot].ammo, 4); },
        check: () => ctx.P.reloadT > 0 || this.t > 7,
      },
      { // 5. weapon pickups
        hint: `ENEMIES DROP WEAPONS - ${tap} THE SHOTGUN TO PICK IT UP`,
        enter: () => { this.pk = ctx.dropGun(0.4, 5.5, 'shotgun'); },
        ring: () => this.pk && !this.pk.collect && this.pk.mesh.position.clone().setY(0.5),
        check: () => ctx.P.inv.length > 1,
      },
      { // 6. swapping
        hint: pc ? 'SWITCH WEAPONS: MOUSE WHEEL, 1-3 OR Q' : 'TAP SWAP TO SWITCH WEAPONS (YOU CAN CARRY 3)',
        enter: () => { this.slot = ctx.P.slot; },
        check: () => ctx.P.slot !== this.slot || this.t > 9,
      },
      { // 7. graduation fight
        hint: 'CLEAR THE AREA TO MOVE ON. GOOD LUCK!',
        enter: () => { ctx.spawn('grunt', -1.2, 9.5, false); ctx.spawn('grunt', 1.2, 10, false); },
        check: () => this.t > 3,
      },
    ];
  }

  start() { this.next(); }

  next() {
    this.i++; this.t = 0; this.skipNow = false;
    if (this.i >= this.steps.length) { this.finish(); return; }
    const s = this.steps[this.i];
    s.enter && s.enter();
    this.ctx.hint(s.hint, this.i + 1, this.steps.length);
  }

  update(dt) {
    if (this.done) return;
    const s = this.steps[this.i];
    this.t += dt;
    s.update && s.update();
    this.ctx.ring(s.ring ? s.ring() || null : null);
    if (s.check()) {
      const praise = typeof s.praise === 'function' ? s.praise() : s.praise;
      if (praise) this.ctx.toast(praise, '#60ff80');
      this.ctx.sfx.tap();
      this.next();
    }
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.ctx.ring(null); this.ctx.hint(null);
    this.ctx.finish();
  }
}
