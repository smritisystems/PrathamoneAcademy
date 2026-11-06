---
title: "PrathamOne Academy — Sysadmin RBAC Remediation Report"
module: "13_SYSADMIN_SETTINGS"
category: "IMPLEMENTATION-REPORT"
document_type: "IMPLEMENTATION-REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-06"
updated_date: "2026-11-06"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["13-sysadmin-settings", "implementation-report"]
entities: ["InstituteSetting", "SystemSetting"]
api_routes: ["/api/v1/sysadmin", "/api/v1/institute-settings"]
related_modules: []
---

# PrathamOne Academy — Sysadmin RBAC Remediation Report

**Date:** November 6, 2026  
**Module:** System Administration & RBAC Authorization Architecture  
**System:** PrathamOne Academy • Prashant Academy Coaching Institute  
**Version:** v6.99.1 (Build: 2026.11.05-PROD-REL)

---

## 1. Executive Summary

Based on the baseline findings from the Sysadmin RBAC Audit, the verified UI visibility discrepancies and backend authorization vulnerabilities have been systematically remediated:

1. **Student Management UI Alignment**:
   - Replaced hardcoded role arrays with the centralized `isUserAdmin(user)` helper in `StudentDetail.tsx` and `Students.tsx`.
   - Enabled "Edit Profile", "Exit / Withdraw", "Reactivate Student", and KYC document management (Upload/Delete) actions for SysAdmin users in the UI.
   - Updated `Users.tsx` badge rendering to explicitly recognize the `sysadmin` role.

2. **Academic Master Data Write Security**:
   - Secured all write endpoints (`POST`, `PUT`, `DELETE`) across `boards.py`, `standards.py`, `divisions.py`, `timetable.py`, `enrollments.py`, `subjects.py`, and `academic_years.py`.
   - Replaced unauthenticated/permissive `Depends(get_current_active_user)` on mutation endpoints with explicit `Depends(require_role("superadmin", "admin", "principal"))` (and `"staff"` for enrollment management).
   - Low-privileged roles (`student`, `teacher`, `accountant`) attempting to mutate academic structure are now blocked with **HTTP 403 Forbidden** at the API level.

3. **Universal Records Editor Allowlists & Data Protection**:
   - Introduced explicit field-level allowlists in `execute_universal_edit` per model (`student`, `staff`, `user`, `fee_structure`, `division`/`batch`, `standard`, `institution`).
   - Protected primary keys (`id`), foreign keys, tenant identifiers (`institution_id`), password hashes (`hashed_password`), and system-managed timestamps (`created_at`, `updated_at`).
   - Requests containing protected or non-permissible fields are rejected with **HTTP 400 Bad Request**.
   - Preserved immutable before/after diff audit logging in `audit_logs` table.
   - Preserved the safeguard preventing deactivation of the last active System Administrator account.

4. **Fees & Payments Strict Gate Preservation**:
   - Preserved explicit non-wildcard check (`allow_wildcard=False`) for `payments:edit_posted`.
   - Universal wildcard `*:*` cannot bypass the posted payment edit gate.
   - Mandatory edit reason required for submitted and posted transactions.
   - Sequential receipt integrity and supersession (`superseded_by_receipt_number`) preserved.

---

## 2. File-by-File Changes

### A. Frontend UI Layer
- **[`frontend/src/pages/StudentDetail.tsx`](file:///f:/PrashantAcademy/frontend/src/pages/StudentDetail.tsx)**:
  - Imported centralized `isUserAdmin` from `../store/authStore`.
  - Replaced `const canEdit = currentUser?.role === 'superadmin' || currentUser?.role === 'admin' || currentUser?.role === 'principal'` with `const canEdit = isUserAdmin(currentUser)`.
  - Enabled "Edit Profile", "Exit / Withdraw", "Reactivate Student", and KYC document upload/delete buttons for SysAdmin.
- **[`frontend/src/pages/Students.tsx`](file:///f:/PrashantAcademy/frontend/src/pages/Students.tsx)**:
  - Imported `isUserAdmin` from `../store/authStore`.
  - Replaced `const canManageLifecycle = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'staff'` with `const canManageLifecycle = isUserAdmin(user) || user?.role === 'staff'`.
  - Enabled table row quick actions for Exit and Reactivate for SysAdmin.
- **[`frontend/src/pages/Users.tsx`](file:///f:/PrashantAcademy/frontend/src/pages/Users.tsx)**:
  - Added `{ value: 'sysadmin', label: 'System Administrator' }` to the `ROLES` catalog.
  - Enabled SysAdmin filtering in user directory and SysAdmin role selection in user create and edit modals.
  - Added `case 'sysadmin':` to `getRoleBadgeClass` switch statement for badge styling.
- **[`frontend/src/pages/UserProfile.tsx`](file:///f:/PrashantAcademy/frontend/src/pages/UserProfile.tsx)**:
  - Added `{ value: 'sysadmin', label: 'System Administrator' }` to the `ROLES` catalog.
  - Added `case 'sysadmin':` to `getRoleBadgeClass` and `getRoleGradient` for purple badge and banner gradient.
- **[`frontend/src/pages/SysAdminWorkspace.tsx`](file:///f:/PrashantAcademy/frontend/src/pages/SysAdminWorkspace.tsx)**:
  - Added `MODEL_ALLOWLISTS` constant reflecting backend permissible fields per entity.
  - Added clickable interactive field tags in the Universal Records Editor to instantly populate attribute keys.
  - Added `batch` (Academic Batch) option to entity selection dropdown alongside `division`.

### B. Backend Authorization & API Security Layer
- **[`backend/app/api/v1/endpoints/boards.py`](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/boards.py)**:
  - Secured `create_board` (`POST /`), `update_board` (`PUT /{id}`), and `toggle_board_status` (`PUT /{id}/toggle-status`) with `Depends(require_role("superadmin", "admin", "principal"))`.
- **[`backend/app/api/v1/endpoints/standards.py`](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/standards.py)**:
  - Secured `update_academic_settings` (`PUT /academic-settings`), `create_standard` (`POST /`), `update_standard` (`PUT /{id}`), and `delete_standard` (`DELETE /{id}`) with `Depends(require_role("superadmin", "admin", "principal"))`.
- **[`backend/app/api/v1/endpoints/divisions.py`](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/divisions.py)**:
  - Secured `create_division` (`POST /`), `update_division` (`PUT /{id}`), and `archive_division` (`PUT /{id}/archive`) with `Depends(require_role("superadmin", "admin", "principal"))`.
- **[`backend/app/api/v1/endpoints/timetable.py`](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/timetable.py)**:
  - Secured `create_timetable_entry` (`POST /`), `update_timetable_entry` (`PUT /{id}`), and `delete_timetable_entry` (`DELETE /{id}`) with `Depends(require_role("superadmin", "admin", "principal"))`.
- **[`backend/app/api/v1/endpoints/enrollments.py`](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/enrollments.py)**:
  - Secured `create_enrollment` (`POST /`), `transfer_batch` (`POST /transfer`), `update_enrollment` (`PUT /{id}`), and `delete_enrollment` (`DELETE /{id}`) with `Depends(require_role("superadmin", "admin", "principal", "staff"))`.
- **[`backend/app/api/v1/endpoints/subjects.py`](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/subjects.py)**:
  - Secured `create_subject` (`POST /`), `update_subject` (`PUT /{id}`), and `delete_subject` (`DELETE /{id}`) with `Depends(require_role("superadmin", "admin", "principal"))`.
- **[`backend/app/api/v1/endpoints/academic_years.py`](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/academic_years.py)**:
  - Secured `create_academic_year` (`POST /`) and `update_academic_year` (`PUT /{id}`) with `Depends(require_role("superadmin", "admin", "principal"))`.
- **[`backend/app/api/v1/endpoints/sysadmin.py`](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/sysadmin.py)**:
  - Defined `MODEL_FIELD_ALLOWLIST` with explicit allowed keys for `student`, `staff`, `user`, `fee_structure`, `division`, `batch`, `standard`, and `institution`.
  - Enforced strict allowlist validation in `execute_universal_edit`.
- **[`backend/tests/test_sysadmin_rbac_remediation.py`](file:///f:/PrashantAcademy/backend/tests/test_sysadmin_rbac_remediation.py)**:
  - Created 6 automated integration tests covering academic write permissions, teacher/student denial, staff enrollment permissions, universal editor field allowlists, sysadmin lockout protection, and tenant isolation.

---

## 3. Test Verification & Build Results

### 1. Dedicated Remediation Test Suite
```bash
docker exec prashant_academy_backend pytest tests/test_sysadmin_rbac_remediation.py
```
**Result:** **6 passed in 15.90s**
- `test_academic_write_allowed_for_sysadmin_admin_principal` (PASS)
- `test_academic_write_denied_for_student_and_teacher` (PASS: HTTP 403 Forbidden on boards, standards, batches, timetable)
- `test_enrollments_write_allowed_for_staff_denied_for_teacher` (PASS: HTTP 403 for teacher, HTTP 201 for staff)
- `test_universal_edit_allowlist_enforcement_and_audit_logging` (PASS: HTTP 200 on allowed fields with audit log, HTTP 400 on protected fields like `institution_id`)
- `test_universal_edit_sysadmin_deactivation_safeguard` (PASS: HTTP 400 blocking deactivation of sole active sysadmin)
- `test_cross_tenant_isolation_enforcement` (PASS: HTTP 403 when teacher queries foreign `institution_id`, HTTP 200 for Sysadmin)

### 2. Fees & Payments Security Suite
```bash
docker exec prashant_academy_backend pytest tests/test_sysadmin_fees_permissions.py
```
**Result:** **7 passed in 15.21s**
- `test_sysadmin_permissions_check` (PASS: `can_edit_posted == False` default baseline)
- `test_draft_payment_creation_and_edit` (PASS: 0 ledger impact)
- `test_edit_submitted_payment_requires_reason` (PASS: HTTP 400 without reason, HTTP 200 with reason)
- `test_sysadmin_denied_edit_posted_without_explicit_permission` (PASS: HTTP 403 Forbidden)
- `test_sysadmin_allowed_edit_posted_with_explicit_permission_receipt_integrity` (PASS: Receipt preserved on minor edit, superseded with new sequential receipt on financial edit)
- `test_refund_separate_transaction_and_balance_enforcement` (PASS: Balance enforcement and separate linked record)
- `test_fee_workflow_configuration_access` (PASS)

### 3. Full Backend Pytest Suite
```bash
docker exec prashant_academy_backend pytest
```
**Result:** **109 passed, 3 skipped in 103.90s (0:01:43)**. 0 errors, 0 failures.

### 4. Full Frontend Vitest Suite
```bash
npx vitest run --pool=forks
```
**Result:** **24 test files passed, 186 unit tests passed in 46.56s**. 0 errors, 0 failures.

### 5. Frontend Production Build & Deployment
```bash
npm run build
docker cp frontend/dist/. prashant_academy_frontend:/usr/share/nginx/html/
docker exec prashant_academy_frontend nginx -s reload
```
**Result:** Built cleanly in 11.63s without warnings or TypeScript errors. Deployed to live Nginx web server.

### 6. Source Header Attribution
```bash
python scripts/manage_headers.py check
```
**Result:** 239 source files checked, **239 passed (100% compliant)**.

### 7. Git Version Control & Deployment
- **Commit:** `6e4eaa7` (`fix(rbac): resolve sysadmin UI visibility inconsistencies, secure academic master data endpoints, and enforce universal editor allowlists`)
- **Remote:** Pushed cleanly to `origin/master` (`https://github.com/smritisystems/PrathamoneAcademy.git`).
- **Docker Compose:** Executed `docker compose build` and `docker compose up -d`. All containers (`prashant_academy_frontend`, `prashant_academy_backend`, `prashant_academy_db`) are up and healthy.
