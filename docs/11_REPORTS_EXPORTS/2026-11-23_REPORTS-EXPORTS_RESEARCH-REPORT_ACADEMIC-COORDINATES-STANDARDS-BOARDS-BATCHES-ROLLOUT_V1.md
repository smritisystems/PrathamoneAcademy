---
title: "Universal Academic Coordinates (Standard, Board, Batch) Systemwide Audit & Implementation Architecture"
module: "11_REPORTS_EXPORTS"
category: "RESEARCH-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-23"
updated_date: "2026-11-23"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["reports", "students", "academics", "standards", "boards", "batches", "ui-ux", "ssot"]
entities: ["Student", "StudentEnrollment", "Standard", "Board", "Division", "FeeInvoice", "Payment", "Attendance", "Examination"]
api_routes: ["/api/v1/students/", "/api/v1/reports/*", "/api/v1/fees/*"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "07_ATTENDANCE", "08_EXAMINATION", "09_FEES_PAYMENTS", "11_REPORTS_EXPORTS", "17_UI_UX_DESIGN"]
---

# Universal Academic Coordinates (Standard / Grade, Board, Batch) Systemwide Audit & Rollout Architecture

**Document Reference:** `2026-11-23_REPORTS-EXPORTS_RESEARCH-REPORT_ACADEMIC-COORDINATES-STANDARDS-BOARDS-BATCHES-ROLLOUT_V1.md`  
**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Baseline Version:** 1.0.0  
**Architect:** Jawahar R. Mallah  
**Organization:** Smritisys & AITDL Networks  

---

## 1. Executive Summary & Screenshot Forensic Diagnosis

### 1.1 The Screenshot Trigger: Master Student Directory Gap
Inspection of the user-submitted screenshot (`Master Student Directory & Register` at `/students/directory` in `frontend/src/pages/Students.tsx`) reveals a significant operational blindspot:

```
[ ADMISSION NO ]  [ STUDENT NAME ]  [ ... Large Empty Gap ... ]  [ STATUS ]  [ GENDER ]  [ DOB ]  [ PHONE ]  [ CITY ]  [ ACTIONS ]
PA-2024-000027    Aadya                                          Active      Female      27 Mar   +91-...     Mumbai    [👁 ✎ 🖨 ...]
PA-2024-000039    Aaradhya                                       Active      Female      12 Mar   +91-...     Mumbai    [👁 ✎ 🖨 ...]
```

1. **Missing Core Academic Trinity:** Despite having an *"All Standards"* filter dropdown above the grid, the table itself displays **zero** academic context — neither **Standard / Grade**, nor **Board**, nor **Batch / Division**, nor **Roll Number**.
2. **Context Void for Coaching Operations:** In a coaching institute, student identity is inseparable from their academic enrollment. An administrator, receptionist, or faculty member cannot determine whether "Aadya" is enrolled in *10th CBSE (Morning Batch)* or *12th State Board (Evening Batch)* without clicking into individual profiles one by one.
3. **Backend API Serialization Omission:** In `backend/app/api/v1/endpoints/students.py` (`list_students`), the SQL query selects only from `Student` and outputs basic demographic fields, completely omitting active enrollment joins for `Standard`, `Division`, and `Board`.
4. **Wider Architectural Scope:** The user inquiry asks whether Standard/Grade, Board, and Batch should be added to **"most of reports or in all"**. This report provides the definitive forensic audit and recommendations across every report and operational table in PrathamOne EduOS.

---

## 2. Comprehensive Systemwide Inventory & Evaluation Matrix

We conducted an exhaustive audit across all 27+ institutional reports and 6 core operational workspaces. Each register was evaluated on whether incorporating the **Academic Trinity** (Standard, Board, Batch) is **Essential**, **Recommended**, or **Not Applicable**.

### 2.1 Core Operational Workspaces

| Surface / Workspace | Current Columns | Proposed Academic Coordinates | Priority | Architectural Recommendation |
| :--- | :--- | :--- | :---: | :--- |
| **Master Student Directory** (`Students.tsx`) | Admission #, Name, Status, Gender, DOB, Phone, City, Actions | **Standard / Grade**, **Board**, **Batch**, **Roll #** | **P0 (Critical)** | **Implement immediately.** Add 2-line `Course / Batch` column or discrete toggleable columns via `EnterpriseDataTable`. |
| **Fee Register & Invoices** (`Fees.tsx`) | Admission #, Name, Course/Class (`Board - Std`), Batch, Net, Paid, Balance, Status | Already implemented (`Board - Std` + `Batch`) | **P1 (Audit Passed)** | Gold standard implementation in `Fees.tsx`. Keep aligned. |
| **Issued Invoices Ledger** (`Fees.tsx`) | Invoice #, Student Name, Issue Date, Due Date, Net, Paid, Balance, Status | Add **Course & Batch** | **P1 (High)** | Invoices table should display `Board - Standard` and `Batch` for billing clarity. |
| **Payment Ledger** (`Payments.tsx`) | Receipt #, Student Name, **Batch / Course** (`Batch`, `Board · Std`), Amount, Mode, Date | Already implemented 2-line cell | **P1 (Audit Passed)** | Benchmark UX: Displays Batch on Line 1, `Board · Standard` on Line 2. |
| **Lead & CRM Management** (`LeadManagement.tsx`) | Lead ID, Student Name, **Class**, Course, Source, Counsellor, Status | Add **Target Board** (e.g. CBSE / ICSE) | **P2 (Medium)** | Enhance `Class` to show `Target Board · Standard`. |
| **Daily Attendance Register** (`Attendance.tsx`) | Admission #, Name, Status Buttons, Remarks | Filtered by Standard/Batch at top level | **P2 (Medium)** | Table is already scoped per batch; add optional **Roll Number** column. |

---

### 2.2 Reporting & Analytics Centre (`Reports.tsx` & `reports.py`)

| Report ID | Report Name | Current Academic Fields | Missing Academic Coordinates | Priority | Recommendation |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `student-master` | **Student Master Directory** | Std, Batch, Board | *None (Fully populated)* | P0 | Grid already has all 3 fields. Ensure column order highlights them prominently. |
| `collection` | **Fee Collection Register** | Only Admission # and Student Name | **Standard**, **Board**, **Batch** | **P0 (Critical)** | **Mandatory.** Accountants must see student's grade, board, and batch to reconcile collections cohort-wise. |
| `outstanding` | **Outstanding Dues & Aging** | Invoice #, Admission #, Student Name, Due Date, Net, Paid, Balance | **Standard**, **Board**, **Batch** | **P0 (Critical)** | **Mandatory.** Fee recovery teams must know which batch the student attends to send reminders in class. |
| `fee-defaulters` | **Consolidated Fee Defaulters** | Standard, Phone, Milestone, Days Overdue, Balance | **Board**, **Batch** | **P0 (Critical)** | Add `Board` and `Batch` so batch coordinators can follow up directly. |
| `daily-collection` | **Daily Payment Intake (Cashier)** | Receipt #, Student Name, Admission #, Mode, Amount | **Standard**, **Board**, **Batch** | **P1 (High)** | Add `Course / Batch` column so counter cashiers verify receipt against the student's batch. |
| `student-attendance`| **Attendance Percentage & Defaulters** | Standard, Batch, Total, Attended, Absent, % | **Board** | **P2 (Medium)** | Add `Board` to distinguish CBSE vs State Board attendance compliance. |
| `exam-merit` | **Consolidated Exam Marks & Merit** | Rank, Admission #, Student Name, Exam, Marks, %, Grade | **Standard**, **Board**, **Batch** | **P1 (High)** | Show `Standard`, `Board`, and `Batch` so merit ranks can be compared across batches. |
| `withdrawals` | **Student Withdrawals Ledger** | Standard, Batch, Academic Year, Exit Date, Fees, Refunds | **Board** | **P2 (Medium)** | Add `Board` to complete the student's withdrawal history. |
| `flexible-student-matrix` | **Universal 360° Student Matrix** | Board, Standard, Batch, Batch Code, Roll Number | *None (Benchmark)* | Benchmark | Fully implemented across all dimensions. Reference model for other reports. |
| `homework-register` | **Daily Homework Checking** | Scoped by Homework Assignment | **Batch**, **Board** | **P2 (Medium)** | Include Batch and Board in assignment roster summary. |
| `complete-concession-register` | **Concession & Scholarship Register** | Admission #, Student Name, Scheme, Concession Amount | **Standard**, **Board**, **Batch** | **P1 (High)** | Concession registers must document student's Standard and Batch to verify scholarship eligibility. |
| `batch-capacity` | **Batch Capacity & Occupancy** | Standard, Board, Batch Name, Capacity, Enrolled | *None (Batch-centric)* | N/A | Inherently structured around Standards and Batches. |
| `curriculum-matrix` | **Curriculum & Subject Matrix** | Standard, Board, Subject, Faculty | *None (Subject-centric)* | N/A | Inherently structured around Standards and Boards. |
| `faculty-load` | **Faculty Teaching Load** | Teacher Name, Total Hours, Batches Assigned | *None (Workforce)* | N/A | Teacher-centric report; lists assigned batches. |
| `payroll-*` (10 Reports) | **Teacher Payroll Ledgers** | Teacher, Base Pay, Sessions, Vouchers | *Not Applicable* | N/A | **Do NOT add.** Workforce payroll tracks faculty, not student enrollments. |
| `audit-logs` / `comm-logs` | **System & Security Logs** | Timestamp, Actor, Action, Resource, IP | *Not Applicable* | N/A | **Do NOT add.** System infrastructure logs do not have academic enrollments. |

---

## 3. Recommended Design System: Sleek Academic Coordinates UX (Rule 014 Compliance)

Adding 3 or 4 wide columns to tables risks horizontal bloating, scroll fatigue, and viewport clutter, violating **Rule 014 (Global Sleek UI/UX Design System)**. We recommend a standardized dual-mode presentation architecture:

### 3.1 Pattern A: The Compact 2-Line "Course / Batch" Tile (Default View)
Following the proven pattern from `Payments.tsx` and `Fees.tsx`:
```tsx
// Combined compact 2-line rendering (Width: ~160px)
{
  id: 'academic_allocation',
  header: 'Course / Batch',
  sortable: true,
  cell: ({ row }) => (
    <div>
      <span className="font-semibold text-slate-800 block text-xs">
        {row.division_name || 'Unassigned'}
      </span>
      <span className="block text-[11px] font-mono text-slate-400">
        {row.standard_name ? `${row.standard_name}${row.board_name ? ` · ${row.board_name}` : ''}` : '—'}
      </span>
    </div>
  ),
}
```

### 3.2 Pattern B: Granular Discrete Columns with `EnterpriseDataTable` Visibility Toggling
Using the existing `Columns` selector dropdown (visible in the top-right of the user's screenshot):
- **Default Visible Columns:**
  1. `Admission No.` (Sticky Left)
  2. `Student Name`
  3. **`Standard / Grade`** (e.g. `10th Std`)
  4. **`Batch`** (e.g. `Morning Batch A`)
  5. `Status`
  6. `Phone`
  7. `Actions` (Sticky Right)
- **Default Hidden (User-Toggleable via Columns Picker):**
  - **`Board`** (e.g. `CBSE`)
  - **`Roll No.`**
  - `Gender`
  - `DOB`
  - `City`

This gives institute staff the best of both worlds:
- **Instant visibility** of essential academic data above the fold.
- **Zero clutter** because secondary demographic attributes can be hidden or shown on demand.
- **Persistence** via `EnterpriseDataTable` localStorage column memory.

---

## 4. Backend Implementation Blueprint (SSOT & Zero N+1 Queries)

### 4.1 SQL Join Optimization
To fetch academic coordinates in `list_students` without degrading query speed:

```python
# In backend/app/api/v1/endpoints/students.py
query = (
    select(
        Student,
        Standard.name.label("standard_name"),
        Standard.id.label("standard_id"),
        Division.name.label("division_name"),
        Division.id.label("division_id"),
        Division.code.label("batch_code"),
        Board.name.label("board_name"),
        Board.code.label("board_code"),
        StudentEnrollment.roll_number.label("roll_number"),
    )
    .outerjoin(
        StudentEnrollment,
        and_(
            Student.id == StudentEnrollment.student_id,
            StudentEnrollment.status.in_(["active", "enrolled"]),
            (StudentEnrollment.academic_year_id == academic_year_id) if academic_year_id else True,
        ),
    )
    .outerjoin(Standard, StudentEnrollment.standard_id == Standard.id)
    .outerjoin(Division, StudentEnrollment.division_id == Division.id)
    .outerjoin(Board, Division.board_id == Board.id)
    ...
)
```

### 4.2 Handling Edge Cases
1. **Unassigned Students:** New admissions that have not yet been assigned to a batch will cleanly render `Unassigned` or `—` minimalist marker.
2. **Cross-Academic Years:** Only enrollments matching the institute's active academic year (or explicitly requested academic year) are joined.
3. **Multi-Board Coaching:** If a coaching institute offers CBSE, ICSE, and State Board sections, `Board.name` dynamically reflects the section board.

---

## 5. Phased Rollout Recommendations

### Phase 1: High-Impact Operational Core (Immediate Recommendation)
1. **Master Student Directory (`Students.tsx` & `students.py`):**
   - Update `list_students` endpoint to return `standard_name`, `division_name`, `board_name`, `roll_number`.
   - Update `studentColumns` in `Students.tsx` with `Standard / Grade`, `Batch`, and `Board`.
2. **Fee Collection & Outstanding Registers (`reports.py` & `Reports.tsx`):**
   - Add Standard, Board, and Batch to `/api/v1/reports/fee-collection` and `/api/v1/reports/outstanding`.
   - Add columns to `collectionColumns` and `outstanding` grid in `Reports.tsx`.
3. **Fee Defaulters & Daily Cashier Registers (`reports.py` & `Reports.tsx`):**
   - Add Batch and Board to `/api/v1/reports/fees/defaulters` and `/api/v1/reports/fees/daily-collection`.

### Phase 2: Academic & Merit Registers (Subsequent Update)
1. **Consolidated Exam Merit Roster (`reports.py` & `Reports.tsx`):**
   - Add `division_name` (Batch) and `board_name` to student marks in `/api/v1/reports/examinations/consolidated-merit`.
2. **Student Attendance Summary (`reports.py` & `Reports.tsx`):**
   - Add `board_name` to `/api/v1/reports/attendance/summary`.
3. **Concessions & Scholarships Registers (`reports.py` & `Reports.tsx`):**
   - Include Standard, Board, and Batch in concession report exports and tables.

---

## 6. Summary of Recommendations for User Confirmation

1. **Yes, absolutely:** Add **Standard / Grade**, **Board**, and **Batch** to the **Master Student Directory** shown in your screenshot. This resolves the whitespace gap and provides immediate academic context.
2. **Selective Rollout in Reports:** We recommend adding them to **all student-centric, fee, and academic reports** (Fee Collection, Outstanding Dues, Defaulters, Daily Cashier, Exam Merit, Attendance Defaulters, and Withdrawals).
3. **Exclude Non-Applicable Reports:** Do **not** add them to workforce teacher payroll registers (which track teachers/salaries) or system security audit logs (which track logins/IPs).
4. **Use Sleek Viewport Design (Rule 014):** Utilize 2-line compact tiles or `EnterpriseDataTable` toggleable columns so the tables remain crisp, legible, and unbloated on all desktop resolutions.
