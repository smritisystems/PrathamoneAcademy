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
 * @version     1.6.0
 * @created     2026-11-03
 * @updated     2026-11-16
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
  Building2,
  PhoneCall,
  KeyRound,
  GraduationCap,
  Megaphone,
  UserPlus,
  Headphones,
  ArrowRight,
  MapPin,
  Phone,
  Sparkles,
  Zap,
  Coins,
  BookOpen,
} from 'lucide-react'
import Modal from '../components/Modal'
import { authApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useBranding } from '../config/branding'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import toast from 'react-hot-toast'

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
  const [rememberMe, setRememberMe] = useState(false)

  // Canonical App Colors (Original Theme Only)
  const primaryBrandColor = branding.colors?.primary || '#0B2D6B'
  const secondaryBrandColor = branding.colors?.secondary || '#071C44'
  const accentBrandColor = branding.colors?.accent || '#F57C00'

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

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const resp = await authApi.login(data.username, data.password)
      login('cookie-session', resp.data.user)
      toast.success(`Welcome back, ${resp.data.user.first_name || 'Administrator'}!`)
      if (resp.data.user.role === 'student') {
        navigate('/student-portal', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Authentication failed. Please verify your credentials.')
    } finally {
      setLoading(false)
    }
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
      <div className="relative w-full lg:w-[54%] xl:w-[56%] shrink-0 text-white flex flex-col justify-between p-6 sm:p-8 lg:p-10 xl:p-14 lg:pr-24 xl:pr-32 overflow-hidden min-h-[460px] lg:min-h-screen z-10"
        style={{
          background: `linear-gradient(145deg, #051632 0%, ${secondaryBrandColor} 45%, ${primaryBrandColor} 100%)`,
        }}
      >
        {/* Organic Curved Wave Divider (SVG edge facing the right side on desktop) */}
        <div className="hidden lg:block absolute top-0 bottom-0 -right-1 w-20 xl:w-28 h-full pointer-events-none select-none z-20">
          <svg
            viewBox="0 0 100 900"
            preserveAspectRatio="none"
            className="w-full h-full text-white fill-current"
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

        {/* Subtle Watermark 1: Classical Greek University Portico (Bottom-Left) */}
        <div className="absolute -bottom-10 -left-10 w-72 h-72 sm:w-88 sm:h-88 pointer-events-none opacity-[0.06] text-[#38BDF8]">
          <svg viewBox="0 0 240 240" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.3">
            <polygon points="20,75 120,25 220,75" strokeWidth="1.8" />
            <line x1="30" y1="72" x2="210" y2="72" strokeWidth="1" />
            <circle cx="120" cy="55" r="9" strokeWidth="1.2" />
            <rect x="25" y="75" width="190" height="15" rx="1.5" strokeWidth="1.4" />
            <line x1="25" y1="82" x2="215" y2="82" strokeWidth="0.8" strokeDasharray="4 4" />
            <rect x="38" y="90" width="18" height="6" rx="1" />
            <line x1="47" y1="96" x2="47" y2="190" strokeWidth="0.9" />
            <rect x="37" y="190" width="20" height="6" rx="1" />
            <rect x="86" y="90" width="18" height="6" rx="1" />
            <line x1="95" y1="96" x2="95" y2="190" strokeWidth="0.9" />
            <rect x="85" y="190" width="20" height="6" rx="1" />
            <rect x="136" y="90" width="18" height="6" rx="1" />
            <line x1="145" y1="96" x2="145" y2="190" strokeWidth="0.9" />
            <rect x="135" y="190" width="20" height="6" rx="1" />
            <rect x="184" y="90" width="18" height="6" rx="1" />
            <line x1="193" y1="96" x2="193" y2="190" strokeWidth="0.9" />
            <rect x="183" y="190" width="20" height="6" rx="1" />
            <rect x="22" y="196" width="196" height="7" rx="0.5" strokeWidth="1.2" />
            <rect x="15" y="203" width="210" height="8" rx="0.5" strokeWidth="1.4" />
            <rect x="8" y="211" width="224" height="9" rx="0.5" strokeWidth="1.6" />
          </svg>
        </div>

        {/* Subtle Watermark 2: Open Academic Book Line-Art (Center-Bottom) */}
        <div className="absolute bottom-12 right-12 lg:right-24 w-52 h-36 pointer-events-none opacity-[0.08] text-cyan-300">
          <svg viewBox="0 0 216 113" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M 0 41 Q 54 11 108 41 V 113 Q 54 83 0 113 Z" fill="currentColor" fillOpacity="0.08" />
            <path d="M 108 41 Q 162 11 216 41 V 113 Q 162 83 108 113 Z" fill="currentColor" fillOpacity="0.05" />
            <line x1="108" y1="42" x2="108" y2="112" strokeWidth="1.5" />
            <circle cx="108" cy="42" r="3" fill="#38BDF8" />
          </svg>
        </div>

        {/* Top Header Block: Academy Crest, Name & Edition */}
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Elevated Academy Crest (Book + Flame) */}
            <div className="relative bg-gradient-to-br from-[#0D2852] to-[#071C44] border-2 border-cyan-400/40 shadow-lg shadow-black/40 p-1.5 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0">
              <svg viewBox="0 0 64 64" className="w-full h-full" fill="none">
                <path d="M 32 47 C 22 43 12 44 8 48 C 8 38 20 37 32 39.5 Z" fill="#FFFFFF" fillOpacity="0.98" />
                <path d="M 32 47 C 42 43 52 44 56 48 C 56 38 44 37 32 39.5 Z" fill="#FFFFFF" fillOpacity="0.98" />
                <path d="M 8 49 C 18 45 26 46.5 32 49 C 38 46.5 46 45 56 49" stroke="#38BDF8" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M 29.5 37 L 34.5 37 L 33 47 L 31 47 Z" fill="#F1F5F9" />
                <rect x="27" y="34" width="10" height="3.5" rx="1.5" fill="#FFFFFF" />
                <path d="M 32 12 C 38.5 19 43.5 26 40 33 C 38 35.5 35 36.5 32 36.5 C 29 36.5 26 35.5 24 33 C 20.5 26 25.5 19 32 12 Z" fill="url(#brandFlameGrad)" />
                <path d="M 32 20 C 34.5 23.5 36.5 27 35.5 31 C 34.5 32.5 33.5 33.5 32 33.5 C 30.5 33.5 29.5 32.5 28.5 31 C 27.5 27 29.5 23.5 32 20 Z" fill="#FFFFFF" />
                <defs>
                  <linearGradient id="brandFlameGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="30%" stopColor="#67E8F9" />
                    <stop offset="100%" stopColor="#0284C7" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#071C44] shadow-xs" title="Portal Active" />
            </div>

            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white drop-shadow-xs truncate">
                {branding.academyName}
              </h1>
              <p className="text-xs text-blue-200/80 font-semibold tracking-wider uppercase mt-0.5">
                PrathamOne EduOS • Coaching Management. Simplified.
              </p>
            </div>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-blue-100">
            <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
            <span>Academic Session 2026–2027</span>
          </div>
        </div>

        {/* Central Editorial Branding & Value Proposition */}
        <div className="relative z-10 my-8 lg:my-auto max-w-lg space-y-4 sm:space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-bold tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>A Better Way to Learn &amp; Manage</span>
          </div>

          <h2 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-tight">
            One connected home for every learner.
          </h2>

          <p className="text-blue-100/90 text-sm sm:text-base leading-relaxed font-normal">
            Bring academic operations, faculty pedagogy, and student success together in one thoughtfully designed coaching workspace.
          </p>

          {/* 3 Core Operational Pillars */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-blue-100 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
              <span>Academic Operations</span>
            </span>
            <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-blue-100 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Teaching &amp; Pedagogy</span>
            </span>
            <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-blue-100 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Student Success</span>
            </span>
          </div>

          {/* Academic Curriculum Spectrum Matrix (Boards, Grades, Medium & Targets) */}
          <div className="bg-[#071C44]/80 border border-cyan-500/25 rounded-2xl p-3.5 backdrop-blur-md shadow-inner space-y-2 mt-4">
            <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-cyan-300">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Curriculum &amp; Target Competitive Programs</span>
              </span>
              <span className="text-[9.5px] font-medium text-blue-200/80">English &amp; Semi-English Medium</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-[11px] font-medium">
              <div className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-400/20 text-blue-200 flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                <span className="truncate">CBSE • ICSE • State Board</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-400/20 text-cyan-200 flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                <span className="truncate">Class 8th – 10th Foundation</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-400/20 text-emerald-200 flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="truncate">11th–12th JEE • NEET • CET</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-400/20 text-amber-200 flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span className="truncate">Commerce &amp; CA Foundation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Left Footer Attribution */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-200/70">
          <span className="font-medium text-white/90">
            A calm, secure workspace for your coaching institute.
          </span>
          <span className="font-mono text-[11px]">
            SMRITISYS &amp; AITDL NETWORKS • v1.0.0
          </span>
        </div>
      </div>

      {/* =========================================================================
          RIGHT PANEL: SEAMLESS FULL-HEIGHT ENTERPRISE AUTHENTICATION WINDOW
          Full Width & Height Split Pane with Ergonomically Centered Input Workspace
          ========================================================================= */}
      <div className="relative w-full lg:w-[46%] xl:w-[44%] bg-white flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 min-h-[580px] lg:min-h-screen z-20 overflow-hidden">
        {/* Soft Warm Saffron Ambient Aura in Background */}
        <div
          className="absolute -bottom-12 -right-12 w-80 sm:w-96 h-80 sm:h-96 rounded-full blur-[120px] pointer-events-none opacity-20 select-none"
          style={{
            background: 'radial-gradient(circle, rgba(245, 124, 0, 0.45) 0%, rgba(245, 124, 0, 0.08) 55%, transparent 75%)',
          }}
        />

        {/* Subtle Mumbai Skyline Silhouette in Lower Background */}
        <div className="hidden lg:block absolute bottom-0 left-0 right-0 h-28 pointer-events-none select-none opacity-[0.06] text-slate-400 z-0 overflow-hidden">
          <svg viewBox="0 0 600 160" className="w-full h-full" fill="currentColor" preserveAspectRatio="xMidYMax meet">
            <g opacity="0.8">
              <rect x="20" y="65" width="26" height="95" />
              <rect x="50" y="50" width="34" height="110" />
              <rect x="88" y="75" width="28" height="85" />
              <rect x="120" y="55" width="38" height="105" />
              <rect x="162" y="40" width="35" height="120" />
              <rect x="201" y="68" width="30" height="92" />
              <rect x="235" y="78" width="32" height="82" />
              <rect x="270" y="105" width="90" height="55" />
            </g>
            <g stroke="currentColor" strokeWidth="0.8">
              <polygon points="475,15 485,15 498,120 488,120 480,45 472,120 462,120" fill="currentColor" />
              <rect x="468" y="70" width="24" height="4" fill="currentColor" />
              <line x1="480" y1="30" x2="370" y2="120" strokeWidth="0.8" />
              <line x1="480" y1="38" x2="420" y2="120" strokeWidth="0.8" />
              <line x1="480" y1="48" x2="465" y2="120" strokeWidth="0.8" />
              <line x1="480" y1="48" x2="495" y2="120" strokeWidth="0.8" />
              <line x1="480" y1="38" x2="540" y2="120" strokeWidth="0.8" />
              <line x1="480" y1="30" x2="590" y2="120" strokeWidth="0.8" />
              <rect x="350" y="120" width="250" height="6" rx="1" fill="currentColor" />
            </g>
          </svg>
        </div>

        {/* Top Status Bar within the Right Pane */}
        <div className="relative z-10 w-full max-w-[460px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F57C00] shadow-xs shadow-orange-500/50 animate-pulse" />
            <span className="text-[#0B2D6B]">Account Access</span>
          </div>
          <div className="text-[11px] font-semibold text-slate-400">
            PrathamOne EduOS
          </div>
        </div>

        {/* Central Authentication Form — Centered Ergonomically at 460px */}
        <div className="relative z-10 w-full max-w-[460px] mx-auto my-auto py-8">
          {/* Saffron Crown Accent Bar */}
          <div className="w-16 h-1 bg-gradient-to-r from-[#F57C00] via-[#0B2D6B] to-[#38BDF8] rounded-full mb-4" />

          {/* Heading & Subtitle */}
          <h2 className="text-3xl font-extrabold text-[#071C44] tracking-tight">
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
                  className={`w-full text-sm border rounded-xl pl-10 pr-3.5 py-3.5 bg-slate-50/70 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B2D6B] focus:border-[#0B2D6B] text-slate-900 placeholder-slate-400 transition-colors shadow-2xs ${
                    errors.username ? 'border-rose-400' : 'border-slate-300'
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
                  className={`w-full text-sm border rounded-xl pl-10 pr-11 py-3.5 bg-slate-50/70 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B2D6B] focus:border-[#0B2D6B] text-slate-900 placeholder-slate-400 transition-colors shadow-2xs ${
                    errors.password ? 'border-rose-400' : 'border-slate-300'
                  }`}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  aria-invalid={errors.password ? 'true' : 'false'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-3.5 p-1 rounded-md text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#0B2D6B] transition-colors"
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
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-[#0B2D6B] focus:ring-[#0B2D6B]"
                />
                <span>Remember this device</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs font-semibold text-[#0B2D6B] hover:text-[#071C44] hover:underline focus:outline-none focus:ring-2 focus:ring-[#0B2D6B] rounded-sm transition-colors cursor-pointer"
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
              className="w-full py-3.5 px-4 mt-3 rounded-xl text-base font-semibold text-white hover:brightness-105 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#F57C00] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
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
                </span>
              )}
            </button>
          </form>

          {/* Need Assistance Section */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Need access? Contact your institute administrator.
            </p>
            <div className="flex items-center justify-center gap-4 text-xs font-semibold text-[#0B2D6B] pt-2">
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

        {/* Bottom Pane Footer: Privacy, Help & Attribution */}
        <div className="relative z-10 w-full max-w-[460px] mx-auto pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
          <div>Privacy · Help · Secure Access</div>
          <div>© 2026 PrathamOne EduOS v1.0.0</div>
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
                  <KeyRound className="w-4 h-4 text-[#0B2D6B]" />
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

        {/* Accessible Modal: Forgot Password Guidance */}
        <Modal
          open={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
          title="Password Recovery & Reset Guidance"
          size="md"
        >
          <div className="space-y-4 text-xs text-slate-700 py-1">
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200/80 flex items-start gap-3">
              <Building2 className="w-5 h-5 text-[#0B2D6B] shrink-0 mt-0.5" />
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
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B2D6B] hover:underline"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call Support</span>
              </a>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}
