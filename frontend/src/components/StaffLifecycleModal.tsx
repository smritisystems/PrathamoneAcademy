/**
 * @file        StaffLifecycleModal.tsx
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
 * @created     2026-11-06
 * @updated     2026-11-06
 *
 * @description Modal dialog for managing employee lifecycle state transitions (activate, leave, resignation, termination, rehire).
 */

import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileText,
  UserCheck,
  UserX,
  Clock,
  RotateCcw,
  Loader2,
  ShieldAlert,
} from 'lucide-react'
import Modal from './Modal'
import { staffApi } from '../api/endpoints'
import type { StaffLifecyclePayload } from '../types'

export interface StaffLifecycleModalProps {
  isOpen: boolean
  onClose: () => void
  employee: {
    id: number
    name: string
    employee_id?: string | null
    role: string
    status: string
    rehire_eligible?: boolean
  } | null
  onSuccess: () => void
}

type LifecycleActionType = 'activate' | 'put_on_leave' | 'deactivate' | 'resign' | 'terminate' | 'end_contract' | 'rehire'

const ACTION_DESCRIPTIONS: Record<LifecycleActionType, { label: string; desc: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  activate: {
    label: 'Activate / Return to Duty',
    desc: 'Sets status to active and enables platform authentication.',
    icon: CheckCircle2,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  put_on_leave: {
    label: 'Mark on Extended Leave',
    desc: 'Temporary absence while maintaining active employment profile.',
    icon: Clock,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  deactivate: {
    label: 'Deactivate Access',
    desc: 'Temporarily suspends login without recording formal exit.',
    icon: UserX,
    color: 'text-zinc-600 bg-zinc-50 border-zinc-200',
  },
  resign: {
    label: 'Formal Resignation',
    desc: 'Voluntary departure; records exit date and updates ledger.',
    icon: UserX,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
  },
  terminate: {
    label: 'Administrative Termination',
    desc: 'Involuntary exit; revokes access and records official termination reason.',
    icon: ShieldAlert,
    color: 'text-red-700 bg-red-50 border-red-200',
  },
  end_contract: {
    label: 'End of Contract Term',
    desc: 'Contract duration completed; marks employment cycle ended.',
    icon: Calendar,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
  },
  rehire: {
    label: 'Rehire / Reinstate Personnel',
    desc: 'Re-activates former employee preserving continuous historical identity.',
    icon: RotateCcw,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
}

const COMMON_REASONS: Record<LifecycleActionType, string[]> = {
  activate: [
    'Returned from approved medical leave',
    'Returned from sabbatical / study leave',
    'New joining onboarding completed',
    'Re-activated by administration',
  ],
  put_on_leave: [
    'Maternity / Paternity Leave',
    'Medical Treatment & Recovery',
    'Personal Emergency / Family Leave',
    'Academic Examination Preparation',
  ],
  deactivate: [
    'Administrative review pending',
    'Temporary seasonal suspension',
    'Security access pause',
  ],
  resign: [
    'Better career opportunity',
    'Relocation to another city',
    'Higher education / Doctorate studies',
    'Personal / family reasons',
    'Health constraints',
  ],
  terminate: [
    'Performance non-compliance',
    'Violation of code of conduct',
    'Unexcused prolonged absenteeism',
    'Restructuring / Faculty redundancy',
  ],
  end_contract: [
    'Fixed academic session contract expired',
    'Visiting faculty tenure completed',
    'Course syllabus completed as scheduled',
  ],
  rehire: [
    'Re-appointed for new academic year',
    'Returning faculty after higher studies',
    'Contract renewal approved by board',
  ],
}

export default function StaffLifecycleModal({
  isOpen,
  onClose,
  employee,
  onSuccess,
}: StaffLifecycleModalProps) {
  const isDeparted = ['resigned', 'terminated', 'contract_ended'].includes(employee?.status?.toLowerCase() || '')

  const [action, setAction] = useState<LifecycleActionType>(isDeparted ? 'rehire' : 'activate')
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().split('T')[0])
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [notes, setNotes] = useState('')
  const [rehireEligible, setRehireEligible] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (employee) {
      const dep = ['resigned', 'terminated', 'contract_ended'].includes(employee.status?.toLowerCase() || '')
      const initialAction: LifecycleActionType = dep ? 'rehire' : 'activate'
      setAction(initialAction)
      setReason(COMMON_REASONS[initialAction][0] || '')
      setCustomReason('')
      setNotes('')
      setRehireEligible(employee.rehire_eligible ?? true)
      setError(null)
    }
  }, [employee])

  const handleActionChange = (newAction: LifecycleActionType) => {
    setAction(newAction)
    setReason(COMMON_REASONS[newAction][0] || '')
    setCustomReason('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee) return

    const finalReason = reason === 'custom' ? customReason.trim() : (customReason.trim() || reason)
    if (!finalReason) {
      setError('Please provide an official reason or justification for this lifecycle transition.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const payload: StaffLifecyclePayload = {
        action,
        effective_date: effectiveDate,
        reason: finalReason,
        notes: notes.trim() || undefined,
        rehire_eligible: ['resign', 'terminate', 'end_contract'].includes(action) ? rehireEligible : true,
      }

      await staffApi.updateLifecycle(employee.id, payload)
      onSuccess()
      onClose()
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update employee lifecycle'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!employee) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Employee Lifecycle Management" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Employee Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-800">{employee.name}</div>
            <div className="text-xs text-slate-500">
              ID: {employee.employee_id || 'N/A'} • Role: {employee.role}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 uppercase block font-medium">Current Status</span>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
              employee.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
              employee.status === 'on_leave' ? 'bg-amber-100 text-amber-800' :
              ['resigned', 'terminated'].includes(employee.status) ? 'bg-rose-100 text-rose-800' :
              'bg-slate-200 text-slate-800'
            }`}>
              {employee.status}
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {/* Transition Action Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            Select Lifecycle Action
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {(Object.keys(ACTION_DESCRIPTIONS) as LifecycleActionType[]).map((actKey) => {
              const info = ACTION_DESCRIPTIONS[actKey]
              const Icon = info.icon
              const isSelected = action === actKey
              return (
                <button
                  type="button"
                  key={actKey}
                  onClick={() => handleActionChange(actKey)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? `${info.color} ring-2 ring-indigo-500 font-medium`
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isSelected ? '' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-semibold">{info.label}</div>
                    <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{info.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Form Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Effective Date *
            </label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              required
              className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-1.5"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Standard Reason Template
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-1.5"
            >
              {(COMMON_REASONS[action] || []).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              <option value="custom">Other / Custom Justification...</option>
            </select>
          </div>
        </div>

        {/* Custom Reason Input */}
        {(reason === 'custom' || !COMMON_REASONS[action]?.includes(reason)) && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Specific Reason / Justification *
            </label>
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Enter official justification..."
              required
              className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-1.5"
            />
          </div>
        )}

        {/* Rehire Eligibility Flag (For departures) */}
        {['resign', 'terminate', 'end_contract'].includes(action) && (
          <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rehireEligible}
                onChange={(e) => setRehireEligible(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span className="text-xs font-semibold text-slate-800">
                Mark as Eligible for Future Rehire / Re-engagement
              </span>
            </label>
            <p className="text-[11px] text-slate-500 mt-1 pl-6">
              If checked, future administrators can reinstate this person under the same continuous identity.
            </p>
          </div>
        )}

        {/* Internal Audit Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Administrative Audit Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional internal remarks, handover notes, or board meeting references..."
            className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Confirm Status Transition
          </button>
        </div>
      </form>
    </Modal>
  )
}
