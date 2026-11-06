---
title: "Student Count Reconciliation Diagnostic Report: Main Dashboard vs. Fees Dashboard"
module: "04_STUDENT_MANAGEMENT"
category: "IMPLEMENTATION-REPORT"
document_type: "IMPLEMENTATION-REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-05"
updated_date: "2026-11-05"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["04-student-management", "implementation-report"]
entities: ["Student", "StudentEnrollment", "StudentAcademicHistory"]
api_routes: ["/api/v1/students", "/api/v1/admissions"]
related_modules: []
---

# Student Count Reconciliation Diagnostic Report: Main Dashboard vs. Fees Dashboard

> **Project:** PrathamOne Academy Coaching Institute Management System  
> **Client:** Prashant Academy Coaching Institute  
> **Academic Session:** AY 2026-27 (`is_current = True`, ID `1`)  
> **Master Institution:** Prashant Academy (ID `1`, Code `PA001`)  
> **Author:** Jawahar R. Mallah, AI Technology & Development Lab (AITDL)  
> **Date:** 2026-11-05  

---

## Executive Summary

| Metric | Main Coaching Institute Dashboard | Fees & Payments Dashboard (Prior) | Fees & Payments Dashboard (Remediated) | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Total Student Count (AY 2026-27)** | **39** | **36** | **39** | **Reconciled (100% Match)** |
| **CBSE Board Enrolled** | 5 | 5 | 5 | Matched |
| **ICSE Board Enrolled** | 28 | 27 | 28 | Reconciled (+1 Shaurya Shah) |
| **SSC Board Enrolled** | 6 | 4 | 6 | Reconciled (+2 Sushmya Bhatia, Aaradhya Kapoor) |
| **Total Realized Obligation** | ₹2,770,000.00 | ₹2,770,000.00 | ₹2,770,000.00 | Unchanged / Intact |
| **Total Collections** | ₹1,819,500.00 | ₹1,819,500.00 | ₹1,819,500.00 | Unchanged / Intact |
| **Total Outstanding** | ₹950,500.00 | ₹950,500.00 | ₹950,500.00 | Unchanged / Intact |

---

## 1. Root-Cause Analysis & Data Source Trace

### 1.1 Frontend Components
* **Main Dashboard:** Located at [`frontend/src/pages/Dashboard.tsx`](file:///F:/PrashantAcademy/frontend/src/pages/Dashboard.tsx). Renders `stats.total_students` in Stat Card 1 ("Total Active Students", subtitle: "Enrolled this session") fetched from `dashboardApi.getStats()`.
* **Fees & Payments Dashboard:** Located at [`frontend/src/pages/Fees.tsx`](file:///F:/PrashantAcademy/frontend/src/pages/Fees.tsx). Renders `{overviewData.summary.student_count}` in Stat Card 1 ("Total Students", subtitle: "Enrolled Across All Batches") and in Stat Card 2 ("Total Obligation") fetched from `feesApi.getOverview()`.

### 1.2 Backend Queries & Cause of Discrepancy
* **In `backend/app/api/v1/endpoints/dashboard.py`:**
  The query counted distinct active students who have an active enrollment record in the selected academic year:
  ```python
  student_query = select(func.count(func.distinct(Student.id))).where(Student.is_active == True)
  ```
  This returned all **39** active enrolled students.
* **In `backend/app/api/v1/endpoints/fees.py` (`get_fees_overview`):**
  The query originated from the `FeeInvoice` table:
  ```python
  inv_query = (
      select(
          ...
          func.count(func.distinct(FeeInvoice.student_id)).label("student_count"),
      )
      .join(Student, FeeInvoice.student_id == Student.id)
      .where(FeeInvoice.status != "cancelled")
  )
  ```
  Because the query counted `func.distinct(FeeInvoice.student_id)`, **any student without an issued Fee Invoice was silently excluded from the student count**, yielding **36** instead of 39.

---

## 2. The Three Discrepant Student Records

The three students accounting for the difference are valid, active students who have active enrollments in AY 2026-27, but have **no fee invoices, assignments, or payments** in the database:

```
┌──────┬────────────────┬─────────────────┬───────┬────────────┬───────────────────┬───────────────┬────────────────────────┐
│ ID   │ Admission No   │ Full Name       │ Board │ Class      │ Batch             │ Enr Status    │ Fee Status in AY 26-27 │
├──────┼────────────────┼─────────────────┼───────┼────────────┼───────────────────┼───────────────┼────────────────────────┤
│ 160  │ PA-2024-000032 │ Shaurya Shah    │ ICSE  │ Class VIII │ Batch A (Morning) │ Active        │ Zero Invoices (₹0.00)  │
│ 166  │ PA-2024-000038 │ Sushmya Bhatia  │ SSC   │ Class IX   │ Batch A (Morning) │ Active        │ Zero Invoices (₹0.00)  │
│ 167  │ PA-2024-000039 │ Aaradhya Kapoor │ SSC   │ Class IX   │ Batch A (Morning) │ Active        │ Zero Invoices (₹0.00)  │
└──────┴────────────────┴─────────────────┴───────┴────────────┴───────────────────┴───────────────┴────────────────────────┘
```

### Detailed Profile Breakdown of Discrepant Records:
1. **Student ID 160 – Shaurya Shah**:
   * Admission Number: `PA-2024-000032`
   * Gender: Female | Date of Birth: `2016-08-05`
   * Contact: `+91-9820324411` | `shaurya.shah160@example.com`
   * Academic: ICSE Board, Class VIII, Division: Batch A (Morning)
   * Enrollment ID: 32 (Status: `active`, AY: `2026-27`)
   * Fee Obligation: ₹0.00 (No `fee_invoices` generated)
   * Historical Context: Part of the 5 students in ICSE Class VIII. The other 4 students (Puneeta Kulkarni, Aliya Joshi, Siddhant Mehta, Chehek Pawar) each carry ₹75k-₹90k fee invoices.

2. **Student ID 166 – Sushmya Bhatia**:
   * Admission Number: `PA-2024-000038`
   * Gender: Female | Date of Birth: `2015-09-12`
   * Contact: `+91-9820324417` | `sushmya.bhatia166@example.com`
   * Academic: SSC Board, Class IX, Division: Batch A (Morning)
   * Enrollment ID: 38 (Status: `active`, AY: `2026-27`)
   * Fee Obligation: ₹0.00 (No `fee_invoices` generated)
   * Historical Context: Part of the 6 students in SSC Class IX.

3. **Student ID 167 – Aaradhya Kapoor**:
   * Admission Number: `PA-2024-000039`
   * Gender: Female | Date of Birth: `2015-11-20`
   * Contact: `+91-9820324418` | `aaradhya.kapoor167@example.com`
   * Academic: SSC Board, Class IX, Division: Batch A (Morning)
   * Enrollment ID: 39 (Status: `active`, AY: `2026-27`)
   * Fee Obligation: ₹0.00 (No `fee_invoices` generated)
   * Historical Context: Part of the 6 students in SSC Class IX.

---

## 3. Authoritative Student Counting Rule

The unified authoritative student count rule is established as follows:

$$\text{Authoritative Count} = \left| \{ s \in \text{Students} \mid s.\text{is\_active} = \text{True} \land \exists e \in \text{Enrollments}(s): e.\text{status} = \text{'active'} \land e.\text{academic\_year} = \text{AY}_{\text{sel}} \} \right|$$

Subject to user-applied filters:
* **Institution Filter:** $s.\text{institution\_id} = \text{Inst}_{\text{sel}}$
* **Academic Year Filter:** $e.\text{academic\_year\_id} = \text{AY}_{\text{sel}}$
* **Course/Board Filter:** $d.\text{board\_id} = \text{Board}_{\text{sel}}$
* **Class/Standard Filter:** $e.\text{standard\_id} = \text{Std}_{\text{sel}}$
* **Batch/Division Filter:** $e.\text{division\_id} = \text{Div}_{\text{sel}}$

### Safeguards Enforced:
1. **Deduplication:** Always evaluates `func.count(func.distinct(Student.id))` so a student is never counted more than once regardless of joins.
2. **Status Integrity:** Inactive students (`is_active = False`) and non-active enrollments (`status = 'withdrawn'` or `'transferred'`) are excluded.
3. **Fee Independence:** General student headcount is decoupled from invoice generation so fee-less or scholarship students remain fully counted.
4. **Financial Preservation:** Financial sums (`total_obligation`, `total_collected`, `total_outstanding`) remain calculated directly from uncancelled `fee_invoices` and confirmed `payments`.

---

## 4. Complete 39-Student Reconciliation Matrix

| Student ID | Admission No | Student Name | Board | Class | Batch | Has Fee? | Main Dash | Fees Dash (Prior) | Fees Dash (Fixed) | Reconciliation Status |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **129** | `PA-2024-000001` | Rajnees Sharma | ICSE | Class X | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **130** | `PA-2024-000002` | Ayaan Verma | ICSE | Class X | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **131** | `PA-2024-000003` | Netham Patil | ICSE | Class X | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **132** | `PA-2024-000004` | Shreshta Deshmukh | ICSE | Class X | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **133** | `PA-2024-000005` | Savesh Kulkarni | ICSE | Class X | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **134** | `PA-2024-000006` | Ansh Joshi | ICSE | Class X | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **135** | `PA-2024-000007` | Riddhima Mehta | ICSE | Class X | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **136** | `PA-2024-000008` | Sonakshi Shah | ICSE | Class X | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **137** | `PA-2024-000009` | Raudrita Pawar | CBSE | Class X | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **138** | `PA-2024-000010` | Samruddhi Bhide | CBSE | Class X | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **139** | `PA-2024-000011` | Aman Chavan | CBSE | Class X | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **140** | `PA-2024-000012` | Ashwin Tambe | CBSE | Class X | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **141** | `PA-2024-000013` | Keshwa Mistry | CBSE | Class X | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **142** | `PA-2024-000014` | Satnam Bhatia | ICSE | Class IV | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **143** | `PA-2024-000015` | Samud Kapoor | ICSE | Class IV | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **144** | `PA-2024-000016` | Simran Malhotra | ICSE | Class IV | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **145** | `PA-2024-000017` | Kashish Sawant | ICSE | Class IV | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **146** | `PA-2024-000018` | Vedant Gokhale | ICSE | Class IV | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **147** | `PA-2024-000019` | Khushi Gadgil | ICSE | Class IV | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **148** | `PA-2024-000020` | Mahek Nair | ICSE | Class IV | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **149** | `PA-2024-000021` | Johan Iyer | ICSE | Class IV | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **150** | `PA-2024-000022` | Avner Rao | ICSE | Class IV | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **151** | `PA-2024-000023` | Apika Shetty | ICSE | Class IV | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **152** | `PA-2024-000024` | Shrawya Kamath | ICSE | Class IV | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **153** | `PA-2024-000025` | Afton Sharma | ICSE | Class IV | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **154** | `PA-2024-000026` | Maahi Verma | ICSE | Class IV | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **155** | `PA-2024-000027` | Aadya Patil | ICSE | Class IV | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **156** | `PA-2024-000028` | Rida Deshmukh | ICSE | Class IV | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **157** | `PA-2024-000029` | Puneeta Kulkarni | ICSE | Class VIII | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **158** | `PA-2024-000030` | Aliya Joshi | ICSE | Class VIII | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **159** | `PA-2024-000031` | Siddhant Mehta | ICSE | Class VIII | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **160** | `PA-2024-000032` | **Shaurya Shah** | **ICSE** | **Class VIII** | **Batch A (Morning)** | **No** | **39** | **EXCLUDED** | **39** | **Reconciled (Fee-less)** |
| **161** | `PA-2024-000033` | Chehek Pawar | ICSE | Class VIII | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **162** | `PA-2024-000034` | Siddharth Bhide | SSC | Class IX | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **163** | `PA-2024-000035` | Aditya Chavan | SSC | Class IX | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **164** | `PA-2024-000036` | Shriya Tambe | SSC | Class IX | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **165** | `PA-2024-000037` | Sukhmeet Mistry | SSC | Class IX | Batch A (Morning) | Yes | 39 | 36 | 39 | Matched |
| **166** | `PA-2024-000038` | **Sushmya Bhatia** | **SSC** | **Class IX** | **Batch A (Morning)** | **No** | **39** | **EXCLUDED** | **39** | **Reconciled (Fee-less)** |
| **167** | `PA-2024-000039` | **Aaradhya Kapoor** | **SSC** | **Class IX** | **Batch A (Morning)** | **No** | **39** | **EXCLUDED** | **39** | **Reconciled (Fee-less)** |

---

## 5. Architectural Implementation

### 5.1 Shared Authoritative Counting Service
Created [`backend/app/services/student_metrics.py`](file:///F:/PrashantAcademy/backend/app/services/student_metrics.py):
* `get_authoritative_student_count()`: Centralized function for distinct active student counting.
* `get_authoritative_student_counts_by_board()`: Grouped counts for board breakdowns.
* `get_authoritative_student_counts_by_batch()`: Grouped counts for batch/division breakdowns.
* `get_student_reconciliation_diagnostic()`: Real-time diagnostic endpoint data generator.

### 5.2 Updated Endpoints
* **[`backend/app/api/v1/endpoints/fees.py`](file:///F:/PrashantAcademy/backend/app/api/v1/endpoints/fees.py):**
  * `get_fees_overview`: Now invokes `get_authoritative_student_count()` for the summary card.
  * Injects authoritative counts into `board_breakdown` and `batch_breakdown`.
* **[`backend/app/api/v1/endpoints/dashboard.py`](file:///F:/PrashantAcademy/backend/app/api/v1/endpoints/dashboard.py):**
  * Added `board_id: Optional[int] = None` query parameter.
  * Replaced inline counting with `get_authoritative_student_count()`.
  * Added `/api/v1/dashboard/reconciliation` diagnostic endpoint.
* **[`frontend/src/api/endpoints.ts`](file:///F:/PrashantAcademy/frontend/src/api/endpoints.ts):**
  * Synchronized `dashboardApi.getStats` to pass `board_id`.
* **[`frontend/src/pages/Dashboard.tsx`](file:///F:/PrashantAcademy/frontend/src/pages/Dashboard.tsx):**
  * Passed `filters.boardId` in query key and request parameters.

---

## 6. Verification and Automated Test Results

* **Automated Pytest Suite:** [`backend/tests/test_student_count_reconciliation.py`](file:///F:/PrashantAcademy/backend/tests/test_student_count_reconciliation.py)
  * `test_student_counting_rule_and_reconciliation`: PASSED (Tested active, inactive, withdrawn, fee-less students, and academic year/institution isolation).
  * `test_dashboard_and_fees_api_consistency`: PASSED (Verified `/api/v1/dashboard/stats` and `/api/v1/fees/overview` return identical student counts across equivalent filters).
* **Cross-Module Test Execution:** All 6 backend tests in `test_sysadmin_and_staff.py` and `test_student_count_reconciliation.py` passed with 0 failures.
* **AITDL Source Code Attribution:** Checked 178 files with `python scripts/manage_headers.py check` — 178 passed (100% compliance).
* **Production Bundle Compilation:** `npm --prefix frontend run build` completed in 16.20s with 0 errors.
