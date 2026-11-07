/**
 * @file        TrainingModeBanner.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.common
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-07
 * @updated     2026-11-07
 *
 * @description Persistent global header banner displayed when Training Mode is active across the software platform.
 */

import React, { useState } from 'react'
import { AlertTriangle, LogOut, Sparkles } from 'lucide-react'
import { useEnvironmentStore } from '../../store/environmentStore'
import EnvironmentSwitchModal from './EnvironmentSwitchModal'

export interface TrainingModeBannerProps {
  onManageClick?: () => void
}

export function TrainingModeBanner({ onManageClick }: TrainingModeBannerProps = {}) {
  const { isTrainingMode, activeDatasetVersion } = useEnvironmentStore()
  const [showExitModal, setShowExitModal] = useState(false)

  if (!isTrainingMode) return null

  return (
    <>
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white px-4 py-2 text-xs font-medium shadow-sm flex flex-wrap items-center justify-between gap-2 shrink-0 z-40 border-b border-amber-400/40 print:hidden animate-in slide-in-from-top-1 duration-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white font-black tracking-wider text-[10px] uppercase border border-white/30 shrink-0">
            <AlertTriangle className="w-3 h-3 text-amber-200 animate-pulse" />
            TRAINING MODE
          </span>
          <span className="font-bold tracking-wide uppercase text-amber-100 hidden sm:inline">
            DEMO DATA — NOT LIVE
          </span>
          <span className="text-white/90 truncate">
            You are working with isolated sample data ({activeDatasetVersion}). Changes will not affect actual customer records.
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onManageClick && (
            <button
              type="button"
              onClick={onManageClick}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-700/60 hover:bg-amber-700 text-white font-bold text-xs border border-white/20 shadow-xs transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              <span>Manage Dataset</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowExitModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white text-amber-900 hover:bg-amber-50 font-bold text-xs shadow-xs transition-colors"
          >
            <LogOut className="w-3 h-3 text-amber-700" />
            <span>Switch to Live</span>
          </button>
        </div>
      </div>

      <EnvironmentSwitchModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        targetEnvironment="PRODUCTION"
      />
    </>
  )
}

export default TrainingModeBanner
