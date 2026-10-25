// Des dizaines de tickets : dépense à la main au-dessus de la liste, tri par date, « voir plus anciens »
const { phones, start } = require('./_outils');
(async () => {
  const { browser, pages: [p], errs } = await phones(1);
  await start(p, 'Roman');
  await p.evaluate(() => { for (let k = 0; k < 45; k++) S.trips.push({ id: uid(), date: Date.now() - k * DAY, total: 10 + k, place: 'Magasin ' + k, n: 3, names: ['Lait'], by: 'Roman' }); save(); render(); });
  await p.click('[data-tab=budget]');
  const y = async sel => (await p.locator(sel).first().boundingBox()).y;
  const buttonAboveTickets = await y('[data-a=expense]') < await y('[data-a=openTrip]');
  const shown1 = await p.locator('[data-a=openTrip]').count();
  const first = await p.locator('[data-a=openTrip] .name').first().textContent();
  await p.click('[data-a=moreTrips]');
  const shown2 = await p.locator('[data-a=openTrip]').count();
  await p.click('[data-a=moreTrips]');
  const shown3 = await p.locator('[data-a=openTrip]').count(), more = await p.locator('[data-a=moreTrips]').count();
  console.log(JSON.stringify({ buttonAboveTickets, shown1, first: first.trim().slice(0, 30), shown2, shown3, moreLeft: more, errs }, null, 1));
  await browser.close();
})();
