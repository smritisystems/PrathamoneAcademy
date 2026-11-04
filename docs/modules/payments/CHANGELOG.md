# Payments & Receipts Changelog

## [1.0.0] - 2024-01-01
### Added
- Complete transaction ledger implementation (`payments`, `payment_allocations`, `payment_receipts`).
- Support for Cash, UPI, Cheque, and Bank Transfer payment modes.
- Receipt numbering engine (`RCP-{AY}-{SEQ}`).
- Reversal workflow with automatic balance restoration and reason logging.
- Verified test coverage in `backend/tests/test_payments.py`.

