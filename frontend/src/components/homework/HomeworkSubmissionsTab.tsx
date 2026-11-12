/**
 * @file        HomeworkSubmissionsTab.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.homework
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-12
 * @updated     2026-11-12
 *
 * @description Digital Submissions Review & Evaluation Drawer supporting submission version history, downloadable student attachments, marks validation, feedback files, and correction/resubmission requests.
 */

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Download, CheckCircle2, RotateCcw, Upload,
  History, Search, Lock, Award
} from 'lucide-react'
import toast from 'react-hot-toast'
import { homeworkApi } from '../../api/endpoints'
import Modal from '../Modal'
import type {
  CheckingRegisterStudent,
  HomeworkAssignmentItem,
  HomeworkAttachment,
} from '../../types'

interface HomeworkSubmissionsTabProps {
  isEditMode: boolean
  assignments: HomeworkAssignmentItem[]
  selectedAssignmentId: number | null
  onSelectAssignmentId: (id: number) => void
}

export default function HomeworkSubmissionsTab({
  isEditMode,
  assignments,
  selectedAssignmentId,
  onSelectAssignmentId,
}: HomeworkSubmissionsTabProps) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'submitted' | 'pending_eval' | 'evaluated'>('submitted')

  const [evalTarget, setEvalTarget] = useState<CheckingRegisterStudent | null>(null)
  const [evalStatus, setEvalStatus] = useState<'evaluated' | 'returned' | 'under_evaluation' | 'incomplete'>('evaluated')
  const [evalMarks, setEvalMarks] = useState<string>('')
  const [evalRemarks, setEvalRemarks] = useState<string>('')
  const [correctionRequested, setCorrectionRequested] = useState(false)
  const [feedbackAttachments, setFeedbackAttachments] = useState<HomeworkAttachment[]>([])
  const [isUploadingFeedback, setIsUploadingFeedback] = useState(false)

  const activeAssignment = assignments.find((a) => a.id === selectedAssignmentId) || assignments[0] || null
  const activeId = activeAssignment?.id || null

  const { data: registerResp, isLoading } = useQuery({
    queryKey: ['hw-submissions-register', activeId, search],
    queryFn: () =>
      homeworkApi.getCheckingRegister(activeId!, { search: search.trim() || undefined }).then((r) => r.data),
    enabled: activeId !== null,
  })

  const students: CheckingRegisterStudent[] = (registerResp?.students || []).filter((st) => {
    if (submissionFilter === 'submitted') {
      return st.submission_status === 'submitted' || st.submission_status === 'late'
    }
    if (submissionFilter === 'pending_eval') {
      return (st.submission_status === 'submitted' || st.submission_status === 'late') &&
        !['done', 'evaluated', 'checked'].includes(st.review_status)
    }
    if (submissionFilter === 'evaluated') {
      return ['done', 'evaluated', 'checked'].includes(st.review_status)
    }
    return true
  })

  const evaluateMutation = useMutation({
    mutationFn: (payload: { recordId: number; body: any }) =>
      homeworkApi.evaluateRecord(payload.recordId, payload.body),
    onSuccess: () => {
      toast.success('Student submission evaluated and notification dispatched.')
      setEvalTarget(null)
      queryClient.invalidateQueries({ queryKey: ['hw-submissions-register'] })
      queryClient.invalidateQueries({ queryKey: ['hw-checking-register'] })
      queryClient.invalidateQueries({ queryKey: ['hw-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['hw-teacher-dashboard'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Evaluation failed.')
    },
  })

  const openEvaluationModal = (st: CheckingRegisterStudent) => {
    setEvalTarget(st)
    setEvalStatus('evaluated')
    setEvalMarks(st.marks_obtained !== null && st.marks_obtained !== undefined ? String(st.marks_obtained) : '')
    setEvalRemarks(st.teacher_remarks || '')
    setCorrectionRequested(false)
    setFeedbackAttachments(st.teacher_feedback_attachments || [])
  }

  const handleFeedbackUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !evalTarget) return
    setIsUploadingFeedback(true)
    try {
      const res = await homeworkApi.uploadFile(file, 'evaluation_attachment', {
        assignment_id: activeId || undefined,
        student_record_id: evalTarget.record_id,
      })
      setFeedbackAttachments((prev) => [
        ...prev,
        {
          title: res.data.title || file.name,
          file_url: res.data.file_url,
          file_type: res.data.file_type,
          file_size_bytes: res.data.file_size_bytes,
          file_id: res.data.id,
        },
      ])
      toast.success('Feedback attachment uploaded.')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Upload failed.')
    } finally {
      setIsUploadingFeedback(false)
      e.target.value = ''
    }
  }

  const handleSaveEvaluation = () => {
    if (!evalTarget || !isEditMode) return
    const marksNum = evalMarks !== '' && !isNaN(Number(evalMarks)) ? Number(evalMarks) : null
    if (
      marksNum !== null &&
      activeAssignment?.max_marks !== null &&
      activeAssignment?.max_marks !== undefined &&
      marksNum > activeAssignment.max_marks
    ) {
      toast.error(`Marks cannot exceed Maximum Marks (${activeAssignment.max_marks}).`)
      return
    }
    evaluateMutation.mutate({
      recordId: evalTarget.record_id,
      body: {
        review_status: correctionRequested ? 'returned' : evalStatus,
        marks_obtained: marksNum,
        teacher_remarks: evalRemarks.trim() || undefined,
        teacher_feedback_attachments: feedbackAttachments.length > 0 ? feedbackAttachments : undefined,
        correction_requested: correctionRequested,
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <select
            value={activeId || ''}
            onChange={(e) => onSelectAssignmentId(Number(e.target.value))}
            className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white min-w-[260px]"
          >
            <option value="">Select Assignment...</option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                [{a.assignment_code}] {a.title} ({a.division_name})
              </option>
            ))}
          </select>

          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter student..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl"
            />
          </div>

          <select
            value={submissionFilter}
            onChange={(e) => setSubmissionFilter(e.target.value as any)}
            className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white"
          >
            <option value="submitted">Submitted &amp; Late</option>
            <option value="pending_eval">Awaiting Evaluation</option>
            <option value="evaluated">Evaluated Only</option>
            <option value="all">All Recipients</option>
          </select>
        </div>

        {activeAssignment?.max_marks && (
          <span className="px-3 py-1 rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
            Max Marks: {activeAssignment.max_marks}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading student submissions...</div>
      ) : students.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No Matching Submissions</h3>
          <p className="text-xs text-slate-500 mt-1">
            Switch filter to "All Recipients" or select another assignment to view student records.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((st) => (
            <div
              key={st.record_id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">{st.student_name}</span>
                    <span className="text-xs font-mono text-slate-500">({st.admission_number})</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${
                        st.submission_status === 'late'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : st.submission_status === 'submitted'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {st.submission_status}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${
                        ['done', 'evaluated', 'checked'].includes(st.review_status)
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : st.review_status === 'returned'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Review: {st.review_status}
                    </span>
                    {(st.submission_version || 0) > 0 && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-indigo-50 text-indigo-700">
                        v{st.submission_version}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {st.submission_time
                      ? `Submitted at ${new Date(st.submission_time).toLocaleString()}`
                      : 'No submission timestamp yet'}
                    {st.viewed_at && ` • Viewed by student on ${new Date(st.viewed_at).toLocaleDateString()}`}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {st.marks_obtained !== null && st.marks_obtained !== undefined && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                      <Award className="w-3.5 h-3.5" />
                      {st.marks_obtained}
                      {activeAssignment?.max_marks ? ` / ${activeAssignment.max_marks}` : ''}
                    </span>
                  )}

                  <button
                    type="button"
                    disabled={!isEditMode}
                    onClick={() => openEvaluationModal(st)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      isEditMode
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                    title={isEditMode ? 'Evaluate submission' : 'Enable Edit Mode to evaluate'}
                  >
                    {!isEditMode ? <Lock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Evaluate / Grade</span>
                  </button>
                </div>
              </div>

              {st.submission_text && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap">
                  {st.submission_text}
                </div>
              )}

              {st.submission_files && st.submission_files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {st.submission_files.map((sf, idx) => (
                    <a
                      key={idx}
                      href={homeworkApi.getDownloadUrl(sf.file_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 border border-primary-200 text-xs font-semibold hover:bg-primary-100"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{sf.file_name || `Submission File ${idx + 1}`}</span>
                    </a>
                  ))}
                </div>
              )}

              {/* Preserved Version History */}
              {st.submission_history && st.submission_history.length > 1 && (
                <details className="text-xs text-slate-600 pt-1 border-t border-slate-100">
                  <summary className="cursor-pointer font-semibold flex items-center gap-1 text-indigo-700">
                    <History className="w-3.5 h-3.5" />
                    <span>Submission Version History ({st.submission_history.length} versions)</span>
                  </summary>
                  <div className="mt-2 space-y-1.5 pl-4">
                    {st.submission_history.map((ver, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="font-mono font-bold text-[11px]">
                          v{ver.version} • {new Date(ver.submitted_at).toLocaleString()} {ver.is_late ? '(Late)' : ''}
                        </div>
                        {ver.submission_text && <div className="mt-0.5 text-slate-700">{ver.submission_text}</div>}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Evaluation Modal */}
      {evalTarget && (
        <Modal
          isOpen={true}
          onClose={() => setEvalTarget(null)}
          title={`Evaluate Submission — ${evalTarget.student_name}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Review Decision</label>
                <select
                  value={evalStatus}
                  onChange={(e) => setEvalStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="evaluated">Evaluated (Approved)</option>
                  <option value="under_evaluation">Under Evaluation</option>
                  <option value="incomplete">Incomplete</option>
                  <option value="returned">Returned for Correction</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Marks Obtained {activeAssignment?.max_marks ? `(Max ${activeAssignment.max_marks})` : ''}
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={evalMarks}
                  onChange={(e) => setEvalMarks(e.target.value)}
                  placeholder="Enter marks"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Written Feedback</label>
              <textarea
                rows={3}
                value={evalRemarks}
                onChange={(e) => setEvalRemarks(e.target.value)}
                placeholder="Provide constructive feedback or correction guidance..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                <input
                  type="checkbox"
                  checked={correctionRequested}
                  onChange={(e) => setCorrectionRequested(e.target.checked)}
                />
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Request Correction / Student Resubmission</span>
              </label>

              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploadingFeedback ? 'Uploading...' : 'Attach Annotated File'}</span>
                <input type="file" onChange={handleFeedbackUpload} className="hidden" />
              </label>
            </div>

            {feedbackAttachments.length > 0 && (
              <div className="text-xs text-slate-600 space-y-1">
                <div className="font-bold">Feedback Attachments:</div>
                {feedbackAttachments.map((att, idx) => (
                  <div key={idx} className="px-2 py-1 bg-slate-50 rounded border border-slate-200 truncate">
                    {att.title}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEvalTarget(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={evaluateMutation.isPending}
                onClick={handleSaveEvaluation}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-primary-600 text-white hover:bg-primary-700"
              >
                {evaluateMutation.isPending ? 'Saving...' : 'Save Evaluation'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

