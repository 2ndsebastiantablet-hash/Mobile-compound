// Mutations: on EXTRA HARD the supplement gets to you. Between floors you don't get perks,
// you mutate: every mutation changes your body, gives you something strong, and costs you
// something (the downside is always written on the card). Each one can be taken once
// unless it says x2. `tint` colours your arms on screen as the mutations pile up.
//
// apply(M, level) edits the run's modifier object after perks and upgrades.
// Extra knobs used only by mutations: thorns, acidBlood, healMul, crit, lowHpDmg, dodge,
// noDuck, regen, enemyHpMul.

export const MUTATIONS = [
  { id: 'eye', name: 'THIRD EYE', up: 'Headshots deal +40% damage', down: '-10 max health', tint: 0xb06060, apply: (M) => { M.head *= 1.4; M.maxHp -= 10; } },
  { id: 'claws', name: 'BONE CLAWS', up: 'Melee +60% damage and +1m reach', down: 'Reload 25% slower', tint: 0xe0d8c0, apply: (M) => { M.meleeDmg *= 1.6; M.meleeReach += 1; M.reload *= 1.25; } },
  { id: 'hide', name: 'THICK HIDE', max: 2, up: 'Take 20% less damage', down: 'Fire 12% slower', tint: 0x7a6a50, apply: (M) => { M.armor *= 0.8; M.cd *= 1.12; } },
  { id: 'adrenal', name: 'ADRENAL GLAND', max: 2, up: 'Fire 22% faster', down: 'Take 12% more damage', tint: 0xd06040, apply: (M) => { M.cd /= 1.22; M.armor *= 1.12; } },
  { id: 'tongue', name: 'LEECH TONGUE', up: 'Kills heal 4 HP', down: '-20 max health', tint: 0xc04060, apply: (M) => { M.killHeal += 4; M.maxHp -= 20; } },
  { id: 'spines', name: 'SPINES', up: 'Enemies that hit you up close take 5 damage', down: 'Coffee breaks heal half as much', tint: 0x404040, apply: (M) => { M.thorns = (M.thorns || 0) + 5; M.coffeeMul = (M.coffeeMul ?? 1) * 0.5; } },
  { id: 'muscle', name: 'MUSCLE MASS', max: 2, up: '+22% damage with every weapon', down: 'Ducking recovers twice as slowly', tint: 0xc07060, apply: (M) => { M.dmg *= 1.22; M.duckCd = (M.duckCd || 1) * 2; } },
  { id: 'gills', name: 'GILLS', up: 'Regenerate 1 HP every second', down: '-15 max health', tint: 0x60a0a0, apply: (M) => { M.regen = (M.regen || 0) + 1; M.maxHp -= 15; } },
  { id: 'heart', name: 'TWIN HEART', up: '+40 max health', down: 'Reload 20% slower', tint: 0xa02030, apply: (M) => { M.maxHp += 40; M.reload *= 1.2; } },
  { id: 'scales', name: 'MIRROR SCALES', up: '20% of enemy shots fizzle out on you', down: '-10% damage', tint: 0x90b0c0, apply: (M) => { M.deflect = Math.min(0.7, M.deflect + 0.2); M.dmg *= 0.9; } },
  { id: 'tumor', name: 'LUCKY TUMOR', up: 'Much luckier weapon drops', down: '-10 max health', tint: 0xc0a060, apply: (M) => { M.luck += 0.4; M.maxHp -= 10; } },
  { id: 'acid', name: 'ACID BLOOD', up: 'When you are hit, enemies near you take 4 damage', down: 'Medkits heal half as much', tint: 0x80d040, apply: (M) => { M.acidBlood = (M.acidBlood || 0) + 4; M.medkit *= 0.5; } },
  { id: 'flesh', name: 'QUICK FLESH', up: 'All healing +50%', down: '-15 max health', tint: 0xe08080, apply: (M) => { M.healMul = (M.healMul || 1) * 1.5; M.maxHp -= 15; } },
  { id: 'arms', name: 'STRETCHY ARMS', up: '+40% magazine size', down: 'Reload 15% slower', tint: 0xd0a080, apply: (M) => { M.mag *= 1.4; M.reload *= 1.15; } },
  { id: 'hive', name: 'HIVE MIND', up: 'Enemy shots fly 15% slower', down: 'Enemies have 10% more health', tint: 0xa080c0, apply: (M) => { M.projSpeed *= 0.85; M.enemyHpMul = (M.enemyHpMul || 1) * 1.1; } },
  { id: 'nerves', name: 'FRAYED NERVES', up: 'Combos last 2s longer and go 4 higher', down: 'Take 10% more damage', tint: 0xe0e060, apply: (M) => { M.comboWindow += 2; M.comboMax += 4; M.armor *= 1.1; } },
  { id: 'stalks', name: 'EYESTALKS', up: '15% of hits are critical (double damage)', down: 'Fire 10% slower', tint: 0x60a060, apply: (M) => { M.crit = (M.crit || 0) + 0.15; M.cd *= 1.1; } },
  { id: 'carapace', name: 'CARAPACE', up: '+50 max health', down: 'You can no longer duck', tint: 0x504030, apply: (M) => { M.maxHp += 50; M.noDuck = true; } },
  { id: 'venom', name: 'VENOM GLANDS', up: 'Every hit poisons the enemy', down: '-15% damage', tint: 0x70b030, apply: (M) => { M.burn = Math.max(M.burn, 0.7); M.dmg *= 0.85; } },
  { id: 'bloodlust', name: 'BLOODLUST', up: '+40% damage while below half health', down: '-10 max health', tint: 0x900000, apply: (M) => { M.lowHpDmg = (M.lowHpDmg || 0) + 0.4; M.maxHp -= 10; } },
  { id: 'phase', name: 'PHASE SKIN', up: '18% chance to take no damage from a hit', down: '-25% cash', tint: 0x8090ff, apply: (M) => { M.dodge = (M.dodge || 0) + 0.18; M.cash *= 0.75; } },
  { id: 'metabolism', name: 'HYPER METABOLISM', up: 'Reload 35% faster', down: 'No coffee break healing', tint: 0xe0c040, apply: (M) => { M.reload *= 0.65; M.coffeeMul = 0; } },
  { id: 'magnet', name: 'FLESH MAGNET', up: 'Enemies drop weapons 60% more often', down: '-10 max health', tint: 0x9070a0, apply: (M) => { M.scavenge *= 1.6; M.maxHp -= 10; } },
  { id: 'cells', name: 'VOLATILE CELLS', up: '20% of your hits explode', down: 'Take 15% more damage', tint: 0xff7030, apply: (M) => { M.explodeChance += 0.2; M.armor *= 1.15; } },
  { id: 'regrow', name: 'REGROWTH', up: 'Once per floor, survive a killing blow with 30 HP', down: '-10% damage', tint: 0x60c080, apply: (M) => { M.secondWind = true; M.dmg *= 0.9; } },
  { id: 'twin', name: 'CONJOINED TWIN', up: 'Fire 40% faster', down: '-20% damage', tint: 0xc0a0a0, apply: (M) => { M.cd /= 1.4; M.dmg *= 0.8; } },
  { id: 'brain', name: 'SWOLLEN BRAIN', up: '+50% score and +30% cash', down: '-20 max health', tint: 0xd090b0, apply: (M) => { M.score *= 1.5; M.cash *= 1.3; M.maxHp -= 20; } },
  { id: 'cold', name: 'COLD BLOOD', up: '20% of hits freeze the enemy', down: 'Fire 10% slower', tint: 0x80c0ff, apply: (M) => { M.freezeChance += 0.2; M.cd *= 1.1; } },
  { id: 'echo', name: 'ECHOLOCATION', up: 'Shooting down a projectile heals 4 HP', down: '-10% damage', tint: 0xa0a0c0, apply: (M) => { M.orbHeal += 4; M.dmg *= 0.9; } },
  { id: 'gut', name: 'IRON GUT', up: 'Medkits heal twice as much and drop more', down: 'Enemies drop fewer weapons', tint: 0x707070, apply: (M) => { M.medkit *= 2; M.scavenge *= 0.5; } },
];
export const MUTATION = Object.fromEntries(MUTATIONS.map((m) => [m.id, m]));

// fold the run's mutations into M
export function applyMutations(M, lv) {
  for (const [id, n] of Object.entries(lv || {})) { const m = MUTATION[id]; if (m) for (let k = 0; k < n; k++) m.apply(M); }
  M.maxHp = Math.max(25, M.maxHp);
  return M;
}

// n mutations to choose from (ones you haven't maxed)
export function rollMutations(lv, n = 3, rng = Math.random) {
  const pool = MUTATIONS.filter((m) => (lv[m.id] || 0) < (m.max || 1));
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0].id);
  return out;
}

// arm colour on screen: blends toward the tints of everything you've grown
export function mutationTint(lv) {
  const ids = Object.keys(lv || {}).filter((k) => lv[k] > 0 && MUTATION[k]);
  if (!ids.length) return null;
  let r = 0, g = 0, b = 0;
  for (const id of ids) { const t = MUTATION[id].tint; r += (t >> 16) & 255; g += (t >> 8) & 255; b += t & 255; }
  return { r: r / ids.length / 255, g: g / ids.length / 255, b: b / ids.length / 255, amount: Math.min(0.85, ids.length * 0.12) };
}
