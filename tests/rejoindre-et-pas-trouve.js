const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const cA = await b.newContext({ viewport: { width: 390, height: 844 } }), cB = await b.newContext({ viewport: { width: 390, height: 844 } });
  const A = await cA.newPage(), B = await cB.newPage();
  const errs = []; [A, B].forEach(p => { p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept()); });
  await A.goto('http://localhost:8766/'); await A.fill('#welcomeName', 'Papa'); await A.click('[data-a=welcomeSolo]');
  await A.click('#gear'); await A.fill('#share input[name=url]', 'http://localhost:8766'); await A.fill('#share input[name=key]', 'anon'); await A.click('#share button'); await A.waitForTimeout(600);
  const link = await A.evaluate(() => Sync.inviteLink());
  // Inès rejoint par le lien direct : pas d'alerte, prénom demandé
  await B.goto(link); await B.waitForFunction(() => S.items.length > 0);
  const meCard = await B.isVisible('#meForm');
  await B.fill('#meForm input', 'Inès'); await B.click('#meForm button');
  await B.fill('#quick input', 'cereales, cafe, oeufs, kinder bueno'); await B.press('#quick input', 'Enter');
  const bAdds = await B.evaluate(() => ({ need: S.items.filter(i => i.need).map(i => `${i.name}@${S.aisles.find(a => a.id === i.aisle)?.name}·${i.by}`), count: S.items.length }));
  for (const p of [B, A, B, A]) { await p.evaluate(() => Sync.run()); await p.waitForTimeout(200); }
  // Papa fait les courses : prend céréales, pas le café
  await A.click('[data-tab=list]'); await A.click('[data-a=goShopping]');
  await A.click('main .row:has-text("Céréales")');
  for (const p of [A, B]) { await p.evaluate(() => Sync.run()); await p.waitForTimeout(200); }
  await B.evaluate(() => render());
  const inesSees = await B.$$eval('main .row .name', e => e.map(x => x.textContent.trim()));
  await A.click('[data-a=finish]'); await A.fill('#finishForm input', ''); await A.click('#finishForm .primary');
  for (const p of [A, B]) { await p.evaluate(() => Sync.run()); await p.waitForTimeout(200); }
  await B.evaluate(() => render());
  const after = await B.$$eval('main .row .name', e => e.map(x => x.textContent.trim()));
  await B.click('#gear'); await B.click('[data-a=setSize][data-v=large]');
  const zoom = await B.evaluate(() => getComputedStyle(document.body).zoom);
  console.log(JSON.stringify({ meCard, bAdds, inesSees, after, zoom, errs }, null, 1));
  await b.close(); process.exit(0);
})();
