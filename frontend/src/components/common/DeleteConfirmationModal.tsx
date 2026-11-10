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
 * @updated     2026-11-10
 *
 * @description Standardized enterprise safe-delete modal enforcing pre-flight dependency audits, active Edit Mode, 3-tier actions (Delete/Deactivate/Archive), and financial ledger immutability.
 */

import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  ShieldAlert,
  Trash2,
  X,
  Lock,
  FileSpreadsheet,
  CheckCircle2,
  Archive,
  Ban,
  Layers,
  Settings,
  Loader2,
  Info,
} from 'lucide-react'
import { useAuthStore, isUserAdmin, hasPermission } from '../../store/authStore'
import { useEditModeStore } from '../../store/editModeStore'
import { governanceApi, DeletionEligibilityReport } from '../../api/endpoints'

const GOVERNED_ENTITY_TYPES = new Set([
  'user', 'student', 'standard', 'division', 'batch', 'canonical_subject',
  'subject', 'subject_mapping', 'fee_category', 'fee_structure',
  'academic_year', 'examination', 'exam', 'lead', 'lookup_item',
  'payment', 'payment_receipt', 'fee_invoice', 'refund', 'teacher_payroll',
])

export interface DeleteConfirmationModalProps {
  /** Modal open state */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Action scope to verify edit mode requirement (e.g. 'students:detail:12', 'academic:batches') */
  scope: string
  /** Human-readable entity type (e.g. 'Student', 'Batch', 'User', 'Standard', 'Subject') */
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
  onConfirm: (reason?: string) => void | Promise<void>
  /** Callback to execute safe deactivation instead of hard delete */
  onDeactivate?: (reason?: string) => void | Promise<void>
  /** Callback to execute safe archiving instead of hard delete */
  onArchive?: (reason?: string) => void | Promise<void>
  /** Loading state during mutation */
  isLoading?: boolean
  /** Error message if mutation failed */
  errorMessage?: string | null
  /** Whether the user must type 'DELETE' to confirm */
  requireTypedConfirmation?: boolean
  /** Whether to automatically run pre-flight check against backend governance API (defaults to true if entityId given) */
  enablePreflightCheck?: boolean
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
  onDeactivate,
  onArchive,
  isLoading = false,
  errorMessage = null,
  requireTypedConfirmation = false,
  enablePreflightCheck = true,
}: DeleteConfirmationModalProps) {
  const { user } = useAuthStore()
  const isEditMode = useEditModeStore((s) => !!s.scopes[scope])
  const [typedInput, setTypedInput] = useState('')
  const [reasonInput, setReasonInput] = useState('')

  // Pre-flight check state
  const [isChecking, setIsChecking] = useState(false)
  const [preflightReport, setPreflightReport] = useState<DeletionEligibilityReport | null>(null)
  const [preflightError, setPreflightError] = useState<string | null>(null)

  // Sub-action loading states
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  const normalizedType = entityType.trim().toLowerCase().replace(/\s+/g, '_')
  const isGoverned = GOVERNED_ENTITY_TYPES.has(normalizedType)

  // Run pre-flight dependency check whenever modal opens with valid entityId for governed entities
  useEffect(() => {
    if (isOpen) {
      setTypedInput('')
      setReasonInput('')
      setPreflightError(null)

      if (enablePreflightCheck && entityId && isGoverned && !isHistoricalFinancial) {
        setIsChecking(true)
        governanceApi
          .checkSafeDelete(normalizedType, entityId)
          .then((res) => {
            setPreflightReport(res.data)
          })
          .catch((err) => {
            const msg = err.response?.data?.detail || err.message || 'Failed to check dependency rules'
            setPreflightError(msg)
          })
          .finally(() => {
            setIsChecking(false)
          })
      } else {
        setPreflightReport(null)
        setIsChecking(false)
      }
    }
  }, [isOpen, normalizedType, entityId, enablePreflightCheck, isHistoricalFinancial, isGoverned])


  if (!isOpen) return null

  // 1. Check Delete Authorization
  const hasDeleteAuth = (): boolean => {
    if (!user) return false
    if (requiredPermission) return hasPermission(user, requiredPermission)
    return isUserAdmin(user)
  }

  const isAuthorized = hasDeleteAuth()

  // Determine effective eligibility
  const isBlockedByFinancial = isHistoricalFinancial || preflightReport?.block_category === 'transaction_history'
  const isEligibleForPermanentDelete =
    !isBlockedByFinancial &&
    (preflightReport ? preflightReport.is_eligible : !isHistoricalFinancial)

  const canConfirm =
    isEditMode &&
    isAuthorized &&
    isEligibleForPermanentDelete &&
    !isChecking &&
    (!requireTypedConfirmation || typedInput.trim().toUpperCase() === 'DELETE')

  const canDeactivate = preflightReport?.can_deactivate || !!onDeactivate
  const canArchive = preflightReport?.can_archive || !!onArchive

  const handleDeactivateClick = async () => {
    if (onDeactivate) {
      await onDeactivate(reasonInput)
    } else if (entityId) {
      setIsDeactivating(true)
      try {
        await governanceApi.executeSafeDeactivate(
          entityType.toLowerCase().replace(/\s+/g, '_'),
          entityId,
          reasonInput || 'Deactivated via Safe Delete Governance Modal'
        )
        onClose()
      } catch (err: any) {
        setPreflightError(err.response?.data?.detail || err.message || 'Deactivation failed')
      } finally {
        setIsDeactivating(false)
      }
    }
  }

  const handleArchiveClick = async () => {
    if (onArchive) {
      await onArchive(reasonInput)
    } else if (entityId) {
      setIsArchiving(true)
      try {
        await governanceApi.executeSafeArchive(
          entityType.toLowerCase().replace(/\s+/g, '_'),
          entityId,
          reasonInput || 'Archived via Safe Delete Governance Modal'
        )
        onClose()
      } catch (err: any) {
        setPreflightError(err.response?.data?.detail || err.message || 'Archiving failed')
      } finally {
        setIsArchiving(false)
      }
    }
  }

  // Render Status Badge
  const renderStatusBadge = () => {
    if (isChecking) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Auditing Dependencies...
        </span>
      )
    }

    if (isBlockedByFinancial) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700" />
          Deletion blocked — transaction history
        </span>
      )
    }

    if (preflightReport && !preflightReport.is_eligible) {
      switch (preflightReport.block_category) {
        case 'linked_records':
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
              <Layers className="w-3.5 h-3.5 text-rose-700" />
              Deletion blocked — linked records
            </span>
          )
        case 'configuration_dependency':
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              <Settings className="w-3.5 h-3.5 text-blue-700" />
              Deletion blocked — configuration dependency
            </span>
          )
        case 'system_protected':
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
              <ShieldAlert className="w-3.5 h-3.5 text-purple-700" />
              Deletion blocked — system protected
            </span>
          )
        default:
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
              <Ban className="w-3.5 h-3.5 text-rose-700" />
              Deletion blocked
            </span>
          )
      }
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
        Eligible for deletion
      </span>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div
          className={`px-6 py-4 flex items-center justify-between border-b ${
            isBlockedByFinancial
              ? 'bg-amber-50 border-amber-200'
              : !isEligibleForPermanentDelete
              ? 'bg-rose-50/80 border-rose-200'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isBlockedByFinancial
                  ? 'bg-amber-600 text-white'
                  : !isEligibleForPermanentDelete
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-700 text-white'
              }`}
            >
              {isBlockedByFinancial ? (
                <ShieldAlert className="w-5 h-5" />
              ) : !isEligibleForPermanentDelete ? (
                <Ban className="w-5 h-5" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">
                {isBlockedByFinancial
                  ? 'Hard Deletion Prohibited'
                  : !isEligibleForPermanentDelete
                  ? 'Permanent Deletion Blocked'
                  : `Confirm ${entityType} Deletion`}
              </h3>
              <p className="text-xs text-gray-500">Global Safe Delete & Data Integrity Policy</p>
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
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Status Badge Bar */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Audit Status</span>
            {renderStatusBadge()}
          </div>

          {/* Target Record Info Box */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="text-slate-500 font-medium">Target Record:</div>
            <div className="font-bold text-sm text-slate-900">{entityName}</div>
            {entityId && (
              <div className="text-slate-500">
                Entity Type: <span className="font-medium text-slate-700">{entityType}</span> | System ID:{' '}
                <span className="font-medium text-slate-700">{entityId}</span>
              </div>
            )}
          </div>

          {/* View Mode Guard Notice */}
          {!isEditMode && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Edit Mode Required: </span>
                You cannot perform deletions or status changes while this page is in View Mode.
                Please activate Edit Mode on this page first.
              </div>
            </div>
          )}

          {/* Unauthorized Role Notice */}
          {!isAuthorized && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Insufficient Authorization: </span>
                Your role does not possess delete privileges for this entity.
              </div>
            </div>
          )}

          {/* BLOCKED CASE 1: Financial Ledger Immutability Directive */}
          {isBlockedByFinancial ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <FileSpreadsheet className="w-4 h-4 text-amber-700" />
                  <span>Immutable Financial Record Protection Directive</span>
                </div>
                <p>
                  In compliance with Single Source of Truth and double-entry accounting standards, posted payments,
                  receipts, invoices, fee transactions, payroll vouchers, and ledger entries cannot be permanently erased.
                </p>
                <p className="font-semibold text-amber-950">
                  {reversalGuidance ||
                    preflightReport?.reversal_guidance ||
                    'To correct mistakes, please utilize the authorized "Void", "Reversal", or "Cancel" transaction workflow with an audit reason.'}
                </p>
              </div>
            </div>
          ) : !isEligibleForPermanentDelete && preflightReport ? (
            /* BLOCKED CASE 2: Dependencies Detected (Linked Records / Config / Transactions) */
            <div className="space-y-3">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-rose-950">
                  <AlertTriangle className="w-4 h-4 text-rose-700" />
                  <span>Permanent Deletion Blocked by Dependency Rule</span>
                </div>
                <p>{preflightReport.block_reason}</p>
              </div>

              {/* Dependent Counts Summary */}
              {Object.keys(preflightReport.dependent_counts).length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700">Referencing Entities Found:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(preflightReport.dependent_counts).map(([label, count]) => (
                      <div
                        key={label}
                        className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between"
                      >
                        <span className="text-slate-600 font-medium truncate">{label}</span>
                        <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-sm text-[11px]">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Safe Alternative Options */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-600" />
                  Recommended Safe Actions:
                </div>
                <p className="text-xs text-slate-600">
                  To preserve historical records, audit continuity, and avoid data loss, choose one of the safe actions below:
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {canDeactivate && (
                    <button
                      type="button"
                      disabled={!isEditMode || !isAuthorized || isDeactivating}
                      onClick={handleDeactivateClick}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-all disabled:opacity-40"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>{isDeactivating ? 'Deactivating...' : 'Deactivate Record Instead'}</span>
                    </button>
                  )}
                  {canArchive && (
                    <button
                      type="button"
                      disabled={!isEditMode || !isAuthorized || isArchiving}
                      onClick={handleArchiveClick}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-lg transition-all disabled:opacity-40"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>{isArchiving ? 'Archiving...' : 'Archive Record Instead'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ELIGIBLE FOR DELETION */
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Eligible for Permanent Deletion</span>
                </div>
                <p>
                  Zero referencing records, students, transactions, attendance, marks, or configuration dependencies were
                  found. This record can be safely removed.
                </p>
              </div>

              {/* Optional Reason Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Reason for Deletion (recorded in Audit Log):
                </label>
                <input
                  type="text"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="e.g. Created by mistake / Test record cleanup"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              {/* Typed Confirmation if required */}
              {requireTypedConfirmation && isEditMode && isAuthorized && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Type{' '}
                    <span className="font-mono text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
                      DELETE
                    </span>{' '}
                    to confirm:
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
            </div>
          )}

          {/* Preflight or Mutation Error Message */}
          {(errorMessage || preflightError) && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
              {errorMessage || preflightError}
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
            {isBlockedByFinancial || !isEligibleForPermanentDelete ? 'Close' : 'Cancel'}
          </button>

          {isEligibleForPermanentDelete && !isBlockedByFinancial && (
            <button
              type="button"
              disabled={!canConfirm || isLoading}
              onClick={() => onConfirm(reasonInput)}
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
