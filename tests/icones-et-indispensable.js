// Pas d'emojis natifs dans l'interface ; un article inconnu ouvre une fenêtre de choix :
// sur la liste ou non, indispensable ou non (d'office avec le filtre Indispensables de Mes articles)
const { phones, start, add } = require('./_outils');
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]/u;
(async () => {
  const { browser, pages: [p], errs } = await phones(1);
  await start(p, 'Roman');
  const state = n => p.evaluate(n => { const i = findItem(n); return i ? `${i.need ? 'liste' : '-'} ${i.pin ? 'indispensable' : '-'} ${i.note || ''}`.trim() : 'absent'; }, n);
  // Depuis la liste : choix par défaut = sur la liste
  await p.fill('#quick input', '2 pom pote'); await p.press('#quick input', 'Enter');
  const asked = await p.textContent('#newItemForm h2');
  const defaults = await p.$$eval('#newItemForm [type=checkbox]', e => e.map(x => `${x.name}:${x.checked}`));
  await p.click('#newItemForm .primary');
  const pomPote = await state('pom pote');
  // Indispensable sans l'ajouter à la liste
  await add(p, 'Danonino', { need: false, pin: true });
  const danonino = await state('danonino');
  // Annuler : rien n'est créé
  await p.fill('#quick input', 'Truc'); await p.press('#quick input', 'Enter'); await p.click('[data-a=cancelNew]');
  const truc = await state('truc');
  // Article connu : pas de fenêtre
  const knownAsked = await add(p, 'lait');
  // Mes articles, filtre Indispensables : indispensable coché d'office, pas sur la liste
  await p.click('[data-a=go][data-v=catalog]'); await p.click('[data-a=catalogPins][data-v="1"]');
  await add(p, 'babybel, compotes');
  const pins = [await state('babybel'), await state('compotes')];
  const screens = {};
  for (const [name, go] of [['liste', '[data-a=go][data-v=list]'], ['articles', '[data-a=go][data-v=catalog]'], ['repas', '[data-tab=meals]'], ['depenses', '[data-tab=budget]'], ['reglages', '#gear'], ['activite', '#bell']]) {
    await p.click(go);
    screens[name] = EMOJI.test(await p.evaluate(() => document.body.innerText)) ? 'emoji !' : 'ok';
  }
  console.log(JSON.stringify({ asked, defaults, pomPote, danonino, truc, knownAsked, pins, screens, errs }, null, 1));
  await browser.close();
})();
