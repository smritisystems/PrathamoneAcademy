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
 * @version     1.2.0
 * @created     2026-11-04
 * @updated     2026-11-12
 *
 * @description Collapsible full-width application footer displaying tenant branch, current route, product edition, live system metrics, and AITDL parent branding.
 */

import { useState, useEffect, useMemo } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { institutionsApi } from '../api/endpoints'
import { APP_CONFIG } from '../config/appConfig'
import OrganizationBranding from './OrganizationBranding'

export const FOOTER_COLLAPSED_KEY = 'pratham_footer_collapsed'

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
    '/install': 'Install App (PWA)',
    '/users': 'Users & Roles',
    '/releases': 'Releases & Changes',
    '/admin/releases': 'Releases & Changes',
    '/help': 'Help & About Centre',
    '/help/support': 'Support Centre',
    '/help/about-product': 'About PrathamOne EduOS',
    '/help/about-company': 'About SMRITI Systems',
    '/help/version': 'Product & Version Information',
    '/help/legal': 'Legal & Compliance',
    '/help/system-info': 'System Information',
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
  const { user, selectedInstitutionId, token } = useAuthStore()
  const isOnline = useLiveConnectionStatus()
  const [showAboutModal, setShowAboutModal] = useState(false)

  // Initialize collapse state: check localStorage first, else default to mobile (< 768px)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      const saved = localStorage.getItem(FOOTER_COLLAPSED_KEY)
      if (saved !== null) {
        return saved === 'true'
      }
      return window.innerWidth < 768
    } catch {
      return false
    }
  })

  // Global toggle handler persisting to localStorage
  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(FOOTER_COLLAPSED_KEY, String(next))
      } catch {}
      return next
    })
  }

  // Keyboard shortcut: Ctrl+Shift+F (or Cmd+Shift+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault()
        toggleCollapsed()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Cached institution listing for tenant & branch metadata
  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then((r) => r.data),
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
    retry: false,
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
      className={`shrink-0 z-20 bg-white border-t border-slate-200/90 px-3 md:px-5 print:hidden transition-all duration-200 select-none ${
        isCollapsed
          ? 'py-1 text-[10px] sm:text-[10.5px]'
          : 'py-1.5 text-[10.5px] sm:text-[11px] leading-tight text-slate-600'
      }`}
    >
      {isCollapsed ? (
        /* Slim Collapsed Footer Bar */
        <div
          data-testid="footer-collapsed-bar"
          className="flex items-center justify-between gap-2 w-full min-w-0"
        >
          {/* Left summary indicators */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0 text-slate-500 font-medium">
            <span className="font-semibold text-slate-800 tracking-tight">{tenantName}</span>
            <span className="text-slate-300 select-none">·</span>
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-slate-400">Workspace:</span>
              <span
                data-testid="footer-page-title"
                className="font-semibold text-primary-700 bg-primary-50/80 px-1.5 py-0.2 rounded border border-blue-200/60"
              >
                {currentPageTitle}
              </span>
            </div>
            <span className="hidden sm:inline text-slate-300 select-none">·</span>
            <span
              className="hidden sm:inline-flex items-center gap-1"
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
            <span className="hidden md:inline text-slate-300 select-none">·</span>
            <span className="hidden md:inline font-mono text-[10px] text-slate-700">
              {APP_CONFIG.versionDisplay}
            </span>
          </div>

          {/* Right: Expand Toggle Button */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={toggleCollapsed}
              data-testid="footer-expand-btn"
              aria-label="Expand footer"
              aria-expanded="false"
              title="Expand footer (Ctrl+Shift+F)"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <ChevronUp className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
              <span>Expand</span>
            </button>
          </div>
        </div>
      ) : (
        /* Full Expanded Footer Content */
        <div data-testid="footer-expanded-content" className="flex flex-col gap-1.5 w-full min-w-0">
          {/* Row 1: Context, Page & Primary Operational Status */}
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
                  className="font-semibold text-primary-700 bg-primary-50/80 px-1.5 py-0.2 rounded border border-blue-200/60"
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
                  className="text-primary-600 hover:text-primary-700 hover:underline font-medium transition-colors"
                >
                  {APP_CONFIG.website}
                </a>
                <span className="text-slate-300 select-none">·</span>
                <button
                  type="button"
                  onClick={() => setShowAboutModal(true)}
                  className="inline-flex items-center gap-1 text-[10px] text-primary-700 hover:text-primary-900 bg-primary-50 hover:bg-primary-100 px-1.5 py-0.5 rounded border border-blue-200/80 transition-colors font-semibold"
                  title="View AITDL Parent Organization & Product Ecosystem"
                  aria-haspopup="dialog"
                >
                  <Building2 className="w-2.5 h-2.5 text-primary-600" aria-hidden="true" />
                  <span>AITDL Ecosystem</span>
                </button>
              </div>

              <span className="hidden sm:inline text-slate-300 select-none">|</span>

              {/* Right: User ID, Role, Live Connection Status, Version, Collapse Button */}
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
                <Link
                  to="/releases"
                  className="font-semibold text-slate-800 hover:text-primary-600 hover:underline font-mono text-[10px] transition-colors"
                  title="System Version & Release Management"
                >
                  {APP_CONFIG.versionDisplay}
                </Link>
                <span className="text-slate-300 select-none">·</span>
                <button
                  type="button"
                  onClick={toggleCollapsed}
                  data-testid="footer-collapse-btn"
                  aria-label="Collapse footer"
                  aria-expanded="true"
                  title="Collapse footer (Ctrl+Shift+F)"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                  <span>Collapse</span>
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Accessible Semantic AITDL Parent Organization, Products & Support Contact Bar */}
          <OrganizationBranding variant="footer" />
        </div>
      )}

      {/* Accessible About Dialog */}
      {showAboutModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="aitdl-about-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowAboutModal(false)}
        >
          <div
            className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-1 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
              <h2 id="aitdl-about-dialog-title" className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary-600" aria-hidden="true" />
                <span>AITDL Parent Organization & Product Ecosystem</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowAboutModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 sm:p-5 max-h-[80vh] overflow-y-auto space-y-4">
              <OrganizationBranding variant="card" />
              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Link
                  to="/help/about-product"
                  onClick={() => setShowAboutModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
                >
                  About PrathamOne EduOS
                </Link>
                <Link
                  to="/help/about-company"
                  onClick={() => setShowAboutModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
                >
                  About SMRITI Systems
                </Link>
                <Link
                  to="/help/legal"
                  onClick={() => setShowAboutModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
                >
                  Legal &amp; Compliance
                </Link>
                <Link
                  to="/help"
                  onClick={() => setShowAboutModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-xs font-semibold text-white"
                >
                  Open Help &amp; About Centre
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </footer>
  )
}
