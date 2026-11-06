---
title: "Disconnected API and Database Register — End-to-End Linkage Defect Catalog"
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
tags: ["api-audit", "database-linkage", "disconnected-endpoints", "data-binding", "ssot"]
entities: ["User", "StaffProfile", "TeacherAssignment", "StaffDocument", "StaffEmploymentHistory"]
api_routes: ["/api/v1/staff/{user_id}/lifecycle", "/api/v1/staff/assignments/create", "/api/v1/forms/render", "/api/v1/staff/non-teaching/dashboard"]
related_modules: ["05_TEACHER_MANAGEMENT", "06_TEACHER_PAYROLL", "14_PRINTING_DOCUMENTS", "16_DATABASE_API"]
---

# PRATHAMONE EduOS — DISCONNECTED API & DATABASE REGISTER

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Baseline Version:** 1.0.0  
**Audit Scope:** Full Application Frontend-Backend Interconnections  
**Lead Auditor:** Jawahar R Mallah, Product Architect  
**Organization:** AITDL — AI Technology & Development Lab  
**Audit Date:** 2026-11-07  

---

## 1. ARCHITECTURAL OVERVIEW

A robust multi-tenant enterprise system requires a contiguous pipeline:
$$\text{User Interaction (UI)} \xrightarrow{\quad\text{Event}\quad} \text{API Client} \xrightarrow{\quad\text{REST Request}\quad} \text{FastAPI Route} \xrightarrow{\quad\text{Service}\quad} \text{SQLAlchemy ORM} \xrightarrow{\quad\text{SQL}\quad} \text{PostgreSQL Master}$$

When any link in this chain is broken, the UI element becomes a dead placeholder. This document catalogs every identified disconnection between UI elements, API routes, and database tables.

---

## 2. DISCONNECTED API & DATABASE DEFECT REGISTER

| Defect ID | Feature / UI Element | Frontend File | Target Action / Intent | Backend Route Status | Database Schema Status | Forensic Failure Root Cause |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DISC-001** | **Assign Batch & Subject** (Dropdown in Profile) | `frontend/src/pages/TeacherProfilePage.tsx:211` | Open assignment modal and assign teacher to board/standard/division/subject. | **ENDPOINT EXISTS**: `POST /api/v1/staff/assignments/create` is live and healthy. | **TABLE EXISTS**: `teacher_assignments` table is active. | **Frontend Disconnection:** `TeacherProfilePage.tsx` line 211 only handles `key === 'lifecycle'`. The `key === 'assign'` event is dropped silently. The page does not import or render `AssignTeacherModal`. |
| **DISC-002** | **Print Employee Dossier** (Dropdown in Teacher Profile) | `frontend/src/pages/TeacherProfilePage.tsx:211` | Print comprehensive single-person faculty dossier with assignments, attendance, qualifications, and payroll. | **NO DEDICATED ROUTE**: No `/api/v1/staff/{id}/dossier` endpoint exists. | **TABLES EXIST**: `users`, `staff_profiles`, `teacher_assignments`, `teacher_payment_profiles`. | **End-to-End Missing**: `TeacherProfilePage` does not handle `key === 'print'`. Backend has no aggregated dossier renderer. |
| **DISC-003** | **Print Employee Dossier** (Dropdown in Staff Profile) | `frontend/src/pages/StaffProfilePage.tsx:176` | Print comprehensive non-teaching employee dossier with department, duties, leave, and salary. | **NO DEDICATED ROUTE**: No `/api/v1/staff/{id}/dossier` endpoint exists. | **TABLES EXIST**: `users`, `staff_profiles`, `staff_leaves`, `staff_employment_histories`. | **End-to-End Missing**: `StaffProfilePage` does not handle `key === 'print'`. |
| **DISC-004** | **Edit Profile Button** (Hero Card) | `frontend/src/components/workforce/WorkforceHeroCard.tsx:202` | Open modal to edit teacher or staff profile personal/employment fields. | **ENDPOINT EXISTS**: `PUT /api/v1/users/{id}` & `PUT /api/v1/staff/profiles/{id}` exist. | **TABLES EXIST**: `users`, `staff_profiles`. | **Frontend Prop Missing**: Neither `TeacherProfilePage` nor `StaffProfilePage` passes the `onEdit` callback prop to `WorkforceHeroCard`. The Edit button is completely suppressed from DOM rendering. |
| **DISC-005** | **View HR Document** (Documents Tab in Profiles) | `frontend/src/pages/TeacherProfilePage.tsx:692` & `StaffProfilePage.tsx:572` | View/Download verified employment contract, degree certificates, KYC scans. | **NO DOCUMENT ENDPOINT**: Document storage router for staff files is absent. | **NO DEDICATED TABLE**: No `staff_documents` table exists (only `student_documents` exists). | **Full-Stack Disconnection**: The button lacks an `onClick` handler. The document names are hardcoded strings. |
| **DISC-006** | **Staff by Department Chart Data Binding** | `frontend/src/pages/StaffManagement.tsx:371-381` | Render live department headcount distribution on Staff Workspace dashboard. | **ENDPOINT RETURNS DATA**: `GET /api/v1/staff/non-teaching/dashboard` returns `department_headcounts`. | **TABLES EXIST**: Computed dynamically from `users` and `staff_profiles`. | **Frontend Data-Binding Omission**: The component ignores `data.department_headcounts` and renders a hardcoded 5-segment mock array. |
| **DISC-007** | **Staff Form Extractor Profile Join** | `backend/app/services/form_renderer.py:350` | Provide authoritative employee details when rendering printable staff forms. | **ENDPOINT EXISTS**: `POST /api/v1/forms/render` | **TABLE NOT QUERIED**: Queries only `users`; fails to query or join `staff_profiles`. | **Backend Join Missing**: Because `staff_profiles` is not joined, fields like `qualification`, `joining_date`, `basic_salary`, and `department` are hardcoded or defaulted to static strings. |

---

## 3. IMPACT ANALYSIS & REPAIR COMPLEXITY

1. **DISC-001 (Assign Batch):** Low complexity. Can be resolved by importing the existing `AssignTeacherModal` (already used in `TeacherManagement.tsx`) into `TeacherProfilePage.tsx` and handling `key === 'assign'`.
2. **DISC-002 & DISC-003 (Print Employee Dossier):** Medium complexity. Requires creating a dedicated multi-section Dossier template in `form_catalog.py` and connecting `onAction('print')` to open a dossier print preview modal or invoke the document printing engine.
3. **DISC-004 (Edit Profile Button):** Low complexity. Provide `onEdit={() => setShowEditModal(true)}` and wire up the existing profile edit dialog.
4. **DISC-006 (Staff Department Chart):** Very low complexity. Replace hardcoded segments array with `dashboardData?.department_headcounts?.map(...)`.
5. **DISC-007 (Staff Form Extractor):** Low complexity. Update `_extract_staff_data` to execute `select(User, StaffProfile).outerjoin(...)` and populate real attributes.

---
*Report Certified by Product Architect Jawahar R Mallah — AITDL AI Technology & Development Lab.*

