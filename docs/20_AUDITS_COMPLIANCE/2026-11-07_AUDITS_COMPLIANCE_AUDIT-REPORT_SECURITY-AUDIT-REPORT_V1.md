---
title: "PrathamOne EduOS — Information Security, RBAC & Governance Audit"
module: "20_AUDITS_COMPLIANCE"
category: "AUDIT-REPORT"
document_type: "AUDIT-REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-07"
updated_date: "2026-11-07"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["20-audits-compliance", "security-audit", "rbac", "owasp", "dpdp-act"]
entities: ["users", "security_audit_logs", "audit_logs", "role_permissions", "codex_configs"]
api_routes: ["/api/v1/auth/login", "/api/v1/sysadmin/security-audit-logs", "/api/v1/sysadmin/universal-edit", "/api/v1/users/"]
related_modules: ["12_RBAC_SECURITY", "13_SYSADMIN_SETTINGS", "01_ARCHITECTURE"]
---

# PrathamOne EduOS — Information Security, RBAC & Governance Audit

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0 (Build: 2026.11.06-REV-016-v1.10.0-9D2489F)  
**Organization:** AITDL — AI Technology & Development Lab  
**Product Architect:** Jawahar R Mallah  
**Audit Date:** 2026-11-07  
**Security Baseline:** Enterprise Role-Based Access Control & DPDP Act 2023 Compliance  

---

## 1. Executive Summary

This comprehensive security audit evaluated the authentication mechanisms, role-based access control (RBAC), API endpoint authorization, cryptographic hashing, data privacy safeguards, and audit logging features of **PrathamOne EduOS**.

The automated security test harness (`scripts/verify_api_authorization.py`) verified **17 out of 17 security test assertions (100% pass rate)**. The system cleanly rejected unauthenticated requests (HTTP 401), unauthorized role privilege escalation attempts (HTTP 403), and malicious attempts to overwrite primary database keys via universal edit utilities (HTTP 400).

---

## 2. Authentication & Credential Architecture

- **Protocol:** OAuth2 with Password Bearer flow.
- **Tokens:** JSON Web Tokens (JWT) signed with HMAC-SHA256 (`HS256`).
- **Token Expiry:** Governed by `ACCESS_TOKEN_EXPIRE_MINUTES` configuration with automatic client session expiration interceptor.
- **Password Hashing:** Passlib with Bcrypt cryptographic salt (cost factor 12).
- **Session Protection:** Centralized client Axios interceptor handles 401 errors, flushes storage, and redirects to `/login` with redirect loop protection.

---

## 3. RBAC Enforcement & Authorization Matrix

The system enforces an explicit 8-tier role hierarchy:
1. `sysadmin`: Complete administrative supremacy, universal edit, security audit logs, CodeX master configuration.
2. `admin`: Institute branch administrator with academic, student, and staff write permissions.
3. `academic_admin`: Curricular management, timetable scheduling, teacher batch allocation.
4. `accountant`: Fee collection, invoice generation, voucher tracking (strictly read-only on academic structure).
5. `teacher`: View assigned batches, mark student attendance, enter exam marks, view personal payroll.
6. `staff`: Non-teaching employee self-service (leave applications, attendance history).
7. `student`: Student portal access (view attendance, marks, report cards, fee receipts).
8. `parent`: Parent guardian portal access (multi-child academic overview).

### Empirical Authorization Test Results:

| Test Case | Method & Endpoint | Caller Role | Expected | Actual Result | Verification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Unauth Academic Write** | `POST /api/v1/boards/` | Anonymous | 401 Unauthorized | **401 Unauthorized** | **PASSED** |
| **Unauth Standard Write** | `POST /api/v1/standards/` | Anonymous | 401 Unauthorized | **401 Unauthorized** | **PASSED** |
| **Unauth Division Write** | `POST /api/v1/divisions/` | Anonymous | 401 Unauthorized | **401 Unauthorized** | **PASSED** |
| **Unauth Timetable Write**| `POST /api/v1/timetable/` | Anonymous | 401 Unauthorized | **401 Unauthorized** | **PASSED** |
| **Unauth Universal Edit** | `POST /api/v1/sysadmin/universal-edit` | Anonymous | 401 Unauthorized | **401 Unauthorized** | **PASSED** |
| **Unauth Security Logs** | `GET /api/v1/sysadmin/security-audit-logs` | Anonymous | 401 Unauthorized | **401 Unauthorized** | **PASSED** |
| **Unauth Forms Audit** | `GET /api/v1/forms/audit-logs` | Anonymous | 401 Unauthorized | **401 Unauthorized** | **PASSED** |
| **Accountant Escalation** | `POST /api/v1/boards/` | `accountant` | 403 Forbidden | **403 Forbidden** | **PASSED** |
| **Accountant Escalation** | `POST /api/v1/standards/` | `accountant` | 403 Forbidden | **403 Forbidden** | **PASSED** |
| **Accountant Escalation** | `POST /api/v1/divisions/` | `accountant` | 403 Forbidden | **403 Forbidden** | **PASSED** |
| **Accountant Escalation** | `POST /api/v1/timetable/` | `accountant` | 403 Forbidden | **403 Forbidden** | **PASSED** |
| **Accountant Universal Edit**| `POST /api/v1/sysadmin/universal-edit` | `accountant` | 403 Forbidden | **403 Forbidden** | **PASSED** |
| **Accountant Security Logs** | `GET /api/v1/sysadmin/security-audit-logs` | `accountant` | 403 Forbidden | **403 Forbidden** | **PASSED** |
| **Sysadmin Security Logs**| `GET /api/v1/sysadmin/security-audit-logs` | `sysadmin` | 200 OK | **200 OK** | **PASSED** |
| **Sysadmin Forms Audit** | `GET /api/v1/forms/audit-logs` | `sysadmin` | 200 OK | **200 OK** | **PASSED** |
| **Sysadmin Protected Key**| `POST /api/v1/sysadmin/universal-edit` (`id: 99999`) | `sysadmin` | 400 Bad Request | **400 Bad Request** | **PASSED** |
| **Sysadmin Protected Field**| `POST /api/v1/sysadmin/universal-edit` (`created_at`) | `sysadmin` | 400 Bad Request | **400 Bad Request** | **PASSED** |

---

## 4. CodeX Cryptographic Security & Salted PIN Protection

The newly engineered CodeX capability introduces multi-layer security protections:
- **Default Isolation:** `CODEX_SYSTEM_DEFAULT = False`. CodeX is globally non-operational unless explicitly activated by a verified business owner.
- **Six-Tier Precedence Policy:** Mandatory System Security Restrictions $\rightarrow$ System Default $\rightarrow$ Business Scope $\rightarrow$ Department Scope $\rightarrow$ Role Scope $\rightarrow$ User Scope. More restrictive security rules always override user settings.
- **PIN Authorization:** Secret PINs are hashed using salted SHA-256 before storage in `codex_configs.quick_decoder_pin_hash`. Plaintext PINs are never persisted or returned in API responses.
- **Temporary Access Tokens:** On-demand access grants expire automatically based on `temp_access_duration_minutes` and are logged in `codex_temporary_tokens`.

---

## 5. DPDP Act 2023 & Student Data Privacy

- **Student Document Isolation:** Student identity proofs, Aadhaar documents, and medical declarations in `student_documents` are restricted to authorized administrators.
- **Audit Logging:** System maintains 210 active entries in `audit_logs`, recording entity mutations with user attribution, IP address, timestamp, and field deltas.
- **Universal Edit Safeguards:** Universal record modifications require explicit, mandatory reason text (`audit_reason`) which is permanently committed to `audit_logs`.

