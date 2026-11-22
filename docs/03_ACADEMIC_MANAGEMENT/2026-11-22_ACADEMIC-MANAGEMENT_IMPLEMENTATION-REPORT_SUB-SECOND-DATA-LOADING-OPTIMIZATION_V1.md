---
title: "Sub-Second Ultra-Fast Data Loading & React Query Optimization Report"
module: "03_ACADEMIC_MANAGEMENT"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-22"
updated_date: "2026-11-22"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["performance", "caching", "react-query", "database-optimization", "sub-second-loading"]
entities: ["TimetableEntry", "Standard", "Division", "HousekeepingService", "InstitutionSetting"]
api_routes: ["/api/v1/standards/academic-overview", "/api/v1/settings/all", "/api/v1/timetable/matrix"]
related_modules: ["01_ARCHITECTURE", "13_SYSADMIN_SETTINGS", "09_FEES_PAYMENTS", "04_STUDENT_MANAGEMENT"]
---

# Sub-Second Ultra-Fast Data Loading & React Query Optimization Report

## 1. Executive Summary

In response to institutional requirements for ultra-responsive, sub-second data loading across all modules ("load in fractions of a second"), Smritisys & AITDL Networks conducted a deep architectural audit of the data lifecycle across both the FastAPI/PostgreSQL backend and the React/TanStack Query frontend.

The audit uncovered four major bottlenecks responsible for perceptible load latency and UI spinner flickering:
1. **Frontend Query Stampede & Socket Saturation:** Opening a single workspace fired up to 13 un-scoped HTTP queries simultaneously, exceeding the browser's 6-connection per-domain limit and causing network request queueing.
2. **Synchronous File System I/O Blocking Backend Event Loop:** Housekeeping backup checks executed 40–60 synchronous disk reads inside `/api/v1/settings/all`, blocking the single Python `asyncio` event loop for ~250ms on every mount.
3. **Sequential Database Scalar Count Roundtrips:** Overview metrics executed 6–10 sequential SQL queries instead of 1 consolidated subquery.
4. **Suboptimal React Query Cache Invalidation Defaults:** Navigation and tab switching triggered eager refetches (`refetchOnMount: true` and missing `placeholderData`), leading to blanking and loading spinners even when valid data was already in client memory.

Following the implementation of targeted caching, single-roundtrip database aggregations, tab query scoping, and smooth placeholder transitions, perceived data loading has dropped to **under 100 milliseconds** (instant cache hits), eliminating all white flashes and spinner stalls.

---

## 2. Root Cause Analysis & Benchmarking

| Bottleneck Category | Pre-Optimization Diagnostic | Root Cause | Post-Optimization Benchmark |
| :--- | :--- | :--- | :--- |
| **Backend Event Loop Stall** | `/api/v1/settings/all` took **255.4 ms** | `HousekeepingService.list_backups()` iterated all files and parsed metadata synchronously | **33.9 ms** (87% latency reduction via 60s in-memory TTL cache) |
| **Database Scalar Counts** | `/api/v1/standards/academic-overview` took **126.6 ms** | 6 sequential count queries executed across `students`, `standards`, `divisions`, and `timetable_entries` | **67.2 ms** (single combined SQL subquery executed in 0.39ms on PostgreSQL) |
| **Socket Saturation** | 13 simultaneous queries on `AcademicWorkspace` mount | Missing `enabled: activeTab === '...'` guards forced Chrome to queue 7 requests | **1–2 queries** fired strictly for active tab; socket queueing completely eliminated |
| **Perceived UI Latency** | Tab switching showed full loading spinners (300–800ms) | Default React Query `staleTime: 30s` with no `placeholderData` | **< 100 ms (Instantaneous 0ms perceived render)** from memory cache |

---

## 3. Implemented Architectural Enhancements

### 3.1 Backend Service Caching (`HousekeepingService`)
- Added class-level in-memory cache with 60-second TTL (`_cached_backups`, `_cached_backups_time`).
- Added automatic invalidation hooks in `create_backup`, `restore_backup`, `prune_backups`, `save_uploaded_backup`, and `verify_backup`.
- Eliminated redundant disk I/O on `/api/v1/settings/all`.

### 3.2 Backend SQL Aggregation (`standards.py`)
- Consolidated 6 independent count queries into 1 unified scalar subquery.
- Single network roundtrip across PostgreSQL engine with index-backed evaluation in 0.39ms.

### 3.3 Global React Query Configuration (`main.tsx`)
- Increased global `staleTime` to `60_000` (1 minute).
- Set `gcTime` to `10 * 60_000` (10 minutes) for persistent client-side memory retention.
- Configured `refetchOnMount: false` to allow instant, non-blocking rendering from cache when returning to visited views.

### 3.4 Scoped Tab Queries & Smooth Transitions Across All 35 Workspaces
- Conditional `enabled` flags and fast in-memory caching applied systematically across all application modules:
  - **Academic Workspace (`AcademicWorkspace.tsx`):** 14 enabled guards, 13 staleTime caches, 11 placeholder transitions.
  - **Master Catalogues Hub (`MasterCataloguesHub.tsx`):** 5 enabled guards for boards, standards, batches, subjects, and years; eliminated 5 redundant upfront queries on visit.
  - **Courses & Study Materials (`Courses.tsx`):** Master lookups cached for 10m; materials list and stats cached with smooth placeholder transitions.
  - **Batches & Divisions (`Batches.tsx`, `Standards.tsx`):** Scoped queries with master caching.
  - **Subjects & Mappings (`Subjects.tsx`):** Smart search debounced; canonical and mapping queries cached with placeholder transitions.
  - **Students & Admissions (`Students.tsx`, `StudentDetail.tsx`, `AddStudent.tsx`):** Scoped unassigned & inactive student queries; lifecycle history, admin profile, and activity register cached.
  - **Fees & Financials (`Fees.tsx`, `FeeCollection.tsx`, `Payments.tsx`):** Scoped defaulters, concessions, receipts, invoices, and refunds.
  - **Workforce & Faculty (`TeacherManagement.tsx`, `TeacherPayroll.tsx`, `StaffManagement.tsx`, `TeacherProfilePage.tsx`, `StaffProfilePage.tsx`):** Scoped monthly payrolls, attendance, teaching sessions, leaves, and activity histories.
  - **EduBoard Digital Studio (`EduBoardWorkspace.tsx`):** Studio context, settings, boards, and user preferences cached.
  - **CRM & Admissions (`CrmOverviewPage.tsx`, `LeadPipelinePage.tsx`, `LeadRegisterPage.tsx`, `LeadManagement.tsx`, `FollowUpCentrePage.tsx`, `CounsellingDemoPage.tsx`, `CampaignsPage.tsx`, `LeadSourcesPage.tsx`, `CrmSettingsPage.tsx`, `CrmReportsPage.tsx`):** Viewport-scoped kanban vs. list queries; cached master lookups across all CRM pages.
  - **Planning, Examinations, Homework & Reports (`PlanningWorkspace.tsx`, `Examinations.tsx`, `HomeworkWorkspace.tsx`, `Reports.tsx`):** Task summaries, exam marks, policies, and homework registers cached with instant tab switching.
  - **System Administration & Settings (`SysAdminWorkspace.tsx`, `Settings.tsx`, `TrainingManagement.tsx`):** SysAdmin overview and audit queries scoped to active tabs; lazy-loaded audit logs in Settings.

---

## 4. Verification & Validation Evidence

- **Comprehensive Query Audit:** Verified via `scripts/audit_queries.py` across 40 frontend page modules:
  - 100% of master data queries and multi-tab workspaces now enforce `enabled` scoping, `staleTime: 2-10 min`, and `placeholderData: (prev) => prev`.
  - Zero redundant database query stampedes on initial page mounts.
- **Automated API Benchmark:** Verified via `scripts/benchmark_apis.py`:
  - `/api/v1/settings/all`: **33.9ms** (was 255.4ms, 87% faster)
  - `/api/v1/standards/academic-overview`: **67.2ms** (was 126.6ms, 47% faster)
  - `/api/v1/timetable/matrix`: **49.0ms**
  - `/api/v1/boards/`: **46.4ms**
  - `/api/v1/divisions/`: **45.7ms**
- **Live Browser Verification:** Verified via Browser Subagent (`6b5aa19e-8426-467c-b426-bc53870ef03c`):
  - Tab navigation between `Timetable` ➔ `Overview` ➔ `Classes` ➔ `Timetable` rendered instantly (<100ms) with zero spinner delay.
  - Visual verification screenshot saved to artifacts: `instant_load_timetable.png`.
- **System Governance Checks:**
  - `python scripts/manage_headers.py check`: **773/773 (100%) PASS**.
  - `python tools/docs_manager.py validate`: **732/732 (100%) PASS** (0 errors, 0 warnings).
