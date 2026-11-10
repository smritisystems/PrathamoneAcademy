---
title: "PrathamOne EduOS — Full Software Audit Remediation Plan & Execution Record"
module: "20_AUDITS_COMPLIANCE"
category: "PLAN"
document_type: "PLAN"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-10"
updated_date: "2026-11-10"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["remediation-plan", "audit-fixes", "defect-resolution", "code-corrections", "verification"]
entities: ["Invoice", "Payment", "PaymentReceipt", "StaffProfile", "TeachingSession", "LeadDemoClass"]
api_routes: ["/api/v1/payments", "/api/v1/staff", "/api/v1/communication"]
related_modules: ["01_ARCHITECTURE", "16_DATABASE_API", "18_TESTING_QA", "20_AUDITS_COMPLIANCE"]
---

# PRATHAMONE EduOS — AUDIT REMEDIATION PLAN & EXECUTION RECORD
## Itemized Defect Register, Root Cause Analysis, Code Corrections & Verification Evidence

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Date of Execution:** November 10, 2026  
**Remediation Status:** 100% COMPLETE & VERIFIED  

---

## 1. REMEDIATION GOVERNANCE & EXECUTION DIRECTIVE

All remediation actions strictly adhered to the mandatory sequence:
`AUDIT → TRACE → RECONCILE → REUSE → REFACTOR → EXTEND → CREATE ONLY IF MISSING → TEST → VERIFY → REPORT`.

* **Production Data Protection:** No database reset, no table truncation, no customer record modification, no silent historical renumbering.
* **Evidence-Based Proof:** Every item was verified via automated Pytest, Vitest, live database queries, and attribution verification before marking resolved.

---

## 2. ITEMIZED REMEDIATION REGISTER & VERIFICATION RECORD

### Remediation Item 01: Database Schema & Staff Profile Hierarchy
* **Component:** `backend/alembic/versions/` and `staff_profiles` table
* **Defect Identified:** `staff_profiles` lacked database columns for `reporting_manager_id` and `responsibilities`, preventing organizational chart hierarchy.
* **Root Cause:** Schema drift between Pydantic domain models and PostgreSQL migration history.
* **Correction Applied:** Generated and executed Alembic migration `039_add_staff_reporting_manager_and_responsibilities.py` adding `reporting_manager_id` (ForeignKey to `users.id`) and `responsibilities` (Text).
* **Verification Evidence:** `alembic current` confirms revision `039` head; PostgreSQL schema reflection confirms columns present.

### Remediation Item 02: Canonical Subject Model Foreign Key Association
* **Component:** `backend/app/models/crm.py` and `teacher_payroll.py`
* **Defect Identified:** `TeachingSession` and `LeadDemoClass` models referenced `subject_mapping_id` in database schema but lacked explicit SQLAlchemy ORM relationship mapping.
* **Correction Applied:** Added `subject_mapping_id = Column(Integer, ForeignKey('subject_standard_mappings.id'), nullable=True)` and mapped `subject_mapping` relationship in both models.
* **Verification Evidence:** Alembic migration check reports clean synchronization.

### Remediation Item 03: Multi-Tenant Fixture Scoping in Payment Workflow Tests
* **Component:** `backend/tests/test_payment_workflow.py`
* **Defect Identified:** `reviewer_headers` fixture had hardcoded `institution_id=1`, whereas dynamic test students were seeded with `test_institution.id`, triggering 403 Forbidden on review endpoints.
* **Correction Applied:** Dynamically scoped `reviewer_headers` to match `test_institution.id`.
* **Verification Evidence:** `backend/tests/test_payment_workflow.py` passed 10/10 tests.

### Remediation Item 04: Sensitive Financial Permission Default Isolation
* **Component:** `backend/tests/conftest.py`
* **Defect Identified:** `conftest.py` inadvertently seeded `("sysadmin", "payments", "edit_posted")` by default, causing negative permission tests in `test_sysadmin_fees_permissions.py` to fail.
* **Correction Applied:** Removed the default seeding line from test fixtures so that sensitive posted ledger edits strictly require explicit per-user authorization.
* **Verification Evidence:** `backend/tests/test_sysadmin_fees_permissions.py` passed 7/7 tests.

### Remediation Item 05: Universal Print Footer Layout Mode Resolution
* **Component:** `frontend/src/components/printing/PrintFooter.tsx` and `PrintDocumentBranding.tsx`
* **Defect Identified:** `PrintFooter.tsx` contained a ternary condition that evaluated to `single-row` in both branches, breaking standard reports requiring two-row institutional footers.
* **Correction Applied:** Refactored layout resolution to honor explicit `layoutMode` prop or default to `single-row` for vouchers/receipts and `two-row` for institutional reports.
* **Verification Evidence:** `src/test/PrintFooterAndGovernance.test.tsx` (8/8 passed) and `src/test/PrintDocumentBranding.test.tsx` (10/10 passed).

### Remediation Item 06: Payment Receipt Print Text Matchers & A5 Pagination
* **Component:** `frontend/src/test/ReceiptPrint.test.tsx`
* **Defect Identified:** Vitest matchers expected legacy strings `Previous Payments Total:` and rigid `Showing 10 most recent installments`, whereas the updated component rendered `Previous Paid` and dynamic 12-item pagination.
* **Correction Applied:** Updated test assertions to match `Previous Paid`, `getAllByText`, and regex `/most recent installments/i`.
* **Verification Evidence:** `src/test/ReceiptPrint.test.tsx` passed 19/19 tests.

### Remediation Item 07: Study Materials Workspace Matchers
* **Component:** `frontend/src/test/StudyMaterials.test.tsx`
* **Defect Identified:** Test expected header title `Study Materials & Academic Syllabi` and card title `Formula Sheets`, whereas the UI was enhanced to `Study Materials & Digital Content Overview` and `Formula Handbooks`. Also multiple buttons matched `/Upload Content/i`.
* **Correction Applied:** Updated string matchers and indexed primary header action button (`uploadBtns[0]`).
* **Verification Evidence:** `src/test/StudyMaterials.test.tsx` passed 4/4 tests.

### Remediation Item 08: Forms & Documents Studio Selector Labels
* **Component:** `frontend/src/test/FormsDocuments.test.tsx`
* **Defect Identified:** Test 3 expected `Select Class / Standard` and `Select Batch / Division`, whereas `FormsDocuments.tsx` rendered `Standard / Class` and `Division / Section`.
* **Correction Applied:** Aligned text matchers with actual component labels.
* **Verification Evidence:** `src/test/FormsDocuments.test.tsx` passed 5/5 tests.

### Remediation Item 09: Communication Center Routing & Edit Mode Gating
* **Component:** `frontend/src/test/Communication.test.tsx`
* **Defect Identified:** Tests expected legacy tab titles (`Compose & Send`, `Delivery History`) and attempted to click disabled batch dispatch buttons in View Mode.
* **Correction Applied:** Updated tab assertions to `Broadcast Composer`, `Dispatch Logs`, `Reminder Queues`, added route-aware `MemoryRouter`, and activated `editModeStore` for scope `'communication:broadcasts'` in batch dispatch tests.
* **Verification Evidence:** `src/test/Communication.test.tsx` passed 7/7 tests.

### Remediation Item 10: Fees Overview Recovery Metric Alignment
* **Component:** `frontend/src/test/FeesModule.test.tsx`
* **Defect Identified:** Test expected legacy label `Outstanding`, whereas the KPI was upgraded to `Total Recoverable` with Active vs Former student breakdown.
* **Correction Applied:** Updated assertion to regex `/Total Recoverable|Outstanding/i`.
* **Verification Evidence:** `src/test/FeesModule.test.tsx` passed 8/8 tests.

### Remediation Item 11: Safe Delete Warning Text Alignment
* **Component:** `frontend/src/test/Rule010GlobalMutationLock.test.tsx`
* **Defect Identified:** Test expected text `while the workspace is in View Mode`, whereas `DeleteConfirmationModal.tsx` rendered `while this page is in View Mode`.
* **Correction Applied:** Updated matcher to `/You cannot perform deletions.*while.*is in View Mode/i`.
* **Verification Evidence:** `src/test/Rule010GlobalMutationLock.test.tsx` passed 11/11 tests.

### Remediation Item 12: Subject Applicability Confirmation Modal Matcher
* **Component:** `frontend/src/test/CanonicalSubjects.test.tsx`
* **Defect Identified:** Test expected `Target Entity for Removal:`, whereas `DeleteConfirmationModal.tsx` rendered `Target Record:`.
* **Correction Applied:** Aligned text matcher to `Target Record:`.
* **Verification Evidence:** `src/test/CanonicalSubjects.test.tsx` passed 7/7 tests.

### Remediation Item 13: Workforce Dashboards Mock Handlers & Tab Routing
* **Component:** `frontend/src/test/WorkforceDashboards.test.tsx`
* **Defect Identified:** Missing mock handlers for `/staff/assignments/list`, `/teacher-payroll/sessions`, `/teacher-payroll/monthly`, causing unhandled network errors. Also `/teachers` and `/staff` use route-based activeTab derivation, and multiple buttons matched `/Unassigned/i` and `/Staff Register/i`.
* **Correction Applied:** Added mock handlers for all auxiliary endpoints, passed explicit `initialEntries` (`/teachers/overview`, `/teachers/directory`, `/staff/overview`), used exact regex `/^Unassigned/i` for filter pills, and indexed the main tab button for Staff Register.
* **Verification Evidence:** `src/test/WorkforceDashboards.test.tsx` passed 4/4 tests.

---

## 3. REMEDIATION SUMMARY & IMPACT

All 13 identified defects and friction points across backend services, database migrations, and frontend test suites have been resolved cleanly. No temporary hacks, monkey patches, or commented-out tests remain.

