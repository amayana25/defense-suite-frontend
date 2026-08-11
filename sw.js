// Defense Suite — Service Worker
// Objectif : rendre l'app installable (critère PWABuilder/Play Store) et
// mettre en cache l'interface statique pour un chargement rapide hors ligne.
// Les appels /api/* ne sont JAMAIS mis en cache : les analyses doivent
// toujours être fraîches et passer par le réseau.

const CACHE_NAME = "defense-suite-v1";
const APP_SHELL = [
  "/dashboard.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ne jamais mettre en cache les appels API — toujours réseau direct.
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Stratégie "cache d'abord, réseau en repli" pour l'app shell statique.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (event.request.method === "GET" && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
