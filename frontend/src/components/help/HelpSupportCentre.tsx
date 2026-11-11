/**
 * @file        HelpSupportCentre.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      src.components.help
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-11
 * @updated     2026-11-12
 *
 * @description Source component for Helpsupportcentre in the src.components.help module.
 */

// /**
//  * @file        HelpSupportCentre.tsx
//  * @project     PrathamOne EduOS Coaching Institute Management System
//  * @module      frontend.src.components.help
//  *
//  * @author      Jawahar R. Mallah
//  * @organization AITDL (AI Technology & Development Lab)
//  * @client      Prashant Academy Coaching Institute
//  * @copyright   Copyright (c) 2026 AITDL
//  * @license     Proprietary
//  *
//  * @version     1.0.0
//  * @created     2026-11-11
//  * @updated     2026-11-11
//  *
//  * @description Customer Support Centre workspace for technical support contacts, ticket submission (support/bug/feature/feedback), tracking, and admin triage.
//  */

import { useEffect, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  BookOpen,
  Bug,
  CheckCircle2,
  Clock,
  Headphones,
  Lightbulb,
  Mail,
  MessageSquarePlus,
  Phone,
  Send,
  ThumbsUp,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { helpApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { useEditModeStore } from '../../store/editModeStore'
import { EditModeBar, LockedButton } from '../common'
import type {
  HelpProductAndVersionResponse,
  SupportRequestItem,
  SupportRequestStatus,
  SupportRequestType,
} from '../../types'
import { isHelpAdminRole } from './helpNavigation'

interface HelpSupportCentreProps {
  productInfo: HelpProductAndVersionResponse | null
}

const REQUEST_TYPE_OPTIONS: Array<{ value: SupportRequestType; label: string; desc: string }> = [
  { value: 'support_request', label: 'Submit Support Request', desc: 'Get operational or account help' },
  { value: 'bug_report', label: 'Report a Bug', desc: 'Report unexpected screen behavior or error ID' },
  { value: 'feature_request', label: 'Suggest a Feature', desc: 'Propose an institutional workflow improvement' },
  { value: 'feedback', label: 'Share Feedback', desc: 'Tell us about your team experience' },
]

const STATUS_BADGE: Record<SupportRequestStatus, string> = {
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  waiting_on_customer: 'bg-amber-50 text-amber-800 border-amber-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-slate-100 text-slate-700 border-slate-200',
}

export default function HelpSupportCentre({ productInfo }: HelpSupportCentreProps) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isAdmin = isHelpAdminRole(user?.role)
  const { isEditMode } = useEditModeStore()
  const triageEditable = isEditMode('admin:support_triage')

  const [tickets, setTickets] = useState<SupportRequestItem[]>([])
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<SupportRequestItem | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  // Submission Form
  const [requestType, setRequestType] = useState<SupportRequestType>('support_request')
  const [category, setCategory] = useState('general')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [moduleKey, setModuleKey] = useState('')
  const [errorRefId, setErrorRefId] = useState('')
  const [contactEmail, setContactEmail] = useState(user?.email || '')
  const [contactPhone, setContactPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Comment & Admin Triage state
  const [replyText, setReplyText] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [sendingReply, setSendingReply] = useState(false)
  const [triageStatus, setTriageStatus] = useState<SupportRequestStatus>('open')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const loadTickets = async () => {
    setLoadingTickets(true)
    try {
      const res = await helpApi.getSupportRequests({
        status: statusFilter || undefined,
        request_type: typeFilter || undefined,
      })
      const list = res.data.items || []
      setTickets(list)
      if (selectedTicket) {
        const refreshed = list.find((t) => t.id === selectedTicket.id)
        if (refreshed) {
          setSelectedTicket(refreshed)
          setTriageStatus(refreshed.status)
          setResolutionNotes(refreshed.resolution_notes || '')
        }
      } else if (list.length > 0) {
        setSelectedTicket(list[0])
        setTriageStatus(list[0].status)
        setResolutionNotes(list[0].resolution_notes || '')
      }
    } catch {
      toast.error('Unable to load support requests right now.')
    } finally {
      setLoadingTickets(false)
    }
  }

  useEffect(() => {
    loadTickets()
  }, [statusFilter, typeFilter])

  const handleCreateTicket = async (e: FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) {
      toast.error('Please enter both a subject and detailed description.')
      return
    }
    setSubmitting(true)
    try {
      const res = await helpApi.createSupportRequest({
        request_type: requestType,
        category,
        priority,
        subject: subject.trim(),
        description: description.trim(),
        module_key: moduleKey || null,
        error_reference_id: errorRefId.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
      })
      toast.success(`Request ${res.data.ticket_number} submitted successfully.`)
      setSubject('')
      setDescription('')
      setErrorRefId('')
      setSelectedTicket(res.data)
      setTriageStatus(res.data.status)
      setResolutionNotes(res.data.resolution_notes || '')
      await loadTickets()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to submit support request.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddReply = async () => {
    if (!selectedTicket || !replyText.trim()) return
    setSendingReply(true)
    try {
      const res = await helpApi.addSupportComment(selectedTicket.id, replyText.trim(), isInternalNote)
      setSelectedTicket(res.data)
      setReplyText('')
      setIsInternalNote(false)
      toast.success('Update posted to ticket.')
      await loadTickets()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to post ticket update.')
    } finally {
      setSendingReply(false)
    }
  }

  const handleAdminStatusSave = async () => {
    if (!selectedTicket) return
    setUpdatingStatus(true)
    try {
      const res = await helpApi.updateSupportStatus(selectedTicket.id, {
        status: triageStatus,
        resolution_notes: resolutionNotes,
      })
      setSelectedTicket(res.data)
      toast.success(`Ticket ${res.data.ticket_number} updated cleanly.`)
      await loadTickets()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to update ticket status.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const aitdl = productInfo?.about_company?.aitdl

  return (
    <div className="space-y-6">
      {/* Direct Technical Support & Documentation Gateway */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Contact Technical Support</h3>
              <p className="text-[11px] text-slate-500">Official Helpline Channels</p>
            </div>
          </div>
          <div className="space-y-1.5 mt-3 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{(aitdl?.support_phones || ['9323 023 007', '9324 117 007']).join(' | ')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{aitdl?.support_email || 'support@prathamone.com'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{aitdl?.general_email || 'prathamone@outlook.com'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Documentation Access</h3>
              <p className="text-[11px] text-slate-500">Self-Service Guides & FAQs</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Explore step-by-step tutorials, permission requirements, and error troubleshooting guides before submitting a request.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={() => navigate('/help?section=module_guide')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              Module Guides
            </button>
            <button
              type="button"
              onClick={() => navigate('/help?section=faq')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              FAQ & Errors
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Faster Resolution Tip</h3>
              <p className="text-[11px] text-slate-500">Include Error Reference ID</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            When reporting an issue, copy the Error Reference ID (if displayed) and specify the module screen you were working in.
          </p>
        </div>
      </div>

      {/* Main Split: New Ticket Form & Ticket Tracker */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Submit Request Form */}
        <form
          onSubmit={handleCreateTicket}
          className="xl:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4 h-fit"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <MessageSquarePlus className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Submit Request, Bug or Feedback</h2>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {REQUEST_TYPE_OPTIONS.map((opt) => {
              const Icon =
                opt.value === 'bug_report'
                  ? Bug
                  : opt.value === 'feature_request'
                    ? Lightbulb
                    : opt.value === 'feedback'
                      ? ThumbsUp
                      : Headphones
              const active = requestType === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRequestType(opt.value)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    active
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="truncate">{opt.label}</span>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Topic / Module</label>
              <select
                value={moduleKey || category}
                onChange={(e) => {
                  setModuleKey(e.target.value)
                  setCategory(e.target.value)
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="general">General / Account Access</option>
                {(productInfo?.about_product?.available_modules || []).map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="low">Low — Guidance / Suggestion</option>
                <option value="medium">Medium — Standard Issue</option>
                <option value="high">High — Workflow Impacted</option>
                <option value="urgent">Urgent — Critical Blocker</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
            <input
              type="text"
              required
              minLength={4}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your question, issue, or suggestion"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Description</label>
            <textarea
              required
              minLength={10}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Include steps taken, expected outcome, and what happened instead..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Error Ref ID (Optional)</label>
              <input
                type="text"
                value={errorRefId}
                onChange={(e) => setErrorRefId(e.target.value)}
                placeholder="ERR-..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reply Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="you@institute.in"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone (Optional)</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? 'Submitting Request...' : 'Submit Support Request'}</span>
          </button>
        </form>

        {/* Track Support Requests & Thread View */}
        <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isAdmin ? 'Support Requests & Triage Queue' : 'Track My Support Requests'}
              </h2>
              <p className="text-xs text-slate-500">
                {tickets.length} ticket{tickets.length === 1 ? '' : 's'} shown
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter by request type"
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
              >
                <option value="">All Request Types</option>
                <option value="support_request">Support Requests</option>
                <option value="bug_report">Bug Reports</option>
                <option value="feature_request">Feature Suggestions</option>
                <option value="feedback">Feedback</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
              >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_on_customer">Waiting on User</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {isAdmin && (
            <div className="px-5 pt-3">
              <EditModeBar
                scope="admin:support_triage"
                title="Support Triage Edit Mode"
                compact
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-[380px]">
            {/* Left Ticket List */}
            <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-slate-100 divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {loadingTickets ? (
                <div className="p-6 text-xs text-slate-500">Loading support history...</div>
              ) : tickets.length === 0 ? (
                <div className="p-6 text-xs text-slate-500">
                  No support requests submitted yet. Use the form on the left to submit a request, bug report, feature idea, or feedback.
                </div>
              ) : (
                tickets.map((ticket) => {
                  const isSelected = selectedTicket?.id === ticket.id
                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => {
                        setSelectedTicket(ticket)
                        setTriageStatus(ticket.status)
                        setResolutionNotes(ticket.resolution_notes || '')
                      }}
                      className={`w-full text-left p-4 transition-colors ${
                        isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono font-semibold text-indigo-700">
                          {ticket.ticket_number}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${
                            STATUS_BADGE[ticket.status] || STATUS_BADGE.open
                          }`}
                        >
                          {ticket.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">
                        {ticket.subject}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                        <span className="capitalize">{ticket.request_type.replace('_', ' ')}</span>
                        <span>{ticket.priority}</span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Right Selected Ticket Thread */}
            <div className="md:col-span-7 p-5 flex flex-col justify-between bg-slate-50/40">
              {selectedTicket ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-700">
                        {selectedTicket.ticket_number}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {selectedTicket.created_at
                            ? new Date(selectedTicket.created_at).toLocaleString()
                            : ''}
                        </span>
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{selectedTicket.subject}</h3>
                    <p className="text-xs text-slate-700 mt-2 leading-relaxed whitespace-pre-line bg-white p-3 rounded-xl border border-slate-200">
                      {selectedTicket.description}
                    </p>
                    {selectedTicket.error_reference_id && (
                      <div className="mt-2 text-[11px] text-slate-600">
                        <strong>Error Reference ID:</strong> <code>{selectedTicket.error_reference_id}</code>
                      </div>
                    )}
                    {selectedTicket.resolution_notes && (
                      <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Resolution Summary:</strong> {selectedTicket.resolution_notes}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Admin Status Controls */}
                  {isAdmin && (
                    <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Administrative Triage
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <select
                          disabled={!triageEditable}
                          value={triageStatus}
                          onChange={(e) => setTriageStatus(e.target.value as SupportRequestStatus)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white disabled:bg-slate-100"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="waiting_on_customer">Waiting on User</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                        <LockedButton
                          isEditMode={triageEditable}
                          onClick={handleAdminStatusSave}
                          disabled={updatingStatus}
                          variant="primary"
                          className="text-xs py-1.5"
                        >
                          {updatingStatus ? 'Saving...' : 'Save Ticket Status'}
                        </LockedButton>
                      </div>
                      <input
                        type="text"
                        disabled={!triageEditable}
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Resolution summary visible to requester..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs disabled:bg-slate-100"
                      />
                    </div>
                  )}

                  {/* Comments Thread */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedTicket.comments.map((c) => (
                      <div
                        key={c.id}
                        className={`p-2.5 rounded-xl text-xs border ${
                          c.is_internal_note
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                          <span className="font-semibold text-slate-800">
                            {c.author_name} ({c.author_role})
                            {c.is_internal_note ? ' • Internal Note' : ''}
                          </span>
                          <span>{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</span>
                        </div>
                        <p>{c.message}</p>
                      </div>
                    ))}
                  </div>

                  {/* Reply Input */}
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a follow-up message on this request..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex items-center justify-between gap-2">
                      {isAdmin ? (
                        <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={isInternalNote}
                            onChange={(e) => setIsInternalNote(e.target.checked)}
                          />
                          <span>Internal Staff Note (hidden from requester)</span>
                        </label>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        disabled={sendingReply || !replyText.trim()}
                        onClick={handleAddReply}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 text-xs font-semibold transition-colors"
                      >
                        {sendingReply ? 'Posting...' : 'Post Reply'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 m-auto">
                  Select a support request from the list to track updates and responses.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
