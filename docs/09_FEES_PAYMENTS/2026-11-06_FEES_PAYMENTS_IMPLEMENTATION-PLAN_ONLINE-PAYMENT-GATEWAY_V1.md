---
title: "Online Payment Gateway Integration (Razorpay / UPI) Implementation Plan"
module: "09_FEES_PAYMENTS"
category: "IMPLEMENTATION-PLAN"
document_type: "PLAN"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-06"
updated_date: "2026-11-06"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["payments", "razorpay", "upi", "qr-code", "gateway", "online-checkout", "receipts"]
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
## Technical Implementation Plan — Version 1.0.0

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Module:** 09_FEES_PAYMENTS & 15_INTEGRATIONS  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  

---

## 1. OBJECTIVE & EXECUTIVE SCOPE

Implement an enterprise-grade Online Payment Gateway & UPI Checkout engine for **PrathamOne EduOS** (Coaching Institute Edition v1.0.0) that allows students, parents, and cashiers to settle tuition fees seamlessly via Razorpay, dynamic UPI QR codes, debit/credit cards, and net-banking.

Key capabilities to implement:
1. **Dynamic Order Creation API:** Converts fee invoice balances into Razorpay orders or UPI payment payloads.
2. **Cryptographic Signature Verification:** Verifies payment authenticity via HMAC SHA256 signatures for security against tampering.
3. **Automated Ledger Posting & Receipt Generation:** Leverages canonical `Payment` and `PaymentReceipt` entities to automatically post payments, reduce outstanding amounts, and generate official sequential receipts.
4. **Dynamic UPI QR Code Generator:** Creates instant UPI URIs (`upi://pay?pa=...&pn=...&am=...&tr=...`) rendered as vector QR codes for instant mobile payment scanning.
5. **Interactive Checkout Modal:** A clean, responsive online payment modal with instant verification and direct receipt viewing.

---

## 2. SSOT & ANTI-DUPLICATION COMPLIANCE

Per **RULE 001** and **RULE 002** of the SSOT Directive:
- **No Parallel Payment Tables:** All gateway transactions post directly to the canonical `payments` table with `payment_method = 'upi'` or `'razorpay'` and `transaction_reference = razorpay_payment_id`.
- **Authoritative Invoices & Installments:** Deductions update canonical `fee_invoices.paid_amount` and `outstanding_amount` via the existing `execute_payment_posting` domain service.
- **Config Storage:** Razorpay Key ID, Secret, and UPI VPA settings stored in `institution_settings` under category `integrations`.

---

## 3. IMPLEMENTATION WORKFLOW

### Step 1: Backend Domain Service (`backend/app/services/payment_gateway.py`)
- `get_gateway_config(db, institution_id)`: Fetches Razorpay credentials and UPI VPA.
- `update_gateway_config(db, institution_id, data)`: Updates gateway settings securely.
- `create_gateway_order(db, invoice_id, amount, installment_id)`: Validates invoice balance and generates order payload.
- `verify_and_post_gateway_payment(db, payload, current_user_id)`: Validates cryptographic signature, creates `Payment`, calls `execute_payment_posting`, and returns official receipt.
- `process_gateway_webhook(db, event_payload, signature)`: Idempotently processes asynchronous webhook notifications.

### Step 2: REST Endpoints in `backend/app/api/v1/endpoints/payments.py`
- `GET /api/v1/payments/online/config`
- `PUT /api/v1/payments/online/config`
- `POST /api/v1/payments/online/create-order`
- `POST /api/v1/payments/online/verify`
- `POST /api/v1/payments/online/webhook`

### Step 3: Frontend Client & Components
- Add typed endpoints in `frontend/src/api/endpoints.ts`.
- Build `frontend/src/components/OnlinePaymentModal.tsx` with dynamic UPI QR code generator, amount selector, checkout simulator, and direct receipt launcher.
- Integrate "Pay Online / UPI" buttons in `frontend/src/pages/FeeCollection.tsx`, `frontend/src/pages/Fees.tsx`, and `frontend/src/pages/StudentDetail.tsx`.

### Step 4: Verification
- Comprehensive Pytest test suite `backend/tests/test_payment_gateway.py`.
- Comprehensive Vitest test suite `frontend/src/test/OnlinePaymentGateway.test.tsx`.
- Documentation indexing and header verification (100%).

