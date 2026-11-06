# PrathamOne EduOS — Centralized Documentation Hub

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Organization:** AITDL — AI Technology & Development Lab  
**Product Architect:** Jawahar R Mallah  

---

## 1. Overview & Architecture

Welcome to the **PrathamOne EduOS Centralized Documentation Hub**. This repository knowledge base maintains all architectural blueprints, functional specifications, user operating manuals, implementation reports, forensic audits, and test suites across 27 standardized numbered modules.

Every technical document is systematically categorized, given standard YAML frontmatter metadata, indexed with SHA-256 integrity checksums, and made queryable via the CLI search engine.

---

## 2. Global Governance Policies

- **[Global Single Source of Truth (SSOT) & Anti-Duplication Policy](file:///f:/PrashantAcademy/docs/25_BUSINESS_REQUIREMENTS/2026-11-06_GLOBAL_POLICY_SINGLE-SOURCE-OF-TRUTH-GOVERNANCE_V1.md):** Mandatory architecture rules prohibiting duplicate tables, models, APIs, and business logic.
- **[Documentation Rules & Naming Standard](file:///f:/PrashantAcademy/docs/DOCUMENTATION_RULES.md):** Specification for the 27 module directories, standard naming convention (`YYYY-MM-DD_MODULE_DOCUMENT-TYPE_DESCRIPTION_VERSION.ext`), and metadata schema.
- **[Complete Documentation Index](file:///f:/PrashantAcademy/docs/DOCUMENTATION_INDEX.md):** Live human-readable directory index with links and statuses for all documents.
- **[Machine-Readable Manifest](file:///f:/PrashantAcademy/docs/DOCUMENTATION_MANIFEST.json):** JSON catalog and inverted search index for AI agents and automated verification.

---

## 3. Directory Navigation

```
docs/
├── README.md                      # Documentation hub home (this file)
├── DOCUMENTATION_INDEX.md         # Master index with status, links, and cross-references
├── DOCUMENTATION_RULES.md         # Naming, metadata, and governance rules
├── DOCUMENTATION_MANIFEST.json    # Machine-readable JSON index & inverted search index
├── 00_PRODUCT_OVERVIEW/           # Product branding, vision, and core roadmap
├── 01_ARCHITECTURE/               # Micro/macro architecture and end-to-end workflows
├── 02_INSTALLATION_DEPLOYMENT/    # Docker compose, local installation, and production hosting
├── 03_ACADEMIC_MANAGEMENT/        # Standards, divisions, subjects, courses, and timetables
├── 04_STUDENT_MANAGEMENT/         # Student directory, admissions, enrollments, and lifecycle
├── 05_TEACHER_MANAGEMENT/         # Faculty directory and teaching assignments
├── 06_TEACHER_PAYROLL/            # Hourly/lecture/monthly/contract payroll & payment vouchers
├── 07_ATTENDANCE/                 # Attendance registers and tracking policies
├── 08_EXAMINATION/                # Exam schedules, marks entry, and report cards
├── 09_FEES_PAYMENTS/              # Fee structures, student fee adjustments, and payment receipts
├── 10_FINANCE_ACCOUNTING/         # Double-entry ledger, vouchers, and chart of accounts
├── 11_REPORTS_EXPORTS/            # Tabular reports, analytics grids, and Excel/CSV exporters
├── 12_RBAC_SECURITY/              # Roles, permissions, access tokens, and security audits
├── 13_SYSADMIN_SETTINGS/          # Sysadmin center, institute configuration, and system info
├── 14_PRINTING_DOCUMENTS/         # Official fee receipts (A4/A5), student ID cards, KYC forms
├── 15_INTEGRATIONS/               # WhatsApp sharing, SMS alerts, and data migration tools
├── 16_DATABASE_API/               # Database schema, Alembic migrations, and REST API standards
├── 17_UI_UX_DESIGN/               # Component library, application footer, and UX standards
├── 18_TESTING_QA/                 # Pytest, Vitest, and Playwright verification suites
├── 19_RELEASES_CHANGELOG/         # Semantic versioning, release notes, and version reset
├── 20_AUDITS_COMPLIANCE/          # Forensic system audits and database health checks
├── 21_TROUBLESHOOTING/            # Operational runbooks, error recovery, backup and restore
├── 22_USER_MANUALS/               # User manuals, quick start guides, sysadmin manual (PDF/HTML/DOCX)
├── 23_DEVELOPMENT_GUIDES/         # Developer onboarding and contributor guidelines
├── 24_AI_AGENT_KNOWLEDGE/         # AI agent governance, prompt blueprints, and instructions
├── 25_BUSINESS_REQUIREMENTS/      # Coaching business rules, policy decision register, SSOT
├── 26_ARCHIVED/                   # Archived legacy and superseded documentation
└── assets/
    ├── screenshots/               # High-resolution UI captures and verification screens
    ├── diagrams/                  # Mermaid and architectural diagrams
    └── attachments/               # Sample templates and raw reference datasets
```

---

## 4. Documentation CLI Engine

The documentation engine provides a rich command-line tool at `tools/docs_manager.py`:

```bash
# 1. Search the knowledge base
python tools/docs_manager.py search "teacher payroll"
python tools/docs_manager.py search --entity TeacherPaymentProfile
python tools/docs_manager.py search --api /api/v1/teacher-payroll

# 2. Inspect the Canonical SSOT Registry before creating new entities
python tools/docs_manager.py ssot-registry

# 3. Audit unindexed or scattered documentation
python tools/docs_manager.py audit

# 4. Auto-classify, standardize filenames, and organize new docs
python tools/docs_manager.py organize

# 5. Reindex and regenerate documentation index and manifest
python tools/docs_manager.py reindex

# 6. Validate naming, frontmatter, and link integrity
python tools/docs_manager.py validate
```
