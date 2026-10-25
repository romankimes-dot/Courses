// Propositions dès les premières lettres (accents ignorés, dernier article tapé), vider la liste d'un geste
const { phones, start, needs } = require('./_outils');
(async () => {
  const { browser, pages: [p], errs } = await phones(1);
  await start(p, 'Léa');
  await p.type('#quick input', 'tom');
  const chipsTom = await p.$$eval('#suggest .chip', e => e.map(x => x.textContent.trim()));
  await p.click('#suggest .chip:has-text("Tomates")');
  const afterPick = { need: await needs(p), draft: await p.inputValue('#quick input'), focused: await p.evaluate(() => document.activeElement?.closest('#quick') != null) };
  await p.type('#quick input', 'lait, 2 kg ban');
  const chipsBan = await p.$$eval('#suggest .chip', e => e.map(x => x.textContent.trim()));
  await p.click('#suggest .chip:has-text("Bananes")');
  const draft2 = await p.inputValue('#quick input');
  await p.press('#quick input', 'Enter');
  await p.type('#quick input', 'cafe');
  const chipsCafe = await p.$$eval('#suggest .chip', e => e.map(x => x.textContent.trim()));
  await p.fill('#quick input', ''); await p.type('#quick input', 'tom');
  const already = await p.$$eval('#suggest .chip', e => e.map(x => x.textContent.trim()));
  const before = await needs(p);
  await p.click('[data-a=clearList]');
  const cleared = await needs(p);
  await p.click('#toast [data-a=undo]');
  const restored = await needs(p);
  console.log(JSON.stringify({ chipsTom, afterPick, chipsBan, draft2, chipsCafe, already, before, cleared, restored, errs }, null, 1));
  await browser.close();
})();
