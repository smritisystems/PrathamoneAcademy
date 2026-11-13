/**
 * @file        EduBoardDeviceCapabilities.test.tsx
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
 * @created     2026-11-13
 * @updated     2026-11-13
 *
 * @description Unit tests verifying hardware-independent device capability detection, screen classification, touch/stylus inspection, and the EduBoard Device Diagnostics modal.
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { detectDeviceCapabilities, type DeviceCapabilityProfile } from '../utils/deviceCapabilities'
import EduBoardDeviceDiagnosticsModal from '../components/eduboard/EduBoardDeviceDiagnosticsModal'

describe('Universal Device Capabilities Detection Suite', () => {
  it('detects default browser environment and returns capability profile', () => {
    const profile = detectDeviceCapabilities()
    expect(profile).toBeDefined()
    expect(typeof profile.screenWidth).toBe('number')
    expect(typeof profile.supportsFullscreen).toBe('boolean')
    expect(typeof profile.hasPointerEvents).toBe('boolean')
  })

  it('renders EduBoardDeviceDiagnosticsModal with detected profile metrics and regulatory disclaimer', () => {
    const mockProfile: DeviceCapabilityProfile = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      osFamily: 'Windows',
      browserFamily: 'Chrome',
      isStandalonePWA: false,
      screenWidth: 1920,
      screenHeight: 1080,
      viewportWidth: 1920,
      viewportHeight: 960,
      devicePixelRatio: 1,
      colorDepth: 24,
      displayClassification: '1080p Full HD Smart Board',
      orientation: 'landscape',
      hasPointerEvents: true,
      hasTouchEvents: true,
      maxTouchPoints: 10,
      primaryPointer: 'coarse',
      hasFinePointer: true,
      hasCoarsePointer: true,
      lastObservedPointerType: 'pen',
      hasObservedPressure: true,
      hasObservedTilt: false,
      supportsFullscreen: true,
      supportsFileUpload: true,
      supportsIndexedDB: true,
      supportsLocalStorage: true,
      supportsWebSockets: true,
      isOnline: true,
      connectionType: '4g',
    }

    const onClose = vi.fn()
    render(
      <EduBoardDeviceDiagnosticsModal
        isOpen={true}
        onClose={onClose}
        profile={mockProfile}
        wsState="connected"
        hasUnsavedChanges={false}
      />
    )

    // Check title and regulatory disclaimer
    expect(screen.getByText('Universal Device & Browser Diagnostics')).toBeTruthy()
    expect(screen.getByText(/Capability Detection Notice:/)).toBeTruthy()
    expect(screen.getByText('1080p Full HD Smart Board')).toBeTruthy()
    expect(screen.getByText(/Available \(10 points\)/)).toBeTruthy()
    expect(screen.getByText('pen')).toBeTruthy()
    expect(screen.getByText('Hardware Reported')).toBeTruthy()
    expect(screen.getByText('connected')).toBeTruthy()

    // Test close button
    const closeBtn = screen.getByRole('button', { name: 'Done' })
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
