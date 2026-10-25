// Ticket modifiable : montant, part perso hors partage (mode dépenses partagées), articles ajoutés après coup
// (ils comptent dans l'historique d'achat) ; pré-remplissage de la liste selon les habitudes d'achat
const { phones, start, share, syncAll, add, needs } = require('./_outils');
(async () => {
  const { browser, pages: [A, B], errs } = await phones(2);
  await start(A, 'Léo');
  const link = await share(A);
  await B.goto(link); await B.waitForFunction(() => S.items.length > 0);
  await B.fill('#meForm input', 'Tom'); await B.click('#meForm button');
  await A.click('#gear'); await A.check('#split'); await A.click('[data-tab=list]');
  await add(A, 'pâtes, lait');
  await syncAll(A, B);
  await A.click('main .row:has-text("Pâtes")'); await A.click('[data-a=finish]'); await A.fill('#finishForm input', '30'); await A.click('#finishForm .primary');
  await syncAll(A, B);
  // Ticket : part perso de 5 € (bonbons), articles pris en plus de la liste
  await A.click('[data-tab=budget]'); await A.click('[data-a=openTrip]');
  await A.fill('#tripOwn', '5'); await A.press('#tripOwn', 'Tab');
  await A.type('#tripAdd input', 'lai');
  const chips = await A.$$eval('#tripSuggest .chip', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  await A.click('#tripSuggest [data-a=tripPick]');
  await A.fill('#tripAdd input', 'Bonbons'); await A.press('#tripAdd input', 'Enter');
  await A.fill('#tripTotal', '32,40'); await A.press('#tripTotal', 'Tab');
  await A.fill('#tripDate', await A.evaluate(() => dayKey(new Date(Date.now() - 2 * DAY)))); await A.press('#tripDate', 'Tab');
  const dateMoved = await A.evaluate(() => { const t = S.trips[0]; return findItem('lait').bought.at(-1) === t.date && Date.now() - t.date > DAY; });
  const ticket = await A.evaluate(() => { const t = S.trips[0]; return { total: t.total, own: t.own, names: t.names, n: t.n }; });
  const history = await A.evaluate(() => ({ lait: findItem('lait').bought?.length, laitOnList: findItem('lait').need, bonbons: findItem('bonbons').bought?.length }));
  await A.click('[data-a=tripUnlink][data-k="2"]');
  const afterUnlink = await A.evaluate(() => ({ names: S.trips[0].names, bonbons: findItem('bonbons').bought?.length || 0 }));
  await syncAll(A, B);
  await B.click('[data-tab=budget]');
  const owe = await B.$$eval('.owe .name', e => e.map(x => x.textContent.trim()));
  // Compte joint : pas de part perso
  await A.click('#gear'); await A.uncheck('#split'); await A.click('[data-tab=budget]'); await A.click('[data-a=openTrip]');
  const jointOwn = await A.isVisible('#tripOwn');
  // Pré-remplissage : la litière (tous les 14 j, dernier achat il y a 15 j) revient d'elle-même
  await A.evaluate(() => { const i = findItem('litière') || (addItem('Litière'), findItem('litière')); i.need = false; i.bought = [Date.now() - 43 * DAY, Date.now() - 29 * DAY, Date.now() - 15 * DAY]; save(); });
  await A.click('#gear'); const autofillDefault = await A.isChecked('#autofill'); await A.click('[data-tab=list]');
  await A.evaluate(() => Sync.run()); await A.waitForTimeout(300);
  const filled = await A.$$eval('main .row:has-text("Litière") .name', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  await syncAll(A, B);
  const onB = await needs(B);
  await A.evaluate(() => { actions.unneed({ id: findItem('litière').id }); save(); render(); });
  await A.evaluate(() => Sync.run()); await A.waitForTimeout(300);
  const refused = await A.evaluate(() => ({ need: findItem('litière').need, snoozed: !!findItem('litière').snooze }));
  console.log(JSON.stringify({ autofillDefault, dateMoved, chips, ticket, history, afterUnlink, owe, jointOwn, filled, onB, refused, errs }, null, 1));
  await browser.close();
})();
