/**
 * @file        StudioHeader.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.studio
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
 * @description Master top action header for PrathamOne Video Studio featuring project metadata, aspect ratio controls, AI Director trigger, theater mode toggle, and export launcher.
 */

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Film,
  Sparkles,
  FolderOpen,
  Save,
  Download,
  Maximize2,
  Minimize2,
  Undo2,
  Redo2,
  Clock,
  Layers,
  ArrowLeft,
  Check,
  Edit2,
  Tv,
  Smartphone,
  Square,
  HelpCircle,
} from 'lucide-react'
import { useVideoStudioStore } from '../../store/videoStudioStore'
import type { AspectRatio } from '../../types/videoStudio'
import { useBranding } from '../../config/branding'

interface StudioHeaderProps {
  onOpenLibrary: () => void
  onOpenDirector: () => void
  onOpenExport: () => void
}

export default function StudioHeader({
  onOpenLibrary,
  onOpenDirector,
  onOpenExport,
}: StudioHeaderProps) {
  const branding = useBranding()
  const {
    currentProject,
    updateProjectDetails,
    saveCurrentProject,
    undo,
    redo,
    undoStack,
    redoStack,
    viewMode,
    setViewMode,
  } = useVideoStudioStore()

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [projectTitle, setProjectTitle] = useState(currentProject.name)
  const [showSavedToast, setShowSavedToast] = useState(false)

  const handleTitleSubmit = () => {
    setIsEditingTitle(false)
    if (projectTitle.trim() && projectTitle !== currentProject.name) {
      updateProjectDetails({ name: projectTitle.trim() })
    }
  }

  const handleSave = () => {
    saveCurrentProject()
    setShowSavedToast(true)
    setTimeout(() => setShowSavedToast(false), 2000)
  }

  const handleAspectChange = (aspect: AspectRatio) => {
    const resolutionMap = {
      '16:9': { width: 1920, height: 1080 },
      '9:16': { width: 1080, height: 1920 },
      '1:1': { width: 1080, height: 1080 },
    }
    updateProjectDetails({
      aspectRatio: aspect,
      resolution: resolutionMap[aspect],
    })
  }

  const totalDuration = currentProject.scenes.reduce((sum, sc) => sum + sc.duration, 0)
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2.5 flex items-center justify-between select-none shrink-0 z-30">
      {/* Left: Brand, Back & Project Title */}
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800/60 hover:bg-slate-800 transition-colors"
          title="Return to PrathamOne Dashboard"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit Studio</span>
        </Link>

        <div className="h-5 w-px bg-slate-700 mx-1" />

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-xs">
            <Film className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider uppercase text-amber-400">
                PrathamOne Video Studio
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                v1.0
              </span>
            </div>
            {isEditingTitle ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                  autoFocus
                  className="bg-slate-800 border border-amber-500/50 rounded px-1.5 py-0.5 text-xs text-white focus:outline-hidden"
                />
                <button
                  onClick={handleTitleSubmit}
                  className="p-1 hover:text-amber-400"
                  aria-label="Confirm title edit"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => {
                  setProjectTitle(currentProject.name)
                  setIsEditingTitle(true)
                }}
                className="group flex items-center gap-1 cursor-pointer"
                title="Click to rename video project"
              >
                <span className="text-sm font-semibold text-slate-100 group-hover:text-amber-300 transition-colors max-w-[240px] truncate">
                  {currentProject.name}
                </span>
                <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center: Aspect Ratio & Duration Indicator */}
      <div className="flex items-center gap-4">
        {/* Aspect Ratio Switcher */}
        <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-xs">
          <button
            onClick={() => handleAspectChange('16:9')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
              currentProject.aspectRatio === '16:9'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="16:9 Landscape Full HD (YouTube, Website, Sales Demo)"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>16:9</span>
          </button>
          <button
            onClick={() => handleAspectChange('9:16')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
              currentProject.aspectRatio === '9:16'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="9:16 Vertical (Instagram Reels, YouTube Shorts, WhatsApp Status)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>9:16</span>
          </button>
          <button
            onClick={() => handleAspectChange('1:1')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
              currentProject.aspectRatio === '1:1'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="1:1 Square (LinkedIn, Instagram Post)"
          >
            <Square className="w-3.5 h-3.5" />
            <span>1:1</span>
          </button>
        </div>

        {/* Duration & Scene Counter Badge */}
        <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700/50">
          <div className="flex items-center gap-1 text-slate-300 text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono font-semibold text-slate-100">
              {formatTime(totalDuration)}
            </span>
            <span className="text-[10px] text-slate-400">/ {currentProject.targetDuration}s</span>
          </div>
          <div className="h-3 w-px bg-slate-700" />
          <div className="flex items-center gap-1 text-slate-300 text-xs">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold">{currentProject.scenes.length} Scenes</span>
          </div>
        </div>
      </div>

      {/* Right: Actions, AI Director, Undo/Redo & Export */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-800/60 rounded-lg p-0.5 border border-slate-700/50 mr-1">
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* AI Video Director Button */}
        <button
          onClick={onOpenDirector}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-semibold shadow-xs transition-all hover:shadow-indigo-500/20 active:scale-95"
          title="Open AI Video Director & Storyboards"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span>AI Director</span>
        </button>

        {/* Project Library Button */}
        <button
          onClick={onOpenLibrary}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          title="Project Library & Media Vault"
        >
          <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
          <span>Library</span>
        </button>

        {/* Save Project Button */}
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors relative"
          title="Save Project (Ctrl+S)"
        >
          <Save className="w-3.5 h-3.5 text-emerald-400" />
          {showSavedToast && (
            <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded shadow-md whitespace-nowrap animate-bounce">
              Project Saved!
            </span>
          )}
        </button>

        {/* Theater View Toggle */}
        <button
          onClick={() => setViewMode(viewMode === 'standard' ? 'theater' : 'standard')}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors"
          title={viewMode === 'standard' ? 'Switch to Theater Mode' : 'Switch to Standard View'}
        >
          {viewMode === 'standard' ? (
            <Maximize2 className="w-3.5 h-3.5" />
          ) : (
            <Minimize2 className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Export Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold shadow-md transition-all active:scale-95 ml-1"
          title="Export Finished Video (MP4 / WebM Full HD)"
        >
          <Download className="w-3.5 h-3.5 text-slate-950" />
          <span>Export Video</span>
        </button>
      </div>
    </header>
  )
}
