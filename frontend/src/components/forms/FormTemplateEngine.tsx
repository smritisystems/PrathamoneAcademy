/**
 * @file        FormTemplateEngine.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.forms
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-04
 * @updated     2026-11-05
 *
 * @description Standardized A4 print and preview template engine with DPDP Act 2023 compliance, Aadhaar masking, and signatures.
 */

import React from 'react'
import { ShieldCheck, CheckSquare, Square, Building2, AlertCircle, FileText } from 'lucide-react'
import type { RenderedFormPayload } from '../../types/forms'

interface Props {
  form: RenderedFormPayload
  showPageBreak?: boolean
  pageNumber?: number
  totalPages?: number
}

export default function FormTemplateEngine({
  form,
  showPageBreak = false,
  pageNumber = 1,
  totalPages = 1,
}: Props) {
  const { data, institution, active_sections = [] } = form
  const isBlank = form.mode === 'blank' || data.is_blank === true

  const isSectionActive = (key: string) => active_sections.includes(key)

  // Blank line helper
  const renderValue = (val: any, fallbackDotted = true) => {
    if (isBlank || val === undefined || val === null || val === '') {
      return fallbackDotted ? (
        <span className="inline-block border-b border-dotted border-slate-400 min-w-[120px] text-transparent select-none">
          ........................................
        </span>
      ) : (
        <span className="text-slate-400 italic">N/A</span>
      )
    }
    return <span className="font-semibold text-slate-900">{val}</span>
  }

  return (
    <div
      className={`print-form-sheet bg-white text-slate-900 p-8 sm:p-10 md:p-12 border border-slate-200 shadow-sm mx-auto max-w-[850px] min-h-[1120px] flex flex-col justify-between print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full ${
        showPageBreak ? 'page-break-after print:break-after-page' : ''
      }`}
      style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
    >
      {/* ── Top Section ── */}
      <div>
        {/* Institutional Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg bg-indigo-900 text-white flex items-center justify-center font-bold text-2xl tracking-wider shadow-sm print:border print:border-slate-800">
                PA
              </div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-wide text-slate-950 font-serif leading-none">
                  {institution.name}
                </h1>
                <p className="text-[11px] font-semibold tracking-wider uppercase text-indigo-800 mt-1">
                  {institution.tagline}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">
                  {institution.address} &bull; Ph: {institution.phone} &bull; Email: {institution.email}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block border border-slate-900 px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase bg-slate-50">
                INST. CODE: {institution.code}
              </span>
              <p className="text-[9px] text-slate-500 font-mono mt-1">
                A4 DOC REF: {form.code}
              </p>
            </div>
          </div>
        </div>

        {/* Title Banner & Document Control Bar */}
        <div className="mb-4">
          <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between rounded-t print:rounded-none">
            <h2 className="text-sm font-bold uppercase tracking-wider font-serif">
              {form.title}
            </h2>
            <span className="text-[10px] font-mono font-semibold bg-indigo-700 text-white px-2 py-0.5 rounded print:border print:border-white">
              {form.code} &bull; {form.version}
            </span>
          </div>
          <div className="bg-slate-100 border-x border-b border-slate-300 px-3 py-1.5 flex flex-wrap items-center justify-between text-[10px] text-slate-700 font-mono">
            <div>
              <span className="font-semibold text-slate-900">Control Ref: </span>
              {form.document_ref}
            </div>
            <div>
              <span className="font-semibold text-slate-900">Printed: </span>
              {form.generated_at}
            </div>
            <div>
              <span className="font-semibold text-slate-900">Mode: </span>
              <span
                className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                  isBlank ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                }`}
              >
                {isBlank ? 'Blank Form (Manual Fill)' : 'Prefilled Record'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Dynamic Form Body ── */}

        {/* Photo Box & Core Identification */}
        {(form.entity === 'student' || form.category === 'KYC' || form.form_id === 'student_admission') && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs border border-slate-200 p-3 rounded bg-slate-50/50">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-medium">Candidate / Full Name</span>
                  <div className="text-sm font-bold text-slate-950">
                    {renderValue(data.full_name)}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-medium">Admission / Roll No</span>
                  <div className="text-sm font-bold font-mono text-slate-950">
                    {renderValue(data.admission_number)}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-medium">Date of Birth / Age</span>
                  <div>
                    {renderValue(data.date_of_birth ? `${data.date_of_birth} (${data.age || 16} Yrs)` : '')}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-medium">Gender & Blood Group</span>
                  <div>
                    {renderValue(data.gender ? `${data.gender} / ${data.blood_group || 'O+'}` : '')}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-medium">Nationality & Religion</span>
                  <div>
                    {renderValue(data.nationality ? `${data.nationality} / ${data.religion || 'General'}` : '')}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 inline" /> Aadhaar No (DPDP Masked)
                  </span>
                  <div className="font-mono text-xs font-bold text-slate-800">
                    {renderValue(data.aadhar_masked)}
                  </div>
                </div>
              </div>
            </div>

            {/* Passport Photo Cross Box */}
            <div className="md:col-span-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 p-2 text-center bg-slate-50 rounded min-h-[125px]">
              <span className="text-[9px] font-bold text-slate-500 uppercase leading-snug">
                Affix Recent Passport Size Color Photo
              </span>
              <span className="text-[8px] text-slate-400 mt-1 block">
                (Sign across photograph)
              </span>
            </div>
          </div>
        )}

        {/* Contact & Address Grid */}
        {(data.address || isBlank) && isSectionActive('personal') && (
          <div className="mb-4 border border-slate-200 rounded p-3 text-xs bg-white">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
              Communication & Residential Particulars
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <span className="text-[10px] text-slate-500 uppercase block font-medium">Residential Address</span>
                <div>{renderValue(data.address)}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-medium">City, State & Pincode</span>
                <div>{renderValue(data.city ? `${data.city}, ${data.state} - ${data.pincode}` : '')}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-medium">Student Mobile Number</span>
                <div>{renderValue(data.phone)}</div>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] text-slate-500 uppercase block font-medium">Email Address</span>
                <div>{renderValue(data.email)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Academic Program & Batch Enrollment */}
        {data.academic && isSectionActive('academic') && (
          <div className="mb-4 border border-slate-200 rounded p-3 text-xs bg-slate-50/50">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
              Academic Program & Batch Enrollment
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-medium">Academic Session</span>
                <div className="font-semibold">{renderValue(data.academic.academic_year)}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-medium">Board & Curriculum</span>
                <div className="font-semibold">{renderValue(data.academic.board)}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-medium">Class / Standard</span>
                <div className="font-semibold">{renderValue(data.academic.standard)}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-medium">Batch Assigned</span>
                <div className="font-semibold">{renderValue(data.academic.batch)}</div>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] text-slate-500 uppercase block font-medium">Schedule & Timings</span>
                <div>{renderValue(data.academic.timing)}</div>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] text-slate-500 uppercase block font-medium">Assigned Coordinator</span>
                <div>{renderValue(data.academic.batch_coordinator)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Parent / Guardian Particulars */}
        {data.guardians && isSectionActive('guardians') && (
          <div className="mb-4 border border-slate-200 rounded p-3 text-xs bg-white">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
              Parent & Guardian Particulars (DPDP Section 9 Lawful Consent)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Primary Guardian */}
              <div className="border border-slate-100 p-2 rounded bg-slate-50/50 space-y-1">
                <div className="text-[10px] font-bold uppercase text-indigo-900 border-b pb-0.5">
                  Primary Guardian ({data.guardians.primary?.relation || 'Father'})
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block">Full Name</span>
                  <div>{renderValue(data.guardians.primary?.name)}</div>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block">Occupation</span>
                    <div>{renderValue(data.guardians.primary?.occupation)}</div>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block">Annual Income</span>
                    <div>{renderValue(data.guardians.primary?.annual_income)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block">Mobile Phone</span>
                    <div>{renderValue(data.guardians.primary?.phone)}</div>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block">Aadhaar (Masked)</span>
                    <div className="font-mono text-[10px]">{renderValue(data.guardians.primary?.aadhar_masked)}</div>
                  </div>
                </div>
              </div>

              {/* Secondary Guardian */}
              <div className="border border-slate-100 p-2 rounded bg-slate-50/50 space-y-1">
                <div className="text-[10px] font-bold uppercase text-indigo-900 border-b pb-0.5">
                  Secondary Guardian ({data.guardians.secondary?.relation || 'Mother'})
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block">Full Name</span>
                  <div>{renderValue(data.guardians.secondary?.name)}</div>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block">Occupation</span>
                  <div>{renderValue(data.guardians.secondary?.occupation)}</div>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block">Mobile Phone</span>
                    <div>{renderValue(data.guardians.secondary?.phone)}</div>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block">Aadhaar (Masked)</span>
                    <div className="font-mono text-[10px]">{renderValue(data.guardians.secondary?.aadhar_masked)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Contacts & Medical Alerts */}
        {data.emergency && (form.form_id === 'emergency_contact' || form.form_id === 'student_kyc') && (
          <div className="mb-4 border border-rose-200 bg-rose-50/20 rounded p-3 text-xs">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-rose-950 border-b border-rose-200 pb-1 mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Emergency Medical & Kin Notification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">Emergency Contact 1</span>
                <div>{renderValue(data.emergency.primary_contact_person)} ({data.emergency.relationship || 'Parent'})</div>
                <div className="font-mono text-[11px]">{renderValue(data.emergency.primary_phone)}</div>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">Emergency Contact 2</span>
                <div>{renderValue(data.emergency.secondary_contact_person)}</div>
                <div className="font-mono text-[11px]">{renderValue(data.emergency.secondary_phone)}</div>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">Preferred Hospital</span>
                <div>{renderValue(data.emergency.preferred_hospital)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Staff Profile / HR Section */}
        {form.entity === 'staff' && (
          <div className="mb-4 border border-slate-200 rounded p-3 text-xs bg-white space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
              Staff Employment & Deployment Record
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">Staff / Employee Code</span>
                <div className="font-mono font-bold">{renderValue(data.staff_code)}</div>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">Designation</span>
                <div className="font-semibold">{renderValue(data.designation)}</div>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">Department</span>
                <div>{renderValue(data.department)}</div>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">Date of Joining</span>
                <div>{renderValue(data.admission_date || '01-06-2023')}</div>
              </div>
            </div>

            {/* Qualifications */}
            {data.qualifications && data.qualifications.length > 0 && (
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-700 block mb-1">
                  Educational & Professional Qualifications
                </span>
                <table className="w-full border-collapse border border-slate-200 text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800">
                      <th className="border border-slate-300 p-1 text-left">Degree / Diploma</th>
                      <th className="border border-slate-300 p-1 text-left">University / Board</th>
                      <th className="border border-slate-300 p-1 text-center">Year</th>
                      <th className="border border-slate-300 p-1 text-left">Specialization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.qualifications.map((q, idx) => (
                      <tr key={idx}>
                        <td className="border border-slate-300 p-1 font-semibold">{q.degree}</td>
                        <td className="border border-slate-300 p-1">{q.university}</td>
                        <td className="border border-slate-300 p-1 text-center">{q.year}</td>
                        <td className="border border-slate-300 p-1">{q.specialization}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* User Account & RBAC Permissions Matrix */}
        {form.entity === 'user' && (
          <div className="mb-4 border border-slate-200 rounded p-3 text-xs bg-white space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
              System Access Control & RBAC Matrix
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">Username</span>
                <div className="font-mono font-bold">{renderValue(data.admission_number || 'admin')}</div>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">Assigned Role</span>
                <div className="font-semibold uppercase">{renderValue(data.role || 'administrator')}</div>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">Access Scope</span>
                <div className="capitalize">{renderValue(data.department || 'Institute Wide')}</div>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">Account Status</span>
                <div className="text-emerald-700 font-bold">Active & Verified</div>
              </div>
            </div>

            {data.permissions && data.permissions.length > 0 && (
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-700 block mb-1">
                  Enforced Permissions (Least Privilege Rule)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {data.permissions.map((p, idx) => (
                    <div key={idx} className="border border-slate-200 p-1.5 rounded text-[10px] bg-slate-50">
                      <div className="font-bold text-slate-900 uppercase">{p.resource}</div>
                      <div className="text-indigo-800 text-[9px]">{p.action}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 p-2 rounded text-[9px] text-amber-900">
              <strong>SECURITY SAFEGUARD: </strong>
              {data.security_clause ||
                'Authentication credentials, cryptographic tokens, and passwords are never printed or exported.'}
            </div>
          </div>
        )}

        {/* Document Checklist Verification Table */}
        {(data.documents_checklist || isBlank) && isSectionActive('documents') && (
          <div className="mb-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 mb-1.5 flex items-center justify-between">
              <span>Mandatory KYC Document Submission & Verification Audit</span>
              <span className="text-[9px] font-normal text-slate-500 lowercase">
                (check physical original/photocopy)
              </span>
            </h3>
            <table className="w-full border-collapse border border-slate-300 text-[10px]">
              <thead>
                <tr className="bg-slate-100 text-slate-900">
                  <th className="border border-slate-300 px-2 py-1 text-center w-8">#</th>
                  <th className="border border-slate-300 px-2 py-1 text-left">Document Title / Description</th>
                  <th className="border border-slate-300 px-2 py-1 text-center w-20">Format</th>
                  <th className="border border-slate-300 px-2 py-1 text-center w-24">Submitted</th>
                  <th className="border border-slate-300 px-2 py-1 text-center w-28">Status</th>
                  <th className="border border-slate-300 px-2 py-1 text-left">Verification Authority</th>
                </tr>
              </thead>
              <tbody>
                {(data.documents_checklist || []).map((doc, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono">{idx + 1}</td>
                    <td className="border border-slate-300 px-2 py-1 font-medium text-slate-900">{doc.title}</td>
                    <td className="border border-slate-300 px-2 py-1 text-center text-slate-600 font-mono">
                      {doc.code || 'PHOTOCOPY'}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-center">
                      {doc.submitted ? (
                        <span className="inline-flex items-center gap-1 text-emerald-800 font-bold">
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <Square className="w-3.5 h-3.5 text-slate-300" /> [ &nbsp; ]
                        </span>
                      )}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-center">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                          doc.status === 'verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isBlank ? '[  ] Pending' : doc.status}
                      </span>
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-slate-700">
                      {renderValue(doc.verified_by, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Marksheet / Examination Performance */}
        {data.marks_rows && (form.category === 'Academic' || form.form_id === 'exam_report_card') && (
          <div className="mb-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 mb-1.5">
              Periodic Assessment & Examination Marksheet
            </h3>
            <table className="w-full border-collapse border border-slate-300 text-[10px]">
              <thead>
                <tr className="bg-slate-100 text-slate-900">
                  <th className="border border-slate-300 px-2 py-1 text-left">Subject / Paper</th>
                  <th className="border border-slate-300 px-2 py-1 text-center w-24">Max Marks</th>
                  <th className="border border-slate-300 px-2 py-1 text-center w-28">Marks Obtained</th>
                  <th className="border border-slate-300 px-2 py-1 text-center w-20">Grade</th>
                  <th className="border border-slate-300 px-2 py-1 text-center w-24">Class Highest</th>
                </tr>
              </thead>
              <tbody>
                {data.marks_rows.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-900">
                      {row.subject || row.exam_title}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono">{row.max_marks}</td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-bold text-slate-950 font-mono">
                      {renderValue(row.marks_obtained)}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-bold text-indigo-900">
                      {renderValue(row.grade)}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono text-slate-600">
                      {renderValue(row.highest_in_class)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Financial Statement & Fee Breakdown */}
        {data.financial && (form.category === 'Fees' || form.form_id === 'fee_statement') && (
          <div className="mb-4 space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
              Fee Ledger & Payment Summary
            </h3>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="border border-slate-200 p-2 rounded bg-slate-50">
                <span className="text-[9px] text-slate-500 uppercase block">Total Course Obligation</span>
                <span className="text-sm font-bold text-slate-900">₹{data.financial.total_due.toLocaleString('en-IN')}</span>
              </div>
              <div className="border border-emerald-200 p-2 rounded bg-emerald-50/40">
                <span className="text-[9px] text-emerald-800 uppercase block">Total Fees Paid</span>
                <span className="text-sm font-bold text-emerald-900">₹{data.financial.total_paid.toLocaleString('en-IN')}</span>
              </div>
              <div className="border border-amber-200 p-2 rounded bg-amber-50/40">
                <span className="text-[9px] text-amber-800 uppercase block">Outstanding Dues</span>
                <span className="text-sm font-bold text-amber-900">₹{data.financial.outstanding_dues.toLocaleString('en-IN')}</span>
              </div>
              <div className="border border-indigo-200 p-2 rounded bg-indigo-50/40">
                <span className="text-[9px] text-indigo-800 uppercase block">Collection Rate</span>
                <span className="text-sm font-bold text-indigo-950">{data.financial.collection_percentage}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Bonafide Certificate Body */}
        {form.form_id === 'bonafide_certificate' && (
          <div className="my-6 border-4 border-double border-slate-800 p-6 text-center space-y-4 bg-amber-50/20">
            <h3 className="text-lg font-serif font-bold tracking-widest uppercase text-slate-950 underline underline-offset-8">
              BONAFIDE CERTIFICATE
            </h3>
            <p className="text-xs font-mono text-slate-600">CERTIFICATE NO: {form.document_ref}</p>
            <div className="text-sm leading-relaxed text-slate-900 max-w-xl mx-auto text-justify indent-8 pt-2">
              This is to certify that Master / Miss{' '}
              <span className="font-bold border-b border-dotted border-slate-900 px-1">
                {renderValue(data.student_name || data.full_name)}
              </span>
              , Son / Daughter of Shri{' '}
              <span className="font-bold border-b border-dotted border-slate-900 px-1">
                {renderValue(data.parent_name || data.guardians?.primary?.name)}
              </span>
              , bearing Admission Number{' '}
              <span className="font-mono font-bold border-b border-dotted border-slate-900 px-1">
                {renderValue(data.admission_number)}
              </span>
              , is a bonafide student of <strong>Prashant Academy Coaching Institute</strong> for the Academic Session{' '}
              <strong>{data.academic?.academic_year || '2026-2027'}</strong>, enrolled in{' '}
              <strong>{data.academic?.standard || 'Class X'}</strong> ({data.academic?.board || 'ICSE'} Curriculum).
            </div>
            <p className="text-xs text-slate-700 max-w-xl mx-auto text-justify pt-1">
              To the best of our knowledge and records, his/her conduct and moral character during this tenure have been{' '}
              <strong>{data.conduct || 'Exemplary'}</strong>. This certificate is issued upon lawful request for{' '}
              <strong>{data.certificate_purpose || 'Official Documentation & Board Verification'}</strong>.
            </p>
          </div>
        )}

        {/* DPDP Act 2023 Statutory Purpose & Parental Consent Notice */}
        {isSectionActive('dpdp_notice') && (
          <div className="mb-4 border border-indigo-200 bg-indigo-50/30 rounded p-3 text-[10px] text-slate-700 leading-normal">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-indigo-950 uppercase tracking-wide block mb-0.5">
                  Statutory Notice & Consent (Digital Personal Data Protection Act, 2023)
                </strong>
                <p className="text-[9px] text-slate-600 mb-1.5">{form.statutory_notice}</p>
                <div className="border-t border-indigo-200/60 pt-1 text-[9px] text-indigo-950 italic">
                  <strong>Parental Affirmation: </strong>
                  {form.parent_declaration_text}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Formal Multi-Party Signatures Block (Avoids Page Splits) ── */}
      <div className="mt-6 pt-4 border-t-2 border-slate-900 break-inside-avoid print:break-inside-avoid">
        <div className="grid grid-cols-4 gap-4 text-center">
          {/* Candidate Signature */}
          <div className="flex flex-col justify-end">
            <div className="h-10 border-b border-slate-400 mb-1 flex items-end justify-center">
              <span className="text-[9px] text-slate-400 italic">
                {isBlank ? '' : '(Candidate Signature)'}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-900 uppercase">Candidate / Student</span>
            <span className="text-[8px] text-slate-500">Date: {form.generated_at.split(',')[0]}</span>
          </div>

          {/* Parent Signature */}
          <div className="flex flex-col justify-end">
            <div className="h-10 border-b border-slate-400 mb-1 flex items-end justify-center">
              <span className="text-[9px] text-slate-400 italic">
                {isBlank ? '' : '(Guardian Signature)'}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-900 uppercase">Parent / Guardian</span>
            <span className="text-[8px] text-slate-500">Lawful Consent Affirmation</span>
          </div>

          {/* Verifying Officer */}
          <div className="flex flex-col justify-end">
            <div className="h-10 border-b border-slate-400 mb-1 flex items-end justify-center">
              <span className="text-[9px] text-slate-400 italic">
                {isBlank ? '' : 'Verified by Desk'}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-900 uppercase">Verifying Officer</span>
            <span className="text-[8px] text-slate-500">Identity & Docs Checked</span>
          </div>

          {/* Principal / Center Head */}
          <div className="flex flex-col justify-end">
            <div className="h-10 border-b border-slate-400 mb-1 flex items-end justify-center">
              <span className="text-[9px] text-slate-400 italic">
                {isBlank ? '' : `For ${institution?.name || 'Prashant Academy'}`}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-900 uppercase">Center Head / Principal</span>
            <span className="text-[8px] text-slate-500">Authorised Seal & Stamp</span>
          </div>
        </div>

        {/* Footer Audit Notice & Pagination */}
        <div className="mt-4 pt-2 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-500 font-mono">
          <span>
            {institution?.name || 'Prashant Academy'} IMS &bull; DPDP Compliance Certified &bull; Ref: {form.document_ref}
          </span>
          <span>
            Page {pageNumber} of {totalPages}
          </span>
        </div>
      </div>
    </div>
  )
}
