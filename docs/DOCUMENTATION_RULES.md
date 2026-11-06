# PrathamOne EduOS — Documentation Governance & Naming Rules

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Version:** 1.0.0  
**Organization:** AITDL — AI Technology & Development Lab  
**Product Architect:** Jawahar R Mallah  
**Policy Classification:** MANDATORY — ALL CONTRIBUTORS & AI CODING AGENTS  

---

## 1. Mission & Scope

The purpose of this standard is to establish a permanent, centralized, searchable, and machine-readable knowledge base within the repository's `docs/` hierarchy. Every technical blueprint, business specification, forensic audit, user guide, implementation plan, and test report produced by developers or AI coding agents must be registered and organized according to these rules.

**Core Principle:** *If it is built or decided, it must be documented; if it is documented, it must be indexed, searchable, and preserved.*

---

## 2. Directory Hierarchy (27 Standardized Modules + Assets)

All project documentation is organized strictly within the following 27 numbered module folders and asset subdirectories:

| Number | Module Name | Primary Scope & Responsibilities |
|---|---|---|
| `00` | `00_PRODUCT_OVERVIEW` | Product identity, edition definitions, vision, roadmap, high-level summaries. |
| `01` | `01_ARCHITECTURE` | System architecture, macro workflows, multi-tier diagrams, non-functional requirements. |
| `02` | `02_INSTALLATION_DEPLOYMENT` | Docker Compose, local setup, production hosting, environment provisioning, CI/CD. |
| `03` | `03_ACADEMIC_MANAGEMENT` | Academic years, standards, divisions, batches, courses, subjects, timetables. |
| `04` | `04_STUDENT_MANAGEMENT` | Student directory, admissions, enrollments, student lifecycle, transfers, withdrawals. |
| `05` | `05_TEACHER_MANAGEMENT` | Teacher profiles, staff directory, designations, employee assignments. |
| `06` | `06_TEACHER_PAYROLL` | Compensation models (hourly, per-lecture, monthly, contract), sessions, payroll runs, vouchers. |
| `07` | `07_ATTENDANCE` | Student & teacher attendance registers, RFID/biometric tracking, absentee alerts. |
| `08` | `08_EXAMINATION` | Exam schedules, grading policies, marks entry, performance evaluation, report cards. |
| `09` | `09_FEES_PAYMENTS` | Fee plans, student fee adjustments, installments, payment receipts, refunds, discounts. |
| `10` | `10_FINANCE_ACCOUNTING` | Chart of accounts, general ledger, daybook, financial vouchers, expense tracking. |
| `11` | `11_REPORTS_EXPORTS` | Analytical reports, tabular grids, Excel/CSV exporters, dashboard statistics. |
| `12` | `12_RBAC_SECURITY` | Roles, permissions, access tokens, authentication, security policies, user audit logs. |
| `13` | `13_SYSADMIN_SETTINGS` | Sysadmin center, institute configuration, branding, universal editor, system info. |
| `14` | `14_PRINTING_DOCUMENTS` | Official fee receipts (A4/A5), student ID cards, certificates, print templates. |
| `15` | `15_INTEGRATIONS` | WhatsApp messaging, SMS gateways, email dispatch, data migration importers. |
| `16` | `16_DATABASE_API` | PostgreSQL schemas, SQLAlchemy ORM models, Alembic migrations, REST API standards. |
| `17` | `17_UI_UX_DESIGN` | Component design system, color palettes, responsive layouts, application footer. |
| `18` | `18_TESTING_QA` | Unit tests (Pytest/Vitest), E2E test suites (Playwright), acceptance criteria. |
| `19` | `19_RELEASES_CHANGELOG` | Release notes, changelog history, version baseline governance, semantic versioning. |
| `20` | `20_AUDITS_COMPLIANCE` | Forensic audits, pre-migration reconciliations, compliance and data health checks. |
| `21` | `21_TROUBLESHOOTING` | Incident runbooks, diagnostic procedures, error recovery, backup and restore. |
| `22` | `22_USER_MANUALS` | End-user manuals, quick start guides, sysadmin operations guides (PDF/HTML/DOCX). |
| `23` | `23_DEVELOPMENT_GUIDES` | Developer onboarding, coding standards, corporate headers, workflow instructions. |
| `24` | `24_AI_AGENT_KNOWLEDGE` | AI coding instructions, prompt governance, LLM tool definitions, agent role boundaries. |
| `25` | `25_BUSINESS_REQUIREMENTS` | Global Single Source of Truth (SSOT), coaching institute business rules, policy register. |
| `26` | `26_ARCHIVED` | Deprecated historical documents, superseded specifications, legacy documentation. |
| `assets` | `assets/screenshots` | High-resolution UI screenshots, verification screen captures. |
| `assets` | `assets/diagrams` | Architectural diagrams, entity relationship diagrams (ERD), flowcharts. |
| `assets` | `assets/attachments` | Sample templates, reference spreadsheets, raw sample datasets. |

---

## 3. Standard Document Naming Convention

All new or reorganized documentation files must adhere to the standardized naming structure:

```
YYYY-MM-DD_MODULE_DOCUMENT-TYPE_DESCRIPTION_VERSION.ext
```

### 3.1 Field Definitions

1. **`YYYY-MM-DD`**: ISO 8601 calendar date of document creation or major baseline revision (e.g., `2026-11-06`).
2. **`MODULE`**: Uppercase module shorthand or exact module name (e.g., `TEACHER-PAYROLL`, `FEES-PAYMENTS`, `SYSADMIN`, `GLOBAL`, `ARCHITECTURE`).
3. **`DOCUMENT-TYPE`**: Standard document classification from Section 3.2.
4. **`DESCRIPTION`**: Concise, kebab-case descriptive slug (e.g., `IMPLEMENTATION-PLAN`, `VERIFICATION-REPORT`, `SINGLE-SOURCE-OF-TRUTH`).
5. **`VERSION`**: Document revision (e.g., `V1`, `V1.1`, `V2`).
6. **`.ext`**: Standard file extension (`.md`, `.pdf`, `.docx`, `.png`, `.json`, etc.).

### 3.2 Approved Document Types

- `ARCHITECTURE-DESIGN`: High-level or low-level technical architecture.
- `IMPLEMENTATION-PLAN`: Pre-execution design and implementation checklist.
- `IMPLEMENTATION-REPORT`: Post-execution implementation summary with verification proof.
- `AUDIT-REPORT`: Forensic or security analysis and code audit.
- `SPECIFICATION`: Detailed functional and technical product specification.
- `USER-MANUAL`: End-user step-by-step operating guide.
- `DEVELOPER-MANUAL`: Backend/frontend developer implementation guide.
- `POLICY-FRAMEWORK`: Business rules, regulatory guidelines, governance policies.
- `RECONCILIATION-REPORT`: Data ledger audit and balance reconciliation.
- `SECURITY-AUDIT`: RBAC, authentication, and vulnerability evaluation.
- `TEST-REPORT`: QA test execution results and coverage metrics.
- `CHANGELOG`: Release changes and version history.

### 3.3 Concrete Naming Examples

- `docs/06_TEACHER_PAYROLL/2026-11-06_TEACHER-PAYROLL_IMPLEMENTATION-PLAN_V1.md`
- `docs/06_TEACHER_PAYROLL/2026-11-06_TEACHER-PAYROLL_IMPLEMENTATION-REPORT_V1.md`
- `docs/25_BUSINESS_REQUIREMENTS/2026-11-06_GLOBAL_POLICY_SINGLE-SOURCE-OF-TRUTH-GOVERNANCE_V1.md`
- `docs/00_PRODUCT_OVERVIEW/2026-11-06_PRODUCT_REBRANDING-AND-VERSION-BASELINE_V1.md`
- `docs/14_PRINTING_DOCUMENTS/2026-11-05_PRINTING_OFFICIAL-FEE-RECEIPT-A5-REDESIGN_V1.md`

---

## 4. Mandatory Document Metadata (YAML Frontmatter)

Every Markdown document (`.md`) inside `docs/` must begin with a standardized YAML frontmatter block:

```markdown
---
title: "Document Human-Readable Title"
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
tags: ["payroll", "teachers", "sessions", "accounting"]
entities: ["TeacherPaymentProfile", "TeachingSession", "TeacherPayroll", "TeacherPaymentVoucher"]
api_routes: ["/api/v1/teacher-payroll"]
related_modules: ["05_TEACHER_MANAGEMENT", "10_FINANCE_ACCOUNTING"]
---
```

### Approved Status Values
- `Draft`: In-progress document pending review or implementation.
- `Reviewed`: Reviewed by peer engineer or architect.
- `Approved`: Officially verified and approved baseline.
- `Deprecated`: Superseded by newer version or feature set.
- `Archived`: Historical reference only.

---

## 5. Single Source of Truth & Exclusion Boundaries

1. **Never Pollute `docs/` With Code**: Never copy source files (`.py`, `.ts`, `.tsx`), build outputs (`dist/`, `build/`), or environment files (`.env`) into `docs/`.
2. **Never Store Secrets or PII**: Documentation must never contain real passwords, API secret keys, or live student personally identifiable information.
3. **No Duplicate Documents**: Store one canonical copy in the primary module folder. Use `related_modules` in frontmatter and cross-links in `docs/DOCUMENTATION_INDEX.md` for secondary references.

---

## 6. Documentation Management Engine CLI

The repository provides the `tools/docs_manager.py` utility to automate and enforce documentation compliance.

```bash
# Audit unindexed or newly generated documentation across the repo and agent artifacts
python tools/docs_manager.py audit

# Auto-classify, standardize filenames, inject frontmatter, and organize candidate docs
python tools/docs_manager.py organize

# Rebuild docs/DOCUMENTATION_INDEX.md and docs/DOCUMENTATION_MANIFEST.json
python tools/docs_manager.py reindex

# Search indexed documentation by keyword, entity, API, or module
python tools/docs_manager.py search "teacher payroll"
python tools/docs_manager.py search --entity TeacherPaymentProfile
python tools/docs_manager.py search --api /api/v1/teacher-payroll

# List documents by module
python tools/docs_manager.py list --module 06_TEACHER_PAYROLL

# Validate documentation naming, metadata completeness, links, and integrity
python tools/docs_manager.py validate
```
