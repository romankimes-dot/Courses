// Synchro hors-ligne d'abord.
// L'état est découpé en enregistrements (item:<id>, aisle:<id>, map). Chaque modification locale
// part dans une file d'attente (outbox) envoyée dès qu'il y a du réseau. Conflit sur un même
// enregistrement : la modification la plus récente gagne. Le serveur numérote les changements
// (seq) pour que chaque appareil ne récupère que ce qu'il n'a pas encore vu.

const Sync = (() => {
  const CFG = K('courses.sync'), OUT = K('courses.outbox'), SNAP = K('courses.snap'), SEQ = K('courses.seq'), SEEN = K('courses.seen');
  const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  let cfg = get(CFG, null), outbox = get(OUT, {}), seq = get(SEQ, 0), snap, state = '', busy = false;
  // Dernière date de version reçue du serveur, par enregistrement : si l'horloge de ce téléphone
  // retarde, ses modifications sont quand même datées après et ne sont pas ignorées
  let seen = get(SEEN, {});

  function records(st) {
    const r = { settings: st.settings };
    st.items.forEach(i => { r['item:' + i.id] = i; });
    st.recipes.forEach(x => { r['recipe:' + x.id] = x; });
    st.shops.forEach((x, pos) => { r['shop:' + x.id] = { ...x, pos }; });
    st.stores.forEach((x, pos) => { r['store:' + x.id] = { ...x, pos }; });
    st.trips.forEach(x => { r['trip:' + x.id] = x; });
    Object.entries(st.aliases).forEach(([k, v]) => { r['alias:' + k] = v; });
    st.aisles.forEach((a, pos) => { r['aisle:' + a.id] = { ...a, pos }; });
    Object.entries(st.plan || {}).forEach(([d, ids]) => { r['plan:' + d] = ids; });
    Object.entries(st.shoppers || {}).forEach(([n, at]) => { r['shopper:' + n] = at; });
    Object.entries(st.people || {}).forEach(([n, at]) => { r['member:' + n] = at; });
    Object.entries(st.parts || {}).forEach(([n, p]) => { r['part:' + n] = p; });
    return r;
  }
  function fromRecords(r) {
    const all = prefix => Object.entries(r).filter(([k]) => k.startsWith(prefix)).map(([, d]) => d);
    return {
      items: all('item:'),
      recipes: all('recipe:'),
      shops: all('shop:').sort((a, b) => a.pos - b.pos).map(({ pos, ...x }) => x),
      aisles: all('aisle:').sort((a, b) => a.pos - b.pos).map(({ pos, ...a }) => a),
      stores: all('store:').sort((a, b) => a.pos - b.pos).map(({ pos, ...x }) => x),
      trips: all('trip:').sort((a, b) => a.date - b.date),
      settings: r.settings || {},
      aliases: Object.fromEntries(Object.entries(r).filter(([k]) => k.startsWith('alias:')).map(([k, v]) => [k.slice(6), v])),
      plan: Object.fromEntries(Object.entries(r).filter(([k]) => k.startsWith('plan:')).map(([k, v]) => [k.slice(5), v])),
      shoppers: Object.fromEntries(Object.entries(r).filter(([k]) => k.startsWith('shopper:')).map(([k, v]) => [k.slice(8), v])),
      parts: Object.fromEntries(Object.entries(r).filter(([k]) => k.startsWith('part:')).map(([k, v]) => [k.slice(5), v])),
      people: Object.fromEntries(Object.entries(r).filter(([k]) => k.startsWith('member:')).map(([k, v]) => [k.slice(7), v])),
      ...(r.map && !all('store:').length ? { map: r.map } : {}), // ancien format : plan unique
    };
  }
  const strings = r => Object.fromEntries(Object.entries(r).map(([k, d]) => [k, JSON.stringify(d)]));
  snap = get(SNAP, null) || strings(records(S));

  // Appelé après chaque sauvegarde locale : repère ce qui a changé depuis la dernière fois
  function changed() {
    const cur = strings(records(S)), u = Date.now();
    if (cfg) {
      let n = 0;
      const at = k => Math.max(u, (seen[k] || 0) + 1);
      for (const k in cur) if (cur[k] !== snap[k]) { outbox[k] = { data: JSON.parse(cur[k]), u: at(k) }; n++; }
      for (const k in snap) if (!(k in cur)) { outbox[k] = { data: null, u: at(k) }; n++; }
      if (n) {
        put(OUT, outbox);
        clearTimeout(changed.t);
        changed.t = setTimeout(run, 800);
      }
    }
    snap = cur;
    put(SNAP, snap);
    status();
  }

  async function rpc(fn, body) {
    const r = await fetch(`${cfg.url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      // Ancienne clé « anon » (JWT) : aussi en Authorization ; nouvelle clé « publishable » : apikey seule
      headers: { apikey: cfg.key, 'Content-Type': 'application/json', ...(cfg.key.startsWith('eyJ') ? { Authorization: 'Bearer ' + cfg.key } : {}) },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`${fn} ${r.status}`);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  }

  async function run() {
    if (!cfg) { if (autoFill()) { save(); render(); } return; }
    if (busy) return;
    if (me && !(S.people ||= {})[me]) { S.people[me] = Date.now(); save(); } // membre de la liste, même sans rien ajouter
    busy = true;
    try {
      const sent = Object.entries(outbox).map(([key, o]) => ({ key, data: o.data, u: o.u }));
      if (sent.length) {
        await rpc('push', { h: cfg.code, recs: sent });
        for (const s of sent) if (outbox[s.key]?.u === s.u) delete outbox[s.key];
        put(OUT, outbox);
      }
      const rows = await rpc('pull', { h: cfg.code, since: seq });
      if (rows.length) {
        const cur = records(S);
        const prev = Object.fromEntries(rows.map(row => [row.key, cur[row.key]]));
        let touched = false;
        for (const row of rows) {
          seq = Math.max(seq, row.seq);
          seen[row.key] = Math.max(seen[row.key] || 0, row.u);
          if (outbox[row.key]?.u > row.u) continue; // ma version, plus récente, partira au prochain envoi
          if (JSON.stringify(row.data) === JSON.stringify(cur[row.key] ?? null)) continue;
          if (row.data === null) delete cur[row.key]; else cur[row.key] = row.data;
          touched = true;
        }
        put(SEQ, seq);
        put(SEEN, seen);
        if (touched) {
          S = upgrade(fromRecords(cur));
          snap = strings(records(S));
          dedupe(S); // ses fusions partent au prochain envoi
          save();
          noteActivity(prev, rows);
          const ln = S.settings.listName;
          if (ln && !currentList().name.startsWith(ln)) { currentList().name = ln; saveLists(); }
          // Ne pas casser une saisie en cours ; le champ d'ajout rapide vide garde le focus
          const el = document.activeElement;
          if (!el?.matches('input:not([type=checkbox]), select') || (el.closest('#quick') && !el.value)) {
            const quick = el?.closest('#quick');
            render();
            if (quick) app.querySelector('#quick input')?.focus();
          }
        }
      }
      state = 'ok';
      if (autoFill()) { save(); if (!document.activeElement?.matches('input:not([type=checkbox]), select')) render(); }
    } catch (e) {
      state = navigator.onLine === false ? 'off' : 'err';
    } finally {
      busy = false;
      status();
    }
  }

  function status() {
    const el = document.getElementById('sync');
    if (!el) return;
    const n = Object.keys(outbox).length;
    el.textContent = !cfg ? ''
      : state === 'off' || state === 'err' ? `Sans réseau${n ? ` · ${n} modif${n > 1 ? 's' : ''} partira${n > 1 ? 'ont' : ''} plus tard` : ''}`
      : n ? 'Envoi…' : 'À jour';
    el.className = state === 'ok' && !n ? 'ok' : '';
  }

  function connect(c) {
    cfg = { url: c.url, key: c.key, code: c.code };
    put(CFG, cfg);
    currentList().code = c.code;
    saveLists();
    seq = 0;
    put(SEQ, 0);
  }

  // Deux téléphones ont créé le même article hors-ligne : on garde le plus ancien identifiant
  // (même choix sur tous les téléphones) et on fusionne liste, historique, prix, photo
  function dedupe(st) {
    const groups = {};
    for (const i of st.items) (groups[sameKey(i.name)] ||= []).push(i);
    for (const list of Object.values(groups)) {
      if (list.length < 2) continue;
      list.sort((a, b) => a.id < b.id ? -1 : 1);
      const [keep, ...dups] = list;
      for (const d of dups) {
        keep.need = keep.need || d.need;
        keep.done = keep.done || d.done;
        keep.pin = keep.pin || d.pin;
        keep.freq = keep.freq || d.freq;
        keep.photo ||= d.photo;
        keep.note ||= d.note;
        if ((d.at || 0) > (keep.at || 0)) Object.assign(keep, { by: d.by, at: d.at });
        keep.bought = [...new Set([...(keep.bought || []), ...(d.bought || [])])].sort((a, b) => a - b).slice(-HISTORY);
        keep.prices = [...(keep.prices || []), ...(d.prices || [])].sort((a, b) => a.d - b.d).slice(-HISTORY);
        st.recipes.forEach(r => { r.items = [...new Set(r.items.map(x => x === d.id ? keep.id : x))]; });
        for (const k in st.aliases) if (st.aliases[k] === d.id) st.aliases[k] = keep.id;
      }
      st.items = st.items.filter(i => !dups.includes(i));
    }
  }

  return {
    changed, run, records, fromRecords, strings,
    config: () => cfg,
    // Crée la liste partagée à partir de la liste de ce téléphone
    create(url, key) {
      const code = Array.from(crypto.getRandomValues(new Uint8Array(18)), b => b.toString(16).padStart(2, '0')).join('');
      connect({ url, key, code });
      S.settings.listName = currentList().name;
      snap = {};
      changed();
      render();
    },
    // Rejoint une liste existante : la liste locale est remplacée par celle du serveur
    join(c) {
      connect(c);
      if (c.name && !currentList().name.startsWith(c.name)) { currentList().name = c.name; saveLists(); }
      outbox = {};
      put(OUT, outbox);
      S = { aisles: [], items: [], recipes: [], shops: [], stores: [], trips: [], settings: {}, aliases: {}, plan: {} };
      snap = strings(records(S));
      save();
      render();
      run();
    },
    leave() {
      cfg = null;
      outbox = {};
      [CFG, OUT, SEQ].forEach(k => { try { localStorage.removeItem(k); } catch {} });
      status();
      render();
    },
    // Le lien porte l'accès et le nom de la liste (UTF-8 en base64)
    inviteLink: () => `${location.origin}${location.pathname}#join=${btoa(unescape(encodeURIComponent(JSON.stringify({ ...cfg, name: currentList().name, by: me || undefined }))))}`,
    decode(link) {
      const m = String(link).match(/#join=([^\s]+)/);
      try { const c = m && JSON.parse(decodeURIComponent(escape(atob(m[1])))); return c?.code ? c : null; } catch { return null; }
    },
    // Rejoindre : la liste déjà connue s'ouvre ; une liste vide de ce téléphone est utilisée ;
    // sinon une nouvelle liste est créée (on ne remplace jamais une liste qui a déjà servi)
    joinLink(c) {
      const known = lists.find(l => l.code === c.code);
      if (known) { if (known.id !== LIST) switchList(known.id); return; }
      if (!cfg && !hasOwnData()) return this.join(c);
      const base = c.name || 'Liste partagée';
      const l = newList(lists.some(x => x.name === base) && c.by ? `${base} · ${c.by}` : base);
      lput('courses.pendingJoin:' + l.id, c);
      switchList(l.id);
    },
    init() {
      const pending = lget('courses.pendingJoin:' + LIST, null);
      if (pending) { try { localStorage.removeItem('courses.pendingJoin:' + LIST); } catch {} return this.join(pending); }
      if (location.hash.startsWith('#join=')) {
        const c = this.decode(location.hash);
        history.replaceState(null, '', location.pathname);
        if (!c) alert('Lien d\'invitation invalide');
        else if (c.code !== cfg?.code) return this.joinLink(c);
      }
      status();
      run();
    },
  };
})();

if (!welcomed && !Sync.config() && !location.hash.startsWith('#join=')) tab = 'welcome';
render();
Sync.init();
addEventListener('online', Sync.run);
addEventListener('hashchange', () => { if (location.hash.startsWith('#join=')) Sync.init(); }); // lien ouvert app déjà affichée
document.addEventListener('visibilitychange', () => { if (!document.hidden) Sync.run(); });
setInterval(() => { if (!document.hidden) Sync.run(); }, 8000);
