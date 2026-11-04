# /**
#  * @file        data_importer.py
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
#  * @description Service for parsing, validating, duplicate-checking, and importing batch data from spreadsheets.
#  */

import io
import csv
import re
import json
from datetime import date, datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple
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
from app.models.payment import Payment, PaymentAllocation, PaymentReceipt
from app.models.attendance import Attendance
from app.models.exam import Examination, ExamMark
from app.models.user import User, AuditLog
from app.models.import_log import DataImportLog
from app.core.security import get_password_hash

# ─── Entity Definitions & Schemas ──────────────────────────────────────────────

ENTITY_CONFIGS: Dict[str, Dict[str, Any]] = {
    "students": {
        "label": "Students",
        "unique_key": ["admission_number"],
        "fields": [
            {"key": "admission_number", "label": "Admission Number", "required": True, "type": "str", "sample": "PA-2024-000040", "desc": "Unique student admission code"},
            {"key": "first_name", "label": "First Name", "required": True, "type": "str", "sample": "Aarav", "desc": "Student first name"},
            {"key": "last_name", "label": "Last Name", "required": False, "type": "str", "sample": "Sharma", "desc": "Student last name"},
            {"key": "date_of_birth", "label": "Date of Birth", "required": True, "type": "date", "sample": "2009-05-15", "desc": "YYYY-MM-DD"},
            {"key": "gender", "label": "Gender", "required": True, "type": "str", "sample": "male", "desc": "male / female / other"},
            {"key": "blood_group", "label": "Blood Group", "required": False, "type": "str", "sample": "O+", "desc": "e.g. A+, B+, O+"},
            {"key": "phone", "label": "Phone Number", "required": False, "type": "str", "sample": "9876543210", "desc": "10-digit mobile"},
            {"key": "email", "label": "Email Address", "required": False, "type": "email", "sample": "aarav.sharma@example.com", "desc": "Valid email address"},
            {"key": "address", "label": "Address", "required": False, "type": "str", "sample": "123 MG Road", "desc": "Residential address"},
            {"key": "city", "label": "City", "required": False, "type": "str", "sample": "Mumbai", "desc": "City name"},
            {"key": "state", "label": "State", "required": False, "type": "str", "sample": "Maharashtra", "desc": "State name"},
            {"key": "pincode", "label": "Pincode", "required": False, "type": "str", "sample": "400001", "desc": "6-digit postal code"},
            {"key": "admission_date", "label": "Admission Date", "required": False, "type": "date", "sample": "2024-04-01", "desc": "YYYY-MM-DD (Defaults to today)"},
        ],
        "aliases": {
            "adm_no": "admission_number", "admission_no": "admission_number", "roll": "admission_number",
            "student_id": "admission_number", "first name": "first_name", "fname": "first_name",
            "last name": "last_name", "lname": "last_name", "surname": "last_name",
            "dob": "date_of_birth", "birth date": "date_of_birth", "birthdate": "date_of_birth",
            "mobile": "phone", "contact": "phone", "phone_number": "phone",
            "email_id": "email", "mail": "email",
        }
    },
    "guardians": {
        "label": "Parents & Guardians",
        "unique_key": ["student_admission_number", "relation"],
        "fields": [
            {"key": "student_admission_number", "label": "Student Admission No", "required": True, "type": "str", "sample": "PA-2024-000001", "desc": "Associated student admission code"},
            {"key": "relation", "label": "Relation", "required": True, "type": "str", "sample": "Father", "desc": "Father / Mother / Guardian"},
            {"key": "first_name", "label": "First Name", "required": True, "type": "str", "sample": "Rajesh", "desc": "Guardian first name"},
            {"key": "last_name", "label": "Last Name", "required": False, "type": "str", "sample": "Sharma", "desc": "Guardian last name"},
            {"key": "phone", "label": "Phone Number", "required": False, "type": "str", "sample": "9876543211", "desc": "10-digit mobile"},
            {"key": "email", "label": "Email Address", "required": False, "type": "email", "sample": "rajesh.sharma@example.com", "desc": "Guardian email"},
            {"key": "occupation", "label": "Occupation", "required": False, "type": "str", "sample": "Business", "desc": "Occupation / Profession"},
            {"key": "annual_income", "label": "Annual Income", "required": False, "type": "float", "sample": "750000", "desc": "Annual income in INR"},
            {"key": "is_primary", "label": "Is Primary Guardian", "required": False, "type": "bool", "sample": "true", "desc": "true / false"},
        ],
        "aliases": {
            "admission_number": "student_admission_number", "adm_no": "student_admission_number",
            "relationship": "relation", "mobile": "phone", "contact": "phone",
        }
    },
    "boards": {
        "label": "Boards",
        "unique_key": ["code"],
        "fields": [
            {"key": "name", "label": "Board Name", "required": True, "type": "str", "sample": "ICSE Board", "desc": "Full board name"},
            {"key": "code", "label": "Board Code", "required": True, "type": "str", "sample": "ICSE", "desc": "Unique board code"},
            {"key": "description", "label": "Description", "required": False, "type": "str", "sample": "Council for the Indian School Certificate Examinations", "desc": "Notes / overview"},
        ],
        "aliases": {
            "board_name": "name", "board_code": "code",
        }
    },
    "classes": {
        "label": "Classes / Standards",
        "unique_key": ["level"],
        "fields": [
            {"key": "name", "label": "Class Name", "required": True, "type": "str", "sample": "Class X", "desc": "e.g. Class IX, Class X"},
            {"key": "level", "label": "Academic Level", "required": True, "type": "int", "sample": "10", "desc": "Numeric level (1 to 12)"},
            {"key": "description", "label": "Description", "required": False, "type": "str", "sample": "Secondary School Level 10", "desc": "Optional description"},
        ],
        "aliases": {
            "standard_name": "name", "class": "name", "standard_level": "level", "grade": "level",
        }
    },
    "subjects": {
        "label": "Subjects",
        "unique_key": ["code"],
        "fields": [
            {"key": "standard_name", "label": "Class Name", "required": True, "type": "str", "sample": "Class X", "desc": "Must match existing class"},
            {"key": "name", "label": "Subject Name", "required": True, "type": "str", "sample": "Physics", "desc": "Subject title"},
            {"key": "code", "label": "Subject Code", "required": True, "type": "str", "sample": "PHYS-10", "desc": "Unique subject code"},
            {"key": "max_marks", "label": "Max Marks", "required": False, "type": "int", "sample": "100", "desc": "Maximum marks (Default: 100)"},
            {"key": "pass_marks", "label": "Pass Marks", "required": False, "type": "int", "sample": "35", "desc": "Passing threshold (Default: 35)"},
            {"key": "is_optional", "label": "Is Optional", "required": False, "type": "bool", "sample": "false", "desc": "true / false"},
        ],
        "aliases": {
            "class": "standard_name", "subject_name": "name", "subject_code": "code",
        }
    },
    "batches": {
        "label": "Batches / Divisions",
        "unique_key": ["code"],
        "fields": [
            {"key": "standard_name", "label": "Class Name", "required": True, "type": "str", "sample": "Class X", "desc": "Target class name"},
            {"key": "board_code", "label": "Board Code", "required": False, "type": "str", "sample": "ICSE", "desc": "Target board code (ICSE, CBSE, SSC)"},
            {"key": "name", "label": "Batch Name", "required": True, "type": "str", "sample": "Batch A (Morning)", "desc": "Batch display name"},
            {"key": "code", "label": "Batch Code", "required": True, "type": "str", "sample": "ICSE-X-A", "desc": "Unique batch code"},
            {"key": "capacity", "label": "Capacity", "required": False, "type": "int", "sample": "40", "desc": "Seat capacity (Default: 40)"},
            {"key": "room_number", "label": "Room Number", "required": False, "type": "str", "sample": "Room 1", "desc": "Classroom designation"},
            {"key": "schedule_timing", "label": "Schedule Timing", "required": False, "type": "str", "sample": "Mon - Fri, 07:00 AM - 09:00 AM", "desc": "Weekly shift timing"},
            {"key": "status", "label": "Status", "required": False, "type": "str", "sample": "active", "desc": "active / planned / archived"},
        ],
        "aliases": {
            "batch_name": "name", "batch_code": "code", "class": "standard_name", "board": "board_code", "room": "room_number",
        }
    },
    "enrollments": {
        "label": "Enrollments",
        "unique_key": ["student_admission_number", "academic_year_name"],
        "fields": [
            {"key": "student_admission_number", "label": "Student Admission No", "required": True, "type": "str", "sample": "PA-2024-000001", "desc": "Valid student code"},
            {"key": "academic_year_name", "label": "Academic Year", "required": True, "type": "str", "sample": "2024-25", "desc": "e.g. 2024-25"},
            {"key": "standard_name", "label": "Class Name", "required": True, "type": "str", "sample": "Class X", "desc": "Target class"},
            {"key": "batch_code", "label": "Batch Code", "required": False, "type": "str", "sample": "ICSE-X-A", "desc": "Target batch code"},
            {"key": "roll_number", "label": "Roll Number", "required": False, "type": "str", "sample": "ICSEX-01", "desc": "Assigned roll number"},
            {"key": "enrollment_date", "label": "Enrollment Date", "required": False, "type": "date", "sample": "2024-04-01", "desc": "YYYY-MM-DD"},
            {"key": "status", "label": "Status", "required": False, "type": "str", "sample": "active", "desc": "active / inactive / transferred"},
        ],
        "aliases": {
            "admission_number": "student_admission_number", "adm_no": "student_admission_number",
            "year": "academic_year_name", "batch": "batch_code", "class": "standard_name",
        }
    },
    "payments": {
        "label": "Payments",
        "unique_key": ["transaction_reference"],
        "fields": [
            {"key": "transaction_reference", "label": "Transaction Reference", "required": True, "type": "str", "sample": "PAY-2024-001", "desc": "Unique reference ID"},
            {"key": "student_admission_number", "label": "Student Admission No", "required": True, "type": "str", "sample": "PA-2024-000001", "desc": "Valid student code"},
            {"key": "academic_year_name", "label": "Academic Year", "required": True, "type": "str", "sample": "2024-25", "desc": "Academic session"},
            {"key": "amount", "label": "Amount (INR)", "required": True, "type": "float", "sample": "15000", "desc": "Payment amount in rupees"},
            {"key": "payment_date", "label": "Payment Date", "required": True, "type": "date", "sample": "2024-05-10", "desc": "YYYY-MM-DD"},
            {"key": "payment_method", "label": "Payment Method", "required": False, "type": "str", "sample": "bank_transfer", "desc": "cash / bank_transfer / upi / cheque"},
            {"key": "notes", "label": "Notes / Remarks", "required": False, "type": "str", "sample": "Installment 1 Fee", "desc": "Transaction description"},
        ],
        "aliases": {
            "txn_ref": "transaction_reference", "ref_no": "transaction_reference", "admission_number": "student_admission_number",
            "adm_no": "student_admission_number", "paid_amount": "amount", "fee_paid": "amount", "date": "payment_date",
        }
    },
    "attendance": {
        "label": "Attendance",
        "unique_key": ["student_admission_number", "date"],
        "fields": [
            {"key": "student_admission_number", "label": "Student Admission No", "required": True, "type": "str", "sample": "PA-2024-000001", "desc": "Valid student code"},
            {"key": "date", "label": "Attendance Date", "required": True, "type": "date", "sample": "2024-08-01", "desc": "YYYY-MM-DD"},
            {"key": "status", "label": "Status", "required": True, "type": "str", "sample": "present", "desc": "present / absent / late / excused"},
            {"key": "standard_name", "label": "Class Name", "required": False, "type": "str", "sample": "Class X", "desc": "Class name"},
            {"key": "batch_code", "label": "Batch Code", "required": False, "type": "str", "sample": "ICSE-X-A", "desc": "Batch code"},
            {"key": "remarks", "label": "Remarks", "required": False, "type": "str", "sample": "On time", "desc": "Optional remarks"},
        ],
        "aliases": {
            "admission_number": "student_admission_number", "adm_no": "student_admission_number",
            "attendance_date": "date", "attendance_status": "status",
        }
    },
    "exams": {
        "label": "Examinations",
        "unique_key": ["name", "standard_name"],
        "fields": [
            {"key": "name", "label": "Exam Name", "required": True, "type": "str", "sample": "Unit Test 1", "desc": "Test / Examination title"},
            {"key": "standard_name", "label": "Class Name", "required": True, "type": "str", "sample": "Class X", "desc": "Target class name"},
            {"key": "academic_year_name", "label": "Academic Year", "required": True, "type": "str", "sample": "2024-25", "desc": "Academic year session"},
            {"key": "exam_type", "label": "Exam Type", "required": False, "type": "str", "sample": "unit_test", "desc": "unit_test / mid_term / final"},
            {"key": "start_date", "label": "Start Date", "required": False, "type": "date", "sample": "2024-07-15", "desc": "YYYY-MM-DD"},
            {"key": "end_date", "label": "End Date", "required": False, "type": "date", "sample": "2024-07-20", "desc": "YYYY-MM-DD"},
            {"key": "max_marks", "label": "Max Marks", "required": False, "type": "int", "sample": "50", "desc": "Max marks (Default: 100)"},
        ],
        "aliases": {
            "exam_name": "name", "class": "standard_name", "year": "academic_year_name",
        }
    },
    "marks": {
        "label": "Exam Marks",
        "unique_key": ["student_admission_number", "exam_name", "subject_code"],
        "fields": [
            {"key": "student_admission_number", "label": "Student Admission No", "required": True, "type": "str", "sample": "PA-2024-000001", "desc": "Valid student code"},
            {"key": "exam_name", "label": "Exam Name", "required": True, "type": "str", "sample": "Unit Test 1", "desc": "Existing examination name"},
            {"key": "subject_code", "label": "Subject Code", "required": True, "type": "str", "sample": "MATH-10", "desc": "Subject code or title"},
            {"key": "marks_obtained", "label": "Marks Obtained", "required": True, "type": "float", "sample": "42.5", "desc": "Marks scored by student"},
            {"key": "grade", "label": "Grade", "required": False, "type": "str", "sample": "A", "desc": "e.g. A+, A, B, C"},
            {"key": "remarks", "label": "Remarks", "required": False, "type": "str", "sample": "Excellent grasp", "desc": "Teacher notes"},
        ],
        "aliases": {
            "admission_number": "student_admission_number", "adm_no": "student_admission_number",
            "exam": "exam_name", "subject": "subject_code", "score": "marks_obtained", "marks": "marks_obtained",
        }
    },
}


# ─── Template Generator ────────────────────────────────────────────────────────

def generate_entity_template(entity_type: str, file_format: str = "xlsx") -> Tuple[bytes, str, str]:
    """Generates a downloadable Excel or CSV template with headers, field guide, and a sample row."""
    cfg = ENTITY_CONFIGS.get(entity_type.lower().strip())
    if not cfg:
        cfg = ENTITY_CONFIGS["students"]
        entity_type = "students"

    fields = cfg["fields"]
    headers = [f["label"] for f in fields]
    guidance = [f"{f['type'].upper()} ({'Required' if f['required'] else 'Optional'}): {f['desc']}" for f in fields]
    sample_row = [f["sample"] for f in fields]

    filename = f"template_{entity_type}_{date.today().strftime('%Y%m%d')}.{file_format}"

    if file_format == "csv":
        out = io.StringIO()
        writer = csv.writer(out)
        writer.writerow(headers)
        writer.writerow(guidance)
        writer.writerow(sample_row)
        content = out.getvalue().encode("utf-8-sig")
        return content, filename, "text/csv"

    # Excel format with professional styling
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = cfg["label"][:31]

    # Row 1: Headers (Navy Blue fill, White bold text)
    ws.append(headers)
    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[1].height = 26

    # Row 2: Guidance / Format description (Light Gray fill, italic)
    ws.append(guidance)
    guide_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    guide_font = Font(name="Calibri", size=9, italic=True, color="475569")
    for col_idx in range(1, len(guidance) + 1):
        cell = ws.cell(row=2, column=col_idx)
        cell.fill = guide_fill
        cell.font = guide_font
        cell.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[2].height = 20

    # Row 3: Sample valid data row
    ws.append(sample_row)
    sample_font = Font(name="Calibri", size=10, color="0F172A")
    for col_idx in range(1, len(sample_row) + 1):
        cell = ws.cell(row=3, column=col_idx)
        cell.font = sample_font
        cell.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[3].height = 20

    # Auto-fit column widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 15)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue(), filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


# ─── Raw Input Parsers (File & Paste Grid) ──────────────────────────────────────

def parse_uploaded_file_rows(file_bytes: bytes, filename: str) -> Tuple[List[str], List[List[Any]]]:
    """Extract headers and raw matrix rows from uploaded .xlsx or .csv."""
    fname = filename.lower()
    if fname.endswith((".xlsx", ".xls")):
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
        ws = wb.active
        raw_rows = list(ws.iter_rows(values_only=True))
        if not raw_rows:
            return [], []
        # Filter empty rows
        non_empty = [list(r) for r in raw_rows if any(cell is not None and str(cell).strip() != "" for cell in r)]
        if not non_empty:
            return [], []
        headers = [str(c or "").strip() for c in non_empty[0]]
        # If row 2 looks like a guidance row (contains "Required" or "Optional"), skip it
        data_start_idx = 1
        if len(non_empty) > 1 and any("required" in str(c).lower() or "optional" in str(c).lower() for c in non_empty[1]):
            data_start_idx = 2
        data_rows = non_empty[data_start_idx:]
        return headers, data_rows

    # CSV File
    try:
        text = file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = file_bytes.decode("latin-1")

    # Detect delimiter
    sniffer = csv.Sniffer()
    sample = text[:2048]
    delimiter = ","
    try:
        dialect = sniffer.sniff(sample)
        delimiter = dialect.delimiter
    except Exception:
        if "\t" in sample:
            delimiter = "\t"
        elif ";" in sample:
            delimiter = ";"

    reader = csv.reader(io.StringIO(text), delimiter=delimiter)
    non_empty = [r for r in reader if any(cell.strip() != "" for cell in r)]
    if not non_empty:
        return [], []
    headers = [c.strip() for c in non_empty[0]]
    data_start_idx = 1
    if len(non_empty) > 1 and any("required" in str(c).lower() or "optional" in str(c).lower() for c in non_empty[1]):
        data_start_idx = 2
    return headers, non_empty[data_start_idx:]


def parse_pasted_grid_text(text: str) -> Tuple[List[str], List[List[Any]]]:
    """Parse text copied from Microsoft Excel / Google Sheets (Tab-delimited columns, newline-separated rows)."""
    lines = [line.strip("\r") for line in text.split("\n")]
    rows = [[c.strip() for c in line.split("\t")] for line in lines if line.strip() != ""]
    if not rows:
        return [], []
    
    # Check if first row is header
    first_row = rows[0]
    headers = [str(c).strip() for c in first_row]
    data_rows = rows[1:] if len(rows) > 1 else rows
    return headers, data_rows


# ─── Type Converters & Sanitizers ──────────────────────────────────────────────

DATE_PATTERNS = [
    re.compile(r"^\d{4}-\d{1,2}-\d{1,2}$"), # YYYY-MM-DD
    re.compile(r"^\d{1,2}/\d{1,2}/\d{4}$"), # DD/MM/YYYY
    re.compile(r"^\d{1,2}-\d{1,2}-\d{4}$"), # DD-MM-YYYY
]


def clean_cell_value(val: Any) -> Any:
    if val is None:
        return None
    s = str(val).strip()
    # Strip leading apostrophe if added for formula protection
    if s.startswith("'") and len(s) > 1 and s[1] in ("=", "+", "-", "@"):
        s = s[1:]
    return s


def parse_date_value(val: Any) -> Optional[date]:
    if not val:
        return None
    if isinstance(val, (datetime, date)):
        return val if isinstance(val, date) and not isinstance(val, datetime) else val.date()
    s = str(val).strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def parse_float_value(val: Any) -> Optional[float]:
    if val is None or val == "":
        return None
    if isinstance(val, (int, float, Decimal)):
        return float(val)
    s = str(val).replace("₹", "").replace(",", "").strip()
    try:
        return float(s)
    except ValueError:
        return None


def parse_int_value(val: Any) -> Optional[int]:
    f = parse_float_value(val)
    return int(f) if f is not None else None


def parse_bool_value(val: Any) -> bool:
    if isinstance(val, bool):
        return val
    s = str(val).lower().strip()
    return s in ("true", "1", "yes", "y", "t", "active")


# ─── Validation & Preview Engine ───────────────────────────────────────────────

async def validate_and_preview_import(
    entity_type: str,
    headers: List[str],
    raw_rows: List[List[Any]],
    column_mapping: Optional[Dict[str, str]] = None,
    mode: str = "create_only",
    institution_id: int = 1,
    academic_year_id: Optional[int] = None,
    db: AsyncSession = None,
) -> Dict[str, Any]:
    """
    Validates imported matrix against the target entity specifications.
    Resolves foreign keys, performs duplicate detection, and checks field constraints.
    """
    cfg = ENTITY_CONFIGS.get(entity_type.lower().strip())
    if not cfg:
        raise ValueError(f"Unsupported entity type: '{entity_type}'")

    fields = cfg["fields"]
    field_map = {f["key"]: f for f in fields}
    aliases = cfg.get("aliases", {})

    # Auto-resolve column mapping if not provided
    resolved_mapping: Dict[int, str] = {}
    if column_mapping:
        for col_idx_str, target_field in column_mapping.items():
            if target_field and target_field in field_map:
                resolved_mapping[int(col_idx_str)] = target_field
    else:
        for idx, h in enumerate(headers):
            clean_h = str(h).lower().replace("_", " ").strip()
            # 1. Exact match with key or label
            matched = False
            for f in fields:
                if clean_h == f["key"].lower() or clean_h == f["label"].lower():
                    resolved_mapping[idx] = f["key"]
                    matched = True
                    break
            # 2. Alias match
            if not matched and clean_h in aliases:
                resolved_mapping[idx] = aliases[clean_h]

    # Pre-fetch lookup caches for fast validation
    existing_students = {}
    existing_standards = {}
    existing_boards = {}
    existing_batches = {}
    existing_ay = {}

    if entity_type in ("students", "guardians", "enrollments", "payments", "attendance", "marks"):
        st_rows = (await db.execute(select(Student.id, Student.admission_number).where(Student.institution_id == institution_id))).all()
        for s_id, adm in st_rows:
            existing_students[adm.strip().upper()] = s_id

    std_rows = (await db.execute(select(Standard.id, Standard.name, Standard.level).where(Standard.institution_id == institution_id))).all()
    for s_id, s_name, lvl in std_rows:
        existing_standards[s_name.strip().lower()] = s_id
        existing_standards[f"class {lvl}"] = s_id
        existing_standards[str(lvl)] = s_id

    brd_rows = (await db.execute(select(Board.id, Board.code, Board.name).where(Board.institution_id == institution_id))).all()
    for b_id, b_code, b_name in brd_rows:
        existing_boards[b_code.strip().upper()] = b_id
        existing_boards[b_name.strip().lower()] = b_id

    div_rows = (await db.execute(select(Division.id, Division.code, Division.name))).all()
    for d_id, d_code, d_name in div_rows:
        if d_code:
            existing_batches[d_code.strip().upper()] = d_id
        existing_batches[d_name.strip().lower()] = d_id

    ay_rows = (await db.execute(select(AcademicYear.id, AcademicYear.name))).all()
    for ay_id, ay_name in ay_rows:
        existing_ay[ay_name.strip().lower()] = ay_id

    # Pre-fetch existing unique keys for duplicate detection
    existing_keys_in_db = set()
    if entity_type == "students":
        existing_keys_in_db = set(existing_students.keys())
    elif entity_type == "boards":
        existing_keys_in_db = set(b.strip().upper() for b in existing_boards.keys())
    elif entity_type == "classes":
        existing_keys_in_db = set(lvl for _, _, lvl in std_rows)
    elif entity_type == "batches":
        div_codes = (await db.execute(select(Division.code))).scalars().all()
        existing_keys_in_db = set(c.strip().upper() for c in div_codes if c)
    elif entity_type == "payments":
        pay_refs = (await db.execute(select(Payment.transaction_reference))).scalars().all()
        existing_keys_in_db = set(r.strip().upper() for r in pay_refs if r)

    # Process Rows
    row_previews = []
    total_valid = 0
    total_invalid = 0
    total_duplicates = 0

    for row_idx, row_data in enumerate(raw_rows, start=1):
        parsed_record: Dict[str, Any] = {}
        row_errors: List[str] = []

        # Map row values using resolved_mapping
        for col_idx, cell_val in enumerate(row_data):
            if col_idx in resolved_mapping:
                field_key = resolved_mapping[col_idx]
                parsed_record[field_key] = clean_cell_value(cell_val)

        # Validate required fields
        for f in fields:
            f_key = f["key"]
            f_label = f["label"]
            f_req = f["required"]
            f_type = f["type"]
            val = parsed_record.get(f_key)

            if f_req and (val is None or str(val).strip() == ""):
                row_errors.append(f"Missing required field '{f_label}'")
                continue

            if val is not None and str(val).strip() != "":
                if f_type == "date":
                    dt = parse_date_value(val)
                    if dt:
                        parsed_record[f_key] = str(dt)
                    else:
                        row_errors.append(f"Invalid date format for '{f_label}': '{val}' (Expected YYYY-MM-DD)")
                elif f_type in ("float", "int"):
                    num = parse_float_value(val)
                    if num is None:
                        row_errors.append(f"Invalid numeric value for '{f_label}': '{val}'")
                    else:
                        parsed_record[f_key] = int(num) if f_type == "int" else num
                elif f_type == "email":
                    if not re.match(r"[^@]+@[^@]+\.[^@]+", str(val)):
                        row_errors.append(f"Invalid email format for '{f_label}': '{val}'")

        # Foreign Key validations
        if "student_admission_number" in parsed_record and parsed_record["student_admission_number"]:
            adm = parsed_record["student_admission_number"].strip().upper()
            if adm not in existing_students:
                row_errors.append(f"Student admission number '{adm}' does not exist in database")

        if "standard_name" in parsed_record and parsed_record["standard_name"]:
            std_str = parsed_record["standard_name"].strip().lower()
            if std_str not in existing_standards:
                row_errors.append(f"Class / Standard '{parsed_record['standard_name']}' not found")

        # Duplicate check
        is_duplicate = False
        action = "create"

        if entity_type == "students" and "admission_number" in parsed_record:
            adm = str(parsed_record["admission_number"]).strip().upper()
            if adm in existing_keys_in_db:
                is_duplicate = True
        elif entity_type == "batches" and "code" in parsed_record and parsed_record["code"]:
            b_code = str(parsed_record["code"]).strip().upper()
            if b_code in existing_keys_in_db:
                is_duplicate = True
        elif entity_type == "payments" and "transaction_reference" in parsed_record and parsed_record["transaction_reference"]:
            p_ref = str(parsed_record["transaction_reference"]).strip().upper()
            if p_ref in existing_keys_in_db:
                is_duplicate = True

        if is_duplicate:
            total_duplicates += 1
            if mode == "update_existing":
                action = "update"
            else:
                action = "skip_duplicate"
                row_errors.append(f"Duplicate entry detected: already exists in system")

        is_valid = len(row_errors) == 0
        if is_valid:
            total_valid += 1
        else:
            total_invalid += 1

        row_previews.append({
            "row_number": row_idx,
            "data": parsed_record,
            "raw_row": [clean_cell_value(c) for c in row_data],
            "is_valid": is_valid,
            "is_duplicate": is_duplicate,
            "action": action,
            "errors": row_errors,
        })

    return {
        "entity_type": entity_type,
        "total_rows": len(raw_rows),
        "valid_rows": total_valid,
        "invalid_rows": total_invalid,
        "duplicates_found": total_duplicates,
        "mode": mode,
        "mapped_columns": resolved_mapping,
        "field_definitions": fields,
        "row_previews": row_previews,
    }


# ─── Atomic Database Execution ────────────────────────────────────────────────

async def execute_verified_import(
    entity_type: str,
    validated_rows: List[Dict[str, Any]],
    mode: str = "create_only",
    source_type: str = "file",
    file_name: Optional[str] = None,
    institution_id: int = 1,
    academic_year_id: Optional[int] = None,
    user_id: Optional[int] = None,
    db: AsyncSession = None,
) -> Dict[str, Any]:
    """
    Executes database operations atomically inside a single transaction.
    Wraps all inserts/updates and rolls back if an unhandled integrity violation occurs.
    """
    cfg = ENTITY_CONFIGS.get(entity_type.lower().strip())
    if not cfg:
        raise ValueError(f"Unsupported entity type: '{entity_type}'")

    # Fast ID lookups
    st_rows = (await db.execute(select(Student.id, Student.admission_number).where(Student.institution_id == institution_id))).all()
    student_map = {adm.strip().upper(): s_id for s_id, adm in st_rows}

    std_rows = (await db.execute(select(Standard.id, Standard.name, Standard.level).where(Standard.institution_id == institution_id))).all()
    standard_map = {}
    for s_id, s_name, lvl in std_rows:
        standard_map[s_name.strip().lower()] = s_id
        standard_map[f"class {lvl}"] = s_id
        standard_map[str(lvl)] = s_id

    brd_rows = (await db.execute(select(Board.id, Board.code, Board.name).where(Board.institution_id == institution_id))).all()
    board_map = {}
    for b_id, b_code, b_name in brd_rows:
        board_map[b_code.strip().upper()] = b_id
        board_map[b_name.strip().lower()] = b_id

    div_rows = (await db.execute(select(Division.id, Division.code, Division.name))).all()
    batch_map = {}
    for d_id, d_code, d_name in div_rows:
        if d_code:
            batch_map[d_code.strip().upper()] = d_id
        batch_map[d_name.strip().lower()] = d_id

    ay_rows = (await db.execute(select(AcademicYear.id, AcademicYear.name))).all()
    ay_map = {ay_name.strip().lower(): ay_id for ay_id, ay_name in ay_rows}
    default_ay_id = academic_year_id or (list(ay_map.values())[0] if ay_map else 1)

    successful_count = 0
    updated_count = 0
    failed_count = 0
    skipped_count = 0
    error_list = []

    try:
        for item in validated_rows:
            if not item.get("is_valid", False):
                failed_count += 1
                error_list.append({"row": item.get("row_number"), "errors": item.get("errors", [])})
                continue

            action = item.get("action", "create")
            data = item.get("data", {})

            if action == "skip_duplicate":
                skipped_count += 1
                continue

            # ── 1. Students ──
            if entity_type == "students":
                adm_no = data["admission_number"].strip().upper()
                dob = parse_date_value(data["date_of_birth"])
                adm_date = parse_date_value(data.get("admission_date")) or date.today()

                if action == "update":
                    st = (await db.execute(select(Student).where(Student.admission_number == adm_no))).scalar_one_or_none()
                    if st:
                        st.first_name = data["first_name"]
                        st.last_name = data.get("last_name") or ""
                        st.date_of_birth = dob
                        st.gender = data["gender"].lower()
                        st.blood_group = data.get("blood_group")
                        st.phone = data.get("phone")
                        st.email = data.get("email")
                        st.address = data.get("address")
                        st.city = data.get("city")
                        st.state = data.get("state")
                        st.pincode = data.get("pincode")
                        updated_count += 1
                else:
                    new_student = Student(
                        institution_id=institution_id,
                        admission_number=adm_no,
                        first_name=data["first_name"],
                        last_name=data.get("last_name") or "",
                        date_of_birth=dob,
                        gender=data["gender"].lower(),
                        blood_group=data.get("blood_group"),
                        phone=data.get("phone"),
                        email=data.get("email"),
                        address=data.get("address"),
                        city=data.get("city"),
                        state=data.get("state"),
                        pincode=data.get("pincode"),
                        admission_date=adm_date,
                        is_active=True,
                    )
                    db.add(new_student)
                    await db.flush()
                    student_map[adm_no] = new_student.id
                    successful_count += 1

            # ── 2. Guardians ──
            elif entity_type == "guardians":
                adm_no = data["student_admission_number"].strip().upper()
                st_id = student_map.get(adm_no)
                if not st_id:
                    failed_count += 1
                    error_list.append({"row": item["row_number"], "errors": [f"Student '{adm_no}' not found"]})
                    continue

                rel = data["relation"].capitalize()
                is_prim = parse_bool_value(data.get("is_primary", False))
                inc = parse_float_value(data.get("annual_income"))

                existing_g = (await db.execute(
                    select(Guardian).where(Guardian.student_id == st_id, Guardian.relation == rel)
                )).scalar_one_or_none()

                if existing_g and action == "update":
                    existing_g.first_name = data["first_name"]
                    existing_g.last_name = data.get("last_name") or ""
                    existing_g.phone = data.get("phone")
                    existing_g.email = data.get("email")
                    existing_g.occupation = data.get("occupation")
                    existing_g.annual_income = inc
                    existing_g.is_primary = is_prim
                    updated_count += 1
                else:
                    new_g = Guardian(
                        student_id=st_id,
                        relation=rel,
                        first_name=data["first_name"],
                        last_name=data.get("last_name") or "",
                        phone=data.get("phone"),
                        email=data.get("email"),
                        occupation=data.get("occupation"),
                        annual_income=inc,
                        is_primary=is_prim,
                    )
                    db.add(new_g)
                    successful_count += 1

            # ── 3. Boards ──
            elif entity_type == "boards":
                code = data["code"].strip().upper()
                if action == "update":
                    brd = (await db.execute(select(Board).where(Board.code == code))).scalar_one_or_none()
                    if brd:
                        brd.name = data["name"]
                        brd.description = data.get("description")
                        updated_count += 1
                else:
                    new_brd = Board(
                        institution_id=institution_id,
                        name=data["name"],
                        code=code,
                        description=data.get("description"),
                        is_active=True,
                    )
                    db.add(new_brd)
                    successful_count += 1

            # ── 4. Batches ──
            elif entity_type == "batches":
                code = data["code"].strip().upper()
                std_name = data["standard_name"].strip().lower()
                s_id = standard_map.get(std_name) or list(standard_map.values())[0]
                b_code = (data.get("board_code") or "").strip().upper()
                b_id = board_map.get(b_code)

                if action == "update":
                    div = (await db.execute(select(Division).where(Division.code == code))).scalar_one_or_none()
                    if div:
                        div.name = data["name"]
                        div.capacity = parse_int_value(data.get("capacity")) or 40
                        div.room_number = data.get("room_number")
                        div.schedule_timing = data.get("schedule_timing")
                        div.status = data.get("status") or "active"
                        updated_count += 1
                else:
                    new_div = Division(
                        standard_id=s_id,
                        board_id=b_id,
                        name=data["name"],
                        code=code,
                        capacity=parse_int_value(data.get("capacity")) or 40,
                        room_number=data.get("room_number") or "Room 1",
                        schedule_timing=data.get("schedule_timing") or "Mon - Fri, 07:00 AM - 09:00 AM",
                        status=data.get("status") or "active",
                        is_active=True,
                    )
                    db.add(new_div)
                    successful_count += 1

            # ── 5. Payments ──
            elif entity_type == "payments":
                adm_no = data["student_admission_number"].strip().upper()
                st_id = student_map.get(adm_no)
                if not st_id:
                    failed_count += 1
                    error_list.append({"row": item["row_number"], "errors": [f"Student '{adm_no}' not found"]})
                    continue

                ay_name = (data.get("academic_year_name") or "").strip().lower()
                ay_id = ay_map.get(ay_name, default_ay_id)
                amt = Decimal(str(data["amount"]))
                p_date = parse_date_value(data["payment_date"]) or date.today()
                ref = data["transaction_reference"].strip()

                if action == "update":
                    pay = (await db.execute(select(Payment).where(Payment.transaction_reference == ref))).scalar_one_or_none()
                    if pay:
                        pay.amount = amt
                        pay.payment_date = p_date
                        pay.payment_method = data.get("payment_method") or "bank_transfer"
                        pay.notes = data.get("notes")
                        updated_count += 1
                else:
                    new_payment = Payment(
                        student_id=st_id,
                        academic_year_id=ay_id,
                        amount=amt,
                        payment_date=p_date,
                        payment_method=data.get("payment_method") or "bank_transfer",
                        transaction_reference=ref,
                        notes=data.get("notes"),
                        status="completed",
                    )
                    db.add(new_payment)
                    await db.flush()

                    # Create corresponding receipt
                    rcpt = PaymentReceipt(
                        receipt_number=f"RCP-{date.today().year}-{ref[-6:]}",
                        payment_id=new_payment.id,
                        student_id=st_id,
                        amount=amt,
                        payment_date=p_date,
                        payment_method=new_payment.payment_method,
                    )
                    db.add(rcpt)
                    successful_count += 1

            # ── 6. Attendance ──
            elif entity_type == "attendance":
                adm_no = data["student_admission_number"].strip().upper()
                st_id = student_map.get(adm_no)
                att_date = parse_date_value(data["date"]) or date.today()
                status_val = data["status"].lower()
                std_name = (data.get("standard_name") or "").strip().lower()
                s_id = standard_map.get(std_name) or list(standard_map.values())[0]
                b_code = (data.get("batch_code") or "").strip().upper()
                d_id = batch_map.get(b_code)

                existing_att = (await db.execute(
                    select(Attendance).where(Attendance.student_id == st_id, Attendance.date == att_date)
                )).scalar_one_or_none()

                if existing_att and action == "update":
                    existing_att.status = status_val
                    existing_att.remarks = data.get("remarks")
                    updated_count += 1
                else:
                    new_att = Attendance(
                        student_id=st_id,
                        standard_id=s_id,
                        division_id=d_id,
                        date=att_date,
                        status=status_val,
                        remarks=data.get("remarks"),
                    )
                    db.add(new_att)
                    successful_count += 1

        # Record import log in data_import_logs table
        overall_status = "completed" if failed_count == 0 else ("partial" if (successful_count + updated_count) > 0 else "failed")
        import_log = DataImportLog(
            institution_id=institution_id,
            academic_year_id=default_ay_id,
            entity_type=entity_type,
            import_mode=mode,
            source_type=source_type,
            file_name=file_name or ("Pasted Grid" if source_type == "paste_grid" else "Direct Import"),
            total_rows=len(validated_rows),
            successful_rows=successful_count + updated_count,
            failed_rows=failed_count,
            status=overall_status,
            error_summary=json.dumps(error_list) if error_list else None,
            reconciliation_data=json.dumps({
                "created": successful_count,
                "updated": updated_count,
                "skipped": skipped_count,
                "failed": failed_count,
            }),
            imported_by_id=user_id,
        )
        db.add(import_log)

        # Audit log entry
        audit = AuditLog(
            user_id=user_id,
            action="import",
            resource_type=entity_type,
            resource_id=0,
            new_data=f"Imported {entity_type} via {source_type}: {successful_count} created, {updated_count} updated, {skipped_count} skipped, {failed_count} failed",
        )
        db.add(audit)

        await db.commit()
        await db.refresh(import_log)

        return {
            "success": True,
            "import_id": import_log.id,
            "entity_type": entity_type,
            "total_rows": len(validated_rows),
            "created_count": successful_count,
            "updated_count": updated_count,
            "skipped_count": skipped_count,
            "failed_count": failed_count,
            "status": overall_status,
            "errors": error_list,
        }

    except Exception as exc:
        await db.rollback()
        raise exc

