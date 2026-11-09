/**
 * @file        Sidebar.tsx
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
 * @updated     2026-11-09
 *
 * @description Collapsible multi-state sidebar navigation supporting expanded, icon-rail, and mobile drawer modes.
 */

import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserPlus, ClipboardList, Award, CreditCard,
  BookOpen, BarChart2, Shield, LogOut, GraduationCap, ChevronDown, ChevronRight,
  Settings, FileSpreadsheet, PanelLeftClose, PanelLeftOpen, X, EyeOff, Printer, Download,
  Briefcase, Terminal, MessageSquare, GitBranch, DollarSign, Layers, FlaskConical
} from 'lucide-react'
import { useAuthStore, isUserSysAdmin } from '../store/authStore'
import { useSidebarStore } from '../store/sidebarStore'
import { useBranding } from '../config/branding'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const mainNavItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/students/add', label: 'Admissions', icon: UserPlus },
]

const academicSubItems = [
  { to: '/academic', label: 'Academic Structure' },
  { to: '/academic/boards', label: 'Boards' },
  { to: '/academic/classes', label: 'Classes / Standards' },
  { to: '/academic/subjects', label: 'Subjects' },
  { to: '/academic/batches', label: 'Batches' },
  { to: '/academic/timetable', label: 'Timetable' },
  { to: '/academic/enrollment', label: 'Enrollment' },
  { to: '/academic/reports', label: 'Reports' },
  { to: '/academic/settings', label: 'Settings' },
]

const crmSubItems = [
  { to: '/leads', label: 'Overview' },
  { to: '/leads/all', label: 'All Leads' },
  { to: '/leads/pipeline', label: 'Lead Pipeline' },
  { to: '/leads/follow-ups', label: 'Follow-ups' },
  { to: '/leads/counselling', label: 'Counselling & Demo' },
  { to: '/leads/sources', label: 'Lead Sources' },
  { to: '/leads/campaigns', label: 'Campaigns' },
  { to: '/leads/reports', label: 'Reports' },
  { to: '/leads/settings', label: 'Settings' },
]

const feesSubItems = [
  { to: '/fees/overview', label: 'Overview' },
  { to: '/fees/register', label: 'Fee Register' },
  { to: '/fees/collect', label: 'Collect Fees' },
  { to: '/fees/payments', label: 'Payments' },
  { to: '/fees/receipts', label: 'Receipts' },
  { to: '/fees/plans', label: 'Fee Plans' },
  { to: '/fees/reports', label: 'Reports' },
  { to: '/fees/settings', label: 'Settings' },
]

const examSubItems = [
  { to: '/examinations/overview', label: 'Overview' },
  { to: '/examinations/schedules', label: 'Exam Schedules' },
  { to: '/examinations/marks-entry', label: 'Marks Entry' },
  { to: '/examinations/analytics', label: 'Performance Analytics' },
  { to: '/examinations/report-cards', label: 'Report Cards' },
  { to: '/examinations/papers', label: 'Question Papers' },
  { to: '/examinations/settings', label: 'Settings & Grading' },
]

const attendanceSubItems = [
  { to: '/attendance/overview', label: 'Overview' },
  { to: '/attendance/daily', label: 'Daily Roll Call' },
  { to: '/attendance/qr-terminal', label: 'QR Terminal' },
  { to: '/attendance/register', label: 'Monthly Register' },
  { to: '/attendance/absenteeism', label: 'Defaulters & Alerts' },
  { to: '/attendance/leaves', label: 'Leave Requests' },
  { to: '/attendance/reports', label: 'Reports & Analytics' },
  { to: '/attendance/settings', label: 'Settings & Policies' },
]

const teachersSubItems = [
  { to: '/teachers/overview', label: 'Overview' },
  { to: '/teachers/directory', label: 'Faculty Directory' },
  { to: '/teachers/allocations', label: 'Batch Allocations' },
  { to: '/teachers/timetable', label: 'Teaching Schedules' },
  { to: '/teachers/attendance', label: 'Presence & Leaves' },
  { to: '/teachers/payroll', label: 'Salary & Payroll' },
  { to: '/teachers/performance', label: 'Teaching Sessions' },
  { to: '/teachers/settings', label: 'Policies & Settings' },
]

const secondaryNavItems: NavItem[] = [
  { to: '/teachers', label: 'Teachers', icon: GraduationCap },
  { to: '/staff', label: 'Staff Directory', icon: Briefcase },
  { to: '/teacher-payroll', label: 'Teacher Payroll', icon: DollarSign },
  { to: '/attendance', label: 'Attendance', icon: ClipboardList },
  { to: '/examinations', label: 'Tests & Results', icon: Award },
  { to: '/fees', label: 'Fees & Payments', icon: CreditCard },
  { to: '/courses', label: 'Study Materials', icon: BookOpen },
  { to: '/reports', label: 'Reports', icon: BarChart2 },
  { to: '/forms', label: 'Print Forms & KYC', icon: Printer },
  { to: '/communication', label: 'Communication Center', icon: MessageSquare },
  { to: '/import-export', label: 'Import & Export', icon: FileSpreadsheet },
  { to: '/install', label: 'Install App (PWA)', icon: Download },
  { to: '/users', label: 'Users & Roles', icon: Shield },
  { to: '/releases', label: 'Releases & Changes', icon: GitBranch },
  { to: '/training', label: 'Training & Demo Lab', icon: FlaskConical },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const branding = useBranding()
  const {
    desktopState,
    mobileOpen,
    academicOpen,
    crmOpen,
    feesOpen,
    examinationsOpen,
    attendanceOpen,
    teachersOpen,
    toggleCollapse,
    setDesktopState,
    expandSidebar,
    closeMobile,
    toggleAcademicOpen,
    toggleCrmOpen,
    toggleFeesOpen,
    toggleExaminationsOpen,
    toggleAttendanceOpen,
    toggleTeachersOpen,
  } = useSidebarStore()

  const navigate = useNavigate()
  const location = useLocation()
  const [isMobile, setIsMobile] = useState(false)

  // Track viewport width for responsive mobile drawer detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close mobile drawer on route navigation
  const prevLocationRef = useRef(location.pathname + location.search)
  useEffect(() => {
    if (prevLocationRef.current !== location.pathname + location.search) {
      prevLocationRef.current = location.pathname + location.search
      closeMobile()
    }
  }, [location.pathname, location.search, closeMobile])

  // Close mobile drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        closeMobile()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileOpen, closeMobile])

  const [logoLoadFailed, setLogoLoadFailed] = useState(false)
  const hasValidLogo = !!branding.assets.logoUrl && branding.assets.logoUrl !== '/logo.svg' && !logoLoadFailed

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isAcademicActive =
    location.pathname.startsWith('/academic') ||
    location.pathname.startsWith('/standards') ||
    location.pathname.startsWith('/batches') ||
    location.pathname.startsWith('/subjects') ||
    location.pathname.startsWith('/courses') ||
    location.pathname.startsWith('/boards') ||
    location.pathname.startsWith('/timetable') ||
    location.pathname.startsWith('/boards') ||
    location.pathname.startsWith('/timetable')

  const isTeachersActive = location.pathname.startsWith('/teachers') || location.pathname === '/teacher-management'
  const isTeachersSubActive = (to: string) => {
    if (to === '/teachers/overview' || to === '/teachers') {
      return (location.pathname === '/teachers' || location.pathname === '/teachers/overview' || location.pathname === '/teacher-management') && !location.search
    }
    return location.pathname === to || (location.pathname === '/teachers' && location.search.includes(to.replace('/teachers/', '')))
  }

  const isAttendanceActive = location.pathname.startsWith('/attendance')
  const isAttendanceSubActive = (to: string) => {
    if (to === '/attendance/overview' || to === '/attendance') {
      return (location.pathname === '/attendance' || location.pathname === '/attendance/overview') && !location.search
    }
    return location.pathname === to || (location.pathname === '/attendance' && location.search.includes(to.replace('/attendance/', '')))
  }

  const isExaminationsActive = location.pathname.startsWith('/examinations')

  const isExamSubActive = (subTo: string) => {
    if (subTo === '/examinations/overview') {
      return (
        (location.pathname === '/examinations' || location.pathname === '/examinations/overview') &&
        (!location.search || location.search === '' || location.search.includes('tab=overview'))
      )
    }
    const tabName = subTo.replace('/examinations/', '')
    return (
      location.pathname === subTo ||
      (location.pathname === '/examinations' && location.search.includes(`tab=${tabName}`))
    )
  }

  const isFeesActive =
    location.pathname.startsWith('/fees') ||
    location.pathname.startsWith('/receipts') ||
    location.pathname.startsWith('/payments')

  const isFeesSubActive = (subTo: string) => {
    if (subTo === '/fees/overview') {
      return (
        (location.pathname === '/fees' || location.pathname === '/fees/overview') &&
        (!location.search || location.search === '' || location.search.includes('tab=overview'))
      )
    }
    const tabName = subTo.replace('/fees/', '')
    return (
      location.pathname === subTo ||
      (location.pathname === '/fees' && location.search.includes(`tab=${tabName}`)) ||
      (subTo === '/fees/payments' && location.pathname.startsWith('/payments')) ||
      (subTo === '/fees/receipts' && location.pathname.startsWith('/receipts'))
    )
  }

  const isCrmActive =
    location.pathname.startsWith('/leads') ||
    location.pathname.startsWith('/crm')

  const isCrmSubActive = (subTo: string) => {
    if (subTo === '/leads') {
      return (
        (location.pathname === '/leads' || location.pathname === '/crm') &&
        (!location.search || location.search === '' || location.search === '?view=pipeline')
      )
    }
    if (subTo.includes('?view=')) {
      const viewParam = subTo.split('?view=')[1]
      return (
        (location.pathname === '/leads' || location.pathname === '/crm') &&
        location.search.includes(`view=${viewParam}`)
      )
    }
    if (subTo.includes('?tab=')) {
      const tabParam = subTo.split('?tab=')[1]
      return (
        (location.pathname === '/leads' || location.pathname === '/crm') &&
        location.search.includes(`tab=${tabParam}`)
      )
    }
    if (subTo.includes('?category=')) {
      const catParam = subTo.split('?category=')[1]
      return (
        location.pathname.startsWith('/reports') &&
        location.search.includes(`category=${catParam}`)
      )
    }
    return location.pathname + location.search === subTo
  }

  const isCollapsed = !isMobile && desktopState === 'collapsed'
  const isHidden = !isMobile && desktopState === 'hidden'

  // Student Portal Sidebar
  if (user?.role === 'student') {
    return (
      <>
        {/* Mobile Backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
            onClick={closeMobile}
            aria-hidden="true"
          />
        )}

        <aside
          id="app-sidebar"
          role="navigation"
          aria-label="Student Navigation"
          className={`
            bg-[#0f172a] text-white flex flex-col shadow-2xl border-r border-slate-800 transition-all duration-300 ease-in-out z-50
            fixed inset-y-0 left-0 md:static md:translate-x-0 h-full md:h-full shrink-0
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            ${
              isMobile
                ? 'w-72'
                : isHidden
                ? 'w-0 border-r-0 overflow-hidden opacity-0 pointer-events-none'
                : isCollapsed
                ? 'w-20'
                : 'w-64'
            }
          `}
        >
          {/* Header */}
          <div
            className={`px-4 py-4 border-b border-slate-800 flex items-center ${
              isCollapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                style={{
                  background: `linear-gradient(135deg, ${branding.colors.primary} 0%, ${branding.colors.secondary} 100%)`,
                }}
                className="w-9 h-9 rounded-xl p-0.5 shadow-md flex-shrink-0 flex items-center justify-center overflow-hidden"
              >
                {hasValidLogo ? (
                  <img
                    src={branding.assets.logoUrl}
                    alt={branding.academyName}
                    onError={() => setLogoLoadFailed(true)}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-900/60 backdrop-blur-xs rounded-lg flex items-center justify-center font-bold text-xs text-white">
                    {branding.monogram}
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="font-bold text-sm tracking-tight truncate">{branding.academyName}</p>
                  <p className="text-slate-400 text-xs font-medium truncate">Student Portal</p>
                </div>
              )}
            </div>

            {/* Collapse toggle / close button */}
            {isMobile ? (
              <button
                onClick={closeMobile}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                aria-label="Close sidebar drawer"
              >
                <X className="w-5 h-5" />
              </button>
            ) : isCollapsed ? (
              <button
                onClick={expandSidebar}
                className="mt-2 p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                title="Expand sidebar (Ctrl+B)"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={toggleCollapse}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Collapse sidebar (Ctrl+B)"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Student Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
            <div className={`relative group ${isCollapsed ? 'flex justify-center' : ''}`}>
              <NavLink
                to="/student-portal"
                style={({ isActive }) => (isActive ? { backgroundColor: branding.colors.primary } : undefined)}
                className={({ isActive }) =>
                  `flex items-center ${
                    isCollapsed ? 'w-11 h-11 justify-center' : 'gap-3 px-3 py-2.5'
                  } rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <GraduationCap className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span>Student Dashboard</span>}
              </NavLink>

              {isCollapsed && (
                <div
                  role="tooltip"
                  className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50"
                >
                  Student Dashboard
                </div>
              )}
            </div>
            {/* SysAdmin Superuser Link (only for sysadmin / superadmin) */}
          {isUserSysAdmin(user) && (
            <div className={`relative group mt-2 pt-2 border-t border-slate-800 ${isCollapsed ? 'w-full flex justify-center' : ''}`}>
              <NavLink
                to="/sysadmin"
                aria-label="SysAdmin Center"
                className={`flex items-center ${
                  isCollapsed ? 'w-11 h-11 justify-center' : 'gap-3 px-3 py-2'
                } rounded-xl font-bold transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  location.pathname === '/sysadmin'
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-indigo-400 bg-indigo-950/40 hover:bg-indigo-900/60 hover:text-white border border-indigo-800/40'
                }`}
              >
                <Terminal className="w-4 h-4 flex-shrink-0 text-indigo-400" />
                {!isCollapsed && <span className="truncate">SysAdmin Center</span>}
              </NavLink>

              {isCollapsed && (
                <div
                  role="tooltip"
                  className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-indigo-950 text-indigo-200 text-xs font-semibold rounded-lg shadow-xl border border-indigo-700 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 pointer-events-none z-50"
                >
                  SysAdmin Center
                </div>
              )}
            </div>
          )}
        </nav>

          {/* Footer User Card */}
          <div className="px-3 py-4 border-t border-slate-800 bg-slate-950/40">
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white shadow"
                  title={`${user?.first_name} ${user?.last_name}`}
                >
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  aria-label="Logout"
                  className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white shadow flex-shrink-0">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-white">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  aria-label="Logout"
                  className="p-1 rounded-lg hover:bg-slate-700/80 text-slate-400 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          {/* PrathamOne EduOS Platform Footnote */}
          {!isCollapsed ? (
            <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-950/70 flex items-center justify-between text-[10px] text-slate-400">
              <div className="flex items-center gap-1.5 truncate">
                <img
                  src={branding.assets.sealMarkTransparentUrl || branding.assets.symbolMarkTransparentUrl}
                  alt="PrathamOne EduOS"
                  className="w-3.5 h-3.5 object-contain"
                />
                <span className="font-medium text-slate-300 truncate">{branding.suiteName}</span>
              </div>
              <span className="font-mono text-slate-400 text-[9.5px]">{branding.versionDisplay}</span>
            </div>
          ) : (
            <div className="py-2 border-t border-slate-800/60 bg-slate-950/70 flex items-center justify-center" title={`${branding.suiteName} ${branding.versionDisplay}`}>
              <img
                src={branding.assets.sealMarkTransparentUrl || branding.assets.symbolMarkTransparentUrl}
                alt="PrathamOne EduOS"
                className="w-4 h-4 object-contain opacity-80 hover:opacity-100 transition-opacity"
              />
            </div>
          )}
        </aside>
      </>
    )
  }

  // Administrator / Staff Sidebar
  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Shell */}
      <aside
        id="app-sidebar"
        role="navigation"
        aria-label="Main Navigation"
        className={`
          bg-[#0f172a] text-white flex flex-col shadow-2xl border-r border-slate-800 transition-all duration-300 ease-in-out z-50
          fixed inset-y-0 left-0 md:static md:translate-x-0 h-full md:h-full shrink-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${
            isMobile
              ? 'w-72'
              : isHidden
              ? 'w-0 border-r-0 overflow-hidden opacity-0 pointer-events-none'
              : isCollapsed
              ? 'w-20'
              : 'w-64'
          }
        `}
      >
        {/* Brand Header */}
        <div
          className={`px-4 py-4 border-b border-slate-800/80 flex items-center ${
            isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              style={{
                background: `linear-gradient(135deg, ${branding.colors.primary} 0%, ${branding.colors.secondary} 100%)`,
              }}
              className="w-10 h-10 rounded-xl p-0.5 shadow-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
            >
              {hasValidLogo ? (
                <img
                  src={branding.assets.logoUrl}
                  alt={branding.academyName}
                  onError={() => setLogoLoadFailed(true)}
                  className="w-full h-full object-cover rounded-[10px]"
                />
              ) : (
                <div className="w-full h-full bg-slate-900/60 backdrop-blur-xs rounded-[10px] flex items-center justify-center font-black text-xs text-white">
                  {branding.monogram}
                </div>
              )}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="font-extrabold text-sm tracking-tight text-white truncate">
                  {branding.academyName}
                </h1>
                <p className="text-[11px] font-medium text-slate-400 truncate">
                  {branding.tagline}
                </p>
              </div>
            )}
          </div>

          {/* Action buttons in header */}
          {isMobile ? (
            <button
              onClick={closeMobile}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              aria-label="Close sidebar drawer"
            >
              <X className="w-5 h-5" />
            </button>
          ) : isCollapsed ? (
            <button
              onClick={expandSidebar}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Expand sidebar (Ctrl+B)"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={toggleCollapse}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Collapse sidebar (Ctrl+B)"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDesktopState('hidden')}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
                title="Hide sidebar"
                aria-label="Hide sidebar completely"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Items List */}
        <nav
          className={`flex-1 px-3 py-4 space-y-1.5 overflow-y-auto custom-scrollbar text-sm ${
            isCollapsed ? 'flex flex-col items-center' : ''
          }`}
        >
          {/* Dashboard Item */}
          {mainNavItems.slice(0, 1).map((item) => (
            <div key={item.to} className={`relative group ${isCollapsed ? 'w-full flex justify-center' : ''}`}>
              <NavLink
                to={item.to}
                aria-label={item.label}
                style={({ isActive }) => (isActive ? { backgroundColor: branding.colors.primary } : undefined)}
                className={({ isActive }) =>
                  `flex items-center ${
                    isCollapsed ? 'w-11 h-11 justify-center' : 'gap-3 px-3 py-2'
                  } rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    isActive
                      ? 'text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>

              {/* Floating Tooltip in Collapsed Mode */}
              {isCollapsed && (
                <div
                  role="tooltip"
                  className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 pointer-events-none z-50"
                >
                  {item.label}
                </div>
              )}
            </div>
          ))}

          {/* Academic Structure Item */}
          <div className={`relative group ${isCollapsed ? 'w-full flex justify-center' : 'pt-0.5'}`}>
            {isCollapsed ? (
              // Collapsed mode: icon with floating interactive flyout submenu
              <div className="relative group w-full flex justify-center">
                <NavLink
                  to="/academic"
                  aria-label="Academic Workspace"
                  style={isAcademicActive ? { backgroundColor: branding.colors.primary } : undefined}
                  className={({ isActive }) =>
                    `w-11 h-11 flex items-center justify-center rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      isAcademicActive
                        ? 'text-white shadow-md'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <GraduationCap className="w-5 h-5" />
                </NavLink>

                {/* Floating Flyout Menu on Hover */}
                <div
                  role="menu"
                  aria-label="Academic Workspace Menu"
                  className="absolute left-full ml-3 top-0 py-2.5 px-1.5 w-52 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/90 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-auto z-50 text-xs"
                >
                  <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Academic Workspace
                  </div>
                  <div className="mt-1 space-y-0.5 max-h-72 overflow-y-auto custom-scrollbar">
                    {academicSubItems.map((sub) => {
                      const isSubActive =
                        sub.to === '/academic'
                          ? (location.pathname === '/academic' || location.pathname === '/academic/overview') && !location.search
                          : location.pathname === sub.to ||
                            (location.pathname === '/academic' && location.search.includes(sub.to.replace('/academic/', ''))) ||
                            (sub.to === '/academic/classes' && location.pathname === '/standards') ||
                            (sub.to === '/academic/batches' && location.pathname === '/batches') ||
                            (sub.to === '/academic/boards' && location.pathname === '/boards') ||
                            (sub.to === '/academic/subjects' && location.pathname === '/subjects') ||
                            (sub.to === '/academic/timetable' && location.pathname === '/timetable')

                      return (
                        <NavLink
                          key={sub.to}
                          to={sub.to}
                          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                            isSubActive
                              ? 'bg-primary-600 text-white shadow-sm'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                          <span>{sub.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              // Expanded mode: Accordion button and nested collapsible sub-menu
              <div>
                <button
                  type="button"
                  onClick={toggleAcademicOpen}
                  aria-expanded={academicOpen}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-all text-left focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    isAcademicActive
                      ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <GraduationCap className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="truncate">Academic</span>
                  </div>
                  {academicOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                </button>

                {academicOpen && (
                  <div className="pl-5 pr-1 pt-1.5 space-y-1">
                    {academicSubItems.map((sub) => {
                      const isSubActive =
                        sub.to === '/academic'
                          ? (location.pathname === '/academic' || location.pathname === '/academic/overview') && !location.search
                          : location.pathname === sub.to ||
                            (location.pathname === '/academic' && location.search.includes(sub.to.replace('/academic/', ''))) ||
                            (sub.to === '/academic/classes' && location.pathname === '/standards') ||
                            (sub.to === '/academic/batches' && location.pathname === '/batches') ||
                            (sub.to === '/academic/boards' && location.pathname === '/boards') ||
                            (sub.to === '/academic/subjects' && location.pathname === '/subjects') ||
                            (sub.to === '/academic/timetable' && location.pathname === '/timetable')

                      return (
                        <NavLink
                          key={sub.to}
                          to={sub.to}
                          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                            isSubActive
                              ? 'bg-primary-600 text-white shadow-sm'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                          <span className="truncate">{sub.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Students and Admissions Items */}
          {mainNavItems.slice(1).map((item) => (
            <div key={item.to} className={`relative group ${isCollapsed ? 'w-full flex justify-center' : ''}`}>
              <NavLink
                to={item.to}
                aria-label={item.label}
                style={({ isActive }) => (isActive ? { backgroundColor: branding.colors.primary } : undefined)}
                className={({ isActive }) =>
                  `flex items-center ${
                    isCollapsed ? 'w-11 h-11 justify-center' : 'gap-3 px-3 py-2'
                  } rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    isActive
                      ? 'text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>

              {/* Floating Tooltip in Collapsed Mode */}
              {isCollapsed && (
                <div
                  role="tooltip"
                  className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 pointer-events-none z-50"
                >
                  {item.label}
                </div>
              )}
            </div>
          ))}

          {/* Lead Management & CRM Nav Group */}
          <div className={`relative group ${isCollapsed ? 'w-full flex justify-center' : 'pt-0.5'}`}>
            {isCollapsed ? (
              // Collapsed mode: icon with floating interactive flyout popover
              <div className="relative group w-full flex justify-center">
                <NavLink
                  to="/leads"
                  aria-label="Lead Management & CRM"
                  style={isCrmActive ? { backgroundColor: branding.colors.primary } : undefined}
                    className={({ isActive }) =>
                    `w-11 h-11 flex items-center justify-center rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      isCrmActive
                        ? 'text-white shadow-md'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Layers className="w-5 h-5" />
                </NavLink>

                {/* Floating Flyout Menu on Hover */}
                <div
                  role="menu"
                  aria-label="Lead Management & CRM Menu"
                  className="absolute left-full ml-3 top-0 py-2.5 px-1.5 w-56 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/90 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-auto z-50 text-xs"
                >
                  <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Lead Management & CRM
                  </div>
                  <div className="mt-1 space-y-0.5 max-h-72 overflow-y-auto custom-scrollbar">
                    {crmSubItems.map((sub) => {
                      const isSubActive = isCrmSubActive(sub.to)
                      return (
                        <NavLink
                          key={sub.to}
                          to={sub.to}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                            isSubActive
                              ? 'bg-primary-600 text-white shadow-sm font-semibold'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <ChevronRight className={`w-3 h-3 flex-shrink-0 ${isSubActive ? 'text-white' : 'text-slate-500'}`} />
                          <span className="truncate">{sub.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              // Expanded mode: Accordion button and nested collapsible sub-menu
              <div>
                <button
                  type="button"
                  onClick={toggleCrmOpen}
                  aria-expanded={crmOpen}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-all text-left focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    isCrmActive
                      ? 'bg-primary-600 text-white shadow-md font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Layers className={`w-4 h-4 flex-shrink-0 ${isCrmActive ? 'text-white' : 'text-blue-400'}`} />
                    <span className="truncate text-xs font-semibold">Lead Management & CRM</span>
                  </div>
                  {crmOpen ? (
                    <ChevronDown className={`w-4 h-4 flex-shrink-0 ${isCrmActive ? 'text-white' : 'text-slate-400'}`} />
                  ) : (
                    <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isCrmActive ? 'text-white' : 'text-slate-400'}`} />
                  )}
                </button>

                {crmOpen && (
                  <div className="pl-3 pr-1 pt-1.5 space-y-1">
                    {crmSubItems.map((sub) => {
                      const isSubActive = isCrmSubActive(sub.to)
                      return (
                        <NavLink
                          key={sub.to}
                          to={sub.to}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                            isSubActive
                              ? 'bg-primary-600 text-white font-semibold shadow-sm'
                              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                        >
                          <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${isSubActive ? 'text-white font-bold' : 'text-slate-500'}`} />
                          <span className="truncate">{sub.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Secondary Nav Items */}
          {secondaryNavItems.map((item) => {
            if (item.to === '/teachers') {
              return (
                <div key={item.to} className={`relative group ${isCollapsed ? 'w-full flex justify-center' : 'pt-0.5'}`}>
                  {isCollapsed ? (
                    // Collapsed mode: icon with floating interactive flyout popover
                    <div className="relative group w-full flex justify-center">
                      <NavLink
                        to="/teachers"
                        aria-label="Teachers"
                        style={isTeachersActive ? { backgroundColor: branding.colors.primary } : undefined}
                        className={({ isActive }) =>
                          `w-11 h-11 flex items-center justify-center rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                            isTeachersActive
                              ? 'text-white shadow-md'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`
                        }
                      >
                        <item.icon className="w-5 h-5" />
                      </NavLink>

                      {/* Tooltip */}
                      <div
                        role="tooltip"
                        className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 pointer-events-none z-50"
                      >
                        Teachers & Faculty
                      </div>

                      {/* Floating Flyout Menu on Hover */}
                      <div
                        role="menu"
                        aria-label="Teachers Menu"
                        className="absolute left-full ml-3 top-0 py-2.5 px-1.5 w-56 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/90 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-auto z-50 text-xs"
                      >
                        <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Teachers & Faculty
                        </div>
                        <div className="mt-1 space-y-0.5 max-h-72 overflow-y-auto custom-scrollbar">
                          {teachersSubItems.map((sub) => {
                            const isSubActive = isTeachersSubActive(sub.to)
                            return (
                              <NavLink
                                key={sub.to}
                                to={sub.to}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                                  isSubActive
                                    ? 'bg-primary-600 text-white shadow-sm font-semibold'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                              >
                                <ChevronRight className={`w-3 h-3 flex-shrink-0 ${isSubActive ? 'text-white' : 'text-slate-500'}`} />
                                <span className="truncate">{sub.label}</span>
                              </NavLink>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Expanded mode: Clickable parent link + chevron accordion toggle
                    <div>
                      <div
                        className={`w-full flex items-center justify-between rounded-xl font-medium transition-all ${
                          isTeachersActive
                            ? 'bg-primary-600 text-white shadow-md font-semibold'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <NavLink
                          to="/teachers"
                          aria-label="Teachers"
                          className="flex-1 flex items-center gap-3 px-3 py-2 min-w-0 focus:outline-none"
                        >
                          <item.icon className={`w-4 h-4 flex-shrink-0 ${isTeachersActive ? 'text-white' : 'text-indigo-400'}`} />
                          <span className="truncate text-xs font-semibold">Teachers</span>
                        </NavLink>
                        <button
                          type="button"
                          onClick={toggleTeachersOpen}
                          aria-expanded={teachersOpen}
                          aria-label="Toggle Teachers Submenu"
                          className="px-2.5 py-2 hover:bg-white/10 rounded-r-xl transition-colors focus:outline-none"
                        >
                          {teachersOpen ? (
                            <ChevronDown className={`w-4 h-4 flex-shrink-0 ${isTeachersActive ? 'text-white' : 'text-slate-400'}`} />
                          ) : (
                            <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isTeachersActive ? 'text-white' : 'text-slate-400'}`} />
                          )}
                        </button>
                      </div>

                      {teachersOpen && (
                        <div className="pl-3 pr-1 pt-1.5 space-y-1">
                          {teachersSubItems.map((sub) => {
                            const isSubActive = isTeachersSubActive(sub.to)
                            return (
                              <NavLink
                                key={sub.to}
                                to={sub.to}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                  isSubActive
                                    ? 'bg-primary-600 text-white font-semibold shadow-sm'
                                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                                }`}
                              >
                                <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${isSubActive ? 'text-white font-bold' : 'text-slate-500'}`} />
                                <span className="truncate">{sub.label}</span>
                              </NavLink>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            }

            if (item.to === '/attendance') {
              return (
                <div key={item.to} className={`relative group ${isCollapsed ? 'w-full flex justify-center' : 'pt-0.5'}`}>
                  {isCollapsed ? (
                    // Collapsed mode: icon with floating interactive flyout popover
                    <div className="relative group w-full flex justify-center">
                      <NavLink
                        to="/attendance"
                        aria-label="Attendance"
                        style={isAttendanceActive ? { backgroundColor: branding.colors.primary } : undefined}
                        className={({ isActive }) =>
                          `w-11 h-11 flex items-center justify-center rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                            isAttendanceActive
                              ? 'text-white shadow-md'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`
                        }
                      >
                        <item.icon className="w-5 h-5" />
                      </NavLink>

                      {/* Tooltip */}
                      <div
                        role="tooltip"
                        className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 pointer-events-none z-50"
                      >
                        Attendance
                      </div>

                      {/* Floating Flyout Menu on Hover */}
                      <div
                        role="menu"
                        aria-label="Attendance Menu"
                        className="absolute left-full ml-3 top-0 py-2.5 px-1.5 w-56 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/90 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-auto z-50 text-xs"
                      >
                        <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Attendance Centre
                        </div>
                        <div className="mt-1 space-y-0.5 max-h-72 overflow-y-auto custom-scrollbar">
                          {attendanceSubItems.map((sub) => {
                            const isSubActive = isAttendanceSubActive(sub.to)
                            return (
                              <NavLink
                                key={sub.to}
                                to={sub.to}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                                  isSubActive
                                    ? 'bg-primary-600 text-white shadow-sm font-semibold'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                              >
                                <ChevronRight className={`w-3 h-3 flex-shrink-0 ${isSubActive ? 'text-white' : 'text-slate-500'}`} />
                                <span className="truncate">{sub.label}</span>
                              </NavLink>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Expanded mode: Clickable parent link + chevron accordion toggle
                    <div>
                      <div
                        className={`w-full flex items-center justify-between rounded-xl font-medium transition-all ${
                          isAttendanceActive
                            ? 'bg-primary-600 text-white shadow-md font-semibold'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <NavLink
                          to="/attendance"
                          aria-label="Attendance"
                          className="flex-1 flex items-center gap-3 px-3 py-2 min-w-0 focus:outline-none"
                        >
                          <item.icon className={`w-4 h-4 flex-shrink-0 ${isAttendanceActive ? 'text-white' : 'text-emerald-400'}`} />
                          <span className="truncate text-xs font-semibold">Attendance</span>
                        </NavLink>
                        <button
                          type="button"
                          onClick={toggleAttendanceOpen}
                          aria-expanded={attendanceOpen}
                          aria-label="Toggle Attendance Submenu"
                          className="px-2.5 py-2 hover:bg-white/10 rounded-r-xl transition-colors focus:outline-none"
                        >
                          {attendanceOpen ? (
                            <ChevronDown className={`w-4 h-4 flex-shrink-0 ${isAttendanceActive ? 'text-white' : 'text-slate-400'}`} />
                          ) : (
                            <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isAttendanceActive ? 'text-white' : 'text-slate-400'}`} />
                          )}
                        </button>
                      </div>

                      {attendanceOpen && (
                        <div className="pl-3 pr-1 pt-1.5 space-y-1">
                          {attendanceSubItems.map((sub) => {
                            const isSubActive = isAttendanceSubActive(sub.to)
                            return (
                              <NavLink
                                key={sub.to}
                                to={sub.to}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                  isSubActive
                                    ? 'bg-primary-600 text-white font-semibold shadow-sm'
                                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                                }`}
                              >
                                <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${isSubActive ? 'text-white font-bold' : 'text-slate-500'}`} />
                                <span className="truncate">{sub.label}</span>
                              </NavLink>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            }

            if (item.to === '/examinations') {
              return (
                <div key={item.to} className={`relative group ${isCollapsed ? 'w-full flex justify-center' : 'pt-0.5'}`}>
                  {isCollapsed ? (
                    // Collapsed mode: icon with floating interactive flyout popover
                    <div className="relative group w-full flex justify-center">
                      <NavLink
                        to="/examinations"
                        aria-label="Tests & Results"
                        style={isExaminationsActive ? { backgroundColor: branding.colors.primary } : undefined}
                        className={({ isActive }) =>
                          `w-11 h-11 flex items-center justify-center rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                            isExaminationsActive
                              ? 'text-white shadow-md'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`
                        }
                      >
                        <Award className="w-5 h-5" />
                      </NavLink>

                      {/* Tooltip */}
                      <div
                        role="tooltip"
                        className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 pointer-events-none z-50"
                      >
                        Tests & Results
                      </div>

                      {/* Floating Flyout Menu on Hover */}
                      <div
                        role="menu"
                        aria-label="Tests & Results Menu"
                        className="absolute left-full ml-3 top-0 py-2.5 px-1.5 w-56 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/90 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-auto z-50 text-xs"
                      >
                        <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Tests & Results
                        </div>
                        <div className="mt-1 space-y-0.5 max-h-72 overflow-y-auto custom-scrollbar">
                          {examSubItems.map((sub) => {
                            const isSubActive = isExamSubActive(sub.to)
                            return (
                              <NavLink
                                key={sub.to}
                                to={sub.to}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                                  isSubActive
                                    ? 'bg-primary-600 text-white shadow-sm font-semibold'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                              >
                                <ChevronRight className={`w-3 h-3 flex-shrink-0 ${isSubActive ? 'text-white' : 'text-slate-500'}`} />
                                <span className="truncate">{sub.label}</span>
                              </NavLink>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Expanded mode: Clickable parent link + chevron accordion toggle
                    <div>
                      <div
                        className={`w-full flex items-center justify-between rounded-xl font-medium transition-all ${
                          isExaminationsActive
                            ? 'bg-primary-600 text-white shadow-md font-semibold'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <NavLink
                          to="/examinations"
                          aria-label="Tests & Results"
                          className="flex-1 flex items-center gap-3 px-3 py-2 min-w-0 focus:outline-none"
                        >
                          <Award className={`w-4 h-4 flex-shrink-0 ${isExaminationsActive ? 'text-white' : 'text-purple-400'}`} />
                          <span className="truncate text-xs font-semibold">Tests & Results</span>
                        </NavLink>
                        <button
                          type="button"
                          onClick={toggleExaminationsOpen}
                          aria-expanded={examinationsOpen}
                          aria-label="Toggle Tests & Results Submenu"
                          className="px-2.5 py-2 hover:bg-white/10 rounded-r-xl transition-colors focus:outline-none"
                        >
                          {examinationsOpen ? (
                            <ChevronDown className={`w-4 h-4 flex-shrink-0 ${isExaminationsActive ? 'text-white' : 'text-slate-400'}`} />
                          ) : (
                            <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isExaminationsActive ? 'text-white' : 'text-slate-400'}`} />
                          )}
                        </button>
                      </div>

                      {examinationsOpen && (
                        <div className="pl-3 pr-1 pt-1.5 space-y-1">
                          {examSubItems.map((sub) => {
                            const isSubActive = isExamSubActive(sub.to)
                            return (
                              <NavLink
                                key={sub.to}
                                to={sub.to}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                  isSubActive
                                    ? 'bg-primary-600 text-white font-semibold shadow-sm'
                                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                                }`}
                              >
                                <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${isSubActive ? 'text-white font-bold' : 'text-slate-500'}`} />
                                <span className="truncate">{sub.label}</span>
                              </NavLink>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            }

            if (item.to === '/fees') {
              return (
                <div key={item.to} className={`relative group ${isCollapsed ? 'w-full flex justify-center' : 'pt-0.5'}`}>
                  {isCollapsed ? (
                    // Collapsed mode: icon with floating interactive flyout popover
                    <div className="relative group w-full flex justify-center">
                      <NavLink
                        to="/fees"
                        aria-label="Fees & Payments"
                        style={isFeesActive ? { backgroundColor: branding.colors.primary } : undefined}
                        className={({ isActive }) =>
                          `w-11 h-11 flex items-center justify-center rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                            isFeesActive
                              ? 'text-white shadow-md'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`
                        }
                      >
                        <CreditCard className="w-5 h-5" />
                      </NavLink>

                      {/* Tooltip */}
                      <div
                        role="tooltip"
                        className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 pointer-events-none z-50"
                      >
                        Fees & Payments
                      </div>

                      {/* Floating Flyout Menu on Hover */}
                      <div
                        role="menu"
                        aria-label="Fees & Payments Menu"
                        className="absolute left-full ml-3 top-0 py-2.5 px-1.5 w-56 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/90 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-auto z-50 text-xs"
                      >
                        <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Fees & Payments
                        </div>
                        <div className="mt-1 space-y-0.5 max-h-72 overflow-y-auto custom-scrollbar">
                          {feesSubItems.map((sub) => {
                            const isSubActive = isFeesSubActive(sub.to)
                            return (
                              <NavLink
                                key={sub.to}
                                to={sub.to}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                                  isSubActive
                                    ? 'bg-primary-600 text-white shadow-sm font-semibold'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                              >
                                <ChevronRight className={`w-3 h-3 flex-shrink-0 ${isSubActive ? 'text-white' : 'text-slate-500'}`} />
                                <span className="truncate">{sub.label}</span>
                              </NavLink>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Expanded mode: Clickable parent link + chevron accordion toggle
                    <div>
                      <div
                        className={`w-full flex items-center justify-between rounded-xl font-medium transition-all ${
                          isFeesActive
                            ? 'bg-primary-600 text-white shadow-md font-semibold'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <NavLink
                          to="/fees"
                          aria-label="Fees & Payments"
                          className="flex-1 flex items-center gap-3 px-3 py-2 min-w-0 focus:outline-none"
                        >
                          <CreditCard className={`w-4 h-4 flex-shrink-0 ${isFeesActive ? 'text-white' : 'text-amber-400'}`} />
                          <span className="truncate text-xs font-semibold">Fees & Payments</span>
                        </NavLink>
                        <button
                          type="button"
                          onClick={toggleFeesOpen}
                          aria-expanded={feesOpen}
                          aria-label="Toggle Fees & Payments Submenu"
                          className="px-2.5 py-2 hover:bg-white/10 rounded-r-xl transition-colors focus:outline-none"
                        >
                          {feesOpen ? (
                            <ChevronDown className={`w-4 h-4 flex-shrink-0 ${isFeesActive ? 'text-white' : 'text-slate-400'}`} />
                          ) : (
                            <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isFeesActive ? 'text-white' : 'text-slate-400'}`} />
                          )}
                        </button>
                      </div>

                      {feesOpen && (
                        <div className="pl-3 pr-1 pt-1.5 space-y-1">
                          {feesSubItems.map((sub) => {
                            const isSubActive = isFeesSubActive(sub.to)
                            return (
                              <NavLink
                                key={sub.to}
                                to={sub.to}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                  isSubActive
                                    ? 'bg-primary-600 text-white font-semibold shadow-sm'
                                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                                }`}
                              >
                                <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${isSubActive ? 'text-white font-bold' : 'text-slate-500'}`} />
                                <span className="truncate">{sub.label}</span>
                              </NavLink>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            }

            const isItemActive =
              item.to.includes('?')
                ? location.pathname === '/academic' && location.search.includes('settings')
                : location.pathname === item.to

            return (
              <div key={item.to} className={`relative group ${isCollapsed ? 'w-full flex justify-center' : ''}`}>
                <NavLink
                  to={item.to}
                  aria-label={item.label}
                  style={isItemActive ? { backgroundColor: branding.colors.primary } : undefined}
                  className={`flex items-center ${
                    isCollapsed ? 'w-11 h-11 justify-center' : 'gap-3 px-3 py-2'
                  } rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    isItemActive
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </NavLink>

                {/* Tooltip in Collapsed Mode */}
                {isCollapsed && (
                  <div
                    role="tooltip"
                    className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 pointer-events-none z-50"
                  >
                    {item.label}
                  </div>
                )}
              </div>
            )
          })}
          {/* SysAdmin Superuser Link (only for sysadmin / superadmin) */}
          {isUserSysAdmin(user) && (
            <div className={`relative group mt-2 pt-2 border-t border-slate-800 ${isCollapsed ? 'w-full flex justify-center' : ''}`}>
              <NavLink
                to="/sysadmin"
                aria-label="SysAdmin Center"
                className={`flex items-center ${
                  isCollapsed ? 'w-11 h-11 justify-center' : 'gap-3 px-3 py-2'
                } rounded-xl font-bold transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  location.pathname === '/sysadmin'
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-indigo-400 bg-indigo-950/40 hover:bg-indigo-900/60 hover:text-white border border-indigo-800/40'
                }`}
              >
                <Terminal className="w-4 h-4 flex-shrink-0 text-indigo-400" />
                {!isCollapsed && <span className="truncate">SysAdmin Center</span>}
              </NavLink>

              {isCollapsed && (
                <div
                  role="tooltip"
                  className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-indigo-950 text-indigo-200 text-xs font-semibold rounded-lg shadow-xl border border-indigo-700 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 pointer-events-none z-50"
                >
                  SysAdmin Center
                </div>
              )}
            </div>
          )}
        </nav>

        {/* User Profile Footer Card */}
        <div className="px-3 py-4 border-t border-slate-800 bg-slate-950/40">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-md cursor-pointer"
                title={`${user?.first_name || 'Admin'} ${user?.last_name || 'User'} (${user?.role || 'admin'})`}
              >
                {user?.first_name?.[0] || 'A'}{user?.last_name?.[0] || 'U'}
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                aria-label="Logout"
                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white shadow flex-shrink-0">
                {user?.first_name?.[0] || 'A'}{user?.last_name?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-white">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-slate-400 capitalize truncate">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                aria-label="Logout"
                className="p-1.5 rounded-lg hover:bg-slate-700/80 text-slate-400 hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        {/* PrathamOne EduOS Platform Footnote */}
        {!isCollapsed ? (
          <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-950/70 flex items-center justify-between text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5 truncate">
              <img
                src={branding.assets.sealMarkTransparentUrl || branding.assets.symbolMarkTransparentUrl}
                alt="PrathamOne EduOS"
                className="w-3.5 h-3.5 object-contain"
              />
              <span className="font-medium text-slate-300 truncate">{branding.suiteName}</span>
            </div>
            <span className="font-mono text-slate-400 text-[9.5px]">{branding.versionDisplay}</span>
          </div>
        ) : (
          <div className="py-2 border-t border-slate-800/60 bg-slate-950/70 flex items-center justify-center" title={`${branding.suiteName} ${branding.versionDisplay}`}>
            <img
              src={branding.assets.sealMarkTransparentUrl || branding.assets.symbolMarkTransparentUrl}
              alt="PrathamOne EduOS"
              className="w-4 h-4 object-contain opacity-80 hover:opacity-100 transition-opacity"
            />
          </div>
        )}
      </aside>
    </>
  )
}
