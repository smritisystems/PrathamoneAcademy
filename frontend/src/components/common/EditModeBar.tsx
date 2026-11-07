/**
 * @file        EditModeBar.tsx
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
 * @description Master View-First & Explicit Edit Mode banner and toggle component enforcing global read-only default and explicit modification authorization.
 */

import React, { useState } from 'react'
import {
  Eye,
  Edit3,
  Lock,
  Unlock,
  AlertTriangle,
  Check,
  X,
  Save,
  ShieldAlert,
  Info,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useEditModeStore } from '../../store/editModeStore'

export interface EditModeBarProps {
  /** Canonical unique identifier for the workspace or record scope (e.g. 'academic:batches', 'student:detail:10') */
  scope: string
  /** Human-readable title of the active resource/workspace */
  title?: string
  /** Optional specific permission string required to unlock Edit Mode */
  requiredPermission?: string
  /** Whether the workspace contains unsaved/dirty form modifications */
  isDirty?: boolean
  /** Optional callback invoked when the user clicks 'Save Changes' */
  onSave?: () => void | Promise<void>
  /** Optional callback invoked when the user cancels or exits Edit Mode */
  onCancel?: () => void
  /** Loading state for save action */
  saveLoading?: boolean
  /** Whether to render in a compact inline bar format rather than a full-width banner */
  compact?: boolean
  /** Custom extra action buttons to render in Edit Mode */
  children?: React.ReactNode
}

export default function EditModeBar({
  scope,
  title,
  requiredPermission,
  isDirty = false,
  onSave,
  onCancel,
  saveLoading = false,
  compact = false,
  children,
}: EditModeBarProps) {
  const { user } = useAuthStore()
  const isEditMode = useEditModeStore((s) => !!s.scopes[scope])
  const enableEditMode = useEditModeStore((s) => s.enableEditMode)
  const disableEditMode = useEditModeStore((s) => s.disableEditMode)

  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  // Check if current user is authorized to edit
  const canActivateEdit = (): boolean => {
    if (!user) return false
    const role = (user.role || '').toLowerCase()
    const isAdmin = ['sysadmin', 'superadmin', 'super_admin', 'admin', 'principal'].includes(role)
    if (requiredPermission) {
      if (isAdmin) return true
      const reqList = requiredPermission.split(/[,|]/).map((s) => s.trim()).filter(Boolean)
      const perms = Array.isArray(user.permissions) ? user.permissions : []
      return reqList.some((rp) => perms.includes(rp)) || perms.includes('*:*') || perms.includes('*.*')
    }
    return isAdmin || ['staff', 'teacher', 'accountant'].includes(role)
  }

  const handleEnable = () => {
    setPermissionError(null)
    const result = enableEditMode(scope, user, requiredPermission)
    if (!result.success) {
      setPermissionError(result.reason || 'You do not have permission to edit this record.')
    }
  }

  const handleDisableRequest = () => {
    if (isDirty) {
      setShowDiscardConfirm(true)
    } else {
      executeExit()
    }
  }

  const executeExit = () => {
    setShowDiscardConfirm(false)
    if (onCancel) {
      onCancel()
    }
    disableEditMode(scope)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW MODE RENDERING (DEFAULT)
  // ─────────────────────────────────────────────────────────────────────────
  if (!isEditMode) {
    if (compact) {
      return (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>View Mode (Locked)</span>
          </span>
          {canActivateEdit() ? (
            <button
              type="button"
              onClick={handleEnable}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-colors shadow-2xs"
              title="Unlock to make modifications"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Enable Edit Mode</span>
            </button>
          ) : (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-400 cursor-not-allowed"
              title="Permission required to unlock editing"
            >
              <Lock className="w-3 h-3" />
              <span>Read Only</span>
            </span>
          )}
          {permissionError && (
            <span className="text-xs text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              {permissionError}
            </span>
          )}
        </div>
      )
    }

    return (
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-200/70 flex items-center justify-center text-slate-600">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                View Mode Active
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span className="text-xs text-slate-500">Read-Only Safety Lock</span>
            </div>
            <p className="text-xs text-slate-600">
              {title ? `${title} is protected.` : 'This record is protected from accidental modifications.'}{' '}
              All mutation controls are disabled until Edit Mode is explicitly enabled.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {permissionError && (
            <span className="text-xs text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 font-medium">
              {permissionError}
            </span>
          )}

          {canActivateEdit() ? (
            <button
              type="button"
              onClick={handleEnable}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-all active:scale-95"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Enable Edit Mode</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-200/80 text-slate-500 cursor-not-allowed">
              <Lock className="w-3.5 h-3.5" />
              <span>Editing Restricted</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EDIT MODE ACTIVE RENDERING (EXPLICIT MUTATION STATE)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-amber-500/10 border-2 border-amber-500/80 rounded-xl p-3 md:px-4 md:py-3 shadow-sm mb-4 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status & Warning Notice */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center animate-pulse">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-900 bg-amber-200 px-2 py-0.5 rounded">
                Edit Mode Active
              </span>
              {isDirty && (
                <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                  Unsaved Changes Pending
                </span>
              )}
            </div>
            <p className="text-xs text-amber-900 mt-0.5 font-medium">
              Modifications are unlocked for {title || 'this section'}. Save your work or cancel to return to View Mode.
            </p>
          </div>
        </div>

        {/* Action Controls: Save, Cancel/Exit, Custom Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {children}

          {onSave && (
            <button
              type="button"
              onClick={() => onSave()}
              disabled={saveLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saveLoading ? 'Saving Changes...' : 'Save & Exit'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDisableRequest}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors shadow-2xs"
          >
            <X className="w-3.5 h-3.5 text-slate-500" />
            <span>Cancel Edit Mode</span>
          </button>
        </div>
      </div>

      {/* Discard Changes Warning Dialog Modal if user attempts to exit with pending edits */}
      {showDiscardConfirm && (
        <div className="mt-3 pt-3 border-t border-amber-200 flex items-center justify-between gap-2 flex-wrap bg-amber-100/60 p-2.5 rounded-lg">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>You have unsaved changes. Discard modifications and return to View Mode?</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDiscardConfirm(false)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 rounded border border-slate-200"
            >
              Keep Editing
            </button>
            <button
              type="button"
              onClick={executeExit}
              className="px-2.5 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded shadow-2xs"
            >
              Discard Changes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
