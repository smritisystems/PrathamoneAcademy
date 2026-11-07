/**
 * @file        sidebarStore.ts
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
 * @created     2026-11-04
 * @updated     2026-11-07
 *
 * @description Zustand state store managing responsive sidebar layout state, collapsed rails, and mobile drawer.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DesktopSidebarState = 'expanded' | 'collapsed' | 'hidden'

interface SidebarStore {
  desktopState: DesktopSidebarState
  mobileOpen: boolean
  academicOpen: boolean
  crmOpen: boolean
  setDesktopState: (state: DesktopSidebarState) => void
  toggleCollapse: () => void
  toggleHidden: () => void
  expandSidebar: () => void
  setMobileOpen: (open: boolean) => void
  toggleMobileOpen: () => void
  closeMobile: () => void
  setAcademicOpen: (open: boolean | ((prev: boolean) => boolean)) => void
  toggleAcademicOpen: () => void
  setCrmOpen: (open: boolean | ((prev: boolean) => boolean)) => void
  toggleCrmOpen: () => void
}

const getInitialDesktopState = (): DesktopSidebarState => {
  if (typeof window === 'undefined') return 'expanded'
  try {
    const saved = localStorage.getItem('prashant_sidebar_state')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed?.state?.desktopState) {
        return parsed.state.desktopState
      }
    }
    // Tablet default: collapsed if screen width is between 768px and 1024px
    if (window.innerWidth >= 768 && window.innerWidth < 1024) {
      return 'collapsed'
    }
  } catch (e) {
    // Ignore storage parse issues
  }
  return 'expanded'
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set, get) => ({
      desktopState: getInitialDesktopState(),
      mobileOpen: false,
      academicOpen: true,
      crmOpen: true,

      setDesktopState: (desktopState) => set({ desktopState }),

      toggleCollapse: () =>
        set((state) => ({
          desktopState: state.desktopState === 'expanded' ? 'collapsed' : 'expanded',
        })),

      toggleHidden: () =>
        set((state) => ({
          desktopState: state.desktopState === 'hidden' ? 'expanded' : 'hidden',
        })),

      expandSidebar: () => set({ desktopState: 'expanded' }),

      setMobileOpen: (mobileOpen) => set({ mobileOpen }),

      toggleMobileOpen: () => set((state) => ({ mobileOpen: !state.mobileOpen })),

      closeMobile: () => set({ mobileOpen: false }),

      setAcademicOpen: (updater) =>
        set((state) => ({
          academicOpen: typeof updater === 'function' ? updater(state.academicOpen) : updater,
        })),

      toggleAcademicOpen: () =>
        set((state) => ({ academicOpen: !state.academicOpen })),

      setCrmOpen: (updater) =>
        set((state) => ({
          crmOpen: typeof updater === 'function' ? updater(state.crmOpen) : updater,
        })),

      toggleCrmOpen: () =>
        set((state) => ({ crmOpen: !state.crmOpen })),
    }),
    {
      name: 'prashant_sidebar_state',
      partialize: (state) => ({
        desktopState: state.desktopState,
        academicOpen: state.academicOpen,
        crmOpen: state.crmOpen,
      }),
    }
  )
)

