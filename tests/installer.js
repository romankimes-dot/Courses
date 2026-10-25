// Installer sur l'écran d'accueil : guide sur iPhone (accueil, liste, Réglages), bouton natif sur Android,
// « Plus tard » qui repousse, lien ?installer qui le remontre ; rien sur ordinateur ni une fois installée
const { chromium } = require('playwright');
const { U } = require('./_outils');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
(async () => {
  const browser = await chromium.launch(), out = {}, errs = [];
  for (const [n, ua, standalone] of [['iphone', IOS], ['android', AND], ['ordinateur'], ['iphone installée', IOS, true]]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, userAgent: ua });
    if (standalone) await ctx.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true }));
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(`${n} : ${e.message}`)); p.on('dialog', d => d.accept());
    await p.goto(U);
    const r = out[n] = { accueil: await p.locator('.welcome .steps').count() };
    await p.fill('#welcomeName', 'Léa'); await p.click('[data-a=welcomeSolo]'); await p.click('[data-a=go][data-v=list]');
    if (n === 'android') { // la fenêtre d'installation du navigateur, simulée
      await p.evaluate(() => { const e = new Event('beforeinstallprompt'); e.prompt = () => { window.prompted = true; }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); dispatchEvent(e); });
      await p.click('main [data-a=install]'); await p.waitForTimeout(100);
      r.fenêtre = await p.evaluate(() => !!window.prompted);
    }
    r.carte = await p.locator('main [data-a=installLater]').count();
    if (r.carte) { await p.click('[data-a=installLater]'); r.aprèsPlusTard = await p.locator('main [data-a=installLater]').count(); }
    await p.click('#gear'); r.réglages = await p.locator('main .steps, main [data-a=install]').count();
    await p.goto(U + '?installer'); await p.waitForTimeout(300);
    r.lienInstaller = await p.locator('main [data-a=installLater]').count();
    await ctx.close();
  }
  console.log(JSON.stringify({ out, errs }, null, 1));
  await browser.close();
})();
