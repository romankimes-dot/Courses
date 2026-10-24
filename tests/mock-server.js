// Faux serveur de synchro (fonctions push / pull de Supabase, en mémoire) + fichiers de l'app.
// Usage : node tests/mock-server.js [dossier de l'app] [port]
const http = require('http'), fs = require('fs'), path = require('path');
const root = process.argv[2] || require('path').join(__dirname, '..'), db = new Map(); let n = 0;
http.createServer((req, res) => {
  let body = '';
  req.on('data', c => body += c).on('end', () => {
    if (req.url.startsWith('/rest/v1/rpc/')) {
      const fn = req.url.split('/').pop(), a = JSON.parse(body);
      res.setHeader('Content-Type', 'application/json');
      if (fn === 'push') {
        for (const r of a.recs) {
          const k = a.h + '|' + r.key, cur = db.get(k);
          if (!cur || cur.u < r.u) db.set(k, { h: a.h, key: r.key, data: r.data, u: r.u, seq: ++n });
        }
        return res.end('');
      }
      return res.end(JSON.stringify([...db.values()].filter(r => r.h === a.h && r.seq > a.since).sort((x, y) => x.seq - y.seq)));
    }
    const f = path.join(root, decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(/\/$/, '/index.html'));
    fs.readFile(f, (e, d) => {
      if (e) { res.statusCode = 404; return res.end(); }
      res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' }[path.extname(f)] || 'text/plain');
      res.end(d);
    });
  });
}).listen(+process.argv[3] || 8766);
