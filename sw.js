// ============================================================
// OpticQuiz service worker  v1 — opticquiz.com
// Network-FIRST: always tries the live network, caches successes,
// and only falls back to cache when offline. This keeps content
// fresh (no staleness) while making visited pages work offline —
// reinforcing the "everything local, no server needed" trust model.
// ============================================================
var CACHE = 'oq-v1';

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () {});
      return res;
    }).catch(function () {
      return caches.match(e.request);
    })
  );
});
