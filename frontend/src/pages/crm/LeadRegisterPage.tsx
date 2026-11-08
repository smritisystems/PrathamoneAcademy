/**
 * @file        LeadRegisterPage.tsx
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
 * @description Master Lead & Enquiry Register workspace featuring multi-tier filters, search, quick presets, batch re-assignment, Excel export, and slide-over dossier inspection.
 */

import React, { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, UserPlus, Phone, Mail, MessageSquare, Calendar, Clock,
  AlertTriangle, CheckCircle2, XCircle, Target, ChevronRight, Filter,
  Search, Plus, ExternalLink, ArrowRight, RotateCcw, Lock, Flame,
  Zap, Snowflake, Check, Eye, Trash2, Edit, GraduationCap, Building2,
  BookOpen, Layers, MoreVertical, Send, RefreshCw, BarChart2,
  ArrowUpRight, PhoneCall, ShieldAlert, FileText, CheckSquare, X,
  Download, FileSpreadsheet, SlidersHorizontal
} from 'lucide-react'
import toast from 'react-hot-toast'
import { leadsApi, standardsApi, boardsApi, usersApi, academicYearsApi } from '../../api/endpoints'
import type { LeadItem, LeadDossierResponse, Standard, Board, User, AcademicYear } from '../../types'
import { useAuthStore, hasPermission } from '../../store/authStore'
import { useEditModeStore } from '../../store/editModeStore'
import { DeleteConfirmationModal, LockedButton, LockedIconButton } from '../../components/common'
import CrmHeader from './CrmHeader'
import { NewLeadModal, FollowUpModal, DemoClassModal, ConvertToAdmissionModal, getStageBadge, getPriorityBadge } from './CrmModals'
import LeadDossierDrawer from './LeadDossierDrawer'

export default function LeadRegisterPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const editScope = 'crm:leads'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])
  const canDeleteLeads = hasPermission(user, 'leads:delete')

  const [searchParams, setSearchParams] = useSearchParams()
  const initialSource = searchParams.get('source') || 'All Sources'
  const initialStage = searchParams.get('stage') || 'all'

  // Filter States
  const [activePreset, setActivePreset] = useState<'all' | 'hot' | 'my' | 'overdue' | 'converted' | 'lost'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStage, setSelectedStage] = useState(initialStage)
  const [selectedPriority, setSelectedPriority] = useState('all')
  const [selectedSource, setSelectedSource] = useState(initialSource)
  const [selectedCounsellorId, setSelectedCounsellorId] = useState<number | undefined>(undefined)
  const [selectedStandardId, setSelectedStandardId] = useState<number | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)

  // Selection & Drawer States
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null)
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([])
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false)
  const [activeModalLead, setActiveModalLead] = useState<LeadDossierResponse | null>(null)
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false)
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false)
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState<LeadItem | null>(null)

  // Query Leads
  const { data: leadsData, isLoading, refetch } = useQuery({
    queryKey: ['crm', 'register', activePreset, searchQuery, selectedStage, selectedPriority, selectedSource, selectedCounsellorId, selectedStandardId, page, limit],
    queryFn: async () => {
      let stageParam = selectedStage !== 'all' ? selectedStage : undefined
      let priorityParam = selectedPriority !== 'all' ? selectedPriority : undefined
      let followUpFilter: string | undefined = undefined
      let counsellorParam = selectedCounsellorId

      if (activePreset === 'hot') priorityParam = 'hot'
      if (activePreset === 'my') counsellorParam = user?.id
      if (activePreset === 'overdue') followUpFilter = 'overdue'
      if (activePreset === 'converted') stageParam = 'converted'
      if (activePreset === 'lost') stageParam = 'lost'

      const res = await leadsApi.getLeads({
        stage: stageParam,
        priority: priorityParam,
        source: selectedSource !== 'All Sources' ? selectedSource : undefined,
        assigned_to_id: counsellorParam,
        standard_id: selectedStandardId,
        search: searchQuery || undefined,
        follow_up_filter: followUpFilter,
        page,
        limit,
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

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => leadsApi.deleteLead(id),
    onSuccess: () => {
      toast.success('Lead enquiry archived successfully.')
      setLeadToDelete(null)
      queryClient.invalidateQueries({ queryKey: ['crm'] })
      refetch()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to delete lead.')
    },
  })

  // Export to CSV
  const handleExportCsv = () => {
    if (!leadsData?.items?.length) {
      toast.error('No leads available to export.')
      return
    }
    const headers = ['Lead Number', 'Name', 'Phone', 'Email', 'Standard', 'Source', 'Priority', 'Stage', 'Counsellor', 'Enquiry Date']
    const rows = leadsData.items.map((l) => [
      l.lead_number,
      `"${l.full_name}"`,
      l.phone || '',
      l.email || '',
      `"${l.class_display || ''}"`,
      l.source,
      l.priority,
      l.stage,
      `"${l.assigned_to_name || ''}"`,
      l.enquiry_date || '',
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Leads_Register_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Leads Register exported to CSV.')
  }

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedLeadIds.length === (leadsData?.items?.length || 0)) {
      setSelectedLeadIds([])
    } else {
      setSelectedLeadIds(leadsData?.items?.map((l) => l.id) || [])
    }
  }

  const toggleSelectOne = (id: number) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* ─── CRM HEADER ─────────────────────────────────────────────────── */}
      <CrmHeader
        title="All Leads — Master Enquiry Register"
        subtitle="Universal enquiry registry with multi-parameter filtering, counsellor assignments, and full dossier integration."
        activeTab="all"
        onNewEnquiryClick={() => setIsNewLeadModalOpen(true)}
        onRefresh={() => refetch()}
        extraActions={
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        }
      />

      {/* ─── PRESET FILTER TABS ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { key: 'all', label: 'All Enquiries', icon: Users },
          { key: 'hot', label: 'Hot Prospects', icon: Flame },
          { key: 'my', label: 'My Leads', icon: UserPlus },
          { key: 'overdue', label: 'Overdue Follow-ups', icon: Clock },
          { key: 'converted', label: 'Converted Admissions', icon: CheckCircle2 },
          { key: 'lost', label: 'Lost / Closed', icon: XCircle },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activePreset === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActivePreset(tab.key as any)
                setPage(1)
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                isActive
                  ? 'bg-primary-600 text-white border-primary-600 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ─── FILTER TOOLBAR ─────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, lead number, phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 outline-hidden focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Stage Dropdown */}
          <select
            value={selectedStage}
            onChange={(e) => {
              setSelectedStage(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="all">All Stages</option>
            <option value="new_enquiry">New Enquiry</option>
            <option value="contacted">Contacted</option>
            <option value="counselling_demo">Counselling & Demo</option>
            <option value="interested">Interested / Trial</option>
            <option value="admission_pending">Admission Pending</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
          </select>

          {/* Priority Dropdown */}
          <select
            value={selectedPriority}
            onChange={(e) => {
              setSelectedPriority(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="all">All Priorities</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>

          {/* Source Dropdown */}
          <select
            value={selectedSource}
            onChange={(e) => {
              setSelectedSource(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
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

          {/* Counsellor Dropdown */}
          <select
            value={selectedCounsellorId ?? ''}
            onChange={(e) => {
              setSelectedCounsellorId(e.target.value ? Number(e.target.value) : undefined)
              setPage(1)
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="">All Counsellors</option>
            {counsellors.map((c) => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </select>
        </div>

        {/* Active Filters Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Showing <strong className="text-slate-800">{leadsData?.items?.length ?? 0}</strong> of <strong className="text-slate-800">{leadsData?.total ?? 0}</strong> registered leads
          </span>
          {selectedLeadIds.length > 0 && (
            <span className="font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-lg border border-primary-200">
              {selectedLeadIds.length} leads selected
            </span>
          )}
        </div>
      </div>

      {/* ─── DATA TABLE & DOSSIER SPLIT VIEW ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 8/12: Master Leads Register Grid */}
        <div className={`${selectedLeadId ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden transition-all duration-300`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="w-10 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.length > 0 && selectedLeadIds.length === leadsData?.items?.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-4 py-3">Lead #</th>
                  <th className="px-4 py-3">Prospect</th>
                  <th className="px-4 py-3">Class / Course</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Counsellor</th>
                  <th className="px-4 py-3">Next Action</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leadsData?.items?.map((item: LeadItem) => {
                  const isSelected = selectedLeadId === item.id
                  const isChecked = selectedLeadIds.includes(item.id)
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedLeadId(item.id)}
                      className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary-50/70' : isChecked ? 'bg-slate-50/60' : ''
                      }`}
                    >
                      <td className="w-10 px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(item.id)}
                          className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.lead_number}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{item.full_name}</div>
                        <span className="text-[11px] text-slate-400">{item.phone}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div>{item.class_display || 'N/A'}</div>
                        <span className="text-[10px] text-slate-400">{item.interested_course || 'Foundation'}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.source}</td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{item.assigned_to_name || 'Unassigned'}</td>
                      <td className="px-4 py-3">
                        {item.next_follow_up_at ? (
                          <span className="font-semibold text-slate-700">
                            {new Date(item.next_follow_up_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{getStageBadge(item.stage)}</td>
                      <td className="px-4 py-3 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <a
                          href={`tel:${item.phone}`}
                          className="inline-block p-1 rounded-md text-slate-400 hover:text-primary-600 hover:bg-slate-100"
                          title="Call Prospect"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`https://wa.me/${item.phone?.replace(/[^\d]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-slate-100"
                          title="WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                        <LockedIconButton
                          isEditMode={isEditMode}
                          onClick={() => setLeadToDelete(item)}
                          disabled={!canDeleteLeads}
                          className="inline-block p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                          title="Archive / Delete Lead"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                        />
                      </td>
                    </tr>
                  )
                })}
                {!leadsData?.items?.length && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400 font-medium">
                      {isLoading ? 'Loading master enquiries register...' : 'No enquiries found matching filter criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between p-4 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              Page <strong>{leadsData?.page || 1}</strong> of <strong>{leadsData?.total_pages || 1}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={(leadsData?.page || 1) <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 hover:bg-slate-50 font-semibold"
              >
                Previous
              </button>
              <button
                disabled={(leadsData?.page || 1) >= (leadsData?.total_pages || 1)}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 hover:bg-slate-50 font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Right 5/12: Lead Dossier Inspector (renders when selected) */}
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

      {leadToDelete && (
        <DeleteConfirmationModal
          isOpen={Boolean(leadToDelete)}
          onClose={() => setLeadToDelete(null)}
          scope={editScope}
          entityType="Lead / Enquiry"
          entityName={`${leadToDelete.lead_number} — ${leadToDelete.full_name}`}
          entityId={leadToDelete.id}
          onConfirm={() => deleteMutation.mutate(leadToDelete.id)}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
