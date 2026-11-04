/**
 * @file        Communication.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pages
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-05
 * @updated     2026-11-05
 *
 * @description Centralized Communication Center workspace for multichannel messaging, template authoring, delivery tracking, and gateway diagnostics.
 */

import React, { useState, useEffect, useMemo } from 'react'
import {
  MessageSquare, Send, Mail, MessageCircle, Phone, Users, UserCheck,
  GraduationCap, Calendar, Clock, CheckCircle2, AlertCircle, RefreshCw,
  Search, Plus, Edit, Trash2, Shield, Eye, ExternalLink, Filter, X,
  FileText, Check, Paperclip, ChevronRight, RotateCcw
} from 'lucide-react'
import { communicationApi } from '../api/endpoints'
import type {
  MessageTemplateItem, CommunicationLogItem, RecipientItem, ChannelDiagnostics
} from '../types'
import { useAuthStore, isUserSysAdmin } from '../store/authStore'
import { useBranding } from '../config/branding'

export default function Communication() {
  const { user } = useAuthStore()
  const branding = useBranding()
  const isSysAdmin = isUserSysAdmin(user)

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'compose' | 'templates' | 'history' | 'diagnostics'>('compose')

  // Loading & Alerts
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // ─── Compose State ────────────────────────────────────────────────────────
  const [channel, setChannel] = useState<'WHATSAPP' | 'EMAIL' | 'SMS' | 'ALL'>('WHATSAPP')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [subject, setSubject] = useState<string>('')
  const [messageBody, setMessageBody] = useState<string>('')
  const [recipientQuery, setRecipientQuery] = useState<string>('')
  const [recipientFilterType, setRecipientFilterType] = useState<string>('ALL')
  const [availableRecipients, setAvailableRecipients] = useState<RecipientItem[]>([])
  const [selectedRecipients, setSelectedRecipients] = useState<RecipientItem[]>([])
  const [customDestination, setCustomDestination] = useState<string>('')
  const [customName, setCustomName] = useState<string>('')
  const [scheduleDate, setScheduleDate] = useState<string>('')
  const [isScheduled, setIsScheduled] = useState<boolean>(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false)
  const [whatsappLinks, setWhatsappLinks] = useState<Array<{ recipient_name: string; phone: string; url: string }>>([])

  // ─── Templates State ──────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<MessageTemplateItem[]>([])
  const [templateSearch, setTemplateSearch] = useState<string>('')
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>('ALL')
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false)
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplateItem | null>(null)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    code: '',
    category: 'PAYMENT_RECEIPT',
    channel: 'ALL',
    subject: '',
    body: '',
  })

  // ─── History / Logs State ─────────────────────────────────────────────────
  const [logs, setLogs] = useState<CommunicationLogItem[]>([])
  const [logTotal, setLogTotal] = useState<number>(0)
  const [logPage, setLogPage] = useState<number>(1)
  const [logChannelFilter, setLogChannelFilter] = useState<string>('ALL')
  const [logStatusFilter, setLogStatusFilter] = useState<string>('ALL')
  const [logSearch, setLogSearch] = useState<string>('')
  const [selectedLogDetail, setSelectedLogDetail] = useState<CommunicationLogItem | null>(null)

  // ─── Diagnostics State ────────────────────────────────────────────────────
  const [diagnostics, setDiagnostics] = useState<ChannelDiagnostics | null>(null)
  const [testChannel, setTestChannel] = useState<'WHATSAPP' | 'EMAIL' | 'SMS'>('WHATSAPP')
  const [testDestination, setTestDestination] = useState<string>('')
  const [testMessage, setTestMessage] = useState<string>('PrathamOne Academy channel diagnostics verification.')

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true)
      const [tplRes, logRes, diagRes] = await Promise.all([
        communicationApi.getTemplates(),
        communicationApi.getLogs({ page: 1, limit: 25 }),
        communicationApi.getDiagnostics(),
      ])
      setTemplates(tplRes.data || [])
      setLogs(logRes.data.items || [])
      setLogTotal(logRes.data.total || 0)
      setDiagnostics(diagRes.data || null)
    } catch (err: any) {
      console.error('Failed to load communication data:', err)
      showNotification('error', 'Failed to load communication data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Recipient Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await communicationApi.searchRecipients({
          query: recipientQuery,
          target_type: recipientFilterType,
        })
        setAvailableRecipients(res.data || [])
      } catch (err: any) {
        console.error('Error searching recipients:', err)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [recipientQuery, recipientFilterType])

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 4500)
  }

  // Handle Template Selection in Compose
  const handleSelectTemplate = (templateCode: string) => {
    setSelectedTemplate(templateCode)
    const tpl = templates.find((t) => t.code === templateCode)
    if (tpl) {
      setSubject(tpl.subject || '')
      setMessageBody(tpl.body)
      if (tpl.channel !== 'ALL') {
        setChannel(tpl.channel as any)
      }
    }
  }

  // Insert Dynamic Token Placeholder
  const handleInsertToken = (token: string) => {
    setMessageBody((prev) => `${prev} {${token}}`)
  }

  // Toggle recipient selection
  const handleToggleRecipient = (recipient: RecipientItem) => {
    const exists = selectedRecipients.some(
      (r) => r.type === recipient.type && r.name === recipient.name && r.phone === recipient.phone
    )
    if (exists) {
      setSelectedRecipients((prev) =>
        prev.filter((r) => !(r.type === recipient.type && r.name === recipient.name && r.phone === recipient.phone))
      )
    } else {
      setSelectedRecipients((prev) => [...prev, recipient])
    }
  }

  const handleAddCustomRecipient = () => {
    if (!customDestination) {
      showNotification('error', 'Please enter a valid phone number or email address.')
      return
    }
    const newR: RecipientItem = {
      type: 'CUSTOM',
      name: customName || customDestination,
      subtitle: 'Direct Manual Recipient',
      destination: customDestination,
      phone: customDestination.includes('@') ? undefined : customDestination,
      email: customDestination.includes('@') ? customDestination : undefined,
    }
    setSelectedRecipients((prev) => [...prev, newR])
    setCustomDestination('')
    setCustomName('')
  }

  // Send Message Dispatch
  const handleExecuteSend = async () => {
    if (selectedRecipients.length === 0) {
      showNotification('error', 'Please select at least one recipient.')
      setIsConfirmModalOpen(false)
      return
    }
    if (!messageBody.trim()) {
      showNotification('error', 'Message content cannot be blank.')
      setIsConfirmModalOpen(false)
      return
    }

    try {
      setSubmitting(true)
      const mappedRecipients = selectedRecipients.map((r) => ({
        recipient_type: r.type,
        recipient_id: r.id,
        name: r.name,
        destination: r.destination || (channel === 'EMAIL' ? r.email || '' : r.phone || r.email || ''),
        variables: r.variables,
      }))

      const res = await communicationApi.sendMessage({
        channel: channel,
        template_code: selectedTemplate || undefined,
        subject: subject || undefined,
        message: messageBody,
        recipients: mappedRecipients,
        scheduled_at: isScheduled && scheduleDate ? new Date(scheduleDate).toISOString() : undefined,
      })

      showNotification('success', `Dispatched ${res.data.dispatched_count} message(s) successfully.`)
      setWhatsappLinks(res.data.whatsapp_links || [])
      setIsConfirmModalOpen(false)

      // Refresh delivery logs
      const logRes = await communicationApi.getLogs({ page: 1, limit: 25 })
      setLogs(logRes.data.items || [])
      setLogTotal(logRes.data.total || 0)

      // Reset form if non-scheduled
      if (!isScheduled) {
        setSelectedRecipients([])
        setMessageBody('')
        setSubject('')
        setSelectedTemplate('')
      }
    } catch (err: any) {
      console.error('Failed to send messages:', err)
      showNotification('error', err?.response?.data?.detail || 'Failed to dispatch messages.')
    } finally {
      setSubmitting(false)
    }
  }

  // Template Save / Edit
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingTemplate) {
        await communicationApi.updateTemplate(editingTemplate.id, {
          name: templateForm.name,
          category: templateForm.category,
          channel: templateForm.channel,
          subject: templateForm.subject,
          body: templateForm.body,
        })
        showNotification('success', 'Template updated successfully.')
      } else {
        await communicationApi.createTemplate({
          name: templateForm.name,
          code: templateForm.code.toUpperCase().replace(/\s+/g, '_'),
          category: templateForm.category,
          channel: templateForm.channel,
          subject: templateForm.subject,
          body: templateForm.body,
          is_active: true,
        })
        showNotification('success', 'Template created successfully.')
      }
      setIsTemplateModalOpen(false)
      const tplRes = await communicationApi.getTemplates()
      setTemplates(tplRes.data || [])
    } catch (err: any) {
      console.error('Failed to save template:', err)
      showNotification('error', err?.response?.data?.detail || 'Failed to save template.')
    }
  }

  const handleDeleteTemplate = async (template: MessageTemplateItem) => {
    if (!confirm(`Are you sure you want to ${template.is_system ? 'deactivate' : 'delete'} template "${template.name}"?`)) {
      return
    }
    try {
      await communicationApi.deleteTemplate(template.id)
      showNotification('success', 'Template removed or deactivated.')
      const tplRes = await communicationApi.getTemplates()
      setTemplates(tplRes.data || [])
    } catch (err: any) {
      console.error('Failed to delete template:', err)
      showNotification('error', 'Failed to delete template.')
    }
  }

  // Retry Failed Log
  const handleRetryLog = async (logId: number) => {
    try {
      const res = await communicationApi.retryLog(logId)
      showNotification('success', res.data.message)
      const logRes = await communicationApi.getLogs({
        channel: logChannelFilter,
        status: logStatusFilter,
        page: logPage,
        limit: 25,
      })
      setLogs(logRes.data.items || [])
    } catch (err: any) {
      showNotification('error', 'Failed to retry delivery.')
    }
  }

  // Diagnostics Test Ping
  const handleRunDiagnosticTest = async () => {
    if (!testDestination) {
      showNotification('error', 'Please enter a test destination phone or email.')
      return
    }
    try {
      setSubmitting(true)
      const res = await communicationApi.testChannel({
        channel: testChannel,
        destination: testDestination,
        message: testMessage,
      })
      showNotification('success', `Diagnostic test sent to ${testDestination}. Status: ${res.data.dispatch_status}`)
    } catch (err: any) {
      showNotification('error', 'Diagnostics test failed.')
    } finally {
      setSubmitting(false)
    }
  }

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchCat = templateCategoryFilter === 'ALL' || t.category === templateCategoryFilter
      const matchSearch =
        !templateSearch ||
        t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.code.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.body.toLowerCase().includes(templateSearch.toLowerCase())
      return matchCat && matchSearch
    })
  }, [templates, templateCategoryFilter, templateSearch])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Workspace Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                Communication Center
              </h1>
              <p className="text-xs text-gray-500">
                Multichannel messaging, automated templates, delivery tracking, and gateway controls
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('compose')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'compose'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Compose & Send</span>
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'templates'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Templates</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Delivery History ({logTotal})</span>
            </button>
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'diagnostics'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Channels & Diagnostics</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`mx-6 mt-4 p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <div className="flex-1">{feedback.message}</div>
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Tab Content */}
      <div className="p-6 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs">Loading Communication Center...</span>
          </div>
        ) : (
          <>
            {/* ─────────────────────────────────────────────────────────── */}
            {/* TAB 1: COMPOSE & SEND                                       */}
            {/* ─────────────────────────────────────────────────────────── */}
            {activeTab === 'compose' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Pane (Message Composer): 7 cols */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                      <Send className="w-4 h-4 text-blue-600" />
                      <span>Message Composer</span>
                    </h3>

                    {/* Channel Selector */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Dispatch Channel
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle, color: 'text-emerald-600' },
                          { id: 'EMAIL', label: 'Email', icon: Mail, color: 'text-blue-600' },
                          { id: 'SMS', label: 'SMS', icon: MessageSquare, color: 'text-purple-600' },
                          { id: 'ALL', label: 'All Channels', icon: Send, color: 'text-indigo-600' },
                        ].map((ch) => {
                          const Icon = ch.icon
                          const isSelected = channel === ch.id
                          return (
                            <button
                              key={ch.id}
                              type="button"
                              onClick={() => setChannel(ch.id as any)}
                              className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-2xs'
                                  : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                              }`}
                            >
                              <Icon className={`w-3.5 h-3.5 ${ch.color}`} />
                              <span>{ch.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Template Picker */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-gray-700">
                          Template Preset (Optional)
                        </label>
                        {selectedTemplate && (
                          <button
                            type="button"
                            onClick={() => setSelectedTemplate('')}
                            className="text-[11px] text-gray-400 hover:text-gray-600"
                          >
                            Clear Template
                          </button>
                        )}
                      </div>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => handleSelectTemplate(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                      >
                        <option value="">-- Compose Custom Blank Message --</option>
                        {templates.map((tpl) => (
                          <option key={tpl.code} value={tpl.code}>
                            [{tpl.category}] {tpl.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Dynamic Placeholders Helper Bar */}
                    <div>
                      <div className="text-[11px] font-medium text-gray-500 mb-1 flex items-center justify-between">
                        <span>Insert Dynamic Placeholder Tokens:</span>
                        <span className="text-[10px] text-gray-400">Click token to insert</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          'student_name',
                          'parent_name',
                          'amount',
                          'receipt_no',
                          'due_date',
                          'class_name',
                          'batch_name',
                          'institute_name',
                          'contact_phone',
                        ].map((token) => (
                          <button
                            key={token}
                            type="button"
                            onClick={() => handleInsertToken(token)}
                            className="px-2 py-0.5 text-[11px] font-mono bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 rounded-md border border-slate-200 transition-colors"
                          >
                            +{`{${token}}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Email Subject Field */}
                    {(channel === 'EMAIL' || channel === 'ALL') && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Email Subject Line <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="e.g. Official Update: Term Assessment Schedule"
                          className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {/* Message Body */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-gray-700">
                          Message Body <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-gray-400">
                          {messageBody.length} characters
                          {channel === 'SMS' && ` (~${Math.ceil(messageBody.length / 160) || 1} SMS part(s))`}
                        </span>
                      </div>
                      <textarea
                        rows={5}
                        value={messageBody}
                        onChange={(e) => setMessageBody(e.target.value)}
                        placeholder="Type message text or select a template above..."
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none text-gray-800"
                      />
                    </div>

                    {/* Scheduling Options */}
                    <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="schedule_toggle"
                          checked={isScheduled}
                          onChange={(e) => setIsScheduled(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="schedule_toggle" className="text-xs font-medium text-gray-700">
                          Schedule for Later Delivery
                        </label>
                      </div>

                      {isScheduled && (
                        <input
                          type="datetime-local"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg bg-white"
                        />
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setMessageBody('')
                          setSubject('')
                          setSelectedTemplate('')
                        }}
                        className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Reset Form
                      </button>
                      <button
                        type="button"
                        disabled={selectedRecipients.length === 0 || !messageBody.trim() || submitting}
                        onClick={() => setIsConfirmModalOpen(true)}
                        className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        {submitting ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>
                          Dispatch to {selectedRecipients.length} Recipient(s)
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Generated WhatsApp Web Direct Links Card */}
                  {whatsappLinks.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <MessageCircle className="w-4 h-4 text-emerald-600" />
                          <span>Direct WhatsApp Action Links Ready ({whatsappLinks.length})</span>
                        </h4>
                        <button
                          onClick={() => setWhatsappLinks([])}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {whatsappLinks.map((wa, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-2 rounded-lg border border-emerald-200 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-semibold text-gray-900">{wa.recipient_name}</span>
                              <span className="text-gray-500 font-mono text-[11px] ml-2">{wa.phone}</span>
                            </div>
                            <a
                              href={wa.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-md flex items-center gap-1 shadow-2xs"
                            >
                              <span>Open Chat</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Pane (Recipient Selector & Queue Preview): 5 cols */}
                <div className="lg:col-span-5 space-y-5">
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span>Recipient Selection</span>
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        {selectedRecipients.length} Selected
                      </span>
                    </div>

                    {/* Filter Category & Search */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={recipientFilterType}
                          onChange={(e) => setRecipientFilterType(e.target.value)}
                          className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                        >
                          <option value="ALL">All Groups</option>
                          <option value="STUDENT">Students</option>
                          <option value="PARENT">Parents</option>
                          <option value="STAFF">Staff & Faculty</option>
                          <option value="BATCH">Whole Batches</option>
                        </select>
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={recipientQuery}
                            onChange={(e) => setRecipientQuery(e.target.value)}
                            placeholder="Search name, phone, roll..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Available Search Results */}
                    <div className="border border-gray-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-100">
                      {availableRecipients.map((item, idx) => {
                        const isSelected = selectedRecipients.some(
                          (r) => r.type === item.type && r.name === item.name && r.phone === item.phone
                        )
                        return (
                          <div
                            key={idx}
                            onClick={() => handleToggleRecipient(item)}
                            className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-gray-900 truncate flex items-center gap-1.5">
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    item.type === 'STUDENT'
                                      ? 'bg-blue-100 text-blue-800'
                                      : item.type === 'PARENT'
                                      ? 'bg-amber-100 text-amber-800'
                                      : item.type === 'STAFF'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {item.type}
                                </span>
                                <span>{item.name}</span>
                              </div>
                              <div className="text-[11px] text-gray-500 truncate mt-0.5">
                                {item.subtitle} • {item.phone || item.email || 'No contact on file'}
                              </div>
                            </div>
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center ${
                                isSelected
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'border-gray-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          </div>
                        )
                      })}
                      {availableRecipients.length === 0 && (
                        <div className="p-4 text-center text-xs text-gray-400">
                          Type query above to search students, parents, or staff.
                        </div>
                      )}
                    </div>

                    {/* Add Custom One-Off Recipient */}
                    <div className="pt-2 border-t border-gray-100 space-y-2">
                      <div className="text-[11px] font-medium text-gray-600">
                        Add Direct One-Off Recipient:
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="Name (Optional)"
                          className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg"
                        />
                        <input
                          type="text"
                          value={customDestination}
                          onChange={(e) => setCustomDestination(e.target.value)}
                          placeholder="Phone or Email"
                          className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg font-mono"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCustomRecipient}
                        className="w-full py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                      >
                        + Add Custom Recipient
                      </button>
                    </div>

                    {/* Selected Recipients Tray */}
                    {selectedRecipients.length > 0 && (
                      <div className="pt-2 border-t border-gray-100 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-gray-700">Selected Tray:</span>
                          <button
                            type="button"
                            onClick={() => setSelectedRecipients([])}
                            className="text-rose-600 hover:text-rose-800 text-[10px]"
                          >
                            Remove All
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                          {selectedRecipients.map((r, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1"
                            >
                              <span className="font-medium truncate max-w-[120px]">{r.name}</span>
                              <button
                                onClick={() =>
                                  setSelectedRecipients((prev) => prev.filter((_, idx) => idx !== i))
                                }
                                className="text-gray-400 hover:text-rose-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────── */}
            {/* TAB 2: MESSAGE TEMPLATES CATALOGUE                          */}
            {/* ─────────────────────────────────────────────────────────── */}
            {activeTab === 'templates' && (
              <div className="space-y-5">
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                  {/* Action & Filter Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <select
                        value={templateCategoryFilter}
                        onChange={(e) => setTemplateCategoryFilter(e.target.value)}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium"
                      >
                        <option value="ALL">All Categories ({templates.length})</option>
                        <option value="PAYMENT_RECEIPT">Payment Receipts</option>
                        <option value="FEE_REMINDER">Fee Reminders</option>
                        <option value="ATTENDANCE_ALERT">Attendance Absence</option>
                        <option value="EXAM_RESULT">Exam Results</option>
                        <option value="ADMISSION">Admission</option>
                        <option value="ANNOUNCEMENT">Announcements</option>
                        <option value="STAFF_NOTICE">Staff Notices</option>
                      </select>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={templateSearch}
                          onChange={(e) => setTemplateSearch(e.target.value)}
                          placeholder="Search template name or code..."
                          className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingTemplate(null)
                        setTemplateForm({
                          name: '',
                          code: '',
                          category: 'PAYMENT_RECEIPT',
                          channel: 'ALL',
                          subject: '',
                          body: '',
                        })
                        setIsTemplateModalOpen(true)
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Template</span>
                    </button>
                  </div>

                  {/* Template Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.map((tpl) => (
                      <div
                        key={tpl.id}
                        className="border border-gray-200 rounded-xl p-4 bg-white hover:border-blue-400 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 font-mono">
                              {tpl.code}
                            </span>
                            <span className="text-[10px] font-semibold text-gray-500 uppercase">
                              {tpl.channel}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-gray-900 leading-snug">{tpl.name}</h4>
                          {tpl.subject && (
                            <div className="text-[11px] font-medium text-gray-600 truncate">
                              Sub: {tpl.subject}
                            </div>
                          )}
                          <p className="text-xs text-gray-600 line-clamp-3 bg-gray-50 p-2 rounded-lg font-sans">
                            {tpl.body}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                          <span className="text-gray-400">
                            {tpl.is_system ? 'Core System' : 'Custom'}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectTemplate(tpl.code)
                                setActiveTab('compose')
                              }}
                              className="px-2 py-0.5 text-blue-600 hover:bg-blue-50 rounded font-medium"
                            >
                              Use
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTemplate(tpl)
                                setTemplateForm({
                                  name: tpl.name,
                                  code: tpl.code,
                                  category: tpl.category,
                                  channel: tpl.channel,
                                  subject: tpl.subject || '',
                                  body: tpl.body,
                                })
                                setIsTemplateModalOpen(true)
                              }}
                              className="p-1 text-gray-400 hover:text-blue-600 rounded"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(tpl)}
                              className="p-1 text-gray-400 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────── */}
            {/* TAB 3: DELIVERY HISTORY & AUDIT LOGS                        */}
            {/* ─────────────────────────────────────────────────────────── */}
            {activeTab === 'history' && (
              <div className="space-y-5">
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                  {/* Filters */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <select
                        value={logChannelFilter}
                        onChange={(e) => setLogChannelFilter(e.target.value)}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                      >
                        <option value="ALL">All Channels</option>
                        <option value="WHATSAPP">WhatsApp</option>
                        <option value="EMAIL">Email</option>
                        <option value="SMS">SMS</option>
                        <option value="DIRECT_LINK">Direct Link</option>
                      </select>

                      <select
                        value={logStatusFilter}
                        onChange={(e) => setLogStatusFilter(e.target.value)}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="DELIVERED">Delivered / Sent</option>
                        <option value="FAILED">Failed</option>
                        <option value="QUEUED">Queued</option>
                      </select>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={logSearch}
                          onChange={(e) => setLogSearch(e.target.value)}
                          placeholder="Search recipient or content..."
                          className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={fetchData}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 shadow-2xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {/* Logs Table */}
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                          <th className="px-4 py-2.5">Date / Time</th>
                          <th className="px-4 py-2.5">Channel</th>
                          <th className="px-4 py-2.5">Recipient</th>
                          <th className="px-4 py-2.5">Destination</th>
                          <th className="px-4 py-2.5">Message Snippet</th>
                          <th className="px-4 py-2.5 text-center">Status</th>
                          <th className="px-4 py-2.5">Sender</th>
                          <th className="px-4 py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {logs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2.5 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  log.channel === 'WHATSAPP'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : log.channel === 'EMAIL'
                                    ? 'bg-blue-100 text-blue-800'
                                    : log.channel === 'SMS'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}
                              >
                                {log.channel}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-gray-900">
                              {log.recipient_name}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[11px] text-gray-600">
                              {log.recipient_destination}
                            </td>
                            <td className="px-4 py-2.5 text-gray-600 max-w-xs truncate">
                              {log.content}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  log.status === 'DELIVERED' || log.status === 'SENT'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : log.status === 'FAILED'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {log.status}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-gray-500 text-[11px]">
                              {log.sender_name || 'System'}
                            </td>
                            <td className="px-4 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedLogDetail(log)}
                                className="p-1 text-gray-500 hover:text-blue-600 rounded"
                                title="View full message details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {log.status === 'FAILED' && (
                                <button
                                  type="button"
                                  onClick={() => handleRetryLog(log.id)}
                                  className="p-1 text-gray-500 hover:text-emerald-600 rounded"
                                  title="Retry dispatch"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {logs.length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-xs">
                              No communication history logs found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────── */}
            {/* TAB 4: CHANNELS & DIAGNOSTICS                               */}
            {/* ─────────────────────────────────────────────────────────── */}
            {activeTab === 'diagnostics' && (
              <div className="space-y-6 max-w-4xl">
                {/* Diagnostics Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {diagnostics &&
                    diagnostics.channels &&
                    Object.entries(diagnostics.channels).map(([key, ch]) => (
                      <div
                        key={key}
                        className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-gray-900">{ch.name}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            {ch.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Adapter: {ch.adapter}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ch.features.map((feat, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-700 font-medium"
                            >
                              ✓ {feat}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>

                {/* Diagnostics Test Dispatch Tool */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                  <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span>Run Connection Test & Ping</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Test Channel
                      </label>
                      <select
                        value={testChannel}
                        onChange={(e) => setTestChannel(e.target.value as any)}
                        className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                      >
                        <option value="WHATSAPP">WhatsApp</option>
                        <option value="EMAIL">SMTP Email</option>
                        <option value="SMS">Telecom SMS</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Test Destination (Mobile or Email)
                      </label>
                      <input
                        type="text"
                        value={testDestination}
                        onChange={(e) => setTestDestination(e.target.value)}
                        placeholder="+91 98765 43210 or admin@example.com"
                        className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg font-mono"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={submitting || !testDestination}
                    onClick={handleRunDiagnosticTest}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Trigger Diagnostics Test</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmation Modal before Sending */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Confirm Multichannel Dispatch
                </h3>
                <p className="text-xs text-gray-500">
                  Verify dispatch details before broadcasting to recipients
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3.5 space-y-2 text-xs text-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-500">Channel:</span>
                <span className="font-bold text-blue-900">{channel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Recipient Count:</span>
                <span className="font-bold text-blue-900">{selectedRecipients.length} Recipient(s)</span>
              </div>
              {subject && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Subject:</span>
                  <span className="font-semibold text-gray-900 truncate max-w-[200px]">{subject}</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
              Sending official notifications affects external recipients. Please ensure all names and numbers are correct.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleExecuteSend}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Confirm & Dispatch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Template Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">
                {editingTemplate ? 'Edit Message Template' : 'Create New Message Template'}
              </h3>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Template Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="e.g. Monthly Fee Due Reminder"
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Template Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingTemplate}
                    value={templateForm.code}
                    onChange={(e) => setTemplateForm({ ...templateForm, code: e.target.value })}
                    placeholder="e.g. MONTHLY_FEE_DUE"
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg uppercase font-mono disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="PAYMENT_RECEIPT">Payment Receipt</option>
                    <option value="FEE_REMINDER">Fee Reminder</option>
                    <option value="ATTENDANCE_ALERT">Attendance Alert</option>
                    <option value="EXAM_RESULT">Exam Result</option>
                    <option value="ADMISSION">Admission</option>
                    <option value="ANNOUNCEMENT">Announcement</option>
                    <option value="STAFF_NOTICE">Staff Notice</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email Subject Line (Optional)
                </label>
                <input
                  type="text"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  placeholder="Subject with tokens like {student_name}"
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Message Body <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                  placeholder="Dear {parent_name}, ..."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg resize-none text-gray-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs"
                >
                  {editingTemplate ? 'Update Template' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Detail Modal */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Delivery Log Details</h3>
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl">
                <div>
                  <span className="text-gray-500 block">Recipient:</span>
                  <span className="font-semibold text-gray-900">{selectedLogDetail.recipient_name}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Destination:</span>
                  <span className="font-mono text-gray-900">{selectedLogDetail.recipient_destination}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Channel / Status:</span>
                  <span className="font-bold">{selectedLogDetail.channel} • {selectedLogDetail.status}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Timestamp:</span>
                  <span className="font-mono">{new Date(selectedLogDetail.created_at).toLocaleString()}</span>
                </div>
              </div>

              {selectedLogDetail.subject && (
                <div>
                  <span className="font-semibold text-gray-700 block mb-1">Subject:</span>
                  <div className="p-2 bg-gray-50 rounded-lg text-gray-900 font-medium">
                    {selectedLogDetail.subject}
                  </div>
                </div>
              )}

              <div>
                <span className="font-semibold text-gray-700 block mb-1">Message Content:</span>
                <div className="p-3 bg-gray-50 rounded-lg text-gray-800 whitespace-pre-wrap font-sans">
                  {selectedLogDetail.content}
                </div>
              </div>

              {selectedLogDetail.error_message && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                  <span className="font-semibold">Error Message:</span> {selectedLogDetail.error_message}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                className="px-4 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
