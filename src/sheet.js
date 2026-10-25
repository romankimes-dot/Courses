// Fiche produit : nom, rayon ou commerce, précision, fréquent, photo, habitudes, prix, recettes,
// libellés de ticket reconnus. Ouverte par le chevron › d'un article (ou un prix suivi).

let sheetId = null, sheetBack = 'list';
const fmtDate = t => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

views.item = () => {
  const i = item(sheetId);
  const back = `<button class="ghost back" data-a="closeItem">${icon.back} Retour</button>`;
  if (!i) return `${back}<p class="empty">Article introuvable.</p>`;
  const r = rhythm(i), last = i.bought?.at(-1);
  const recipes = S.recipes.filter(rc => rc.items.includes(i.id));
  return `
    ${back}
    <div class="sheet-head">
      ${i.photo ? `<img class="sheet-photo" src="${esc(i.photo)}" alt="" data-a="viewPhoto" data-id="${i.id}">`
        : `<button class="sheet-photo empty-photo" data-a="photo" data-id="${i.id}" title="Ajouter une photo">${icon.camera}</button>`}
      <input id="itemTitle" class="title" value="${esc(i.name)}" aria-label="Nom">
    </div>
    <button class="wide ${i.need ? '' : 'accent'}" data-a="toggleNeed" data-id="${i.id}">${i.need ? `${icon.check} Sur la liste · retirer` : `${icon.plus} Ajouter à la liste`}</button>
    <label class="field">Rayon ou commerce<select id="itemAisle">${aisleOptions(i.aisle)}</select></label>
    <label class="field">Précision <small>(quantité, marque, bio…)</small><input id="itemNote" value="${esc(i.note || '')}" placeholder="ex. 2 l, bio, marque X" autocomplete="off"></label>
    <label class="field">Si absent, prendre… <small>(consigne pour qui fait les courses)</small><input id="itemAlt" value="${esc(i.alt || '')}" placeholder="ex. la marque Schär, sinon rien" autocomplete="off"></label>
    <label class="field check"><input type="checkbox" id="itemPin"${i.pin ? ' checked' : ''}><span>${icon.starOn} Indispensable<br><small>Toujours en haut de la liste quand il en faut, et rangé à part dans « Mes articles ».</small></span></label>
    <h3>Habitudes</h3>
    <div class="row static"><span class="name">Acheté en moyenne</span><span>${r ? `tous les ${Math.round(r.every)} jours` : '<small>pas encore assez d\'achats</small>'}</span></div>
    <div class="row static"><span class="name">Dernier achat</span><span>${last ? `${fmtDate(last)}${i.lastBy ? ` · ${esc(i.lastBy)}` : ''}` : '—'}</span></div>
    ${i.prices?.length ? `
      <h3>Prix</h3>
      ${[...i.prices].reverse().map(p => `<div class="row static"><span class="name">${fmtDate(p.d)} <small>${esc(p.at || '')}</small></span><span>${euro(p.p)}</span></div>`).join('')}` : ''}
    ${recipes.length ? `<h3>Dans les recettes et paniers</h3><p>${recipes.map(rc => esc(rc.name)).join(' · ')}</p>` : ''}
    <button class="ghost danger wide" data-a="delItemSheet" data-id="${i.id}">Supprimer l'article</button>`;
};

Object.assign(actions, {
  openItem: ({ id }) => { if (tab !== 'item') sheetBack = tab; sheetId = id; tab = 'item'; },
  closeItem: () => { tab = sheetBack; },
  delItemSheet: ({ id }) => {
    snapshot();
    const name = item(id).name;
    S.items = S.items.filter(i => i.id !== id);
    S.recipes.forEach(rc => { rc.items = rc.items.filter(x => x !== id); });
    for (const k in S.aliases) if (S.aliases[k] === id) delete S.aliases[k];
    tab = sheetBack;
    toast(`${name} supprimé`);
  },
});

document.addEventListener('change', e => {
  const i = tab === 'item' && item(sheetId);
  if (!i) return;
  const t = e.target;
  if (t.id === 'itemTitle') {
    const n = t.value.trim(), dup = S.items.find(x => x !== i && sameKey(x.name) === sameKey(n));
    if (!n || dup) { if (dup) alert(`« ${dup.name} » existe déjà.`); t.value = i.name; return; }
    i.name = n;
  }
  else if (t.id === 'itemAisle') i.aisle = t.value;
  else if (t.id === 'itemNote') i.note = t.value.trim() || undefined;
  else if (t.id === 'itemAlt') i.alt = t.value.trim() || undefined;
  else if (t.id === 'itemPin') { i.pin = t.checked || undefined; if (i.pin) i.freq = true; }
  else return;
  save();
}, true);
