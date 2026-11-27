/**
 * @file        InstitutionOnboardingWizard.tsx
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
 * @created     2026-11-27
 * @updated     2026-11-27
 *
 * @description Guided first-launch Institution Profile Setup wizard for fresh coaching institute
 */

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  MapPin,
  Phone,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { settingsApi } from '../api/endpoints'
import {
  INDIAN_STATES_AND_UTS,
  INSTITUTE_PLACEHOLDERS,
  isPlaceholderInstituteName,
  readAndValidateLogoFile,
  validateProfileFields,
} from '../utils/institutionValidation'
import { applyGlobalBrandTheme, BRANDING_CONFIG } from '../config/branding'
import type { InstituteProfile } from '../types'

export interface InstitutionOnboardingWizardProps {
  isOpen: boolean
  initialProfile?: Partial<InstituteProfile> | null
  onComplete: (saved: InstituteProfile) => void
  onDefer?: () => void
}

type StepIndex = 1 | 2 | 3

export default function InstitutionOnboardingWizard({
  isOpen,
  initialProfile,
  onComplete,
  onDefer,
}: InstitutionOnboardingWizardProps) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<StepIndex>(1)
  const [formError, setFormError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    branch_name: '',
    institute_type: 'Coaching Institute',
    logo_url: '',
    address_line_1: '',
    address_line_2: '',
    area_locality: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    country: 'India',
    phone: '',
    alternate_phone: '',
    email: '',
    website: '',
    gstin: '',
    pan: '',
  })

  useEffect(() => {
    if (!isOpen || !initialProfile) return
    const rawName = initialProfile.name || ''
    setForm((prev) => ({
      ...prev,
      name: isPlaceholderInstituteName(rawName) ? '' : rawName,
      branch_name: initialProfile.branch_name || '',
      institute_type: initialProfile.institute_type || 'Coaching Institute',
      logo_url: initialProfile.logo_url || '',
      address_line_1: initialProfile.address_line_1 || initialProfile.address || '',
      address_line_2: initialProfile.address_line_2 || '',
      area_locality: initialProfile.area_locality || '',
      city: initialProfile.city || '',
      district: initialProfile.district || '',
      state: initialProfile.state || '',
      pincode: initialProfile.pincode || '',
      country: initialProfile.country || 'India',
      phone: initialProfile.phone || '',
      alternate_phone: initialProfile.alternate_phone || '',
      email: initialProfile.email || '',
      website: initialProfile.website || '',
      gstin: initialProfile.gstin || '',
      pan: initialProfile.pan || '',
    }))
    setStep(1)
    setFormError(null)
  }, [isOpen, initialProfile])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        branch_name: form.branch_name.trim() || 'Main Branch',
        institute_type: form.institute_type || 'Coaching Institute',
        logo_url: form.logo_url || null,
        address_line_1: form.address_line_1.trim() || null,
        address_line_2: form.address_line_2.trim() || null,
        area_locality: form.area_locality.trim() || null,
        city: form.city.trim() || null,
        district: form.district.trim() || null,
        state: form.state.trim() || null,
        pincode: form.pincode.trim() || null,
        country: form.country.trim() || 'India',
        phone: form.phone.trim() || null,
        alternate_phone: form.alternate_phone.trim() || null,
        email: form.email.trim() || null,
        website: form.website.trim() || null,
        gstin: form.gstin.trim().toUpperCase() || null,
        pan: form.pan.trim().toUpperCase() || null,
        onboarding_completed: true,
        reason: 'Initial Institution Profile Setup wizard completion',
      }
      await settingsApi.updateProfile(payload)
      const verified = await settingsApi.getProfile()
      if (!verified.data?.onboarding_completed || isPlaceholderInstituteName(verified.data?.name)) {
        throw new Error('Profile persistence verification did not confirm completion.')
      }
      return verified.data
    },
    onSuccess: async (saved) => {
      applyGlobalBrandTheme(
        {
          primary: saved.primary_color || '#0B2D6B',
          secondary: saved.secondary_color || '#071C44',
          accent: saved.accent_color || '#F16906',
        },
        saved.logo_url || undefined
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['institutions'] }),
        queryClient.invalidateQueries({ queryKey: ['public_branding'] }),
        queryClient.invalidateQueries({ queryKey: ['institute_profile'] }),
      ])
      toast.success('Institution profile configured and saved!')
      onComplete(saved)
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || err?.message || 'Could not save institution profile.'
      setFormError(typeof detail === 'string' ? detail : 'Could not save institution profile.')
    },
  })

  if (!isOpen) return null

  const updateField = (key: keyof typeof form, value: string) => {
    setFormError(null)
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleLogoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await readAndValidateLogoFile(file)
      updateField('logo_url', dataUrl)
    } catch (err: any) {
      setFormError(err?.message || 'Invalid logo image file.')
    }
  }

  const handleNext = () => {
    setFormError(null)
    if (step === 1) {
      const err = validateProfileFields({ name: form.name }, { requireNonPlaceholderName: true })
      if (err) {
        setFormError(err)
        return
      }
      setStep(2)
      return
    }
    if (step === 2) {
      const err = validateProfileFields(
        {
          name: form.name,
          country: form.country,
          state: form.state,
          pincode: form.pincode,
        },
        { requireNonPlaceholderName: true }
      )
      if (err) {
        setFormError(err)
        return
      }
      setStep(3)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const err = validateProfileFields(form, { requireNonPlaceholderName: true })
    if (err) {
      setFormError(err)
      return
    }
    saveMutation.mutate()
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inst-onboarding-title"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-[#0B2D6B] to-[#071C44] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <Building2 className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h2 id="inst-onboarding-title" className="text-base font-bold tracking-tight">
                Welcome to {BRANDING_CONFIG.appName} — Institution Profile Setup
              </h2>
              <p className="text-xs text-blue-100">
                Configure your coaching institute identity for receipts, ID cards, reports, and portal headers.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold">
            Step {step} / 3
          </span>
        </div>

        {/* Stepper Pills */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          {[
            { num: 1 as const, label: '1. Identity & Logo', icon: Building2 },
            { num: 2 as const, label: '2. Branch & Address', icon: MapPin },
            { num: 3 as const, label: '3. Contact & Legal', icon: Phone },
          ].map(({ num, label, icon: Icon }) => (
            <button
              key={num}
              type="button"
              onClick={() => num < step && setStep(num)}
              className={`flex items-center justify-center gap-1.5 py-2.5 transition-colors ${
                step === num
                  ? 'border-b-2 border-[#0B2D6B] bg-white text-[#0B2D6B]'
                  : step > num
                    ? 'text-emerald-700 hover:bg-white/70'
                    : 'text-slate-400 cursor-default'
              }`}
            >
              {step > num ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Icon className="h-3.5 w-3.5" />}
              <span>{label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Coaching Institute Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder={INSTITUTE_PLACEHOLDERS.name}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0B2D6B] focus:outline-none focus:ring-1 focus:ring-[#0B2D6B]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Main Branch Name
                  </label>
                  <input
                    type="text"
                    value={form.branch_name}
                    onChange={(e) => updateField('branch_name', e.target.value)}
                    placeholder={INSTITUTE_PLACEHOLDERS.branch_name}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0B2D6B] focus:outline-none focus:ring-1 focus:ring-[#0B2D6B]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Institution Type
                  </label>
                  <select
                    value={form.institute_type}
                    onChange={(e) => updateField('institute_type', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0B2D6B] focus:outline-none focus:ring-1 focus:ring-[#0B2D6B]"
                  >
                    <option value="Coaching Institute">Coaching Institute</option>
                    <option value="Tuition Center">Tuition Center</option>
                    <option value="Competitive Exam Academy">Competitive Exam Academy</option>
                    <option value="School / Junior College">School / Junior College</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="Institute Logo Preview" className="h-full w-full object-contain p-1" />
                  ) : (
                    <Building2 className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-800">Institution Logo (Optional)</div>
                  <p className="text-[11px] text-slate-500">
                    PNG, JPEG, WEBP, or sanitized SVG up to 2 MB. You can update this anytime in Settings.
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload Logo</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoPick}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700">Address Line 1</label>
                <input
                  type="text"
                  value={form.address_line_1}
                  onChange={(e) => updateField('address_line_1', e.target.value)}
                  placeholder={INSTITUTE_PLACEHOLDERS.address_line_1}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-[#0B2D6B] focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700">Address Line 2</label>
                <input
                  type="text"
                  value={form.address_line_2}
                  onChange={(e) => updateField('address_line_2', e.target.value)}
                  placeholder={INSTITUTE_PLACEHOLDERS.address_line_2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-[#0B2D6B] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Area / Locality</label>
                <input
                  type="text"
                  value={form.area_locality}
                  onChange={(e) => updateField('area_locality', e.target.value)}
                  placeholder={INSTITUTE_PLACEHOLDERS.area_locality}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-[#0B2D6B] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder={INSTITUTE_PLACEHOLDERS.city}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-[#0B2D6B] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">District</label>
                <input
                  type="text"
                  value={form.district}
                  onChange={(e) => updateField('district', e.target.value)}
                  placeholder={INSTITUTE_PLACEHOLDERS.district}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-[#0B2D6B] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Country</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => updateField('country', e.target.value)}
                  placeholder="India"
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-[#0B2D6B] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">State / UT</label>
                {form.country.trim().toLowerCase() === 'india' || !form.country.trim() ? (
                  <select
                    value={form.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-[#0B2D6B] focus:outline-none"
                  >
                    <option value="">{INSTITUTE_PLACEHOLDERS.state}</option>
                    {INDIAN_STATES_AND_UTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    placeholder="State / Province"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-[#0B2D6B] focus:outline-none"
                  />
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">PIN Code</label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={(e) => updateField('pincode', e.target.value)}
                  placeholder={INSTITUTE_PLACEHOLDERS.pincode}
                  maxLength={10}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-sm focus:border-[#0B2D6B] focus:outline-none"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Mobile Number (Optional)</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder={INSTITUTE_PLACEHOLDERS.phone}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-[#0B2D6B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Alternate Mobile (Optional)</label>
                  <input
                    type="tel"
                    value={form.alternate_phone}
                    onChange={(e) => updateField('alternate_phone', e.target.value)}
                    placeholder={INSTITUTE_PLACEHOLDERS.alternate_phone}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-[#0B2D6B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder={INSTITUTE_PLACEHOLDERS.email}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-[#0B2D6B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Website (Optional)</label>
                  <input
                    type="text"
                    value={form.website}
                    onChange={(e) => updateField('website', e.target.value)}
                    placeholder={INSTITUTE_PLACEHOLDERS.website}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-[#0B2D6B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={form.gstin}
                    onChange={(e) => updateField('gstin', e.target.value.toUpperCase())}
                    placeholder={INSTITUTE_PLACEHOLDERS.gstin}
                    maxLength={15}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-sm uppercase focus:border-[#0B2D6B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">PAN (Optional)</label>
                  <input
                    type="text"
                    value={form.pan}
                    onChange={(e) => updateField('pan', e.target.value.toUpperCase())}
                    placeholder={INSTITUTE_PLACEHOLDERS.pan}
                    maxLength={10}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-sm uppercase focus:border-[#0B2D6B] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-[11px] text-emerald-900">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  Optional tax and address fields can be left blank and updated anytime later inside Institute Settings.
                </span>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <div className="flex items-center gap-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((prev) => (prev === 3 ? 2 : 1))}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </button>
              )}
              {onDefer && !isPlaceholderInstituteName(initialProfile?.name) && (
                <button
                  type="button"
                  onClick={onDefer}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100"
                >
                  Complete Later
                </button>
              )}
            </div>

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B2D6B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#082354]"
              >
                <span>Continue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{saveMutation.isPending ? 'Saving Profile…' : 'Save & Complete Setup'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
