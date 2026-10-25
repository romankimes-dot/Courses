// Mes articles : tous les articles (même ponctuels), recherche, ⭐ indispensable sans l'ajouter à la liste
const { phones, start, needs } = require('./_outils');
(async () => {
  const { browser, pages: [p], errs } = await phones(1);
  await start(p, 'Roman');
  await p.fill('#quick input', 'Danonino'); await p.press('#quick input', 'Enter');
  await p.click('main .row:has-text("Danonino") [data-a=openItem]'); await p.click('[data-a=toggleNeed]'); await p.click('[data-a=closeItem]');
  const listBefore = await needs(p);
  await p.click('[data-a=go][data-v=catalog]');
  await p.type('#quick input', 'dan');
  const found = await p.$$eval('#catalogItems .chip', e => e.map(x => x.textContent.trim()));
  await p.click('[data-a=catalogEdit]');
  await p.click('#catalogItems .row:has-text("Danonino") [data-a=pin]');
  const pinned = await p.evaluate(() => findItem('danonino').pin === true && !findItem('danonino').need);
  await p.click('[data-a=catalogEdit]');
  await p.fill('#quick input', ''); await p.evaluate(() => { quickDraft = ''; render(); });
  const pinsSection = await p.$$eval('.pins .chip', e => e.map(x => x.textContent.trim()));
  await p.click('[data-a=go][data-v=list]');
  const listChips = await p.$$eval('main .chips .chip', e => e.map(x => x.textContent.trim()));
  console.log(JSON.stringify({ listBefore, found, pinned, pinsSection, listChips, list: await needs(p), errs }, null, 1));
  await browser.close();
})();
