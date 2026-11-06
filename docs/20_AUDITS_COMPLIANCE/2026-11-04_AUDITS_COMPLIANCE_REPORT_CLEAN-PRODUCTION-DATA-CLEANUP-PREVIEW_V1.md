---
title: "PrathamOne Academy — Clean Production Data Restoration Audit & Cleanup Preview"
module: "20_AUDITS_COMPLIANCE"
category: "REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-04"
updated_date: "2026-11-04"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["20-audits-compliance", "report"]
entities: []
api_routes: []
related_modules: []
---

# PrathamOne Academy — Clean Production Data Restoration Audit & Cleanup Preview

**Author:** Jawahar R. Mallah  
**Organization:** AITDL (AI Technology & Development Lab)  
**Client:** Prashant Academy Coaching Institute  
**System Version:** 6.99.1  
**Backup Verified:** `F:\PrashantAcademy\backups\prathamone_backup_20261104_185204.sql` (654,094 bytes)  
**Audit Date:** November 4, 2026  

---

## 1. Executive Summary & Pre-Cleanup Safety

In strict compliance with the **Clean Production Data Restoration** protocol and **Accidental Data Loss Prevention** standards, this document presents the complete audit, categorization, and itemized preview of all records across the **34 database tables** in the `prashant_academy` production PostgreSQL database.

> [!IMPORTANT]
> **NO DESTRUCTIVE ACTIONS HAVE BEEN EXECUTED.**
> A verified, complete database backup has been created at:
> `F:\PrashantAcademy\backups\prathamone_backup_20261104_185204.sql` (654,094 bytes).
> This preview is submitted for your explicit review and approval prior to executing any deletion.

### Core Objectives
1. **Preserve Authoritative Data**: Keep exactly the **39 verified students** restored from the authoritative Excel source (`Padata.xlsx`), their active enrollments, 78 guardians, 195 KYC documents, 36 fee structures, 36 invoices, 170 payments, 170 allocations, and 170 receipts.
2. **Purge Test & Demo Artifacts**: Remove only confirmed test enrollments, sample mock examinations, placeholder study materials, and demo notice board announcements.
3. **Resolve Empty Section & Batch Structure**: Present clear decision pathways for the 23 generic unassigned sections (`Standard 1 A`, `Standard 1 B`, etc.) and the 15 empty coaching batches.
4. **Preserve Financial & Audit Integrity**: Guarantee that fee invoices continue to reconcile to **₹2,770,000.00**, payments to **₹1,819,500.00**, and outstanding balance to **₹950,500.00**.

---

## 2. Comprehensive Inventory of All 34 Database Tables

Every database table in `public` schema has been audited and classified into four authoritative categories:

| Table Name | Current Rows | Proposed Action | Expected Rows | Classification |
| :--- | :---: | :---: | :---: | :--- |
| `institutions` | 1 | **Retain All** | 1 | Required System Configuration (PA001) |
| `academic_years` | 2 | **Retain All** | 2 | Required Master Data (`2026 - 27` current, `2023-24`) |
| `roles` | 7 | **Retain All** | 7 | Required System Configuration (RBAC) |
| `permissions` | 33 | **Retain All** | 33 | Required System Configuration (RBAC) |
| `alembic_version` | 1 | **Retain All** | 1 | Required System Configuration |
| `boards` | 3 | **Retain All** | 3 | Required Master Data (ICSE, CBSE, SSC) |
| `standards` | 12 | **Retain All** | 12 | Required Master Data (Class I to XII) |
| `subjects` | 20 | **Retain All** | 20 | Required Master Data (Class IV, VIII, IX, X) |
| `fee_categories` | 7 | **Retain All** | 7 | Required Master Data (Tuition, Admission, Coaching) |
| `students` | 39 | **Retain All** | 39 | **Authoritative Students (100% Legitimate)** |
| `guardians` | 78 | **Retain All** | 78 | **Legitimate Student Records (2 per student)** |
| `student_documents` | 195 | **Retain All** | 195 | **Legitimate Student Records (5 per student)** |
| `student_enrollments` | 45 | **Prune 6 Test Rows** | 39 | **39 Active Retained**, 6 test transfers removed |
| `fee_structures` | 36 | **Retain All** | 36 | **Legitimate Financial Records** |
| `student_fee_assignments` | 36 | **Retain All** | 36 | **Legitimate Financial Records** |
| `fee_invoices` | 36 | **Retain All** | 36 | **Legitimate Financial Records (₹2,770,000.00)** |
| `fee_invoice_items` | 36 | **Retain All** | 36 | **Legitimate Financial Records** |
| `payments` | 170 | **Retain All** | 170 | **Legitimate Financial Records (₹1,819,500.00)** |
| `payment_allocations` | 170 | **Retain All** | 170 | **Legitimate Financial Records (₹1,819,500.00)** |
| `payment_receipts` | 170 | **Retain All** | 170 | **Legitimate Financial Records (170 vouchers)** |
| `fee_register_imports` | 1 | **Retain All** | 1 | Historical Financial Audit Trail (`Padata.xlsx`) |
| `audit_logs` | 59 | **Retain All** | 59 | Historical System Audit Trail |
| `users` | 45 | **Retain All** | 45 | 39 Student Users + 2 Admins + 4 Faculty Staff |
| `announcements` | 3 | **Delete All** | 0 | Unwanted Demo / Seed Content |
| `examinations` | 7 | **Delete All** | 0 | Unwanted Demo / Seed Content (0 marks recorded) |
| `study_materials` | 6 | **Delete All** | 0 | Unwanted Demo / Seed Content (placeholder URLs) |
| `divisions` | 43 | *See Options Below* | 5 (or 23) | 5 Active Student Batches |
| `timetable_entries` | 106 | *See Options Below* | 38 | 38 Active Timetable Schedules |
| `attendances` | 0 | None (Already empty) | 0 | Operational Log |
| `exam_marks` | 0 | None (Already empty) | 0 | Operational Log |
| `discounts` | 0 | None (Already empty) | 0 | Financial Configuration |
| `scholarships` | 0 | None (Already empty) | 0 | Financial Configuration |
| `fee_installments` | 0 | None (Already empty) | 0 | Legacy Schema Table |
| `data_import_logs` | 0 | None (Already empty) | 0 | Legacy Schema Table |

---

## 3. Itemized Records Identified for Cleanup

### A. Student Enrollments — 6 Unwanted Test Transfer Records
During prior curriculum and batch transfer testing, 6 transfer enrollment records were generated on Student ID 137 (`Raudrita Pawar`). These records have status `'transferred'` and link to test batches and dummy standards.

| Enrollment ID | Student ID | Student Name | Standard | Division | Status | Proposed Action |
| :---: | :---: | :--- | :--- | :--- | :---: | :--- |
| **168** | 137 | Raudrita Pawar | Class X (id=10) | Batch B (Morning) (id=30) | transferred | **DELETE** (Test artifact) |
| **169** | 137 | Raudrita Pawar | Class X (id=10) | Batch A (Morning) (id=26) | transferred | **DELETE** (Test artifact) |
| **170** | 137 | Raudrita Pawar | Class X (id=10) | Batch A (Morning) (id=26) | transferred | **DELETE** (Test artifact) |
| **172** | 137 | Raudrita Pawar | Standard 1 (id=1) | A (id=1) | transferred | **DELETE** (Test artifact) |
| **205** | 137 | Raudrita Pawar | Standard 1 (id=1) | A (id=1) | transferred | **DELETE** (Test artifact) |
| **206** | 137 | Raudrita Pawar | Standard 1 (id=1) | B (id=2) | transferred | **DELETE** (Test artifact) |

> **Result**: Exactly **39 active enrollments** remain (1 per student, including Student 137's legitimate active enrollment ID `137` in Class X Batch A Morning).

---

### B. Announcements — 3 Demo Seed Records
These 3 records were generated during initial seeding with sample titles and dates:

| ID | Title | Category | Target Division | Proposed Action |
| :---: | :--- | :--- | :---: | :--- |
| **1** | Diwali Vacation & Special Revision Schedule | holiday | All | **DELETE** (Demo content) |
| **2** | Term 2 Pre-Board Test Series Announced | exam | Class X | **DELETE** (Demo content) |
| **3** | Mathematics Extra Problem-Solving Workshop | academic | Class IX | **DELETE** (Demo content) |

> **Result**: Student portal notice board starts completely clean for institute administrators.

---

### C. Examinations — 7 Demo Seed Records
These 7 mock tests were created during seeder initialization. None have any associated student marks (`exam_marks` count = 0):

| ID | Exam Name | Exam Type | Standard | Total Marks | Proposed Action |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **1** | Unit Test 1 (Term 1) | Unit Test | Class X (id=10) | 50 | **DELETE** (Demo test) |
| **2** | Mid-Term Examination 2024 | Semester Exam | Class X (id=10) | 100 | **DELETE** (Demo test) |
| **3** | Pre-Board Test Series 1 | Model Exam | Class X (id=10) | 100 | **DELETE** (Demo test) |
| **4** | Unit Test 1 (Term 1) | Unit Test | Class IX (id=9) | 50 | **DELETE** (Demo test) |
| **5** | Mid-Term Examination 2024 | Semester Exam | Class IX (id=9) | 100 | **DELETE** (Demo test) |
| **6** | Diagnostic Test 2024 | Diagnostic | Class VIII (id=8) | 25 | **DELETE** (Demo test) |
| **7** | Mid-Term Examination 2024 | Semester Exam | Class VIII (id=8) | 100 | **DELETE** (Demo test) |

> **Result**: Examination workspace starts clean for the upcoming academic cycle.

---

### D. Study Materials — 6 Demo Seed Records
These 6 files were created with mock URLs (`https://assets.prashantacademy.in/materials/...`):

| ID | Title | Standard | Subject | Type | Proposed Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Quadratic Equations & AP Master Notes | Class X | Mathematics | Formula Sheet | **DELETE** (Demo file) |
| **2** | Light & Optics Ray Diagrams & Numerical Bank | Class X | Physics | Notes | **DELETE** (Demo file) |
| **3** | Periodic Table & Chemical Bonding Quick Revision | Class X | Chemistry | Revision | **DELETE** (Demo file) |
| **4** | Polynomials & Coordinate Geometry Workbook | Class IX | Mathematics | Assignment | **DELETE** (Demo file) |
| **5** | Laws of Motion & Gravitation Solved Numerical Set | Class IX | Physics | Notes | **DELETE** (Demo file) |
| **6** | Linear Equations & Algebraic Identities Worksheet | Class VIII | Mathematics | Assignment | **DELETE** (Demo file) |

> **Result**: Study material repository starts clean.

---

### E. Divisions (Batches) & Timetable Architecture — Two Cleanup Options

There are **43 divisions** in the database today. They fall into three groups:

1. **Active Student Batches (5 Divisions, 38 Timetable Entries)**:
   - Div ID **7**: `ICSE-IV-A` (Class IV Batch A Morning) — **15 Students** (6 timetable entries)
   - Div ID **25**: `ICSE-X-A` (Class X Batch A Morning) — **8 Students** (8 timetable entries)
   - Div ID **26**: `CBSE-X-A` (Class X Batch A Morning) — **5 Students** (8 timetable entries)
   - Div ID **28**: `SSC-IX-A` (Class IX Batch A Morning) — **6 Students** (8 timetable entries)
   - Div ID **29**: `ICSE-VIII-A` (Class VIII Batch A Morning) — **5 Students** (8 timetable entries)
   - **Total Students: 39 | Timetable Entries: 38 (100% Legit)**.

2. **Generic Unassigned Sections (23 Divisions, 18 Timetable Entries)**:
   - Div IDs: `1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24`
   - Generic "A" and "B" sections generated by school seeders without Board (`board_id = null`, `code = null`).
   - Divs 15–20 hold 18 sample timetable slots. 0 active students belong to any of these.
   - Classification: **Unwanted Generic Seeded Sections**.

3. **Empty Configured Coaching Batches (15 Divisions, 50 Timetable Entries)**:
   - Div IDs: `27, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43`
   - Pre-configured coaching batches across ICSE, CBSE, SSC (e.g. `ICSE-X-B` Morning, `ICSE-X-C` Evening, `CBSE-X-B` Evening, `SSC-IX-B` Evening) with 3 sample schedule entries each. Currently have 0 students.

#### We present two options for your approval:

- **Option 1 (Recommended — Clean Production Roster Isolation)**:
  - Delete all **23 generic unassigned sections** (Div IDs 1–6, 8–24) and their 18 demo timetable entries.
  - Delete all **15 empty coaching batches** (Div IDs 27, 30–43) and their 50 demo timetable entries.
  - Retain **ONLY the 5 active student batches** (Div IDs 7, 25, 26, 28, 29) and their **38 legitimate timetable entries**.
  - Final Count: **5 Divisions, 38 Timetable Entries**.

- **Option 2 (Batch Structure Retained)**:
  - Delete the **23 generic unassigned sections** (Div IDs 1–6, 8–24) and their 18 demo timetable entries.
  - Retain the **20 defined coaching batches** (the 5 active student batches + 15 empty predefined batches for future enrollment).
  - Prune the 50 placeholder timetable entries on empty batches.
  - Final Count: **20 Divisions, 38 Timetable Entries**.

---

## 4. Legitimate Data Retained Without Change

### The 39 Authoritative Students & Batches
Every student is verified against `Padata.xlsx` and `student_records_restoration_report.md`:

```
1.  PA-2024-000001 : Rajnees Sharma         (Class X, CBSE, Batch A Morning)
2.  PA-2024-000002 : Ayaan Verma            (Class X, CBSE, Batch A Morning)
3.  PA-2024-000003 : Netham Patil           (Class X, CBSE, Batch A Morning)
4.  PA-2024-000004 : Shreshta Deshmukh      (Class X, CBSE, Batch A Morning)
5.  PA-2024-000005 : Savesh Kulkarni        (Class X, CBSE, Batch A Morning)
6.  PA-2024-000006 : Ansh Joshi             (Class X, ICSE, Batch A Morning)
7.  PA-2024-000007 : Riddhima Mehta         (Class X, ICSE, Batch A Morning)
8.  PA-2024-000008 : Sonakshi Shah          (Class X, ICSE, Batch A Morning)
9.  PA-2024-000009 : Raudrita Pawar         (Class X, ICSE, Batch A Morning)
10. PA-2024-000010 : Samruddhi Bhide        (Class X, ICSE, Batch A Morning)
11. PA-2024-000011 : Aarav Gokhale          (Class X, ICSE, Batch A Morning)
12. PA-2024-000012 : Vihaan Chitnis         (Class X, ICSE, Batch A Morning)
13. PA-2024-000013 : Ananya Apte            (Class X, ICSE, Batch A Morning)
14. PA-2024-000014 : Saanvi Kelkar          (Class VIII, ICSE, Batch A Morning)
15. PA-2024-000015 : Ishaan Pendse          (Class VIII, ICSE, Batch A Morning)
16. PA-2024-000016 : Reyansh Phadke         (Class VIII, ICSE, Batch A Morning)
17. PA-2024-000017 : Myra Bapat             (Class VIII, ICSE, Batch A Morning)
18. PA-2024-000018 : Advait Gadgil          (Class VIII, ICSE, Batch A Morning)
19. PA-2024-000019 : Kabir Date             (Class IX, SSC, Batch A Morning)
20. PA-2024-000020 : Anika Modak            (Class IX, SSC, Batch A Morning)
21. PA-2024-000021 : Dhruv Agashe           (Class IX, SSC, Batch A Morning)
22. PA-2024-000022 : Siya Kanitkar          (Class IX, SSC, Batch A Morning)
23. PA-2024-000023 : Aarush Lele            (Class IX, SSC, Batch A Morning)
24. PA-2024-000024 : Tanvi Soman            (Class IX, SSC, Batch A Morning)
25. PA-2024-000025 : Devansh Ranade         (Class IV, ICSE, Batch A Morning)
26. PA-2024-000026 : Pari Natu              (Class IV, ICSE, Batch A Morning)
27. PA-2024-000027 : Atharva Patwardhan     (Class IV, ICSE, Batch A Morning)
28. PA-2024-000028 : Riya Karve             (Class IV, ICSE, Batch A Morning)
29. PA-2024-000029 : Shlok Oak              (Class IV, ICSE, Batch A Morning)
30. PA-2024-000030 : Avani Barve            (Class IV, ICSE, Batch A Morning)
31. PA-2024-000031 : Ojas Dixit             (Class IV, ICSE, Batch A Morning)
32. PA-2024-000032 : Shaurya Shah           (Class IV, ICSE, Batch A Morning) [Zero Fee Invoice]
33. PA-2024-000033 : Gargi Sathe            (Class IV, ICSE, Batch A Morning)
34. PA-2024-000034 : Arnav Godbole          (Class IV, ICSE, Batch A Morning)
35. PA-2024-000035 : Ira Chiplunkar         (Class IV, ICSE, Batch A Morning)
36. PA-2024-000036 : Vivaan Damle           (Class IV, ICSE, Batch A Morning)
37. PA-2024-000037 : Anvi Sahasrabuddhe     (Class IV, ICSE, Batch A Morning)
38. PA-2024-000038 : Sushmya Bhatia         (Class IV, ICSE, Batch A Morning) [Zero Fee Invoice]
39. PA-2024-000039 : Aaradhya Kapoor        (Class IV, ICSE, Batch A Morning) [Zero Fee Invoice]
```

### Financial Ledger Reconciliation
- **Total Invoices**: 36 invoices totaling **₹2,770,000.00**
- **Total Payments**: 170 payments totaling **₹1,819,500.00**
- **Total Allocations**: 170 allocations totaling **₹1,819,500.00**
- **Total Receipts**: 170 official receipts totaling **₹1,819,500.00**
- **Outstanding Balance**: **₹950,500.00**
- **Variance**: **₹0.00 (Zero variance)**

---

## 5. Execution & Rollback Plan

When approved, the cleanup script will execute within a single atomic PostgreSQL transaction:

```sql
BEGIN;

-- 1. Remove 6 test transferred enrollments on Student 137
DELETE FROM student_enrollments
WHERE status != 'active' AND id IN (168, 169, 170, 172, 205, 206);

-- 2. Remove 3 demo announcements
DELETE FROM announcements WHERE id IN (1, 2, 3);

-- 3. Remove 7 demo examinations
DELETE FROM examinations WHERE id IN (1, 2, 3, 4, 5, 6, 7);

-- 4. Remove 6 demo study materials
DELETE FROM study_materials WHERE id IN (1, 2, 3, 4, 5, 6);

-- 5. Under Option 1: Remove unassigned divisions and demo timetable slots
-- (Dependent timetable entries removed first, followed by divisions)

-- 6. Verify assertions:
--   ASSERT count(students) == 39
--   ASSERT count(student_enrollments) == 39
--   ASSERT sum(invoices) == 2,770,000.00
--   ASSERT sum(payments) == 1,819,500.00

COMMIT;
```

If any single assertion fails or an unexpected exception occurs, the entire transaction rolls back automatically with zero data modification. If rollback fails, the full backup `F:\PrashantAcademy\backups\prathamone_backup_20261104_185204.sql` can be restored instantly via `.\restore.ps1`.

---

## 6. Action Required / User Confirmation

Please confirm your approval to proceed with the cleanup:

1. **Approve Deletion of Confirmed Test Artifacts**:
   - 6 test transfer enrollments on Student 137
   - 3 demo announcements
   - 7 demo examinations
   - 6 demo study materials
2. **Select Division / Batch Handling**:
   - **Option 1 (Recommended)**: Strict Roster Isolation — Prune all 38 empty divisions and their sample timetable slots; retain **only the 5 active student batches** (Div IDs 7, 25, 26, 28, 29) and their 38 timetable slots.
   - **Option 2**: Batch Architecture Retained — Prune the 23 generic unassigned sections; retain the 20 defined coaching batches (5 active + 15 empty).
