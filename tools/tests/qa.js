// visual QA of v0.14 screens on both versions
const { chromium } = require('playwright');
(async () => {
  const pc = process.argv[2] !== 'm', tag = pc ? 'pc' : 'm';
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: pc ? { width: 1280, height: 720 } : { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1])); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  await p.goto(`http://localhost:8080/versions/${pc ? 'pc' : 'mobile'}/`);
  const prof = { cash: 50000, stats: { kills: 3400, heads: 400, orbs: 120, meleeKills: 60, bossKills: 6, miniKills: 8, maxFloor: 22, runs: 14, earned: 30000, spent: 12000, perksTaken: 60, typesSeen: 40, propsBroken: 80, goldKills: 2 },
    upgrades: { vitality: 3, sharp: 2, goldmagnet: 1 }, weapons: { pistol: 10, shotgun: 7, rifle: 3 }, found: { pistol: 1, shotgun: 1, rifle: 1, katana: 1 },
    bestiary: { grunt: { k: 50, s: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 } }, walker: { k: 5, s: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 } }, blob: { k: 9, s: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 } } } };
  await p.evaluate((prof) => { localStorage.clear(); localStorage.setItem('overtime.tutorialDone', 'true'); localStorage.setItem('overtime.profile', JSON.stringify(prof)); localStorage.setItem('overtime.settings', JSON.stringify({ lock: 0 })); }, prof);
  await p.reload(); await p.waitForTimeout(900);
  await p.click('#hqBtn'); await p.waitForTimeout(200);
  const shot = async (name) => { await p.waitForTimeout(250); await p.screenshot({ path: `qa_${tag}_${name}.png` }); };
  await shot('upgrades');
  await p.evaluate(() => { document.getElementById('hqBody').scrollTop = 2000; }); await shot('upgrades2');
  await p.click('#hqTabs button[data-tab="armory"]'); await shot('armory');
  await p.click('#hqTabs button[data-tab="achievements"]'); await shot('awards');
  await p.evaluate(() => [...document.querySelectorAll('.aw-filter .hq-buy')][1].click()); await shot('awards_todo');
  await p.click('#hqTabs button[data-tab="log"]'); await shot('log');
  await p.evaluate(() => [...document.querySelectorAll('#hqBody .hq-row')].find(r => r.textContent.includes('OOZE')).click()); await p.waitForTimeout(500); await shot('log_ooze');
  await p.click('#hqTabs button[data-tab="files"]'); await shot('files');
  await p.click('#hqBack'); await p.waitForTimeout(300);
  // skins lineup in game
  await p.evaluate(() => window.__game.startGame(3));
  await p.waitForFunction(() => window.__game.mode === 'combat', null, { timeout: 25000 });
  await p.evaluate(() => { const g = window.__game; for (const e of g.G.enemies) if (e.alive) e.die(false, null, true);
    const z = g.area.room.z0; const types = ['grunt', 'grunt', 'grunt', 'grunt', 'grunt'];
    types.forEach((t, i) => { const e = new (g.G.enemies[0] ? g.G.enemies[0].constructor : null)(g.G, t, { x: -2.2 + i * 1.1, z: z - 5.5, cover: false }, { active: true, skin: i }); e.atkT = 99; g.G.enemies.push(e); });
    ['walker', 'blob', 'spiderbot', 'hound', 'quaddrone'].forEach((t, i) => { const e = new g.G.enemies[0].constructor(g.G, t, { x: -2.2 + i * 1.1, z: z - 8, y: 1.9, cover: false }, { active: true, skin: i }); e.atkT = 99; g.G.enemies.push(e); });
  });
  await p.waitForTimeout(800); await shot('skins');
  await p.keyboard.press('Escape'); await shot('pause');
  console.log(errs);
  await b.close();
})();
