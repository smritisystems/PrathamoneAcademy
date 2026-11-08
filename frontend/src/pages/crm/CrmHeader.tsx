/**
 * @file        CrmHeader.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pages.crm
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-08
 * @updated     2026-11-08
 *
 * @description Unified CRM Workspace Header with 9 dedicated sub-navigation tabs, Training Mode pill indicator, View-First Edit Mode governance, and page-level action triggers.
 */

import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Users, Layers, Clock, Calendar, BarChart2,
  Settings as SettingsIcon, Plus, RefreshCw, AlertTriangle,
  FolderKanban, Share2, Megaphone, FileSpreadsheet, Lock
} from 'lucide-react'
import { useEnvironmentStore } from '../../store/environmentStore'
import { useEditModeStore } from '../../store/editModeStore'
import { EditModeBar, LockedButton } from '../../components/common'

export interface CrmHeaderProps {
  title: string
  subtitle: string
  activeTab: 'overview' | 'all' | 'pipeline' | 'followups' | 'counselling' | 'sources' | 'campaigns' | 'reports' | 'settings'
  onNewEnquiryClick?: () => void
  onRefresh?: () => void
  isRefreshing?: boolean
  extraActions?: React.ReactNode
}

export default function CrmHeader({
  title,
  subtitle,
  activeTab,
  onNewEnquiryClick,
  onRefresh,
  isRefreshing = false,
  extraActions,
}: CrmHeaderProps) {
  const { isTrainingMode, activeDatasetVersion } = useEnvironmentStore()
  const editScope = 'crm:leads'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])

  const navItems = [
    { key: 'overview', label: 'Overview', to: '/leads', icon: BarChart2 },
    { key: 'all', label: 'All Leads', to: '/leads/all', icon: Users },
    { key: 'pipeline', label: 'Lead Pipeline', to: '/leads/pipeline', icon: Layers },
    { key: 'followups', label: 'Follow-ups', to: '/leads/follow-ups', icon: Clock },
    { key: 'counselling', label: 'Counselling & Demo', to: '/leads/counselling', icon: Calendar },
    { key: 'sources', label: 'Lead Sources', to: '/leads/sources', icon: Share2 },
    { key: 'campaigns', label: 'Campaigns', to: '/leads/campaigns', icon: Megaphone },
    { key: 'reports', label: 'Reports', to: '/leads/reports', icon: FileSpreadsheet },
    { key: 'settings', label: 'Settings', to: '/leads/settings', icon: SettingsIcon },
  ]

  return (
    <div className="space-y-4 print:hidden">
      {/* ─── RULE 010 SCOPED EDIT MODE BAR ──────────────────────────────── */}
      <EditModeBar
        scope={editScope}
        title="Lead Management & CRM Workspaces"
      />

      {/* ─── HEADER TITLE & ACTIONS ROW ─────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{title}</h1>
            {isTrainingMode && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                <AlertTriangle className="w-3 h-3 text-amber-600 animate-pulse" />
                TRAINING MODE ({activeDatasetVersion})
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 transition-colors disabled:opacity-50"
              title="Refresh CRM records"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}

          {extraActions}

          {onNewEnquiryClick && (
            <LockedButton
              isEditMode={isEditMode}
              onClick={onNewEnquiryClick}
              icon={Plus}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              New Enquiry
            </LockedButton>
          )}
        </div>
      </div>

      {/* ─── 9 SUBMENU DEDICATED WORKSPACE TABS ───────────────────────────── */}
      <div className="overflow-x-auto pb-1 -mx-1 px-1 custom-scrollbar">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl w-max border border-slate-200/60 shadow-2xs">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.key
            return (
              <Link
                key={item.key}
                to={item.to}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-primary-700 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
