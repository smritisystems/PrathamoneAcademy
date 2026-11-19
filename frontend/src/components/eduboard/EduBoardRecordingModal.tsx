/**
 * @file        EduBoardRecordingModal.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.eduboard
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-19
 * @updated     2026-11-19
 *
 * @description Dedicated modal dialog for Native In-App EduBoard Lecture Recording, live audio auto-tuning indicators (WebRTC AGC + Noise Suppression), real-time timer/bitrate monitor, local video preview player, and 1-click publishing to Student Portal Study Materials.
 */

import React, { useEffect, useMemo, useState } from 'react'
import {
  Video,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Download,
  UploadCloud,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Volume2,
  Clock,
  HardDrive,
  Layers,
  FileCheck,
  X,
  ExternalLink,
} from 'lucide-react'
import Modal from '../Modal'
import type { EduBoardDetailItem } from '../../types'
import type { EduBoardRecordingProgress, RecorderState } from '../../utils/eduboardRecorder'

export interface EduBoardRecordingModalProps {
  isOpen: boolean
  onClose: () => void
  board: EduBoardDetailItem | null
  recorderState: RecorderState
  progress: EduBoardRecordingProgress
  recordedBlob: Blob | null
  mimeType: string
  audioEnabled: boolean
  onToggleAudio: () => void
  webcamEnabled?: boolean
  onToggleWebcam?: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onDiscard: () => void
  onPublish: (title: string, publishToStudyMaterials: boolean) => Promise<void>
  isPublishing: boolean
  publishSuccess: boolean
}

export default function EduBoardRecordingModal({
  isOpen,
  onClose,
  board,
  recorderState,
  progress,
  recordedBlob,
  mimeType,
  audioEnabled,
  onToggleAudio,
  webcamEnabled = false,
  onToggleWebcam,
  onPause,
  onResume,
  onStop,
  onDiscard,
  onPublish,
  isPublishing,
  publishSuccess,
}: EduBoardRecordingModalProps) {
  const [lectureTitle, setLectureTitle] = useState<string>('')
  const [publishToPortal, setPublishToPortal] = useState<boolean>(true)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState<boolean>(false)

  // Initialize lecture title when board changes
  useEffect(() => {
    if (board) {
      setLectureTitle(board.topic ? `${board.title} — ${board.topic}` : board.title)
    }
  }, [board])

  // Generate object URL for video preview when recording completes
  useEffect(() => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob)
      setPreviewUrl(url)
      return () => {
        URL.revokeObjectURL(url)
      }
    } else {
      setPreviewUrl(null)
    }
  }, [recordedBlob])

  // Format seconds to HH:MM:SS
  const formattedTime = useMemo(() => {
    const totalSec = progress.durationSeconds || 0
    const hrs = Math.floor(totalSec / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)
    const secs = totalSec % 60
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [progress.durationSeconds])

  // Format bytes to MB
  const formattedMb = useMemo(() => {
    const mb = (progress.bytesRecorded || 0) / (1024 * 1024)
    return mb.toFixed(1)
  }, [progress.bytesRecorded])

  const handleDownloadLocal = () => {
    if (!recordedBlob) return
    const url = URL.createObjectURL(recordedBlob)
    const a = document.createElement('a')
    a.href = url
    const safeTitle = (lectureTitle || 'Lecture_Recording').replace(/[^a-z0-9_-]/gi, '_')
    a.download = `${safeTitle}_${Date.now()}.webm`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lectureTitle.trim()) return
    await onPublish(lectureTitle.trim(), publishToPortal)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (recorderState === 'recording' || recorderState === 'paused') {
          // Keep recording running in background when modal is minimized
          onClose()
        } else {
          onClose()
        }
      }}
      title={
        recorderState === 'inactive' && recordedBlob
          ? 'Lecture Recording Review & Publish'
          : 'Native In-App Lecture Recorder (EduBoard)'
      }
    >
      <div className="space-y-4">
        {/* ====================================================================
            CASE 1: RECORDING IN PROGRESS OR PAUSED
            ==================================================================== */}
        {(recorderState === 'recording' || recorderState === 'paused') && (
          <div className="space-y-5">
            {/* Live Indicator Banner */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                recorderState === 'recording'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="relative flex h-3.5 w-3.5">
                  {recorderState === 'recording' && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                      recorderState === 'recording' ? 'bg-rose-600' : 'bg-amber-500'
                    }`}
                  ></span>
                </span>
                <div>
                  <h4 className="text-sm font-bold tracking-tight">
                    {recorderState === 'recording' ? 'Recording Active (1080p @ 30 FPS)' : 'Recording Paused'}
                  </h4>
                  <p className="text-xs opacity-80">
                    Capturing Konva GPU canvas stream directly with zero DPI scaling blur.
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-mono font-black tracking-wider text-slate-900">{formattedTime}</div>
                <div className="text-[11px] font-semibold text-slate-500">{formattedMb} MB recorded</div>
              </div>
            </div>

            {/* Auto-Tuning Acoustic Engine Status */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-slate-800">Acoustic Auto-Tuning Engine</span>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Broadcast Standard (-16 LUFS)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5 bg-white p-2 rounded-lg border border-slate-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    <strong>AGC Leveling:</strong> Auto-boosts whisper &amp; soft speech
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-white p-2 rounded-lg border border-slate-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Noise Cut:</strong> Silences fan &amp; AC hum
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-white p-2 rounded-lg border border-slate-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    <strong>80Hz HPF:</strong> Eliminates podium rumbles
                  </span>
                </div>
              </div>
            </div>

            {/* Board Context Metadata */}
            {board && (
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 flex items-center justify-between">
                <div>
                  <span className="font-semibold">Target Batch: </span>
                  {board.standard_name || 'All Standards'}
                  {board.division_name ? ` • ${board.division_name}` : ''}
                  {board.subject_name ? ` • ${board.subject_name}` : ''}
                </div>
                <div className="text-[11px] text-indigo-600 font-medium">SSOT Linked</div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleAudio}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border ${
                    audioEnabled
                      ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      : 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  {audioEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5 text-rose-600" />}
                  {audioEnabled ? 'Mic Active' : 'Mic Muted'}
                </button>

                {onToggleWebcam && (
                  <button
                    type="button"
                    onClick={onToggleWebcam}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border ${
                      webcamEnabled
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {webcamEnabled ? <Camera className="w-3.5 h-3.5 text-indigo-600" /> : <CameraOff className="w-3.5 h-3.5 text-slate-400" />}
                    {webcamEnabled ? 'Camera PiP On' : 'Camera PiP Off'}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {recorderState === 'recording' ? (
                  <button
                    type="button"
                    onClick={onPause}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  >
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onResume}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  >
                    <Play className="w-3.5 h-3.5" /> Resume
                  </button>
                )}

                <button
                  type="button"
                  onClick={onStop}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-200"
                >
                  <Square className="w-3.5 h-3.5 fill-current" /> Stop &amp; Finish
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            CASE 2: RECORDING FINISHED — PREVIEW, DOWNLOAD, PUBLISH
            ==================================================================== */}
        {recorderState === 'inactive' && recordedBlob && (
          <form onSubmit={handlePublishSubmit} className="space-y-4">
            {publishSuccess ? (
              <div className="p-6 text-center space-y-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="text-base font-bold text-emerald-950">Lecture Successfully Published!</h4>
                <p className="text-xs text-emerald-800 max-w-md mx-auto">
                  The recording has been attached to this EduBoard and automatically registered in the Student Portal
                  Study Materials for immediate student access.
                </p>
                <div className="flex items-center justify-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={handleDownloadLocal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Backup Copy
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* HTML5 Video Preview Player */}
                {previewUrl && (
                  <div className="rounded-xl overflow-hidden bg-black border border-slate-800 shadow-inner">
                    <video
                      src={previewUrl}
                      controls
                      className="w-full max-h-72 object-contain mx-auto"
                      preload="metadata"
                    />
                  </div>
                )}

                {/* Recording Summary Badges */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    <div className="text-[11px] font-semibold text-slate-500">Duration</div>
                    <div className="text-sm font-bold text-slate-900">{formattedTime}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    <div className="text-[11px] font-semibold text-slate-500">File Size</div>
                    <div className="text-sm font-bold text-slate-900">{formattedMb} MB</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    <div className="text-[11px] font-semibold text-slate-500">Compression</div>
                    <div className="text-sm font-bold text-emerald-600">VP9/VBR 1080p</div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Lecture Title *</label>
                    <input
                      type="text"
                      required
                      value={lectureTitle}
                      onChange={(e) => setLectureTitle(e.target.value)}
                      placeholder="e.g. Quadratic Equations — Lecture 4"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={publishToPortal}
                        onChange={(e) => setPublishToPortal(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-900">
                          Publish directly to Student Portal Study Materials
                        </span>
                        <p className="text-slate-500 mt-0.5">
                          Enrolled students in {board?.standard_name || 'this Standard'} can stream this video lecture
                          on their portal immediately.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Discard confirmation or action bar */}
                {confirmDiscard ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      Are you sure you want to discard this recording?
                    </div>
                    <p className="text-[11px] text-rose-700">This action cannot be undone.</p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={onDiscard}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700"
                      >
                        Yes, Discard Recording
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDiscard(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDiscard(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Discard
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadLocal}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      >
                        <Download className="w-3.5 h-3.5" /> Download WebM
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isPublishing || !lectureTitle.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 shadow-sm"
                    >
                      <UploadCloud className="w-4 h-4" />
                      {isPublishing ? 'Uploading & Publishing...' : 'Save & Publish to Cloud'}
                    </button>
                  </div>
                )}
              </>
            )}
          </form>
        )}
      </div>
    </Modal>
  )
}
