/**
 * @file        CourseDedicatedSubmenus.test.tsx
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
 * @description Vitest test suite validating dedicated functional workspaces for Study Materials & Digital Content across all 8 submenus, URL synchronization, and Rule 010 View-First governance.
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CoursesPage from '../pages/Courses'
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
  studyMaterialsApi: {
    list: vi.fn().mockResolvedValue({
      data: {
        items: [
          {
            id: 1,
            standard_id: 11,
            standard_name: 'Standard 11',
            subject_id: 101,
            subject_name: 'Physics',
            division_id: 1,
            division_name: 'A',
            title: 'Thermodynamics Handout',
            description: 'Comprehensive laws of thermodynamics booklet',
            file_type: 'Notes',
            file_url: '/materials/thermo.pdf',
            file_size_bytes: 2048000,
            created_at: '2026-11-01T10:00:00Z',
          },
          {
            id: 2,
            standard_id: 12,
            standard_name: 'Standard 12',
            subject_id: 102,
            subject_name: 'Chemistry',
            division_id: null,
            division_name: null,
            title: 'Organic Reaction Mechanisms DPP',
            description: '50 graded problem sets for JEE Advanced',
            file_type: 'Question Bank',
            file_url: '/materials/organic_dpp.pdf',
            file_size_bytes: 4096000,
            created_at: '2026-11-02T12:00:00Z',
          },
        ],
        total: 2,
        skip: 0,
        limit: 100,
      },
    }),
    getStats: vi.fn().mockResolvedValue({
      data: {
        total_materials: 24,
        standards_covered: 6,
        subjects_covered: 12,
        question_banks: 8,
        formula_sheets: 4,
        notes: 10,
        assignments: 2,
        revision: 3,
        type_breakdown: { Notes: 10, 'Question Bank': 8, 'Formula Sheet': 4 },
      },
    }),
    create: vi.fn().mockResolvedValue({
      data: { success: true, message: 'Study material saved successfully!', id: 10, title: 'Sample' },
    }),
    update: vi.fn().mockResolvedValue({
      data: { success: true, message: 'Study material updated successfully!', id: 1, title: 'Sample' },
    }),
    delete: vi.fn().mockResolvedValue({
      data: { success: true, message: 'Study material deleted successfully.', id: 1 },
    }),
  },
  standardsApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        { id: 11, name: 'Standard 11' },
        { id: 12, name: 'Standard 12' },
      ],
    }),
  },
  subjectsApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        { id: 101, standard_id: 11, name: 'Physics' },
        { id: 102, standard_id: 12, name: 'Chemistry' },
      ],
    }),
  },
  divisionsApi: {
    list: vi.fn().mockResolvedValue({
      data: [{ id: 1, standard_id: 11, name: 'A' }],
    }),
  },
}))

describe('Study Materials & Digital Content Dedicated Workspaces Suite', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    })
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

  const renderWithRoute = (initialPath: string) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="courses/*" element={<CoursesPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('renders Overview workspace at /courses/overview with KPIs, shortcuts, and recent uploads', async () => {
    renderWithRoute('/courses/overview')

    expect(await screen.findByText('Study Materials & Digital Content Overview')).toBeDefined()
    expect(screen.getByText('Total Materials')).toBeDefined()
    expect(screen.getByText('Standards')).toBeDefined()
    expect(screen.getAllByText('Question Banks').length).toBeGreaterThan(0)
    expect(screen.getByText('Formula Handbooks')).toBeDefined()
    expect(screen.getByText('Academic Streams')).toBeDefined()
    expect(await screen.findByText('Recently Published Study Materials')).toBeDefined()
  })

  it('renders default Overview workspace when navigating to base /courses route', async () => {
    renderWithRoute('/courses')

    expect(await screen.findByText('Study Materials & Digital Content Overview')).toBeDefined()
    expect(screen.getByText('Total Materials')).toBeDefined()
  })

  it('renders Master Content Library at /courses/repository with filters and table', async () => {
    renderWithRoute('/courses/repository')

    expect(await screen.findByText('Master Content Library & Subject Explorer')).toBeDefined()
    expect(screen.getByPlaceholderText('Search materials by title or topic...')).toBeDefined()
    expect(screen.getByText('All Standards')).toBeDefined()
    expect(screen.getByText('All Subjects')).toBeDefined()
    expect(screen.getByText('All Resource Types')).toBeDefined()
    expect(await screen.findByText('Thermodynamics Handout')).toBeDefined()
    expect(screen.getByText('Organic Reaction Mechanisms DPP')).toBeDefined()
  })

  it('renders Digital Content Upload workspace at /courses/upload with form sections', async () => {
    renderWithRoute('/courses/upload')

    expect(await screen.findByText('Digital Content Upload & File Registration')).toBeDefined()
    expect(screen.getByText('1. Academic Mapping Details')).toBeDefined()
    expect(screen.getByText('2. Resource Content & File Metadata')).toBeDefined()
    expect(screen.getByPlaceholderText(/Thermodynamics & Heat Transfer/i)).toBeDefined()
  })

  it('renders Chapter Notes workspace at /courses/notes with handouts grid', async () => {
    renderWithRoute('/courses/notes')

    expect(await screen.findByText('Chapter Notes, Theory Handouts & Study Guides')).toBeDefined()
    expect(await screen.findByText('Thermodynamics Handout')).toBeDefined()
  })

  it('renders Question Banks workspace at /courses/question-banks with DPP practice items', async () => {
    renderWithRoute('/courses/question-banks')

    expect(await screen.findByText('Question Banks, DPPs & Model Test Papers')).toBeDefined()
    expect(await screen.findByText('Organic Reaction Mechanisms DPP')).toBeDefined()
  })

  it('renders Video Lectures workspace at /courses/video-lectures with video cards', async () => {
    renderWithRoute('/courses/video-lectures')

    expect(await screen.findByText('Recorded Lectures & Video Stream Centre')).toBeDefined()
    expect(screen.getByText('Rotational Dynamics & Moment of Inertia Masterclass')).toBeDefined()
    expect(screen.getByText('Chemical Equilibrium & Le Chatelier Principle')).toBeDefined()
  })

  it('renders Curriculum Syllabi workspace at /courses/syllabi with structured academic tracks', async () => {
    renderWithRoute('/courses/syllabi')

    expect(await screen.findByText('Curriculum Syllabi & Academic Streams')).toBeDefined()
    expect(screen.getByText('CBSE Senior Secondary (Class 11 & 12)')).toBeDefined()
    expect(screen.getByText('IIT-JEE Target (Main & Advanced)')).toBeDefined()
    expect(screen.getByText('NEET-UG Medical Entrance Intensive')).toBeDefined()
  })

  it('renders Storage Policies workspace at /courses/settings with cloud quotas and file rules', async () => {
    renderWithRoute('/courses/settings')

    expect(await screen.findByText('Storage Policies, File Formats & Quotas')).toBeDefined()
    expect(screen.getByText('Maximum Single File Upload Size (MB)')).toBeDefined()
    expect(screen.getByText('Cloud Storage Provider')).toBeDefined()
    expect(screen.getByText('Dynamic Student Watermarking')).toBeDefined()
    expect(screen.getByText('Allow Offline Document Downloads')).toBeDefined()
  })

  it('enforces Rule 010 View-First lock on primary buttons when Edit Mode is inactive', async () => {
    renderWithRoute('/courses/overview')

    // Find the lock button in the header
    const lockedHeaderBtn = await screen.findByTitle(/locked in view mode: enable edit mode above to perform this action/i)
    expect(lockedHeaderBtn.className).toContain('cursor-not-allowed')
  })

  it('enables mutating actions when explicit Edit Mode is active', async () => {
    useEditModeStore.setState({
      scopes: { 'academic:study_materials': true },
    })

    renderWithRoute('/courses/overview')

    const headerButtons = await screen.findAllByRole('button', { name: /upload content/i })
    expect(headerButtons[0].className).not.toContain('cursor-not-allowed')
    expect(headerButtons[0].className).toContain('bg-primary-600')
  })

  it('displays prominent amber Training Mode badge when training mode is active', async () => {
    useEnvironmentStore.setState({
      isTrainingMode: true,
    })

    renderWithRoute('/courses/overview')

    expect(await screen.findByText(/training mode active:/i)).toBeDefined()
    expect(screen.getByText(/all uploads and study materials are isolated to the training environment/i)).toBeDefined()
  })
})
