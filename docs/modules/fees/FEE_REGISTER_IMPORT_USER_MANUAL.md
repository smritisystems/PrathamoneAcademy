# Fee Register Import — User Manual

## 1. Introduction
The **Fee Register Import** tool allows institute administrators to preview, audit, and import student enrollments, fee obligations, and monthly payment records directly from Microsoft Excel fee registers.

---

## 2. Access & Permissions
- **Permitted Roles:** `admin`, `superadmin`, `accountant`
- **Navigation:**
  - Option A: Click **Import Register** in the main sidebar.
  - Option B: Navigate to **Fees** and click **Import Fee Register (Excel)** in the upper-right header.
  - Option C: Direct URL: `/import/fee-register`.

---

## 3. Workflow Steps

### Step 1: Preview Default Register
1. When opening the page, the system automatically detects the default register workbook (`Book1.xlsx`).
2. High-level metric cards display:
   - **Total Students:** 39 students detected across 5 batches.
   - **Total Fee Obligation:** ₹2,935,000.00.
   - **Total Payments Collected:** ₹1,819,500.00 across 170 individual transactions.
   - **Calculated Outstanding:** ₹1,115,500.00.
3. If importing a different file, click **Upload Other Register** and select a `.xlsx` workbook.

### Step 2: Inspecting Students and Payments
1. Open the **Students & Payments Ledger** tab.
2. Use the **Search bar** to find students by name.
3. Filter by **Batch** (e.g. `ICSE X`, `CBSE X`, `ICSE 9th`, `ICSE VIII`, `SSC IX`).
4. Filter by **Audit Status** (e.g. `Reconciled`, `Discrepancy`, `Unclear`, `Blank`).
5. Click the **Chevron arrow** (`>`) or **Expand All Payments** to view the granular payment transactions for any student (date, parsed amount, and original cell text).

### Step 3: Reviewing Discrepancies
1. Open the **Reconciliation & Audit Discrepancies** tab.
2. Review the 19 discrepancies, 3 unclear entries, and 1 blank entry:
   - Notice students with 0 monthly entries in the sheet (e.g. Shaurya, Sushmya, Aaradhya) where a stated balance exists.
   - Notice Vedant where stated balance is `Full paid` but payments sum to ₹41,000.
   - Notice Siddhant Rai & Siddhant where stated balance is `Unclear` but payments sum to 100% of fees.
   - Read the audit notes column for context.

### Step 4: Executing the Database Import
1. Click the **Confirm & Execute Import** button.
2. In the confirmation dialog:
   - Review the record counts (39 students, 39 invoices, 170 payments).
   - Check or uncheck **Replace Demo & Synthetic Data** (checked by default to remove dummy test data).
3. Click **Proceed with Import**.
4. Once completed, a green confirmation banner appears.
5. Click **View Live Dashboard** to see updated charts, collection rates, and recent payments.

---

## 4. Troubleshooting & FAQ

- **Q: What happens if I click import again with the same file?**  
  *A:* The system calculates the SHA-256 fingerprint of the file. Duplicate imports are rejected with a warning banner to prevent duplicate fee invoices or double-counted payments.
- **Q: Can I manually correct a student's balance after import?**  
  *A:* Yes. Use the **Fees** or **Fee Collection** page to collect remaining balances or record receipts with specific cheque/bank references.

