// Service worker de Vonia : rend l'appli disponible hors connexion.
const APP_CACHE = "vonia-app-v7";
const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/app.css",
  "js/ui.js",
  "js/db.js",
  "js/tags.js",
  "js/player.js",
  "js/library.js",
  "js/youtube.js",
  "js/videos.js",
  "js/recap.js",
  "js/app.js",
  "fonts/anton.woff2",
  "fonts/caveat-brush.woff2",
  "fonts/rubik-500.woff2",
  "fonts/rubik-600.woff2",
  "fonts/rubik-700.woff2",
  "fonts/rubik-800.woff2",
  "fonts/rubik-900.woff2",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/sun.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(APP_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("vonia-app-") && k !== APP_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache d'abord, mise à jour en arrière-plan (la nouvelle version s'affiche au lancement suivant).
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      const update = fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(APP_CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => hit || caches.match("index.html"));
      return hit || update;
    })
  );
});
