// À deux en magasin : chacun sa moitié, chacun termine son caddie (son montant), quantités, « déjà sur la liste »
const { phones, start, share, syncAll } = require('./_outils');
(async () => {
  const { browser, pages: [A, B], errs } = await phones(2);
  await start(A, 'Karim');
  const link = await share(A);
  await B.goto(link); await B.waitForFunction(() => S.items.length > 0);
  await B.fill('#meForm input', 'Julie'); await B.click('#meForm button');
  await A.fill('#quick input', 'lait, pain, 2 kg tomates, pâtes, café, eau'); await A.press('#quick input', 'Enter');
  await syncAll(A, B);
  await A.click('[data-a=goShopping]'); await B.click('[data-a=goShopping]'); await syncAll(A, B);
  const banner = await A.textContent('.banner').catch(() => null);
  await A.click('[data-a=setWho][data-v="1"]'); await B.click('[data-a=setWho][data-v="2"]');
  const partA = await A.$$eval('main section:not(.basket) .row .name', e => e.map(x => x.textContent.trim().split(' ')[0]));
  const partB = await B.$$eval('main section:not(.basket) .row .name', e => e.map(x => x.textContent.trim().split(' ')[0]));
  await A.click(`main .row:has-text("${partA[0]}")`); await B.click(`main .row:has-text("${partB[0]}")`); await syncAll(A, B);
  await A.click('[data-a=finish]'); await A.fill('#finishForm input', '20'); await A.click('#finishForm .primary'); await syncAll(A, B);
  const afterA = await B.evaluate(() => ({ stillInCart: S.items.filter(i => i.done).map(i => i.name), missing: S.items.filter(i => i.missing).length }));
  await B.click('[data-a=finish]'); await B.fill('#finishForm input', '15'); await B.click('#finishForm .primary'); await syncAll(A, B);
  const trips = await A.evaluate(() => S.trips.map(t => `${t.names.join('+')} ${t.total} payé par ${t.by}`));
  await A.fill('#quick input', 'lait'); await A.press('#quick input', 'Enter');
  await A.fill('#quick input', 'lait'); await A.press('#quick input', 'Enter'); await A.waitForTimeout(100);
  const dupToast = await A.textContent('#toast span');
  console.log(JSON.stringify({ banner, partA, partB, afterA, trips, dupToast, errs }, null, 1));
  await browser.close(); process.exit(0);
})();
