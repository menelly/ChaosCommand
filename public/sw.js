/*
 * Chaos Command service worker — offline shell for the web/PWA build.
 *
 * DELIBERATELY CONSERVATIVE. This app's real data lives in encrypted IndexedDB,
 * which the SW never touches — so nothing here caches or exposes medical data.
 * All this does is let the app *open* offline and serve immutable static assets
 * fast.
 *
 * Strategy:
 *   - Precache a tiny shell (start URL + offline fallback + manifest/icons).
 *   - `_next/static/` is content-hashed and immutable → cache-first, safe forever.
 *   - Navigations → network-first, fall back to the cached shell when offline.
 *   - Everything else (RSC, APIs, cross-origin, non-GET) → straight to network,
 *     never cached, so we can never serve a stale/broken chunk.
 *
 * Built by Ace, 2026-07-23. Bump CACHE_VERSION to invalidate on deploy.
 */

const CACHE_VERSION = 'chaos-v1'
const SHELL_CACHE = `${CACHE_VERSION}-shell`
const ASSET_CACHE = `${CACHE_VERSION}-assets`

// Minimal shell — enough to boot offline. Kept small on purpose.
const SHELL_URLS = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // addAll is atomic; ignore individual 404s so a missing icon can't wedge install.
      Promise.allSettled(SHELL_URLS.map((u) => cache.add(u)))
    ).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only ever handle same-origin GET. Everything else goes straight to network,
  // untouched — POSTs, cross-origin, RSC data requests, etc.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // Immutable hashed assets: cache-first, they never change under a given URL.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const hit = await cache.match(request)
        if (hit) return hit
        const res = await fetch(request)
        if (res.ok) cache.put(request, res.clone())
        return res
      })
    )
    return
  }

  // Page navigations: network-first, fall back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/', { ignoreSearch: true }))
    )
    return
  }

  // Static images/fonts/icons: stale-while-revalidate for snappy offline loads.
  if (/\.(png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf|otf)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const hit = await cache.match(request)
        const network = fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone())
          return res
        }).catch(() => hit)
        return hit || network
      })
    )
    return
  }

  // Default: network-only. Never cache app data or dynamic responses.
})

// Let the page tell a waiting SW to activate immediately (used after an update).
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})
