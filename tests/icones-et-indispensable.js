// Pas d'emojis natifs dans l'interface ; un article tout juste créé peut devenir indispensable d'un toucher
const { phones, start } = require('./_outils');
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]/u;
(async () => {
  const { browser, pages: [p], errs } = await phones(1);
  await start(p, 'Roman');
  await p.fill('#quick input', 'Danonino'); await p.press('#quick input', 'Enter');
  const offer = await p.textContent('#toast');
  await p.click('#toast [data-a=pinIds]');
  const pinned = await p.evaluate(() => findItem('danonino').pin === true);
  await p.fill('#quick input', 'babybel, compotes'); await p.press('#quick input', 'Enter');
  await p.click('#toast [data-a=pinIds]');
  const pinned2 = await p.evaluate(() => ['babybel', 'compotes'].every(n => findItem(n).pin));
  const screens = {};
  for (const [name, go] of [['liste', null], ['articles', '[data-a=go][data-v=catalog]'], ['repas', '[data-tab=meals]'], ['depenses', '[data-tab=budget]'], ['reglages', '#gear'], ['activite', '#bell']]) {
    if (go) await p.click(go);
    screens[name] = EMOJI.test(await p.evaluate(() => document.body.innerText)) ? 'emoji !' : 'ok';
  }
  console.log(JSON.stringify({ offer, pinned, pinned2, screens, errs }, null, 1));
  await browser.close();
})();
