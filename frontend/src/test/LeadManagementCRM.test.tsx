/**
 * @file        LeadManagementCRM.test.tsx
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
 * @updated     2026-11-11
 *
 * @description Comprehensive unit test suite for Lead Management & CRM workspace verifying KPI metric cards, Kanban pipeline, Lead Dossier, bottom table tabs, and Rule 010 View-First safety lock enforcement.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LeadManagement from '../pages/LeadManagement'
import { leadsApi, standardsApi, boardsApi, usersApi, academicYearsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { LeadItem, LeadMetricsSummary, LeadKanbanResponse, LeadDossierResponse } from '../types'

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
  feeStructuresApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    getAll: vi.fn().mockResolvedValue({ data: [] }),
  },
  concessionsApi: {
    getTypes: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

describe('Lead Management & CRM Workspace', () => {
  let queryClient: QueryClient

  const mockMetrics: LeadMetricsSummary = {
    total_leads: 286,
    total_leads_trend: '+12%',
    new_enquiries: 48,
    follow_ups_today: 19,
    overdue_follow_ups: 7,
    converted: 96,
    lost_leads: 18,
    conversion_rate: 33.6,
    conversion_rate_trend: '+5.2%',
    sources: [
      { source: 'Website', count: 120 },
      { source: 'Walk-in', count: 80 },
    ],
    counsellors: [
      { name: 'Krutikaa S.', leads_count: 140 },
      { name: 'Prashant K.', leads_count: 146 },
    ],
  }

  const mockLead1: LeadItem = {
    id: 1,
    lead_number: 'LD-0286',
    first_name: 'Aarav',
    last_name: 'Sharma',
    full_name: 'Aarav Sharma',
    phone: '+91 98765 43210',
    email: 'aarav.sharma@gmail.com',
    class_display: 'Std. 10 - CBSE',
    interested_course: 'JEE Foundation',
    source: 'Website',
    stage: 'new_enquiry',
    priority: 'hot',
    assigned_to_name: 'Krutikaa S.',
    next_follow_up_at: '2026-10-29T11:00:00Z',
    guardian_name: 'Sunil Sharma',
    guardian_phone: '+91 98765 43211',
    created_at: '2026-10-27T10:00:00Z',
  }

  const mockLead2: LeadItem = {
    id: 2,
    lead_number: 'LD-0285',
    first_name: 'Riya',
    last_name: 'Patil',
    full_name: 'Riya Patil',
    phone: '+91 98201 55433',
    email: 'riya.patil@outlook.com',
    class_display: 'Std. 9 - State Board',
    interested_course: 'Maths + Science',
    source: 'Walk-in',
    stage: 'new_enquiry',
    priority: 'warm',
    assigned_to_name: 'Prashant K.',
    next_follow_up_at: '2026-10-29T12:30:00Z',
    created_at: '2026-10-27T11:00:00Z',
  }

  const mockKanban: LeadKanbanResponse = {
    columns: {
      new_enquiry: {
        key: 'new_enquiry',
        title: 'New Enquiry',
        count: 2,
        items: [mockLead1, mockLead2],
      },
      contacted: {
        key: 'contacted',
        title: 'Contacted',
        count: 0,
        items: [],
      },
      counselling_demo: {
        key: 'counselling_demo',
        title: 'Counselling / Demo',
        count: 0,
        items: [],
      },
      interested: {
        key: 'interested',
        title: 'Interested',
        count: 0,
        items: [],
      },
      admission_pending: {
        key: 'admission_pending',
        title: 'Admission Pending',
        count: 0,
        items: [],
      },
      converted: {
        key: 'converted',
        title: 'Converted',
        count: 0,
        items: [],
      },
    },
  }

  const mockDossier: LeadDossierResponse = {
    ...mockLead1,
    follow_ups: [
      {
        id: 1,
        follow_up_type: 'call',
        stage_at_time: 'new_enquiry',
        status: 'completed',
        scheduled_at: '2026-10-27T10:00:00Z',
        outcome: 'interested',
        remarks: 'Spoke with parent Mr. Sunil Sharma regarding JEE Foundation course.',
        performed_by_name: 'Krutikaa S.',
        created_at: '2026-10-27T10:00:00Z',
      },
    ],
    demo_classes: [],
    communication_history: [],
    potential_duplicate_students: [],
  }

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
        email: 'admin@prashantacademy.in',
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

    vi.mocked(leadsApi.getMetrics).mockResolvedValue({ data: mockMetrics } as any)
    vi.mocked(leadsApi.getKanban).mockResolvedValue({ data: mockKanban } as any)
    vi.mocked(leadsApi.getLeads).mockResolvedValue({
      data: {
        items: [mockLead1, mockLead2],
        total: 2,
        page: 1,
        limit: 50,
        total_pages: 1,
      },
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

  it('renders header, title, and all 7 KPI metric cards correctly', async () => {
    renderComponent()

    expect(screen.getByText('Lead Management & CRM')).toBeDefined()
    expect(
      screen.getByText('Manage enquiries, follow-ups, counselling and convert leads to admissions')
    ).toBeDefined()

    await waitFor(() => {
      // 7 KPI metric cards
      expect(screen.getByText('Total Leads')).toBeDefined()
      expect(screen.getByText('286')).toBeDefined()
      expect(screen.getByText('New Enquiries')).toBeDefined()
      expect(screen.getByText('48')).toBeDefined()
      expect(screen.getByText('Follow-ups Today')).toBeDefined()
      expect(screen.getByText('19')).toBeDefined()
      expect(screen.getByText('Overdue Follow-ups')).toBeDefined()
      expect(screen.getByText('7')).toBeDefined()
      expect(screen.getAllByText('Converted').length).toBeGreaterThan(0)
      expect(screen.getByText('96')).toBeDefined()
      expect(screen.getByText('Lost Leads')).toBeDefined()
      expect(screen.getByText('18')).toBeDefined()
      expect(screen.getByText('Conversion Rate')).toBeDefined()
      expect(screen.getAllByText(/33\.6%/).length).toBeGreaterThan(0)
    })
  })

  it('enforces Rule 010 View-First safety lock by default and unlocks upon activating Edit Mode', async () => {
    renderComponent()

    // Rule 010 View-First bar must be active
    expect(screen.getByText(/View Mode Active/i)).toBeDefined()
    expect(screen.getByText(/Read-Only Safety Lock/i)).toBeDefined()

    // Find the "New Lead" button (in View Mode it displays locked treatment and aria-disabled="true")
    const newLeadButton = screen.getByRole('button', { name: /New Lead/i })
    expect(newLeadButton).toBeDefined()
    expect(newLeadButton.getAttribute('aria-disabled')).toBe('true')

    // Activate Edit Mode
    const enableEditButton = screen.getByRole('button', { name: /Enable Edit Mode/i })
    fireEvent.click(enableEditButton)

    await waitFor(() => {
      expect(useEditModeStore.getState().scopes['crm:leads']).toBe(true)
    })

    // Button should now be unlocked
    expect(newLeadButton.getAttribute('aria-disabled')).toBe('false')
  })

  it('renders Kanban pipeline columns and cards matching high-fidelity UI', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Pipeline (Kanban)')).toBeDefined()
      expect(screen.getAllByText('New Enquiry').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Contacted').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Counselling / Demo').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Interested').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Admission Pending').length).toBeGreaterThan(0)

      // Aarav Sharma and Riya Patil cards
      expect(screen.getAllByText('Aarav Sharma').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Riya Patil').length).toBeGreaterThan(0)
    })
  })

  it('displays Lead Dossier side-panel with Quick Actions and tabs', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Lead Dossier')).toBeDefined()
      expect(screen.getAllByText('LD-0286').length).toBeGreaterThan(0)
      expect(screen.getByText('Call')).toBeDefined()
      expect(screen.getAllByText('WhatsApp').length).toBeGreaterThan(0)
      expect(screen.getByText('Email')).toBeDefined()
      expect(screen.getByText('Schedule')).toBeDefined()
      expect(screen.getByText('Convert to Admission')).toBeDefined()
    })
  })

  it('switches bottom table tabs between Recent Leads, My Follow-ups, Overdue, Converted, Lost', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Recent Leads/i })).toBeDefined()
      expect(screen.getByRole('button', { name: /My Follow-ups/i })).toBeDefined()
      expect(screen.getByRole('button', { name: /Overdue/i })).toBeDefined()
      expect(screen.getByRole('button', { name: /Lost/i })).toBeDefined()
    })

    // Click Overdue tab
    const overdueButton = screen.getByRole('button', { name: /Overdue/i })
    fireEvent.click(overdueButton)

    expect(leadsApi.getLeads).toHaveBeenCalledWith(
      expect.objectContaining({ follow_up_filter: 'overdue' })
    )
  })
})
