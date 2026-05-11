const CACHE_NAME = "clubhub-v7.0.4"; // Bumped again to force clients to refresh caches
const urlsToCache = [
  "/",
  "/index.html",
  "/styles.css?v=20260502",
  "/unified-nav.css?v=20260502",
  "/unified-nav.js?v=20260502",
  "/script.js",
  "/api-service.js",
  "/dialog-service.js",
  "/group-switcher.js",
  "/group-switcher.css",
  "/images/logo.png",
];

// Install event - cache resources
self.addEventListener("install", (event) => {
  // If running on localhost during development, unregister this service worker
  // immediately and clear caches so dev assets aren't stuck behind the SW.
  try {
    const host = self.location && self.location.hostname;
    if (host === '127.0.0.1' || host === 'localhost') {
      event.waitUntil(
        (async () => {
          try {
            const regs = await self.registration.unregister();
          } catch (e) {}
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        })()
      );
      return;
    }
  } catch (e) {}

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    }),
  );
  self.skipWaiting();
});

// Activate event - clean up old caches immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - sophisticated strategy
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-http/https schemes
  if (!url.protocol.startsWith("http")) return;

  // 1. API CALLS: Network Only (but handle offline gracefully)
  if (url.pathname.startsWith("/api/") || url.hostname !== self.location.hostname) {
    // For API and cross-origin requests, prefer network but return a sensible
    // fallback response when offline instead of letting the fetch rejection
    // bubble up and cause "Uncaught (in promise) TypeError: Failed to fetch".
    event.respondWith(
      fetch(event.request).catch(() => {
        // If the request expects JSON, return a 503 JSON response
        const accept = event.request.headers.get('accept') || '';
        if (accept.includes('application/json') || event.request.url.includes('/api/')) {
          return new Response(JSON.stringify({ error: 'Network unavailable' }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' },
          });
        }
        // Otherwise, try to return a cached asset or a generic 503
        return caches.match(event.request).then((cached) => cached || new Response('Service Unavailable', { status: 503 }));
      }),
    );
    return;
  }

  // 2. HTML FILES: Network First (Ensures users always get latest version)
  if (event.request.mode === "navigate" || url.pathname.endsWith(".html")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  // 3. ASSETS (JS, CSS, Images): Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => null); // swallow network errors and fallback to cache below

      // Prefer cached response; if missing, use network (if available); otherwise a graceful 503
      return cachedResponse || fetchPromise || new Response('Service Unavailable', { status: 503 });
    }),
  );
});
