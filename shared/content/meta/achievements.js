// Achievements: test(profile, run) is checked after game events; reward is cash.
// cat groups them in the AWARDS tab; prog(profile) (on the tiered ones) shows progress.
import { DEFS } from '../enemies/roster.js';
import { DAILY_MODS } from '../../game/modes.js';
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
  { id: 'floor20', name: 'CORNER OFFICE', desc: 'Reach floor 15', reward: 400, test: (p) => p.stats.maxFloor >= 15 },
  { id: 'floor30', name: 'UPPER MANAGEMENT', desc: 'Reach floor 20', reward: 700, test: (p) => p.stats.maxFloor >= 20 },
  { id: 'floor40', name: 'BOARD MEMBER', desc: 'Reach floor 25', reward: 1000, test: (p) => p.stats.maxFloor >= 25 },
  { id: 'win', name: 'HOSTILE TAKEOVER', desc: 'Beat floor 30', reward: 3000, test: (p) => p.stats.wins >= 1 },
  { id: 'hard10', name: 'OVERACHIEVER', desc: 'Reach floor 10 on Hard or harder', reward: 500, test: (p, r) => r && r.diff >= 2 && r.floor >= 10 },
  { id: 'xhard25', name: 'WORKAHOLIC', desc: 'Reach floor 20 on Extra Hard', reward: 1500, test: (p, r) => r && r.diff >= 3 && r.floor >= 20 },
  { id: 'hardwin', name: 'CEO MATERIAL', desc: 'Beat floor 30 on Hard or harder', reward: 5000, test: (p, r) => r && r.won && r.diff >= 2 },
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
  { id: 'guns40', name: 'ARMORY', desc: 'Find all 42 weapons', reward: 1500, test: (p) => Object.keys(p.found).filter((k) => k !== 'remote').length >= 42 },
  { id: 'golden', name: 'GOLDEN TICKET', desc: 'Find the Golden Gun', reward: 300, test: (p) => !!p.found.golden },
  { id: 'master', name: 'MASTERY', desc: 'Upgrade a weapon to level 5', reward: 300, test: (p) => Object.values(p.weapons).some((l) => l >= 5) },
  { id: 'bestiary', name: 'FIELD GUIDE', desc: 'Encounter 50 enemy types', reward: 400, test: (p) => p.stats.typesSeen >= 50 },
  { id: 'lore1', name: 'READING MATERIAL', desc: 'Find a memo', reward: 50, test: (p) => Object.keys(p.lore || {}).length >= 1 },
  { id: 'lore15', name: 'OFFICE GOSSIP', desc: 'Find 15 memos', reward: 600, test: (p) => Object.keys(p.lore || {}).length >= 15 },
  { id: 'lore30', name: 'WHISTLEBLOWER', desc: 'Find 30 memos', reward: 2000, test: (p) => Object.keys(p.lore || {}).length >= 30 },
  { id: 'staff', name: 'FULL STAFF', desc: 'Unlock every employee', reward: 1000, test: (p, r, allChars) => allChars && allChars() },
];

// ---------------------------------------------------------------- the big list (phase 6.5)
// Tiered achievements generated from tables: [id, name, desc, threshold, reward]
const S = (k) => (p) => p.stats[k] || 0;
const count = (o) => Object.keys(o || {}).length;
const sumVals = (o) => Object.values(o || {}).reduce((a, b) => a + (b || 0), 0);
const tiers = (prefix, get, rows, perRun = false) => rows.map(([n, name, desc, reward]) => ({ id: `${prefix}${n}`, name, desc, reward, goal: n,
  prog: perRun ? null : (p) => Math.min(n, Math.floor(get(p) || 0)), test: (p, r, all) => get(p, r, all) >= n }));
const LOG_COUNT = Object.entries(DEFS).filter(([id, d]) => !d.boss && id !== 'pylon' && d.floors && d.model).length;

ACHIEVEMENTS.push(
  ...tiers('k', S('kills'), [[500, 'HEADCOUNT REDUCTION', 'Kill 500 enemies', 250], [1000, 'MASS LAYOFFS', 'Kill 1,000 enemies', 400], [5000, 'HOSTILE WORKPLACE', 'Kill 5,000 enemies', 1200], [10000, 'DOWNSIZING EXPERT', 'Kill 10,000 enemies', 2500], [25000, 'THE AXE', 'Kill 25,000 enemies', 6000]]),
  ...tiers('hs', S('heads'), [[25, 'NOGGIN', 'Land 25 headshot kills', 100], [250, 'DOME INSPECTOR', 'Land 250 headshot kills', 400], [500, 'HEAD OF DEPARTMENT', 'Land 500 headshot kills', 800], [1000, 'BRAIN DRAIN', 'Land 1,000 headshot kills', 1500], [2500, 'HEADHUNTER LEGEND', 'Land 2,500 headshot kills', 3500]]),
  ...tiers('or', S('orbs'), [[25, 'SPAM FILTER', 'Shoot down 25 projectiles', 100], [250, 'REPLY ALL: NO', 'Shoot down 250 projectiles', 400], [500, 'UNSUBSCRIBE', 'Shoot down 500 projectiles', 800], [1000, 'INBOX INFINITY', 'Shoot down 1,000 projectiles', 1500]]),
  ...tiers('ml', S('meleeKills'), [[10, 'PERSONAL TOUCH', 'Get 10 melee kills', 100], [250, 'FACE TO FACE', 'Get 250 melee kills', 600], [500, 'HANDS-ON MANAGER', 'Get 500 melee kills', 1200], [1000, 'CLOSE PERSONAL FRIEND', 'Get 1,000 melee kills', 2500]]),
  ...tiers('bk', S('bossKills'), [[10, 'BOARD SHAKEUP', 'Defeat 10 bosses', 1000], [25, 'C-SUITE CLEANER', 'Defeat 25 bosses', 2500], [50, 'BOSS OF BOSSES', 'Defeat 50 bosses', 5000]]),
  ...tiers('mk', S('miniKills'), [[5, 'MIDDLE OUT', 'Defeat 5 mini bosses', 300], [25, 'SUPERVISOR SLAYER', 'Defeat 25 mini bosses', 1200], [50, 'MANAGEMENT REMOVED', 'Defeat 50 mini bosses', 2500]]),
  ...tiers('fl', S('maxFloor'), [[12, 'HALFWAY TO HALFWAY', 'Reach floor 12', 300], [18, 'HALFWAY THERE', 'Reach floor 18', 500], [22, 'THIN AIR', 'Reach floor 22', 900], [28, 'PENTHOUSE VIEW', 'Reach floor 28', 1400]]),
  ...tiers('rn', S('runs'), [[5, 'REGULAR', 'Start 5 runs', 100], [10, 'COMMITTED', 'Start 10 runs', 200], [25, 'LIFER', 'Start 25 runs', 500], [50, 'CAREER EMPLOYEE', 'Start 50 runs', 1000], [100, 'EMPLOYEE OF THE CENTURY', 'Start 100 runs', 2500]]),
  ...tiers('er', S('earned'), [[1000, 'FIRST PAYCHECK', 'Earn $1,000 in total', 100], [10000, 'RAISE', 'Earn $10,000 in total', 400], [50000, 'BONUS SEASON', 'Earn $50,000 in total', 1000], [100000, 'SIX FIGURES', 'Earn $100,000 in total', 2000], [250000, 'GOLDEN PARACHUTE', 'Earn $250,000 in total', 4000], [1000000, 'MILLIONAIRE TEMP', 'Earn $1,000,000 in total', 10000]]),
  ...tiers('sp', S('spent'), [[1000, 'COMPANY CARD', 'Spend $1,000 at HQ', 100], [10000, 'EXPENSE REPORT', 'Spend $10,000 at HQ', 500], [50000, 'BUDGET OVERRUN', 'Spend $50,000 at HQ', 1500], [100000, 'CORPORATE WASTE', 'Spend $100,000 at HQ', 3000]]),
  ...tiers('pk', S('perksTaken'), [[25, 'BENEFITS PACKAGE', 'Take 25 perks', 200], [100, 'PERK HOARDER', 'Take 100 perks', 600], [250, 'TOTAL COMPENSATION', 'Take 250 perks', 1500]]),
  ...tiers('gf', (p) => count(p.found), [[5, 'SAMPLER', 'Find 5 different weapons', 100], [20, 'GUN NUT', 'Find 20 different weapons', 500], [30, 'QUARTERMASTER', 'Find 30 different weapons', 1000]]),
  ...tiers('ts', S('typesSeen'), [[10, 'NEW FACES', 'Encounter 10 enemy types', 100], [25, 'NETWORKING', 'Encounter 25 enemy types', 300], [75, 'SEEN IT ALL', 'Encounter 75 enemy types', 1200]]),
  ...tiers('pb', S('propsBroken'), [[10, 'CLUMSY', 'Break 10 props', 100], [100, 'BULL IN AN OFFICE', 'Break 100 props', 400], [500, 'RENOVATION', 'Break 500 props', 1200], [1000, 'DEMOLITION CREW', 'Break 1,000 props', 2500]]),
  ...tiers('wb', S('windowsBroken'), [[5, 'FRESH AIR', 'Shatter 5 windows', 100], [50, 'DRAFTY', 'Shatter 50 windows', 400], [200, 'OPEN PLAN', 'Shatter 200 windows', 1000]]),
  ...tiers('ff', S('friendlyKills'), [[1, 'OOPS', 'Make an enemy kill another enemy', 150], [25, 'OFFICE POLITICS', 'Make enemies kill each other 25 times', 600], [100, 'DIVIDE AND CONQUER', 'Make enemies kill each other 100 times', 1500]]),
  ...tiers('gk', S('goldKills'), [[1, 'STRUCK GOLD', 'Kill a golden enemy', 200], [10, 'PROSPECTOR', 'Kill 10 golden enemies', 800], [50, 'GOLD STANDARD', 'Kill 50 golden enemies', 2500]]),
  ...tiers('lr', (p) => count(p.lore), [[5, 'SNOOP', 'Find 5 memos', 150], [50, 'FILING CABINET', 'Find 50 memos', 1500], [80, 'THE WHOLE STORY', 'Find all 80 memos', 4000]]),
  ...tiers('dr', S('dailyRuns'), [[1, 'DAILY GRIND', 'Play a daily challenge', 100], [7, 'WEEKLY REPORT', 'Play 7 daily challenges', 500], [30, 'MONTHLY REVIEW', 'Play 30 daily challenges', 2000]]),
  ...tiers('dd', S('dailyDone'), [[1, 'DAILY DONE', 'Finish a daily challenge', 300], [10, 'ROUTINE', 'Finish 10 daily challenges', 1500]]),
  ...tiers('tw', (p) => count(p.twists), [[5, 'FLEXIBLE', 'Finish 5 different daily twists', 500], [15, 'ADAPTABLE', 'Finish 15 different daily twists', 1500], [DAILY_MODS.length, 'SEEN EVERY TWIST', `Finish all ${DAILY_MODS.length} daily twists`, 5000]]),
  ...tiers('rd', S('rushDone'), [[1, 'BACK TO BACK', 'Finish a boss rush', 1000], [5, 'RUSH HOUR', 'Finish 5 boss rushes', 3000]]),
  { id: 'rush15', name: 'EXPRESS ELEVATOR', desc: 'Finish a boss rush in under 15 minutes', reward: 1500, test: (p) => (p.stats.rushBest || 1e9) < 900 },
  { id: 'rush8', name: 'SPEEDRUNNER', desc: 'Finish a boss rush in under 8 minutes', reward: 4000, test: (p) => (p.stats.rushBest || 1e9) < 480 },
  ...tiers('en', S('endlessFloor'), [[40, 'OVERTIME AFTER OVERTIME', 'Reach floor 40 in endless', 1500], [50, 'NO WAY DOWN', 'Reach floor 50 in endless', 3000], [75, 'FLOOR 75', 'Reach floor 75 in endless', 8000]]),
  { id: 'wineasy', name: 'TRAINEE', desc: 'Beat floor 30 on Easy', reward: 1000, test: (p) => (p.stats.wind_0 || 0) >= 1 },
  { id: 'winmed', name: 'FULL-TIME', desc: 'Beat floor 30 on Medium', reward: 2000, test: (p) => (p.stats.wind_1 || 0) >= 1 },
  { id: 'winhard', name: 'SENIOR PARTNER', desc: 'Beat floor 30 on Hard', reward: 4000, test: (p) => (p.stats.wind_2 || 0) >= 1 },
  { id: 'winxhard', name: 'LEGENDARY TEMP', desc: 'Beat floor 30 on Extra Hard', reward: 10000, test: (p) => (p.stats.wind_3 || 0) >= 1 },
  ...[['temp', 'TEMP TO PERM'], ['guard', 'NIGHT WATCH'], ['intern', 'EXCEEDS EXPECTATIONS'], ['janitor', 'CLEAN SWEEP'], ['ittech', 'TURNED IT OFF'], ['exec', 'FAST TRACK'], ['contractor', 'CONTRACT COMPLETE'], ['heir', 'INHERITANCE']]
    .map(([c, name]) => ({ id: 'win_' + c, name, desc: `Beat floor 30 as ${c === 'temp' ? 'The Temp' : c === 'guard' ? 'the Night Guard' : c === 'intern' ? 'The Intern' : c === 'janitor' ? 'The Janitor' : c === 'ittech' ? 'the IT Technician' : c === 'exec' ? 'the Junior Executive' : c === 'contractor' ? 'The Contractor' : "the Chairman's Heir"}`, reward: 1500, test: (p) => (p.stats['win_' + c] || 0) >= 1 })),
  ...tiers('up', (p) => sumVals(p.upgrades), [[10, 'SELF IMPROVEMENT', 'Buy 10 upgrade levels', 300], [30, 'CONTINUING EDUCATION', 'Buy 30 upgrade levels', 1000], [55, 'OVERQUALIFIED', 'Buy 55 upgrade levels', 3000]]),
  ...tiers('lg', (p) => Object.values(p.weapons || {}).filter((l) => l >= 10).length, [[1, 'GOLD PLATED', 'Upgrade a weapon to level 10', 1000], [5, 'GOLDEN ARSENAL', 'Upgrade 5 weapons to level 10', 4000]]),
  ...tiers('al', (p) => sumVals(p.weapons), [[25, 'GUNSMITH', 'Buy 25 armory levels', 500], [100, 'MASTER ARMORER', 'Buy 100 armory levels', 2500]]),
  ...tiers('lgb', (p) => count(p.bestiary), [[10, 'FIELD NOTES', 'Log 10 enemies', 200], [40, 'NATURALIST', 'Log 40 enemies', 800], [LOG_COUNT, 'COMPLETE LOG', `Log all ${LOG_COUNT} enemies`, 3000]]),
  ...tiers('sk', (p) => Object.values(p.bestiary || {}).reduce((a, b) => a + count(b.s), 0), [[25, 'FASHION WEEK', 'Collect 25 enemy skins', 500], [100, 'WARDROBE', 'Collect 100 enemy skins', 2000]]),
  ...tiers('cb', (p, r) => (r && r.maxCombo) || 0, [[12, 'ON A ROLL', 'Reach an x12 combo', 300], [16, 'UNSTOPPABLE', 'Reach an x16 combo', 600], [20, 'COMBO KING', 'Reach an x20 combo (needs Combo King perk x3)', 1200]], true),
  ...tiers('pr', (p, r) => (r && r.perkCount) || 0, [[12, 'PERKY', 'Have 12 perks in one run', 500], [16, 'LOADED', 'Have 16 perks in one run', 1000]], true),
  ...tiers('nd', S('noDmgFloors'), [[5, 'TEFLON', 'Clear 5 floors without taking damage', 600], [25, 'UNTOUCHABLE TEMP', 'Clear 25 floors without taking damage', 2500]]),
  ...tiers('fc', S('floors'), [[50, 'FIFTY FLIGHTS', 'Clear 50 floors in total', 300], [250, 'STAIRMASTER', 'Clear 250 floors in total', 1200], [1000, 'SKYSCRAPER', 'Clear 1,000 floors in total', 4000]]),
  ...tiers('dk', S('ducks'), [[25, 'DUCK AND COVER', 'Duck 25 times', 100], [250, 'LIMBO CHAMPION', 'Duck 250 times', 500]]),
  ...tiers('rm', S('remoteUses'), [[10, 'DEJA VU', 'Rewind time 10 times with The Golden Watch', 300], [100, 'GROUNDHOG DAY', 'Rewind time 100 times', 1000]]),
  ...tiers('tsp', S('bossRewinds'), [[1, 'RETAKE', 'Rewind time during a boss fight', 300], [10, "DIRECTOR'S CUT", 'Rewind 10 boss fights', 1200]]),
  ...tiers('od', S('overdrives'), [[1, 'SPIRIT AWAKENED', 'Trigger OVERDRIVE with Graveyard Shift', 500], [10, 'OVERTIME OVERDRIVE', 'Trigger OVERDRIVE 10 times', 1500]]),
  ...tiers('bh', S('blackholes'), [[10, 'EVENT HORIZON', 'Open 10 black holes', 600]]),
  ...tiers('rq', S('superKills'), [[1, 'SUPER', 'Kill a Super enemy (Extra Hard)', 1000], [25, 'SILENCE THE CHOIR', 'Kill 25 Super enemies', 3000], [100, 'FINAL SUPER', 'Kill 100 Super enemies', 8000]]),
  ...tiers('mu', S('mutations'), [[1, 'SIDE EFFECTS', 'Take a mutation (Extra Hard)', 300], [25, 'NOT QUITE HUMAN', 'Take 25 mutations', 1500], [100, 'THE SUPPLEMENT WINS', 'Take 100 mutations', 4000]]),
  { id: 'mutfull', name: 'ABOMINATION', desc: 'Have 15 mutations in one run', reward: 2500, test: (p, r) => r && r.mutCount >= 15 },
  // New Game+ (15)
  ...[['overseer', 'OVERSEEN', 'the Overseer'], ['nightmare', 'PUT DOWN', 'a Nightmare Hound'], ['hunter', 'COUNTER-DRONE', 'a Hunter-Killer Drone'], ['redcell', 'CELL DIVISION', 'a Red Cell'], ['auditprime', 'AUDITED', 'Auditor Prime'], ['shiftghost', 'GHOSTED', 'a Shift Ghost']]
    .map(([id, name, who]) => ({ id: 'ngpk_' + id, name, desc: `New Game+: kill ${who}`, reward: 800, test: (p) => !!(p.bestiary && p.bestiary[id]) })),
  ...[['pinkslip', "YOU'RE FIRED", 'Pink Slip'], ['bloodcontract', 'SIGNED IN BLOOD', 'Blood Contract'], ['closer', 'ALWAYS BE CLOSING', 'The Closer'], ['mandatoryfun', 'TEAM BUILDING', 'Mandatory Fun'], ['overtimecannon', 'UNPAID OVERTIME', 'the Overtime Cannon'], ['severance', 'SEVERED TIES', 'Severance']]
    .map(([id, name, gun]) => ({ id: 'ngpw_' + id, name, desc: `New Game+: find ${gun}`, reward: 900, test: (p) => !!p.found[id] })),
  { id: 'ngpfl20', name: 'THIRD SHIFT', desc: 'Reach floor 20 in New Game+', reward: 3500, test: (p, r) => r && r.ngp && r.floor >= 20 },
  { id: 'ngpxh', name: 'NO REST FOR THE WICKED', desc: 'Beat New Game+ on Extra Hard', reward: 12000, test: (p) => (p.stats.ngpwin_3 || 0) >= 1 },
  { id: 'ngpk200', name: 'MANDATORY OVERTIME', desc: 'Kill 200 enemies in New Game+', reward: 3000, prog: (p) => Math.min(200, p.stats.ngpKills || 0), goal: 200, test: (p) => (p.stats.ngpKills || 0) >= 200 },
  { id: 'ngp1', name: 'DEJA VU', desc: 'Start a New Game+ run', reward: 500, test: (p) => (p.stats.ngpRuns || 0) >= 1 },
  { id: 'ngpwin', name: 'UNDER NEW MANAGEMENT', desc: 'Beat floor 30 in New Game+', reward: 8000, test: (p) => (p.stats.ngpWins || 0) >= 1 },
  { id: 'ngpfl15', name: 'SECOND SHIFT', desc: 'Reach floor 15 in New Game+', reward: 2500, test: (p, r) => r && r.ngp && r.floor >= 15 },
  { id: 'mutwin', name: 'EVOLVED', desc: 'Beat floor 30 on Extra Hard', reward: 6000, test: (p, r) => r && r.won && r.diff >= 3 },
  ...tiers('mdk', S('medkits'), [[25, 'BAND-AID', 'Pick up 25 medkits', 200], [100, 'FREQUENT FLYER', 'Pick up 100 medkits', 800]]),
);
