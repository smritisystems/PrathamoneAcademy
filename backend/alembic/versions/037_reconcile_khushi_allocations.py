# /**
#  * @file        037_reconcile_khushi_allocations.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.alembic.versions
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-10
#  * @updated     2026-11-11
#  *
#  * @description Forensic data reconciliation resolving Khushi (PA-2024-000019) fee commitment,
#  */

"""reconcile_khushi_allocations

Revision ID: 037_khushi_reconcile
Revises: 036_client_reconcile
Create Date: 2026-11-10 14:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
import json

# revision identifiers, used by Alembic.
revision = '037_khushi_reconcile'
down_revision = '036_client_reconcile'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # -------------------------------------------------------------
    # 1. KHUSHI (student_id = 147, PA-2024-000019)
    #    Reconcile Payment #69 to Rs 20,000 and Receipt RCP-2026-0180
    # -------------------------------------------------------------
    # 1A. Update Payment #69 amount to Rs 20,000.00
    op.execute("""
        UPDATE payments
        SET amount = 20000.00,
            status = 'completed',
            notes = 'Payment #69 for Khushi - Reconciled to Rs 20,000 (RCP-2026-0180)'
        WHERE id = 69 AND student_id = 147
    """)

    # 1B. Supersede Receipt RCP-2026-0069
    op.execute("""
        UPDATE payment_receipts
        SET status = 'superseded',
            superseded_at = NOW(),
            superseded_by_receipt_number = 'RCP-2026-0180'
        WHERE receipt_number = 'RCP-2026-0069' AND student_id = 147
    """)

    # 1C. Insert or update RCP-2026-0180
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM payments WHERE id = 69) THEN
                IF EXISTS (SELECT 1 FROM payment_receipts WHERE receipt_number = 'RCP-2026-0180') THEN
                    UPDATE payment_receipts
                    SET payment_id = 69,
                        student_id = 147,
                        amount = 20000.00,
                        status = 'valid',
                        version = 2
                    WHERE receipt_number = 'RCP-2026-0180';
                ELSE
                    INSERT INTO payment_receipts (
                        receipt_number, payment_id, student_id, amount, payment_date,
                        payment_method, receipt_data, version, status, reprint_count,
                        is_demo, data_environment, generated_at
                    ) VALUES (
                        'RCP-2026-0180', 69, 147, 20000.00, '2026-06-18',
                        'bank_transfer',
                        '{"batch": "Batch A (Morning)", "notes": "Installment 1 for Khushi", "amount": 20000.0, "raw_date": "18-Jun-2026", "standard": "Class IX", "payment_date": "18-Jun-2026", "student_name": "Khushi", "invoice_number": "INV-2026-0147", "payment_method": "bank_transfer", "receipt_number": "RCP-2026-0180", "admission_number": "PA-2024-000019", "transaction_reference": "TXN-2026-0069"}',
                        2, 'valid', 0,
                        FALSE, 'PRODUCTION', NOW()
                    );
                END IF;
            END IF;
        END $$;
    """)

    # 1D. Reallocate Payment #69 to Invoice #29 for full Rs 20,000.00
    op.execute("""
        UPDATE payment_allocations
        SET allocated_amount = 20000.00
        WHERE payment_id = 69 AND invoice_id = 29
    """)

    # -------------------------------------------------------------
    # 2. KHUSHI: Reconcile Payment #83 to Rs 17,000 and Receipt RCP-2026-0181
    # -------------------------------------------------------------
    # 2A. Update Payment #83 amount to Rs 17,000.00
    op.execute("""
        UPDATE payments
        SET amount = 17000.00,
            status = 'completed',
            notes = 'Payment #83 for Khushi - Reconciled to Rs 17,000 (RCP-2026-0181)'
        WHERE id = 83 AND student_id = 147
    """)

    # 2B. Supersede Receipt RCP-2026-0083
    op.execute("""
        UPDATE payment_receipts
        SET status = 'superseded',
            superseded_at = NOW(),
            superseded_by_receipt_number = 'RCP-2026-0181'
        WHERE receipt_number = 'RCP-2026-0083' AND student_id = 147
    """)

    # 2C. Insert or update RCP-2026-0181
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM payments WHERE id = 83) THEN
                IF EXISTS (SELECT 1 FROM payment_receipts WHERE receipt_number = 'RCP-2026-0181') THEN
                    UPDATE payment_receipts
                    SET payment_id = 83,
                        student_id = 147,
                        amount = 17000.00,
                        status = 'valid',
                        version = 2
                    WHERE receipt_number = 'RCP-2026-0181';
                ELSE
                    INSERT INTO payment_receipts (
                        receipt_number, payment_id, student_id, amount, payment_date,
                        payment_method, receipt_data, version, status, reprint_count,
                        is_demo, data_environment, generated_at
                    ) VALUES (
                        'RCP-2026-0181', 83, 147, 17000.00, '2026-07-08',
                        'bank_transfer',
                        '{"batch": "Batch A (Morning)", "notes": "Installment 2 for Khushi", "amount": 17000.0, "raw_date": "08-Jul-2026", "standard": "Class IX", "payment_date": "08-Jul-2026", "student_name": "Khushi", "invoice_number": "INV-2026-0147", "payment_method": "bank_transfer", "receipt_number": "RCP-2026-0181", "admission_number": "PA-2024-000019", "transaction_reference": "TXN-2026-0083"}',
                        2, 'valid', 0,
                        FALSE, 'PRODUCTION', NOW()
                    );
                END IF;
            END IF;
        END $$;
    """)

    # 2D. Reallocate Payment #83 to Invoice #29 for full Rs 17,000.00
    op.execute("""
        UPDATE payment_allocations
        SET allocated_amount = 17000.00
        WHERE payment_id = 83 AND invoice_id = 29
    """)

    # -------------------------------------------------------------
    # 3. RECONCILE INVOICE #29 (INV-2026-0147) & INVOICE ITEMS
    # -------------------------------------------------------------
    op.execute("""
        UPDATE fee_invoices
        SET paid_amount = 37000.00,
            outstanding_amount = 48000.00,
            status = 'partial',
            notes = COALESCE(notes, '') || ' | Reconciled: Receipts RCP-2026-0180 (Rs 20k) & RCP-2026-0181 (Rs 17k) fully allocated'
        WHERE id = 29 AND student_id = 147
    """)

    op.execute("""
        UPDATE fee_invoice_items
        SET amount = 85000.00,
            net_amount = 85000.00
        WHERE invoice_id = 29
    """)

    op.execute("""
        UPDATE student_fee_assignments
        SET custom_amount = 85000.00,
            concession_amount = 0.00
        WHERE id = 29 AND student_id = 147
    """)

    op.execute("""
        UPDATE students
        SET last_name = ''
        WHERE id = 147 AND last_name = '-'
    """)

    # -------------------------------------------------------------
    # 4. AUDIT LOG ENTRY
    # -------------------------------------------------------------
    op.execute("""
        INSERT INTO audit_logs (
            user_id, action, resource_type, resource_id,
            old_data, new_data, details, severity, is_system_audit, created_at
        )
        SELECT 
            (SELECT id FROM users ORDER BY id ASC LIMIT 1),
            'RECONCILE_STUDENT_FEES_AND_ALLOCATIONS', 'fee_invoice', 29,
            '{"student_id": 147, "invoice_paid": 24900.00, "invoice_outstanding": 60100.00, "alloc_69": 16400.00, "alloc_83": 8500.00}',
            '{"student_id": 147, "invoice_paid": 37000.00, "invoice_outstanding": 48000.00, "alloc_69": 20000.00, "alloc_83": 17000.00, "receipt_1": "RCP-2026-0180", "receipt_2": "RCP-2026-0181"}',
            'Forensic reconciliation of Khushi (PA-2024-000019): Reallocated RCP-2026-0180 (Rs 20,000) and RCP-2026-0181 (Rs 17,000) against INV-2026-0147. Zero discrepancy achieved.',
            'info', FALSE, NOW()
        WHERE EXISTS (SELECT 1 FROM students WHERE id = 147);
    """)


def downgrade() -> None:
    pass
