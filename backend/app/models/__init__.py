# /**
#  * @file        __init__.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.models
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-03
#  * @updated     2026-11-05
#  *
#  * @description SQLAlchemy ORM models package exporting all database entity definitions.
#  */

from app.models.institution import Institution
from app.models.academic_year import AcademicYear
from app.models.board import Board
from app.models.user import User, Role, Permission, AuditLog
from app.models.standard import Standard
from app.models.division import Division
from app.models.student import Student, Guardian
from app.models.enrollment import StudentEnrollment
from app.models.subject import Subject
from app.models.fee import (
    FeeCategory, FeeStructure, StudentFeeAssignment,
    FeeInvoice, FeeInvoiceItem, FeeInstallment, Discount, Scholarship
)
from app.models.payment import Payment, PaymentAllocation, PaymentReceipt
from app.models.attendance import Attendance
from app.models.exam import Examination, ExamMark
from app.models.portal import (
    TimetableEntry, StudyMaterial, Announcement, StudentDocument
)
from app.models.import_log import FeeRegisterImport, DataImportLog
from app.models.staff import (
    StaffProfile, StaffDocument, TeacherAssignment,
    StaffAttendance, StaffLeave, StaffLeaveBalance, StaffGeneratedDocument
)
from app.models.settings import (
    InstitutionSetting, LookupItem, SettingAuditLog
)

__all__ = [
    "Institution",
    "AcademicYear",
    "Board",
    "User",
    "Role",
    "Permission",
    "AuditLog",
    "Standard",
    "Division",
    "Student",
    "Guardian",
    "StudentEnrollment",
    "Subject",
    "FeeCategory",
    "FeeStructure",
    "StudentFeeAssignment",
    "FeeInvoice",
    "FeeInvoiceItem",
    "FeeInstallment",
    "Discount",
    "Scholarship",
    "Payment",
    "PaymentAllocation",
    "PaymentReceipt",
    "Attendance",
    "Examination",
    "ExamMark",
    "TimetableEntry",
    "StudyMaterial",
    "Announcement",
    "StudentDocument",
    "FeeRegisterImport",
    "DataImportLog",
    "StaffProfile",
    "StaffDocument",
    "TeacherAssignment",
    "StaffAttendance",
    "StaffLeave",
    "StaffLeaveBalance",
    "StaffGeneratedDocument",
    "InstitutionSetting",
    "LookupItem",
    "SettingAuditLog",
]



