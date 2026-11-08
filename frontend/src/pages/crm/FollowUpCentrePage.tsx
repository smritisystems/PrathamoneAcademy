/**
 * @file        FollowUpCentrePage.tsx
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
 * @description Dedicated Follow-up Calling Centre workspace featuring overdue call queues, today's agenda, communication channels, and fast outcome recording.
 */

import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Clock, Phone, MessageSquare, Calendar, AlertTriangle, CheckCircle2,
  Users, Search, Filter, Plus, ArrowRight, UserCheck, RefreshCw,
  PhoneCall, ShieldAlert, Check, XCircle, Mail, MapPin, ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import { leadsApi, usersApi, standardsApi, academicYearsApi } from '../../api/endpoints'
import type { FollowUpQueueItem, LeadDossierResponse, User, Standard, AcademicYear } from '../../types'
import { useAuthStore } from '../../store/authStore'
import { useEditModeStore } from '../../store/editModeStore'
import { LockedButton } from '../../components/common'
import CrmHeader from './CrmHeader'
import { NewLeadModal, FollowUpModal, DemoClassModal, ConvertToAdmissionModal, getStageBadge, getPriorityBadge } from './CrmModals'
import LeadDossierDrawer from './LeadDossierDrawer'

export default function FollowUpCentrePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const editScope = 'crm:leads'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])

  const [searchParams, setSearchParams] = useSearchParams()
  const initialStatus = searchParams.get('status') || 'today'

  // Filter States
  const [activeTab, setActiveTab] = useState<'overdue' | 'today' | 'upcoming' | 'completed' | 'all'>(
    ['overdue', 'today', 'upcoming', 'completed', 'all'].includes(initialStatus) ? (initialStatus as any) : 'today'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedCounsellorId, setSelectedCounsellorId] = useState<number | undefined>(undefined)

  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null)
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false)
  const [activeModalLead, setActiveModalLead] = useState<LeadDossierResponse | null>(null)
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false)
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false)
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false)

  // Query Follow-ups Queue
  const { data: followUpsData, isLoading, refetch } = useQuery({
    queryKey: ['crm', 'follow-ups-queue', activeTab, searchQuery, selectedType, selectedCounsellorId],
    queryFn: async () => {
      const res = await leadsApi.getFollowUps({
        status: activeTab !== 'all' ? activeTab : undefined,
        follow_up_type: selectedType !== 'all' ? selectedType : undefined,
        counsellor_id: selectedCounsellorId,
        search: searchQuery || undefined,
        limit: 100,
      })
      return res.data
    },
    staleTime: 15000,
  })

  // Lookups
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await usersApi.list({ limit: 100 })).data,
  })
  const counsellors: User[] = (usersData?.items || usersData || []) as User[]

  const { data: standards = [] } = useQuery({
    queryKey: ['standards'],
    queryFn: async () => (await standardsApi.list()).data,
  })
  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => (await academicYearsApi.list()).data,
  })

  // Open Log Modal for specific item
  const handleOpenLogModal = async (leadId: number) => {
    try {
      const dossier = (await leadsApi.getLeadDossier(leadId)).data
      setActiveModalLead(dossier)
      setIsFollowUpModalOpen(true)
    } catch {
      toast.error('Failed to load lead details')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* ─── CRM HEADER ─────────────────────────────────────────────────── */}
      <CrmHeader
        title="Follow-up Centre — Daily Calling Desk"
        subtitle="Escalate overdue prospect calls, manage today's appointment agenda, and capture interaction outcomes in real-time."
        activeTab="followups"
        onNewEnquiryClick={() => setIsNewLeadModalOpen(true)}
        onRefresh={() => refetch()}
      />

      {/* ─── KPI METRIC BANNER ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('overdue')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'overdue'
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Overdue Calls</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-600">
            {followUpsData?.summary?.overdue_count ?? 0}
          </div>
          <p className="text-[11px] text-rose-500 font-semibold mt-0.5">Missed SLA target</p>
        </div>

        <div
          onClick={() => setActiveTab('today')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'today'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Today's Agenda</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-600">
            {followUpsData?.summary?.today_count ?? 0}
          </div>
          <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Scheduled for today</p>
        </div>

        <div
          onClick={() => setActiveTab('upcoming')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'upcoming'
              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Upcoming Agenda</span>
            <Calendar className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-blue-600">
            {followUpsData?.summary?.upcoming_count ?? 0}
          </div>
          <p className="text-[11px] text-blue-500 font-semibold mt-0.5">Next 7 to 14 days</p>
        </div>

        <div
          onClick={() => setActiveTab('completed')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'completed'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Completed Log</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {followUpsData?.summary?.completed_count ?? 0}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Logged interactions</p>
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
              placeholder="Search student name, phone, remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 outline-hidden focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Interaction Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="all">All Interaction Types</option>
            <option value="call">Phone Call</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="meeting">In-Person Meeting</option>
            <option value="visit">Campus Visit</option>
          </select>

          {/* Counsellor Filter */}
          <select
            value={selectedCounsellorId ?? ''}
            onChange={(e) => setSelectedCounsellorId(e.target.value ? Number(e.target.value) : undefined)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="">All Counsellors</option>
            {counsellors.map((c) => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── FOLLOW-UP QUEUE TABLE & DOSSIER DOCKED VIEW ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className={`${selectedLeadId ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden transition-all duration-300`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Lead #</th>
                  <th className="px-4 py-3">Prospect Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Scheduled / Due</th>
                  <th className="px-4 py-3">Counsellor</th>
                  <th className="px-4 py-3">Last Remarks</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {followUpsData?.items?.map((item: FollowUpQueueItem) => {
                  const isSelected = selectedLeadId === item.lead_id
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedLeadId(item.lead_id)}
                      className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary-50/70' : item.is_overdue ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.lead_number}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{item.lead_name}</div>
                        <span className="text-[11px] text-slate-400">{item.lead_phone}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                          {item.follow_up_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.scheduled_at ? (
                          <div className="space-y-0.5">
                            <span className={`font-bold ${item.is_overdue ? 'text-rose-600' : 'text-slate-700'}`}>
                              {new Date(item.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {new Date(item.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{item.counsellor_name || 'Unassigned'}</td>
                      <td className="px-4 py-3 max-w-xs truncate text-slate-600">
                        {item.remarks || item.outcome || 'Pending follow-up'}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <a
                          href={`tel:${item.lead_phone}`}
                          className="inline-block p-1 rounded-md text-slate-400 hover:text-primary-600 hover:bg-slate-100"
                          title="Call"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`https://wa.me/${item.lead_phone?.replace(/[^\d]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-slate-100"
                          title="WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                        <LockedButton
                          isEditMode={isEditMode}
                          onClick={() => handleOpenLogModal(item.lead_id)}
                          className="px-2 py-1 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg text-[11px] font-bold"
                        >
                          Log Outcome
                        </LockedButton>
                      </td>
                    </tr>
                  )
                })}
                {!followUpsData?.items?.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400 font-medium">
                      {isLoading ? 'Loading follow-up queue...' : 'No follow-up tasks in this queue.'}
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
              onScheduleFollowUp={(ld) => {
                setActiveModalLead(ld)
                setIsFollowUpModalOpen(true)
              }}
              onScheduleDemo={(ld) => {
                setActiveModalLead(ld)
                setIsDemoModalOpen(true)
              }}
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

      {/* ─── MODALS ───────────────────────────────────────────────────────── */}
      <NewLeadModal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        standards={standards}
        counsellors={counsellors}
        onSuccess={() => {
          setIsNewLeadModalOpen(false)
          refetch()
        }}
      />

      {activeModalLead && (
        <>
          <FollowUpModal
            isOpen={isFollowUpModalOpen}
            onClose={() => setIsFollowUpModalOpen(false)}
            lead={activeModalLead}
            onSuccess={() => {
              setIsFollowUpModalOpen(false)
              refetch()
            }}
          />
          <DemoClassModal
            isOpen={isDemoModalOpen}
            onClose={() => setIsDemoModalOpen(false)}
            lead={activeModalLead}
            standards={standards}
            onSuccess={() => {
              setIsDemoModalOpen(false)
              refetch()
            }}
          />
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
        </>
      )}
    </div>
  )
}
