# /**
#  * @file        038_reconcile_nethan_and_legacy_receipt_typos.py
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
#  * @description Forensic data reconciliation correcting legacy receipt typos imported from Padata.xlsx:
#  */

"""reconcile_nethan_and_legacy_receipt_typos

Revision ID: 038_nethan_receipt_typo
Revises: 037_khushi_reconcile
Create Date: 2026-11-10 14:50:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '038_nethan_receipt_typo'
down_revision = '037_khushi_reconcile'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # -------------------------------------------------------------
    # 1. NETHAN (student_id = 131, PA-2024-000003)
    # -------------------------------------------------------------
    op.execute("""
        UPDATE payment_receipts
        SET receipt_data = REPLACE(receipt_data, 'Netham', 'Nethan')
        WHERE student_id = 131 AND receipt_data LIKE '%Netham%';
    """)

    op.execute("""
        UPDATE payments
        SET notes = REPLACE(notes, 'Netham', 'Nethan')
        WHERE student_id = 131 AND notes LIKE '%Netham%';
    """)

    op.execute("""
        UPDATE fee_invoices
        SET notes = REPLACE(notes, 'Netham', 'Nethan')
        WHERE student_id = 131 AND notes LIKE '%Netham%';
    """)

    op.execute("""
        UPDATE users
        SET first_name = 'Nethan',
            username = 'nethan3',
            email = 'nethan3@prashantacademy.in'
        WHERE id = 84 OR username = 'netham3';
    """)

    op.execute("""
        UPDATE students
        SET last_name = '',
            email = 'nethan.patil131@example.com'
        WHERE id = 131;
    """)

    # -------------------------------------------------------------
    # 2. PROACTIVE CORRECTION OF REMAINING LEGACY EXCEL TYPOS
    # -------------------------------------------------------------
    # Rajveer (student_id = 129)
    op.execute("""
        UPDATE payment_receipts
        SET receipt_data = REPLACE(receipt_data, 'Rajnees', 'Rajveer')
        WHERE student_id = 129 AND receipt_data LIKE '%Rajnees%';
    """)
    op.execute("""
        UPDATE payments
        SET notes = REPLACE(notes, 'Rajnees', 'Rajveer')
        WHERE student_id = 129 AND notes LIKE '%Rajnees%';
    """)

    # Sarvesh (student_id = 133)
    op.execute("""
        UPDATE payment_receipts
        SET receipt_data = REPLACE(receipt_data, 'Savesh', 'Sarvesh')
        WHERE student_id = 133 AND receipt_data LIKE '%Savesh%';
    """)
    op.execute("""
        UPDATE payments
        SET notes = REPLACE(notes, 'Savesh', 'Sarvesh')
        WHERE student_id = 133 AND notes LIKE '%Savesh%';
    """)

    # Roudrita (student_id = 137)
    op.execute("""
        UPDATE payment_receipts
        SET receipt_data = REPLACE(receipt_data, 'Raudrita', 'Roudrita')
        WHERE student_id = 137 AND receipt_data LIKE '%Raudrita%';
    """)
    op.execute("""
        UPDATE payments
        SET notes = REPLACE(notes, 'Raudrita', 'Roudrita')
        WHERE student_id = 137 AND notes LIKE '%Raudrita%';
    """)

    # Satyam (student_id = 142)
    op.execute("""
        UPDATE payment_receipts
        SET receipt_data = REPLACE(receipt_data, 'Satnam', 'Satyam')
        WHERE student_id = 142 AND receipt_data LIKE '%Satnam%';
    """)
    op.execute("""
        UPDATE payments
        SET notes = REPLACE(notes, 'Satnam', 'Satyam')
        WHERE student_id = 142 AND notes LIKE '%Satnam%';
    """)

    # Samad (student_id = 143)
    op.execute("""
        UPDATE payment_receipts
        SET receipt_data = REPLACE(receipt_data, 'Samud', 'Samad')
        WHERE student_id = 143 AND receipt_data LIKE '%Samud%';
    """)
    op.execute("""
        UPDATE payments
        SET notes = REPLACE(notes, 'Samud', 'Samad')
        WHERE student_id = 143 AND notes LIKE '%Samud%';
    """)

    # Shravya (student_id = 152)
    op.execute("""
        UPDATE payment_receipts
        SET receipt_data = REPLACE(receipt_data, 'Shrawya', 'Shravya')
        WHERE student_id = 152 AND receipt_data LIKE '%Shrawya%';
    """)
    op.execute("""
        UPDATE payments
        SET notes = REPLACE(notes, 'Shrawya', 'Shravya')
        WHERE student_id = 152 AND notes LIKE '%Shrawya%';
    """)

    # -------------------------------------------------------------
    # 3. STRIP ALL REMAINING DUMMY HYPHENS FROM STUDENTS.LAST_NAME
    # -------------------------------------------------------------
    op.execute("""
        UPDATE students
        SET last_name = ''
        WHERE last_name = '-';
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
            'RECONCILE_RECEIPT_LEGACY_TYPOS', 'payment_receipt', 131,
            '{"target": "Nethan", "old_receipt_name": "Netham"}',
            '{"target": "Nethan", "new_receipt_name": "Nethan", "also_fixed": ["Rajveer", "Sarvesh", "Roudrita", "Satyam", "Samad", "Shravya"]}',
            'Corrected legacy typos in receipt_data JSON imported from Padata.xlsx for Nethan and 6 other students. Cleaned trailing dummy hyphens.',
            'info', FALSE, NOW()
        WHERE EXISTS (SELECT 1 FROM students WHERE id = 131);
    """)


def downgrade() -> None:
    pass

