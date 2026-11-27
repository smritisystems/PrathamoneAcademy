---
title: "Institution Profile Setup, Multi-Branch Reuse & First-Launch Onboarding Architecture Audit"
module: "13_SYSADMIN_SETTINGS"
category: "ARCHITECTURE-AUDIT"
document_type: "AUDIT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-27"
updated_date: "2026-11-27"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["institution-profile", "onboarding", "multi-branch", "ssot", "upgrade-safety", "branding", "audit"]
entities: ["Institution", "InstitutionSetting", "SettingAuditLog", "Expense", "FinancialBudget"]
api_routes: ["/api/v1/institutions/", "/api/v1/institutions/public/branding", "/api/v1/settings/profile", "/api/v1/license/activate"]
related_modules: ["01_ARCHITECTURE", "02_INSTALLATION_DEPLOYMENT", "09_FEES_PAYMENTS", "12_RBAC_SECURITY", "25_BUSINESS_REQUIREMENTS"]
---

# PrathamOne EduOS — Institution Profile Setup & Installation Personalization Architecture Audit

> [!IMPORTANT]
> **Governance Mode:** Inspection, audit, and architectural recommendation only. No application code or database schema changes are executed until compatibility with existing SSOT entities and upgrade safety rules is confirmed.

---

## 1. Executive Summary & Compatibility Verdict

PrathamOne EduOS already possesses an authoritative tenant table (`institutions`), an extensible per-institution key-value configuration table (`institution_settings`), and a field-level audit trail (`setting_audit_logs`), alongside a View-First Settings workspace ([Settings.tsx](file:///f:/PrashantAcademy/frontend/src/pages/Settings.tsx)). However, the current institution profile pipeline has **three structural gaps** that prevent clean, multi-tenant, self-service onboarding:

1. **Dummy-Data Persistence & Read-Path Fallback Leakage:** Placeholder strings (`"Your Academy Name"`, `"PrathamOne Academy"`, `"+91 8779 123 007"`, `"MH-COACH-2018-0157"`, `"AABCP1234K"`, `"27AABCP1234K1Z5"`, `"Vasai Road (W), Palghar - 401202"`, `"Prashant Academy"`) are injected into database seeds, API read fallbacks (`GET /api/v1/settings/profile`), Inno Setup form defaults (`ConfigPage`), and client-side print/receipt/message templates.
2. **Split Profile Responsibility Between Installer & App:** Inno Setup ([prathamone_setup.iss](file:///f:/PrashantAcademy/installer/prathamone_setup.iss#L714-L728)) currently collects only 4 fields (`ConfigPage`) plus an optional logo (`LogoPage`), whereas full legal, contact, multi-branch, and regional address attributes belong inside a **first-launch application wizard** after database initialization and license verification.
3. **Flat Branch Modeling:** Finance and budgeting models (`Expense`, `CashRegisterSession`, `FinancialBudget` in [finance.py](file:///f:/PrashantAcademy/backend/app/models/finance.py#L67)) already carry `branch_id` (default `1`), while the Branches sub-tab in [Settings.tsx](file:///f:/PrashantAcademy/frontend/src/pages/Settings.tsx#L1272-L1293) renders a static single-card placeholder (`{profile.name} - Main Campus`), and `GET /api/v1/institutions/public/branding` synthesizes `branch_name` from `inst.city or "Main Campus"`.

**Recommendation:** **Extend existing SSOT entities (`institutions`, `institution_settings`, `setting_audit_logs`)** with additive, nullable schema columns plus one child `branches` relationship table mapped cleanly to `branch_id`, eliminate all persisted/API-fallback dummy strings, and launch a dedicated first-run **Institution Profile Setup & Upgrade Completion** workflow inside the application shell ([Layout.tsx](file:///f:/PrashantAcademy/frontend/src/components/Layout.tsx)).

---

## 2. Deliverable 1: Existing Institution Profile Architecture Audit

### 2.1 Database Models Inspected

| Table | Source | Classification | Current Schema Coverage | Identified Gaps |
| :--- | :--- | :--- | :--- | :--- |
| `institutions` | [institution.py](file:///f:/PrashantAcademy/backend/app/models/institution.py#L22-L86) | **Master** | `id`, `name`, `code`, `address`, `city`, `state`, `pincode`, `phone`, `email`, `website`, `logo_url`, `short_name`, `tagline`, `institute_type`, `establishment_year`, `registration_number`, `tax_id`, `description`, `primary_color`, `secondary_color`, `accent_color`, `favicon_url`, `timezone`, `default_language`, `is_active` | Model column defaults hardcode `"PA"`, `"Learn • Practice • Achieve"`, `"MH-COACH-2018-0157"`, `"AABCP1234K"`. Missing `address_line_2`, `area_locality`, `district`, `country`, `alternate_phone`, `gstin`, `pan`, `onboarding_completed_at`. |
| `institution_settings` | [settings.py](file:///f:/PrashantAcademy/backend/app/models/settings.py#L25-L49) | **Configuration** | `(institution_id, key)` unique key-value store across categories (`profile`, `branding`, `academic`, etc.) | `DEFAULT_SETTINGS["profile"]` leaks `"PrathamOne Academy"`, `"+91 8779 123 007"`, `"Vasai Road (W), Palghar - 401202"`. |
| `setting_audit_logs` | [settings.py](file:///f:/PrashantAcademy/backend/app/models/settings.py#L75-L103) | **Audit Ledger** | Records `institution_id`, `setting_key`, `category`, `previous_value`, `new_value`, `changed_by_id`, `changed_by_name`, `reason`, `created_at` | `PUT /api/v1/settings/profile` writes audit logs, but `PUT /api/v1/institutions/{id}` updates `Institution` directly **without audit logging**. |

### 2.2 API Surface & Dummy-Fallback Leaks

1. **`GET /api/v1/settings/profile`** ([settings.py](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/settings.py#L277-L319)): Returns `inst.<field> or "<dummy>"` — even when `phone`, `address`, `email`, `registration_number`, or `tax_id` are `None` in PostgreSQL, the API fabricates `"+91 8779 123 007"`, `"Vasai Road (W), Palghar - 401202"`, `"MH-COACH-2018-0157"`, `"AABCP1234K"`, and `"info@prathamoneacademy.in"`.
2. **`GET /api/v1/institutions/public/branding`** ([institutions.py](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/institutions.py#L140-L215)): Defaults `target_id = institution_id or 1`, derives `branch_name` from `inst.city or "Main Campus"`, and falls back to monogram `"YA"` when `inst.name == "Your Academy Name"`.
3. **`POST /api/v1/license/activate` frontend modal** ([InitialLaunchActivationModal.tsx](file:///f:/PrashantAcademy/frontend/src/components/InitialLaunchActivationModal.tsx#L71-L82)): Submits fallback license registration `institution_name: 'Coaching Institute'`, `phone: '8779123007'` when institution profile fields are absent.
4. **Bootstrap & Seeders**:
   - `backend/alembic/versions/001_initial_schema.py#L446` seeds `'Prashant Academy'`, `'PA001'`, `'123 Education Lane, School District'`, `'info@prathamone.com'`.
   - `backend/seed.py` seeds `"Your Academy Name"`, `"Main Campus"`, `"Campus Address, Education Hub"`, `"+91 8779 123 007"`, `"admin@academy.edu"`.
   - `installer/prathamone_setup.iss#L725-L727` pre-fills `'Your Academy Name'`, `'Main Campus'`, `'123 Education Hub, MG Road'`.
   - `frontend/src/pages/Settings.tsx#L1337` renders hardcoded `readOnly` GSTIN `"27AABCP1234K1Z5"`.

### 2.3 Hardcoded Customer Identity Leaks (`Prashant Academy` / `+91 8779 123 007`)

A repository scan outside test fixtures and file headers found `138` non-test occurrences, including active production paths:

| Area | File & Line | Hardcoded Leak | Remediation Target |
| :--- | :--- | :--- | :--- |
| Branding Resolver | [branding.ts](file:///f:/PrashantAcademy/frontend/src/config/branding.ts#L118) | `defaultAcademyName: 'Prashant Academy'`, `clientOrganization`, `salesSupport` | Read dynamic active institution record; product fallback `'PrathamOne EduOS'` only |
| Fee & Payment Receipts | [PaymentReceiptView.tsx](file:///f:/PrashantAcademy/frontend/src/components/PaymentReceiptView.tsx#L206), [Fees.tsx](file:///f:/PrashantAcademy/frontend/src/pages/Fees.tsx#L2919) | Falls back to `'PRASHANT ACADEMY'` / `headerTitle: 'Prashant Academy Coaching Institute'` | Bind strictly to active institution + branch record |
| Fee Reminder Templates | [StudentMonthlyFeePivot.tsx](file:///f:/PrashantAcademy/frontend/src/components/fees/StudentMonthlyFeePivot.tsx#L382-L409), [Fees.tsx](file:///f:/PrashantAcademy/frontend/src/pages/Fees.tsx#L258) | Embeds `Prashant Academy` directly in WhatsApp/SMS copy | Interpolate `{institution.name}` dynamically |
| Bonafide / Forms / Dossier | [FormTemplateEngine.tsx](file:///f:/PrashantAcademy/frontend/src/components/forms/FormTemplateEngine.tsx#L591-L674), [EmployeeDossierDocument.tsx](file:///f:/PrashantAcademy/frontend/src/components/workforce/EmployeeDossierDocument.tsx#L58) | Literal `<strong>Prashant Academy Coaching Institute</strong>` | Interpolate `{institution.name}` / `{branch.name}` |
| Timetable Docket | [AcademicWorkspace.tsx](file:///f:/PrashantAcademy/frontend/src/pages/AcademicWorkspace.tsx#L1571-L1657), [printTimetableDocket.ts](file:///f:/PrashantAcademy/frontend/src/utils/printTimetableDocket.ts#L516) | Default print title `'Official Academic Timetable Docket — Prashant Academy'` | Dynamic institution header |
| Concessions & Leads | [concessions.py](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/concessions.py#L1261-L1275), [leads.py](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/leads.py#L378) | Sponsor fallback `"Prashant Academy Educational Trust"`, lead auto-create `'Prashant Academy'` | Dynamic institution / omit sponsor if unset |
| Student / Staff Portals | [StudentDashboard.tsx](file:///f:/PrashantAcademy/frontend/src/pages/StudentDashboard.tsx#L1825-L2636), [StudentDetail.tsx](file:///f:/PrashantAcademy/frontend/src/pages/StudentDetail.tsx#L2465), [Dashboard.tsx](file:///f:/PrashantAcademy/frontend/src/pages/Dashboard.tsx#L3200), [SysAdminWorkspace.tsx](file:///f:/PrashantAcademy/frontend/src/pages/SysAdminWorkspace.tsx#L122) | Hardcoded customer labels & share messages | Dynamic institution store + neutral `INSTITUTE_PLACEHOLDERS` |

> [!WARNING]
> Demo/sandbox seeders ([training_dataset_service.py](file:///f:/PrashantAcademy/backend/app/services/training_dataset_service.py), `leads.py`, `Attendance.tsx` mock widget) must only run in `TRAINING` sandbox mode using synthetic 99999/00000 test ranges — never `+91 8779 123 007` or customer trademarks.

---

## 3. Deliverable 2: Database Reuse Assessment (SSOT Compliant)

In compliance with **RULE 001–005** and **RULE 011**, no duplicate `institute_profiles`, `companies`, or `organizations` table will be created.

### 3.1 Minimal Additive Extension to `institutions` (Master)

Retain `institutions` as the single tenant identity master and add missing optional structured profile attributes via one forward Alembic migration (`Nullable=True` on all non-mandatory fields, **no dummy server/column defaults**):

- **Identity & Lifecycle:** Keep `name` (mandatory), `short_name` (`NULL` default; UI computes monogram fallback dynamically without writing `'PA'`), `institute_type` (`NULL` unless selected), `logo_url`, `onboarding_completed` (`Boolean`, default `False` for brand-new unconfigured tenants; backfill `True` during migration ONLY for existing institutions that already have a real non-placeholder `name` AND at least one valid contact/address field).
- **Structured Address:** Keep `address` (mapped as **Address Line 1** for backward compatibility across existing queries/prints) and add:
  - `address_line_2` (`String(255)`, nullable)
  - `area_locality` (`String(150)`, nullable)
  - `district` (`String(100)`, nullable)
  - `country` (`String(100)`, nullable, default `'India'` on new creation UI while nullable in DB)
  - Existing: `city`, `state`, `pincode` (drop hardcoded defaults `'Palghar'`, `'Maharashtra'`, `'401202'`)
- **Contact & Legal:**
  - `alternate_phone` (`String(30)`, nullable)
  - `gstin` (`String(20)`, nullable — migrate/stop aliasing dummy `AABCP1234K`; keep `tax_id` as `PAN` or sync cleanly via validated `pan` column/alias to preserve backward reads)

### 3.2 Normalized Child Table: `institution_branches` (Master / Relationship)

Because `students.institution_id`, `users.institution_id`, and `institution_settings.institution_id` key the entire institution tenant, creating extra `institutions` rows for branches would fracture authentication, licensing, and academic catalogs. Instead, create a single normalized `institution_branches` table linked via `institution_id -> institutions.id` (`ON DELETE CASCADE`) and align existing `branch_id` columns (`expenses.branch_id`, `cash_register_sessions.branch_id`, `financial_budgets.branch_id`, optional nullable `users.default_branch_id`, `students.branch_id`, `receipts.branch_id`):

- Columns: `id`, `institution_id`, `branch_name` (mandatory per branch), `branch_code` (unique per `institution_id`, e.g. `MAIN`), `is_main_branch` (`Boolean`, unique partial index ensuring max 1 main branch per institution), `address_line_1`, `address_line_2`, `area_locality`, `city`, `district`, `state`, `pincode`, `country`, `phone`, `alternate_phone`, `email`, `gstin` (optional branch-level GSTIN override), `is_active`, `created_at`, `updated_at`.
- **Upgrade Backfill:** The Alembic migration creates a single `Main Branch` (`is_main_branch=True`) record for each existing `Institution` copying its current non-dummy address/contact fields.

---

## 4. Deliverable 3: Installation vs First-Launch Onboarding Workflow

### 4.1 Architectural Separation of Concerns

| Stage | Responsibility | Tool / Component | Policy |
| :--- | :--- | :--- | :--- |
| **Step 1–4: Installer & DB Init** | Extract binaries, verify/preserve `{localappdata}\PrathamOneEduOS\data` & `.env`, run pre-upgrade `pg_dump` (Rule 013), initialize empty PostgreSQL 16 cluster on fresh install, run `alembic upgrade head` | Inno Setup (`prathamone_setup.iss`) + `windows_bootstrap.py` | **Remove** `ConfigPage` and `LogoPage` institutional forms (or reduce to purely optional headless config), never write `'Your Academy Name'` or `'123 Education Hub'` to DB. |
| **Step 5: License & Authority** | Verify existing signed license, start 30-day unique-machine trial, or activate license on verified hardware ID (`PRATHAM-*`) | `InitialLaunchActivationModal` / `LicenseActivationPanel` | License verification runs cleanly against neutral `institution_id=1`; license `registration` attaches the real configured Institution Profile once saved. |
| **Step 6–10: First-Launch Profile Wizard** | Detect unconfigured/uncompleted institution profile (`onboarding_completed == False` or placeholder name) and launch guided **Institution Profile Setup Wizard** inside the React app | New reusable `InstitutionOnboardingWizard` mounted in `Layout.tsx` + shared form sub-components with `Settings.tsx` | Mandatory **Institute Name** + optional structured Address, Branch, Contact, Logo upload, GSTIN/PAN. **Optional fields never block completion.** Immediately persists via `PUT /api/v1/settings/profile` (with View-First Audit Trail) and verifies reload persistence before dismissing. |

### 4.2 Why First-Launch Wizard Beats Installer UI

1. **Cleaner Inno Setup UX:** Eliminates cluttered 4-line Inno input boxes (`123 Education Hub, MG Road`), image file pickers running under elevated Admin (`PrivilegesRequired=admin` user profile isolation), and validation edge cases inside Pascal Script.
2. **Real Validation & Safe Logo Upload:** Uses unified Pydantic + React validation, SVG/image sanitization, and authenticated multi-tenant persistence (`SettingAuditLog` attribution with the actual admin `User.id`).
3. **Host + Desktop Parity:** Works identically for Hosted Cloud tenants and Windows Desktop installers from a single React + FastAPI codebase (Rule 017).

---

## 5. Deliverable 4: Upgrade Preservation & Profile Completion Policy

For any **existing installation upgrade** (Inno Setup upgrade mode or Docker image upgrade):

1. `IsUpgradeMode` preserves `data\`, `.env`, uploaded logos, certificates, and custom themes untouched.
2. Alembic migration upgrades schema cleanly (`ALTER TABLE institutions ADD COLUMN ...`, `CREATE TABLE institution_branches ...`) and seeds `Main Branch` from existing real DB values — **never injecting dummy placeholders**.
3. If an existing institution already has a real custom name (`NOT IN ('Prashant Academy' placeholder match, 'Your Academy Name', 'PrathamOne Academy', '')` OR valid setup history), `onboarding_completed` marks `True` automatically so the wizard **never interrupts upgraded production users**.
4. If optional profile fields (e.g., `district`, `country`, `gstin`, `alternate_phone`, `address_line_2`) are empty after upgrade, Settings displays a dismissible **"Complete Institution Profile"** progress indicator without overwriting or modifying existing records.

---

## 6. Deliverable 5: Multi-Branch Architecture Compatibility

- **Master Rule:** One coaching business = one `institutions` row; branches = rows in `institution_branches` scoped to `institution_id`.
- **Main Branch Governance:** Exactly one branch carries `is_main_branch = True`. Attempting to create a branch with a case-insensitive duplicate `branch_name` or `branch_code` under the same `institution_id` returns `409 Conflict`.
- **Downstream Document Binding:**
  - `students`, `payment_receipts` / `invoices`, `expenses`, `budgets` resolve `branch_id` (defaulting to the institution's `is_main_branch` if unassigned).
  - Historical receipts/invoices continue to snapshot the issued `institution_name`, `branch_name`, `branch_address`, `branch_phone`, and `gstin` at payment/issue time (Rule 011 immutability), never altering historical PDFs if a branch later moves or renames.
- **Settings UI:** Upgrade `Settings.tsx -> Campus Centers & Branches` from its static card into a full View-First CRUD panel reusing `EditModeBar` and `Modal`.

---

## 7. Deliverable 6: Global Integration Targets

After Institution Profile persistence, a single centralized `useInstitutionBranding` / `institutions/public/branding` + `institutions/{id}/branches` SSOT selector must drive:
1. App header, sidebar tenant switcher, and page `<title>`.
2. Login screen left/right tenant card (`Login.tsx` — when an institution is onboarded; neutral `PrathamOne EduOS` onboarding state before configuration).
3. Dashboard headers, Student/Parent Portal footers, and Help/About.
4. Fee Invoices, Payment Receipts ([PaymentReceiptView.tsx](file:///f:/PrashantAcademy/frontend/src/components/PaymentReceiptView.tsx), [receipt_pdf_service.py](file:///f:/PrashantAcademy/backend/app/services/receipt_pdf_service.py)), and WhatsApp/SMS reminder templates ([StudentMonthlyFeePivot.tsx](file:///f:/PrashantAcademy/frontend/src/components/fees/StudentMonthlyFeePivot.tsx), [Fees.tsx](file:///f:/PrashantAcademy/frontend/src/pages/Fees.tsx)).
5. Student ID Cards ([printIDCard.ts](file:///f:/PrashantAcademy/frontend/src/utils/printIDCard.ts)), Certificates & Bonafide Forms ([FormTemplateEngine.tsx](file:///f:/PrashantAcademy/frontend/src/components/forms/FormTemplateEngine.tsx)), Timetable Dockets, Employee Dossiers, PDF/Excel Reports (`data_exporter.py`), and Email templates.

---

## 8. Deliverable 7: Permissions, Ownership & Audit Governance

| Capability | Permitted Roles | Enforced Mechanism |
| :--- | :--- | :--- |
| View institution & branch profile | All authenticated institution users (non-sensitive branding also on `/public/branding`) | Institution-scoped read via `check_institution_access`; public branding excludes PAN/GSTIN if unauthenticated |
| Edit institution profile / legal (GSTIN/PAN) / contact details | `admin`, `principal`, `superadmin` / `sysadmin` | Requires active `EditModeBar` scope (`sysadmin:settings`) + RBAC `require_role(...)` + backend per-field `SettingAuditLog` entry |
| Upload / change logo & brand colors | `admin`, `principal`, `superadmin` | MIME + magic-byte + size validation + SVG script sanitization before saving |
| Manage branches (create/update/set main) | `admin`, `principal`, `superadmin` | Audit-logged to `SettingAuditLog`; main branch cannot be deactivated/deleted without reassignment |
| Modify license binding / company identity binding | Read-only from profile UI (`license_binding` protected) | Changing profile display name does not tamper with signed license artifacts; hardware/license edits remain gated inside Licensing panel |

> [!CAUTION]
> Unify `PUT /api/v1/institutions/{id}` and `PUT /api/v1/settings/profile` audit behavior so **every** institution and branch profile mutation writes `{actor_id, actor_name, setting_key, previous_value, new_value, timestamp, reason}` into `SettingAuditLog`.

---

## 9. Deliverable 8: Field Validation & Neutral Placeholder Policy

### 9.1 Neutral UI Placeholders (Never Saved to DB)

- Institute Name: `"Your Coaching Institute"`
- Branch Name: `"Main Branch"`
- Address Line 1: `"Enter your institute address"`
- Mobile Number: `"+91 XXXXX XXXXX"`
- Email Address: `"Enter your email address"`

> **Strict Prohibition:** Never auto-persist placeholders or `+91 8779 123 007` into database columns, API fallbacks, or license registration payloads. Optional empty fields persist as `NULL` / `None`.

### 9.2 Validation Rules Matrix

| Field | Required? | Backend (Pydantic) & Frontend Rules |
| :--- | :--- | :--- |
| `name` (Institute Name) | **Mandatory** | Non-empty trimmed `2..200` chars; reject known dummy tokens (`"Your Academy Name"`, `"Coaching Institute"` only if explicitly submitted without user input during onboarding) |
| `branch_name` | Conditional (per branch) | Trimmed `2..150` chars; case-insensitive uniqueness per `institution_id` |
| `pincode` | Optional | When provided and country is India: strict `^[1-9][0-9]{5}$` (6 digits, cannot start with `0`) |
| `phone` / `alternate_phone` | Optional | Strip spaces/hyphens; for India (`+91` or 10 digits) validate `^(?:\+91[\-\s]?)?[6-9]\d{9}$` (or E.164 `^\+[1-9]\d{7,14}$` for non-India) |
| `email` | Optional | Standard RFC/EmailStr format |
| `website` | Optional | Valid `http://` or `https://` URL |
| `country` / `state` | Optional | If `country == "India"`, validate/select from canonical Indian States & UTs list; free-text allowed for non-India |
| `gstin` / `pan` | Optional | GSTIN: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`; PAN: `^[A-Z]{5}[0-9]{4}[A-Z]{1}$` |
| `logo_url` upload | Optional | Whitelisted MIME + file magic-byte verification (PNG, JPEG, WEBP, sanitized SVG with zero `<script>`/`on*` handlers), max `2 MB` |

---

## 10. Deliverable 9 & 10: Proposed Implementation Rollout & Test Plan (Pending Approval)

Once approved, implementation will proceed in four clean, backward-compatible phases:

1. **Phase A — Schema & Migration (SSOT):** Alembic revision extending `institutions`, creating `institution_branches`, adding `branch_id` indexes/FKs where needed, backfilling `Main Branch`, and cleaning model defaults (`institution.py`).
2. **Phase B — Backend APIs, Validation & Audit Unification:** Clean `GET /settings/profile` (zero dummy fallbacks), unified Pydantic validators, `branches` CRUD endpoints (`/api/v1/institutions/{id}/branches`), `SettingAuditLog` coverage across all institution/branch mutations, and hardened logo upload sanitization.
3. **Phase C — First-Launch Onboarding Wizard, Settings & Global Template Binding:** Reusable `InstitutionProfileForm` shared by Settings and `InstitutionOnboardingWizard`; full `Branches` management tab; replace all production hardcoded `'Prashant Academy'` / `'+91 8779 123 007'` strings across receipts, forms, reminders, dossiers, and dockets; simplify Inno Setup wizard (`prathamone_setup.iss`).
4. **Phase D — Verification Suite:**
   - Fresh DB bootstrap (`seed(bootstrap_only=True)`) asserts zero dummy phone/address/tax IDs stored and `onboarding_completed == False`.
   - Upgrade simulation test asserts existing customer institution profile, logo, and branches remain 100% untouched.
   - Multi-branch CRUD, duplicate check, GSTIN/PAN/PIN/mobile validation, SVG XSS sanitization, RBAC/audit log tests (`pytest`), `vitest`, `manage_headers.py check`, `verify_market_readiness.py --target hosted`, and `--target desktop`.

---

## 11. Implementation Summary (Revision `060_institution_profile_and_branches`)

Implemented across database, backend, frontend, and installer governance:

- **Database & Migration:** Extended [`Institution`](file:///f:/PrashantAcademy/backend/app/models/institution.py) with structured address, legal (`gstin`, `pan`), alternate phone, and `onboarding_completed` tracking; added normalized [`InstitutionBranch`](file:///f:/PrashantAcademy/backend/app/models/institution.py) (`institution_branches` table) via [`060_institution_profile_and_branches.py`](file:///f:/PrashantAcademy/backend/alembic/versions/060_institution_profile_and_branches.py) with non-destructive upgrade preservation and automatic `Main Branch` backfill.
- **Backend SSOT Service & APIs:** Created [`institution_profile_service.py`](file:///f:/PrashantAcademy/backend/app/services/institution_profile_service.py); removed hardcoded API fallbacks from [`settings.py`](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/settings.py), [`institutions.py`](file:///f:/PrashantAcademy/backend/app/api/v1/endpoints/institutions.py), [`seed.py`](file:///f:/PrashantAcademy/backend/seed.py), [`receipt_pdf_service.py`](file:///f:/PrashantAcademy/backend/app/services/receipt_pdf_service.py), [`form_renderer.py`](file:///f:/PrashantAcademy/backend/app/services/form_renderer.py), `concessions.py`, and `leads.py`; unified `SettingAuditLog` writes across profile and multi-branch mutations (`/institutions/{id}/branches`).
- **Frontend Onboarding, Settings & Global Templates:** Added [`institutionValidation.ts`](file:///f:/PrashantAcademy/frontend/src/utils/institutionValidation.ts), [`InstitutionOnboardingWizard.tsx`](file:///f:/PrashantAcademy/frontend/src/components/InstitutionOnboardingWizard.tsx) wired cleanly in [`Layout.tsx`](file:///f:/PrashantAcademy/frontend/src/components/Layout.tsx), full structured Address/Contact, Legal (editable GSTIN/PAN), Upgrade Profile Completion Banner, and Multi-Branch CRUD in [`Settings.tsx`](file:///f:/PrashantAcademy/frontend/src/pages/Settings.tsx), and replaced hardcoded customer identity fallbacks across shared templates and Inno Setup (`ConfigPage`).
