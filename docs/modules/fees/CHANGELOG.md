# Fees & Billing Changelog

## [1.1.0] - 2026-11-04
### Added
- **Fee Register Workbook Import Service:** Automated ingestion engine for Prashant Academy fee register spreadsheets (`Book1.xlsx`).
- **Multi-Payment Cell Parser:** Robust regex parser detecting multiple dates and currency amounts in individual cells without commas splitting errors.
- **Reconciliation & Audit Engine:** Financial integrity checker auditing stated balance cells against calculated double-entry balances (16 matches, 19 discrepancies, 3 unclear, 1 blank).
- **Alembic Migration `002_fee_register_imports`:** Database audit log table tracking imports by SHA-256 fingerprint, student counts, and transaction sums.
- **REST API Endpoints:** `/api/v1/import/fee-register/preview`, `/preview-upload`, `/execute`, `/status`.
- **Frontend Import UI (`/import/fee-register`):** Multi-tab interface featuring cohort overview, expandable student payment ledger, audit discrepancy table, and atomic execution modal.
- **Reconciliation Audit Report:** Comprehensive per-student documentation in `docs/modules/fees/RECONCILIATION_REPORT.md`.

## [1.0.0] - 2024-01-01
### Added
- Fee categories and structure management interfaces.
- Installment scheduling logic with configurable due days.
- Strict `Numeric(12, 2)` decimal precision across all fee models.
- Support for discounts, scholarships, and invoice line items.

