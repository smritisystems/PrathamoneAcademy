/**
 * @file        FormsDedicatedSubmenus.test.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.test
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-09
 * @updated     2026-11-09
 *
 * @description Comprehensive Vitest test suite validating all 8 dedicated submenus of Print Forms Studio & KYC, URL synchronization, Rule 010 View-First lock enforcement, and Training Mode isolation.
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import FormsDocumentsPage from '../pages/FormsDocuments'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { useEnvironmentStore } from '../store/environmentStore'

// Mock API endpoints
vi.mock('../api/endpoints', () => ({
  formsApi: {
    getCatalogue: vi.fn().mockResolvedValue({
      data: {
        forms: [
          {
            id: 'student_admission',
            title: 'Student Admission & KYC Application Dossier',
            category: 'admission',
            entity: 'student',
            code: 'FORM-ADM-01',
            description: 'CBSE / State Board compliant student registration dossier',
            configurable_sections: [
              { key: 'demographics', label: 'Student Demographics', default: true },
              { key: 'guardians', label: 'Parent & Guardian Details', default: true },
              { key: 'medical', label: 'Medical & Emergency Contacts', default: true },
            ],
          },
          {
            id: 'student_id_card',
            title: 'Student Identity Card (CR80 Standard)',
            category: 'identity',
            entity: 'student',
            code: 'FORM-ID-01',
            description: 'CR80 standard identity badge layout with QR barcode',
            configurable_sections: [
              { key: 'barcode', label: 'QR & Barcode Section', default: true },
            ],
          },
          {
            id: 'fee_receipt',
            title: 'Tuition Fee Payment Official Receipt',
            category: 'financial',
            entity: 'student',
            code: 'FORM-FEE-01',
            description: 'Official fee collection voucher with seal & signature box',
            configurable_sections: [
              { key: 'breakdown', label: 'Payment Breakdown', default: true },
            ],
          },
          {
            id: 'exam_hall_ticket',
            title: 'Examination Hall Ticket & Admit Card',
            category: 'academic',
            entity: 'student',
            code: 'FORM-EXM-01',
            description: 'Official candidate admit card with exam schedule',
            configurable_sections: [
              { key: 'schedule', label: 'Exam Timetable', default: true },
            ],
          },
          {
            id: 'leaving_certificate',
            title: 'Institutional Transfer & Leaving Certificate',
            category: 'certificates',
            entity: 'student',
            code: 'FORM-CRT-01',
            description: 'Official institutional leaving certificate with serial number',
            configurable_sections: [
              { key: 'conduct', label: 'Character & Conduct', default: true },
            ],
          },
        ],
      },
    }),
    renderForm: vi.fn().mockResolvedValue({
      data: {
        form_id: 'student_admission',
        mode: 'prefilled',
        scope: 'single',
        institution: {
          name: 'Prashant Academy Coaching Institute',
          address: 'Main Campus, Pune',
          phone: '+91 98765 43210',
        },
        data: {
          student_name: 'Aarav Patel',
          admission_number: 'ADM-2026-101',
          standard: 'Standard 11',
          division: 'A',
          dob: '2009-05-15',
          gender: 'Male',
          guardian_name: 'Mukesh Patel',
          guardian_phone: '+919876543210',
        },
        active_sections: ['demographics', 'guardians', 'medical'],
        generated_at: '09/11/2026, 10:00:00 AM',
      },
    }),
    bulkRender: vi.fn().mockResolvedValue({
      data: {
        forms: [
          {
            form_id: 'student_admission',
            mode: 'prefilled',
            scope: 'bulk',
            institution: { name: 'Prashant Academy' },
            data: { student_name: 'Aarav Patel', admission_number: 'ADM-2026-101' },
            active_sections: ['demographics'],
            generated_at: '09/11/2026, 10:00:00 AM',
          },
        ],
      },
    }),
    getAuditLogs: vi.fn().mockResolvedValue({
      data: {
        audit_logs: [
          {
            id: 1,
            form_id: 'student_admission',
            user_name: 'Admin Desk',
            mode: 'prefilled',
            scope: 'single',
            sections_included: ['demographics', 'guardians'],
            created_at: '2026-11-09T08:30:00Z',
          },
        ],
      },
    }),
  },
  studentsApi: {
    list: vi.fn().mockResolvedValue({
      data: {
        data: [
          {
            id: 1,
            name: 'Aarav Patel',
            roll_number: '101',
            enrollment_number: 'ADM-2026-101',
            standard_name: '11',
          },
        ],
      },
    }),
  },
  usersApi: {
    list: vi.fn().mockResolvedValue({
      data: {
        items: [
          {
            id: 10,
            first_name: 'Pooja',
            last_name: 'Nair',
            role: 'teacher',
          },
        ],
      },
    }),
  },
  divisionsApi: {
    list: vi.fn().mockResolvedValue({
      data: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
    }),
  },
  standardsApi: {
    list: vi.fn().mockResolvedValue({
      data: [{ id: 11, name: 'Standard 11' }, { id: 12, name: 'Standard 12' }],
    }),
  },
}))

describe('Print Forms Studio & KYC Dedicated Submenus Suite', () => {
  beforeEach(() => {
    localStorage.clear()

    useAuthStore.setState({
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@prashantacademy.edu.in',
        role: 'superadmin',
        first_name: 'Jawahar',
        last_name: 'Mallah',
      },
      token: 'fake-jwt-token',
      selectedInstitutionId: 1,
      selectedAcademicYearId: 1,
    })

    useEditModeStore.setState({
      scopes: {},
    })

    useEnvironmentStore.setState({
      isTrainingMode: false,
    })
  })

  const renderWithRouter = (initialPath = '/forms/overview') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/forms" element={<FormsDocumentsPage />} />
          <Route path="/forms/overview" element={<FormsDocumentsPage />} />
          <Route path="/forms/admissions" element={<FormsDocumentsPage />} />
          <Route path="/forms/id-cards" element={<FormsDocumentsPage />} />
          <Route path="/forms/financial" element={<FormsDocumentsPage />} />
          <Route path="/forms/academic" element={<FormsDocumentsPage />} />
          <Route path="/forms/certificates" element={<FormsDocumentsPage />} />
          <Route path="/forms/bulk-print" element={<FormsDocumentsPage />} />
          <Route path="/forms/audit-logs" element={<FormsDocumentsPage />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('1. Renders overview with all 8 dedicated submenus and KPI metrics', async () => {
    renderWithRouter('/forms/overview')

    expect(await screen.findByText('Print Forms Studio & KYC')).toBeDefined()
    expect(screen.getByText('DPDP & CBSE Compliant')).toBeDefined()

    // 8 Submenu navigation buttons
    expect(screen.getByRole('button', { name: /overview/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /admission forms/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /student & staff ids/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /receipts & notices/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /hall tickets & transcripts/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /leaving & experience certs/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /bulk print spooler/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /print audit trail/i })).toBeDefined()

    // KPI Cards
    expect(screen.getByText('Standard Templates')).toBeDefined()
    expect(screen.getByText('DPDP 2023 Compliance')).toBeDefined()
    expect(screen.getByText('Eligible Students')).toBeDefined()
    expect(screen.getByText('Staff Directory')).toBeDefined()
    expect(screen.getByText('Print Audited Runs')).toBeDefined()
  })

  it('2. Navigates to Admission Forms workspace and shows document controls', async () => {
    renderWithRouter('/forms/admissions')

    expect(await screen.findByText('Student Admission & KYC Application Dossier')).toBeDefined()
    expect(screen.getByText('Data Mode')).toBeDefined()
    expect(screen.getByText('Print Scope')).toBeDefined()
    expect(screen.getByText('Select Student Record')).toBeDefined()
  })

  it('3. Enforces Rule 010 View-First lock on print button in view mode', async () => {
    renderWithRouter('/forms/admissions')

    expect(await screen.findByText('Student Admission & KYC Application Dossier')).toBeDefined()
    expect(screen.getByText('Locked in View Mode')).toBeDefined()
    const lockedBtn = screen.getByTitle(/locked in view mode: activate edit mode above to print/i) as HTMLButtonElement
    expect(lockedBtn.disabled).toBe(true)
  })

  it('4. Unlocks print button when Edit Mode is active', async () => {
    act(() => {
      useEditModeStore.setState({
        scopes: { 'academic:forms_documents': true },
      })
    })

    renderWithRouter('/forms/admissions')

    expect(await screen.findByText('Student Admission & KYC Application Dossier')).toBeDefined()
    expect(await screen.findByText(/print document/i)).toBeDefined()
  })

  it('5. Navigates to Student & Staff IDs workspace', async () => {
    renderWithRouter('/forms/id-cards')

    expect(await screen.findByText('Student Identity Card (CR80 Standard)')).toBeDefined()
    expect(screen.getByText('FORM-ID-01')).toBeDefined()
  })

  it('6. Navigates to Receipts & Notices workspace', async () => {
    renderWithRouter('/forms/financial')

    expect(await screen.findByText('Tuition Fee Payment Official Receipt')).toBeDefined()
    expect(screen.getByText('FORM-FEE-01')).toBeDefined()
  })

  it('7. Navigates to Hall Tickets & Transcripts workspace', async () => {
    renderWithRouter('/forms/academic')

    expect(await screen.findByText('Examination Hall Ticket & Admit Card')).toBeDefined()
    expect(screen.getByText('FORM-EXM-01')).toBeDefined()
  })

  it('8. Navigates to Leaving & Experience Certificates workspace', async () => {
    renderWithRouter('/forms/certificates')

    expect(await screen.findByText('Institutional Transfer & Leaving Certificate')).toBeDefined()
    expect(screen.getByText('FORM-CRT-01')).toBeDefined()
  })

  it('9. Navigates to Bulk Print Spooler workspace with batch options', async () => {
    renderWithRouter('/forms/bulk-print')

    expect(await screen.findByText('Document Configuration')).toBeDefined()
    expect(screen.getByText('Standard / Class')).toBeDefined()
    expect(screen.getByText('Division / Section')).toBeDefined()
  })

  it('10. Navigates to Print Audit Trail workspace with forensic logs', async () => {
    renderWithRouter('/forms/audit-logs')

    expect(await screen.findByText('Digital Personal Data Protection (DPDP Act 2023) Audited Trail')).toBeDefined()
    expect(screen.getByText('Admin Desk')).toBeDefined()
    expect(screen.getByText('student_admission')).toBeDefined()
    expect(screen.getByText('COMPLIANT')).toBeDefined()
  })

  it('11. Renders amber Training Mode indicator when training mode is active', async () => {
    act(() => {
      useEnvironmentStore.setState({
        isTrainingMode: true,
      })
    })

    renderWithRouter('/forms/overview')

    expect(await screen.findByText('TRAINING MODE ACTIVE')).toBeDefined()
    expect(screen.getByText(/watermarked mock data for training simulation/i)).toBeDefined()
    expect(screen.getByText('Mock Print Spooler')).toBeDefined()
  })

  it('12. Direct URL deep-link synchronization loads corresponding workspace tab', async () => {
    renderWithRouter('/forms/financial')

    expect(await screen.findByText('Tuition Fee Payment Official Receipt')).toBeDefined()
    expect(screen.getByText('FORM-FEE-01')).toBeDefined()
  })
})
