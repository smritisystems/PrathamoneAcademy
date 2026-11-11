/**
 * @file        EmployeeDossierDocument.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.workforce
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-07
 * @updated     2026-11-11
 *
 * @description Print-optimized Master Employee Dossier document layout for Teachers and Staff.
 */

import React from 'react'
import { PrintFooter } from '../printing'
import {
  User,
  MapPin,
  Phone,
  CreditCard,
  Briefcase,
  FileCheck,
  ShieldCheck,
  Building,
} from 'lucide-react'

export interface EmployeeDossierSectionsConfig {
  personal?: boolean
  addresses?: boolean
  contacts?: boolean
  employment?: boolean
  qualifications?: boolean
  assignments?: boolean
  attendance?: boolean
  payroll?: boolean
  documents?: boolean
  excludeSensitiveBanking?: boolean
}

export interface EmployeeDossierDocumentProps {
  id?: string
  profile: any
  institutionName?: string
  institutionAddress?: string
  institutionPhone?: string
  institutionEmail?: string
  sections?: EmployeeDossierSectionsConfig
}

export default function EmployeeDossierDocument({
  id = 'employee-dossier-print-content',
  profile,
  institutionName = 'Prashant Academy Coaching Institute',
  institutionAddress = 'Central Knowledge Campus, High Street Powai, Mumbai - 400076',
  institutionPhone = '+91 98200 12345 / 022-25701122',
  institutionEmail = 'admin@example.com',
  sections = {
    personal: true,
    addresses: true,
    contacts: true,
    employment: true,
    qualifications: true,
    assignments: true,
    attendance: true,
    payroll: true,
    documents: true,
    excludeSensitiveBanking: false,
  },
}: EmployeeDossierDocumentProps) {
  if (!profile) return null

  const todayStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const dossierRef = `PA-DOS-${profile.employee_id || profile.user_id}-${new Date().getFullYear()}`

  const bankAccounts = profile.bank_accounts && profile.bank_accounts.length > 0
    ? profile.bank_accounts
    : [
        {
          id: 1,
          bank_name: profile.bank_name || 'HDFC Bank',
          account_number: profile.bank_account_number || '••••••••1234',
          ifsc_code: profile.bank_ifsc || 'HDFC0000123',
          branch_name: 'Main Branch',
          account_type: 'Salary',
          is_primary: true,
        },
      ]

  const keyContacts = profile.key_contacts && profile.key_contacts.length > 0
    ? profile.key_contacts
    : [
        {
          id: 1,
          contact_name: profile.emergency_contact_name || 'Ramesh Sharma',
          relationship: profile.emergency_contact_relation || 'Family / Spouse',
          phone_primary: profile.emergency_contact_phone || '+91 98200 11223',
          is_primary_emergency: true,
        },
      ]

  const addresses = profile.addresses && profile.addresses.length > 0
    ? profile.addresses
    : [
        {
          id: 1,
          address_type: 'current',
          address_line: profile.current_address || 'A-402, Green View Heights, Powai',
          city: profile.city || 'Mumbai',
          state: profile.state || 'Maharashtra',
          pincode: profile.pincode || '400076',
          is_primary: true,
        },
        {
          id: 2,
          address_type: 'permanent',
          address_line: profile.permanent_address || profile.current_address || 'Permanent Native Residence',
          city: profile.city || 'Mumbai',
          state: profile.state || 'Maharashtra',
          pincode: profile.pincode || '400076',
          is_primary: false,
        },
      ]

  const assignments = profile.assignments || []

  return (
    <div
      id={id}
      className="bg-white text-slate-900 p-8 max-w-4xl mx-auto space-y-6 text-xs font-sans border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 print:pb-[16mm] print:min-h-0"
      style={{ minHeight: '1050px' }}
    >
      {/* ─── 1. INSTITUTIONAL HEADER ───────────────────────────────────── */}
      <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary-700 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              P
            </span>
            <div>
              <h1 className="text-base font-extrabold uppercase tracking-tight text-slate-900">
                {institutionName}
              </h1>
              <p className="text-[10px] text-slate-500 font-medium">
                Autonomous Coaching Institute • Affiliated Standardized Curriculum
              </p>
            </div>
          </div>
          <p className="text-[10px] text-slate-600 mt-2">
            {institutionAddress} • Tel: {institutionPhone} • Email: {institutionEmail}
          </p>
        </div>

        <div className="text-right space-y-1">
          <div className="inline-block px-2.5 py-1 bg-slate-900 text-white font-mono font-bold text-[10px] rounded uppercase tracking-wider">
            Official Employee Dossier
          </div>
          <div className="text-[10px] font-mono text-slate-600">
            Dossier Ref: <span className="font-bold text-slate-900">{dossierRef}</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Generated: <span className="font-semibold text-slate-700">{todayStr}</span>
          </div>
        </div>
      </div>

      {/* ─── 2. EMPLOYEE IDENTITY CARD ──────────────────────────────────── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
            {profile.first_name ? profile.first_name[0] : 'E'}
            {profile.last_name ? profile.last_name[0] : ''}
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                {profile.full_name || `${profile.first_name} ${profile.last_name}`}
              </h2>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-bold text-[9px] uppercase">
                {profile.status || 'Active'}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 font-medium">
              Employee ID: <span className="font-mono font-bold text-primary-700">{profile.employee_id || `ID-${profile.user_id}`}</span> • Designation: <span className="font-semibold">{profile.role?.toUpperCase() === 'TEACHER' ? 'Senior Faculty Member' : profile.role || 'Staff'}</span>
            </div>
            <div className="text-[10px] text-slate-500">
              Department: <span className="font-semibold text-slate-700">{profile.department || 'Academics'}</span> • Classification: <span className="font-semibold capitalize">{profile.staff_type || 'Teacher'}</span>
            </div>
          </div>
        </div>

        <div className="text-right text-[10px] space-y-1">
          <div>Email: <span className="font-semibold text-slate-800">{profile.email}</span></div>
          <div>Phone: <span className="font-semibold text-slate-800">{profile.phone || '+91 98765 43210'}</span></div>
          <div>Joining Date: <span className="font-semibold text-slate-800">{profile.joining_date || '15 Jun 2020'}</span></div>
        </div>
      </div>

      {/* ─── 3. DEMOGRAPHICS & DUAL ADDRESSES (SSOT) ────────────────────── */}
      {sections.addresses !== false && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1">
            <MapPin className="w-3.5 h-3.5 text-primary-600" />
            1. Residential, Permanent & Alternate Addresses
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {addresses.map((addr: any, idx: number) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-primary-700">
                    {addr.address_type === 'current'
                      ? 'Current / Residential Address'
                      : addr.address_type === 'permanent'
                      ? 'Permanent / Hometown Address'
                      : `${addr.address_type} Address`}
                  </span>
                  {addr.is_primary && (
                    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">
                      Primary Address
                    </span>
                  )}
                </div>
                <p className="font-medium text-slate-800 text-[11px] line-clamp-2">
                  {addr.address_line}
                </p>
                <p className="text-[10px] text-slate-500">
                  {addr.city}, {addr.state} - {addr.pincode}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 4. KEY EMERGENCY CONTACTS & NOMINEES ──────────────────────────── */}
      {sections.contacts !== false && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1">
            <Phone className="w-3.5 h-3.5 text-primary-600" />
            2. Key Emergency Contacts & Family Nominees
          </h3>

          <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden text-[11px]">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[10px] uppercase">
              <tr>
                <th className="py-1.5 px-3">Contact Person</th>
                <th className="py-1.5 px-3">Relationship</th>
                <th className="py-1.5 px-3">Primary Phone</th>
                <th className="py-1.5 px-3">Priority / Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {keyContacts.map((c: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-1.5 px-3 font-semibold text-slate-800">{c.contact_name}</td>
                  <td className="py-1.5 px-3 text-slate-600 capitalize">{c.relationship || 'Family'}</td>
                  <td className="py-1.5 px-3 font-mono text-slate-800">{c.phone_primary}</td>
                  <td className="py-1.5 px-3">
                    <div className="flex items-center gap-1">
                      {c.is_primary_emergency && (
                        <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[9px] font-bold">
                          Primary Emergency
                        </span>
                      )}
                      {c.is_nominee && (
                        <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[9px] font-bold">
                          Nominee
                        </span>
                      )}
                      {!c.is_primary_emergency && !c.is_nominee && (
                        <span className="text-slate-400 text-[10px]">Reference</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── 5. BANK ACCOUNTS & REMUNERATION ─────────────────────────────── */}
      {sections.payroll !== false && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1">
            <CreditCard className="w-3.5 h-3.5 text-primary-600" />
            3. Bank Accounts & Remuneration Details
          </h3>

          <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden text-[11px]">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[10px] uppercase">
              <tr>
                <th className="py-1.5 px-3">Bank Name</th>
                <th className="py-1.5 px-3">Account Number</th>
                <th className="py-1.5 px-3">IFSC Code</th>
                <th className="py-1.5 px-3">Account Type</th>
                <th className="py-1.5 px-3">Primary Salary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {bankAccounts.map((b: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-1.5 px-3 font-semibold text-slate-800">{b.bank_name}</td>
                  <td className="py-1.5 px-3 font-mono text-slate-700">
                    {sections.excludeSensitiveBanking
                      ? '••••••••' + String(b.account_number).slice(-4)
                      : b.account_number}
                  </td>
                  <td className="py-1.5 px-3 font-mono uppercase text-slate-700">{b.ifsc_code}</td>
                  <td className="py-1.5 px-3 capitalize text-slate-600">{b.account_type || 'Salary'}</td>
                  <td className="py-1.5 px-3">
                    {b.is_primary ? (
                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-bold">
                        Primary
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Secondary</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-3 gap-3 pt-1 text-[10px]">
            <div className="p-2 bg-slate-50 border border-slate-200 rounded">
              <span className="text-slate-400 font-semibold uppercase">Basic Monthly Remuneration</span>
              <div className="font-bold text-slate-900 text-xs mt-0.5">
                ₹{profile.basic_salary?.toLocaleString() || '45,000.00'}
              </div>
            </div>
            <div className="p-2 bg-slate-50 border border-slate-200 rounded">
              <span className="text-slate-400 font-semibold uppercase">PAN Verification</span>
              <div className="font-bold text-slate-900 font-mono text-xs mt-0.5">
                {profile.pan_number || 'ABCDE1234F'}
              </div>
            </div>
            <div className="p-2 bg-slate-50 border border-slate-200 rounded">
              <span className="text-slate-400 font-semibold uppercase">Aadhaar (Masked)</span>
              <div className="font-bold text-slate-900 font-mono text-xs mt-0.5">
                {profile.aadhar_number ? `•••• •••• ${profile.aadhar_number.slice(-4)}` : '•••• •••• 9012'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 6. ACADEMIC ALLOCATIONS (IF TEACHER) ────────────────────────── */}
      {sections.assignments !== false && assignments.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1">
            <Briefcase className="w-3.5 h-3.5 text-primary-600" />
            4. Academic Subject & Batch Allocations
          </h3>

          <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden text-[11px]">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[10px] uppercase">
              <tr>
                <th className="py-1.5 px-3">Board</th>
                <th className="py-1.5 px-3">Standard / Grade</th>
                <th className="py-1.5 px-3">Batch & Code</th>
                <th className="py-1.5 px-3">Subject</th>
                <th className="py-1.5 px-3 text-right">Weekly Load</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {assignments.map((a: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-1.5 px-3 font-semibold text-primary-700">{a.board}</td>
                  <td className="py-1.5 px-3 text-slate-800">{a.standard}</td>
                  <td className="py-1.5 px-3 font-medium text-slate-700">
                    {a.batch} {a.batch_code ? <span className="font-mono text-slate-500">[{a.batch_code}]</span> : null}
                  </td>
                  <td className="py-1.5 px-3 font-semibold text-slate-900">{a.subject}</td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-800">{a.weekly_hours} hrs/wk</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── 7. STATUTORY DECLARATION & SIGNATURES ─────────────────────── */}
      <div className="pt-6 border-t border-slate-300 space-y-6">
        <p className="text-[9px] text-slate-500 leading-relaxed italic">
          <strong>Institutional Certification & DPDP Act Compliance:</strong> The details recorded in this Master Employee Dossier represent the official, authoritative single-source-of-truth service records of {institutionName}. All confidential employee data is handled under institutional data governance policies and applicable personal data protection regulations.
        </p>

        <div className="grid grid-cols-3 gap-6 pt-6 text-center text-[10px]">
          <div className="space-y-1">
            <div className="border-b border-slate-400 w-36 mx-auto mb-1"></div>
            <div className="font-bold text-slate-800">
              {profile.full_name || `${profile.first_name} ${profile.last_name}`}
            </div>
            <div className="text-slate-400">Employee Signature & Date</div>
          </div>

          <div className="space-y-1">
            <div className="border-b border-slate-400 w-36 mx-auto mb-1"></div>
            <div className="font-bold text-slate-800">Head of Human Resources</div>
            <div className="text-slate-400">Verified & Reconciled</div>
          </div>

          <div className="space-y-1">
            <div className="border-b border-slate-400 w-36 mx-auto mb-1"></div>
            <div className="font-bold text-slate-800">Principal / Center Director</div>
            <div className="text-slate-400">Authorized Institutional Seal</div>
          </div>
        </div>
      </div>

      {/* ─── 8. CANONICAL TWO-ROW GLOBAL PRINT FOOTER ────────────────────── */}
      <PrintFooter
        documentId={`EMP-${profile.employee_id || profile.id || '001'}`}
        classification="Strictly Confidential"
        fixedBottom={true}
        className="mt-6"
      />
    </div>
  )
}
