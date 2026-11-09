/**
 * @file        NavigationSettingsPanel.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.settings
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
 * @description Institute administrative settings panel managing global menu personalization policies and role default menus.
 */

import React, { useState, useEffect } from 'react'
import {
  Compass,
  Sliders,
  ShieldCheck,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from 'lucide-react'
import { useAuthStore, isUserAdmin } from '../../store/authStore'
import { navigationApi } from '../../api/endpoints'
import type { NavigationPolicy, NavigationMode } from '../../types'
import { CANONICAL_MODULE_REGISTRY } from '../../config/modules'

export default function NavigationSettingsPanel() {
  const { user, selectedInstitutionId } = useAuthStore()
  const isAdmin = isUserAdmin(user)

  const [policy, setPolicy] = useState<NavigationPolicy>({
    enable_user_customization: true,
    default_navigation_mode: 'standard',
    allow_my_menu_only: true,
    allow_reordering: true,
    allow_hiding: true,
    enable_usage_recommendations: true,
    usage_analysis_period_days: 30,
    role_default_menus: {
      admin: ['dashboard', 'fees', 'students', 'crm', 'academic', 'teachers', 'attendance', 'reports', 'settings'],
      principal: ['dashboard', 'fees', 'students', 'teachers', 'academic', 'attendance', 'examinations', 'reports', 'settings'],
      accountant: ['dashboard', 'fees', 'reports'],
      teacher: ['dashboard', 'students', 'attendance', 'examinations', 'courses', 'reports'],
      counselor: ['dashboard', 'crm', 'students', 'reports'],
      staff: ['dashboard', 'students', 'attendance', 'forms', 'communication'],
    },
  })

  const [selectedRole, setSelectedRole] = useState<string>('admin')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    loadPolicy()
  }, [selectedInstitutionId])

  const loadPolicy = async () => {
    setIsLoading(true)
    try {
      const res = await navigationApi.getAdminPolicy(selectedInstitutionId || 1)
      if (res?.data?.policy) {
        setPolicy(res.data.policy)
      }
    } catch (e) {
      console.error('Failed to load institute navigation policy:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSavePolicy = async () => {
    setIsSaving(true)
    try {
      await navigationApi.updateAdminPolicy(
        {
          ...policy,
          reason: 'Updated via Institute Navigation Settings Workspace',
        },
        selectedInstitutionId || 1
      )
      setStatusMsg({ text: 'Navigation governance policy saved successfully', type: 'success' })
      setTimeout(() => setStatusMsg(null), 3000)
    } catch (err: any) {
      setStatusMsg({ text: err?.message || 'Failed to save navigation policy', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetAllUsers = async () => {
    if (
      window.confirm(
        'WARNING: This will reset all staff and teachers in the institution to the role-default menus. Continue?'
      )
    ) {
      try {
        const res = await navigationApi.resetAllUsers(selectedInstitutionId || 1)
        setStatusMsg({ text: res.data.message, type: 'success' })
        setTimeout(() => setStatusMsg(null), 4000)
      } catch (err: any) {
        setStatusMsg({ text: 'Failed to reset all users', type: 'error' })
      }
    }
  }

  const toggleRoleDefaultItem = (role: string, moduleId: string) => {
    const current = policy.role_default_menus[role] || []
    const updated = current.includes(moduleId)
      ? current.filter((id) => id !== moduleId)
      : [...current, moduleId]

    setPolicy((prev) => ({
      ...prev,
      role_default_menus: {
        ...prev.role_default_menus,
        [role]: updated,
      },
    }))
  }

  if (!isAdmin) {
    return (
      <div className="p-6 text-center text-slate-500">
        <Lock className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        <p className="font-semibold text-sm">Administrative authorization required to configure navigation policies.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0 shadow-xs">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Institutional Navigation & Menu Governance
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Establish default navigation modes, role default menus, and control personalized menu privileges.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {statusMsg && (
            <span
              className={`text-xs font-semibold ${
                statusMsg.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {statusMsg.text}
            </span>
          )}

          <button
            type="button"
            onClick={handleSavePolicy}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Policy'}</span>
          </button>
        </div>
      </div>

      {/* Global Governance Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Permissions & Feature Toggles */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b pb-3 border-slate-100 dark:border-slate-800">
            <Sliders className="w-4 h-4 text-primary-600" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              User Personalization Permissions
            </h4>
          </div>

          <div className="space-y-3 text-xs">
            {/* Toggle: Enable Customization */}
            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200">Enable User Menu Personalization</div>
                <div className="text-[11px] text-slate-400">Allow users to pin, reorder, and hide menu items</div>
              </div>
              <input
                type="checkbox"
                checked={policy.enable_user_customization}
                onChange={(e) => setPolicy({ ...policy, enable_user_customization: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
            </label>

            {/* Toggle: Allow My Menu Only */}
            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200">Allow &ldquo;My Menu Only&rdquo; Mode</div>
                <div className="text-[11px] text-slate-400">Permit users to completely hide the standard menu</div>
              </div>
              <input
                type="checkbox"
                checked={policy.allow_my_menu_only}
                onChange={(e) => setPolicy({ ...policy, allow_my_menu_only: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
            </label>

            {/* Toggle: Allow Hiding */}
            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200">Allow Module Hiding</div>
                <div className="text-[11px] text-slate-400">Allow users to hide unwanted authorized modules</div>
              </div>
              <input
                type="checkbox"
                checked={policy.allow_hiding}
                onChange={(e) => setPolicy({ ...policy, allow_hiding: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
            </label>

            {/* Toggle: Recommendations */}
            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200">Enable Adaptive Usage Recommendations</div>
                <div className="text-[11px] text-slate-400">Recommend frequently visited modules based on usage telemetry</div>
              </div>
              <input
                type="checkbox"
                checked={policy.enable_usage_recommendations}
                onChange={(e) => setPolicy({ ...policy, enable_usage_recommendations: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
            </label>
          </div>
        </div>

        {/* Card 2: Institute Defaults & Emergency Reset */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b pb-3 border-slate-100 dark:border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Default Experience & Reset Controls
            </h4>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Default Navigation Mode for New Users
              </label>
              <select
                value={policy.default_navigation_mode}
                onChange={(e) => setPolicy({ ...policy, default_navigation_mode: e.target.value as NavigationMode })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              >
                <option value="standard">Standard Menu (Full Hierarchy)</option>
                <option value="hybrid">Hybrid Menu (My Menu on top + Standard below)</option>
                <option value="my_menu_only">My Menu Only (Curated workspace)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Telemetry Analysis Period (Days)
              </label>
              <input
                type="number"
                min={7}
                max={90}
                value={policy.usage_analysis_period_days}
                onChange={(e) => setPolicy({ ...policy, usage_analysis_period_days: Number(e.target.value) || 30 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleResetAllUsers}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors border border-rose-200 dark:border-rose-900"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Reset All User Custom Menus to Role Defaults</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Role-Based Default Menus Matrix */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-3 border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Role-Based Default Menu Configuration
            </h4>
            <p className="text-[11px] text-slate-400">
              Select which modules appear pinned by default when a new user in this role logs in.
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['admin', 'principal', 'accountant', 'teacher', 'counselor', 'staff'].map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition-colors ${
                  selectedRole === role
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Modules check grid for selected role */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-2">
          {CANONICAL_MODULE_REGISTRY.filter((m) => !m.sysadminOnly).map((mod) => {
            const roleItems = policy.role_default_menus[selectedRole] || []
            const isChecked = roleItems.includes(mod.id)

            return (
              <div
                key={mod.id}
                onClick={() => toggleRoleDefaultItem(selectedRole, mod.id)}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  isChecked
                    ? 'bg-primary-50/60 dark:bg-primary-950/30 border-primary-300 dark:border-primary-800'
                    : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="min-w-0 pr-1">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {mod.label}
                  </div>
                  <div className="text-[10px] text-slate-400 capitalize">{mod.category}</div>
                </div>

                <div
                  className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 ${
                    isChecked
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
