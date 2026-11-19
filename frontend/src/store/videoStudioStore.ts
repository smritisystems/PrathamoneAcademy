/**
 * @file        videoStudioStore.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.store
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.141.0
 * @created     2026-11-19
 * @updated     2026-11-19
 *
 * @description Master Zustand state store managing PrathamOne Video Studio projects, timeline cursor, active scene, undo/redo history, and playback controls.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  DirectorPresetId,
  VideoSceneDefinition,
  VideoStudioProject,
} from '../types/videoStudio'
import { generateStoryboardForPreset } from '../config/videoStudioDirector'
import { VERIFIED_ASSET_VAULT } from '../config/videoStudioAssets'

interface ProjectSummary {
  id: string
  name: string
  updatedAt: string
  duration: number
  scenesCount: number
}

interface VideoStudioState {
  currentProject: VideoStudioProject
  activeSceneId: string | null
  currentTime: number // in seconds
  isPlaying: boolean
  timelineZoom: number // 1 = default, 0.5 to 2.5
  viewMode: 'standard' | 'theater'
  savedProjects: ProjectSummary[]

  // Undo / Redo history
  undoStack: VideoStudioProject[]
  redoStack: VideoStudioProject[]

  // Actions
  loadProject: (project: VideoStudioProject) => void
  newProjectFromPreset: (presetId: DirectorPresetId, customTitle?: string) => void
  saveCurrentProject: () => void
  duplicateProject: (id: string) => void
  deleteProject: (id: string) => void

  updateProjectDetails: (updates: Partial<VideoStudioProject>) => void
  updateProjectAudio: (updates: Partial<VideoStudioProject['audio']>) => void
  updateProjectTheme: (updates: Partial<VideoStudioProject['theme']>) => void

  setActiveSceneId: (id: string | null) => void
  updateScene: (sceneId: string, updates: Partial<VideoSceneDefinition>) => void
  reorderScenes: (fromIndex: number, toIndex: number) => void
  addScene: (afterSceneId?: string, assetId?: string) => void
  duplicateScene: (sceneId: string) => void
  deleteScene: (sceneId: string) => void

  setCurrentTime: (time: number) => void
  stepTime: (deltaSeconds: number) => void
  setIsPlaying: (playing: boolean) => void
  togglePlayPause: () => void
  setTimelineZoom: (zoom: number) => void
  setViewMode: (mode: 'standard' | 'theater') => void

  undo: () => void
  redo: () => void

  exportProjectJson: () => string
  importProjectJson: (jsonStr: string) => boolean
}

// Initial baseline project: 120s master product video
const defaultInitialProject = generateStoryboardForPreset('master-120')

export const useVideoStudioStore = create<VideoStudioState>()(
  persist(
    (set, get) => ({
      currentProject: defaultInitialProject,
      activeSceneId: defaultInitialProject.scenes[0]?.id || null,
      currentTime: 0,
      isPlaying: false,
      timelineZoom: 1.0,
      viewMode: 'standard',
      savedProjects: [
        {
          id: defaultInitialProject.id,
          name: defaultInitialProject.name,
          updatedAt: defaultInitialProject.updatedAt,
          duration: defaultInitialProject.targetDuration,
          scenesCount: defaultInitialProject.scenes.length,
        },
      ],
      undoStack: [],
      redoStack: [],

      loadProject: (project: VideoStudioProject) => {
        set({
          currentProject: project,
          activeSceneId: project.scenes[0]?.id || null,
          currentTime: 0,
          isPlaying: false,
          undoStack: [],
          redoStack: [],
        })
      },

      newProjectFromPreset: (presetId: DirectorPresetId, customTitle?: string) => {
        const newProj = generateStoryboardForPreset(presetId, { customTitle })
        set((state) => ({
          currentProject: newProj,
          activeSceneId: newProj.scenes[0]?.id || null,
          currentTime: 0,
          isPlaying: false,
          undoStack: [],
          redoStack: [],
          savedProjects: [
            {
              id: newProj.id,
              name: newProj.name,
              updatedAt: newProj.updatedAt,
              duration: newProj.targetDuration,
              scenesCount: newProj.scenes.length,
            },
            ...state.savedProjects.filter((p) => p.id !== newProj.id),
          ],
        }))
      },

      saveCurrentProject: () => {
        const current = get().currentProject
        const updated = {
          ...current,
          updatedAt: new Date().toISOString(),
        }
        set((state) => ({
          currentProject: updated,
          savedProjects: [
            {
              id: updated.id,
              name: updated.name,
              updatedAt: updated.updatedAt,
              duration: updated.scenes.reduce((sum, s) => sum + s.duration, 0),
              scenesCount: updated.scenes.length,
            },
            ...state.savedProjects.filter((p) => p.id !== updated.id),
          ],
        }))
      },

      duplicateProject: (id: string) => {
        const current = get().currentProject
        const clone: VideoStudioProject = {
          ...current,
          id: `proj-${Date.now()}`,
          name: `${current.name} (Copy)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((state) => ({
          currentProject: clone,
          activeSceneId: clone.scenes[0]?.id || null,
          savedProjects: [
            {
              id: clone.id,
              name: clone.name,
              updatedAt: clone.updatedAt,
              duration: clone.scenes.reduce((sum, s) => sum + s.duration, 0),
              scenesCount: clone.scenes.length,
            },
            ...state.savedProjects,
          ],
        }))
      },

      deleteProject: (id: string) => {
        const { savedProjects, currentProject } = get()
        const remaining = savedProjects.filter((p) => p.id !== id)
        if (currentProject.id === id) {
          const fallback = generateStoryboardForPreset('master-120')
          set({
            currentProject: fallback,
            activeSceneId: fallback.scenes[0]?.id || null,
            currentTime: 0,
            isPlaying: false,
            savedProjects: remaining.length > 0 ? remaining : [
              {
                id: fallback.id,
                name: fallback.name,
                updatedAt: fallback.updatedAt,
                duration: fallback.targetDuration,
                scenesCount: fallback.scenes.length,
              },
            ],
          })
        } else {
          set({ savedProjects: remaining })
        }
      },

      updateProjectDetails: (updates: Partial<VideoStudioProject>) => {
        const current = get().currentProject
        const undo = get().undoStack
        set({
          undoStack: [...undo.slice(-20), current],
          redoStack: [],
          currentProject: {
            ...current,
            ...updates,
            updatedAt: new Date().toISOString(),
          },
        })
      },

      updateProjectAudio: (updates: Partial<VideoStudioProject['audio']>) => {
        const current = get().currentProject
        set({
          currentProject: {
            ...current,
            audio: { ...current.audio, ...updates },
            updatedAt: new Date().toISOString(),
          },
        })
      },

      updateProjectTheme: (updates: Partial<VideoStudioProject['theme']>) => {
        const current = get().currentProject
        set({
          currentProject: {
            ...current,
            theme: { ...current.theme, ...updates },
            updatedAt: new Date().toISOString(),
          },
        })
      },

      setActiveSceneId: (id: string | null) => {
        set({ activeSceneId: id })
      },

      updateScene: (sceneId: string, updates: Partial<VideoSceneDefinition>) => {
        const current = get().currentProject
        const undo = get().undoStack
        const newScenes = current.scenes.map((s) =>
          s.id === sceneId ? { ...s, ...updates } : s
        )
        const totalDuration = newScenes.reduce((sum, sc) => sum + sc.duration, 0)
        set({
          undoStack: [...undo.slice(-20), current],
          redoStack: [],
          currentProject: {
            ...current,
            targetDuration: totalDuration,
            scenes: newScenes,
            updatedAt: new Date().toISOString(),
          },
        })
      },

      reorderScenes: (fromIndex: number, toIndex: number) => {
        const current = get().currentProject
        const undo = get().undoStack
        const items = [...current.scenes]
        const [moved] = items.splice(fromIndex, 1)
        items.splice(toIndex, 0, moved)
        const reordered = items.map((sc, idx) => ({ ...sc, order: idx + 1 }))
        set({
          undoStack: [...undo.slice(-20), current],
          redoStack: [],
          currentProject: {
            ...current,
            scenes: reordered,
            updatedAt: new Date().toISOString(),
          },
        })
      },

      addScene: (afterSceneId?: string, assetId?: string) => {
        const current = get().currentProject
        const undo = get().undoStack
        const asset =
          VERIFIED_ASSET_VAULT.find((a) => a.id === assetId) || VERIFIED_ASSET_VAULT[2]

        const newScene: VideoSceneDefinition = {
          id: `sc-${Date.now()}`,
          order: current.scenes.length + 1,
          title: asset.defaultHeadline,
          subtitle: asset.defaultSubtitle,
          duration: asset.recommendedDuration || 10.0,
          transition: 'fade',
          transitionDuration: 0.5,
          media: {
            type: 'image',
            url: asset.url,
            fit: 'mockup',
            mockupType: 'display',
            backgroundColor: '#090D16',
          },
          motion: {
            type: 'ken-burns',
            startScale: 1.0,
            endScale: 1.15,
            startXPercent: 50,
            startYPercent: 40,
            endXPercent: 40,
            endYPercent: 35,
          },
          callouts: asset.suggestedCallouts
            ? asset.suggestedCallouts.map((c, i) => ({
                id: `c-new-${i}`,
                text: c.text,
                xPercent: c.x,
                yPercent: c.y,
                delaySeconds: 1.0 + i * 1.5,
                badgeColor: i === 0 ? 'orange' : 'navy',
              }))
            : [],
          cursor: {
            show: true,
            startXPercent: 50,
            startYPercent: 60,
            clickXPercent: 40,
            clickYPercent: 40,
            clickTimeSeconds: 2.5,
            clickLabel: 'Explore Feature',
          },
          narration: {
            script: asset.defaultScript,
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0,
          },
          captions: {
            show: true,
            style: 'bottom-pill',
          },
        }

        let newScenes: VideoSceneDefinition[]
        if (afterSceneId) {
          const idx = current.scenes.findIndex((s) => s.id === afterSceneId)
          if (idx !== -1) {
            newScenes = [
              ...current.scenes.slice(0, idx + 1),
              newScene,
              ...current.scenes.slice(idx + 1),
            ]
          } else {
            newScenes = [...current.scenes, newScene]
          }
        } else {
          newScenes = [...current.scenes, newScene]
        }

        const reordered = newScenes.map((sc, i) => ({ ...sc, order: i + 1 }))
        const totalDuration = reordered.reduce((sum, sc) => sum + sc.duration, 0)

        set({
          undoStack: [...undo.slice(-20), current],
          redoStack: [],
          activeSceneId: newScene.id,
          currentProject: {
            ...current,
            targetDuration: totalDuration,
            scenes: reordered,
            updatedAt: new Date().toISOString(),
          },
        })
      },

      duplicateScene: (sceneId: string) => {
        const current = get().currentProject
        const undo = get().undoStack
        const idx = current.scenes.findIndex((s) => s.id === sceneId)
        if (idx === -1) return

        const target = current.scenes[idx]
        const clone: VideoSceneDefinition = {
          ...target,
          id: `sc-dup-${Date.now()}`,
          title: `${target.title} (Copy)`,
        }

        const newScenes = [
          ...current.scenes.slice(0, idx + 1),
          clone,
          ...current.scenes.slice(idx + 1),
        ].map((sc, i) => ({ ...sc, order: i + 1 }))

        const totalDuration = newScenes.reduce((sum, sc) => sum + sc.duration, 0)

        set({
          undoStack: [...undo.slice(-20), current],
          redoStack: [],
          activeSceneId: clone.id,
          currentProject: {
            ...current,
            targetDuration: totalDuration,
            scenes: newScenes,
            updatedAt: new Date().toISOString(),
          },
        })
      },

      deleteScene: (sceneId: string) => {
        const current = get().currentProject
        if (current.scenes.length <= 1) return // Keep at least one scene

        const undo = get().undoStack
        const remaining = current.scenes
          .filter((s) => s.id !== sceneId)
          .map((sc, i) => ({ ...sc, order: i + 1 }))
        const totalDuration = remaining.reduce((sum, sc) => sum + sc.duration, 0)

        set({
          undoStack: [...undo.slice(-20), current],
          redoStack: [],
          activeSceneId: remaining[0]?.id || null,
          currentProject: {
            ...current,
            targetDuration: totalDuration,
            scenes: remaining,
            updatedAt: new Date().toISOString(),
          },
        })
      },

      setCurrentTime: (time: number) => {
        const current = get().currentProject
        const totalDuration = current.scenes.reduce((sum, sc) => sum + sc.duration, 0)
        const boundedTime = Math.max(0, Math.min(time, totalDuration))

        // Determine which scene is active based on time
        let accumulated = 0
        let foundSceneId = current.scenes[0]?.id || null
        for (const sc of current.scenes) {
          if (boundedTime >= accumulated && boundedTime <= accumulated + sc.duration) {
            foundSceneId = sc.id
            break
          }
          accumulated += sc.duration
        }

        set({
          currentTime: boundedTime,
          activeSceneId: foundSceneId,
        })
      },

      stepTime: (deltaSeconds: number) => {
        const { currentTime, setCurrentTime } = get()
        setCurrentTime(currentTime + deltaSeconds)
      },

      setIsPlaying: (playing: boolean) => {
        set({ isPlaying: playing })
      },

      togglePlayPause: () => {
        set((state) => ({ isPlaying: !state.isPlaying }))
      },

      setTimelineZoom: (zoom: number) => {
        set({ timelineZoom: Math.max(0.5, Math.min(zoom, 2.5)) })
      },

      setViewMode: (mode: 'standard' | 'theater') => {
        set({ viewMode: mode })
      },

      undo: () => {
        const { undoStack, redoStack, currentProject } = get()
        if (undoStack.length === 0) return
        const previous = undoStack[undoStack.length - 1]
        set({
          undoStack: undoStack.slice(0, -1),
          redoStack: [...redoStack, currentProject],
          currentProject: previous,
          activeSceneId: previous.scenes[0]?.id || null,
        })
      },

      redo: () => {
        const { undoStack, redoStack, currentProject } = get()
        if (redoStack.length === 0) return
        const next = redoStack[redoStack.length - 1]
        set({
          undoStack: [...undoStack, currentProject],
          redoStack: redoStack.slice(0, -1),
          currentProject: next,
          activeSceneId: next.scenes[0]?.id || null,
        })
      },

      exportProjectJson: () => {
        return JSON.stringify(get().currentProject, null, 2)
      },

      importProjectJson: (jsonStr: string) => {
        try {
          const parsed = JSON.parse(jsonStr) as VideoStudioProject
          if (parsed && Array.isArray(parsed.scenes) && parsed.id) {
            get().loadProject(parsed)
            return true
          }
          return false
        } catch {
          return false
        }
      },
    }),
    {
      name: 'prathamone-video-studio-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentProject: state.currentProject,
        savedProjects: state.savedProjects,
      }),
    }
  )
)
