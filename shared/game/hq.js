// HQ: the between-runs screen. Tabs: UPGRADES (permanent), ARMORY (weapon levels),
// EMPLOYEES (starting characters), ACHIEVEMENTS. Also the employee picker for a new run.
import { profile, spend, touch, flushProfile } from './profile.js';
import { UPGRADES, upgradeCost, WEAPON_MAX, weaponCost } from '../content/meta/upgrades.js';
import { CHARACTERS, isUnlocked } from '../content/meta/characters.js';
import { ACHIEVEMENTS } from '../content/meta/achievements.js';
import { GUNS, GUN, RARITY } from '../content/weapons/weapons.js';

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
export function closeHQ() { $('hq').classList.add('hidden'); flushProfile(true); }

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

function charRow(c, picking, onPick) {
  const open = isUnlocked(c, profile), sel = profile.char === c.id;
  const row = el('div', 'hq-row' + (open ? '' : ' dim') + (sel ? ' sel' : ''));
  const gun = GUN[c.weapon];
  const perks = Object.keys(c.perks).length ? ' + ' + Object.keys(c.perks).map((k) => k.toUpperCase()).join(', ') : '';
  const req = !open && c.unlock ? `<small class="req">UNLOCK: ${c.unlock.test ? c.unlock.text + (c.unlock.price ? ' — OR BUY IT' : '') : 'BUY IT'}</small>` : '';
  row.append(el('div', 'hq-info', `<b>${c.name}</b><span>${c.blurb}</span><small>${gun.name}${perks}</small>${req}`));
  if (open) {
    const b = el('button', 'hq-buy' + (sel ? ' on' : ''), picking ? 'START' : sel ? 'SELECTED' : 'SELECT');
    b.addEventListener('click', (e) => { e.stopPropagation(); hooks.sfx.tap(); profile.char = c.id; touch(); flushProfile(true); if (picking) onPick(c); else render(); });
    row.append(b);
  } else if (c.unlock.price) {
    row.append(buyBtn(c.unlock.price, profile.cash >= c.unlock.price, () => { profile.chars[c.id] = 1; touch(); }));
  } else row.append(el('div', 'hq-done', 'LOCKED'));
  return row;
}

// shown when starting a new run with more than one employee unlocked
export function openCharSelect(onPick) {
  const box = $('charList'); box.innerHTML = '';
  for (const c of CHARACTERS) if (isUnlocked(c, profile)) box.append(charRow(c, true, (ch) => { $('charSelect').classList.add('hidden'); onPick(ch); }));
  $('charSelect').classList.remove('hidden');
}
export const unlockedCount = () => CHARACTERS.filter((c) => isUnlocked(c, profile)).length;
export const allUnlocked = () => unlockedCount() === CHARACTERS.length;

export function bindHQ() {
  for (const b of document.querySelectorAll('#hqTabs button')) b.addEventListener('click', (e) => { e.stopPropagation(); hooks.sfx.tap(); tab = b.dataset.tab; render(); });
}
