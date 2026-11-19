# /**
#  * @file        generate_commercial_pitch_deck.py
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
#  * @description Enterprise PowerPoint Pitch Deck & PDF Generator for PrathamOne EduOS (Light Premium Theme, Founder & Dean Prashant Tejam).
#  */

import os
import shutil
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# =============================================================================
# LIGHT PREMIUM PALETTE: ROYAL NAVY BLUE • RADIANT GOLD • CRISP WHITE
# =============================================================================
BG_LIGHT = RGBColor(248, 250, 252)         # Luminous Off-White Slate (#F8FAFC)
SURFACE_WHITE = RGBColor(255, 255, 255)    # Pure Crisp White (#FFFFFF)
BORDER_SUBTLE = RGBColor(226, 232, 240)    # Soft Gray Border (#E2E8F0)

ROYAL_NAVY = RGBColor(11, 37, 89)          # Primary Deep Royal Navy (#0B2559)
NAVY_ACCENT = RGBColor(26, 64, 138)        # Mid Royal Navy (#1A408A)

GOLD_DEEP = RGBColor(180, 83, 9)           # Rich Dark Gold for Text (#B45309)
GOLD_PRIMARY = RGBColor(217, 119, 6)       # Radiant Gold Accent (#D97706)
GOLD_SURFACE = RGBColor(255, 251, 235)     # Soft Champagne Gold Tint (#FFFBEB)
GOLD_BORDER = RGBColor(245, 158, 11)       # Crisp Gold Border (#F59E0B)

TEXT_PRIMARY = RGBColor(15, 23, 42)        # Deep Charcoal Slate (#0F172A)
TEXT_SECONDARY = RGBColor(71, 85, 105)     # Muted Slate Body (#475569)
TEXT_MUTED = RGBColor(100, 116, 139)       # Subtitle Slate (#64748B)

EMERALD = RGBColor(16, 185, 129)           # Metrics / Success Green (#10B981)
CRIMSON = RGBColor(225, 29, 72)            # Alert / Pain Point Red (#E11D48)
AMBER = RGBColor(241, 105, 6)              # Brand Amber (#F16906)

FONT_HEADING = "Segoe UI"
FONT_BODY = "Segoe UI"


def set_slide_background(slide, prs):
    """Adds a crisp light luminous background to the slide."""
    bg_shape = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height
    )
    bg_shape.fill.solid()
    bg_shape.fill.fore_color.rgb = BG_LIGHT
    bg_shape.line.fill.background()
    return bg_shape


def add_slide_header(slide, prs, category: str, title: str, subtitle: str):
    """Draws consistent light corporate header zone."""
    cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.5), Inches(0.35))
    tf_c = cat_box.text_frame
    tf_c.word_wrap = True
    p_c = tf_c.paragraphs[0]
    p_c.text = category.upper()
    p_c.font.name = FONT_HEADING
    p_c.font.size = Pt(11)
    p_c.font.bold = True
    p_c.font.color.rgb = GOLD_DEEP

    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.72), Inches(11.5), Inches(0.9))
    tf_t = title_box.text_frame
    tf_t.word_wrap = True
    
    p_t = tf_t.paragraphs[0]
    p_t.text = title
    p_t.font.name = FONT_HEADING
    p_t.font.size = Pt(23)
    p_t.font.bold = True
    p_t.font.color.rgb = ROYAL_NAVY

    p_s = tf_t.add_paragraph()
    p_s.text = subtitle
    p_s.font.name = FONT_BODY
    p_s.font.size = Pt(12)
    p_s.font.color.rgb = TEXT_MUTED


def add_slide_footer(slide, prs, slide_num: int, total_slides: int = 12):
    """Draws light corporate attribution footer with Founder & Dean Prashant Tejam."""
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(6.9), Inches(11.733), Inches(0.01))
    line.fill.solid()
    line.fill.fore_color.rgb = BORDER_SUBTLE
    line.line.color.rgb = BORDER_SUBTLE

    footer_box = slide.shapes.add_textbox(Inches(0.8), Inches(7.0), Inches(10.5), Inches(0.35))
    tf = footer_box.text_frame
    p = tf.paragraphs[0]
    p.text = (
        "PrathamOne EduOS 1.0.0 • Prashant Academy (Founder & Dean: Prashant Tejam) • "
        "Product Architect: Jawahar R. Mallah • Smritisys & AITDL Networks"
    )
    p.font.name = FONT_BODY
    p.font.size = Pt(9)
    p.font.color.rgb = TEXT_MUTED

    num_box = slide.shapes.add_textbox(Inches(11.5), Inches(7.0), Inches(1.033), Inches(0.35))
    tf_n = num_box.text_frame
    p_n = tf_n.paragraphs[0]
    p_n.text = f"{slide_num:02d} / {total_slides:02d}"
    p_n.alignment = PP_ALIGN.RIGHT
    p_n.font.name = FONT_BODY
    p_n.font.size = Pt(9)
    p_n.font.bold = True
    p_n.font.color.rgb = GOLD_DEEP


def create_light_card(slide, left, top, width, height, bg_color=SURFACE_WHITE, stroke_color=BORDER_SUBTLE, stroke_width=Pt(1.5)):
    """Creates a clean light executive card."""
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = bg_color
    card.line.color.rgb = stroke_color
    card.line.width = stroke_width
    return card


def create_feature_card(slide, left, top, width, height, title: str, desc: str, accent_color=GOLD_PRIMARY, bg_color=SURFACE_WHITE):
    """Draws a crisp light card with a vertical accent bar and high-contrast typography."""
    create_light_card(slide, left, top, width, height, bg_color=bg_color, stroke_color=BORDER_SUBTLE, stroke_width=Pt(1.2))

    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left + Inches(0.12), top + Inches(0.15), Inches(0.06), height - Inches(0.3))
    bar.fill.solid()
    bar.fill.fore_color.rgb = accent_color
    bar.line.fill.background()

    tb = slide.shapes.add_textbox(left + Inches(0.28), top + Inches(0.12), width - Inches(0.4), height - Inches(0.24))
    tf = tb.text_frame
    tf.word_wrap = True

    p0 = tf.paragraphs[0]
    p0.text = title
    p0.font.name = FONT_HEADING
    p0.font.size = Pt(13)
    p0.font.bold = True
    p0.font.color.rgb = ROYAL_NAVY

    p1 = tf.add_paragraph()
    p1.text = desc
    p1.font.name = FONT_BODY
    p1.font.size = Pt(10)
    p1.font.color.rgb = TEXT_SECONDARY


def convert_pptx_to_pdf(pptx_path: Path, pdf_path: Path):
    """Converts a PowerPoint presentation to high-resolution PDF using PowerPoint COM automation."""
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


def build_pitch_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    logo_path = Path("frontend/public/artwork/PrathamOne_EduOS_Brand_Assets/PrathamOne_EduOS_Logo_Transparent.png")
    academy_logo_path = Path("docs/assets/branding/prashant-academy-logo.png")
    frames_dir = Path("data/commercial/frames")

    total_slides = 12

    # =========================================================================
    # SLIDE 1: COVER / TITLE SLIDE (FOUNDER & DEAN PRASHANT TEJAM)
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1, prs)

    # Master Light Card Container
    create_light_card(
        s1, Inches(0.8), Inches(0.8), Inches(11.733), Inches(5.9),
        bg_color=SURFACE_WHITE, stroke_color=GOLD_BORDER, stroke_width=Pt(2)
    )

    if logo_path.exists():
        s1.shapes.add_picture(str(logo_path), Inches(1.4), Inches(1.3), width=Inches(3.8))

    # Hero Titles
    tb_cov = s1.shapes.add_textbox(Inches(1.4), Inches(2.4), Inches(6.0), Inches(3.8))
    tf_c = tb_cov.text_frame
    tf_c.word_wrap = True

    p0 = tf_c.paragraphs[0]
    p0.text = "PRATHAMONE EduOS"
    p0.font.name = FONT_HEADING
    p0.font.size = Pt(36)
    p0.font.bold = True
    p0.font.color.rgb = ROYAL_NAVY

    p1 = tf_c.add_paragraph()
    p1.text = "Coaching Institute Edition • Enterprise Management System"
    p1.font.name = FONT_HEADING
    p1.font.size = Pt(17)
    p1.font.bold = True
    p1.font.color.rgb = GOLD_PRIMARY

    p2 = tf_c.add_paragraph()
    p2.text = "Coaching Management. Simplified."
    p2.font.name = FONT_BODY
    p2.font.size = Pt(14)
    p2.font.bold = True
    p2.font.color.rgb = ROYAL_NAVY

    p3 = tf_c.add_paragraph()
    p3.text = (
        "\nClient Showcase: Prashant Academy Coaching Institute\n"
        "Founder, Dean & Owner: Prashant Tejam\n"
        "Product Architect: Jawahar R. Mallah  |  Smritisys & AITDL Networks  |  Version: 1.0.0"
    )
    p3.font.name = FONT_BODY
    p3.font.size = Pt(10.5)
    p3.font.color.rgb = TEXT_MUTED

    # Right side: Executive Leadership Card for Founder & Dean Prashant Tejam
    create_light_card(
        s1, Inches(7.8), Inches(1.2), Inches(4.3), Inches(5.1),
        bg_color=RGBColor(248, 250, 252), stroke_color=GOLD_BORDER, stroke_width=Pt(1.5)
    )

    badge_top = Inches(1.5)
    if academy_logo_path.exists():
        s1.shapes.add_picture(str(academy_logo_path), Inches(8.1), Inches(1.5), width=Inches(3.7))
        badge_top = Inches(2.7)

    tb_lead = s1.shapes.add_textbox(Inches(8.1), badge_top, Inches(3.7), Inches(3.3))
    tf_lead = tb_lead.text_frame
    tf_lead.word_wrap = True

    p_l0 = tf_lead.paragraphs[0]
    p_l0.text = "INSTITUTE LEADERSHIP"
    p_l0.font.name = FONT_HEADING
    p_l0.font.size = Pt(10)
    p_l0.font.bold = True
    p_l0.font.color.rgb = GOLD_DEEP

    p_l1 = tf_lead.add_paragraph()
    p_l1.text = "Prashant Tejam"
    p_l1.font.name = FONT_HEADING
    p_l1.font.size = Pt(22)
    p_l1.font.bold = True
    p_l1.font.color.rgb = ROYAL_NAVY

    p_l2 = tf_lead.add_paragraph()
    p_l2.text = "Founder, Dean & Owner\nPrashant Academy Coaching Institute\n"
    p_l2.font.name = FONT_BODY
    p_l2.font.size = Pt(11.5)
    p_l2.font.bold = True
    p_l2.font.color.rgb = TEXT_PRIMARY

    p_l3 = tf_lead.add_paragraph()
    p_l3.text = (
        "\"Delivering academic excellence, zero administrative leakage, "
        "and complete parent trust through enterprise engineering.\"\n"
    )
    p_l3.font.name = FONT_BODY
    p_l3.font.size = Pt(10)
    p_l3.font.italic = True
    p_l3.font.color.rgb = TEXT_MUTED

    p_l4 = tf_lead.add_paragraph()
    p_l4.text = "✔ 100% Canonical SSOT Data Ownership\n✔ Rule 010 View-First Financial Immutability\n✔ Direct Parent WhatsApp Automation"
    p_l4.font.name = FONT_BODY
    p_l4.font.size = Pt(9.5)
    p_l4.font.bold = True
    p_l4.font.color.rgb = ROYAL_NAVY

    add_slide_footer(s1, prs, 1, total_slides)

    # =========================================================================
    # SLIDE 2: THE PROBLEM (COACHING OPERATIONAL DILEMMA)
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2, prs)
    add_slide_header(
        s2, prs,
        "MARKET REALITY & PAIN POINTS",
        "The Coaching Institute Dilemma: Operational Chaos Behind High Ambitions",
        "Why premier coaching institutes lose 15-20% margin to administrative friction and untracked workflows."
    )

    create_feature_card(
        s2, Inches(0.8), Inches(1.8), Inches(3.6), Inches(2.2),
        "1. Fragmented Silos",
        "Excel files for fees, paper registers for attendance, separate WhatsApp groups, and chaotic exam spreadsheets. Zero central synchronization.",
        accent_color=CRIMSON, bg_color=RGBColor(254, 242, 242)
    )
    create_feature_card(
        s2, Inches(4.8), Inches(1.8), Inches(3.6), Inches(2.2),
        "2. Revenue Leakage",
        "Overdue fee installments go unnoticed. No audit trail for fee concessions. Disconnected accounting leads to cash reconciliation discrepancies.",
        accent_color=CRIMSON, bg_color=RGBColor(254, 242, 242)
    )
    create_feature_card(
        s2, Inches(8.8), Inches(1.8), Inches(3.6), Inches(2.2),
        "3. Parent Anxiety & Bunking",
        "Parents are unaware if their child reached class on time. Manual phone calling during emergencies wastes hours of administrative staff time.",
        accent_color=CRIMSON, bg_color=RGBColor(254, 242, 242)
    )
    create_feature_card(
        s2, Inches(0.8), Inches(4.4), Inches(5.6), Inches(2.2),
        "4. Accidental Mutation & Data Loss",
        "Anyone with spreadsheet access can overwrite marks, delete attendance logs, or alter balances. No View-First safety lock or historical immutability.",
        accent_color=GOLD_PRIMARY
    )
    create_feature_card(
        s2, Inches(6.8), Inches(4.4), Inches(5.6), Inches(2.2),
        "5. Faculty Administrative Burnout",
        "Star teachers spend 25% of class time calling out roll numbers and recording marks instead of delivering high-yield competitive coaching.",
        accent_color=GOLD_PRIMARY
    )

    add_slide_footer(s2, prs, 2, total_slides)

    # =========================================================================
    # SLIDE 3: THE SOLUTION (WHY PRATHAMONE EduOS)
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3, prs)
    add_slide_header(
        s3, prs,
        "ARCHITECTURAL FOUNDATION",
        "The Solution: PrathamOne EduOS Enterprise Operating System",
        "Engineered specifically for coaching academies with Single Source of Truth & Zero-Leakage Governance."
    )

    create_feature_card(
        s3, Inches(0.8), Inches(1.8), Inches(5.6), Inches(2.2),
        "Single Source of Truth (SSOT Rules 001-011)",
        "Every student, teacher, fee ledger, and exam mark exists in one authoritative model. No duplicate masters, no grade-specific duplication, zero data conflicts.",
        accent_color=ROYAL_NAVY
    )
    create_feature_card(
        s3, Inches(6.8), Inches(1.8), Inches(5.6), Inches(2.2),
        "Rule 010: Global View-First Governance",
        "View Mode is default everywhere. Records cannot be edited or deleted without explicit role authorization and confirmation modals. Eliminates accidental corruption.",
        accent_color=GOLD_PRIMARY
    )
    create_feature_card(
        s3, Inches(0.8), Inches(4.3), Inches(5.6), Inches(2.2),
        "Native WhatsApp Automation (Zero Parent App)",
        "Parents do not need to install another clumsy mobile app. Instant fee receipts, daily RFID check-in/out alerts, and progress reports land on WhatsApp.",
        accent_color=EMERALD
    )
    create_feature_card(
        s3, Inches(6.8), Inches(4.3), Inches(5.6), Inches(2.2),
        "Offline-First Kiosk & Fast Micro-APIs",
        "Local biometric and RFID scanners operate continuously even during internet outages, syncing back to the cloud ledger the instant connectivity restores.",
        accent_color=ROYAL_NAVY
    )

    add_slide_footer(s3, prs, 3, total_slides)

    # =========================================================================
    # SLIDE 4: EXECUTIVE PULSE (DASHBOARD)
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4, prs)
    add_slide_header(
        s4, prs,
        "EXECUTIVE COMMAND CENTER",
        "Chapter 03: Real-Time Operational Pulse & Financial Heartbeat",
        "Instantly know where your academy stands every second — revenue, attendance, and batch capacity."
    )

    f3 = frames_dir / "frame_03_dashboard.png"
    if f3.exists():
        s4.shapes.add_picture(str(f3), Inches(0.8), Inches(1.8), width=Inches(6.6))

    create_feature_card(
        s4, Inches(7.7), Inches(1.8), Inches(4.8), Inches(1.5),
        "Live Revenue Pulse",
        "Real-time tracking of ₹18.6L collections, pending installments, and overdue fee aging buckets with split GST analytics.",
        accent_color=GOLD_PRIMARY
    )
    create_feature_card(
        s4, Inches(7.7), Inches(3.5), Inches(4.8), Inches(1.5),
        "Daily Attendance Meter",
        "Live percentage pulse (92.8% daily average) across JEE, NEET, and Foundation batches with tap-and-go kiosk sync.",
        accent_color=EMERALD
    )
    create_feature_card(
        s4, Inches(7.7), Inches(5.2), Inches(4.8), Inches(1.5),
        "Multi-Branch Support",
        "Monitor single or multi-center performance from one unified director login with role-isolated visibility.",
        accent_color=ROYAL_NAVY
    )

    add_slide_footer(s4, prs, 4, total_slides)

    # =========================================================================
    # SLIDE 5: MASTER STUDENT DIRECTORY & DPDP COMPLIANCE
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5, prs)
    add_slide_header(
        s5, prs,
        "STUDENT LIFECYCLE MANAGEMENT",
        "Chapter 04: Canonical Student Directory & DPDP Privacy Compliance",
        "Complete 360-degree student record with sub-second search and strict privacy safeguards."
    )

    f4 = frames_dir / "frame_04_students.png"
    if f4.exists():
        s5.shapes.add_picture(str(f4), Inches(0.8), Inches(1.8), width=Inches(6.6))

    create_feature_card(
        s5, Inches(7.7), Inches(1.8), Inches(4.8), Inches(1.5),
        "Rule 010 Safety Lock",
        "Read-only protection prevents staff from accidentally modifying student records, enrollments, or guardian contacts.",
        accent_color=ROYAL_NAVY
    )
    create_feature_card(
        s5, Inches(7.7), Inches(3.5), Inches(4.8), Inches(1.5),
        "Sub-Second Search Filter",
        "Search 5,000+ students instantly by Name, Roll Number, Phone, Standard (Grade 11/12), or competitive batch.",
        accent_color=EMERALD
    )
    create_feature_card(
        s5, Inches(7.7), Inches(5.2), Inches(4.8), Inches(1.5),
        "DPDP Act 2023 Masking",
        "Aadhaar numbers and sensitive guardian phone digits are masked by default, ensuring regulatory compliance.",
        accent_color=GOLD_PRIMARY
    )

    add_slide_footer(s5, prs, 5, total_slides)

    # =========================================================================
    # SLIDE 6: ZERO-LEAKAGE FEE MANAGEMENT & WHATSAPP RECEIPTS
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6, prs)
    add_slide_header(
        s6, prs,
        "FINANCIAL INTELLIGENCE",
        "Chapter 05: Zero-Leakage Fee Counter & Instant WhatsApp Receipts",
        "Automated installment schedules, immutable double-entry ledger, and 3-click fee collection."
    )

    f5 = frames_dir / "frame_05_fees.png"
    if f5.exists():
        s6.shapes.add_picture(str(f5), Inches(0.8), Inches(1.8), width=Inches(6.6))

    create_feature_card(
        s6, Inches(7.7), Inches(1.8), Inches(4.8), Inches(1.5),
        "Automated Installment Schedules",
        "Pre-configured installment plans with customizable split heads: Tuition, Lab, Study Material, and GST taxes.",
        accent_color=ROYAL_NAVY
    )
    create_feature_card(
        s6, Inches(7.7), Inches(3.5), Inches(4.8), Inches(1.5),
        "3-Click Collection & WhatsApp PDF",
        "Select student, enter amount, click collect — branded PDF receipt is immediately sent to parent's WhatsApp in < 3s.",
        accent_color=EMERALD
    )
    create_feature_card(
        s6, Inches(7.7), Inches(5.2), Inches(4.8), Inches(1.5),
        "Zero Revenue Leakage",
        "Double-entry ledger guarantees cash, UPI, bank transfer, and cheque reconciliations match perfectly with zero tampering.",
        accent_color=GOLD_PRIMARY
    )

    add_slide_footer(s6, prs, 6, total_slides)

    # =========================================================================
    # SLIDE 7: RFID SMART ATTENDANCE & PARENT TRUST
    # =========================================================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7, prs)
    add_slide_header(
        s7, prs,
        "ATTENDANCE & SECURITY",
        "Chapter 07: RFID Smart Attendance & Automated Parent Alert Engine",
        "Tap-and-go student verification with instant departure alerts for total parent peace of mind."
    )

    f7 = frames_dir / "frame_07_attendance.png"
    if f7.exists():
        s7.shapes.add_picture(str(f7), Inches(0.8), Inches(1.8), width=Inches(6.6))

    create_feature_card(
        s7, Inches(7.7), Inches(1.8), Inches(4.8), Inches(1.5),
        "Tap-and-Go RFID Kiosk",
        "High-throughput entry kiosk handles 60+ student taps per minute. Zero bottleneck during morning peak rush.",
        accent_color=ROYAL_NAVY
    )
    create_feature_card(
        s7, Inches(7.7), Inches(3.5), Inches(4.8), Inches(1.5),
        "Instant WhatsApp/SMS Alerts",
        "Parents receive immediate notifications: 'Aarav checked in at 08:02 AM'. Eliminates bunks and builds parent trust.",
        accent_color=EMERALD
    )
    create_feature_card(
        s7, Inches(7.7), Inches(5.2), Inches(4.8), Inches(1.5),
        "Defaulter Alert Automation",
        "System automatically compiles 3-day consecutive absentee lists and prompts counsellor outreach.",
        accent_color=GOLD_PRIMARY
    )

    add_slide_footer(s7, prs, 7, total_slides)

    # =========================================================================
    # SLIDE 8: EDUBOARD INTERACTIVE SMART CLASSROOM
    # =========================================================================
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8, prs)
    add_slide_header(
        s8, prs,
        "SMART CLASSROOM SUITE",
        "Chapter 06: EduBoard Interactive Whiteboard & Lecture Capture",
        "Empower coaching faculty with dynamic vector diagrams, formula libraries, and synchronized notes."
    )

    f6 = frames_dir / "frame_06_eduboard.png"
    if f6.exists():
        s8.shapes.add_picture(str(f6), Inches(0.8), Inches(1.8), width=Inches(6.6))

    create_feature_card(
        s8, Inches(7.7), Inches(1.8), Inches(4.8), Inches(1.5),
        "Dynamic Physics & Math Geometry",
        "Built-in vector tools for projectile trajectories, circuit diagrams, geometric optics, and chemical equations.",
        accent_color=ROYAL_NAVY
    )
    create_feature_card(
        s8, Inches(7.7), Inches(3.5), Inches(4.8), Inches(1.5),
        "One-Click Lecture Capture",
        "Teachers export full lecture board notes to student portal and WhatsApp with a single tap at the end of class.",
        accent_color=EMERALD
    )
    create_feature_card(
        s8, Inches(7.7), Inches(5.2), Inches(4.8), Inches(1.5),
        "Zero Third-Party Licensing",
        "EduBoard is fully native to PrathamOne EduOS. Eliminates costly third-party digital whiteboard software subscriptions.",
        accent_color=GOLD_PRIMARY
    )

    add_slide_footer(s8, prs, 8, total_slides)

    # =========================================================================
    # SLIDE 9: EXAMINATIONS & ACADEMIC ANALYTICS
    # =========================================================================
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_background(s9, prs)
    add_slide_header(
        s9, prs,
        "ACADEMIC EXCELLENCE",
        "Examinations, Test Series Tracking & Student Growth Analytics",
        "Data-driven insights to boost competitive exam ranks across JEE, NEET, and Board curricula."
    )

    create_feature_card(
        s9, Inches(0.8), Inches(1.8), Inches(3.6), Inches(2.3),
        "Test Series Score Engine",
        "Batch-wise, subject-wise, and topic-wise mark recording with automated standard deviations and percentile ranks.",
        accent_color=ROYAL_NAVY
    )
    create_feature_card(
        s9, Inches(4.8), Inches(1.8), Inches(3.6), Inches(2.3),
        "Subject-Level Weakness Spotter",
        "Pinpoints chapters where batches underperform (e.g., Rotational Dynamics, Organic Chemistry), enabling targeted booster classes.",
        accent_color=EMERALD
    )
    create_feature_card(
        s9, Inches(8.8), Inches(1.8), Inches(3.6), Inches(2.3),
        "Single-Click Report Cards",
        "Generate professional PDF report cards with historical rank progression graphs, ready to distribute at parent-teacher meetings.",
        accent_color=GOLD_PRIMARY
    )
    create_feature_card(
        s9, Inches(0.8), Inches(4.4), Inches(5.6), Inches(2.2),
        "Competitive Exam Mapping",
        "Support for negative marking schemes (+4 / -1 JEE/NEET patterns) with automated rank lists and AIR benchmarks.",
        accent_color=ROYAL_NAVY
    )
    create_feature_card(
        s9, Inches(6.8), Inches(4.4), Inches(5.6), Inches(2.2),
        "Immutable Academic Snapshot",
        "Once published, historical marks and grades are archived permanently. Prevents unauthorized retroactive mark tampering.",
        accent_color=EMERALD
    )

    add_slide_footer(s9, prs, 9, total_slides)

    # =========================================================================
    # SLIDE 10: ENTERPRISE SECURITY & RBAC
    # =========================================================================
    s10 = prs.slides.add_slide(blank_layout)
    set_slide_background(s10, prs)
    add_slide_header(
        s10, prs,
        "ENTERPRISE SECURITY & COMPLIANCE",
        "Enterprise Architecture, Role-Based Access Control & Audit Trails",
        "Bank-grade security and governance engineered for complete administrative accountability."
    )

    create_feature_card(
        s10, Inches(0.8), Inches(1.8), Inches(5.6), Inches(2.2),
        "6-Tier Role Hierarchy",
        "SuperAdmin, Managing Director, Academic Head, Faculty, Front Desk Accountant, and Guardian. Each sees strictly what they need.",
        accent_color=ROYAL_NAVY
    )
    create_feature_card(
        s10, Inches(6.8), Inches(1.8), Inches(5.6), Inches(2.2),
        "Complete Forensic Audit Logs",
        "Every receipt generation, edit attempt, attendance override, and mark change is permanently logged with IP address and timestamp.",
        accent_color=GOLD_PRIMARY
    )
    create_feature_card(
        s10, Inches(0.8), Inches(4.3), Inches(5.6), Inches(2.2),
        "PostgreSQL 16 & Async Python",
        "Enterprise backend built on Python 3.11+ FastAPI and PostgreSQL 16. Fast query execution with sub-50ms API response times.",
        accent_color=EMERALD
    )
    create_feature_card(
        s10, Inches(6.8), Inches(4.3), Inches(5.6), Inches(2.2),
        "Automated Nightly Backups",
        "Encrypted database snapshots archived automatically every night with zero downtime and 1-click disaster recovery.",
        accent_color=ROYAL_NAVY
    )

    add_slide_footer(s10, prs, 10, total_slides)

    # =========================================================================
    # SLIDE 11: PROVEN ROI & BUSINESS IMPACT
    # =========================================================================
    s11 = prs.slides.add_slide(blank_layout)
    set_slide_background(s11, prs)
    add_slide_header(
        s11, prs,
        "VALUE PROPOSITION & ROI",
        "Tangible Business Impact for Institute Owners & Directors",
        "How PrathamOne EduOS pays for itself within the first 60 days of deployment."
    )

    metrics = [
        ("+22%", "Fee Collection Boost", "Automated WhatsApp installment reminders and split ledger tracking ensure timely fee inflows."),
        ("-85%", "Admin Overhead Reduced", "Staff no longer waste hours making phone calls, writing manual receipts, or searching registers."),
        ("100%", "Parent Peace of Mind", "Instant RFID arrival and departure alerts build rock-solid trust and boost word-of-mouth admissions."),
        ("0%", "Revenue Leakage", "Tamper-proof accounting ledger eliminates unaccounted cash, unauthorized discounts, and uncollected dues.")
    ]

    for idx, (stat, title, desc) in enumerate(metrics):
        col = idx % 2
        row = idx // 2
        l = Inches(0.8 + col * 6.0)
        t = Inches(1.8 + row * 2.5)
        w = Inches(5.6)
        h = Inches(2.2)

        create_light_card(
            s11, l, t, w, h,
            bg_color=GOLD_SURFACE if col == 0 else SURFACE_WHITE,
            stroke_color=GOLD_BORDER if col == 0 else BORDER_SUBTLE,
            stroke_width=Pt(1.5)
        )

        tb = s11.shapes.add_textbox(l + Inches(0.3), t + Inches(0.15), w - Inches(0.6), h - Inches(0.3))
        tf = tb.text_frame
        tf.word_wrap = True

        p_stat = tf.paragraphs[0]
        p_stat.text = stat
        p_stat.font.name = FONT_HEADING
        p_stat.font.size = Pt(28)
        p_stat.font.bold = True
        p_stat.font.color.rgb = GOLD_DEEP if col == 0 else EMERALD

        p_t = tf.add_paragraph()
        p_t.text = title
        p_t.font.name = FONT_HEADING
        p_t.font.size = Pt(14)
        p_t.font.bold = True
        p_t.font.color.rgb = ROYAL_NAVY

        p_d = tf.add_paragraph()
        p_d.text = desc
        p_d.font.name = FONT_BODY
        p_d.font.size = Pt(10)
        p_d.font.color.rgb = TEXT_SECONDARY

    add_slide_footer(s11, prs, 11, total_slides)

    # =========================================================================
    # SLIDE 12: IMPLEMENTATION ROADMAP & CONTACT (DEAN PRASHANT TEJAM)
    # =========================================================================
    s12 = prs.slides.add_slide(blank_layout)
    set_slide_background(s12, prs)
    add_slide_header(
        s12, prs,
        "GET STARTED & ONBOARDING",
        "Implementation Roadmap: Go Live in 48 Hours with Zero Disruption",
        "Turnkey onboarding, legacy data migration, and dedicated institute concierge support."
    )

    create_feature_card(
        s12, Inches(0.8), Inches(1.8), Inches(3.6), Inches(2.2),
        "Day 1: Instant Onboarding",
        "Upload existing student and fee data from Excel/CSV. Batches, courses, and fee installment rules mapped in under 4 hours.",
        accent_color=ROYAL_NAVY
    )
    create_feature_card(
        s12, Inches(4.8), Inches(1.8), Inches(3.6), Inches(2.2),
        "Day 2: Hardware & RFID Setup",
        "Connect plug-and-play RFID kiosk tablets and thermal receipt printers with automated WhatsApp gateway credentials.",
        accent_color=GOLD_PRIMARY
    )
    create_feature_card(
        s12, Inches(8.8), Inches(1.8), Inches(3.6), Inches(2.2),
        "Day 3: Staff & Faculty Training",
        "30-minute interactive walkthrough for front desk and faculty. Your academy transitions smoothly with zero downtime.",
        accent_color=EMERALD
    )

    # Contact / Call to Action Card (Radiant Champagne Gold Surface)
    create_light_card(
        s12, Inches(0.8), Inches(4.3), Inches(11.6), Inches(2.3),
        bg_color=GOLD_SURFACE, stroke_color=GOLD_BORDER, stroke_width=Pt(2)
    )

    tb_cta = s12.shapes.add_textbox(Inches(1.2), Inches(4.5), Inches(10.8), Inches(1.9))
    tf_cta = tb_cta.text_frame
    tf_cta.word_wrap = True

    p_c1 = tf_cta.paragraphs[0]
    p_c1.text = "READY TO ELEVATE YOUR COACHING INSTITUTE?"
    p_c1.font.name = FONT_HEADING
    p_c1.font.size = Pt(20)
    p_c1.font.bold = True
    p_c1.font.color.rgb = ROYAL_NAVY

    p_c2 = tf_cta.add_paragraph()
    p_c2.text = (
        "Experience PrathamOne EduOS live in action at Prashant Academy Coaching Institute alongside Dean Prashant Tejam.\n"
        "Schedule a personalized director walkthrough or live system demonstration."
    )
    p_c2.font.name = FONT_BODY
    p_c2.font.size = Pt(13)
    p_c2.font.color.rgb = TEXT_PRIMARY

    p_c3 = tf_cta.add_paragraph()
    p_c3.text = "Founder, Dean & Owner: Prashant Tejam  •  Product Architect: Jawahar R. Mallah  •  Smritisys & AITDL Networks"
    p_c3.font.name = FONT_BODY
    p_c3.font.size = Pt(11)
    p_c3.font.bold = True
    p_c3.font.color.rgb = GOLD_DEEP

    add_slide_footer(s12, prs, 12, total_slides)

    # =========================================================================
    # SAVE & MIRROR OUTPUT (PPTX & PDF)
    # =========================================================================
    output_dir = Path("docs/assets/commercial")
    output_dir.mkdir(parents=True, exist_ok=True)
    out_pptx = output_dir / "PrathamOne_EduOS_Pitch_Deck.pptx"
    prs.save(str(out_pptx))
    print(f"PowerPoint Presentation generated: {out_pptx} ({out_pptx.stat().st_size} bytes)")

    # Export to PDF via PowerPoint COM automation
    out_pdf = output_dir / "PrathamOne_EduOS_Pitch_Deck.pdf"
    convert_pptx_to_pdf(out_pptx, out_pdf)

    # Mirror to frontend public
    pub_dir = Path("frontend/public/media/commercial")
    pub_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(out_pptx, pub_dir / "PrathamOne_EduOS_Pitch_Deck.pptx")
    if out_pdf.exists():
        shutil.copy2(out_pdf, pub_dir / "PrathamOne_EduOS_Pitch_Deck.pdf")

    # Mirror to brain artifact directory
    brain_dir = Path(r"C:\Users\netma\.gemini\antigravity\brain\0d532662-f973-4d13-b3ec-a0c67bb58f2e")
    if brain_dir.exists():
        shutil.copy2(out_pptx, brain_dir / "PrathamOne_EduOS_Pitch_Deck.pptx")
        if out_pdf.exists():
            shutil.copy2(out_pdf, brain_dir / "PrathamOne_EduOS_Pitch_Deck.pdf")
        print(f"Mirrored PPTX and PDF to brain directory.")


if __name__ == "__main__":
    build_pitch_deck()
