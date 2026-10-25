// Chiffres du budget : ce mois, le mois dernier, et le mois dernier au même jour avec l'écart
const { phones, start } = require('./_outils');
(async () => {
  const { browser, pages: [p], errs } = await phones(1);
  await start(p, 'Roman');
  await p.evaluate(() => {
    const now = new Date(), at = (mOff, d) => new Date(now.getFullYear(), now.getMonth() + mOff, d, 12).getTime();
    const day = now.getDate();
    S.trips.push({ id: uid(), date: Date.now(), total: 60, place: 'A', n: 1, names: [] },
      { id: uid(), date: at(-1, 1), total: 40, place: 'B', n: 1, names: [] },
      { id: uid(), date: at(-1, Math.min(day, 28)), total: 20, place: 'C', n: 1, names: [] },
      { id: uid(), date: at(-1, 28), total: 100, place: 'D', n: 1, names: [] });
    save(); render();
  });
  await p.click('[data-tab=budget]'); await p.click('details.adv summary');
  const tiles = await p.$$eval('.tiles .tile', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim()).slice(0, 3));
  console.log(JSON.stringify({ tiles, errs }, null, 1));
  await browser.close();
})();
