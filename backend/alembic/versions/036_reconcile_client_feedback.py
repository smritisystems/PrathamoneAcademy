# /**
#  * @file        036_reconcile_client_feedback.py
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
#  * @updated     2026-11-10
#  *
#  * @description Forensic data reconciliation resolving client feedback:
#  */

"""reconcile_client_feedback

Revision ID: 036_client_reconcile
Revises: 035_fee_concessions
Create Date: 2026-11-10 14:05:00.000000

"""
from alembic import op
import sqlalchemy as sa
import json

# revision identifiers, used by Alembic.
revision = '036_client_reconcile'
down_revision = '035_fee_concessions'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # -------------------------------------------------------------
    # 1. INSTITUTIONS: Ensure canonical address and contact details
    # -------------------------------------------------------------
    op.execute("""
        UPDATE institutions
        SET address = 'Shop No16, 14, 12, Aquarius Taurus Building, Jankalyan Nagar, Malad West',
            city = 'Mumbai',
            state = 'Maharashtra',
            pincode = '400095',
            phone = '+91-7021789907',
            email = 'tejam.prashnat@gmail.com'
        WHERE address IS NULL OR address = '' OR phone IS NULL OR phone = '';
    """)

    # -------------------------------------------------------------
    # 2. AARADHYA (Student ID 167): Reconcile to Rs 45,000 total fee, Rs 0 paid
    # -------------------------------------------------------------
    # Cancel test payment #178 (Rs 1.00) and its receipt
    op.execute("""
        UPDATE payments
        SET status = 'reversed',
            reversed_at = NOW(),
            reversal_reason = 'Test payment of Rs 1.00 cancelled per client directive - student has paid zero fees to date',
            reversed_by_id = 1
        WHERE id = 178;
    """)
    op.execute("""
        UPDATE payment_receipts
        SET status = 'cancelled',
            cancelled_at = NOW(),
            cancellation_reason = 'Test payment of Rs 1.00 cancelled per client directive'
        WHERE payment_id = 178;
    """)
    op.execute("""
        DELETE FROM payment_allocations WHERE payment_id = 178;
    """)

    # Update fee structure #39, assignment, and invoice #39 to 45,000
    op.execute("""
        UPDATE fee_structures
        SET amount = 45000.00
        WHERE id = 39;
    """)
    op.execute("""
        UPDATE student_fee_assignments
        SET custom_amount = 45000.00,
            concession_amount = 0.00,
            remarks = 'Total obligation corrected to authoritative Rs 45,000.00 per client fee directive'
        WHERE student_id = 167;
    """)
    op.execute("""
        UPDATE fee_invoices
        SET total_amount = 45000.00,
            discount_amount = 0.00,
            net_amount = 45000.00,
            paid_amount = 0.00,
            outstanding_amount = 45000.00,
            status = 'pending',
            notes = 'Total obligation corrected to Rs 45,000.00 with Rs 0 paid per client fee audit'
        WHERE student_id = 167 AND id = 39;
    """)
    op.execute("""
        UPDATE fee_invoice_items
        SET amount = 45000.00,
            discount_amount = 0.00,
            net_amount = 45000.00
        WHERE invoice_id = 39;
    """)

    # -------------------------------------------------------------
    # 3. ASHWIN TAMBE (Student ID 140): Reconcile to Rs 50,000 paid / Rs 30,000 balance
    # -------------------------------------------------------------
    # Adjust payment #135 from Rs 7,700 to Rs 7,500
    op.execute("""
        UPDATE payments
        SET amount = 7500.00,
            status = 'completed',
            reversed_at = NULL,
            reversal_reason = NULL,
            reversed_by_id = NULL
        WHERE id = 135;
    """)
    op.execute("""
        UPDATE payment_receipts
        SET amount = 7500.00,
            status = 'valid'
        WHERE payment_id = 135;
    """)
    op.execute("""
        UPDATE payment_allocations
        SET allocated_amount = 7500.00
        WHERE payment_id = 135;
    """)

    # Reactivate payment #14 (Rs 5,000)
    op.execute("""
        UPDATE payments
        SET status = 'completed',
            reversed_at = NULL,
            reversal_reason = NULL,
            reversed_by_id = NULL
        WHERE id = 14;
    """)
    op.execute("""
        UPDATE payment_receipts
        SET status = 'valid'
        WHERE payment_id = 14;
    """)

    # Ensure payments 37, 61, 92, 115, 153 are completed
    op.execute("""
        UPDATE payments
        SET status = 'completed',
            reversed_at = NULL,
            reversal_reason = NULL,
            reversed_by_id = NULL
        WHERE id IN (37, 61, 92, 115, 153);
    """)
    op.execute("""
        UPDATE payment_receipts
        SET status = 'valid'
        WHERE payment_id IN (37, 61, 92, 115, 153);
    """)

    # Permanently reverse/void payment #169 (Rs 7,500 on 30 Sept) which client confirmed is NOT in records
    op.execute("""
        UPDATE payments
        SET status = 'reversed',
            reversed_at = NOW(),
            reversal_reason = 'Confirmed extra entry on 30 Sept not in institute records per client feedback',
            reversed_by_id = 1
        WHERE id = 169;
    """)
    op.execute("""
        UPDATE payment_receipts
        SET status = 'cancelled',
            cancelled_at = NOW(),
            cancellation_reason = 'Confirmed extra entry on 30 Sept not in institute records per client feedback'
        WHERE payment_id = 169;
    """)
    op.execute("""
        UPDATE payment_allocations
        SET allocated_amount = 0.00
        WHERE payment_id = 169;
    """)

    # Reconcile Ashwin's invoice #15: Total = 80,000, Paid = 50,000, Outstanding = 30,000
    op.execute("""
        UPDATE fee_invoices
        SET total_amount = 80000.00,
            discount_amount = 0.00,
            net_amount = 80000.00,
            paid_amount = 50000.00,
            outstanding_amount = 30000.00,
            status = 'partial',
            notes = 'Reconciled to authoritative Rs 50,000.00 paid and Rs 30,000.00 balance per client fee register audit'
        WHERE student_id = 140 AND id = 15;
    """)

    # -------------------------------------------------------------
    # 4. JSON TYPOS SANITIZATION: Affan (153), Arpita (151), Chahek (161)
    # -------------------------------------------------------------
    # Affan: Replace "Afton -" with "Affan"
    op.execute("""
        UPDATE payment_receipts
        SET receipt_data = REPLACE(receipt_data, '"student_name": "Afton -"', '"student_name": "Affan"')
        WHERE student_id = 153 AND receipt_data LIKE '%Afton%';
    """)
    op.execute("""
        UPDATE payment_receipts
        SET receipt_data = REPLACE(receipt_data, 'Afton', 'Affan')
        WHERE student_id = 153 AND receipt_data LIKE '%Afton%';
    """)

    # Arpita: Replace "Apika -" with "Arpita"
    op.execute("""
        UPDATE payment_receipts
        SET receipt_data = REPLACE(receipt_data, '"student_name": "Apika -"', '"student_name": "Arpita"')
        WHERE student_id = 151 AND receipt_data LIKE '%Apika%';
    """)
    op.execute("""
        UPDATE payment_receipts
        SET receipt_data = REPLACE(receipt_data, 'Apika', 'Arpita')
        WHERE student_id = 151 AND receipt_data LIKE '%Apika%';
    """)

    # Chahek: Replace "Chehek -" with "Chahek"
    op.execute("""
        UPDATE payment_receipts
        SET receipt_data = REPLACE(receipt_data, '"student_name": "Chehek -"', '"student_name": "Chahek"')
        WHERE student_id = 161 AND receipt_data LIKE '%Chehek%';
    """)
    op.execute("""
        UPDATE payment_receipts
        SET receipt_data = REPLACE(receipt_data, 'Chehek', 'Chahek')
        WHERE student_id = 161 AND receipt_data LIKE '%Chehek%';
    """)

    # Clean trailing hyphens in any remaining receipt_data JSON
    op.execute("""
        UPDATE payment_receipts
        SET receipt_data = REGEXP_REPLACE(receipt_data, '"student_name":\\s*"([^"]+)\\s+-"', '"student_name": "\\1"')
        WHERE receipt_data ~ '"student_name":\\s*"[^"]+\\s+-"';
    """)


def downgrade() -> None:
    pass

