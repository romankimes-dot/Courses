// Pas d'emojis natifs dans l'interface ; dans Mes articles, un article tout juste créé devient indispensable
// d'un toucher (rien de tel depuis la liste), ou d'office avec le filtre Indispensables
const { phones, start } = require('./_outils');
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]/u;
(async () => {
  const { browser, pages: [p], errs } = await phones(1);
  await start(p, 'Roman');
  await p.fill('#quick input', 'Lait'); await p.press('#quick input', 'Enter');
  const fromList = await p.$('#toast [data-a=pinIds]').then(b => b && b.isVisible());
  await p.click('[data-a=go][data-v=catalog]');
  await p.fill('#quick input', 'Danonino'); await p.press('#quick input', 'Enter');
  await p.waitForSelector('#toast [data-a=pinIds]');
  const offer = await p.textContent('#toast');
  await p.click('#toast [data-a=pinIds]');
  const pinned = await p.evaluate(() => findItem('danonino').pin === true);
  await p.click('[data-a=catalogPins][data-v="1"]');
  await p.fill('#quick input', 'babybel, compotes'); await p.press('#quick input', 'Enter');
  await p.click('[data-a=go][data-v=list]');
  const pinned2 = await p.evaluate(() => ['babybel', 'compotes'].every(n => findItem(n).pin));
  const screens = {};
  for (const [name, go] of [['liste', null], ['articles', '[data-a=go][data-v=catalog]'], ['repas', '[data-tab=meals]'], ['depenses', '[data-tab=budget]'], ['reglages', '#gear'], ['activite', '#bell']]) {
    if (go) await p.click(go);
    screens[name] = EMOJI.test(await p.evaluate(() => document.body.innerText)) ? 'emoji !' : 'ok';
  }
  console.log(JSON.stringify({ fromList: !!fromList, offer, pinned, pinned2, screens, errs }, null, 1));
  await browser.close();
})();
