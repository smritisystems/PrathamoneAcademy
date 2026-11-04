# Reports & Dashboard Developer Manual

**Backend Files**: `backend/app/api/v1/endpoints/dashboard.py`, `backend/app/api/v1/endpoints/reports.py`  
**Frontend Files**: `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/Reports.tsx`, `frontend/src/api/endpoints.ts`  

---

## 1. Endpoints

### `GET /api/v1/dashboard/stats`
Query parameters:
- `academic_year_id` (optional int): Filters student enrollments, fee invoices, and payments.
- `institution_id` (optional int): Center / institution scoping.
- `standard_id` (optional int): Filters by course / standard level.
- `division_id` (optional int): Filters by specific batch.

Response payload:
```json
{
  "total_students": 9,
  "total_fees": 24000.0,
  "total_collected": 16000.0,
  "total_outstanding": 8000.0,
  "collection_rate": 66.7,
  "monthly_trends": [
    { "month": "Jul 2024", "collected": 5000.0 },
    { "month": "Sep 2024", "collected": 7000.0 },
    { "month": "Nov 2024", "collected": 4000.0 }
  ],
  "recent_payments": [
    {
      "id": 3,
      "receipt_number": "RCP-1-000003",
      "student_id": 1,
      "student_name": "Rahul Sharma",
      "admission_number": "PA2024001",
      "batch": "Standard 5 - A",
      "amount": 4000.0,
      "payment_date": "2024-11-01",
      "payment_method": "bank_transfer",
      "status": "completed"
    }
  ]
}
```

---

## 2. Reporting Endpoints

### `GET /api/v1/reports/fee-collection`
Returns fee summary collection rows:
```json
[
  {
    "admission_number": "PA2024001",
    "student_name": "Rahul Sharma",
    "total_fees": 24000.0,
    "paid": 16000.0,
    "outstanding": 8000.0
  }
]
```

### `GET /api/v1/reports/outstanding`
Returns invoices where `outstanding_amount > 0`.

### `GET /api/v1/reports/fee-collection/export?format=csv|xlsx`
Streams file binary response with `Content-Disposition: attachment; filename=fee_collection.csv`.
- Uses `csv.writer` or `openpyxl`/`io.StringIO` streaming.

### `GET /api/v1/reports/payments-summary`
Aggregates total payments by `payment_method`.

