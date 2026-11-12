# Changelog — PrathamOne EduOS
All notable changes to **PrathamOne EduOS** (Coaching Institute Edition) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.88.0] - 2026-11-12
### Added
- **PrathamOne EduBoard — Interactive Teaching & Digital Classroom Engine, Collapsible Workspace, Immersive Full-Screen Greenboard & Detached Pop-Out Live Sync**:
  - **Three Workspace Display Modes (`Standard`, `Focus`, `Immersive Full-Screen`)**: Added `useEduBoardDisplayStore` + `Layout.tsx` shell chrome controls supporting independently collapsible `Pages` & `Saved Lecture Boards` panels, Focus slide-over drawers, native browser Fullscreen API + viewport fallback (`Escape` exit), and active tool retention across mode switches.
  - **Classroom Greenboard, Blackboard & Collapsible/Dockable Toolbar (`EduBoardCanvas.tsx`, `EduBoardToolbar.tsx`)**: Added textured classroom Greenboard & Blackboard gradients with chalk ledge, readable chalk palette (`White`, `Yellow`, `Pink`, `Blue`, `Green`) with automatic light/dark polarity switching, dual-pass chalk strokes, Fit-to-Screen (`0`), keyboard shortcuts, and 3×5 toolbar states (`Expanded`, `Compact`, `Hidden` / `Top`, `Left`, `Right`, `Bottom`, `Floating`).
  - **Preference Inheritance Hierarchy (`/api/v1/eduboard/preferences`)**: Implemented `System -> Institution -> Individual` display settings using `InstitutionSetting` (`eduboard_user_pref`) with Admin policy locks (`allow_user_display_overrides`, `allow_collaborator_mode`, `allow_popout_window`) and user Reset to Institution Default.
  - **Detached Pop-Out Window & Real-Time Multi-Tab Sync (`EduBoardWindowPage.tsx`, `EduBoardPopoutMenu.tsx`, `useEduBoardSync.ts`, `eduboard_realtime.py`)**: Added chromeless `/eduboard/window` route, 6 launcher actions, short-lived scoped `eduboard_popout` / `eduboard_ws` tokens (never exposing login JWTs in URLs), Presentation Read-Only server/WS enforcement, tenant/env isolation, `nginx.conf` `ws: wss:` CSP allowlist, and bidirectional `BroadcastChannel` + WebSocket sync.
- **Help & About Centre Coverage Update**:
  - Added **EduBoard Interactive Classroom** (`eduboard`) to canonical product modules (`20` modules total) and contextual route resolution (`/eduboard` -> `guide-eduboard`).
  - Added `guide-eduboard` (Module User Guide), `tutorial-eduboard-classroom` (Greenboard, Focus Mode & Projector Pop-Out Tutorial), updated `guide-homework` (`doc_version 1.1` for Phase 1–15 enhancements), updated `tutorial-receipt-generation` & `faq-printing-problems` (`doc_version 1.1` for A5 Compact / A4 Portrait Print & PDF export parity), added `Konva`, `perfect-freehand`, and `PDF.js` credits to `third-party-acknowledgements` (`doc_version 1.1`), and added automatic `is_system` `doc_version` baseline syncing in `HelpService.ensure_seeded`.

### Fixed
- **Fee Receipt Printing (`@media print`) & PDF Export Parity (`A5 Compact` / `A4 Portrait`)**:
  - Fixed global `@media print` rules in `index.css`, `printReceipt.ts`, and `PaymentReceiptView.tsx` so `<header class="receipt-header print-header">` and `#print-root` remain visible inside the isolated print iframe, eliminated duplicate fallback `"PA"` crest visibility alongside the academy crest `<img>`, matched preview typography (`16px` root, `30px` hero amount) without shrinking, and respected `A5` (`148×210mm`) vs `A4` (`210×297mm`) sheet sizing.
  - Updated `ReceiptPdfService` and `/api/v1/payments/receipts/{receipt_number}/pdf` (`payments.py`) to embed the Prashant Academy crest logo PNG and tagline by default matching the software preview, wrap complete multi-line addresses, render vector badges/donut arcs cleanly, and support `paper_size=A5|A4`.
- **Fees Workspace & CSP Runtime Fixes**:
  - Extracted pre-hydration brand theme initializer into external `/prehydrate-brand.js` (`frontend/public/prehydrate-brand.js`) for strict CSP compliance without inline script violations.
  - Guarded potentially undefined enum fields (`benefit_type`, `status`, `category`, `funding_source`) before `.replace(...)` in `Fees.tsx` concession/scholarship tables.

## [1.88.0-rc.1] - 2026-11-12
### Added
- **PrathamOne EduBoard — Interactive Teaching & Digital Classroom Engine (`046_create_eduboard_tables`)**:
  - **Database Schema & RBAC (`edu_boards`, `edu_board_pages`, `edu_board_revisions`, `edu_board_attachments`)**: Added versioned multi-page lecture board models linked to `teaching_sessions`, `divisions`, `subjects`, `academic_years`, and `institutions` with strict `is_demo` (`PRODUCTION` vs `TRAINING`) isolation and seeded `eduboard` permissions (`view`, `create`, `edit`, `delete`, `publish`, `download`, `manage_templates`, `collaborate`).
  - **Backend Domain Service & API (`/api/v1/eduboard/*`)**: Implemented `EduBoardService` and REST router with teacher/institution scope enforcement, optimistic concurrency (`409 Conflict` revision guard + force overwrite option), immutable revision snapshots & restore, authenticated PDF/image attachment storage (`25 MB` max, `.pptx`/non-allowlisted extension rejection), PyMuPDF slide rendering & non-destructive annotated PDF export, `CommunicationLog` publish alerts, `AuditLog` audit entries, and `/api/v1/eduboard/reports/summary` analytics (also exposed at `/api/v1/reports/eduboard-summary`).
  - **Frontend Interactive Canvas & Workspace (`EduBoardCanvas.tsx`, `EduBoardWorkspace.tsx`, `eduboardRecovery.ts`)**: Built multi-surface canvas (`Classic Chalk/Greenboard`, `Digital Whiteboard`, `Presentation PDF Board`) powered by Konva, `react-konva`, `perfect-freehand`, and `pdfjs-dist` with touch/stylus pressure, Undo/Redo, shapes/text/eraser, Rule 010 View-First Edit Mode governance (`EditModeBar`), scoped IndexedDB crash recovery (purged on logout), and deep-link launch from `TeacherManagement`, `TeacherPayroll`, `Sidebar`, and read-only Student Portal (`StudentDashboard`).
  - **PWA & Infrastructure Hardening**: Added `.mjs` (`application/javascript`) MIME handling in `frontend/nginx.conf` for `pdfjs-dist` worker scripts and bumped Service Worker cache bucket (`prathamone-cache-v1.3.0`) in `frontend/public/sw.js`. Note: native PPT/PPTX conversion remains deferred (requires `python-pptx`/LibreOffice).

## [1.87.0] - 2026-11-12
### Added
- **Homework & Assignment Management Enhancement (Phases 1–15)**:
  - **Schema & Migration (`045_homework_enhancement`)**: Added assignment snapshot (`original_recipient_count`), late-joiner inclusion policy (`late_joiner_policy`), `estimated_duration_minutes`, configurable `assignment_types`, per-student overrides (`custom_due_date`, `custom_instructions`, `custom_attachments`), recipient addition audit (`is_late_addition`, `addition_reason`), view tracking (`viewed_at`), versioned student submissions (`submission_version`, `submission_history`), teacher feedback attachments & evaluation history (`teacher_feedback_attachments`, `evaluation_history`), and separated `homework:publish`, `homework:evaluate`, `homework:reports`, `homework:settings` permissions.
  - **Backend API & Service Extensions**:
    - Secure file upload and isolated download endpoints (`/api/v1/homework/files/upload`, `/api/v1/homework/files/{file_id}/download`) validating MIME type, extension allowlist, size limit (`max_file_size_mb`), and tenant/student ownership.
    - Recipient preview (`/api/v1/homework/recipients/preview`), student search (`/api/v1/homework/students/search`), draft publish/close/reopen, manual late-joiner sync (`/sync-late-joiners`), and automatic enrollment hook in `students.py`.
    - Deduplicated `IN_APP` notifications via `CommunicationLog` (`HW_%` event keys) and reminder sweep (`/api/v1/homework/reminders/run`).
    - Student Homework Dashboard (`/api/v1/homework/dashboards/student`), Batch Report (`/api/v1/homework/reports/batch/{assignment_id}`), Institute Homework Analytics (`/api/v1/homework/reports/analytics`), and Admin Settings (`/api/v1/homework/settings`).
    - Fixed Checking Register `search`/`review_status` optional params on internal calls and normalized custom attachment ID binding.
  - **Frontend UI & Governance**:
    - Teacher Workspace quick-launch entry (`TeacherManagement.tsx` + `TeacherPayroll.tsx`) routing into `/homework/*` tabs under Rule 010 View-First Edit Mode.
    - Refactored `HomeworkWorkspace.tsx` + modular components (`HomeworkCreateForm.tsx`, `HomeworkSubmissionsTab.tsx`, `HomeworkTemplatesTab.tsx`, `HomeworkReportsAndSettingsTab.tsx`) with Excel (`.xlsx`) & CSV exports via `write-excel-file`.
    - Extended Student Portal `My Homework` tab (`StudentDashboard.tsx`) with 6 Student KPIs, unread notifications, downloadable attachments/feedback, auto `markViewed`, file uploads, and versioned submission history.

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

