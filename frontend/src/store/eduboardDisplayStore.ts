/**
 * @file        eduboardDisplayStore.ts
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
 * @created     2026-11-12
 * @updated     2026-11-12
 *
 * @description Zustand store coordinating EduBoard Display Modes (Standard / Focus / Fullscreen), panel visibility, collapsible/dockable toolbar states, active tool retention across mode switches, and Layout chrome visibility.
 */

import { create } from 'zustand'
import type {
  EduBoardBackgroundStyle,
  EduBoardDisplayPrefsValues,
  EduBoardToolbarPosition,
  EduBoardToolbarState,
  EduBoardTool,
  EduBoardWorkspaceMode,
} from '../types'

export interface EduBoardDisplayState {
  workspaceMode: EduBoardWorkspaceMode
  pagesPanelOpen: boolean
  savedBoardsPanelOpen: boolean
  hideAppHeader: boolean
  hideStatusBar: boolean
  toolbarState: EduBoardToolbarState
  toolbarPosition: EduBoardToolbarPosition
  floatingPos: { x: number; y: number }
  preferredAppearance: EduBoardBackgroundStyle

  // Preserved across workspace mode switches
  activeTool: EduBoardTool
  activeColor: string
  strokeSize: number
  isPanMode: boolean

  // Temporary drawer toggles in Focus / Full-Screen mode
  focusDrawer: 'none' | 'pages' | 'boards'

  // True when an explicit browser fullscreen request failed or was blocked
  isViewportFullscreenFallback: boolean

  applyResolvedPreferences: (prefs: EduBoardDisplayPrefsValues) => void
  setWorkspaceMode: (mode: EduBoardWorkspaceMode) => void
  setPagesPanelOpen: (open: boolean) => void
  setSavedBoardsPanelOpen: (open: boolean) => void
  setHideAppHeader: (hide: boolean) => void
  setHideStatusBar: (hide: boolean) => void
  setToolbarState: (state: EduBoardToolbarState) => void
  setToolbarPosition: (pos: EduBoardToolbarPosition) => void
  setFloatingPos: (pos: { x: number; y: number }) => void
  setPreferredAppearance: (bg: EduBoardBackgroundStyle) => void
  setActiveTool: (tool: EduBoardTool) => void
  setActiveColor: (color: string) => void
  setStrokeSize: (size: number) => void
  setIsPanMode: (pan: boolean) => void
  setFocusDrawer: (drawer: 'none' | 'pages' | 'boards') => void
  setViewportFullscreenFallback: (fallback: boolean) => void
  resetTransientChrome: () => void
}

export const useEduBoardDisplayStore = create<EduBoardDisplayState>((set) => ({
  workspaceMode: 'standard',
  pagesPanelOpen: true,
  savedBoardsPanelOpen: true,
  hideAppHeader: false,
  hideStatusBar: false,
  toolbarState: 'expanded',
  toolbarPosition: 'top',
  floatingPos: { x: 24, y: 24 },
  preferredAppearance: 'white',

  activeTool: 'pen',
  activeColor: '#111827',
  strokeSize: 3,
  isPanMode: false,

  focusDrawer: 'none',
  isViewportFullscreenFallback: false,

  applyResolvedPreferences: (prefs) =>
    set((prev) => ({
      workspaceMode: prefs.default_workspace_mode || 'standard',
      preferredAppearance: prefs.default_board_appearance || 'white',
      toolbarState: prefs.toolbar_state || 'expanded',
      toolbarPosition: prefs.toolbar_position || 'top',
      pagesPanelOpen: prefs.pages_panel_open ?? true,
      savedBoardsPanelOpen: prefs.saved_boards_panel_open ?? true,
      hideAppHeader: prefs.hide_app_header ?? false,
      hideStatusBar: prefs.hide_status_bar ?? false,
      // Keep activeTool / activeColor untouched if already actively drawing
      activeTool: prev.activeTool,
      activeColor: prev.activeColor,
    })),

  setWorkspaceMode: (workspaceMode) =>
    set((prev) => ({
      workspaceMode,
      focusDrawer: 'none',
      isViewportFullscreenFallback:
        workspaceMode === 'fullscreen' ? prev.isViewportFullscreenFallback : false,
      // Focus defaults to compact toolbar automatically unless hidden
      toolbarState:
        workspaceMode === 'focus' && prev.toolbarState === 'expanded'
          ? 'compact'
          : workspaceMode === 'standard' && prev.toolbarState === 'compact'
            ? 'expanded'
            : prev.toolbarState,
    })),

  setPagesPanelOpen: (pagesPanelOpen) => set({ pagesPanelOpen }),
  setSavedBoardsPanelOpen: (savedBoardsPanelOpen) => set({ savedBoardsPanelOpen }),
  setHideAppHeader: (hideAppHeader) => set({ hideAppHeader }),
  setHideStatusBar: (hideStatusBar) => set({ hideStatusBar }),
  setToolbarState: (toolbarState) => set({ toolbarState }),
  setToolbarPosition: (toolbarPosition) => set({ toolbarPosition }),
  setFloatingPos: (floatingPos) => set({ floatingPos }),
  setPreferredAppearance: (preferredAppearance) => set({ preferredAppearance }),
  setActiveTool: (activeTool) => set({ activeTool, isPanMode: false }),
  setActiveColor: (activeColor) => set({ activeColor }),
  setStrokeSize: (strokeSize) => set({ strokeSize }),
  setIsPanMode: (isPanMode) => set({ isPanMode }),
  setFocusDrawer: (focusDrawer) => set({ focusDrawer }),
  setViewportFullscreenFallback: (isViewportFullscreenFallback) => set({ isViewportFullscreenFallback }),
  resetTransientChrome: () =>
    set({
      workspaceMode: 'standard',
      focusDrawer: 'none',
      isViewportFullscreenFallback: false,
    }),
}))

