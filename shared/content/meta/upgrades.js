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
  { id: 'sharp', name: 'SHARPSHOOTER', max: 5, base: 160, grow: 1.6, desc: (l) => `Headshots deal +${10 * l}% damage` },
  { id: 'trigger', name: 'TRIGGER DISCIPLINE', max: 5, base: 180, grow: 1.6, desc: (l) => `Fire ${4 * l}% faster with every weapon` },
  { id: 'mags', name: 'BIGGER MAGS', max: 5, base: 140, grow: 1.55, desc: (l) => `+${8 * l}% magazine size` },
  { id: 'coffee', name: 'BETTER COFFEE', max: 3, base: 200, grow: 1.8, desc: (l) => `Coffee breaks heal ${10 * l} more HP` },
  { id: 'responder', name: 'FIRST RESPONDER', max: 3, base: 180, grow: 1.8, desc: (l) => `Medkits heal ${20 * l}% more` },
  { id: 'scrapper', name: 'SCRAPPER', max: 3, base: 220, grow: 1.8, desc: (l) => `Enemies drop weapons ${15 * l}% more often` },
  { id: 'reflexes', name: 'REFLEXES', max: 3, base: 200, grow: 1.8, desc: (l) => `Duck recovers ${15 * l}% faster` },
  { id: 'momentum', name: 'MOMENTUM', max: 3, base: 220, grow: 1.8, desc: (l) => `Combos last ${0.5 * l}s longer` },
  { id: 'orientation', name: 'ORIENTATION', max: 2, base: 900, grow: 2.2, desc: (l) => `Start every run with ${l} random perk${l > 1 ? 's' : ''}` },
  { id: 'clover', name: 'FOUR-LEAF CLOVER', max: 3, base: 300, grow: 1.9, desc: (l) => `Luckier weapon drops (+${10 * l}% luck)` },
  { id: 'goldmagnet', name: 'GOLD MAGNET', max: 3, base: 400, grow: 2, desc: (l) => `Golden enemies (5x cash) appear ${l + 1}x as often` },
];
export const UPGRADE = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
export const upgradeCost = (u, level) => Math.round(u.base * Math.pow(u.grow, level) / 10) * 10;

// Weapon mastery bought in the Armory, levels 1-10:
//   1-5: +12% damage and +10% magazine each, level 5 reloads 20% faster ("MASTERED")
//   6-10: +8% damage and +10% magazine each, level 8 reloads 30% faster,
//   level 10 fires 10% faster and is gold plated ("LEGEND"). Price scales with rarity.
export const WEAPON_MAX = 10;
export const WEAPON_MASTER = 5;
const RARITY_PRICE = { common: 80, uncommon: 120, rare: 180, epic: 260, legendary: 400 };
export const weaponCost = (rarity, level) => Math.round(RARITY_PRICE[rarity] * Math.pow(1.7, Math.min(level, 5)) * Math.pow(1.35, Math.max(0, level - 5)) / 10) * 10;
export const weaponBonus = (level) => ({
  dmg: 1 + 0.12 * Math.min(level, 5) + 0.08 * Math.max(0, level - 5),
  mag: 1 + 0.1 * level,
  reload: level >= 8 ? 0.7 : level >= 5 ? 0.8 : 1,
  cd: level >= 10 ? 0.9 : 1,
});

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
  M.head *= 1 + 0.1 * L('sharp');
  M.cd /= 1 + 0.04 * L('trigger');
  M.mag *= 1 + 0.08 * L('mags');
  M.coffee += 10 * L('coffee');
  M.medkit *= 1 + 0.2 * L('responder');
  M.scavenge *= 1 + 0.15 * L('scrapper');
  M.duckCd = 1 - 0.15 * L('reflexes');
  M.comboWindow += 0.5 * L('momentum');
  M.startPerks = L('orientation');
  M.luck += 0.1 * L('clover');
  M.goldChance = 1 + L('goldmagnet');
  return M;
}
