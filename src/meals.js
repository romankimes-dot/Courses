// Repas de la semaine : on pose des recettes sur les jours, puis un geste met tous les ingrédients
// sur la liste (quantités cumulées, on décoche ce qu'on a déjà). S.plan = { 'AAAA-MM-JJ': [ids de recettes] }.

const dayKey = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const week = () => Array.from({ length: 7 }, (_, k) => { const d = new Date(); d.setDate(d.getDate() + k); return d; });
let weekAdd = null; // revue des ingrédients de la semaine : Set des articles décochés
let calMonth = 0, calDay = null; // calendrier : décalage en mois depuis aujourd'hui, jour choisi (AAAA-MM-JJ)

// Calendrier du mois en cases (lundi en premier) ; chaque case montre les repas posés ce jour-là
function calendar() {
  const now = new Date(), first = new Date(now.getFullYear(), now.getMonth() + calMonth, 1);
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate(), lead = (first.getDay() + 6) % 7;
  const today = dayKey(now);
  const cells = Array.from({ length: lead }, () => '<span></span>');
  for (let d = 1; d <= days; d++) {
    const key = dayKey(new Date(first.getFullYear(), first.getMonth(), d)), rs = (S.plan[key] || []).map(recipe).filter(Boolean);
    cells.push(`<button class="cell ${key === today ? 'today' : ''} ${key === calDay ? 'sel' : ''} ${key < today ? 'past' : ''}" data-a="calDay" data-v="${key}">
      <b>${d}</b>${rs.slice(0, 2).map(r => `<small>${esc(r.name)}</small>`).join('')}${rs.length > 2 ? `<small>+${rs.length - 2}</small>` : ''}</button>`);
  }
  return `
    <div class="bar cal-head">
      <button class="ghost" data-a="calMove" data-v="-1" aria-label="Mois précédent">${icon.back}</button>
      <strong class="grow">${first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</strong>
      <button class="ghost" data-a="calMove" data-v="1" aria-label="Mois suivant">${icon.right}</button>
    </div>
    <div class="cal">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(j => `<i>${j}</i>`).join('')}${cells.join('')}</div>`;
}

// « 40 cl » + « 40 cl » = « 80 cl » ; unités différentes ou texte libre : mis bout à bout
function sumQty(list) {
  const byUnit = new Map(), rest = [];
  for (const q of list) {
    const m = q.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
    if (m) byUnit.set(m[2].trim(), (byUnit.get(m[2].trim()) || 0) + parseFloat(m[1].replace(',', '.')));
    else rest.push(q);
  }
  return [...[...byUnit].map(([u, n]) => `${String(Math.round(n * 100) / 100).replace('.', ',')}${u ? ' ' + u : ''}`), ...rest].join(' + ');
}

// Ingrédients des 7 prochains jours : article -> quantités et recettes
function weekNeeds() {
  const out = new Map();
  for (const d of week()) for (const rid of S.plan[dayKey(d)] || []) {
    const r = recipe(rid);
    if (!r) continue;
    for (const iid of r.items) {
      const i = item(iid);
      if (!i) continue;
      const e = out.get(i) || { qty: [], recipes: [] };
      if (r.qty?.[iid]) e.qty.push(r.qty[iid]);
      e.recipes.push(r.name);
      out.set(i, e);
    }
  }
  return out;
}

views.meals = () => {
  const needs = weekNeeds();
  if (weekAdd) {
    const rows = [...needs].filter(([i]) => !i.need);
    const n = rows.filter(([i]) => !weekAdd.has(i.id)).length;
    return `
      <button class="ghost back" data-a="weekCancel">${icon.back} Repas</button>
      <h2>Ingrédients de la semaine</h2>
      <p class="hint">Décochez ce que vous avez déjà.</p>
      ${rows.map(([i, e]) => `
        <div class="row ${weekAdd.has(i.id) ? '' : 'on'}" data-a="weekSkip" data-id="${i.id}">
          <span class="box"></span>
          <span class="name">${esc(i.name)}${e.qty.length ? ` <small>${esc(sumQty(e.qty))}</small>` : ''}<br><small>${esc([...new Set(e.recipes)].join(', '))}</small></span>
        </div>`).join('') || '<p class="hint">Tout est déjà sur la liste.</p>'}
      ${[...needs].some(([i]) => i.need) ? `<p class="hint">Déjà sur la liste : ${[...needs].filter(([i]) => i.need).map(([i]) => esc(i.name)).join(', ')}</p>` : ''}
      <button class="primary" data-a="weekConfirm" ${n ? '' : 'disabled'}>Ajouter ${n} article${n > 1 ? 's' : ''} à la liste</button>`;
  }
  // Menu des jours : recettes rangées par catégorie, comme dans « Mes recettes »
  const options = recipeGroups().map(g => `<optgroup label="${esc(g.cat)}">${g.rs.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</optgroup>`).join('');
  const missing = [...needs].filter(([i]) => !i.need).length;
  return `
    <h2>Repas</h2>
    ${cookbook().length ? '' : `<p class="hint">Créez une recette (ses ingrédients et quantités), puis posez-la sur un jour : un geste mettra tout sur la liste.</p>
      <form id="newRecipe" class="addtop">
        <input name="name" placeholder="Nom de la recette (ex. Curry)" autocomplete="off" autocapitalize="sentences" required>
        <button class="accent" aria-label="Créer">${icon.plus}</button>
      </form>
      <button class="wide" data-a="go" data-v="library">${icon.meals} Ou piocher dans les idées de recettes</button>`}
    ${calendar()}
    ${(() => {
      const key = calDay || dayKey(new Date()), planned = (S.plan[key] || []).map(recipe).filter(Boolean);
      return `
      <div class="day today">
        <strong>${key === dayKey(new Date()) ? 'Aujourd\'hui' : new Date(`${key}T12:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
        <div class="chips">
          ${planned.map(r => `<button class="chip on" data-a="unplan" data-v="${key}" data-id="${r.id}" title="Retirer">${esc(r.name)} ${icon.x}</button>`).join('')}
          ${cookbook().length ? `<select data-plan="${key}" aria-label="Ajouter un repas"><option value="">+ repas</option>${options}</select>` : ''}
        </div>
      </div>`;
    })()}
    ${needs.size ? `<button class="primary" data-a="weekReview" ${missing ? '' : 'disabled'}>${icon.cart} Ingrédients des 7 prochains jours sur la liste${missing ? ` (${missing})` : ' : déjà fait'}</button>` : ''}
    ${cookbook().length ? `<button class="wide" data-a="go" data-v="recipes">${icon.meals} Mes recettes <small>${cookbook().length}</small></button>` : ''}`;
};

Object.assign(actions, {
  calDay: ({ v }) => { calDay = v; },
  calMove: ({ v }) => { calMonth += +v; },
  unplan: ({ v, id }) => { S.plan[v] = (S.plan[v] || []).filter(x => x !== id); if (!S.plan[v].length) delete S.plan[v]; },
  weekReview: () => { weekAdd = new Set(); },
  weekCancel: () => { weekAdd = null; },
  weekSkip: ({ id }) => { weekAdd.has(id) ? weekAdd.delete(id) : weekAdd.add(id); },
  weekConfirm: () => {
    for (const [i, e] of weekNeeds()) {
      if (i.need || weekAdd.has(i.id)) continue;
      want(i);
      if (e.qty.length && !i.note) i.note = sumQty(e.qty);
    }
    weekAdd = null;
    toast('Ingrédients ajoutés à la liste', false);
  },
});

document.addEventListener('change', e => {
  const key = e.target.dataset?.plan;
  if (key && e.target.value) {
    S.plan[key] = [...(S.plan[key] || []), e.target.value];
    save();
    render();
  }
  const rq = e.target.dataset?.rqty;
  if (rq) {
    const [rid, iid] = rq.split(':'), r = recipe(rid);
    r.qty = { ...(r.qty || {}), [iid]: e.target.value.trim() };
    if (!r.qty[iid]) delete r.qty[iid];
    save();
  }
});
