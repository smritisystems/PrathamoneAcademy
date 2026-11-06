---
title: "Fees & Billing Developer Manual"
module: "09_FEES_PAYMENTS"
category: "SPECIFICATION"
document_type: "SPECIFICATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-03"
updated_date: "2026-11-03"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["09-fees-payments", "specification"]
entities: ["FeeStructure", "FeePlan", "StudentFee", "Payment"]
api_routes: ["/api/v1/fees", "/api/v1/payments"]
related_modules: []
---

# Fees & Billing Developer Manual

**Backend Files**: `backend/app/api/v1/endpoints/fees.py`, `backend/app/models/fee.py`  
**Frontend Files**: `frontend/src/pages/Fees.tsx`, `frontend/src/api/endpoints.ts`  

---

## 1. Schema & Relationships

```
fee_categories (id, institution_id, name, fee_type)
  └── fee_structures (id, academic_year_id, fee_category_id, standard_id, amount, frequency, due_day)
        └── fee_invoices (id, student_id, total_amount, discount_amount, net_amount, paid_amount, outstanding_amount, status)
              ├── fee_invoice_items (id, invoice_id, description, amount, net_amount)
              └── fee_installments (id, invoice_id, installment_number, amount, paid_amount, due_date, status)
```

---

## 2. API Endpoints

- `GET /api/v1/fees/categories?institution_id={id}`
- `POST /api/v1/fees/categories`: `{ institution_id, name, fee_type, description }`
- `GET /api/v1/fees/structures?academic_year_id={id}`
- `POST /api/v1/fees/structures`: `{ name, fee_category_id, academic_year_id, amount, frequency, due_day, late_fee_amount, late_fee_days }`
- `GET /api/v1/fees/invoices?student_id={id}`: Returns invoices and nested installment schedules.
- `GET /api/v1/fees/installments?invoice_id={id}`: Returns installment rows with balance calculations.

