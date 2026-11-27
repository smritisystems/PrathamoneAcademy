/**
 * @file        Layout.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-03
 * @updated     2026-11-27
 *
 * @description Master application shell component providing header navigation, collapsible sidebar, and main view outlet.
 */

import { Outlet, Link, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Menu, PanelLeft, PanelLeftOpen, Download, Search, Sliders, Sparkles } from 'lucide-react'
import Sidebar from './Sidebar'
import Footer from './Footer'
import { RouteErrorBoundary } from './RouteErrorBoundary'
import { useAuthStore, isUserSysAdmin } from '../store/authStore'
import { useSidebarStore } from '../store/sidebarStore'
import { useEduBoardDisplayStore } from '../store/eduboardDisplayStore'
import { useNavigationStore } from '../store/navigationStore'
import { useNavigationTracker } from '../hooks/useNavigationTracker'
import GlobalNavigationSearch from './navigation/GlobalNavigationSearch'
import MenuCustomizerModal from './navigation/MenuCustomizerModal'
import InitialLaunchActivationModal from './InitialLaunchActivationModal'
import InstitutionOnboardingWizard from './InstitutionOnboardingWizard'
import ForcePasswordChangeModal from './ForcePasswordChangeModal'
import { useEditModeStore } from '../store/editModeStore'
import { institutionsApi, academicYearsApi, licenseApi, settingsApi } from '../api/endpoints'
import { usePWA } from '../hooks/usePWA'
import { useBranding } from '../config/branding'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useEnvironmentStore, DataEnvironment } from '../store/environmentStore'
import TrainingModeBanner from './common/TrainingModeBanner'
import LicenseModeBanner from './common/LicenseModeBanner'
import EnvironmentSwitchModal from './common/EnvironmentSwitchModal'
import ContextualHelpButton from './common/ContextualHelpButton'
import NepRoadmapModal from './common/NepRoadmapModal'
import { BottomBarDrawer } from './common/BottomBarDrawer'
import { FlaskConical, ShieldCheck } from 'lucide-react'

// Fallback authoritative academic sessions ensuring zero blank dropdown states
const DEFAULT_ACADEMIC_YEARS = [
  { id: 1, name: '2026-27', start_date: '2026-04-01', end_date: '2027-03-31', is_current: true, institution_id: 1 },
  { id: 3, name: '2025-26', start_date: '2025-04-01', end_date: '2026-03-31', is_current: false, institution_id: 1 },
  { id: 2, name: '2024-25', start_date: '2024-04-01', end_date: '2025-03-31', is_current: false, institution_id: 1 },
]

export default function Layout() {
  const branding = useBranding()
  const appContentRef = useRef<HTMLDivElement>(null)
  const { dataEnvironment, isTrainingMode } = useEnvironmentStore()
  const [switchTarget, setSwitchTarget] = useState<DataEnvironment | null>(null)
  const [showNepModal, setShowNepModal] = useState(false)
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
    mobileOpen,
    toggleCollapse,
    expandSidebar,
    toggleMobileOpen,
    closeMobile,
  } = useSidebarStore()

  useEffect(() => {
    const appContent = appContentRef.current
    if (!appContent) return

    if (mobileOpen) {
      appContent.setAttribute('inert', '')
    } else {
      appContent.removeAttribute('inert')
    }
  }, [mobileOpen])

  const { isInstalled } = usePWA()
  const location = useLocation()
  const isEduBoardRoute =
    location.pathname === '/eduboard' ||
    (location.pathname.startsWith('/eduboard/') && !location.pathname.startsWith('/eduboard/window'))
  const ebWorkspaceMode = useEduBoardDisplayStore((s) => s.workspaceMode)
  const ebHideHeader = useEduBoardDisplayStore((s) => s.hideAppHeader)
  const ebHideStatusBar = useEduBoardDisplayStore((s) => s.hideStatusBar)

  const hideSidebarShell = isEduBoardRoute && ebWorkspaceMode !== 'standard'
  const hideHeaderShell = isEduBoardRoute && (ebWorkspaceMode !== 'standard' || ebHideHeader)
  const hideFooterShell = isEduBoardRoute && (ebWorkspaceMode !== 'standard' || ebHideStatusBar)

  useEffect(() => {
    if (hideSidebarShell && mobileOpen) closeMobile()
  }, [hideSidebarShell, mobileOpen, closeMobile])

  // Reset transient EduBoard immersive display chrome when navigating away from /eduboard
  useEffect(() => {
    if (!isEduBoardRoute) {
      useEduBoardDisplayStore.getState().resetTransientChrome()
    }
  }, [isEduBoardRoute])

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

  const [headerLogoFailed, setHeaderLogoFailed] = useState(false)
  const currentInst = institutions.find((i) => i.id === selectedInstitutionId) ?? institutions[0]
  const effectiveHeaderLogo = currentInst?.logo_url || branding.assets.logoUrl

  // Initial launch license activation & institution profile onboarding wizard evaluation
  const [isInitialLicenseModalOpen, setIsInitialLicenseModalOpen] = useState(false)
  const [isOnboardingWizardDeferred, setIsOnboardingWizardDeferred] = useState(false)
  const user = useAuthStore((s) => s.user)
  const isSysAdmin = isUserSysAdmin(user)
  const isInstitutionAdmin = (user?.role || '').toLowerCase() === 'admin' || (user?.role || '').toLowerCase() === 'principal' || isSysAdmin

  const { data: instituteProfile } = useQuery({
    queryKey: ['institute_profile', selectedInstitutionId],
    queryFn: () => settingsApi.getProfile().then((res) => res.data),
    enabled: !!token && !isTrainingMode && isInstitutionAdmin,
    staleTime: 60_000,
    retry: false,
  })

  const { data: licenseStatus } = useQuery({
    queryKey: ['license-status', selectedInstitutionId],
    queryFn: () => licenseApi.getStatus(selectedInstitutionId ?? undefined).then((res) => res.data),
    enabled: !!token && !isTrainingMode,
    staleTime: 60_000,
    retry: false,
  })

  useEffect(() => {
    if (!licenseStatus || isTrainingMode || !isInstitutionAdmin) return
    const isDeferred = sessionStorage.getItem('prathamone-initial-license-prompt-deferred') === 'true'
    const needsActivation =
      licenseStatus.mode === 'unactivated' ||
      (licenseStatus.mode === 'evaluation' && !licenseStatus.document_id)
    if (needsActivation && !isDeferred) {
      setIsInitialLicenseModalOpen(true)
    }
  }, [licenseStatus, isTrainingMode, isInstitutionAdmin])

  useEffect(() => {
    setHeaderLogoFailed(false)
  }, [effectiveHeaderLogo, selectedInstitutionId])

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
    <div className="flex h-screen h-[100dvh] w-full bg-app-page overflow-hidden relative print:h-auto print:overflow-visible">
      {!hideSidebarShell && <Sidebar />}

      <div
        ref={appContentRef}
        className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative transition-all duration-300 ease-in-out print:h-auto print:overflow-visible"
      >
        {/* Top Header */}
        {!hideHeaderShell && (
        <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-4 h-12 flex items-center justify-between gap-2 shrink-0 z-30 shadow-2xs print:hidden min-w-0 max-w-full">
          {/* Mobile Navigation Drawer Toggle */}
          <button
            type="button"
            onClick={toggleMobileOpen}
            id="mobile-navigation-trigger"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            aria-controls="app-sidebar"
            className="h-8 w-8 flex items-center justify-center -ml-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-1.5 focus:ring-primary-500 md:hidden transition-colors shrink-0"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Desktop Sidebar Toggle / Reopen Button */}
          {desktopState === 'hidden' ? (
            <button
              type="button"
              onClick={expandSidebar}
              aria-label="Show sidebar (Ctrl+B)"
              title="Show sidebar (Ctrl+B)"
              className="hidden md:flex items-center gap-1.5 px-2 py-1 -ml-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-1.5 focus:ring-primary-500 transition-all shadow-2xs"
            >
              <PanelLeftOpen className="w-3.5 h-3.5 text-primary-600" />
              <span className="text-[11px] font-semibold pr-0.5">Show Sidebar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleCollapse}
              aria-label={desktopState === 'collapsed' ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
              title={desktopState === 'collapsed' ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
              className="hidden md:flex p-1.5 -ml-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-1.5 focus:ring-primary-500 transition-colors"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          {/* Active Institution Badge with Logo & Selectors */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 sm:flex-initial">
            <div className="brand-logo-plate w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-white border border-slate-200/90 p-0.5 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden" title={currentInst?.name || branding.academyName}>
              {effectiveHeaderLogo && !headerLogoFailed ? (
                <img
                  src={effectiveHeaderLogo}
                  alt={currentInst?.name || branding.academyName}
                  onError={() => setHeaderLogoFailed(true)}
                  className="w-full h-full object-contain rounded-sm [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.12))]"
                />
              ) : (
                <div className="w-full h-full bg-primary-600 rounded-sm flex items-center justify-center font-bold text-[10px] text-white">
                  {currentInst?.short_name || branding.monogram}
                </div>
              )}
            </div>

            {/* Institution Selector */}
            <div className="relative min-w-0 max-w-[130px] xs:max-w-[160px] sm:max-w-[210px] flex-1 sm:flex-initial">
              <select
                value={selectedInstitutionId ?? (institutions[0]?.id ?? '')}
                onChange={(e) => setSelectedInstitution(Number(e.target.value))}
                className="appearance-none text-xs font-semibold border border-slate-200 hover:border-slate-300 dark:border-slate-700 rounded-lg pl-2 sm:pl-2.5 pr-6 py-1 h-7.5 sm:h-8 focus:outline-none focus:ring-1.5 focus:ring-primary-500 bg-slate-50 hover:bg-slate-100/70 dark:bg-slate-800 text-slate-800 dark:text-slate-100 w-full truncate transition-colors cursor-pointer shadow-2xs"
                title="Switch active institution"
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
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Academic Year Selector */}
            <div className="relative shrink-0 max-w-[105px] xs:max-w-[125px] sm:max-w-[170px]">
              <select
                value={effectiveYearId}
                onChange={(e) => setSelectedAcademicYear(Number(e.target.value))}
                className="appearance-none text-xs font-semibold border border-slate-200 hover:border-slate-300 dark:border-slate-700 rounded-lg pl-2 sm:pl-2.5 pr-6 py-1 h-7.5 sm:h-8 focus:outline-none focus:ring-1.5 focus:ring-primary-500 bg-slate-50 hover:bg-slate-100/70 dark:bg-slate-800 text-slate-800 dark:text-slate-100 w-full truncate transition-colors cursor-pointer shadow-2xs"
                title="Select academic session"
              >
                {displayYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    AY {year.name} {year.is_current ? '(Current)' : '(Historical)'}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Environment Switcher Pill */}
            <button
              type="button"
              onClick={() => setSwitchTarget(isTrainingMode ? 'PRODUCTION' : 'TRAINING')}
              title={
                isTrainingMode
                  ? 'Currently in Training Mode with sample data. Click to switch to Live Mode.'
                  : 'Currently in Live Production Mode. Click to explore Training Mode.'
              }
              className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 h-7.5 sm:h-8 rounded-lg text-xs font-semibold transition-all border shadow-2xs ${
                isTrainingMode
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 animate-pulse'
                  : 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border-emerald-300/80'
              }`}
            >
              {isTrainingMode ? (
                <>
                  <FlaskConical className="w-3.5 h-3.5 text-white shrink-0" />
                  <span className="hidden xs:inline">TRAINING</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="hidden xs:inline text-xs font-medium">Live</span>
                </>
              )}
            </button>

            {/* Contextual Help */}
            <div className="hidden xs:block">
              <ContextualHelpButton variant="pill" label="Help" />
            </div>

            {/* NEP 2020 Updates Pill Button */}
            <button
              type="button"
              onClick={() => setShowNepModal(true)}
              title="View NEP 2020 Platform Alignment & Rollout Roadmap"
              className="hidden md:inline-flex items-center gap-1.5 px-2 sm:px-2.5 h-7.5 sm:h-8 rounded-lg text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100/90 border border-amber-300/80 shadow-2xs transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="hidden lg:inline">NEP 2020 Updates</span>
              <span className="lg:hidden">NEP 2020</span>
            </button>

            {/* Global Search Command Button */}
            <button
              type="button"
              onClick={() => useNavigationStore.getState().openSearch()}
              title="Search modules, workspaces, reports (Ctrl+K)"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 h-7.5 sm:h-8 text-xs text-slate-500 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-100 border border-slate-200/80 rounded-lg transition-colors shadow-2xs font-medium"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search</span>
              <kbd className="hidden lg:inline-flex text-[10px] px-1 py-0.5 bg-white text-slate-500 border border-slate-200 rounded font-mono leading-none">
                Ctrl+K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => useNavigationStore.getState().openSearch()}
              aria-label="Search navigation"
              title="Search modules, workspaces, reports"
              className="inline-flex sm:hidden h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-1.5 focus:ring-primary-500"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
            </button>

            {!isInstalled && (
              <Link
                to="/install"
                title="Install PrathamOne EduOS Desktop & Mobile App"
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 h-7.5 sm:h-8 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200/80 rounded-lg transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-primary-600" />
                <span>Install</span>
              </Link>
            )}
          </div>
        </header>
        )}

        {/* Global Persistent Training Mode Banner */}
        {!hideHeaderShell && <TrainingModeBanner />}
        {!hideHeaderShell && <LicenseModeBanner />}

        {/* Page Content */}
        <main
          className={`flex-1 overflow-y-auto overflow-x-hidden min-h-0 min-w-0 relative print:h-auto print:overflow-visible print:p-0 ${
            isEduBoardRoute && ebWorkspaceMode !== 'standard'
              ? 'p-2'
              : 'p-3 sm:p-4 md:p-6 pb-24 md:pb-8 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]'
          }`}
        >
          <RouteErrorBoundary>
            <Outlet />
          </RouteErrorBoundary>
        </main>

        {/* Application Fixed Bottom Footer */}
        {!hideFooterShell && <Footer />}
      </div>

      {/* Floating Bottom Bar Drawer (Chats & EduBoard) */}
      <BottomBarDrawer />

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

      {/* Initial Launch License Activation Modal */}
      <InitialLaunchActivationModal
        isOpen={isInitialLicenseModalOpen}
        onClose={() => setIsInitialLicenseModalOpen(false)}
        licenseStatus={licenseStatus}
        institutionId={selectedInstitutionId ?? undefined}
      />

      {/* First-Launch Institution Profile Setup Wizard */}
      <InstitutionOnboardingWizard
        isOpen={
          !isTrainingMode &&
          !user?.must_change_password &&
          !isInitialLicenseModalOpen &&
          !isOnboardingWizardDeferred &&
          isInstitutionAdmin &&
          Boolean(
            instituteProfile &&
              (instituteProfile.onboarding_completed === false || instituteProfile.is_placeholder_profile)
          )
        }
        initialProfile={instituteProfile}
        onComplete={() => setIsOnboardingWizardDeferred(true)}
        onDefer={() => setIsOnboardingWizardDeferred(true)}
      />

      {/* Mandatory First-Run Master Password Change Modal */}
      <ForcePasswordChangeModal isOpen={Boolean(user?.must_change_password)} />

      {/* NEP 2020 Platform Alignment Roadmap Modal */}
      <NepRoadmapModal isOpen={showNepModal} onClose={() => setShowNepModal(false)} />
    </div>
  )
}
