# /**
#  * @file        generate_20_module_guide.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      00_PRODUCT_OVERVIEW
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-19
#  * @updated     2026-11-19
#  *
#  * @description Generates a source-grounded 20-module coaching institute guide and presentation.
#  */

from pathlib import Path
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Inches, Pt


ROOT = Path(__file__).resolve().parents[1]
REPORT_PATH = ROOT / "docs" / "00_PRODUCT_OVERVIEW" / (
    "2026-11-19_PRODUCT-OVERVIEW_PRESENTATION-GUIDE_20-MODULES_V1.md"
)
DECK_PATH = ROOT / "docs" / "assets" / "commercial" / (
    "PrathamOne_EduOS_20_Module_Guide.pptx"
)
SCREENSHOTS_PATH = ROOT / "docs" / "assets" / "commercial" / "module_screenshots"
LOGO_PATH = ROOT / "frontend" / "public" / "media" / "logo" / (
    "prathamone-eduos-horizontal-transparent.png"
)

NAVY = RGBColor(248, 250, 252)
PANEL = RGBColor(255, 255, 255)
PANEL_ALT = RGBColor(238, 244, 251)
BLUE_EDGE = RGBColor(203, 213, 225)
ORANGE = RGBColor(241, 105, 6)
AMBER = RGBColor(180, 83, 9)
TEXT = RGBColor(15, 23, 42)
PALE = RGBColor(51, 65, 85)
SLATE = RGBColor(100, 116, 139)
MINT = RGBColor(4, 120, 87)
FONT = "Segoe UI"


MODULES = [
    {
        "name": "Dashboard",
        "area": "SEE THE INSTITUTE",
        "route": "/dashboard",
        "what": "A concise command view of key institute activity, including selected academic, attendance, and fee signals.",
        "why": "Owners and administrators can start with the same operational picture instead of assembling updates from separate registers.",
        "who": "Director, principal, institute administrator",
        "demo": "Review KPI cards, recent activity, top batches, and the fee-status trend; do not infer a trend from an empty or demo dataset.",
        "sample": "Daily view: one class to review, one follow-up due, and one fee item to reconcile.",
        "guard": "Dashboard values depend on the selected institute, date range, and available data. Treat sample figures as examples, not promised outcomes.",
        "evidence": [
            ("frontend/src/pages/Dashboard.tsx", "Dashboard UI"),
            ("frontend/src/test/ModernExecutiveDashboard.test.tsx", "executive cards and operational command view"),
            ("frontend/src/test/DashboardCollectionStatus.test.tsx", "collection/outstanding shares and chart controls"),
        ],
        "notes": "Open by asking what the director needs to know before the first class begins. Explain that this screen is a summary, not a substitute for checking the underlying register. Point to the executive cards and selected live-activity or fee-trend widgets. Make clear that the figures are tenant- and period-specific; the guide makes no claim about a fixed increase in collections, attendance, or revenue.",
    },
    {
        "name": "Students",
        "area": "ENROL AND SUPPORT LEARNERS",
        "route": "/students/directory",
        "what": "A canonical learner directory with profile, enrolment, batch allocation, history, identity-card, and reactivation workspaces.",
        "why": "One reliable student record helps admissions, teaching, attendance, fees, and reporting refer to the same learner.",
        "who": "Admissions team, student desk, principal, authorized administrator",
        "demo": "Search a demo learner, open the profile, then show enrolment or activity-history context without editing the record.",
        "sample": "DEMO-STU-001 · JEE Foundation · Active enrolment (illustrative only).",
        "guard": "Student records are sensitive. Use synthetic demo data and keep write actions locked unless an authorized, scoped edit is intended.",
        "evidence": [
            ("frontend/src/pages/Students.tsx", "student workspaces"),
            ("frontend/src/test/StudentDedicatedSubmenus.test.tsx", "directory, admission form, allocations, cards, history, reactivation"),
            ("frontend/src/test/StudentLifecycle.test.tsx", "exit/reactivation payload and lifecycle analytics"),
        ],
        "notes": "Describe Students as the learner master, not merely a spreadsheet search page. Show the directory and, if safe demo data is available, a profile or the batch-allocation queue. Mention that admissions creates prospective learner context while Students manages the enrolled learner record. The system has dedicated history and reactivation workspaces. Avoid opening real personal data in a public presentation.",
    },
    {
        "name": "Admissions",
        "area": "ENROL AND SUPPORT LEARNERS",
        "route": "/leads/pipeline",
        "what": "A lead and enquiry workflow that presents prospective learners in pipeline stages, follow-up views, and a lead dossier.",
        "why": "A visible enquiry queue makes it easier for the team to see who needs a response and what stage each conversation has reached.",
        "who": "Admissions counsellor, front desk, admissions lead",
        "demo": "Show the pipeline columns, open a lead dossier, and switch between recent, follow-up, overdue, converted, and lost views.",
        "sample": "Demo Enquiry A · Counselling follow-up · Next action: confirm a suitable batch.",
        "guard": "Keep the walkthrough read-only. Do not send messages or convert a lead unless using an approved training tenant.",
        "evidence": [
            ("frontend/src/pages/crm/LeadPipelinePage.tsx", "pipeline page"),
            ("frontend/src/pages/crm/LeadDossierDrawer.tsx", "lead dossier"),
            ("frontend/src/test/LeadManagementCRM.test.tsx", "pipeline, dossier, and follow-up views"),
            ("frontend/src/test/LeadManagementRBAC.test.tsx", "role separation"),
        ],
        "notes": "Explain the difference between an enquiry and an enrolled student: the lead pipeline supports the enquiry process; the Students module is the canonical learner record. Use one sample lead to show the pipeline and dossier, then point to the follow-up/overdue tabs. The demo should not promise automated lead capture from external channels unless that exact integration has been configured and tested.",
    },
    {
        "name": "Fees",
        "area": "MANAGE FINANCIAL OPERATIONS",
        "route": "/fees/collection",
        "what": "Fee structures and schedules, invoices, a collection desk, overdue tracking, payment views, and financial daybook reports.",
        "why": "A common fee workflow helps staff answer what was assessed, what was received, and what remains due with clearer reconciliation.",
        "who": "Accountant, fee desk, principal, authorized finance administrator",
        "demo": "Open the collection desk and an existing invoice preview, then review overdue ageing or the financial daybook.",
        "sample": "DEMO-INV-001 · Installment status: pending review · No payment recorded.",
        "guard": "Never collect, refund, edit, or issue a financial record during a read-only showcase. Verify any payment gateway separately.",
        "evidence": [
            ("frontend/src/pages/Fees.tsx", "fee tabs and workflows"),
            ("frontend/src/test/FeesDedicatedSubmenus.test.tsx", "structures, invoicing, collection, defaulters, gateway, and reports"),
            ("frontend/src/test/DashboardCollectionStatus.test.tsx", "collection and outstanding trend"),
        ],
        "notes": "Walk through the financial lifecycle: defined fee schedule, issued invoice, collection, and review of dues/reports. An existing issued invoice can be previewed without changing it. The route and UI include an online-gateway desk, but this alone does not prove that a provider account, credentials, settlement, or live payment route is configured. Do not initiate transactions or state that a gateway is live without a separate readiness check.",
    },
    {
        "name": "Concessions",
        "area": "MANAGE FINANCIAL OPERATIONS",
        "route": "/fees/concessions",
        "what": "A governed workspace for concession and waiver schemes, applications, and their connection to a student's fee position.",
        "why": "A visible approval path helps the institute apply its own benefit policy consistently and understand the resulting net amount due.",
        "who": "Principal, fee administrator, authorized approver",
        "demo": "Review the existing scheme list or a read-only concession trace and show gross assessed fee versus benefits and net payable.",
        "sample": "Demo application · Merit benefit · Approval status: pending review.",
        "guard": "Applying or approving a concession changes a financial record. Do not perform it in a showcase without explicit authorization and confirmation.",
        "evidence": [
            ("frontend/src/pages/Fees.tsx", "concessions and waivers workspace"),
            ("frontend/src/test/FeesDedicatedSubmenus.test.tsx", "concession workspace and View-First lock"),
            ("frontend/src/test/ConcessionGovernanceUI.test.tsx", "trace drill-down and receipt breakdown"),
        ],
        "notes": "Present concessions as a policy-governed financial adjustment, not an informal discount. Show the existing trace/receipt breakdown in view mode. The tested interface locks the apply action until the appropriate Edit Mode is active. Explain that the institute defines eligibility and approval authority; the software should not be portrayed as deciding who deserves a concession.",
    },
    {
        "name": "Scholarships",
        "area": "MANAGE FINANCIAL OPERATIONS",
        "route": "/fees/overview",
        "what": "Scholarship awards and waivers are represented with fee benefits and the wider financial view; they are not a separate top-level route.",
        "why": "Keeping the award connected to the fee record makes the benefit and the remaining payable amount easier to review together.",
        "who": "Principal, scholarship coordinator, fee administrator",
        "demo": "Show the scholarship breakdown or configured scholarship scheme in Fees without granting or changing an award.",
        "sample": "Sample scheme: merit support · Eligibility and award require institute review.",
        "guard": "Confirm the institute's scholarship policy and configured catalogue. Do not imply external sponsorship or automated eligibility unless verified.",
        "evidence": [
            ("frontend/src/pages/Fees.tsx", "scholarship breakdown and scheme configuration"),
            ("frontend/src/test/FeesDedicatedSubmenus.test.tsx", "concessions and scholarship-waiver workspace"),
            ("frontend/src/test/ConcessionGovernanceUI.test.tsx", "benefit-to-net-fee receipt breakdown"),
        ],
        "notes": "The coaching-institute explanation is simple: a scholarship is a defined benefit that affects the student's fee position. The current UI places scholarship schemes and awards inside Fees/Concessions rather than exposing a separate scholarship route. Use the existing breakdown in view mode. Avoid claims about sponsor integrations, automated merit scoring, or funding disbursement unless those are separately demonstrated and configured.",
    },
    {
        "name": "Attendance",
        "area": "RUN DAILY OPERATIONS",
        "route": "/attendance/overview",
        "what": "Attendance overview, batch roll call, monthly register, QR kiosk, absentee tracking, leave applications, and attendance reports.",
        "why": "A common register gives the institute a clearer view of who attended and which follow-up cases need attention.",
        "who": "Teacher, attendance desk, principal, authorized administrator",
        "demo": "Open the monthly register or QR terminal in view mode and explain the daily roll-call and absence-review flow.",
        "sample": "JEE Foundation · Session attendance · Unmarked entries flagged for review.",
        "guard": "A QR terminal screen does not by itself prove a particular scanner/device or parent-alert integration is operational.",
        "evidence": [
            ("frontend/src/pages/Attendance.tsx", "attendance workspaces"),
            ("frontend/src/test/AttendanceDedicatedSubmenus.test.tsx", "daily roll call, QR terminal, register, absenteeism, leave, reports"),
        ],
        "notes": "For a coaching institute, attendance supports class accountability and gives staff a starting point for investigating repeated absences. Demonstrate the register and the QR kiosk screen, but do not collect a live attendance mark during the presentation. QR attendance should be tested on the actual device and network that will be used. Do not promise parent notifications based only on the attendance UI.",
    },
    {
        "name": "Timetable",
        "area": "RUN DAILY OPERATIONS",
        "route": "/academic/timetable",
        "what": "A weekly schedule workspace linked to academic structure, batches, faculty, and timetable settings.",
        "why": "A shared schedule helps coordinators, teachers, and learners refer to the same class plan and spot clashes earlier.",
        "who": "Academic coordinator, principal, teachers",
        "demo": "Show the weekly timetable and its schedule settings; point out the batch/class context without saving a change.",
        "sample": "09:00 Mathematics · 11:00 Physics · Faculty A (illustrative schedule).",
        "guard": "Schedule changes affect people and rooms. Verify local rules, room availability, and conflict settings before publishing.",
        "evidence": [
            ("frontend/src/pages/AcademicWorkspace.tsx", "timetable tab and academic context"),
            ("frontend/src/test/AcademicDedicatedSubmenus.test.tsx", "weekly timetable and conflict-policy settings"),
            ("docs/01_ARCHITECTURE/2026-11-17_ARCHITECTURE_RESEARCH-REPORT_PLANNING-SCHEDULE-INTEGRATION_V1.md", "planning/schedule integration research"),
        ],
        "notes": "Explain the timetable as the bridge between the institute's academic structure and the daily teaching plan. Show one week or schedule view and explain that batch, subject, and faculty assignments must be correct first. The presentation should not claim a clash-free schedule for every institute: the coordinator must configure conflict policies and validate local room/teacher constraints.",
    },
    {
        "name": "Examinations",
        "area": "TEACH AND ASSESS",
        "route": "/examinations/overview",
        "what": "Exam overview, schedules, marks entry, performance analytics, question-paper workspaces, and grading settings.",
        "why": "A defined assessment workflow helps staff plan tests, enter marks consistently, and prepare the information needed for results.",
        "who": "Exam coordinator, teachers, academic lead",
        "demo": "Review an existing examination schedule or analytics view and show the marks-entry workspace without entering marks.",
        "sample": "Weekly Test A · Scheduled · Marks entry not started.",
        "guard": "Marks are sensitive academic records. Keep entry and grading-policy changes locked during a general showcase.",
        "evidence": [
            ("frontend/src/pages/Examinations.tsx", "exam workspaces"),
            ("frontend/src/test/ExaminationsDedicatedSubmenus.test.tsx", "schedules, marks entry, analytics, papers, grading"),
            ("frontend/src/test/ExaminationsAndReportCards.test.tsx", "marks and analytics drawers"),
        ],
        "notes": "Show how an exam moves from schedule to marks and analysis. Ask the institute which marking scheme applies, since entrance-test scoring and school-board grading differ. The app has grading settings and question-paper workspaces, but the institution owns the assessment rules. Do not type student marks in a live demonstration.",
    },
    {
        "name": "Results",
        "area": "TEACH AND ASSESS",
        "route": "/examinations/report-cards",
        "what": "Student report cards and transcripts with marks, grade summaries, and batch-level report-card compilation.",
        "why": "A consistent result format makes it easier for teachers and administrators to review performance and communicate outcomes.",
        "who": "Teacher, exam coordinator, principal, authorized student-support staff",
        "demo": "Open a synthetic student's report card and show its transcript, marks table, and summary.",
        "sample": "DEMO-STU-001 · Mathematics: reviewed · Result: preview only.",
        "guard": "Check the selected grading scale and verify all marks before sharing or printing a result.",
        "evidence": [
            ("frontend/src/pages/Examinations.tsx", "report-card route"),
            ("frontend/src/test/ExaminationsAndReportCards.test.tsx", "transcript, marks, grading scale, and batch dossier"),
            ("frontend/src/test/ExaminationsDedicatedSubmenus.test.tsx", "report-card workspace"),
        ],
        "notes": "Results are the learner-facing output of the examination workflow. Demonstrate the report card using synthetic data, and point out the marks table and summary. The tests cover a CBSE 9-point scale example, but grading rules differ by course, board, and examination type; configure and validate the institute's rules before issuing official results.",
    },
    {
        "name": "Staff",
        "area": "SUPPORT THE TEAM",
        "route": "/staff/directory",
        "what": "A staff register with onboarding, roles and duties, attendance, leave requests, HR documents, and policy settings.",
        "why": "A shared people workspace helps the institute coordinate who works here, what duties they cover, and which requests are waiting.",
        "who": "HR or office administrator, principal, authorized department lead",
        "demo": "Search a synthetic staff profile and show the duties or leave queue without changing a person's employment record.",
        "sample": "Faculty A · Mathematics · Duty: JEE Foundation batch.",
        "guard": "Payroll is a separate workflow. Keep personal and employment records private and mutations role-authorized.",
        "evidence": [
            ("frontend/src/pages/StaffManagement.tsx", "staff workspaces"),
            ("frontend/src/test/StaffDedicatedSubmenus.test.tsx", "register, onboarding, duties, attendance, leave, HR documents"),
            ("frontend/src/test/WorkforceDashboards.test.tsx", "teacher and non-teaching workforce dashboards"),
        ],
        "notes": "Position this module as staff administration, not as a substitute for human-resources policy. Show the staff register, duties, and leave queue. The repository has separate payroll screens; do not suggest that the staff directory itself calculates payroll. Share no real employee details in a public demonstration.",
    },
    {
        "name": "Communication",
        "area": "SUPPORT THE TEAM",
        "route": "/communication/overview",
        "what": "A workspace for broadcast composition, templates, channel settings, reminders, dispatch history, and gateway diagnostics.",
        "why": "Organized message templates and history can help staff send consistent, traceable updates instead of relying on scattered manual notes.",
        "who": "Office administrator, admissions/fee desk, authorized communications operator",
        "demo": "Preview a template, inspect dispatch history, or review gateway diagnostics; do not dispatch a message.",
        "sample": "Class reminder · Draft · Not sent to any recipient.",
        "guard": "Delivery depends on channel configuration, provider credentials, consent, and applicable messaging rules; sending is an explicit action.",
        "evidence": [
            ("frontend/src/pages/Communication.tsx", "communication workspaces"),
            ("frontend/src/test/CommunicationDedicatedSubmenus.test.tsx", "composer, WhatsApp workspace, templates, logs, reminders, diagnostics, settings"),
            ("frontend/src/test/Communication.test.tsx", "templates, channels, queues, and automation workspace"),
        ],
        "notes": "Explain that Communication organizes messages and keeps a history of activity. The tests cover a WhatsApp workspace, gateway diagnostics, DLT and channel settings, quiet hours, reminders, and dispatch logs. A configured screen is not proof of successful external delivery. Confirm provider setup, consent and messaging policy before promising a live channel. Keep the send/dispatch action locked in a presentation.",
    },
    {
        "name": "Reports",
        "area": "REVIEW AND IMPROVE",
        "route": "/reports",
        "what": "A central report catalogue with categories, search, data grids, operational analytics, and report-navigation/history context.",
        "why": "A repeatable report can help an administrator answer recurring questions with a consistent definition and period.",
        "who": "Director, principal, accountant, academic coordinator",
        "demo": "Search for one relevant report, inspect its filters and calculation explanation, then preview or export only demo data.",
        "sample": "Weekly attendance report · Date range and cohort to be selected by the institute.",
        "guard": "Check report scope, date range, formula, and role access before sharing an export.",
        "evidence": [
            ("frontend/src/pages/Reports.tsx", "reports page"),
            ("frontend/src/test/ReportingCentre.test.tsx", "report catalog, search, grids, favorites, API-backed views"),
            ("frontend/src/test/ReportIntelligence.test.tsx", "calculation explanation and decision insights"),
        ],
        "notes": "Avoid saying that every report is an independent truth source: explain that reports summarize underlying module data, so data quality and filters matter. Demonstrate search, one report, and its calculation explanation where available. Always call out the reporting period and selected cohort. Do not export personal or financial data to an uncontrolled location.",
    },
    {
        "name": "Settings",
        "area": "CONFIGURE AND PROTECT",
        "route": "/settings",
        "what": "Central administration workspaces for institute profile, branding, lookups, and other system and workspace configuration.",
        "why": "A controlled configuration area helps the institute align names, policies, and defaults before staff use everyday workflows.",
        "who": "System administrator, principal, authorized configuration owner",
        "demo": "Review the institute profile preview and settings categories without saving changes.",
        "sample": "Academic year · Institute identity · Role policy (configuration preview).",
        "guard": "Some settings affect the whole institute. Changes require the correct role, explicit Edit Mode, and a review plan.",
        "evidence": [
            ("frontend/src/pages/Settings.tsx", "settings page"),
            ("frontend/src/test/Settings.test.tsx", "settings categories, institute profile, branding, and lookup table"),
            ("frontend/src/App.tsx", "route role restrictions"),
        ],
        "notes": "Use Settings to explain governance and consistency. Show the institute profile and the category navigation, but do not change a global setting live. The route is restricted to administrator/principal roles in the application routes. Before onboarding, decide who owns each configuration and test changes in the training environment. The tagline, 'Your institute controls its data; we manage the infrastructure,' describes a responsibility split only where provider-managed infrastructure is in scope. Confirm the hosting model, access, export, backup, retention, deletion, and responsibilities in the service terms.",
    },
    {
        "name": "Courses",
        "area": "TEACH AND ASSESS",
        "route": "/courses/repository",
        "what": "A teaching-content library for uploads, chapter notes, question banks, video lectures, and curriculum syllabi.",
        "why": "A shared catalogue can make it easier for teachers to find and reuse institute-approved learning materials.",
        "who": "Academic coordinator, teachers, content administrator",
        "demo": "Filter the content library and preview the notes, question-bank, or syllabus workspace without uploading files.",
        "sample": "JEE Foundation · Algebra chapter · Content status: preview only.",
        "guard": "Confirm storage limits, file policy, permissions, and rights to teaching material before uploading or sharing.",
        "evidence": [
            ("frontend/src/pages/Courses.tsx", "course workspaces"),
            ("frontend/src/test/CourseDedicatedSubmenus.test.tsx", "library, uploads, notes, question banks, videos, syllabi, storage settings"),
        ],
        "notes": "Explain that Courses helps organize reusable content, while Homework is the separate assignment and review workflow. Show the library and one content category. The UI includes storage policy and file rules; check these and any copyright/license permissions before loading institute materials. Do not claim student access or external video streaming unless confirmed for the current deployment.",
    },
    {
        "name": "Homework",
        "area": "TEACH AND ASSESS",
        "route": "/homework",
        "what": "A homework studio for assigning work to a batch, individual learner, or selected group, with checking, submissions, registers, and templates.",
        "why": "Teachers can follow work from assignment through review and see which learners need support.",
        "who": "Teacher, academic coordinator, authorized student-support team",
        "demo": "Open the checking register and digital-submissions view; preview an assignment form without publishing it.",
        "sample": "Quadratic practice · Due date to be set · Evaluation not started.",
        "guard": "Do not publish to a live batch or edit a learner's submission during a general demo.",
        "evidence": [
            ("frontend/src/pages/HomeworkWorkspace.tsx", "homework studio"),
            ("frontend/src/test/HomeworkWorkspace.test.tsx", "checking, daily register, target selection, submissions, templates"),
            ("docs/03_ACADEMIC_MANAGEMENT/2026-11-12_ACADEMIC-MANAGEMENT_ACCEPTANCE-REPORT_HOMEWORK-AND-ASSIGNMENT-ENHANCEMENT_V1.md", "homework acceptance report"),
        ],
        "notes": "Describe the loop: choose the intended learners, set the assignment, review submission status, and use the register for follow-up. Show the checking register and templates. This supports tracking in the application; do not promise that students receive notifications or submit from an external portal until that complete route is validated in the target deployment.",
    },
    {
        "name": "EduBoard",
        "area": "TEACH AND ASSESS",
        "route": "/eduboard/4",
        "what": "A classroom presentation canvas with board-display workspaces, multiple pages, and recovery support for an interrupted session.",
        "why": "Teachers can present lesson content in a shared digital space rather than depending only on a physical board.",
        "who": "Teacher, classroom presenter, academic technology administrator",
        "demo": "Open the board in read-only/student view and show the display mode; if approved, switch between the available whiteboard/greenboard presentation modes.",
        "sample": "Physics lesson · Read-only display · Four-page lesson outline (illustrative).",
        "guard": "Student view is read-only. Keep drawing/editing controls locked for a public demo and test display hardware separately.",
        "evidence": [
            ("frontend/src/pages/EduBoardWorkspace.tsx", "EduBoard workspace"),
            ("frontend/src/test/EduBoardWorkspace.test.tsx", "read-only student canvas, scoped recovery, edit governance, multi-page, conflict recovery"),
            ("frontend/src/test/EduBoardDisplayAndPopout.test.tsx", "display and popout behavior"),
            ("docs/03_ACADEMIC_MANAGEMENT/2026-11-12_ACADEMIC-MANAGEMENT_AUDIT-REPORT_EDUBOARD-EXISTING-FUNCTIONALITY-AUDIT_V1.md", "EduBoard functionality audit"),
        ],
        "notes": "Show EduBoard as the classroom display surface. Explain the difference between presenter/edit mode and read-only student display. The source tests cover multi-page addition, scoped local recovery, and a read-only student canvas. Check the actual classroom display and browser/device profile before claiming hardware compatibility. Avoid implying lecture capture or automatic distribution unless validated separately.",
    },
    {
        "name": "Forms",
        "area": "ADMINISTER AND DOCUMENT",
        "route": "/forms/overview",
        "what": "A document workspace for admission forms, identity cards, receipts/notices, hall tickets, transcripts, certificates, and bulk printing.",
        "why": "Standard templates help staff produce consistent documents while keeping a preview step before printing.",
        "who": "Admissions desk, office administrator, exam coordinator, fee desk",
        "demo": "Preview an admission form or identity card and show the print audit workspace without printing real personal data.",
        "sample": "Identity-card template · Demo fields only · Print not started.",
        "guard": "A masked field or consent element is not, on its own, a legal-compliance certification. Validate templates, consent, and print access.",
        "evidence": [
            ("frontend/src/pages/FormsDocuments.tsx", "forms/document workspace"),
            ("frontend/src/test/FormsDedicatedSubmenus.test.tsx", "forms, IDs, financial docs, transcripts, certificates, bulk print, audit"),
            ("frontend/src/test/FormsDocuments.test.tsx", "A4 template, masked Aadhaar, consent, and print behavior"),
        ],
        "notes": "Emphasize consistency and preview-before-print, not paper elimination. The workspace includes multiple form/document categories and a bulk print spooler/audit trail. A test checks a masked Aadhaar field and consent section in an A4 template; do not describe that single template as a full legal compliance guarantee. Use synthetic records in demos and verify the institute's approved wording.",
    },
    {
        "name": "Import_Export",
        "area": "ADMINISTER AND DOCUMENT",
        "route": "/import-export",
        "what": "A guided data exchange workspace with a paste/grid import, validation, filtered export, and import-history views.",
        "why": "Structured checks before and after transfer can reduce avoidable errors when an institute brings data in or prepares a report for another process.",
        "who": "Data steward, administrator, accountant, authorized operator",
        "demo": "Load sample rows, run grid validation, inspect export filters, and show import history without committing a live import.",
        "sample": "DEMO-STU-001 · Required fields checked · No import committed.",
        "guard": "Export workflows must follow approved backup, retention, and deletion policy.",
        "evidence": [
            ("frontend/src/pages/ImportExport.tsx", "import/export workspace"),
            ("frontend/src/test/ImportExport.test.tsx", "paste grid, sample validation, export filters, history"),
            ("docs/25_BUSINESS_REQUIREMENTS/2026-11-06_GLOBAL_POLICY_SINGLE-SOURCE-OF-TRUTH-GOVERNANCE_V1.md", "SSOT governance"),
            ("docs/25_BUSINESS_REQUIREMENTS/2026-11-09_GLOBAL_POLICY_DATA-DEDUPLICATION-AND-MAPPING-GOVERNANCE_V1.md", "canonical master and mapping policy"),
        ],
        "notes": "Position Import/Export as a controlled data-change workflow, not an instant system-to-system sync. Show sample-row validation and an import-history entry. Before a real migration, take a verified backup, agree field mappings, reconcile counts, and use canonical student/staff/subject masters. Confirm the result before relying on imported data. The tagline, 'Your institute controls its data; we manage the infrastructure,' does not replace explicit agreement on the hosting model, export format, access, backup retention, deletion timing, and each party's responsibilities.",
    },
    {
        "name": "Training",
        "area": "CONFIGURE AND PROTECT",
        "route": "/training",
        "what": "A separate training/simulation workspace for staff practice, workflow drills, status monitoring, and controlled baseline resets.",
        "why": "Staff can learn key steps away from production records, reducing the chance that training activity changes real institute data.",
        "who": "Trainer, administrator, new staff, module champions",
        "demo": "Verify the PA001-DEMO training tenant and visible TRAINING indicator, then navigate using sample records only.",
        "sample": "PA001-DEMO · Synthetic practice only · Reset not run.",
        "guard": "Never reset a tenant or switch to production during a showcase. Confirm the environment badge before any edit.",
        "evidence": [
            ("frontend/src/pages/TrainingManagement.tsx", "isolated training lab and PA001-DEMO tenant"),
            ("frontend/src/test/TrainingEnvironment.test.tsx", "mode switch, warnings, logout reset, training banner"),
            ("frontend/src/test/StudentDedicatedSubmenus.test.tsx", "training-mode indicator"),
        ],
        "notes": "Make the environment boundary visible before practising: the administrator page identifies PA001-DEMO as an isolated sample sandbox and the app surfaces a training-mode indicator. Show the indicator, not a reset action. Confirm that the actual deployment has the expected training dataset and permissions; do not switch environments or reset during a presentation. Navigation/logout behavior should return users to the governed default state.",
    },
]


def _relative(path: str) -> str:
    return path.replace("\\", "/")


def _linked_sources(items: list[tuple[str, str]]) -> str:
    return "; ".join(
        f"[{label}](../../{_relative(path)})"
        for path, label in items
    )


def build_report() -> None:
    lines = [
        "---",
        'title: "PrathamOne EduOS 20-Module Coaching Institute Presentation Guide"',
        'module: "00_PRODUCT_OVERVIEW"',
        'category: "PRESENTATION-GUIDE"',
        'document_type: "GUIDE"',
        'product: "PrathamOne EduOS"',
        'edition: "Coaching Institute Edition"',
        'version: "1.0.0"',
        'doc_version: "1.0"',
        'created_date: "2026-11-19"',
        'updated_date: "2026-11-19"',
        'author: "Jawahar R Mallah"',
        'organization: "Smritisys & AITDL Networks"',
        'status: "Draft"',
        'tags: ["coaching-institute", "presentation", "module-guide", "rollout", "administrator"]',
        'entities: ["PrathamOneEduOS", "CoachingInstituteModule"]',
        'api_routes: ["/dashboard", "/students", "/leads/pipeline", "/fees", "/attendance", "/academic/timetable", "/examinations", "/staff", "/communication", "/reports", "/settings", "/courses", "/homework", "/eduboard", "/forms", "/import-export", "/training"]',
        'related_modules: ["00_PRODUCT_OVERVIEW", "03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "07_ATTENDANCE", "08_EXAMINATION", "09_FEES_PAYMENTS", "11_REPORTS_EXPORTS", "12_RBAC_SECURITY", "13_SYSADMIN_SETTINGS", "14_PRINTING_DOCUMENTS", "16_DATABASE_API", "18_TESTING_QA", "25_BUSINESS_REQUIREMENTS"]',
        "---",
        "",
        "# PrathamOne EduOS: A Plain-Language Guide to 20 Modules",
        "",
        "**Audience:** Coaching institute owners, principals, administrators, coordinators, teachers, and operations teams.",
        "",
        "**Companion presentation:** `docs/assets/commercial/PrathamOne_EduOS_20_Module_Guide.pptx` and [PDF export](../assets/commercial/PrathamOne_EduOS_20_Module_Guide.pdf) (25 slides; presenter notes and unmodified live application screenshots included).",
        "",
        "## Purpose and evidence limits",
        "",
        "This guide explains what each module is for, why it may matter in a coaching institute, who typically uses it, and how to demonstrate it safely. Feature statements are grounded in the current frontend routes/components and focused UI tests in this repository. A test that confirms a screen or interaction is not proof of a production deployment, complete end-to-end business process, external provider configuration, service-level commitment, legal compliance, or business outcome.",
        "",
        "The material is a product walkthrough aid, not a contractual feature warranty. It was prepared from repository evidence available on 2026-11-19. Confirm the target deployment, tenant data, role permissions, integrations, and policy settings before a customer-facing presentation.",
        "",
        "The module list follows the requested 20-module directory. Some features share a workspace: notably, Scholarships is presented inside Fees/Concessions rather than as an independent top-level route.",
        "",
        "## Screenshot and sample-data provenance",
        "",
        "Each module slide includes a direct, unmodified screenshot captured from the application's PRODUCTION data environment; no names, contact details, identifiers, page areas, or other screen content have been masked or retouched. Screenshots may contain sensitive student, staff, academic, or financial information. This deck is for internal, access-controlled use only and must not be distributed externally. Displayed values are reproduced as they appeared at capture time and have not been independently reconciled or audited. The adjacent sample-data panel is illustrative slide text only and is not a persisted application record.",
        "",
        "## How to present the product",
        "",
        "1. Start with one operational story: enquiry -> enrolled learner -> batch and timetable -> attendance and learning -> assessment and result -> fee and family communication.",
        "2. Show one representative screen per workflow. Describe the task in everyday terms before naming system capabilities.",
        "3. For rehearsals, use a synthetic training dataset and keep the screen in View Mode; switch to scoped Edit Mode only when a planned, authorized demo requires a change.",
        "4. Treat displayed sample data as illustrative. State the selected institute, cohort, and date range when discussing a report.",
        "5. Separate configured interface from live integration: demonstrate provider delivery, payment settlement, devices, and external imports only after testing them in the target environment.",
        "",
        "## The 20 modules",
        "",
    ]

    for index, module in enumerate(MODULES, start=1):
        source_links = _linked_sources(module["evidence"])
        lines.extend(
            [
                f"### {index}. {module['name']}",
                "",
                f"**Workspace:** `{module['route']}`  ",
                f"**What it does:** {module['what']}  ",
                f"**Why it matters:** {module['why']}  ",
                f"**Typical users:** {module['who']}  ",
                f"**Safe demo:** {module['demo']}  ",
                f"**Illustrative sample (slide only):** {module['sample']} This is not a saved application record.  ",
                f"**Presenter caution:** {module['guard']}  ",
                f"**Evidence:** {source_links}",
                "",
            ]
        )

    lines.extend(
        [
            "## Suggested end-to-end demonstration",
            "",
            "Use a synthetic prospective learner to tell one coherent story. First show the Admissions pipeline and follow-up view; then show the corresponding learner record in Students and its batch context. Navigate to the academic timetable, then demonstrate attendance and a read-only EduBoard view. Show how an assessment appears in Examinations and a synthetic result in Results. Finish with the fee overview and a read-only benefit/receipt breakdown, then locate the relevant Reports view. Keep the sequence navigational and read-only; do not create a lead, enroll a student, record attendance, enter marks, apply a benefit, collect money, send a message, or print real personal data.",
            "",
            "The exact linkage among records depends on the selected demo tenant and its seed data. If a link is missing, explain the screen without inventing a record relationship.",
            "",
            "## Recommended rollout approach",
            "",
            "### 1. Discover and assign ownership",
            "",
            "Name an executive sponsor, an operational lead, and a module champion for admissions, student records, academics, fees, attendance, communication, and reporting. Map the institute's existing terms (courses, standards, batches, academic years) to the product's canonical structure. Agree which roles may view, edit, approve, export, and print.",
            "",
            "### 2. Prepare and reconcile data",
            "",
            "Take and verify a restorable backup before migration. Deduplicate people and shared academic masters, preserve historical financial and academic snapshots, map imported rows to the canonical entities, and test a small sample. Reconcile source and destination counts and totals before expanding the import.",
            "",
            "### 3. Configure and test",
            "",
            "Set institute identity, academic year, courses/batches, fee policies, grading rules, attendance rules, roles, and document templates. Test only the integrations actually required (payment provider, messaging channel, scanner/device, or external data source) in the intended environment; record whether each is configured, tested, and approved.",
            "",
            "### 4. Rehearse in Training",
            "",
            "Use the isolated training tenant, verify the visible training indicator, and rehearse common role-specific tasks with synthetic records. Do not use production reset actions as a training shortcut. Collect questions and update the institute's short operating procedures.",
            "",
            "### 5. Pilot, review, and expand",
            "",
            "Start with one representative course or batch and a small set of authorized users. Run the institute's normal workflows for an agreed pilot period. Review data quality, financial reconciliation, permissions, and staff feedback; correct the process before adding more batches or modules.",
            "",
            "## Baseline and success measures",
            "",
            "Capture a baseline before the pilot, then compare the same measures, scope, and time window after it. Use institute-owned targets; this guide does not promise a particular percentage improvement or payback period.",
            "",
            "- **Admissions:** enquiry response time, follow-ups due/completed, and enquiry-to-enrolment count using an agreed definition.",
            "- **Student records:** required-field completeness, duplicate exceptions, and batch allocation exceptions.",
            "- **Fees:** invoices/collections reconciled to source records, overdue balance by agreed ageing bands, and refund/reversal exceptions.",
            "- **Attendance:** register completion time, unmarked sessions, and absence follow-up cases.",
            "- **Academics:** timetable conflicts found before publishing, assessment completion, and time to prepare a reviewed report card.",
            "- **Homework and communication:** assignment review backlog, dispatch failures/undelivered items, and unresolved communication cases.",
            "- **Adoption and control:** training completion, support requests, use of authorized roles, and number of corrected data issues.",
            "",
            "## Claims and checks before presenting",
            "",
            "- Do not repeat ROI, rollout-time, collection-lift, attendance-lift, speed, or accuracy figures unless they are supported by a defined measurement and an approved source.",
            "- Do not promise live WhatsApp/SMS delivery, online payment processing, RFID/scanner compatibility, offline operation, or external-system synchronization based only on a visible UI or route.",
            "- Show Scholarships as a fee benefit workspace; do not imply a separate module route or an external sponsor workflow without confirming it.",
            "- The tagline 'Your institute controls its data; we manage the infrastructure.' describes a responsibility split only where provider-managed infrastructure is in scope. Confirm the hosting model, data access, export, backup, retention, deletion, and each party's responsibilities before presenting it.",
            "- Demonstrate concessions, admissions conversion, attendance marks, marks entry, communications, imports, and payments only in training or with explicit scoped authorization.",
            "- Confirm the approved product build and access controls before presenting. The deck contains unmodified screenshots with live personal and operational data; keep it internal and access-controlled. Values are not independently audited. Slide-side examples are illustrative and are not saved application records.",
            "",
            "## Repository evidence and governance",
            "",
            "- [Global Single Source of Truth governance](../25_BUSINESS_REQUIREMENTS/2026-11-06_GLOBAL_POLICY_SINGLE-SOURCE-OF-TRUTH-GOVERNANCE_V1.md)",
            "- [Global data deduplication and mapping governance](../25_BUSINESS_REQUIREMENTS/2026-11-09_GLOBAL_POLICY_DATA-DEDUPLICATION-AND-MAPPING-GOVERNANCE_V1.md)",
            "- [Global View-First and explicit Edit Mode governance](../12_RBAC_SECURITY/2026-11-07_RBAC-SECURITY_IMPLEMENTATION-REPORT_GLOBAL-VIEW-FIRST-AND-EXPLICIT-EDIT-MODE-GOVERNANCE_V1.md)",
            "- [Official route and role boundaries](../../frontend/src/App.tsx)",
            "- [Existing pitch deck specification](2026-11-19_PRODUCT-OVERVIEW_REPORT_COACHING-PITCH-DECK-PRESENTATION_V1.md) - treat its business-impact and integration statements as claims to re-verify, not evidence for this guide.",
            "",
            "## Suggested next step",
            "",
            "Before presenting externally, run a short internal review with the product owner and institute administrator: verify the exact demo tenant, replace any stale sample dataset, test the required roles and integrations, and agree the pilot scope and baseline measures. Then use the accompanying deck as a guided conversation rather than a promise sheet.",
            "",
        ]
    )

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")


def _set_background(slide, prs) -> None:
    shape = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = NAVY
    shape.line.fill.background()


def _add_text(slide, text, x, y, w, h, size, color, bold=False, align=None):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    frame = box.text_frame
    frame.clear()
    frame.word_wrap = True
    frame.margin_left = Inches(0.03)
    frame.margin_right = Inches(0.03)
    frame.margin_top = Inches(0.02)
    frame.margin_bottom = Inches(0.02)
    frame.vertical_anchor = MSO_ANCHOR.MIDDLE
    paragraph = frame.paragraphs[0]
    paragraph.text = text
    paragraph.font.name = FONT
    paragraph.font.size = Pt(size)
    paragraph.font.bold = bold
    paragraph.font.color.rgb = color
    if align is not None:
        paragraph.alignment = align
    return box


def _add_header(slide, category: str, title: str, subtitle: str) -> None:
    _add_text(slide, category.upper(), 0.75, 0.25, 11.9, 0.3, 10, ORANGE, True)
    _add_text(slide, title, 0.75, 0.56, 11.9, 0.56, 26, TEXT, True)
    _add_text(slide, subtitle, 0.78, 1.16, 11.7, 0.45, 12, SLATE)


def _add_footer(slide, number: int, total: int) -> None:
    _add_text(
        slide,
        "PrathamOne EduOS 1.0.0  |  Prashant Academy (Founder & Dean: Prashant Tejam)  |  "
        "Product Architect: Jawahar R. Mallah  |  Smritisys & AITDL Networks",
        0.75,
        7.08,
        10.8,
        0.2,
        8,
        SLATE,
    )
    _add_text(
        slide,
        f"{number:02d} / {total:02d}",
        11.7,
        7.04,
        0.85,
        0.25,
        9,
        AMBER,
        True,
        PP_ALIGN.RIGHT,
    )


def _add_card(slide, x, y, title, body, accent=ORANGE):
    card = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        Inches(x),
        Inches(y),
        Inches(5.77),
        Inches(2.1),
    )
    card.fill.solid()
    card.fill.fore_color.rgb = PANEL
    card.line.color.rgb = BLUE_EDGE
    card.line.width = Pt(1)
    bar = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE,
        Inches(x + 0.16),
        Inches(y + 0.18),
        Inches(0.055),
        Inches(1.72),
    )
    bar.fill.solid()
    bar.fill.fore_color.rgb = accent
    bar.line.fill.background()
    _add_text(slide, title.upper(), x + 0.34, y + 0.2, 5.15, 0.32, 10, accent, True)
    _add_text(slide, body, x + 0.34, y + 0.62, 5.12, 1.25, 15, PALE)


def _add_module_info_card(slide, x, y, width, height, title, body, accent):
    card = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        Inches(x),
        Inches(y),
        Inches(width),
        Inches(height),
    )
    card.fill.solid()
    card.fill.fore_color.rgb = PANEL
    card.line.color.rgb = BLUE_EDGE
    card.line.width = Pt(0.8)
    _add_text(slide, title.upper(), x + 0.16, y + 0.08, width - 0.3, 0.2, 8, accent, True)
    _add_text(slide, body, x + 0.16, y + 0.31, width - 0.3, height - 0.36, 10, PALE)


def _original_screenshot(module: dict) -> str:
    image_path = SCREENSHOTS_PATH / f"{module['name'].lower()}.png"
    if not image_path.is_file():
        raise FileNotFoundError(f"Module screenshot not found: {image_path}")
    return str(image_path)


def _add_notes(slide, notes: str, evidence: list[tuple[str, str]]) -> None:
    sources = "\n".join(f"- {path}: {label}" for path, label in evidence)
    slide.notes_slide.notes_text_frame.text = f"{notes}\n\nEvidence checked:\n{sources}"


def _add_title_slide(prs, total: int) -> None:
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _set_background(slide, prs)
    hero = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        Inches(0.72),
        Inches(0.72),
        Inches(11.9),
        Inches(5.95),
    )
    hero.fill.solid()
    hero.fill.fore_color.rgb = PANEL_ALT
    hero.line.color.rgb = ORANGE
    hero.line.width = Pt(2)
    if LOGO_PATH.exists():
        slide.shapes.add_picture(str(LOGO_PATH), Inches(1.15), Inches(1.15), width=Inches(3.2))
    _add_text(slide, "PRATHAMONE EduOS", 1.15, 2.15, 10.8, 0.72, 34, TEXT, True)
    _add_text(
        slide,
        "A plain-language guide to 20 modules",
        1.18,
        2.98,
        10.7,
        0.55,
        23,
        AMBER,
        True,
    )
    _add_text(
        slide,
        "What each workspace does | why it matters | how to demo it safely",
        1.2,
        3.7,
        10.4,
        0.55,
        16,
        PALE,
    )
    _add_text(
        slide,
        "Coaching Institute Edition  |  Version 1.0.0\n"
        "Client Showcase: Prashant Academy Coaching Institute\n"
        "Founder, Dean & Owner: Prashant Tejam  |  Product Architect: Jawahar R. Mallah",
        1.2,
        4.62,
        9.5,
        0.95,
        12,
        SLATE,
    )
    _add_footer(slide, 1, total)
    slide.notes_slide.notes_text_frame.text = (
        "Purpose: a practical product walkthrough for coaching institute decision-makers. "
        "This is not a feature warranty. Feature descriptions are grounded in repository "
        "routes/components and focused tests reviewed on 2026-11-19. Integrations and "
        "business outcomes must be validated in the target environment."
    )


def _add_workflow_slide(prs, total: int) -> None:
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _set_background(slide, prs)
    _add_header(
        slide,
        "A COACHING INSTITUTE DAY",
        "Connect the work, not just the screens",
        "Use one learner journey to explain why the modules belong together.",
    )
    steps = [
        ("ENQUIRE", "Admissions"),
        ("ENROL", "Students"),
        ("SCHEDULE", "Courses + Timetable"),
        ("TEACH", "Attendance + Homework + EduBoard"),
        ("ASSESS", "Examinations + Results"),
        ("RECONCILE", "Fees + Benefits + Reports"),
    ]
    x_positions = [0.78, 2.86, 4.94, 7.02, 9.1, 11.18]
    for i, (verb, module) in enumerate(steps):
        x = x_positions[i]
        card = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            Inches(x),
            Inches(2.25),
            Inches(1.65),
            Inches(2.5),
        )
        card.fill.solid()
        card.fill.fore_color.rgb = PANEL
        card.line.color.rgb = BLUE_EDGE
        _add_text(slide, f"{i + 1:02d}", x + 0.14, 2.48, 1.35, 0.35, 15, ORANGE, True)
        _add_text(slide, verb, x + 0.14, 2.98, 1.35, 0.45, 13, TEXT, True)
        _add_text(slide, module, x + 0.14, 3.58, 1.36, 0.8, 10, PALE)
        if i < len(steps) - 1:
            _add_text(slide, ">", x + 1.7, 3.05, 0.35, 0.45, 20, AMBER, True)
    _add_text(
        slide,
        "The sequence is a presentation story, not a claim that every sample record is already linked.",
        0.9,
        5.45,
        11.5,
        0.45,
        13,
        MINT,
    )
    _add_footer(slide, 2, total)
    slide.notes_slide.notes_text_frame.text = (
        "Tell the institute's story from first enquiry through teaching, assessment, and fee review. "
        "The slide is conceptual; confirm linked sample data in the selected tenant before promising "
        "that a particular record flows automatically between screens. Use this sequence to ask "
        "which workflow causes the most delay or rework today."
    )


def _add_module_slide(prs, module: dict, number: int, total: int) -> None:
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _set_background(slide, prs)
    _add_header(
        slide,
        module["area"],
        module["name"],
        f"Workspace: {module['route']}  |  A practical view for coaching institutes",
    )
    slide.shapes.add_picture(
        _original_screenshot(module),
        Inches(0.75),
        Inches(1.78),
        height=Inches(3.6),
    )
    _add_text(
        slide,
        "LIVE APPLICATION SCREEN  |  UNMODIFIED CAPTURE  |  INTERNAL USE ONLY",
        0.82,
        5.42,
        6.3,
        0.18,
        7,
        MINT,
        True,
    )
    card_x = 7.45
    card_width = 5.15
    card_height = 0.88
    card_gap = 0.12
    cards = [
        ("What it does", module["what"], ORANGE),
        ("Why it matters", module["why"], AMBER),
        ("Typical users", module["who"], MINT),
        ("Illustrative sample · not live data", module["sample"], ORANGE),
    ]
    for index, (title, body, accent) in enumerate(cards):
        _add_module_info_card(
            slide,
            card_x,
            1.78 + index * (card_height + card_gap),
            card_width,
            card_height,
            title,
            body,
            accent,
        )
    _add_text(
        slide,
        "SAFE DEMO  |  " + module["demo"],
        0.82,
        5.78,
        11.8,
        0.38,
        9,
        PALE,
    )
    _add_text(
        slide,
        "PRESENTER CHECK  |  " + module["guard"],
        0.86,
        6.28,
        11.55,
        0.46,
        9,
        AMBER,
        True,
    )
    if module["name"] in {"Settings", "Import_Export"}:
        _add_text(
            slide,
            "Your institute controls its data; we manage the infrastructure.",
            0.86,
            6.78,
            11.55,
            0.18,
            8,
            ORANGE,
            True,
        )
    _add_footer(slide, number, total)
    screenshot_note = (
        "The screenshot is a direct, unmodified application capture from the PRODUCTION data "
        "environment. It may show personal, academic, or financial data; keep this presentation "
        "internal and access-controlled, and do not distribute it externally. Displayed values "
        "have not been independently audited. The adjacent sample is illustrative slide-only text, "
        "not a persisted application record."
    )
    _add_notes(
        slide,
        f"{module['notes']}\n\n{screenshot_note}",
        module["evidence"],
    )


def _add_rollout_slide(prs, total: int) -> None:
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _set_background(slide, prs)
    _add_header(
        slide,
        "HOW TO PROCEED",
        "A staged rollout is safer than a big-bang switch",
        "Agree the scope and evidence at each stage; set durations with the institute.",
    )
    phases = [
        ("01", "Discover", "Owners, roles, current workflows, and pilot scope"),
        ("02", "Prepare", "Backup, deduplicate, map masters, reconcile a sample"),
        ("03", "Configure", "Institute rules, access, templates, and required integrations"),
        ("04", "Rehearse", "Practice with synthetic data in the Training environment"),
        ("05", "Pilot + review", "One representative batch; reconcile, learn, then expand"),
    ]
    y = 1.9
    for number, title, body in phases:
        _add_text(slide, number, 0.94, y, 0.55, 0.42, 16, ORANGE, True)
        _add_text(slide, title, 1.72, y, 2.25, 0.42, 16, TEXT, True)
        _add_text(slide, body, 4.0, y, 7.9, 0.5, 14, PALE)
        y += 0.86
    _add_text(
        slide,
        "Expand only after record counts, financial totals, permissions, and staff readiness are reviewed.",
        0.95,
        6.35,
        11.4,
        0.38,
        12,
        MINT,
        True,
    )
    _add_footer(slide, total - 2, total)
    slide.notes_slide.notes_text_frame.text = (
        "Recommendation: begin with a small, representative pilot chosen by the institute. "
        "Before migration, take and verify a restorable backup; use canonical person/student and "
        "shared academic masters; preserve historical records. Configure roles and policies, then "
        "rehearse in the isolated training environment. Expand when reconciliations, access checks, "
        "and user feedback meet institute-defined criteria. Do not promise a fixed go-live duration."
    )


def _add_metrics_slide(prs, total: int) -> None:
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _set_background(slide, prs)
    _add_header(
        slide,
        "MEASURE WHAT MATTERS",
        "Choose a baseline before the pilot",
        "Compare like with like. Institute leaders set targets; no ROI guarantee is implied.",
    )
    groups = [
        ("ADMISSIONS", "Response time | follow-ups completed | conversion definition"),
        ("RECORDS", "Required-field completeness | duplicate exceptions | allocation issues"),
        ("FINANCE", "Reconciled collections | overdue ageing | reversal exceptions"),
        ("ACADEMICS", "Register completion | timetable clashes | result preparation cycle"),
        ("ADOPTION", "Training completion | support requests | corrected data issues"),
    ]
    positions = [(0.8, 2.0), (4.62, 2.0), (8.44, 2.0), (2.71, 4.22), (6.53, 4.22)]
    for (title, body), (x, y) in zip(groups, positions):
        card = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            Inches(x),
            Inches(y),
            Inches(3.55),
            Inches(1.75),
        )
        card.fill.solid()
        card.fill.fore_color.rgb = PANEL
        card.line.color.rgb = BLUE_EDGE
        _add_text(slide, title, x + 0.2, y + 0.18, 3.12, 0.35, 11, ORANGE, True)
        _add_text(slide, body, x + 0.2, y + 0.62, 3.1, 0.9, 12, PALE)
    _add_footer(slide, total - 1, total)
    slide.notes_slide.notes_text_frame.text = (
        "Agree metric definitions, scope, and baseline dates before the pilot. For example, define "
        "what counts as a lead response and which fee statuses are reconciled. Use the same cohort, "
        "date window, and denominator for comparison. Report observed results rather than importing "
        "marketing percentages from another context."
    )


def _add_close_slide(prs, total: int) -> None:
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _set_background(slide, prs)
    _add_header(
        slide,
        "NEXT STEP",
        "Start with one institute question",
        "Which workflow should we prove first, with which users, data, and safeguards?",
    )
    _add_card(
        slide,
        0.88,
        2.2,
        "Before the demo",
        "Confirm the tenant, synthetic dataset, role permissions, and required integrations.",
        ORANGE,
    )
    _add_card(
        slide,
        6.72,
        2.2,
        "During the demo",
        "Stay in View Mode, show one real workflow, and call out configuration dependencies.",
        AMBER,
    )
    _add_card(
        slide,
        0.88,
        4.55,
        "After the demo",
        "Agree a small pilot, named owners, reconciliation checks, and baseline measures.",
        MINT,
    )
    _add_card(
        slide,
        6.72,
        4.55,
        "Data control, managed infrastructure",
        "Your institute controls its data; we manage the infrastructure. Define hosting, access, exports, backups and responsibilities in the service agreement.",
        ORANGE,
    )
    _add_footer(slide, total, total)
    slide.notes_slide.notes_text_frame.text = (
        "Close by asking the institute to select the first workflow to validate. Capture who will "
        "own the pilot, which sample data is safe, which configuration must be tested, and what "
        "evidence will count as success. The deck is a discussion guide; next steps and outcomes "
        "must be agreed with the institute. Use the data-control tagline only when the selected "
        "hosting model and provider responsibilities match the service agreement."
    )


def convert_pptx_to_pdf(pptx_path: Path, pdf_path: Path):
    """Converts a PowerPoint presentation to PDF using PowerPoint COM automation."""
    try:
        import win32com.client
        abs_pptx = str(pptx_path.resolve())
        abs_pdf = str(pdf_path.resolve())
        print(f"Exporting PDF via PowerPoint COM: {abs_pptx} -> {abs_pdf}...")
        ppt = win32com.client.Dispatch("PowerPoint.Application")
        pres = ppt.Presentations.Open(abs_pptx, ReadOnly=True, Untitled=False, WithWindow=False)
        pres.SaveAs(abs_pdf, 32)  # 32 = ppSaveAsPDF
        pres.Close()
        ppt.Quit()
        if pdf_path.exists() and pdf_path.stat().st_size > 0:
            print(f"Successfully generated PDF presentation: {pdf_path} ({pdf_path.stat().st_size} bytes)")
            return True
    except Exception as e:
        print(f"PowerPoint COM PDF conversion notice: {e}")
    return False


def build_deck() -> None:
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    total = len(MODULES) + 5
    _add_title_slide(prs, total)
    _add_workflow_slide(prs, total)
    for number, module in enumerate(MODULES, start=3):
        _add_module_slide(prs, module, number, total)
    _add_rollout_slide(prs, total)
    _add_metrics_slide(prs, total)
    _add_close_slide(prs, total)
    DECK_PATH.parent.mkdir(parents=True, exist_ok=True)
    prs.save(DECK_PATH)
    pdf_path = DECK_PATH.with_suffix(".pdf")
    convert_pptx_to_pdf(DECK_PATH, pdf_path)


if __name__ == "__main__":
    build_report()
    build_deck()
    print(f"Created: {REPORT_PATH}")
    print(f"Created: {DECK_PATH}")
