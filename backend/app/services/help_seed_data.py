# /**
#  * @file        help_seed_data.py
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
#  * @created     2026-11-11
#  * @updated     2026-11-12
#  *
#  * @description Verified customer-facing seed catalog and content-exclusion guardrails for PrathamOne EduOS Help & About Centre.
#  */

import re
from typing import Dict, List, Any, Optional, Tuple


# Strict customer-safety patterns: reject internal developer references, GitHub URLs,
# commit hashes, internal file paths, and software installation instructions.
FORBIDDEN_CONTENT_PATTERNS: List[Tuple[str, str]] = [
    (r"\bgithub(?:\.com)?\b", "GitHub URLs or repository references are prohibited in customer-facing Help content."),
    (r"\bgit\s+(?:clone|commit|branch|checkout|push|pull|status|merge|rebase)\b", "Internal version-control commands are prohibited in customer-facing Help content."),
    (r"\bdocker(?:[\s-]+compose|file)?\b", "Container and server deployment setup references are prohibited."),
    (r"\b(?:pip|npm|yarn|pnpm)\s+install\b", "Developer package installation instructions are prohibited."),
    (r"\balembic\s+(?:upgrade|revision|current|downgrade|head)\b", "Database migration commands are prohibited."),
    (r"\b(?:uvicorn|pytest|vitest|pg_dump|psql)\b", "Internal server and developer CLI commands are prohibited."),
    (r"(?:backend/app/|frontend/src/)", "Internal source-code directory paths are prohibited."),
    (r"\b(?:manual\s+installation\s+guide|server\s+installation|developer\s+deployment\s+guide|installation\s+instructions)\b", "Installation and deployment setup guides are excluded from customer documentation."),
]


def validate_customer_safe_content(text: Optional[str]) -> List[str]:
    """Validates Help/About text against strict customer-safety exclusion rules."""
    if not text:
        return []
    violations: List[str] = []
    for pattern, reason in FORBIDDEN_CONTENT_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            if reason not in violations:
                violations.append(reason)
    return violations


def sanitize_release_text(text: Optional[str]) -> str:
    """Strips internal commit hashes and developer-only tags from release titles/notes."""
    if not text:
        return ""
    cleaned = re.sub(r"\(\s*\[?[0-9a-f]{6,12}\]?\s*\)", "", text, flags=re.IGNORECASE)
    cleaned = re.sub(r"\[[0-9a-f]{6,12}\]", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"(-REV-\d+-v[\d.]+)-[0-9a-f]{6,12}\b", r"\1", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()
    return cleaned


def sanitize_build_number(build_number: Optional[str]) -> str:
    """Removes trailing VCS commit hashes from customer-displayed build numbers."""
    if not build_number:
        return ""
    return re.sub(r"-[0-9a-f]{6,12}$", "", build_number.strip(), flags=re.IGNORECASE)


def sanitize_changelog_markdown(markdown_text: Optional[str]) -> str:
    """Filters release notes to remove commit IDs, internal paths, and developer/infrastructure lines."""
    if not markdown_text:
        return "Release notes are managed centrally and contain customer-safe capability updates."
    internal_line_re = re.compile(
        r"(?:github|git\s+|commit|alembic|docker|container|pytest|vitest|backend/|frontend/|"
        r"migration\b|tsconfig|package\.json|requirements\.txt|seed\.py|selectinload|"
        r"files modified|change metrics|sync build|sync manifest|visual capture|test suite|reindex)",
        re.IGNORECASE,
    )
    safe_lines: List[str] = []
    for raw_line in markdown_text.splitlines():
        line = sanitize_release_text(raw_line)
        if not line:
            if safe_lines and safe_lines[-1] != "":
                safe_lines.append("")
            continue
        if internal_line_re.search(line):
            continue
        safe_lines.append(line)
    # Remove trailing empty headings if all bullets under a heading were filtered out
    cleaned_lines: List[str] = []
    for idx, ln in enumerate(safe_lines):
        if ln.startswith("### "):
            # Keep heading only if a non-empty non-heading bullet follows
            has_content = any(
                nxt.strip() and not nxt.startswith("### ") and not nxt.startswith("# ")
                for nxt in safe_lines[idx + 1 : idx + 3]
            )
            if not has_content:
                continue
        cleaned_lines.append(ln)
    result = "\n".join(cleaned_lines).strip()
    return result or "Performance, reliability, and usability enhancements included in this release."


HELP_CATEGORIES: List[Dict[str, Any]] = [
    {
        "slug": "getting-started",
        "name": "Getting Started",
        "section": "getting_started",
        "description": "First-time login, institute profile configuration, academic structure setup, users, and permissions.",
        "icon": "Compass",
        "sort_order": 1,
    },
    {
        "slug": "module-guides",
        "name": "Module User Guides",
        "section": "module_guide",
        "description": "Complete module-by-module manuals covering operations, permissions, workflows, and troubleshooting.",
        "icon": "BookOpen",
        "sort_order": 2,
    },
    {
        "slug": "tutorials",
        "name": "Tutorials & Workflows",
        "section": "tutorial",
        "description": "Practical step-by-step operational guides across admissions, fees, attendance, timetable, and exams.",
        "icon": "PlayCircle",
        "sort_order": 3,
    },
    {
        "slug": "faq-troubleshooting",
        "name": "FAQ & Troubleshooting",
        "section": "faq",
        "description": "Categorized answers and step-by-step resolution guides for common operational questions.",
        "icon": "HelpCircle",
        "sort_order": 4,
    },
    {
        "slug": "legal-compliance",
        "name": "Legal & Compliance",
        "section": "legal",
        "description": "Terms, privacy, data protection, licensing, copyright, and acceptable use governance notices.",
        "icon": "Scale",
        "sort_order": 5,
    },
]


def _module_guide_markdown(
    title: str,
    intro: str,
    purpose: str,
    operations: List[str],
    steps: List[str],
    permissions: List[str],
    workflows: List[str],
    mistakes: List[str],
    troubleshooting: List[str],
) -> str:
    ops_md = "\n".join(f"- {item}" for item in operations)
    steps_md = "\n".join(f"{idx}. {item}" for idx, item in enumerate(steps, start=1))
    perms_md = "\n".join(f"- {item}" for item in permissions)
    wf_md = "\n".join(f"- {item}" for item in workflows)
    mistakes_md = "\n".join(f"- {item}" for item in mistakes)
    ts_md = "\n".join(f"- {item}" for item in troubleshooting)
    return f"""# {title}

## 1. Module Introduction
{intro}

## 2. Purpose and Functionality
{purpose}

## 3. Available Operations
{ops_md}

## 4. Step-by-Step Instructions
{steps_md}

## 5. Required Permissions
{perms_md}

## 6. Related Workflows
{wf_md}

## 7. Common Mistakes to Avoid
{mistakes_md}

## 8. Troubleshooting
{ts_md}"""


HELP_ARTICLES_SEED: List[Dict[str, Any]] = [
    # =========================================================================
    # A. GETTING STARTED (9 Topics)
    # =========================================================================
    {
        "slug": "welcome-to-prathamone-eduos",
        "category_slug": "getting-started",
        "section": "getting_started",
        "module_key": "dashboard",
        "title": "Welcome to PrathamOne EduOS",
        "summary": "Overview of PrathamOne EduOS (Coaching Institute Edition), core navigation, View-First Governance, and daily workspaces.",
        "tags": ["welcome", "overview", "getting started", "view mode", "navigation"],
        "required_permissions": ["Authenticated User"],
        "related_routes": ["/dashboard", "/help"],
        "related_slugs": ["understanding-the-dashboard", "first-time-login", "initial-operational-checklist"],
        "sort_order": 1,
        "content_markdown": """# Welcome to PrathamOne EduOS

PrathamOne EduOS (Coaching Institute Edition) is an integrated Education Operating System designed for coaching institutes and training academies. It brings academic administration, student admissions, fee accounting, concessions, scholarships, attendance, timetable management, examinations, staff operations, and institutional reporting into one unified workspace.

## Core Operating Principles
- **View-First Governance:** Every workspace opens in safe **View Mode** by default to prevent accidental edits or financial changes. Authorized users explicitly activate **Edit Mode** in the top banner when creating, updating, or deleting records.
- **Role-Based Workspaces:** Navigation menus and actions automatically adapt to your assigned role (SuperAdmin, Admin, Principal, Accountant, Teacher, Staff, Student, or Parent).
- **Single Source of Truth:** Student records, fee invoices, payment receipts, attendance logs, and examination marks share connected records across modules so information is entered once and reused reliably.

## Finding Your Way Around
- **Left Sidebar:** Switch cleanly between Dashboard, Students, Admissions, Academic, Attendance, Examinations, Fees & Payments, Teacher & Staff Portals, Communication, Reports, Administration, and Help & About Centre.
- **Top Search Command:** Search menus, student portals, and help topics rapidly from the top header bar.
- **Contextual Help:** Click the **Help** icon in the top bar or page header at any time to open the exact user guide for the screen you are currently using.
""",
    },
    {
        "slug": "understanding-the-dashboard",
        "category_slug": "getting-started",
        "section": "getting_started",
        "module_key": "dashboard",
        "title": "Understanding the Dashboard",
        "summary": "Learn how to use the multi-tab Executive Dashboard, academic filters, KPI cards, and quick navigation.",
        "tags": ["dashboard", "kpi", "filters", "command center"],
        "required_permissions": ["dashboard:view (Role-scoped access)"],
        "related_routes": ["/dashboard", "/"],
        "related_slugs": ["welcome-to-prathamone-eduos", "guide-dashboard"],
        "sort_order": 2,
        "content_markdown": """# Understanding the Dashboard

The PrathamOne EduOS Dashboard gives institute leaders and coordinators an instant operational snapshot across admissions, students, daily attendance, fee collections, examinations, and staff payroll.

## Key Dashboard Sections
- **Executive Overview:** Real-time student strength, collection totals, pending dues, and overall institute indicators.
- **Today's Command:** Daily classes scheduled, attendance completion progress, and pending operational follow-ups.
- **Attendance Command:** Batch-wise attendance trends and absentee monitoring.
- **Fee Ledger Watch:** Collections, overdue balances, concession impact, and recent receipt activity.
- **Exams & Performance:** Scheduled examinations, marks entry status, and pass percentage summaries.
- **Admission Funnel:** Lead inquiry pipeline from new enquiry to confirmed admission.
- **Staff & Payroll Snapshot:** Teaching staff strength, active assignments, and payroll cycle overview.

## Using Academic Filters
1. Use the top filter bar to narrow metrics by **Academic Year**, **Board**, **Standard**, or **Division**.
2. Switch **Student Status Scope** (Active vs. Exited/All) when reviewing historical batches.
3. Click any module KPI card or quick link to jump directly to the underlying workspace.
""",
    },
    {
        "slug": "first-time-login",
        "category_slug": "getting-started",
        "section": "getting_started",
        "module_key": "settings",
        "title": "First-Time Login & Password Security",
        "summary": "How staff, administrators, teachers, and students sign in for the first time and keep accounts secure.",
        "tags": ["login", "password", "sign in", "account", "security"],
        "required_permissions": ["Active User Account"],
        "related_routes": ["/login", "/dashboard"],
        "related_slugs": ["welcome-to-prathamone-eduos", "user-management-setup", "faq-login-account-access"],
        "sort_order": 3,
        "content_markdown": """# First-Time Login & Password Security

Before accessing PrathamOne EduOS, ensure your administrator has created your user account and provided your temporary credentials.

## Steps for Your First Sign-In
1. Open the PrathamOne EduOS application URL in a supported desktop or tablet browser.
2. Enter your assigned **Username** (or registered email) and **Password**.
3. Verify that the displayed **Institution Identity** matches your coaching institute.
4. Click **Sign In**. You will be taken directly to your role-appropriate home workspace (Dashboard for staff/administrators or Student Portal for students).

## Immediate Post-Login Security Practices
- **Change Temporary Passwords:** Update your temporary password immediately from your profile/account settings or request an administrator password reset.
- **Log Out on Shared Terminals:** Always sign out before leaving front-desk or lab computers unattended. Note that signing out or navigating resets any active **Edit Mode** session automatically.
- **Role Confidentiality:** Never share login credentials across staff members; every action on fees, concessions, marks, and student profiles is recorded in the institutional audit trail under the signed-in user ID.
""",
    },
    {
        "slug": "institution-profile-configuration",
        "category_slug": "getting-started",
        "section": "getting_started",
        "module_key": "settings",
        "title": "Institution Profile Configuration",
        "summary": "Configure your institute name, contact numbers, address, registration numbers, logo, and receipt branding.",
        "tags": ["institution", "profile", "branding", "logo", "settings"],
        "required_permissions": ["settings:manage", "Admin / SuperAdmin / Principal"],
        "related_routes": ["/settings"],
        "related_slugs": ["academic-year-configuration", "guide-settings"],
        "sort_order": 4,
        "content_markdown": """# Institution Profile Configuration

Accurate institution profile details appear on official fee receipts, printed report cards, student ID cards, and institutional communications.

## What You Can Configure
- **Institute Name & Code:** Official registered academy name and institutional short code.
- **Contact Information:** Official address, city, state, pincode, helpline phone numbers, email, and website.
- **Compliance Identifiers:** Registration number and tax identifier printed on formal fee receipts where enabled.
- **Visual Branding:** Institute logo, favicon, and primary accent colors used in printed slips and portals.

## Configuration Steps
1. Open **Administration -> Settings** from the sidebar.
2. Select the **Institute Profile** section.
3. Activate **Edit Mode** from the top governance bar.
4. Update the institution contact, registration, and branding fields.
5. Click **Save Changes** to persist updates cleanly and record an audit entry.

*Note: Institute identity always remains distinct from PrathamOne EduOS platform ownership and developer information.*
""",
    },
    {
        "slug": "academic-year-configuration",
        "category_slug": "getting-started",
        "section": "getting_started",
        "module_key": "timetable",
        "title": "Academic Year Configuration",
        "summary": "Create academic sessions, define start and end dates, and designate the current active academic year.",
        "tags": ["academic year", "session", "setup", "enrollment"],
        "required_permissions": ["academic:manage", "Admin / Principal"],
        "related_routes": ["/academic", "/settings"],
        "related_slugs": ["branch-class-and-division-setup", "initial-operational-checklist"],
        "sort_order": 5,
        "content_markdown": """# Academic Year Configuration

Every student enrollment, fee structure, timetable schedule, attendance register, and examination belongs to a defined **Academic Year** (for example, `2026-27`).

## Setting Up Academic Years
1. Navigate to **Academic Management** (`/academic`) from the sidebar.
2. Open the **Academic Years** tab.
3. Click **Edit Mode** in the governance bar to unlock creation and editing.
4. Add a new Academic Year with:
   - Session Name (e.g., `2026-27`)
   - Start Date and End Date
   - Active status toggle
5. Mark only the currently running operational session as **Current Year** so admissions, fee assignments, and attendance default automatically to the right session.

## Operational Rule
- Never delete an Academic Year that already holds student enrollments, fee invoices, or exam marks; mark completed sessions inactive while keeping historical records intact.
""",
    },
    {
        "slug": "branch-class-and-division-setup",
        "category_slug": "getting-started",
        "section": "getting_started",
        "module_key": "timetable",
        "title": "Branch, Class and Division Setup",
        "summary": "Configure boards, courses/standards, batches/divisions, subjects, and classroom capacities.",
        "tags": ["boards", "standards", "divisions", "batches", "subjects", "classes"],
        "required_permissions": ["academic:manage", "Admin / Principal"],
        "related_routes": ["/academic", "/courses"],
        "related_slugs": ["academic-year-configuration", "tutorial-student-enrollment"],
        "sort_order": 6,
        "content_markdown": """# Branch, Class and Division Setup

PrathamOne EduOS uses a clean canonical academic hierarchy so subjects and classes stay organized without duplicate records.

## Hierarchy Overview
1. **Boards / Streams:** Define academic boards or target streams (e.g., State Board, CBSE, ICSE, JEE/NEET Foundation).
2. **Standards / Classes:** Configure class levels or course cohorts linked to your institution.
3. **Divisions / Batches:** Create operational batches under each Standard (such as Batch A, Morning Batch, Weekend Batch) with room capacity limits.
4. **Canonical Subjects:** Register each subject once in the Canonical Subject Master and map it across relevant Boards and Standards rather than creating duplicate copies of the same subject name.

## Setup Steps
1. Open **Academic** (`/academic`) or **Courses & Batches** (`/courses`).
2. Activate **Edit Mode**.
3. Review existing Boards and Standards before adding new ones.
4. Create Divisions under each Standard and assign capacities and class teachers.
5. Map canonical subjects to Standards cleanly using the Curriculum / Subject Mapping section.
""",
    },
    {
        "slug": "user-management-setup",
        "category_slug": "getting-started",
        "section": "getting_started",
        "module_key": "settings",
        "title": "User Management",
        "summary": "Create staff, teacher, accountant, coordinator, and portal user accounts and manage account activation.",
        "tags": ["users", "accounts", "password reset", "staff accounts"],
        "required_permissions": ["users:view", "users:create", "users:edit", "Admin / SuperAdmin"],
        "related_routes": ["/users", "/staff", "/teachers"],
        "related_slugs": ["roles-and-permissions-guide", "first-time-login"],
        "sort_order": 7,
        "content_markdown": """# User Management

All teachers, accountants, coordinators, administrators, and portal users sign in through a single canonical identity in **Users & Roles** (`/users`).

## Creating a User Account
1. Open **Administration -> Users & Roles** from the sidebar.
2. Enable **Edit Mode**.
3. Click **Add User** and enter:
   - Full Name, Username, Email, and Contact Phone
   - Primary Role (Admin, Principal, Accountant, Teacher, Staff, Student)
   - Initial Password
4. Save the record.

## Account Maintenance
- **Deactivating Departed Staff:** Toggle the account status to **Inactive** instead of deleting users. Deactivation blocks sign-in immediately while preserving historical payment receipts, approval signatures, and audit trails.
- **Password Resets:** Authorized administrators can issue new temporary passwords directly from the user edit drawer.
""",
    },
    {
        "slug": "roles-and-permissions-guide",
        "category_slug": "getting-started",
        "section": "getting_started",
        "module_key": "settings",
        "title": "Roles and Permissions",
        "summary": "Understand built-in roles, granular permission modules, separation of duties, and System Administrator boundaries.",
        "tags": ["roles", "permissions", "rbac", "security", "access control"],
        "required_permissions": ["roles:manage", "Admin / SuperAdmin"],
        "related_routes": ["/users", "/settings"],
        "related_slugs": ["user-management-setup", "faq-user-permissions"],
        "sort_order": 8,
        "content_markdown": """# Roles and Permissions

PrathamOne EduOS enforces Role-Based Access Control (RBAC) across every module and API action to enforce accountability and separation of duties.

## Standard Role Profiles
- **SuperAdmin / Admin / Principal:** Full institutional visibility, configuration management, concession approvals, financial period oversight, and user governance.
- **Accountant:** Fee structures, student invoicing, payment collection, receipt printing, financial daybook, and staff/teacher payroll processing.
- **Teacher:** Assigned class attendance, timetable schedule, homework assignments, marks entry, and study material sharing.
- **Staff / Admission Coordinator:** CRM lead inquiries, follow-ups, admission intake, and directory support according to assigned permissions.
- **Student / Parent Portal:** Read-only access to personal attendance, timetable, fee balance/receipts, tests & results, and study materials.

## Separation of Duties Highlights
- Posted fee payments are immutable without explicit **Posted Payment Edit** permission and mandatory edit reason logging.
- Concession and scholarship requests support multi-stage **Verify -> Approve -> Apply** segregation.
- **System Information** diagnostics remain strictly restricted to authorized administrators.
""",
    },
    {
        "slug": "initial-operational-checklist",
        "category_slug": "getting-started",
        "section": "getting_started",
        "module_key": "dashboard",
        "title": "Initial Operational Checklist",
        "summary": "Recommended step-by-step go-live sequence before collecting fees, taking attendance, or publishing exam results.",
        "tags": ["checklist", "onboarding", "go-live", "configuration"],
        "required_permissions": ["Admin / Principal"],
        "related_routes": ["/settings", "/academic", "/fees", "/users"],
        "related_slugs": ["institution-profile-configuration", "academic-year-configuration", "branch-class-and-division-setup"],
        "sort_order": 9,
        "content_markdown": """# Initial Operational Checklist

Follow this verification checklist when preparing PrathamOne EduOS for live academy operations:

1. **Confirm Institution Profile:** Verify academy name, address, contact numbers, logo, and receipt prefix settings under **Settings**.
2. **Verify Current Academic Year:** Ensure the running Academic Year is marked active and current under **Academic**.
3. **Complete Academic Hierarchy:** Create Boards, Standards, Divisions/Batches, and Subject Mappings.
4. **Provision Staff & Teacher Accounts:** Create user accounts, verify roles/permissions, and map Teacher Subject Assignments.
5. **Configure Fee Categories & Structures:** Define Tuition, Admission, Exam, and batch fee structures for the current Academic Year.
6. **Configure Concession & Scholarship Types:** Review approved concession/scholarship rules if your institute grants fee waivers.
7. **Onboard Initial Student Roster:** Add students via **Add Student**, Admission intake, or batch data import and assign them to Divisions and Fee Structures.
8. **Verify Printing & Communication Preferences:** Test a sample Fee Receipt print layout and confirm receipt sharing / communication preferences in **Settings**.
9. **Confirm Automated Housekeeping / Backup Schedule:** Review backup policy visibility under **Administration -> Housekeeping** or **System Information**.
""",
    },

    # =========================================================================
    # B. MODULE-WISE USER GUIDES (14 Genuinely Available Modules)
    # =========================================================================
    {
        "slug": "guide-dashboard",
        "category_slug": "module-guides",
        "section": "module_guide",
        "module_key": "dashboard",
        "title": "Dashboard Module User Guide",
        "summary": "Complete guide to the Executive Dashboard, operational command tabs, cascading academic filters, and live KPI metrics.",
        "tags": ["dashboard", "analytics", "kpi", "overview"],
        "required_permissions": ["Authenticated staff/admin user with dashboard visibility"],
        "related_routes": ["/dashboard", "/"],
        "related_slugs": ["understanding-the-dashboard", "guide-reports"],
        "sort_order": 10,
        "content_markdown": _module_guide_markdown(
            title="Dashboard Module User Guide",
            intro="The Dashboard serves as the central operational landing screen of PrathamOne EduOS, consolidating institute-wide academic, financial, admission, attendance, and staffing indicators in real time.",
            purpose="Provide principals, coordinators, and department leads with an immediate, filterable view of daily operations without running separate manual reports.",
            operations=[
                "Switch across 8 domain-focused dashboard views: Executive Overview, Today's Command, Attendance Command, Fee Ledger Watch, Exams & Performance, Admission Funnel, Staff & Payroll Snapshot, and Data Operations.",
                "Filter institute metrics dynamically by Academic Year, Board, Standard, and Division.",
                "Toggle Student Scope between Active Students and Historical/Exited records.",
                "Jump directly into underlying action screens from summary panels.",
            ],
            steps=[
                "Open Dashboard from the left navigation sidebar.",
                "Select your target Academic Year and optional Board, Standard, or Division in the global filter strip.",
                "Click through the upper domain tabs (for example, Fee Ledger Watch or Attendance Command) to focus on a department.",
                "Review highlighted exceptions such as overdue fee balances, unmarked daily attendance classes, or pending admissions.",
                "Use quick links inside cards to open the relevant module directly.",
            ],
            permissions=[
                "Standard authenticated staff and administrators can view dashboard analytics according to their role scope.",
                "Students and Parents are routed automatically to their dedicated Student Dashboard portal view.",
            ],
            workflows=[
                "Morning Attendance Monitoring -> Attendance Command tab -> Daily Roll Call.",
                "Daily Fee Collection Tracking -> Fee Ledger Watch -> Fees & Payments.",
                "Admission Conversion Review -> Admission Funnel -> CRM Lead Pipeline.",
            ],
            mistakes=[
                "Reviewing collection totals while an old Academic Year or narrow Division filter remains selected.",
                "Expecting Exited students to appear inside default Active Student KPIs without changing Student Scope.",
            ],
            troubleshooting=[
                "If KPI numbers look unexpectedly low, clear the Standard/Division/Board filter pills and confirm the Current Academic Year is selected.",
                "If a department tab is not visible, verify with your administrator that your role includes visibility for that module.",
            ],
        ),
    },
    {
        "slug": "guide-students",
        "category_slug": "module-guides",
        "section": "module_guide",
        "module_key": "students",
        "title": "Student Management Module User Guide",
        "summary": "Manage the student directory, detailed student profiles, enrollments, lifecycle actions, ID cards, and document records.",
        "tags": ["students", "directory", "enrollment", "id card", "lifecycle"],
        "required_permissions": ["students:view", "students:create", "students:edit", "students:delete"],
        "related_routes": ["/students", "/students/add", "/students/admission"],
        "related_slugs": ["tutorial-student-admission", "tutorial-student-enrollment", "faq-student-records"],
        "sort_order": 11,
        "content_markdown": _module_guide_markdown(
            title="Student Management Module User Guide",
            intro="Student Management maintains the canonical Student Master record for every learner enrolled at the coaching institute.",
            purpose="Centralize personal profiles, guardian contacts, academic batch enrollments, fee linkages, attendance summaries, examination progress, lifecycle exit/reactivation records, and printable student ID cards.",
            operations=[
                "Search and filter students across Academic Year, Board, Standard, Division, and Lifecycle Status (Active, Exited, Alumni, Inactive).",
                "View full 360-degree Student Detail profiles covering Guardians, Enrollments, Fee Invoices, Concessions, Attendance, and Exam Marks.",
                "Activate Edit Mode to update student/guardian records, transfer batches, exit/withdraw, or reactivate students.",
                "Generate and print individual or batch Student ID Cards.",
                "Export filtered student rosters.",
            ],
            steps=[
                "Navigate to Students from the sidebar.",
                "Use the search box (name, admission number, phone) and academic filters to locate a student.",
                "Click a student row to open their full Profile in safe View Mode.",
                "To update guardian details, batch enrollment, or lifecycle status, click Edit Mode in the governance bar.",
                "Apply your edits, provide a lifecycle reason if exiting/reactivating a student, and click Save Changes.",
            ],
            permissions=[
                "students:view — Required to browse the directory and view student profiles.",
                "students:create — Required to register new students.",
                "students:edit — Required to update demographics, guardians, or enrollments inside Edit Mode.",
                "students:delete — Strictly restricted for administrative archival actions under confirmation.",
            ],
            workflows=[
                "Lead Conversion / Direct Admission -> Student Record Creation -> Batch Enrollment -> Fee Structure Assignment.",
                "Academic Year End -> Batch Promotion -> Updated Enrollment Record.",
            ],
            mistakes=[
                "Attempting to edit a student profile before enabling Edit Mode.",
                "Deleting an old student record instead of marking the student Exited (which preserves historical receipts and marks).",
                "Leaving Guardian primary mobile numbers blank, preventing WhatsApp/SMS fee or absence alerts.",
            ],
            troubleshooting=[
                "If a student does not appear in a batch list, check whether their Enrollment exists under the currently active Academic Year.",
                "If Edit controls appear locked, verify Edit Mode is turned ON and check with Admin that your role holds `students:edit`.",
            ],
        ),
    },
    {
        "slug": "guide-admissions",
        "category_slug": "module-guides",
        "section": "module_guide",
        "module_key": "admissions",
        "title": "Admission Management Module User Guide",
        "summary": "Track prospective inquiries via the CRM Lead Pipeline, schedule demo classes/follow-ups, and convert admitted learners.",
        "tags": ["admissions", "leads", "crm", "inquiry", "demo class", "conversion"],
        "required_permissions": ["leads:view", "leads:create", "leads:edit", "leads:convert", "students:admission"],
        "related_routes": ["/leads", "/students/admission", "/students/add"],
        "related_slugs": ["tutorial-student-admission", "guide-students"],
        "sort_order": 12,
        "content_markdown": _module_guide_markdown(
            title="Admission Management Module User Guide",
            intro="Admission Management combines prospective inquiry tracking (CRM Leads) with formal student admission intake so counselors never lose follow-ups or re-type applicant information.",
            purpose="Manage walk-in, phone, referral, and web inquiries through structured counseling stages—Enquiry, Follow-Up, Demo Scheduled, Offer Sent, Converted, or Lost—and transition accepted applicants cleanly into enrolled students.",
            operations=[
                "Create new prospect leads with target course/standard, parent phone, counselor assignment, and inquiry source.",
                "Manage multiple CRM views: Overview Dashboard, Pipeline Kanban/List, Leads Directory, Follow-Ups Queue, Demo Classes Schedule, Lost/Closed Leads, Duplicate Checker, Counselor Analytics, and Admission Intake.",
                "Record counselor call outcomes, schedule next follow-up reminders, and book trial/demo sessions.",
                "Convert qualified leads into formal Student records in one connected workflow.",
            ],
            steps=[
                "Open Admissions / CRM Leads from the sidebar.",
                "In Edit Mode, click Add Lead to capture student name, guardian phone, desired standard/course, and inquiry source.",
                "Log counselor interactions under Follow-Ups or assign a Demo Class slot.",
                "Once the student confirms admission, open the lead and choose Convert to Student (or use the dedicated Admission Form for direct walk-ins).",
                "Complete remaining guardian, division, and fee structure selection on the Admission Form and submit.",
            ],
            permissions=[
                "leads:view / leads:create / leads:edit — Required for inquiry pipeline management.",
                "leads:convert and students:admission — Required to convert a lead or submit a formal student admission.",
            ],
            workflows=[
                "Enquiry Captured -> Counselor Follow-Up -> Demo Class Attended -> Lead Converted -> Student Enrolled -> Initial Fee Invoiced.",
            ],
            mistakes=[
                "Creating duplicate student entries directly via Add Student instead of converting an existing CRM Lead.",
                "Forgetting to assign Academic Year and Division during final admission confirmation.",
            ],
            troubleshooting=[
                "If Convert to Student is disabled, verify you have both `leads:convert` and `students:admission` permissions and Edit Mode is active.",
                "Use the Duplicate Checker tab inside CRM Leads if multiple inquiries share the same guardian phone number.",
            ],
        ),
    },
    {
        "slug": "guide-fees",
        "category_slug": "module-guides",
        "section": "module_guide",
        "module_key": "fees",
        "title": "Fee Management Module User Guide",
        "summary": "Configure fee categories and structures, generate invoices, collect payments, manage reversals/refunds, and print receipts.",
        "tags": ["fees", "invoices", "payments", "receipts", "defaulters", "daybook"],
        "required_permissions": ["fees:view", "fees:manage", "payments:create", "payments:edit_posted", "payments:reverse"],
        "related_routes": ["/fees", "/payments"],
        "related_slugs": ["tutorial-fee-structure-management", "tutorial-fee-collection", "tutorial-receipt-generation", "guide-concessions"],
        "sort_order": 13,
        "content_markdown": _module_guide_markdown(
            title="Fee Management Module User Guide",
            intro="Fee Management governs the financial ledger of PrathamOne EduOS, connecting fee structures, student invoices, installment schedules, payment collections, official receipts, and period lock integrity.",
            purpose="Provide transparent, auditable student fee accounting across cash, UPI, cheque, card, bank transfer, and online gateway collections with immutable ledger traceability.",
            operations=[
                "Define Fee Categories and Standard/Academic-Year Fee Structures with annual or installment schedules.",
                "Generate student fee assignments and itemized Fee Invoices.",
                "Collect full or partial payments from the Collection Desk and allocate amounts accurately across open invoices.",
                "Monitor overdue balances in Defaulters & Dues and review daily receipts in the Financial Daybook.",
                "Print or share Official Payment Receipts immediately upon collection.",
                "Process controlled Posted Payment edits, reversals, or refunds (requires strict financial authority and Financial Period open state).",
            ],
            steps=[
                "Open Fees & Payments from the sidebar.",
                "Setup phase: Activate Edit Mode under Fee Structures to create/confirm fee components for the Academic Year and Standard.",
                "Invoicing phase: Assign fee structures to enrolled students or batch cohorts to generate Fee Invoices.",
                "Collection phase: Open Collection Desk, search the student, review net payable (after applied concessions/scholarships), enter payment amount/method/reference, and post payment.",
                "Print or download the numbered Payment Receipt from the Payments or Daybook view.",
            ],
            permissions=[
                "fees:view — View fee structures, student invoices, defaulters, and receipts.",
                "fees:manage — Create or modify fee categories, structures, and student invoices.",
                "payments:create — Record fee payments and issue receipts.",
                "payments:edit_posted / payments:reverse — Strictly gated permissions for modifying, reversing, or refunding already-posted ledger entries.",
            ],
            workflows=[
                "Fee Structure Defined -> Student Assigned -> Invoice Issued -> Approved Concession/Scholarship Deducted -> Payment Collected -> Official Receipt Issued.",
            ],
            mistakes=[
                "Attempting to manually adjust an invoice amount directly instead of applying a structured Concession or Waiver.",
                "Collecting payment into the wrong Academic Year without checking the student's active enrollment session.",
                "Trying to edit a payment belonging to a locked/closed Financial Period.",
            ],
            troubleshooting=[
                "If a receipt edit button is blocked, check whether your role has `payments:edit_posted` and confirm the transaction's Financial Period has not been closed by Admin.",
                "If expected fee discount is missing from Net Payable, open the invoice Trace view to confirm the concession status reached 'Applied'.",
            ],
        ),
    },
    {
        "slug": "guide-concessions",
        "category_slug": "module-guides",
        "section": "module_guide",
        "module_key": "concessions",
        "title": "Concessions & Waivers Module User Guide",
        "summary": "Configure concession/waiver rules, submit applications, enforce verify-approve-apply governance, and trace invoice deductions.",
        "tags": ["concessions", "waivers", "discounts", "approval", "eligibility"],
        "required_permissions": ["fees:view", "concessions:apply", "concessions:verify", "concessions:approve", "concessions:reverse"],
        "related_routes": ["/fees/concessions"],
        "related_slugs": ["guide-scholarships", "tutorial-concession-approval", "faq-concessions-waivers"],
        "sort_order": 14,
        "content_markdown": _module_guide_markdown(
            title="Concessions & Waivers Module User Guide",
            intro="The Concessions & Waivers workspace manages all authorized fee reductions—sibling discounts, staff-ward concessions, financial hardship waivers, and special administrative waivers—with full maker-checker governance.",
            purpose="Eliminate informal manual fee overrides by requiring documented Concession Types, rule eligibility evaluation, approval workflows, and itemized ledger allocation entries on student invoices.",
            operations=[
                "Configure canonical Concession Types (percentage or fixed amount, stacking rules, eligible fee categories, and validity caps).",
                "Check student eligibility before applying a concession.",
                "Submit Single Student or Bulk Batch concession applications.",
                "Execute multi-stage governance: Verify Application -> Approve Application -> Allocate/Apply to Fee Invoices.",
                "Withdraw pending requests or reverse/cancel allocated concessions with documented audit reasons.",
                "Inspect item-level financial impact via the Invoice Concession Trace modal.",
            ],
            steps=[
                "Navigate to Fees & Payments -> Concessions & Waivers (`/fees/concessions`).",
                "Verify or create Concession Types inside the Concession Types setup section under Edit Mode.",
                "Click New Application (or Bulk Apply), select the Student(s), Academic Year, Concession Type, and enter justification.",
                "Run Eligibility Check if rule constraints exist, then submit the application.",
                "Authorized reviewers move the application through Verify -> Approve -> Apply to reduce the student's open invoice payable balance.",
            ],
            permissions=[
                "concessions:apply — Submit new concession or waiver applications.",
                "concessions:verify — Perform initial document/eligibility verification.",
                "concessions:approve — Approve or reject verified requests (also grants allocation capability for authorized roles).",
                "concessions:reverse — Reverse an already-applied concession or withdraw/cancel approved concessions with reason logging.",
            ],
            workflows=[
                "Application Submitted -> Document/Rule Verified -> Principal/Admin Approved -> Allocated to Invoice -> Remaining Net Fee Collected.",
            ],
            mistakes=[
                "Assuming a submitted or merely approved concession has already deducted the fee balance before clicking Apply/Allocate.",
                "Attempting to exceed a concession type's maximum discount limit or combine non-stackable concessions on the same invoice item.",
            ],
            troubleshooting=[
                "If Apply to Invoice fails, confirm the student has an open eligible Fee Invoice with remaining net balance for that Academic Year.",
                "If a concession cannot be stacked with another discount, check the 'Allow Stacking' configuration on both Concession Types.",
            ],
        ),
    },
    {
        "slug": "guide-scholarships",
        "category_slug": "module-guides",
        "section": "module_guide",
        "module_key": "scholarships",
        "title": "Scholarships and Student Benefits User Guide",
        "summary": "Manage merit scholarships, external sponsor funding, benefit allocations, and sponsor settlement reconciliation.",
        "tags": ["scholarships", "benefits", "sponsor", "merit", "settlement"],
        "required_permissions": ["fees:view", "concessions:apply", "concessions:approve", "fees:manage"],
        "related_routes": ["/fees/concessions"],
        "related_slugs": ["guide-concessions", "tutorial-scholarship-allocation", "faq-scholarship-allocation"],
        "sort_order": 15,
        "content_markdown": _module_guide_markdown(
            title="Scholarships and Student Benefits User Guide",
            intro="Scholarships and Sponsor-Funded Student Benefits operate inside the unified Concessions, Waivers & Scholarships governance engine (`/fees/concessions`), ensuring shared ledger integrity without duplicate billing tables.",
            purpose="Manage merit-based scholarships, entrance test rank benefits, and third-party sponsor awards alongside clear tracking of institutional tuition reduction versus external sponsor receivable settlements.",
            operations=[
                "Configure Benefit Types with Benefit Category set to `scholarship` or `sponsor_funding`.",
                "Assign merit criteria, percentage/fixed coverage, sponsor organization details, and annual funding limits.",
                "Submit and approve individual or batch merit scholarship awards using unified eligibility verification.",
                "Allocate scholarship awards onto student invoices.",
                "Record and track external Sponsor Settlements when third-party trusts or sponsors reimburse funded student fees.",
            ],
            steps=[
                "Open Fees & Payments -> Concessions & Waivers (`/fees/concessions`).",
                "Use the Benefit Type filter to focus on `Scholarship` or `Sponsor Funding` types and applications.",
                "Create or select an active Scholarship / Sponsor Benefit Type under Edit Mode.",
                "Submit student scholarship applications (individually or in bulk for rank holders) with supporting rank/sponsor notes.",
                "Complete Verify -> Approve -> Apply workflow to credit the benefit onto the student's fee invoice.",
                "For sponsor-funded awards, record incoming sponsor reimbursements in the Sponsor Settlement tracker.",
            ],
            permissions=[
                "concessions:apply — Submit scholarship or sponsor benefit nominations.",
                "concessions:verify / concessions:approve — Authorize merit and sponsor awards.",
                "fees:manage — Record sponsor settlement receipts and monitor balance reconciliation.",
            ],
            workflows=[
                "Merit List / Sponsor Award Approved -> Benefit Type Selected -> Scholarship Verified & Applied to Invoice -> Sponsor Settlement Tracked (if third-party funded).",
            ],
            mistakes=[
                "Looking for a separate disconnected menu item instead of filtering Benefit Type = Scholarship inside Concessions & Waivers.",
                "Confusing an institute fee waiver (fee absorbed by institute) with Sponsor Funding (fee covered by an external donor settlement).",
            ],
            troubleshooting=[
                "If a scholarship does not appear in the list, clear the Benefit Type filter or confirm the Scholarship type is marked Active.",
                "If Sponsor Settlement totals differ from allocated scholarships, inspect each allocation's settlement status inside Concessions & Waivers.",
            ],
        ),
    },
    {
        "slug": "guide-attendance",
        "category_slug": "module-guides",
        "section": "module_guide",
        "module_key": "attendance",
        "title": "Attendance Management Module User Guide",
        "summary": "Mark daily class attendance, operate the QR Terminal, track monthly registers, manage leaves, and trigger absentee alerts.",
        "tags": ["attendance", "roll call", "qr", "leave", "defaulters", "register"],
        "required_permissions": ["attendance:view", "attendance:mark", "attendance:manage"],
        "related_routes": ["/attendance"],
        "related_slugs": ["tutorial-attendance-recording", "faq-attendance-discrepancies"],
        "sort_order": 16,
        "content_markdown": _module_guide_markdown(
            title="Attendance Management Module User Guide",
            intro="Attendance Management tracks daily student presence across divisions and batches with both traditional teacher roll call and rapid QR self-check options.",
            purpose="Maintain accurate daily attendance percentages, identify chronic absenteeism early, manage student leave requests, and notify guardians promptly.",
            operations=[
                "Mark Daily Roll Call with Present, Absent, Late, Half-Day, or Excused status per Division and Date.",
                "Operate the QR Terminal mode for quick student check-ins.",
                "Inspect the Monthly Register grid across all calendar days of a selected month.",
                "Review Attendance Defaulters below configured percentage thresholds and dispatch automated guardian alerts.",
                "Approve or decline submitted Student Leave Requests.",
                "Export monthly attendance sheets and adjust threshold policies in Attendance Settings.",
            ],
            steps=[
                "Open Attendance from the sidebar.",
                "In Daily Roll Call, select Academic Year, Standard, Division, and Date.",
                "Activate Edit Mode (or marking mode for assigned teachers), set statuses (using Mark All Present for quick baseline, then toggling absentees), and click Save Attendance.",
                "Switch to Monthly Register or Defaulters & Alerts to analyze monthly percentages or notify parents of absences.",
            ],
            permissions=[
                "attendance:view — View daily registers, monthly summaries, and defaulter reports.",
                "attendance:mark — Mark or update daily student attendance.",
                "attendance:manage — Configure minimum percentage thresholds, lock rules, and approve/reject leave policies.",
            ],
            workflows=[
                "Daily Class Conducted -> Roll Call or QR Check-In Saved -> Absentee Alert Queued -> Monthly Percentage Calculated -> Eligible for Exam / Parent Report.",
            ],
            mistakes=[
                "Marking attendance under the wrong Date or forgetting to click Save Attendance after toggling rows.",
                "Not linking parent contact numbers cleanly in Student Management, preventing absentee alert delivery.",
            ],
            troubleshooting=[
                "If a newly admitted student is missing from Daily Roll Call, confirm their active Enrollment belongs to the chosen Standard, Division, and Academic Year.",
                "If percentage calculations appear lower than expected, inspect Monthly Register for unmarked session dates or pending leave approvals.",
            ],
        ),
    },
    {
        "slug": "guide-timetable",
        "category_slug": "module-guides",
        "section": "module_guide",
        "module_key": "timetable",
        "title": "Timetable Management Module User Guide",
        "summary": "Build conflict-free weekly division schedules, assign faculty and rooms, and publish schedules to Teacher and Student Portals.",
        "tags": ["timetable", "schedule", "classes", "teacher assignment", "conflicts"],
        "required_permissions": ["academic:view", "academic:manage"],
        "related_routes": ["/academic/timetable", "/timetable"],
        "related_slugs": ["tutorial-timetable-preparation", "branch-class-and-division-setup"],
        "sort_order": 17,
        "content_markdown": _module_guide_markdown(
            title="Timetable Management Module User Guide",
            intro="Timetable Management resides cleanly inside the Academic workspace (`/academic/timetable`), coordinating weekly period slots across divisions, subjects, faculty members, and classrooms.",
            purpose="Prevent double-booking of teachers, batches, or classrooms while making the active weekly timetable instantly visible to teachers and students in their portals.",
            operations=[
                "Create, edit, or remove weekly timetable entries by Standard, Division, Day of Week, Start/End Time, Subject, Faculty, and Room.",
                "Run automatic conflict detection across overlapping teacher assignments, rooms, and divisions.",
                "Switch cleanly between Division Timetable and Teacher Schedule filters.",
                "Expose published schedules automatically to Teacher Portal (`/teacher-portal`) and Student Portal (`/student-portal`).",
            ],
            steps=[
                "Navigate to Academic -> Timetable (`/academic/timetable` or `/timetable`).",
                "Select the Academic Year, Standard, and Division you are scheduling.",
                "Activate Edit Mode.",
                "Click Add Timetable Slot, choose Day, Start Time, End Time, Subject, Assigned Teacher, and Room Number.",
                "Verify zero conflict warnings and save the slot.",
            ],
            permissions=[
                "academic:view — View division and faculty schedules (plus automatic portal access for teachers and students).",
                "academic:manage — Create, edit, or delete weekly timetable entries.",
            ],
            workflows=[
                "Divisions & Subjects Mapped -> Teachers Assigned -> Weekly Timetable Built & Conflict-Checked -> Visible in Teacher & Student Portals.",
            ],
            mistakes=[
                "Creating overlapping afternoon/evening periods with the same teacher across two simultaneous coaching batches.",
                "Scheduling a subject before mapping that subject to the target Standard/Curriculum.",
            ],
            troubleshooting=[
                "If a teacher cannot see classes in Teacher Portal, confirm the timetable slot references their linked Teacher User ID for the Current Academic Year.",
                "If a slot fails to save due to conflict, inspect existing entries for that Day/Time window across other divisions for the same teacher or room.",
            ],
        ),
    },
    {
        "slug": "guide-examinations",
        "category_slug": "module-guides",
        "section": "module_guide",
        "module_key": "examinations",
        "title": "Examination Management Module User Guide",
        "summary": "Schedule tests and examinations, organize question papers, manage marks entry and absentees, and configure grading scales.",
        "tags": ["examinations", "tests", "marks entry", "question papers", "grading"],
        "required_permissions": ["exams:view", "exams:create", "exams:enter_marks", "exams:manage"],
        "related_routes": ["/examinations"],
        "related_slugs": ["guide-results", "tutorial-examination-scheduling", "tutorial-marks-entry", "faq-examination-result-issues"],
        "sort_order": 18,
        "content_markdown": _module_guide_markdown(
            title="Examination Management Module User Guide",
            intro="Examination Management streamlines unit tests, periodic coaching assessments, mock board tests, and term examinations end-to-end.",
            purpose="Manage exam planning, max marks and passing criteria, question paper metadata, controlled marks entry, absentee logging, and grading scales before results are released.",
            operations=[
                "Inspect upcoming, active, and completed assessments in Exam Overview.",
                "Schedule Exams under Exam Schedules with Standard, Subject, Exam Date, Duration, Total Marks, and Passing Marks.",
                "Record student scores and mark Absentees efficiently in the Marks Entry grid.",
                "Upload and organize Question Papers for authorized faculty/batch access.",
                "Configure passing rules and grade boundaries in Examination Settings & Grading.",
            ],
            steps=[
                "Open Examinations (`/examinations`) from the sidebar.",
                "In Exam Schedules, enable Edit Mode and click Schedule Exam to define the test title, Academic Year, Standard, Subject, Date, Max Marks, and Passing Marks.",
                "After the exam finishes, open Marks Entry, choose the scheduled examination, and enter scores (or tick Absent where applicable).",
                "Save marks in draft or verified state prior to publication.",
            ],
            permissions=[
                "exams:view — View exam schedules and grading structure.",
                "exams:create / exams:manage — Schedule/edit examinations, question papers, and grading rules.",
                "exams:enter_marks — Enter and save student scores and absentee flags.",
            ],
            workflows=[
                "Exam Scheduled -> Question Paper Attached -> Test Conducted -> Marks Entered & Verified -> Result Published in Results & Report Cards.",
            ],
            mistakes=[
                "Leaving absent students blank instead of marking them explicitly Absent, creating ambiguity between pending marks and zero scores.",
                "Setting Passing Marks higher than Total Marks or mismatching Exam Subject with Student Standard.",
            ],
            troubleshooting=[
                "If students are missing on the Marks Entry roster, verify their active Enrollment in the target Academic Year and Standard/Division.",
                "If Marks Entry fields are read-only, confirm Edit Mode is ON and check whether the exam has already been locked after publication.",
            ],
        ),
    },
    {
        "slug": "guide-results",
        "category_slug": "module-guides",
        "section": "module_guide",
        "module_key": "results",
        "title": "Results and Report Cards User Guide",
        "summary": "Review cohort performance analytics, publish verified results, generate printable report cards, and control portal visibility.",
        "tags": ["results", "report cards", "analytics", "grades", "publication"],
        "required_permissions": ["exams:view", "exams:publish", "exams:manage"],
        "related_routes": ["/examinations/analytics", "/examinations/report-cards", "/examinations"],
        "related_slugs": ["guide-examinations", "tutorial-result-publication", "faq-printing-problems"],
        "sort_order": 19,
        "content_markdown": _module_guide_markdown(
            title="Results and Report Cards Module User Guide",
            intro="Results and Report Cards transforms verified examination marks into consolidated student scorecards, batch merit rankings, and analytics.",
            purpose="Enable controlled result verification, percentage and grade calculation, formal publication to portals, and high-clarity printed Report Cards for parents and students.",
            operations=[
                "Analyze batch averages, topper lists, subject pass/fail distributions, and score bands under Exam Analytics.",
                "Publish verified exam results so scores become officially visible in Student Portal (`/student-portal` -> Tests & Results).",
                "Preview and print formatted consolidated Report Cards per student or division.",
                "Export examination score registers for academic review meetings.",
            ],
            steps=[
                "Open Examinations -> Result Analytics or Report Cards from the module navigation.",
                "Confirm all subject Marks Entry sheets show 100% completion (all students scored or marked Absent).",
                "Activate Edit Mode and click Publish Result for the approved examination batch.",
                "Open Report Cards to preview individual consolidated scorecards and print using clean PDF/browser print layout.",
            ],
            permissions=[
                "exams:view — Inspect internal exam analytics and draft scorecards.",
                "exams:publish — Required to publish or unpublish official results to student/parent portals.",
            ],
            workflows=[
                "All Marks Entered -> Analytics Reviewed -> Result Published -> Report Cards Printed / Viewed in Student Portal.",
            ],
            mistakes=[
                "Printing or distributing Report Cards before publishing verified marks, leading to discrepancies between portal scores and printouts.",
                "Forgetting to review Passing Criteria thresholds before computing overall Pass/Needs Improvement badges.",
            ],
            troubleshooting=[
                "If a student cannot see scores in Student Portal -> Tests & Results, check whether the examination status is set to Published.",
                "If print margins clip Report Card headers, use browser print A4 Portrait mode with 'Background graphics' enabled.",
            ],
        ),
    },
    {
        "slug": "guide-staff",
        "category_slug": "module-guides",
        "section": "module_guide",
        "module_key": "staff",
        "title": "Staff Management Module User Guide",
        "summary": "Manage teachers, non-teaching staff, employee dossiers, subject assignments, attendance/leave, and teacher payroll.",
        "tags": ["staff", "teachers", "payroll", "attendance", "leave", "dossier"],
        "required_permissions": ["staff:view", "staff:manage", "teachers:manage", "payroll:manage"],
        "related_routes": ["/teachers", "/staff", "/teacher-payroll"],
        "related_slugs": ["user-management-setup", "guide-timetable"],
        "sort_order": 20,
        "content_markdown": _module_guide_markdown(
            title="Staff Management Module User Guide",
            intro="Staff Management integrates Teacher Management (`/teachers`), General Staff Directory (`/staff`), Employee Dossiers, and Teacher Payroll (`/teacher-payroll`) around a unified User Identity (`users.id`).",
            purpose="Maintain complete employment records—profiles, qualifications, bank details, teaching subject/batch assignments, staff attendance/leave balances, and lecture/salary payroll vouchers—without duplicate staff master copies.",
            operations=[
                "Browse and manage Teaching Faculty in Teacher Management and Non-Teaching Employees in Staff Management.",
                "Inspect Employee Dossiers covering Employment History, KYC/Documents, Key Contacts, Addresses, and Bank Accounts.",
                "Assign faculty to specific Academic Year Standards, Divisions, and Canonical Subjects.",
                "Record Staff Attendance and approve/track Staff Leave requests and leave balances.",
                "Manage Teacher Payment Profiles, hourly/per-session/fixed rates, Teaching Session logs, Payroll calculation runs, and Payment Vouchers.",
            ],
            steps=[
                "Ensure the employee's base login identity exists in Users & Roles (every staff member links to a single canonical user record).",
                "Open Staff Management (`/staff`) or Teacher Management (`/teachers`), activate Edit Mode, and complete Employment/Bank/Contact dossier details.",
                "Under Teacher Management -> Subject Assignments, map the faculty member to their assigned Divisions and Subjects.",
                "Record monthly faculty sessions or staff attendance/leaves, then open Teacher Payroll (`/teacher-payroll`) to generate payroll runs and issue payment vouchers.",
            ],
            permissions=[
                "staff:view / staff:manage — View or maintain staff profiles, dossiers, attendance, and leaves.",
                "teachers:manage — Assign faculty to academic subjects and batches.",
                "payroll:manage — Configure teacher payout rates, calculate payroll cycles, and issue payment vouchers.",
            ],
            workflows=[
                "User Account Created -> Staff Profile & Bank Dossier Completed -> Subject Assignments Mapped -> Teaching Sessions Logged -> Teacher Payroll Processed & Vouchered.",
            ],
            mistakes=[
                "Trying to assign a faculty member to a timetable slot or payroll profile before linking their Staff/Teacher profile and User identity.",
                "Deleting a former teacher instead of recording an employment end date or deactivating their user login.",
            ],
            troubleshooting=[
                "If a teacher's session payouts calculate zero, verify their Teacher Payment Profile has an active rate history effective before the session dates.",
                "If a teacher cannot access Teacher Portal, verify their User role and active status in Users & Roles.",
            ],
        ),
    },
    {
        "slug": "guide-communication",
        "category_slug": "module-guides",
        "section": "module_guide",
        "module_key": "communication",
        "title": "Communication Management Module User Guide",
        "summary": "Manage message templates, WhatsApp/Email/SMS dispatch, automated fee/attendance alerts, document sharing, and logs.",
        "tags": ["communication", "whatsapp", "email", "sms", "templates", "reminders"],
        "required_permissions": ["communication:view", "communication:send", "communication:manage"],
        "related_routes": ["/communication"],
        "related_slugs": ["guide-fees", "guide-attendance"],
        "sort_order": 21,
        "content_markdown": _module_guide_markdown(
            title="Communication Management Module User Guide",
            intro="Communication Management centralizes institutional announcements, payment reminders, attendance alerts, reusable message templates, and secure document sharing links.",
            purpose="Deliver consistent, auditable parent and student notifications across WhatsApp (Web or configured provider), Email, and SMS with complete delivery tracking.",
            operations=[
                "Manage categorized Message Templates with dynamic placeholders such as student name, invoice balance, receipt link, and due date.",
                "Send targeted or batch announcements across Divisions, Standards, or selected recipients.",
                "Review and dispatch the automated Fee Reminder Queue for overdue installments.",
                "Trigger Absence Alerts from daily attendance records.",
                "Create time-limited Shared Document Links for fee receipts and notices.",
                "Monitor Delivery Logs and inspect Channel Diagnostics.",
            ],
            steps=[
                "Open Communication Center (`/communication`) from the sidebar.",
                "Review or customize message templates in the Templates tab under Edit Mode.",
                "Select Quick Dispatch or Broadcast, pick audience filters or individual student/guardian contacts, preview resolved placeholder text, and click Send.",
                "Verify delivery outcomes (Sent, Pending, Failed, or WhatsApp Browser Link Generated) inside the Delivery History tab.",
            ],
            permissions=[
                "communication:view — View templates and delivery logs.",
                "communication:send — Dispatch messages, fee reminders, and absence notifications.",
                "communication:manage — Modify templates, automation triggers, and channel rules.",
            ],
            workflows=[
                "Template Selected -> Audience Filtered -> Placeholders Resolved -> Message Dispatched -> Audited in Communication Logs.",
            ],
            mistakes=[
                "Sending messages with missing guardian mobile numbers or improperly spelled `{placeholder}` tokens.",
                "Assuming external Cloud API automated delivery is active without configuring provider credentials under Settings -> Integrations & Communication.",
            ],
            troubleshooting=[
                "If Cloud WhatsApp or Email shows sandbox/unconfigured status, check **Settings -> Communication & Integrations** or System Information Integration Status, or use instant **WhatsApp Web** browser dispatch links.",
                "If placeholder text renders literally (like `{student_name}`), confirm the variable name matches supported template tokens.",
            ],
        ),
    },
    {
        "slug": "guide-reports",
        "category_slug": "module-guides",
        "section": "module_guide",
        "module_key": "reports",
        "title": "Reports and Analytics Module User Guide",
        "summary": "Generate operational, financial, attendance, admission, and academic reports using interactive grids and Excel/CSV exports.",
        "tags": ["reports", "analytics", "excel", "xlsx", "csv", "exports"],
        "required_permissions": ["reports:view", "reports:export"],
        "related_routes": ["/reports"],
        "related_slugs": ["tutorial-report-generation", "faq-reports-exports"],
        "sort_order": 22,
        "content_markdown": _module_guide_markdown(
            title="Reports and Analytics Module User Guide",
            intro="Reports and Analytics provides clean, interactive tabular and visual intelligence across students, fee ledgers, receipts, defaulters, attendance, admissions, and examinations.",
            purpose="Enable principals, accountants, and coordinators to analyze institutional performance accurately and export formatted workbooks for audits and management reviews.",
            operations=[
                "Run domain-specific reports covering Student Roster, Fee Collection Summary, Pending Dues / Defaulters, Concession & Scholarship Summary, Daily/Monthly Attendance, Exam Merit Lists, and Admission Conversions.",
                "Sort, search, filter, and inspect records dynamically inside the interactive Excel-style Report Grid.",
                "View automated Report Intelligence callouts summarizing highlights and exceptions.",
                "Export clean datasets in XLSX (Excel), CSV, or JSON formats.",
            ],
            steps=[
                "Open Reports & Analytics (`/reports`) from the sidebar.",
                "Select the desired report category and specific report template.",
                "Choose Date Range, Academic Year, Board, Standard, and Division parameters.",
                "Click Generate Report to load the interactive grid and Intelligence banner.",
                "Use column filters to narrow the view, then click Export XLSX or Export CSV as needed.",
            ],
            permissions=[
                "reports:view — Access and inspect report tables within authorized domains.",
                "reports:export — Download XLSX, CSV, or printable report files.",
            ],
            workflows=[
                "Parameters Selected -> Report Generated -> Grid Filtered -> XLSX/CSV Exported for Finance/Academic Review.",
            ],
            mistakes=[
                "Exporting reports with restrictive date filters applied and assuming month-to-date transactions are missing.",
                "Trying to edit accounting numbers inside an exported spreadsheet instead of correcting source records under governance rules.",
            ],
            troubleshooting=[
                "If a financial report shows zero rows, confirm the selected Date Range covers actual payment dates and that the chosen Academic Year matches active invoices.",
                "If Excel formatting displays `###`, widen the date/amount columns inside your spreadsheet application after download.",
            ],
        ),
    },
    {
        "slug": "guide-settings",
        "category_slug": "module-guides",
        "section": "module_guide",
        "module_key": "settings",
        "title": "Administration and Settings Module User Guide",
        "summary": "Configure 17 institutional setting categories, manage Lookup registries, govern Edit Mode, and monitor backups & housekeeping.",
        "tags": ["settings", "administration", "lookups", "housekeeping", "backups", "governance"],
        "required_permissions": ["settings:view", "settings:manage", "housekeeping:manage", "Admin / SuperAdmin"],
        "related_routes": ["/settings", "/users", "/housekeeping"],
        "related_slugs": ["institution-profile-configuration", "roles-and-permissions-guide", "guide-dashboard"],
        "sort_order": 23,
        "content_markdown": _module_guide_markdown(
            title="Administration and Settings Module User Guide",
            intro="Administration and Settings consolidates institute-wide business rules, look-up catalogs, View-First governance settings, user/role permissions, and operational housekeeping.",
            purpose="Give authorized administrators one governed control panel (`Settings`, `Users & Roles`, and `Data Housekeeping`) with automatic Setting Audit Logging for every configuration change.",
            operations=[
                "Maintain Institution Profile, Academic Defaults, Admission Rules, Fee & Receipt Numbering, Attendance Policies, Examination Rules, Communication Channels, and Security/Password settings across organized tabs.",
                "Manage customizable Dropdown Lookup items (such as Fee Categories, Payment Methods, Inquiry Sources) without code changes.",
                "Inspect Configuration Change Audit History (`SettingAuditLog`).",
                "Manage Users & Role Assignments under Users & Roles (`/users`).",
                "Run data retention reviews, verify database health checks, and inspect backup history in Data Housekeeping (`/housekeeping`).",
            ],
            steps=[
                "Navigate to Settings (`/settings`) from the Administration section of the sidebar.",
                "Select a configuration category from the left category rail.",
                "Click Edit Mode in the governance bar to unlock setting inputs.",
                "Adjust values carefully and click Save Changes (every saved batch generates an audit record showing before/after values).",
                "Open Audit Trail inside Settings whenever you need to verify who changed an institutional rule and when.",
            ],
            permissions=[
                "settings:view — Inspect read-only institutional settings.",
                "settings:manage — Modify settings, reset defaults, and maintain Lookup lists.",
                "housekeeping:manage — Inspect retention policies, verified backups, and maintenance tasks.",
            ],
            workflows=[
                "Edit Mode Activated -> Institutional Policy Updated -> Saved to Audit Trail -> Immediately Applied Across Modules.",
            ],
            mistakes=[
                "Changing receipt numbering prefixes mid-financial year without coordinating with accounting staff.",
                "Forgetting to click Save Changes after flipping toggles across multiple Settings categories.",
            ],
            troubleshooting=[
                "If Settings fields appear disabled, check that Edit Mode is toggled ON and confirm your account holds Admin/SuperAdmin permissions.",
                "To access System Information (application health, database status, latest backup verification), open Help & About Centre -> System Information as an administrator.",
            ],
        ),
    },
    {
        "slug": "guide-courses",
        "category_slug": "module-guides",
        "section": "module_guide",
        "module_key": "courses",
        "title": "Study Materials and Courses Module User Guide",
        "summary": "Organize the Master Content Library, chapter notes, question banks, video lectures, curriculum syllabi, and storage policies.",
        "tags": ["courses", "study materials", "notes", "question banks", "video lectures", "syllabi"],
        "required_permissions": ["courses:view", "courses:manage", "Teacher / Coordinator / Admin"],
        "related_routes": ["/courses", "/courses/repository", "/courses/notes", "/courses/question-banks", "/courses/video-lectures", "/courses/syllabi"],
        "related_slugs": ["guide-homework", "guide-examinations", "branch-class-and-division-setup"],
        "sort_order": 24,
        "content_markdown": _module_guide_markdown(
            title="Study Materials and Courses Module User Guide",
            intro="The Study Materials & Digital Content workspace centralizes academic handouts, chapter notes, practice question banks, video lectures, and syllabus trackers by Standard, Subject, and Division.",
            purpose="Ensure learners receive structured, faculty-reviewed study resources while maintaining clean academic alignment across batches.",
            operations=[
                "Browse Overview and Master Library across boards, standards, subjects, and coaching programs (`/courses/overview`, `/courses/repository`).",
                "Upload and categorize Chapter Notes, Question Banks, and Recorded Video Lectures (`/courses/upload`, `/courses/notes`, `/courses/question-banks`, `/courses/video-lectures`).",
                "Track Curriculum Syllabi and review Storage Policies (`/courses/syllabi`, `/courses/settings`).",
            ],
            steps=[
                "Open Study Materials (`/courses`) from the Academic / Learning navigation menu.",
                "Select a workspace tab (`Master Library`, `Chapter Notes`, `Question Banks`, `Video Lectures`, or `Curriculum Syllabi`) and filter by Standard, Subject, or Division.",
                "Activate Edit Mode in the Study Materials & Digital Content Catalog governance bar when publishing new study material.",
                "Open Upload Content, enter the material title, select target Standard/Subject/Division, attach or link the resource, and save.",
                "Verify visibility for assigned divisions before informing students.",
            ],
            permissions=[
                "courses:view — View published notes, question banks, syllabi, and video lecture links.",
                "courses:manage — Upload, update, and retire digital study materials when Edit Mode is active.",
            ],
            workflows=[
                "Academic Setup (Standards & Subjects) -> Upload Study Material -> Student Access in Portal -> Examination Preparation.",
            ],
            mistakes=[
                "Uploading chapter notes without linking the exact Subject and Standard, causing students in that batch to miss them.",
                "Attempting to upload or edit materials without enabling Edit Mode first.",
            ],
            troubleshooting=[
                "If a study material is not visible to learners in a batch, check both its Standard/Division mapping and published status.",
                "If Edit buttons appear locked, toggle Edit Mode ON in the top governance bar.",
            ],
        ),
    },
    {
        "slug": "guide-homework",
        "category_slug": "module-guides",
        "section": "module_guide",
        "module_key": "homework",
        "title": "Homework and Assignments Module User Guide",
        "summary": "Create batch assignments, record physical notebook checks, track digital submissions, reuse templates, and export daily registers.",
        "tags": ["homework", "assignments", "checking register", "submissions", "templates"],
        "required_permissions": ["homework:view", "homework:manage", "Teacher / Coordinator / Admin"],
        "related_routes": ["/homework", "/homework/create", "/homework/checking", "/homework/submissions", "/homework/templates", "/homework/reports"],
        "related_slugs": ["guide-attendance", "guide-courses", "guide-students"],
        "sort_order": 25,
        "content_markdown": _module_guide_markdown(
            title="Homework and Assignments Module User Guide",
            intro="The Homework & Assignment Studio allows teachers and coordinators to issue assignments to entire divisions or selected learners and track physical notebook checks or digital submissions.",
            purpose="Standardize daily practice tracking across batches with per-student status visibility and daily homework registers.",
            operations=[
                "Review active assignments and completion counts in Overview (`/homework`).",
                "Assign new homework with target Division, Subject, due date, and reusable templates (`/homework/create`, `/homework/templates`).",
                "Record physical classroom notebook checking per learner in Checking Register (`/homework/checking`).",
                "Review uploaded learner responses in Submissions (`/homework/submissions`) and generate Daily Register Reports (`/homework/reports`).",
            ],
            steps=[
                "Open Homework & Assignments (`/homework`) and switch to Assign New Homework (`/homework/create`).",
                "Enable Edit Mode in the Homework & Assignment Governance bar before creating or grading records.",
                "Select Standard, Division, Subject, due date, and instructions, then publish the assignment.",
                "After class, open Checking Register (`/homework/checking`), choose the assignment, and mark each student's completion or review remarks.",
                "Open Daily Register Reports (`/homework/reports`) to review batch completion trends.",
            ],
            permissions=[
                "homework:view — Inspect assignments, checking registers, and completion statistics.",
                "homework:manage — Create assignments, update checking statuses, and manage homework templates.",
            ],
            workflows=[
                "Class Lecture Conducted -> Homework Assigned -> Notebook / Submission Checked -> Daily Register Reviewed.",
            ],
            mistakes=[
                "Assigning homework to the wrong Academic Year or Division when multiple batches share the same subject.",
                "Forgetting to save updated marks in the Checking Register before leaving the page.",
            ],
            troubleshooting=[
                "If students do not appear in the Checking Register, verify active batch allocations under Students -> Batch Allocations.",
                "Use filters by Standard, Division, and Subject at the top of the workspace to locate older assignments quickly.",
            ],
        ),
    },
    {
        "slug": "guide-forms",
        "category_slug": "module-guides",
        "section": "module_guide",
        "module_key": "forms",
        "title": "Print Forms and KYC Document Studio User Guide",
        "summary": "Generate standardized A4 admission forms, student/staff ID cards, fee notices, hall tickets, certificates, and print audit logs.",
        "tags": ["forms", "printing", "kyc", "id cards", "hall tickets", "certificates", "bulk print"],
        "required_permissions": ["forms:view", "forms:print", "Admin / Staff / Coordinator"],
        "related_routes": ["/forms", "/forms/admissions", "/forms/id-cards", "/forms/financial", "/forms/academic", "/forms/certificates", "/forms/bulk-print", "/forms/audit-logs"],
        "related_slugs": ["guide-students", "guide-examinations", "tutorial-receipt-generation"],
        "sort_order": 26,
        "content_markdown": _module_guide_markdown(
            title="Print Forms and KYC Document Studio User Guide",
            intro="Print Forms & KYC Document Studio produces standardized A4 dossiers, identity cards, official financial notices, examination hall tickets, transcripts, and institutional certificates using live master records.",
            purpose="Eliminate manual document retyping and maintain a verified Print Audit Trail across official student and staff paperwork.",
            operations=[
                "Generate printable Admission Forms and KYC profiles (`/forms/admissions`).",
                "Issue Student & Staff Identity Cards (`/forms/id-cards`).",
                "Print Receipts, Fee Notices, Exam Hall Tickets, Academic Transcripts, Leaving Certificates, and Experience Certificates (`/forms/financial`, `/forms/academic`, `/forms/certificates`).",
                "Batch-print documents via Bulk Print Spooler (`/forms/bulk-print`) and review Print Audit Logs (`/forms/audit-logs`).",
            ],
            steps=[
                "Navigate to Print Forms & KYC (`/forms`) and choose the required document category tab.",
                "Enable Edit Mode if updating template configurations or executing governed official certificate prints.",
                "Search and select the student, staff member, or division batch for generation.",
                "Inspect the live A4 preview carefully before clicking Print or exporting cleanly.",
                "Check Print Audit Trail (`/forms/audit-logs`) whenever you need to verify who generated an official document and when.",
            ],
            permissions=[
                "forms:view — Preview document catalogs and templates.",
                "forms:print — Render and print individual or bulk institutional documents.",
            ],
            workflows=[
                "Student Enrolled / Staff Onboarded -> ID Card & Admission Form Printed -> Exam Hall Ticket Issued -> Print Action Logged.",
            ],
            mistakes=[
                "Printing ID cards or certificates before verifying spelling of student name, photo upload, and batch details in Student Master.",
                "Disabling background graphics in browser print settings, hiding institutional header accents or badges.",
            ],
            troubleshooting=[
                "If official institution headers or logos are missing from A4 previews, verify Organization Name and Logo under Administration -> Settings.",
                "In Training Sandbox mode, document print previews automatically display sample simulation banners so test prints cannot be confused with live originals.",
            ],
        ),
    },
    {
        "slug": "guide-import-export",
        "category_slug": "module-guides",
        "section": "module_guide",
        "module_key": "import_export",
        "title": "Bulk Data Import and Export Module User Guide",
        "summary": "Paste spreadsheets from Excel, validate CSV/XLSX uploads with row previews, export filtered registers, and review import history.",
        "tags": ["import", "export", "excel", "csv", "bulk upload", "fee register"],
        "required_permissions": ["import_export:view", "import_export:execute", "Admin / SuperAdmin"],
        "related_routes": ["/import-export", "/fees/import", "/import/fee-register"],
        "related_slugs": ["guide-students", "guide-fees", "guide-reports"],
        "sort_order": 27,
        "content_markdown": _module_guide_markdown(
            title="Bulk Data Import and Export Module User Guide",
            intro="Import & Export Center streamlines onboarding structured student, faculty, and register spreadsheets via direct Excel copy-paste grids, file uploads, preview validation, and filtered CSV/XLSX exports.",
            purpose="Enable fast, error-checked institutional onboarding and portable spreadsheet exports without bypassing database validation rules.",
            operations=[
                "Paste tabular rows directly into the Excel-style grid (`Paste from Excel`) and map columns interactively (`/import-export`).",
                "Download official entity `.XLSX` / `.CSV` templates and upload populated files for dry-run validation before writing records.",
                "Export filtered student, fee, or operational data cleanly to `.XLSX` or `.CSV`.",
                "Inspect Import History logs and use Legacy Fee Register Import (`/fees/import`) for historical fee register onboarding.",
            ],
            steps=[
                "Open Import & Export (`/import-export`) and download the official `.XLSX` or `.CSV` template for the target entity.",
                "Switch ON Edit Mode in the Data Ingestion and Bulk Export Hub banner before executing any database write import.",
                "Select Create Only or Update Existing mode, then paste rows or upload your spreadsheet to run the validation preview.",
                "Resolve any highlighted row errors or unmapped columns shown in the validation preview before confirming execution.",
                "Inspect the Import History tab after completion to confirm total created, updated, or skipped rows.",
            ],
            permissions=[
                "import_export:view — Preview exports and inspect historical import logs.",
                "import_export:execute — Validate and commit bulk spreadsheet imports while Edit Mode is active.",
            ],
            workflows=[
                "Download Official Template -> Populate Data -> Run Dry-Run Preview Validation -> Confirm Import -> Verify in History.",
            ],
            mistakes=[
                "Uploading unformatted phone numbers, blank required columns, or duplicate admission numbers without running Preview first.",
                "Running Update Existing mode unintentionally when intending only to insert new students.",
            ],
            troubleshooting=[
                "If validation flags date or currency cells, format date columns as `YYYY-MM-DD` and remove currency symbols from numeric columns.",
                "For legacy 2024–2025 fee register workbooks, open Fee Register Migration (`/fees/import`) to review ledger discrepancies before confirming.",
            ],
        ),
    },
    {
        "slug": "guide-training",
        "category_slug": "module-guides",
        "section": "module_guide",
        "module_key": "training",
        "title": "Training and Simulation Sandbox User Guide",
        "summary": "Switch into the isolated PA001-DEMO Training Sandbox for staff practice, feature drills, and safe onboarding without affecting live data.",
        "tags": ["training", "demo", "sandbox", "onboarding", "practice"],
        "required_permissions": ["Authenticated Staff (Role-scoped)", "Admin / SuperAdmin for Reset"],
        "related_routes": ["/training"],
        "related_slugs": ["first-time-login", "initial-operational-checklist", "guide-settings"],
        "sort_order": 28,
        "content_markdown": _module_guide_markdown(
            title="Training and Simulation Sandbox User Guide",
            intro="The Training & Simulation Lab provides an isolated demonstration environment (`PA001-DEMO`) preloaded with sample data so coordinators, teachers, and accountants can practice workflows safely.",
            purpose="Protect real student rosters and live financial ledgers while new staff learn admissions, fee collection, receipts, attendance, and report card workflows.",
            operations=[
                "Inspect Training Sandbox status, active sessions, and sandbox activity logs (`/training`).",
                "Switch cleanly between Live Production and the isolated `PA001-DEMO` Training Sandbox via the confirmation modal.",
                "Allow authorized administrators to reset training sample data back to a clean baseline between staff workshops.",
            ],
            steps=[
                "Navigate to Training & Demo Lab (`/training`) from the Administration section.",
                "Click Enter Training Sandbox and confirm the switch in the modal banner.",
                "Verify the amber Training Mode indicator banner is active at the top of the screen before practicing entries.",
                "Practice workflows (such as sample fee collection or student admissions) without affecting live institute records.",
                "Exit Training Mode before resuming real institutional work.",
            ],
            permissions=[
                "Staff / Teacher / Accountant / Admin — Enter and practice inside the isolated Training Sandbox.",
                "Admin / SuperAdmin — Monitor training sessions and trigger sandbox baseline resets.",
            ],
            workflows=[
                "Enter Training Sandbox -> Practice End-to-End Workflows -> Reset Sandbox Data -> Switch Back to Live Production.",
            ],
            mistakes=[
                "Entering real newly admitted student records while the Training Sandbox indicator banner is still active.",
                "Confusing demo watermark printouts from Training Mode with live official receipts or certificates.",
            ],
            troubleshooting=[
                "If real students or recent live receipts appear missing, check the top banner to confirm you are not still inside Training Mode.",
                "If sample records in Training Mode become cluttered after workshops, ask an administrator to trigger a sandbox reset on `/training`.",
            ],
        ),
    },

    # =========================================================================
    # C. TUTORIALS & WORKFLOWS (13 Practical Operational Guides)
    # =========================================================================
    {
        "slug": "tutorial-student-admission",
        "category_slug": "tutorials",
        "section": "tutorial",
        "module_key": "admissions",
        "title": "Tutorial: Student Admission Workflow",
        "summary": "Step-by-step operational walkthrough from prospect inquiry capture to confirmed admission registration.",
        "tags": ["tutorial", "admission", "lead conversion", "intake"],
        "required_permissions": ["leads:create", "leads:convert", "students:admission"],
        "related_routes": ["/leads", "/students/admission"],
        "related_slugs": ["guide-admissions", "tutorial-student-enrollment"],
        "sort_order": 30,
        "content_markdown": """# Tutorial: Student Admission Workflow

This workflow covers admitting a new student either from an existing CRM enquiry or as a direct walk-in admission.

## Path A: Converting an Existing CRM Lead
1. Open **Admissions / CRM Leads** (`/leads`).
2. Locate the confirmed enquiry using the pipeline board or leads search bar.
3. Review logged follow-up notes and demo class feedback.
4. Click **Convert to Student** on the lead record (with Edit Mode active).
5. PrathamOne EduOS pre-fills student name, guardian contact, and preferred standard into the **Admission Intake** screen (`/students/admission`).

## Path B: Direct Walk-In Admission
1. Navigate directly to **Students -> Admission** (`/students/admission`).
2. Activate **Edit Mode** in the top governance bar.
3. Complete **Student Details** (Full Name, Date of Birth, Gender, Phone, Address) and verify **Admission Number** auto-generation or manual override.
4. Enter **Primary Guardian Details** (Name, Relationship, Mobile Number for SMS/WhatsApp receipts and alerts).
5. Select **Academic Year**, **Standard**, and **Division** for placement, then submit the admission form.

## Verification Checklist
- Open the newly created student in **Students** directory (`/students`) and verify their Guardian record and initial active status appear accurately.
""",
    },
    {
        "slug": "tutorial-student-enrollment",
        "category_slug": "tutorials",
        "section": "tutorial",
        "module_key": "students",
        "title": "Tutorial: Student Enrollment & Batch Placement",
        "summary": "How to enroll admitted students into an Academic Year, Standard, and Division and handle transfers or promotions.",
        "tags": ["tutorial", "enrollment", "division", "batch", "promotion"],
        "required_permissions": ["students:edit", "academic:manage"],
        "related_routes": ["/students", "/academic"],
        "related_slugs": ["guide-students", "tutorial-fee-structure-management"],
        "sort_order": 31,
        "content_markdown": """# Tutorial: Student Enrollment & Batch Placement

An **Enrollment** binds a canonical student record to a specific **Academic Year**, **Standard**, **Division/Batch**, and optional roll number.

## Enrolling or Updating Batch Placement
1. Open **Students** (`/students`) and click the target student to view their **Student Detail** profile.
2. Open the **Academic & Enrollment** section.
3. Activate **Edit Mode**.
4. Choose **Assign / Update Enrollment** and select:
   - **Academic Year** (e.g., Current active year)
   - **Standard / Course**
   - **Division / Batch** (confirm division capacity is sufficient)
   - **Roll Number** (optional or sequential)
5. Click **Save Changes**.

## What Happens Automatically
- The student now appears inside **Daily Attendance Roll Call** for that Division.
- The student becomes eligible for **Fee Structures** and **Examination Schedules** targeting that Academic Year and Standard.
""",
    },
    {
        "slug": "tutorial-fee-structure-management",
        "category_slug": "tutorials",
        "section": "tutorial",
        "module_key": "fees",
        "title": "Tutorial: Fee Structure Management",
        "summary": "Define reusable Fee Categories, configure Standard/Academic-Year Fee Structures, and assign them cleanly.",
        "tags": ["tutorial", "fee structure", "tuition", "installments"],
        "required_permissions": ["fees:manage"],
        "related_routes": ["/fees"],
        "related_slugs": ["guide-fees", "tutorial-fee-collection"],
        "sort_order": 32,
        "content_markdown": """# Tutorial: Fee Structure Management

Follow this procedure before invoicing students at the start of an academic term.

## Step 1: Verify Canonical Fee Categories
1. Navigate to **Fees & Payments** (`/fees`) and select **Fee Structures** (or **Settings -> Lookups**).
2. Confirm canonical Fee Categories exist once globally (for example: *Tuition Fee*, *Admission Fee*, *Examination Fee*, *Study Material Fee*). Never duplicate categories by standard name.

## Step 2: Create a Fee Structure
1. Enable **Edit Mode** in Fees & Payments.
2. Under **Fee Structures**, click **Create Fee Structure**.
3. Select the **Academic Year**, **Standard**, and **Fee Category**.
4. Enter Structure Name, Total Amount, Payment Frequency (Annual, Term-wise, Quarterly, Monthly), and Number of Installments.
5. Save the structure.

## Step 3: Assign to Students & Generate Invoices
1. In **Fee Invoicing**, assign the Fee Structure to individual students or a Standard/Division cohort.
2. Generate open **Fee Invoices** with installment due dates ready for the Collection Desk.
""",
    },
    {
        "slug": "tutorial-fee-collection",
        "category_slug": "tutorials",
        "section": "tutorial",
        "module_key": "fees",
        "title": "Tutorial: Fee Collection & Payment Allocation",
        "summary": "Collect full or installment fee payments at the Collection Desk and allocate funds cleanly across open invoices.",
        "tags": ["tutorial", "fee collection", "payments", "installment"],
        "required_permissions": ["payments:create"],
        "related_routes": ["/fees", "/payments"],
        "related_slugs": ["guide-fees", "tutorial-receipt-generation", "tutorial-concession-approval"],
        "sort_order": 33,
        "content_markdown": """# Tutorial: Fee Collection & Payment Allocation

1. Open **Fees & Payments -> Collection Desk** (`/fees`).
2. Search the student by **Name**, **Admission Number**, or **Guardian Phone**.
3. Inspect the student's **Open Invoices** summary showing Gross Fee, Applied Concessions/Scholarships, Previously Paid, and **Net Outstanding Balance**.
4. Select the invoice(s) being settled and enter the **Payment Amount** (full or partial installment).
5. Choose **Payment Method** (Cash, UPI, Cheque, Card, Bank Transfer) and enter transaction reference/cheque date where applicable.
6. Confirm **Payment Date** and click **Post Payment**.

## Key Safeguard
- Once posted, payments lock into the financial ledger and generate an official sequentially numbered receipt. Future modifications require `payments:edit_posted` authorization, active Edit Mode, an open Financial Period, and a documented audit reason.
""",
    },
    {
        "slug": "tutorial-receipt-generation",
        "category_slug": "tutorials",
        "section": "tutorial",
        "module_key": "fees",
        "title": "Tutorial: Official Receipt Generation & Sharing",
        "summary": "View, print, verify, or share official numbered fee receipts after payment collection.",
        "tags": ["tutorial", "receipt", "print", "share", "payment"],
        "required_permissions": ["fees:view", "payments:create"],
        "related_routes": ["/payments", "/fees"],
        "related_slugs": ["tutorial-fee-collection", "faq-fee-receipts", "faq-printing-problems"],
        "sort_order": 34,
        "content_markdown": """# Tutorial: Official Receipt Generation & Sharing

Every posted fee payment generates an official numbered **Payment Receipt** showing institution branding, student identity, invoice items paid, payment method, and date.

## Printing or Downloading a Receipt
1. Immediately after posting payment on the Collection Desk, click **View / Print Receipt** (or open **Payments** `/payments` -> click any receipt number).
2. Review the itemized breakdown, applied concessions, and balance remaining.
3. Click **Print Receipt** (choose browser *Save as PDF* to download a clean digital PDF, or send directly to an A4/A5 laser printer).

## Sharing with Parents
- From **Communication Center** or the receipt share action, generate a secure expiring view link or send receipt details via WhatsApp Web / Email directly to the primary guardian's contact.
""",
    },
    {
        "slug": "tutorial-concession-approval",
        "category_slug": "tutorials",
        "section": "tutorial",
        "module_key": "concessions",
        "title": "Tutorial: Concession Application and Approval",
        "summary": "Complete end-to-end guide for submitting, verifying, approving, and applying fee concessions or waivers.",
        "tags": ["tutorial", "concession", "waiver", "approval workflow"],
        "required_permissions": ["concessions:apply", "concessions:verify", "concessions:approve"],
        "related_routes": ["/fees/concessions"],
        "related_slugs": ["guide-concessions", "tutorial-scholarship-allocation"],
        "sort_order": 35,
        "content_markdown": """# Tutorial: Concession Application and Approval

Follow the governance workflow to grant authorized fee discounts safely.

## Stage 1: Submit Application
1. Go to **Fees & Payments -> Concessions & Waivers** (`/fees/concessions`).
2. Ensure **Edit Mode** is activated.
3. Click **Apply Concession** (or **Bulk Apply** for multiple eligible students).
4. Choose Student, Academic Year, and an active **Concession Type** (for example, *Sibling Discount* or *Staff Ward Waiver*).
5. Enter supporting remarks and click **Run Eligibility Check** if rule limits apply, then submit. Status starts as `Submitted`.

## Stage 2: Verify
1. A verifier (`concessions:verify`) opens the Submitted application, checks supporting facts, and clicks **Verify**.

## Stage 3: Approve & Apply to Invoice
1. An authorized approver (`concessions:approve`) clicks **Approve**.
2. Click **Apply to Invoice** (Allocate) to compute item-level reductions on the student's open Fee Invoices.
3. Open the invoice's **Concession Trace** modal anytime to inspect exact line-by-line deduction math.
""",
    },
    {
        "slug": "tutorial-scholarship-allocation",
        "category_slug": "tutorials",
        "section": "tutorial",
        "module_key": "scholarships",
        "title": "Tutorial: Scholarship & Sponsor Benefit Allocation",
        "summary": "Award merit scholarships or sponsor-funded benefits and track third-party sponsor settlements.",
        "tags": ["tutorial", "scholarship", "sponsor", "benefit"],
        "required_permissions": ["concessions:apply", "concessions:approve", "fees:manage"],
        "related_routes": ["/fees/concessions"],
        "related_slugs": ["guide-scholarships", "tutorial-concession-approval"],
        "sort_order": 36,
        "content_markdown": """# Tutorial: Scholarship & Sponsor Benefit Allocation

Scholarships and sponsor-funded benefits follow the unified governance workflow inside `/fees/concessions` with `Scholarship` or `Sponsor Funding` Benefit Types.

## Steps to Allocate a Scholarship
1. Open **Fees & Payments -> Concessions & Waivers** (`/fees/concessions`).
2. Filter or create a Benefit Type where **Benefit Category** is set to `scholarship` (or `sponsor_funding` if funded by an external trust/patron).
3. Activate **Edit Mode** and select **Apply Concession / Benefit** (or **Bulk Apply** for scholarship test winners).
4. Pick the target student(s), Academic Year, and Scholarship type, attach merit/rank justification notes, and submit.
5. Complete **Verify -> Approve -> Apply** so the scholarship credit deducts cleanly from the student's open fee invoice(s).

## Tracking Sponsor Reimbursements
- For `sponsor_funding` allocations, open the **Sponsor Settlements** section to log actual payments received from external sponsors against the funded student invoices.
""",
    },
    {
        "slug": "tutorial-attendance-recording",
        "category_slug": "tutorials",
        "section": "tutorial",
        "module_key": "attendance",
        "title": "Tutorial: Daily & QR Attendance Recording",
        "summary": "Record class attendance via Daily Roll Call or QR Terminal, review absentees, and trigger parent notifications.",
        "tags": ["tutorial", "attendance", "qr check-in", "roll call"],
        "required_permissions": ["attendance:mark"],
        "related_routes": ["/attendance"],
        "related_slugs": ["guide-attendance", "faq-attendance-discrepancies"],
        "sort_order": 37,
        "content_markdown": """# Tutorial: Daily & QR Attendance Recording

## Method 1: Daily Teacher Roll Call
1. Open **Attendance** (`/attendance`) -> **Daily Roll Call**.
2. Choose **Academic Year**, **Standard**, **Division**, and **Date**.
3. Click **Mark All Present** to set a quick baseline.
4. Toggle specific students to **Absent**, **Late**, **Half-Day**, or **Excused** as needed.
5. Click **Save Attendance**.

## Method 2: QR Terminal Check-In
1. Switch to **QR Terminal** inside **Attendance**.
2. Select the target batch/session window.
3. Scan student ID card QR codes sequentially; recognized students register Present immediately with timestamp validation.

## Post-Attendance Follow-Up
- Open **Defaulters & Alerts** to send absence alerts to parents via **Communication Center**.
""",
    },
    {
        "slug": "tutorial-timetable-preparation",
        "category_slug": "tutorials",
        "section": "tutorial",
        "module_key": "timetable",
        "title": "Tutorial: Timetable Preparation",
        "summary": "Create a conflict-free weekly timetable per division with teacher, subject, and classroom validation.",
        "tags": ["tutorial", "timetable", "schedule", "weekly"],
        "required_permissions": ["academic:manage"],
        "related_routes": ["/academic/timetable", "/timetable"],
        "related_slugs": ["guide-timetable", "branch-class-and-division-setup"],
        "sort_order": 38,
        "content_markdown": """# Tutorial: Timetable Preparation

1. Ensure **Standards**, **Divisions**, **Subject Mappings**, and **Teacher Assignments** are configured beforehand.
2. Open **Academic -> Timetable** (`/academic/timetable`).
3. Choose the **Academic Year**, **Standard**, and **Division**.
4. Activate **Edit Mode**.
5. Click **Add Period / Slot** and specify:
   - Day of Week (Monday–Sunday)
   - Start Time and End Time
   - Mapped Subject
   - Assigned Faculty Member
   - Classroom / Lab Name
6. Click **Save Slot**. PrathamOne EduOS checks for overlapping Division, Teacher, or Room schedules automatically and warns you of any conflict.
7. Repeat across weekdays until the weekly division schedule is complete. Teachers and Students see updated schedules automatically in their respective portals.
""",
    },
    {
        "slug": "tutorial-examination-scheduling",
        "category_slug": "tutorials",
        "section": "tutorial",
        "module_key": "examinations",
        "title": "Tutorial: Examination Scheduling",
        "summary": "Set up assessment schedules across standards and subjects with passing rules and optional question paper uploads.",
        "tags": ["tutorial", "exam", "scheduling", "question paper"],
        "required_permissions": ["exams:create", "exams:manage"],
        "related_routes": ["/examinations"],
        "related_slugs": ["guide-examinations", "tutorial-marks-entry"],
        "sort_order": 39,
        "content_markdown": """# Tutorial: Examination Scheduling

1. Navigate to **Examinations** (`/examinations`) -> **Exam Schedules**.
2. Toggle **Edit Mode** ON.
3. Click **Create / Schedule Exam**.
4. Enter Exam Name (e.g., *Unit Test 1 — Physics*), Academic Year, Standard, optional Division scope, and Subject.
5. Set **Exam Date**, Start/End Time, **Max Marks** (e.g., 100 or 50), and **Passing Marks** (e.g., 35 or 18).
6. Save the scheduled examination.
7. Optional: Switch to **Question Papers** tab to attach the official PDF question paper for authorized faculty retrieval.
""",
    },
    {
        "slug": "tutorial-marks-entry",
        "category_slug": "tutorials",
        "section": "tutorial",
        "module_key": "examinations",
        "title": "Tutorial: Marks Entry & Verification",
        "summary": "Enter student test marks rapidly, record absentees, validate against max marks, and save marksheets securely.",
        "tags": ["tutorial", "marks entry", "scores", "absentees"],
        "required_permissions": ["exams:enter_marks"],
        "related_routes": ["/examinations"],
        "related_slugs": ["tutorial-examination-scheduling", "tutorial-result-publication"],
        "sort_order": 40,
        "content_markdown": """# Tutorial: Marks Entry & Verification

1. Open **Examinations -> Marks Entry** (`/examinations`).
2. Filter by **Academic Year**, **Standard / Division**, and select the completed **Examination**.
3. Activate **Edit Mode**.
4. Enter each student's obtained score in the Marks column (never exceeding Max Marks) or mark the **Absent** checkbox for absent students.
5. Add optional teacher remarks per student if required.
6. Click **Save Marks**. Review the summary bar confirming Entered vs. Pending count reaches zero pending records before publication.
""",
    },
    {
        "slug": "tutorial-result-publication",
        "category_slug": "tutorials",
        "section": "tutorial",
        "module_key": "results",
        "title": "Tutorial: Result Publication & Report Cards",
        "summary": "Review class result analytics, publish scores cleanly to Student Portal, and generate printable Report Cards.",
        "tags": ["tutorial", "results", "publish", "report card"],
        "required_permissions": ["exams:publish"],
        "related_routes": ["/examinations/analytics", "/examinations/report-cards"],
        "related_slugs": ["guide-results", "tutorial-marks-entry"],
        "sort_order": 41,
        "content_markdown": """# Tutorial: Result Publication & Report Cards

1. Open **Examinations -> Result Analytics** (`/examinations/analytics`) to review cohort pass rate, average marks, grade distribution, and rank lists before release.
2. Confirm every subject exam under the test cycle has verified marks entered.
3. Activate **Edit Mode** and trigger **Publish Results** for the completed examination.
4. Once published:
   - Students and Parents can view official results inside **Student Portal -> Tests & Results**.
   - Coordinators can open **Report Cards** (`/examinations/report-cards`), select a division or student, inspect the formatted consolidated Report Card, and print or save as PDF.
""",
    },
    {
        "slug": "tutorial-report-generation",
        "category_slug": "tutorials",
        "section": "tutorial",
        "module_key": "reports",
        "title": "Tutorial: Analytical Report Generation & Export",
        "summary": "Run pre-configured management reports, slice columns inside ExcelReportGrid, and download XLSX or CSV files.",
        "tags": ["tutorial", "reports", "export", "xlsx", "csv"],
        "required_permissions": ["reports:view", "reports:export"],
        "related_routes": ["/reports"],
        "related_slugs": ["guide-reports", "faq-reports-exports"],
        "sort_order": 42,
        "content_markdown": """# Tutorial: Analytical Report Generation & Export

1. Navigate to **Reports & Analytics** (`/reports`).
2. Choose the category (**Financial**, **Student Directory**, **Attendance**, **Examinations**, or **Admissions**).
3. Select a specific report and set filters: **Academic Year**, **Date From / Date To**, **Standard**, and **Division**.
4. Click **Run / Generate Report**.
5. Review key highlights displayed in the top **Report Intelligence** banner, and use the interactive spreadsheet grid search/column filters to isolate specific cohorts.
6. Click **Export XLSX** for formatted Excel workbooks or **Export CSV** for universal spreadsheet processing.
""",
    },

    # =========================================================================
    # D. FAQ & TROUBLESHOOTING (12 Categorized Topics)
    # =========================================================================
    {
        "slug": "faq-login-account-access",
        "category_slug": "faq-troubleshooting",
        "section": "faq",
        "module_key": "settings",
        "title": "FAQ & Troubleshooting: Login and Account Access",
        "summary": "Answers for invalid credentials, inactive accounts, session timeout, and password reset requests.",
        "tags": ["faq", "login", "password", "session", "locked"],
        "required_permissions": ["Public / Authenticated"],
        "related_routes": ["/login", "/users"],
        "related_slugs": ["first-time-login", "faq-user-permissions"],
        "sort_order": 50,
        "content_markdown": """# Login and Account Access — FAQ & Troubleshooting

### Q: Why does login say my account is inactive or credentials are invalid?
- Confirm Caps Lock is off and you are entering your exact assigned username or registered email.
- If your administrator deactivated your user account (`is_active = false`), login is blocked until re-enabled in **Users & Roles**.

### Q: I forgot my password. How can it be reset?
- For security governance, contact your Institute Administrator or SuperAdmin. Authorized administrators can set a temporary password from **Administration -> Users & Roles**.

### Q: Why was I returned to the Login screen unexpectedly?
- Security tokens expire automatically after prolonged inactivity. Sign back in cleanly; any unsaved Edit Mode state resets safely to View Mode upon session expiry.
""",
    },
    {
        "slug": "faq-user-permissions",
        "category_slug": "faq-troubleshooting",
        "section": "faq",
        "module_key": "settings",
        "title": "FAQ & Troubleshooting: User Permissions & View Mode",
        "summary": "Resolve locked buttons, missing edit controls, View-First governance behavior, and role scope questions.",
        "tags": ["faq", "permissions", "edit mode", "rbac", "view mode"],
        "required_permissions": ["Authenticated User"],
        "related_routes": ["/users", "/settings"],
        "related_slugs": ["roles-and-permissions-guide", "faq-login-account-access"],
        "sort_order": 51,
        "content_markdown": """# User Permissions & View Mode — FAQ & Troubleshooting

### Q: Why are Create, Edit, and Delete buttons disabled even though I am logged in as Admin or Staff?
- PrathamOne EduOS enforces **Rule 010: Global View-First Governance**. Every workspace opens in protected **View Mode**. Click the **Edit Mode** toggle in the top governance bar to unlock permitted modifications for that screen.

### Q: Why did Edit Mode turn off when I switched pages?
- By security design, navigating away from a page or signing out automatically resets Edit Mode back to View Mode to protect records on shared desks.

### Q: I turned Edit Mode ON, but an action says Permission Required. Why?
- Roles control specific capabilities (for example, `payments:edit_posted` or `concessions:approve`). Ask your SuperAdmin/Principal to verify your role permissions under **Users & Roles**.
""",
    },
    {
        "slug": "faq-student-records",
        "category_slug": "faq-troubleshooting",
        "section": "faq",
        "module_key": "students",
        "title": "FAQ & Troubleshooting: Student Records & Enrollments",
        "summary": "Troubleshoot missing students in batch rosters, duplicate admission numbers, and exit/reactivation workflows.",
        "tags": ["faq", "students", "enrollment", "exit", "reactivate"],
        "required_permissions": ["students:view"],
        "related_routes": ["/students"],
        "related_slugs": ["guide-students", "tutorial-student-enrollment"],
        "sort_order": 52,
        "content_markdown": """# Student Records & Enrollments — FAQ & Troubleshooting

### Q: A newly admitted student appears in the Student Directory, but not in Attendance or Fee Batch assignment. Why?
- Check two things in **Student Detail**:
  1. Confirm the student has an active **Enrollment** for the **Current Academic Year** and chosen **Standard/Division**.
  2. Confirm the top filter in Attendance/Fees is set to the same **Academic Year**.

### Q: Should we delete a student who dropped out mid-year?
- **No.** Deleting students with financial or academic records is blocked by audit protection. Instead, use **Exit / Withdraw Student** inside Edit Mode. Historical fee receipts and attendance stay intact, and the student can be reactivated later if they re-join.
""",
    },
    {
        "slug": "faq-fee-calculations",
        "category_slug": "faq-troubleshooting",
        "section": "faq",
        "module_key": "fees",
        "title": "FAQ & Troubleshooting: Fee Calculations & Invoices",
        "summary": "Understand gross vs net fee totals, concession deductions, installment balances, and recalculation checks.",
        "tags": ["faq", "fee calculations", "net payable", "installments", "invoices"],
        "required_permissions": ["fees:view"],
        "related_routes": ["/fees"],
        "related_slugs": ["guide-fees", "faq-concessions-waivers"],
        "sort_order": 53,
        "content_markdown": """# Fee Calculations & Invoices — FAQ & Troubleshooting

### Q: How does PrathamOne EduOS calculate Net Payable on an invoice?
- `Net Payable = Sum(Invoice Item Gross Amounts) - Sum(Applied Concessions & Scholarships) - Sum(Posted Payments Allocated)`.
- Submitted or approved concessions only reduce Net Payable once they reach **Applied / Allocated** state.

### Q: Why can't I modify a Fee Structure amount after invoices are generated?
- Modifying template master rules never alters already-issued historical invoices silently. If a student's fee needs adjustment after invoicing, issue a supplemental invoice, apply a governed Concession, or process an authorized invoice adjustment inside Edit Mode.
""",
    },
    {
        "slug": "faq-fee-receipts",
        "category_slug": "faq-troubleshooting",
        "section": "faq",
        "module_key": "fees",
        "title": "FAQ & Troubleshooting: Fee Receipts & Posted Payments",
        "summary": "Troubleshoot receipt lookup, posted payment edit locks, reversals, and closed Financial Period restrictions.",
        "tags": ["faq", "receipts", "payments", "reversal", "period lock"],
        "required_permissions": ["fees:view", "payments:create"],
        "related_routes": ["/payments", "/fees"],
        "related_slugs": ["tutorial-receipt-generation", "faq-printing-problems"],
        "sort_order": 54,
        "content_markdown": """# Fee Receipts & Posted Payments — FAQ & Troubleshooting

### Q: A receipt shows an incorrect payment mode (for example, Cash instead of UPI). How do we correct it?
- Authorized accounting users with `payments:edit_posted` permission can open **Payments** (`/payments`), activate Edit Mode, click Edit on the posted payment, update non-locked details, and supply a mandatory audit reason.
- If the receipt belongs to a **Closed Financial Period**, editing is blocked to preserve closed books; consult Admin/Accountant to record a reversal/adjustment in the open period.

### Q: Can a posted receipt number be reused after a reversal?
- **No.** Reversed payments retain their unique audit trail and receipt number while adjusting ledger balances cleanly via reversal records.
""",
    },
    {
        "slug": "faq-concessions-waivers",
        "category_slug": "faq-troubleshooting",
        "section": "faq",
        "module_key": "concessions",
        "title": "FAQ & Troubleshooting: Concessions and Waivers",
        "summary": "Resolve eligibility mismatches, stacking blocks, pending verification states, and reversal questions.",
        "tags": ["faq", "concessions", "waivers", "stacking", "reverse"],
        "required_permissions": ["fees:view", "concessions:apply"],
        "related_routes": ["/fees/concessions"],
        "related_slugs": ["guide-concessions", "tutorial-concession-approval"],
        "sort_order": 55,
        "content_markdown": """# Concessions and Waivers — FAQ & Troubleshooting

### Q: We approved a student's concession, so why does the Collection Desk still show full fees?
- Verify the application status in `/fees/concessions`. An application moves through `Submitted -> Verified -> Approved -> Applied`. Clicking **Apply to Invoice** allocates the discount lines onto the open invoice.

### Q: Why did eligibility check block a second concession on the same student?
- Check **Allow Stacking** and **Max Cap** rules on both Concession Types. Non-stackable concessions prevent accidental double-discounting unless explicitly authorized on the Concession Type configuration.
""",
    },
    {
        "slug": "faq-scholarship-allocation",
        "category_slug": "faq-troubleshooting",
        "section": "faq",
        "module_key": "scholarships",
        "title": "FAQ & Troubleshooting: Scholarship Allocation & Sponsors",
        "summary": "Answers on locating scholarship workflows, sponsor funding vs waivers, and external sponsor settlements.",
        "tags": ["faq", "scholarship", "sponsor settlement", "benefit type"],
        "required_permissions": ["fees:view", "concessions:approve"],
        "related_routes": ["/fees/concessions"],
        "related_slugs": ["guide-scholarships", "tutorial-scholarship-allocation"],
        "sort_order": 56,
        "content_markdown": """# Scholarship Allocation — FAQ & Troubleshooting

### Q: Where are Scholarships managed in PrathamOne EduOS?
- Scholarships and external Sponsor Benefits share the unified **Concessions, Waivers & Scholarships** governance module at `/fees/concessions` (inside **Fees & Payments**) using **Benefit Type = Scholarship / Sponsor Funding**. This prevents duplicate discount tables across student ledgers.

### Q: What is the difference between a Merit Scholarship and Sponsor Funding?
- A **Merit Scholarship** reduces the student's collectible fee as an institutional award. **Sponsor Funding** marks part or all of the student's fee to be reimbursed by a third-party sponsor/trust, tracked cleanly in **Sponsor Settlements**.
""",
    },
    {
        "slug": "faq-printing-problems",
        "category_slug": "faq-troubleshooting",
        "section": "faq",
        "module_key": "fees",
        "title": "FAQ & Troubleshooting: Printing Receipts, ID Cards & Report Cards",
        "summary": "Fix clipped margins, missing institute headers/colors, blank pages, and PDF print layout settings.",
        "tags": ["faq", "printing", "pdf", "receipt print", "report card", "id card"],
        "required_permissions": ["Authenticated User"],
        "related_routes": ["/payments", "/examinations/report-cards", "/students"],
        "related_slugs": ["tutorial-receipt-generation", "guide-results"],
        "sort_order": 57,
        "content_markdown": """# Printing Problems — FAQ & Troubleshooting

### Q: Colors, logos, or shaded table headers disappear when printing a Receipt or Report Card.
- In your browser Print dialog (`Ctrl+P` / `Cmd+P`), expand **More settings** and enable **Background graphics**. Ensure browser **Headers and footers** is turned OFF so URL strings do not print at the top/bottom of official documents.

### Q: Content spills onto a second blank page.
- Select **Paper size: A4** (or the matching receipt paper format configured in **Settings -> Printing**) and set **Margins: Default** or **Minimum** with **Scale: 100%** (or *Fit to page width*).
""",
    },
    {
        "slug": "faq-attendance-discrepancies",
        "category_slug": "faq-troubleshooting",
        "section": "faq",
        "module_key": "attendance",
        "title": "FAQ & Troubleshooting: Attendance Discrepancies",
        "summary": "Resolve percentage differences, QR check-in errors, missing divisions, and approved leave handling.",
        "tags": ["faq", "attendance", "qr", "percentage", "leave"],
        "required_permissions": ["attendance:view"],
        "related_routes": ["/attendance"],
        "related_slugs": ["guide-attendance", "tutorial-attendance-recording"],
        "sort_order": 58,
        "content_markdown": """# Attendance Discrepancies — FAQ & Troubleshooting

### Q: Why does Monthly Register percentage differ from what we manually counted?
- Check how **Late**, **Half-Day**, and **Approved Excused** days are configured in **Attendance -> Settings**, and confirm whether a session date was marked as a batch holiday vs. unmarked day.

### Q: A student scanned their ID card at QR Terminal, but received 'Enrollment Not Found'.
- Confirm the student's Admission Number/QR code corresponds to an Active student currently enrolled in the selected **Division** and **Academic Year**.
""",
    },
    {
        "slug": "faq-examination-result-issues",
        "category_slug": "faq-troubleshooting",
        "section": "faq",
        "module_key": "examinations",
        "title": "FAQ & Troubleshooting: Examination and Result Issues",
        "summary": "Troubleshoot locked marksheets, unpublished results in Student Portal, grade thresholds, and absentee counts.",
        "tags": ["faq", "exams", "marks", "results", "student portal"],
        "required_permissions": ["exams:view"],
        "related_routes": ["/examinations", "/examinations/report-cards"],
        "related_slugs": ["guide-examinations", "guide-results"],
        "sort_order": 59,
        "content_markdown": """# Examination and Result Issues — FAQ & Troubleshooting

### Q: Marks were saved by the teacher, so why can't students see results in Student Portal?
- Saved marks remain internal draft/verified records until an authorized coordinator/principal activates Edit Mode and clicks **Publish Result**.

### Q: Why did a student who scored above minimum marks get marked Fail?
- Verify both **Passing Marks** on the specific Exam Schedule and **Grade / Passing Threshold Settings** under **Examinations -> Settings** (some multi-subject report cards require passing every individual component).
""",
    },
    {
        "slug": "faq-reports-exports",
        "category_slug": "faq-troubleshooting",
        "section": "faq",
        "module_key": "reports",
        "title": "FAQ & Troubleshooting: Reports and Exports",
        "summary": "Solve empty report grids, spreadsheet encoding characters, date range mismatches, and slow large exports.",
        "tags": ["faq", "reports", "xlsx", "csv", "exports"],
        "required_permissions": ["reports:view", "reports:export"],
        "related_routes": ["/reports"],
        "related_slugs": ["guide-reports", "tutorial-report-generation"],
        "sort_order": 60,
        "content_markdown": """# Reports and Exports — FAQ & Troubleshooting

### Q: Exporting CSV shows special currency symbols strangely in older Microsoft Excel versions.
- Use **Export XLSX** whenever opening reports in Microsoft Excel. XLSX preserves UTF-8 rupee (`₹`) symbols, column headers, and numeric data types automatically.

### Q: My report shows no data even though transactions exist today.
- Check the **Date To** filter and **Academic Year** selector at the top of the Reports workspace. Also confirm your user role is permitted to view financial vs. academic datasets.
""",
    },
    {
        "slug": "faq-common-application-errors",
        "category_slug": "faq-troubleshooting",
        "section": "faq",
        "module_key": "dashboard",
        "title": "FAQ & Troubleshooting: Common Application Errors & Reference IDs",
        "summary": "How to interpret error notifications, copy Support Error Reference IDs, recover connectivity, and submit a ticket.",
        "tags": ["faq", "errors", "error reference", "troubleshooting", "support"],
        "required_permissions": ["Authenticated User"],
        "related_routes": ["/help/support"],
        "related_slugs": ["faq-login-account-access", "faq-user-permissions"],
        "sort_order": 61,
        "content_markdown": """# Common Application Errors — FAQ & Troubleshooting

### Q: What is an Error Reference ID (for example `ERR-2026-...`) shown in an alert banner?
- PrathamOne EduOS generates a structured Error Reference ID whenever an unexpected validation or server condition occurs so you never have to share sensitive technical traces. Copy that **Error Reference ID** and include it when filing a ticket in **Support Centre**.

### Q: What do common status messages mean?
- **Access / Governance Lock:** Either Edit Mode is OFF or your role lacks permission for the operation.
- **Validation Error:** Required fields (such as guardian mobile, due date, or positive amount) need correction before saving.
- **Duplicate / Conflict Error:** A unique value (Admission Number, Receipt Number, Timetable teacher/room slot) already exists.
- **Temporary Connection Issue:** Refresh the page or wait a moment; if persistent, ask your Administrator to review **System Information -> Application Health**.
""",
    },

    # =========================================================================
    # E. LEGAL & COMPLIANCE (6 Dedicated Pages — Marked Pending Approval Until Authorized)
    # =========================================================================
    {
        "slug": "terms-and-conditions",
        "category_slug": "legal-compliance",
        "section": "legal",
        "module_key": "legal",
        "title": "Terms and Conditions",
        "summary": "Commercial and operational Terms & Conditions governing institutional use of PrathamOne EduOS (Management Approval Pending).",
        "tags": ["legal", "terms", "conditions", "compliance"],
        "required_permissions": ["Authenticated User"],
        "related_routes": ["/help/legal/terms-and-conditions"],
        "related_slugs": ["software-license-agreement", "acceptable-use-policy", "privacy-policy"],
        "approval_status": "pending_approval",
        "status": "pending_approval",
        "sort_order": 70,
        "content_markdown": """# Terms and Conditions

> **Management Approval Required:** Formal legal Terms and Conditions text has not yet been published by authorized management. Do not treat this notice as final binding legal counsel until approved and published in Help Governance.

## Current Verified Platform Scope
- **Product:** PrathamOne EduOS (Coaching Institute Edition)
- **Developer & Product Owner:** AITDL — AI Technology & Development Lab & SMRITI Systems
- **Publishing Status:** Pending formal legal review and management sign-off.
""",
    },
    {
        "slug": "privacy-policy",
        "category_slug": "legal-compliance",
        "section": "legal",
        "module_key": "legal",
        "title": "Privacy Policy",
        "summary": "Institutional and personal data privacy commitments and contact notice (Management Approval Pending).",
        "tags": ["legal", "privacy", "dpdp", "data privacy"],
        "required_permissions": ["Authenticated User"],
        "related_routes": ["/help/legal/privacy-policy"],
        "related_slugs": ["data-protection-policy", "terms-and-conditions"],
        "approval_status": "pending_approval",
        "status": "pending_approval",
        "sort_order": 71,
        "content_markdown": """# Privacy Policy

> **Management Approval Required:** The official external Privacy Policy document is awaiting formal review and authorization by product management and the subscribing institution's data fiduciary.

## Verified Software Safeguards Active in PrathamOne EduOS
- Role-based data access boundaries ensure student, guardian, staff, and financial records are restricted strictly to authorized user roles.
- Institutional administrators govern user accounts, data retention rules, and communication preferences within **Settings**.
""",
    },
    {
        "slug": "data-protection-policy",
        "category_slug": "legal-compliance",
        "section": "legal",
        "module_key": "legal",
        "title": "Data Protection Policy",
        "summary": "Data governance, retention, auditability, and DPDP Act 2023 alignment controls (Formal Policy Approval Pending).",
        "tags": ["legal", "data protection", "dpdp 2023", "retention", "audit"],
        "required_permissions": ["Authenticated User"],
        "related_routes": ["/help/legal/data-protection-policy", "/housekeeping"],
        "related_slugs": ["privacy-policy", "acceptable-use-policy"],
        "approval_status": "pending_approval",
        "status": "pending_approval",
        "sort_order": 72,
        "content_markdown": """# Data Protection Policy

> **Management Approval Required:** Formal binding Data Protection Policy clauses are pending official management ratification before customer legal publication.

## Verified Technical Data Protection Controls Implemented in Software
- **View-First Governance:** Protects records from unintended creation, alteration, or deletion via explicit Edit Mode locking.
- **Immutable Audit & Ledger Trails:** Financial receipts, concession allocations, setting updates, and administrative actions record actor identity and timestamps.
- **Role Segregation & Credential Protection:** Passwords and system secrets remain encrypted/excluded from user views and System Information screens.
- **Retention & Housekeeping Governance:** Controlled archival and retention schedules aligned with Indian DPDP Act 2023 operational principles.
""",
    },
    {
        "slug": "software-license-agreement",
        "category_slug": "legal-compliance",
        "section": "legal",
        "module_key": "legal",
        "title": "Software License Agreement",
        "summary": "Proprietary software licensing terms for PrathamOne EduOS (Formal Agreement Approval Pending).",
        "tags": ["legal", "license", "eula", "proprietary"],
        "required_permissions": ["Authenticated User"],
        "related_routes": ["/help/legal/software-license-agreement", "/help/version"],
        "related_slugs": ["copyright-notice", "terms-and-conditions"],
        "approval_status": "pending_approval",
        "status": "pending_approval",
        "sort_order": 73,
        "content_markdown": """# Software License Agreement

> **Management Approval Required:** The full commercial End-User Software License Agreement (EULA) text requires official management approval prior to legal publication.

## Verified Licensing Facts
- **Software:** PrathamOne EduOS
- **License Model:** Proprietary software owned by AITDL — AI Technology & Development Lab & SMRITI Systems.
- **License Validity & Entitlements:** Live subscription/license status and authorized modules are displayed dynamically under **Product & Version Information** once configured by product administration.
""",
    },
    {
        "slug": "copyright-notice",
        "category_slug": "legal-compliance",
        "section": "legal",
        "module_key": "legal",
        "title": "Copyright Notice",
        "summary": "Intellectual property and copyright ownership attribution for PrathamOne EduOS.",
        "tags": ["legal", "copyright", "intellectual property", "aitdl", "smriti systems"],
        "required_permissions": ["Authenticated User"],
        "related_routes": ["/help/legal/copyright-notice", "/help/about-company"],
        "related_slugs": ["software-license-agreement", "terms-and-conditions"],
        "approval_status": "pending_approval",
        "status": "pending_approval",
        "sort_order": 74,
        "content_markdown": """# Copyright Notice

> **Management Approval Required:** Formal statutory copyright notice text for customer distribution is flagged for management legal approval.

## Verified Ownership Attribution
- **Copyright Owner:** `Copyright © 2026 AITDL (AI Technology & Development Lab). All rights reserved.`
- **Product:** PrathamOne EduOS — Education Management Operating System (Coaching Institute Edition).
- **Developer & Product Owner:** AITDL & SMRITI Systems.
- **Distinction Notice:** All coaching institute content, student data, marks, and financial records remain the property of the respective subscribing institution (e.g., Prashant Academy Coaching Institute), separate from PrathamOne EduOS software ownership.
""",
    },
    {
        "slug": "acceptable-use-policy",
        "category_slug": "legal-compliance",
        "section": "legal",
        "module_key": "legal",
        "title": "Acceptable Use Policy",
        "summary": "Authorized institutional, academic, and communication usage standards (Management Approval Pending).",
        "tags": ["legal", "acceptable use", "security policy", "communication"],
        "required_permissions": ["Authenticated User"],
        "related_routes": ["/help/legal/acceptable-use-policy"],
        "related_slugs": ["terms-and-conditions", "data-protection-policy"],
        "approval_status": "pending_approval",
        "status": "pending_approval",
        "sort_order": 75,
        "content_markdown": """# Acceptable Use Policy

> **Management Approval Required:** Formal Acceptable Use Policy clauses are awaiting final administrative approval.

## Core Operational Principles
- Institute user accounts are assigned per individual and must not be shared across staff members.
- Communication channels (WhatsApp, Email, SMS) must only be used for legitimate educational, fee, attendance, and institutional notices.
- Unauthorized attempts to bypass role permissions, financial period locks, or Edit Mode governance controls are prohibited and audited.
""",
    },
    {
        "slug": "third-party-acknowledgements",
        "category_slug": "legal-compliance",
        "section": "legal",
        "module_key": "legal",
        "title": "Third-Party & Open-Source Software Acknowledgements",
        "summary": "Verified PrathamOne EduOS product credits, engineering ownership, and third-party open-source software component acknowledgements.",
        "tags": ["legal", "credits", "acknowledgements", "open-source", "third-party", "licenses"],
        "required_permissions": ["Authenticated User"],
        "related_routes": ["/help/legal/third-party-acknowledgements", "/help/about-company"],
        "related_slugs": ["copyright-notice", "software-license-agreement"],
        "approval_status": "approved",
        "status": "published",
        "sort_order": 76,
        "content_markdown": """# Third-Party & Open-Source Software Acknowledgements

> **Authorized Notice:** Approved by Management for customer publication under **PrathamOne EduOS Legal & Compliance**.

## PrathamOne EduOS Product & Engineering Credits
- **Product:** PrathamOne EduOS — Education Management Operating System (Coaching Institute Edition).
- **Developer & Product Owner:** AITDL (AI Technology & Development Lab) & SMRITI Systems.
- **Product Architect:** Jawahar R. Mallah.
- **Subscribing Institution Data Ownership:** All student records, fee ledgers, marks, and institutional assets remain the sole property of the subscribing coaching institute.

## Verified Frontend Web Interface Components
PrathamOne EduOS builds upon the following verified web technologies and libraries:

| Component | Purpose in PrathamOne EduOS | Attribution / License |
| :--- | :--- | :--- |
| React & React DOM | Interactive user interface rendering | MIT |
| React Router | Workspace navigation and contextual routing | MIT |
| TanStack React Query & Axios | Server data caching and API communication | MIT |
| Zustand | Client session and View-First Edit Mode state | MIT |
| Tailwind CSS | Unified visual design system and responsive layouts | MIT |
| Lucide Icons | Consistent application and navigation iconography | ISC |
| Recharts | Academic and financial analytics visualizations | MIT |
| React Hook Form & Zod | Structured form handling and schema validation | MIT |
| `write-excel-file` | Spreadsheet `.xlsx` export generation | MIT |
| `date-fns`, `clsx`, `react-hot-toast` | Date formatting, styling helpers, and notifications | MIT |

## Verified Backend Application & Data Processing Components
The PrathamOne EduOS application services incorporate the following verified Python and database components:

| Component | Purpose in PrathamOne EduOS | Attribution / License |
| :--- | :--- | :--- |
| FastAPI & Pydantic | REST API services and payload validation | MIT |
| SQLAlchemy & Alembic | Relational database modeling and schema management | MIT |
| `asyncpg` | High-performance PostgreSQL database driver | Apache-2.0 |
| PyJWT & Cryptography | Cryptographic token signing and verification | MIT / Apache-2.0 |
| Passlib | Password hashing and credential security | BSD |
| `openpyxl` | Excel workbook reading and report export generation | MIT |
| `qrcode` & `Pillow` | Receipt verification QR code and image rendering | BSD / HPND |
| `slowapi` & `httpx` | Request rate protection and HTTP service client | MIT / BSD-3-Clause |
| PyMuPDF | PDF document processing and report generation | AGPL-3.0 |

## Copyright & License Notice
Respective copyrights, trademarks, and open-source licenses remain with their original authors and maintainers. Open-source components are distributed under their respective stated licenses.
""",
    },
]
