/**
 * @file        LicenseModeBanner.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.common
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-16
 * @updated     2026-11-26
 *
 * @description Displays verified license grace and Evaluation Mode status in the application shell.
 */

import { AlertTriangle, Clock, KeyRound, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { licenseApi } from '../../api/endpoints'
import { useAuthStore, isUserSysAdmin } from '../../store/authStore'
import { useEnvironmentStore } from '../../store/environmentStore'

export default function LicenseModeBanner() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const selectedInstitutionId = useAuthStore((state) => state.selectedInstitutionId)
  const isSysAdmin = isUserSysAdmin(user)
  const institutionId = isSysAdmin ? selectedInstitutionId : null
  const isTrainingMode = useEnvironmentStore((state) => state.isTrainingMode)
  const { data } = useQuery({
    queryKey: ['license-status', institutionId],
    queryFn: () => licenseApi.getStatus(institutionId ?? undefined).then((response) => response.data),
    enabled: !!token && !isTrainingMode,
    staleTime: 60_000,
    refetchInterval: 60 * 60 * 1000,
    retry: false,
  })

  if (!data) return null
  const isInstitutionAdmin = (user?.role || '').toLowerCase() === 'admin'
  const refreshUnavailable = ['unavailable', 'retry_scheduled'].includes(data.refresh_status)
  if (data.mode === 'active' && !refreshUnavailable) return null

  const isTrial = data.mode === 'trial'
  const inEvaluation = data.mode === 'evaluation' || data.mode === 'invalid' || data.mode === 'unactivated'
  const tone = isTrial
    ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
    : refreshUnavailable && !inEvaluation
    ? 'border-amber-300 bg-amber-50 text-amber-900'
    : inEvaluation
    ? 'border-rose-300 bg-rose-50 text-rose-900'
    : 'border-amber-300 bg-amber-50 text-amber-900'
  const trialStudents = data.trial_limits?.max_students ?? 100
  const trialStaff = data.trial_limits?.max_staff ?? 25
  const message = isTrial
    ? `30-Day Free Trial active: ${data.trial_days_remaining ?? 30} day(s) remaining (up to ${trialStudents} students & ${trialStaff} staff).`
    : refreshUnavailable
    ? `License authority is unreachable. The verified snapshot remains usable for up to ${data.offline_validity_days || 14} days after its issue time.`
    : data.mode === 'grace'
    ? 'License grace period is active. Renew or activate before the grace period ends.'
    : data.mode === 'invalid'
      ? 'The signed license could not be verified. Contact your system administrator.'
      : data.trial_expired
        ? 'Your 30-day free trial has ended. Data and reports remain read-only; activate a commercial license or use Training Mode.'
        : data.rollout_stage === 'shadow'
          ? 'License enforcement is in shadow mode. Verify activation before enforcement is enabled.'
          : 'Evaluation Mode is active: changes are disabled; historical data, approved reports, and exports remain available.'

  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-xs font-medium print:hidden ${tone}`}>
      <div className="flex min-w-0 items-center gap-2">
        {inEvaluation ? (
          <AlertTriangle className="h-4 w-4 shrink-0" />
        ) : isTrial ? (
          <Clock className="h-4 w-4 shrink-0" />
        ) : (
          <ShieldCheck className="h-4 w-4 shrink-0" />
        )}
        <span>{message}</span>
        {data.edition && <span className="hidden text-current/75 sm:inline">Edition: {data.edition}</span>}
      </div>
      {(isSysAdmin || isInstitutionAdmin) && (
        <Link
          to={isSysAdmin ? '/sysadmin' : '/license-activation'}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-current/20 bg-white/70 px-2.5 py-1 font-bold hover:bg-white"
        >
          <KeyRound className="h-3.5 w-3.5" />
          Manage license
        </Link>
      )}
    </div>
  )
}
