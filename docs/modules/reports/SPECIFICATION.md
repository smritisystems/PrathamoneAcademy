# Reports & Dashboard Module Specification

**Module**: Reports, Financial Reconciliation, Dashboard & Exports  
**Version**: 1.1.0  
**Status**: IMPLEMENTED & AUDITED  

---

## 1. Purpose & Scope
Provides real-time business intelligence, coaching institute executive dashboard metrics, daily and monthly fee collection trends, outstanding dues analysis, payment method breakdowns, and downloadable CSV/Excel files for auditing.

---

## 2. Features
- **Executive Coaching Dashboard**:
  - Live metric cards: Total Enrolled Students, Total Invoiced Fees, Total Collected Fees, and Outstanding Dues.
  - Multi-dimensional filters: Academic Year (with dynamic default to current year), Standard / Level, and Batch.
  - Monthly Collection Trend: Time-series bar visualization tracking month-by-month revenue intake.
  - Recent Payment Ledger: Displays Receipt Number, Student Name, Admission Number, Batch, Payment Method, Amount, and Date.
  - Quick Action shortcuts: Navigation to Enroll Student, Fee Management, Attendance Register, Collection Reports, Batch Allocations, and Standards.
- **Detailed Financial Reports**:
  - Fee Collection Report: Student-by-student billed, paid, and outstanding with collection rate.
  - Outstanding Report: Invoices with remaining balance, due dates, and payment statuses.
  - Payment Methods Breakdown: Volume and total value for Cash, UPI, Cheque, and Bank Transfer.
  - Export to CSV and Excel via streaming binary responses.

---

## 3. Roles & Permissions
- `superadmin`, `admin`, `accountant`: Full access to financial reports and export buttons.
- `counselor`: Read-only basic admission count metrics.

