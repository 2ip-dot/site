const CACHE = 'osnastka-v2';
const STATIC = ['./', './index.html', './login.html', './app.js', './manifest.json'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const { request } = e;
    // Не кешируем API запросы
    if (request.url.includes('get_data.php') || request.url.includes('auth.php')) return;
    e.respondWith(caches.match(request).then(r => r || fetch(request)));
});
