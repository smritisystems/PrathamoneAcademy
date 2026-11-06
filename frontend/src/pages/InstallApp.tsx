/**
 * @file        InstallApp.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pages
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
 * @description Dedicated Progressive Web App installation portal with platform-specific setup guides and launch actions.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Download,
  CheckCircle2,
  ExternalLink,
  Laptop,
  Smartphone,
  Apple,
  Chrome,
  ShieldCheck,
  Zap,
  WifiOff,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Monitor,
  Share2,
  PlusSquare,
  Globe
} from 'lucide-react';
import { usePWA, PlatformType } from '../hooks/usePWA';
import { useBranding } from '../config/branding';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function InstallApp() {
  const branding = useBranding();
  useDocumentTitle('Install App');
  const { isInstallable, isInstalled, platform, installApp, isOffline } = usePWA();
  const [activeTab, setActiveTab] = useState<PlatformType>(() => {
    if (platform === 'ios') return 'ios';
    if (platform === 'android') return 'android';
    if (platform === 'edge') return 'edge';
    return 'chrome';
  });
  const [installing, setInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const navigate = useNavigate();

  const handleInstallClick = async () => {
    setInstalling(true);
    const success = await installApp();
    setInstalling(false);
    if (success) {
      setInstallSuccess(true);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-2 px-1">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* HERO BANNER SECTION                                                        */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-blue-800/40">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-2.5 shadow-lg shrink-0 flex items-center justify-center border-2 border-blue-400/40">
              <img
                src="/icons/icon-192x192.png"
                alt="PrathamOne EduOS Logo"
                className="w-full h-full object-contain rounded-xl"
                onError={(e) => {
                  // Fallback if image load fails
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="text-blue-900 font-black text-2xl hidden" id="logo-text-fallback">
                PA
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-200 border border-blue-400/30">
                  Progressive Web App
                </span>
                {isInstalled || installSuccess ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Installed & Active
                  </span>
                ) : isInstallable ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" />
                    Ready for 1-Click Install
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-blue-400/20 text-blue-200 border border-blue-400/30">
                    Browser Compatible
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {branding.appName}
              </h1>
              <p className="text-blue-200/90 text-sm max-w-xl">
                Official Desktop & Mobile App for {branding.academyName} {branding.tagline}. Install locally for instant desktop launch, distraction-free windowing, and offline capability.
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="shrink-0 w-full md:w-auto flex flex-col sm:flex-row gap-3">
            {isInstalled || installSuccess ? (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02]"
              >
                <span>Launch Application</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : isInstallable ? (
              <button
                type="button"
                disabled={installing}
                onClick={handleInstallClick}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-900/40 transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{installing ? 'Installing App...' : 'Install App on this Device'}</span>
              </button>
            ) : (
              <a
                href="#installation-guides"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm backdrop-blur border border-white/20 transition-all"
              >
                <span>View Install Guide</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* APP BENEFITS GRID                                                          */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <span>Why Install PrathamOne EduOS as a Dedicated App?</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Lightning Fast Launch</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Launch directly from your Windows taskbar, Mac dock, or mobile home screen with pre-cached assets.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Monitor className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Distraction-Free Window</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Runs in a dedicated application window without browser tabs, search bars, or external extensions.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <WifiOff className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Offline Resilience</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              App shell and static assets remain accessible even when coaching center Wi-Fi drops momentarily.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Zero App Store Clutter</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              No large downloads or app store approval waits. Automatically refreshes to latest release seamlessly.
            </p>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* PLATFORM-SPECIFIC INSTALLATION GUIDES                                      */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div id="installation-guides" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Platform Installation Guides</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select your operating system or browser to view tailored step-by-step installation instructions.
            </p>
          </div>

          {/* Platform Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('chrome')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'chrome'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Chrome className="w-3.5 h-3.5" />
              <span>Chrome</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('edge')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'edge'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Edge</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'android'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'ios'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Apple className="w-3.5 h-3.5" />
              <span>iOS / Safari</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Google Chrome */}
        {activeTab === 'chrome' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Chrome className="w-4 h-4 text-blue-600" />
              <span>Installing via Google Chrome (Windows, macOS, Chromebook)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">1</div>
                <h4 className="font-bold text-slate-900 text-xs">Look at the Address Bar</h4>
                <p className="text-xs text-slate-600">
                  Look to the far right of Chrome's address bar for the <span className="font-semibold text-slate-800">Install icon</span> (monitor with down arrow).
                </p>
              </div>
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">2</div>
                <h4 className="font-bold text-slate-900 text-xs">Click "Install"</h4>
                <p className="text-xs text-slate-600">
                  Click the install icon or click the blue button above. Chrome will display the <span className="font-semibold text-slate-800">Install App</span> prompt.
                </p>
              </div>
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">3</div>
                <h4 className="font-bold text-slate-900 text-xs">Launch Instantly</h4>
                <p className="text-xs text-slate-600">
                  The app will open immediately in its own standalone window and create a shortcut on your Desktop and Start Menu.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Microsoft Edge */}
        {activeTab === 'edge' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Laptop className="w-4 h-4 text-blue-600" />
              <span>Installing via Microsoft Edge (Windows 10 / 11 & macOS)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">1</div>
                <h4 className="font-bold text-slate-900 text-xs">App Available Icon</h4>
                <p className="text-xs text-slate-600">
                  Click the <span className="font-semibold text-slate-800">App available</span> icon (three squares + plus) on the right side of Edge's address bar.
                </p>
              </div>
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">2</div>
                <h4 className="font-bold text-slate-900 text-xs">Confirm Installation</h4>
                <p className="text-xs text-slate-600">
                  Click <span className="font-semibold text-slate-800">Install</span>. Edge will register PrathamOne EduOS as a recognized Windows desktop application.
                </p>
              </div>
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">3</div>
                <h4 className="font-bold text-slate-900 text-xs">Pin to Taskbar</h4>
                <p className="text-xs text-slate-600">
                  Select <span className="font-semibold text-slate-800">Pin to Taskbar</span> and <span className="font-semibold text-slate-800">Pin to Start</span> for one-click access every morning.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Android */}
        {activeTab === 'android' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>Installing on Android (Chrome, Samsung Internet, Edge)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">1</div>
                <h4 className="font-bold text-slate-900 text-xs">Tap Browser Menu</h4>
                <p className="text-xs text-slate-600">
                  Tap the three-dots menu icon <span className="font-mono font-bold">⋮</span> in the top-right corner of your browser.
                </p>
              </div>
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">2</div>
                <h4 className="font-bold text-slate-900 text-xs">Select "Install App"</h4>
                <p className="text-xs text-slate-600">
                  Tap <span className="font-semibold text-slate-800">Install app</span> or <span className="font-semibold text-slate-800">Add to Home screen</span> from the dropdown.
                </p>
              </div>
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">3</div>
                <h4 className="font-bold text-slate-900 text-xs">Use as Mobile App</h4>
                <p className="text-xs text-slate-600">
                  The PrathamOne EduOS icon is placed directly on your home screen and operates as a standalone mobile app.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: iOS Safari */}
        {activeTab === 'ios' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Apple className="w-4 h-4 text-slate-900" />
              <span>Installing on iPhone & iPad (Safari)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">1</div>
                <h4 className="font-bold text-slate-900 text-xs">Tap the Share Button</h4>
                <p className="text-xs text-slate-600">
                  In Safari, tap the <span className="font-semibold text-slate-800">Share icon</span> <Share2 className="w-3.5 h-3.5 inline mx-1 text-blue-600" /> (square with upward arrow) at the bottom toolbar.
                </p>
              </div>
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">2</div>
                <h4 className="font-bold text-slate-900 text-xs">"Add to Home Screen"</h4>
                <p className="text-xs text-slate-600">
                  Scroll down the share sheet and tap <span className="font-semibold text-slate-800">Add to Home Screen</span> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-slate-700" />.
                </p>
              </div>
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">3</div>
                <h4 className="font-bold text-slate-900 text-xs">Tap "Add"</h4>
                <p className="text-xs text-slate-600">
                  Tap <span className="font-semibold text-slate-800">Add</span> in the top-right corner. PrathamOne will appear alongside your iOS apps.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* SYSTEM SPECIFICATIONS & OFFLINE SECURITY                                    */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-xs text-slate-600 space-y-2">
        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Security & Data Architecture Note</span>
        </h3>
        <p>
          PrathamOne EduOS uses an isolated Service Worker for static asset delivery. In strict accordance with institute data privacy standards,
          <span className="font-semibold text-slate-800"> user authentication tokens, student fee ledgers, and transactional endpoints (/api/*) are NEVER cached on disk</span>.
          All sensitive transactions require verified real-time server authorization.
        </p>
      </div>
    </div>
  );
}

