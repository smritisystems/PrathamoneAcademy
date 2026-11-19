/**
 * @file        SceneStageEditor.tsx
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
 * @description Fine-grained Scene Stage Editor configuring device mockups, Ken Burns pan/zoom keyframes, animated cursor paths, callout overlays, and voice-over scripts.
 */

import React, { useState } from 'react'
import {
  Sliders,
  Maximize2,
  MousePointer,
  Volume2,
  Tag,
  Film,
  Sparkles,
  Play,
  Square,
  Plus,
  Trash2,
  Layers,
  Monitor,
  Laptop,
  Tablet,
  LayoutTemplate,
  MessageSquare,
  Eye,
  Check,
  UserCheck,
  Video,
} from 'lucide-react'
import { useVideoStudioStore } from '../../store/videoStudioStore'
import { VERIFIED_ASSET_VAULT } from '../../config/videoStudioAssets'
import { PRESENTER_PROFILES } from '../../config/presenterProfiles'
import type {
  MockupType,
  PresenterMode,
  PresenterPosition,
  SceneCallout,
  TransitionType,
  VideoSceneDefinition,
} from '../../types/videoStudio'

interface SceneStageEditorProps {
  onOpenVaultPicker: () => void
}

export default function SceneStageEditor({ onOpenVaultPicker }: SceneStageEditorProps) {
  const { currentProject, activeSceneId, updateScene } = useVideoStudioStore()

  const activeScene =
    currentProject.scenes.find((s) => s.id === activeSceneId) || currentProject.scenes[0]

  const [activeTab, setActiveTab] = useState<'visual' | 'presenter' | 'motion' | 'cursor' | 'audio'>('visual')
  const [isPlayingSpeech, setIsPlayingSpeech] = useState(false)

  if (!activeScene) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-slate-500 text-xs">
        No active scene selected. Choose a scene from the timeline below.
      </div>
    )
  }

  const handleSpeechAudition = () => {
    if (!('speechSynthesis' in window)) return
    if (isPlayingSpeech) {
      window.speechSynthesis.cancel()
      setIsPlayingSpeech(false)
      return
    }

    const text = activeScene.narration.script
    if (!text) return

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = activeScene.narration.rate || 1.0
    utterance.pitch = activeScene.narration.pitch || 1.0
    utterance.onend = () => setIsPlayingSpeech(false)
    utterance.onerror = () => setIsPlayingSpeech(false)

    setIsPlayingSpeech(true)
    window.speechSynthesis.speak(utterance)
  }

  const handleAddCallout = () => {
    const newCallout: SceneCallout = {
      id: `c-${Date.now()}`,
      text: 'New Feature Highlight',
      xPercent: 50,
      yPercent: 40,
      delaySeconds: 1.5,
      badgeColor: 'orange',
    }
    updateScene(activeScene.id, {
      callouts: [...activeScene.callouts, newCallout],
    })
  }

  const handleRemoveCallout = (calloutId: string) => {
    updateScene(activeScene.id, {
      callouts: activeScene.callouts.filter((c) => c.id !== calloutId),
    })
  }

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-800 text-slate-100 select-none overflow-hidden">
      {/* Editor Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">
              Scene #{activeScene.order}
            </span>
            <h3 className="text-xs font-bold text-white truncate max-w-[160px]">
              {activeScene.title}
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
            Duration: {activeScene.duration.toFixed(1)}s
          </span>
        </div>

        {/* Sub-tab icons */}
        <div className="flex items-center bg-slate-800 p-0.5 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('visual')}
            className={`p-1.5 rounded transition-colors ${
              activeTab === 'visual' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="Visual & Mockup Styling"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTab('presenter')}
            className={`p-1.5 rounded transition-colors ${
              activeTab === 'presenter' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="AI Presenter & Virtual Human"
          >
            <UserCheck className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTab('motion')}
            className={`p-1.5 rounded transition-colors ${
              activeTab === 'motion' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="Motion & Ken Burns Zoom"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTab('cursor')}
            className={`p-1.5 rounded transition-colors ${
              activeTab === 'cursor' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="Animated Cursor & Callouts"
          >
            <MousePointer className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`p-1.5 rounded transition-colors ${
              activeTab === 'audio' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="Voice-Over Narration & Captions"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {activeTab === 'visual' && (
          <div className="space-y-4">
            {/* Scene Headline & Subtitle */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Scene Headline
              </label>
              <input
                type="text"
                value={activeScene.title}
                onChange={(e) => updateScene(activeScene.id, { title: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Scene Subtitle
              </label>
              <input
                type="text"
                value={activeScene.subtitle}
                onChange={(e) => updateScene(activeScene.id, { subtitle: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>

            {/* Duration Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <span>Duration</span>
                <span className="font-mono text-amber-400 font-bold">{activeScene.duration.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="3"
                max="30"
                step="0.5"
                value={activeScene.duration}
                onChange={(e) => updateScene(activeScene.id, { duration: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Media Asset Preview & Picker Button */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Visual Screen Asset
              </label>
              <div className="aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-800 relative group">
                <img
                  src={activeScene.media.url}
                  alt={activeScene.title}
                  className="w-full h-full object-cover"
                />
                <div
                  onClick={onOpenVaultPicker}
                  className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer gap-1.5 text-amber-300 font-semibold"
                >
                  <Eye className="w-4 h-4" />
                  <span>Choose from Vault</span>
                </div>
              </div>
            </div>

            {/* Device Mockup Wrapper */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Device Mockup Framing
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'display', label: 'Studio Display', icon: Monitor },
                  { id: 'macbook', label: 'MacBook Pro', icon: Laptop },
                  { id: 'ipad', label: 'iPad Tablet', icon: Tablet },
                  { id: 'floating-card', label: 'Floating Card', icon: LayoutTemplate },
                  { id: 'none', label: 'Borderless Flat', icon: Square },
                ].map((mock) => {
                  const MockIcon = mock.icon
                  const isSelected = (activeScene.media.mockupType || 'none') === mock.id
                  return (
                    <button
                      key={mock.id}
                      onClick={() =>
                        updateScene(activeScene.id, {
                          media: {
                            ...activeScene.media,
                            mockupType: mock.id as MockupType,
                            fit: mock.id === 'none' ? 'cover' : 'mockup',
                          },
                        })
                      }
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                          : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <MockIcon className="w-3.5 h-3.5" />
                      <span className="truncate">{mock.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Scene Transition Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Scene Transition
              </label>
              <select
                value={activeScene.transition}
                onChange={(e) => updateScene(activeScene.id, { transition: e.target.value as TransitionType })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-500"
              >
                <option value="fade">Crossfade (Smooth)</option>
                <option value="slide-left">Slide Left</option>
                <option value="slide-right">Slide Right</option>
                <option value="zoom-in">Zoom In</option>
                <option value="zoom-out">Zoom Out</option>
                <option value="dip-navy">Dip to Pratham Navy</option>
                <option value="dip-black">Dip to Black</option>
                <option value="none">Cut (Immediate)</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'presenter' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
              <div>
                <span className="text-[11px] font-bold text-white block">
                  Virtual Human AI Presenter
                </span>
                <span className="text-[10px] text-slate-400">
                  Deliver professional Indian corporate walkthroughs
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(activeScene.presenter?.enabled)}
                  onChange={(e) => {
                    const isEnabled = e.target.checked
                    updateScene(activeScene.id, {
                      presenter: {
                        enabled: isEnabled,
                        profileId: activeScene.presenter?.profileId || 'priya-sharma',
                        mode: activeScene.presenter?.mode || 'pip',
                        position: activeScene.presenter?.position || 'bottom-right',
                        avatarUrl:
                          activeScene.presenter?.avatarUrl || '/media/studio/presenters/priya_sharma.jpg',
                        speechScript: activeScene.narration.script,
                      },
                    })
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {activeScene.presenter?.enabled && (
              <>
                {/* Presenter Profile Cards */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Select Presenter Persona
                  </label>
                  <div className="space-y-2">
                    {PRESENTER_PROFILES.map((p) => {
                      const isSelected = (activeScene.presenter?.profileId || 'priya-sharma') === p.id
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            updateScene(activeScene.id, {
                              presenter: {
                                ...activeScene.presenter!,
                                profileId: p.id,
                                avatarUrl: p.avatarUrl,
                              },
                            })
                          }}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500 ring-1 ring-amber-500/50'
                              : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <img
                            src={p.avatarUrl}
                            alt={p.name}
                            className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-xs">{p.name}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-700 text-amber-300 font-medium">
                                {p.badge}
                              </span>
                            </div>
                            <span className="text-[10px] text-amber-400 block truncate">
                              {p.role}
                            </span>
                            <p className="text-[9px] text-slate-400 mt-1 line-clamp-2">
                              {p.accent}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Presentation Mode Selector */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Presenter Stage Layout
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'pip', label: 'Picture-in-Pic', desc: 'Floating badge' },
                      { id: 'full-screen', label: 'Full Screen', desc: 'Executive stage' },
                      { id: 'split-screen', label: 'Split Screen', desc: 'Side-by-side' },
                    ].map((m) => {
                      const isSel = (activeScene.presenter?.mode || 'pip') === m.id
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            updateScene(activeScene.id, {
                              presenter: {
                                ...activeScene.presenter!,
                                mode: m.id as PresenterMode,
                              },
                            })
                          }}
                          className={`p-2 rounded-lg border text-center transition-all ${
                            isSel
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                              : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="block text-[11px]">{m.label}</span>
                          <span className="block text-[8px] opacity-75">{m.desc}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* PIP Position Selector */}
                {activeScene.presenter?.mode === 'pip' && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Badge Placement
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'bottom-right', label: 'Bottom Right' },
                        { id: 'bottom-left', label: 'Bottom Left' },
                        { id: 'top-right', label: 'Top Right' },
                        { id: 'top-left', label: 'Top Left' },
                      ].map((pos) => {
                        const isSel = (activeScene.presenter?.position || 'bottom-right') === pos.id
                        return (
                          <button
                            key={pos.id}
                            onClick={() => {
                              updateScene(activeScene.id, {
                                presenter: {
                                  ...activeScene.presenter!,
                                  position: pos.id as PresenterPosition,
                                },
                              })
                            }}
                            className={`p-1.5 rounded-lg border text-xs text-center transition-all ${
                              isSel
                                ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                                : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-white'
                            }`}
                          >
                            {pos.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Custom Video Footage URL (Optional for HeyGen / D-ID or Green Screen) */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Custom Video Clip URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={activeScene.presenter?.videoUrl || ''}
                    placeholder="e.g. /media/studio/recordings/demo_student_workflow.mp4"
                    onChange={(e) => {
                      updateScene(activeScene.id, {
                        presenter: {
                          ...activeScene.presenter!,
                          videoUrl: e.target.value,
                        },
                      })
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 font-mono"
                  />
                  <p className="text-[9px] text-slate-400">
                    Supports MP4 or transparent WebM from external providers or studio recording.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'motion' && (
          <div className="space-y-4">
            <span className="text-[11px] font-bold text-white block">
              Ken Burns Pan & Zoom Keyframes
            </span>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Creates professional cinematic movement by scaling and translating the screen across the scene duration.
            </p>

            {/* Motion Type */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Camera Motion Path
              </label>
              <select
                value={activeScene.motion.type}
                onChange={(e) =>
                  updateScene(activeScene.id, {
                    motion: { ...activeScene.motion, type: e.target.value as any },
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-500"
              >
                <option value="ken-burns">Ken Burns (Zoom & Diagonal Pan)</option>
                <option value="zoom-in">Gentle Zoom In</option>
                <option value="zoom-out">Gentle Zoom Out</option>
                <option value="pan-left">Slow Pan Left</option>
                <option value="pan-right">Slow Pan Right</option>
                <option value="static">Static (No Motion)</option>
              </select>
            </div>

            {/* Start Zoom Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <span>Start Zoom Scale</span>
                <span className="font-mono text-amber-400">{activeScene.motion.startScale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.9"
                max="1.3"
                step="0.02"
                value={activeScene.motion.startScale}
                onChange={(e) =>
                  updateScene(activeScene.id, {
                    motion: { ...activeScene.motion, startScale: parseFloat(e.target.value) },
                  })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* End Zoom Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <span>End Zoom Scale</span>
                <span className="font-mono text-amber-400">{activeScene.motion.endScale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.9"
                max="1.3"
                step="0.02"
                value={activeScene.motion.endScale}
                onChange={(e) =>
                  updateScene(activeScene.id, {
                    motion: { ...activeScene.motion, endScale: parseFloat(e.target.value) },
                  })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {activeTab === 'cursor' && (
          <div className="space-y-5">
            {/* Animated Cursor Toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <MousePointer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Interactive Cursor Simulation</span>
                </span>
                <input
                  type="checkbox"
                  checked={activeScene.cursor.show}
                  onChange={(e) =>
                    updateScene(activeScene.id, {
                      cursor: { ...activeScene.cursor, show: e.target.checked },
                    })
                  }
                  className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
                />
              </div>

              {activeScene.cursor.show && (
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">
                      Click Label / Action Name
                    </label>
                    <input
                      type="text"
                      value={activeScene.cursor.clickLabel || ''}
                      onChange={(e) =>
                        updateScene(activeScene.id, {
                          cursor: { ...activeScene.cursor, clickLabel: e.target.value },
                        })
                      }
                      placeholder="e.g. Instant QR Scan"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-slate-400">Target X Position:</span>
                      <span className="font-mono text-amber-400 ml-1">{activeScene.cursor.clickXPercent}%</span>
                      <input
                        type="range"
                        min="10"
                        max="90"
                        value={activeScene.cursor.clickXPercent}
                        onChange={(e) =>
                          updateScene(activeScene.id, {
                            cursor: { ...activeScene.cursor, clickXPercent: parseInt(e.target.value) },
                          })
                        }
                        className="w-full accent-amber-500 mt-1"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400">Target Y Position:</span>
                      <span className="font-mono text-amber-400 ml-1">{activeScene.cursor.clickYPercent}%</span>
                      <input
                        type="range"
                        min="10"
                        max="90"
                        value={activeScene.cursor.clickYPercent}
                        onChange={(e) =>
                          updateScene(activeScene.id, {
                            cursor: { ...activeScene.cursor, clickYPercent: parseInt(e.target.value) },
                          })
                        }
                        className="w-full accent-amber-500 mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Callout Badges Manager */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-400" />
                  <span>Callout Pill Badges ({activeScene.callouts.length})</span>
                </span>
                <button
                  onClick={handleAddCallout}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold border border-slate-700 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Pill</span>
                </button>
              </div>

              <div className="space-y-2">
                {activeScene.callouts.map((c, i) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={c.text}
                        onChange={(e) => {
                          const updated = [...activeScene.callouts]
                          updated[i].text = e.target.value
                          updateScene(activeScene.id, { callouts: updated })
                        }}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white w-48 focus:outline-hidden"
                      />
                      <button
                        onClick={() => handleRemoveCallout(c.id)}
                        className="text-slate-400 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                      <div>
                        <span>X: {c.xPercent}%</span>
                        <input
                          type="range"
                          min="5"
                          max="95"
                          value={c.xPercent}
                          onChange={(e) => {
                            const updated = [...activeScene.callouts]
                            updated[i].xPercent = parseInt(e.target.value)
                            updateScene(activeScene.id, { callouts: updated })
                          }}
                          className="w-full accent-amber-500 mt-0.5"
                        />
                      </div>
                      <div>
                        <span>Y: {c.yPercent}%</span>
                        <input
                          type="range"
                          min="5"
                          max="95"
                          value={c.yPercent}
                          onChange={(e) => {
                            const updated = [...activeScene.callouts]
                            updated[i].yPercent = parseInt(e.target.value)
                            updateScene(activeScene.id, { callouts: updated })
                          }}
                          className="w-full accent-amber-500 mt-0.5"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audio' && (
          <div className="space-y-4">
            {/* Narration Script */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Voice-Over Narration Script
                </label>
                <button
                  onClick={handleSpeechAudition}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                    isPlayingSpeech
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  <Volume2 className="w-3 h-3" />
                  <span>{isPlayingSpeech ? 'Stop Speech' : 'Audition Voice'}</span>
                </button>
              </div>

              <textarea
                rows={4}
                value={activeScene.narration.script}
                onChange={(e) =>
                  updateScene(activeScene.id, {
                    narration: { ...activeScene.narration, script: e.target.value },
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white leading-relaxed focus:outline-hidden focus:border-amber-500 resize-none font-sans"
              />
            </div>

            {/* Speech Rate Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <span>Speech Speed Rate</span>
                <span className="font-mono text-amber-400">
                  {(activeScene.narration.rate || 1.0).toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.3"
                step="0.05"
                value={activeScene.narration.rate || 1.0}
                onChange={(e) =>
                  updateScene(activeScene.id, {
                    narration: { ...activeScene.narration, rate: parseFloat(e.target.value) },
                  })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Captions Toggle & Style */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span>Burned Bottom Captions</span>
                </span>
                <input
                  type="checkbox"
                  checked={activeScene.captions.show}
                  onChange={(e) =>
                    updateScene(activeScene.id, {
                      captions: { ...activeScene.captions, show: e.target.checked },
                    })
                  }
                  className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
                />
              </div>

              {activeScene.captions.show && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">
                    Caption Style
                  </label>
                  <select
                    value={activeScene.captions.style}
                    onChange={(e) =>
                      updateScene(activeScene.id, {
                        captions: { ...activeScene.captions, style: e.target.value as any },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-hidden"
                  >
                    <option value="bottom-pill">Dark Bottom Pill (SaaS Pro)</option>
                    <option value="centered-banner">Centered Gradient Banner</option>
                    <option value="clean-sub">Clean Subtitles (Subtle Shadow)</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
