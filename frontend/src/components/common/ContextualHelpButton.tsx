/**
 * @file        ContextualHelpButton.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.src.components.common
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-11
 * @updated     2026-11-12
 *
 * @description Contextual Help button and route-to-guide resolver opening module-specific user guides directly.
 */

import { HelpCircle } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { helpApi } from '../../api/endpoints'

interface ContextualMatch {
  slug: string
  moduleLabel: string
}

const CONTEXTUAL_ROUTE_TABLE: Array<{ prefix: string; slug: string; moduleLabel: string }> = [
  { prefix: '/fees/concessions', slug: 'guide-concessions', moduleLabel: 'Concessions & Waivers' },
  { prefix: '/fees/import', slug: 'guide-import-export', moduleLabel: 'Import & Export Center' },
  { prefix: '/import/fee-register', slug: 'guide-import-export', moduleLabel: 'Import & Export Center' },
  { prefix: '/import-export', slug: 'guide-import-export', moduleLabel: 'Import & Export Center' },
  { prefix: '/fees', slug: 'guide-fees', moduleLabel: 'Fee Management' },
  { prefix: '/payments', slug: 'guide-fees', moduleLabel: 'Fee Management' },
  { prefix: '/receipt', slug: 'tutorial-receipt-generation', moduleLabel: 'Receipt Generation' },
  { prefix: '/students/admission', slug: 'guide-admissions', moduleLabel: 'Admission Management' },
  { prefix: '/students/add', slug: 'guide-admissions', moduleLabel: 'Admission Management' },
  { prefix: '/students', slug: 'guide-students', moduleLabel: 'Student Management' },
  { prefix: '/leads', slug: 'guide-admissions', moduleLabel: 'Admission Management' },
  { prefix: '/examinations/report-cards', slug: 'guide-results', moduleLabel: 'Results & Report Cards' },
  { prefix: '/examinations/analytics', slug: 'guide-results', moduleLabel: 'Results & Report Cards' },
  { prefix: '/examinations', slug: 'guide-examinations', moduleLabel: 'Examination Management' },
  { prefix: '/academic/timetable', slug: 'guide-timetable', moduleLabel: 'Timetable Management' },
  { prefix: '/timetable', slug: 'guide-timetable', moduleLabel: 'Timetable Management' },
  { prefix: '/academic', slug: 'branch-class-and-division-setup', moduleLabel: 'Academic Setup' },
  { prefix: '/courses', slug: 'guide-courses', moduleLabel: 'Courses & Study Materials' },
  { prefix: '/homework', slug: 'guide-homework', moduleLabel: 'Homework & Assignments' },
  { prefix: '/forms-documents', slug: 'guide-forms', moduleLabel: 'Print Forms & KYC Studio' },
  { prefix: '/forms', slug: 'guide-forms', moduleLabel: 'Print Forms & KYC Studio' },
  { prefix: '/attendance', slug: 'guide-attendance', moduleLabel: 'Attendance Management' },
  { prefix: '/teachers', slug: 'guide-staff', moduleLabel: 'Staff & Faculty' },
  { prefix: '/staff', slug: 'guide-staff', moduleLabel: 'Staff Management' },
  { prefix: '/teacher-payroll', slug: 'guide-staff', moduleLabel: 'Staff & Payroll' },
  { prefix: '/communication', slug: 'guide-communication', moduleLabel: 'Communication Center' },
  { prefix: '/reports', slug: 'guide-reports', moduleLabel: 'Reports & Analytics' },
  { prefix: '/users', slug: 'user-management-setup', moduleLabel: 'User Management' },
  { prefix: '/housekeeping', slug: 'guide-settings', moduleLabel: 'Administration & Housekeeping' },
  { prefix: '/settings', slug: 'guide-settings', moduleLabel: 'Settings & Configuration' },
  { prefix: '/admin/training', slug: 'guide-training', moduleLabel: 'Training & Simulation Sandbox' },
  { prefix: '/training', slug: 'guide-training', moduleLabel: 'Training & Simulation Sandbox' },
  { prefix: '/student-portal', slug: 'welcome-to-prathamone-eduos', moduleLabel: 'Student Portal' },
  { prefix: '/dashboard', slug: 'guide-dashboard', moduleLabel: 'Dashboard' },
  { prefix: '/help/support', slug: 'faq-common-application-errors', moduleLabel: 'Troubleshooting & Support' },
]

const MODULE_KEY_TABLE: Record<string, ContextualMatch> = {
  dashboard: { slug: 'guide-dashboard', moduleLabel: 'Dashboard' },
  students: { slug: 'guide-students', moduleLabel: 'Student Management' },
  admissions: { slug: 'guide-admissions', moduleLabel: 'Admission Management' },
  fees: { slug: 'guide-fees', moduleLabel: 'Fee Management' },
  concessions: { slug: 'guide-concessions', moduleLabel: 'Concessions & Waivers' },
  scholarships: { slug: 'guide-scholarships', moduleLabel: 'Scholarships & Benefits' },
  attendance: { slug: 'guide-attendance', moduleLabel: 'Attendance Management' },
  timetable: { slug: 'guide-timetable', moduleLabel: 'Timetable Management' },
  courses: { slug: 'guide-courses', moduleLabel: 'Courses & Study Materials' },
  homework: { slug: 'guide-homework', moduleLabel: 'Homework & Assignments' },
  examinations: { slug: 'guide-examinations', moduleLabel: 'Examination Management' },
  results: { slug: 'guide-results', moduleLabel: 'Results & Report Cards' },
  staff: { slug: 'guide-staff', moduleLabel: 'Staff Management' },
  communication: { slug: 'guide-communication', moduleLabel: 'Communication Management' },
  forms: { slug: 'guide-forms', moduleLabel: 'Print Forms & KYC Studio' },
  reports: { slug: 'guide-reports', moduleLabel: 'Reports & Analytics' },
  import_export: { slug: 'guide-import-export', moduleLabel: 'Import & Export Center' },
  training: { slug: 'guide-training', moduleLabel: 'Training & Simulation Sandbox' },
  settings: { slug: 'guide-settings', moduleLabel: 'Administration & Settings' },
}

export function resolveContextualHelpPath(
  routePath: string,
  moduleKey?: string,
): { helpPath: string; slug: string; moduleLabel: string } {
  const cleanRoute = (routePath || '/').split('?')[0]
  if (moduleKey && MODULE_KEY_TABLE[moduleKey]) {
    const m = MODULE_KEY_TABLE[moduleKey]
    return {
      helpPath: `/help/article/${m.slug}?from=${encodeURIComponent(cleanRoute)}`,
      slug: m.slug,
      moduleLabel: m.moduleLabel,
    }
  }
  for (const rule of CONTEXTUAL_ROUTE_TABLE) {
    if (cleanRoute === rule.prefix || (rule.prefix !== '/' && cleanRoute.startsWith(rule.prefix))) {
      return {
        helpPath: `/help/article/${rule.slug}?from=${encodeURIComponent(cleanRoute)}`,
        slug: rule.slug,
        moduleLabel: rule.moduleLabel,
      }
    }
  }
  return {
    helpPath: `/help/article/welcome-to-prathamone-eduos?from=${encodeURIComponent(cleanRoute)}`,
    slug: 'welcome-to-prathamone-eduos',
    moduleLabel: 'Help & About Centre',
  }
}

interface ContextualHelpButtonProps {
  routePath?: string
  moduleKey?: string
  label?: string
  variant?: 'icon' | 'pill'
  className?: string
  title?: string
}

export default function ContextualHelpButton({
  routePath,
  moduleKey,
  label = 'Help',
  variant = 'pill',
  className = '',
  title,
}: ContextualHelpButtonProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const activeRoute = routePath || location.pathname
  const { helpPath, moduleLabel } = resolveContextualHelpPath(activeRoute, moduleKey)
  const tooltip = title || `Open ${moduleLabel} Help Guide`

  const handleClick = async () => {
    try {
      const res = await helpApi?.contextual?.({
        route: activeRoute,
        module_key: moduleKey,
      })
      const backendSlug = res?.data?.article?.slug
      const backendHelpRoute = res?.data?.help_route
      if (backendSlug || backendHelpRoute) {
        const targetBase = backendHelpRoute || `/help/article/${backendSlug}`
        const cleanBase = targetBase.split('?')[0]
        navigate(`${cleanBase}?from=${encodeURIComponent(activeRoute)}`)
        return
      }
    } catch {
      // Fallback safely to static contextual resolver when offline or unavailable
    }
    navigate(helpPath)
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={tooltip}
        aria-label={tooltip}
        data-testid="contextual-help-button"
        className={`w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors ${className}`}
      >
        <HelpCircle className="w-4 h-4" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={tooltip}
      aria-label={tooltip}
      data-testid="contextual-help-button"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-slate-600 hover:text-indigo-700 text-xs font-medium transition-colors shadow-xs ${className}`}
    >
      <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
      <span>{label}</span>
    </button>
  )
}
