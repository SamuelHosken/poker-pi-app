// Poker Pi — Service Worker minimalista
//
// Estratégia:
//   - HTML/RSC (navegações): network-first (sempre tenta fresh, cache só de fallback offline)
//   - Static assets em /_next/static: cache-first (imutáveis com hash no nome)
//   - Imagens em /icon, /sounds: stale-while-revalidate
//   - APIs/auth/realtime: passa direto (sem cache)
//
// Mantém leve pra não enrolar com SSR/Server Actions. Foco: instalável + sobrevive
// pequena queda de conexão.

const CACHE_VERSION = "v1";
const STATIC_CACHE = `pokerpi-static-${CACHE_VERSION}`;
const PAGES_CACHE = `pokerpi-pages-${CACHE_VERSION}`;

const PRECACHE_URLS = ["/icon-192.png", "/login-bg.mp4"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((c) => c.addAll(PRECACHE_URLS))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Same-origin only — third-party (Supabase, etc) passa direto
  if (url.origin !== self.location.origin) return;

  // Não cachear endpoints de auth/realtime/webhook
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.includes("supabase")
  ) {
    return;
  }

  // Static assets do Next: cache-first (têm hash, são imutáveis)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, clone));
          }
          return res;
        });
      }),
    );
    return;
  }

  // Imagens e mídia: stale-while-revalidate
  if (
    url.pathname.startsWith("/sounds/") ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|mp4)$/i)
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetched = fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, clone));
          }
          return res;
        });
        return cached ?? fetched;
      }),
    );
    return;
  }

  // HTML/RSC: network-first com fallback pro cache
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(PAGES_CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req).then((c) => c ?? new Response("Offline", { status: 503 }))),
    );
    return;
  }
});
