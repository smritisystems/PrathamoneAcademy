/**
 * @file        TrainingManagement.tsx
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
 * @created     2026-11-07
 * @updated     2026-11-07
 *
 * @description Central Administrator Control Center for Global Training & Demo Environment: policy configuration, session monitor, and atomic reset engine.
 */

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FlaskConical,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Users,
  Database,
  CheckCircle2,
  XCircle,
  Play,
  Settings as SettingsIcon,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { trainingApi, TrainingStatusResponse } from '../api/endpoints'
import { useEnvironmentStore } from '../store/environmentStore'
import { useAuthStore, isUserAdmin } from '../store/authStore'
import EnvironmentSwitchModal from '../components/common/EnvironmentSwitchModal'
import { toast } from 'react-hot-toast'

export default function TrainingManagement() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { isTrainingMode, enterTrainingMode } = useEnvironmentStore()

  const [showSwitchModal, setShowSwitchModal] = useState(false)
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false)
  const [forceReset, setForceReset] = useState(false)

  // 1. Fetch Training Environment Status
  const {
    data: status,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ['training-status'],
    queryFn: () => trainingApi.getStatus().then((r) => r.data),
    refetchInterval: 15000,
  })

  // 2. Fetch Reset Audit Logs
  const {
    data: resetLogs = [],
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: ['training-reset-logs'],
    queryFn: () => trainingApi.getResetLogs(20).then((r) => r.data),
  })

  // 3. Reset Environment Mutation
  const resetMutation = useMutation({
    mutationFn: () =>
      trainingApi.resetEnvironment({
        force: forceReset,
        restore_baseline: true,
      }),
    onSuccess: (res) => {
      toast.success(
        `Training environment reset successfully! ${res.data.records_seeded} baseline records seeded.`
      )
      setShowResetConfirmModal(false)
      queryClient.invalidateQueries({ queryKey: ['training-status'] })
      queryClient.invalidateQueries({ queryKey: ['training-reset-logs'] })
      queryClient.invalidateQueries({ queryKey: ['crm'] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to reset training environment.'
      toast.error(msg)
    },
  })

  // 4. Update Policy Mutation
  const updateConfigMutation = useMutation({
    mutationFn: (newPolicy: string) =>
      trainingApi.updateConfig({ reset_policy: newPolicy }),
    onSuccess: () => {
      toast.success('Reset policy updated successfully.')
      queryClient.invalidateQueries({ queryKey: ['training-status'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update policy.')
    },
  })

  const isAdmin = isUserAdmin(user)

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-inner">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Global Training & Simulation Lab
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                Tenant: PA001-DEMO
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Isolated sandbox environment for staff practice, workflow drills, and feature onboarding.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              refetchStatus()
              refetchLogs()
            }}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            title="Refresh Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {!isTrainingMode ? (
            <button
              type="button"
              onClick={() => setShowSwitchModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Enter Training Sandbox</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Training Sandbox Active</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Top Metrics Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
            <span>Enquiries / Leads</span>
            <Database className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {status?.record_counts?.leads ?? 0}
          </div>
          <span className="text-[11px] text-amber-700 font-medium">
            Across 7 pipeline stages
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
            <span>Sample Students</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {status?.record_counts?.students ?? 0}
          </div>
          <span className="text-[11px] text-blue-700 font-medium">
            Enrolled & converted
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
            <span>Follow-up Logs</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {status?.record_counts?.follow_ups ?? 0}
          </div>
          <span className="text-[11px] text-indigo-700 font-medium">
            Chronological call & visit notes
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
            <span>Active Sessions</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {status?.active_sessions_count ?? 0}
          </div>
          <span className="text-[11px] text-emerald-700 font-medium">
            Staff practising currently
          </span>
        </div>
      </div>

      {/* ── Policy & Reset Management Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Configurable Reset Policies */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900">
                Automated Reset Policy Configuration
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Dataset: {status?.dataset_version || 'CRM-STAFF-TRAINING-V1'}
            </span>
          </div>

          <div className="space-y-3">
            {[
              {
                id: 'manual_only',
                title: 'Manual Reset by Administrator Only (Recommended Default)',
                desc: 'Training records persist until an authorized administrator explicitly clicks Reset. Prevents unexpected disappearance of another staff member’s practice work.',
              },
              {
                id: 'after_session',
                title: 'Reset After Training Session',
                desc: 'Cleanses the training database once all active users have exited their training sessions.',
              },
              {
                id: 'daily_scheduled',
                title: 'Daily Scheduled Reset (at 03:00 AM)',
                desc: 'Wipes and re-seeds the baseline training dataset automatically every night during non-working hours.',
              },
              {
                id: 'inactivity_timeout',
                title: 'Inactivity Timeout (60 Minutes)',
                desc: 'Resets the environment when no staff activity is registered for 60 consecutive minutes.',
              },
              {
                id: 'never',
                title: 'Never Auto-Reset (Persistent Practice Mode)',
                desc: 'Disables all automated resets completely. Staff work accumulates continuously.',
              },
            ].map((policy) => {
              const isSelected = status?.reset_policy === policy.id

              return (
                <div
                  key={policy.id}
                  onClick={() => isAdmin && updateConfigMutation.mutate(policy.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/10'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  } ${!isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-amber-600 bg-amber-600'
                              : 'border-slate-400'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <h3 className="text-xs font-bold text-slate-900 leading-snug">
                          {policy.title}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-5.5 leading-relaxed">
                        {policy.desc}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Master Reset Engine Action */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-2xl p-5 md:p-6 shadow-lg flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="text-sm font-bold tracking-wide uppercase">
                Production Safety Locks Active
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              The Reset Engine is bound strictly to the isolated Training Tenant (
              <code className="text-amber-300 font-mono">PA001-DEMO</code>). It cannot, under any
              circumstance, access or delete Prashant Academy’s 39 real students, 171 payments, or
              customer ledgers.
            </p>

            <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80 space-y-2 text-xs">
              <div className="text-slate-400 font-semibold">Last Reset Snapshot:</div>
              {status?.last_reset ? (
                <div className="text-slate-200">
                  <span className="font-bold text-emerald-400">
                    {status.last_reset.status}
                  </span>{' '}
                  ·{' '}
                  {new Date(status.last_reset.timestamp).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              ) : (
                <div className="text-slate-500 italic">No previous manual resets logged.</div>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-800">
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(true)}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Training Environment Now</span>
              </button>
            ) : (
              <p className="text-xs text-slate-400 text-center italic">
                Administrator authorization required to trigger environment reset.
              </p>
            )}
            <p className="text-[10px] text-slate-400 text-center">
              Re-seeds 20 enquiries across 7 stages and 5 demo students.
            </p>
          </div>
        </div>
      </div>

      {/* ── Reset Audit Log Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Training Reset Audit Trail
          </h2>
          <span className="text-xs text-slate-500">
            Past {resetLogs.length} reset operations
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Initiated By</th>
                <th className="py-2.5 px-3">Dataset Version</th>
                <th className="py-2.5 px-3">Records Cleared</th>
                <th className="py-2.5 px-3">Records Seeded</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resetLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                    No reset logs found. Environment is operating on initial baseline.
                  </td>
                </tr>
              ) : (
                resetLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      {log.created_at
                        ? new Date(log.created_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {log.initiated_by}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {log.dataset_version}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {log.records_cleared}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-600">
                      +{log.records_seeded}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {log.duration_ms}ms
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Reset Confirmation Modal ── */}
      {showResetConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-amber-50 border-b border-amber-200 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirm Training Environment Reset
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Tenant: PA001-DEMO (Isolated Sample Sandbox)
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4 text-sm text-slate-600">
              <p className="leading-relaxed">
                This operation will completely clear all demo CRM enquiries, follow-ups, and sample
                student transactions created during staff training sessions, then restore the
                official baseline dataset (<strong>20 enquiries, 5 demo students</strong>).
              </p>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={forceReset}
                    onChange={(e) => setForceReset(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Force reset even if other active staff sessions exist</span>
                </label>
              </div>

              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  Production customer records and financial ledgers will NOT be affected.
                </span>
              </div>
            </div>

            <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetMutation.isPending}
                onClick={() => resetMutation.mutate()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {resetMutation.isPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Confirm & Reset Sandbox</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Environment Switch Modal ── */}
      <EnvironmentSwitchModal
        isOpen={showSwitchModal}
        onClose={() => setShowSwitchModal(false)}
        targetEnvironment="TRAINING"
      />
    </div>
  )
}
