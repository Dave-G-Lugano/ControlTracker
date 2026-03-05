self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
    // Strategia semplice: carica sempre dalla rete
    e.respondWith(fetch(e.request));
});
