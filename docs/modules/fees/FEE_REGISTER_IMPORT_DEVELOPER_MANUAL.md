# Fee Register Import — Developer Manual

## 1. Architectural Overview
The fee register importer is implemented across the backend service layer, REST endpoints, and frontend React UI:

- **Backend Parser & Import Engine:** `backend/app/services/fee_register_importer.py`
- **Alembic Migration:** `backend/alembic/versions/002_fee_register_imports.py`
- **Database Model:** `backend/app/models/import_log.py` (`FeeRegisterImport`)
- **API Endpoints:** `backend/app/api/v1/endpoints/import_register.py`
- **Frontend Page:** `frontend/src/pages/ImportFeeRegister.tsx`
- **API Client:** `frontend/src/api/endpoints.ts` (`feeRegisterImportApi`)
- **Test Suite:** `backend/tests/test_fee_register_import.py`

---

## 2. Parser Mechanics

### A. Regex Parsing of Cell Strings
Cells in Excel often contain multi-line text and embedded commas that conflict with Indian currency notation (e.g. `₹10,000`).

To avoid corrupted splitting, `parse_payment_cell` utilizes an exact regex pattern:
```python
PAYMENT_REGEX = re.compile(
    r'(?P<date>(?:\d{1,2}\s+)?[A-Za-z]+(?:\s+\d{4})?)\s*[^\d₹]*\s*[₹Rs\.]*\s*(?P<amount>[\d,]{3,})'
)
```
Dates and day numbers are extracted using:
- Date string matcher `r'(\d{1,2})\s*([A-Za-z]+)'` or `r'([A-Za-z]+)\s*(\d{1,2})'`.
- Year matcher `r'\b(202\d)\b'`. If unspecified, months 1–3 use year 2025 (or 2024 if in initial columns), while months 4–12 use 2024.
- Calendar day boundary checks prevent overflow (e.g. capping day 31 to 30 for September).

### B. Double-Entry Ingestion Pipeline
When `execute_fee_register_import` is called within an async database transaction:
1. **Fingerprint Verification:** Checks if `FeeRegisterImport` contains the SHA-256 hash. If present and `replace_demo_data=False`, raises `HTTPException(400)`.
2. **Demo Data Purge (Optional):** Deletes students matching `PA2024%` or `PA-2024-%` along with dependent allocations, receipts, payments, and invoices.
3. **Cohort Provisioning:** Ensures `Standard` (levels 8, 9, 10) and `Division` (batches `Standard 10 - ICSE X`, etc.) exist.
4. **Student & Enrollment Creation:** Creates `Student` records with formatted admission numbers `PA-2024-{index:06d}` and `StudentEnrollment` for academic session `2024-25`.
5. **Fee Invoice Generation:** Creates `FeeInvoice` with total net amount = spreadsheet fee obligation.
6. **Payment & Receipt Creation:** For each parsed payment, creates a `Payment`, allocates to invoice via `PaymentAllocation`, and issues a `PaymentReceipt` with format `RCP-{academic_year}-{sequence:06d}`.
7. **Audit Log Persistence:** Commits execution stats to `fee_register_imports`.

---

## 3. Database Schema

### Table: `fee_register_imports`
```sql
CREATE TABLE fee_register_imports (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_hash VARCHAR(64) NOT NULL UNIQUE,
    imported_students_count INTEGER NOT NULL DEFAULT 0,
    imported_payments_count INTEGER NOT NULL DEFAULT 0,
    total_fees_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_collected_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_outstanding_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    reconciliation_summary JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    imported_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 4. REST API Reference

| Endpoint | Method | Query / Payload | Response | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/import/fee-register/preview` | `GET` | `file_path` (optional) | `FeeRegisterPreviewResponse` | Parses default workbook and returns structured preview with audit reconciliation |
| `/api/v1/import/fee-register/preview-upload` | `POST` | `multipart/form-data` (`file`) | `FeeRegisterPreviewResponse` | Parses an uploaded `.xlsx` file |
| `/api/v1/import/fee-register/execute` | `POST` | `{"replace_demo_data": bool, "file_path": str}` | `FeeRegisterImportExecutionResponse` | Executes atomic import into PostgreSQL |
| `/api/v1/import/fee-register/status` | `GET` | — | `{"already_imported": bool, "history": [...]}` | Retrieves import history and fingerprint status |

---

## 5. Automated Testing
Run all unit and integration tests with pytest:
```bash
pytest backend/tests/test_fee_register_import.py -v
```
All 16 full-suite tests run and pass cleanly.

