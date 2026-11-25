const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('http://localhost:8080/versions/pc/');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('overtime.tutorialDone', 'true'); localStorage.setItem('overtime.settings', JSON.stringify({ lock: 0, dev: 1 })); localStorage.setItem('overtime.profile', JSON.stringify({ diff: 2 })); });
  await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => window.__game.startGame(30));
  let m;
  for (let i = 0; i < 1500; i++) {
    m = await p.evaluate(() => { const g = window.__game; g.P.hp = 999; for (const e of g.G.enemies) if (e.alive && e.targetable) e.damage(99999, 'body', e.pos.clone()); if (g.choiceOpen) document.getElementById('gcLeave').click(); return g.mode; });
    if (m === 'cutscene') break; await p.waitForTimeout(150);
  }
  console.log('mode', m, 'cs', await p.evaluate(() => !!window.__game.cs));
  await p.waitForTimeout(4000); await p.screenshot({ path: 'fin_1.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(1500);
  console.log('after skip mode', await p.evaluate(() => window.__game.mode), 'win visible', await p.evaluate(() => !document.getElementById('win').classList.contains('hidden')), await p.textContent('#winTitle'));
  console.log('endings', await p.evaluate(() => JSON.stringify(window.__game.profile.endings)));
  await p.waitForTimeout(4000); await p.screenshot({ path: 'fin_2.png' });
  await p.click('#winBtn'); await p.waitForTimeout(800);
  await p.click('#hqBtn'); await p.waitForTimeout(300); await p.click('#hqTabs button[data-tab="records"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: 'fin_3.png' });
  const watch = await p.$$('#hqBody .hq-row .hq-buy:not(.off)');
  console.log('watch buttons', watch.length);
  if (watch.length) {
    await watch[watch.length - 1].click(); await p.waitForTimeout(2500);
    console.log('replay cs', await p.evaluate(() => !!window.__game.cs)); await p.screenshot({ path: 'fin_4.png' });
    await p.click('.cs-skip'); await p.waitForTimeout(200); await p.click('.cs-skip'); await p.waitForTimeout(1200);
    console.log('back in hq', await p.evaluate(() => !document.getElementById('hq').classList.contains('hidden')));
  }
  await p.click('#hqBack'); await p.waitForTimeout(600);
  console.log('tDev visible', await p.evaluate(() => !document.getElementById('tDevBtn').classList.contains('hidden')));
  await p.click('#tDevBtn'); await p.waitForTimeout(300); await p.screenshot({ path: 'fin_5.png' });
  console.log('errs', errs);
  await b.close();
})();
