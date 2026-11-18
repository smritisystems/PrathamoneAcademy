/**
 * @file        ProductVideoTourCard.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.src.components.help
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-18
 * @updated     2026-11-18
 *
 * @description Official promotional motion graphic video showcase player with responsive 16:9 viewport, cut selection (20s cinematic vs 10s fast tour), and official branded watermark overlay masking third-party generator marks.
 */

import { useRef, useState } from 'react'
import { Film, Play, RotateCcw, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { useBranding } from '../../config/branding'

interface ProductVideoTourCardProps {
  title?: string
  subtitle?: string
  defaultCut?: 'v2' | 'v1'
  className?: string
  compact?: boolean
}

export default function ProductVideoTourCard({
  title = 'PrathamOne EduOS — Official Platform Overview Tour',
  subtitle = 'Experience the unified coaching operating system: admissions, fee counter, live attendance, and automated communications.',
  defaultCut = 'v2',
  className = '',
  compact = false,
}: ProductVideoTourCardProps) {
  const branding = useBranding()
  const [selectedCut, setSelectedCut] = useState<'v2' | 'v1'>(defaultCut)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  const activeSrc =
    selectedCut === 'v2'
      ? branding.assets.promotionalVideoV2Url || '/artwork/VIDEOS/V2.mp4'
      : branding.assets.promotionalVideoV1Url || '/artwork/VIDEOS/V1.mp4'

  const handlePlayToggle = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play()
      setIsPlaying(true)
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleMuteToggle = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
    setIsMuted(videoRef.current.muted)
  }

  const handleCutChange = (cut: 'v2' | 'v1') => {
    setSelectedCut(cut)
    setIsPlaying(false)
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4 ${className}`}
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-indigo-50 text-indigo-600">
              <Film className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>3D Motion Graphics</span>
            </span>
          </div>
          {!compact && <p className="text-xs text-slate-500 max-w-2xl">{subtitle}</p>}
        </div>

        {/* Video Cut Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
          <button
            type="button"
            onClick={() => handleCutChange('v2')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedCut === 'v2'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Cinematic Extended Cut (20s) with comprehensive multi-module animations"
          >
            20s Cinematic Cut
          </button>
          <button
            type="button"
            onClick={() => handleCutChange('v1')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedCut === 'v1'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Fast Overview (10s) high-speed summary cut"
          >
            10s Fast Tour
          </button>
        </div>
      </div>

      {/* Video Viewport Container (16:9 Widescreen) */}
      <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-950 border border-slate-800 shadow-inner group">
        <video
          ref={videoRef}
          key={activeSrc}
          src={activeSrc}
          controls
          playsInline
          muted={isMuted}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="w-full h-full object-contain"
        />

        {/* OFFICIAL PRATHAMONE WATERMARK OVERLAY (Covers generator marks in bottom-right corner) */}
        <div
          className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/90 backdrop-blur-md border border-white/20 shadow-md transition-opacity group-hover:opacity-95 select-none"
          title="PrathamOne EduOS Official Production"
        >
          <img
            src={branding.assets.softwareIconSvgUrl}
            alt=""
            aria-hidden="true"
            className="w-3.5 h-3.5 object-contain"
          />
          <span className="text-[10px] font-bold tracking-wider uppercase text-white drop-shadow-xs">
            PrathamOne
          </span>
        </div>

        {/* Top-Left Format Pill */}
        <div className="absolute top-3 left-3 z-20 pointer-events-none flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-[10px] font-bold text-slate-200 border border-white/10">
            720p HD · 16:9
          </span>
          <span className="px-2 py-0.5 rounded-md bg-indigo-950/80 backdrop-blur-xs text-[10px] font-bold text-indigo-200 border border-indigo-400/20">
            {selectedCut === 'v2' ? '20.0s Full Showcase' : '10.0s Fast Summary'}
          </span>
        </div>
      </div>

      {/* Footer Info Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pt-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Format: H.264 / AAC High Profile</span>
          </span>
          <span className="hidden sm:inline text-slate-300">·</span>
          <span className="hidden sm:inline">Engine: PrathamOne EduOS 3D Motion Graphics</span>
        </div>

        <div className="text-[11px] font-medium text-slate-400">
          SmritiSys &amp; AITDL Networks · Proprietary Media
        </div>
      </div>
    </div>
  )
}
