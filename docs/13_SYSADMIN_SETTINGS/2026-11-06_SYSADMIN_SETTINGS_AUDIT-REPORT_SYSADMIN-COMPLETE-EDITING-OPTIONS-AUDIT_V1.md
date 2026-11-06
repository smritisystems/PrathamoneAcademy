---
title: "PrathamOne Academy — Complete Sysadmin Editing Options & RBAC Audit"
module: "13_SYSADMIN_SETTINGS"
category: "AUDIT-REPORT"
document_type: "AUDIT-REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-06"
updated_date: "2026-11-06"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["13-sysadmin-settings", "audit-report"]
entities: ["InstituteSetting", "SystemSetting"]
api_routes: ["/api/v1/sysadmin", "/api/v1/institute-settings"]
related_modules: []
---

# PrathamOne Academy — Complete Sysadmin Editing Options & RBAC Audit

**Date:** November 6, 2026  
**Auditor:** Senior System Architect, RBAC Security Auditor & QA Engineer  
**System:** PrathamOne Academy • Prashant Academy Coaching Institute Management System  
**Version:** v6.99.1 (Build: 2026.11.05-PROD-REL)  
**Mode:** READ-ONLY COMPREHENSIVE AUDIT (No modifications performed)

---

## 1. Executive Summary & Application Inventory

An exhaustive inspection of the frontend client (`frontend/src/`) and backend API (`backend/app/`) was conducted to identify every administrative capability, editing control, workflow action, and permission boundary available to the **System Administrator (`sysadmin`)** role.

### Discovered Architecture
- **Total Registered Backend API Endpoints:** 206 routes across 26 route controllers.
- **Total Frontend Navigation & Page Workspaces:** 22 top-level and secondary workspaces, with 15 settings sub-categories and 8 academic sub-tabs.
- **Database Role ID for Sysadmin:** `18` (Role name: `sysadmin`).
- **Authorization Engine:** Dual-layer RBAC supporting:
  1. Universal superuser bypass in `require_role(...)` for general administrative operations.
  2. Strict non-wildcard permission check (`allow_wildcard=False`) in `has_permission(...)` and `require_permission(...)` for high-risk financial modifications (specifically `payments:edit_posted`).
  3. Direct user permission overrides via foreign-keyed `permissions.user_id`.

### Discovered Module Inventory vs. User Request
| User Requested Module | Implementation Status | Discovered Route Prefix / Frontend Screen |
| :--- | :--- | :--- |
| **Dashboard** | **Implemented** | `/api/v1/dashboard/*` & `/dashboard` |
| **Institute & Branch Management** | **Implemented** | `/api/v1/institutions/*`, `/api/v1/settings/profile` |
| **Academic Structure & Batches** | **Implemented** | `/api/v1/boards/*`, `/api/v1/standards/*`, `/api/v1/divisions/*`, `/api/v1/subjects/*`, `/api/v1/enrollments/*` & `/academic` |
| **Students & Admissions** | **Implemented** | `/api/v1/students/*` & `/students`, `/students/add`, `/students/:id` |
| **Teachers & Staff** | **Implemented** | `/api/v1/staff/*` & `/staff` |
| **Attendance** | **Implemented** | `/api/v1/attendance/*` & `/attendance` |
| **Fees & Payments** | **Implemented** | `/api/v1/fees/*`, `/api/v1/payments/*` & `/fees`, `/payments`, `/receipts/*` |
| **Fee Plans (Structures)** | **Implemented** | `/api/v1/fees/structures`, `/api/v1/fees/assignments` & `/fees?tab=structures` |
| **Examinations & Results** | **Implemented** | `/api/v1/examinations/*` & `/examinations` |
| **Timetable** | **Implemented** | `/api/v1/timetable/*` & `/academic?tab=timetable` |
| **Homework & Assignments** | **Not Implemented** | *No student homework module exists.* (`staff.py` only manages teacher-to-batch subject teaching assignments). |
| **Communication & Notifications**| **Implemented** | `/api/v1/communication/*` & `/communication` |
| **Reports & Analytics** | **Implemented** | `/api/v1/reports/*` & `/reports` |
| **User & Role Management** | **Implemented** | `/api/v1/users/*` & `/users`, `/users/:id` |
| **System Settings** | **Implemented** | `/api/v1/settings/*`, `/api/v1/sysadmin/system-settings` & `/settings` |
| **Branding & Customization** | **Implemented** | `/api/v1/settings/profile`, `/api/v1/institutions/1` & `/settings?tab=branding` |
| **Integrations** | **Partial** | Credentials stored in settings (`/api/v1/settings/all`); no standalone integrations hub. |
| **Data Import & Export** | **Implemented** | `/api/v1/import-export/*`, `/api/v1/import/fee-register/*` & `/import-export`, `/fees/import` |
| **Backup & Restore** | **Partial / Internal** | Database snapshots occur internally in `/api/v1/releases/promote-rc`; no dedicated manual backup/restore UI/API. |
| **Audit Logs** | **Implemented** | `/api/v1/sysadmin/security-audit-logs`, `/api/v1/settings/audit-logs`, `/api/v1/payments/:id/audit-trail` & `/sysadmin` |
| **Releases & Change Management**| **Implemented** | `/api/v1/releases/*` & `/releases` |
| **SysAdmin Dedicated Center** | **Implemented** | `/api/v1/sysadmin/*` (Universal Edit, Security Audits, Status & Settings) & `/sysadmin` |

---

## 2. Complete Sysadmin Action Matrix Across All Modules

This matrix records every action across the system, indicating whether Sysadmin can perform it, the underlying restrictions, and verification status from the source code.

| Module | Feature / Submenu | Action | Sysadmin Allowed? | Restriction / Gate | API Verification & Evidence |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **SysAdmin Center** | Overview & Telemetry | View Global Metrics | **YES** | `require_sysadmin` | `GET /api/v1/sysadmin/overview` |
| **SysAdmin Center** | Universal Records Editor | Universal Field Edit | **YES** | `require_sysadmin` + Mandatory Audit Log. Blocked fields: `id`, `hashed_password`, `created_at`. Prevents deleting last active sysadmin. | `POST /api/v1/sysadmin/universal-edit` |
| **SysAdmin Center** | Protected Security Audit | View Immutable Audits | **YES** | `require_sysadmin`. Filter by severity, resource, actor, date. | `GET /api/v1/sysadmin/security-audit-logs` |
| **SysAdmin Center** | System Parameters | View / Edit Configs | **YES** | `require_sysadmin` + Critical Audit Log. | `GET/PUT /api/v1/sysadmin/system-settings` |
| **SysAdmin Center** | Posted Payment Gating | Check Lock Status | **YES** | `require_sysadmin`. Checks explicit `payments:edit_posted`. | `GET /api/v1/sysadmin/permissions/edit-posted-status` |
| **SysAdmin Center** | Posted Payment Gating | Unlock / Lock Editing | **YES** | `require_sysadmin` + Mandatory Justification Reason + Audit Log. | `POST /api/v1/sysadmin/permissions/toggle-edit-posted` |
| **Dashboard** | Overview Stats | View KPIs & Charts | **YES** | `require_role(...)` includes `sysadmin`. | `GET /api/v1/dashboard/stats` |
| **Dashboard** | Forensic Reconciliation | View Count Discrepancies | **YES** | `get_current_active_user`. | `GET /api/v1/dashboard/reconciliation` |
| **Institutions** | Institute Profile | View Multi-tenant Profiles | **YES** | `enforce_institution_access` bypasses tenant scoping for sysadmin. | `GET /api/v1/institutions/` |
| **Institutions** | Create Institution | Add New Institute | **YES** | `get_current_active_user`. | `POST /api/v1/institutions/` |
| **Institutions** | Edit Institution | Update Profile & Config | **YES** | `get_current_active_user`. | `PUT /api/v1/institutions/{id}` |
| **Academic Structure**| Educational Boards | List / View Boards | **YES** | `get_current_active_user`. | `GET /api/v1/boards/` |
| **Academic Structure**| Educational Boards | Create Board | **YES** | `get_current_active_user`. | `POST /api/v1/boards/` |
| **Academic Structure**| Educational Boards | Edit Board | **YES** | `get_current_active_user`. | `PUT /api/v1/boards/{id}` |
| **Academic Structure**| Educational Boards | Toggle Active / Inactive | **YES** | `get_current_active_user`. | `PUT /api/v1/boards/{id}/toggle-status` |
| **Academic Structure**| Standards / Classes | List / View Classes | **YES** | `get_current_active_user`. | `GET /api/v1/standards/` |
| **Academic Structure**| Standards / Classes | Create Standard | **YES** | `get_current_active_user`. | `POST /api/v1/standards/` |
| **Academic Structure**| Standards / Classes | Edit Standard | **YES** | `get_current_active_user`. | `PUT /api/v1/standards/{id}` |
| **Academic Structure**| Standards / Classes | Archive Standard | **YES** | `get_current_active_user`. | `PUT /api/v1/standards/{id}/archive` |
| **Academic Structure**| Subjects | List / View Subjects | **YES** | `get_current_active_user`. | `GET /api/v1/subjects/` |
| **Academic Structure**| Subjects | Create Subject | **YES** | `get_current_active_user`. | `POST /api/v1/subjects/` |
| **Academic Structure**| Subjects | Edit Subject | **YES** | `get_current_active_user`. | `PUT /api/v1/subjects/{id}` |
| **Academic Structure**| Subjects | Delete Subject | **YES** | `get_current_active_user`. Checks for existing enrollments/schedules before delete. | `DELETE /api/v1/subjects/{id}` |
| **Academic Structure**| Batches / Divisions | List / View Batches | **YES** | `get_current_active_user`. | `GET /api/v1/divisions/` |
| **Academic Structure**| Batches / Divisions | Create Batch | **YES** | `get_current_active_user`. | `POST /api/v1/divisions/` |
| **Academic Structure**| Batches / Divisions | Edit Batch | **YES** | `get_current_active_user`. | `PUT /api/v1/divisions/{id}` |
| **Academic Structure**| Batches / Divisions | Archive Batch | **YES** | `get_current_active_user`. | `PUT /api/v1/divisions/{id}/archive` |
| **Academic Structure**| Batches / Divisions | View Roster | **YES** | `get_current_active_user`. | `GET /api/v1/divisions/{id}/roster` |
| **Academic Structure**| Timetable | List Schedule & Rooms | **YES** | `get_current_active_user`. | `GET /api/v1/timetable/` & `/rooms` |
| **Academic Structure**| Timetable | Create / Edit Slot | **YES** | `get_current_active_user`. Automated conflict detection. | `POST/PUT /api/v1/timetable/` |
| **Academic Structure**| Timetable | Delete Slot | **YES** | `get_current_active_user`. | `DELETE /api/v1/timetable/{id}` |
| **Academic Structure**| Enrollments | Assign Student to Batch | **YES** | `get_current_active_user`. | `POST /api/v1/enrollments/` |
| **Academic Structure**| Enrollments | Transfer Batch | **YES** | `get_current_active_user`. | `POST /api/v1/enrollments/transfer` |
| **Academic Structure**| Enrollments | Unenroll Student | **YES** | `get_current_active_user`. | `DELETE /api/v1/enrollments/{id}` |
| **Students** | Directory | List / Search Students | **YES** | `get_current_active_user`. | `GET /api/v1/students/` |
| **Students** | Admissions | Create / Admit Student | **YES** | `require_role(...)` includes `sysadmin`. | `POST /api/v1/students/` |
| **Students** | Profile Detail | View Full Admin Profile | **YES** | `require_role(...)` includes `sysadmin`. | `GET /api/v1/students/{id}/profile` |
| **Students** | Profile Detail | Edit Student Profile | **API: YES / UI: BLOCKED** | **BUG IN UI**: `canEdit` in `StudentDetail.tsx` checks `['superadmin', 'admin', 'principal']` but omits `sysadmin`. Backend `PUT /api/v1/students/{id}/profile` explicitly permits sysadmin. | `PUT /api/v1/students/{id}/profile` |
| **Students** | Lifecycle Management | Withdraw / Exit Student | **API: YES / UI: BLOCKED** | **BUG IN UI**: `canEdit` in `StudentDetail.tsx` and `canManageLifecycle` in `Students.tsx` omit `sysadmin`. Backend `POST /api/v1/students/{id}/exit` explicitly permits sysadmin. | `POST /api/v1/students/{id}/exit` |
| **Students** | Lifecycle Management | Reactivate Student | **API: YES / UI: BLOCKED** | **BUG IN UI**: Same role array omission in frontend modals. Backend permits sysadmin. | `POST /api/v1/students/{id}/reactivate` |
| **Students** | Lifecycle History | View Audit Trail | **YES** | `get_current_active_user`. | `GET /api/v1/students/{id}/lifecycle-history` |
| **Students** | KYC Documents | Upload / Delete KYC Doc | **API: YES / UI: BLOCKED** | **BUG IN UI**: Gated by `canEdit` in `StudentDetail.tsx`. Backend permits sysadmin. | `POST/DELETE /api/v1/students/{id}/documents` |
| **Students** | Hard Deletion | Permanent Record Purge | **NO** | Hard deletion of students is intentionally NOT implemented in the backend to preserve ledger and audit integrity. Exit/Reactivate workflow used instead. | *No endpoint exists* |
| **Staff & HR** | Staff Directory | List Faculty & Staff | **YES** | `require_role(*STAFF_ADMIN_ROLES)` includes `sysadmin`. | `GET /api/v1/staff/` |
| **Staff & HR** | Onboarding | Create Staff Profile | **YES** | `require_role(*STAFF_ADMIN_ROLES)` includes `sysadmin`. | `POST /api/v1/staff/` |
| **Staff & HR** | Profile Update | Edit Staff Details | **YES** | `require_role(*STAFF_ADMIN_ROLES)` includes `sysadmin`. | `PUT /api/v1/staff/{id}` |
| **Staff & HR** | Faculty Allocation | Assign to Batch/Subject | **YES** | `require_role(*STAFF_ADMIN_ROLES)` includes `sysadmin`. | `POST /api/v1/staff/assignments/create` |
| **Staff & HR** | Faculty Allocation | Unassign Faculty | **YES** | `require_role(*STAFF_ADMIN_ROLES)` includes `sysadmin`. | `DELETE /api/v1/staff/assignments/{id}` |
| **Staff & HR** | Staff Attendance | Mark / View Attendance | **YES** | `require_role(*STAFF_ADMIN_ROLES)` includes `sysadmin`. | `POST /api/v1/staff/attendance/mark` |
| **Staff & HR** | Leave Management | Approve / Reject Leave | **YES** | `require_role(*STAFF_ADMIN_ROLES)` includes `sysadmin`. | `POST /api/v1/staff/leaves/{id}/action` |
| **Attendance** | Student Attendance | View Attendance Roster | **YES** | `get_current_active_user`. | `GET /api/v1/attendance/` |
| **Attendance** | Student Attendance | Save Bulk Attendance | **YES** | `get_current_active_user`. | `POST /api/v1/attendance/bulk` |
| **Examinations** | Test Management | List Exams & Marks | **YES** | `get_current_active_user`. | `GET /api/v1/examinations/` |
| **Examinations** | Test Management | Schedule / Create Exam | **YES** | `get_current_active_user`. | `POST /api/v1/examinations/` |
| **Examinations** | Test Results | Delete / Cancel Exam | **NO** | Delete examination endpoint is not implemented. | *No endpoint exists* |
| **Communication** | Center | Search Recipients | **YES** | `get_current_active_user`. Filter by ALL, STUDENTS, PARENTS, STAFF, BATCH. | `GET /api/v1/communication/recipients/search` |
| **Communication** | Center | Send SMS/Email/WhatsApp | **YES** | `require_role("admin", "principal", "sysadmin")`. | `POST /api/v1/communication/send` |
| **Communication** | Center | Create/Edit/Delete Template| **YES** | `require_role(...)` includes `sysadmin`. | `POST/PUT/DELETE /api/v1/communication/templates` |
| **Communication** | Center | View Dispatch Logs | **YES** | `require_role(...)` includes `sysadmin`. | `GET /api/v1/communication/logs` |
| **Communication** | Center | Retry Failed Message | **YES** | `require_role(...)` includes `sysadmin`. | `POST /api/v1/communication/logs/{id}/retry` |
| **Communication** | Center | Channel Diagnostics Test | **YES** | `require_role(...)` includes `sysadmin`. | `POST /api/v1/communication/diagnostics/test` |
| **Reports** | Analytics | View Collection / Outstanding| **YES** | `get_current_active_user`. | `GET /api/v1/reports/*` |
| **Reports** | Analytics | Export Excel / Print | **YES** | Global branding footer applied; available to all report viewers. | `GET /api/v1/reports/*/export` |
| **Forms & KYC** | Document Center | View Forms Catalogue | **YES** | `get_current_active_user`. | `GET /api/v1/forms/catalogue` |
| **Forms & KYC** | Document Center | Render / Print Forms | **YES** | Supports blank or pre-filled student KYC, admission, hall tickets. | `GET /api/v1/forms/render/{form_id}` |
| **Forms & KYC** | Document Center | Audit Logs | **YES** | View print history. | `GET /api/v1/forms/audit-logs` |
| **Import & Export** | Bulk Data | Download Blank Template | **YES** | `require_role(...)` includes `sysadmin`. | `GET /api/v1/import-export/template` |
| **Import & Export** | Bulk Data | Upload / Preview Grid | **YES** | In-browser Excel editable grid. | `POST /api/v1/import-export/preview-*` |
| **Import & Export** | Bulk Data | Execute Batch Import | **YES** | Atomic database transaction. | `POST /api/v1/import-export/execute` |
| **Import & Export** | Fee Register | Parse / Migrate Register | **YES** | `get_current_active_user`. Legacy fee ledger import. | `POST /api/v1/import/fee-register/*` |
| **Users & Roles** | Account Governance | List Accounts & Stats | **YES** | `require_role(*ADMIN_ROLES)` includes `sysadmin`. | `GET /api/v1/users/` & `/stats` |
| **Users & Roles** | Account Governance | Create User Account | **YES** | `require_role(*ADMIN_ROLES)` includes `sysadmin`. | `POST /api/v1/users/` |
| **Users & Roles** | Account Governance | Edit User / Assign Role | **YES** | `require_role(*ADMIN_ROLES)` includes `sysadmin`. | `PUT /api/v1/users/{id}` |
| **Users & Roles** | Account Governance | Reset Password | **YES** | `require_role(*ADMIN_ROLES)` includes `sysadmin`. | `POST /api/v1/users/{id}/reset-password` |
| **Users & Roles** | Account Governance | Toggle Active / Inactive | **YES** | Cannot deactivate sole active sysadmin. | `POST /api/v1/users/{id}/toggle-status` |
| **Users & Roles** | Account Governance | Resend Invitation | **YES** | `require_role(*ADMIN_ROLES)` includes `sysadmin`. | `POST /api/v1/users/{id}/resend-invitation` |
| **Users & Roles** | Account Governance | Delete User | **YES** | Safety checks: Cannot delete self. Cannot delete last active sysadmin. Soft-delete by default, permanent with flag. | `DELETE /api/v1/users/{id}` |
| **Settings** | Institute Profile | Update Profile & Contacts | **YES** | `require_role("admin", "principal")` includes `sysadmin`. | `PUT /api/v1/settings/profile` |
| **Settings** | Branding & Theme | Update Colors, Logos, Favicon| **YES** | Includes live preview & immediate persistence. | `PUT /api/v1/settings/profile` |
| **Settings** | Lookups | Add / Edit / Delete Lookups | **YES** | Custom dropdown codes. | `POST/PUT/DELETE /api/v1/settings/lookups` |
| **Settings** | Configuration | Reset Factory Defaults | **YES** | Reverts settings table to initial seeded defaults. | `POST /api/v1/settings/reset-defaults` |
| **Releases** | Lifecycle | Generate Draft Release | **YES** | `require_role("superadmin", "admin")` includes `sysadmin`. | `POST /api/v1/releases/generate-draft` |
| **Releases** | Lifecycle | Pre-flight Validation | **YES** | Automated checklist validation. | `POST /api/v1/releases/{id}/validate` |
| **Releases** | Lifecycle | Promote to RC | **YES** | Automatic pre-deployment snapshot generation. | `POST /api/v1/releases/{id}/promote-rc` |
| **Releases** | Lifecycle | Approve Release | **YES** | Multi-stakeholder signoff. | `POST /api/v1/releases/{id}/approve` |
| **Releases** | Lifecycle | Publish Release | **YES** | Deploys release to active production. | `POST /api/v1/releases/{id}/publish` |
| **Releases** | Lifecycle | Rollback Release | **YES** | Reverts active release to target previous stable version. | `POST /api/v1/releases/{id}/rollback` |

---

## 3. Special Deep Audit — Fees & Payments Module

The Fees and Payments module was audited across database models, sequence generators, receipt rendering engines, and permission checks.

### Detailed Sysadmin Capabilities Matrix: Fees & Payments

| Feature / Action | Sysadmin Allowed? | Permission Gate / Rule | Financial & Audit Impact |
| :--- | :---: | :--- | :--- |
| **View Fee Plans & Overview** | **YES** | `fees:view` (Role permission ID 35) | Read-only aggregation of fee structures, invoices, and totals. |
| **Create Fee Plan (Structure)** | **YES** | `fees:manage` (via universal `*:*`) | Inserts new fee structure with component breakdowns. |
| **Assign Fee Plan to Students** | **YES** | `fees:manage` (via universal `*:*`) | Generates batch or individual student fee allocations. |
| **Generate Student Invoice** | **YES** | `fees:manage` (via universal `*:*`) | Creates `FeeInvoice` with installments and balance tracking. |
| **Create Discounts / Scholarships**| **YES** | `fees:manage` (via universal `*:*`) | Creates rule-based discount/scholarship definitions. |
| **View Payments & Receipts** | **YES** | `payments:view` (Role permission ID 36) | Read-only access to transaction table and receipt previews. |
| **Create Draft Payment Voucher** | **YES** | `payments:draft` (Role permission ID 37) | Saves voucher with status `draft`. **Zero impact** on invoice balance or general ledger. |
| **Edit Draft Payment Voucher** | **YES** | `payments:draft` (Role permission ID 37) | Allows altering allocations, payment method, date, or amount while in draft state. |
| **Submit Draft Payment** | **YES** | `payments:edit_submitted` (Role permission ID 38) | Advances status to `submitted`. Ready for approval. |
| **Edit Submitted Payment** | **YES** | `payments:edit_submitted` + **Mandatory Reason** | Modifying submitted payment **requires non-empty `reason`** (HTTP 400 if omitted). Logged to audit trail. |
| **Approve Payment** | **YES** | `APPROVER_ROLES` (`sysadmin`, `admin`, `principal`) | Advances status to `approved`. |
| **Post / Finalize Payment** | **YES** | `APPROVER_ROLES` (`sysadmin`, `admin`, `principal`) | Allocates funds to invoice installments, reduces outstanding balances, generates official sequential receipt. |
| **Edit POSTED Payment** | **STRICTLY GATED** | **`payments:edit_posted` (With `allow_wildcard=False`) + Mandatory Reason** | **Wildcard `*:*` and generic Sysadmin role CANNOT bypass this check!**<br>• Default SysAdmin baseline: **LOCKED / DENIED (HTTP 403)**.<br>• When unlocked via SysAdmin Center or direct permission grant: **ALLOWED (HTTP 200)**.<br>• Minor edit (notes/ref): Retains existing receipt number, logs reason.<br>• Financial edit (amount/allocations): Marks previous receipt as `superseded` (`superseded_by_receipt_number`), issues next sequential receipt number, records before/after state diff. **Never silently renumbers receipts.** |
| **Receipt Reprinting** | **YES** | `get_current_active_user` | Preserves original receipt number; increments reprint counter, appends reprint audit metadata and timestamp. |
| **Reverse / Void Payment** | **YES** | `require_role(...)` includes `sysadmin` | Sets payment status to `reversed`. Restores original invoice installment balances. |
| **Process / Initiate Refund** | **YES** | `payments:refund_process` (Role permission ID 40) | Created as **separate linked transaction** in `refunds` table (`payment_id`). Enforces refundable balance limit (rejects if refund > paid - previous refunds). |
| **Approve Refund** | **YES** | `payments:refund_approve` (Role permission ID 41) | Advances refund status from `pending` to `approved`. |
| **Disburse / Finalize Refund** | **YES** | `payments:refund_process` (Role permission ID 40) | Advances status to `processed`. Updates invoice ledger balances accordingly. |
| **View Payment Audit History** | **YES** | `payments:view_audit` (Role permission ID 42) | Returns chronological audit log records with before/after state JSON, actor, IP, timestamp, and edit reason. |
| **Configure Fee Workflow Settings**| **YES** | `fee_workflow:configure` (Role permission ID 39) | Adjusts approval rules, edit window limits, and auto-receipt switches in `fee_workflow_configs` table. |

---

## 4. Discrepancies, Gaps & Identified Risks

### A. Critical UI Discrepancy: SysAdmin Blocked from Student Lifecycle Actions
1. **`StudentDetail.tsx` (Lines 60–65)**:
   ```tsx
   const canEdit =
     currentUser?.role === 'superadmin' ||
     currentUser?.role === 'admin' ||
     currentUser?.role === 'principal'
   ```
   *Impact:* Omits `sysadmin`. While the backend APIs (`PUT /api/v1/students/:id/profile`, `POST /api/v1/students/:id/exit`, `POST /api/v1/students/:id/reactivate`, `POST /api/v1/students/:id/documents`) explicitly permit SysAdmin, the UI hides the "Edit Profile", "Exit / Withdraw", "Reactivate Student", and "Manage Documents" buttons for any user with the `sysadmin` role.
2. **`Students.tsx` (Lines 60–61)**:
   ```tsx
   const canManageLifecycle =
     user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'staff'
   ```
   *Impact:* Omits `sysadmin`. Quick action buttons for Exit/Withdraw and Reactivate are hidden in the students table for SysAdmin.

### B. Missing Modules in Codebase
1. **Homework & Assignments Module**:
   *Finding:* Not implemented. The only assignment functionality currently in the system is teacher-to-batch faculty assignment (`staff.py`).
2. **Dedicated Database Backup & Restore UI**:
   *Finding:* No dedicated database backup download or restore mechanism exists in the admin UI. (Automated database snapshots are triggered internally only during release deployment promotions in `release_service.py`).
3. **Third-Party Integrations Hub**:
   *Finding:* Settings stores configuration keys (Razorpay, SMS gateways), but there is no dedicated interactive integrations dashboard or webhook management screen.

### C. Backend API Role Guard Inconsistencies
1. **Academic Structure Endpoints Lack Explicit Role Guard**:
   *Finding:* In `boards.py`, `standards.py`, `divisions.py`, `timetable.py`, and `enrollments.py`, write endpoints (`POST`, `PUT`, `DELETE`) rely solely on `Depends(get_current_active_user)`.
   *Risk:* While Sysadmin is authorized to use them, any low-privileged authenticated user (e.g., student or teacher) could theoretically submit write requests directly to these API endpoints if accessed outside the frontend UI. These should be guarded with `require_role(...)`.

### D. Universal Record Editor Safety Controls
1. **Universal Edit Endpoint (`/api/v1/sysadmin/universal-edit`)**:
   *Finding:* Provides SysAdmin direct field-level modification across `Student`, `StaffProfile`, `User`, `FeeStructure`, `Division`, `Standard`, and `Institution`.
   *Existing Safeguards:*
   - Blocked immutable fields: `id`, `hashed_password`, `created_at`.
   - Prevented deactivation of the last active System Administrator account.
   - Automatically writes an immutable audit record with before/after state diff.
   *Identified Risk:* If a financial or relational field (such as `institution_id` or foreign keys) is altered without structural validation, relational integrity could be compromised.

---

## 5. Prioritized Recommendations & Action Plan

### Priority 1: High (Immediate UI Alignment)
1. **Align `canEdit` in `StudentDetail.tsx`**:
   Replace the hardcoded role check with `isUserAdmin(currentUser)` or include `'sysadmin'` so System Administrators can edit student profiles, process withdrawals/exits, and manage KYC documents from the UI.
2. **Align `canManageLifecycle` in `Students.tsx`**:
   Update to `isUserAdmin(user)` or include `'sysadmin'`.

### Priority 2: Medium (API Security Hardening)
1. **Harden Academic Structure Endpoints**:
   Add `Depends(require_role("admin", "principal", "sysadmin"))` to write operations (`POST`, `PUT`, `DELETE`) across `boards.py`, `standards.py`, `divisions.py`, `timetable.py`, and `enrollments.py`.
2. **Universal Edit Schema Constraints**:
   Add explicit field whitelists per model in `UniversalEditRequest` to prevent accidental modification of foreign keys or primary relationship fields.

### Priority 3: Low (Future Roadmap Modules)
1. Implement student Homework & Assignments module if required by business roadmap.
2. Add a dedicated Database Backup & Restore management tab in Settings or SysAdmin Center.
3. Consolidate third-party API webhooks and integrations into a dedicated Integrations Hub.

---

## 6. Audit Verification Sign-Off

- **Audit Type:** Read-Only Complete RBAC & Sysadmin Capabilities Inspection.
- **Modifications Made:** None. (0 files, 0 database records, 0 configurations modified).
- **Audit Conclusion:** The System Administrator role possesses complete governance, supervisory, and auditing controls across all functional modules. Financial integrity is preserved through explicit non-wildcard gating for posted payment edits, mandatory edit reasons, immutable audit logging, and receipt preservation chaining. Minor UI discrepancies in Student Lifecycle visibility represent the only barrier between SysAdmin API capabilities and UI access.

**Report Status:** COMPLETE. Standing by for user review and approval.
