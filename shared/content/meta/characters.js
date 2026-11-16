// Employees: starting characters. Each starts a run with its own weapon and perks.
// Unlocked either by a milestone (unlock.test on the profile) or by buying with cash.

export const CHARACTERS = [
  { id: 'temp', name: 'THE TEMP', sleeve: 0xd2d2cc, weapon: 'pistol', perks: {}, blurb: 'First day on the job. No perks, no excuses.', unlock: null },
  { id: 'guard', name: 'NIGHT GUARD', sleeve: 0x26304e, weapon: 'revolver', perks: { armor: 1 }, blurb: 'Revolver and a Kevlar vest.',
    unlock: { text: 'REACH FLOOR 5', test: (p) => p.stats.maxFloor >= 5 } },
  { id: 'intern', name: 'THE INTERN', sleeve: 0xc83c32, weapon: 'stapler', perks: { fastswap: 1, greed: 1 }, blurb: 'Staple gun, fast hands, eager to impress.',
    unlock: { text: 'OR BUY', price: 600 } },
  { id: 'janitor', name: 'THE JANITOR', sleeve: 0x5a6e5a, weapon: 'slugger', perks: { vampire: 1, meleemaster: 1 }, blurb: 'A trusty bat. Heals on every kill.',
    unlock: { text: 'GET 100 MELEE KILLS', test: (p) => p.stats.meleeKills >= 100, price: 1500 } },
  { id: 'ittech', name: 'IT TECHNICIAN', sleeve: 0x28282e, weapon: 'nailgun', perks: { autoloader: 1 }, blurb: 'Nail gun. Holstered guns reload themselves.',
    unlock: { text: 'REACH FLOOR 10', test: (p) => p.stats.maxFloor >= 10 } },
  { id: 'exec', name: 'JUNIOR EXECUTIVE', sleeve: 0x2a1e2c, weapon: 'shotgun', perks: { lucky: 1, greed: 1 }, blurb: 'Pump shotgun and connections in high places.',
    unlock: { text: 'DEFEAT 3 BOSSES', test: (p) => p.stats.bossKills >= 3, price: 2500 } },
  { id: 'contractor', name: 'THE CONTRACTOR', sleeve: 0x8a7a50, weapon: 'rifle', perks: { explosive: 1 }, blurb: 'Assault rifle with explosive rounds.',
    unlock: { text: 'REACH FLOOR 25', test: (p) => p.stats.maxFloor >= 25 } },
  { id: 'heir', name: "THE CHAIRMAN'S HEIR", sleeve: 0x14101a, weapon: 'sniper', perks: { secondwind: 1, marksman: 1 }, blurb: 'Sniper rifle, Second Wind, and a sense of entitlement.',
    unlock: { text: 'BEAT FLOOR 50', test: (p) => p.stats.maxFloor >= 50 && p.stats.wins >= 1 } },
];
export const CHAR = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

export function isUnlocked(c, profile) {
  if (!c.unlock) return true;
  if (profile.chars[c.id]) return true;
  return !!(c.unlock.test && c.unlock.test(profile));
}
