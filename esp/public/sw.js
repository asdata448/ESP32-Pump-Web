// Service Worker for ESP32 Pump Web App
// Provides offline capability and PWA features

const CACHE_NAME = 'esp32-pump-v1'
const urlsToCache = [
  '/',
  '/demo',
  '/manifest.json',
  '/icon.svg',
  '/icon-light-32x32.png',
  '/icon-dark-32x32.png',
  '/apple-icon.png',
]

// ═══════════════════════════════════════════════════════════════════════════
// INSTALL EVENT - Cache resources
// ═══════════════════════════════════════════════════════════════════════════

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell')
      return cache.addAll(urlsToCache)
    })
  )
  self.skipWaiting()
})

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVATE EVENT - Clean up old caches
// ═══════════════════════════════════════════════════════════════════════════

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  return self.clients.claim()
})

// ═══════════════════════════════════════════════════════════════════════════
// FETCH EVENT - Network first, fallback to cache
// ═══════════════════════════════════════════════════════════════════════════

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // For API calls to ESP32, always try network first
  if (url.pathname.startsWith('/api/') || url.hostname.includes('192.168') || url.hostname.includes('esp32')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(request).then((cached) => {
            if (cached) {
              return cached
            }
            // Return a custom offline response for API calls
            return new Response(
              JSON.stringify({ error: 'Offline', cached: false }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 503,
              }
            )
          })
        })
    )
    return
  }

  // For navigation requests, use network first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigations
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(request).then((cached) => {
            if (cached) {
              return cached
            }
            // Return offline page
            return caches.match('/').then((cachedIndex) => cachedIndex || new Response('Offline'))
          })
        })
    )
    return
  }

  // For other requests (static assets), use cache first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Update cache in background
        fetch(request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, response)
            })
          }
        })
        return cached
      }

      return fetch(request).then((response) => {
        // Cache new resources
        if (response.ok) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        return response
      }).catch(() => {
        // Return offline fallback for images
        if (request.destination === 'image') {
          return new Response('', { status: 404 })
        }
        return new Response('Offline', { status: 503 })
      })
    })
  )
})

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE EVENT - Handle messages from clients
// ═══════════════════════════════════════════════════════════════════════════

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName)
      })
    })
  }
})
