---
title: "PrathamOne Academy — Audit Remediation Full Report"
module: "20_AUDITS_COMPLIANCE"
category: "AUDIT-REPORT"
document_type: "AUDIT-REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-05"
updated_date: "2026-11-05"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["20-audits-compliance", "audit-report"]
entities: []
api_routes: []
related_modules: []
---

# PrathamOne Academy — Audit Remediation Full Report

**Project**: PrathamOne Academy Coaching Institute Management System  
**Branch**: `feat/audit-remediation-phase1`  
**Latest Commits**:  
- `70ec325`: `feat(sequence): unify receipt number generator and dynamic academic year workload templates`  
- `7e70236`: `feat(remediation): complete phase 1 security and data integrity & phase 2 settings consolidation`  
**Alembic Revision**: `013_repair_staff_roles`  
**Working Tree Status**: Clean  

---

## 1. Executive Summary

All prioritized items identified during the system audit (`full_system_audit_report.md`) across **Security & Tenant Isolation (P1)**, **Data Integrity & Staff Role Repair (P1)**, **Settings Consolidation (P1)**, **Sequential Receipt Generation (P2)**, and **Dynamic Workload Templates (P2)** have been implemented, tested, and committed.

Mathematical ledger balances, active student enrollments, and multi-tenant boundary controls are 100% verified.

---

## 2. Completed Remediation Workflows

### 2.1 Multi-Tenant Authorization & IDOR Protection (`SEC-01`)
- Implemented `enforce_institution_access()` and `check_institution_access()` in `backend/app/core/deps.py`.
- Non-sysadmin requests specifying an external `institution_id` return `HTTP 403 Forbidden`.
- Enforced on all student endpoints, attendance querying & marking, examination listing & creation, academic year listing, and staff endpoints.
- Regression tested in `backend/tests/test_tenant_isolation.py` (5/5 tests passing).

### 2.2 Null Staff Role Repair (`DB-01`)
- Created and executed Alembic migration `013_repair_staff_role_assignments.py`.
- Repaired User `126` (`sunita.rao`) and User `127` (`pooja.nair`) to `role = 'staff'`, `role_id = 12`.
- Confirmed via direct database query that `COUNT(*) WHERE role_id IS NULL` is `0`.

### 2.3 Add Student Admission Number Auto-Generation (`UI-01`)
- Backend `StudentCreate` in `students.py` generates sequential admission numbers `PA-{YYYY}-{SEQ:06d}` if omitted.
- Frontend `AddStudent.tsx` provides both an explicit admission number field and automatic sequence assignment.

### 2.4 Staff Credentials Security & Onboarding (`SEC-02`)
- Completely purged `'Prashant@2026'` across the codebase.
- Backend generates high-entropy temporary passwords (`secrets.token_urlsafe(10)`) hashed with bcrypt and returned securely in creation payloads.
- Added onboarding credential modal in `StaffManagement.tsx` with a 1-click "Copy Credentials" action.

### 2.5 Settings Consolidation (`CFG-01`)
- Migrated Fees and Academic workspace operational settings away from client-side `localStorage` keys into the centralized `/settings` API and `institution_settings` table.
- Added deep links from Fees and Academic workspaces directly to `/settings?category=fees` and `/settings?category=academic`.

### 2.6 Authoritative Sequential Receipt Generation (`SEQ-01`)
- Implemented `generate_next_receipt_number()` in `backend/app/services/sequence.py` consuming `fees.receipt_prefix` and `fees.receipt_number_format` from `institution_settings`.
- Replaced UUID-based receipt numbers in `payments.py` with uniform sequential numbering (e.g. `RCP-2026-0171`).
- Added `test_sequential_receipt_number_generation` to `backend/tests/test_payments.py`.

### 2.7 Dynamic Academic Year in Workload Document (`DOC-01`)
- In `backend/app/api/v1/endpoints/staff.py`, replaced hardcoded string `"AY 2026-27"` with dynamic active session lookup `AcademicYear.institution_id == effective_inst_id`.

---

## 3. Verification Scorecard

| Check | Expected | Actual | Status |
|---|---|---|---|
| **PostgreSQL Migration** | `013_repair_staff_roles` | `013_repair_staff_roles` | PASSED |
| **Users with NULL Role** | 0 | 0 | PASSED |
| **Active Enrolled Students** | 39 | 39 | PASSED |
| **Total Invoiced / Paid Ledger** | ₹1,819,500.00 | ₹1,819,500.00 | PASSED |
| **Backend Pytest Suite** | 71 Tests Passed/Skipped | 68 passed, 3 skipped, 0 failed | PASSED |
| **Frontend Vitest Suite** | 130 Tests Passed | 20 files passed, 130 tests passed | PASSED |
| **Frontend Production Build** | Zero TypeScript / Vite errors | `tsc && vite build` built in 10.59s | PASSED |
| **Attribution Headers** | 204 Files Compliant | 204/204 files compliant | PASSED |
| **Docker Fleet Health** | 3 Containers Up & Healthy | `db`, `backend`, `frontend` all healthy | PASSED |
