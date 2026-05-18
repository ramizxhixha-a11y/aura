/* ============================================================
   AURA8 — Service Worker v120 (18/05/2026)
   ------------------------------------------------------------
   FIX PERMANENT : plus jamais de blocage de modules JS/CSS.
   - skipWaiting + clients.claim → nouvelle version active de suite
   - Network-first pour JS/CSS/HTML → code frais à chaque reload
   - Cache-first uniquement pour assets statiques (images, fonts)
   - Purge automatique des anciens caches (v92, etc.)
   - Pas de fallback vers AURA8.v92.html (fossile supprimé)
   ============================================================ */

var CACHE = 'aura-v120';

// --- INSTALL : activer immédiatement, sans attendre la fermeture des onglets
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

// --- ACTIVATE : prendre le contrôle + supprimer les anciens caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    Promise.all([
      // Prendre le contrôle des onglets ouverts
      self.clients.claim(),
      // Supprimer TOUS les anciens caches (v92, etc.)
      caches.keys().then(function(keys) {
        return Promise.all(
          keys.filter(function(k) { return k !== CACHE; })
              .map(function(k) { return caches.delete(k); })
        );
      })
    ])
  );
});

// --- FETCH : stratégie selon le type de ressource
self.addEventListener('fetch', function(event) {
  var req = event.request;
  var url = req.url;

  // Ignorer les requêtes non-GET (POST, etc.)
  if (req.method !== 'GET') return;

  // Détecter le type de ressource
  var isCodeFile = /\.(js|css|html)(\?|$)/i.test(url);
  var isHTML = req.mode === 'navigate' || /\.html(\?|$)/i.test(url);

  if (isCodeFile || isHTML) {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // NETWORK-FIRST pour JS / CSS / HTML
    // → on tente toujours le réseau d'abord = code à jour garanti
    // → fallback cache uniquement si offline
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    event.respondWith(
      fetch(req).then(function(resp) {
        // Mettre à jour le cache en arrière-plan
        if (resp && resp.status === 200 && resp.type === 'basic') {
          var respClone = resp.clone();
          caches.open(CACHE).then(function(cache) {
            cache.put(req, respClone);
          });
        }
        return resp;
      }).catch(function() {
        // Offline → on tente le cache
        return caches.match(req);
      })
    );
  } else {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CACHE-FIRST pour assets statiques (images, fonts, etc.)
    // → rapide, économe en data
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    event.respondWith(
      caches.match(req).then(function(cached) {
        return cached || fetch(req).then(function(resp) {
          if (resp && resp.status === 200 && resp.type === 'basic') {
            var respClone = resp.clone();
            caches.open(CACHE).then(function(cache) {
              cache.put(req, respClone);
            });
          }
          return resp;
        });
      })
    );
  }
});

// --- MESSAGE : permettre à l'app de demander une mise à jour forcée
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(function(keys) {
      keys.forEach(function(k) { caches.delete(k); });
    });
  }
});
