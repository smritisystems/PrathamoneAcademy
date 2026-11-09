---
title: "Global Ascending / Descending Table Sorting & Filter Control Implementation Report"
module: "17_UI_UX_DESIGN"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-10"
updated_date: "2026-11-10"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["sorting", "asc", "desc", "tables", "ui-ux", "filters", "ssot"]
entities: ["useTableSort", "SortableHeader", "TableSortSelect", "CascadingFilters"]
api_routes: []
related_modules: ["03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "05_TEACHER_MANAGEMENT", "07_ATTENDANCE", "08_EXAMINATION", "09_FEES_PAYMENTS"]
---

# Global Ascending / Descending Table Sorting & Filter Control Implementation Report

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Date:** 2026-11-10  
**Status:** Approved & Implemented  

---

## 1. Executive Summary

In response to institutional requirements for comprehensive data exploration, PrathamOne EduOS has been upgraded with a universal, enterprise-grade Single Source of Truth (SSOT) sorting framework across all primary table views, ledgers, and filter bars. 

Users can now sort tabular records ascending (`ASC` $\uparrow$) or descending (`DESC` $\downarrow$) by:
1. **Interactive Column Header Buttons (`SortableHeader`)**: Seamless 1-click toggling directly on table column headers with visual sort direction indicators and full keyboard accessibility.
2. **Dedicated Sort Selection Controls (`TableSortSelect`)**: Filter bar dropdowns with instant `ASC` / `DESC` toggle buttons and clear-sort controls.
3. **SSOT Hook Engine (`useTableSort`)**: Multi-type comparator handling strings (localized alphanumeric collation, e.g. "ADM-2" before "ADM-10"), numbers/currencies, dates, booleans, and nested paths with safe null/undefined handling.

---

## 2. Architecture & SSOT Compliance

Compliant with **SSOT Rule 001**, **Rule 002**, and **Rule 008**, the sorting mechanism is centralized rather than duplicated across individual pages:

### 2.1 Reusable Engine: `useTableSort.ts`
- **Location:** `frontend/src/hooks/useTableSort.ts`
- **Features:**
  - Multi-type comparator: `'auto' | 'string' | 'number' | 'date'`
  - Alphanumeric collation: Uses `localeCompare` with `{ numeric: true, sensitivity: 'base' }`
  - Null/undefined safety: Empty and nullish values are consistently sorted to the bottom
  - Nested dot-notation paths: e.g., `parent.name`, `student.admission_number`
  - Tri-state toggling: Cycles from `asc` $\rightarrow$ `desc` $\rightarrow$ `unsorted (null)`
  - Direct accessor support: `(item) => `${item.first_name} ${item.last_name}``

### 2.2 Interactive Column Header: `SortableHeader.tsx`
- **Location:** `frontend/src/components/common/SortableHeader.tsx`
- **Visual Indicators:**
  - Unsorted: Subtle `ArrowUpDown` icon with hover highlight
  - Sorted Ascending: `bg-primary-50/70 border-b-2 border-primary-500` with active `ArrowUp` badge
  - Sorted Descending: `bg-primary-50/70 border-b-2 border-primary-500` with active `ArrowDown` badge
- **Accessibility:** Meets WCAG standards with `aria-sort`, `role="button"`, and Enter/Space keyboard navigation.

### 2.3 Filter Bar Sort Selector: `TableSortSelect.tsx`
- **Location:** `frontend/src/components/common/TableSortSelect.tsx`
- **Controls:**
  - Column selector dropdown (`<select>`)
  - Instant order toggle button (`ASC` $\uparrow$ vs `DESC` $\downarrow$)
  - Quick reset (`X`) button

---

## 3. Workspaces & Tables Upgraded

| Workspace / Module | Table Target | Sortable Columns | Filter Bar Sort Control |
|:---|:---|:---|:---:|
| **Student Management** (`Students.tsx`) | Master Directory Table | Admission No, Student Name, Status, Gender, DOB, Phone, City | Yes (`TableSortSelect`) |
| **Student Management** (`Students.tsx`) | Reactivations & Archive Table | Adm No, Student Name, Exit Date, Exit Reason | Yes (`SortableHeader`) |
| **Payments Workspace** (`Payments.tsx`) | Transactions Ledger Table | Receipt #, Student Name, Batch/Course, Amount, Date, Method, Reference, Status | Yes (`TableSortSelect` & `CascadingFilters`) |
| **Fees & Accounting** (`Fees.tsx`) | Fee Register / Outstanding | Admission No, Student Name, Course/Class, Batch, Obligation, Paid Amount, Balance Due, Status | Yes (`TableSortSelect`) |
| **Fees & Accounting** (`Fees.tsx`) | Recent Payments Overview | Receipt No, Date, Student, Board, Class, Batch, Amount, Method, Status | Yes (`SortableHeader`) |
| **Fees & Accounting** (`Fees.tsx`) | Payments Ledger Tab | Receipt #, Date, Student Name, Batch, Amount, Method, Reference, Status | Yes (`SortableHeader`) |
| **Fees & Accounting** (`Fees.tsx`) | Receipts & Invoices Tab | Receipt No, Date, Student Name, Admission No, Amount, Method | Yes (`SortableHeader`) |
| **Attendance** (`Attendance.tsx`) | Daily Attendance Marking Roster | Admission #, Student Name, Status | Yes (`TableSortSelect`) |
| **Examinations** (`Examinations.tsx`) | Examinations Schedules Table | Exam Name, Type, Standard, Max Marks, Passing Marks, Status | Yes (`TableSortSelect`) |
| **Examinations** (`Examinations.tsx`) | Merit Leaderboard Table | Rank, Student Name, Score, Percentage, Grade | Yes (`SortableHeader`) |
| **Teacher Management** (`TeacherManagement.tsx`) | Faculty Directory Table | Faculty Member, Employee ID, Specialization, Lifecycle Status | Yes (`TableSortSelect`) |
| **Courses & Materials** (`Courses.tsx`) | Study Materials Library Table | Title & Topic, Class & Division, Subject, Resource Type, File Size, Published Date | Yes (`TableSortSelect`) |
| **Cascading Filters** (`CascadingFilters.tsx`) | Shared Filter Bar Engine | Direct integration for `sortOptions` across any consuming view | Yes (`TableSortSelect`) |

---

## 4. Verification & Testing

- **Unit & Integration Suite:** `frontend/src/test/GlobalTableSort.test.tsx` (12 passing tests)
- **Quality Gates Passed:**
  - TypeScript strict compilation (`tsc`): 0 errors
  - Production bundle build (`vite build`): Verified
  - Corporate Attribution Header compliance: 491/491 files verified (100%)
  - SSOT Rule 010 View-First Governance: Sorting operates in default View Mode without requiring Edit Mode.
