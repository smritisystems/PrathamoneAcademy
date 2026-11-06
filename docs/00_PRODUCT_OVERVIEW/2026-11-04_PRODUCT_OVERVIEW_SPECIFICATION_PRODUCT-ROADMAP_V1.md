---
title: "Strategic Product Roadmap — Prashant Academy"
module: "00_PRODUCT_OVERVIEW"
category: "SPECIFICATION"
document_type: "SPECIFICATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-04"
updated_date: "2026-11-04"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["00-product-overview", "specification"]
entities: ["InstituteSetting"]
api_routes: ["/api/v1/system/info"]
related_modules: []
---

# Strategic Product Roadmap — Prashant Academy

**Current Version**: 1.0.0 (Production-Ready School Management Core)  
**Maintained By**: Domain Architect & Engineering Team  
**Status**: ACTIVE  

---

## 1. Feature Status Legend
- `[IMPLEMENTED]`: Tested, working, and present in the codebase.
- `[IN PROGRESS]`: Currently under active test or documentation update.
- `[PLANNED]`: Scheduled for subsequent releases; requires Owner approval on pending PDRs.

---

## 2. Release Milestones

### Milestone 1: School Management System Core (v1.0.0) — `[IMPLEMENTED]`
- [x] Multi-tenant Institution & Academic Year configuration
- [x] Standards (Std 1–12) & Divisions (A, B, C...) structure
- [x] Student registration with unique Admission IDs (`PA-YYYY-NNNNNN`)
- [x] Comprehensive Guardian details & contact tracking
- [x] Academic enrollments by academic year and division
- [x] Immutable Fee Invoices with Line Items & Installment Schedules
- [x] Multi-payment processing (Cash, UPI, Cheque, Bank Transfer)
- [x] Canonical 3-payment allocation verification (₹24k -> ₹5k + ₹7k + ₹4k -> ₹8k outstanding)
- [x] Unique, sequential, printable fee receipts
- [x] Payment reversals with reason recording and automatic balance restoration
- [x] Bulk daily attendance marking with present/absent/late/half-day statuses
- [x] Financial & academic reports with CSV/Excel export
- [x] User management with JWT authentication and role authorization
- [x] Docker Compose multi-container deployment (Postgres, FastAPI, React/Nginx)
- [x] Automated test suite (Pytest integration + Vitest unit)

---

### Milestone 2: Coaching Institute Hierarchy Extension (v1.1.0) — `[IMPLEMENTED]`
- [x] `boards` entity (ICSE, CBSE, SSC / State Board)
- [x] Standards & Levels (Standards 8, 9, 10)
- [x] Batches / Divisions mapped to Boards and Standards (`ICSE X`, `CBSE X`, `ICSE IX`, `ICSE VIII`, `SSC IX`)
- [x] Fee Register Import utility for historical registers with reconciliation and zero data loss
- [x] 39 active enrolled students correctly partitioned across boards and classes

---

### Milestone 3: Real-Time Communication & Automation (v1.2.0) — `[PLANNED]`
- [ ] WhatsApp & SMS Gateway Integration for instantaneous attendance alerts
- [ ] Automated overdue fee reminder queue (3 days before due date, 1 day after)
- [ ] Email delivery of PDF fee receipts directly to guardians
- [ ] Nightly cron automation for late fee assessments (PDR-005)

---

### Milestone 4: Examination & Analytical Report Cards (v1.3.0) — `[IMPLEMENTED]`
- [x] Examination & Exam Marks schema and test performance tracking
- [x] Subject-wise marks recording, percentage, letter grades, and performance remarks
- [x] Student scorecard visualization on student portal and administrative profile
- [ ] Printable PDF graphical report cards with historical trendlines

---

### Milestone 5: Student & Parent Self-Service Portals (v2.0.0) — `[IMPLEMENTED]`
- [x] Responsive 8-Tab Student Dashboard (`/student/dashboard`, `/student-portal`): Home, My Classes, Timetable, Attendance, Tests & Results, Fees, Study Materials, Profile
- [x] Responsive 8-Tab Admin/Teacher Student Profile (`/students/:id`): Overview, Enrollment, Classes, Attendance, Tests, Fees, Documents, Activity
- [x] Strict student data isolation enforcing `user.student_id` binding for student roles
- [x] Read-only fee protection ensuring immutable fee transactions
- [x] Student identity documents upload, verification, and deletion
- [x] Study materials repository with downloadable subject notes and syllabi
- [x] Administrator student switcher for previewing student portal experience
- [ ] Online payment gateway integration (Razorpay / Cashfree / Stripe)
- [ ] Digital student ID cards with QR code attendance scanning

