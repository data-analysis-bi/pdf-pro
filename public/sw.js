self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", () => {
  clients.claim()
})

self.addEventListener("fetch", (event) => {
  // Provide a basic fetch handler to satisfy PWA requirements
  // Use a network-first strategy with cache fallback
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open("pdf-pro-cache").then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
})
