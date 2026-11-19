/**
 * @file        VisualTimelineEditor.tsx
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
 * @description Multi-scene interactive timeline editor with drag-and-drop sequencing, duration trimming, playhead scrubbing, audio waveforms, and transition badges.
 */

import React, { useRef, useState, useEffect } from 'react'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Plus,
  Trash2,
  Copy,
  Clock,
  Layers,
  ZoomIn,
  ZoomOut,
  Sliders,
  MoveLeft,
  MoveRight,
  Sparkles,
  Volume2,
  MessageSquare,
  Tag,
  MousePointer,
} from 'lucide-react'
import { useVideoStudioStore } from '../../store/videoStudioStore'
import type { VideoSceneDefinition } from '../../types/videoStudio'

interface VisualTimelineEditorProps {
  onAddScene: () => void
}

export default function VisualTimelineEditor({ onAddScene }: VisualTimelineEditorProps) {
  const {
    currentProject,
    activeSceneId,
    setActiveSceneId,
    currentTime,
    setCurrentTime,
    stepTime,
    isPlaying,
    togglePlayPause,
    timelineZoom,
    setTimelineZoom,
    reorderScenes,
    duplicateScene,
    deleteScene,
    updateScene,
  } = useVideoStudioStore()

  const timelineContainerRef = useRef<HTMLDivElement>(null)
  const [isScrubbing, setIsScrubbing] = useState(false)

  const totalDuration = currentProject.scenes.reduce((sum, sc) => sum + sc.duration, 0)

  // Pixels per second based on zoom: baseline 24px per second
  const pxPerSec = 28 * timelineZoom

  const formatSMPTE = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 30)
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}:${
      ms < 10 ? '0' : ''
    }${ms}`
  }

  // Handle timeline scrubbing via mouse
  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineContainerRef.current) return
    const rect = timelineContainerRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left + timelineContainerRef.current.scrollLeft - 100 // Subtract track label offset
    const time = Math.max(0, Math.min(clickX / pxPerSec, totalDuration))
    setCurrentTime(time)
  }

  // Generate ruler tick marks
  const rulerTicks: Array<{ time: number; label: string }> = []
  for (let t = 0; t <= totalDuration + 10; t += 5) {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    rulerTicks.push({
      time: t,
      label: `${m}:${s < 10 ? '0' : ''}${s}`,
    })
  }

  return (
    <div className="h-64 flex flex-col bg-slate-950 border-t border-slate-800 text-slate-200 select-none shrink-0 z-20">
      {/* Timeline Controls Toolbar */}
      <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-900/95 flex items-center justify-between shrink-0">
        {/* Playback Transport */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => stepTime(-1.0)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Step Backward 1s"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={togglePlayPause}
            className="w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-md transition-all active:scale-95"
            title={isPlaying ? 'Pause (Space)' : 'Play Preview (Space)'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => stepTime(1.0)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Step Forward 1s"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Timecode display */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 font-mono text-xs ml-2">
            <span className="text-amber-400 font-bold">{formatSMPTE(currentTime)}</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">{formatSMPTE(totalDuration)}</span>
          </div>
        </div>

        {/* Timeline Tracks Legend & Zoom */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Visuals</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Callouts</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span>Voice</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>BGM</span>
            </span>
          </div>

          {/* Zoom Slider */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60 text-xs">
            <button
              onClick={() => setTimelineZoom(timelineZoom - 0.2)}
              className="text-slate-400 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono text-slate-300 w-8 text-center">
              {Math.round(timelineZoom * 100)}%
            </span>
            <button
              onClick={() => setTimelineZoom(timelineZoom + 0.2)}
              className="text-slate-400 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          {/* Add Scene Button */}
          <button
            onClick={onAddScene}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Scene</span>
          </button>
        </div>
      </div>

      {/* Timeline Scrollable Multi-Track Container */}
      <div
        ref={timelineContainerRef}
        onClick={handleScrub}
        className="flex-1 overflow-x-auto overflow-y-hidden relative bg-slate-950 flex"
      >
        {/* Left Fixed Track Header Labels */}
        <div className="w-24 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col text-[10px] text-slate-400 font-medium z-20">
          <div className="h-6 border-b border-slate-800 px-2 flex items-center bg-slate-900/90 text-slate-500 font-mono">
            RULER
          </div>
          <div className="h-24 border-b border-slate-800 px-2 flex items-center gap-1.5 font-bold text-slate-300">
            <Layers className="w-3 h-3 text-blue-400" />
            <span>Visuals</span>
          </div>
          <div className="h-7 border-b border-slate-800 px-2 flex items-center gap-1.5">
            <Tag className="w-3 h-3 text-amber-400" />
            <span>Callouts</span>
          </div>
          <div className="h-7 border-b border-slate-800 px-2 flex items-center gap-1.5">
            <Volume2 className="w-3 h-3 text-purple-400" />
            <span>Voice-Over</span>
          </div>
          <div className="h-7 px-2 flex items-center gap-1.5">
            <Volume2 className="w-3 h-3 text-emerald-400" />
            <span>BGM Audio</span>
          </div>
        </div>

        {/* Scrollable Timeline Canvas Content */}
        <div
          className="relative flex-1 flex flex-col"
          style={{ width: `${Math.max(1200, totalDuration * pxPerSec + 200)}px` }}
        >
          {/* Time Ruler */}
          <div className="h-6 border-b border-slate-800 relative bg-slate-900/60 font-mono text-[9px] text-slate-500">
            {rulerTicks.map((tick) => (
              <div
                key={tick.time}
                className="absolute top-0 bottom-0 border-l border-slate-800/80 pl-1 pt-0.5"
                style={{ left: `${tick.time * pxPerSec}px` }}
              >
                {tick.label}
              </div>
            ))}
          </div>

          {/* Track 1: Scene Cards Track (Height: 96px) */}
          <div className="h-24 border-b border-slate-800 relative flex items-center p-1 gap-1">
            {currentProject.scenes.map((scene, idx) => {
              const isSelected = scene.id === activeSceneId
              const cardWidth = Math.max(90, scene.duration * pxPerSec)

              return (
                <div
                  key={scene.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveSceneId(scene.id)
                  }}
                  style={{ width: `${cardWidth}px` }}
                  className={`h-full shrink-0 rounded-lg border p-1.5 flex flex-col justify-between relative group cursor-pointer transition-all overflow-hidden ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 shadow-md'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Bar: Scene Index & Duration */}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono font-bold text-amber-400">#{scene.order}</span>
                    <span className="font-mono text-slate-400">{scene.duration.toFixed(1)}s</span>
                  </div>

                  {/* Thumbnail & Title Preview */}
                  <div className="flex items-center gap-2 overflow-hidden my-0.5">
                    <div className="w-10 h-7 rounded bg-slate-950 shrink-0 overflow-hidden border border-slate-800">
                      <img
                        src={scene.media.url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200 truncate">
                      {scene.title}
                    </span>
                  </div>

                  {/* Bottom: Transition Badge & Quick Actions */}
                  <div className="flex items-center justify-between text-[9px] text-slate-400">
                    <span className="bg-slate-800 px-1 rounded text-slate-300 capitalize truncate max-w-[70px]">
                      {scene.transition}
                    </span>

                    {/* Quick Move / Clone Controls */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {idx > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            reorderScenes(idx, idx - 1)
                          }}
                          className="hover:text-amber-400"
                          title="Move Left"
                        >
                          <MoveLeft className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {idx < currentProject.scenes.length - 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            reorderScenes(idx, idx + 1)
                          }}
                          className="hover:text-amber-400"
                          title="Move Right"
                        >
                          <MoveRight className="w-2.5 h-2.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          duplicateScene(scene.id)
                        }}
                        className="hover:text-blue-400 ml-1"
                        title="Duplicate"
                      >
                        <Copy className="w-2.5 h-2.5" />
                      </button>
                      {currentProject.scenes.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteScene(scene.id)
                          }}
                          className="hover:text-rose-400"
                          title="Delete"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Track 2: Callout Badges Track (Height: 28px) */}
          <div className="h-7 border-b border-slate-800/80 relative bg-slate-900/30 flex items-center">
            {currentProject.scenes.map((scene) => {
              // Calculate scene offset
              let sceneOffsetSecs = 0
              for (const s of currentProject.scenes) {
                if (s.id === scene.id) break
                sceneOffsetSecs += s.duration
              }

              return scene.callouts.map((c) => (
                <div
                  key={c.id}
                  style={{
                    left: `${(sceneOffsetSecs + c.delaySeconds) * pxPerSec}px`,
                  }}
                  className="absolute top-1 bottom-1 px-1.5 rounded bg-amber-500/20 border border-amber-500/50 text-[9px] text-amber-300 font-bold flex items-center whitespace-nowrap shadow-xs"
                >
                  <Tag className="w-2 h-2 mr-1" />
                  <span>{c.text}</span>
                </div>
              ))
            })}
          </div>

          {/* Track 3: Voiceover Track (Height: 28px) */}
          <div className="h-7 border-b border-slate-800/80 relative bg-slate-900/20 flex items-center">
            {currentProject.scenes.map((scene) => {
              let sceneOffsetSecs = 0
              for (const s of currentProject.scenes) {
                if (s.id === scene.id) break
                sceneOffsetSecs += s.duration
              }
              const blockWidth = Math.max(50, (scene.duration - 0.5) * pxPerSec)

              return (
                <div
                  key={`voice-${scene.id}`}
                  style={{
                    left: `${(sceneOffsetSecs + 0.2) * pxPerSec}px`,
                    width: `${blockWidth}px`,
                  }}
                  className="absolute top-1 bottom-1 rounded bg-purple-500/20 border border-purple-500/40 text-[9px] text-purple-300 px-2 flex items-center justify-between overflow-hidden"
                >
                  <span className="truncate italic">"{scene.narration.script}"</span>
                  <Volume2 className="w-2.5 h-2.5 shrink-0 ml-1 text-purple-400" />
                </div>
              )
            })}
          </div>

          {/* Track 4: Background Music Track (Height: 28px) */}
          <div className="h-7 relative bg-slate-900/40 flex items-center">
            <div
              style={{
                left: 0,
                width: `${totalDuration * pxPerSec}px`,
              }}
              className="absolute top-1 bottom-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-[9px] text-emerald-300 px-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Volume2 className="w-3 h-3 text-emerald-400" />
                <span className="font-semibold">
                  PrathamOne Corporate Ambient Sound (44.1kHz Stereo)
                </span>
              </div>
              <span className="font-mono text-[9px] text-emerald-400">
                Vol: {Math.round(currentProject.audio.bgmVolume * 100)}% (Ducking Active)
              </span>
            </div>
          </div>

          {/* Scrubbing Red Playhead Needle */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none"
            style={{ left: `${currentTime * pxPerSec}px` }}
          >
            {/* Playhead Top Handle */}
            <div className="w-3 h-3.5 bg-rose-500 rounded-b-sm -translate-x-[5px] flex items-center justify-center shadow-md">
              <div className="w-1 h-1 bg-white rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
