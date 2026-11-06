/**
 * @file        WorkforceExtensions.test.tsx
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
 * @created     2026-11-07
 * @updated     2026-11-07
 *
 * @description Comprehensive unit and integration test suite for Workforce Extensions: Employee Dossier, Dual Addresses, Multiple Bank Accounts, Key Contacts, and Global Profile Editing.
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EmployeeDossierDocument from '../components/workforce/EmployeeDossierDocument'
import StaffProfileEditModal from '../components/workforce/StaffProfileEditModal'
import TeacherAssignBatchModal from '../components/workforce/TeacherAssignBatchModal'
import DocumentPreviewModal from '../components/workforce/DocumentPreviewModal'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

const mockProfile = {
  user_id: 42,
  employee_id: 'TCH-1008',
  first_name: 'Dr. Anjali',
  last_name: 'Sharma',
  full_name: 'Dr. Anjali Sharma',
  email: 'anjali.sharma@aitdl.edu.in',
  phone: '+91 98765 43210',
  role: 'teacher',
  staff_type: 'teacher',
  department: 'Academics',
  gender: 'female',
  date_of_birth: '1988-10-12',
  blood_group: 'O+',
  joining_date: '2020-06-15',
  status: 'active',
  current_address: 'A-402, Green View Heights, Powai',
  permanent_address: 'Plot 18, Royal Heritage Enclave, Jaipur',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400076',
  basic_salary: 65000,
  pan_number: 'ABCDE1234F',
  aadhar_number: '123456789012',
  bank_name: 'HDFC Bank',
  bank_account_number: '50100234567890',
  bank_ifsc: 'HDFC0000123',
  emergency_contact_name: 'Ramesh Sharma',
  emergency_contact_phone: '+91 98200 11223',
  emergency_contact_relation: 'Spouse',
  assignments: [
    {
      id: 1,
      board: 'CBSE',
      standard: 'Class X',
      batch: 'Batch Alpha',
      subject: 'Mathematics',
      weekly_hours: 6,
    },
  ],
  bank_accounts: [
    {
      id: 1,
      bank_name: 'HDFC Bank',
      account_number: '50100234567890',
      ifsc_code: 'HDFC0000123',
      account_type: 'Salary',
      is_primary: true,
    },
    {
      id: 2,
      bank_name: 'State Bank of India',
      account_number: '30200123456789',
      ifsc_code: 'SBIN0001234',
      account_type: 'Savings',
      is_primary: false,
    },
  ],
  key_contacts: [
    {
      id: 1,
      contact_name: 'Ramesh Sharma',
      relationship: 'Spouse',
      phone_primary: '+91 98200 11223',
      is_primary_emergency: true,
    },
    {
      id: 2,
      contact_name: 'Sunita Sharma',
      relationship: 'Sister',
      phone_primary: '+91 98200 44556',
      is_primary_emergency: false,
    },
  ],
}

describe('Workforce Extensions & Employee Dossier Specifications', () => {
  it('1. EmployeeDossierDocument renders institutional branding and employee identification', () => {
    render(<EmployeeDossierDocument profile={mockProfile} />)
    expect(screen.getAllByText(/Prashant Academy Coaching Institute/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Official Employee Dossier/i)).toBeDefined()
    expect(screen.getAllByText(/Dr. Anjali Sharma/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/TCH-1008/i).length).toBeGreaterThan(0)
  })

  it('2. EmployeeDossierDocument displays both Current and Permanent Addresses (Single Source of Truth)', () => {
    render(<EmployeeDossierDocument profile={mockProfile} />)
    expect(screen.getByText(/Current \/ Residential Address/i)).toBeDefined()
    expect(screen.getByText(/A-402, Green View Heights, Powai/i)).toBeDefined()
    expect(screen.getByText(/Permanent \/ Hometown Address/i)).toBeDefined()
    expect(screen.getByText(/Plot 18, Royal Heritage Enclave, Jaipur/i)).toBeDefined()
  })

  it('3. EmployeeDossierDocument displays multiple bank accounts with primary salary badge', () => {
    render(<EmployeeDossierDocument profile={mockProfile} />)
    expect(screen.getByText('HDFC Bank')).toBeDefined()
    expect(screen.getByText('State Bank of India')).toBeDefined()
    expect(screen.getByText('Primary')).toBeDefined()
    expect(screen.getByText('Secondary')).toBeDefined()
  })

  it('4. EmployeeDossierDocument displays key emergency contacts and academic allocations', () => {
    render(<EmployeeDossierDocument profile={mockProfile} />)
    expect(screen.getByText('Ramesh Sharma')).toBeDefined()
    expect(screen.getByText('Sunita Sharma')).toBeDefined()
    expect(screen.getByText('Primary Emergency')).toBeDefined()
    expect(screen.getByText('Batch Alpha')).toBeDefined()
    expect(screen.getByText('6 hrs/wk')).toBeDefined()
  })

  it('5. StaffProfileEditModal renders all 4 tabs and supports navigation', () => {
    const handleClose = vi.fn()
    render(
      <StaffProfileEditModal
        isOpen={true}
        onClose={handleClose}
        profile={mockProfile}
      />
    )

    expect(screen.getByText(/Edit Workforce Profile/i)).toBeDefined()
    expect(screen.getByText(/Identity & Contacts/i)).toBeDefined()
    expect(screen.getByText(/Residential & Permanent Addresses/i)).toBeDefined()
    expect(screen.getByText(/Employment & Workload/i)).toBeDefined()
    expect(screen.getByText(/Salary, Banking & Compliance/i)).toBeDefined()

    // Switch to Addresses tab
    fireEvent.click(screen.getByText(/Residential & Permanent Addresses/i))
    expect(screen.getByText(/Native \/ Permanent Address/i)).toBeDefined()

    // Switch to Banking tab
    fireEvent.click(screen.getByText(/Salary, Banking & Compliance/i))
    expect(screen.getByText(/Primary Bank Name/i)).toBeDefined()
  })

  it('6. TeacherAssignBatchModal renders board, standard, batch, and load allocations', () => {
    const handleClose = vi.fn()
    const queryClient = createTestQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <TeacherAssignBatchModal
          isOpen={true}
          onClose={handleClose}
          teacherId={42}
          teacherName="Dr. Anjali Sharma"
        />
      </QueryClientProvider>
    )

    expect(screen.getByText(/Assign Faculty to Academic Batch/i)).toBeDefined()
    expect(screen.getByText(/Assigning for: Dr. Anjali Sharma/i)).toBeDefined()
    expect(screen.getByText(/Board \*/i)).toBeDefined()
    expect(screen.getByText(/Standard \/ Class \*/i)).toBeDefined()
    expect(screen.getByText(/Batch \/ Division \*/i)).toBeDefined()
    expect(screen.getByText(/Weekly Teaching Hours/i)).toBeDefined()
    expect(screen.getByText(/Designate as Class Teacher/i)).toBeDefined()
  })

  it('7. DocumentPreviewModal renders preview layout and print trigger', () => {
    const handleClose = vi.fn()
    const queryClient = createTestQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <DocumentPreviewModal
          isOpen={true}
          onClose={handleClose}
          formId="appointment_letter"
          userId={42}
          title="Teacher Appointment Letter"
        />
      </QueryClientProvider>
    )

    expect(screen.getByText(/Teacher Appointment Letter/i)).toBeDefined()
    expect(screen.getByText(/Print Document/i)).toBeDefined()
  })
})
