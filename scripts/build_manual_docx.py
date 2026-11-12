# /**
#  * @file        build_manual_docx.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-06
#  * @updated     2026-11-12
#  *
#  * @description Source component for Build Manual Docx in the scripts module.
#  */

"""PrathamOne EduOS - Master Manual DOCX Builder using python-docx.

Generates:
PrathamOne_Academy_Complete_User_Manual.docx

Product: PrathamOne Coaching Institutes Enterprise Suite
Website: https://prathamone.com
Author: Jawahar R Mallah
Organization: AITDL — AI Technology & Development Lab
Version: 1.0.0 (2026.11.06-STABLE-v1.0.0)
Date: November 2026
"""

import os
import sys
import shutil
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

SCREENSHOTS_DIR = os.path.abspath("docs/user_manual/screenshots")
ASSETS_DIR = os.path.abspath("docs/assets")
DOCX_DIR = os.path.abspath("docs/user_manual/docx")
ROOT_MANUAL_DIR = os.path.abspath("docs/user_manual")

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = OxmlElement(m)
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def add_callout(doc, text, title="NOTE", color="1e40af", bg_color="eff6ff"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, bg_color)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)

    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    r_title = p.add_run(f"[{title}] ")
    r_title.bold = True
    r_title.font.name = "Arial"
    r_title.font.size = Pt(9.5)
    r_title.font.color.rgb = RGBColor(int(color[:2], 16), int(color[2:4], 16), int(color[4:], 16))

    r_text = p.add_run(text)
    r_text.font.name = "Arial"
    r_text.font.size = Pt(9.5)
    r_text.font.color.rgb = RGBColor(0x1e, 0x29, 0x3b)

    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_before = Pt(0)
    p_after.paragraph_format.space_after = Pt(4)

def add_figure(doc, filename, caption):
    img_path = os.path.join(SCREENSHOTS_DIR, filename)
    if not os.path.exists(img_path):
        asset_path = os.path.join(ASSETS_DIR, filename)
        if os.path.exists(asset_path):
            img_path = asset_path
    if os.path.exists(img_path):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(10)
        p_img.paragraph_format.space_after = Pt(4)
        run_img = p_img.add_run()
        run_img.add_picture(img_path, width=Inches(6.0))

        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_before = Pt(0)
        p_cap.paragraph_format.space_after = Pt(12)
        r_cap = p_cap.add_run(caption)
        r_cap.italic = True
        r_cap.font.name = "Arial"
        r_cap.font.size = Pt(8.5)
        r_cap.font.color.rgb = RGBColor(0x64, 0x74, 0x8b)

def build_docx_manual():
    print("Initializing python-docx Document for Complete User Manual...")
    doc = Document()

    # Page Margins: 0.75 in (54 pt)
    sections = doc.sections
    for s in sections:
        s.top_margin = Inches(0.75)
        s.bottom_margin = Inches(0.75)
        s.left_margin = Inches(0.75)
        s.right_margin = Inches(0.75)

        # Subtle Footer on every page
        footer = s.footer
        f_p = footer.paragraphs[0]
        f_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        f_run = f_p.add_run("PrathamOne Coaching Institutes Enterprise Suite · prathamone.com")
        f_run.font.name = "Arial"
        f_run.font.size = Pt(8.0)
        f_run.font.color.rgb = RGBColor(0x94, 0xa3, 0xb8)

    # ------------------ COVER PAGE ------------------
    p_tag = doc.add_paragraph()
    p_tag.paragraph_format.space_before = Pt(36)
    p_tag.paragraph_format.space_after = Pt(12)
    r_tag = p_tag.add_run("ENTERPRISE ERP & OPERATIONS SUITE · OFFICIAL DOCUMENTATION")
    r_tag.bold = True
    r_tag.font.name = "Arial"
    r_tag.font.size = Pt(9.5)
    r_tag.font.color.rgb = RGBColor(0x1d, 0x4e, 0xd8)

    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(6)
    r_title = p_title.add_run("PrathamOne EduOS")
    r_title.bold = True
    r_title.font.name = "Arial"
    r_title.font.size = Pt(32)
    r_title.font.color.rgb = RGBColor(0x0f, 0x17, 0x2a)

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(18)
    r_sub = p_sub.add_run("Complete User Manual & Operational Reference Guide")
    r_sub.font.name = "Arial"
    r_sub.font.size = Pt(16)
    r_sub.font.color.rgb = RGBColor(0x0f, 0x76, 0x6e)

    p_desc = doc.add_paragraph()
    p_desc.paragraph_format.space_before = Pt(6)
    p_desc.paragraph_format.space_after = Pt(28)
    r_desc = p_desc.add_run(
        "A comprehensive, step-by-step technical and operational manual covering every module, "
        "role capability, financial workflow, security gate, and reporting feature in PrathamOne EduOS."
    )
    r_desc.font.name = "Arial"
    r_desc.font.size = Pt(11)
    r_desc.font.color.rgb = RGBColor(0x47, 0x55, 0x69)

    # Meta Table on Cover
    meta_table = doc.add_table(rows=6, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_rows = [
        ("Software Product", "PrathamOne Coaching Institutes Enterprise Suite"),
        ("Author & Chief Architect", "Jawahar R Mallah"),
        ("Organization", "AITDL — AI Technology & Development Lab"),
        ("Official Website", "https://prathamone.com"),
        ("Verified Release Version", "v1.88.0 (Build: 2026.11.12-REV-159-v1.88.0)"),
        ("Manual Revision Date", "November 12, 2026"),
    ]
    for idx, (label, val) in enumerate(meta_rows):
        r_cells = meta_table.rows[idx].cells
        r_cells[0].width = Inches(2.2)
        r_cells[1].width = Inches(4.3)
        set_cell_background(r_cells[0], "f8fafc")
        set_cell_background(r_cells[1], "ffffff")
        p0 = r_cells[0].paragraphs[0]
        r0 = p0.add_run(label)
        r0.bold = True
        r0.font.size = Pt(9.5)
        p1 = r_cells[1].paragraphs[0]
        r1 = p1.add_run(val)
        r1.font.size = Pt(9.5)

    doc.add_page_break()

    # ------------------ DOCUMENT CONTROL & SUPPORT ------------------
    h2_ctrl = doc.add_heading("Document Control & Technical Support", level=1)
    h2_ctrl.paragraph_format.space_before = Pt(12)

    p_sup = doc.add_paragraph(
        "This official manual provides authoritative operational guidance for administrators, "
        "principals, accountants, teachers, and administrative staff using the PrathamOne EduOS platform. "
        "All instructions reflect verified system behavior under production release v1.88.0."
    )

    add_callout(
        doc,
        "Primary Technical Helpline: +91 9323 023 007 / +91 9324 117 007\n"
        "Official Helpdesk Email: support@prathamone.com (Alternate: prathamone@outlook.com)\n"
        "Platform Website: https://prathamone.com\n"
        "Author: Jawahar R Mallah · AITDL (AI Technology & Development Lab)",
        title="OFFICIAL SUPPORT CONTACTS",
        color="0f766e",
        bg_color="f0fdf4"
    )

    doc.add_page_break()

    # ------------------ CHAPTER 1 ------------------
    doc.add_heading("1. Welcome & Product Architecture Overview", level=1)
    doc.add_paragraph(
        "PrathamOne EduOS is an enterprise-grade ERP platform engineered specifically for modern coaching institutes, "
        "exam preparation academies, and multi-branch tutorial networks. Designed by Jawahar R Mallah and AITDL, "
        "the suite unifies academic scheduling, student admissions, attendance, fees, ledger governance, examinations, "
        "and statutory compliance into a secure, cohesive web interface."
    )

    doc.add_heading("1.1 Architecture & Production Components", level=2)
    doc.add_paragraph(
        "PrathamOne EduOS is deployed as a high-concurrency containerized platform comprising:\n"
        "• Single Page Application (SPA): React 18, Vite 5.4, TypeScript, TailwindCSS.\n"
        "• Asynchronous Backend API: Python 3.11, FastAPI, SQLAlchemy 2.0 Async (204 endpoints).\n"
        "• Relational Data Store: PostgreSQL 16 Enterprise with Alembic migrations.\n"
        "• Production Server: Docker Compose on Alpine Linux with Nginx 1.25 reverse proxy."
    )

    add_figure(doc, "02_dashboard_overview.png", "Figure 1.1: PrathamOne EduOS Master Dashboard Overview.")

    # ------------------ CHAPTER 2 ------------------
    doc.add_heading("2. User Roles & RBAC Permission Matrix", level=1)
    doc.add_paragraph(
        "Access control in PrathamOne EduOS is governed by a strict 8-tier Role-Based Access Control (RBAC) hierarchy. "
        "The table below details verified permissions across the application modules:"
    )

    rbac_tbl = doc.add_table(rows=9, cols=6)
    rbac_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ["Role", "Dashboard", "Academic Master", "Student Lifecycle", "Fees & Payments", "SysAdmin Center"]
    for i, h in enumerate(headers):
        c = rbac_tbl.rows[0].cells[i]
        set_cell_background(c, "1e3a8a")
        p = c.paragraphs[0]
        r = p.add_run(h)
        r.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(0xff, 0xff, 0xff)

    roles_data = [
        ("SysAdmin", "Full Analytics", "Full CRUD", "Full Lifecycle & Allowlists", "Full + Posted Edit Gate", "Exclusive Full Access"),
        ("Superadmin", "Full Analytics", "Full CRUD", "Full Lifecycle", "Full Management", "View Telemetry"),
        ("Admin", "Full Branch", "Full CRUD", "Admit, Edit, Exit, Reactivate", "Full Management", "Restricted"),
        ("Principal", "Full Academic", "Full CRUD", "Admit, Edit, Exit, Reactivate", "Approve & View", "Restricted"),
        ("Accountant", "Financial View", "View Only", "View & Fee Commitment", "Collect, Draft, Post, Refund", "Denied"),
        ("Teacher", "Class Roster", "View Only", "View Allocated Batches", "Denied", "Denied"),
        ("Staff", "Front Desk", "View Only", "Inquiry & Intake Forms", "Draft Payments Only", "Denied"),
        ("Student", "Self Portal", "Denied", "View Self Profile", "View Self Dues & Pay Online", "Denied")
    ]

    for idx, row in enumerate(roles_data):
        for col_idx, val in enumerate(row):
            c = rbac_tbl.rows[idx + 1].cells[col_idx]
            set_cell_background(c, "f8fafc" if idx % 2 == 1 else "ffffff")
            p = c.paragraphs[0]
            r = p.add_run(val)
            r.font.size = Pt(8.0)

    add_figure(doc, "19_user_profile_rbac_matrix.png", "Figure 2.1: Granular Role & Permission Matrix visualizer.")

    # ------------------ CHAPTER 3 ------------------
    doc.add_heading("3. Getting Started & Sign-In", level=1)
    doc.add_paragraph(
        "Open your browser and navigate to http://localhost:80/login. Enter your assigned username or email and password, "
        "then click Sign In. Upon authentication, a secure JWT session token is created, and you are directed to the dashboard."
    )
    add_figure(doc, "01_login_screen.png", "Figure 3.1: PrathamOne EduOS Secure Sign-In Portal.")

    # ------------------ CHAPTER 4 ------------------
    doc.add_heading("4. Complete Module-by-Module User Guide", level=1)

    # 4.1 Academic Workspace
    doc.add_heading("4.1 Academic Structure & Batch Management", level=2)
    doc.add_paragraph(
        "Route: /academic | Access: Admin, Principal, SysAdmin\n"
        "The Academic workspace organizes your educational offerings across Boards, Standards, Divisions, and Batches.\n"
        "• Boards: Create curriculums (CBSE, ICSE, State Board).\n"
        "• Standards: Add grades/levels (8th to 12th Standard).\n"
        "• Batches: Set up morning/evening divisions, capacity limits, and mentor assignments."
    )
    add_figure(doc, "03_academic_workspace.png", "Figure 4.1: Academic Hierarchy Manager.")

    # 4.2 Student Lifecycle
    doc.add_heading("4.2 Student Admission & Lifecycle Management", level=2)
    doc.add_paragraph(
        "Routes: /students, /students/add, /students/{id}\n"
        "PrathamOne EduOS provides complete student lifecycle management from initial inquiry to exit and reactivation:\n"
        "1. Admission Wizard: 4-step wizard capturing personal, contact, academic, and guardian records.\n"
        "2. Student Detail Profile: Central workspace displaying academics, attendance, fees ledger, and KYC documents.\n"
        "3. Profile Editing: Update contact numbers, address, or academic allocations.\n"
        "4. Exit / Withdrawal: Formal withdrawal modal requiring an exit date, reason dropdown, and notes.\n"
        "5. Reactivation: Seamless one-click reactivation restoring an exited student to an active batch.\n"
        "6. KYC Documents: Upload, download, and verify Aadhaar cards, birth certificates, and transfer certificates."
    )
    add_figure(doc, "07_student_admission_form.png", "Figure 4.2: Multi-step Student Admission Wizard.")
    add_figure(doc, "08_student_detail_profile.png", "Figure 4.3: Comprehensive Student Detail Workspace.")
    add_figure(doc, "10_student_exit_modal.png", "Figure 4.4: Student Exit and Withdrawal Modal.")

    # 4.3 Teacher & Faculty Workspace
    doc.add_heading("4.3 Teacher & Faculty Workspace & Dedicated Profile", level=2)
    doc.add_paragraph(
        "Routes: /teachers, /teachers/{id} | Access: Admin, Principal, Teachers, SysAdmin\n"
        "The Teacher Workspace provides comprehensive faculty governance with real-time academic workload analytics:\n"
        "• Live Workforce Status KPIs: Total Teachers (42), Active (36), Assigned (30), Unassigned (6), Without Timetable (3), and On Leave (4).\n"
        "• Teacher Status Donut Chart: Visually flags unassigned faculty requiring immediate batch allocation.\n"
        "• 6-Month Teaching Hours Trend: Reconciles verified classroom lecture hours for accurate automated payroll calculation.\n"
        "• Dedicated 12-Tab Profile: Includes Overview, Personal (Dual Addresses), Employment, Qualifications, Subjects, Assignments, Timetable, Attendance, Leave, Payroll, Documents, and Activity.\n"
        "• Batch Allocation: Assign faculty to boards, standards, divisions, and subjects with weekly workload meters."
    )
    add_figure(doc, "28_teacher_workspace_dashboard.png", "Figure 4.5A: Teacher Workspace Dashboard with real-time status donut and monthly teaching hours trend.")
    add_figure(doc, "29_individual_teacher_profile.png", "Figure 4.5B: Dedicated Teacher Profile with Workforce Hero Card and 12 specialized tabs.")

    # 4.4 Non-Teaching Staff Workspace
    doc.add_heading("4.4 Non-Teaching Staff Workspace & Dedicated Profile", level=2)
    doc.add_paragraph(
        "Routes: /staff, /staff/{id} | Access: Admin, Principal, Staff, SysAdmin\n"
        "Manage administrative, accounts, library, IT, and campus support personnel:\n"
        "• Live Headcounts: Track personnel across departments with real-time headcount indicators.\n"
        "• Dynamic Department Analytics: Live donut chart displaying staff distribution across Administration, Accounts, IT, Library, and Operations.\n"
        "• Financial Liabilities: Real-time calculation of Salary Payable (Current Month) and outstanding Pending Payment vouchers.\n"
        "• Dedicated 12-Tab Profile: Tailored to administrative staff with key responsibilities, attendance history, and official HR documents."
    )
    add_figure(doc, "30_staff_workspace_dashboard.png", "Figure 4.5C: Staff Workspace Dashboard with department breakdown and salary liability cards.")
    add_figure(doc, "31_individual_staff_profile.png", "Figure 4.5D: Dedicated Staff Profile with responsibilities matrix and documents archive.")

    # 4.5 Employee Dossier & Universal Print
    doc.add_heading("4.5 Employee Dossier & Universal Print Studio", level=2)
    doc.add_paragraph(
        "Single-click generation of the official multi-section Employee Dossier. "
        "Includes institutional branding, dual residential and permanent addresses, multiple bank accounts with primary salary designation, "
        "key emergency contacts, batch workload allocations, and statutory verification signature blocks. "
        "The Universal Print Studio enables seamless printing on A4, A5, Letter, and custom formats with auto-scaling to prevent horizontal or vertical overflow."
    )

    # 4.6 Delete Protection
    doc.add_heading("4.6 Multi-Table Delete Protection & Workforce Safeguards", level=2)
    doc.add_paragraph(
        "To prevent accidental data loss and audit corruption, PrathamOne EduOS enforces strict referential delete protection. "
        "Attempting to hard-delete any user with existing payroll records, teaching sessions, batch assignments, attendance punches, "
        "leave records, payment transactions, or student enrollments returns an explicit HTTP 400 error blocking the operation. "
        "Administrators use Soft Deactivation instead, which safely revokes login access while keeping financial and academic ledgers intact."
    )

    # 4.7 Attendance
    doc.add_heading("4.7 Daily Attendance & Defaulter Tracking", level=2)
    doc.add_paragraph(
        "Route: /attendance | Access: Teachers, Staff, Admin, Principal\n"
        "Select the Standard and Batch. The complete student roster loads defaulted to Present. "
        "Click individual pills to toggle Present, Absent, Late, or Excused, then click Save Attendance Roster. "
        "Attendance statistics update instantaneously across reports and parent feeds."
    )
    add_figure(doc, "11_attendance_workspace.png", "Figure 4.5: Daily Attendance Roster Workspace.")

    # 4.4 Fee Plans & Payments
    doc.add_heading("4.4 Fees, Payments & Posted Edit Security Gate", level=2)
    doc.add_paragraph(
        "Routes: /fees, /payments | Access: Accountant, Admin, SysAdmin\n"
        "• Fee Structures: Build customized packages with tuition, practical, study material, and exam heads.\n"
        "• Payments Ledger: Record cash, cheque, UPI, and bank transfer payments.\n"
        "• Receipt Printing: Issue official sequential receipts (REC-2026-XXXXXX) in thermal or A4 formats.\n"
        "• Posted Payment Security Gate: Normal staff cannot alter posted payments. Only SysAdmin with explicit "
        "permission can unlock and modify posted transactions with mandatory reason logging and receipt supersession."
    )
    add_figure(doc, "13_fee_plans_structures.png", "Figure 4.6: Fee Structure Builder.")
    add_figure(doc, "15_payments_ledger.png", "Figure 4.7: Payments Financial Ledger.")
    add_figure(doc, "16_payments_lock_unlock_gate.png", "Figure 4.8: Posted Payment Security Gate Modal.")

    # 4.5 Examinations & Results
    doc.add_heading("4.5 Examinations, Grading & Report Cards", level=2)
    doc.add_paragraph(
        "Route: /examinations | Access: Teachers, Admin, Principal\n"
        "Schedule periodic unit tests and term examinations. Input subject marks directly into the online grid. "
        "The system calculates grade percentages and renders official printable report cards."
    )
    add_figure(doc, "12_examinations_results.png", "Figure 4.9: Examinations & Grading Workspace.")

    # 4.6 Reports & Analytics Grid
    doc.add_heading("4.6 High-Performance Reports & Analytics Grid", level=2)
    doc.add_paragraph(
        "Route: /reports | Access: Accountant, Admin, Principal, SysAdmin\n"
        "Enterprise reporting grid equipped with real-time column grouping, dynamic pivoting, cascading filters, "
        "and one-click Excel/CSV export for fee realization, defaulters, batch headcounts, and academic rankings."
    )
    add_figure(doc, "17_reports_analytics_grid.png", "Figure 4.10: High-Performance Excel Report Grid.")

    # 4.7 Forms & DPDP Compliance
    doc.add_heading("4.7 Forms & Documents Printing Center (DPDP Compliant)", level=2)
    doc.add_paragraph(
        "Route: /forms | Access: Admin, Staff, SysAdmin\n"
        "Generate official Student ID Cards, Admission Forms, Fee Receipts, and Bonafide Certificates. "
        "Every generation event is recorded in the Digital Personal Data Protection (DPDP) compliance audit log."
    )
    add_figure(doc, "24_forms_documents_hub.png", "Figure 4.11: Forms & Documents Printing Center.")

    # 4.11 CodeX Configuration Studio
    doc.add_heading("4.11 CodeX — Configurable Feature Activation & Numeric Coding Studio", level=2)
    doc.add_paragraph(
        "Route: /codex | Access: Business Owner / Authorized SysAdmin\n"
        "CodeX is an optional, high-security numeric obfuscation engine that masks sensitive business figures (salaries, fees, profit margins) "
        "using custom owner-defined alphanumeric symbol mappings.\n"
        "• Mandatory System Default Policy: DISABLED (OFF) everywhere until explicitly activated by the Business Owner.\n"
        "• Bijective Reversible Mapping: Digits 0-9 substitute into custom symbols (e.g. 0->Q, 1->A, 2->Z...); amounts like ₹12,500 encode to AZPQQ and decode back to 12500.\n"
        "• Granular 16-Feature Toggles: Independently toggle CodeX on student fees, staff payroll, invoices, receipts, and reporting grids.\n"
        "• Scoped Access Overrides: Define permissions by department, role, or user.\n"
        "• PIN Protection & QR Tokens: Decoding operations require administrative PIN verification. Ephemeral QR tokens support mobile decoder scanning."
    )
    add_figure(doc, "32_codex_configuration_studio.png", "Figure 4.12: CodeX Configuration Studio with master toggle and 16 feature switches.")
    add_figure(doc, "33_codex_mapping_studio.png", "Figure 4.13: CodeX Mapping Studio with reversible symbol substitutions.")
    add_figure(doc, "34_codex_sandbox_testing.png", "Figure 4.14: Verification Sandbox testing live bidirectional encoding and decoding.")

    # 4.12 Universal Print Engine
    doc.add_heading("4.12 Universal Print Fit & Page Layout Engine", level=2)
    doc.add_paragraph(
        "Integrated across all document triggers (Dossiers, ID Cards, Receipts, Report Cards, Invoices). "
        "Supports standard office paper (A4, Letter) and compact receipt formats (A5, 80mm Thermal Rolls). "
        "Auto-calculates CSS scale factors to eliminate clipping and preserve corporate color branding."
    )

    # 4.13 Branding & System Settings
    doc.add_heading("4.13 Branding & System Settings", level=2)
    doc.add_paragraph(
        "Route: /settings | Access: Admin, SysAdmin\n"
        "Configure institute profile details, upload official logos, and customize brand primary/secondary colors "
        "with the interactive Live Branding Preview card before saving."
    )
    add_figure(doc, "25_branding_settings_preview.png", "Figure 4.12: Settings & Live Branding Preview.")

    # 4.9 SysAdmin Center & Universal Records Editor
    doc.add_heading("4.9 SysAdmin Center & Universal Records Editor", level=2)
    doc.add_paragraph(
        "Route: /sysadmin | Access: SysAdmin Exclusive\n"
        "Superuser dashboard featuring system diagnostics, database connection pools, immutable security audit logs, "
        "and the Universal Records Editor. Allows surgical master data corrections across 8 models while strictly "
        "enforcing field-level allowlists and preventing self-deactivation."
    )
    add_figure(doc, "21_sysadmin_center_overview.png", "Figure 4.13: SysAdmin Operations Center.")
    add_figure(doc, "22_sysadmin_universal_editor.png", "Figure 4.14: Universal Records Editor.")

    # 4.14 Homework & Assignment Studio (Phases 1-15)
    doc.add_heading("4.14 Homework & Assignment Studio (Phases 1–15)", level=2)
    doc.add_paragraph(
        "Route: /homework | Student View: /student-portal | Access: Teachers, Coordinators, Admin, Students\n"
        "Supports Batch-level, Selected Group-level, and Individual Student-level assignments with frozen recipient "
        "snapshots, Draft-to-Publish notifications, file/text submissions, late-joiner auto-assignment, batch-transfer "
        "carryover, and marks/remarks evaluation."
    )
    add_figure(doc, "2026-11-12_homework_studio-overview.png", "Figure 4.15: Homework & Assignment Studio Overview.")
    add_figure(doc, "2026-11-12_homework_submissions-eval.png", "Figure 4.16: Homework Submission Evaluation Drawer.")

    # 4.15 PrathamOne EduBoard Interactive Classroom
    doc.add_heading("4.15 PrathamOne EduBoard Interactive Classroom", level=2)
    doc.add_paragraph(
        "Route: /eduboard | Access: Teachers, Coordinators, Admin, Students (Read-only published boards)\n"
        "Multi-page digital classroom engine integrated with Academic Batches, Teaching Sessions, Timetables, and "
        "Student Portal archives. Features Standard (collapsible Pages & Saved Boards drawers), Focus, and Immersive "
        "Fullscreen modes; Whiteboard, Whiteboard Grid, Classic Greenboard, and Blackboard themes; multi-page PDF "
        "import/export; and dual-screen Pop-Out Board synchronization via BroadcastChannel."
    )
    add_figure(doc, "eduboard_v188_rc2_greenboard_standard.png", "Figure 4.17: EduBoard Classic Greenboard Mode.")
    add_figure(doc, "eduboard_v188_rc2_focus_mode.png", "Figure 4.18: EduBoard Focus Mode.")

    # 4.16 Official Fee Receipt Printing & PDF Parity
    doc.add_heading("4.16 Official Fee Receipt Printing & PDF Parity (A5 Compact & A4 Portrait)", level=2)
    doc.add_paragraph(
        "Route: /fees & /payments -> Payment Receipt View\n"
        "Ensures 1:1 visual parity between the on-screen software preview, browser Print Preview, and Download PDF "
        "for both A5 Compact and A4 Portrait formats, preserving academy logo, street address, phone, email, QR code, "
        "installment history, and authorized signature via an isolated print frame."
    )

    # 4.17 Help & About Centre
    doc.add_heading("4.17 Help & About Centre & Documentation Sync", level=2)
    doc.add_paragraph(
        "Route: /help | Access: All Authenticated Users (Diagnostics restricted to Sysadmin)\n"
        "Provides searchable documentation across 20 modules, quick-start tutorials, troubleshooting FAQs, "
        "Support Tickets, Release Changelog, and Open-Source Third-Party Acknowledgements."
    )

    # ------------------ CHAPTER 5 ------------------
    doc.add_heading("5. Troubleshooting, Error Codes & FAQ", level=1)
    doc.add_paragraph(
        "PrathamOne EduOS includes a centralized error tracking taxonomy. When an error occurs, "
        "a reference code (e.g. ERR-20261106-XXXX) is displayed. Common resolutions:\n"
        "• INTERNET_DISCONNECTED: The application enters PWA offline mode. Reconnect Wi-Fi to sync.\n"
        "• SESSION_EXPIRED (401): JWT session expired. Re-authenticate on /login.\n"
        "• PERMISSION_DENIED (403): User role lacks access. Request permission from SysAdmin.\n"
        "• VALIDATION_FAILED (400): Ensure all required fields (e.g. edit reason) are provided."
    )

    doc.add_heading("5.1 Official Support Desk", level=2)
    doc.add_paragraph(
        "For enterprise assistance, system training, or custom integrations:\n"
        "• Phone / WhatsApp: +91 9323 023 007 / +91 9324 117 007\n"
        "• Support Email: support@prathamone.com | Alternate: prathamone@outlook.com\n"
        "• Website: https://prathamone.com\n"
        "• Author & Architect: Jawahar R Mallah\n"
        "• Organization: AITDL — AI Technology & Development Lab"
    )

    # Save Document
    os.makedirs(DOCX_DIR, exist_ok=True)
    out_docx_path = os.path.join(DOCX_DIR, "PrathamOne_Academy_Complete_User_Manual.docx")
    doc.save(out_docx_path)
    print(f"Saved: {out_docx_path}")

    # Copy to root manual dir
    root_docx_copy = os.path.join(ROOT_MANUAL_DIR, "PrathamOne_Academy_Complete_User_Manual.docx")
    shutil.copy2(out_docx_path, root_docx_copy)
    print(f"Copied to: {root_docx_copy}")

if __name__ == "__main__":
    build_docx_manual()
