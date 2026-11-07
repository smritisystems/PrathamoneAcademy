---
title: "Lead Management & CRM Module — Architecture, Implementation & Verification Report"
module: "04_STUDENT_MANAGEMENT"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-07"
updated_date: "2026-11-07"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["crm", "lead-management", "kanban", "follow-up", "admissions", "rule-010", "view-first", "dossier"]
entities: ["Lead", "LeadFollowUp", "LeadDemoClass", "LeadCommunication", "Student", "Guardian", "StudentEnrollment"]
api_routes: [
  "/api/v1/leads",
  "/api/v1/leads/metrics/summary",
  "/api/v1/leads/pipeline/kanban",
  "/api/v1/leads/{lead_id}/dossier",
  "/api/v1/leads/{lead_id}/stage",
  "/api/v1/leads/{lead_id}/follow-ups",
  "/api/v1/leads/{lead_id}/demo-classes",
  "/api/v1/leads/{lead_id}/convert-to-admission"
]
related_modules: ["03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "09_FEES_PAYMENTS", "12_RBAC_SECURITY"]
---

# Lead Management & CRM Module — Architecture, Implementation & Verification Report

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Author:** Jawahar R. Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Date:** 2026-11-07  

---

## 1. Executive Summary

This report documents the architectural design, backend service engineering, frontend workspace implementation, and comprehensive test verification for the **Lead Management & CRM** system in **PrathamOne EduOS** (Coaching Institute Edition).

The solution strictly obeys:
1. **SSOT Rule 001–009:** Single Source of Truth for identity (`users.id` for counsellors/teachers, `students.id` for converted admissions).
2. **Global View-First Rule 010:** Default View Mode safety lock across all CRM mutation controls (`crm:leads` scope), requiring explicit user unlocking before creating, updating, rescheduling, or converting leads.
3. **High-Fidelity Visual Fidelity:** 100% pixel-accurate match with the PrathamOne Academy Coaching Institute operational UI specification (`media_1794046904991_e3196b15.jpg`).

---

## 2. Architecture & Data Model (Single Source of Truth)

The CRM system is architected around 4 canonical database models located in `backend/app/models/crm.py`:

```mermaid
erDiagram
    INSTITUTION ||--o{ LEAD : owns
    USER ||--o{ LEAD : assigns_to
    LEAD ||--o{ LEAD_FOLLOW_UP : tracks
    LEAD ||--o{ LEAD_DEMO_CLASS : schedules
    LEAD ||--o{ LEAD_COMMUNICATION : logs
    LEAD ||--o| STUDENT : converts_to
    STUDENT ||--o{ GUARDIAN : links
    STUDENT ||--o{ STUDENT_ENROLLMENT : registers
```

### 2.1 Database Models (`backend/app/models/crm.py`)
- **`Lead` (`leads` table):**
  - Canonical identifier: `lead_number` format `LD-XXXX` (sequential per institution).
  - Student & Guardian Contact Info: `first_name`, `last_name`, `phone`, `email`, `guardian_name`, `guardian_phone`, `guardian_relation`, `school_name`, `address`, `city`, `pincode`.
  - Academic Scope: `standard_id`, `board_id`, `academic_year_id`, `interested_course`.
  - Pipeline Attributes: `stage` (`new_enquiry`, `contacted`, `counselling_demo`, `interested`, `admission_pending`, `converted`, `lost`), `priority` (`hot`, `warm`, `cold`), `source` (`walk_in`, `website`, `referral`, `whatsapp`, `phone_enquiry`, `social_media`, `advertisement`).
  - Ownership: `assigned_to_id` (FK to canonical `users.id`).
  - Conversion Linkage: `converted_student_id` (FK to canonical `students.id`), `converted_at`, `converted_by_id`.
  - Async SQLAlchemy Resilience: All relationships configured with `lazy="selectin"` to eliminate `MissingGreenlet` exceptions during async serialization.

- **`LeadFollowUp` (`lead_follow_ups` table):**
  - Tracks all interaction attempts (`call`, `whatsapp`, `email`, `in_person_meeting`, `counselling_session`, `sms`).
  - Status lifecycle (`scheduled`, `completed`, `cancelled`, `missed`, `rescheduled`), scheduled datetime, outcome, and counsellor notes.

- **`LeadDemoClass` (`lead_demo_classes` table):**
  - Schedules trial/demo sessions with teachers (`subject_id`, `teacher_id`, `scheduled_at`, `status`, `feedback`, `rating`).

- **`LeadCommunication` (`lead_communications` table):**
  - Unified outbound message logs across SMS, WhatsApp, Email, and In-App notifications.

---

## 3. Backend REST APIs (`/api/v1/leads`)

Implemented in `backend/app/api/v1/endpoints/leads.py`:

1. **`GET /api/v1/leads/metrics/summary`:**
   - Computes 7 top KPI metrics: Total Leads, New Enquiries, Follow-ups Today, Overdue Follow-ups, Converted Count & Rate, Lost Leads.
2. **`GET /api/v1/leads/pipeline/kanban`:**
   - Groups active leads into 6 visual pipeline columns (`new_enquiry`, `contacted`, `counselling_demo`, `interested`, `admission_pending`, `converted`).
3. **`GET /api/v1/leads`:**
   - Paginated list view with multi-faceted search (name, mobile, course, source), stage filtering, priority filtering, and counsellor scoping.
4. **`POST /api/v1/leads`:**
   - Atomic lead creation with sequential `LD-XXXX` numbering and initial follow-up scheduling.
5. **`GET /api/v1/leads/{lead_id}/dossier`:**
   - Unified 360° lead dossier aggregation including student/parent details, enquiry history, follow-up trail, demo classes, and duplicate student detection.
6. **`PATCH /api/v1/leads/{lead_id}/stage`:**
   - Safe stage progression and priority adjustment with activity audit logging.
7. **`POST /api/v1/leads/{lead_id}/follow-ups`:**
   - Schedules or completes interaction logs and updates lead's `next_follow_up_at`.
8. **`POST /api/v1/leads/{lead_id}/demo-classes`:**
   - Schedules trial sessions with academic faculty.
9. **`POST /api/v1/leads/{lead_id}/convert-to-admission`:**
   - Transactional conversion into canonical `Student`, `Guardian`, and `StudentEnrollment` records.
   - Generates sequential academic admission number (`PA-YYYY-XXXXXX`).
   - Marks lead as `converted` with linked `converted_student_id`.

---

## 4. Frontend Workspace & UX Implementation

Implemented in `frontend/src/pages/LeadManagement.tsx`:

- **7 Top KPI Metric Cards:** Exact visual match with screenshot styling, trend chips (+12%, +5.2%), and badge indicators.
- **Dual-View Pipeline Experience:**
  - **Kanban Board:** Color-coded stage columns with lead cards showing student avatar initials, standard/board badges, phone links, last touch date, and inline stage move triggers.
  - **Bottom Table View:** Tabs for `Recent Leads`, `My Follow-ups`, `Overdue`, `Converted`, and `Lost` with quick communication action buttons (Call, WhatsApp, Email).
- **Docked Lead Dossier Side-Panel:**
  - Displays selected lead identity with Hot/Warm/Cold badge.
  - Tabbed inspector: Overview, Follow-ups, Communication, Documents.
  - Next Follow-up alert with Reschedule action.
  - Quick multi-channel action buttons.
  - Prominent `Convert to Admission` workflow with duplicate detection modal.
- **Rule 010 View-First Governance:**
  - Integrated `<EditModeBar scope="crm:leads" />` across the top.
  - All mutating buttons (`+ New Lead`, `+ Add Lead`, `Reschedule`, `Convert to Admission`, `Delete`) wrapped in `LockedButton` and `LockedIconButton`.
  - Delete actions governed by `DeleteConfirmationModal`.

---

## 5. Sidebar Navigation & Global Routing

Integrated in:
- `frontend/src/store/sidebarStore.ts`: CRM state management (`crmOpen`, `toggleCrmOpen`).
- `frontend/src/components/Sidebar.tsx`: Dedicated CRM menu group with `Layers` icon, accordion animation, flyout menu in collapsed mode, and sub-items (`Overview`, `All Leads`, `Lead Pipeline`, `Follow-ups`, `Counselling & Demo`, `Lead Sources`, `Campaigns`, `Reports`, `Settings`).
- `frontend/src/App.tsx`: Routes registered for `/leads` and `/crm`.

---

## 6. Verification & Automated Test Results

### 6.1 Backend Integration Test Suite (`tests/test_lead_management_crm.py`)
Executed inside backend container: `pytest tests/test_lead_management_crm.py -v`:
- `test_crm_metrics_summary`: **PASSED** (KPI calculations & percentages verified)
- `test_create_lead_and_sequential_numbering`: **PASSED** (Atomic `LD-XXXX` generation verified)
- `test_get_leads_and_kanban`: **PASSED** (Kanban columns & filtering verified)
- `test_lead_dossier_detail`: **PASSED** (Full dossier aggregation verified)
- `test_update_stage_and_follow_up`: **PASSED** (Stage transition & follow-up scheduling verified)
- `test_schedule_demo_class`: **PASSED** (Faculty demo booking verified)
- `test_lead_to_admission_conversion`: **PASSED** (Canonical student creation & enrollment verified)
- `test_crm_security_and_permissions`: **PASSED** (Multi-tenant isolation & RBAC authorization verified)
- **Result: 8/8 tests passed (100% Pass Rate).**

### 6.2 Frontend Unit Test Suite (`src/test/LeadManagementCRM.test.tsx` & `src/test/Sidebar.test.tsx`)
Executed via Vitest:
- `Sidebar.test.tsx`: **13/13 tests passed**.
- `LeadManagementCRM.test.tsx`: **5/5 tests passed**.
- Rule 010 View-First lock & unlock behavior: **Verified**.

### 6.3 Rule 010 Global Governance Audit (`scripts/check_view_first_governance.py`)
- Total Pages Checked: 36
- Passed: 36
- Failed: 0
- **Status: 100% Rule 010 View-First Governance Compliance Verified.**

### 6.4 Production Build & Container Deployment
- `npm run build --prefix frontend`: Compiled cleanly with TypeScript in 14.70s.
- Deployed to `prashant_academy_frontend` container via Nginx reload.
- Deployed backend service and verified clean startup at `/health` (HTTP 200).

---

## 7. Sign-off

The Lead Management & CRM module meets all product specifications, architecture principles, SSOT rules, View-First governance requirements, and visual UI fidelity standards.

**Status:** Complete & Approved for Production.
