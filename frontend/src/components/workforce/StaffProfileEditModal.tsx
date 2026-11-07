/**
 * @file        StaffProfileEditModal.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.workforce
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-07
 * @updated     2026-11-08
 *
 * @description Enterprise modal for editing comprehensive Teacher and Staff profiles (Identity, Addresses, Banking, Qualifications, Contacts, and Compliance).
 */

import React, { useState } from 'react'
import {
  X,
  Save,
  User,
  MapPin,
  Briefcase,
  CreditCard,
  Phone,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { staffApi } from '../../api/endpoints'

export interface StaffProfileEditModalProps {
  isOpen: boolean
  onClose: () => void
  profile: any
  onSuccess?: () => void
}

type TabKey = 'identity' | 'addresses' | 'employment' | 'banking'

export default function StaffProfileEditModal({
  isOpen,
  onClose,
  profile,
  onSuccess,
}: StaffProfileEditModalProps) {
  if (!isOpen || !profile) return null

  const [activeTab, setActiveTab] = useState<TabKey>('identity')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Form State initialized from profile
  const [formData, setFormData] = useState({
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    phone: profile.phone || '',
    gender: profile.gender || 'male',
    blood_group: profile.blood_group || 'O+',
    date_of_birth: profile.date_of_birth || '',
    department: profile.department || 'Academics',
    staff_type: profile.staff_type || 'teacher',
    employment_type: profile.employment_type || 'full_time',
    qualification: profile.qualification || '',
    specialization: profile.specialization || '',
    experience_years: profile.experience_years !== undefined ? profile.experience_years : 0,
    responsibilities: profile.responsibilities || '',
    // Multi-Address
    current_address: profile.current_address || '',
    permanent_address: profile.permanent_address || '',
    city: profile.city || 'Mumbai',
    state: profile.state || 'Maharashtra',
    pincode: profile.pincode || '400001',
    // Emergency Contact
    emergency_contact_name: profile.emergency_contact_name || '',
    emergency_contact_phone: profile.emergency_contact_phone || '',
    emergency_contact_relation: profile.emergency_contact_relation || 'Family',
    // Banking & Financial
    bank_name: profile.bank_name || '',
    bank_account_number: profile.bank_account_number || '',
    bank_ifsc: profile.bank_ifsc || '',
    basic_salary: profile.basic_salary !== undefined ? profile.basic_salary : 0,
    pan_number: profile.pan_number || '',
    aadhar_number: profile.aadhar_number || '',
    notes: profile.notes || '',
  })

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const payload: any = {
        ...formData,
        experience_years: parseFloat(formData.experience_years as any) || 0,
        basic_salary: parseFloat(formData.basic_salary as any) || 0,
      }
      if (!payload.date_of_birth) delete payload.date_of_birth

      await staffApi.update(profile.user_id, payload)
      setSuccessMsg('Profile updated successfully!')
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 700)
    } catch (err: any) {
      console.error('Failed to update staff profile:', err)
      setErrorMsg(
        err.response?.data?.detail || 'An error occurred while updating the profile. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const TABS: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: 'identity', label: 'Identity & Contacts', icon: User },
    { key: 'addresses', label: 'Residential & Permanent Addresses', icon: MapPin },
    { key: 'employment', label: 'Employment & Workload', icon: Briefcase },
    { key: 'banking', label: 'Salary, Banking & Compliance', icon: CreditCard },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center font-bold text-white shadow-xs">
              {profile.first_name ? profile.first_name[0] : 'E'}
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Edit Workforce Profile — {profile.full_name || `${formData.first_name} ${formData.last_name}`}
              </h2>
              <p className="text-xs text-slate-400">
                Staff ID: <span className="font-mono text-indigo-300 font-bold">{profile.employee_id || `ID-${profile.user_id}`}</span> • Single Source of Truth
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notices */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-6 pt-4 border-b border-slate-200 flex gap-2 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 px-3.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                  isActive
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* ─── TAB 1: IDENTITY & CONTACTS ────────────────────────────── */}
            {activeTab === 'identity' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Personal Particulars & Primary Contacts
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => handleChange('first_name', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => handleChange('last_name', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleChange('date_of_birth', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => handleChange('gender', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 capitalize"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Blood Group</label>
                    <select
                      value={formData.blood_group}
                      onChange={(e) => handleChange('blood_group', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Primary Emergency Contact
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Contact Name</label>
                      <input
                        type="text"
                        value={formData.emergency_contact_name}
                        onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
                        placeholder="Ramesh Sharma"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Emergency Phone</label>
                      <input
                        type="text"
                        value={formData.emergency_contact_phone}
                        onChange={(e) => handleChange('emergency_contact_phone', e.target.value)}
                        placeholder="+91 98200 11223"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Relationship</label>
                      <input
                        type="text"
                        value={formData.emergency_contact_relation}
                        onChange={(e) => handleChange('emergency_contact_relation', e.target.value)}
                        placeholder="Spouse / Parent / Sibling"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 2: ADDRESSES ────────────────────────────────────────── */}
            {activeTab === 'addresses' && (
              <div className="space-y-4">
                <div className="p-3 bg-primary-50 border border-blue-200 rounded-xl text-xs text-primary-800 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Single Source of Truth (SSOT):</strong> PrathamOne EduOS stores both Residential and Permanent Hometown addresses directly on the Employee profile master.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  {/* Current / Residential Address */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <h5 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Residential / Current Address
                    </h5>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
                      <textarea
                        rows={3}
                        value={formData.current_address}
                        onChange={(e) => handleChange('current_address', e.target.value)}
                        placeholder="Flat 402, Green View Heights, Powai"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  {/* Permanent Address */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <h5 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                      Permanent / Hometown Address
                    </h5>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Native / Permanent Address</label>
                      <textarea
                        rows={3}
                        value={formData.permanent_address}
                        onChange={(e) => handleChange('permanent_address', e.target.value)}
                        placeholder="Permanent native hometown residence"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* City, State, Pincode */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pincode</label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => handleChange('pincode', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 3: EMPLOYMENT & WORKLOAD ────────────────────────────── */}
            {activeTab === 'employment' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Department, Employment & Academic Qualifications
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Department</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => handleChange('department', e.target.value)}
                      placeholder="Academics, Administration, Accounts"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Staff Classification</label>
                    <select
                      value={formData.staff_type}
                      onChange={(e) => handleChange('staff_type', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 capitalize"
                    >
                      <option value="teacher">Teacher / Faculty</option>
                      <option value="admin">Administrator</option>
                      <option value="accountant">Accountant</option>
                      <option value="counselor">Counselor</option>
                      <option value="receptionist">Receptionist</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Employment Contract Type</label>
                    <select
                      value={formData.employment_type}
                      onChange={(e) => handleChange('employment_type', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 capitalize"
                    >
                      <option value="full_time">Permanent Full-Time</option>
                      <option value="part_time">Part-Time</option>
                      <option value="contract">Fixed Contract</option>
                      <option value="visiting">Visiting Faculty</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Highest Qualification</label>
                    <input
                      type="text"
                      value={formData.qualification}
                      onChange={(e) => handleChange('qualification', e.target.value)}
                      placeholder="M.Sc, B.Ed, M.Tech, Ph.D"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Specialization / Subject</label>
                    <input
                      type="text"
                      value={formData.specialization}
                      onChange={(e) => handleChange('specialization', e.target.value)}
                      placeholder="Mathematics, Physics, Chemistry"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Experience (Years)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.experience_years}
                      onChange={(e) => handleChange('experience_years', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">
                    Key Institutional Responsibilities & Scope
                  </label>
                  <textarea
                    rows={3}
                    value={formData.responsibilities}
                    onChange={(e) => handleChange('responsibilities', e.target.value)}
                    placeholder="Enter key daily responsibilities, syllabus management, lab supervision, student mentoring..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            )}

            {/* ─── TAB 4: BANKING & COMPLIANCE ────────────────────────────── */}
            {activeTab === 'banking' && (
              <div className="space-y-4">
                <div className="p-3 bg-primary-50 border border-indigo-200 rounded-xl text-xs text-primary-900 flex items-start gap-2">
                  <CreditCard className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Primary Bank Account:</strong> Synchronized directly with payroll processing engines. Additional secondary accounts can be configured via the Banking tab.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Primary Bank Name</label>
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={(e) => handleChange('bank_name', e.target.value)}
                      placeholder="HDFC Bank / SBI"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={formData.bank_account_number}
                      onChange={(e) => handleChange('bank_account_number', e.target.value)}
                      placeholder="50100234567890"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={formData.bank_ifsc}
                      onChange={(e) => handleChange('bank_ifsc', e.target.value)}
                      placeholder="HDFC0000123"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 font-mono uppercase focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Tax Identification & Remuneration
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Basic Monthly Salary (₹)</label>
                      <input
                        type="number"
                        step="500"
                        min="0"
                        value={formData.basic_salary}
                        onChange={(e) => handleChange('basic_salary', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 font-bold focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">PAN Number</label>
                      <input
                        type="text"
                        value={formData.pan_number}
                        onChange={(e) => handleChange('pan_number', e.target.value.toUpperCase())}
                        placeholder="ABCDE1234F"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 font-mono uppercase focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Aadhaar Number</label>
                      <input
                        type="text"
                        value={formData.aadhar_number}
                        onChange={(e) => handleChange('aadhar_number', e.target.value)}
                        placeholder="1234 5678 9012"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">Administrative Notes</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder="Confidential administrative remarks or notes..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <span>All updates logged to enterprise compliance audit trail.</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-primary-600 hover:bg-primary-700 active:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
