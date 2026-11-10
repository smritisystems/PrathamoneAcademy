# Changelog — PrathamOne EduOS
All notable changes to **PrathamOne EduOS** (Coaching Institute Edition) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.76.0] - 2026-11-10
### Added
- **Universal Report Calculation & Intelligence Engine**:
  - `SafeMath` calculation primitives with zero-denominator protection and precision rounding.
  - Centralized formula registry cataloging formulas, data sources, numerators, denominators, and plain-English breakdown narratives.
  - `ReportIntelligenceService` generating dynamic metrics for Attendance, Fees, Defaulters, Homework, Seating Occupancy, Exams, and Attrition.
  - REST endpoints at `/api/v1/reports/intelligence` for definitions, live metrics, and thresholds.
  - `ReportIntelligenceBanner.tsx` component with summary KPI statcards, variance pills, and actual-vs-target comparison bars.
  - Clickable "How It Was Calculated" modal showing exact mathematical formulas and raw included/excluded record counts.
  - Deterministic decision insights panel with Critical, Warning, Positive, and Info alerts and operational deep-links.
  - Institutional benchmark threshold configuration modal under Rule 010 View-First governance.
  - Expanded `REPORT_CATALOG` in `Reports.tsx` to 26 enterprise reports including `homework-register` and `crm-enquiries`.
  - Excel and CSV export enhancement including calculation notes and benchmark definitions.
- **Unified Homework & Assignment Management System**:
  - Alembic migration `040_create_homework_and_assignment_tables.py` creating `homework_assignments`, `student_homework_records`, and `homework_audit_logs`.
  - Core domain models `HomeworkAssignment`, `StudentHomeworkRecord`, and `HomeworkAuditLog`.
  - `HomeworkService` supporting batch, multi-batch, selected student, individual student, and student group assignments.
  - 7 submission methods: Physical Notebook, Photograph Upload, PDF Document, Online Text, Online Quiz, In-Class, and No Submission.
  - Checking register API endpoints supporting bulk check, marks entry, teacher remarks, and resubmission requests.
  - Teacher operational dashboard (`TeacherHomeworkDashboard`) and student personal activity register.
  - `HomeworkWorkspace.tsx` frontend page with Assignment Manager, Teacher Checking Register, Student Submission Portal, and Templates.
  - Sidebar and navigation integration under Academics workspace.
- Backend test suites `test_homework_system.py` (8/8 passed) and `test_report_intelligence.py` (5/5 passed).
- Frontend Vitest test suites `HomeworkWorkspace.test.tsx` (5/5 passed) and `ReportIntelligence.test.tsx` (4/4 passed).

## [1.73.0] - 2026-11-10
### Added
- Host-side release manifest generation (`release_manifest.json`) in `scripts/auto_version.py`.
- Automated container database synchronization via standard-input Docker pipes.
### Changed
- Containerized runtime fallback in `ReleaseService` reading metadata directly from manifest.
- Aligned version sources across root `package.json`, `frontend/package.json`, `backend/app/core/config.py`, and `frontend/src/config/branding.ts`.

## [1.72.1] - 2026-11-10
### Added
- Concession Scheme Settings workspace and Add Scheme modal.
- Duplicate scheme prevention and duplicate allocation protection.
### Fixed
- Concession ledger balance transparency and fee adjustment reconciliations.

## [1.70.0] - 2026-11-10
### Added
- Centralized fee concession and scholarship management workspace.
- Dual-workflow application engine (Instant Admin Apply vs Staff Submission).
- Immutable fee concession allocation ledger with reversal safeguards.

## [1.60.0] - 2026-11-09
### Added
- Official Executive Collegiate Crest, Top Sovereign Trim, and Verification Seal.
- Distributed single-row bottom-pinned footer across all screen viewports.
- Institute brand theme color synchronization across charts, statcards, and navigation.

## [1.52.0] - 2026-11-09
### Added
- Rule 010 Global View-First state governance across all application pages.
- Mandatory two-stage modal confirmation for record updates and deletions.
- Historical financial transaction immutability policy (no hard-deletions on posted records).

## [1.50.0] - 2026-11-08
### Added
- Multi-Tab Executive Dashboard (Academic, Financial, Enrollment, Workforce).
- User-defined adaptive sidebar navigation with pinned favorites and recent visit history.
- Real-time receivables aging and revenue projection analytics.

## [1.40.0] - 2026-11-07
### Added
- CodeX Privacy Engine for DPDP Act 2023 compliance.
- Role-scoped privacy masking for student phone numbers, addresses, and ledgers.
- System default: Opt-in only (system default disabled).

## [1.30.0] - 2026-11-06
### Added
- Workforce lifecycle tracking, employee dossiers, and subject allocations.
- Instructional teaching session logger and delivered hour reconciliations.
- Monthly faculty payroll register and payment voucher disbursements.

## [1.20.0] - 2026-11-05
### Added
- Lead Management CRM with multi-stage Kanban enquiry pipeline.
- Follow-up queue with SLA reminders and counselling activity logs.
- Lead source attribution and conversion analytics.

## [1.10.0] - 2026-11-04
### Added
- Canonical Subject Master eliminating standard-duplicated records.
- Standard-to-Subject mapping bridge supporting state and national boards.

## [1.4.0] - 2026-11-04
### Security
- Startup `SECRET_KEY` validator preventing insecure defaults.
- Access token expiration shortened to 60 minutes with safe origin checking.
- Rate limiting with `slowapi` on `/auth/login`.
- Database query indexing across 7 tables and composite foreign keys.
- Frontend bundle code-splitting via React `lazy` and `Suspense`.

## [1.0.0] - 2024-01-01
### Added
- Foundational multi-tenant academic coaching management architecture.
- Student admission, demographic profiles, and division enrollment.
- Fee structures, installment schedules, multi-mode collections, and sequential receipts.
- Class-wise attendance marking and absence notifications.
- OAuth2 Password Bearer authentication with JWT and RBAC.
