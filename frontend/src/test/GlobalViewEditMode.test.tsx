/**
 * @file        GlobalViewEditMode.test.tsx
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
 * @description Comprehensive test suite validating Global View-First & Explicit Edit Mode governance, scoped state management, permission barriers, navigation reset, and delete protection.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useEditModeStore } from '../store/editModeStore'
import { useAuthStore } from '../store/authStore'
import EditModeBar from '../components/common/EditModeBar'
import DeleteConfirmationModal from '../components/common/DeleteConfirmationModal'
import type { User } from '../types'

describe('Global View-First & Explicit Edit Mode Governance Suite', () => {
  const adminUser: User = {
    id: 1,
    username: 'admin',
    email: 'admin@prashant.edu',
    first_name: 'Admin',
    last_name: 'User',
    role: 'admin',
    institution_id: 1,
    permissions: ['students:edit', 'academic:manage', 'settings:manage'],
  }

  const readOnlyUser: User = {
    id: 2,
    username: 'guest',
    email: 'guest@prashant.edu',
    first_name: 'Guest',
    last_name: 'Viewer',
    role: 'student_viewer',
    institution_id: 1,
    permissions: ['students:view'],
  }

  beforeEach(() => {
    useEditModeStore.getState().resetAll()
    useAuthStore.setState({ user: adminUser, token: 'fake-token' })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 1. ZUSTAND STORE SPECIFICATION TESTS
  // ──────────────────────────────────────────────────────────────────────────
  it('RULE 1: Default application state is View Mode across all scopes', () => {
    const store = useEditModeStore.getState()
    expect(store.isEditMode('academic:batches')).toBe(false)
    expect(store.isEditMode('students:detail:101')).toBe(false)
    expect(store.isEditMode('teacher:profile:42')).toBe(false)
    expect(store.isEditMode('sysadmin:settings')).toBe(false)
    expect(store.isDirty('academic:batches')).toBe(false)
  })

  it('RULE 2: Authorized user can explicitly enable Edit Mode for a targeted scope', () => {
    const store = useEditModeStore.getState()
    const result = store.enableEditMode('academic:batches', adminUser)

    expect(result.success).toBe(true)
    expect(store.isEditMode('academic:batches')).toBe(true)
    // Other scopes MUST remain in View Mode (strictly scoped isolation)
    expect(store.isEditMode('students:detail:101')).toBe(false)
  })

  it('RULE 3: Unauthorized user or unauthenticated user cannot enable Edit Mode', () => {
    const store = useEditModeStore.getState()

    // 1. Unauthenticated
    const unauthResult = store.enableEditMode('academic:batches', null)
    expect(unauthResult.success).toBe(false)
    expect(store.isEditMode('academic:batches')).toBe(false)

    // 2. Read-only role
    const readOnlyResult = store.enableEditMode('academic:batches', readOnlyUser)
    expect(readOnlyResult.success).toBe(false)
    expect(store.isEditMode('academic:batches')).toBe(false)

    // 3. Specific permission missing
    const permResult = store.enableEditMode('academic:batches', adminUser, 'finance:super_audit')
    expect(permResult.success).toBe(false)
    expect(store.isEditMode('academic:batches')).toBe(false)
  })

  it('RULE 4: Disabling edit mode returns scope cleanly to View Mode and resets dirty state', () => {
    const store = useEditModeStore.getState()
    store.enableEditMode('students:detail:55', adminUser)
    store.setDirty('students:detail:55', true)

    expect(store.isEditMode('students:detail:55')).toBe(true)
    expect(store.isDirty('students:detail:55')).toBe(true)

    store.disableEditMode('students:detail:55')

    expect(store.isEditMode('students:detail:55')).toBe(false)
    expect(store.isDirty('students:detail:55')).toBe(false)
  })

  it('RULE 5: resetAll() terminates all active Edit Modes globally (navigation/logout reset)', () => {
    const store = useEditModeStore.getState()
    store.enableEditMode('scope:1', adminUser)
    store.enableEditMode('scope:2', adminUser)
    store.setDirty('scope:1', true)

    expect(store.isEditMode('scope:1')).toBe(true)
    expect(store.isEditMode('scope:2')).toBe(true)

    store.resetAll()

    expect(store.isEditMode('scope:1')).toBe(false)
    expect(store.isEditMode('scope:2')).toBe(false)
    expect(store.isDirty('scope:1')).toBe(false)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 2. EDIT MODE BAR UI COMPONENT TESTS
  // ──────────────────────────────────────────────────────────────────────────
  it('EditModeBar displays View Mode badge and Enable Edit Mode button in View Mode', () => {
    render(
      <EditModeBar
        scope="academic:batches"
        title="Classroom Batches Workspace"
      />
    )

    // Must show View Mode indication
    expect(screen.getByText(/View Mode Active/i)).toBeDefined()
    expect(screen.getByText(/Read-Only Safety Lock/i)).toBeDefined()

    // Must show Enable Edit Mode button
    const enableBtn = screen.getByRole('button', { name: /Enable Edit Mode/i })
    expect(enableBtn).toBeDefined()
  })

  it('Clicking Enable Edit Mode unlocks Edit Mode and transitions to amber warning banner', () => {
    render(
      <EditModeBar
        scope="academic:batches"
        title="Classroom Batches Workspace"
      />
    )

    const enableBtn = screen.getByRole('button', { name: /Enable Edit Mode/i })
    fireEvent.click(enableBtn)

    // State updated in store
    expect(useEditModeStore.getState().isEditMode('academic:batches')).toBe(true)

    // Re-renders with Edit Mode Active banner
    expect(screen.getByText(/Edit Mode Active/i)).toBeDefined()
    expect(screen.getByText(/Cancel Edit Mode/i)).toBeDefined()
  })

  it('EditModeBar invokes onSave callback and onCancel exit properly', () => {
    useEditModeStore.getState().enableEditMode('academic:batches', adminUser)
    const onSaveMock = vi.fn()
    const onCancelMock = vi.fn()

    render(
      <EditModeBar
        scope="academic:batches"
        title="Classroom Batches Workspace"
        onSave={onSaveMock}
        onCancel={onCancelMock}
      />
    )

    // Save button
    const saveBtn = screen.getByRole('button', { name: /Save & Exit/i })
    fireEvent.click(saveBtn)
    expect(onSaveMock).toHaveBeenCalledTimes(1)

    // Cancel button
    const cancelBtn = screen.getByRole('button', { name: /Cancel Edit Mode/i })
    fireEvent.click(cancelBtn)
    expect(onCancelMock).toHaveBeenCalledTimes(1)
    expect(useEditModeStore.getState().isEditMode('academic:batches')).toBe(false)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 3. DELETE CONFIRMATION MODAL TESTS
  // ──────────────────────────────────────────────────────────────────────────
  it('DeleteConfirmationModal blocks deletion when workspace is in View Mode', () => {
    const onConfirmMock = vi.fn()

    render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={vi.fn()}
        scope="students:detail:12"
        entityType="Student Document"
        entityName="Birth Certificate Scan"
        entityId={12}
        onConfirm={onConfirmMock}
      />
    )

    // Warning that edit mode is required
    expect(screen.getByText(/Edit Mode Required/i)).toBeDefined()

    // The confirm button must be disabled
    const deleteBtn = screen.getByRole('button', { name: /Confirm Delete/i })
    expect(deleteBtn.hasAttribute('disabled')).toBe(true)

    fireEvent.click(deleteBtn)
    expect(onConfirmMock).not.toHaveBeenCalled()
  })

  it('DeleteConfirmationModal strictly prohibits hard deletion of historical financial records', () => {
    // Even if edit mode is active, historical financial records are immutable!
    useEditModeStore.getState().enableEditMode('finance:payments', adminUser)
    const onConfirmMock = vi.fn()

    render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={vi.fn()}
        scope="finance:payments"
        entityType="Payment Receipt"
        entityName="Receipt #REC-2026-0042"
        entityId={42}
        isHistoricalFinancial={true}
        onConfirm={onConfirmMock}
      />
    )

    // Header and warning
    expect(screen.getByText(/Hard Deletion Prohibited/i)).toBeDefined()
    expect(screen.getByText(/Immutable Financial Record Protection Directive/i)).toBeDefined()

    // Confirm button must NOT be rendered at all
    expect(screen.queryByRole('button', { name: /Confirm Delete/i })).toBeNull()
  })

  it('DeleteConfirmationModal allows authorized deletion when Edit Mode is active', () => {
    useEditModeStore.getState().enableEditMode('students:detail:12', adminUser)
    const onConfirmMock = vi.fn()

    render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={vi.fn()}
        scope="students:detail:12"
        entityType="Student Document"
        entityName="Extracurricular Certificate"
        entityId={88}
        onConfirm={onConfirmMock}
      />
    )

    // No edit mode warning
    expect(screen.queryByText(/Edit Mode Required/i)).toBeNull()

    // Confirm button is enabled and works
    const deleteBtn = screen.getByRole('button', { name: /Confirm Delete/i })
    expect(deleteBtn.hasAttribute('disabled')).toBe(false)

    fireEvent.click(deleteBtn)
    expect(onConfirmMock).toHaveBeenCalledTimes(1)
  })
})
