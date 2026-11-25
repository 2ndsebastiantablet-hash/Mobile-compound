const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 800, height: 450 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8080/versions/pc/');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('overtime.tutorialDone', 'true'); localStorage.setItem('overtime.profile', JSON.stringify({ upgrades: { orientation: 2, goldmagnet: 3, sharp: 5, trigger: 5, mags: 5, coffee: 3, responder: 3, scrapper: 3, reflexes: 3, momentum: 3, clover: 3 }, weapons: { pistol: 10 } })); });
  await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => window.__game.startGame(3));
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => { const g = window.__game, M = g.M; return { perks: g.perks.perkLv, head: M.head.toFixed(2), cd: M.cd.toFixed(3), mag: M.mag.toFixed(2), coffee: M.coffee, medkit: M.medkit.toFixed(2), scav: M.scavenge.toFixed(2), duckCd: M.duckCd, combo: M.comboWindow, luck: M.luck.toFixed(2), gold: M.goldChance, pistolMag: g.magOf(g.GUNS.find(x => x.id === 'pistol')), gold_skins: g.G.enemies.filter(e => e.skin && e.skin.rare).length + '/' + g.G.enemies.length }; });
  console.log(JSON.stringify(r), errs);
  await b.close();
})();
