// Courses — données locales d'abord (fonctionne sans réseau), synchro dans sync.js.

const KEY = 'courses.v1';
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Rayons dans l'ordre du circuit en magasin, avec les basiques
const DEFAULTS = {
  'Fruits & légumes': ['Bananes', 'Pommes', 'Tomates', 'Salade', 'Oignons', 'Carottes'],
  'Boulangerie': ['Pain'],
  'Crèmerie': ['Lait', 'Beurre', 'Œufs', 'Yaourts', 'Fromage râpé'],
  'Boucherie / Poisson': ['Jambon', 'Poulet'],
  'Épicerie salée': ['Pâtes', 'Riz', 'Huile d\'olive', 'Sel'],
  'Épicerie sucrée': ['Café', 'Sucre', 'Céréales'],
  'Boissons': ['Eau'],
  'Surgelés': [],
  'Hygiène': ['Papier toilette', 'Dentifrice'],
  'Entretien': ['Liquide vaisselle', 'Éponges'],
  'Divers': [],
};

// Commerces hors supermarché (ids fixes : pas de doublons quand deux téléphones les créent)
const defaultShops = () => ['🥖 Boulangerie', '🥩 Boucherie', '🧀 Fromager', '🍷 Caviste', '🧺 Marché']
  .map(name => ({ id: 'shop-' + name.split(' ')[1].toLowerCase(), name }));

function seed() {
  const aisles = [], items = [];
  for (const [name, list] of Object.entries(DEFAULTS)) {
    const aisle = { id: uid(), name };
    aisles.push(aisle);
    for (const n of list) items.push({ id: uid(), name: n, aisle: aisle.id, freq: true, need: false, done: false });
  }
  return { aisles, items, recipes: [], shops: defaultShops(), stores: [newStore()], trips: [], settings: {} };
}
// Plan d'un magasin : quadrillage approximatif, case "x,y" -> rayon
const newMap = () => ({ cols: 6, rows: 8, cells: {}, entry: null, auto: true });
// Supermarché : son propre ordre de rayons (null = ordre générique) et son plan
const newStore = (name = 'Mon supermarché', id = 'store-main') => ({ id, name, order: null, map: newMap() });
const NO_MAP = { cols: 6, rows: 8, cells: {}, entry: null, auto: false };

// Complète un état ancien ou importé
function upgrade(st) {
  st.recipes ||= [];
  st.shops ||= defaultShops();
  st.trips ||= [];
  st.settings ||= {};
  if (!st.stores) { st.stores = [newStore()]; if (st.map) st.stores[0].map = st.map; }
  delete st.map;
  return st;
}

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}
let S = upgrade(load() || seed());
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
  if (typeof Sync !== 'undefined') Sync.changed();
}

let tab = 'prep';
let who = 0; // courses à deux : 0 = seul, 1 ou 2 = mon circuit (propre à cet appareil)
try { who = +localStorage.getItem('courses.who') || 0; } catch {}
let recipeEdit = null, recipeAdd = null, recipeSkip = new Set(); // recette en cours d'édition / d'ajout
let place = ''; // en courses : '' = supermarché, sinon id du commerce
let storeId = null; // supermarché où je suis (propre à cet appareil) ; 'none' = magasin non cartographié
try { storeId = localStorage.getItem('courses.store'); } catch {}
const store = () => storeId === 'none' ? null : S.stores.find(s => s.id === storeId) || S.stores[0] || null;
const M = () => store()?.map || NO_MAP;
// Rayons dans l'ordre du magasin courant (les rayons absents de son ordre gardent l'ordre générique, à la fin)
function orderedAisles() {
  const order = store()?.order;
  if (!order) return S.aisles;
  const pos = a => { const k = order.indexOf(a.id); return k < 0 ? 1e6 + S.aisles.indexOf(a) : k; };
  return [...S.aisles].sort((a, b) => pos(a) - pos(b));
}
let photoFor = null; // article auquel lier la photo en cours
let brush = null; // pinceau de l'éditeur de plan : id de rayon, 'entry' ou '' (gomme)
const app = document.getElementById('app');

// Groupes par rayon (ou par commerce avec list = S.shops) ; un article d'un commerce a aisle = id du commerce
const byAisle = (filter, list = orderedAisles()) => list
  .map(a => ({ aisle: a, items: S.items.filter(i => i.aisle === a.id && filter(i)) }))
  .filter(g => g.items.length);
const fallbackAisle = () => (S.aisles.find(a => a.name === 'Divers') || S.aisles[S.aisles.length - 1]).id;
const option = (o, sel) => `<option value="${o.id}"${o.id === sel ? ' selected' : ''}>${esc(o.name)}</option>`;
const aisleOptions = sel => `
  <optgroup label="Supermarché">${S.aisles.map(a => option(a, sel)).join('')}</optgroup>
  ${S.shops.length ? `<optgroup label="Commerces">${S.shops.map(a => option(a, sel)).join('')}</optgroup>` : ''}`;
const shopOf = i => S.shops.find(s => s.id === i.aisle);

function addItem(name, aisle, freq) {
  name = name.trim();
  if (!name) return;
  const existing = S.items.find(i => i.name.toLowerCase() === name.toLowerCase());
  if (existing) { existing.need = true; existing.done = false; return; }
  S.items.push({ id: uid(), name, aisle: aisle || fallbackAisle(), freq, need: true, done: false });
}

// ---------- Suggestions (rythme d'achat) ----------

const DAY = 864e5;
const HISTORY = 10;

// Intervalle moyen entre achats validés, et jours depuis le dernier
function rhythm(i) {
  const b = i.bought || [];
  if (b.length < 2) return null;
  const every = Math.max(1, (b[b.length - 1] - b[0]) / (b.length - 1) / DAY);
  const since = (Date.now() - b[b.length - 1]) / DAY;
  return { every, since, due: since / every };
}
const suggestions = () => S.items
  .filter(i => !i.need)
  .map(i => ({ i, r: rhythm(i) }))
  .filter(x => x.r && x.r.due >= 0.8)
  .sort((a, b) => b.r.due - a.r.due);
const rhythmLabel = r => `tous les ~${Math.round(r.every)} j · il y a ${Math.round(r.since)} j`;

// ---------- Plan et circuit ----------

const aisleColor = id => `hsl(${Math.round(S.aisles.findIndex(a => a.id === id) * 360 / S.aisles.length)} 55% 55%)`;
const cell = c => c.split(',').map(Number);
const entryPoint = () => M().entry && cell(M().entry).map(v => v + .5);

function centroid(aisleId) {
  const cs = Object.entries(M().cells).filter(([, a]) => a === aisleId).map(([c]) => cell(c));
  if (!cs.length) return null;
  return [0, 1].map(k => cs.reduce((t, c) => t + c[k], 0) / cs.length + .5);
}

// Circuit le plus court au départ de l'entrée, avec retour aux caisses (supposées près de l'entrée).
// Distance de Manhattan : on marche dans les allées. Exact jusqu'à 9 rayons, plus proche voisin au-delà.
// Les rayons absents du plan gardent l'ordre manuel, à la fin.
function route(ids) {
  if (!M().auto) return ids;
  const placed = ids.filter(centroid), rest = ids.filter(id => !centroid(id));
  if (!placed.length) return ids;
  const pt = Object.fromEntries(placed.map(id => [id, centroid(id)]));
  const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
  const entry = entryPoint(), start = entry || pt[placed[0]];
  let best = Infinity, bestOrder = placed;

  if (placed.length <= 9) {
    (function dfs(pos, left, acc, cost) {
      if (cost >= best) return;
      if (!left.length) {
        const total = cost + (entry ? dist(pos, entry) : 0);
        if (total < best) { best = total; bestOrder = acc; }
        return;
      }
      left.forEach((id, k) => dfs(pt[id], left.filter((_, j) => j !== k), [...acc, id], cost + dist(pos, pt[id])));
    })(start, placed, [], 0);
  } else {
    const left = [...placed];
    bestOrder = [];
    let pos = start;
    while (left.length) {
      let k = 0;
      left.forEach((id, j) => { if (dist(pos, pt[id]) < dist(pos, pt[left[k]])) k = j; });
      pos = pt[left[k]];
      bestOrder.push(...left.splice(k, 1));
    }
  }
  return [...bestOrder, ...rest];
}

const manhattan = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
function tourCost(order) {
  const pts = [entryPoint(), ...order.map(centroid), entryPoint()].filter(Boolean);
  return pts.slice(1).reduce((t, p, k) => t + manhattan(pts[k], p), 0);
}

// Deux circuits : on coupe le circuit optimal en deux, chaque moitié est réoptimisée,
// et on garde la coupe qui équilibre le mieux marche + nombre d'articles (1 article ≈ 1 case).
function splitRoute(groups) {
  const ids = groups.map(g => g.aisle.id);
  const load = Object.fromEntries(groups.map(g => [g.aisle.id, g.items.length]));
  const cost = part => tourCost(part) + part.reduce((t, id) => t + load[id], 0);
  let best = null;
  for (let k = 1; k < ids.length; k++) {
    const a = route(ids.slice(0, k)), b = route(ids.slice(k));
    const worst = Math.max(cost(a), cost(b));
    if (!best || worst < best.worst) best = { worst, parts: [a, b] };
  }
  return best ? best.parts : [ids, []];
}

// Projection isométrique : (x, y) au sol, z en hauteur
const iso = (x, y, z = 0) => [x - y, (x + y) / 2 - z];
const poly = (pts, fill, extra = '') => `<polygon points="${pts.map(p => iso(...p).map(v => v.toFixed(3)).join(',')).join(' ')}" fill="${fill}" ${extra}/>`;

function block(x, y, h, l, hue, opacity = 1) {
  const c = k => hue === null ? `hsl(150 4% ${l - k}%)` : `hsl(${hue} 55% ${l - k}%)`;
  const o = `opacity="${opacity}" stroke="rgba(0,0,0,.15)" stroke-width=".02"`;
  return poly([[x, y + 1, h], [x + 1, y + 1, h], [x + 1, y + 1, 0], [x, y + 1, 0]], c(18), o)
    + poly([[x + 1, y, h], [x + 1, y + 1, h], [x + 1, y + 1, 0], [x + 1, y, 0]], c(28), o)
    + poly([[x, y, h], [x + 1, y, h], [x + 1, y + 1, h], [x, y + 1, h]], c(0), o);
}

// groups : rayons à visiter, dans l'ordre du circuit
function mapSvg(groups) {
  const { cols, rows, cells, entry } = M();
  const todo = new Set(groups.filter(g => g.items.some(i => !i.done)).map(g => g.aisle.id));
  const visit = new Set(groups.map(g => g.aisle.id));
  const hue = id => Math.round(S.aisles.findIndex(a => a.id === id) * 360 / S.aisles.length);
  // Peintre : du fond (x + y petit) vers l'avant
  const blocks = Object.entries(cells).map(([c, id]) => [cell(c), id])
    .sort(([a], [b]) => a[0] + a[1] - b[0] - b[1] || a[0] - b[0])
    .map(([[x, y], id]) => todo.has(id) ? block(x, y, .7, 60, hue(id))
      : visit.has(id) ? block(x, y, .7, 70, null, .55)
      : block(x, y, .35, 78, null)).join('');
  const floor = poly([[0, 0], [cols, 0], [cols, rows], [0, rows]], 'var(--card)', 'stroke="var(--line)" stroke-width=".04"');
  let door = '';
  if (entry) {
    const [x, y] = cell(entry);
    const [dx, dy] = iso(x + .5, y + .5);
    door = poly([[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]], 'var(--accent)', 'opacity=".35"')
      + `<text x="${dx}" y="${dy + .15}" font-size=".5" text-anchor="middle">🚪</text>`;
  }
  const stops = groups.map((g, k) => ({ k, c: centroid(g.aisle.id), todo: todo.has(g.aisle.id), id: g.aisle.id })).filter(s => s.c);
  const path = [entryPoint(), ...stops.filter(s => s.todo).map(s => s.c), entryPoint()].filter(Boolean).map(c => iso(...c).join(',')).join(' ');
  const pins = stops.map(s => {
    const [px, py] = iso(...s.c, 1.3), [bx, by] = iso(...s.c, .7);
    const op = s.todo ? 1 : .35;
    return `<g opacity="${op}">
      <line x1="${bx}" y1="${by}" x2="${px}" y2="${py}" stroke="var(--fg)" stroke-width=".03"/>
      <circle cx="${px}" cy="${py}" r=".32" fill="${s.todo ? aisleColor(s.id) : 'var(--muted)'}" stroke="var(--bg)" stroke-width=".06"/>
      <text x="${px}" y="${py + .13}" font-size=".36" font-weight="700" text-anchor="middle" fill="#fff">${s.k + 1}</text>
    </g>`;
  }).join('');
  const pad = .5;
  return `
    <svg class="map" viewBox="${-rows - pad} ${-1.7 - pad} ${cols + rows + 2 * pad} ${(cols + rows) / 2 + 1.7 + 2 * pad}">
      ${floor}${door}
      <polyline points="${path}" fill="none" stroke="var(--accent)" stroke-width=".1" stroke-dasharray=".25 .15" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>
      ${blocks}${pins}
    </svg>`;
}

// ---------- Vues ----------

const euro = v => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const doneLast = items => [...items.filter(i => !i.done), ...items.filter(i => i.done)];

const thumb = (i, add) => i.photo
  ? `<img class="thumb" src="${i.photo}" alt="" data-a="viewPhoto" data-id="${i.id}">`
  : add ? `<button class="ghost" data-a="photo" data-id="${i.id}" title="Photo">📷</button>` : '';

const views = {
  prep() {
    const count = S.items.filter(i => i.need).length;
    const sug = suggestions();
    return `
      <p class="hint">Touchez un article pour l'ajouter ou le retirer de la liste.</p>
      ${sug.length ? `
        <section class="sug">
          <h3>Suggestions <button class="ghost" data-a="addSug">Tout ajouter</button></h3>
          ${sug.map(({ i, r }) => `
            <div class="row" data-a="toggleNeed" data-id="${i.id}">
              <span class="box"></span>
              <span class="name">${esc(i.name)} <small>${rhythmLabel(r)}</small></span>
            </div>`).join('')}
        </section>` : ''}
      <div class="bar">
        <button data-a="allFreq">Tout cocher</button>
        <button data-a="noneNeed">Tout décocher</button>
        <span class="count">${count} à acheter</span>
      </div>
      <form id="add" class="add">
        <input name="name" placeholder="Nouvel article" autocomplete="off" required>
        <select name="aisle">${aisleOptions(fallbackAisle())}</select>
        <label class="small"><input type="checkbox" name="freq" checked> fréquent</label>
        <button>Ajouter</button>
      </form>
      ${[...byAisle(i => i.freq || i.need), ...byAisle(i => i.freq || i.need, S.shops)].map(g => `
        <section>
          <h3>${esc(g.aisle.name)}${S.shops.includes(g.aisle) ? ' <small>commerce</small>' : ''}</h3>
          ${g.items.map(i => `
            <div class="row ${i.need ? 'on' : ''}" data-a="toggleNeed" data-id="${i.id}">
              <span class="box"></span>
              <span class="name">${esc(i.name)}${i.freq ? '' : ' <small>ponctuel</small>'}</span>
              ${thumb(i, true)}
              <button class="ghost" data-a="delItem" data-id="${i.id}" title="Supprimer">×</button>
            </div>`).join('')}
        </section>`).join('')}`;
  },

  shop() {
    const need = S.items.filter(i => i.need);
    const done = need.filter(i => i.done).length;
    if (!need.length) return `<p class="empty">Liste vide. Passez par « Préparer ».</p>`;
    const shops = byAisle(i => i.need, S.shops);
    if (place && !shops.some(g => g.aisle.id === place)) place = '';
    const superCount = need.filter(i => !shopOf(i) && !i.done).length;
    const places = shops.length ? `
      <div class="seg places">
        <button data-a="setPlace" data-v="" class="${place ? '' : 'active'}">🛒 ${esc(store()?.name || 'Supermarché')} <small>${superCount}</small></button>
        ${shops.map(g => `<button data-a="setPlace" data-v="${g.aisle.id}" class="${place === g.aisle.id ? 'active' : ''}">${esc(g.aisle.name)} <small>${g.items.filter(i => !i.done).length}</small></button>`).join('')}
      </div>` : '';
    if (place) {
      const g = shops.find(g => g.aisle.id === place), d = g.items.filter(i => i.done).length;
      return `
        <div class="progress"><div style="width:${100 * d / g.items.length}%"></div></div>
        <p class="count">${d} / ${g.items.length} · total ${done} / ${need.length}</p>
        ${places}
        ${doneLast(g.items).map(i => `
          <div class="row big ${i.done ? 'done' : ''}" data-a="toggleDone" data-id="${i.id}">
            <span class="box"></span><span class="name">${esc(i.name)}</span>${thumb(i)}
          </div>`).join('')}
        <button class="primary" data-a="finish">Valider les courses</button>`;
    }
    let groups = byAisle(i => i.need);
    const order = route(groups.map(g => g.aisle.id));
    groups.sort((a, b) => order.indexOf(a.aisle.id) - order.indexOf(b.aisle.id));
    const mapped = groups.some(g => centroid(g.aisle.id));
    const duo = who && mapped && M().auto && groups.length > 1;
    if (duo) {
      const mine = splitRoute(groups)[who - 1];
      groups = mine.map(id => groups.find(g => g.aisle.id === id));
    }
    const mineItems = groups.flatMap(g => g.items), mineDone = mineItems.filter(i => i.done).length;
    return `
      ${storePicker()}
      <div class="progress"><div style="width:${100 * mineDone / (mineItems.length || 1)}%"></div></div>
      <p class="count">${duo ? `Mon circuit : ${mineDone} / ${mineItems.length} · total ${done} / ${need.length}` : `${done} / ${need.length} dans le panier`}</p>
      ${places}
      ${groups.length ? '' : '<p class="empty">Rien à prendre au supermarché.</p>'}
      ${mapped ? `
        <div class="seg">
          <button data-a="setAuto" data-v="1" class="${M().auto ? 'active' : ''}">Circuit optimisé</button>
          <button data-a="setAuto" data-v="" class="${M().auto ? '' : 'active'}">Ordre des rayons</button>
        </div>
        ${M().auto ? `
        <div class="seg">
          <button data-a="setWho" data-v="0" class="${who ? '' : 'active'}">Seul</button>
          <button data-a="setWho" data-v="1" class="${who === 1 ? 'active' : ''}">Circuit 1</button>
          <button data-a="setWho" data-v="2" class="${who === 2 ? 'active' : ''}">Circuit 2</button>
        </div>` : ''}
        ${mapSvg(groups)}` : ''}
      ${groups.map((g, k) => `
        <section>
          <h3><span class="num" style="background:${aisleColor(g.aisle.id)}">${k + 1}</span>${esc(g.aisle.name)}</h3>
          ${doneLast(g.items).map(i => `
            <div class="row big ${i.done ? 'done' : ''}" data-a="toggleDone" data-id="${i.id}">
              <span class="box"></span><span class="name">${esc(i.name)}</span>${thumb(i)}
            </div>`).join('')}
        </section>`).join('')}
      <button class="primary" data-a="finish">Valider les courses</button>`;
  },

  simple() {
    const need = S.items.filter(i => i.need);
    return `
      ${need.length ? need.map(i => `
        <div class="row ${i.done ? 'done' : ''}" data-a="toggleDone" data-id="${i.id}">
          <span class="box"></span><span class="name">${esc(i.name)}${shopOf(i) ? ` <small>${esc(shopOf(i).name)}</small>` : ''}</span>
          <button class="ghost" data-a="unneed" data-id="${i.id}" title="Retirer">×</button>
        </div>`).join('') : '<p class="empty">Rien pour l\'instant.</p>'}`;
  },

  recipes() {
    const rs = [...S.recipes].sort((a, b) => a.name.localeCompare(b.name));
    return `
      <form id="newRecipe" class="add">
        <input name="name" placeholder="Nouvelle recette" autocomplete="off" required>
        <button>Créer</button>
      </form>
      ${rs.map(recipeCard).join('') || '<p class="empty">Aucune recette pour l\'instant.</p>'}
      ${tab === 'recipes' ? `<datalist id="catalog">${S.items.map(i => `<option value="${esc(i.name)}">`).join('')}</datalist>` : ''}`;
  },

  budget() {
    const now = new Date(), y = now.getFullYear(), m = now.getMonth();
    const start = new Date(y, m, 1).getTime(), prevStart = new Date(y, m - 1, 1).getTime();
    const days = new Date(y, m + 1, 0).getDate(), day = now.getDate();
    const paid = S.trips.filter(t => t.total != null);
    const sum = ts => ts.reduce((a, t) => a + t.total, 0);
    const month = paid.filter(t => t.date >= start), prev = paid.filter(t => t.date >= prevStart && t.date < start);
    const recent = paid.filter(t => t.date >= Date.now() - 90 * DAY);
    const avg = recent.length ? sum(recent) / recent.length : null;
    // Dépense moyenne par jour sur 90 jours (au moins 30 j d'historique supposés pour ne pas extrapoler une seule course)
    const span = recent.length ? Math.max(30, (Date.now() - Math.min(...recent.map(t => t.date))) / DAY) : 0;
    const perDay = recent.length ? sum(recent) / span : null;
    const projection = perDay == null ? null : sum(month) + perDay * (days - day);
    const budget = S.settings.budget;
    const byPlace = Object.entries(month.reduce((o, t) => ({ ...o, [t.place]: (o[t.place] || 0) + t.total }), {})).sort((a, b) => b[1] - a[1]);
    const tile = (label, v, sub = '') => `<div class="tile"><small>${label}</small><strong>${v == null ? '—' : euro(v)}</strong><small>${sub}</small></div>`;
    return `
      <div class="tiles">
        ${tile('Ce mois', sum(month), `${month.length} passage${month.length > 1 ? 's' : ''}`)}
        ${tile('Fin de mois (estim.)', projection, 'au rythme des 3 derniers mois')}
        ${tile('Panier moyen', avg, '3 derniers mois')}
        ${tile('Mois dernier', prev.length ? sum(prev) : null)}
      </div>
      <form id="budgetForm" class="add">
        <label class="small grow">Budget mensuel (€)</label>
        <input name="name" inputmode="decimal" value="${budget ?? ''}" placeholder="ex. 600" style="flex:0 0 110px">
        <button>OK</button>
      </form>
      ${budget ? `
        <div class="progress ${sum(month) > budget ? 'over' : ''}"><div style="width:${Math.min(100, 100 * sum(month) / budget)}%"></div></div>
        <p class="count">${sum(month) > budget ? `Dépassé de ${euro(sum(month) - budget)}` : `Reste ${euro(budget - sum(month))} pour ${days - day + 1} jour${days - day ? 's' : ''}`}${projection != null && projection > budget ? ' · attention, l\'estimation dépasse le budget' : ''}</p>` : ''}
      ${byPlace.length > 1 ? `<h3>Ce mois par magasin</h3>${byPlace.map(([p, v]) => `<div class="row static"><span class="name">${esc(p)}</span><span>${euro(v)}</span></div>`).join('')}` : ''}
      <h3>Passages en caisse</h3>
      ${S.trips.slice(-20).reverse().map(t => `
        <div class="row static">
          <span class="name">${new Date(t.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${esc(t.place)} <small>${t.n} art.</small></span>
          <button class="ghost" data-a="editTrip" data-id="${t.id}">${t.total == null ? 'Ajouter €' : euro(t.total)}</button>
          <button class="ghost" data-a="delTrip" data-id="${t.id}">×</button>
        </div>`).join('') || '<p class="hint">Le montant est demandé quand vous validez des courses.</p>'}`;
  },

  aisles() {
    const st = store(), list = orderedAisles();
    return `
      <h3>Magasin</h3>
      ${storePicker(true)}
      <h3>Rayons</h3>
      <p class="hint">${st ? `Ordre des rayons chez ${esc(st.name)}${M().auto && Object.keys(M().cells).length ? ' (le plan prime pour les rayons placés)' : ''}.` : 'Ordre générique, utilisé dans les magasins non cartographiés.'}</p>
      ${list.map((a, k) => `
        <div class="row static">
          <span class="dot" style="background:${aisleColor(a.id)}"></span>
          <span class="name">${esc(a.name)} <small>${S.items.filter(i => i.aisle === a.id).length}</small></span>
          <button class="ghost" data-a="move" data-id="${a.id}" data-d="-1" ${k ? '' : 'disabled'}>↑</button>
          <button class="ghost" data-a="move" data-id="${a.id}" data-d="1" ${k < list.length - 1 ? '' : 'disabled'}>↓</button>
          <button class="ghost" data-a="rename" data-id="${a.id}">✎</button>
          <button class="ghost" data-a="delAisle" data-id="${a.id}">×</button>
        </div>`).join('')}
      <form id="addAisle" class="add">
        <input name="name" placeholder="Nouveau rayon" required>
        <button>Ajouter</button>
      </form>
      <h3>Commerces</h3>
      <p class="hint">Boulangerie, boucher, marché… : leurs articles ont leur propre liste en courses.</p>
      ${S.shops.map(sh => `
        <div class="row static">
          <span class="name">${esc(sh.name)} <small>${S.items.filter(i => i.aisle === sh.id).length}</small></span>
          <button class="ghost" data-a="renameShop" data-id="${sh.id}">✎</button>
          <button class="ghost" data-a="delShop" data-id="${sh.id}">×</button>
        </div>`).join('')}
      <form id="addShop" class="add">
        <input name="name" placeholder="Nouveau commerce (ex. 🐟 Poissonnier)" required>
        <button>Ajouter</button>
      </form>
      <h3>Plan du magasin</h3>
      ${st ? `
      <p class="hint">Plan de ${esc(st.name)}. Choisissez un rayon, puis touchez les cases où il se trouve. Approximatif suffit.</p>
      <div class="bar">
        <select id="brush">
          <option value="entry"${brush === 'entry' ? ' selected' : ''}>🚪 Entrée</option>
          ${S.aisles.map(a => `<option value="${a.id}"${a.id === brush ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}
          <option value=""${brush === '' ? ' selected' : ''}>Gomme</option>
        </select>
        <span class="small">Largeur</span>
        <button class="ghost" data-a="size" data-dim="cols" data-d="-1">−</button>${st.map.cols}<button class="ghost" data-a="size" data-dim="cols" data-d="1">+</button>
        <span class="small">Hauteur</span>
        <button class="ghost" data-a="size" data-dim="rows" data-d="-1">−</button>${st.map.rows}<button class="ghost" data-a="size" data-dim="rows" data-d="1">+</button>
      </div>
      <div class="grid" style="grid-template-columns:repeat(${st.map.cols},1fr)">
        ${Array.from({ length: st.map.rows * st.map.cols }, (_, n) => {
          const c = `${n % st.map.cols},${Math.floor(n / st.map.cols)}`, id = st.map.cells[c];
          const k = S.aisles.findIndex(a => a.id === id);
          return `<div class="cell" data-a="paint" data-c="${c}"${id ? ` style="background:${aisleColor(id)}"` : ''}>${st.map.entry === c ? '🚪' : k >= 0 ? k + 1 : ''}</div>`;
        }).join('')}
      </div>
      <label class="small"><input type="checkbox" id="auto"${st.map.auto ? ' checked' : ''}> Calculer le circuit le plus court à partir du plan (entrée → rayons → caisses)</label>`
      : '<p class="hint">Magasin non cartographié : choisissez ou créez un magasin pour dessiner son plan.</p>'}
      <h3>Partage</h3>
      ${Sync.config() ? `
        <p class="hint">Liste partagée. Les modifications faites sans réseau partent dès qu'il revient.</p>
        <div class="bar">
          <button data-a="invite">Copier le lien d'invitation</button>
          <button data-a="syncNow">Synchroniser</button>
          <button data-a="leave">Quitter</button>
        </div>` : `
        <p class="hint">Pour partager, créez une base Supabase (voir README) puis collez ses accès. Les autres rejoignent via le lien d'invitation.</p>
        <form id="share" class="add">
          <input name="url" placeholder="https://xxxx.supabase.co" value="https://lxvtsxjsjyeyppybfrqx.supabase.co" required>
          <input name="key" placeholder="Clé publique (publishable)" value="sb_publishable_CO8IqARcVoq2SiSa6Sk0Dw_LCfx_SkH" required>
          <button>Créer la liste partagée</button>
        </form>`}
      <h3>Données</h3>
      <div class="bar">
        <button data-a="export">Exporter</button>
        <label class="btn">Importer<input type="file" accept="application/json" id="import" hidden></label>
        <button data-a="reset">Réinitialiser</button>
      </div>`;
  },
};

// Où suis-je ? Chaque supermarché a son ordre de rayons et son plan ; « autre magasin » = ordre générique
const storePicker = manage => `
  <div class="bar">
    <select id="store" class="grow">
      ${S.stores.map(s => `<option value="${s.id}"${s === store() ? ' selected' : ''}>📍 ${esc(s.name)}</option>`).join('')}
      <option value="none"${store() ? '' : ' selected'}>📍 Autre magasin (non cartographié)</option>
    </select>
    ${manage ? `
      <button class="ghost" data-a="newStore" title="Nouveau magasin">＋</button>
      ${store() ? `<button class="ghost" data-a="renameStore" title="Renommer">✎</button>
      <button class="ghost" data-a="delStore" title="Supprimer">×</button>` : ''}` : ''}
  </div>`;

// Ajout rapide en bas d'écran : reconnaît les articles connus (et leur rayon), sinon Divers
const quickBar = () => `
  <form id="quick" class="quickbar">
    <input name="name" list="catalog" placeholder="J'ajoute à la liste…" autocomplete="off" required>
    <button aria-label="Ajouter">+</button>
  </form>
  <datalist id="catalog">${S.items.map(i => `<option value="${esc(i.name)}">`).join('')}</datalist>`;

function render() {
  if (!S.aisles.length) {
    app.innerHTML = `<p class="empty">${tab === 'aisles' ? '' : 'En attente de la première synchronisation…'}</p>${tab === 'aisles' ? views.aisles() : ''}`;
    return;
  }
  if (brush === null || (brush && brush !== 'entry' && !S.aisles.some(a => a.id === brush))) brush = S.aisles[0].id;
  app.innerHTML = views[tab]() + (['prep', 'shop', 'simple'].includes(tab) ? quickBar() : '');
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
}

function recipeCard(r) {
  const its = r.items.map(item).filter(Boolean);
  if (recipeEdit === r.id) return `
    <section class="card">
      <div class="bar">
        <input id="rname" data-id="${r.id}" value="${esc(r.name)}" class="grow">
        <button data-a="closeRecipe">OK</button>
      </div>
      ${its.map(i => `
        <div class="row static">
          <span class="name">${esc(i.name)}</span>
          <select data-item-aisle="${i.id}">${aisleOptions(i.aisle)}</select>
          <button class="ghost" data-a="unlink" data-id="${r.id}" data-item="${i.id}">×</button>
        </div>`).join('')}
      <form id="link" data-id="${r.id}" class="add">
        <input name="name" list="catalog" placeholder="Lier un article" autocomplete="off" required>
        <button>+</button>
      </form>
      <button class="ghost" data-a="delRecipe" data-id="${r.id}">Supprimer la recette</button>
    </section>`;
  if (recipeAdd === r.id) {
    const n = its.filter(i => !recipeSkip.has(i.id)).length;
    return `
      <section class="card">
        <strong>${esc(r.name)}</strong>
        <p class="hint">Décochez ce que vous avez déjà à la maison.</p>
        ${its.map(i => `
          <div class="row ${recipeSkip.has(i.id) ? '' : 'on'}" data-a="toggleSkip" data-id="${i.id}">
            <span class="box"></span>
            <span class="name">${esc(i.name)}${i.need ? ' <small>déjà sur la liste</small>' : ''}</span>
          </div>`).join('')}
        <div class="bar">
          <button class="accent" data-a="confirmRecipe" data-id="${r.id}" ${n ? '' : 'disabled'}>Ajouter ${n} article${n > 1 ? 's' : ''}</button>
          <button data-a="cancelRecipe">Annuler</button>
        </div>
      </section>`;
  }
  return `
    <section class="card">
      <div class="bar">
        <strong class="grow">${esc(r.name)}</strong>
        <button data-a="startRecipe" data-id="${r.id}" ${its.length ? '' : 'disabled'}>Ajouter à la liste</button>
        <button class="ghost" data-a="editRecipe" data-id="${r.id}" title="Modifier">✎</button>
      </div>
      <p class="small">${its.map(i => esc(i.name)).join(' · ') || 'Aucun article lié'}</p>
    </section>`;
}

// ---------- Actions ----------

const item = id => S.items.find(i => i.id === id);
const parseEuro = raw => { const v = parseFloat(String(raw).replace(',', '.').replace(/[^\d.]/g, '')); return isNaN(v) ? null : Math.round(v * 100) / 100; };
function setStore(id) { storeId = id; try { localStorage.setItem('courses.store', id); } catch {} }

const recipe = id => S.recipes.find(r => r.id === id);

const actions = {
  startRecipe: ({ id }) => { recipeAdd = id; recipeEdit = null; recipeSkip = new Set(); },
  toggleSkip: ({ id }) => { recipeSkip.has(id) ? recipeSkip.delete(id) : recipeSkip.add(id); },
  confirmRecipe: ({ id }) => {
    recipe(id).items.map(item).filter(i => i && !recipeSkip.has(i.id)).forEach(i => { i.need = true; i.done = false; });
    recipeAdd = null;
  },
  cancelRecipe: () => { recipeAdd = null; },
  editRecipe: ({ id }) => { recipeEdit = id; recipeAdd = null; },
  closeRecipe: () => { recipeEdit = null; },
  unlink: ({ id, item: itemId }) => { const r = recipe(id); r.items = r.items.filter(x => x !== itemId); },
  delRecipe: ({ id }) => { if (confirm('Supprimer cette recette ?')) { S.recipes = S.recipes.filter(r => r.id !== id); recipeEdit = null; } },
  toggleNeed: ({ id }) => { const i = item(id); i.need = !i.need; i.done = false; },
  toggleDone: ({ id }) => { const i = item(id); i.done = !i.done; },
  unneed: ({ id }) => { const i = item(id); i.need = false; i.done = false; },
  delItem: ({ id }) => { S.items = S.items.filter(i => i.id !== id); },
  allFreq: () => S.items.forEach(i => { if (i.freq) i.need = true; }),
  noneNeed: () => S.items.forEach(i => { i.need = false; i.done = false; }),
  addSug: () => suggestions().forEach(({ i }) => { i.need = true; }),
  // Valide la liste : les articles pris alimentent l'historique d'achat
  // Valide la liste : les articles pris alimentent l'historique d'achat, le montant du ticket le budget
  finish: () => {
    const taken = S.items.filter(i => i.done);
    if (!taken.length) return alert('Aucun article coché.');
    const raw = prompt(`Valider ${taken.length} article${taken.length > 1 ? 's' : ''} ? Ils sortent de la liste.\n\nMontant du ticket en € (facultatif) :`, '');
    if (raw === null) return;
    const now = Date.now();
    taken.forEach(i => {
      i.bought = [...(i.bought || []), now].slice(-HISTORY);
      i.need = false;
      i.done = false;
    });
    const where = place ? S.shops.find(s => s.id === place)?.name : store()?.name;
    S.trips.push({ id: uid(), date: now, total: parseEuro(raw), place: where || 'Autre magasin', n: taken.length });
  },
  editTrip: ({ id }) => {
    const t = S.trips.find(x => x.id === id), raw = prompt('Montant du ticket en €', t.total ?? '');
    if (raw !== null) t.total = parseEuro(raw);
  },
  delTrip: ({ id }) => { if (confirm('Supprimer ce passage en caisse ?')) S.trips = S.trips.filter(t => t.id !== id); },
  // Déplace un rayon dans l'ordre du magasin courant (ou l'ordre générique)
  move: ({ id, d }) => {
    const list = orderedAisles().map(a => a.id), k = list.indexOf(id), j = k + +d;
    [list[k], list[j]] = [list[j], list[k]];
    if (store()) store().order = list;
    else S.aisles = list.map(x => S.aisles.find(a => a.id === x));
  },
  rename: ({ id }) => { const a = S.aisles.find(x => x.id === id), n = prompt('Nom du rayon', a.name); if (n?.trim()) a.name = n.trim(); },
  delAisle: ({ id }) => {
    if (S.aisles.length < 2 || !confirm('Supprimer ce rayon ? Ses articles passent dans Divers.')) return;
    S.aisles = S.aisles.filter(a => a.id !== id);
    for (const st of S.stores) {
      for (const c in st.map.cells) if (st.map.cells[c] === id) delete st.map.cells[c];
      if (st.order) st.order = st.order.filter(x => x !== id);
    }
    const target = fallbackAisle();
    S.items.forEach(i => { if (i.aisle === id) i.aisle = target; });
  },
  newStore: () => {
    const n = prompt('Nom du magasin (ex. Carrefour Market vacances)');
    if (!n?.trim()) return;
    const st = newStore(n.trim(), uid());
    st.order = orderedAisles().map(a => a.id);
    S.stores.push(st);
    setStore(st.id);
  },
  renameStore: () => { const st = store(), n = prompt('Nom du magasin', st.name); if (n?.trim()) st.name = n.trim(); },
  delStore: () => {
    if (!confirm(`Supprimer ${store().name} et son plan ?`)) return;
    S.stores = S.stores.filter(s => s !== store());
    setStore(S.stores[0]?.id || 'none');
  },
  setAuto: ({ v }) => { if (store()) store().map.auto = !!v; },
  setPlace: ({ v }) => { place = v; },
  renameShop: ({ id }) => { const sh = S.shops.find(x => x.id === id), n = prompt('Nom du commerce', sh.name); if (n?.trim()) sh.name = n.trim(); },
  delShop: ({ id }) => {
    if (!confirm('Supprimer ce commerce ? Ses articles passent au supermarché.')) return;
    S.shops = S.shops.filter(x => x.id !== id);
    S.items.forEach(i => { if (i.aisle === id) i.aisle = fallbackAisle(); });
  },
  setWho: ({ v }) => { who = +v; try { localStorage.setItem('courses.who', v); } catch {} },
  paint: ({ c }) => {
    const m = store().map;
    if (brush === 'entry') m.entry = m.entry === c ? null : c;
    else if (!brush || m.cells[c] === brush) delete m.cells[c];
    else m.cells[c] = brush;
  },
  size: ({ dim, d }) => {
    const m = store().map;
    m[dim] = Math.min(20, Math.max(2, m[dim] + +d));
    const out = c => { const [x, y] = cell(c); return x >= m.cols || y >= m.rows; };
    for (const c in m.cells) if (out(c)) delete m.cells[c];
    if (m.entry && out(m.entry)) m.entry = null;
  },
  invite: () => {
    const link = Sync.inviteLink();
    navigator.clipboard?.writeText(link).then(() => alert('Lien copié'), () => prompt('Lien d\'invitation', link))
      ?? prompt('Lien d\'invitation', link);
  },
  syncNow: () => Sync.run(),
  leave: () => { if (confirm('Quitter le partage ? La liste reste sur ce téléphone.')) Sync.leave(); },
  photo: ({ id }) => { photoFor = id; document.getElementById('photo').click(); },
  viewPhoto: ({ id }) => {
    const i = item(id);
    document.body.insertAdjacentHTML('beforeend', `
      <div class="overlay" data-a="closePhoto">
        <img src="${i.photo}" alt="">
        <p>${esc(i.name)}</p>
        <div class="bar"><button data-a="photo" data-id="${id}">Changer</button><button data-a="delPhoto" data-id="${id}">Supprimer</button></div>
      </div>`);
  },
  closePhoto: () => document.querySelector('.overlay')?.remove(),
  delPhoto: ({ id }) => { delete item(id).photo; actions.closePhoto(); },
  export: () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }));
    Object.assign(document.createElement('a'), { href: url, download: 'courses.json' }).click();
    URL.revokeObjectURL(url);
  },
  reset: () => {
    if (!confirm('Tout effacer et revenir aux basiques ?')) return;
    S = seed();
    setStore('store-main');
  },
};

document.addEventListener('click', e => {
  const tabBtn = e.target.closest('[data-tab]');
  if (tabBtn) { tab = tabBtn.dataset.tab; return render(); }
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  actions[el.dataset.a](el.dataset);
  save();
  render();
});

document.addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const name = f.get('name');
  if (e.target.id === 'add') addItem(name, f.get('aisle'), f.get('freq') === 'on');
  if (e.target.id === 'quick') addItem(name, null, false);
  if (e.target.id === 'addAisle' && name.trim()) S.aisles.push({ id: uid(), name: name.trim() });
  if (e.target.id === 'addShop' && name.trim()) S.shops.push({ id: uid(), name: name.trim() });
  if (e.target.id === 'newRecipe' && name.trim()) {
    const r = { id: uid(), name: name.trim(), items: [] };
    S.recipes.push(r);
    recipeEdit = r.id;
  }
  if (e.target.id === 'link') {
    const r = recipe(e.target.dataset.id), n = name.trim();
    let i = S.items.find(x => x.name.toLowerCase() === n.toLowerCase());
    if (!i && n) S.items.push(i = { id: uid(), name: n, aisle: fallbackAisle(), freq: false, need: false, done: false });
    if (i && !r.items.includes(i.id)) r.items.push(i.id);
  }
  if (e.target.id === 'budgetForm') S.settings.budget = parseEuro(name);
  if (e.target.id === 'share') Sync.create(f.get('url').trim().replace(/\/+$/, ''), f.get('key').trim());
  save();
  render();
  app.querySelector(`#${e.target.id} input`)?.focus();
});

document.addEventListener('change', async e => {
  if (e.target.id === 'brush') { brush = e.target.value; return; }
  if (e.target.id === 'rname') { const r = recipe(e.target.dataset.id); if (e.target.value.trim()) r.name = e.target.value.trim(); return save(); }
  if (e.target.dataset.itemAisle) { item(e.target.dataset.itemAisle).aisle = e.target.value; return save(); }
  if (e.target.id === 'photo') {
    const file = e.target.files[0], i = item(photoFor);
    e.target.value = '';
    if (!file || !i) return;
    i.photo = await shrink(file, 360);
    actions.closePhoto();
    save();
    return render();
  }
  if (e.target.id === 'auto') { store().map.auto = e.target.checked; save(); return render(); }
  if (e.target.id === 'store') { setStore(e.target.value); return render(); }
  if (e.target.id !== 'import' || !e.target.files[0]) return;
  try {
    const data = JSON.parse(await e.target.files[0].text());
    if (!Array.isArray(data.aisles) || !Array.isArray(data.items)) throw 0;
    S = upgrade(data);
    save(); render();
  } catch { alert('Fichier invalide'); }
});

// Photo réduite en JPEG (~20 Ko) : stockée avec l'article et synchronisée
async function shrink(file, max) {
  const img = new Image();
  img.src = URL.createObjectURL(file);
  await img.decode();
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(img.naturalWidth * k), height: Math.round(img.naturalHeight * k) });
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(img.src);
  return c.toDataURL('image/jpeg', .7);
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
