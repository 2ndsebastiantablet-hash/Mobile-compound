// FULL Free Roam: walk between rooms, room-triggered fights, keycards, the elevator
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('http://localhost:8080/versions/pc/');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('overtime.tutorialDone', 'true'); localStorage.setItem('overtime.settings', JSON.stringify({ lock: 0 })); });
  await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => { const pr = window.__game.profile; pr.endings = { 0: 1, 1: 1, 2: 1, 3: 1 }; pr.roam = 2; window.__game.G.forceKeycard = true; });
  await p.evaluate(() => window.__game.startGame(4));
  const g = (f) => p.evaluate(f);
  for (let i = 0; i < 120; i++) { if (await g(() => window.__game.mode === 'combat')) break; await p.waitForTimeout(200); }
  console.log('roam full', await g(() => [window.__game.G.roam, window.__game.G.roamFull, !!window.__game.G.keycard]));
  const kill = () => g(() => { const G = window.__game; G.P.hp = 999; G.G.forceAmbush = false; for (const e of G.G.enemies) if (e.alive && e.targetable) e.damage(99999, 'body', e.pos.clone()); if (G.choiceOpen) document.getElementById('gcLeave').click(); return [G.mode, G.area && G.area.idx, G.G.floor.rooms.length]; });
  let shot = 0;
  for (let room = 0; room < 8; room++) { if (room > 8) break;
    // clear the room
    let st;
    for (let i = 0; i < 200; i++) { st = await kill(); if (st[0] === 'moving') break; await p.waitForTimeout(150); }
    const info = await g(() => ({ mode: window.__game.mode, idx: window.__game.area.idx, n: window.__game.G.floor.rooms.length, z: window.__game.G.camPos.z.toFixed(1), kc: window.__game.G.keycard && { got: window.__game.G.keycard.got, room: window.__game.G.keycard.room } }));
    console.log('cleared', JSON.stringify(info));
    await p.waitForTimeout(1600);
    if (info.idx === info.n - 1) break;
    // the keycard room: go get the card first
    if (info.kc && !info.kc.got && info.kc.room === info.idx) {
      await g(() => { const k = window.__game.G.keycard; window.__game.G.camPos.set(k.mesh.position.x, 1.6, k.mesh.position.z + 0.3); });
      await p.waitForTimeout(500);
      console.log('keycard got', await g(() => window.__game.G.keycard.got));
    }
    // walk forward into the next room
    await p.keyboard.down('w'); await p.keyboard.down('Shift');
    let began = false;
    for (let i = 0; i < 80; i++) { await p.waitForTimeout(150); const m = await g(() => [window.__game.mode, window.__game.area.idx, !!window.__game.area.ambush]); if (m[0] === 'combat') { began = m; break; } }
    await p.keyboard.up('w'); await p.keyboard.up('Shift');
    console.log('walked in ->', JSON.stringify(began), 'z', await g(() => window.__game.G.camPos.z.toFixed(1)));
    if (shot++ < 2) await p.screenshot({ path: `fr_${room}.png` });
  }
  // the elevator: walk to it and press E
  await p.waitForTimeout(1500);
  await g(() => { const el = window.__game.G.floor.rooms[window.__game.G.floor.rooms.length - 1].exitElevator; window.__game.G.camPos.set(el.inside.x, 1.6, el.inside.z + 3.2); });
  await p.keyboard.down('w'); await p.waitForTimeout(2500); await p.keyboard.up('w'); await p.waitForTimeout(300);
  console.log('cab dist', await g(() => { const el = window.__game.G.floor.rooms[window.__game.G.floor.rooms.length - 1].exitElevator; return [Math.hypot(window.__game.G.camPos.x - el.inside.x, window.__game.G.camPos.z - el.inside.z).toFixed(2), el.target]; }));
  await p.screenshot({ path: 'fr_elevator.png' });
  console.log('use prompt', await p.evaluate(() => { const b = document.getElementById('useBtn'); const r = b.getBoundingClientRect(); return [b.dataset.t, b.className, getComputedStyle(b).display, r.x, r.y, r.width, b.textContent]; }));
  await p.keyboard.press('e');
  for (let i = 0; i < 40; i++) { if (await g(() => window.__game.mode === 'floorclear')) break; await p.waitForTimeout(200); }
  console.log('after E mode', await g(() => window.__game.mode));
  console.log('errs', errs);
  await b.close();
})();
