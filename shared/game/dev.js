// Developer tools: god mode, free ammo, one-hit kills, give weapons/perks, spawn enemies,
// jump floors, cash. Turned on in SETTINGS > DEVELOPER MODE (only offered while DEV_BUILD is
// true in settings.js; set it to false for release builds). Flags persist per device.
import { storeGet, storeSet } from '../engine/util.js';

const flags = Object.assign({ god: false, ammo: false, onehit: false, peace: false, fps: false }, storeGet('overtime.dev', {}));
export const devOn = (k) => !!flags[k] && devEnabled();
let enabledFn = () => false;
export const devEnabled = () => enabledFn();

let ctx = null, open = false;
const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

export function initDev(c) {
  ctx = c; enabledFn = c.enabled;
  $('devClose').addEventListener('click', (e) => { e.stopPropagation(); closeDev(); });
  $('devBtn').addEventListener('click', (e) => { e.stopPropagation(); openDev(); });
  $('pDevBtn').addEventListener('click', (e) => { e.stopPropagation(); openDev(); });
  window.addEventListener('keydown', (e) => { if (e.key === '`' && devEnabled()) { e.preventDefault(); open ? closeDev() : openDev(); } });
  refreshDevUi();
}
export const devOpen = () => open;

export function refreshDevUi() {
  const on = devEnabled();
  $('devBtn').classList.toggle('hidden', !on);
  $('pDevBtn').classList.toggle('hidden', !on);
  $('fps').classList.toggle('hidden', !(on && flags.fps));
}

let fpsAcc = 0, fpsN = 0;
export function devTick(dt) {
  if (!devOn('fps')) return;
  fpsAcc += dt; fpsN++;
  if (fpsAcc >= 0.5) { $('fps').textContent = `${Math.round(fpsN / fpsAcc)} FPS · ${ctx.info()}`; fpsAcc = 0; fpsN = 0; }
}

function closeDev() { open = false; $('dev').classList.add('hidden'); ctx.resume(); }
export function openDev() {
  if (!devEnabled() || !ctx.inRun()) return;
  open = true; ctx.pause(); render(); $('dev').classList.remove('hidden');
}

function render() {
  const box = $('devBody'); box.innerHTML = '';
  const section = (title) => { box.append(el('div', 'dev-h', title)); const g = el('div', 'dev-grid'); box.append(g); return g; };
  const btn = (grid, label, fn, cls = '') => {
    const b = el('button', 'dev-b ' + cls, label);
    b.addEventListener('click', (e) => { e.stopPropagation(); ctx.sfx.tap(); fn(b); });
    grid.append(b); return b;
  };

  const tg = section('CHEATS');
  for (const [k, label] of [['god', 'GOD MODE'], ['ammo', 'INFINITE AMMO'], ['onehit', 'ONE-HIT KILLS'], ['peace', 'ENEMIES DON\'T ATTACK'], ['fps', 'SHOW FPS']]) {
    btn(tg, label, (b) => { flags[k] = !flags[k]; storeSet('overtime.dev', flags); b.classList.toggle('on', flags[k]); refreshDevUi(); }, flags[k] ? 'on' : '');
  }

  const spd = section('GAME SPEED');
  for (const k of [1, 2, 4]) btn(spd, `${k}X`, () => { ctx.timeScale(k); render(); }, ctx.timeScale() === k ? 'on' : '');

  const ac = section('ACTIONS');
  btn(ac, 'FULL HEAL', () => ctx.heal());
  btn(ac, 'KILL ALL ENEMIES', () => { closeDev(); ctx.killAll(); });
  btn(ac, 'FINISH FLOOR', () => { closeDev(); ctx.finishFloor(); });
  btn(ac, '+$1,000', () => ctx.cash(1000));
  btn(ac, '+$10,000', () => ctx.cash(10000));
  btn(ac, 'UNLOCK EVERYTHING', () => ctx.unlockAll());
  const fl = el('div', 'dev-row');
  const inp = el('input'); inp.type = 'number'; inp.min = 1; inp.max = 50; inp.value = Math.min(50, ctx.floor() + 1); inp.className = 'dev-in';
  const go = el('button', 'dev-b', 'GO TO FLOOR');
  go.addEventListener('click', (e) => { e.stopPropagation(); const n = Math.max(1, Math.min(50, Math.round(+inp.value || 1))); closeDev(); ctx.gotoFloor(n); });
  fl.append(inp, go); box.append(fl);

  const wg = section('GIVE WEAPON');
  for (const g of ctx.guns()) btn(wg, `<span style="color:${g.color}">${g.short}</span>`, () => ctx.giveGun(g.id));

  const pg = section('GIVE PERK (+1 LEVEL)');
  for (const p of ctx.perks()) btn(pg, `<span style="color:${p.color}">${p.name}</span> <small>${p.lv || ''}</small>`, () => { ctx.addPerk(p.id); render(); });
  btn(pg, 'CLEAR ALL PERKS', () => { ctx.clearPerks(); render(); }, 'warn');

  const sp = section('SPAWN');
  const row = el('div', 'dev-row');
  const sel = el('select', 'dev-in');
  for (const [id, name] of ctx.enemies()) { const o = el('option', null, name); o.value = id; sel.append(o); }
  const sb = el('button', 'dev-b', 'SPAWN ENEMY');
  sb.addEventListener('click', (e) => { e.stopPropagation(); ctx.spawn(sel.value); });
  const rq = el('button', 'dev-b', 'SPAWN REQUIEM');
  rq.addEventListener('click', (e) => { e.stopPropagation(); ctx.spawn(sel.value, true); });
  row.append(sel, sb, rq); sp.append(row);
  const row2 = el('div', 'dev-row');
  const bsel = el('select', 'dev-in');
  for (const [id, name] of ctx.bosses()) { const o = el('option', null, name); o.value = id; bsel.append(o); }
  const bb = el('button', 'dev-b', 'SPAWN BOSS');
  bb.addEventListener('click', (e) => { e.stopPropagation(); closeDev(); ctx.spawnBoss(bsel.value); });
  row2.append(bsel, bb); sp.append(row2);
}
