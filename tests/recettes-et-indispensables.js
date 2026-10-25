// Beaucoup de recettes et d'indispensables : recherche (nom, catégorie, ingrédient), rangement par catégorie,
// ingrédients piochés ou créés depuis la recette, filtre Indispensables par rayon avec « Tout ajouter », écran gardé allumé sur la liste
const { phones, start, needs } = require('./_outils');
(async () => {
  const { browser, pages: [p], errs } = await phones(1);
  await start(p, 'Roman');
  await p.evaluate(() => {
    for (const [name, cat, ings] of [['Curry', 'Plats', 'Riz, Lait de coco'], ['Crêpes', 'Desserts', 'Farine, Lait'], ['Tarte aux pommes', 'Desserts', 'Pommes, Farine'], ['Salade', '', 'Salade, Tomates']]) {
      const items = ings.split(', ').map(n => { let i = findItem(n); if (!i) S.items.push(i = { id: uid(), name: n, aisle: guessAisle(n), need: false, done: false }); return i.id; });
      S.recipes.push({ id: uid(), name, cat: cat || undefined, items });
    }
    for (const n of ['Babybel', 'Danonino', 'Bananes', 'Pommes', 'Lait']) { const i = findItem(n) || (addItem(n), findItem(n)); i.pin = true; i.need = false; }
    save(); render();
  });
  await p.click('[data-tab=meals]');
  const menu = await p.$$eval('[data-plan] >> nth=0', s => [...s[0].querySelectorAll('optgroup')].map(g => g.label));
  await p.click('[data-a=go][data-v=recipes]');
  const heads = await p.$$eval('#recipeItems h3', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  await p.type('#newRecipe input', 'farine');
  const byIngredient = await p.$$eval('#recipeItems strong', e => e.map(x => x.textContent));
  await p.fill('#newRecipe input', ''); await p.type('#newRecipe input', 'dess');
  const byCat = await p.$$eval('#recipeItems strong', e => e.map(x => x.textContent));
  await p.fill('#newRecipe input', 'Gratin'); await p.press('#newRecipe input', 'Enter');
  await p.fill('#rcat', 'plats'); await p.press('#rcat', 'Tab');
  // Ingrédients : piocher un article existant dès les premières lettres, ou le créer sans quitter la recette
  await p.type('#link input', 'far');
  const linkChips = await p.$$eval('#linkSuggest .chip', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  await p.click('#linkSuggest [data-a=pickLink]');
  await p.type('#link input', 'Garam masala');
  const createChip = await p.textContent('#linkSuggest [data-a=linkNew]');
  await p.click('#linkSuggest [data-a=linkNew]');
  const ingredients = await p.evaluate(() => { const r = S.recipes.find(r => r.name === 'Gratin'); return r.items.map(id => item(id).name + (item(id).need ? ' (liste)' : '')); });
  const stillEditing = await p.isVisible('#link input') && await p.evaluate(() => document.activeElement?.closest('#link') != null);
  await p.click('[data-a=closeRecipe]');
  const gratin = await p.evaluate(() => S.recipes.find(r => r.name === 'Gratin')?.cat);
  await p.click('[data-tab=list]');
  const listChips = await p.$$eval('main .chips .chip', e => e.map(x => x.textContent.trim()));
  await p.click('[data-a=go][data-v=catalog]'); await p.click('[data-a=catalogPins][data-v="1"]');
  const pinHeads = await p.$$eval('#catalogItems h3', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  await p.type('#quick input', 'ba');
  const pinSearch = await p.$$eval('#catalogItems .chip', e => e.map(x => x.textContent.trim()));
  await p.fill('#quick input', ''); await p.evaluate(() => { quickDraft = ''; render(); });
  await p.click('[data-a=allPins]');
  const list = await needs(p);
  console.log(JSON.stringify({ menu, heads, byIngredient, byCat, gratin, linkChips, createChip, ingredients, stillEditing, listChips, pinHeads, pinSearch, list, errs }, null, 1));
  await browser.close();
})();
