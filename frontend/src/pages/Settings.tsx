/**
 * @file        Settings.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pages
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-05
 * @updated     2026-11-28
 *
 * @description Comprehensive Institute Settings & Configuration Workspace for branding, defaults, lookups, and governance.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Building2, Palette, GraduationCap, UserCheck, Users, CreditCard,
  CalendarCheck, Award, MessageSquare, Printer, Sliders, SlidersHorizontal,
  Shield, Link2, Database, Save, RotateCcw, Search, Eye, Upload,
  Check, AlertCircle, Info, Plus, Edit, Trash2, CheckCircle2, ChevronRight,
  X, ExternalLink, RefreshCw, Lock, Bell, HelpCircle, FileText, MapPin,
  GitFork, ShieldCheck, Download, KeyRound, Sparkles, Compass,
  Monitor, Globe, AppWindow
} from 'lucide-react'
import NavigationSettingsPanel from '../components/settings/NavigationSettingsPanel'
import DeviceBindingSettingsPanel from '../components/settings/DeviceBindingSettingsPanel'
import { settingsApi, institutionsApi } from '../api/endpoints'
import type {
  InstituteProfile, InstitutionBranch, LookupItem, LookupsResponse, SettingAuditLogItem, AllSettingsState
} from '../types'
import {
  INDIAN_STATES_AND_UTS,
  INSTITUTE_PLACEHOLDERS,
  readAndValidateLogoFile,
  validateProfileFields,
} from '../utils/institutionValidation'
import { useAuthStore, isUserSysAdmin } from '../store/authStore'
import { downloadBlob } from '../utils/reportExport'
import { extractApiErrorMessage, formatApiErrorDetail } from '../utils/errorTaxonomy'
import { useEditModeStore } from '../store/editModeStore'
import { EditModeBar, LockedButton, LockedIconButton, ContextualHelpButton } from '../components/common'
import {
  BRANDING_CONFIG,
  normalizeInstitutionFaviconUrl,
  useBranding,
  applyGlobalBrandTheme,
  BRANDING_STORAGE_KEY,
} from '../config/branding'
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
  { id: 'navigation', title: 'Navigation & Menu Governance', subtitle: 'Personalization rules, modes & role menus', icon: Compass, group: 'system' },
  { id: 'lookups', title: 'General Lookups', subtitle: 'Dropdown values, categories & reference lists', icon: Sliders, group: 'system' },
  { id: 'system', title: 'System Parameters', subtitle: 'Numbering, defaults, policies & feature flags', icon: SlidersHorizontal, group: 'system' },
  { id: 'permissions', title: 'Users & Permissions', subtitle: 'Roles, access rights & security', icon: Shield, group: 'system' },
  { id: 'security', title: 'Security & Device Binding', subtitle: 'Authentication policies, device verification & access control', icon: ShieldCheck, group: 'system' },
  { id: 'integrations', title: 'Integrations', subtitle: 'Payment, messaging & external services', icon: Link2, group: 'system' },
  { id: 'codex', title: 'CodeX Configuration Studio', subtitle: 'Numeric coding, value obfuscation & scope activation', icon: KeyRound, group: 'system' },
  { id: 'maintenance', title: 'Data & Maintenance', subtitle: 'Import, export, backup & audit logs', icon: Database, group: 'system' },
]

export default function Settings() {
  const { user } = useAuthStore()
  const branding = useBranding()
  const queryClient = useQueryClient()
  const isSysAdmin = isUserSysAdmin(user)

  // Global View-First & Scoped Edit Mode Governance
  const editScope = 'sysadmin:settings'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])

  // Navigation & Category Search
  const [searchParams] = useSearchParams()
  const [activeCategory, setActiveCategory] = useState<string>(() => {
    const qCat = searchParams.get('category') || searchParams.get('tab')
    return qCat && SETTINGS_CATEGORIES.some((c) => c.id === qCat) ? qCat : 'profile'
  })
  const [categorySearch, setCategorySearch] = useState<string>('')
  const [globalSearch, setGlobalSearch] = useState<string>('')

  useEffect(() => {
    const qCat = searchParams.get('category') || searchParams.get('tab')
    if (qCat && SETTINGS_CATEGORIES.some((c) => c.id === qCat)) {
      setActiveCategory(qCat)
    }
  }, [searchParams])

  // Sub-tabs for Institute Profile
  const [profileSubTab, setProfileSubTab] = useState<'basic' | 'address' | 'branches' | 'affiliations' | 'compliance'>('basic')

  // Loading & State
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Profile Form State (neutral initial values; populated dynamically from server)
  const [profile, setProfile] = useState<InstituteProfile>({
    id: 1,
    name: '',
    code: '',
    short_name: '',
    branch_name: '',
    branches: [],
    tagline: '',
    institute_type: 'Coaching Institute',
    establishment_year: null,
    registration_number: '',
    tax_id: '',
    gstin: '',
    pan: '',
    description: '',
    is_active: true,
    default_language: 'en',
    timezone: 'Asia/Kolkata',
    address: '',
    address_line_1: '',
    address_line_2: '',
    area_locality: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    country: 'India',
    phone: '',
    alternate_phone: '',
    email: '',
    website: '',
    logo_url: '',
    favicon_url: BRANDING_CONFIG.assets.faviconUrl,
    primary_color: '#0B2D6B',
    secondary_color: '#071C44',
    accent_color: '#F16906',
  })
  const [originalProfile, setOriginalProfile] = useState<InstituteProfile | null>(null)
  const [branches, setBranches] = useState<InstitutionBranch[]>([])
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<InstitutionBranch | null>(null)
  const [branchSaving, setBranchSaving] = useState(false)
  const [branchForm, setBranchForm] = useState({
    branch_name: '',
    branch_code: '',
    is_main_branch: false,
    address_line_1: '',
    address_line_2: '',
    area_locality: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    country: 'India',
    phone: '',
    alternate_phone: '',
    email: '',
    gstin: '',
  })

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

  // Initial Data Load (Ultra-fast parallel fetch without unnecessary audit payload)
  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [profRes, setRes, lkpRes] = await Promise.all([
        settingsApi.getProfile(),
        settingsApi.getAll(),
        settingsApi.getLookups(),
      ])

      const profileData: InstituteProfile = {
        ...profRes.data,
        name: profRes.data.name || '',
        short_name: profRes.data.short_name || '',
        branch_name: profRes.data.branch_name || '',
        tagline: profRes.data.tagline || '',
        institute_type: profRes.data.institute_type || 'Coaching Institute',
        registration_number: profRes.data.registration_number || '',
        tax_id: profRes.data.tax_id || '',
        gstin: profRes.data.gstin || '',
        pan: profRes.data.pan || '',
        description: profRes.data.description || '',
        address: profRes.data.address || '',
        address_line_1: profRes.data.address_line_1 || profRes.data.address || '',
        address_line_2: profRes.data.address_line_2 || '',
        area_locality: profRes.data.area_locality || '',
        city: profRes.data.city || '',
        district: profRes.data.district || '',
        state: profRes.data.state || '',
        pincode: profRes.data.pincode || '',
        country: profRes.data.country || 'India',
        phone: profRes.data.phone || '',
        alternate_phone: profRes.data.alternate_phone || '',
        email: profRes.data.email || '',
        website: profRes.data.website || '',
        logo_url: profRes.data.logo_url || '',
        favicon_url: normalizeInstitutionFaviconUrl(profRes.data.favicon_url),
      }
      setProfile(profileData)
      setOriginalProfile(profileData)
      setBranches(Array.isArray(profRes.data.branches) ? profRes.data.branches : [])

      setAllSettings(setRes.data)
      setOriginalSettings(setRes.data)

      setLookups(lkpRes.data.items || [])
      setLookupCategories(lkpRes.data.categories || [])
    } catch (err: any) {
      console.error('Failed to load institute settings:', err)
      showNotification('error', 'Failed to load institute settings. Using system baseline defaults.')
    } finally {
      setLoading(false)
    }
  }

  // Lazy-load audit logs only when maintenance tab is active
  useEffect(() => {
    if (activeCategory === 'maintenance' && auditLogs.length === 0) {
      settingsApi.getAuditLogs({ limit: 50 }).then((res) => {
        setAuditLogs(res.data || [])
      }).catch((e) => console.error('Failed to load audit logs:', e))
    }
  }, [activeCategory, auditLogs.length])

  const originalProfileRef = useRef<InstituteProfile | null>(null)
  useEffect(() => {
    originalProfileRef.current = originalProfile
  }, [originalProfile])

  // Revert preview theme on unmount if user navigates away with unsaved preview changes
  useEffect(() => {
    return () => {
      if (originalProfileRef.current) {
        applyGlobalBrandTheme({
          primary: originalProfileRef.current.primary_color || '#0B2D6B',
          secondary: originalProfileRef.current.secondary_color || '#071C44',
          accent: originalProfileRef.current.accent_color || '#F16906',
        }, originalProfileRef.current.logo_url || undefined)
      }
    }
  }, [])

  useEffect(() => {
    fetchAllData()
  }, [])

  const showNotification = (type: 'success' | 'error', message: unknown) => {
    setFeedback({ type, message: formatApiErrorDetail(message, 'Operation completed.') })
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
    setProfile((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'primary_color' || field === 'secondary_color' || field === 'accent_color') {
        applyGlobalBrandTheme({
          primary: next.primary_color || '#0B2D6B',
          secondary: next.secondary_color || '#071C44',
          accent: next.accent_color || '#F16906',
        }, next.logo_url || undefined)
      }
      return next
    })
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
    if (activeCategory === 'profile' || activeCategory === 'branding') {
      if (originalProfile) {
        setProfile(originalProfile)
        applyGlobalBrandTheme({
          primary: originalProfile.primary_color || '#0B2D6B',
          secondary: originalProfile.secondary_color || '#071C44',
          accent: originalProfile.accent_color || '#F16906',
        }, originalProfile.logo_url || undefined)
      }
    }
    if (originalSettings[activeCategory]) {
      setAllSettings((prev) => ({
        ...prev,
        [activeCategory]: { ...originalSettings[activeCategory] },
      }))
    }
    showNotification('success', 'Changes discarded. Restored saved configuration.')
  }

  // Save Changes for Active Category
  const handleSave = async () => {
    try {
      setSaving(true)
      if (activeCategory === 'profile' || activeCategory === 'branding') {
        const validationErr = validateProfileFields(profile, { requireNonPlaceholderName: true })
        if (validationErr) {
          showNotification('error', validationErr)
          setSaving(false)
          return
        }
        const payload = {
          ...profile,
          onboarding_completed: true,
        }
        const res = await settingsApi.updateProfile(payload)
        const profileData: InstituteProfile = {
          ...res.data.profile,
          name: res.data.profile.name || '',
          short_name: res.data.profile.short_name || '',
          branch_name: res.data.profile.branch_name || '',
          tagline: res.data.profile.tagline || '',
          institute_type: res.data.profile.institute_type || 'Coaching Institute',
          registration_number: res.data.profile.registration_number || '',
          tax_id: res.data.profile.tax_id || '',
          gstin: res.data.profile.gstin || '',
          pan: res.data.profile.pan || '',
          description: res.data.profile.description || '',
          address: res.data.profile.address || '',
          address_line_1: res.data.profile.address_line_1 || res.data.profile.address || '',
          address_line_2: res.data.profile.address_line_2 || '',
          area_locality: res.data.profile.area_locality || '',
          city: res.data.profile.city || '',
          district: res.data.profile.district || '',
          state: res.data.profile.state || '',
          pincode: res.data.profile.pincode || '',
          country: res.data.profile.country || 'India',
          phone: res.data.profile.phone || '',
          alternate_phone: res.data.profile.alternate_phone || '',
          email: res.data.profile.email || '',
          website: res.data.profile.website || '',
          logo_url: res.data.profile.logo_url || '',
          favicon_url: normalizeInstitutionFaviconUrl(res.data.profile.favicon_url),
        }
        setProfile(profileData)
        setOriginalProfile(profileData)
        if (Array.isArray(res.data.profile.branches)) {
          setBranches(res.data.profile.branches)
        }
        if (activeCategory === 'branding') {
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
        }
        applyGlobalBrandTheme({
          primary: res.data.profile.primary_color || '#0B2D6B',
          secondary: res.data.profile.secondary_color || '#071C44',
          accent: res.data.profile.accent_color || '#F16906',
        }, res.data.profile.logo_url || undefined)
        try {
          const cached = JSON.parse(localStorage.getItem(BRANDING_STORAGE_KEY) || '{}')
          const bgData = allSettings.branding || {}
          const updated = {
            ...cached,
            colors: {
              ...(cached.colors || {}),
              primary: res.data.profile.primary_color || '#0B2D6B',
              secondary: res.data.profile.secondary_color || '#071C44',
              accent: res.data.profile.accent_color || '#F16906',
            },
            academyName: res.data.profile.name || cached.academyName,
            monogram: res.data.profile.short_name || cached.monogram,
            assets: {
              ...(cached.assets || {}),
              academyLogoUrl: res.data.profile.logo_url || cached.assets?.academyLogoUrl,
              logoUrl: res.data.profile.logo_url || cached.assets?.logoUrl,
            },
            background: {
              mode: bgData.login_bg_mode || 'india_network',
              imageUrl: bgData.login_bg_image_url || '',
              customSvg: bgData.login_bg_custom_svg || '',
              customHtml: bgData.login_bg_custom_html || '',
              fit: bgData.login_bg_fit || 'cover',
              overlayOpacity: parseInt(bgData.login_bg_overlay_opacity || '60', 10),
              blur: parseInt(bgData.login_bg_blur || '4', 10),
              pattern: bgData.login_bg_pattern || 'geometric',
              videoUrl: bgData.login_bg_video_url || '',
              videoType: bgData.login_bg_video_type || 'mp4',
            }
          }
          localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(updated))
          localStorage.setItem(`pratham_branding_inst_${res.data.profile.id || 1}`, JSON.stringify(updated))
        } catch { }
        await queryClient.invalidateQueries({ queryKey: ['institutions'] })
        await queryClient.invalidateQueries({ queryKey: ['public_branding'] })
        await queryClient.invalidateQueries({ queryKey: ['institute_profile'] })
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('storage'))
        }
        showNotification('success', 'Institute profile and branding settings saved and applied globally across all modules.')
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
      showNotification('error', extractApiErrorMessage(err, 'Failed to save settings. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  // Handle Logo Upload with Validation + SVG Sanitization
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await readAndValidateLogoFile(file)
      handleProfileChange('logo_url', dataUrl)
      showNotification('success', `Logo "${file.name}" uploaded for preview. Click Save Changes to commit.`)
    } catch (err: any) {
      showNotification('error', err?.message || 'Unsupported or unsafe logo file.')
    }
  }

  const refreshBranches = async (instId: number) => {
    try {
      const bRes = await institutionsApi.listBranches(instId)
      setBranches(bRes.data || [])
    } catch { }
  }

  const openBranchModal = (branch: InstitutionBranch | null = null) => {
    setEditingBranch(branch)
    if (branch) {
      setBranchForm({
        branch_name: branch.branch_name || '',
        branch_code: branch.branch_code || '',
        is_main_branch: Boolean(branch.is_main_branch),
        address_line_1: branch.address_line_1 || '',
        address_line_2: branch.address_line_2 || '',
        area_locality: branch.area_locality || '',
        city: branch.city || '',
        district: branch.district || '',
        state: branch.state || '',
        pincode: branch.pincode || '',
        country: branch.country || 'India',
        phone: branch.phone || '',
        alternate_phone: branch.alternate_phone || '',
        email: branch.email || '',
        gstin: branch.gstin || '',
      })
    } else {
      setBranchForm({
        branch_name: '',
        branch_code: '',
        is_main_branch: branches.length === 0,
        address_line_1: '',
        address_line_2: '',
        area_locality: '',
        city: '',
        district: '',
        state: '',
        pincode: '',
        country: 'India',
        phone: '',
        alternate_phone: '',
        email: '',
        gstin: '',
      })
    }
    setIsBranchModalOpen(true)
  }

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!branchForm.branch_name.trim()) {
      showNotification('error', 'Branch Name is required.')
      return
    }
    try {
      setBranchSaving(true)
      const instId = profile.id || 1
      if (editingBranch) {
        await institutionsApi.updateBranch(instId, editingBranch.id, branchForm)
        showNotification('success', `Branch "${branchForm.branch_name}" updated.`)
      } else {
        await institutionsApi.createBranch(instId, branchForm)
        showNotification('success', `Branch "${branchForm.branch_name}" created.`)
      }
      setIsBranchModalOpen(false)
      await refreshBranches(instId)
      await queryClient.invalidateQueries({ queryKey: ['institutions'] })
      await queryClient.invalidateQueries({ queryKey: ['public_branding'] })
    } catch (err: any) {
      showNotification('error', extractApiErrorMessage(err, 'Failed to save branch.'))
    } finally {
      setBranchSaving(false)
    }
  }

  const handleSetMainBranch = async (branch: InstitutionBranch) => {
    try {
      const instId = profile.id || 1
      await institutionsApi.updateBranch(instId, branch.id, { is_main_branch: true })
      await refreshBranches(instId)
      await queryClient.invalidateQueries({ queryKey: ['public_branding'] })
      showNotification('success', `"${branch.branch_name}" is now the Main Branch.`)
    } catch (err: any) {
      showNotification('error', extractApiErrorMessage(err, 'Failed to switch Main Branch.'))
    }
  }

  const handleDeactivateBranch = async (branch: InstitutionBranch) => {
    try {
      const instId = profile.id || 1
      await institutionsApi.deactivateBranch(instId, branch.id)
      await refreshBranches(instId)
      showNotification('success', `Branch "${branch.branch_name}" deactivated.`)
    } catch (err: any) {
      showNotification('error', extractApiErrorMessage(err, 'Unable to deactivate branch.'))
    }
  }

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validTypes = ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml']
    if (!validTypes.includes(file.type) && !file.name.endsWith('.ico')) {
      showNotification('error', 'Unsupported favicon format. Please upload an ICO, PNG, or SVG.')
      return
    }
    if (file.size > 500 * 1024) {
      showNotification('error', 'Favicon exceeds 500KB limit. Please upload a 32x32 px icon.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      handleProfileChange('favicon_url', reader.result as string)
      showNotification('success', `Favicon "${file.name}" uploaded for preview. Click Save Changes to commit.`)
    }
    reader.readAsDataURL(file)
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
      showNotification('error', extractApiErrorMessage(err, 'Failed to save lookup item.'))
    }
  }

  const handleDeleteLookup = async (item: LookupItem) => {
    if (!isEditMode) {
      showNotification('error', 'Activate Edit Mode to delete or deactivate lookup items.')
      return
    }
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
    downloadBlob(blob, `prathamone_settings_backup_${new Date().toISOString().slice(0, 10)}.json`)
    showNotification('success', 'Settings configuration snapshot downloaded successfully.')
  }

  // Reset category defaults
  const handleResetDefaults = async (category: string) => {
    if (!isEditMode) {
      showNotification('error', 'Activate Edit Mode to reset category settings.')
      return
    }
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
    <div className="h-full flex flex-col bg-slate-50 min-h-0">
      {/* Main Workspace: Left Sub-sidebar (15 Sections) + Right Content Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sub-sidebar: Settings Categories Navigation */}
        <div className="w-64 sm:w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 h-full overflow-y-auto">
          {/* Header & Sub-search */}
          <div className="p-3.5 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Institute Settings</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Configure your institute, modules, and system behavior
            </p>

            <div className="relative mt-2.5">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Search settings..."
                className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-primary-500 focus:bg-white text-slate-800"
              />
              {categorySearch && (
                <button
                  onClick={() => setCategorySearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                  className={`w-full text-left p-2.5 rounded-lg flex items-start gap-3 transition-all ${isActive
                    ? 'bg-primary-50 text-primary-900 shadow-xs border-l-4 border-primary-600 rounded-l-none'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <div
                    className={`mt-0.5 p-1 rounded-md ${isActive ? 'text-primary-700 bg-primary-100' : 'text-gray-500 bg-gray-100'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold leading-snug truncate">{cat.title}</div>
                    <div
                      className={`text-[11px] truncate leading-tight ${isActive ? 'text-primary-600' : 'text-gray-500'
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
            {branding.appName} <span className="font-semibold">{branding.versionDisplay}</span>
          </div>
        </div>

        {/* Right Main Pane: Active Setting Configuration */}
        <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col h-full min-h-0">
          {/* Top Bar for Active Category with Actions */}
          <div className="bg-white border-b border-slate-200/90 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shadow-2xs">
                <ActiveIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-snug">
                  {currentCategoryMeta.title}
                </h2>
                <p className="text-[11px] text-slate-500">{currentCategoryMeta.subtitle}</p>
              </div>
            </div>

            {/* View-First & Explicit Edit Mode Governance Bar */}
            <div className="flex items-center gap-2">
              <ContextualHelpButton moduleKey="settings" variant="pill" label="Settings Help" />
              <EditModeBar
                scope={editScope}
                title={`Institute Settings — ${currentCategoryMeta.title}`}
                compact={true}
                onSave={async () => {
                  await handleSave()
                  useEditModeStore.getState().disableEditMode(editScope)
                }}
                onCancel={handleDiscard}
                saveLoading={saving}
              />
            </div>
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`mx-6 mt-4 p-3 rounded-lg flex items-center gap-2.5 text-xs font-medium ${feedback.type === 'success'
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
                <RefreshCw className="w-6 h-6 animate-spin text-primary-600" />
                <span className="text-xs">Loading institute configuration...</span>
              </div>
            ) : (
              <>
                {!isEditMode && (
                  <div className="mb-5 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>
                        Configuration settings are protected in <strong>View Mode (Read-Only)</strong>. Click <strong>"Enable Edit Mode"</strong> above to make modifications.
                      </span>
                    </div>
                  </div>
                )}
                <div className={!isEditMode ? 'pointer-events-none opacity-80 select-none' : ''}>
                  {/* ─────────────────────────────────────────────────────────── */}
                  {/* SECTION 1: INSTITUTE PROFILE & BRANDING                     */}
                  {/* ─────────────────────────────────────────────────────────── */}
                  {activeCategory === 'profile' && (
                    <div className="space-y-6">
                      {/* Optional Profile Completion Notice for Upgraded Installations */}
                      {Array.isArray(profile.missing_recommended_fields) && profile.missing_recommended_fields.length > 0 && (
                        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>
                              Profile completeness: <strong>{profile.completeness_pct ?? 50}%</strong> — Optional details missing:{' '}
                              {profile.missing_recommended_fields.join(', ')}. Existing records remain preserved.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setProfileSubTab('address')}
                            className="text-[11px] font-semibold text-amber-900 underline hover:text-amber-700"
                          >
                            Complete Address &amp; Contact
                          </button>
                        </div>
                      )}

                      {/* Sub-tab pills matching Screenshot */}
                      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
                        <button
                          type="button"
                          onClick={() => setProfileSubTab('basic')}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${profileSubTab === 'basic'
                            ? 'bg-primary-600 text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>Basic Details</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfileSubTab('address')}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${profileSubTab === 'address'
                            ? 'bg-primary-600 text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Address & Contact</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfileSubTab('branches')}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${profileSubTab === 'branches'
                            ? 'bg-primary-600 text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                        >
                          <GitFork className="w-3.5 h-3.5" />
                          <span>Branches</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfileSubTab('affiliations')}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${profileSubTab === 'affiliations'
                            ? 'bg-primary-600 text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Affiliations</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfileSubTab('compliance')}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${profileSubTab === 'compliance'
                            ? 'bg-primary-600 text-white shadow-xs'
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
                                <Building2 className="w-4 h-4 text-primary-600" />
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
                                    value={profile.name || ''}
                                    onChange={(e) => handleProfileChange('name', e.target.value)}
                                    placeholder={INSTITUTE_PLACEHOLDERS.name}
                                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Short Name / Abbreviation
                                  </label>
                                  <input
                                    type="text"
                                    value={profile.short_name || ''}
                                    onChange={(e) => handleProfileChange('short_name', e.target.value)}
                                    placeholder={INSTITUTE_PLACEHOLDERS.short_name}
                                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 uppercase"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Institute Type
                                  </label>
                                  <select
                                    value={profile.institute_type || 'Coaching Institute'}
                                    onChange={(e) => handleProfileChange('institute_type', e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
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
                                        value={profile.establishment_year ?? ''}
                                        onChange={(e) =>
                                          handleProfileChange('establishment_year', e.target.value ? parseInt(e.target.value, 10) : null)
                                        }
                                        placeholder="e.g., 2018"
                                        className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
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
                                      value={profile.registration_number ?? ''}
                                      onChange={(e) => handleProfileChange('registration_number', e.target.value)}
                                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 uppercase"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      PAN / Tax ID (Optional)
                                    </label>
                                    <input
                                      type="text"
                                      value={profile.tax_id ?? ''}
                                      onChange={(e) => handleProfileChange('tax_id', e.target.value)}
                                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 uppercase"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Tagline
                                  </label>
                                  <input
                                    type="text"
                                    value={profile.tagline ?? ''}
                                    onChange={(e) => handleProfileChange('tagline', e.target.value)}
                                    placeholder="Learn • Practice • Achieve"
                                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  />
                                </div>

                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-medium text-gray-700">
                                      Description (for documents &amp; communication)
                                    </label>
                                    <span className="text-[10px] text-gray-400">
                                      {profile.description?.length || 0} / 250
                                    </span>
                                  </div>
                                  <textarea
                                    rows={3}
                                    maxLength={250}
                                    value={profile.description ?? ''}
                                    onChange={(e) => handleProfileChange('description', e.target.value)}
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none text-gray-800"
                                  />
                              </div>
                            </div>

                            {/* Status & Preferences Card */}
                            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                <Sliders className="w-4 h-4 text-primary-600" />
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
                                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${profile.is_active ? 'bg-emerald-500' : 'bg-gray-300'
                                      }`}
                                  >
                                    <div
                                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${profile.is_active ? 'translate-x-5' : 'translate-x-0'
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
                                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
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
                                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
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
                                <Eye className="w-4 h-4 text-primary-600" />
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
                                  background: `linear-gradient(135deg, ${profile.primary_color || '#0B2D6B'} 0%, ${profile.secondary_color || '#071C44'} 100%)`,
                                }}
                                className="rounded-xl p-4 text-white shadow-md flex items-center gap-3.5 relative overflow-hidden"
                              >
                                {/* Background ambient lighting element */}
                                <div
                                  style={{ backgroundColor: profile.accent_color || '#F16906' }}
                                  className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-30 blur-2xl pointer-events-none"
                                />

                                <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center font-bold text-lg text-primary-900 border border-white/40 shadow-sm flex-shrink-0 overflow-hidden">
                                  {profile.logo_url && profile.logo_url !== '/logo.svg' ? (
                                    <img
                                      src={profile.logo_url}
                                      alt="Logo preview"
                                      className="w-full h-full object-contain rounded-lg [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.12))]"
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
                                    style={{ backgroundColor: profile.primary_color || '#0B2D6B' }}
                                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-xs overflow-hidden border border-slate-200"
                                  >
                                    {profile.logo_url && profile.logo_url !== '/logo.svg' ? (
                                      <img
                                        src={profile.logo_url}
                                        alt="Logo preview"
                                        className="w-full h-full object-contain bg-white"
                                      />
                                    ) : (
                                      profile.short_name || 'PA'
                                    )}
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
                                    style={{ backgroundColor: profile.secondary_color || '#071C44' }}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-xs overflow-hidden border border-slate-200"
                                  >
                                    {profile.favicon_url ? (
                                      <img
                                        src={profile.favicon_url}
                                        alt="Favicon preview"
                                        className="w-full h-full object-contain bg-white"
                                      />
                                    ) : (
                                      profile.short_name || 'PA'
                                    )}
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
                                      value={profile.primary_color || '#0B2D6B'}
                                      onChange={(e) => handleProfileChange('primary_color', e.target.value)}
                                      className="w-7 h-7 rounded-md cursor-pointer border-0 p-0"
                                    />
                                    <input
                                      type="text"
                                      value={profile.primary_color || '#0B2D6B'}
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
                                      value={profile.secondary_color || '#071C44'}
                                      onChange={(e) => handleProfileChange('secondary_color', e.target.value)}
                                      className="w-7 h-7 rounded-md cursor-pointer border-0 p-0"
                                    />
                                    <input
                                      type="text"
                                      value={profile.secondary_color || '#071C44'}
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
                                      value={profile.accent_color || '#F16906'}
                                      onChange={(e) => handleProfileChange('accent_color', e.target.value)}
                                      className="w-7 h-7 rounded-md cursor-pointer border-0 p-0"
                                    />
                                    <input
                                      type="text"
                                      value={profile.accent_color || '#F16906'}
                                      onChange={(e) => handleProfileChange('accent_color', e.target.value)}
                                      className="w-24 px-2 py-1 text-xs font-mono uppercase border border-gray-300 rounded-md text-gray-800"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Informational Box */}
                              <div className="p-3 bg-primary-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-[11px] text-primary-900">
                                <Info className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
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
                            <MapPin className="w-4 h-4 text-primary-600" />
                            <span>Campus Address &amp; Contact Information</span>
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Address Line 1
                              </label>
                              <input
                                type="text"
                                value={profile.address || ''}
                                onChange={(e) => {
                                  handleProfileChange('address', e.target.value)
                                  handleProfileChange('address_line_1', e.target.value)
                                }}
                                placeholder={INSTITUTE_PLACEHOLDERS.address_line_1}
                                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Address Line 2
                              </label>
                              <input
                                type="text"
                                value={profile.address_line_2 || ''}
                                onChange={(e) => handleProfileChange('address_line_2', e.target.value)}
                                placeholder={INSTITUTE_PLACEHOLDERS.address_line_2}
                                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Area / Locality</label>
                              <input
                                type="text"
                                value={profile.area_locality || ''}
                                onChange={(e) => handleProfileChange('area_locality', e.target.value)}
                                placeholder={INSTITUTE_PLACEHOLDERS.area_locality}
                                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                              <input
                                type="text"
                                value={profile.city || ''}
                                onChange={(e) => handleProfileChange('city', e.target.value)}
                                placeholder={INSTITUTE_PLACEHOLDERS.city}
                                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">District</label>
                              <input
                                type="text"
                                value={profile.district || ''}
                                onChange={(e) => handleProfileChange('district', e.target.value)}
                                placeholder={INSTITUTE_PLACEHOLDERS.district}
                                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
                              <input
                                type="text"
                                value={profile.country || 'India'}
                                onChange={(e) => handleProfileChange('country', e.target.value)}
                                placeholder={INSTITUTE_PLACEHOLDERS.country}
                                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">State / UT</label>
                              {(profile.country || 'India').trim().toLowerCase() === 'india' ? (
                                <select
                                  value={profile.state || ''}
                                  onChange={(e) => handleProfileChange('state', e.target.value)}
                                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                                >
                                  <option value="">{INSTITUTE_PLACEHOLDERS.state}</option>
                                  {INDIAN_STATES_AND_UTS.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={profile.state || ''}
                                  onChange={(e) => handleProfileChange('state', e.target.value)}
                                  placeholder="State / Province"
                                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                                />
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">PIN Code</label>
                              <input
                                type="text"
                                value={profile.pincode || ''}
                                onChange={(e) => handleProfileChange('pincode', e.target.value)}
                                placeholder={INSTITUTE_PLACEHOLDERS.pincode}
                                className="w-full px-3 py-1.5 text-xs font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Mobile Number</label>
                              <input
                                type="tel"
                                value={profile.phone || ''}
                                onChange={(e) => handleProfileChange('phone', e.target.value)}
                                placeholder={INSTITUTE_PLACEHOLDERS.phone}
                                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Alternate Mobile Number</label>
                              <input
                                type="tel"
                                value={profile.alternate_phone || ''}
                                onChange={(e) => handleProfileChange('alternate_phone', e.target.value)}
                                placeholder={INSTITUTE_PLACEHOLDERS.alternate_phone}
                                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Official Email Address</label>
                              <input
                                type="email"
                                value={profile.email || ''}
                                onChange={(e) => handleProfileChange('email', e.target.value)}
                                placeholder={INSTITUTE_PLACEHOLDERS.email}
                                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Website URL (Optional)</label>
                              <input
                                type="text"
                                value={profile.website || ''}
                                onChange={(e) => handleProfileChange('website', e.target.value)}
                                placeholder={INSTITUTE_PLACEHOLDERS.website}
                                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
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
                              <GitFork className="w-4 h-4 text-primary-600" />
                              <span>Campus Centers &amp; Branches ({branches.length})</span>
                            </h3>
                            <LockedButton
                              isEditMode={isEditMode}
                              onClick={() => openBranchModal(null)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Branch</span>
                            </LockedButton>
                          </div>

                          {branches.length === 0 ? (
                            <div className="border border-dashed border-gray-200 rounded-lg p-6 text-center text-xs text-gray-500">
                              No branches registered yet. Click <strong>Add Branch</strong> in Edit Mode to configure your Main Branch and additional centers.
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              {branches.map((br) => (
                                <div
                                  key={br.id}
                                  className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-wrap items-center justify-between gap-3"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-gray-900">
                                        {br.branch_name}
                                      </span>
                                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                                        {br.branch_code}
                                      </span>
                                      {br.is_main_branch && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                          Main Branch
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-gray-500 mt-1">
                                      {[br.address_line_1, br.city, br.state, br.pincode].filter(Boolean).join(', ') || 'No address added'}
                                      {br.phone ? ` • ${br.phone}` : ''}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {!br.is_main_branch && (
                                      <button
                                        type="button"
                                        onClick={() => handleSetMainBranch(br)}
                                        className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                      >
                                        Set as Main
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => openBranchModal(br)}
                                      className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                      title="Edit branch"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    {!br.is_main_branch && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeactivateBranch(br)}
                                        className="p-1.5 rounded-md border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                                        title="Deactivate branch"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Affiliations Sub-tab */}
                      {profileSubTab === 'affiliations' && (
                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4 max-w-3xl">
                          <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-primary-600" />
                            <span>Educational Boards &amp; Accreditations</span>
                          </h3>
                          <p className="text-xs text-gray-600">
                            {BRANDING_CONFIG.appName} supports multi-board coaching curriculums:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3 border border-blue-200 bg-primary-50 rounded-lg">
                              <div className="text-xs font-bold text-primary-900">CBSE Curriculum</div>
                              <div className="text-[11px] text-primary-700">Central Board of Secondary Education</div>
                            </div>
                            <div className="p-3 border border-indigo-200 bg-primary-50 rounded-lg">
                              <div className="text-xs font-bold text-primary-900">ICSE Curriculum</div>
                              <div className="text-[11px] text-primary-700">Council for the Indian School Certificate</div>
                            </div>
                            <div className="p-3 border border-emerald-200 bg-emerald-50 rounded-lg">
                              <div className="text-xs font-bold text-emerald-900">State Boards</div>
                              <div className="text-[11px] text-emerald-700">State Secondary &amp; Higher Secondary Curricula</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Legal & Compliance Sub-tab */}
                      {profileSubTab === 'compliance' && (
                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4 max-w-3xl">
                          <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary-600" />
                            <span>Legal, Tax &amp; Regulatory Information</span>
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                GST Registration Number (GSTIN — Optional)
                              </label>
                              <input
                                type="text"
                                value={profile.gstin || ''}
                                onChange={(e) => handleProfileChange('gstin', e.target.value.toUpperCase())}
                                placeholder={INSTITUTE_PLACEHOLDERS.gstin}
                                maxLength={15}
                                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-800 font-mono uppercase focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Permanent Account Number (PAN — Optional)
                              </label>
                              <input
                                type="text"
                                value={profile.pan || ''}
                                onChange={(e) => handleProfileChange('pan', e.target.value.toUpperCase())}
                                placeholder={INSTITUTE_PLACEHOLDERS.pan}
                                maxLength={10}
                                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-800 font-mono uppercase focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Registration / Trust Number (Optional)
                              </label>
                              <input
                                type="text"
                                value={profile.registration_number || ''}
                                onChange={(e) => handleProfileChange('registration_number', e.target.value)}
                                placeholder="Institute or Trust registration number (optional)"
                                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>
                            <div className="sm:col-span-2">
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
                      {/* Live Branding Preview Card */}
                      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-primary-600" />
                            <div>
                              <h3 className="text-sm font-bold text-gray-900">Real-Time Global Branding Preview</h3>
                              <p className="text-[11px] text-gray-500">
                                Live simulation across banner, buttons, active navigation, and official print documents
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                            Tenant: {profile.short_name || 'PA'}
                          </span>
                        </div>

                        {/* 1. Dynamic Live Banner Card */}
                        <div
                          style={{
                            background: `linear-gradient(135deg, ${profile.primary_color || '#0B2D6B'} 0%, ${profile.secondary_color || '#071C44'} 100%)`,
                          }}
                          className="rounded-xl p-4 text-white shadow-md flex items-center gap-3.5 relative overflow-hidden"
                        >
                          <div
                            style={{ backgroundColor: profile.accent_color || '#F16906' }}
                            className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-30 blur-2xl pointer-events-none"
                          />
                          <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center font-bold text-lg text-primary-900 border border-white/40 shadow-sm flex-shrink-0 overflow-hidden">
                            {profile.logo_url && profile.logo_url !== '/logo.svg' ? (
                              <img
                                src={profile.logo_url}
                                alt="Logo preview"
                                className="w-full h-full object-contain rounded-lg [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.12))]"
                              />
                            ) : (
                              profile.short_name || 'EI'
                            )}
                          </div>
                          <div className="min-w-0 flex-1 relative z-10">
                            <h4 className="font-bold text-sm tracking-tight truncate">
                              {profile.name || INSTITUTE_PLACEHOLDERS.name}
                            </h4>
                            <p className="text-xs text-blue-100 font-medium truncate mt-0.5">
                              {profile.tagline || 'COACHING MANAGEMENT. SIMPLIFIED.'}
                            </p>
                          </div>
                        </div>

                        {/* 2. Multi-Element Interactive Component Previews */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                          {/* Primary & Secondary Buttons Preview */}
                          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                              Buttons & Actions
                            </div>
                            <div className="space-y-1.5">
                              <button
                                type="button"
                                style={{ backgroundColor: profile.primary_color || '#0B2D6B' }}
                                className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-white shadow-2xs hover:brightness-105 transition-all text-center"
                              >
                                Primary Action
                              </button>
                              <button
                                type="button"
                                style={{
                                  color: profile.primary_color || '#0B2D6B',
                                  borderColor: profile.primary_color || '#0B2D6B',
                                }}
                                className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-white border hover:bg-slate-50 transition-all text-center"
                              >
                                Secondary Action
                              </button>
                            </div>
                          </div>

                          {/* Active Navigation Pill Preview */}
                          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-white">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              Sidebar Navigation
                            </div>
                            <div className="space-y-1">
                              <div
                                style={{ backgroundColor: profile.primary_color || '#0B2D6B' }}
                                className="py-1.5 px-2.5 rounded-lg text-xs font-semibold text-white shadow-xs flex items-center justify-between"
                              >
                                <span>Active Menu Tab</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                              </div>
                              <div className="py-1.5 px-2.5 rounded-lg text-xs font-medium text-slate-400">
                                Inactive Item
                              </div>
                            </div>
                          </div>

                          {/* Document Print Header Excerpt Preview */}
                          <div className="p-3 bg-white border-2 border-slate-900 rounded-xl space-y-1.5">
                            <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
                              Print Documents
                            </div>
                            <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                              <div
                                style={{
                                  background: `linear-gradient(135deg, ${profile.primary_color || '#0B2D6B'} 0%, ${profile.secondary_color || '#071C44'} 100%)`,
                                }}
                                className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-serif font-black text-white shrink-0"
                              >
                                {profile.short_name || 'EI'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[10px] font-bold text-slate-900 truncate">
                                  {profile.name || INSTITUTE_PLACEHOLDERS.name}
                                </div>
                                <div className="text-[8.5px] text-slate-500 font-mono">
                                  REF: RCP-2026-001
                                </div>
                              </div>
                            </div>
                            <div
                              style={{ backgroundColor: profile.accent_color || '#F16906' }}
                              className="text-[9px] font-bold text-white px-2 py-0.5 rounded text-center"
                            >
                              Accent Status Badge
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Presets and Custom Colors Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Theme Presets */}
                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                          <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                            <Palette className="w-4 h-4 text-primary-600" />
                            <span>Curated Theme Presets</span>
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                              { name: 'Pratham Navy & Saffron (Official)', primary: '#0B2D6B', secondary: '#071C44', accent: '#F16906' },
                              { name: 'Royal Blue & Indigo', primary: '#1E40AF', secondary: '#3B82F6', accent: '#8B5CF6' },
                              { name: 'Emerald Forest', primary: '#065F46', secondary: '#10B981', accent: '#059669' },
                              { name: 'Midnight Slate', primary: '#0F172A', secondary: '#38BDF8', accent: '#6366F1' },
                              { name: 'Imperial Crimson', primary: '#881337', secondary: '#F43F5E', accent: '#FB7185' },
                            ].map((preset) => {
                              const isCurrent =
                                profile.primary_color?.toUpperCase() === preset.primary.toUpperCase() &&
                                profile.secondary_color?.toUpperCase() === preset.secondary.toUpperCase()
                              return (
                                <button
                                  key={preset.name}
                                  type="button"
                                  onClick={() => {
                                    setProfile((prev) => {
                                      const next = {
                                        ...prev,
                                        primary_color: preset.primary,
                                        secondary_color: preset.secondary,
                                        accent_color: preset.accent,
                                      }
                                      applyGlobalBrandTheme({
                                        primary: preset.primary,
                                        secondary: preset.secondary,
                                        accent: preset.accent,
                                      }, next.logo_url || undefined)
                                      return next
                                    })
                                    showNotification('success', `Preset "${preset.name}" applied to live preview. Click Save Changes to commit globally.`)
                                  }}
                                  className={`p-3 border rounded-xl text-left transition-all relative ${isCurrent
                                    ? 'border-primary-600 ring-2 ring-blue-500 bg-primary-50/20 shadow-xs'
                                    : 'border-gray-200 hover:border-gray-300 hover:shadow-xs'
                                    }`}
                                >
                                  {isCurrent && (
                                    <span className="absolute top-2 right-2 text-[10px] font-bold text-primary-600 bg-primary-100 px-1.5 py-0.2 rounded-full">
                                      Active
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: preset.primary }} />
                                    <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: preset.secondary }} />
                                    <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: preset.accent }} />
                                  </div>
                                  <div className="text-xs font-bold text-gray-900">{preset.name}</div>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Login Page Canvas & Background Configuration Engine */}
                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-5">
                          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-primary-600" />
                              <div>
                                <h3 className="text-sm font-bold text-gray-900">Login Page Canvas & Background Engine</h3>
                                <p className="text-[11px] text-gray-500">
                                  Set the Institute Default background preset or upload custom images, SVG art, or HTML canvas. Bottom EduOS branding &amp; footer remain locked.
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                              Default: {(allSettings.branding?.login_bg_mode || 'india_network').replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>

                          {/* Mode Selector 8-Card Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              { id: 'india_network', title: 'India Network', desc: 'Pan-India Hub (Default)', icon: '🗺️' },
                              { id: 'deep_space', title: 'Deep Space', desc: 'Cosmic Academy Field', icon: '🌌' },
                              { id: 'waves', title: 'Dynamic Waves', desc: 'Brand Aurora Glow', icon: '🎨' },
                              { id: 'svg_pattern', title: 'SVG Pattern', desc: 'Blueprint & Lattice', icon: '📐' },
                              { id: 'image', title: 'Custom Image', desc: 'Upload Photo / URL', icon: '🖼️' },
                              { id: 'custom_svg', title: 'Custom SVG', desc: 'Upload / Paste SVG', icon: '✨' },
                              { id: 'custom_html', title: 'Custom HTML', desc: 'Sandboxed HTML Canvas', icon: '🌐' },
                              { id: 'video', title: 'Ambient Video', desc: 'MP4 / YouTube', icon: '🎬' },
                            ].map((m) => {
                              const isSelected = (allSettings.branding?.login_bg_mode || 'india_network') === m.id
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => handleSettingChange('branding', 'login_bg_mode', m.id)}
                                  className={`p-3 rounded-xl border text-left transition-all relative ${isSelected
                                    ? 'border-primary-600 ring-2 ring-primary-500 bg-primary-50/20 shadow-xs'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                                    }`}
                                >
                                  {isSelected && (
                                    <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary-600 text-white">
                                      Default
                                    </span>
                                  )}
                                  <div className="text-xl mb-1">{m.icon}</div>
                                  <div className="text-xs font-bold text-gray-900">{m.title}</div>
                                  <div className="text-[10px] text-gray-500">{m.desc}</div>
                                </button>
                              )
                            })}
                          </div>

                          {/* MODE: INTERACTIVE INSTITUTIONAL PRESETS (INDIA NETWORK / DEEP SPACE / WAVES) */}
                          {['india_network', 'deep_space', 'waves'].includes(allSettings.branding?.login_bg_mode || 'india_network') && (
                            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 text-[11px] text-slate-700 flex items-start gap-2.5">
                              <Sparkles className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold text-slate-900">
                                  {(allSettings.branding?.login_bg_mode || 'india_network') === 'india_network'
                                    ? 'India Network Hub Active as Institute Default:'
                                    : (allSettings.branding?.login_bg_mode === 'deep_space'
                                      ? 'Deep Space Cosmic Canvas Active as Institute Default:'
                                      : 'Dynamic Brand Aurora Waves Active as Institute Default:')}
                                </span>{' '}
                                Automatically displays your active Institute Name, City/State, Boards, Classes, and Subjects on the left login pane. Users can also temporarily toggle between presets using the on-screen switcher without changing your Institute Default.
                              </div>
                            </div>
                          )}

                          {/* MODE: CUSTOM IMAGE CONFIGURATION */}
                          {(allSettings.branding?.login_bg_mode === 'image') && (
                            <div className="space-y-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200">
                              <div>
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                  <label className="block text-xs font-bold text-slate-700">
                                    Background Image URL or Local Upload (PNG / JPG / WEBP, max 2 MB)
                                  </label>
                                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-[11px] font-semibold text-slate-700 cursor-pointer transition">
                                    <Upload className="w-3.5 h-3.5 text-primary-600" />
                                    <span>Upload Image</span>
                                    <input
                                      type="file"
                                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return
                                        if (file.size > 2 * 1024 * 1024) {
                                          showNotification('error', 'Background image must be 2 MB or smaller.')
                                          e.target.value = ''
                                          return
                                        }
                                        const reader = new FileReader()
                                        reader.onload = () => {
                                          if (typeof reader.result === 'string') {
                                            handleSettingChange('branding', 'login_bg_image_url', reader.result)
                                            showNotification('success', `Loaded "${file.name}". Click Save Settings to apply as Institute Default.`)
                                          }
                                        }
                                        reader.readAsDataURL(file)
                                        e.target.value = ''
                                      }}
                                    />
                                  </label>
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="https://... or /media/backgrounds/campus.jpg (or upload image above)"
                                    value={allSettings.branding?.login_bg_image_url || ''}
                                    onChange={(e) => handleSettingChange('branding', 'login_bg_image_url', e.target.value)}
                                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                                  />
                                  {allSettings.branding?.login_bg_image_url && (
                                    <button
                                      type="button"
                                      onClick={() => handleSettingChange('branding', 'login_bg_image_url', '')}
                                      className="px-2.5 py-1.5 text-xs font-medium bg-white hover:bg-rose-50 text-rose-600 border border-slate-300 rounded-lg"
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>
                                {/* Quick Image Presets */}
                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                  <span className="text-[10px] font-semibold text-slate-500">Demo Presets:</span>
                                  {[
                                    { label: 'Campus Exterior', url: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1920&q=80' },
                                    { label: 'Study Hall', url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1920&q=80' },
                                    { label: 'Classroom', url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1920&q=80' },
                                  ].map((pre) => (
                                    <button
                                      key={pre.label}
                                      type="button"
                                      onClick={() => handleSettingChange('branding', 'login_bg_image_url', pre.url)}
                                      className="px-2 py-0.5 text-[10px] font-medium bg-white hover:bg-slate-200 border border-slate-300 rounded text-slate-700 transition"
                                    >
                                      {pre.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Display Fit Mode */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Image Scaling & Fit
                                  </label>
                                  <select
                                    value={allSettings.branding?.login_bg_fit || 'cover'}
                                    onChange={(e) => handleSettingChange('branding', 'login_bg_fit', e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                                  >
                                    <option value="cover">Crop to Fit (Cover - Recommended)</option>
                                    <option value="contain">Fit Entire Image (Contain)</option>
                                    <option value="stretch">Stretch to Screen (Fill)</option>
                                    <option value="tile">Tiled Repeating Pattern</option>
                                  </select>
                                </div>

                                {/* Dark Contrast Overlay Tint */}
                                <div>
                                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                                    <span>Contrast Tint</span>
                                    <span className="font-mono text-primary-600">{allSettings.branding?.login_bg_overlay_opacity || '60'}%</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="20"
                                    max="90"
                                    step="5"
                                    value={allSettings.branding?.login_bg_overlay_opacity || '60'}
                                    onChange={(e) => handleSettingChange('branding', 'login_bg_overlay_opacity', e.target.value)}
                                    className="w-full accent-primary-600"
                                  />
                                  <div className="text-[10px] text-slate-400 mt-0.5">Prevents white text & card clashing</div>
                                </div>

                                {/* Backdrop Glassmorphism Blur */}
                                <div>
                                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                                    <span>Backdrop Blur</span>
                                    <span className="font-mono text-primary-600">{allSettings.branding?.login_bg_blur || '4'}px</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max="16"
                                    step="2"
                                    value={allSettings.branding?.login_bg_blur || '4'}
                                    onChange={(e) => handleSettingChange('branding', 'login_bg_blur', e.target.value)}
                                    className="w-full accent-primary-600"
                                  />
                                  <div className="text-[10px] text-slate-400 mt-0.5">Smooth glassmorphic depth</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* MODE: SVG PATTERN CONFIGURATION */}
                          {(allSettings.branding?.login_bg_mode === 'svg_pattern') && (
                            <div className="space-y-3 p-4 rounded-xl bg-slate-50/80 border border-slate-200">
                              <label className="block text-xs font-bold text-slate-700">
                                Educational / Architectural Pattern Style
                              </label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[
                                  { id: 'geometric', label: 'Isometric Grid' },
                                  { id: 'dots', label: 'Technology Matrix' },
                                  { id: 'blueprint', label: 'Architectural Blueprint' },
                                  { id: 'lattice', label: 'Monogram Watermark' },
                                ].map((pat) => (
                                  <button
                                    key={pat.id}
                                    type="button"
                                    onClick={() => handleSettingChange('branding', 'login_bg_pattern', pat.id)}
                                    className={`p-2.5 text-xs font-semibold rounded-lg border text-center transition ${(allSettings.branding?.login_bg_pattern || 'geometric') === pat.id
                                      ? 'border-primary-600 bg-primary-50 text-primary-700 font-bold'
                                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                      }`}
                                  >
                                    {pat.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* MODE: VIDEO BACKGROUND CONFIGURATION */}
                          {(allSettings.branding?.login_bg_mode === 'video') && (
                            <div className="space-y-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1">Video Source Type</label>
                                  <select
                                    value={allSettings.branding?.login_bg_video_type || 'mp4'}
                                    onChange={(e) => handleSettingChange('branding', 'login_bg_video_type', e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                                  >
                                    <option value="mp4">Direct HTML5 Video (MP4 / WebM)</option>
                                    <option value="youtube">YouTube Video Embed</option>
                                  </select>
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-xs font-bold text-slate-700 mb-1">
                                    {allSettings.branding?.login_bg_video_type === 'youtube' ? 'YouTube URL or Video ID' : 'Direct MP4 Video URL'}
                                  </label>
                                  <input
                                    type="text"
                                    placeholder={allSettings.branding?.login_bg_video_type === 'youtube' ? 'e.g. dQw4w9WgXcQ or https://youtube.com/watch?v=...' : 'https://prathamone.com/ambient-loop.mp4'}
                                    value={allSettings.branding?.login_bg_video_url || ''}
                                    onChange={(e) => handleSettingChange('branding', 'login_bg_video_url', e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                                  />
                                </div>
                              </div>
                              {/* Video Display Overlay Controls */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                                {/* Dark Contrast Overlay Tint */}
                                <div>
                                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                                    <span>Video Contrast Tint</span>
                                    <span className="font-mono text-primary-600">{allSettings.branding?.login_bg_overlay_opacity || '40'}%</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="10"
                                    max="90"
                                    step="5"
                                    value={allSettings.branding?.login_bg_overlay_opacity || '40'}
                                    onChange={(e) => handleSettingChange('branding', 'login_bg_overlay_opacity', e.target.value)}
                                    className="w-full accent-primary-600"
                                  />
                                  <div className="text-[10px] text-slate-400 mt-0.5">Controls background darkness behind login card</div>
                                </div>

                                {/* Backdrop Glassmorphism Blur */}
                                <div>
                                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                                    <span>Video Backdrop Blur</span>
                                    <span className="font-mono text-primary-600">{allSettings.branding?.login_bg_blur || '0'}px</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max="16"
                                    step="2"
                                    value={allSettings.branding?.login_bg_blur || '0'}
                                    onChange={(e) => handleSettingChange('branding', 'login_bg_blur', e.target.value)}
                                    className="w-full accent-primary-600"
                                  />
                                  <div className="text-[10px] text-slate-400 mt-0.5">Soft glassmorphic video softening (0px = crystal clear)</div>
                                </div>
                              </div>

                              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                <span>
                                  Video backgrounds are automatically muted and looped. Mobile devices conserve data with an automatic fallback poster.
                                </span>
                              </div>
                            </div>
                          )}

                          {/* MODE: CUSTOM SVG CONFIGURATION */}
                          {(allSettings.branding?.login_bg_mode === 'custom_svg') && (
                            <div className="space-y-3 p-4 rounded-xl bg-slate-50/80 border border-slate-200">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <label className="block text-xs font-bold text-slate-700">
                                  Custom Vector Backdrop (.svg, max 512 KB)
                                </label>
                                <div className="flex items-center gap-2">
                                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-[11px] font-semibold text-slate-700 cursor-pointer transition">
                                    <Upload className="w-3.5 h-3.5 text-primary-600" />
                                    <span>Upload .svg</span>
                                    <input
                                      type="file"
                                      accept=".svg,image/svg+xml"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return
                                        if (file.size > 512 * 1024) {
                                          showNotification('error', 'Custom SVG file must be 512 KB or smaller.')
                                          e.target.value = ''
                                          return
                                        }
                                        const reader = new FileReader()
                                        reader.onload = () => {
                                          if (typeof reader.result === 'string') {
                                            handleSettingChange('branding', 'login_bg_custom_svg', reader.result)
                                            showNotification('success', `Loaded "${file.name}". Click Save Settings to apply.`)
                                          }
                                        }
                                        reader.readAsText(file)
                                        e.target.value = ''
                                      }}
                                    />
                                  </label>
                                  {allSettings.branding?.login_bg_custom_svg && (
                                    <button
                                      type="button"
                                      onClick={() => handleSettingChange('branding', 'login_bg_custom_svg', '')}
                                      className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-rose-50 text-rose-600 border border-slate-300 rounded-lg"
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>
                              </div>
                              <textarea
                                rows={5}
                                placeholder='<svg viewBox="0 0 800 900" xmlns="http://www.w3.org/2000/svg">...</svg>'
                                value={allSettings.branding?.login_bg_custom_svg || ''}
                                onChange={(e) => handleSettingChange('branding', 'login_bg_custom_svg', e.target.value)}
                                className="w-full px-3 py-2 text-[11px] font-mono border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-500"
                              />
                              <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200 text-[11px] text-blue-800 flex items-start gap-2">
                                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                <span>
                                  All scripts and inline event handlers are stripped automatically for safety. The PrathamOne EduOS branding footer and version stamp stay locked cleanly on top.
                                </span>
                              </div>
                            </div>
                          )}

                          {/* MODE: CUSTOM HTML CONFIGURATION */}
                          {(allSettings.branding?.login_bg_mode === 'custom_html') && (
                            <div className="space-y-3 p-4 rounded-xl bg-slate-50/80 border border-slate-200">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <label className="block text-xs font-bold text-slate-700">
                                  Custom HTML / Canvas Scene (.html / .htm, max 512 KB)
                                </label>
                                <div className="flex items-center gap-2">
                                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-[11px] font-semibold text-slate-700 cursor-pointer transition">
                                    <Upload className="w-3.5 h-3.5 text-primary-600" />
                                    <span>Upload .html / .htm</span>
                                    <input
                                      type="file"
                                      accept=".html,.htm,text/html"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return
                                        if (file.size > 512 * 1024) {
                                          showNotification('error', 'Custom HTML file must be 512 KB or smaller.')
                                          e.target.value = ''
                                          return
                                        }
                                        const reader = new FileReader()
                                        reader.onload = () => {
                                          if (typeof reader.result === 'string') {
                                            handleSettingChange('branding', 'login_bg_custom_html', reader.result)
                                            showNotification('success', `Loaded "${file.name}". Click Save Settings to apply.`)
                                          }
                                        }
                                        reader.readAsText(file)
                                        e.target.value = ''
                                      }}
                                    />
                                  </label>
                                  {allSettings.branding?.login_bg_custom_html && (
                                    <button
                                      type="button"
                                      onClick={() => handleSettingChange('branding', 'login_bg_custom_html', '')}
                                      className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-rose-50 text-rose-600 border border-slate-300 rounded-lg"
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>
                              </div>
                              <textarea
                                rows={6}
                                placeholder="<!DOCTYPE html><html><body style='margin:0;background:#050816'>...</body></html>"
                                value={allSettings.branding?.login_bg_custom_html || ''}
                                onChange={(e) => handleSettingChange('branding', 'login_bg_custom_html', e.target.value)}
                                className="w-full px-3 py-2 text-[11px] font-mono border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-500"
                              />
                              <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200 text-[11px] text-blue-800 flex items-start gap-2">
                                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                <span>
                                  Renders inside an isolated backdrop iframe (`sandbox=&quot;allow-scripts&quot;`, `pointer-events: none`) behind the login overlays—your footer attribution, version, and curriculum badges remain protected and always visible.
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Custom Palette Controls */}
                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                          <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-primary-600" />
                            <span>Custom Color Controls</span>
                          </h3>
                          <div className="space-y-3">
                            {/* Primary */}
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs font-medium text-gray-900">Primary Color</div>
                                <div className="text-[10px] text-gray-400">Buttons, active nav, primary highlights</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={profile.primary_color || '#0B2D6B'}
                                  onChange={(e) => handleProfileChange('primary_color', e.target.value)}
                                  className="w-7 h-7 rounded-md cursor-pointer border-0 p-0"
                                />
                                <input
                                  type="text"
                                  value={profile.primary_color || '#0B2D6B'}
                                  onChange={(e) => handleProfileChange('primary_color', e.target.value)}
                                  className="w-24 px-2 py-1 text-xs font-mono uppercase border border-gray-300 rounded-md text-gray-800"
                                />
                              </div>
                            </div>
                            {/* Secondary */}
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs font-medium text-gray-900">Secondary Color</div>
                                <div className="text-[10px] text-gray-400">Supporting gradients & header accents</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={profile.secondary_color || '#071C44'}
                                  onChange={(e) => handleProfileChange('secondary_color', e.target.value)}
                                  className="w-7 h-7 rounded-md cursor-pointer border-0 p-0"
                                />
                                <input
                                  type="text"
                                  value={profile.secondary_color || '#071C44'}
                                  onChange={(e) => handleProfileChange('secondary_color', e.target.value)}
                                  className="w-24 px-2 py-1 text-xs font-mono uppercase border border-gray-300 rounded-md text-gray-800"
                                />
                              </div>
                            </div>
                            {/* Accent */}
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs font-medium text-gray-900">Accent Color</div>
                                <div className="text-[10px] text-gray-400">Badges, indicators & ambient halos</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={profile.accent_color || '#F16906'}
                                  onChange={(e) => handleProfileChange('accent_color', e.target.value)}
                                  className="w-7 h-7 rounded-md cursor-pointer border-0 p-0"
                                />
                                <input
                                  type="text"
                                  value={profile.accent_color || '#F16906'}
                                  onChange={(e) => handleProfileChange('accent_color', e.target.value)}
                                  className="w-24 px-2 py-1 text-xs font-mono uppercase border border-gray-300 rounded-md text-gray-800"
                                />
                              </div>
                            </div>
                          </div>
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
                          <GraduationCap className="w-4 h-4 text-primary-600" />
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
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Term Structure
                            </label>
                            <select
                              value={allSettings.academic?.term_structure || 'Quarterly'}
                              onChange={(e) => handleSettingChange('academic', 'term_structure', e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 bg-white"
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
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 bg-white"
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
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500"
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
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500"
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
                          <UserCheck className="w-4 h-4 text-primary-600" />
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
                            <Eye className="w-4 h-4 text-primary-600" />
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
                              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium text-gray-800 focus:ring-2 focus:ring-primary-500"
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
                              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium text-gray-800 focus:ring-2 focus:ring-primary-500"
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
                              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium text-gray-800 focus:ring-2 focus:ring-primary-500"
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
                          <Users className="w-4 h-4 text-primary-600" />
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
                          <CreditCard className="w-4 h-4 text-primary-600" />
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

                      {/* Payment Workflow & ERP Governance Card */}
                      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>Payment Workflow & ERP Approval Governance</span>
                          </h3>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${(allSettings.fees?.workflow_mode || 'simple') === 'erp'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-primary-100 text-primary-800'
                            }`}>
                            {(allSettings.fees?.workflow_mode || 'simple') === 'erp' ? 'Standard ERP Mode' : 'Simple Mode'}
                          </span>
                        </div>

                        <p className="text-xs text-gray-500">
                          Configure payment lifecycle controls. Simple mode keeps day-to-day operations swift and flexible, while Standard ERP mode enforces strict approval gates for high-value payments and cheques.
                        </p>

                        <div className="space-y-4 pt-1">
                          <div>
                            <label className="block text-xs font-semibold text-gray-800 mb-2">
                              Workflow Operating Mode
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${(allSettings.fees?.workflow_mode || 'simple') === 'simple'
                                ? 'border-primary-500 bg-primary-50/40 ring-1 ring-primary-500'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}>
                                <input
                                  type="radio"
                                  name="workflow_mode"
                                  value="simple"
                                  checked={(allSettings.fees?.workflow_mode || 'simple') === 'simple'}
                                  onChange={() => {
                                    handleSettingChange('fees', 'workflow_mode', 'simple')
                                    handleSettingChange('fees', 'payment_workflow_mode', 'simple')
                                  }}
                                  className="mt-0.5 text-primary-600 focus:ring-primary-500"
                                />
                                <div>
                                  <span className="text-xs font-bold text-gray-900 block">
                                    Simple Mode (Recommended Default)
                                  </span>
                                  <span className="text-[11px] text-gray-500 block mt-0.5 leading-relaxed">
                                    Draft → Submitted → Posted. Authorized users can post payments directly without bottlenecking routine operations.
                                  </span>
                                </div>
                              </label>

                              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${(allSettings.fees?.workflow_mode || 'simple') === 'erp'
                                ? 'border-purple-500 bg-purple-50/40 ring-1 ring-purple-500'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}>
                                <input
                                  type="radio"
                                  name="workflow_mode"
                                  value="erp"
                                  checked={(allSettings.fees?.workflow_mode || 'simple') === 'erp'}
                                  onChange={() => {
                                    handleSettingChange('fees', 'workflow_mode', 'erp')
                                    handleSettingChange('fees', 'payment_workflow_mode', 'standard_erp')
                                  }}
                                  className="mt-0.5 text-purple-600 focus:ring-purple-500"
                                />
                                <div>
                                  <span className="text-xs font-bold text-gray-900 block">
                                    Standard ERP Mode
                                  </span>
                                  <span className="text-[11px] text-gray-500 block mt-0.5 leading-relaxed">
                                    Draft → Submitted → Approved → Posted. Enforces multi-tier approval verification for high-value amounts and cheques.
                                  </span>
                                </div>
                              </label>
                            </div>
                          </div>

                          {(allSettings.fees?.workflow_mode || 'simple') === 'erp' && (
                            <div className="bg-purple-50/50 border border-purple-200/70 rounded-xl p-4 space-y-4">
                              <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                                ERP Approval Criteria & Thresholds
                              </h4>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Approval Required for Amounts Exceeding (₹)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={allSettings.fees?.approval_threshold ?? 25000}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0
                                      handleSettingChange('fees', 'approval_threshold', val)
                                      handleSettingChange('fees', 'erp_approval_amount_threshold', val)
                                    }}
                                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                                  />
                                  <span className="text-[10px] text-gray-500 mt-1 block">
                                    Payments at or above this amount require manager/admin sign-off.
                                  </span>
                                </div>

                                <div className="flex flex-col justify-center">
                                  <label className="flex items-center gap-2 cursor-pointer pt-2">
                                    <input
                                      type="checkbox"
                                      checked={allSettings.fees?.require_cheque_approval !== false}
                                      onChange={(e) => handleSettingChange('fees', 'require_cheque_approval', e.target.checked)}
                                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-xs font-semibold text-gray-800">
                                      Require Approval for all Cheque Payments
                                    </span>
                                  </label>
                                  <span className="text-[10px] text-gray-500 ml-5 block mt-0.5">
                                    Prevents posting unverified cheques until clearance is verified.
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
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
                          <CalendarCheck className="w-4 h-4 text-primary-600" />
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
                          <Award className="w-4 h-4 text-primary-600" />
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
                          <MessageSquare className="w-4 h-4 text-primary-600" />
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
                          <Printer className="w-4 h-4 text-primary-600" />
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
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Print Monogram Logo ("PA") on Receipt
                            </label>
                            <select
                              value={String(allSettings.documents?.print_receipt_logo ?? 'false')}
                              onChange={(e) => handleSettingChange('documents', 'print_receipt_logo', e.target.value === 'true')}
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                            >
                              <option value="false">Do Not Print Logo (Text Only) (Default)</option>
                              <option value="true">Show "PA" Monogram Crest</option>
                            </select>
                            <p className="text-[10px] text-gray-500 mt-1">Controls rendering of the institutional monogram crest on fee vouchers.</p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Print Motto / Tagline on Receipt
                            </label>
                            <select
                              value={String(allSettings.documents?.print_receipt_tagline ?? 'false')}
                              onChange={(e) => handleSettingChange('documents', 'print_receipt_tagline', e.target.value === 'true')}
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                            >
                              <option value="false">Do Not Print Tagline (Default)</option>
                              <option value="true">Show Tagline ("Learn · Practice · Achieve")</option>
                            </select>
                            <p className="text-[10px] text-gray-500 mt-1">Controls rendering of the academy tagline under the institution title.</p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Software Attribution in Print Footers
                            </label>
                            <select
                              value={String(allSettings.documents?.print_software_branding ?? 'true')}
                              onChange={(e) => handleSettingChange('documents', 'print_software_branding', e.target.value === 'true')}
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                            >
                              <option value="true">Include Understated Software Attribution (Recommended)</option>
                              <option value="false">Omit Software Attribution (White-Label Clean)</option>
                            </select>
                            <p className="text-[10px] text-gray-500 mt-1">Controls rendering of the subtle PrathamOne micro-attribution watermark in print footers.</p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Top Sovereign Accent Trim (Navy & Gold)
                            </label>
                            <select
                              value={String(allSettings.documents?.print_sovereign_trim ?? 'false')}
                              onChange={(e) => handleSettingChange('documents', 'print_sovereign_trim', e.target.value === 'true')}
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                            >
                              <option value="false">Do Not Print Trim (Clean Minimal) (Default)</option>
                              <option value="true">Show Sovereign Dual Trim (Navy & Gold)</option>
                            </select>
                            <p className="text-[10px] text-gray-500 mt-1">Controls rendering of the royal navy and burnished gold header accent bar.</p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Top-Right Official Verification Seal
                            </label>
                            <select
                              value={String(allSettings.documents?.print_verification_seal ?? 'false')}
                              onChange={(e) => handleSettingChange('documents', 'print_verification_seal', e.target.value === 'true')}
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                            >
                              <option value="false">Do Not Print Seal (Default)</option>
                              <option value="true">Show Official Verification Seal ("★ OFFICIAL ★ PA VERIFIED")</option>
                            </select>
                            <p className="text-[10px] text-gray-500 mt-1">Controls rendering of the institutional circular verification emblem.</p>
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
                              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 font-medium"
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
                                className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleOpenAddLookup}
                            className="px-3.5 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg flex items-center gap-1.5 shadow-2xs"
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
                                  <td className="px-4 py-2.5 font-mono font-bold text-primary-900">
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
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${item.is_active
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-gray-100 text-gray-500'
                                        }`}
                                    >
                                      {item.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    {item.is_system ? (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-50 text-primary-700 border border-blue-200">
                                        Core
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-gray-400">Custom</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-right space-x-1.5">
                                    <LockedIconButton
                                      isEditMode={isEditMode}
                                      onClick={() => handleOpenEditLookup(item)}
                                      icon={<Edit className="w-3.5 h-3.5" />}
                                      tooltip="Edit lookup"
                                      className="p-1 text-gray-500 hover:text-primary-600 rounded transition-colors"
                                    />
                                    <LockedIconButton
                                      isEditMode={isEditMode}
                                      onClick={() => handleDeleteLookup(item)}
                                      icon={<Trash2 className="w-3.5 h-3.5" />}
                                      tooltip={item.is_system ? 'Deactivate system lookup' : 'Delete lookup'}
                                      className="p-1 text-gray-500 hover:text-rose-600 rounded transition-colors"
                                    />
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
                          <SlidersHorizontal className="w-4 h-4 text-primary-600" />
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

                      {/* Desktop Launch Mode Setting */}
                      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                              <Monitor className="w-4 h-4 text-primary-600" />
                              <span>Desktop Launch Presentation Mode</span>
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              Configure how PrathamOne EduOS opens when launched from desktop shortcuts or system tray.
                            </p>
                          </div>
                          <span className="text-[11px] font-medium text-primary-700 bg-primary-50 border border-primary-200 px-2.5 py-0.5 rounded-full">
                            {(allSettings.system?.desktop_launch_mode || 'browser') === 'browser' ? 'Default Browser Tab' : 'App Window'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <label
                            onClick={() => isEditMode && handleSettingChange('system', 'desktop_launch_mode', 'browser')}
                            className={`p-3.5 border rounded-xl transition-all ${(allSettings.system?.desktop_launch_mode || 'browser') === 'browser'
                                ? 'border-primary-600 bg-primary-50/50 shadow-2xs'
                                : 'border-gray-200 hover:border-gray-300'
                              } ${isEditMode ? 'cursor-pointer' : 'cursor-default opacity-85'}`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5 text-primary-600" />
                                Standard Browser Tab
                              </span>
                              <input
                                type="radio"
                                name="desktopLaunchMode"
                                value="browser"
                                checked={(allSettings.system?.desktop_launch_mode || 'browser') === 'browser'}
                                disabled={!isEditMode}
                                onChange={() => handleSettingChange('system', 'desktop_launch_mode', 'browser')}
                                className="text-primary-600 focus:ring-primary-500"
                              />
                            </div>
                            <span className="text-[11px] text-gray-500 leading-relaxed">
                              Opens as a standard tab in your default browser (Chrome, Edge, Firefox) with address bar, tabs, extensions, and the 🔒 SSL padlock.
                            </span>
                          </label>

                          <label
                            onClick={() => isEditMode && handleSettingChange('system', 'desktop_launch_mode', 'app')}
                            className={`p-3.5 border rounded-xl transition-all ${allSettings.system?.desktop_launch_mode === 'app'
                                ? 'border-primary-600 bg-primary-50/50 shadow-2xs'
                                : 'border-gray-200 hover:border-gray-300'
                              } ${isEditMode ? 'cursor-pointer' : 'cursor-default opacity-85'}`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                                <AppWindow className="w-3.5 h-3.5 text-primary-600" />
                                Dedicated Desktop Window (PWA Mode)
                              </span>
                              <input
                                type="radio"
                                name="desktopLaunchMode"
                                value="app"
                                checked={allSettings.system?.desktop_launch_mode === 'app'}
                                disabled={!isEditMode}
                                onChange={() => handleSettingChange('system', 'desktop_launch_mode', 'app')}
                                className="text-primary-600 focus:ring-primary-500"
                              />
                            </div>
                            <span className="text-[11px] text-gray-500 leading-relaxed">
                              Opens in a clean, standalone desktop window with the browser URL bar, navigation buttons, and bookmarks hidden.
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Local SSL & LAN Device Certificate Export */}
                      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-primary-600" />
                              <span>Local SSL &amp; Staff Device LAN Trust</span>
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              Export this institute's unique Root CA certificate and 1-click helper script to trust HTTPS on staff laptops, tablets, or receptionist PCs connected over Wi-Fi / LAN.
                            </p>
                          </div>
                        </div>

                        <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-lg text-xs text-blue-900 leading-relaxed">
                          <strong>Note for Main Host PC:</strong> The primary computer where PrathamOne EduOS was installed already trusts this certificate automatically. Use these exports only when other computers on the institute local network need to access PrathamOne over HTTPS with green lock trust.
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <a
                            href="/api/v1/settings/download-ca-certificate"
                            download="Smritisys_AITDL_Local_CA.cer"
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-300 hover:border-primary-500 hover:text-primary-700 text-xs font-semibold text-gray-700 rounded-lg shadow-2xs transition-colors"
                          >
                            <Download className="w-3.5 h-3.5 text-primary-600" />
                            Download Root CA Certificate (.cer)
                          </a>
                          <a
                            href="/api/v1/settings/download-ca-installer-script"
                            download="Install-PrathamOne-SSL.bat"
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-primary-900 hover:bg-primary-950 text-xs font-semibold text-white rounded-lg shadow-2xs transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download 1-Click Trust Script (.bat)
                          </a>
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
                          <Shield className="w-4 h-4 text-primary-600" />
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
                                <td className="px-4 py-2 font-bold text-primary-900">sysadmin</td>
                                <td className="px-4 py-2 text-gray-700">Global Full Enterprise Superuser</td>
                                <td className="px-4 py-2 text-emerald-600 font-semibold">Enabled</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-2 font-bold text-primary-900">admin / principal</td>
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
                  {/* SECTION 13B: SECURITY & DEVICE BINDING                      */}
                  {/* ─────────────────────────────────────────────────────────── */}
                  {activeCategory === 'security' && (
                    <DeviceBindingSettingsPanel
                      settings={allSettings.security || {}}
                      onChange={(k, v) => handleSettingChange('security', k, v)}
                      isEditMode={isEditMode}
                      institutionId={profile.id}
                      onRefresh={fetchAllData}
                    />
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

                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-emerald-600" />
                              <span>WhatsApp Business Cloud API</span>
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              Meta Cloud &amp; Webhooks
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Automated parent alerts for fee receipts, instant absent SMS/WhatsApp, and exam scorecards.
                          </p>
                          <Link
                            to="/communication/settings"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-900 pt-1"
                          >
                            <span>Open WhatsApp &amp; DLT Gateway Settings</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────── */}
                  {/* SECTION 15: DATA & MAINTENANCE                              */}
                  {/* ─────────────────────────────────────────────────────────── */}
                  {activeCategory === 'maintenance' && (
                    <div className="space-y-6">
                      {/* Link to Dedicated Housekeeping & Database Operations Module */}
                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                            <Database className="w-4 h-4 text-emerald-700" />
                            <span>Housekeeping: Full PostgreSQL Backup & Restore Center</span>
                          </h4>
                          <p className="text-xs text-emerald-800">
                            Run verified PostgreSQL backups, GFS retention pruning, non-destructive sandbox restore drills,
                            VACUUM ANALYZE, and automated CLI scheduling.
                          </p>
                        </div>
                        <Link
                          to="/housekeeping"
                          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl inline-flex items-center gap-1.5 shadow-2xs shrink-0 self-start sm:self-auto"
                        >
                          <span>Open Housekeeping Module</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      {/* Maintenance Quick Actions */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-3">
                          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Download className="w-4 h-4 text-primary-600" />
                            <span>Backup Configuration Snapshot</span>
                          </h4>
                          <p className="text-xs text-gray-500">
                            Download a portable JSON archive of your institute profile, custom branding, settings, and general lookups.
                          </p>
                          <button
                            type="button"
                            onClick={handleDownloadSnapshot}
                            className="px-3.5 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg flex items-center gap-1.5 shadow-2xs"
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
                          <LockedButton
                            isEditMode={isEditMode}
                            onClick={() => handleResetDefaults('academic')}
                            icon={RotateCcw}
                            className="px-3.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg flex items-center gap-1.5 shadow-2xs"
                          >
                            Reset Academic Defaults
                          </LockedButton>
                        </div>
                      </div>

                      {/* Audit Logs Trail */}
                      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
                        <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                          <Database className="w-4 h-4 text-primary-600" />
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
                                  <td className="px-4 py-2.5 font-semibold text-primary-900">
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
                  {/* ─────────────────────────────────────────────────────────── */}
                  {/* SECTION: NAVIGATION & MENU GOVERNANCE                          */}
                  {/* ─────────────────────────────────────────────────────────── */}
                  {activeCategory === 'navigation' && (
                    <NavigationSettingsPanel />
                  )}

                  {/* ─────────────────────────────────────────────────────────── */}
                  {/* SECTION: CODEX CONFIGURATION STUDIO                           */}
                  {/* ─────────────────────────────────────────────────────────── */}
                  {activeCategory === 'codex' && (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <KeyRound className="w-5 h-5 text-indigo-400" />
                            <h3 className="text-lg font-bold">CodeX Configuration Studio</h3>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary-500/30 text-indigo-200 border border-indigo-400/30">
                              Enterprise Capability
                            </span>
                          </div>
                          <p className="text-xs text-slate-300">
                            Configure numeric-to-alphabet bijective mappings, value obfuscation scopes, and authorized on-demand decoders.
                          </p>
                        </div>
                        <Link
                          to="/codex"
                          className="px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all shrink-0"
                        >
                          <span>Open Full Studio</span>
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
                          <span className="text-xs font-bold text-gray-500 uppercase">System Default</span>
                          <div className="text-lg font-bold text-gray-900">DISABLED (OFF)</div>
                          <p className="text-xs text-gray-500">CodeX is an opt-in capability that never enables automatically on installation or upgrade.</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
                          <span className="text-xs font-bold text-gray-500 uppercase">Reversible Engine</span>
                          <div className="text-lg font-bold text-primary-700">0–9 Bijective Mapping</div>
                          <p className="text-xs text-gray-500">Maps 0-9 digits to unique symbols (e.g. 1250 → AZPQ) with decimal, negative, and version history support.</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
                          <span className="text-xs font-bold text-gray-500 uppercase">Scoped Authorization</span>
                          <div className="text-lg font-bold text-emerald-700">7-Tier Precedence</div>
                          <p className="text-xs text-gray-500">Precedence: Security &gt; System &gt; Business &gt; Dept &gt; Role &gt; User. Restrictive rules always win.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
                    className="rounded text-primary-600 focus:ring-primary-500"
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
                  className="px-4 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-2xs transition-colors"
                >
                  {editingLookup ? 'Update Lookup' : 'Create Lookup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Branch Add/Edit Modal */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <GitFork className="w-4 h-4 text-primary-600" />
                <h3 className="text-sm font-bold text-gray-900">
                  {editingBranch ? `Edit Branch — ${editingBranch.branch_name}` : 'Add New Campus / Branch'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBranchModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveBranch} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Branch Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={branchForm.branch_name}
                    onChange={(e) => setBranchForm({ ...branchForm, branch_name: e.target.value })}
                    placeholder={INSTITUTE_PLACEHOLDERS.branch_name}
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Branch Code</label>
                  <input
                    type="text"
                    value={branchForm.branch_code}
                    onChange={(e) => setBranchForm({ ...branchForm, branch_code: e.target.value.toUpperCase() })}
                    placeholder={INSTITUTE_PLACEHOLDERS.branch_code}
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg font-mono uppercase"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Address Line 1</label>
                  <input
                    type="text"
                    value={branchForm.address_line_1}
                    onChange={(e) => setBranchForm({ ...branchForm, address_line_1: e.target.value })}
                    placeholder={INSTITUTE_PLACEHOLDERS.address_line_1}
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={branchForm.city}
                    onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                    placeholder={INSTITUTE_PLACEHOLDERS.city}
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">PIN Code</label>
                  <input
                    type="text"
                    value={branchForm.pincode}
                    onChange={(e) => setBranchForm({ ...branchForm, pincode: e.target.value })}
                    placeholder={INSTITUTE_PLACEHOLDERS.pincode}
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mobile / Helpline</label>
                  <input
                    type="tel"
                    value={branchForm.phone}
                    onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                    placeholder={INSTITUTE_PLACEHOLDERS.phone}
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Branch Email</label>
                  <input
                    type="email"
                    value={branchForm.email}
                    onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                    placeholder={INSTITUTE_PLACEHOLDERS.email}
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_main_branch_chk"
                  checked={branchForm.is_main_branch}
                  onChange={(e) => setBranchForm({ ...branchForm, is_main_branch: e.target.checked })}
                  disabled={Boolean(editingBranch?.is_main_branch)}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="is_main_branch_chk" className="text-xs font-medium text-gray-700">
                  Designate as Primary / Main Branch
                </label>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={branchSaving}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
                >
                  {branchSaving ? 'Saving…' : editingBranch ? 'Update Branch' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
