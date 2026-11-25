const { chromium } = require('playwright');
(async () => {
  const pc = process.argv[2] !== 'm', tag = pc ? 'pc' : 'm';
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: pc ? { width: 1280, height: 720 } : { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1])); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  await p.goto(`http://localhost:8080/versions/${pc ? 'pc' : 'mobile'}/`);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('overtime.tutorialDone', 'true'); localStorage.setItem('overtime.settings', JSON.stringify({ lock: 0, dev: 1 })); localStorage.setItem('overtime.dev', JSON.stringify({ god: true })); });
  await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => window.__game.startGame(7));
  await p.waitForFunction(() => window.__game.mode === 'combat', null, { timeout: 25000 });
  await p.evaluate(() => window.__game.giveGun('spirit')); await p.waitForTimeout(700);
  await p.screenshot({ path: `w_${tag}_idle.png` });
  const tgt = () => p.evaluate(() => { const g = window.__game; const e = g.G.enemies.find(e => e.alive && e.targetable); if (!e) return null; const s = g.toScreen(e.centerWorld(e.pos.clone())); return [s.x, s.y, e.type, Math.round(e.hp)]; });
  let t = await tgt();
  await p.evaluate(([x, y]) => window.__game.tryFire(x, y), t);
  await p.waitForTimeout(350); await p.screenshot({ path: `w_${tag}_barrage.png` });
  await p.waitForTimeout(800);
  console.log('target', t, '-> after', await p.evaluate((type) => { const e = window.__game.G.enemies.find(x => x.type === type); return e ? [e.alive, Math.round(e.hp)] : 'gone'; }, t[2]), 'gauge', await p.evaluate(() => document.getElementById('ammoLbl').textContent));
  // overdrive
  await p.evaluate(() => { /* fill gauge via many barrages is slow: cheat */ });
  for (let i = 0; i < 2; i++) { t = await tgt(); if (!t) break; await p.evaluate(([x, y]) => { window.__game.P.cd = 0; window.__game.tryFire(x, y); }, t); await p.waitForTimeout(700); }
  console.log('gauge after barrages', await p.evaluate(() => document.getElementById('ammoLbl').textContent));
  // WATCH
  await p.evaluate(() => window.__game.giveGun('watch')); await p.waitForTimeout(400);
  await p.waitForFunction(() => { const g = window.__game; if (g.choiceOpen) document.getElementById('gcLeave').click(); return g.mode === 'combat'; }, null, { timeout: 90000 });
  await p.waitForTimeout(1500);
  const before = await p.evaluate(() => ({ v: window.__game.G.variant, room: window.__game.G.room.type, pos: window.__game.G.enemies.filter(e => e.alive).map(e => e.pos.x.toFixed(1)).join(',') }));
  await p.screenshot({ path: `w_${tag}_watch0.png` });
  await p.evaluate(() => window.__game.tryFire(100, 100));
  await p.waitForTimeout(150); await p.screenshot({ path: `w_${tag}_watch1.png` });
  await p.waitForTimeout(900); await p.screenshot({ path: `w_${tag}_watch2.png` });
  const after = await p.evaluate(() => ({ v: window.__game.G.variant, room: window.__game.G.room.type, pos: window.__game.G.enemies.filter(e => e.alive).map(e => e.pos.x.toFixed(1)).join(','), ammo: document.getElementById('ammoLbl').textContent }));
  console.log('watch before', JSON.stringify(before), 'after', JSON.stringify(after));
  await p.evaluate(() => window.__game.tryFire(100, 100)); await p.waitForTimeout(200);
  console.log('second use toast:', await p.evaluate(() => document.getElementById('toast').textContent));
  console.log('errors', errs);
  await b.close();
})();
