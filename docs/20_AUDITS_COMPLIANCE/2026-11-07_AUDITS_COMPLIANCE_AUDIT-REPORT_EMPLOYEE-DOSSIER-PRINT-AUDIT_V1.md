---
title: "Employee Dossier Print Forensic Audit — 14-Point Investigation & Architectural Blueprint"
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
tags: ["employee-dossier", "print-audit", "kyc", "hr-records", "14-point-audit", "ssot"]
entities: ["User", "StaffProfile", "TeacherAssignment", "TeacherPaymentProfile", "StaffLeave", "StaffEmploymentHistory"]
api_routes: ["/api/v1/forms/render", "/api/v1/forms/catalogue"]
related_modules: ["05_TEACHER_MANAGEMENT", "06_TEACHER_PAYROLL", "14_PRINTING_DOCUMENTS"]
---

# PRATHAMONE EduOS — EMPLOYEE DOSSIER PRINT FORENSIC AUDIT

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Baseline Version:** 1.0.0  
**Audit Scope:** 14-Point Forensic Examination of "Print Employee Dossier" Action  
**Lead Auditor:** Jawahar R Mallah, Product Architect  
**Organization:** AITDL — AI Technology & Development Lab  
**Audit Date:** 2026-11-07  

---

## 1. OBJECTIVE & EXECUTIVE SUMMARY

The Employee Dossier action menu item (*"Print Employee Dossier"*) in `WorkforceHeroCard.tsx` was subjected to an exhaustive 14-point forensic investigation across frontend components, API endpoints, template catalogs, PDF generation services, print stylesheets, and database isolation.

### Executive Verdict
**Print Employee Dossier is currently a dead UI placeholder.**
While the frontend dropdown menu renders the "Print Employee Dossier" option with a printer icon, clicking it triggers `onAction('print')`, which is completely unhandled in both `TeacherProfilePage.tsx` and `StaffProfilePage.tsx`. No network request is initiated, no print dialog opens, and no aggregated multi-tab dossier print template exists.

---

## 2. THE 14-POINT FORENSIC INVESTIGATION

```
  [ Print Employee Dossier Action Menu ]
                  │
                  ▼ (Triggers onAction('print'))
  ┌────────────────────────────────────────────────────────┐
  │ TeacherProfilePage.tsx:211 / StaffProfilePage.tsx:176  │
  │   if (key === 'lifecycle') setShowLifecycleModal(true)  │
  │   // ❌ 'print' key IS SILENTLY IGNORED               │
  └────────────────────────────────────────────────────────┘
                  │ (Execution terminates here)
                  ▼
          [ ZERO PRINT OUTPUT ]
```

### Point 1: Is Print Employee Dossier Implemented?
- **Finding:** **NO.**
- **Evidence:** In `frontend/src/components/workforce/WorkforceHeroCard.tsx` (lines 256-266), the dropdown button calls `onAction?.('print')`. However, in `TeacherProfilePage.tsx` (lines 211-213) and `StaffProfilePage.tsx` (lines 176-178), the implementation is:
  ```tsx
  onAction={(key) => {
    if (key === 'lifecycle') setShowLifecycleModal(true)
  }}
  ```
  Neither component defines a branch for `key === 'print'`.

### Point 2: Does it Pass the Specific Employee ID?
- **Finding:** **NO.**
- **Evidence:** `WorkforceHeroCard.tsx:260` invokes `onAction?.('print')` with zero arguments. It does not pass `id`, `user_id`, or `employee_id`.

### Point 3: Does it Retrieve the Employee's Full Details?
- **Finding:** **NO.**
- **Evidence:** While the individual profile pages retrieve basic profile data via `staffApi.getTeacherDashboard()` or `staffApi.getStaffDashboard()`, no API call exists to fetch an aggregated dossier payload for print formatting.

### Point 4: Does it Include Personal Details, Contact Info, and Photo?
- **Finding:** **NO (for Print Output).**
- **Evidence:** The profile screen displays these items, but because the print handler is missing, no printable document contains them. In the backend form engine (`form_renderer.py:350-400`), `_extract_staff_data` masks phone numbers with static fallbacks (`+91-9870011223`) and does not resolve employee photos or avatars.

### Point 5: Does it Include Employment Details, Department, Designation, Joining Date, and Status?
- **Finding:** **NO (for Print Output).**
- **Evidence:** In `form_renderer.py:350`, `_extract_staff_data` queries `users` without joining `staff_profiles`. It defaults `date_of_joining` to `'01-06-2023'` and `employment_type` to `'Full-Time Permanent'` instead of reading real columns.

### Point 6: Does it Include Batch & Subject Assignments (for Teachers)?
- **Finding:** **NO.**
- **Evidence:** Neither `form_renderer.py` nor any print template queries `TeacherAssignment` when formatting staff documents.

### Point 7: Does it Include Attendance and Leave History?
- **Finding:** **NO.**
- **Evidence:** No print template aggregates attendance records from `attendances` or leave entries from `staff_leaves` for dossier generation.

### Point 8: Does it Include Payroll, Salary Structure, and Payment History?
- **Finding:** **NO.**
- **Evidence:** `TeacherPaymentProfile` and `TeacherPayroll` are completely unlinked from the forms engine.

### Point 9: Does it Include Qualifications and Uploaded Documents List?
- **Finding:** **NO.**
- **Evidence:** In `form_renderer.py`, qualifications are hardcoded to `[{"degree": "Master of Science (M.Sc)"}]`. On the frontend profile page, the documents list is a static array of 4 strings.

### Point 10: Does a Dedicated Printable Employee Dossier Template Exist?
- **Finding:** **NO.**
- **Evidence:** `FORM_CATALOGUE` in `backend/app/services/form_catalog.py` contains 31 forms. It includes `staff_profile` (code: `PA-STF-PRF`), but this is a 1-page KYC verification sheet, not a comprehensive multi-section Employee Dossier covering teaching assignments, attendance, leaves, payroll, and career lifecycle.

### Point 11: Is PDF Generation Implemented for Employee Dossier?
- **Finding:** **NO.**
- **Evidence:** The backend has no PDF binary generator (e.g., WeasyPrint / ReportLab) for employee dossiers; existing document printing relies entirely on browser CSS `@media print` via `window.print()` inside `FormsDocuments.tsx`.

### Point 12: Does Browser Print CSS Exist for Employee Dossier?
- **Finding:** **NO.**
- **Evidence:** While `PrintDocumentBranding.tsx` and `FormTemplateEngine.tsx` contain general print CSS rules, no styling or pagination rules exist specifically for an Employee Dossier layout.

### Point 13: What Happens When an Employee Has Missing Optional Fields?
- **Finding:** **Synthetic / Hardcoded Mock Data is Injected.**
- **Evidence:** If `phone` is missing, `StaffProfilePage.tsx` injects `'+91 98673 21904'`. If `joining_date` is missing, `TeacherProfilePage.tsx` injects `'15 Jun 2020'` and `StaffProfilePage.tsx` injects `'01 Aug 2019'`.

### Point 14: Does the Print Output Prevent Data Leakage Between Employees?
- **Finding:** **CURRENTLY INHERENT RISK DUE TO STATIC FALLBACKS.**
- **Evidence:** Because `_extract_staff_data` in `form_renderer.py` hardcodes qualification and phone fallbacks, any attempt to render the existing staff form displays the identical mock values for all employees.

---

## 3. ARCHITECTURAL BLUEPRINT & REMEDIATION ROADMAP

To transform "Print Employee Dossier" from a dead placeholder into an enterprise-grade, CBSE & DPDP Act 2023 compliant capability, the following single-source-of-truth architecture is required:

```
[ Teacher / Staff Profile Page ]
            │
            ▼ (Clicks "Print Employee Dossier")
[ DossierPrintModal.tsx (or FormTemplateEngine) ]
            │
            ▼ (Calls POST /api/v1/forms/render)
[ backend/app/services/form_renderer.py ]
   ├── Join: User + StaffProfile (Personal & Employment)
   ├── Query: TeacherAssignment (Batches & Subjects - Teachers)
   ├── Query: TimetableEntry (Weekly Teaching Schedule)
   ├── Query: Attendance (Current Month & Academic Year Summary)
   ├── Query: StaffLeave (Leave Balances & Approved Leaves)
   ├── Query: TeacherPaymentProfile / Basic Salary (Remuneration Structure)
   ├── Query: StaffEmploymentHistory (Lifecycle Audit Trail)
   └── Apply: DPDP Act 2023 Aadhaar / Phone Masking
            │
            ▼ (Returns Rendered JSON Payload)
[ FormTemplateEngine.tsx / window.print() ]
   └── High-fidelity A4 Multi-page Institutional Dossier with Barcode & Seal
```

---
*Report Certified by Product Architect Jawahar R Mallah — AITDL AI Technology & Development Lab.*

