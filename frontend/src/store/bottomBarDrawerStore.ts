/**
 * @file        bottomBarDrawerStore.ts
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
 * @created     2026-11-16
 * @updated     2026-11-16
 *
 * @description Global Zustand store managing the state of the bottom-bar extreme right Quick Drawer (Chats & EduBoard).
 */

import { create } from 'zustand'

export type BottomDrawerTab = 'chats' | 'boards' | null

interface BottomBarDrawerState {
  activeDrawer: BottomDrawerTab
  unreadDoubtsCount: number
  openDrawer: (tab: 'chats' | 'boards') => void
  closeDrawer: () => void
  toggleDrawer: (tab: 'chats' | 'boards') => void
  setUnreadDoubtsCount: (count: number) => void
}

export const useBottomBarDrawerStore = create<BottomBarDrawerState>((set) => ({
  activeDrawer: null,
  unreadDoubtsCount: 0,
  openDrawer: (tab) => set({ activeDrawer: tab }),
  closeDrawer: () => set({ activeDrawer: null }),
  toggleDrawer: (tab) =>
    set((state) => ({
      activeDrawer: state.activeDrawer === tab ? null : tab,
    })),
  setUnreadDoubtsCount: (count) => set({ unreadDoubtsCount: count }),
}))
