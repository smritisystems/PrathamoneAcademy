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
 * @updated     2026-11-05
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

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, token, user } = useAuthStore()
  const branding = useBranding()
  useDocumentTitle('Sign In')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

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
      {/* 1. Deep Academic Blue Gradient Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#071739] to-[#0a1e47] pointer-events-none" />

      {/* 2. Soft Ambient Light Effects (Cyan & Indigo Halos) */}
      <div className="absolute -top-36 -left-36 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 -right-24 w-80 h-80 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-36 left-1/4 w-[32rem] h-[32rem] bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* 3. Subtle Technology Dot Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, #93c5fd 1.5px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* 4. Elegant Abstract Flowing Waves SVG Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35">
        <svg
          className="w-full h-full min-w-[900px] object-cover"
          viewBox="0 0 1440 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="wave1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
              <stop offset="45%" stopColor="#2563eb" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="wave2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#1d4ed8" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="wave3" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.3" />
              <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Lower flowing crest */}
          <path
            d="M-100,560 C260,380 620,720 1080,480 C1320,350 1480,420 1600,470 L1600,950 L-100,950 Z"
            fill="url(#wave1)"
          />
          {/* Middle undulating wave */}
          <path
            d="M-50,680 C220,540 680,780 1140,590 C1380,490 1520,560 1650,610 L1650,950 L-50,950 Z"
            fill="url(#wave2)"
          />
          {/* Upper atmospheric swell */}
          <path
            d="M-80,320 C320,480 720,180 1160,400 C1390,510 1520,380 1620,350 L1620,0 L-80,0 Z"
            fill="url(#wave3)"
          />
        </svg>
      </div>

      {/* 5. Deep Contrast Vignette */}
      <div className="absolute inset-0 bg-radial from-transparent via-slate-950/20 to-slate-950/65 pointer-events-none" />

      {/* 6. Main Login Container */}
      <div className="relative z-10 w-full max-w-md select-text">
        {/* Subtle glowing halo behind card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/25 via-cyan-400/20 to-indigo-500/25 rounded-3xl blur-xl opacity-75 transition-opacity" />

        {/* White Card */}
        <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl shadow-slate-950/60 overflow-hidden border border-slate-100">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-800 via-primary-800 to-indigo-900 px-6 sm:px-8 py-7 sm:py-8 text-center overflow-hidden">
            {/* Subtle decorative vector rings in header */}
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full border border-white/10 pointer-events-none" />
            <div className="absolute -left-6 -bottom-6 w-24 h-24 rounded-full border border-white/10 pointer-events-none" />

            {/* Emblem Badge */}
            <div className="relative inline-flex items-center justify-center bg-white/15 backdrop-blur-md w-16 h-16 rounded-2xl shadow-inner border border-white/25 mx-auto mb-3.5 group">
              <GraduationCap className="w-8 h-8 text-white drop-shadow-sm transition-transform group-hover:scale-105 duration-300" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-primary-900" />
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
                    className="w-full text-sm border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder-slate-400 transition-colors shadow-2xs"
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
                    className="w-full text-sm border border-slate-300 rounded-xl pl-10 pr-11 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder-slate-400 transition-colors shadow-2xs"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
                className="w-full py-3 px-4 mt-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-primary-600 to-indigo-600 hover:from-blue-700 hover:via-primary-700 hover:to-indigo-700 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-500/25"
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
                  className="flex flex-col items-start p-2 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-left group"
                >
                  <span className="font-semibold text-slate-800 group-hover:text-blue-700">Administrator</span>
                  <span className="text-[11px] text-slate-500 font-mono">admin / admin123</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('accountant', 'account123')}
                  className="flex flex-col items-start p-2 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-left group"
                >
                  <span className="font-semibold text-slate-800 group-hover:text-blue-700">Accountant</span>
                  <span className="text-[11px] text-slate-500 font-mono">accountant / •••</span>
                </button>
              </div>
            </div>

            {/* Security / Attribution Footer */}
            <div className="mt-5 pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400">
                Authorized Personnel Only • DPDP Act 2023 Compliant
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
