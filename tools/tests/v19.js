// v0.19 checks: free look, ambush movement, solid world, the new watch
const { chromium } = require('playwright');
(async () => {
  const pc = process.argv[2] !== 'm', tag = pc ? 'pc' : 'm';
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: pc ? { width: 1280, height: 720 } : { width: 390, height: 844 }, hasTouch: !pc });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto(`http://localhost:8080/versions/${pc ? 'pc' : 'mobile'}/`);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('overtime.tutorialDone', 'true'); localStorage.setItem('overtime.settings', JSON.stringify({ lock: 0 })); });
  await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => { const pr = window.__game.profile; pr.endings = { 0: 1, 1: 1, 2: 1, 3: 1 }; pr.roam = true; });
  await p.evaluate(() => window.__game.startGame(4));
  const waitCombat = async () => { for (let i = 0; i < 120; i++) { if (await p.evaluate(() => window.__game.mode === 'combat')) return true; await p.waitForTimeout(200); } return false; };
  await waitCombat();
  await p.evaluate(() => { for (const e of window.__game.G.enemies) e.fireMul = 99; window.__game.P.hp = 999; });
  // 1. free look
  const y0 = await p.evaluate(() => [window.__game.yaw, window.__game.pitch]);
  if (pc) { await p.evaluate(() => { window.__game.moveAim(300, -80); }); }
  else {
    const r = await p.evaluate(() => { const b = document.getElementById('lookStick').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, vis: !document.getElementById('lookStick').classList.contains('hidden') }; });
    console.log('look stick', r.vis);
    await p.mouse.move(r.x, r.y); await p.mouse.down(); await p.mouse.move(r.x - 50, r.y - 20, { steps: 4 }); await p.waitForTimeout(900); await p.mouse.up();
  }
  const y1 = await p.evaluate(() => [window.__game.yaw, window.__game.pitch]);
  console.log('look: yaw/pitch', y0.map((v) => v.toFixed(2)), '->', y1.map((v) => v.toFixed(2)));
  await p.screenshot({ path: `v19_${tag}_look.png` });
  // 2. solid world
  console.log('solid: desk/pillar collider', await p.evaluate(() => { const c = window.__game.area.room.colliders[0]; return [c && window.__game.solidAt((c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2, (c.z0 + c.z1) / 2), window.__game.solidAt(0, 1.6, window.__game.G.camPos.z)]; }));
  // 3. the watch
  await p.evaluate(() => window.__game.giveGun('watch'));
  await p.waitForTimeout(500); await p.screenshot({ path: `v19_${tag}_watchhint.png` });
  await p.waitForTimeout(1500);
  const before = await p.evaluate(() => { const g = window.__game; const a = g.G.enemies.filter((e) => e.alive); a[0] && a[0].damage(9999, 'body', a[0].pos.clone()); g.P.hp = 40; return { alive: a.length, w: g.watch }; });
  await p.waitForTimeout(800);
  if (pc) await p.mouse.click(640, 360, { button: 'right' }); else await p.tap('#rewindBtn');
  await p.waitForTimeout(700); await p.screenshot({ path: `v19_${tag}_rewind.png` });
  console.log('rewinding', await p.evaluate(() => window.__game.watch));
  await p.waitForTimeout(2000); await p.screenshot({ path: `v19_${tag}_after.png` });
  console.log('after', await p.evaluate(() => ({ w: window.__game.watch, hp: window.__game.P.hp, alive: window.__game.G.enemies.filter((e) => e.alive).length })), 'before', JSON.stringify(before));
  // 4. ambush: clear the area with a forced ambush and move during it
  await p.evaluate(() => { window.__game.G.forceAmbush = true; });
  let amb = false;
  for (let i = 0; i < 300; i++) {
    const st = await p.evaluate(() => { const g = window.__game; g.P.hp = 999; if (g.area && g.area.ambush) return 'ambush'; for (const e of g.G.enemies) if (e.alive && e.targetable) e.damage(9999, 'body', e.pos.clone()); return g.mode; });
    if (st === 'ambush') { amb = true; break; } await p.waitForTimeout(120);
  }
  console.log('ambush', amb);
  if (amb) {
    await p.waitForTimeout(400);
    await p.evaluate(() => { for (const e of window.__game.G.enemies) e.fireMul = 99; });
    const a0 = await p.evaluate(() => [window.__game.G.camPos.x, window.__game.G.camPos.z]);
    if (pc) { await p.keyboard.down('d'); await p.waitForTimeout(900); await p.keyboard.up('d'); }
    else { const r = await p.evaluate(() => { const b = document.getElementById('roamStick').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }); await p.mouse.move(r.x, r.y); await p.mouse.down(); await p.mouse.move(r.x + 50, r.y, { steps: 3 }); await p.waitForTimeout(900); await p.mouse.up(); }
    const a1 = await p.evaluate(() => [window.__game.G.camPos.x, window.__game.G.camPos.z]);
    console.log('ambush move', a0.map((v) => v.toFixed(2)), '->', a1.map((v) => v.toFixed(2)));
    await p.screenshot({ path: `v19_${tag}_ambush.png` });
  }
  console.log('errs', errs);
  await b.close();
})();
