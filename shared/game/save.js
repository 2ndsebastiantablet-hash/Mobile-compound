// Run save: written automatically at the start of every floor, so a run can be continued
// after closing the game, quitting to the title, or dying (retry restarts that floor).
import { storeGet, storeSet } from '../engine/util.js';

const KEY = 'overtime.run';
const VERSION = 1;

export function saveRun(run) {
  storeSet(KEY, { v: VERSION, ts: Date.now(), ...run });
}

export function loadRun() {
  const r = storeGet(KEY, null);
  if (!r || r.v !== VERSION || !r.floor || !Array.isArray(r.inv) || !r.inv.length) return null;
  return r;
}

export function clearRun() { storeSet(KEY, null); }
