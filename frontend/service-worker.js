const CACHE_NAME = "clubhub-v7.0.1"; // Bumped version for forced update
const urlsToCache = [
  "/",
  "/index.html",
  "/styles.css",
  "/script.js",
  "/api-service.js",
  "/dialog-service.js",
  "/unified-nav.css",
  "/unified-nav.js",
  "/group-switcher.js",
  "/group-switcher.css",
  "/images/logo.png",
];

// Install event - cache resources
self.addEventListener("install", (event) => {
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

  // 1. API CALLS: Network Only
  if (url.pathname.startsWith("/api/") || url.hostname !== self.location.hostname) {
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
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    }),
  );
});
