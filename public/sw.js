// Service Worker for Alien Invasion Game
// Provides offline functionality and caching for PWA

const CACHE_VERSION = 3; // Bump this to force clients to pick up new caches
const CACHE_NAME = `alien-invasion-v${CACHE_VERSION}`;

// Precache only long-lived, version-agnostic assets (avoid HTML and app JS)
const STATIC_CACHE_URLS = [
  "/manifest.json",
  "/icon-192x192.svg",
  "/icon-512x512.svg",
  "/apple-touch-icon.svg",
  // Audio files
  "/zap.mp3",
  "/alien-shoot.mp3",
  "/mega-blast.mp3",
  "/game-over.mp3",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Caching static assets");
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log("Service Worker installation complete");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("Service Worker installation failed:", error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("Service Worker activation complete");
        return self.clients.claim();
      })
  );
});

// Fetch event - tailored strategies to avoid stale app shell
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith("http")) {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // Network-first for navigations to ensure new HTML/app shell
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        // Fallback to any cached root or offline page if you add one later
        const cache = await caches.open(CACHE_NAME);
        const cachedRoot = await cache.match("/");
        return cachedRoot || Response.error();
      })
    );
    return;
  }

  // Stale-while-revalidate for Next.js build assets (immutable hashed files)
  if (requestUrl.pathname.startsWith("/_next/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const networkPromise = fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => undefined);
        return cached || networkPromise || fetch(event.request);
      })
    );
    return;
  }

  // Cache-first for images, audio, fonts (low-churn assets)
  const destination = event.request.destination;
  if (["image", "audio", "font"].includes(destination)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  // Default: stale-while-revalidate for other GETs
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const networkPromise = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => undefined);
      return cached || networkPromise || fetch(event.request);
    })
  );
});

// Handle messages from the main app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});

// Notification click handler (for future use)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(clients.openWindow("/"));
});
