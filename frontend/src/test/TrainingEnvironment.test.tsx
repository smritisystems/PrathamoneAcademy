/**
 * @file        TrainingEnvironment.test.tsx
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
 * @description Unit test suite for Global Training & Demo Environment state store, banner indicators, badges, and print governance overrides.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { useEnvironmentStore } from '../store/environmentStore'
import { TrainingModeBanner } from '../components/common/TrainingModeBanner'
import { DemoBadge } from '../components/common/DemoBadge'
import { EnvironmentSwitchModal } from '../components/common/EnvironmentSwitchModal'
import { PrintFooter } from '../components/printing/PrintFooter'

vi.mock('../api/endpoints', () => ({
  trainingApi: {
    getStatus: vi.fn().mockResolvedValue({ data: {} }),
    pingSession: vi.fn().mockResolvedValue({ data: { status: 'OK' } }),
    exitSession: vi.fn().mockResolvedValue({ data: { status: 'OK' } }),
    triggerReset: vi.fn().mockResolvedValue({ data: { status: 'SUCCESS' } }),
    seedDataset: vi.fn().mockResolvedValue({ data: { status: 'SUCCESS' } }),
    getResetLogs: vi.fn().mockResolvedValue({ data: [] }),
    updateConfig: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

describe('Global Training & Demo Environment Governance', () => {
  beforeEach(() => {
    localStorage.clear()
    useEnvironmentStore.setState({
      dataEnvironment: 'PRODUCTION',
      isTrainingMode: false,
      activeDatasetVersion: 'CRM-STAFF-TRAINING-V1',
    })
  })

  describe('1. Environment Store (Zustand)', () => {
    it('initializes in PRODUCTION mode with isTrainingMode=false', () => {
      const state = useEnvironmentStore.getState()
      expect(state.dataEnvironment).toBe('PRODUCTION')
      expect(state.isTrainingMode).toBe(false)
    })

    it('switches to TRAINING mode and toggles isTrainingMode to true', () => {
      useEnvironmentStore.getState().setEnvironment('TRAINING')
      const state = useEnvironmentStore.getState()
      expect(state.dataEnvironment).toBe('TRAINING')
      expect(state.isTrainingMode).toBe(true)
    })

    it('toggles back to PRODUCTION mode cleanly', () => {
      useEnvironmentStore.getState().setEnvironment('TRAINING')
      useEnvironmentStore.getState().setEnvironment('PRODUCTION')
      const state = useEnvironmentStore.getState()
      expect(state.dataEnvironment).toBe('PRODUCTION')
      expect(state.isTrainingMode).toBe(false)
    })

    it('resets to PRODUCTION when prashant-logout event is dispatched', () => {
      useEnvironmentStore.getState().setEnvironment('TRAINING')
      expect(useEnvironmentStore.getState().isTrainingMode).toBe(true)

      window.dispatchEvent(new Event('prashant-logout'))
      expect(useEnvironmentStore.getState().dataEnvironment).toBe('PRODUCTION')
      expect(useEnvironmentStore.getState().isTrainingMode).toBe(false)
    })
  })

  describe('2. TrainingModeBanner Component', () => {
    it('does not render banner when in PRODUCTION mode', () => {
      useEnvironmentStore.setState({ isTrainingMode: false })
      const { container } = render(<TrainingModeBanner onManageClick={() => {}} />)
      expect(container.firstChild).toBeNull()
    })

    it('renders high-visibility banner when in TRAINING mode', () => {
      useEnvironmentStore.setState({ isTrainingMode: true, dataEnvironment: 'TRAINING' })
      render(<TrainingModeBanner onManageClick={() => {}} />)

      expect(screen.getByText(/TRAINING MODE/i)).toBeDefined()
      expect(screen.getByText(/DEMO DATA — NOT LIVE/i)).toBeDefined()
      expect(screen.getByText(/Switch to Live/i)).toBeDefined()
      expect(screen.getByText(/Manage Dataset/i)).toBeDefined()
    })

    it('triggers manage click when Manage Dataset button is clicked', () => {
      const handleManage = vi.fn()
      useEnvironmentStore.setState({ isTrainingMode: true, dataEnvironment: 'TRAINING' })
      render(<TrainingModeBanner onManageClick={handleManage} />)

      const manageBtn = screen.getByText(/Manage Dataset/i)
      fireEvent.click(manageBtn)
      expect(handleManage).toHaveBeenCalledTimes(1)
    })
  })

  describe('3. DemoBadge Component', () => {
    it('renders DEMO text badge with warning styling', () => {
      render(<DemoBadge />)
      const badge = screen.getByText('DEMO')
      expect(badge).toBeDefined()
      expect(badge.className).toContain('bg-amber-100')
      expect(badge.className).toContain('text-amber-800')
    })

    it('supports custom size and className extensions', () => {
      render(<DemoBadge size="sm" className="custom-test-class" />)
      const badge = screen.getByText('DEMO')
      expect(badge.className).toContain('custom-test-class')
    })
  })

  describe('4. EnvironmentSwitchModal Component', () => {
    it('renders warning message for switching from PRODUCTION to TRAINING', async () => {
      const handleConfirm = vi.fn()
      const handleClose = vi.fn()

      render(
        <EnvironmentSwitchModal
          isOpen={true}
          onClose={handleClose}
          targetEnvironment="TRAINING"
          onConfirm={handleConfirm}
        />
      )

      expect(screen.getByText(/Switch to Training & Demo Mode\?/i)).toBeDefined()
      expect(screen.getByText(/isolated training database/i)).toBeDefined()

      const confirmBtn = screen.getByRole('button', { name: /Switch to Training Mode/i })
      fireEvent.click(confirmBtn)
      await waitFor(() => {
        expect(handleConfirm).toHaveBeenCalledTimes(1)
      })
    })

    it('renders warning message for returning to LIVE PRODUCTION', async () => {
      const handleConfirm = vi.fn()
      const handleClose = vi.fn()

      render(
        <EnvironmentSwitchModal
          isOpen={true}
          onClose={handleClose}
          targetEnvironment="PRODUCTION"
          onConfirm={handleConfirm}
        />
      )

      expect(screen.getByText(/Switch to Live Production Mode\?/i)).toBeDefined()
      expect(screen.getByText(/real institution records/i)).toBeDefined()

      const confirmBtn = screen.getByRole('button', { name: /Return to Live Mode/i })
      fireEvent.click(confirmBtn)
      await waitFor(() => {
        expect(handleConfirm).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('5. PrintFooter Governance Override', () => {
    it('displays standard classification in PRODUCTION mode', () => {
      useEnvironmentStore.setState({ isTrainingMode: false })
      render(<PrintFooter documentId="DOC-001" classification="Confidential" />)

      expect(screen.getByText(/Confidential/i)).toBeDefined()
      expect(screen.queryByText(/DEMO \/ TRAINING ONLY/i)).toBeNull()
    })

    it('overrides classification with DEMO / TRAINING ONLY when in TRAINING mode', () => {
      useEnvironmentStore.setState({ isTrainingMode: true, dataEnvironment: 'TRAINING' })
      render(<PrintFooter documentId="DOC-001" classification="Confidential" />)

      expect(screen.getByText(/DEMO \/ TRAINING ONLY/i)).toBeDefined()
    })
  })
})
