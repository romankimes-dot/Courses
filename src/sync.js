// Synchro hors-ligne d'abord.
// L'état est découpé en enregistrements (item:<id>, aisle:<id>, map). Chaque modification locale
// part dans une file d'attente (outbox) envoyée dès qu'il y a du réseau. Conflit sur un même
// enregistrement : la modification la plus récente gagne. Le serveur numérote les changements
// (seq) pour que chaque appareil ne récupère que ce qu'il n'a pas encore vu.

const Sync = (() => {
  const CFG = 'courses.sync', OUT = 'courses.outbox', SNAP = 'courses.snap', SEQ = 'courses.seq';
  const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  let cfg = get(CFG, null), outbox = get(OUT, {}), seq = get(SEQ, 0), snap, state = '', busy = false;

  function records(st) {
    const r = { settings: st.settings };
    st.items.forEach(i => { r['item:' + i.id] = i; });
    st.recipes.forEach(x => { r['recipe:' + x.id] = x; });
    st.shops.forEach((x, pos) => { r['shop:' + x.id] = { ...x, pos }; });
    st.stores.forEach((x, pos) => { r['store:' + x.id] = { ...x, pos }; });
    st.trips.forEach(x => { r['trip:' + x.id] = x; });
    st.aisles.forEach((a, pos) => { r['aisle:' + a.id] = { ...a, pos }; });
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
      for (const k in cur) if (cur[k] !== snap[k]) { outbox[k] = { data: JSON.parse(cur[k]), u }; n++; }
      for (const k in snap) if (!(k in cur)) { outbox[k] = { data: null, u }; n++; }
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
    if (!cfg || busy) return;
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
        let touched = false;
        for (const row of rows) {
          seq = Math.max(seq, row.seq);
          if (outbox[row.key]?.u > row.u) continue; // ma version, plus récente, partira au prochain envoi
          if (JSON.stringify(row.data) === JSON.stringify(cur[row.key] ?? null)) continue;
          if (row.data === null) delete cur[row.key]; else cur[row.key] = row.data;
          touched = true;
        }
        put(SEQ, seq);
        if (touched) {
          S = upgrade(fromRecords(cur));
          snap = strings(records(S));
          save();
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
      : state === 'off' ? `Hors-ligne${n ? ` · ${n} en attente` : ''}`
      : state === 'err' ? `Pas de connexion${n ? ` · ${n} en attente` : ''}`
      : n ? `${n} en attente` : 'Synchronisé';
    el.className = state === 'ok' && !n ? 'ok' : '';
  }

  function connect(c) {
    cfg = c;
    put(CFG, cfg);
    seq = 0;
    put(SEQ, 0);
  }

  return {
    changed, run,
    config: () => cfg,
    // Crée la liste partagée à partir de la liste de ce téléphone
    create(url, key) {
      const code = Array.from(crypto.getRandomValues(new Uint8Array(18)), b => b.toString(16).padStart(2, '0')).join('');
      connect({ url, key, code });
      snap = {};
      changed();
      render();
    },
    // Rejoint une liste existante : la liste locale est remplacée par celle du serveur
    join(c) {
      connect(c);
      outbox = {};
      put(OUT, outbox);
      S = { aisles: [], items: [], recipes: [], shops: [], stores: [], trips: [], settings: {} };
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
    inviteLink: () => `${location.origin}${location.pathname}#join=${btoa(JSON.stringify(cfg))}`,
    init() {
      const m = location.hash.match(/^#join=(.+)$/);
      if (m) {
        history.replaceState(null, '', location.pathname);
        try {
          const c = JSON.parse(atob(m[1]));
          if (c.code !== cfg?.code && confirm('Rejoindre la liste partagée ? La liste de ce téléphone sera remplacée.')) return this.join(c);
        } catch { alert('Lien d\'invitation invalide'); }
      }
      status();
      run();
    },
  };
})();

render();
Sync.init();
addEventListener('online', Sync.run);
document.addEventListener('visibilitychange', () => { if (!document.hidden) Sync.run(); });
setInterval(() => { if (!document.hidden) Sync.run(); }, 8000);
