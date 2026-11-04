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
 * @updated     2026-11-04
 *
 * @description Master application shell component providing header navigation, collapsible sidebar, and main view outlet.
 */

import { Outlet, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Menu, PanelLeft, PanelLeftOpen, Download } from 'lucide-react'
import Sidebar from './Sidebar'
import Footer from './Footer'
import { useAuthStore } from '../store/authStore'
import { useSidebarStore } from '../store/sidebarStore'
import { institutionsApi, academicYearsApi } from '../api/endpoints'
import { usePWA } from '../hooks/usePWA'

export default function Layout() {
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

  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then((r) => r.data),
  })

  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years', selectedInstitutionId],
    queryFn: () =>
      academicYearsApi.list(selectedInstitutionId ?? undefined).then((r) => r.data),
  })

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

  // Auto-select first institution if none selected
  useEffect(() => {
    if (institutions.length > 0 && !selectedInstitutionId) {
      setSelectedInstitution(institutions[0].id)
    }
  }, [institutions, selectedInstitutionId, setSelectedInstitution])

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
            className="p-2 -ml-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 md:hidden transition-colors"
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
              className="hidden md:flex items-center gap-2 p-1.5 -ml-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
            >
              <PanelLeftOpen className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold pr-1">Show Sidebar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleCollapse}
              aria-label={desktopState === 'collapsed' ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
              title={desktopState === 'collapsed' ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
              className="hidden md:flex p-1.5 -ml-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
          )}

          {/* Institution Selector */}
          <div className="relative">
            <select
              value={selectedInstitutionId ?? ''}
              onChange={(e) => setSelectedInstitution(Number(e.target.value))}
              className="appearance-none text-sm border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Academic Year Selector */}
          <div className="relative">
            <select
              value={selectedAcademicYearId ?? ''}
              onChange={(e) => setSelectedAcademicYear(Number(e.target.value))}
              className="appearance-none text-sm border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  AY {year.name} {year.is_current ? '(Current)' : '(Historical)'}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <div className="flex-1" />

          {!isInstalled && (
            <Link
              to="/install"
              title="Install PrathamOne Academy Desktop & Mobile App"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Install App</span>
            </Link>
          )}

          <p className="text-sm font-medium text-gray-600 hidden sm:block">
            Prashant Academy Coaching Institute
          </p>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 min-h-0 min-w-0 print:h-auto print:overflow-visible print:p-0">
          <Outlet />
        </main>

        {/* Application Fixed Bottom Footer */}
        <Footer />
      </div>
    </div>
  )
}
