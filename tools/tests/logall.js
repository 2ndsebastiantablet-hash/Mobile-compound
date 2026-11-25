const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('http://localhost:8080/versions/pc/');
  const ids = await p.evaluate(() => import('/shared/content/enemies/roster.js').then(m => Object.entries(m.DEFS).filter(([id, d]) => d.model && id !== 'pylon').map(([id]) => id)));
  const best = Object.fromEntries(ids.map(id => [id, { k: 1, s: { 0: 1 } }]));
  await p.evaluate((best) => { localStorage.clear(); localStorage.setItem('overtime.profile', JSON.stringify({ bestiary: best })); }, best);
  await p.reload(); await p.waitForTimeout(800);
  await p.click('#hqBtn'); await p.waitForTimeout(200);
  await p.click('#hqTabs button[data-tab="log"]'); await p.waitForTimeout(200);
  const n = await p.evaluate(() => document.querySelectorAll('#hqBody .hq-row').length);
  const empty = [];
  for (let i = 0; i < n; i++) {
    await p.evaluate((i) => document.querySelectorAll('#hqBody .hq-row')[i].click(), i);
    await p.waitForTimeout(140);
    const r = await p.evaluate(() => { const c = document.querySelector('.log-view'); const name = document.querySelector('.log-name').textContent; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let px = 0; for (let k = 3; k < d.length; k += 4 * 7) if (d[k] > 0) px++; return { name, px }; });
    if (r.px < 30) empty.push(r.name + ':' + r.px);
    if (i % 12 === 0) await p.screenshot({ path: `la_${i}.png`, clip: { x: 500, y: 60, width: 280, height: 240 } });
    await p.evaluate(() => document.querySelector('#hqBody .hq-buy').click());
    await p.waitForTimeout(60);
  }
  console.log('entries', n, 'empty previews', empty, errs.slice(0, 5));
  await b.close();
})();
