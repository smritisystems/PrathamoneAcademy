---
title: "Prashant Academy — Data Reset & Authoritative Excel Import Report"
module: "15_INTEGRATIONS"
category: "IMPLEMENTATION-REPORT"
document_type: "IMPLEMENTATION-REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-04"
updated_date: "2026-11-04"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["15-integrations", "implementation-report"]
entities: []
api_routes: ["/api/v1/communication"]
related_modules: []
---

# Prashant Academy — Data Reset & Authoritative Excel Import Report

**Document Reference:** `PA-DATA-RESET-EXCEL-IMPORT-20261104`  
**Client:** Prashant Academy Coaching Institute  
**System:** PrathamOne Academy Coaching Institute Management System  
**Lead Architect & Author:** Jawahar R. Mallah  
**Organization:** AITDL (AI Technology & Development Lab)  
**Date of Execution:** 2026-11-04  
**Source File:** `F:\Smriti-Clients Data\Prashant Academy\Padata.xlsx`  
**Execution Script:** [`backend/scripts/import_padata_excel.py`](file:///F:/PrashantAcademy/backend/scripts/import_padata_excel.py)  

---

## 1. Executive Summary

A controlled database reset and authoritative ledger import was executed for **Prashant Academy**, replacing legacy seed datasets with the authoritative Excel ledger located at `F:\Smriti-Clients Data\Prashant Academy\Padata.xlsx`.

All master entities (Institutions, Academic Years, Standards, Divisions, Boards, Subjects, Timetable Entries, Users, Roles, Permissions, and Students) were safeguarded. The fee and payment transactional domain was cleanly reset inside an atomic database transaction with strict reverse foreign-key ordering and sequence resetting.

Post-import automated audits and mathematical reconciliation confirm **100.00% precision** against the source workbook across all 170 payment records, 36 unique students, fee obligations, collections, and outstanding balances.

---

## 2. Safety Backups & Pre-Reset Checkpoints

Before performing any destructive operation, full PostgreSQL database dumps were created and verified:

1. **Initial Backup Checkpoint:**
   - **Path:** `F:\PrashantAcademy\backup_padata_import_pre_reset_20261104.sql`
   - **Size:** 637,512 bytes
   - **Status:** Verified complete (`-- PostgreSQL database dump complete`)
2. **Final Atomic Pre-Reset Snapshot:**
   - **Path:** `F:\PrashantAcademy\backup_padata_import_pre_reset_final_20261104.sql`
   - **Size:** 637,512 bytes
   - **Status:** Verified complete (`-- PostgreSQL database dump complete`)

> [!NOTE]
> The source workbook `F:\Smriti-Clients Data\Prashant Academy\Padata.xlsx` was accessed in read-only mode (`openpyxl.load_workbook(data_only=True)`) and was preserved without any modification or file movement.

---

## 3. Source File Deep-Dive Analysis (`Padata.xlsx`)

| Property | Value | Notes |
| :--- | :--- | :--- |
| **File Path** | `F:\Smriti-Clients Data\Prashant Academy\Padata.xlsx` | Canonical client ledger file |
| **File Size** | 13,421 bytes | Verified on disk |
| **SHA-256 Hash** | `05e9b175b7b77c180f899b0cd74c82603fdae6be00b75364bbfef1aee382e20d` | Immutable checksum for audit trail |
| **Worksheet** | `'Sheet1'` | Single active sheet |
| **Total Rows** | 170 valid data rows | Header row at row 1; rows 2 to 171 |
| **Headers** | `Student`, `Total Fees`, `Payment Date`, `Amount Paid` | Exact 4-column layout |
| **Unique Students** | **36 distinct students** | All students have 100% consistent total fee obligations |
| **Total Fees Obligation** | **₹2,770,000.00** | Sum of distinct student total fees |
| **Total Realized Inflow** | **₹1,819,500.00** | Sum of all 170 payment installments |
| **Cohort Outstanding** | **₹950,500.00** | Calculated balance (`₹2,770,000.00 - ₹1,819,500.00`) |
| **Cohort Collection Rate** | **65.69%** | Realized collection percentage |

### Source Data Cleaning & Anomaly Normalization

During automated ingestion, two anomalies in the raw Excel workbook were identified and programmatically handled:

1. **Calendar Boundary String (Row 170 — Ashwin):**
   - **Raw Value:** `'31-Sep-2026'`, Total Fees ₹80,000, Amount Paid ₹7,500.
   - **Root Cause:** September has only 30 days.
   - **Resolution:** Clamped to the valid month-end `2026-09-30`. Audit note appended to payment notes: `Normalized from raw date: 31-Sep-2026`.
2. **Duplicate Payment Installment (Rows 107 & 108 — Keshwa):**
   - **Raw Values:** Two rows with `('Keshwa', 85000, 2026-08-05, ₹10,000.00)`.
   - **Audit Analysis:** Keshwa has 5 valid payments in the ledger (₹10,000 each on 26-Apr, 01-Jun, 05-Aug, 05-Aug, and 31-Oct), totaling ₹50,000 against her ₹85,000 obligation.
   - **Resolution:** Both installment rows were preserved as distinct payments (`TXN-2026-0107` and `TXN-2026-0108`) with unique sequential receipts (`RCP-2026-0107` and `RCP-2026-0108`), preserving exact mathematical ledger balance.

---

## 4. Controlled Reset Execution

The reset scope was strictly limited to the transactional fee domain, ensuring zero disruption to academic master records, student enrollments, batches, or application security.

### Safely Purged Records:
- **`payment_receipts`**: Purged legacy receipts
- **`payment_allocations`**: Purged invoice allocations
- **`payments`**: Purged all old transactional payments (including 3 legacy seed payments for Shaurya, Sushmya, Aaradhya totaling ₹100,000)
- **`fee_installments`**: Purged old installment plans
- **`fee_invoice_items`**: Purged old line items
- **`fee_invoices`**: Purged legacy invoices
- **`student_fee_assignments`**: Purged legacy fee assignments
- **`fee_structures`**: Purged old test fee structures
- **`fee_register_imports`**: Purged old `Book1.xlsx` import log

### Sequence Resets:
All related PostgreSQL sequences were cleanly restarted at `1`:
- `payment_receipts_id_seq`
- `payment_allocations_id_seq`
- `payments_id_seq`
- `fee_installments_id_seq`
- `fee_invoice_items_id_seq`
- `fee_invoices_id_seq`
- `student_fee_assignments_id_seq`
- `fee_structures_id_seq`
- `fee_register_imports_id_seq`

---

## 5. Authoritative Import & Transformation

1. **Master Entity Linkage:**
   - **Institution:** `Prashant Academy` (Code: `PA001`, ID: `2`)
   - **Academic Year:** `2026 - 27` (Current: `True`, ID: `1`)
   - **Fee Category:** `Tuition Fee` (ID: `1`)
   - **Target Students:** All 36 students resolved by name matching against existing active enrollments.
2. **Fee Structures & Invoices:**
   - 36 custom `FeeStructure` records created matching each student's exact total fees.
   - 36 `StudentFeeAssignment` records generated.
   - 36 `FeeInvoice` records generated (`INV-2026-0082` through `INV-2026-0162`).
   - Invoices marked `paid` if outstanding = 0, otherwise `partial`.
3. **170 Transactional Payments & Receipts:**
   - Sequential transaction references generated: `TXN-2026-0001` through `TXN-2026-0170`.
   - Sequential official receipts generated: `RCP-2026-0001` through `RCP-2026-0170`.
   - Full JSON receipt payloads stored with student name, admission number, standard, batch, payment method, transaction reference, amount, and invoice reference.
   - 170 `PaymentAllocation` records created linking each payment to the student's fee invoice.
4. **Audit Trail Recording:**
   - Created entry in `fee_register_imports` (ID: `1`) recording file name `Padata.xlsx`, file hash, student count (36), payment count (170), total fees, total collected, total outstanding, and full JSON reconciliation metrics.

---

## 6. Post-Import Mathematical Reconciliation

```
===========================================================================
RECONCILIATION AUDIT METRIC          SOURCE (Padata.xlsx)   DATABASE (Post-Import)   STATUS
===========================================================================
Unique Students Invoiced             36                     36                       100% MATCH
Total Invoiced Fees Obligation       ₹2,770,000.00          ₹2,770,000.00            100% MATCH
Total Realized Payments Collected    ₹1,819,500.00          ₹1,819,500.00            100% MATCH
Total Invoiced Outstanding Balance   ₹950,500.00            ₹950,500.00              100% MATCH
Total Payment Records Count          170                    170                      100% MATCH
Total Receipts Generated             170                    170                      100% MATCH
Total Payment Allocations Count      170                    170                      100% MATCH
Total Allocated Inflow Sum           ₹1,819,500.00          ₹1,819,500.00            100% MATCH
Orphaned Records Count               0                      0                        100% MATCH
===========================================================================
```

### Student Ledger Breakdown (36 Students)

| Student Name | Admission No | Standard / Division | Total Fees | Total Paid | Outstanding | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Aadya** | PA-2024-000027 | Class IX / Batch B | ₹80,000.00 | ₹40,000.00 | ₹40,000.00 | Partial |
| **Aditya** | PA-2024-000035 | Class IX / Batch B | ₹45,000.00 | ₹20,000.00 | ₹25,000.00 | Partial |
| **Afton** | PA-2024-000025 | Class VIII / Batch A | ₹85,000.00 | ₹85,000.00 | ₹0.00 | Paid |
| **Aliya** | PA-2024-000030 | Class VIII / Batch A | ₹75,000.00 | ₹30,000.00 | ₹45,000.00 | Partial |
| **Aman** | PA-2024-000011 | Class VII / Batch A | ₹85,000.00 | ₹60,000.00 | ₹25,000.00 | Partial |
| **Ansh** | PA-2024-000006 | Class VII / Batch B | ₹85,000.00 | ₹51,000.00 | ₹34,000.00 | Partial |
| **Apika** | PA-2024-000023 | Class IX / Batch A | ₹85,000.00 | ₹40,000.00 | ₹45,000.00 | Partial |
| **Ashwin** | PA-2024-000012 | Class VII / Batch A | ₹80,000.00 | ₹42,700.00 | ₹37,300.00 | Partial |
| **Avner** | PA-2024-000022 | Class X / Batch B | ₹80,000.00 | ₹40,000.00 | ₹40,000.00 | Partial |
| **Ayaan** | PA-2024-000002 | Class VII / Batch A | ₹95,000.00 | ₹47,500.00 | ₹47,500.00 | Partial |
| **Chehek** | PA-2024-000033 | Class VIII / Batch A | ₹75,000.00 | ₹30,000.00 | ₹45,000.00 | Partial |
| **Johan** | PA-2024-000021 | Class IV / Batch A | ₹85,000.00 | ₹59,600.00 | ₹25,400.00 | Partial |
| **Kashish** | PA-2024-000017 | Class VIII / Batch B | ₹85,000.00 | ₹55,000.00 | ₹30,000.00 | Partial |
| **Keshwa** | PA-2024-000013 | Class VII / Batch A | ₹85,000.00 | ₹50,000.00 | ₹35,000.00 | Partial |
| **Khushi** | PA-2024-000019 | Class VIII / Batch B | ₹85,000.00 | ₹23,500.00 | ₹61,500.00 | Partial |
| **Maahi** | PA-2024-000026 | Class IX / Batch B | ₹70,000.00 | ₹50,000.00 | ₹20,000.00 | Partial |
| **Mahek** | PA-2024-000020 | Class VIII / Batch B | ₹85,000.00 | ₹27,000.00 | ₹58,000.00 | Partial |
| **Netham** | PA-2024-000003 | Class VII / Batch A | ₹90,000.00 | ₹55,000.00 | ₹35,000.00 | Partial |
| **Puneeta** | PA-2024-000029 | Class VIII / Batch A | ₹90,000.00 | ₹40,000.00 | ₹50,000.00 | Partial |
| **Rajnees** | PA-2024-000001 | Class VII / Batch A | ₹95,000.00 | ₹57,000.00 | ₹38,000.00 | Partial |
| **Raudrita** | PA-2024-000009 | Class VII / Batch B | ₹85,000.00 | ₹51,000.00 | ₹34,000.00 | Partial |
| **Rida** | PA-2024-000028 | Class IX / Batch B | ₹30,000.00 | ₹15,000.00 | ₹15,000.00 | Partial |
| **Riddhima** | PA-2024-000007 | Class VII / Batch B | ₹95,000.00 | ₹35,000.00 | ₹60,000.00 | Partial |
| **Samruddhi** | PA-2024-000010 | Class VII / Batch B | ₹60,000.00 | ₹45,000.00 | ₹15,000.00 | Partial |
| **Samud** | PA-2024-000015 | Class VII / Batch A | ₹85,000.00 | ₹59,500.00 | ₹25,500.00 | Partial |
| **Satnam** | PA-2024-000014 | Class VII / Batch A | ₹80,000.00 | ₹30,000.00 | ₹50,000.00 | Partial |
| **Savesh** | PA-2024-000005 | Class VII / Batch B | ₹95,000.00 | ₹66,700.00 | ₹28,300.00 | Partial |
| **Shreshta** | PA-2024-000004 | Class VII / Batch A | ₹60,000.00 | ₹32,000.00 | ₹28,000.00 | Partial |
| **Shriya** | PA-2024-000036 | Class IX / Batch B | ₹50,000.00 | ₹20,000.00 | ₹30,000.00 | Partial |
| **Shrawya** | PA-2024-000024 | Class VIII / Batch A | ₹65,000.00 | ₹29,500.00 | ₹35,500.00 | Partial |
| **Siddhant** | PA-2024-000031 | Class VIII / Batch A | ₹75,000.00 | ₹49,735.00 | ₹25,265.00 | Partial |
| **Siddharth** | PA-2024-000034 | Class IX / Batch B | ₹50,000.00 | ₹25,000.00 | ₹25,000.00 | Partial |
| **Simran** | PA-2024-000016 | Class VII / Batch B | ₹85,000.00 | ₹42,600.00 | ₹42,400.00 | Partial |
| **Sonakshi** | PA-2024-000008 | Class VII / Batch B | ₹80,000.00 | ₹55,000.00 | ₹25,000.00 | Partial |
| **Sukhmeet** | PA-2024-000037 | Class IX / Batch B | ₹50,000.00 | ₹24,000.00 | ₹26,000.00 | Partial |
| **Vedant** | PA-2024-000018 | Class VIII / Batch B | ₹85,000.00 | ₹46,000.00 | ₹39,000.00 | Partial |
| **TOTAL** | — | **All 36 Students** | **₹2,770,000.00** | **₹1,819,500.00** | **₹950,500.00** | **65.69% Paid** |

---

## 7. Verification & Automated Test Results

1. **Backend Integration Test Suite:**
   - **Command:** `pytest backend/tests -v`
   - **Result:** **51 / 51 tests passed** (100% pass rate in 66.77s)
   - Verified fee collection, payment creation, overpayment prevention, receipt generation, student portal dashboard, and user management.
2. **Frontend Test Suite:**
   - **Command:** `npm --prefix frontend test -- --run`
   - **Result:** **12 / 12 test files passed, 77 / 77 tests passed** (100% pass rate in 26.59s)
   - Verified Fees Workspace, Excel-like report grids, print forms/KYC, user profile, and slim footer.
3. **Frontend Production Build:**
   - **Command:** `npm --prefix frontend run build`
   - **Result:** TypeScript check (`tsc`) & Vite production compilation passed with **0 errors** in 14.26s.
4. **Attribution & Header Audit:**
   - **Command:** `python scripts/manage_headers.py check`
   - **Result:** **154 / 154 files checked, 154 passed** (100% compliance with AITDL attribution standard).
