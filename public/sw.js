/* Service worker BRYAN MULTISERVICES (docs/03 §5).
 * - Pages publiques : network-first (3 s) → cache → /hors-ligne
 * - Assets Next (_next/static) & icônes : cache-first
 * - Images : cache-first (200 entrées max)
 * - API / Supabase : réseau uniquement (le cache métier est dans IndexedDB)
 */
const VERSION = "bm-v1";
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;
const IMAGES = `${VERSION}-images`;
const PRECACHE = ["/", "/hors-ligne", "/vehicules", "/location", "/evenementiel", "/admin", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    // En cas de délai dépassé sans cache, on laisse une chance au réseau
    try {
      return await fetch(request);
    } catch {
      return (await cache.match("/hors-ligne")) || Response.error();
    }
  }
}

async function cacheFirst(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && (response.ok || response.type === "opaque")) {
    cache.put(request, response.clone());
    if (max) trim(cacheName, max);
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    if (request.destination === "image") event.respondWith(cacheFirst(request, IMAGES, 200));
    return;
  }
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request, ASSETS));
    return;
  }
  if (request.destination === "image" || url.pathname.startsWith("/_next/image")) {
    event.respondWith(cacheFirst(request, IMAGES, 200));
    return;
  }
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirst(request));
  }
});

// Notifications push (admin) — le payload est envoyé par l'Edge Function `notify`.
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "BRYAN MULTISERVICES", body: "Nouvelle notification" };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/admin-192.png",
      badge: "/icons/admin-192.png",
      data: { url: data.link || "/admin" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || "/admin"));
});
