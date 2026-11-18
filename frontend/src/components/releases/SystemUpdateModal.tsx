/**
 * @file        SystemUpdateModal.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.src.components.releases
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-18
 * @updated     2026-11-18
 *
 * @description Non-technical 1-click system update modal with live progress bar (0-100%), automated pre-update database snapshot, step-by-step checklist, plain-English logs, and automated zero-data-loss rollback protection.
 */

import React, { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  DownloadCloud,
  FileCheck2,
  Loader2,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  X,
  Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { releasesApi } from '../../api/endpoints'
import type { SystemUpdateCheckResponse, SystemUpdateStatusResponse } from '../../types'

interface SystemUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  updateInfo: SystemUpdateCheckResponse | null
  onUpdateCompleted: () => void
}

const UPDATE_STEPS = [
  { step: 'pre_flight_check', label: 'Pre-flight checks & storage verified', icon: ShieldCheck },
  { step: 'database_snapshot', label: 'Full safe backup of student and fee data created', icon: Database },
  { step: 'package_verification', label: 'Verified package integrity (SHA-256 valid)', icon: FileCheck2 },
  { step: 'schema_migration', label: 'Upgrading database tables safely', icon: Server },
  { step: 'service_reload', label: 'Synchronizing software services', icon: RefreshCw },
  { step: 'healthcheck_smoke_test', label: 'Verifying system health', icon: CheckCircle2 },
]

export default function SystemUpdateModal({
  isOpen,
  onClose,
  updateInfo,
  onUpdateCompleted,
}: SystemUpdateModalProps) {
  const [isApplying, setIsApplying] = useState(false)
  const [statusData, setStatusData] = useState<SystemUpdateStatusResponse | null>(null)
  const [showLogs, setShowLogs] = useState(false)
  const [pollingActive, setPollingActive] = useState(false)

  // Poll update progress status every 800ms while active
  useEffect(() => {
    let interval: any = null
    if (isOpen && (isApplying || pollingActive)) {
      interval = setInterval(async () => {
        try {
          const res = await releasesApi.getUpdateStatus()
          setStatusData(res.data)
          if (res.data.status === 'success' || res.data.status === 'rolled_back' || res.data.status === 'failed') {
            setIsApplying(false)
            setPollingActive(false)
          }
        } catch {
          // Keep silent on momentary polling drops during service reload
        }
      }, 800)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isOpen, isApplying, pollingActive])

  if (!isOpen) return null

  const targetVersion = updateInfo?.latest_version || updateInfo?.next_target_version || '1.134.0'
  const isComplete = statusData?.status === 'success'
  const isRolledBack = statusData?.status === 'rolled_back'
  const isFailed = statusData?.status === 'failed'
  const percent = statusData?.progress_percent || (isApplying ? 5 : 0)

  const handleStartUpdate = async () => {
    try {
      setIsApplying(true)
      setPollingActive(true)
      await releasesApi.applyUpdate({ target_version: targetVersion })
      toast.success('System update initiated safely.')
    } catch (err: any) {
      setIsApplying(false)
      setPollingActive(false)
      toast.error(err.response?.data?.detail || 'Failed to start system update.')
    }
  }

  const handleResetAndClose = async () => {
    try {
      await releasesApi.resetUpdateStatus()
    } catch {
      // Ignore reset error
    }
    onClose()
    if (isComplete) {
      onUpdateCompleted()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <Zap className="w-4 h-4 text-amber-400" />
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                {isComplete
                  ? 'Update Successfully Completed'
                  : isRolledBack
                  ? 'Update Safely Rolled Back'
                  : isApplying
                  ? `Updating PrathamOne EduOS to v${targetVersion}`
                  : `PrathamOne EduOS System Update`}
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Automated zero-data-loss installation with transactional database backup and self-healing rollback.
            </p>
          </div>

          {!isApplying && (
            <button
              type="button"
              onClick={handleResetAndClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Success Banner */}
          {isComplete && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-bold">Update v{targetVersion} Installed Successfully!</div>
                <p className="text-xs text-emerald-700">
                  All database tables, student records, fee ledgers, and academic schedules were verified with 100% data
                  integrity.
                </p>
              </div>
            </div>
          )}

          {/* Rollback Notification Banner */}
          {isRolledBack && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
              <RotateCcw className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-bold">Automatic Rollback Executed Safely</div>
                <p className="text-xs text-amber-800">
                  An issue was detected during the update. The self-healing engine automatically restored your pre-update
                  database snapshot. Zero records were lost.
                </p>
                {statusData?.error && (
                  <p className="text-[11px] font-mono text-amber-700 bg-amber-100/70 p-2 rounded mt-1">
                    Details: {statusData.error}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Failure Banner */}
          {isFailed && !isRolledBack && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-bold">Update Interrupted</div>
                <p className="text-xs text-rose-700">
                  {statusData?.error || 'The update was stopped safely prior to making any permanent modifications.'}
                </p>
              </div>
            </div>
          )}

          {/* Version Comparison Card (Before Starting) */}
          {!isApplying && !isComplete && !isRolledBack && !isFailed && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Current Active Version</div>
                <div className="text-base font-bold text-slate-800 mt-0.5">v{updateInfo?.current_version || '1.133.0'}</div>
                <div className="text-xs text-slate-500 mt-1">Running in production</div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200">
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Available Target Version</div>
                <div className="text-base font-bold text-indigo-900 mt-0.5">v{targetVersion}</div>
                <div className="text-xs text-indigo-700 mt-1 flex items-center gap-1 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Release Candidate</span>
                </div>
              </div>
            </div>
          )}

          {/* Live Progress Bar */}
          {(isApplying || isComplete || isRolledBack || isFailed) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700 flex items-center gap-1.5">
                  {isApplying && <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />}
                  <span>{statusData?.status_message || 'Processing system update...'}</span>
                </span>
                <span className="text-indigo-700 font-bold font-mono">{percent}%</span>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/80 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isComplete
                      ? 'bg-emerald-500'
                      : isRolledBack
                      ? 'bg-amber-500'
                      : isFailed
                      ? 'bg-rose-500'
                      : 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-amber-500'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Step-by-Step Milestone Checklist */}
          <div className="space-y-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              6-Step Fail-Safe Verification Checklist
            </div>
            <div className="space-y-2.5">
              {UPDATE_STEPS.map((step, idx) => {
                const stepNum = idx + 1
                const currentNum = statusData?.step_number || 0
                const isStepFinished = isComplete || currentNum > stepNum
                const isStepActive = isApplying && currentNum === stepNum

                return (
                  <div key={step.step} className="flex items-center gap-3 text-xs">
                    {isStepFinished ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    ) : isStepActive ? (
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 font-bold text-[10px]">
                        {stepNum}
                      </span>
                    )}

                    <span
                      className={`font-medium ${
                        isStepFinished
                          ? 'text-slate-800'
                          : isStepActive
                          ? 'text-indigo-700 font-bold'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Collapsible Human-Readable Logs */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowLogs(!showLogs)}
              className="w-full px-4 py-2.5 bg-slate-50 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-500" />
                <span>Processing Activity Log ({statusData?.logs?.length || 0} entries)</span>
              </span>
              {showLogs ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showLogs && (
              <div className="p-3 bg-slate-950 text-slate-300 font-mono text-[11px] max-h-40 overflow-y-auto space-y-1">
                {statusData?.logs?.length ? (
                  statusData.logs.map((log, i) => (
                    <div key={i} className="leading-relaxed">
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 italic">No activity recorded yet. Click Start Update below.</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Guaranteed Zero Data Loss &amp; Historical Ledger Immutability</span>
          </div>

          <div className="flex items-center gap-2">
            {!isApplying && (
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white transition-colors"
              >
                {isComplete ? 'Close' : 'Cancel'}
              </button>
            )}

            {!isApplying && !isComplete && (
              <button
                type="button"
                onClick={handleStartUpdate}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs font-bold shadow-sm hover:from-indigo-700 hover:to-indigo-800 transition-all active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Start 1-Click Update</span>
              </button>
            )}

            {isComplete && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700 transition-all active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Workspace</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
