const { chromium } = require('playwright');
const SP = (process.argv[2] || require('os').tmpdir());
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 400, height: 820 }, deviceScaleFactor: 2 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept(d.type() === 'prompt' ? '' : undefined));
  await p.goto('http://localhost:8766/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('courses.welcome', '1'); }); await p.reload();
  await p.click('[data-a=go][data-v=catalog]');
  // Babybel et Danonino du petit, épinglés
  await p.fill('#quick input', 'Babybel, Danonino'); await p.press('#quick input', 'Enter');
  for (const n of ['Babybel', 'Danonino', 'Bananes']) await p.click(`.row:has-text("${n}") [data-a=pin]`);
  const pinSection = await p.$$eval('.pins .row .name', e => e.map(x => x.textContent.trim()));
  await p.click('[data-a=noneNeed]'); await p.click('[data-a=allPins]');
  for (const n of ['Pâtes', 'Café', 'Eau']) await p.click(`.row:has-text("${n}")`);
  await p.screenshot({ path: SP + '/c-catalog.png' });
  await p.click('[data-a=go][data-v=list]');
  const listHeads = await p.$$eval('main section h3', e => e.map(x => x.textContent.trim()));
  await p.screenshot({ path: SP + '/c-list.png', fullPage: true });
  // En magasin : cocher -> panier en bas
  await p.click('[data-tab=shop]');
  const before = await p.$$eval('main section h3', e => e.map(x => x.textContent.trim()));
  // Parcours réel : Boissons, puis Épicerie sucrée, puis Crèmerie, Fruits, Épicerie salée (sur 10 min)
  const seq = ['Eau', 'Café', 'Babybel', 'Danonino', 'Bananes', 'Pâtes'];
  for (const n of seq) await p.click(`main section:not(.basket) .row:has-text("${n}")`);
  await p.evaluate(seq => { seq.forEach((n, k) => { S.items.find(i => i.name === n).doneAt = Date.now() - (seq.length - k) * 120e3; }); }, seq);
  await p.evaluate(() => render());
  const basket = await p.$$eval('.basket .row .name', e => e.map(x => x.textContent.trim()));
  const pendingSections = await p.$$eval('main section:not(.basket)', e => e.length);
  await p.screenshot({ path: SP + '/c-shop.png', fullPage: true });
  await p.click('[data-a=finish]'); await p.fill('#finishForm input', '18,40'); await p.click('#finishForm .primary');
  const toastText = await p.textContent('#toast span');
  const order = await p.evaluate(() => orderedAisles().map(a => a.name).slice(0, 6));
  console.log(JSON.stringify({ pinSection, listHeads, before, basket, pendingSections, toastText, order, errs }, null, 1));
  await b.close();
})();
