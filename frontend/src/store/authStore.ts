/**
 * @file        authStore.ts
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
 * @created     2026-11-03
 * @updated     2026-11-07
 *
 * @description Zustand state store managing user authentication token, logged-in profile, and active institute ID.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'

interface AuthState {
  token: string | null
  user: User | null
  selectedInstitutionId: number | null
  selectedAcademicYearId: number | null
  login: (token: string, user: User) => void
  logout: () => void
  setSelectedInstitution: (id: number) => void
  setSelectedAcademicYear: (id: number) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      selectedInstitutionId: 1,
      selectedAcademicYearId: 1,
      login: (token, user) =>
        set({
          token,
          user,
          selectedInstitutionId: user.institution_id || 1,
          selectedAcademicYearId: 1,
        }),
      logout: () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('prashant-logout'))
        }
        set({
          token: null,
          user: null,
          selectedInstitutionId: 1,
          selectedAcademicYearId: 1,
        })
      },
      setSelectedInstitution: (id) => set({ selectedInstitutionId: id || 1 }),
      setSelectedAcademicYear: (id) => set({ selectedAcademicYearId: id || 1 }),
    }),
    { name: 'prashant-auth' }
  )
)



export const isUserSysAdmin = (user: User | null): boolean => {
  if (!user || !user.role) return false
  const r = user.role.toLowerCase()
  return r === 'sysadmin' || r === 'superadmin' || r === 'super_admin'
}

export const isUserAdmin = (user: User | null): boolean => {
  if (!user || !user.role) return false
  const r = user.role.toLowerCase()
  return (
    r === 'sysadmin' ||
    r === 'superadmin' ||
    r === 'super_admin' ||
    r === 'admin' ||
    r === 'principal'
  )
}


export const hasPermission = (user: User | null, perm: string): boolean => {
  if (!user) return false
  const r = (user.role || '').toLowerCase()
  const perms = user.permissions || []

  // Direct explicit match
  if (perms.includes(perm)) return true

  // STRICT RULE: 'payments:edit_posted' CANNOT be bypassed by wildcard or sysadmin role!
  if (perm === 'payments:edit_posted') {
    return perms.includes('payments:edit_posted')
  }

  // Sysadmin superuser blanket access for other permissions
  if (r === 'sysadmin' || r === 'superadmin' || r === 'super_admin') {
    return true
  }

  // General wildcard permission
  if (perms.includes('*:*') || perms.includes('*.*')) {
    return true
  }

  return false
}

export const canUserEditPosted = (user: User | null): boolean => {
  if (!user || !user.permissions) return false
  return user.permissions.includes('payments:edit_posted')
}
