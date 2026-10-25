// Idées de recettes : une centaine, boutons de type avec compteurs, combinés à la recherche
const { phones, start } = require('./_outils');
(async () => {
  const { browser, pages: [p], errs } = await phones(1);
  await start(p, 'Roman');
  await p.click('[data-tab=meals]'); await p.click('[data-a=go][data-v=library]');
  const filters = await p.$$eval('#libFilters .chip', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  const all = await p.locator('#libItems .row').count();
  await p.click('#libFilters [data-v="Desserts"]');
  const desserts = await p.$$eval('#libItems h3', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  const activeBtn = await p.$eval('#libFilters .chip.on', e => e.textContent.replace(/\s+/g, ' ').trim());
  await p.type('#libSearch input', 'chocolat');
  const choc = await p.$$eval('#libItems .row .name', e => e.map(x => x.firstChild.textContent.trim()));
  const filtersAfterSearch = await p.$$eval('#libFilters .chip', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  await p.click('#libFilters [data-v=""]');
  const allChoc = await p.locator('#libItems .row').count();
  await p.fill('#libSearch input', ''); await p.evaluate(() => { libDraft = ''; });
  const unknown = await p.evaluate(() => { const bad = [...new Set(LIBRARY.flatMap(l => l.items.map(x => x.name)))].filter(n => !findItem(n) && S.aisles.find(a => a.id === guessAisle(n))?.name === 'Divers'); return bad; });
  console.log(JSON.stringify({ total: await p.evaluate(() => LIBRARY.length), filters, all, desserts, activeBtn, choc, filtersAfterSearch, allChoc, inDivers: unknown, errs }, null, 1));
  await browser.close();
})();
