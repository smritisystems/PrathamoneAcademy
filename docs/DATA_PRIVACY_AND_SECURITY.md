# Data Privacy and Security Governance
**Document ID**: DPS-001  
**Version**: 1.0-DRAFT  
**Parent Framework**: CIPF-001  
**Status**: APPROVED DEFAULT ARCHITECTURE / DRAFT POLICIES PENDING OWNER CONFIRMATION  
**Target System**: Prashant Academy SMS / Coaching Management System  

---

## 1. Compliance and Legal Mandates

Prashant Academy operates in full compliance with:
- **Digital Personal Data Protection Act, 2023 (DPDP Act - India)**: Enforcing strict parental consent for processing minor children's personal and academic data.
- **Aadhaar (Targeted Delivery of Financial and Other Subsidies, Benefits and Services) Act**: Masking and encrypting national identification numbers.
- **Information Technology Act, 2000 & IT (Reasonable Security Practices) Rules, 2011**.

---

## 2. Sensitive Personal Data Handling (SPDI)

### 2.1 Aadhaar and Identity Masking
- Aadhaar numbers, if provided during admission, **must never be stored as unencrypted cleartext** in production databases.
- `[OPEN DECISION: PDR-014]` Recommendation: Store only the last 4 digits (`XXXXXXXX1234`) in user-facing views. Backend stores full numbers utilizing AES-256 field-level encryption with encryption keys managed via secure environment variables (`ENCRYPTION_KEY`).

### 2.2 Guardian Consent & Minor Data Protection
- In compliance with Section 9 of the DPDP Act 2023:
  - Personal data of students under 18 years is collected only with the verified consent of the registered guardian.
  - Tracking or behavioral profiling of minor students for commercial targeting is strictly prohibited.

---

## 3. Authentication & Session Architecture

### 3.1 Token Standards
- **Token Type**: JSON Web Token (JWT) signed via HMAC-SHA256 (`HS256`).
- **Access Token Lifespan**: `ACCESS_TOKEN_EXPIRE_MINUTES = 1440` (24 hours).
- **Refresh Token Lifespan**: 7 days with token rotation.
- **Password Storage**: Passwords hashed using `bcrypt` with automatic salt generation and work factor $\ge 12$. Plaintext passwords are never logged or stored.

### 3.2 Authorization & Boundary Enforcement
- All endpoints beneath `/api/v1` require Bearer authentication (except `/auth/login` and `/health`).
- Role-based route guards verify `current_user.role` against required permission levels.
- Unauthorized attempts return HTTP 401 (`Unauthorized`) or HTTP 403 (`Forbidden`).

---

## 4. Audit Logging & Forensic Traceability

The `audit_logs` table records every critical state change across the application:

```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,            -- 'create', 'update', 'delete', 'reverse', 'login'
    resource_type VARCHAR(50) NOT NULL,     -- 'student', 'payment', 'invoice', 'attendance'
    resource_id INTEGER,
    old_data JSONB,                         -- State before mutation
    new_data JSONB,                         -- State after mutation
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

- Financial modifications (payments, allocations, reversals, invoice generation) trigger mandatory synchronous audit logging within the same database transaction.

---

## 5. Data Retention, Backup, and Disaster Recovery

### 5.1 Data Retention Policy `[PROPOSED]`
- **Active Student Records**: Retained for the duration of enrollment + 5 academic years post-graduation.
- **Financial Ledger & Receipts**: Retained for a minimum of **8 financial years** in compliance with Indian Income Tax Act regulations.
- **Daily Attendance Logs**: Retained for 3 academic years.

### 5.2 Backup Standard Operating Procedure
1. **Automated Daily Logical Backups**: Scheduled nightly at 02:00 AM IST via `pg_dump` targeting compressed SQL/custom archive:
   ```bash
   pg_dump -Fc -h db -U prashant_user prashant_academy_db > /backup/pa_db_$(date +%Y%m%d).dump
   ```
2. **Encrypted Offsite Replication**: Daily backup archives encrypted using GPG and replicated to offsite S3/GCS bucket with 30-day retention.
3. **Recovery Point Objective (RPO)**: $< 24\text{ hours}$.
4. **Recovery Time Objective (RTO)**: $< 2\text{ hours}$ to restore full operational state.

---

*End of DATA_PRIVACY_AND_SECURITY.md*

