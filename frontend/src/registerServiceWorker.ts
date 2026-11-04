/**
 * @file        registerServiceWorker.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pwa
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-04
 * @updated     2026-11-04
 *
 * @description Client-side service worker registration, lifecycle monitoring, and update dispatcher.
 */

export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Allow service worker in production, preview, or localhost
      const isLocalhost = Boolean(
        window.location.hostname === 'localhost' ||
        window.location.hostname === '[::1]' ||
        window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
      );

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
          if (isLocalhost) {
            console.debug('[PWA] Service worker registration note:', error);
          } else {
            console.warn('[PWA] Service worker registration failed:', error);
          }
        });
    });
  }
}

