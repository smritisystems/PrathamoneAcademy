/**
 * @file        MenuCustomizerModal.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.navigation
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-10
 * @updated     2026-11-26
 *
 * @description Comprehensive My Menu customization studio supporting role presets, HTML5 drag-and-drop reordering, mode selection, personal groups, and live preview.
 */

import React, { useState, useMemo } from 'react'
import {
  X,
  Pin,
  PinOff,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Save,
  FolderPlus,
  Folder,
  Trash2,
  Edit2,
  Check,
  Sparkles,
  Layers,
  LayoutTemplate,
  Sliders,
  ChevronRight,
  ChevronDown,
  Search,
  CheckCircle2,
  AlertCircle,
  GripVertical,
  Star,
  Shield,
  CreditCard,
  GraduationCap,
  UserCheck,
  Zap,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { extractApiErrorMessage } from '../../utils/errorTaxonomy'
import { useNavigationStore } from '../../store/navigationStore'
import { getAuthorizedModules } from '../../config/modules'
import { useBranding } from '../../config/branding'
import type { NavigationMode } from '../../types'

interface RolePreset {
  id: string
  title: string
  subtitle: string
  roleTag: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgLight: string
  badgeText: string
  items: string[]
}

const ROLE_PRESETS: RolePreset[] = [
  {
    id: 'admin',
    title: 'Director / School Admin',
    subtitle: 'Revenue, Student Strength, Faculty & Master Reports',
    roleTag: 'Director / Principal',
    icon: Shield,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgLight: 'bg-indigo-50/70 hover:bg-indigo-100/70 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800/60',
    badgeText: 'Complete Oversight',
    items: ['dashboard', 'fees', 'students', 'crm', 'academic', 'teachers', 'attendance', 'reports', 'settings'],
  },
  {
    id: 'accountant',
    title: 'Accountant / Cash Desk',
    subtitle: 'Counter Payments, Invoices, Defaulters & Registers',
    roleTag: 'Cashier / Finance',
    icon: CreditCard,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgLight: 'bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/60',
    badgeText: 'Fee Focused',
    items: ['dashboard', 'fees', 'fees_collection', 'fees_invoicing', 'fees_defaulters', 'fees_reports', 'reports'],
  },
  {
    id: 'teacher',
    title: 'Teacher / Faculty',
    subtitle: 'Daily Roll Call, Homework, Test Marks & Study Content',
    roleTag: 'Educator / Teacher',
    icon: GraduationCap,
    color: 'text-purple-600 dark:text-purple-400',
    bgLight: 'bg-purple-50/70 hover:bg-purple-100/70 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800/60',
    badgeText: 'Classroom Daily',
    items: ['dashboard', 'attendance_daily', 'homework', 'examinations', 'exam_marks', 'courses', 'students'],
  },
  {
    id: 'counselor',
    title: 'Front Desk / Admissions',
    subtitle: 'Inquiries, Lead Pipeline, Follow-ups & New Admissions',
    roleTag: 'Reception / CRM',
    icon: UserCheck,
    color: 'text-amber-600 dark:text-amber-400',
    bgLight: 'bg-amber-50/70 hover:bg-amber-100/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/60',
    badgeText: 'Front Desk Best',
    items: ['dashboard', 'crm_pipeline', 'crm_followups', 'students_admission', 'fees_collection', 'attendance'],
  },
]

export default function MenuCustomizerModal() {
  const branding = useBranding()
  const { user, selectedInstitutionId } = useAuthStore()
  const {
    isCustomizerOpen,
    closeCustomizer,
    navigationMode,
    setNavigationMode,
    pinnedItems,
    hiddenItems,
    customGroups,
    togglePinItem,
    pinItem,
    unpinItem,
    toggleHideItem,
    reorderPinnedItems,
    setPinnedItems,
    clearPinnedItems,
    addCustomGroup,
    renameCustomGroup,
    deleteCustomGroup,
    addItemToGroup,
    removeItemFromGroup,
    suggestions,
    acceptSuggestion,
    dismissSuggestion,
    institutionPolicy,
    savePreferences,
    resetToDefaults,
    isSaving,
  } = useNavigationStore()

  const [activeTab, setActiveTab] = useState<'modules' | 'groups' | 'suggestions' | 'preview'>('modules')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [newGroupName, setNewGroupName] = useState('')
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState('')
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [expandedSubmodules, setExpandedSubmodules] = useState<Set<string>>(new Set())
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [activePresetId, setActivePresetId] = useState<string | null>(null)

  const authorizedModules = useMemo(() => getAuthorizedModules(user), [user])

  if (!isCustomizerOpen) return null

  const handleSave = async () => {
    try {
      await savePreferences(selectedInstitutionId || 1)
      setStatusMessage({ text: 'Navigation preferences saved successfully!', type: 'success' })
      setTimeout(() => {
        setStatusMessage(null)
        closeCustomizer()
      }, 1000)
    } catch (err: any) {
      setStatusMessage({ text: extractApiErrorMessage(err, 'Failed to save navigation preferences'), type: 'error' })
    }
  }

  const handleReset = async () => {
    if (window.confirm('Reset your personal menu preferences to the institute role default?')) {
      try {
        await resetToDefaults(selectedInstitutionId || 1)
        setActivePresetId(null)
        setStatusMessage({ text: 'Preferences reset to role defaults', type: 'success' })
        setTimeout(() => setStatusMessage(null), 2000)
      } catch (err: any) {
        setStatusMessage({ text: 'Failed to reset preferences', type: 'error' })
      }
    }
  }

  // Apply a 1-click role preset
  const handleApplyPreset = (preset: RolePreset) => {
    setPinnedItems(preset.items)
    setNavigationMode('hybrid')
    setActivePresetId(preset.id)
    setStatusMessage({
      text: `Applied "${preset.title}" preset (${preset.items.length} shortcuts in Hybrid Mode)`,
      type: 'info',
    })
    setTimeout(() => setStatusMessage(null), 3000)
  }

  // Clear all pinned items
  const handleClearAllPinned = () => {
    if (pinnedItems.length === 0) return
    clearPinnedItems()
    setActivePresetId(null)
    setStatusMessage({ text: 'All pinned shortcuts cleared', type: 'info' })
    setTimeout(() => setStatusMessage(null), 2000)
  }

  // Toggle expand submodule
  const toggleExpandSubmodule = (modId: string) => {
    setExpandedSubmodules((prev) => {
      const next = new Set(prev)
      if (next.has(modId)) {
        next.delete(modId)
      } else {
        next.add(modId)
      }
      return next
    })
  }

  // Move pinned item up
  const handleMoveUp = (index: number) => {
    if (index <= 0) return
    const newOrder = [...pinnedItems]
    const temp = newOrder[index - 1]
    newOrder[index - 1] = newOrder[index]
    newOrder[index] = temp
    reorderPinnedItems(newOrder)
  }

  // Move pinned item down
  const handleMoveDown = (index: number) => {
    if (index >= pinnedItems.length - 1) return
    const newOrder = [...pinnedItems]
    const temp = newOrder[index + 1]
    newOrder[index + 1] = newOrder[index]
    newOrder[index] = temp
    reorderPinnedItems(newOrder)
  }

  // HTML5 Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }
    const newOrder = [...pinnedItems]
    const [movedItem] = newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, movedItem)
    reorderPinnedItems(newOrder)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // Filter modules
  const filteredModules = authorizedModules.filter((mod) => {
    if (selectedCategory !== 'all' && mod.category !== selectedCategory) return false
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      mod.label.toLowerCase().includes(q) ||
      mod.description.toLowerCase().includes(q) ||
      mod.subItems.some((s) => s.label.toLowerCase().includes(q))
    )
  })

  // Map of module by id
  const moduleMap = new Map(authorizedModules.map((m) => [m.id, m]))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-fadeIn"
      onClick={closeCustomizer}
    >
      <div
        className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Studio Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div
              style={{
                background: `linear-gradient(135deg, ${branding.colors.primary} 0%, ${branding.colors.secondary} 100%)`,
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0"
            >
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>My Menu & Navigation Studio</span>
                <span className="text-[10px] px-2 py-0.5 bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 rounded-full font-bold">
                  Personalized
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure your navigation mode, apply role-based presets, and customize pinned quick shortcuts.
              </p>
            </div>
          </div>

          <button
            onClick={closeCustomizer}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Mode Selector Bar */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Select Navigation Experience Mode
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              Choose how your sidebar renders daily shortcuts
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Standard Mode Card */}
            <div
              onClick={() => setNavigationMode('standard')}
              className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                navigationMode === 'standard'
                  ? 'border-primary-600 bg-primary-50/60 dark:bg-primary-950/30 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  A. Standard Menu
                </span>
                {navigationMode === 'standard' && (
                  <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Full institutional hierarchy with all authorized sections and expandable submenus.
              </p>
            </div>

            {/* Hybrid Mode Card (RECOMMENDED) */}
            <div
              onClick={() => setNavigationMode('hybrid')}
              className={`p-3 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                navigationMode === 'hybrid'
                  ? 'border-primary-600 bg-primary-50/60 dark:bg-primary-950/30 shadow-xs ring-1 ring-primary-500'
                  : 'border-amber-300/80 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10 hover:border-amber-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    B. Hybrid Menu
                  </span>
                  <span className="px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-extrabold text-[9px] rounded uppercase tracking-wider flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    Recommended
                  </span>
                </div>
                {navigationMode === 'hybrid' && (
                  <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Fastest daily productivity: Pinned My Menu shortcuts stay on top, with standard menu below.
              </p>
            </div>

            {/* My Menu Only Card */}
            <div
              onClick={() => {
                if (institutionPolicy.allow_my_menu_only) {
                  setNavigationMode('my_menu_only')
                }
              }}
              className={`p-3 rounded-2xl border-2 transition-all ${
                !institutionPolicy.allow_my_menu_only
                  ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800'
                  : navigationMode === 'my_menu_only'
                  ? 'border-primary-600 bg-primary-50/60 dark:bg-primary-950/30 shadow-xs cursor-pointer'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    C. My Menu Only
                  </span>
                  <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[9px] rounded">
                    Focused
                  </span>
                </div>
                {navigationMode === 'my_menu_only' && (
                  <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Clean, distraction-free workspace showing only your pinned shortcuts. Best for dedicated desks.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('modules')}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'modules'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Modules & Shortcuts ({pinnedItems.length} Pinned)</span>
          </button>

          <button
            onClick={() => setActiveTab('groups')}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'groups'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>Personal Groups ({customGroups.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('suggestions')}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'suggestions'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Intelligent Suggestions</span>
            {suggestions.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px]">
                {suggestions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'preview'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <LayoutTemplate className="w-4 h-4" />
            <span>Live Sidebar Preview</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
          {/* TAB 1: MODULES & SHORTCUTS */}
          {activeTab === 'modules' && (
            <div className="space-y-4">
              {/* 1-Click Role-Based Quick Presets Ribbon */}
              <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                      Recommended 1-Click Setup Presets
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded font-bold">
                      Non-Technical Friendly
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Click any role to instantly configure best-suited shortcuts
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {ROLE_PRESETS.map((preset) => {
                    const PresetIcon = preset.icon
                    const isSelected = activePresetId === preset.id
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className={`text-left p-2.5 rounded-xl border transition-all relative flex flex-col justify-between group ${preset.bgLight} ${
                          isSelected ? 'ring-2 ring-primary-500 shadow-xs' : ''
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              {preset.roleTag}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                              {preset.badgeText}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <PresetIcon className={`w-4 h-4 ${preset.color} flex-shrink-0`} />
                            <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {preset.title}
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {preset.subtitle}
                          </p>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] font-bold">
                          <span className="text-slate-400">{preset.items.length} Shortcuts</span>
                          <span className="text-primary-600 dark:text-primary-400 group-hover:underline flex items-center gap-0.5">
                            {isSelected ? '✓ Active Preset' : 'Apply Preset →'}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Two Column Layout: Catalog & Pinned Items */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left Column: Authorized Modules Catalog */}
                <div className="lg:col-span-7 flex flex-col space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
                      1. Authorized Modules Catalog
                    </span>
                    <span className="text-xs text-slate-400">
                      {filteredModules.length} modules available
                    </span>
                  </div>

                  {/* Filter and Search */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search modules or sub-pages..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none font-medium"
                    >
                      <option value="all">All Categories</option>
                      <option value="core">Core</option>
                      <option value="academic">Academic</option>
                      <option value="students">Students & CRM</option>
                      <option value="finance">Finance</option>
                      <option value="workforce">Workforce</option>
                      <option value="operations">Operations</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {/* Modules List with Collapsible Sub-Items */}
                  <div className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                    {filteredModules.map((mod) => {
                      const IconComp = mod.icon
                      const isPinned = pinnedItems.includes(mod.id)
                      const isHidden = hiddenItems.includes(mod.id)
                      const hasSubItems = mod.subItems && mod.subItems.length > 0
                      const isExpanded = expandedSubmodules.has(mod.id)
                      const pinnedSubCount = hasSubItems
                        ? mod.subItems.filter((s) => pinnedItems.includes(s.id)).length
                        : 0

                      return (
                        <div
                          key={mod.id}
                          className={`p-2.5 rounded-2xl border transition-all ${
                            isPinned
                              ? 'border-primary-300 dark:border-primary-800 bg-primary-50/20 dark:bg-primary-950/20'
                              : isHidden
                              ? 'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50 dark:bg-slate-950'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 flex-shrink-0">
                                <IconComp className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {mod.label}
                                </div>
                                <div className="text-[10px] text-slate-400 capitalize flex items-center gap-2">
                                  <span>{mod.category}</span>
                                  {pinnedSubCount > 0 && (
                                    <span className="text-primary-600 font-bold">
                                      • {pinnedSubCount} sub-shortcuts pinned
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Quick Pin / Hide Actions */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {institutionPolicy.allow_hiding && (
                                <button
                                  type="button"
                                  onClick={() => toggleHideItem(mod.id)}
                                  title={isHidden ? 'Unhide from standard menu' : 'Hide from standard menu'}
                                  className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                                    isHidden
                                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-300'
                                      : 'text-slate-400 hover:text-slate-700 border-transparent hover:border-slate-200'
                                  }`}
                                >
                                  {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => togglePinItem(mod.id)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                                  isPinned
                                    ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                                <span>{isPinned ? 'Pinned' : 'Pin'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Collapsible Sub-Page Direct Shortcuts (Rule 014 Anti-Bloat) */}
                          {hasSubItems && (
                            <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                              <button
                                type="button"
                                onClick={() => toggleExpandSubmodule(mod.id)}
                                className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors py-0.5"
                              >
                                <span>
                                  {isExpanded
                                    ? `Hide ${mod.subItems.length} sub-page shortcuts`
                                    : `View ${mod.subItems.length} sub-page shortcuts`}
                                </span>
                                <ChevronDown
                                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                    isExpanded ? 'rotate-180 text-primary-600' : ''
                                  }`}
                                />
                                {pinnedSubCount > 0 && !isExpanded && (
                                  <span className="px-1.5 py-0.2 bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300 rounded font-bold text-[9px]">
                                    {pinnedSubCount} active
                                  </span>
                                )}
                              </button>

                              {isExpanded && (
                                <div className="flex flex-wrap gap-1 mt-1.5 pt-1 border-t border-dashed border-slate-200 dark:border-slate-800 animate-fadeIn">
                                  {mod.subItems.map((sub) => {
                                    const isSubPinned = pinnedItems.includes(sub.id)
                                    return (
                                      <button
                                        key={sub.id}
                                        type="button"
                                        onClick={() => togglePinItem(sub.id)}
                                        className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors border ${
                                          isSubPinned
                                            ? 'bg-primary-100 dark:bg-primary-950 text-primary-800 dark:text-primary-300 border-primary-300 dark:border-primary-700 font-bold'
                                            : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                                        }`}
                                      >
                                        {isSubPinned ? '✓ ' : '+ '}
                                        {sub.label}
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Right Column: Pinned Items & HTML5 Drag/Arrow Reordering */}
                <div className="lg:col-span-5 flex flex-col space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
                      2. Pinned Shortcuts & Sequence ({pinnedItems.length})
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleClearAllPinned}
                        disabled={pinnedItems.length === 0}
                        className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 disabled:opacity-40 transition-colors"
                        title="Clear all pinned shortcuts"
                      >
                        Clear All
                      </button>
                      <span className="text-slate-300">|</span>
                      <span className="text-[11px] text-slate-400">Drag grip or arrows</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex-1 flex flex-col max-h-[465px] overflow-y-auto custom-scrollbar space-y-1.5">
                    {pinnedItems.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 my-auto">
                        <PinOff className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No pinned items selected</p>
                        <p className="text-[11px] mt-1 max-w-xs mx-auto">
                          Click any 1-Click Role Preset above, or pin modules from the catalog on the left.
                        </p>
                      </div>
                    ) : (
                      pinnedItems.map((itemId, idx) => {
                        // Lookup title
                        let title = itemId
                        const directMod = moduleMap.get(itemId)
                        if (directMod) {
                          title = directMod.label
                        } else {
                          // Look inside subItems
                          for (const m of authorizedModules) {
                            const sub = m.subItems.find((s) => s.id === itemId)
                            if (sub) {
                              title = `${m.label} → ${sub.label}`
                              break
                            }
                          }
                        }

                        const isDragged = draggedIndex === idx
                        const isOver = dragOverIndex === idx

                        return (
                          <div
                            key={itemId}
                            draggable
                            onDragStart={(e) => handleDragStart(e, idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDrop={() => handleDrop(idx)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-move select-none group ${
                              isDragged
                                ? 'opacity-30 border-dashed border-primary-500 bg-primary-50/40'
                                : isOver
                                ? 'border-2 border-primary-600 bg-primary-50/80 dark:bg-primary-950/60 scale-[1.01]'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <GripVertical className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 cursor-grab active:cursor-grabbing flex-shrink-0" />
                              <span className="w-4 text-center text-xs font-mono font-bold text-slate-400">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {title}
                              </span>
                            </div>

                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleMoveUp(idx)}
                                disabled={idx === 0}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"
                                title="Move up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveDown(idx)}
                                disabled={idx === pinnedItems.length - 1}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"
                                title="Move down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => unpinItem(itemId)}
                                className="p-1 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-0.5"
                                title="Unpin"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERSONAL GROUPS */}
          {activeTab === 'groups' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Create Custom Navigation Groups
                  </h3>
                  <p className="text-xs text-slate-500">
                    Group your shortcuts under personal headers (e.g., &ldquo;Daily Tasks&rdquo;, &ldquo;Fee Desk&rdquo;). This organizes your menu without renaming official modules.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="New Group Name..."
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newGroupName.trim()) {
                        addCustomGroup(newGroupName)
                        setNewGroupName('')
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 text-white font-bold text-xs hover:bg-primary-700 transition-colors shadow-xs"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Add Group</span>
                  </button>
                </div>
              </div>

              {/* Groups List */}
              {customGroups.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Folder className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold">No custom groups created yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Add a group above to organize your pinned shortcuts into personalized categories
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customGroups.map((grp) => (
                    <div
                      key={grp.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b pb-2.5 border-slate-100 dark:border-slate-800">
                        {editingGroupId === grp.id ? (
                          <div className="flex items-center gap-2 flex-1 mr-2">
                            <input
                              type="text"
                              value={editingGroupName}
                              onChange={(e) => setEditingGroupName(e.target.value)}
                              className="px-2 py-1 rounded-lg border border-primary-500 text-xs font-bold w-full"
                            />
                            <button
                              onClick={() => {
                                renameCustomGroup(grp.id, editingGroupName)
                                setEditingGroupId(null)
                              }}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                            <Folder className="w-4 h-4 text-primary-500" />
                            <span>{grp.name}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGroupId(grp.id)
                              setEditingGroupName(grp.name)
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded"
                            title="Rename"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCustomGroup(grp.id)}
                            className="p-1 text-rose-400 hover:text-rose-600 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Items in this group */}
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-slate-400">Assigned Shortcuts:</div>
                        {grp.items.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No shortcuts assigned to this group</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {grp.items.map((itId) => {
                              const mod = moduleMap.get(itId)
                              return (
                                <span
                                  key={itId}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium"
                                >
                                  <span>{mod ? mod.label : itId}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeItemFromGroup(grp.id, itId)}
                                    className="text-slate-400 hover:text-rose-500"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Add item dropdown to this group */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              addItemToGroup(grp.id, e.target.value)
                              e.target.value = ''
                            }
                          }}
                          className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
                        >
                          <option value="">+ Add module to this group...</option>
                          {authorizedModules.map((m) => (
                            <option key={m.id} value={m.id} disabled={grp.items.includes(m.id)}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INTELLIGENT SUGGESTIONS */}
          {activeTab === 'suggestions' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                    Adaptive Navigation Intelligence Engine
                  </h4>
                  <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                    Recommendations are computed strictly from your institutional workspace visits over the last 7 to 30 days. No recommendations are applied automatically without your explicit consent.
                  </p>
                </div>
              </div>

              {suggestions.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Your personal menu is perfectly optimized!
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    No pending suggestions right now. As you use the software, smart tips will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {suggestions.map((sug) => (
                    <div
                      key={sug.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              sug.type === 'pin_frequent'
                                ? 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                                : sug.type === 'add_recent'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {sug.badge}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white">{sug.title}</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-1">{sug.description}</p>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => acceptSuggestion(sug, selectedInstitutionId || 1)}
                          className="flex-1 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
                        >
                          {sug.action_label}
                        </button>
                        <button
                          type="button"
                          onClick={() => dismissSuggestion(sug.id, selectedInstitutionId || 1)}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-semibold transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LIVE PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Interactive Navigation Preview
                  </h4>
                  <p className="text-xs text-slate-400">
                    Mode active: <strong className="capitalize">{navigationMode.replace('_', ' ')}</strong>
                  </p>
                </div>
              </div>

              {/* Mock Sidebar Frame */}
              <div className="max-w-xs mx-auto bg-[#0f172a] text-white rounded-3xl p-4 shadow-2xl border border-slate-800 space-y-3 font-sans">
                {/* Brand Preview */}
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
                  <div
                    style={{
                      background: `linear-gradient(135deg, ${branding.colors.primary} 0%, ${branding.colors.secondary} 100%)`,
                    }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                  >
                    {branding.monogram}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{branding.academyName}</div>
                    <div className="text-[10px] text-slate-400 truncate">{branding.tagline}</div>
                  </div>
                </div>

                {/* Items based on mode */}
                <div className="space-y-1 text-xs max-h-72 overflow-y-auto custom-scrollbar pr-1">
                  {navigationMode === 'my_menu_only' ? (
                    <>
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        My Shortcuts Only
                      </div>
                      {pinnedItems.map((id) => {
                        const m = moduleMap.get(id)
                        return (
                          <div
                            key={id}
                            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-slate-800/60 text-slate-200"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                            <span className="truncate">{m ? m.label : id}</span>
                          </div>
                        )
                      })}
                    </>
                  ) : navigationMode === 'hybrid' ? (
                    <>
                      <div className="px-2 py-1 text-[10px] font-bold text-primary-400 uppercase tracking-wider flex items-center justify-between">
                        <span>★ My Menu</span>
                        <span className="text-[9px] lowercase bg-primary-950 px-1.5 rounded">hybrid</span>
                      </div>
                      {pinnedItems.map((id) => {
                        const m = moduleMap.get(id)
                        return (
                          <div
                            key={id}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary-950/40 text-primary-200 border border-primary-900/50"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span className="truncate">{m ? m.label : id}</span>
                          </div>
                        )
                      })}

                      <div className="px-2 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        All Modules
                      </div>
                      {authorizedModules.slice(0, 4).map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-slate-400 hover:text-white"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          <span className="truncate">{m.label}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Standard Navigation
                      </div>
                      {authorizedModules.slice(0, 7).map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          <span className="truncate">{m.label}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-rose-600 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Defaults</span>
          </button>

          <div className="flex items-center gap-3">
            {statusMessage && (
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                  statusMessage.type === 'success'
                    ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300'
                    : statusMessage.type === 'info'
                    ? 'text-primary-700 bg-primary-50 dark:bg-primary-950 dark:text-primary-300'
                    : 'text-rose-700 bg-rose-50 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {statusMessage.text}
              </span>
            )}

            <button
              type="button"
              onClick={closeCustomizer}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save & Apply'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
