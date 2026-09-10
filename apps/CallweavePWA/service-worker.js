const CACHE = 'callweave-presentation-v9';
const ASSETS = ['./', './index.html', './styles.css', './soundscape.css', './main.js', './runtime-client.js', './runtime-events.js', './native-host.js', './shared-surface.json', './manifest.webmanifest', './assets/listening-soundscape.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request))));
