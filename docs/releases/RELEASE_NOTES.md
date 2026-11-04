# Release Notes — Prashant Academy

## Version 1.4.0 — Deep System Audit, Security & Performance Hardening
**Release Date**: 2026-11-04  
**Status**: General Availability (GA)

### 🛡️ Security, Reliability & Performance Improvements
- **Security Hardening (C-1, C-4, H-1, H-9)**:
  - Startup `SECRET_KEY` validator in `config.py` preventing insecure defaults in production.
  - Access token expiration shortened to 60 minutes with safe origin checking.
  - Rate limiting with `slowapi` (`5/minute` on `/auth/login` to prevent credential stuffing).
  - Strict Role-Based Access Control (RBAC) enforced on write and administrative endpoints across `/users`, `/fees`, `/payments`, and `/students`.
- **Database & Query Performance (C-2, C-3, H-4, M-11)**:
  - Alembic migration `005_division_name_and_indexes` widening `divisions.name` from `VARCHAR(10)` to `VARCHAR(100)`.
  - Added 7 composite and foreign key database indexes (`attendances`, `exam_marks`, `payment_allocations`, `student_enrollments`, `fee_invoices`, `payments`).
  - Corrected attendance aggregation semantics in `student_portal.py` using `case(...)` instead of inverted `nullif(...)`.
  - Fixed timetable ordering to prioritize today's active classes.
  - Replaced TOCTOU race conditions in invoice and receipt generation with cryptographic UUID entropy.
- **Frontend Architecture & Optimization (H-5, H-6, M-6)**:
  - Frontend bundle code-splitting via React `lazy` and `Suspense` (reduced single 1 MB chunk to modular chunks under 395 kB, core shell 311 kB).
  - Added `ErrorBoundary` and `NotFound` 404 pages.
  - Fixed HTML title branding from school to coaching institute management system.
- **Financial Integrity Verification**:
  - Full financial integrity confirmed on live database: ₹29,35,000.00 total fees, ₹18,19,500.00 collected, ₹11,15,500.00 outstanding across 39 students and 170 payment records.

## Version 1.0.0 — Production-Ready Foundation Release
**Release Date**: 2024-01-01  
**Status**: General Availability (GA)  

### 🚀 Highlights & Features Implemented
- **Multi-Tenant Academic Hierarchy**: Full support for Institutions, Academic Years (2024-25), Standards 1 through 12, and Divisions A & B.
- **Student Lifecycle**:
  - Multi-step student registration form.
  - Unique system-generated admission numbers (`PA-YYYY-NNNNNN`).
  - Full guardian contact, address, and demographic profiles.
  - Academic enrollment tracking by academic year and division.
- **Financial Ledger & Fee Accounting**:
  - Fee Categories (Tuition, Admission, Exam, Transport, Library, etc.).
  - Fee Structures with frequencies (Monthly, Quarterly, Annually, Custom).
  - Immutable Fee Invoices with Line Items and scheduled Installments.
  - Multi-payment collection supporting Cash, UPI, Cheque, and Bank Transfer.
  - Partial payments against installment schedules.
  - Canonical 3-payment allocation verification (₹24k -> ₹5k + ₹7k + ₹4k -> ₹8k outstanding).
  - Official sequential receipt generation (`RCP-{AY}-{SEQ}`) with printable view.
  - Audited payment reversals with balance restoration and double-reversal protection.
- **Attendance Management**:
  - Class-wise roster bulk attendance marking.
  - Present, Absent, Late, and Half-day statuses.
  - Attendance analytics and absence alert notifications.
- **Reporting & Reconciliation**:
  - Fee collection reports with collection percentages.
  - Outstanding dues tracking with due dates and invoice statuses.
  - Payment method breakdown analytics.
  - Real-time CSV and Excel data export.
- **Security & User Management**:
  - OAuth2 Password Bearer authentication with JWT and bcrypt hashing.
  - Role-based authorization for Super Admin, Admin, Accountant, Counselor, Coordinator, Teacher, and Staff.
  - Full transactional audit logging.
- **Operations & Tests**:
  - Docker Compose orchestration with PostgreSQL 16, FastAPI, and Nginx.
  - Comprehensive Pytest test suite covering full, partial, overpayment, and reversal scenarios.
  - Vitest test suite for React frontend components.

