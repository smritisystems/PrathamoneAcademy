/**
 * @file        HomeworkCreateForm.tsx
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
 * @description Modular Assignment & Homework Creation form supporting Batch, Multi-Batch, Selected Group, and Individual Student targets, Recipient Preview, Custom Per-Student Overrides, File Attachments, and Draft/Publish workflows.
 */

import React, { useState, useEffect } from 'react'
import {
  Plus, Upload, Sparkles, Users, Search, Eye, CheckCircle2,
  Paperclip, Trash2, Clock, Send, Save, Lock
} from 'lucide-react'
import toast from 'react-hot-toast'
import { homeworkApi } from '../../api/endpoints'
import type {
  HomeworkAttachment,
  HomeworkRecipientPreviewStudent,
  HomeworkSettingsConfig,
  StudentAssignmentOverride,
} from '../../types'

interface HomeworkCreateFormProps {
  isEditMode: boolean
  academicYearId: number
  currentUserId: number
  currentUserRole?: string
  standards: any[]
  divisions: any[]
  subjects: any[]
  teachers: any[]
  settings?: HomeworkSettingsConfig
  initialValues?: {
    standard_id?: string
    division_id?: string
    subject_id?: string
    teacher_id?: string
    topic?: string
    chapter?: string
    title?: string
    description?: string
    instructions?: string
    assignment_type?: string
    submission_method?: string
    max_marks?: number | ''
    estimated_duration_minutes?: number | ''
    teaching_session_id?: string
  }
  isSubmitting: boolean
  onSubmitAssignment: (payload: any) => void
  onCancel?: () => void
}

export default function HomeworkCreateForm({
  isEditMode,
  academicYearId,
  currentUserId,
  currentUserRole,
  standards,
  divisions,
  subjects,
  teachers,
  settings,
  initialValues,
  isSubmitting,
  onSubmitAssignment,
}: HomeworkCreateFormProps) {
  const [title, setTitle] = useState(initialValues?.title || '')
  const [assignmentType, setAssignmentType] = useState(initialValues?.assignment_type || 'homework')
  const [estimatedDuration, setEstimatedDuration] = useState<number | ''>(
    initialValues?.estimated_duration_minutes ?? ''
  )
  const [description, setDescription] = useState(initialValues?.description || '')
  const [instructions, setInstructions] = useState(initialValues?.instructions || '')
  const [standardId, setStandardId] = useState(initialValues?.standard_id || '')
  const [divisionId, setDivisionId] = useState(initialValues?.division_id || '')
  const [subjectId, setSubjectId] = useState(initialValues?.subject_id || '')
  const [teacherId, setTeacherId] = useState(
    initialValues?.teacher_id || (currentUserRole === 'teacher' ? String(currentUserId) : '')
  )
  const [topic, setTopic] = useState(initialValues?.topic || '')
  const [chapter, setChapter] = useState(initialValues?.chapter || '')
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    return d.toISOString().split('T')[0]
  })
  const [dueTime, setDueTime] = useState('23:59')
  const [maxMarks, setMaxMarks] = useState<number | ''>(initialValues?.max_marks ?? 25)
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [submissionMethod, setSubmissionMethod] = useState(
    initialValues?.submission_method || 'physical_notebook'
  )
  const [recipientType, setRecipientType] = useState<
    'batch' | 'multi_batch' | 'selected_group' | 'individual_student' | 'selected_students'
  >('batch')
  const [selectedBatchIds, setSelectedBatchIds] = useState<number[]>([])
  const [lateJoinerPolicy, setLateJoinerPolicy] = useState<'manual' | 'auto_include' | 'exclude'>(
    settings?.default_late_joiner_policy || 'manual'
  )
  const [allowLateSubmissions, setAllowLateSubmissions] = useState(true)
  const [allowResubmission, setAllowResubmission] = useState(true)
  const [isTemplate, setIsTemplate] = useState(false)

  // Individual / group student selection & per-student customization
  const [studentSearch, setStudentSearch] = useState('')
  const [searchResults, setSearchResults] = useState<HomeworkRecipientPreviewStudent[]>([])
  const [selectedStudents, setSelectedStudents] = useState<HomeworkRecipientPreviewStudent[]>([])
  const [studentOverrides, setStudentOverrides] = useState<Record<number, StudentAssignmentOverride>>({})

  // Recipient preview
  const [previewList, setPreviewList] = useState<HomeworkRecipientPreviewStudent[] | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  // Uploaded attachments
  const [attachments, setAttachments] = useState<HomeworkAttachment[]>([])
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (!initialValues) return
    if (initialValues.title !== undefined) setTitle(initialValues.title)
    if (initialValues.description !== undefined) setDescription(initialValues.description)
    if (initialValues.instructions !== undefined) setInstructions(initialValues.instructions)
    if (initialValues.topic !== undefined) setTopic(initialValues.topic)
    if (initialValues.chapter !== undefined) setChapter(initialValues.chapter)
    if (initialValues.standard_id !== undefined) setStandardId(initialValues.standard_id)
    if (initialValues.division_id !== undefined) setDivisionId(initialValues.division_id)
    if (initialValues.subject_id !== undefined) setSubjectId(initialValues.subject_id)
    if (initialValues.assignment_type) setAssignmentType(initialValues.assignment_type)
    if (initialValues.submission_method) setSubmissionMethod(initialValues.submission_method)
  }, [initialValues])

  const availableTypes = settings?.available_assignment_types || [
    'homework',
    'classwork',
    'worksheet',
    'project',
    'practice',
    'revision',
    'reading_assignment',
    'test_preparation',
  ]

  const filteredDivisions = divisions.filter(
    (d: any) => !standardId || Number(d.standard_id) === Number(standardId)
  )
  const filteredSubjects = subjects.filter(
    (s: any) => !standardId || !s.standard_id || Number(s.standard_id) === Number(standardId)
  )

  const handleSearchStudents = async () => {
    if (!standardId && !divisionId && !studentSearch.trim()) {
      toast.error('Select a Standard/Batch or enter student name / admission number to search.')
      return
    }
    try {
      const resp = await homeworkApi.searchStudents({
        academic_year_id: academicYearId,
        standard_id: standardId ? Number(standardId) : undefined,
        division_id: divisionId ? Number(divisionId) : undefined,
        search: studentSearch.trim() || undefined,
      })
      setSearchResults(resp.data.items || [])
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to search students.')
    }
  }

  const toggleStudentSelection = (stu: HomeworkRecipientPreviewStudent) => {
    setSelectedStudents((prev) => {
      const exists = prev.some((s) => s.student_id === stu.student_id)
      if (exists) {
        return prev.filter((s) => s.student_id !== stu.student_id)
      }
      return [...prev, stu]
    })
  }

  const handlePreviewRecipients = async () => {
    if (!standardId) {
      toast.error('Select a Standard first to preview eligible students.')
      return
    }
    setIsPreviewLoading(true)
    try {
      const resp = await homeworkApi.previewRecipients({
        academic_year_id: academicYearId,
        standard_id: Number(standardId),
        division_id: divisionId ? Number(divisionId) : undefined,
        subject_id: subjectId ? Number(subjectId) : undefined,
        recipient_type: recipientType,
        recipient_batch_ids: recipientType === 'multi_batch' ? selectedBatchIds : undefined,
        selected_student_ids: ['individual_student', 'selected_group', 'selected_students'].includes(recipientType)
          ? selectedStudents.map((s) => s.student_id)
          : undefined,
      })
      setPreviewList(resp.data.students || [])
      toast.success(`Verified ${resp.data.count} eligible recipient(s).`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to preview recipients.')
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setIsUploading(true)
    try {
      const uploaded: HomeworkAttachment[] = []
      for (const f of Array.from(files)) {
        const res = await homeworkApi.uploadFile(f, 'assignment_attachment')
        uploaded.push({
          title: res.data.title || f.name,
          file_url: res.data.file_url,
          file_type: res.data.file_type,
          file_size_bytes: res.data.file_size_bytes,
          file_id: res.data.id,
        })
      }
      setAttachments((prev) => [...prev, ...uploaded])
      toast.success(`Uploaded ${uploaded.length} attachment(s).`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Attachment upload failed.')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  const submitForm = (targetStatus: 'draft' | 'published') => {
    if (!isEditMode) {
      toast.error('Locked in View Mode: Enable Edit Mode in the top bar first.')
      return
    }
    if (!title.trim() || !standardId || !subjectId || !dueDate) {
      toast.error('Please fill all mandatory fields (Title, Standard, Subject, Due Date).')
      return
    }
    if (recipientType === 'batch' && !divisionId) {
      toast.error('Please select a Batch / Division for batch-level assignment.')
      return
    }
    if (
      ['individual_student', 'selected_group', 'selected_students'].includes(recipientType) &&
      selectedStudents.length === 0
    ) {
      toast.error('Please select at least one student.')
      return
    }

    const overridesList = Object.values(studentOverrides).filter(
      (ov) =>
        selectedStudents.some((s) => s.student_id === ov.student_id) &&
        (ov.due_date || (ov.instructions && ov.instructions.trim()))
    )

    onSubmitAssignment({
      academic_year_id: academicYearId,
      standard_id: Number(standardId),
      division_id: divisionId ? Number(divisionId) : undefined,
      subject_id: Number(subjectId),
      teacher_user_id: teacherId ? Number(teacherId) : currentUserId,
      teaching_session_id: initialValues?.teaching_session_id ? Number(initialValues.teaching_session_id) : undefined,
      assignment_type: assignmentType,
      estimated_duration_minutes: estimatedDuration !== '' ? Number(estimatedDuration) : undefined,
      title: title.trim(),
      description: description.trim() || undefined,
      instructions: instructions.trim() || undefined,
      topic: topic.trim() || undefined,
      chapter: chapter.trim() || undefined,
      due_date: dueDate,
      due_time: dueTime,
      max_marks: maxMarks !== '' ? Number(maxMarks) : undefined,
      difficulty_level: difficulty,
      priority,
      submission_method: submissionMethod,
      recipient_type: recipientType,
      recipient_batch_ids: recipientType === 'multi_batch' ? selectedBatchIds : undefined,
      selected_student_ids: ['individual_student', 'selected_group', 'selected_students'].includes(recipientType)
        ? selectedStudents.map((s) => s.student_id)
        : undefined,
      student_overrides: overridesList.length > 0 ? overridesList : undefined,
      late_joiner_policy: lateJoinerPolicy,
      allow_late_submissions: allowLateSubmissions,
      allow_resubmission: allowResubmission,
      attachments: attachments.length > 0 ? attachments : undefined,
      status: targetStatus,
      is_template: isTemplate,
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 max-w-5xl mx-auto space-y-6">
      <div className="border-b border-slate-100 pb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary-600" />
            <span>Create Homework or Assignment</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Target an entire batch, selected student group, or individual students with optional per-student overrides.
          </p>
        </div>
        {!isEditMode && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Lock className="w-3.5 h-3.5" /> Read-Only (Enable Edit Mode)
          </span>
        )}
      </div>

      {initialValues?.teaching_session_id && (
        <div className="p-3 bg-primary-50 border border-primary-200 rounded-xl text-xs text-primary-800 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary-600 shrink-0" />
          <span>
            <strong>Prefilled from Teaching Session:</strong> Linked to Session #{initialValues.teaching_session_id}.
          </span>
        </div>
      )}

      {/* Section 1: Basic Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Assignment Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            disabled={!isEditMode}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Chapter 4: Quadratic Equations Problem Set 1"
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Assignment Type</label>
          <select
            disabled={!isEditMode}
            value={assignmentType}
            onChange={(e) => setAssignmentType(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white"
          >
            {availableTypes.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Standard / Class <span className="text-red-500">*</span>
          </label>
          <select
            disabled={!isEditMode}
            value={standardId}
            onChange={(e) => {
              setStandardId(e.target.value)
              setDivisionId('')
              setPreviewList(null)
            }}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white"
          >
            <option value="">Select Standard</option>
            {standards.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Subject <span className="text-red-500">*</span>
          </label>
          <select
            disabled={!isEditMode}
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white"
          >
            <option value="">Select Subject</option>
            {filteredSubjects.map((sub: any) => (
              <option key={sub.id} value={sub.id}>{sub.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Faculty</label>
          <select
            disabled={!isEditMode || currentUserRole === 'teacher'}
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white"
          >
            <option value="">Select Teacher</option>
            {teachers.map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.first_name} {t.last_name} ({t.username})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Chapter / Unit</label>
          <input
            type="text"
            disabled={!isEditMode}
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            placeholder="e.g. Chapter 4"
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Topic Covered</label>
          <input
            type="text"
            disabled={!isEditMode}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Factorization & Formula Method"
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" /> Est. Time (Minutes)
          </label>
          <input
            type="number"
            min={5}
            max={600}
            disabled={!isEditMode}
            value={estimatedDuration}
            onChange={(e) => setEstimatedDuration(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="Optional e.g. 45"
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Due Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            disabled={!isEditMode}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Due Time</label>
          <input
            type="time"
            disabled={!isEditMode}
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Max Marks (Optional)</label>
          <input
            type="number"
            min={0}
            max={1000}
            disabled={!isEditMode}
            value={maxMarks}
            onChange={(e) => setMaxMarks(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Submission Mode</label>
          <select
            disabled={!isEditMode}
            value={submissionMethod}
            onChange={(e) => setSubmissionMethod(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white"
          >
            <option value="physical_notebook">Physical Notebook Checking</option>
            <option value="photo_upload">Digital Photo Upload</option>
            <option value="pdf_document">Digital PDF / File Upload</option>
            <option value="online_text">Online Text Response</option>
            <option value="in_class">In-Class Practice / Lab</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Difficulty</label>
          <select
            disabled={!isEditMode}
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as any)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard / Olympiad</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
          <select
            disabled={!isEditMode}
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Instructions & Description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
          <textarea
            rows={3}
            disabled={!isEditMode}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Summarize the homework scope and textbook exercise numbers..."
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Student Instructions</label>
          <textarea
            rows={3}
            disabled={!isEditMode}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Mention formatting rules, graph paper requirements, or submission steps..."
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
          />
        </div>
      </div>

      {/* Section 2: Assignment Target (Batch / Individual / Selected Group) */}
      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Assignment Target &amp; Recipient Snapshotting
            </h3>
          </div>
          <button
            type="button"
            onClick={handlePreviewRecipients}
            disabled={isPreviewLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs"
          >
            <Eye className="w-3.5 h-3.5 text-primary-600" />
            <span>{isPreviewLoading ? 'Checking...' : 'Review Recipient Count'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Target Level</label>
            <select
              disabled={!isEditMode}
              value={recipientType}
              onChange={(e) => {
                setRecipientType(e.target.value as any)
                setPreviewList(null)
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white"
            >
              <option value="batch">A. Entire Batch (Single Batch)</option>
              <option value="multi_batch">A2. Multiple Batches</option>
              <option value="individual_student">B. Individual Student(s)</option>
              <option value="selected_group">C. Selected Group Within Batch</option>
            </select>
          </div>

          {recipientType === 'multi_batch' ? (
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Batches</label>
              <div className="flex flex-wrap gap-2">
                {filteredDivisions.map((d: any) => {
                  const active = selectedBatchIds.includes(d.id)
                  return (
                    <button
                      key={d.id}
                      type="button"
                      disabled={!isEditMode}
                      onClick={() =>
                        setSelectedBatchIds((prev) =>
                          prev.includes(d.id) ? prev.filter((id) => id !== d.id) : [...prev, d.id]
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        active
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {d.name}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {recipientType === 'batch' ? 'Batch / Division *' : 'Filter by Batch (Optional)'}
              </label>
              <select
                disabled={!isEditMode}
                value={divisionId}
                onChange={(e) => {
                  setDivisionId(e.target.value)
                  setPreviewList(null)
                }}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white"
              >
                <option value="">All Batches in Standard</option>
                {filteredDivisions.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {recipientType !== 'multi_batch' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Late-Joiner Policy</label>
              <select
                disabled={!isEditMode}
                value={lateJoinerPolicy}
                onChange={(e) => setLateJoinerPolicy(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white"
              >
                <option value="manual">Manual Inclusion Only (Teacher Sync)</option>
                <option value="auto_include">Auto-Include New Batch Joiners</option>
                <option value="exclude">Exclude New Joiners</option>
              </select>
            </div>
          )}
        </div>

        {/* Individual / Selected Group Search & Custom Overrides */}
        {['individual_student', 'selected_group', 'selected_students'].includes(recipientType) && (
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  disabled={!isEditMode}
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search active student by name or admission no..."
                  className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                />
              </div>
              <button
                type="button"
                disabled={!isEditMode}
                onClick={handleSearchStudents}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
              >
                Find Students
              </button>
              <span className="text-xs font-bold text-slate-700">
                Selected: {selectedStudents.length}
              </span>
            </div>

            {searchResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                {searchResults.map((stu) => {
                  const checked = selectedStudents.some((s) => s.student_id === stu.student_id)
                  return (
                    <label
                      key={stu.student_id}
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer border ${
                        checked ? 'bg-primary-50 border-primary-300 text-primary-900' : 'border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!isEditMode}
                        onChange={() => toggleStudentSelection(stu)}
                      />
                      <span className="font-semibold">{stu.student_name}</span>
                      <span className="text-[11px] font-mono text-slate-500">({stu.admission_number})</span>
                    </label>
                  )
                })}
              </div>
            )}

            {/* Per-student custom due date & instructions override */}
            {selectedStudents.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-600 uppercase">
                  Optional Per-Student Overrides (Custom Due Date / Instructions)
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedStudents.map((stu) => {
                    const ov = studentOverrides[stu.student_id] || { student_id: stu.student_id }
                    return (
                      <div
                        key={stu.student_id}
                        className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 text-xs"
                      >
                        <span className="font-semibold text-slate-800 min-w-[140px]">
                          {stu.student_name}
                        </span>
                        <input
                          type="date"
                          disabled={!isEditMode}
                          value={ov.due_date || ''}
                          onChange={(e) =>
                            setStudentOverrides((prev) => ({
                              ...prev,
                              [stu.student_id]: { ...ov, due_date: e.target.value || undefined },
                            }))
                          }
                          className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-mono"
                          title="Override due date for this student"
                        />
                        <input
                          type="text"
                          disabled={!isEditMode}
                          placeholder="Custom instructions (optional)..."
                          value={ov.instructions || ''}
                          onChange={(e) =>
                            setStudentOverrides((prev) => ({
                              ...prev,
                              [stu.student_id]: { ...ov, instructions: e.target.value },
                            }))
                          }
                          className="flex-1 min-w-[180px] px-2 py-1 border border-slate-200 rounded-lg text-xs"
                        />
                        <button
                          type="button"
                          disabled={!isEditMode}
                          onClick={() => toggleStudentSelection(stu)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remove recipient"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preview Summary Box */}
        {previewList !== null && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Ready to Assign: {previewList.length} Unique Eligible Student(s)</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {previewList.slice(0, 12).map((s) => (
                <span key={s.student_id} className="px-2 py-0.5 bg-white rounded-md border border-emerald-200 font-medium">
                  {s.student_name} ({s.admission_number})
                </span>
              ))}
              {previewList.length > 12 && (
                <span className="px-2 py-0.5 text-emerald-700 font-bold">
                  +{previewList.length - 12} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Section 3: File Attachments & Submission Policies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-primary-600" />
              <span>Supporting Material &amp; Worksheets</span>
            </label>
            <label
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${
                isEditMode
                  ? 'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100 cursor-pointer'
                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Uploading...' : 'Attach Files'}</span>
              <input
                type="file"
                multiple
                disabled={!isEditMode || isUploading}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
          {attachments.length === 0 ? (
            <p className="text-[11px] text-slate-400">
              Allowed formats: {(settings?.allowed_extensions || ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'png']).join(', ')} (max {settings?.max_file_size_mb || 10} MB)
            </p>
          ) : (
            <div className="space-y-1.5">
              {attachments.map((att, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                  <span className="truncate font-medium text-slate-700">{att.title}</span>
                  <button
                    type="button"
                    disabled={!isEditMode}
                    onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
          <div className="font-bold text-slate-700 mb-1">Student Submission &amp; Template Controls</div>
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              disabled={!isEditMode}
              checked={allowLateSubmissions}
              onChange={(e) => setAllowLateSubmissions(e.target.checked)}
            />
            <span>Allow Late Submissions (tracked with Late badge)</span>
          </label>
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              disabled={!isEditMode}
              checked={allowResubmission}
              onChange={(e) => setAllowResubmission(e.target.checked)}
            />
            <span>Permit Student Resubmissions (preserves full version history)</span>
          </label>
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              disabled={!isEditMode}
              checked={isTemplate}
              onChange={(e) => setIsTemplate(e.target.checked)}
            />
            <span>Save a reusable copy in Templates library</span>
          </label>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          disabled={!isEditMode || isSubmitting}
          onClick={() => submitForm('draft')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>Save as Draft</span>
        </button>
        <button
          type="button"
          disabled={!isEditMode || isSubmitting}
          onClick={() => submitForm('published')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-primary-600 text-white hover:bg-primary-700 shadow-xs disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>{isSubmitting ? 'Publishing...' : 'Publish & Notify Students'}</span>
        </button>
      </div>
    </div>
  )
}

