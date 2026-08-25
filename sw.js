const CACHE_NAME = 'kidtube-shell-v2';
const ICON_FILES = [
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];
const NETWORK_FIRST_FILES = ['./index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ICON_FILES.concat(NETWORK_FIRST_FILES)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Icons rarely change: cache-first is fine and works offline.
// index.html / manifest.json change often while this app is being updated, so they're
// network-first — always fetch the latest, only falling back to the cached copy when
// offline. shared-content.json and the YouTube API are never cached (must stay fresh).
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return;

  const isIcon = ICON_FILES.some((f) => url.pathname.endsWith(f.replace('./', '/')));
  if(isIcon){
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
    return;
  }

  const isNetworkFirst = event.request.mode === 'navigate' ||
    NETWORK_FIRST_FILES.some((f) => url.pathname.endsWith(f.replace('./', '/')));
  if(isNetworkFirst){
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
