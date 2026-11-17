/**
 * @file        appearanceStore.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.store
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-17
 * @updated     2026-11-17
 *
 * @description Stores the browser-local appearance preference and applies the resolved theme to the document root.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AppearancePreference = 'light' | 'dark' | 'system'

interface AppearanceState {
  preference: AppearancePreference
  setPreference: (preference: AppearancePreference) => void
}

const APPEARANCE_STORAGE_KEY = 'pratham-appearance'

export function isAppearancePreference(value: unknown): value is AppearancePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function resolveAppearance(preference: AppearancePreference, prefersDark: boolean): 'light' | 'dark' {
  if (preference === 'system') return prefersDark ? 'dark' : 'light'
  return preference
}

export function applyAppearance(preference: AppearancePreference, prefersDark?: boolean): void {
  if (typeof document === 'undefined') return

  const systemPrefersDark =
    prefersDark ??
    (typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  const resolved = resolveAppearance(preference, systemPrefersDark)
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.dataset.theme = resolved
}

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      preference: 'light',
      setPreference: (preference) => {
        set({ preference })
        applyAppearance(preference)
      },
    }),
    {
      name: APPEARANCE_STORAGE_KEY,
      version: 1,
      partialize: (state) => ({ preference: state.preference }),
      merge: (persistedState, currentState) => {
        const preference = (persistedState as { preference?: unknown } | null)?.preference
        return {
          ...currentState,
          preference: isAppearancePreference(preference) ? preference : 'light',
        }
      },
    }
  )
)

let systemPreferenceListenerAttached = false

export function initializeAppearance(): void {
  if (typeof window === 'undefined') return

  const mediaQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null

  if (mediaQuery && !systemPreferenceListenerAttached) {
    mediaQuery.addEventListener('change', (event) => {
      if (useAppearanceStore.getState().preference === 'system') {
        applyAppearance('system', event.matches)
      }
    })
    systemPreferenceListenerAttached = true
  }

  applyAppearance(useAppearanceStore.getState().preference, mediaQuery?.matches)
}
