/**
 * @file        navigationStore.ts
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
 * @created     2026-11-10
 * @updated     2026-11-10
 *
 * @description Zustand state store managing user-defined menus, navigation modes, adaptive suggestions, and search palettes.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  NavigationMode,
  CustomNavGroup,
  NavigationPolicy,
  NavigationSuggestion,
  RecentVisitItem,
} from '../types'
import { navigationApi } from '../api/endpoints'

interface NavigationState {
  navigationMode: NavigationMode
  pinnedItems: string[]
  hiddenItems: string[]
  customGroups: CustomNavGroup[]
  itemOrder: string[]
  dismissedSuggestions: string[]
  recentVisits: RecentVisitItem[]
  suggestions: NavigationSuggestion[]
  institutionPolicy: NavigationPolicy
  roleDefaults: string[]
  isCustomizerOpen: boolean
  isSearchOpen: boolean
  activeHybridTab: 'my_menu' | 'all'
  isSaving: boolean
  isLoadingConfig: boolean
  hasUnsavedChanges: boolean

  // Modal actions
  openCustomizer: (initialTab?: string) => void
  closeCustomizer: () => void
  openSearch: () => void
  closeSearch: () => void
  setActiveHybridTab: (tab: 'my_menu' | 'all') => void

  // Preference mutations
  setNavigationMode: (mode: NavigationMode) => void
  togglePinItem: (id: string) => void
  pinItem: (id: string) => void
  unpinItem: (id: string) => void
  toggleHideItem: (id: string) => void
  hideItem: (id: string) => void
  unhideItem: (id: string) => void
  reorderPinnedItems: (newOrder: string[]) => void
  addCustomGroup: (name: string) => void
  renameCustomGroup: (id: string, name: string) => void
  deleteCustomGroup: (id: string) => void
  addItemToGroup: (groupId: string, itemId: string) => void
  removeItemFromGroup: (groupId: string, itemId: string) => void

  // Telemetry & Suggestions
  dismissSuggestion: (id: string, institutionId?: number) => Promise<void>
  acceptSuggestion: (suggestion: NavigationSuggestion, institutionId?: number) => Promise<void>
  recordVisit: (
    item: { module_key: string; route_path: string; label?: string },
    institutionId?: number
  ) => void

  // Backend Sync
  fetchConfig: (institutionId?: number) => Promise<void>
  savePreferences: (institutionId?: number) => Promise<void>
  resetToDefaults: (institutionId?: number) => Promise<void>
}

const DEFAULT_POLICY: NavigationPolicy = {
  enable_user_customization: true,
  default_navigation_mode: 'standard',
  allow_my_menu_only: true,
  allow_reordering: true,
  allow_hiding: true,
  enable_usage_recommendations: true,
  usage_analysis_period_days: 30,
  role_default_menus: {
    admin: ['dashboard', 'fees', 'students', 'crm', 'academic', 'teachers', 'attendance', 'reports', 'settings'],
  },
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set, get) => ({
      navigationMode: 'standard',
      pinnedItems: ['dashboard', 'fees', 'students'],
      hiddenItems: [],
      customGroups: [],
      itemOrder: [],
      dismissedSuggestions: [],
      recentVisits: [],
      suggestions: [],
      institutionPolicy: DEFAULT_POLICY,
      roleDefaults: ['dashboard', 'fees', 'students'],
      isCustomizerOpen: false,
      isSearchOpen: false,
      activeHybridTab: 'my_menu',
      isSaving: false,
      isLoadingConfig: false,
      hasUnsavedChanges: false,

      openCustomizer: () => set({ isCustomizerOpen: true }),
      closeCustomizer: () => set({ isCustomizerOpen: false, hasUnsavedChanges: false }),
      openSearch: () => set({ isSearchOpen: true }),
      closeSearch: () => set({ isSearchOpen: false }),
      setActiveHybridTab: (tab) => set({ activeHybridTab: tab }),

      setNavigationMode: (mode) =>
        set((state) => {
          // If institution blocks my_menu_only, force hybrid
          const effective =
            mode === 'my_menu_only' && !state.institutionPolicy.allow_my_menu_only ? 'hybrid' : mode
          return { navigationMode: effective, hasUnsavedChanges: true }
        }),

      togglePinItem: (id) =>
        set((state) => {
          const isPinned = state.pinnedItems.includes(id)
          const newPinned = isPinned
            ? state.pinnedItems.filter((item) => item !== id)
            : [...state.pinnedItems, id]
          return { pinnedItems: newPinned, hasUnsavedChanges: true }
        }),

      pinItem: (id) =>
        set((state) => {
          if (state.pinnedItems.includes(id)) return state
          return { pinnedItems: [...state.pinnedItems, id], hasUnsavedChanges: true }
        }),

      unpinItem: (id) =>
        set((state) => ({
          pinnedItems: state.pinnedItems.filter((item) => item !== id),
          hasUnsavedChanges: true,
        })),

      toggleHideItem: (id) =>
        set((state) => {
          const isHidden = state.hiddenItems.includes(id)
          const newHidden = isHidden
            ? state.hiddenItems.filter((item) => item !== id)
            : [...state.hiddenItems, id]
          return { hiddenItems: newHidden, hasUnsavedChanges: true }
        }),

      hideItem: (id) =>
        set((state) => {
          if (state.hiddenItems.includes(id)) return state
          return { hiddenItems: [...state.hiddenItems, id], hasUnsavedChanges: true }
        }),

      unhideItem: (id) =>
        set((state) => ({
          hiddenItems: state.hiddenItems.filter((item) => item !== id),
          hasUnsavedChanges: true,
        })),

      reorderPinnedItems: (newOrder) =>
        set({ pinnedItems: newOrder, itemOrder: newOrder, hasUnsavedChanges: true }),

      addCustomGroup: (name) =>
        set((state) => {
          const trimmed = name.trim()
          if (!trimmed) return state
          const newGroup: CustomNavGroup = {
            id: `grp_${Date.now()}`,
            name: trimmed,
            items: [],
          }
          return { customGroups: [...state.customGroups, newGroup], hasUnsavedChanges: true }
        }),

      renameCustomGroup: (id, name) =>
        set((state) => ({
          customGroups: state.customGroups.map((g) => (g.id === id ? { ...g, name: name.trim() } : g)),
          hasUnsavedChanges: true,
        })),

      deleteCustomGroup: (id) =>
        set((state) => ({
          customGroups: state.customGroups.filter((g) => g.id !== id),
          hasUnsavedChanges: true,
        })),

      addItemToGroup: (groupId, itemId) =>
        set((state) => ({
          customGroups: state.customGroups.map((g) => {
            if (g.id !== groupId) return g
            if (g.items.includes(itemId)) return g
            return { ...g, items: [...g.items, itemId] }
          }),
          hasUnsavedChanges: true,
        })),

      removeItemFromGroup: (groupId, itemId) =>
        set((state) => ({
          customGroups: state.customGroups.map((g) => {
            if (g.id !== groupId) return g
            return { ...g, items: g.items.filter((it) => it !== itemId) }
          }),
          hasUnsavedChanges: true,
        })),

      dismissSuggestion: async (id, institutionId) => {
        set((state) => ({
          dismissedSuggestions: [...state.dismissedSuggestions, id],
          suggestions: state.suggestions.filter((s) => s.id !== id),
        }))
        try {
          await navigationApi.dismissSuggestion(id, institutionId)
        } catch (e) {
          console.error('Failed to dismiss suggestion in backend:', e)
        }
      },

      acceptSuggestion: async (suggestion, institutionId) => {
        if (suggestion.action_type === 'pin') {
          get().pinItem(suggestion.module_key)
        } else if (suggestion.action_type === 'unpin') {
          get().unpinItem(suggestion.module_key)
        }
        await get().dismissSuggestion(suggestion.id, institutionId)
        await get().savePreferences(institutionId)
      },

      recordVisit: (item, institutionId) => {
        set((state) => {
          const filtered = state.recentVisits.filter((v) => v.route_path !== item.route_path)
          const newVisit: RecentVisitItem = {
            module_key: item.module_key,
            route_path: item.route_path,
            label: item.label || item.module_key.toUpperCase(),
            last_accessed: new Date().toISOString(),
          }
          return { recentVisits: [newVisit, ...filtered].slice(0, 8) }
        })

        // Send to backend (debounced)
        navigationApi.trackActivity(item, institutionId).catch(() => {})
      },

      fetchConfig: async (institutionId) => {
        set({ isLoadingConfig: true })
        try {
          const res = await navigationApi.getConfig(institutionId)
          const data = res.data
          const pref = data.user_preferences

          set({
            institutionPolicy: data.institution_policy,
            navigationMode: pref.navigation_mode || 'standard',
            pinnedItems: pref.pinned_items || data.role_defaults || [],
            hiddenItems: pref.hidden_items || [],
            customGroups: pref.custom_groups || [],
            itemOrder: pref.item_order || [],
            dismissedSuggestions: pref.dismissed_suggestions || [],
            roleDefaults: data.role_defaults || [],
            isLoadingConfig: false,
            hasUnsavedChanges: false,
          })

          // Also fetch suggestions
          navigationApi.getSuggestions(institutionId).then((sugRes) => {
            if (sugRes?.data?.suggestions) {
              set({ suggestions: sugRes.data.suggestions })
            }
          }).catch(() => {})

          // Also fetch recent visits
          navigationApi.getRecent(8, institutionId).then((recRes) => {
            if (recRes?.data?.recent_visits) {
              set({ recentVisits: recRes.data.recent_visits })
            }
          }).catch(() => {})
        } catch (e) {
          console.error('Failed to fetch navigation configuration:', e)
          set({ isLoadingConfig: false })
        }
      },

      savePreferences: async (institutionId) => {
        set({ isSaving: true })
        const state = get()
        try {
          const res = await navigationApi.updatePreferences(
            {
              navigation_mode: state.navigationMode,
              pinned_items: state.pinnedItems,
              hidden_items: state.hiddenItems,
              custom_groups: state.customGroups,
              item_order: state.itemOrder,
            },
            institutionId
          )
          const updatedPref = res.data.user_preferences
          set({
            isSaving: false,
            hasUnsavedChanges: false,
            navigationMode: updatedPref.navigation_mode,
            pinnedItems: updatedPref.pinned_items,
            hiddenItems: updatedPref.hidden_items,
            customGroups: updatedPref.custom_groups,
          })
        } catch (e) {
          console.error('Failed to save navigation preferences:', e)
          set({ isSaving: false })
          throw e
        }
      },

      resetToDefaults: async (institutionId) => {
        set({ isSaving: true })
        try {
          const res = await navigationApi.resetPreferences(institutionId)
          const data = res.data
          const pref = data.user_preferences
          set({
            isSaving: false,
            hasUnsavedChanges: false,
            navigationMode: pref.navigation_mode || 'standard',
            pinnedItems: pref.pinned_items || data.role_defaults || [],
            hiddenItems: [],
            customGroups: [],
            itemOrder: [],
          })
        } catch (e) {
          console.error('Failed to reset preferences to defaults:', e)
          set({ isSaving: false })
          throw e
        }
      },
    }),
    {
      name: 'prashant_navigation_preferences',
      partialize: (state) => ({
        navigationMode: state.navigationMode,
        pinnedItems: state.pinnedItems,
        hiddenItems: state.hiddenItems,
        customGroups: state.customGroups,
        itemOrder: state.itemOrder,
        dismissedSuggestions: state.dismissedSuggestions,
        recentVisits: state.recentVisits,
        activeHybridTab: state.activeHybridTab,
      }),
    }
  )
)
