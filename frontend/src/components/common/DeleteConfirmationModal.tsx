/**
 * @file        DeleteConfirmationModal.tsx
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
 * @description Standardized delete protection modal enforcing active Edit Mode, strict authorization, historical ledger immutability guards, and intentional user confirmation.
 */

import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  ShieldAlert,
  Trash2,
  X,
  Lock,
  FileSpreadsheet,
} from 'lucide-react'
import { useAuthStore, isUserAdmin, hasPermission } from '../../store/authStore'
import { useEditModeStore } from '../../store/editModeStore'

export interface DeleteConfirmationModalProps {
  /** Modal open state */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Action scope to verify edit mode requirement (e.g. 'students:detail:12', 'academic:batches') */
  scope: string
  /** Human-readable entity type (e.g. 'Student Document', 'Batch', 'User Account') */
  entityType: string
  /** Name or identifier of the record being deleted */
  entityName: string
  /** Unique ID of the record */
  entityId?: string | number
  /** Specific required permission for delete (defaults to admin check) */
  requiredPermission?: string
  /**
   * STRICT GOVERNANCE FLAG:
   * If true, hard deletion is blocked by policy (invoices, receipts, payments, payroll, attendance, exam marks).
   */
  isHistoricalFinancial?: boolean
  /** Explanation of what reversal / void workflow should be used instead if historical */
  reversalGuidance?: string
  /** Callback to execute the actual mutation on confirmation */
  onConfirm: () => void | Promise<void>
  /** Loading state during mutation */
  isLoading?: boolean
  /** Error message if mutation failed */
  errorMessage?: string | null
  /** Whether the user must type 'DELETE' to confirm */
  requireTypedConfirmation?: boolean
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  scope,
  entityType,
  entityName,
  entityId,
  requiredPermission,
  isHistoricalFinancial = false,
  reversalGuidance,
  onConfirm,
  isLoading = false,
  errorMessage = null,
  requireTypedConfirmation = false,
}: DeleteConfirmationModalProps) {
  const { user } = useAuthStore()
  const isEditMode = useEditModeStore((s) => !!s.scopes[scope])
  const [typedInput, setTypedInput] = useState('')

  useEffect(() => {
    if (isOpen) {
      setTypedInput('')
    }
  }, [isOpen])

  if (!isOpen) return null

  // 1. Check Delete Authorization
  const hasDeleteAuth = (): boolean => {
    if (!user) return false
    if (requiredPermission) return hasPermission(user, requiredPermission)
    return isUserAdmin(user)
  }

  const isAuthorized = hasDeleteAuth()
  const canConfirm =
    isEditMode &&
    isAuthorized &&
    !isHistoricalFinancial &&
    (!requireTypedConfirmation || typedInput.trim().toUpperCase() === 'DELETE')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between border-b ${
          isHistoricalFinancial ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-100'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isHistoricalFinancial ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white'
            }`}>
              {isHistoricalFinancial ? <ShieldAlert className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">
                {isHistoricalFinancial ? 'Hard Deletion Prohibited' : `Confirm ${entityType} Deletion`}
              </h3>
              <p className="text-xs text-gray-500">Security & Governance Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Historical Financial / Immutable Ledger Blocker */}
          {isHistoricalFinancial ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <FileSpreadsheet className="w-4 h-4 text-amber-700" />
                  <span>Immutable Financial Record Protection Directive</span>
                </div>
                <p>
                  In compliance with Single Source of Truth and double-entry accounting standards, posted payments,
                  invoices, fee transactions, payroll vouchers, student attendance, and official marks cannot be permanently destroyed.
                </p>
                <p className="font-semibold text-amber-950">
                  {reversalGuidance || 'To correct mistakes, please utilize the authorized "Void", "Reversal", or "Cancel" transaction workflow with an audit reason.'}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div className="text-slate-500 font-medium">Record Identifier:</div>
                <div className="font-bold text-slate-800">{entityName} {entityId ? `(ID: ${entityId})` : ''}</div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Requirement 1 Check: Explicit Edit Mode Active */}
              {!isEditMode && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Edit Mode Required: </span>
                    You cannot perform deletions while the workspace is in View Mode.
                    Please enable Edit Mode on this page before attempting to remove records.
                  </div>
                </div>
              )}

              {/* Requirement 2 Check: User Delete Permission */}
              {!isAuthorized && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Insufficient Authorization: </span>
                    Your role does not possess delete privileges for this entity.
                  </div>
                </div>
              )}

              {/* Record Summary Box */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="text-slate-500 font-medium">Target Entity for Removal:</div>
                <div className="font-bold text-sm text-slate-900">{entityName}</div>
                {entityId && (
                  <div className="text-slate-500">
                    Entity Type: <span className="font-medium text-slate-700">{entityType}</span> | System ID: <span className="font-medium text-slate-700">{entityId}</span>
                  </div>
                )}
                <div className="text-rose-600 font-medium pt-1">
                  ⚠️ This action cannot be undone. All associated sub-items will be permanently removed.
                </div>
              </div>

              {/* Typed Confirmation if required */}
              {requireTypedConfirmation && isEditMode && isAuthorized && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Type <span className="font-mono text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">DELETE</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={typedInput}
                    onChange={(e) => setTypedInput(e.target.value)}
                    placeholder="Type DELETE"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>
              )}

              {/* Error Notice */}
              {errorMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
                  {errorMessage}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
          >
            {isHistoricalFinancial ? 'Close' : 'Cancel'}
          </button>

          {!isHistoricalFinancial && (
            <button
              type="button"
              disabled={!canConfirm || isLoading}
              onClick={() => onConfirm()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Deleting...' : `Confirm Delete ${entityType}`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
