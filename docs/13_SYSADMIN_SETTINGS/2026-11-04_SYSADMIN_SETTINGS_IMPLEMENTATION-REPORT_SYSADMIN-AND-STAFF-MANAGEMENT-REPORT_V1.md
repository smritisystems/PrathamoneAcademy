---
title: "System Administrator (SysAdmin) Superuser & Teacher/Staff Management Implementation Report"
module: "13_SYSADMIN_SETTINGS"
category: "IMPLEMENTATION-REPORT"
document_type: "IMPLEMENTATION-REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-04"
updated_date: "2026-11-04"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["13-sysadmin-settings", "implementation-report"]
entities: ["InstituteSetting", "SystemSetting"]
api_routes: ["/api/v1/sysadmin", "/api/v1/institute-settings"]
related_modules: []
---

# System Administrator (SysAdmin) Superuser & Teacher/Staff Management Implementation Report

**Project:** PrathamOne Academy Coaching Institute Management System  
**Organization:** AITDL (AI Technology & Development Lab)  
**Client:** Prashant Academy Coaching Institute  
**Commit:** `83a8006`  
**Date:** November 4, 2026  

---

## 1. Executive Summary

This release delivers two foundational pillars for PrathamOne Academy:
1. **Comprehensive System Administrator (SysAdmin) Superuser Role**: Centralized role-based access control, universal record modification capabilities, isolated append-only security audit trail, and last-active account deletion/deactivation prevention.
2. **Teacher & Staff Management Module**: Faculty directory with workload tracking, academic subject-batch allocation with schedule conflict detection, daily attendance registers, leave application/approval workflows, role-tailored dashboards, and an official **28-Document Printable Staff Forms Center**.

All 176 source files satisfy strict AITDL code attribution rules, pass full automated TypeScript and pytest suites, and are packaged into an updated production database dump and safe deployment scripts.

---

## 2. System Architecture & Components

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PrathamOne Academy 2.4.0                        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌───────────────────────────────────┐             ┌───────────────────────────────────┐
│     SysAdmin Superuser Module     │             │     Teacher & Staff Workspace     │
├───────────────────────────────────┤             ├───────────────────────────────────┤
│ • Dedicated role: 'sysadmin'      │             │ • Staff Directory & Search        │
│ • Universal Edit API              │             │ • Academic Workload Allocation    │
│ • Blanket require_role() bypass   │             │ • Daily Attendance Register       │
│ • Isolated Security Audit Trail   │             │ • Leave Sanction Workflow         │
│ • Last-SysAdmin Deletion Guard    │             │ • 28 Printable Document Templates │
└─────────────────┬─────────────────┘             └─────────────────┬─────────────────┘
                  │                                                 │
                  └────────────────────────┬────────────────────────┘
                                           ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    PostgreSQL 16 Enterprise Database                   │
│   • audit_logs (is_system_audit, severity, details, client_ip)         │
│   • staff_profiles, teacher_assignments, staff_attendances             │
│   • staff_leaves, staff_leave_balances, staff_generated_documents      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Key Implementations

### A. SysAdmin Account & Role Protection
- **Role Definition**: Registered `sysadmin` (`id: 18`) in the `roles` table with wildcard permissions (`*:*`).
- **Secure Provisioning Utility** ([`bootstrap_sysadmin.py`](file:///F:/PrashantAcademy/backend/scripts/bootstrap_sysadmin.py)):
  - Can read `SYSADMIN_USERNAME`, `SYSADMIN_EMAIL`, and `SYSADMIN_PASSWORD` from the environment.
  - Automatically generates an 18-character high-entropy cryptographic password when no environment variable is provided.
  - Upgrades schema, assigns wildcard permissions, logs the bootstrap action into the security audit trail.
- **Accidental Deletion & Deactivation Guard**:
  - Implemented in [`backend/app/api/v1/endpoints/users.py`](file:///F:/PrashantAcademy/backend/app/api/v1/endpoints/users.py).
  - Both soft deactivation (`is_active = False`), status toggling, and permanent deletion count remaining active `sysadmin`/`superadmin` accounts. If count $\le 1$, the API aborts with `HTTP 400 Bad Request`.

### B. Universal Editing & Full Application Access
- **Blanket Permission Resolution** ([`backend/app/core/deps.py`](file:///F:/PrashantAcademy/backend/app/core/deps.py)):
  - In `require_role(*roles)`, if `current_user.role in ("sysadmin", "superadmin", "super_admin")`, access is immediately granted without requiring every endpoint to enumerate superuser roles.
- **Centralized Universal Edit API** (`POST /api/v1/sysadmin/universal-edit`):
  - Allows SysAdmin to update any editable field across `student`, `staff`, `user`, `fee_structure`, `division`, `standard`, and `institution`.
  - Automatically records before/after JSON snapshots into `audit_logs` with `is_system_audit = True` and severity `'warning'`.
  - Preserves foreign keys, non-null constraints, and financial ledger integrity.

### C. Security Audit Log Isolation
- Extended [`AuditLog`](file:///F:/PrashantAcademy/backend/app/models/user.py) with `is_system_audit`, `severity`, `details`, and indexing.
- **Feed Isolation**: Ordinary user activity feeds explicitly filter with `AuditLog.is_system_audit == False`.
- **Protected Security Endpoint** (`GET /api/v1/sysadmin/security-audit-logs`): Accessible exclusively to `sysadmin` and `superadmin`.
- **Append-Only Immutability**: The audit log schema has no `DELETE` or `PUT` endpoints, preventing audit log tampering.

### D. Teacher & Staff Management Workspace ([`StaffManagement.tsx`](file:///F:/PrashantAcademy/frontend/src/pages/StaffManagement.tsx))
1. **Directory**: Filter by staff type (Teacher, Admin, Accountant, Counselor, Receptionist) and employment status with workload indicators.
2. **Academic Assignments**: Interactive matrix allocating faculty to ICSE, CBSE, and SSC classes with duplicate schedule validation.
3. **Daily Attendance**: Single-click status marking (Present, Absent, Late, Half-Day, On Leave) with attendance rate aggregation.
4. **Leaves**: Workflow supporting application, approval, and automated balance deduction across casual, sick, and earned leave accounts.
5. **Staff Documents & Forms Center**: Catalog of **28 official printable templates** across 5 categories with browser preview, print isolation (`#staff-doc-print-area`), and dynamic reference numbering.

---

## 4. Automated Verification Results

| Test Area | Tool / Runner | Command | Result |
| :--- | :--- | :--- | :--- |
| **Backend SysAdmin & Staff Tests** | `pytest` | `pytest tests/test_sysadmin_and_staff.py -v` | **4 passed (100%)** |
| **Frontend Production Build** | `tsc` + `vite` | `npm --prefix frontend run build` | **0 errors, 2285 modules transformed** |
| **Attribution Header Compliance** | Custom Linter | `python scripts/manage_headers.py check` | **176/176 passed** |
| **Production Database Dump** | `pg_dump` | `docker exec -i prashant_academy_db pg_dump ...` | **1,066,052 bytes exported** |

---

## 5. Deployment Instructions for Remote / Customer Machine

On the customer's machine in `E:\PrashantAcademy\PrathamoneAcademy`:

```powershell
.\update.ps1
```

The updated `update.ps1` script will automatically:
1. Pull latest commits from GitHub (`origin/master`).
2. Rebuild frontend and backend containers.
3. Normalize academic years and institution ID to `1`.
4. Initialize Teacher & Staff profiles.
5. Provision/synchronize the SysAdmin superuser role and wildcard permissions.
