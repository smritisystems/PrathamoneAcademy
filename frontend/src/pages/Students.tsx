/**
 * @file        Students.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pages
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.1.0
 * @created     2026-11-03
 * @updated     2026-11-07
 *
 * @description Student directory page with multi-field search, status filtering, lifecycle exit/reactivation, and fast profile navigation.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Search, Plus, Eye, CreditCard, GraduationCap, Printer,
  UserMinus, UserCheck, Lock,
} from 'lucide-react'
import { studentsApi, standardsApi, divisionsApi, settingsApi } from '../api/endpoints'
import { useAuthStore, isUserAdmin } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { EditModeBar } from '../components/common'
import Pagination from '../components/Pagination'
import StudentExitModal from '../components/StudentExitModal'
import StudentReactivateModal from '../components/StudentReactivateModal'
import type { Student } from '../types'
import toast from 'react-hot-toast'

export default function StudentsPage() {
  const queryClient = useQueryClient()
  const { selectedInstitutionId, selectedAcademicYearId, user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [standardId, setStandardId] = useState<number | undefined>()
  const [divisionId, setDivisionId] = useState<number | undefined>()
  const [userToggledInactive, setUserToggledInactive] = useState(false)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'withdrawn' | 'completed' | 'graduated' | 'inactive'>('all')

  // Load institute-level configuration settings
  const { data: allSettings } = useQuery({
    queryKey: ['settings', 'all', selectedInstitutionId],
    queryFn: () => settingsApi.getAll().then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  })

  // Determine effective inactive inclusion from user toggle or institute settings default
  const effectiveIncludeInactive = userToggledInactive
    ? includeInactive
    : allSettings?.admission?.student_visibility_lists === 'include_all' || includeInactive
  const [page, setPage] = useState(1)

  // Lifecycle Modals
  const [exitTargetStudent, setExitTargetStudent] = useState<Student | null>(null)
  const [reactivateTargetStudent, setReactivateTargetStudent] = useState<Student | null>(null)

  const canManageLifecycle = isUserAdmin(user) || user?.role === 'staff'
  const editScope = 'students:master'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])

  const { data: standards = [] } = useQuery({
    queryKey: ['standards', selectedInstitutionId],
    queryFn: () => standardsApi.list(selectedInstitutionId ?? undefined).then((r) => r.data),
  })

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions', standardId],
    queryFn: () =>
      standardId ? divisionsApi.list(standardId).then((r) => r.data) : Promise.resolve([]),
    enabled: !!standardId,
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      'students',
      {
        search,
        standardId,
        divisionId,
        page,
        selectedAcademicYearId,
        selectedInstitutionId,
        effectiveIncludeInactive,
        statusFilter,
      },
    ],
    queryFn: () =>
      studentsApi
        .list({
          search: search || undefined,
          standard_id: standardId,
          division_id: divisionId,
          academic_year_id: selectedAcademicYearId ?? undefined,
          institution_id: selectedInstitutionId ?? undefined,
          include_inactive: effectiveIncludeInactive,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          page,
          page_size: 20,
        })
        .then((r) => r.data),
  })

  const students = data?.data ?? []
  const total = data?.total ?? 0

  const handleLifecycleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['students'] })
    refetch()
  }

  return (
    <div className="space-y-5">
      {/* Global View-First & Explicit Edit Mode Governance Bar */}
      <EditModeBar scope={editScope} title="Student Directory & Admissions Workspace" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500">{total} students found</p>
        </div>
        {isEditMode ? (
          <Link to="/students/add" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Student
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => toast.error('Locked in View Mode: Please enable Edit Mode above to register new admissions.')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
            title="Locked in View Mode: Enable Edit Mode above to register new student"
          >
            <Lock className="w-4 h-4 text-slate-400" />
            <span>Add Student (Locked)</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="input pl-9"
              placeholder="Search by name, admission no., phone…"
            />
          </div>
          <select
            value={standardId ?? ''}
            onChange={(e) => {
              setStandardId(e.target.value ? Number(e.target.value) : undefined)
              setDivisionId(undefined)
              setPage(1)
            }}
            className="input w-40"
          >
            <option value="">All Standards</option>
            {standards.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {standardId && divisions.length > 0 && (
            <select
              value={divisionId ?? ''}
              onChange={(e) => {
                setDivisionId(e.target.value ? Number(e.target.value) : undefined)
                setPage(1)
              }}
              className="input w-32"
            >
              <option value="">All Divisions</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  Division {d.name}
                </option>
              ))}
            </select>
          )}

          {/* Include Inactive Checkbox & Status Filter */}
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-700 select-none">
              <input
                type="checkbox"
                data-testid="include-inactive-checkbox"
                checked={effectiveIncludeInactive}
                onChange={(e) => {
                  setUserToggledInactive(true)
                  setIncludeInactive(e.target.checked)
                  if (!e.target.checked) setStatusFilter('all')
                  setPage(1)
                }}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
              />
              <span>Include Inactive Students</span>
              {allSettings?.admission?.student_visibility_lists === 'include_all' && !userToggledInactive && (
                <span className="text-[10px] text-blue-600 font-semibold">(Default: All)</span>
              )}
            </label>

            {effectiveIncludeInactive && (
              <select
                data-testid="student-status-filter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any)
                  setPage(1)
                }}
                className="input text-xs py-1.5 px-2 w-36 animate-fade-in"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
                <option value="withdrawn">Withdrawn Only</option>
                <option value="completed">Completed Only</option>
                <option value="graduated">Graduated Only</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">Admission No.</th>
                <th className="table-th">Name</th>
                <th className="table-th">Status</th>
                <th className="table-th">Gender</th>
                <th className="table-th">DOB</th>
                <th className="table-th">Phone</th>
                <th className="table-th">City</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="table-td text-center text-gray-400 py-10">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && students.length === 0 && (
                <tr>
                  <td colSpan={8} className="table-td text-center text-gray-400 py-10">
                    No students found
                  </td>
                </tr>
              )}
              {students.map((s) => (
                <tr
                  key={s.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    !s.is_active ? 'bg-gray-50/60 opacity-90' : ''
                  }`}
                >
                  <td className="table-td font-mono text-primary-700 font-medium">
                    {s.admission_number}
                  </td>
                  <td className="table-td font-medium">
                    {s.first_name} {s.last_name}
                  </td>
                  <td className="table-td">
                    {(() => {
                      if (s.is_active) {
                        return (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        )
                      }
                      const reason = (s.exit_reason || '').toLowerCase()
                      if (reason.includes('graduat')) {
                        return (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800"
                            title={`Graduated on ${s.exit_date || 'N/A'} - ${s.exit_reason || ''}`}
                          >
                            Graduated
                          </span>
                        )
                      }
                      if (reason.includes('complet')) {
                        return (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800"
                            title={`Completed on ${s.exit_date || 'N/A'} - ${s.exit_reason || ''}`}
                          >
                            Completed
                          </span>
                        )
                      }
                      if (reason.includes('transfer')) {
                        return (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"
                            title={`Transferred on ${s.exit_date || 'N/A'} - ${s.exit_reason || ''}`}
                          >
                            Transferred
                          </span>
                        )
                      }
                      if (s.exit_date) {
                        return (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800"
                            title={`Withdrawn on ${s.exit_date} - ${s.exit_reason || ''}`}
                          >
                            Withdrawn
                          </span>
                        )
                      }
                      return (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                          Inactive
                        </span>
                      )
                    })()}
                  </td>
                  <td className="table-td capitalize">{s.gender}</td>
                  <td className="table-td">{s.date_of_birth}</td>
                  <td className="table-td">{s.phone ?? '—'}</td>
                  <td className="table-td">{s.city ?? '—'}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/students/${s.id}`}
                        className="p-1.5 rounded hover:bg-primary-50 text-primary-600 transition"
                        title="View Full Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/forms?formId=student_kyc&recordId=${s.id}&mode=prefilled`}
                        className="p-1.5 rounded hover:bg-indigo-50 text-indigo-700 transition"
                        title="Print KYC / Admission Form"
                      >
                        <Printer className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/student/dashboard?student_id=${s.id}`}
                        className="p-1.5 rounded hover:bg-amber-50 text-amber-700 transition"
                        title="Student Portal View"
                      >
                        <GraduationCap className="w-4 h-4" />
                      </Link>
                      {s.is_active && (
                        <Link
                          to={`/fees/collect/${s.id}`}
                          className="p-1.5 rounded hover:bg-green-50 text-green-600 transition"
                          title="Collect Fee"
                        >
                          <CreditCard className="w-4 h-4" />
                        </Link>
                      )}

                      {/* Exit / Reactivation Actions */}
                      {canManageLifecycle && (
                        <>
                          {s.is_active ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (!isEditMode) {
                                  toast.error('Locked in View Mode: Please enable Edit Mode above before withdrawing students.')
                                  return
                                }
                                setExitTargetStudent(s)
                              }}
                              className={`p-1.5 rounded transition ${
                                isEditMode ? 'hover:bg-red-50 text-red-600' : 'text-slate-300 cursor-not-allowed'
                              }`}
                              title={isEditMode ? "Exit / Withdraw Student" : "Locked in View Mode: Enable Edit Mode to withdraw"}
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (!isEditMode) {
                                  toast.error('Locked in View Mode: Please enable Edit Mode above before reactivating students.')
                                  return
                                }
                                setReactivateTargetStudent(s)
                              }}
                              className={`p-1.5 rounded transition ${
                                isEditMode ? 'hover:bg-emerald-50 text-emerald-600' : 'text-slate-300 cursor-not-allowed'
                              }`}
                              title={isEditMode ? "Reactivate Student" : "Locked in View Mode: Enable Edit Mode to reactivate"}
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={20} total={total} onChange={setPage} />
      </div>

      {/* Exit Modal */}
      {exitTargetStudent && (
        <StudentExitModal
          isOpen={!!exitTargetStudent}
          onClose={() => setExitTargetStudent(null)}
          student={exitTargetStudent}
          onSuccess={handleLifecycleSuccess}
        />
      )}

      {/* Reactivate Modal */}
      {reactivateTargetStudent && (
        <StudentReactivateModal
          isOpen={!!reactivateTargetStudent}
          onClose={() => setReactivateTargetStudent(null)}
          student={reactivateTargetStudent}
          onSuccess={handleLifecycleSuccess}
        />
      )}
    </div>
  )
}
