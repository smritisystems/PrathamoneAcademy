/**
 * @file        OfflineBanner.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components
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
 * @description Global sticky connectivity alert banner notifying users of internet status transitions.
 */

import React, { useState } from 'react'
import { WifiOff, Wifi, RefreshCw } from 'lucide-react'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { USER_ERROR_SPECS } from '../utils/errorTaxonomy'

export const OfflineBanner: React.FC = () => {
  const { isOnline, wasOffline, checkConnectivity } = useNetworkStatus()
  const [checking, setChecking] = useState(false)

  const handleRetry = async () => {
    setChecking(true)
    await checkConnectivity()
    setChecking(false)
  }

  if (isOnline && !wasOffline) {
    return null
  }

  // Connection Restored Alert
  if (isOnline && wasOffline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-emerald-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-xs font-semibold shadow-xs z-50 print:hidden transition-all duration-300"
      >
        <Wifi className="w-4 h-4" />
        <span>Internet connection restored. You are back online.</span>
      </div>
    )
  }

  // Offline Warning Alert
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-amber-600 text-white px-4 py-2.5 flex flex-wrap items-center justify-center gap-3 text-xs font-medium shadow-md z-50 print:hidden"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 shrink-0" />
        <span>{USER_ERROR_SPECS.INTERNET_DISCONNECTED.message}</span>
      </div>

      <button
        type="button"
        onClick={handleRetry}
        disabled={checking}
        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
        <span>{checking ? 'Checking...' : 'Check Connection'}</span>
      </button>
    </div>
  )
}

