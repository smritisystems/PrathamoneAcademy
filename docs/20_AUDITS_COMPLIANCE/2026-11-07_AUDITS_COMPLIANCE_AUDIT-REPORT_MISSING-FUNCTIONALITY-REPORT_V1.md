---
title: "Missing Functionality Report — Comprehensive Gap Analysis and Incomplete Features"
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
tags: ["missing-functionality", "gap-analysis", "incomplete-features", "audit", "compliance"]
entities: ["StaffProfile", "User", "StaffDocument", "TeacherAssignment", "StaffLeave"]
api_routes: ["/api/v1/..."]
related_modules: ["05_TEACHER_MANAGEMENT", "06_TEACHER_PAYROLL", "14_PRINTING_DOCUMENTS", "16_DATABASE_API"]
---

# PRATHAMONE EduOS — MISSING FUNCTIONALITY REPORT

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Baseline Version:** 1.0.0  
**Audit Scope:** Full Application Functional Gaps & Incomplete Subsystems  
**Lead Auditor:** Jawahar R Mallah, Product Architect  
**Organization:** AITDL — AI Technology & Development Lab  
**Audit Date:** 2026-11-07  

---

## 1. PURPOSE & AUDIT FRAMEWORK

This report establishes an uncompromising record of features that are partially implemented, visually promised through UI affordances, or completely absent across **PrathamOne EduOS**.

In accordance with architectural directive: *"Do not claim a feature works merely because its page, button, API endpoint or database table exists."*

---

## 2. INCOMPLETE & MISSING FUNCTIONALITY REGISTER

### 2.1 Gap 1: Integrated Employee Dossier Print Engine
- **Current Status:** 0% Functional (Dead Dropdown Button).
- **Missing Components:**
  1. *Frontend Handler:* `TeacherProfilePage.tsx` and `StaffProfilePage.tsx` do not handle `key === 'print'`.
  2. *Print Template:* `FORM_CATALOGUE` has no multi-section, consolidated `employee_dossier` template.
  3. *Backend Extractor:* `_extract_staff_data` queries only `users` and fails to aggregate `TeacherAssignment`, `TimetableEntry`, `Attendance`, `StaffLeave`, `TeacherPayroll`, or `StaffEmploymentHistory`.
  4. *Print Layout / Stylesheet:* No `@media print` A4 stylesheet with institutional letterhead, page breaks, and verification seals for dossiers.

### 2.2 Gap 2: In-Profile Batch & Subject Allocation
- **Current Status:** 50% Implemented (Works in Dashboard, Broken in Profile).
- **Missing Components:**
  - `TeacherManagement.tsx` has a working allocation modal (`AssignTeacherModal`). However, when visiting `/teachers/:id` and selecting *"Assign Batch & Subject"* from the Actions menu, `TeacherProfilePage.tsx` ignores the event. The modal must be imported and connected so administrators can allocate batches directly while viewing a teacher's profile.

### 2.3 Gap 3: Hero Card In-Place Profile Editing
- **Current Status:** 50% Implemented (Card supports `onEdit`, Pages omit callback).
- **Missing Components:**
  - `WorkforceHeroCard.tsx` has `{onEdit && (<button>Edit</button>)}`. Neither `TeacherProfilePage.tsx` nor `StaffProfilePage.tsx` passes `onEdit`. Administrators cannot click "Edit" in the hero header to quickly modify contact numbers, addresses, or designations.

### 2.4 Gap 4: Staff Document Vault & Upload Engine
- **Current Status:** Visual Placeholder.
- **Missing Components:**
  - In both profile pages, the "Documents" tab displays 4 static strings with dead "View" buttons.
  - The database lacks a canonical `staff_documents` table (only `student_documents` exists).
  - No file upload API (`POST /api/v1/staff/{id}/documents`) or file viewing/streaming endpoint exists for employee documents (e.g., appointment letters, degrees, ID proofs).

### 2.5 Gap 5: Non-Teaching Staff Work Duty & Shift Management
- **Current Status:** Missing Domain Model.
- **Missing Components:**
  - While teachers have `TeacherAssignment` and `TimetableEntry`, non-teaching staff (lab assistants, librarians, accountants, receptionists) have no shift or operational duty scheduling model.
  - The "Responsibilities" tab in `StaffProfilePage.tsx` displays bullet points from a static list rather than persisted operational roles.

### 2.6 Gap 6: Decorative Notification & Help Buttons
- **Current Status:** Non-functional Icons.
- **Missing Components:**
  - Topbar notification bells in `Fees.tsx:1441` and `Settings.tsx:501` are rendered as interactive buttons with no event bindings or notification drawer popover.
  - Help icon button in `Settings.tsx:508` has no link to documentation or user manuals.

---

## 3. SEVERITY & BUSINESS RISK RATING

| Gap ID | Feature Area | Severity | Business Impact | Remediation Effort |
| :--- | :--- | :---: | :--- | :---: |
| **GAP-01** | Employee Dossier Print Engine | **CRITICAL** | Institutes cannot generate official printed KYC files or staff records for CBSE affiliation audits. | 2 Days |
| **GAP-02** | In-Profile Batch Allocation | **HIGH** | Administrators are forced to leave teacher profile and hunt for the teacher in the main workspace grid. | 2 Hours |
| **GAP-03** | Hero Card Profile Edit | **HIGH** | Blocks direct in-place editing of teacher/staff details from profile view. | 3 Hours |
| **GAP-04** | Staff Document Vault | **HIGH** | Paperless HR compliance is blocked; cannot store verified credentials. | 1.5 Days |
| **GAP-05** | Staff Duty Rostering | **MEDIUM** | Non-teaching personnel lack formal shift tracking. | 2 Days |
| **GAP-06** | Topbar Notification Popovers | **LOW** | Minor UX irritation; users expect click feedback on notification bells. | 4 Hours |

---
*Report Certified by Product Architect Jawahar R Mallah — AITDL AI Technology & Development Lab.*

