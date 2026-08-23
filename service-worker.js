/* FerryGuard · service-worker.js — © Alessandro Pezzali · MIT
   Ad ogni release aggiornare VERSION: la PWA si aggiorna da sola su tutti i dispositivi. */
const VERSION = "fg-v2.0.9";
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
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: "reload" })))));
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

// Richiesta che scavalca la cache HTTP del browser (l'edge serve con max-age lungo).
// Ricostruita dall'URL: clonare una richiesta di navigazione con un init non vuoto
// non è supportato allo stesso modo su tutti i browser.
const fresh = (url) => new Request(url, { cache: "no-store" });

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || !req.url.startsWith("http")) return;

  // Navigazioni: prima la rete (così gli aggiornamenti arrivano subito), offline dalla cache
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(fresh(req.url))
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // app.js e app.css: prima la rete come le navigazioni, altrimenti l'HTML nuovo
  // finirebbe per girare con il JS/CSS vecchio preso dalla cache. Offline: cache.
  const url = new URL(req.url);
  if (url.origin === self.location.origin && /\/(app\.js|app\.css)$/.test(url.pathname)) {
    event.respondWith(
      fetch(fresh(req.url))
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Risorse: cache subito, aggiornamento in background (stale-while-revalidate)
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok && url.origin === self.location.origin) {
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
