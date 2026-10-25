// À deux en magasin : la 2e personne qui arrive reçoit automatiquement l'autre moitié ; avertie si elle choisit la même
const { phones, start, share, syncAll, add } = require('./_outils');
(async () => {
  const { browser, pages: [A, B], errs } = await phones(2);
  await start(A, 'Roman');
  const link = await share(A);
  await B.goto(link); await B.waitForFunction(() => S.items.length > 0);
  await B.fill('#meForm input', 'Raphaëlle'); await B.click('#meForm button');
  await add(A, 'lait, pain, 2 kg tomates, pâtes, café, eau');
  await syncAll(A, B);
  await A.click('[data-a=goShopping]');
  await A.click('[data-a=setWho][data-v="1"]');
  await syncAll(A, B);
  await B.click('[data-a=goShopping]');
  const bAuto = await B.evaluate(() => who);
  const hintB = await B.textContent('.split p');
  const partsB = await B.evaluate(() => JSON.stringify(S.parts));
  await syncAll(A, B);
  const hintA = await A.textContent('.split p');
  await B.click('[data-a=setWho][data-v="1"]');
  const warn = await B.textContent('.split p');
  console.log(JSON.stringify({ bAuto, hintB, partsB, hintA, warn, errs }, null, 1));
  await browser.close();
})();
