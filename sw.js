var CACHE = 'aura-v92';
self.addEventListener('install', function() { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(r) {
      return r || fetch(e.request).then(function(resp) {
        return caches.open(CACHE).then(function(cache) {
          cache.put(e.request, resp.clone());
          return resp;
        });
      });
    }).catch(function() { return caches.match('./AURA8.v92.html'); })
  );
});
