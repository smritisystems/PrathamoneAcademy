/**
 * @file        PWAInstall.test.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.test
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-04
 * @updated     2026-11-06
 *
 * @description Unit and UI component tests for Progressive Web App installation portal, hooks, and platform guides.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { detectPlatform, checkIsStandalone } from '../hooks/usePWA';
import InstallApp from '../pages/InstallApp';

describe('PWA Platform Detection & Installation Specifications', () => {
  const originalUserAgent = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it('detects iOS platforms accurately from userAgent', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      configurable: true,
    });
    expect(detectPlatform()).toBe('ios');
  });

  it('detects Android platforms accurately from userAgent', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      configurable: true,
    });
    expect(detectPlatform()).toBe('android');
  });

  it('detects Microsoft Edge browser accurately from userAgent', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      configurable: true,
    });
    expect(detectPlatform()).toBe('edge');
  });

  it('detects Google Chrome browser accurately from userAgent', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      configurable: true,
    });
    expect(detectPlatform()).toBe('chrome');
  });

  it('detects standalone display-mode correctly', () => {
    // When display-mode does not match
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    expect(checkIsStandalone()).toBe(true);
  });
});

describe('InstallApp Page Interface Specifications', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('renders hero title, PWA badge, and descriptive summary', () => {
    render(
      <BrowserRouter>
        <InstallApp />
      </BrowserRouter>
    );

    expect(screen.getByText('PrathamOne EduOS')).toBeDefined();
    expect(screen.getByText('Progressive Web App')).toBeDefined();
    expect(
      screen.getByText(/Official Desktop & Mobile App for Prashant Academy/i)
    ).toBeDefined();
  });

  it('renders the 4 core PWA benefit cards', () => {
    render(
      <BrowserRouter>
        <InstallApp />
      </BrowserRouter>
    );

    expect(screen.getByText('Lightning Fast Launch')).toBeDefined();
    expect(screen.getByText('Distraction-Free Window')).toBeDefined();
    expect(screen.getByText('Offline Resilience')).toBeDefined();
    expect(screen.getByText('Zero App Store Clutter')).toBeDefined();
  });

  it('renders platform-specific installation guide tabs and switches between them', async () => {
    render(
      <BrowserRouter>
        <InstallApp />
      </BrowserRouter>
    );

    // Initial Chrome tab instructions
    expect(screen.getByText(/Installing via Google Chrome/i)).toBeDefined();

    // Click Edge tab
    const edgeBtn = screen.getByRole('button', { name: /Edge/i });
    fireEvent.click(edgeBtn);
    expect(screen.getByText(/Installing via Microsoft Edge/i)).toBeDefined();

    // Click iOS tab
    const iosBtn = screen.getByRole('button', { name: /iOS/i });
    fireEvent.click(iosBtn);
    expect(screen.getByText(/Installing on iPhone & iPad/i)).toBeDefined();
    expect(screen.getByText(/Tap the Share Button/i)).toBeDefined();

    // Click Android tab
    const androidBtn = screen.getByRole('button', { name: /Android/i });
    fireEvent.click(androidBtn);
    expect(screen.getByText(/Installing on Android/i)).toBeDefined();
  });

  it('displays the security disclaimer stating API endpoints and credentials are never cached', () => {
    render(
      <BrowserRouter>
        <InstallApp />
      </BrowserRouter>
    );

    expect(screen.getByText(/Security & Data Architecture Note/i)).toBeDefined();
    expect(
      screen.getByText(/user authentication tokens, student fee ledgers, and transactional endpoints/i)
    ).toBeDefined();
  });
});
