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
const defaultShops = () => [['boulangerie', 'Boulanger'], ['boucherie', 'Boucher'], ['fromager', 'Fromager'], ['caviste', 'Caviste'], ['marché', 'Marché']]
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
// Parts hors partage d'un ticket [{ by, amount }] ; l'ancien t.own (part perso du payeur) devient une part
const tripParts = (t, str) => {
  const ps = Array.isArray(t.parts) ? t.parts : t.own ? [{ by: t.by, amount: t.own }] : [];
  const out = ps.filter(p => p && typeof p === 'object').map(p => ({ by: str(p.by), amount: p.amount == null ? null : num0(p.amount) }));
  return out.length ? out : undefined;
};
const partsSum = t => (t.parts || []).reduce((s, p) => s + (p.amount || 0), 0);
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
    i.auto = i.auto === true || undefined;
    i.snooze = i.snooze == null ? undefined : num0(i.snooze);
  }
  st.aisles = st.aisles.filter(ok);
  st.shops = st.shops.filter(ok);
  const fb = (st.aisles.find(a => a.name === 'Divers') || st.aisles.at(-1))?.id;
  if (fb) st.items.forEach(i => { if (!i.aisle) i.aisle = fb; });
  st.recipes = st.recipes.filter(ok).map(r => ({ ...r, kind: r.kind === 'basket' ? 'basket' : undefined, cat: r.cat ? String(r.cat).slice(0, 30) : undefined, items: (Array.isArray(r.items) ? r.items : []).filter(x => ID.test(x)) }));
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
    names: Array.isArray(t.names) ? t.names.map(String) : undefined, by: str(t.by), from: str(t.from), to: str(t.to), parts: tripParts(t, str), type: ['settle', 'expense'].includes(t.type) ? t.type : undefined }));
  st.recipes.forEach(r => { r.qty = Object.fromEntries(Object.entries(r.qty && typeof r.qty === 'object' ? r.qty : {}).filter(([k]) => ID.test(k)).map(([k, v]) => [k, String(v).slice(0, 30)])); });
  const old = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
  st.plan = Object.fromEntries(Object.entries(st.plan || {}).filter(([d, ids]) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= old && Array.isArray(ids)).map(([d, ids]) => [d, ids.filter(x => ID.test(x))]));
  if (st.settings.listName != null) st.settings.listName = String(st.settings.listName).slice(0, 40);
  st.aliases = Object.fromEntries(Object.entries(st.aliases || {}).filter(([, v]) => v === 'ignore' || ID.test(v)));
  if (st.settings.budget != null) st.settings.budget = num0(st.settings.budget);
  if (st.settings.split != null) st.settings.split = st.settings.split === true;
  if (st.settings.autofill != null) st.settings.autofill = st.settings.autofill === true;
  delete st.settings.shopping;
  // Qui est en courses : un enregistrement par personne (sinon deux « J'y vais » simultanés s'écrasent)
  st.shoppers = Object.fromEntries(Object.entries(st.shoppers || st.settings.shoppers || {}).filter(([n]) => /^[^:]{1,40}$/.test(n)).map(([n, at]) => [n, num0(at)]));
  delete st.settings.shoppers;
  st.parts = Object.fromEntries(Object.entries(st.parts || {}).filter(([n, p]) => /^[^:]{1,40}$/.test(n) && [0, 1, 2].includes(+p)).map(([n, p]) => [n, +p]));
  st.people = Object.fromEntries(Object.entries(st.people || {}).filter(([n]) => /^[^:]{1,40}$/.test(n)).map(([n, at]) => [n, num0(at)]));
  return st;
}

function upgrade(st) {
  st.items ||= [];
  st.aisles ||= [];
  st.recipes ||= [];
  st.shops ||= defaultShops();
  const plainDefault = { '🥖 Boulanger': 'Boulanger', '🥖 Boulangerie': 'Boulangerie', '🥩 Boucher': 'Boucher', '🥩 Boucherie': 'Boucherie', '🧀 Fromager': 'Fromager', '🍷 Caviste': 'Caviste', '🧺 Marché': 'Marché' };
  st.shops.forEach(sh => { if (sh.id?.startsWith('shop-') && plainDefault[sh.name]) sh.name = plainDefault[sh.name]; });
  st.trips ||= [];
  st.settings ||= {};
  st.aliases ||= {}; // libellé de ticket normalisé -> id d'article, ou 'ignore'
  st.plan ||= {}; // repas : date -> recettes
  st.parts ||= {}; // courses à deux : prénom -> moitié choisie (0 tout, 1 début, 2 fin)
  st.people ||= {}; // membres de la liste partagée : prénom -> date d'arrivée
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
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#16181c' : '#f0eee9');
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

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const plain = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae');
const sameKey = s => plain(s).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').map(w => w.length > 3 ? w.replace(/[sx]$/, '') : w).join(' ');
const findItem = name => S.items.find(i => sameKey(i.name) === sameKey(name));

// Rayon deviné pour un nouvel article : d'abord un article proche déjà classé (même premier mot),
// puis des mots-clés courants, sinon Divers
const AISLE_WORDS = {
  'fruits': 'banane pomme poire orange citron fraise raisin kiwi melon peche abricot clementine mangue ananas avocat tomate salade carotte oignon ail echalote pomme de terre patate courgette aubergine poivron concombre champignon poireau brocoli chou epinard haricot vert legume fruit herbe persil basilic radis betterave thym ciboulette potiron courge citrouille herbes coriandre menthe navet endive mais cerise aneth',
  'boulangerie': 'pain baguette brioche croissant viennoiserie pain de mie biscotte',
  'cremerie': 'lait yaourt yogourt fromage beurre creme oeuf babybel danonino danone petit suisse kiri vache qui rit emmental comte mozzarella feta skyr fromage blanc compote lait parmesan gruyere reblochon cheddar raclette chevre',
  'boucherie': 'poulet boeuf veau porc agneau dinde jambon lardon saucisse steak viande hache saumon cabillaud poisson crevette thon frais chorizo merguez escalope filet confit canard moule colin dorade saucisson cabillaud',
  'epicerie salee': 'pates riz semoule farine huile vinaigre sel poivre epice curry sauce ketchup mayonnaise moutarde conserve thon sardine lentille pois chiche haricot bouillon soupe chips cracker quinoa nouille pesto olive gnocchi coquillette tortilla wrap lasagne bechamel cumin chapelure cornichon sesame noix',
  'epicerie sucree': 'sucre chocolat cereale biscuit gateau confiture miel nutella cafe the tisane cacao bonbon gouter madeleine compote levure flocon avoine vanille cannelle gelatine granola mascarpone',
  'boissons': 'eau jus soda coca biere vin sirop limonade boisson',
  'surgeles': 'surgele glace frite pizza surgelee poelee nugget',
  'hygiene': 'shampoing gel douche savon dentifrice brosse a dents deodorant papier toilette mouchoir coton couche lingette rasoir creme solaire serviette hygienique tampon',
  'entretien': 'litiere croquette patee lessive adoucissant eponge liquide vaisselle pastille lave vaisselle sac poubelle javel nettoyant essuie tout aluminium film',
};
const AISLE_PHRASES = { 'lait de coco': 'epicerie salee', 'creme solaire': 'hygiene', 'pomme de terre': 'fruits', 'papier toilette': 'hygiene', 'liquide vaisselle': 'entretien', 'creme fraiche': 'cremerie',
  'pate brisee': 'cremerie', 'pate feuilletee': 'cremerie', 'pate a pizza': 'cremerie', 'coulis de tomate': 'epicerie salee', 'concass': 'epicerie salee',
  'haricots rouges': 'epicerie salee', 'poisson pane': 'surgeles', 'pate sablee': 'cremerie', 'confit de canard': 'boucherie', 'erable': 'epicerie sucree' };
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
  delete i.missing; delete i.auto; delete i.snooze;
}
// Retirer de la liste ; une suggestion automatique refusée attend le prochain cycle d'achat
function drop(i) {
  if (i.auto) i.snooze = Date.now();
  delete i.auto;
  i.need = false; i.done = false;
}
// Nouveaux articles tapés dans le champ : on demande d'abord (fenêtre) s'il faut les mettre sur la liste
// et/ou en indispensables. newItems = [{ name, qty }] en attente de cette réponse.
let newItems = [];
function askNewItems() {
  const one = newItems.length === 1, names = newItems.map(x => esc(x.name)).join(', ');
  const onList = tab !== 'catalog', pinned = tab === 'catalog' && catalogPins;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="overlay sheet-modal">
      <form id="newItemForm" class="card">
        <h2>${one ? 'Nouvel article' : `${newItems.length} nouveaux articles`}</h2>
        <p><strong>${names}</strong></p>
        ${one ? `<label class="field">Rayon<select name="aisle">${aisleOptions(guessAisle(newItems[0].name))}</select></label>` : ''}
        <label class="field check"><input type="checkbox" name="need"${onList ? ' checked' : ''}><span>${icon.cart} Ajouter à la liste</span></label>
        <label class="field check"><input type="checkbox" name="pin"${pinned ? ' checked' : ''}><span>${icon.starOn} Indispensable<br><small>Toujours en haut de la liste quand il en faut.</small></span></label>
        <button class="primary">${icon.check} Créer</button>
        <button type="button" class="ghost wide" data-a="cancelNew">Annuler</button>
      </form>
    </div>`);
  document.querySelector('#newItemForm .primary').focus();
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
  .filter(x => x.r && x.r.due >= 0.8 && !(x.i.snooze && Date.now() - x.i.snooze < x.r.every * DAY))
  .sort((a, b) => b.r.due - a.r.due);
// Pré-remplissage (option de la liste, active par défaut) : ce qui arrive à échéance revient sur la liste, marqué « suggéré »
function autoFill() {
  if (S.settings.autofill === false || myShopping()) return false;
  const due = suggestions().filter(x => x.r.due >= 1);
  due.forEach(({ i }) => { want(i); i.auto = true; delete i.by; });
  return due.length > 0;
}
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
function mapSvg(groups, find = null) { // find : rayon à montrer (« Où c'est ? »)
  const { cols, rows, cells, entry } = M();
  const todo = new Set(groups.filter(g => g.items.some(i => !i.done)).map(g => g.aisle.id));
  const visit = new Set(groups.map(g => g.aisle.id));
  const hue = id => Math.round(S.aisles.findIndex(a => a.id === id) * 360 / S.aisles.length);
  // Peintre : du fond (x + y petit) vers l'avant
  const blocks = Object.entries(cells).map(([c, id]) => [cell(c), id])
    .sort(([a], [b]) => a[0] + a[1] - b[0] - b[1] || a[0] - b[0])
    .map(([[x, y], id]) => id === find ? block(x, y, .9, 50, hue(id))
      : todo.has(id) ? block(x, y, .7, 60, hue(id))
      : visit.has(id) ? block(x, y, .7, 70, null, .55)
      : block(x, y, .35, 78, null)).join('');
  const floor = poly([[0, 0], [cols, 0], [cols, rows], [0, rows]], 'var(--card)', 'stroke="var(--line)" stroke-width=".04"');
  let door = '';
  if (entry) {
    const [x, y] = cell(entry);
    const [dx, dy] = iso(x + .5, y + .5);
    door = poly([[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]], 'var(--accent)', 'opacity=".35"')
      + `<text x="${dx}" y="${dy + .12}" font-size=".3" font-weight="700" text-anchor="middle" fill="var(--accent)">Entrée</text>`;
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
  // Balise sur le rayon cherché
  let beacon = '';
  if (find && centroid(find)) {
    const [fx, fy] = iso(...centroid(find), 1.6);
    const anim = (attr, v) => motion() ? `<animate attributeName="${attr}" values="${v}" dur="1.4s" repeatCount="indefinite"/>` : '';
    beacon = `<g class="beacon">
      <circle cx="${fx}" cy="${fy}" r=".7" fill="none" stroke="var(--accent)" stroke-width=".08">${anim('r', '.3;1.1')}${anim('opacity', '1;0')}</circle>
      <circle cx="${fx}" cy="${fy}" r=".26" fill="var(--accent)" stroke="var(--bg)" stroke-width=".06"/>
    </g>`;
  }
  const pad = .5;
  return `
    <svg class="map" viewBox="${-rows - pad} ${-1.7 - pad} ${cols + rows + 2 * pad} ${(cols + rows) / 2 + 1.7 + 2 * pad}">
      ${floor}${door}
      <polyline points="${path}" fill="none" stroke="var(--accent)" stroke-width=".1" stroke-dasharray=".25 .15" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>
      ${blocks}${pins}${beacon}
    </svg>`;
}

// ---------- Vues ----------

const lastPrice = i => i.prices?.length ? i.prices[i.prices.length - 1].p : null;
const euro = v => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const thumb = (i, add) => i.photo
  ? `<img class="thumb" src="${esc(i.photo)}" alt="" data-a="viewPhoto" data-id="${i.id}">`
  : add ? `<button class="ghost" data-a="photo" data-id="${i.id}" title="Photo">${icon.camera}</button>` : '';

// Qui est en courses en ce moment (« J'y vais », valable 3 h), plusieurs personnes possibles
const shoppers = () => Object.entries(S.shoppers).filter(([, at]) => Date.now() - at < 3 * 36e5);
const myShopping = () => shoppers().find(([n]) => n === (me || '?'))?.[1];
const shoppingBanner = () => {
  const others = shoppers().filter(([n]) => n !== (me || '?'));
  if (!others.length) return '';
  // En direct : depuis quand, combien pris, ce qui reste, le dernier article mis dans le caddie
  const left = S.items.filter(i => i.need && !i.done).length;
  const lines = others.map(([n, at]) => {
    const min = Math.round((Date.now() - at) / 6e4), taken = S.items.filter(i => i.need && i.done && i.doneBy === n);
    const last = taken.sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0))[0];
    return `<div><strong>${esc(n === '?' ? 'Quelqu\'un' : n)}</strong> est en courses ${min < 2 ? 'depuis un instant' : `depuis ${min} min`}
      <br><small>${taken.length} pris · encore ${left}${last && Date.now() - (last.doneAt || 0) < 10 * 6e4 ? ` · vient de prendre ${esc(last.name)}` : ''}</small></div>`;
  }).join('');
  return `<div class="banner live"><span class="dot"></span><div>${lines}<small>Ce que vous ajoutez ${others.length > 1 ? 'leur' : 'lui'} arrive.</small></div></div>`;
};
const mine = i => !i.doneBy || i.doneBy === (me || '?');
// L'autre personne en courses qui a pris une moitié du magasin : { name, part } ou null
const otherPart = () => {
  const o = shoppers().find(([n]) => n !== (me || '?') && [1, 2].includes(S.parts[n]));
  return o ? { name: o[0], part: S.parts[o[0]] } : null;
};
const partName = p => p === 1 ? 'le début' : 'la fin';
const othersShopping = () => shoppers().some(([n]) => n !== (me || '?'));
// Ajouté par quelqu'un d'autre depuis le début de mes courses
const isNew = i => { const at = myShopping(); return at && i.at > at && i.by !== me && !i.done; };
const byOf = i => Sync.config() && i.by ? ` <small>· ${esc(i.by)}</small>` : '';
const more = i => `<button class="ghost more" data-a="openItem" data-id="${i.id}" title="Fiche produit">${icon.right}</button>`;
const noteOf = i => i.note ? ` <small>${esc(i.note)}</small>` : '';
const shortDate = t => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

// Une ligne d'article, la même partout : toucher = dans le caddie (et inversement), › = fiche
const itemRow = i => `
  <div class="row big ${i.done ? 'done' : ''} ${isNew(i) ? 'new' : ''}" data-a="toggleDone" data-id="${i.id}" data-swipe="${i.id}">
    <span class="box"></span>
    <span class="name">${esc(i.name)}${noteOf(i)}${i.done ? (mine(i) ? '' : ` <small>· pris par ${esc(i.doneBy)}</small>`) : byOf(i)}${isNew(i) ? ' <small class="tag">nouveau</small>' : ''}${i.auto && !i.done ? ' <small class="tag">suggéré</small>' : ''}${i.missing && !i.done ? ` <small class="warn">${icon.alert} pas trouvé le ${shortDate(i.missing.at)}</small>` : ''}${i.alt && !i.done ? `<br><small>si absent : ${esc(i.alt)}</small>` : ''}</span>
    ${thumb(i)}${more(i)}
  </div>`;

// Rayons dans l'ordre où on les parcourt : circuit du magasin en courses (et ma moitié si on est deux)
function shoppingGroups() {
  let groups = byAisle(i => i.need);
  const order = route(groups.map(g => g.aisle.id));
  groups.sort((a, b) => order.indexOf(a.aisle.id) - order.indexOf(b.aisle.id));
  const mapped = groups.some(g => centroid(g.aisle.id));
  if (myShopping() && who && groups.length > 1) {
    let part;
    if (mapped && M().auto) part = splitRoute(groups)[who - 1];
    else { // ordre des rayons (plan ou non) : on coupe là où les articles s'équilibrent
      const total = groups.reduce((t, g) => t + g.items.length, 0);
      let acc = 0, cut = 1, best = Infinity;
      groups.forEach((g, k) => { acc += g.items.length; if (k < groups.length - 1 && Math.abs(total / 2 - acc) < best) { best = Math.abs(total / 2 - acc); cut = k + 1; } });
      part = (who === 1 ? groups.slice(0, cut) : groups.slice(cut)).map(g => g.aisle.id);
    }
    groups = part.map(id => groups.find(g => g.aisle.id === id));
  }
  return { groups, mapped };
}

// La mascotte : un panier qui se remplit à mesure qu'on coche, et sourit de plus en plus
function mascot(k) {
  const h = 22 * k, smile = 32 + 6 * k, full = k >= 1;
  return `<svg class="mascot ${full ? 'full' : ''}" viewBox="0 0 48 48" aria-hidden="true">
    <defs><clipPath id="mascotIn"><path d="M8 18h32l-4 22H12z"/></clipPath></defs>
    <rect x="0" y="${40 - h}" width="48" height="${h}" clip-path="url(#mascotIn)" fill="currentColor" opacity=".22"/>
    <path d="M16 18l6-10M32 18l-6-10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M8 18h32l-4 22H12z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
    ${full ? '<path d="M17 28l2.5-2.5L22 28M26 28l2.5-2.5L31 28" fill="none" stroke="var(--fg)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
      : '<circle cx="19.5" cy="27" r="1.8" fill="var(--fg)"/><circle cx="28.5" cy="27" r="1.8" fill="var(--fg)"/>'}
    <path d="M19 32Q24 ${smile} 29 32" fill="none" stroke="var(--fg)" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}

const views = {
  // LA liste : on la remplit à plusieurs, on la suit en magasin. Un seul geste : toucher = dans le caddie.
  list() {
    const need = S.items.filter(i => i.need);
    const shopping = !!myShopping();
    const { groups, mapped } = shoppingGroups();
    const pinnedTop = shopping ? [] : need.filter(i => i.pin && !i.done);
    const sections = [
      ...(pinnedTop.length ? [{ aisle: { name: 'Indispensables', icon: icon.starOn }, items: pinnedTop }] : []),
      ...groups.map((g, k) => ({ ...g, num: shopping && mapped ? k + 1 : 0, items: g.items.filter(i => !i.done && !pinnedTop.includes(i)) })),
      ...byAisle(i => i.need && !i.done, S.shops),
    ].filter(g => g.items.length);
    const cart = need.filter(i => i.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
    const myCart = cart.filter(mine);
    const estimate = need.filter(i => lastPrice(i) != null).reduce((t, i) => t + lastPrice(i), 0);
    const chips = suggestions().map(x => x.i).filter(i => !i.need);
    let hint = false;
    try { hint = !localStorage.getItem('courses.hint'); } catch {}
    return `
      ${Sync.config() && !me ? `
        <form id="meForm" class="card invite">
          <strong>Votre prénom ?</strong>
          <p class="hint">Il s'affiche sur vos ajouts, pour que tous sachent qui a demandé quoi.</p>
          <div class="add"><input name="name" placeholder="ex. Inès" autocomplete="given-name" required><button class="accent">OK</button></div>
        </form>` : welcomeInvite() || installCard()}
      ${shoppingBanner()}
      ${need.length ? `
        <div class="pace" role="progressbar" aria-valuemin="0" aria-valuemax="${need.length}" aria-valuenow="${cart.length}">
          ${mascot(cart.length / need.length)}
          <div>
            <div class="progress"><div style="width:${Math.round(100 * cart.length / need.length)}%"></div></div>
            <small>${!cart.length ? `${need.length} article${need.length > 1 ? 's' : ''} à prendre` : `${cart.length} sur ${need.length} dans le caddie${cart.length < need.length ? ` · encore ${need.length - cart.length}` : ''}`}</small>
          </div>
        </div>` : ''}
      ${shopping ? `
        <section class="card shopping">
          <div class="bar"><strong class="grow">${icon.cart} En courses</strong><button class="ghost" data-a="stopShopping">Arrêter</button></div>
          ${storePicker()}
          ${need.filter(i => !shopOf(i)).length > 3 ? `
          <div class="split">
            <p class="small">${otherPart() ? `${esc(otherPart().name)} a pris ${partName(otherPart().part)} du circuit${who === otherPart().part ? ' : choisissez l\'autre moitié, sinon vous ferez les mêmes rayons.' : '.'}` : shoppers().some(([n]) => n !== (me || '?')) ? 'Vous êtes deux en magasin : l\'un prend le début du circuit, l\'autre la fin.' : 'À deux en magasin ? Chacun prend une moitié du circuit.'}</p>
            <div class="seg">
              <button data-a="setWho" data-v="0" class="${who ? '' : 'active'}">Tout le magasin</button>
              <button data-a="setWho" data-v="1" class="${who === 1 ? 'active' : ''}">Début</button>
              <button data-a="setWho" data-v="2" class="${who === 2 ? 'active' : ''}">Fin</button>
            </div>
            ${who ? `<p class="small">${who === 1 ? 'Vous prenez le début' : 'Vous prenez la fin'} : ${groups.length ? groups.map(g => esc(g.aisle.name)).join(', ') : 'rien de plus à prendre'}. ${who === 1 ? 'L\'autre prend la fin.' : 'L\'autre prend le début.'}</p>` : ''}
          </div>` : ''}
          ${mapped ? `
          <form id="findForm" class="find"><input name="q" value="${esc(findQ)}" placeholder="Où est… ? (ex. café)" autocomplete="off" enterkeyhint="search"></form>
          <div id="findRes" class="chips">${findChips()}</div>
          ${spotLine(groups)}
          <details class="adv" data-k="shopMap" ${spot ? 'open' : ''}><summary>Plan du magasin</summary>
            <div class="seg">
              <button data-a="setAuto" data-v="1" class="${M().auto ? 'active' : ''}">Circuit le plus court</button>
              <button data-a="setAuto" data-v="" class="${M().auto ? '' : 'active'}">Ordre des rayons</button>
            </div>
            ${mapSvg(groups, spotAisle())}</details>` : ''}
        </section>` : ''}
      <form id="quick" class="addtop">
        <input name="name" value="${esc(quickDraft)}" placeholder="Ajouter… (lait, œufs, 2 kg tomates)" autocomplete="off" autocapitalize="sentences" required>
        <button class="accent" aria-label="Ajouter">${icon.plus}</button>
      </form>
      <div id="suggest" class="chips suggest">${suggestChips()}</div>
      ${hint && need.length ? `<p class="hint tip">Touchez un article quand il est dans le caddie. Glissez-le vers la gauche pour le retirer. <button class="ghost" data-a="hintDone">OK</button></p>` : ''}
      ${baskets().length && !shopping ? `
        <div class="chips">${baskets().filter(r => r.items.length).map(r => `<button class="chip" data-a="addBasket" data-id="${r.id}">${icon.basket} ${esc(r.name)}</button>`).join('')}</div>` : ''}
      ${chips.length && !shopping ? `
        <div class="chips">
          ${chips.slice(0, 12).map(i => `<button class="chip" data-a="toggleNeed" data-id="${i.id}">${icon.again} ${esc(i.name)}</button>`).join('')}
        </div>` : ''}
      ${sections.map(g => `
        <section>
          <h3>${g.num ? `<span class="num" style="background:${aisleColor(g.aisle.id)}">${g.num}</span>` : ''}${g.aisle.icon || ''}${esc(g.aisle.name)}</h3>
          <div class="rows">${g.items.map(itemRow).join('')}</div>
        </section>`).join('')}
      ${!need.length ? `
        <div class="empty-state">
          <p>Rien à acheter pour l'instant.</p>
          <p class="hint">Écrivez ce qu'il manque, touchez une suggestion, ou piochez dans vos articles.${Sync.config() ? ' Tout le monde voit la même liste.' : ''}</p>
        </div>` : need.every(i => i.done) ? `<div class="all-done"><span class="medal">${icon.check}</span><strong>Tout est dans le caddie !</strong><small>Il ne reste plus qu'à passer en caisse.</small></div>` : ''}
      ${cart.length ? `
        <section class="basket">
          <h3>${icon.basket} Dans le caddie · ${cart.length}</h3>
          <div class="rows">${cart.map(itemRow).join('')}</div>
        </section>` : ''}
      <div class="actions">
        ${myCart.length ? `<button class="primary" data-a="finish">${icon.check} Terminer les courses (${myCart.length})</button>`
          : need.length && !shopping ? `<button class="primary" data-a="goShopping">${icon.cart} J'y vais${estimate ? ` <small>≈ ${euro(estimate)}</small>` : ''}</button>` : ''}
        <div class="tools">
          <button data-a="go" data-v="catalog">${icon.plus}Articles</button>
          ${need.length ? `<button data-a="shareList">${icon.share}Envoyer</button><button data-a="clearList">${icon.trash}Vider</button>` : ''}
        </div>
      </div>`;
  },

  // Mes articles : TOUS les articles connus. Toucher = sur la liste ou non ; « Modifier » = ⭐ et fiche.
  // Filtre « Indispensables » : les gérer même nombreux (par rayon, recherche, tout ajouter d'un coup).
  catalog() {
    const nPins = S.items.filter(i => i.pin).length;
    return `
      <button class="ghost back" data-a="go" data-v="list">${icon.back} Liste</button>
      <h2>Mes articles</h2>
      <div class="seg">
        <button data-a="catalogPins" data-v="" class="${catalogPins || catalogBaskets ? '' : 'active'}">Tous <small>${S.items.length}</small></button>
        <button data-a="catalogPins" data-v="1" class="${catalogPins ? 'active' : ''}">${icon.star} Indispensables <small>${nPins}</small></button>
        <button data-a="catalogPins" data-v="baskets" class="${catalogBaskets ? 'active' : ''}">${icon.basket} Paniers <small>${baskets().length}</small></button>
      </div>
      ${catalogBaskets ? basketsPane() : `
      <p class="hint">${catalogEdit ? `Touchez ${icon.star} pour mettre un article en indispensable (toujours en haut de la liste), son nom pour sa fiche (rayon, photo…).`
        : catalogPins ? `Toujours en haut de la liste quand il en faut. Touchez ce qui manque aujourd'hui.` : `Touchez ce qui manque. ${icon.check} = déjà sur la liste, ${icon.starOn} = indispensable.`}</p>
      <div class="bar">
        ${catalogEdit ? '' : catalogPins ? (nPins ? '<button data-a="allPins">Tout ajouter</button>' : '') : ''}
        <button class="${catalogEdit ? 'accent grow' : 'ghost'}" data-a="catalogEdit">${catalogEdit ? `${icon.check} Terminé` : `${icon.edit} Modifier`}</button>
      </div>
      <form id="quick" class="addtop">
        <input name="name" value="${esc(quickDraft)}" placeholder="${catalogPins ? 'Chercher ou ajouter un indispensable…' : 'Chercher ou ajouter un article…'}" autocomplete="off" autocapitalize="sentences" required>
        <button class="accent" aria-label="Ajouter">${icon.plus}</button>
      </form>
      <div id="catalogItems">${catalogItems()}</div>`}`;
  },

  // Mes recettes : un seul champ pour chercher (nom, catégorie, ingrédient) ou créer ; rangées par catégorie
  recipes() {
    return `
      <button class="ghost back" data-a="go" data-v="meals">${icon.back} Repas</button>
      <h2>Mes recettes</h2>
      <form id="newRecipe" class="addtop">
        <input name="name" value="${esc(recipeDraft)}" placeholder="Chercher ou créer une recette…" autocomplete="off" autocapitalize="sentences" required>
        <button class="accent" aria-label="Créer">${icon.plus}</button>
      </form>
      <button class="wide" data-a="go" data-v="library">${icon.meals} Idées de recettes <small>${LIBRARY.length}</small></button>
      <div id="recipeItems">${recipeItems()}</div>
      <datalist id="recipeCats">${recipeCats().map(c => `<option value="${esc(c)}">`).join('')}</datalist>`;
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
    // Comparatif au même jour du mois dernier (un mois en cours ne se compare pas à un mois entier)
    const cut = new Date(y, m - 1, Math.min(day, new Date(y, m, 0).getDate()) + 1).getTime();
    const prevSame = paid.filter(t => t.date >= prevStart && t.date < cut);
    const diff = sum(month) - sum(prevSame), pct = sum(prevSame) ? Math.round(diff / sum(prevSame) * 100) : null;
    const byPlace = Object.entries(month.reduce((o, t) => ({ ...o, [t.place]: (o[t.place] || 0) + t.total }), {})).sort((a, b) => b[1] - a[1]);
    // Conso estimée : prix connu × fréquence d'achat (rythme), ramenée à 30 jours
    const tracked = S.items.map(i => ({ i, r: rhythm(i), p: lastPrice(i) })).filter(x => x.r && x.p != null);
    const monthlyUse = tracked.reduce((t, x) => t + x.p * 30 / x.r.every, 0);
    const priced = S.items.filter(i => i.prices?.length).sort((a, b) => b.prices.at(-1).d - a.prices.at(-1).d);
    const tile = (label, v, sub = '') => `<div class="tile"><small>${label}</small><strong>${v == null ? '—' : euro(v)}</strong><small>${sub}</small></div>`;
    return `
      <div class="hero">
        <small>Dépensé ce mois</small>
        <strong data-count="${sum(month)}">${euro(sum(month))}</strong>
        <small>${prev.length ? `mois dernier : ${euro(sum(prev))}` : `${month.length} passage${month.length > 1 ? 's' : ''} en caisse`}</small>
        ${budget ? `
          <div class="progress ${sum(month) > budget ? 'over' : ''}"><div style="width:${Math.min(100, 100 * sum(month) / budget)}%"></div></div>
          <small>${sum(month) > budget ? `Budget dépassé de ${euro(sum(month) - budget)}` : `Reste ${euro(budget - sum(month))} sur ${euro(budget)}`}</small>` : ''}
      </div>
      <form id="budgetForm" class="add">
        <label class="small grow">Budget mensuel (€)</label>
        <input name="name" inputmode="decimal" value="${budget ?? ''}" placeholder="ex. 600" style="flex:0 0 110px">
        <button>OK</button>
      </form>
      ${moneyTop()}
      <details class="adv" data-k="figures"><summary>Plus de chiffres et budget mensuel</summary>
      <div class="tiles">
        ${tile('Ce mois-ci', sum(month), `${month.length} passage${month.length > 1 ? 's' : ''}`)}
        ${tile('Mois dernier', sum(prev), `${prev.length} passage${prev.length > 1 ? 's' : ''}`)}
        ${tile('Au même jour le mois dernier', sum(prevSame), !prevSame.length && !month.length ? '' : pct == null ? 'pas de comparaison' : `<span class="${diff > 0 ? 'up' : 'down'}">${diff > 0 ? '+' : diff < 0 ? '−' : ''}${euro(Math.abs(diff))} (${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct)} %)</span> ce mois-ci`)}
        ${tile('Fin de mois (estim.)', projection, 'au rythme des 3 derniers mois')}
        ${tile('Panier moyen', avg, '3 derniers mois')}
        ${tracked.length ? tile('Conso estimée / mois', monthlyUse, `${tracked.length} produit${tracked.length > 1 ? 's' : ''} suivi${tracked.length > 1 ? 's' : ''} (prix × fréquence)`) : ''}
      </div>
      ${budget && projection != null && projection > budget ? '<p class="count">Attention : à ce rythme, le budget sera dépassé en fin de mois.</p>' : ''}
      ${byPlace.length > 1 ? `<h3>Ce mois par magasin</h3>${byPlace.map(([p, v]) => `<div class="row static"><span class="name">${esc(p)}</span><span>${euro(v)}</span></div>`).join('')}` : ''}
      ${priced.length ? `<h3>Prix suivis</h3>${priced.slice(0, 15).map(i => {
        const [a, b] = [i.prices.at(-2)?.p, i.prices.at(-1).p], diff = a ? Math.round((b - a) / a * 100) : 0;
        return `<div class="row" data-a="openItem" data-id="${i.id}"><span class="name">${esc(i.name)} <small>${esc(i.prices.at(-1).at || '')}</small></span>${diff ? `<small class="${diff > 0 ? 'up' : 'down'}">${diff > 0 ? icon.up : icon.dn} ${Math.abs(diff)} %</small>` : ''}<span>${euro(b)}</span></div>`;
      }).join('')}` : ''}
      </details>
      <h3>Passages en caisse <small>${S.trips.length}</small></h3>
      ${[...S.trips].sort((a, b) => b.date - a.date).slice(0, tripsShown).map(t => `
        <div class="row" data-a="openTrip" data-id="${t.id}">
          <span class="name">${shortDate(t.date)} · ${esc(t.type === 'settle' ? `${t.from} → ${t.to}` : t.place)}${t.n ? ` <small>${t.n} art.</small>` : ''}${S.settings.split && t.by && t.type !== 'settle' ? ` <small>· payé par ${esc(t.by)}${partsSum(t) ? `, ${euro(partsSum(t))} hors partage` : ''}</small>` : ''}${t.names?.length ? `<br><small>${t.names.slice(0, 12).map(esc).join(', ')}${t.names.length > 12 ? '…' : ''}</small>` : ''}</span>
          <span>${t.total == null ? '<small>Ajouter €</small>' : euro(t.total)}</span>${icon.right}
        </div>`).join('') || '<p class="hint">Le montant est demandé (facultatif) quand vous terminez des courses.</p>'}
      ${S.trips.length > tripsShown ? `<button class="wide" data-a="moreTrips">Voir les passages plus anciens (${S.trips.length - tripsShown})</button>` : ''}
      ${S.trips.length ? '<p class="hint">Touchez un ticket pour corriger le montant ou ajouter des articles pris en plus de la liste.</p>' : ''}
      ${paid.length ? `<button class="wide" data-a="exportMonths">${icon.share} Exporter l'historique par mois (tableur)</button>` : ''}`;
  },

  aisles() {
    const st = store(), list = orderedAisles();
    return `
      <button class="ghost back" data-a="go" data-v="${settingsBack}">${icon.back} Retour</button>
      <h2>Réglages</h2>
      <h3>Cette liste</h3>
      <label class="field">Nom<input id="listTitle" value="${esc(currentList().name)}" autocomplete="off"></label>
      <label class="field check"><input type="checkbox" id="autofill"${S.settings.autofill !== false ? ' checked' : ''}><span>Pré-remplir la liste<br><small>Ce qui est acheté régulièrement (au moins 2 achats) revient de lui-même quand c'est le moment, marqué « suggéré ». Retiré, il attend le prochain cycle.</small></span></label>
      <label class="field check"><input type="checkbox" id="split"${S.settings.split ? ' checked' : ''}><span>Partager les dépenses<br><small>Qui a payé quoi, qui doit combien à qui (colocation, courses pour un proche). Décoché : compte joint, on suit juste le budget commun.</small></span></label>
      ${Sync.config() ? `
        <p class="hint">Liste partagée${members().length > 1 ? ` avec ${members().filter(m => m !== me).map(esc).join(', ')}` : ''}. Les modifications faites sans réseau partent dès qu'il revient.</p>
        <div class="bar">
          <button class="accent" data-a="invite">${icon.send} Inviter quelqu'un</button>
          <button data-a="syncNow">Synchroniser</button>
          <button class="ghost" data-a="leave">Ne plus partager</button>
        </div>` : `
        <button class="accent wide" data-a="shareNow">${icon.send} Partager cette liste</button>
        <details class="adv" data-k="server"><summary>Serveur de partage</summary>
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
      ${installed() ? '' : `<h3>Installer l'app</h3>
      <p class="hint">Sur l'écran d'accueil, Courses s'ouvre comme une app, en plein écran et sans réseau.</p>
      ${installSteps()}${installKeep()}`}
      <h3>Notifications</h3>
      ${'Notification' in window ? (Notification.permission === 'granted' ? `<p class="hint">${icon.check} Ce téléphone vous prévient (ajouts, départ en courses, articles pris pour vous) tant que l'app est ouverte ou en arrière-plan.</p>`
        : Notification.permission === 'denied' ? '<p class="hint">Notifications refusées : à réactiver dans les réglages du téléphone.</p>'
        : `<button class="wide" data-a="askNotify">${icon.bell} Activer les notifications</button>`) : '<p class="hint">Ce navigateur ne gère pas les notifications. Sur iPhone : ajoutez l\'app à l\'écran d\'accueil.</p>'}
      <h3>Magasins et rayons</h3>
      ${storePicker(true)}
      <details class="adv" data-k="aisles"><summary>Rayons (${list.length})</summary>
      <p class="hint">${st ? `Ordre des rayons chez ${esc(st.name)}${M().auto && Object.keys(M().cells).length ? ' (le plan prime pour les rayons placés)' : ''}.` : 'Ordre générique, utilisé dans les magasins non cartographiés.'}</p>
      ${list.map((a, k) => `
        <div class="row static">
          <span class="dot" style="background:${aisleColor(a.id)}"></span>
          <span class="name">${esc(a.name)} <small>${S.items.filter(i => i.aisle === a.id).length}</small></span>
          <button class="ghost" data-a="move" data-id="${a.id}" data-d="-1" ${k ? '' : 'disabled'} title="Monter">${icon.up}</button>
          <button class="ghost" data-a="move" data-id="${a.id}" data-d="1" ${k < list.length - 1 ? '' : 'disabled'} title="Descendre">${icon.dn}</button>
          <button class="ghost" data-a="rename" data-id="${a.id}" title="Renommer">${icon.edit}</button>
          <button class="ghost" data-a="delAisle" data-id="${a.id}" title="Supprimer">${icon.x}</button>
        </div>`).join('')}
      <form id="addAisle" class="add">
        <input name="name" placeholder="Nouveau rayon" required>
        <button>Ajouter</button>
      </form>
      </details>
      <details class="adv" data-k="shops"><summary>Commerces (${S.shops.length})</summary>
      <p class="hint">Boulangerie, boucher, marché… : leurs articles ont leur propre liste en courses.</p>
      ${S.shops.map(sh => `
        <div class="row static">
          <span class="name">${esc(sh.name)} <small>${S.items.filter(i => i.aisle === sh.id).length}</small></span>
          <button class="ghost" data-a="renameShop" data-id="${sh.id}" title="Renommer">${icon.edit}</button>
          <button class="ghost" data-a="delShop" data-id="${sh.id}" title="Supprimer">${icon.x}</button>
        </div>`).join('')}
      <form id="addShop" class="add">
        <input name="name" placeholder="Nouveau commerce (ex. Poissonnier)" required>
        <button>Ajouter</button>
      </form>
      </details>
      <details class="adv" data-k="plan"><summary>Plan du magasin et circuit</summary>
      ${st ? `
      <p class="hint">Plan de ${esc(st.name)}, approximatif. Choisissez l'entrée ou un rayon, puis touchez ou glissez sur les cases.</p>
      <div class="palette">
        <button data-a="setBrush" data-v="entry" class="${brush === 'entry' ? 'on' : ''}">${icon.door} Entrée</button>
        ${S.aisles.map(a => `<button data-a="setBrush" data-v="${a.id}" class="${a.id === brush ? 'on' : ''}"><span class="dot" style="background:${aisleColor(a.id)}"></span>${esc(a.name)}</button>`).join('')}
        <button data-a="setBrush" data-v="" class="${brush === '' ? 'on' : ''}">${icon.x} Gomme</button>
      </div>
      <div class="grid" id="planGrid" style="grid-template-columns:repeat(${st.map.cols},1fr)">
        ${Array.from({ length: st.map.rows * st.map.cols }, (_, n) => {
          const c = `${n % st.map.cols},${Math.floor(n / st.map.cols)}`;
          return `<div class="cell" data-c="${c}"${cellStyle(st.map, c)}>${cellLabel(st.map, c)}</div>`;
        }).join('')}
      </div>
      <div class="bar sizes">
        <span class="small">Largeur</span>
        <button class="ghost" data-a="size" data-dim="cols" data-d="-1" aria-label="Moins large">−</button><b>${st.map.cols}</b><button class="ghost" data-a="size" data-dim="cols" data-d="1" aria-label="Plus large">+</button>
        <span class="small">Profondeur</span>
        <button class="ghost" data-a="size" data-dim="rows" data-d="-1" aria-label="Moins profond">−</button><b>${st.map.rows}</b><button class="ghost" data-a="size" data-dim="rows" data-d="1" aria-label="Plus profond">+</button>
      </div>
      ${Object.keys(st.map.cells).length ? `<p class="small">Aperçu</p>${mapSvg(route(S.aisles.map(a => a.id).filter(id => Object.values(st.map.cells).includes(id))).map(id => ({ aisle: S.aisles.find(a => a.id === id), items: [{}] })))}` : ''}
      <label class="small"><input type="checkbox" id="auto"${st.map.auto ? ' checked' : ''}> Calculer le circuit le plus court à partir du plan (entrée puis rayons, puis caisses)</label>`
      : '<p class="hint">Magasin non cartographié : choisissez ou créez un magasin pour dessiner son plan.</p>'}
      </details>
      <h3>Données</h3>
      <div class="bar">
        <button data-a="export">Exporter</button>
        <label class="btn">Importer<input type="file" accept="application/json" id="import" hidden></label>
        <button data-a="reset">Réinitialiser</button>
      </div>
      <p class="hint">Vos listes sont sur ce téléphone : exportez-les de temps en temps. <a href="site/cgu.html" target="_blank" rel="noopener">Conditions et confidentialité</a></p>`;
  },
};

// Où suis-je ? Chaque supermarché a son ordre de rayons et son plan ; « autre magasin » = ordre générique
const storePicker = manage => `
  <div class="bar">
    <span class="pin-ic">${icon.pin}</span>
    <select id="store" class="grow">
      ${S.stores.map(s => `<option value="${s.id}"${s === store() ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}
      <option value="none"${store() ? '' : ' selected'}>Autre magasin (ordre standard)</option>
    </select>
    ${manage ? `
      <button class="ghost" data-a="newStore" title="Nouveau magasin">${icon.plus}</button>
      ${store() ? `<button class="ghost" data-a="renameStore" title="Renommer">${icon.edit}</button>
      <button class="ghost" data-a="delStore" title="Supprimer">${icon.x}</button>` : ''}` : ''}
  </div>`;

// Ajout : dès les premières lettres, propositions parmi les articles déjà connus (accents et pluriels ignorés).
// On cherche sur le dernier article tapé (« lait, tom » -> tom), sans la quantité (« 2 kg tom » -> tom).
// Petit retour haptique : vibration (Android) ou, sur iPhone, le « clic » d'un interrupteur natif
function tick() {
  if (navigator.vibrate) return navigator.vibrate(12);
  try {
    let l = document.getElementById('haptic');
    if (!l) { l = Object.assign(document.createElement('label'), { id: 'haptic', ariaHidden: 'true', innerHTML: '<input type="checkbox" switch tabindex="-1">' }); document.body.append(l); }
    l.click();
  } catch {}
}
const motion = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
let flyFrom = null; // position de la ligne avant qu'elle parte dans le caddie
let popId = null; // article qu'on vient de cocher : petite animation après le rendu
let quickDraft = '', refocusQuick = false, refocusSel = null; // champ à reprendre après le rendu
const refocusQuickInput = () => app.querySelector('#quick input')?.focus();
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
// « Où c'est ? » en magasin : on cherche un article, son rayon s'allume sur le plan
let findQ = '', spot = null;
const spotAisle = () => { const i = spot && item(spot); return i && !shopOf(i) ? i.aisle : null; };
const findChips = () => matches(findQ).map(i => `<button type="button" class="chip" data-a="locate" data-id="${i.id}">${icon.pin || ''}${esc(i.name)}</button>`).join('');
function spotLine(groups) {
  const i = spot && item(spot);
  if (!i) return '';
  const a = S.aisles.find(x => x.id === i.aisle), k = groups.findIndex(g => g.aisle.id === i.aisle);
  const where = shopOf(i) ? `chez ${esc(shopOf(i).name)}, pas dans ce magasin`
    : !centroid(i.aisle) ? `rayon ${esc(a?.name || '?')}, pas encore placé sur le plan`
    : `rayon ${esc(a?.name || '?')}${k >= 0 ? `, arrêt n° ${k + 1} du circuit` : ''}`;
  return `<p class="spot">${icon.pin}<span><strong>${esc(i.name)}</strong> : ${where}</span><button class="ghost" data-a="locate" data-id="" aria-label="Fermer">${icon.x}</button></p>`;
}
const suggestChips = () => matches(lastPart(quickDraft)).map(i => {
  const where = shopOf(i)?.name || S.aisles.find(a => a.id === i.aisle)?.name || '';
  return `<button type="button" class="chip ${i.need ? 'on' : ''}" data-a="pickSuggest" data-id="${i.id}">${i.need ? icon.check : ''}${esc(i.name)} <small>${esc(where)}</small></button>`;
}).join('');

// Contenu de « Mes articles », filtré par ce qu'on tape dans le champ (recherche)
function catalogItems() {
  const q = sameKey(lastPart(quickDraft));
  const shown = i => !q || sameKey(i.name).split(' ').some(w => w.startsWith(q)) || sameKey(i.name).includes(q);
  const chip = i => `<button class="chip ${i.need ? 'on' : ''}" data-a="toggleNeed" data-id="${i.id}">${i.need ? icon.check : i.pin && !catalogPins ? icon.starOn : ''}${esc(i.name)}</button>`;
  const row = i => `
    <div class="row static">
      <span class="name link" data-a="openItem" data-id="${i.id}">${esc(i.name)}${noteOf(i)}</span>
      <button class="ghost star ${i.pin ? 'on' : ''}" data-a="pin" data-id="${i.id}" title="${i.pin ? 'Retirer des indispensables' : 'Mettre en indispensable'}">${i.pin ? icon.starOn : icon.star}</button>
    </div>`;
  const block = items => catalogEdit ? items.map(row).join('') : `<div class="chips">${items.map(chip).join('')}</div>`;
  const keep = i => shown(i) && (!catalogPins || i.pin);
  const groups = [...byAisle(keep), ...byAisle(keep, S.shops)];
  if (!groups.length) return q ? `<p class="hint center">Aucun ${catalogPins ? 'indispensable' : 'article'} « ${esc(lastPart(quickDraft))} » : touchez + pour le créer.</p>`
    : `<p class="hint center">Aucun indispensable pour l'instant : écrivez-en un ci-dessus, ou touchez Modifier puis ${icon.star}.</p>`;
  return groups.map(g => `<section><h3>${esc(g.aisle.name)} <small>${g.items.length}</small></h3>${block(g.items)}</section>`).join('');
}

// Recettes rangées par catégorie (« Autres » à la fin), filtrées par ce qu'on tape
let recipeDraft = '';
const recipeCats = () => [...new Set(cookbook().map(r => r.cat).filter(Boolean))].sort((a, b) => a.localeCompare(b));
function recipeGroups(q = '') {
  const k = sameKey(q);
  const shown = r => !k || [r.name, r.cat || '', ...r.items.map(id => item(id)?.name || '')].some(t => sameKey(t).includes(k));
  const rs = cookbook().filter(r => shown(r) || r.id === recipeEdit).sort((a, b) => a.name.localeCompare(b.name));
  return [...recipeCats(), ''].map(cat => ({ cat: cat || 'Autres', rs: rs.filter(r => (r.cat || '') === cat) })).filter(g => g.rs.length);
}
function recipeItems() {
  const groups = recipeGroups(recipeDraft), named = groups.length > 1 || groups[0]?.cat !== 'Autres';
  if (!groups.length) return recipeDraft ? `<p class="hint center">Aucune recette « ${esc(recipeDraft)} » : touchez + pour la créer.</p>`
    : '<p class="empty">Aucune recette pour l\'instant.</p><p class="hint center">Écrivez son nom ci-dessus, puis ses ingrédients et quantités.</p>';
  return groups.map(g => `<section>${named ? `<h3>${esc(g.cat)} <small>${g.rs.length}</small></h3>` : ''}${g.rs.map(recipeCard).join('')}</section>`).join('');
}

// Ingrédients d'une recette : on pioche dans les articles existants dès les premières lettres,
// ou on crée l'article sans quitter la recette (pas mis sur la liste)
let linkDraft = '';
function linkChips(r) {
  const q = lastPart(linkDraft);
  if (!q) return '';
  const where = i => shopOf(i)?.name || S.aisles.find(a => a.id === i.aisle)?.name || '';
  const found = matches(q).filter(i => !r.items.includes(i.id));
  const exact = findItem(q);
  return `${found.map(i => `<button type="button" class="chip" data-a="pickLink" data-r="${r.id}" data-id="${i.id}">${esc(i.name)} <small>${esc(where(i))}</small></button>`).join('')}
    ${exact ? '' : `<button type="button" class="chip new" data-a="linkNew" data-r="${r.id}">${icon.plus}Créer « ${esc(cap(q))} » <small>${esc(S.aisles.find(a => a.id === guessAisle(q))?.name || '')}</small></button>`}`;
}
// Lie un article (existant ou créé) à la recette ; garde ce qui a été tapé avant la dernière virgule
function linkTo(r, i) {
  if (!r.items.includes(i.id)) r.items.push(i.id);
  const parts = linkDraft.split(/[,;]/); parts.pop();
  linkDraft = parts.length ? parts.join(',') + ', ' : '';
  refocusSel = '#link input';
}
let tripsShown = 20; // passages en caisse affichés dans Dépenses
let catalogEdit = false, catalogPins = false, catalogBaskets = false; // « Mes articles » : modification, filtres

// Mes articles > Paniers : des articles achetés ensemble, ajoutés à la liste d'un geste
const basketsPane = () => `
  <p class="hint">Un panier regroupe des articles achetés ensemble (bébé, apéro, chat…). « Ajouter à la liste » : on décoche ce qu'on a déjà.</p>
  <form id="newBasket" class="addtop">
    <input name="name" placeholder="Nouveau panier (ex. Bébé)" autocomplete="off" autocapitalize="sentences" required>
    <button class="accent" aria-label="Créer">${icon.plus}</button>
  </form>
  ${baskets().map(recipeCard).join('') || '<p class="empty">Aucun panier pour l\'instant.</p>'}`;

let lastTab = null;
// Liste à l'écran (ou en courses) : écran maintenu allumé, si le téléphone le permet (iPhone : iOS 18.4 et +).
// Le verrou tombe quand l'app passe en arrière-plan : on le reprend au retour et au premier toucher.
const awake = () => tab === 'list' || !!myShopping();
let wake = null, waking = false;
async function keepAwake(on) {
  try {
    if (on && !wake && !waking && navigator.wakeLock && document.visibilityState === 'visible') {
      waking = true;
      wake = await navigator.wakeLock.request('screen').finally(() => { waking = false; });
      wake.addEventListener('release', () => { wake = null; });
    } else if (!on && wake) { wake.release(); wake = null; }
  } catch {}
}
document.addEventListener('visibilitychange', () => keepAwake(awake()));
document.addEventListener('pointerdown', () => { if (!wake && awake()) keepAwake(true); });
document.addEventListener('input', e => {
  if (e.target.id === 'welcomeName') setMe(e.target.value);
  if (e.target.closest('#link')) {
    linkDraft = e.target.value;
    const box = document.getElementById('linkSuggest');
    if (box) box.innerHTML = linkChips(recipe(e.target.form.dataset.id));
  }
  if (e.target.closest('#newRecipe')) {
    recipeDraft = e.target.value;
    const box = document.getElementById('recipeItems');
    if (box) box.innerHTML = recipeItems();
  }
  if (e.target.closest('#findForm')) {
    findQ = e.target.value;
    const box = document.getElementById('findRes');
    if (box) box.innerHTML = findChips();
  }
  if (e.target.closest('#quick')) {
    quickDraft = e.target.value;
    const box = document.getElementById('suggest'), cat = document.getElementById('catalogItems');
    if (box) box.innerHTML = suggestChips();
    if (cat) cat.innerHTML = catalogItems();
  }
});
function render() {
  if (!S.aisles.length) {
    app.innerHTML = `<p class="empty">${tab === 'aisles' ? '' : 'En attente de la première synchronisation…'}</p>${tab === 'aisles' ? views.aisles() : ''}`;
    return;
  }
  if (brush === null || (brush && brush !== 'entry' && !S.aisles.some(a => a.id === brush))) brush = S.aisles[0].id;
  // Les panneaux dépliés le restent quand l'écran se redessine (sinon chaque modification les refermait)
  const open = tab === lastTab ? new Set([...app.querySelectorAll('details[data-k][open]')].map(d => d.dataset.k)) : new Set();
  const rowKey = r => (r.closest('.basket') ? 'c' : 'l') + r.dataset.id;
  const before = tab === 'list' && tab === lastTab ? new Set([...app.querySelectorAll('.row[data-swipe]')].map(rowKey)) : null;
  app.innerHTML = views[tab]();
  app.querySelectorAll('details[data-k]').forEach(d => { if (open.has(d.dataset.k)) d.open = true; });
  if (refocusSel) {
    const l = app.querySelector(refocusSel);
    refocusSel = null;
    l?.focus();
    l?.setSelectionRange(l.value.length, l.value.length);
  }
  if (refocusQuick) {
    refocusQuick = false;
    const q = app.querySelector('#quick input');
    q?.focus();
    q?.setSelectionRange(q.value.length, q.value.length);
  }
  if (popId) {
    const row = app.querySelector(`.row[data-id="${popId}"].done`);
    row?.classList.add('pop');
    // l'article « vole » de sa place jusqu'au caddie
    if (row && flyFrom != null && motion()) {
      const dy = flyFrom - row.getBoundingClientRect().top;
      if (Math.abs(dy) > 4) row.animate([{ transform: `translateY(${dy}px)`, opacity: .5 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    popId = null; flyFrom = null;
  }
  // un nouvel article (le mien ou celui d'un autre) glisse en place
  if (before && motion()) {
    const fresh = [...app.querySelectorAll('.row[data-swipe]')].filter(r => !before.has(rowKey(r)) && !r.classList.contains('pop'));
    if (fresh.length <= 8) fresh.forEach(r => r.animate([{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'ease-out' }));
  }
  // changement d'onglet : fondu léger ; chiffres du budget qui défilent
  if (tab !== lastTab && lastTab !== null && motion()) {
    app.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'ease-out' });
    app.querySelectorAll('[data-count]').forEach(el => {
      const v = +el.dataset.count, t0 = performance.now();
      const step = t => { const k = Math.min(1, (t - t0) / 700); el.textContent = euro(v * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }
  if (tab !== lastTab) scrollTo(0, 0);
  lastTab = tab;
  // Onglet allumé : la section dont dépend l'écran courant
  const parent = { catalog: 'list', recipes: 'meals', library: 'meals', activity: 'list', trip: 'budget' };
  const section = parent[tab === 'item' ? sheetBack : tab] ?? (tab === 'item' ? sheetBack : tab);
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === section));
  document.getElementById('gear')?.classList.toggle('active', tab === 'aisles');
  document.body.classList.toggle('bare', tab === 'welcome');
  const l = currentList(), ln = document.getElementById('listName');
  if (ln) ln.innerHTML = `${esc(l.name)}${icon.down}`;
  const unseen = feed().filter(e => !e.seen).length, bell = document.getElementById('bell');
  if (bell) bell.dataset.count = unseen || '';
  keepAwake(awake());
}

function recipeCard(r) {
  const its = r.items.map(item).filter(Boolean);
  if (recipeEdit === r.id) return `
    <section class="card">
      <div class="bar">
        <input id="rname" data-id="${r.id}" value="${esc(r.name)}" class="grow">
        <button data-a="closeRecipe">OK</button>
      </div>
      ${isBasket(r) ? '' : `<label class="field">Catégorie<input id="rcat" data-id="${r.id}" list="recipeCats" value="${esc(r.cat || '')}" placeholder="ex. Plats, Desserts, Rapide" autocomplete="off"></label>`}
      ${its.map(i => `
        <div class="row static">
          <span class="name link" data-a="openItem" data-id="${i.id}">${esc(i.name)}</span>
          <input class="qty" data-rqty="${r.id}:${i.id}" value="${esc(r.qty?.[i.id] || '')}" placeholder="qté" aria-label="Quantité">
          <button class="ghost" data-a="unlink" data-id="${r.id}" data-item="${i.id}" title="Retirer">${icon.x}</button>
        </div>`).join('')}
      <form id="link" data-id="${r.id}" class="addtop">
        <input name="name" value="${esc(linkDraft)}" placeholder="${isBasket(r) ? 'Ajouter un article…' : 'Ajouter un ingrédient…'}" autocomplete="off" autocapitalize="sentences" required>
        <button class="accent" aria-label="Ajouter">${icon.plus}</button>
      </form>
      <div id="linkSuggest" class="chips suggest">${linkChips(r)}</div>
      <button class="ghost" data-a="delRecipe" data-id="${r.id}">Supprimer ${isBasket(r) ? 'le panier' : 'la recette'}</button>
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
        <strong class="grow link" data-a="editRecipe" data-id="${r.id}" title="Modifier">${esc(r.name)}</strong>
        <button data-a="startRecipe" data-id="${r.id}" ${its.length ? '' : 'disabled'}>Ajouter à la liste</button>
      </div>
      <p class="small">${its.map(i => esc(i.name)).join(' · ') || 'Aucun article lié'}</p>
    </section>`;
}

// ---------- Accueil : moins d'une minute pour démarrer ----------

let welcomeJoin = false;
views.welcome = () => `
  <div class="welcome">
    <div class="logo">${icon.cart}</div>
    <h2>La liste de courses du foyer</h2>
    <p class="hint">Tout le monde ajoute ce qui manque, la liste marche même sans réseau au magasin.</p>
    ${ios && !installed() ? `<div class="card invite">
      <strong>D'abord, installez l'app</strong>
      <p class="hint">Sur iPhone, l'app installée ne voit pas ce qui est fait dans Safari : installez-la, puis commencez depuis son icône.</p>
      ${installSteps()}
    </div>` : ''}
    <label class="field">Votre prénom<input id="welcomeName" value="${esc(me)}" placeholder="ex. Léa" autocomplete="given-name"></label>
    ${welcomeJoin ? `
      <form id="joinForm" class="add">
        <input name="name" placeholder="Collez le lien d'invitation reçu" autocomplete="off" required>
        <button class="accent">Rejoindre</button>
      </form>
      <button class="ghost wide" data-a="welcomeBack">${icon.back} Retour</button>` : `
      <button class="primary" data-a="welcomeCreate">Créer la liste du foyer</button>
      <button class="wide" data-a="welcomeJoin">J'ai reçu un lien d'invitation</button>
      <button class="ghost wide" data-a="welcomeSolo">Juste pour moi, sans partage</button>`}
    <p class="hint legal">En continuant, vous acceptez les <a href="site/cgu.html" target="_blank" rel="noopener">conditions d'utilisation et de confidentialité</a>.</p>
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
      <div class="bar"><button class="accent grow" data-a="invite">${icon.send} Envoyer l'invitation</button><button class="ghost" data-a="inviteDone">Plus tard</button></div>
    </div>`;
};

// ---------- Installer sur l'écran d'accueil ----------
// Installée : icône, plein écran, hors-ligne. Sur iPhone, Safari efface les données d'un site non installé
// après 7 jours sans visite, et l'app installée a son propre stockage (elle ne voit pas ce qui a été fait dans Safari).

const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const phone = ios || /Android/.test(navigator.userAgent);
let installPrompt = null; // Android (Chrome, Edge…) : la vraie fenêtre d'installation du navigateur
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; render(); });
addEventListener('appinstalled', () => { installPrompt = null; render(); });
// Lien « …/?installer » (page d'installation du site) : montrer le guide même s'il a été repoussé
if (/[?&]installer\b/.test(location.search)) try { localStorage.removeItem('courses.installLater'); } catch {}

const installSteps = () => installPrompt ? `<button class="accent wide" data-a="install">${icon.addHome} Installer l'app</button>`
  : ios ? `<ol class="steps">
      <li>Touchez ${icon.share} <b>Partager</b> (dans Safari récent : d'abord ${icon.dots})</li>
      <li>Choisissez ${icon.addHome} <b>Sur l'écran d'accueil</b></li>
      <li>Touchez <b>Ajouter</b> : l'icône Courses apparaît, ouvrez l'app depuis elle</li>
    </ol>`
  : `<ol class="steps">
      <li>Ouvrez le menu ${icon.more} du navigateur</li>
      <li>Choisissez <b>Installer l'application</b> ou <b>Ajouter à l'écran d'accueil</b></li>
    </ol>`;

// iPhone : ce qui a été fait dans Safari ne suit pas dans l'app installée ; la liste partagée se rejoint par son lien
const installKeep = () => !ios || !hasOwnData() ? ''
  : Sync.config() ? `<p class="hint">L'app installée repart de zéro : gardez le lien de cette liste pour la rejoindre depuis l'app.</p>
      <button class="wide" data-a="invite">${icon.send} M'envoyer le lien de la liste</button>`
  : '<p class="hint">L\'app installée repart de zéro : pour y retrouver vos articles, partagez d\'abord cette liste (Réglages), puis rejoignez-la depuis l\'app avec son lien.</p>';

// Carte en haut de la liste (téléphone, pas encore installée) ; « Plus tard » la repousse de 3 jours
const installCard = () => {
  if (installed() || (!phone && !installPrompt)) return '';
  let later = 0;
  try { later = +localStorage.getItem('courses.installLater') || 0; } catch {}
  if (Date.now() - later < 3 * 864e5) return '';
  return `
    <div class="card invite">
      <strong>Installer Courses sur ce téléphone</strong>
      <p class="hint">Une icône sur l'écran d'accueil, en plein écran, même sans réseau${ios ? ' ; et l\'iPhone garde vos données (dans Safari, il les efface après 7 jours sans visite)' : ''}.</p>
      ${installSteps()}
      ${installKeep()}
      <div class="bar"><button class="ghost" data-a="installLater">Plus tard</button></div>
    </div>`;
};

// Ce téléphone a-t-il déjà utilisé cette liste ? (sinon, on peut y rejoindre une liste partagée)
const hasOwnData = () => S.trips.length > 0 || S.items.some(i => i.need || i.bought?.length || i.prices?.length);

function finishWelcome(next) {
  try { localStorage.setItem('courses.welcome', '1'); } catch {}
  welcomed = true;
  tab = next;
}

// Éditeur de plan : une case, la couleur de son rayon (légende = palette), la porte pour l'entrée.
// Pas de numéro : l'ordre du circuit se lit dans l'aperçu.
const cellStyle = (m, c) => m.cells[c] ? ` style="background:${aisleColor(m.cells[c])}"` : '';
const cellLabel = (m, c) => m.entry === c ? icon.door : '';

// Peindre en glissant : le premier toucher décide (poser le rayon ou effacer), les cases suivent le doigt.
// Les cases sont mises à jour sur place pendant le geste ; on enregistre et on redessine au lâcher.
let painting = null;
function paintCell(el) {
  const m = store().map, c = el.dataset.c;
  if (brush === 'entry') { if (painting.first) m.entry = m.entry === c ? null : c; }
  else if (painting.erase) delete m.cells[c];
  else m.cells[c] = brush;
  painting.first = false;
  el.outerHTML = `<div class="cell" data-c="${c}"${cellStyle(m, c)}>${cellLabel(m, c)}</div>`;
}
document.addEventListener('pointerdown', e => {
  const el = e.target.closest('#planGrid .cell');
  if (!el) return;
  e.preventDefault();
  const m = store().map;
  painting = { first: true, erase: !brush || (brush !== 'entry' && m.cells[el.dataset.c] === brush), last: el.dataset.c };
  paintCell(el);
});
document.addEventListener('pointermove', e => {
  if (!painting) return;
  const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('#planGrid .cell');
  if (el && el.dataset.c !== painting.last && brush !== 'entry') { painting.last = el.dataset.c; paintCell(el); }
});
const endPaint = () => { if (!painting) return; painting = null; save(); render(); };
document.addEventListener('pointerup', endPaint);
document.addEventListener('pointercancel', endPaint);

// ---------- Actions ----------

const item = id => S.items.find(i => i.id === id);
const parseEuro = raw => { const v = parseFloat(String(raw).replace(',', '.').replace(/[^\d.]/g, '')); return isNaN(v) ? null : Math.round(v * 100) / 100; };
function setStore(id) { storeId = id; try { localStorage.setItem(K('courses.store'), id); } catch {} }

const recipe = id => S.recipes.find(r => r.id === id);
// Paniers (bébé, apéro, chat…) : même moteur que les recettes (nom + articles), rangés dans Mes articles
const isBasket = r => r.kind === 'basket';
const cookbook = () => S.recipes.filter(r => !isBasket(r));
const baskets = () => S.recipes.filter(isBasket).sort((a, b) => a.name.localeCompare(b.name));

// Annuler : instantané de l'état avant une action destructive, bandeau 6 s
let undoSnap = null, toastTimer;
let undoAfter = null;
function snapshot() { undoSnap = Sync.strings(Sync.records(S)); }
// Bandeau du bas : un message, et « Annuler » si l'action se défait
// Confettis légers à la fin des courses
function confetti() {
  if (!motion()) return;
  const colors = ['#1f5fcc', '#7aa5f0', '#f2b84b', '#e5736b', '#5ab88a'];
  for (let k = 0; k < 28; k++) {
    const s = document.createElement('i');
    s.className = 'confetti';
    s.style.cssText = `left:${50 + (Math.random() - .5) * 20}%;background:${colors[k % 5]}`;
    document.body.append(s);
    const dx = (Math.random() - .5) * 320, dy = -(120 + Math.random() * 220);
    s.animate([
      { transform: 'translate(0,0) rotate(0)', opacity: 1 },
      { transform: `translate(${dx}px,${dy}px) rotate(${Math.random() * 540}deg)`, opacity: 1, offset: .45 },
      { transform: `translate(${dx * 1.3}px,${dy + 520}px) rotate(900deg)`, opacity: 0 },
    ], { duration: 1400 + Math.random() * 600, easing: 'cubic-bezier(.2,.6,.4,1)' }).onfinish = () => s.remove();
  }
}

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
  install: async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    render();
  },
  installLater: () => { try { localStorage.setItem('courses.installLater', Date.now()); } catch {} },
  inviteDone: () => { try { localStorage.setItem(K('courses.invited'), '1'); } catch {} },
  // Mes listes : changer, créer
  lists: () => {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="overlay sheet-modal" data-a="closePhoto">
        <div class="card" data-a="noop">
          <h2>Mes listes</h2>
          ${lists.map(l => `<button class="row list-row ${l.id === LIST ? 'on' : ''}" data-a="switchList" data-v="${l.id}"><span class="name">${esc(l.name)}</span>${l.id === LIST ? icon.check : ''}</button>`).join('')}
          <form id="newListForm" class="add">
            <input name="name" placeholder="Nouvelle liste (ex. Pour Tata, Parrain)" autocomplete="off" required>
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
    const r = recipe(id), its = r.items.map(item).filter(i => i && !i.need && !recipeSkip.has(i.id));
    its.forEach(i => { want(i); if (r.qty?.[i.id] && !i.note) i.note = r.qty[i.id]; });
    recipeAdd = null;
    if (isBasket(r)) toast(`${r.name} : ${its.length} article${its.length > 1 ? 's' : ''} ajouté${its.length > 1 ? 's' : ''}`, false);
  },
  cancelRecipe: () => { recipeAdd = null; },
  editRecipe: ({ id }) => { recipeEdit = id; recipeAdd = null; linkDraft = ''; },
  closeRecipe: () => { recipeEdit = null; linkDraft = ''; },
  pickLink: ({ r, id }) => linkTo(recipe(r), item(id)),
  linkNew: ({ r }) => {
    const n = cap(lastPart(linkDraft)), i = { id: uid(), name: n, aisle: guessAisle(n), freq: false, need: false, done: false };
    S.items.push(i);
    linkTo(recipe(r), i); // pas de bandeau : il masquerait le champ où l'on tape l'ingrédient suivant
  },
  unlink: ({ id, item: itemId }) => { const r = recipe(id); r.items = r.items.filter(x => x !== itemId); },
  delRecipe: ({ id }) => { if (confirm(isBasket(recipe(id)) ? 'Supprimer ce panier ?' : 'Supprimer cette recette ?')) { S.recipes = S.recipes.filter(r => r.id !== id); recipeEdit = null; } },
  toggleNeed: ({ id }) => { const i = item(id); if (i.need) drop(i); else want(i); },
  toggleDone: ({ id }) => {
    const i = item(id);
    i.done = !i.done;
    if (i.done) { popId = id; flyFrom = app.querySelector(`.row[data-id="${id}"]`)?.getBoundingClientRect().top ?? null; tick(); }
    i.doneAt = i.done ? Date.now() : undefined;
    i.doneBy = i.done ? me || '?' : undefined;
  },
  unneed: ({ id }) => { snapshot(); const i = item(id); drop(i); toast(`${i.name} retiré de la liste`); },
  delItem: ({ id }) => { S.items = S.items.filter(i => i.id !== id); },
  allPins: () => S.items.forEach(i => { if (i.pin) want(i); }),
  cancelNew: () => { newItems = []; actions.closePhoto(); setTimeout(refocusQuickInput); },
  pin: ({ id }) => { const i = item(id); i.pin = !i.pin || undefined; if (i.pin) i.freq = true; },
  noneNeed: () => {
    if (Sync.config() && !confirm('Vider la liste pour tout le foyer ?')) return;
    snapshot(); S.items.filter(i => i.need).forEach(drop); toast('Liste vidée');
  },
  addSug: () => suggestions().forEach(({ i }) => want(i)),
  // Valide la liste : les articles pris alimentent l'historique d'achat
  // Valide la liste : les articles pris alimentent l'historique d'achat, le montant du ticket le budget
  goShopping: () => {
    S.shoppers[me || '?'] = Date.now(); tab = 'list';
    const o = otherPart(); // l'autre a déjà pris une moitié : je prends l'autre
    if (o) { who = o.part === 1 ? 2 : 1; try { localStorage.setItem(K('courses.who'), who); } catch {} }
    S.parts[me || '?'] = who;
  },
  locate: ({ id }) => { spot = id || null; findQ = ''; },
  stopShopping: () => { spot = null; delete S.shoppers[me || '?']; delete S.parts[me || '?']; },
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
    S.items.filter(i => i.need).forEach(i => { drop(i); delete i.doneAt; delete i.doneBy; delete i.missing; });
    toast(`Liste vidée (${n} article${n > 1 ? 's' : ''})`);
  },
  hintDone: () => { try { localStorage.setItem('courses.hint', '1'); } catch {} },
  catalogEdit: () => { catalogEdit = !catalogEdit; },
  moreTrips: () => { tripsShown += 20; },
  catalogPins: ({ v }) => { catalogPins = v === '1'; catalogBaskets = v === 'baskets'; },
  // Puce d'un panier sur la liste : fenêtre où l'on décoche ce qu'on a déjà, puis ajout (Annuler possible)
  addBasket: ({ id }) => {
    const r = recipe(id), its = r.items.map(item).filter(Boolean);
    document.body.insertAdjacentHTML('beforeend', `
      <div class="overlay sheet-modal">
        <form id="basketForm" class="card" data-id="${r.id}">
          <h2>${icon.basket} ${esc(r.name)}</h2>
          <p class="hint">Décochez ce que vous avez déjà.</p>
          ${its.map(i => `<label class="field check"><input type="checkbox" name="i" value="${i.id}"${i.need ? ' disabled' : ' checked'}><span>${esc(i.name)}${r.qty?.[i.id] ? ` <small>${esc(r.qty[i.id])}</small>` : ''}${i.need ? ' <small>déjà sur la liste</small>' : ''}</span></label>`).join('')}
          <button class="primary">${icon.plus} Ajouter à la liste</button>
          <button type="button" class="ghost wide" data-a="closePhoto">Annuler</button>
        </form>
      </div>`);
  },
  shareList: async () => {
    const groups = [...byAisle(i => i.need), ...byAisle(i => i.need, S.shops)];
    const text = `${currentList().name}\n` + groups.map(g => `\n${g.aisle.name}\n` + g.items.map(i => `• ${i.name}${i.note ? ` (${i.note})` : ''}`).join('\n')).join('\n');
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
          <button class="primary">${icon.check} Terminer</button>
          <button type="button" class="ghost wide" data-a="closePhoto">Continuer les courses</button>
        </form>
      </div>`);
    document.querySelector('#finishForm input').focus();
  },
  delTrip: ({ id }) => { if (confirm('Supprimer ce passage en caisse ?')) { S.trips = S.trips.filter(t => t.id !== id); if (tab === 'trip') tab = 'budget'; } },
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
  setWho: ({ v }) => { who = +v; S.parts[me || '?'] = who; try { localStorage.setItem(K('courses.who'), v); } catch {} },
  setBrush: ({ v }) => { brush = v; },
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
  // Historique du budget par mois, en CSV lisible par Excel / Numbers (séparateur « ; », virgule décimale)
  exportMonths: () => {
    const paid = S.trips.filter(t => t.total != null && t.type !== 'settle'), budget = S.settings.budget;
    const months = {};
    paid.forEach(t => { const d = new Date(t.date), k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; (months[k] ||= []).push(t.total); });
    const n = v => v == null ? '' : v.toFixed(2).replace('.', ',');
    const rows = Object.keys(months).sort().map(k => {
      const ts = months[k], total = ts.reduce((a, b) => a + b, 0);
      const label = new Date(+k.slice(0, 4), +k.slice(5) - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      return [label, ts.length, n(total), n(total / ts.length), n(budget), budget ? n(budget - total) : ''].join(';');
    });
    const csv = '\ufeff' + ['Mois;Passages;Dépensé (€);Panier moyen (€);Budget actuel (€);Reste sur le budget (€)', ...rows].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    Object.assign(document.createElement('a'), { href: url, download: `budget-${currentList().name}.csv` }).click();
    URL.revokeObjectURL(url);
  },
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
  if (dx < -90) {
    const done = () => { actions.unneed({ id: row.dataset.swipe }); save(); render(); };
    if (!motion()) return done();
    row.style.transition = 'transform .2s ease-in, opacity .2s';
    row.style.transform = 'translateX(-110%)'; row.style.opacity = 0;
    setTimeout(done, 200);
  } else row.style.transform = '';
});

document.addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const name = f.get('name');
  if (e.target.id === 'findForm') { const [i] = matches(findQ); if (i) actions.locate({ id: i.id }); }
  if (e.target.id === 'quick') { // « lait, œufs, 2 kg tomates »
    quickDraft = '';
    const already = [];
    newItems = [];
    name.split(/[,;\n]+/).forEach(raw => {
      const m = raw.trim().match(/^(\d+(?:[.,]\d+)?\s*(?:kg|g|l|cl|ml|x|×|paquets?|boîtes?|bouteilles?)?)\s+(?:de |d')?(.+)$/i);
      const n = (m ? m[2] : raw).trim(), qty = m ? m[1].trim() : null;
      if (!n) return;
      const ex = findItem(n);
      if (!ex) { if (!newItems.some(x => sameKey(x.name) === sameKey(n))) newItems.push({ name: cap(n), qty }); return; }
      if (ex.need) already.push(`${ex.name}${ex.by ? ` (${ex.by})` : ''}`);
      want(ex);
      if (qty) ex.note = qty;
    });
    // Articles inconnus : sur la liste ? indispensables ? (fenêtre de choix)
    if (newItems.length) { setTimeout(askNewItems); save(); render(); return; }
    if (already.length) setTimeout(() => toast(`Déjà sur la liste : ${already.join(', ')}`, false));
  }
  if (e.target.id === 'basketForm') {
    const r = recipe(e.target.dataset.id), its = f.getAll('i').map(item).filter(i => i && !i.need);
    e.target.closest('.overlay').remove();
    snapshot();
    its.forEach(i => { want(i); if (r.qty?.[i.id] && !i.note) i.note = r.qty[i.id]; });
    save(); render();
    if (its.length) toast(`${r.name} : ${its.length} article${its.length > 1 ? 's' : ''} ajouté${its.length > 1 ? 's' : ''}`);
    return;
  }
  if (e.target.id === 'newItemForm') {
    const need = f.get('need') === 'on', pin = f.get('pin') === 'on', aisle = f.get('aisle');
    const created = newItems.filter(x => !findItem(x.name)).map(({ name, qty }) => {
      const i = { id: uid(), name, aisle: aisle || guessAisle(name), freq: pin || tab === 'catalog', need: false, done: false };
      if (qty) i.note = qty;
      if (pin) i.pin = true;
      S.items.push(i);
      if (need) want(i);
      return i;
    });
    newItems = [];
    e.target.closest('.overlay').remove();
    if (created.length) toast(`${created.length > 1 ? `${created.length} articles créés` : `${created[0].name} créé`}${pin ? ', indispensable' : ''}${need ? ', sur la liste' : ''}`, false);
    save(); render();
    return refocusQuickInput();
  }
  if (e.target.id === 'addAisle' && name.trim()) S.aisles.push({ id: uid(), name: name.trim() });
  if (e.target.id === 'addShop' && name.trim()) S.shops.push({ id: uid(), name: name.trim() });
  if (e.target.id === 'newBasket' && name.trim()) {
    let r = baskets().find(x => sameKey(x.name) === sameKey(name));
    if (!r) S.recipes.push(r = { id: uid(), name: cap(name.trim()), kind: 'basket', items: [] });
    recipeEdit = r.id; recipeAdd = null; linkDraft = '';
  }
  if (e.target.id === 'newRecipe' && name.trim()) {
    let r = cookbook().find(x => sameKey(x.name) === sameKey(name));
    if (!r) S.recipes.push(r = { id: uid(), name: cap(name.trim()), items: [] });
    recipeEdit = r.id; recipeAdd = null; recipeDraft = '';
    tab = 'recipes';
  }
  if (e.target.id === 'link') {
    const r = recipe(e.target.dataset.id);
    linkDraft = ''; refocusSel = '#link input';
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
    delete S.shoppers[me || '?']; delete S.parts[me || '?'];
    const now = Date.now();
    taken.forEach(i => {
      i.bought = [...(i.bought || []), now].slice(-HISTORY);
      Object.assign(i, { need: false, done: false, lastBy: me || undefined });
      delete i.doneAt; delete i.doneBy; delete i.missing; delete i.auto;
    });
    // « Pas trouvé » seulement si personne d'autre n'est encore en courses
    if (!othersShopping()) S.items.filter(i => i.need && !i.done && here(i)).forEach(i => { i.missing = { by: me || '', at: now }; });
    S.trips.push({ id: uid(), date: now, total: parseEuro(name || ''), place: where, n: taken.length, names: taken.map(i => i.name), by: me || undefined });
    tab = 'list';
    save(); render();
    confetti();
    toast(learned ? `Courses terminées. Ordre des rayons ajusté pour ${store().name}` : 'Courses terminées');
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
  app.querySelector(['newRecipe', 'newBasket'].includes(e.target.id) ? '#link input' : `#${e.target.id} input`)?.focus();
});

document.addEventListener('change', async e => {
  if (e.target.id === 'meName') { setMe(e.target.value); return render(); }
  if (e.target.id === 'autofill') { S.settings.autofill = e.target.checked; autoFill(); save(); return render(); }
  if (e.target.id === 'split') { S.settings.split = e.target.checked || undefined; save(); return render(); }
  if (e.target.id === 'listTitle' && e.target.value.trim()) { currentList().name = S.settings.listName = e.target.value.trim(); saveLists(); save(); return render(); }
  if (e.target.id === 'rname') { const r = recipe(e.target.dataset.id); if (e.target.value.trim()) r.name = e.target.value.trim(); return save(); }
  if (e.target.id === 'rcat') { const r = recipe(e.target.dataset.id); r.cat = cap(e.target.value.trim().slice(0, 30)) || undefined; return save(); }
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
    const el = Object.assign(document.createElement('div'), { id: 'update', innerHTML: `${icon.again}<span>Nouvelle version de l'app</span><button onclick="location.reload()">Recharger</button>` });
    document.body.append(el);
  });
}
