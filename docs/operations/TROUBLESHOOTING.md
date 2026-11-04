# Troubleshooting and Operations Runbook

---

## 1. Common Issues and Resolutions

### Error: `ECONNREFUSED` or `database "prashant_academy" does not exist`
- **Cause**: PostgreSQL service is stopped or database has not been initialized.
- **Resolution**:
  1. Start PostgreSQL server (`net start postgresql` on Windows or `docker compose up -d db`).
  2. Create database: `createdb -U postgres prashant_academy`.
  3. Verify connection string in `.env`.

### Error: `Total allocation must equal payment amount`
- **Cause**: The sum of values entered in the installment allocation table does not match the total payment amount entered at the top of the Fee Collection form.
- **Resolution**: Verify that the sum of all allocation input rows exactly equals the `amount` field.

### Error: `Allocation amount exceeds outstanding`
- **Cause**: An accountant is attempting to collect more than the remaining balance on an invoice or installment.
- **Resolution**: Check the current outstanding balance. In Prashant Academy, overpayments are rejected to prevent ledger corruptions.

### Error: `Payment already reversed`
- **Cause**: The payment record is already in `reversed` status.
- **Resolution**: Double reversals are prevented by database checks. A new payment must be recorded if funds were re-received.

### Error: Port 5173 or 8000 already in use
- **Resolution**:
  - Windows: `netstat -ano | findstr :8000` followed by `taskkill /PID <PID> /F`.
  - Or run on alternate port: `uvicorn app.main:app --port 8001`.

