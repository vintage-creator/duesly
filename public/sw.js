const CACHE_NAME = "duesly-cache-v1";
const ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/robots.txt",
];

// Install Event
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Caching app shell");
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("Removing old cache", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network First fallback to Cache
self.addEventListener("fetch", (e) => {
  // Only handle GET requests and local requests
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Exclude API and dev hot reloads (Vite stuff)
  if (
    e.request.url.includes("/api/") || 
    e.request.url.includes("@vite") || 
    e.request.url.includes("hot-update") || 
    e.request.url.includes("/_build/")
  ) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache successful requests dynamically
        if (res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, clone);
          });
        }
        return res;
      })
      .catch(() => {
        // Offline - retrieve from cache
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback to root index if not found
          return caches.match("/");
        });
      })
  );
});
