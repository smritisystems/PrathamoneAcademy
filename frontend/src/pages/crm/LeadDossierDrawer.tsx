/**
 * @file        LeadDossierDrawer.tsx
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
 * @description Slide-over & inline docked Lead Dossier drawer rendering 360-degree enquiry profiles, interactive timelines, communication logs, demo lectures, and admission fast-track conversion.
 */

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, Phone, Mail, MessageSquare, Calendar, Clock, AlertTriangle,
  CheckCircle2, Target, ChevronRight, Check, Eye, Trash2, Edit,
  GraduationCap, Building2, BookOpen, Layers, MoreVertical, Send,
  ArrowUpRight, PhoneCall, ShieldAlert, FileText, CheckSquare, X,
  Printer, Lock, Sparkles, ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leadsApi } from '../../api/endpoints'
import type { LeadDossierResponse, LeadItem, Standard, AcademicYear } from '../../types'
import { useAuthStore, hasPermission } from '../../store/authStore'
import { useEditModeStore } from '../../store/editModeStore'
import { LockedButton, LockedIconButton } from '../../components/common'
import { getStageBadge, getPriorityBadge } from './CrmModals'
import { useUniversalPrint } from '../../components/printing'

export interface LeadDossierDrawerProps {
  leadId: number | null
  onClose?: () => void
  onScheduleFollowUp?: (lead: LeadDossierResponse) => void
  onScheduleDemo?: (lead: LeadDossierResponse) => void
  onConvertToAdmission?: (lead: LeadDossierResponse) => void
  standards?: Standard[]
  academicYears?: AcademicYear[]
  isDocked?: boolean
}

export default function LeadDossierDrawer({
  leadId,
  onClose,
  onScheduleFollowUp,
  onScheduleDemo,
  onConvertToAdmission,
  isDocked = false,
}: LeadDossierDrawerProps) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const editScope = 'crm:leads'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])
  const { openPrint, PrintModal } = useUniversalPrint()

  const [activeTab, setActiveTab] = useState<'overview' | 'followups' | 'communication' | 'demo'>('overview')
  const [commChannel, setCommChannel] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp')
  const [commContent, setCommContent] = useState('')
  const [isSendingComm, setIsSendingComm] = useState(false)

  const canConvertAdmission =
    hasPermission(user, 'students:admission') ||
    hasPermission(user, 'admissions:create') ||
    hasPermission(user, 'students:manage')

  // Query Lead Dossier
  const { data: leadDossier, isLoading, refetch } = useQuery({
    queryKey: ['crm', 'lead', leadId],
    queryFn: async () => {
      if (!leadId) return null
      const res = await leadsApi.getLeadDossier(leadId)
      return res.data
    },
    enabled: Boolean(leadId),
    staleTime: 10000,
  })

  // Mutation to advance stage
  const stageMutation = useMutation({
    mutationFn: async ({ stage, remarks }: { stage: string; remarks?: string }) => {
      if (!leadId) return
      return leadsApi.updateStage(leadId, { stage, remarks })
    },
    onSuccess: () => {
      toast.success('Stage updated successfully')
      queryClient.invalidateQueries({ queryKey: ['crm'] })
      refetch()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to update stage')
    },
  })

  // Send communication mutation
  const handleSendComm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commContent.trim() || !leadId) return
    try {
      setIsSendingComm(true)
      await leadsApi.logCommunication(leadId, {
        channel: commChannel,
        content: commContent,
        recipient_name: leadDossier ? `${leadDossier.first_name} ${leadDossier.last_name}` : undefined,
        recipient_destination: leadDossier?.phone || undefined,
      })
      toast.success(`Message logged and simulated dispatch via ${commChannel.toUpperCase()}.`)
      setCommContent('')
      refetch()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to send communication')
    } finally {
      setIsSendingComm(false)
    }
  }

  if (!leadId) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
        <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-slate-700">No Lead Selected</h4>
        <p className="text-xs text-slate-400 mt-1">Select an enquiry from the register to inspect its complete 360-degree dossier.</p>
      </div>
    )
  }

  if (isLoading || !leadDossier) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading Lead Dossier profile...</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-5">
        {/* Dossier Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-600" />
            <h3 className="text-sm font-black text-slate-900 tracking-tight">Lead Dossier</h3>
            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {leadDossier.lead_number}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                openPrint({
                  targetElementId: 'crm-dossier-printable-section',
                  documentType: 'employee_dossier',
                  documentTitle: `Lead Dossier - ${leadDossier.first_name} ${leadDossier.last_name}`,
                  initialSettings: {
                    paperSize: 'A4',
                    orientation: 'portrait',
                    confidentiality: 'Confidential CRM Dossier',
                    documentId: leadDossier.lead_number,
                  },
                })
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors"
              title="Print Lead Dossier"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Printable Lead Dossier Content */}
        <div id="crm-dossier-printable-section" className="space-y-4">
          {/* Identity Card */}
          <div className="flex items-start gap-3.5 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
            <div className="w-12 h-12 rounded-xl bg-primary-600 text-white flex items-center justify-center font-black text-lg shadow-xs">
              {leadDossier.first_name?.[0] || 'L'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-base font-black text-slate-900 truncate">
                  {leadDossier.first_name} {leadDossier.last_name}
                </h4>
                {getPriorityBadge(leadDossier.priority)}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {leadDossier.class_display || 'Standard N/A'} • {leadDossier.interested_course || 'Foundation'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {getStageBadge(leadDossier.stage)}
                <span className="text-[11px] text-slate-400 font-medium">via {leadDossier.source}</span>
              </div>
            </div>
          </div>

          {/* Quick Communication Actions */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`tel:${leadDossier.phone}`}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
              <span>Call ({leadDossier.phone})</span>
            </a>
            <a
              href={`https://wa.me/${leadDossier.phone?.replace(/[^\d]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          </div>

          {/* Dossier Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === 'overview' ? 'bg-white text-primary-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('followups')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === 'followups' ? 'bg-white text-primary-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Follow-ups ({leadDossier.follow_ups?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('demo')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === 'demo' ? 'bg-white text-primary-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Demo ({leadDossier.demo_classes?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('communication')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === 'communication' ? 'bg-white text-primary-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Comms
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Counsellor</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{leadDossier.assigned_to_name || 'Unassigned'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Enquiry Date</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{leadDossier.enquiry_date || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Next Follow-up</span>
                  <p className="font-semibold text-primary-700 mt-0.5">
                    {leadDossier.next_follow_up_at
                      ? new Date(leadDossier.next_follow_up_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                      : 'None scheduled'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">School / College</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{leadDossier.school_name || 'N/A'}</p>
                </div>
              </div>

              {leadDossier.guardian_name && (
                <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Guardian Info</span>
                  <p className="font-semibold text-slate-800">
                    {leadDossier.guardian_name} ({leadDossier.guardian_relation || 'Parent'})
                  </p>
                  <p className="text-slate-600">{leadDossier.guardian_phone || 'No phone recorded'}</p>
                </div>
              )}

              {leadDossier.notes && (
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/50 space-y-1">
                  <span className="text-[10px] font-bold text-amber-700 uppercase">Notes & Special Requirements</span>
                  <p className="text-slate-700 leading-relaxed">{leadDossier.notes}</p>
                </div>
              )}

              {/* Stage Transition Selector */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-bold text-slate-700">Advance Pipeline Stage</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['new_enquiry', 'contacted', 'counselling_demo', 'interested', 'admission_pending', 'converted'].map((st) => (
                    <button
                      key={st}
                      disabled={!isEditMode || leadDossier.stage === st || stageMutation.isPending}
                      onClick={() => stageMutation.mutate({ stage: st })}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                        leadDossier.stage === st
                          ? 'bg-primary-600 text-white border-primary-600 shadow-2xs'
                          : isEditMode
                          ? 'bg-white text-slate-700 border-slate-200 hover:border-primary-400 hover:bg-primary-50/50'
                          : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      }`}
                    >
                      {st.replace('_', ' ').toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FOLLOW-UPS TIMELINE */}
          {activeTab === 'followups' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Follow-up History</span>
                {onScheduleFollowUp && (
                  <LockedButton
                    isEditMode={isEditMode}
                    onClick={() => onScheduleFollowUp(leadDossier)}
                    className="px-2.5 py-1 text-[11px] bg-primary-600 text-white rounded-lg font-bold"
                  >
                    + Log Call
                  </LockedButton>
                )}
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {leadDossier.follow_ups?.map((f) => (
                  <div key={f.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 capitalize">{f.follow_up_type} • {f.outcome || 'Completed'}</span>
                      <span className="text-[10px] text-slate-400">
                        {f.created_at ? new Date(f.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-snug">{f.remarks || 'No remarks recorded.'}</p>
                    {f.performed_by_name && (
                      <p className="text-[10px] text-slate-400 font-medium">Logged by: {f.performed_by_name}</p>
                    )}
                  </div>
                ))}
                {!leadDossier.follow_ups?.length && (
                  <p className="text-center text-slate-400 text-xs py-4">No follow-ups recorded yet.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DEMO CLASSES */}
          {activeTab === 'demo' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Demo Lecture Sessions</span>
                {onScheduleDemo && (
                  <LockedButton
                    isEditMode={isEditMode}
                    onClick={() => onScheduleDemo(leadDossier)}
                    className="px-2.5 py-1 text-[11px] bg-purple-600 text-white rounded-lg font-bold"
                  >
                    + Schedule Demo
                  </LockedButton>
                )}
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {leadDossier.demo_classes?.map((d) => (
                  <div key={d.id} className="p-2.5 bg-purple-50/60 rounded-xl border border-purple-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-900">{d.subject_name || 'Demo Lecture'}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-purple-700 border border-purple-200 uppercase">
                        {d.status}
                      </span>
                    </div>
                    <p className="text-slate-600">
                      Slot: {new Date(d.scheduled_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                    {d.teacher_name && <p className="text-slate-600">Faculty: {d.teacher_name}</p>}
                    {d.feedback && <p className="text-purple-800 font-medium italic">"{d.feedback}"</p>}
                  </div>
                ))}
                {!leadDossier.demo_classes?.length && (
                  <p className="text-center text-slate-400 text-xs py-4">No demo classes scheduled.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: COMMUNICATION LOGS */}
          {activeTab === 'communication' && (
            <div className="space-y-3">
              <form onSubmit={handleSendComm} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    value={commChannel}
                    onChange={(e) => setCommChannel(e.target.value as any)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                  <span className="text-[11px] text-slate-400">Quick Message to Prospect</span>
                </div>
                <textarea
                  required
                  rows={2}
                  placeholder={`Type message to dispatch via ${commChannel}...`}
                  value={commContent}
                  onChange={(e) => setCommContent(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
                <div className="flex justify-end">
                  <LockedButton
                    isEditMode={isEditMode}
                    type="submit"
                    onClick={() => {}}
                    disabled={isSendingComm}
                    className="px-3 py-1 bg-primary-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    <Send className="w-3 h-3" />
                    <span>{isSendingComm ? 'Sending...' : 'Log & Dispatch'}</span>
                  </LockedButton>
                </div>
              </form>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {leadDossier.communication_history?.map((c) => (
                  <div key={c.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">{c.channel}</span>
                      <span className="text-[10px] text-slate-400">
                        {c.sent_at ? new Date(c.sent_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}
                      </span>
                    </div>
                    <p className="text-slate-600">{c.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── FAST-TRACK ADMISSION CONVERSION BUTTON ─────────────────────── */}
          <div className="pt-2">
            {leadDossier.stage === 'converted' ? (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-center space-y-1">
                <span className="text-xs font-bold text-teal-800 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  Successfully Converted to Student Admission
                </span>
                {leadDossier.converted_student_id && (
                  <Link
                    to={`/students/${leadDossier.converted_student_id}`}
                    className="inline-flex items-center gap-1 text-xs text-primary-600 font-bold hover:underline"
                  >
                    <span>View Student Profile</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ) : canConvertAdmission && onConvertToAdmission ? (
              <LockedButton
                isEditMode={isEditMode}
                onClick={() => onConvertToAdmission(leadDossier)}
                icon={GraduationCap}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2"
              >
                Fast-track Convert to Admission
              </LockedButton>
            ) : (
              <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-center">
                <span className="text-xs font-bold text-slate-400 flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Admission Conversion Requires Student Admission Role
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      <PrintModal />
    </>
  )
}
