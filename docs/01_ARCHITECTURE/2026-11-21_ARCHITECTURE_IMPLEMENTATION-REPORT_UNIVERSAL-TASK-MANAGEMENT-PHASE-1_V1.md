---
title: "Universal Task Management Engine Phase 1 Implementation Report"
module: "01_ARCHITECTURE"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-21"
updated_date: "2026-11-21"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["tasks", "universal-engine", "planning", "kanban", "idempotency", "cross-module", "ssot"]
entities: ["Activity", "ActivityReference", "ActivityAssignee", "FeeInvoice", "Lead"]
api_routes: ["/api/v1/planning/tasks/summary", "/api/v1/planning/tasks/sync-fee-overdue", "/tasks"]
related_modules: ["01_ARCHITECTURE", "09_FEES_PAYMENTS", "04_STUDENT_MANAGEMENT"]
---

# Universal Task Management Engine — Phase 1 Implementation Report

## 1. Executive Summary

In response to the forensic review of the proposed Universal Task Management Engine (Score: 78.25/100, Grade B+), Phase 1 has been executed under strict adherence to **Rule 001 (Single Source of Truth)**, **Rule 002 (Mandatory Reuse Before Creation)**, and **Rule 010 (Global View-First Governance)**.

Rather than fragmenting the database schema by introducing redundant task master tables, Phase 1 elevated the canonical institutional activity and planning subsystem (`activities`, `activity_references`, `activity_assignees`) into a first-class, cross-module workflow engine with complete Kanban, calendar, agenda, and timeline views.

---

## 2. Architectural Pillars Implemented

### 2.1 Single Source of Truth & Polymorphic Entity Binding
- The authoritative person master remains `users.id`.
- The canonical activity master remains `activities.id`.
- Cross-module linkage is governed exclusively through `activity_references` (`source_type`, `source_record_id`) spanning 11 core business domains:
  `lead`, `student`, `fee_invoice`, `attendance`, `academic_year`, `division`, `subject`, `examination`, `timetable_entry`, `communication_log`, `homework_assignment`.

### 2.2 Elimination of Dual-State Desynchronization (Ghost Tasks)
- Built `resolve_automated_tasks()` in `backend/app/services/auto_task_service.py`.
- **Payment Posting Trigger:** When a student fee invoice balance is cleared (`invoice.outstanding_amount == Decimal("0.00")`), open collection tasks referencing that invoice are automatically transitioned to `completed`.
- **CRM Lead Conversion Trigger:** When a prospect enquiry is converted to formal student admission or reaches terminal status (`converted`, `lost`, `archived`), open lead follow-up tasks are automatically closed.

### 2.3 Elimination of Automated Task Avalanches (Anti-Spam Idempotency)
- Built `create_automated_task()` in `backend/app/services/auto_task_service.py`.
- Incorporates duplicate query guards checking for existing active activities (`status NOT IN ('completed', 'cancelled')`) referencing `(source_type, source_record_id)`.
- If an active task exists, parameters (such as `due_at` or `priority`) are updated in-place without spawning duplicate cards.

### 2.4 Navigation & Route Elevation
- Direct URL aliases in `frontend/src/App.tsx`:
  - `/tasks` -> `/planning?view=kanban`
  - `/tasks/kanban` -> `/planning?view=kanban`
  - `/tasks/calendar` -> `/planning?view=calendar`
  - `/tasks/agenda` -> `/planning?view=agenda`
  - `/tasks/timeline` -> `/planning?view=timeline`
- Elevated module definition in `frontend/src/config/modules.ts`:
  - Label: **Tasks & Planning Center**
  - Sub-items: Tasks Kanban Board, Deadlines & Calendar, Daily Agenda, Workload & Timeline.
- Enhanced `PlanningWorkspace.tsx`:
  - Real-time KPI summary bar: Total Tasks, To Do, In Progress, Completed, Urgent, Overdue.
  - Manual on-demand `Sync Overdue Tasks` action button with Edit Mode authorization.
  - URL query parameter synchronization (`useSearchParams`) ensuring seamless view switching.

---

## 3. API Endpoints Introduced

| Endpoint | Method | Security / RBAC | Description |
|---|---|---|---|
| `/api/v1/planning/tasks/summary` | `GET` | `planning:view` | Returns aggregated metrics: total, todo, in_progress, completed, urgent, overdue. |
| `/api/v1/planning/tasks/sync-fee-overdue` | `POST` | `planning:create` (Edit Mode) | Scans overdue fee invoices and generates/updates automated collection tasks with idempotency guarantees. |

---

## 4. Verification & Quality Gates

- **Unit Tests:** `backend/tests/test_auto_task_service.py` (6 test cases, 100% PASS).
- **Regression Tests:** `backend/tests/test_planning_workspace.py` (20 test cases, 100% PASS).
- **Frontend Compilation:** `npm --prefix frontend run build` (Clean TypeScript & Vite compilation, 0 errors).
- **Corporate Attribution Headers:** `python scripts/manage_headers.py check` (763 / 763 files, 100% PASS).
- **Pre-Release Hygiene:** `python scripts/check_release_hygiene.py` (Clean 42.23 MB distribution payload, 0 violations).
- **Documentation Manifest:** Indexed and validated via `tools/docs_manager.py`.
