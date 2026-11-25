const { chromium } = require('playwright');
const pc = process.argv[2] === 'pc';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: pc ? { width: 1280, height: 720 } : { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const url = `http://localhost:8080/versions/${pc ? 'pc' : 'mobile'}/`;
  await p.goto(url);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('overtime.tutorialDone', 'true'); });
  await p.reload(); await p.waitForTimeout(1200);
  const vis = (id) => p.evaluate((id) => { const e = document.getElementById(id); return !!e && !e.classList.contains('hidden') && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).opacity !== '0'; }, id);
  const log = (...a) => console.log(...a);
  log('achPop visible on title:', await vis('achPop'));
  // settings rows
  await p.click('#settingsBtn'); await p.waitForTimeout(200);
  log('settings:', await p.evaluate(() => [...document.querySelectorAll('.setLbl')].map(e => e.firstChild.textContent).join(' | ')));
  // turn dev on (row index by label)
  await p.evaluate(() => { const row = [...document.querySelectorAll('.setRow')].find(r => r.textContent.startsWith('DEVELOPER MODE')); row.querySelectorAll('.seg')[1].click(); });
  await p.click('#settingsBack'); await p.waitForTimeout(200);
  // new run -> difficulty
  await p.click('#startBtn'); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('#modeList .hq-row:not(.ngp-row):not(.roam-row) .hq-buy').click()); await p.waitForTimeout(300);
  log('diffSelect shown:', await vis('diffSelect'), await p.evaluate(() => document.getElementById('diffList').innerText.split('\n').filter(Boolean).slice(0, 8).join(' / ')));
  await p.screenshot({ path: `p4_${pc ? 'pc' : 'm'}_diff.png` });
  await p.evaluate(() => document.querySelectorAll('#diffList .hq-buy')[2].click());
  await p.waitForTimeout(4500);
  log('mode', await p.evaluate(() => window.__game.mode), 'dd', await p.evaluate(() => window.__game.G.dd.name));
  log('enemy hp vs base:', await p.evaluate(() => { const g = window.__game; const e = g.G.enemies[0]; return e ? [e.type, e.maxHp, g.DEFS[e.type].hp] : null; }));
  log('dev btn visible:', await vis('devBtn'));
  await p.evaluate(() => document.getElementById('devBtn').click()); await p.waitForTimeout(300);
  log('dev panel:', await vis('dev'), 'paused', await p.evaluate(() => window.__game.dbg.paused));
  await p.screenshot({ path: `p4_${pc ? 'pc' : 'm'}_dev.png` });
  // toggle god + fps; give minigun; give perk vitality? first perk
  await p.evaluate(() => { const bs = [...document.querySelectorAll('#devBody .dev-b')]; bs.find(b => b.textContent === 'GOD MODE').click(); bs.find(b => b.textContent === 'SHOW FPS').click(); bs.find(b => b.textContent === 'MINIGUN').click(); });
  await p.evaluate(() => { const bs = [...document.querySelectorAll('#devBody .dev-b')]; const pb = bs.find(b => b.textContent.startsWith('DOUBLE TAP') || b.textContent.startsWith('THICK SKIN')) || bs.find(b => b.parentElement.previousSibling.textContent.startsWith('GIVE PERK')); pb.click(); });
  log('inv', await p.evaluate(() => window.__game.P.inv.map(s => s.id).join(',')), 'perks', JSON.stringify(await p.evaluate(() => window.__game.perks.perkLv)));
  await p.click('#devClose'); await p.waitForTimeout(300);
  log('after close paused', await p.evaluate(() => window.__game.dbg.paused));
  // god mode: hurt a lot
  log('hp before', await p.evaluate(() => window.__game.P.hp));
  await p.evaluate(() => { const g = window.__game; g.G.combatActive = true; for (let i = 0; i < 20; i++) g.G.hurtPlayer(50, g.G.enemies[0]); });
  log('hp after god hits', await p.evaluate(() => window.__game.P.hp), 'fps', await p.evaluate(() => document.getElementById('fps').textContent));
  // wait for combat then death cause
  await p.waitForFunction(() => window.__game.mode === 'combat', null, { timeout: 15000 }).catch(() => log('no combat'));
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('overtime.dev')); s.god = false; localStorage.setItem('overtime.dev', JSON.stringify(s)); });
  // toggle god off via panel
  await p.evaluate(() => document.getElementById('devBtn').click()); await p.waitForTimeout(200);
  await p.evaluate(() => { [...document.querySelectorAll('#devBody .dev-b')].find(b => b.textContent === 'GOD MODE').click(); });
  await p.click('#devClose'); await p.waitForTimeout(200);
  await p.evaluate(() => { const g = window.__game; g.P.hp = 5; g.P.revives = 0; const e = g.G.enemies.find(e => e.alive); g.G.actor = e; g.G.spawnProjectile(g.G.camPos.clone().add({x:0,y:0,z:-0.3}), g.G.camPos.clone(), 4, 50, 'orb'); g.G.actor = null; });
  await p.waitForTimeout(3500);
  log('dead mode', await p.evaluate(() => window.__game.mode), 'cause:', await p.evaluate(() => document.getElementById('goCause').textContent));
  await p.screenshot({ path: `p4_${pc ? 'pc' : 'm'}_dead.png` });
  // continue as a different employee
  await p.evaluate(() => { const pr = JSON.parse(localStorage.getItem('overtime.profile')); pr.chars.intern = 1; localStorage.setItem('overtime.profile', JSON.stringify(pr)); });
  await p.reload(); await p.waitForTimeout(1200);
  log('continue visible', await vis('continueBtn'));
  await p.click('#continueBtn'); await p.waitForTimeout(300);
  log('char title:', await p.evaluate(() => document.getElementById('charTitle').textContent), await vis('charSelect'));
  await p.evaluate(() => { const rows = [...document.querySelectorAll('#charList .hq-row')]; rows.find(r => r.textContent.includes('INTERN')).querySelector('button').click(); });
  await p.waitForTimeout(3000);
  log('after switch inv', await p.evaluate(() => window.__game.P.inv.map(s => s.id).join(',')), 'perks', JSON.stringify(await p.evaluate(() => window.__game.perks.perkLv)), 'dd', await p.evaluate(() => window.__game.G.dd.name));
  log('ERRORS', errs);
  await b.close();
})();
