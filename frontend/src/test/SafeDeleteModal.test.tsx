/**
 * @file        SafeDeleteModal.test.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.test.SafeDeleteModal
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-10
 * @updated     2026-11-10
 *
 * @description Comprehensive unit tests for enterprise DeleteConfirmationModal and Safe Delete UX.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import DeleteConfirmationModal from '../components/common/DeleteConfirmationModal'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { governanceApi } from '../api/endpoints'

vi.mock('../api/endpoints', () => ({
  governanceApi: {
    checkSafeDelete: vi.fn(),
    executeSafeDelete: vi.fn(),
    executeSafeDeactivate: vi.fn(),
    executeSafeArchive: vi.fn(),
  },
}))

describe('DeleteConfirmationModal — Enterprise Safe Delete Governance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: {
        id: 1,
        username: 'admin',
        full_name: 'Administrator',
        email: 'admin@test.com',
        role: 'superadmin',
        is_active: true,
        permissions: [],
      } as any,
    })
    useEditModeStore.setState({
      scopes: { 'test:scope': true },
    })
  })

  it('blocks permanent deletion for historical financial records with immutability directive', () => {
    render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={vi.fn()}
        scope="test:scope"
        entityType="Payment"
        entityName="RCP-2026-0045"
        entityId={105}
        isHistoricalFinancial={true}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByText(/Hard Deletion Prohibited/i)).toBeDefined()
    expect(screen.getByText(/Deletion blocked — transaction history/i)).toBeDefined()
    expect(screen.getByText(/Immutable Financial Record Protection Directive/i)).toBeDefined()
    expect(screen.queryByRole('button', { name: /Confirm.*Delete/i })).toBeNull()
  })

  it('renders eligible state and triggers onConfirm with optional reason', async () => {
    vi.mocked(governanceApi.checkSafeDelete).mockResolvedValueOnce({
      data: {
        entity_type: 'standard',
        entity_id: 55,
        entity_name: 'Class 9 Unused',
        is_eligible: true,
        dependent_counts: {},
        dependent_details: [],
        can_deactivate: true,
        can_archive: false,
        recommended_action: 'delete',
      },
    } as any)

    const onConfirmMock = vi.fn()

    render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={vi.fn()}
        scope="test:scope"
        entityType="Standard"
        entityName="Class 9 Unused"
        entityId={55}
        onConfirm={onConfirmMock}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Eligible for deletion/i)).toBeDefined()
    })

    const reasonInput = screen.getByPlaceholderText(/e\.g\. Created by mistake/i)
    fireEvent.change(reasonInput, { target: { value: 'Redundant test standard' } })

    const confirmBtn = screen.getByRole('button', { name: /Confirm Delete/i })
    expect(confirmBtn.hasAttribute('disabled')).toBe(false)
    fireEvent.click(confirmBtn)

    expect(onConfirmMock).toHaveBeenCalledWith('Redundant test standard')
  })

  it('renders blocked state with linked counts and alternative deactivate/archive actions', async () => {
    vi.mocked(governanceApi.checkSafeDelete).mockResolvedValueOnce({
      data: {
        entity_type: 'division',
        entity_id: 12,
        entity_name: 'Batch Beta',
        is_eligible: false,
        block_category: 'linked_records',
        block_reason: 'Cannot delete Batch Beta. 15 Enrolled Students exist.',
        dependent_counts: {
          'Enrolled Students': 15,
          'Timetable Entries': 4,
        },
        dependent_details: ['15 Enrolled Students', '4 Timetable Entries'],
        can_deactivate: true,
        can_archive: true,
        recommended_action: 'archive',
      },
    } as any)

    const onArchiveMock = vi.fn()
    const onDeactivateMock = vi.fn()

    render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={vi.fn()}
        scope="test:scope"
        entityType="Batch"
        entityName="Batch Beta"
        entityId={12}
        onConfirm={vi.fn()}
        onArchive={onArchiveMock}
        onDeactivate={onDeactivateMock}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Deletion blocked — linked records/i)).toBeDefined()
    })

    expect(screen.getByText('15')).toBeDefined()
    expect(screen.getAllByText(/Enrolled Students/i).length).toBeGreaterThan(0)
    expect(screen.getByText('4')).toBeDefined()

    // Confirm button must NOT be present
    expect(screen.queryByRole('button', { name: /Confirm.*Delete/i })).toBeNull()

    // Deactivate and Archive alternatives are present
    const archiveBtn = screen.getByRole('button', { name: /Archive Record Instead/i })
    const deactBtn = screen.getByRole('button', { name: /Deactivate Record Instead/i })

    expect(archiveBtn).toBeDefined()
    expect(deactBtn).toBeDefined()

    fireEvent.click(archiveBtn)
    expect(onArchiveMock).toHaveBeenCalled()
  })

  it('enforces View Mode lock when scope is not in active Edit Mode', async () => {
    useEditModeStore.setState({
      scopes: { 'test:scope': false }, // View mode
    })

    vi.mocked(governanceApi.checkSafeDelete).mockResolvedValueOnce({
      data: {
        entity_type: 'standard',
        entity_id: 99,
        entity_name: 'Class 10',
        is_eligible: true,
        dependent_counts: {},
        dependent_details: [],
        can_deactivate: true,
        can_archive: false,
        recommended_action: 'delete',
      },
    } as any)

    render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={vi.fn()}
        scope="test:scope"
        entityType="Standard"
        entityName="Class 10"
        entityId={99}
        onConfirm={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Edit Mode Required/i)).toBeDefined()
    })

    const confirmBtn = screen.getByRole('button', { name: /Confirm Delete/i })
    expect(confirmBtn.hasAttribute('disabled')).toBe(true)
  })

  it('enforces typed confirmation when requireTypedConfirmation=true', async () => {
    vi.mocked(governanceApi.checkSafeDelete).mockResolvedValueOnce({
      data: {
        entity_type: 'standard',
        entity_id: 101,
        entity_name: 'Important Record',
        is_eligible: true,
        dependent_counts: {},
        dependent_details: [],
        can_deactivate: true,
        can_archive: false,
        recommended_action: 'delete',
      },
    } as any)

    render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={vi.fn()}
        scope="test:scope"
        entityType="Standard"
        entityName="Important Record"
        entityId={101}
        requireTypedConfirmation={true}
        onConfirm={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Type DELETE/i)).toBeDefined()
    })

    const confirmBtn = screen.getByRole('button', { name: /Confirm Delete/i })
    expect(confirmBtn.hasAttribute('disabled')).toBe(true)

    const typeInput = screen.getByPlaceholderText(/Type DELETE/i)
    fireEvent.change(typeInput, { target: { value: 'DELETE' } })

    expect(confirmBtn.hasAttribute('disabled')).toBe(false)
  })
})
