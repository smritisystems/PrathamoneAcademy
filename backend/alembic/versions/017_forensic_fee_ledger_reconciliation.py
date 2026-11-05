# /**
#  * @file        017_forensic_fee_ledger_reconciliation.py
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
#  * @created     2026-11-05
#  * @updated     2026-11-05
#  *
#  * @description Idempotent Alembic data migration resolving operational fee discrepancies and student lifecycle states.
#  */

"""Forensic fee ledger reconciliation and student lifecycle sync

Revision ID: 017_fee_recon
Revises: 016_payment_workflow
Create Date: 2026-11-05 18:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "017_fee_recon"
down_revision = "016_payment_workflow"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Puneeta Kulkarni (ID 157): Total fee is 70k not 90k
    op.execute("UPDATE fee_structures SET amount = 70000.00 WHERE id = 17")
    op.execute("""
        UPDATE student_fee_assignments
        SET custom_amount = 70000.00,
            remarks = 'Authoritative fee assignment for Puneeta corrected to Rs 70,000 per staff reconciliation'
        WHERE student_id = 157 AND id = 17
    """)
    op.execute("""
        UPDATE fee_invoices
        SET total_amount = 70000.00,
            net_amount = 70000.00,
            outstanding_amount = 20000.00,
            notes = 'Total fee corrected from Rs 90,000 to Rs 70,000 per staff fee register audit',
            updated_at = NOW()
        WHERE student_id = 157 AND id = 17
    """)
    op.execute("UPDATE fee_invoice_items SET amount = 70000.00, net_amount = 70000.00 WHERE invoice_id = 17")

    # 2. Satnam (Satyam) Bhatia (ID 142): Discontinued
    op.execute("""
        UPDATE student_enrollments
        SET status = 'withdrawn',
            exit_date = '2026-11-05',
            exit_reason = 'Discontinued',
            exit_notes = 'Discontinued per administrative notification',
            exited_by_id = 1,
            exited_at = NOW()
        WHERE student_id = 142 AND status = 'active'
    """)
    op.execute("""
        UPDATE students
        SET is_active = FALSE,
            exit_date = '2026-11-05',
            exit_reason = 'Discontinued',
            exit_notes = 'Discontinued per administrative notification'
        WHERE id = 142 AND (is_active = TRUE OR exit_reason IS NULL)
    """)
    op.execute("""
        INSERT INTO student_lifecycle_logs (
            institution_id, student_id, enrollment_id, action,
            from_status, to_status, effective_date, reason, notes,
            performed_by_id, created_at
        )
        SELECT 1, 142, 142, 'exit', 'active', 'withdrawn', '2026-11-05',
               'Discontinued', 'Discontinued per administrative notification', 1, NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM student_lifecycle_logs WHERE student_id = 142 AND action = 'exit'
        )
    """)

    # 3. Missing students on Fees Register: Shaurya (160), Sushmya (166), Aaradhya (167)
    # Shaurya (Class VIII: 75,000)
    op.execute("""
        INSERT INTO fee_structures (institution_id, academic_year_id, standard_id, category_id, name, amount, frequency, installments_count, due_day, late_fee_amount, late_fee_days, is_active, created_at)
        SELECT 1, 1, 8, 1, 'Annual Tuition Fee - Shaurya', 75000.00, 'annually', 1, 10, 0.00, 0, TRUE, NOW()
        WHERE NOT EXISTS (SELECT 1 FROM fee_structures WHERE name = 'Annual Tuition Fee - Shaurya')
    """)
    op.execute("""
        INSERT INTO student_fee_assignments (student_id, fee_structure_id, academic_year_id, custom_amount, concession_amount, remarks, created_at)
        SELECT 160, fs.id, 1, 75000.00, 0.00, 'Authoritative fee assignment for Shaurya added per administrative reconciliation', NOW()
        FROM fee_structures fs WHERE fs.name = 'Annual Tuition Fee - Shaurya'
        AND NOT EXISTS (SELECT 1 FROM student_fee_assignments WHERE student_id = 160 AND academic_year_id = 1)
    """)
    op.execute("""
        INSERT INTO fee_invoices (invoice_number, student_id, assignment_id, academic_year_id, total_amount, discount_amount, net_amount, paid_amount, outstanding_amount, status, issue_date, due_date, notes, created_at, updated_at)
        SELECT 'INV-2026-0160', 160, sfa.id, 1, 75000.00, 0.00, 75000.00, 0.00, 75000.00, 'unpaid', '2026-04-01', '2027-03-31', 'Authoritative fee invoice for Shaurya generated per administrative reconciliation', NOW(), NOW()
        FROM student_fee_assignments sfa WHERE sfa.student_id = 160 AND sfa.academic_year_id = 1
        AND NOT EXISTS (SELECT 1 FROM fee_invoices WHERE invoice_number = 'INV-2026-0160')
    """)
    op.execute("""
        INSERT INTO fee_invoice_items (invoice_id, fee_structure_id, description, amount, discount_amount, net_amount, created_at)
        SELECT fi.id, fs.id, 'Annual Academic & Coaching Tuition Fee (2026 - 27)', 75000.00, 0.00, 75000.00, NOW()
        FROM fee_invoices fi, fee_structures fs
        WHERE fi.invoice_number = 'INV-2026-0160' AND fs.name = 'Annual Tuition Fee - Shaurya'
        AND NOT EXISTS (SELECT 1 FROM fee_invoice_items WHERE invoice_id = fi.id)
    """)

    # Sushmya (Class IX: 50,000)
    op.execute("""
        INSERT INTO fee_structures (institution_id, academic_year_id, standard_id, category_id, name, amount, frequency, installments_count, due_day, late_fee_amount, late_fee_days, is_active, created_at)
        SELECT 1, 1, 9, 1, 'Annual Tuition Fee - Sushmya', 50000.00, 'annually', 1, 10, 0.00, 0, TRUE, NOW()
        WHERE NOT EXISTS (SELECT 1 FROM fee_structures WHERE name = 'Annual Tuition Fee - Sushmya')
    """)
    op.execute("""
        INSERT INTO student_fee_assignments (student_id, fee_structure_id, academic_year_id, custom_amount, concession_amount, remarks, created_at)
        SELECT 166, fs.id, 1, 50000.00, 0.00, 'Authoritative fee assignment for Sushmya added per administrative reconciliation', NOW()
        FROM fee_structures fs WHERE fs.name = 'Annual Tuition Fee - Sushmya'
        AND NOT EXISTS (SELECT 1 FROM student_fee_assignments WHERE student_id = 166 AND academic_year_id = 1)
    """)
    op.execute("""
        INSERT INTO fee_invoices (invoice_number, student_id, assignment_id, academic_year_id, total_amount, discount_amount, net_amount, paid_amount, outstanding_amount, status, issue_date, due_date, notes, created_at, updated_at)
        SELECT 'INV-2026-0166', 166, sfa.id, 1, 50000.00, 0.00, 50000.00, 0.00, 50000.00, 'unpaid', '2026-04-01', '2027-03-31', 'Authoritative fee invoice for Sushmya generated per administrative reconciliation', NOW(), NOW()
        FROM student_fee_assignments sfa WHERE sfa.student_id = 166 AND sfa.academic_year_id = 1
        AND NOT EXISTS (SELECT 1 FROM fee_invoices WHERE invoice_number = 'INV-2026-0166')
    """)
    op.execute("""
        INSERT INTO fee_invoice_items (invoice_id, fee_structure_id, description, amount, discount_amount, net_amount, created_at)
        SELECT fi.id, fs.id, 'Annual Academic & Coaching Tuition Fee (2026 - 27)', 50000.00, 0.00, 50000.00, NOW()
        FROM fee_invoices fi, fee_structures fs
        WHERE fi.invoice_number = 'INV-2026-0166' AND fs.name = 'Annual Tuition Fee - Sushmya'
        AND NOT EXISTS (SELECT 1 FROM fee_invoice_items WHERE invoice_id = fi.id)
    """)

    # Aaradhya (Class IX: 50,000)
    op.execute("""
        INSERT INTO fee_structures (institution_id, academic_year_id, standard_id, category_id, name, amount, frequency, installments_count, due_day, late_fee_amount, late_fee_days, is_active, created_at)
        SELECT 1, 1, 9, 1, 'Annual Tuition Fee - Aaradhya', 50000.00, 'annually', 1, 10, 0.00, 0, TRUE, NOW()
        WHERE NOT EXISTS (SELECT 1 FROM fee_structures WHERE name = 'Annual Tuition Fee - Aaradhya')
    """)
    op.execute("""
        INSERT INTO student_fee_assignments (student_id, fee_structure_id, academic_year_id, custom_amount, concession_amount, remarks, created_at)
        SELECT 167, fs.id, 1, 50000.00, 0.00, 'Authoritative fee assignment for Aaradhya added per administrative reconciliation', NOW()
        FROM fee_structures fs WHERE fs.name = 'Annual Tuition Fee - Aaradhya'
        AND NOT EXISTS (SELECT 1 FROM student_fee_assignments WHERE student_id = 167 AND academic_year_id = 1)
    """)
    op.execute("""
        INSERT INTO fee_invoices (invoice_number, student_id, assignment_id, academic_year_id, total_amount, discount_amount, net_amount, paid_amount, outstanding_amount, status, issue_date, due_date, notes, created_at, updated_at)
        SELECT 'INV-2026-0167', 167, sfa.id, 1, 50000.00, 0.00, 50000.00, 0.00, 50000.00, 'unpaid', '2026-04-01', '2027-03-31', 'Authoritative fee invoice for Aaradhya generated per administrative reconciliation', NOW(), NOW()
        FROM student_fee_assignments sfa WHERE sfa.student_id = 167 AND sfa.academic_year_id = 1
        AND NOT EXISTS (SELECT 1 FROM fee_invoices WHERE invoice_number = 'INV-2026-0167')
    """)
    op.execute("""
        INSERT INTO fee_invoice_items (invoice_id, fee_structure_id, description, amount, discount_amount, net_amount, created_at)
        SELECT fi.id, fs.id, 'Annual Academic & Coaching Tuition Fee (2026 - 27)', 50000.00, 0.00, 50000.00, NOW()
        FROM fee_invoices fi, fee_structures fs
        WHERE fi.invoice_number = 'INV-2026-0167' AND fs.name = 'Annual Tuition Fee - Aaradhya'
        AND NOT EXISTS (SELECT 1 FROM fee_invoice_items WHERE invoice_id = fi.id)
    """)

    # 4. Ashwin Tambe (ID 140): Reverse excess payments totaling 20,200
    op.execute("""
        UPDATE payments
        SET status = 'reversed',
            reversed_at = NOW(),
            reversal_reason = 'Excess/duplicate entry from Padata.xlsx reversed to match authoritative Rs 37,500 paid per staff audit',
            reversed_by_id = 1
        WHERE id IN (14, 135, 169) AND status != 'reversed'
    """)
    op.execute("""
        UPDATE payment_receipts
        SET status = 'cancelled'
        WHERE payment_id IN (14, 135, 169) AND status != 'cancelled'
    """)
    op.execute("""
        UPDATE fee_invoices
        SET paid_amount = 37500.00,
            outstanding_amount = 42500.00,
            status = 'partial',
            notes = 'Paid amount reconciled to authoritative Rs 37,500.00 per staff fee register audit',
            updated_at = NOW()
        WHERE student_id = 140 AND id = 15
    """)

    # 5. Keshwa Mistry (ID 141): Reverse duplicate payment #107
    op.execute("""
        UPDATE payments
        SET status = 'reversed',
            reversed_at = NOW(),
            reversal_reason = 'Duplicate entry from Padata.xlsx row 108 identified and resolved per staff audit',
            reversed_by_id = 1
        WHERE id = 107 AND status != 'reversed'
    """)
    op.execute("""
        UPDATE payment_receipts
        SET status = 'cancelled'
        WHERE payment_id = 107 AND status != 'cancelled'
    """)
    op.execute("""
        UPDATE fee_invoices
        SET paid_amount = 40000.00,
            outstanding_amount = 45000.00,
            status = 'partial',
            notes = 'Duplicate payment #107 reversed. Total paid reconciled to Rs 40,000.00',
            updated_at = NOW()
        WHERE student_id = 141 AND id = 16
    """)

    # 6. Samud Kapoor (ID 143): Credit missing Rs 5,000 payment
    op.execute("""
        DO $$
        DECLARE
            v_pid INT;
            v_rcp_data TEXT;
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM payments WHERE student_id = 143 AND transaction_reference = 'TXN-2026-0171') THEN
                INSERT INTO payments (
                    student_id, academic_year_id, amount, payment_date,
                    payment_method, transaction_reference, notes, status,
                    collected_by_id, posted_at, created_at
                ) VALUES (
                    143, 1, 5000.00, '2026-10-28',
                    'bank_transfer', 'TXN-2026-0171',
                    'Reconciled installment payment of Rs 5,000 per staff fee register audit',
                    'completed', 1, NOW(), NOW()
                ) RETURNING id INTO v_pid;

                INSERT INTO payment_allocations (payment_id, invoice_id, allocated_amount, created_at)
                VALUES (v_pid, 25, 5000.00, NOW());

                v_rcp_data := '{"receipt_number": "RCP-2026-0171", "student_name": "Samud Kapoor", "admission_number": "PA-2024-000015", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "28-Oct-2026", "raw_date": "28-Oct-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0171", "amount": 5000.0, "invoice_number": "INV-2026-0143", "notes": "Reconciled installment payment of Rs 5,000 per staff fee register audit"}';

                INSERT INTO payment_receipts (
                    receipt_number, payment_id, student_id, amount,
                    payment_date, payment_method, receipt_data, version,
                    status, generated_at
                ) VALUES (
                    'RCP-2026-0171', v_pid, 143, 5000.00,
                    '2026-10-28', 'bank_transfer', v_rcp_data, 1,
                    'valid', NOW()
                );
            END IF;
        END $$;
    """)
    op.execute("""
        UPDATE fee_invoices
        SET paid_amount = 64500.00,
            outstanding_amount = 20500.00,
            status = 'partial',
            notes = 'Reconciled missing payment Rs 5,000. Balance correctly set to Rs 20,500.00',
            updated_at = NOW()
        WHERE student_id = 143 AND id = 25
    """)

    # 7. Kashish Sawant (ID 145): Full paid, balance 0
    op.execute("UPDATE fee_structures SET amount = 75000.00 WHERE id = 27")
    op.execute("""
        UPDATE student_fee_assignments
        SET custom_amount = 75000.00,
            remarks = 'Agreed package fee Rs 75,000 (Full Paid) per staff reconciliation'
        WHERE student_id = 145 AND id = 27
    """)
    op.execute("""
        UPDATE fee_invoices
        SET total_amount = 75000.00,
            discount_amount = 0.00,
            net_amount = 75000.00,
            paid_amount = 75000.00,
            outstanding_amount = 0.00,
            status = 'paid',
            notes = 'Total fee confirmed at Rs 75,000.00 (Full Paid) per staff fee register audit',
            updated_at = NOW()
        WHERE student_id = 145 AND id = 27
    """)
    op.execute("UPDATE fee_invoice_items SET amount = 75000.00, net_amount = 75000.00 WHERE invoice_id = 27")

    # 8. Mahek Nair (ID 148): 2 subjects only (fee 64k, balance 30k)
    op.execute("""
        UPDATE fee_structures
        SET name = 'Annual Tuition Fee - Mahek (2 Subjects)',
            amount = 64000.00
        WHERE id = 30
    """)
    op.execute("""
        UPDATE student_fee_assignments
        SET custom_amount = 64000.00,
            remarks = 'Adjusted to 2 subjects fee (Rs 64,000) per discontinuation from full course'
        WHERE student_id = 148 AND id = 30
    """)
    op.execute("""
        UPDATE fee_invoices
        SET total_amount = 64000.00,
            net_amount = 64000.00,
            paid_amount = 34000.00,
            outstanding_amount = 30000.00,
            status = 'partial',
            notes = 'Total fee adjusted to Rs 64,000 (balance Rs 30,000) for 2 subjects only per discontinuation notice',
            updated_at = NOW()
        WHERE student_id = 148 AND id = 30
    """)
    op.execute("""
        UPDATE fee_invoice_items
        SET description = 'Annual Academic & Coaching Tuition Fee (2026 - 27) [2 Subjects Only]',
            amount = 64000.00,
            net_amount = 64000.00
        WHERE invoice_id = 30
    """)
    op.execute("""
        UPDATE student_enrollments
        SET remarks = 'Discontinued full course; continuing for 2 subjects only per administrative notice'
        WHERE student_id = 148 AND status = 'active'
    """)


def downgrade() -> None:
    pass
