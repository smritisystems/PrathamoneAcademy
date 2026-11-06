---
title: "Existing Functionality Audit & Reuse Gap Analysis — Workforce Management & Operations"
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
tags: ["workforce", "audit", "reuse", "ssot", "dossier", "banking", "contacts", "delete_protection"]
entities: ["StaffProfile", "User", "StaffBankAccount", "StaffKeyContact", "TeacherAssignment", "TeacherPayroll"]
api_routes: ["/api/v1/staff/{user_id}", "/api/v1/users/{user_id}", "/api/v1/staff/{user_id}/bank-accounts", "/api/v1/staff/{user_id}/key-contacts"]
related_modules: ["05_TEACHER_MANAGEMENT", "06_TEACHER_PAYROLL", "12_RBAC_SECURITY", "14_PRINTING_DOCUMENTS"]
---

# Existing Functionality Audit & Reuse Gap Analysis — Workforce Management & Operations

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Directive Status:** MANDATORY COMPLIANCE — REUSE FIRST, REFACTOR SECOND, CREATE ONLY IF MISSING  

---

## 1. Executive Summary

In strict accordance with the mandatory Single Source of Truth (SSOT) and Anti-Duplication Directives (Rules 001–009), this forensic audit evaluates the 7 core capabilities requested for PrathamOne EduOS Workforce Management:
1. **Employee Dossier** (Comprehensive single-person profile & print for teachers and staff).
2. **Multiple Bank Accounts** (Primary salary, savings, reimbursement accounts).
3. **Multiple Addresses** (Current / residential, permanent / hometown, campus / office).
4. **Key Contacts** (Primary emergency contact, spouse / family, references).
5. **Print / Export** (Universal Print Studio, PDF export, Excel grid export).
6. **Global Edit Mode** (In-place profile editing with change tracking).
7. **Delete Protection** (Strict referential protection preventing hard-deletes of records with financial, academic, session, or audit dependencies).

---

## 2. Forensic Codebase & Schema Discovery Matrix

| # | Capability Area | Existing Codebase State | Reuse & Refactor Decision | Genuinely Missing (Action) |
|---|----------------|-------------------------|---------------------------|----------------------------|
| 1 | **Employee Dossier** | Models (`StaffProfile`, `User`, `TeacherAssignment`, `TimetableEntry`, `Attendance`, `StaffLeave`, `TeacherPayroll`), `UniversalPrintModal`, and `FormTemplateEngine` exist. | **REUSE & EXTEND**: Profile pages (`TeacherProfilePage.tsx`, `StaffProfilePage.tsx`) had un-wired `onAction('print')`. | Wire `onAction('print')` to open `UniversalPrintModal` with comprehensive dossier layout and aggregated data. |
| 2 | **Multiple Bank Accounts** | `staff_profiles` has 3 primary bank columns (`bank_name`, `bank_account_number`, `bank_ifsc`). | **REUSE & EXTEND**: Keep primary fields on `staff_profiles` as SSOT for legacy payroll engines. | Add `staff_bank_accounts` table for multiple accounts with `is_primary` sync. |
| 3 | **Multiple Addresses** | `staff_profiles` ALREADY HAS `current_address`, `permanent_address`, `city`, `state`, `pincode`. | **100% REUSE — NO NEW TABLE**: Schema is complete. Frontend was hiding `permanent_address`. | Extend profile UI & edit modal to render and edit both Current and Permanent addresses. |
| 4 | **Key Contacts** | `staff_profiles` has single emergency contact (`emergency_contact_name`, `phone`, `relation`). | **REUSE & EXTEND**: Keep primary emergency contact on `staff_profiles` as SSOT. | Add `staff_key_contacts` table for multiple contacts with primary sync. |
| 5 | **Print / Export** | `UniversalPrintModal`, `printLayoutEngine`, `ExcelReportGrid`, `printPresets` exist. | **100% REUSE**: The engine is fully implemented. | Wire UI buttons directly to `useUniversalPrint`. |
| 6 | **Global Edit Mode** | `PUT /api/v1/staff/{user_id}` and `staffApi.update` already exist with full field support. | **REFACTOR UI**: `WorkforceHeroCard` supported `onEdit`, but pages never passed the callback. | Pass `onEdit` handler, launch `StaffProfileEditModal`, and trigger profile reload. |
| 7 | **Delete Protection** | `DELETE /api/v1/users/{user_id}` exists with soft-delete (`is_active = False`). | **REFACTOR BACKEND**: Permanent deletion lacked dependency checks, risking DB crashes. | Enforce dependency validation: block deletion if payroll, sessions, or assignments exist. |

---

## 3. Detailed Gap Analysis & Architectural Decisions

### 3.1 Multiple Addresses (SSOT Rule 001/002 Compliance)
- **Finding:** A previous preliminary concept proposed creating a generic `addresses` table. 
- **Audit Result:** Forensic inspection of `backend/app/models/staff.py` proved that `StaffProfile` already defines both `current_address` and `permanent_address` along with `city`, `state`, and `pincode`.
- **SSOT Directive Enforcement:** Creating a separate `addresses` table would violate Rule 001 and Rule 002 by creating duplicate address masters. The backend update endpoint (`PUT /api/v1/staff/{user_id}`) already accepts both fields.
- **Remediation:** Pure frontend enhancement. Modify `TeacherProfilePage.tsx`, `StaffProfilePage.tsx`, and profile editing modals to display and capture both residential and permanent addresses without touching the database schema.

### 3.2 Multiple Bank Accounts (Alembic Migration 023)
- **Finding:** Currently, `StaffProfile` stores only one bank account (`bank_name`, `bank_account_number`, `bank_ifsc`).
- **Deficiency:** Employees often have a primary salary account, a secondary reimbursement account, or a personal savings account.
- **Architectural Solution:**
  1. Create `staff_bank_accounts` (`id`, `staff_profile_id`, `account_holder_name`, `bank_name`, `account_number`, `ifsc_code`, `branch_name`, `account_type`, `is_primary`, `is_verified`, `created_at`, `updated_at`).
  2. Implement an automatic SSOT synchronization hook: when an account is marked `is_primary = True`, the backend automatically synchronizes its details to `StaffProfile.bank_name`, `bank_account_number`, and `bank_ifsc`. All existing payroll calculation queries continue running without alteration.

### 3.3 Key Contacts (Alembic Migration 023)
- **Finding:** Currently, `StaffProfile` holds only one emergency contact (`emergency_contact_name`, `emergency_contact_phone`, `emergency_contact_relation`).
- **Deficiency:** Critical workplace safety standards require capturing multiple key contacts (e.g., Primary Emergency, Spouse, Parent/Guardian, Professional Reference).
- **Architectural Solution:**
  1. Create `staff_key_contacts` (`id`, `staff_profile_id`, `contact_name`, `relationship`, `phone_primary`, `phone_secondary`, `email`, `address`, `is_primary_emergency`, `created_at`, `updated_at`).
  2. Implement SSOT synchronization: when `is_primary_emergency = True`, synchronizes directly with `StaffProfile.emergency_contact_*`.

### 3.4 Delete Protection Engine (`users.py`)
- **Finding:** `delete_user` in `backend/app/api/v1/endpoints/users.py` allowed `permanent=True` with no validation of linked payrolls, teaching sessions, assignments, attendance, or financial transactions.
- **Risk:** Permanent deletion would result in PostgreSQL foreign key integrity errors (`500 Internal Server Error`) or permanent loss of historical audit and accounting records.
- **Remediation:** Refactor `delete_user`:
  - Query dependent entities (`TeacherPayroll`, `TeachingSession`, `TeacherAssignment`, `StaffAttendance`, `StaffLeave`, `Payment`).
  - If any dependent records exist, abort with HTTP 400 Bad Request:
    > "Cannot permanently delete user: Active financial, academic, or payroll dependencies exist. To preserve audit integrity and historical financial records, please deactivate this user or use the Employment Lifecycle transition instead."
  - For soft-deactivation (`permanent=False`), update `user.is_active = False` and synchronize `StaffProfile.status = 'inactive'`.

### 3.5 Global Edit Mode & Employee Dossier Print
- **Finding:** `WorkforceHeroCard.tsx` already contains complete UI buttons for `Edit` and `Print Employee Dossier`.
- **Deficiency:** `TeacherProfilePage.tsx` and `StaffProfilePage.tsx` omitted the `onEdit` prop and ignored `onAction('print')`.
- **Remediation:**
  - Build `StaffProfileEditModal.tsx` connecting to `PUT /api/v1/staff/{user_id}` (`staffApi.update`).
  - Wire `onEdit` in both profile pages to open the modal.
  - Wire `onAction('print')` to invoke `UniversalPrintModal` with `documentType="employee_dossier"`.

---

## 4. Verification and Validation Plan

1. **Database Migration:** Generate and apply Alembic migration `023_workforce_extensions.py`.
2. **Backend API Endpoints:** Add routes in `backend/app/api/v1/endpoints/staff.py` for bank accounts and key contacts, and refactor `users.py` for Delete Protection.
3. **Frontend Integration:** Integrate `StaffProfileEditModal`, update `TeacherProfilePage` and `StaffProfilePage`, and wire the Universal Print Studio.
4. **Automated Testing:** Run Python pytest suites and frontend Vitest suites to achieve 100% test passing.
5. **Quality & Attribution:** Validate corporate headers and reindex repository documentation.
