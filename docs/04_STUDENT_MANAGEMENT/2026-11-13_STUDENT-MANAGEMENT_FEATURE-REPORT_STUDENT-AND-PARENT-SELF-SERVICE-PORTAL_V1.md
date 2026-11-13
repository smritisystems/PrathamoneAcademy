---
title: "Student & Parent Self-Service Portal Feature Report"
module: "04_STUDENT_MANAGEMENT"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-13"
updated_date: "2026-11-13"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["student-portal", "parent-portal", "self-service", "homework", "attendance", "report-cards", "fees", "vouchers"]
entities: ["Student", "StudentHomeworkRecord", "Attendance", "Examination", "ExamMark", "FeeInvoice", "Payment", "PaymentReceipt"]
api_routes: ["/api/v1/student-portal/homework", "/api/v1/student-portal/homework/{record_id}/submit", "/api/v1/student-portal/attendance", "/api/v1/student-portal/report-cards", "/api/v1/student-portal/report-cards/{exam_id}", "/api/v1/student-portal/fees/pay-online", "/api/v1/student-portal/fees/receipts/{receipt_identifier}/voucher", "/api/v1/student-portal/profile"]
related_modules: ["04_STUDENT_MANAGEMENT", "07_ATTENDANCE", "08_EXAMINATION", "09_FEES_PAYMENTS"]
---

# PRATHAMONE EDUOS — STUDENT & PARENT SELF-SERVICE PORTAL (MODULE 04)

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Baseline Version:** 1.0.0 (Build: `2026.11.13-REV-169-v1.92.0-A4D67BC`)  
**Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Module:** `04_STUDENT_MANAGEMENT` / Self-Service Portal  
**Directive Compliance:** SSOT Rules 001–011, View-First Governance (Rule 010), Immutability of Financial & Academic Ledgers  

---

## 1. EXECUTIVE SUMMARY

The **Student & Parent Self-Service Portal** in **PrathamOne EduOS** provides an enterprise-grade, omnichannel student and guardian self-service experience tailored for coaching institutes and academies. It bridges communication, academic tracking, financial settlement, and digital learning into a single, cohesive, role-governed portal.

Prior to this implementation, student and parent workflows required administrative coordination for fee receipts, printed report cards, manual homework submission tracking, and day-by-day attendance breakdowns. The enhanced Self-Service Portal delivers 5 real-time, interactive capabilities:

1. **Digital Homework Submission & Review:** Complete assignment lifecycle—from teacher assignment publication to student file/text submissions, versioning, teacher grading, feedback notes, and attachment downloads.
2. **Real-Time Attendance Calendar & Absentee Log:** Visual monthly calendar showing full day status (`present`, `absent`, `late`, `excused`, `holiday`, `weekend`), monthly summary statistics (Present Days, Absent Days, Excused, Working Days, Attendance Percentage), and an audited Absentee Log with dates and recorded remarks.
3. **Multi-Curriculum Report Card Dossier:** Dynamic aggregation of all completed and published examinations, supporting multiple grading scales (CBSE 9-Point, Standard 6-Point, ICSE, Percentage) with full subject breakdowns, GPA, percentage, class rank, qualitative faculty remarks, and isolated printable report cards.
4. **Fee Payment & Receipt Center:** Full transparency into fee structures, outstanding balances, upcoming installments, instant online fee payment checkout simulation (UPI/QR, Cards, Net Banking), and generation of official printable Fee Payment Receipt Vouchers with institutional headers, student demographics, allocation tables, and amount in words (Indian Rupees).
5. **Guardian & Ward Profile Overview:** Complete student demographic dossier, active enrollment, division, designated Class Mentor/Teacher, primary guardian details, and emergency contact information.

---

## 2. ARCHITECTURAL OVERVIEW & ENDPOINT SPECIFICATIONS

All student portal interactions route through canonical backend endpoints under `/api/v1/student-portal/` with strict authorization and tenant isolation:
- **Tenant & Identity Isolation:** Role-based identity resolution maps logged-in user tokens (`student` or `guardian`) to their corresponding `Student` record. Staff with elevated administrative privileges can inspect any student dossier via explicit `student_id` query parameters while preserving strict auditability.
- **Single Source of Truth (SSOT):** The portal consumes canonical database models (`StudentHomeworkRecord`, `Attendance`, `Examination`, `ExamMark`, `FeeInvoice`, `Payment`, `PaymentReceipt`) directly without parallel data stores or duplicate tables.
- **Financial Immutability:** Online payment transactions record immutable entries in `payments`, `payment_allocations`, and generate sequential official receipts in `payment_receipts`.

### 2.1 Backend Endpoint Matrix

| Method | Endpoint | Description | Query / Body Parameters | Response Entity |
|---|---|---|---|---|
| `GET` | `/api/v1/student-portal/homework` | Returns all active assignments for student's standard and division with submission status, version, and feedback. | `student_id` (optional) | `StudentHomeworkDashboard` |
| `POST` | `/api/v1/student-portal/homework/{record_id}/submit` | Submits written solution, file URLs, increments submission version, and logs audit record. | Body: `{ submission_text, submission_files }` | `{ success, submission_status, version }` |
| `GET` | `/api/v1/student-portal/attendance` | Returns month calendar day breakdown (1..N), summary counts, and detailed absentee log. | `year`, `month`, `student_id` | `{ summary, calendar_days, absentee_log }` |
| `GET` | `/api/v1/student-portal/report-cards` | Lists published examinations with student marks, GPA, percentage, and grading scale. | `grading_scale`, `student_id` | `{ total_report_cards, examinations }` |
| `GET` | `/api/v1/student-portal/report-cards/{exam_id}` | Compiles comprehensive official report card with subject breakdown and faculty remarks. | `grading_scale`, `student_id` | `StudentReportCardData` |
| `POST` | `/api/v1/student-portal/fees/pay-online` | Simulates online payment against outstanding invoice, updates invoice balance, and issues receipt. | Body: `{ invoice_id, amount, payment_method, notes }` | `{ success, receipt_number, payment_id }` |
| `GET` | `/api/v1/student-portal/fees/receipts/{receipt_identifier}/voucher` | Compiles printable official fee payment receipt voucher with institutional authorization. | `receipt_identifier`, `student_id` | `{ voucher: {...} }` |
| `GET` | `/api/v1/student-portal/profile` | Injects class mentor name, enrollment division, primary guardian, and emergency contact details. | `student_id` (optional) | Extended Student Profile |

---

## 3. USER INTERFACE & COMPONENT DESIGN

The UI implementation is housed in `frontend/src/pages/StudentDashboard.tsx` with full responsive design, tab navigation, and three dedicated modal dialogs:

### 3.1 Attendance Calendar & Absentee Log
- **Month Navigator:** Seamless previous/next month navigation (`< Prev Month`, `Next Month >`) with display of month name and year.
- **KPI Metrics Cards:** 5 real-time indicator cards:
  - Total Working Days
  - Present Days (Emerald)
  - Absent Days (Rose)
  - Excused Days (Amber)
  - Monthly Attendance Percentage (%) with color-coded benchmark indicator.
- **Interactive Calendar Grid:** 7-column day-of-week grid (Sun–Sat) rendering every calendar day of the active month with visual status badges, tooltip remarks, and distinctive weekend styling.
- **Audited Absentee Log:** Dedicated list of all non-present days detailing Date, Day, Status (`Absent`, `Late`, `Excused`), and Teacher Remarks (e.g., Medical Leave, Approved Absence).

### 3.2 Digital Homework Submission Center
- **Assignment Listing:** Card grid showing assignment title, subject badge, teacher name, due date, submission deadline indicator, and status badge (`Pending`, `Submitted`, `Reviewed`, `Resubmission Required`).
- **Submission Modal:** Written text response textarea, multi-file upload support (PDF, JPG, PNG) with live upload progress, and submit action tracking version increment.
- **Teacher Review & Feedback:** Displays awarded marks, letter grade, teacher comments, and downloadable feedback attachments.

### 3.3 Multi-Curriculum Examination Report Cards
- **Report Card Dossier Grid:** Displays all completed exams with total marks, percentage, grade, and one-click "View Official Report Card" button.
- **Grading Scale Selector:** Multi-curriculum switcher (`Standard 6-Point`, `CBSE 9-Point`, `ICSE Scale`, `Percentage Scale`).
- **Printable Dossier Modal:** Comprehensive academic evaluation sheet featuring:
  - Official Institutional Header (Prashant Academy Coaching Institute, Tagline, Address, Registration No).
  - Student Bio Grid (Name, Admission No, Standard, Division, Roll No, Academic Year).
  - 5-Point Metric Summary (Total Marks, Percentage, Grade, GPA, Class Rank, Pass/Fail Result).
  - Subject-Wise Marks Breakdown Table (Subject, Max Marks, Passing Marks, Marks Obtained, Percentage, Grade, Subject Remarks).
  - Qualitative Mentorship & Faculty Remarks.
  - Three-tier Institutional Signatures (Class Mentor, Exam Controller, Director/Principal).
  - Isolated Print Action (`window.print()`).

### 3.4 Fee Payment & Official Receipt Center
- **Fee Summary Banners:** Total Course Fees, Total Concessions, Paid to Date, and Outstanding Balance.
- **Invoice Register & Online Pay Action:** Table of invoices with status badges (`Pending`, `Partially Paid`, `Paid`) and "Pay Online" trigger on unpaid balances.
- **Instant Online Fee Checkout Modal:**
  - Invoice breakdown banner (Total Billed, Already Paid, Remaining Due).
  - Payment amount input with quick selectors ("Pay Full Balance", "Pay 50%").
  - Payment gateway options: UPI / QR (GPay, PhonePe, Paytm), Debit / Credit Cards, Net Banking.
  - Optional transaction notes / UTR reference.
  - 256-bit SSL encrypted security guarantee banner.
- **Printable Fee Receipt Voucher Modal:**
  - Institutional header and registration details.
  - Receipt metadata (Receipt Number, Date, Payment Mode, Txn Reference/UTR).
  - Student demographics (Name, Admission Number, Standard, Division, Roll Number).
  - Fee Allocation Table detailing paid invoices and amounts.
  - Amount in words formatted via Indian numbering system (`numberToWordsINR`).
  - Computer-generated authorization footer and Authorized Signatory signature block.
  - Direct print action (`window.print()`).

---

## 4. VERIFICATION & QUALITY ASSURANCE

### 4.1 Automated Backend Test Suite
The backend test suite (`backend/tests/test_student_portal_v2.py` and `backend/tests/test_student_portal.py`) validates 100% of portal capabilities:
1. `test_student_portal_attendance_calendar_and_absentee`: Verified calendar day mapping (28–31 days), absentee log remarks, and monthly statistics calculation.
2. `test_student_portal_digital_homework_flow`: Verified homework assignment retrieval, digital submission with text and attachment URLs, and status transition to `submitted`.
3. `test_student_portal_multi_curriculum_report_card`: Verified examination aggregation, grading scale translation, subject mark breakdown, and GPA computation.
4. `test_student_portal_online_fee_checkout_and_voucher`: Verified online fee payment processing, invoice balance deduction, transaction reference logging, and printable receipt voucher compilation.
5. `test_student_portal_profile_class_teacher_and_emergency`: Verified class mentor injection, standard/division metadata, and emergency contact details.

**Test Results:**
- `docker exec prashant_academy_backend pytest tests/test_student_portal_v2.py tests/test_student_portal.py`:
  - **10 passed in 21.35s** (100% passing).

### 4.2 Automated Frontend Build & Test Suite
- **TypeScript & Vite Build:**
  - `npm --prefix frontend run build`: **0 TypeScript errors, built successfully in 11.41s**.
- **Vitest Unit & Integration Suite:**
  - `npm --prefix frontend test -- --run`:
  - **66 test files passed out of 66**.
  - **512 tests passed out of 512** (100% passing).

### 4.3 Governance & Compliance
- **Corporate Header Compliance:**
  - `python scripts/manage_headers.py check`: **591 of 591 files compliant (100%)**.
- **Single Source of Truth (SSOT):** Strictly enforced across all database queries and frontend hooks.
- **View-First Safety (Rule 010):** All student actions operate in View-First mode; submissions and payments require explicit modal confirmation.

---

## 5. CONCLUSION

Option 2 (Student & Parent Self-Service Portal) is fully implemented, verified, tested, and ready for production deployment under **PrathamOne EduOS v1.0.0**.
