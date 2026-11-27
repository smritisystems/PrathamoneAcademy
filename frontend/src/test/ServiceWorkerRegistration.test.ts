/**
 * @file        ServiceWorkerRegistration.test.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.test
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-28
 * @updated     2026-11-28
 *
 * @description Regression tests verifying desktop loopback Service Worker bypass/unregistration and safe sw.js navigation fallback.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { isLocalDesktopHost, registerServiceWorker } from '../registerServiceWorker';

describe('Desktop Loopback Service Worker Governance (Option A)', () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it('identifies desktop loopback and .local hostnames cleanly', () => {
    expect(isLocalDesktopHost('localhost')).toBe(true);
    expect(isLocalDesktopHost('127.0.0.1')).toBe(true);
    expect(isLocalDesktopHost('::1')).toBe(true);
    expect(isLocalDesktopHost('prathamone.local')).toBe(true);
    expect(isLocalDesktopHost('portal.prathamone.com')).toBe(false);
  });

  it('unregisters existing service workers and clears caches on localhost without registering sw.js', async () => {
    const unregisterMock = vi.fn().mockResolvedValue(true);
    const getRegistrationsMock = vi.fn().mockResolvedValue([{ unregister: unregisterMock }]);
    const registerMock = vi.fn().mockResolvedValue({});
    const deleteCacheMock = vi.fn().mockResolvedValue(true);

    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, hostname: 'localhost' },
      configurable: true,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { getRegistrations: getRegistrationsMock, register: registerMock },
      configurable: true,
    });
    Object.defineProperty(window, 'caches', {
      value: {
        keys: vi.fn().mockResolvedValue(['static-prathamone-cache-v1.3.2', 'other-cache']),
        delete: deleteCacheMock,
      },
      configurable: true,
    });

    registerServiceWorker();
    window.dispatchEvent(new Event('load'));
    await new Promise((r) => setTimeout(r, 20));

    expect(registerMock).not.toHaveBeenCalled();
    expect(unregisterMock).toHaveBeenCalled();
    expect(deleteCacheMock).toHaveBeenCalledWith('static-prathamone-cache-v1.3.2');
    expect(deleteCacheMock).not.toHaveBeenCalledWith('other-cache');
  });

  it('registers /sw.js normally on non-local hosted domains', async () => {
    const registerMock = vi.fn().mockResolvedValue({});
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, hostname: 'portal.prathamone.com' },
      configurable: true,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: registerMock, getRegistrations: vi.fn().mockResolvedValue([]) },
      configurable: true,
    });

    registerServiceWorker();
    window.dispatchEvent(new Event('load'));
    await new Promise((r) => setTimeout(r, 10));

    expect(registerMock).toHaveBeenCalledWith('/sw.js');
  });

  it('ensures public/sw.js avoids stale index.html fallback and includes .ico in static assets', () => {
    const swText = fs.readFileSync(path.resolve(process.cwd(), 'public/sw.js'), 'utf8');
    expect(swText).toContain("prathamone-cache-v1.3.3");
    expect(swText).not.toContain("caches.match('/index.html')");
    expect(swText).toContain("caches.match('/offline.html')");
    expect(swText).toContain("url.pathname.endsWith('.ico')");
  });
});
