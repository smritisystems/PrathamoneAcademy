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
 * @updated     2026-11-04
 *
 * @description Examinations and test series workspace managing exam schedules, marks entry, and student reports.
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Award, Plus, Calendar, CheckCircle, FileSpreadsheet } from 'lucide-react'
import { standardsApi, academicYearsApi, examinationsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'

export default function ExaminationsPage() {
  const { selectedInstitutionId, selectedAcademicYearId } = useAuthStore()
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

  const selectedStdObj = standards.find((s) => String(s.id) === currentStandardId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Examinations & Test Series</h1>
          <p className="text-sm text-gray-500">
            Schedule test series, mock exams, unit assessments, and publish marks
          </p>
        </div>
        <button
          onClick={() => {
            setExamForm((f) => ({
              ...f,
              academic_year_id: selectedAcademicYearId ? String(selectedAcademicYearId) : '',
              standard_id: currentStandardId,
            }))
            setShowExamModal(true)
          }}
          className="btn-primary flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Schedule Examination
        </button>
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
                  ? 'bg-primary-700 text-white shadow-sm'
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
                  <th className="pb-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {exams.map((ex: any) => (
                  <tr key={ex.id} className="hover:bg-gray-50/50">
                    <td className="py-3 font-medium text-gray-800 flex items-center gap-2">
                      <Award className="w-4 h-4 text-purple-600" />
                      {ex.name}
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
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3 text-green-600" /> Scheduled
                      </span>
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
    </div>
  )
}

