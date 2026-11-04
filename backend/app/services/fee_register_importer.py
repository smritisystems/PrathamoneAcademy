# /**
#  * @file        fee_register_importer.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.services
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
#  * @description Service for importing legacy coaching institute fee registers and generating installment invoices.
#  */

import os
import re
import json
import hashlib
from decimal import Decimal
from datetime import date
from typing import Dict, List, Any, Optional, Tuple
import openpyxl
from io import BytesIO

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from fastapi import HTTPException

from app.models.student import Student, Guardian
from app.models.standard import Standard
from app.models.division import Division
from app.models.enrollment import StudentEnrollment
from app.models.fee import (
    FeeCategory, FeeStructure, StudentFeeAssignment,
    FeeInvoice, FeeInvoiceItem, FeeInstallment
)
from app.models.payment import Payment, PaymentAllocation, PaymentReceipt
from app.models.academic_year import AcademicYear
from app.models.institution import Institution
from app.models.import_log import FeeRegisterImport


MONTH_MAP = {
    'jan': 1, 'january': 1,
    'feb': 2, 'february': 2,
    'mar': 3, 'march': 3,
    'apr': 4, 'april': 4,
    'may': 5,
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

# Mapping from workbook group name to standard level and batch name
GROUP_MAPPING = {
    'ICSE X': {'level': 10, 'board': 'ICSE', 'batch_name': 'ICSE X'},
    'CBSE X': {'level': 10, 'board': 'CBSE', 'batch_name': 'CBSE X'},
    'ICSE 9th': {'level': 9, 'board': 'ICSE', 'batch_name': 'ICSE IX'},
    'ICSE IX': {'level': 9, 'board': 'ICSE', 'batch_name': 'ICSE IX'},
    'SSC IX': {'level': 9, 'board': 'SSC', 'batch_name': 'SSC IX'},
    'ICSE VIII': {'level': 8, 'board': 'ICSE', 'batch_name': 'ICSE VIII'},
    'ICSE IV': {'level': 4, 'board': 'ICSE', 'batch_name': 'ICSE IV'},
}


def parse_payment_cell(cell_val: Any, col_idx: int) -> List[Dict[str, Any]]:
    if not cell_val:
        return []
    s = str(cell_val).strip()
    matches = PAYMENT_REGEX.findall(s)

    if not matches:
        num_clean = s.replace('₹', '').replace(',', '').strip()
        try:
            amt = Decimal(num_clean)
            return [{
                'raw': s,
                'raw_date': '',
                'amount': amt,
                'day': 1,
                'month': COL_MONTH_MAP.get(col_idx, 4),
                'year': 2024,
                'date_str': f"2024-{COL_MONTH_MAP.get(col_idx, 4):02d}-01",
            }]
        except:
            return []

    results = []
    for raw_date, raw_amt in matches:
        amt = Decimal(raw_amt.replace(',', ''))

        # Day
        day = 1
        d_match = re.search(r'\b(\d{1,2})\b', raw_date)
        if d_match:
            day = int(d_match.group(1))

        # Month
        month = COL_MONTH_MAP.get(col_idx, 4)
        for m_str, m_num in MONTH_MAP.items():
            if re.search(rf'\b{m_str}\b', raw_date, re.I):
                month = m_num
                break

        # Year
        year = 2024
        yr_match = re.search(r'\b(202\d)\b', raw_date)
        if yr_match:
            year = int(yr_match.group(1))
        elif month in [1, 2, 3]:
            # March in columns 3-4 is start of registration (2024), elsewhere 2025
            year = 2024 if col_idx in [3, 4] else 2025
        else:
            year = 2024

        # Calendar bounds correction
        max_days = {1: 31, 2: 29, 3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31}[month]
        if day > max_days:
            day = max_days

        results.append({
            'raw': f"{raw_date} ₹{raw_amt}",
            'raw_date': raw_date,
            'amount': amt,
            'day': day,
            'month': month,
            'year': year,
            'date_str': f"{year:04d}-{month:02d}-{day:02d}",
        })

    return results


def parse_fee_register_workbook(file_bytes: bytes, file_name: str = "Book1.xlsx") -> Dict[str, Any]:
    """Parse workbook and return structured preview and reconciliation audit."""
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    wb = openpyxl.load_workbook(BytesIO(file_bytes), data_only=True)
    sheet = wb['Sheet1'] if 'Sheet1' in wb.sheetnames else wb.active

    current_group = None
    students: List[Dict[str, Any]] = []
    groups_summary: Dict[str, Dict[str, Any]] = {}

    total_fees_sum = Decimal('0')
    total_paid_sum = Decimal('0')
    total_balance_sum = Decimal('0')

    student_index = 0
    for r in range(1, sheet.max_row + 1):
        c1 = sheet.cell(r, 1).value
        if not c1:
            continue
        c1_str = str(c1).strip()
        if c1_str.startswith('PRASHANT ACADEMY'):
            continue
        if c1_str in GROUP_MAPPING:
            current_group = c1_str
            if current_group not in groups_summary:
                groups_summary[current_group] = {
                    'name': current_group,
                    'board': GROUP_MAPPING[current_group]['board'],
                    'level': GROUP_MAPPING[current_group]['level'],
                    'batch_name': GROUP_MAPPING[current_group]['batch_name'],
                    'student_count': 0,
                    'total_fees': Decimal('0'),
                    'total_collected': Decimal('0'),
                    'total_balance': Decimal('0'),
                }
            continue
        if c1_str == 'Student Name':
            continue

        student_index += 1
        student_name = c1_str
        fee_val = sheet.cell(r, 2).value
        total_fee = Decimal(str(fee_val)) if fee_val is not None else Decimal('0')
        stated_bal_raw = sheet.cell(r, 25).value

        payments: List[Dict[str, Any]] = []
        for c in range(3, 25):
            val = sheet.cell(r, c).value
            if val:
                parsed = parse_payment_cell(val, c)
                payments.extend(parsed)

        calc_paid = sum(p['amount'] for p in payments)
        calc_bal = total_fee - calc_paid

        # Reconcile against stated balance
        discrepancy_status = "MATCH"
        stated_num: Optional[Decimal] = None
        discrepancy_reason: Optional[str] = None

        if stated_bal_raw is None:
            discrepancy_status = "BLANK_STATED_BAL"
            discrepancy_reason = "Stated balance cell is empty in register"
        else:
            stated_clean = str(stated_bal_raw).replace(',', '').strip()
            if stated_clean.lower() in ['full paid', 'fully paid']:
                stated_num = Decimal('0')
                if calc_bal == Decimal('0'):
                    discrepancy_status = "MATCH_FULL_PAID"
                else:
                    discrepancy_status = "DISCREPANCY"
                    discrepancy_reason = f"Register indicates 'Full paid', but parsed payments total ₹{calc_paid} leaving ₹{calc_bal} calculated balance."
            elif stated_clean.lower() == 'unclear':
                discrepancy_status = "UNCLEAR_IN_SHEET"
                discrepancy_reason = f"Register explicitly marks balance as 'Unclear'. Parsed payments total ₹{calc_paid} against ₹{total_fee} fee."
            else:
                try:
                    stated_num = Decimal(stated_clean)
                    if stated_num == calc_bal:
                        discrepancy_status = "MATCH"
                    else:
                        discrepancy_status = "DISCREPANCY"
                        diff = calc_bal - stated_num
                        discrepancy_reason = f"Calculated balance ₹{calc_bal} differs from stated balance ₹{stated_num} by ₹{diff}."
                except Exception:
                    discrepancy_status = "INVALID_STATED_BAL"
                    discrepancy_reason = f"Unparseable stated balance string: '{stated_bal_raw}'."

        total_fees_sum += total_fee
        total_paid_sum += calc_paid
        total_balance_sum += calc_bal

        if current_group and current_group in groups_summary:
            groups_summary[current_group]['student_count'] += 1
            groups_summary[current_group]['total_fees'] += total_fee
            groups_summary[current_group]['total_collected'] += calc_paid
            groups_summary[current_group]['total_balance'] += calc_bal

        students.append({
            'row_number': r,
            'student_index': student_index,
            'name': student_name,
            'group': current_group,
            'level': GROUP_MAPPING.get(current_group, {}).get('level', 10),
            'board': GROUP_MAPPING.get(current_group, {}).get('board', 'General'),
            'batch_name': GROUP_MAPPING.get(current_group, {}).get('batch_name', 'General Batch'),
            'total_fee': float(total_fee),
            'stated_balance': str(stated_bal_raw) if stated_bal_raw is not None else None,
            'stated_balance_amount': float(stated_num) if stated_num is not None else None,
            'calc_paid': float(calc_paid),
            'calc_balance': float(calc_bal),
            'discrepancy_status': discrepancy_status,
            'discrepancy_reason': discrepancy_reason,
            'payment_count': len(payments),
            'payments': [
                {
                    'raw': p['raw'],
                    'date_str': p['date_str'],
                    'amount': float(p['amount']),
                    'day': p['day'],
                    'month': p['month'],
                    'year': p['year'],
                }
                for p in payments
            ],
        })

    total_payments_count = sum(s['payment_count'] for s in students)
    match_count = sum(1 for s in students if s['discrepancy_status'] in ['MATCH', 'MATCH_FULL_PAID'])
    discrepancy_count = sum(1 for s in students if s['discrepancy_status'] == 'DISCREPANCY')
    unclear_count = sum(1 for s in students if s['discrepancy_status'] == 'UNCLEAR_IN_SHEET')
    blank_count = sum(1 for s in students if s['discrepancy_status'] == 'BLANK_STATED_BAL')

    groups_list = []
    for g_name, g_info in groups_summary.items():
        groups_list.append({
            'name': g_info['name'],
            'board': g_info['board'],
            'level': g_info['level'],
            'batch_name': g_info['batch_name'],
            'student_count': g_info['student_count'],
            'total_fees': float(g_info['total_fees']),
            'total_collected': float(g_info['total_collected']),
            'total_balance': float(g_info['total_balance']),
        })

    return {
        'file_name': file_name,
        'file_hash': file_hash,
        'summary': {
            'total_students': len(students),
            'total_payments_count': total_payments_count,
            'total_fees': float(total_fees_sum),
            'total_collected': float(total_paid_sum),
            'total_outstanding': float(total_balance_sum),
            'collection_rate': round(float(total_paid_sum / total_fees_sum * 100), 1) if total_fees_sum > 0 else 0.0,
            'match_count': match_count,
            'discrepancy_count': discrepancy_count,
            'unclear_count': unclear_count,
            'blank_count': blank_count,
        },
        'groups': groups_list,
        'students': students,
    }


async def execute_fee_register_import(
    db: AsyncSession,
    user_id: int,
    file_bytes: bytes,
    file_name: str = "Book1.xlsx",
    replace_demo_data: bool = True,
) -> Dict[str, Any]:
    """
    Executes atomic database import with idempotency and duplicate prevention.
    Reuses existing database models strictly.
    """
    parsed = parse_fee_register_workbook(file_bytes, file_name)
    file_hash = parsed['file_hash']

    # 1. Duplicate check via file fingerprint
    existing_import = (await db.execute(
        select(FeeRegisterImport).where(FeeRegisterImport.file_hash == file_hash)
    )).scalar_one_or_none()

    if existing_import:
        raise HTTPException(
            status_code=400,
            detail=f"Duplicate Import Detected: File '{file_name}' (SHA-256: {file_hash[:12]}...) was already imported on {existing_import.created_at.strftime('%Y-%m-%d %H:%M:%S')} with Import ID #{existing_import.id}."
        )

    # 2. Get Institution & Academic Year
    institution = (await db.execute(select(Institution))).scalars().first()
    if not institution:
        raise HTTPException(status_code=400, detail="Institution not found. Please run initial setup.")

    academic_year = (await db.execute(
        select(AcademicYear).where(AcademicYear.institution_id == institution.id, AcademicYear.is_current == True)
    )).scalar_one_or_none()
    if not academic_year:
        academic_year = (await db.execute(select(AcademicYear))).scalars().first()
    if not academic_year:
        raise HTTPException(status_code=400, detail="Academic year not found.")

    # 3. Clean demo data if requested
    if replace_demo_data:
        # Delete demo students and associated child records
        demo_students = (await db.execute(
            select(Student).where(Student.admission_number.like("PA2024%"))
        )).scalars().all()

        for s in demo_students:
            # Delete receipts, payments, allocations, invoices
            await db.execute(delete(PaymentReceipt).where(PaymentReceipt.student_id == s.id))
            await db.execute(delete(PaymentAllocation).where(PaymentAllocation.payment.has(Payment.student_id == s.id)))
            await db.execute(delete(Payment).where(Payment.student_id == s.id))
            await db.execute(delete(FeeInstallment).where(FeeInstallment.invoice.has(FeeInvoice.student_id == s.id)))
            await db.execute(delete(FeeInvoiceItem).where(FeeInvoiceItem.invoice.has(FeeInvoice.student_id == s.id)))
            await db.execute(delete(FeeInvoice).where(FeeInvoice.student_id == s.id))
            await db.execute(delete(StudentFeeAssignment).where(StudentFeeAssignment.student_id == s.id))
            await db.execute(delete(StudentEnrollment).where(StudentEnrollment.student_id == s.id))
            await db.execute(delete(Guardian).where(Guardian.student_id == s.id))
            await db.delete(s)
        await db.flush()

    # 4. Ensure standards & batches (divisions) exist
    standards_by_level: Dict[int, Standard] = {}
    stds_res = await db.execute(select(Standard).where(Standard.institution_id == institution.id))
    for s in stds_res.scalars().all():
        standards_by_level[s.level] = s

    for lvl in [4, 8, 9, 10]:
        if lvl not in standards_by_level:
            std = Standard(institution_id=institution.id, name=f"Standard {lvl}", level=lvl)
            db.add(std)
            await db.flush()
            standards_by_level[lvl] = std

    divisions_by_name: Dict[str, Division] = {}
    divs_res = await db.execute(select(Division))
    for d in divs_res.scalars().all():
        divisions_by_name[d.name] = d

    for g_info in GROUP_MAPPING.values():
        b_name = g_info['batch_name']
        lvl = g_info['level']
        std = standards_by_level[lvl]
        if b_name not in divisions_by_name:
            div = Division(standard_id=std.id, name=b_name, capacity=50)
            db.add(div)
            await db.flush()
            divisions_by_name[b_name] = div

    # 5. Fee Category & Structures
    category = (await db.execute(
        select(FeeCategory).where(FeeCategory.institution_id == institution.id, FeeCategory.name == "Coaching Tuition Fee")
    )).scalar_one_or_none()
    if not category:
        category = FeeCategory(institution_id=institution.id, name="Coaching Tuition Fee", description="Coaching and tuition fee")
        db.add(category)
        await db.flush()

    # Count existing receipts for numbering sequence
    receipt_count = (await db.execute(select(func.count(PaymentReceipt.id)))).scalar() or 0

    imported_students: List[Dict[str, Any]] = []
    imported_payments_total = 0

    # 6. Import Students, Invoices, Payments
    for s_data in parsed['students']:
        idx = s_data['student_index']
        # Valid admission number matching ^PA-\d{4}-\d{6}$
        admission_num = f"PA-2024-{idx:06d}"
        
        name_parts = s_data['name'].split(maxsplit=1)
        first_name = name_parts[0].strip()
        last_name = name_parts[1].strip() if len(name_parts) > 1 else ""

        std = standards_by_level[s_data['level']]
        div = divisions_by_name[s_data['batch_name']]

        # Create Student
        student = Student(
            institution_id=institution.id,
            admission_number=admission_num,
            first_name=first_name,
            last_name=last_name,
            date_of_birth=date(2008, 1, 1),
            gender="unknown",
            admission_date=date(2024, 4, 1),
            is_active=True,
        )
        db.add(student)
        await db.flush()

        # Create Enrollment
        enrollment = StudentEnrollment(
            student_id=student.id,
            academic_year_id=academic_year.id,
            standard_id=std.id,
            division_id=div.id,
            roll_number=f"{s_data['batch_name'].replace(' ', '')}-{idx:02d}",
            enrollment_date=date(2024, 4, 1),
            status="active",
            remarks=f"Imported from {file_name} ({s_data['group']})",
        )
        db.add(enrollment)

        # Create Fee Structure if not exists for standard
        fee_struct = (await db.execute(
            select(FeeStructure).where(
                FeeStructure.academic_year_id == academic_year.id,
                FeeStructure.standard_id == std.id,
                FeeStructure.name == f"Coaching Fee - {s_data['group']}",
            )
        )).scalar_one_or_none()
        if not fee_struct:
            fee_struct = FeeStructure(
                institution_id=institution.id,
                academic_year_id=academic_year.id,
                standard_id=std.id,
                category_id=category.id,
                name=f"Coaching Fee - {s_data['group']}",
                amount=Decimal(str(s_data['total_fee'])),
                frequency="annual",
                installments_count=len(s_data['payments']) or 1,
            )
            db.add(fee_struct)
            await db.flush()

        # Student Fee Assignment
        assignment = StudentFeeAssignment(
            student_id=student.id,
            fee_structure_id=fee_struct.id,
            academic_year_id=academic_year.id,
            custom_amount=Decimal(str(s_data['total_fee'])),
            concession_amount=Decimal('0'),
            remarks=f"Stated balance in sheet: {s_data['stated_balance']}",
        )
        db.add(assignment)
        await db.flush()

        # Fee Invoice
        total_fee_dec = Decimal(str(s_data['total_fee']))
        calc_paid_dec = Decimal(str(s_data['calc_paid']))
        calc_bal_dec = Decimal(str(s_data['calc_balance']))

        inv_status = "paid" if calc_bal_dec <= Decimal('0.01') else ("partial" if calc_paid_dec > Decimal('0') else "unpaid")
        invoice = FeeInvoice(
            invoice_number=f"INV-2024-{idx:04d}",
            student_id=student.id,
            assignment_id=assignment.id,
            academic_year_id=academic_year.id,
            total_amount=total_fee_dec,
            discount_amount=Decimal('0'),
            net_amount=total_fee_dec,
            paid_amount=calc_paid_dec,
            outstanding_amount=max(calc_bal_dec, Decimal('0')),
            status=inv_status,
            issue_date=date(2024, 4, 1),
            due_date=date(2025, 3, 31),
            notes=f"Source: {file_name} [{s_data['group']}]. Stated balance: {s_data['stated_balance']}. Discrepancy status: {s_data['discrepancy_status']}",
        )
        db.add(invoice)
        await db.flush()

        # Invoice item
        inv_item = FeeInvoiceItem(
            invoice_id=invoice.id,
            fee_structure_id=fee_struct.id,
            description=f"Course & Tuition Fee - {s_data['group']}",
            amount=total_fee_dec,
            discount_amount=Decimal('0'),
            net_amount=total_fee_dec,
        )
        db.add(inv_item)

        # Record Payments
        for p_idx, p_data in enumerate(s_data['payments'], 1):
            receipt_count += 1
            receipt_num = f"RCP-{academic_year.id}-{receipt_count:06d}"
            p_amt = Decimal(str(p_data['amount']))
            p_date = date(p_data['year'], p_data['month'], p_data['day'])

            payment = Payment(
                student_id=student.id,
                academic_year_id=academic_year.id,
                amount=p_amt,
                payment_date=p_date,
                payment_method="unspecified",
                notes=f"Imported payment: {p_data['raw']} (Session column: {p_data['month']}/{p_data['year']})",
                status="completed",
                collected_by_id=user_id,
            )
            db.add(payment)
            await db.flush()

            allocation = PaymentAllocation(
                payment_id=payment.id,
                invoice_id=invoice.id,
                allocated_amount=p_amt,
            )
            db.add(allocation)

            receipt_data = {
                "receipt_number": receipt_num,
                "student_name": f"{first_name} {last_name}".strip(),
                "admission_number": admission_num,
                "batch": f"{std.name} - {div.name}",
                "amount": float(p_amt),
                "payment_date": str(p_date),
                "payment_method": "unspecified",
                "notes": p_data['raw'],
            }

            receipt = PaymentReceipt(
                receipt_number=receipt_num,
                payment_id=payment.id,
                student_id=student.id,
                amount=p_amt,
                payment_date=p_date,
                payment_method="unspecified",
                receipt_data=json.dumps(receipt_data),
            )
            db.add(receipt)
            imported_payments_total += 1

        imported_students.append({
            'admission_number': admission_num,
            'name': s_data['name'],
            'batch': s_data['batch_name'],
            'total_fee': s_data['total_fee'],
            'paid': s_data['calc_paid'],
            'balance': s_data['calc_balance'],
            'status': inv_status,
        })

    # 7. Record Import Log
    import_log = FeeRegisterImport(
        file_name=file_name,
        file_hash=file_hash,
        academic_year_id=academic_year.id,
        institution_id=institution.id,
        imported_students_count=len(imported_students),
        imported_payments_count=imported_payments_total,
        total_fees=Decimal(str(parsed['summary']['total_fees'])),
        total_collected=Decimal(str(parsed['summary']['total_collected'])),
        total_outstanding=Decimal(str(parsed['summary']['total_outstanding'])),
        reconciliation_summary=json.dumps(parsed['summary']),
        status="completed",
        imported_by_id=user_id,
    )
    db.add(import_log)
    await db.commit()

    return {
        "status": "success",
        "message": f"Successfully imported {len(imported_students)} students and {imported_payments_total} payment transactions.",
        "import_id": import_log.id,
        "file_hash": file_hash,
        "summary": parsed['summary'],
        "groups": parsed['groups'],
        "sample_imported": imported_students[:5],
    }
