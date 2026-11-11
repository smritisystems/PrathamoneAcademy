/**
 * @file        GlobalViewFirstSoftwareWideCoverage.test.tsx
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
 * @description Comprehensive Vitest test suite validating Rule 010 View-First
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useEditModeStore } from '../store/editModeStore'
import { useAuthStore } from '../store/authStore'
import EditModeBar from '../components/common/EditModeBar'
import type { User } from '../types'

describe('Rule 010 Global View-First 100% Software-Wide Coverage Suite', () => {
  const adminUser: User = {
    id: 1,
    username: 'admin',
    email: 'admin@prashant.edu',
    first_name: 'System',
    last_name: 'Administrator',
    role: 'admin',
    institution_id: 1,
    permissions: ['all:manage'],
  }

  const staffUser: User = {
    id: 2,
    username: 'staff',
    email: 'staff@prashant.edu',
    first_name: 'Staff',
    last_name: 'Member',
    role: 'staff',
    institution_id: 1,
    permissions: ['students:view', 'students:edit'],
  }

  const studentViewerUser: User = {
    id: 3,
    username: 'viewer',
    email: 'viewer@prashant.edu',
    first_name: 'Viewer',
    last_name: 'Student',
    role: 'student',
    institution_id: 1,
    permissions: ['portal:view'],
  }

  // All 29 Canonical Mutation-Capable Workspaces Audited Across Modules
  const ALL_SCOPES = [
    // Academic Workspaces
    'academic:workspace',
    'academic:courses',
    'academic:attendance',
    'academic:examinations',
    'academic:batches',
    'academic:subjects',
    'academic:standards',
    'academic:forms_documents',
    // Student Workspaces
    'students:admission',
    'students:master',
    'students:detail:101',
    // Workforce Workspaces
    'workforce:teachers',
    'workforce:staff',
    'workforce:payroll',
    'teacher:profile:42',
    'workforce:staff:profile:15',
    // Finance Workspaces
    'finance:fees',
    'finance:collection',
    'finance:payments',
    'finance:import_fee_register',
    // Administration, System & Security Workspaces
    'admin:users',
    'admin:user:1',
    'sysadmin:workspace',
    'sysadmin:settings',
    'security:codex',
    'communication:broadcasts',
    'system:releases',
    'system:import_export',
    'system:housekeeping',
  ]

  beforeEach(() => {
    useEditModeStore.getState().resetAll()
    useAuthStore.setState({ user: adminUser, token: 'fake-jwt-token' })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 1. UNIVERSAL VIEW MODE DEFAULT
  // ──────────────────────────────────────────────────────────────────────────
  it('RULE 010.1: Every workspace initializes strictly in View Mode with 0 active edit scopes', () => {
    const store = useEditModeStore.getState()
    expect(Object.keys(store.scopes).length).toBe(0)

    // Check each and every audited workspace scope
    ALL_SCOPES.forEach((scope) => {
      expect(store.isEditMode(scope)).toBe(false)
      expect(store.isDirty(scope)).toBe(false)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 2. STRICT SCOPED ISOLATION
  // ──────────────────────────────────────────────────────────────────────────
  it('RULE 010.2: Enabling Edit Mode for any scope isolates that scope and keeps all other 28 scopes in View Mode', () => {
    const store = useEditModeStore.getState()
    const targetScope = 'workforce:payroll'

    const result = store.enableEditMode(targetScope, adminUser)
    expect(result.success).toBe(true)
    expect(store.isEditMode(targetScope)).toBe(true)

    // Verify all other 27 scopes remain locked in View Mode
    ALL_SCOPES.filter((s) => s !== targetScope).forEach((otherScope) => {
      expect(store.isEditMode(otherScope)).toBe(false)
    })
  })

  it('RULE 010.3: Multiple independent scopes can be activated concurrently without cross-contamination', () => {
    const store = useEditModeStore.getState()
    const scope1 = 'academic:workspace'
    const scope2 = 'finance:collection'

    store.enableEditMode(scope1, adminUser)
    store.enableEditMode(scope2, adminUser)

    expect(store.isEditMode(scope1)).toBe(true)
    expect(store.isEditMode(scope2)).toBe(true)
    expect(store.isEditMode('workforce:teachers')).toBe(false)
    expect(store.isEditMode('security:codex')).toBe(false)

    // Disabling scope1 preserves scope2
    store.disableEditMode(scope1)
    expect(store.isEditMode(scope1)).toBe(false)
    expect(store.isEditMode(scope2)).toBe(true)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 3. ROLE-BASED ACCESS CONTROL & PERMISSION BARRIERS
  // ──────────────────────────────────────────────────────────────────────────
  it('RULE 010.4: Unauthorized or restricted users cannot activate Edit Mode', () => {
    const store = useEditModeStore.getState()

    // 1. Null / Unauthenticated user
    const anonRes = store.enableEditMode('academic:workspace', null)
    expect(anonRes.success).toBe(false)
    expect(anonRes.reason).toMatch(/Authentication required/i)
    expect(store.isEditMode('academic:workspace')).toBe(false)

    // 2. Student / Viewer role restricted to View-Only access
    const viewerRes = store.enableEditMode('finance:fees', studentViewerUser)
    expect(viewerRes.success).toBe(false)
    expect(viewerRes.reason).toMatch(/restricted to View-Only/i)
    expect(store.isEditMode('finance:fees')).toBe(false)

    // 3. Permission-gated scope check failure
    const permFail = store.enableEditMode('sysadmin:settings', staffUser, 'system:sysadmin')
    expect(permFail.success).toBe(false)
    expect(permFail.reason).toMatch(/Insufficient privileges/i)
    expect(store.isEditMode('sysadmin:settings')).toBe(false)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 4. DIRTY STATE ISOLATION & EXIT DISMISSAL
  // ──────────────────────────────────────────────────────────────────────────
  it('RULE 010.5: Dirty state tracks per-scope and is completely flushed when exiting Edit Mode', () => {
    const store = useEditModeStore.getState()
    const scope = 'students:admission'

    store.enableEditMode(scope, adminUser)
    store.setDirty(scope, true)

    expect(store.isEditMode(scope)).toBe(true)
    expect(store.isDirty(scope)).toBe(true)
    expect(store.isDirty('academic:courses')).toBe(false)

    // Exiting Edit Mode
    store.disableEditMode(scope)
    expect(store.isEditMode(scope)).toBe(false)
    expect(store.isDirty(scope)).toBe(false)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 5. GLOBAL NAVIGATION & LOGOUT RESET (RESET ALL)
  // ──────────────────────────────────────────────────────────────────────────
  it('RULE 010.6: resetAll() instantly collapses all active edit scopes across the entire software back to View Mode', () => {
    const store = useEditModeStore.getState()

    // Activate multiple disparate workspaces
    store.enableEditMode('academic:workspace', adminUser)
    store.enableEditMode('workforce:payroll', adminUser)
    store.enableEditMode('finance:payments', adminUser)
    store.enableEditMode('security:codex', adminUser)
    store.setDirty('workforce:payroll', true)

    expect(store.isEditMode('academic:workspace')).toBe(true)
    expect(store.isEditMode('workforce:payroll')).toBe(true)
    expect(store.isEditMode('finance:payments')).toBe(true)
    expect(store.isEditMode('security:codex')).toBe(true)

    // Simulate navigation route transition or user logout
    store.resetAll()

    // Everything must be purged
    ALL_SCOPES.forEach((scope) => {
      expect(store.isEditMode(scope)).toBe(false)
      expect(store.isDirty(scope)).toBe(false)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 6. EDITMODEBAR COMPONENT GOVERNANCE UI RENDERING
  // ──────────────────────────────────────────────────────────────────────────
  it('RULE 010.7: EditModeBar displays locked status in View Mode and transitions when enabled', () => {
    const { unmount } = render(
      <EditModeBar
        scope="academic:workspace"
        title="Academic Structure & Batch Management"
      />
    )

    // Default: View Mode banner
    expect(screen.getByText(/View Mode Active/i)).toBeDefined()
    expect(screen.getByText(/Read-Only Safety Lock/i)).toBeDefined()

    // Explicitly click Enable Edit Mode
    const enableButton = screen.getByRole('button', { name: /Enable Edit Mode/i })
    fireEvent.click(enableButton)

    // Re-renders with active warning banner
    expect(useEditModeStore.getState().isEditMode('academic:workspace')).toBe(true)
    expect(screen.getByText(/Edit Mode Active/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /Cancel Edit Mode/i })).toBeDefined()

    unmount()
  })
})
