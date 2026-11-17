// Game modes and local records.
//   STORY      - floors 1-50, beat the Chairman.
//   ENDLESS    - the tower never ends: past floor 50 the floors repeat (from the upper half of the
//                tower) and keep getting harder. A won story run can also keep climbing.
//   DAILY      - the same run for everyone today: a seeded start floor, floor versions, starting
//                weapon, perks and perk offers, plus a modifier of the day. 8 floors, best score counts.
//   BOSS RUSH  - the 10 bosses back to back (floors 5, 10 ... 50), perks between fights, fastest time wins.
import { mulberry32 } from '../engine/util.js';

export const MODES = [
  { id: 'story', name: 'STORY', color: '#f0c860', desc: 'Climb all 50 floors and take down the Chairman.' },
  { id: 'endless', name: 'ENDLESS', color: '#80c0ff', desc: 'The tower never ends. How high can you get?', lock: { text: 'REACH FLOOR 10', test: (p) => p.stats.maxFloor >= 10 } },
  { id: 'daily', name: 'DAILY CHALLENGE', color: '#60ff80', desc: 'Same run for everyone today: 8 floors with a twist.', lock: { text: 'REACH FLOOR 3', test: (p) => p.stats.maxFloor >= 3 } },
  { id: 'rush', name: 'BOSS RUSH', color: '#ff6040', desc: 'All 10 bosses back to back. Fastest time wins.', lock: { text: 'DEFEAT 3 BOSSES', test: (p) => p.stats.bossKills >= 3 } },
];
export const MODE = Object.fromEntries(MODES.map((m) => [m.id, m]));
export const modeOpen = (m, profile) => !m.lock || profile.allModes || m.lock.test(profile);

export const RUSH_FLOORS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

// the twist of the day
export const DAILY_MODS = [
  { id: 'glass', name: 'GLASS CANNON', desc: 'You deal and take 50% more damage.' },
  { id: 'bigheads', name: 'BIG HEADS', desc: 'Enemy heads are huge. Headshot kills heal 3 HP.' },
  { id: 'headcount', name: 'HEADCOUNT', desc: '50% more enemies, each with 30% less health.' },
  { id: 'nightshift', name: 'NIGHT SHIFT', desc: 'Kills heal 4 HP, but there are no coffee breaks.' },
  { id: 'volatile', name: 'VOLATILE', desc: 'Every enemy explodes when it dies.' },
  { id: 'onehit', name: 'ONE-HIT WONDER', desc: 'Every enemy dies in one hit. You have 40 max health.' },
];

export function todayKey(d = new Date()) { return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }

// everything about today's daily run, derived from the date only
export function dailySetup(key = todayKey()) {
  const r = mulberry32(key * 2654435761 >>> 0);
  r(); r();
  const start = 1 + Math.floor(r() * 12);
  return {
    key, start, end: start + 7, seed: Math.floor(r() * 1e9),
    mod: DAILY_MODS[Math.floor(r() * DAILY_MODS.length)],
    variants: Array.from({ length: 8 }, () => Math.floor(r() * 3)),
  };
}

// ---------------------------------------------------------------- local records
// profile.records = { story: [...], endless: [...], rush: [...], daily: { [key]: score } }
export function recordRun(profile, entry) {
  const rec = profile.records || (profile.records = { story: [], endless: [], rush: [], daily: {} });
  if (entry.mode === 'daily') { const k = entry.dailyKey; rec.daily[k] = Math.max(rec.daily[k] || 0, entry.score); return; }
  const list = rec[entry.mode] || (rec[entry.mode] = []);
  const i = list.findIndex((x) => x.run === entry.run);
  if (i >= 0) { const old = list[i]; if (better(entry, old)) list[i] = entry; else return; } else list.push(entry);
  list.sort((a, b) => (better(a, b) ? -1 : 1));
  list.length = Math.min(list.length, 10);
}
function better(a, b) {
  if (a.mode === 'rush') return (a.bosses || 0) !== (b.bosses || 0) ? (a.bosses || 0) > (b.bosses || 0) : (a.time || 1e9) < (b.time || 1e9);
  if (a.mode === 'endless') return a.floor !== b.floor ? a.floor > b.floor : a.score > b.score;
  return a.score > b.score;
}
