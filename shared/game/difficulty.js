// Difficulty modes. Picked when a run starts and fixed for that run (it is part of the save).
// dmg: damage you take · hp: enemy health · fire: time between enemy attacks (lower = more often)
// proj: enemy projectile speed · count: enemies per area · alive: extra enemies on screen at once
// heal: coffee-break healing between floors · cash / score: rewards
export const DIFFS = [
  { id: 'easy', name: 'EASY', color: '#70e070', desc: 'Enemies are weaker, slower to shoot and fewer. Less cash.',
    dmg: 0.55, hp: 0.8, fire: 1.3, proj: 0.88, count: 0.8, alive: -1, heal: 1.5, cash: 0.7, score: 0.7 },
  { id: 'medium', name: 'MEDIUM', color: '#f0c860', desc: 'The intended experience.',
    dmg: 1, hp: 1, fire: 1, proj: 1, count: 1, alive: 0, heal: 1, cash: 1, score: 1 },
  { id: 'hard', name: 'HARD', color: '#ff9040', desc: 'Tougher, faster, more of them. +35% cash.',
    dmg: 1.35, hp: 1.25, fire: 0.85, proj: 1.08, count: 1.15, alive: 1, heal: 0.75, cash: 1.35, score: 1.3 },
  { id: 'xhard', name: 'EXTRA HARD', color: '#ff4040', desc: 'For veterans. Brutal damage, half the healing. +75% cash.',
    dmg: 1.8, hp: 1.5, fire: 0.72, proj: 1.15, count: 1.3, alive: 2, heal: 0.5, cash: 1.75, score: 1.6 },
];
export const diffOf = (i) => DIFFS[i] || DIFFS[1];
