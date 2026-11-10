---
title: "Release Notes v1.76.0 — Homework Management & Universal Report Intelligence"
module: "19_RELEASES_CHANGELOG"
category: "CHANGELOG"
document_type: "CHANGELOG"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.76.0"
doc_version: "1.0"
created_date: "2026-11-11"
updated_date: "2026-11-11"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["releases", "v1.76.0", "homework", "reports", "intelligence", "governance"]
entities: ["HomeworkAssignment", "ReportIntelligenceService", "SystemRelease"]
api_routes: ["/api/v1/homework", "/api/v1/reports/intelligence", "/api/v1/releases"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "11_REPORTS_EXPORTS", "19_RELEASES_CHANGELOG"]
---

# Release Notes — PrathamOne EduOS v1.76.0
**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Release Title:** Production Release v1.76.0 — Academic Homework & Universal Report Intelligence  
**Release Date:** 2026-11-11  
**Build Identifier:** `2026.11.10-REV-137-v1.76.0-C31CC0B`  
**Status:** General Availability (GA)  
**Target Environment:** Production  
**Product Architect:** Jawahar R. Mallah  
**Organization:** AITDL — AI Technology & Development Lab  

---

## 1. Executive Summary

Release **v1.76.0** introduces two landmark capabilities to **PrathamOne EduOS**:
1. **Universal Report Calculation & Intelligence Engine**: Eliminates black-box reporting across all 26 canonical institutional reports with audited mathematical formulas, LaTeX formulations, zero-division safe math, deterministic decision insights, and an interactive "How It Was Calculated" Provenance Modal.
2. **Unified Homework & Assignment Management System**: A complete academic lifecycle subsystem allowing teachers to assign tasks across batches and selective cohorts, support 7 distinct submission methods, maintain a live checking register, request resubmissions, and track completion turnaround.

---

## 2. Key Features & Architectural Changes

### 2.1 Universal Report Calculation & Intelligence Engine
- **Safe Math Foundation (`SafeMath`)**: Centralized math primitives eliminating division-by-zero crashes, floating-point precision drifts, and unhandled `None` records.
- **Centralized Formula Registry (`CALCULATION_REGISTRY`)**: Complete SSOT mapping of all formulas, LaTeX representations, numerator/denominator descriptions, inclusion/exclusion rules, and narrative explanation templates.
- **`ReportIntelligenceService`**: Real-time domain calculations for Attendance %, Fee Realization %, Defaulters, Homework Completion %, Batch Seating Occupancy %, Exam Pass %, Teaching Delivery Hours, and Student Attrition.
- **`ReportIntelligenceBanner.tsx`**: Universal UI component embedded into all reports displaying:
  - Summary KPI statcards with unit, status badge (Critical, Warning, Positive, Neutral), and variance vs target.
  - Actual vs Target comparison progress bars.
  - Deterministic decision insights answering What Happened, Why It Matters, and Action Required with operational deep-links.
  - Clickable "How It Was Calculated" modal showing exact mathematical formulas and raw included/excluded record counts.
- **Institutional Benchmark Governance**: View-first threshold configuration modal under Rule 010 governance.
- **Expanded Report Catalog**: Full coverage of 26 enterprise reports in `REPORT_CATALOG` (`Reports.tsx`).
- **Contextual Export Engine**: Excel (`.xlsx`) and CSV exports preserve calculation provenance, institutional benchmark notes, and footer compliance.

### 2.2 Unified Homework & Assignment Management System
- **Database Schema**: Alembic migration `040_create_homework_and_assignment_tables.py` creating `homework_assignments`, `student_homework_records`, and `homework_audit_logs`.
- **Assignment Creation Engine**: Multi-batch, single batch, selective student, and student group assignment creation.
- **7 Submission Methods**: Physical Notebook, Photograph Upload, PDF Document, Online Text, Online Quiz, In-Class, and No Submission.
- **Checking Register**: Teacher checking register with status tracking (`assigned`, `submitted`, `checked`, `overdue`, `excused`), marks entry, personalized feedback remarks, and resubmission request workflows.
- **Student Portal**: Personalized "My Homework" tab with submission uploads, teacher feedback, and due-date countdowns.
- **Teacher Operational Dashboard**: Assigned today, active assignments, pending checks, and overdue submission counts.
- **Daily Homework Checking Register Report**: Institution-wide compliance register tracking submission turnaround and checking velocity.

---

## 3. Verification & Compliance Sign-Off

- **Backend Pytest Suite**: 5/5 passed in `test_report_intelligence.py`; 8/8 passed in `test_homework_system.py`.
- **Frontend Vitest Suite**: 4/4 passed in `ReportIntelligence.test.tsx`; 5/5 passed in `HomeworkWorkspace.test.tsx`; 5/5 passed in `ReportingCentre.test.tsx`.
- **Frontend Production Build**: Built in 1m 26s with zero TypeScript compilation errors.
- **Corporate Header Compliance**: 524/524 files verified (100% compliant).
- **Documentation Integrity**: 402 documents validated with 0 blocking errors and 0 advisory warnings.
