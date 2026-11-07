# /**
#  * @file        update_login_and_sidebar_branding.py
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
#  * @created     2026-11-08
#  * @updated     2026-11-08
#  *
#  * @description Integrates dynamic institution colors into Login.tsx and Sidebar.tsx active navigation links.
#  */

def update_login():
    path = "frontend/src/pages/Login.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Update ambient halo behind card
    old_halo = '<div className="absolute -inset-1 bg-gradient-to-r from-blue-500/25 via-cyan-400/20 to-indigo-500/25 rounded-3xl blur-xl opacity-75 transition-opacity" />'
    new_halo = """<div
          className="absolute -inset-1 rounded-3xl blur-xl opacity-70 transition-opacity"
          style={{
            background: `linear-gradient(135deg, ${branding.colors.primary}50 0%, ${branding.colors.secondary}40 50%, ${branding.colors.accent}40 100%)`,
          }}
        />"""
    if old_halo in content:
        content = content.replace(old_halo, new_halo)

    # 2. Update card header background
    old_header = '<div className="relative bg-gradient-to-r from-blue-800 via-primary-800 to-indigo-900 px-6 sm:px-8 py-7 sm:py-8 text-center overflow-hidden">'
    new_header = """<div
            className="relative px-6 sm:px-8 py-7 sm:py-8 text-center overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${branding.colors.primary} 0%, ${branding.colors.secondary} 100%)`,
            }}
          >"""
    if old_header in content:
        content = content.replace(old_header, new_header)

    # 3. Update sign in button
    old_btn = 'className="w-full py-3 px-4 mt-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-primary-600 to-indigo-600 hover:from-blue-700 hover:via-primary-700 hover:to-indigo-700 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-500/25"'
    new_btn = """style={{
                  background: `linear-gradient(135deg, ${branding.colors.primary} 0%, ${branding.colors.secondary} 100%)`,
                  boxShadow: `0 4px 14px 0 ${branding.colors.primary}40`,
                }}
                className="w-full py-3 px-4 mt-2 rounded-xl text-sm font-semibold text-white hover:brightness-105 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md" """
    if old_btn in content:
        content = content.replace(old_btn, new_btn)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated frontend/src/pages/Login.tsx")

def update_sidebar():
    path = "frontend/src/components/Sidebar.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Student Portal Nav active link (around line 290)
    old_student_nav = """                  `flex items-center ${
                    isCollapsed ? 'w-11 h-11 justify-center' : 'gap-3 px-3 py-2.5'
                  } rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`"""
    new_student_nav = """                  `flex items-center ${
                    isCollapsed ? 'w-11 h-11 justify-center' : 'gap-3 px-3 py-2.5'
                  } rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`"""
    if old_student_nav in content:
        content = content.replace(old_student_nav, new_student_nav)
        # Add style to NavLink
        content = content.replace(
            '<NavLink\n                to="/student-portal"',
            '<NavLink\n                to="/student-portal"\n                style={({ isActive }) => (isActive ? { backgroundColor: branding.colors.primary } : undefined)}'
        )

    # 2. Staff Sidebar primary nav items (around line 535)
    old_staff_nav = """                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'"""
    new_staff_nav = """                    isActive
                      ? 'text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'"""
    if old_staff_nav in content:
        content = content.replace(old_staff_nav, new_staff_nav)

    # Add style={({ isActive }) => (isActive ? { backgroundColor: branding.colors.primary } : undefined)} to the item NavLinks
    content = content.replace(
        '<NavLink\n                to={item.to}\n                aria-label={item.label}',
        '<NavLink\n                to={item.to}\n                aria-label={item.label}\n                style={({ isActive }) => (isActive ? { backgroundColor: branding.colors.primary } : undefined)}'
    )

    # 3. Academic Structure active link in collapsed and expanded
    content = content.replace(
        "isAcademicActive\n                        ? 'bg-blue-600 text-white shadow-md'",
        "isAcademicActive\n                        ? 'text-white shadow-md'"
    )
    content = content.replace(
        'className={({ isActive }) =>\n                    `w-11 h-11 flex items-center justify-center rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500',
        'style={isAcademicActive ? { backgroundColor: branding.colors.primary } : undefined}\n                  className={({ isActive }) =>\n                    `w-11 h-11 flex items-center justify-center rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500'
    )
    content = content.replace(
        'style={isAcademicActive ? { backgroundColor: branding.colors.primary } : undefined}\n                  style={isAcademicActive',
        'style={isAcademicActive'
    )

    # 4. Lead Management active link
    content = content.replace(
        "isCrmActive\n                        ? 'bg-blue-600 text-white shadow-md'",
        "isCrmActive\n                        ? 'text-white shadow-md'"
    )
    content = content.replace(
        'className={({ isActive }) =>\n                    `w-11 h-11 flex items-center justify-center rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${\n                      isCrmActive',
        'style={isCrmActive ? { backgroundColor: branding.colors.primary } : undefined}\n                    className={({ isActive }) =>\n                    `w-11 h-11 flex items-center justify-center rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${\n                      isCrmActive'
    )

    # 5. Sub-item active links (CRM and Academic)
    content = content.replace(
        "isSubActive\n                              ? 'bg-blue-600 text-white font-semibold'",
        "isSubActive\n                              ? 'text-white font-semibold'"
    )
    content = content.replace(
        '<NavLink\n                            key={sub.to}',
        '<NavLink\n                            key={sub.to}\n                            style={isSubActive ? { backgroundColor: branding.colors.primary } : undefined}'
    )

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated frontend/src/components/Sidebar.tsx")

if __name__ == "__main__":
    update_login()
    update_sidebar()

