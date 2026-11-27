/**
 * @file        registerServiceWorker.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pwa
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-04
 * @updated     2026-11-28
 *
 * @description Client-side service worker registration, lifecycle monitoring, and update dispatcher.
 */

export function isLocalDesktopHost(hostname: string): boolean {
  const host = (hostname || '').trim().toLowerCase();
  if (!host) return false;
  return (
    host === 'localhost' ||
    host === '[::1]' ||
    host === '::1' ||
    host.endsWith('.local') ||
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/.test(host)
  );
}

async function clearLocalServiceWorkers(): Promise<void> {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
  } catch {
    // Ignore environments without SW registration access
  }
  try {
    if (typeof caches !== 'undefined' && typeof caches.keys === 'function') {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.includes('prathamone'))
          .map((k) => caches.delete(k).catch(() => false)),
      );
    }
  } catch {
    // Ignore restricted CacheStorage contexts
  }
}

export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Desktop / loopback builds always load fresh local assets from the local backend;
      // registering a caching SW on localhost risks serving stale index.html across upgrades.
      if (isLocalDesktopHost(window.location.hostname)) {
        void clearLocalServiceWorkers();
        return;
      }

      const swUrl = '/sw.js';

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) return;

            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.info('[PWA] New content is available; please refresh to update.');
                  window.dispatchEvent(new CustomEvent('pwa-update-available'));
                } else {
                  console.info('[PWA] Content is cached for offline use.');
                }
              }
            };
          };
        })
        .catch((error) => {
          console.warn('[PWA] Service worker registration failed:', error);
        });
    });
  }
}

