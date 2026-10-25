// Paniers préenregistrés (ex. Bébé) : créés dans Mes articles > Paniers, articles piochés ou créés sur place,
// ajoutés à la liste en décochant ce qu'on a, ou d'un toucher depuis la liste (Annuler possible)
const { phones, start, add, needs } = require('./_outils');
(async () => {
  const { browser, pages: [p], errs } = await phones(1);
  await start(p, 'Roman');
  await add(p, 'Danonino', { need: false });
  await p.click('[data-a=go][data-v=catalog]'); await p.click('[data-a=catalogPins][data-v=baskets]');
  await p.fill('#newBasket input', 'bébé'); await p.press('#newBasket input', 'Enter');
  await p.type('#link input', 'dano'); await p.click('#linkSuggest [data-a=pickLink]');
  for (const n of ['Couches', 'Tomates cerises', 'Pompotes']) { await p.type('#link input', n); await p.click('#linkSuggest [data-a=linkNew]'); }
  await p.fill('[data-rqty$=":' + await p.evaluate(() => findItem('couches').id) + '"]', '1 paquet'); await p.press('.qty >> nth=1', 'Tab');
  const noCategory = !(await p.isVisible('#rcat'));
  await p.click('[data-a=closeRecipe]');
  const card = await p.textContent('main .card');
  // Pas dans les recettes
  const inCookbook = await p.evaluate(() => cookbook().length);
  // Ajouter à la liste en décochant ce qu'on a
  await p.click('[data-a=startRecipe]'); await p.click('main .row:has-text("Pompotes")'); await p.click('[data-a=confirmRecipe]');
  const list1 = await p.evaluate(() => S.items.filter(i => i.need).map(i => i.name + (i.note ? ' ' + i.note : '')).sort());
  // Depuis la liste : puce du panier, un toucher, Annuler
  await p.evaluate(() => { S.items.forEach(i => { i.need = false; delete i.note; }); save(); });
  await p.click('[data-a=go][data-v=list]');
  const chip = await p.textContent('[data-a=addBasket]');
  await p.click('[data-a=addBasket]');
  const offered = await p.$$eval('#basketForm [name=i]:checked', e => e.length);
  await p.uncheck('#basketForm label:has-text("Pompotes") input'); await p.click('#basketForm .primary');
  const list2 = await needs(p);
  await p.click('#toast [data-a=undo]');
  const list3 = await needs(p);
  console.log(JSON.stringify({ offered, noCategory, card, inCookbook, list1, chip, list2, list3, errs }, null, 1));
  await browser.close();
})();
