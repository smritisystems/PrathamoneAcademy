/**
 * @file        Housekeeping.test.tsx
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
 * @created     2026-11-11
 * @updated     2026-11-11
 *
 * @description Vitest component & governance tests for the Housekeeping workspace, Rule 010 View-First enforcement, Guarded Restore phrase confirmation, and Sidebar navigation access.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Housekeeping from '../pages/Housekeeping'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { housekeepingApi } from '../api/endpoints'
import { getAuthorizedModules } from '../config/modules'
import type { User } from '../types'

vi.mock('../api/endpoints', async () => {
  const actual = await vi.importActual<typeof import('../api/endpoints')>('../api/endpoints')
  return {
    ...actual,
    housekeepingApi: {
      getOverview: vi.fn(),
      listBackups: vi.fn(),
      createBackup: vi.fn(),
      verifyBackup: vi.fn(),
      downloadBackup: vi.fn(),
      uploadBackup: vi.fn(),
      pruneBackups: vi.fn(),
      runRestoreDrill: vi.fn(),
      executeLiveRestore: vi.fn(),
      runVacuum: vi.fn(),
      runReconcile: vi.fn(),
      getPolicy: vi.fn(),
      updatePolicy: vi.fn(),
      getHistory: vi.fn(),
      getStorage: vi.fn(),
      cleanOrphans: vi.fn(),
      previewLogCleanup: vi.fn(),
      executeLogCleanup: vi.fn(),
      downloadLogArchive: vi.fn(),
      getAlerts: vi.fn(),
      dispatchAlertEmail: vi.fn(),
    },
  }
})

const adminUser: User = {
  id: 1,
  username: 'admin',
  email: 'admin@prashant.edu',
  first_name: 'Jawahar',
  last_name: 'Admin',
  role: 'superadmin',
  institution_id: 1,
  permissions: ['*:*'],
}

const studentUser: User = {
  id: 10,
  username: 'student1',
  email: 'student@prashant.edu',
  first_name: 'Student',
  last_name: 'User',
  role: 'student',
  institution_id: 1,
  permissions: ['portal:view'],
}

const mockOverview = {
  database: {
    name: 'prashant_academy',
    host: 'db',
    size_bytes: 12582912,
    size_pretty: '12 MB',
    total_connections: 6,
    active_connections: 1,
    dead_tuples_top15: 24,
  },
  backups_summary: {
    total_count: 1,
    verified_count: 1,
    total_size_bytes: 2097152,
    total_size_human: '2.00 MB',
    last_backup_date: '2026-11-11T02:00:00Z',
    last_backup_file: 'prashant_academy_nightly_20261111_020000.dump',
    backup_status: 'Verified Healthy',
  },
  top_tables: [
    {
      table_name: 'students',
      live_rows: 150,
      dead_tuples: 3,
      total_bytes: 65536,
      size_pretty: '64 kB',
      last_vacuum: '2026-11-11T02:05:00Z',
      last_analyze: '2026-11-11T02:05:00Z',
    },
  ],
  policy: {
    backup_frequency: 'daily',
    backup_time: '02:00',
    backup_format: 'custom',
    backup_destination: 'Local & Mirror',
    offsite_mirror_path: '',
    retain_daily: 7,
    retain_weekly: 4,
    retain_monthly: 6,
    auto_vacuum_enabled: true,
    log_retention_days: 90,
  },
  scheduler_commands: {
    windows_task_scheduler: 'schtasks /Create /TN "PrathamOne_Nightly_DB_Backup"',
    linux_cron: '0 2 * * * python3 scripts/db_backup.py backup --prune',
  },
}

const mockBackups = [
  {
    filename: 'POeduOS_20261111_020000.edu',
    source: 'backups' as const,
    format: 'edu_zip' as const,
    size_bytes: 2097152,
    size_human: '2.00 MB',
    created_at: '2026-11-11T02:00:00Z',
    label: 'nightly',
    created_by: 'system',
    database: 'prashant_academy',
    sha256: 'abc123def4567890abc123def4567890',
    has_checksum: true,
    verified: true,
    verified_at: '2026-11-11T02:00:05Z',
    notes: 'Automated backup',
  },
]

function renderHousekeeping(initialRoute = '/housekeeping') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/housekeeping" element={<Housekeeping />} />
        <Route path="/housekeeping/:tab" element={<Housekeeping />} />
      </Routes>
    </MemoryRouter>
  )
}

const mockStorage = {
  disk: {
    path: '/app/backups',
    total_bytes: 100 * 1024 ** 3,
    used_bytes: 25 * 1024 ** 3,
    free_bytes: 75 * 1024 ** 3,
    free_percent: 75.0,
    used_percent: 25.0,
    total_human: '100.00 GB',
    free_human: '75.00 GB',
  },
  breakdown: {
    edu_bytes: 133721,
    edu_count: 1,
    raw_dump_sql_bytes: 530598,
    raw_dump_sql_count: 1,
    legacy_bytes: 2048000,
    legacy_count: 2,
    log_archive_bytes: 0,
    log_archive_count: 0,
    orphan_bytes: 512,
    orphan_count: 2,
  },
  orphan_files: [
    { filename: 'old.dump.sha256', size_bytes: 256, kind: 'orphan_sha256' },
    { filename: 'temp.tmp', size_bytes: 256, kind: 'temp_file' },
  ],
  log_archives: [],
}

const mockAlerts = {
  health_status: 'warning',
  critical_count: 0,
  warning_count: 1,
  total_alerts: 1,
  evaluated_at: '2026-11-11T19:00:00Z',
  items: [
    {
      id: 'orphan_sidecars',
      severity: 'warning',
      title: '2 Orphan Sidecar/Temp File(s)',
      detail: 'Dangling sidecar files detected.',
      recommended_tab: 'maintenance',
    },
  ],
}

describe('Housekeeping Workspace & Module Governance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useEditModeStore.getState().resetAll()
    useAuthStore.setState({ user: adminUser, token: 'mock-token' })

    vi.mocked(housekeepingApi.getOverview).mockResolvedValue({
      data: { ...mockOverview, storage: mockStorage, alerts_summary: mockAlerts },
    } as any)
    vi.mocked(housekeepingApi.listBackups).mockResolvedValue({ data: { backups: mockBackups } } as any)
    vi.mocked(housekeepingApi.getHistory).mockResolvedValue({ data: { events: [] } } as any)
    vi.mocked(housekeepingApi.getStorage).mockResolvedValue({ data: mockStorage } as any)
  })

  it('registers housekeeping module strictly for authorized admins/sysadmins and hides from students', () => {
    const adminMods = getAuthorizedModules(adminUser).map((m) => m.id)
    expect(adminMods).toContain('housekeeping')

    const studentMods = getAuthorizedModules(studentUser).map((m) => m.id)
    expect(studentMods).not.toContain('housekeeping')
  })

  it('renders telemetry overview and enforces Rule 010 View Mode lock by default', async () => {
    renderHousekeeping('/housekeeping')

    await waitFor(() => {
      expect(screen.getByText('Housekeeping & Database Governance')).toBeDefined()
      expect(screen.getByText('12 MB')).toBeDefined()
      expect(screen.getByText('Verified Healthy')).toBeDefined()
    })

    // View mode default banner active
    expect(screen.getByText(/View Mode Active/i)).toBeDefined()
    expect(useEditModeStore.getState().isEditMode('system:housekeeping')).toBe(false)
  })

  it('unlocks backup creation in Edit Mode and invokes API cleanly', async () => {
    vi.mocked(housekeepingApi.createBackup).mockResolvedValue({
      data: {
        filename: 'POeduOS_20261111_120000.edu',
        source: 'backups',
        format: 'edu_zip',
        size_bytes: 1048576,
        sha256: 'deadbeef12345678',
        verified: true,
        toc_entries: 95,
        created_at: '2026-11-11T12:00:00Z',
        mirror_copied: null,
      },
    } as any)

    renderHousekeeping('/housekeeping/backups')

    await waitFor(() => {
      expect(screen.getByText('Create On-Demand Verified Backup')).toBeDefined()
      expect(screen.getByText('EduOS Auto-Zipped Package (.edu)')).toBeDefined()
    })

    // Switch to Edit Mode
    fireEvent.click(screen.getByRole('button', { name: /Enable Edit Mode/i }))
    expect(useEditModeStore.getState().isEditMode('system:housekeeping')).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: /Create Verified Backup/i }))

    await waitFor(() => {
      expect(housekeepingApi.createBackup).toHaveBeenCalledWith(
        expect.objectContaining({
          backup_format: 'edu',
          label: 'manual',
        })
      )
    })
  })

  it('requires exact RESTORE PRASHANT_ACADEMY confirmation phrase and audit reason before live restore', async () => {
    vi.mocked(housekeepingApi.executeLiveRestore).mockResolvedValue({
      data: {
        restored_from: 'POeduOS_20261111_020000.edu',
        source: 'backups',
        safety_snapshot: 'POeduOS_20261111_120100.edu',
        is_reconciled: true,
        variance: 0,
        broken_invoices: 0,
        restored_at: '2026-11-11T12:01:30Z',
      },
    } as any)

    renderHousekeeping('/housekeeping/restore')

    await waitFor(() => {
      expect(screen.getByText('2. Guarded Production Database Restore')).toBeDefined()
    })

    fireEvent.click(screen.getByRole('button', { name: /Enable Edit Mode/i }))
    fireEvent.click(screen.getByRole('button', { name: /Execute Guarded Live Restore/i }))

    const confirmBtn = screen.getByRole('button', { name: /Confirm & Restore Production DB/i }) as HTMLButtonElement
    expect(confirmBtn.disabled).toBe(true)

    fireEvent.change(screen.getByPlaceholderText('RESTORE PRASHANT_ACADEMY'), {
      target: { value: 'RESTORE PRASHANT_ACADEMY' },
    })
    fireEvent.change(screen.getByPlaceholderText(/Describe why live restoration/i), {
      target: { value: 'Planned rollback verification with safety snapshot' },
    })

    expect(confirmBtn.disabled).toBe(false)
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(housekeepingApi.executeLiveRestore).toHaveBeenCalledWith({
        filename: 'POeduOS_20261111_020000.edu',
        source: 'backups',
        confirmation_phrase: 'RESTORE PRASHANT_ACADEMY',
        reason: 'Planned rollback verification with safety snapshot',
      })
    })
  })

  it('allows institute admin role without explicit system:housekeeping permission string to unlock Edit Mode', async () => {
    useAuthStore.setState({
      user: {
        id: 2,
        username: 'admin',
        email: 'admin@example.com',
        first_name: 'Institute',
        last_name: 'Admin',
        role: 'admin',
        institution_id: 1,
        permissions: ['students:view'],
      },
      token: 'mock-token',
    })

    renderHousekeeping('/housekeeping')
    await waitFor(() => {
      expect(screen.getByText('Housekeeping & Database Governance')).toBeDefined()
    })

    fireEvent.click(screen.getByRole('button', { name: /Enable Edit Mode/i }))
    expect(useEditModeStore.getState().isEditMode('system:housekeeping')).toBe(true)
    expect(screen.getByText(/Edit Mode Active/i)).toBeDefined()
  })

  it('displays proactive health alerts and disk storage on Overview and runs dry-run + confirmed log archival cleanup', async () => {
    vi.mocked(housekeepingApi.previewLogCleanup).mockResolvedValue({
      data: {
        retention_days: 90,
        cutoff_at: '2026-08-13T19:00:00Z',
        total_eligible: 240,
        categories: [
          { category: 'navigation_activity', label: 'Navigation Telemetry', eligible_count: 200 },
          { category: 'expired_tokens', label: 'Expired Tokens', eligible_count: 40 },
        ],
        protected_guarantee: 'Financial ledgers are permanently exempt.',
      },
    } as any)
    vi.mocked(housekeepingApi.executeLogCleanup).mockResolvedValue({
      data: {
        retention_days: 90,
        cutoff_at: '2026-08-13T19:00:00Z',
        total_purged: 240,
        purged_by_category: { navigation_activity: 200, expired_tokens: 40 },
        archived_files: [
          { category: 'navigation_activity', filename: 'logs_navigation_activity_20261111.jsonl.gz', row_count: 200, size_bytes: 1200, sha256: 'abc' },
        ],
      },
    } as any)
    vi.mocked(housekeepingApi.cleanOrphans).mockResolvedValue({
      data: { deleted: ['old.dump.sha256', 'temp.tmp'], freed_bytes: 512 },
    } as any)

    renderHousekeeping('/housekeeping')
    await waitFor(() => {
      expect(screen.getByText('Proactive Health & Backup Alerts')).toBeDefined()
      expect(screen.getByText('2 Orphan Sidecar/Temp File(s)')).toBeDefined()
      expect(screen.getByText('Backup Volume Storage')).toBeDefined()
    })

    // Navigate to Maintenance & Integrity tab
    fireEvent.click(screen.getByRole('button', { name: /Maintenance & Integrity/i }))
    await waitFor(() => {
      expect(screen.getByText('Storage Breakdown & Orphan File Cleanup')).toBeDefined()
      expect(screen.getByText('Log Archival & Retention Cleanup')).toBeDefined()
    })

    // Dry-run preview works cleanly
    fireEvent.click(screen.getByRole('button', { name: /Dry-Run Preview/i }))
    await waitFor(() => {
      expect(housekeepingApi.previewLogCleanup).toHaveBeenCalledTimes(1)
      expect(screen.getByText(/Dry-Run Preview: 240 row\(s\)/i)).toBeDefined()
    })

    // Unlock Edit Mode -> clean orphans + confirm archival purge
    fireEvent.click(screen.getByRole('button', { name: /Enable Edit Mode/i }))
    fireEvent.click(screen.getByRole('button', { name: /Clean Orphan Sidecars & Temp Files/i }))
    await waitFor(() => {
      expect(housekeepingApi.cleanOrphans).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByRole('button', { name: /Archive & Purge Eligible Logs/i }))
    await waitFor(() => {
      expect(screen.getByText('Confirm Log Archival & Retention Cleanup')).toBeDefined()
    })
    fireEvent.click(screen.getByRole('button', { name: /Confirm Archive & Purge/i }))
    await waitFor(() => {
      expect(housekeepingApi.executeLogCleanup).toHaveBeenCalledWith(
        expect.objectContaining({ confirm: true })
      )
    })
  })
})
