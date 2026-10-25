// Idées de recettes : parcourir, chercher, voir les ingrédients déjà connus et les nouveaux, adopter
// (copie dans Mes recettes avec quantités ; articles existants réutilisés malgré accents et pluriels)
const { phones, start, add } = require('./_outils');
(async () => {
  const { browser, pages: [p], errs } = await phones(1);
  await start(p, 'Roman');
  await add(p, 'oeufs, lardon', { need: false });
  await p.click('[data-tab=meals]');
  const fromEmpty = await p.isVisible('[data-a=go][data-v=library]');
  await p.click('[data-a=go][data-v=library]');
  const cats = await p.$$eval('#libItems h3', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  await p.type('#libSearch input', 'lardons');
  const found = await p.$$eval('#libItems .row .name', e => e.map(x => x.firstChild.textContent.trim()));
  await p.click('#libItems .row:has-text("Pâtes carbonara")');
  const preview = await p.$$eval('#libItems .card .small', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  const before = await p.evaluate(() => S.items.length);
  await p.click('[data-a=libAdopt]');
  const r = await p.evaluate(() => { const r = cookbook().find(r => r.name === 'Pâtes carbonara'); return { cat: r.cat, items: r.items.map(id => item(id).name + (r.qty[id] ? ' ' + r.qty[id] : '') + (item(id).need ? ' (liste)' : '')) }; });
  const created = await p.evaluate(b => S.items.length - b, before);
  const dupes = await p.evaluate(() => S.items.filter(i => sameKey(i.name) === sameKey('œufs') || sameKey(i.name) === sameKey('lardons')).length);
  const marked = await p.textContent('#libItems .card');
  await p.click('[data-a=go][data-v=recipes]');
  const inRecipes = await p.$$eval('#recipeItems strong', e => e.map(x => x.textContent));
  console.log(JSON.stringify({ fromEmpty, cats, found, preview, recipe: r, created, dupes, adoptedShown: marked.includes('Déjà dans Mes recettes'), inRecipes, errs }, null, 1));
  await browser.close();
})();
