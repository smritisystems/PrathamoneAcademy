/**
 * @file        DeviceBindingSettings.test.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.test
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-19
 * @updated     2026-11-19
 *
 * @description Vitest test suite for Optional Device-Wise Security Binding settings panel, policy selection, and safe disablement.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DeviceBindingSettingsPanel from '../components/settings/DeviceBindingSettingsPanel'
import { deviceBindingApi } from '../api/endpoints'

vi.mock('../api/endpoints', () => ({
  deviceBindingApi: {
    getDevices: vi.fn(),
    approveDevice: vi.fn(),
    revokeDevice: vi.fn(),
    deleteDevice: vi.fn(),
    safeDisable: vi.fn(),
  },
}))

describe('DeviceBindingSettingsPanel', () => {
  const mockSettings = {
    enable_device_binding: false,
    policy_mode: 'disabled',
    verification_method: 'device_fingerprint',
    max_registered_devices: 3,
    new_device_approval_policy: 'admin_approval',
    otp_verification_required: false,
    device_management_permissions: 'admin_only',
    shadow_mode: true,
  }

  const mockDevices = [
    {
      id: 101,
      institution_id: 1,
      user_id: 5,
      user_name: 'Rajesh Sharma',
      user_email: 'rajesh@prashantacademy.com',
      device_fingerprint: 'sha256_mock_fp_windows_surface_pro_001',
      device_name: 'Teacher Windows Surface',
      device_type: 'laptop',
      browser_info: 'Chrome 122',
      os_info: 'Windows 11',
      status: 'active',
      is_trusted: true,
      last_used_at: '2026-11-18T10:00:00Z',
      registered_at: '2026-11-01T08:00:00Z',
    },
    {
      id: 102,
      institution_id: 1,
      user_id: 8,
      user_name: 'Pooja Patil',
      user_email: 'pooja@prashantacademy.com',
      device_fingerprint: 'sha256_mock_fp_ipad_air_002',
      device_name: 'Classroom iPad',
      device_type: 'tablet',
      browser_info: 'Safari Mobile',
      os_info: 'iPadOS 17',
      status: 'pending_approval',
      is_trusted: false,
      last_used_at: null,
      registered_at: '2026-11-18T15:30:00Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(deviceBindingApi.getDevices).mockResolvedValue({
      data: { status: 'success', count: mockDevices.length, devices: mockDevices },
    } as any)
  })

  it('1. Renders default disabled state with breadcrumb and status pill', async () => {
    render(
      <DeviceBindingSettingsPanel
        settings={mockSettings}
        onChange={vi.fn()}
        isEditMode={false}
      />
    )

    expect(screen.getByText('Device-Wise Security Binding')).toBeDefined()
    expect(screen.getByText('Disabled by Default (Open Login)')).toBeDefined()
    expect(screen.getByText('Settings')).toBeDefined()
    expect(screen.getByText('Device Binding')).toBeDefined()
  })

  it('2. Renders all 4 flexible security policies', () => {
    render(
      <DeviceBindingSettingsPanel
        settings={mockSettings}
        onChange={vi.fn()}
        isEditMode={true}
      />
    )

    expect(screen.getByText('1. Disabled (Default)')).toBeDefined()
    expect(screen.getByText('2. Optional Registration')).toBeDefined()
    expect(screen.getByText('3. Registered Devices Only')).toBeDefined()
    expect(screen.getByText('4. Admin Approval Required')).toBeDefined()
  })

  it('3. Renders verification controls, maximum devices stepper, and permissions', () => {
    render(
      <DeviceBindingSettingsPanel
        settings={mockSettings}
        onChange={vi.fn()}
        isEditMode={true}
      />
    )

    expect(screen.getByText('Device Verification Method')).toBeDefined()
    expect(screen.getByText('Maximum Registered Devices Per User')).toBeDefined()
    expect(screen.getByText('New Device Approval Policy')).toBeDefined()
    expect(screen.getByText('Device Management Permissions')).toBeDefined()
    expect(screen.getByText('OTP Verification Requirement')).toBeDefined()
    expect(screen.getByText('Shadow Mode (Audit-Only Observation)')).toBeDefined()
  })

  it('4. Renders Safe Disablement and Licensing Independence assurances', () => {
    render(
      <DeviceBindingSettingsPanel
        settings={mockSettings}
        onChange={vi.fn()}
        isEditMode={false}
      />
    )

    expect(
      screen.getByText('Safe Disablement & Licensing Independence Assurance')
    ).toBeDefined()
    expect(
      screen.getByText(/Device Binding is completely independent of subscription licenses/i)
    ).toBeDefined()
  })

  it('5. In Edit Mode, toggling policy mode calls onChange', () => {
    const handleChange = vi.fn()
    render(
      <DeviceBindingSettingsPanel
        settings={mockSettings}
        onChange={handleChange}
        isEditMode={true}
      />
    )

    fireEvent.click(screen.getByText('2. Optional Registration'))
    expect(handleChange).toHaveBeenCalledWith('policy_mode', 'optional_registration')
    expect(handleChange).toHaveBeenCalledWith('enable_device_binding', true)
  })

  it('6. Loads and displays registered devices table with statuses', async () => {
    render(
      <DeviceBindingSettingsPanel
        settings={mockSettings}
        onChange={vi.fn()}
        isEditMode={true}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Teacher Windows Surface')).toBeDefined()
      expect(screen.getByText('Classroom iPad')).toBeDefined()
      expect(screen.getByText('Rajesh Sharma')).toBeDefined()
      expect(screen.getByText('Pending Approval')).toBeDefined()
    })
  })

  it('7. Approves a pending device when clicking Approve button in Edit Mode', async () => {
    vi.mocked(deviceBindingApi.approveDevice).mockResolvedValue({
      data: { status: 'success', message: 'Device approved' },
    } as any)

    render(
      <DeviceBindingSettingsPanel
        settings={mockSettings}
        onChange={vi.fn()}
        isEditMode={true}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Approve' })).toBeDefined()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    await waitFor(() => {
      expect(deviceBindingApi.approveDevice).toHaveBeenCalledWith(102, undefined)
    })
  })

  it('8. Renders Register This Device and Add Device buttons', async () => {
    render(
      <DeviceBindingSettingsPanel
        settings={mockSettings}
        onChange={vi.fn()}
        isEditMode={true}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Register This Device/i })).toBeDefined()
      expect(screen.getByRole('button', { name: /Add Device/i })).toBeDefined()
    })
  })

  it('9. Filters inventory devices by status filter tab', async () => {
    render(
      <DeviceBindingSettingsPanel
        settings={mockSettings}
        onChange={vi.fn()}
        isEditMode={true}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Teacher Windows Surface')).toBeDefined()
    })

    const pendingBtn = screen.getByRole('button', { name: /Pending Approval \(1\)/i })
    fireEvent.click(pendingBtn)

    await waitFor(() => {
      expect(screen.queryByText('Teacher Windows Surface')).toBeNull()
      expect(screen.getByText('Classroom iPad')).toBeDefined()
    })
  })
})
