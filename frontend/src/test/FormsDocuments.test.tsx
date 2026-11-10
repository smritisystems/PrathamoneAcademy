/**
 * @file        FormsDocuments.test.tsx
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
 * @created     2026-11-04
 * @updated     2026-11-10
 *
 * @description Vitest specifications validating centralized forms workspace, prefilled & blank modes, Aadhaar masking, DPDP consent, and print triggers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import FormsDocuments from '../pages/FormsDocuments'
import FormTemplateEngine from '../components/forms/FormTemplateEngine'
import { useEditModeStore } from '../store/editModeStore'
import type { RenderedFormPayload } from '../types/forms'

// Mock API modules
vi.mock('../api/endpoints', () => ({
  formsApi: {
    getCatalogue: vi.fn().mockResolvedValue({
      data: {
        total: 5,
        forms: [
          {
            id: 'student_admission',
            title: 'Student Admission & Application Form',
            code: 'PA-ADM-01',
            entity: 'student',
            category: 'KYC',
            description: 'Formal admission application record capturing basic student profile.',
            version: 'v2.1 (2026)',
            cbse_reference: 'CBSE Affiliation Bye-Laws 2018',
            dpdp_sensitive: true,
            available_modes: ['prefilled', 'blank'],
            supported_scopes: ['single', 'bulk'],
            required_roles: ['admin', 'accountant'],
            configurable_sections: [
              { key: 'header', label: 'Institutional Header', default: true },
              { key: 'personal', label: 'Student Personal Info', default: true },
              { key: 'guardians', label: 'Parent Particulars', default: true },
              { key: 'documents', label: 'Document Checklist', default: true },
              { key: 'dpdp_notice', label: 'DPDP Notice & Consent', default: true },
            ],
          },
          {
            id: 'student_kyc',
            title: 'Student Information & KYC Verification Form',
            code: 'PA-KYC-01',
            entity: 'student',
            category: 'KYC',
            description: 'Comprehensive KYC verification sheet with masked Aadhaar.',
            version: 'v1.4 (2026)',
            dpdp_sensitive: true,
            available_modes: ['prefilled', 'blank'],
            supported_scopes: ['single', 'bulk'],
            required_roles: ['admin'],
            configurable_sections: [
              { key: 'header', label: 'Institutional Header', default: true },
              { key: 'personal', label: 'Student Personal Info', default: true },
            ],
          },
          {
            id: 'staff_profile',
            title: 'Staff Master Profile Dossier',
            code: 'PA-STF-PRF',
            entity: 'staff',
            category: 'HR',
            description: 'Consolidated employee profile summarizing role and designation.',
            version: 'v1.2 (2026)',
            dpdp_sensitive: true,
            available_modes: ['prefilled', 'blank'],
            supported_scopes: ['single'],
            required_roles: ['admin'],
            configurable_sections: [
              { key: 'header', label: 'Institutional Header', default: true },
            ],
          },
        ],
      },
    }),
    renderForm: vi.fn().mockResolvedValue({
      data: {
        form_id: 'student_admission',
        title: 'Student Admission & Application Form',
        code: 'PA-ADM-01',
        entity: 'student',
        category: 'KYC',
        description: 'Formal admission application record.',
        version: 'v2.1 (2026)',
        dpdp_sensitive: true,
        mode: 'prefilled',
        document_ref: 'PA001/PA-ADM-01/202611/129',
        generated_at: '04 Nov 2026, 02:30 PM',
        generated_by: 'Admin User',
        institution: {
          name: 'Prashant Academy',
          tagline: 'Coaching Institute for ICSE, CBSE & State Board Excellence',
          code: 'PA001',
          address: 'Dadar West, Near Shivaji Park, Mumbai - 400028',
          phone: '+91-22-12345678',
          email: 'info@prashantacademy.edu.in',
          website: 'www.prashantacademy.edu.in',
          logo_url: '/logo.svg',
        },
        active_sections: ['header', 'personal', 'guardians', 'documents', 'dpdp_notice'],
        statutory_notice: 'In accordance with the Digital Personal Data Protection Act, 2023 (DPDP Act)...',
        parent_declaration_text: 'I hereby declare that I am the parent / lawful guardian...',
        staff_declaration_text: 'I acknowledge and agree to uphold confidentiality...',
        data: {
          student_id: 129,
          admission_number: 'PA-2024-000001',
          first_name: 'Rajnees',
          last_name: 'Sharma',
          full_name: 'Rajnees Sharma',
          date_of_birth: '01-01-2010',
          age: 16,
          is_minor: true,
          gender: 'Male',
          blood_group: 'O+',
          nationality: 'Indian',
          aadhar_masked: 'XXXX-XXXX-1000',
          phone: '+91-9820014411',
          email: 'rajnees.sharma@example.com',
          address: 'Flat 101, Building A, Dadar West',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400028',
          academic: {
            academic_year: '2026-2027',
            board: 'ICSE',
            standard: 'Class X',
            batch: 'Batch A (Morning)',
            room_number: 'Room 102',
            timing: '08:00 AM - 11:30 AM',
            batch_coordinator: 'Prof. Rahul Desai',
          },
          guardians: {
            primary: {
              relation: 'Father',
              name: 'Rajendra Sharma',
              occupation: 'Software Engineer',
              phone: '+91-9819018822',
              email: 'father.rajnees@example.com',
              aadhar_masked: 'XXXX-XXXX-2000',
              annual_income: '₹12,00,000.00',
            },
          },
          documents_checklist: [
            { title: 'Aadhaar Card Copy', submitted: true, status: 'verified', verified_by: 'Admissions Officer' },
            { title: 'Birth Certificate', submitted: true, status: 'verified', verified_by: 'Admissions Officer' },
          ],
        },
      },
    }),
    bulkRender: vi.fn().mockResolvedValue({
      data: {
        form_id: 'student_admission',
        title: 'Student Admission & Application Form',
        mode: 'bulk',
        total_records: 2,
        forms: [],
      },
    }),
    getAuditLogs: vi.fn().mockResolvedValue({
      data: {
        total: 1,
        audit_logs: [
          {
            id: 1,
            action: 'PRINT_FORM_GENERATED',
            resource_id: 129,
            metadata: JSON.stringify({ form_title: 'Student Admission Form', form_id: 'student_admission' }),
            created_at: '04 Nov 2026, 02:30 PM',
          },
        ],
      },
    }),
  },
  studentsApi: {
    list: vi.fn().mockResolvedValue({
      data: {
        data: [
          { id: 129, admission_number: 'PA-2024-000001', first_name: 'Rajnees', last_name: 'Sharma' },
          { id: 130, admission_number: 'PA-2024-000002', first_name: 'Ayaan', last_name: 'Verma' },
        ],
      },
    }),
  },
  usersApi: {
    list: vi.fn().mockResolvedValue({
      data: {
        items: [
          { id: 1, first_name: 'Admin', last_name: 'User', role: 'admin', username: 'admin' },
          { id: 121, first_name: 'Rahul', last_name: 'Desai', role: 'teacher', staff_code: 'PA-STF-001' },
        ],
      },
    }),
  },
  divisionsApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        { id: 1, name: 'Batch A (Morning)', code: 'B-A' },
      ],
    }),
  },
  standardsApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        { id: 1, name: 'Class X' },
      ],
    }),
  },
}))

describe('Print Forms & KYC System Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.print = vi.fn()
  })

  const renderWithRouter = (initialPath = '/forms/admissions') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/forms" element={<FormsDocuments />} />
          <Route path="/forms/overview" element={<FormsDocuments />} />
          <Route path="/forms/admissions" element={<FormsDocuments />} />
          <Route path="/forms/id-cards" element={<FormsDocuments />} />
          <Route path="/forms/financial" element={<FormsDocuments />} />
          <Route path="/forms/academic" element={<FormsDocuments />} />
          <Route path="/forms/certificates" element={<FormsDocuments />} />
          <Route path="/forms/bulk-print" element={<FormsDocuments />} />
          <Route path="/forms/audit-logs" element={<FormsDocuments />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('renders centralized workspace header, mode controls, and catalogue', async () => {
    renderWithRouter('/forms/admissions')

    expect(screen.getByText(/Print Forms Studio & KYC/i)).toBeDefined()
    expect(await screen.findByText(/Student Admission & Application Form/i)).toBeDefined()
    expect(screen.getByText(/Data Mode/i)).toBeDefined()
    expect(screen.getByText(/Prefilled Data/i)).toBeDefined()
    expect(screen.getByText(/Blank Pen & Paper/i)).toBeDefined()
    expect(screen.getByText(/Single Record/i)).toBeDefined()
    expect(screen.getByText(/Batch Print/i)).toBeDefined()
  })

  it('switches between prefilled and blank form mode', async () => {
    renderWithRouter('/forms/admissions')

    expect(await screen.findByText(/Student Admission & Application Form/i)).toBeDefined()

    const blankBtn = screen.getByText(/Blank Pen & Paper/i)
    fireEvent.click(blankBtn)

    await waitFor(() => {
      expect(blankBtn.className).toContain('text-emerald-900')
    })
  })

  it('switches to bulk batch print mode and displays class and batch selectors', async () => {
    renderWithRouter('/forms/admissions')

    expect(await screen.findByText(/Student Admission & Application Form/i)).toBeDefined()

    const bulkBtn = screen.getByText(/Batch Print/i)
    fireEvent.click(bulkBtn)

    await waitFor(() => {
      expect(screen.getByText(/Select Class \/ Standard/i)).toBeDefined()
      expect(screen.getByText(/Select Batch \/ Division/i)).toBeDefined()
    })
  })

  it('renders institutional header, masked Aadhaar, and DPDP consent in A4 template', async () => {
    const mockFormPayload: RenderedFormPayload = {
      form_id: 'student_kyc',
      title: 'Student Information & KYC Verification Form',
      code: 'PA-KYC-01',
      entity: 'student',
      category: 'KYC',
      description: 'Comprehensive KYC verification.',
      version: 'v1.4',
      dpdp_sensitive: true,
      mode: 'prefilled',
      document_ref: 'PA001/PA-KYC-01/202611/129',
      generated_at: '04 Nov 2026, 02:30 PM',
      generated_by: 'Admin User',
      institution: {
        name: 'Prashant Academy',
        tagline: 'Coaching Institute for ICSE, CBSE & State Board Excellence',
        code: 'PA001',
        address: 'Dadar West, Mumbai - 400028',
        phone: '+91-22-12345678',
        email: 'info@prashantacademy.edu.in',
        website: 'www.prashantacademy.edu.in',
        logo_url: '/logo.svg',
      },
      active_sections: ['header', 'personal', 'guardians', 'documents', 'dpdp_notice'],
      statutory_notice: 'Statutory Notice under DPDP Act 2023 for minors.',
      parent_declaration_text: 'I grant consent under Section 9 of the DPDP Act 2023.',
      staff_declaration_text: 'Confidentiality affirmation.',
      data: {
        full_name: 'Rajnees Sharma',
        admission_number: 'PA-2024-000001',
        date_of_birth: '01-01-2010',
        age: 16,
        is_minor: true,
        gender: 'Male',
        blood_group: 'O+',
        nationality: 'Indian',
        aadhar_masked: 'XXXX-XXXX-1000',
        address: 'Flat 101, Building A, Dadar West',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400028',
        academic: {
          academic_year: '2026-2027',
          board: 'ICSE',
          standard: 'Class X',
          batch: 'Batch A',
        },
        guardians: {
          primary: {
            relation: 'Father',
            name: 'Rajendra Sharma',
            occupation: 'Software Engineer',
            phone: '+91-9819018822',
            email: 'father.rajnees@example.com',
            aadhar_masked: 'XXXX-XXXX-2000',
          },
        },
        documents_checklist: [
          { title: 'Aadhaar Card Copy', submitted: true, status: 'verified', verified_by: 'Admissions Officer' },
        ],
      },
    }

    render(<FormTemplateEngine form={mockFormPayload} pageNumber={1} totalPages={1} />)

    // Verify institutional branding
    expect(screen.getAllByText(/Prashant Academy/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/INST. CODE: PA001/i)).toBeDefined()

    // Verify Aadhaar masking
    expect(screen.getByText('XXXX-XXXX-1000')).toBeDefined()
    expect(screen.getByText('XXXX-XXXX-2000')).toBeDefined()

    // Verify DPDP Act Section 9 notice and signatures block
    expect(screen.getByText(/Statutory Notice & Consent \(Digital Personal Data Protection Act, 2023\)/i)).toBeDefined()
    expect(screen.getByText(/Candidate \/ Student/i)).toBeDefined()
    expect(screen.getByText(/Parent \/ Guardian/i)).toBeDefined()
    expect(screen.getByText(/Verifying Officer/i)).toBeDefined()
    expect(screen.getByText(/Center Head \/ Principal/i)).toBeDefined()
  })

  it('triggers browser window.print() when Print Form is clicked', async () => {
    useEditModeStore.setState({
      scopes: { 'academic:forms_documents': true },
    })

    renderWithRouter('/forms/admissions')

    const printBtn = await screen.findByRole('button', { name: /Print Document/i })
    fireEvent.click(printBtn)

    expect(window.print).toHaveBeenCalled()
  })
})
