const CACHE_VERSION = "hooptrack-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Only handle same-origin GET requests. API calls (typically a different
// origin/port) are left alone so the app's own retry-queue logic handles them.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept API calls. Whether the frontend runs behind the Vite
  // dev server or Nginx in production, /api/* must always be proxied
  // straight through to FastAPI — the service worker must not serve a
  // cached response, cache the response, or otherwise get in the way.
  if (url.pathname.startsWith("/api/")) return;

  // Navigation requests: try network first, fall back to cached app shell
  // so the app still loads while offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, response.clone()));
          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Static assets (JS/CSS/images/fonts): cache-first with background refresh.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
