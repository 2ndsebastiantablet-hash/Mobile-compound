// 60 bosses: 30 mini bosses (floors 3, 8, 13 ... 48) and 30 Bosses (floors 5, 10 ... 50).
// Every boss floor and mini boss floor has 3 possible bosses, matching the floor's 3 versions.
//
// A boss is a normal Enemy body driven by a BossBrain instead of the regular AI.
// moves  = the boss's attack script (cycled; enraged bosses at <50% HP add `enrage` moves and act faster)
// vuln   = when it can be hurt (mini bosses always have a rule):
//   always       - any hit counts
//   afterAttack  - armored, except for a few seconds right after it attacks
//   core         - only the glowing weak point counts, and it moves around
//   back         - only while it turns its back on you (it does that to recharge)
//   winding      - only while it is winding up an attack (or mid-charge)
//   adds         - immune while any of its summoned minions are alive
//   shield       - a regenerating shield has to be broken first
//   head         - headshots only
//   cloak        - it vanishes; only hittable while visible
//   reflect      - when it glows red, your shots bounce back and hurt YOU
// Any boss that raises pylons is immune until every pylon is destroyed.
//
// Move list: bombs (lobbed, explode on impact — shoot them before they land), fan, wall, homing,
// rain (falls from the ceiling), mines (hover, then dart at you), barrage, spin, laser (shoot the
// boss during the wind-up to cancel), charge (deal enough damage to stun it before it reaches you),
// slam (shockwaves along the floor), summon, teleport, heal (interrupt it), clones (only the real one
// takes damage — decoys flicker), pylons, turn, cloak, reflect.
import * as THREE from '../../vendor/three.module.min.js';
import { DEFS } from '../enemies/roster.js';
import { box } from '../../engine/geometry.js';
import { rand, pick, clamp } from '../../engine/util.js';

const H = (outfit, extra = {}) => ({ kind: 'human', outfit, ...extra });

const MINIS = {
  3: [
    { id: 'paperweight', name: 'PAPERWEIGHT', model: H('mail', { face: 'cap', capCol: [120, 90, 50], weapon: 'package', bulk: 1.3 }), scale: 1.5, decor: ['pads'],
      vuln: 'afterAttack', moves: [{ t: 'bombs', n: 2, kind: 'package' }, { t: 'fan', n: 3 }], hint: 'ARMORED — HIT IT RIGHT AFTER IT THROWS' },
    { id: 'stapler', name: 'THE STAPLER', model: { kind: 'mech', col: [180, 40, 36], accent: [230, 230, 230], eye: 'visor', eyeCol: [255, 200, 40] }, scale: 1.4,
      vuln: 'back', moves: [{ t: 'barrage', n: 10, kind: 'shard' }, { t: 'turn' }], hint: 'ONLY ITS BACK IS EXPOSED' },
    { id: 'fiona', name: 'FRONT DESK FIONA', model: H('hr', { face: 'normal', hair: 5, weapon: 'clipboard', bulk: 1.15 }), scale: 1.5, decor: ['crown'],
      vuln: 'adds', moves: [{ t: 'summon', type: 'intern', n: 2 }, { t: 'fan', n: 4 }, { t: 'fan', n: 3 }], hint: 'IMMUNE WHILE HER INTERNS LIVE' },
  ],
  8: [
    { id: 'todd', name: 'TEAM LEAD TODD', model: H('manager', { face: 'bald', weapon: 'pistol', bulk: 1.3 }), scale: 1.55, decor: ['pads'],
      vuln: 'shield', shield: 10, moves: [{ t: 'fan', n: 3 }, { t: 'summon', type: 'grunt', n: 1 }, { t: 'homing', n: 2, kind: 'pitch' }], hint: 'BREAK HIS SHIELD FIRST — IT REGENERATES' },
    { id: 'copierking', name: 'COPIER KING', model: { kind: 'turret', style: 'copier' }, scale: 1.6, move: 'turret',
      vuln: 'winding', moves: [{ t: 'wall', n: 7, kind: 'shard' }, { t: 'fan', n: 5, kind: 'shard' }], hint: 'ONLY HURT WHILE ITS LID IS OPEN' },
    { id: 'harry', name: 'HEADSET HARRY', model: H('it', { face: 'normal', glasses: true, weapon: 'laptop', bulk: 1.2 }), scale: 1.5,
      vuln: 'head', moves: [{ t: 'homing', n: 3, kind: 'pitch' }, { t: 'mines', n: 3 }], hint: 'HEADSHOTS ONLY' },
  ],
  13: [
    { id: 'serverbeast', name: 'SERVER BEAST', model: { kind: 'tank', col: [40, 70, 140], accent: [60, 220, 255], eye: 'visor', eyeCol: [60, 220, 255] }, scale: 1.5,
      vuln: 'afterAttack', moves: [{ t: 'barrage', n: 14, kind: 'bolt' }, { t: 'wall', n: 5, kind: 'bolt' }], hint: 'OVERHEATS AFTER FIRING — THAT IS YOUR WINDOW' },
    { id: 'warden', name: 'FIREWALL WARDEN', model: H('riot', { head: 'helmet', weapon: 'rifle', bulk: 1.25 }), scale: 1.55,
      vuln: 'always', moves: [{ t: 'pylons', n: 2 }, { t: 'fan', n: 4 }, { t: 'barrage', n: 8 }], hint: 'DESTROY THE PYLONS TO DROP ITS BARRIER' },
    { id: 'packetspider', name: 'PACKET SPIDER', model: { kind: 'spider', legs: 8, col: [30, 40, 60], accent: [60, 200, 255], eye: 'multi', eyeCol: [60, 200, 255] }, scale: 1.7,
      vuln: 'core', moves: [{ t: 'mines', n: 4 }, { t: 'charge' }], hint: 'SHOOT THE GLOWING CORE' },
  ],
  18: [
    { id: 'secretary', name: 'BOARD SECRETARY', model: H('assistant', { face: 'normal', glasses: true, hair: 2, weapon: 'pistol' }), scale: 1.5, decor: ['crown'],
      vuln: 'always', moves: [{ t: 'clones', n: 2 }, { t: 'fan', n: 3 }, { t: 'teleport' }], hint: 'ONLY THE REAL ONE BLEEDS — DECOYS FLICKER' },
    { id: 'knuckles', name: 'BRASS KNUCKLES', model: H('bodyguard', { face: 'shades', weapon: 'claw', bulk: 1.45 }), scale: 1.6, decor: ['pads'],
      vuln: 'winding', moves: [{ t: 'charge' }, { t: 'slam' }], hint: 'ONLY HURT WHILE HE WINDS UP OR CHARGES' },
    { id: 'hunter', name: 'TROPHY HUNTER', model: H('major', { face: 'mustache', hat: 'beret', weapon: 'rifle', bulk: 1.2 }), scale: 1.55, decor: ['cape'],
      vuln: 'afterAttack', moves: [{ t: 'bombs', n: 3, kind: 'grenade' }, { t: 'homing', n: 2 }], hint: 'ARMORED — STRIKE AFTER HE ATTACKS' },
  ],
  23: [
    { id: 'specimen', name: 'SPECIMEN 23', model: H('brute', { head: 'mutant', headCol: [120, 140, 100], weapon: 'claw', hunch: true, bulk: 1.4 }), scale: 1.6,
      vuln: 'head', moves: [{ t: 'charge' }, { t: 'slam' }, { t: 'rain', n: 5, kind: 'acid' }], hint: 'HEADSHOTS ONLY' },
    { id: 'incubator', name: 'THE INCUBATOR', model: { kind: 'pod', col: [150, 60, 100], eyeCol: [255, 220, 80] }, scale: 1.9, move: 'turret',
      vuln: 'adds', moves: [{ t: 'summon', type: 'larva', n: 3 }, { t: 'rain', n: 6, kind: 'acid' }], hint: 'IMMUNE WHILE LARVAE LIVE' },
    { id: 'cleanroom', name: 'DR. CLEANROOM', model: H('hazmat', { head: 'gasmask', pack: 'tank', weapon: 'sprayer', bulk: 1.2 }), scale: 1.55,
      vuln: 'winding', moves: [{ t: 'bombs', n: 3, kind: 'acid' }, { t: 'heal' }], hint: 'ONLY HURT WHILE PREPARING — STOP HIS HEAL' },
  ],
  28: [
    { id: 'foreman', name: 'FOREMAN-9', model: { kind: 'mech', col: [210, 170, 40], accent: [30, 30, 30], eye: 'visor', eyeCol: [255, 80, 30], cannons: true }, scale: 1.6,
      vuln: 'back', moves: [{ t: 'slam' }, { t: 'barrage', n: 10 }, { t: 'turn' }], hint: 'ONLY ITS EXHAUST PORT ON THE BACK' },
    { id: 'arm', name: 'ASSEMBLY ARM', model: { kind: 'turret', style: 'sentry', col: [200, 160, 40], eye: 'mono', eyeCol: [255, 40, 30] }, scale: 2.1, move: 'turret',
      vuln: 'core', moves: [{ t: 'wall', n: 7, kind: 'bolt' }, { t: 'laser' }], hint: 'SHOOT THE GLOWING CORE' },
    { id: 'crashhound', name: 'CRASH TEST HOUND', model: { kind: 'quad', style: 'hound', col: [230, 200, 40], eye: 'hound', eyeCol: [255, 40, 30], tail: true }, scale: 2.2,
      vuln: 'afterAttack', moves: [{ t: 'charge' }, { t: 'fan', n: 5 }], hint: 'ARMORED — HIT IT AFTER IT LUNGES' },
  ],
  33: [
    { id: 'archivist', name: 'HEAD ARCHIVIST', model: H('lawyer', { face: 'grey', glasses: true, weapon: 'briefcase' }), scale: 1.5, decor: ['cape'],
      vuln: 'cloak', moves: [{ t: 'cloak' }, { t: 'homing', n: 3, kind: 'pitch' }, { t: 'fan', n: 3 }], hint: 'HIT HIM WHILE HE IS VISIBLE' },
    { id: 'bookworm', name: 'BOOKWORM', model: { kind: 'quad', style: 'slug', col: [140, 110, 70], eye: 'mutant', eyeBase: [140, 110, 70] }, scale: 2.4,
      vuln: 'head', moves: [{ t: 'rain', n: 7, kind: 'package' }, { t: 'charge' }], hint: 'ONLY ITS HEAD IS SOFT' },
    { id: 'freezer', name: 'FREEZER UNIT', model: { kind: 'tank', col: [200, 220, 235], accent: [80, 160, 255], eye: 'visor', eyeCol: [120, 200, 255] }, scale: 1.6,
      vuln: 'shield', shield: 14, moves: [{ t: 'wall', n: 6, kind: 'bolt' }, { t: 'barrage', n: 10, kind: 'bolt' }], hint: 'BREAK THE ICE SHIELD — IT REFREEZES' },
  ],
  38: [
    { id: 'groundskeeper', name: 'GROUNDSKEEPER', model: H('janitor', { face: 'mustache', weapon: 'mop', bulk: 1.3 }), scale: 1.6,
      vuln: 'always', moves: [{ t: 'pylons', n: 3 }, { t: 'bombs', n: 3, kind: 'package' }, { t: 'charge' }], hint: 'TAKE OUT THE SPRINKLER PYLONS' },
    { id: 'rosequeen', name: 'ROSE QUEEN', model: { kind: 'floater', style: 'eye', eyeCol: [255, 40, 80] }, scale: 2.2, move: 'fly',
      vuln: 'winding', moves: [{ t: 'laser' }, { t: 'rain', n: 6, kind: 'pitch' }], hint: 'ONLY VULNERABLE WHILE IT CHARGES' },
    { id: 'moldmother', name: 'MOLD MOTHER', model: { kind: 'blob', col: [150, 100, 180], eyeCol: [255, 240, 60] }, scale: 2.0,
      vuln: 'core', moves: [{ t: 'summon', type: 'oozeling', n: 2 }, { t: 'bombs', n: 3, kind: 'acid' }], hint: 'SHOOT THE GLOWING NUCLEUS' },
  ],
  43: [
    { id: 'dealer', name: 'THE DEALER', model: H('consultant', { face: 'shades', weapon: 'pistol' }), scale: 1.5, decor: ['crown'],
      vuln: 'reflect', moves: [{ t: 'fan', n: 5, kind: 'shard' }, { t: 'reflect' }, { t: 'teleport' }], hint: 'DO NOT SHOOT WHILE HE GLOWS RED' },
    { id: 'highroller', name: 'HIGH ROLLER', model: { kind: 'drone', col: [230, 180, 50], eye: 'visor', eyeCol: [255, 255, 255], rotors: 4 }, scale: 2.2, move: 'fly',
      vuln: 'afterAttack', moves: [{ t: 'spin' }, { t: 'homing', n: 3 }], hint: 'ARMORED — HIT IT AFTER IT FIRES' },
    { id: 'golem', name: 'MARBLE GOLEM', model: { kind: 'mech', col: [220, 218, 210], accent: [190, 150, 60], eye: 'mono', eyeCol: [120, 200, 255] }, scale: 1.75,
      vuln: 'core', moves: [{ t: 'slam' }, { t: 'bombs', n: 3 }], hint: 'SHOOT THE GLOWING CRACK' },
  ],
  48: [
    { id: 'coretech', name: 'CORE TECH', model: H('hazmat', { head: 'gasmask', pack: 'tank', weapon: 'sprayer', bulk: 1.3 }), scale: 1.55,
      vuln: 'always', moves: [{ t: 'pylons', n: 3 }, { t: 'laser' }, { t: 'mines', n: 4 }], hint: 'DESTROY THE COOLANT PYLONS' },
    { id: 'blackops', name: 'BLACK OPS', model: H('ninja', { head: 'mask', weapon: 'blade' }), scale: 1.5,
      vuln: 'cloak', moves: [{ t: 'cloak' }, { t: 'charge' }, { t: 'fan', n: 4, kind: 'shard' }], hint: 'ONLY HITTABLE WHEN VISIBLE' },
    { id: 'gatekeeper', name: 'GATEKEEPER', model: { kind: 'mech', col: [210, 214, 220], accent: [220, 40, 40], eye: 'mono', eyeCol: [255, 30, 30] }, scale: 1.75,
      vuln: 'shield', shield: 18, moves: [{ t: 'laser' }, { t: 'wall', n: 7 }], hint: 'BREAK THE SHIELD, THEN THE MACHINE' },
  ],
};

const BOSSES = {
  5: [
    { id: 'regional', name: 'REGIONAL MANAGER', model: H('boss', { face: 'grey', weapon: 'big' }), scale: 1.55, decor: ['cape'],
      moves: [{ t: 'bombs', n: 2 }, { t: 'fan', n: 5 }, { t: 'summon', type: 'grunt', n: 2 }], enrage: [{ t: 'bombs', n: 4 }], hint: 'SHOOT HIS BOMBS BEFORE THEY LAND' },
    { id: 'monarch', name: 'MAILROOM MONARCH', model: H('mail', { face: 'mustache', weapon: 'package', bulk: 1.4 }), scale: 1.6, decor: ['crown', 'cape'],
      moves: [{ t: 'bombs', n: 3, kind: 'package' }, { t: 'wall', n: 6 }, { t: 'summon', type: 'mailclerk', n: 2 }], enrage: [{ t: 'rain', n: 6, kind: 'package' }], hint: 'PARCELS EXPLODE ON IMPACT' },
    { id: 'receptionist', name: 'RECEPTIONIST FROM HELL', model: H('hr', { face: 'normal', hair: 0, weapon: 'clipboard', bulk: 1.2 }), scale: 1.55, decor: ['horns'],
      moves: [{ t: 'homing', n: 2, kind: 'pitch' }, { t: 'clones', n: 2 }, { t: 'fan', n: 5 }], enrage: [{ t: 'spin' }], hint: 'DECOYS FLICKER — FIND THE REAL ONE' },
  ],
  10: [
    { id: 'vp', name: 'VP OF OPERATIONS', model: H('boss', { face: 'grey', weapon: 'minigun', bulk: 1.3 }), scale: 1.6, decor: ['pads'],
      moves: [{ t: 'pylons', n: 2 }, { t: 'barrage', n: 14 }, { t: 'homing', n: 3 }], enrage: [{ t: 'pylons', n: 3 }], hint: 'SMASH THE PYLONS TO EXPOSE HIM' },
    { id: 'overlord', name: 'CALL CENTER OVERLORD', model: H('it', { face: 'shades', weapon: 'laptop', bulk: 1.4 }), scale: 1.6, decor: ['crown'],
      moves: [{ t: 'spin' }, { t: 'mines', n: 4 }, { t: 'summon', type: 'intern', n: 3 }], enrage: [{ t: 'homing', n: 4, kind: 'pitch' }], hint: 'MINES HOVER, THEN DIVE AT YOU' },
    { id: 'architect', name: 'OPEN PLAN ARCHITECT', model: H('consultant', { face: 'shades', weapon: 'briefcase' }), scale: 1.55, decor: ['cape'],
      moves: [{ t: 'teleport' }, { t: 'rain', n: 7 }, { t: 'wall', n: 7 }], enrage: [{ t: 'bombs', n: 3 }], hint: 'WATCH THE CEILING' },
  ],
  15: [
    { id: 'cfo', name: 'CHIEF FINANCIAL OFFICER', model: H('boss', { face: 'grey', weapon: 'big', bulk: 1.3 }), scale: 1.6, decor: ['crown'],
      vuln: 'shield', shield: 20, moves: [{ t: 'bombs', n: 3 }, { t: 'summon', type: 'assistant', n: 2 }, { t: 'fan', n: 5 }], enrage: [{ t: 'homing', n: 3 }], hint: 'BREAK THE GOLDEN SHIELD' },
    { id: 'datalord', name: 'THE DATA LORD', model: { kind: 'spider', legs: 8, col: [30, 60, 40], accent: [60, 255, 120], eye: 'multi', eyeCol: [60, 255, 120], cannon: true }, scale: 2.1,
      moves: [{ t: 'laser' }, { t: 'mines', n: 4 }, { t: 'pylons', n: 2 }], enrage: [{ t: 'charge' }], hint: 'SHOOT IT DURING THE LASER CHARGE TO CANCEL' },
    { id: 'mainframe', name: 'MAINFRAME', model: { kind: 'turret', style: 'sentry', col: [40, 60, 90], eye: 'mono', eyeCol: [60, 220, 255] }, scale: 2.2, move: 'turret',
      vuln: 'core', moves: [{ t: 'barrage', n: 16, kind: 'bolt' }, { t: 'wall', n: 7, kind: 'bolt' }, { t: 'summon', type: 'bot', n: 2 }], enrage: [{ t: 'laser' }], hint: 'ONLY THE CORE TAKES DAMAGE' },
  ],
  20: [
    { id: 'coo', name: 'CHIEF OPERATING OFFICER', model: H('shadow', { face: 'grey', weapon: 'big' }), scale: 1.6, decor: ['cape', 'pads'],
      moves: [{ t: 'teleport' }, { t: 'homing', n: 3 }, { t: 'clones', n: 3 }, { t: 'fan', n: 5 }], enrage: [{ t: 'bombs', n: 4 }], hint: 'DECOYS FLICKER' },
    { id: 'goldexec', name: 'GOLDEN EXECUTIVE', model: H('boss', { face: 'grey', weapon: 'big', bulk: 1.3 }), scale: 1.6, decor: ['crown', 'cape'],
      moves: [{ t: 'fan', n: 6 }, { t: 'reflect' }, { t: 'bombs', n: 3 }], enrage: [{ t: 'reflect' }, { t: 'spin' }], hint: 'HOLD FIRE WHILE HE GLOWS RED' },
    { id: 'wyrm', name: 'TROPHY WYRM', model: { kind: 'quad', style: 'flesh', col: [60, 110, 70], eye: 'mutant', eyeBase: [60, 110, 70], tail: true }, scale: 2.5,
      moves: [{ t: 'charge' }, { t: 'rain', n: 7, kind: 'acid' }, { t: 'summon', type: 'larva', n: 3 }], enrage: [{ t: 'slam' }], hint: 'STUN IT MID-CHARGE' },
  ],
  25: [
    { id: 'headrd', name: 'HEAD OF R&D', model: H('hazmat', { head: 'gasmask', pack: 'tank', weapon: 'sprayer', bulk: 1.4 }), scale: 1.65, decor: ['pads'],
      moves: [{ t: 'bombs', n: 3, kind: 'acid' }, { t: 'summon', type: 'mutemp', n: 2 }, { t: 'heal' }], enrage: [{ t: 'rain', n: 7, kind: 'acid' }], hint: 'INTERRUPT HIS HEAL' },
    { id: 'patientzero', name: 'PATIENT ZERO', model: H('brute', { head: 'mutant', headCol: [140, 100, 100], weapon: 'claw', hunch: true, extraArm: true, bulk: 1.5 }), scale: 1.65,
      moves: [{ t: 'charge' }, { t: 'slam' }, { t: 'sonic' }], enrage: [{ t: 'charge' }, { t: 'heal' }], hint: 'STUN IT BEFORE IT REACHES YOU' },
    { id: 'sterilizer', name: 'THE STERILIZER', model: { kind: 'tank', col: [220, 226, 230], accent: [40, 200, 120], eye: 'visor', eyeCol: [60, 255, 160] }, scale: 1.9,
      moves: [{ t: 'pylons', n: 2 }, { t: 'wall', n: 7, kind: 'fire' }, { t: 'laser' }], enrage: [{ t: 'barrage', n: 14, kind: 'fire' }], hint: 'DOWN THE PYLONS, THEN THE TANK' },
  ],
  30: [
    { id: 'robodir', name: 'DIRECTOR OF ROBOTICS', model: { kind: 'mech', col: [70, 74, 90], accent: [255, 120, 30], eye: 'visor', eyeCol: [255, 120, 30], cannons: true }, scale: 1.8,
      moves: [{ t: 'homing', n: 4 }, { t: 'slam' }, { t: 'summon', type: 'spiderbot', n: 3 }], enrage: [{ t: 'barrage', n: 16, kind: 'bolt' }], hint: 'SHOOT THE MISSILES DOWN' },
    { id: 'titan', name: 'ASSEMBLY TITAN', model: { kind: 'spider', legs: 6, col: [210, 170, 40], accent: [30, 30, 30], eye: 'multi', eyeCol: [255, 60, 30], cannon: true }, scale: 2.2,
      moves: [{ t: 'charge' }, { t: 'mines', n: 5 }, { t: 'barrage', n: 14 }], enrage: [{ t: 'laser' }], hint: 'STUN IT MID-CHARGE' },
    { id: 'omega', name: 'TEST SUBJECT OMEGA', model: { kind: 'floater', style: 'eye', eyeCol: [180, 60, 255] }, scale: 2.4, move: 'fly',
      moves: [{ t: 'laser' }, { t: 'rain', n: 8, kind: 'plasma' }, { t: 'clones', n: 2 }], enrage: [{ t: 'spin' }], hint: 'CANCEL ITS GAZE BY SHOOTING IT' },
  ],
  35: [
    { id: 'chiefarch', name: 'CHIEF ARCHIVIST', model: H('lawyer', { face: 'grey', glasses: true, weapon: 'briefcase', bulk: 1.2 }), scale: 1.6, decor: ['cape', 'crown'],
      moves: [{ t: 'cloak' }, { t: 'homing', n: 3, kind: 'pitch' }, { t: 'summon', type: 'grunt', n: 2 }], enrage: [{ t: 'rain', n: 8, kind: 'package' }], hint: 'HE VANISHES — WAIT FOR HIM' },
    { id: 'librarian', name: 'THE LIBRARIAN', model: H('flesh', { head: 'mutant', headCol: [170, 120, 110], weapon: 'claw', extraArm: true, hunch: true, bulk: 1.3 }), scale: 1.65,
      vuln: 'back', moves: [{ t: 'sonic' }, { t: 'rain', n: 7, kind: 'package' }, { t: 'turn' }], enrage: [{ t: 'summon', type: 'screamer', n: 1 }], hint: 'ONLY HER EXPOSED SPINE' },
    { id: 'icequeen', name: 'ICE QUEEN UNIT', model: { kind: 'drone', col: [200, 220, 240], eye: 'mono', eyeCol: [120, 220, 255], rotors: 0, ring: true }, scale: 2.6, move: 'fly',
      moves: [{ t: 'spin' }, { t: 'wall', n: 7, kind: 'bolt' }, { t: 'mines', n: 4 }], enrage: [{ t: 'rain', n: 8, kind: 'bolt' }], hint: 'KEEP THE MINES OFF YOU' },
  ],
  40: [
    { id: 'gardener', name: 'THE GARDENER', model: H('janitor', { face: 'mustache', weapon: 'mop', bulk: 1.45 }), scale: 1.65, decor: ['pads'],
      moves: [{ t: 'bombs', n: 4, kind: 'acid' }, { t: 'summon', type: 'oozeling', n: 3 }, { t: 'heal' }], enrage: [{ t: 'charge' }], hint: 'SEED BOMBS BURST ON IMPACT' },
    { id: 'angel', name: 'ATRIUM ANGEL', model: { kind: 'drone', col: [240, 240, 236], eye: 'visor', eyeCol: [255, 230, 120], rotors: 0, ring: true }, scale: 2.4, move: 'fly', decor: ['halo'],
      moves: [{ t: 'spin' }, { t: 'rain', n: 8 }, { t: 'teleport' }], enrage: [{ t: 'laser' }], hint: 'IT RAINS FROM ABOVE' },
    { id: 'mantrap', name: 'VENUS MANTRAP', model: { kind: 'pod', col: [80, 140, 60], eyeCol: [255, 60, 60] }, scale: 2.0, move: 'turret',
      vuln: 'adds', moves: [{ t: 'summon', type: 'larva', n: 3 }, { t: 'rain', n: 7, kind: 'acid' }, { t: 'laser' }], enrage: [{ t: 'bombs', n: 4, kind: 'acid' }], hint: 'KILL ITS BROOD TO OPEN IT' },
  ],
  45: [
    { id: 'ceo', name: 'CHIEF EXECUTIVE OFFICER', model: H('boss', { face: 'grey', weapon: 'big', bulk: 1.35 }), scale: 1.65, decor: ['crown', 'cape', 'pads'],
      moves: [{ t: 'bombs', n: 3 }, { t: 'homing', n: 3 }, { t: 'clones', n: 2 }, { t: 'fan', n: 6 }], enrage: [{ t: 'bombs', n: 5 }, { t: 'spin' }], hint: 'BOMBS, MISSILES AND LIES' },
    { id: 'house', name: 'THE HOUSE', model: { kind: 'drone', col: [150, 20, 30], eye: 'mono', eyeCol: [255, 210, 60], rotors: 4 }, scale: 2.6, move: 'fly',
      vuln: 'reflect', moves: [{ t: 'spin' }, { t: 'wall', n: 7 }, { t: 'reflect' }], enrage: [{ t: 'homing', n: 4 }], hint: 'THE HOUSE ALWAYS WINS — UNLESS YOU WAIT OUT THE RED' },
    { id: 'colossus', name: 'MARBLE COLOSSUS', model: { kind: 'mech', col: [70, 70, 80], accent: [200, 170, 80], eye: 'mono', eyeCol: [255, 200, 80], cannons: true }, scale: 1.85,
      vuln: 'core', moves: [{ t: 'slam' }, { t: 'bombs', n: 4 }, { t: 'homing', n: 2 }], enrage: [{ t: 'charge' }], hint: 'SHOOT THE GLOWING CRACK' },
  ],
  50: [
    { id: 'chairman', name: 'THE CHAIRMAN', model: H('shadow', { face: 'grey', weapon: 'big', bulk: 1.4 }), scale: 1.7, decor: ['crown', 'cape', 'pads'],
      moves: [{ t: 'bombs', n: 4 }, { t: 'pylons', n: 3 }, { t: 'homing', n: 4 }, { t: 'clones', n: 3 }, { t: 'laser' }], enrage: [{ t: 'spin' }, { t: 'rain', n: 9 }], hint: 'THE FINAL REVIEW' },
    { id: 'reactorheart', name: 'REACTOR HEART', model: { kind: 'pod', col: [200, 90, 30], eyeCol: [255, 240, 120] }, scale: 2.1, move: 'turret',
      moves: [{ t: 'pylons', n: 3 }, { t: 'rain', n: 9, kind: 'fire' }, { t: 'mines', n: 5 }, { t: 'laser' }], enrage: [{ t: 'wall', n: 7, kind: 'fire' }], hint: 'SHUT DOWN THE COOLANT PYLONS' },
    { id: 'abomination', name: 'BLACK SITE ABOMINATION', model: H('flesh', { head: 'mutant', headCol: [90, 60, 90], weapon: 'claw', extraArm: true, hunch: true, bulk: 1.5 }), scale: 1.7, decor: ['horns'],
      moves: [{ t: 'charge' }, { t: 'sonic' }, { t: 'summon', type: 'brute', n: 1 }, { t: 'bombs', n: 4, kind: 'acid' }], enrage: [{ t: 'heal' }, { t: 'slam' }], hint: 'IT REGENERATES — KEEP UP THE PRESSURE' },
  ],
};

// Register every boss as an enemy type so the normal Enemy class can build it.
export const BOSS_LIST = [];
// per-shot damage for moves that throw many projectiles at once (fan, wall, rain, barrage, spin)
const MULTI = { dmg: 0.6 };
for (const [table, mini] of [[MINIS, true], [BOSSES, false]]) {
  for (const [floor, list] of Object.entries(table)) {
    list.forEach((b, slot) => {
      const f = +floor;
      const id = 'boss_' + b.id;
      DEFS[id] = {
        name: b.name, floors: [0, 0], w: 0, boss: true, mini, hp: (mini ? 26 : 55) + f * (mini ? 2.2 : 3.5), score: (mini ? 1000 : 2500) + f * (mini ? 40 : 100), dmg: mini ? 8 : 9,
        model: b.model, scale: b.scale || 1.5, move: b.move || (b.model.kind === 'drone' || b.model.kind === 'floater' ? 'fly' : 'boss'), speed: 0.9,
        brain: { vuln: b.vuln || (mini ? 'afterAttack' : 'always'), shield: b.shield || 0, moves: b.moves, enrage: b.enrage || [], hint: b.hint, decor: b.decor || [] },
        fire: [1.4, 2.2], wind: 0.8,
      };
      BOSS_LIST.push({ id, floor: f, slot, mini, name: b.name });
    });
  }
}
// minion used by pylon mechanics
DEFS.pylon = { name: 'PYLON', floors: [0, 0], w: 0, minion: true, hp: 4, score: 150, dmg: 0, model: { kind: 'turret', style: 'pylon' }, move: 'turret' };

export function bossKindFor(floor) { return floor % 5 === 0 ? 'boss' : floor % 5 === 3 ? 'mini' : null; }
export function bossFor(floor, variant) {
  const table = floor % 5 === 0 ? BOSSES : MINIS;
  const list = table[floor];
  if (!list) return null;
  return 'boss_' + list[variant % list.length].id;
}

// ---------------------------------------------------------------- brain
const SHIELD_M = new THREE.MeshBasicMaterial({ color: 0x60c0ff, transparent: true, opacity: 0.22, depthWrite: false });
const REFLECT_M = new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.35, depthWrite: false });
const CORE_M = new THREE.MeshBasicMaterial({ color: 0xffe040 });
const GOLD = new THREE.MeshLambertMaterial({ color: 0xd8a830 });
const RED = new THREE.MeshLambertMaterial({ color: 0x701018 });
const HORN = new THREE.MeshLambertMaterial({ color: 0xe8e0c8 });
const tmp = new THREE.Vector3();

export class BossBrain {
  constructor(e) {
    this.e = e; this.cfg = e.def.brain;
    this.state = 'idle'; this.t = 2.0; this.idx = 0;
    this.vulnT = 0; this.reflectT = 0; this.turned = 0; this.stunT = 0; this.cloakT = 0;
    this.shieldMax = this.cfg.shield ? this.cfg.shield * (1 + (e.game.diff || 1) * 0.04) : 0;
    this.shield = this.shieldMax; this.shieldRegen = 0;
    this.adds = []; this.pylons = []; this.decoys = [];
    this.enraged = false; this.windDmg = 0; this.home = null;
    this.immuneMsgT = 0;
    this.decorate();
  }

  decorate() {
    const e = this.e, c = this.cfg;
    const torso = e.torso || e.body, head = e.neck || e.torso || e.body;
    const P = (parent, w, h, d, mat, x, y, z) => { const m = e.part(parent, box(w, h, d), mat, x, y, z); return m; };
    if (c.decor.includes('crown')) { P(head, 0.34, 0.08, 0.34, GOLD, 0, e.neck ? 0.36 : 0.35, 0); for (const x of [-0.12, 0, 0.12]) P(head, 0.06, 0.1, 0.06, GOLD, x, e.neck ? 0.44 : 0.43, 0.12); }
    if (c.decor.includes('horns')) { for (const s of [-1, 1]) { const h = P(head, 0.06, 0.22, 0.06, HORN, s * 0.14, e.neck ? 0.38 : 0.3, 0); h.rotation.z = -s * 0.5; } }
    if (c.decor.includes('cape') && e.torso) { const cp = P(e.torso, 0.6, 1.1, 0.04, RED, 0, -0.05, -0.18); cp.rotation.x = 0.12; }
    if (c.decor.includes('pads') && e.torso) for (const s of [-1, 1]) P(e.torso, 0.24, 0.12, 0.34, GOLD, s * 0.38, 0.66, 0);
    if (c.decor.includes('halo')) { this.halo = new THREE.Mesh(box(0.9, 0.04, 0.9), new THREE.MeshBasicMaterial({ color: 0xfff0a0 })); this.halo.position.y = 0.55; (e.torso || e.body).add(this.halo); }
    if (c.vuln === 'core') {
      this.core = e.part(torso, box(0.2, 0.2, 0.08), CORE_M, 0, 0, 0, 'core');
      this.coreSpots = {
        human: [[0, 0.35, 0.16], [0.18, 0.15, 0.16], [-0.18, 0.5, 0.16]],
        mech: [[0, 0.3, 0.3], [0.25, 0.45, 0.3], [-0.25, 0.15, 0.3]],
        spider: [[0, 0.26, -0.15], [0.2, 0.26, -0.3], [-0.2, 0.26, 0]],
        turret: [[0, 0.15, 0.32], [0, 0.65, 0.09], [0.22, 0.15, 0.32]],
        tank: [[0, 0.42, 0.49], [0.2, 0.5, 0.49], [-0.2, 0.35, 0.49]],
        blob: [[0, 0.25, 0.49], [0, 0.68, 0.37], [0.25, 0.3, 0.49]],
        quad: [[0.22, 0.55, 0], [-0.22, 0.55, 0.1], [0.22, 0.6, -0.25]],
        pod: [[0, 0.6, 0.36], [0.25, 0.5, 0.36], [0, 0.25, 0.48]],
      }[e.def.model.kind] || [[0, 0, 0.35], [0.2, 0.1, 0.3], [-0.2, -0.1, 0.3]];
      this.moveCore();
    }
    // bubble used by shields, pylons and reflect stance
    this.bubble = new THREE.Mesh(box(1.1, 2.0, 1.1), SHIELD_M);
    this.bubble.position.y = e.centerY; this.bubble.visible = false; e.body.add(this.bubble);
  }

  moveCore() { if (!this.core) return; const s = pick(Math.random, this.coreSpots); this.core.position.set(s[0], s[1], s[2]); this.coreT = 4; }

  get speed() { return this.enraged ? 1.45 : 1; }
  pylonsUp() { this.pylons = this.pylons.filter((p) => p.alive); return this.pylons.length > 0; }
  addsUp() { this.adds = this.adds.filter((p) => p.alive); return this.adds.length > 0; }

  // can the boss be damaged right now?  returns true | 'immune' | 'reflect' | 'shield'
  gate(part) {
    const v = this.cfg.vuln;
    if (this.pylonsUp()) return 'immune';
    if (this.reflectT > 0) return 'reflect';
    if (this.e.cloak && this.e.cloak.on) return 'immune';
    if (this.stunT > 0) return true;
    switch (v) {
      case 'afterAttack': return this.vulnT > 0 ? true : 'immune';
      case 'core': return part === 'core' ? true : 'immune';
      case 'back': return this.turned > 0 ? true : 'immune';
      case 'winding': return this.state === 'wind' || (this.state === 'act' && this.move && this.move.t === 'charge') ? true : 'immune';
      case 'adds': return this.addsUp() ? 'immune' : true;
      case 'shield': return this.shield > 0 ? 'shield' : true;
      case 'head': return part === 'head' ? true : 'immune';
      default: return true;
    }
  }

  vulnerableNow() { const r = this.gate(this.cfg.vuln === 'core' ? 'core' : this.cfg.vuln === 'head' ? 'head' : 'body'); return r === true; }

  onHit(amount) {
    if (this.state === 'wind') this.windDmg += amount;
    if (this.state === 'act' && this.move && this.move.t === 'charge') this.windDmg += amount;
  }

  update(dt) {
    const e = this.e, g = e.game;
    dt *= this.speed;
    this.vulnT -= dt; this.reflectT -= dt; this.stunT -= dt; this.immuneMsgT -= dt;
    if (this.turned > 0) { this.turned -= dt; e.yawExtra = this.turned > 0 ? Math.PI : 0; }
    if (this.core) { this.coreT -= dt; if (this.coreT <= 0) this.moveCore(); this.core.visible = true; this.core.scale.setScalar(1 + Math.sin(e.phase * 10) * 0.15); }
    if (this.halo) this.halo.rotation.y += dt * 2;
    if (this.shieldMax) {
      if (this.shield <= 0) { this.shieldRegen += dt; if (this.shieldRegen > 6) { this.shield = this.shieldMax; this.shieldRegen = 0; g.sfx.zap(); } }
    }
    const shielded = this.pylonsUp() || this.shield > 0;
    this.bubble.visible = shielded || this.reflectT > 0;
    this.bubble.material = this.reflectT > 0 ? REFLECT_M : SHIELD_M;
    if (this.cfg.vuln === 'afterAttack' || this.cfg.vuln === 'back' || this.cfg.vuln === 'winding') {
      // armored look: sparkly shimmer when it can't be hurt
      if (!this.vulnerableNow() && Math.random() < dt * 3) g.fx.sparks(e.centerWorld(tmp), 1);
    }
    if (!this.enraged && e.hp < e.maxHp * 0.5) {
      this.enraged = true; g.bossEnraged(e);
    }
    if (this.stunT > 0) { e.stagger = 1; return; }

    switch (this.state) {
      case 'idle':
        this.wander(dt);
        this.t -= dt;
        if (this.t <= 0 && g.combatActive) this.begin();
        break;
      case 'wind':
        this.t -= dt;
        e.aimAmt = Math.min(1, e.aimAmt + dt * 4);
        if (e.glow) { e.glow.visible = Math.floor(this.t * 16) % 2 === 0; e.glow.scale.setScalar(1 + (1 - this.t / this.windDur) * 0.8); }
        if (this.move.t === 'laser') g.fx.beam(e.muzzle(new THREE.Vector3()), g.camPos.clone().add(new THREE.Vector3(0, -0.12, 0)), 0xff2010, 0.01 + (1 - this.t / this.windDur) * 0.05, 0.04);
        if (this.move.t === 'slam') e.body.position.y += Math.sin((1 - this.t / this.windDur) * Math.PI) * 0.4;
        if (this.move.t === 'heal' && Math.random() < dt * 20) g.fx.emit(e.centerWorld(new THREE.Vector3()), 1, 'goo', 1.5, -2, 0.6);
        // interruptible wind-ups
        if (['laser', 'heal', 'slam'].includes(this.move.t) && this.windDmg >= this.breakDmg()) { this.interrupt(); break; }
        if (this.t <= 0) { if (e.glow) e.glow.visible = false; this.execute(); }
        break;
      case 'act':
        this.act(dt);
        break;
      case 'recover':
        this.t -= dt; e.aimAmt = Math.max(0, e.aimAmt - dt * 3);
        this.wander(dt);
        if (this.t <= 0) { this.state = 'idle'; this.t = rand(Math.random, 0.8, 1.6); }
        break;
    }
  }

  breakDmg() { return 3 + (this.e.game.diff || 1) * 0.25; }

  interrupt() {
    const e = this.e, g = e.game;
    this.state = 'recover'; this.t = 1.6; this.stunT = 1.6; this.vulnT = 2.5;
    if (e.glow) e.glow.visible = false;
    g.bossMsg('STAGGERED!');
    g.sfx.botDeath();
  }

  wander(dt) {
    const e = this.e;
    if (e.def.move === 'turret') return;
    if (!this.home) this.home = e.pos.clone();
    if (!this.goal || e.pos.distanceTo(this.goal) < 0.1) {
      this.goal = this.home.clone();
      this.goal.x = clamp(this.home.x + rand(Math.random, -1.6, 1.6), -2.2, 2.2);
      if (e.flyer) this.goal.y = rand(Math.random, 1.6, 2.2);
    }
    e.moveTo(this.goal, 0.9 * (e.flyer ? 1.4 : 1), dt);
  }

  begin() {
    const list = this.cfg.moves.concat(this.enraged ? this.cfg.enrage : []);
    let m = this.enraged && Math.random() < 0.5 ? pick(Math.random, list) : list[this.idx++ % this.cfg.moves.length];
    if (m.t === 'pylons' && this.pylonsUp()) m = this.cfg.moves.find((x) => x.t !== 'pylons') || m;
    if (m.t === 'summon' && this.addsUp() && this.adds.length >= 3) m = this.cfg.moves.find((x) => x.t !== 'summon') || m;
    this.move = m;
    this.state = 'wind'; this.windDmg = 0;
    this.windDur = this.t = { laser: 1.7, heal: 1.8, slam: 1.1, charge: 0.8, bombs: 0.9, summon: 1.0, pylons: 1.0, clones: 0.8, cloak: 0.5, turn: 0.4, reflect: 0.5, teleport: 0.5 }[m.t] || 0.75;
    if (m.t === 'laser' || m.t === 'heal') this.e.game.bossMsg(m.t === 'laser' ? 'CHARGING — SHOOT TO CANCEL' : 'HEALING — INTERRUPT IT');
    this.e.game.sfx.telegraph();
  }

  shots(n, spread, kind, extra = {}) {
    const e = this.e;
    for (let k = 0; k < n; k++) e.shoot(kind || 'orb', (k - (n - 1) / 2) * spread, { dmg: n > 2 ? MULTI.dmg : 1, ...extra });
  }

  execute() {
    const e = this.e, g = e.game, m = this.move;
    this.state = 'recover'; this.t = 0.7;
    const kind = m.kind;
    switch (m.t) {
      case 'bombs': for (let k = 0; k < m.n; k++) g.spawnBomb(e.muzzle(new THREE.Vector3()), k, m.n, kind || 'bomb', e.dmg * 2); g.sfx.launcher(); break;
      case 'fan': this.shots(m.n || 5, 0.11, kind || 'big'); break;
      case 'wall': {
        const from = e.muzzle(new THREE.Vector3()); const n = m.n || 7;
        for (let k = 0; k < n; k++) { const off = (k - (n - 1) / 2) * 0.55; g.spawnProjectile(from.clone().add(new THREE.Vector3(off, 0, 0)), g.camPos.clone().add(new THREE.Vector3(off, 0, 0)), e.pspeed * 0.75, e.dmg * MULTI.dmg, kind || 'orb'); }
        g.sfx.enemyShot(); break;
      }
      case 'homing': this.shots(m.n || 3, 0.5, kind || 'missile', { homing: true }); break;
      case 'rain': {
        const n = m.n || 6;
        for (let k = 0; k < n; k++) {
          const from = new THREE.Vector3(rand(Math.random, -2.4, 2.4), 2.85, g.camPos.z - rand(Math.random, 3.5, 7));
          g.spawnProjectile(from, g.camPos.clone().add(new THREE.Vector3(rand(Math.random, -0.5, 0.5), rand(Math.random, -0.4, 0.2), 0)), e.pspeed * 0.55, e.dmg * MULTI.dmg, kind || 'orb', { delay: k * 0.18 });
        }
        g.sfx.telegraph(); break;
      }
      case 'mines': {
        const from = e.muzzle(new THREE.Vector3());
        for (let k = 0; k < (m.n || 4); k++) {
          const park = new THREE.Vector3(rand(Math.random, -2, 2), rand(Math.random, 1.1, 2.4), g.camPos.z - rand(Math.random, 4, 6.5));
          g.spawnProjectile(from, park, 3.5, e.dmg * 1.5, 'mine', { mine: 1.4 + k * 0.4 });
        }
        break;
      }
      case 'barrage': case 'spin': this.state = 'act'; this.t = 0; this.left = m.t === 'spin' ? 16 : (m.n || 12); this.ang = 0; break;
      case 'laser': g.fx.beam(e.muzzle(new THREE.Vector3()), g.camPos.clone().add(new THREE.Vector3(0, -0.15, 0)), 0xff3020, 0.14, 0.3); g.sfx.rail(); g.hurtPlayer(e.dmg * 2.2, e); break;
      case 'charge': this.state = 'act'; this.windDmg = 0; this.chargeBack = false; g.bossMsg('CHARGING — STUN IT!'); break;
      case 'slam': {
        g.sfx.explode(); g.shakeCam(0.7);
        const base = e.pos.clone().setY(0.35);
        for (const off of [-1.2, 0, 1.2]) g.spawnProjectile(base.clone().add(new THREE.Vector3(off, 0, 0.6)), g.camPos.clone().setY(1.25).add(new THREE.Vector3(off * 0.3, 0, 0)), e.pspeed * 0.8, e.dmg * 1.3, 'sonic');
        break;
      }
      case 'sonic': this.shots(5, 0.13, 'sonic'); g.sfx.rail(); break;
      case 'summon': this.adds.push(...g.spawnMinion(m.type, e.pos, m.n || 2)); break;
      case 'teleport': this.teleport(); break;
      case 'heal': e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.15); g.sfx.pickup(); g.bossMsg('IT HEALED'); break;
      case 'clones': this.spawnClones(m.n || 2); break;
      case 'pylons': this.spawnPylons(m.n || 2); break;
      case 'turn': this.turned = 3.0; this.state = 'recover'; this.t = 3.0; g.bossMsg('ITS BACK IS EXPOSED!'); break;
      case 'cloak': if (e.cloak) { e.cloak.on = true; } else { e.cloak = { on: true, t: 0 }; } e.applyMats(); this.cloakT = 2.4; this.state = 'act'; g.sfx.zap(); break;
      case 'reflect': this.reflectT = 2.8; this.state = 'recover'; this.t = 2.8; g.bossMsg('REFLECTING — HOLD FIRE'); g.sfx.zap(); break;
    }
    if (this.state === 'recover' && this.cfg.vuln === 'afterAttack' && !['turn', 'reflect', 'teleport', 'pylons', 'cloak'].includes(m.t)) { this.vulnT = 2.8; g.bossMsg('VULNERABLE!'); }
  }

  act(dt) {
    const e = this.e, g = e.game, m = this.move;
    if (m.t === 'barrage' || m.t === 'spin') {
      this.t -= dt;
      if (this.t <= 0) {
        if (m.t === 'spin') { this.ang += 0.35; e.shoot(m.kind || 'orb', Math.sin(this.ang) * 0.5, MULTI); e.shoot(m.kind || 'orb', -Math.sin(this.ang) * 0.5, MULTI); this.t = 0.14; }
        else { e.shoot(m.kind || 'shard', 0, MULTI); this.t = 0.11; }
        if (--this.left <= 0) this.finish();
      }
      return;
    }
    if (m.t === 'charge') {
      const target = this.chargeBack ? this.home : new THREE.Vector3(g.camPos.x, 0, g.camPos.z - 1.5);
      if (this.windDmg >= this.breakDmg() * 1.6 && !this.chargeBack) { this.chargeBack = true; this.interrupt(); g.bossMsg('STUNNED!'); this.state = 'act'; this.t = 0; this.stunT = 2.2; this.vulnT = 2.5; return; }
      if (e.moveTo(target, this.chargeBack ? 2.2 : 4.2, dt)) {
        if (!this.chargeBack) { g.hurtPlayer(e.dmg * 2.6, e); g.shakeCam(1); e.swingT = 0.3; this.chargeBack = true; }
        else this.finish();
      }
      return;
    }
    if (m.t === 'cloak') {
      this.cloakT -= dt;
      this.wander(dt * 2);
      if (this.cloakT <= 0) { e.cloak.on = false; e.applyMats(); this.shots(3, 0.12, 'big'); this.finish(); }
    }
  }

  finish() {
    this.state = 'recover'; this.t = 0.8;
    if (this.cfg.vuln === 'afterAttack') { this.vulnT = 2.8; this.e.game.bossMsg('VULNERABLE!'); }
  }

  teleport() {
    const e = this.e, g = e.game;
    g.fx.sparks(e.centerWorld(new THREE.Vector3()), 14);
    if (!this.home) this.home = e.pos.clone();
    e.pos.x = clamp(rand(Math.random, -2, 2), -2.2, 2.2);
    e.pos.z = this.home.z + rand(Math.random, -1, 1.2);
    this.goal = null;
    g.fx.sparks(e.centerWorld(new THREE.Vector3()), 14); g.sfx.zap();
  }

  spawnClones(n) {
    const e = this.e, g = e.game;
    this.decoys = g.spawnDecoys(e, n);
    this.teleport();
    g.bossMsg('WHICH ONE IS REAL?');
  }

  spawnPylons(n) {
    const e = this.e, g = e.game;
    const room = g.room;
    const xs = n === 2 ? [-2.3, 2.3] : [-2.3, 0, 2.3];
    for (let k = 0; k < n; k++) {
      const p = g.spawnFixed('pylon', new THREE.Vector3(xs[k % xs.length], 0, (this.home || e.pos).z + 1.5 + (k === 1 && n === 3 ? 1.2 : 0)));
      if (p) this.pylons.push(p);
    }
    g.bossMsg('PYLONS UP — DESTROY THEM');
  }
}
