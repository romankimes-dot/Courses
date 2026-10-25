// Partage des dépenses entre membres de la liste (coloc, courses pour un proche…) : qui a payé quoi, qui doit combien.
// Option de la liste (S.settings.split) : désactivée, c'est un compte joint, on ne suit que le budget commun.
// Chaque passage en caisse note qui a payé (t.by) ; on peut ajouter une dépense à la main ;
// un remboursement est un passage { type: 'settle', from, to, total } qui ne compte pas dans les dépenses ;
// t.own = part perso du payeur (ex. ses bonbons) : hors partage.

// Membres : ceux qui ont payé, ajouté ou coché quelque chose, plus moi
const members = () => [...new Set([me, ...S.trips.flatMap(t => [t.by, t.from, t.to]), ...S.items.flatMap(i => [i.by, i.lastBy])]
  .filter(n => n && n !== '?'))].sort((a, b) => a.localeCompare(b));

// Soldes à parts égales : positif = on lui doit, négatif = il doit
function balances() {
  const ms = members(), bal = Object.fromEntries(ms.map(m => [m, 0]));
  const spent = S.trips.filter(t => t.type !== 'settle' && t.total && t.by && t.by in bal);
  const shared = t => t.total - Math.min(t.own || 0, t.total);
  const total = spent.reduce((s, t) => s + shared(t), 0);
  for (const t of spent) bal[t.by] += shared(t);
  for (const m of ms) bal[m] -= total / ms.length;
  for (const t of S.trips.filter(t => t.type === 'settle')) {
    if (t.from in bal) bal[t.from] += t.total;
    if (t.to in bal) bal[t.to] -= t.total;
  }
  return { bal, total };
}

// Remboursements suggérés : le plus endetté rembourse le plus créditeur, jusqu'à zéro
function transfers(bal) {
  const debt = Object.entries(bal).filter(([, v]) => v < -.005).map(([n, v]) => [n, -v]).sort((a, b) => b[1] - a[1]);
  const cred = Object.entries(bal).filter(([, v]) => v > .005).sort((a, b) => b[1] - a[1]);
  const out = [];
  while (debt.length && cred.length) {
    const amount = Math.min(debt[0][1], cred[0][1]);
    out.push({ from: debt[0][0], to: cred[0][0], amount: Math.round(amount * 100) / 100 });
    debt[0][1] -= amount; cred[0][1] -= amount;
    if (debt[0][1] < .005) debt.shift();
    if (cred[0][1] < .005) cred.shift();
  }
  return out;
}

let expenseOpen = false;
// « AAAA-MM-JJ » -> horodatage : maintenant si c'est aujourd'hui, sinon midi ce jour-là
const dayTime = d => !d || d === dayKey(new Date()) ? Date.now() : new Date(`${d}T12:00`).getTime() || Date.now();
const baseBudget = views.budget;
views.budget = () => {
  const ms = members();
  const { bal } = balances();
  const owed = transfers(bal);
  const split = !!S.settings.split;
  return `
    ${baseBudget()}
    ${split ? `<h3>Partage des dépenses</h3>
    ${ms.length > 1 ? `
      ${ms.map(m => `<div class="row static"><span class="name">${esc(m)}${m === me ? ' <small>(vous)</small>' : ''}</span><span class="${bal[m] < -.005 ? 'warn' : bal[m] > .005 ? 'tag' : ''}">${bal[m] > .005 ? '+' : ''}${euro(bal[m])}</span></div>`).join('')}
      ${owed.length ? owed.map(o => `
        <div class="row static owe"><span class="name">${esc(o.from)} doit ${euro(o.amount)} à ${esc(o.to)}</span><button class="ghost" data-a="settle" data-from="${esc(o.from)}" data-to="${esc(o.to)}" data-amount="${o.amount}">${icon.check} Remboursé</button></div>`).join('')
        : `<p class="hint">${icon.check} Tout le monde est à jour.</p>`}`
      : `<p class="hint">Quand plusieurs personnes paient (prénom réglé dans les réglages), l'app calcule qui doit combien à qui, à parts égales.</p>`}` : ''}
    ${expenseOpen ? `
      <form id="expenseForm" class="card">
        <label class="field">Montant (€)<input name="amount" inputmode="decimal" required placeholder="ex. 23,50"></label>
        <label class="field">Pour quoi<input name="name" placeholder="ex. Marché, pharmacie" autocomplete="off"></label>
        <label class="field">Date d'achat<input name="date" type="date" value="${dayKey(new Date())}" max="${dayKey(new Date())}" required></label>
        ${split ? `<label class="field">Payé par<select name="by">${[...new Set([me || 'Moi', ...ms])].map(m => `<option>${esc(m)}</option>`).join('')}</select></label>` : ''}
        <div class="bar"><button class="accent grow">Ajouter la dépense</button><button type="button" class="ghost" data-a="expense">Annuler</button></div>
      </form>` : `<button class="wide" data-a="expense">${icon.plus} Ajouter une dépense à la main</button>`}`;
};

Object.assign(actions, {
  expense: () => { expenseOpen = !expenseOpen; },
  settle: ({ from, to, amount }) => {
    if (!confirm(`${from} a remboursé ${euro(+amount)} à ${to} ?`)) return;
    S.trips.push({ id: uid(), date: Date.now(), type: 'settle', from, to, total: +amount, place: 'Remboursement', n: 0, by: me || undefined });
  },
});

document.addEventListener('submit', e => {
  if (e.target.id !== 'expenseForm') return;
  const f = new FormData(e.target), total = parseEuro(f.get('amount'));
  if (total == null) return;
  S.trips.push({ id: uid(), date: dayTime(f.get('date')), type: 'expense', total, place: f.get('name').trim() || 'Dépense', n: 0, by: f.get('by') || me || undefined, names: [] });
  expenseOpen = false;
}, true);
