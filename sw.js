const CACHE_NAME = 'noise-monitor-ember-v7';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon.svg',
];
const APP_SHELL = './index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Bypass HTTP cache for app files so deploys show up without a hard reload
  const sameOrigin = event.request.url.startsWith(self.location.origin);
  const networkRequest = sameOrigin
    ? fetch(event.request, { cache: 'no-cache' })
    : fetch(event.request);

  event.respondWith(
    networkRequest
      .then((response) => {
        if (response.ok && sameOrigin) {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
          );
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request, { ignoreSearch: true });
        if (cached) return cached;

        // Offline navigations should still open the app shell
        if (event.request.mode === 'navigate') {
          const shell = (await caches.match(APP_SHELL)) || (await caches.match('./'));
          if (shell) return shell;
        }

        return Response.error();
      })
  );
});
