---
title: "Student Receivables & Financial Continuity Reuse Matrix"
module: "04_STUDENT_MANAGEMENT"
category: "DATA-DICTIONARY"
document_type: "MATRIX"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-09"
updated_date: "2026-11-09"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["students", "receivables", "reuse-matrix", "ssot", "data-continuity"]
entities: ["Student", "StudentEnrollment", "FeeInvoice", "StudentLifecycleLog", "Payment"]
api_routes: ["/api/v1/students", "/api/v1/fees/overview", "/api/v1/fees/register", "/api/v1/fees/former-students-recovery"]
related_modules: ["09_FEES_PAYMENTS", "10_FINANCE_ACCOUNTING"]
---

# PRATHAMONE EDUOS — STUDENT RECEIVABLES & FINANCIAL CONTINUITY REUSE MATRIX

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Policy Status:** MANDATORY AUDIT & REUSE COMPLIANCE  

---

## 1. EXECUTIVE SUMMARY & REUSE MANDATE

In accordance with **Rule 001 (Single Source of Truth)** and **Rule 002 (Mandatory Reuse Before Creation)**, this document certifies the forensic audit and structural reuse of all database tables, columns, API routes, and frontend components governing student outstanding receivables across active, transferred, on-hold, discontinued, and former students.

A foundational principle of PrathamOne EduOS financial integrity is:
> **An institutional receivable belongs to the person identity (`students.id`) and the academic contract (`fee_invoices.id`), never to a volatile batch assignment or enrollment status. A student leaving an institute changes their academic enrollment status, but does NOT extinguish their financial debt.**

Prior to this governance audit, receivables reporting treated outstanding debt as a single aggregate figure without delineating debt owned by currently active students versus debt owed by departed/former students. By systematically reusing existing columns (`is_active`, `exit_date`, `exit_reason`, `student_lifecycle_logs`, `fee_invoices.outstanding_amount`), complete financial visibility and debt recovery tracking are achieved with **zero duplicate tables, zero duplicate columns, and zero data migrations**.

---

## 2. SCHEMA ENTITY REUSE MATRIX

The following table provides the exhaustive mapping of student and financial schema elements, establishing authoritative ownership and reuse.

| Entity / Database Table | Existing Column / Attribute | Canonical Semantic Responsibility | Reuse Status | Anti-Duplication Directives |
| :--- | :--- | :--- | :--- | :--- |
| `students` | `id` | Canonical primary key of the person identity. | **REUSED** | Canonical master key. All invoices and payments attach to `students.id`. |
| `students` | `admission_number` | Institutional unique identifier (`PA-YYYY-NNNNNN`). | **REUSED** | Never regenerated or recycled upon student discontinuation or exit. |
| `students` | `is_active` | Global institutional status indicator (`True` = Enrolled, `False` = Exited/Withdrawn). | **REUSED** | Primary discriminator for active vs former student debt segregation. |
| `students` | `exit_date` | Formal administrative exit/withdrawal date. | **REUSED** | Used to calculate days in default / recovery ageing post exit. |
| `students` | `exit_reason` | Formal justification for departure (e.g. Relocation, Discontinued). | **REUSED** | Exposed in fee register and former-student recovery dashboard. |
| `students` | `exit_notes` | Qualitative audit and clearance notes recorded at exit. | **REUSED** | Preserved in student dossier and debt collection audit logs. |
| `student_enrollments` | `status` | Academic enrollment state (`active`, `transferred`, `withdrawn`, `graduated`). | **REUSED** | Academic lifecycle state. Does NOT alter or clear financial debt. |
| `student_enrollments` | `standard_id`, `division_id` | Academic division and standard allocation. | **REUSED** | Retained in historical enrollments upon batch transfer. |
| `student_lifecycle_logs` | `action`, `from_status`, `to_status` | Immutable chronological event log of all lifecycle transitions. | **REUSED** | Complete audit trail of transitions (e.g. `active` $\rightarrow$ `withdrawn`). |
| `fee_invoices` | `total_amount`, `discount_amount` | Contractual fee obligation and approved concessions/waivers. | **REUSED** | Authoritative billing ledger. Never deleted upon student exit. |
| `fee_invoices` | `paid_amount` | Cumulative realized cash/bank collections applied to invoice. | **REUSED** | Realized collections remain locked and immutable. |
| `fee_invoices` | `outstanding_amount` | Net unpaid collectible balance ($\text{Net} - \text{Paid}$). | **REUSED** | Preserved permanently until settled, waived, or written off. |
| `fee_invoices` | `status` | Invoice settlement state (`unpaid`, `partial`, `paid`, `written_off`). | **REUSED** | `written_off` isolates debt from recoverable pool. |
| `payments` | `amount`, `status`, `reversal_of_payment_id` | Cash/bank transaction records with immutable double-entry linkage. | **REUSED** | Full transaction integrity preserved per Phase 3 directives. |

---

## 3. API ENDPOINT REUSE & EXTENSION MATRIX

Instead of creating divergent routers or endpoints, existing fees and student endpoints were extended with unified filtering and explicit receivables segregation.

| API Route | HTTP Method | Existing Functionality | Extended Capabilities | Module / Controller |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/fees/overview` | `GET` | Consolidated KPIs: Total obligation, collected, lump-sum outstanding. | **Extended:** Calculates separate metrics: `active_students_outstanding`, `former_students_outstanding`, `inactive_students_outstanding`, `total_recoverable_outstanding`, `overdue_outstanding`, `waived_amount`, `written_off_amount`. | `backend/app/api/v1/endpoints/fees.py` |
| `/api/v1/fees/register` | `GET` | Student billing ledger rows with course/batch filters and invoice status filter. | **Extended:** Added `student_status` query parameter (`active`, `former`, `transferred`, `inactive`). Added `student_is_active`, `student_status`, `exit_date`, `exit_reason`, and `is_former` badge data to row payloads. | `backend/app/api/v1/endpoints/fees.py` |
| `/api/v1/fees/former-students-recovery` | `GET` | *New authoritative endpoint* | Returns dedicated delinquent receivables register for all discontinued/former students who retain unpaid balances. | `backend/app/api/v1/endpoints/fees.py` |
| `/api/v1/students/{id}/exit` | `POST` | Processes student departure, updates enrollment status and exit notes. | **Validated & Preserved:** Enforces debt persistence. Exiting a student leaves all historical invoices and outstanding balances 100% intact. | `backend/app/api/v1/endpoints/students.py` |
| `/api/v1/students/{id}/batch-transfer` | `POST` | Moves student to a new division/batch within standard. | **Validated & Preserved:** Financial invoices attach to `student_id` and `academic_year_id`, preserving financial obligations seamlessly across batch moves. | `backend/app/api/v1/endpoints/students.py` |

---

## 4. FRONTEND COMPONENT REUSE MATRIX

Frontend UI components in `frontend/src/pages/Fees.tsx` and `frontend/src/components/` were enhanced using existing design system primitives.

| Frontend Component / Workspace | Existing File Location | Existing Capability | Receivables Governance Enhancement |
| :--- | :--- | :--- | :--- |
| **Fees Overview KPI Cards** | `frontend/src/pages/Fees.tsx` | Displays single "Outstanding" card with total unsettled debt. | Replaced with "Total Recoverable" card displaying exact dual breakdown: Active Students vs Former Students, with real-time percentage reconciliation. |
| **Fee Register Controls Bar** | `frontend/src/pages/Fees.tsx` | Search input, invoice status dropdown (`paid`, `partial`, `unpaid`), export CSV button. | Added scoped `Student Status` filter dropdown ("All Students", "Active Enrolled", "Former / Discontinued", "Transferred", "Inactive / On Hold"). |
| **Fee Register Table Rows** | `frontend/src/pages/Fees.tsx` | Student name, admission number, obligation, paid amount, balance due. | Injected amber "Former Student" status badge and exit date metadata on rows where `is_former === true`. |
| **ExcelReportGrid** | `frontend/src/components/common/ExcelReportGrid.tsx` | Shared financial audit and ledger grid with Excel/CSV export. | Reused for audit reconciliation ledger without duplicating table layouts. |

---

## 5. AUDIT CONCLUSION

All student receivables requirements have been implemented strictly through reuse and extension. No redundant tables, duplicate columns, or parallel calculation engines were introduced.

