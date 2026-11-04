/**
 * @file        Footer.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-04
 * @updated     2026-11-04
 *
 * @description Slim, compact, full-width application footer displaying tenant branch, current route, product edition, and live system metrics.
 */

import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { institutionsApi } from '../api/endpoints'
import { APP_CONFIG } from '../config/appConfig'

/**
 * Dynamically resolves the human-readable page / menu title from routing and query state.
 */
export function resolvePageTitle(pathname: string, search: string): string {
  const cleanPath = pathname.replace(/\/+$/, '') || '/'

  // Dynamic academic tab routes
  if (cleanPath === '/academic' || cleanPath.startsWith('/academic/')) {
    const params = new URLSearchParams(search)
    const tab = params.get('tab')
    switch (tab) {
      case 'boards':
        return 'Boards'
      case 'classes':
        return 'Classes / Standards'
      case 'subjects':
        return 'Subjects'
      case 'batches':
        return 'Batches'
      case 'timetable':
        return 'Timetable'
      case 'enrollment':
        return 'Enrollment'
      case 'reports':
        return 'Academic Reports'
      case 'settings':
        return 'Academic Settings'
      default:
        return 'Academic Structure'
    }
  }

  // Exact known menu / page paths
  const knownRoutes: Record<string, string> = {
    '/': 'Dashboard',
    '/dashboard': 'Dashboard',
    '/student/dashboard': 'Student Portal',
    '/student-portal': 'Student Portal',
    '/students': 'Students',
    '/students/add': 'Admissions',
    '/attendance': 'Attendance',
    '/examinations': 'Tests & Results',
    '/fees': 'Fees & Payments',
    '/fees/import': 'Fee Register Import',
    '/import/fee-register': 'Fee Register Import',
    '/courses': 'Study Materials',
    '/standards': 'Classes / Standards',
    '/batches': 'Batches',
    '/subjects': 'Subjects',
    '/payments': 'Payments',
    '/reports': 'Reports',
    '/import-export': 'Import & Export',
    '/forms': 'Print Forms & KYC',
    '/users': 'Users & Roles',
    '/login': 'Sign In',
  }

  if (knownRoutes[cleanPath]) {
    return knownRoutes[cleanPath]
  }

  // Parameterized dynamic routes
  if (cleanPath.startsWith('/students/')) {
    return 'Student Profile'
  }
  if (cleanPath.startsWith('/users/')) {
    return 'User Profile'
  }
  if (cleanPath.startsWith('/fees/collect/')) {
    return 'Fee Collection'
  }
  if (cleanPath.startsWith('/receipts/')) {
    return 'Fee Receipt'
  }

  // Dynamic fallback: capitalize URL segments
  const segments = cleanPath.split('/').filter(Boolean)
  if (segments.length > 0) {
    const last = segments[segments.length - 1]
    return last
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  return 'Workspace'
}

/**
 * Tracks online network connectivity state via browser events.
 */
function useLiveConnectionStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true
  })

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

export default function Footer() {
  const location = useLocation()
  const { user, selectedInstitutionId } = useAuthStore()
  const isOnline = useLiveConnectionStatus()

  // Cached institution listing for tenant & branch metadata
  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  })

  const activeInstitution = useMemo(() => {
    return institutions.find((i) => i.id === selectedInstitutionId) ?? institutions[0]
  }, [institutions, selectedInstitutionId])

  const tenantName = activeInstitution?.name || APP_CONFIG.defaultTenantName
  const tenantCode = activeInstitution?.code || APP_CONFIG.defaultTenantCode
  const branchName = APP_CONFIG.defaultBranchName
  const branchCode = APP_CONFIG.defaultBranchCode

  const currentPageTitle = useMemo(() => {
    return resolvePageTitle(location.pathname, location.search)
  }, [location.pathname, location.search])

  const userRole = useMemo(() => {
    if (!user?.role) return 'Admin'
    return user.role.charAt(0).toUpperCase() + user.role.slice(1)
  }, [user?.role])

  return (
    <footer
      role="contentinfo"
      aria-label="Application Footer"
      className="shrink-0 z-20 bg-white border-t border-slate-200/90 px-3 md:px-5 py-1 text-[10.5px] sm:text-[11px] leading-tight text-slate-600 print:hidden transition-all duration-200 select-none"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-x-4 gap-y-1 w-full min-w-0">
        {/* Left & Center Context Group */}
        <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap min-w-0">
          {/* Left: Institute Name, Tenant Code, Branch Name & Code */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-slate-900 tracking-tight">{tenantName}</span>
            <span className="text-slate-300 select-none">·</span>
            <span className="text-slate-500 font-mono text-[10px]" title="Tenant Code">
              [{tenantCode}]
            </span>
            <span className="text-slate-300 select-none">·</span>
            <span className="text-slate-600">Branch: {branchName}</span>
            <span className="text-slate-500 font-mono text-[10px]" title="Branch Code">
              ({branchCode})
            </span>
          </div>

          <span className="hidden sm:inline text-slate-300 select-none">|</span>

          {/* Center: Dynamic Active Page / Workspace Name */}
          <div
            className="flex items-center gap-1 min-w-0 text-slate-600"
            title={`Active Workspace: ${currentPageTitle}`}
          >
            <span className="text-slate-400 font-medium">Workspace:</span>
            <span
              data-testid="footer-page-title"
              className="font-semibold text-blue-700 bg-blue-50/80 px-1.5 py-0.2 rounded border border-blue-200/60"
            >
              {currentPageTitle}
            </span>
          </div>
        </div>

        {/* Product & Right System Group */}
        <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap lg:justify-end min-w-0">
          {/* Product: PrathamOne Academy Management System · Enterprise Edition · prathamone.com */}
          <div className="flex items-center gap-1.5 min-w-0 text-slate-500">
            <span className="text-slate-700 font-medium">{APP_CONFIG.productName}</span>
            <span className="text-slate-300 select-none">·</span>
            <span className="text-slate-700 font-semibold">{APP_CONFIG.edition}</span>
            <span className="text-slate-300 select-none">·</span>
            <a
              href={APP_CONFIG.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
            >
              {APP_CONFIG.website}
            </a>
          </div>

          <span className="hidden sm:inline text-slate-300 select-none">|</span>

          {/* Right: User ID, Role, Live Connection Status, Version */}
          <div className="flex items-center gap-1.5 min-w-0 text-slate-500 font-medium">
            <span className="font-mono text-slate-700" title="Logged-in User ID">
              UID: #{user?.id ?? 1}
            </span>
            <span className="text-slate-300 select-none">·</span>
            <span className="text-slate-700" title="User Access Role">
              Role: {userRole}
            </span>
            <span className="text-slate-300 select-none">·</span>
            <span
              className="inline-flex items-center gap-1"
              title={isOnline ? 'Cloud Sync: Connected' : 'Cloud Sync: Offline'}
              aria-label={`Connection status: ${isOnline ? 'Online' : 'Offline'}`}
            >
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  isOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                }`}
                aria-hidden="true"
              />
              <span className={isOnline ? 'text-emerald-700' : 'text-rose-700'}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </span>
            <span className="text-slate-300 select-none">·</span>
            <span className="font-semibold text-slate-800 font-mono text-[10px]" title="System Version">
              {APP_CONFIG.versionDisplay}
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

