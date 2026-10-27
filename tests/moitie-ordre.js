// À deux : Début / Fin coupent bien la liste, sans plan, avec plan en « Ordre des rayons » et en « Circuit le plus court »
const { phones, start, add } = require('./_outils');
(async () => {
  const { browser, pages: [p], errs } = await phones(1);
  await start(p, 'Léa');
  await add(p, 'lait, pain, bananes, pâtes, café, papier toilette, liquide vaisselle, eau');
  await p.click('[data-a=goShopping]');
  const sec = () => p.$$eval('main h3', e => e.map(x => x.textContent.trim()).filter(t => t && !/caddie/i.test(t)));
  const out = { tout: await sec() };
  await p.selectOption('#who', '1'); out.debut = await sec();
  await p.selectOption('#who', '2'); out.fin = await sec();
  // magasin avec plan, en « Ordre des rayons »
  await p.evaluate(() => { const m = store().map, ids = S.aisles.map(a => a.id); ids.forEach((id, k) => m.cells[`${k % 6},${Math.floor(k / 6) * 2}`] = id); m.entry = '0,7'; m.auto = false; save(); render(); });
  await p.selectOption('#who', '1'); out.planOrdreDebut = await sec();
  await p.selectOption('#who', '2'); out.planOrdreFin = await sec();
  await p.evaluate(() => { store().map.auto = true; save(); render(); });
  await p.selectOption('#who', '1'); out.planAutoDebut = await sec();
  await p.selectOption('#who', '2'); out.planAutoFin = await sec();
  console.log(JSON.stringify({ out, errs }, null, 1)); await browser.close();
})();
