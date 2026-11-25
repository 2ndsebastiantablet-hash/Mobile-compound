const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('http://localhost:8080/versions/pc/');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('overtime.tutorialDone', 'true'); localStorage.setItem('overtime.settings', JSON.stringify({ lock: 0 })); });
  await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => { const pr = window.__game.profile; pr.endings = { 0: 1, 1: 1, 2: 1, 3: 1 }; pr.ngp = true; pr.ngpLevel = 3; });
  await p.evaluate(() => document.getElementById('menuBtn').click()); await p.waitForTimeout(800);
  console.log('logo', await p.evaluate(() => document.querySelector('#title .logo').textContent), '|', await p.textContent('#title .tag'));
  await p.evaluate(() => window.__game.startGame(6));
  for (let i = 0; i < 120; i++) { if (await p.evaluate(() => window.__game.mode === 'combat')) break; await p.waitForTimeout(200); }
  console.log('ngp', await p.evaluate(() => ({ ngp: window.__game.G.ngp, lv: window.__game.G.ngpLv, hp: window.__game.G.ngpHp, cash: window.__game.M.cash })));
  // weapon drops: how many NG+ guns in 400 rolls
  console.log('ngp gun rolls', await p.evaluate(() => { const ids = new Set(['pinkslip', 'bloodcontract', 'closer', 'mandatoryfun', 'overtimecannon', 'severance']); let n = 0; for (let i = 0; i < 400; i++) if (ids.has(window.__game.rollGun(20))) n++; return n; }));
  // the nightmare floors
  for (const lf of [3, 23, 48]) { console.log(await p.evaluate((f) => window.__game.preview(f, 3, 0), lf)); }
  await p.waitForTimeout(600); await p.screenshot({ path: 'ngp2_floor.png' });
  await p.evaluate(() => window.__game.preview(28, 3, 1)); await p.waitForTimeout(600); await p.screenshot({ path: 'ngp2_floor2.png' });
  // execute with THE CLOSER
  await p.evaluate(() => window.__game.goto(6));
  for (let i = 0; i < 120; i++) { if (await p.evaluate(() => window.__game.mode === 'combat')) break; await p.waitForTimeout(200); }
  await p.evaluate(() => { window.__game.giveGun('closer'); });
  await p.waitForTimeout(400); await p.screenshot({ path: 'ngp2_closer.png' });
  console.log('achievements', await p.evaluate(() => { window.__game.checkAch(); return Object.keys(window.__game.profile.ach).filter((k) => k.startsWith('ngp')); }));
  console.log('errs', errs);
  await b.close();
})();
