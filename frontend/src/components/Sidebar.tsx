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
 * @updated     2026-11-06
 *
 * @description Collapsible multi-state sidebar navigation supporting expanded, icon-rail, and mobile drawer modes.
 */

import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserPlus, ClipboardList, Award, CreditCard,
  BookOpen, BarChart2, Shield, LogOut, GraduationCap, ChevronDown, ChevronRight,
  Settings, FileSpreadsheet, PanelLeftClose, PanelLeftOpen, X, EyeOff, Printer, Download,
  Briefcase, Terminal, MessageSquare, GitBranch, DollarSign
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
  { to: '/academic?tab=boards', label: 'Boards' },
  { to: '/academic?tab=classes', label: 'Classes / Standards' },
  { to: '/academic?tab=subjects', label: 'Subjects' },
  { to: '/academic?tab=batches', label: 'Batches' },
  { to: '/academic?tab=timetable', label: 'Timetable' },
  { to: '/academic?tab=enrollment', label: 'Enrollment' },
  { to: '/academic?tab=reports', label: 'Reports' },
  { to: '/academic?tab=settings', label: 'Settings' },
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
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const branding = useBranding()
  const {
    desktopState,
    mobileOpen,
    academicOpen,
    toggleCollapse,
    setDesktopState,
    expandSidebar,
    closeMobile,
    toggleAcademicOpen,
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

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isAcademicActive =
    location.pathname.startsWith('/academic') ||
    location.pathname.startsWith('/standards') ||
    location.pathname.startsWith('/batches') ||
    location.pathname.startsWith('/subjects') ||
    location.pathname.startsWith('/courses')

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
                {branding.assets.logoUrl && branding.assets.logoUrl !== '/logo.svg' ? (
                  <img
                    src={branding.assets.logoUrl}
                    alt={branding.academyName}
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
                className={({ isActive }) =>
                  `flex items-center ${
                    isCollapsed ? 'w-11 h-11 justify-center' : 'gap-3 px-3 py-2.5'
                  } rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
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
                } rounded-xl font-bold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  location.pathname === '/sysadmin'
                    ? 'bg-indigo-600 text-white shadow-md'
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
                  className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow"
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
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow flex-shrink-0">
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
              {branding.assets.logoUrl && branding.assets.logoUrl !== '/logo.svg' ? (
                <img
                  src={branding.assets.logoUrl}
                  alt={branding.academyName}
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
          {/* Main Top Level Items */}
          {mainNavItems.map((item) => (
            <div key={item.to} className={`relative group ${isCollapsed ? 'w-full flex justify-center' : ''}`}>
              <NavLink
                to={item.to}
                aria-label={item.label}
                className={({ isActive }) =>
                  `flex items-center ${
                    isCollapsed ? 'w-11 h-11 justify-center' : 'gap-3 px-3 py-2'
                  } rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
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
          <div className={`relative group ${isCollapsed ? 'w-full flex justify-center' : 'pt-1'}`}>
            {isCollapsed ? (
              // Collapsed mode: icon with floating interactive flyout submenu
              <div className="relative group w-full flex justify-center">
                <NavLink
                  to="/academic"
                  aria-label="Academic Workspace"
                  className={({ isActive }) =>
                    `w-11 h-11 flex items-center justify-center rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isAcademicActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <GraduationCap className="w-5 h-5" />
                </NavLink>

                {/* Floating Flyout Menu on Hover */}
                <div
                  role="menu"
                  className="absolute left-full ml-3 top-0 py-2.5 px-1.5 w-52 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/90 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-auto z-50 text-xs"
                >
                  <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Academic Workspace
                  </div>
                  <div className="mt-1 space-y-0.5 max-h-72 overflow-y-auto custom-scrollbar">
                    {academicSubItems.map((sub) => {
                      const isSubActive =
                        sub.to === '/academic'
                          ? location.pathname === '/academic' && !location.search
                          : location.pathname === '/academic' && location.search.includes(sub.to.split('=')[1])

                      return (
                        <NavLink
                          key={sub.to}
                          to={sub.to}
                          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                            isSubActive
                              ? 'bg-blue-600 text-white shadow-sm'
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-all text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isAcademicActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
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
                          ? location.pathname === '/academic' && !location.search
                          : location.pathname === '/academic' && location.search.includes(sub.to.split('=')[1])

                      return (
                        <NavLink
                          key={sub.to}
                          to={sub.to}
                          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isSubActive
                              ? 'bg-blue-600 text-white shadow-sm'
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

          {/* Secondary Nav Items */}
          {secondaryNavItems.map((item) => {
            const isItemActive =
              item.to.includes('?')
                ? location.pathname === '/academic' && location.search.includes('settings')
                : location.pathname === item.to

            return (
              <div key={item.to} className={`relative group ${isCollapsed ? 'w-full flex justify-center' : ''}`}>
                <NavLink
                  to={item.to}
                  aria-label={item.label}
                  className={`flex items-center ${
                    isCollapsed ? 'w-11 h-11 justify-center' : 'gap-3 px-3 py-2'
                  } rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isItemActive
                      ? 'bg-blue-600 text-white shadow-md'
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
                } rounded-xl font-bold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  location.pathname === '/sysadmin'
                    ? 'bg-indigo-600 text-white shadow-md'
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
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow flex-shrink-0">
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
      </aside>
    </>
  )
}
