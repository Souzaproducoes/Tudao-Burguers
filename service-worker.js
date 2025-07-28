const CACHE_NAME = "tudao-burguers-v8"
const STATIC_CACHE = "tudao-static-v8"
const DYNAMIC_CACHE = "tudao-dynamic-v8"

// Assets to cache immediately
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/politica-de-privacidade.html",
  "/estilo.css",
  "/script.js",
  "/manifest.json",
  "/imagens/logo.png",
  "/imagens/banner-principal.webp",
  "/imagens/about-us.webp",
  "/imagens/combo.webp",
  "/imagens/tudao-especial.webp",
  "/imagens/batata.webp",
  "/imagens/favicon-32x32.png",
  "/imagens/favicon-16x16.png",
  "/imagens/apple-touch-icon.png",
  "/imagens/icon-quality.svg",
  "/imagens/icon-eco.svg",
  "/imagens/icon-service.svg",
  "/imagens/instagram.svg",
  "/imagens/facebook.svg",
  "/imagens/avatar-1.webp",
  "/imagens/avatar-2.webp",
  "/imagens/avatar-3.webp",
  "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap",
]

// Network-first resources
const NETWORK_FIRST = ["/api/", "https://wa.me/", "https://www.google.com/maps"]

// Cache-first resources
const CACHE_FIRST = ["/imagens/", "https://fonts.gstatic.com/", "https://fonts.googleapis.com/"]

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...")

  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log("Service Worker: Caching static assets")
        return cache.addAll(STATIC_ASSETS)
      }),
      self.skipWaiting(),
    ]),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating...")

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== CACHE_NAME) {
                console.log("Service Worker: Deleting old cache:", cacheName)
                return caches.delete(cacheName)
              }
            }),
          )
        }),
      // Take control of all pages
      self.clients.claim(),
    ]),
  )
})

// Fetch event - implement caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== "GET") {
    return
  }

  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith("http")) {
    return
  }

  event.respondWith(handleRequest(request))
})

async function handleRequest(request) {
  const url = new URL(request.url)

  try {
    // Network-first strategy for API calls and external services
    if (NETWORK_FIRST.some((pattern) => request.url.includes(pattern))) {
      return await networkFirst(request)
    }

    // Cache-first strategy for static assets
    if (CACHE_FIRST.some((pattern) => request.url.includes(pattern))) {
      return await cacheFirst(request)
    }

    // Stale-while-revalidate for HTML pages
    if (request.headers.get("accept")?.includes("text/html")) {
      return await staleWhileRevalidate(request)
    }

    // Default to cache-first for everything else
    return await cacheFirst(request)
  } catch (error) {
    console.error("Service Worker: Fetch error:", error)

    // Return offline fallback for HTML requests
    if (request.headers.get("accept")?.includes("text/html")) {
      return await caches.match("/index.html")
    }

    // Return a basic offline response for other requests
    return new Response("Offline", {
      status: 503,
      statusText: "Service Unavailable",
    })
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

// Cache-first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request)

  if (cachedResponse) {
    // Update cache in background
    updateCache(request)
    return cachedResponse
  }

  const networkResponse = await fetch(request)

  if (networkResponse.ok) {
    const cache = await caches.open(DYNAMIC_CACHE)
    cache.put(request, networkResponse.clone())
  }

  return networkResponse
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request)

  const networkResponsePromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        const cache = caches.open(DYNAMIC_CACHE)
        cache.then((c) => c.put(request, response.clone()))
      }
      return response
    })
    .catch(() => null)

  return cachedResponse || (await networkResponsePromise)
}

// Update cache in background
async function updateCache(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      await cache.put(request, response)
    }
  } catch (error) {
    // Silently fail background updates
    console.log("Background cache update failed:", error)
  }
}

// Background sync for offline orders
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync-orders") {
    event.waitUntil(syncOfflineOrders())
  }
})

async function syncOfflineOrders() {
  try {
    // Get offline orders from IndexedDB or localStorage
    const offlineOrders = await getOfflineOrders()

    for (const order of offlineOrders) {
      try {
        // Attempt to send order
        await sendOrder(order)
        // Remove from offline storage on success
        await removeOfflineOrder(order.id)
      } catch (error) {
        console.error("Failed to sync order:", error)
      }
    }
  } catch (error) {
    console.error("Background sync failed:", error)
  }
}

// Push notifications
self.addEventListener('push', event => {
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body || 'Nova notificação do Tudão Burguer\'s!',
        icon: '/imagens/android-chrome-192x192.png',
        badge: '/imagens/favicon-32x32.png',
        image: data.image,
        data: data.url,
        actions: [
            {
                action: 'open',
                title: 'Abrir',
                icon: '/imagens/favicon-16x16.png'
            },
            {
                action: 'close',
                title: 'Fechar'
            }
        ],
        requireInteraction: true,
        tag: \'tudao
