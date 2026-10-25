// Repas de la semaine : recette avec quantités, posée sur deux jours, ingrédients ajoutés en un geste
const { phones, start } = require('./_outils');
(async () => {
  const { browser, pages: [p], errs } = await phones(1);
  await start(p, 'Antoine');
  await p.click('[data-tab=meals]');
  await p.fill('#newRecipe input', 'Curry de pois chiches'); await p.press('#newRecipe input', 'Enter');
  await p.fill('#link input', 'pois chiches, lait de coco, oignons, riz'); await p.press('#link input', 'Enter');
  await p.fill('[data-rqty$=":' + await p.evaluate(() => findItem('lait de coco').id) + '"]', '40 cl'); await p.press('.qty >> nth=1', 'Tab');
  await p.click('[data-a=closeRecipe]');
  const days = await p.$$eval('[data-plan]', e => e.slice(0, 2).map(x => x.dataset.plan));
  for (const d of days) await p.selectOption(`[data-plan="${d}"]`, { label: 'Curry de pois chiches' });
  await p.click('[data-a=weekReview]');
  const review = await p.$$eval('main .row .name', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  await p.click('main .row:has-text("Oignons")'); // j'en ai déjà
  await p.click('[data-a=weekConfirm]');
  const list = await p.evaluate(() => S.items.filter(i => i.need).map(i => i.name + (i.note ? ' ' + i.note : '')).sort());
  console.log(JSON.stringify({ review, list, errs }, null, 1));
  await browser.close();
})();
