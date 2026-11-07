/**
 * @file        environmentStore.ts
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
 * @description Zustand state store managing active application data environment (PRODUCTION vs TRAINING) and session context.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DataEnvironment = 'PRODUCTION' | 'TRAINING'

interface EnvironmentState {
  dataEnvironment: DataEnvironment
  isTrainingMode: boolean
  activeDatasetVersion: string
  setEnvironment: (env: DataEnvironment) => void
  enterTrainingMode: () => void
  exitTrainingMode: () => void
  toggleEnvironment: () => void
}

export const useEnvironmentStore = create<EnvironmentState>()(
  persist(
    (set, get) => ({
      dataEnvironment: 'PRODUCTION',
      isTrainingMode: false,
      activeDatasetVersion: 'CRM-STAFF-TRAINING-V1',

      setEnvironment: (env: DataEnvironment) =>
        set({
          dataEnvironment: env,
          isTrainingMode: env === 'TRAINING',
        }),

      enterTrainingMode: () =>
        set({
          dataEnvironment: 'TRAINING',
          isTrainingMode: true,
        }),

      exitTrainingMode: () =>
        set({
          dataEnvironment: 'PRODUCTION',
          isTrainingMode: false,
        }),

      toggleEnvironment: () => {
        const nextEnv: DataEnvironment =
          get().dataEnvironment === 'PRODUCTION' ? 'TRAINING' : 'PRODUCTION'
        set({
          dataEnvironment: nextEnv,
          isTrainingMode: nextEnv === 'TRAINING',
        })
      },
    }),
    {
      name: 'prashant-environment',
    }
  )
)

// Auto-reset environment to PRODUCTION on user logout
if (typeof window !== 'undefined') {
  window.addEventListener('prashant-logout', () => {
    useEnvironmentStore.getState().exitTrainingMode()
  })
}
