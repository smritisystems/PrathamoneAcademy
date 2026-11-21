/**
 * @file        ForcePasswordChangeModal.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-21
 * @updated     2026-11-21
 *
 * @description Mandatory first-run administrator master password update dialog enforcing
 */

import React, { useState } from 'react'
import {
  ShieldAlert,
  Lock,
  KeyRound,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  LogOut,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'

interface ForcePasswordChangeModalProps {
  isOpen: boolean
}

export default function ForcePasswordChangeModal({ isOpen }: ForcePasswordChangeModalProps) {
  const { user, logout, clearMustChangePassword } = useAuthStore()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  // Password Strength Assertions (14+ chars, upper, lower, number, special)
  const hasMinLength = newPassword.length >= 14
  const hasUpper = /[A-Z]/.test(newPassword)
  const hasLower = /[a-z]/.test(newPassword)
  const hasNumber = /[0-9]/.test(newPassword)
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword)
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword
  const isFormValid =
    hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial && isMatch && currentPassword.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!hasMinLength) {
      setErrorMessage('New master password must be at least 14 characters in length.')
      return
    }

    if (!isMatch) {
      setErrorMessage('New password and confirmation do not match.')
      return
    }

    const disallowed = ['admin123', 'account123', 'PrathamOne2026!Admin', 'Admin@2026!', 'password123']
    if (disallowed.includes(newPassword.trim())) {
      setErrorMessage('Cannot choose a known default seed password. Please choose a unique password.')
      return
    }

    setIsSubmitting(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      toast.success('Master administrator password configured successfully!', { duration: 5000 })
      clearMustChangePassword()
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to update master password. Please verify your current password.'
      setErrorMessage(msg)
      toast.error('Password update failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-amber-200 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 p-6 text-white text-center relative">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-3 shadow-inner">
            <ShieldAlert className="w-8 h-8 text-amber-200 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Security Requirement</h2>
          <p className="text-xs text-amber-100 mt-1 font-medium">
            Set Your Permanent Master Administrator Password
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 leading-relaxed">
            <strong>Welcome, {user?.first_name || user?.username || 'Administrator'}!</strong> You are signed in with the system's initial default password. To protect your coaching institute's student records, accounts, and comply with DPDP Act 2023, you must create a secure master password before entering the operating system.
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Current Initial Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter initial default password"
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                New Master Password (Min 14 characters)
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter a strong permanent master password"
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Policy Checks */}
              <div className="mt-2.5 p-3 bg-gray-50 border border-gray-200 rounded-xl grid grid-cols-2 gap-2 text-[11px]">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-semibold' : 'text-gray-500'}`}>
                  {hasMinLength ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />}
                  <span>14+ characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-700 font-semibold' : 'text-gray-500'}`}>
                  {hasUpper ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />}
                  <span>Uppercase (A-Z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasLower && hasNumber ? 'text-emerald-700 font-semibold' : 'text-gray-500'}`}>
                  {hasLower && hasNumber ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />}
                  <span>Lower (a-z) & Number (0-9)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-700 font-semibold' : 'text-gray-500'}`}>
                  {hasSpecial ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />}
                  <span>Special symbol (!@#$)</span>
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Confirm New Master Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new master password"
                  className={`w-full px-3.5 py-2.5 text-xs bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:border-transparent transition-all pr-10 font-mono ${
                    confirmPassword && !isMatch
                      ? 'border-rose-300 focus:ring-rose-500'
                      : 'border-gray-300 focus:ring-primary-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && !isMatch && (
                <p className="text-[11px] text-rose-600 mt-1">Passwords do not match.</p>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={logout}
                className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>

              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-2 ${
                  isFormValid && !isSubmitting
                    ? 'bg-gradient-to-r from-primary-600 to-primary-800 hover:from-primary-700 hover:to-primary-900 shadow-primary-500/20 cursor-pointer'
                    : 'bg-gray-300 cursor-not-allowed opacity-70'
                }`}
              >
                {isSubmitting ? (
                  <span>Saving Master Password...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Set Secure Password &amp; Unlock</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
