/**
 * @file        LicenseActivationPanel.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-14
 * @updated     2026-11-15
 *
 * @description Institution-scoped activation and refresh of signed software licenses.
 */

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, KeyRound, RefreshCw, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { licenseApi } from '../api/endpoints'
import { useEditModeStore } from '../store/editModeStore'
import { useEnvironmentStore } from '../store/environmentStore'
import type { LicenseStatusResponse } from '../types'

interface LicenseActivationPanelProps {
  institutionId?: number
  editScope: string
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export default function LicenseActivationPanel({ institutionId, editScope }: LicenseActivationPanelProps) {
  const isEditMode = useEditModeStore((state) => !!state.scopes[editScope])
  const isTrainingMode = useEnvironmentStore((state) => state.isTrainingMode)
  const queryClient = useQueryClient()
  const [serialNumber, setSerialNumber] = useState('')
  const [activationKey, setActivationKey] = useState('')
  const [legacyLicenseKey, setLegacyLicenseKey] = useState('')
  const [registration, setRegistration] = useState<NonNullable<LicenseStatusResponse['registration']>>({
    institution_name: '',
    contact_name: '',
    contact_email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    tax_id: '',
    website: '',
  })
  const [registrationConfirmed, setRegistrationConfirmed] = useState(false)
  const registrationInitialized = useRef(false)

  const {
    data: licenseStatus,
    isLoading: isLicenseLoading,
    refetch: refetchLicenseStatus,
  } = useQuery({
    queryKey: ['license-status', institutionId],
    queryFn: () => licenseApi.getStatus(institutionId).then((response) => response.data),
    enabled: !isTrainingMode,
    retry: false,
  })

  useEffect(() => {
    if (licenseStatus?.registration && !registrationInitialized.current) {
      setRegistration(licenseStatus.registration)
      registrationInitialized.current = true
    }
  }, [licenseStatus?.registration])

  useEffect(() => {
    registrationInitialized.current = false
    setRegistrationConfirmed(false)
  }, [institutionId])

  const updateRegistration = (field: keyof NonNullable<LicenseStatusResponse['registration']>, value: string) => {
    setRegistration((current) => ({ ...current, [field]: value }))
    setRegistrationConfirmed(false)
  }
  const isRegistrationComplete = Boolean(
    registration.institution_name.trim() &&
    registration.contact_name.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registration.contact_email.trim()) &&
    registration.phone?.trim(),
  )

  const activateLicenseMutation = useMutation({
    mutationFn: () => licenseApi.activate(
      serialNumber.trim() && activationKey.trim()
        ? { serial_number: serialNumber.trim(), activation_key: activationKey.trim(), registration }
        : { license_key: legacyLicenseKey.trim() },
      institutionId,
    ),
    onSuccess: () => {
      setSerialNumber('')
      setActivationKey('')
      setLegacyLicenseKey('')
      queryClient.invalidateQueries({ queryKey: ['license-status', institutionId] })
      toast.success(licenseStatus?.document_id
        ? 'Signed license snapshot refreshed.'
        : 'Signed license verified and activated.')
    },
    onError: (error: any) => {
      toast.error(`License activation or refresh failed: ${error.response?.data?.detail || error.message}`)
    },
  })

  const createOfflineRequestMutation = useMutation({
    mutationFn: () => licenseApi.createOfflineRequest(serialNumber.trim(), registration, institutionId),
    onSuccess: (response) => {
      const requestFile = JSON.stringify(response.data, null, 2)
      const url = URL.createObjectURL(new Blob([requestFile], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `prathamone-offline-request-${serialNumber.trim().replace(/[^A-Za-z0-9-]/g, '')}.json`
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
      toast.success('Offline activation request downloaded. Keep this file and enter the activation key on the licensing website.')
    },
    onError: (error: any) => {
      toast.error(`Could not create offline activation request: ${error.response?.data?.detail || error.message}`)
    },
  })

  const importOfflineArtifactMutation = useMutation({
    mutationFn: (artifact: Record<string, unknown>) => licenseApi.importOfflineArtifact(artifact, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-status', institutionId] })
      toast.success('Signed offline license response imported and verified.')
    },
    onError: (error: any) => {
      toast.error(`Offline license import failed: ${error.response?.data?.detail || error.message}`)
    },
  })

  const handleOfflineArtifactFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 64 * 1024) {
      toast.error('The signed license response file is too large.')
      return
    }
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!isJsonObject(parsed)) {
        throw new Error('The selected file is not a license response object.')
      }
      importOfflineArtifactMutation.mutate(parsed)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The selected license response file is invalid.')
    }
  }

  const canActivateCode = Boolean(
    serialNumber.trim() && activationKey.trim() && isRegistrationComplete && registrationConfirmed,
  )
  const canActivateLegacy = Boolean(legacyLicenseKey.trim() && !serialNumber.trim() && !activationKey.trim())

  return (
    <div className="max-w-3xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <KeyRound className="h-5 w-5 text-primary-600" />
              PrathamOne EduOS License
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Activation and refresh are bound to this institution and installation. Re-enter the license key to request a fresh signed snapshot; the key is sent to the authority and is not saved by this application.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetchLicenseStatus()}
            disabled={isTrainingMode || isLicenseLoading}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            aria-label="Reload saved license status"
          >
            <RefreshCw className={`h-4 w-4 ${isLicenseLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isTrainingMode ? (
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            License activation is unavailable in Training Mode.
          </p>
        ) : (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">License state</p>
                <p className="mt-1 text-sm font-bold capitalize text-slate-900">{licenseStatus?.mode || 'Loading'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Edition / model</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {licenseStatus?.edition || 'Not activated'}
                  {licenseStatus?.license_model ? ` · ${licenseStatus.license_model.replace(/_/g, ' ')}` : ''}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rollout</p>
                <p className="mt-1 text-sm font-bold capitalize text-slate-900">{licenseStatus?.rollout_stage || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subscription expiry</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{licenseStatus?.expires_at || 'No expiry date'}</p>
              </div>
            </div>

            {licenseStatus?.document_id && (
              <p className="mt-3 break-all text-xs text-slate-500">
                Signed document ID: <span className="font-mono">{licenseStatus.document_id}</span>
              </p>
            )}
            {licenseStatus?.serial_number && (
              <p className="mt-1 break-all text-xs text-slate-500">
                License serial number: <span className="font-mono">{licenseStatus.serial_number}</span>
              </p>
            )}
            {licenseStatus?.document_id && (
              <p className="mt-1 text-xs text-slate-500">
                Signed snapshot issued: {licenseStatus.issued_at || 'Unknown'}
              </p>
            )}
            {['unavailable', 'retry_scheduled'].includes(licenseStatus?.refresh_status || '') && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                The authority could not be reached.                 This verified snapshot remains usable for up to {licenseStatus?.offline_validity_days || 7} days after its issue time.
              </p>
            )}
            {licenseStatus?.refresh_status === 'manual_required' && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Automatic refresh is not configured for this installation. Enter the license key to activate or refresh it.
              </p>
            )}
            {licenseStatus?.error && (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                Signature status: {licenseStatus.error}
              </p>
            )}

            <div className="mt-6 border-t border-slate-100 pt-5">
              <h4 className="text-sm font-bold text-slate-800">Customer registration details</h4>
              <p className="mt-1 text-xs text-slate-500">
                These details are registered with the license authority. Values are prefilled from this institution profile and your account; correct them here if needed.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input aria-label="Institution name" required maxLength={200} value={registration.institution_name} onChange={(event) => updateRegistration('institution_name', event.target.value)} placeholder="Institution name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <input aria-label="Contact name" required maxLength={120} value={registration.contact_name} onChange={(event) => updateRegistration('contact_name', event.target.value)} placeholder="Contact name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <input aria-label="Contact email" required type="email" maxLength={254} value={registration.contact_email} onChange={(event) => updateRegistration('contact_email', event.target.value)} placeholder="Contact email" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <input aria-label="Phone number" required maxLength={50} value={registration.phone || ''} onChange={(event) => updateRegistration('phone', event.target.value)} placeholder="Phone number" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <input aria-label="Address (optional)" maxLength={300} value={registration.address || ''} onChange={(event) => updateRegistration('address', event.target.value)} placeholder="Address (optional)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <input aria-label="City (optional)" maxLength={120} value={registration.city || ''} onChange={(event) => updateRegistration('city', event.target.value)} placeholder="City (optional)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <input aria-label="State (optional)" maxLength={120} value={registration.state || ''} onChange={(event) => updateRegistration('state', event.target.value)} placeholder="State (optional)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <input aria-label="Postal code (optional)" maxLength={30} value={registration.pincode || ''} onChange={(event) => updateRegistration('pincode', event.target.value)} placeholder="Postal code (optional)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <input aria-label="Tax ID (optional)" maxLength={80} value={registration.tax_id || ''} onChange={(event) => updateRegistration('tax_id', event.target.value)} placeholder="Tax ID (optional)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <input aria-label="Website (optional)" maxLength={200} value={registration.website || ''} onChange={(event) => updateRegistration('website', event.target.value)} placeholder="Website (optional)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <label className="mt-3 flex items-start gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={registrationConfirmed} onChange={(event) => setRegistrationConfirmed(event.target.checked)} className="mt-0.5" />
                I confirm the institution, contact name, email, and phone are correct.
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  id="license-serial-number"
                  type="text"
                  autoComplete="off"
                  value={serialNumber}
                  onChange={(event) => setSerialNumber(event.target.value)}
                  placeholder="Serial number"
                  aria-label="License serial number"
                  className="min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <input
                  id="license-activation-key"
                  type="password"
                  autoComplete="off"
                  value={activationKey}
                  onChange={(event) => setActivationKey(event.target.value)}
                  placeholder="Activation key"
                  aria-label="License activation key"
                  className="min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => activateLicenseMutation.mutate()}
                  disabled={!isEditMode || !(canActivateCode || canActivateLegacy) || activateLicenseMutation.isPending}
                  title={!isEditMode ? 'Enable Edit Mode before activating' : undefined}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {activateLicenseMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  {isEditMode
                    ? (licenseStatus?.document_id ? 'Refresh signed license' : 'Activate license')
                    : 'Enable Edit Mode'}
                </button>
                <button
                  type="button"
                  onClick={() => createOfflineRequestMutation.mutate()}
                  disabled={!isEditMode || !serialNumber.trim() || !isRegistrationComplete || !registrationConfirmed || createOfflineRequestMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Download offline request
                </button>
              </div>
              <label htmlFor="license-legacy-key" className="mb-1 mt-4 block text-xs font-semibold text-slate-700">
                Legacy license key (previously issued keys)
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="license-legacy-key"
                  type="password"
                  autoComplete="off"
                  value={legacyLicenseKey}
                  onChange={(event) => setLegacyLicenseKey(event.target.value)}
                  placeholder="Enter a legacy license key"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <Upload className="h-4 w-4" />
                  Import offline response
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="sr-only"
                    onChange={handleOfflineArtifactFile}
                    disabled={!isEditMode || importOfflineArtifactMutation.isPending}
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Registration details are taken from this institution profile and your signed-in account. Online activation requires internet access. For offline activation, download the request file, use it with the activation key on the licensing website from an internet-connected device, then import the signed response here. Both flows require Institution Admin or SysAdmin access and explicit Edit Mode.
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
