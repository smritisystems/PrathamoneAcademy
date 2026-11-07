/**
 * @file        Subjects.tsx
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
 * @description Subjects directory page managing academic curriculum subjects by board and class.
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus, BookOpen, Check, X, Lock } from 'lucide-react'
import { standardsApi, subjectsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { EditModeBar } from '../components/common'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'

export default function SubjectsPage() {
  const { selectedInstitutionId } = useAuthStore()
  const qc = useQueryClient()
  const [selectedStandardId, setSelectedStandardId] = useState<string>('')
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [subjectForm, setSubjectForm] = useState({
    standard_id: '',
    name: '',
    code: '',
    max_marks: '100',
    pass_marks: '35',
    is_optional: false,
  })

  // Fetch standards
  const { data: standards = [] } = useQuery({
    queryKey: ['standards', selectedInstitutionId],
    queryFn: () => standardsApi.list(selectedInstitutionId ?? undefined).then((r) => r.data),
  })

  const currentStandardId = selectedStandardId || (standards[0]?.id ? String(standards[0].id) : '')

  // Fetch subjects for selected standard
  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['subjects', currentStandardId],
    queryFn: () =>
      currentStandardId
        ? subjectsApi.list({ standard_id: currentStandardId }).then((r) => r.data)
        : Promise.resolve([]),
    enabled: !!currentStandardId,
  })

  const subjectMutation = useMutation({
    mutationFn: (data: {
      standard_id: number
      name: string
      code?: string
      max_marks?: number
      pass_marks?: number
      is_optional?: boolean
    }) => subjectsApi.create(data),
    onSuccess: () => {
      toast.success('Subject added successfully')
      qc.invalidateQueries({ queryKey: ['subjects', currentStandardId] })
      setShowSubjectModal(false)
      setSubjectForm({
        standard_id: '',
        name: '',
        code: '',
        max_marks: '100',
        pass_marks: '35',
        is_optional: false,
      })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to add subject'),
  })

  const selectedStdObj = standards.find((s) => String(s.id) === currentStandardId)
  const editScope = 'academic:subjects'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])

  return (
    <div className="space-y-6">
      {/* Global View-First & Explicit Edit Mode Governance Bar */}
      <EditModeBar scope={editScope} title="Academic Subjects Master" isDirty={showSubjectModal} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Curriculum Subjects</h1>
          <p className="text-sm text-gray-500">
            Define subjects, maximum marks, passing standards, and optional courses
          </p>
        </div>
        {isEditMode ? (
          <button
            onClick={() => {
              setSubjectForm((f) => ({ ...f, standard_id: currentStandardId }))
              setShowSubjectModal(true)
            }}
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Subject
          </button>
        ) : (
          <button
            type="button"
            onClick={() => toast.error('Locked in View Mode: Please enable Edit Mode above to create new subjects.')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
            title="Locked in View Mode: Enable Edit Mode above to add new subjects"
          >
            <Lock className="w-4 h-4 text-slate-400" />
            <span>Add Subject (Locked)</span>
          </button>
        )}
      </div>

      {/* Standard Selector Tabs */}
      <div className="card p-3">
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          SELECT STANDARD / LEVEL:
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

      {/* Subjects Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {selectedStdObj?.name ? `${selectedStdObj.name} — Subjects` : 'Subjects'}
            </h2>
            <p className="text-xs text-gray-500">
              Total {subjects.length} subject{subjects.length === 1 ? '' : 's'} configured
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" />
          </div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-medium">No subjects configured for this standard yet</p>
            <p className="text-xs mt-1">Click "+ Add Subject" to create subjects for this syllabus.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 text-left">
                  <th className="pb-3 font-medium">Subject Name</th>
                  <th className="pb-3 font-medium">Subject Code</th>
                  <th className="pb-3 font-medium text-center">Max Marks</th>
                  <th className="pb-3 font-medium text-center">Pass Marks</th>
                  <th className="pb-3 font-medium text-center">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {subjects.map((sub: any) => (
                  <tr key={sub.id} className="hover:bg-gray-50/50">
                    <td className="py-3 font-medium text-gray-800 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary-600" />
                      {sub.name}
                    </td>
                    <td className="py-3 font-mono text-xs text-gray-500">
                      {sub.code || '—'}
                    </td>
                    <td className="py-3 text-center text-gray-700 font-semibold">
                      {sub.max_marks || 100}
                    </td>
                    <td className="py-3 text-center text-gray-700">
                      {sub.pass_marks || 35}
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          sub.is_optional
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {sub.is_optional ? 'Elective / Optional' : 'Compulsory'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Subject Modal */}
      <Modal isOpen={showSubjectModal} onClose={() => setShowSubjectModal(false)} title="Add Syllabus Subject">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Standard / Level *</label>
            <select
              className="input w-full"
              value={subjectForm.standard_id}
              onChange={(e) => setSubjectForm({ ...subjectForm, standard_id: e.target.value })}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name *</label>
            <input
              className="input w-full"
              value={subjectForm.name}
              onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
              placeholder="e.g. Mathematics, Physics, Chemistry, English"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code</label>
            <input
              className="input w-full"
              value={subjectForm.code}
              onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
              placeholder="e.g. MATH101, PHY-12"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Marks</label>
              <input
                type="number"
                className="input w-full"
                value={subjectForm.max_marks}
                onChange={(e) => setSubjectForm({ ...subjectForm, max_marks: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passing Marks</label>
              <input
                type="number"
                className="input w-full"
                value={subjectForm.pass_marks}
                onChange={(e) => setSubjectForm({ ...subjectForm, pass_marks: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_optional"
              checked={subjectForm.is_optional}
              onChange={(e) => setSubjectForm({ ...subjectForm, is_optional: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="is_optional" className="text-sm text-gray-700">
              Optional / Elective subject
            </label>
          </div>
          <div className="flex gap-3 justify-end pt-3">
            <button onClick={() => setShowSubjectModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={() =>
                subjectMutation.mutate({
                  standard_id: Number(subjectForm.standard_id),
                  name: subjectForm.name,
                  code: subjectForm.code,
                  max_marks: Number(subjectForm.max_marks) || 100,
                  pass_marks: Number(subjectForm.pass_marks) || 35,
                  is_optional: subjectForm.is_optional,
                })
              }
              disabled={subjectMutation.isPending || !subjectForm.standard_id || !subjectForm.name}
              className="btn-primary"
            >
              {subjectMutation.isPending ? 'Saving…' : 'Add Subject'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

