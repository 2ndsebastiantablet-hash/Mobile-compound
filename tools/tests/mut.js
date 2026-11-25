const { chromium } = require('playwright');
(async () => {
  const pc = process.argv[2] !== 'm', tag = pc ? 'pc' : 'm';
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: pc ? { width: 1280, height: 720 } : { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1])); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  await p.goto(`http://localhost:8080/versions/${pc ? 'pc' : 'mobile'}/`);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('overtime.tutorialDone', 'true'); localStorage.setItem('overtime.settings', JSON.stringify({ lock: 0 })); localStorage.setItem('overtime.profile', JSON.stringify({ diff: 3 })); });
  await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => window.__game.startGame(4));
  await p.waitForFunction(() => window.__game.mode === 'combat', null, { timeout: 25000 });
  console.log('diff', await p.evaluate(() => window.__game.G.dd.name));
  // requiem lineup
  await p.evaluate(() => { const g = window.__game; const E = g.G.enemies[0].constructor; const z = g.area.room.z0;
    ['grunt', 'janitor', 'shredder', 'spiderbot'].forEach((t, i) => { const e = new E(g.G, t, { x: -1.8 + i * 1.2, z: z - 6, cover: false }, { active: true, isSuper: true }); e.atkT = 2 + i; g.G.enemies.push(e); }); });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `mu_${tag}_req.png` });
  console.log('requiem', JSON.stringify(await p.evaluate(() => window.__game.G.enemies.filter(e => e.isSuper).map(e => [e.displayName, e.abilities.join('+'), Math.round(e.maxHp)]))));
  // god + clear floor
  await p.evaluate(() => { localStorage.setItem('overtime.dev', JSON.stringify({ god: true })); });
  for (let i = 0; i < 600; i++) { const m = await p.evaluate(() => { const g = window.__game; g.G.timeScale = 4; g.P.hp = 999; for (const e of g.G.enemies) if (e.alive && e.targetable) e.damage(9999, 'body', e.pos.clone()); if (g.choiceOpen) document.getElementById('gcLeave').click(); return g.mode; }); if (m === 'floorclear') break; await p.waitForTimeout(150); }
  console.log('state', JSON.stringify(await p.evaluate(() => { const g = window.__game; return { mode: g.mode, area: g.area && g.area.idx, q: g.area && g.area.queue.length, alive: g.G.enemies.filter(e => e.alive).map(e => [e.type, e.state, e.targetable, e.requiem, e.stanceOn, Math.round(e.hp)]), dbg: g.dbg }; })));
  console.log('next btn', await p.textContent('#nextBtn'));
  await p.click('#nextBtn'); await p.waitForTimeout(400);
  await p.screenshot({ path: `mu_${tag}_cards.png` });
  console.log('title', await p.textContent('#perkTitle'), '| offer', await p.evaluate(() => window.__game.perks.perkOffer.join(',')));
  const before = await p.evaluate(() => ({ hp: window.__game.M.maxHp, dmg: window.__game.M.dmg }));
  await p.click('#perkCards .perkCard >> nth=0'); await p.waitForTimeout(3500);
  console.log('mut', JSON.stringify(await p.evaluate(() => window.__game.mut)), 'before', JSON.stringify(before), 'after', JSON.stringify(await p.evaluate(() => ({ hp: window.__game.M.maxHp, dmg: window.__game.M.dmg, perks: window.__game.perks.perkLv }))), 'save mut', await p.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('overtime.run')).mut)));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.screenshot({ path: `mu_${tag}_pause.png` });
  console.log('errors', errs);
  await b.close();
})();
