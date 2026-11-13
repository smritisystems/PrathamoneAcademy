/**
 * @file        deviceCapabilities.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.utils
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-13
 * @updated     2026-11-13
 *
 * @description Hardware-independent device capability detection layer for EduBoard. Inspects browser APIs, screen geometry, pointer characteristics, and synchronization states without proprietary hardware SDKs.
 */

import { useState, useEffect, useCallback } from 'react'

export type DisplayClassification =
  | 'Standard Monitor (<= 1080p)'
  | '1080p Full HD Smart Board'
  | '2K QHD Interactive Display'
  | '4K UHD Interactive Flat Panel'
  | 'Tablet / Small Touchscreen'
  | 'Projector Display'
  | 'Unknown Display Target'

export interface DeviceCapabilityProfile {
  // Environment & Engine
  userAgent: string
  osFamily: 'Android' | 'Windows' | 'macOS' | 'Linux' | 'iOS' | 'Unknown'
  browserFamily: 'Chrome' | 'Edge' | 'Firefox' | 'Safari' | 'Opera' | 'Unknown'
  isStandalonePWA: boolean

  // Display & Geometry
  screenWidth: number
  screenHeight: number
  viewportWidth: number
  viewportHeight: number
  devicePixelRatio: number
  colorDepth: number
  displayClassification: DisplayClassification
  orientation: 'landscape' | 'portrait'

  // Input & Pointer
  hasPointerEvents: boolean
  hasTouchEvents: boolean
  maxTouchPoints: number
  primaryPointer: 'coarse' | 'fine' | 'none'
  hasFinePointer: boolean
  hasCoarsePointer: boolean
  lastObservedPointerType: 'mouse' | 'touch' | 'pen' | 'unknown'
  hasObservedPressure: boolean
  hasObservedTilt: boolean

  // Browser APIs
  supportsFullscreen: boolean
  supportsFileUpload: boolean
  supportsIndexedDB: boolean
  supportsLocalStorage: boolean
  supportsWebSockets: boolean

  // Network & State
  isOnline: boolean
  connectionType?: string
}

function detectOS(ua: string): DeviceCapabilityProfile['osFamily'] {
  if (/Android/i.test(ua)) return 'Android'
  if (/Windows NT/i.test(ua)) return 'Windows'
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macOS'
  if (/Linux/i.test(ua)) return 'Linux'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS'
  return 'Unknown'
}

function detectBrowser(ua: string): DeviceCapabilityProfile['browserFamily'] {
  if (/Edg\//i.test(ua)) return 'Edge'
  if (/OPR\//i.test(ua)) return 'Opera'
  if (/Chrome\//i.test(ua)) return 'Chrome'
  if (/Firefox\//i.test(ua)) return 'Firefox'
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari'
  return 'Unknown'
}

function classifyDisplay(
  width: number,
  height: number,
  dpr: number,
  isTouch: boolean
): DisplayClassification {
  const maxDim = Math.max(width, height) * (dpr >= 1.5 ? 1 : 1)
  const physicalW = Math.max(width, height) * (dpr > 1 ? dpr : 1)

  if (width < 1024 && isTouch) {
    return 'Tablet / Small Touchscreen'
  }
  if (physicalW >= 3500) {
    return '4K UHD Interactive Flat Panel'
  }
  if (physicalW >= 2400) {
    return '2K QHD Interactive Display'
  }
  if (physicalW >= 1800 && isTouch) {
    return '1080p Full HD Smart Board'
  }
  if (physicalW >= 1800) {
    return 'Standard Monitor (<= 1080p)'
  }
  if (physicalW < 1800 && !isTouch) {
    return 'Projector Display'
  }
  return 'Standard Monitor (<= 1080p)'
}

export function detectDeviceCapabilities(): DeviceCapabilityProfile {
  if (typeof window === 'undefined') {
    return {
      userAgent: 'SSR',
      osFamily: 'Unknown',
      browserFamily: 'Unknown',
      isStandalonePWA: false,
      screenWidth: 1920,
      screenHeight: 1080,
      viewportWidth: 1920,
      viewportHeight: 1080,
      devicePixelRatio: 1,
      colorDepth: 24,
      displayClassification: 'Standard Monitor (<= 1080p)',
      orientation: 'landscape',
      hasPointerEvents: true,
      hasTouchEvents: false,
      maxTouchPoints: 0,
      primaryPointer: 'fine',
      hasFinePointer: true,
      hasCoarsePointer: false,
      lastObservedPointerType: 'mouse',
      hasObservedPressure: false,
      hasObservedTilt: false,
      supportsFullscreen: true,
      supportsFileUpload: true,
      supportsIndexedDB: true,
      supportsLocalStorage: true,
      supportsWebSockets: true,
      isOnline: true,
    }
  }

  const ua = navigator.userAgent || ''
  const os = detectOS(ua)
  const browser = detectBrowser(ua)

  const sw = window.screen?.width || window.innerWidth
  const sh = window.screen?.height || window.innerHeight
  const vw = window.innerWidth
  const vh = window.innerHeight
  const dpr = window.devicePixelRatio || 1
  const colorDepth = window.screen?.colorDepth || 24

  const maxTouchPoints = navigator.maxTouchPoints || 0
  const hasTouch = maxTouchPoints > 0 || 'ontouchstart' in window
  const hasPointer = typeof window.PointerEvent !== 'undefined'

  const hasFinePointer = window.matchMedia?.('(any-pointer: fine)').matches ?? true
  const hasCoarsePointer = window.matchMedia?.('(any-pointer: coarse)').matches ?? false
  const primaryCoarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const primaryPointer = primaryCoarse ? 'coarse' : hasFinePointer ? 'fine' : 'none'

  const supportsFullscreen =
    typeof document !== 'undefined' &&
    (Boolean(document.fullscreenEnabled) ||
      Boolean((document as unknown as { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled))

  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    Boolean((navigator as unknown as { standalone?: boolean }).standalone)

  const conn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection

  return {
    userAgent: ua,
    osFamily: os,
    browserFamily: browser,
    isStandalonePWA: Boolean(isStandalone),
    screenWidth: sw,
    screenHeight: sh,
    viewportWidth: vw,
    viewportHeight: vh,
    devicePixelRatio: Number(dpr.toFixed(2)),
    colorDepth,
    displayClassification: classifyDisplay(sw, sh, dpr, hasTouch),
    orientation: vw >= vh ? 'landscape' : 'portrait',
    hasPointerEvents: hasPointer,
    hasTouchEvents: hasTouch,
    maxTouchPoints,
    primaryPointer,
    hasFinePointer,
    hasCoarsePointer,
    lastObservedPointerType: 'unknown',
    hasObservedPressure: false,
    hasObservedTilt: false,
    supportsFullscreen,
    supportsFileUpload: typeof FileReader !== 'undefined',
    supportsIndexedDB: typeof window.indexedDB !== 'undefined',
    supportsLocalStorage: typeof window.localStorage !== 'undefined',
    supportsWebSockets: typeof window.WebSocket !== 'undefined',
    isOnline: typeof navigator.onLine === 'boolean' ? navigator.onLine : true,
    connectionType: conn?.effectiveType,
  }
}

/**
 * React hook providing live, hardware-independent device capability detection.
 * Observes resize events, online/offline status, and live pointer interactions.
 */
export function useDeviceCapabilities() {
  const [profile, setProfile] = useState<DeviceCapabilityProfile>(() => detectDeviceCapabilities())

  const handlePointerObservation = useCallback((e: PointerEvent) => {
    setProfile((prev) => {
      const pointerType = (e.pointerType as 'mouse' | 'touch' | 'pen') || 'unknown'
      const hasPressure = (e.pressure > 0 && e.pressure < 1) || prev.hasObservedPressure
      const hasTilt = (e.tiltX !== 0 || e.tiltY !== 0) || prev.hasObservedTilt

      if (
        prev.lastObservedPointerType === pointerType &&
        prev.hasObservedPressure === hasPressure &&
        prev.hasObservedTilt === hasTilt
      ) {
        return prev
      }

      return {
        ...prev,
        lastObservedPointerType: pointerType,
        hasObservedPressure: hasPressure,
        hasObservedTilt: hasTilt,
      }
    })
  }, [])

  useEffect(() => {
    const handleResize = () => {
      setProfile((prev) => ({
        ...prev,
        ...detectDeviceCapabilities(),
        lastObservedPointerType: prev.lastObservedPointerType,
        hasObservedPressure: prev.hasObservedPressure,
        hasObservedTilt: prev.hasObservedTilt,
      }))
    }

    const handleOnline = () => setProfile((p) => ({ ...p, isOnline: true }))
    const handleOffline = () => setProfile((p) => ({ ...p, isOnline: false }))

    window.addEventListener('resize', handleResize)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('pointerdown', handlePointerObservation, { passive: true })

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('pointerdown', handlePointerObservation)
    }
  }, [handlePointerObservation])

  return profile
}
