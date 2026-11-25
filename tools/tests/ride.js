const { chromium } = require('playwright');
(async () => {
  const pc = process.argv[2] !== 'm', tag = pc ? 'pc' : 'm';
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: pc ? { width: 1280, height: 720 } : { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto(`http://localhost:8080/versions/${pc ? 'pc' : 'mobile'}/`);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('overtime.tutorialDone', 'true'); localStorage.setItem('overtime.settings', JSON.stringify({ lock: 0 })); });
  await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => window.__game.startGame(2));
  for (let i = 0; i < 1200; i++) { const m = await p.evaluate(() => { const g = window.__game; g.P.hp = 999; for (const e of g.G.enemies) if (e.alive && e.targetable) e.damage(9999, 'body', e.pos.clone()); if (g.choiceOpen) document.getElementById('gcLeave').click(); return g.mode; }); if (m === 'floorclear') break; await p.waitForTimeout(150); }
  await p.waitForTimeout(600); await p.screenshot({ path: `ride_${tag}_1.png` });
  await p.click('#nextBtn'); await p.waitForTimeout(2600); await p.screenshot({ path: `ride_${tag}_2.png` });
  await p.click('#perkCards .perkCard >> nth=0'); await p.waitForTimeout(1500); await p.screenshot({ path: `ride_${tag}_3.png` });
  console.log('floor now', await p.evaluate(() => window.__game.G.floorNum), errs);
  await b.close();
})();
