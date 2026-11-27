/**
 * @file        InitialLaunchActivationModal.tsx
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
 * @created     2026-11-20
 * @updated     2026-11-27
 *
 * @description First-launch interactive license activation prompt dialog. Allows entering
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  ArrowRight,
  Clock,
  Sparkles,
  Laptop,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { licenseApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { extractApiErrorMessage } from '../utils/errorTaxonomy'
import type { LicenseStatusResponse } from '../types'

export interface InitialLaunchActivationModalProps {
  isOpen: boolean
  onClose: () => void
  licenseStatus?: LicenseStatusResponse | null
  institutionId?: number
}

export default function InitialLaunchActivationModal({
  isOpen,
  onClose,
  licenseStatus,
  institutionId,
}: InitialLaunchActivationModalProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [serialNumber, setSerialNumber] = useState('')
  const [activationKey, setActivationKey] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copiedHardwareId, setCopiedHardwareId] = useState(false)

  const hardwareId =
    licenseStatus?.hardware_fingerprint ||
    licenseStatus?.installation_id ||
    'PRATHAM-NODE-LOCK-PENDING'

  const activateMutation = useMutation({
    mutationFn: () =>
      licenseApi.activate(
        {
          serial_number: serialNumber.trim().toUpperCase(),
          activation_key: activationKey.trim(),
          registration: licenseStatus?.registration || {
            institution_name: 'Coaching Institute',
            contact_name: user ? `${user.first_name} ${user.last_name}`.trim() || user.username : 'Administrator',
            contact_email: user?.email || 'admin@prathamone.local',
            phone: null,
            address: null,
            city: null,
            state: null,
            pincode: null,
            tax_id: null,
            website: null,
          },
        },
        institutionId
      ),
    onSuccess: () => {
      toast.success('PrathamOne EduOS License Activated Successfully!', { duration: 6000 })
      queryClient.invalidateQueries({ queryKey: ['license-status'] })
      sessionStorage.setItem('prathamone-initial-license-prompt-deferred', 'true')
      setErrorMessage(null)
      onClose()
    },
    onError: (err: any) => {
      const msg = extractApiErrorMessage(
        err,
        'The license authority could not validate this key. Please check your credentials.',
      )
      setErrorMessage(msg)
      toast.error(msg)
    },
  })

  const startTrialMutation = useMutation({
    mutationFn: () => licenseApi.startTrial(institutionId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['license-status'] })
      sessionStorage.setItem('prathamone-initial-license-prompt-deferred', 'true')
      setErrorMessage(null)
      toast.success(
        `30-Day Free Trial active (${res.data.days_remaining} days left · up to ${res.data.limits.max_students} students & ${res.data.limits.max_staff} staff).`,
        { duration: 6000 },
      )
      onClose()
    },
    onError: (err: any) => {
      const msg = extractApiErrorMessage(err, 'Unable to start the 30-day machine trial.')
      setErrorMessage(msg)
      toast.error(msg)
    },
  })

  if (!isOpen) return null

  const handleCopyHardwareId = () => {
    navigator.clipboard.writeText(hardwareId)
    setCopiedHardwareId(true)
    toast.success('Machine Hardware ID copied to clipboard!')
    setTimeout(() => setCopiedHardwareId(false), 2500)
  }

  const handleDeferActivation = () => {
    sessionStorage.setItem('prathamone-initial-license-prompt-deferred', 'true')
    toast('Continuing in Evaluation Mode. You can activate anytime from Settings or Footer.', {
      icon: 'ℹ️',
      duration: 5000,
    })
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    if (!serialNumber.trim()) {
      setErrorMessage('Please enter your Serial Number.')
      return
    }
    if (!activationKey.trim()) {
      setErrorMessage('Please enter your Activation Key.')
      return
    }
    activateMutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
                <KeyRound className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    PrathamOne EduOS Product Activation
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    First Launch
                  </span>
                </div>
                <p className="text-xs text-indigo-200 mt-0.5">
                  Activate your commercial coaching institute license or continue exploring.
                </p>
              </div>
            </div>
            <button
              onClick={handleDeferActivation}
              className="text-indigo-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              title="Activate Later"
            >
              <span className="text-xs font-semibold">✕</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {/* Hardware Node-Lock Badge */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5 min-w-0">
              <Laptop className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Server Physical Hardware ID (Node-Lock)
                </div>
                <code className="text-xs font-mono font-bold text-slate-900 truncate block">
                  {hardwareId}
                </code>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyHardwareId}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all"
            >
              {copiedHardwareId ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy ID</span>
                </>
              )}
            </button>
          </div>

          {/* 30-Day Unique-Machine Trial Option */}
          {licenseStatus?.trial_expired ? (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              <strong>30-Day Machine Trial Expired:</strong> All entered records and reports remain preserved in read-only Evaluation Mode. Activate a commercial license below or switch to Training Mode.
            </div>
          ) : licenseStatus?.mode !== 'trial' && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Try Full Live Features Free for 30 Days</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Hardware-locked to this PC (up to {licenseStatus?.trial_limits?.max_students ?? 100} students, {licenseStatus?.trial_limits?.max_staff ?? 25} staff). Automatically reverts to read-only after Day 30.
                </p>
              </div>
              <button
                type="button"
                onClick={() => startTrialMutation.mutate()}
                disabled={startTrialMutation.isPending || activateMutation.isPending}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs disabled:opacity-60 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{startTrialMutation.isPending ? 'Starting Trial...' : 'Start 30-Day Free Trial'}</span>
              </button>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-900 text-xs animate-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">Activation Check Failed</div>
                <div className="text-rose-700 leading-relaxed">{errorMessage}</div>
              </div>
            </div>
          )}

          {/* Activation Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Serial Number
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. SMR-LIC-20261120-XXXX or 8-digit numeric"
                className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900 placeholder:text-slate-400 shadow-sm"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Activation Key
              </label>
              <input
                type="text"
                value={activationKey}
                onChange={(e) => setActivationKey(e.target.value)}
                placeholder="e.g. ACT-48-character token or 16-character key"
                className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900 placeholder:text-slate-400 shadow-sm"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Issued by Smritisys & AITDL Networks upon license purchase or pilot contract execution.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="submit"
                disabled={activateMutation.isPending}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 shadow-md shadow-indigo-600/20 transition-all"
              >
                {activateMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Validating with License Server...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span>Validate & Activate License</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDeferActivation}
                disabled={activateMutation.isPending || startTrialMutation.isPending}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all"
              >
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Continue Read-Only Later</span>
              </button>
            </div>
          </form>

          {/* Evaluation Mode Reassurance Notice */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Full feature access enabled in Evaluation Mode.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose()
                navigate('/license-activation')
              }}
              className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
            >
              <span>Offline file activation</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
