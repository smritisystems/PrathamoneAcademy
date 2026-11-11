/**
 * @file        Releases.test.tsx
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
 * @created     2026-11-05
 * @updated     2026-11-11
 *
 * @description Comprehensive unit and specification tests verifying the Enterprise Release & Change Management workspace, tabs, quality gates, and approval lifecycles.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Releases from '../pages/Releases'
import { resolvePageTitle } from '../components/Footer'
import { releasesApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'

describe('Release & Change Management Workspace Specifications', () => {
  let queryClient: QueryClient

  const mockCurrentRelease = {
    data: {
      id: 3,
      version: '1.0.0',
      build_number: '2026.11.06-STABLE-v1.0.0',
      title: 'PrathamOne EduOS v1.0.0 — Coaching Institute Edition',
      status: 'published',
      environment: 'production',
      published_at: '2026-11-05T08:00:00Z',
      release_notes_markdown: '# Release v6.99.1 Notes\n\n### Added Features\n- Configurable student visibility',
    },
  }

  const mockPendingChanges = {
    data: {
      last_published_version: '1.0.0',
      last_commit: 'b07d9c1',
      recommended_bump: 'patch',
      next_version: '1.0.1',
      total_commits: 4,
      commits: [
        {
          hash: 'c1234567890',
          short_hash: 'c1234567',
          author: 'Jawahar R. Mallah',
          date: '2026-11-05T13:40:00Z',
          subject: 'feat(releases): automated change tracking',
          category: 'added',
          is_breaking: false,
        },
      ],
      changed_files_count: 12,
      changed_files: ['backend/app/models/release.py', 'frontend/src/pages/Releases.tsx'],
      affected_modules: ['students', 'settings', 'database'],
      structured_notes: {
        added: ['Automated change tracking and release notes'],
        changed: [],
        fixed: [],
        security: [],
        database: ['015_release_management migration'],
        deprecated: [],
      },
      migrations: ['015_release_and_change_management.py'],
    },
  }

  const mockHistory = {
    data: {
      total: 3,
      page: 1,
      limit: 30,
      items: [
        {
          id: 4,
          version: '1.0.1',
          build_number: '2026.11.05-STAGING-RC-C123456',
          title: 'Release v1.0.1 Candidate',
          status: 'release_candidate',
          environment: 'production',
          validation_status: 'passed',
          is_critical_security: false,
          created_at: '2026-11-05T13:45:00Z',
          approved_at: null,
          published_at: null,
          created_by_id: 1,
          change_summary: { total_commits: 4, changed_files: 12, affected_modules: ['database', 'settings'] },
          structured_notes_counts: { added: 1, database: 1 },
        },
        {
          id: 3,
          version: '1.0.0',
          build_number: '2026.11.06-STABLE-v1.0.0',
          title: 'PrathamOne EduOS v1.0.0 — Coaching Institute Edition',
          status: 'published',
          environment: 'production',
          validation_status: 'passed',
          is_critical_security: false,
          created_at: '2026-11-05T08:00:00Z',
          published_at: '2026-11-05T08:00:00Z',
          created_by_id: 1,
          change_summary: { total_commits: 60, changed_files: 55, affected_modules: ['students', 'settings'] },
          structured_notes_counts: { added: 4, changed: 2 },
        },
      ],
    },
  }

  const mockDetail = {
    data: {
      id: 4,
      version: '1.0.1',
      build_number: '2026.11.05-STAGING-RC-C123456',
      title: 'Release v1.0.1 Candidate',
      status: 'release_candidate',
      environment: 'production',
      validation_status: 'passed',
      validation_results: {
        header_attribution: { status: 'passed', message: 'All source files satisfy enterprise header attribution.' },
        secret_scan: { status: 'passed', message: 'Zero credentials, API tokens, or secrets found.' },
        database_migrations: { status: 'passed', message: 'Verified Alembic migration revisions. Aligned.' },
        semver_format: { status: 'passed', message: "Version '6.99.2' is valid SemVer." },
        build_readiness: { status: 'passed', message: 'Build container configuration verified.' },
      },
      release_notes_markdown: '# Release v6.99.2 Notes\n\n### Added Features\n- Release & Change Management',
      release_notes_structured: { added: ['Release & Change Management'] },
      change_summary: { total_commits: 4, changed_files: 12 },
      is_critical_security: false,
      requires_db_backup: true,
      created_by_id: 1,
      created_at: '2026-11-05T13:45:00Z',
    },
  }

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    })

    useAuthStore.setState({
      token: 'mock-jwt-token',
      user: {
        id: 1,
        username: 'sysadmin',
        email: 'sysadmin@example.com',
        first_name: 'SysAdmin',
        last_name: 'Superuser',
        role: 'superadmin',
        institution_id: 1,
      },
      selectedInstitutionId: 1,
      selectedAcademicYearId: 1,
    })

    vi.spyOn(releasesApi, 'getCurrent').mockResolvedValue(mockCurrentRelease as any)
    vi.spyOn(releasesApi, 'getPendingChanges').mockResolvedValue(mockPendingChanges as any)
    vi.spyOn(releasesApi, 'list').mockResolvedValue(mockHistory as any)
    vi.spyOn(releasesApi, 'get').mockResolvedValue(mockDetail as any)
    vi.spyOn(releasesApi, 'getAudit').mockResolvedValue({ data: [] } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Releases />
        </MemoryRouter>
      </QueryClientProvider>
    )

  it('resolves routing page title for /releases and /admin/releases', () => {
    expect(resolvePageTitle('/releases', '')).toBe('Releases & Changes')
    expect(resolvePageTitle('/admin/releases', '')).toBe('Releases & Changes')
  })

  it('renders top banner with active production version and build identifier', async () => {
    renderComponent()

    expect(await screen.findByText('PrathamOne Release & Change Governance')).toBeDefined()
    expect(await screen.findByText('2026.11.06-STABLE-v1.0.0')).toBeDefined()
    expect(screen.getAllByText(/v1\./).length).toBeGreaterThanOrEqual(1)
  })

  it('renders unreleased pending changes card with affected modules', async () => {
    renderComponent()

    expect(await screen.findByText(/Pending Repository Changes/i)).toBeDefined()
    expect(await screen.findByText(/unreleased commits/i)).toBeDefined()
    expect(await screen.findByText(/modified files/i)).toBeDefined()
    expect(await screen.findByText('students')).toBeDefined()
    expect(await screen.findByText('settings')).toBeDefined()
  })

  it('displays pre-flight automated quality gates for release candidate', async () => {
    renderComponent()

    expect(await screen.findByText('Automated Quality Gates & Pre-Flight Checks')).toBeDefined()
    expect(screen.getByText('Source Code Attribution & Headers')).toBeDefined()
    expect(screen.getByText('Secret & Credential Scan')).toBeDefined()
    expect(screen.getByText('Database Schema & Migrations')).toBeDefined()
    expect(screen.getByText('SemVer Manifest Consistency')).toBeDefined()
    expect(screen.getByText('Build & Container Readiness')).toBeDefined()
  })

  it('allows switching to Release History and filters statuses', async () => {
    renderComponent()

    const historyTab = await screen.findByText(/Release History/i)
    fireEvent.click(historyTab)

    expect(await screen.findByText('Filter Status:')).toBeDefined()
    expect(screen.getByText('Release v1.0.1 Candidate')).toBeDefined()
    expect(screen.getByText('PrathamOne EduOS v1.0.0 — Coaching Institute Edition')).toBeDefined()
  })

  it('allows switching to Current Release Notes tab', async () => {
    renderComponent()

    const currentTab = await screen.findByText('Current Release Notes (GA)')
    fireEvent.click(currentTab)

    expect(await screen.findByText(/Official Release Notes/i)).toBeDefined()
  })

  it('opens Generate Release Candidate Draft modal', async () => {
    renderComponent()

    const generateBtn = await screen.findByRole('button', { name: /Generate Release Candidate/i })
    fireEvent.click(generateBtn)

    expect(await screen.findByText('Generate Release Candidate Draft')).toBeDefined()
    expect(screen.getByPlaceholderText('e.g. 6.99.2 or 7.0.0')).toBeDefined()
  })
})
