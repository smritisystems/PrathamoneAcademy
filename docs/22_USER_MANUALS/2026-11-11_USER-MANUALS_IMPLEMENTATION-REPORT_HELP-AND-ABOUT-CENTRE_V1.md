---
title: "PrathamOne EduOS — Help & About Centre Implementation & Delivery Report"
module: "22_USER_MANUALS"
category: "IMPLEMENTATION-REPORT"
document_type: "IMPLEMENTATION-REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-11"
updated_date: "2026-11-11"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["22-user-manuals", "help-centre", "about-centre", "support-ticketing", "contextual-help", "legal-compliance"]
entities: ["HelpCategory", "HelpArticle", "HelpArticleRevision", "SupportRequest", "SupportRequestComment", "InstitutionSetting", "SettingAuditLog", "AuditLog"]
api_routes: ["/api/v1/help/categories", "/api/v1/help/articles", "/api/v1/help/articles/{slug}", "/api/v1/help/search", "/api/v1/help/contextual", "/api/v1/help/product-info", "/api/v1/help/system-info", "/api/v1/help/support-requests"]
related_modules: ["13_SYSADMIN_SETTINGS", "12_RBAC_SECURITY", "17_UI_UX_DESIGN", "20_AUDITS_COMPLIANCE"]
---

# PrathamOne EduOS — Help & About Centre Implementation & Delivery Report

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Developer & Product Owner:** AITDL & SMRITI Systems  
**Prepared By:** Jawahar R Mallah — AITDL (AI Technology & Development Lab)  
**Date:** 2026-11-11  

---

## 1. Existing Help Functionality Audit

- Prior to this task, no dedicated customer-facing in-app Help Centre routes (`/help`, `/support`) or Help database models existed in `backend/app` or `frontend/src`.
- `Settings.tsx` contained an unwired `HelpCircle` button (`title="Help & Documentation"`).
- External static user manual artifacts existed in `docs/22_USER_MANUALS/`, but were not integrated into the application router, contextual help workflows, or content management.

## 2. Existing About Functionality Audit

- `Footer.tsx` displayed an AITDL & Product Ecosystem quick modal and branch title bar (`resolvePageTitle`), while `OrganizationBranding.tsx`, `config/branding.ts`, and `config/appConfig.ts` exposed verified branding constants (`PrathamOne`, `SmritiBooks`, `SmritiSys`, `AITDL — AI Technology & Development Lab`, `9323 023 007 | 9324 117 007`).
- No dedicated customer-facing `/help/about-product`, `/help/about-company` (SMRITI Systems & AITDL), `/help/version`, `/help/legal`, or admin-only `/help/system-info` workspaces existed.

## 3. Existing Components & Services Reused

- **Backend Services & Models:** `InstitutionSetting` + `SettingAuditLog` (`product_about` category for metadata governance), `AuditLog`, `ReleaseService.get_current_release`, `HousekeepingService.list_backups` & `get_housekeeping_policy`, `app.core.deps` (`get_current_active_user`, `require_role`), `app.services.navigation_service` (`CANONICAL_MODULES`, `ROLE_DEFAULT_MENUS`).
- **Frontend Components & Stores:** `EditModeBar`, `LockedButton` (Rule 010 View-First Governance), `Modal`, `useBranding()` / `BRANDING_CONFIG`, `CANONICAL_MODULE_REGISTRY`, `Layout.tsx`, `Sidebar.tsx`, `Footer.tsx`, `useAuthStore`, `useEditModeStore`.

## 4. Missing Functionality Implemented

1. **Help & Support Database Layer & Migration (`043_help_about_centre`):** `help_categories`, `help_articles`, `help_article_revisions`, `support_requests`, `support_request_comments`.
2. **Customer-Safe Baseline Seed Catalog:** 54 baseline articles across 5 sections — Getting Started (9), Module User Guides (14, each covering all 8 mandatory subsections for genuinely implemented modules only), Tutorials & Workflows (13), FAQ & Troubleshooting (12), and Legal & Compliance (6, held at `pending_approval` until management sign-off).
3. **Exclusion Guardrails & Release Sanitization:** Enforced validation rejecting GitHub URLs, git commands/hashes, source paths, developer tools, and installation instructions across CMS writes, product metadata, and release notes.
4. **Unified Search & Contextual Help:** Unified `/api/v1/help/search` across guides, tutorials, FAQs, product/company/version/support destinations; `ContextualHelpButton` + `/api/v1/help/contextual` mapping module routes directly to module guides (e.g., `/fees/concessions` -> `guide-concessions`) with `?from=` back navigation.
5. **Product, Company, Version & Legal Views:** Dedicated pages dynamically sourced from backend configuration and sanitized `SystemRelease` telemetry.
6. **Restricted Admin System Information:** Strict RBAC (`superadmin`/`sysadmin`/`admin`/`principal` only) displaying application health, PostgreSQL ping latency, module availability, integration status, safe backup posture, sanitized latest update notes, and deployment summary without credentials or secrets.
7. **Support Centre & CMS Governance:** Ticket creation/comment/triage workflow with requester isolation + admin CMS for articles, FAQs, categories, legal approvals, revision history, and product metadata under Rule 010 Edit Mode.

## 5. Content Requiring Management Approval

- **Legal & Compliance (6 Documents):** Terms and Conditions, Privacy Policy, Data Protection Policy, Software License Agreement, Copyright Notice, Acceptable Use Policy remain marked `pending_approval` / `Management Approval Required` until authorized legal wording is ratified and published under Content Governance.
- **SMRITI Systems Corporate Fields:** Corporate website, registered office address, and non-AITDL executive leadership details remain flagged `Pending Management Verification`.
- **Commercial License Validity & Product Vision/Mission Sign-off:** `license_validity` shows `Not Configured (Requires Management Registration)` until set by product administration.

## 6. Security, Exclusion & Automated Test Verification

- **Headers Compliance:** `python scripts/manage_headers.py check` verified 556 / 556 files (100% pass).
- **Backend Pytest:** `tests/test_help_and_about.py` (7/7), `tests/test_navigation_engine.py` (4/4), `tests/test_settings.py` (4/4), `tests/test_global_view_edit_governance.py` (6/6), `tests/test_sysadmin_rbac_remediation.py` (6/6) passed; pre-existing environment/seed checks in `test_housekeeping.py` (missing Windows host `pg_dump`/`psql` binaries) and `test_release_management.py` (expects `1.0.0` seed while DB holds `1.76.0`) accounted for 3 failures out of 41 extended items (`38 passed, 3 failed`).
- **Frontend Verification:** `npx tsc --noEmit` (0 errors), full Vitest suite (`62` files / `484` tests passed including 7 new tests in `HelpCentre.test.tsx`), and `npm run build` passed cleanly.

