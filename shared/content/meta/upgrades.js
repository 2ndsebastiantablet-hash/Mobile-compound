// Permanent upgrades bought with cash at HQ. They apply to every future run.
// cost(level) = price of the NEXT level (level = levels already owned).

export const UPGRADES = [
  { id: 'vitality', name: 'VITALITY', max: 5, base: 150, grow: 1.6, desc: (l) => `+${10 * l} max health` },
  { id: 'firepower', name: 'FIREPOWER', max: 5, base: 200, grow: 1.6, desc: (l) => `+${6 * l}% damage with every weapon` },
  { id: 'loader', name: 'SPEED LOADER', max: 5, base: 120, grow: 1.5, desc: (l) => `Reload ${8 * l}% faster` },
  { id: 'plating', name: 'BODY PLATING', max: 5, base: 180, grow: 1.6, desc: (l) => `Take ${4 * l}% less damage` },
  { id: 'firstaid', name: 'FIRST AID KIT', max: 3, base: 150, grow: 1.8, desc: (l) => `Heal ${10 * l} HP at the start of every floor` },
  { id: 'bounty', name: 'BOUNTY HUNTER', max: 5, base: 100, grow: 1.7, desc: (l) => `+${10 * l}% cash from everything` },
  { id: 'scholar', name: 'PERK SCHOLAR', max: 3, base: 250, grow: 2.0, desc: (l) => `+${l} free perk reroll${l > 1 ? 's' : ''} per run` },
  { id: 'fourth', name: 'MORE OPTIONS', max: 1, base: 1500, grow: 1, desc: () => 'Perk choices show 4 perks instead of 3' },
  { id: 'backpack', name: 'BACKPACK', max: 1, base: 2500, grow: 1, desc: () => 'Carry 4 weapons instead of 3' },
  { id: 'luckystart', name: 'SIGNING BONUS', max: 1, base: 800, grow: 1, desc: () => 'Start every run with a random uncommon-or-better weapon' },
  { id: 'insurance', name: 'LIFE INSURANCE', max: 2, base: 1200, grow: 2.5, desc: (l) => `Revive ${l === 1 ? 'once' : 'twice'} per run with half health` },
];
export const UPGRADE = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
export const upgradeCost = (u, level) => Math.round(u.base * Math.pow(u.grow, level) / 10) * 10;

// Weapon mastery bought in the Armory: +12% damage and +10% magazine per level,
// level 5 also reloads 20% faster. Price scales with the weapon's rarity.
export const WEAPON_MAX = 5;
const RARITY_PRICE = { common: 80, uncommon: 120, rare: 180, epic: 260, legendary: 400 };
export const weaponCost = (rarity, level) => Math.round(RARITY_PRICE[rarity] * Math.pow(1.7, level) / 10) * 10;
export const weaponBonus = (level) => ({ dmg: 1 + 0.12 * level, mag: 1 + 0.1 * level, reload: level >= WEAPON_MAX ? 0.8 : 1 });

// Fold permanent upgrades into the run's modifier object (from perks.mods()).
export function applyUpgrades(M, up) {
  const L = (id) => up[id] || 0;
  M.maxHp += 10 * L('vitality');
  M.dmg *= 1 + 0.06 * L('firepower');
  M.reload *= 1 - 0.08 * L('loader');
  M.armor *= 1 - 0.04 * L('plating');
  M.floorHeal = 10 * L('firstaid');
  M.cash = 1 + 0.1 * L('bounty');
  M.extraRerolls = L('scholar');
  M.perkChoices = 3 + L('fourth');
  M.maxGuns = 3 + L('backpack');
  M.luckyStart = L('luckystart') > 0;
  M.revives = L('insurance');
  return M;
}
