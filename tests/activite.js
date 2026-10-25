// Activité (🔔) : ajout par un autre, départ en courses, article pris pour moi
const { phones, start, share, syncAll } = require('./_outils');
(async () => {
  const { browser, pages: [A, B], errs } = await phones(2);
  await start(A, 'Papa');
  const link = await share(A);
  await B.goto(link); await B.waitForFunction(() => S.items.length > 0);
  await B.fill('#meForm input', 'Inès'); await B.click('#meForm button');
  await syncAll(A, B);
  await B.fill('#quick input', 'céréales'); await B.press('#quick input', 'Enter');
  await syncAll(A, B);
  await A.click('[data-a=goShopping]');
  await syncAll(A, B);
  await A.click('main .row:has-text("Céréales")');
  await syncAll(A, B);
  const badgeB = await B.$eval('#bell', e => e.dataset.count);
  await A.click('#bell'); const feedA = await A.$$eval('main .row .name', e => e.map(x => x.textContent));
  await B.click('#bell'); const feedB = await B.$$eval('main .row .name', e => e.map(x => x.textContent));
  console.log(JSON.stringify({ feedA, feedB, badgeB, errs }, null, 1));
  await browser.close(); process.exit(0);
})();
