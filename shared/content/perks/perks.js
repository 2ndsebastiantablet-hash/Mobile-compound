// Run perks: after every floor the player picks 1 of 3. Perks last for the whole run and
// some stack (max = how many times it can be taken). mods() turns the picked perks into the
// numbers game.js reads (damage multipliers, max HP, etc.).

export const PERK_RARITY = {
  common: { name: 'COMMON', color: '#d8d0c0', w: 10 },
  rare: { name: 'RARE', color: '#50a0ff', w: 4 },
  legendary: { name: 'LEGENDARY', color: '#ffc830', w: 1.2 },
};

// desc(level) describes the perk at the level you'd have AFTER taking it
export const PERKS = [
  // ---- offense
  { id: 'hollow', name: 'HOLLOW POINTS', cat: 'OFFENSE', rarity: 'common', max: 5, desc: (l) => `+${15 * l}% damage with every weapon` },
  { id: 'marksman', name: 'MARKSMAN', cat: 'OFFENSE', rarity: 'common', max: 3, desc: (l) => `Headshots deal +${50 * l}% damage` },
  { id: 'quickhands', name: 'QUICK HANDS', cat: 'OFFENSE', rarity: 'common', max: 3, desc: (l) => `Reload ${[0, 25, 45, 60][l]}% faster` },
  { id: 'trigger', name: 'TRIGGER HAPPY', cat: 'OFFENSE', rarity: 'common', max: 3, desc: (l) => `Fire ${12 * l}% faster` },
  { id: 'extmags', name: 'EXTENDED MAGS', cat: 'OFFENSE', rarity: 'common', max: 3, desc: (l) => `+${30 * l}% magazine size` },
  { id: 'firststrike', name: 'FIRST STRIKE', cat: 'OFFENSE', rarity: 'common', max: 2, desc: (l) => `+${100 * l}% damage to unhurt enemies` },
  { id: 'executioner', name: 'EXECUTIONER', cat: 'OFFENSE', rarity: 'rare', max: 2, desc: (l) => `+${50 * l}% damage to enemies under 30% health` },
  { id: 'bosshunter', name: 'BOSS HUNTER', cat: 'OFFENSE', rarity: 'rare', max: 2, desc: (l) => `+${35 * l}% damage to bosses and mini bosses` },
  { id: 'explosive', name: 'EXPLOSIVE ROUNDS', cat: 'OFFENSE', rarity: 'rare', max: 2, desc: (l) => `${12 * l}% of hits explode` },
  { id: 'incendiary', name: 'INCENDIARY ROUNDS', cat: 'OFFENSE', rarity: 'rare', max: 1, desc: () => 'Every hit sets enemies on fire' },
  { id: 'cryo', name: 'CRYO TIPS', cat: 'OFFENSE', rarity: 'rare', max: 2, desc: (l) => `${15 * l}% of hits freeze the target` },
  { id: 'chain', name: 'CHAIN REACTION', cat: 'OFFENSE', rarity: 'rare', max: 2, desc: (l) => `Kills have a ${20 * l}% chance to explode` },
  { id: 'meleemaster', name: 'MELEE MASTER', cat: 'OFFENSE', rarity: 'common', max: 2, desc: (l) => `Melee weapons +${40 * l}% damage, +${l}m reach` },
  { id: 'overclock', name: 'OVERCLOCK', cat: 'OFFENSE', rarity: 'legendary', max: 1, desc: () => '+40% damage and fire rate, but -20 max health' },
  // ---- defense / sustain
  { id: 'thickskin', name: 'THICK SKIN', cat: 'DEFENSE', rarity: 'common', max: 3, desc: (l) => `+${20 * l} max health` },
  { id: 'armor', name: 'KEVLAR VEST', cat: 'DEFENSE', rarity: 'common', max: 3, desc: (l) => `Take ${[0, 12, 22, 30][l]}% less damage` },
  { id: 'vampire', name: 'BLOODSUCKER', cat: 'DEFENSE', rarity: 'common', max: 3, desc: (l) => `Heal ${2 * l} HP per kill` },
  { id: 'headheal', name: 'HEADHUNTER', cat: 'DEFENSE', rarity: 'common', max: 2, desc: (l) => `Headshot kills heal ${5 * l} HP` },
  { id: 'deflector', name: 'DEFLECTOR FIELD', cat: 'DEFENSE', rarity: 'rare', max: 2, desc: (l) => `${15 * l}% of enemy projectiles fizzle out` },
  { id: 'secondwind', name: 'SECOND WIND', cat: 'DEFENSE', rarity: 'legendary', max: 1, desc: () => 'Once per floor, survive a killing blow with 30 HP' },
  { id: 'coffee', name: 'DOUBLE ESPRESSO', cat: 'DEFENSE', rarity: 'common', max: 2, desc: (l) => `Heal +${30 * l} more HP between floors` },
  { id: 'medic', name: 'FIELD MEDIC', cat: 'DEFENSE', rarity: 'common', max: 2, desc: (l) => `Medkits heal ${50 * l}% more and drop more often` },
  { id: 'orbpop', name: 'ORB POPPER', cat: 'DEFENSE', rarity: 'common', max: 2, desc: (l) => `Shooting a projectile heals ${2 * l} HP` },
  { id: 'slowmo', name: 'BULLET TIME', cat: 'DEFENSE', rarity: 'rare', max: 2, desc: (l) => `Enemy projectiles move ${15 * l}% slower` },
  // ---- utility
  { id: 'reloadkill', name: 'RELOAD ON KILL', cat: 'UTILITY', rarity: 'common', max: 3, desc: (l) => `Kills put ${2 * l} rounds back in your gun` },
  { id: 'combo', name: 'COMBO KING', cat: 'UTILITY', rarity: 'common', max: 3, desc: (l) => `Combo window +${1.5 * l}s, max combo +${4 * l}` },
  { id: 'lucky', name: 'LUCKY CHARM', cat: 'UTILITY', rarity: 'rare', max: 2, desc: (l) => `Better weapon drops (${30 * l}% chance to upgrade rarity)` },
  { id: 'scavenger', name: 'SCAVENGER', cat: 'UTILITY', rarity: 'common', max: 2, desc: (l) => `Weapon drops ${60 * l}% more often` },
  { id: 'autoloader', name: 'AUTO-LOADER', cat: 'UTILITY', rarity: 'rare', max: 1, desc: () => 'Guns you are not holding reload themselves' },
  { id: 'fastswap', name: 'FAST HANDS', cat: 'UTILITY', rarity: 'common', max: 1, desc: () => 'Instant weapon swaps' },
  { id: 'greed', name: 'OVERACHIEVER', cat: 'UTILITY', rarity: 'common', max: 3, desc: (l) => `+${25 * l}% score` },
];
export const PERK = Object.fromEntries(PERKS.map((p) => [p.id, p]));

// Roll `n` different perk offers the player can still take. `minRare` guarantees one rare+ (after bosses).
export function rollPerks(levels, n = 3, rng = Math.random, minRare = false) {
  const pool = PERKS.filter((p) => (levels[p.id] || 0) < p.max);
  const out = [];
  while (out.length < n && pool.length) {
    const cand = minRare && out.length === 0 ? pool.filter((p) => p.rarity !== 'common') : pool;
    const list = cand.length ? cand : pool;
    let total = list.reduce((a, p) => a + PERK_RARITY[p.rarity].w, 0), r = rng() * total;
    let pick = list[list.length - 1];
    for (const p of list) if ((r -= PERK_RARITY[p.rarity].w) <= 0) { pick = p; break; }
    out.push(pick.id);
    pool.splice(pool.indexOf(pick), 1);
  }
  return out;
}

// Derived modifiers the game reads. All neutral (1 or 0) with no perks.
export function mods(levels) {
  const L = (id) => levels[id] || 0;
  const oc = L('overclock');
  return {
    dmg: (1 + 0.15 * L('hollow')) * (oc ? 1.4 : 1),
    head: 1 + 0.5 * L('marksman'),
    reload: 1 - [0, 0.25, 0.45, 0.6][L('quickhands')],
    cd: 1 / ((1 + 0.12 * L('trigger')) * (oc ? 1.4 : 1)),
    mag: 1 + 0.3 * L('extmags'),
    firstStrike: 1 + L('firststrike'),
    exec: 1 + 0.5 * L('executioner'),
    boss: 1 + 0.35 * L('bosshunter'),
    explodeChance: 0.12 * L('explosive'),
    burn: L('incendiary') ? 0.8 : 0,
    freezeChance: 0.15 * L('cryo'),
    chainKill: 0.2 * L('chain'),
    meleeDmg: 1 + 0.4 * L('meleemaster'), meleeReach: L('meleemaster'),
    maxHp: 100 + 20 * L('thickskin') - (oc ? 20 : 0),
    armor: 1 - [0, 0.12, 0.22, 0.3][L('armor')],
    killHeal: 2 * L('vampire'),
    headHeal: 5 * L('headheal'),
    deflect: 0.15 * L('deflector'),
    secondWind: L('secondwind') > 0,
    coffee: 30 * L('coffee'),
    medkit: 1 + 0.5 * L('medic'),
    orbHeal: 2 * L('orbpop'),
    projSpeed: 1 - 0.15 * L('slowmo'),
    reloadKill: 2 * L('reloadkill'),
    comboWindow: 2.5 + 1.5 * L('combo'), comboMax: 8 + 4 * L('combo'),
    luck: 0.3 * L('lucky'),
    scavenge: 1 + 0.6 * L('scavenger'),
    autoload: L('autoloader') > 0,
    fastSwap: L('fastswap') > 0,
    score: 1 + 0.25 * L('greed'),
  };
}
