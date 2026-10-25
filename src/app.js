// Courses — données locales d'abord (fonctionne sans réseau), synchro dans sync.js.

const KEY = K('courses.v1'); // une clé par liste (src/lists.js)
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
const defaultShops = () => [['boulangerie', '🥖 Boulanger'], ['boucherie', '🥩 Boucher'], ['fromager', '🧀 Fromager'], ['caviste', '🍷 Caviste'], ['marché', '🧺 Marché']]
  .map(([id, name]) => ({ id: 'shop-' + id, name }));

function seed() {
  const aisles = [], items = [];
  for (const [name, list] of Object.entries(DEFAULTS)) {
    const aisle = { id: uid(), name };
    aisles.push(aisle);
    for (const n of list) items.push({ id: uid(), name: n, aisle: aisle.id, freq: true, need: false, done: false });
  }
  return { aisles, items, recipes: [], shops: defaultShops(), stores: [newStore()], trips: [], settings: {}, aliases: {}, plan: {} };
}
// Plan d'un magasin : quadrillage approximatif, case "x,y" -> rayon
const newMap = () => ({ cols: 6, rows: 8, cells: {}, entry: null, auto: true });
// Supermarché : son propre ordre de rayons (null = ordre générique) et son plan
const newStore = (name = 'Mon supermarché', id = 'store-main') => ({ id, name, order: null, map: newMap() });
const NO_MAP = { cols: 6, rows: 8, cells: {}, entry: null, auto: false };

// Complète un état ancien ou importé
// Données venues d'ailleurs (synchro, import) : on ne garde que des formes attendues,
// pour qu'un enregistrement malformé ne puisse rien injecter dans la page
const ID = /^[\w-]{1,40}$/, PHOTO = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, CELL = /^\d{1,2},\d{1,2}$/;
const num0 = v => Number.isFinite(+v) ? +v : 0;
function clean(st) {
  const ok = x => x && typeof x === 'object' && ID.test(x.id) && typeof x.name === 'string';
  st.items = st.items.filter(ok);
  for (const i of st.items) {
    if (i.photo && !PHOTO.test(i.photo)) delete i.photo;
    if (!ID.test(i.aisle)) i.aisle = '';
    i.bought = Array.isArray(i.bought) ? i.bought.map(num0) : undefined;
    i.prices = Array.isArray(i.prices) ? i.prices.filter(p => p && typeof p === 'object').map(p => ({ d: num0(p.d), p: num0(p.p), at: String(p.at || '') })) : undefined;
    if (i.note != null) i.note = String(i.note);
    if (i.by != null) i.by = String(i.by);
    if (i.alt != null) i.alt = String(i.alt);
    if (i.lastBy != null) i.lastBy = String(i.lastBy);
    if (i.missing) i.missing = { by: String(i.missing.by || ''), at: num0(i.missing.at) };
  }
  st.aisles = st.aisles.filter(ok);
  st.shops = st.shops.filter(ok);
  const fb = (st.aisles.find(a => a.name === 'Divers') || st.aisles.at(-1))?.id;
  if (fb) st.items.forEach(i => { if (!i.aisle) i.aisle = fb; });
  st.recipes = st.recipes.filter(ok).map(r => ({ ...r, items: (Array.isArray(r.items) ? r.items : []).filter(x => ID.test(x)) }));
  st.stores = st.stores.filter(ok);
  for (const s of st.stores) {
    s.order = Array.isArray(s.order) ? s.order.filter(x => ID.test(x)) : null;
    const m = s.map && typeof s.map === 'object' ? s.map : newMap();
    s.map = { cols: Math.min(20, Math.max(2, num0(m.cols) || 6)), rows: Math.min(20, Math.max(2, num0(m.rows) || 8)), auto: m.auto !== false,
      entry: CELL.test(m.entry) ? m.entry : null,
      cells: Object.fromEntries(Object.entries(m.cells || {}).filter(([c, a]) => CELL.test(c) && ID.test(a))) };
  }
  const str = v => v == null ? undefined : String(v).slice(0, 60);
  st.trips = st.trips.filter(t => t && ID.test(t.id)).map(t => ({ ...t, date: num0(t.date), n: num0(t.n), total: t.total == null ? null : num0(t.total), place: String(t.place || ''),
    names: Array.isArray(t.names) ? t.names.map(String) : undefined, by: str(t.by), from: str(t.from), to: str(t.to), type: ['settle', 'expense'].includes(t.type) ? t.type : undefined }));
  st.recipes.forEach(r => { r.qty = Object.fromEntries(Object.entries(r.qty && typeof r.qty === 'object' ? r.qty : {}).filter(([k]) => ID.test(k)).map(([k, v]) => [k, String(v).slice(0, 30)])); });
  const old = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
  st.plan = Object.fromEntries(Object.entries(st.plan || {}).filter(([d, ids]) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= old && Array.isArray(ids)).map(([d, ids]) => [d, ids.filter(x => ID.test(x))]));
  if (st.settings.listName != null) st.settings.listName = String(st.settings.listName).slice(0, 40);
  st.aliases = Object.fromEntries(Object.entries(st.aliases || {}).filter(([, v]) => v === 'ignore' || ID.test(v)));
  if (st.settings.budget != null) st.settings.budget = num0(st.settings.budget);
  delete st.settings.shopping;
  // Qui est en courses : un enregistrement par personne (sinon deux « J'y vais » simultanés s'écrasent)
  st.shoppers = Object.fromEntries(Object.entries(st.shoppers || st.settings.shoppers || {}).filter(([n]) => /^[^:]{1,40}$/.test(n)).map(([n, at]) => [n, num0(at)]));
  delete st.settings.shoppers;
  return st;
}

function upgrade(st) {
  st.items ||= [];
  st.aisles ||= [];
  st.recipes ||= [];
  st.shops ||= defaultShops();
  st.trips ||= [];
  st.settings ||= {};
  st.aliases ||= {}; // libellé de ticket normalisé -> id d'article, ou 'ignore'
  st.plan ||= {}; // repas : date -> recettes
  if (!st.stores) { st.stores = [newStore()]; if (st.map) st.stores[0].map = st.map; }
  delete st.map;
  return clean(st);
}

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}
let S = upgrade(load() || seed());
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch { if (typeof toast === 'function') toast('Mémoire du téléphone pleine : supprimez quelques photos d\'articles.', false); }
  if (typeof Sync !== 'undefined') Sync.changed();
}

let tab = 'list';
let settingsBack = 'list'; // où revenir en quittant les réglages
let me = ''; // prénom de la personne sur ce téléphone
try { me = localStorage.getItem('courses.me') || ''; } catch {}
const setMe = v => { me = v.trim(); try { localStorage.setItem('courses.me', me); } catch {} };
const SUPA_URL = 'https://lxvtsxjsjyeyppybfrqx.supabase.co', SUPA_KEY = 'sb_publishable_CO8IqARcVoq2SiSa6Sk0Dw_LCfx_SkH';
let welcomed = false;
try { welcomed = !!localStorage.getItem('courses.welcome'); } catch {}
// Apparence : automatique (réglage du téléphone), clair ou sombre ; propre à chaque appareil
let theme = 'auto';
try { theme = localStorage.getItem('courses.theme') || 'auto'; } catch {}
function applyTheme() {
  if (theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#121413' : '#2f7d4f');
}
applyTheme();
let size = '';
try { size = localStorage.getItem('courses.size') || ''; } catch {}
const applySize = () => { document.documentElement.dataset.size = size; };
applySize();
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
let who = 0; // courses à deux : 0 = seul, 1 ou 2 = mon circuit (propre à cet appareil)
try { who = +localStorage.getItem(K('courses.who')) || 0; } catch {}
let recipeEdit = null, recipeAdd = null, recipeSkip = new Set(); // recette en cours d'édition / d'ajout
let place = ''; // en courses : '' = supermarché, sinon id du commerce
let storeId = null; // supermarché où je suis (propre à cet appareil) ; 'none' = magasin non cartographié
try { storeId = localStorage.getItem(K('courses.store')); } catch {}
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
let brush = null, brushOpen = false; // brushOpen : garder le plan déplié pendant qu'on le dessine // pinceau de l'éditeur de plan : id de rayon, 'entry' ou '' (gomme)
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

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const plain = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae');
const sameKey = s => plain(s).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').map(w => w.length > 3 ? w.replace(/[sx]$/, '') : w).join(' ');
const findItem = name => S.items.find(i => sameKey(i.name) === sameKey(name));

// Rayon deviné pour un nouvel article : d'abord un article proche déjà classé (même premier mot),
// puis des mots-clés courants, sinon Divers
const AISLE_WORDS = {
  'fruits': 'banane pomme poire orange citron fraise raisin kiwi melon peche abricot clementine mangue ananas avocat tomate salade carotte oignon ail echalote pomme de terre patate courgette aubergine poivron concombre champignon poireau brocoli chou epinard haricot vert legume fruit herbe persil basilic radis betterave',
  'boulangerie': 'pain baguette brioche croissant viennoiserie pain de mie biscotte',
  'cremerie': 'lait yaourt yogourt fromage beurre creme oeuf babybel danonino danone petit suisse kiri vache qui rit emmental comte mozzarella feta skyr fromage blanc compote lait',
  'boucherie': 'poulet boeuf veau porc agneau dinde jambon lardon saucisse steak viande hache saumon cabillaud poisson crevette thon frais chorizo merguez escalope filet',
  'epicerie salee': 'pates riz semoule farine huile vinaigre sel poivre epice curry sauce ketchup mayonnaise moutarde conserve thon sardine lentille pois chiche haricot bouillon soupe chips cracker quinoa nouille',
  'epicerie sucree': 'sucre chocolat cereale biscuit gateau confiture miel nutella cafe the tisane cacao bonbon gouter madeleine compote',
  'boissons': 'eau jus soda coca biere vin sirop limonade boisson',
  'surgeles': 'surgele glace frite pizza surgelee poelee',
  'hygiene': 'shampoing gel douche savon dentifrice brosse a dents deodorant papier toilette mouchoir coton couche lingette rasoir creme solaire serviette hygienique tampon',
  'entretien': 'litiere croquette patee lessive adoucissant eponge liquide vaisselle pastille lave vaisselle sac poubelle javel nettoyant essuie tout aluminium film',
};
const AISLE_PHRASES = { 'lait de coco': 'epicerie salee', 'creme solaire': 'hygiene', 'pomme de terre': 'fruits', 'papier toilette': 'hygiene', 'liquide vaisselle': 'entretien', 'creme fraiche': 'cremerie' };
const aisleByKey = key => S.aisles.find(a => plain(a.name).startsWith(key.split(' ')[0]) && (key.split(' ').length < 2 || plain(a.name).includes(key.split(' ')[1])));
function guessAisle(name) {
  const n = plain(name), first = n.split(/\s+/)[0];
  for (const [phrase, key] of Object.entries(AISLE_PHRASES)) if (n.includes(phrase) && aisleByKey(key)) return aisleByKey(key).id;
  const twin = S.items.find(i => plain(i.name).split(/\s+/)[0] === first && !shopOf(i) && i.aisle !== fallbackAisle());
  if (twin) return twin.aisle;
  const words = n.split(/[^a-z]+/).filter(w => w.length > 2);
  for (const [key, list] of Object.entries(AISLE_WORDS)) {
    const known = list.split(' ');
    if (words.some(w => known.includes(w) || known.includes(w.replace(/x$|s$/, ''))) && aisleByKey(key)) return aisleByKey(key).id;
  }
  return fallbackAisle();
}

// Met un article sur la liste, en notant qui l'a ajouté et quand
function want(i) {
  if (i.need) return;
  Object.assign(i, { need: true, done: false, by: me || undefined, at: Date.now() });
  delete i.missing;
}
function addItem(name, aisle, freq) {
  name = name.trim();
  if (!name) return;
  const existing = findItem(name);
  if (existing) return want(existing);
  name = cap(name);
  const i = { id: uid(), name, aisle: aisle || guessAisle(name), freq, need: false, done: false };
  S.items.push(i);
  want(i);
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

const lastPrice = i => i.prices?.length ? i.prices[i.prices.length - 1].p : null;
const euro = v => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const thumb = (i, add) => i.photo
  ? `<img class="thumb" src="${esc(i.photo)}" alt="" data-a="viewPhoto" data-id="${i.id}">`
  : add ? `<button class="ghost" data-a="photo" data-id="${i.id}" title="Photo">📷</button>` : '';

// Qui est en courses en ce moment (« J'y vais », valable 3 h), plusieurs personnes possibles
const shoppers = () => Object.entries(S.shoppers).filter(([, at]) => Date.now() - at < 3 * 36e5);
const myShopping = () => shoppers().find(([n]) => n === (me || '?'))?.[1];
const shoppingBanner = () => {
  const others = shoppers().filter(([n]) => n !== (me || '?'));
  if (!others.length) return '';
  const who = others.map(([n, at]) => { const min = Math.round((Date.now() - at) / 6e4); return `${esc(n === '?' ? 'Quelqu\'un' : n)} (${min < 2 ? 'à l\'instant' : `depuis ${min} min`})`; }).join(', ');
  return `<div class="banner">🛒 En courses : ${who}. Ce que vous ajoutez ${others.length > 1 ? 'leur' : 'lui'} arrive.</div>`;
};
const mine = i => !i.doneBy || i.doneBy === (me || '?');
const othersShopping = () => shoppers().some(([n]) => n !== (me || '?'));
// Ajouté par quelqu'un d'autre depuis le début de mes courses
const isNew = i => { const at = myShopping(); return at && i.at > at && i.by !== me && !i.done; };
const byOf = i => Sync.config() && i.by ? ` <small>· ${esc(i.by)}</small>` : '';
const more = i => `<button class="ghost more" data-a="openItem" data-id="${i.id}" title="Fiche produit">›</button>`;
const noteOf = i => i.note ? ` <small>${esc(i.note)}</small>` : '';
const shortDate = t => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

// Une ligne d'article, la même partout : toucher = dans le caddie (et inversement), › = fiche
const itemRow = i => `
  <div class="row big ${i.done ? 'done' : ''} ${isNew(i) ? 'new' : ''}" data-a="toggleDone" data-id="${i.id}" data-swipe="${i.id}">
    <span class="box"></span>
    <span class="name">${esc(i.name)}${noteOf(i)}${i.done ? (mine(i) ? '' : ` <small>· pris par ${esc(i.doneBy)}</small>`) : byOf(i)}${isNew(i) ? ' <small class="tag">nouveau</small>' : ''}${i.missing && !i.done ? ` <small class="warn">⚠ pas trouvé le ${shortDate(i.missing.at)}</small>` : ''}${i.alt && !i.done ? `<br><small>si absent : ${esc(i.alt)}</small>` : ''}</span>
    ${thumb(i)}${more(i)}
  </div>`;

// Rayons dans l'ordre où on les parcourt : circuit du magasin en courses (et ma moitié si on est deux)
function shoppingGroups() {
  let groups = byAisle(i => i.need);
  const order = route(groups.map(g => g.aisle.id));
  groups.sort((a, b) => order.indexOf(a.aisle.id) - order.indexOf(b.aisle.id));
  const mapped = groups.some(g => centroid(g.aisle.id));
  if (myShopping() && who && groups.length > 1 && (!mapped || M().auto)) {
    let part;
    if (mapped) part = splitRoute(groups)[who - 1];
    else {
      const total = groups.reduce((t, g) => t + g.items.length, 0);
      let acc = 0, cut = 1, best = Infinity;
      groups.forEach((g, k) => { acc += g.items.length; if (k < groups.length - 1 && Math.abs(total / 2 - acc) < best) { best = Math.abs(total / 2 - acc); cut = k + 1; } });
      part = (who === 1 ? groups.slice(0, cut) : groups.slice(cut)).map(g => g.aisle.id);
    }
    groups = part.map(id => groups.find(g => g.aisle.id === id));
  }
  return { groups, mapped };
}

const views = {
  // LA liste : on la remplit à plusieurs, on la suit en magasin. Un seul geste : toucher = dans le caddie.
  list() {
    const need = S.items.filter(i => i.need);
    const shopping = !!myShopping();
    const { groups, mapped } = shoppingGroups();
    const pinnedTop = shopping ? [] : need.filter(i => i.pin && !i.done);
    const sections = [
      ...(pinnedTop.length ? [{ aisle: { name: '⭐ Indispensables' }, items: pinnedTop }] : []),
      ...groups.map((g, k) => ({ ...g, num: shopping && mapped ? k + 1 : 0, items: g.items.filter(i => !i.done && !pinnedTop.includes(i)) })),
      ...byAisle(i => i.need && !i.done, S.shops),
    ].filter(g => g.items.length);
    const cart = need.filter(i => i.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
    const myCart = cart.filter(mine);
    const estimate = need.filter(i => lastPrice(i) != null).reduce((t, i) => t + lastPrice(i), 0);
    const chips = [...new Set([...S.items.filter(i => i.pin && !i.need), ...suggestions().map(x => x.i)])];
    let hint = false;
    try { hint = !localStorage.getItem('courses.hint'); } catch {}
    return `
      ${Sync.config() && !me ? `
        <form id="meForm" class="card invite">
          <strong>Votre prénom ?</strong>
          <p class="hint">Il s'affiche sur vos ajouts, pour que tous sachent qui a demandé quoi.</p>
          <div class="add"><input name="name" placeholder="ex. Inès" autocomplete="given-name" required><button class="accent">OK</button></div>
        </form>` : welcomeInvite()}
      ${shoppingBanner()}
      ${shopping ? `
        <section class="card shopping">
          <div class="bar"><strong class="grow">🛒 En courses</strong><button class="ghost" data-a="stopShopping">Arrêter</button></div>
          ${storePicker()}
          ${need.filter(i => !shopOf(i)).length > 3 ? `
          <div class="seg">
            <button data-a="setWho" data-v="0" class="${who ? '' : 'active'}">Seul</button>
            <button data-a="setWho" data-v="1" class="${who === 1 ? 'active' : ''}">À deux ①</button>
            <button data-a="setWho" data-v="2" class="${who === 2 ? 'active' : ''}">À deux ②</button>
          </div>` : ''}
          ${mapped ? `<details class="adv"><summary>Plan du magasin</summary>
            <div class="seg">
              <button data-a="setAuto" data-v="1" class="${M().auto ? 'active' : ''}">Circuit le plus court</button>
              <button data-a="setAuto" data-v="" class="${M().auto ? '' : 'active'}">Ordre des rayons</button>
            </div>
            ${mapSvg(groups)}</details>` : ''}
        </section>` : ''}
      <form id="quick" class="addtop">
        <input name="name" value="${esc(quickDraft)}" placeholder="Ajouter… (lait, œufs, 2 kg tomates)" autocomplete="off" autocapitalize="sentences" required>
        <button class="accent" aria-label="Ajouter">＋</button>
      </form>
      <div id="suggest" class="chips suggest">${suggestChips()}</div>
      ${hint && need.length ? `<p class="hint tip">Touchez un article quand il est dans le caddie. Glissez-le vers la gauche pour le retirer. <button class="ghost" data-a="hintDone">OK</button></p>` : ''}
      ${chips.length && !shopping ? `
        <div class="chips">
          ${chips.slice(0, 12).map(i => `<button class="chip" data-a="toggleNeed" data-id="${i.id}">${i.pin ? '⭐' : '↻'} ${esc(i.name)}</button>`).join('')}
        </div>` : ''}
      ${sections.map(g => `
        <section>
          <h3>${g.num ? `<span class="num" style="background:${aisleColor(g.aisle.id)}">${g.num}</span>` : ''}${esc(g.aisle.name)}</h3>
          ${g.items.map(itemRow).join('')}
        </section>`).join('')}
      ${!need.length ? `
        <div class="empty-state">
          <p>Rien à acheter pour l'instant.</p>
          <p class="hint">Écrivez ce qu'il manque, touchez une suggestion, ou piochez dans vos basiques.${Sync.config() ? ' Tout le monde voit la même liste.' : ''}</p>
        </div>` : need.every(i => i.done) ? '<p class="hint center">✓ Tout est dans le caddie.</p>' : ''}
      ${cart.length ? `
        <section class="basket">
          <h3>🧺 Dans le caddie · ${cart.length}</h3>
          ${cart.map(itemRow).join('')}
        </section>` : ''}
      <div class="actions">
        ${myCart.length ? `<button class="primary" data-a="finish">✓ Terminer les courses (${myCart.length})</button>`
          : need.length && !shopping ? `<button class="primary" data-a="goShopping">🛒 J'y vais${estimate ? ` <small>≈ ${euro(estimate)}</small>` : ''}</button>` : ''}
        <div class="bar">
          <button class="grow" data-a="go" data-v="catalog">＋ Mes basiques</button>
          ${need.length ? '<button class="grow" data-a="shareList">⤴ Envoyer</button><button class="grow" data-a="clearList">🗑 Vider la liste</button>' : ''}
        </div>
      </div>`;
  },

  // Mes basiques : des pastilles à toucher, ✓ = déjà sur la liste
  catalog() {
    const pins = S.items.filter(i => i.pin);
    const chip = i => `<button class="chip ${i.need ? 'on' : ''}" data-a="${catalogEdit ? 'openItem' : 'toggleNeed'}" data-id="${i.id}">${i.need ? '✓ ' : ''}${esc(i.name)}</button>`;
    return `
      <button class="ghost back" data-a="go" data-v="list">← Liste</button>
      <h2>Mes basiques</h2>
      <p class="hint">${catalogEdit ? 'Touchez un article pour le modifier : rayon, ⭐ indispensable, photo…' : 'Touchez ce qui manque. ✓ = déjà sur la liste.'}</p>
      <div class="bar">
        <button data-a="allFreq">Tout ajouter</button>
        <button data-a="noneNeed">Tout retirer</button>
        <button class="ghost ${catalogEdit ? 'active' : ''}" data-a="catalogEdit">✎ ${catalogEdit ? 'Terminé' : 'Modifier'}</button>
      </div>
      <form id="quick" class="addtop">
        <input name="name" value="${esc(quickDraft)}" placeholder="Nouvel article de base…" autocomplete="off" autocapitalize="sentences" required>
        <button class="accent" aria-label="Ajouter">＋</button>
      </form>
      <div id="suggest" class="chips suggest">${suggestChips()}</div>
      ${pins.length ? `<section class="pins"><h3>⭐ Indispensables</h3><div class="chips">${pins.map(chip).join('')}</div></section>` : ''}
      ${[...byAisle(i => (i.freq || i.need) && !i.pin), ...byAisle(i => (i.freq || i.need) && !i.pin, S.shops)].map(g => `
        <section><h3>${esc(g.aisle.name)}</h3><div class="chips">${g.items.map(chip).join('')}</div></section>`).join('')}`;
  },

  recipes() {
    const rs = [...S.recipes].sort((a, b) => a.name.localeCompare(b.name));
    return `
      <form id="newRecipe" class="add">
        <input name="name" placeholder="Nouvelle recette" autocomplete="off" required>
        <button>Créer</button>
      </form>
      ${rs.map(recipeCard).join('') || '<p class="empty">Aucune recette pour l\'instant.</p>'}
      ${catalogList()}`;
  },

  budget() {
    const now = new Date(), y = now.getFullYear(), m = now.getMonth();
    const start = new Date(y, m, 1).getTime(), prevStart = new Date(y, m - 1, 1).getTime();
    const days = new Date(y, m + 1, 0).getDate(), day = now.getDate();
    const paid = S.trips.filter(t => t.total != null && t.type !== 'settle');
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
    // Conso estimée : prix connu × fréquence d'achat (rythme), ramenée à 30 jours
    const tracked = S.items.map(i => ({ i, r: rhythm(i), p: lastPrice(i) })).filter(x => x.r && x.p != null);
    const monthlyUse = tracked.reduce((t, x) => t + x.p * 30 / x.r.every, 0);
    const priced = S.items.filter(i => i.prices?.length).sort((a, b) => b.prices.at(-1).d - a.prices.at(-1).d);
    const tile = (label, v, sub = '') => `<div class="tile"><small>${label}</small><strong>${v == null ? '—' : euro(v)}</strong><small>${sub}</small></div>`;
    return `
      <div class="hero">
        <small>Dépensé ce mois</small>
        <strong>${euro(sum(month))}</strong>
        <small>${prev.length ? `mois dernier : ${euro(sum(prev))}` : `${month.length} passage${month.length > 1 ? 's' : ''} en caisse`}</small>
        ${budget ? `
          <div class="progress ${sum(month) > budget ? 'over' : ''}"><div style="width:${Math.min(100, 100 * sum(month) / budget)}%"></div></div>
          <small>${sum(month) > budget ? `Budget dépassé de ${euro(sum(month) - budget)}` : `Reste ${euro(budget - sum(month))} sur ${euro(budget)}`}</small>` : ''}
      </div>
      <button class="primary" data-a="openScan" style="margin:12px 0">📷 Scanner un ticket</button>
      <form id="budgetForm" class="add">
        <label class="small grow">Budget mensuel (€)</label>
        <input name="name" inputmode="decimal" value="${budget ?? ''}" placeholder="ex. 600" style="flex:0 0 110px">
        <button>OK</button>
      </form>

      <details class="adv"><summary>Plus de chiffres et budget mensuel</summary>
      <div class="tiles">
        ${tile('Fin de mois (estim.)', projection, 'au rythme des 3 derniers mois')}
        ${tile('Panier moyen', avg, '3 derniers mois')}
        ${tracked.length ? tile('Conso estimée / mois', monthlyUse, `${tracked.length} produit${tracked.length > 1 ? 's' : ''} suivi${tracked.length > 1 ? 's' : ''} (prix × fréquence)`) : ''}
      </div>
      ${budget && projection != null && projection > budget ? '<p class="count">Attention : à ce rythme, le budget sera dépassé en fin de mois.</p>' : ''}
      ${byPlace.length > 1 ? `<h3>Ce mois par magasin</h3>${byPlace.map(([p, v]) => `<div class="row static"><span class="name">${esc(p)}</span><span>${euro(v)}</span></div>`).join('')}` : ''}
      ${priced.length ? `<h3>Prix suivis</h3>${priced.slice(0, 15).map(i => {
        const [a, b] = [i.prices.at(-2)?.p, i.prices.at(-1).p], diff = a ? Math.round((b - a) / a * 100) : 0;
        return `<div class="row" data-a="openItem" data-id="${i.id}"><span class="name">${esc(i.name)} <small>${esc(i.prices.at(-1).at || '')}</small></span>${diff ? `<small class="${diff > 0 ? 'up' : 'down'}">${diff > 0 ? '↑' : '↓'} ${Math.abs(diff)} %</small>` : ''}<span>${euro(b)}</span></div>`;
      }).join('')}` : ''}
      </details>
      <h3>Passages en caisse</h3>
      ${S.trips.slice(-20).reverse().map(t => `
        <div class="row static">
          <span class="name">${shortDate(t.date)} · ${esc(t.type === 'settle' ? `${t.from} → ${t.to}` : t.place)}${t.n ? ` <small>${t.n} art.</small>` : ''}${t.by && t.type !== 'settle' ? ` <small>· payé par ${esc(t.by)}</small>` : ''}${t.names?.length ? `<br><small>${t.names.slice(0, 12).map(esc).join(', ')}${t.names.length > 12 ? '…' : ''}</small>` : ''}</span>
          <button class="ghost" data-a="editTrip" data-id="${t.id}">${t.total == null ? 'Ajouter €' : euro(t.total)}</button>
          <button class="ghost" data-a="delTrip" data-id="${t.id}">×</button>
        </div>`).join('') || '<p class="hint">Le montant est demandé (facultatif) quand vous terminez des courses, ou lu sur le ticket scanné.</p>'}`;
  },

  aisles() {
    const st = store(), list = orderedAisles();
    return `
      <button class="ghost back" data-a="go" data-v="${settingsBack}">← Retour</button>
      <h2>Réglages</h2>
      <h3>Cette liste</h3>
      <label class="field">Nom<input id="listTitle" value="${esc(currentList().name)}" autocomplete="off"></label>
      ${Sync.config() ? `
        <p class="hint">Liste partagée${members().length > 1 ? ` avec ${members().filter(m => m !== me).map(esc).join(', ')}` : ''}. Les modifications faites sans réseau partent dès qu'il revient.</p>
        <div class="bar">
          <button class="accent" data-a="invite">📨 Inviter quelqu'un</button>
          <button data-a="syncNow">Synchroniser</button>
          <button class="ghost" data-a="leave">Ne plus partager</button>
        </div>` : `
        <button class="accent wide" data-a="shareNow">📨 Partager cette liste</button>
        <details class="adv"><summary>Serveur de partage</summary>
        <form id="share" class="add">
          <input name="url" placeholder="https://xxxx.supabase.co" value="${SUPA_URL}" required>
          <input name="key" placeholder="Clé publique (publishable)" value="${SUPA_KEY}" required>
          <button>Créer la liste partagée</button>
        </form></details>
        <p class="hint">Vous avez reçu un lien ? Collez-le ici : la liste s'ajoute à « Mes listes ».</p>
        <form id="joinForm" class="add">
          <input name="name" placeholder="Lien d'invitation" autocomplete="off" required>
          <button>Rejoindre</button>
        </form>`}
      ${lists.length > 1 ? `<button class="ghost danger wide" data-a="forgetList">Retirer « ${esc(currentList().name)} » de ce téléphone</button>` : ''}
      <h3>Vous</h3>
      <label class="field">Votre prénom <small>(sur ce téléphone, affiché sur vos ajouts)</small><input id="meName" value="${esc(me)}" placeholder="ex. Léa" autocomplete="given-name"></label>
      <h3>Taille du texte</h3>
      <div class="seg">
        ${[['', 'Normale'], ['large', 'Grande'], ['xl', 'Très grande']].map(([v, l]) => `<button data-a="setSize" data-v="${v}" class="${size === v ? 'active' : ''}">${l}</button>`).join('')}
      </div>
      <h3>Apparence</h3>
      <div class="seg">
        ${[['auto', 'Automatique'], ['light', 'Clair'], ['dark', 'Sombre']].map(([v, l]) => `<button data-a="setTheme" data-v="${v}" class="${theme === v ? 'active' : ''}">${l}</button>`).join('')}
      </div>
      <h3>Notifications</h3>
      ${'Notification' in window ? (Notification.permission === 'granted' ? '<p class="hint">✓ Ce téléphone vous prévient (ajouts, départ en courses, articles pris pour vous) tant que l\'app est ouverte ou en arrière-plan.</p>'
        : Notification.permission === 'denied' ? '<p class="hint">Notifications refusées : à réactiver dans les réglages du téléphone.</p>'
        : '<button class="wide" data-a="askNotify">🔔 Activer les notifications</button>') : '<p class="hint">Ce navigateur ne gère pas les notifications. Sur iPhone : ajoutez l\'app à l\'écran d\'accueil.</p>'}
      <h3>Magasins et rayons</h3>
      ${storePicker(true)}
      <details class="adv"><summary>Rayons (${list.length})</summary>
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
      </details>
      <details class="adv"><summary>Commerces (${S.shops.length})</summary>
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
      </details>
      <details class="adv"${brushOpen ? ' open' : ''}><summary>Plan du magasin et circuit (avancé)</summary>
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
      </details>
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
      <option value="none"${store() ? '' : ' selected'}>📍 Autre magasin (ordre standard)</option>
    </select>
    ${manage ? `
      <button class="ghost" data-a="newStore" title="Nouveau magasin">＋</button>
      ${store() ? `<button class="ghost" data-a="renameStore" title="Renommer">✎</button>
      <button class="ghost" data-a="delStore" title="Supprimer">×</button>` : ''}` : ''}
  </div>`;

// Ajout : dès les premières lettres, propositions parmi les articles déjà connus (accents et pluriels ignorés).
// On cherche sur le dernier article tapé (« lait, tom » -> tom), sans la quantité (« 2 kg tom » -> tom).
let quickDraft = '', refocusQuick = false;
const lastPart = v => v.split(/[,;]/).pop().replace(/^\s*\d+(?:[.,]\d+)?\s*(?:kg|g|l|cl|ml|x|×)?\s+(?:de |d')?/i, '').trim();
function matches(q) {
  const k = sameKey(q);
  if (!k) return [];
  return S.items.map(i => {
    const n = sameKey(i.name);
    const score = n.startsWith(k) ? 0 : n.split(' ').some(w => w.startsWith(k)) ? 1 : n.includes(k) ? 2 : 9;
    return { i, score };
  }).filter(x => x.score < 9)
    .sort((a, b) => a.score - b.score || (b.i.bought?.length || 0) - (a.i.bought?.length || 0) || a.i.name.localeCompare(b.i.name))
    .slice(0, 6).map(x => x.i);
}
const suggestChips = () => matches(lastPart(quickDraft)).map(i => {
  const where = shopOf(i)?.name || S.aisles.find(a => a.id === i.aisle)?.name || '';
  return `<button type="button" class="chip ${i.need ? 'on' : ''}" data-a="pickSuggest" data-id="${i.id}">${i.need ? '✓ ' : ''}${esc(i.name)} <small>${esc(where)}</small></button>`;
}).join('');

// Autocomplétion des recettes : les articles connus
const catalogList = () => `<datalist id="catalog">${S.items.map(i => `<option value="${esc(i.name)}">`).join('')}</datalist>`;
let catalogEdit = false; // « Mes basiques » en mode modification

let lastTab = null;
// En courses : écran maintenu allumé (si le téléphone le permet)
let wake = null;
async function keepAwake(on) {
  try {
    if (on && !wake && navigator.wakeLock && document.visibilityState === 'visible') {
      wake = await navigator.wakeLock.request('screen');
      wake.addEventListener('release', () => { wake = null; });
    } else if (!on && wake) { wake.release(); wake = null; }
  } catch {}
}
document.addEventListener('visibilitychange', () => { if (myShopping()) keepAwake(true); });
document.addEventListener('input', e => {
  if (e.target.id === 'welcomeName') setMe(e.target.value);
  if (e.target.closest('#quick')) {
    quickDraft = e.target.value;
    const box = document.getElementById('suggest');
    if (box) box.innerHTML = suggestChips();
  }
});
function render() {
  if (!S.aisles.length) {
    app.innerHTML = `<p class="empty">${tab === 'aisles' ? '' : 'En attente de la première synchronisation…'}</p>${tab === 'aisles' ? views.aisles() : ''}`;
    return;
  }
  if (brush === null || (brush && brush !== 'entry' && !S.aisles.some(a => a.id === brush))) brush = S.aisles[0].id;
  app.innerHTML = views[tab]();
  if (refocusQuick) {
    refocusQuick = false;
    const q = app.querySelector('#quick input');
    q?.focus();
    q?.setSelectionRange(q.value.length, q.value.length);
  }
  if (tab !== lastTab) scrollTo(0, 0);
  lastTab = tab;
  // Onglet allumé : la section dont dépend l'écran courant
  const parent = { catalog: 'list', recipes: 'meals', scan: 'budget', activity: 'list' };
  const section = parent[tab === 'item' ? sheetBack : tab] ?? (tab === 'item' ? sheetBack : tab);
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === section));
  document.getElementById('gear')?.classList.toggle('active', tab === 'aisles');
  document.body.classList.toggle('bare', tab === 'welcome');
  const l = currentList(), ln = document.getElementById('listName');
  if (ln) ln.textContent = `${l.emoji} ${l.name} ▾`;
  const unseen = feed().filter(e => !e.seen).length, bell = document.getElementById('bell');
  if (bell) bell.dataset.count = unseen || '';
  keepAwake(!!myShopping());
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
          <span class="name link" data-a="openItem" data-id="${i.id}">${esc(i.name)}</span>
          <input class="qty" data-rqty="${r.id}:${i.id}" value="${esc(r.qty?.[i.id] || '')}" placeholder="qté" aria-label="Quantité">
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

// ---------- Accueil : moins d'une minute pour démarrer ----------

let welcomeJoin = false;
views.welcome = () => `
  <div class="welcome">
    <div class="logo">🛒</div>
    <h2>La liste de courses du foyer</h2>
    <p class="hint">Tout le monde ajoute ce qui manque, la liste marche même sans réseau au magasin.</p>
    <label class="field">Votre prénom<input id="welcomeName" value="${esc(me)}" placeholder="ex. Léa" autocomplete="given-name"></label>
    ${welcomeJoin ? `
      <form id="joinForm" class="add">
        <input name="name" placeholder="Collez le lien d'invitation reçu" autocomplete="off" required>
        <button class="accent">Rejoindre</button>
      </form>
      <button class="ghost wide" data-a="welcomeBack">← Retour</button>` : `
      <button class="primary" data-a="welcomeCreate">Créer la liste du foyer</button>
      <button class="wide" data-a="welcomeJoin">J'ai reçu un lien d'invitation</button>
      <button class="ghost wide" data-a="welcomeSolo">Juste pour moi, sans partage</button>`}
  </div>`;

// Carte d'invitation en haut de la liste, jusqu'à ce qu'on l'ait utilisée ou fermée
const welcomeInvite = () => {
  let done = true;
  try { done = !!localStorage.getItem(K('courses.invited')); } catch {}
  if (done || !Sync.config()) return '';
  return `
    <div class="card invite">
      <strong>Invitez le foyer</strong>
      <p class="hint">Envoyez le lien : chacun installe l'app et rejoint la même liste.</p>
      <div class="bar"><button class="accent grow" data-a="invite">📨 Envoyer l'invitation</button><button class="ghost" data-a="inviteDone">Plus tard</button></div>
    </div>`;
};

// Ce téléphone a-t-il déjà utilisé cette liste ? (sinon, on peut y rejoindre une liste partagée)
const hasOwnData = () => S.trips.length > 0 || S.items.some(i => i.need || i.bought?.length || i.prices?.length);

function finishWelcome(next) {
  try { localStorage.setItem('courses.welcome', '1'); } catch {}
  welcomed = true;
  tab = next;
}

// ---------- Actions ----------

const item = id => S.items.find(i => i.id === id);
const parseEuro = raw => { const v = parseFloat(String(raw).replace(',', '.').replace(/[^\d.]/g, '')); return isNaN(v) ? null : Math.round(v * 100) / 100; };
function setStore(id) { storeId = id; try { localStorage.setItem(K('courses.store'), id); } catch {} }

const recipe = id => S.recipes.find(r => r.id === id);

// Annuler : instantané de l'état avant une action destructive, bandeau 6 s
let undoSnap = null, toastTimer;
let undoAfter = null;
function snapshot() { undoSnap = Sync.strings(Sync.records(S)); }
function toast(msg, undo = true) {
  let el = document.getElementById('toast');
  if (!el) { el = Object.assign(document.createElement('div'), { id: 'toast' }); document.body.append(el); }
  if (undo) undoAfter = Sync.strings(Sync.records(S));
  el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button data-a="undo">Annuler</button>' : ''}`;
  el.className = 'show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; undoSnap = null; }, 6000);
}

// Mes courses en cours : ce que j'ai mis dans le caddie, les endroits visités (supermarché, commerces)
function myTrip() {
  const taken = S.items.filter(i => i.done && mine(i));
  const spot = i => shopOf(i) ? i.aisle : '';
  const visited = new Set(taken.map(spot));
  const here = i => visited.has(spot(i));
  const only = visited.size === 1 && [...visited][0];
  const where = only ? S.shops.find(s => s.id === only).name : store()?.name || 'Autre magasin';
  return { taken, here, where };
}

// Ordre des rayons appris : les rayons cochés prennent, entre eux, l'ordre du parcours réel ;
// les autres gardent leur place. Ignoré si tout a été coché d'un coup (moins de 2 min) ou avec un plan.
function learnOrder(taken) {
  const st = store();
  const ticks = taken.filter(i => i.doneAt && !shopOf(i)).sort((a, b) => a.doneAt - b.doneAt);
  if (!st || (M().auto && Object.keys(M().cells).length) || ticks.length < 3 || ticks.at(-1).doneAt - ticks[0].doneAt < 120e3) return false;
  const seen = [...new Set(ticks.map(i => i.aisle))];
  if (seen.length < 2) return false;
  const list = orderedAisles().map(a => a.id);
  const slots = list.map((id, k) => seen.includes(id) ? k : -1).filter(k => k >= 0);
  slots.forEach((k, n) => { list[k] = seen[n]; });
  const changed = JSON.stringify(list) !== JSON.stringify(orderedAisles().map(a => a.id));
  st.order = list;
  return changed;
}

const actions = {
  welcomeCreate: () => {
    if (!me) return alert('Indiquez votre prénom : il s\'affiche sur vos ajouts.');
    Sync.create(SUPA_URL, SUPA_KEY);
    finishWelcome('catalog');
    toast('Liste créée. Touchez ce qui vous manque !', false);
  },
  welcomeJoin: () => { welcomeJoin = true; },
  welcomeBack: () => { welcomeJoin = false; },
  welcomeSolo: () => { finishWelcome('catalog'); toast('Touchez ce qui vous manque !', false); },
  inviteDone: () => { try { localStorage.setItem(K('courses.invited'), '1'); } catch {} },
  // Mes listes : changer, créer
  lists: () => {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="overlay sheet-modal" data-a="closePhoto">
        <div class="card" data-a="noop">
          <h2>Mes listes</h2>
          ${lists.map(l => `<button class="row list-row ${l.id === LIST ? 'on' : ''}" data-a="switchList" data-v="${l.id}"><span class="name">${l.emoji} ${esc(l.name)}</span>${l.id === LIST ? '✓' : ''}</button>`).join('')}
          <form id="newListForm" class="add">
            <input name="name" placeholder="Nouvelle liste (ex. Pour Maman)" autocomplete="off" required>
            <button class="accent">Créer</button>
          </form>
          <p class="hint">Chaque liste a ses articles, ses membres et ses dépenses : pratique pour les courses d'un proche ou la semaine avec les enfants.</p>
        </div>
      </div>`);
  },
  switchList: ({ v }) => { if (v !== LIST) switchList(v); else actions.closePhoto(); },
  noop: () => {},
  go: ({ v }) => { if (v === 'aisles' && tab !== 'aisles') settingsBack = tab; tab = v; },
  undo: () => {
    if (!undoSnap || !undoAfter) return;
    const cur = Sync.records(S);
    for (const k of new Set([...Object.keys(undoSnap), ...Object.keys(undoAfter)])) {
      if (undoSnap[k] === undoAfter[k]) continue; // pas touché par l'action
      if (undoSnap[k] === undefined) delete cur[k]; else cur[k] = JSON.parse(undoSnap[k]);
    }
    S = upgrade(Sync.fromRecords(cur));
    undoSnap = undoAfter = null;
    document.getElementById('toast').className = '';
  },
  startRecipe: ({ id }) => { recipeAdd = id; recipeEdit = null; recipeSkip = new Set(); },
  toggleSkip: ({ id }) => { recipeSkip.has(id) ? recipeSkip.delete(id) : recipeSkip.add(id); },
  confirmRecipe: ({ id }) => {
    recipe(id).items.map(item).filter(i => i && !recipeSkip.has(i.id)).forEach(want);
    recipeAdd = null;
  },
  cancelRecipe: () => { recipeAdd = null; },
  editRecipe: ({ id }) => { recipeEdit = id; recipeAdd = null; },
  closeRecipe: () => { recipeEdit = null; },
  unlink: ({ id, item: itemId }) => { const r = recipe(id); r.items = r.items.filter(x => x !== itemId); },
  delRecipe: ({ id }) => { if (confirm('Supprimer cette recette ?')) { S.recipes = S.recipes.filter(r => r.id !== id); recipeEdit = null; } },
  toggleNeed: ({ id }) => { const i = item(id); if (i.need) { i.need = false; i.done = false; } else want(i); },
  toggleDone: ({ id }) => {
    const i = item(id);
    i.done = !i.done;
    i.doneAt = i.done ? Date.now() : undefined;
    i.doneBy = i.done ? me || '?' : undefined;
  },
  unneed: ({ id }) => { snapshot(); const i = item(id); i.need = false; i.done = false; toast(`${i.name} retiré de la liste`); },
  delItem: ({ id }) => { S.items = S.items.filter(i => i.id !== id); },
  allFreq: () => S.items.forEach(i => { if (i.freq) want(i); }),
  allPins: () => S.items.forEach(i => { if (i.pin) want(i); }),
  pin: ({ id }) => { const i = item(id); i.pin = !i.pin || undefined; if (i.pin) i.freq = true; },
  noneNeed: () => {
    if (Sync.config() && !confirm('Vider la liste pour tout le foyer ?')) return;
    snapshot(); S.items.forEach(i => { i.need = false; i.done = false; }); toast('Liste vidée');
  },
  addSug: () => suggestions().forEach(({ i }) => want(i)),
  // Valide la liste : les articles pris alimentent l'historique d'achat
  // Valide la liste : les articles pris alimentent l'historique d'achat, le montant du ticket le budget
  goShopping: () => { S.shoppers[me || '?'] = Date.now(); tab = 'list'; },
  stopShopping: () => { delete S.shoppers[me || '?']; },
  // Toucher une proposition : l'article va sur la liste, on continue à taper
  pickSuggest: ({ id }) => {
    const i = item(id), parts = quickDraft.split(/[,;]/);
    const qty = parts.at(-1).match(/^\s*(\d+(?:[.,]\d+)?\s*(?:kg|g|l|cl|ml|x|×)?)\s/i)?.[1].trim();
    if (tab === 'catalog') i.freq = true;
    if (i.need) toast(`${i.name} : déjà sur la liste${i.by ? ` (${i.by})` : ''}`, false);
    else want(i);
    if (qty) i.note = qty;
    parts.pop();
    quickDraft = parts.length ? parts.join(',') + ', ' : '';
    refocusQuick = true;
  },
  // Vider la liste d'un geste (Annuler pendant 6 s)
  clearList: () => {
    snapshot();
    const n = S.items.filter(i => i.need).length;
    S.items.forEach(i => { i.need = false; i.done = false; delete i.doneAt; delete i.doneBy; delete i.missing; });
    toast(`Liste vidée (${n} article${n > 1 ? 's' : ''})`);
  },
  hintDone: () => { try { localStorage.setItem('courses.hint', '1'); } catch {} },
  catalogEdit: () => { catalogEdit = !catalogEdit; },
  shareList: async () => {
    const groups = [...byAisle(i => i.need), ...byAisle(i => i.need, S.shops)];
    const text = '🛒 Courses\n' + groups.map(g => `\n${g.aisle.name}\n` + g.items.map(i => `• ${i.name}${i.note ? ` (${i.note})` : ''}`).join('\n')).join('\n');
    try { await navigator.share({ title: 'Courses', text }); }
    catch (e) { if (e.name !== 'AbortError') { await navigator.clipboard?.writeText(text); toast('Liste copiée', false); } }
  },
  // Terminer : petit écran (montant facultatif) au lieu d'une boîte de dialogue
  finish: () => {
    const { taken, here } = myTrip();
    if (!taken.length) return alert('Touchez d\'abord les articles qui sont dans votre caddie.');
    const left = othersShopping() ? 0 : S.items.filter(i => i.need && !i.done && here(i)).length;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="overlay sheet-modal">
        <form id="finishForm" class="card">
          <h2>Terminer les courses</h2>
          <p>${taken.length} article${taken.length > 1 ? 's' : ''} pris${left ? `, ${left} pas trouvé${left > 1 ? 's' : ''} : ${left > 1 ? 'ils restent' : 'il reste'} sur la liste et l'auteur le voit.` : '.'}</p>
          <label class="field">Montant du ticket <small>(facultatif)</small><input name="name" inputmode="decimal" placeholder="ex. 42,50" autocomplete="off"></label>
          <button class="primary">✓ Terminer</button>
          <button type="button" class="ghost wide" data-a="closePhoto">Continuer les courses</button>
        </form>
      </div>`);
    document.querySelector('#finishForm input').focus();
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
  setSize: ({ v }) => { size = v; try { localStorage.setItem('courses.size', v); } catch {} applySize(); },
  setTheme: ({ v }) => { theme = v; try { localStorage.setItem('courses.theme', v); } catch {} applyTheme();
let size = '';
try { size = localStorage.getItem('courses.size') || ''; } catch {}
const applySize = () => { document.documentElement.dataset.size = size; };
applySize(); },
  renameShop: ({ id }) => { const sh = S.shops.find(x => x.id === id), n = prompt('Nom du commerce', sh.name); if (n?.trim()) sh.name = n.trim(); },
  delShop: ({ id }) => {
    if (!confirm('Supprimer ce commerce ? Ses articles passent au supermarché.')) return;
    S.shops = S.shops.filter(x => x.id !== id);
    S.items.forEach(i => { if (i.aisle === id) i.aisle = fallbackAisle(); });
  },
  setWho: ({ v }) => { who = +v; try { localStorage.setItem(K('courses.who'), v); } catch {} },
  paint: ({ c }) => {
    brushOpen = true;
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
  // Partage natif du téléphone (SMS, WhatsApp…), sinon copie du lien
  invite: async () => {
    const link = Sync.inviteLink();
    const text = `Rejoins notre liste de courses : installe l'app depuis ce lien, puis colle-le dans Réglages > Partage si on te le demande.\n${link}`;
    try { localStorage.setItem(K('courses.invited'), '1'); } catch {}
    try { await navigator.share({ title: 'Liste de courses', text }); }
    catch (e) {
      if (e.name === 'AbortError') return;
      try { await navigator.clipboard.writeText(link); toast('Lien d\'invitation copié', false); }
      catch { prompt('Lien d\'invitation', link); }
    }
    render();
  },
  syncNow: () => Sync.run(),
  shareNow: () => { Sync.create(SUPA_URL, SUPA_KEY); actions.invite(); },
  forgetList: () => { if (confirm(`Retirer « ${currentList().name} » de ce téléphone ? Les autres membres la gardent.`)) forgetList(LIST); },
  leave: () => { if (confirm('Quitter le partage ? La liste reste sur ce téléphone.')) Sync.leave(); },
  photo: ({ id }) => { photoFor = id; document.getElementById('photo').click(); },
  viewPhoto: ({ id }) => {
    const i = item(id);
    document.body.insertAdjacentHTML('beforeend', `
      <div class="overlay" data-a="closePhoto">
        <img src="${esc(i.photo)}" alt="">
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
    if (!confirm(Sync.config() ? 'Liste partagée : cela efface la liste, l\'historique et le budget de TOUT le foyer, sur tous les téléphones. Continuer ?' : 'Tout effacer et revenir aux basiques ?')) return;
    S = seed();
    setStore('store-main');
  },
};

document.addEventListener('click', e => {
  const tabBtn = e.target.closest('[data-tab]');
  if (tabBtn) { tab = tabBtn.dataset.tab; return render(); }
  const el = e.target.closest('[data-a]');
  if (swiped?.contains(e.target)) { swiped = null; return; } // un glissement n'est pas un toucher
  swiped = null;
  if (!el || el.disabled) return;
  actions[el.dataset.a](el.dataset);
  save();
  render();
});

let swipe = null, swiped = null; // swiped : la ligne qu'on vient de glisser (son « clic » est ignoré)
document.addEventListener('touchstart', e => {
  const row = e.target.closest('[data-swipe]');
  swipe = row ? { row, x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0 } : null;
}, { passive: true });
document.addEventListener('touchmove', e => {
  if (!swipe) return;
  const dx = e.touches[0].clientX - swipe.x, dy = e.touches[0].clientY - swipe.y;
  if (Math.abs(dy) > Math.abs(dx) && !swipe.dx) { swipe = null; return; }
  swipe.dx = Math.min(0, dx);
  swipe.row.style.transform = `translateX(${swipe.dx}px)`;
  swipe.row.classList.toggle('removing', swipe.dx < -90);
}, { passive: true });
document.addEventListener('touchend', () => {
  if (!swipe) return;
  const { row, dx } = swipe;
  swipe = null;
  if (dx < -10) swiped = row;
  if (dx < -90) { actions.unneed({ id: row.dataset.swipe }); save(); render(); }
  else row.style.transform = '';
});

document.addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const name = f.get('name');
  if (e.target.id === 'quick') { // « lait, œufs, 2 kg tomates »
    quickDraft = '';
    const already = [];
    name.split(/[,;\n]+/).forEach(raw => {
      const m = raw.trim().match(/^(\d+(?:[.,]\d+)?\s*(?:kg|g|l|cl|ml|x|×|paquets?|boîtes?|bouteilles?)?)\s+(?:de |d')?(.+)$/i);
      const n = m ? m[2] : raw, qty = m ? m[1].trim() : null;
      const ex = findItem(n);
      if (ex?.need) already.push(`${ex.name}${ex.by ? ` (${ex.by})` : ''}`);
      addItem(n, null, tab === 'catalog');
      if (qty) { const i = findItem(n); if (i) i.note = qty; }
    });
    if (already.length) setTimeout(() => toast(`Déjà sur la liste : ${already.join(', ')}`, false));
  }
  if (e.target.id === 'addAisle' && name.trim()) S.aisles.push({ id: uid(), name: name.trim() });
  if (e.target.id === 'addShop' && name.trim()) S.shops.push({ id: uid(), name: name.trim() });
  if (e.target.id === 'newRecipe' && name.trim()) {
    const r = { id: uid(), name: name.trim(), items: [] };
    S.recipes.push(r);
    recipeEdit = r.id;
  }
  if (e.target.id === 'link') {
    const r = recipe(e.target.dataset.id);
    for (const raw of name.split(/[,;\n]+/)) {
      const n = cap(raw.trim());
      if (!n) continue;
      let i = findItem(n);
      if (!i) S.items.push(i = { id: uid(), name: n, aisle: guessAisle(n), freq: false, need: false, done: false });
      if (!r.items.includes(i.id)) r.items.push(i.id);
    }
  }
  if (e.target.id === 'newListForm' && name.trim()) { switchList(newList(name.trim()).id); return; }
  if (e.target.id === 'meForm') { setMe(name); save(); render(); return; }
  if (e.target.id === 'finishForm') {
    document.querySelector('.overlay')?.remove();
    const { taken, here, where } = myTrip();
    snapshot();
    const learned = where === store()?.name && learnOrder(taken);
    delete S.shoppers[me || '?'];
    const now = Date.now();
    taken.forEach(i => {
      i.bought = [...(i.bought || []), now].slice(-HISTORY);
      Object.assign(i, { need: false, done: false, lastBy: me || undefined });
      delete i.doneAt; delete i.doneBy; delete i.missing;
    });
    // « Pas trouvé » seulement si personne d'autre n'est encore en courses
    if (!othersShopping()) S.items.filter(i => i.need && !i.done && here(i)).forEach(i => { i.missing = { by: me || '', at: now }; });
    S.trips.push({ id: uid(), date: now, total: parseEuro(name || ''), place: where, n: taken.length, names: taken.map(i => i.name), by: me || undefined });
    tab = 'list';
    save(); render();
    toast(learned ? `Courses terminées 👍 Ordre des rayons ajusté pour ${store().name}` : 'Courses terminées 👍');
    return;
  }
  if (e.target.id === 'budgetForm') S.settings.budget = parseEuro(name);
  if (e.target.id === 'joinForm') {
    const c = Sync.decode(name);
    if (!c) return alert('Lien d\'invitation invalide');
    if (tab === 'welcome') finishWelcome('list');
    try { localStorage.setItem(K('courses.invited'), '1'); } catch {}
    Sync.joinLink(c);
    return;
  }
  if (e.target.id === 'share') Sync.create(f.get('url').trim().replace(/\/+$/, ''), f.get('key').trim());
  save();
  render();
  app.querySelector(`#${e.target.id} input`)?.focus();
});

document.addEventListener('change', async e => {
  if (e.target.id === 'brush') { brush = e.target.value; brushOpen = true; return; }
  if (e.target.id === 'meName') { setMe(e.target.value); return render(); }
  if (e.target.id === 'listTitle' && e.target.value.trim()) { currentList().name = S.settings.listName = e.target.value.trim(); saveLists(); save(); return render(); }
  if (e.target.id === 'rname') { const r = recipe(e.target.dataset.id); if (e.target.value.trim()) r.name = e.target.value.trim(); return save(); }
  if (e.target.dataset.itemAisle) { item(e.target.dataset.itemAisle).aisle = e.target.value; return save(); }
  if (e.target.id === 'photo') {
    const file = e.target.files[0], i = item(photoFor);
    e.target.value = '';
    if (!file || !i) return;
    i.photo = await shrink(file, 280);
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
    if (Sync.config() && !confirm('Liste partagée : l\'import remplace la liste de TOUT le foyer. Continuer ?')) return;
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
  return c.toDataURL('image/jpeg', .6);
}

// Nouvelle version installée en arrière-plan : le proposer tout de suite plutôt qu'à la prochaine ouverture
if ('serviceWorker' in navigator) {
  const hadVersion = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(r => r.update()).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadVersion) return;
    const el = Object.assign(document.createElement('div'), { id: 'update', innerHTML: '<span>✨ Nouvelle version de l\'app</span><button onclick="location.reload()">Recharger</button>' });
    document.body.append(el);
  });
}
