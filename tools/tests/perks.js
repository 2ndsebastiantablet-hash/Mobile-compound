const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  for (const [ver, vp] of [['mobile', { width: 390, height: 844 }], ['pc', { width: 1280, height: 720 }]]) {
    const p = await b.newPage({ viewport: vp });
    const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack||'').split('\n')[1]));
    await p.addInitScript(() => { /* autoDiff */ setInterval(() => { const d = document.getElementById('diffSelect'); if (d && !d.classList.contains('hidden')) d.querySelectorAll('.hq-buy')[1].click(); const ms = document.getElementById('modeSelect'); if (ms && !ms.classList.contains('hidden')) ms.querySelector('.hq-row:not(.ngp-row):not(.roam-row) .hq-buy').click(); }, 50); });
  await p.goto(`http://localhost:8080/versions/${ver}/`);
    await p.evaluate(() => localStorage.setItem('overtime.tutorialDone', 'true'));
    await p.waitForTimeout(1200);
    await p.evaluate(() => window.__game.startGame(4));
    // clear the floor fast: wipe enemies whenever they are targetable
    for (let i = 0; i < 900; i++) {
      const m = await p.evaluate(() => { const g = window.__game; g.P.hp = 100; for (const e of g.G.enemies) if (e.targetable) e.damage(9999, 'body', e.pos.clone()); if (g.choiceOpen) document.getElementById('gcLeave').click(); return g.mode; });
      if (m === 'floorclear') break;
      await p.waitForTimeout(100);
    }
    console.log(ver, 'next button:', await p.textContent('#nextBtn'));
    await p.click('#nextBtn'); await p.waitForTimeout(300);
    await p.screenshot({ path: `${out}/perks_${ver}.png` });
    const offer1 = await p.evaluate(() => window.__game.perks.perkOffer.slice());
    await p.click('#perkReroll'); await p.waitForTimeout(200);
    const offer2 = await p.evaluate(() => window.__game.perks.perkOffer.slice());
    console.log(ver, 'offer', offer1.join(','), '-> reroll ->', offer2.join(','), '| reroll btn hidden:', await p.evaluate(() => document.getElementById('perkReroll').classList.contains('hidden')));
    await p.click('#perkCards .perkCard >> nth=0'); await p.waitForTimeout(3500);
    const st = await p.evaluate(() => ({ mode: window.__game.mode, floor: window.__game.G.floorNum, perks: window.__game.perks.perkLv, save: JSON.parse(localStorage.getItem('overtime.run')).perks }));
    console.log(ver, 'after pick:', JSON.stringify(st));
    if (ver === 'pc') {
      // apply a few perks directly and check the numbers react
      const chk = await p.evaluate(() => {
        const g = window.__game, r = {};
        r.hpBefore = g.perks.M.maxHp;
        return r;
      });
      await p.keyboard.press('Escape'); await p.waitForTimeout(200);
      console.log('pause perk list:', await p.textContent('#pausePerks'));
      await p.screenshot({ path: `${out}/perks_pause.png` });
      await p.click('#quitBtn'); await p.waitForTimeout(1000);
      await p.click('#continueBtn'); await p.waitForTimeout(3000);
      console.log('continued run perks:', JSON.stringify(await p.evaluate(() => window.__game.perks.perkLv)), '| floor', await p.evaluate(() => window.__game.G.floorNum));
    }
    console.log(ver, 'errors', errs.slice(0, 4));
    await p.close();
  }
  await b.close();
})();
