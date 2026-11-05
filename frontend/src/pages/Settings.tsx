/**
 * @file        Settings.tsx
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
 * @created     2026-11-05
 * @updated     2026-11-05
 *
 * @description Comprehensive Institute Settings & Configuration Workspace for branding, defaults, lookups, and governance.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Building2, Palette, GraduationCap, UserCheck, Users, CreditCard,
  CalendarCheck, Award, MessageSquare, Printer, Sliders, SlidersHorizontal,
  Shield, Link2, Database, Save, RotateCcw, Search, Eye, Upload,
  Check, AlertCircle, Info, Plus, Edit, Trash2, CheckCircle2, ChevronRight,
  X, ExternalLink, RefreshCw, Lock, Bell, HelpCircle, FileText, MapPin,
  GitFork, ShieldCheck, Download
} from 'lucide-react'
import { settingsApi } from '../api/endpoints'
import type {
  InstituteProfile, LookupItem, LookupsResponse, SettingAuditLogItem, AllSettingsState
} from '../types'
import { useAuthStore, isUserSysAdmin } from '../store/authStore'
import { useBranding } from '../config/branding'
import OrganizationBranding from '../components/OrganizationBranding'

// Definition of 15 settings workspace categories matching system architecture
export interface SettingsCategory {
  id: string
  title: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  group: 'general' | 'academic' | 'operations' | 'system'
}

export const SETTINGS_CATEGORIES: SettingsCategory[] = [
  { id: 'profile', title: 'Institute Profile', subtitle: 'Identity, address, contact & basic details', icon: Building2, group: 'general' },
  { id: 'branding', title: 'Branding & Appearance', subtitle: 'Logo, colors, theme, login & documents', icon: Palette, group: 'general' },
  { id: 'academic', title: 'Academic Configuration', subtitle: 'Academic year, boards, standards & terms', icon: GraduationCap, group: 'academic' },
  { id: 'admission', title: 'Student & Admission Settings', subtitle: 'Admission, enrollment & student policies', icon: UserCheck, group: 'academic' },
  { id: 'staff', title: 'Staff & HR Settings', subtitle: 'Employee, roles, leave & departments', icon: Users, group: 'operations' },
  { id: 'fees', title: 'Fees & Finance Settings', subtitle: 'Fee heads, installments, discounts & receipts', icon: CreditCard, group: 'operations' },
  { id: 'attendance', title: 'Attendance Settings', subtitle: 'Modes, status, grace period & holidays', icon: CalendarCheck, group: 'operations' },
  { id: 'examination', title: 'Examination Settings', subtitle: 'Exam types, grading, results & report card', icon: Award, group: 'academic' },
  { id: 'communication', title: 'Communication Settings', subtitle: 'WhatsApp, Email, SMS & message templates', icon: MessageSquare, group: 'operations' },
  { id: 'documents', title: 'Documents & Print Settings', subtitle: 'Receipts, reports, certificates & paper settings', icon: Printer, group: 'operations' },
  { id: 'lookups', title: 'General Lookups', subtitle: 'Dropdown values, categories & reference lists', icon: Sliders, group: 'system' },
  { id: 'system', title: 'System Parameters', subtitle: 'Numbering, defaults, policies & feature flags', icon: SlidersHorizontal, group: 'system' },
  { id: 'permissions', title: 'Users & Permissions', subtitle: 'Roles, access rights & security', icon: Shield, group: 'system' },
  { id: 'integrations', title: 'Integrations', subtitle: 'Payment, messaging & external services', icon: Link2, group: 'system' },
  { id: 'maintenance', title: 'Data & Maintenance', subtitle: 'Import, export, backup & audit logs', icon: Database, group: 'system' },
]

export default function Settings() {
  const { user } = useAuthStore()
  const branding = useBranding()
  const isSysAdmin = isUserSysAdmin(user)

  // Navigation & Category Search
  const [activeCategory, setActiveCategory] = useState<string>('profile')
  const [categorySearch, setCategorySearch] = useState<string>('')
  const [globalSearch, setGlobalSearch] = useState<string>('')

  // Sub-tabs for Institute Profile
  const [profileSubTab, setProfileSubTab] = useState<'basic' | 'address' | 'branches' | 'affiliations' | 'compliance'>('basic')

  // Loading & State
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Profile Form State
  const [profile, setProfile] = useState<InstituteProfile>({
    id: 1,
    name: 'PrathamOne Academy',
    code: 'PA001',
    short_name: 'PA',
    tagline: 'Learn • Practice • Achieve',
    institute_type: 'Coaching Institute',
    establishment_year: 2018,
    registration_number: 'MH-COACH-2018-0157',
    tax_id: 'AABCP1234K',
    description: 'A comprehensive coaching academy for school & competitive examinations, focused on concept clarity and student success.',
    is_active: true,
    default_language: 'en',
    timezone: 'Asia/Kolkata',
    address: 'Vasai Road (W), Palghar - 401202',
    city: 'Palghar',
    state: 'Maharashtra',
    pincode: '401202',
    phone: '+91 98765 43210',
    email: 'info@prathamoneacademy.in',
    website: 'https://prathamone.com',
    logo_url: '/logo.svg',
    favicon_url: '/favicon.svg',
    primary_color: '#1E40AF',
    secondary_color: '#3B82F6',
    accent_color: '#8B5CF6',
  })
  const [originalProfile, setOriginalProfile] = useState<InstituteProfile | null>(null)

  // Category Settings State (Academic, Admission, Staff, Fees, Attendance, Examination, Documents, System)
  const [allSettings, setAllSettings] = useState<AllSettingsState>({})
  const [originalSettings, setOriginalSettings] = useState<AllSettingsState>({})

  // Lookups State
  const [lookups, setLookups] = useState<LookupItem[]>([])
  const [lookupCategories, setLookupCategories] = useState<string[]>([])
  const [selectedLookupCategory, setSelectedLookupCategory] = useState<string>('ALL')
  const [lookupSearch, setLookupSearch] = useState<string>('')
  const [isLookupModalOpen, setIsLookupModalOpen] = useState<boolean>(false)
  const [editingLookup, setEditingLookup] = useState<LookupItem | null>(null)
  const [lookupForm, setLookupForm] = useState({
    category: 'STUDENT_CATEGORY',
    code: '',
    label: '',
    description: '',
    sort_order: 1,
    is_active: true,
  })

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<SettingAuditLogItem[]>([])

  // File Upload refs
  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  // Initial Data Load
  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [profRes, setRes, lkpRes, auditRes] = await Promise.all([
        settingsApi.getProfile(),
        settingsApi.getAll(),
        settingsApi.getLookups(),
        settingsApi.getAuditLogs({ limit: 50 }),
      ])

      setProfile(profRes.data)
      setOriginalProfile(profRes.data)

      setAllSettings(setRes.data)
      setOriginalSettings(setRes.data)

      setLookups(lkpRes.data.items || [])
      setLookupCategories(lkpRes.data.categories || [])

      setAuditLogs(auditRes.data || [])
    } catch (err: any) {
      console.error('Failed to load institute settings:', err)
      showNotification('error', 'Failed to load institute settings. Using system baseline defaults.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => {
      setFeedback(null)
    }, 4500)
  }

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    const q = (categorySearch || globalSearch).trim().toLowerCase()
    if (!q) return SETTINGS_CATEGORIES
    return SETTINGS_CATEGORIES.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    )
  }, [categorySearch, globalSearch])

  // Current active category metadata
  const currentCategoryMeta = useMemo(() => {
    return SETTINGS_CATEGORIES.find((c) => c.id === activeCategory) || SETTINGS_CATEGORIES[0]
  }, [activeCategory])

  // Profile Form Handler
  const handleProfileChange = (field: keyof InstituteProfile, value: any) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  // Generic Setting Handler
  const handleSettingChange = (category: string, key: string, value: any) => {
    setAllSettings((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [key]: value,
      },
    }))
  }

  // Discard Changes
  const handleDiscard = () => {
    if (activeCategory === 'profile') {
      if (originalProfile) setProfile(originalProfile)
    } else {
      if (originalSettings[activeCategory]) {
        setAllSettings((prev) => ({
          ...prev,
          [activeCategory]: { ...originalSettings[activeCategory] },
        }))
      }
    }
    showNotification('success', 'Changes discarded. Restored saved configuration.')
  }

  // Save Changes for Active Category
  const handleSave = async () => {
    try {
      setSaving(true)
      if (activeCategory === 'profile') {
        const res = await settingsApi.updateProfile(profile)
        setProfile(res.data.profile)
        setOriginalProfile(res.data.profile)
        showNotification('success', 'Institute profile and branding settings saved successfully.')
      } else {
        const categoryData = allSettings[activeCategory] || {}
        await settingsApi.updateBatch(
          activeCategory,
          categoryData,
          `Updated via Institute Settings ${currentCategoryMeta.title} workspace`
        )
        setOriginalSettings((prev) => ({
          ...prev,
          [activeCategory]: { ...categoryData },
        }))
        showNotification('success', `${currentCategoryMeta.title} saved successfully.`)
      }

      // Refresh audit logs
      const auditRes = await settingsApi.getAuditLogs({ limit: 50 })
      setAuditLogs(auditRes.data || [])
    } catch (err: any) {
      console.error('Failed to save settings:', err)
      showNotification('error', err?.response?.data?.detail || 'Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Handle Logo Upload Simulation
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        handleProfileChange('logo_url', reader.result as string)
        showNotification('success', `Logo "${file.name}" uploaded for preview. Click Save Changes to commit.`)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        handleProfileChange('favicon_url', reader.result as string)
        showNotification('success', `Favicon "${file.name}" uploaded for preview. Click Save Changes to commit.`)
      }
      reader.readAsDataURL(file)
    }
  }

  // Lookups Management
  const filteredLookups = useMemo(() => {
    return lookups.filter((item) => {
      const matchCat = selectedLookupCategory === 'ALL' || item.category === selectedLookupCategory
      const matchSearch =
        !lookupSearch ||
        item.code.toLowerCase().includes(lookupSearch.toLowerCase()) ||
        item.label.toLowerCase().includes(lookupSearch.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(lookupSearch.toLowerCase()))
      return matchCat && matchSearch
    })
  }, [lookups, selectedLookupCategory, lookupSearch])

  const handleOpenAddLookup = () => {
    setEditingLookup(null)
    setLookupForm({
      category: selectedLookupCategory !== 'ALL' ? selectedLookupCategory : (lookupCategories[0] || 'STUDENT_CATEGORY'),
      code: '',
      label: '',
      description: '',
      sort_order: (lookups.length + 1),
      is_active: true,
    })
    setIsLookupModalOpen(true)
  }

  const handleOpenEditLookup = (item: LookupItem) => {
    setEditingLookup(item)
    setLookupForm({
      category: item.category,
      code: item.code,
      label: item.label,
      description: item.description || '',
      sort_order: item.sort_order,
      is_active: item.is_active,
    })
    setIsLookupModalOpen(true)
  }

  const handleSaveLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingLookup) {
        const res = await settingsApi.updateLookup(editingLookup.id, {
          label: lookupForm.label,
          description: lookupForm.description,
          sort_order: lookupForm.sort_order,
          is_active: lookupForm.is_active,
        })
        setLookups((prev) =>
          prev.map((i) => (i.id === editingLookup.id ? { ...i, ...res.data.item } : i))
        )
        showNotification('success', 'Lookup item updated successfully.')
      } else {
        const res = await settingsApi.createLookup({
          category: lookupForm.category,
          code: lookupForm.code,
          label: lookupForm.label,
          description: lookupForm.description,
          sort_order: lookupForm.sort_order,
          is_active: lookupForm.is_active,
        })
        const newItem: LookupItem = {
          id: res.data.item.id,
          category: lookupForm.category,
          code: res.data.item.code,
          label: res.data.item.label,
          description: lookupForm.description,
          sort_order: lookupForm.sort_order,
          is_active: lookupForm.is_active,
          is_system: false,
        }
        setLookups((prev) => [...prev, newItem])
        if (!lookupCategories.includes(lookupForm.category)) {
          setLookupCategories((prev) => [...prev, lookupForm.category].sort())
        }
        showNotification('success', 'Lookup item created successfully.')
      }
      setIsLookupModalOpen(false)
    } catch (err: any) {
      console.error('Failed to save lookup item:', err)
      showNotification('error', err?.response?.data?.detail || 'Failed to save lookup item.')
    }
  }

  const handleDeleteLookup = async (item: LookupItem) => {
    if (!confirm(`Are you sure you want to ${item.is_system ? 'deactivate' : 'delete'} lookup "${item.label}" (${item.code})?`)) {
      return
    }
    try {
      await settingsApi.deleteLookup(item.id)
      if (item.is_system) {
        setLookups((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, is_active: false } : i))
        )
        showNotification('success', 'System lookup item deactivated safely.')
      } else {
        setLookups((prev) => prev.filter((i) => i.id !== item.id))
        showNotification('success', 'Lookup item removed successfully.')
      }
    } catch (err: any) {
      console.error('Failed to delete lookup item:', err)
      showNotification('error', err?.response?.data?.detail || 'Failed to delete lookup item.')
    }
  }

  // Backup Snapshot Download
  const handleDownloadSnapshot = () => {
    const snapshot = {
      timestamp: new Date().toISOString(),
      institution: profile,
      settings: allSettings,
      lookups: lookups,
      exported_by: user?.username || 'system',
    }
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prathamone_settings_backup_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showNotification('success', 'Settings configuration snapshot downloaded successfully.')
  }

  // Reset category defaults
  const handleResetDefaults = async (category: string) => {
    if (!confirm(`Are you sure you want to reset "${category}" settings to system defaults? Custom values will be reverted.`)) {
      return
    }
    try {
      await settingsApi.resetDefaults(category)
      await fetchAllData()
      showNotification('success', `Category "${category}" reset to default values.`)
    } catch (err: any) {
      console.error('Failed to reset defaults:', err)
      showNotification('error', 'Failed to reset category defaults.')
    }
  }

  const ActiveIcon = currentCategoryMeta.icon

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Search & Utilities Bar (Matching Screenshot Header) */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-700 text-white font-bold text-sm flex items-center justify-center shadow-xs">
            {profile.short_name || 'PA'}
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">
              {profile.name || 'PrathamOne Academy'}
            </h1>
            <p className="text-xs text-gray-500">Coaching Institute Management System</p>
          </div>
        </div>

        {/* Global settings search input */}
        <div className="flex-1 max-w-xl mx-8 relative hidden md:block">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search settings, e.g., 'fee receipt', 'academic year'..."
            className="w-full pl-10 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-800"
          />
          {globalSearch && (
            <button
              onClick={() => setGlobalSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Utilities & User Avatar */}
        <div className="flex items-center gap-3">
          <button
            title="Notifications"
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 relative transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 absolute top-1.5 right-1.5" />
          </button>
          <button
            title="Help & Documentation"
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <div
            title={user?.username || 'Current User'}
            className="w-8 h-8 rounded-full bg-blue-900 text-white font-semibold text-xs flex items-center justify-center shadow-xs cursor-default"
          >
            {profile.short_name || 'PA'}
          </div>
        </div>
      </div>

      {/* Main Workspace: Left Sub-sidebar (15 Sections) + Right Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sub-sidebar: Settings Categories Navigation */}
        <div className="w-72 sm:w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 h-[calc(100vh-61px)] overflow-y-auto">
          {/* Header & Sub-search */}
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">Institute Settings</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Configure your institute, modules, and system behavior
            </p>

            <div className="relative mt-3">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Search settings..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-gray-800"
              />
              {categorySearch && (
                <button
                  onClick={() => setCategorySearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Categories Nav List */}
          <div className="p-2 space-y-1 flex-1 overflow-y-auto">
            {filteredCategories.map((cat) => {
              const Icon = cat.icon
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full text-left p-2.5 rounded-lg flex items-start gap-3 transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-900 shadow-xs border-l-4 border-blue-600 rounded-l-none'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div
                    className={`mt-0.5 p-1 rounded-md ${
                      isActive ? 'text-blue-700 bg-blue-100' : 'text-gray-500 bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold leading-snug truncate">{cat.title}</div>
                    <div
                      className={`text-[11px] truncate leading-tight ${
                        isActive ? 'text-blue-600' : 'text-gray-500'
                      }`}
                    >
                      {cat.subtitle}
                    </div>
                  </div>
                </button>
              )
            })}
            {filteredCategories.length === 0 && (
              <div className="text-center py-8 px-4 text-xs text-gray-400">
                No matching settings found for "{categorySearch || globalSearch}".
              </div>
            )}
          </div>

          {/* Sidebar Footer Status */}
          <div className="p-3 bg-gray-50 border-t border-gray-200 text-center text-[11px] text-gray-500">
            PrathamOne Academy Suite <span className="font-semibold">{branding.versionDisplay}</span>
          </div>
        </div>

        {/* Right Main Pane: Active Setting Configuration */}
        <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col h-[calc(100vh-61px)]">
          {/* Top Bar for Active Category with Actions */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
                <ActiveIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 leading-snug">
                  {currentCategoryMeta.title}
                </h2>
                <p className="text-xs text-gray-500">{currentCategoryMeta.subtitle}</p>
              </div>
            </div>

            {/* Action Buttons: Discard & Save Changes */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleDiscard}
                disabled={saving || loading}
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 transition-colors shadow-2xs"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`mx-6 mt-4 p-3 rounded-lg flex items-center gap-2.5 text-xs font-medium ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <div className="flex-1">{feedback.message}</div>
              <button
                onClick={() => setFeedback(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Active Category Content Pane */}
          <div className="p-6 flex-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-500">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-xs">Loading institute configuration...</span>
              </div>
            ) : (
              <>
                {/* ─────────────────────────────────────────────────────────── */}
                {/* SECTION 1: INSTITUTE PROFILE & BRANDING                     */}
                {/* ─────────────────────────────────────────────────────────── */}
                {activeCategory === 'profile' && (
                  <div className="space-y-6">
                    {/* Sub-tab pills matching Screenshot */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
                      <button
                        type="button"
                        onClick={() => setProfileSubTab('basic')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                          profileSubTab === 'basic'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>Basic Details</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfileSubTab('address')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                          profileSubTab === 'address'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Address & Contact</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfileSubTab('branches')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                          profileSubTab === 'branches'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <GitFork className="w-3.5 h-3.5" />
                        <span>Branches</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfileSubTab('affiliations')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                          profileSubTab === 'affiliations'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Affiliations</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfileSubTab('compliance')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                          profileSubTab === 'compliance'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Legal & Compliance</span>
                      </button>
                    </div>

                    {profileSubTab === 'basic' && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Left Column (Inputs): 7 cols */}
                        <div className="lg:col-span-7 space-y-5">
                          {/* Basic Institute Details Card */}
                          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                            <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
                              <Building2 className="w-4 h-4 text-blue-600" />
                              <div>
                                <h3 className="text-sm font-bold text-gray-900">
                                  Basic Institute Details
                                </h3>
                                <p className="text-[11px] text-gray-500">
                                  Core identity details of your coaching institute
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Institute Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={profile.name}
                                  onChange={(e) => handleProfileChange('name', e.target.value)}
                                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Short Name / Abbreviation <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={profile.short_name}
                                  onChange={(e) => handleProfileChange('short_name', e.target.value)}
                                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 uppercase"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Institute Type <span className="text-rose-500">*</span>
                                </label>
                                <select
                                  value={profile.institute_type}
                                  onChange={(e) => handleProfileChange('institute_type', e.target.value)}
                                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                >
                                  <option value="Coaching Institute">Coaching Institute</option>
                                  <option value="Tuition Center">Tuition Center</option>
                                  <option value="School / Junior College">School / Junior College</option>
                                  <option value="Competitive Exam Academy">Competitive Exam Academy</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Establishment Year
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={profile.establishment_year}
                                    onChange={(e) =>
                                      handleProfileChange('establishment_year', parseInt(e.target.value) || 2018)
                                    }
                                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Registration / License No.
                                </label>
                                <input
                                  type="text"
                                  value={profile.registration_number}
                                  onChange={(e) => handleProfileChange('registration_number', e.target.value)}
                                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  PAN / Tax ID (Optional)
                                </label>
                                <input
                                  type="text"
                                  value={profile.tax_id}
                                  onChange={(e) => handleProfileChange('tax_id', e.target.value)}
                                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Tagline
                              </label>
                              <input
                                type="text"
                                value={profile.tagline}
                                onChange={(e) => handleProfileChange('tagline', e.target.value)}
                                placeholder="Learn • Practice • Achieve"
                                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-medium text-gray-700">
                                  Description (for documents & communication)
                                </label>
                                <span className="text-[10px] text-gray-400">
                                  {profile.description?.length || 0} / 250
                                </span>
                              </div>
                              <textarea
                                rows={3}
                                maxLength={250}
                                value={profile.description}
                                onChange={(e) => handleProfileChange('description', e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none text-gray-800"
                              />
                            </div>
                          </div>

                          {/* Status & Preferences Card */}
                          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                              <Sliders className="w-4 h-4 text-blue-600" />
                              <h3 className="text-sm font-bold text-gray-900">
                                Status & Preferences
                              </h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                              {/* Active Institute Toggle */}
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleProfileChange('is_active', !profile.is_active)}
                                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                                    profile.is_active ? 'bg-emerald-500' : 'bg-gray-300'
                                  }`}
                                >
                                  <div
                                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                      profile.is_active ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                                <div>
                                  <div className="text-xs font-semibold text-gray-900">Active Institute</div>
                                  <div className="text-[10px] text-gray-500">Enable to use this institute</div>
                                </div>
                              </div>

                              {/* Default Language */}
                              <div>
                                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                  Default Language
                                </label>
                                <select
                                  value={profile.default_language}
                                  onChange={(e) => handleProfileChange('default_language', e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                >
                                  <option value="en">English</option>
                                  <option value="hi">Hindi (हिंदी)</option>
                                  <option value="mr">Marathi (मराठी)</option>
                                </select>
                              </div>

                              {/* Timezone */}
                              <div>
                                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                  Timezone
                                </label>
                                <select
                                  value={profile.timezone}
                                  onChange={(e) => handleProfileChange('timezone', e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                >
                                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                  <option value="UTC">UTC (Coordinated)</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right Column (Branding Preview & Uploaders): 5 cols */}
                        <div className="lg:col-span-5 space-y-5">
                          {/* Live Branding Preview Card */}
                          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                              <Eye className="w-4 h-4 text-blue-600" />
                              <div>
                                <h3 className="text-sm font-bold text-gray-900">Branding Preview</h3>
                                <p className="text-[11px] text-gray-500">
                                  How your institute will appear in the application
                                </p>
                              </div>
                            </div>

                            {/* Dynamic Live Banner Card matching Screenshot */}
                            <div
                              style={{
                                background: `linear-gradient(135deg, ${profile.primary_color || '#1E40AF'} 0%, ${profile.secondary_color || '#3B82F6'} 100%)`,
                              }}
                              className="rounded-xl p-4 text-white shadow-md flex items-center gap-3.5 relative overflow-hidden"
                            >
                              {/* Background ambient lighting element */}
                              <div
                                style={{ backgroundColor: profile.accent_color || '#8B5CF6' }}
                                className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-30 blur-2xl pointer-events-none"
                              />

                              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-lg text-white border border-white/30 shadow-xs flex-shrink-0">
                                {profile.logo_url && profile.logo_url !== '/logo.svg' ? (
                                  <img
                                    src={profile.logo_url}
                                    alt="Logo preview"
                                    className="w-full h-full object-cover rounded-xl"
                                  />
                                ) : (
                                  profile.short_name || 'PA'
                                )}
                              </div>
                              <div className="min-w-0 flex-1 relative z-10">
                                <h4 className="font-bold text-sm tracking-tight truncate">
                                  {profile.name || 'PrathamOne Academy'}
                                </h4>
                                <p className="text-xs text-blue-100 font-medium truncate mt-0.5">
                                  {profile.tagline || 'Learn • Practice • Achieve'}
                                </p>
                              </div>
                            </div>

                            {/* Logo File Selector */}
                            <div className="pt-2 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div
                                  style={{ backgroundColor: profile.primary_color || '#1E40AF' }}
                                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-xs"
                                >
                                  {profile.short_name || 'PA'}
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-gray-900">Logo</div>
                                  <div className="text-[10px] text-gray-400">Recommended: 512 x 512 px</div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => logoInputRef.current?.click()}
                                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 shadow-2xs"
                              >
                                <Upload className="w-3.5 h-3.5 text-gray-500" />
                                <span>Change Logo</span>
                              </button>
                              <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/png, image/jpeg, image/svg+xml"
                                onChange={handleLogoUpload}
                                className="hidden"
                              />
                            </div>

                            {/* Favicon Selector */}
                            <div className="pt-2 flex items-center justify-between gap-3 border-t border-gray-100">
                              <div className="flex items-center gap-3">
                                <div
                                  style={{ backgroundColor: profile.secondary_color || '#3B82F6' }}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-xs"
                                >
                                  {profile.short_name || 'PA'}
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-gray-900">Favicon</div>
                                  <div className="text-[10px] text-gray-400">32 x 32 px (ICO/PNG)</div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => faviconInputRef.current?.click()}
                                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 shadow-2xs"
                              >
                                <Upload className="w-3.5 h-3.5 text-gray-500" />
                                <span>Change Favicon</span>
                              </button>
                              <input
                                ref={faviconInputRef}
                                type="file"
                                accept="image/png, image/x-icon, image/svg+xml"
                                onChange={handleFaviconUpload}
                                className="hidden"
                              />
                            </div>

                            {/* Color Pickers matching screenshot */}
                            <div className="pt-3 border-t border-gray-100 space-y-3">
                              {/* Primary Color */}
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-700">Primary Color</span>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={profile.primary_color || '#1E40AF'}
                                    onChange={(e) => handleProfileChange('primary_color', e.target.value)}
                                    className="w-7 h-7 rounded-md cursor-pointer border-0 p-0"
                                  />
                                  <input
                                    type="text"
                                    value={profile.primary_color || '#1E40AF'}
                                    onChange={(e) => handleProfileChange('primary_color', e.target.value)}
                                    className="w-24 px-2 py-1 text-xs font-mono uppercase border border-gray-300 rounded-md text-gray-800"
                                  />
                                </div>
                              </div>

                              {/* Secondary Color */}
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-700">Secondary Color</span>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={profile.secondary_color || '#3B82F6'}
                                    onChange={(e) => handleProfileChange('secondary_color', e.target.value)}
                                    className="w-7 h-7 rounded-md cursor-pointer border-0 p-0"
                                  />
                                  <input
                                    type="text"
                                    value={profile.secondary_color || '#3B82F6'}
                                    onChange={(e) => handleProfileChange('secondary_color', e.target.value)}
                                    className="w-24 px-2 py-1 text-xs font-mono uppercase border border-gray-300 rounded-md text-gray-800"
                                  />
                                </div>
                              </div>

                              {/* Accent Color */}
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-700">Accent Color</span>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={profile.accent_color || '#8B5CF6'}
                                    onChange={(e) => handleProfileChange('accent_color', e.target.value)}
                                    className="w-7 h-7 rounded-md cursor-pointer border-0 p-0"
                                  />
                                  <input
                                    type="text"
                                    value={profile.accent_color || '#8B5CF6'}
                                    onChange={(e) => handleProfileChange('accent_color', e.target.value)}
                                    className="w-24 px-2 py-1 text-xs font-mono uppercase border border-gray-300 rounded-md text-gray-800"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Informational Box */}
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-[11px] text-blue-900">
                              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                              <span>
                                These branding settings will be applied to the app header, login page, receipts, reports, and all official documents.
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Address & Contact Sub-tab */}
                    {profileSubTab === 'address' && (
                      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4 max-w-3xl">
                        <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <span>Campus Address & Public Contact Information</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Street / Campus Address
                            </label>
                            <input
                              type="text"
                              value={profile.address}
                              onChange={(e) => handleProfileChange('address', e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                            <input
                              type="text"
                              value={profile.city}
                              onChange={(e) => handleProfileChange('city', e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
                            <input
                              type="text"
                              value={profile.state}
                              onChange={(e) => handleProfileChange('state', e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Pincode</label>
                            <input
                              type="text"
                              value={profile.pincode}
                              onChange={(e) => handleProfileChange('pincode', e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Contact Phone</label>
                            <input
                              type="text"
                              value={profile.phone}
                              onChange={(e) => handleProfileChange('phone', e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Official Email</label>
                            <input
                              type="email"
                              value={profile.email}
                              onChange={(e) => handleProfileChange('email', e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Website URL</label>
                            <input
                              type="text"
                              value={profile.website}
                              onChange={(e) => handleProfileChange('website', e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Branches Sub-tab */}
                    {profileSubTab === 'branches' && (
                      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4 max-w-3xl">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <GitFork className="w-4 h-4 text-blue-600" />
                            <span>Campus Centers & Branches</span>
                          </h3>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-gray-900">
                              {profile.name} - Main Campus
                            </div>
                            <div className="text-[11px] text-gray-500">
                              Code: <span className="font-mono">{profile.short_name}-MAIN</span> • {profile.address}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            Primary Headquarters
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Affiliations Sub-tab */}
                    {profileSubTab === 'affiliations' && (
                      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4 max-w-3xl">
                        <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-blue-600" />
                          <span>Educational Boards & Accreditations</span>
                        </h3>
                        <p className="text-xs text-gray-600">
                          PrathamOne Academy supports multi-board coaching curriculums:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-3 border border-blue-200 bg-blue-50 rounded-lg">
                            <div className="text-xs font-bold text-blue-900">CBSE Curriculum</div>
                            <div className="text-[11px] text-blue-700">Central Board of Secondary Education</div>
                          </div>
                          <div className="p-3 border border-indigo-200 bg-indigo-50 rounded-lg">
                            <div className="text-xs font-bold text-indigo-900">ICSE Curriculum</div>
                            <div className="text-[11px] text-indigo-700">Council for the Indian School Certificate</div>
                          </div>
                          <div className="p-3 border border-emerald-200 bg-emerald-50 rounded-lg">
                            <div className="text-xs font-bold text-emerald-900">State Board (MH)</div>
                            <div className="text-[11px] text-emerald-700">Maharashtra State Secondary Board</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Legal & Compliance Sub-tab */}
                    {profileSubTab === 'compliance' && (
                      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4 max-w-3xl">
                        <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span>Legal, DPDP & Regulatory Compliance</span>
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              GST Registration Number (GSTIN)
                            </label>
                            <input
                              type="text"
                              value="27AABCP1234K1Z5"
                              readOnly
                              className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg text-gray-700 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Digital Personal Data Protection (DPDP) Act Compliance Notice
                            </label>
                            <textarea
                              rows={3}
                              readOnly
                              value="Personal data collected is utilized solely for academic instruction, student performance records, attendance auditing, and financial accounting under DPDP rules."
                              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-lg text-gray-700 resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────── */}
                {/* SECTION 2: BRANDING & APPEARANCE                            */}
                {/* ─────────────────────────────────────────────────────────── */}
                {activeCategory === 'branding' && (
                  <div className="space-y-6 max-w-4xl">
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                      <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                        <Palette className="w-4 h-4 text-blue-600" />
                        <span>Theme Presets & Typography</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { name: 'Royal Blue & Indigo', primary: '#1E40AF', secondary: '#3B82F6', accent: '#8B5CF6' },
                          { name: 'Emerald Forest', primary: '#065F46', secondary: '#10B981', accent: '#059669' },
                          { name: 'Midnight Slate', primary: '#0F172A', secondary: '#38BDF8', accent: '#6366F1' },
                          { name: 'Imperial Crimson', primary: '#881337', secondary: '#F43F5E', accent: '#FB7185' },
                        ].map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => {
                              handleProfileChange('primary_color', preset.primary)
                              handleProfileChange('secondary_color', preset.secondary)
                              handleProfileChange('accent_color', preset.accent)
                              showNotification('success', `Preset "${preset.name}" applied. Click Save Changes to commit.`)
                            }}
                            className="p-3 border border-gray-200 rounded-xl text-left hover:border-blue-500 hover:shadow-xs transition-all"
                          >
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.primary }} />
                              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.secondary }} />
                              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.accent }} />
                            </div>
                            <div className="text-xs font-bold text-gray-900">{preset.name}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────── */}
                {/* SECTION 3: ACADEMIC CONFIGURATION                           */}
                {/* ─────────────────────────────────────────────────────────── */}
                {activeCategory === 'academic' && (
                  <div className="space-y-6 max-w-4xl">
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                      <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-blue-600" />
                        <span>Academic Session & Batch Management Defaults</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Default Academic Year
                          </label>
                          <input
                            type="text"
                            value={allSettings.academic?.default_academic_year || '2026-27'}
                            onChange={(e) => handleSettingChange('academic', 'default_academic_year', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Term Structure
                          </label>
                          <select
                            value={allSettings.academic?.term_structure || 'Quarterly'}
                            onChange={(e) => handleSettingChange('academic', 'term_structure', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                          >
                            <option value="Quarterly">Quarterly (4 Terms)</option>
                            <option value="Trimester">Trimester (3 Terms)</option>
                            <option value="Semester">Semester (2 Terms)</option>
                            <option value="Annual">Annual (1 Session)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Standard Naming Convention
                          </label>
                          <select
                            value={allSettings.academic?.standard_naming || 'Roman'}
                            onChange={(e) => handleSettingChange('academic', 'standard_naming', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                          >
                            <option value="Roman">Roman (VIII, IX, X, XI, XII)</option>
                            <option value="Numeric">Numeric (8th, 9th, 10th)</option>
                            <option value="Grade">Grade (Grade 8, Grade 9)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Timetable Slot Duration (Minutes)
                          </label>
                          <input
                            type="number"
                            value={allSettings.academic?.timetable_slot_duration || 45}
                            onChange={(e) => handleSettingChange('academic', 'timetable_slot_duration', parseInt(e.target.value) || 45)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Batch Capacity Warning Threshold
                          </label>
                          <input
                            type="number"
                            value={allSettings.academic?.batch_capacity_warning || 40}
                            onChange={(e) => handleSettingChange('academic', 'batch_capacity_warning', parseInt(e.target.value) || 40)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────── */}
                {/* SECTION 4: STUDENT & ADMISSION SETTINGS                     */}
                {/* ─────────────────────────────────────────────────────────── */}
                {activeCategory === 'admission' && (
                  <div className="space-y-6 max-w-4xl">
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                      <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        <span>Admission Numbering & Student Policies</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Admission Number Prefix
                          </label>
                          <input
                            type="text"
                            value={allSettings.admission?.admission_prefix || 'PA'}
                            onChange={(e) => handleSettingChange('admission', 'admission_prefix', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg uppercase"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Next Admission Sequence Number
                          </label>
                          <input
                            type="number"
                            value={allSettings.admission?.next_admission_number || 43}
                            onChange={(e) => handleSettingChange('admission', 'next_admission_number', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Sibling Discount Percentage (%)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={allSettings.admission?.sibling_discount_pct || 10.0}
                            onChange={(e) => handleSettingChange('admission', 'sibling_discount_pct', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Minimum Admission Age (Years)
                          </label>
                          <input
                            type="number"
                            value={allSettings.admission?.min_admission_age || 5}
                            onChange={(e) => handleSettingChange('admission', 'min_admission_age', parseInt(e.target.value) || 5)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Student Status & Operational Visibility Configuration */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                      <div className="border-b border-gray-100 pb-2">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <Eye className="w-4 h-4 text-blue-600" />
                          <span>Student Status & Operational Visibility</span>
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Configure institute-level default visibility rules for inactive, withdrawn, completed, and graduated students.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {/* 1. Dashboard Student Visibility */}
                        <div className="space-y-1.5 p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl">
                          <label className="block text-xs font-bold text-gray-900">
                            Dashboard Visibility
                          </label>
                          <p className="text-[11px] text-gray-500 leading-tight mb-2">
                            Controls whether executive dashboard KPI metrics show only active students or include all statuses.
                          </p>
                          <select
                            data-testid="setting-student-visibility-dashboard"
                            value={allSettings.admission?.student_visibility_dashboard || 'active_only'}
                            onChange={(e) => handleSettingChange('admission', 'student_visibility_dashboard', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium text-gray-800 focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="active_only">Active students only (default)</option>
                            <option value="include_all">Include all student statuses</option>
                          </select>
                        </div>

                        {/* 2. Reports Student Visibility */}
                        <div className="space-y-1.5 p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl">
                          <label className="block text-xs font-bold text-gray-900">
                            Reports Visibility
                          </label>
                          <p className="text-[11px] text-gray-500 leading-tight mb-2">
                            Controls whether financial and academic reports default to including all statuses or active only.
                          </p>
                          <select
                            data-testid="setting-student-visibility-reports"
                            value={allSettings.admission?.student_visibility_reports || 'include_all'}
                            onChange={(e) => handleSettingChange('admission', 'student_visibility_reports', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium text-gray-800 focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="include_all">Include all statuses by default</option>
                            <option value="active_only">Active students only by default</option>
                          </select>
                        </div>

                        {/* 3. Student Lists Visibility */}
                        <div className="space-y-1.5 p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl">
                          <label className="block text-xs font-bold text-gray-900">
                            Student Lists Visibility
                          </label>
                          <p className="text-[11px] text-gray-500 leading-tight mb-2">
                            Controls whether student directories and batch roster views load active students only or all students by default.
                          </p>
                          <select
                            data-testid="setting-student-visibility-lists"
                            value={allSettings.admission?.student_visibility_lists || 'active_only'}
                            onChange={(e) => handleSettingChange('admission', 'student_visibility_lists', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium text-gray-800 focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="active_only">Show active students by default</option>
                            <option value="include_all">Show all students by default</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────── */}
                {/* SECTION 5: STAFF & HR SETTINGS                              */}
                {/* ─────────────────────────────────────────────────────────── */}
                {activeCategory === 'staff' && (
                  <div className="space-y-6 max-w-4xl">
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                      <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span>Staff Member ID & Leave Policies</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Employee ID Prefix
                          </label>
                          <input
                            type="text"
                            value={allSettings.staff?.employee_id_prefix || 'EMP'}
                            onChange={(e) => handleSettingChange('staff', 'employee_id_prefix', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg uppercase"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Next Employee Number
                          </label>
                          <input
                            type="number"
                            value={allSettings.staff?.next_employee_number || 101}
                            onChange={(e) => handleSettingChange('staff', 'next_employee_number', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Annual Casual Leave Quota (Days)
                          </label>
                          <input
                            type="number"
                            value={allSettings.staff?.annual_casual_leave || 12}
                            onChange={(e) => handleSettingChange('staff', 'annual_casual_leave', parseInt(e.target.value) || 12)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Annual Sick Leave Quota (Days)
                          </label>
                          <input
                            type="number"
                            value={allSettings.staff?.annual_sick_leave || 8}
                            onChange={(e) => handleSettingChange('staff', 'annual_sick_leave', parseInt(e.target.value) || 8)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────── */}
                {/* SECTION 6: FEES & FINANCE SETTINGS                          */}
                {/* ─────────────────────────────────────────────────────────── */}
                {activeCategory === 'fees' && (
                  <div className="space-y-6 max-w-4xl">
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                      <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        <span>Fee Receipt Numbering & Monetary Settings</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Receipt Prefix
                          </label>
                          <input
                            type="text"
                            value={allSettings.fees?.receipt_prefix || 'RCP'}
                            onChange={(e) => handleSettingChange('fees', 'receipt_prefix', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg uppercase"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Next Receipt Sequence Number
                          </label>
                          <input
                            type="number"
                            value={allSettings.fees?.next_receipt_number || 168}
                            onChange={(e) => handleSettingChange('fees', 'next_receipt_number', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Currency Symbol
                          </label>
                          <input
                            type="text"
                            value={allSettings.fees?.currency_symbol || '₹'}
                            onChange={(e) => handleSettingChange('fees', 'currency_symbol', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Payment Grace Days
                          </label>
                          <input
                            type="number"
                            value={allSettings.fees?.grace_period_days || 7}
                            onChange={(e) => handleSettingChange('fees', 'grace_period_days', parseInt(e.target.value) || 7)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────── */}
                {/* SECTION 7: ATTENDANCE SETTINGS                              */}
                {/* ─────────────────────────────────────────────────────────── */}
                {activeCategory === 'attendance' && (
                  <div className="space-y-6 max-w-4xl">
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                      <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                        <CalendarCheck className="w-4 h-4 text-blue-600" />
                        <span>Daily & Batch Attendance Rules</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Attendance Tracking Mode
                          </label>
                          <select
                            value={allSettings.attendance?.tracking_mode || 'Daily'}
                            onChange={(e) => handleSettingChange('attendance', 'tracking_mode', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                          >
                            <option value="Daily">Daily Once</option>
                            <option value="BatchWise">Batch / Session Wise</option>
                            <option value="SubjectWise">Subject Wise</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Grace Time for Late Arrival (Minutes)
                          </label>
                          <input
                            type="number"
                            value={allSettings.attendance?.grace_minutes || 15}
                            onChange={(e) => handleSettingChange('attendance', 'grace_minutes', parseInt(e.target.value) || 15)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────── */}
                {/* SECTION 8: EXAMINATION SETTINGS                             */}
                {/* ─────────────────────────────────────────────────────────── */}
                {activeCategory === 'examination' && (
                  <div className="space-y-6 max-w-4xl">
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                      <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                        <Award className="w-4 h-4 text-blue-600" />
                        <span>Exam Grading & Report Card Evaluation</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Default Grading Scale
                          </label>
                          <select
                            value={allSettings.examination?.grading_scale || 'CBSE_9_POINT'}
                            onChange={(e) => handleSettingChange('examination', 'grading_scale', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                          >
                            <option value="CBSE_9_POINT">CBSE 9-Point Scale (A1 to E2)</option>
                            <option value="PERCENTAGE">Percentage Based</option>
                            <option value="CGPA_10">10-Point CGPA</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Passing Threshold Percentage (%)
                          </label>
                          <input
                            type="number"
                            value={allSettings.examination?.passing_threshold_pct || 35.0}
                            onChange={(e) => handleSettingChange('examination', 'passing_threshold_pct', parseFloat(e.target.value) || 35)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────── */}
                {/* SECTION 9: COMMUNICATION SETTINGS                           */}
                {/* ─────────────────────────────────────────────────────────── */}
                {activeCategory === 'communication' && (
                  <div className="space-y-6 max-w-4xl">
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                      <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        <span>Automated Messaging & SMS / WhatsApp Gateways</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Default WhatsApp Gateway
                          </label>
                          <input
                            type="text"
                            value="Meta Cloud API (Official)"
                            readOnly
                            className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg text-gray-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            SMS Sender Header (DLT Registered)
                          </label>
                          <input
                            type="text"
                            value="PRATHM"
                            readOnly
                            className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg text-gray-600 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────── */}
                {/* SECTION 10: DOCUMENTS & PRINT SETTINGS                      */}
                {/* ─────────────────────────────────────────────────────────── */}
                {activeCategory === 'documents' && (
                  <div className="space-y-6 max-w-4xl">
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                      <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                        <Printer className="w-4 h-4 text-blue-600" />
                        <span>Document Paper Sizes, Signatures & Receipt Layout</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Default Fee Receipt Paper Size
                          </label>
                          <select
                            value={allSettings.documents?.default_receipt_paper_size || 'A5_PORTRAIT'}
                            onChange={(e) => handleSettingChange('documents', 'default_receipt_paper_size', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                          >
                            <option value="A5_PORTRAIT">A5 Portrait (148 × 210 mm) - Compact Official (Recommended)</option>
                            <option value="A4_PORTRAIT">A4 Portrait (210 × 297 mm) - Full Sheet</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Authorized Signatory Designation
                          </label>
                          <input
                            type="text"
                            value={allSettings.documents?.signatory_designation || 'Authorized Signatory PrathamOne Academy'}
                            onChange={(e) => handleSettingChange('documents', 'signatory_designation', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Computer-Generated Disclaimer Text
                          </label>
                          <input
                            type="text"
                            value={allSettings.documents?.disclaimer_text || 'This is a computer-generated receipt and does not require a physical signature. For any queries, contact the academy office.'}
                            onChange={(e) => handleSettingChange('documents', 'disclaimer_text', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                    {/* AITDL Parent Organization & Product Ecosystem */}
                    <OrganizationBranding variant="card" />
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────── */}
                {/* SECTION 11: GENERAL LOOKUPS MANAGEMENT                      */}
                {/* ─────────────────────────────────────────────────────────── */}
                {activeCategory === 'lookups' && (
                  <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                      {/* Filter & Add Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-3 flex-wrap">
                          <select
                            value={selectedLookupCategory}
                            onChange={(e) => setSelectedLookupCategory(e.target.value)}
                            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                          >
                            <option value="ALL">All Categories ({lookups.length})</option>
                            {lookupCategories.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>

                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={lookupSearch}
                              onChange={(e) => setLookupSearch(e.target.value)}
                              placeholder="Search code or label..."
                              className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleOpenAddLookup}
                          className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add New Lookup</span>
                        </button>
                      </div>

                      {/* Lookups Table */}
                      <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                              <th className="px-4 py-2.5">Category</th>
                              <th className="px-4 py-2.5">Code</th>
                              <th className="px-4 py-2.5">Label</th>
                              <th className="px-4 py-2.5">Description</th>
                              <th className="px-4 py-2.5 text-center">Sort</th>
                              <th className="px-4 py-2.5 text-center">Status</th>
                              <th className="px-4 py-2.5 text-center">System</th>
                              <th className="px-4 py-2.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredLookups.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2.5 font-medium text-gray-600">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-700">
                                    {item.category}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 font-mono font-bold text-blue-900">
                                  {item.code}
                                </td>
                                <td className="px-4 py-2.5 font-semibold text-gray-900">
                                  {item.label}
                                </td>
                                <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate">
                                  {item.description || '—'}
                                </td>
                                <td className="px-4 py-2.5 text-center text-gray-600">
                                  {item.sort_order}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                      item.is_active
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-gray-100 text-gray-500'
                                    }`}
                                  >
                                    {item.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  {item.is_system ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                      Core
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-gray-400">Custom</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-right space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditLookup(item)}
                                    className="p-1 text-gray-500 hover:text-blue-600 rounded transition-colors"
                                    title="Edit lookup"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLookup(item)}
                                    className="p-1 text-gray-500 hover:text-rose-600 rounded transition-colors"
                                    title={item.is_system ? 'Deactivate system lookup' : 'Delete lookup'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {filteredLookups.length === 0 && (
                              <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-xs">
                                  No lookups found in this view.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────── */}
                {/* SECTION 12: SYSTEM PARAMETERS                               */}
                {/* ─────────────────────────────────────────────────────────── */}
                {activeCategory === 'system' && (
                  <div className="space-y-6 max-w-4xl">
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                      <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                        <span>System Regional & Feature Defaults</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Date Format
                          </label>
                          <input
                            type="text"
                            value="DD/MM/YYYY"
                            readOnly
                            className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg text-gray-700"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Numbering Convention
                          </label>
                          <input
                            type="text"
                            value="Indian Lakhs & Crores (e.g., ₹ 90,000)"
                            readOnly
                            className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg text-gray-700"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────── */}
                {/* SECTION 13: USERS & PERMISSIONS                             */}
                {/* ─────────────────────────────────────────────────────────── */}
                {activeCategory === 'permissions' && (
                  <div className="space-y-6 max-w-4xl">
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                      <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-600" />
                        <span>Role-Based Access Control Matrices</span>
                      </h3>
                      <p className="text-xs text-gray-600">
                        Centralized privilege matrices enforcing administrative governance across all coaching operations:
                      </p>
                      <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-2 font-semibold text-gray-700">Role</th>
                              <th className="px-4 py-2 font-semibold text-gray-700">Scope</th>
                              <th className="px-4 py-2 font-semibold text-gray-700">Universal Edit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            <tr>
                              <td className="px-4 py-2 font-bold text-blue-900">sysadmin</td>
                              <td className="px-4 py-2 text-gray-700">Global Full Enterprise Superuser</td>
                              <td className="px-4 py-2 text-emerald-600 font-semibold">Enabled</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2 font-bold text-indigo-900">admin / principal</td>
                              <td className="px-4 py-2 text-gray-700">Institution Leadership & Settings</td>
                              <td className="px-4 py-2 text-emerald-600 font-semibold">Enabled</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2 font-bold text-gray-800">teacher / faculty</td>
                              <td className="px-4 py-2 text-gray-700">Assigned Batches, Marks & Attendance</td>
                              <td className="px-4 py-2 text-gray-400">Scoped</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2 font-bold text-gray-800">accountant</td>
                              <td className="px-4 py-2 text-gray-700">Fees, Payment Invoices & Receipts</td>
                              <td className="px-4 py-2 text-gray-400">Scoped</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────── */}
                {/* SECTION 14: INTEGRATIONS                                    */}
                {/* ─────────────────────────────────────────────────────────── */}
                {activeCategory === 'integrations' && (
                  <div className="space-y-6 max-w-4xl">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-gray-900">Razorpay Payments</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Automated online UPI, debit/credit cards, and net-banking settlement for student fees.
                        </p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-gray-900">Biometric Devices</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                            Configured
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Real-time biometric attendance integration for students and teaching faculty.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────── */}
                {/* SECTION 15: DATA & MAINTENANCE                              */}
                {/* ─────────────────────────────────────────────────────────── */}
                {activeCategory === 'maintenance' && (
                  <div className="space-y-6">
                    {/* Maintenance Quick Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-3">
                        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <Download className="w-4 h-4 text-blue-600" />
                          <span>Backup Configuration Snapshot</span>
                        </h4>
                        <p className="text-xs text-gray-500">
                          Download a portable JSON archive of your institute profile, custom branding, settings, and general lookups.
                        </p>
                        <button
                          type="button"
                          onClick={handleDownloadSnapshot}
                          className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 shadow-2xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Snapshot</span>
                        </button>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-3">
                        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <RotateCcw className="w-4 h-4 text-rose-600" />
                          <span>Reset Section Defaults</span>
                        </h4>
                        <p className="text-xs text-gray-500">
                          Restore factory settings baseline for any operational category. Custom values will be cleared.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleResetDefaults('academic')}
                          className="px-3.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg flex items-center gap-1.5 shadow-2xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Academic Defaults</span>
                        </button>
                      </div>
                    </div>

                    {/* Audit Logs Trail */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                      <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                        <Database className="w-4 h-4 text-blue-600" />
                        <span>Settings Configuration Audit Trail</span>
                      </h4>
                      <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                              <th className="px-4 py-2.5">Date / Time</th>
                              <th className="px-4 py-2.5">Category</th>
                              <th className="px-4 py-2.5">Setting Key</th>
                              <th className="px-4 py-2.5">Changed By</th>
                              <th className="px-4 py-2.5">Reason</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {auditLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2.5 font-mono text-gray-500">
                                  {new Date(log.created_at).toLocaleString()}
                                </td>
                                <td className="px-4 py-2.5 font-semibold text-blue-900">
                                  {log.category}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-gray-800">
                                  {log.setting_key}
                                </td>
                                <td className="px-4 py-2.5 text-gray-700">
                                  {log.changed_by_name || 'System Admin'}
                                </td>
                                <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate">
                                  {log.reason || 'Settings workspace modification'}
                                </td>
                              </tr>
                            ))}
                            {auditLogs.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-xs">
                                  No audit logs recorded yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Lookup Item Modal */}
      {isLookupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">
                {editingLookup ? 'Edit Lookup Item' : 'Add New Lookup Item'}
              </h3>
              <button
                onClick={() => setIsLookupModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLookup} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingLookup}
                  value={lookupForm.category}
                  onChange={(e) => setLookupForm({ ...lookupForm, category: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg uppercase disabled:bg-gray-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Lookup Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingLookup}
                  value={lookupForm.code}
                  onChange={(e) => setLookupForm({ ...lookupForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. UPI_DIRECT"
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg uppercase disabled:bg-gray-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Display Label <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lookupForm.label}
                  onChange={(e) => setLookupForm({ ...lookupForm, label: e.target.value })}
                  placeholder="e.g. UPI Direct Payment"
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={lookupForm.description}
                  onChange={(e) => setLookupForm({ ...lookupForm, description: e.target.value })}
                  placeholder="Optional explanatory note"
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={lookupForm.sort_order}
                    onChange={(e) => setLookupForm({ ...lookupForm, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="pt-5 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active_toggle"
                    checked={lookupForm.is_active}
                    onChange={(e) => setLookupForm({ ...lookupForm, is_active: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_active_toggle" className="text-xs font-medium text-gray-700">
                    Active Status
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsLookupModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors"
                >
                  {editingLookup ? 'Update Lookup' : 'Create Lookup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

