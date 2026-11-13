# /**
#  * @file        enhance_sidebar_contrast.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-14
#  * @updated     2026-11-14
#  *
#  * @description Source component for Enhance Sidebar Contrast in the scripts module.
#  */

"""
/**
 * @file        enhance_sidebar_contrast.py
 * @project     PrathamOne EduOS Coaching Institute Management System
 * @module      scripts.ui
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-14
 * @updated     2026-11-14
 *
 * @description Systematically enhances Sidebar contrast, fixes icon visibility, active state illumination, and scroll clipping.
 */
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SIDEBAR_PATH = ROOT / "frontend" / "src" / "components" / "Sidebar.tsx"

def update_sidebar():
    content = SIDEBAR_PATH.read_text(encoding="utf-8")
    
    # 1. Add top and bottom scroll guard mask to Navigation list (around line 948)
    old_nav_open = """        {/* Navigation Items List */}
        <nav
          className={`flex-1 px-3 py-4 space-y-1.5 overflow-y-auto custom-scrollbar text-sm ${
            isCollapsed ? 'flex flex-col items-center' : ''
          }`}
        >"""
    new_nav_open = """        {/* Navigation Items List with Boundary Scroll Guard */}
        <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Top smooth scroll fade mask: prevents text slicing against header line */}
          <div className="pointer-events-none absolute top-0 inset-x-0 h-3 bg-gradient-to-b from-[#0f172a] to-transparent z-10" />

          <nav
            className={`flex-1 px-3 py-3 space-y-1.5 overflow-y-auto custom-scrollbar text-sm scroll-pt-3 ${
              isCollapsed ? 'flex flex-col items-center' : ''
            }`}
          >"""
    if old_nav_open in content:
        content = content.replace(old_nav_open, new_nav_open, 1)
        print("1. Added top scroll fade guard to Admin Navigation")
    else:
        print("Warning: old_nav_open not matched exactly!")

    # 2. Close the wrapper div after </nav> before Footer User Card (around line 2570)
    old_nav_close = """          {/* SysAdmin Superuser Link (only for sysadmin / superadmin) */}
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

        {/* Footer User Card */}"""

    new_nav_close = """          {/* SysAdmin Superuser Link (only for sysadmin / superadmin) */}
          {isUserSysAdmin(user) && (
            <div className={`relative group mt-2 pt-2 border-t border-slate-800 ${isCollapsed ? 'w-full flex justify-center' : ''}`}>
              <NavLink
                to="/sysadmin"
                aria-label="SysAdmin Center"
                className={`flex items-center ${
                  isCollapsed ? 'w-11 h-11 justify-center' : 'gap-3 px-3 py-2'
                } rounded-xl font-bold transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  location.pathname === '/sysadmin'
                    ? 'bg-white/10 text-white font-semibold shadow-sm border-l-4 border-[#F57C00]'
                    : 'text-violet-400 bg-violet-950/40 hover:bg-violet-900/60 hover:text-white border border-violet-800/40'
                }`}
              >
                <Terminal className="w-4 h-4 flex-shrink-0 text-violet-400" />
                {!isCollapsed && <span className="truncate">SysAdmin Center</span>}
              </NavLink>

              {isCollapsed && (
                <div
                  role="tooltip"
                  className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-violet-950 text-violet-200 text-xs font-semibold rounded-lg shadow-xl border border-violet-700 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 pointer-events-none z-50"
                >
                  SysAdmin Center
                </div>
              )}
            </div>
          )}
        </nav>
        {/* Bottom smooth scroll fade mask */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-3 bg-gradient-to-t from-[#0f172a] to-transparent z-10" />
      </div>

        {/* Footer User Card */}"""

    if old_nav_close in content:
        content = content.replace(old_nav_close, new_nav_close, 1)
        print("2. Added bottom scroll fade guard to Admin Navigation")
    else:
        print("Warning: old_nav_close not matched exactly!")

    # 3. Elevate the Footer Platform Emblem (around line 2620)
    old_footer_logo = """              <img
                src={branding.assets.sealMarkTransparentUrl || branding.assets.symbolMarkTransparentUrl}
                alt="PrathamOne EduOS"
                className="w-3.5 h-3.5 object-contain"
              />"""
    new_footer_logo = """              <div className="w-4 h-4 rounded bg-white/10 border border-white/10 flex items-center justify-center p-0.5 shrink-0">
                <img
                  src={branding.assets.sealMarkTransparentUrl || branding.assets.symbolMarkTransparentUrl}
                  alt="PrathamOne EduOS"
                  className="w-full h-full object-contain filter brightness-125"
                />
              </div>"""
    if old_footer_logo in content:
        content = content.replace(old_footer_logo, new_footer_logo, 1)
        print("3. Elevated Footer Platform Emblem with luminous container")

    # 4. Enhance Active State and Icon Colors across all Modules:
    # A. Academic Structure
    content = content.replace(
        '<GraduationCap className="w-4 h-4 text-blue-400 flex-shrink-0" />',
        '<GraduationCap className={`w-4 h-4 flex-shrink-0 ${isAcademicActive ? "text-[#F57C00]" : "text-sky-400"}`} />'
    )
    content = content.replace(
        "? 'bg-primary-600/20 text-primary-300 border border-primary-500/30'",
        "? 'bg-white/10 text-white font-semibold shadow-sm border-l-4 border-[#F57C00]'"
    )

    # B. Students
    content = content.replace(
        '<Users className={`w-4 h-4 flex-shrink-0 ${isStudentsActive ? \'text-white\' : \'text-blue-400\'}`} />',
        '<Users className={`w-4 h-4 flex-shrink-0 ${isStudentsActive ? \'text-[#F57C00]\' : \'text-cyan-400\'}`} />'
    )
    content = content.replace(
        "isStudentsActive\n                            ? 'bg-primary-600 text-white shadow-md font-semibold'",
        "isStudentsActive\n                            ? 'bg-white/10 text-white shadow-sm font-semibold border-l-4 border-[#F57C00]'"
    )

    # C. CRM
    content = content.replace(
        '<Layers className={`w-4 h-4 flex-shrink-0 ${isCrmActive ? \'text-white\' : \'text-blue-400\'}`} />',
        '<Layers className={`w-4 h-4 flex-shrink-0 ${isCrmActive ? \'text-[#F57C00]\' : \'text-sky-400\'}`} />'
    )
    content = content.replace(
        "isCrmActive\n                      ? 'bg-primary-600 text-white shadow-md font-semibold'",
        "isCrmActive\n                      ? 'bg-white/10 text-white shadow-sm font-semibold border-l-4 border-[#F57C00]'"
    )

    # D. Teachers
    content = content.replace(
        '<item.icon className={`w-4 h-4 flex-shrink-0 ${isTeachersActive ? \'text-white\' : \'text-indigo-400\'}`} />',
        '<item.icon className={`w-4 h-4 flex-shrink-0 ${isTeachersActive ? \'text-[#F57C00]\' : \'text-indigo-400\'}`} />'
    )
    content = content.replace(
        "isTeachersActive\n                            ? 'bg-primary-600 text-white shadow-md font-semibold'",
        "isTeachersActive\n                            ? 'bg-white/10 text-white shadow-sm font-semibold border-l-4 border-[#F57C00]'"
    )

    # E. Staff Directory
    content = content.replace(
        '<item.icon className={`w-4 h-4 flex-shrink-0 ${isStaffActive ? \'text-white\' : \'text-amber-400\'}`} />',
        '<item.icon className={`w-4 h-4 flex-shrink-0 ${isStaffActive ? \'text-[#F57C00]\' : \'text-amber-400\'}`} />'
    )
    content = content.replace(
        "isStaffActive\n                            ? 'bg-primary-600 text-white shadow-md font-semibold'",
        "isStaffActive\n                            ? 'bg-white/10 text-white shadow-sm font-semibold border-l-4 border-[#F57C00]'"
    )

    # F. Attendance
    content = content.replace(
        '<item.icon className={`w-4 h-4 flex-shrink-0 ${isAttendanceActive ? \'text-white\' : \'text-emerald-400\'}`} />',
        '<item.icon className={`w-4 h-4 flex-shrink-0 ${isAttendanceActive ? \'text-[#F57C00]\' : \'text-emerald-400\'}`} />'
    )
    content = content.replace(
        "isAttendanceActive\n                            ? 'bg-primary-600 text-white shadow-md font-semibold'",
        "isAttendanceActive\n                            ? 'bg-white/10 text-white shadow-sm font-semibold border-l-4 border-[#F57C00]'"
    )

    # G. Examinations
    content = content.replace(
        '<Award className={`w-4 h-4 flex-shrink-0 ${isExaminationsActive ? \'text-white\' : \'text-purple-400\'}`} />',
        '<Award className={`w-4 h-4 flex-shrink-0 ${isExaminationsActive ? \'text-[#F57C00]\' : \'text-purple-400\'}`} />'
    )
    content = content.replace(
        "isExaminationsActive\n                            ? 'bg-primary-600 text-white shadow-md font-semibold'",
        "isExaminationsActive\n                            ? 'bg-white/10 text-white shadow-sm font-semibold border-l-4 border-[#F57C00]'"
    )

    # H. Fees
    content = content.replace(
        '<CreditCard className={`w-4 h-4 flex-shrink-0 ${isFeesActive ? \'text-white\' : \'text-amber-400\'}`} />',
        '<CreditCard className={`w-4 h-4 flex-shrink-0 ${isFeesActive ? \'text-[#F57C00]\' : \'text-amber-400\'}`} />'
    )
    content = content.replace(
        "isFeesActive\n                            ? 'bg-primary-600 text-white shadow-md font-semibold'",
        "isFeesActive\n                            ? 'bg-white/10 text-white shadow-sm font-semibold border-l-4 border-[#F57C00]'"
    )

    # I. Courses
    content = content.replace(
        '<item.icon className={`w-4 h-4 flex-shrink-0 ${isCoursesActive ? \'text-white\' : \'text-sky-400\'}`} />',
        '<item.icon className={`w-4 h-4 flex-shrink-0 ${isCoursesActive ? \'text-[#F57C00]\' : \'text-sky-400\'}`} />'
    )
    content = content.replace(
        "isCoursesActive\n                            ? 'bg-primary-600 text-white shadow-md font-semibold'",
        "isCoursesActive\n                            ? 'bg-white/10 text-white shadow-sm font-semibold border-l-4 border-[#F57C00]'"
    )

    # J. Communication
    content = content.replace(
        '<item.icon className={`w-4 h-4 flex-shrink-0 ${isCommunicationActive ? \'text-white\' : \'text-violet-400\'}`} />',
        '<item.icon className={`w-4 h-4 flex-shrink-0 ${isCommunicationActive ? \'text-[#F57C00]\' : \'text-violet-400\'}`} />'
    )
    content = content.replace(
        "isCommunicationActive\n                            ? 'bg-primary-600 text-white shadow-md font-semibold'",
        "isCommunicationActive\n                            ? 'bg-white/10 text-white shadow-sm font-semibold border-l-4 border-[#F57C00]'"
    )

    # K. Forms
    content = content.replace(
        '<item.icon className={`w-4 h-4 flex-shrink-0 ${isFormsActive ? \'text-white\' : \'text-emerald-400\'}`} />',
        '<item.icon className={`w-4 h-4 flex-shrink-0 ${isFormsActive ? \'text-[#F57C00]\' : \'text-emerald-400\'}`} />'
    )
    content = content.replace(
        "isFormsActive\n                            ? 'bg-primary-600 text-white shadow-md font-semibold'",
        "isFormsActive\n                            ? 'bg-white/10 text-white shadow-sm font-semibold border-l-4 border-[#F57C00]'"
    )

    # L. Housekeeping
    content = content.replace(
        '<HardDrive className={`w-4 h-4 flex-shrink-0 ${isHousekeepingActive ? \'text-white\' : \'text-emerald-400\'}`} />',
        '<HardDrive className={`w-4 h-4 flex-shrink-0 ${isHousekeepingActive ? \'text-[#F57C00]\' : \'text-emerald-400\'}`} />'
    )
    content = content.replace(
        "isHousekeepingActive\n                            ? 'bg-primary-600 text-white shadow-md font-semibold'",
        "isHousekeepingActive\n                            ? 'bg-white/10 text-white shadow-sm font-semibold border-l-4 border-[#F57C00]'"
    )

    # M. General Nav Items (Dashboard, EduBoard, Reports, Users)
    content = content.replace(
        "isItemActive\n                      ? 'bg-primary-600 text-white shadow-md'",
        "isItemActive\n                      ? 'bg-white/10 text-white shadow-sm font-semibold border-l-4 border-[#F57C00]'"
    )
    content = content.replace(
        "isActive\n                      ? 'text-white shadow-md'",
        "isActive\n                      ? 'bg-white/10 text-white font-semibold shadow-sm border-l-4 border-[#F57C00]'"
    )

    # 5. Remove inline dark navy style overrides on active items in expanded mode
    # (they were forcing dark navy background #0B2D6B on #0F172A)
    content = content.replace("style={isTeachersActive ? { backgroundColor: branding.colors.primary } : undefined}", "")
    content = content.replace("style={isStaffActive ? { backgroundColor: branding.colors.primary } : undefined}", "")
    content = content.replace("style={isAttendanceActive ? { backgroundColor: branding.colors.primary } : undefined}", "")
    content = content.replace("style={isExaminationsActive ? { backgroundColor: branding.colors.primary } : undefined}", "")
    content = content.replace("style={isFeesActive ? { backgroundColor: branding.colors.primary } : undefined}", "")
    content = content.replace("style={isCoursesActive ? { backgroundColor: branding.colors.primary } : undefined}", "")
    content = content.replace("style={isCommunicationActive ? { backgroundColor: branding.colors.primary } : undefined}", "")
    content = content.replace("style={isFormsActive ? { backgroundColor: branding.colors.primary } : undefined}", "")
    content = content.replace("style={isHousekeepingActive ? { backgroundColor: branding.colors.primary } : undefined}", "")
    content = content.replace("style={isStudentsActive ? { backgroundColor: branding.colors.primary } : undefined}", "")
    content = content.replace("style={isAcademicActive ? { backgroundColor: branding.colors.primary } : undefined}", "")
    content = content.replace("style={isCrmActive ? { backgroundColor: branding.colors.primary } : undefined}", "")
    content = content.replace("style={isItemActive ? { backgroundColor: branding.colors.primary } : undefined}", "")

    # 6. Upgrade sub-item chevrons: from text-slate-500 to text-slate-400 / text-[#F57C00]
    content = content.replace(
        ": 'text-slate-500'",
        ": 'text-slate-400'"
    )
    content = content.replace(
        ": 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'",
        ": 'text-slate-300 hover:bg-slate-800/80 hover:text-white'"
    )
    content = content.replace(
        "? 'bg-primary-600 text-white font-semibold shadow-sm'",
        "? 'bg-white/10 text-white font-semibold shadow-xs border-l-2 border-[#F57C00]'"
    )
    content = content.replace(
        "? 'bg-primary-600 text-white shadow-sm font-semibold'",
        "? 'bg-white/10 text-white font-semibold shadow-xs border-l-2 border-[#F57C00]'"
    )
    content = content.replace(
        "? 'bg-primary-600 text-white shadow-sm'",
        "? 'bg-white/10 text-white font-semibold shadow-xs border-l-2 border-[#F57C00]'"
    )

    SIDEBAR_PATH.write_text(content, encoding="utf-8")
    print("Sidebar.tsx updated successfully!")

if __name__ == "__main__":
    update_sidebar()
