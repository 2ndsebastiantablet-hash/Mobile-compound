// Player settings: schema (drives the settings screen), defaults, persistence.
// Values are stored per device in localStorage under "overtime.settings".
import { storeGet, storeSet } from '../engine/util.js';

export const SCHEMA = [
  { key: 'music', label: 'MUSIC VOLUME', type: 'range', def: 70 },
  { key: 'sfx', label: 'SOUND FX VOLUME', type: 'range', def: 85 },
  { key: 'aim', label: 'AIM ASSIST', type: 'choice', options: ['OFF', 'LOW', 'NORMAL', 'HIGH'], def: 2 },
  { key: 'gfx', label: 'GRAPHICS', type: 'choice', options: ['LOW', 'MEDIUM', 'HIGH'], def: 1, hint: 'LOWER = FASTER ON OLDER DEVICES' },
  { key: 'shake', label: 'SCREEN SHAKE', type: 'choice', options: ['OFF', 'ON'], def: 1 },
  { key: 'lefty', label: 'LEFT-HANDED HUD', type: 'choice', options: ['OFF', 'ON'], def: 0, mobileOnly: true },
  { key: 'tutorial', label: 'TUTORIAL', type: 'action', text: 'REPLAY NEXT RUN' },
];

// numbers the game reads, per option index
export const AIM_MULT = [0, 0.5, 1, 1.6];
export const RES_MOBILE = [220, 340, 480];
export const RES_PC = [300, 400, 600];
export const FX_MULT = [0.5, 1, 1];

const KEY = 'overtime.settings';
export const settings = Object.assign(Object.fromEntries(SCHEMA.filter((s) => s.type !== 'action').map((s) => [s.key, s.def])), storeGet(KEY, {}));

const listeners = [];
export function onSettingsChange(fn) { listeners.push(fn); fn(settings); }
export function setSetting(key, value) {
  settings[key] = value;
  storeSet(KEY, settings);
  for (const fn of listeners) fn(settings, key);
}

// tutorial completion is tracked separately so "replay" can reset it
export const tutorialDone = () => storeGet('overtime.tutorialDone', false);
export const setTutorialDone = (v) => storeSet('overtime.tutorialDone', v);
