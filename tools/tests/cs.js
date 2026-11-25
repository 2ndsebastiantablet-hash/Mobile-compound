// capture a cutscene at fixed times: node cs.js <diff> <times comma> [m]
const { chromium } = require('playwright');
(async () => {
  const diff = +process.argv[2], times = process.argv[3].split(',').map(Number), pc = process.argv[4] !== 'm', tag = pc ? 'pc' : 'm';
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: pc ? { width: 1280, height: 720 } : { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1,3).join(' '))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  await p.goto(`http://localhost:8080/versions/${pc ? 'pc' : 'mobile'}/`);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('overtime.tutorialDone', 'true'); localStorage.setItem('overtime.settings', JSON.stringify({ lock: 0 })); });
  await p.reload(); await p.waitForTimeout(800);
  if (process.env.CHAR) await p.evaluate((c) => window.__game.setChar(c), process.env.CHAR);
  // run the cutscene on a fixed clock so screenshots land on exact script times
  await p.evaluate((d) => { window.__done = false; window.__game.ending(d, () => { window.__done = true; }); }, diff);
  const t0 = Date.now();
  // drive time by polling cs.time
  for (const t of times) {
    for (let i = 0; i < 4000; i++) { const ct = await p.evaluate(() => window.__game.cs ? window.__game.cs.time : 1e9); if (ct >= t) break; await p.waitForTimeout(40); }
    await p.screenshot({ path: `cs${diff}_${tag}_${String(t).padStart(5, '0')}.png` });
  }
  console.log('wall', ((Date.now() - t0) / 1000).toFixed(1), 's; errs', errs.slice(0, 6));
  await b.close();
})();
