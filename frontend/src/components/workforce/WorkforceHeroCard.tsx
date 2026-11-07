/**
 * @file        WorkforceHeroCard.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.workforce
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
 * @description Enterprise reusable Hero Card banner for dedicated Teacher and Staff profiles with breadcrumbs, status badges, metrics chips, and action menus.
 */

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ChevronRight,
  Mail,
  Phone,
  Edit,
  Lock,
  ChevronDown,
  Printer,
  Calendar,
  Layers,
  Clock,
  Briefcase,
  Building,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  UserCheck,
} from 'lucide-react'

export interface WorkforceHeroStat {
  label: string
  value: string | number
  icon?: React.ComponentType<{ className?: string }>
}

export interface WorkforceHeroCardProps {
  type: 'teacher' | 'staff'
  name: string
  avatarUrl?: string | null
  code: string
  designation: string
  department?: string
  specialization?: string
  email: string
  phone?: string
  status: string
  stats: WorkforceHeroStat[]
  isEditMode?: boolean
  onEdit?: () => void
  onAction?: (actionKey: string) => void
}

export default function WorkforceHeroCard({
  type,
  name,
  avatarUrl,
  code,
  designation,
  department,
  specialization,
  email,
  phone,
  status,
  stats,
  isEditMode,
  onEdit,
  onAction,
}: WorkforceHeroCardProps) {
  const [showDropdown, setShowDropdown] = useState(false)

  const parentLabel = type === 'teacher' ? 'Teachers' : 'Staff'
  const parentPath = type === 'teacher' ? '/teachers' : '/staff'
  const profileLabel = type === 'teacher' ? 'Teacher Profile' : 'Staff Profile'

  // Format Status Badge
  const normalizedStatus = status.toLowerCase()
  let statusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300'
  let statusLabel = 'Active'

  if (normalizedStatus === 'on_leave' || normalizedStatus === 'leave') {
    statusBadgeClass = 'bg-amber-100 text-amber-800 border-amber-300'
    statusLabel = 'On Leave'
  } else if (['resigned', 'terminated', 'contract_ended', 'departed'].includes(normalizedStatus)) {
    statusBadgeClass = 'bg-rose-100 text-rose-800 border-rose-300'
    statusLabel = normalizedStatus.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  } else if (['inactive', 'draft'].includes(normalizedStatus)) {
    statusBadgeClass = 'bg-slate-100 text-slate-700 border-slate-300'
    statusLabel = 'Inactive'
  } else if (normalizedStatus === 'upcoming_joining' || normalizedStatus === 'selected') {
    statusBadgeClass = 'bg-blue-100 text-blue-800 border-blue-300'
    statusLabel = 'Upcoming Joining'
  }

  return (
    <div className="space-y-3">
      {/* ─── Breadcrumb Navigation ─────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <Link to={parentPath} className="hover:text-indigo-600 transition-colors">
          {parentLabel}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-800 font-semibold">{profileLabel}</span>
      </nav>

      {/* ─── Hero Card Banner ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left: Avatar & Identity Details */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-indigo-100 shadow-xs"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-xl sm:text-2xl shadow-xs">
                  {name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {name}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadgeClass}`}
                >
                  {statusLabel}
                </span>
              </div>

              <div className="text-xs sm:text-sm font-semibold text-slate-600 flex flex-wrap items-center gap-1.5">
                <span className="text-indigo-700 font-mono font-bold">{code}</span>
                <span className="text-slate-300">•</span>
                <span>{designation}</span>
                {(specialization || department) && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-700">{specialization || department}</span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-slate-500">
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{email}</span>
                </a>
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{phone}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Right: Summary Metrics & Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 lg:gap-6 self-start lg:self-center">
            {/* Quick Metrics Chips */}
            <div className="flex flex-wrap items-center gap-3">
              {stats.map((s, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2 text-center min-w-[90px]"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {s.label}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 relative">
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    if (isEditMode === false) {
                      toast.error('Locked in View Mode: Please activate Edit Mode above to modify employee records.')
                      return
                    }
                    onEdit()
                  }}
                  title={isEditMode === false ? 'Locked in View Mode: Activate Edit Mode above to modify' : 'Edit profile'}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors ${
                    isEditMode === false
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed hover:bg-slate-100'
                      : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white'
                  }`}
                >
                  {isEditMode === false ? (
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <Edit className="w-3.5 h-3.5" />
                  )}
                  <span>{isEditMode === false ? 'Edit (Locked)' : 'Edit'}</span>
                </button>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs flex items-center gap-1 transition-colors"
                >
                  <span>Actions</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowDropdown(false)}
                    />
                    <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDropdown(false)
                          if (isEditMode === false) {
                            toast.error('Locked in View Mode: Please activate Edit Mode above before updating status.')
                            return
                          }
                          onAction?.('lifecycle')
                        }}
                        title={isEditMode === false ? 'Locked in View Mode: Activate Edit Mode to update status' : undefined}
                        className={`w-full text-left px-3.5 py-2 flex items-center gap-2 font-medium ${
                          isEditMode === false
                            ? 'text-slate-400 cursor-not-allowed'
                            : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                        }`}
                      >
                        {isEditMode === false ? (
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>Update Employment Status {isEditMode === false ? '(Locked)' : ''}</span>
                      </button>

                      {type === 'teacher' && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowDropdown(false)
                            if (isEditMode === false) {
                              toast.error('Locked in View Mode: Please activate Edit Mode above before assigning batches.')
                              return
                            }
                            onAction?.('assign')
                          }}
                          title={isEditMode === false ? 'Locked in View Mode: Activate Edit Mode to assign batch' : undefined}
                          className={`w-full text-left px-3.5 py-2 flex items-center gap-2 font-medium ${
                            isEditMode === false
                              ? 'text-slate-400 cursor-not-allowed'
                              : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                          }`}
                        >
                          {isEditMode === false ? (
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <Layers className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>Assign Batch & Subject {isEditMode === false ? '(Locked)' : ''}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setShowDropdown(false)
                          onAction?.('print')
                        }}
                        className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 font-medium"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-400" />
                        <span>Print Employee Dossier</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

