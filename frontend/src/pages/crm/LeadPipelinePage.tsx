/**
 * @file        LeadPipelinePage.tsx
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
 * @description Dedicated full-width interactive Kanban Pipeline workspace with stage progression, counsellor filtering, priority tags, and slide-over dossier inspection.
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Layers, Users, Phone, Mail, MessageSquare, Calendar, Clock,
  AlertTriangle, CheckCircle2, XCircle, Filter, Search, Plus,
  ChevronRight, Flame, Zap, Snowflake, Check, Eye, Trash2, Edit,
  GraduationCap, Building2, BookOpen, MoreVertical, Send, RefreshCw,
  PhoneCall, ShieldAlert, ArrowRight, ArrowRightLeft, Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'
import { leadsApi, standardsApi, boardsApi, usersApi, academicYearsApi } from '../../api/endpoints'
import type { LeadItem, LeadDossierResponse, LeadKanbanResponse, Standard, Board, User, AcademicYear } from '../../types'
import { useAuthStore, hasPermission } from '../../store/authStore'
import { useEditModeStore } from '../../store/editModeStore'
import { LockedButton } from '../../components/common'
import CrmHeader from './CrmHeader'
import { NewLeadModal, FollowUpModal, DemoClassModal, ConvertToAdmissionModal, getStageBadge, getPriorityBadge } from './CrmModals'
import LeadDossierDrawer from './LeadDossierDrawer'

export default function LeadPipelinePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const editScope = 'crm:leads'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])

  const [selectedSource, setSelectedSource] = useState('All Sources')
  const [selectedCounsellorId, setSelectedCounsellorId] = useState<number | undefined>(undefined)

  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null)
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false)
  const [activeModalLead, setActiveModalLead] = useState<LeadDossierResponse | null>(null)
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false)
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false)
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false)

  // Query Kanban Board
  const { data: kanbanData, isLoading, refetch } = useQuery({
    queryKey: ['crm', 'pipeline', selectedSource, selectedCounsellorId],
    queryFn: async () => {
      const res = await leadsApi.getKanban({
        source: selectedSource !== 'All Sources' ? selectedSource : undefined,
        assigned_to_id: selectedCounsellorId,
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
  const { data: boards = [] } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => (await boardsApi.list()).data,
  })
  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => (await academicYearsApi.list()).data,
  })
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await usersApi.list({ limit: 100 })).data,
  })
  const counsellors: User[] = (usersData?.items || usersData || []) as User[]

  // Stage advancement mutation
  const stageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: number; stage: string }) => {
      return leadsApi.updateStage(id, { stage })
    },
    onSuccess: () => {
      toast.success('Lead advanced to next pipeline stage.')
      queryClient.invalidateQueries({ queryKey: ['crm'] })
      refetch()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to update stage.')
    },
  })

  const stagesList = [
    { key: 'new_enquiry', title: 'NEW ENQUIRY', nextStage: 'contacted', nextLabel: 'Contacted →', color: 'bg-primary-50 text-primary-700 border-primary-200' },
    { key: 'contacted', title: 'CONTACTED', nextStage: 'counselling_demo', nextLabel: 'Demo Scheduled →', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { key: 'counselling_demo', title: 'COUNSELLING & DEMO', nextStage: 'interested', nextLabel: 'Interested →', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { key: 'interested', title: 'INTERESTED / TRIAL', nextStage: 'admission_pending', nextLabel: 'Adm Pending →', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { key: 'admission_pending', title: 'ADMISSION PENDING', nextStage: 'converted', nextLabel: 'Convert →', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { key: 'converted', title: 'CONVERTED ADMISSION', nextStage: null, nextLabel: 'Enrolled', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* ─── CRM HEADER ─────────────────────────────────────────────────── */}
      <CrmHeader
        title="Lead Pipeline — Kanban Workspace"
        subtitle="Visual admissions conversion pipeline. Drag or advance prospect stages from initial enquiry to confirmed enrolment."
        activeTab="pipeline"
        onNewEnquiryClick={() => setIsNewLeadModalOpen(true)}
        onRefresh={() => refetch()}
      />

      {/* ─── FILTER CONTROLS ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary-600" />
          <span className="text-xs font-bold text-slate-800">Pipeline Stage Board</span>
          <span className="text-[11px] text-slate-400 font-medium">(6 Active Stages)</span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Counsellor Filter */}
          <select
            value={selectedCounsellorId ?? ''}
            onChange={(e) => setSelectedCounsellorId(e.target.value ? Number(e.target.value) : undefined)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="">All Counsellors</option>
            {counsellors.map((c) => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="All Sources">All Sources</option>
            <option value="Website">Website</option>
            <option value="Walk-in">Walk-in</option>
            <option value="Referral">Referral</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Phone Enquiry">Phone Enquiry</option>
            <option value="Social Media">Social Media</option>
            <option value="Newspaper Ad">Newspaper Ad</option>
          </select>
        </div>
      </div>

      {/* ─── KANBAN 6-COLUMN GRID ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className={`${selectedLeadId ? 'lg:col-span-8' : 'lg:col-span-12'} overflow-x-auto pb-4 custom-scrollbar transition-all duration-300`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 min-w-[900px] xl:min-w-0">
            {stagesList.map((st) => {
              const col = kanbanData?.columns?.[st.key] || {
                key: st.key,
                title: st.title,
                count: 0,
                items: [],
              }

              return (
                <div key={st.key} className="bg-slate-100/70 p-3 rounded-2xl border border-slate-200/80 space-y-3 flex flex-col h-[700px]">
                  {/* Column Header */}
                  <div className={`flex items-center justify-between p-2 rounded-xl border ${st.color}`}>
                    <span className="text-[11px] font-black tracking-wider truncate">{st.title}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white shadow-2xs">
                      {col.count}
                    </span>
                  </div>

                  {/* Cards Container */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                    {col.items?.map((item: LeadItem) => {
                      const isSelected = selectedLeadId === item.id
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedLeadId(item.id)}
                          className={`p-3 bg-white rounded-xl border shadow-2xs hover:shadow-sm cursor-pointer transition-all space-y-2 ${
                            isSelected
                              ? 'border-primary-500 ring-2 ring-primary-500/20'
                              : 'border-slate-200/90 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.lead_number}
                            </span>
                            {getPriorityBadge(item.priority)}
                          </div>

                          <div>
                            <h4 className="text-xs font-bold text-slate-900 truncate">{item.full_name}</h4>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {item.class_display || 'Standard N/A'} • {item.interested_course || 'Foundation'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                            <span>{item.source}</span>
                            <span className="truncate max-w-[80px] font-medium text-slate-600">
                              {item.assigned_to_name?.split(' ')[0] || 'Unassigned'}
                            </span>
                          </div>

                          {/* Quick Dial & Advancement */}
                          <div className="flex items-center justify-between pt-1" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <a
                                href={`tel:${item.phone}`}
                                className="p-1 rounded-md text-slate-400 hover:text-primary-600 hover:bg-slate-100"
                                title="Call"
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                              <a
                                href={`https://wa.me/${item.phone?.replace(/[^\d]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-slate-100"
                                title="WhatsApp"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </a>
                            </div>

                            {st.nextStage && (
                              <button
                                disabled={!isEditMode || stageMutation.isPending}
                                onClick={() => stageMutation.mutate({ id: item.id, stage: st.nextStage! })}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                                  isEditMode
                                    ? 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                                title={isEditMode ? `Advance to ${st.nextStage}` : 'Enable Edit Mode to change stages'}
                              >
                                {st.nextLabel}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {!col.items?.length && (
                      <div className="h-24 flex items-center justify-center text-slate-400 text-[11px] font-medium border-2 border-dashed border-slate-200 rounded-xl">
                        No leads in stage
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right 4/12: Dossier Inspector */}
        {selectedLeadId && (
          <div className="lg:col-span-4">
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
        boards={boards}
        academicYears={academicYears}
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
