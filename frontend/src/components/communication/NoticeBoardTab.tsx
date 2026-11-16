/**
 * @file        NoticeBoardTab.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.communication
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-16
 * @updated     2026-11-16
 *
 * @description Dedicated Notice Board management tab in Communication Center for authoring, cohort-targeting, pinning, and publishing digital notices and circulars.
 */

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  Pin,
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  CheckCircle,
  Layers,
  Lock,
  Edit3,
  Trash2,
  Sparkles,
  AlertCircle,
  X,
  FileText,
  School,
  ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { communicationApi, standardsApi, divisionsApi } from '../../api/endpoints'
import type { NoticeBoardItem, Standard, Division } from '../../types'

interface NoticeBoardTabProps {
  isEditMode: boolean
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  examination: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  holiday: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  academic: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  fee: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  general: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
}

export function NoticeBoardTab({ isEditMode }: NoticeBoardTabProps) {
  const queryClient = useQueryClient()

  // State
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [standardFilter, setStandardFilter] = useState<number | undefined>(undefined)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingNotice, setEditingNotice] = useState<NoticeBoardItem | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    standard_id: undefined as number | undefined,
    division_id: undefined as number | undefined,
    is_pinned: false,
    publish_date: new Date().toISOString().split('T')[0],
  })

  // Queries
  const { data: noticesResponse, isLoading: isLoadingNotices } = useQuery({
    queryKey: ['communication-notices', standardFilter, categoryFilter, search],
    queryFn: () =>
      communicationApi.getNotices({
        standard_id: standardFilter,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        search: search || undefined,
      }),
  })

  const { data: standards = [] } = useQuery<Standard[]>({
    queryKey: ['standards-list'],
    queryFn: async () => {
      const res = await standardsApi.list()
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const { data: divisions = [] } = useQuery<Division[]>({
    queryKey: ['divisions-list', formData.standard_id],
    queryFn: async () => {
      const res = await divisionsApi.list(formData.standard_id)
      return Array.isArray(res.data) ? res.data : []
    },
    enabled: !!formData.standard_id,
  })

  const notices: NoticeBoardItem[] = noticesResponse?.data?.data || []

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => communicationApi.createNotice(data),
    onSuccess: () => {
      toast.success('Notice published successfully to Notice Board!')
      queryClient.invalidateQueries({ queryKey: ['communication-notices'] })
      closeModal()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to publish notice.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<typeof formData> }) =>
      communicationApi.updateNotice(id, data),
    onSuccess: () => {
      toast.success('Notice updated successfully.')
      queryClient.invalidateQueries({ queryKey: ['communication-notices'] })
      closeModal()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update notice.')
    },
  })

  const togglePinMutation = useMutation({
    mutationFn: (id: number) => communicationApi.togglePinNotice(id),
    onSuccess: (res) => {
      toast.success(res.data.message)
      queryClient.invalidateQueries({ queryKey: ['communication-notices'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to toggle pin state.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => communicationApi.deleteNotice(id),
    onSuccess: () => {
      toast.success('Notice removed from Notice Board.')
      queryClient.invalidateQueries({ queryKey: ['communication-notices'] })
      setDeleteConfirmId(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to delete notice.')
    },
  })

  // Handlers
  const openCreateModal = () => {
    if (!isEditMode) {
      toast.error('Locked in View Mode: Please enable Edit Mode above to publish notices.')
      return
    }
    setEditingNotice(null)
    setFormData({
      title: '',
      content: '',
      category: 'general',
      standard_id: undefined,
      division_id: undefined,
      is_pinned: false,
      publish_date: new Date().toISOString().split('T')[0],
    })
    setIsModalOpen(true)
  }

  const openEditModal = (notice: NoticeBoardItem) => {
    if (!isEditMode) {
      toast.error('Locked in View Mode: Please enable Edit Mode above to edit notices.')
      return
    }
    setEditingNotice(notice)
    setFormData({
      title: notice.title,
      content: notice.content,
      category: notice.category,
      standard_id: notice.standard_id || undefined,
      division_id: notice.division_id || undefined,
      is_pinned: notice.is_pinned,
      publish_date: notice.publish_date || new Date().toISOString().split('T')[0],
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingNotice(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditMode) {
      toast.error('Locked in View Mode: Please enable Edit Mode above.')
      return
    }
    if (!formData.title.trim()) {
      toast.error('Notice title is required.')
      return
    }
    if (!formData.content.trim()) {
      toast.error('Notice content is required.')
      return
    }

    if (editingNotice) {
      updateMutation.mutate({ id: editingNotice.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  // Summary Metrics
  const pinnedCount = notices.filter((n) => n.is_pinned).length
  const examCount = notices.filter((n) => n.category.toLowerCase() === 'examination').length
  const holidayCount = notices.filter((n) => n.category.toLowerCase() === 'holiday').length

  return (
    <div className="space-y-6 animate-fade-in" data-testid="notice-board-workspace">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Notices</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{notices.length}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Active on Student Boards</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Bell className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pinned Notices</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{pinnedCount}</p>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5">Anchored at top</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Pin className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Exam Circulars</p>
              <p className="text-2xl font-bold text-rose-700 mt-1">{examCount}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Hall tickets & schedules</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Holiday Breaks</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{holidayCount}</p>
              <p className="text-[11px] text-emerald-600 mt-0.5">Vacation declarations</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Container & Action Bar */}
      <div className="card p-0 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Header & Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-600" />
              <span>Digital Notice Board & Circulars Register</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Publish, pin, and cohort-target official circulars to student and guardian portal dashboards.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={openCreateModal}
              data-testid="post-new-notice-btn"
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                isEditMode
                  ? 'bg-primary-600 hover:bg-primary-700 text-white'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
              title={isEditMode ? 'Post a new circular' : 'Locked in View Mode: Enable Edit Mode to post notices'}
            >
              {isEditMode ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4 text-slate-400" />}
              <span>Post New Notice</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-3.5 bg-slate-50/70 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-[280px]">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notices by keyword or title…"
                className="input text-xs pl-8 py-1.5 w-full bg-white"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input text-xs py-1.5 px-2.5 w-36 bg-white"
            >
              <option value="ALL">All Categories</option>
              <option value="general">General</option>
              <option value="examination">Examination</option>
              <option value="holiday">Holiday</option>
              <option value="academic">Academic</option>
              <option value="fee">Fee Notice</option>
            </select>

            {/* Standard Filter */}
            <select
              value={standardFilter ?? ''}
              onChange={(e) => setStandardFilter(e.target.value ? Number(e.target.value) : undefined)}
              className="input text-xs py-1.5 px-2.5 w-36 bg-white"
            >
              <option value="">All Standards</option>
              {standards.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{notices.length}</span> notices
          </div>
        </div>

        {/* Desktop Notices Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-12 text-center">Pin</th>
                <th className="py-3 px-4 w-32">Category</th>
                <th className="py-3 px-4">Title & Details</th>
                <th className="py-3 px-4 w-44">Target Cohort</th>
                <th className="py-3 px-4 w-28">Publish Date</th>
                <th className="py-3 px-4 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingNotices && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading digital notices…
                  </td>
                </tr>
              )}
              {!isLoadingNotices && notices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No circulars found matching current filters.
                  </td>
                </tr>
              )}
              {notices.map((n) => {
                const color = CATEGORY_COLORS[n.category.toLowerCase()] || CATEGORY_COLORS.general
                return (
                  <tr
                    key={n.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      n.is_pinned ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        data-testid={`toggle-pin-btn-${n.id}`}
                        disabled={!isEditMode}
                        onClick={() => togglePinMutation.mutate(n.id)}
                        className={`p-1 rounded-md transition ${
                          n.is_pinned
                            ? 'text-amber-600 hover:text-amber-800 bg-amber-100/60'
                            : 'text-slate-300 hover:text-slate-500'
                        } ${!isEditMode ? 'cursor-not-allowed opacity-50' : ''}`}
                        title={
                          !isEditMode
                            ? 'Enable Edit Mode to change pin state'
                            : n.is_pinned
                            ? 'Unpin notice'
                            : 'Pin to top of board'
                        }
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${color.bg} ${color.text} ${color.border}`}
                      >
                        {n.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-sm">{n.title}</div>
                      <div className="text-slate-500 mt-1 line-clamp-2 max-w-xl text-xs">{n.content}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                        <Users className="w-3 h-3 text-slate-500" />
                        <span className="truncate max-w-[150px]">{n.target_label}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{n.publish_date}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          disabled={!isEditMode}
                          onClick={() => openEditModal(n)}
                          className={`p-1.5 rounded-lg border transition ${
                            isEditMode
                              ? 'border-slate-200 hover:bg-primary-50 text-primary-600 hover:border-primary-200'
                              : 'border-slate-100 text-slate-300 cursor-not-allowed'
                          }`}
                          title={isEditMode ? 'Edit Notice' : 'Enable Edit Mode to edit'}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={!isEditMode}
                          onClick={() => setDeleteConfirmId(n.id)}
                          className={`p-1.5 rounded-lg border transition ${
                            isEditMode
                              ? 'border-slate-200 hover:bg-rose-50 text-rose-600 hover:border-rose-200'
                              : 'border-slate-100 text-slate-300 cursor-not-allowed'
                          }`}
                          title={isEditMode ? 'Delete Notice' : 'Enable Edit Mode to delete'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards Presentation (< md) */}
        <div className="block md:hidden divide-y divide-slate-100 bg-white">
          {isLoadingNotices && (
            <div className="py-12 text-center text-slate-400 text-xs">
              Loading digital notices…
            </div>
          )}
          {!isLoadingNotices && notices.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs">
              No circulars found matching current filters.
            </div>
          )}
          {notices.map((n) => {
            const color = CATEGORY_COLORS[n.category.toLowerCase()] || CATEGORY_COLORS.general
            return (
              <div
                key={`mob-${n.id}`}
                className={`p-4 space-y-2.5 transition-colors ${
                  n.is_pinned ? 'bg-amber-50/40' : ''
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${color.bg} ${color.text} ${color.border}`}
                    >
                      {n.category}
                    </span>
                    {n.is_pinned && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        <Pin className="w-3 h-3" /> Pinned
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">{n.publish_date}</span>
                </div>

                {/* Title & Body */}
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{n.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-3 leading-relaxed">{n.content}</p>
                </div>

                {/* Footer & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                  <span className="text-[11px] text-slate-500 font-medium truncate max-w-[200px]">
                    🎯 {n.target_label}
                  </span>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={!isEditMode}
                      onClick={() => togglePinMutation.mutate(n.id)}
                      className={`p-1.5 rounded-lg border text-xs font-semibold transition ${
                        isEditMode
                          ? n.is_pinned
                            ? 'bg-amber-100 border-amber-300 text-amber-800'
                            : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                          : 'border-slate-100 text-slate-300 cursor-not-allowed'
                      }`}
                      title="Toggle Pin"
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!isEditMode}
                      onClick={() => openEditModal(n)}
                      className={`p-1.5 rounded-lg border transition ${
                        isEditMode
                          ? 'border-slate-200 hover:bg-primary-50 text-primary-600'
                          : 'border-slate-100 text-slate-300 cursor-not-allowed'
                      }`}
                      title="Edit Notice"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!isEditMode}
                      onClick={() => setDeleteConfirmId(n.id)}
                      className={`p-1.5 rounded-lg border transition ${
                        isEditMode
                          ? 'border-slate-200 hover:bg-rose-50 text-rose-600'
                          : 'border-slate-100 text-slate-300 cursor-not-allowed'
                      }`}
                      title="Delete Notice"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── MODAL: POST / EDIT NOTICE ────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden space-y-4">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingNotice ? 'Edit Circular Notice' : 'Post New Notice to Board'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Targeted students and guardians will see this circular on their portal.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="px-6 py-2 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notice Headline / Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Annual Term Examination Schedule Announced"
                  className="input text-xs w-full py-2"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="notice-form-category" className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    id="notice-form-category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input text-xs w-full py-2"
                  >
                    <option value="general">General Circular</option>
                    <option value="examination">Examination</option>
                    <option value="holiday">Holiday / Vacation</option>
                    <option value="academic">Academic & Workshops</option>
                    <option value="fee">Fee & Accounts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Publish Date</label>
                  <input
                    type="date"
                    required
                    value={formData.publish_date}
                    onChange={(e) => setFormData({ ...formData, publish_date: e.target.value })}
                    className="input text-xs w-full py-2"
                  />
                </div>
              </div>

              {/* Cohort Targeting */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Standard (Grade)</label>
                  <select
                    value={formData.standard_id ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        standard_id: e.target.value ? Number(e.target.value) : undefined,
                        division_id: undefined,
                      })
                    }
                    className="input text-xs w-full py-1.5 bg-white"
                  >
                    <option value="">All Standards (Academy-wide)</option>
                    {standards.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Division (Batch)</label>
                  <select
                    disabled={!formData.standard_id || divisions.length === 0}
                    value={formData.division_id ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        division_id: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="input text-xs w-full py-1.5 bg-white disabled:bg-slate-100 disabled:opacity-60"
                  >
                    <option value="">All Divisions in Standard</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        Division {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notice Content */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Circular Content / Body *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter full announcement details, timings, guidelines, and instructions..."
                  className="input text-xs w-full p-2.5 resize-none"
                />
              </div>

              {/* Pin Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="notice-is-pinned"
                  checked={formData.is_pinned}
                  onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <label htmlFor="notice-is-pinned" className="text-xs font-medium text-slate-700 cursor-pointer select-none">
                  Pin to top of Student Notice Board
                </label>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 pb-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary px-5 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{editingNotice ? 'Save Changes' : 'Publish Notice'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: DELETE CONFIRMATION ───────────────────────────────────────── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Remove Notice?</h4>
                <p className="text-xs text-slate-500">
                  This circular will be deleted and removed from all student dashboards.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                Delete Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
