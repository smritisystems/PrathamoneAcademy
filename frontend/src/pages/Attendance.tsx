/**
 * @file        Attendance.tsx
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
 * @description Attendance management page for daily batch roll call, attendance registers, and absenteeism tracking.
 */

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { standardsApi, divisionsApi, studentsApi, attendanceApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

interface StudentAttendanceRow {
  student_id: number
  enrollment_id: number
  admission_number: string
  name: string
  status: 'present' | 'absent' | 'late' | 'half_day'
  remarks: string
}

export default function Attendance() {
  const { selectedInstitutionId, selectedAcademicYearId } = useAuthStore()
  const [selectedStandardId, setSelectedStandardId] = useState<number | ''>('')
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | ''>('')
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [rows, setRows] = useState<StudentAttendanceRow[]>([])

  // Standards
  const { data: standards = [] } = useQuery({
    queryKey: ['standards', selectedInstitutionId],
    queryFn: async () => {
      const res = await standardsApi.list(selectedInstitutionId || undefined)
      return res.data
    },
    enabled: !!selectedInstitutionId,
  })

  // Divisions for selected Standard
  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions', selectedStandardId],
    queryFn: async () => {
      if (!selectedStandardId) return []
      const res = await divisionsApi.list(selectedStandardId)
      return res.data
    },
    enabled: !!selectedStandardId,
  })

  // Students in selected standard/division
  const { data: studentsData, isLoading: loadingStudents } = useQuery({
    queryKey: [
      'students-attendance',
      selectedStandardId,
      selectedDivisionId,
      selectedAcademicYearId,
    ],
    queryFn: async () => {
      if (!selectedStandardId) return null
      const res = await studentsApi.list({
        standard_id: selectedStandardId,
        division_id: selectedDivisionId || undefined,
        academic_year_id: selectedAcademicYearId || undefined,
        page_size: 100,
      })
      return res.data
    },
    enabled: !!selectedStandardId,
  })

  useEffect(() => {
    if (studentsData?.data) {
      setRows(
        studentsData.data.map((s) => {
          const enrollment = s.enrollments?.[0]
          return {
            student_id: s.id,
            enrollment_id: enrollment?.id || s.id,
            admission_number: s.admission_number,
            name: `${s.first_name} ${s.last_name}`,
            status: 'present',
            remarks: '',
          }
        })
      )
    } else {
      setRows([])
    }
  }, [studentsData])

  const markMutation = useMutation({
    mutationFn: (data: {
      date: string
      entries: { student_id: number; enrollment_id: number; status: string; remarks?: string }[]
    }) => attendanceApi.markBulk(data),
    onSuccess: () => {
      toast.success('Attendance recorded and notifications queued')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to submit attendance')
    },
  })

  const setAllStatus = (status: 'present' | 'absent') => {
    setRows((prev) => prev.map((r) => ({ ...r, status })))
  }

  const updateRowStatus = (studentId: number, status: 'present' | 'absent' | 'late' | 'half_day') => {
    setRows((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, status } : r))
    )
  }

  const updateRowRemarks = (studentId: number, remarks: string) => {
    setRows((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, remarks } : r))
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (rows.length === 0) {
      toast.error('No students loaded to mark attendance')
      return
    }
    markMutation.mutate({
      date: attendanceDate,
      entries: rows.map((r) => ({
        student_id: r.student_id,
        enrollment_id: r.enrollment_id,
        status: r.status,
        remarks: r.remarks || undefined,
      })),
    })
  }

  const presentCount = rows.filter((r) => r.status === 'present').length
  const absentCount = rows.filter((r) => r.status === 'absent').length
  const lateCount = rows.filter((r) => r.status === 'late').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
        <p className="text-sm text-gray-500">
          Daily class attendance register, bulk marking, and attendance logs
        </p>
      </div>

      {/* Filter Selector Card */}
      <div className="card grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Standard *</label>
          <select
            value={selectedStandardId}
            onChange={(e) => {
              setSelectedStandardId(e.target.value ? Number(e.target.value) : '')
              setSelectedDivisionId('')
            }}
            className="input"
          >
            <option value="">Select Standard...</option>
            {standards.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
          <select
            value={selectedDivisionId}
            onChange={(e) => setSelectedDivisionId(e.target.value ? Number(e.target.value) : '')}
            className="input"
            disabled={!selectedStandardId}
          >
            <option value="">All Batches</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Attendance Date *</label>
          <input
            type="date"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            className="input"
          />
        </div>
      </div>

      {/* Attendance Stats & Quick Actions */}
      {rows.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-semibold text-gray-700">Total: {rows.length}</span>
            <span className="text-green-600 font-semibold">Present: {presentCount}</span>
            <span className="text-red-600 font-semibold">Absent: {absentCount}</span>
            <span className="text-yellow-600 font-semibold">Late: {lateCount}</span>
            <span className="text-blue-600 font-semibold">
              Attendance:{' '}
              {rows.length > 0 ? Math.round((presentCount / rows.length) * 100) : 0}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAllStatus('present')}
              className="text-xs bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 font-medium py-1.5 px-3 rounded-lg"
            >
              ✓ All Present
            </button>
            <button
              type="button"
              onClick={() => setAllStatus('absent')}
              className="text-xs bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-medium py-1.5 px-3 rounded-lg"
            >
              ✕ All Absent
            </button>
          </div>
        </div>
      )}

      {/* Roster Table */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card overflow-x-auto">
          {!selectedStandardId ? (
            <div className="text-center py-12 text-gray-400">
              <p>Please select a Standard above to load student roster.</p>
            </div>
          ) : loadingStudents ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
              <p className="text-sm text-gray-500 mt-2">Loading students roster...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No students enrolled in this standard/batch.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b">
                  <th className="px-4 py-3 font-semibold">Admission #</th>
                  <th className="px-4 py-3 font-semibold">Student Name</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.student_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-600 font-medium">
                      {r.admission_number}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1">
                        {(['present', 'absent', 'late', 'half_day'] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => updateRowStatus(r.student_id, s)}
                            className={`px-2.5 py-1 text-xs rounded-md font-semibold capitalize transition-all ${
                              r.status === s
                                ? s === 'present'
                                  ? 'bg-green-600 text-white shadow-sm'
                                  : s === 'absent'
                                  ? 'bg-red-600 text-white shadow-sm'
                                  : s === 'late'
                                  ? 'bg-yellow-500 text-white shadow-sm'
                                  : 'bg-purple-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {s.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={r.remarks}
                        onChange={(e) => updateRowRemarks(r.student_id, e.target.value)}
                        placeholder="Optional remarks"
                        className="input text-xs py-1 h-8"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {rows.length > 0 && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={markMutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {markMutation.isPending ? 'Saving Attendance...' : '💾 Save Attendance Register'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

