/**
 * @file        CrmDedicatedSubmenus.test.tsx
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
 * @description Comprehensive unit and integration test suite verifying all 9 dedicated CRM submenu workspaces: Overview, Register, Pipeline, Follow-ups, Counselling, Sources, Campaigns, Reports, and Settings.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CrmOverviewPage from '../pages/crm/CrmOverviewPage'
import LeadRegisterPage from '../pages/crm/LeadRegisterPage'
import LeadPipelinePage from '../pages/crm/LeadPipelinePage'
import FollowUpCentrePage from '../pages/crm/FollowUpCentrePage'
import CounsellingDemoPage from '../pages/crm/CounsellingDemoPage'
import LeadSourcesPage from '../pages/crm/LeadSourcesPage'
import CampaignsPage from '../pages/crm/CampaignsPage'
import CrmReportsPage from '../pages/crm/CrmReportsPage'
import CrmSettingsPage from '../pages/crm/CrmSettingsPage'
import { leadsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useEnvironmentStore } from '../store/environmentStore'

vi.mock('../api/endpoints', () => ({
  leadsApi: {
    getMetrics: vi.fn(),
    getLeads: vi.fn(),
    getKanban: vi.fn(),
    getFollowUps: vi.fn(),
    getDemoClasses: vi.fn(),
    getSourcesSummary: vi.fn(),
    getCampaignsSummary: vi.fn(),
    getReportsAnalytics: vi.fn(),
    getCrmConfig: vi.fn(),
    getLeadDossier: vi.fn(),
    createLead: vi.fn(),
    updateStage: vi.fn(),
    addFollowUp: vi.fn(),
    updateDemoClass: vi.fn(),
    updateCrmConfig: vi.fn(),
    seedDemo: vi.fn(),
    deleteLead: vi.fn(),
  },
  standardsApi: {
    getAll: vi.fn().mockResolvedValue({ data: [{ id: 1, name: 'Std. 10' }] }),
  },
  boardsApi: {
    getAll: vi.fn().mockResolvedValue({ data: [{ id: 1, name: 'CBSE' }] }),
  },
  usersApi: {
    getAll: vi.fn().mockResolvedValue({ data: { items: [{ id: 1, first_name: 'Pooja', last_name: 'Sharma', role: 'teacher' }] } }),
  },
  academicYearsApi: {
    getAll: vi.fn().mockResolvedValue({ data: [{ id: 1, name: '2026-2027' }] }),
  },
}))

describe('CRM Submenu Dedicated Workspaces Suite', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    vi.clearAllMocks()

    useAuthStore.setState({
      user: {
        id: 1,
        username: 'admin_test',
        email: 'admin@prashantacademy.com',
        role: 'admin',
        first_name: 'System',
        last_name: 'Administrator',
        permissions: ['leads:read', 'leads:create', 'leads:update', 'leads:delete', 'students:admission'],
      } as any,
      token: 'fake-jwt',
    })

    useEnvironmentStore.setState({
      dataEnvironment: 'PRODUCTION',
      isTrainingMode: false,
    })
  })

  // 1. Overview Page
  it('renders Overview — CRM Dashboard with 7 KPI metrics and navigation', async () => {
    vi.mocked(leadsApi.getMetrics).mockResolvedValue({
      data: {
        total_leads: 125,
        total_leads_trend: '+10%',
        new_enquiries: 20,
        follow_ups_today: 8,
        overdue_follow_ups: 3,
        converted: 45,
        lost_leads: 5,
        conversion_rate: 36.0,
        conversion_rate_trend: '+4%',
        sources: [],
        counsellors: [],
      },
    } as any)
    vi.mocked(leadsApi.getLeads).mockResolvedValue({ data: { items: [], total: 0, page: 1, limit: 10, total_pages: 1 } } as any)
    vi.mocked(leadsApi.getFollowUps).mockResolvedValue({ data: { items: [], total: 0, limit: 5, offset: 0, summary: { overdue_count: 3, today_count: 8, upcoming_count: 12, completed_count: 30 } } } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CrmOverviewPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('CRM Overview & Executive Dashboard')).toBeDefined()
    expect(screen.getByText('Total Leads')).toBeDefined()
    expect(screen.getByText('New Enquiries')).toBeDefined()
    expect(screen.getByText("Today's Calls")).toBeDefined()
    expect(screen.getByText('Overdue')).toBeDefined()
    await waitFor(() => {
      expect(screen.getByText('125')).toBeDefined()
    })
  })

  // 2. All Leads Register Page
  it('renders All Leads — Lead Register with search and preset filters', async () => {
    vi.mocked(leadsApi.getLeads).mockResolvedValue({
      data: {
        items: [
          {
            id: 101,
            lead_number: 'LD-0101',
            first_name: 'Sneha',
            last_name: 'Kulkarni',
            full_name: 'Sneha Kulkarni',
            phone: '9820011223',
            class_display: 'Std. 10',
            source: 'Website',
            priority: 'hot',
            stage: 'new_enquiry',
            assigned_to_name: 'Pooja S.',
          },
        ],
        total: 1,
        page: 1,
        limit: 25,
        total_pages: 1,
      },
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LeadRegisterPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('All Leads — Master Enquiry Register')).toBeDefined()
    expect(screen.getByText('Hot Prospects')).toBeDefined()
    await waitFor(() => {
      expect(screen.getByText('LD-0101')).toBeDefined()
      expect(screen.getByText('Sneha Kulkarni')).toBeDefined()
    })
  })

  // 3. Lead Pipeline Page
  it('renders Lead Pipeline — Kanban Workspace with stage columns', async () => {
    vi.mocked(leadsApi.getKanban).mockResolvedValue({
      data: {
        columns: {
          new_enquiry: { key: 'new_enquiry', title: 'NEW ENQUIRY', count: 1, items: [{ id: 1, lead_number: 'LD-001', full_name: 'Aarav Patil', priority: 'warm', stage: 'new_enquiry' }] },
          contacted: { key: 'contacted', title: 'CONTACTED', count: 0, items: [] },
          counselling_demo: { key: 'counselling_demo', title: 'COUNSELLING & DEMO', count: 0, items: [] },
          interested: { key: 'interested', title: 'INTERESTED / TRIAL', count: 0, items: [] },
          admission_pending: { key: 'admission_pending', title: 'ADMISSION PENDING', count: 0, items: [] },
          converted: { key: 'converted', title: 'CONVERTED ADMISSION', count: 0, items: [] },
        },
      },
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LeadPipelinePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('Lead Pipeline — Kanban Workspace')).toBeDefined()
    expect(screen.getByText('Pipeline Stage Board')).toBeDefined()
    await waitFor(() => {
      expect(screen.getByText('Aarav Patil')).toBeDefined()
    })
  })

  // 4. Follow-up Centre Page
  it('renders Follow-ups — Follow-up Centre with KPI cards and queues', async () => {
    vi.mocked(leadsApi.getFollowUps).mockResolvedValue({
      data: {
        items: [
          {
            id: 201,
            lead_id: 1,
            lead_number: 'LD-001',
            lead_name: 'Ananya Roy',
            lead_phone: '9811122233',
            lead_stage: 'contacted',
            lead_priority: 'hot',
            follow_up_type: 'call',
            status: 'scheduled',
            scheduled_at: new Date().toISOString(),
            remarks: 'Call parent regarding batch timings',
            is_overdue: true,
          },
        ],
        total: 1,
        limit: 100,
        offset: 0,
        summary: {
          overdue_count: 5,
          today_count: 14,
          upcoming_count: 22,
          completed_count: 85,
        },
      },
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FollowUpCentrePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('Follow-up Centre — Daily Calling Desk')).toBeDefined()
    expect(screen.getByText('Overdue Calls')).toBeDefined()
    expect(screen.getByText('Today\'s Agenda')).toBeDefined()
    await waitFor(() => {
      expect(screen.getByText('Ananya Roy')).toBeDefined()
    })
  })

  // 5. Counselling & Demo Page
  it('renders Counselling & Demo — Trial Lectures Centre with ratings', async () => {
    vi.mocked(leadsApi.getDemoClasses).mockResolvedValue({
      data: {
        items: [
          {
            id: 301,
            lead_id: 2,
            lead_number: 'LD-002',
            lead_name: 'Vikram Mehta',
            subject_name: 'Physics',
            standard_name: 'Std. 10',
            teacher_name: 'Dr. R. Sharma',
            scheduled_at: new Date().toISOString(),
            status: 'attended',
            rating: 5,
            feedback: 'Student showed exceptional aptitude',
          },
        ],
        total: 1,
        limit: 100,
        offset: 0,
        summary: {
          total_count: 12,
          scheduled_count: 3,
          attended_count: 8,
          absent_count: 1,
          avg_rating: 4.8,
        },
      },
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CounsellingDemoPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('Counselling & Demo — Trial Lectures Centre')).toBeDefined()
    expect(screen.getByText('Total Demos')).toBeDefined()
    expect(screen.getByText('Average Rating')).toBeDefined()
    await waitFor(() => {
      expect(screen.getByText('Vikram Mehta')).toBeDefined()
    })
  })

  // 6. Lead Sources Page
  it('renders Lead Sources — Acquisition Channel Management', async () => {
    vi.mocked(leadsApi.getSourcesSummary).mockResolvedValue({
      data: {
        total_leads: 180,
        items: [
          {
            source: 'Website',
            total_leads: 85,
            converted_leads: 30,
            lost_leads: 5,
            active_leads: 50,
            conversion_rate: 35.3,
            share_percentage: 47.2,
          },
          {
            source: 'Walk-in',
            total_leads: 55,
            converted_leads: 25,
            lost_leads: 4,
            active_leads: 26,
            conversion_rate: 45.5,
            share_percentage: 30.6,
          },
        ],
      },
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LeadSourcesPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('Lead Sources — Acquisition Channel Management')).toBeDefined()
    expect(screen.getByText('Active Channels')).toBeDefined()
    await waitFor(() => {
      expect(screen.getAllByText('Website').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Walk-in').length).toBeGreaterThan(0)
    })
  })

  // 7. Campaigns Page
  it('renders Campaigns — Marketing Campaign Management', async () => {
    vi.mocked(leadsApi.getCampaignsSummary).mockResolvedValue({
      data: {
        total_campaigns: 2,
        items: [
          {
            campaign_name: 'Summer Foundation 2026',
            total_leads: 40,
            converted_leads: 15,
            conversion_rate: 37.5,
            latest_enquiry: new Date().toISOString(),
          },
        ],
      },
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CampaignsPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('Campaigns — Campaign Management')).toBeDefined()
    expect(screen.getByText('Active Campaigns')).toBeDefined()
    await waitFor(() => {
      expect(screen.getAllByText('Summer Foundation 2026').length).toBeGreaterThan(0)
    })
  })

  // 8. CRM Reports Page
  it('renders Reports — CRM Reports Centre with monthly trajectory and Pareto', async () => {
    vi.mocked(leadsApi.getReportsAnalytics).mockResolvedValue({
      data: {
        monthly_trajectories: [
          { month: 'Nov 2026', new_leads: 35, conversions: 12, conversion_rate: 34.3 },
          { month: 'Oct 2026', new_leads: 42, conversions: 16, conversion_rate: 38.1 },
        ],
        lost_reasons: [
          { reason: 'Fees too high', count: 8, percentage: 53.3, cumulative_percentage: 53.3 },
        ],
        counsellors_matrix: [
          { id: 1, name: 'Pooja Sharma', assigned_leads: 50, follow_ups_logged: 88, conversions: 18, conversion_rate: 36.0 },
        ],
        stage_funnel: [
          { stage: 'new_enquiry', count: 20, label: 'New Enquiry' },
        ],
      },
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CrmReportsPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('CRM Reports — Admissions Analytics Centre')).toBeDefined()
    expect(screen.getByText('Monthly Prospect Enquiry vs Admission Trajectory')).toBeDefined()
    expect(screen.getByText('Lost Reasons Pareto Analysis')).toBeDefined()
    await waitFor(() => {
      expect(screen.getByText('Nov 2026')).toBeDefined()
      expect(screen.getByText('Fees too high')).toBeDefined()
    })
  })

  // 9. CRM Settings Page
  it('renders Settings — CRM Configuration with SLA input and Training Mode reset', async () => {
    vi.mocked(leadsApi.getCrmConfig).mockResolvedValue({
      data: {
        pipeline_stages: [],
        sla_follow_up_hours: 36,
        loss_reasons: ['Distance inconvenient', 'Fees constraint'],
        source_channels: ['Website', 'Referral'],
        auto_assign_counsellor: true,
        notify_on_new_enquiry: true,
      },
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CrmSettingsPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('Settings — CRM Configuration')).toBeDefined()
    expect(screen.getByText('Follow-up SLA & Escalation Threshold')).toBeDefined()
    expect(screen.getByText('Training & Demo Lab Environment')).toBeDefined()
    await waitFor(() => {
      expect(screen.getByText('Distance inconvenient')).toBeDefined()
    })
  })
})
