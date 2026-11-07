/**
 * @file        editModeStore.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.store
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
 * @description Centralized Zustand store enforcing Global View-First & Explicit Edit Mode governance across all modules, pages, forms, and tables.
 */

import { create } from 'zustand'
import type { User } from '../types'
import { isUserAdmin, hasPermission } from './authStore'

export interface EditModeState {
  /** Map of scope strings to active edit status (default: false / view mode) */
  scopes: Record<string, boolean>
  /** Map of scope strings to dirty (unsaved changes) status */
  dirty: Record<string, boolean>

  /** Check if a given scope is actively in Edit Mode */
  isEditMode: (scope: string) => boolean

  /** Check if a given scope has unsaved modifications */
  isDirty: (scope: string) => boolean

  /**
   * Explicitly enable Edit Mode for a given scope, with strict RBAC permission validation.
   * Returns true if successfully enabled, false if rejected due to permissions.
   */
  enableEditMode: (
    scope: string,
    user: User | null,
    requiredPermission?: string
  ) => { success: boolean; reason?: string }

  /** Disable Edit Mode for a scope, returning it to View Mode */
  disableEditMode: (scope: string) => void

  /** Toggle Edit Mode with permission check */
  toggleEditMode: (
    scope: string,
    user: User | null,
    requiredPermission?: string
  ) => boolean

  /** Mark a scope as having dirty (unsaved) modifications */
  setDirty: (scope: string, isDirty: boolean) => void

  /** Reset all scopes back to View Mode (called on route changes, logout, session expiration) */
  resetAll: () => void
}

export const useEditModeStore = create<EditModeState>()((set, get) => ({
  scopes: {},
  dirty: {},

  isEditMode: (scope: string): boolean => {
    return !!get().scopes[scope]
  },

  isDirty: (scope: string): boolean => {
    return !!get().dirty[scope]
  },

  enableEditMode: (scope: string, user: User | null, requiredPermission?: string) => {
    if (!user) {
      return { success: false, reason: 'Authentication required to activate Edit Mode.' }
    }

    // Role & Permission Verification
    if (requiredPermission) {
      const permitted = hasPermission(user, requiredPermission)
      if (!permitted) {
        return {
          success: false,
          reason: `Insufficient privileges: Permission '${requiredPermission}' is required.`,
        }
      }
    } else {
      // Default: Administrative or staff role required for mutating application records
      const role = (user.role || '').toLowerCase()
      const allowedRoles = ['sysadmin', 'superadmin', 'super_admin', 'admin', 'principal', 'staff', 'teacher', 'accountant']
      if (!allowedRoles.includes(role)) {
        return {
          success: false,
          reason: 'Your account role is restricted to View-Only access.',
        }
      }
    }

    set((state) => ({
      scopes: {
        ...state.scopes,
        [scope]: true,
      },
    }))

    return { success: true }
  },

  disableEditMode: (scope: string) => {
    set((state) => {
      const nextScopes = { ...state.scopes }
      delete nextScopes[scope]

      const nextDirty = { ...state.dirty }
      delete nextDirty[scope]

      return {
        scopes: nextScopes,
        dirty: nextDirty,
      }
    })
  },

  toggleEditMode: (scope: string, user: User | null, requiredPermission?: string): boolean => {
    const current = get().isEditMode(scope)
    if (current) {
      get().disableEditMode(scope)
      return false
    } else {
      const res = get().enableEditMode(scope, user, requiredPermission)
      return res.success
    }
  },

  setDirty: (scope: string, isDirty: boolean) => {
    set((state) => ({
      dirty: {
        ...state.dirty,
        [scope]: isDirty,
      },
    }))
  },

  resetAll: () => {
    set({
      scopes: {},
      dirty: {},
    })
  },
}))

/**
 * Convenience React hook for individual components and workspaces.
 */
export function useScopedEditMode(scope: string, requiredPermission?: string) {
  const isEditMode = useEditModeStore((s) => !!s.scopes[scope])
  const isDirty = useEditModeStore((s) => !!s.dirty[scope])
  const enableEditMode = useEditModeStore((s) => s.enableEditMode)
  const disableEditMode = useEditModeStore((s) => s.disableEditMode)
  const setDirty = useEditModeStore((s) => s.setDirty)

  return {
    isEditMode,
    isDirty,
    enable: (user: User | null) => enableEditMode(scope, user, requiredPermission),
    disable: () => disableEditMode(scope),
    setDirty: (dirty: boolean) => setDirty(scope, dirty),
  }
}

// Auto-reset all workspace edit modes on user logout or session expiration
if (typeof window !== 'undefined') {
  window.addEventListener('prashant-logout', () => {
    useEditModeStore.getState().resetAll()
  })
}

