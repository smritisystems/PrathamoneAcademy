---
title: "PrathamOne EduOS — Information Security, RBAC & Sensitive Permissions Audit"
module: "20_AUDITS_COMPLIANCE"
category: "AUDIT-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-10"
updated_date: "2026-11-10"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["security-audit", "rbac", "permissions", "dpdp-act", "data-privacy", "jwt", "multi-tenant"]
entities: ["User", "Role", "Permission", "RolePermission", "StudentDocument"]
api_routes: ["/api/v1/auth/login", "/api/v1/roles", "/api/v1/users", "/api/v1/permissions"]
related_modules: ["12_RBAC_SECURITY", "16_DATABASE_API", "20_AUDITS_COMPLIANCE"]
---

# PRATHAMONE EduOS — SECURITY & PERMISSIONS AUDIT
## Evaluation of Authentication, RBAC Scoping, Sensitive Permission Governance & DPDP Act Compliance

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Date of Audit:** November 10, 2026  

---

## 1. AUTHENTICATION & SESSION LIFECYCLE

PrathamOne EduOS implements a zero-trust authentication architecture combining stateless JWT access tokens with stateful session tracking.

### Core Security Controls
* **Password Hashing:** Passwords are encrypted using `bcrypt` with salt rounds $\ge 12$. Plaintext passwords are never logged or stored.
* **Token Expiration:** Access tokens expire after 15 minutes. Refresh tokens expire after 7 days and use rotation to prevent replay attacks.
* **Session Termination:** Logout revokes the refresh token and clears client state.
* **Redirect Loop Protection:** The frontend authentication interceptor (`api/axiosInstance.ts`) suppresses redundant redirects when an unauthorized event occurs on `/login`, preventing infinite reload loops.

---

## 2. ROLE-BASED ACCESS CONTROL (RBAC) & SENSITIVE PERMISSIONS

The application defines granular roles with explicit permission boundaries:

| System Role | Intended Responsibilities | Default Access Scope |
| :--- | :--- | :--- |
| **SuperAdmin / SysAdmin** | Infrastructure, institutions, system settings | Full management; sensitive financial edits restricted |
| **Institute Admin** | Branch operations, faculty, curriculum, fees | Operational management of single institution |
| **Accountant** | Invoicing, fee collection, daybooks, reports | Financial module read/write; posted edit locked |
| **Teacher / Faculty** | Assigned batches, attendance, sessions, timetable | Academic scope restricted to assigned classes |
| **Counselor / Telecaller**| CRM leads, enquiries, follow-ups, demo classes | Prospective student pipeline only |
| **Student / Parent** | Student portal, report cards, fee receipts | Self-service read-only access for linked student |

### 2.1 Sensitive Permission Governance (`payments:edit_posted`)
* **Policy:** Modification or cancellation of posted financial transactions (`payments`, `payment_receipts`, `fee_invoices`) is high-risk.
* **Remediation Verified:** The permission `payments:edit_posted` is NEVER granted by default, not even to `sysadmin` or `admin`.
* **Enforcement:**
  - `backend/app/api/deps.py`: `check_permission("payments", "edit_posted")` requires an explicit, audited per-user permission grant.
  - Test suite `test_sysadmin_fees_permissions.py` (7/7 passed) proves that a sysadmin attempting to edit a posted voucher receives `403 Forbidden` unless granted explicit authorization.

---

## 3. MULTI-TENANT INSTITUTIONAL ISOLATION

* **Isolation Key:** All data models (`students`, `users`, `fee_invoices`, `payments`, `academic_years`, `standards`) enforce an `institution_id` foreign key.
* **Dependency Validation:** The backend dependency `get_current_tenant_id` extracts `institution_id` from the verified JWT payload.
* **Cross-Tenant Attack Defense:** An authorized user from Institution A cannot query, update, or delete records belonging to Institution B. Broken Object Level Authorization (BOLA) tests confirm strict containment.

---

## 4. DATA PRIVACY & DPDP ACT, 2023 COMPLIANCE

In accordance with India's **Digital Personal Data Protection Act, 2023 (DPDP Act)**:
1. **Aadhaar Number Masking:**
   - Aadhaar numbers stored in the database are masked in UI and printable documents (`XXXX-XXXX-1234`).
   - Plaintext 12-digit Aadhaar numbers are never displayed in client bundles.
2. **Statutory Consent Notices:**
   - Student admission forms and KYC verification sheets feature standard DPDP statutory declarations and parent consent acknowledgment checkboxes.
3. **Audit Trail Logging:**
   - Data access, exports, and document print generations are recorded in `print_audit_logs` and `student_audit_logs`.

---

## 5. SECURITY VULNERABILITY AUDIT MATRIX

| Vulnerability Vector | Protection Mechanism | Audit Finding | Status |
| :--- | :--- | :--- | :---: |
| **SQL Injection** | SQLAlchemy ORM with parameterized prepared statements | No raw dynamic SQL string interpolation | **PASS** |
| **Cross-Site Scripting (XSS)** | React JSX auto-escaping, sanitized print templates | Zero unsafe `dangerouslySetInnerHTML` | **PASS** |
| **CSRF** | SameSite cookie policy and Bearer Authorization headers | Protected against cross-origin forgery | **PASS** |
| **Privilege Escalation** | Scoped RBAC dependencies on every router | Unauthorized operations return 403 | **PASS** |
| **Rate Limiting** | SlowAPI rate limiter on `/auth/login` | Brute force login attempts throttled | **PASS** |

---

## 6. CONCLUSION

The security architecture of PrathamOne EduOS satisfies institutional standards for access control, financial fraud prevention, multi-tenancy, and statutory privacy compliance.

