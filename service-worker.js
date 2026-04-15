const CACHE = 'mwps-v11';
const PRECACHE = [
  './',
  './index.html',
  './config.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// Installation : précache des assets statiques
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// Activation : purge des anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch : network-first pour Sheets API, cache-first pour assets
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Sheets API → network only (pas de cache pour les données)
  if (url.includes('sheets.googleapis.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify({error:'offline'}), {status:503, headers:{'Content-Type':'application/json'}})));
    return;
  }

  // Chart.js CDN → stale-while-revalidate
  if (url.includes('cdn.jsdelivr.net')) {
    e.respondWith(
      caches.open(CACHE).then(async c => {
        const cached = await c.match(e.request);
        const fetchProm = fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; });
        return cached || fetchProm;
      })
    );
    return;
  }

  // Assets statiques → cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
