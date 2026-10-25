// Ticket (passage en caisse) : corriger le lieu et le montant, qui a payé et la part perso (dépenses partagées),
// et les articles achetés, y compris ceux pris en plus de la liste : ils comptent dans l'historique d'achat
// (rythme, suggestions, pré-remplissage). Ouvert en touchant un passage dans Dépenses.

let tripId = null, tripDraft = '';
const trip = id => S.trips.find(t => t.id === id);
const amount = v => v == null ? '' : v.toFixed(2).replace('.', ','); // 3,20 dans les champs

function tripChips(t) {
  const q = lastPart(tripDraft);
  if (!q) return '';
  const has = new Set((t.names || []).map(sameKey));
  const found = matches(q).filter(i => !has.has(sameKey(i.name)));
  return `${found.map(i => `<button type="button" class="chip" data-a="tripPick" data-id="${i.id}">${esc(i.name)}</button>`).join('')}
    ${findItem(q) ? '' : `<button type="button" class="chip new" data-a="tripNew">${icon.plus}Créer « ${esc(cap(q))} »</button>`}`;
}

views.trip = () => {
  const t = trip(tripId);
  const back = `<button class="ghost back" data-a="go" data-v="budget">${icon.back} Dépenses</button>`;
  if (!t) return `${back}<p class="empty">Ticket introuvable.</p>`;
  if (t.type === 'settle') return `
    ${back}
    <h2>Remboursement · ${fmtDate(t.date)}</h2>
    <p>${esc(t.from)} a remboursé ${euro(t.total)} à ${esc(t.to)}.</p>
    <button class="ghost danger wide" data-a="delTrip" data-id="${t.id}">Supprimer ce remboursement</button>`;
  const split = !!S.settings.split, names = t.names || [];
  return `
    ${back}
    <h2>${t.type === 'expense' ? 'Dépense' : 'Ticket'} · ${fmtDate(t.date)}</h2>
    <label class="field">Où<input id="tripPlace" value="${esc(t.place)}" autocomplete="off"></label>
    <label class="field">Date d'achat<input id="tripDate" type="date" value="${dayKey(new Date(t.date))}" max="${dayKey(new Date())}"></label>
    <label class="field">Montant (€)<input id="tripTotal" inputmode="decimal" value="${amount(t.total)}" placeholder="ex. 42,50" autocomplete="off"></label>
    ${split ? `
      <label class="field">Payé par<select id="tripBy">${[...new Set([t.by, me, ...members()].filter(Boolean))].map(m => `<option${m === t.by ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select></label>
      <label class="field">Part perso, hors partage (€)<input id="tripOwn" inputmode="decimal" value="${amount(t.own)}" placeholder="ex. 3,20 (des bonbons pour soi)" autocomplete="off"></label>
      <p class="hint">${t.own && t.total ? `Partagé : ${euro(t.total - Math.min(t.own, t.total))} ; ${euro(t.own)} pour ${esc(t.by || 'le payeur')} seul.` : 'Ce que le payeur a pris pour lui seul ne compte que pour lui.'}</p>` : ''}
    <h3>Articles <small>${names.length}</small></h3>
    ${names.map((n, k) => `
      <div class="row static"><span class="name">${esc(n)}</span><button class="ghost" data-a="tripUnlink" data-k="${k}" title="Retirer du ticket">${icon.x}</button></div>`).join('')}
    <form id="tripAdd" class="addtop">
      <input name="name" value="${esc(tripDraft)}" placeholder="Ajouter un article acheté…" autocomplete="off" autocapitalize="sentences" required>
      <button class="accent" aria-label="Ajouter">${icon.plus}</button>
    </form>
    <div id="tripSuggest" class="chips suggest">${tripChips(t)}</div>
    <p class="hint">Pris en plus de la liste ? Ajoutez-le : il compte dans les habitudes d'achat (et sort de la liste s'il y était).</p>
    <button class="ghost danger wide" data-a="delTrip" data-id="${t.id}">Supprimer ce ${t.type === 'expense' ? 'passage' : 'ticket'}</button>`;
};

// Article ajouté au ticket : acheté à la date du ticket
function tripBuy(t, i) {
  t.names = [...(t.names || []), i.name];
  t.n = (t.n || 0) + 1;
  i.bought = [...(i.bought || []), t.date].sort((a, b) => a - b).slice(-HISTORY);
  if (!i.lastBy && t.by) i.lastBy = t.by;
  if (i.need && !i.done) { i.need = false; delete i.auto; delete i.missing; }
  const parts = tripDraft.split(/[,;]/); parts.pop();
  tripDraft = parts.length ? parts.join(',') + ', ' : '';
  refocusSel = '#tripAdd input';
}
const newItem = name => { const i = { id: uid(), name: cap(name), aisle: guessAisle(name), freq: false, need: false, done: false }; S.items.push(i); return i; };

Object.assign(actions, {
  openTrip: ({ id }) => { tripId = id; tripDraft = ''; tab = 'trip'; },
  tripPick: ({ id }) => tripBuy(trip(tripId), item(id)),
  tripNew: () => tripBuy(trip(tripId), newItem(lastPart(tripDraft))),
  tripUnlink: ({ k }) => {
    const t = trip(tripId), [name] = t.names.splice(+k, 1), i = findItem(name);
    t.n = Math.max(0, (t.n || 1) - 1);
    const at = i?.bought?.indexOf(t.date);
    if (at >= 0) i.bought.splice(at, 1);
  },
});

document.addEventListener('input', e => {
  if (!e.target.closest('#tripAdd')) return;
  tripDraft = e.target.value;
  const box = document.getElementById('tripSuggest');
  if (box) box.innerHTML = tripChips(trip(tripId));
});

document.addEventListener('submit', e => {
  if (e.target.id !== 'tripAdd') return;
  const t = trip(tripId);
  for (const raw of new FormData(e.target).get('name').split(/[,;\n]+/)) {
    const n = raw.trim();
    if (n) { tripDraft = n; tripBuy(t, findItem(n) || newItem(n)); }
  }
  tripDraft = '';
}, true);

document.addEventListener('change', e => {
  const t = tab === 'trip' && trip(tripId), el = e.target;
  if (!t) return;
  if (el.id === 'tripPlace') t.place = el.value.trim() || t.place;
  else if (el.id === 'tripTotal') t.total = parseEuro(el.value);
  else if (el.id === 'tripDate' && el.value) { // l'historique d'achat des articles du ticket suit la date
    const d = dayTime(el.value);
    for (const n of t.names || []) { const i = findItem(n), k = i?.bought?.indexOf(t.date); if (k >= 0) { i.bought[k] = d; i.bought.sort((a, b) => a - b); } }
    t.date = d;
  }
  else if (el.id === 'tripBy') t.by = el.value;
  else if (el.id === 'tripOwn') t.own = parseEuro(el.value) || undefined;
  else return;
  save();
}, true);
