// Courses — v0 locale (stockage navigateur). Le partage viendra ensuite.

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

function seed() {
  const aisles = [], items = [];
  for (const [name, list] of Object.entries(DEFAULTS)) {
    const aisle = { id: uid(), name };
    aisles.push(aisle);
    for (const n of list) items.push({ id: uid(), name: n, aisle: aisle.id, freq: true, need: false, done: false });
  }
  return { aisles, items };
}

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}
let S = load() || seed();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
}

let tab = 'prep';
const app = document.getElementById('app');

const byAisle = filter => S.aisles
  .map(a => ({ aisle: a, items: S.items.filter(i => i.aisle === a.id && filter(i)) }))
  .filter(g => g.items.length);
const fallbackAisle = () => (S.aisles.find(a => a.name === 'Divers') || S.aisles[S.aisles.length - 1]).id;
const aisleOptions = sel => S.aisles.map(a => `<option value="${a.id}"${a.id === sel ? ' selected' : ''}>${esc(a.name)}</option>`).join('');

function addItem(name, aisle, freq) {
  name = name.trim();
  if (!name) return;
  const existing = S.items.find(i => i.name.toLowerCase() === name.toLowerCase());
  if (existing) { existing.need = true; existing.done = false; return; }
  S.items.push({ id: uid(), name, aisle: aisle || fallbackAisle(), freq, need: true, done: false });
}

// ---------- Vues ----------

const views = {
  prep() {
    const count = S.items.filter(i => i.need).length;
    return `
      <p class="hint">Touchez un article pour l'ajouter ou le retirer de la liste.</p>
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
      ${byAisle(() => true).map(g => `
        <section>
          <h3>${esc(g.aisle.name)}</h3>
          ${g.items.map(i => `
            <div class="row ${i.need ? 'on' : ''}" data-a="toggleNeed" data-id="${i.id}">
              <span class="box"></span>
              <span class="name">${esc(i.name)}${i.freq ? '' : ' <small>ponctuel</small>'}</span>
              <button class="ghost" data-a="delItem" data-id="${i.id}" title="Supprimer">×</button>
            </div>`).join('')}
        </section>`).join('')}`;
  },

  shop() {
    const need = S.items.filter(i => i.need);
    const done = need.filter(i => i.done).length;
    if (!need.length) return `<p class="empty">Liste vide. Passez par « Préparer ».</p>`;
    return `
      <div class="progress"><div style="width:${100 * done / need.length}%"></div></div>
      <p class="count">${done} / ${need.length} dans le panier</p>
      ${byAisle(i => i.need).map(g => `
        <section>
          <h3>${esc(g.aisle.name)}</h3>
          ${g.items.map(i => `
            <div class="row ${i.done ? 'done' : ''}" data-a="toggleDone" data-id="${i.id}">
              <span class="box"></span><span class="name">${esc(i.name)}</span>
            </div>`).join('')}
        </section>`).join('')}
      <button class="primary" data-a="finish">Terminer les courses</button>`;
  },

  simple() {
    const need = S.items.filter(i => i.need);
    return `
      <form id="quick" class="add">
        <input name="name" placeholder="Ajouter à la liste…" autocomplete="off" required>
        <button>+</button>
      </form>
      ${need.length ? need.map(i => `
        <div class="row ${i.done ? 'done' : ''}" data-a="toggleDone" data-id="${i.id}">
          <span class="box"></span><span class="name">${esc(i.name)}</span>
          <button class="ghost" data-a="unneed" data-id="${i.id}" title="Retirer">×</button>
        </div>`).join('') : '<p class="empty">Rien pour l\'instant.</p>'}`;
  },

  aisles() {
    return `
      <p class="hint">L'ordre des rayons définit le circuit en magasin.</p>
      ${S.aisles.map((a, k) => `
        <div class="row static">
          <span class="name">${esc(a.name)} <small>${S.items.filter(i => i.aisle === a.id).length}</small></span>
          <button class="ghost" data-a="up" data-k="${k}" ${k ? '' : 'disabled'}>↑</button>
          <button class="ghost" data-a="down" data-k="${k}" ${k < S.aisles.length - 1 ? '' : 'disabled'}>↓</button>
          <button class="ghost" data-a="rename" data-k="${k}">✎</button>
          <button class="ghost" data-a="delAisle" data-k="${k}">×</button>
        </div>`).join('')}
      <form id="addAisle" class="add">
        <input name="name" placeholder="Nouveau rayon" required>
        <button>Ajouter</button>
      </form>
      <h3>Données</h3>
      <div class="bar">
        <button data-a="export">Exporter</button>
        <label class="btn">Importer<input type="file" accept="application/json" id="import" hidden></label>
        <button data-a="reset">Réinitialiser</button>
      </div>`;
  },
};

function render() {
  app.innerHTML = views[tab]();
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
}

// ---------- Actions ----------

const item = id => S.items.find(i => i.id === id);

const actions = {
  toggleNeed: ({ id }) => { const i = item(id); i.need = !i.need; i.done = false; },
  toggleDone: ({ id }) => { const i = item(id); i.done = !i.done; },
  unneed: ({ id }) => { const i = item(id); i.need = false; i.done = false; },
  delItem: ({ id }) => { S.items = S.items.filter(i => i.id !== id); },
  allFreq: () => S.items.forEach(i => { if (i.freq) i.need = true; }),
  noneNeed: () => S.items.forEach(i => { i.need = false; i.done = false; }),
  finish: () => {
    if (!confirm('Retirer de la liste les articles pris ?')) return;
    S.items = S.items.filter(i => !(i.done && !i.freq));
    S.items.forEach(i => { if (i.done) { i.need = false; i.done = false; } });
  },
  up: ({ k }) => { k = +k; [S.aisles[k - 1], S.aisles[k]] = [S.aisles[k], S.aisles[k - 1]]; },
  down: ({ k }) => { k = +k; [S.aisles[k + 1], S.aisles[k]] = [S.aisles[k], S.aisles[k + 1]]; },
  rename: ({ k }) => { const n = prompt('Nom du rayon', S.aisles[k].name); if (n?.trim()) S.aisles[k].name = n.trim(); },
  delAisle: ({ k }) => {
    if (S.aisles.length < 2) return;
    const [a] = S.aisles.splice(k, 1);
    const target = fallbackAisle();
    S.items.forEach(i => { if (i.aisle === a.id) i.aisle = target; });
  },
  export: () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }));
    Object.assign(document.createElement('a'), { href: url, download: 'courses.json' }).click();
    URL.revokeObjectURL(url);
  },
  reset: () => { if (confirm('Tout effacer et revenir aux basiques ?')) S = seed(); },
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
  save();
  render();
  app.querySelector(`#${e.target.id} input`)?.focus();
});

document.addEventListener('change', async e => {
  if (e.target.id !== 'import' || !e.target.files[0]) return;
  try {
    const data = JSON.parse(await e.target.files[0].text());
    if (!Array.isArray(data.aisles) || !Array.isArray(data.items)) throw 0;
    S = data; save(); render();
  } catch { alert('Fichier invalide'); }
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
render();
