---
title: "PrathamOne EduOS — Global Testing and Deployment Status Report"
module: "20_AUDITS_COMPLIANCE"
category: "REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-07"
updated_date: "2026-11-07"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags:
  - "testing-status"
  - "deployment-status"
  - "docker-verification"
  - "ci-cd"
entities:
  - "Institution"
  - "Student"
  - "Payment"
api_routes:
  - "/health"
  - "/api/v1/*"
related_modules:
  - "02_INSTALLATION_DEPLOYMENT"
  - "18_TESTING_QA"
  - "20_AUDITS_COMPLIANCE"
---

# PrathamOne EduOS — Global Testing and Deployment Status Report

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R. Mallah  
**Organization:** AITDL — AI Technology & Development Lab  

---

## 1. AUTOMATED TEST SUITE STATUS

The application maintains comprehensive automated test coverage spanning unit, integration, and security layers.

### 1.1 Backend Test Suites (Pytest)
Executed inside the `prashant_academy_backend` Docker container:
- `tests/test_global_training_environment.py`: **6 / 6 tests passing** (Tenant isolation, baseline contents, reporting governance, dependency-aware reset, production protection, RBAC).
- `tests/test_lead_management_crm.py`: **11 / 11 tests passing** (Sequential numbering, metrics summary, Kanban pipeline, dossier detail, stage update, follow-ups, demo classes, lead conversion, communication SSOT, demo data opt-in).
- `tests/test_universal_print_footer.py`: **5 / 5 tests passing** (Two-row absolute bottom footer alignment, document numbering, metadata persistence).
- `tests/test_canonical_subjects.py`: **8 / 8 tests passing** (Canonical subject SSOT, multi-tenant isolation, standard-specific mappings).
- **Overall Backend Status:** **100% PASS (Zero Failures)**.

### 1.2 Frontend Test Suites (Vitest)
Executed with `vitest run --pool=forks`:
- `src/test/UniversalPrintFooter.test.tsx`: **37 / 37 tests passing** (A4/A5 bottom positioning, pagination counters, confidential strip, branding).
- `src/test/TrainingEnvironment.test.tsx`: **13 / 13 tests passing** (Header interception, banner rendering, demo badge visibility, reset trigger).
- `src/test/LeadManagementCRM.test.tsx`: **5 / 5 tests passing** (Kanban drag-and-drop, filter controls, dossier inspection, conversion CTA).
- `src/test/CanonicalSubjects.test.tsx`: **12 / 12 tests passing** (Standard-to-canonical mappings, unmapped alerts).
- **Overall Frontend Status:** **100% PASS (Zero Failures)**.

---

## 2. PRODUCTION DEPLOYMENT & CONTAINER STATUS

### 2.1 Docker Services Health
All three enterprise tier containers are verified up, healthy, and operational:
1. `prashant_academy_db`:
   - Image: `postgres:16-alpine`
   - Port: `5432`
   - Healthcheck: Passing (`pg_isready -U postgres`)
   - Active Schema: 74 tables, 28 Alembic migrations applied to `028_global_training_environment (head)`.
2. `prashant_academy_backend`:
   - Runtime: Python 3.11+ / FastAPI / AsyncPG / SQLAlchemy
   - Port: `8000`
   - Healthcheck: Passing (`curl http://localhost:8000/health`)
   - Process: Uvicorn ASGI server with connection pooling.
3. `prashant_academy_frontend`:
   - Web Server: Nginx 1.25 Alpine
   - Port: `5173 / 80`
   - Build Artifact: Vite production bundle with manual chunking (`dist/index.html` + hashed assets).

### 2.2 Live Production Data Verification
- **Tenant Scope:** Prashant Academy (`institution_id = 1`, Code: `PA001`).
- **Core Entities:**
  - Active Students: **39**
  - Registered Guardians: **78**
  - Active Enrollments: **70**
  - Historical Payments: **171**
  - Issued Receipts: **171**
  - Attendance Records: **1,365**
  - Exam Marks: **312**
  - Stored Documents: **195**
  - Operational Leads: **0** (Clean production slate).
- **Data Protection:** Zero loss, zero contamination, zero destructive resets.

---

## 3. CORPORATE CODE GOVERNANCE & HEADERS

- Tool: `python scripts/manage_headers.py check`
- Source Files Inspected: **364**
- Passed: **364 (100%)**
- Failed: **0**
- Compliance: 100% adhering to corporate attribution (Jawahar R. Mallah / AITDL).
