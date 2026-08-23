/* FerryGuard · service-worker.js — © Alessandro Pezzali · MIT
   Ad ogni release aggiornare VERSION: la PWA si aggiorna da sola su tutti i dispositivi. */
const VERSION = "fg-v2.0.5";
const CACHE = "ferryguard-" + VERSION;

const CORE = [
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./manifest.json",
  "./ferryguard-192.png",
  "./ferryguard-512.png",
  "./ferryguard-maskable-192.png",
  "./ferryguard-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || !req.url.startsWith("http")) return;

  // Navigazioni: prima la rete (così gli aggiornamenti arrivano subito), offline dalla cache
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Risorse: cache subito, aggiornamento in background (stale-while-revalidate)
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok && new URL(req.url).origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
