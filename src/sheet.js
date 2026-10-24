// Fiche produit : nom, rayon ou commerce, précision, fréquent, photo, habitudes, prix, recettes,
// libellés de ticket reconnus. Ouverte par le chevron › d'un article (ou un prix suivi).

let sheetId = null, sheetBack = 'prep';
const fmtDate = t => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

views.item = () => {
  const i = item(sheetId);
  const back = `<button class="ghost back" data-a="closeItem">← Retour</button>`;
  if (!i) return `${back}<p class="empty">Article introuvable.</p>`;
  const r = rhythm(i), last = i.bought?.at(-1);
  const recipes = S.recipes.filter(rc => rc.items.includes(i.id));
  const labels = Object.entries(S.aliases).filter(([, v]) => v === i.id).map(([k]) => k);
  return `
    ${back}
    <div class="sheet-head">
      ${i.photo ? `<img class="sheet-photo" src="${i.photo}" alt="" data-a="viewPhoto" data-id="${i.id}">`
        : `<button class="sheet-photo empty-photo" data-a="photo" data-id="${i.id}" title="Ajouter une photo">📷</button>`}
      <input id="itemTitle" class="title" value="${esc(i.name)}" aria-label="Nom">
    </div>
    <button class="wide ${i.need ? '' : 'accent'}" data-a="toggleNeed" data-id="${i.id}">${i.need ? '✓ Sur la liste · retirer' : '+ Ajouter à la liste'}</button>
    <label class="field">Rayon ou commerce<select id="itemAisle">${aisleOptions(i.aisle)}</select></label>
    <label class="field">Précision <small>(quantité, marque, bio…)</small><input id="itemNote" value="${esc(i.note || '')}" placeholder="ex. 2 l, bio, marque X" autocomplete="off"></label>
    <label class="field check"><input type="checkbox" id="itemFreq"${i.freq ? ' checked' : ''}><span>Article de base<br><small>Toujours visible dans Préparer, coché par « Tout cocher ».</small></span></label>
    <h3>Habitudes</h3>
    <div class="row static"><span class="name">Rythme d'achat</span><span>${r ? `tous les ~${Math.round(r.every)} j` : '<small>2 achats validés minimum</small>'}</span></div>
    <div class="row static"><span class="name">Dernier achat</span><span>${last ? fmtDate(last) : '—'}</span></div>
    ${i.prices?.length ? `
      <h3>Prix</h3>
      ${[...i.prices].reverse().map(p => `<div class="row static"><span class="name">${fmtDate(p.d)} <small>${esc(p.at || '')}</small></span><span>${euro(p.p)}</span></div>`).join('')}` : ''}
    ${recipes.length ? `<h3>Dans les recettes</h3><p>${recipes.map(rc => esc(rc.name)).join(' · ')}</p>` : ''}
    ${labels.length ? `
      <h3>Libellés de ticket reconnus</h3>
      ${labels.map(k => `<div class="row static"><code class="name">${esc(k)}</code><button class="ghost" data-a="unalias" data-k="${esc(k)}" title="Oublier">×</button></div>`).join('')}` : ''}
    <button class="ghost danger wide" data-a="delItemSheet" data-id="${i.id}">Supprimer l'article</button>`;
};

Object.assign(actions, {
  openItem: ({ id }) => { if (tab !== 'item') sheetBack = tab; sheetId = id; tab = 'item'; },
  closeItem: () => { tab = sheetBack; },
  unalias: ({ k }) => { delete S.aliases[k]; },
  delItemSheet: ({ id }) => {
    if (!confirm('Supprimer cet article, son historique et ses prix ?')) return;
    S.items = S.items.filter(i => i.id !== id);
    S.recipes.forEach(rc => { rc.items = rc.items.filter(x => x !== id); });
    for (const k in S.aliases) if (S.aliases[k] === id) delete S.aliases[k];
    tab = sheetBack;
  },
});

document.addEventListener('change', e => {
  const i = tab === 'item' && item(sheetId);
  if (!i) return;
  const t = e.target;
  if (t.id === 'itemTitle') {
    const n = t.value.trim(), dup = S.items.find(x => x !== i && x.name.toLowerCase() === n.toLowerCase());
    if (!n || dup) { if (dup) alert(`« ${dup.name} » existe déjà.`); t.value = i.name; return; }
    i.name = n;
  }
  else if (t.id === 'itemAisle') i.aisle = t.value;
  else if (t.id === 'itemNote') i.note = t.value.trim() || undefined;
  else if (t.id === 'itemFreq') i.freq = t.checked;
  else return;
  save();
}, true);
