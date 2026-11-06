---
title: "Online Payment Gateway Integration (Razorpay / UPI) Implementation Report"
module: "09_FEES_PAYMENTS"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-06"
updated_date: "2026-11-06"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["payments", "razorpay", "upi", "qr-code", "checkout", "receipts", "webhook", "cryptography"]
entities: ["Payment", "FeeInvoice", "PaymentAllocation", "PaymentReceipt", "InstitutionSetting"]
api_routes: [
  "/api/v1/payments/online/config",
  "/api/v1/payments/online/create-order",
  "/api/v1/payments/online/verify",
  "/api/v1/payments/online/webhook"
]
related_modules: ["09_FEES_PAYMENTS", "10_FINANCE_ACCOUNTING", "15_INTEGRATIONS"]
---

# PRATHAMONE EduOS — ONLINE PAYMENT GATEWAY INTEGRATION (RAZORPAY / UPI)
## Module Implementation & Verification Report (v1.0.0)

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Module:** 09_FEES_PAYMENTS & 15_INTEGRATIONS  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Policy Status:** FULLY COMPLIANT — SSOT & ANTI-DUPLICATION STRICTLY ENFORCED  

---

## 1. EXECUTIVE SUMMARY

The Online Payment Gateway & UPI Checkout engine has been successfully implemented and verified for **PrathamOne EduOS** (Coaching Institute Edition v1.0.0).

This module enables coaching institutes, cashiers, students, and parents to:
1. Settle student tuition fee invoices seamlessly through dynamic UPI QR codes, Razorpay online checkout, debit/credit cards, and net-banking.
2. Dynamically generate NPCI-standard UPI Intent links (`upi://pay?pa=...&pn=...&am=...&tr=...`) and render high-contrast SVG QR codes for instant mobile camera and UPI app scanning (GPay, PhonePe, Paytm, BHIM).
3. Cryptographically verify payment signatures via HMAC SHA256 before modifying financial ledger balances.
4. Automatically record canonical `Payment` transactions with `payment_method = 'upi'`, perform idempotent allocations to `FeeInvoice` records, and generate sequential, printable fee receipts (`PaymentReceipt`).
5. Provide a modern, interactive checkout modal with custom amount selection, copyable VPA, deep links to UPI mobile apps, test-mode simulators, and instantaneous receipt generation.

---

## 2. ARCHITECTURAL SSOT COMPLIANCE

Per **RULE 001** and **RULE 002** of the Single Source of Truth directive:
- **No Duplicate Payment Master Tables:**
  All online gateway transactions post directly to the canonical `payments` table with `payment_method = 'upi'` and `transaction_reference = razorpay_payment_id`.
- **Authoritative Balance Deductions:**
  Deductions from `fee_invoices.paid_amount` and `outstanding_amount` are governed exclusively by the authoritative domain service `execute_payment_posting`. The frontend never calculates financial persistence.
- **Idempotency Protection:**
  Duplicate webhook callbacks or client-side retry submissions detect existing `transaction_reference` values and safely return the existing receipt without duplicate deductions.
- **Centralized Configuration:**
  Gateway credentials (Key ID, Secret, UPI VPA, Merchant Name, Sandbox/Live toggle) are stored in canonical `institution_settings` under the `payment_gateway` category.

---

## 3. IMPLEMENTED COMPONENTS & API ROUTES

### 3.1 Backend Domain Service (`backend/app/services/payment_gateway.py`)
- `get_payment_gateway_config(db, institution_id)`: Fetches authoritative credentials with secret key masking.
- `update_payment_gateway_config(db, institution_id, updates)`: Updates gateway settings for the institution.
- `generate_upi_uri(vpa, merchant_name, amount, order_id, invoice_number)`: Formats NPCI UPI deep links.
- `create_gateway_order(db, invoice_id, amount, installment_id)`: Validates invoice balance and generates order parameters + vector SVG QR code.
- `verify_razorpay_signature(order_id, payment_id, signature, secret, is_test_mode)`: Computes HMAC SHA256 digest to verify authenticity.
- `verify_and_post_gateway_payment(db, ...)`: Idempotently creates canonical `Payment`, calls `execute_payment_posting`, and returns the valid `PaymentReceipt`.

### 3.2 REST API Routes (`backend/app/api/v1/endpoints/payments.py`)
- `GET /api/v1/payments/online/config`: Returns public gateway configuration with masked credentials.
- `PUT /api/v1/payments/online/config`: Administrative update endpoint for gateway keys.
- `POST /api/v1/payments/online/create-order`: Generates Razorpay order details and dynamic UPI QR code.
- `POST /api/v1/payments/online/verify`: Cryptographically verifies signature and posts payment.
- `POST /api/v1/payments/online/webhook`: Asynchronous server-to-server webhook receiver.

### 3.3 Frontend Client & UI Components
- `frontend/src/api/endpoints.ts`: Added typed API methods to `paymentsApi`.
- `frontend/src/types/index.ts`: Typed interfaces `PaymentGatewayConfig`, `OnlineOrderResponse`, `OnlinePaymentVerifyPayload`, `OnlinePaymentVerifyResult`.
- `frontend/src/components/OnlinePaymentModal.tsx`:
  - Step 1: Amount selection (full outstanding balance or custom partial payment).
  - Step 2: Tabbed checkout interface with Dynamic UPI QR Code, copyable VPA, deep link to UPI apps, Razorpay card gateway, and test simulator.
  - Step 3: Success screen with transaction ID, remaining balance, and direct "View / Print Receipt" launcher.
- `frontend/src/pages/StudentDetail.tsx`:
  - Added "Pay UPI" action button on outstanding invoices in the Fees & Ledger table.
  - Integrated `OnlinePaymentModal` with automatic ledger cache invalidation.
- `frontend/src/pages/FeeCollection.tsx`:
  - Added quick "Generate Dynamic UPI QR Code for Counter Payment" trigger when selecting UPI mode.

---

## 4. VERIFICATION & TEST RESULTS

### 4.1 Backend Pytest Suite (`backend/tests/test_payment_gateway.py`)
- `test_gateway_configuration`: Verified configuration persistence and secret key masking.
- `test_create_gateway_order_and_upi_qr`: Verified order parameter creation, amount in paise, valid `upi://` URI, and SVG QR output.
- `test_signature_verification_and_financial_posting`: Verified cryptographic HMAC SHA256 signature verification, canonical payment creation, balance deduction, receipt generation, and idempotency protection.
- `test_online_gateway_api_endpoints`: Verified REST routes for configuration, order creation, and payment verification.
- **Result:** `4 passed, 2 warnings in 15.59s` (100% pass rate).

### 4.2 Frontend Vitest Suite (`frontend/src/test/OnlinePaymentGateway.test.tsx`)
- `renders initial order step with invoice balance and amount selection`: Passed.
- `generates dynamic UPI QR code and order details on proceed`: Passed.
- `verifies payment and renders official receipt confirmation`: Passed.
- **Result:** `3 passed in 279ms` (100% pass rate).

### 4.3 Full Strategic Roadmap Cross-Module Test Suite
- `tests/test_communication_automation.py` (3 passed)
- `tests/test_id_cards_and_qr_attendance.py` (3 passed)
- `tests/test_examinations_and_report_cards.py` (2 passed)
- `tests/test_payment_gateway.py` (4 passed)
- **Total Backend:** `12 passed in 43.24s`.
- **Total Frontend:** `16 passed across 4 test files in 17.96s`.

---

## 5. REPOSITORY HEALTH & ATTRIBUTION COMPLIANCE

1. **Attribution Header Check:**
   `python scripts/manage_headers.py check` verified across all source files: 100% compliant.
2. **Documentation Management Engine:**
   Reindexed and validated via `python tools/docs_manager.py reindex && python tools/docs_manager.py validate`: 100% compliant with 0 errors.
