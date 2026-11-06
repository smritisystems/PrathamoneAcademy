---
title: "PrathamOne Academy — Sysadmin Fees & Payments Permissions Audit"
module: "09_FEES_PAYMENTS"
category: "IMPLEMENTATION-PLAN"
document_type: "IMPLEMENTATION-PLAN"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-06"
updated_date: "2026-11-06"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["09-fees-payments", "implementation-plan"]
entities: ["FeeStructure", "FeePlan", "StudentFee", "Payment"]
api_routes: ["/api/v1/fees", "/api/v1/payments"]
related_modules: []
---

# PrathamOne Academy — Sysadmin Fees & Payments Permissions Audit

## 1. Executive Summary & Architecture Inspection

An in-depth security and architectural audit of the **Fees & Payments Module** and **System Administrator (`sysadmin`) RBAC permissions** in PrathamOne Academy was conducted across database models, authorization dependencies, API controllers, and frontend view components.

The audit revealed that while an initial payment lifecycle (Draft, Submitted, Approved, Posted), immutable audit trail, and receipt supersession engine were established, the permission architecture relied almost entirely on coarse role matching (`require_role(...)` and `is_sysadmin(...)`) rather than fine-grained, verifiable permission attributes. Critically, **SysAdmin possessed an unrestricted wildcard (`*:*`)**, which bypassed explicit checks and allowed modifying posted payments without granular permission gating.

---

## 2. Existing Implementation vs. Identified Gaps

| Requirement | Existing Implementation | Identified Gaps | Remediation Strategy |
| :--- | :--- | :--- | :--- |
| **1. Role & Permission Architecture** | `roles` and `permissions` table exist. `sysadmin` role (ID 18) assigned wildcard `*:*`. Coarse role checking in `deps.py`. | No fine-grained permission dependency in FastAPI; endpoints check role names, bypassing granular controls for sysadmin. | Implement `has_permission` and `require_permission` in `deps.py`. Support both wildcard actions and strict non-wildcard actions. |
| **2. Explicit Permissions Definition** | Database permissions table had general entries (`fees:manage`, `payments:manage`). | Missing explicit rows for: `fees:view`, `payments:view`, `payments:draft`, `payments:edit_submitted`, `payments:edit_posted`, `fee_workflow:configure`, `payments:refund_process`, `payments:refund_approve`, `payments:view_audit`. | Seed explicit permission entries for `sysadmin` and administrative roles. |
| **3. Posted Payment Edit Gating** | `payments.py` allowed anyone in `APPROVER_ROLES` (`superadmin`, `sysadmin`, `admin`, `principal`) to edit posted payments. | SysAdmin could edit posted payments unconditionally. No check for explicit `payments:edit_posted` permission existed. | Strict gate: editing posted payments requires explicit `payments:edit_posted`. Deny wildcard `*:*` bypass for this sensitive action. |
| **4. Mandatory Reason for Edits** | Service checked `reason` in `payment_workflow_service.py`. | API schema `PaymentUpdate` had `reason: Optional[str] = None`. Not strictly validated at HTTP boundary with clear error code. | Enforce mandatory `reason` on submitted & posted payment edits at both HTTP endpoint and service layer (HTTP 400 if empty). |
| **5. Immutable Audit History** | `log_payment_audit` logged to `audit_logs` table. | Audit trail endpoint lacked explicit `payments:view_audit` permission enforcement. | Enforce `payments:view_audit` permission; verify before/after JSON diffs, actor, timestamp, and reason immutability. |
| **6. Receipt Integrity & Versioning** | Service increments receipt versions and marks old receipts `superseded` on financial edit; retains number on minor edit. | Need test suite to strictly verify receipt numbering is never silently overwritten or renumbered. | Add automated assertions verifying receipt retention, supersession chaining, and uniqueness. |
| **7. Separate Linked Refunds** | Model `Refund` exists in `refunds` table linked to `payment_id`. | Endpoints allowed refund creation without explicit `payments:refund_process` / `payments:refund_approve` permissions. | Enforce explicit refund permissions on `/api/v1/payments/{payment_id}/refunds` and `/api/v1/payments/refunds/{id}/approve`. |
| **8. Backend API Enforcement** | Some endpoints only checked coarse role strings (`"admin"`, `"principal"`). | Sysadmin blanket bypass allowed unverified access without explicit permission verification. | Implement declarative backend permission checks across all fee & payment endpoints. |
| **9. UI Action Visibility** | Frontend had hardcoded `canEditPosted = ['superadmin', 'sysadmin', 'admin'].includes(userRole)`. | UI showed Edit button even when explicit permission was absent. Did not reflect user permissions from auth state. | Provide user permissions in auth/me payload; update UI buttons to render strictly when authorized. |
| **10. Comprehensive Verification** | Existing tests only verified generic admin workflow. | No tests for denied actions, explicit permission grant/revocation, or sysadmin privilege boundaries. | Implement dedicated test suite covering allowed/denied actions, audit logging, and receipt integrity. |

---

## 3. Implementation Plan

1. **Database Permissions Provisioning**:
   - Seed explicit rows into `permissions` table for `sysadmin` (Role ID 18), `admin` (Role ID 8), and `accountant` (Role ID 10).
   - Define exact permission keys:
     - `fees:view`: View fee structures, categories, and student invoices.
     - `payments:view`: View payment ledger, transaction records, and receipts.
     - `payments:draft`: Create and modify draft payment vouchers.
     - `payments:edit_submitted`: Edit submitted payment vouchers (requires mandatory reason).
     - `payments:edit_posted`: **Special Restricted Permission** to modify posted financial records (requires mandatory reason).
     - `fee_workflow:configure`: Access and configure payment workflow rules and thresholds.
     - `payments:refund_process`: Initiate or disburse payment refunds.
     - `payments:refund_approve`: Formally authorize/approve refund requests.
     - `payments:view_audit`: Access chronological payment audit trail.

2. **Backend Security & Authorization (`backend/app/core/deps.py` & `backend/app/api/v1/endpoints/payments.py`)**:
   - Add `has_permission(db, user, resource, action, allow_wildcard=True)`:
     - If `allow_wildcard=False`: requires the exact `(resource, action)` row in `permissions` table for the user's role.
   - Enforce explicit check in `PUT /api/v1/payments/{payment_id}`:
     - If payment is `posted` or `completed`: strictly require `payments:edit_posted` with `allow_wildcard=False`.
     - Reject if `payments:edit_posted` is missing with HTTP 403: `"Explicit 'Edit Posted Payments' permission is required to modify a posted financial payment."`
     - Require non-empty `reason` string (HTTP 400 if missing or whitespace).
   - Add endpoint `GET /api/v1/payments/my-permissions` and update `/api/v1/auth/login` + `/api/v1/users/me` to include user's permission set.
   - Add endpoint `POST /api/v1/sysadmin/permissions/toggle-edit-posted` for administrative toggling and testing of the explicit permission.

3. **Frontend UI Permissions Synchronization (`frontend/src/pages/Payments.tsx`, `frontend/src/store/authStore.ts`, `frontend/src/types/index.ts`)**:
   - Store user permissions in `useAuthStore`.
   - Update `canEditPosted` to verify `hasPermission('payments:edit_posted')`.
   - Update `canApprove`, `canRefund`, `canViewAudit` to reflect granular permissions.
   - Display a status indicator in the header when editing posted payments is restricted or granted.

4. **Automated Testing Suite**:
   - Create `backend/tests/test_sysadmin_fees_permissions.py` validating all 10 requirements.

---

## 4. Implementation & Verification Summary

### A. Database Migration (`019_sysadmin_fees_permissions.py`)
- Upgraded Alembic database schema to revision `019_fees_permissions`.
- Altered `permissions.role_id` to be nullable.
- Added indexed `permissions.user_id` referencing `users.id` with `ON DELETE CASCADE` to enable both role-level and user-specific explicit permissions.
- Seeded fine-grained fees permissions for `sysadmin`, `admin`, and `accountant`.
- Deliberately withheld `payments:edit_posted` from `sysadmin` role baseline to ensure default protection against posted payment mutations.

### B. Core Security Enforcement (`backend/app/core/deps.py`)
- Implemented `get_user_permissions(db, user)` aggregating both role-assigned permissions and user-specific direct permissions.
- Implemented `has_permission(db, user, resource, action, allow_wildcard=True)`:
  - When `allow_wildcard=False`, universal `*:*` wildcards and `is_sysadmin` status are bypassed, mandating an explicit `(resource, action)` assignment.
- Updated `PUT /api/v1/payments/{payment_id}`:
  - Draft edits verify `payments:draft`.
  - Submitted edits verify `payments:edit_submitted` and require non-empty `reason`.
  - Posted edits verify `payments:edit_posted` with `allow_wildcard=False` and require non-empty `reason`.
- Added `GET /api/v1/payments/my-permissions` and `GET/POST /api/v1/sysadmin/permissions/toggle-edit-posted`.

### C. UI Synchronization (`frontend/`)
- Added `PaymentPermissions` interface in `types/index.ts`.
- Integrated `getMyPermissions` query in `Payments.tsx` to dynamically drive button visibility for Edit, Refund, Approve, and Audit Trail.
- Added visual security badge in `Payments.tsx` header: `Posted Edits: Protected` (Lock) with Sysadmin Unlock Modal, or `Posted Edits: Unlocked`.
- Filtered `Fees.tsx` tabs so workflow configuration is strictly shown if `fee_workflow:configure` is authorized.

### D. Verification & Test Metrics
1. **Dedicated Permissions Test Suite (`test_sysadmin_fees_permissions.py`)**:
   - `test_sysadmin_permissions_check`: Verified baseline fees permissions and `can_edit_posted == False`.
   - `test_draft_payment_creation_and_edit`: Verified draft creation and edit without ledger impact.
   - `test_edit_submitted_payment_requires_reason`: Verified HTTP 400 when reason is missing, HTTP 200 with reason.
   - `test_sysadmin_denied_edit_posted_without_explicit_permission`: Verified HTTP 403 Forbidden for sysadmin attempting to edit posted payment without explicit grant.
   - `test_sysadmin_allowed_edit_posted_with_explicit_permission_receipt_integrity`: Verified HTTP 200 with explicit permission, minor edit retains receipt number, financial edit issues new sequential receipt and marks old receipt `superseded`.
   - `test_refund_separate_transaction_and_balance_enforcement`: Verified refund recorded as separate linked transaction and cannot exceed balance.
   - `test_fee_workflow_configuration_access`: Verified workflow settings endpoint access.
   - **Result: 7 passed in 16.69s**.

2. **Complete Backend Pytest Suite**:
   - Command: `docker exec prashant_academy_backend pytest`
   - **Result: 103 passed, 3 skipped in 107.65s (0:01:47)**. Zero errors, zero failures.

3. **Complete Frontend Vitest Suite**:
   - Command: `npx vitest run --pool=forks`
   - **Result: 24 test files passed, 186 unit tests passed in 93.67s**. Zero errors, zero failures.

4. **Frontend Production Build**:
   - Command: `npm run build` (`tsc && vite build`)
   - **Result: Built in 11.88s**. Zero TypeScript or bundling errors.

5. **Code Compliance & Attribution**:
   - Command: `python scripts/manage_headers.py check`
   - **Result: 238 files checked, 238 passed (100% compliant)**.
