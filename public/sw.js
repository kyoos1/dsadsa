// public/sw.js - Development-friendly service worker
const CACHE_NAME = 'campus-navi-dev-v1';
const STATIC_CACHE = 'static-dev-v1';

// Development: Only cache essential assets
const staticAssets = [
  '/',
  '/index.html',
  '/manifest.json',
  '/Logo.svg',
  '/offline.html'
];

// Install - only in production
self.addEventListener('install', async (event) => {
  // Skip waiting in development
  self.skipWaiting();
  
  // Only cache if not on localhost
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    console.log('Service Worker: Skipping cache in development');
    return;
  }
  
  console.log('Service Worker: Installing in production...');
  const cache = await caches.open(STATIC_CACHE);
  await cache.addAll(staticAssets);
});

// Activate
self.addEventListener('activate', async (event) => {
  console.log('Service Worker: Activated');
  
  // Clean up old caches
  const cacheKeys = await caches.keys();
  await Promise.all(
    cacheKeys.map(key => {
      if (key !== STATIC_CACHE) {
        console.log('Service Worker: Removing old cache', key);
        return caches.delete(key);
      }
    })
  );
  self.clients.claim();
});

// Fetch - development-friendly
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip service worker for Vite dev server and localhost
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return; // Let browser handle the request normally
  }
  
  // Only handle same-origin requests in production
  if (url.origin !== location.origin) {
    return;
  }
  
  // API requests - network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
  } 
  // Static assets - cache first
  else {
    event.respondWith(cacheFirst(request));
  }
});

async function cacheFirst(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return await fetch(request);
  } catch (error) {
    console.log('Cache first failed:', error);
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    throw error;
  }
}

async function networkFirst(request) {
  const cache = await caches.open('dynamic-v1');
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    throw error;
  }
}