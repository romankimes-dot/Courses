// Parcours à deux : Tom rejoint depuis l'accueil, ajouts multiples, « J'y vais », « nouveau » pendant les courses,
// terminer, annuler
const { U, phones, start, share, syncAll, needs } = require('./_outils');
(async () => {
  const { browser, pages: [A, B], errs } = await phones(2);
  await start(A, 'Léa');
  await A.click('[data-a=go][data-v=catalog]');
  await A.click('.chip:has-text("Lait")'); await A.click('.chip:has-text("Pain")');
  await A.click('[data-a=go][data-v=list]');
  const link = await share(A);
  const inviteCard = await A.isVisible('.invite');
  await B.goto(U); await B.fill('#welcomeName', 'Tom'); await B.click('[data-a=welcomeJoin]');
  await B.fill('#joinForm input', link); await B.click('#joinForm button');
  await B.waitForFunction(() => S.items.some(i => i.need));
  const bList = await B.$$eval('main .row .name', e => e.map(x => x.textContent.trim()));
  await B.fill('#quick input', 'œufs, beurre ; café'); await B.press('#quick input', 'Enter');
  await syncAll(A, B);
  await A.click('[data-a=goShopping]');
  await syncAll(A, B);
  const banner = await B.textContent('.banner').catch(() => null);
  await B.fill('#quick input', 'Kiwi'); await B.press('#quick input', 'Enter');
  await syncAll(A, B); await A.evaluate(() => render());
  const newTag = await A.textContent('.row.new .name').catch(() => null);
  await A.click('main .row:has-text("Lait")'); await A.click('main .row:has-text("Pain")');
  await A.click('[data-a=finish]'); await A.fill('#finishForm input', '12,30'); await A.click('#finishForm .primary');
  const afterFinish = await A.evaluate(() => ({ left: S.items.filter(i => i.need).map(i => i.name).sort(), shopping: !!myShopping() }));
  await A.click('[data-a=go][data-v=catalog]'); await A.click('[data-a=noneNeed]'); await A.click('#toast [data-a=undo]');
  const undo = await needs(A);
  await A.click('[data-tab=budget]');
  const hero = (await A.textContent('.hero')).replace(/\s+/g, ' ').trim();
  console.log(JSON.stringify({ inviteCard, bList, banner, newTag, afterFinish, undo, hero, errs }, null, 1));
  await browser.close(); process.exit(0);
})();
