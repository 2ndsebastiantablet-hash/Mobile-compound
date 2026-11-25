const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('http://localhost:8080/versions/pc/');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('overtime.tutorialDone', 'true'); localStorage.setItem('overtime.settings', JSON.stringify({ lock: 0 })); });
  await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => { const pr = window.__game.profile; pr.endings = { 0: 1, 1: 1, 2: 1, 3: 1 }; pr.roam = true; });
  for (const fl of [3, 7, 12]) {
    await p.evaluate((n) => { window.__game.startGame(n); }, fl);
    for (let i = 0; i < 80; i++) { if (await p.evaluate(() => window.__game.mode === 'combat')) break; await p.waitForTimeout(200); }
    await p.evaluate(() => { for (const e of window.__game.G.enemies) e.fireMul = 99; window.__game.P.hp = 999; });
    const res = [];
    for (const keys of [['w'], ['a', 'w'], ['d', 'w'], ['s']]) {
      for (const k of keys) await p.keyboard.down(k);
      await p.waitForTimeout(2500);
      for (const k of keys) await p.keyboard.up(k);
      res.push(await p.evaluate(() => { const g = window.__game, c = g.G.camPos, cols = g.area.room.colliders; const inside = cols.filter((q) => c.x > q.x0 && c.x < q.x1 && c.z > q.z0 && c.z < q.z1).length; return [c.x.toFixed(2), c.z.toFixed(2), inside, cols.length]; }));
    }
    console.log('floor', fl, JSON.stringify(res));
    await p.screenshot({ path: `roam2_${fl}.png` });
  }
  console.log('errs', errs);
  await b.close();
})();
