const CACHE = 'callweave-presentation-v1';
const ASSETS = ['./', './index.html', './styles.css', './soundscape.css', './main.js', './manifest.webmanifest', './assets/listening-soundscape.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request))));
