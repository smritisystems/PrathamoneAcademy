#!/usr/bin/env python3
# /**
#  * @file        manage_headers.py
#  * @project     Prashant Academy Coaching Institute Management System
#  * @module      scripts
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
#  * @description Source code attribution, header enforcement, and verification automation tool.
#  */

import os
import sys
import re
import argparse
import datetime
import subprocess

# Ensure UTF-8 output encoding on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

PROJECT_NAME = "Prashant Academy Coaching Institute Management System"
AUTHOR = "Jawahar R. Mallah"
ORGANIZATION = "AITDL (AI Technology & Development Lab)"
CLIENT = "Prashant Academy Coaching Institute"
COPYRIGHT = "Copyright (c) 2026 AITDL"
LICENSE = "Proprietary"
DEFAULT_VERSION = "1.0.0"

TODAY = datetime.date.today().strftime("%Y-%m-%d")

EXCLUDE_DIRS = {
    'node_modules', '.git', '__pycache__', '.pytest_cache', '.vitest_cache',
    'dist', 'dist-ssr', 'build', 'venv', '.venv', 'env', 'develop-eggs', 'eggs', '.eggs',
    '.pytest_cache', '.idea', '.vscode'
}

EXCLUDE_FILES = {
    'backup_prashant_academy_pre_reset.sql',
    'package-lock.json',
    'academic_settings.json',
    'tsconfig.json',
    'tsconfig.node.json'
}

SUPPORTED_EXTENSIONS = {
    '.ts': 'c-style',
    '.tsx': 'c-style',
    '.js': 'c-style',
    '.jsx': 'c-style',
    '.css': 'c-style',
    '.py': 'hash-style',
}

# Catalog of known files with accurate module and description
CATALOG = {
    "backend/alembic/env.py": (
        "backend.alembic",
        "Alembic runtime environment script configuring database connections and migration execution context."
    ),
    "backend/alembic/versions/001_initial_schema.py": (
        "backend.alembic.versions",
        "Initial database schema migration creating core tables for students, users, courses, and fees."
    ),
    "backend/alembic/versions/002_fee_register_imports.py": (
        "backend.alembic.versions",
        "Database migration adding fee register import batch tracking and reconciliation fields."
    ),
    "backend/alembic/versions/003_add_boards.py": (
        "backend.alembic.versions",
        "Database migration introducing boards table and linking educational boards to standards."
    ),
    "backend/alembic/versions/004_student_portal_and_profile.py": (
        "backend.alembic.versions",
        "Database migration extending student profile fields and student portal credentials."
    ),
    "backend/alembic/versions/005_division_name_and_indexes.py": (
        "backend.alembic.versions",
        "Database migration adding division name aliases and query optimization indexes."
    ),
    "backend/alembic/versions/006_academic_batch_workspace.py": (
        "backend.alembic.versions",
        "Database migration supporting academic batch capacity, teachers, and timetable links."
    ),
    "backend/alembic/versions/007_data_import_export_logs.py": (
        "backend.alembic.versions",
        "Database migration creating import/export job logs and audit tracking tables."
    ),
    "backend/alembic/versions/008_user_management_and_scopes.py": (
        "backend.alembic.versions",
        "Database migration extending user management fields, scope definitions, and access logs."
    ),
    "backend/app/__init__.py": (
        "backend.app",
        "Backend package initialization for Prashant Academy Coaching Institute API application."
    ),
    "backend/app/api/__init__.py": (
        "backend.app.api",
        "API routing package initialization."
    ),
    "backend/app/api/v1/__init__.py": (
        "backend.app.api.v1",
        "API version 1 package initialization."
    ),
    "backend/app/api/v1/router.py": (
        "backend.app.api.v1",
        "Central v1 API router registering all domain endpoint routers."
    ),
    "backend/app/api/v1/endpoints/__init__.py": (
        "backend.app.api.v1.endpoints",
        "API v1 endpoints package initialization."
    ),
    "backend/app/api/v1/endpoints/academic_years.py": (
        "backend.app.api.v1.endpoints",
        "API endpoints for academic year lifecycle, current session selection, and validation."
    ),
    "backend/app/api/v1/endpoints/attendance.py": (
        "backend.app.api.v1.endpoints",
        "API endpoints for student attendance tracking, session marking, and absenteeism reporting."
    ),
    "backend/app/api/v1/endpoints/auth.py": (
        "backend.app.api.v1.endpoints",
        "API endpoints for user authentication, password verification, and JWT session issuance."
    ),
    "backend/app/api/v1/endpoints/boards.py": (
        "backend.app.api.v1.endpoints",
        "API endpoints for educational boards management, standards mapping, and academic hierarchy."
    ),
    "backend/app/api/v1/endpoints/dashboard.py": (
        "backend.app.api.v1.endpoints",
        "API endpoints for administrative and coaching institute executive dashboard analytics."
    ),
    "backend/app/api/v1/endpoints/divisions.py": (
        "backend.app.api.v1.endpoints",
        "API endpoints for batch/division management, teacher allocation, capacity, and scheduling."
    ),
    "backend/app/api/v1/endpoints/enrollments.py": (
        "backend.app.api.v1.endpoints",
        "API endpoints for student course and batch enrollment, transfers, and status tracking."
    ),
    "backend/app/api/v1/endpoints/examinations.py": (
        "backend.app.api.v1.endpoints",
        "API endpoints for exam creation, marks entry, grading formulas, and report card generation."
    ),
    "backend/app/api/v1/endpoints/fees.py": (
        "backend.app.api.v1.endpoints",
        "API endpoints for fee obligations, payment collections, receipts, trends, and ledger reconciliation."
    ),
    "backend/app/api/v1/endpoints/import_export.py": (
        "backend.app.api.v1.endpoints",
        "API endpoints for bulk spreadsheet import/export, template generation, and async job tracking."
    ),
    "backend/app/api/v1/endpoints/import_register.py": (
        "backend.app.api.v1.endpoints",
        "API endpoints for legacy fee register spreadsheet parsing and ledger migration."
    ),
    "backend/app/api/v1/endpoints/institutions.py": (
        "backend.app.api.v1.endpoints",
        "API endpoints for multi-branch institute profile configuration and campus metadata."
    ),
    "backend/app/api/v1/endpoints/payments.py": (
        "backend.app.api.v1.endpoints",
        "API endpoints for transaction recording, payment reversals, audit logs, and receipt vouchers."
    ),
    "backend/app/api/v1/endpoints/reports.py": (
        "backend.app.api.v1.endpoints",
        "API endpoints for academic, attendance, faculty load, and fee collection reporting."
    ),
    "backend/app/api/v1/endpoints/standards.py": (
        "backend.app.api.v1.endpoints",
        "API endpoints for standards/classes management, board associations, and settings."
    ),
    "backend/app/api/v1/endpoints/student_portal.py": (
        "backend.app.api.v1.endpoints",
        "API endpoints dedicated to authenticated student dashboard views, timetables, and grades."
    ),
    "backend/app/api/v1/endpoints/students.py": (
        "backend.app.api.v1.endpoints",
        "API endpoints for student CRUD, profile editing, guardian details, and identity documents."
    ),
    "backend/app/api/v1/endpoints/subjects.py": (
        "backend.app.api.v1.endpoints",
        "API endpoints for academic subjects master catalogue and curriculum syllabus mapping."
    ),
    "backend/app/api/v1/endpoints/timetable.py": (
        "backend.app.api.v1.endpoints",
        "API endpoints for class timetable scheduling, room allocation, and collision detection."
    ),
    "backend/app/api/v1/endpoints/users.py": (
        "backend.app.api.v1.endpoints",
        "API endpoints for user account administration, RBAC roles, security scopes, and invitations."
    ),
    "backend/app/core/__init__.py": (
        "backend.app.core",
        "Backend core system modules package initialization."
    ),
    "backend/app/core/config.py": (
        "backend.app.core",
        "Global application settings, environment variables, security secrets, and CORS policies."
    ),
    "backend/app/core/database.py": (
        "backend.app.core",
        "SQLAlchemy database engine, session factory, and declarative base definitions."
    ),
    "backend/app/core/deps.py": (
        "backend.app.core",
        "FastAPI dependency injection providers for database sessions and authenticated user context."
    ),
    "backend/app/core/limiter.py": (
        "backend.app.core",
        "SlowAPI rate limiter instance and request throttling utilities."
    ),
    "backend/app/core/security.py": (
        "backend.app.core",
        "Cryptographic hashing, password salt verification, and JWT access token encoders."
    ),
    "backend/app/main.py": (
        "backend.app",
        "FastAPI application entry point, CORS middleware, exception handlers, and v1 router mounting."
    ),
    "backend/app/models/__init__.py": (
        "backend.app.models",
        "SQLAlchemy ORM models package exporting all database entity definitions."
    ),
    "backend/app/models/academic_year.py": (
        "backend.app.models",
        "SQLAlchemy model defining the AcademicYear entity and session date boundaries."
    ),
    "backend/app/models/attendance.py": (
        "backend.app.models",
        "SQLAlchemy model defining daily student attendance records and status flags."
    ),
    "backend/app/models/board.py": (
        "backend.app.models",
        "SQLAlchemy model defining educational examination boards (e.g. ICSE, CBSE, SSC)."
    ),
    "backend/app/models/division.py": (
        "backend.app.models",
        "SQLAlchemy model defining batch/division sections, classroom capacity, and assigned faculty."
    ),
    "backend/app/models/enrollment.py": (
        "backend.app.models",
        "SQLAlchemy model defining student enrollment in classes, batches, and academic years."
    ),
    "backend/app/models/exam.py": (
        "backend.app.models",
        "SQLAlchemy models defining exams, test schedules, subjects, and student score marks."
    ),
    "backend/app/models/fee.py": (
        "backend.app.models",
        "SQLAlchemy models defining fee structures, fee categories, invoices, and installments."
    ),
    "backend/app/models/import_log.py": (
        "backend.app.models",
        "SQLAlchemy model defining data import/export job logs, statuses, and error summaries."
    ),
    "backend/app/models/institution.py": (
        "backend.app.models",
        "SQLAlchemy model defining coaching institute branch entities and institutional settings."
    ),
    "backend/app/models/payment.py": (
        "backend.app.models",
        "SQLAlchemy model defining financial transactions, payment modes, and receipt numbering."
    ),
    "backend/app/models/portal.py": (
        "backend.app.models",
        "SQLAlchemy models defining student portal credentials, announcements, and study material links."
    ),
    "backend/app/models/standard.py": (
        "backend.app.models",
        "SQLAlchemy model defining standard/class levels associated with education boards."
    ),
    "backend/app/models/student.py": (
        "backend.app.models",
        "SQLAlchemy model defining student personal profile, contact information, and parent records."
    ),
    "backend/app/models/subject.py": (
        "backend.app.models",
        "SQLAlchemy model defining academic curriculum subjects and standard associations."
    ),
    "backend/app/models/user.py": (
        "backend.app.models",
        "SQLAlchemy model defining system user accounts, authentication credentials, and RBAC roles."
    ),
    "backend/app/schemas/__init__.py": (
        "backend.app.schemas",
        "Pydantic validation schemas package exporting all API transfer objects."
    ),
    "backend/app/schemas/board.py": (
        "backend.app.schemas",
        "Pydantic schemas for educational board creation, update, and serialized responses."
    ),
    "backend/app/schemas/division.py": (
        "backend.app.schemas",
        "Pydantic schemas for batch/division validation, teacher assignments, and roster queries."
    ),
    "backend/app/schemas/fee.py": (
        "backend.app.schemas",
        "Pydantic schemas for fee structures, invoices, payment receipts, and collection summaries."
    ),
    "backend/app/schemas/institution.py": (
        "backend.app.schemas",
        "Pydantic schemas for coaching institute institution details and settings."
    ),
    "backend/app/schemas/payment.py": (
        "backend.app.schemas",
        "Pydantic schemas for payment processing, collection requests, and transaction receipts."
    ),
    "backend/app/schemas/portal.py": (
        "backend.app.schemas",
        "Pydantic schemas for student portal authentication, schedule views, and exam results."
    ),
    "backend/app/schemas/standard.py": (
        "backend.app.schemas",
        "Pydantic schemas for class/standard levels and academic subject associations."
    ),
    "backend/app/schemas/student.py": (
        "backend.app.schemas",
        "Pydantic schemas for student admission, profile updates, and parent contact information."
    ),
    "backend/app/schemas/subject.py": (
        "backend.app.schemas",
        "Pydantic schemas for curriculum subject creation, categorization, and listing."
    ),
    "backend/app/schemas/user.py": (
        "backend.app.schemas",
        "Pydantic schemas for user account creation, profile modifications, and role assignments."
    ),
    "backend/app/services/data_exporter.py": (
        "backend.app.services",
        "Service for exporting student, fee, academic, and attendance data to Excel and CSV formats."
    ),
    "backend/app/services/data_importer.py": (
        "backend.app.services",
        "Service for parsing, validating, duplicate-checking, and importing batch data from spreadsheets."
    ),
    "backend/app/services/fee_register_importer.py": (
        "backend.app.services",
        "Service for importing legacy coaching institute fee registers and generating installment invoices."
    ),
    "backend/scripts/acceptance_audit.py": (
        "backend.scripts",
        "Comprehensive system acceptance audit script validating database entities and API routes."
    ),
    "backend/scripts/enrich_academic_workspace.py": (
        "backend.scripts",
        "Database utility populating comprehensive academic structure, batches, and timetable sessions."
    ),
    "backend/scripts/inspect_excel.py": (
        "backend.scripts",
        "Diagnostic utility inspecting sheets and header rows in uploaded Excel import workbooks."
    ),
    "backend/scripts/reset_and_import_actual_data.py": (
        "backend.scripts",
        "Database initialization script resetting schema and seeding actual Prashant Academy datasets."
    ),
    "backend/scripts/rollback_board_class_structure.py": (
        "backend.scripts",
        "Database migration rollback utility reverting educational board table schema changes."
    ),
    "backend/scripts/seed_student_portal_data.py": (
        "backend.scripts",
        "Database seeding utility creating test student accounts, credentials, and academic history."
    ),
    "backend/scripts/update_board_class_structure.py": (
        "backend.scripts",
        "Database maintenance script migrating standards to new multi-board relational schema."
    ),
    "backend/seed.py": (
        "backend.root",
        "Database master seeder initializing superadmin account, demo batches, and curriculum subjects."
    ),
    "backend/tests/__init__.py": (
        "backend.tests",
        "Backend pytest test suite package initialization."
    ),
    "backend/tests/conftest.py": (
        "backend.tests",
        "Pytest configuration fixtures providing test database session, test client, and auth helpers."
    ),
    "backend/tests/test_academic_module_deep.py": (
        "backend.tests",
        "Pytest integration tests verifying complete academic hierarchy, capacities, and scheduling."
    ),
    "backend/tests/test_academic_workspace.py": (
        "backend.tests",
        "Pytest suite testing academic structure CRUD endpoints, tree queries, and batch rosters."
    ),
    "backend/tests/test_board_class_structure.py": (
        "backend.tests",
        "Pytest suite testing board-to-standard relationships and cascading foreign key operations."
    ),
    "backend/tests/test_dashboard.py": (
        "backend.tests",
        "Pytest suite validating dashboard KPI metrics calculations and active student counters."
    ),
    "backend/tests/test_fee_register_import.py": (
        "backend.tests",
        "Pytest suite testing fee register spreadsheet parsing, validation rules, and error handling."
    ),
    "backend/tests/test_import_export.py": (
        "backend.tests",
        "Pytest suite verifying Excel and CSV template generation, column mapping, and import jobs."
    ),
    "backend/tests/test_payments.py": (
        "backend.tests",
        "Pytest suite validating payment recording, invoice reconciliation, and receipt generation."
    ),
    "backend/tests/test_student_portal.py": (
        "backend.tests",
        "Pytest suite testing student portal authentication, schedule views, and results queries."
    ),
    "backend/tests/test_student_profile_edit.py": (
        "backend.tests",
        "Pytest suite verifying administrative editing across all student master profile fields."
    ),
    "backend/tests/test_user_management.py": (
        "backend.tests",
        "Pytest suite testing user account management, role assignments, and permission boundaries."
    ),
    "frontend/postcss.config.js": (
        "frontend.config",
        "PostCSS configuration registering Tailwind CSS and Autoprefixer plugins."
    ),
    "frontend/tailwind.config.js": (
        "frontend.config",
        "Tailwind CSS theme configuration, responsive breakpoints, and custom animation utilities."
    ),
    "frontend/vite.config.ts": (
        "frontend.config",
        "Vite build configuration setting up React plugin, test runner environment, and dev proxy."
    ),
    "frontend/src/App.tsx": (
        "frontend.app",
        "Root React application component defining client-side routing, route guards, and suspense fallbacks."
    ),
    "frontend/src/index.css": (
        "frontend.styles",
        "Global application stylesheet defining Tailwind directives, typography, and print vouchers."
    ),
    "frontend/src/main.tsx": (
        "frontend.root",
        "Vite React application entry point initializing DOM root, query client, and global styles."
    ),
    "frontend/src/api/client.ts": (
        "frontend.api",
        "Axios HTTP client instance configured with base URL, authentication headers, and response interceptors."
    ),
    "frontend/src/api/endpoints.ts": (
        "frontend.api",
        "Centralized API client functions mapping all backend endpoints for academic, fees, and students."
    ),
    "frontend/src/components/Badge.tsx": (
        "frontend.components",
        "Reusable status badge and pill components with unified semantic color themes."
    ),
    "frontend/src/components/CascadingFilters.tsx": (
        "frontend.components",
        "Cascading filter bar component for academic year, board, class, and batch selection."
    ),
    "frontend/src/components/ErrorBoundary.tsx": (
        "frontend.components",
        "React error boundary catching runtime component errors and displaying fallback diagnostics."
    ),
    "frontend/src/components/Layout.tsx": (
        "frontend.components",
        "Master application shell component providing header navigation, collapsible sidebar, and main view outlet."
    ),
    "frontend/src/components/Modal.tsx": (
        "frontend.components",
        "Accessible modal dialog component with backdrop blur, focus trap, and keyboard dismissal."
    ),
    "frontend/src/components/Pagination.tsx": (
        "frontend.components",
        "Reusable table pagination bar with page size selector, item counters, and page navigation."
    ),
    "frontend/src/components/Sidebar.tsx": (
        "frontend.components",
        "Collapsible multi-state sidebar navigation supporting expanded, icon-rail, and mobile drawer modes."
    ),
    "frontend/src/components/StatCard.tsx": (
        "frontend.components",
        "KPI metric stat card component with icon container, trend indicator, and status badge."
    ),
    "frontend/src/pages/AcademicWorkspace.tsx": (
        "frontend.pages",
        "Flagship Academic Structure & Batch Management workspace featuring 9 tabs, tree view, and batch cards."
    ),
    "frontend/src/pages/AddStudent.tsx": (
        "frontend.pages",
        "Multi-step student admission form capturing personal details, parent info, and initial enrollment."
    ),
    "frontend/src/pages/Attendance.tsx": (
        "frontend.pages",
        "Attendance management page for daily batch roll call, attendance registers, and absenteeism tracking."
    ),
    "frontend/src/pages/Batches.tsx": (
        "frontend.pages",
        "Batch directory page redirected to Academic Workspace batch management tab."
    ),
    "frontend/src/pages/Courses.tsx": (
        "frontend.pages",
        "Courses and study materials catalog page managing syllabi and learning resources."
    ),
    "frontend/src/pages/Dashboard.tsx": (
        "frontend.pages",
        "Main executive dashboard displaying institute KPIs, admissions trend, upcoming batches, and fee status."
    ),
    "frontend/src/pages/Examinations.tsx": (
        "frontend.pages",
        "Examinations and test series workspace managing exam schedules, marks entry, and student reports."
    ),
    "frontend/src/pages/FeeCollection.tsx": (
        "frontend.pages",
        "Student fee collection terminal for recording payments against outstanding installments."
    ),
    "frontend/src/pages/Fees.tsx": (
        "frontend.pages",
        "Flagship Fees & Payments workspace featuring overview analytics, fee register, payments, and receipts."
    ),
    "frontend/src/pages/ImportExport.tsx": (
        "frontend.pages",
        "Data Import/Export workspace featuring Excel copy-paste spreadsheet grid and file upload."
    ),
    "frontend/src/pages/ImportFeeRegister.tsx": (
        "frontend.pages",
        "Legacy fee register import wizard for spreadsheet mapping, preview, and validation."
    ),
    "frontend/src/pages/Login.tsx": (
        "frontend.pages",
        "User login authentication page with credential validation, role redirection, and session persistence."
    ),
    "frontend/src/pages/NotFound.tsx": (
        "frontend.pages",
        "404 Not Found error page with navigation shortcuts back to dashboard."
    ),
    "frontend/src/pages/Payments.tsx": (
        "frontend.pages",
        "Standalone payment transactions ledger and audit log page."
    ),
    "frontend/src/pages/Receipt.tsx": (
        "frontend.pages",
        "Official printable fee receipt voucher page with amount-in-words converter."
    ),
    "frontend/src/pages/Reports.tsx": (
        "frontend.pages",
        "Institute reports center offering academic, financial, attendance, and faculty analytical exports."
    ),
    "frontend/src/pages/Standards.tsx": (
        "frontend.pages",
        "Standards page redirected to Academic Workspace classes management tab."
    ),
    "frontend/src/pages/StudentDashboard.tsx": (
        "frontend.pages",
        "Dedicated student portal dashboard presenting enrolled courses, timetable, and exam results."
    ),
    "frontend/src/pages/StudentDetail.tsx": (
        "frontend.pages",
        "Comprehensive student profile workspace with multi-tab master record editing for administrators."
    ),
    "frontend/src/pages/Students.tsx": (
        "frontend.pages",
        "Student directory page with multi-field search, status filtering, and fast profile navigation."
    ),
    "frontend/src/pages/Subjects.tsx": (
        "frontend.pages",
        "Subjects directory page managing academic curriculum subjects by board and class."
    ),
    "frontend/src/pages/UserProfile.tsx": (
        "frontend.pages",
        "Dedicated user profile management workspace for inspecting activity logs, scopes, and passwords."
    ),
    "frontend/src/pages/Users.tsx": (
        "frontend.pages",
        "User management dashboard listing system accounts, roles, access scopes, and invitation workflows."
    ),
    "frontend/src/store/authStore.ts": (
        "frontend.store",
        "Zustand state store managing user authentication token, logged-in profile, and active institute ID."
    ),
    "frontend/src/store/sidebarStore.ts": (
        "frontend.store",
        "Zustand state store managing responsive sidebar layout state, collapsed rails, and mobile drawer."
    ),
    "frontend/src/test/AcademicWorkspace.test.tsx": (
        "frontend.test",
        "Vitest test suite verifying Academic Workspace navigation, KPIs, batch cards, and roster modals."
    ),
    "frontend/src/test/Badge.test.tsx": (
        "frontend.test",
        "Vitest unit tests verifying badge component variant classes, icons, and label rendering."
    ),
    "frontend/src/test/FeesModule.test.tsx": (
        "frontend.test",
        "Vitest test suite verifying Fees & Payments overview KPIs, charts, filters, and receipt modals."
    ),
    "frontend/src/test/ImportExport.test.tsx": (
        "frontend.test",
        "Vitest test suite verifying spreadsheet copy-paste grid, file upload validation, and CSV export."
    ),
    "frontend/src/test/Sidebar.test.tsx": (
        "frontend.test",
        "Vitest test suite verifying sidebar collapse/expand states, keyboard shortcuts, and active links."
    ),
    "frontend/src/test/StudentPortal.test.tsx": (
        "frontend.test",
        "Vitest test suite validating student dashboard portal tab switching and schedule rendering."
    ),
    "frontend/src/test/StudentProfileEdit.test.tsx": (
        "frontend.test",
        "Vitest test suite validating administrator editing across all student master profile fields."
    ),
    "frontend/src/test/UserProfile.test.tsx": (
        "frontend.test",
        "Vitest test suite verifying user profile details rendering, role badges, and security reset modals."
    ),
    "frontend/src/test/Users.test.tsx": (
        "frontend.test",
        "Vitest test suite verifying user management directory filters, role metrics, and table sorting."
    ),
    "frontend/src/test/setup.ts": (
        "frontend.test",
        "Vitest test setup configuration polyfilling ResizeObserver, matchMedia, and JSDOM mocks."
    ),
    "frontend/src/types/index.ts": (
        "frontend.types",
        "Master TypeScript declarations and interfaces for models, API responses, filters, and state."
    ),
    "scripts/manage_headers.py": (
        "scripts",
        "Source code attribution, header enforcement, and verification automation tool."
    ),
    "scripts/version_bump.py": (
        "scripts",
        "Semantic versioning manager updating version numbers across packages and configurations."
    )
}

def infer_module_and_description(rel_path: str) -> tuple[str, str]:
    """Infers module and description for new/unlisted files."""
    norm_path = rel_path.replace("\\", "/")
    if norm_path in CATALOG:
        return CATALOG[norm_path]
    
    parts = norm_path.split("/")
    filename = os.path.basename(norm_path)
    base, ext = os.path.splitext(filename)

    # Infer module from path
    if norm_path.startswith("backend/"):
        subparts = [p for p in parts[:-1] if p not in ('app',)]
        mod = ".".join(subparts) if subparts else "backend"
    elif norm_path.startswith("frontend/src/"):
        subparts = [p for p in parts[1:-1]]
        mod = ".".join(subparts) if subparts else "frontend"
    else:
        mod = parts[0] if len(parts) > 1 else "root"

    # Infer human-readable description
    clean_name = base.replace("_", " ").replace("-", " ").title()
    desc = f"Source component for {clean_name} in the {mod} module."
    return mod, desc

def get_file_dates(file_path: str) -> tuple[str, str]:
    """Retrieves file creation and modification dates in YYYY-MM-DD format."""
    try:
        st = os.stat(file_path)
        ctime = datetime.datetime.fromtimestamp(st.st_ctime).strftime("%Y-%m-%d")
        mtime = datetime.datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d")
        # Ensure created is not in the future
        if ctime > TODAY:
            ctime = TODAY
        return ctime, mtime
    except Exception:
        return TODAY, TODAY

def render_header(style: str, filename: str, module: str, created: str, updated: str, description: str, version: str = DEFAULT_VERSION) -> str:
    """Renders the standard header in the requested comment syntax."""
    if style == 'c-style':
        lines = [
            "/**",
            f" * @file        {filename}",
            f" * @project     {PROJECT_NAME}",
            f" * @module      {module}",
            " *",
            f" * @author      {AUTHOR}",
            f" * @organization {ORGANIZATION}",
            f" * @client      {CLIENT}",
            f" * @copyright   {COPYRIGHT}",
            f" * @license     {LICENSE}",
            " *",
            f" * @version     {version}",
            f" * @created     {created}",
            f" * @updated     {updated}",
            " *",
            f" * @description {description}",
            " */"
        ]
        return "\n".join(lines) + "\n"
    elif style == 'hash-style':
        lines = [
            "# /**",
            f"#  * @file        {filename}",
            f"#  * @project     {PROJECT_NAME}",
            f"#  * @module      {module}",
            "#  *",
            f"#  * @author      {AUTHOR}",
            f"#  * @organization {ORGANIZATION}",
            f"#  * @client      {CLIENT}",
            f"#  * @copyright   {COPYRIGHT}",
            f"#  * @license     {LICENSE}",
            "#  *",
            f"#  * @version     {version}",
            f"#  * @created     {created}",
            f"#  * @updated     {updated}",
            "#  *",
            f"#  * @description {description}",
            "#  */"
        ]
        return "\n".join(lines) + "\n"
    else:
        raise ValueError(f"Unsupported header comment style: {style}")

HEADER_TAGS = [
    "@file", "@project", "@module", "@author", "@organization",
    "@client", "@copyright", "@license", "@version", "@created",
    "@updated", "@description"
]

def parse_existing_header(content: str) -> tuple[dict | None, int, int]:
    """
    Parses an existing header block from file content.
    Returns (header_data_dict, start_char_index, end_char_index) or (None, -1, -1).
    """
    # Look for C-style block at top (after optional blank lines)
    c_match = re.search(r'^\s*/\*\*(.*?)\*/[ \t]*\r?\n?', content, re.DOTALL)
    if c_match and "@file" in c_match.group(1):
        block = c_match.group(1)
        data = extract_tags_from_text(block)
        if len(data) >= 8:  # sufficient tags present
            return data, c_match.start(), c_match.end()

    # Look for hash-style block at top (after optional shebang)
    lines = content.splitlines(keepends=True)
    start_idx = 0
    # Skip shebang if present
    if lines and lines[0].startswith("#!"):
        start_idx = 1

    hash_lines = []
    block_start_char = sum(len(l) for l in lines[:start_idx])
    found_header = False
    header_end_line = start_idx

    for i in range(start_idx, min(start_idx + 35, len(lines))):
        line = lines[i]
        stripped = line.strip()
        if stripped.startswith("#"):
            hash_lines.append(stripped)
            if "@file" in stripped or "@project" in stripped:
                found_header = True
            header_end_line = i + 1
        elif not stripped and not found_header:
            # Leading empty lines before header
            continue
        else:
            break

    if found_header:
        block_text = "\n".join(hash_lines)
        data = extract_tags_from_text(block_text)
        if len(data) >= 8:
            end_char = sum(len(l) for l in lines[:header_end_line])
            return data, block_start_char, end_char

    return None, -1, -1

def extract_tags_from_text(text: str) -> dict:
    """Extracts @tag value pairs from a comment block text."""
    data = {}
    for tag in HEADER_TAGS:
        pattern = rf'{re.escape(tag)}\s+([^\r\n]+)'
        m = re.search(pattern, text)
        if m:
            data[tag] = m.group(1).strip()
    return data

def validate_header_data(rel_path: str, data: dict) -> list[str]:
    """Validates that extracted header data conforms to all attribution rules."""
    errors = []
    filename = os.path.basename(rel_path)

    # Check all required tags
    for tag in HEADER_TAGS:
        if tag not in data or not data[tag]:
            errors.append(f"Missing required header tag: {tag}")

    if errors:
        return errors

    # Check exact values
    if data["@file"] != filename:
        errors.append(f"@file mismatch: expected '{filename}', got '{data['@file']}'")

    if data["@project"] != PROJECT_NAME:
        errors.append(f"@project mismatch: expected '{PROJECT_NAME}', got '{data['@project']}'")

    if data["@author"] != AUTHOR:
        errors.append(f"@author mismatch: expected '{AUTHOR}', got '{data['@author']}'")

    if data["@organization"] != ORGANIZATION:
        errors.append(f"@organization mismatch: expected '{ORGANIZATION}', got '{data['@organization']}'")

    if data["@client"] != CLIENT:
        errors.append(f"@client mismatch: expected '{CLIENT}', got '{data['@client']}'")

    if data["@copyright"] != COPYRIGHT:
        errors.append(f"@copyright mismatch: expected '{COPYRIGHT}', got '{data['@copyright']}'")

    if data["@license"] != LICENSE:
        errors.append(f"@license mismatch: expected '{LICENSE}', got '{data['@license']}'")

    # Validate version semver
    if not re.match(r'^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$', data["@version"]):
        errors.append(f"@version is not valid semver: '{data['@version']}'")

    # Validate dates
    for dtag in ["@created", "@updated"]:
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', data[dtag]):
            errors.append(f"{dtag} date format is not YYYY-MM-DD: '{data[dtag]}'")

    # Validate non-empty description
    if len(data.get("@description", "")) < 5:
        errors.append(f"@description is too short or missing: '{data.get('@description', '')}'")

    return errors

def find_candidate_files(target_dir: str = ".", staged_only: bool = False, specific_files: list[str] = None) -> list[str]:
    """Finds all first-party source files subject to header rules."""
    if specific_files:
        result = []
        for f in specific_files:
            rel = os.path.relpath(f, target_dir).replace("\\", "/")
            ext = os.path.splitext(rel)[1].lower()
            if ext in SUPPORTED_EXTENSIONS and rel not in EXCLUDE_FILES:
                result.append(rel)
        return sorted(result)

    if staged_only:
        try:
            output = subprocess.check_output(
                ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
                text=True,
                cwd=target_dir
            )
            files = []
            for line in output.splitlines():
                rel = line.strip().replace("\\", "/")
                if not rel:
                    continue
                ext = os.path.splitext(rel)[1].lower()
                if ext in SUPPORTED_EXTENSIONS and rel not in EXCLUDE_FILES:
                    # Check not in exclude dirs
                    parts = rel.split("/")
                    if not any(p in EXCLUDE_DIRS for p in parts):
                        files.append(rel)
            return sorted(files)
        except Exception as e:
            print(f"Warning: git command failed: {e}. Falling back to filesystem scan.")

    files = []
    for root, dirs, filenames in os.walk(target_dir):
        # Prune excluded directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith('.')]
        for f in filenames:
            ext = os.path.splitext(f)[1].lower()
            if ext in SUPPORTED_EXTENSIONS and f not in EXCLUDE_FILES:
                rel = os.path.relpath(os.path.join(root, f), target_dir).replace("\\", "/")
                # Ensure no excluded path component
                parts = rel.split("/")
                if not any(p in EXCLUDE_DIRS for p in parts):
                    files.append(rel)
    return sorted(files)

def process_file_check(rel_path: str) -> list[str]:
    """Checks a single file for header compliance."""
    try:
        with open(rel_path, 'r', encoding='utf-8') as fp:
            content = fp.read()
    except Exception as e:
        return [f"Unable to read file: {e}"]

    data, start, end = parse_existing_header(content)
    if not data:
        return ["Missing standard source-code header"]

    return validate_header_data(rel_path, data)

def process_file_fix(rel_path: str, update_timestamp: bool = False) -> tuple[bool, str]:
    """
    Applies or repairs the header on a single file.
    Returns (was_modified, status_message).
    """
    try:
        with open(rel_path, 'r', encoding='utf-8') as fp:
            content = fp.read()
    except Exception as e:
        return False, f"Read error: {e}"

    filename = os.path.basename(rel_path)
    ext = os.path.splitext(rel_path)[1].lower()
    style = SUPPORTED_EXTENSIONS[ext]

    catalog_mod, catalog_desc = infer_module_and_description(rel_path)
    ctime, mtime = get_file_dates(rel_path)

    existing_data, start, end = parse_existing_header(content)

    if existing_data:
        # Preserve original creation date and version if valid
        created = existing_data.get("@created") or ctime
        version = existing_data.get("@version") or DEFAULT_VERSION
        description = existing_data.get("@description") or catalog_desc
        module = existing_data.get("@module") or catalog_mod

        if update_timestamp:
            updated = TODAY
        else:
            updated = existing_data.get("@updated") or mtime

        new_header = render_header(
            style=style,
            filename=filename,
            module=module,
            created=created,
            updated=updated,
            description=description,
            version=version
        )

        existing_slice = content[start:end]
        if existing_slice == new_header:
            return False, "Already up-to-date"

        # Replace header cleanly
        new_content = content[:start] + new_header + content[end:].lstrip("\r\n")
        # Ensure single blank line between header and code
        if not new_content[len(content[:start]) + len(new_header):].startswith("\n"):
            new_content = content[:start] + new_header + "\n" + content[end:].lstrip("\r\n")

        with open(rel_path, 'w', encoding='utf-8', newline='\n') as fp:
            fp.write(new_content)
        return True, "Updated header"

    else:
        # Generate brand new header
        created = ctime
        updated = TODAY
        new_header = render_header(
            style=style,
            filename=filename,
            module=catalog_mod,
            created=created,
            updated=updated,
            description=catalog_desc,
            version=DEFAULT_VERSION
        )

        # Handle shebang lines in Python
        if content.startswith("#!"):
            lines = content.splitlines(keepends=True)
            shebang = lines[0]
            rest = "".join(lines[1:]).lstrip("\r\n")
            new_content = shebang + "\n" + new_header + "\n" + rest
        else:
            new_content = new_header + "\n" + content.lstrip("\r\n")

        with open(rel_path, 'w', encoding='utf-8', newline='\n') as fp:
            fp.write(new_content)
        return True, "Inserted new header"

def cmd_check(args):
    """Executes the check command."""
    files = find_candidate_files(staged_only=args.staged, specific_files=args.files)
    print(f"\n[CHECK] Verifying source-code attribution headers on {len(files)} file(s)...")

    errors_by_file = {}
    passed_count = 0

    for f in files:
        errs = process_file_check(f)
        if errs:
            errors_by_file[f] = errs
        else:
            passed_count += 1

    print("\n====================== Header Verification Summary ======================")
    print(f"Total checked: {len(files)}")
    print(f"Passed:        {passed_count}")
    print(f"Failed:        {len(errors_by_file)}")

    if errors_by_file:
        print("\n[FAIL] Discrepancies identified:")
        for f, errs in sorted(errors_by_file.items()):
            print(f"  * {f}:")
            for e in errs:
                print(f"      - {e}")
        print("\n[ACTION] Run 'python scripts/manage_headers.py fix' to automatically resolve these.\n")
        return 1
    else:
        print("\n[PASS] All source files satisfy attribution and header compliance rules!\n")
        return 0

def cmd_fix(args):
    """Executes the fix command."""
    files = find_candidate_files(staged_only=args.staged, specific_files=args.files)
    print(f"\n[FIX] Processing source headers on {len(files)} file(s)...")

    updated_count = 0
    unchanged_count = 0

    for f in files:
        modified, status = process_file_fix(f, update_timestamp=args.update_timestamp)
        if modified:
            print(f"  [FIXED] {f} ({status})")
            updated_count += 1
        else:
            unchanged_count += 1

    print("\n====================== Header Fix Summary ======================")
    print(f"Total processed: {len(files)}")
    print(f"Modified:        {updated_count}")
    print(f"Unchanged:       {unchanged_count}")
    print("=================================================================\n")
    return 0

def main():
    parser = argparse.ArgumentParser(
        description="Source code attribution and header automation tool for Prashant Academy."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # check command
    check_parser = subparsers.add_parser("check", help="Verify that all files have valid headers.")
    check_parser.add_argument("--staged", action="store_true", help="Only check git staged files.")
    check_parser.add_argument("files", nargs="*", help="Optional specific files to check.")

    # fix command
    fix_parser = subparsers.add_parser("fix", help="Insert or update headers across source files.")
    fix_parser.add_argument("--staged", action="store_true", help="Only fix git staged files.")
    fix_parser.add_argument("--update-timestamp", action="store_true", help="Update @updated to today's date.")
    fix_parser.add_argument("files", nargs="*", help="Optional specific files to fix.")

    args = parser.parse_args()

    if args.command == "check":
        sys.exit(cmd_check(args))
    elif args.command == "fix":
        sys.exit(cmd_fix(args))

if __name__ == "__main__":
    main()
