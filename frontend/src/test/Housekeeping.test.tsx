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

describe('Housekeeping Workspace & Module Governance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useEditModeStore.getState().resetAll()
    useAuthStore.setState({ user: adminUser, token: 'mock-token' })

    vi.mocked(housekeepingApi.getOverview).mockResolvedValue({ data: mockOverview } as any)
    vi.mocked(housekeepingApi.listBackups).mockResolvedValue({ data: { backups: mockBackups } } as any)
    vi.mocked(housekeepingApi.getHistory).mockResolvedValue({ data: { events: [] } } as any)
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
})
