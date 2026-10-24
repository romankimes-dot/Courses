const { chromium } = require('playwright');
const U = 'http://localhost:8766/', SP = (process.argv[2] || require('os').tmpdir());
(async () => {
  const b = await chromium.launch();
  const mk = async () => (await b.newContext({ viewport: { width: 400, height: 820 }, deviceScaleFactor: 2 })).newPage();
  const A = await mk(), B = await mk();
  const errs = []; let answer = '';
  [A, B].forEach(p => { p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept(d.type() === 'prompt' ? answer : undefined)); });
  const sync = async () => { for (const p of [A, B, A, B]) { await p.evaluate(() => Sync.run()); await p.waitForTimeout(250); } };
  // Léa : accueil, seule d'abord
  await A.goto(U);
  await A.screenshot({ path: SP + '/n-welcome.png' });
  await A.fill('#welcomeName', 'Léa'); await A.click('[data-a=welcomeSolo]');
  const afterSolo = await A.evaluate(() => tab);
  await A.click('.row:has-text("Lait")'); await A.click('.row:has-text("Pain")');
  await A.click('[data-a=go][data-v=list]');
  // Partage via Réglages (faux serveur)
  await A.click('#gear');
  await A.fill('#share input[name=url]', 'http://localhost:8766'); await A.fill('#share input[name=key]', 'anon'); await A.click('#share button');
  await A.waitForTimeout(800);
  await A.click('[data-a=go][data-v=list]');
  const inviteCard = await A.isVisible('.invite');
  const link = await A.evaluate(() => Sync.inviteLink());
  // Tom : rejoint depuis l'accueil
  await B.goto(U);
  await B.fill('#welcomeName', 'Tom'); await B.click('[data-a=welcomeJoin]');
  await B.fill('#joinForm input', link); await B.click('#joinForm button');
  await B.waitForFunction(() => S.items.some(i => i.need));
  const bList = await B.$$eval('main .row .name', e => e.map(x => x.textContent.trim()));
  await B.fill('#quick input', 'œufs, beurre ; café'); await B.press('#quick input', 'Enter');
  await sync();
  // Léa part en courses
  await A.click('[data-a=goShopping]');
  await sync();
  await B.click('[data-tab=list]');
  const banner = await B.textContent('.banner').catch(() => null);
  await B.fill('#quick input', 'Kiwi'); await B.press('#quick input', 'Enter');
  await sync();
  await A.evaluate(() => render());
  const newTag = await A.textContent('.row.new .name').catch(() => null);
  await A.screenshot({ path: SP + '/n-shop.png', fullPage: true });
  await A.click('.row:has-text("Lait")'); await A.click('.row:has-text("Pain")');
  await A.click('[data-a=finish]'); await A.fill('#finishForm input', '12,30'); await A.click('#finishForm .primary');
  const afterFinish = await A.evaluate(() => ({ tab, left: S.items.filter(i => i.need).map(i => i.name), shopping: !!S.settings.shopping }));
  // Retirer puis annuler
  await A.click('.row:has-text("Kiwi") [data-a=unneed]');
  const toastShown = await A.textContent('#toast span');
  await A.click('#toast [data-a=undo]');
  const kiwiBack = await A.evaluate(() => S.items.find(i => i.name === 'Kiwi').need);
  await A.screenshot({ path: SP + '/n-list.png', fullPage: true });
  await A.click('[data-tab=budget]');
  const hero = (await A.textContent('.hero')).replace(/\s+/g, ' ').trim();
  await A.screenshot({ path: SP + '/n-budget.png' });
  console.log(JSON.stringify({ afterSolo, inviteCard, bList, banner, newTag, afterFinish, toastShown, kiwiBack, hero, errs }, null, 1));
  await b.close(); process.exit(0);
})();
