/**
 * @file        usePWA.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.hooks
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
 * @description Custom hook for Progressive Web App installation prompt management, standalone detection, and network status.
 */

import { useState, useEffect, useCallback } from 'react';

export type PlatformType = 'ios' | 'android' | 'chrome' | 'edge' | 'other';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function detectPlatform(): PlatformType {
  if (typeof window === 'undefined' || !window.navigator) return 'other';
  const ua = window.navigator.userAgent.toLowerCase();

  // iOS detection (iPhone, iPad, iPod)
  if (/iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }

  // Android detection
  if (/android/.test(ua)) {
    return 'android';
  }

  // Edge detection (Edg or Edge)
  if (/edg\//.test(ua)) {
    return 'edge';
  }

  // Chrome detection
  if (/chrome|crios/.test(ua)) {
    return 'chrome';
  }

  return 'other';
}

export function checkIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  const isStandaloneMedia =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(display-mode: standalone)').matches
      : false;
  const isIOSStandalone = Boolean((window.navigator as unknown as { standalone?: boolean })?.standalone);
  const isAndroidTwa = typeof document !== 'undefined' && document.referrer.includes('android-app://');

  return isStandaloneMedia || isIOSStandalone || isAndroidTwa;
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [platform, setPlatform] = useState<PlatformType>('other');

  useEffect(() => {
    setPlatform(detectPlatform());
    setIsInstalled(checkIsStandalone());

    // Listen for standalone display-mode changes if matchMedia supported
    let mediaQuery: MediaQueryList | null = null;
    let handleDisplayModeChange: ((e: MediaQueryListEvent) => void) | null = null;

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      mediaQuery = window.matchMedia('(display-mode: standalone)');
      handleDisplayModeChange = (e: MediaQueryListEvent) => {
        setIsInstalled(e.matches);
      };
      try {
        mediaQuery.addEventListener('change', handleDisplayModeChange);
      } catch {
        mediaQuery.addListener?.(handleDisplayModeChange);
      }
    }

    // Capture beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
    };

    // App installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    // Online / Offline listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    // Update listener
    const handleUpdate = () => setHasUpdate(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pwa-update-available', handleUpdate);

    return () => {
      if (mediaQuery && handleDisplayModeChange) {
        try {
          mediaQuery.removeEventListener('change', handleDisplayModeChange);
        } catch {
          mediaQuery.removeListener?.(handleDisplayModeChange);
        }
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pwa-update-available', handleUpdate);
    };
  }, []);

  const installApp = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[PWA] Error during installation prompt:', err);
      return false;
    }
  }, [deferredPrompt]);

  const reloadApp = useCallback(() => {
    window.location.reload();
  }, []);

  return {
    isInstallable,
    isInstalled,
    isOffline,
    hasUpdate,
    platform,
    installApp,
    reloadApp,
    canPrompt: Boolean(deferredPrompt),
  };
}
