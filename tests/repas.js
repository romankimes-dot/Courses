// Repas : recette avec quantités, posée sur deux jours du calendrier mensuel, ingrédients ajoutés en un geste
const { phones, start } = require('./_outils');
(async () => {
  const { browser, pages: [p], errs } = await phones(1);
  await start(p, 'Antoine');
  await p.click('[data-tab=meals]');
  await p.fill('#newRecipe input', 'Curry de pois chiches'); await p.press('#newRecipe input', 'Enter');
  await p.fill('#link input', 'pois chiches, lait de coco, oignons, riz'); await p.press('#link input', 'Enter');
  await p.fill('[data-rqty$=":' + await p.evaluate(() => findItem('lait de coco').id) + '"]', '40 cl'); await p.press('.qty >> nth=1', 'Tab');
  await p.click('[data-a=closeRecipe]');
  await p.click('[data-a=go][data-v=meals]');
  // Calendrier du mois : toucher une case, puis choisir le repas (aujourd'hui et demain)
  const days = await p.evaluate(() => [0, 1].map(k => dayKey(new Date(Date.now() + k * DAY))));
  const cells = await p.$$eval('.cal .cell', e => e.length);
  for (const d of days) {
    if (!await p.$(`[data-a=calDay][data-v="${d}"]`)) await p.click('[data-a=calMove][data-v="1"]');
    await p.click(`[data-a=calDay][data-v="${d}"]`);
    await p.selectOption(`[data-plan="${d}"]`, { label: 'Curry de pois chiches' });
  }
  const shown = await p.$$eval('.cal .cell small', e => e.map(x => x.textContent));
  await p.click('[data-a=weekReview]');
  const review = await p.$$eval('main .row .name', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  await p.click('main .row:has-text("Oignons")'); // j'en ai déjà
  await p.click('[data-a=weekConfirm]');
  const list = await p.evaluate(() => S.items.filter(i => i.need).map(i => i.name + (i.note ? ' ' + i.note : '')).sort());
  console.log(JSON.stringify({ cells, shown, review, list, errs }, null, 1));
  await browser.close();
})();
