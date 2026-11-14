/**
 * @file        sw.js
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pwa
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.3.0
 * @created     2026-11-04
 * @updated     2026-11-14
 *
 * @description Production service worker with strategic caching, network-only API security, robust offline fallback, and guaranteed Response resolution.
 */

const CACHE_VERSION = 'prathamone-cache-v1.3.2';
const STATIC_CACHE_NAME = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `dynamic-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/manifest.webmanifest',
  '/artwork/14112026/batch_g1-4_1080.svg',
  '/artwork/14112026/batch_g1-4_1080.png',
  '/artwork/14112026/batch_rect1-1-8-6_10802.svg',
  '/artwork/14112026/batch_rect1-1-8-6_10802.png'
];

// Install: precache app shell & immediate activation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[PWA Service Worker] Precache warning (assets may be built later):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up outdated cache buckets and take immediate client control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
            console.log('[PWA Service Worker] Purging stale cache bucket:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch routing strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. CRITICAL SECURITY: Never cache API, auth, or transactional requests
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    request.method !== 'GET'
  ) {
    // Network-only with clean offline response
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            error: 'NetworkOffline',
            detail: 'You are currently working offline. Financial transactions and live API requests require an active connection.'
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // 2. Navigation requests (HTML pages): Network-first with cached index.html or offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const shellResponse = await caches.match('/index.html');
          if (shellResponse) return shellResponse;
          const offlineResponse = await caches.match('/offline.html');
          if (offlineResponse) return offlineResponse;

          // Ultimate guaranteed HTML fallback
          try {
            const networkIndex = await fetch('/index.html');
            if (networkIndex && networkIndex.status === 200) return networkIndex;
          } catch (e) {
            // Network completely down
          }

          return new Response(
            '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PrathamOne EduOS Offline</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:1rem;box-sizing:border-box;text-align:center}.card{background:#1e293b;border:1px solid #334155;border-radius:1rem;padding:2rem;max-width:400px;width:100%;box-shadow:0 10px 25px rgba(0,0,0,0.5)}h1{font-size:1.25rem;margin:0 0 0.5rem;color:#f97316}p{font-size:0.875rem;color:#94a3b8;margin:0 0 1.5rem}button{background:#ea580c;color:white;border:none;padding:0.75rem 1.5rem;font-weight:600;font-size:0.875rem;border-radius:0.5rem;cursor:pointer;transition:background 0.2s}button:hover{background:#c2410c}</style></head><body><div class="card"><h1>PrathamOne EduOS</h1><p>You appear to be offline or the connection was interrupted. Please check your network and reload.</p><button onclick="window.location.reload()">Reload Application</button></div></body></html>',
            {
              status: 200,
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            }
          );
        })
    );
    return;
  }

  // 3. Static assets (JS, CSS, images, fonts): Cache-first with background network revalidation
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            return new Response(null, { status: 404, statusText: 'Asset Unavailable' });
          });
      })
    );
    return;
  }

  // Default: Network with cache fallback and guaranteed Response object
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response(null, { status: 504, statusText: 'Gateway Timeout' });
      })
  );
});
