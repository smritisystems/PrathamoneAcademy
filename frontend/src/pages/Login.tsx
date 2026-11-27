/**
 * @file        Login.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pages
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.7.0
 * @created     2026-11-03
 * @updated     2026-11-28
 *
 * @description Premium enterprise authentication portal featuring organic curved wave architecture, original PrathamOne navy/saffron theme colors, single unified Zero-Tab authentication, server-enforced role routing, and comprehensive academic curriculum spectrum overlays.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Eye,
  EyeOff,
  Lock,
  User,
  ShieldCheck,
  ShieldAlert,
  Building2,
  PhoneCall,
  KeyRound,
  GraduationCap,
  Megaphone,
  UserPlus,
  Headphones,
  ArrowRight,
  ChevronRight,
  MapPin,
  Phone,
  Sparkles,
  Zap,
  Coins,
  BookOpen,
  Laptop,
  Monitor,
  Smartphone,
  Info,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import Modal from '../components/Modal'
import { NepRoadmapModal, CoachingLoginBackground, CampusNoticeboardDrawer, SoftwareBrandLogo } from '../components/common'
import { authApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useBranding } from '../config/branding'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import toast from 'react-hot-toast'

const detectClientDevice = () => {
  if (typeof window === 'undefined') {
    return {
      fingerprint: 'fp_generic_' + Math.random().toString(36).substring(2, 10),
      os: 'Desktop OS',
      browser: 'Web Browser',
      deviceType: 'desktop',
      suggestedName: 'Desktop Workstation',
    }
  }

  let fp = localStorage.getItem('prathamone_device_fp')
  if (!fp) {
    const ua = navigator.userAgent || ''
    const raw = `${ua}-${navigator.language || ''}-${window.innerWidth || 1920}x${window.innerHeight || 1080}-${Date.now()}`
    let hash = 0
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i)
      hash |= 0
    }
    fp = `fp_${Math.abs(hash).toString(16)}_${Math.random().toString(36).slice(-4)}`
    localStorage.setItem('prathamone_device_fp', fp)
  }

  const ua = navigator.userAgent || ''
  let os = 'Windows 11 / 10'
  if (ua.includes('Win')) os = 'Windows 11 / 10'
  else if (ua.includes('Mac')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'

  let browser = 'Chrome'
  if (ua.includes('Edg/')) browser = 'Microsoft Edge'
  else if (ua.includes('Chrome/')) browser = 'Google Chrome'
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Apple Safari'
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox'

  let deviceType = 'desktop'
  if (/iPad|Tablet/i.test(ua)) {
    deviceType = 'tablet'
  } else if (/Mobi|Android/i.test(ua)) {
    deviceType = 'mobile'
  }

  const suggestedName = `${os} (${browser})`
  return { fingerprint: fp, os, browser, deviceType, suggestedName }
}

const schema = z.object({
  username: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, token, user } = useAuthStore()
  const branding = useBranding()
  useDocumentTitle('Sign In — PrathamOne EduOS')

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showLoginHelp, setShowLoginHelp] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [showNepModal, setShowNepModal] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [logoLoadFailed, setLogoLoadFailed] = useState(false)

  // Live Monospace Clock for Left Command Panel
  const [currentClock, setCurrentClock] = useState(() => {
    const d = new Date()
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST'
  })

  useEffect(() => {
    const update = () => {
      const d = new Date()
      setCurrentClock(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST')
    }
    const timer = setInterval(update, 10000)
    return () => clearInterval(timer)
  }, [])

  // Interactive Noticeboard & Timetable Ticker States
  const [showNoticeDrawer, setShowNoticeDrawer] = useState(false)
  const [activeTickerIndex, setActiveTickerIndex] = useState(0)

  const TICKER_ITEMS = [
    '📢 Pre-Board & Term-2 Exam Timetable Released for Class 10 & 12',
    '❄️ Winter Session Timings active from 01 Dec: Morning 07:00 AM',
    '🔬 Special NEP 2020 Conceptual Problem-Solving Lab this Saturday',
    '🏆 Annual Academic Merit Award Nominations Open',
  ]

  useEffect(() => {
    const tickerTimer = setInterval(() => {
      setActiveTickerIndex((prev) => (prev + 1) % TICKER_ITEMS.length)
    }, 4500)
    return () => clearInterval(tickerTimer)
  }, [])

  // Device Binding & DPDP Act 2023 Consent States
  const [deviceMeta, setDeviceMeta] = useState<{
    fingerprint: string
    os: string
    browser: string
    deviceType: string
    suggestedName: string
    mac?: string
    isAgent: boolean
  }>(() => {
    const init = detectClientDevice()
    return { ...init, isAgent: false }
  })
  const [customDeviceName, setCustomDeviceName] = useState<string>('')
  const [showConsentModal, setShowConsentModal] = useState<boolean>(false)
  const [deviceConsentChecked, setDeviceConsentChecked] = useState<boolean>(true)
  const [pendingCredentials, setPendingCredentials] = useState<FormData | null>(null)
  const [consentSubmitting, setConsentSubmitting] = useState<boolean>(false)

  useEffect(() => {
    const checkAgent = async () => {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 1200)
        const res = await fetch('http://127.0.0.1:9876/hardware-identity', { signal: controller.signal })
        clearTimeout(timer)
        if (res.ok) {
          const data = await res.json()
          if (data.primary_mac) {
            const agentName = `Workstation [MAC: ${data.primary_mac}]`
            setDeviceMeta((prev) => ({
              ...prev,
              fingerprint: data.device_fingerprint || `mac_${data.primary_mac}`,
              mac: data.primary_mac,
              os: data.os || prev.os,
              suggestedName: agentName,
              isAgent: true,
            }))
            setCustomDeviceName(agentName)
            return
          }
        }
      } catch {
        // Agent offline; fallback to browser fingerprint
      }
      setCustomDeviceName((prev) => prev || deviceMeta.suggestedName)
    }
    checkAgent()
  }, [])

  useEffect(() => {
    setLogoLoadFailed(false)
  }, [branding.assets.logoUrl])

  const hasValidLogo = !!branding.assets.logoUrl && !logoLoadFailed

  // Canonical App Colors (Original Theme Only)
  const primaryBrandColor = branding.colors?.primary || '#0B2D6B'
  const secondaryBrandColor = branding.colors?.secondary || '#071C44'
  const accentBrandColor = branding.colors?.accent || '#F16906'

  useEffect(() => {
    if (token && user) {
      if (user.role === 'student') {
        navigate('/student-portal', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    }
  }, [token, user, navigate])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const executeLogin = async (data: FormData, explicitConsent = false) => {
    setLoading(true)
    try {
      const chosenName = customDeviceName.trim() || deviceMeta.suggestedName
      const resp = await authApi.login(data.username, data.password, {
        fingerprint: deviceMeta.fingerprint,
        name: chosenName,
        type: deviceMeta.deviceType,
        browser: deviceMeta.browser,
        os: deviceMeta.os,
        consent: explicitConsent,
      })
      login('cookie-session', resp.data.user)
      toast.success(`Welcome back, ${resp.data.user.first_name || 'Administrator'}!`)
      setShowConsentModal(false)
      if (resp.data.user.role === 'student') {
        navigate('/student-portal', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || ''
      if (detail.includes('DEVICE_CONSENT_REQUIRED')) {
        setPendingCredentials(data)
        setShowConsentModal(true)
        toast.error('Device registration and consent required for institutional access.')
      } else if (detail.includes('DEVICE_PENDING_APPROVAL')) {
        setShowConsentModal(false)
        toast.error('Device registration submitted with your consent. Administrator approval is required before you can sign in.', { duration: 6000 })
      } else {
        toast.error(detail || 'Authentication failed. Please verify your credentials.')
      }
    } finally {
      setLoading(false)
      setConsentSubmitting(false)
    }
  }

  const onSubmit = (data: FormData) => {
    executeLogin(data, false)
  }

  const handleConfirmConsentAndLogin = () => {
    if (!pendingCredentials) {
      setShowConsentModal(false)
      return
    }
    setConsentSubmitting(true)
    executeLogin(pendingCredentials, true)
  }

  const handleAutofillDefaultAdmin = () => {
    setValue('username', 'admin', { shouldValidate: true })
    setValue('password', 'PrathamOne2026!Admin', { shouldValidate: true })
    toast.success('Default administrator credentials filled.')
  }

  return (
    <div className="relative min-h-screen min-h-[100dvh] w-full flex flex-col lg:flex-row bg-white text-slate-800 overflow-y-auto overflow-x-hidden select-none">
      {/* =========================================================================
          NATIVE CSS KEYFRAMES: CO-ORDINATED ENTRANCE & AMBIENT ANIMATIONS
          ========================================================================= */}
      <style>{`
        @keyframes floatGentle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes pulseSoft {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 1; }
        }
        .anim-float { animation: floatGentle 6s ease-in-out infinite; }
        .anim-pulse { animation: pulseSoft 4s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          *, ::before, ::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
          }
          .anim-float, .anim-pulse {
            transform: none !important;
            opacity: 1 !important;
            animation: none !important;
          }
        }
      `}</style>

      {/* =========================================================================
          LEFT PANEL: DIGNIFIED INSTITUTIONAL EDITORIAL CANVAS
          Featuring Organic Curved Wave Edge and App Original Navy Blue Gradient
          ========================================================================= */}
      <div className="relative w-full lg:w-[54%] xl:w-[56%] shrink-0 text-white flex flex-col justify-between p-6 sm:p-8 lg:p-10 xl:p-14 lg:pr-24 xl:pr-32 overflow-hidden min-h-[460px] lg:min-h-screen z-10 order-2 lg:order-1"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.22), transparent 60%), linear-gradient(135deg, #0a1228 0%, ${secondaryBrandColor} 52%, ${primaryBrandColor} 100%)`,
        }}
      >
        {/* Organic Curved Wave Divider (SVG edge facing the right side on desktop) */}
        <div className="hidden lg:block absolute top-0 bottom-0 -right-1 w-20 xl:w-28 h-full pointer-events-none select-none z-20">
          <svg
            viewBox="0 0 100 900"
            preserveAspectRatio="none"
            className="w-full h-full"
            style={{ fill: 'var(--app-surface)' }}
          >
            <path d="M 0 0 C 40 140, -10 260, 30 400 C 65 520, 0 680, 45 900 L 100 900 L 100 0 Z" />
          </svg>
        </div>

        {/* Ambient Subtle Radial Glow Circles */}
        <div className="absolute top-1/4 left-1/3 w-[36rem] h-[36rem] rounded-full blur-[140px] pointer-events-none opacity-25"
          style={{
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.3) 0%, rgba(11, 45, 107, 0.1) 60%, transparent 80%)',
          }}
        />

        {/* Full Interactive Coaching Ambient Field with Dynamic Institute Watermark & Highlighted Home State */}
        <CoachingLoginBackground
          layout="panel"
          instituteName={branding.academyName}
          instituteState={branding.state || 'Maharashtra'}
          logoUrl={branding.assets.logoUrl}
          background="transparent"
          intensity={1.6}
          logoOpacity={0.28}
          parallax={true}
        />

        {/* TOP STATUS BAR: Operational Session, Notice Ticker & Helpdesk Ribbons */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 w-full">
          {/* Live Academic Session & Time Monospace Chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 backdrop-blur-md shadow-xs select-none shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono tracking-wide text-slate-200 font-medium">
              Academic Session 2026–27
            </span>
            <span className="text-white/20">•</span>
            <span className="text-[11px] font-mono text-cyan-300/80">
              {currentClock}
            </span>
          </div>

          {/* Interactive 1-Line Notice & Timetable Ticker Pill */}
          <button
            type="button"
            onClick={() => setShowNoticeDrawer(true)}
            className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-400/20 hover:border-cyan-400/40 backdrop-blur-md transition-all duration-200 text-left cursor-pointer max-w-[270px] sm:max-w-[320px] xl:max-w-[360px] select-none"
            title="Click to open Campus Noticeboard & Batch Timetables"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 group-hover:scale-125 transition-transform shrink-0" />
            <span className="text-[11px] text-slate-200 group-hover:text-white transition-colors truncate font-sans">
              {TICKER_ITEMS[activeTickerIndex]}
            </span>
            <span className="text-[10.5px] font-mono text-cyan-300 group-hover:translate-x-0.5 transition-transform flex items-center shrink-0 font-medium">
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </button>

          {/* Campus Node / Helpdesk Micro-Pill */}
          <a
            href="mailto:support@prashantacademy.com"
            className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 backdrop-blur-md text-[11px] font-mono text-slate-300 hover:text-white transition-all duration-200 select-none shrink-0"
            title="Institutional Support Desk"
          >
            <Headphones className="w-3.5 h-3.5 text-cyan-400" />
            <span>Campus Helpdesk</span>
          </a>
        </div>

        {/* LOWER SECTION: Cultural Shloka & Institutional Telemetry */}
        <div className="relative z-10 mt-auto pt-6 pb-2 space-y-3.5 max-w-xl">
          {/* Sanskrit Educational Mantra */}
          <div className="border-l-2 border-amber-400/60 pl-3.5 py-0.5">
            <p className="text-sm font-serif tracking-wider text-amber-200/95 font-medium">
              "सा विद्या या विमुक्तये"
            </p>
            <p className="text-[11.5px] text-slate-300/80 font-sans tracking-normal mt-0.5">
              Knowledge is that which liberates the intellect and empowers character.
            </p>
          </div>

          {/* ACCREDITED BOARDS & ENTRANCE WINGS RIBBON (ABOVE FOOTER) */}
          <div className="pt-2 border-t border-white/10 select-none">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-cyan-300/80 mb-2">
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                Accredited Curriculum & Target Wings
              </span>
              <span className="text-slate-400/90 font-mono text-[9.5px]">Comprehensive K-12</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Maharashtra State Board (Priority Home State) */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-400/35 text-amber-300 font-mono text-[10px] font-bold tracking-wide shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                STATE BOARD (HSC • SSC)
              </span>
              {/* CBSE */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 font-mono text-[10px] font-medium transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                CBSE
              </span>
              {/* ICSE • ISC */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 font-mono text-[10px] font-medium transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                ICSE • ISC
              </span>
              {/* MHT-CET */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 font-mono text-[10px] font-medium transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                MHT-CET
              </span>
              {/* NEET-UG */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 font-mono text-[10px] font-medium transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                NEET-UG
              </span>
              {/* JEE ADVANCED */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 font-mono text-[10px] font-medium transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                JEE ADVANCED
              </span>
              {/* FOUNDATION & OLYMPIADS */}
              <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 font-mono text-[10px] font-medium transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                OLYMPIADS • NTSE
              </span>
            </div>
          </div>
        </div>

        {/* Minimalist Bottom Footer Attribution */}
        <div className="relative z-10 pt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-blue-200/50 font-mono tracking-wider border-t border-white/10 select-none">
          <span>{branding.suiteName || 'PRATHAMONE EduOS'} • COACHING INSTITUTE EDITION</span>
          <span>{branding.versionDisplay}</span>
        </div>
      </div>

      {/* =========================================================================
          RIGHT PANEL: SEAMLESS FULL-HEIGHT ENTERPRISE AUTHENTICATION WINDOW
          Full Width & Height Split Pane with Ergonomically Centered Input Workspace
          ========================================================================= */}
      <div className="relative w-full lg:w-[46%] xl:w-[44%] bg-white flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 min-h-[580px] lg:min-h-screen z-20 overflow-hidden order-1 lg:order-2">
        {/* Soft Warm Saffron Ambient Aura in Background */}
        <div
          className="absolute -bottom-12 -right-12 w-80 sm:w-96 h-80 sm:h-96 rounded-full blur-[120px] pointer-events-none opacity-20 select-none"
          style={{
            background: 'radial-gradient(circle, rgba(245, 124, 0, 0.45) 0%, rgba(245, 124, 0, 0.08) 55%, transparent 75%)',
          }}
        />

        {/* Chhatrapati Shivaji Maharaj Equestrian Statue Ambient Watermark */}
        <div
          className="hidden lg:block absolute bottom-0 -right-[75px] h-[95%] pointer-events-none select-none z-0 overflow-hidden opacity-[0.075] dark:opacity-[0.14]"
          aria-hidden="true"
        >
          <img
            src="/artwork/CSM/path1.svg"
            alt=""
            className="h-full w-auto max-w-none object-contain object-right-bottom dark:brightness-0 dark:invert"
          />
        </div>

        {/* Top Status Bar within the Right Pane */}
        <div className="relative z-10 w-full max-w-[460px] mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F16906] shadow-xs shadow-orange-500/50 animate-pulse" />
            <span className="text-app-muted">Account Access</span>
          </div>

          {/* Mobile Quick Noticeboard Pill (Visible on screens < 1024px) */}
          <button
            type="button"
            onClick={() => setShowNoticeDrawer(true)}
            className="lg:hidden inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-[11px] font-mono font-medium transition-colors cursor-pointer select-none"
            title="Open Campus Noticeboard & Batch Timetables"
          >
            <Megaphone className="w-3 h-3 text-cyan-600 animate-pulse" />
            <span>Notices</span>
          </button>

          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <SoftwareBrandLogo
              variant="icon"
              alt=""
              ariaHidden
              className="w-3.5 h-3.5 object-contain opacity-85"
            />
            <span>PrathamOne EduOS</span>
          </div>
        </div>

        {/* Central Authentication Form — Centered Ergonomically at 460px */}
        <div className="relative z-10 w-full max-w-[460px] mx-auto my-auto py-8">
          {/* Institute Brand Header */}
          <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
            <div className="brand-logo-plate w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-slate-200/90 bg-white p-2 flex items-center justify-center shrink-0 shadow-md overflow-hidden">
              {hasValidLogo ? (
                <img
                  src={branding.assets.logoUrl}
                  alt={branding.academyName}
                  onError={() => setLogoLoadFailed(true)}
                  className="w-full h-full object-contain rounded-xl [filter:drop-shadow(0_2px_4px_rgba(0,0,0,0.15))]"
                />
              ) : (
                <div className="w-full h-full bg-[#0B2D6B] rounded-xl flex items-center justify-center font-bold text-lg text-white">
                  {branding.monogram}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-base text-app-text tracking-tight truncate leading-snug">
                {branding.academyName}
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate">
                {branding.tagline || 'Coaching Management System'}
              </p>
            </div>
          </div>

          {/* Saffron Crown Accent Bar */}
          <div className="w-16 h-1 bg-gradient-to-r from-[#F16906] via-[#0B2D6B] to-[#38BDF8] rounded-full mb-4" />

          {/* Heading & Subtitle */}
          <h2 className="text-3xl font-extrabold text-app-text tracking-tight">
            Welcome back
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1 mb-8">
            Sign in to continue to your institute workspace.
          </p>

          {/* Clean Accessible Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Username / Email */}
            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-bold text-slate-700 tracking-wider mb-1.5"
              >
                Email or username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="login-username"
                  {...register('username')}
                  className={`w-full text-sm border rounded-xl pl-10 pr-3.5 py-3.5 bg-slate-50/70 hover:bg-white focus:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2D6B] dark:focus:ring-orange-300 focus:border-[#0B2D6B] dark:focus:border-orange-300 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 transition-colors shadow-2xs ${errors.username ? 'border-rose-400' : 'border-slate-300'
                    }`}
                  placeholder="Enter your email or username"
                  autoComplete="username"
                  aria-invalid={errors.username ? 'true' : 'false'}
                />
              </div>
              {errors.username && (
                <p className="text-rose-600 text-xs font-medium mt-1.5 flex items-center gap-1">
                  <span>•</span> {errors.username.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-bold text-slate-700 tracking-wider mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="login-password"
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className={`w-full text-sm border rounded-xl pl-10 pr-11 py-3.5 bg-slate-50/70 hover:bg-white focus:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2D6B] dark:focus:ring-orange-300 focus:border-[#0B2D6B] dark:focus:border-orange-300 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 transition-colors shadow-2xs ${errors.password ? 'border-rose-400' : 'border-slate-300'
                    }`}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  aria-invalid={errors.password ? 'true' : 'false'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-3.5 p-1 rounded-md text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#0B2D6B] dark:focus:ring-orange-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-rose-600 text-xs font-medium mt-1.5 flex items-center gap-1">
                  <span>•</span> {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember This Device & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-app-muted hover:text-app-text">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-[#0B2D6B] focus:ring-[#0B2D6B] dark:focus:ring-orange-300"
                />
                <span>Remember this device</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs font-semibold text-app-muted hover:text-app-text hover:underline focus:outline-none focus:ring-2 focus:ring-[#0B2D6B] dark:focus:ring-orange-300 rounded-sm transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Sign In Securely CTA Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #0B2D6B 0%, #17458F 100%)',
                boxShadow: '0 4px 14px 0 rgba(11, 45, 107, 0.35)',
              }}
              className="w-full py-3.5 px-4 mt-3 rounded-xl text-base font-semibold text-white hover:brightness-105 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#F16906] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 select-none"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in…</span>
                </span>
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  <span>Sign in securely</span>
                  <ArrowRight className="w-4 h-4 text-amber-300" />
                  <span className="hidden sm:inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/20 border border-white/25 text-white/90 ml-1">
                    ↵ Enter
                  </span>
                </span>
              )}
            </button>

            {/* Device Security & Privacy Status Badge */}
            <div className="pt-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate text-[11px] font-medium text-slate-700">
                  {customDeviceName || deviceMeta.suggestedName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowConsentModal(true)}
                className="text-[11px] font-bold text-[#0B2D6B] hover:text-[#071C44] underline shrink-0 ml-2"
              >
                Review Device Name
              </button>
            </div>
          </form>

          {/* Need Assistance Section */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Need access? Contact your institute administrator.
            </p>
            <div className="flex items-center justify-center gap-4 text-xs font-semibold text-app-muted pt-2">
              <button
                type="button"
                onClick={() => setShowLoginHelp(true)}
                className="inline-flex items-center gap-1 hover:underline transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>First-Time Login</span>
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => setShowLoginHelp(true)}
                className="inline-flex items-center gap-1 hover:underline transition-colors cursor-pointer"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Technical Support</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Pane Footer: Responsive Copyright & Powered By Attribution (Mobile: Option A, Tablet/Desktop: Option B) */}
        <div className="relative z-10 w-full max-w-[460px] mx-auto pt-3.5 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-[11px] text-slate-500">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 sm:flex-col sm:items-start sm:justify-center sm:gap-0.5 leading-relaxed">
            <span>Privacy · Help · Secure Access</span>
            <span>
              © 2026 <strong className="font-semibold text-slate-700">{branding.organization || 'SmritiSys'}</strong> · {branding.suiteName}{' '}
              <span className="font-mono text-[10px] text-slate-400">{branding.versionDisplay}</span>
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2 border-t border-dashed border-slate-200 sm:pt-0 sm:border-t-0 sm:flex-col sm:items-end sm:gap-0.5 shrink-0">
            <span className="text-[9.5px] sm:uppercase sm:tracking-wider text-slate-400 font-medium">
              Powered by
            </span>
            <SoftwareBrandLogo
              variant="full"
              alt={branding.suiteName}
              className="h-7 w-auto object-contain"
            />
          </div>
        </div>

        {/* Accessible Modal: Initial Setup & Support */}
        <Modal
          open={showLoginHelp}
          onClose={() => setShowLoginHelp(false)}
          title="First-Time Sign-In & Technical Support"
          size="md"
        >
          <div className="space-y-4 text-xs text-slate-700 py-1">
            <p className="text-slate-600 leading-relaxed">
              Welcome to <strong>{branding.academyName}</strong>. If you are setting up this workstation for the first time, you can pre-fill your default initial administrator credentials below.
            </p>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-app-text" />
                  Default Initial Credentials
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Ready
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-200 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Username</span>
                  <code className="font-mono font-bold text-slate-900">admin</code>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Initial Password</span>
                  <code className="font-mono font-bold text-slate-900">PrathamOne2026!Admin</code>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleAutofillDefaultAdmin()
                  setShowLoginHelp(false)
                }}
                className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-[#0B2D6B] hover:bg-[#071C44] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Auto-Fill Credentials &amp; Close</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-1.5 text-slate-600">
              <div className="font-semibold text-slate-900">Technical Support &amp; Assistance:</div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-700 font-medium">
                <span>📞 9323 023 007 / 9324 117 007</span>
                <span>✉️ support@prathamone.com</span>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                For student, teacher, or operator password assistance, please contact your coaching institute administrator.
              </p>
            </div>
          </div>
        </Modal>

        {/* Accessible Modal: Device Registration & Consent (DPDP Act 2023) */}
        <Modal
          open={showConsentModal}
          onClose={() => setShowConsentModal(false)}
          title="Device Security & Registration Consent"
          size="lg"
        >
          <div className="space-y-4 text-xs text-slate-700 py-1">
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200/80 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-primary-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-1">
                  Device-Wise Access Authorization
                </h4>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  {branding.academyName} enforces optional hardware-level device binding to protect student records, examination marks, and institutional finances against unauthorized account access.
                </p>
              </div>
            </div>

            {/* Device Friendly Name Customization */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-900 text-xs">
                  Device Friendly Name *
                </label>
                {deviceMeta.isAgent && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                    <Laptop className="w-3 h-3" />
                    Companion Agent Detected
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                value={customDeviceName}
                onChange={(e) => setCustomDeviceName(e.target.value)}
                placeholder="e.g. Physics Lab Laptop, Principal Office PC"
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-1 focus:ring-primary-600 font-medium"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Personalize this name so it is easily identifiable in your security settings and audit history.
              </p>
            </div>

            {/* Hardware Profile Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Platform / OS</span>
                <span className="font-semibold text-slate-800">{deviceMeta.os}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Browser</span>
                <span className="font-semibold text-slate-800">{deviceMeta.browser}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Hardware Signature</span>
                <span className="font-mono font-semibold text-slate-800 truncate block" title={deviceMeta.fingerprint}>
                  {deviceMeta.mac ? `MAC: ${deviceMeta.mac}` : `${deviceMeta.fingerprint.slice(0, 12)}...`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Security Tier</span>
                <span className="font-semibold text-emerald-700">Scoped Tenant</span>
              </div>
            </div>

            {/* DPDP Act 2023 Itemised Disclosure Notice */}
            <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200/70 text-[11px] space-y-1.5 text-slate-700">
              <div className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                <Info className="w-3.5 h-3.5 text-amber-600" />
                <span>Privacy Guarantee &amp; DPDP Act 2023 Disclosure</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[10px]">
                <li><strong>What is shared:</strong> The device name above, browser client type, OS version, and a cryptographic hardware signature.</li>
                <li><strong>What is NEVER accessed:</strong> No personal files, no browser search history, no keystrokes, and no GPS location.</li>
                <li><strong>Purpose:</strong> Multi-factor device binding to prevent unauthorized access from untrusted computers.</li>
              </ul>
            </div>

            {/* Explicit Consent Affirmation */}
            <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={deviceConsentChecked}
                onChange={(e) => setDeviceConsentChecked(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-[11px] text-slate-700 font-medium leading-relaxed">
                I authorize <strong>{branding.academyName}</strong> to register this device name and hardware profile to my account for institutional access.
              </span>
            </label>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConsentModal(false)}
                className="px-3.5 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!deviceConsentChecked || !customDeviceName.trim() || consentSubmitting}
                onClick={handleConfirmConsentAndLogin}
                className="px-4 py-2 bg-[#0B2D6B] hover:bg-[#071C44] text-white rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center gap-2 shadow-xs"
              >
                {consentSubmitting ? (
                  <span>Authorizing...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Authorize &amp; Sign In</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>

        {/* Accessible Modal: Forgot Password Guidance */}
        <Modal
          open={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
          title="Password Recovery & Reset Guidance"
          size="md"
        >
          <div className="space-y-4 text-xs text-slate-700 py-1">
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200/80 flex items-start gap-3">
              <Building2 className="w-5 h-5 text-app-text shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-1">Institutional Password Policy</h4>
                <p className="text-slate-600 leading-relaxed">
                  To maintain coaching data sovereignty and DPDP Act 2023 compliance, password resets are governed by your coaching institute's designated Super Administrator.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-slate-600 leading-relaxed">
              <p>
                <strong>Students &amp; Parents:</strong> Please reach out to your academy front desk or branch coordinator to issue a temporary PIN.
              </p>
              <p>
                <strong>Faculty &amp; Staff:</strong> Contact the principal or system administrator to initiate an authenticated password reset via User Management.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Need immediate emergency access?</span>
              <a
                href="tel:9323023007"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-app-text hover:underline"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call Support</span>
              </a>
            </div>
          </div>
        </Modal>

        {/* NEP 2020 Upcoming Features Milestone Modal */}
        <NepRoadmapModal isOpen={showNepModal} onClose={() => setShowNepModal(false)} />

        {/* Public Campus Noticeboard & Batch Timetable Drawer */}
        <CampusNoticeboardDrawer
          isOpen={showNoticeDrawer}
          onClose={() => setShowNoticeDrawer(false)}
          academyName={branding.academyName}
        />
      </div>
    </div>
  )
}
