---
title: "Placeholder and Mock Data Register — Forensic Audit of Synthetic Data and Fallbacks"
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
tags: ["mock-data", "placeholders", "synthetic-data", "fallbacks", "data-integrity"]
entities: ["StaffProfile", "User", "TeachingSession", "TeacherPayroll", "AcademicYear"]
api_routes: ["/api/v1/staff/teachers/dashboard", "/api/v1/staff/non-teaching/dashboard", "/api/v1/forms/render"]
related_modules: ["05_TEACHER_MANAGEMENT", "06_TEACHER_PAYROLL", "14_PRINTING_DOCUMENTS", "17_UI_UX_DESIGN"]
---

# PRATHAMONE EduOS — PLACEHOLDER & MOCK DATA REGISTER

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Baseline Version:** 1.0.0  
**Audit Scope:** Synthetic Datasets, Hardcoded Constants, Fallbacks, and Placeholders  
**Lead Auditor:** Jawahar R Mallah, Product Architect  
**Organization:** AITDL — AI Technology & Development Lab  
**Audit Date:** 2026-11-07  

---

## 1. PURPOSE & SSOT ANTI-DUPLICATION COMPLIANCE

Per **Rule 001** (Single Source of Truth) and **Rule 006** (One Business Logic Implementation), application components must never display fabricated, hardcoded, or synthetic business data in place of authoritative database records. 

When database records are absent (e.g. fresh installation or zero logged sessions), the system MUST render explicit empty states (`EMPTY_DUE_TO_NO_RECORDS`) rather than substituting mock numbers.

---

## 2. COMPREHENSIVE MOCK DATA & PLACEHOLDER REGISTER

The following register details every identified placeholder, hardcoded fallback, and synthetic data injection found across the frontend and backend codebase:

| Item ID | Component / File Location | Variable / Element | Classification | Severity | Synthetic Value / Description | Correct Architecture & Remediation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MK-001** | `frontend/src/components/CascadingFilters.tsx:46` | `DEFAULT_ACADEMIC_YEARS` | `HARDCODED_DATA` | Medium | `[{ id: 1, name: '2026-27', start_date: '2026-04-01', ... }]` used when academic years query is pending. | Use skeleton loader or empty array until `academicYearsApi.list()` completes. |
| **MK-002** | `frontend/src/components/Layout.tsx:34` | `DEFAULT_ACADEMIC_YEARS` | `HARDCODED_DATA` | Medium | Duplicate hardcoded academic year array in layout header. | Read canonical active academic year from global context/query cache. |
| **MK-003** | `frontend/src/pages/TeacherManagement.tsx:519-528` | `MonthlyTeachingHoursChart` | `MOCK_DATA` | High | Falls back to `totalHours = 3420` and 6-month array `[{month: 'Apr', hours: 480}, ... {month: 'Sep', hours: 550}]`. | When hours are 0, pass `0` and empty array. Render "No sessions logged in last 6 months" state. |
| **MK-004** | `backend/app/services/workforce_service.py:291-297` | `get_teacher_workforce_dashboard` | `MOCK_DATA` | High | Injects `sample_hours = [480.0, 540.0, 620.0, 590.0, 640.0, 550.0]` and `total_trend_hours = 3420.0` when DB sum is 0! | Return actual 0.0 values. Backend must never fabricate hours. |
| **MK-005** | `frontend/src/pages/StaffManagement.tsx:375-381` | `WorkforceDonutChart` segments | `HARDCODED_DATA` | High | Hardcoded department breakdown: Administration: 10, Accounts: 4, IT: 3, Library: 3, Others: 8. | Map directly from backend `dashboardData.department_headcounts`. |
| **MK-006** | `frontend/src/pages/StaffManagement.tsx:389, 402` | Salary & Pending Payments | `HARDCODED_DATA` | High | Defaults to `₹7,84,500` and `₹1,26,000` via `|| 784500` and `|| 126000`. | Format `metrics.salary_payable ?? 0` and `metrics.pending_payments ?? 0`. Zero is a valid amount. |
| **MK-007** | `backend/app/services/workforce_service.py:430-432` | `get_staff_workforce_dashboard` | `MOCK_DATA` | High | Injects synthetic salary calculation: `salary_payable = float(active_staff * 32687.50)` and pending payments `salary_payable * 0.1606`. | Return actual sum of `StaffProfile.basic_salary`. If zero, return 0.0. |
| **MK-008** | `frontend/src/pages/TeacherProfilePage.tsx:208` | `joining_date` fallback | `HARDCODED_DATA` | Low | Hardcoded string `'15 Jun 2020'` if `profile.joining_date` is null. | Display `'Not Specified'` or `'-'`. Never invent historical dates. |
| **MK-009** | `frontend/src/pages/StaffProfilePage.tsx:160` | `phone` fallback | `HARDCODED_DATA` | Low | Hardcoded string `'+91 98673 21904'` if `profile.phone` is null. | Display `'Not Provided'` or leave empty. |
| **MK-010** | `frontend/src/pages/StaffProfilePage.tsx:164` | `designation` prop | `HARDCODED_DATA` | Medium | Fixed string `'Office Administrator'` passed to hero card stats. | Pass `profile.designation || user.designation || 'Staff Member'`. |
| **MK-011** | `frontend/src/pages/StaffProfilePage.tsx:173` | `joining_date` fallback | `HARDCODED_DATA` | Low | Hardcoded string `'01 Aug 2019'` if `profile.joining_date` is null. | Display `'Not Specified'`. |
| **MK-012** | `frontend/src/pages/TeacherProfilePage.tsx:682` | Documents Tab List | `PLACEHOLDER_UI` | High | Static string array `['Teacher Appointment Letter', 'Faculty Service Contract', ...]` with dead "View" buttons. | Query real uploaded files from `staff_documents` / `document_vault`. |
| **MK-013** | `frontend/src/pages/StaffProfilePage.tsx:562` | Documents Tab List | `PLACEHOLDER_UI` | High | Static string array `['Staff Appointment Letter', 'Permanent Service Agreement', ...]` with dead "View" buttons. | Query real uploaded files from `staff_documents` / `document_vault`. |
| **MK-014** | `backend/app/services/form_renderer.py:350-400` | `_extract_staff_data` | `MOCK_DATA` | High | Hardcodes qualifications `[{'degree': 'Master of Science (M.Sc)'}]`, phone `+91-9870011223`, joining date `01-06-2023`. | Join `StaffProfile`, read real `qualification`, `phone`, and `joining_date`. |

---

## 3. AUDIT VERDICT & GOVERNANCE IMPACT

The presence of mock data in `workforce_service.py` and `StaffManagement.tsx` originated from mirroring numbers directly from early Figma/UI concept mockups. 

**Directive:** In accordance with the user's explicit instruction, all mock data replacements are strictly scheduled for the Remediation Roadmap and will NOT be modified during this audit phase.

---
*Report Certified by Product Architect Jawahar R Mallah — AITDL AI Technology & Development Lab.*

