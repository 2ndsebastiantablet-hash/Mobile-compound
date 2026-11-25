const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1])); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  await p.goto(`http://localhost:8080/versions/pc/`);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('overtime.tutorialDone', 'true'); localStorage.setItem('overtime.settings', JSON.stringify({ lock: 0, dev: 1 })); localStorage.setItem('overtime.dev', JSON.stringify({ god: true })); localStorage.setItem('overtime.profile', JSON.stringify({ allModes: true, stats: { maxFloor: 12, bossKills: 4 } })); });
  await p.reload(); await p.waitForTimeout(900);
  const log = (...a) => console.log(...a);
  const pickMode = async (name) => { await p.click('#startBtn'); await p.waitForTimeout(300); await p.evaluate((name) => { const r = [...document.querySelectorAll('#modeList .hq-row')].find(r => r.textContent.includes(name)); r.querySelector('button').click(); }, name); await p.waitForTimeout(300); const d = await p.evaluate(() => !document.getElementById('diffSelect').classList.contains('hidden')); if (d) await p.evaluate(() => document.querySelectorAll('#diffList .hq-buy')[1].click()); };
  await p.click('#startBtn'); await p.waitForTimeout(300);
  log('modes:', await p.evaluate(() => document.getElementById('modeList').innerText.replace(/\n+/g, ' | ').slice(0, 400)));
  await p.screenshot({ path: 'm_select.png' });
  await p.click('#modeBack'); await p.waitForTimeout(200);
  // DAILY
  await pickMode('DAILY');
  await p.waitForFunction(() => window.__game.mode === 'combat', null, { timeout: 25000 });
  log('daily:', JSON.stringify(await p.evaluate(() => { const r = window.__game.run; return { mode: r.runMode, mod: r.mod, start: r.daily.start, floor: window.__game.G.floorNum, inv: window.__game.P.inv.map(s => s.id), perks: window.__game.perks.perkLv, area: document.getElementById('areaLbl').textContent }; })));
  await p.screenshot({ path: 'm_daily.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(200); await p.click('#quitBtn'); await p.waitForTimeout(800);
  // RUSH
  await p.click('#startBtn'); await p.waitForTimeout(300);
  await p.click('#confirmYes').catch(() => {});
  await p.waitForTimeout(300);
  await p.evaluate(() => { const r = [...document.querySelectorAll('#modeList .hq-row')].find(r => r.textContent.includes('BOSS RUSH')); r.querySelector('button').click(); });
  await p.waitForTimeout(300); await p.evaluate(() => document.querySelectorAll('#diffList .hq-buy')[1].click());
  await p.waitForTimeout(400); await p.evaluate(() => { const c = document.getElementById('charSelect'); if (!c.classList.contains('hidden')) c.querySelector('.hq-buy').click(); });
  await p.waitForTimeout(4000);
  log('rush state', JSON.stringify(await p.evaluate(() => ({ mode: window.__game.mode, dbg: window.__game.dbg, run: { m: window.__game.run.runMode, idx: window.__game.run.rushIdx }, floor: window.__game.G.floorNum, vis: [...document.querySelectorAll('.screen')].filter(e => !e.classList.contains('hidden')).map(e => e.id) }))), errs);
  await p.waitForFunction(() => window.__game.mode === 'combat', null, { timeout: 25000 });
  log('rush:', JSON.stringify(await p.evaluate(() => ({ floor: window.__game.G.floorNum, rooms: window.__game.G.floor.rooms.length, boss: window.__game.area.boss && window.__game.area.boss.def.name, area: document.getElementById('areaLbl').textContent }))));
  await p.screenshot({ path: 'm_rush.png' });
  for (let i = 0; i < 120; i++) { const m = await p.evaluate(() => { const g = window.__game; for (const e of g.G.enemies) if (e.alive && e.targetable) e.damage(9999, 'body', e.pos.clone()); if (g.choiceOpen) document.getElementById('gcLeave').click(); return g.mode; }); if (m === 'floorclear') break; await p.waitForTimeout(150); }
  await p.evaluate(() => window.__game.nextFloor()); await p.waitForTimeout(1500);
  log('rush next:', JSON.stringify(await p.evaluate(() => ({ floor: window.__game.G.floorNum, idx: window.__game.run.rushIdx }))));
  // ENDLESS past 50
  await p.evaluate(() => window.__game.goto(53)); await p.waitForTimeout(1500);
  log('floor 53 layout', await p.evaluate(() => window.__game.run.layout), await p.evaluate(() => window.__game.G.floor.plan.name));
  // note
  await p.waitForFunction(() => window.__game.mode === 'combat', null, { timeout: 25000 });
  await p.evaluate(() => { window.__game.spawnNote(); const n = window.__game.G.pickups.find(p => p.kind === 'note'); if (n) window.__game.collect(n); });
  await p.waitForTimeout(300);
  log('lore', JSON.stringify(await p.evaluate(() => window.__game.profile.lore)));
  // HQ tabs
  await p.keyboard.press('Escape'); await p.waitForTimeout(200); await p.click('#quitBtn'); await p.waitForTimeout(800);
  await p.click('#hqBtn'); await p.waitForTimeout(200);
  await p.click('#hqTabs button[data-tab="files"]'); await p.waitForTimeout(200);
  await p.evaluate(() => { const r = [...document.querySelectorAll('#hqBody .hq-row')].find(r => !r.classList.contains('dim')); r && r.click(); });
  await p.screenshot({ path: 'm_files.png' });
  await p.click('#hqTabs button[data-tab="records"]'); await p.waitForTimeout(200);
  await p.screenshot({ path: 'm_records.png' });
  log('records:', await p.evaluate(() => document.getElementById('hqBody').innerText.replace(/\n+/g, ' | ').slice(0, 300)));
  log('errors', errs);
  await b.close();
})();
