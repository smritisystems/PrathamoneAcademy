---
title: "Dashboard Financial Accuracy & Student Status-Wise Outstanding Audit"
module: "09_FEES_PAYMENTS"
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
tags: ["dashboard", "fees", "outstanding", "audit", "recovery"]
entities: ["FeeInvoice", "Payment", "Student", "StudentEnrollment"]
api_routes: ["/api/v1/dashboard/stats", "/api/v1/dashboard/outstanding-drilldown"]
related_modules: ["04_STUDENT_MANAGEMENT", "09_FEES_PAYMENTS"]
---

# PrathamOne EduOS — Complete Dashboard Enhancement, Financial Accuracy & Student Status-Wise Outstanding Audit

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Institution:** Prashant Academy  
**Version:** 1.0.0  
**Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Date:** 2026-11-10  

---

## 1. Executive Summary & Forensic Audit Findings

A comprehensive forensic audit of the dashboard and financial ledger calculations revealed a critical discrepancy in how outstanding fee obligations were summarized:

### The Problem
Previously, `/api/v1/dashboard/stats` computed `total_outstanding` by querying `func.sum(FeeInvoice.outstanding_amount)` across all invoices without evaluating the active enrollment or status of the student. Consequently:
- Transferred students (whose fee assignments were shifted or settled) and withdrawn/discontinued students remained in the primary outstanding balance.
- Total active outstanding was ₹1,036,700.00, but the dashboard displayed ₹1,791,700.00 (which improperly lumped ₹697,000.00 from transferred students and ₹58,000.00 from withdrawn students into the primary operational metric).
- Institute administrators were unable to distinguish actionable, recoverable debt of currently enrolled students from historical, archived, or transferred debts.

### The Solution Architecture
In strict adherence to the SSOT directives:
1. **Primary KPI Outstanding Balance:** By default, displays **Active Students Outstanding only** (`Student.is_active == True` and `StudentEnrollment.status == 'active'`).
2. **Student Status-Wise Breakdown:** Distinct, non-overlapping categorizations for:
   - Active Students Outstanding
   - Temporarily Inactive Students Outstanding
   - Left / Discontinued Students Outstanding
   - Transferred Students Outstanding
   - Admission Cancelled Financial Settlements
   - Total Historical Outstanding (consolidated ledger balance)
3. **Reconciliation Guarantee:** The sum of status-wise categories equals `Total Historical Outstanding` with zero rounding loss or double-counting.
4. **Aging Buckets:** Not Due, 1–30 Days, 31–60 Days, 61–90 Days, 90+ Days Overdue.
5. **Operational Intelligence:** Live widgets for Today's Admissions, New Leads, Follow-ups Due, Demo Classes, Upcoming Invoices, and Payment Verifications.
6. **Recent Payments Modernization:** Instant PDF download, bulk ZIP download, search, and sanitized clean display names.

---

## 2. Authoritative Database Source Mapping

| Metric | Source Table | Filter & Aggregation Rule |
| :--- | :--- | :--- |
| **Active Students Outstanding** | `fee_invoices` ⋈ `students` ⋈ `student_enrollments` | `Student.is_active == True`, `StudentEnrollment.status == 'active'`, `FeeInvoice.status != 'cancelled'`. |
| **Temporarily Inactive Outstanding** | `fee_invoices` ⋈ `students` ⋈ `student_enrollments` | `Student.is_active == False`, `Student.exit_date IS NULL`, or `StudentEnrollment.status == 'inactive'`. |
| **Left / Discontinued Outstanding** | `fee_invoices` ⋈ `students` ⋈ `student_enrollments` | `Student.exit_date IS NOT NULL`, `Student.exit_reason IS NOT NULL`, or `StudentEnrollment.status IN ('withdrawn', 'left', 'discontinued', 'dropped')`. |
| **Transferred Students Outstanding** | `fee_invoices` ⋈ `students` ⋈ `student_enrollments` | `StudentEnrollment.status == 'transferred'`. |
| **Total Historical Outstanding** | `fee_invoices` | Mathematical sum of all non-cancelled outstanding fee invoices across all statuses. |
| **Today's Collection** | `payments` | `Payment.payment_date == CURRENT_DATE`, `status IN ('posted', 'completed')`. |
| **Overdue Fees (Active)** | `fee_invoices` | Active students where `FeeInvoice.due_date < CURRENT_DATE` and `outstanding_amount > 0`. |
| **Fees Due This Month** | `fee_invoices` | Active students where `due_date` falls in the current calendar month. |
| **Pending Verifications** | `payments` | `Payment.status IN ('draft', 'submitted')`. |
| **Refunds** | `refunds` | `status IN ('pending', 'requested')` (Pending) vs `status == 'completed'` (Successful). |
| **Daily Leads & Follow-ups** | `leads`, `lead_follow_ups` | `Lead.stage == 'new_enquiry'`, `LeadFollowUp.status == 'scheduled'`. |

---

## 3. Financial Integrity & Immutability Rules

- **Zero Automatic Write-offs:** A change in student enrollment status (e.g. withdrawal or transfer) NEVER alters or erases posted `fee_invoices` or ledger entries.
- **Dedicated Former Students Recovery:** Debts of inactive and withdrawn students remain accessible under the Recovery register and via explicit status filters on the dashboard.
- **Bijective CodeX Protection:** All monetary fields (`total_fees`, `total_collected`, `total_outstanding`, and status breakdowns) remain governed by institution-level CodeX masking policies.

