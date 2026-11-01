// Terminer en pleines courses (bouton toujours visible, le reste attend sur la liste) ; « Tout » remis à chaque départ ;
// Dépenses : mois choisi (‹ ›, mois passés) et 30 jours glissants
const { phones, start, add } = require('./_outils');
const shots = process.argv[2];
(async () => {
  const { browser, pages: [p], errs } = await phones(1);
  await start(p, 'Léa');
  await add(p, 'lait, pain, bananes, tomates, café, pâtes, riz, yaourts, beurre, jambon, eau, savon, chips, farine');
  await p.click('[data-a=goShopping]');
  await p.selectOption('#who', '1');
  await p.click('main .row:has-text("Lait")'); await p.click('main .row:has-text("Pain")');
  await p.evaluate(() => scrollTo(0, 0));
  const btn = await p.$eval('.finish-float', b => { const r = b.getBoundingClientRect(); return { text: b.textContent.trim().replace(/\s+/g, ' '), visible: r.bottom <= innerHeight && r.top > 0 }; });
  if (shots) await p.screenshot({ path: `${shots}/fin-partielle.png` });
  await p.click('.finish-float');
  const tick = await p.isChecked('#finishForm [name=missing]');
  if (shots) await p.screenshot({ path: `${shots}/terminer.png` });
  await p.click('#finishForm .primary');
  const after = await p.evaluate(() => ({ left: S.items.filter(i => i.need).length, missing: S.items.filter(i => i.missing).length, trip: S.trips.at(-1).names }));
  await p.click('[data-a=goShopping]');
  const whoAgain = await p.$eval('#who', e => e.value);
  await p.reload(); const whoReload = await p.$eval('#who', e => e.value);
  await p.click('[data-a=stopShopping]');
  // Dépenses
  await p.evaluate(() => {
    const now = new Date(), at = (mOff, d) => new Date(now.getFullYear(), now.getMonth() + mOff, d, 12).getTime();
    S.trips = [{ id: uid(), date: Date.now(), total: 30, place: 'A', n: 1, names: [] },
      { id: uid(), date: Date.now() - 10 * 864e5, total: 50, place: 'B', n: 1, names: [] },
      { id: uid(), date: Date.now() - 40 * 864e5, total: 70, place: 'C', n: 1, names: [] },
      { id: uid(), date: at(-3, 10), total: 200, place: 'D', n: 1, names: [] }];
    S.settings.budget = 300; S.settings.budgets = { [monthKey(at(-3, 1))]: 250, [monthKey(Date.now())]: 300 };
    save(); render();
  });
  await p.click('[data-tab=budget]');
  const hero = () => p.$eval('.hero', e => e.textContent.replace(/\s+/g, ' ').trim());
  const month = await hero();
  await p.click('details[data-k=pastMonths] summary');
  const past = await p.$$eval('.month-row', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  if (shots) await p.screenshot({ path: `${shots}/mois-passes.png`, fullPage: true });
  await p.click('.month-row >> nth=2');
  const picked = await hero(), pickedTrips = await p.$eval('h3:has-text("Passages")', e => e.textContent.replace(/\s+/g, ' ').trim());
  await p.click('[data-a=budgetMonth][data-d="-1"]'); const next = await hero();
  await p.click('[data-a=budgetView][data-v="30"]'); const rolling = await hero();
  if (shots) await p.screenshot({ path: `${shots}/30-jours.png` });
  console.log(JSON.stringify({ btn, tick, after, whoAgain, whoReload, month, past, picked, pickedTrips, next, rolling, errs }, null, 1));
  await browser.close();
})();
