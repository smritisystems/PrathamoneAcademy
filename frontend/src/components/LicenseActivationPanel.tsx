/**
 * @file        LicenseActivationPanel.tsx
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
 * @created     2026-11-14
 * @updated     2026-11-24
 *
 * @description Institution-scoped activation and refresh of signed software licenses.
 */

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, KeyRound, Mail, Printer, RefreshCw, Share2, ShieldCheck, ShieldOff, Upload, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { licenseApi } from '../api/endpoints'
import { APP_CONFIG } from '../config/appConfig'
import { useEditModeStore } from '../store/editModeStore'
import { useEnvironmentStore } from '../store/environmentStore'
import type { LicenseStatusResponse } from '../types'
import { printReceiptElement } from '../utils/printReceipt'
import {
  createLicenseCertificateFilename,
  createLicenseCertificatePdf,
  createLicenseVerificationQrDataUrl,
  downloadLicenseCertificatePdf,
  formatLicenseCertificateEntitlements,
  formatLicenseCertificateDate,
  getLicenseCertificateStatus,
  shareLicenseCertificatePdf,
} from '../utils/licenseCertificatePdf'

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
  const [licenseEmail, setLicenseEmail] = useState('')
  const [targetEmail, setTargetEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailChallengeId, setEmailChallengeId] = useState('')
  const [emailPurpose, setEmailPurpose] = useState<'activation' | 'email_change'>('activation')
  const [emailChangeTargetStep, setEmailChangeTargetStep] = useState(false)
  const [emailLicenseChoices, setEmailLicenseChoices] = useState<
    Array<{ license_id: number; serial_number: string | null; seats: number; activation_count: number }>
  >([])
  const [selectedEmailLicenseId, setSelectedEmailLicenseId] = useState<number | null>(null)
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPassword, setCustomerPassword] = useState('')
  const [customerSessionToken, setCustomerSessionToken] = useState<string | null>(null)
  const [customerLicenses, setCustomerLicenses] = useState<
    Array<{
      license_id: number
      serial_number: string | null
      seats: number
      activation_count: number
      edition?: string
      license_model?: string
      status?: string
    }>
  >([])
  const [selectedCustomerLicenseId, setSelectedCustomerLicenseId] = useState<number | null>(null)
  const [reactivationRequestId, setReactivationRequestId] = useState<string | null>(null)
  const [reactivationStatus, setReactivationStatus] = useState<
    'idle' | 'pending' | 'approved' | 'rejected' | 'expired' | 'activating'
  >('idle')
  const [reactivationPhone, setReactivationPhone] = useState<string | null>(null)
  const [reactivationMessage, setReactivationMessage] = useState<string | null>(null)
  const [surrenderConfirmed, setSurrenderConfirmed] = useState(false)
  const [surrenderReason, setSurrenderReason] = useState('')
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
  const [isCertificateBusy, setIsCertificateBusy] = useState(false)
  const [certificateQrDataUrl, setCertificateQrDataUrl] = useState<string | null>(null)
  const [certificateQrError, setCertificateQrError] = useState<string | null>(null)
  const registrationInitialized = useRef(false)

  const {
    data: licenseStatus,
    isLoading: isLicenseLoading,
    isError: isLicenseStatusError,
    refetch: refetchLicenseStatus,
  } = useQuery({
    queryKey: ['license-status', institutionId],
    queryFn: () => licenseApi.getStatus(institutionId).then((response) => response.data),
    enabled: !isTrainingMode,
    retry: false,
  })
  const hasVerifiedLicense = Boolean(licenseStatus?.document_id)
  const hasRegisteredLicenseEmail = Boolean(licenseStatus?.registered_email)

  useEffect(() => {
    if (licenseStatus?.registration && !registrationInitialized.current) {
      setRegistration(licenseStatus.registration)
      registrationInitialized.current = true
    }
  }, [licenseStatus?.registration])

  useEffect(() => {
    registrationInitialized.current = false
    setRegistrationConfirmed(false)
    setLicenseEmail('')
    setTargetEmail('')
    setEmailChallengeId('')
    setEmailCode('')
    setEmailLicenseChoices([])
    setSelectedEmailLicenseId(null)
    setCustomerEmail('')
    setCustomerPassword('')
    setCustomerSessionToken(null)
    setCustomerLicenses([])
    setSelectedCustomerLicenseId(null)
    setReactivationRequestId(null)
    setReactivationStatus('idle')
    setReactivationPhone(null)
    setReactivationMessage(null)
    setSurrenderConfirmed(false)
    setSurrenderReason('')
  }, [institutionId])

  useEffect(() => {
    setLicenseEmail((current) => hasVerifiedLicense
      ? licenseStatus?.registered_email || ''
      : current || licenseStatus?.registered_email || licenseStatus?.registration?.contact_email || '')
  }, [institutionId, hasVerifiedLicense, licenseStatus?.registered_email, licenseStatus?.registration?.contact_email])

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
    onMutate: () => {
      if (reactivationRequestId) setReactivationStatus('activating')
    },
    mutationFn: (overridePayload?: { reactivation_request_id?: string }) => licenseApi.activate(
      overridePayload?.reactivation_request_id
        ? { reactivation_request_id: overridePayload.reactivation_request_id }
        : emailPurpose === 'activation' && emailChallengeId && selectedEmailLicenseId
        ? {
            email: licenseEmail.trim(),
            email_challenge_id: emailChallengeId,
            license_id: selectedEmailLicenseId,
          }
        : serialNumber.trim() && activationKey.trim()
        ? { serial_number: serialNumber.trim(), activation_key: activationKey.trim(), registration }
        : { license_key: legacyLicenseKey.trim() },
      institutionId,
    ),
    onSuccess: () => {
      setSerialNumber('')
      setActivationKey('')
      setLegacyLicenseKey('')
      setEmailChallengeId('')
      setEmailCode('')
      setEmailLicenseChoices([])
      setSelectedEmailLicenseId(null)
      setReactivationRequestId(null)
      setReactivationStatus('idle')
      queryClient.invalidateQueries({ queryKey: ['license-status', institutionId] })
      toast.success(licenseStatus?.document_id
        ? 'Signed license snapshot refreshed.'
        : 'Signed license verified and activated.')
    },
    onError: (error: any) => {
      if (reactivationRequestId) setReactivationStatus('idle')
      const detail = error.response?.data?.detail || error.message || ''
      if (typeof detail === 'string' && detail.includes('License authority URL is not configured')) {
        toast.error('License authority URL is not configured on the server. Configure LICENSE_AUTHORITY_URL in server .env, or use the Offline Activation workflow below for air-gapped sites.')
      } else {
        toast.error(`License activation or refresh failed: ${detail}`)
      }
    },
  })

  const customerLoginMutation = useMutation({
    mutationFn: () => licenseApi.customerLogin(customerEmail.trim(), customerPassword, institutionId),
    onSuccess: (res) => {
      setCustomerSessionToken(res.data.session_token)
      setCustomerPassword('')
      toast.success('Signed in to PrathamOne customer account.')
      loadCustomerLicensesMutation.mutate(res.data.session_token)
    },
    onError: (error: any) => {
      toast.error(`Customer account login failed: ${error.response?.data?.detail || error.message}`)
    },
  })

  const loadCustomerLicensesMutation = useMutation({
    mutationFn: (token?: string) =>
      licenseApi.getCustomerReactivations(token || customerSessionToken || undefined, institutionId),
    onSuccess: (res) => {
      const list = res.data.licenses || []
      setCustomerLicenses(list)
      if (list.length === 1) {
        setSelectedCustomerLicenseId(list[0].license_id)
      }
      if (list.length === 0) {
        toast.error('No eligible licenses found for this customer account.')
      } else {
        toast.success(`Loaded ${list.length} eligible license(s).`)
      }
    },
    onError: (error: any) => {
      toast.error(`Could not load eligible licenses: ${error.response?.data?.detail || error.message}`)
    },
  })

  const requestReactivationMutation = useMutation({
    mutationFn: () => {
      if (!selectedCustomerLicenseId) {
        throw new Error('Please select an eligible license to reactivate.')
      }
      return licenseApi.requestCustomerReactivation(
        selectedCustomerLicenseId,
        customerSessionToken || undefined,
        institutionId,
        surrenderConfirmed,
        surrenderReason.trim(),
      )
    },
    onSuccess: (res) => {
      const { id, status, registered_phone, message } = res.data
      setReactivationRequestId(id)
      setReactivationPhone(registered_phone || null)
      setReactivationMessage(message || null)

      if (status === 'approved') {
        setReactivationStatus('approved')
        toast.success('Reactivation request approved! Activating installation...')
        activateLicenseMutation.mutate({ reactivation_request_id: id })
      } else if (status === 'pending') {
        setReactivationStatus('pending')
        toast.success('Reactivation request submitted and pending verification.')
      } else if (status === 'rejected') {
        setReactivationStatus('rejected')
        toast.error(message || 'The reactivation request was rejected.')
      } else if (status === 'expired') {
        setReactivationStatus('expired')
        toast.error('The reactivation request has expired.')
      }
    },
    onError: (error: any) => {
      toast.error(`Reactivation request failed: ${error.response?.data?.detail || error.message}`)
    },
  })

  useEffect(() => {
    if (!reactivationRequestId || reactivationStatus !== 'pending') return

    let cancelled = false
    const pollInterval = setInterval(async () => {
      try {
        const res = await licenseApi.pollCustomerReactivation(
          reactivationRequestId,
          customerSessionToken || undefined,
          institutionId,
        )
        if (cancelled) return
        const { status, registered_phone, message } = res.data
        if (registered_phone) setReactivationPhone(registered_phone)
        if (message) setReactivationMessage(message)

        if (status === 'approved') {
          setReactivationStatus('approved')
          clearInterval(pollInterval)
          toast.success('Reactivation request approved! Activating license...')
          activateLicenseMutation.mutate({ reactivation_request_id: reactivationRequestId })
        } else if (status === 'rejected') {
          setReactivationStatus('rejected')
          clearInterval(pollInterval)
          toast.error(message || 'Reactivation request was rejected by support.')
        } else if (status === 'expired') {
          setReactivationStatus('expired')
          clearInterval(pollInterval)
          toast.error('Reactivation request has expired. Please submit a new request.')
        }
      } catch (err: any) {
        console.warn('Polling reactivation status warning:', err)
      }
    }, 3000)

    return () => {
      cancelled = true
      clearInterval(pollInterval)
    }
  }, [reactivationRequestId, reactivationStatus, customerSessionToken, institutionId])

  const requestEmailCodeMutation = useMutation({
    mutationFn: (purpose: 'activation' | 'email_change') => licenseApi.requestEmailCode({
      purpose,
      email: licenseEmail.trim(),
      ...(purpose === 'email_change'
        ? { target_email: targetEmail.trim(), serial_number: licenseStatus?.serial_number || '' }
        : {}),
    }, institutionId),
    onSuccess: (response, purpose) => {
      setEmailPurpose(purpose)
      setEmailChallengeId(response.data.challenge_id)
      setEmailCode('')
      setEmailLicenseChoices([])
      setSelectedEmailLicenseId(null)
      setEmailChangeTargetStep(false)
      toast.success(purpose === 'email_change'
        ? 'If the license matches, a confirmation code was sent to the registered email.'
        : 'If the license matches, a verification code was sent to the registered email.')
    },
    onError: (error: any) => {
      toast.error(`Could not request an email verification code: ${error.response?.data?.detail || error.message}`)
    },
  })

  const verifyEmailCodeMutation = useMutation({
    mutationFn: () => licenseApi.verifyEmailCode(emailChallengeId, emailCode.trim(), institutionId),
    onSuccess: (response) => {
      if (emailPurpose === 'email_change' && response.data.stage === 'target_email') {
        setEmailChangeTargetStep(true)
        setEmailCode('')
        toast.success(response.data.message || 'A confirmation code was sent to the new email address.')
        return
      }
      if (emailPurpose === 'email_change' && response.data.registered_email) {
        setLicenseEmail(response.data.registered_email)
        setTargetEmail('')
        setEmailChallengeId('')
        setEmailCode('')
        setEmailChangeTargetStep(false)
        queryClient.invalidateQueries({ queryKey: ['license-status', institutionId] })
        toast.success('Registered license email updated after verifying both addresses.')
        return
      }
      const choices = response.data.licenses || []
      setEmailLicenseChoices(choices)
      setSelectedEmailLicenseId(choices.length === 1 ? choices[0].license_id : null)
      if (choices.length === 0) {
        toast.error('No eligible license was found for this verified email and institution.')
      } else {
        toast.success('Email verified. Select the license to activate on this installation.')
      }
    },
    onError: (error: any) => {
      toast.error(`Email verification failed: ${error.response?.data?.detail || error.message}`)
    },
  })

  const deactivateLicenseMutation = useMutation({
    mutationFn: () => licenseApi.deactivate(institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-status', institutionId] })
      toast.success('This installation was deactivated. Use the registered email to activate it on another machine.')
    },
    onError: (error: any) => {
      toast.error(`License deactivation failed: ${error.response?.data?.detail || error.message}`)
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
  const canActivateEmail = Boolean(
    emailPurpose === 'activation' && emailChallengeId && emailLicenseChoices.length > 0 && selectedEmailLicenseId,
  )
  const certificateInstitutionName =
    licenseStatus?.registration?.institution_name?.trim() || 'Organization name not recorded'
  const certificateInstitutionAddress = licenseStatus?.registration
    ? [
        licenseStatus.registration.address?.trim(),
        [
          licenseStatus.registration.city?.trim(),
          licenseStatus.registration.state?.trim(),
          licenseStatus.registration.pincode?.trim(),
        ].filter(Boolean).join(', '),
      ].filter(Boolean).join(', ')
    : ''
  const verificationUrl = licenseStatus?.verification_url || null
  const certificateData = licenseStatus?.document_id
    ? {
        institutionName: certificateInstitutionName,
        institutionAddress: certificateInstitutionAddress || null,
        mode: licenseStatus.mode,
        licenseStatus: licenseStatus.license_status,
        licenseId: licenseStatus.license_id,
        documentId: licenseStatus.document_id,
        serialNumber: licenseStatus.serial_number,
        edition: licenseStatus.edition === 'coaching-institute'
          ? APP_CONFIG.edition
          : licenseStatus.edition,
        licenseModel: licenseStatus.license_model,
        expiresAt: licenseStatus.expires_at,
        issuedAt: licenseStatus.issued_at,
        entitlements: formatLicenseCertificateEntitlements(licenseStatus.entitlements),
        verificationUrl,
      }
    : null
  const certificateStatus = certificateData
    ? getLicenseCertificateStatus(certificateData.licenseStatus, certificateData.mode, certificateData.expiresAt)
    : 'NOT RECORDED'
  const certificateVerificationHost = (() => {
    try {
      return verificationUrl ? new URL(verificationUrl).host : null
    } catch {
      return 'Licensing authority'
    }
  })()

  useEffect(() => {
    let active = true
    setCertificateQrDataUrl(null)
    setCertificateQrError(null)
    if (!verificationUrl) return () => { active = false }

    createLicenseVerificationQrDataUrl(verificationUrl)
      .then((dataUrl) => {
        if (active) setCertificateQrDataUrl(dataUrl)
      })
      .catch((error: unknown) => {
        if (active) setCertificateQrError(error instanceof Error ? error.message : 'QR generation failed.')
      })
    return () => { active = false }
  }, [verificationUrl])

  const handleDownloadCertificate = async () => {
    if (!certificateData) return
    setIsCertificateBusy(true)
    try {
      const blob = await createLicenseCertificatePdf(certificateData)
      downloadLicenseCertificatePdf(blob, createLicenseCertificateFilename(certificateData))
      toast.success('License certificate PDF downloaded.')
    } catch (error) {
      toast.error(`Could not create the license certificate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsCertificateBusy(false)
    }
  }

  const handleShareCertificate = async () => {
    if (!certificateData) return
    setIsCertificateBusy(true)
    try {
      const blob = await createLicenseCertificatePdf(certificateData)
      const result = await shareLicenseCertificatePdf(
        blob,
        createLicenseCertificateFilename(certificateData),
        certificateData.institutionName,
      )
      if (result === 'shared') toast.success('License certificate shared.')
      if (result === 'downloaded') toast('PDF saved. Attach it in your messaging or email app to share.')
    } catch (error) {
      toast.error(`Could not share the license certificate: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsCertificateBusy(false)
    }
  }

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
              {isLicenseLoading
                ? 'Checking the license linked to this institution…'
                : hasVerifiedLicense
                  ? 'This verified license is linked to this installation. Registration and activation credentials are not needed again.'
                  : 'Activate the license for this institution. Registration and activation are bound to this installation.'}
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
            {certificateData && licenseStatus && (
              <section className="mt-5 space-y-3" aria-label="License certificate">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Branded license certificate</h4>
                    <p className="mt-0.5 text-xs text-slate-500">A print-ready customer copy of the verified signed license snapshot.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => printReceiptElement({
                        elementId: 'license-certificate-print-content',
                        documentTitle: 'PrathamOne EduOS License Certificate',
                        paperSize: 'A4',
                      })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      aria-label="Print license certificate"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadCertificate}
                      disabled={isCertificateBusy}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary-700 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-800 disabled:cursor-wait disabled:opacity-60"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {isCertificateBusy ? 'Preparing…' : 'Download PDF'}
                    </button>
                    <button
                      type="button"
                      onClick={handleShareCertificate}
                      disabled={isCertificateBusy}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share PDF
                    </button>
                  </div>
                </div>

                <div
                  id="license-certificate-print-content"
                  data-testid="license-certificate"
                  data-paper-size="A4"
                  data-print-overflow="visible"
                  className="mx-auto max-w-[680px] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm"
                >
                  <div className="relative overflow-hidden border-b-4 border-orange-500 bg-gradient-to-br from-slate-950 via-blue-950 to-blue-900 px-6 py-6 text-white">
                    <div className="absolute -right-10 -top-12 h-44 w-44 rounded-full border border-white/10" />
                    <div className="relative flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <img
                          src="/logo/logoone256.png"
                          alt="PrathamOne logo"
                          className="h-14 w-14 shrink-0 rounded-lg bg-white p-1 object-contain"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold uppercase tracking-[0.14em] text-amber-300">PrathamOne EduOS</p>
                          <p className="mt-1 break-words text-[10px] font-medium uppercase tracking-[0.15em] text-blue-100">{certificateData.edition || 'Edition not recorded'}</p>
                          <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-200">Software License</p>
                          <h5 className="mt-1 text-xl font-bold tracking-tight">License Certificate</h5>
                          <p className="mt-1 text-[10px] text-blue-100">Customer copy</p>
                        </div>
                      </div>
                      <div className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full border-2 border-amber-300/80 p-2 text-center text-[8px] font-bold uppercase leading-tight text-amber-100">
                        <span className="absolute inset-1 rounded-full border border-white/30" />
                        <span className="relative">
                          <span className="block text-[6px] tracking-wide text-amber-300">License model</span>
                          {licenseStatus.license_model?.replace(/[_-]/g, ' ') || 'Not recorded'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 px-6 py-5 sm:px-8">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Licensed organization</p>
                        <p className="mt-1 break-words text-lg font-bold leading-snug text-slate-900">{certificateInstitutionName}</p>
                        {certificateInstitutionAddress && (
                          <p className="mt-1 break-words text-xs leading-relaxed text-slate-600">{certificateInstitutionAddress}</p>
                        )}
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${
                        certificateStatus.startsWith('ACTIVE')
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : certificateStatus.includes('GRACE') || certificateStatus === 'PENDING RENEWAL'
                            ? 'border-amber-200 bg-amber-50 text-amber-800'
                            : 'border-rose-200 bg-rose-50 text-rose-800'
                      }`}>
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {certificateStatus}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        ['License status', certificateStatus],
                        ['Product edition', certificateData.edition || 'Not recorded'],
                        ['License model', licenseStatus.license_model?.replace(/[_-]/g, ' ') || 'Not recorded'],
                        ['Valid through', formatLicenseCertificateDate(licenseStatus.expires_at, 'No expiry date recorded')],
                      ].map(([label, value]) => (
                        <div key={label} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
                          <p className="mt-1 break-words text-sm font-semibold capitalize text-slate-900">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3 border-t border-slate-200 pt-4">
                      <div>
                        <h6 className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-900">Signed license entitlements</h6>
                        {certificateData.entitlements.length ? (
                          <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                            {certificateData.entitlements.map(({ key, value }) => (
                              <div key={key} className="min-w-0">
                                <dt className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{key}</dt>
                                <dd className="mt-0.5 break-words text-xs font-semibold text-slate-800">{value}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500">No additional signed entitlements are recorded in this snapshot.</p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2">
                      {[
                        ['License serial', licenseStatus.serial_number || 'Not recorded'],
                        ['Unique license ID', licenseStatus.license_id || 'Not recorded'],
                        ['Signed document reference', licenseStatus.document_id],
                        ['Certificate issued', formatLicenseCertificateDate(licenseStatus.issued_at)],
                      ].map(([label, value]) => (
                        <div key={label} className="min-w-0">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
                          <p className="mt-1 break-all font-mono text-[11px] font-semibold text-slate-800">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-[130px_minmax(0,1fr)]">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-blue-900">Verify license</p>
                        {certificateQrDataUrl ? (
                          <img
                            src={certificateQrDataUrl}
                            alt={`Secure verification for license document ${licenseStatus.document_id}`}
                            className="mx-auto mt-2 h-24 w-24"
                          />
                        ) : (
                          <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
                            {certificateQrError || (verificationUrl ? 'Preparing secure QR…' : 'Authority verification URL is not available.')}
                          </p>
                        )}
                        {verificationUrl && (
                          <p className="mt-2 break-all text-[8px] text-slate-500">{certificateVerificationHost}</p>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-col justify-between gap-3">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] leading-relaxed text-slate-600">
                          This branded summary is provided for customer reference and is not a replacement for the signed license artifact. License validity is determined by the verified signed snapshot and licensing authority.
                        </div>
                        <div className="border-t border-slate-200 pt-3">
                          <p className="text-sm font-bold text-slate-900">Jawahar R. Mallah</p>
                          <p className="mt-0.5 text-[10px] font-semibold text-slate-700">Authorized License Issuer</p>
                          <p className="text-[10px] text-slate-600">For PrathamOne EduOS</p>
                          <p className="text-[10px] font-medium text-slate-500">Powered by SmritiSys</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[10px] font-medium text-slate-500">
                      <span>PrathamOne EduOS · prathamone.com</span>
                      <span>Powered by SmritiSys</span>
                    </div>
                  </div>
                </div>
              </section>
            )}
            {licenseStatus?.hardware_fingerprint && (
              <div className="mt-3 flex items-center justify-between p-3 rounded-xl border border-indigo-200 bg-indigo-50/50 text-xs">
                <div>
                  <span className="font-semibold text-indigo-900 block">Server Physical Hardware ID (Node-Lock):</span>
                  <span className="font-mono font-bold text-indigo-950">{licenseStatus.hardware_fingerprint}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(licenseStatus.hardware_fingerprint || '')
                    toast.success('Hardware ID copied to clipboard!')
                  }}
                  className="px-2.5 py-1 bg-white border border-indigo-300 rounded-lg text-indigo-700 font-semibold text-xs hover:bg-indigo-50 shadow-2xs"
                >
                  Copy Hardware ID
                </button>
              </div>
            )}
            {['unavailable', 'retry_scheduled'].includes(licenseStatus?.refresh_status || '') && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                The authority could not be reached. This signed snapshot is usable offline for up to {licenseStatus?.offline_validity_days || 7} days, followed by a 7-day grace period before Evaluation Mode.
              </p>
            )}
            {licenseStatus?.refresh_status === 'manual_required' && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Automatic license refresh is unavailable for this installation. Contact your system administrator or licensing support; do not re-enter your activation credentials.
              </p>
            )}
            {licenseStatus?.error && (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                Signature status: {licenseStatus.error}
              </p>
            )}
            {hasVerifiedLicense && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-950">Release this installation</p>
                <p className="mt-1 text-xs text-amber-900">
                  Deactivation requires an internet connection. It releases this device binding; your issued license and history remain unchanged.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Deactivate this installation and release its device binding? This requires internet access.')) {
                      deactivateLicenseMutation.mutate()
                    }
                  }}
                  disabled={!isEditMode || deactivateLicenseMutation.isPending || isTrainingMode}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShieldOff className="h-4 w-4" />
                  {deactivateLicenseMutation.isPending ? 'Deactivating…' : 'Deactivate this device'}
                </button>
              </div>
            )}

            {hasVerifiedLicense ? (
              <>
                <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <h4 className="text-sm font-bold text-emerald-950">License registration complete</h4>
                  <p className="mt-1 text-sm text-emerald-900">
                    This signed license is already linked to this institution and installation. You do not need to register again or re-enter the serial number or activation key.
                  </p>
                  <p className="mt-2 text-sm text-emerald-900">
                    Registered license email: <span className="font-semibold">{licenseStatus?.registered_email || 'Not available'}</span>
                  </p>
                </div>
                <div className="mt-4 rounded-xl border border-slate-200 p-4">
                  <h5 className="text-sm font-bold text-slate-800">Change registered license email</h5>
                  <p className="mt-1 text-xs text-slate-600">
                    Verify a code sent to the current address, then verify a second code sent to the new address. Edit Mode is required.
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <input
                      type="email"
                      maxLength={254}
                      value={licenseEmail}
                      onChange={(event) => setLicenseEmail(event.target.value)}
                      disabled={!isEditMode}
                      aria-label="Current registered license email"
                      placeholder="Current registered email"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                    />
                    <input
                      type="email"
                      maxLength={254}
                      value={targetEmail}
                      onChange={(event) => setTargetEmail(event.target.value)}
                      disabled={!isEditMode}
                      aria-label="New registered license email"
                      placeholder="New registered email"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                    />
                  </div>
                  {emailChallengeId && emailPurpose === 'email_change' && (
                    <p className="mt-2 text-xs text-slate-600">
                      {emailChangeTargetStep ? 'Enter the code sent to the new email address.' : 'Enter the code sent to the current email address.'}
                    </p>
                  )}
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    {emailChallengeId && emailPurpose === 'email_change' ? (
                      <>
                        <input
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={8}
                          value={emailCode}
                          onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
                          disabled={!isEditMode}
                          aria-label="Email change verification code"
                          placeholder="8-digit email code"
                          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                        />
                        <button
                          type="button"
                          onClick={() => verifyEmailCodeMutation.mutate()}
                          disabled={!isEditMode || emailCode.length !== 8 || verifyEmailCodeMutation.isPending}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {verifyEmailCodeMutation.isPending ? 'Verifying…' : 'Verify code'}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => requestEmailCodeMutation.mutate('email_change')}
                        disabled={!isEditMode || !licenseStatus?.serial_number ||
                          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(licenseEmail.trim()) ||
                          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail.trim()) ||
                          requestEmailCodeMutation.isPending}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {requestEmailCodeMutation.isPending ? 'Sending…' : 'Start email change'}
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : isLicenseLoading ? (
              <p role="status" className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Checking the current license before showing activation options…
              </p>
            ) : isLicenseStatusError ? (
              <div role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                <p>Could not verify the current license status. Activation and registration are hidden until the status check succeeds.</p>
                <button
                  type="button"
                  onClick={() => refetchLicenseStatus()}
                  className="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-semibold"
                >
                  Retry license status check
                </button>
              </div>
            ) : hasRegisteredLicenseEmail ? (
              <div className="mt-6 rounded-xl border border-slate-200 p-4">
                <h4 className="text-sm font-bold text-slate-800">Activate this existing license</h4>
                <p className="mt-1 text-xs text-slate-600">
                  This installation was previously linked to a registered license. Verify the account email to reactivate it; registration details and serial or activation keys are not needed.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    maxLength={254}
                    value={licenseEmail}
                    onChange={(event) => setLicenseEmail(event.target.value)}
                    disabled={!isEditMode}
                    aria-label="Registered license email"
                    placeholder="Registered license email"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => requestEmailCodeMutation.mutate('activation')}
                    disabled={!isEditMode || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(licenseEmail.trim()) || requestEmailCodeMutation.isPending}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {requestEmailCodeMutation.isPending ? 'Sending…' : 'Send verification code'}
                  </button>
                </div>
                {emailChallengeId && emailPurpose === 'activation' && (
                  <div className="mt-3 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={8}
                        value={emailCode}
                        onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
                        disabled={!isEditMode}
                        aria-label="Email verification code"
                        placeholder="8-digit email code"
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                      />
                      <button
                        type="button"
                        onClick={() => verifyEmailCodeMutation.mutate()}
                        disabled={!isEditMode || emailCode.length !== 8 || verifyEmailCodeMutation.isPending}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {verifyEmailCodeMutation.isPending ? 'Verifying…' : 'Verify code'}
                      </button>
                    </div>
                    {emailLicenseChoices.length > 0 && (
                      <>
                        <label className="block text-xs font-semibold text-slate-700">
                          License to activate
                          <select
                            value={selectedEmailLicenseId || ''}
                            onChange={(event) => setSelectedEmailLicenseId(event.target.value ? Number(event.target.value) : null)}
                            disabled={!isEditMode}
                            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal disabled:bg-slate-50"
                          >
                            <option value="">Select a license</option>
                            {emailLicenseChoices.map((choice) => (
                              <option key={choice.license_id} value={choice.license_id}>
                                {choice.serial_number || `License ${choice.license_id}`} · {choice.activation_count}/{choice.seats} devices
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={() => activateLicenseMutation.mutate()}
                          disabled={!isEditMode || !canActivateEmail || activateLicenseMutation.isPending}
                          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {activateLicenseMutation.isPending ? 'Activating…' : 'Activate this installation'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
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
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h5 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Mail className="h-4 w-4" />
                  Activate with registered email
                </h5>
                <p className="mt-1 text-xs text-slate-600">
                  Request a one-time code to activate an existing license on this installation without re-entering the serial or activation key.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    maxLength={254}
                    value={licenseEmail}
                    onChange={(event) => setLicenseEmail(event.target.value)}
                    aria-label="Registered license email"
                    placeholder="Registered license email"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => requestEmailCodeMutation.mutate('activation')}
                    disabled={!isEditMode || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(licenseEmail.trim()) || requestEmailCodeMutation.isPending}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {requestEmailCodeMutation.isPending ? 'Sending…' : 'Send code'}
                  </button>
                </div>
                {emailChallengeId && emailPurpose === 'activation' && (
                  <div className="mt-3 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={8}
                        value={emailCode}
                        onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
                        aria-label="Email verification code"
                        placeholder="8-digit email code"
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => verifyEmailCodeMutation.mutate()}
                        disabled={!isEditMode || emailCode.length !== 8 || verifyEmailCodeMutation.isPending}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {verifyEmailCodeMutation.isPending ? 'Verifying…' : 'Verify code'}
                      </button>
                    </div>
                    {emailLicenseChoices.length > 0 && (
                      <label className="block text-xs font-semibold text-slate-700">
                        License to activate
                        <select
                          value={selectedEmailLicenseId || ''}
                          onChange={(event) => setSelectedEmailLicenseId(event.target.value ? Number(event.target.value) : null)}
                          className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                        >
                          <option value="">Select a license</option>
                          {emailLicenseChoices.map((choice) => (
                            <option key={choice.license_id} value={choice.license_id}>
                              {choice.serial_number || `License ${choice.license_id}`} · {choice.activation_count}/{choice.seats} devices
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  id="license-serial-number"
                  type="text"
                  autoComplete="off"
                  value={serialNumber}
                  onChange={(event) => setSerialNumber(event.target.value)}
                  placeholder="9-digit numeric serial"
                  aria-label="License serial number"
                  className="min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <input
                  id="license-activation-key"
                  type="password"
                  autoComplete="off"
                  value={activationKey}
                  onChange={(event) => setActivationKey(event.target.value)}
                  placeholder="16-character alphanumeric key"
                  aria-label="License activation key"
                  className="min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => activateLicenseMutation.mutate()}
                  disabled={!isEditMode || !(canActivateCode || canActivateLegacy || canActivateEmail) || activateLicenseMutation.isPending}
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
                <label className="relative overflow-hidden inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
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
            )}

            {!hasVerifiedLicense && (
              <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-primary-600" />
                      Reactivate with PrathamOne Customer Account
                    </h4>
                    <p className="mt-1 text-xs text-slate-600">
                      Sign in with your existing account email and password to select and reactivate your eligible license on this installation. No activation keys or OTP required.
                    </p>
                  </div>
                  {customerSessionToken && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                      Account Authenticated
                    </span>
                  )}
                </div>

                {!customerSessionToken ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        type="email"
                        maxLength={254}
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        disabled={customerLoginMutation.isPending}
                        aria-label="Customer account email"
                        placeholder="Account Email (e.g. customer@example.com)"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                      />
                      <input
                        type="password"
                        maxLength={256}
                        value={customerPassword}
                        onChange={(e) => setCustomerPassword(e.target.value)}
                        disabled={customerLoginMutation.isPending}
                        aria-label="Customer account password"
                        placeholder="Account Password"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => customerLoginMutation.mutate()}
                      disabled={!customerEmail.trim() || !customerPassword || customerLoginMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {customerLoginMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                      {customerLoginMutation.isPending ? 'Signing in…' : 'Sign In with Account'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                      <input
                        type="checkbox"
                        checked={surrenderConfirmed}
                        onChange={(event) => {
                          setSurrenderConfirmed(event.target.checked)
                          if (!event.target.checked) setSurrenderReason('')
                        }}
                        className="mt-0.5"
                        disabled={reactivationStatus === 'pending' || activateLicenseMutation.isPending}
                      />
                      <span>
                        <strong>I surrendered or released the previous device/license.</strong>
                        <span className="block mt-0.5 text-amber-800">
                          This informs support that the standard 30-day transfer cooldown may not apply.
                        </span>
                      </span>
                    </label>
                    {surrenderConfirmed && (
                      <input
                        type="text"
                        value={surrenderReason}
                        onChange={(event) => setSurrenderReason(event.target.value)}
                        maxLength={300}
                        placeholder="Reason: surrendered device, replacement, lost machine..."
                        aria-label="Surrender reason"
                        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        disabled={reactivationStatus === 'pending' || activateLicenseMutation.isPending}
                      />
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Select an eligible license to reactivate
                      </label>
                      {customerLicenses.length > 0 ? (
                        <select
                          value={selectedCustomerLicenseId || ''}
                          onChange={(e) => setSelectedCustomerLicenseId(e.target.value ? Number(e.target.value) : null)}
                          disabled={reactivationStatus === 'pending' || activateLicenseMutation.isPending}
                          aria-label="Select eligible license"
                          className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                        >
                          <option value="">-- Choose an eligible license --</option>
                          {customerLicenses.map((lic) => (
                            <option key={lic.license_id} value={lic.license_id}>
                              {lic.serial_number ? `Serial: ${lic.serial_number}` : `License #${lic.license_id}`} · {lic.edition || 'Standard'} ({lic.activation_count}/{lic.seats} devices active)
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-xs text-slate-500 italic">
                          {loadCustomerLicensesMutation.isPending ? 'Loading eligible licenses…' : 'No eligible licenses found for this account.'}
                        </p>
                      )}
                    </div>

                    {reactivationStatus === 'pending' ? (
                      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-sm">
                          <RefreshCw className="h-4 w-4 animate-spin text-amber-600" />
                          Reactivation Request Pending Verification
                        </div>
                        <p className="text-xs text-amber-900 leading-relaxed">
                          Support will call your registered phone {reactivationPhone ? <strong className="font-mono">{reactivationPhone}</strong> : 'on file'} to verify this device transfer.
                          This application is automatically polling for approval and will complete activation once verified.
                        </p>
                        {reactivationMessage && (
                          <p className="text-xs font-mono text-amber-800 bg-amber-100/60 p-2 rounded">
                            {reactivationMessage}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (reactivationRequestId) {
                              licenseApi.pollCustomerReactivation(reactivationRequestId, customerSessionToken || undefined, institutionId)
                                .then((res) => {
                                  if (res.data.status === 'approved') {
                                    setReactivationStatus('approved')
                                    activateLicenseMutation.mutate({ reactivation_request_id: reactivationRequestId })
                                  } else {
                                    toast('Status is still pending verification.')
                                  }
                                })
                            }
                          }}
                          className="text-xs font-semibold text-amber-900 underline hover:text-amber-950"
                        >
                          Check status now
                        </button>
                      </div>
                    ) : reactivationStatus === 'rejected' ? (
                      <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-950 text-xs">
                        <strong>Request Rejected:</strong> {reactivationMessage || 'The reactivation request was rejected by support.'} Please contact support for assistance.
                      </div>
                    ) : reactivationStatus === 'expired' ? (
                      <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-950 text-xs">
                        <strong>Request Expired:</strong> The reactivation request has timed out. Please select your license and submit again.
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => requestReactivationMutation.mutate()}
                          disabled={
                            !selectedCustomerLicenseId ||
                            (surrenderConfirmed && surrenderReason.trim().length < 10) ||
                            requestReactivationMutation.isPending ||
                            activateLicenseMutation.isPending
                          }
                          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {requestReactivationMutation.isPending || activateLicenseMutation.isPending ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Processing Reactivation…
                            </>
                          ) : (
                            <>
                              <KeyRound className="h-4 w-4" />
                              Reactivate Selected License
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerSessionToken(null)
                            setCustomerLicenses([])
                            setSelectedCustomerLicenseId(null)
                            setReactivationStatus('idle')
                            setReactivationRequestId(null)
                          }}
                          className="text-xs text-slate-500 hover:text-slate-700 underline"
                        >
                          Sign out of customer account
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
