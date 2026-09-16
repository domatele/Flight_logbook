const CACHE_NAME = "easa-logbook-v74";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./favicon.ico",
  "./icon-32.png",
  "./icon-152.png",
  "./icon-167.png",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle GET requests. Leave POST/PUT/etc. to the browser/app.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // External resources (Google sign-in, Drive API, OurAirports, etc.)
  // remain network-only. They must never prevent the local app shell
  // from loading offline.
  if (url.origin !== self.location.origin) return;

  // Navigation: always prefer the cached application shell. If the shell
  // is missing, try the network and finally fall back to cached index.html.
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match("./index.html").then((cachedIndex) => {
        if (cachedIndex) return cachedIndex;
        return fetch(request).catch(() => caches.match("./index.html"));
      })
    );
    return;
  }

  // Same-origin application assets: cache-first, with a network fallback.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
