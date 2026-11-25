const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('http://localhost:8080/versions/pc/');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('overtime.tutorialDone', 'true'); localStorage.setItem('overtime.settings', JSON.stringify({ lock: 0 })); });
  await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => window.__game.startGame(9));
  for (let i = 0; i < 120; i++) { if (await p.evaluate(() => window.__game.mode === 'combat')) break; await p.waitForTimeout(200); }
  await p.evaluate(() => { window.__game.giveGun('spirit'); window.__game.equip(0); });
  const states = {}; let shots = 0;
  const k0 = await p.evaluate(() => window.__game.profile.stats.kills || 0);
  for (let i = 0; i < 60; i++) {
    const st = await p.evaluate(() => { const g = window.__game; g.P.hp = Math.max(g.P.hp, 60); return [g.spirit, g.G.projectiles.filter((q) => q.alive).length, JSON.stringify(g.spiritDbg)]; }); if (i % 6 === 0) console.log(st[2]);
    states[st[0]] = (states[st[0]] || 0) + 1; shots += st[1];
    if (i === 15 || i === 35) await p.screenshot({ path: `sp2_${i}.png` });
    await p.waitForTimeout(200);
  }
  const k1 = await p.evaluate(() => window.__game.profile.stats.kills || 0);
  console.log('states', JSON.stringify(states), 'kills by spirit (with gun idle)', k1 - k0, 'returns', await p.evaluate(() => window.__game.profile.stats.spiritReturns || 0));
  console.log('errs', errs);
  await b.close();
})();
