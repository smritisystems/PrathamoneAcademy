/**
 * @file        StudentReactivateModal.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components
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
 * @description Modal dialog for reactivating an inactive or withdrawn student into an academic year and batch.
 */

import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { UserCheck, Loader2 } from 'lucide-react'
import Modal from './Modal'
import { studentsApi, standardsApi, divisionsApi, academicYearsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import type { StudentReactivatePayload } from '../types'

export interface StudentReactivateModalProps {
  isOpen: boolean
  onClose: () => void
  student: {
    id: number
    admission_number?: string
    first_name?: string
    last_name?: string
    full_name?: string
  } | null
  onSuccess: () => void
}

export default function StudentReactivateModal({
  isOpen,
  onClose,
  student,
  onSuccess,
}: StudentReactivateModalProps) {
  const { selectedInstitutionId, selectedAcademicYearId } = useAuthStore()

  const [academicYearId, setAcademicYearId] = useState<number | undefined>(selectedAcademicYearId ?? undefined)
  const [standardId, setStandardId] = useState<number | undefined>()
  const [divisionId, setDivisionId] = useState<number | undefined>()
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().split('T')[0])
  const [rollNumber, setRollNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (selectedAcademicYearId) {
      setAcademicYearId(selectedAcademicYearId)
    }
  }, [selectedAcademicYearId, isOpen])

  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years', selectedInstitutionId],
    queryFn: () => academicYearsApi.list(selectedInstitutionId ?? undefined).then((r) => r.data),
    enabled: isOpen,
  })

  const { data: standards = [] } = useQuery({
    queryKey: ['standards', selectedInstitutionId],
    queryFn: () => standardsApi.list(selectedInstitutionId ?? undefined).then((r) => r.data),
    enabled: isOpen,
  })

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions', standardId],
    queryFn: () =>
      standardId ? divisionsApi.list(standardId).then((r) => r.data) : Promise.resolve([]),
    enabled: isOpen && !!standardId,
  })

  if (!student) return null

  const studentName = student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!academicYearId) {
      setErrorMsg('Please select an academic year.')
      return
    }

    if (!standardId) {
      setErrorMsg('Please select a target standard.')
      return
    }

    if (!effectiveDate) {
      setErrorMsg('Effective reactivation date is required.')
      return
    }

    const payload: StudentReactivatePayload = {
      academic_year_id: academicYearId,
      standard_id: standardId,
      division_id: divisionId || undefined,
      effective_date: effectiveDate,
      roll_number: rollNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    }

    try {
      setSubmitting(true)
      await studentsApi.reactivate(student.id, payload)
      onSuccess()
      onClose()
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to reactivate student.'
      setErrorMsg(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Reactivate Student" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info Banner */}
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5">
          <UserCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 leading-relaxed">
            <span className="font-semibold">Reactivating: </span>
            {studentName} ({student.admission_number}).
            This will mark the student master record as <span className="font-semibold">Active</span> and
            create an active enrollment record for the chosen academic year and batch.
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Academic Year <span className="text-red-500">*</span>
            </label>
            <select
              value={academicYearId ?? ''}
              onChange={(e) => setAcademicYearId(e.target.value ? Number(e.target.value) : undefined)}
              className="input w-full text-sm"
              required
            >
              <option value="">Select Academic Year</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.is_current ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Effective Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="input w-full text-sm"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Standard / Class <span className="text-red-500">*</span>
            </label>
            <select
              value={standardId ?? ''}
              onChange={(e) => {
                setStandardId(e.target.value ? Number(e.target.value) : undefined)
                setDivisionId(undefined)
              }}
              className="input w-full text-sm"
              required
            >
              <option value="">Select Standard</option>
              {standards.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Division / Batch
            </label>
            <select
              value={divisionId ?? ''}
              onChange={(e) => setDivisionId(e.target.value ? Number(e.target.value) : undefined)}
              className="input w-full text-sm"
              disabled={!standardId}
            >
              <option value="">Select Batch (Optional)</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} (Capacity: {d.capacity})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Roll Number (Optional)
            </label>
            <input
              type="text"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              className="input w-full text-sm font-mono"
              placeholder="e.g. 10-05"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Reactivation Notes / Justification
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input w-full text-sm"
              placeholder="e.g. Re-joined for exam prep / Returned from leave"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {submitting ? 'Reactivating...' : 'Confirm Reactivation'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

