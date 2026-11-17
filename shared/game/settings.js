// Player settings: schema (drives the settings screen), defaults, persistence.
// Values are stored per device in localStorage under "overtime.settings".
import { storeGet, storeSet } from '../engine/util.js';

export const SCHEMA = [
  { key: 'music', label: 'MUSIC VOLUME', type: 'range', def: 70 },
  { key: 'sfx', label: 'SOUND FX VOLUME', type: 'range', def: 85 },
  { key: 'aim', label: 'AIM ASSIST', type: 'choice', options: ['OFF', 'LOW', 'NORMAL', 'HIGH'], def: 2 },
  { key: 'sens', label: 'MOUSE SPEED', type: 'choice', options: ['0.5X', '0.75X', '1X', '1.5X', '2X'], def: 2, pcOnly: true },
  { key: 'weight', label: 'GUN WEIGHT', type: 'choice', options: ['OFF', 'ON'], def: 1, pcOnly: true, hint: 'HEAVY GUNS AIM SLOWER' },
  { key: 'lock', label: 'CAPTURE MOUSE', type: 'choice', options: ['OFF', 'ON'], def: 1, pcOnly: true, hint: 'OFF = SYSTEM CURSOR (SPEED + WEIGHT DO NOTHING)' },
  { key: 'gfx', label: 'GRAPHICS', type: 'choice', options: ['LOW', 'MEDIUM', 'HIGH'], def: 1, hint: 'LOWER = FASTER ON OLDER DEVICES' },
  { key: 'shake', label: 'SCREEN SHAKE', type: 'choice', options: ['OFF', 'ON'], def: 1 },
  { key: 'lefty', label: 'LEFT-HANDED HUD', type: 'choice', options: ['OFF', 'ON'], def: 0, mobileOnly: true },
  { key: 'dev', label: 'DEVELOPER MODE', type: 'choice', options: ['OFF', 'ON'], def: 0, dev: true, hint: 'GOD MODE, GIVE WEAPONS/PERKS, SKIP FLOORS (` KEY ON PC)' },
  { key: 'tutorial', label: 'TUTORIAL', type: 'action', text: 'REPLAY NEXT RUN' },
];

// Developer tools are offered in settings while this is true. Set it to false for release builds.
export const DEV_BUILD = true;

// numbers the game reads, per option index
export const AIM_MULT = [0, 0.5, 1, 1.6];
export const SENS_MULT = [0.5, 0.75, 1, 1.5, 2];
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
