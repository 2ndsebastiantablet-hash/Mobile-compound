const { chromium } = require('playwright');
(async () => {
  const pc = process.argv[2] !== 'm', tag = pc ? 'pc' : 'm';
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: pc ? { width: 1280, height: 720 } : { width: 390, height: 844 }, hasTouch: !pc });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto(`http://localhost:8080/versions/${pc ? 'pc' : 'mobile'}/`);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('overtime.tutorialDone', 'true'); localStorage.setItem('overtime.settings', JSON.stringify({ lock: 0 })); });
  await p.reload(); await p.waitForTimeout(800);
  console.log('title', await p.evaluate(() => document.getElementById('bestLbl').textContent));
  await p.evaluate(() => { const pr = window.__game.profile; pr.allModes = true; pr.roam = true; pr.stats.runs = 1; });
  await p.click('#startBtn'); await p.waitForTimeout(400);
  await p.screenshot({ path: `roam_${tag}_modes.png` });
  await p.evaluate(() => { document.getElementById('modeSelect').classList.add('hidden'); window.__game.startGame(3); });
  for (let i = 0; i < 60; i++) { if (await p.evaluate(() => window.__game.mode === 'combat')) break; await p.waitForTimeout(200); }
  await p.evaluate(() => { for (const e of window.__game.G.enemies) { e.fireMul = 99; } window.__game.P.hp = 999; });
  const before = await p.evaluate(() => ({ x: window.__game.G.camPos.x, z: window.__game.G.camPos.z, roam: window.__game.G.roam }));
  if (pc) { await p.keyboard.down('d'); await p.keyboard.down('w'); await p.waitForTimeout(1200); await p.keyboard.up('d'); await p.keyboard.up('w'); }
  else { const r = await p.evaluate(() => { const b = document.getElementById('roamStick').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, vis: !document.getElementById('roamStick').classList.contains('hidden') }; }); console.log('stick', r);
    await p.mouse.move(r.x, r.y); await p.mouse.down(); await p.mouse.move(r.x + 50, r.y - 50, { steps: 4 }); await p.waitForTimeout(1200); await p.screenshot({ path: `roam_${tag}_move.png` }); await p.mouse.up(); }
  const after = await p.evaluate(() => ({ x: window.__game.G.camPos.x, z: window.__game.G.camPos.z, mode: window.__game.mode }));
  console.log(JSON.stringify({ before, after }));
  if (pc) await p.screenshot({ path: `roam_${tag}_move.png` });
  // finish the area: walk continues from the new spot
  for (let i = 0; i < 200; i++) { const m = await p.evaluate(() => { const g = window.__game; g.P.hp = 999; for (const e of g.G.enemies) if (e.alive && e.targetable) e.damage(9999, 'body', e.pos.clone()); if (g.choiceOpen) document.getElementById('gcLeave').click(); return g.mode; }); if (m === 'floorclear') break; await p.waitForTimeout(150); }
  console.log('end mode', await p.evaluate(() => window.__game.mode), 'errs', errs);
  await b.close();
})();
