// Hors-ligne : Tom recharge l'app sans réseau, coche ; Léa ajoute ; tout fusionne au retour du réseau
const { phones, start, share, syncAll, needs } = require('./_outils');
(async () => {
  const { browser, pages: [A, B], errs } = await phones(2);
  await start(A, 'Léa');
  await A.fill('#quick input', 'pain, lait'); await A.press('#quick input', 'Enter');
  const link = await share(A);
  await B.goto(link); await B.waitForFunction(() => S.items.some(i => i.need));
  await B.evaluate(() => navigator.serviceWorker.ready);
  await B.fill('#meForm input', 'Tom'); await B.click('#meForm button');
  await syncAll(A, B);
  await B.context().setOffline(true);
  await B.reload();
  const offlineLoaded = await B.evaluate(() => S.items.filter(i => i.need).length);
  await B.click('main .row:has-text("Lait")');
  await B.waitForTimeout(1000);
  const status = await B.textContent('#sync');
  await A.fill('#quick input', 'kiwi'); await A.press('#quick input', 'Enter');
  await B.context().setOffline(false);
  await B.evaluate(() => dispatchEvent(new Event('online')));
  await syncAll(A, B);
  console.log(JSON.stringify({ offlineLoaded, status, A: await needs(A), B: await needs(B), errs }, null, 1));
  await browser.close(); process.exit(0);
})();
