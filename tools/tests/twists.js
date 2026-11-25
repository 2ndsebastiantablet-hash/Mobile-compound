const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('http://localhost:8080/versions/pc/');
  await p.evaluate(() => { localStorage.setItem('overtime.tutorialDone', 'true'); localStorage.setItem('overtime.settings', JSON.stringify({ lock: 0, gfx: 0 })); });
  await p.reload(); await p.waitForTimeout(800);
  const ids = await p.evaluate(() => import('/shared/game/modes.js').then(m => m.DAILY_MODS.map(x => x.id)));
  const out = [];
  for (const id of ids) {
    await p.evaluate((id) => { const g = window.__game; g.forceTwist(id); g.startGame(window.__game.run.daily.start); }, id);
    await p.waitForTimeout(2600);
    const r = await p.evaluate(() => { const g = window.__game; for (const e of g.G.enemies) if (e.alive && e.targetable) e.damage(9999, 'body', e.pos.clone()); return { inv: g.P.inv.map(s => s.id).join('/'), hp: g.M.maxHp, n: g.G.enemies.length, mood: g.G.floor.plan.mood }; });
    await p.waitForTimeout(400);
    out.push(id + ':' + JSON.stringify(r));
  }
  console.log(out.join('\n'));
  console.log('errors', errs.slice(0, 5));
  await b.close();
})();
