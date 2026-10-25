// Éditeur de plan : les panneaux restent dépliés quand on modifie (taille, rayons), palette de rayons,
// on peint en glissant sur plusieurs cases, la gomme efface, l'entrée se pose, l'aperçu apparaît
const { phones, start } = require('./_outils');
(async () => {
  const { browser, pages: [p], errs } = await phones(1);
  await start(p, 'Léa');
  await p.click('#gear');
  await p.click('details[data-k=plan] summary');
  const open = k => p.$eval(`details[data-k=${k}]`, d => d.open);
  const size = () => p.$$eval('.sizes b', e => e.map(x => +x.textContent));
  await p.click('[data-a=size][data-dim=cols][data-d="1"]');
  await p.click('[data-a=size][data-dim=rows][data-d="-1"]');
  const r = { ouvertApresTaille: await open('plan'), taille: await size() };
  // Glisser sur 3 cases de la première ligne avec le premier rayon
  const cell = c => p.$eval(`#planGrid .cell[data-c="${c}"]`, el => { el.scrollIntoView({ block: "center" }); const b = el.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; });
  const drag = async cs => { const pts = []; for (const c of cs) pts.push(await cell(c)); await p.mouse.move(...pts[0]); await p.mouse.down(); for (const pt of pts.slice(1)) await p.mouse.move(...pt, { steps: 4 }); await p.mouse.up(); };
  await drag(['0,0', '1,0', '2,0']);
  r.peintes = await p.evaluate(() => Object.keys(store().map.cells).sort());
  await p.click('[data-a=setBrush][data-v=entry]');
  await drag(['0,6']);
  r.entree = await p.evaluate(() => store().map.entry);
  await p.click('[data-a=setBrush][data-v=""]');
  await drag(['1,0']);
  r.apresGomme = await p.evaluate(() => Object.keys(store().map.cells).sort());
  r.apercu = await p.locator('details[data-k=plan] svg.map').count();
  r.ouvertApresPeinture = await open('plan');
  // Rayons : monter un rayon garde le panneau ouvert
  await p.click('details[data-k=aisles] summary');
  await p.click('details[data-k=aisles] [data-a=move][data-d="1"]');
  r.rayonsOuverts = await open('aisles');
  r.planToujoursOuvert = await open('plan');
  await p.screenshot({ path: process.argv[2] ? process.argv[2] + '/plan-editeur.png' : '/dev/null', fullPage: true }).catch(() => {});
  console.log(JSON.stringify({ ...r, errs }, null, 1));
  await browser.close();
})();
