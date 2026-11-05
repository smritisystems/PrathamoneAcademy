# /**
#  * @file        data_exporter.py
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
#  * @updated     2026-11-05
#  *
#  * @description Service for exporting student, fee, academic, and attendance data to Excel and CSV formats.
#  */

import io
import csv
from datetime import date, datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_

from app.models.student import Student, Guardian
from app.models.academic_year import AcademicYear
from app.models.board import Board
from app.models.standard import Standard
from app.models.division import Division
from app.models.subject import Subject
from app.models.enrollment import StudentEnrollment
from app.models.fee import FeeStructure, FeeInvoice
from app.models.payment import Payment, PaymentReceipt
from app.models.attendance import Attendance
from app.models.exam import Examination, ExamMark


def sanitize_formula_injection(val: Any) -> Any:
    """
    Prevent Spreadsheet Formula Injection (CSV/Excel Formula Injection).
    If a string starts with =, +, -, @, \\t, \\r, prepend a single quote '.
    """
    if val is None:
        return ""
    if isinstance(val, (int, float, Decimal, bool, date, datetime)):
        return val
    s = str(val)
    if s and s[0] in ("=", "+", "-", "@", "\t", "\r"):
        return f"'{s}"
    return s


def create_excel_workbook(sheet_name: str, headers: List[str], rows: List[List[Any]]) -> bytes:
    """Generate a professionally formatted Excel (.xlsx) file in bytes."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = sheet_name[:31]

    # Header styling
    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid") # Navy Blue
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    data_font = Font(name="Calibri", size=10)
    border_thin = Border(
        left=Side(style="thin", color="E2E8F0"),
        right=Side(style="thin", color="E2E8F0"),
        top=Side(style="thin", color="E2E8F0"),
        bottom=Side(style="thin", color="E2E8F0"),
    )

    # Write headers
    ws.append(headers)
    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[1].height = 26

    # Write data rows
    for r_idx, row in enumerate(rows, start=2):
        sanitized_row = [sanitize_formula_injection(c) for c in row]
        ws.append(sanitized_row)
        ws.row_dimensions[r_idx].height = 20
        for col_idx in range(1, len(row) + 1):
            cell = ws.cell(row=r_idx, column=col_idx)
            cell.font = data_font
            cell.border = border_thin
            if isinstance(cell.value, (int, float, Decimal)):
                cell.alignment = Alignment(horizontal="right", vertical="center")
            elif isinstance(cell.value, (date, datetime)):
                cell.alignment = Alignment(horizontal="center", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")

    # Configure print page footer in Excel worksheet
    ws.oddFooter.center.text = "PrathamOne Coaching Institutes Enterprise Suite · prathamone.com"
    ws.oddFooter.center.size = 8
    ws.oddFooter.center.color = "888888"
    ws.evenFooter.center.text = "PrathamOne Coaching Institutes Enterprise Suite · prathamone.com"
    ws.evenFooter.center.size = 8
    ws.evenFooter.center.color = "888888"

    # Understated trailing branding row
    footer_row_idx = len(rows) + 3
    footer_cell = ws.cell(
        row=footer_row_idx,
        column=1,
        value="PrathamOne Coaching Institutes Enterprise Suite · prathamone.com",
    )
    footer_cell.font = Font(name="Calibri", size=8, color="888888", italic=True)

    # Auto-fit column widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def create_csv_content(headers: List[str], rows: List[List[Any]]) -> bytes:
    """Generate a clean CSV file with UTF-8 BOM and formula sanitization."""
    out = io.StringIO()
    writer = csv.writer(out, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(headers)
    for row in rows:
        writer.writerow([sanitize_formula_injection(c) for c in row])
    writer.writerow([])
    writer.writerow(["PrathamOne Coaching Institutes Enterprise Suite · prathamone.com"])
    return out.getvalue().encode("utf-8-sig")


async def export_entity_data(
    entity_type: str,
    export_format: str,
    institution_id: int,
    academic_year_id: Optional[int] = None,
    board_id: Optional[int] = None,
    standard_id: Optional[int] = None,
    division_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status_filter: Optional[str] = None,
    db: AsyncSession = None,
) -> tuple[bytes, str, str]:
    """
    Queries real filtered data from database and exports as (.xlsx or .csv).
    Returns (bytes_content, filename, media_type).
    """
    headers = []
    rows = []
    entity_key = entity_type.lower().strip()

    if entity_key in ("students", "student"):
        headers = [
            "Admission Number", "First Name", "Last Name", "Gender",
            "Date of Birth", "Blood Group", "Phone", "Email",
            "Address", "City", "State", "Pincode", "Admission Date", "Status"
        ]
        q = select(Student).where(Student.institution_id == institution_id)
        if status_filter:
            q = q.where(Student.is_active == (status_filter.lower() == "active"))
        students = (await db.execute(q.order_by(Student.admission_number))).scalars().all()
        for s in students:
            rows.append([
                s.admission_number, s.first_name, s.last_name or "", s.gender,
                str(s.date_of_birth), s.blood_group or "", s.phone or "", s.email or "",
                s.address or "", s.city or "", s.state or "", s.pincode or "",
                str(s.admission_date), "Active" if s.is_active else "Inactive"
            ])

    elif entity_key in ("guardians", "guardian"):
        headers = [
            "Student Admission No", "Relation", "First Name", "Last Name",
            "Phone", "Email", "Occupation", "Aadhar Number", "Annual Income", "Is Primary"
        ]
        q = (
            select(Guardian, Student)
            .join(Student, Guardian.student_id == Student.id)
            .where(Student.institution_id == institution_id)
            .order_by(Student.admission_number, Guardian.is_primary.desc())
        )
        guardians = (await db.execute(q)).all()
        for g, s in guardians:
            rows.append([
                s.admission_number, g.relation, g.first_name, g.last_name or "",
                g.phone or "", g.email or "", g.occupation or "", g.aadhar_number or "",
                float(g.annual_income) if g.annual_income else 0, "Yes" if g.is_primary else "No"
            ])

    elif entity_key in ("boards", "board"):
        headers = ["Board Name", "Board Code", "Description", "Status"]
        q = select(Board).where(Board.institution_id == institution_id).order_by(Board.name)
        boards = (await db.execute(q)).scalars().all()
        for b in boards:
            rows.append([b.name, b.code, b.description or "", "Active" if b.is_active else "Inactive"])

    elif entity_key in ("classes", "standards", "standard"):
        headers = ["Class Name", "Academic Level", "Description", "Status"]
        q = select(Standard).where(Standard.institution_id == institution_id).order_by(Standard.level)
        standards = (await db.execute(q)).scalars().all()
        for std in standards:
            rows.append([std.name, std.level, std.description or "", "Active" if std.is_active else "Inactive"])

    elif entity_key in ("subjects", "subject"):
        headers = ["Subject Name", "Subject Code", "Class Name", "Max Marks", "Pass Marks", "Is Optional", "Status"]
        q = (
            select(Subject, Standard)
            .join(Standard, Subject.standard_id == Standard.id)
            .where(Standard.institution_id == institution_id)
            .order_by(Standard.level, Subject.name)
        )
        if standard_id:
            q = q.where(Subject.standard_id == standard_id)
        subjects = (await db.execute(q)).all()
        for sub, std in subjects:
            rows.append([
                sub.name, sub.code or "", std.name, sub.max_marks,
                sub.pass_marks, "Yes" if sub.is_optional else "No",
                "Active" if sub.is_active else "Inactive"
            ])

    elif entity_key in ("batches", "divisions", "division"):
        headers = [
            "Batch Name", "Batch Code", "Class Name", "Board Code",
            "Capacity", "Room Number", "Schedule Timing", "Status"
        ]
        q = (
            select(Division, Standard, Board)
            .join(Standard, Division.standard_id == Standard.id)
            .outerjoin(Board, Division.board_id == Board.id)
            .where(Standard.institution_id == institution_id)
            .order_by(Standard.level, Division.name)
        )
        if standard_id:
            q = q.where(Division.standard_id == standard_id)
        if board_id:
            q = q.where(Division.board_id == board_id)
        batches = (await db.execute(q)).all()
        for d, std, brd in batches:
            rows.append([
                d.name, d.code or "", std.name, brd.code if brd else "",
                d.capacity, d.room_number or "", d.schedule_timing or "", d.status or "active"
            ])

    elif entity_key in ("enrollments", "enrollment"):
        headers = [
            "Admission No", "Student Name", "Academic Year", "Class Name",
            "Batch Code", "Roll Number", "Enrollment Date", "Status"
        ]
        q = (
            select(StudentEnrollment, Student, AcademicYear, Standard, Division)
            .join(Student, StudentEnrollment.student_id == Student.id)
            .join(AcademicYear, StudentEnrollment.academic_year_id == AcademicYear.id)
            .join(Standard, StudentEnrollment.standard_id == Standard.id)
            .outerjoin(Division, StudentEnrollment.division_id == Division.id)
            .where(Student.institution_id == institution_id)
            .order_by(Student.admission_number)
        )
        if academic_year_id:
            q = q.where(StudentEnrollment.academic_year_id == academic_year_id)
        if standard_id:
            q = q.where(StudentEnrollment.standard_id == standard_id)
        if division_id:
            q = q.where(StudentEnrollment.division_id == division_id)
        enrollments = (await db.execute(q)).all()
        for enr, s, ay, std, div in enrollments:
            rows.append([
                s.admission_number, f"{s.first_name} {s.last_name or ''}".strip(),
                ay.name, std.name, div.code if div else "", enr.roll_number or "",
                str(enr.enrollment_date), enr.status
            ])

    elif entity_key in ("payments", "payment"):
        headers = [
            "Transaction Ref", "Admission No", "Student Name", "Academic Year",
            "Amount (INR)", "Payment Date", "Payment Method", "Notes", "Status"
        ]
        q = (
            select(Payment, Student, AcademicYear)
            .join(Student, Payment.student_id == Student.id)
            .join(AcademicYear, Payment.academic_year_id == AcademicYear.id)
            .where(Student.institution_id == institution_id)
            .order_by(Payment.payment_date.desc(), Payment.id.desc())
        )
        if academic_year_id:
            q = q.where(Payment.academic_year_id == academic_year_id)
        if start_date:
            q = q.where(Payment.payment_date >= start_date)
        if end_date:
            q = q.where(Payment.payment_date <= end_date)
        payments = (await db.execute(q)).all()
        for p, s, ay in payments:
            rows.append([
                p.transaction_reference or f"TXN-{p.id}", s.admission_number,
                f"{s.first_name} {s.last_name or ''}".strip(), ay.name,
                float(p.amount), str(p.payment_date), p.payment_method,
                p.notes or "", p.status
            ])

    elif entity_key in ("receipts", "receipt"):
        headers = [
            "Receipt Number", "Admission No", "Student Name", "Amount (INR)",
            "Payment Date", "Payment Method"
        ]
        q = (
            select(PaymentReceipt, Student)
            .join(Student, PaymentReceipt.student_id == Student.id)
            .where(Student.institution_id == institution_id)
            .order_by(PaymentReceipt.id.desc())
        )
        receipts = (await db.execute(q)).all()
        for r, s in receipts:
            rows.append([
                r.receipt_number, s.admission_number,
                f"{s.first_name} {s.last_name or ''}".strip(),
                float(r.amount), str(r.payment_date), r.payment_method
            ])

    elif entity_key in ("fees", "invoices", "fee_invoices"):
        headers = [
            "Invoice Number", "Admission No", "Student Name", "Academic Year",
            "Total Amount (INR)", "Issue Date", "Due Date", "Status"
        ]
        q = (
            select(FeeInvoice, Student, AcademicYear)
            .join(Student, FeeInvoice.student_id == Student.id)
            .join(AcademicYear, FeeInvoice.academic_year_id == AcademicYear.id)
            .where(Student.institution_id == institution_id)
            .order_by(FeeInvoice.id.desc())
        )
        if academic_year_id:
            q = q.where(FeeInvoice.academic_year_id == academic_year_id)
        invoices = (await db.execute(q)).all()
        for inv, s, ay in invoices:
            rows.append([
                inv.invoice_number, s.admission_number,
                f"{s.first_name} {s.last_name or ''}".strip(), ay.name,
                float(inv.total_amount), str(inv.issue_date), str(inv.due_date), inv.status
            ])

    elif entity_key in ("fee_plans", "fee_structures"):
        headers = ["Plan Name", "Class Name", "Academic Year", "Total Amount (INR)", "Status"]
        q = (
            select(FeeStructure, Standard, AcademicYear)
            .join(Standard, FeeStructure.standard_id == Standard.id)
            .join(AcademicYear, FeeStructure.academic_year_id == AcademicYear.id)
            .where(Standard.institution_id == institution_id)
            .order_by(FeeStructure.name)
        )
        plans = (await db.execute(q)).all()
        for fs, std, ay in plans:
            rows.append([fs.name, std.name, ay.name, float(fs.total_amount), "Active" if fs.is_active else "Inactive"])

    elif entity_key in ("attendance",):
        headers = [
            "Admission No", "Student Name", "Class Name", "Batch Code",
            "Date", "Status", "Remarks"
        ]
        q = (
            select(Attendance, Student, Standard, Division)
            .join(Student, Attendance.student_id == Student.id)
            .join(Standard, Attendance.standard_id == Standard.id)
            .outerjoin(Division, Attendance.division_id == Division.id)
            .where(Student.institution_id == institution_id)
            .order_by(Attendance.date.desc())
        )
        if start_date:
            q = q.where(Attendance.date >= start_date)
        if end_date:
            q = q.where(Attendance.date <= end_date)
        attendances = (await db.execute(q)).all()
        for att, s, std, div in attendances:
            rows.append([
                s.admission_number, f"{s.first_name} {s.last_name or ''}".strip(),
                std.name, div.code if div else "", str(att.date), att.status, att.remarks or ""
            ])

    elif entity_key in ("exams", "examinations"):
        headers = ["Exam Name", "Exam Type", "Class Name", "Academic Year", "Start Date", "End Date", "Max Marks"]
        q = (
            select(Examination, Standard, AcademicYear)
            .join(Standard, Examination.standard_id == Standard.id)
            .join(AcademicYear, Examination.academic_year_id == AcademicYear.id)
            .where(Standard.institution_id == institution_id)
            .order_by(Examination.start_date.desc())
        )
        exams = (await db.execute(q)).all()
        for ex, std, ay in exams:
            rows.append([
                ex.name, ex.exam_type, std.name, ay.name,
                str(ex.start_date) if ex.start_date else "",
                str(ex.end_date) if ex.end_date else "", ex.max_marks or 100
            ])

    elif entity_key in ("marks", "exam_marks"):
        headers = [
            "Admission No", "Student Name", "Exam Name", "Subject Name",
            "Marks Obtained", "Max Marks", "Grade", "Remarks"
        ]
        q = (
            select(ExamMark, Student, Examination, Subject)
            .join(Student, ExamMark.student_id == Student.id)
            .join(Examination, ExamMark.examination_id == Examination.id)
            .join(Subject, ExamMark.subject_id == Subject.id)
            .where(Student.institution_id == institution_id)
            .order_by(Student.admission_number)
        )
        marks = (await db.execute(q)).all()
        for m, s, ex, sub in marks:
            rows.append([
                s.admission_number, f"{s.first_name} {s.last_name or ''}".strip(),
                ex.name, sub.name, float(m.marks_obtained) if m.marks_obtained is not None else 0,
                ex.max_marks or 100, m.grade or "", m.remarks or ""
            ])

    else:
        # Default fallback to students
        headers = ["Admission Number", "First Name", "Last Name", "Gender", "Date of Birth", "Phone", "Status"]
        students = (await db.execute(select(Student).where(Student.institution_id == institution_id))).scalars().all()
        for s in students:
            rows.append([s.admission_number, s.first_name, s.last_name or "", s.gender, str(s.date_of_birth), s.phone or "", "Active" if s.is_active else "Inactive"])

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_entity_name = entity_key.replace(" ", "_")

    if export_format.lower() == "csv":
        content = create_csv_content(headers, rows)
        filename = f"prashant_academy_{clean_entity_name}_{timestamp}.csv"
        media_type = "text/csv"
    else:
        content = create_excel_workbook(clean_entity_name, headers, rows)
        filename = f"prashant_academy_{clean_entity_name}_{timestamp}.xlsx"
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    return content, filename, media_type

