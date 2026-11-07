/**
 * @file        EnvironmentSwitchModal.tsx
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
 * @updated     2026-11-08
 *
 * @description Confirmation modal for switching between Live Production and Isolated Training & Demo environments.
 */

import React from 'react'
import { AlertTriangle, ShieldCheck, ArrowRight, X } from 'lucide-react'
import { useEnvironmentStore, DataEnvironment } from '../../store/environmentStore'
import { trainingApi } from '../../api/endpoints'

export interface EnvironmentSwitchModalProps {
  isOpen: boolean
  onClose: () => void
  targetEnvironment: DataEnvironment
  onConfirm?: () => void
}

export function EnvironmentSwitchModal({
  isOpen,
  onClose,
  targetEnvironment,
  onConfirm,
}: EnvironmentSwitchModalProps) {
  const { setEnvironment } = useEnvironmentStore()

  if (!isOpen) return null

  const isEnteringTraining = targetEnvironment === 'TRAINING'

  const handleConfirm = async () => {
    try {
      if (isEnteringTraining) {
        await trainingApi.pingSession().catch(() => {})
      } else {
        await trainingApi.exitSession().catch(() => {})
      }
    } catch {
      // Non-blocking telemetry
    }
    setEnvironment(targetEnvironment)
    if (onConfirm) {
      onConfirm()
    }
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${
              isEnteringTraining
                ? 'bg-amber-100 text-amber-700 shadow-amber-100'
                : 'bg-emerald-100 text-emerald-700 shadow-emerald-100'
            }`}
          >
            {isEnteringTraining ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">
            {isEnteringTraining
              ? 'Switch to Training & Demo Mode?'
              : 'Switch to Live Production Mode?'}
          </h3>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            {isEnteringTraining ? (
              <>
                You are entering an <strong className="text-amber-800">isolated training database</strong> with sample enquiries, leads, and students. Any actions performed here will <span className="font-semibold text-slate-800">never alter</span> live customer data.
              </>
            ) : (
              <>
                You are returning to <strong className="text-emerald-800">Live Production Mode</strong>. You will be interacting with <span className="font-semibold text-slate-800">real institution records</span>, payments, and financial ledgers.
              </>
            )}
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-600" />
            Environment Governance
          </div>
          <p>
            {isEnteringTraining
              ? 'All subsequent API requests will carry X-Data-Environment: TRAINING and route to PA001-DEMO.'
              : 'All subsequent API requests will route to live tenant PA001.'}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
              isEnteringTraining
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
            }`}
          >
            <span>
              {isEnteringTraining ? 'Switch to Training Mode' : 'Return to Live Mode'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default EnvironmentSwitchModal
