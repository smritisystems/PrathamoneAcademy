/**
 * @file        AiDirectorModal.tsx
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
 * @description AI Product Video Director modal providing 7 pre-engineered SaaS video templates, scene order breakdowns, and deterministic storyboard generation.
 */

import React, { useState } from 'react'
import {
  X,
  Sparkles,
  Film,
  Clock,
  Layers,
  ArrowRight,
  Smartphone,
  CreditCard,
  Presentation,
  Users,
  MessageSquare,
  CheckCircle2,
  Tv,
} from 'lucide-react'
import { DIRECTOR_PRESETS } from '../../config/videoStudioDirector'
import type { AiDirectorPreset, DirectorPresetId } from '../../types/videoStudio'
import { useVideoStudioStore } from '../../store/videoStudioStore'

interface AiDirectorModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AiDirectorModal({ isOpen, onClose }: AiDirectorModalProps) {
  const { newProjectFromPreset } = useVideoStudioStore()
  const [selectedPresetId, setSelectedPresetId] = useState<DirectorPresetId>('master-120')
  const [customTitle, setCustomTitle] = useState('')

  if (!isOpen) return null

  const selectedPreset =
    DIRECTOR_PRESETS.find((p) => p.id === selectedPresetId) || DIRECTOR_PRESETS[0]

  const handleGenerate = () => {
    newProjectFromPreset(
      selectedPresetId,
      customTitle.trim() ? customTitle.trim() : undefined
    )
    onClose()
  }

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Film':
        return Film
      case 'Sparkles':
        return Sparkles
      case 'Smartphone':
        return Smartphone
      case 'CreditCard':
        return CreditCard
      case 'Presentation':
        return Presentation
      case 'Users':
        return Users
      case 'MessageSquare':
        return MessageSquare
      default:
        return Film
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>AI Video Director</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-mono">
                  Autonomous Production
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Select a verified production goal to generate a complete, timed SaaS storyboard
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Split */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Left Column: Preset Selector (5 Cols) */}
          <div className="md:col-span-5 p-4 border-r border-slate-800 overflow-y-auto space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Production Goals & Presets
            </span>

            {DIRECTOR_PRESETS.map((preset) => {
              const IconComponent = getIcon(preset.iconName)
              const isSelected = preset.id === selectedPresetId
              return (
                <div
                  key={preset.id}
                  onClick={() => {
                    setSelectedPresetId(preset.id)
                    setCustomTitle('')
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-950/60 to-purple-950/40 border-indigo-500 shadow-md'
                      : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{preset.title}</h4>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">
                          {preset.subtitle}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {preset.badgeText}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-800/60">
                    <span className="flex items-center gap-1 font-mono text-amber-400">
                      <Clock className="w-3 h-3" />
                      {preset.targetDuration}s
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-blue-400" />
                      {preset.scenesCount} Scenes
                    </span>
                    <span className="flex items-center gap-1 text-[10px] bg-slate-800 px-1.5 py-0.2 rounded font-mono">
                      {preset.aspectRatio}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right Column: Preset Details & Storyboard Preview (7 Cols) */}
          <div className="md:col-span-7 p-6 overflow-y-auto space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Preset Header */}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">{selectedPreset.title}</h3>
                  <span className="text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                    {selectedPreset.targetDuration} Seconds
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">{selectedPreset.description}</p>
              </div>

              {/* Target Audience Pill */}
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-800 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">
                  Best Suited For
                </span>
                <span className="text-slate-200 font-medium mt-0.5 block">
                  {selectedPreset.recommendedTarget}
                </span>
              </div>

              {/* Storyboard Structure Highlights */}
              <div className="space-y-2">
                <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
                  Pre-Configured Storyboard Blueprint ({selectedPreset.scenesCount} Scenes)
                </span>
                <div className="space-y-2 text-xs">
                  {selectedPreset.id === 'master-120' ? (
                    <div className="space-y-1.5 text-slate-300">
                      <div className="flex items-center gap-2 p-1.5 rounded bg-slate-800/40">
                        <span className="font-mono text-amber-400 w-12 text-[11px]">0-8s</span>
                        <span className="font-medium text-white">Brand Identity & Master Tagline</span>
                      </div>
                      <div className="flex items-center gap-2 p-1.5 rounded bg-slate-800/40">
                        <span className="font-mono text-amber-400 w-12 text-[11px]">8-20s</span>
                        <span className="font-medium text-white">Executive Dashboard & Live Pulse</span>
                      </div>
                      <div className="flex items-center gap-2 p-1.5 rounded bg-slate-800/40">
                        <span className="font-mono text-amber-400 w-12 text-[11px]">20-35s</span>
                        <span className="font-medium text-white">Student Management & 15-Tab Dossier</span>
                      </div>
                      <div className="flex items-center gap-2 p-1.5 rounded bg-slate-800/40">
                        <span className="font-mono text-amber-400 w-12 text-[11px]">35-48s</span>
                        <span className="font-medium text-white">Fees Counter, Split Modes & Dynamic QR</span>
                      </div>
                      <div className="flex items-center gap-2 p-1.5 rounded bg-slate-800/40">
                        <span className="font-mono text-amber-400 w-12 text-[11px]">48-60s</span>
                        <span className="font-medium text-white">Academic Architecture & Canonical Deduplication</span>
                      </div>
                      <div className="flex items-center gap-2 p-1.5 rounded bg-slate-800/40">
                        <span className="font-mono text-amber-400 w-12 text-[11px]">60-72s</span>
                        <span className="font-medium text-white">EduBoard Interactive Classroom Studio</span>
                      </div>
                      <div className="flex items-center gap-2 p-1.5 rounded bg-slate-800/40">
                        <span className="font-mono text-amber-400 w-12 text-[11px]">72-84s</span>
                        <span className="font-medium text-white">Attendance Register & Instant Parent Alerts</span>
                      </div>
                      <div className="flex items-center gap-2 p-1.5 rounded bg-slate-800/40">
                        <span className="font-mono text-amber-400 w-12 text-[11px]">84-96s</span>
                        <span className="font-medium text-white">Examinations, Rank Engine & Graphical Cards</span>
                      </div>
                      <div className="flex items-center gap-2 p-1.5 rounded bg-slate-800/40">
                        <span className="font-mono text-amber-400 w-12 text-[11px]">96-108s</span>
                        <span className="font-medium text-white">WhatsApp Communication & Automated Dues</span>
                      </div>
                      <div className="flex items-center gap-2 p-1.5 rounded bg-slate-800/40">
                        <span className="font-mono text-amber-400 w-12 text-[11px]">108-120s</span>
                        <span className="font-medium text-white">Closing Brand Message & Call to Action</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-800/40 rounded-lg text-slate-300 leading-relaxed">
                      This preset includes {selectedPreset.scenesCount} carefully timed scenes
                      curated from verified application screenshots, complete with custom
                      voice-over narration, animated callouts, and smooth motion keyframes.
                    </div>
                  )}
                </div>
              </div>

              {/* Optional Title Input */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Project Title (Optional)
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={selectedPreset.title}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            {/* Bottom Generation CTA */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>100% Deterministic & Editable</span>
              </span>

              <button
                onClick={handleGenerate}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Storyboard in Studio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
