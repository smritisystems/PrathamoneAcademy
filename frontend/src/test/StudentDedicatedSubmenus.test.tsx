/**
 * @file        StudentDedicatedSubmenus.test.tsx
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
 * @description Vitest test suite validating dedicated functional workspaces for Students & Admissions Centre across all 8 submenus, URL synchronization, and Rule 010 View-First governance.
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import StudentsPage from '../pages/Students'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { useEnvironmentStore } from '../store/environmentStore'

// Mock toast notifications
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}))

// Mock API endpoints
vi.mock('../api/endpoints', () => ({
  studentsApi: {
    list: vi.fn().mockResolvedValue({
      data: {
        data: [
          {
            id: 1,
            first_name: 'Aarav',
            last_name: 'Sharma',
            admission_number: 'PA-2026-001',
            gender: 'male',
            date_of_birth: '2010-05-15',
            phone: '9876543210',
            city: 'Mumbai',
            is_active: true,
            standard_id: 1,
            division_id: 1,
          },
          {
            id: 2,
            first_name: 'Diya',
            last_name: 'Patel',
            admission_number: 'PA-2026-002',
            gender: 'female',
            date_of_birth: '2010-08-20',
            phone: '9876543211',
            city: 'Mumbai',
            is_active: false,
            exit_date: '2026-10-15',
            exit_reason: 'Relocated',
            standard_id: 1,
          },
        ],
        total: 2,
        page: 1,
        page_size: 20,
      },
    }),
    create: vi.fn().mockResolvedValue({ data: { id: 3, first_name: 'Rohan' } }),
    getIdCard: vi.fn().mockResolvedValue({
      data: {
        id: 1,
        student_id: 1,
        full_name: 'Aarav Sharma',
        admission_number: 'PA-2026-001',
      },
    }),
  },
  standardsApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        { id: 1, name: 'Standard 10' },
        { id: 2, name: 'Standard 12 Science' },
      ],
    }),
  },
  divisionsApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ],
    }),
  },
  enrollmentsApi: {
    getStats: vi.fn().mockResolvedValue({
      data: {
        total_students: 2,
        total_enrolled: 2,
        total_standards: 2,
        total_divisions: 2,
      },
    }),
    getUnassigned: vi.fn().mockResolvedValue({
      data: [
        {
          id: 10,
          first_name: 'Kabir',
          last_name: 'Mehta',
          admission_number: 'PA-2026-010',
          standard_id: 1,
          standard_name: 'Standard 10',
        },
      ],
    }),
    create: vi.fn().mockResolvedValue({ data: { id: 100, message: 'Enrolled' } }),
    transfer: vi.fn().mockResolvedValue({ data: { message: 'Transferred' } }),
  },
  settingsApi: {
    getAll: vi.fn().mockResolvedValue({
      data: {
        admission: {
          admission_prefix: 'PA-2026-',
          starting_sequence: '1001',
          student_visibility_lists: 'include_all',
          require_aadhaar: true,
          require_transfer_certificate: true,
        },
      },
    }),
    updateBatch: vi.fn().mockResolvedValue({ data: { status: 'success' } }),
  },
}))

describe('Students & Admissions Dedicated Workspaces Suite', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    })

    useAuthStore.setState({
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@prashantacademy.in',
        role: 'superadmin',
        first_name: 'Super',
        last_name: 'Admin',
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
      dataEnvironment: 'PRODUCTION',
    })
  })

  const renderWithRoute = (initialPath = '/students') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="students/*" element={<StudentsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('renders all 8 dedicated navigation tabs', async () => {
    renderWithRoute('/students')

    const nav = screen.getByRole('navigation', { name: 'Students Navigation Tabs' })
    expect(within(nav).getByRole('button', { name: /overview/i })).toBeDefined()
    expect(within(nav).getByRole('button', { name: /master directory/i })).toBeDefined()
    expect(within(nav).getByRole('button', { name: /admissions/i })).toBeDefined()
    expect(within(nav).getByRole('button', { name: /batch allocations/i })).toBeDefined()
    expect(within(nav).getByRole('button', { name: /id cards & badges/i })).toBeDefined()
    expect(within(nav).getByRole('button', { name: /activity history/i })).toBeDefined()
    expect(within(nav).getByRole('button', { name: /reactivations/i })).toBeDefined()
    expect(within(nav).getByRole('button', { name: /settings & policies/i })).toBeDefined()
  })

  it('renders Overview workspace at /students with KPI cards and distribution panel', async () => {
    renderWithRoute('/students/overview')

    expect(await screen.findByText('Student Enrolment & Operations Overview')).toBeDefined()
    expect(screen.getByText('Total Enrolled')).toBeDefined()
    expect(screen.getByText('Active Students')).toBeDefined()
    expect(screen.getByText('Unassigned Queue')).toBeDefined()
    expect(screen.getByText('Archived / Exited')).toBeDefined()
    expect(screen.getByText('Enrolment by Class & Standard')).toBeDefined()
  })

  it('renders Master Directory workspace at /students/directory with student records table', async () => {
    renderWithRoute('/students/directory')

    expect(await screen.findByText('Master Student Directory & Register')).toBeDefined()
    expect(screen.getByPlaceholderText(/search by name, admission no\., phone, city/i)).toBeDefined()
    expect(await screen.findByText('Aarav Sharma')).toBeDefined()
    expect(screen.getByText('PA-2026-001')).toBeDefined()
  })

  it('renders New Admission workspace at /students/admission with KYC application form', async () => {
    renderWithRoute('/students/admission')

    expect(await screen.findByText('New Student Admission & KYC Application')).toBeDefined()
    expect(screen.getByText('1. Personal & Identity Details')).toBeDefined()
    expect(screen.getByText('2. Guardian & Contact Info')).toBeDefined()
    expect(screen.getByText('3. Academic Class & Division Allotment')).toBeDefined()
  })

  it('renders Batch Allocations workspace at /students/allocations with unassigned queue', async () => {
    renderWithRoute('/students/allocations')

    expect(await screen.findByText('Batch & Division Allocations')).toBeDefined()
    expect(screen.getByText(/unassigned students queue/i)).toBeDefined()
    expect(await screen.findByText('Kabir Mehta')).toBeDefined()
  })

  it('renders Student ID Cards workspace at /students/id-cards with CR80 card previews', async () => {
    renderWithRoute('/students/id-cards')

    expect(await screen.findByText('Student ID Cards & Biometric Credentials')).toBeDefined()
    expect(await screen.findByText('Print All Cards')).toBeDefined()
    const badges = await screen.findAllByText('CR80 PVC')
    expect(badges.length).toBeGreaterThan(0)
  })

  it('renders Activity History workspace at /students/history with immutable audit trail', async () => {
    renderWithRoute('/students/history')

    expect(await screen.findByText('Disciplinary & Activity Audit History')).toBeDefined()
    expect(screen.getByText('Export Audit Trail')).toBeDefined()
  })

  it('renders Reactivations workspace at /students/reactivation with archived students', async () => {
    renderWithRoute('/students/reactivation')

    expect(await screen.findByText('Inactive, Exited & Reactivation Centre')).toBeDefined()
    expect(await screen.findByText('Diya Patel')).toBeDefined()
    expect(screen.getByText('PA-2026-002')).toBeDefined()
  })

  it('renders Settings workspace at /students/settings with admission policies', async () => {
    renderWithRoute('/students/settings')

    expect(await screen.findByText('Student Admission Policies & Settings')).toBeDefined()
    expect(screen.getByText('Admission Governance & Policy Settings')).toBeDefined()
    expect(screen.getByText('Automatic Admission Number Prefix')).toBeDefined()
  })

  it('enforces Rule 010 View-First button locking in View Mode', async () => {
    renderWithRoute('/students/overview')

    const lockedButton = await screen.findByText('New Admission (Locked)')
    expect(lockedButton).toBeDefined()
  })

  it('unlocks action button when Edit Mode is active for students:master', async () => {
    act(() => {
      useEditModeStore.setState({
        scopes: { 'students:master': true },
      })
    })

    renderWithRoute('/students/overview')

    expect(await screen.findByRole('button', { name: /^new admission$/i })).toBeDefined()
    expect(screen.queryByText('New Admission (Locked)')).toBeNull()
  })

  it('displays prominent amber TRAINING MODE indicator when training mode is active', async () => {
    act(() => {
      useEnvironmentStore.setState({
        isTrainingMode: true,
        dataEnvironment: 'TRAINING',
      })
    })

    renderWithRoute('/students/overview')

    expect(await screen.findByText(/TRAINING MODE ACTIVE/i)).toBeDefined()
  })
})
