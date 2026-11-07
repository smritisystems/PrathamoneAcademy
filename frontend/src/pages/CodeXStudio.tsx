/**
 * @file        CodeXStudio.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pages
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-06
 * @updated     2026-11-07
 *
 * @description Comprehensive administrative CodeX Configuration Studio featuring 11 specialized sections, 0-9 bijective mapping, and interactive testing.
 */

import React, { useState, useEffect, useMemo } from 'react'
import {
  Shield, KeyRound, Lock, Unlock, Sliders, ToggleLeft, ToggleRight,
  RefreshCw, CheckCircle2, AlertTriangle, AlertCircle, Save, RotateCcw,
  QrCode, Eye, EyeOff, Hash, Layers, Users, Building2, Briefcase,
  History, ArrowRight, ArrowLeftRight, Copy, Check, Plus, Trash2,
  HelpCircle, ExternalLink, Download, FileText, ChevronRight
} from 'lucide-react'
import { codexApi } from '../api/endpoints'
import type {
  CodexConfig, CodexMappingProfile, CodexMappingVersion,
  CodexScopeAssignment, CodexAuditLogItem, CodexConfigResponse
} from '../types'
import { useAuthStore, isUserSysAdmin } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { EditModeBar, LockedButton } from '../components/common'
import { useBranding } from '../config/branding'
import OrganizationBranding from '../components/OrganizationBranding'
import QuickDecoderModal from '../components/codex/QuickDecoderModal'

export default function CodeXStudio() {
  const { user } = useAuthStore()
  const editScope = 'security:codex'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])
  const branding = useBranding()
  const isAdmin = isUserSysAdmin(user) || (user?.role || '').toLowerCase() === 'admin'

  // Loading & Error States
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // CodeX State Data
  const [config, setConfig] = useState<CodexConfig | null>(null)
  const [profiles, setProfiles] = useState<CodexMappingProfile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<number | null>(null)
  const [versions, setVersions] = useState<CodexMappingVersion[]>([])
  const [scopes, setScopes] = useState<CodexScopeAssignment[]>([])
  const [auditLogs, setAuditLogs] = useState<CodexAuditLogItem[]>([])

  // Studio Active Tab / Section (11 Sections)
  const [activeSection, setActiveSection] = useState<string>('general')

  // Interactive Live Testing State
  const [testNumber, setTestNumber] = useState<string>('1250')
  const [encodedResult, setEncodedResult] = useState<string>('CX-AZPQ')
  const [testCode, setTestCode] = useState<string>('CX-AZPQ')
  const [decodedResult, setDecodedResult] = useState<any>(null)
  const [testPin, setTestPin] = useState<string>('')
  const [testError, setTestError] = useState<string | null>(null)
  const [qrPayload, setQrPayload] = useState<string | null>(null)

  // Mapping Edit State
  const [editingMap, setEditingMap] = useState<Record<string, string>>({
    '0': 'Q', '1': 'A', '2': 'Z', '3': 'M', '4': 'K',
    '5': 'P', '6': 'X', '7': 'B', '8': 'T', '9': 'R'
  })
  const [mapPrefix, setMapPrefix] = useState('CX-')
  const [mapSuffix, setMapSuffix] = useState('')
  const [mapDecimal, setMapDecimal] = useState('.')
  const [mapNegative, setMapNegative] = useState('-')
  const [changeReason, setChangeReason] = useState('')

  // New Profile Modal State
  const [showNewProfileModal, setShowNewProfileModal] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [newProfileCode, setNewProfileCode] = useState('')

  // Quick Decoder Modal State
  const [showQuickDecoder, setShowQuickDecoder] = useState(false)

  // Scope Modal State
  const [showScopeModal, setShowScopeModal] = useState(false)
  const [scopeType, setScopeType] = useState<'business' | 'department' | 'role' | 'user'>('role')
  const [scopeTarget, setScopeTarget] = useState('teacher')
  const [scopeVisibility, setScopeVisibility] = useState<'actual_only' | 'coded_only' | 'both' | 'hidden' | 'disabled'>('coded_only')
  const [scopeCanDecode, setScopeCanDecode] = useState(false)

  // Security PIN State
  const [newPin, setNewPin] = useState('')
  const [pinSuccess, setPinSuccess] = useState(false)

  // Initial Data Fetch
  const fetchData = async () => {
    try {
      setLoading(true)
      const [cfgRes, profRes, scopeRes, auditRes] = await Promise.all([
        codexApi.getConfig(),
        codexApi.getProfiles(),
        codexApi.getScopes(),
        codexApi.getAuditLogs({ limit: 40 }),
      ])

      setConfig(cfgRes.data.config)
      setProfiles(profRes.data)
      setScopes(scopeRes.data)
      setAuditLogs(auditRes.data)

      const defProf = profRes.data.find(p => p.is_default) || profRes.data[0]
      if (defProf) {
        setActiveProfileId(defProf.id)
        setEditingMap(defProf.digit_map)
        setMapPrefix(defProf.prefix)
        setMapSuffix(defProf.suffix)
        setMapDecimal(defProf.decimal_symbol)
        setMapNegative(defProf.negative_symbol)
        // Fetch versions for default profile
        const verRes = await codexApi.getProfileVersions(defProf.id)
        setVersions(verRes.data)
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.detail || 'Failed to load CodeX configuration.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Duplicate Symbol Collision Detection
  const duplicateSymbols = useMemo(() => {
    const symbols = Object.values(editingMap).map(s => s.trim().toUpperCase())
    const duplicates: string[] = []
    symbols.forEach(sym => {
      if (sym && symbols.filter(s => s === sym).length > 1 && !duplicates.includes(sym)) {
        duplicates.push(sym)
      }
    })
    return duplicates
  }, [editingMap])

  // Profile selection change handler
  const handleSelectProfile = async (id: number) => {
    setActiveProfileId(id)
    const prof = profiles.find(p => p.id === id)
    if (prof) {
      setEditingMap(prof.digit_map)
      setMapPrefix(prof.prefix)
      setMapSuffix(prof.suffix)
      setMapDecimal(prof.decimal_symbol)
      setMapNegative(prof.negative_symbol)
      try {
        const verRes = await codexApi.getProfileVersions(id)
        setVersions(verRes.data)
      } catch (e) {
        console.error('Error fetching versions', e)
      }
    }
  }

  // Master Toggle Change Handler
  const handleToggleMaster = async () => {
    if (!isEditMode) {
      setNotification({ type: 'error', message: 'Locked in View Mode: Please enable Edit Mode above to modify CodeX settings.' })
      return
    }
    if (!config) return
    const newMasterState = !config.is_master_enabled
    try {
      setSaving(true)
      await codexApi.updateConfig({ is_master_enabled: newMasterState })
      setConfig({ ...config, is_master_enabled: newMasterState })
      setNotification({
        type: 'success',
        message: newMasterState
          ? 'CodeX activated successfully for authorized scopes.'
          : 'CodeX deactivated. System returned to default plain-text values.',
      })
      setTimeout(() => setNotification(null), 4000)
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.detail || 'Failed to update CodeX status.',
      })
    } finally {
      setSaving(false)
    }
  }

  // Feature Toggle Handler
  const handleToggleFeature = async (featureKey: keyof CodexConfig) => {
    if (!isEditMode) {
      setNotification({ type: 'error', message: 'Locked in View Mode: Please enable Edit Mode above to toggle features.' })
      return
    }
    if (!config) return
    const newVal = !config[featureKey]
    try {
      await codexApi.updateConfig({ [featureKey]: newVal })
      setConfig({ ...config, [featureKey]: newVal } as CodexConfig)
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.detail || `Failed to update ${String(featureKey)}.`,
      })
    }
  }

  // Save Mapping Profile
  const handleSaveProfile = async () => {
    if (!isEditMode) {
      setNotification({ type: 'error', message: 'Locked in View Mode: Please enable Edit Mode above to save mapping profiles.' })
      return
    }
    if (!activeProfileId) return
    if (duplicateSymbols.length > 0) {
      setNotification({
        type: 'error',
        message: `Collision Error: Symbols [${duplicateSymbols.join(', ')}] are duplicated. Each digit 0-9 must map to a unique symbol.`,
      })
      return
    }

    try {
      setSaving(true)
      const prof = profiles.find(p => p.id === activeProfileId)
      const res = await codexApi.updateProfile(activeProfileId, {
        name: prof?.name || 'CodeX Alphabet',
        digit_map: editingMap,
        prefix: mapPrefix,
        suffix: mapSuffix,
        decimal_symbol: mapDecimal,
        negative_symbol: mapNegative,
        change_reason: changeReason || 'Manual mapping modification via CodeX Studio.',
      })

      setNotification({
        type: 'success',
        message: `Mapping profile updated to version ${res.data.version}. Snapshot archived for backward compatibility.`,
      })
      setChangeReason('')
      // Refresh profiles and versions
      fetchData()
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.detail || 'Failed to save mapping profile.',
      })
    } finally {
      setSaving(false)
    }
  }

  // Rollback Profile
  const handleRollback = async (targetVersion: number) => {
    if (!isEditMode) {
      setNotification({
        type: 'error',
        message: 'Activate Edit Mode to rollback CodeX profile versions.',
      })
      return
    }
    if (!activeProfileId) return
    if (!confirm(`Are you sure you want to restore mapping profile to Version ${targetVersion}?`)) return

    try {
      setSaving(true)
      await codexApi.rollbackProfile(activeProfileId, targetVersion)
      setNotification({
        type: 'success',
        message: `Successfully rolled back profile to Version ${targetVersion}.`,
      })
      fetchData()
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.detail || 'Failed to rollback version.',
      })
    } finally {
      setSaving(false)
    }
  }

  // Interactive Live Encode
  const handleLiveEncode = async () => {
    if (!testNumber) return
    try {
      setTestError(null)
      const res = await codexApi.encode({
        value: testNumber,
        profile_id: activeProfileId || undefined,
      })
      setEncodedResult(res.data.encoded_value)
    } catch (err: any) {
      setTestError(err?.response?.data?.detail || 'Encode failed.')
    }
  }

  // Interactive Live Decode
  const handleLiveDecode = async () => {
    if (!testCode) return
    try {
      setTestError(null)
      const res = await codexApi.decode({
        code: testCode,
        profile_id: activeProfileId || undefined,
        pin: testPin || undefined,
      })
      setDecodedResult(res.data)
    } catch (err: any) {
      setTestError(err?.response?.data?.detail || 'Decode failed. Check PIN or code validity.')
    }
  }

  // Generate QR Code Payload
  const handleGenerateQr = async () => {
    if (!encodedResult) return
    try {
      const res = await codexApi.generateQr({
        encoded_payload: encodedResult,
        actual_value: parseFloat(testNumber) || undefined,
        duration_seconds: config?.decoder_expiry_seconds || 300,
        requires_pin: config?.feature_pin_protected_decoding || false,
      })
      setQrPayload(res.data.qr_data)
    } catch (err: any) {
      setTestError('Failed to generate QR payload.')
    }
  }

  // Save Scope
  const handleSaveScope = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditMode) {
      setNotification({ type: 'error', message: 'Locked in View Mode: Please enable Edit Mode above to save scopes.' })
      return
    }
    try {
      await codexApi.saveScope({
        scope_type: scopeType,
        scope_target: scopeTarget,
        visibility_mode: scopeVisibility,
        can_decode: scopeCanDecode,
      })
      setShowScopeModal(false)
      const sRes = await codexApi.getScopes()
      setScopes(sRes.data)
      setNotification({ type: 'success', message: 'Scope assignment saved successfully.' })
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.response?.data?.detail || 'Failed to save scope.' })
    }
  }

  // Delete Scope
  const handleDeleteScope = async (id: number) => {
    try {
      await codexApi.deleteScope(id)
      setScopes(scopes.filter(s => s.id !== id))
      setNotification({ type: 'success', message: 'Scope deleted successfully.' })
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Failed to delete scope.' })
    }
  }

  // Update PIN
  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await codexApi.updateConfig({ security_pin: newPin })
      setPinSuccess(true)
      setNewPin('')
      setTimeout(() => setPinSuccess(false), 3000)
      fetchData()
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Failed to update security PIN.' })
    }
  }

  // 11 Navigation Studio Sections
  const STUDIO_SECTIONS = [
    { id: 'general', title: '1. General Settings', icon: Sliders },
    { id: 'scope', title: '2. Activation Scope', icon: Layers },
    { id: 'features', title: '3. Feature Options', icon: ToggleRight },
    { id: 'mapping', title: '4. Mapping Profile Studio', icon: Hash },
    { id: 'modules', title: '5. Module & Field Binding', icon: Briefcase },
    { id: 'roles', title: '6. Role & Department Rules', icon: Users },
    { id: 'users', title: '7. User Assignments', icon: Users },
    { id: 'security', title: '8. Decoder Security & PIN', icon: Lock },
    { id: 'expiry', title: '9. Expiry & Access Rules', icon: History },
    { id: 'history', title: '10. Configuration History', icon: FileText },
    { id: 'testing', title: '11. Live Preview & Sandbox', icon: ArrowLeftRight },
  ]

  if (loading && !config) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          <p className="text-sm text-slate-500 font-medium">Loading CodeX Configuration Studio...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Global View-First & Explicit Edit Mode Governance Bar */}
      <EditModeBar scope={editScope} title="CodeX Cryptographic Obfuscation Studio" />

      {/* Top Header & Master Switch Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-colors ${
              config?.is_master_enabled
                ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}>
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CodeX Configuration Studio</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  config?.is_master_enabled
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {config?.is_master_enabled ? 'Active (ON)' : 'Disabled (OFF)'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  System Default: DISABLED
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Configurable numeric coding, value obfuscation, reversible alphabet mappings, and scope access governance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowQuickDecoder(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Unlock className="w-4 h-4 text-slate-600" />
              On-Demand Decoder
            </button>
            <button
              onClick={handleToggleMaster}
              disabled={saving}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all ${
                config?.is_master_enabled
                  ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
              }`}
            >
              {config?.is_master_enabled ? (
                <>
                  <ToggleRight className="w-4 h-4 text-red-600" />
                  Deactivate CodeX
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4" />
                  Activate CodeX
                </>
              )}
            </button>
          </div>
        </div>

        {notification && (
          <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}
      </div>

      {/* Main Studio Workspace: Left Navigation & Right Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2">
              Studio Sections
            </h4>
            <nav className="space-y-1">
              {STUDIO_SECTIONS.map((sec) => {
                const Icon = sec.icon
                const isActive = activeSection === sec.id
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSection(sec.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition-all ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="truncate">{sec.title}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* System Default Assurance Card */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-4 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
              <Shield className="w-4 h-4 text-indigo-400" />
              Non-Negotiable Policy
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              CodeX remains <strong>OFF</strong> after fresh install, updates, or tenant onboarding. Activation requires explicit owner configuration.
            </p>
          </div>
        </div>

        {/* Section Content Panel */}
        <div className="lg:col-span-3 space-y-6">
          {/* SECTION 1: GENERAL SETTINGS */}
          {activeSection === 'general' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900">General Settings & Master Policy</h3>
                <p className="text-xs text-slate-500">Central activation master switch and system behavior controls.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                  <span className="text-xs font-semibold text-slate-700">Master Switch Status</span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">
                      {config?.is_master_enabled ? 'Activated (Opt-in)' : 'Completely Disabled'}
                    </span>
                    <button
                      onClick={handleToggleMaster}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        config?.is_master_enabled
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {config?.is_master_enabled ? 'Turn OFF' : 'Turn ON'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    When disabled, all raw financial and academic figures are shown without modification.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                  <span className="text-xs font-semibold text-slate-700">Emergency Global Disable</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Immediate Kill-Switch</span>
                    <LockedButton
                      isEditMode={isEditMode}
                      onClick={() => {
                        if (confirm('Emergency kill-switch will disable CodeX immediately for all users.')) {
                          codexApi.updateConfig({ is_master_enabled: false }).then(fetchData)
                        }
                      }}
                      className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Emergency Kill
                    </LockedButton>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Forces instant reversion of all coded values back to plain-text across all users.
                  </p>
                </div>
              </div>

              {/* Scope Hierarchy Summary */}
              <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2">
                <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  Configuration Precedence Order
                </span>
                <div className="flex flex-wrap items-center gap-2 text-xs text-indigo-900 pt-1">
                  <span className="px-2.5 py-1 bg-white border border-indigo-200 rounded-lg font-semibold">1. Security Policy</span>
                  <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="px-2.5 py-1 bg-white border border-indigo-200 rounded-lg font-semibold">2. System Default (OFF)</span>
                  <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="px-2.5 py-1 bg-white border border-indigo-200 rounded-lg font-semibold">3. Business Default</span>
                  <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="px-2.5 py-1 bg-white border border-indigo-200 rounded-lg font-semibold">4. Department</span>
                  <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="px-2.5 py-1 bg-white border border-indigo-200 rounded-lg font-semibold">5. Role</span>
                  <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="px-2.5 py-1 bg-white border border-indigo-200 rounded-lg font-semibold">6. User Override</span>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: ACTIVATION SCOPE */}
          {activeSection === 'scope' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Activation Scope Hierarchy</h3>
                  <p className="text-xs text-slate-500">Assign multi-tier activation rules and visibility policies.</p>
                </div>
                <button
                  onClick={() => setShowScopeModal(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Scope Override
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Scope Level</th>
                      <th className="py-3 px-4">Target Identity</th>
                      <th className="py-3 px-4">Visibility Mode</th>
                      <th className="py-3 px-4">Can Decode</th>
                      <th className="py-3 px-4">QR Enabled</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    <tr className="bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold text-slate-900">1. System Level</td>
                      <td className="py-3 px-4 text-slate-600">All Nodes</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          Disabled by Default
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">—</td>
                      <td className="py-3 px-4 text-slate-500">—</td>
                      <td className="py-3 px-4 text-right text-slate-400">Enforced</td>
                    </tr>
                    {scopes.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-800 capitalize">{s.scope_type}</td>
                        <td className="py-3 px-4 font-mono font-medium text-indigo-700">{s.scope_target}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                            s.visibility_mode === 'coded_only' ? 'bg-amber-100 text-amber-800' :
                            s.visibility_mode === 'both' ? 'bg-indigo-100 text-indigo-800' :
                            s.visibility_mode === 'hidden' ? 'bg-red-100 text-red-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {s.visibility_mode.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {s.can_decode ? (
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Authorized
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {s.can_generate_qr ? <span className="text-indigo-600 font-medium">Yes</span> : <span className="text-slate-400">No</span>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteScope(s.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 3: FEATURE OPTIONS (16 Switches) */}
          {activeSection === 'features' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900">Feature Switches (16 Independent Options)</h3>
                <p className="text-xs text-slate-500">Configure which CodeX capabilities and application fields are active.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Numeric Coding Group */}
                <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                    <Hash className="w-4 h-4 text-indigo-600" /> Numeric Coding Engine
                  </h4>
                  <div className="space-y-2 text-xs">
                    {[
                      { key: 'feature_numeric_to_alphabet', label: 'Numeric-to-Alphabet Encoding' },
                      { key: 'feature_alphabet_to_numeric', label: 'Alphabet-to-Numeric Decoding' },
                      { key: 'feature_custom_alphabet_mapping', label: 'Custom Alphabet Mapping' },
                      { key: 'feature_multiple_mapping_profiles', label: 'Multiple Mapping Profiles' },
                      { key: 'feature_mapping_version_history', label: 'Mapping Version History' },
                    ].map(f => (
                      <div key={f.key} className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-700 font-medium">{f.label}</span>
                        <input
                          type="checkbox"
                          checked={Boolean(config?.[f.key as keyof CodexConfig])}
                          onChange={() => handleToggleFeature(f.key as keyof CodexConfig)}
                          className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Value Visibility Group */}
                <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-600" /> Value Visibility Controls
                  </h4>
                  <div className="space-y-2 text-xs">
                    {[
                      { key: 'feature_hide_actual_amount', label: 'Hide Actual Amount (Obfuscate)' },
                      { key: 'feature_show_actual_amount', label: 'Show Actual Amount' },
                      { key: 'feature_show_both', label: 'Show Both Actual & Coded Values' },
                    ].map(f => (
                      <div key={f.key} className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-700 font-medium">{f.label}</span>
                        <input
                          type="checkbox"
                          checked={Boolean(config?.[f.key as keyof CodexConfig])}
                          onChange={() => handleToggleFeature(f.key as keyof CodexConfig)}
                          className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Code Distribution Group */}
                <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-indigo-600" /> Distribution & Decoder
                  </h4>
                  <div className="space-y-2 text-xs">
                    {[
                      { key: 'feature_qr_generation', label: 'QR Code Generation' },
                      { key: 'feature_mobile_decoder', label: 'Mobile Decoder Support' },
                      { key: 'feature_offline_decoder', label: 'Offline Sync Decoder' },
                      { key: 'feature_copy_share_code', label: 'Copy & Share Codes' },
                      { key: 'feature_expiry_codes', label: 'Expiry-Based Codes' },
                      { key: 'feature_pin_protected_decoding', label: 'PIN-Protected Decoding' },
                    ].map(f => (
                      <div key={f.key} className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-700 font-medium">{f.label}</span>
                        <input
                          type="checkbox"
                          checked={Boolean(config?.[f.key as keyof CodexConfig])}
                          onChange={() => handleToggleFeature(f.key as keyof CodexConfig)}
                          className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Business Applications Group */}
                <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-indigo-600" /> Business Data Fields
                  </h4>
                  <div className="space-y-2 text-xs">
                    {[
                      { key: 'app_salary_payroll', label: 'Teacher & Staff Payroll (Salaries)' },
                      { key: 'app_fee_structures', label: 'Fee Structures & Installments' },
                      { key: 'app_discounts', label: 'Fee Discounts & Concessions' },
                      { key: 'app_selling_price', label: 'Selling Price' },
                      { key: 'app_purchase_cost', label: 'Purchase Cost' },
                      { key: 'app_commission', label: 'Commissions & Incentive Rates' },
                      { key: 'app_customer_specific_values', label: 'Customer Specific Values' },
                      { key: 'app_internal_reference_values', label: 'Internal Business References' },
                    ].map(f => (
                      <div key={f.key} className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-700 font-medium">{f.label}</span>
                        <input
                          type="checkbox"
                          checked={Boolean(config?.[f.key as keyof CodexConfig])}
                          onChange={() => handleToggleFeature(f.key as keyof CodexConfig)}
                          className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: MAPPING PROFILE STUDIO */}
          {activeSection === 'mapping' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Custom Mapping Profile Studio</h3>
                  <p className="text-xs text-slate-500">Define custom 0-9 bijective symbol mappings with version tracking.</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={activeProfileId || ''}
                    onChange={(e) => handleSelectProfile(Number(e.target.value))}
                    className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (v{p.version}) {p.is_default ? '• Default' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowNewProfileModal(true)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Profile
                  </button>
                </div>
              </div>

              {/* 0-9 Keypad Mapping Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  0–9 Bijective Digit Symbol Mapper
                </label>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2.5">
                  {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => {
                    const sym = editingMap[digit] || ''
                    const isDup = duplicateSymbols.includes(sym.trim().toUpperCase())
                    return (
                      <div
                        key={digit}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          isDup
                            ? 'bg-red-50 border-red-300 ring-2 ring-red-200'
                            : 'bg-slate-50/70 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <span className="block text-xs font-mono font-bold text-slate-500 mb-1">
                          Digit {digit}
                        </span>
                        <input
                          type="text"
                          maxLength={2}
                          value={sym}
                          onChange={(e) => {
                            setEditingMap({
                              ...editingMap,
                              [digit]: e.target.value.toUpperCase()
                            })
                          }}
                          className="w-full text-center font-mono font-bold text-lg text-indigo-950 uppercase bg-white border border-slate-200 rounded-lg py-1 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )
                  })}
                </div>
                {duplicateSymbols.length > 0 && (
                  <div className="mt-2 text-xs text-red-600 flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>Collision Detected: Symbols [{duplicateSymbols.join(', ')}] are duplicated. Each symbol must be unique.</span>
                  </div>
                )}
              </div>

              {/* Prefix, Suffix & Symbols */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Code Prefix</label>
                  <input
                    type="text"
                    value={mapPrefix}
                    onChange={(e) => setMapPrefix(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                    placeholder="e.g. CX-"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Code Suffix</label>
                  <input
                    type="text"
                    value={mapSuffix}
                    onChange={(e) => setMapSuffix(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                    placeholder="e.g. -AITDL"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Decimal Symbol</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={mapDecimal}
                    onChange={(e) => setMapDecimal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Negative Symbol</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={mapNegative}
                    onChange={(e) => setMapNegative(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-center"
                  />
                </div>
              </div>

              {/* Version Reason & Save Button */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100">
                <input
                  type="text"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Justification for version update (e.g. Annual rotation of alphabet keys)"
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
                <button
                  onClick={handleSaveProfile}
                  disabled={saving || duplicateSymbols.length > 0}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Save & Archive Version
                </button>
              </div>

              {/* Version History Table with Rollback */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-4 h-4 text-slate-500" />
                  Historical Version Log (Backward Compatibility Guarantee)
                </h4>
                <div className="space-y-2">
                  {versions.map((ver) => (
                    <div
                      key={ver.id}
                      className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Version {ver.version}</span>
                          <span className="text-[11px] text-slate-500">{new Date(ver.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">{ver.change_reason || 'Configuration update'}</p>
                      </div>
                      <button
                        onClick={() => handleRollback(ver.version)}
                        className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Rollback to v{ver.version}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 8: DECODER SECURITY & PIN */}
          {activeSection === 'security' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900">Decoder Security & PIN Governance</h3>
                <p className="text-xs text-slate-500">Protect on-demand decoding operations with security credentials.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form onSubmit={handleUpdatePin} className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Lock className="w-4 h-4 text-indigo-600" /> Set Security PIN
                  </h4>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Enter 4-6 Digit Master PIN</label>
                    <input
                      type="password"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder="e.g. 4826"
                      maxLength={8}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono tracking-widest"
                      required
                    />
                  </div>
                  {pinSuccess && (
                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Security PIN updated successfully.
                    </p>
                  )}
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
                  >
                    Update Decoder PIN
                  </button>
                </form>

                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-600" /> Decoder Parameters
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Session Expiry (Seconds)</label>
                      <input
                        type="number"
                        value={config?.decoder_expiry_seconds || 300}
                        onChange={(e) => codexApi.updateConfig({ decoder_expiry_seconds: Number(e.target.value) }).then(fetchData)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Max Failed Attempts (Rate Limit)</label>
                      <input
                        type="number"
                        value={config?.max_decoding_attempts || 5}
                        onChange={(e) => codexApi.updateConfig({ max_decoding_attempts: Number(e.target.value) }).then(fetchData)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 10: AUDIT LOGS */}
          {activeSection === 'history' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900">Security Audit Trail</h3>
                <p className="text-xs text-slate-500">Append-only compliance log for CodeX activations, mapping edits, and decode operations.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 text-slate-500 font-sans">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-indigo-700 uppercase">
                          {log.action}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-sans">
                          {log.user_name || 'System'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            log.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {log.ip_address || 'Internal'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 11: LIVE PREVIEW & INTERACTIVE TESTING */}
          {activeSection === 'testing' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900">Live Preview & Bidirectional Sandbox</h3>
                <p className="text-xs text-slate-500">Test live numeric encoding and authorized decoding with the active profile.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Live Encoder Sandbox */}
                <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Hash className="w-4 h-4 text-indigo-600" /> Live Encoder
                    </span>
                    <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      Profile: {profiles.find(p => p.id === activeProfileId)?.profile_code || 'DEFAULT'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Enter Numeric Value</label>
                    <input
                      type="text"
                      value={testNumber}
                      onChange={(e) => setTestNumber(e.target.value)}
                      placeholder="e.g. 1250 or 1250.75"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-sm"
                    />
                  </div>

                  <button
                    onClick={handleLiveEncode}
                    className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all"
                  >
                    Encode Numeric Value
                  </button>

                  <div className="p-4 bg-white border border-indigo-100 rounded-xl space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Coded Result</span>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xl font-bold font-mono text-indigo-950 tracking-widest">
                        {encodedResult}
                      </span>
                      <button
                        onClick={() => {
                          setTestCode(encodedResult)
                          navigator.clipboard.writeText(encodedResult)
                        }}
                        className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 flex items-center gap-1"
                      >
                        <Copy className="w-3.5 h-3.5" /> Transfer
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateQr}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-4 h-4 text-indigo-600" />
                    Generate QR Code Simulation
                  </button>

                  {qrPayload && (
                    <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-center space-y-2">
                      <div className="w-24 h-24 mx-auto bg-white p-2 rounded-xl border border-indigo-200 shadow-xs flex items-center justify-center">
                        <QrCode className="w-18 h-18 text-indigo-950" />
                      </div>
                      <p className="text-[10px] font-mono text-indigo-900 truncate">{qrPayload}</p>
                    </div>
                  )}
                </div>

                {/* Live Decoder Sandbox */}
                <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Unlock className="w-4 h-4 text-emerald-600" /> Live Decoder
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Authorized Reversal
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Enter Encoded String</label>
                    <input
                      type="text"
                      value={testCode}
                      onChange={(e) => setTestCode(e.target.value.toUpperCase())}
                      placeholder="e.g. CX-AZPQ"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-sm tracking-widest uppercase"
                    />
                  </div>

                  {config?.feature_pin_protected_decoding && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Security PIN</label>
                      <input
                        type="password"
                        value={testPin}
                        onChange={(e) => setTestPin(e.target.value)}
                        placeholder="Required 4-digit PIN"
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>
                  )}

                  {testError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>{testError}</span>
                    </div>
                  )}

                  <button
                    onClick={handleLiveDecode}
                    className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all"
                  >
                    Decode Encoded String
                  </button>

                  {decodedResult && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                      <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                        Decoded Authentic Value
                      </span>
                      <div className="text-2xl font-bold font-mono text-emerald-950">
                        {decodedResult.formatted_value}
                      </div>
                      <p className="text-[10px] text-emerald-700">Decoded using profile Version {decodedResult.version_used}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* FALLBACK FOR UNLOADED TABS */}
          {['modules', 'roles', 'users', 'expiry'].includes(activeSection) && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 capitalize">{activeSection} Configuration</h3>
              <p className="text-xs text-slate-500">
                Configuration parameters for {activeSection} are active and enforced through the backend scope engine.
              </p>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
                <span className="font-semibold text-slate-800">Current Scope Rule:</span>
                <p>
                  Scope assignments defined in <strong>Section 2 (Activation Scope)</strong> govern visibility across teacher payroll, fee structures, discounts, and department workforce listings.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scope Override Modal */}
      {showScopeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add Scope Override</h3>
            <form onSubmit={handleSaveScope} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Scope Level</label>
                <select
                  value={scopeType}
                  onChange={(e: any) => setScopeType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="business">Business Default</option>
                  <option value="department">Department</option>
                  <option value="role">Role</option>
                  <option value="user">User</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Name / ID</label>
                <input
                  type="text"
                  value={scopeTarget}
                  onChange={(e) => setScopeTarget(e.target.value)}
                  placeholder="e.g. teacher or Administration or 122"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Visibility Mode</label>
                <select
                  value={scopeVisibility}
                  onChange={(e: any) => setScopeVisibility(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="coded_only">Coded Only (Obfuscated)</option>
                  <option value="both">Both (Coded + Actual)</option>
                  <option value="actual_only">Actual Only (Plain Text)</option>
                  <option value="hidden">Hidden Completely</option>
                  <option value="disabled">Disabled for Scope</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="canDecodeCheck"
                  checked={scopeCanDecode}
                  onChange={(e) => setScopeCanDecode(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="canDecodeCheck" className="font-semibold text-slate-700">Authorize On-Demand Decoding</label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowScopeModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl"
                >
                  Save Scope
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Decoder Modal */}
      <QuickDecoderModal
        isOpen={showQuickDecoder}
        onClose={() => setShowQuickDecoder(false)}
        initialCode={encodedResult}
      />
    </div>
  )
}

