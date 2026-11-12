/**
 * @file        Layout.tsx
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
 * @created     2026-11-03
 * @updated     2026-11-12
 *
 * @description Master application shell component providing header navigation, collapsible sidebar, and main view outlet.
 */

import { Outlet, Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Menu, PanelLeft, PanelLeftOpen, Download, Search, Sliders } from 'lucide-react'
import Sidebar from './Sidebar'
import Footer from './Footer'
import { RouteErrorBoundary } from './RouteErrorBoundary'
import { useAuthStore } from '../store/authStore'
import { useSidebarStore } from '../store/sidebarStore'
import { useNavigationStore } from '../store/navigationStore'
import { useNavigationTracker } from '../hooks/useNavigationTracker'
import GlobalNavigationSearch from './navigation/GlobalNavigationSearch'
import MenuCustomizerModal from './navigation/MenuCustomizerModal'
import { useEditModeStore } from '../store/editModeStore'
import { institutionsApi, academicYearsApi } from '../api/endpoints'
import { usePWA } from '../hooks/usePWA'
import { useBranding } from '../config/branding'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useState } from 'react'
import { useEnvironmentStore, DataEnvironment } from '../store/environmentStore'
import TrainingModeBanner from './common/TrainingModeBanner'
import EnvironmentSwitchModal from './common/EnvironmentSwitchModal'
import ContextualHelpButton from './common/ContextualHelpButton'
import { FlaskConical, ShieldCheck } from 'lucide-react'

// Fallback authoritative academic sessions ensuring zero blank dropdown states
const DEFAULT_ACADEMIC_YEARS = [
  { id: 1, name: '2026-27', start_date: '2026-04-01', end_date: '2027-03-31', is_current: true, institution_id: 1 },
  { id: 3, name: '2025-26', start_date: '2025-04-01', end_date: '2026-03-31', is_current: false, institution_id: 1 },
  { id: 2, name: '2024-25', start_date: '2024-04-01', end_date: '2025-03-31', is_current: false, institution_id: 1 },
]

export default function Layout() {
  const branding = useBranding()
  const { dataEnvironment, isTrainingMode } = useEnvironmentStore()
  const [switchTarget, setSwitchTarget] = useState<DataEnvironment | null>(null)
  useDocumentTitle()
  useNavigationTracker()

  const {
    selectedInstitutionId,
    selectedAcademicYearId,
    setSelectedInstitution,
    setSelectedAcademicYear,
  } = useAuthStore()

  const {
    desktopState,
    toggleCollapse,
    expandSidebar,
    toggleMobileOpen,
  } = useSidebarStore()

  const { isInstalled } = usePWA()
  const location = useLocation()

  // STRICT GOVERNANCE: Reset all workspace edit modes to View Mode on route or tab navigation
  useEffect(() => {
    useEditModeStore.getState().resetAll()
  }, [location.pathname, location.search])

  const token = useAuthStore((s) => s.token)
  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then((r) => r.data),
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  // Validate or auto-select institution if none selected or if stale ID
  useEffect(() => {
    if (institutions.length > 0) {
      const instExists = institutions.some((i) => i.id === selectedInstitutionId)
      if (!selectedInstitutionId || !instExists) {
        setSelectedInstitution(institutions[0].id)
      }
    }
  }, [institutions, selectedInstitutionId, setSelectedInstitution])

  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years', selectedInstitutionId],
    queryFn: async () => {
      const res = await academicYearsApi.list(selectedInstitutionId ?? undefined)
      if (res.data && res.data.length > 0) {
        return res.data
      }
      // Resilient fallback: return active years if filtered list was empty
      const fallback = await academicYearsApi.list()
      return fallback.data && fallback.data.length > 0 ? fallback.data : DEFAULT_ACADEMIC_YEARS
    },
    initialData: DEFAULT_ACADEMIC_YEARS,
  })

  // Autoritative display years list: always populated
  const displayYears = academicYears.length > 0 ? academicYears : DEFAULT_ACADEMIC_YEARS
  const effectiveYearId: number =
    (selectedAcademicYearId && displayYears.some((y) => y.id === selectedAcademicYearId)
      ? selectedAcademicYearId
      : (displayYears.find((y) => y.is_current)?.id ?? displayYears[0]?.id ?? 1))

  // Global keyboard shortcut: Ctrl+B or Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        if (!isInput) {
          e.preventDefault()
          if (desktopState === 'hidden') {
            expandSidebar()
          } else {
            toggleCollapse()
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [desktopState, expandSidebar, toggleCollapse])

  // Dynamically default to current academic year, while preserving historical selection
  useEffect(() => {
    if (academicYears.length > 0) {
      const yearExists = academicYears.some((y) => y.id === selectedAcademicYearId)
      if (!selectedAcademicYearId || !yearExists) {
        const currentYear = academicYears.find((y) => y.is_current) ?? academicYears[0]
        if (currentYear) {
          setSelectedAcademicYear(currentYear.id)
        }
      }
    }
  }, [academicYears, selectedAcademicYearId, setSelectedAcademicYear])

  return (
    <div className="flex h-screen h-[100dvh] bg-gray-50 overflow-hidden print:h-auto print:overflow-visible">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-300 ease-in-out print:h-auto print:overflow-visible">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center gap-3 md:gap-4 shrink-0 z-30 shadow-xs print:hidden">
          {/* Mobile Navigation Drawer Toggle */}
          <button
            type="button"
            onClick={toggleMobileOpen}
            aria-label="Open navigation menu"
            className="p-2 -ml-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 md:hidden transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop Sidebar Toggle / Reopen Button */}
          {desktopState === 'hidden' ? (
            <button
              type="button"
              onClick={expandSidebar}
              aria-label="Show sidebar (Ctrl+B)"
              title="Show sidebar (Ctrl+B)"
              className="hidden md:flex items-center gap-2 p-1.5 -ml-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all shadow-xs"
            >
              <PanelLeftOpen className="w-4 h-4 text-primary-600" />
              <span className="text-xs font-semibold pr-1">Show Sidebar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleCollapse}
              aria-label={desktopState === 'collapsed' ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
              title={desktopState === 'collapsed' ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
              className="hidden md:flex p-1.5 -ml-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
          )}

          {/* Institution Selector */}
          <div className="relative">
            <select
              value={selectedInstitutionId ?? (institutions[0]?.id ?? '')}
              onChange={(e) => setSelectedInstitution(Number(e.target.value))}
              className="appearance-none text-sm border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white min-w-[140px]"
            >
              {institutions.length === 0 ? (
                <option value="">Loading...</option>
              ) : (
                institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="absolute right-2 top-2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Academic Year Selector */}
          <div className="relative">
            <select
              value={effectiveYearId}
              onChange={(e) => setSelectedAcademicYear(Number(e.target.value))}
              className="appearance-none text-sm border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white min-w-[140px] font-medium text-gray-800"
            >
              {displayYears.map((year) => (
                <option key={year.id} value={year.id}>
                  AY {year.name} {year.is_current ? '(Current)' : '(Historical)'}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>

          {/* Environment Switcher Pill */}
          <button
            type="button"
            onClick={() => setSwitchTarget(isTrainingMode ? 'PRODUCTION' : 'TRAINING')}
            title={
              isTrainingMode
                ? 'Currently in Training Mode with sample data. Click to switch to Live Mode.'
                : 'Currently in Live Production Mode. Click to explore Training Mode.'
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-2xs ${
              isTrainingMode
                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 animate-pulse'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}
          >
            {isTrainingMode ? (
              <>
                <FlaskConical className="w-3.5 h-3.5 text-white" />
                <span>TRAINING MODE</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Mode</span>
              </>
            )}
          </button>

          {/* Global Search Command Button */}
          <button
            type="button"
            onClick={() => useNavigationStore.getState().openSearch()}
            title="Search modules, workspaces, reports (Ctrl+K)"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors shadow-2xs font-medium"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search</span>
            <kbd className="hidden lg:inline-flex text-[10px] px-1.5 py-0.2 bg-white text-slate-500 border rounded font-mono">
              Ctrl+K
            </kbd>
          </button>

          <div className="flex-1" />

          <ContextualHelpButton variant="pill" label="Help" />

          {!isInstalled && (
            <Link
              to="/install"
              title="Install PrathamOne EduOS Desktop & Mobile App"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-blue-200 rounded-xl transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-primary-600" />
              <span>Install App</span>
            </Link>
          )}

          <p className="text-sm font-medium text-gray-600 hidden sm:block">
            {branding.academyName} {branding.tagline}
          </p>
        </header>

        {/* Global Persistent Training Mode Banner */}
        <TrainingModeBanner />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 min-h-0 min-w-0 print:h-auto print:overflow-visible print:p-0">
          <RouteErrorBoundary>
            <Outlet />
          </RouteErrorBoundary>
        </main>

        {/* Application Fixed Bottom Footer */}
        <Footer />
      </div>

      {switchTarget && (
        <EnvironmentSwitchModal
          isOpen={!!switchTarget}
          onClose={() => setSwitchTarget(null)}
          targetEnvironment={switchTarget}
        />
      )}

      {/* Global Navigation Engine Overlays */}
      <GlobalNavigationSearch />
      <MenuCustomizerModal />
    </div>
  )
}
