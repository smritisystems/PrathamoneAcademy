# Payments & Receipts Module Specification

**Module**: Payments, Receipts & Reversals  
**Version**: 1.0.0  
**Status**: IMPLEMENTED  

---

## 1. Purpose & Scope
The core financial engine of Prashant Academy. Handles multi-method payment recording, partial payments against installment schedules, atomic balance updates, official receipt generation, and audited payment reversals.

---

## 2. Features
- Multi-payment collection: Cash, UPI, Cheque, Bank Transfer, Other.
- Fine-grained installment allocation table.
- Automatic receipt issuance with format `RCP-{AY}-{SEQ}`.
- Dedicated printable and downloadable receipt page (`Receipt.tsx`).
- Transaction ledger view (`Payments.tsx`) with status filters.
- Modal-driven payment reversal with mandatory reason capture and balance restoration.

---

## 3. Business Rules & Test Scenarios
- **AC-FEE-001**: 3-payment allocation canonical flow (₹24k -> ₹5k + ₹7k + ₹4k -> ₹8k outstanding balance).
- **AC-FEE-002**: Rejection of overpayments and over-allocations.
- **AC-FEE-003**: Sum of allocations must equal payment total.
- **AC-FEE-004**: Payment reversal restores invoice and installment balances; prevents double reversals.

