/**
 * @file        TeacherAssignBatchModal.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      src.components.workforce
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
 * @description Source component for Teacherassignbatchmodal in the src.components.workforce module.
 */

import toast from 'react-hot-toast'
/**
 * @file        TeacherAssignBatchModal.tsx
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
 * @updated     2026-11-07
 *
 * @description Enterprise reusable modal for assigning faculty members to academic boards, standards, divisions, and subjects.
 */

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layers, XCircle, AlertCircle } from 'lucide-react'
import { boardsApi, standardsApi, divisionsApi, subjectsApi, staffApi } from '../../api/endpoints'

interface TeacherAssignBatchModalProps {
  isOpen: boolean
  onClose: () => void
  teacherId?: number
  teacherName?: string
  onSuccess?: () => void
}

export default function TeacherAssignBatchModal({
  isOpen,
  onClose,
  teacherId,
  teacherName,
  onSuccess,
}: TeacherAssignBatchModalProps) {
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    teacher_user_id: teacherId || 0,
    academic_year_id: 1,
    board_id: 1,
    standard_id: 10,
    division_id: 25,
    subject_id: 1,
    weekly_hours: 4.0,
    is_class_teacher: false,
    notes: '',
  })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (teacherId) {
      setForm((prev) => ({ ...prev, teacher_user_id: teacherId }))
    }
  }, [teacherId])

  // Supporting dropdowns
  const { data: boards = [] } = useQuery({
    queryKey: ['boards-dropdown'],
    queryFn: () => boardsApi.list().then((r) => r.data),
    enabled: isOpen,
  })

  const { data: standards = [] } = useQuery({
    queryKey: ['standards-dropdown'],
    queryFn: () => standardsApi.list().then((r) => r.data),
    enabled: isOpen,
  })

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions-dropdown'],
    queryFn: () => divisionsApi.list().then((r) => r.data),
    enabled: isOpen,
  })

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects-dropdown'],
    queryFn: () => subjectsApi.list().then((r) => r.data),
    enabled: isOpen,
  })

  const createAssignmentMutation = useMutation({
    mutationFn: (payload: any) => staffApi.createAssignment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-workforce-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['all-teacher-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['teacher-profile', teacherId] })
      queryClient.invalidateQueries({ queryKey: ['staff-profile', teacherId] })
      onSuccess?.()
      onClose()
      toast.success('Academic batch assignment created successfully!')
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to create assignment')
    },
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    if (!form.teacher_user_id) {
      setErrorMsg('Please select a valid faculty member')
      return
    }
    createAssignmentMutation.mutate(form)
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Assign Faculty to Academic Batch</h3>
              <p className="text-xs text-slate-500">
                {teacherName ? `Assigning for: ${teacherName}` : 'Allocate class batches, subjects, and weekly load'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Board *</label>
              <select
                value={form.board_id}
                onChange={(e) => setForm({ ...form, board_id: Number(e.target.value) })}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
              >
                {boards.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code || b.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Standard / Class *</label>
              <select
                value={form.standard_id}
                onChange={(e) => setForm({ ...form, standard_id: Number(e.target.value) })}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
              >
                {standards.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Batch / Division *</label>
              <select
                value={form.division_id}
                onChange={(e) => setForm({ ...form, division_id: Number(e.target.value) })}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
              >
                {divisions.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Subject *</label>
              <select
                value={form.subject_id}
                onChange={(e) => setForm({ ...form, subject_id: Number(e.target.value) })}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
              >
                {subjects.map((sub: any) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Weekly Teaching Hours</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="40"
                value={form.weekly_hours}
                onChange={(e) => setForm({ ...form, weekly_hours: parseFloat(e.target.value) || 1.0 })}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_class_teacher}
                  onChange={(e) => setForm({ ...form, is_class_teacher: e.target.checked })}
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-xs font-semibold text-slate-700">Designate as Class Teacher</span>
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Notes / Instructions</label>
            <input
              type="text"
              placeholder="e.g. Primary Mathematics Mentor for Term 1"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createAssignmentMutation.isPending}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-50"
            >
              {createAssignmentMutation.isPending ? 'Assigning...' : 'Confirm Batch Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
