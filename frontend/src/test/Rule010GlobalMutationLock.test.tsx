/**
 * @file        Rule010GlobalMutationLock.test.tsx
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
 * @description Comprehensive test suite proving Rule 010 Global Mutation Control locking in View Mode, scope isolation, WorkforceHeroCard protection, and DeleteConfirmationModal integration.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Plus, Trash2, Edit3, ArrowRight } from 'lucide-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  LockedButton,
  LockedIconButton,
  LockedLinkButton,
  EditModeBar,
  DeleteConfirmationModal,
} from '../components/common'
import WorkforceHeroCard from '../components/workforce/WorkforceHeroCard'
import { useEditModeStore } from '../store/editModeStore'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { MemoryRouter } from 'react-router-dom'
import type { User } from '../types'

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

const adminUser: User = {
  id: 1,
  username: 'admin',
  first_name: 'Admin',
  last_name: 'User',
  email: 'admin@aitdl.edu.in',
  role: 'admin',
  is_active: true,
  permissions: ['*:*'],
}

const restrictedUser: User = {
  id: 99,
  username: 'viewer',
  first_name: 'Viewer',
  last_name: 'User',
  email: 'viewer@aitdl.edu.in',
  role: 'student',
  is_active: true,
  permissions: [],
}

describe('Rule 010 Global Mutation Controls Locking Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useEditModeStore.getState().resetAll()
    useAuthStore.setState({ user: adminUser })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 1. LockedButton Unit Specifications
  // ───────────────────────────────────────────────────────────────────────────
  it('SPEC 1: LockedButton renders with Lock icon and locked label in View Mode', () => {
    const handleAction = vi.fn()
    render(
      <LockedButton isEditMode={false} onClick={handleAction} icon={Plus}>
        Add Address
      </LockedButton>
    )

    expect(screen.getByText('Add Address')).toBeDefined()
    expect(screen.getByText('(Locked)')).toBeDefined()
    expect(screen.getByRole('button').getAttribute('aria-disabled')).toBe('true')

    // Click in View Mode must NOT fire action callback and must show error toast
    fireEvent.click(screen.getByRole('button'))
    expect(handleAction).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/Locked in View Mode/i)
    )
  })

  it('SPEC 2: LockedButton unlocks and executes callback when Edit Mode is active', () => {
    const handleAction = vi.fn()
    render(
      <LockedButton isEditMode={true} onClick={handleAction} icon={Plus}>
        Add Address
      </LockedButton>
    )

    expect(screen.getByText('Add Address')).toBeDefined()
    expect(screen.queryByText('(Locked)')).toBeNull()

    fireEvent.click(screen.getByRole('button'))
    expect(handleAction).toHaveBeenCalledTimes(1)
  })

  it('SPEC 3: LockedButton remains locked if user lacks permission even in Edit Mode', () => {
    const handleAction = vi.fn()
    render(
      <LockedButton
        isEditMode={true}
        isAuthorized={false}
        onClick={handleAction}
        icon={Plus}
        unauthorizedTooltip="Your account does not have permission to perform this action."
      >
        Add Address
      </LockedButton>
    )

    expect(screen.getByText('(Locked)')).toBeDefined()
    fireEvent.click(screen.getByRole('button'))
    expect(handleAction).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith(
      'Your account does not have permission to perform this action.'
    )
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 2. LockedIconButton Unit Specifications
  // ───────────────────────────────────────────────────────────────────────────
  it('SPEC 4: LockedIconButton renders muted locked state in View Mode and blocks deletion', () => {
    const handleDelete = vi.fn()
    render(
      <LockedIconButton
        isEditMode={false}
        onClick={handleDelete}
        icon={Trash2}
        title="Delete Address"
        tone="danger"
      />
    )

    const btn = screen.getByRole('button')
    expect(btn.getAttribute('title')).toMatch(/Locked in View Mode/i)
    expect(btn.getAttribute('aria-disabled')).toBe('true')

    fireEvent.click(btn)
    expect(handleDelete).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/Locked in View Mode/i)
    )
  })

  it('SPEC 5: LockedIconButton unlocks and executes mutation callback when Edit Mode is active', () => {
    const handleDelete = vi.fn()
    render(
      <LockedIconButton
        isEditMode={true}
        onClick={handleDelete}
        icon={Trash2}
        title="Delete Address"
        tone="danger"
      />
    )

    const btn = screen.getByRole('button')
    expect(btn.getAttribute('title')).toBe('Delete Address')

    fireEvent.click(btn)
    expect(handleDelete).toHaveBeenCalledTimes(1)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 3. LockedLinkButton Unit Specifications
  // ───────────────────────────────────────────────────────────────────────────
  it('SPEC 6: LockedLinkButton renders locked text in View Mode and prevents action', () => {
    const handlePrimary = vi.fn()
    render(
      <LockedLinkButton
        isEditMode={false}
        onClick={handlePrimary}
        label="Set as Primary"
      />
    )

    expect(screen.getByText(/Set as Primary \(Locked\)/i)).toBeDefined()
    fireEvent.click(screen.getByRole('button'))
    expect(handlePrimary).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/Locked in View Mode/i)
    )
  })

  it('SPEC 7: LockedLinkButton unlocks in Edit Mode and calls handler', () => {
    const handlePrimary = vi.fn()
    render(
      <LockedLinkButton
        isEditMode={true}
        onClick={handlePrimary}
        label="Set as Primary"
      />
    )

    expect(screen.getByText('Set as Primary')).toBeDefined()
    expect(screen.queryByText(/Locked/i)).toBeNull()

    fireEvent.click(screen.getByRole('button'))
    expect(handlePrimary).toHaveBeenCalledTimes(1)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 4. WorkforceHeroCard Governance Specifications
  // ───────────────────────────────────────────────────────────────────────────
  it('SPEC 8: WorkforceHeroCard Edit button and Action dropdown items appear locked in View Mode', () => {
    const handleEdit = vi.fn()
    const handleAction = vi.fn()

    render(
      <MemoryRouter>
        <WorkforceHeroCard
          type="teacher"
          name="Dr. Anjali Sharma"
          code="TCH-1008"
          designation="Senior Faculty"
          email="anjali@aitdl.edu.in"
          status="active"
          stats={[]}
          isEditMode={false}
          onEdit={handleEdit}
          onAction={handleAction}
        />
      </MemoryRouter>
    )

    // Edit button must visibly state Edit (Locked)
    const editBtn = screen.getByText(/Edit \(Locked\)/i)
    expect(editBtn).toBeDefined()

    // Clicking Edit button in View Mode must NOT run onEdit
    fireEvent.click(editBtn)
    expect(handleEdit).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/Locked in View Mode/i)
    )

    // Open Actions dropdown
    const actionsBtn = screen.getByText('Actions')
    fireEvent.click(actionsBtn)

    // Dropdown items must indicate locked status
    expect(screen.getByText(/Update Employment Status \(Locked\)/i)).toBeDefined()
    expect(screen.getByText(/Assign Batch & Subject \(Locked\)/i)).toBeDefined()

    // Clicking locked action item in dropdown must NOT execute callback
    fireEvent.click(screen.getByText(/Update Employment Status \(Locked\)/i))
    expect(handleAction).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/Locked in View Mode/i)
    )
  })

  it('SPEC 9: WorkforceHeroCard unlocks Edit button and Actions in active Edit Mode', () => {
    const handleEdit = vi.fn()
    const handleAction = vi.fn()

    render(
      <MemoryRouter>
        <WorkforceHeroCard
          type="teacher"
          name="Dr. Anjali Sharma"
          code="TCH-1008"
          designation="Senior Faculty"
          email="anjali@aitdl.edu.in"
          status="active"
          stats={[]}
          isEditMode={true}
          onEdit={handleEdit}
          onAction={handleAction}
        />
      </MemoryRouter>
    )

    const editBtn = screen.getByRole('button', { name: /Edit/i })
    expect(screen.queryByText(/Edit \(Locked\)/i)).toBeNull()

    fireEvent.click(editBtn)
    expect(handleEdit).toHaveBeenCalledTimes(1)

    // Open Actions dropdown
    fireEvent.click(screen.getByText('Actions'))
    const updateStatusBtn = screen.getByText('Update Employment Status')
    fireEvent.click(updateStatusBtn)
    expect(handleAction).toHaveBeenCalledWith('lifecycle')
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Scope Isolation Specifications
  // ───────────────────────────────────────────────────────────────────────────
  it('SPEC 10: Scope isolation prevents Contact & Addresses edit mode from unlocking Payroll or Employment', () => {
    const contactsScope = 'teacher:profile:42:contacts'
    const payrollScope = 'teacher:profile:42:payroll'
    const employmentScope = 'teacher:profile:42:employment'

    // Initially all scopes are in View Mode
    expect(useEditModeStore.getState().isEditMode(contactsScope)).toBe(false)
    expect(useEditModeStore.getState().isEditMode(payrollScope)).toBe(false)
    expect(useEditModeStore.getState().isEditMode(employmentScope)).toBe(false)

    // Activate Edit Mode for Contact & Addresses ONLY
    const res = useEditModeStore.getState().enableEditMode(contactsScope, adminUser)
    expect(res.success).toBe(true)

    // Contacts scope is active
    expect(useEditModeStore.getState().isEditMode(contactsScope)).toBe(true)

    // Crucially: Payroll and Employment remain LOCKED in View Mode
    expect(useEditModeStore.getState().isEditMode(payrollScope)).toBe(false)
    expect(useEditModeStore.getState().isEditMode(employmentScope)).toBe(false)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 6. DeleteConfirmationModal Integration Specifications
  // ───────────────────────────────────────────────────────────────────────────
  it('SPEC 11: DeleteConfirmationModal blocks confirmation if rendered in View Mode', () => {
    const handleConfirm = vi.fn()
    const handleClose = vi.fn()

    render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={handleClose}
        scope="teacher:profile:42:contacts"
        entityType="Staff Address"
        entityName="Powai Residential Address"
        entityId={101}
        onConfirm={handleConfirm}
      />
    )

    // Modal renders Edit Mode Required warning
    expect(screen.getByText(/Edit Mode Required:/i)).toBeDefined()
    expect(
      screen.getByText(/You cannot perform deletions while the workspace is in View Mode/i)
    ).toBeDefined()

    // Confirm button is disabled
    const confirmBtn = screen.getByRole('button', { name: /Delete Staff Address/i })
    expect(confirmBtn.hasAttribute('disabled')).toBe(true)

    fireEvent.click(confirmBtn)
    expect(handleConfirm).not.toHaveBeenCalled()
  })
})

