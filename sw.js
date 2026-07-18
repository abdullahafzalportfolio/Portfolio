/* ============================================================================
   Service Worker — Abdullah Afzal
   Speeds up repeat visits and enables offline use when the site is hosted.
   Strategy:
     • Static assets (css, js, fonts, images) — cache-first (instant).
     • HTML pages — network-first with cache fallback (always fresh when online).
   Bump CACHE_VERSION whenever you change cached assets to force an update.
   ========================================================================== */
const CACHE_VERSION = "aa-v6";
const PRECACHE = [
  "./",
  "./index.html",
  "./privacy.html",
  "./terms.html",
  "./cookies.html",
  "./assets/css/main.css",
  "./assets/js/script.js",
  "./assets/fonts/space-grotesk-var.woff2",
  "./assets/fonts/inter-var.woff2",
  "./assets/images/abdullah-afzal.webp",
  "./assets/favicons/icon.svg",
  "./site.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // don't touch cross-origin (WhatsApp, etc.)

  const isHTML = request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    // Network-first: fresh content online, cached fallback offline.
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // Cache-first for static assets, revalidating in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
