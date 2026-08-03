const CACHE_NAME = 'zeltlager-cache-v2';

const PRECACHE_URLS = [
  '/',
  '/index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return Promise.all(
          PRECACHE_URLS.map((url) => {
            return cache.add(url).catch((err) => {
              console.warn('[Service Worker] Failed to cache precache resource:', url, err);
            });
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Serve same-origin requests
  if (url.origin === self.location.origin) {
    const isApiRequest = url.pathname.startsWith('/api/');

    if (isApiRequest) {
      if (request.method === 'GET') {
        // Network-First with Cache-Fallback for GET API requests
        event.respondWith(
          fetch(request)
            .then((response) => {
              if (response.status === 200) {
                const responseCopy = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, responseCopy);
                });
              }
              return response;
            })
            .catch(() => {
              // Try loading from Cache
              return caches.match(request).then((cachedResponse) => {
                if (cachedResponse) {
                  // Attach a custom header so the frontend can check offline status
                  const headers = new Headers(cachedResponse.headers);
                  headers.set('X-From-Offline-Cache', 'true');
                  
                  return cachedResponse.text().then((body) => {
                    return new Response(body, {
                      status: 200,
                      statusText: 'Cached Offline Data',
                      headers: headers
                    });
                  });
                }
                
                // Return a json fallback if offline and no cache
                return new Response(
                  JSON.stringify({ 
                    error: "offline", 
                    message: "Du bist offline. Keine gespeicherten Dienstplandaten in diesem Bereich." 
                  }),
                  { 
                    status: 503, 
                    headers: { 'Content-Type': 'application/json' } 
                  }
                );
              });
            })
        );
      } else {
        // Post/Put/Delete should pass straight to network
        event.respondWith(fetch(request));
      }
    } else {
      // Static assets: Network-First with Cache-Fallback
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response.status === 200) {
              const responseCopy = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseCopy);
              });
            }
            return response;
          })
          .catch(() => {
            return caches.match(request).then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Fallback to entry root for direct SPA routing if offline
              if (request.mode === 'navigate') {
                return caches.match('/');
              }
            });
          })
      );
    }
  }
});

// --- PWA Diagnostics: Background message delivery and direct SW notification trigger ---
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received in background:', event.data);
  
  if (!event.data) return;

  if (event.data.type === 'PING') {
    // Reply back to active clients to verify background communication transport
    if (event.source) {
      event.source.postMessage({
        type: 'PONG',
        success: true,
        message: 'Service Worker Hintergrund ist betriebsbereit und kommuniziert bidirektional! ⛺'
      });
    }
  } else if (event.data.type === 'TEST_NOTIFICATION') {
    // Trigger notification directly from the SW registration (crucial for Chrome and stand-alone PWAs)
    const title = event.data.title || 'Pfingstlager App ⛺';
    const options = {
      body: event.data.body || 'Dieser Test kommt direkt aus dem Service Worker Hintergrund!',
      icon: self.location.origin + '/logo-192.png',
      badge: self.location.origin + '/logo-192.png',
      vibrate: [150, 50, 150]
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
        .then(() => {
          console.log('[Service Worker] Test-Benachrichtigung erfolgreich gefeuert!');
          if (event.source) {
            event.source.postMessage({
              type: 'TEST_NOTIFICATION_SENT',
              success: true
            });
          }
        })
        .catch((error) => {
          console.error('[Service Worker] Fehler beim Feuern der Test-Benachrichtigung:', error);
          if (event.source) {
            event.source.postMessage({
              type: 'TEST_NOTIFICATION_SENT',
              success: false,
              error: error.message || String(error)
            });
          }
        })
    );
  }
});

// --- Handle push events delivered by modern browser push service ---
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Event received.');
  
  let data = {
    title: 'Pfingstlager App ⛺',
    body: 'Es gibt ein neues Dienstplan-Update!'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Pfingstlager App ⛺',
        body: event.data.text()
      };
    }
  }

  const title = data.title;
  const options = {
    body: data.body,
    icon: self.location.origin + '/logo-192.png',
    badge: self.location.origin + '/logo-192.png',
    vibrate: [200, 100, 200],
    data: {
      id: data.id || 'default'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// --- Handle clicking on any displayed notification ---
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Detected.');
  event.notification.close();

  // Focus the existing window or open a new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
