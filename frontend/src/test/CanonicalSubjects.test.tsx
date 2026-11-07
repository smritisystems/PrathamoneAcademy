/**
 * @file        CanonicalSubjects.test.tsx
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
 * @description Comprehensive test suite validating Canonical Subject Master architecture, dual view modes, live duplicate prevention, and View-First Edit Mode governance.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SubjectsPage from '../pages/Subjects'
import { useEditModeStore } from '../store/editModeStore'
import { useAuthStore } from '../store/authStore'
import { subjectsApi, standardsApi, boardsApi } from '../api/endpoints'
import type { User, CanonicalSubject, SubjectMappingItem } from '../types'

vi.mock('../api/endpoints', () => ({
  standardsApi: {
    list: vi.fn(),
  },
  boardsApi: {
    list: vi.fn(),
  },
  subjectsApi: {
    list: vi.fn(),
    listCanonical: vi.fn(),
    listMappings: vi.fn(),
    createCanonical: vi.fn(),
    createMapping: vi.fn(),
    checkDuplicate: vi.fn(),
    deleteCanonical: vi.fn(),
    deleteMapping: vi.fn(),
  },
}))

describe('Canonical Subject Master & Applicability Mappings Suite', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  const adminUser: User = {
    id: 1,
    username: 'admin',
    email: 'admin@prashant.edu',
    first_name: 'Admin',
    last_name: 'User',
    role: 'admin',
    institution_id: 1,
    permissions: ['academic:manage'],
  }

  const mockStandards = [
    { id: 4, name: 'Class IV', level: 4, institution_id: 1, is_active: true },
    { id: 8, name: 'Class VIII', level: 8, institution_id: 1, is_active: true },
    { id: 10, name: 'Class X', level: 10, institution_id: 1, is_active: true },
  ]

  const mockBoards = [
    { id: 1, name: 'ICSE Board', code: 'ICSE', institution_id: 1, is_active: true },
    { id: 2, name: 'CBSE Board', code: 'CBSE', institution_id: 1, is_active: true },
  ]

  const mockCanonicalSubjects: CanonicalSubject[] = [
    {
      id: 1,
      name: 'Mathematics',
      code: 'MATH001',
      category: 'Mathematics',
      description: 'Core mathematics curriculum',
      aliases: 'Math, Maths',
      is_active: true,
      mappings_count: 3,
      standards_count: 3,
      boards_count: 2,
      standards_summary: ['Class IV', 'Class VIII', 'Class X'],
      boards_summary: ['ICSE', 'CBSE'],
    },
    {
      id: 2,
      name: 'English',
      code: 'ENG001',
      category: 'Languages',
      description: 'English language and literature',
      aliases: 'English Language',
      is_active: true,
      mappings_count: 2,
      standards_count: 2,
      boards_count: 1,
      standards_summary: ['Class IV', 'Class X'],
      boards_summary: ['ICSE'],
    },
  ]

  const mockMappings: SubjectMappingItem[] = [
    {
      id: 1,
      canonical_subject_id: 1,
      canonical_name: 'Mathematics',
      canonical_code: 'MATH001',
      standard_id: 10,
      standard_name: 'Class X',
      board_id: 1,
      board_code: 'ICSE',
      curriculum_code: 'MATH-10',
      display_name: 'Mathematics',
      max_marks: 100,
      pass_marks: 35,
      is_optional: false,
      display_order: 1,
      is_active: true,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    useEditModeStore.getState().resetAll()
    useAuthStore.setState({ user: adminUser, token: 'mock-token', selectedInstitutionId: 1 })

    vi.mocked(standardsApi.list).mockResolvedValue({ data: mockStandards } as any)
    vi.mocked(boardsApi.list).mockResolvedValue({ data: mockBoards } as any)
    vi.mocked(subjectsApi.listCanonical).mockResolvedValue({ data: mockCanonicalSubjects } as any)
    vi.mocked(subjectsApi.listMappings).mockResolvedValue({ data: mockMappings } as any)
  })

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <SubjectsPage />
      </QueryClientProvider>
    )

  it('RULE 1: Renders in View Mode by default with locked action controls', async () => {
    renderComponent()

    // Title and SSOT badge
    expect(screen.getByText('Academic Subjects')).toBeDefined()
    expect(screen.getByText('SSOT Governed')).toBeDefined()

    // Locked button present
    expect(screen.getByText(/Add \/ Map Subject \(Locked\)/i)).toBeDefined()

    // Dual-view tabs
    expect(screen.getByText(/Common Subject Master/i)).toBeDefined()
    expect(screen.getByText(/Standard & Board Mappings/i)).toBeDefined()
  })

  it('RULE 2: Displays canonical subject catalogue with permanent codes and mapping summaries', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('MATH001')).toBeDefined()
      expect(screen.getAllByText('Mathematics').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('ENG001')).toBeDefined()
      expect(screen.getAllByText('English').length).toBeGreaterThanOrEqual(1)
    })

    // Verify standards summary badges
    expect(screen.getAllByText('Class IV').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Class VIII').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Class X').length).toBeGreaterThanOrEqual(1)
  })

  it('RULE 3: Switches seamlessly to Standard & Board Mappings view', async () => {
    renderComponent()

    const mappingsTab = screen.getByText(/Standard & Board Mappings/i)
    fireEvent.click(mappingsTab)

    await waitFor(() => {
      expect(screen.getByText('Curriculum Applicability Mappings')).toBeDefined()
      expect(screen.getByText('MATH-10')).toBeDefined()
    })
  })

  it('RULE 4: Unlocks mutation controls when explicit Edit Mode is activated', async () => {
    renderComponent()

    // Enable Edit Mode
    useEditModeStore.getState().enableEditMode('academic:subjects', adminUser)

    await waitFor(() => {
      // Locked button replaced by active Add / Map Subject button
      expect(screen.queryByText(/Add \/ Map Subject \(Locked\)/i)).toBeNull()
      expect(screen.getByText(/Add \/ Map Subject/i)).toBeDefined()
    })
  })

  it('RULE 5: Warns user on duplicate canonical subject registration attempt', async () => {
    useEditModeStore.getState().enableEditMode('academic:subjects', adminUser)
    vi.mocked(subjectsApi.checkDuplicate).mockResolvedValue({
      data: {
        has_exact_match: true,
        exact_match: {
          id: 1,
          name: 'Mathematics',
          code: 'MATH001',
          category: 'Mathematics',
        },
        similar_matches: [],
        message: "An existing canonical subject 'Mathematics' (MATH001) was found. Reusing it will link this curriculum mapping without duplicating master identities.",
      },
    } as any)

    renderComponent()

    // Open Modal
    const addBtn = screen.getByText(/Add \/ Map Subject/i)
    fireEvent.click(addBtn)

    // Switch to Register New Master Subject
    const registerTab = screen.getByText(/Register New Master Subject/i)
    fireEvent.click(registerTab)

    // Type 'Mathematics'
    const nameInput = screen.getByPlaceholderText(/e\.g\. Mathematics, Sanskrit/i)
    fireEvent.change(nameInput, { target: { value: 'Mathematics' } })

    await waitFor(() => {
      expect(screen.getByText(/Duplicate Subject Warning:/i)).toBeDefined()
      expect(screen.getByText(/Reuse 'Mathematics' \(MATH001\) Instead/i)).toBeDefined()
    })
  })
})
