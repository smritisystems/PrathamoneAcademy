# /**
#  * @file        generate_institute_operations_presentation.py
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
#  * @description Generates a customer-safe presentation about institute operations and data control.
#  */

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt


ROOT = Path(__file__).resolve().parents[1]
DECK_PATH = ROOT / "docs" / "assets" / "commercial" / (
    "PrathamOne_EduOS_Institute_Operations_and_Data_Control.pptx"
)
REPORT_PATH = ROOT / "docs" / "00_PRODUCT_OVERVIEW" / (
    "2026-11-19_PRODUCT-OVERVIEW_PRESENTATION-GUIDE_INSTITUTE-OPERATIONS-AND-DATA-CONTROL_V1.md"
)
LOGO_PATH = ROOT / "frontend" / "public" / "media" / "logo" / (
    "prathamone-eduos-horizontal-transparent.png"
)

BACKGROUND = RGBColor(248, 250, 252)
PANEL = RGBColor(255, 255, 255)
PANEL_ALT = RGBColor(238, 244, 251)
NAVY = RGBColor(11, 30, 61)
TEXT = RGBColor(15, 23, 42)
BODY = RGBColor(51, 65, 85)
MUTED = RGBColor(100, 116, 139)
EDGE = RGBColor(203, 213, 225)
ORANGE = RGBColor(241, 105, 6)
AMBER = RGBColor(180, 83, 9)
GREEN = RGBColor(4, 120, 87)
BLUE = RGBColor(37, 99, 235)
FONT = "Segoe UI"
SLIDE_WIDTH = Inches(13.333)
SLIDE_HEIGHT = Inches(7.5)


def _set_background(slide) -> None:
    background = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, 0, 0, SLIDE_WIDTH, SLIDE_HEIGHT
    )
    background.fill.solid()
    background.fill.fore_color.rgb = BACKGROUND
    background.line.fill.background()


def _text(
    slide,
    value: str,
    x: float,
    y: float,
    width: float,
    height: float,
    size: int,
    color: RGBColor = TEXT,
    bold: bool = False,
    align=PP_ALIGN.LEFT,
) -> None:
    shape = slide.shapes.add_textbox(
        Inches(x), Inches(y), Inches(width), Inches(height)
    )
    frame = shape.text_frame
    frame.clear()
    frame.word_wrap = True
    frame.vertical_anchor = MSO_ANCHOR.MIDDLE
    frame.margin_left = Inches(0.03)
    frame.margin_right = Inches(0.03)
    frame.margin_top = Inches(0.02)
    frame.margin_bottom = Inches(0.02)
    paragraph = frame.paragraphs[0]
    paragraph.text = value
    paragraph.alignment = align
    paragraph.font.name = FONT
    paragraph.font.size = Pt(size)
    paragraph.font.bold = bold
    paragraph.font.color.rgb = color


def _card(
    slide,
    x: float,
    y: float,
    width: float,
    height: float,
    title: str,
    body: str,
    accent: RGBColor = ORANGE,
    body_size: int = 13,
) -> None:
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        Inches(x),
        Inches(y),
        Inches(width),
        Inches(height),
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = PANEL
    shape.line.color.rgb = EDGE
    shape.line.width = Pt(0.8)
    bar = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE,
        Inches(x + 0.13),
        Inches(y + 0.17),
        Inches(0.06),
        Inches(height - 0.34),
    )
    bar.fill.solid()
    bar.fill.fore_color.rgb = accent
    bar.line.fill.background()
    _text(slide, title, x + 0.32, y + 0.15, width - 0.48, 0.38, 15, NAVY, True)
    _text(
        slide,
        body,
        x + 0.32,
        y + 0.59,
        width - 0.5,
        height - 0.72,
        body_size,
        BODY,
    )


def _header(slide, section: str, title: str, subtitle: str, number: int) -> None:
    _text(slide, section.upper(), 0.78, 0.35, 10.9, 0.24, 9, ORANGE, True)
    _text(slide, title, 0.78, 0.68, 11.9, 0.56, 25, NAVY, True)
    _text(slide, subtitle, 0.8, 1.27, 11.9, 0.42, 11, MUTED)
    _footer(slide, number)


def _footer(slide, number: int) -> None:
    _text(
        slide,
        "PrathamOne EduOS 1.0.0  |  Prashant Academy (Founder & Dean: Prashant Tejam)  |  "
        "Product Architect: Jawahar R. Mallah  |  Smritisys & AITDL Networks",
        0.8,
        7.12,
        10.8,
        0.18,
        8,
        MUTED,
    )
    _text(slide, f"{number:02d} / 12", 11.75, 7.1, 0.8, 0.2, 8, ORANGE, True, PP_ALIGN.RIGHT)


def _notes(slide, text: str) -> None:
    slide.notes_slide.notes_text_frame.text = text


def _new_slide(prs, section: str, title: str, subtitle: str, number: int):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _set_background(slide)
    _header(slide, section, title, subtitle, number)
    return slide


def _cover(prs) -> None:
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _set_background(slide)
    if LOGO_PATH.is_file():
        slide.shapes.add_picture(
            str(LOGO_PATH), Inches(0.85), Inches(0.62), width=Inches(3.0)
        )
    _text(
        slide,
        "COACHING INSTITUTE EDITION",
        0.9,
        1.68,
        5.2,
        0.28,
        10,
        ORANGE,
        True,
    )
    _text(
        slide,
        "Run your institute.\nNot your servers.",
        0.85,
        2.02,
        7.1,
        1.65,
        34,
        NAVY,
        True,
    )
    _text(
        slide,
        "How PrathamOne EduOS can help your team coordinate learners, classes, fees and administration - while you choose how your data is hosted and governed.",
        0.92,
        3.82,
        6.6,
        0.9,
        17,
        BODY,
    )
    panel = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        Inches(8.15),
        Inches(1.55),
        Inches(4.35),
        Inches(4.45),
    )
    panel.fill.solid()
    panel.fill.fore_color.rgb = PANEL
    panel.line.color.rgb = EDGE
    for index, (label, detail, color) in enumerate(
        [
            ("OPERATIONS", "One view of everyday work", ORANGE),
            ("DATA CONTROL", "Roles, records and policies", BLUE),
            ("DEPLOYMENT", "Choose a managed or local model", GREEN),
        ]
    ):
        y = 2.0 + index * 1.15
        _card(slide, 8.45, y, 3.75, 0.9, label, detail, color, 11)
    _text(
        slide,
        "Client Showcase: Prashant Academy Coaching Institute  |  Founder, Dean & Owner: Prashant Tejam",
        0.92,
        5.4,
        7.0,
        0.32,
        10,
        NAVY,
        True,
    )
    _text(
        slide,
        "CUSTOMER DISCUSSION DECK  |  No live student or staff records embedded",
        0.92,
        5.78,
        7.0,
        0.32,
        9,
        GREEN,
        True,
    )
    _footer(slide, 1)
    _notes(
        slide,
        "Open with the institute's priorities: smoother daily coordination, clear data access, "
        "and less local server work. The deck contains no live student or staff records. "
        "Do not imply a particular hosting service, SLA, residency, or security certification "
        "unless it is confirmed in the institute's deployment agreement.",
    )


def _challenge_slide(prs) -> None:
    slide = _new_slide(
        prs,
        "THE ADMIN CHALLENGE",
        "Too much admin work hides in handoffs",
        "When records and follow-ups are scattered, teams spend time reconciling instead of supporting classes.",
        2,
    )
    cards = [
        ("Enquiries", "Who called back? Which enquiry needs a next step?", ORANGE),
        ("Learner records", "Is the same learner described consistently across registers?", BLUE),
        ("Class operations", "Can teachers and coordinators see the current plan?", GREEN),
        ("Office work", "Can staff review dues, requests and reports with a shared context?", AMBER),
    ]
    for index, (title, body, accent) in enumerate(cards):
        x = 0.82 + index * 3.12
        _card(slide, x, 2.15, 2.85, 2.18, title, body, accent, 14)
    _text(
        slide,
        "The goal is not another spreadsheet. It is a clearer operating workflow with accountable access.",
        0.95,
        5.05,
        11.4,
        0.6,
        18,
        NAVY,
        True,
        PP_ALIGN.CENTER,
    )
    _notes(
        slide,
        "Ask which handoff creates the most repeated work today. These are common discovery prompts, "
        "not claims that every institute has the same problem or that software alone will remove it.",
    )


def _workflow_slide(prs) -> None:
    slide = _new_slide(
        prs,
        "ONE INSTITUTE WORKFLOW",
        "From first enquiry to a reviewed report",
        "Use this as a conversation map; exact record handoffs depend on the institute's configuration and data.",
        3,
    )
    steps = [
        ("01", "Enquiry", "Admissions"),
        ("02", "Enrol", "Students"),
        ("03", "Plan", "Batches + Timetable"),
        ("04", "Teach", "Attendance + Learning"),
        ("05", "Assess", "Examinations + Results"),
        ("06", "Reconcile", "Fees + Reports"),
    ]
    start_x = 0.8
    width = 1.83
    gap = 0.25
    for index, (number, title, subtitle) in enumerate(steps):
        x = start_x + index * (width + gap)
        block = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            Inches(x),
            Inches(2.42),
            Inches(width),
            Inches(1.78),
        )
        block.fill.solid()
        block.fill.fore_color.rgb = PANEL
        block.line.color.rgb = EDGE
        _text(slide, number, x + 0.13, 2.58, 0.55, 0.3, 11, ORANGE, True)
        _text(slide, title, x + 0.13, 2.98, width - 0.25, 0.44, 16, NAVY, True)
        _text(slide, subtitle, x + 0.13, 3.48, width - 0.25, 0.47, 10, BODY)
        if index < len(steps) - 1:
            _text(slide, ">", x + width + 0.01, 3.05, 0.23, 0.35, 17, AMBER, True, PP_ALIGN.CENTER)
    _text(
        slide,
        "Connected modules support the workflow; confirm which steps are configured and automated in your deployment.",
        1.0,
        5.0,
        11.2,
        0.52,
        13,
        GREEN,
        True,
        PP_ALIGN.CENTER,
    )
    _notes(
        slide,
        "Walk through the institute's actual journey. Explain the difference between an enquiry and "
        "an enrolled learner. Do not promise that every arrow is an automatic integration; verify the "
        "selected configuration and any required staff action.",
    )


def _learner_slide(prs) -> None:
    slide = _new_slide(
        prs,
        "LEARNER MANAGEMENT",
        "One learner record. A clearer journey.",
        "Keep prospective enquiries distinct from the canonical enrolled-student record.",
        4,
    )
    _card(
        slide,
        0.9,
        2.0,
        5.55,
        2.5,
        "Admissions lead",
        "Track enquiry stage, follow-up and counselling context. Convert only through the institute's approved process.",
        ORANGE,
        15,
    )
    _card(
        slide,
        6.85,
        2.0,
        5.55,
        2.5,
        "Student master",
        "Use one canonical learner record for enrolment, batch allocation, history and related academic workflows.",
        BLUE,
        15,
    )
    _text(
        slide,
        "Then coordinate the batch, timetable, attendance, learning activity, assessments and family communication.",
        1.0,
        5.05,
        11.2,
        0.6,
        16,
        NAVY,
        True,
        PP_ALIGN.CENTER,
    )
    _notes(
        slide,
        "Emphasize the SSOT distinction: a lead is prospective; Students is the canonical learner master. "
        "Avoid duplicating the learner just to represent multiple courses, standards or batches. "
        "Demonstrate student data only with approved access and an appropriate dataset.",
    )


def _academic_slide(prs) -> None:
    slide = _new_slide(
        prs,
        "ACADEMIC DELIVERY",
        "Keep the class day coordinated",
        "Plan, teach, assign and assess with academic workspaces that staff can learn role by role.",
        5,
    )
    cards = [
        ("PLAN", "Courses and Timetable\nSet the learning context and weekly plan.", BLUE),
        ("RUN CLASS", "Attendance and EduBoard\nRecord participation and present lesson content.", ORANGE),
        ("FOLLOW UP", "Homework\nTrack assignments and review work.", GREEN),
        ("ASSESS", "Examinations and Results\nPrepare assessments and reviewed outputs.", AMBER),
    ]
    for index, (title, body, accent) in enumerate(cards):
        x = 0.82 + index * 3.12
        _card(slide, x, 2.12, 2.85, 2.55, title, body, accent, 13)
    _text(
        slide,
        "The institute sets the schedule, grading rules, access and publication decisions.",
        1.0,
        5.25,
        11.1,
        0.45,
        14,
        NAVY,
        True,
        PP_ALIGN.CENTER,
    )
    _notes(
        slide,
        "Describe the practical academic tasks, not a promised learning outcome. Schedule conflicts, "
        "attendance accuracy and grading quality still depend on institute setup and staff review. "
        "Do not enter or display identifiable marks in an uncontrolled presentation.",
    )


def _module_map_slide(prs) -> None:
    slide = _new_slide(
        prs,
        "THE SUITE",
        "One suite for the whole institute",
        "Twenty module areas grouped around the work coaching teams already do.",
        6,
    )
    groups = [
        (
            "LEARNER INTAKE",
            "Admissions\nStudents\nForms\nImport / Export",
            ORANGE,
        ),
        (
            "ACADEMIC DELIVERY",
            "Courses\nTimetable\nAttendance\nHomework\nEduBoard\nExaminations\nResults",
            BLUE,
        ),
        (
            "FINANCE + PEOPLE",
            "Fees\nConcessions\nScholarships\nStaff\nCommunication",
            GREEN,
        ),
        (
            "OVERSIGHT",
            "Dashboard\nReports\nSettings\nTraining",
            AMBER,
        ),
    ]
    for index, (title, body, accent) in enumerate(groups):
        x = 0.78 + index * 3.15
        _card(slide, x, 2.0, 2.92, 3.6, title, body, accent, 13)
    _text(
        slide,
        "Show only the workflows and integrations that are enabled in the institute's approved deployment.",
        1.0,
        5.95,
        11.1,
        0.45,
        12,
        MUTED,
        False,
        PP_ALIGN.CENTER,
    )
    _notes(
        slide,
        "Use this map to let the institute choose where to begin. A listed workspace does not by itself "
        "prove an external integration is configured, nor that the institute uses every module.",
    )


def _data_control_slide(prs) -> None:
    slide = _new_slide(
        prs,
        "DATA GOVERNANCE",
        "Control is about people, permissions and records",
        "Hardware custody is only one part of control. Define who may view, change, approve and export data.",
        7,
    )
    _card(
        slide,
        0.9,
        2.0,
        5.55,
        2.95,
        "Institute decisions",
        "Who can see each record\nWho can edit or approve\nWhat may be exported and by whom\nRetention and correction procedures",
        ORANGE,
        13,
    )
    _card(
        slide,
        6.85,
        2.0,
        5.55,
        2.95,
        "Product governance patterns",
        "View-first workspaces with scoped Edit Mode\nCanonical student and shared masters\nProtected historical financial/academic snapshots\nSeparate practice from production",
        BLUE,
        13,
    )
    _text(
        slide,
        "Put data ownership, hosting region, support access, backup/restore, retention and exit/export terms in writing.",
        0.95,
        5.45,
        11.5,
        0.55,
        13,
        NAVY,
        True,
        PP_ALIGN.CENTER,
    )
    _text(
        slide,
        "For provider-managed hosting: Your institute controls its data; we manage the infrastructure.",
        0.95,
        6.12,
        11.5,
        0.36,
        11,
        BLUE,
        True,
        PP_ALIGN.CENTER,
    )
    _notes(
        slide,
        "Frame control as explicit decisions and verifiable controls. The product follows View-First and "
        "canonical-master governance. Data ownership, provider access, hosting region, retention, "
        "backup commitments and deletion/export obligations must be confirmed in the service agreement; "
        "do not claim zero provider access or a certification without evidence.",
    )


def _hosting_slide(prs) -> None:
    slide = _new_slide(
        prs,
        "DEPLOYMENT CHOICE",
        "Keep data control; reduce server chores",
        "Choose who operates the infrastructure, and make responsibilities explicit.",
        10,
    )
    _card(
        slide,
        0.86,
        2.0,
        5.65,
        2.85,
        "Managed hosted deployment",
        "Less hardware work at the institute\nRecurring hosting/service cost\nInternet and provider availability matter\nContract should define region, backups, restore tests, support and export\nYour institute controls its data; we manage the infrastructure.",
        BLUE,
        12,
    )
    _card(
        slide,
        6.82,
        2.0,
        5.65,
        2.85,
        "On-premises deployment",
        "Institute retains physical server custody\nLocal IT owns patching, power, monitoring and recovery\nHardware replacement and disaster recovery remain institute responsibilities\nA subscription license can still affect software access",
        ORANGE,
        12,
    )
    band = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        Inches(1.05),
        Inches(5.25),
        Inches(11.25),
        Inches(0.9),
    )
    band.fill.solid()
    band.fill.fore_color.rgb = PANEL_ALT
    band.line.color.rgb = EDGE
    _text(
        slide,
        "Neither model removes data-loss risk. Contract terms, independent backups and tested restores matter.",
        1.25,
        5.42,
        10.85,
        0.5,
        13,
        NAVY,
        True,
        PP_ALIGN.CENTER,
    )
    _notes(
        slide,
        "This is deployment guidance, not a statement that a managed-hosting service or specific SLA "
        "is currently available. Confirm the hosting option, region, support boundaries, security "
        "controls, backup/restore testing, costs and data-exit process in the signed agreement. "
        "On-premises custody does not remove the need for skilled operations, and a subscription "
        "software license can still have expiry terms. The tagline applies only where the provider "
        "actually manages the infrastructure; the institute retains data-governance responsibilities.",
    )


def _expiry_slide(prs) -> None:
    slide = _new_slide(
        prs,
        "SUBSCRIPTION EXIT SAFETY",
        "Plan for data access beyond subscription expiry",
        "Your institute controls its data; we manage the infrastructure.",
        8,
    )
    stages = [
        ("BEFORE EXPIRY", "Notify the institute's data owner and provide a way to export."),
        ("AT EXPIRY", "Use an agreed read-only grace period; avoid an unexpected lockout or purge."),
        ("DURING GRACE", "Allow a complete portable export, including attachments and agreed history."),
        ("AFTER GRACE", "Retain backups for the contracted period, then delete under a documented policy."),
    ]
    accents = [ORANGE, BLUE, GREEN, AMBER]
    for index, (title, body) in enumerate(stages):
        x = 0.78 + index * 3.15
        _card(slide, x, 2.0, 2.92, 2.72, title, body, accents[index], 12)
    _text(
        slide,
        "PROPOSED DATA-SAFETY COMMITMENT - NOT AN EXISTING GUARANTEE. Contract exact notice, grace, export, retention and deletion timelines.",
        0.98,
        5.25,
        11.35,
        0.56,
        13,
        NAVY,
        True,
        PP_ALIGN.CENTER,
    )
    _notes(
        slide,
        "This is a recommended policy, not a claim that the current product already provides these "
        "terms. Set a specific grace period and backup-retention period before offering a guarantee. "
        "Give the institute notice, a machine-readable export that includes agreed files and history, "
        "and a clear deletion schedule. Confirm legal and contractual requirements with counsel.",
    )


def _backup_slide(prs) -> None:
    slide = _new_slide(
        prs,
        "BACKUP AND RECOVERY",
        "A sync is not a backup",
        "Proposed pattern: keep independent copies and prove that they can be restored.",
        9,
    )
    items = [
        ("1  LIVE SYSTEM", "Daily operations and current records", BLUE),
        ("2  INDEPENDENT CLOUD COPY", "Encrypted, versioned copy in a separate account and credentials", ORANGE),
        ("3  INSTITUTE COPY", "Scheduled export to separate encrypted storage or offline media", GREEN),
        ("4  RESTORE TEST", "Run restore drills and record the result on a fixed schedule", AMBER),
    ]
    for index, (title, body, accent) in enumerate(items):
        x = 0.78 + index * 3.15
        _card(slide, x, 2.0, 2.92, 2.58, title, body, accent, 12)
    _text(
        slide,
        "Proposed controls: define backup frequency, retention, maximum data loss (RPO) and restore time (RTO).",
        0.95,
        5.0,
        11.4,
        0.42,
        13,
        NAVY,
        True,
        PP_ALIGN.CENTER,
    )
    _text(
        slide,
        "Use independent cloud and institute-held copies; syncing multiple devices alone does not protect against deletion.",
        0.95,
        5.52,
        11.4,
        0.38,
        11,
        AMBER,
        True,
        PP_ALIGN.CENTER,
    )
    _notes(
        slide,
        "Explain that synchronization improves access but is not a recovery strategy: accidental "
        "deletion, ransomware or corruption can synchronize too. Propose encrypted, versioned copies "
        "in an independent cloud account and separate institute-controlled storage or offline media. "
        "Agree a backup frequency and retention period, and test restores. Do not state a backup "
        "schedule, RPO or RTO as an existing guarantee until implemented and contractually approved.",
    )


def _rollout_slide(prs) -> None:
    slide = _new_slide(
        prs,
        "SAFE IMPLEMENTATION",
        "Start with one batch. Prove the workflow.",
        "A controlled pilot builds confidence before wider adoption.",
        11,
    )
    steps = [
        ("1", "Map", "Current records and owners"),
        ("2", "Clean", "Deduplicate people and shared masters"),
        ("3", "Configure", "Roles, academic year and policies"),
        ("4", "Pilot", "One representative batch in a safe environment"),
        ("5", "Reconcile", "Counts, permissions and staff feedback"),
    ]
    for index, (number, title, body) in enumerate(steps):
        x = 0.78 + index * 2.52
        circle = slide.shapes.add_shape(
            MSO_SHAPE.OVAL, Inches(x + 0.7), Inches(2.05), Inches(0.58), Inches(0.58)
        )
        circle.fill.solid()
        circle.fill.fore_color.rgb = ORANGE if index % 2 == 0 else BLUE
        circle.line.fill.background()
        _text(slide, number, x + 0.7, 2.13, 0.58, 0.35, 14, PANEL, True, PP_ALIGN.CENTER)
        _text(slide, title, x + 0.05, 2.9, 1.95, 0.4, 15, NAVY, True, PP_ALIGN.CENTER)
        _text(slide, body, x + 0.05, 3.38, 1.95, 0.8, 11, BODY, False, PP_ALIGN.CENTER)
        if index < len(steps) - 1:
            _text(slide, ">", x + 2.08, 2.15, 0.3, 0.4, 18, AMBER, True, PP_ALIGN.CENTER)
    _text(
        slide,
        "Do not import, publish or switch environments until the owner, backup and approval steps are clear.",
        0.95,
        5.1,
        11.4,
        0.5,
        13,
        AMBER,
        True,
        PP_ALIGN.CENTER,
    )
    _notes(
        slide,
        "Make the pilot measurable and reversible. Take a verified backup before migration, agree "
        "canonical mappings and reconcile totals. Keep production changes behind authorized roles "
        "and the institute's approval process.",
    )


def _next_steps_slide(prs) -> None:
    slide = _new_slide(
        prs,
        "NEXT STEPS",
        "Measure your baseline. Then decide.",
        "Set institute-owned measures instead of relying on generic improvement promises.",
        12,
    )
    _card(
        slide,
        0.86,
        2.0,
        5.65,
        2.75,
        "Choose what to measure",
        "Enquiry response and follow-up completion\nRequired-field and duplicate exceptions\nFee reconciliation and overdue review\nRegister completion and assessment turnaround",
        GREEN,
        12,
    )
    _card(
        slide,
        6.82,
        2.0,
        5.65,
        2.75,
        "Agree the first pilot",
        "One batch and workflow owner\nRole and access review\nData mapping and backup plan\nHosting, support and exit terms",
        ORANGE,
        12,
    )
    _text(
        slide,
        "PrathamOne EduOS  |  Let's map one real institute workflow and agree a safe pilot.",
        1.0,
        5.35,
        11.2,
        0.6,
        18,
        NAVY,
        True,
        PP_ALIGN.CENTER,
    )
    _notes(
        slide,
        "Close by asking the institute to select one workflow and its owner. Establish baseline definitions "
        "before rollout and compare the same scope and time period later. Do not guarantee ROI, speed, "
        "accuracy or other outcomes without measured evidence.",
    )


def build_deck() -> None:
    prs = Presentation()
    prs.slide_width = SLIDE_WIDTH
    prs.slide_height = SLIDE_HEIGHT
    prs.core_properties.title = (
        "PrathamOne EduOS - Institute Operations and Data Control"
    )
    prs.core_properties.subject = (
        "Customer-safe overview of coaching institute workflows, data governance and deployment choices"
    )
    prs.core_properties.author = "Jawahar R. Mallah - Smritisys & AITDL Networks"
    prs.core_properties.keywords = (
        "PrathamOne EduOS, coaching institute, operations, data control, deployment"
    )
    _cover(prs)
    _challenge_slide(prs)
    _workflow_slide(prs)
    _learner_slide(prs)
    _academic_slide(prs)
    _module_map_slide(prs)
    _data_control_slide(prs)
    _expiry_slide(prs)
    _backup_slide(prs)
    _hosting_slide(prs)
    _rollout_slide(prs)
    _next_steps_slide(prs)
    DECK_PATH.parent.mkdir(parents=True, exist_ok=True)
    prs.save(DECK_PATH)
    pdf_path = DECK_PATH.with_suffix(".pdf")
    try:
        import win32com.client
        abs_pptx = str(DECK_PATH.resolve())
        abs_pdf = str(pdf_path.resolve())
        print(f"Exporting PDF via PowerPoint COM: {abs_pptx} -> {abs_pdf}...")
        ppt = win32com.client.Dispatch("PowerPoint.Application")
        pres = ppt.Presentations.Open(abs_pptx, ReadOnly=True, Untitled=False, WithWindow=False)
        pres.SaveAs(abs_pdf, 32)
        pres.Close()
        ppt.Quit()
        if pdf_path.exists() and pdf_path.stat().st_size > 0:
            print(f"Successfully generated PDF: {pdf_path} ({pdf_path.stat().st_size} bytes)")
    except Exception as e:
        print(f"PowerPoint COM PDF conversion notice: {e}")


def build_report() -> None:
    lines = [
        "---",
        'title: "PrathamOne EduOS Institute Operations and Data Control Presentation Guide"',
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
        'tags: ["coaching-institute", "operations", "data-control", "deployment", "presentation"]',
        'entities: ["PrathamOneEduOS", "CoachingInstituteModule", "InstituteData"]',
        'api_routes: ["/api/v1/", "/dashboard", "/students", "/leads/pipeline", "/fees", "/attendance", "/academic/timetable", "/examinations", "/staff", "/communication", "/reports", "/settings", "/courses", "/homework", "/eduboard", "/forms", "/import-export", "/training"]',
        'related_modules: ["00_PRODUCT_OVERVIEW", "01_ARCHITECTURE", "03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "09_FEES_PAYMENTS", "12_RBAC_SECURITY", "16_DATABASE_API", "18_TESTING_QA", "25_BUSINESS_REQUIREMENTS"]',
        "---",
        "",
        "# Institute Operations and Data Control",
        "",
        "**Audience:** Coaching institute owners, principals, administrators and implementation sponsors.",
        "",
        "**Presentation files:**",
        "",
        f"- PowerPoint: `{DECK_PATH.relative_to(ROOT).as_posix()}`",
        f"- PDF: `docs/assets/commercial/{DECK_PATH.stem}.pdf`",
        "",
        "## Purpose",
        "",
        "This 12-slide customer discussion deck explains how PrathamOne EduOS can organize institute workflows and what data-governance decisions an institute should retain. It is intentionally customer-safe and contains no live student or staff records and no screenshots from a live tenant.",
        "",
        "## Recommended presentation flow",
        "",
        "1. Start with the institute's coordination problem, not a feature list.",
        "2. Tell one learner journey from enquiry through classes, assessment and fee review.",
        "3. Map the suite's 20 module areas to the institute's own roles.",
        "4. Map all 20 module areas to institute roles.",
        "5. Distinguish institute data governance from physical server custody.",
        "6. Define subscription expiry, export, backup retention and deletion commitments.",
        "7. Explain why synced devices are not a substitute for independent, tested backups.",
        "8. Compare hosting options honestly and agree responsibilities in writing.",
        "9. Close with a small, measurable and reversible pilot.",
        "",
        "## Claim boundaries",
        "",
        "- The workflow diagram is a presentation map, not a promise that every step is automatically integrated.",
        "- The module list describes workspaces; it does not prove that a third-party payment, messaging, scanning or other integration is configured.",
        "- Data ownership, processing, provider access, hosting region, retention, backup/restore, support access, service levels and export/deletion terms must be confirmed in the signed deployment agreement.",
        "- Expiry and backup slides contain proposed data-safety commitments, not verified current guarantees. Approve and implement exact notice, grace, export, backup frequency, retention, RPO/RTO and deletion timelines before presenting them as commitments.",
        "- Device synchronization is not an independent backup. Propose encrypted, versioned copies in a separate cloud account and institute-controlled storage or offline media, with scheduled restore tests; confirm responsibilities and costs in the service agreement.",
        "- On-premises hosting provides physical custody but does not automatically prevent software-license expiry or data loss. Confirm license, access and export rights separately.",
        "- Use the tagline 'Your institute controls its data; we manage the infrastructure.' only for managed-hosting arrangements where the provider actually operates the infrastructure; define the institute's data-governance role and each party's responsibilities in the agreement.",
        "- Do not claim zero provider access, a security certification, guaranteed availability, or a specific business improvement without evidence.",
        "- A managed-hosting recommendation is conditional on the service being offered and on its responsibilities and costs being documented.",
        "- Keep customer-facing materials free of live personal, academic and financial data. Use a supervised demo with approved synthetic records for screen walkthroughs.",
        "",
        "## Evidence and governance",
        "",
        "The product discussion follows the repository's single-source-of-truth, canonical student master, View-First/Edit Mode, and historical snapshot governance. Confirm current deployment behavior, role permissions, integrations and contractual terms before making implementation commitments.",
        "",
        "- [Global Single Source of Truth governance](../25_BUSINESS_REQUIREMENTS/2026-11-06_GLOBAL_POLICY_SINGLE-SOURCE-OF-TRUTH-GOVERNANCE_V1.md)",
        "- [Data deduplication and mapping governance](../25_BUSINESS_REQUIREMENTS/2026-11-09_GLOBAL_POLICY_DATA-DEDUPLICATION-AND-MAPPING-GOVERNANCE_V1.md)",
        "- [View-First and explicit Edit Mode governance](../12_RBAC_SECURITY/2026-11-07_RBAC-SECURITY_IMPLEMENTATION-REPORT_GLOBAL-VIEW-FIRST-AND-EXPLICIT-EDIT-MODE-GOVERNANCE_V1.md)",
        "- [20-module presentation guide](2026-11-19_PRODUCT-OVERVIEW_PRESENTATION-GUIDE_20-MODULES_V1.md)",
        "",
    ]
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    build_report()
    build_deck()
    print(f"Created: {REPORT_PATH}")
    print(f"Created: {DECK_PATH}")
