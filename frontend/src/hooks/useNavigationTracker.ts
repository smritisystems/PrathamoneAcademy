/**
 * @file        useNavigationTracker.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.hooks
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-10
 * @updated     2026-11-10
 *
 * @description Automatic, privacy-preserving route telemetry tracker for intelligent menu recommendations.
 */

import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useNavigationStore } from '../store/navigationStore'
import { findModuleByPath } from '../config/modules'

export function useNavigationTracker() {
  const location = useLocation()
  const { user, selectedInstitutionId } = useAuthStore()
  const { recordVisit, fetchConfig } = useNavigationStore()
  const lastPathRef = useRef<string>('')
  const hasLoadedRef = useRef<boolean>(false)

  // Initial fetch of navigation preferences & suggestions
  useEffect(() => {
    if (user && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      fetchConfig(selectedInstitutionId || 1)
    }
  }, [user, selectedInstitutionId, fetchConfig])

  // Track route changes
  useEffect(() => {
    const currentPath = location.pathname
    if (!user || currentPath === '/login' || currentPath === lastPathRef.current) {
      return
    }

    lastPathRef.current = currentPath
    const matchedModule = findModuleByPath(currentPath)
    if (matchedModule) {
      // Find sub item label if applicable
      const subItem = matchedModule.subItems.find((s) => s.to.toLowerCase() === currentPath.toLowerCase())
      const label = subItem ? `${matchedModule.label} — ${subItem.label}` : matchedModule.label

      recordVisit(
        {
          module_key: matchedModule.id,
          route_path: currentPath,
          label,
        },
        selectedInstitutionId || 1
      )
    }
  }, [location.pathname, user, selectedInstitutionId, recordVisit])
}
