/**
 * @file        CrmModals.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pages.crm
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-08
 * @updated     2026-11-08
 *
 * @description Shared reusable modal dialogs and badge helpers for CRM workspaces: New Prospect Enquiry, Follow-up Activity Logger, Demo Lecture Scheduler, and Admission Fast-track Conversion.
 */

import React, { useState } from 'react'
import {
  GraduationCap, Calendar, Clock, AlertTriangle, Users, BookOpen,
  Layers, Flame, Zap, Snowflake, Check, AlertCircle, Phone, Mail, User as UserIcon
} from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../../components/Modal'
import { leadsApi } from '../../api/endpoints'
import type {
  LeadDossierResponse, Standard, Board, AcademicYear, User
} from '../../types'

// ─── STAGE & PRIORITY BADGES ──────────────────────────────────────────────────

export const getStageBadge = (stage: string) => {
  switch (stage) {
    case 'new_enquiry':
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary-100 text-primary-700">New</span>
    case 'contacted':
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">Contacted</span>
    case 'counselling_demo':
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700">Demo Scheduled</span>
    case 'interested':
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">Interested</span>
    case 'admission_pending':
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-700">Adm Pending</span>
    case 'converted':
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 text-teal-700">Converted</span>
    case 'lost':
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700">Lost</span>
    default:
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">{stage}</span>
  }
}

export const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'hot':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
          <Flame className="w-3 h-3 text-rose-500 fill-rose-500" /> Hot Lead
        </span>
      )
    case 'warm':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
          <Zap className="w-3 h-3 text-amber-500 fill-amber-500" /> Warm
        </span>
      )
    case 'cold':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
          <Snowflake className="w-3 h-3 text-blue-400" /> Cold
        </span>
      )
    default:
      return <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-600">{priority}</span>
  }
}

// ─── SUB-MODAL 1: NEW PROSPECT ENQUIRY MODAL ──────────────────────────────────

export function NewLeadModal({
  isOpen,
  onClose,
  standards = [],
  boards = [],
  academicYears = [],
  counsellors = [],
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  standards?: Standard[]
  boards?: Board[]
  academicYears?: AcademicYear[]
  counsellors?: User[]
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    gender: 'male',
    phone: '',
    email: '',
    school_name: '',
    standard_id: standards[0]?.id || 1,
    board_id: boards[0]?.id || 1,
    academic_year_id: academicYears[0]?.id || 1,
    interested_course: 'JEE Foundation',
    guardian_name: '',
    guardian_relation: 'Parent',
    guardian_phone: '',
    source: 'Website',
    priority: 'hot',
    stage: 'new_enquiry',
    assigned_to_id: counsellors[0]?.id || 1,
    notes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.first_name || !formData.last_name || !formData.phone) {
      toast.error('First name, last name, and primary phone number are required.')
      return
    }

    try {
      setIsSubmitting(true)
      await leadsApi.createLead(formData)
      toast.success('Prospect enquiry registered successfully with auto-generated lead number.')
      onSuccess()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create lead enquiry.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register New Prospect Enquiry" size="xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Sharma"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Student / Primary Phone *</label>
            <input
              type="tel"
              required
              placeholder="10-digit mobile"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              placeholder="student@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Target Class / Standard</label>
            <select
              value={formData.standard_id}
              onChange={(e) => setFormData({ ...formData, standard_id: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
            >
              {standards.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Board</label>
            <select
              value={formData.board_id}
              onChange={(e) => setFormData({ ...formData, board_id: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Interested Course / Batch</label>
            <input
              type="text"
              placeholder="e.g. JEE Crash Course"
              value={formData.interested_course}
              onChange={(e) => setFormData({ ...formData, interested_course: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Parent / Guardian Details</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Guardian Name</label>
              <input
                type="text"
                placeholder="Parent full name"
                value={formData.guardian_name}
                onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Relation</label>
              <input
                type="text"
                placeholder="Father, Mother, etc."
                value={formData.guardian_relation}
                onChange={(e) => setFormData({ ...formData, guardian_relation: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Guardian Phone</label>
              <input
                type="tel"
                placeholder="Mobile number"
                value={formData.guardian_phone}
                onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Acquisition Source</label>
            <select
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="Website">Website</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Referral">Referral</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Phone Enquiry">Phone Enquiry</option>
              <option value="Social Media">Social Media</option>
              <option value="Newspaper Ad">Newspaper Ad</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Assign to Counsellor</label>
            <select
              value={formData.assigned_to_id}
              onChange={(e) => setFormData({ ...formData, assigned_to_id: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
            >
              {counsellors.map((c) => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Specific Requirements</label>
          <textarea
            rows={2}
            placeholder="Special subject focus, budget expectation, trial class requirements..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? 'Registering...' : 'Register Enquiry'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── SUB-MODAL 2: FOLLOW-UP ACTIVITY MODAL ────────────────────────────────────

export function FollowUpModal({
  isOpen,
  onClose,
  lead,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  lead: LeadDossierResponse
  onSuccess: () => void
}) {
  const [followUpType, setFollowUpType] = useState('call')
  const [outcome, setOutcome] = useState('interested')
  const [remarks, setRemarks] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [nextTime, setNextTime] = useState('11:00')
  const [updateStage, setUpdateStage] = useState(lead.stage)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!remarks) {
      toast.error('Follow-up remarks are required.')
      return
    }

    let nextFollowUpAt: string | null = null
    if (nextDate) {
      nextFollowUpAt = new Date(`${nextDate}T${nextTime || '11:00'}:00`).toISOString()
    }

    try {
      setIsSubmitting(true)
      await leadsApi.addFollowUp(lead.id, {
        follow_up_type: followUpType,
        outcome,
        remarks,
        next_follow_up_at: nextFollowUpAt,
        update_lead_stage: updateStage !== lead.stage ? updateStage : undefined,
      })
      toast.success('Follow-up recorded successfully.')
      onSuccess()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to log follow-up.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Log Follow-up: ${lead.first_name} ${lead.last_name}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Interaction Type</label>
            <select
              value={followUpType}
              onChange={(e) => setFollowUpType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="call">Phone Call</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="meeting">In-Person Meeting</option>
              <option value="visit">Campus Visit</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Interaction Outcome</label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="interested">Interested / Positive</option>
              <option value="callback_requested">Callback Requested</option>
              <option value="demo_scheduled">Demo Scheduled</option>
              <option value="visit_scheduled">Centre Visit Scheduled</option>
              <option value="admission_confirmed">Admission Confirmed</option>
              <option value="not_reachable">Not Reachable / Busy</option>
              <option value="lost">Lost / Not Interested</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Counsellor Discussion & Remarks *</label>
          <textarea
            required
            rows={3}
            placeholder="Record what student/parent said, queries addressed, fee discussed..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Next Action Schedule</span>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Next Follow-up Date</label>
              <input
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Preferred Time</label>
              <input
                type="time"
                value={nextTime}
                onChange={(e) => setNextTime(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Update Lead Stage</label>
          <select
            value={updateStage}
            onChange={(e) => setUpdateStage(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="new_enquiry">New Enquiry</option>
            <option value="contacted">Contacted</option>
            <option value="counselling_demo">Counselling & Demo</option>
            <option value="interested">Interested / Trial</option>
            <option value="admission_pending">Admission Pending</option>
            <option value="converted">Converted to Admission</option>
            <option value="lost">Lost</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? 'Logging...' : 'Save Follow-up'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── SUB-MODAL 3: SCHEDULE DEMO CLASS ─────────────────────────────────────────

export function DemoClassModal({
  isOpen,
  onClose,
  lead,
  standards = [],
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  lead: LeadDossierResponse
  standards?: Standard[]
  onSuccess: () => void
}) {
  const [demoDate, setDemoDate] = useState('')
  const [demoTime, setDemoTime] = useState('16:00')
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!demoDate) {
      toast.error('Demo date is required.')
      return
    }

    const scheduledIso = new Date(`${demoDate}T${demoTime || '16:00'}:00`).toISOString()

    try {
      setIsSubmitting(true)
      await leadsApi.scheduleDemo(lead.id, {
        standard_id: lead.standard_id || standards[0]?.id || 1,
        scheduled_at: scheduledIso,
        feedback: feedback || 'Trial class booked from CRM',
      })
      toast.success('Demo lecture scheduled successfully and stage advanced.')
      onSuccess()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to schedule demo lecture.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Schedule Demo Lecture: ${lead.first_name} ${lead.last_name}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Demo Date *</label>
            <input
              type="date"
              required
              value={demoDate}
              onChange={(e) => setDemoDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Lecture Time</label>
            <input
              type="time"
              value={demoTime}
              onChange={(e) => setDemoTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Session Instructions / Topics</label>
          <textarea
            rows={3}
            placeholder="e.g. Physics Mechanics Chapter 1 trial with Senior Faculty..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? 'Scheduling...' : 'Schedule Demo'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── SUB-MODAL 4: CONVERT TO ADMISSION ────────────────────────────────────────

export function ConvertToAdmissionModal({
  isOpen,
  onClose,
  lead,
  standards = [],
  academicYears = [],
  onSuccess,
  canConvertAdmission = true,
}: {
  isOpen: boolean
  onClose: () => void
  lead: LeadDossierResponse
  standards?: Standard[]
  academicYears?: AcademicYear[]
  onSuccess: (res: any) => void
  canConvertAdmission?: boolean
}) {
  const [selectedExistingId, setSelectedExistingId] = useState<number | null>(null)
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split('T')[0])
  const [admissionNumber, setAdmissionNumber] = useState('')
  const [standardId, setStandardId] = useState<number>(lead.standard_id || standards[0]?.id || 1)
  const [academicYearId, setAcademicYearId] = useState<number>(lead.academic_year_id || academicYears[0]?.id || 1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const duplicates = lead.potential_duplicate_students || []

  const handleConvert = async () => {
    try {
      setIsSubmitting(true)
      const res = await leadsApi.convertToAdmission(lead.id, {
        existing_student_id: selectedExistingId,
        confirm_duplicate: Boolean(selectedExistingId),
        admission_date: admissionDate,
        admission_number: admissionNumber || undefined,
        standard_id: standardId,
        academic_year_id: academicYearId,
      })
      toast.success(res.data?.message || 'Lead successfully converted to Student Admission!')
      onSuccess(res.data)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to convert lead to admission.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Convert Prospect to Student Admission" size="lg">
      <div className="space-y-4">
        {duplicates.length > 0 && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Potential Existing Student Matches Detected</span>
            </div>
            <p className="text-xs text-amber-700">
              A student with the same phone or email exists in the system. You can merge this lead with their existing record.
            </p>
            <div className="space-y-1.5 pt-1">
              {duplicates.map((dup) => (
                <label key={dup.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="dup_select"
                    checked={selectedExistingId === dup.id}
                    onChange={() => setSelectedExistingId(dup.id)}
                    className="text-primary-600"
                  />
                  <span className="font-bold">{dup.name}</span>
                  <span className="text-slate-500">({dup.admission_number})</span>
                  <span className="text-slate-400 text-[11px]">{dup.phone}</span>
                </label>
              ))}
              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer text-xs">
                <input
                  type="radio"
                  name="dup_select"
                  checked={selectedExistingId === null}
                  onChange={() => setSelectedExistingId(null)}
                  className="text-primary-600"
                />
                <span className="font-semibold text-slate-800">Create as Brand New Student</span>
              </label>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Standard / Class</label>
            <select
              value={standardId}
              onChange={(e) => setStandardId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
            >
              {standards.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Academic Year</label>
            <select
              value={academicYearId}
              onChange={(e) => setAcademicYearId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>{ay.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Admission Date</label>
            <input
              type="date"
              value={admissionDate}
              onChange={(e) => setAdmissionDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Admission Number (Optional)</label>
            <input
              type="text"
              placeholder="Auto-generated if blank"
              value={admissionNumber}
              onChange={(e) => setAdmissionNumber(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConvert}
            disabled={isSubmitting || !canConvertAdmission}
            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-sm font-bold shadow-xs disabled:opacity-50 flex items-center gap-2"
          >
            <GraduationCap className="w-4 h-4" />
            <span>{isSubmitting ? 'Converting...' : 'Confirm Admission'}</span>
          </button>
        </div>
      </div>
    </Modal>
  )
}

