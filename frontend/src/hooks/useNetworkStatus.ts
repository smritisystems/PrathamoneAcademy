/**
 * @file        useNetworkStatus.ts
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
 * @created     2026-11-05
 * @updated     2026-11-05
 *
 * @description React hook monitoring browser connectivity, offline transitions, and network availability.
 */

import { useState, useEffect, useCallback } from 'react'

export interface NetworkStatus {
  isOnline: boolean
  wasOffline: boolean
  checkConnectivity: () => Promise<boolean>
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  })
  const [wasOffline, setWasOffline] = useState<boolean>(false)

  const handleOnline = useCallback(() => {
    setIsOnline(true)
    setWasOffline(true)
    const timer = setTimeout(() => setWasOffline(false), 4000)
    return () => clearTimeout(timer)
  }, [])

  const handleOffline = useCallback(() => {
    setIsOnline(false)
  }, [])

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false)
      return false
    }

    try {
      // Lightweight heartbeat to check actual connection
      const response = await fetch('/api/v1/health', {
        method: 'HEAD',
        cache: 'no-store',
      })
      const online = response.ok || response.status < 500
      setIsOnline(online)
      return online
    } catch {
      setIsOnline(false)
      return false
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline])

  return { isOnline, wasOffline, checkConnectivity }
}

