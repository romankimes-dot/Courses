// Une seule liste, un seul geste : toucher = dans le caddie ; glisser = retirer ; J'y vais ; Terminer
const { phones, start, needs, swipeLeft } = require('./_outils');
(async () => {
  const { browser, pages: [p], errs } = await phones(1);
  await start(p, 'Léa');
  await p.click('[data-a=go][data-v=catalog]');
  for (const n of ['Lait', 'Pain', 'Bananes']) await p.click(`.chip:has-text("${n}")`);
  await p.click('[data-a=go][data-v=list]');
  await p.fill('#quick input', '2 kg tomates, litière, cafe'); await p.press('#quick input', 'Enter');
  const added = await p.evaluate(() => S.items.filter(i => i.need).map(i => `${i.name}${i.note ? ' ' + i.note : ''}@${S.aisles.find(a => a.id === i.aisle).name}`).sort());
  await swipeLeft(p, 'Litière');
  const afterSwipe = await needs(p);
  await p.click('#toast [data-a=undo]');
  const afterUndo = await needs(p);
  await p.click('[data-a=goShopping]');
  const shoppingCard = await p.isVisible('.card.shopping');
  await p.click('main .row:has-text("Lait")'); await p.click('main .row:has-text("Pain")');
  const cart = await p.$$eval('.basket .row .name', e => e.map(x => x.textContent.trim()));
  await p.click('[data-a=finish]'); await p.fill('#finishForm input', '23,40'); await p.click('#finishForm .primary');
  const after = await p.evaluate(() => ({ left: S.items.filter(i => i.need).map(i => i.name + (i.missing ? ' (pas trouvé)' : '')).sort(), trip: S.trips.map(t => `${t.place} ${t.total} ${t.names.join('+')}`), shopping: !!myShopping() }));
  console.log(JSON.stringify({ added, afterSwipe, afterUndo, shoppingCard, cart, after, errs }, null, 1));
  await browser.close();
})();
