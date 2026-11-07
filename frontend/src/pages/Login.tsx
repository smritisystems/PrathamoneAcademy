/**
 * @file        Login.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pages
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.1.0
 * @created     2026-11-03
 * @updated     2026-11-08
 *
 * @description Premium user authentication page featuring abstract educational wave aesthetics, secure credential validation, and role redirection.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { GraduationCap, Eye, EyeOff, Lock, User, ShieldCheck, Sparkles } from 'lucide-react'
import { authApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useBranding } from '../config/branding'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import toast from 'react-hot-toast'

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

const getYoutubeId = (url: string): string => {
  if (!url) return ''
  const trimmed = url.trim()
  if (trimmed.length === 11 && !trimmed.includes('/') && !trimmed.includes('.')) {
    return trimmed
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = trimmed.match(regExp)
  return (match && match[2].length === 11) ? match[2] : trimmed
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, token, user } = useAuthStore()
  const branding = useBranding()
  useDocumentTitle('Sign In')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [logoLoadFailed, setLogoLoadFailed] = useState(false)

  const academyLogo = branding.assets.academyLogoUrl || branding.assets.logoUrl
  const hasValidLogo = !!academyLogo && academyLogo !== '/logo.svg' && !logoLoadFailed

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
      login(resp.data.access_token, resp.data.user)
      toast.success(`Welcome, ${resp.data.user.first_name}!`)
      if (resp.data.user.role === 'student') {
        navigate('/student-portal', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Login failed. Check credentials.')
    } finally {
      setLoading(false)
    }
  }

  const fillCredentials = (user: string, pass: string) => {
    setValue('username', user, { shouldValidate: true })
    setValue('password', pass, { shouldValidate: true })
  }

  return (
    <div className="relative min-h-screen min-h-[100dvh] w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-950 overflow-hidden select-none">
      {/* =========================================================================
          MULTI-MODE LOGIN BACKGROUND ENGINE
          Supports: Dynamic Aurora Waves | Custom Image (Cover/Contain/Stretch/Tile) |
                    Educational SVG Patterns | Ambient HTML5 / YouTube Video
          ========================================================================= */}

      {/* MODE A: CUSTOM CAMPUS / ACADEMY IMAGE BACKGROUND */}
      {branding.background.mode === 'image' && branding.background.imageUrl && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          {branding.background.fit === 'tile' ? (
            <div
              className="absolute inset-0 w-full h-full"
              style={{
                backgroundImage: `url(${branding.background.imageUrl})`,
                backgroundRepeat: 'repeat',
                backgroundSize: '320px auto',
              }}
            />
          ) : (
            <img
              src={branding.background.imageUrl}
              alt={`${branding.academyName} Campus Background`}
              className={`absolute inset-0 w-full h-full ${
                branding.background.fit === 'contain'
                  ? 'object-contain'
                  : branding.background.fit === 'stretch'
                  ? 'object-fill'
                  : 'object-cover'
              }`}
            />
          )}

          {/* Dynamic Contrast & Glassmorphism Overlay Guard */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: `rgba(2, 6, 23, ${(branding.background.overlayOpacity ?? 60) / 100})`,
              backdropFilter: branding.background.blur ? `blur(${branding.background.blur}px)` : undefined,
              WebkitBackdropFilter: branding.background.blur ? `blur(${branding.background.blur}px)` : undefined,
            }}
          />
        </div>
      )}

      {/* MODE B: AMBIENT VIDEO BACKGROUND (HTML5 MP4 OR YOUTUBE) */}
      {branding.background.mode === 'video' && branding.background.videoUrl && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          {branding.background.videoType === 'youtube' ? (
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <iframe
                title="Login Background Video"
                className="w-[180vw] h-[180vh] min-w-[1280px] min-h-[720px] pointer-events-none opacity-85"
                src={`https://www.youtube.com/embed/${getYoutubeId(branding.background.videoUrl)}?autoplay=1&mute=1&controls=0&loop=1&playlist=${getYoutubeId(branding.background.videoUrl)}&showinfo=0&rel=0&iv_load_policy=3&disablekb=1&modestbranding=1&enablejsapi=1`}
                allow="autoplay; encrypted-media"
                style={{ border: 'none' }}
              />
            </div>
          ) : (
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              src={branding.background.videoUrl}
            />
          )}

          {/* Video Contrast & Legibility Overlay */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: `rgba(2, 6, 23, ${(branding.background.overlayOpacity ?? 65) / 100})`,
              backdropFilter: branding.background.blur ? `blur(${branding.background.blur}px)` : undefined,
              WebkitBackdropFilter: branding.background.blur ? `blur(${branding.background.blur}px)` : undefined,
            }}
          />
        </div>
      )}

      {/* MODE C: SVG EDUCATIONAL & GEOMETRIC PATTERNS */}
      {branding.background.mode === 'svg_pattern' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none bg-slate-950">
          {branding.background.pattern === 'dots' && (
            <div
              className="absolute inset-0 opacity-25"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, ${branding.colors.primary} 1.5px, transparent 0)`,
                backgroundSize: '24px 24px',
              }}
            />
          )}
          {branding.background.pattern === 'blueprint' && (
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `linear-gradient(to right, ${branding.colors.secondary} 1px, transparent 1px), linear-gradient(to bottom, ${branding.colors.secondary} 1px, transparent 1px)`,
                backgroundSize: '36px 36px',
              }}
            />
          )}
          {branding.background.pattern === 'lattice' && (
            <div
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage: `radial-gradient(ellipse at center, ${branding.colors.primary} 2px, transparent 2px)`,
                backgroundSize: '48px 48px',
              }}
            />
          )}
          {(!branding.background.pattern || branding.background.pattern === 'geometric') && (
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, ${branding.colors.accent} 1px, transparent 0), linear-gradient(45deg, transparent 48%, ${branding.colors.primary}20 50%, transparent 52%)`,
                backgroundSize: '32px 32px, 64px 64px',
              }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at center, transparent 30%, #020617 85%)`,
            }}
          />
        </div>
      )}

      {/* MODE D (DEFAULT): DYNAMIC BRAND MESH & AURORA WAVES */}
      {(!branding.background.mode || branding.background.mode === 'waves') && (
        <>
          {/* Dynamic Institution-Themed Atmospheric Backdrop */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 10% 20%, ${branding.colors.primary}25 0%, #020617 55%), radial-gradient(circle at 90% 80%, ${branding.colors.secondary}20 0%, #020617 65%)`,
            }}
          />

          {/* Soft Dynamic Ambient Light Effects */}
          <div
            className="absolute -top-36 -left-36 w-96 h-96 rounded-full blur-3xl pointer-events-none"
            style={{ backgroundColor: `${branding.colors.primary}35` }}
          />
          <div
            className="absolute top-1/4 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none"
            style={{ backgroundColor: `${branding.colors.secondary}25` }}
          />
          <div
            className="absolute -bottom-36 left-1/4 w-[32rem] h-[32rem] rounded-full blur-3xl pointer-events-none"
            style={{ backgroundColor: `${branding.colors.accent}20` }}
          />

          {/* Subtle Technology Dot Grid Pattern */}
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, #ffffff 1.5px, transparent 0)',
              backgroundSize: '28px 28px',
            }}
          />

          {/* Elegant Abstract Flowing Waves SVG Layer (Dynamic Brand Hues) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
            <svg
              className="w-full h-full min-w-[900px] object-cover"
              viewBox="0 0 1440 900"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="wave1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={branding.colors.secondary} stopOpacity="0.45" />
                  <stop offset="45%" stopColor={branding.colors.primary} stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="wave2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={branding.colors.accent} stopOpacity="0.35" />
                  <stop offset="50%" stopColor={branding.colors.secondary} stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="wave3" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={branding.colors.primary} stopOpacity="0.3" />
                  <stop offset="60%" stopColor={branding.colors.secondary} stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0" />
                </linearGradient>
              </defs>

              <path
                d="M-100,560 C260,380 620,720 1080,480 C1320,350 1480,420 1600,470 L1600,950 L-100,950 Z"
                fill="url(#wave1)"
              />
              <path
                d="M-50,680 C220,540 680,780 1140,590 C1380,490 1520,560 1650,610 L1650,950 L-50,950 Z"
                fill="url(#wave2)"
              />
              <path
                d="M-80,320 C320,480 720,180 1160,400 C1390,510 1520,380 1620,350 L1620,0 L-80,0 Z"
                fill="url(#wave3)"
              />
            </svg>
          </div>
        </>
      )}

      {/* Atmospheric Contrast Vignette */}
      <div className="absolute inset-0 bg-radial from-transparent via-slate-950/20 to-slate-950/70 pointer-events-none" />

      {/* 6. Main Login Container */}
      <div className="relative z-10 w-full max-w-md select-text">
        {/* Subtle glowing halo behind card */}
        <div
          className="absolute -inset-1 rounded-3xl blur-xl opacity-70 transition-opacity"
          style={{
            background: `linear-gradient(135deg, ${branding.colors.primary}50 0%, ${branding.colors.secondary}40 50%, ${branding.colors.accent}40 100%)`,
          }}
        />

        {/* White Card */}
        <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl shadow-slate-950/60 overflow-hidden border border-slate-100">
          {/* Header */}
          <div
            className="relative px-6 sm:px-8 py-7 sm:py-8 text-center overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${branding.colors.primary} 0%, ${branding.colors.secondary} 100%)`,
            }}
          >
            {/* Subtle decorative vector rings in header */}
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full border border-white/10 pointer-events-none" />
            <div className="absolute -left-6 -bottom-6 w-24 h-24 rounded-full border border-white/10 pointer-events-none" />

            {/* Coaching Institute Official Crest / Monogram Badge */}
            <div className="relative inline-flex items-center justify-center bg-white p-1.5 w-16 h-16 rounded-2xl shadow-lg border border-white/40 mx-auto mb-3.5 group transition-transform hover:scale-105 duration-300">
              {hasValidLogo ? (
                <img
                  src={academyLogo}
                  alt={`${branding.academyName} Official Logo`}
                  onError={() => setLogoLoadFailed(true)}
                  className="w-full h-full object-contain filter drop-shadow-xs"
                />
              ) : (
                <div
                  className="w-full h-full rounded-xl flex items-center justify-center text-white font-serif font-black text-xl sm:text-2xl shadow-inner select-none tracking-wider border border-white/20"
                  style={{
                    background: `linear-gradient(135deg, ${branding.colors.primary} 0%, ${branding.colors.secondary} 100%)`,
                  }}
                  title={branding.academyName}
                >
                  {branding.monogram}
                </div>
              )}
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-primary-900 shadow-xs" title="Institute Portal Online" />
            </div>

            <h1 className="text-2xl sm:text-[26px] font-bold text-white tracking-tight drop-shadow-xs">
              {branding.academyName}
            </h1>
            <p className="text-blue-100/90 text-xs sm:text-sm font-medium mt-1">
              {branding.tagline}
            </p>

            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-blue-100">
              <Sparkles className="w-3 h-3 text-cyan-300" />
              <span>{branding.suiteName}</span>
            </div>
          </div>

          {/* Form Section */}
          <div className="px-6 sm:px-8 py-6 sm:py-7 bg-white">
            <div className="mb-5">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Sign in to your portal
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter your credentials to access dashboard and student records
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Username or Email
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    {...register('username')}
                    className="w-full text-sm border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400 transition-colors shadow-2xs"
                    placeholder="e.g. admin"
                    autoComplete="username"
                  />
                </div>
                {errors.username && (
                  <p className="text-rose-500 text-xs font-medium mt-1 flex items-center gap-1">
                    <span>•</span> {errors.username.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className="w-full text-sm border border-slate-300 rounded-xl pl-10 pr-11 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400 transition-colors shadow-2xs"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-rose-500 text-xs font-medium mt-1 flex items-center gap-1">
                    <span>•</span> {errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: `linear-gradient(135deg, ${branding.colors.primary} 0%, ${branding.colors.secondary} 100%)`,
                  boxShadow: `0 4px 14px 0 ${branding.colors.primary}40`,
                }}
                className="w-full py-3 px-4 mt-2 rounded-xl text-sm font-semibold text-white hover:brightness-105 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md" 
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in…</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-200" />
                    <span>Secure Sign In</span>
                  </span>
                )}
              </button>
            </form>

            {/* Quick Demo Credentials Assistant */}
            <div className="mt-6 p-3.5 bg-slate-50/90 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Quick Access Profiles
                </span>
                <span className="text-[10px] text-slate-400">Click to fill</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => fillCredentials('admin', 'admin123')}
                  className="flex flex-col items-start p-2 rounded-lg bg-white border border-slate-200 hover:border-primary-400 hover:bg-primary-50/40 transition-colors text-left group"
                >
                  <span className="font-semibold text-slate-800 group-hover:text-primary-700">Administrator</span>
                  <span className="text-[11px] text-slate-500 font-mono">admin / admin123</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('accountant', 'account123')}
                  className="flex flex-col items-start p-2 rounded-lg bg-white border border-slate-200 hover:border-primary-400 hover:bg-primary-50/40 transition-colors text-left group"
                >
                  <span className="font-semibold text-slate-800 group-hover:text-primary-700">Accountant</span>
                  <span className="text-[11px] text-slate-500 font-mono">accountant / •••</span>
                </button>
              </div>
            </div>

            {/* Security / Attribution Footer */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col items-center gap-2 text-center select-none">
              <img
                src={branding.assets.horizontalLogoTransparentUrl}
                alt="PrathamOne EduOS — Coaching Institutes Suite"
                className="h-7 w-auto object-contain filter drop-shadow-xs opacity-90 hover:opacity-100 transition-opacity"
              />
              <p className="text-[10.5px] text-slate-400">
                {branding.copyright} • DPDP Act 2023 Compliant
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
