/**
 * @file        StudyMaterials.test.tsx
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
 * @updated     2026-11-10
 *
 * @description Vitest suite for Study Materials & Academic Programs management console.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

import CoursesPage from '../pages/Courses'
import { studyMaterialsApi, standardsApi, subjectsApi, divisionsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'

// Mock APIs
vi.mock('../api/endpoints', () => ({
  studyMaterialsApi: {
    list: vi.fn(),
    getStats: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  standardsApi: {
    list: vi.fn(),
  },
  subjectsApi: {
    list: vi.fn(),
  },
  divisionsApi: {
    list: vi.fn(),
  },
}))

describe('Study Materials & Academic Programs Console (CoursesPage)', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    vi.clearAllMocks()

    useAuthStore.setState({
      user: {
        id: 1,
        username: 'admin',
        role: 'admin',
        email: 'admin@prashantacademy.com',
        institution_id: 1,
      } as any,
      selectedInstitutionId: 1,
    })

    useEditModeStore.setState({
      scopes: {},
    })

    // Mock API data
    vi.mocked(studyMaterialsApi.getStats).mockResolvedValue({
      data: {
        total_materials: 10,
        standards_covered: 3,
        subjects_covered: 5,
        question_banks: 2,
        formula_sheets: 3,
        notes: 3,
        assignments: 1,
        revision: 1,
        type_breakdown: {},
      },
    } as any)

    vi.mocked(studyMaterialsApi.list).mockResolvedValue({
      data: {
        items: [
          {
            id: 13,
            institution_id: 1,
            standard_id: 10,
            standard_name: 'Standard 10',
            subject_id: 1,
            subject_name: 'Mathematics',
            division_id: null,
            division_name: null,
            title: 'Class X Mathematics - Complete Formula Booklet & Theorems',
            description: 'Comprehensive coaching notes, concept maps, and practice questions.',
            file_type: 'Formula Sheet',
            file_url: '/materials/math10_formulas.pdf',
            file_size_bytes: 1850000,
            created_at: '2026-11-04T14:26:35Z',
          },
        ],
        total: 1,
        skip: 0,
        limit: 100,
      },
    } as any)

    vi.mocked(standardsApi.list).mockResolvedValue({
      data: [{ id: 10, name: 'Standard 10' }],
    } as any)

    vi.mocked(subjectsApi.list).mockResolvedValue({
      data: [{ id: 1, name: 'Mathematics', standard_id: 10 }],
    } as any)

    vi.mocked(divisionsApi.list).mockResolvedValue({
      data: [{ id: 1, name: 'Division A', standard_id: 10 }],
    } as any)
  })

  it('renders workspace header, metric cards, and study materials library tab', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CoursesPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('Study Materials & Digital Content Overview')).toBeDefined()
    expect(screen.getByText('Total Materials')).toBeDefined()
    expect(screen.getByText('Standards')).toBeDefined()
    expect(screen.getAllByText('Question Banks').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Formula Handbooks')).toBeDefined()

    await waitFor(() => {
      expect(screen.getByText('Class X Mathematics - Complete Formula Booklet & Theorems')).toBeDefined()
      expect(screen.getAllByText('Formula Sheet').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('switches between Study Materials and Coaching Programs tabs', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CoursesPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    const programsTab = screen.getByRole('button', { name: /Curriculum Syllabi/i })
    fireEvent.click(programsTab)

    expect(screen.getByText('CBSE Senior Secondary (Class 11 & 12)')).toBeDefined()
    expect(screen.getByText('IIT-JEE Target (Main & Advanced)')).toBeDefined()
    expect(screen.getByText('NEET-UG Medical Entrance Intensive')).toBeDefined()
  })

  it('enforces View Mode lock on Upload Material button when Edit Mode is inactive', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CoursesPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    const uploadBtns = screen.getAllByRole('button', { name: /Upload Content/i })
    expect(uploadBtns[0].title).toContain('Locked in View Mode')
  })

  it('enables Upload Material button when Edit Mode is activated', async () => {
    useEditModeStore.setState({
      scopes: { 'academic:study_materials': true },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CoursesPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    const uploadBtns = screen.getAllByRole('button', { name: /Upload Content/i })
    expect(uploadBtns[0].title).not.toContain('Locked in View Mode')
  })
})
