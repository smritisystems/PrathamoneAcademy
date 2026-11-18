/**
 * @file        Footer.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.2.0
 * @created     2026-11-04
 * @updated     2026-11-18
 *
 * @description Collapsible full-width application footer displaying tenant branch, current route, product edition, live system metrics, and parent organization branding.
 */

import { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2, X, ChevronDown, ChevronUp, MessageSquare, Presentation, Bell } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { institutionsApi } from '../api/endpoints'
import { APP_CONFIG, BRANDING_CONFIG } from '../config/appConfig'
import { findModuleByPath } from '../config/modules'
import OrganizationBranding from './OrganizationBranding'
import { useBottomBarDrawerStore } from '../store/bottomBarDrawerStore'

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

  // Exact known menu / page paths overrides
  const knownRoutes: Record<string, string> = {
    '/': 'Dashboard',
    '/dashboard': 'Dashboard',
    '/student/dashboard': 'Student Portal',
    '/student-portal': 'Student Portal',
    '/login': 'Sign In',
    '/students/add': 'Admissions',
    '/releases': 'Releases & Changes',
    '/admin/releases': 'Releases & Changes',
    '/communication/notices': 'Notice Board',
    '/notices': 'Notice Board',
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

  // Resolve from Canonical Module Registry (SSOT)
  const matchedModule = findModuleByPath(cleanPath)
  if (matchedModule) {
    const exactSub = matchedModule.subItems.find(
      (s) => s.to.toLowerCase() === cleanPath.toLowerCase()
    )
    if (exactSub) {
      return exactSub.label
    }
    const prefixSub = matchedModule.subItems.find(
      (s) => cleanPath.toLowerCase().startsWith(s.to.toLowerCase() + '/')
    )
    if (prefixSub) {
      return prefixSub.label
    }
    return matchedModule.label
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
 * Shared extreme-right quick actions: Notices, Chats & EduBoard Whiteboard.
 */
interface FooterQuickActionsProps {
  isNoticesActive: boolean
  activeDrawer: string | null
  onNoticesClick: () => void
  onToggleDrawer: (drawer: 'chats' | 'boards') => void
}

function FooterQuickActions({
  isNoticesActive,
  activeDrawer,
  onNoticesClick,
  onToggleDrawer,
}: FooterQuickActionsProps) {
  return (
    <div className="flex items-center gap-1 sm:gap-1.5 pl-1 border-l border-slate-200">
      <button
        type="button"
        onClick={onNoticesClick}
        data-testid="footer-quick-notices-btn"
        title="Notice Board & Circulars Register (Extreme Right)"
        aria-label="Notice Board & Circulars Register"
        className={`inline-flex items-center justify-center gap-1 px-1.5 sm:px-2 py-1 sm:py-0.5 rounded-md text-[10px] sm:text-[10.5px] font-bold transition-all shadow-2xs cursor-pointer min-h-[36px] sm:min-h-auto ${
          isNoticesActive
            ? 'bg-violet-700 text-white ring-2 ring-violet-400'
            : 'bg-violet-50 text-violet-800 hover:bg-violet-100 border border-violet-200/80'
        }`}
      >
        <Bell className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Notices</span>
      </button>

      <button
        type="button"
        onClick={() => onToggleDrawer('chats')}
        data-testid="footer-quick-chats-btn"
        title="Quick Chats & Academic Doubts (Extreme Right)"
        aria-label="Quick Chats & Academic Doubts"
        className={`inline-flex items-center justify-center gap-1 px-1.5 sm:px-2 py-1 sm:py-0.5 rounded-md text-[10px] sm:text-[10.5px] font-bold transition-all shadow-2xs cursor-pointer min-h-[36px] sm:min-h-auto ${
          activeDrawer === 'chats'
            ? 'bg-[#0B2D6B] text-white ring-2 ring-blue-400'
            : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/80'
        }`}
      >
        <MessageSquare className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Chats</span>
      </button>

      <button
        type="button"
        onClick={() => onToggleDrawer('boards')}
        data-testid="footer-quick-boards-btn"
        title="EduBoard Smart Classroom Whiteboard (Extreme Right)"
        aria-label="EduBoard Smart Classroom Whiteboard"
        className={`inline-flex items-center justify-center gap-1 px-1.5 sm:px-2 py-1 sm:py-0.5 rounded-md text-[10px] sm:text-[10.5px] font-bold transition-all shadow-2xs cursor-pointer min-h-[36px] sm:min-h-auto ${
          activeDrawer === 'boards'
            ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
            : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200/80'
        }`}
      >
        <Presentation className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Boards</span>
      </button>
    </div>
  )
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
  const navigate = useNavigate()
  const { user, selectedInstitutionId, token } = useAuthStore()
  const { activeDrawer, toggleDrawer } = useBottomBarDrawerStore()
  const isOnline = useLiveConnectionStatus()
  const [showAboutModal, setShowAboutModal] = useState(false)
  const isNoticesActive = location.pathname.startsWith('/communication/notices') || location.pathname === '/notices'

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
      className={`shrink-0 z-20 bg-white border-t border-slate-200/90 px-2.5 sm:px-3 md:px-5 print:hidden transition-all duration-200 select-none pb-[max(0.25rem,env(safe-area-inset-bottom))] ${
        isCollapsed
          ? 'py-1.5 sm:py-1 text-[10px] sm:text-[10.5px]'
          : 'py-2 sm:py-1.5 text-[10.5px] sm:text-[11px] leading-tight text-slate-600'
      }`}
    >
      {isCollapsed ? (
        /* Slim Collapsed Footer Bar */
        <div
          data-testid="footer-collapsed-bar"
          className="flex items-center justify-between gap-1.5 sm:gap-2 w-full min-w-0"
        >
          {/* Tenant summary and grouped product/system context */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 text-slate-500 font-medium">
            <span className="hidden sm:inline font-semibold text-slate-800 tracking-tight shrink-0">{tenantName}</span>
            <span className="hidden sm:inline text-slate-300 select-none">·</span>
            <div
              data-testid="footer-product-system-group"
              className="flex items-center gap-1.5 min-w-0 rounded-lg border border-blue-100 bg-primary-50/40 px-1.5 py-0.5"
            >
              <div
                className="flex items-center gap-1 min-w-0 max-w-[130px] xs:max-w-[160px] sm:max-w-none"
                title={`Active Workspace: ${currentPageTitle}`}
              >
                <span className="text-slate-500 shrink-0">Workspace:</span>
                <span
                  data-testid="footer-page-title"
                  className="font-semibold text-primary-700 bg-white/80 px-1.5 py-0.2 rounded border border-blue-200/60 truncate"
                >
                  {currentPageTitle}
                </span>
              </div>
              <span className="hidden md:inline text-slate-300 select-none">·</span>
              <div className="hidden md:flex items-center gap-1 shrink-0">
                <img
                  src={BRANDING_CONFIG.assets.softwareIconSvgUrl || BRANDING_CONFIG.assets.softwareIconUrl}
                  alt="PrathamOne EduOS"
                  className="w-4 h-4 object-contain"
                />
                <span className="text-slate-700 font-semibold">{APP_CONFIG.edition}</span>
              </div>
              <span className="hidden md:inline text-slate-300 select-none">·</span>
              <Link
                to="/help/version"
                aria-label="Software license details"
                title="View license status, validity, and deployment details"
                className="hidden md:inline text-primary-700 hover:text-primary-900 hover:underline font-semibold shrink-0"
              >
                License details
              </Link>
              <span className="hidden sm:inline text-slate-300 select-none">·</span>
              <span
                className="hidden sm:inline-flex items-center gap-1 shrink-0"
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
              <span className="hidden md:inline font-mono text-[10px] text-slate-700 shrink-0">
                {APP_CONFIG.versionDisplay}
              </span>
            </div>
          </div>

          {/* Right: Expand Toggle Button & Extreme Right Quick Action Launchers */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleCollapsed}
              data-testid="footer-expand-btn"
              aria-label="Expand footer"
              aria-expanded="false"
              title="Expand footer (Ctrl+Shift+F)"
              className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-1 sm:py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-primary-500 min-h-[30px] sm:min-h-auto"
            >
              <ChevronUp className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
              <span className="hidden xs:inline">Expand</span>
            </button>

            {/* Extreme Right Quick Actions: Notices, Chats & EduBoard */}
            <FooterQuickActions
              isNoticesActive={isNoticesActive}
              activeDrawer={activeDrawer}
              onNoticesClick={() => navigate('/communication/notices')}
              onToggleDrawer={toggleDrawer}
            />
          </div>
        </div>
      ) : (
        /* Full Expanded Footer Content */
        <div data-testid="footer-expanded-content" className="flex flex-col gap-1.5 w-full min-w-0">
          {/* Row 1: Tenant context and grouped product/system information */}
          <div className="flex flex-col gap-y-1 w-full min-w-0">
            {/* Tenant and branch identity remains distinct from software branding */}
            <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap min-w-0">
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

            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 min-w-0">
              <div
                data-testid="footer-product-system-group"
                className="flex items-center gap-x-1.5 gap-y-1 flex-wrap min-w-0 rounded-lg border border-blue-100 bg-primary-50/40 px-2 py-1 text-slate-600"
              >
                <div
                  className="flex items-center gap-1 min-w-0"
                  title={`Active Workspace: ${currentPageTitle}`}
                >
                  <span className="text-slate-500 font-medium">Workspace:</span>
                  <span
                    data-testid="footer-page-title"
                    className="font-semibold text-primary-700 bg-white/80 px-1.5 py-0.2 rounded border border-blue-200/60"
                  >
                    {currentPageTitle}
                  </span>
                </div>
                <span className="text-blue-200 select-none">·</span>
                <img
                  src={BRANDING_CONFIG.assets.softwareLogoSvgUrl}
                  alt="PrathamOne EduOS"
                  className="h-4 w-auto max-w-[88px] object-contain shrink-0"
                />
                <span className="text-slate-700 font-semibold">{APP_CONFIG.edition}</span>
                <span className="text-blue-200 select-none">·</span>
                <Link
                  to="/help/version"
                  aria-label="Software license details"
                  title="View license status, validity, and deployment details"
                  className="text-primary-700 hover:text-primary-900 hover:underline font-semibold"
                >
                  License details
                </Link>
                <span className="text-blue-200 select-none">·</span>
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
                <span className="text-blue-200 select-none">·</span>
                <Link
                  to="/releases"
                  className="font-semibold text-slate-800 hover:text-primary-600 hover:underline font-mono text-[10px] transition-colors"
                  title="System Version & Release Management"
                >
                  {APP_CONFIG.versionDisplay}
                </Link>
              </div>

              <div className="flex items-center gap-x-2 gap-y-1 flex-wrap min-w-0 text-slate-500 font-medium">
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
                  title={`View ${APP_CONFIG.parentOrganization.name} Parent Organization & Product Ecosystem`}
                  aria-haspopup="dialog"
                >
                  <Building2 className="w-2.5 h-2.5 text-primary-600" aria-hidden="true" />
                  <span>{APP_CONFIG.parentOrganization.shortName} Ecosystem</span>
                </button>
                <span className="hidden sm:inline text-slate-300 select-none">|</span>
                <span className="font-mono text-slate-700" title="Logged-in User ID">
                  UID: #{user?.id ?? 1}
                </span>
                <span className="text-slate-300 select-none">·</span>
                <span className="text-slate-700" title="User Access Role">
                  Role: {userRole}
                </span>
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

                {/* Extreme Right Quick Actions: Notices, Chats & EduBoard */}
                <FooterQuickActions
                  isNoticesActive={isNoticesActive}
                  activeDrawer={activeDrawer}
                  onNoticesClick={() => navigate('/communication/notices')}
                  onToggleDrawer={toggleDrawer}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Accessible Semantic Parent Organization, Products & Support Contact Bar */}
          <OrganizationBranding variant="footer" />
        </div>
      )}

      {/* Accessible About Dialog */}
      {showAboutModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="parent-org-about-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowAboutModal(false)}
        >
          <div
            className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-1 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
              <h2 id="parent-org-about-dialog-title" className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary-600" aria-hidden="true" />
                <span>{APP_CONFIG.parentOrganization.name} Parent Organization & Product Ecosystem</span>
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
                  About SmritiSys
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
