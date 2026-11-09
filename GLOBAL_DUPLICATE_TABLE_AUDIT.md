---
title: "Global Duplicate Table Audit — Forensic Structural Consolidation Review"
module: "01_ARCHITECTURE"
category: "AUDIT-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-09"
updated_date: "2026-11-09"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["audit", "database", "ssot", "tables", "deduplication", "consolidation"]
entities: ["DatabaseTables", "Subjects", "Fees", "AuditLogs", "StaffDocuments"]
api_routes: ["/api/v1/subjects", "/api/v1/fees", "/api/v1/staff", "/api/v1/teacher_payroll"]
related_modules: ["01_ARCHITECTURE", "03_ACADEMIC_MANAGEMENT", "09_FEES_PAYMENTS", "06_TEACHER_PAYROLL", "16_DATABASE_API"]
---

# PRATHAMONE EDUOS — GLOBAL DUPLICATE TABLE AUDIT

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Version:** 1.0.0  
**Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Audit Date:** 2026-11-09  
**Scope:** 74 Database Tables in live PostgreSQL 16 database.  

---

## 1. EXECUTIVE SUMMARY & FORENSIC FINDINGS

This audit rigorously analyzes overlapping, redundant, legacy, and parallel table structures across **PrathamOne EduOS**.
In strict compliance with **RULE 001 (SSOT)** and **RULE 003 (No Duplicate Master Tables)**, we investigated all suspected duplicates.

> [!IMPORTANT]
> **Non-Destructive Governance:** No table has been dropped or modified during this Stage 1 audit.
> Consolidation is recommended ONLY when business equivalence, lifecycle parity, and foreign-key dependencies are 100% verified.

### 1.1 Summary Matrix of Duplicate & Overlapping Clusters

| Duplicate / Overlapping Cluster | Involved Tables | Live Row Counts | Equivalence Finding | Recommended Canonical Action |
| :--- | :--- | :--- | :--- | :--- |
| **Cluster 1: Subject Master** | `canonical_subjects`, `subjects`, `subject_mappings` | 10, 61, 31 rows | **Structural Overlap** with active legacy bridge. 418 child records rely on `subjects.id`. | Maintain dual-run bridge. Migrate downstream FKs to `subject_mappings` before retiring `subjects`. |
| **Cluster 2: Fee Concessions** | `discounts`, `scholarships`, `student_fee_assignments` | 0, 0, 40 rows | **Semantically Superseded**. Concessions are handled via `student_fee_assignments`. | Deprecate `discounts` and `scholarships` in Stage 2. Canonical: `student_fee_assignments`. |
| **Cluster 3: Fee Installments** | `fee_installments`, `fee_invoice_items`, `fee_structures` | 0, 39, 39 rows | **Semantically Superseded**. Installments are stored directly as line items. | Deprecate empty `fee_installments`. Canonical: `fee_invoice_items`. |
| **Cluster 4: Fee Refunds** | `refunds`, `payments` | 0, 171 rows | **Unused Separate Ledger**. Refunds currently recorded via negative payment credit notes. | Deprecate separate table or activate formal ledger when multi-currency refunds arrive. |
| **Cluster 5: Teacher Milestones & Vouchers** | `teacher_contract_milestones`, `teacher_payment_vouchers`, `teacher_rate_histories`, `teacher_payrolls` | 0, 0, 0, 5 rows | **Unused Granular Tables**. Real payroll processes aggregated monthly vouchers in `teacher_payrolls`. | Consolidate into `teacher_payrolls` and `teacher_payment_profiles`. |
| **Cluster 6: Audit Logs** | `audit_logs`, `setting_audit_logs`, `communication_logs`, `codex_audit_logs`, `student_lifecycle_logs` | 325, 41, 27, 12, 1 rows | **Domain-Specific Audit Ledgers**. Distinct access control and high-frequency writes. | Maintain domain ledgers; implement unified cross-domain query view. |
| **Cluster 7: Document Management** | `student_documents`, `staff_documents`, `staff_generated_documents`, `shared_document_tokens` | 195, 0, 0, 0 rows | **Role-Partitioned Document Tables**. Student documents heavily used. | Keep student/staff document tables segregated by RBAC boundary. |

---

## 2. FORENSIC CLUSTER AUDIT SHEETS

### 2.1 Cluster 1: Subject Master Architecture (`canonical_subjects` vs `subjects` vs `subject_mappings`)

1. **Table Names:** `canonical_subjects` (10 rows), `subjects` (61 rows), `subject_mappings` (31 rows).
2. **Purpose:**
   - `canonical_subjects`: Abstract subject identity (e.g. `MATH001`, `Mathematics`, category: `STEM`).
   - `subjects`: Standard-specific subject record (e.g. `Mathematics` for Standard 10 CBSE). Contains standard-specific passing marks and order index.
   - `subject_mappings`: Association table connecting `canonical_subject_id`, `standard_id`, `board_id`, and `academic_year_id`.
3. **Existing Records:**
   - `canonical_subjects`: Exactly 10 canonical subjects.
   - `subjects`: 61 rows. All 61 rows have `standard_id` set.
   - `subject_mappings`: 31 active mappings.
4. **Foreign Keys:**
   - Inbound to `canonical_subjects`: `subjects.canonical_subject_id`, `subject_mappings.canonical_subject_id`.
   - Inbound to `subjects`: `exam_marks.subject_id` (312 rows), `timetable_entries.subject_id` (78 rows), `study_materials.subject_id` (10 rows), `teacher_assignments.subject_id` (12 rows), `teaching_sessions.subject_id` (3 rows), `lead_demo_classes.subject_id` (3 rows).
   - Inbound to `subject_mappings`: 0 inbound FKs currently.
5. **Referencing APIs:**
   - `backend/app/api/v1/endpoints/subjects.py` (handles canonical subjects, subject mappings, and legacy subjects).
   - `backend/app/api/v1/endpoints/examinations.py`, `timetable.py`, `study_materials.py`, `staff.py`.
6. **Referencing Frontend Modules:**
   - `SubjectsPage.tsx`, `AcademicWorkspace.tsx`, `ExaminationsPage.tsx`, `AttendancePage.tsx`.
7. **Are Tables Genuinely Equivalent?**
   - **No.** `canonical_subjects` represents pure subject ontology. `subjects` is currently acting as a hybrid standard-subject entity because legacy tables point to it.
8. **Recommended Canonical Architecture:**
   - Canonical master is `canonical_subjects`.
   - Canonical relationship is `subject_mappings`.
   - `subjects` is a bridge table that must remain intact until downstream foreign keys (`exam_marks`, `timetable_entries`) are safely repointed.
9. **Migration & Compatibility Requirements:**
   - Stage 2 Migration Plan: Add `subject_mapping_id` nullable FK to `exam_marks` and `timetable_entries`.
   - Backfill `subject_mapping_id` by matching `subjects.standard_id` and `subjects.canonical_subject_id`.
   - Only after 100% backfill and verification can `subjects` be made a compatibility view.

---

### 2.2 Cluster 2: Fee Concessions & Scholarships (`discounts` vs `scholarships` vs `student_fee_assignments`)

1. **Table Names:** `discounts` (0 rows), `scholarships` (0 rows), `student_fee_assignments` (40 rows).
2. **Purpose:**
   - `discounts`: Proposed flat discount percentages or amounts for fee structures.
   - `scholarships`: Proposed merit/category scholarship definitions.
   - `student_fee_assignments`: Real active table assigning fee structures to students, with explicit `concession_amount`, `concession_reason`, `scholarship_name`, and `net_amount`.
3. **Existing Records:** `discounts`: 0 rows. `scholarships`: 0 rows. `student_fee_assignments`: 40 active rows.
4. **Foreign Keys:** `discounts` and `scholarships` have 1 outbound FK to `institutions`, 0 inbound FKs from transactional tables.
5. **Referencing APIs:** `backend/app/api/v1/endpoints/fees.py` has legacy CRUD routes for discounts and scholarships, but payment calculation exclusively reads `student_fee_assignments`.
6. **Referencing Frontend Modules:** `FeeConcessionsWorkspace.tsx` manages student concessions via `student_fee_assignments`.
7. **Are Tables Genuinely Equivalent?**
   - `discounts` and `scholarships` are unused parallel master definitions. Real financial transactions bypass them completely.
8. **Recommended Canonical Table:** `student_fee_assignments` is the authoritative source of student-level fee concessions and net payable amounts.
9. **Migration & Compatibility Requirements:**
   - In Stage 2, deprecate `discounts` and `scholarships` tables after routing any template-level discount schemes to `fee_categories` or `institute_settings`.

---

### 2.3 Cluster 3: Fee Installment Schedules (`fee_installments` vs `fee_invoice_items` vs `fee_structures`)

1. **Table Names:** `fee_installments` (0 rows), `fee_invoice_items` (39 rows), `fee_structures` (39 rows).
2. **Purpose:**
   - `fee_installments`: Planned table for recurring schedule installments.
   - `fee_structures`: Master table containing total structure amount and billing schedule configuration.
   - `fee_invoice_items`: Actual transactional line items representing installment payments, fee components, and due dates.
3. **Existing Records:** `fee_installments`: 0 rows. `fee_invoice_items`: 39 rows. `fee_structures`: 39 rows.
4. **Foreign Keys:** `fee_installments` has 0 inbound foreign keys.
5. **Referencing APIs:** `payment_workflow_service.py` issues invoices and line items directly into `fee_invoice_items`.
6. **Referencing Frontend Modules:** `InvoicingWorkspace.tsx` and `FeeStructuresWorkspace.tsx`.
7. **Are Tables Genuinely Equivalent?** `fee_installments` is a redundant planned normalization layer that was replaced by direct itemized invoice generation.
8. **Recommended Canonical Table:** `fee_structures` (Master) and `fee_invoice_items` (Transaction).
9. **Migration & Compatibility Requirements:** Safely retire `fee_installments` in Stage 2.

---

### 2.4 Cluster 4: Financial Refunds & Credit Notes (`refunds` vs `payments`)

1. **Table Names:** `refunds` (0 rows), `payments` (171 rows).
2. **Purpose:**
   - `refunds`: Dedicated refund ledger table with approval workflow columns.
   - `payments`: Core financial transaction ledger. Currently supports negative amount credit reversals, status `refunded`, and reversal transaction references.
3. **Existing Records:** `refunds`: 0 rows. `payments`: 171 rows.
4. **Foreign Keys:** `refunds` has 8 outbound FKs (`institution_id`, `payment_id`, `invoice_id`, `student_id`, `initiated_by_id`, `approved_by_id`, etc.), 0 inbound FKs.
5. **Referencing APIs:** `backend/app/api/v1/endpoints/payments.py` provides `/refunds` endpoints that can write to `refunds`, but real operations use `/reversals` on `payments`.
6. **Referencing Frontend Modules:** `PaymentCollectionWorkspace.tsx`.
7. **Are Tables Genuinely Equivalent?** Distinct architectural approaches: dedicated refund ledger vs unified transaction ledger.
8. **Recommended Canonical Table:** Retain `payments` as the authoritative financial ledger. If explicit two-stage maker-checker refund workflows are required by auditing, activate `refunds` as a child transaction of `payments`.
9. **Migration Requirements:** No data to migrate. Keep `refunds` schema intact until Stage 2 decision.

---

### 2.5 Cluster 5: Teacher Payroll Granular Tables (`teacher_contract_milestones`, `teacher_payment_vouchers`, `teacher_rate_histories` vs `teacher_payrolls`)

1. **Table Names:** `teacher_contract_milestones` (0 rows), `teacher_payment_vouchers` (0 rows), `teacher_rate_histories` (0 rows), `teacher_payrolls` (5 rows), `teacher_payment_profiles` (4 rows).
2. **Purpose:** Granular milestone and rate history tracking vs monthly consolidated payroll.
3. **Existing Records:** All 3 granular tables have 0 rows. `teacher_payrolls` has 5 active payroll records, `teacher_payment_profiles` has 4 profiles.
4. **Foreign Keys:** Outbound FKs to `users` and `teacher_payrolls`. 0 inbound FKs.
5. **Referencing APIs:** `backend/app/api/v1/endpoints/teacher_payroll.py`.
6. **Referencing Frontend Modules:** `TeacherPayrollPage.tsx`.
7. **Are Tables Genuinely Equivalent?** Over-engineered schema sub-components that are currently unused.
8. **Recommended Canonical Table:** Canonical masters are `teacher_payment_profiles` (Master/Relationship) and `teacher_payrolls` (Transaction/Ledger).
9. **Migration Requirements:** Keep dormant until complex milestone contracts are formally adopted, or deprecate in Stage 2.

---

### 2.6 Cluster 6: Audit Logging Architecture (5 Parallel Audit Tables)

1. **Table Names:**
   - `audit_logs`: 325 rows (General application CRUD actions, user logins, data mutations).
   - `setting_audit_logs`: 41 rows (System & institute configuration modifications).
   - `communication_logs`: 27 rows (SMS, WhatsApp, Email delivery attempts & gateway responses).
   - `codex_audit_logs`: 12 rows (QR/Barcode token encryption, scanning & verification events).
   - `student_lifecycle_logs`: 1 row (Student admission, promotion, exit, reactivation state transitions).
2. **Purpose:** Specialized domain ledgers partitioned by operational security context and volume.
3. **Foreign Keys:** All point to `users.id` for actor tracking and `institutions.id` for multi-tenancy.
4. **Are Tables Genuinely Equivalent?**
   - **No.** The data payloads, indexing requirements, retention policies, and compliance standards differ significantly:
     - `communication_logs` stores gateway message IDs and delivery latencies.
     - `codex_audit_logs` stores cryptographic hashes and scan device fingerprints.
     - `setting_audit_logs` stores JSON diffs of critical institute configuration.
     - `student_lifecycle_logs` stores legal academic exit/promotion certificates.
5. **Recommended Canonical Architecture:**
   - Maintain physical partition of domain audit logs for write throughput and security.
   - Create a unified PostgreSQL database view (`v_unified_audit_logs`) across all 5 tables to provide sysadmins with a single forensic search timeline.

---

## 3. AUDIT CONCLUSION & SUMMARY DIRECTIVE

1. **Zero Data Loss Rule:** No populated table is a candidate for immediate removal.
2. **Dormant Empty Tables:** Exactly 9 tables are empty. None are currently referenced by active foreign keys.
3. **Consolidation Action Plan:** Stage 2 will safely retire `discounts`, `scholarships`, and `fee_installments`, while migrating `subjects` to `subject_mappings`.
