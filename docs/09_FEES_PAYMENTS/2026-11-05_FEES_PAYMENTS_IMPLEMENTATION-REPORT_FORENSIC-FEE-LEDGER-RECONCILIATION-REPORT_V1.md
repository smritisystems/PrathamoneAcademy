---
title: "Forensic Fee Ledger Reconciliation Report"
module: "09_FEES_PAYMENTS"
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
tags: ["09-fees-payments", "implementation-report"]
entities: ["FeeStructure", "FeePlan", "StudentFee", "Payment"]
api_routes: ["/api/v1/fees", "/api/v1/payments"]
related_modules: []
---

# Forensic Fee Ledger Reconciliation Report
**PrathamOne Academy — Prashant Academy Operational Audit Resolution**  
*Document Version: 1.0.0 | Date: November 5, 2026 | Authority: AITDL Engineering & Financial QA*

---

## Executive Summary

Following receipt of operational feedback and fee discrepancy notes via administrative communication, a forensic audit was executed across the database (`students`, `student_enrollments`, `fee_structures`, `student_fee_assignments`, `fee_invoices`, `fee_invoice_items`, `payments`, `payment_allocations`, and `payment_receipts`).

All eight (8) discrepancy items spanning ten (10) student accounts were traced back to their root causes in the initial `Padata.xlsx` raw ledger import versus post-import offline administrative modifications (e.g. subject discontinuations, package concessions, duplicate spreadsheet entries, and late admissions).

Every account has been reconciled with **100% financial integrity**, complete non-destructive audit trails (preserving reversed payments with reasons rather than hard deletes), and verified against the live database via automated audit scripts.

---

## 1. Item-by-Item Reconciliation Matrix

| # | Student Name & ID | Standard / Batch | Client Query / Discrepancy Noted | Previous DB State | Forensic Action Executed | Reconciled Balance |
|---|---|---|---|---|---|---|
| **1** | **Puneeta Kulkarni**<br>`ID: 157`<br>`PA-2024-000029` | Class VIII<br>Batch A | *"Puneeta total fees is 70k not 90k"* | Fee: ₹90,000<br>Paid: ₹50,000<br>Balance: ₹40,000 | Corrected `fee_structures`, `student_fee_assignments`, `fee_invoices`, and invoice items to authoritative total fee of ₹70,000.00. | **Total Fee: ₹70,000.00**<br>Paid: ₹50,000.00<br>**Balance: ₹20,000.00** |
| **2** | **Satnam (Satyam) Bhatia**<br>`ID: 142`<br>`PA-2024-000014` | Class IV<br>Batch A | *"Satyam has discontinued"* | Active student<br>Active enrollment | Executed student exit workflow: set `students.is_active = FALSE`, `student_enrollments.status = 'withdrawn'`, exit date `2026-11-05`, reason `Discontinued`, and generated `student_lifecycle_logs` audit record. | **Status: Withdrawn / Inactive**<br>Recorded exit date: Nov 5, 2026 |
| **3** | **Shaurya Shah**<br>`ID: 160`<br>`PA-2024-000032` | Class VIII<br>Batch A | *"Shaurya from ic 8 is missing", "Can't find them on fees register"* | Enrolled student, but omitted from `Padata.xlsx` import; 0 invoices, 0 assignments | Created fee structure (`Annual Tuition Fee - Shaurya`), fee assignment, and invoice `INV-2026-0160` for standard Class VIII fee (₹75,000.00). | **Active on Fees Register**<br>Total Fee: ₹75,000.00<br>Paid: ₹0.00<br>**Balance: ₹75,000.00** |
| **3** | **Sushmya Bhatia**<br>`ID: 166`<br>`PA-2024-000038` | Class IX<br>Batch A | *"Can't find them on fees register"* | Enrolled student, omitted from `Padata.xlsx` import; 0 invoices, 0 assignments | Created fee structure (`Annual Tuition Fee - Sushmya`), fee assignment, and invoice `INV-2026-0166` for standard Class IX fee (₹50,000.00). | **Active on Fees Register**<br>Total Fee: ₹50,000.00<br>Paid: ₹0.00<br>**Balance: ₹50,000.00** |
| **3** | **Aaradhya Kapoor**<br>`ID: 167`<br>`PA-2024-000039` | Class IX<br>Batch A | *"Can't find them on fees register"* | Enrolled student, omitted from `Padata.xlsx` import; 0 invoices, 0 assignments | Created fee structure (`Annual Tuition Fee - Aaradhya`), fee assignment, and invoice `INV-2026-0167` for standard Class IX fee (₹50,000.00). | **Active on Fees Register**<br>Total Fee: ₹50,000.00<br>Paid: ₹0.00<br>**Balance: ₹50,000.00** |
| **4** | **Ashwin Tambe**<br>`ID: 140`<br>`PA-2024-000012` | Class X<br>Batch A | *"Ashwin total fees paid is 37500 it is wrongly stated as 57700 in software"* | Total Fee: ₹80,000<br>Paid: ₹57,700<br>Balance: ₹22,300 (8 payments) | Reversed excess payments totaling ₹20,200 (#14 ₹5k, #135 ₹7.7k, #169 ₹7.5k anomalous date row). Cancelled associated receipts. Reconciled active paid sum to ₹37,500.00 (5 installments of ₹7.5k). | **Total Fee: ₹80,000.00**<br>**Total Paid: ₹37,500.00**<br>**Balance: ₹42,500.00** |
| **5** | **Keshwa Mistry**<br>`ID: 141`<br>`PA-2024-000013` | Class X<br>Batch A | *"Keshawa 10k is extra"* | Total Fee: ₹85,000<br>Paid: ₹50,000<br>Balance: ₹35,000 (duplicate 05-Aug) | Reversed duplicate payment #107 (₹10,000.00 from raw row 108) with audit note. Cancelled receipt `RCP-2026-0107`. Reconciled active paid to ₹40,000.00. | **Total Fee: ₹85,000.00**<br>**Total Paid: ₹40,000.00**<br>**Balance: ₹45,000.00** |
| **6** | **Samud Kapoor**<br>`ID: 143`<br>`PA-2024-000015` | Class IV<br>Batch A | *"Samud balance is 20500"* | Total Fee: ₹85,000<br>Paid: ₹59,500<br>Balance: ₹25,500 (missing ₹5k payment) | Credited missing installment payment of ₹5,000.00 (`TXN-2026-0171`, `RCP-2026-0171`), linked to invoice 25, updating paid amount to ₹64,500.00. | **Total Fee: ₹85,000.00**<br>**Total Paid: ₹64,500.00**<br>**Balance: ₹20,500.00** |
| **7** | **Kashish Sawant**<br>`ID: 145`<br>`PA-2024-000017` | Class IV<br>Batch A | *"Kashish full paid balance is wrongly shown as 10k"* | Total Fee: ₹85,000<br>Paid: ₹75,000<br>Balance: ₹10,000 | Confirmed agreed package fee of ₹75,000.00 (₹10,000 package discount). Updated structure, assignment, and invoice `total_amount = 75000.00`, setting status to `'paid'`. | **Total Fee: ₹75,000.00**<br>**Total Paid: ₹75,000.00**<br>**Balance: ₹0.00 (Full Paid)** |
| **8** | **Mahek Nair**<br>`ID: 148`<br>`PA-2024-000020` | Class IV<br>Batch A | *"Mahek balance is wrong it should be only 30k. She has discontinued but is continuing for 2 subjects only"* | Total Fee: ₹85,000<br>Paid: ₹34,000<br>Balance: ₹51,000 | Adjusted course fee to ₹64,000.00 (reflecting 2 subjects only: ₹34,000 paid + ₹30,000 balance). Recorded course reduction notes on enrollment and invoice items. | **Total Fee: ₹64,000.00**<br>**Total Paid: ₹34,000.00**<br>**Balance: ₹30,000.00** |

---

## 2. Global Ledger Balance & Verification Summary

Following these targeted, non-destructive reconciliations, the global ledger across the entire institute reflects:

```
+-------------------------------------------------------------------------------+
|                       PRATHAMONE ACADEMY LEDGER METRICS                       |
+-----------------------------+--------------------+----------------------------+
| Metric                      | Pre-Reconciliation | Post-Reconciliation        |
+-----------------------------+--------------------+----------------------------+
| Registered Students         | 39 students        | 39 students (Invariant)    |
| Active Students             | 39 active          | 38 active (1 withdrawn)   |
| Invoiced Students           | 36 students        | 39 students (100% covered) |
| Total Fee Obligation        | ₹2,770,000.00      | ₹2,894,000.00              |
| Total Collections Paid      | ₹1,819,500.00      | ₹1,794,300.00              |
| Total Outstanding Balance   | ₹950,500.00        | ₹1,099,700.00              |
| Formula Verification        | Obligation - Paid  | = Outstanding (Exact Math) |
+-----------------------------+--------------------+----------------------------+
```

### Ledger Math Invariance Check:
$$\text{Total Net Obligation (₹2,894,000.00)} - \text{Total Collected (₹1,794,300.00)} = \text{Total Outstanding (₹1,099,700.00)}$$
$$\text{Integrity Check Status: } \mathbf{TRUE}$$

---

## 3. Financial Audit & Traceability Compliance

1. **Reversal Audit Log**:
   No payment row was deleted. Excess or duplicate entries (Ashwin payments #14, #135, #169 and Keshwa payment #107) are marked `status = 'reversed'` with timestamps, admin actor ID, and exact reason strings preserved for audit review.
2. **Receipt Invalidation**:
   Receipts corresponding to reversed payments are marked `status = 'cancelled'`. New receipt `RCP-2026-0171` was issued for Samud's credited ₹5,000 payment.
3. **Student Lifecycle Audit**:
   Satnam (Satyam) Bhatia's discontinuation is registered with action `'exit'`, effective date `2026-11-05`, reason `'Discontinued'`, and enrollment status `'withdrawn'`.
4. **All Regression Tests Passing**:
   - Backend pytest suites (`test_student_count_reconciliation.py`, `test_payments.py`, `test_payment_workflow.py`): **21 / 21 Passed**.
   - Frontend Vitest suite: **181 / 181 Passed across 24 test suites**.
   - Dedicated verification suite (`scripts/verify_fee_reconciliation.py`): **8 / 8 Checks Passed**.
