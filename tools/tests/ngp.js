const { chromium } = require('playwright');
(async () => {
  const pc = process.argv[2] !== 'm', tag = pc ? 'pc' : 'm';
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: pc ? { width: 1280, height: 720 } : { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto(`http://localhost:8080/versions/${pc ? 'pc' : 'mobile'}/`);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('overtime.tutorialDone', 'true'); localStorage.setItem('overtime.settings', JSON.stringify({ lock: 0 })); });
  await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => { const pr = window.__game.profile; pr.stats.wins = 1; pr.endings = { 0: 1, 1: 1, 2: 1, 3: 1 }; pr.ngp = true; });
  await p.evaluate(() => document.getElementById('menuBtn').click()); await p.waitForTimeout(1200);
  await p.screenshot({ path: `ngp_${tag}_title.png` });
  await p.click('#startBtn'); await p.waitForTimeout(500);
  await p.screenshot({ path: `ngp_${tag}_modes.png` });
  console.log('body ngp', await p.evaluate(() => document.body.classList.contains('ngp')));
  // start a story run, floor 12
  await p.evaluate(() => { document.getElementById('modeSelect').classList.add('hidden'); window.__game.startGame(12); });
  await p.waitForTimeout(3000);
  const r = await p.evaluate(() => { const g = window.__game; const out = { ngp: g.G.ngp }; out.hp = g.G.enemies.map(e => e.type + ':' + e.maxHp.toFixed(1)).slice(0, 5);
    for (const t of ['overseer','nightmare','hunter','redcell','auditprime','shiftghost']) { const e = g.spawnAt(t); out[t] = !!e && e.maxHp; } return out; });
  console.log(JSON.stringify(r));
  await p.waitForTimeout(1500); await p.screenshot({ path: `ngp_${tag}_combat.png` });
  console.log('errs', errs);
  await b.close();
})();
