// Completion: how much of the game you've done, as one percentage.
// NEW GAME+ and the FREE ROAM add-on unlock once Story is beaten on all four difficulties.
//   achievements · enemy log (enemies + bosses) · files found · weapons found · employees ·
//   endings (one per difficulty, plus the New Game+ ending)
import { profile } from './profile.js';
import { ACHIEVEMENTS } from '../content/meta/achievements.js';
import { DEFS } from '../content/enemies/roster.js';
import { LORE } from '../content/meta/lore.js';
import { GUNS } from '../content/weapons/weapons.js';
import { CHARACTERS, isUnlocked } from '../content/meta/characters.js';

export function completionParts() {
  const bl = profile.bestiary || {}, ends = profile.endings || {};
  const foes = Object.entries(DEFS).filter(([id, d]) => id !== 'pylon' && d.model && (d.boss || d.floors));
  const guns = GUNS.filter((g) => !g.hidden);
  return [
    { name: 'AWARDS', have: ACHIEVEMENTS.filter((a) => profile.ach[a.id]).length, of: ACHIEVEMENTS.length },
    { name: 'ENEMY LOG', have: foes.filter(([id]) => bl[id]).length, of: foes.length },
    { name: 'FILES', have: LORE.filter((l) => (profile.lore || {})[l.id]).length, of: LORE.length },
    { name: 'WEAPONS', have: guns.filter((g) => profile.found[g.id]).length, of: guns.length },
    { name: 'EMPLOYEES', have: CHARACTERS.filter((c) => isUnlocked(c, profile)).length, of: CHARACTERS.length },
    { name: 'ENDINGS', have: [0, 1, 2, 3, 'ngp'].filter((k) => ends[k]).length, of: 5 },
  ];
}
// the average of the parts, so every part matters equally
export function completion() {
  const parts = completionParts();
  const pct = parts.reduce((a, p) => a + Math.min(1, p.have / Math.max(1, p.of)), 0) / parts.length * 100;
  return pct >= 99.999 ? 100 : Math.floor(pct);
}
export const endingsDone = () => [0, 1, 2, 3].filter((k) => (profile.endings || {})[k]).length;
export const allEndings = () => endingsDone() >= 4;
export const roamUnlocked = () => !!(profile.allModes || allEndings());
