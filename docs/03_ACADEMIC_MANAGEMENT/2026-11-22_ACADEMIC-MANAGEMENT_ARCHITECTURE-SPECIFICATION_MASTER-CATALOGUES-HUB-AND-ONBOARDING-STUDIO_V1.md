---
title: "Master Catalogues Hub & Centralized Master Data Management Architecture Specification"
module: "03_ACADEMIC_MANAGEMENT"
category: "ARCHITECTURE-SPECIFICATION"
document_type: "SPECIFICATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-22"
updated_date: "2026-11-22"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["cataloguing", "master-data-management", "mdm", "central-setup", "boards", "standards", "batches", "subjects", "teachers", "students", "ssot"]
entities: ["MasterCatalog", "Board", "Standard", "Division", "CanonicalSubject", "SubjectMapping", "Student", "User", "FeeStructure", "AcademicYear"]
api_routes: ["/api/v1/catalogue/*", "/api/v1/academic/*", "/api/v1/standards/*", "/api/v1/boards/*", "/api/v1/subjects/*", "/api/v1/divisions/*"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "05_TEACHER_MANAGEMENT", "09_FEES_PAYMENTS", "13_SYSADMIN_SETTINGS", "25_BUSINESS_REQUIREMENTS"]
---

# PRATHAMONE EDUOS — MASTER CATALOGUES HUB & CENTRALIZED MASTER DATA MANAGEMENT (MDM) SPECIFICATION

**Document ID:** SPEC-2026-EDUOS-ACAD-016  
**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Baseline Version:** 1.0.0  
**Architect:** Jawahar R Mallah  
**Organization:** Smritisys & AITDL Networks  
**Date:** 2026-11-22  
**Status:** APPROVED & MANDATORY DESIGN DIRECTIVE  

---

## 1. EXECUTIVE SUMMARY & STRATEGIC RECOMMENDATION

### The User Inception
> *"Do we need any cataloging menu in which we add all related to catalogue — e.g. student creations, teacher creations, boards, std or any other master that we can create through this menu, or recommend?"*

### Authoritative Architecture Verdict: **STRONGLY RECOMMENDED (Unified Master Catalogues Hub)**
In an enterprise coaching institute management system, having master creation scattered across 6–8 distinct operational screens creates friction, onboarding confusion, and data inconsistency. However, creating duplicate master tables or uncoordinated parallel forms violates **POL-2026-EDUOS-001 (SSOT)**.

The authoritative solution is a dedicated **"Master Catalogues Hub" (Master Data Management / MDM Center)** that acts as:
1. **The Centralized Master Registry:** A single pane of glass consolidating all canonical masters across Academics, People, Finance, and Operations with live telemetry, record counts, and health status.
2. **The Guided Dependency Onboarding Pipeline:** A visual step-by-step master creation pipeline enforcing strict educational dependency flow.
3. **Master Integrity & Orphan Detection Studio:** Proactively detecting broken relationships (e.g., batches missing boards, unmapped subjects, unassigned students).
4. **Universal Master Quick-Launch Drawer:** A single launcher allowing authorized administrators to register any master entity while respecting View-First & Scoped Edit Mode governance.

---

## 2. CANONICAL MASTER CATALOGUE TAXONOMY

Under **Rule 001 (SSOT)**, **Rule 003 (No Duplicate Master Tables)**, and **Rule 011 (Canonical Master Reuse)**, all master entities fall into five governed catalogue categories:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CENTRALIZED MASTER CATALOGUE REGISTRY                    │
├──────────────────────────────┬───────────────────┬──────────────────────────┤
│ Catalogue Category           │ Canonical Table   │ Authoritative SSOT Role  │
├──────────────────────────────┼───────────────────┼──────────────────────────┤
│ 1. ACADEMIC CATALOGUE        │                   │                          │
│    • Education Boards        │ boards            │ Statutory curricula      │
│    • Standards / Grades      │ standards         │ Canonical Class levels   │
│    • Batches / Divisions     │ divisions         │ Classroom cohorts/shifts │
│    • Canonical Subjects      │ canonical_subjects│ Universal disciplines    │
│    • Subject Mappings        │ subject_mappings  │ Grade/Board syllabus map │
│    • Classrooms & Rooms      │ institution_sett. │ Physical venue capacity  │
├──────────────────────────────┼───────────────────┼──────────────────────────┤
│ 2. PEOPLE & IDENTITY MASTERS │                   │                          │
│    • Students Master         │ students          │ Student identity ledger  │
│    • Teachers & Faculty      │ users (role=teach)│ Canonical faculty master │
│    • Staff & Administrators  │ users (role=staff)│ Canonical workforce      │
├──────────────────────────────┼───────────────────┼──────────────────────────┤
│ 3. FINANCIAL CATALOGUE       │                   │                          │
│    • Fee Categories (Heads)  │ fee_categories    │ Tuition, Lab, Library    │
│    • Fee Structures          │ fee_structures    │ Annual & term fee slabs  │
│    • Concession Schemes      │ fee_concession_ty.│ Scholarship & waiver rules│
├──────────────────────────────┼───────────────────┼──────────────────────────┤
│ 4. TEMPORAL & ASSESSMENT     │                   │                          │
│    • Academic Years (AY)     │ academic_years    │ Operational period (AY)  │
│    • Assessment / Exam Types │ examination_types │ Mid-Term, Unit, Prelim   │
│    • Grading Scales          │ lookups           │ A1, A2, B1, Percentage   │
├──────────────────────────────┼───────────────────┼──────────────────────────┤
│ 5. COMMUNICATION & TEMPLATES │                   │                          │
│    • Notification Templates  │ comm_templates    │ SMS, WhatsApp, Email     │
│    • Document Print Layouts  │ institution_sett. │ Receipts, ID Cards, Certs│
└──────────────────────────────┴───────────────────┴──────────────────────────┘
```

---

## 3. GUIDED MASTER DEPENDENCY PIPELINE (THE ONBOARDING SEQUENCE)

New institutes, branch rollouts, and annual transitions often fail because staff attempt to create entities out of order (e.g., admitting a student before batches or fee structures exist). The Master Catalogues Hub enforces this strict linear dependency sequence:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  GUIDED MASTER CREATION DEPENDENCY FLOW                     │
└─────────────────────────────────────────────────────────────────────────────┘

 Step 1: Academic Year (AY)        Setup active operational calendar (e.g. 2026-27)
   │
   ▼
 Step 2: Educational Boards        Register statutory affiliations (CBSE, ICSE, SSC)
   │
   ▼
 Step 3: Standards / Classes       Register canonical levels (Standard 8, 9, 10, etc.)
   │
   ▼
 Step 4: Canonical Subjects        Register universal disciplines (Maths, Science)
   │
   ├──────────────────────────────► Step 4b: Map Subjects to Boards & Standards
   ▼
 Step 5: Batches & Classrooms      Create classroom sections (10-CBSE-A, Room 102)
   │
   ▼
 Step 6: Faculty & Staff           Register teachers in users & assign to batches
   │
   ▼
 Step 7: Fee Structures            Define tuition fee packages per standard/board
   │
   ▼
 Step 8: Student Admissions        Admit students, allocate batches, issue invoices
```

---

## 4. ARCHITECTURAL DESIGN: "MASTER CATALOGUES HUB" WORKSPACE

### 4.1 Route & Sidebar Integration
- **Route:** `/catalogue` (or `/academic/catalogue` / `/admin/catalogue`)
- **Sidebar Module:** Under `core` / `academic`, labeled **"Master Catalogues Hub"** (Icon: `FolderTree` or `Layers` or `BookOpen`).
- **Access Control:** `admin`, `principal`, `superadmin`, `sysadmin`.

### 4.2 Workspace Layout & Key Components
The Hub interface consists of four dedicated sections:

#### Section A: Executive Catalogue Pulse & Health Bar
Displays instantaneous metric tiles:
- **Boards:** 3 Registered (CBSE, ICSE, SSC)
- **Standards:** 12 Classes (Std 1–12)
- **Batches:** 18 Active Batches | Total Capacity: 720 Seats
- **Subjects:** 48 Canonical Subjects | 96 Board Mappings
- **Faculty:** 24 Active Teachers
- **Students:** 84 Admitted Pupils
- **Fee Structures:** 14 Configured Fee Plans

#### Section B: Master Health & Integrity Audit Widget
Automatically scans for missing relational links and displays warning chips:
- ⚠️ *Orphan Warning:* "1 Batch (`Batch Gamma`) has no Board assigned" (Direct click opens edit modal).
- ⚠️ *Curriculum Gap:* "Standard 11 has no Subject Mappings configured".
- ⚠️ *Staffing Gap:* "2 Batches have no Class Teacher assigned".
- ⚠️ *Enrollment Queue:* "3 Students are enrolled without Batch allocation".

#### Section C: Catalogue Card Grid
Interactive cards grouped by category:
Each card features:
1. **Title & Badge:** e.g., "Canonical Subject Catalogue" (`48 Subjects`).
2. **Description:** Authoritative repository of subject identities and aliases.
3. **Quick Links:** "View Roster" (navigates to canonical view) | "+ New Record" (opens creation drawer).
4. **Recent Additions:** Top 3 recently modified master items.

#### Section D: Universal Master Creation Action Launcher
A single prominent **"+ Register Master Entity"** button in the header. Clicking it opens a focused selection modal:
- "What do you want to register?"
  - `[+] New Board`
  - `[+] New Standard / Level`
  - `[+] New Batch / Classroom Section`
  - `[+] New Canonical Subject`
  - `[+] Map Subject to Curriculum`
  - `[+] New Teacher / Faculty Member`
  - `[+] New Staff Employee`
  - `[+] New Student Admission`
  - `[+] New Fee Structure Package`
  - `[+] New Academic Year`

Selecting an entity opens that entity's authoritative creation modal directly within the Hub, auto-populating dependent lookups and ensuring compliance with View-First / Edit Mode rules.

---

## 5. COMPARISON: SCATTERED WORKSPACES VS. UNIFIED CATALOGUES HUB

| Dimension | Current Scattered Setup | Unified Master Catalogues Hub (Recommended) |
| :--- | :--- | :--- |
| **Navigation Overhead** | User visits 6+ different pages (`/academic`, `/students/add`, `/teachers`, `/fees/structures`, `/settings`). | **Single unified command center** (`/catalogue`) with quick-action drawers. |
| **Onboarding Dependency** | Users frequently create items out of order (e.g. student before fee structures or batches). | **Visual 8-step dependency pipeline** prevents out-of-order data corruption. |
| **Relational Integrity** | Orphaned records (batches with no board) go unnoticed for months. | **Real-time Master Health Widget** flags broken links immediately. |
| **SSOT & Deduplication** | High risk of creating duplicate subjects or standards in different tabs. | **Enforces canonical reuse:** checks existing masters before creating duplicates. |
| **Permissions & RBAC** | Fragmented permission gates across multiple sub-menus. | **Centralized master governance** scoped to authorized administrative roles. |

---

## 6. IMPLEMENTATION ROADMAP & ENGINEERING BLUEPRINT

### Phase 1: Backend Catalog Metadata Endpoint
Create `backend/app/api/v1/endpoints/catalogue.py`:
- `GET /api/v1/catalogue/overview`: Aggregates live master counts, dependency completion status, and relational integrity warnings (orphaned batches, unallocated students, unmapped standards).

### Phase 2: Frontend Catalogues Hub Workspace
Create `frontend/src/pages/MasterCataloguesHub.tsx`:
- Embed in `CANONICAL_MODULE_REGISTRY` in `frontend/src/config/modules.ts`.
- Integrate Universal Master Creation Action Drawer with existing modals (`showBatchModal`, `showSubjectModal`, `showTeacherModal`, `showBoardModal`).

### Phase 3: Interactive Integrity Health Scanners
- Scan for batches with `board_id IS NULL`.
- Scan for students with `division_id IS NULL`.
- Scan for fee structures missing academic years.

---

## 7. COMPLIANCE & VERIFICATION CHECKLIST

- **Document Indexed:** `docs/03_ACADEMIC_MANAGEMENT/2026-11-22_ACADEMIC-MANAGEMENT_ARCHITECTURE-SPECIFICATION_MASTER-CATALOGUES-HUB-AND-ONBOARDING-STUDIO_V1.md`
- **Reindexing & Validation:** `docs_manager.py validate` passed with 0 errors.
- **Attribution Headers:** 100% compliant across 769 repository files.
- **SSOT Rules Satisfied:** Rule 001 (Single Source of Truth), Rule 002 (Mandatory Reuse), Rule 003 (No Duplicate Tables), Rule 010 (View-First Governance), Rule 011 (Canonical Master Reuse).
