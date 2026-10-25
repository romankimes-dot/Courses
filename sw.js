// Hors-ligne d'abord : l'app est servie depuis le cache (instantané, même sans réseau),
// puis mise à jour en arrière-plan pour la prochaine ouverture.
const CACHE = 'courses-v7';
const FILES = ['./', 'index.html', 'src/lists.js', 'src/app.js', 'src/feed.js', 'src/meals.js', 'src/money.js', 'src/scan.js', 'src/sheet.js', 'src/sync.js', 'src/style.css', 'manifest.json', 'icon.svg'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
});
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // la synchro passe directement
  e.respondWith(caches.open(CACHE).then(async c => {
    const cached = await c.match(e.request, { ignoreSearch: true });
    const fresh = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; });
    if (cached) { fresh.catch(() => {}); return cached; }
    return fresh;
  }));
});
