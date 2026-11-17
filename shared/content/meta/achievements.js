// Achievements: test(profile, run) is checked after game events; reward is cash.
// profile.stats holds lifetime totals; run holds the current run/floor numbers.

export const ACHIEVEMENTS = [
  // getting started
  { id: 'firstblood', name: 'FIRST BLOOD', desc: 'Get your first kill', reward: 25, test: (p) => p.stats.kills >= 1 },
  { id: 'clockin', name: 'CLOCKED IN', desc: 'Clear floor 1', reward: 50, test: (p) => p.stats.maxFloor >= 2 },
  { id: 'firstperk', name: 'EMPLOYEE BENEFITS', desc: 'Take your first perk', reward: 50, test: (p) => p.stats.perksTaken >= 1 },
  { id: 'firstbuy', name: 'RETAIL THERAPY', desc: 'Buy anything at HQ', reward: 50, test: (p) => p.stats.spent > 0 },
  // climbing
  { id: 'floor5', name: 'MIDDLE MANAGEMENT', desc: 'Reach floor 5', reward: 100, test: (p) => p.stats.maxFloor >= 5 },
  { id: 'floor10', name: 'PROMOTED', desc: 'Reach floor 10', reward: 200, test: (p) => p.stats.maxFloor >= 10 },
  { id: 'floor20', name: 'CORNER OFFICE', desc: 'Reach floor 20', reward: 400, test: (p) => p.stats.maxFloor >= 20 },
  { id: 'floor30', name: 'UPPER MANAGEMENT', desc: 'Reach floor 30', reward: 700, test: (p) => p.stats.maxFloor >= 30 },
  { id: 'floor40', name: 'BOARD MEMBER', desc: 'Reach floor 40', reward: 1000, test: (p) => p.stats.maxFloor >= 40 },
  { id: 'win', name: 'HOSTILE TAKEOVER', desc: 'Beat floor 50', reward: 3000, test: (p) => p.stats.wins >= 1 },
  { id: 'hard10', name: 'OVERACHIEVER', desc: 'Reach floor 10 on Hard or harder', reward: 500, test: (p, r) => r && r.diff >= 2 && r.floor >= 10 },
  { id: 'xhard25', name: 'WORKAHOLIC', desc: 'Reach floor 25 on Extra Hard', reward: 1500, test: (p, r) => r && r.diff >= 3 && r.floor >= 25 },
  { id: 'hardwin', name: 'CEO MATERIAL', desc: 'Beat floor 50 on Hard or harder', reward: 5000, test: (p, r) => r && r.won && r.diff >= 2 },
  // bosses
  { id: 'mini1', name: 'MINOR SETBACK', desc: 'Defeat a mini boss', reward: 100, test: (p) => p.stats.miniKills >= 1 },
  { id: 'boss1', name: 'PERFORMANCE REVIEW', desc: 'Defeat a boss', reward: 200, test: (p) => p.stats.bossKills >= 1 },
  { id: 'boss5', name: 'RESTRUCTURING', desc: 'Defeat 5 bosses', reward: 600, test: (p) => p.stats.bossKills >= 5 },
  { id: 'mini10', name: 'DOWNSIZER', desc: 'Defeat 10 mini bosses', reward: 600, test: (p) => p.stats.miniKills >= 10 },
  // combat
  { id: 'kills250', name: 'LAYOFFS', desc: 'Kill 250 enemies', reward: 150, test: (p) => p.stats.kills >= 250 },
  { id: 'kills2000', name: 'EXTERMINATOR', desc: 'Kill 2,000 enemies', reward: 800, test: (p) => p.stats.kills >= 2000 },
  { id: 'heads100', name: 'HEADHUNTER', desc: 'Land 100 headshot kills', reward: 200, test: (p) => p.stats.heads >= 100 },
  { id: 'orbs100', name: 'INBOX ZERO', desc: 'Shoot down 100 projectiles', reward: 200, test: (p) => p.stats.orbs >= 100 },
  { id: 'melee50', name: 'HANDS ON', desc: 'Get 50 melee kills', reward: 200, test: (p) => p.stats.meleeKills >= 50 },
  { id: 'combo8', name: 'MULTITASKER', desc: 'Reach an x8 combo', reward: 150, test: (p, r) => r && r.maxCombo >= 8 },
  { id: 'nodamage', name: 'UNTOUCHABLE', desc: 'Clear a floor without taking damage', reward: 300, test: (p, r) => r && r.floorCleared && r.floorDmg === 0 },
  { id: 'accuracy', name: 'SHARPSHOOTER', desc: 'Clear a floor with 85%+ accuracy (30+ shots)', reward: 250, test: (p, r) => r && r.floorCleared && r.shots >= 30 && r.hits / r.shots >= 0.85 },
  { id: 'speed', name: 'EFFICIENT', desc: 'Clear a floor in under 90 seconds', reward: 250, test: (p, r) => r && r.floorCleared && r.floorTime < 90 },
  { id: 'secondwind', name: 'NOT TODAY', desc: 'Get saved by Second Wind or insurance', reward: 150, test: (p) => p.stats.saves >= 1 },
  // collecting
  { id: 'perks8', name: 'FULL BENEFITS', desc: 'Have 8 perks in one run', reward: 300, test: (p, r) => r && r.perkCount >= 8 },
  { id: 'guns10', name: 'COLLECTOR', desc: 'Find 10 different weapons', reward: 200, test: (p) => Object.keys(p.found).length >= 10 },
  { id: 'guns40', name: 'ARMORY', desc: 'Find all 40 weapons', reward: 1500, test: (p) => Object.keys(p.found).length >= 40 },
  { id: 'golden', name: 'GOLDEN TICKET', desc: 'Find the Golden Gun', reward: 300, test: (p) => !!p.found.golden },
  { id: 'master', name: 'MASTERY', desc: 'Upgrade a weapon to level 5', reward: 300, test: (p) => Object.values(p.weapons).some((l) => l >= 5) },
  { id: 'bestiary', name: 'FIELD GUIDE', desc: 'Encounter 50 enemy types', reward: 400, test: (p) => p.stats.typesSeen >= 50 },
  { id: 'lore1', name: 'READING MATERIAL', desc: 'Find a memo', reward: 50, test: (p) => Object.keys(p.lore || {}).length >= 1 },
  { id: 'lore15', name: 'OFFICE GOSSIP', desc: 'Find 15 memos', reward: 600, test: (p) => Object.keys(p.lore || {}).length >= 15 },
  { id: 'lore30', name: 'WHISTLEBLOWER', desc: 'Find all 30 memos', reward: 2000, test: (p) => Object.keys(p.lore || {}).length >= 30 },
  { id: 'staff', name: 'FULL STAFF', desc: 'Unlock every employee', reward: 1000, test: (p, r, allChars) => allChars && allChars() },
];
