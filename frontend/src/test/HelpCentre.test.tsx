/**
 * @file        HelpCentre.test.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.src.test
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-11
 * @updated     2026-11-12
 *
 * @description Comprehensive Vitest suite covering Help & About Centre navigation, unified search, contextual help routing, product/company/version/legal views, admin-only System Info, support ticketing, and Rule 010 EditMode governance.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import HelpCentre from '../pages/HelpCentre'
import { ContextualHelpButton, resolveContextualHelpPath } from '../components/common'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { helpApi } from '../api/endpoints'

vi.mock('../api/endpoints', () => ({
  helpApi: {
    getCategories: vi.fn(),
    upsertCategory: vi.fn(),
    getArticles: vi.fn(),
    getArticle: vi.fn(),
    createArticle: vi.fn(),
    updateArticle: vi.fn(),
    publishArticle: vi.fn(),
    getRevisions: vi.fn(),
    search: vi.fn(),
    contextual: vi.fn(),
    getProductInfo: vi.fn(),
    updateProductInfo: vi.fn(),
    getSystemInfo: vi.fn(),
    getSupportRequests: vi.fn(),
    createSupportRequest: vi.fn(),
    getSupportRequest: vi.fn(),
    addSupportComment: vi.fn(),
    updateSupportStatus: vi.fn(),
  },
}))

const mockCategories = [
  { id: 1, slug: 'getting-started', name: 'Getting Started', section: 'getting_started', sort_order: 1, is_active: true, article_count: 1 },
  { id: 2, slug: 'module-guides', name: 'Module User Guides', section: 'module_guide', sort_order: 2, is_active: true, article_count: 1 },
  { id: 3, slug: 'tutorials', name: 'Tutorials & Workflows', section: 'tutorial', sort_order: 3, is_active: true, article_count: 1 },
  { id: 4, slug: 'faq-troubleshooting', name: 'FAQ & Troubleshooting', section: 'faq', sort_order: 4, is_active: true, article_count: 1 },
  { id: 5, slug: 'legal-compliance', name: 'Legal & Compliance', section: 'legal', sort_order: 5, is_active: true, article_count: 6 },
]

const mockArticles = [
  {
    id: 1,
    slug: 'welcome-to-prathamone-eduos',
    category_slug: 'getting-started',
    category_name: 'Getting Started',
    section: 'getting_started',
    module_key: 'dashboard',
    title: 'Welcome to PrathamOne EduOS',
    summary: 'Overview of PrathamOne EduOS and View-First Governance.',
    tags: ['welcome'],
    required_permissions: ['Authenticated User'],
    related_routes: ['/dashboard'],
    related_slugs: [],
    doc_version: '1.0',
    status: 'published',
    approval_status: 'approved',
    is_system: true,
    sort_order: 1,
  },
  {
    id: 2,
    slug: 'guide-concessions',
    category_slug: 'module-guides',
    category_name: 'Module User Guides',
    section: 'module_guide',
    module_key: 'concessions',
    title: 'Concessions & Waivers Module User Guide',
    summary: 'Submit, verify, approve, and allocate fee concessions.',
    tags: ['concessions', 'waivers'],
    required_permissions: ['concessions:apply', 'concessions:approve'],
    related_routes: ['/fees/concessions'],
    related_slugs: ['guide-fees'],
    doc_version: '1.0',
    status: 'published',
    approval_status: 'approved',
    is_system: true,
    sort_order: 14,
  },
  {
    id: 3,
    slug: 'tutorial-fee-collection',
    category_slug: 'tutorials',
    category_name: 'Tutorials & Workflows',
    section: 'tutorial',
    module_key: 'fees',
    title: 'Tutorial: Fee Collection & Payment Allocation',
    summary: 'Collect fees and post official numbered receipts.',
    tags: ['fees', 'receipt'],
    required_permissions: ['payments:create'],
    related_routes: ['/fees'],
    related_slugs: [],
    doc_version: '1.0',
    status: 'published',
    approval_status: 'approved',
    is_system: true,
    sort_order: 33,
  },
  {
    id: 4,
    slug: 'faq-user-permissions',
    category_slug: 'faq-troubleshooting',
    category_name: 'FAQ & Troubleshooting',
    section: 'faq',
    module_key: 'settings',
    title: 'FAQ & Troubleshooting: User Permissions & View Mode',
    summary: 'Understand View-First Governance locks and role scope.',
    tags: ['faq', 'permissions'],
    required_permissions: ['Authenticated User'],
    related_routes: ['/users'],
    related_slugs: [],
    doc_version: '1.0',
    status: 'published',
    approval_status: 'approved',
    is_system: true,
    sort_order: 51,
  },
  ...[
    { id: 10, slug: 'terms-and-conditions', title: 'Terms and Conditions' },
    { id: 11, slug: 'privacy-policy', title: 'Privacy Policy' },
    { id: 12, slug: 'data-protection-policy', title: 'Data Protection Policy' },
    { id: 13, slug: 'software-license-agreement', title: 'Software License Agreement' },
    { id: 14, slug: 'copyright-notice', title: 'Copyright Notice' },
    { id: 15, slug: 'acceptable-use-policy', title: 'Acceptable Use Policy' },
  ].map((l, idx) => ({
    id: l.id,
    slug: l.slug,
    category_slug: 'legal-compliance',
    category_name: 'Legal & Compliance',
    section: 'legal',
    module_key: 'legal',
    title: l.title,
    summary: `${l.title} (Management Approval Pending)`,
    tags: ['legal'],
    required_permissions: ['Authenticated User'],
    related_routes: [`/help/legal/${l.slug}`],
    related_slugs: [],
    doc_version: '1.0',
    status: 'pending_approval',
    approval_status: 'pending_approval',
    is_system: true,
    sort_order: 70 + idx,
  })),
]

const mockProductInfo = {
  about_product: {
    product_name: 'PrathamOne EduOS',
    product_category: 'Education Management Operating System',
    edition: 'Coaching Institute Edition',
    introduction: 'Enterprise Education Management Operating System for coaching institutes.',
    vision: 'Transparent, auditable, paperless institutional operations.',
    mission: 'Unified Single Source of Truth workflows.',
    vision_mission_status: 'baseline_pending_commercial_signoff',
    philosophy: ['Single Source of Truth (SSOT)', 'View-First Governance'],
    core_capabilities: ['Student Lifecycle Management', 'Fee Collection & Concessions'],
    available_modules: [
      { key: 'fees', name: 'Fee Management', guide_slug: 'guide-fees', route: '/fees' },
      { key: 'concessions', name: 'Concessions & Waivers', guide_slug: 'guide-concessions', route: '/fees/concessions' },
    ],
    target_institutions: ['Coaching Institutes & Competitive Test Prep Academies'],
    supported_deployment_models: ['Institutional Dedicated Deployment'],
    editions: [{ name: 'Coaching Institute Edition', status: 'Active Installed Edition', description: 'Built for coaching academies.' }],
  },
  about_company: {
    developer_owner_label: 'AITDL & SMRITI Systems',
    smriti_systems: {
      company_name: 'SMRITI Systems',
      introduction: 'Co-developer and product owner for PrathamOne EduOS.',
      technology_profile: 'Education operations software engineering.',
      official_website: null,
      registered_office: null,
      leadership_note: null,
      verification_status: 'pending_management_verification',
    },
    aitdl: {
      company_name: 'AITDL — AI Technology & Development Lab',
      product_architect: 'Jawahar R Mallah',
      introduction: 'Leads architecture and governance engineering.',
      official_website: 'https://aitdl.com',
      product_website: 'https://prathamone.com',
      support_phones: ['9323 023 007', '9324 117 007'],
      support_email: 'support@prathamone.com',
      general_email: 'prathamone@outlook.com',
      copyright_notice: 'Copyright © 2026 AITDL (AI Technology & Development Lab). All rights reserved.',
      product_portfolio: [
        { name: 'PrathamOne', tagline: 'Education Operating System', website: 'https://prathamone.com', description: 'Institute OS' },
      ],
    },
    subscribing_institution: {
      name: 'Prashant Academy Coaching Institute',
      code: 'PA001',
      identity_separation_notice: 'Institute data remains strictly separate from software owners.',
    },
  },
  version_info: {
    product_name: 'PrathamOne EduOS',
    product_edition: 'Coaching Institute Edition',
    version_number: '1.76.0',
    build_number: '2026.11.10-REV-137-v1.76.0',
    release_date: '2026-11-10T20:21:02Z',
    release_channel: 'production',
    release_status: 'published',
    license_status: 'Pending Management License Registration',
    license_validity: null,
    license_verification_status: 'pending_management_approval',
    deployment_type: 'Institutional Dedicated Deployment',
    available_modules_count: 14,
    available_modules: [
      { key: 'fees', name: 'Fee Management', guide_slug: 'guide-fees', route: '/fees' },
    ],
    latest_update: {
      version: '1.76.0',
      title: 'Release v1.76.0 — Academic & Financial Governance Baseline',
      published_at: '2026-11-10T20:21:02Z',
      notes_markdown: '### Highlights\n- Unified Concessions & Scholarship governance.',
    },
  },
}

const renderHelpAt = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/help" element={<HelpCentre />} />
        <Route path="/help/article/:slug" element={<HelpCentre />} />
        <Route path="/help/support" element={<HelpCentre />} />
        <Route path="/help/about-product" element={<HelpCentre />} />
        <Route path="/help/about-company" element={<HelpCentre />} />
        <Route path="/help/version" element={<HelpCentre />} />
        <Route path="/help/legal" element={<HelpCentre />} />
        <Route path="/help/legal/:slug" element={<HelpCentre />} />
        <Route path="/help/system-info" element={<HelpCentre />} />
        <Route path="/help/governance" element={<HelpCentre />} />
        <Route path="/about" element={<HelpCentre />} />
        <Route path="/support" element={<HelpCentre />} />
      </Routes>
    </MemoryRouter>,
  )

describe('Help & About Centre Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useEditModeStore.getState().resetAll()
    useAuthStore.setState({
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@prashantacademy.in',
        first_name: 'Institute',
        last_name: 'Admin',
        full_name: 'Institute Admin',
        role: 'admin',
        is_active: true,
      } as any,
      token: 'test-token',
    })

    vi.mocked(helpApi.getCategories).mockResolvedValue({ data: { items: mockCategories } } as any)
    vi.mocked(helpApi.getArticles).mockResolvedValue({ data: { items: mockArticles, total: mockArticles.length } } as any)
    vi.mocked(helpApi.getProductInfo).mockResolvedValue({ data: mockProductInfo } as any)
    vi.mocked(helpApi.getArticle).mockImplementation(async (slug: string) => {
      const found = mockArticles.find((a) => a.slug === slug) || mockArticles[1]
      return {
        data: {
          ...found,
          content_markdown: `# ${found.title}\n\n## 1. Module Introduction\nCustomer guide content for ${found.title}.\n\n> Management Approval Notice where applicable.`,
          related_articles: [mockArticles[0]],
        },
      } as any
    })
    vi.mocked(helpApi.getSupportRequests).mockResolvedValue({ data: { items: [], total: 0 } } as any)
  })

  it('renders Help & About overview with main customer sections and zero GitHub or installation content', async () => {
    const { container } = renderHelpAt('/help')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Getting Started' })).toBeDefined()
      expect(screen.getByRole('heading', { name: 'Module User Guides' })).toBeDefined()
      expect(screen.getByRole('heading', { name: 'Tutorials & Workflows' })).toBeDefined()
      expect(screen.getByRole('heading', { name: 'FAQ & Troubleshooting' })).toBeDefined()
      expect(screen.getByRole('heading', { name: 'Customer Support Centre' })).toBeDefined()
    })

    const text = (container.textContent || '').toLowerCase()
    expect(text).not.toContain('github.com')
    expect(text).not.toContain('docker compose')
    expect(text).not.toContain('manual installation guide')
  })

  it('resolves contextual help directly to specific module user guides rather than homepage', async () => {
    expect(resolveContextualHelpPath('/fees/concessions').helpPath).toBe(
      '/help/article/guide-concessions?from=%2Ffees%2Fconcessions',
    )
    expect(resolveContextualHelpPath('/fees').helpPath).toBe('/help/article/guide-fees?from=%2Ffees')
    expect(resolveContextualHelpPath('/students').helpPath).toBe('/help/article/guide-students?from=%2Fstudents')
    expect(resolveContextualHelpPath('/examinations').helpPath).toBe(
      '/help/article/guide-examinations?from=%2Fexaminations',
    )
    expect(resolveContextualHelpPath('/examinations/report-cards').helpPath).toBe(
      '/help/article/guide-results?from=%2Fexaminations%2Freport-cards',
    )
    expect(resolveContextualHelpPath('/academic/timetable').helpPath).toBe(
      '/help/article/guide-timetable?from=%2Facademic%2Ftimetable',
    )
    expect(resolveContextualHelpPath('/leads').helpPath).toBe('/help/article/guide-admissions?from=%2Fleads')
    expect(resolveContextualHelpPath('/attendance').helpPath).toBe('/help/article/guide-attendance?from=%2Fattendance')
    expect(resolveContextualHelpPath('/teachers').helpPath).toBe('/help/article/guide-staff?from=%2Fteachers')
    expect(resolveContextualHelpPath('/communication').helpPath).toBe(
      '/help/article/guide-communication?from=%2Fcommunication',
    )
    expect(resolveContextualHelpPath('/reports').helpPath).toBe('/help/article/guide-reports?from=%2Freports')
    expect(resolveContextualHelpPath('/settings').helpPath).toBe('/help/article/guide-settings?from=%2Fsettings')
    expect(resolveContextualHelpPath('/dashboard').helpPath).toBe('/help/article/guide-dashboard?from=%2Fdashboard')

    render(
      <MemoryRouter initialEntries={['/fees/concessions']}>
        <Routes>
          <Route path="/fees/concessions" element={<ContextualHelpButton label="Concessions Help" />} />
          <Route path="/help/article/:slug" element={<HelpCentre />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByTestId('contextual-help-button'))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Concessions & Waivers Module User Guide' })).toBeDefined()
      expect(screen.getByText('Back to Module')).toBeDefined()
    })
  })

  it('executes unified Help search and displays matching results and suggestions', async () => {
    vi.mocked(helpApi.search).mockResolvedValue({
      data: {
        query: 'concession',
        total: 1,
        results: [
          {
            type: 'article',
            slug: 'guide-concessions',
            section: 'module_guide',
            title: 'Concessions & Waivers Module User Guide',
            summary: 'Submit, verify, approve, and allocate fee concessions.',
            route: '/help/article/guide-concessions',
            tags: ['concessions'],
          },
        ],
        suggestions: ['Concessions & Waivers', 'Scholarships'],
      },
    } as any)

    renderHelpAt('/help')
    const input = await screen.findByLabelText('Search Help & About Centre')
    fireEvent.change(input, { target: { value: 'concession' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => {
      expect(helpApi.search).toHaveBeenCalledWith('concession')
      expect(screen.getByText(/Search Results for/i)).toBeDefined()
      expect(screen.getByText('Concessions & Waivers Module User Guide')).toBeDefined()
    })
  })

  it('displays About PrathamOne EduOS, About SMRITI Systems with identity separation, and dynamic Version Info', async () => {
    renderHelpAt('/help/about-product')
    await waitFor(() => {
      expect(screen.getByText('Education Management Operating System')).toBeDefined()
      expect(screen.getByText('Product Philosophy')).toBeDefined()
    })

    cleanup()
    renderHelpAt('/help/about-company')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'SMRITI Systems' })).toBeDefined()
      expect(screen.getByText('Corporate Details Pending Management Verification')).toBeDefined()
      expect(screen.getByText(/Institute data remains strictly separate from software owners/i)).toBeDefined()
    })

    cleanup()
    renderHelpAt('/help/version')
    await waitFor(() => {
      expect(screen.getByText('2026.11.10-REV-137-v1.76.0')).toBeDefined()
      expect(screen.getByText('Not Configured (Requires Management Registration)')).toBeDefined()
    })
  })

  it('marks unpublished legal documents clearly as requiring management approval', async () => {
    renderHelpAt('/help/legal/terms-and-conditions')
    await waitFor(() => {
      expect(screen.getByText('Legal & Compliance Documents')).toBeDefined()
      expect(screen.getByText('Requires Management Approval')).toBeDefined()
      expect(screen.getByText(/Management Approval Pending:/i)).toBeDefined()
    })
  })

  it('restricts System Information strictly to administrators and renders live telemetry for admins', async () => {
    useAuthStore.setState({
      user: {
        id: 5,
        username: 'teacher1',
        role: 'teacher',
        full_name: 'Teacher Demo',
      } as any,
      token: 'test-token',
    })

    renderHelpAt('/help/system-info')
    await waitFor(() => {
      expect(screen.getByText('Administrator Authorization Required')).toBeDefined()
    })
    expect(helpApi.getSystemInfo).not.toHaveBeenCalled()
    expect(screen.queryByText('Content Governance')).toBeNull()

    // Now switch to Admin and check live telemetry rendering
    cleanup()
    useAuthStore.setState({
      user: { id: 1, username: 'admin', role: 'admin', full_name: 'Institute Admin' } as any,
      token: 'test-token',
    })
    vi.mocked(helpApi.getSystemInfo).mockResolvedValue({
      data: {
        checked_at: '2026-11-11T12:00:00Z',
        application_health: { status: 'Healthy', api_service: 'Operational', security_governance: 'View-First & RBAC Active' },
        database_connectivity: { status: 'Connected', engine: 'PostgreSQL', latency_ms: 1.8 },
        module_availability: [{ module_key: 'fees', name: 'Fee Management', status: 'Available', guide_slug: 'guide-fees' }],
        integration_status: [{ name: 'WhatsApp Messaging', provider: 'Meta Cloud API', status: 'Enabled' }],
        last_successful_backup: { status: 'Verified Healthy', last_backup_at: '2026-11-11T08:00:00Z', verified: true, total_snapshots: 2, frequency: 'Daily' },
        latest_update_information: { version: '1.76.0', title: 'Release v1.76.0', published_at: '2026-11-10T20:21:02Z', notes_markdown: 'Customer safe notes' },
        deployment_information: { product_name: 'PrathamOne EduOS', edition: 'Coaching Institute Edition', version: '1.76.0', build_number: '2026.11.10-REV-137-v1.76.0', release_channel: 'production', deployment_type: 'Institutional Dedicated Deployment' },
      },
    } as any)

    renderHelpAt('/help/system-info')
    await waitFor(() => {
      expect(screen.getByText('System Information (Administrator View)')).toBeDefined()
      expect(screen.getByText('Healthy')).toBeDefined()
      expect(screen.getByText('Verified Healthy')).toBeDefined()
    })
  })

  it('submits support requests in Support Centre and enforces Rule 010 View-First Edit Mode in Governance', async () => {
    vi.mocked(helpApi.createSupportRequest).mockResolvedValue({
      data: {
        id: 99,
        ticket_number: 'SUP-20261111-ABC123',
        institution_id: 1,
        user_id: 1,
        request_type: 'support_request',
        category: 'general',
        priority: 'medium',
        subject: 'Need receipt layout guidance',
        description: 'How do we customize official receipt signature text?',
        status: 'open',
        comments: [],
      },
    } as any)

    renderHelpAt('/help/support')
    const subjectInput = await screen.findByPlaceholderText(/Brief summary/i)
    const descInput = screen.getByPlaceholderText(/Include steps taken/i)
    fireEvent.change(subjectInput, { target: { value: 'Need receipt layout guidance' } })
    fireEvent.change(descInput, { target: { value: 'How do we customize official receipt signature text?' } })
    fireEvent.submit(subjectInput.closest('form')!)

    await waitFor(() => {
      expect(helpApi.createSupportRequest).toHaveBeenCalled()
      expect(screen.getByText('SUP-20261111-ABC123')).toBeDefined()
    })

    // Check Rule 010 Edit Mode gating in Content Governance
    cleanup()
    renderHelpAt('/help/governance')
    const newBtn = await screen.findByRole('button', { name: /New Help \/ FAQ Article/i })
    expect(newBtn.getAttribute('aria-disabled')).toBe('true')
  })
})
