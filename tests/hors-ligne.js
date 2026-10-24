const { chromium } = require('playwright');
const U = 'http://localhost:8766/';
(async () => {
  const b = await chromium.launch();
  const A = await (await b.newContext()).newPage(), ctxB = await b.newContext(), B = await ctxB.newPage();
  const errs = []; [A, B].forEach(p => { p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept()); });
  const sync = p => p.evaluate(() => Sync.run());
  const status = p => p.textContent('#sync');
  // A crée la liste partagée
  await A.goto(U); await A.evaluate(() => localStorage.setItem('courses.welcome', '1')); await A.reload();
  await A.click('#gear');
  await A.fill('#share input[name=url]', 'http://localhost:8766'); await A.fill('#share input[name=key]', 'anon');
  await A.click('#share button');
  await A.waitForTimeout(1200);
  console.log('A après création :', await status(A));
  const link = await A.evaluate(() => Sync.inviteLink());
  // B rejoint
  await B.goto(link);
  await B.waitForFunction(() => S.items.length > 0);
  console.log('B rejoint :', await B.evaluate(() => S.items.length), 'articles,', await status(B));
  await B.evaluate(() => navigator.serviceWorker.ready);
  // B prépare
  await B.click('[data-a=go][data-v=catalog]'); await B.click('.row:has-text("Lait")'); await B.click('.row:has-text("Pain")');
  await B.waitForTimeout(1200); await sync(A);
  console.log('A voit à acheter :', await A.evaluate(() => S.items.filter(i => i.need).map(i => i.name)));
  // B part au magasin sans réseau, recharge l'app hors-ligne
  await ctxB.setOffline(true);
  await B.reload();
  await B.click('[data-tab=shop]');
  await B.click('.row:has-text("Lait")');
  await B.waitForTimeout(1200);
  console.log('B hors-ligne :', await status(B));
  // Pendant ce temps A ajoute du kiwi
  await A.click('[data-tab=list]');
  await A.fill('#quick input', 'Kiwi'); await A.press('#quick input', 'Enter');
  await A.waitForTimeout(1200);
  // B retrouve du réseau
  await ctxB.setOffline(false);
  await B.evaluate(() => dispatchEvent(new Event('online')));
  await B.waitForTimeout(1000); await sync(A);
  console.log('B :', await B.evaluate(() => S.items.filter(i => i.need).map(i => i.name + (i.done ? ' ✓' : ''))), await status(B));
  console.log('A :', await A.evaluate(() => S.items.filter(i => i.need).map(i => i.name + (i.done ? ' ✓' : ''))), await status(A));
  console.log({ errs });
  await b.close(); process.exit(0);
})();
