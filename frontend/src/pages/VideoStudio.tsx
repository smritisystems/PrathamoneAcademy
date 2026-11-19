/**
 * @file        VideoStudio.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pages
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
 * @description Master standalone visual video editing studio and AI product video director page (/video-studio) for PrathamOne EduOS.
 */

import React, { useState, useEffect, useCallback } from 'react'
import StudioHeader from '../components/studio/StudioHeader'
import VideoCanvasPreviewer from '../components/studio/VideoCanvasPreviewer'
import VisualTimelineEditor from '../components/studio/VisualTimelineEditor'
import SceneStageEditor from '../components/studio/SceneStageEditor'
import ProjectLibraryModal from '../components/studio/ProjectLibraryModal'
import AiDirectorModal from '../components/studio/AiDirectorModal'
import VideoExportModal from '../components/studio/VideoExportModal'
import { useVideoStudioStore } from '../store/videoStudioStore'

export default function VideoStudio() {
  const {
    viewMode,
    togglePlayPause,
    undo,
    redo,
    saveCurrentProject,
    stepTime,
    addScene,
  } = useVideoStudioStore()

  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [isDirectorOpen, setIsDirectorOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)

  // Global Keyboard Shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        togglePlayPause()
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        stepTime(-1.0)
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        stepTime(1.0)
      } else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault()
        undo()
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault()
        redo()
      } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        saveCurrentProject()
      }
    },
    [togglePlayPause, stepTime, undo, redo, saveCurrentProject]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 1. Master Studio Action Header */}
      <StudioHeader
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onOpenDirector={() => setIsDirectorOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* 2. Middle Work Area: Canvas Previewer + Stage Editor */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Canvas Preview Center Stage */}
        <div className="flex-1 h-full overflow-hidden flex items-center justify-center bg-slate-950">
          <VideoCanvasPreviewer
            onToggleFullscreen={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {})
              } else {
                document.exitFullscreen().catch(() => {})
              }
            }}
          />
        </div>

        {/* Right Scene Property & Motion Editor (Hidden in Theater Mode) */}
        {viewMode === 'standard' && (
          <div className="w-80 md:w-96 h-full shrink-0 z-10">
            <SceneStageEditor onOpenVaultPicker={() => setIsLibraryOpen(true)} />
          </div>
        )}
      </div>

      {/* 3. Bottom Multi-Track Visual Timeline */}
      <VisualTimelineEditor onAddScene={() => addScene()} />

      {/* 4. Modals */}
      <ProjectLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onOpenDirector={() => {
          setIsLibraryOpen(false)
          setIsDirectorOpen(true)
        }}
      />

      <AiDirectorModal
        isOpen={isDirectorOpen}
        onClose={() => setIsDirectorOpen(false)}
      />

      <VideoExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  )
}
