# PRATHAMONE EduOS — AI AGENT GOVERNANCE & ENGINEERING DIRECTIVE

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Policy Status:** MANDATORY — ALL REPOSITORY WORKFLOWS & CODING AGENTS  

---

## 1. MISSION & PRODUCT IDENTITY

You are working on **PrathamOne EduOS** (Coaching Institute Edition), an enterprise-grade education operating system built with:
- **Backend:** Python 3.11+, FastAPI, SQLAlchemy (Async), PostgreSQL 16, Alembic
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Infrastructure:** Docker Compose, Nginx, Healthchecks, Automated Migrations

All code, documents, and interactions must strictly respect product branding:
- Product Name: **PrathamOne EduOS**
- Baseline Version: **1.0.0**
- Organization: **AITDL — AI Technology & Development Lab**
- Product Architect: **Jawahar R Mallah**

---

## 2. MANDATORY SINGLE SOURCE OF TRUTH (SSOT) & ANTI-DUPLICATION POLICY

Before writing any new code, you MUST comply with the 10 Non-Negotiable SSOT Rules:

1. **RULE 001 — Single Source of Truth:** Every business entity has ONE authoritative source. Never maintain duplicate master copies.
2. **RULE 002 — Mandatory Reuse Before Creation:** Before creating any table, column, model, API, service, component, hook, or utility, you MUST search the codebase (`python tools/docs_manager.py search --entity <Name>` or inspect `backend/app/models/`, `services/`, `components/`). Extend or reuse existing functionality.
3. **RULE 003 — No Duplicate Master Tables:** `users` is the canonical person master for teachers, staff, admins, accountants. `students` is the canonical student master.
4. **RULE 004 — Strict Entity Classification:** Explicitly categorize tables into Master, Relationship, Transaction, Ledger, Configuration, Snapshot, or Cache.
5. **RULE 005 — One Person, One Identity:** Link teachers, staff, and payroll to `users.id`.
6. **RULE 006 — One Business Logic Implementation:** Calculations (payroll, fees, tax, attendance) belong in domain services (`backend/app/services/`). Frontend does not duplicate backend calculations for persistence.
7. **RULE 007 — One API Responsibility:** Extend existing REST routers under `/api/v1/` instead of duplicating CRUD endpoints.
8. **RULE 008 — Shared Frontend Components:** Search and reuse `frontend/src/components/common/` before creating new forms, tables, modals, or selectors.
9. **RULE 009 — Centralized Configuration:** Institute settings in `institute_settings`, system configs in `system_settings`, product version in `config.py`.
10. **RULE 010 — Global View-First & Explicit Edit Mode Governance:** View Mode is the default across all application workspaces, pages, forms, and profiles. No user may create, update, or delete records without explicitly activating scoped Edit Mode. Deletions strictly require active Edit Mode, role authorization, modal confirmation, and historical financial ledger immutability enforcement. Navigation and logout automatically reset state to View Mode.

Full specification: [docs/25_BUSINESS_REQUIREMENTS/2026-11-06_GLOBAL_POLICY_SINGLE-SOURCE-OF-TRUTH-GOVERNANCE_V1.md](file:///f:/PrashantAcademy/docs/25_BUSINESS_REQUIREMENTS/2026-11-06_GLOBAL_POLICY_SINGLE-SOURCE-OF-TRUTH-GOVERNANCE_V1.md).

---

## 3. MANDATORY DOCUMENTATION GENERATION & INDEXING ENGINE

Whenever you generate an implementation plan, architectural review, forensic audit, feature report, or user guide:

### 3.1 Storage Location
Save the document in the appropriate numbered directory under `docs/`:
```
docs/
├── 00_PRODUCT_OVERVIEW/
├── 01_ARCHITECTURE/
├── 02_INSTALLATION_DEPLOYMENT/
├── 03_ACADEMIC_MANAGEMENT/
├── 04_STUDENT_MANAGEMENT/
├── 05_TEACHER_MANAGEMENT/
├── 06_TEACHER_PAYROLL/
├── 07_ATTENDANCE/
├── 08_EXAMINATION/
├── 09_FEES_PAYMENTS/
├── 10_FINANCE_ACCOUNTING/
├── 11_REPORTS_EXPORTS/
├── 12_RBAC_SECURITY/
├── 13_SYSADMIN_SETTINGS/
├── 14_PRINTING_DOCUMENTS/
├── 15_INTEGRATIONS/
├── 16_DATABASE_API/
├── 17_UI_UX_DESIGN/
├── 18_TESTING_QA/
├── 19_RELEASES_CHANGELOG/
├── 20_AUDITS_COMPLIANCE/
├── 21_TROUBLESHOOTING/
├── 22_USER_MANUALS/
├── 23_DEVELOPMENT_GUIDES/
├── 24_AI_AGENT_KNOWLEDGE/
├── 25_BUSINESS_REQUIREMENTS/
├── 26_ARCHIVED/
└── assets/ (screenshots, diagrams, attachments)
```

### 3.2 Naming Standard
Adhere strictly to:
```
YYYY-MM-DD_MODULE_DOCUMENT-TYPE_DESCRIPTION_VERSION.ext
```
*Example:* `docs/06_TEACHER_PAYROLL/2026-11-06_TEACHER-PAYROLL_IMPLEMENTATION-REPORT_V1.md`

### 3.3 Required YAML Frontmatter
All Markdown documentation must include:
```markdown
---
title: "Document Title"
module: "06_TEACHER_PAYROLL"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-06"
updated_date: "2026-11-06"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["tag1", "tag2"]
entities: ["EntityName"]
api_routes: ["/api/v1/..."]
related_modules: ["..."]
---
```

### 3.4 CLI Documentation Tool Execution
After creating or modifying documentation, you MUST run:
```bash
python tools/docs_manager.py reindex
python tools/docs_manager.py validate
```

---

## 4. CORPORATE ATTRIBUTION & HEADER ENFORCEMENT

Every source code file (`.py`, `.ts`, `.tsx`, `.js`, `.jsx`, `.css`) must contain the corporate header:
```python
# /**
#  * @file        <filename>
#  * @project     PrathamOne EduOS Coaching Institute Management System
#  * @module      <module>
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-06
#  * @updated     2026-11-06
#  *
#  * @description <description>
#  */
```
Run `python scripts/manage_headers.py check` before completing your work. It must report 100% compliance.

