// Rejoindre par le lien : prénom demandé ; accents (cafe = Café), rayon deviné ; ✓ dans le caddie ; pas trouvé
const { phones, start, share, syncAll } = require('./_outils');
(async () => {
  const { browser, pages: [A, B], errs } = await phones(2);
  await start(A, 'Papa');
  const link = await share(A);
  await B.goto(link); await B.waitForFunction(() => S.items.length > 0);
  const meCard = await B.isVisible('#meForm');
  await B.fill('#meForm input', 'Inès'); await B.click('#meForm button');
  await B.fill('#quick input', 'cereales, cafe, oeufs, kinder bueno'); await B.press('#quick input', 'Enter');
  const adds = await B.evaluate(() => ({ need: S.items.filter(i => i.need).map(i => `${i.name}@${S.aisles.find(a => a.id === i.aisle)?.name}·${i.by}`), count: S.items.length }));
  await syncAll(A, B);
  await A.click('[data-a=goShopping]');
  await A.click('main .row:has-text("Céréales")');
  await syncAll(A, B); await B.evaluate(() => render());
  const inesSees = await B.$$eval('.basket .row .name', e => e.map(x => x.textContent.trim()));
  await A.click('[data-a=finish]'); await A.click('#finishForm .primary');
  await syncAll(A, B); await B.evaluate(() => render());
  const after = await B.$$eval('main .row .name', e => e.map(x => x.textContent.trim()));
  console.log(JSON.stringify({ meCard, adds, inesSees, after, errs }, null, 1));
  await browser.close(); process.exit(0);
})();
