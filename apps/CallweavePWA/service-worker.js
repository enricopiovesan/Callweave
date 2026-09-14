const CACHE = 'callweave-presentation-v25';
const ASSETS = ['./', './index.html', './styles.css', './soundscape.css', './main.js', './web-recording.js', './manifest.webmanifest', './assets/listening-soundscape.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(response => {
        const cachedResponse = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, cachedResponse));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
