---
title: "Functional Remediation Roadmap — Phased Action Plan for UI Integrity and Feature Completion"
module: "20_AUDITS_COMPLIANCE"
category: "AUDIT-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-07"
updated_date: "2026-11-07"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["remediation-roadmap", "action-plan", "implementation-phases", "workforce", "dossier-print"]
entities: ["User", "StaffProfile", "TeacherAssignment", "TeacherPayroll", "StaffDocument"]
api_routes: ["/api/v1/staff/assignments/create", "/api/v1/forms/render", "/api/v1/staff/{id}/lifecycle"]
related_modules: ["05_TEACHER_MANAGEMENT", "06_TEACHER_PAYROLL", "14_PRINTING_DOCUMENTS", "16_DATABASE_API"]
---

# PRATHAMONE EduOS — FUNCTIONAL REMEDIATION ROADMAP

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Baseline Version:** 1.0.0  
**Directive:** Forensic Audit & Evidence-Based Controlled Remediation  
**Lead Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Date:** 2026-11-07  

---

## 1. REMEDIATION STRATEGY & GOVERNANCE

This roadmap translates the findings of the **Full Functional UI, Placeholder & Action Audit** into a structured, phased implementation plan. Every remediation step strictly adheres to:
- **SSOT Integrity (Rules 001–009):** Reusing existing models (`users`, `staff_profiles`), router endpoints, and shared components before creating new assets.
- **Zero Mock Data Injection:** Replacing all synthetic fallbacks with authentic database queries and clean empty states.
- **Controlled Implementation:** No code modification is executed until explicit user authorization is granted.

---

## 2. PHASED REMEDIATION SCHEDULE

```
Phase 1: Quick-Win Action Restorations & Mock Data Elimination (P0)
  ├── 1.1 Wire 'Assign Batch & Subject' in TeacherProfilePage
  ├── 1.2 Wire 'Edit' Button in Teacher and Staff Hero Cards
  ├── 1.3 Bind Staff Department Donut Chart to live department_headcounts
  ├── 1.4 Eliminate synthetic hours fallbacks in TeacherManagement & backend
  └── 1.5 Eliminate synthetic salary fallbacks in StaffManagement & backend

Phase 2: Comprehensive Employee Dossier Print Subsystem (P1)
  ├── 2.1 Register 'employee_dossier' in backend FORM_CATALOGUE
  ├── 2.2 Implement aggregated dossier data extractor in form_renderer.py
  ├── 2.3 Create high-fidelity Employee Dossier A4 Print Template
  ├── 2.4 Wire 'Print Employee Dossier' in Teacher & Staff profile action menus
  └── 2.5 Support both browser print and DPDP-compliant verification seals

Phase 3: Staff Document Vault & Storage Engine (P2)
  ├── 3.1 Migration 023: Create 'staff_documents' table linked to users.id
  ├── 3.2 Implement backend document upload & download endpoints
  └── 3.3 Wire Document tab in profiles with upload, view, and verification badges

Phase 4: Non-Teaching Staff Operational Roster & Duty Scheduling (P3)
  ├── 4.1 Create staff shift and operational responsibilities model
  └── 4.2 Replace static bullet points in Responsibilities tab with live records
```

---

## 3. PHASE 1 DETAILED SPECIFICATION (PRIORITY 0 — IMMEDIATE FIXES)

### Step 1.1: Connect "Assign Batch & Subject" in Teacher Profile
- **Target File:** `frontend/src/pages/TeacherProfilePage.tsx`
- **Actions:**
  - Import `AssignTeacherModal` from `../components/teachers/AssignTeacherModal` (or `TeacherManagement.tsx`).
  - Add state `const [showAssignModal, setShowAssignModal] = useState(false)`.
  - Update `onAction`:
    ```tsx
    onAction={(key) => {
      if (key === 'lifecycle') setShowLifecycleModal(true)
      if (key === 'assign') setShowAssignModal(true)
      if (key === 'print') setShowPrintDossier(true)
    }}
    ```
  - Mount `<AssignTeacherModal teacherId={teacher.id} isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} />`.
- **Expected Outcome:** Clicking "Assign Batch & Subject" opens the assignment dialog pre-filtered to this teacher, allowing immediate allocation without leaving the profile.

### Step 1.2: Connect Hero Card "Edit" Button
- **Target Files:** `TeacherProfilePage.tsx` and `StaffProfilePage.tsx`
- **Actions:**
  - Add state `const [showEditModal, setShowEditModal] = useState(false)`.
  - Pass `onEdit={() => setShowEditModal(true)}` to `WorkforceHeroCard`.
  - Mount the corresponding edit modal (`TeacherModal` or `StaffModal`).
- **Expected Outcome:** The "Edit" button renders in the top-right header and opens the edit modal with current record fields pre-filled.

### Step 1.3: Bind Staff Department Donut Chart to Real Headcounts
- **Target File:** `frontend/src/pages/StaffManagement.tsx:371-381`
- **Actions:**
  - Replace the static array with:
    ```tsx
    segments={
      staffDashboard?.department_headcounts?.length
        ? staffDashboard.department_headcounts.map((dept: any, idx: number) => ({
            label: dept.department,
            count: dept.count,
            color: ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#6366F1', '#8B5CF6'][idx % 6]
          }))
        : [{ label: 'Unassigned', count: staffDashboard?.metrics?.total_staff || 0, color: '#94A3B8' }]
    }
    ```
- **Expected Outcome:** The donut chart accurately reflects actual administrative staff distribution across departments.

### Step 1.4 & 1.5: Eliminate Synthetic Fallbacks
- **Backend Service:** `backend/app/services/workforce_service.py`
  - Remove lines 291-297 (sample teaching hours injection).
  - Remove lines 430-432 (synthetic salary multiplier).
- **Frontend Pages:** `TeacherManagement.tsx:519` and `StaffManagement.tsx:389, 402`
  - Remove `|| 3420`, `|| 784500`, and `|| 126000` fallbacks.
  - Render actual values or `₹0` / `0 hrs`.

---

## 4. PHASE 2 DETAILED SPECIFICATION (PRIORITY 1 — EMPLOYEE DOSSIER PRINT)

### Architecture of the Aggregated Dossier Engine:
1. **Catalog Definition (`backend/app/services/form_catalog.py`):**
   - Add template `employee_dossier` with code `PA-HR-DOSSIER-01`.
   - Category: `HR / Official Records`.
   - Configurable Sections: Header, Personal Info, Employment Record, Academic Allocations (if teacher), Attendance & Leaves, Salary Structure, Credentials & KYC, Statutory Affidavits.
2. **Aggregated Data Extractor (`backend/app/services/form_renderer.py`):**
   - Implement `_extract_employee_dossier_data(db, user_id)`:
     - Query `User` joined with `StaffProfile`.
     - Query active `TeacherAssignment` records joined with `Standard`, `Division`, and `Subject`.
     - Query `TimetableEntry` for weekly schedule.
     - Query `Attendance` for 6-month attendance summary.
     - Query `StaffLeave` for approved leaves and balances.
     - Query `TeacherPaymentProfile` (for teachers) or `StaffProfile.basic_salary` (for staff).
     - Query `StaffEmploymentHistory` for full lifecycle progression audit trail.
3. **Frontend Print Modal & Trigger (`DossierPrintModal.tsx`):**
   - When the user selects "Print Employee Dossier" from `WorkforceHeroCard`, launch `DossierPrintModal`.
   - Fetch pre-rendered dossier payload from `POST /api/v1/forms/render`.
   - Render A4 print layout via `PrintDocumentBranding.tsx` and trigger browser print dialog.

---

## 5. VERIFICATION & QUALITY ASSURANCE CRITERIA

| Test Phase | Verification Tool / Command | Acceptance Gate |
| :--- | :--- | :--- |
| **Frontend Unit Tests** | `npm test` (Vitest) | 29 / 29 test suites pass; 0 regressions in Workforce tests. |
| **Backend Integration Tests**| `pytest` (Docker container) | 134 / 134 backend tests pass with clean session isolation. |
| **Documentation Integrity** | `python tools/docs_manager.py validate` | 100% frontmatter compliance; 0 indexing errors. |
| **Corporate Headers** | `python scripts/manage_headers.py check` | 100% compliance across all modified `.ts`, `.tsx`, `.py` files. |

---
*Roadmap Approved for Architectural Review by Product Architect Jawahar R Mallah — AITDL AI Technology & Development Lab.*

