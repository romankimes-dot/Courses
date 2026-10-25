// Outils communs aux scénarios : navigateur, téléphones, synchro forcée
const { chromium } = require('playwright');
const U = process.env.APP_URL || 'http://localhost:8766/';

async function phones(n = 1) {
  const browser = await chromium.launch();
  const errs = [];
  const pages = [];
  for (let k = 0; k < n; k++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    p.on('dialog', d => d.accept());
    pages.push(p);
  }
  return { browser, pages, errs };
}

// Premier lancement « juste pour moi » avec un prénom, puis retour à la liste
async function start(p, name) {
  await p.goto(U);
  await p.fill('#welcomeName', name);
  await p.click('[data-a=welcomeSolo]');
  await p.click('[data-a=go][data-v=list]');
}

// Partage sur le faux serveur local, renvoie le lien d'invitation
async function share(p) {
  await p.evaluate(url => Sync.create(url, 'anon'), U.replace(/\/$/, ''));
  await p.waitForTimeout(500);
  return p.evaluate(() => Sync.inviteLink());
}

const syncAll = async (...ps) => { for (let k = 0; k < 2; k++) for (const p of ps) { await p.evaluate(() => Sync.run()); await p.waitForTimeout(200); } };
const needs = p => p.evaluate(() => S.items.filter(i => i.need).map(i => i.name + (i.done ? ' ✓' : '')).sort());

// Glisser vers la gauche la ligne d'un article (événements tactiles)
async function swipeLeft(p, name) {
  await p.evaluate(n => {
    const row = document.querySelector(`[data-swipe="${findItem(n).id}"]`), r = row.getBoundingClientRect(), y = r.top + r.height / 2;
    const t = x => new Touch({ identifier: 1, target: row, clientX: x, clientY: y });
    row.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [t(300)] }));
    row.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, touches: [t(150)] }));
    row.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [] }));
  }, name);
}

module.exports = { U, phones, start, share, syncAll, needs, swipeLeft };
