# /**
#  * @file        navigation_service.py
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
#  * @created     2026-11-10
#  * @updated     2026-11-12
#  *
#  * @description Domain service for user-defined menus, role-based navigation defaults, usage telemetry, and intelligent recommendations.
#  */

import json
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, delete

from app.models.navigation import UserNavigationPreference, UserNavigationActivity
from app.models.settings import InstitutionSetting
from app.models.user import User

# Canonical Module Registry (SSOT)
# Maps all application modules and sub-items to their authorized scopes
CANONICAL_MODULES: List[Dict[str, Any]] = [
    {
        "id": "dashboard",
        "label": "Dashboard",
        "category": "core",
        "default_path": "/dashboard",
        "icon": "LayoutDashboard",
        "required_permission": None,
        "sysadmin_only": False,
        "sub_items": [],
    },
    {
        "id": "academic",
        "label": "Academic Structure",
        "category": "academic",
        "default_path": "/academic",
        "icon": "GraduationCap",
        "required_permission": None,
        "sysadmin_only": False,
        "sub_items": [
            {"id": "academic_structure", "label": "Structure & Batches", "to": "/academic"},
            {"id": "academic_boards", "label": "Boards", "to": "/academic/boards"},
            {"id": "academic_classes", "label": "Classes & Standards", "to": "/academic/classes"},
            {"id": "academic_subjects", "label": "Subjects", "to": "/academic/subjects"},
            {"id": "academic_batches", "label": "Batches", "to": "/academic/batches"},
            {"id": "academic_timetable", "label": "Timetable", "to": "/academic/timetable"},
            {"id": "academic_enrollment", "label": "Enrollment", "to": "/academic/enrollment"},
            {"id": "academic_reports", "label": "Academic Reports", "to": "/academic/reports"},
            {"id": "academic_settings", "label": "Academic Settings", "to": "/academic/settings"},
        ],
    },
    {
        "id": "crm",
        "label": "Admissions & CRM",
        "category": "students",
        "default_path": "/leads",
        "icon": "UserPlus",
        "required_permission": None,
        "sysadmin_only": False,
        "sub_items": [
            {"id": "crm_overview", "label": "Overview", "to": "/leads"},
            {"id": "crm_all", "label": "All Leads", "to": "/leads/all"},
            {"id": "crm_pipeline", "label": "Lead Pipeline", "to": "/leads/pipeline"},
            {"id": "crm_followups", "label": "Follow-ups", "to": "/leads/follow-ups"},
            {"id": "crm_counselling", "label": "Counselling & Demo", "to": "/leads/counselling"},
            {"id": "crm_sources", "label": "Lead Sources", "to": "/leads/sources"},
            {"id": "crm_campaigns", "label": "Campaigns", "to": "/leads/campaigns"},
            {"id": "crm_reports", "label": "CRM Reports", "to": "/leads/reports"},
            {"id": "crm_settings", "label": "CRM Settings", "to": "/leads/settings"},
        ],
    },
    {
        "id": "students",
        "label": "Students",
        "category": "students",
        "default_path": "/students",
        "icon": "Users",
        "required_permission": None,
        "sysadmin_only": False,
        "sub_items": [
            {"id": "students_overview", "label": "Overview", "to": "/students/overview"},
            {"id": "students_directory", "label": "Master Directory", "to": "/students/directory"},
            {"id": "students_admission", "label": "Admissions", "to": "/students/admission"},
            {"id": "students_allocations", "label": "Batch Allocations", "to": "/students/allocations"},
            {"id": "students_idcards", "label": "ID Cards & Badges", "to": "/students/id-cards"},
            {"id": "students_history", "label": "Activity History", "to": "/students/history"},
            {"id": "students_reactivation", "label": "Reactivations", "to": "/students/reactivation"},
            {"id": "students_settings", "label": "Settings & Policies", "to": "/students/settings"},
        ],
    },
    {
        "id": "fees",
        "label": "Fees & Payments",
        "category": "finance",
        "default_path": "/fees",
        "icon": "CreditCard",
        "required_permission": None,
        "sysadmin_only": False,
        "sub_items": [
            {"id": "fees_overview", "label": "Overview", "to": "/fees/overview"},
            {"id": "fees_structures", "label": "Fee Structures", "to": "/fees/structures"},
            {"id": "fees_invoicing", "label": "Fee Invoicing", "to": "/fees/invoicing"},
            {"id": "fees_collection", "label": "Collection Desk", "to": "/fees/collection"},
            {"id": "fees_defaulters", "label": "Defaulters & Dues", "to": "/fees/defaulters"},
            {"id": "fees_concessions", "label": "Concessions & Waivers", "to": "/fees/concessions"},
            {"id": "fees_online_gateway", "label": "Online Gateway", "to": "/fees/online-gateway"},
            {"id": "fees_reports", "label": "Financial Daybook", "to": "/fees/reports"},
        ],
    },
    {
        "id": "teachers",
        "label": "Teachers",
        "category": "workforce",
        "default_path": "/teachers",
        "icon": "GraduationCap",
        "required_permission": None,
        "sysadmin_only": False,
        "sub_items": [
            {"id": "teachers_overview", "label": "Overview", "to": "/teachers/overview"},
            {"id": "teachers_directory", "label": "Faculty Directory", "to": "/teachers/directory"},
            {"id": "teachers_allocations", "label": "Batch Allocations", "to": "/teachers/allocations"},
            {"id": "teachers_timetable", "label": "Teaching Schedules", "to": "/teachers/timetable"},
            {"id": "teachers_attendance", "label": "Presence & Leaves", "to": "/teachers/attendance"},
            {"id": "teachers_payroll", "label": "Salary & Payroll", "to": "/teachers/payroll"},
            {"id": "teachers_performance", "label": "Teaching Sessions", "to": "/teachers/performance"},
            {"id": "teachers_settings", "label": "Policies & Settings", "to": "/teachers/settings"},
        ],
    },
    {
        "id": "staff",
        "label": "Staff Directory",
        "category": "workforce",
        "default_path": "/staff",
        "icon": "Briefcase",
        "required_permission": None,
        "sysadmin_only": False,
        "sub_items": [
            {"id": "staff_overview", "label": "Overview", "to": "/staff/overview"},
            {"id": "staff_directory", "label": "Staff Register", "to": "/staff/directory"},
            {"id": "staff_onboarding", "label": "New Onboarding", "to": "/staff/onboarding"},
            {"id": "staff_duties", "label": "Roles & Duties", "to": "/staff/duties"},
            {"id": "staff_attendance", "label": "Staff Presence", "to": "/staff/attendance"},
            {"id": "staff_leaves", "label": "Leave Requests", "to": "/staff/leaves"},
            {"id": "staff_documents", "label": "HR Documents Studio", "to": "/staff/documents"},
            {"id": "staff_settings", "label": "HR Policies", "to": "/staff/settings"},
        ],
    },
    {
        "id": "teacher_payroll",
        "label": "Teacher Payroll",
        "category": "finance",
        "default_path": "/teacher-payroll",
        "icon": "DollarSign",
        "required_permission": None,
        "sysadmin_only": False,
        "sub_items": [],
    },
    {
        "id": "attendance",
        "label": "Attendance",
        "category": "operations",
        "default_path": "/attendance",
        "icon": "ClipboardList",
        "required_permission": None,
        "sysadmin_only": False,
        "sub_items": [
            {"id": "attendance_overview", "label": "Overview", "to": "/attendance/overview"},
            {"id": "attendance_daily", "label": "Daily Roll Call", "to": "/attendance/daily"},
            {"id": "attendance_qr", "label": "QR Terminal", "to": "/attendance/qr-terminal"},
            {"id": "attendance_register", "label": "Monthly Register", "to": "/attendance/register"},
            {"id": "attendance_absenteeism", "label": "Defaulters & Alerts", "to": "/attendance/absenteeism"},
            {"id": "attendance_leaves", "label": "Leave Requests", "to": "/attendance/leaves"},
            {"id": "attendance_reports", "label": "Reports & Analytics", "to": "/attendance/reports"},
            {"id": "attendance_settings", "label": "Settings & Policies", "to": "/attendance/settings"},
        ],
    },
    {
        "id": "examinations",
        "label": "Tests & Results",
        "category": "academic",
        "default_path": "/examinations",
        "icon": "Award",
        "required_permission": None,
        "sysadmin_only": False,
        "sub_items": [
            {"id": "exam_overview", "label": "Overview", "to": "/examinations/overview"},
            {"id": "exam_schedules", "label": "Exam Schedules", "to": "/examinations/schedules"},
            {"id": "exam_marks", "label": "Marks Entry", "to": "/examinations/marks-entry"},
            {"id": "exam_analytics", "label": "Performance Analytics", "to": "/examinations/analytics"},
            {"id": "exam_report_cards", "label": "Report Cards", "to": "/examinations/report-cards"},
            {"id": "exam_papers", "label": "Question Papers", "to": "/examinations/papers"},
            {"id": "exam_settings", "label": "Settings & Grading", "to": "/examinations/settings"},
        ],
    },
    {
        "id": "homework",
        "label": "Homework & Assignments",
        "category": "academic",
        "default_path": "/homework",
        "icon": "FileCheck",
        "required_permission": None,
        "sysadmin_only": False,
        "sub_items": [
            {"id": "homework_overview", "label": "Overview & List", "to": "/homework"},
            {"id": "homework_create", "label": "Assign Homework", "to": "/homework/create"},
            {"id": "homework_checking", "label": "Checking Register", "to": "/homework/checking"},
            {"id": "homework_submissions", "label": "Digital Submissions", "to": "/homework/submissions"},
            {"id": "homework_templates", "label": "Homework Templates", "to": "/homework/templates"},
            {"id": "homework_reports", "label": "Daily Register Report", "to": "/homework/reports"},
        ],
    },
    {
        "id": "courses",
        "label": "Study Materials",
        "category": "learning",
        "default_path": "/courses",
        "icon": "BookOpen",
        "required_permission": None,
        "sysadmin_only": False,
        "sub_items": [
            {"id": "courses_overview", "label": "Materials Overview", "to": "/courses/overview"},
            {"id": "courses_repository", "label": "Master Library", "to": "/courses/repository"},
            {"id": "courses_upload", "label": "Upload Content", "to": "/courses/upload"},
            {"id": "courses_notes", "label": "Chapter Notes", "to": "/courses/notes"},
            {"id": "courses_question_banks", "label": "Question Banks", "to": "/courses/question-banks"},
            {"id": "courses_video_lectures", "label": "Video Lectures", "to": "/courses/video-lectures"},
            {"id": "courses_syllabi", "label": "Curriculum Syllabi", "to": "/courses/syllabi"},
            {"id": "courses_settings", "label": "Storage Policies", "to": "/courses/settings"},
        ],
    },
    {
        "id": "reports",
        "label": "Reports",
        "category": "core",
        "default_path": "/reports",
        "icon": "BarChart2",
        "required_permission": None,
        "sysadmin_only": False,
        "sub_items": [],
    },
    {
        "id": "forms",
        "label": "Print Forms & KYC",
        "category": "operations",
        "default_path": "/forms",
        "icon": "Printer",
        "required_permission": None,
        "sysadmin_only": False,
        "sub_items": [
            {"id": "forms_overview", "label": "Overview", "to": "/forms/overview"},
            {"id": "forms_admissions", "label": "Admission Forms", "to": "/forms/admissions"},
            {"id": "forms_idcards", "label": "Student & Staff IDs", "to": "/forms/id-cards"},
            {"id": "forms_financial", "label": "Receipts & Notices", "to": "/forms/financial"},
            {"id": "forms_academic", "label": "Hall Tickets & Transcripts", "to": "/forms/academic"},
            {"id": "forms_certificates", "label": "Leaving & Experience Certs", "to": "/forms/certificates"},
            {"id": "forms_bulk_print", "label": "Bulk Print Spooler", "to": "/forms/bulk-print"},
            {"id": "forms_audit_logs", "label": "Print Audit Trail", "to": "/forms/audit-logs"},
        ],
    },
    {
        "id": "communication",
        "label": "Communication Center",
        "category": "operations",
        "default_path": "/communication",
        "icon": "MessageSquare",
        "required_permission": None,
        "sysadmin_only": False,
        "sub_items": [
            {"id": "comm_overview", "label": "Overview", "to": "/communication/overview"},
            {"id": "comm_broadcasts", "label": "Broadcast Composer", "to": "/communication/broadcasts"},
            {"id": "comm_whatsapp", "label": "WhatsApp Stream", "to": "/communication/whatsapp"},
            {"id": "comm_templates", "label": "Message Templates", "to": "/communication/templates"},
            {"id": "comm_history", "label": "Dispatch Logs", "to": "/communication/history"},
            {"id": "comm_automations", "label": "Reminder Queues", "to": "/communication/automations"},
            {"id": "comm_gateways", "label": "Gateway Diagnostics", "to": "/communication/gateways"},
            {"id": "comm_settings", "label": "Channel Settings", "to": "/communication/settings"},
        ],
    },
    {
        "id": "import_export",
        "label": "Import & Export",
        "category": "tools",
        "default_path": "/import-export",
        "icon": "FileSpreadsheet",
        "required_permission": None,
        "sysadmin_only": False,
        "sub_items": [],
    },
    {
        "id": "users",
        "label": "Users & Roles",
        "category": "admin",
        "default_path": "/users",
        "icon": "Shield",
        "required_permission": "users:view",
        "sysadmin_only": False,
        "sub_items": [],
    },
    {
        "id": "releases",
        "label": "Releases & Changes",
        "category": "admin",
        "default_path": "/releases",
        "icon": "GitBranch",
        "required_permission": None,
        "sysadmin_only": False,
        "sub_items": [],
    },
    {
        "id": "training",
        "label": "Training & Demo Lab",
        "category": "admin",
        "default_path": "/training",
        "icon": "FlaskConical",
        "required_permission": None,
        "sysadmin_only": False,
        "sub_items": [],
    },
    {
        "id": "settings",
        "label": "Settings",
        "category": "admin",
        "default_path": "/settings",
        "icon": "Settings",
        "required_permission": None,
        "sysadmin_only": False,
        "sub_items": [],
    },
    {
        "id": "housekeeping",
        "label": "Housekeeping",
        "category": "admin",
        "default_path": "/housekeeping",
        "icon": "HardDrive",
        "required_permission": "system:housekeeping",
        "sysadmin_only": False,
        "sub_items": [
            {"id": "housekeeping_overview", "label": "Overview & Health", "to": "/housekeeping"},
            {"id": "housekeeping_backups", "label": "Database Backups", "to": "/housekeeping/backups"},
            {"id": "housekeeping_restore", "label": "Restore & Drill", "to": "/housekeeping/restore"},
            {"id": "housekeeping_maintenance", "label": "Maintenance & Vacuum", "to": "/housekeeping/maintenance"},
            {"id": "housekeeping_schedules", "label": "Schedules & CLI", "to": "/housekeeping/schedules"},
        ],
    },
    {
        "id": "help",
        "label": "Help & About Centre",
        "category": "general",
        "default_path": "/help",
        "icon": "HelpCircle",
        "required_permission": None,
        "sysadmin_only": False,
        "sub_items": [
            {"id": "help_getting_started", "label": "Getting Started", "path": "/help?section=getting_started"},
            {"id": "help_guides", "label": "Module Guides", "path": "/help?section=module_guide"},
            {"id": "help_tutorials", "label": "Tutorials & Workflows", "path": "/help?section=tutorial"},
            {"id": "help_faq", "label": "FAQ & Troubleshooting", "path": "/help?section=faq"},
            {"id": "help_support", "label": "Support Centre", "path": "/help/support"},
            {"id": "help_about_product", "label": "About PrathamOne EduOS", "path": "/help/about-product"},
            {"id": "help_about_company", "label": "About SMRITI Systems", "path": "/help/about-company"},
            {"id": "help_version", "label": "Product & Version Info", "path": "/help/version"},
            {"id": "help_legal", "label": "Legal & Compliance", "path": "/help/legal"},
            {"id": "help_system_info", "label": "System Information", "path": "/help/system-info"},
        ],
    },
    {
        "id": "sysadmin",
        "label": "SysAdmin Center",
        "category": "admin",
        "default_path": "/sysadmin",
        "icon": "Terminal",
        "required_permission": None,
        "sysadmin_only": True,
        "sub_items": [],
    },
]

# Baseline Role-Based Navigation Defaults (SSOT)
ROLE_DEFAULT_MENUS: Dict[str, List[str]] = {
    "sysadmin": [
        "dashboard", "academic", "homework", "crm", "students", "fees", "attendance",
        "examinations", "teachers", "staff", "reports", "users", "settings", "housekeeping", "help", "sysadmin"
    ],
    "admin": [
        "dashboard", "fees", "students", "crm", "academic", "homework", "teachers",
        "attendance", "reports", "forms", "users", "settings", "housekeeping", "help"
    ],
    "principal": [
        "dashboard", "fees", "students", "teachers", "academic", "homework",
        "attendance", "examinations", "reports", "settings", "help"
    ],
    "accountant": [
        "dashboard", "fees", "fees_collection", "fees_invoicing",
        "fees_defaulters", "fees_reports", "reports", "help"
    ],
    "teacher": [
        "dashboard", "students", "homework", "attendance", "attendance_daily",
        "examinations", "exam_marks", "courses", "reports", "help"
    ],
    "counselor": [
        "dashboard", "crm", "crm_pipeline", "crm_followups",
        "students", "students_admission", "reports", "help"
    ],
    "staff": [
        "dashboard", "students", "attendance", "forms", "communication", "help"
    ],
}

DEFAULT_NAVIGATION_POLICY: Dict[str, Any] = {
    "enable_user_customization": True,
    "default_navigation_mode": "standard",  # standard | hybrid | my_menu_only
    "allow_my_menu_only": True,
    "allow_reordering": True,
    "allow_hiding": True,
    "enable_usage_recommendations": True,
    "usage_analysis_period_days": 30,
    "role_default_menus": ROLE_DEFAULT_MENUS,
}


class NavigationService:
    @staticmethod
    def is_user_sysadmin(user: User) -> bool:
        r = (user.role or "").lower()
        return r in ("sysadmin", "superadmin", "super_admin")

    @classmethod
    def get_authorized_modules_for_user(cls, user: User) -> List[Dict[str, Any]]:
        is_sys = cls.is_user_sysadmin(user)
        user_role = (user.role or "staff").lower()
        perms = getattr(user, "permissions", None) or []

        authorized = []
        for mod in CANONICAL_MODULES:
            if mod["sysadmin_only"] and not is_sys:
                continue

            req_perm = mod["required_permission"]
            if req_perm and not is_sys and user_role not in ("admin", "principal"):
                if req_perm not in perms and "*:*" not in perms:
                    continue

            # Sub-items filtering
            sub_items = []
            for sub in mod.get("sub_items", []):
                sub_items.append(sub)

            mod_copy = dict(mod)
            mod_copy["sub_items"] = sub_items
            authorized.append(mod_copy)

        return authorized

    @classmethod
    async def get_institution_policy(cls, db: AsyncSession, institution_id: int) -> Dict[str, Any]:
        stmt = select(InstitutionSetting).where(
            InstitutionSetting.institution_id == institution_id,
            InstitutionSetting.category == "navigation",
        )
        res = await db.execute(stmt)
        rows = res.scalars().all()
        stored = {}
        for r in rows:
            val = r.value
            if r.data_type == "boolean":
                val = val.lower() in ("true", "1") if val else False
            elif r.data_type == "number":
                try:
                    val = int(val)
                except Exception:
                    pass
            elif r.data_type == "json" and val:
                try:
                    val = json.loads(val)
                except Exception:
                    pass
            stored[r.key] = val

        return {**DEFAULT_NAVIGATION_POLICY, **stored}

    @classmethod
    async def get_user_navigation_config(
        cls, db: AsyncSession, user: User, institution_id: int
    ) -> Dict[str, Any]:
        policy = await cls.get_institution_policy(db, institution_id)
        user_role = (user.role or "staff").lower()
        role_defaults = policy.get("role_default_menus", {}).get(
            user_role, ROLE_DEFAULT_MENUS.get(user_role, ["dashboard"])
        )

        # Fetch stored user preference
        stmt = select(UserNavigationPreference).where(
            UserNavigationPreference.user_id == user.id,
            UserNavigationPreference.institution_id == institution_id,
        )
        pref = (await db.execute(stmt)).scalar_one_or_none()

        auth_modules = cls.get_authorized_modules_for_user(user)
        auth_module_keys = {m["id"] for m in auth_modules}
        # Build set of valid sub-item keys
        for m in auth_modules:
            for s in m.get("sub_items", []):
                auth_module_keys.add(s["id"])

        if pref:
            stored_mode = pref.navigation_mode or "standard"
            try:
                pinned_items = json.loads(pref.pinned_items or "[]")
            except Exception:
                pinned_items = []
            try:
                hidden_items = json.loads(pref.hidden_items or "[]")
            except Exception:
                hidden_items = []
            try:
                custom_groups = json.loads(pref.custom_groups or "[]")
            except Exception:
                custom_groups = []
            try:
                item_order = json.loads(pref.item_order or "[]")
            except Exception:
                item_order = []
            try:
                dismissed_suggestions = json.loads(pref.dismissed_suggestions or "[]")
            except Exception:
                dismissed_suggestions = []
        else:
            stored_mode = policy.get("default_navigation_mode", "standard")
            pinned_items = list(role_defaults)
            hidden_items = []
            custom_groups = []
            item_order = []
            dismissed_suggestions = []

        # Enforce institution security and policy overrides
        if not policy.get("enable_user_customization", True):
            stored_mode = policy.get("default_navigation_mode", "standard")
            pinned_items = list(role_defaults)
            hidden_items = []

        if stored_mode == "my_menu_only" and not policy.get("allow_my_menu_only", True):
            stored_mode = "hybrid"

        if not policy.get("allow_hiding", True):
            hidden_items = []

        # Sanitize pinned items and hidden items against current authorized permissions
        effective_pinned = [k for k in pinned_items if k in auth_module_keys]
        effective_hidden = [k for k in hidden_items if k in auth_module_keys]

        # Sanitize custom groups
        effective_groups = []
        for g in custom_groups:
            valid_g_items = [it for it in g.get("items", []) if it in auth_module_keys]
            effective_groups.append({
                "id": g.get("id"),
                "name": g.get("name"),
                "items": valid_g_items,
            })

        return {
            "institution_policy": policy,
            "effective_mode": stored_mode,
            "user_preferences": {
                "navigation_mode": stored_mode,
                "pinned_items": effective_pinned,
                "hidden_items": effective_hidden,
                "custom_groups": effective_groups,
                "item_order": item_order,
                "dismissed_suggestions": dismissed_suggestions,
                "is_customized": pref is not None,
                "updated_at": pref.updated_at.isoformat() if pref else None,
            },
            "role_defaults": role_defaults,
            "authorized_modules": auth_modules,
        }

    @classmethod
    async def save_user_preferences(
        cls,
        db: AsyncSession,
        user: User,
        institution_id: int,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        policy = await cls.get_institution_policy(db, institution_id)
        if not policy.get("enable_user_customization", True):
            raise ValueError("Institute administrator has disabled user menu personalization.")

        nav_mode = payload.get("navigation_mode", "standard")
        if nav_mode == "my_menu_only" and not policy.get("allow_my_menu_only", True):
            nav_mode = "hybrid"

        auth_modules = cls.get_authorized_modules_for_user(user)
        auth_module_keys = {m["id"] for m in auth_modules}
        for m in auth_modules:
            for s in m.get("sub_items", []):
                auth_module_keys.add(s["id"])

        # Sanitize items
        raw_pinned = payload.get("pinned_items", [])
        raw_hidden = payload.get("hidden_items", [])
        raw_groups = payload.get("custom_groups", [])
        raw_order = payload.get("item_order", [])

        clean_pinned = [k for k in raw_pinned if k in auth_module_keys]
        clean_hidden = [k for k in raw_hidden if k in auth_module_keys] if policy.get("allow_hiding", True) else []
        clean_groups = []
        for g in raw_groups:
            if isinstance(g, dict) and g.get("name"):
                items = [it for it in g.get("items", []) if it in auth_module_keys]
                clean_groups.append({
                    "id": g.get("id") or f"grp_{len(clean_groups)+1}",
                    "name": str(g.get("name")).strip(),
                    "items": items,
                })

        stmt = select(UserNavigationPreference).where(
            UserNavigationPreference.user_id == user.id,
            UserNavigationPreference.institution_id == institution_id,
        )
        pref = (await db.execute(stmt)).scalar_one_or_none()

        if pref:
            pref.navigation_mode = nav_mode
            pref.pinned_items = json.dumps(clean_pinned)
            pref.hidden_items = json.dumps(clean_hidden)
            pref.custom_groups = json.dumps(clean_groups)
            pref.item_order = json.dumps(raw_order)
        else:
            pref = UserNavigationPreference(
                user_id=user.id,
                institution_id=institution_id,
                navigation_mode=nav_mode,
                pinned_items=json.dumps(clean_pinned),
                hidden_items=json.dumps(clean_hidden),
                custom_groups=json.dumps(clean_groups),
                item_order=json.dumps(raw_order),
                dismissed_suggestions="[]",
            )
            db.add(pref)

        await db.commit()
        await db.refresh(pref)
        return await cls.get_user_navigation_config(db, user, institution_id)

    @classmethod
    async def reset_user_preferences(
        cls, db: AsyncSession, user: User, institution_id: int
    ) -> Dict[str, Any]:
        stmt = delete(UserNavigationPreference).where(
            UserNavigationPreference.user_id == user.id,
            UserNavigationPreference.institution_id == institution_id,
        )
        await db.execute(stmt)
        await db.commit()
        return await cls.get_user_navigation_config(db, user, institution_id)

    @classmethod
    async def track_activity(
        cls,
        db: AsyncSession,
        user: User,
        institution_id: int,
        module_key: str,
        route_path: str,
        label: Optional[str] = None,
    ) -> bool:
        # Debounce: check if user accessed same module in last 60 seconds
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=60)
        recent_check = select(UserNavigationActivity.id).where(
            UserNavigationActivity.user_id == user.id,
            UserNavigationActivity.institution_id == institution_id,
            UserNavigationActivity.module_key == module_key,
            UserNavigationActivity.accessed_at >= cutoff,
        ).limit(1)
        res = await db.execute(recent_check)
        if res.scalar_one_or_none():
            return False  # Debounced

        activity = UserNavigationActivity(
            user_id=user.id,
            institution_id=institution_id,
            module_key=module_key,
            route_path=route_path,
            label=label or module_key.title(),
        )
        db.add(activity)
        await db.commit()
        return True

    @classmethod
    async def get_intelligent_suggestions(
        cls, db: AsyncSession, user: User, institution_id: int
    ) -> List[Dict[str, Any]]:
        config = await cls.get_user_navigation_config(db, user, institution_id)
        if not config["institution_policy"].get("enable_usage_recommendations", True):
            return []

        user_pref = config["user_preferences"]
        pinned_set = set(user_pref.get("pinned_items", []))
        hidden_set = set(user_pref.get("hidden_items", []))
        dismissed_set = set(user_pref.get("dismissed_suggestions", []))

        now = datetime.now(timezone.utc)
        d7 = now - timedelta(days=7)
        d30 = now - timedelta(days=30)

        # 7-day usage counts
        stmt7 = select(
            UserNavigationActivity.module_key,
            func.count(UserNavigationActivity.id).label("cnt_7d"),
            func.max(UserNavigationActivity.accessed_at).label("last_visit"),
        ).where(
            UserNavigationActivity.user_id == user.id,
            UserNavigationActivity.institution_id == institution_id,
            UserNavigationActivity.accessed_at >= d7,
        ).group_by(UserNavigationActivity.module_key)

        res7 = await db.execute(stmt7)
        rows7 = res7.all()

        auth_modules_map = {m["id"]: m for m in config["authorized_modules"]}
        suggestions = []

        # 1. Frequently Used (Visited >= 3 times in 7 days, not pinned)
        for r in rows7:
            m_key = r.module_key
            cnt = r.cnt_7d
            sug_id = f"sug_pin_{m_key}"
            if sug_id in dismissed_set:
                continue

            if m_key in auth_modules_map and m_key not in pinned_set and cnt >= 3:
                mod = auth_modules_map[m_key]
                suggestions.append({
                    "id": sug_id,
                    "type": "pin_frequent",
                    "badge": "Frequently Used",
                    "module_key": m_key,
                    "title": f"Pin '{mod['label']}' to My Menu",
                    "description": f"You visited {mod['label']} {cnt} times this week. Add it to your personal menu for 1-click access.",
                    "action_type": "pin",
                    "action_label": "Pin to Menu",
                    "route_path": mod["default_path"],
                })

        # 2. Recently Visited (Visited in last 48h, not pinned, max 2)
        d2 = now - timedelta(days=2)
        stmt_rec = select(
            UserNavigationActivity.module_key,
            UserNavigationActivity.route_path,
            UserNavigationActivity.label,
        ).where(
            UserNavigationActivity.user_id == user.id,
            UserNavigationActivity.institution_id == institution_id,
            UserNavigationActivity.accessed_at >= d2,
        ).order_by(desc(UserNavigationActivity.accessed_at)).limit(10)
        res_rec = await db.execute(stmt_rec)
        seen_rec = set()
        for row in res_rec.all():
            m_key = row.module_key
            sug_id = f"sug_rec_{m_key}"
            if sug_id in dismissed_set or m_key in pinned_set or m_key in seen_rec:
                continue
            if m_key in auth_modules_map:
                seen_rec.add(m_key)
                mod = auth_modules_map[m_key]
                suggestions.append({
                    "id": sug_id,
                    "type": "add_recent",
                    "badge": "Recently Used",
                    "module_key": m_key,
                    "title": f"Add '{mod['label']}' to Quick Shortcuts",
                    "description": f"You recently accessed {mod['label']}. Keep it handy in your personal navigation workspace.",
                    "action_type": "pin",
                    "action_label": "Add Shortcut",
                    "route_path": mod["default_path"],
                })
                if len(seen_rec) >= 2:
                    break

        # 3. Rarely Used (Pinned or default item, but 0 visits in 30 days)
        stmt30 = select(
            UserNavigationActivity.module_key
        ).where(
            UserNavigationActivity.user_id == user.id,
            UserNavigationActivity.institution_id == institution_id,
            UserNavigationActivity.accessed_at >= d30,
        ).distinct()
        res30 = await db.execute(stmt30)
        used30 = {r[0] for r in res30.all()}

        for p_item in pinned_set:
            if p_item in ("dashboard",):
                continue
            sug_id = f"sug_hide_{p_item}"
            if sug_id in dismissed_set:
                continue
            if p_item not in used30 and p_item in auth_modules_map:
                mod = auth_modules_map[p_item]
                suggestions.append({
                    "id": sug_id,
                    "type": "hide_rare",
                    "badge": "Rarely Used",
                    "module_key": p_item,
                    "title": f"Declutter: Unpin '{mod['label']}'",
                    "description": f"You haven't accessed {mod['label']} in over 30 days. Unpin it to keep your personal workspace focused.",
                    "action_type": "unpin",
                    "action_label": "Unpin Item",
                    "route_path": mod["default_path"],
                })

        return suggestions[:6]

    @classmethod
    async def dismiss_suggestion(
        cls, db: AsyncSession, user: User, institution_id: int, suggestion_id: str
    ) -> bool:
        stmt = select(UserNavigationPreference).where(
            UserNavigationPreference.user_id == user.id,
            UserNavigationPreference.institution_id == institution_id,
        )
        pref = (await db.execute(stmt)).scalar_one_or_none()
        if not pref:
            pref = UserNavigationPreference(
                user_id=user.id,
                institution_id=institution_id,
                navigation_mode="standard",
                dismissed_suggestions=json.dumps([suggestion_id]),
            )
            db.add(pref)
        else:
            try:
                dismissed = json.loads(pref.dismissed_suggestions or "[]")
            except Exception:
                dismissed = []
            if suggestion_id not in dismissed:
                dismissed.append(suggestion_id)
                pref.dismissed_suggestions = json.dumps(dismissed)

        await db.commit()
        return True

    @classmethod
    async def get_recent_visits(
        cls, db: AsyncSession, user: User, institution_id: int, limit: int = 8
    ) -> List[Dict[str, Any]]:
        stmt = select(
            UserNavigationActivity.module_key,
            UserNavigationActivity.route_path,
            UserNavigationActivity.label,
            func.max(UserNavigationActivity.accessed_at).label("last_accessed")
        ).where(
            UserNavigationActivity.user_id == user.id,
            UserNavigationActivity.institution_id == institution_id,
        ).group_by(
            UserNavigationActivity.module_key,
            UserNavigationActivity.route_path,
            UserNavigationActivity.label,
        ).order_by(desc("last_accessed")).limit(limit)

        res = await db.execute(stmt)
        items = []
        for r in res.all():
            items.append({
                "module_key": r.module_key,
                "route_path": r.route_path,
                "label": r.label or r.module_key.title(),
                "last_accessed": r.last_accessed.isoformat() if r.last_accessed else None,
            })
        return items
