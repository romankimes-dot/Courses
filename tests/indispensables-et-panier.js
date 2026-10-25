// ⭐ Indispensables en haut (épinglés depuis la fiche), caddie en bas, ordre des rayons appris en cochant
const { phones, start } = require('./_outils');
(async () => {
  const { browser, pages: [p], errs } = await phones(1);
  await start(p, 'Sophie');
  await p.fill('#quick input', 'Babybel, Danonino, pâtes, café, eau, bananes'); await p.press('#quick input', 'Enter');
  for (const n of ['Babybel', 'Danonino']) {
    await p.click(`main .row:has-text("${n}") [data-a=openItem]`); await p.check('#itemPin'); await p.click('[data-a=closeItem]');
  }
  const heads = await p.$$eval('main section h3', e => e.map(x => x.textContent.trim()));
  await p.click('[data-a=go][data-v=catalog]');
  const pins = await p.$$eval('.pins .chip', e => e.map(x => x.textContent.trim()));
  await p.click('[data-a=go][data-v=list]');
  await p.click('[data-a=goShopping]');
  const seq = ['Eau', 'Café', 'Babybel', 'Danonino', 'Bananes', 'Pâtes'];
  for (const n of seq) await p.click(`main section:not(.basket) .row:has-text("${n}")`);
  await p.evaluate(seq => { seq.forEach((n, k) => { findItem(n).doneAt = Date.now() - (seq.length - k) * 120e3; }); render(); }, seq);
  const cart = await p.$$eval('.basket .row .name', e => e.map(x => x.textContent.trim()));
  await p.click('[data-a=finish]'); await p.click('#finishForm .primary');
  const toastText = await p.textContent('#toast span');
  const order = await p.evaluate(() => orderedAisles().map(a => a.name).slice(0, 6));
  console.log(JSON.stringify({ heads, pins, cart, toastText, order, errs }, null, 1));
  await browser.close();
})();
