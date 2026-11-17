// The player's permanent profile: cash wallet, upgrades, weapon levels, unlocked employees,
// achievements and lifetime stats. Saved per device in localStorage ("overtime.profile").
import { storeGet, storeSet } from '../engine/util.js';

const KEY = 'overtime.profile';
const blank = () => ({
  v: 1, cash: 0, upgrades: {}, weapons: {}, chars: {}, found: {}, ach: {}, char: 'temp', diff: 1,
  stats: { kills: 0, heads: 0, orbs: 0, meleeKills: 0, bossKills: 0, miniKills: 0, maxFloor: 0, wins: 0, spent: 0, perksTaken: 0, saves: 0, typesSeen: 0, runs: 0, earned: 0 },
});

const saved = storeGet(KEY, null);
export const profile = Object.assign(blank(), saved || {});
profile.stats = Object.assign(blank().stats, profile.stats || {});

let dirty = false;
export function touch() { dirty = true; }
export function flushProfile(force) { if (dirty || force) { storeSet(KEY, profile); dirty = false; } }

export function addCash(n) { n = Math.max(0, Math.round(n)); profile.cash += n; profile.stats.earned += n; dirty = true; return n; }
export function spend(n) {
  if (profile.cash < n) return false;
  profile.cash -= n; profile.stats.spent += n; flushProfile(true);
  return true;
}
export function stat(key, inc = 1) { profile.stats[key] = (profile.stats[key] || 0) + inc; dirty = true; }
export function statMax(key, v) { if (v > (profile.stats[key] || 0)) { profile.stats[key] = v; dirty = true; } }
export function resetProfile() { Object.assign(profile, blank()); flushProfile(true); }
