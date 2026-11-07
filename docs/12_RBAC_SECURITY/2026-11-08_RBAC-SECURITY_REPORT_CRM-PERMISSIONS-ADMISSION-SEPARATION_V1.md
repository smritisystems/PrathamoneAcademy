---
title: "RBAC Correction: CRM Permissions and Student Admission Separation Audit & Implementation Report"
module: "12_RBAC_SECURITY"
category: "SECURITY-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-08"
updated_date: "2026-11-08"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["rbac", "crm", "permissions", "admission-separation", "view-first", "security"]
entities: ["Lead", "Student", "UserPermission", "Role"]
api_routes: ["/api/v1/leads", "/api/v1/leads/{id}/convert"]
related_modules: ["04_STUDENT_MANAGEMENT", "12_RBAC_SECURITY", "09_FEES_PAYMENTS"]
---

# RBAC CORRECTION — SEPARATE CRM PERMISSIONS FROM STUDENT ADMISSION
**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Author:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Report Date:** 2026-11-08  
**Status:** Approved & Verified (100% Tests Passing)

---

## 1. EXECUTIVE SUMMARY & ROOT CAUSE ANALYSIS

### 1.1 The Issue
When opening or activating Edit Mode in **Lead Management & CRM**, users without the `students:admission` permission were completely blocked by the system error:
```
Insufficient privileges: Permission 'students:admission' is required.
```
This conflated general CRM sales and counselling operations (enquiry logging, follow-up scheduling, phone/email contact logs, and pipeline stage transitions) with student registration and admission creation. Counsellors, telecallers, and front-desk staff who manage the enquiry pipeline should not require high-privilege admission authority to manage daily CRM activities.

### 1.2 Root Cause Analysis
A forensic code audit traced the lock to:
1. **Frontend Edit Mode Guard (`frontend/src/pages/LeadManagement.tsx:269`):**
   The `EditModeBar` component was declared with `requiredPermission="students:admission"` for the CRM scope `crm:leads`. Because `editModeStore.ts` enforced an exact match against `requiredPermission`, any user without `students:admission` was rejected from activating Edit Mode across the entire CRM page.
2. **Backend Router Permission Checks (`backend/app/api/v1/endpoints/leads.py`):**
   General CRM endpoints relied on broad administrative roles or role lists without fine-grained canonical `leads:*` permission gating, leading to ambiguity between admission officers and sales counsellors.
3. **Database Permission Catalog:**
   The `permissions` table lacked explicit, granular seeds for the canonical `leads:*` hierarchy (`leads:read`, `leads:create`, `leads:update`, `leads:assign`, `leads:followup`, `leads:communicate`, `leads:manage_pipeline`, `leads:reports`, `leads:delete`).

---

## 2. SSOT & PERMISSION ARCHITECTURE DESIGN

In accordance with Single Source of Truth (SSOT) and Rule 010 (View-First Governance), the CRM and Admission domains have been strictly decoupled into distinct functional boundaries:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   CRM & LEAD WORKFLOW BOUNDARY                         │
│                                                                        │
│  [leads:read]            --> View CRM, metrics, Kanban, Dossiers       │
│  [leads:create]          --> Register new walk-in / online enquiries   │
│  [leads:update]          --> Modify lead demographic & course data     │
│  [leads:assign]          --> Assign counsellors & reassign ownership   │
│  [leads:followup]        --> Schedule & log call / demo follow-ups     │
│  [leads:communicate]     --> Send & record WhatsApp, SMS, email logs   │
│  [leads:manage_pipeline] --> Drag-and-drop Kanban stage transitions    │
│  [leads:reports]         --> View CRM analytics & conversion rates     │
│  [leads:delete]          --> Archive / remove stale lead records       │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                         Lead reaches "Interested" /
                         "Admission Pending" stage
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 STUDENT ADMISSION BOUNDARY (GATED)                     │
│                                                                        │
│  [students:admission]    --> Convert Lead to Registered Student Master │
│  [admissions:create]     --> Alternate canonical admission permission  │
│  [students:manage]       --> Admin / Principal master governance       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. IMPLEMENTATION DETAILS

### 3.1 Database Migration (`029_crm_rbac_permissions.py`)
Alembic migration `029_crm_rbac_permissions` was created and applied to PostgreSQL:
- Seeded canonical permissions in `permissions` table:
  - `leads:read`, `leads:create`, `leads:update`, `leads:assign`, `leads:followup`, `leads:communicate`, `leads:manage_pipeline`, `leads:reports`, `leads:delete`.
- Assigned all `leads:*` permissions to `staff`, `admin`, `principal`, `superadmin`, and `sysadmin` roles.
- Preserved `students:admission` strictly on admission-authorized roles (`admin`, `principal`, `superadmin`, `sysadmin`) while keeping standard `staff` (counsellor) users free of `students:admission`.

### 3.2 Backend Endpoint Hardening (`backend/app/api/v1/endpoints/leads.py`)
- Implemented `require_lead_access(action, default_roles)` FastAPI dependency verifying either user role or granular `leads:{action}` permission.
- Protected all CRM endpoints (`GET /leads`, `GET /leads/kanban`, `GET /leads/metrics/summary`, `GET /leads/{id}`, `POST /leads`, `PUT /leads/{id}`, `PATCH /leads/{id}/stage`, `POST /leads/{id}/follow-ups`, `POST /leads/{id}/demo-classes`, `POST /leads/{id}/communications`, `DELETE /leads/{id}`).
- Hardened conversion endpoint `POST /leads/{id}/convert` and `/leads/{id}/convert-to-admission` with independent server-side admission authorization:
  ```python
  has_admission_perm = (
      "students:admission" in user_perms
      or "admissions:create" in user_perms
      or "students:manage" in user_perms
      or current_user.role in ("admin", "principal", "superadmin", "sysadmin")
  )
  if not has_admission_perm:
      raise HTTPException(
          status_code=status.HTTP_403_FORBIDDEN,
          detail="Admission conversion requires separate Student Admission authorization. You can continue managing this lead in CRM."
      )
  ```

### 3.3 Frontend Governance (`EditModeBar.tsx`, `editModeStore.ts`, `LeadManagement.tsx`)
1. **Multi-Permission Support in Edit Mode:**
   Updated `editModeStore.ts` and `EditModeBar.tsx` to support comma-separated permissions (e.g. `requiredPermission="leads:update,leads:create"`), unlocking Edit Mode for anyone holding either update or create privileges.
2. **Page-Level Decoupling:**
   Changed `LeadManagement.tsx` to require `leads:update,leads:create` to activate CRM Edit Mode.
3. **Locked Conversion Button & Advisory Banner:**
   If the user activates CRM Edit Mode but lacks `students:admission`, the "Convert to Admission" button remains locked with a disabled styling, tooltip, and clear explanatory banner:
   > *"Admission conversion requires separate Student Admission authorization. You can continue managing this lead in CRM."*
4. **Unauthorized User Guard:**
   Users lacking `leads:read` are blocked from viewing the workspace and presented with an Access Denied card.

---

## 4. VERIFICATION & TEST RESULTS

### 4.1 Backend Pytest Suite (`backend/tests/test_crm_rbac_separation.py`)
| Test Case | Role Under Test | Expected Result | Status |
|---|---|---|---|
| `test_counsellor_can_perform_crm_operations_but_cannot_convert_admission` | Counsellor (`staff` without `students:admission`) | CRM CRUD HTTP 200/201, Conversion HTTP 403 Forbidden | **PASSED** |
| `test_admission_officer_can_convert_leads_to_admission` | Admission Officer (`students:admission`) | Lead converted to student, Student ID generated HTTP 200 | **PASSED** |
| `test_administrator_full_crm_and_admission_governance` | Administrator (`admin` / `*:*`) | Full access across CRM and Admission Conversion | **PASSED** |
| `test_unauthorized_user_cannot_access_crm_or_perform_operations` | Unauthorized User (no permissions) | Access rejected with HTTP 403 Forbidden | **PASSED** |
| **Combined Regression (`test_lead_management_crm.py`)** | All endpoints | 11/11 tests | **PASSED** |

**Total Backend Result:** 15 passed, 0 failed (100% pass rate).

### 4.2 Frontend Vitest Suite (`frontend/src/test/LeadManagementRBAC.test.tsx`)
| Test Suite | Tests | Result | Duration |
|---|---|---|---|
| `LeadManagementRBAC.test.tsx` (Roles A, B, C, D) | 4 | **4 PASSED** | 1.07s |
| `LeadManagementCRM.test.tsx` (Workspace & Pipeline) | 5 | **5 PASSED** | 1.18s |
| **Total Frontend Result** | **9** | **9 PASSED** | **4.98s** |

### 4.3 Production Build & Deployment Verification
- `tsc && vite build`: Completed in 15.66s with **0 TypeScript errors**.
- Deployed bundle to Docker container `prashant_academy_frontend`.
- Tested `http://localhost/leads`: Returned **HTTP 200 OK**.

---

## 5. AUDIT CONCLUSION & GOVERNANCE COMPLIANCE
The separation between CRM lead management and student admission authorization has been successfully implemented and verified. Sales counsellors and enquiry coordinators can now seamlessly operate within their designated workspace under Rule 010 View-First governance without triggering permission errors or requiring ungranted student admission privileges.

