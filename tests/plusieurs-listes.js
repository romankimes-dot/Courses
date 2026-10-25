// Plusieurs listes : en créer une, changer de liste, rejoindre un lien sans écraser sa liste
const { U, phones, start, share, syncAll, needs, add } = require('./_outils');
(async () => {
  const { browser, pages: [A, B], errs } = await phones(2);
  await start(A, 'Léa');
  await add(A, 'café');
  const link = await share(A);
  // Léa crée « Pour Tata »
  await A.click('#listName'); await A.fill('#newListForm input', 'Pour Tata'); await A.click('#newListForm button');
  await A.waitForLoadState('load'); await A.waitForTimeout(300);
  await add(A, 'piles, compotes');
  const tata = { title: await A.textContent('#listName'), items: await needs(A) };
  await A.click('#listName'); await A.click('.list-row:has-text("Maison")'); await A.waitForLoadState('load'); await A.waitForTimeout(300);
  const maison = { title: await A.textContent('#listName'), items: await needs(A) };
  // Tom a déjà sa propre liste, puis ouvre l'invitation de Léa
  await start(B, 'Tom');
  await add(B, 'bière');
  await B.goto(link); await B.waitForLoadState('load'); await B.waitForTimeout(800);
  await syncAll(A, B);
  const tom = { title: await B.textContent('#listName'), items: await needs(B), lists: await B.evaluate(() => lists.map(l => l.name)) };
  await B.click('#listName'); await B.click('.list-row:has-text("Maison")'); await B.waitForLoadState('load'); await B.waitForTimeout(300);
  const tomOwn = await needs(B);
  console.log(JSON.stringify({ tata, maison, tom, tomOwn, errs }, null, 1));
  await browser.close(); process.exit(0);
})();
