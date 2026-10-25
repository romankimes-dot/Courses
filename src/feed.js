// Activité (🔔) : ce que font les autres sur la liste, vu à la synchro. Gardée sur ce téléphone
// (50 derniers événements). Si l'utilisateur l'a autorisé, une notification du téléphone part aussi
// quand l'app tourne en arrière-plan. App fermée : il faudrait un service de notifications côté serveur.

const FEED = K('courses.feed');
const feed = () => lget(FEED, []);
const others = n => n && n !== me && n !== '?';

function notify(texts) {
  const list = [...texts.map(text => ({ t: Date.now(), text, seen: false })), ...feed()].slice(0, 50);
  lput(FEED, list);
  if (!texts.length || !('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
  const body = texts.length > 1 ? `${texts[0]} (+${texts.length - 1})` : texts[0];
  navigator.serviceWorker?.ready.then(r => r.showNotification(currentList().name, { body, icon: 'icon.svg', tag: 'courses' }))
    .catch(() => { try { new Notification(currentList().name, { body }); } catch {} });
}

// Appelé par la synchro avec l'état d'avant et les enregistrements reçus
function noteActivity(prev, rows) {
  const texts = [];
  for (const { key, data: n } of rows) {
    const o = prev[key];
    if (!n) continue;
    if (key.startsWith('item:')) {
      if (!o?.need && n.need && others(n.by)) texts.push(`${n.by} a ajouté ${n.name}`);
      if (!o?.done && n.done && others(n.doneBy) && n.by === me) texts.push(`${n.doneBy} a pris ${n.name}`);
      if (!o?.missing && n.missing && n.by === me && others(n.missing.by)) texts.push(`${n.name} : pas trouvé par ${n.missing.by}`);
    }
    if (key.startsWith('shopper:')) {
      const name = key.slice(8);
      if (others(name) && n !== o && Date.now() - n < 36e5) texts.push(`${name} part faire les courses : ajoutez vite !`);
    }
    if (key.startsWith('trip:') && !o && others(n.by)) {
      texts.push(n.type === 'settle' ? `${n.from} a remboursé ${euro(n.total)} à ${n.to}`
        : n.type === 'expense' ? `${n.by} a ajouté une dépense : ${n.place} ${euro(n.total || 0)}`
        : `${n.by} a terminé les courses (${n.n} article${n.n > 1 ? 's' : ''}${n.total ? `, ${euro(n.total)}` : ''})`);
    }
  }
  if (texts.length) notify(texts);
}

const ago = t => {
  const m = Math.round((Date.now() - t) / 6e4);
  return m < 1 ? 'à l\'instant' : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : shortDate(t);
};

views.activity = () => {
  const list = feed();
  lput(FEED, list.map(e => ({ ...e, seen: true })));
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  return `
    <button class="ghost back" data-a="go" data-v="list">← Liste</button>
    <h2>Activité</h2>
    ${perm === 'default' ? `<button class="wide" data-a="askNotify">🔔 Recevoir une notification sur ce téléphone</button>` : ''}
    ${list.length ? list.map(e => `
      <div class="row static ${e.seen ? '' : 'new'}"><span class="name">${esc(e.text)}</span><small>${ago(e.t)}</small></div>`).join('')
      : `<p class="empty">Rien pour l'instant.</p><p class="hint center">Ici s'affiche ce que font les autres : ajouts, départ en courses, articles pris pour vous, pas trouvés, dépenses.</p>`}`;
};

Object.assign(actions, {
  askNotify: async () => {
    try { await Notification.requestPermission(); } catch {}
    render();
  },
});
