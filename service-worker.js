self.addEventListener("install", function (event) {
  console.log("FerryGuard Service Worker installato");
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  console.log("FerryGuard Service Worker attivo");
});

self.addEventListener("fetch", function (event) {
  event.respondWith(fetch(event.request));
});
