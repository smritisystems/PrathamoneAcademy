# Fee Register Workbook Import Specification

## 1. Overview & Business Objectives
The Prashant Academy Fee Register Import system facilitates the automated, auditable, and non-destructive ingestion of historical and operational fee registers recorded in Microsoft Excel (`.xlsx`) spreadsheets into the Prashant Academy Coaching Institute Management System.

The primary objective is to transition from unstandardized manual spreadsheets (e.g. `Book1.xlsx`) to a relational PostgreSQL database while preserving double-entry accounting integrity, historical payment dates, exact currency amounts, and cohort classifications.

---

## 2. Source Data Structure (`Book1.xlsx`)
The primary source workbook contains 1 worksheet (`Sheet1`), 47 rows, and 25 columns organized as follows:
- **Title Block:** Rows 1–2 (`PRASHANT ACADEMY`, `FEE REGISTER FOR THE YEAR 2024 - 2025`).
- **Cohort Header Rows:** Identified by unique text in Column 1:
  - `ICSE X` (Row 3)
  - `CBSE X` (Row 13)
  - `ICSE 9th` (Row 20)
  - `ICSE VIII` (Row 37)
  - `SSC IX` (Row 44)
- **Column Header Row:** Row 4 (Column A: `Student Name`, Column B: `TOTAL FEE`, Columns C–T: Monthly merged headers, Column U: `BALANCE`).
- **Merged Column Layout:** Columns C–T represent months March through November in merged 2-column spans (C–D = March, E–F = April, G–H = May, I–J = June, K–L = July, M–N = August, O–P = September, Q–R = October, S–T = November). Openpyxl places the text in the even column index (D, F, H, J, L, N, P, R, T).
- **Payment Cells:** Contain mixed strings specifying payment date, optional day/month/year tokens, and currency amounts (e.g., `3 May ₹10,000 , 30 May ₹10,000` or `2 July\n₹9,500\n \n30 July\n₹9,500`).

---

## 3. Target Entity Mapping

| Workbook Element | System Entity | Mapping / Translation Rules |
| :--- | :--- | :--- |
| Cohort Group Header | `Standard` & `Division` | `ICSE X` -> Std 10, Batch `Standard 10 - ICSE X`<br>`CBSE X` -> Std 10, Batch `Standard 10 - CBSE X`<br>`ICSE 9th` -> Std 9, Batch `Standard 9 - ICSE 9th`<br>`ICSE VIII` -> Std 8, Batch `Standard 8 - ICSE VIII`<br>`SSC IX` -> Std 9, Batch `Standard 9 - SSC IX` |
| Student Name (Col A) | `Student` | Split into `first_name` and `last_name`. Generates unique `admission_number` formatted as `PA-2024-{index:06d}`. Gender set to `unknown`. |
| Student Row | `StudentEnrollment` | Linked to student, standard, division (batch), and academic session `2024-25`. |
| Total Fee (Col B) | `FeeStructure` & `StudentFeeAssignment` | Represents annual course fee obligation. |
| Invoiced Obligation | `FeeInvoice` & `FeeInvoiceItem` | `invoice_number` formatted as `INV-2024-{index:04d}`. Net amount equals stated total fee. |
| Monthly In-Cell Payments | `Payment` & `PaymentAllocation` | Distinct records per detected payment. Date parsed from cell; amount extracted via regex. |
| Payment Transactions | `PaymentReceipt` | Sequential official receipt generated for every payment: `RCP-{academic_year}-{sequence:06d}`. |
| Import Metadata | `FeeRegisterImport` | Tracks source file hash (SHA-256), student count, total fees, collected amount, and reconciliation log. |

---

## 4. Financial Integrity Rules

1. **Zero Data Invention:** Missing dates, unrecorded methods, or omitted payments are never fabricated. If no date is given in a payment cell, the default 1st of the column's month is used.
2. **Double-Entry Balance Derivation:**
   $$\text{Calculated Balance} = \text{Total Invoiced Obligation} - \sum \text{Imported Payment Transactions}$$
   The calculated balance is authoritative for invoice `outstanding_amount`.
3. **Discrepancy Segregation:** The spreadsheet's stated balance cell is audited against the calculated balance:
   - `MATCH`: Calculated balance matches stated balance within ₹0.01.
   - `DISCREPANCY`: Variance exists between recorded payments and author's stated balance.
   - `UNCLEAR`: Author marked cell as `Unclear`.
   - `BLANK`: Stated balance cell was omitted.
4. **Calendar Bounds Normalization:** Erroneous calendar dates (e.g. `31 Sept`) are automatically capped to valid calendar days (`Sept 30`).
5. **Idempotent Imports:** Source workbook SHA-256 fingerprint check prevents duplicate submissions.

