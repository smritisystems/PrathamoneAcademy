/**
 * @file        StudentsAcademicCoordinates.test.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.test
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-23
 * @updated     2026-11-23
 *
 * @description Vitest test suite validating that Master Student Directory renders Standard/Grade, Batch, and Board columns and displays student academic coordinates.
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import StudentsPage from '../pages/Students'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { useEnvironmentStore } from '../store/environmentStore'

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}))

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
            phone: '8779123007',
            city: 'Mumbai',
            is_active: true,
            standard_id: 1,
            standard_name: 'Grade 10',
            division_id: 1,
            division_name: 'Batch Titans',
            board_id: 1,
            board_name: 'CBSE',
            roll_number: '101',
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
            is_active: true,
            standard_id: null,
            standard_name: null,
            division_id: null,
            division_name: null,
            board_id: null,
            board_name: null,
            roll_number: null,
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
        { id: 1, name: 'Grade 10' },
      ],
    }),
  },
  divisionsApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        { id: 1, name: 'Batch Titans' },
      ],
    }),
  },
  enrollmentsApi: {
    getStats: vi.fn().mockResolvedValue({
      data: {
        total_students: 2,
        total_enrolled: 1,
        total_standards: 1,
        total_divisions: 1,
      },
    }),
    getUnassigned: vi.fn().mockResolvedValue({
      data: [],
    }),
  },
  settingsApi: {
    getAll: vi.fn().mockResolvedValue({
      data: {
        admission: {
          admission_prefix: 'PA-2026-',
          starting_sequence: '1001',
        },
      },
    }),
  },
}))

describe('Students Academic Coordinates Table Suite', () => {
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

  it('renders Standard/Grade, Batch, and Board headers and student values in directory table', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/students/directory']}>
          <Routes>
            <Route path="students/*" element={<StudentsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Verify Column Headers exist
    expect(await screen.findByText('Standard / Grade')).toBeDefined()
    expect(screen.getByText('Batch')).toBeDefined()
    expect(screen.getByText('Board')).toBeDefined()

    // Verify Student 1 academic coordinates values are displayed
    const gradeElements = await screen.findAllByText('Grade 10')
    expect(gradeElements.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Batch Titans')).toBeDefined()
    expect(screen.getByText('CBSE')).toBeDefined()

    // Verify Student 2 with null coordinates renders fallback dash
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })
})
