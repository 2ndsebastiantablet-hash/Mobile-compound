const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack||'').split('\n')[1]));
  await p.addInitScript(() => { /* autoDiff */ setInterval(() => { const d = document.getElementById('diffSelect'); if (d && !d.classList.contains('hidden')) d.querySelectorAll('.hq-buy')[1].click(); const ms = document.getElementById('modeSelect'); if (ms && !ms.classList.contains('hidden')) ms.querySelector('.hq-row:not(.ngp-row):not(.roam-row) .hq-buy').click(); }, 50); });
  await p.goto('http://localhost:8080/versions/pc/');
  await p.evaluate(() => localStorage.setItem('overtime.tutorialDone', 'true'));
  await p.reload(); await p.waitForTimeout(1500);
  console.log('1. title wallet:', JSON.stringify(await p.textContent('#titleCash')));
  await p.click('#startBtn'); await p.waitForTimeout(4200);
  console.log('   char select shown with 1 employee?', await p.evaluate(() => !document.getElementById('charSelect').classList.contains('hidden')));
  for (let i = 0; i < 400; i++) {
    const m = await p.evaluate(() => { const g = window.__game; g.P.hp = 100; for (const e of g.G.enemies) if (e.targetable) e.damage(9999, 'body', e.pos.clone()); return g.mode; });
    if (m === 'floorclear') break;
    if (i === 10) await p.screenshot({ path: `${out}/meta_ach.png` });
    await p.waitForTimeout(100);
  }
  console.log('2. floor clear stats:\n' + await p.textContent('#fcStats'));
  console.log('   achievements:', JSON.stringify(Object.keys(await p.evaluate(() => window.__game.profile.ach))), '| HUD cash', await p.textContent('#cashLbl'));
  // rich now: shop
  await p.evaluate(() => { window.__game.profile.cash = 60000; window.__game.profile.found.shotgun = 1; });
  await p.click('#nextBtn'); await p.waitForTimeout(200);
  await p.click('#perkCards .perkCard >> nth=0'); await p.waitForTimeout(1500);
  await p.keyboard.press('Escape'); await p.click('#quitBtn'); await p.waitForTimeout(1200);
  await p.click('#hqBtn'); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/meta_hq_up.png` });
  const buy = async (sel) => p.click(sel);
  // upgrades: vitality x2, insurance x1, backpack
  const row = (tab, name) => `#hqBody .hq-row:has(b:text-is("${name}")) .hq-buy`;
  await buy(row('u', 'VITALITY')); await buy(row('u', 'VITALITY')); await buy(row('u', 'LIFE INSURANCE')); await buy(row('u', 'BACKPACK'));
  await p.click('#hqTabs button[data-tab=armory]'); await p.waitForTimeout(200);
  await buy('#hqBody .hq-row:has(b:text-is("PISTOL")) .hq-buy'); await buy('#hqBody .hq-row:has(b:text-is("PISTOL")) .hq-buy');
  await p.screenshot({ path: `${out}/meta_hq_arm.png` });
  await p.click('#hqTabs button[data-tab=employees]'); await p.waitForTimeout(200);
  await buy('#hqBody .hq-row:has(b:text-is("THE INTERN")) .hq-buy');
  await p.screenshot({ path: `${out}/meta_hq_emp.png` });
  await p.click('#hqTabs button[data-tab=achievements]'); await p.waitForTimeout(200);
  await p.screenshot({ path: `${out}/meta_hq_ach.png` });
  const prof = await p.evaluate(() => { const pr = window.__game.profile; return { cash: pr.cash, up: pr.upgrades, w: pr.weapons, chars: pr.chars, spent: pr.stats.spent }; });
  console.log('3. after shopping:', JSON.stringify(prof));
  await p.click('#hqBack'); await p.waitForTimeout(500);
  await p.click('#startBtn'); await p.waitForTimeout(300);
  await p.click('#confirmYes'); await p.waitForTimeout(400);
  console.log('4. char select open:', await p.evaluate(() => !document.getElementById('charSelect').classList.contains('hidden')), await p.evaluate(() => [...document.querySelectorAll('#charList b')].map(b => b.textContent).join(', ')));
  await p.screenshot({ path: `${out}/meta_chars.png` });
  await p.click('#charList .hq-row:has(b:text-is("THE INTERN")) .hq-buy'); await p.waitForTimeout(4200);
  const run = await p.evaluate(() => { const g = window.__game; return { inv: g.P.inv.map(s => s.id + ':' + s.ammo), hp: g.P.hp, maxHp: g.perks.M.maxHp, maxGuns: g.perks.M.maxGuns, perks: g.perks.perkLv, revives: g.P.revives }; });
  console.log('5. new run as intern:', JSON.stringify(run));
  await p.evaluate(() => { window.__game.P.hp = 5; window.__game.G.hurtPlayer(50, {}); });
  await p.waitForTimeout(300);
  console.log('6. lethal hit with insurance -> mode', await p.evaluate(() => window.__game.mode), 'hp', await p.evaluate(() => window.__game.P.hp), 'revives left', await p.evaluate(() => window.__game.P.revives));
  console.log('errors', errs.slice(0, 5));
  await b.close();
})();
