/**
 * @file        LicenseDetailsModal.tsx
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
 * @created     2026-11-19
 * @updated     2026-11-26
 *
 * @description Accessible popout modal displaying live unmasked serial number, registered institution & customer details, license mode, validity countdown, and administrative activation governance.
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  X,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  KeyRound,
  Building2,
  Mail,
  UserCheck,
  Calendar,
  Lock,
  ExternalLink,
  HelpCircle,
  Phone,
  MapPin,
} from 'lucide-react'
import { useAuthStore, isUserSysAdmin } from '../store/authStore'
import { useEnvironmentStore } from '../store/environmentStore'
import { institutionsApi, licenseApi } from '../api/endpoints'
import { APP_CONFIG, BRANDING_CONFIG } from '../config/appConfig'

export interface LicenseDetailsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LicenseDetailsModal({ isOpen, onClose }: LicenseDetailsModalProps) {
  const navigate = useNavigate()
  const { user, selectedInstitutionId, token } = useAuthStore()
  const isSysAdmin = isUserSysAdmin(user)
  const isInstitutionAdmin = (user?.role || '').toLowerCase() === 'admin' || isSysAdmin
  const isTrainingMode = useEnvironmentStore((state) => state.isTrainingMode)
  const [copied, setCopied] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Fetch cached institution list
  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then((r) => r.data),
    enabled: !!token && isOpen,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  const activeInstitution = useMemo(() => {
    return institutions.find((i) => i.id === selectedInstitutionId) ?? institutions[0]
  }, [institutions, selectedInstitutionId])

  // Fetch verified license status
  const { data: licenseStatus, isLoading: isLicenseLoading } = useQuery({
    queryKey: ['license-status', selectedInstitutionId],
    queryFn: () => licenseApi.getStatus(selectedInstitutionId ?? undefined).then((r) => r.data),
    enabled: !!token && !isTrainingMode && isOpen,
    staleTime: 30_000,
    retry: false,
  })

  // Validity countdown calculation
  const expiresAt = licenseStatus?.expires_at
  const expirationText = useMemo(() => {
    if (!expiresAt) return 'Perpetual Commercial License'
    const expDate = new Date(expiresAt)
    if (isNaN(expDate.getTime())) return expiresAt
    const now = new Date()
    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const formatted = expDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    if (diffDays < 0) return `Expired on ${formatted} (${Math.abs(diffDays)} days ago)`
    if (diffDays === 0) return `Expires Today (${formatted})`
    return `Valid until ${formatted} (${diffDays} days remaining)`
  }, [expiresAt])

  // Keyboard accessibility: Escape to dismiss
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Resolution of registration & customer metadata
  const registeredInstitution =
    licenseStatus?.registration?.institution_name ||
    activeInstitution?.name ||
    APP_CONFIG.defaultTenantName

  const registeredEmail =
    licenseStatus?.registered_email ||
    licenseStatus?.registration?.contact_email ||
    activeInstitution?.email ||
    'contact@prashantacademy.com'

  const contactPerson =
    licenseStatus?.registration?.contact_name ||
    (user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username : '') ||
    'Institute Administrator'

  const contactPhone =
    licenseStatus?.registration?.phone ||
    activeInstitution?.phone ||
    '+91 9323 023 007'

  const registeredAddress = [
    activeInstitution?.address || licenseStatus?.registration?.address,
    activeInstitution?.city || licenseStatus?.registration?.city,
    activeInstitution?.state || licenseStatus?.registration?.state,
    activeInstitution?.pincode || licenseStatus?.registration?.pincode,
  ]
    .filter(Boolean)
    .join(', ') || 'Mumbai, Maharashtra - 400095'

  // Serial Number resolution (unmasked per support & service mandate)
  const serialNumber =
    licenseStatus?.serial_number?.trim() ||
    'SMR-LIC-2026-PA001-ACTV-8842'

  const handleCopySerial = async () => {
    try {
      await navigator.clipboard.writeText(serialNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const licenseMode = licenseStatus?.mode || 'active'
  const isTrial = licenseMode === 'trial'
  const isGrace = licenseMode === 'grace'
  const isEvaluation = licenseMode === 'evaluation' || licenseMode === 'invalid' || licenseMode === 'unactivated'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="license-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="license-modal-title" className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                Software License &amp; Registration
              </h2>
              <p className="text-[11px] text-slate-500">
                Official licensing identity, customer entitlement, and registered institute metadata
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="license-modal-close-btn"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 max-h-[82vh] overflow-y-auto space-y-4 text-xs">
          {/* SECTION 1: UNMASKED SERIAL NUMBER (SUPPORT & SERVICES MANDATE) */}
          <div className="rounded-xl border border-blue-200/90 bg-gradient-to-r from-blue-50/60 via-indigo-50/30 to-blue-50/50 p-3.5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-blue-700" />
                <span>Product Serial Number (Support Reference ID)</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-blue-800 border border-blue-200 shadow-2xs">
                Visible for Customer Support
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 p-2.5 bg-white rounded-lg border border-blue-200/80">
              <code
                data-testid="unmasked-serial-number"
                className="font-mono text-xs sm:text-sm font-bold text-slate-900 tracking-wider select-all break-all"
              >
                {serialNumber}
              </code>
              <button
                type="button"
                onClick={handleCopySerial}
                data-testid="copy-serial-btn"
                title="Copy Serial Number to Clipboard"
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-blue-800/90 mt-2 leading-relaxed">
              💡 <strong>Support &amp; Services Reference:</strong> Quote this Serial Number when contacting customer care, requesting technical support, or renewing maintenance packages.
            </p>
          </div>

          {/* SECTION 2: REGISTERED ON / WHOM DETAILS */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Building2 className="w-3.5 h-3.5 text-slate-600" />
              <span>Registered Institute &amp; Licensee Details ("Whom Details")</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
              <div>
                <span className="text-[10.5px] font-medium text-slate-500 block">Registered Institute / Entity</span>
                <span className="font-semibold text-slate-900 text-xs sm:text-[13px]">{registeredInstitution}</span>
              </div>

              <div>
                <span className="text-[10.5px] font-medium text-slate-500 block">Registered Email (Activation Bound)</span>
                <span className="font-semibold text-slate-900 text-xs sm:text-[13px] flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span className="font-mono">{registeredEmail}</span>
                </span>
              </div>

              <div>
                <span className="text-[10.5px] font-medium text-slate-500 block">Primary Account Holder / Admin</span>
                <span className="font-semibold text-slate-900 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-slate-400" />
                  <span>{contactPerson}</span>
                </span>
              </div>

              <div>
                <span className="text-[10.5px] font-medium text-slate-500 block">Contact Phone</span>
                <span className="font-semibold text-slate-900 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{contactPhone}</span>
                </span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-[10.5px] font-medium text-slate-500 block">Registered Campus / Address</span>
                <span className="text-slate-800 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{registeredAddress}</span>
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: PRODUCT EDITION & VALIDITY POSTURE */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Product Edition</span>
              <span className="font-bold text-slate-900 block mt-0.5">{APP_CONFIG.edition}</span>
              <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">{APP_CONFIG.versionDisplay}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">License Posture</span>
              <span
                className={`inline-flex items-center gap-1 font-bold text-xs mt-0.5 ${
                  isEvaluation
                    ? 'text-rose-700'
                    : isGrace
                    ? 'text-amber-700'
                    : isTrial
                    ? 'text-indigo-700'
                    : 'text-emerald-700'
                }`}
              >
                {isEvaluation ? (
                  <AlertCircle className="w-3.5 h-3.5" />
                ) : isGrace ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )}
                <span className="capitalize">
                  {isTrial ? `30-Day Machine Trial (${licenseStatus?.trial_days_remaining ?? 30}d left)` : `${licenseMode} Mode`}
                </span>
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {licenseStatus?.rollout_stage === 'shadow' ? 'Shadow Enforcement' : 'Enforced Verification'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Validity Status</span>
              <span className="font-semibold text-slate-900 block mt-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{expirationText}</span>
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {isTrial
                  ? `Caps: ${licenseStatus?.trial_limits?.max_students ?? 100} students · ${licenseStatus?.trial_limits?.max_staff ?? 25} staff`
                  : '30-day offline tolerance'}
              </span>
            </div>
          </div>

          {/* SECTION 4: ACTIVATION & DEACTIVATION SECURITY GOVERNANCE NOTICE */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-950">
              <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>Activation &amp; Deactivation Governance</span>
            </div>
            <p className="text-[10.5px] leading-relaxed text-amber-900/90">
              Viewing this serial number is accessible to all institute staff for operational support. However, <strong>activating, refreshing, or deactivating</strong> this installation is cryptographically protected and strictly restricted to authorized administrators or the registered customer using one-time challenge codes delivered to the registered email address.
            </p>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={() => {
              onClose()
              navigate('/help/version')
            }}
            className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 hover:underline text-xs font-semibold"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Product &amp; Version Guide</span>
          </button>

          <div className="flex items-center gap-2">
            {isInstitutionAdmin ? (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate('/license-activation')
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Manage / Activate License</span>
              </button>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-200/70 px-2 py-1 rounded-md"
                title="Only administrators can manage activation"
              >
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Admin License Lock</span>
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
