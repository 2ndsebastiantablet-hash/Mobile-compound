const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack||'').split('\n')[1]));
  await p.addInitScript(() => { /* autoDiff */ setInterval(() => { const d = document.getElementById('diffSelect'); if (d && !d.classList.contains('hidden')) d.querySelectorAll('.hq-buy')[1].click(); const ms = document.getElementById('modeSelect'); if (ms && !ms.classList.contains('hidden')) ms.querySelector('.hq-row:not(.ngp-row):not(.roam-row) .hq-buy').click(); }, 50); });
  await p.goto('http://localhost:8080/versions/pc/');
  await p.waitForTimeout(1500);
  const vis = (id) => p.evaluate((id) => !document.getElementById(id).classList.contains('hidden'), id);
  console.log('1. title: continue visible =', await vis('continueBtn'), '| start label =', await p.textContent('#startBtn'));
  await p.click('#startBtn');
  await p.waitForTimeout(4500);
  // play through the tutorial
  let lastHint = '', shots = 0;
  for (let i = 0; i < 400; i++) {
    const st = await p.evaluate(() => {
      const g = window.__game;
      const hint = document.getElementById('tutHint');
      const ring = document.getElementById('tutRing');
      const m = ring.style.left ? [0, parseFloat(ring.style.left) + 26, parseFloat(ring.style.top) + 26] : null;
      const e = g.G.enemies.find(e => e.targetable);
      let es = null; if (e) { const c = e.centerWorld(e.pos.clone()); c.y += 0.3; es = g.toScreen(c); }
      return { hint: hint.classList.contains('hidden') ? '' : hint.textContent, ring: !ring.classList.contains('hidden') && m ? [+m[1], +m[2]] : null, es, mode: g.mode };
    });
    if (st.hint !== lastHint) { console.log('   hint:', st.hint); lastHint = st.hint; if (st.hint) await p.screenshot({ path: `${out}/tut_${i}.png` }); }
    if (st.mode !== 'combat' && i > 5) { console.log('   mode ->', st.mode); break; }
    if (/RELOAD/.test(st.hint)) { await p.keyboard.press('r'); }
    else if (/SWITCH/.test(st.hint)) { await p.mouse.move(640, 360); await p.mouse.wheel(0, 120); }
    else if (st.ring) { await p.mouse.click(st.ring[0], st.ring[1]); shots++; }
    else if (st.es) { await p.mouse.click(st.es.x, st.es.y); shots++; }
    await p.waitForTimeout(140);
  }
  console.log('2. tutorialDone =', await p.evaluate(() => localStorage.getItem('overtime.tutorialDone')), '| run save =', await p.evaluate(() => localStorage.getItem('overtime.run')));
  // pause -> quit -> continue
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  console.log('3. pause buttons:', await p.evaluate(() => [...document.querySelectorAll('#pause button')].map(b => b.textContent).join(' | ')));
  await p.screenshot({ path: `${out}/p1_pause.png` });
  await p.click('#quitBtn'); await p.waitForTimeout(1200);
  console.log('4. title after quit: continue =', await vis('continueBtn'), await p.textContent('#continueBtn'), '| start =', await p.textContent('#startBtn'));
  await p.screenshot({ path: `${out}/p1_title.png` });
  // settings
  await p.click('#settingsBtn'); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/p1_settings.png` });
  const before = await p.evaluate(() => document.getElementById('view').height);
  await p.click('#settingsRows .setRow:nth-child(4) .seg:nth-child(1)'); // graphics LOW
  const after = await p.evaluate(() => document.getElementById('view').height);
  console.log('5. graphics LOW: render height', before, '->', after, '| saved =', await p.evaluate(() => localStorage.getItem('overtime.settings')));
  await p.click('#settingsRows .setRow:nth-child(4) .seg:nth-child(2)');
  await p.click('#settingsBack'); await p.waitForTimeout(200);
  // new run asks for confirmation
  await p.click('#startBtn'); await p.waitForTimeout(200);
  console.log('6. new-run confirm:', await vis('confirm'), JSON.stringify(await p.textContent('#confirmText')));
  await p.click('#confirmNo'); await p.waitForTimeout(200);
  // continue
  await p.click('#continueBtn'); await p.waitForTimeout(3500);
  console.log('7. continued:', await p.evaluate(() => ({ mode: window.__game.mode, floor: window.__game.G.floorNum, inv: window.__game.P.inv.map(s => s.id) })));
  console.log('errors', errs.slice(0, 5));
  await b.close();
})();
