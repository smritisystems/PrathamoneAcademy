# PRATHAMONE EduOS — OFFICIAL RELEASE NOTES
**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Current Release:** v1.76.0  
**Build Identifier:** `2026.11.10-REV-137-v1.76.0-C31CC0B`  
**Target Environment:** Production  
**Product Architect:** Jawahar R. Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Client Deployment:** Prashant Academy Coaching Institute  

---

## EXECUTIVE RELEASE OVERVIEW

PrathamOne EduOS (Coaching Institute Edition) is an enterprise-grade education operating system engineered for institutional coaching academies. It combines academic administration, student lifecycle management, fee accounting, faculty payroll, multi-channel communication, and decision-support intelligence.

This document records the official release history, version milestones, architectural deliverables, and changelog records from initial foundational baseline to the current production release.

---

## 🚀 CURRENT PRODUCTION RELEASE: v1.76.0
**Release Date:** 2026-11-10 / 2026-11-11  
**Build Identifier:** `2026.11.10-REV-137-v1.76.0-C31CC0B`  
**Status:** General Availability (GA) — Production Ready  
**Git Tag:** `v1.76.0`  

### Major Capabilities Delivered in v1.76.0

#### 1. Universal Report Calculation & Intelligence Engine
- **Core Principle:** *"Every important report must explain WHAT happened, HOW MUCH, HOW IT WAS CALCULATED, COMPARED TO WHAT, WHY IT MATTERS, AND WHAT ACTION IS REQUIRED."*
- **Mathematical Framework (`SafeMath`):** Centralized math primitives providing zero-denominator protection, IEEE 754 precision safeguards, period-over-period variance calculation, and arithmetic rounding.
- **Centralized Formula Registry (`CALCULATION_REGISTRY`):** Single Source of Truth cataloging mathematical formulas, LaTeX formulations, data sources, numerator/denominator definitions, inclusion/exclusion rules, and narrative breakdown templates.
- **"How It Was Calculated" Provenance Modal:** Accessible directly from summary KPI cards across all reports. Inspects exact formulas, raw numerator/denominator numbers, included/excluded records, and plain-English narratives.
- **Deterministic Decision Insights:** Algorithmic performance analysis categorized into Critical (urgent action required), Warning (approaching threshold), Positive (healthy/on-track), and Info. Includes direct deep-links to operational workspaces.
- **Institutional Benchmark Governance:** View-first configuration modal allowing authorized administrators (`admin`, `sysadmin`, `principal`) to calibrate operational targets (Attendance %, Fee Collection %, Homework %, Exam Pass %, Batch Occupancy %) under Rule 010 governance.
- **Full Catalog Coverage:** Expanded to **26 enterprise reports** across Students, Academics, Fees, Workforce, Examinations, and System Audit.
- **Contextual Export Engine:** Excel (`.xlsx`) and CSV exports preserve calculation provenance, institutional benchmark notes, and footer compliance.

#### 2. Unified Homework & Assignment Management System
- **Core Principle:** *"One assignment, multiple recipients, independently tracked student records."*
- **Multi-Batch & Selective Targeting:** Assign to entire batches, multiple divisions, selected student cohorts, or individual students.
- **7 Submission Methods:** Physical Notebook, Photograph Upload, PDF Document, Online Text, Online Quiz, In-Class Completion, and No Submission.
- **Teacher Checking Register:** Real-time register with status tracking (`assigned`, `submitted`, `checked`, `overdue`, `excused`), marks entry, personalized feedback remarks, and resubmission request workflows.
- **Student Portal Integration:** Personalized "My Homework" tab with submission uploads, teacher feedback, and due-date countdowns.
- **Teacher Operational Dashboard:** Assigned today, active assignments, pending checks, and overdue submission counts.
- **Daily Homework Checking Register Report:** Institution-wide compliance register tracking submission turnaround and checking velocity.

---

## 📜 HISTORICAL VERSION TIMELINE & RELEASE ARCHIVE

### v1.73.0 — Container-Host Decoupling & Manifest Runtime Sync
**Release Date:** 2026-11-10  
**Build:** `2026.11.10-REV-133-v1.73.0-90AA776`  
- Host-side release manifest generation (`backend/app/release_manifest.json`) bridging isolated Docker containers with host Git metadata.
- Automated database synchronization (`SystemRelease`) via standard-input Docker pipes.
- Fixed container-side Git command failure fallbacks in `ReleaseService`.
- 100% synchronization of active versions between Docker backend, Vite frontend, and database.

### v1.72.1 — Concession Scheme Settings & Ledger Governance
**Release Date:** 2026-11-10  
**Build:** `2026.11.10-REV-132-v1.72.1-D28473B`  
- Concession Scheme configuration workspace with category-based discount thresholds.
- Duplicate scheme prevention and duplicate allocation protection.
- Reconciled concession ledger transparency and historical fee adjustments.

### v1.70.0 — Centralized Concessions Workspace & Approval Engine
**Release Date:** 2026-11-10  
**Build:** `2026.11.10-REV-129-v1.70.0-7AEA2F2`  
- Dual-workflow concession application (Instant Administrator Apply vs Teacher/Staff Draft Submission).
- Full audit logging on approvals, rejections, and adjustments.
- Net fee recalculation with automatic invoice line-item balancing.

### v1.60.0 — Global Sovereign Trim & Brand Harmonization
**Release Date:** 2026-11-09  
**Build:** `2026.11.09-REV-110-v1.60.0-D0948F3`  
- Executive Collegiate Crest, Top Sovereign Trim, and Official Verification Seal across official documents.
- Distributed single-row bottom-pinned footer with software attribution.
- Dynamic theme synchronization across charts, statcards, and sidebar active states.
- Reversible unsaved tenant branding preview mode.

### v1.52.0 — Global Safe Delete & Ledger Immutability Policy (Rule 010)
**Release Date:** 2026-11-09  
**Build:** `2026.11.09-REV-092-v1.52.1-E11B82E`  
- Non-negotiable Global View-First state governance across all application pages.
- Mandatory two-stage modal confirmation for record mutations and deletions.
- Historical financial transaction immutability: posted receipts and invoices are never hard-deleted; reversals generate offsetting debit/credit ledger entries.

### v1.50.0 — Executive Multi-Tab Dashboard & Adaptive Navigation
**Release Date:** 2026-11-08  
**Build:** `2026.11.08-REV-080-v1.50.0-F836F86`  
- Executive Analytics Dashboard featuring Academic, Financial, Enrollment, and Workforce tabs.
- User-defined adaptive sidebar navigation with pinned favorites and recent visit history.
- Drill-down receivables and revenue projection analytics.

### v1.40.0 — CodeX Privacy & Obfuscation Studio
**Release Date:** 2026-11-07  
- DPDP Act 2023 compliant data protection engine.
- Role-scoped privacy masking for student phone numbers, addresses, and financial ledgers.
- System default: Opt-in only (system default disabled).

### v1.30.0 — Workforce Lifecycle & Faculty Payroll Accounting
**Release Date:** 2026-11-06  
- Complete teacher profile, subject allocations, and teaching timetable slots.
- Instructional teaching session tracking with delivery hour reconciliation.
- Monthly payroll register generation with base salary, hourly delivery compensation, and disbursement vouchers.

### v1.20.0 — Lead Management CRM & Conversion Pipeline
**Release Date:** 2026-11-05  
- Multi-stage enquiry Kanban pipeline (Inquiry, Counselling, Demo Class, Enrolled, Lost).
- Follow-up queue with SLA reminders and counselling logs.
- Source attribution and conversion performance analytics.

### v1.10.0 — Canonical Subject Master & Curriculum Bridge
**Release Date:** 2026-11-04  
- Single Source of Truth for academic subjects eliminating grade-duplicated records.
- Standard-to-Subject mapping bridge supporting state and national boards (CBSE, ICSE, Maharashtra State Board).

### v1.4.0 — Deep System Audit, Security & Performance Hardening
**Release Date:** 2026-11-04  
- Access token expiration shortened to 60 minutes with safe origin checking.
- Rate limiting with `slowapi` on `/auth/login`.
- Database query indexing across 7 tables and composite foreign keys.
- Frontend bundle code-splitting via React `lazy` and `Suspense`.

### v1.0.0 — Production-Ready Foundation Baseline
**Release Date:** 2024-01-01 / 2026-11-03  
- Multi-Tenant Academic Hierarchy (Institutions, Academic Years, Standards, Divisions).
- Student Lifecycle (Multi-step admission, demographic profiles, enrollment tracking).
- Financial Ledger (Fee structures, installment schedules, multi-mode collections, immutable sequential receipts).
- Attendance Management (Class roster check-in, absence alerts).
- RBAC Security (OAuth2 Password Bearer, JWT, role authorization).

---

## 📊 REVISION & AUDIT METRICS SUMMARY

- **Total Historical Revisions:** 137 tasks / commits
- **Features Completed:** 76 (Minor bumps)
- **Patches & Fixes:** 61 (Patch bumps)
- **Database Tables:** 80 active tables
- **Total Registered Documents:** 402 documents (100% validated, 0 blocking errors)
- **Source Code Header Compliance:** 524 / 524 files (100% compliant)
- **Target Architecture:** Python 3.11+ / FastAPI / SQLAlchemy Async / PostgreSQL 16 / React 18 / Vite / Tailwind CSS

