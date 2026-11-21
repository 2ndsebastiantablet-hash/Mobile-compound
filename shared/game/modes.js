// Game modes and local records.
//   STORY      - floors 1-30, beat the Chairman.
//   ENDLESS    - the tower never ends: past floor 30 the floors repeat (from the upper half of the
//                tower) and keep getting harder. A won story run can also keep climbing.
//   DAILY      - the same run for everyone today: a seeded start floor, floor versions, starting
//                weapon, perks and perk offers, plus a modifier of the day. 8 floors, best score counts.
//   BOSS RUSH  - the 10 bosses back to back (the tower's 10 boss levels), perks between fights, fastest time wins.
import { mulberry32 } from '../engine/util.js';

export const MODES = [
  { id: 'story', name: 'STORY', color: '#f0c860', desc: 'Climb all 30 floors and take down the Chairman.' },
  { id: 'endless', name: 'ENDLESS', color: '#80c0ff', desc: 'The tower never ends. How high can you get?', lock: { text: 'REACH FLOOR 10', test: (p) => p.stats.maxFloor >= 10 } },
  { id: 'daily', name: 'DAILY CHALLENGE', color: '#60ff80', desc: 'Same run for everyone today: 8 floors with a twist.', lock: { text: 'REACH FLOOR 3', test: (p) => p.stats.maxFloor >= 3 } },
  { id: 'rush', name: 'BOSS RUSH', color: '#ff6040', desc: 'All 10 bosses back to back. Fastest time wins.', lock: { text: 'DEFEAT 3 BOSSES', test: (p) => p.stats.bossKills >= 3 } },
];
export const MODE = Object.fromEntries(MODES.map((m) => [m.id, m]));
export const modeOpen = (m, profile) => !m.lock || profile.allModes || m.lock.test(profile);

export const RUSH_FLOORS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

// The twist of the day. Each one is a set of knobs (all optional):
//   dmgOut / dmgIn (damage you deal / take), maxHp (your max health), hpMul, killHeal, headHeal, noCoffee,
//   regen (HP/s), enemyHp, enemyCount, enemyScale, enemySpeed, enemyFire (attack delay x), projSpeed,
//   bigHeads, volatile (enemies explode on death), oneHit (enemies die in one hit), headOnly (body shots weak),
//   cash, score, fire (your fire rate), reload, mag, noMedkits, gold (golden enemy chance x), mood (forced lighting),
//   fog (view distance), gun (starting weapon id), meleeOnly
export const DAILY_MODS = [
  { id: 'glass', name: 'GLASS CANNON', desc: 'You deal and take 50% more damage.', dmgOut: 1.5, dmgIn: 1.5 },
  { id: 'bigheads', name: 'BIG HEADS', desc: 'Enemy heads are huge. Headshot kills heal 3 HP.', bigHeads: true, headHeal: 3 },
  { id: 'headcount', name: 'HEADCOUNT', desc: '50% more enemies, each with 30% less health.', enemyCount: 1.5, enemyHp: 0.7 },
  { id: 'nightshift', name: 'NIGHT SHIFT', desc: 'Kills heal 4 HP, but there are no coffee breaks.', killHeal: 4, noCoffee: true, mood: 'night' },
  { id: 'volatile', name: 'VOLATILE', desc: 'Every enemy explodes when it dies.', volatile: true },
  { id: 'onehit', name: 'ONE-HIT WONDER', desc: 'Every enemy dies in one hit. You have 40 max health.', oneHit: true, maxHp: 40 },
  { id: 'blackout', name: 'POWER CUT', desc: 'Every floor is blacked out. Bring your flashlight.', mood: 'blackout', score: 1.3 },
  { id: 'lockdown', name: 'LOCKDOWN', desc: 'Alarms everywhere. Enemies attack 25% more often.', mood: 'emergency', enemyFire: 0.8 },
  { id: 'toxic', name: 'SPILL ON AISLE 5', desc: 'Contaminated floors. You slowly regenerate health.', mood: 'toxic', regen: 1 },
  { id: 'giants', name: 'BIG AND TALL', desc: 'Enemies are giant and twice as tough. Double score.', enemyScale: 1.4, enemyHp: 2, score: 2 },
  { id: 'tiny', name: 'MINI ME', desc: 'Enemies are tiny, fast and fragile.', enemyScale: 0.62, enemySpeed: 1.4, enemyHp: 0.6 },
  { id: 'sloth', name: 'MONDAY MORNING', desc: 'Everyone is slow: enemies move and shoot at half speed. Half score.', enemySpeed: 0.5, enemyFire: 1.8, projSpeed: 0.7, score: 0.5 },
  { id: 'rush', name: 'DEADLINE', desc: 'Enemies move 40% faster and shots fly faster. +50% score.', enemySpeed: 1.4, projSpeed: 1.25, score: 1.5 },
  { id: 'vampire', name: 'BLOOD BANK', desc: 'Kills heal 6 HP. Medkits never drop.', killHeal: 6, noMedkits: true },
  { id: 'sniper', name: 'PRECISION REVIEW', desc: 'Body shots do 25% damage, headshots do 150%.', headOnly: true },
  { id: 'meleemon', name: 'HANDS-ON MANAGEMENT', desc: 'Start with a katana. Guns do half damage.', gun: 'katana', meleeOnly: true },
  { id: 'trigger', name: 'COFFEE OVERDOSE', desc: 'You fire 50% faster but take 25% more damage.', fire: 1.5, dmgIn: 1.25 },
  { id: 'bigmags', name: 'BULK ORDER', desc: 'Triple magazines, slower reloads.', mag: 3, reload: 1.6 },
  { id: 'noreload', name: 'SUPPLY SHORTAGE', desc: 'Half-size magazines, lightning-fast reloads.', mag: 0.5, reload: 0.35 },
  { id: 'payday', name: 'PAYDAY', desc: 'Triple cash. Enemies are 30% tougher.', cash: 3, enemyHp: 1.3 },
  { id: 'goldrush', name: 'GOLD RUSH', desc: 'Golden enemies everywhere (x10 as many).', gold: 10 },
  { id: 'fog', name: 'SMOKE BREAK', desc: 'Thick smoke: you can only see a few metres. +40% score.', fog: 9, score: 1.4 },
  { id: 'tank', name: 'HAZARD PAY', desc: 'You have 250 max health but deal 25% less damage.', maxHp: 250, dmgOut: 0.75 },
  { id: 'fragile', name: 'PAPER CUTS', desc: 'You have 50 max health. Enemies have half health.', maxHp: 50, enemyHp: 0.5 },
  { id: 'swarm', name: 'ALL HANDS MEETING', desc: 'Twice as many enemies, each with half health.', enemyCount: 2, enemyHp: 0.5 },
  { id: 'elite', name: 'SENIOR STAFF', desc: 'Fewer enemies, but each has triple health and hits harder.', enemyCount: 0.6, enemyHp: 3, dmgIn: 1.3, score: 1.5 },
  { id: 'rocket', name: 'DEMOLITION DAY', desc: 'Start with a rocket launcher. Enemies explode on death.', gun: 'rocket', volatile: true },
  { id: 'shotgun', name: 'CLOSE QUARTERS', desc: 'Start with a double barrel. Enemies get close, and fast.', gun: 'dbarrel', enemySpeed: 1.3 },
  { id: 'sniperday', name: 'LONG LUNCH', desc: 'Start with a sniper rifle. Headshots heal 5 HP.', gun: 'sniper', headHeal: 5 },
  { id: 'regen', name: 'WELLNESS PROGRAM', desc: 'Regenerate 3 HP a second, but no coffee breaks or medkits.', regen: 3, noCoffee: true, noMedkits: true },
  { id: 'glasshead', name: 'BRAIN DRAIN', desc: 'Big heads, but body shots barely hurt.', bigHeads: true, headOnly: true, score: 1.3 },
  { id: 'hardcore', name: 'PERFORMANCE IMPROVEMENT PLAN', desc: 'You take double damage. Triple score.', dmgIn: 2, score: 3 },
  { id: 'pacifist', name: 'HR INVESTIGATION', desc: 'Enemies have half health but you deal half damage. Kills pay double.', enemyHp: 0.5, dmgOut: 0.5, cash: 2 },
  { id: 'chain', name: 'CHAIN EMAIL', desc: 'Enemies explode on death and there are 30% more of them.', volatile: true, enemyCount: 1.3 },
  { id: 'darkgold', name: 'AFTER HOURS', desc: 'Night shift lighting, golden enemies x5, +20% score.', mood: 'night', gold: 5, score: 1.2 },
  { id: 'everything', name: 'QUARTERLY CRUNCH', desc: 'Faster enemies, more of them, more damage. Quadruple score.', enemySpeed: 1.25, enemyCount: 1.3, dmgIn: 1.3, score: 4 },
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
