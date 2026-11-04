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
 * @updated     2026-11-04
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
      selectedInstitutionId: null,
      selectedAcademicYearId: null,
      login: (token, user) =>
        set({
          token,
          user,
          selectedInstitutionId: user.institution_id ?? null,
        }),
      logout: () =>
        set({
          token: null,
          user: null,
          selectedInstitutionId: null,
          selectedAcademicYearId: null,
        }),
      setSelectedInstitution: (id) => set({ selectedInstitutionId: id }),
      setSelectedAcademicYear: (id) => set({ selectedAcademicYearId: id }),
    }),
    { name: 'prashant-auth' }
  )
)

