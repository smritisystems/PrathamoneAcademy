# /**
#  * @file        patch_rule010_coverage.py
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
#  * @created     2026-11-07
#  * @updated     2026-11-07
#  *
#  * @description Automated patch utility extending Rule 010 View-First & Scoped Edit Mode coverage across all frontend pages.
#  */

import os
import sys

# Ensure UTF-8 output on Windows terminal
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'src', 'pages')

def patch_file(filename, check_str, patches):
    filepath = os.path.join(FRONTEND_DIR, filename)
    if not os.path.exists(filepath):
        print(f"[ERROR] File not found: {filepath}")
        return False
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    c_norm = content.replace('\r\n', '\n')
    
    if check_str in c_norm:
        print(f"[SKIP] {filename} is already patched with '{check_str}'.")
        return True
    
    for target, replacement in patches:
        if target not in c_norm:
            print(f"[FAIL] Target not found in {filename}:")
            print(repr(target[:140]) + "...")
            return False
        c_norm = c_norm.replace(target, replacement, 1)
        print(f"[OK] Replaced patch in {filename}")
    
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        f.write(c_norm.replace('\n', '\r\n'))
    
    print(f"[SUCCESS] Patched {filename} successfully.\n")
    return True

# --- Page 4: Attendance.tsx ---
def patch_attendance():
    patches = [
        (
            "import { QrCode, CheckCircle2, AlertCircle, RefreshCw, Volume2, Clock, Check, Sparkles, X, User } from 'lucide-react'",
            "import { QrCode, CheckCircle2, AlertCircle, RefreshCw, Volume2, Clock, Check, Sparkles, X, User, Lock } from 'lucide-react'"
        ),
        (
            "import { useAuthStore } from '../store/authStore'\nimport toast from 'react-hot-toast'",
            "import { useAuthStore } from '../store/authStore'\nimport { useEditModeStore } from '../store/editModeStore'\nimport { EditModeBar } from '../components/common'\nimport toast from 'react-hot-toast'"
        ),
        (
            "export default function Attendance() {\n  const { selectedInstitutionId, selectedAcademicYearId } = useAuthStore()",
            "export default function Attendance() {\n  const { selectedInstitutionId, selectedAcademicYearId } = useAuthStore()\n  const editScope = 'academic:attendance'\n  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])"
        ),
        (
            "  const handleScanSubmit = async (e?: React.FormEvent) => {\n    if (e) e.preventDefault()\n    const trimmed = scanInput.trim()",
            "  const handleScanSubmit = async (e?: React.FormEvent) => {\n    if (e) e.preventDefault()\n    if (!isEditMode) {\n      toast.error('Locked in View Mode: Please enable Edit Mode above to scan attendance.')\n      return\n    }\n    const trimmed = scanInput.trim()"
        ),
        (
            "  const handleSubmit = (e: React.FormEvent) => {\n    e.preventDefault()\n    if (rows.length === 0) {",
            "  const handleSubmit = (e: React.FormEvent) => {\n    e.preventDefault()\n    if (!isEditMode) {\n      toast.error('Locked in View Mode: Please enable Edit Mode above to save attendance.')\n      return\n    }\n    if (rows.length === 0) {"
        ),
        (
            "  return (\n    <div className=\"space-y-6\">\n      {/* Header */}",
            "  return (\n    <div className=\"space-y-6\">\n      {/* Global View-First & Explicit Edit Mode Governance Bar */}\n      <EditModeBar scope={editScope} title=\"Student Attendance Register & Scanner\" />\n\n      {/* Header */}"
        ),
        (
            """                <button
                  type="submit"
                  disabled={scanLoading || !scanInput.trim()}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Record Scan Check-In</span>
                </button>""",
            """                {isEditMode ? (
                  <button
                    type="submit"
                    disabled={scanLoading || !scanInput.trim()}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Record Scan Check-In</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toast.error('Locked in View Mode: Please enable Edit Mode above to record scan check-ins.')}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-purple-900/40 text-purple-300 border border-purple-500/30 cursor-not-allowed flex items-center justify-center gap-1.5"
                    title="Locked in View Mode: Enable Edit Mode above to record scan check-ins"
                  >
                    <Lock className="w-3.5 h-3.5 text-purple-300" />
                    <span>Scan Check-In (Locked)</span>
                  </button>
                )}"""
        ),
        (
            """        {rows.length > 0 && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={markMutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {markMutation.isPending ? 'Saving Attendance...' : '💾 Save Attendance Register'}
            </button>
          </div>
        )}""",
            """        {rows.length > 0 && (
          <div className="flex justify-end">
            {isEditMode ? (
              <button
                type="submit"
                disabled={markMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                {markMutation.isPending ? 'Saving Attendance...' : '💾 Save Attendance Register'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toast.error('Locked in View Mode: Please enable Edit Mode above to save attendance register.')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                title="Locked in View Mode: Enable Edit Mode above to save attendance"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Save Attendance Register (Locked)</span>
              </button>
            )}
          </div>
        )}"""
        )
    ]
    return patch_file('Attendance.tsx', 'academic:attendance', patches)

# --- Page 5: Examinations.tsx ---
def patch_examinations():
    patches = [
        (
            "import {\n  Award, Plus, Calendar, CheckCircle, FileSpreadsheet,\n  BarChart3, FileEdit, FileText, Users, Trophy, TrendingUp,\n  CheckCircle2, XCircle, AlertCircle, Save, X, Printer\n} from 'lucide-react'",
            "import {\n  Award, Plus, Calendar, CheckCircle, FileSpreadsheet,\n  BarChart3, FileEdit, FileText, Users, Trophy, TrendingUp,\n  CheckCircle2, XCircle, AlertCircle, Save, X, Printer, Lock\n} from 'lucide-react'"
        ),
        (
            "import { standardsApi, academicYearsApi, examinationsApi } from '../api/endpoints'\nimport { useAuthStore } from '../store/authStore'",
            "import { standardsApi, academicYearsApi, examinationsApi } from '../api/endpoints'\nimport { useAuthStore } from '../store/authStore'\nimport { useEditModeStore } from '../store/editModeStore'\nimport { EditModeBar } from '../components/common'"
        ),
        (
            "export default function ExaminationsPage() {\n  const { selectedInstitutionId, selectedAcademicYearId } = useAuthStore()",
            "export default function ExaminationsPage() {\n  const { selectedInstitutionId, selectedAcademicYearId } = useAuthStore()\n  const editScope = 'academic:examinations'\n  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])"
        ),
        (
            "  return (\n    <div className=\"space-y-6\">\n      {/* Header */}",
            "  return (\n    <div className=\"space-y-6\">\n      {/* Global View-First & Explicit Edit Mode Governance Bar */}\n      <EditModeBar scope={editScope} title=\"Examinations & Test Series Workspace\" isDirty={showExamModal} />\n\n      {/* Header */}"
        ),
        (
            """        <button
          onClick={() => {
            setExamForm((f) => ({
              ...f,
              academic_year_id: selectedAcademicYearId ? String(selectedAcademicYearId) : '',
              standard_id: currentStandardId,
            }))
            setShowExamModal(true)
          }}
          className="btn-primary flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Schedule Examination
        </button>""",
            """        {isEditMode ? (
          <button
            onClick={() => {
              setExamForm((f) => ({
                ...f,
                academic_year_id: selectedAcademicYearId ? String(selectedAcademicYearId) : '',
                standard_id: currentStandardId,
              }))
              setShowExamModal(true)
            }}
            className="btn-primary flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Schedule Examination
          </button>
        ) : (
          <button
            type="button"
            onClick={() => toast.error('Locked in View Mode: Please enable Edit Mode above to schedule examinations.')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-sm"
            title="Locked in View Mode: Enable Edit Mode above to schedule examinations"
          >
            <Lock className="w-4 h-4 text-slate-400" />
            <span>Schedule Examination (Locked)</span>
          </button>
        )}"""
        ),
        (
            """                <button
                  onClick={() => saveMarksMutation.mutate()}
                  disabled={saveMarksMutation.isPending || isLoadingMarks}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {saveMarksMutation.isPending ? 'Saving…' : 'Save All Marks'}
                </button>""",
            """                {isEditMode ? (
                  <button
                    onClick={() => saveMarksMutation.mutate()}
                    disabled={saveMarksMutation.isPending || isLoadingMarks}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" /> {saveMarksMutation.isPending ? 'Saving…' : 'Save All Marks'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toast.error('Locked in View Mode: Please enable Edit Mode above to save marks.')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-400 border border-slate-200 text-xs font-bold rounded-lg cursor-not-allowed"
                    title="Locked in View Mode: Enable Edit Mode above to save marks"
                  >
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span>Save All Marks (Locked)</span>
                  </button>
                )}"""
        )
    ]
    return patch_file('Examinations.tsx', 'academic:examinations', patches)

# --- Page 6: TeacherManagement.tsx ---
def patch_teacher_management():
    patches = [
        (
            "import { useAuthStore, isUserAdmin, isUserSysAdmin } from '../store/authStore'\nimport TeacherProfileModal from '../components/TeacherProfileModal'",
            "import { useAuthStore, isUserAdmin, isUserSysAdmin } from '../store/authStore'\nimport { useEditModeStore } from '../store/editModeStore'\nimport { EditModeBar } from '../components/common'\nimport { Lock } from 'lucide-react'\nimport TeacherProfileModal from '../components/TeacherProfileModal'"
        ),
        (
            "export default function TeacherManagement() {\n  const { user } = useAuthStore()",
            "export default function TeacherManagement() {\n  const { user } = useAuthStore()\n  const editScope = 'workforce:teachers'\n  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])"
        ),
        (
            "  return (\n    <div className=\"p-6 max-w-7xl mx-auto space-y-6\">\n      {/* ─── TOP WORKSPACE HEADER ────────────────────────────────────────── */}",
            "  return (\n    <div className=\"p-6 max-w-7xl mx-auto space-y-6\">\n      {/* Global View-First & Explicit Edit Mode Governance Bar */}\n      <EditModeBar scope={editScope} title=\"Teacher Workforce & Faculty Management\" isDirty={showCreateModal || showAssignModal} />\n\n      {/* ─── TOP WORKSPACE HEADER ────────────────────────────────────────── */}"
        ),
        (
            """          {(isAdmin || isSysAdmin) && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Teacher</span>
            </button>
          )}""",
            """          {(isAdmin || isSysAdmin) && (
            isEditMode ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add New Teacher</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toast.error('Locked in View Mode: Please enable Edit Mode above to add teachers.')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 text-slate-400 border border-slate-200 text-xs font-semibold rounded-lg cursor-not-allowed shadow-2xs"
                title="Locked in View Mode: Enable Edit Mode above to add teachers"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Add Teacher (Locked)</span>
              </button>
            )
          )}"""
        )
    ]
    return patch_file('TeacherManagement.tsx', 'workforce:teachers', patches)

# --- Page 7: StaffManagement.tsx ---
def patch_staff_management():
    patches = [
        (
            "import { useAuthStore, isUserAdmin, isUserSysAdmin } from '../store/authStore'\nimport StaffProfileModal from '../components/StaffProfileModal'",
            "import { useAuthStore, isUserAdmin, isUserSysAdmin } from '../store/authStore'\nimport { useEditModeStore } from '../store/editModeStore'\nimport { EditModeBar } from '../components/common'\nimport { Lock } from 'lucide-react'\nimport StaffProfileModal from '../components/StaffProfileModal'"
        ),
        (
            "export default function StaffManagement() {\n  const { user } = useAuthStore()",
            "export default function StaffManagement() {\n  const { user } = useAuthStore()\n  const editScope = 'workforce:staff'\n  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])"
        ),
        (
            "  return (\n    <div className=\"space-y-6\">\n      {/* Page Header */}",
            "  return (\n    <div className=\"space-y-6\">\n      {/* Global View-First & Explicit Edit Mode Governance Bar */}\n      <EditModeBar scope={editScope} title=\"Non-Teaching Staff & Administrative Workforce\" isDirty={showCreateModal || showAssignModal} />\n\n      {/* Page Header */}"
        ),
        (
            """        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          )}
        </div>""",
            """        <div className="flex items-center gap-2">
          {isAdmin && (
            isEditMode ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Staff Member</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toast.error('Locked in View Mode: Please enable Edit Mode above to add staff members.')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-400 border border-slate-200 text-sm font-semibold rounded-xl cursor-not-allowed shadow-2xs"
                title="Locked in View Mode: Enable Edit Mode above to add staff members"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Add Staff Member (Locked)</span>
              </button>
            )
          )}
        </div>"""
        )
    ]
    return patch_file('StaffManagement.tsx', 'workforce:staff', patches)

# --- Page 8: StaffProfilePage.tsx ---
def patch_staff_profile():
    patches = [
        (
            "import { staffApi } from '../api/endpoints'\nimport type { StaffProfileDetail, EmployeeActivityHistoryItem } from '../types'",
            "import { staffApi } from '../api/endpoints'\nimport { useEditModeStore } from '../store/editModeStore'\nimport { EditModeBar } from '../components/common'\nimport toast from 'react-hot-toast'\nimport type { StaffProfileDetail, EmployeeActivityHistoryItem } from '../types'"
        ),
        (
            "  const staffId = Number(id)\n\n  const [activeTab, setActiveTab] = useState<TabKey>('overview')",
            "  const staffId = Number(id)\n  const editScope = `workforce:staff:profile:${staffId}`\n  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])\n\n  const [activeTab, setActiveTab] = useState<TabKey>('overview')"
        ),
        (
            "  return (\n    <div className=\"space-y-5\">\n      {/* ─── Persistent Hero Card ────────────────────────────────────── */}",
            "  return (\n    <div className=\"space-y-5\">\n      {/* Global View-First & Explicit Edit Mode Governance Bar */}\n      <EditModeBar scope={editScope} title={`Staff Dossier — ${profile.full_name}`} isDirty={showEditModal} />\n\n      {/* ─── Persistent Hero Card ────────────────────────────────────── */}"
        ),
        (
            "        onEdit={() => setShowEditModal(true)}\n        onAction={(key) => {\n          if (key === 'lifecycle') setShowLifecycleModal(true)",
            "        onEdit={() => {\n          if (!isEditMode) {\n            toast.error('Locked in View Mode: Please enable Edit Mode above to modify employee records.')\n            return\n          }\n          setShowEditModal(true)\n        }}\n        onAction={(key) => {\n          if (key === 'lifecycle' && !isEditMode) {\n            toast.error('Locked in View Mode: Please enable Edit Mode above before modifying employee lifecycle.')\n            return\n          }\n          if (key === 'lifecycle') setShowLifecycleModal(true)"
        )
    ]
    return patch_file('StaffProfilePage.tsx', 'workforce:staff:profile:', patches)

# --- Page 9: TeacherPayroll.tsx ---
def patch_teacher_payroll():
    patches = [
        (
            "import { useAuthStore, isUserAdmin, isUserSysAdmin } from '../store/authStore'",
            "import { useAuthStore, isUserAdmin, isUserSysAdmin } from '../store/authStore'\nimport { useEditModeStore } from '../store/editModeStore'\nimport { EditModeBar } from '../components/common'\nimport toast from 'react-hot-toast'"
        ),
        (
            "export default function TeacherPayroll() {\n  const { user } = useAuthStore()",
            "export default function TeacherPayroll() {\n  const { user } = useAuthStore()\n  const editScope = 'workforce:payroll'\n  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])"
        ),
        (
            "  return (\n    <div className=\"space-y-6\">\n      {/* ── Top Header & Product Identity Banner ── */}",
            "  return (\n    <div className=\"space-y-6\">\n      {/* Global View-First & Explicit Edit Mode Governance Bar */}\n      <EditModeBar scope={editScope} title=\"Teacher Hourly & Session Payroll Engine\" isDirty={showLogSessionModal || showCalculateModal || showAdjustModal} />\n\n      {/* ── Top Header & Product Identity Banner ── */}"
        )
    ]
    return patch_file('TeacherPayroll.tsx', 'workforce:payroll', patches)

# --- Page 10: FeeCollection.tsx ---
def patch_fee_collection():
    patches = [
        (
            "import { QrCode } from 'lucide-react';",
            "import { QrCode, Lock } from 'lucide-react';\nimport { useEditModeStore } from '../store/editModeStore';\nimport { EditModeBar } from '../components/common';"
        ),
        (
            "export default function FeeCollection() {\n  const { studentId } = useParams<{ studentId: string }>();",
            "export default function FeeCollection() {\n  const { studentId } = useParams<{ studentId: string }>();\n  const editScope = 'finance:collection';\n  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope]);"
        ),
        (
            "  const handleSubmit = (e: React.FormEvent) => {\n    e.preventDefault();\n    setFormError('');",
            "  const handleSubmit = (e: React.FormEvent) => {\n    e.preventDefault();\n    if (!isEditMode) {\n      toast.error('Locked in View Mode: Please enable Edit Mode above to record payments.');\n      return;\n    }\n    setFormError('');"
        ),
        (
            "  return (\n    <div className=\"space-y-6\">\n      {/* Header */}",
            "  return (\n    <div className=\"space-y-6\">\n      {/* Global View-First & Explicit Edit Mode Governance Bar */}\n      <EditModeBar scope={editScope} title=\"Student Fee Collection Terminal\" isDirty={Boolean(paymentAmount)} />\n\n      {/* Header */}"
        ),
        (
            """                  <button
                    type="submit"
                    disabled={payMutation.isPending}
                    className="btn-primary flex items-center gap-2"
                  >
                    {payMutation.isPending ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Processing…
                      </>
                    ) : (
                      '💳 Record Payment'
                    )}
                  </button>""",
            """                  {isEditMode ? (
                    <button
                      type="submit"
                      disabled={payMutation.isPending}
                      className="btn-primary flex items-center gap-2"
                    >
                      {payMutation.isPending ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Processing…
                        </>
                      ) : (
                        '💳 Record Payment'
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toast.error('Locked in View Mode: Please enable Edit Mode above to record payments.')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                      title="Locked in View Mode: Enable Edit Mode above to record payments"
                    >
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span>Record Payment (Locked)</span>
                    </button>
                  )}"""
        )
    ]
    return patch_file('FeeCollection.tsx', 'finance:collection', patches)

# --- Page 11: Payments.tsx ---
def patch_payments():
    patches = [
        (
            "import { useAuthStore, isUserSysAdmin, hasPermission, canUserEditPosted } from '../store/authStore'",
            "import { useAuthStore, isUserSysAdmin, hasPermission, canUserEditPosted } from '../store/authStore'\nimport { useEditModeStore } from '../store/editModeStore'\nimport { EditModeBar } from '../components/common'\nimport { Lock } from 'lucide-react'"
        ),
        (
            "export default function Payments() {\n  const { user, selectedAcademicYearId } = useAuthStore()",
            "export default function Payments() {\n  const { user, selectedAcademicYearId } = useAuthStore()\n  const editScope = 'finance:payments'\n  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])"
        ),
        (
            "  return (\n    <div className=\"space-y-6\">\n      {/* Page Header */}",
            "  return (\n    <div className=\"space-y-6\">\n      {/* Global View-First & Explicit Edit Mode Governance Bar */}\n      <EditModeBar scope={editScope} title=\"Payment History & Transactions Ledger\" isDirty={editModalOpen || refundModalOpen || reversalModalOpen} />\n\n      {/* Page Header */}"
        ),
        (
            "  const handleOpenEdit = (payment: PaymentTransactionItem) => {\n    setEditingPayment(payment)",
            "  const handleOpenEdit = (payment: PaymentTransactionItem) => {\n    if (!isEditMode) {\n      toast.error('Locked in View Mode: Please enable Edit Mode above to modify payment records.')\n      return\n    }\n    setEditingPayment(payment)"
        ),
        (
            "  const handleOpenReverse = (payment: PaymentTransactionItem) => {\n    setSelectedPayment(payment)",
            "  const handleOpenReverse = (payment: PaymentTransactionItem) => {\n    if (!isEditMode) {\n      toast.error('Locked in View Mode: Please enable Edit Mode above to reverse payments.')\n      return\n    }\n    setSelectedPayment(payment)"
        ),
        (
            "  const handleOpenRefund = (payment: PaymentTransactionItem) => {\n    setRefundingPayment(payment)",
            "  const handleOpenRefund = (payment: PaymentTransactionItem) => {\n    if (!isEditMode) {\n      toast.error('Locked in View Mode: Please enable Edit Mode above to process refunds.')\n      return\n    }\n    setRefundingPayment(payment)"
        )
    ]
    return patch_file('Payments.tsx', 'finance:payments', patches)

# --- Page 12: ImportFeeRegister.tsx ---
def patch_import_fee_register():
    patches = [
        (
            "import { feeRegisterImportApi } from '../api/endpoints'",
            "import { feeRegisterImportApi } from '../api/endpoints'\nimport { useEditModeStore } from '../store/editModeStore'\nimport { EditModeBar } from '../components/common'\nimport { Lock } from 'lucide-react'"
        ),
        (
            "export default function ImportFeeRegister() {\n  const [loading, setLoading] = useState<boolean>(true)",
            "export default function ImportFeeRegister() {\n  const editScope = 'finance:import_fee_register'\n  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])\n  const [loading, setLoading] = useState<boolean>(true)"
        ),
        (
            "  return (\n    <div className=\"space-y-6 pb-12\">\n      {/* Header */}",
            "  return (\n    <div className=\"space-y-6 pb-12\">\n      {/* Global View-First & Explicit Edit Mode Governance Bar */}\n      <EditModeBar scope={editScope} title=\"Legacy Fee Register Import Wizard\" isDirty={executing} />\n\n      {/* Header */}"
        ),
        (
            """          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={executing}
            className="btn btn-primary flex items-center gap-2 text-sm shadow-md shadow-primary-600/20"
          >
            {executing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Importing...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" /> Confirm & Execute Import
              </>
            )}
          </button>""",
            """          {isEditMode ? (
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={executing}
              className="btn btn-primary flex items-center gap-2 text-sm shadow-md shadow-primary-600/20"
            >
              {executing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Importing...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Confirm & Execute Import
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => toast.error('Locked in View Mode: Please enable Edit Mode above to execute fee imports.')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-2xs"
              title="Locked in View Mode: Enable Edit Mode above to execute fee imports"
            >
              <Lock className="w-4 h-4 text-slate-400" />
              <span>Confirm & Execute Import (Locked)</span>
            </button>
          )}"""
        )
    ]
    return patch_file('ImportFeeRegister.tsx', 'finance:import_fee_register', patches)

# --- Page 13: Users.tsx ---
def patch_users():
    patches = [
        (
            "import { useAuthStore } from '../store/authStore'",
            "import { useAuthStore } from '../store/authStore'\nimport { useEditModeStore } from '../store/editModeStore'\nimport { EditModeBar } from '../components/common'"
        ),
        (
            "export default function UsersPage() {\n  const navigate = useNavigate()\n  const { user: currentUser, selectedInstitutionId } = useAuthStore()",
            "export default function UsersPage() {\n  const navigate = useNavigate()\n  const { user: currentUser, selectedInstitutionId } = useAuthStore()\n  const editScope = 'admin:users'\n  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])"
        ),
        (
            "  return (\n    <div className=\"space-y-6 pb-16\">\n      {/* ── Top Header ──────────────────────────────────────────────────────── */}",
            "  return (\n    <div className=\"space-y-6 pb-16\">\n      {/* Global View-First & Explicit Edit Mode Governance Bar */}\n      <EditModeBar scope={editScope} title=\"User Management & System Access\" isDirty={createModalOpen || Boolean(editModalUser)} />\n\n      {/* ── Top Header ──────────────────────────────────────────────────────── */}"
        ),
        (
            """          <div className="flex items-center gap-2">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              Add User Account
            </button>
          </div>""",
            """          <div className="flex items-center gap-2">
            {isEditMode ? (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition"
              >
                <Plus className="w-4 h-4" />
                Add User Account
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toast.error('Locked in View Mode: Please enable Edit Mode above to create new user accounts.')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 text-xs font-bold cursor-not-allowed shadow-2xs"
                title="Locked in View Mode: Enable Edit Mode above to create user accounts"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Add User Account (Locked)</span>
              </button>
            )}
          </div>"""
        )
    ]
    return patch_file('Users.tsx', 'admin:users', patches)

# --- Page 14: UserProfile.tsx ---
def patch_user_profile():
    patches = [
        (
            "import { useAuthStore } from '../store/authStore'",
            "import { useAuthStore } from '../store/authStore'\nimport { useEditModeStore } from '../store/editModeStore'\nimport { EditModeBar } from '../components/common'\nimport { Lock } from 'lucide-react'"
        ),
        (
            "export default function UserProfilePage() {\n  const { id } = useParams<{ id: string }>()",
            "export default function UserProfilePage() {\n  const { id } = useParams<{ id: string }>()\n  const editScope = `admin:user:${id || 'me'}`\n  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])"
        ),
        (
            "  return (\n    <div className=\"space-y-6 pb-20\">\n      {/* ── Breadcrumb & Navigation ─────────────────────────────────────────── */}",
            "  return (\n    <div className=\"space-y-6 pb-20\">\n      {/* Global View-First & Explicit Edit Mode Governance Bar */}\n      <EditModeBar scope={editScope} title={`User Profile — @${user?.username || ''}`} isDirty={editModalOpen} />\n\n      {/* ── Breadcrumb & Navigation ─────────────────────────────────────────── */}"
        )
    ]
    return patch_file('UserProfile.tsx', 'admin:user:', patches)

# --- Page 15: SysAdminWorkspace.tsx ---
def patch_sysadmin_workspace():
    patches = [
        (
            "import { useAuthStore, isUserSysAdmin } from '../store/authStore'",
            "import { useAuthStore, isUserSysAdmin } from '../store/authStore'\nimport { useEditModeStore } from '../store/editModeStore'\nimport { EditModeBar } from '../components/common'"
        ),
        (
            "export default function SysAdminWorkspace() {\n  const { user } = useAuthStore()",
            "export default function SysAdminWorkspace() {\n  const { user } = useAuthStore()\n  const editScope = 'sysadmin:workspace'\n  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])"
        ),
        (
            "  return (\n    <div className=\"space-y-6\">\n      {/* Superuser Banner */}",
            "  return (\n    <div className=\"space-y-6\">\n      {/* Global View-First & Explicit Edit Mode Governance Bar */}\n      <EditModeBar scope={editScope} title=\"System Administrator Governance Workspace\" />\n\n      {/* Superuser Banner */}"
        ),
        (
            """                  if (confirm(`Execute universal edit on ${editPayload.model_name} #${editPayload.record_id}?`)) {
                    universalEditMutation.mutate(finalPayload)
                  }""",
            """                  if (!isEditMode) {
                    alert('Locked in View Mode: Please enable Edit Mode above to execute universal data edits.')
                    return
                  }
                  if (confirm(`Execute universal edit on ${editPayload.model_name} #${editPayload.record_id}?`)) {
                    universalEditMutation.mutate(finalPayload)
                  }"""
        )
    ]
    return patch_file('SysAdminWorkspace.tsx', 'sysadmin:workspace', patches)

# --- Page 16: CodeXStudio.tsx ---
def patch_codex_studio():
    patches = [
        (
            "import { useAuthStore, isUserSysAdmin } from '../store/authStore'",
            "import { useAuthStore, isUserSysAdmin } from '../store/authStore'\nimport { useEditModeStore } from '../store/editModeStore'\nimport { EditModeBar } from '../components/common'"
        ),
        (
            "export default function CodeXStudio() {\n  const { user } = useAuthStore()",
            "export default function CodeXStudio() {\n  const { user } = useAuthStore()\n  const editScope = 'security:codex'\n  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])"
        ),
        (
            "  return (\n    <div className=\"space-y-6 pb-16\">\n      {/* Top Header & Master Switch Banner */}",
            "  return (\n    <div className=\"space-y-6 pb-16\">\n      {/* Global View-First & Explicit Edit Mode Governance Bar */}\n      <EditModeBar scope={editScope} title=\"CodeX Cryptographic Obfuscation Studio\" />\n\n      {/* Top Header & Master Switch Banner */}"
        ),
        (
            "  const handleToggleMaster = async () => {\n    if (!config) return",
            "  const handleToggleMaster = async () => {\n    if (!isEditMode) {\n      setNotification({ type: 'error', message: 'Locked in View Mode: Please enable Edit Mode above to modify CodeX settings.' })\n      return\n    }\n    if (!config) return"
        ),
        (
            "  const handleToggleFeature = async (featureKey: keyof CodexConfig) => {\n    if (!config) return",
            "  const handleToggleFeature = async (featureKey: keyof CodexConfig) => {\n    if (!isEditMode) {\n      setNotification({ type: 'error', message: 'Locked in View Mode: Please enable Edit Mode above to toggle features.' })\n      return\n    }\n    if (!config) return"
        ),
        (
            "  const handleSaveProfile = async () => {\n    if (!activeProfileId) return",
            "  const handleSaveProfile = async () => {\n    if (!isEditMode) {\n      setNotification({ type: 'error', message: 'Locked in View Mode: Please enable Edit Mode above to save mapping profiles.' })\n      return\n    }\n    if (!activeProfileId) return"
        ),
        (
            "  const handleSaveScope = async (e: React.FormEvent) => {\n    e.preventDefault()",
            "  const handleSaveScope = async (e: React.FormEvent) => {\n    e.preventDefault()\n    if (!isEditMode) {\n      setNotification({ type: 'error', message: 'Locked in View Mode: Please enable Edit Mode above to save scopes.' })\n      return\n    }"
        )
    ]
    return patch_file('CodeXStudio.tsx', 'security:codex', patches)

# --- Page 17: Communication.tsx ---
def patch_communication():
    patches = [
        (
            "import { useAuthStore, isUserSysAdmin } from '../store/authStore'",
            "import { useAuthStore, isUserSysAdmin } from '../store/authStore'\nimport { useEditModeStore } from '../store/editModeStore'\nimport { EditModeBar } from '../components/common'\nimport { Lock } from 'lucide-react'"
        ),
        (
            "export default function Communication() {\n  const { user } = useAuthStore()",
            "export default function Communication() {\n  const { user } = useAuthStore()\n  const editScope = 'communication:broadcasts'\n  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])"
        ),
        (
            "  return (\n    <div className=\"min-h-screen bg-slate-50 flex flex-col\">\n      {/* Workspace Header */}",
            "  return (\n    <div className=\"min-h-screen bg-slate-50 flex flex-col\">\n      {/* Global View-First & Explicit Edit Mode Governance Bar */}\n      <EditModeBar scope={editScope} title=\"Communication Center & Multichannel Broadcasts\" />\n\n      {/* Workspace Header */}"
        ),
        (
            "  const handleExecuteSend = async () => {\n    if (selectedRecipients.length === 0) {",
            "  const handleExecuteSend = async () => {\n    if (!isEditMode) {\n      showNotification('error', 'Locked in View Mode: Please enable Edit Mode above to send messages.')\n      return\n    }\n    if (selectedRecipients.length === 0) {"
        ),
        (
            "  const handleSaveTemplate = async (e: React.FormEvent) => {\n    e.preventDefault()",
            "  const handleSaveTemplate = async (e: React.FormEvent) => {\n    e.preventDefault()\n    if (!isEditMode) {\n      showNotification('error', 'Locked in View Mode: Please enable Edit Mode above to save templates.')\n      return\n    }"
        ),
        (
            "  const handleSaveAutomationRules = async () => {",
            "  const handleSaveAutomationRules = async () => {\n    if (!isEditMode) {\n      showNotification('error', 'Locked in View Mode: Please enable Edit Mode above to update automation triggers.')\n      return\n    }"
        )
    ]
    return patch_file('Communication.tsx', 'communication:broadcasts', patches)

# --- Page 18: Releases.tsx ---
def patch_releases():
    patches = [
        (
            "import { useAuthStore, isUserSysAdmin } from '../store/authStore'",
            "import { useAuthStore, isUserSysAdmin } from '../store/authStore'\nimport { useEditModeStore } from '../store/editModeStore'\nimport { EditModeBar } from '../components/common'"
        ),
        (
            "export default function Releases() {\n  const { user } = useAuthStore()",
            "export default function Releases() {\n  const { user } = useAuthStore()\n  const editScope = 'system:releases'\n  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])"
        ),
        (
            "  return (\n    <div className=\"space-y-6 pb-12\">\n      {/* ─── Top Header Banner ──────────────────────────────────────────────── */}",
            "  return (\n    <div className=\"space-y-6 pb-12\">\n      {/* Global View-First & Explicit Edit Mode Governance Bar */}\n      <EditModeBar scope={editScope} title=\"Release Management & Deployment History\" isDirty={draftModalOpen || editModalOpen} />\n\n      {/* ─── Top Header Banner ──────────────────────────────────────────────── */}"
        )
    ]
    return patch_file('Releases.tsx', 'system:releases', patches)

# --- Page 19: ImportExport.tsx ---
def patch_import_export():
    patches = [
        (
            "import {\n  importExportApi, academicYearsApi, boardsApi, standardsApi, divisionsApi\n} from '../api/endpoints'",
            "import {\n  importExportApi, academicYearsApi, boardsApi, standardsApi, divisionsApi\n} from '../api/endpoints'\nimport { useEditModeStore } from '../store/editModeStore'\nimport { EditModeBar } from '../components/common'\nimport { Lock } from 'lucide-react'"
        ),
        (
            "export default function ImportExportPage() {\n  const [activeTab, setActiveTab] = useState<ActiveTab>('paste')",
            "export default function ImportExportPage() {\n  const editScope = 'system:import_export'\n  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])\n  const [activeTab, setActiveTab] = useState<ActiveTab>('paste')"
        ),
        (
            "  return (\n    <div className=\"space-y-6 pb-16\">\n      {/* ── Top Header ──────────────────────────────────────────────────────── */}",
            "  return (\n    <div className=\"space-y-6 pb-16\">\n      {/* Global View-First & Explicit Edit Mode Governance Bar */}\n      <EditModeBar scope={editScope} title=\"Import & Export Center\" isDirty={gridExecuting || fileExecuting} />\n\n      {/* ── Top Header ──────────────────────────────────────────────────────── */}"
        ),
        (
            "  const handleCommitGridImport = async () => {\n    if (!gridPreview || !currentEntity) return",
            "  const handleCommitGridImport = async () => {\n    if (!isEditMode) {\n      setFeedbackMsg({ type: 'error', text: 'Locked in View Mode: Please enable Edit Mode above before executing database imports.' })\n      return\n    }\n    if (!gridPreview || !currentEntity) return"
        ),
        (
            "  const handleCommitFileImport = async () => {\n    if (!filePreview || !selectedFile) return",
            "  const handleCommitFileImport = async () => {\n    if (!isEditMode) {\n      setFeedbackMsg({ type: 'error', text: 'Locked in View Mode: Please enable Edit Mode above before executing database imports.' })\n      return\n    }\n    if (!filePreview || !selectedFile) return"
        )
    ]
    return patch_file('ImportExport.tsx', 'system:import_export', patches)

# --- Page 20: FormsDocuments.tsx ---
def patch_forms_documents():
    patches = [
        (
            "import { formsApi, studentsApi, usersApi, divisionsApi, standardsApi } from '../api/endpoints'",
            "import { formsApi, studentsApi, usersApi, divisionsApi, standardsApi } from '../api/endpoints'\nimport { useEditModeStore } from '../store/editModeStore'\nimport { EditModeBar } from '../components/common'"
        ),
        (
            "export default function FormsDocuments() {\n  const [searchParams, setSearchParams] = useSearchParams()",
            "export default function FormsDocuments() {\n  const [searchParams, setSearchParams] = useSearchParams()\n  const editScope = 'academic:forms_documents'\n  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])"
        ),
        (
            "  return (\n    <div className=\"space-y-6\">\n      {/* ── Page Header & Quick Bar (Hidden during Print) ── */}",
            "  return (\n    <div className=\"space-y-6\">\n      {/* Global View-First & Explicit Edit Mode Governance Bar */}\n      <EditModeBar scope={editScope} title=\"Printable Forms & Official Documents Engine\" />\n\n      {/* ── Page Header & Quick Bar (Hidden during Print) ── */}"
        )
    ]
    return patch_file('FormsDocuments.tsx', 'academic:forms_documents', patches)

if __name__ == '__main__':
    all_funcs = [
        patch_attendance,
        patch_examinations,
        patch_teacher_management,
        patch_staff_management,
        patch_staff_profile,
        patch_teacher_payroll,
        patch_fee_collection,
        patch_payments,
        patch_import_fee_register,
        patch_users,
        patch_user_profile,
        patch_sysadmin_workspace,
        patch_codex_studio,
        patch_communication,
        patch_releases,
        patch_import_export,
        patch_forms_documents,
    ]
    
    success = True
    for fn in all_funcs:
        ok = fn()
        if not ok:
            print(f"[ERROR] Failed in {fn.__name__}")
            success = False
            break
            
    if success:
        print("[SUCCESS] All remaining 17 pages patched with 100% precision!")
    else:
        sys.exit(1)
