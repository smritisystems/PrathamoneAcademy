# Payments & Receipts User Manual

**Target Audience**: Cashiers, Accountants, Bursars, Administrators  

---

## 1. How to Collect a Fee Payment

### Step 1: Open Collection Screen
- Go to **Students**, find the student, and click **💳 Collect Fee** (or navigate to `/fees/collect/{studentId}`).
- Select the active invoice from the left panel.

### Step 2: Enter Payment Details
- **Payment Amount (₹)**: Enter the amount the student/parent is paying.
- **Payment Method**: Select Cash, UPI, Bank Transfer, or Cheque.
- **Transaction Reference**: Enter UPI UTR, Cheque Number, or Bank Reference.
- **Installment Allocation**:
  - In the installment schedule table, check the installment(s) being paid.
  - Enter the amount applied to each installment.
  - Ensure the Total Allocated matches the payment amount exactly.

### Step 3: Record Payment
- Click **💳 Record Payment**.
- The system confirms the transaction, updates outstanding balances, and opens the **Payment Receipt Modal**.
- Click **🖨️ Print Receipt** to print an official physical copy for the parent.

---

## 2. Reversing a Payment
1. Navigate to **Payments** on the sidebar.
2. Locate the transaction in the ledger.
3. Click the **Reverse** button on the right side of the row.
4. In the confirmation modal, enter the mandatory reason (e.g., `Cheque bounced by bank on 12-Jan`).
5. Click **Confirm Reversal**.
6. The payment status changes to `reversed`, the student's outstanding fee balance increases automatically, and an audit log entry is saved.

