---
title: "Lead Management & CRM Module — Architecture, Implementation & Verification Report"
module: "04_STUDENT_MANAGEMENT"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.1"
created_date: "2026-11-07"
updated_date: "2026-11-07"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["crm", "lead-management", "kanban", "follow-up", "admissions", "rule-010", "view-first", "dossier", "ssot"]
entities: ["Lead", "LeadFollowUp", "LeadDemoClass", "CommunicationLog", "Student", "Guardian", "StudentEnrollment", "LookupItem"]
api_routes: [
  "/api/v1/leads",
  "/api/v1/leads/metrics/summary",
  "/api/v1/leads/pipeline/kanban",
  "/api/v1/leads/{lead_id}/dossier",
  "/api/v1/leads/{lead_id}/stage",
  "/api/v1/leads/{lead_id}/follow-ups",
  "/api/v1/leads/{lead_id}/demo-classes",
  "/api/v1/leads/{lead_id}/communications",
  "/api/v1/leads/{lead_id}/convert-to-admission",
  "/api/v1/leads/seed-demo"
]
related_modules: ["03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "09_FEES_PAYMENTS", "12_RBAC_SECURITY", "15_INTEGRATIONS"]
---

# Lead Management & CRM Module — Architecture, Implementation & Verification Report

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Author:** Jawahar R. Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Date:** 2026-11-07 (Revision 1.1 — Forensic Validation & SSOT Consolidation)

---

## 1. Executive Summary

This report documents the architectural design, backend service engineering, frontend workspace implementation, forensic validation, and comprehensive test verification for the **Lead Management & CRM** system in **PrathamOne EduOS** (Coaching Institute Edition).

The solution strictly obeys:
1. **SSOT Rule 001–009:** Single Source of Truth for identity (`users.id` for counsellors/teachers, `students.id` for converted admissions).
2. **Communication SSOT Consolidation:** Complete unification of CRM communication with the canonical `communication_logs` ledger. No parallel or duplicate communication table was retained or introduced. `communication_logs` was extended with `lead_id` (migration `027_crm_ssot_consolidation`).
3. **Demo Data Protection:** Complete removal of automatic seed executions on read-only endpoints. Production and customer environments never generate artificial leads or fake KPI metrics. Demo seeding is strictly isolated behind explicit administrative authorization and query parameter `confirm=true` via `POST /api/v1/leads/seed-demo`.
4. **Lead-to-Admission Integrity:** Duplicate student and guardian detection, atomic transaction boundaries, idempotent conversion with retry safety, and preservation of lead interaction histories.
5. **Global View-First Rule 010:** Default View Mode safety lock across all CRM mutation controls (`crm:leads` scope), requiring explicit user unlocking before creating, updating, rescheduling, or converting leads.
6. **High-Fidelity Visual Design:** 100% pixel-accurate match with the PrathamOne Academy Coaching Institute operational UI specification (`media_1794046904991_e3196b15.jpg`).

---

## 2. Architecture & Data Model (Single Source of Truth)

The CRM system is architected around canonical database models located in `backend/app/models/crm.py` and `backend/app/models/communication.py`:

```mermaid
erDiagram
    INSTITUTION ||--o{ LEAD : owns
    USER ||--o{ LEAD : assigns_to
    LEAD ||--o{ LEAD_FOLLOW_UP : tracks
    LEAD ||--o{ LEAD_DEMO_CLASS : schedules
    LEAD ||--o{ COMMUNICATION_LOG : records
    LEAD ||--o| STUDENT : converts_to
    STUDENT ||--o{ GUARDIAN : links
    STUDENT ||--o{ STUDENT_ENROLLMENT : registers
```

### 2.1 Database Models
- **`Lead` (`leads` table in `backend/app/models/crm.py`):**
  - Canonical identifier: `lead_number` format `LD-XXXX` (sequential per institution).
  - Student & Guardian Contact Info: `first_name`, `last_name`, `phone`, `email`, `guardian_name`, `guardian_phone`, `guardian_relation`, `school_name`, `address`, `city`, `pincode`.
  - Academic Scope: `standard_id`, `board_id`, `academic_year_id`, `interested_course`.
  - Pipeline Attributes: `stage` (`new_enquiry`, `contacted`, `counselling_demo`, `interested`, `admission_pending`, `converted`, `lost`), `priority` (`hot`, `warm`, `cold`), `source` (`walk_in`, `website`, `referral`, `whatsapp`, `phone_enquiry`, `social_media`, `newspaper_ad`, `campaign`).
  - Ownership: `assigned_to_id` (FK to canonical `users.id`).
  - Conversion Linkage: `converted_student_id` (FK to canonical `students.id`), `converted_at`, `converted_by_id`.
  - Computed property: `full_name` returning `f"{first_name} {last_name}".strip()`.
  - Async SQLAlchemy Resilience: All relationships configured with `lazy="selectin"` to eliminate `MissingGreenlet` exceptions during async serialization.

- **`LeadFollowUp` (`lead_follow_ups` table in `backend/app/models/crm.py`):**
  - Tracks all interaction attempts (`call`, `whatsapp`, `email`, `meeting`, `visit`).
  - Status lifecycle (`completed`, `scheduled`, `cancelled`, `missed`), scheduled datetime, outcome, and counsellor notes.

- **`LeadDemoClass` (`lead_demo_classes` table in `backend/app/models/crm.py`):**
  - Schedules trial/demo sessions with faculty (`subject_id`, `teacher_id`, `scheduled_at`, `status`, `feedback`, `rating`).

- **`CommunicationLog` (`communication_logs` table in `backend/app/models/communication.py`):**
  - Canonical software-wide communication ledger.
  - Extended with `lead_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)`.
  - Supports `recipient_type="LEAD"` with direct relationship to `Lead`.

- **Canonical Lookups (`lookup_items` table):**
  - Reused for lead sources (`lead_source`), lost reasons (`lost_reason`), and lead stages (`lead_stage`).

---

## 3. Forensic Audit & SSOT Corrections Applied

| Area | Pre-Audit Risk / Finding | Forensic Resolution & SSOT Correction | Status |
| :--- | :--- | :--- | :--- |
| **Communication SSOT** | Risk of parallel communication storage | Unified with canonical `communication_logs` table via migration `027_crm_ssot_consolidation`. Added `lead_id` FK. Endpoint `POST /api/v1/leads/{id}/communications` writes directly to canonical ledger. | **Consolidated (SSOT)** |
| **Demo Data Seeding** | `seed_initial_leads_if_empty` was triggered automatically on GET requests | Removed all automatic seeding from GET endpoints. Created explicit opt-in endpoint `POST /api/v1/leads/seed-demo?confirm=true` requiring admin privileges. Real 0 counts returned when empty. | **Protected & Isolated** |
| **Dynamic Real KPIs** | Hardcoded `+12%` and `+5.2%` fallback strings in metrics summary | Implemented dynamic 30-day delta calculation comparing current 30 days vs prior 30 days directly from database `Lead.created_at`. Zero fallback when empty. | **100% Real DB Data** |
| **Admission Idempotency** | Re-submitting conversion payload raised HTTP 400 error | Implemented idempotent conversion return: safe retries return HTTP 200 with `already_converted=True`, returning existing student ID and admission number. | **Idempotent & Safe** |
| **Duplicate Student Prevention** | Converted leads could accidentally create duplicate students | Added duplicate contact detection (phone/email match) raising HTTP 409 Conflict with matching student details, requiring `confirm_duplicate=True` or `existing_student_id`. | **Protected Against Duplication** |
| **Lookup Item Standards** | Hardcoded stage values in UI | Seeded canonical `lead_stage` category into `lookup_items` with standard stage definitions. | **Canonical Lookups** |

---

## 4. Backend REST APIs (`/api/v1/leads`)

Implemented in `backend/app/api/v1/endpoints/leads.py`:

1. **`GET /api/v1/leads/metrics/summary`:**
   - Computes 7 top KPI metrics from live database records: Total Leads, New Enquiries, Follow-ups Today, Overdue Follow-ups, Converted Count & Rate, Lost Leads, and dynamic 30-day trends.
2. **`GET /api/v1/leads/pipeline/kanban`:**
   - Groups active leads into 6 visual pipeline columns (`new_enquiry`, `contacted`, `counselling_demo`, `interested`, `admission_pending`, `converted`).
3. **`GET /api/v1/leads`:**
   - Paginated list view with multi-faceted search (name, mobile, course, source), stage filtering, priority filtering, and counsellor scoping.
4. **`POST /api/v1/leads`:**
   - Atomic lead creation with sequential `LD-XXXX` numbering and initial follow-up scheduling.
5. **`GET /api/v1/leads/{lead_id}/dossier`:**
   - Unified 360° lead dossier aggregation including student/parent details, enquiry history, follow-up trail, demo classes, communication logs from `communication_logs`, and duplicate student detection.
6. **`PATCH /api/v1/leads/{lead_id}/stage`:**
   - Safe stage progression and priority adjustment with activity audit logging.
7. **`POST /api/v1/leads/{lead_id}/follow-ups`:**
   - Schedules or completes interaction logs and updates lead's `next_follow_up_at`.
8. **`POST /api/v1/leads/{lead_id}/demo-classes`:**
   - Schedules trial sessions with academic faculty.
9. **`POST /api/v1/leads/{lead_id}/communications`:**
   - Dispatches and logs communication directly into canonical `communication_logs` table with `lead_id`, creating a mirrored timeline follow-up.
10. **`POST /api/v1/leads/{lead_id}/convert-to-admission` (alias `/{lead_id}/convert`):**
    - Idempotent and duplicate-safe transactional conversion into canonical `Student`, `Guardian`, and `StudentEnrollment` records.
    - Generates sequential academic admission number (`PA-YYYY-XXXXXX`).
    - Marks lead as `converted` with linked `converted_student_id`.
11. **`POST /api/v1/leads/seed-demo`:**
    - Explicit, opt-in administrative endpoint to seed sample leads (requires `confirm=true`).

---

## 5. Verification & Automated Test Results

### 5.1 Backend Integration Test Suite (`tests/test_lead_management_crm.py`)
Executed inside backend container: `pytest tests/test_lead_management_crm.py -v`:
- `test_crm_metrics_summary`: **PASSED** (Real database metric aggregation)
- `test_create_lead_and_sequential_numbering`: **PASSED** (Atomic `LD-XXXX` sequential increment)
- `test_get_leads_and_kanban`: **PASSED** (Kanban columns & filtering)
- `test_lead_dossier_detail`: **PASSED** (Full dossier aggregation)
- `test_update_stage_and_follow_up`: **PASSED** (Stage transition & follow-up scheduling)
- `test_schedule_demo_class`: **PASSED** (Faculty demo booking)
- `test_lead_to_admission_conversion`: **PASSED** (Canonical student creation, idempotency retry safety, and duplicate contact detection)
- `test_crm_security_and_permissions`: **PASSED** (Multi-tenant isolation & RBAC authorization)
- `test_lead_canonical_communication_logging`: **PASSED** (Verification of canonical `communication_logs` integration)
- `test_demo_data_protection_and_opt_in`: **PASSED** (Enforcement of demo isolation and explicit confirmation)
- **Result: 10/10 tests passed in 16.17s (100% Pass Rate).**

### 5.2 Frontend Unit Test Suite (`src/test/LeadManagementCRM.test.tsx` & `src/test/Sidebar.test.tsx`)
Executed via Vitest:
- `Sidebar.test.tsx`: **13/13 tests passed**.
- `LeadManagementCRM.test.tsx`: **5/5 tests passed**.
- Rule 010 View-First lock & unlock behavior: **Verified**.

### 5.3 Rule 010 Global Governance Audit (`scripts/check_view_first_governance.py`)
- Total Pages Checked: 36
- Passed: 36
- Failed: 0
- **Status: 100% Rule 010 View-First Governance Compliance Verified.**

### 5.4 Corporate Header Compliance (`scripts/manage_headers.py check`)
- Total Source Files Checked: 350
- Passed: 350
- Failed: 0
- **Status: 100% Compliance Verified.**

### 5.5 Production Build & Container Deployment
- `npm run build --prefix frontend`: Compiled cleanly with TypeScript in 13.08s.
- Deployed to `prashant_academy_frontend` container via Nginx reload.
- Deployed backend service with database migration `027_crm_ssot_consolidation (head)` verified at `/health` (HTTP 200).

---

## 6. Sign-off

The Lead Management & CRM module meets all SSOT principles, eliminates duplicate table proliferation, protects production customer environments from unwanted mock data, ensures atomic duplicate-safe admission conversion, and satisfies 100% of product governance directives.

**Status:** Complete, Consolidated & Approved for Production.
