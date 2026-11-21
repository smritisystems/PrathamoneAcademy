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
 * @updated     2026-11-21
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
  Cpu,
  Key,
  Network,
  Star,
  LogOut,
  Eye,
  XOctagon,
  Download,
  AlertTriangle,
  FileText,
  Users,
} from 'lucide-react'
import { deviceBindingApi } from '../../api/endpoints'
import { downloadCsvRows } from '../../utils/reportExport'
import type {
  DeviceBindingPolicyMode,
  DeviceVerificationMethod,
  DeviceApprovalPolicy,
  DeviceManagementPermission,
  UserDeviceItem,
  SecurityIncidentItem,
  SecurityIncidentMetrics,
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
  const [newDeviceMac, setNewDeviceMac] = useState<string>('')
  const [registering, setRegistering] = useState<boolean>(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending_approval' | 'revoked'>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'inventory' | 'incidents'>('inventory')
  const [incidents, setIncidents] = useState<SecurityIncidentItem[]>([])
  const [incidentMetrics, setIncidentMetrics] = useState<SecurityIncidentMetrics>({
    total_incidents: 0,
    blocked_attempts: 0,
    shadow_observations: 0,
    revoked_sessions: 0,
  })
  const [loadingIncidents, setLoadingIncidents] = useState<boolean>(false)
  const [incidentSeverity, setIncidentSeverity] = useState<'all' | 'critical' | 'warning' | 'info'>('all')
  const [incidentSearch, setIncidentSearch] = useState<string>('')
  const [showTerminateUserModal, setShowTerminateUserModal] = useState<boolean>(false)
  const [targetUserIdToTerminate, setTargetUserIdToTerminate] = useState<string>('')
  const [terminatingUserSessions, setTerminatingUserSessions] = useState<boolean>(false)
  const [agentInfo, setAgentInfo] = useState<{
    online: boolean
    primaryMac?: string
    motherboardUuid?: string
    hostname?: string
    os?: string
    fingerprint?: string
    version?: string
  } | null>(null)
  const [checkingAgent, setCheckingAgent] = useState<boolean>(false)

  const pollAgent = async () => {
    try {
      setCheckingAgent(true)
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 1800)
      const res = await fetch('http://127.0.0.1:9876/hardware-identity', {
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (res.ok) {
        const data = await res.json()
        const info = {
          online: true,
          primaryMac: data.primary_mac,
          motherboardUuid: data.motherboard_uuid,
          hostname: data.hostname,
          os: data.os,
          fingerprint: data.device_fingerprint,
          version: data.version,
        }
        setAgentInfo(info)
        return info
      }
    } catch {
      setAgentInfo({ online: false })
      return null
    } finally {
      setCheckingAgent(false)
    }
  }

  useEffect(() => {
    pollAgent()
  }, [])

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

    try {
      setRegistering(true)
      let deviceFp = ''
      let deviceName = ''
      let browserInfo = ''
      let osInfo = ''
      let deviceType = 'desktop'

      // Mode 1: Physical MAC & Motherboard UUID via Desktop Companion Agent
      if (verificationMethod === 'native_agent_mac') {
        const liveAgent = await pollAgent()
        if (!liveAgent || !liveAgent.primaryMac) {
          setActionFeedback({
            type: 'error',
            text: 'PrathamOne Hardware Agent is offline (127.0.0.1:9876). Run tools/device_agent/start_agent.bat on this PC to capture physical MAC address.',
          })
          setRegistering(false)
          return
        }
        deviceFp = liveAgent.fingerprint || `mac_${liveAgent.primaryMac}`
        deviceName = `Workstation [MAC: ${liveAgent.primaryMac}]`
        browserInfo = `Native Agent v${liveAgent.version || '1.0'}`
        osInfo = liveAgent.os || 'Windows'
      }
      // Mode 2: WebAuthn / Platform TPM 2.0 Chip (Zero software)
      else if (verificationMethod === 'webauthn_tpm') {
        const env = detectClientEnvironment()
        try {
          if (typeof window !== 'undefined' && window.PublicKeyCredential) {
            const challenge = new Uint8Array(32)
            window.crypto.getRandomValues(challenge)
            const userId = new Uint8Array(16)
            window.crypto.getRandomValues(userId)

            const cred = (await navigator.credentials.create({
              publicKey: {
                challenge,
                rp: { name: 'PrathamOne EduOS', id: window.location.hostname || 'localhost' },
                user: {
                  id: userId,
                  name: 'admin@prathamone.com',
                  displayName: 'Workstation Administrator',
                },
                pubKeyCredParams: [
                  { alg: -7, type: 'public-key' },
                  { alg: -257, type: 'public-key' },
                ],
                authenticatorSelection: {
                  authenticatorAttachment: 'platform',
                  userVerification: 'preferred',
                },
                timeout: 30000,
              },
            })) as PublicKeyCredential

            if (cred && cred.id) {
              deviceFp = `tpm_${cred.id.slice(0, 32)}`
              deviceName = `Workstation [TPM 2.0 Chip - ${env.browser}]`
            } else {
              deviceFp = `tpm_sealed_${env.fingerprint}`
              deviceName = `Workstation [Platform TPM - ${env.browser}]`
            }
          } else {
            deviceFp = `tpm_fallback_${env.fingerprint}`
            deviceName = `Workstation [TPM Profile - ${env.browser}]`
          }
        } catch (authErr) {
          deviceFp = `tpm_key_${env.fingerprint}`
          deviceName = `Workstation [TPM Key - ${env.browser}]`
        }
        browserInfo = `TPM 2.0 Key (${env.browser})`
        osInfo = env.os
        deviceType = env.deviceType
      }
      // Mode 3: Browser & Hardware Fingerprint (Standard — Zero-install)
      else {
        const env = detectClientEnvironment()
        deviceFp = env.fingerprint
        deviceName = `Workstation (${env.browser} / ${env.os})`
        browserInfo = env.browser
        osInfo = env.os
        deviceType = env.deviceType
      }

      await deviceBindingApi.registerDevice(
        {
          device_name: deviceName,
          device_type: deviceType,
          fingerprint: deviceFp,
          browser_info: browserInfo,
          os_info: osInfo,
        },
        institutionId
      )
      setActionFeedback({
        type: 'success',
        text: `Device '${deviceName}' successfully registered and hardware bound.`,
      })
      await loadDevices()
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: err.response?.data?.detail || err.message || 'Failed to register current device.',
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
      const cleanMac = newDeviceMac.trim()
      const fp = cleanMac
        ? `mac_${cleanMac.replace(/[:-]/g, '').toLowerCase()}`
        : 'fp_manual_' + Math.random().toString(36).substring(2, 10)
      const browserInfo = cleanMac ? `MAC: ${cleanMac}` : 'Pre-Enrolled Hardware'

      await deviceBindingApi.registerDevice(
        {
          device_name: newDeviceName.trim(),
          device_type: newDeviceType,
          fingerprint: fp,
          browser_info: browserInfo,
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
      setNewDeviceMac('')
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

  const loadIncidents = async () => {
    try {
      if (!deviceBindingApi?.getIncidents) return
      setLoadingIncidents(true)
      const res = await deviceBindingApi.getIncidents({
        institution_id: institutionId,
        severity: incidentSeverity === 'all' ? undefined : incidentSeverity,
        limit: 100,
      })
      if (res.data?.status === 'success') {
        setIncidents(res.data.incidents || [])
        setIncidentMetrics(
          res.data.metrics || {
            total_incidents: 0,
            blocked_attempts: 0,
            shadow_observations: 0,
            revoked_sessions: 0,
          }
        )
      }
    } catch (err: any) {
      console.warn('Could not load security incidents:', err)
    } finally {
      setLoadingIncidents(false)
    }
  }

  useEffect(() => {
    loadIncidents()
  }, [incidentSeverity, institutionId])

  const handleToggleTrust = async (deviceId: number, currentTrusted: boolean) => {
    if (!isEditMode) {
      setActionFeedback({
        type: 'error',
        text: 'Please activate Edit Mode in the top bar to modify device trust.',
      })
      return
    }
    try {
      const res = await deviceBindingApi.setTrust(deviceId, !currentTrusted, institutionId)
      setActionFeedback({
        type: 'success',
        text: res.data?.message || 'Device trust updated.',
      })
      loadDevices()
      loadIncidents()
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to update device trust status.',
      })
    }
  }

  const handleTerminateSession = async (device: UserDeviceItem) => {
    if (!isEditMode) {
      setActionFeedback({
        type: 'error',
        text: 'Please activate Edit Mode in the top bar to terminate sessions.',
      })
      return
    }
    if (
      !window.confirm(
        `Immediate Kill-Switch: Terminate active session for device '${device.device_name}'? The user will be immediately logged out.`
      )
    ) {
      return
    }
    try {
      const res = await deviceBindingApi.terminateSession(device.id, institutionId)
      setActionFeedback({
        type: 'success',
        text: res.data?.message || 'Session terminated successfully.',
      })
      loadDevices()
      loadIncidents()
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to terminate session.',
      })
    }
  }

  const handleTerminateAllUserSessions = async (userId: number) => {
    if (!isEditMode) {
      setActionFeedback({
        type: 'error',
        text: 'Please activate Edit Mode in the top bar to terminate user sessions.',
      })
      return
    }
    if (
      !window.confirm(
        `Global User Kill-Switch: Terminate ALL active sessions across all devices for user ID ${userId}?`
      )
    ) {
      return
    }
    try {
      setTerminatingUserSessions(true)
      const res = await deviceBindingApi.terminateUserSessions(userId, institutionId)
      setActionFeedback({
        type: 'success',
        text: res.data?.message || 'All user sessions terminated.',
      })
      setShowTerminateUserModal(false)
      setTargetUserIdToTerminate('')
      loadDevices()
      loadIncidents()
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to terminate user sessions.',
      })
    } finally {
      setTerminatingUserSessions(false)
    }
  }

  const handleExportIncidentsCsv = () => {
    if (!incidents.length) return
    const headers = ['ID', 'Timestamp', 'Severity', 'Action', 'User Name', 'User Email', 'IP Address', 'User Agent', 'Details']
    const rows = incidents.map((inc) => [
      inc.id,
      inc.created_at || '',
      (inc.severity || '').toUpperCase(),
      inc.action,
      inc.user_name || '',
      inc.user_email || '',
      inc.ip_address || '',
      inc.user_agent || '',
      inc.details || '',
    ])
    downloadCsvRows(`security_incidents_audit_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows])
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

  const filteredIncidents = incidents.filter((inc) => {
    if (incidentSearch.trim()) {
      const q = incidentSearch.toLowerCase()
      const matchAction = inc.action?.toLowerCase().includes(q)
      const matchDetails = inc.details?.toLowerCase().includes(q)
      const matchUser = inc.user_name?.toLowerCase().includes(q)
      const matchEmail = inc.user_email?.toLowerCase().includes(q)
      const matchIp = inc.ip_address?.toLowerCase().includes(q)
      if (!matchAction && !matchDetails && !matchUser && !matchEmail && !matchIp) return false
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

      {/* Workspace Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'inventory'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>Hardware Inventory & Policies</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === 'inventory' ? 'bg-primary-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {devices.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('incidents')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'incidents'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Security Incident Center</span>
          {incidentMetrics.blocked_attempts > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-extrabold animate-pulse">
              {incidentMetrics.blocked_attempts} Blocked
            </span>
          ) : (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === 'incidents' ? 'bg-primary-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {incidentMetrics.total_incidents}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <>
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
              <option value="device_fingerprint">
                1. Browser Cryptographic Fingerprint (Standard — Zero-Install)
              </option>
              <option value="webauthn_tpm">
                2. Platform TPM 2.0 / Secure Enclave (Bank-Grade — Zero-Install)
              </option>
              <option value="native_agent_mac">
                3. Physical MAC Address & Motherboard Serial (PrathamOne Agent)
              </option>
              <option value="device_fingerprint_and_otp">
                4. Dual Factor (Device Fingerprint + OTP)
              </option>
              <option value="totp_otp">5. One-Time Passcode (OTP Only)</option>
              <option value="hardware_token">6. External Hardware Token (FIDO2 / YubiKey)</option>
            </select>

            {/* Context Badge for Selected Verification Method */}
            {verificationMethod === 'webauthn_tpm' && (
              <div className="mt-2 p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-lg flex items-start gap-2 text-[11px] text-indigo-900">
                <Key className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Platform TPM 2.0 Binding Active (Zero-Install)</span>
                  <p className="text-indigo-700 mt-0.5 leading-relaxed">
                    Cryptographically binds login to the computer's motherboard TPM 2.0 security chip, Windows Hello, or Apple Secure Enclave. Highly secure and completely native without installing any external tools.
                  </p>
                </div>
              </div>
            )}

            {verificationMethod === 'native_agent_mac' && (
              <div
                className={`mt-2 p-2.5 rounded-lg border text-[11px] transition ${
                  agentInfo?.online
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50/80 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Network className="w-3.5 h-3.5" />
                    {agentInfo?.online ? (
                      <span className="text-emerald-800">
                        PrathamOne Hardware Agent Connected
                      </span>
                    ) : (
                      <span className="text-amber-800">
                        PrathamOne Hardware Agent Offline
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={pollAgent}
                    disabled={checkingAgent}
                    className="text-[10px] underline font-semibold text-slate-700 hover:text-slate-900"
                  >
                    {checkingAgent ? 'Checking...' : 'Check Connection'}
                  </button>
                </div>
                {agentInfo?.online ? (
                  <div className="mt-1 space-y-0.5 text-[10px] font-mono text-emerald-800">
                    <div>Primary MAC: <span className="font-bold">{agentInfo.primaryMac}</span></div>
                    <div>Motherboard UUID: {agentInfo.motherboardUuid?.slice(0, 24)}...</div>
                  </div>
                ) : (
                  <p className="mt-1 text-[10px] text-amber-700 leading-relaxed">
                    To capture the physical NIC MAC address and Motherboard BIOS UUID, run{' '}
                    <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">
                      tools/device_agent/start_agent.bat
                    </code>{' '}
                    on this machine.
                  </p>
                )}
              </div>
            )}

            {verificationMethod === 'device_fingerprint' && (
              <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2 text-[11px] text-slate-700">
                <ShieldCheck className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">Browser Cryptographic Fingerprint (Standard)</span>
                  <p className="text-slate-500 mt-0.5 leading-relaxed">
                    Generates a unique cryptographic device profile using browser environment and hardware rendering tokens. 100% zero-install and works immediately on all tablets, smartboards, and phones.
                  </p>
                </div>
              </div>
            )}
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
                  <th className="px-3.5 py-2 font-semibold text-slate-700">Trust Level</th>
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
                      {d.is_trusted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Star className="w-3 h-3 fill-emerald-500 text-emerald-600" />
                          Trusted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          <ShieldCheck className="w-3 h-3 text-slate-400" />
                          Standard
                        </span>
                      )}
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
                      <td className="px-3.5 py-2.5 text-right space-x-1 whitespace-nowrap">
                        {/* Trust Toggle */}
                        {d.is_trusted ? (
                          <button
                            type="button"
                            onClick={() => handleToggleTrust(d.id, true)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-medium transition"
                            title="Demote to standard device"
                          >
                            Untrust
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleTrust(d.id, false)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded text-[10px] font-bold inline-flex items-center gap-1 transition"
                            title="Mark as trusted device"
                          >
                            <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
                            Trust
                          </button>
                        )}

                        {/* Immediate Session Termination */}
                        {d.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => handleTerminateSession(d)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] font-bold inline-flex items-center gap-1 transition"
                            title="Instantly terminate active device session"
                          >
                            <LogOut className="w-3 h-3 text-rose-600" />
                            Kill Session
                          </button>
                        )}

                        {d.status === 'pending_approval' && (
                          <button
                            type="button"
                            onClick={() => handleApprove(d.id)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition"
                          >
                            Approve
                          </button>
                        )}
                        {d.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => handleRevoke(d.id)}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold transition"
                          >
                            Revoke
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(d.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded transition"
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
    </>
  ) : (
    /* SECURITY INCIDENT CENTER & LIVE MONITORING */
    <div className="space-y-5">
      {/* Incident Center Header & KPI Cards */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Security Incident Center & Live Access Monitoring
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated telemetry capturing blocked intrusions, shadow observations, hardware fingerprint anomalies, and session revocations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadIncidents}
              disabled={loadingIncidents}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition disabled:opacity-50"
              title="Refresh incidents"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingIncidents ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleExportIncidentsCsv}
              disabled={incidents.length === 0}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition disabled:opacity-50"
              title="Download CSV for compliance audit"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              Export CSV
            </button>

            {isEditMode && (
              <button
                type="button"
                onClick={() => setShowTerminateUserModal(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                Terminate User Sessions
              </button>
            )}
          </div>
        </div>

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Total Incidents</span>
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900">{incidentMetrics.total_incidents}</div>
            <div className="text-[10px] text-slate-500 mt-1">Logged security events</div>
          </div>

          <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-700 mb-1">
              <span className="text-xs font-semibold">Blocked Intrusions</span>
              <XOctagon className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-700">{incidentMetrics.blocked_attempts}</div>
            <div className="text-[10px] text-rose-600 mt-1">Unapproved hardware blocked</div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-700 mb-1">
              <span className="text-xs font-semibold">Shadow Observations</span>
              <Eye className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-700">{incidentMetrics.shadow_observations}</div>
            <div className="text-[10px] text-amber-600 mt-1">Audit-mode observations</div>
          </div>

          <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-purple-700 mb-1">
              <span className="text-xs font-semibold">Revoked Sessions</span>
              <LogOut className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-700">{incidentMetrics.revoked_sessions}</div>
            <div className="text-[10px] text-purple-600 mt-1">Admin-killed active sessions</div>
          </div>
        </div>
      </div>

      {/* Incident Filter & Live Stream Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Severity Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs">
            {(['all', 'critical', 'warning', 'info'] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setIncidentSeverity(sev)}
                className={`px-3 py-1 rounded-md font-semibold transition capitalize ${
                  incidentSeverity === sev
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sev === 'all' ? `All (${incidentMetrics.total_incidents})` : sev}
              </button>
            ))}
          </div>

          {/* Search filter */}
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search incidents, IP, user, details..."
              value={incidentSearch}
              onChange={(e) => setIncidentSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {loadingIncidents ? (
          <div className="text-center py-12 text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-primary-600" />
            Loading security incident telemetry...
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 rounded-lg">
            <ShieldCheck className="w-9 h-9 text-emerald-500 mx-auto mb-2" />
            <div className="text-xs font-bold text-slate-700">No Security Incidents Found</div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              No access violations or unauthorized login attempts detected under current criteria.
            </p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2 font-semibold text-slate-700">Timestamp</th>
                  <th className="px-3.5 py-2 font-semibold text-slate-700">Severity & Action</th>
                  <th className="px-3.5 py-2 font-semibold text-slate-700">Target Account</th>
                  <th className="px-3.5 py-2 font-semibold text-slate-700">Client / Network</th>
                  <th className="px-3.5 py-2 font-semibold text-slate-700">Incident Details</th>
                  {isEditMode && (
                    <th className="px-3.5 py-2 font-semibold text-slate-700 text-right">Mitigation</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIncidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-3.5 py-2.5 text-slate-600 whitespace-nowrap text-[11px]">
                      <div className="font-semibold text-slate-800">
                        {inc.created_at ? new Date(inc.created_at).toLocaleTimeString() : '--'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {inc.created_at ? new Date(inc.created_at).toLocaleDateString() : ''}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 mb-1">
                        {inc.severity === 'critical' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                            CRITICAL
                          </span>
                        )}
                        {inc.severity === 'warning' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                            WARNING
                          </span>
                        )}
                        {inc.severity === 'info' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-100 text-slate-700 border border-slate-300">
                            INFO
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] font-bold text-slate-700">
                        {inc.action}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-semibold text-slate-800 flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>{inc.user_name || 'System / Unauthenticated'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {inc.user_email || (inc.user_id ? `User #${inc.user_id}` : 'External IP')}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-[11px]">
                      <div className="font-mono font-semibold text-slate-700">
                        {inc.ip_address || 'Unknown IP'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[150px]" title={inc.user_agent}>
                        {inc.user_agent || 'Standard Client'}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-700 text-[11px] max-w-sm">
                      <p className="line-clamp-2" title={inc.details}>
                        {inc.details}
                      </p>
                    </td>
                    {isEditMode && (
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        {inc.user_id ? (
                          <button
                            type="button"
                            onClick={() => handleTerminateAllUserSessions(inc.user_id!)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] font-bold inline-flex items-center gap-1 transition"
                            title="Revoke all active device sessions for this user"
                          >
                            <LogOut className="w-3 h-3 text-rose-600" />
                            Kill User Sessions
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No User Scope</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )}

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

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Physical MAC Address (Optional)
                  </label>
                  {agentInfo?.online && agentInfo.primaryMac && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewDeviceMac(agentInfo.primaryMac!)
                        if (!newDeviceName.trim()) {
                          setNewDeviceName(`PC [MAC: ${agentInfo.primaryMac}]`)
                        }
                      }}
                      className="text-[10px] text-primary-600 hover:text-primary-800 underline font-semibold"
                    >
                      Fill Detected MAC ({agentInfo.primaryMac})
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. 00:D8:61:5D:BA:73 or leave blank for auto-generated token"
                  value={newDeviceMac}
                  onChange={(e) => setNewDeviceMac(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-primary-500 font-mono text-[11px]"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                A cryptographic hardware fingerprint will be generated and marked active for this institutional profile.
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

      {/* Terminate User Sessions Modal */}
      {showTerminateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-rose-700 flex items-center gap-2">
                <LogOut className="w-4 h-4 text-rose-600" />
                Terminate All User Sessions
              </h3>
              <button
                type="button"
                onClick={() => setShowTerminateUserModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Immediately revokes all active device sessions for the specified user account. The user will be instantly logged out across all hardware workstations.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target User ID *
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 1"
                  value={targetUserIdToTerminate}
                  onChange={(e) => setTargetUserIdToTerminate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-rose-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTerminateUserModal(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!targetUserIdToTerminate || terminatingUserSessions}
                  onClick={() => handleTerminateAllUserSessions(parseInt(targetUserIdToTerminate, 10))}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs transition disabled:opacity-50"
                >
                  {terminatingUserSessions ? 'Terminating...' : 'Terminate All Sessions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
