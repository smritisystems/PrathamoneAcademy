/**
 * @file        LeadManagementRBAC.test.tsx
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
 * @created     2026-11-08
 * @updated     2026-11-08
 *
 * @description Comprehensive unit test suite verifying strict separation of CRM Lead operations from Student Admission authorization across Counsellor, Admission Officer, Admin, and Unauthorized roles.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LeadManagement from '../pages/LeadManagement'
import { leadsApi, standardsApi, boardsApi, usersApi, academicYearsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import type { LeadItem, LeadMetricsSummary, LeadKanbanResponse, LeadDossierResponse } from '../types'

vi.mock('../api/endpoints', () => ({
  leadsApi: {
    getLeads: vi.fn(),
    getKanban: vi.fn(),
    getMetrics: vi.fn(),
    getLeadDossier: vi.fn(),
    createLead: vi.fn(),
    updateLead: vi.fn(),
    updateStage: vi.fn(),
    addFollowUp: vi.fn(),
    scheduleDemoClass: vi.fn(),
    convertToAdmission: vi.fn(),
    deleteLead: vi.fn(),
  },
  standardsApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
  boardsApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
  usersApi: {
    getAll: vi.fn().mockResolvedValue({ data: { items: [] } }),
    list: vi.fn().mockResolvedValue({ data: { items: [] } }),
  },
  academicYearsApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

describe('Lead Management & CRM RBAC Separation Specifications', () => {
  let queryClient: QueryClient

  const mockMetrics: LeadMetricsSummary = {
    total_leads: 120,
    total_leads_trend: '+5%',
    new_enquiries: 24,
    follow_ups_today: 8,
    overdue_follow_ups: 3,
    converted: 40,
    lost_leads: 6,
    conversion_rate: 33.3,
    conversion_rate_trend: '+2%',
    sources: [{ source: 'Walk-in', count: 120 }],
    counsellors: [{ name: 'Counsellor Sharma', leads_count: 120 }],
  }

  const mockLead: LeadItem = {
    id: 101,
    lead_number: 'LD-0101',
    first_name: 'Aditya',
    last_name: 'Joshi',
    full_name: 'Aditya Joshi',
    phone: '+91 98111 22233',
    email: 'aditya.j@example.com',
    class_display: 'Std. 10 - CBSE',
    interested_course: 'Science Foundation',
    source: 'Walk-in',
    stage: 'new_enquiry',
    priority: 'hot',
    assigned_to_name: 'Counsellor Sharma',
    next_follow_up_at: '2026-11-10T10:00:00Z',
    guardian_name: 'Sunil Joshi',
    guardian_phone: '+91 98111 22234',
    guardian_relation: 'Father',
    school_name: 'National Public School',
    enquiry_date: '2026-11-01',
    is_active: true,
    created_at: '2026-11-01T08:00:00Z',
  }

  const mockDossier: LeadDossierResponse = {
    ...mockLead,
    follow_ups: [],
    demo_classes: [],
    communication_history: [],
    potential_duplicate_students: [],
  }

  const mockKanban: LeadKanbanResponse = {
    columns: {
      new_enquiry: { key: 'new_enquiry', title: 'New Enquiry', count: 1, items: [mockLead] },
      contacted: { key: 'contacted', title: 'Contacted', count: 0, items: [] },
      counselling_demo: { key: 'counselling_demo', title: 'Counselling / Demo', count: 0, items: [] },
      interested: { key: 'interested', title: 'Interested', count: 0, items: [] },
      admission_pending: { key: 'admission_pending', title: 'Admission Pending', count: 0, items: [] },
      converted: { key: 'converted', title: 'Converted', count: 0, items: [] },
    },
  }

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    vi.clearAllMocks()
    useEditModeStore.setState({ scopes: {}, dirty: {} })

    vi.mocked(leadsApi.getMetrics).mockResolvedValue({ data: mockMetrics } as any)
    vi.mocked(leadsApi.getKanban).mockResolvedValue({ data: mockKanban } as any)
    vi.mocked(leadsApi.getLeads).mockResolvedValue({
      data: { items: [mockLead], total: 1, page: 1, limit: 50, total_pages: 1 },
    } as any)
    vi.mocked(leadsApi.getLeadDossier).mockResolvedValue({ data: mockDossier } as any)
  })

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/leads']}>
          <LeadManagement />
        </MemoryRouter>
      </QueryClientProvider>
    )

  it('ROLE A (Counsellor without students:admission): Activates Edit Mode for CRM but Convert to Admission remains locked with explanation', async () => {
    // Counsellor user: has CRM update permissions, but explicitly lacks 'students:admission'
    useAuthStore.setState({
      user: {
        id: 42,
        username: 'counsellor_sharma',
        email: 'counsellor@prashantacademy.in',
        role: 'staff',
        first_name: 'Counsellor',
        last_name: 'Sharma',
        permissions: [
          'leads:read',
          'leads:create',
          'leads:update',
          'leads:followup',
          'leads:communicate',
          'leads:manage_pipeline',
          'leads:reports',
        ],
      },
      token: 'fake-jwt-token',
      selectedInstitutionId: 1,
      selectedAcademicYearId: 1,
    })

    renderComponent()

    // 1. Initial State: View Mode is active
    expect(screen.getByText(/View Mode Active/i)).toBeDefined()
    const newLeadBtn = screen.getByRole('button', { name: /New Lead/i })
    expect(newLeadBtn.getAttribute('aria-disabled')).toBe('true')

    // 2. Click "Enable Edit Mode"
    const enableEditBtn = screen.getByRole('button', { name: /Enable Edit Mode/i })
    fireEvent.click(enableEditBtn)

    // 3. Edit Mode must ACTIVATE cleanly without demanding 'students:admission'
    await waitFor(() => {
      expect(useEditModeStore.getState().scopes['crm:leads']).toBe(true)
    })
    expect(screen.queryByText(/Permission 'students:admission' is required/i)).toBeNull()

    // 4. "New Lead" button is unlocked
    expect(newLeadBtn.getAttribute('aria-disabled')).toBe('false')

    // 5. "Convert to Admission" button must be LOCKED/DISABLED with clear explanation
    await waitFor(() => {
      expect(screen.getByText(/Convert to Admission \(Locked\)/i)).toBeDefined()
      expect(
        screen.getByText(/Admission conversion requires separate Student Admission authorization. You can continue managing this lead in CRM./i)
      ).toBeDefined()
    })
  })

  it('ROLE B (Admission Officer with students:admission): Can unlock Convert to Admission in Edit Mode', async () => {
    // Admission Officer user: possesses 'students:admission' privilege
    useAuthStore.setState({
      user: {
        id: 55,
        username: 'admission_officer',
        email: 'admission@prashantacademy.in',
        role: 'staff',
        first_name: 'Priya',
        last_name: 'Patil',
        permissions: [
          'leads:read',
          'leads:create',
          'leads:update',
          'students:admission',
        ],
      },
      token: 'fake-jwt-token',
      selectedInstitutionId: 1,
      selectedAcademicYearId: 1,
    })

    renderComponent()

    // Activate Edit Mode
    const enableEditBtn = screen.getByRole('button', { name: /Enable Edit Mode/i })
    fireEvent.click(enableEditBtn)

    await waitFor(() => {
      expect(useEditModeStore.getState().scopes['crm:leads']).toBe(true)
    })

    // "Convert to Admission" must be fully unlocked
    await waitFor(() => {
      const convertBtn = screen.getByRole('button', { name: /Convert to Admission/i })
      expect(convertBtn).toBeDefined()
      expect(convertBtn.getAttribute('aria-disabled')).toBe('false')
      expect(screen.queryByText(/Convert to Admission \(Locked\)/i)).toBeNull()
    })
  })

  it('ROLE C (Administrator with universal access): Full governance over CRM and Admission Conversion', async () => {
    useAuthStore.setState({
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@prashantacademy.in',
        role: 'admin',
        first_name: 'Jawahar',
        last_name: 'Mallah',
        permissions: ['*:*'],
      },
      token: 'fake-jwt-token',
      selectedInstitutionId: 1,
      selectedAcademicYearId: 1,
    })

    renderComponent()

    const enableEditBtn = screen.getByRole('button', { name: /Enable Edit Mode/i })
    fireEvent.click(enableEditBtn)

    await waitFor(() => {
      expect(useEditModeStore.getState().scopes['crm:leads']).toBe(true)
      const convertBtn = screen.getByRole('button', { name: /Convert to Admission/i })
      expect(convertBtn).toBeDefined()
      expect(convertBtn.getAttribute('aria-disabled')).toBe('false')
    })
  })

  it('ROLE D (Unauthorized User without leads:read): Access Denied screen rendered, CRM workspace blocked', async () => {
    useAuthStore.setState({
      user: {
        id: 99,
        username: 'unauthorized_staff',
        email: 'unauth@prashantacademy.in',
        role: 'staff',
        first_name: 'Unauthorized',
        last_name: 'User',
        permissions: ['students:read'], // No leads permissions
      },
      token: 'fake-jwt-token',
      selectedInstitutionId: 1,
      selectedAcademicYearId: 1,
    })

    renderComponent()

    expect(screen.getByText(/Access Denied/i)).toBeDefined()
    expect(
      screen.getByText(/You do not have permission to access the Lead Management & CRM module/i)
    ).toBeDefined()
    expect(screen.queryByText(/View Mode Active/i)).toBeNull()
    expect(screen.queryByRole('button', { name: /New Lead/i })).toBeNull()
  })
})
