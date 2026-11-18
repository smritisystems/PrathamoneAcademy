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
 * @version     1.135.1
 * @created     2026-11-18
 * @updated     2026-11-19
 *
 * @description Official promotional motion graphic video showcase player with responsive half-width split layout, key platform highlights, cut selection (20s cinematic vs 10s fast tour), and official branded watermark overlay.
 */

import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Film,
  Sparkles,
  Users,
  Receipt,
  GraduationCap,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import { useBranding } from '../../config/branding'

interface ProductVideoTourCardProps {
  title?: string
  subtitle?: string
  defaultCut?: 'v2' | 'v1'
  className?: string
  compact?: boolean
}

const CORE_CAPABILITIES = [
  {
    icon: Users,
    title: 'Admissions & CRM Engine',
    desc: 'Lead capture, follow-up scheduler, counselling logs, and one-click student admission.',
    color: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  {
    icon: Receipt,
    title: 'Automated Fee Counter',
    desc: 'Instant A4/A5 vouchers, concession schemes, aging receivables, and ledger audit trail.',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  },
  {
    icon: GraduationCap,
    title: 'Academics & Analytics',
    desc: 'Live attendance, batch timetable matrix, exam tracking, and graphical student report cards.',
    color: 'bg-amber-50 text-amber-600 border-amber-200',
  },
  {
    icon: ShieldCheck,
    title: 'Multi-Path Cloud Backups',
    desc: 'Zero-data-loss fail-safe with USB, office NAS, Google Drive, and Cloudflare R2 / AWS S3.',
    color: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  },
]

export default function ProductVideoTourCard({
  title = 'PrathamOne EduOS — System Walkthrough & Feature Tour',
  subtitle = 'Experience the unified coaching operating system: admissions, fee counter, live attendance, and automated communications.',
  defaultCut = 'v2',
  className = '',
  compact = false,
}: ProductVideoTourCardProps) {
  const branding = useBranding()
  const [selectedCut, setSelectedCut] = useState<'v2' | 'v1'>(defaultCut)
  const [, setIsPlaying] = useState(false)
  const [isMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  const activeSrc =
    selectedCut === 'v2'
      ? branding.assets.promotionalVideoV2Url || '/artwork/VIDEOS/V2.mp4'
      : branding.assets.promotionalVideoV1Url || '/artwork/VIDEOS/V1.mp4'

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
      data-testid="product-video-tour-card"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
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

      {/* Half-Page Split Hero: Left 50% Video Viewport, Right 50% Platform Capabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
        {/* Left Column: Focused 16:9 Video Player (Half Width) */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-2.5">
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
              className="absolute bottom-3 right-3 sm:bottom-3.5 sm:right-3.5 z-20 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950/90 backdrop-blur-md border border-white/20 shadow-md transition-opacity group-hover:opacity-95 select-none"
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
            <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-[9.5px] font-bold text-slate-200 border border-white/10">
                720p HD · 16:9
              </span>
              <span className="px-2 py-0.5 rounded-md bg-indigo-950/80 backdrop-blur-xs text-[9.5px] font-bold text-indigo-200 border border-indigo-400/20">
                {selectedCut === 'v2' ? '20.0s Full Showcase' : '10.0s Fast Summary'}
              </span>
            </div>
          </div>

          {/* Under-Video Encoding Meta */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>H.264 / AAC Stereo · Zero-Buffer Local Streaming</span>
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {selectedCut === 'v2' ? '20s Cut' : '10s Cut'}
            </span>
          </div>
        </div>

        {/* Right Column: Key Platform Capabilities (Half Width) */}
        <div className="lg:col-span-6 flex flex-col justify-between rounded-xl bg-gradient-to-br from-slate-50 via-indigo-50/25 to-slate-50/80 p-4 sm:p-4.5 border border-slate-200/80 space-y-3">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Unified Platform Highlights</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Production Ready</span>
              </span>
            </div>

            {/* 4 Feature Capability Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CORE_CAPABILITIES.map((cap) => {
                const Icon = cap.icon
                return (
                  <div
                    key={cap.title}
                    className="p-2.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs hover:border-indigo-200 transition-colors space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`p-1 rounded-md border text-xs shrink-0 ${cap.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <h3 className="text-xs font-bold text-slate-900 leading-tight">
                        {cap.title}
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      {cap.desc}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick Access Action Bar */}
          <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Zero-Data-Loss Fail-Safe &amp; Daily Auto-Backups</span>
            </span>

            <Link
              to="/help?section=getting_started"
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Explore Guides</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
