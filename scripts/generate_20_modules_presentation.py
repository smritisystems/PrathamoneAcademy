# /**
#  * @file        generate_20_modules_presentation.py
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
#  * @description Enterprise 20-Module Master PowerPoint & PDF Presentation Generator (Founder & Dean Prashant Tejam, Light Theme, Royal Navy & Gold).
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

PAIN_BG = RGBColor(254, 242, 242)          # Light Crimson Tint (#FEF2F2)
PAIN_BORDER = RGBColor(239, 68, 68)        # Warning Red Border (#EF4444)
PAIN_HEADER = RGBColor(185, 28, 28)        # Deep Red Header (#B91C1C)

FONT_FAMILY = "Segoe UI"


def set_slide_background(slide, prs):
    """Fills slide with luminous Light Off-White background."""
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = BG_LIGHT
    bg.line.color.rgb = BG_LIGHT
    return bg


def add_slide_header(slide, prs, category: str, title: str, subtitle: str):
    """Draws clean, light corporate header with deep gold tag and bold royal navy title."""
    # Category Pill / Tag
    tb_cat = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.733), Inches(0.32))
    p_c = tb_cat.text_frame.paragraphs[0]
    p_c.text = category.upper()
    p_c.font.name = FONT_FAMILY
    p_c.font.size = Pt(11)
    p_c.font.bold = True
    p_c.font.color.rgb = GOLD_DEEP

    # Main Slide Title in Bold Royal Navy Blue
    tb_title = slide.shapes.add_textbox(Inches(0.8), Inches(0.7), Inches(11.733), Inches(0.85))
    tf_t = tb_title.text_frame
    tf_t.word_wrap = True

    p_t = tf_t.paragraphs[0]
    p_t.text = title
    p_t.font.name = FONT_FAMILY
    p_t.font.size = Pt(22)
    p_t.font.bold = True
    p_t.font.color.rgb = ROYAL_NAVY

    p_s = tf_t.add_paragraph()
    p_s.text = subtitle
    p_s.font.name = FONT_FAMILY
    p_s.font.size = Pt(12)
    p_s.font.color.rgb = TEXT_MUTED


def add_slide_footer(slide, prs, slide_num: int, total_slides: int):
    """Draws light corporate footer with Dean Prashant Tejam attribution."""
    # Subtle top divider line
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(6.9), Inches(11.733), Inches(0.01))
    line.fill.solid()
    line.fill.fore_color.rgb = BORDER_SUBTLE
    line.line.color.rgb = BORDER_SUBTLE

    tb_f = slide.shapes.add_textbox(Inches(0.8), Inches(7.0), Inches(10.5), Inches(0.32))
    p_f = tb_f.text_frame.paragraphs[0]
    p_f.text = (
        "PrathamOne EduOS 1.0.0 • Prashant Academy (Founder & Dean: Prashant Tejam) • "
        "Product Architect: Jawahar R. Mallah • Smritisys & AITDL Networks"
    )
    p_f.font.name = FONT_FAMILY
    p_f.font.size = Pt(9)
    p_f.font.color.rgb = TEXT_MUTED

    # Slide Number in Rich Gold
    tb_num = slide.shapes.add_textbox(Inches(11.5), Inches(7.0), Inches(1.033), Inches(0.32))
    p_n = tb_num.text_frame.paragraphs[0]
    p_n.text = f"{slide_num:02d} / {total_slides:02d}"
    p_n.alignment = PP_ALIGN.RIGHT
    p_n.font.name = FONT_FAMILY
    p_n.font.size = Pt(9)
    p_n.font.bold = True
    p_n.font.color.rgb = GOLD_DEEP


def create_light_card(slide, left, top, width, height, bg_color=SURFACE_WHITE, stroke_color=BORDER_SUBTLE, stroke_width=Pt(1)):
    """Draws a crisp white or tinted surface card with soft subtle border."""
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = bg_color
    card.line.color.rgb = stroke_color
    card.line.width = stroke_width
    return card


def add_speaker_transcript(slide, transcript: str):
    """Embeds full verbatim presenter script into PowerPoint Speaker Notes."""
    notes_slide = slide.notes_slide
    tf = notes_slide.notes_text_frame
    tf.text = transcript.strip()


def build_module_slide_light(
    prs,
    slide_num: int,
    total_slides: int,
    mod_num: int,
    mod_name: str,
    mod_category: str,
    subtitle: str,
    pain_point: str,
    capabilities: list[tuple[str, str]],
    roi_metric: str,
    roi_desc: str,
    transcript: str,
    image_path: Path = None,
):
    """Constructs a high-impact, uniform, premium 16:9 light slide for one of the 20 modules."""
    blank = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank)
    set_slide_background(slide, prs)

    category_badge = f"MODULE {mod_num:02d} • {mod_category}"
    add_slide_header(slide, prs, category_badge, mod_name, subtitle)

    # LEFT COLUMN (Width: 5.8 Inches)
    left_x = Inches(0.8)
    col_w = Inches(5.8)

    # 1. Pain Point Warning Card (Top Left - Soft Crimson Tint)
    pain_h = Inches(1.3)
    create_light_card(slide, left_x, Inches(1.65), col_w, pain_h, bg_color=PAIN_BG, stroke_color=PAIN_BORDER, stroke_width=Pt(1.2))

    # Crimson indicator bar on left
    stripe = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left_x + Inches(0.12), Inches(1.8), Inches(0.06), pain_h - Inches(0.3))
    stripe.fill.solid()
    stripe.fill.fore_color.rgb = PAIN_BORDER
    stripe.line.fill.background()

    tb_pain = slide.shapes.add_textbox(left_x + Inches(0.26), Inches(1.72), col_w - Inches(0.35), pain_h - Inches(0.15))
    tf_p = tb_pain.text_frame
    tf_p.word_wrap = True
    p_ph = tf_p.paragraphs[0]
    p_ph.text = "THE COACHING PAIN POINT WITHOUT THIS MODULE:"
    p_ph.font.name = FONT_FAMILY
    p_ph.font.size = Pt(9.5)
    p_ph.font.bold = True
    p_ph.font.color.rgb = PAIN_HEADER

    p_pd = tf_p.add_paragraph()
    p_pd.text = pain_point
    p_pd.font.name = FONT_FAMILY
    p_pd.font.size = Pt(9.5)
    p_pd.font.color.rgb = TEXT_PRIMARY

    # 2. Key Capabilities Card (Bottom Left - Crisp White with Royal Navy Stripe)
    cap_top = Inches(3.05)
    cap_h = Inches(3.75)
    create_light_card(slide, left_x, cap_top, col_w, cap_h, bg_color=SURFACE_WHITE, stroke_color=BORDER_SUBTLE, stroke_width=Pt(1.2))

    # Navy indicator bar on left of capabilities
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left_x + Inches(0.12), cap_top + Inches(0.2), Inches(0.06), cap_h - Inches(0.4))
    bar.fill.solid()
    bar.fill.fore_color.rgb = ROYAL_NAVY
    bar.line.fill.background()

    tb_cap = slide.shapes.add_textbox(left_x + Inches(0.28), cap_top + Inches(0.15), col_w - Inches(0.45), cap_h - Inches(0.3))
    tf_c = tb_cap.text_frame
    tf_c.word_wrap = True

    p_ch = tf_c.paragraphs[0]
    p_ch.text = "KEY ENTERPRISE CAPABILITIES & WORKFLOWS:"
    p_ch.font.name = FONT_FAMILY
    p_ch.font.size = Pt(11)
    p_ch.font.bold = True
    p_ch.font.color.rgb = ROYAL_NAVY

    for cap_title, cap_detail in capabilities:
        p_item = tf_c.add_paragraph()
        p_item.text = f"• {cap_title}: "
        p_item.font.name = FONT_FAMILY
        p_item.font.size = Pt(10)
        p_item.font.bold = True
        p_item.font.color.rgb = TEXT_PRIMARY

        run_d = p_item.add_run()
        run_d.text = cap_detail
        run_d.font.name = FONT_FAMILY
        run_d.font.size = Pt(9.5)
        run_d.font.bold = False
        run_d.font.color.rgb = TEXT_SECONDARY

    # RIGHT COLUMN (Width: 5.683 Inches)
    right_x = Inches(6.85)
    right_w = Inches(5.683)

    if image_path and image_path.exists():
        # Top Right: Software Screenshot inside delicate frame
        img_h = Inches(3.4)
        slide.shapes.add_picture(str(image_path), right_x, Inches(1.65), width=right_w)

        # Bottom Right: ROI & Impact Card (Radiant Champagne Gold Surface)
        roi_top = Inches(5.2)
        roi_h = Inches(1.6)
        create_light_card(slide, right_x, roi_top, right_w, roi_h, bg_color=GOLD_SURFACE, stroke_color=GOLD_BORDER, stroke_width=Pt(1.5))

        tb_roi = slide.shapes.add_textbox(right_x + Inches(0.25), roi_top + Inches(0.15), right_w - Inches(0.5), roi_h - Inches(0.3))
        tf_r = tb_roi.text_frame
        tf_r.word_wrap = True

        p_rm = tf_r.paragraphs[0]
        p_rm.text = f"INSTITUTE ROI: {roi_metric}"
        p_rm.font.name = FONT_FAMILY
        p_rm.font.size = Pt(13)
        p_rm.font.bold = True
        p_rm.font.color.rgb = GOLD_DEEP

        p_rd = tf_r.add_paragraph()
        p_rd.text = roi_desc
        p_rd.font.name = FONT_FAMILY
        p_rd.font.size = Pt(10.5)
        p_rd.font.color.rgb = TEXT_PRIMARY

    else:
        # Full Height Right Column: 2 Big Impact Glass Cards
        top_h = Inches(2.55)
        create_light_card(slide, right_x, Inches(1.65), right_w, top_h, bg_color=GOLD_SURFACE, stroke_color=GOLD_BORDER, stroke_width=Pt(1.5))

        tb_roi = slide.shapes.add_textbox(right_x + Inches(0.3), Inches(1.85), right_w - Inches(0.6), top_h - Inches(0.4))
        tf_r = tb_roi.text_frame
        tf_r.word_wrap = True

        p_rm = tf_r.paragraphs[0]
        p_rm.text = roi_metric
        p_rm.font.name = FONT_FAMILY
        p_rm.font.size = Pt(24)
        p_rm.font.bold = True
        p_rm.font.color.rgb = GOLD_DEEP

        p_rh = tf_r.add_paragraph()
        p_rh.text = "PROVEN TANGIBLE BUSINESS IMPACT FOR DIRECTORS"
        p_rh.font.name = FONT_FAMILY
        p_rh.font.size = Pt(11)
        p_rh.font.bold = True
        p_rh.font.color.rgb = ROYAL_NAVY

        p_rd = tf_r.add_paragraph()
        p_rd.text = roi_desc
        p_rd.font.name = FONT_FAMILY
        p_rd.font.size = Pt(10.5)
        p_rd.font.color.rgb = TEXT_PRIMARY

        # Bottom Right: Operational Governance Assurance (Crisp White Card)
        bot_h = Inches(2.45)
        bot_top = Inches(4.35)
        create_light_card(slide, right_x, bot_top, right_w, bot_h, bg_color=SURFACE_WHITE, stroke_color=BORDER_SUBTLE, stroke_width=Pt(1.2))

        tb_gov = slide.shapes.add_textbox(right_x + Inches(0.3), bot_top + Inches(0.2), right_w - Inches(0.6), bot_h - Inches(0.4))
        tf_g = tb_gov.text_frame
        tf_g.word_wrap = True

        p_gh = tf_g.paragraphs[0]
        p_gh.text = "ARCHITECTURE & GOVERNANCE GUARANTEE:"
        p_gh.font.name = FONT_FAMILY
        p_gh.font.size = Pt(11)
        p_gh.font.bold = True
        p_gh.font.color.rgb = ROYAL_NAVY

        p_gd = tf_g.add_paragraph()
        p_gd.text = (
            "• Rule 010 View-First Safety Lock: Data can never be altered without explicit authentication.\n"
            "• Single Source of Truth: Canonical master linkage across all academic and financial records.\n"
            "• Zero App Dependency: Parents receive receipts and departure alerts directly on WhatsApp."
        )
        p_gd.font.name = FONT_FAMILY
        p_gd.font.size = Pt(10)
        p_gd.font.color.rgb = TEXT_SECONDARY

    add_slide_footer(slide, prs, slide_num, total_slides)
    add_speaker_transcript(slide, transcript)


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


def generate_light_presentation():
    print("==================================================================")
    print("  PRATHAMONE EduOS — 20-MODULE LIGHT PREMIUM PRESENTATION & PDF")
    print("  Client: Prashant Academy Coaching Institute")
    print("  Founder, Dean & Owner: Prashant Tejam")
    print("  Theme: Crisp Light Background • Royal Navy Blue • Radiant Gold")
    print("==================================================================")

    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    total_slides = 24

    frames_dir = Path("data/commercial/frames")
    logo_path = Path("frontend/public/artwork/PrathamOne_EduOS_Brand_Assets/PrathamOne_EduOS_Logo_Transparent.png")

    # =========================================================================
    # SLIDE 1: MASTER EXECUTIVE TITLE SLIDE (FOUNDER & DEAN PRASHANT TEJAM)
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1, prs)

    card1 = create_light_card(
        s1, Inches(0.8), Inches(0.8), Inches(11.733), Inches(5.9),
        bg_color=SURFACE_WHITE, stroke_color=GOLD_BORDER, stroke_width=Pt(2)
    )

    if logo_path.exists():
        s1.shapes.add_picture(str(logo_path), Inches(1.4), Inches(1.3), width=Inches(3.8))

    tb_t = s1.shapes.add_textbox(Inches(1.4), Inches(2.4), Inches(6.0), Inches(3.8))
    tf1 = tb_t.text_frame
    tf1.word_wrap = True

    p0 = tf1.paragraphs[0]
    p0.text = "PRATHAMONE EduOS"
    p0.font.name = FONT_FAMILY
    p0.font.size = Pt(36)
    p0.font.bold = True
    p0.font.color.rgb = ROYAL_NAVY

    p1 = tf1.add_paragraph()
    p1.text = "Coaching Institute Edition • 20 Core Modules Master Showcase"
    p1.font.name = FONT_FAMILY
    p1.font.size = Pt(17)
    p1.font.bold = True
    p1.font.color.rgb = GOLD_DEEP

    p2 = tf1.add_paragraph()
    p2.text = "Coaching Management. Simplified."
    p2.font.name = FONT_FAMILY
    p2.font.size = Pt(14)
    p2.font.bold = True
    p2.font.color.rgb = ROYAL_NAVY

    p3 = tf1.add_paragraph()
    p3.text = (
        "\nClient Showcase: Prashant Academy Coaching Institute\n"
        "Founder, Dean & Owner: Prashant Tejam\n"
        "Product Architect: Jawahar R. Mallah  |  Smritisys & AITDL Networks  |  Version: 1.0.0"
    )
    p3.font.name = FONT_FAMILY
    p3.font.size = Pt(10.5)
    p3.font.color.rgb = TEXT_MUTED

    # Right side: Executive Leadership Card for Founder & Dean Prashant Tejam
    create_light_card(
        s1, Inches(7.8), Inches(1.2), Inches(4.3), Inches(5.1),
        bg_color=RGBColor(248, 250, 252), stroke_color=GOLD_BORDER, stroke_width=Pt(1.5)
    )

    academy_logo_path = Path("docs/assets/branding/prashant-academy-logo.png")
    if academy_logo_path.exists():
        s1.shapes.add_picture(str(academy_logo_path), Inches(8.1), Inches(1.5), width=Inches(3.7))
        badge_top = Inches(2.7)
    else:
        badge_top = Inches(1.5)

    tb_lead = s1.shapes.add_textbox(Inches(8.1), badge_top, Inches(3.7), Inches(3.3))
    tf_lead = tb_lead.text_frame
    tf_lead.word_wrap = True

    p_l0 = tf_lead.paragraphs[0]
    p_l0.text = "INSTITUTE LEADERSHIP"
    p_l0.font.name = FONT_FAMILY
    p_l0.font.size = Pt(10)
    p_l0.font.bold = True
    p_l0.font.color.rgb = GOLD_DEEP

    p_l1 = tf_lead.add_paragraph()
    p_l1.text = "Prashant Tejam"
    p_l1.font.name = FONT_FAMILY
    p_l1.font.size = Pt(22)
    p_l1.font.bold = True
    p_l1.font.color.rgb = ROYAL_NAVY

    p_l2 = tf_lead.add_paragraph()
    p_l2.text = "Founder, Dean & Owner\nPrashant Academy Coaching Institute\n"
    p_l2.font.name = FONT_FAMILY
    p_l2.font.size = Pt(11.5)
    p_l2.font.bold = True
    p_l2.font.color.rgb = TEXT_PRIMARY

    p_l3 = tf_lead.add_paragraph()
    p_l3.text = (
        "\"Delivering academic excellence, zero administrative leakage, "
        "and complete parent trust through enterprise engineering.\"\n"
    )
    p_l3.font.name = FONT_FAMILY
    p_l3.font.size = Pt(10)
    p_l3.font.italic = True
    p_l3.font.color.rgb = TEXT_MUTED

    p_l4 = tf_lead.add_paragraph()
    p_l4.text = "✔ 100% Canonical SSOT Data Ownership\n✔ Rule 010 View-First Financial Immutability\n✔ Direct Parent WhatsApp Automation"
    p_l4.font.name = FONT_FAMILY
    p_l4.font.size = Pt(9.5)
    p_l4.font.bold = True
    p_l4.font.color.rgb = ROYAL_NAVY

    add_slide_footer(s1, prs, 1, total_slides)
    add_speaker_transcript(
        s1,
        "Respected Managing Directors, Trustees, and Academic Leaders: I am Prashant Tejam, Founder and Dean of Prashant Academy Coaching Institute. "
        "It is my distinct privilege to present PrathamOne EduOS — Coaching Institute Edition. As leaders of premier coaching academies, our core "
        "mission is unlocking our students' highest competitive potential and delivering top ranks. Yet every day, our time, energy, "
        "and institute revenues are drained by disconnected spreadsheets, untracked fee installments, and chaotic parent communication. "
        "PrathamOne EduOS was designed specifically to solve this. It brings together all 20 essential coaching modules into one "
        "unified Single Source of Truth, governed by our strict Rule 010 View-First data security and frictionless WhatsApp automation "
        "that requires zero app downloads for parents. Today, I will personally walk you through each of our 20 enterprise modules and show you "
        "exactly how this operating system transforms your academy into an automated, highly profitable academic institution."
    )

    # =========================================================================
    # SLIDE 2: THE 4 ARCHITECTURAL PILLARS (LIGHT THEME)
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2, prs)
    add_slide_header(
        s2, prs,
        "EXECUTIVE ARCHITECTURE",
        "The 4 Non-Negotiable Pillars of PrathamOne EduOS",
        "Why leading coaching academies choose an integrated operating system over disjointed software tools."
    )

    pillars = [
        ("1. Single Source of Truth (SSOT Rules 001-011)", "Every student, faculty member, fee installment, and exam score exists in one authoritative model. No duplicate master records across standards, boards, or branches.", GOLD_BORDER),
        ("2. Rule 010: Global View-First Governance", "View Mode is default everywhere. Staff cannot create, edit, or delete records without explicit authorization, completely eliminating accidental data corruption.", ROYAL_NAVY),
        ("3. Native WhatsApp Automation (Zero Parent App)", "Parents refuse to install clumsy third-party apps. Instant branded PDF fee receipts, daily RFID departure alerts, and report cards land directly on WhatsApp in < 3s.", GOLD_BORDER),
        ("4. Local-First Kiosk & Offline Resilience", "Entrance RFID kiosks and front-desk billing terminals continue operating during internet outages, automatically syncing with the cloud database upon reconnection.", ROYAL_NAVY),
    ]

    for idx, (p_title, p_desc, p_accent) in enumerate(pillars):
        col = idx % 2
        row = idx // 2
        l = Inches(0.8 + col * 6.0)
        t = Inches(1.8 + row * 2.5)
        w = Inches(5.7)
        h = Inches(2.2)

        create_light_card(s2, l, t, w, h, bg_color=SURFACE_WHITE, stroke_color=p_accent, stroke_width=Pt(1.5))

        bar = s2.shapes.add_shape(MSO_SHAPE.RECTANGLE, l + Inches(0.12), t + Inches(0.18), Inches(0.06), h - Inches(0.36))
        bar.fill.solid()
        bar.fill.fore_color.rgb = p_accent
        bar.line.fill.background()

        tb = s2.shapes.add_textbox(l + Inches(0.28), t + Inches(0.18), w - Inches(0.45), h - Inches(0.36))
        tf = tb.text_frame
        tf.word_wrap = True

        p_h = tf.paragraphs[0]
        p_h.text = p_title
        p_h.font.name = FONT_FAMILY
        p_h.font.size = Pt(13)
        p_h.font.bold = True
        p_h.font.color.rgb = p_accent

        p_d = tf.add_paragraph()
        p_d.text = p_desc
        p_d.font.name = FONT_FAMILY
        p_d.font.size = Pt(10.5)
        p_d.font.color.rgb = TEXT_PRIMARY

    add_slide_footer(s2, prs, 2, total_slides)
    add_speaker_transcript(
        s2,
        "Before we examine the individual modules, it is essential to appreciate our architectural foundation. Generic school "
        "software fails coaching academies because coaching operations require rapid installment management, strict competitive "
        "batch scheduling, and instant parent communication. First, our Single Source of Truth architecture ensures that every "
        "record is canonical: updating a student's contact or batch immediately reflects across fees, attendance, teacher rosters, "
        "and exam score sheets. Second, our signature Rule 010 View-First governance ensures that staff can never accidentally overwrite "
        "marks or delete ledgers without explicit role authorization. Third, our Native WhatsApp integration guarantees that parents "
        "receive all receipts, attendance alerts, and notices directly in their favorite messaging app without any download friction. "
        "And fourth, our offline-first kiosk resilience ensures that your morning student entrance rush never halts, even during network downtime."
    )

    # =========================================================================
    # THE 20 MODULE DEFINITIONS (DATA DICTIONARY)
    # =========================================================================
    modules_data = [
        # 1. Dashboard
        (
            1, "Executive Pulse & Central Command Dashboard", "EXECUTIVE LEADERSHIP & REAL-TIME OVERSIGHT",
            "Instant clarity into academy operations, daily cash flow, and student attendance pulse.",
            "Coaching directors fly blind; waiting for handwritten monthly tallies while revenue leakage and attendance drops go undetected for weeks.",
            [
                ("Real-Time Financial Pulse", "Live tracking of ₹18.6L collected vs ₹28.5L invoiced with split head analytics."),
                ("Daily Attendance Meter", "Live percentage pulse (92.8% daily average) across JEE, NEET, and Foundation batches."),
                ("Batch Capacity Matrix", "Real-time seat occupancy and room utilization to identify under-enrolled classrooms."),
                ("Multi-Branch Switcher", "Single-click navigation between flagship and satellite coaching campuses.")
            ],
            "100% Director Visibility", "Reduces daily administrative briefing time from 2 hours to 30 seconds; zero blind spots.",
            "Module 1 is your Executive Pulse Dashboard. As a coaching director, your focus belongs on faculty quality and student mentorship, not chasing staff for numbers. The moment you open PrathamOne EduOS, your Executive Pulse displays the academy's real-time financial heartbeat: exact collections received today, pending installments, overdue aging buckets, and live attendance percentages across every batch. If attendance slips in a key competitive batch, you can intervene immediately before it impacts exam ranks.",
            frames_dir / "frame_03_dashboard.png"
        ),
        # 2. Academic Structure
        (
            2, "Academic Structure & Timetable Architecture", "ACADEMIC OPERATIONS & CURRICULUM MAPPING",
            "Clash-free scheduling, multi-board standard mapping, and batch capacity management.",
            "Timetable collisions, room overbooking, and faculty clashes cause chaotic room reshuffles and student dissatisfaction.",
            [
                ("Multi-Board Standard Support", "Handles CBSE, ICSE, State Boards, and competitive IIT-JEE / NEET streams."),
                ("Clash-Free Timetable Matrix", "Automated collision algorithms prevent teacher and classroom double-booking."),
                ("Canonical Subject Registry", "Master subject and topic definitions shared across standards without duplication."),
                ("Batch Allocation Engine", "Assigns student cohorts to designated lecture halls with exact seating capacities.")
            ],
            "Zero Scheduling Clashes", "Saves 40+ hours per academic term in manual scheduling and eliminates room conflicts.",
            "Module 2 is Academic Structure and Timetable Architecture. Coaching institutes manage complex permutations of morning and evening batches, weekend crash courses, and multi-board curricula. This module allows you to define your classes, boards, subjects, and batches in a strict canonical hierarchy. Our automated scheduling engine detects room and teacher collisions in real time, ensuring that faculty are never double-booked and students always have a dedicated, comfortable classroom.",
            None
        ),
        # 3. Admissions & CRM
        (
            3, "Admissions, Inquiry Pipeline & CRM", "REVENUE ACCELERATION & STUDENT ENROLLMENT",
            "Sub-second lead capture, counselor follow-up SLAs, and trial class conversions.",
            "Over 40% of prospective student walk-ins and phone inquiries slip through the cracks due to forgotten follow-up calls and untracked counseling demos.",
            [
                ("Multi-Channel Lead Capture", "Ingests inquiries from walk-ins, WhatsApp chats, phone calls, and landing pages."),
                ("Counselor Follow-Up SLAs", "Automated alert queues ensure staff never miss a promised callback or consultation."),
                ("Demo Lecture Management", "Tracks student attendance at trial lectures and measures trial-to-paid conversion rates."),
                ("Marketing Attribution Analytics", "Reveals exactly which advertising source or referral channel drives the highest revenue.")
            ],
            "+28% Inquiry Conversion", "Ensures zero prospective student leads are neglected; pays for the software in new admissions alone.",
            "Module 3 is your Admissions and CRM Engine. In competitive coaching, rapid inquiry response is everything. When a parent visits or inquires about your academy, this module captures their details in seconds. Counselors receive automated SLA reminders so no prospective student is ever forgotten. You can track demo class attendance and monitor which marketing campaigns generate the highest-paying enrollments, maximizing your marketing return on investment.",
            None
        ),
        # 4. Student Management
        (
            4, "Master Student Directory & 360° Dossier", "CORE STUDENT LIFECYCLE & DPDP COMPLIANCE",
            "Canonical student dossiers, Rule 010 View-First lock, and data privacy safeguards.",
            "Student records scattered across fragmented spreadsheets; accidental deletion of records; non-compliance with DPDP data privacy regulations.",
            [
                ("Canonical 360° Student Dossier", "Complete historical record of academic progress, batch enrollments, and fee ledgers."),
                ("Rule 010 View-First Safety Lock", "Default read-only protection prevents staff from accidentally mutating sensitive records."),
                ("DPDP Act 2023 Masking", "Masks Aadhaar numbers and parent contact digits by default for legal data protection."),
                ("Sub-Second Multi-Filter Search", "Instant lookup across 5,000+ students by roll number, name, standard, or batch.")
            ],
            "100% Data Integrity", "Saves 15 staff hours weekly in record lookups and eliminates catastrophic accidental data overwrites.",
            "Module 4 is the Master Student Directory. This is your institute's core asset. Every student has one immutable canonical dossier containing their complete academic history, fee balances, parent communications, and attendance logs. Protected by our signature Rule 010 View-First lock, staff can freely review student records without any risk of accidental edits or unauthorized data deletion. Furthermore, full DPDP Act compliance protects your institute from privacy liabilities.",
            frames_dir / "frame_04_students.png"
        ),
        # 5. Fees & Payments
        (
            5, "Zero-Leakage Fee Counter & Financial Ledger", "FINANCIAL GOVERNANCE & REVENUE RECOVERY",
            "Automated installment plans, 3-click collection, and double-entry immutable ledgers.",
            "Coaching institutes lose 15-20% revenue from untracked installments, unauthorized discounts, and cash reconciliation discrepancies.",
            [
                ("Structured Installment Schedules", "Custom split heads: Tuition, Study Material, Lab fees, and automated GST calculation."),
                ("3-Click Collection Desk", "Select student, enter payment, click collect — generates GST tax invoice in under 3 seconds."),
                ("Immutable Double-Entry Ledger", "Tamper-proof financial accounting prevents backdated ledger modifications."),
                ("Defaulter Aging Buckets", "Categorizes overdue fees into 30, 60, and 90-day recovery queues with auto-reminders.")
            ],
            "+22% Fee Recovery", "Recovers ₹2.5L to ₹5L in untracked dues every quarter; eliminates cash discrepancies entirely.",
            "Module 5 is our flagship Zero-Leakage Fee Counter and Financial Ledger. Cash leakage is the number one financial threat to coaching institutes. PrathamOne EduOS solves this with pre-configured installment schedules, automated GST tax invoicing, and an immutable double-entry ledger. Front-desk staff can collect fees in just 3 clicks. Concessions require senior approval, and every rupee collected via UPI, bank transfer, or cash reconciles perfectly with your bank statements.",
            frames_dir / "frame_05_fees.png"
        ),
        # 6. WhatsApp Communication
        (
            6, "Native WhatsApp Automation & Communication", "PARENT ENGAGEMENT & INSTANT DISPATCH",
            "Zero parent app installation; automated PDF fee receipts and attendance departure alerts.",
            "Parents ignore portal logins and refuse to download clumsy third-party mobile apps; staff waste hours making manual reminder phone calls.",
            [
                ("Native WhatsApp Gateway", "Messages land directly in parents' daily chat stream with 98% read rates."),
                ("Instant PDF Fee Receipts", "Branded PDF tax receipts sent automatically to parent's WhatsApp within 3 seconds."),
                ("Automated Departure Alerts", "Parents receive instant alerts when their child taps out of the coaching center."),
                ("Targeted Broadcast Composer", "Send urgent holiday notices or exam schedules to specific batches with 1 click.")
            ],
            "85% Phone Call Reduction", "Saves staff 3 hours daily in manual calls; skyrockets parent satisfaction and word-of-mouth trust.",
            "Module 6 is Native WhatsApp Automation. The biggest mistake coaching institutes make is forcing parents to download another clunky mobile app. PrathamOne EduOS delivers everything directly to parents on WhatsApp, where they already spend their day. The moment a fee payment is recorded, an official branded PDF receipt arrives on the parent's phone. When their child leaves the center, an automated departure alert is sent, building unmatched parental peace of mind.",
            None
        ),
        # 7. Teachers Management
        (
            7, "Faculty Directory & Academic Allocation Engine", "WORKFORCE MANAGEMENT & TEACHING LOGS",
            "Faculty qualification dossiers, batch allocations, and teaching schedule synchronization.",
            "Faculty syllabus pacing is untracked; confusion over batch allocations leads to faculty friction and compromised coaching quality.",
            [
                ("Comprehensive Faculty Dossier", "Tracks academic degrees, competitive specializations, and contact registry."),
                ("Batch Allocation Matrix", "Assigns star educators to specific competitive batches with clash prevention."),
                ("Teaching Schedule Sync", "Live timetables accessible on teacher mobile devices for seamless daily coordination."),
                ("Session Presence & Leaves", "Integrated presence tracking records completed lectures for payroll verification.")
            ],
            "100% Syllabus Adherence", "Eliminates teacher scheduling conflicts and ensures competitive syllabus completion on schedule.",
            "Module 7 empowers your faculty through our Faculty Directory and Allocation Engine. Great teachers produce top ranks. This module maps your faculty to batches according to their subject expertise and availability. Teachers can view their real-time schedules on mobile, log completed lecture topics, and request leaves without administrative confusion, ensuring that your high-stakes JEE and NEET syllabi finish well ahead of exam dates.",
            None
        ),
        # 8. Teacher Payroll
        (
            8, "Faculty Payroll & Session Wage Compensation", "WORKFORCE FINANCE & COMPENSATION AUDIT",
            "Hybrid hourly, session-based, and monthly salary processing with automated wage slips.",
            "Manual calculation of hourly guest lectures and session rates causes billing errors, delayed salary disbursements, and faculty attrition.",
            [
                ("Hybrid Compensation Models", "Supports fixed monthly salaries, per-session rates, and hourly lecture compensation."),
                ("Automated Session Log Audit", "Cross-checks completed lectures against the academic timetable before payout."),
                ("1-Click Pay Voucher Generation", "Generates itemized salary slips with tax deductions, incentives, and allowances."),
                ("Historical Payroll Ledger", "Maintains immutable wage records for institutional accounting and tax filings.")
            ],
            "15-Minute Payroll Runs", "Cuts monthly payroll processing from 3 days to 15 minutes; eliminates wage disputes completely.",
            "Module 8 manages Faculty Payroll and Session Wage Compensation. Coaching institutes rely on a mix of full-time senior faculty and visiting expert lecturers who bill on an hourly or per-session basis. Calculating this manually on spreadsheets leads to mistakes and friction. PrathamOne EduOS automatically reconciles completed timetable lectures with teacher attendance logs, generating accurate payroll vouchers in 1 click and keeping your teaching stars happy and motivated.",
            None
        ),
        # 9. Staff Directory
        (
            9, "Administrative Staff Register & HR Operations", "ADMINISTRATIVE WORKFORCE & DUTIES",
            "Non-teaching staff registers, shift duties, leave workflows, and HR document generation.",
            "Administrative staff operate without clear role definitions, documented leave records, or formal employment contracts, causing operational friction.",
            [
                ("Canonical Staff Directory", "Comprehensive records for front-desk, counselors, accountants, and lab staff."),
                ("Role & Responsibility Allocations", "Defines operational boundaries, workstation duties, and shift timings."),
                ("Leave Approval Workflows", "Structured digital leave application and multi-tier approval system."),
                ("HR Document Studio", "Generates formal appointment letters, experience certificates, and conduct policies.")
            ],
            "Structured Operations", "Professionalizes non-teaching operations and establishes clear operational accountability across departments.",
            "Module 9 is the Administrative Staff Register. Behind every successful coaching institute is a dedicated team of counselors, accountants, lab assistants, and security personnel. This module organizes non-teaching staff into clear role hierarchies with assigned shift duties, formal leave workflows, and automated HR document generation. This ensures smooth front-desk operations and complete institutional discipline.",
            None
        ),
        # 10. Attendance System
        (
            10, "RFID & QR Smart Attendance Hub", "STUDENT SAFETY & AUTOMATED TRACKING",
            "Tap-and-go 60+ taps/min kiosk, instant parent alerts, and automated defaulter queues.",
            "Roll calls consume 15 minutes of every lecture; students bunk classes undetected; institute bears liability during emergency situations.",
            [
                ("High-Speed Tap-and-Go Kiosk", "RFID scanner processes 60+ students per minute with zero rush-hour entrance queues."),
                ("Automated Departure Notifications", "Triggers immediate WhatsApp/SMS message to parents the second their child exits."),
                ("3-Day Absentee Alert Queue", "Flags habitual absentees automatically for timely academic counselor intervention."),
                ("Teacher App Fallback Mode", "Offline-capable backup roll-call mode on teacher mobile devices if hardware fails.")
            ],
            "+15 Mins Teaching / Class", "Reclaims 15 minutes of coaching time per class; eliminates student bunking; builds supreme parent trust.",
            "Module 10 is the RFID Smart Attendance Hub. Taking manual roll call in a lecture hall with 80 or 100 students wastes 15 minutes of valuable teaching time. Our high-speed RFID kiosk allows students to tap their smart ID card at the entrance in less than a second. Parents receive an immediate WhatsApp notification confirming arrival. When students tap out after class, a departure alert is dispatched. Parents feel reassured, and student attendance climbs to over 95%.",
            frames_dir / "frame_07_attendance.png"
        ),
        # 11. Examinations
        (
            11, "Examinations, Marks Entry & Test Series Analytics", "ACADEMIC ASSESSMENT & RANK PREDICTION",
            "Competitive scoring (+4/-1 JEE/NEET patterns), weakness diagnostics, and 1-click report cards.",
            "Manual score collation takes days; no diagnosis of student conceptual weaknesses; parents receive performance updates too late.",
            [
                ("Competitive Marking Engine", "Full native support for negative marking schemes (+4 / -1 JEE/NEET patterns)."),
                ("Conceptual Weakness Diagnostics", "Identifies specific topics (e.g. Thermodynamics, Optics) where batches struggle."),
                ("Rank Progression Curves", "Visual longitudinal graphs showing student percentile improvement across test series."),
                ("1-Click PDF Report Cards", "Generates beautiful report cards with batch rankings ready for parent-teacher meets.")
            ],
            "+18% Test Score Growth", "Pinpoints batch weaknesses early to run targeted booster sessions; boosts top competitive ranks.",
            "Module 11 handles Examinations, Marks Entry, and Test Series Analytics. The reputation of your coaching institute depends on your exam results. PrathamOne EduOS natively supports competitive exam scoring with negative marking patterns. More importantly, our analytics engine spots conceptual weaknesses across batches, alerting teachers to revise difficult topics before the main exam. Professional PDF report cards are generated with a single click.",
            None
        ),
        # 12. EduBoard Classroom
        (
            12, "EduBoard — Interactive Smart Classroom Suite", "LEARNING TECHNOLOGY & LECTURE CAPTURE",
            "Native digital chalkboard, dynamic physics/math vector tools, and 1-click notes export.",
            "Institutes pay heavy annual subscriptions for third-party digital smartboard tools that fail to integrate or archive lecture notes into the ERP.",
            [
                ("Integrated Digital Teaching Board", "Native chalkboard, whiteboard, and PDF presentation annotator for smartboards."),
                ("Physics & Math Vector Tools", "Pre-built vector templates for projectile curves, electrical circuits, and geometry."),
                ("1-Click Lecture Capture", "Instant export of full lecture whiteboard notes to student portal in PDF format."),
                ("Zero Third-Party Licensing", "Fully built into PrathamOne EduOS; saves thousands in external software fees.")
            ],
            "Saves ₹1L+ Annually", "Eliminates third-party digital whiteboard license fees; modernizes classroom presentation.",
            "Module 12 is EduBoard — your interactive smart classroom suite. Coaching faculties require fast, fluid digital drawing tools for physics vector diagrams, chemical structures, and complex mathematical formulas. EduBoard provides all of this natively inside the platform. At the end of class, the teacher taps one button, and the complete handwritten lecture board is archived and sent to students as a PDF study guide.",
            frames_dir / "frame_06_eduboard.png"
        ),
        # 13. Study Materials (Courses)
        (
            13, "Study Materials, Question Banks & Course Library", "CONTENT MANAGEMENT & SYLLABUS TRACKING",
            "Centralized digital study material repository, categorized question banks, and syllabus meters.",
            "Exorbitant physical printing costs; piracy of proprietary institute notes; students misplacing physical booklets and falling behind.",
            [
                ("Centralized Digital Repository", "Secure library for chapter modules, formula handbooks, and daily practice sheets."),
                ("Categorized Question Bank", "Searchable archive of practice questions indexed by difficulty level and exam topic."),
                ("Curriculum Syllabus Tracker", "Tracks percentage completion of course syllabi across assigned batches in real time."),
                ("Role-Protected Material Access", "Controls material access so students only access content for their enrolled subjects.")
            ],
            "45% Printing Cost Reduction", "Cuts paper and printing expenses significantly while protecting proprietary study modules from leakage.",
            "Module 13 is your Study Material and Question Bank Repository. Producing physical study booklets for hundreds of students is an expensive, recurring burden. This module organizes your proprietary notes, formula handbooks, and daily practice problem sheets into a secure digital library. You can monitor syllabus completion across batches and provide students with instant access to chapter notes on their mobile devices.",
            None
        ),
        # 14. Homework Register
        (
            14, "Homework Checking Register & Daily Accountability", "ACADEMIC RIGOR & PRACTICE COMPLIANCE",
            "Daily assignment dispatch, physical notebook checking register, and automated defaulter alerts.",
            "Teachers have no systematic record of daily homework completion; students fall behind silently; parents blame the institute when ranks drop.",
            [
                ("Assignment Dispatcher", "Publish daily problem sets with submission deadlines via web portal and WhatsApp."),
                ("Physical Notebook Register", "Rapid-check interface for teachers to mark homework checked during classroom rounds."),
                ("Homework Completion Heatmap", "Identifies students with chronic homework defaults before test scores plunge."),
                ("Automated Defaulter Alerts", "Sends polite WhatsApp reminders to parents when homework is missed 2 days in a row.")
            ],
            "94% Homework Adherence", "Boosts daily practice completion from 60% to 94%; provides indisputable documentation to parents.",
            "Module 14 is the Homework Checking Register and Practice Tracker. Self-study and daily practice are what turn average students into top rankers. This module gives teachers an intuitive register to track physical notebook checks in seconds. If a student misses homework two days in a row, an automated polite notice is sent to their parents, ensuring family alignment and continuous academic discipline.",
            None
        ),
        # 15. Planning & Calendar
        (
            15, "Planning, Academic Calendar & Event Kanban", "INSTITUTIONAL STRATEGY & EVENT MILESTONES",
            "Academic master calendar, Kanban task management, and crash-course timelines.",
            "Clashing exam dates, forgotten parent meetings, disorganized crash-course launches, and lack of accountability among staff teams.",
            [
                ("Master Academic Calendar", "Year-long synchronized view of lectures, test dates, holidays, and revision camps."),
                ("Visual Kanban Task Boards", "Organizes institute events (e.g., Scholarship Tests, Seminars) with assignees and SLAs."),
                ("Timeline & Agenda Synchronization", "Keeps directors, faculty, and front desk aligned on upcoming weekly milestones."),
                ("Crash-Course Marathon Planner", "Structured scheduling for intensive pre-board and pre-JEE revision marathons.")
            ],
            "Clockwork Execution", "Guarantees 100% on-time execution of academic milestones and eliminates inter-departmental miscommunication.",
            "Module 15 is your Planning, Academic Calendar, and Event Kanban system. Running an academy involves dozens of simultaneous moving parts: mock tests, parent seminars, holiday breaks, and intensive revision camps. This module provides a synchronized calendar and visual Kanban board where staff collaborate, track tasks with deadlines, and execute every institutional event with military precision.",
            None
        ),
        # 16. Document Printing (Forms)
        (
            16, "Document Printing Studio & Automated KYC", "BRANDED PRINT MEDIA & CERTIFICATION",
            "Centralized document studio for admission forms, photo ID cards, hall tickets, and tax receipts.",
            "Designing and printing student ID cards, admission forms, and exam hall tickets requires outsourcing to expensive graphic designers and slow printers.",
            [
                ("Centralized Document Studio", "Generates admission forms, barcode/QR ID cards, and official fee receipts instantly."),
                ("Bulk Exam Hall Ticket Spooler", "Auto-populates seat numbers, exam venues, and student photos in 1-click bulk PDF."),
                ("Official Certification Studio", "Issues tamper-evident Leaving Certificates, Course Completion, and Merit Certs."),
                ("Print Audit Trail & Attribution", "Logs every printed document with timestamp and user attribution to prevent forgery.")
            ],
            "Saves ₹40,000+ / Batch", "Eliminates outsourced printing costs; enables instant same-day student ID card issuance.",
            "Module 16 is your Document Printing Studio and Automated KYC engine. Presenting a professional corporate image is critical for student retention. Instead of hiring external graphic designers for ID cards or hall tickets, this module auto-populates student photos, barcodes, and course details into beautiful, print-ready PDF formats. You can issue same-day smart ID cards and bulk print exam hall tickets effortlessly.",
            None
        ),
        # 17. Reports & Analytics
        (
            17, "Consolidated Reports, Analytics & Financial Daybook", "BUSINESS INTELLIGENCE & AUDIT COMPLIANCE",
            "Financial daybooks, batch profitability analysis, longitudinal enrollment curves, and CA exports.",
            "Institute directors spend weekends assembling chaotic spreadsheets to understand branch profitability, batch costs, and fee collection gaps.",
            [
                ("Comprehensive Financial Daybook", "Complete daily cash register, bank deposits, refunds, and operational expense logs."),
                ("Batch Profitability Analysis", "Compares teacher payouts and room costs against batch tuition collections."),
                ("Longitudinal Enrollment Curves", "Tracks 3-year admission growth, student retention, and drop-out attrition rates."),
                ("1-Click CA Tax Exports", "Instant Excel and PDF exports formatted specifically for chartered accountants.")
            ],
            "Instant Decision Clarity", "Identifies unprofitable batches immediately; saves 20+ accounting hours every month during tax filing.",
            "Module 17 delivers Consolidated Reports and Financial Daybooks. Sound business decisions require clean, verifiable data. This module provides complete visibility into your daily cash flow, batch-wise profitability, and historical admission trends. At tax filing time, your accountant can export audit-ready financial daybooks in one click, saving dozens of hours of manual reconciliation.",
            None
        ),
        # 18. Users & RBAC
        (
            18, "Role-Based Access Control (RBAC) & Forensic Security", "INSTITUTIONAL GOVERNANCE & DATA PROTECTION",
            "6-tier role hierarchy, granular permission matrix, and complete forensic audit trails.",
            "Staff sharing passwords; disgruntled employees downloading student phone numbers to sell to competitor institutes; unauthorized fee waivers.",
            [
                ("6-Tier Role Hierarchy", "SuperAdmin, Managing Director, Academic Head, Faculty, Accountant, and Guardian roles."),
                ("Granular Permission Matrix", "Restricts permissions so front desk cannot edit fees and teachers cannot delete marks."),
                ("Complete Forensic Audit Trail", "Permanently logs every login, IP address, record update, and export activity."),
                ("Instant Session Revocation", "Terminates compromised user sessions across all devices with a single click.")
            ],
            "100% Data Theft Prevention", "Completely secures your student contact database from competitor theft or internal leaks.",
            "Module 18 is Role-Based Access Control and Forensic Security. In the coaching industry, your student database is your most valuable intellectual property. If a rogue employee downloads your phone list to sell to a competing coaching institute, it can destroy your business. PrathamOne EduOS enforces strict 6-tier role separation with forensic audit logs that record every single screen view, edit, and export attempt.",
            None
        ),
        # 19. Housekeeping & Backups
        (
            19, "Enterprise Housekeeping, Automated Backups & GFS Archive", "SYSTEM RESILIENCE & CONTINUITY",
            "Automated nightly backups, GFS retention, SHA-256 verification, and sandbox restore drills.",
            "A single hard drive crash, ransomware attack, or accidental database wipeout can permanently destroy 5 years of financial and student records.",
            [
                ("Automated Nightly Backups", "Scheduled PostgreSQL database snapshots with zero performance degradation."),
                ("Grandfather-Father-Son (GFS)", "Maintains daily, weekly, and monthly snapshots for 7-year audit compliance."),
                ("SHA-256 Cryptographic Check", "Confirms backup archive integrity to prevent silent data corruption."),
                ("1-Click Sandbox Restore Drill", "Rehearses disaster recovery in an isolated sandbox to guarantee 100% recovery.")
            ],
            "Zero Data Loss Risk", "Guarantees 99.99% business continuity; eliminates catastrophic data loss nightmares completely.",
            "Module 19 is Enterprise Housekeeping and Automated Backups. Your institute cannot afford downtime or data loss. PrathamOne EduOS automatically creates encrypted database snapshots every night using the industry-standard Grandfather-Father-Son retention scheme. Our built-in sandbox restore drill tests backups periodically, guaranteeing that if disaster strikes, your entire institute is restored within minutes.",
            None
        ),
        # 20. System Settings & Branding
        (
            20, "System Settings, White-Label Branding & Multi-Branch Hub", "SCALABILITY & BRAND EQUITY",
            "Complete institute white-label branding, academic policy lookups, and multi-branch infrastructure.",
            "Generic software forces third-party vendor logos onto student receipts; rigid systems cannot scale when opening new branch locations.",
            [
                ("Complete White-Label Customization", "Your institute logo, official seal, crest, tagline, and corporate header colors."),
                ("Multi-Branch Scalability", "Manage 1, 5, or 50 coaching centers under one unified corporate administration."),
                ("Academic Policy Configuration", "Configurable grading bands, late fee grace periods, and custom SMS/WhatsApp templates."),
                ("Direct API & Webhook Endpoints", "Connects with payment gateways, biometric devices, and external accounting tools.")
            ],
            "Elevated Brand Equity", "Presents your academy as an elite, high-tech enterprise; scales seamlessly as you expand.",
            "Module 20 is System Settings, White-Label Branding, and Multi-Branch Infrastructure. Your academy has spent years building its local reputation. PrathamOne EduOS operates 100% under your brand name, official crest, and color scheme. As you expand to multiple locations, our multi-branch architecture allows you to manage all centers centrally while granting local autonomy to branch managers.",
            None
        ),
    ]

    # Generate Slides 3 to 22 (The 20 Modules in Light Theme)
    for m_data in modules_data:
        m_num = m_data[0]
        slide_idx = m_num + 2  # Slides 3 to 22
        build_module_slide_light(
            prs=prs,
            slide_num=slide_idx,
            total_slides=total_slides,
            mod_num=m_num,
            mod_name=m_data[1],
            mod_category=m_data[2],
            subtitle=m_data[3],
            pain_point=m_data[4],
            capabilities=m_data[5],
            roi_metric=m_data[6],
            roi_desc=m_data[7],
            transcript=m_data[8],
            image_path=m_data[9],
        )

    # =========================================================================
    # SLIDE 23: UNIFIED DATA FLYWHEEL (LIGHT THEME)
    # =========================================================================
    s23 = prs.slides.add_slide(blank_layout)
    set_slide_background(s23, prs)
    add_slide_header(
        s23, prs,
        "MODULE INTERCONNECTIVITY",
        "The Unified Data Flywheel: How All 20 Modules Reinforce Each Other",
        "A single student interaction cascades automatically across admissions, fees, timetable, RFID, and parent WhatsApp."
    )

    create_light_card(
        s23, Inches(0.8), Inches(1.8), Inches(11.733), Inches(4.9),
        bg_color=SURFACE_WHITE, stroke_color=GOLD_BORDER, stroke_width=Pt(2)
    )

    tb_fw = s23.shapes.add_textbox(Inches(1.2), Inches(2.0), Inches(10.9), Inches(4.5))
    tf_fw = tb_fw.text_frame
    tf_fw.word_wrap = True

    p_f0 = tf_fw.paragraphs[0]
    p_f0.text = "THE ZERO-FRICTION STUDENT JOURNEY IN PRATHAMONE EduOS:"
    p_f0.font.name = FONT_FAMILY
    p_f0.font.size = Pt(14)
    p_f0.font.bold = True
    p_f0.font.color.rgb = ROYAL_NAVY

    flywheel_steps = [
        ("Step 1: Inquiry to Admission (Modules 03 & 04)", "Lead is captured in CRM -> Converted to enrolled student in Student Directory -> Roll number & batch allocated instantly."),
        ("Step 2: Automated Fee Ledger (Module 05)", "Installment plan generated automatically -> Parent makes 1st payment at counter -> Branded GST tax receipt lands on parent WhatsApp in < 3s (Module 06)."),
        ("Step 3: Academic & Timetable Integration (Modules 02 & 07)", "Student is enrolled into designated classroom roster -> Faculty schedule updates -> EduBoard lecture notes and study materials auto-synced (Modules 12 & 13)."),
        ("Step 4: Smart Attendance & Departure (Module 10)", "Student taps RFID smart badge at gate -> System logs presence -> Automated departure alert sent to parent's WhatsApp (Module 06)."),
        ("Step 5: Assessment & Growth Analytics (Modules 11 & 17)", "Student takes weekend mock test -> Negative marks calculated -> Weakness spotter flags revision topics -> Report card generated -> Financial daybook reconciled."),
    ]

    for step_title, step_desc in flywheel_steps:
        p_s = tf_fw.add_paragraph()
        p_s.text = f"\n{step_title}: "
        p_s.font.name = FONT_FAMILY
        p_s.font.size = Pt(11)
        p_s.font.bold = True
        p_s.font.color.rgb = GOLD_DEEP

        run_sd = p_s.add_run()
        run_sd.text = step_desc
        run_sd.font.name = FONT_FAMILY
        run_sd.font.size = Pt(10)
        run_sd.font.bold = False
        run_sd.font.color.rgb = TEXT_PRIMARY

    add_slide_footer(s23, prs, 23, total_slides)
    add_speaker_transcript(
        s23,
        "Here on Slide 23, we see the real power of PrathamOne EduOS: The Unified Data Flywheel. When software tools are "
        "bought piecemeal — one app for attendance, an Excel sheet for fees, a separate app for parent communication — staff "
        "waste hours re-typing the same student information over and over again. In PrathamOne EduOS, everything is connected. "
        "When an inquiry converts in Module 3, it instantly creates the canonical student profile in Module 4. That automatically "
        "generates the fee schedule in Module 5, enrolls the student in the timetable in Module 2, assigns the RFID smart badge "
        "in Module 10, and sets up parent WhatsApp messaging in Module 6. It is one living, breathing, automated ecosystem "
        "that eliminates clerical work and lets you focus 100% on student success."
    )

    # =========================================================================
    # SLIDE 24: 48-HOUR ONBOARDING & ROI GUARANTEE (DEAN PRASHANT TEJAM)
    # =========================================================================
    s24 = prs.slides.add_slide(blank_layout)
    set_slide_background(s24, prs)
    add_slide_header(
        s24, prs,
        "IMPLEMENTATION & COMMERCIAL ROI",
        "48-Hour Rapid Onboarding & Commercial Value Guarantee",
        "Turnkey data migration, hardware setup, and faculty onboarding with zero institute downtime."
    )

    # 3 Implementation Steps (Light Surface Cards)
    steps = [
        ("Phase 1: 4-Hour Data Migration", "Our concierge engineering team migrates all your existing student, parent, and fee records from legacy Excel sheets with zero data loss.", GOLD_BORDER),
        ("Phase 2: Hardware & WhatsApp Setup", "Plug-and-play installation of RFID smart attendance tablets, receipt printers, and official WhatsApp Business gateway credentials.", ROYAL_NAVY),
        ("Phase 3: 30-Minute Staff Training", "Intuitive, view-first user interface ensures front-desk staff, accountants, and faculty are 100% comfortable on day one.", GOLD_BORDER),
    ]

    for idx, (st_title, st_desc, st_accent) in enumerate(steps):
        l = Inches(0.8 + idx * 4.0)
        t = Inches(1.8)
        w = Inches(3.7)
        h = Inches(2.2)

        create_light_card(s24, l, t, w, h, bg_color=SURFACE_WHITE, stroke_color=st_accent, stroke_width=Pt(1.5))

        bar = s24.shapes.add_shape(MSO_SHAPE.RECTANGLE, l + Inches(0.12), t + Inches(0.18), Inches(0.06), h - Inches(0.36))
        bar.fill.solid()
        bar.fill.fore_color.rgb = st_accent
        bar.line.fill.background()

        tb = s24.shapes.add_textbox(l + Inches(0.26), t + Inches(0.18), w - Inches(0.4), h - Inches(0.36))
        tf = tb.text_frame
        tf.word_wrap = True

        p_h = tf.paragraphs[0]
        p_h.text = st_title
        p_h.font.name = FONT_FAMILY
        p_h.font.size = Pt(13)
        p_h.font.bold = True
        p_h.font.color.rgb = st_accent

        p_d = tf.add_paragraph()
        p_d.text = st_desc
        p_d.font.name = FONT_FAMILY
        p_d.font.size = Pt(10.5)
        p_d.font.color.rgb = TEXT_PRIMARY

    # Bottom CTA Box (Radiant Champagne Gold Surface)
    cta = create_light_card(
        s24, Inches(0.8), Inches(4.3), Inches(11.733), Inches(2.35),
        bg_color=GOLD_SURFACE, stroke_color=GOLD_BORDER, stroke_width=Pt(2)
    )

    tb_cta = s24.shapes.add_textbox(Inches(1.2), Inches(4.5), Inches(10.9), Inches(2.0))
    tf_cta = tb_cta.text_frame
    tf_cta.word_wrap = True

    p_c1 = tf_cta.paragraphs[0]
    p_c1.text = "EXPERIENCE PRATHAMONE EduOS IN ACTION AT PRASHANT ACADEMY"
    p_c1.font.name = FONT_FAMILY
    p_c1.font.size = Pt(18)
    p_c1.font.bold = True
    p_c1.font.color.rgb = ROYAL_NAVY

    p_c2 = tf_cta.add_paragraph()
    p_c2.text = (
        "Schedule an in-person director walkthrough or live system demonstration with Dean Prashant Tejam.\n"
        "Witness how all 20 modules operate seamlessly inside Prashant Academy Coaching Institute.\n"
        "Commercial Value Guarantee: PrathamOne EduOS pays for itself in fee recovery and administrative savings within 60 days."
    )
    p_c2.font.name = FONT_FAMILY
    p_c2.font.size = Pt(12)
    p_c2.font.color.rgb = TEXT_PRIMARY

    p_c3 = tf_cta.add_paragraph()
    p_c3.text = "Founder, Dean & Owner: Prashant Tejam  •  Product Architect: Jawahar R. Mallah  •  Smritisys & AITDL Networks"
    p_c3.font.name = FONT_FAMILY
    p_c3.font.size = Pt(11)
    p_c3.font.bold = True
    p_c3.font.color.rgb = GOLD_DEEP

    add_slide_footer(s24, prs, 24, total_slides)
    add_speaker_transcript(
        s24,
        "In conclusion, respected directors, upgrading your coaching academy to PrathamOne EduOS is not a difficult, months-long "
        "ordeal. Our rapid onboarding process takes just 48 hours. On Day 1, our technical team migrates all your existing students "
        "and fee balances from Excel into the platform with zero data loss. On Day 2, we configure your RFID kiosks and WhatsApp "
        "credentials. On Day 3, a simple 30-minute training session gets your staff fully up to speed. "
        "We invite you to experience PrathamOne EduOS live in action at Prashant Academy Coaching Institute alongside Dean "
        "Prashant Tejam and our administrative team. We stand behind our commercial guarantee: the fee leakage you prevent and the "
        "administrative hours you save will pay for this entire system within the first 60 days of deployment. Thank you for your "
        "time, and we look forward to partnering with your academy."
    )

    # =========================================================================
    # SAVE & MIRROR OUTPUTS (PPTX & PDF)
    # =========================================================================
    out_dir = Path("docs/assets/commercial")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "PrathamOne_EduOS_20_Modules_Executive_Presentation.pptx"
    prs.save(str(out_file))
    print(f"Master 24-Slide Light Presentation saved: {out_file} ({out_file.stat().st_size} bytes)")

    # Export to PDF via PowerPoint COM
    out_pdf = out_dir / "PrathamOne_EduOS_20_Modules_Executive_Presentation.pdf"
    convert_pptx_to_pdf(out_file, out_pdf)

    # Also convert Pitch Deck to PDF
    pitch_pptx = out_dir / "PrathamOne_EduOS_Pitch_Deck.pptx"
    pitch_pdf = out_dir / "PrathamOne_EduOS_Pitch_Deck.pdf"
    if pitch_pptx.exists():
        convert_pptx_to_pdf(pitch_pptx, pitch_pdf)

    # Mirror to frontend public
    pub_dir = Path("frontend/public/media/commercial")
    pub_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(out_file, pub_dir / "PrathamOne_EduOS_20_Modules_Executive_Presentation.pptx")
    if out_pdf.exists():
        shutil.copy2(out_pdf, pub_dir / "PrathamOne_EduOS_20_Modules_Executive_Presentation.pdf")
    if pitch_pdf.exists():
        shutil.copy2(pitch_pdf, pub_dir / "PrathamOne_EduOS_Pitch_Deck.pdf")

    # Mirror to brain directory
    brain_dir = Path(r"C:\Users\netma\.gemini\antigravity\brain\0d532662-f973-4d13-b3ec-a0c67bb58f2e")
    if brain_dir.exists():
        shutil.copy2(out_file, brain_dir / "PrathamOne_EduOS_20_Modules_Executive_Presentation.pptx")
        if out_pdf.exists():
            shutil.copy2(out_pdf, brain_dir / "PrathamOne_EduOS_20_Modules_Executive_Presentation.pdf")
        if pitch_pdf.exists():
            shutil.copy2(pitch_pdf, brain_dir / "PrathamOne_EduOS_Pitch_Deck.pdf")
        print(f"Mirrored presentation PPTX and PDF to brain directory.")


if __name__ == "__main__":
    generate_light_presentation()
