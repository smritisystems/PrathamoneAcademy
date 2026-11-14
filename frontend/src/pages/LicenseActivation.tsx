/**
 * @file        LicenseActivation.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pages
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-14
 * @updated     2026-11-15
 *
 * @description Institution Admin entry point for institution-scoped software license activation.
 */

import { KeyRound } from 'lucide-react'
import EditModeBar from '../components/common/EditModeBar'
import LicenseActivationPanel from '../components/LicenseActivationPanel'
import { useAuthStore, isUserSysAdmin } from '../store/authStore'

export default function LicenseActivation() {
  const { user, selectedInstitutionId } = useAuthStore()
  const isSysAdmin = isUserSysAdmin(user)
  const isInstitutionAdmin = (user?.role || '').toLowerCase() === 'admin'

  if (!isSysAdmin && !isInstitutionAdmin) {
    return (
      <div className="p-12 bg-white rounded-2xl border border-rose-200 text-center max-w-lg mx-auto my-12 space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Institution Admin access required</h2>
        <p className="text-sm text-slate-600">
          License activation is available to the institution's Admin and System Administrator only.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Software License</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review and activate the license for your institution. Institution Admins can only activate their assigned institution.
        </p>
      </header>
      <EditModeBar scope="license:activation" title="Institution License Activation" />
      <LicenseActivationPanel
        institutionId={isSysAdmin ? selectedInstitutionId ?? undefined : undefined}
        editScope="license:activation"
      />
    </div>
  )
}
