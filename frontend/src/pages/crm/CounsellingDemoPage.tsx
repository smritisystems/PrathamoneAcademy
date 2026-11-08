/**
 * @file        CounsellingDemoPage.tsx
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
 * @description Dedicated Counselling & Demo Class Centre workspace managing trial lectures, faculty assignments, attendance rating capture, and direct admission conversion.
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Calendar, Clock, Star, Users, CheckCircle2, XCircle, Search,
  GraduationCap, BookOpen, User, Plus, Filter, MessageSquare, Phone,
  Check, AlertTriangle, ArrowRight, Sparkles, Edit2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { leadsApi, standardsApi, usersApi, academicYearsApi } from '../../api/endpoints'
import type { DemoClassQueueItem, LeadDossierResponse, Standard, User as UserType, AcademicYear } from '../../types'
import { useAuthStore, hasPermission } from '../../store/authStore'
import { useEditModeStore } from '../../store/editModeStore'
import { LockedButton } from '../../components/common'
import Modal from '../../components/Modal'
import CrmHeader from './CrmHeader'
import { NewLeadModal, ConvertToAdmissionModal, getStageBadge } from './CrmModals'
import LeadDossierDrawer from './LeadDossierDrawer'

export default function CounsellingDemoPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const editScope = 'crm:leads'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])

  const [activeTab, setActiveTab] = useState<'all' | 'scheduled' | 'attended' | 'absent'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStandardId, setSelectedStandardId] = useState<number | undefined>(undefined)
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | undefined>(undefined)

  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null)
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false)
  const [activeModalLead, setActiveModalLead] = useState<LeadDossierResponse | null>(null)
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false)

  // Feedback modal
  const [demoToRate, setDemoToRate] = useState<DemoClassQueueItem | null>(null)
  const [feedbackStatus, setFeedbackStatus] = useState('attended')
  const [feedbackRating, setFeedbackRating] = useState(5)
  const [feedbackNotes, setFeedbackNotes] = useState('')
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)

  // Query Demo Classes
  const { data: demoData, isLoading, refetch } = useQuery({
    queryKey: ['crm', 'demo-classes-queue', activeTab, searchQuery, selectedStandardId, selectedTeacherId],
    queryFn: async () => {
      const res = await leadsApi.getDemoClasses({
        status: activeTab !== 'all' ? activeTab : undefined,
        standard_id: selectedStandardId,
        teacher_id: selectedTeacherId,
        search: searchQuery || undefined,
        limit: 100,
      })
      return res.data
    },
    staleTime: 15000,
  })

  // Lookups
  const { data: standards = [] } = useQuery({
    queryKey: ['standards'],
    queryFn: async () => (await standardsApi.list()).data,
  })
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await usersApi.list({ limit: 100 })).data,
  })
  const teachers: UserType[] = ((usersData?.items || usersData || []) as UserType[]).filter(
    (u: UserType) => u.role === 'teacher' || u.role === 'faculty'
  )

  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => (await academicYearsApi.list()).data,
  })

  // Update Demo Class Mutation
  const handleSaveDemoFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!demoToRate) return
    try {
      setIsSubmittingFeedback(true)
      await leadsApi.updateDemoClass(demoToRate.id, {
        status: feedbackStatus,
        rating: feedbackRating,
        feedback: feedbackNotes,
      })
      toast.success('Demo lecture feedback & rating recorded successfully.')
      setDemoToRate(null)
      refetch()
      queryClient.invalidateQueries({ queryKey: ['crm'] })
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update demo lecture.')
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  // Open Direct Convert Modal
  const handleOpenConvert = async (leadId: number) => {
    try {
      const dossier = (await leadsApi.getLeadDossier(leadId)).data
      setActiveModalLead(dossier)
      setIsConvertModalOpen(true)
    } catch {
      toast.error('Failed to load lead details')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* ─── CRM HEADER ─────────────────────────────────────────────────── */}
      <CrmHeader
        title="Counselling & Demo — Trial Lectures Centre"
        subtitle="Manage scheduled trial classes, evaluate prospective student feedback, and fast-track admissions."
        activeTab="counselling"
        onNewEnquiryClick={() => setIsNewLeadModalOpen(true)}
        onRefresh={() => refetch()}
      />

      {/* ─── KPI METRIC BANNER ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'all'
              ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-500/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-purple-200'
          }`}
        >
          <div className="flex items-center justify-between text-purple-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Demos</span>
            <Calendar className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-purple-700">
            {demoData?.summary?.total_count ?? 0}
          </div>
          <p className="text-[11px] text-purple-600 font-semibold mt-0.5">Trial sessions booked</p>
        </div>

        <div
          onClick={() => setActiveTab('scheduled')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'scheduled'
              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Scheduled / Upcoming</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-blue-600">
            {demoData?.summary?.scheduled_count ?? 0}
          </div>
          <p className="text-[11px] text-blue-500 font-semibold mt-0.5">Pending attendance</p>
        </div>

        <div
          onClick={() => setActiveTab('attended')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'attended'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Attended Sessions</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {demoData?.summary?.attended_count ?? 0}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Completed lectures</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-amber-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Average Rating</span>
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-600 flex items-center gap-1.5">
            <span>{demoData?.summary?.avg_rating || 0}</span>
            <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
          </div>
          <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Student satisfaction</p>
        </div>
      </div>

      {/* ─── FILTERS TOOLBAR ────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by student, lead #, feedback..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 outline-hidden focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Standard Filter */}
          <select
            value={selectedStandardId ?? ''}
            onChange={(e) => setSelectedStandardId(e.target.value ? Number(e.target.value) : undefined)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="">All Standards / Classes</option>
            {standards.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Faculty / Teacher Filter */}
          <select
            value={selectedTeacherId ?? ''}
            onChange={(e) => setSelectedTeacherId(e.target.value ? Number(e.target.value) : undefined)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="">All Faculty Members</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── DEMO SESSIONS TABLE & DOSSIER DOCKED VIEW ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className={`${selectedLeadId ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden transition-all duration-300`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Lead #</th>
                  <th className="px-4 py-3">Prospect Student</th>
                  <th className="px-4 py-3">Subject / Class</th>
                  <th className="px-4 py-3">Faculty</th>
                  <th className="px-4 py-3">Scheduled Slot</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {demoData?.items?.map((item: DemoClassQueueItem) => {
                  const isSelected = selectedLeadId === item.lead_id
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedLeadId(item.lead_id)}
                      className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary-50/70' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.lead_number}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{item.lead_name}</div>
                        <span className="text-[11px] text-slate-400">{item.lead_phone}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-semibold">{item.subject_name || 'General Demo'}</div>
                        <span className="text-[10px] text-slate-400">{item.standard_name || 'Standard N/A'}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{item.teacher_name || 'Unassigned'}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">
                          {new Date(item.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(item.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.status === 'attended'
                            ? 'bg-emerald-100 text-emerald-700'
                            : item.status === 'scheduled'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.rating ? (
                          <div className="flex items-center gap-0.5 text-amber-500 font-bold">
                            <span>{item.rating}</span>
                            <Star className="w-3 h-3 fill-amber-400" />
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <LockedButton
                          isEditMode={isEditMode}
                          onClick={() => {
                            setDemoToRate(item)
                            setFeedbackStatus(item.status || 'attended')
                            setFeedbackRating(item.rating || 5)
                            setFeedbackNotes(item.feedback || '')
                          }}
                          className="px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-[11px] font-bold"
                          viewModeTooltip="Record rating and feedback"
                        >
                          Feedback
                        </LockedButton>
                        <LockedButton
                          isEditMode={isEditMode}
                          onClick={() => handleOpenConvert(item.lead_id)}
                          className="px-2 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-[11px] font-bold shadow-2xs"
                          viewModeTooltip="Convert to Student Admission"
                        >
                          Enroll
                        </LockedButton>
                      </td>
                    </tr>
                  )
                })}
                {!demoData?.items?.length && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400 font-medium">
                      {isLoading ? 'Loading demo lecture schedule...' : 'No demo lectures scheduled in this queue.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 5/12: Lead Dossier Inspector */}
        {selectedLeadId && (
          <div className="lg:col-span-5">
            <LeadDossierDrawer
              leadId={selectedLeadId}
              onClose={() => setSelectedLeadId(null)}
              onConvertToAdmission={(ld) => {
                setActiveModalLead(ld)
                setIsConvertModalOpen(true)
              }}
              standards={standards}
              academicYears={academicYears}
              isDocked={true}
            />
          </div>
        )}
      </div>

      {/* ─── MODAL 1: FEEDBACK & RATING MODAL ─────────────────────────────── */}
      {demoToRate && (
        <Modal
          isOpen={Boolean(demoToRate)}
          onClose={() => setDemoToRate(null)}
          title={`Trial Lecture Feedback: ${demoToRate.lead_name}`}
          size="md"
        >
          <form onSubmit={handleSaveDemoFeedback} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Lecture Status</label>
              <select
                value={feedbackStatus}
                onChange={(e) => setFeedbackStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              >
                <option value="attended">Attended — Lecture Conducted</option>
                <option value="absent">Absent — Student Did Not Attend</option>
                <option value="cancelled">Cancelled / Postponed</option>
                <option value="scheduled">Scheduled (Pending)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Student / Parent Rating (1 to 5 Stars)</label>
              <div className="flex items-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackRating(star)}
                    className="p-1 focus:outline-hidden"
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        star <= feedbackRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-slate-600 ml-2">{feedbackRating} Stars</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Faculty & Student Feedback Notes</label>
              <textarea
                rows={3}
                placeholder="Student grasped concepts well, eager for admission, parent requested evening batch..."
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDemoToRate(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingFeedback}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-xs disabled:opacity-50"
              >
                {isSubmittingFeedback ? 'Saving...' : 'Save Feedback'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── MODAL 2: NEW ENQUIRY & CONVERT MODALS ───────────────────────── */}
      <NewLeadModal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        standards={standards}
        academicYears={academicYears}
        onSuccess={() => {
          setIsNewLeadModalOpen(false)
          refetch()
        }}
      />

      {activeModalLead && (
        <ConvertToAdmissionModal
          isOpen={isConvertModalOpen}
          onClose={() => setIsConvertModalOpen(false)}
          lead={activeModalLead}
          standards={standards}
          academicYears={academicYears}
          onSuccess={(res) => {
            setIsConvertModalOpen(false)
            refetch()
            navigate(`/students/${res.student_id}`)
          }}
        />
      )}
    </div>
  )
}
