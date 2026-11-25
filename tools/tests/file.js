const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { /* autoDiff */ setInterval(() => { const d = document.getElementById('diffSelect'); if (d && !d.classList.contains('hidden')) d.querySelectorAll('.hq-buy')[1].click(); }, 50); });
  await p.goto('file:///home/user/Mobile-compound/dist/mobile/overtime-mobile.html');
  await p.waitForTimeout(1500);
  await p.click('#startBtn');
  await p.waitForTimeout(4000);
  for (let i = 0; i < 8; i++) {
    const t = await p.evaluate(() => { const g = window.__game; const e = g.G.enemies.find(e => e.alive && e.state !== 'dormant'); if (!e) return null; const c = e.centerWorld(e.pos.clone()); c.y += 0.3; return g.toScreen(c); });
    if (t) await p.mouse.click(t.x, t.y); await p.waitForTimeout(200);
  }
  await p.screenshot({ path: process.argv[2] + '/file.png' });
  console.log(JSON.stringify(await p.evaluate(() => ({ mode: window.__game.mode, kills: window.__game.G.enemies.filter(e => !e.alive).length, score: document.getElementById('scoreLbl').textContent }))), errs);
  await b.close();
})();
