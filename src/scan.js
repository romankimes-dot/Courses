// Scan de ticket : lecture sur le téléphone (Tesseract.js, gratuit), puis page de validation.
// Chaque ligne validée est mémorisée (S.aliases : libellé du ticket -> article, ou 'ignore') :
// au ticket suivant, elle est reconnue automatiquement et seules les nouvelles lignes sont à vérifier.

const TESSERACT = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
let scan = null; // { status: 'reading' | 'review' | 'error', ... }

const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const num = s => Math.round(parseFloat(s.replace(',', '.')) * 100) / 100;
const pretty = label => { const s = label.toLowerCase().replace(/\s+/g, ' ').trim(); return s.charAt(0).toUpperCase() + s.slice(1); };
const HALF_DAY = 432e5;

// ---------- Lecture du texte ----------

const SKIP = /total|sous.?tot|t\.?v\.?a|\bcb\b|carte|rendu|esp[eè]ce|payer|montant|ticket|merci|caisse|siret|siren|t[ée]l\b|fid[ée]lit|avantage|cumul|solde|paiement|transaction|\barticles?\b|nombre|\bdate\b|heure|bienvenue|www|http|remise|r[ée]duction|bon d.achat|economi/i;
const PRICE = /(-?\d{1,4}[.,]\d{2})\s*(?:€|eur|[a-z0-9*]{1,2})?\s*$/i;

function parseReceipt(text) {
  const out = [];
  let total = null, date = null;
  for (const l of text.split('\n').map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean)) {
    const dm = l.match(/\b(\d{2})[\/.-](\d{2})[\/.-](\d{2}|\d{4})\b/);
    if (dm && !date) {
      const d = `${dm[3].length === 2 ? '20' + dm[3] : dm[3]}-${dm[2]}-${dm[1]}`, t = Date.parse(d);
      if (t && t <= Date.now() + DAY && t > Date.now() - 90 * DAY) date = d;
    }
    const tm = l.match(/(?:total|payer)\D{0,25}(\d{1,4}[.,]\d{2})/i);
    if (tm && !/sous/i.test(l)) { total = Math.max(total ?? 0, num(tm[1])); continue; }
    const qm = l.match(/^(\d{1,2})\s*[x×*]\s*(\d{1,4}[.,]\d{2})/i);
    if (qm && out.length) { out[out.length - 1].qty = +qm[1]; continue; }
    if (SKIP.test(l)) continue;
    const pm = l.match(PRICE);
    if (!pm || num(pm[1]) <= 0) continue;
    const label = l.slice(0, pm.index).replace(/[^\p{L}\p{N} %.,'\/-]/gu, ' ').replace(/\s+/g, ' ').trim();
    if (label.replace(/[^\p{L}]/gu, '').length < 3) continue;
    out.push({ label, price: num(pm[1]), qty: 1 });
  }
  return { lines: out, total, date };
}

// Article le plus proche d'un libellé de ticket (abréviations : « TOM GRAPPE » -> Tomates)
function suggest(label) {
  const lt = norm(label).split(' ').filter(t => t.length >= 2);
  const sim = (a, b) => a === b ? 1 : a.length >= 3 && b.length >= 3 && (a.startsWith(b.slice(0, 3)) || b.startsWith(a.slice(0, 3))) ? .7 : 0;
  let best = null, bestScore = .5;
  for (const i of S.items) {
    const it = norm(i.name).split(' ').filter(t => t.length >= 3);
    if (!it.length) continue;
    const score = it.reduce((s, t) => s + Math.max(0, ...lt.map(l => sim(l, t))), 0) / it.length;
    if (score > bestScore) { best = i; bestScore = score; }
  }
  return best;
}

// ---------- OCR ----------

function loadTesseract() {
  if (window.Tesseract) return Promise.resolve();
  return new Promise((ok, ko) => {
    const s = Object.assign(document.createElement('script'), { src: TESSERACT, onload: ok, onerror: () => ko(new Error('réseau')) });
    document.head.append(s);
  });
}

// Photo réduite, en niveaux de gris contrastés : lecture plus rapide et plus fiable
async function prepare(file) {
  const img = new Image();
  img.src = URL.createObjectURL(file);
  await img.decode();
  const k = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(img.naturalWidth * k), height: Math.round(img.naturalHeight * k) });
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(img.src);
  const px = ctx.getImageData(0, 0, c.width, c.height), d = px.data;
  for (let n = 0; n < d.length; n += 4) {
    const g = Math.min(255, Math.max(0, (0.3 * d[n] + 0.59 * d[n + 1] + 0.11 * d[n + 2] - 128) * 1.5 + 128));
    d[n] = d[n + 1] = d[n + 2] = g;
  }
  ctx.putImageData(px, 0, 0);
  return c;
}

async function readTicket(file) {
  scan = { status: 'reading', progress: 0 };
  tab = 'scan';
  render();
  try {
    await loadTesseract();
    const canvas = await prepare(file);
    const { data } = await Tesseract.recognize(canvas, 'fra', {
      logger: m => {
        if (m.status !== 'recognizing text') return;
        scan.progress = m.progress;
        const bar = document.querySelector('#scanProgress div');
        if (bar) bar.style.width = `${Math.round(m.progress * 100)}%`;
      },
    });
    startReview(data.text);
  } catch (e) {
    scan = { status: 'error', error: e.message === 'réseau' ? 'Le module de lecture n\'a pas pu être téléchargé : il faut du réseau la première fois.' : 'La lecture a échoué. Réessayez avec une photo plus nette.' };
  }
  render();
}

function startReview(text) {
  const r = parseReceipt(text);
  const today = new Date().toISOString().slice(0, 10);
  scan = {
    status: 'review', text, total: r.total,
    date: r.date || today,
    place: store()?.name || 'Autre magasin',
    lines: r.lines.map((l, n) => {
      const key = norm(l.label), alias = S.aliases[key];
      const line = { id: 'l' + n, ...l, key, item: null, ignore: false, auto: false, sug: null, mode: null };
      if (alias === 'ignore') Object.assign(line, { ignore: true, auto: true });
      else if (alias && item(alias)) Object.assign(line, { item: alias, auto: true });
      else line.sug = suggest(l.label)?.id || null;
      return line;
    }),
  };
}

// ---------- Vue ----------

views.scan = () => {
  const back = `<button class="ghost back" data-a="cancelScan">← Retour</button>`;
  if (!scan) return `
    ${back}
    <h2>Scanner un ticket</h2>
    <p class="hint">Le ticket est lu sur ce téléphone, gratuitement. Les lignes déjà validées par le passé sont reconnues toutes seules : vous ne vérifiez que les nouvelles.</p>
    <button class="primary" data-a="pickTicket">📷 Photo du ticket</button>
    <p class="hint">Conseils : ticket à plat, bien éclairé, en entier dans la photo. La première fois, le module de lecture (quelques Mo) se télécharge : il faut du réseau.</p>`;
  if (scan.status === 'reading') return `
    <h2>Lecture du ticket…</h2>
    <div class="progress" id="scanProgress"><div style="width:${Math.round(scan.progress * 100)}%"></div></div>
    <p class="hint">Quelques secondes à une minute selon le téléphone.</p>`;
  if (scan.status === 'error') return `
    ${back}
    <p class="empty">${esc(scan.error)}</p>
    <button class="primary" data-a="pickTicket">Réessayer</button>`;

  const pending = scan.lines.filter(l => !l.item && !l.ignore), known = scan.lines.filter(l => l.item || l.ignore);
  const kept = scan.lines.filter(l => l.item);
  const sum = kept.reduce((t, l) => t + l.price, 0);
  const places = [...S.stores.map(s => s.name), ...S.shops.map(s => s.name), 'Autre magasin'];
  return `
    ${back}
    <section class="card">
      <div class="bar">
        <label class="small grow">Date<br><input type="date" id="scanDate" value="${scan.date}"></label>
        <label class="small grow">Total (€)<br><input id="scanTotal" inputmode="decimal" value="${scan.total == null ? '' : String(scan.total).replace('.', ',')}" placeholder="${sum.toFixed(2).replace('.', ',')}"></label>
      </div>
      <label class="small">Magasin<br><select id="scanPlace">${[...new Set(places)].map(p => `<option${p === scan.place ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select></label>
    </section>
    ${scan.lines.length ? '' : '<p class="empty">Aucune ligne avec un prix n\'a été lue. Réessayez avec une photo plus nette.</p>'}
    ${pending.length ? `
      <h3>À vérifier · ${pending.length}</h3>
      <p class="hint">Jamais vues auparavant. Une fois validées, elles seront reconnues toutes seules.</p>
      ${pending.filter(l => l.sug).length > 1 ? `<button class="wide" data-a="acceptAll">✓ Accepter les ${pending.filter(l => l.sug).length} propositions</button>` : ''}
      ${pending.map(lineCard).join('')}` : scan.lines.length ? '<p class="hint">✓ Tout est vérifié.</p>' : ''}
    ${known.length ? `
      <h3>Reconnus · ${known.length}</h3>
      ${known.map(l => `
        <div class="row static">
          <span class="name"><code>${esc(l.label)}</code><br>${l.ignore ? '<small>pas un produit</small>' : `→ ${esc(item(l.item).name)}${l.qty > 1 ? ` <small>× ${l.qty}</small>` : ''}`}</span>
          <span>${euro(l.price)}</span>
          <button class="ghost" data-a="lineReset" data-id="${l.id}" title="Modifier">✎</button>
        </div>`).join('')}` : ''}
    <button class="primary" data-a="saveScan" ${scan.lines.length ? '' : 'disabled'}>Enregistrer ${kept.length} article${kept.length > 1 ? 's' : ''}</button>
    <details class="hint"><summary>Texte lu</summary><pre>${esc(scan.text)}</pre></details>
    <datalist id="catalog">${S.items.map(i => `<option value="${esc(i.name)}">`).join('')}</datalist>`;
};

function lineCard(l) {
  const head = `<div class="bar"><code class="grow">${esc(l.label)}</code><strong>${euro(l.price)}</strong></div>`;
  if (l.mode === 'pick') return `
    <section class="card">${head}
      <form id="linePick" data-id="${l.id}" class="add">
        <input name="name" list="catalog" placeholder="Article de ma liste" autocomplete="off" required>
        <button>OK</button>
        <button type="button" class="ghost" data-a="lineMode" data-id="${l.id}" data-v="">Annuler</button>
      </form>
    </section>`;
  if (l.mode === 'new') return `
    <section class="card">${head}
      <form id="lineNew" data-id="${l.id}" class="add">
        <input name="name" value="${esc(pretty(l.label))}" autocomplete="off" required>
        <select name="aisle">${aisleOptions(fallbackAisle())}</select>
        <button>Créer</button>
        <button type="button" class="ghost" data-a="lineMode" data-id="${l.id}" data-v="">Annuler</button>
      </form>
    </section>`;
  const sug = l.sug && item(l.sug);
  return `
    <section class="card">${head}
      ${sug ? `<button class="accent wide" data-a="lineAccept" data-id="${l.id}">✓ C'est « ${esc(sug.name)} »</button>` : ''}
      <div class="bar">
        <button data-a="lineMode" data-id="${l.id}" data-v="pick">${sug ? 'Autre article' : 'Choisir un article'}</button>
        <button data-a="lineMode" data-id="${l.id}" data-v="new">Nouvel article</button>
        <button class="ghost" data-a="lineIgnore" data-id="${l.id}">Pas un produit</button>
      </div>
    </section>`;
}

// ---------- Actions ----------

const line = id => scan.lines.find(l => l.id === id);

Object.assign(actions, {
  openScan: () => { if (scan?.status !== 'review') scan = null; tab = 'scan'; },
  pickTicket: () => document.getElementById('ticket').click(),
  cancelScan: () => {
    if (scan?.status === 'review' && !confirm('Abandonner ce ticket ?')) return;
    scan = null;
    tab = 'budget';
  },
  lineAccept: ({ id }) => { const l = line(id); l.item = l.sug; },
  acceptAll: () => scan.lines.forEach(l => { if (!l.item && !l.ignore && l.sug) l.item = l.sug; }),
  lineIgnore: ({ id }) => { line(id).ignore = true; },
  lineMode: ({ id, v }) => { line(id).mode = v || null; },
  lineReset: ({ id }) => { Object.assign(line(id), { item: null, ignore: false, auto: false, mode: null }); },
  saveScan: () => {
    const left = scan.lines.filter(l => !l.item && !l.ignore).length;
    if (left && !confirm(`${left} ligne${left > 1 ? 's' : ''} non vérifiée${left > 1 ? 's' : ''} : elle${left > 1 ? 's' : ''} ne sera${left > 1 ? 'ont' : ''} pas enregistrée${left > 1 ? 's' : ''}. Continuer ?`)) return;
    const today = new Date().toISOString().slice(0, 10);
    const d = scan.date === today ? Date.now() : Date.parse(scan.date + 'T12:00');
    const kept = scan.lines.filter(l => l.item);
    for (const l of scan.lines) {
      if (l.item || l.ignore) S.aliases[l.key] = l.ignore ? 'ignore' : l.item;
      if (!l.item) continue;
      const i = item(l.item);
      i.prices = [...(i.prices || []), { d, p: Math.round(l.price / l.qty * 100) / 100, at: scan.place }].slice(-HISTORY);
      // Déjà compté si les courses ont aussi été validées en magasin ce jour-là
      if (!(i.bought || []).some(t => Math.abs(t - d) < HALF_DAY)) i.bought = [...(i.bought || []), d].sort((a, b) => a - b).slice(-HISTORY);
      if (i.need) { i.need = false; i.done = false; }
    }
    const total = parseEuro(document.getElementById('scanTotal')?.value || '') ?? scan.total ?? Math.round(kept.reduce((t, l) => t + l.price, 0) * 100) / 100;
    const trip = S.trips.find(t => Math.abs(t.date - d) < HALF_DAY && t.place === scan.place);
    if (trip) Object.assign(trip, { total, n: Math.max(trip.n, kept.length), scanned: true });
    else S.trips.push({ id: uid(), date: d, total, place: scan.place, n: kept.length, scanned: true });
    scan = null;
    tab = 'budget';
  },
});

// Formulaires de la page de validation (avant le gestionnaire général, qui sauvegarde et réaffiche)
document.addEventListener('submit', e => {
  const id = e.target.id;
  if (id !== 'linePick' && id !== 'lineNew') return;
  const l = line(e.target.dataset.id), f = new FormData(e.target), n = f.get('name').trim();
  let i = S.items.find(x => x.name.toLowerCase() === n.toLowerCase());
  if (!i && n) S.items.push(i = { id: uid(), name: n, aisle: f.get('aisle') || fallbackAisle(), freq: false, need: false, done: false });
  if (i) Object.assign(l, { item: i.id, mode: null });
}, true);

document.addEventListener('change', e => {
  if (e.target.id === 'ticket') { const file = e.target.files[0]; e.target.value = ''; if (file) readTicket(file); return; }
  if (!scan) return;
  if (e.target.id === 'scanDate') scan.date = e.target.value;
  if (e.target.id === 'scanPlace') scan.place = e.target.value;
  if (e.target.id === 'scanTotal') scan.total = parseEuro(e.target.value);
}, true);
