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
#  * @updated     2026-11-11
#  *
#  * @description SQLAlchemy ORM models package exporting all database entity definitions.
#  */

from app.models.institution import Institution
from app.models.academic_year import AcademicYear
from app.models.board import Board
from app.models.user import User, Role, Permission, AuditLog
from app.models.standard import Standard
from app.models.division import Division
from app.models.student import Student, Guardian, StudentLifecycleLog
from app.models.enrollment import StudentEnrollment
from app.models.subject import Subject, CanonicalSubject, SubjectMapping, SubjectLegacyMapping
from app.models.fee import (
    FeeCategory, FeeStructure, StudentFeeAssignment,
    FeeInvoice, FeeInvoiceItem,
    FeeConcessionType, StudentConcessionApplication, FeeConcessionAllocation
)
from app.models.payment import Payment, PaymentAllocation, PaymentReceipt, Refund
from app.models.attendance import Attendance
from app.models.exam import Examination, ExamMark
from app.models.portal import (
    TimetableEntry, StudyMaterial, Announcement, StudentDocument
)
from app.models.import_log import FeeRegisterImport, DataImportLog
from app.models.staff import (
    StaffProfile, StaffDocument, TeacherAssignment,
    StaffAttendance, StaffLeave, StaffLeaveBalance, StaffGeneratedDocument,
    StaffBankAccount, StaffKeyContact
)
from app.models.settings import (
    InstitutionSetting, LookupItem, SettingAuditLog
)
from app.models.release import SystemRelease
from app.models.communication import (
    MessageTemplate, CommunicationLog, SharedDocumentToken
)
from app.models.teacher_payroll import (
    TeacherPaymentProfile, TeacherRateHistory, TeacherContractMilestone,
    TeachingSession, TeacherPayroll, TeacherPaymentVoucher
)
from app.models.codex import (
    CodexConfig, CodexMappingProfile, CodexMappingVersion,
    CodexScopeAssignment, CodexAuditLog, CodexTemporaryToken
)
from app.models.crm import (
    Lead, LeadFollowUp, LeadDemoClass
)
from app.models.training import (
    TrainingEnvironmentConfig, TrainingSession, TrainingResetLog
)
from app.models.navigation import (
    UserNavigationPreference, UserNavigationActivity
)
from app.models.homework import (
    HomeworkAssignment, StudentHomeworkRecord, HomeworkAuditLog
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
    "StudentLifecycleLog",
    "StudentEnrollment",
    "Subject",
    "CanonicalSubject",
    "SubjectMapping",
    "SubjectLegacyMapping",
    "FeeCategory",
    "FeeStructure",
    "StudentFeeAssignment",
    "FeeInvoice",
    "FeeInvoiceItem",
    "FeeConcessionType",
    "StudentConcessionApplication",
    "FeeConcessionAllocation",
    "Payment",
    "PaymentAllocation",
    "PaymentReceipt",
    "Refund",
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
    "StaffBankAccount",
    "StaffKeyContact",
    "InstitutionSetting",
    "LookupItem",
    "SettingAuditLog",
    "MessageTemplate",
    "CommunicationLog",
    "SharedDocumentToken",
    "SystemRelease",
    "TeacherPaymentProfile",
    "TeacherRateHistory",
    "TeacherContractMilestone",
    "TeachingSession",
    "TeacherPayroll",
    "TeacherPaymentVoucher",
    "CodexConfig",
    "CodexMappingProfile",
    "CodexMappingVersion",
    "CodexScopeAssignment",
    "CodexAuditLog",
    "CodexTemporaryToken",
    "Lead",
    "LeadFollowUp",
    "LeadDemoClass",
    "TrainingEnvironmentConfig",
    "TrainingSession",
    "TrainingResetLog",
    "UserNavigationPreference",
    "UserNavigationActivity",
    "HomeworkAssignment",
    "StudentHomeworkRecord",
    "HomeworkAuditLog",
]



