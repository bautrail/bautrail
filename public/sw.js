const CACHE_NAME = "bautrail-v20260519";
const APP_SHELL = [
  "/",
  "/index.html",
  "/login.html",
  "/register.html",
  "/offline.html",
  "/style.css",
  "/supabase.js",
  "/auth-context.js",
  "/notifications.js",
  "/company-context.js",
  "/auto-textareas.js",
  "/trash-utils.js",
  "/work-presets.js",
  "/login.js",
  "/register.js",
  "/material-list-page.js",
  "/project-documents.js",
  "/pwa.js",
  "/assets/bautrail-logo.png",
  "/assets/bautrail-icon-192.png",
  "/assets/bautrail-icon-512.png",
  "/assets/bautrail-apple-touch-icon.png",
  "/assets/app-icon.svg",
  "/assets/app-icon-192.png",
  "/assets/app-icon-512.png",
  "/assets/apple-touch-icon.png",
  "/auftraege.html",
  "/auftrag-anlegen.html",
  "/auftrag-detail.html",
  "/buero-dashboard.html",
  "/chef-dashboard.html",
  "/dringend.html",
  "/fahrzeug-material.html",
  "/firma-einstellungen.html",
  "/kunde-anlegen.html",
  "/kunde-detail.html",
  "/kunden.html",
  "/material-bestellen.html",
  "/mitarbeiter-dashboard.html",
  "/mitarbeiter.html",
  "/offene-leistungen.html",
  "/papierkorb.html",
  "/planung.html",
  "/profil.html",
  "/projekt-anlegen.html",
  "/projekt-detail.html",
  "/stunden-nachweis.html",
  "/system-rolle.html",
  "/wecker-einstellungen.html",
  "/zeiten.html"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match("/offline.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      return cached || fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
