/**
 * @file        DeviceBindingSettingsPanel.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.settings
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
 * @description Settings panel for optional device-wise security binding, policy configuration, safe disablement, and hardware inventory.
 */

import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Laptop,
  Monitor,
  AlertCircle,
  CheckCircle2,
  Info,
  Lock,
  Unlock,
  RefreshCw,
  Trash2,
  Sliders,
  Check,
  X,
  Radio,
  Plus,
  Search,
} from 'lucide-react'
import { deviceBindingApi } from '../../api/endpoints'
import type {
  DeviceBindingPolicyMode,
  DeviceVerificationMethod,
  DeviceApprovalPolicy,
  DeviceManagementPermission,
  UserDeviceItem,
} from '../../types'

interface DeviceBindingSettingsPanelProps {
  settings: Record<string, any>
  onChange: (key: string, value: any) => void
  isEditMode: boolean
  institutionId?: number
  onRefresh?: () => void
}

export default function DeviceBindingSettingsPanel({
  settings,
  onChange,
  isEditMode,
  institutionId,
  onRefresh,
}: DeviceBindingSettingsPanelProps) {
  const isEnabled = Boolean(settings.enable_device_binding ?? false)
  const policyMode: DeviceBindingPolicyMode = settings.policy_mode || 'disabled'
  const verificationMethod: DeviceVerificationMethod =
    settings.verification_method || 'device_fingerprint'
  const maxDevices = Number(settings.max_registered_devices ?? 3)
  const approvalPolicy: DeviceApprovalPolicy =
    settings.new_device_approval_policy || 'admin_approval'
  const otpRequired = Boolean(settings.otp_verification_required ?? false)
  const managementPermissions: DeviceManagementPermission =
    settings.device_management_permissions || 'admin_only'
  const shadowMode = Boolean(settings.shadow_mode ?? true)

  const [devices, setDevices] = useState<UserDeviceItem[]>([])
  const [loadingDevices, setLoadingDevices] = useState<boolean>(false)
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [safeDisabling, setSafeDisabling] = useState<boolean>(false)
  const [showAddModal, setShowAddModal] = useState<boolean>(false)
  const [newDeviceName, setNewDeviceName] = useState<string>('')
  const [newDeviceType, setNewDeviceType] = useState<string>('desktop')
  const [newUserId, setNewUserId] = useState<string>('')
  const [registering, setRegistering] = useState<boolean>(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending_approval' | 'revoked'>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const detectClientEnvironment = () => {
    if (typeof window === 'undefined') {
      return {
        os: 'Desktop OS',
        browser: 'Web Browser',
        deviceType: 'desktop',
        fingerprint: 'fp_generic_' + Math.random().toString(36).substring(2, 10),
      }
    }
    const ua = navigator.userAgent || ''
    let os = 'Windows 11 / 10'
    if (ua.includes('Win')) os = 'Windows 11 / 10'
    else if (ua.includes('Mac')) os = 'macOS'
    else if (ua.includes('Linux')) os = 'Linux'
    else if (ua.includes('Android')) os = 'Android'
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'

    let browser = 'Chrome'
    if (ua.includes('Edg/')) browser = 'Microsoft Edge'
    else if (ua.includes('Chrome/')) browser = 'Google Chrome'
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Apple Safari'
    else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox'

    let deviceType = 'desktop'
    if (/iPad|Tablet/i.test(ua)) {
      deviceType = 'tablet'
    } else if (/Mobi|Android/i.test(ua)) {
      deviceType = 'mobile'
    }

    const raw = `${ua}-${navigator.language || ''}-${window.innerWidth || 1920}x${window.innerHeight || 1080}`
    let hash = 0
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i)
      hash |= 0
    }
    const fingerprint = `fp_${Math.abs(hash).toString(16)}_${Date.now().toString(36).slice(-4)}`

    return { os, browser, deviceType, fingerprint }
  }

  const handleRegisterCurrentDevice = async () => {
    if (!isEditMode) {
      setActionFeedback({
        type: 'error',
        text: 'Please activate Edit Mode in the top bar to register devices.',
      })
      return
    }
    const env = detectClientEnvironment()
    const defaultName = `Workstation (${env.browser} / ${env.os})`
    try {
      setRegistering(true)
      await deviceBindingApi.registerDevice(
        {
          device_name: defaultName,
          device_type: env.deviceType,
          fingerprint: env.fingerprint,
          browser_info: env.browser,
          os_info: env.os,
        },
        institutionId
      )
      setActionFeedback({
        type: 'success',
        text: `Device '${defaultName}' registered successfully.`,
      })
      await loadDevices()
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to register current device.',
      })
    } finally {
      setRegistering(false)
    }
  }

  const handleAddCustomDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditMode) return
    if (!newDeviceName.trim()) {
      setActionFeedback({ type: 'error', text: 'Device name is required.' })
      return
    }
    try {
      setRegistering(true)
      const fp = 'fp_manual_' + Math.random().toString(36).substring(2, 10)
      await deviceBindingApi.registerDevice(
        {
          device_name: newDeviceName.trim(),
          device_type: newDeviceType,
          fingerprint: fp,
          browser_info: 'Pre-Enrolled Hardware',
          os_info: newDeviceType === 'tablet' ? 'Interactive OS' : 'Managed Client',
          user_id: newUserId ? parseInt(newUserId, 10) : undefined,
        },
        institutionId
      )
      setActionFeedback({
        type: 'success',
        text: `Device '${newDeviceName.trim()}' pre-registered successfully.`,
      })
      setShowAddModal(false)
      setNewDeviceName('')
      setNewUserId('')
      await loadDevices()
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to add device.',
      })
    } finally {
      setRegistering(false)
    }
  }

  const loadDevices = async () => {
    try {
      setLoadingDevices(true)
      const res = await deviceBindingApi.getDevices({ institution_id: institutionId })
      setDevices(res.data.devices || [])
    } catch (err: any) {
      console.warn('Could not fetch devices:', err)
    } finally {
      setLoadingDevices(false)
    }
  }

  useEffect(() => {
    loadDevices()
  }, [institutionId])

  const handleApprove = async (deviceId: number) => {
    if (!isEditMode) return
    try {
      await deviceBindingApi.approveDevice(deviceId, institutionId)
      setActionFeedback({ type: 'success', text: 'Device approved successfully.' })
      loadDevices()
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to approve device.',
      })
    }
  }

  const handleRevoke = async (deviceId: number) => {
    if (!isEditMode) return
    try {
      await deviceBindingApi.revokeDevice(deviceId, 'Revoked by administrator', institutionId)
      setActionFeedback({ type: 'success', text: 'Device revoked successfully.' })
      loadDevices()
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to revoke device.',
      })
    }
  }

  const handleDelete = async (deviceId: number) => {
    if (!isEditMode) return
    if (!window.confirm('Are you sure you want to delete this device record?')) return
    try {
      await deviceBindingApi.deleteDevice(deviceId, institutionId)
      setActionFeedback({ type: 'success', text: 'Device record removed.' })
      loadDevices()
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to delete device.',
      })
    }
  }

  const handleSafeDisable = async () => {
    if (!isEditMode) return
    if (
      !window.confirm(
        'Confirm Safe Disablement: This will immediately stop enforcing device registration and restore normal open login. Existing device registrations and audit logs will NOT be deleted.'
      )
    ) {
      return
    }

    try {
      setSafeDisabling(true)
      const res = await deviceBindingApi.safeDisable(institutionId)
      onChange('enable_device_binding', false)
      onChange('policy_mode', 'disabled')
      setActionFeedback({
        type: 'success',
        text: res.data.message || 'Device binding safely disabled.',
      })
      if (onRefresh) onRefresh()
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to disable device binding.',
      })
    } finally {
      setSafeDisabling(false)
    }
  }

  const getDeviceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-4 h-4 text-emerald-600" />
      case 'tablet':
        return <Smartphone className="w-4 h-4 text-blue-600" />
      case 'laptop':
        return <Laptop className="w-4 h-4 text-indigo-600" />
      default:
        return <Monitor className="w-4 h-4 text-slate-600" />
    }
  }

  const filteredDevices = devices.filter((d) => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = d.device_name?.toLowerCase().includes(q)
      const matchUser = d.user_name?.toLowerCase().includes(q)
      const matchEmail = d.user_email?.toLowerCase().includes(q)
      const matchFp = d.device_fingerprint?.toLowerCase().includes(q)
      if (!matchName && !matchUser && !matchEmail && !matchFp) return false
    }
    return true
  })

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <span>Settings</span>
        <span>/</span>
        <span>Security</span>
        <span>/</span>
        <span className="text-primary-700 font-semibold">Device Binding</span>
      </div>

      {/* Header Banner & Status */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Device-Wise Security Binding
              </h2>
              <p className="text-xs text-slate-500">
                Optional hardware-level security binding and authorization policies for institutional access.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isEnabled ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Lock className="w-3.5 h-3.5" />
              Binding Active ({policyMode.replace('_', ' ').toUpperCase()})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <Unlock className="w-3.5 h-3.5 text-slate-500" />
              Disabled by Default (Open Login)
            </span>
          )}

          {shadowMode && isEnabled && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <Info className="w-3.5 h-3.5" />
              Shadow Mode (Audit Only)
            </span>
          )}
        </div>
      </div>

      {actionFeedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{actionFeedback.text}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SECTION 1: MASTER ACTIVATION & SAFE POLICIES */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary-600" />
              Master Activation & Security Mode
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Device Binding is completely optional and isolated per institution.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-700">
              {isEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isEnabled}
                disabled={!isEditMode}
                onChange={(e) => {
                  const val = e.target.checked
                  onChange('enable_device_binding', val)
                  if (val && policyMode === 'disabled') {
                    onChange('policy_mode', 'optional_registration')
                  }
                }}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 peer-disabled:opacity-50"></div>
            </label>
          </div>
        </div>

        {/* 4 Flexible Security Policies */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Flexible Security Policy Mode
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                id: 'disabled',
                title: '1. Disabled (Default)',
                desc: 'Users can log in from any otherwise authorized device without restrictions.',
                badge: 'Open Access',
              },
              {
                id: 'optional_registration',
                title: '2. Optional Registration',
                desc: 'Users can register their devices, but unregistered devices are still permitted.',
                badge: 'Recommended First Step',
              },
              {
                id: 'registered_only',
                title: '3. Registered Devices Only',
                desc: 'Only registered and active devices can access the software. Unregistered devices are blocked.',
                badge: 'Strict Binding',
              },
              {
                id: 'admin_approval_required',
                title: '4. Admin Approval Required',
                desc: 'New devices require administrator review and approval before login access is granted.',
                badge: 'Highest Security',
              },
            ].map((m) => {
              const selected = policyMode === m.id
              return (
                <div
                  key={m.id}
                  onClick={() => {
                    if (isEditMode) {
                      onChange('policy_mode', m.id)
                      if (m.id !== 'disabled' && !isEnabled) {
                        onChange('enable_device_binding', true)
                      }
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selected
                      ? 'border-primary-600 bg-primary-50/50 shadow-xs ring-1 ring-primary-500'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  } ${!isEditMode ? 'cursor-not-allowed opacity-80' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{m.title}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        selected
                          ? 'bg-primary-100 text-primary-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {m.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{m.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Shadow Mode Option */}
        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">
                Shadow Mode (Audit-Only Observation)
              </span>
              <input
                type="checkbox"
                checked={shadowMode}
                disabled={!isEditMode}
                onChange={(e) => onChange('shadow_mode', e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded border-amber-300 focus:ring-primary-500"
              />
            </div>
            <p className="text-[11px] text-amber-700 mt-1">
              When active, unrecognized or unapproved device logins are logged in the audit trail but NOT blocked. Recommended before transitioning to strict Registered Devices Only mode.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: VERIFICATION & CONFIGURATION CONTROLS */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          Verification Controls & Governance
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Verification Method */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Device Verification Method
            </label>
            <select
              value={verificationMethod}
              disabled={!isEditMode}
              onChange={(e) => onChange('verification_method', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-primary-500 disabled:opacity-60"
            >
              <option value="device_fingerprint">Browser & Hardware Fingerprint</option>
              <option value="totp_otp">One-Time Password (OTP) Verification</option>
              <option value="device_fingerprint_and_otp">
                Dual Factor (Fingerprint + OTP)
              </option>
              <option value="hardware_token">Hardware Security Key / Token</option>
            </select>
          </div>

          {/* Maximum Registered Devices */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Maximum Registered Devices Per User
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={maxDevices}
              disabled={!isEditMode}
              onChange={(e) =>
                onChange('max_registered_devices', parseInt(e.target.value, 10) || 1)
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-primary-500 disabled:opacity-60"
            />
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Default is 3 devices. Maximum allowed: 10.
            </span>
          </div>

          {/* New Device Approval Policy */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              New Device Approval Policy
            </label>
            <select
              value={approvalPolicy}
              disabled={!isEditMode}
              onChange={(e) => onChange('new_device_approval_policy', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-primary-500 disabled:opacity-60"
            >
              <option value="admin_approval">Administrator Approval Required</option>
              <option value="auto_approve">Automatically Approve (Under Device Limit)</option>
              <option value="otp_verified">Self-Service Verification Via OTP</option>
            </select>
          </div>

          {/* Device Management Permissions */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Device Management Permissions
            </label>
            <select
              value={managementPermissions}
              disabled={!isEditMode}
              onChange={(e) => onChange('device_management_permissions', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-primary-500 disabled:opacity-60"
            >
              <option value="admin_only">Only Authorized Administrators</option>
              <option value="user_self_service">Users Can Manage Own Devices</option>
              <option value="admin_and_manager">Administrators & Branch Managers</option>
            </select>
          </div>

          {/* OTP Requirement Toggle */}
          <div className="md:col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-800">
                OTP Verification Requirement
              </span>
              <p className="text-[11px] text-slate-500">
                Mandate one-time SMS or email passcode verification upon adding a new device.
              </p>
            </div>
            <input
              type="checkbox"
              checked={otpRequired}
              disabled={!isEditMode}
              onChange={(e) => onChange('otp_verification_required', e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: SAFE DISABLE GUARANTEE & LICENSING INDEPENDENCE */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                Safe Disablement & Licensing Independence Assurance
              </h4>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                When disabled, device binding restrictions cease immediately. All device records, user accounts, and historical audit logs remain strictly preserved according to compliance retention policies. Furthermore, Device Binding is completely independent of subscription licenses: disabling it never deactivates institute licenses or subscriptions.
              </p>
            </div>
          </div>
          {isEnabled && (
            <button
              type="button"
              disabled={!isEditMode || safeDisabling}
              onClick={handleSafeDisable}
              className="shrink-0 px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 text-xs font-bold transition disabled:opacity-50"
            >
              {safeDisabling ? 'Disabling...' : 'Safely Disable Binding'}
            </button>
          )}
        </div>
      </div>

      {/* SECTION 4: REGISTERED DEVICES INVENTORY */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Laptop className="w-4 h-4 text-primary-600" />
              Registered Devices Inventory ({devices.length})
            </h3>
            <p className="text-xs text-slate-500">
              Hardware profiles and access status across all institution users.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRegisterCurrentDevice}
              disabled={registering}
              title={isEditMode ? 'Register this computer / browser' : 'Enable Edit Mode to register'}
              className="px-2.5 py-1.5 rounded-lg border border-primary-200 text-primary-700 bg-primary-50 hover:bg-primary-100 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-60"
            >
              <Monitor className="w-3.5 h-3.5" />
              {registering ? 'Registering...' : 'Register This Device'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isEditMode) {
                  setActionFeedback({
                    type: 'error',
                    text: 'Please enable Edit Mode in the top bar to add hardware devices.',
                  })
                  return
                }
                setShowAddModal(true)
              }}
              title={isEditMode ? 'Add hardware device profile' : 'Enable Edit Mode to add'}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Device
            </button>
            <button
              onClick={loadDevices}
              disabled={loadingDevices}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="Refresh device list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDevices ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        {devices.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 bg-slate-100/70 p-0.5 rounded-lg text-[11px]">
              {(['all', 'active', 'pending_approval', 'revoked'] as const).map((st) => {
                const count =
                  st === 'all'
                    ? devices.length
                    : devices.filter((d) => d.status === st).length
                const labels: Record<string, string> = {
                  all: 'All',
                  active: 'Active',
                  pending_approval: 'Pending Approval',
                  revoked: 'Revoked',
                }
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-md font-medium transition ${
                      statusFilter === st
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {labels[st]} ({count})
                  </button>
                )
              })}
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Search device or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-primary-500 w-48"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1.5" />
            </div>
          </div>
        )}

        {/* Empty State vs Devices Table */}
        {filteredDevices.length === 0 ? (
          <div className="py-8 px-4 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
            <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">
                {devices.length === 0
                  ? 'No devices registered yet'
                  : 'No devices match the selected filter'}
              </h4>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-0.5">
                {devices.length === 0
                  ? 'Devices registered by users or administrators will appear here. Device Binding is strictly optional and starts empty by default.'
                  : 'Try selecting a different status filter or clearing your search term.'}
              </p>
            </div>
            {devices.length === 0 && (
              isEditMode ? (
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleRegisterCurrentDevice}
                    disabled={registering}
                    className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    {registering ? 'Registering...' : 'Register This Device'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Device
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-amber-700 font-medium">
                  Activate Edit Mode in the top bar to register or pre-authorize hardware profiles.
                </p>
              )
            )}
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2 font-semibold text-slate-700">Device</th>
                  <th className="px-3.5 py-2 font-semibold text-slate-700">User</th>
                  <th className="px-3.5 py-2 font-semibold text-slate-700">Fingerprint</th>
                  <th className="px-3.5 py-2 font-semibold text-slate-700">Status</th>
                  <th className="px-3.5 py-2 font-semibold text-slate-700">Last Used</th>
                  {isEditMode && (
                    <th className="px-3.5 py-2 font-semibold text-slate-700 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDevices.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2 font-medium text-slate-900">
                        {getDeviceIcon(d.device_type)}
                        <span>{d.device_name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {d.os_info || d.device_type} • {d.browser_info || 'Web Client'}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-semibold text-slate-800">{d.user_name || 'User'}</div>
                      <span className="text-[10px] text-slate-500">{d.user_email}</span>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[10px] text-slate-600">
                      {d.device_fingerprint.slice(0, 12)}...
                    </td>
                    <td className="px-3.5 py-2.5">
                      {d.status === 'active' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      )}
                      {d.status === 'pending_approval' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                          Pending Approval
                        </span>
                      )}
                      {d.status === 'revoked' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                          Revoked
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-500 text-[11px]">
                      {d.last_used_at ? new Date(d.last_used_at).toLocaleDateString() : 'Never'}
                    </td>
                    {isEditMode && (
                      <td className="px-3.5 py-2.5 text-right space-x-1">
                        {d.status === 'pending_approval' && (
                          <button
                            type="button"
                            onClick={() => handleApprove(d.id)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold"
                          >
                            Approve
                          </button>
                        )}
                        {d.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => handleRevoke(d.id)}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold"
                          >
                            Revoke
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(d.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          title="Delete device"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pre-Register Hardware Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-primary-600" />
                Pre-Register Hardware Device
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomDevice} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Device Friendly Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Classroom 102 Smart Board, Faculty Tab"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Device Type
                  </label>
                  <select
                    value={newDeviceType}
                    onChange={(e) => setNewDeviceType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="desktop">Desktop Workstation</option>
                    <option value="laptop">Laptop Computer</option>
                    <option value="tablet">Tablet / Smart Panel</option>
                    <option value="mobile">Mobile Phone</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assign User ID (Optional)
                  </label>
                  <input
                    type="number"
                    placeholder="Leave blank for Admin"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                A cryptographic device fingerprint will be generated and marked active for this institutional profile.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold shadow-xs transition disabled:opacity-50"
                >
                  {registering ? 'Adding...' : 'Add Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
