---
title: "PrathamOne EduOS v1.88.0 — Full Backend & Frontend Regression QA Report"
module: "18_TESTING_QA"
category: "TEST-REPORT"
document_type: "TEST-REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.88.0"
doc_version: "1.0"
created_date: "2026-11-12"
updated_date: "2026-11-12"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["regression", "pytest", "vitest", "v1.88.0", "homework", "eduboard", "receipt-print", "help-centre"]
entities: ["Homework", "EduBoard", "FeeReceipt", "HelpArticle", "Student", "Payment"]
api_routes: ["/api/v1/homework", "/api/v1/eduboard/boards", "/api/v1/payments/receipt", "/api/v1/help/overview"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "09_FEES_PAYMENTS", "18_TESTING_QA", "22_USER_MANUALS"]
---

# PrathamOne EduOS `v1.88.0` — Full Backend & Frontend Regression QA Report

## 1. Executive Test Summary

Full end-to-end backend (`pytest`) and frontend (`vitest`) verification was executed against the `v1.88.0` release build (`2026.11.12-REV-159-v1.88.0`), covering Homework & Assignment Studio (Phases 1–15), PrathamOne EduBoard (Greenboard, Focus/Fullscreen modes, Pop-Out sync), Fee Receipt A5/A4 Print & PDF Parity, Help & About Centre (`20` modules), CSP pre-hydration script isolation, and all core ERP modules.

| Verification Suite | Command Executed | Scope / Outcome | Duration |
|---|---|---|---|
| **Backend Automated Suite (`pytest`)** | `docker exec prashant_academy_backend pytest -v --tb=short` | **314 passed, 4 skipped, 0 failed** (`317` collected items + `1` module-level skip) | `385.21s` (`0:06:25`) |
| **Frontend Automated Suite (`vitest`)** | `npx vitest run --maxWorkers=2` | **66 test files passed (66), 510 tests passed (510), 0 failed** | `152.44s` |

---

## 2. Exact Skip Disclosure (Backend)

No backend tests failed. Exactly **4 skips** occurred under expected environment-guard conditions inside the `prashant_academy_backend` container:

1. **`tests/test_auto_version.py` (`1` module-level skip during collection):** Skipped because host-only `scripts/` directory is not mounted inside the runtime backend container (`allow_module_level=True`).
2. **`tests/test_fee_register_import.py` (`3` test skips):**
   - `TestFeeRegisterParsing::test_workbook_full_reconciliation`
   - `TestFeeRegisterImportExecution::test_preview_and_execute_import`
   - `TestFeeRegisterImportExecution::test_duplicate_import_prevention`
   All three use `@pytest.mark.skipif(not os.path.exists(WORKBOOK_PATH), reason="Workbook not found in test environment")`.

---

## 3. Verified Subsystems Covered in Regression Run

- **Homework & Assignment Studio:** `tests/test_homework_system.py`, `tests/test_homework_enhancement_e2e.py`, frontend Homework test suites.
- **PrathamOne EduBoard Digital Classroom:** `tests/test_eduboard_system.py`, `EduBoardWorkspace.test.tsx`.
- **Fee Receipt Print & PDF Parity + Financial Governance:** `tests/test_payments.py`, `tests/test_receipt_pdf_and_bulk_export.py`, `tests/test_transaction_governance.py`, `PrintDocumentBranding.test.tsx`, `PrintFooterAndGovernance.test.tsx`.
- **Help & About Centre (`20` Modules):** `tests/test_help_and_about.py` (`test_help_governance_rbac_revisions_legal_approval_and_safety_blocker`, `test_product_company_and_dynamic_version_accuracy`, etc.).
- **Global Security, RBAC, Tenant Isolation & Rule 010 View-First Governance:** `tests/test_tenant_isolation.py`, `P1SecurityAndViewFirst.test.tsx`, `GlobalViewFirstSoftwareWideCoverage.test.tsx`, `AuthInterceptorAndBranding.test.tsx`.

