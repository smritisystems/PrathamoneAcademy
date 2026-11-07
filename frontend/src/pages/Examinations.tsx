/**
 * @file        Examinations.tsx
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
 * @created     2026-11-03
 * @updated     2026-11-07
 *
 * @description Examinations workspace managing exam schedules, marks entry, class analytics, and graphical report cards.
 */

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Award, Plus, Calendar, CheckCircle, FileSpreadsheet,
  BarChart3, FileEdit, FileText, Users, Trophy, TrendingUp,
  CheckCircle2, XCircle, AlertCircle, Save, X, Printer, Lock
} from 'lucide-react'
import { standardsApi, academicYearsApi, examinationsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { EditModeBar } from '../components/common'
import Modal from '../components/Modal'
import ReportCardModal from '../components/ReportCardModal'
import type { ExamMarksSheet, ExamAnalyticsData } from '../types'
import toast from 'react-hot-toast'

export default function ExaminationsPage() {
  const { selectedInstitutionId, selectedAcademicYearId } = useAuthStore()
  const editScope = 'academic:examinations'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])
  const qc = useQueryClient()
  const [selectedStandardId, setSelectedStandardId] = useState<string>('')
  const [showExamModal, setShowExamModal] = useState(false)
  const [examForm, setExamForm] = useState({
    academic_year_id: '',
    standard_id: '',
    name: '',
    exam_type: 'Unit Test',
    start_date: '',
    end_date: '',
    max_marks: '100',
    passing_marks: '35',
  })

  // Modal states for Marks, Analytics, and Report Card
  const [activeMarksExam, setActiveMarksExam] = useState<{ id: number; name: string } | null>(null)
  const [activeAnalyticsExam, setActiveAnalyticsExam] = useState<{ id: number; name: string } | null>(null)
  const [reportCardTarget, setReportCardTarget] = useState<{
    isOpen: boolean
    examId?: number
    studentId?: number
  }>({ isOpen: false })

  // Marks Entry local state
  const [marksGrid, setMarksGrid] = useState<
    Record<string, { marks: string; is_absent: boolean; remarks: string }>
  >({})

  // Fetch standards
  const { data: standards = [] } = useQuery({
    queryKey: ['standards', selectedInstitutionId],
    queryFn: () => standardsApi.list(selectedInstitutionId ?? undefined).then((r) => r.data),
  })

  // Fetch academic years
  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years', selectedInstitutionId],
    queryFn: () => academicYearsApi.list(selectedInstitutionId ?? undefined).then((r) => r.data),
  })

  const currentStandardId = selectedStandardId || (standards[0]?.id ? String(standards[0].id) : '')

  // Fetch examinations
  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['examinations', selectedAcademicYearId, currentStandardId],
    queryFn: () =>
      examinationsApi
        .list({
          academic_year_id: selectedAcademicYearId ?? undefined,
          standard_id: currentStandardId ? Number(currentStandardId) : undefined,
        })
        .then((r) => r.data),
    enabled: true,
  })

  // Schedule Exam Mutation
  const examMutation = useMutation({
    mutationFn: (data: {
      academic_year_id: number
      standard_id: number
      name: string
      exam_type?: string
      start_date?: string
      end_date?: string
      max_marks?: number
      passing_marks?: number
    }) => examinationsApi.create(data),
    onSuccess: () => {
      toast.success('Examination scheduled successfully')
      qc.invalidateQueries({ queryKey: ['examinations'] })
      setShowExamModal(false)
      setExamForm({
        academic_year_id: '',
        standard_id: '',
        name: '',
        exam_type: 'Unit Test',
        start_date: '',
        end_date: '',
        max_marks: '100',
        passing_marks: '35',
      })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to schedule exam'),
  })

  // Fetch Marks Sheet for activeMarksExam
  const {
    data: marksSheet,
    isLoading: isLoadingMarks,
    refetch: refetchMarks,
  } = useQuery({
    queryKey: ['exam-marks', activeMarksExam?.id],
    queryFn: () => examinationsApi.getMarks(activeMarksExam!.id).then((r) => r.data),
    enabled: !!activeMarksExam,
  })

  // Populate local marks grid when marks sheet arrives
  useEffect(() => {
    if (marksSheet) {
      const grid: Record<string, { marks: string; is_absent: boolean; remarks: string }> = {}
      for (const student of marksSheet.students) {
        for (const sub of marksSheet.subjects) {
          const key = `${student.student_id}_${sub.id}`
          const score = student.scores?.[sub.id]
          grid[key] = {
            marks: score?.marks_obtained != null ? String(score.marks_obtained) : '',
            is_absent: !!score?.is_absent,
            remarks: score?.remarks || '',
          }
        }
      }
      setMarksGrid(grid)
    }
  }, [marksSheet])

  // Save Marks Mutation
  const saveMarksMutation = useMutation({
    mutationFn: async () => {
      if (!activeMarksExam || !marksSheet) return
      const entries: Array<{
        student_id: number
        subject_id: number
        marks_obtained?: number | null
        is_absent?: boolean
        remarks?: string | null
      }> = []

      for (const student of marksSheet.students) {
        for (const sub of marksSheet.subjects) {
          const key = `${student.student_id}_${sub.id}`
          const item = marksGrid[key]
          if (item) {
            entries.push({
              student_id: student.student_id,
              subject_id: sub.id,
              marks_obtained: item.is_absent ? 0 : item.marks ? Number(item.marks) : null,
              is_absent: item.is_absent,
              remarks: item.remarks || null,
            })
          }
        }
      }

      return examinationsApi.saveMarks(activeMarksExam.id, { entries })
    },
    onSuccess: (res: any) => {
      toast.success(`Successfully saved marks (${res?.data?.saved_count || 0} scores updated)`)
      refetchMarks()
      qc.invalidateQueries({ queryKey: ['exam-analytics', activeMarksExam?.id] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to save marks'),
  })

  // Fetch Analytics for activeAnalyticsExam
  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['exam-analytics', activeAnalyticsExam?.id],
    queryFn: () => examinationsApi.getAnalytics(activeAnalyticsExam!.id).then((r) => r.data),
    enabled: !!activeAnalyticsExam,
  })

  const selectedStdObj = standards.find((s) => String(s.id) === currentStandardId)

  return (
    <div className="space-y-6">
      {/* Global View-First & Explicit Edit Mode Governance Bar */}
      <EditModeBar scope={editScope} title="Examinations & Test Series Workspace" isDirty={showExamModal} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Examinations & Test Series</h1>
          <p className="text-sm text-gray-500">
            Schedule exams, record subject marks, analyze class performance, and print graphical report cards
          </p>
        </div>
        {isEditMode ? (
          <button
            onClick={() => {
              setExamForm((f) => ({
                ...f,
                academic_year_id: selectedAcademicYearId ? String(selectedAcademicYearId) : '',
                standard_id: currentStandardId,
              }))
              setShowExamModal(true)
            }}
            className="btn-primary flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Schedule Examination
          </button>
        ) : (
          <button
            type="button"
            onClick={() => toast.error('Locked in View Mode: Please enable Edit Mode above to schedule examinations.')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-sm"
            title="Locked in View Mode: Enable Edit Mode above to schedule examinations"
          >
            <Lock className="w-4 h-4 text-slate-400" />
            <span>Schedule Examination (Locked)</span>
          </button>
        )}
      </div>

      {/* Standard Selector Tabs */}
      <div className="card p-3">
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          FILTER BY STANDARD / LEVEL:
        </label>
        <div className="flex flex-wrap gap-2">
          {standards.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStandardId(String(s.id))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentStandardId === String(s.id)
                  ? 'bg-primary-700 text-white shadow-sm font-semibold'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Examinations List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {selectedStdObj?.name ? `${selectedStdObj.name} — Examinations` : 'Examinations'}
            </h2>
            <p className="text-xs text-gray-500">
              Total {exams.length} examination{exams.length === 1 ? '' : 's'} scheduled
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" />
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Award className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-medium">No examinations scheduled for this standard</p>
            <p className="text-xs mt-1">
              Click "+ Schedule Examination" to create a new test or mock exam.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 text-left">
                  <th className="pb-3 font-medium">Exam Name</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Standard</th>
                  <th className="pb-3 font-medium text-center">Max Marks</th>
                  <th className="pb-3 font-medium text-center">Passing Marks</th>
                  <th className="pb-3 font-medium text-center">Status</th>
                  <th className="pb-3 font-medium text-right">Actions & Reports</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {exams.map((ex: any) => (
                  <tr key={ex.id} className="hover:bg-gray-50/50">
                    <td className="py-3 font-medium text-gray-900 flex items-center gap-2">
                      <Award className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <span>{ex.name}</span>
                    </td>
                    <td className="py-3 text-xs text-gray-600">
                      <span className="bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full font-medium border border-purple-200">
                        {ex.exam_type}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-gray-600 font-medium">
                      {ex.standard_name || selectedStdObj?.name}
                    </td>
                    <td className="py-3 text-center text-gray-700 font-semibold">
                      {ex.max_marks || 100}
                    </td>
                    <td className="py-3 text-center text-gray-700">
                      {ex.passing_marks || 35}
                    </td>
                    <td className="py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle className="w-3 h-3 text-emerald-600" /> Scheduled
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setActiveMarksExam({ id: ex.id, name: ex.name })}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition"
                          title="Enter student marks for all subjects"
                        >
                          <FileEdit className="w-3.5 h-3.5" /> Marks
                        </button>
                        <button
                          onClick={() => setActiveAnalyticsExam({ id: ex.id, name: ex.name })}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition"
                          title="View class performance analytics & leaderboard"
                        >
                          <BarChart3 className="w-3.5 h-3.5" /> Analytics
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule Exam Modal */}
      <Modal isOpen={showExamModal} onClose={() => setShowExamModal(false)} title="Schedule Examination">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Standard / Level *</label>
            <select
              className="input w-full"
              value={examForm.standard_id}
              onChange={(e) => setExamForm({ ...examForm, standard_id: e.target.value })}
            >
              <option value="">Select standard...</option>
              {standards.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
            <select
              className="input w-full"
              value={examForm.academic_year_id}
              onChange={(e) => setExamForm({ ...examForm, academic_year_id: e.target.value })}
            >
              <option value="">Select academic year...</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  AY {y.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam / Test Name *</label>
            <input
              className="input w-full"
              value={examForm.name}
              onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
              placeholder="e.g. Mid-Term Assessment, JEE Mock Test 1, Unit Test 2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Examination Type</label>
            <select
              className="input w-full"
              value={examForm.exam_type}
              onChange={(e) => setExamForm({ ...examForm, exam_type: e.target.value })}
            >
              <option value="Unit Test">Unit Test</option>
              <option value="Mid-Term">Mid-Term Examination</option>
              <option value="Final Exam">Final Examination</option>
              <option value="Mock Test">Competitive Mock Test (JEE/NEET)</option>
              <option value="Weekly Assessment">Weekly Assessment</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Marks</label>
              <input
                type="number"
                className="input w-full"
                value={examForm.max_marks}
                onChange={(e) => setExamForm({ ...examForm, max_marks: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passing Marks</label>
              <input
                type="number"
                className="input w-full"
                value={examForm.passing_marks}
                onChange={(e) => setExamForm({ ...examForm, passing_marks: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-3">
            <button onClick={() => setShowExamModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={() =>
                examMutation.mutate({
                  standard_id: Number(examForm.standard_id),
                  academic_year_id: Number(examForm.academic_year_id),
                  name: examForm.name,
                  exam_type: examForm.exam_type,
                  max_marks: Number(examForm.max_marks) || 100,
                  passing_marks: Number(examForm.passing_marks) || 35,
                })
              }
              disabled={
                examMutation.isPending ||
                !examForm.standard_id ||
                !examForm.academic_year_id ||
                !examForm.name
              }
              className="btn-primary"
            >
              {examMutation.isPending ? 'Scheduling…' : 'Schedule Exam'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Marks Entry Modal */}
      {activeMarksExam && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-xl">
                  <FileEdit className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Marks Entry Sheet — {activeMarksExam.name}</h2>
                  <p className="text-xs text-white/70">
                    Record marks obtained per subject. Changes will update candidate transcripts and rank calculations.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isEditMode ? (
                  <button
                    onClick={() => saveMarksMutation.mutate()}
                    disabled={saveMarksMutation.isPending || isLoadingMarks}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" /> {saveMarksMutation.isPending ? 'Saving…' : 'Save All Marks'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toast.error('Locked in View Mode: Please enable Edit Mode above to save marks.')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-400 border border-slate-200 text-xs font-bold rounded-lg cursor-not-allowed"
                    title="Locked in View Mode: Enable Edit Mode above to save marks"
                  >
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span>Save All Marks (Locked)</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveMarksExam(null)}
                  className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sheet Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {isLoadingMarks ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                </div>
              ) : !marksSheet || marksSheet.students.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-600">No enrolled students found</p>
                  <p className="text-xs text-gray-400 mt-1">Ensure students are enrolled in this standard and active.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                      Total Students: <strong className="text-gray-900">{marksSheet.students.length}</strong> | Total Subjects:{' '}
                      <strong className="text-gray-900">{marksSheet.subjects.length}</strong>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Pass: Marks ≥ Pass Marks
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Fail: Marks &lt; Pass Marks
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> Absent: Check 'AB'
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-gray-200 text-gray-600 uppercase text-[10px] tracking-wider text-left">
                          <th className="py-2.5 px-3 font-semibold w-12 text-center">Roll</th>
                          <th className="py-2.5 px-3 font-semibold min-w-[160px]">Student Name</th>
                          {marksSheet.subjects.map((sub) => (
                            <th key={sub.id} className="py-2.5 px-3 font-semibold text-center min-w-[140px]">
                              {sub.name}
                              <div className="text-[9px] text-gray-400 lowercase font-normal">
                                Max {sub.max_marks} • Pass {sub.pass_marks}
                              </div>
                            </th>
                          ))}
                          <th className="py-2.5 px-3 text-right font-semibold">Transcript</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {marksSheet.students.map((st) => (
                          <tr key={st.student_id} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3 font-mono font-bold text-gray-700 text-center">
                              {st.roll_number}
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-semibold text-gray-900 block">{st.name}</span>
                              <span className="text-[10px] text-gray-400">{st.admission_number}</span>
                            </td>
                            {marksSheet.subjects.map((sub) => {
                              const key = `${st.student_id}_${sub.id}`
                              const cell = marksGrid[key] || { marks: '', is_absent: false, remarks: '' }
                              return (
                                <td key={sub.id} className="py-2 px-2 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <input
                                      type="number"
                                      disabled={cell.is_absent}
                                      value={cell.marks}
                                      placeholder={cell.is_absent ? 'AB' : '0'}
                                      min={0}
                                      max={sub.max_marks}
                                      onChange={(e) => {
                                        const val = e.target.value
                                        setMarksGrid((prev) => ({
                                          ...prev,
                                          [key]: { ...prev[key], marks: val },
                                        }))
                                      }}
                                      className={`w-16 h-7 text-center rounded border text-xs font-bold transition ${
                                        cell.is_absent
                                          ? 'bg-gray-100 text-gray-400 border-gray-200'
                                          : cell.marks !== '' && Number(cell.marks) >= sub.pass_marks
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                          : cell.marks !== ''
                                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                                          : 'bg-white text-gray-800 border-gray-300'
                                      }`}
                                    />
                                    <label className="flex items-center gap-0.5 text-[10px] text-gray-500 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={cell.is_absent}
                                        onChange={(e) => {
                                          const checked = e.target.checked
                                          setMarksGrid((prev) => ({
                                            ...prev,
                                            [key]: {
                                              ...prev[key],
                                              is_absent: checked,
                                              marks: checked ? '0' : prev[key]?.marks || '',
                                            },
                                          }))
                                        }}
                                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-3 w-3"
                                      />
                                      AB
                                    </label>
                                  </div>
                                </td>
                              )
                            })}
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={() =>
                                  setReportCardTarget({
                                    isOpen: true,
                                    examId: activeMarksExam.id,
                                    studentId: st.student_id,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md border border-primary-200 transition"
                                title="View graphical report card"
                              >
                                <FileText className="w-3.5 h-3.5" /> Report Card
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Exam Analytics Modal */}
      {activeAnalyticsExam && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 rounded-xl">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Exam Performance Analytics — {activeAnalyticsExam.name}</h2>
                  <p className="text-xs text-white/70">
                    Comprehensive overview of pass percentages, grade distribution, and student leaderboard
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveAnalyticsExam(null)}
                className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Analytics Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {isLoadingAnalytics ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                </div>
              ) : !analytics ? (
                <div className="text-center py-12 text-gray-500">
                  <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold">Analytics unavailable</p>
                  <p className="text-xs text-gray-400 mt-1">Please enter marks before viewing performance metrics.</p>
                </div>
              ) : (
                <>
                  {/* Top Level Metric KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-xs font-semibold text-gray-500 uppercase block">Candidates</span>
                      <div className="text-2xl font-black text-gray-900 mt-1">
                        {analytics.appeared_candidates}{' '}
                        <span className="text-xs font-normal text-gray-400">/ {analytics.total_candidates} appeared</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-xs font-semibold text-emerald-700 uppercase block">Pass Percentage</span>
                      <div className="text-2xl font-black text-emerald-800 mt-1">
                        {analytics.pass_percentage}%
                      </div>
                      <span className="text-[11px] text-emerald-600 font-medium">
                        {analytics.pass_count} passed • {analytics.fail_count} failed
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
                      <span className="text-xs font-semibold text-indigo-700 uppercase block">Class Average</span>
                      <div className="text-2xl font-black text-indigo-800 mt-1">
                        {analytics.class_average}%
                      </div>
                      <span className="text-[11px] text-indigo-600 font-medium">Aggregate mean</span>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                      <span className="text-xs font-semibold text-amber-700 uppercase block">Highest Score</span>
                      <div className="text-2xl font-black text-amber-800 mt-1">
                        {analytics.highest_score}%
                      </div>
                      <span className="text-[11px] text-amber-600 font-medium">
                        Lowest: {analytics.lowest_score}%
                      </span>
                    </div>
                  </div>

                  {/* Grade Distribution Bar Chart */}
                  <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-purple-600" /> Grade Distribution Breakdown
                    </h3>
                    <div className="grid grid-cols-6 gap-2">
                      {['A+', 'A', 'B', 'C', 'D', 'F'].map((grade) => {
                        const count = analytics.grade_distribution?.[grade] || 0
                        const pct = analytics.appeared_candidates
                          ? Math.round((count / analytics.appeared_candidates) * 100)
                          : 0
                        return (
                          <div key={grade} className="text-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-xs font-black text-gray-700 block">{grade}</span>
                            <div className="text-lg font-bold text-gray-900 my-1">{count}</div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${
                                  grade === 'F' ? 'bg-rose-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1 block">{pct}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Subject Analytics Cards */}
                  {analytics.subject_analytics && analytics.subject_analytics.length > 0 && (
                    <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" /> Subject-Wise Performance
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {analytics.subject_analytics.map((sub) => (
                          <div key={sub.subject_id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                            <div className="font-bold text-gray-800 text-sm mb-1">{sub.subject_name}</div>
                            <div className="text-gray-500 flex justify-between">
                              <span>Average Marks:</span>
                              <strong className="text-gray-900">{sub.average_marks}</strong>
                            </div>
                            <div className="text-gray-500 flex justify-between mt-0.5">
                              <span>Top Mark:</span>
                              <strong className="text-emerald-700">{sub.highest_marks}</strong>
                            </div>
                            <div className="text-gray-500 flex justify-between mt-0.5">
                              <span>Lowest Mark:</span>
                              <strong className="text-rose-700">{sub.lowest_marks}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top 5 Leaderboard */}
                  {analytics.leaderboard && analytics.leaderboard.length > 0 && (
                    <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-500" /> Student Merit Leaderboard (Top Performers)
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-200 text-gray-500 uppercase text-[10px] text-left">
                              <th className="py-2 px-3 font-semibold w-14">Rank</th>
                              <th className="py-2 px-3 font-semibold">Student Name</th>
                              <th className="py-2 px-3 font-semibold text-center">Score</th>
                              <th className="py-2 px-3 font-semibold text-center">Percentage</th>
                              <th className="py-2 px-3 font-semibold text-center">Grade</th>
                              <th className="py-2 px-3 font-semibold text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {analytics.leaderboard.map((lead) => (
                              <tr key={lead.student_id} className="hover:bg-slate-50/60">
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs ${
                                      lead.rank === 1
                                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                        : lead.rank === 2
                                        ? 'bg-slate-200 text-slate-700 border border-slate-300'
                                        : lead.rank === 3
                                        ? 'bg-orange-100 text-orange-800 border border-orange-300'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    #{lead.rank}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="font-bold text-gray-900 block">{lead.name}</span>
                                  <span className="text-[10px] text-gray-400">{lead.admission_number}</span>
                                </td>
                                <td className="py-2.5 px-3 text-center font-semibold text-gray-800">
                                  {lead.total_obtained} / {lead.total_max}
                                </td>
                                <td className="py-2.5 px-3 text-center font-bold text-primary-700">
                                  {lead.percentage}%
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    {lead.grade}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    onClick={() =>
                                      setReportCardTarget({
                                        isOpen: true,
                                        examId: activeAnalyticsExam.id,
                                        studentId: lead.student_id,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded border border-primary-200"
                                  >
                                    <FileText className="w-3.5 h-3.5" /> View Report
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Official Student Report Card Modal */}
      <ReportCardModal
        isOpen={reportCardTarget.isOpen}
        onClose={() => setReportCardTarget({ isOpen: false })}
        examId={reportCardTarget.examId}
        studentId={reportCardTarget.studentId}
      />
    </div>
  )
}
