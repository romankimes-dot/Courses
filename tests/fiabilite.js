// Fiabilité : horloge décalée, enregistrement malformé, Annuler ciblé, doublons hors-ligne
const { chromium } = require('playwright');
const U = 'http://localhost:8766/';
(async () => {
  const b = await chromium.launch();
  const cA = await b.newContext(), cB = await b.newContext();
  const A = await cA.newPage(), B = await cB.newPage();
  const errs = []; [A, B].forEach(p => { p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept()); });
  const sync = async () => { for (const p of [A, B, A, B]) { await p.evaluate(() => Sync.run()); await p.waitForTimeout(200); } };
  const needs = p => p.evaluate(() => S.items.filter(i => i.need).map(i => i.name + (i.done ? '✓' : '')).sort().join(','));
  await A.goto(U); await A.evaluate(() => localStorage.setItem('courses.welcome', '1')); await A.reload();
  await A.evaluate(() => { Sync.create('http://localhost:8766', 'anon'); });
  await A.waitForTimeout(800);
  const link = await A.evaluate(() => Sync.inviteLink());
  // B : horloge en retard de 10 minutes
  await B.addInitScript(() => { const off = -600e3, D = Date; Date.now = () => D.prototype.getTime.call(new D()) + off; });
  await B.goto(link); await B.waitForFunction(() => S.items.length > 0);
  await A.evaluate(() => { want(S.items.find(i => i.name === 'Pâtes')); save(); }); await sync();
  await B.evaluate(() => { const i = S.items.find(i => i.name === 'Pâtes'); i.need = false; save(); }); await sync();
  const skew = { A: await needs(A), B: await needs(B) };
  // Doublons : chacun crée « Babybel » hors-ligne
  await cA.setOffline(true); await cB.setOffline(true);
  await A.evaluate(() => { addItem('Babybel'); save(); }); await B.evaluate(() => { addItem('Babybel'); save(); });
  await cA.setOffline(false); await cB.setOffline(false); await sync(); await sync();
  const dup = { A: await A.evaluate(() => S.items.filter(i => i.name === 'Babybel').length), B: await B.evaluate(() => S.items.filter(i => i.name === 'Babybel').length) };
  // Annuler ne doit pas effacer l'ajout de l'autre
  await A.evaluate(() => { actions.noneNeed(); save(); });
  await sync();
  await B.evaluate(() => { addItem('Couches taille 4'); save(); }); await sync();
  await A.evaluate(() => { actions.undo(); save(); render(); }); await sync();
  const undo = { A: await needs(A), B: await needs(B) };
  // Enregistrement malformé reçu par la synchro
  await A.evaluate(async () => {
    await fetch('/rest/v1/rpc/push', { method: 'POST', body: JSON.stringify({ h: Sync.config().code, recs: [
      { key: 'item:bad1', data: { id: 'bad1', name: 'Test', aisle: 'x', photo: 'not-an-image" data-x="1', need: true }, u: Date.now() },
      { key: 'item:bad"2', data: { id: 'bad"2', name: 'Test2', aisle: 'x' }, u: Date.now() } ] }) });
  });
  await sync();
  const bad = await B.evaluate(() => ({ photo: S.items.find(i => i.id === 'bad1')?.photo ?? null, dropped: !S.items.some(i => i.id === 'bad"2'), domClean: !document.querySelector('[data-x]') }));
  console.log(JSON.stringify({ skew, dup, undo, bad, errs }, null, 1));
  await b.close(); process.exit(0);
})();
