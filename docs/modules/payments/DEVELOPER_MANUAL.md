# Payments & Receipts Developer Manual

**Backend Files**: `backend/app/api/v1/endpoints/payments.py`, `backend/app/models/payment.py`  
**Frontend Files**: `frontend/src/pages/FeeCollection.tsx`, `frontend/src/pages/Payments.tsx`, `frontend/src/pages/Receipt.tsx`, `frontend/src/api/endpoints.ts`  
**Test Suite**: `backend/tests/test_payments.py` (9 comprehensive integration tests)  

---

## 1. Core Endpoints

### `POST /api/v1/payments/`
Executes an atomic payment allocation transaction.

**Request**:
```json
{
  "student_id": 1,
  "academic_year_id": 1,
  "amount": 5000.00,
  "payment_date": "2024-06-15",
  "payment_method": "cash",
  "allocations": [
    {
      "invoice_id": 1,
      "installment_id": 1,
      "amount": 5000.00
    }
  ]
}
```

**Response**:
```json
{
  "payment_id": 1,
  "receipt_number": "RCP-1-000001",
  "amount": 5000.0,
  "payment_method": "cash",
  "payment_date": "2024-06-15",
  "message": "Payment recorded successfully"
}
```

### `POST /api/v1/payments/{id}/reverse`
Restores allocated balances and marks payment status `reversed`.

### `GET /api/v1/payments/receipts/{receipt_number}`
Returns the immutable receipt snapshot from `payment_receipts.receipt_data`.

---

## 2. Test Execution
```bash
pytest backend/tests/test_payments.py -v
```
All 9 test cases verify:
- Partial payment logic
- Multi-payment canonical flow
- Overpayment rejections
- Reversals and double-reversal rejections
- Receipt generation and retrieval

