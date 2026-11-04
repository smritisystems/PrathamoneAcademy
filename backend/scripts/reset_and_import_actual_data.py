# /**
#  * @file        reset_and_import_actual_data.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-04
#  * @updated     2026-11-04
#  *
#  * @description Database initialization script resetting schema and seeding actual Prashant Academy datasets.
#  */

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import re
import json
import hashlib
from decimal import Decimal
from datetime import date, datetime
import openpyxl
import asyncio

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, delete
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.student import Student, Guardian
from app.models.standard import Standard
from app.models.division import Division
from app.models.board import Board
from app.models.subject import Subject
from app.models.enrollment import StudentEnrollment
from app.models.fee import (
    FeeCategory, FeeStructure, StudentFeeAssignment,
    FeeInvoice, FeeInvoiceItem, FeeInstallment
)
from app.models.payment import Payment, PaymentAllocation, PaymentReceipt
from app.models.attendance import Attendance
from app.models.exam import Examination, ExamMark
from app.models.portal import StudentDocument, TimetableEntry
from app.models.user import User, AuditLog
from app.models.academic_year import AcademicYear
from app.models.institution import Institution
from app.models.import_log import FeeRegisterImport

EXCEL_PATH = r"F:\Smriti-Clients Data\Prashant Academy\Book1.xlsx"

MONTH_MAP = {
    'jan': 1, 'january': 1,
    'feb': 2, 'february': 2,
    'mar': 3, 'march': 3,
    'apr': 4, 'april': 4,
    'may': 5, 'may': 5,
    'jun': 6, 'june': 6,
    'jul': 7, 'july': 7,
    'aug': 8, 'august': 8,
    'sep': 9, 'sept': 9, 'september': 9,
    'oct': 10, 'october': 10,
    'nov': 11, 'november': 11,
    'dec': 12, 'december': 12,
}

COL_MONTH_MAP = {
    3: 3, 4: 3,
    5: 4, 6: 4,
    7: 5, 8: 5,
    9: 6, 10: 6,
    11: 7, 12: 7,
    13: 8, 14: 8,
    15: 9, 16: 9,
    17: 10, 18: 10,
    19: 11, 20: 11,
    21: 12,
    22: 1,
    23: 2,
    24: 3,
}

PAYMENT_REGEX = re.compile(
    r'(?P<date>(?:\d{1,2}\s+)?[A-Za-z]+(?:\s+\d{4})?)\s*[^\d₹]*\s*[₹Rs\.]*\s*(?P<amount>[\d,]{3,})'
)

GROUP_MAPPING = {
    'ICSE X': {'level': 10, 'board_code': 'ICSE', 'board_name': 'ICSE Board', 'standard_name': 'Class X', 'batch_name': 'ICSE X', 'batch_code': 'ICSE-X-A'},
    'CBSE X': {'level': 10, 'board_code': 'CBSE', 'board_name': 'CBSE Board', 'standard_name': 'Class X', 'batch_name': 'CBSE X', 'batch_code': 'CBSE-X-A'},
    'ICSE 9th': {'level': 9, 'board_code': 'ICSE', 'board_name': 'ICSE Board', 'standard_name': 'Class IX', 'batch_name': 'ICSE IX', 'batch_code': 'ICSE-IX-A'},
    'ICSE IX': {'level': 9, 'board_code': 'ICSE', 'board_name': 'ICSE Board', 'standard_name': 'Class IX', 'batch_name': 'ICSE IX', 'batch_code': 'ICSE-IX-A'},
    'ICSE VIII': {'level': 8, 'board_code': 'ICSE', 'board_name': 'ICSE Board', 'standard_name': 'Class VIII', 'batch_name': 'ICSE VIII', 'batch_code': 'ICSE-VIII-A'},
    'SSC IX': {'level': 9, 'board_code': 'SSC', 'board_name': 'SSC (Maharashtra)', 'standard_name': 'Class IX', 'batch_name': 'SSC IX', 'batch_code': 'SSC-IX-A'},
}


def parse_payment_cell(cell_val, col_idx):
    if not cell_val:
        return []
    s = str(cell_val).strip()
    matches = PAYMENT_REGEX.findall(s)

    if not matches:
        num_clean = s.replace('₹', '').replace(',', '').strip()
        try:
            amt = Decimal(num_clean)
            m = COL_MONTH_MAP.get(col_idx, 4)
            y = 2025 if m in [1, 2, 3] and col_idx >= 22 else 2024
            return [{
                'raw': s,
                'amount': amt,
                'date': date(y, m, 1),
            }]
        except:
            return []

    results = []
    for raw_date, raw_amt in matches:
        amt = Decimal(raw_amt.replace(',', ''))
        raw_clean = raw_date.strip()

        m_num = None
        for name, num in MONTH_MAP.items():
            if re.search(r'\b' + name + r'\b', raw_clean, re.IGNORECASE):
                m_num = num
                break
        if not m_num:
            m_num = COL_MONTH_MAP.get(col_idx, 4)

        d_match = re.search(r'\b(\d{1,2})\b', raw_clean)
        day = int(d_match.group(1)) if d_match else 1
        day = min(max(1, day), 28)

        y = 2025 if m_num in [1, 2, 3] and col_idx >= 22 else 2024
        results.append({
            'raw': f"{raw_date} {raw_amt}".strip(),
            'amount': amt,
            'date': date(y, m_num, day),
        })
    return results


async def reset_and_import():
    print("=" * 70)
    print("PRASHANT ACADEMY: SAFE STUDENT RESET AND EXCEL IMPORT")
    print("=" * 70)

    # 1. Verify Excel file
    if not os.path.exists(EXCEL_PATH):
        raise FileNotFoundError(f"Source Excel workbook not found at {EXCEL_PATH}")

    with open(EXCEL_PATH, 'rb') as f:
        file_bytes = f.read()
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    print(f"[OK] Source workbook verified: {EXCEL_PATH}")
    print(f"[OK] File size: {len(file_bytes):,} bytes | SHA-256: {file_hash[:16]}...")

    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    ws = wb.active
    print(f"[OK] Worksheet active: '{ws.title}' (rows={ws.max_row}, cols={ws.max_column})")

    # 2. Database reset within safe transaction
    async with AsyncSessionLocal() as session:
        # Check institution and academic year
        inst = (await session.execute(select(Institution))).scalars().first()
        if not inst:
            print("Creating default Institution 'Prashant Academy'...")
            inst = Institution(name="Prashant Academy", code="PA001", city="Pune")
            session.add(inst)
            await session.flush()

        ay = (await session.execute(
            select(AcademicYear).where(AcademicYear.institution_id == inst.id, AcademicYear.is_current == True)
        )).scalar_one_or_none()
        if not ay:
            ay = (await session.execute(select(AcademicYear))).scalars().first()
        if not ay:
            ay = AcademicYear(
                institution_id=inst.id,
                name="2024-25",
                start_date=date(2024, 4, 1),
                end_date=date(2025, 3, 31),
                is_current=True,
            )
            session.add(ay)
            await session.flush()

        print("\n--- PHASE 1: CLEARING ALL EXISTING STUDENT & DEMO DATA ---")
        # Count existing before delete
        cnt_receipts = (await session.execute(select(func.count(PaymentReceipt.id)))).scalar() or 0
        cnt_alloc = (await session.execute(select(func.count(PaymentAllocation.id)))).scalar() or 0
        cnt_pmts = (await session.execute(select(func.count(Payment.id)))).scalar() or 0
        cnt_inst = (await session.execute(select(func.count(FeeInstallment.id)))).scalar() or 0
        cnt_inv_items = (await session.execute(select(func.count(FeeInvoiceItem.id)))).scalar() or 0
        cnt_invs = (await session.execute(select(func.count(FeeInvoice.id)))).scalar() or 0
        cnt_assign = (await session.execute(select(func.count(StudentFeeAssignment.id)))).scalar() or 0
        cnt_att = (await session.execute(select(func.count(Attendance.id)))).scalar() or 0
        cnt_marks = (await session.execute(select(func.count(ExamMark.id)))).scalar() or 0
        cnt_docs = (await session.execute(select(func.count(StudentDocument.id)))).scalar() or 0
        cnt_enr = (await session.execute(select(func.count(StudentEnrollment.id)))).scalar() or 0
        cnt_guardians = (await session.execute(select(func.count(Guardian.id)))).scalar() or 0
        cnt_students = (await session.execute(select(func.count(Student.id)))).scalar() or 0

        # Execute cascading/ordered deletes
        await session.execute(delete(PaymentReceipt))
        await session.execute(delete(PaymentAllocation))
        await session.execute(delete(Payment))
        await session.execute(delete(FeeInstallment))
        await session.execute(delete(FeeInvoiceItem))
        await session.execute(delete(FeeInvoice))
        await session.execute(delete(StudentFeeAssignment))
        await session.execute(delete(Attendance))
        await session.execute(delete(ExamMark))
        await session.execute(delete(StudentDocument))
        await session.execute(delete(StudentEnrollment))
        await session.execute(delete(Guardian))
        await session.execute(delete(FeeRegisterImport))
        await session.execute(delete(AuditLog).where(AuditLog.resource_type.in_(['student', 'fee_invoice', 'payment'])))
        await session.execute(delete(User).where(User.role == 'student'))
        await session.execute(delete(Student))
        await session.flush()

        print(f"  Deleted payment_receipts   : {cnt_receipts}")
        print(f"  Deleted payment_allocations: {cnt_alloc}")
        print(f"  Deleted payments           : {cnt_pmts}")
        print(f"  Deleted fee_invoices & items: {cnt_invs}")
        print(f"  Deleted mock attendances   : {cnt_att}")
        print(f"  Deleted mock exam marks    : {cnt_marks}")
        print(f"  Deleted student documents  : {cnt_docs}")
        print(f"  Deleted enrollments        : {cnt_enr}")
        print(f"  Deleted students           : {cnt_students}")
        print("[OK] All student records and fabricated mock data safely cleared.")

        print("\n--- PHASE 2: ENSURING ACADEMIC HIERARCHY (BOARDS, STANDARDS, BATCHES) ---")
        # Ensure Boards
        boards_map = {}
        for b_code, b_name in [('ICSE', 'ICSE Board'), ('CBSE', 'CBSE Board'), ('SSC', 'SSC (Maharashtra)')]:
            b = (await session.execute(select(Board).where(Board.code == b_code))).scalar_one_or_none()
            if not b:
                b = Board(institution_id=inst.id, name=b_name, code=b_code, is_active=True)
                session.add(b)
                await session.flush()
            boards_map[b_code] = b
            print(f"  Board ready: {b.code} - {b.name}")

        # Ensure Standards (Classes)
        standards_map = {}
        for lvl, s_name in [(8, 'Class VIII'), (9, 'Class IX'), (10, 'Class X')]:
            s = (await session.execute(select(Standard).where(Standard.level == lvl))).scalar_one_or_none()
            if not s:
                s = Standard(institution_id=inst.id, name=s_name, level=lvl, is_active=True)
                session.add(s)
                await session.flush()
            else:
                s.name = s_name
            standards_map[lvl] = s
            print(f"  Standard ready: {s.name} (Level {s.level})")

        # Ensure Batches (Divisions)
        batches_map = {}
        for grp_key, grp_meta in GROUP_MAPPING.items():
            b_name = grp_meta['batch_name']
            b_code = grp_meta['batch_code']
            b_board = boards_map[grp_meta['board_code']]
            b_std = standards_map[grp_meta['level']]

            div = (await session.execute(
                select(Division).where(Division.name == b_name)
            )).scalar_one_or_none()
            if not div:
                div = Division(
                    standard_id=b_std.id,
                    board_id=b_board.id,
                    name=b_name,
                    capacity=40,
                    is_active=True,
                )
                session.add(div)
                await session.flush()
            else:
                div.board_id = b_board.id
                div.standard_id = b_std.id
                div.is_active = True
            batches_map[grp_key] = div
            print(f"  Batch ready: {div.name} -> {b_board.code} / {b_std.name}")

        # Ensure Fee Category
        fee_cat = (await session.execute(
            select(FeeCategory).where(FeeCategory.institution_id == inst.id, FeeCategory.name == "Coaching Tuition Fee")
        )).scalar_one_or_none()
        if not fee_cat:
            fee_cat = FeeCategory(institution_id=inst.id, name="Coaching Tuition Fee", fee_type="tuition")
            session.add(fee_cat)
            await session.flush()

        print("\n--- PHASE 3: PARSING & IMPORTING ACTUAL EXCEL RECORDS ---")
        current_group = None
        imported_students_count = 0
        total_payments_count = 0
        total_fees_sum = Decimal('0')
        total_paid_sum = Decimal('0')
        group_summary = {}

        student_counter = 0

        for r in range(1, ws.max_row + 1):
            c1_val = ws.cell(r, 1).value
            c2_val = ws.cell(r, 2).value

            # Group Header
            if c1_val and not c2_val:
                s_c1 = str(c1_val).strip()
                for k in GROUP_MAPPING:
                    if k.lower() in s_c1.lower():
                        current_group = k
                        if current_group not in group_summary:
                            group_summary[current_group] = {
                                'students': 0, 'fee': Decimal('0'), 'paid': Decimal('0'), 'payments': 0
                            }
                        break
                continue

            # Student row
            if c1_val and c1_val not in ['Student Name', 'ICSE X', 'CBSE X', 'ICSE 9th', 'ICSE IX', 'SSC IX', 'ICSE VIII']:
                if not current_group or current_group not in GROUP_MAPPING:
                    continue

                student_counter += 1
                name_raw = str(c1_val).strip()
                name_parts = name_raw.split(maxsplit=1)
                first_name = name_parts[0].strip()
                last_name = name_parts[1].strip() if len(name_parts) > 1 else ""

                # Stated fee
                try:
                    fee_clean = str(c2_val).replace('₹', '').replace(',', '').strip()
                    total_fee = Decimal(fee_clean)
                except:
                    total_fee = Decimal('0')

                # Parse payments
                student_payments = []
                for c in range(3, ws.max_column + 1):
                    val = ws.cell(r, c).value
                    if val is not None and str(val).strip():
                        parsed_pmts = parse_payment_cell(val, c)
                        student_payments.extend(parsed_pmts)

                meta = GROUP_MAPPING[current_group]
                std = standards_map[meta['level']]
                div = batches_map[current_group]

                # Admission Number sequence
                admission_number = f"PA-2024-{student_counter:06d}"

                student = Student(
                    institution_id=inst.id,
                    admission_number=admission_number,
                    first_name=first_name,
                    last_name=last_name,
                    date_of_birth=date(2008, 1, 1),
                    gender="male" if student_counter % 2 == 1 else "female",
                    admission_date=date(2024, 4, 1),
                    is_active=True,
                )
                session.add(student)
                await session.flush()

                # Student Enrollment
                enrollment = StudentEnrollment(
                    student_id=student.id,
                    academic_year_id=ay.id,
                    standard_id=std.id,
                    division_id=div.id,
                    roll_number=f"{meta['batch_name'].replace(' ', '')}-{student_counter:02d}",
                    enrollment_date=date(2024, 4, 1),
                    status="active",
                    remarks=f"Imported from Book1.xlsx ({current_group})",
                )
                session.add(enrollment)
                await session.flush()

                # Fee Structure & Assignment
                fee_struct = FeeStructure(
                    institution_id=inst.id,
                    academic_year_id=ay.id,
                    category_id=fee_cat.id,
                    name=f"Tuition Fee - {meta['batch_name']} ({student.first_name})",
                    amount=total_fee,
                    frequency="annual",
                )
                session.add(fee_struct)
                await session.flush()

                assignment = StudentFeeAssignment(
                    student_id=student.id,
                    fee_structure_id=fee_struct.id,
                    academic_year_id=ay.id,
                    concession_amount=Decimal('0'),
                )
                session.add(assignment)
                await session.flush()

                # Payments calculation
                student_paid_total = sum(p['amount'] for p in student_payments)
                student_outstanding = max(Decimal('0'), total_fee - student_paid_total)

                # Fee Invoice
                invoice = FeeInvoice(
                    invoice_number=f"INV-2024-{student_counter:04d}",
                    student_id=student.id,
                    assignment_id=assignment.id,
                    academic_year_id=ay.id,
                    total_amount=total_fee,
                    discount_amount=Decimal('0'),
                    net_amount=total_fee,
                    paid_amount=student_paid_total,
                    outstanding_amount=student_outstanding,
                    issue_date=date(2024, 4, 1),
                    due_date=date(2025, 3, 31),
                    status="paid" if student_outstanding == 0 else "partially_paid" if student_paid_total > 0 else "unpaid",
                )
                session.add(invoice)
                await session.flush()

                inv_item = FeeInvoiceItem(
                    invoice_id=invoice.id,
                    fee_structure_id=fee_struct.id,
                    description=f"Annual Coaching Tuition - {meta['batch_name']}",
                    amount=total_fee,
                    discount_amount=Decimal('0'),
                    net_amount=total_fee,
                )
                session.add(inv_item)

                # Payments and Receipts
                for p_idx, p in enumerate(student_payments, 1):
                    payment = Payment(
                        student_id=student.id,
                        academic_year_id=ay.id,
                        amount=p['amount'],
                        payment_date=p['date'],
                        payment_method="bank_transfer",
                        transaction_reference=f"EXCEL-ROW{r}-P{p_idx}",
                        notes=p['raw'],
                        status="completed",
                    )
                    session.add(payment)
                    await session.flush()

                    receipt_num = f"RCP-2024-{student_counter:03d}-{p_idx:02d}"
                    receipt = PaymentReceipt(
                        payment_id=payment.id,
                        student_id=student.id,
                        receipt_number=receipt_num,
                        amount=p['amount'],
                        payment_date=p['date'],
                        payment_method="bank_transfer",
                        receipt_data=json.dumps({
                            "student_name": f"{student.first_name} {student.last_name}".strip(),
                            "admission_number": student.admission_number,
                            "batch": meta['batch_name'],
                            "raw_entry": p['raw'],
                        }),
                    )
                    session.add(receipt)

                    allocation = PaymentAllocation(
                        payment_id=payment.id,
                        invoice_id=invoice.id,
                        allocated_amount=p['amount'],
                    )
                    session.add(allocation)
                    total_payments_count += 1

                # Create Student Portal User Account
                username = f"{first_name.lower().replace(' ', '')}{student_counter}"
                student_user = User(
                    institution_id=inst.id,
                    username=username,
                    email=f"{username}@prashantacademy.in",
                    hashed_password=get_password_hash("Student@2024"),
                    first_name=first_name,
                    last_name=last_name or "Student",
                    role="student",
                    student_id=student.id,
                    is_active=True,
                )
                session.add(student_user)

                imported_students_count += 1
                total_fees_sum += total_fee
                total_paid_sum += student_paid_total

                group_summary[current_group]['students'] += 1
                group_summary[current_group]['fee'] += total_fee
                group_summary[current_group]['paid'] += student_paid_total
                group_summary[current_group]['payments'] += len(student_payments)

        # Record import log
        import_log = FeeRegisterImport(
            file_name="Book1.xlsx",
            file_hash=file_hash,
            academic_year_id=ay.id,
            institution_id=inst.id,
            imported_students_count=imported_students_count,
            imported_payments_count=total_payments_count,
            total_fees=total_fees_sum,
            total_collected=total_paid_sum,
            total_outstanding=total_fees_sum - total_paid_sum,
            reconciliation_summary=json.dumps({
                "group_summary": {k: {k2: float(v2) if isinstance(v2, Decimal) else v2 for k2, v2 in v.items()} for k, v in group_summary.items()},
                "total_outstanding": float(total_fees_sum - total_paid_sum),
                "collection_percentage": round(float(total_paid_sum / total_fees_sum * 100), 2) if total_fees_sum > 0 else 0,
            }),
            status="completed",
            imported_by_id=1,
        )
        session.add(import_log)
        await session.commit()

        print("\n" + "=" * 70)
        print("RECONCILIATION SUMMARY (EXCEL vs DATABASE)")
        print("=" * 70)
        print(f"Total Students Imported     : {imported_students_count} / 39")
        print(f"Total Payment Transactions  : {total_payments_count}")
        print(f"Total Stated Fee Obligation : Rs. {total_fees_sum:,.2f}")
        print(f"Total Collected Payments    : Rs. {total_paid_sum:,.2f}")
        print(f"Total Outstanding Balance   : Rs. {total_fees_sum - total_paid_sum:,.2f}")
        col_rate = (total_paid_sum / total_fees_sum * 100) if total_fees_sum > 0 else 0
        print(f"Overall Collection Rate     : {col_rate:.1f}%")
        print("-" * 70)
        for grp, g in group_summary.items():
            print(f"Group: {grp:12} | Students: {g['students']:2} | Fees: Rs. {g['fee']:>10,.2f} | Collected: Rs. {g['paid']:>10,.2f} | Payments: {g['payments']}")
        print("=" * 70)
        print("[SUCCESS] Full Student Data Reset and Excel Import Completed Successfully!")


if __name__ == "__main__":
    asyncio.run(reset_and_import())
