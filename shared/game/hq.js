// HQ: the between-runs screen. Tabs: UPGRADES (permanent), ARMORY (weapon levels),
// EMPLOYEES (starting characters), ACHIEVEMENTS. Also the employee picker for a new run.
import { profile, spend, touch, flushProfile } from './profile.js';
import { UPGRADES, upgradeCost, WEAPON_MAX, weaponCost } from '../content/meta/upgrades.js';
import { CHARACTERS, isUnlocked } from '../content/meta/characters.js';
import { ACHIEVEMENTS } from '../content/meta/achievements.js';
import { GUNS, GUN, RARITY } from '../content/weapons/weapons.js';
import { LORE } from '../content/meta/lore.js';
import * as THREE from '../vendor/three.module.min.js';
import { Enemy, DEFS } from '../content/enemies/ai.js';
import { BOSS_LIST } from '../content/bosses/bosses.js';
import { skinsFor } from '../content/enemies/skins.js';
import { ENEMY_LORE, fightText } from '../content/enemies/lore.js';
import { DIFFS } from './difficulty.js';
import { CHAR } from '../content/meta/characters.js';

const $ = (id) => document.getElementById(id);
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
let tab = 'upgrades', hooks = {};

export function initHQ(h) { hooks = h; }
export { money };

function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function buyBtn(price, can, onBuy, label) {
  const b = el('button', 'hq-buy' + (can ? '' : ' off'), label || money(price));
  b.addEventListener('click', (e) => { e.stopPropagation(); if (!can) { hooks.sfx.empty(); return; } if (spend(price)) { hooks.sfx.unlock(); onBuy(); hooks.changed(); render(); } });
  return b;
}

export function openHQ(t = tab) { tab = t; render(); $('hq').classList.remove('hidden'); }
export function closeHQ() { stopPreview(); logSel = null; $('hq').classList.add('hidden'); flushProfile(true); }

function render() {
  $('hqCash').textContent = money(profile.cash);
  for (const b of document.querySelectorAll('#hqTabs button')) b.classList.toggle('on', b.dataset.tab === tab);
  const box = $('hqBody'); box.innerHTML = ''; box.scrollTop = 0;
  if (tab === 'upgrades') {
    box.append(el('div', 'hq-note', 'Permanent upgrades. They apply to every run from now on.'));
    for (const u of UPGRADES) {
      const lv = profile.upgrades[u.id] || 0, maxed = lv >= u.max, price = upgradeCost(u, lv);
      const row = el('div', 'hq-row');
      row.append(el('div', 'hq-info', `<b>${u.name}</b> <small>${lv}/${u.max}</small><span>${u.desc(Math.max(1, maxed ? lv : lv + 1))}${maxed ? '' : lv ? ` <em>(now: ${u.desc(lv)})</em>` : ''}</span>`));
      row.append(maxed ? el('div', 'hq-done', 'MAXED') : buyBtn(price, profile.cash >= price, () => { profile.upgrades[u.id] = lv + 1; touch(); }));
      box.append(row);
    }
  } else if (tab === 'armory') {
    box.append(el('div', 'hq-note', 'Upgrade weapons you have found: +12% damage and +10% magazine per level. Level 5 also reloads 20% faster.'));
    const found = GUNS.filter((g) => profile.found[g.id]);
    if (!found.length) box.append(el('div', 'hq-note', 'Find weapons during runs to upgrade them here.'));
    for (const g of found) {
      const lv = profile.weapons[g.id] || 0, maxed = lv >= WEAPON_MAX, price = weaponCost(g.rarity, lv), r = RARITY[g.rarity];
      const row = el('div', 'hq-row');
      const pips = '■'.repeat(lv) + '□'.repeat(WEAPON_MAX - lv);
      row.append(el('div', 'hq-info', `<b style="color:${r.color}">${g.name}</b> <small class="pips">${pips}</small><span>${g.desc}</span>`));
      row.append(maxed ? el('div', 'hq-done', 'MASTERED') : buyBtn(price, profile.cash >= price, () => { profile.weapons[g.id] = lv + 1; touch(); }));
      box.append(row);
    }
    box.append(el('div', 'hq-note', `${found.length} / ${GUNS.length} weapons found`));
  } else if (tab === 'employees') {
    box.append(el('div', 'hq-note', 'Pick who starts the next run. Each employee brings their own weapon and perks.'));
    for (const c of CHARACTERS) box.append(charRow(c, false));
  } else if (tab === 'log') {
    renderLog(box);
  } else if (tab === 'files') {
    const lore = profile.lore || {};
    box.append(el('div', 'hq-note', `${Object.keys(lore).length} / ${LORE.length} memos found. They turn up lying around the tower in Story and Endless runs.`));
    for (const l of LORE) {
      const got = !!lore[l.id];
      const row = el('div', 'hq-row' + (got ? '' : ' dim'));
      const info = el('div', 'hq-info', got ? `<b style="color:#fff0a0">${l.title}</b><span class="lore-from">FROM: ${l.from}</span>` : `<b>??? MEMO #${l.id.slice(1)}</b><span class="lore-from">FLOORS ${zoneFloors(l.zone)}</span>`);
      if (got) {
        const txt = el('div', 'lore-txt hidden', l.text); info.append(txt);
        row.style.cursor = 'pointer';
        row.addEventListener('click', (e) => { e.stopPropagation(); hooks.sfx.tap(); txt.classList.toggle('hidden'); });
        row.append(info, el('div', 'hq-done', 'READ'));
      } else row.append(info, el('div', 'hq-done', 'MISSING'));
      box.append(row);
    }
  } else if (tab === 'records') {
    const rec = profile.records || {};
    const date = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}`; };
    const tm = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    const list = (title, rows, fmt) => {
      box.append(el('div', 'hq-note', `<b style="color:#f0c860">${title}</b>`));
      if (!rows || !rows.length) { box.append(el('div', 'hq-note', 'NO RUNS YET')); return; }
      rows.forEach((r, i) => box.append(el('div', 'rec-row', `<span>${i + 1}. ${fmt(r)}</span><span>${CHAR[r.char] ? CHAR[r.char].name : ''} · ${(DIFFS[r.diff] || DIFFS[1]).name} · ${date(r.date)}</span>`)));
    };
    list('STORY · TOP SCORES', rec.story, (r) => `${r.score} PTS · FLOOR ${r.floor}`);
    list('ENDLESS · HIGHEST FLOORS', rec.endless, (r) => `FLOOR ${r.floor} · ${r.score} PTS`);
    list('BOSS RUSH · BEST RUNS', rec.rush, (r) => `${r.bosses}/10 BOSSES · ${tm(r.time)}`);
    const days = Object.entries(rec.daily || {}).sort((a, b) => b[0] - a[0]).slice(0, 7);
    box.append(el('div', 'hq-note', '<b style="color:#60ff80">DAILY CHALLENGE · LAST 7 DAYS</b>'));
    if (!days.length) box.append(el('div', 'hq-note', 'NO RUNS YET'));
    for (const [k, v] of days) box.append(el('div', 'rec-row', `<span>${String(k).slice(4, 6)}/${String(k).slice(6)}</span><span>${v} PTS</span>`));
    box.append(el('div', 'hq-note', 'Records are kept on this device. Online leaderboards come with the app store release.'));
  } else if (tab === 'achievements') {
    const got = ACHIEVEMENTS.filter((a) => profile.ach[a.id]).length;
    box.append(el('div', 'hq-note', `${got} / ${ACHIEVEMENTS.length} unlocked`));
    for (const a of ACHIEVEMENTS) {
      const done = !!profile.ach[a.id];
      const row = el('div', 'hq-row' + (done ? '' : ' dim'));
      row.append(el('div', 'hq-info', `<b>${done ? '★ ' : ''}${a.name}</b><span>${a.desc}</span>`));
      row.append(el('div', 'hq-done', done ? 'DONE' : money(a.reward)));
      box.append(row);
    }
  }
}

// ---------------------------------------------------------------- enemy log
let logSel = null, prev = null;
const LOG_ENEMIES = () => Object.entries(DEFS).filter(([id, d]) => !d.boss && id !== 'pylon' && d.floors && d.model).sort((a, b) => a[1].floors[0] - b[1].floors[0]);
function renderLog(box) {
  stopPreview();
  const bl = profile.bestiary || {};
  if (logSel) { renderEntry(box, logSel); return; }
  const list = LOG_ENEMIES();
  const known = list.filter(([id]) => bl[id]).length, bossKnown = BOSS_LIST.filter((b) => bl[b.id]).length;
  box.append(el('div', 'hq-note', `ENEMIES ${known} / ${list.length} · BOSSES ${bossKnown} / ${BOSS_LIST.length}. Kill an enemy to add it to the log; every skin you kill is recorded.`));
  const row = (id, d, sub) => {
    const got = !!bl[id], skins = got ? Object.keys(bl[id].s).length : 0, total = skinsFor(d).length;
    const r = el('div', 'hq-row' + (got ? '' : ' dim'));
    r.append(el('div', 'hq-info', got ? `<b>${d.name}</b><span>${sub}</span><small>KILLED ${bl[id].k} · SKINS ${skins}/${total}</small>` : `<b>???</b><span>${sub}</span>`));
    r.append(el('div', 'hq-done', got ? 'VIEW' : 'UNKNOWN'));
    if (got) { r.style.cursor = 'pointer'; r.addEventListener('click', (e) => { e.stopPropagation(); hooks.sfx.tap(); logSel = id; render(); }); }
    box.append(r);
  };
  for (const [id, d] of list) row(id, d, d.minion ? 'SUMMONED' : `FLOORS ${d.floors[0]}-${d.floors[1]}`);
  box.append(el('div', 'hq-note', '<b style="color:#ff6040">BOSSES</b>'));
  for (const b of BOSS_LIST) row(b.id, DEFS[b.id], `${b.mini ? 'MINI BOSS' : 'BOSS'} · FLOOR ${b.floor}`);
}
function renderEntry(box, id) {
  const d = DEFS[id], b = (profile.bestiary || {})[id], skins = skinsFor(d);
  const back = el('button', 'hq-buy', '◀ BACK TO LOG');
  back.addEventListener('click', (e) => { e.stopPropagation(); hooks.sfx.tap(); logSel = null; render(); });
  box.append(back);
  box.append(el('div', 'log-name', d.name));
  const cv = document.createElement('canvas'); cv.className = 'log-view'; cv.width = 220; cv.height = 220; box.append(cv);
  const sk = el('div', 'log-skins');
  let cur = 0;
  skins.forEach((s, i) => {
    const got = d.boss ? i === 0 : !!b.s[i];
    const bt = el('button', 'hq-buy' + (i === cur ? ' on' : '') + (got ? '' : ' off'), got ? s.name : '???');
    bt.addEventListener('click', (e) => { e.stopPropagation(); if (!got) { hooks.sfx.empty(); return; } hooks.sfx.tap(); cur = i; for (const x of sk.children) x.classList.remove('on'); bt.classList.add('on'); startPreview(cv, id, i); });
    sk.append(bt);
  });
  if (!d.boss) box.append(sk);
  const atks = d.atk ? (Array.isArray(d.atk) ? d.atk : [d.atk]) : [];
  const stats = d.boss
    ? `HEALTH ${Math.round(d.hp)} (+ per floor) · DAMAGE ${d.dmg} · KILLED ${b.k}`
    : `HEALTH ${d.hp} · DAMAGE ${d.dmg} · SPEED ${d.speed ?? '-'} · FLOORS ${d.floors[0]}-${d.floors[1]} · KILLED ${b.k}`;
  box.append(el('div', 'hq-note', `<b style="color:#f0c860">STATS</b><br>${stats}`));
  const ft = d.boss ? [d.brain && d.brain.hint ? d.brain.hint + '.' : '', 'Moves: ' + (d.brain ? d.brain.moves.map((m) => m.t.toUpperCase()).join(', ') : '-') + '.'] : fightText(d);
  box.append(el('div', 'hq-note', `<b style="color:#ff9070">HOW IT FIGHTS</b><br>${ft.filter(Boolean).join('<br>')}${atks.length && !d.boss ? '' : ''}`));
  const lore = ENEMY_LORE[id] || (d.boss ? `A ${d.mini ? 'mini boss' : 'boss'} of Halvorsen-Pike Holdings. The building made it what it is.` : '');
  box.append(el('div', 'hq-note', `<b style="color:#fff0a0">FILE</b><br>${lore}`));
  startPreview(cv, id, 0);
}
function stopPreview() { if (prev) { cancelAnimationFrame(prev.raf); prev.scene.remove(prev.model); prev = null; } }
let pr = null;
function startPreview(canvas, id, skin) {
  stopPreview();
  if (!pr) {
    pr = { renderer: new THREE.WebGLRenderer({ antialias: false, alpha: true }) };
    pr.renderer.setPixelRatio(1); pr.renderer.setSize(110, 110, false);
    pr.scene = new THREE.Scene();
    pr.scene.add(new THREE.HemisphereLight(0xffffff, 0x404050, 1.4));
    const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(1, 2, 3); pr.scene.add(dl);
    pr.cam = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  }
  const fake = { scene: pr.scene, camPos: new THREE.Vector3(0, 1.4, 6), floorNum: 1, diff: 1, dd: {}, mod: null, room: null, enemies: [] };
  let e;
  try { e = new Enemy(fake, id, { x: 0, z: 0, y: 0, cover: false }, { decoy: !!DEFS[id].boss, skin }); } catch (err) { return; }
  const model = e.root; model.position.set(0, 0, 0); model.rotation.set(0, 0, 0);
  for (const m of e.meshes) m.material = m.userData.mat;
  const bb = new THREE.Box3().setFromObject(model), size = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
  const r = Math.max(size.x, size.y, size.z) || 1;
  pr.cam.position.set(0, c.y + r * 0.15, c.z + r * 2.3); pr.cam.lookAt(c);
  const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
  prev = { scene: pr.scene, model, raf: 0 };
  const tick = () => {
    if (!prev || prev.model !== model || !canvas.isConnected) { if (prev && prev.model === model) stopPreview(); return; }
    model.rotation.y += 0.012;
    pr.renderer.render(pr.scene, pr.cam);
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(pr.renderer.domElement, 0, 0, canvas.width, canvas.height);
    prev.raf = requestAnimationFrame(tick);
  };
  tick();
}

const zoneFloors = (z) => ['1-4', '5-9', '10-14', '15-20', '21-25', '26-30', '31-35', '36-40', '41-45', '46-50'][z];

function charRow(c, picking, onPick) {
  const open = isUnlocked(c, profile), sel = profile.char === c.id;
  const row = el('div', 'hq-row' + (open ? '' : ' dim') + (sel ? ' sel' : ''));
  const gun = GUN[c.weapon];
  const perks = Object.keys(c.perks).length ? ' + ' + Object.keys(c.perks).map((k) => k.toUpperCase()).join(', ') : '';
  const req = !open && c.unlock ? `<small class="req">UNLOCK: ${c.unlock.test ? c.unlock.text + (c.unlock.price ? ' — OR BUY IT' : '') : 'BUY IT'}</small>` : '';
  row.append(el('div', 'hq-info', `<b>${c.name}</b><span>${c.blurb}</span><small>${gun.name}${perks}</small>${req}`));
  if (open) {
    const b = el('button', 'hq-buy' + (sel ? ' on' : ''), picking ? (sel ? 'GO' : 'START') : sel ? 'SELECTED' : 'SELECT');
    b.addEventListener('click', (e) => { e.stopPropagation(); hooks.sfx.tap(); profile.char = c.id; touch(); flushProfile(true); if (picking) onPick(c); else render(); });
    row.append(b);
  } else if (c.unlock.price) {
    row.append(buyBtn(c.unlock.price, profile.cash >= c.unlock.price, () => { profile.chars[c.id] = 1; touch(); }));
  } else row.append(el('div', 'hq-done', 'LOCKED'));
  return row;
}

// shown when starting a new run with more than one employee unlocked
export function openCharSelect(onPick, title = "WHO'S CLOCKING IN?") {
  $('charTitle').textContent = title;
  const box = $('charList'); box.innerHTML = '';
  for (const c of CHARACTERS) if (isUnlocked(c, profile)) box.append(charRow(c, true, (ch) => { $('charSelect').classList.add('hidden'); onPick(ch); }));
  $('charSelect').classList.remove('hidden');
}
// difficulty picker shown at the start of a new run
export function openDiffSelect(diffs, onPick) {
  const box = $('diffList'); box.innerHTML = '';
  diffs.forEach((d, i) => {
    const sel = (profile.diff ?? 1) === i;
    const row = el('div', 'hq-row' + (sel ? ' sel' : ''));
    row.append(el('div', 'hq-info', `<b style="color:${d.color}">${d.name}</b><span>${d.desc}</span>`));
    const b = el('button', 'hq-buy' + (sel ? ' on' : ''), 'PICK');
    b.addEventListener('click', (e) => { e.stopPropagation(); hooks.sfx.tap(); profile.diff = i; touch(); flushProfile(true); $('diffSelect').classList.add('hidden'); onPick(i); });
    row.append(b); box.append(row);
  });
  $('diffSelect').classList.remove('hidden');
}
export const unlockedCount = () => CHARACTERS.filter((c) => isUnlocked(c, profile)).length;
export const allUnlocked = () => unlockedCount() === CHARACTERS.length;

export function bindHQ() {
  for (const b of document.querySelectorAll('#hqTabs button')) b.addEventListener('click', (e) => { e.stopPropagation(); hooks.sfx.tap(); tab = b.dataset.tab; render(); });
}
