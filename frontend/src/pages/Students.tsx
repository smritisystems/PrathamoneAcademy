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
 * @version     1.0.0
 * @created     2026-11-03
 * @updated     2026-11-04
 *
 * @description Student directory page with multi-field search, status filtering, and fast profile navigation.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, Eye, CreditCard, GraduationCap, Printer } from 'lucide-react'
import { studentsApi, standardsApi, divisionsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import Pagination from '../components/Pagination'

export default function StudentsPage() {
  const { selectedInstitutionId, selectedAcademicYearId } = useAuthStore()
  const [search, setSearch] = useState('')
  const [standardId, setStandardId] = useState<number | undefined>()
  const [divisionId, setDivisionId] = useState<number | undefined>()
  const [page, setPage] = useState(1)

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

  const { data, isLoading } = useQuery({
    queryKey: ['students', { search, standardId, divisionId, page, selectedAcademicYearId, selectedInstitutionId }],
    queryFn: () =>
      studentsApi
        .list({
          search: search || undefined,
          standard_id: standardId,
          division_id: divisionId,
          academic_year_id: selectedAcademicYearId ?? undefined,
          institution_id: selectedInstitutionId ?? undefined,
          page,
          page_size: 20,
        })
        .then((r) => r.data),
  })

  const students = data?.data ?? []
  const total = data?.total ?? 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500">{total} students found</p>
        </div>
        <Link to="/students/add" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Student
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
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
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {standardId && divisions.length > 0 && (
            <select
              value={divisionId ?? ''}
              onChange={(e) => { setDivisionId(e.target.value ? Number(e.target.value) : undefined); setPage(1) }}
              className="input w-32"
            >
              <option value="">All Divisions</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>Division {d.name}</option>
              ))}
            </select>
          )}
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
                  <td colSpan={7} className="table-td text-center text-gray-400 py-10">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && students.length === 0 && (
                <tr>
                  <td colSpan={7} className="table-td text-center text-gray-400 py-10">
                    No students found
                  </td>
                </tr>
              )}
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-td font-mono text-primary-700">{s.admission_number}</td>
                  <td className="table-td font-medium">{s.first_name} {s.last_name}</td>
                  <td className="table-td capitalize">{s.gender}</td>
                  <td className="table-td">{s.date_of_birth}</td>
                  <td className="table-td">{s.phone ?? '—'}</td>
                  <td className="table-td">{s.city ?? '—'}</td>
                  <td className="table-td">
                    <div className="flex gap-2">
                      <Link
                        to={`/students/${s.id}`}
                        className="p-1.5 rounded hover:bg-primary-50 text-primary-600"
                        title="View Full Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/forms?formId=student_kyc&recordId=${s.id}&mode=prefilled`}
                        className="p-1.5 rounded hover:bg-indigo-50 text-indigo-700"
                        title="Print KYC / Admission Form"
                      >
                        <Printer className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/student/dashboard?student_id=${s.id}`}
                        className="p-1.5 rounded hover:bg-amber-50 text-amber-700"
                        title="Student Portal View"
                      >
                        <GraduationCap className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/fees/collect/${s.id}`}
                        className="p-1.5 rounded hover:bg-green-50 text-green-600"
                        title="Collect Fee"
                      >
                        <CreditCard className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={20} total={total} onChange={setPage} />
      </div>
    </div>
  )
}

