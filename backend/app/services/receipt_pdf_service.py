# /**
#  * @file        receipt_pdf_service.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.services
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     2.0.0
#  * @created     2026-11-09
#  * @updated     2026-11-11
#  *
#  * @description High-fidelity PDF generation engine and bulk export service for fee receipts strictly matching executive UI card layout with vector donut charts, metadata pills, and historical payment registers.
#  */

import io
import re
import math
import zipfile
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, date

import fitz  # PyMuPDF
import qrcode


def number_to_words_inr(num: float | int) -> str:
    """
    Converts a numeric amount in INR to formal words using the Indian numbering system.
    """
    try:
        n = int(round(float(num)))
    except (ValueError, TypeError):
        return "Rupees Zero Only"

    if n <= 0:
        return "Rupees Zero Only"

    ones = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def convert_below_thousand(val: int) -> str:
        res = []
        if val >= 100:
            res.append(f"{ones[val // 100]} Hundred")
            val %= 100
        if val >= 20:
            res.append(tens[val // 10])
            val %= 10
        if val > 0:
            res.append(ones[val])
        return " ".join(res)

    parts = []
    crores = n // 10000000
    if crores > 0:
        parts.append(f"{convert_below_thousand(crores)} Crore")
        n %= 10000000

    lakhs = n // 100000
    if lakhs > 0:
        parts.append(f"{convert_below_thousand(lakhs)} Lakh")
        n %= 100000

    thousands = n // 1000
    if thousands > 0:
        parts.append(f"{convert_below_thousand(thousands)} Thousand")
        n %= 1000

    if n > 0:
        parts.append(convert_below_thousand(n))

    words = " ".join(parts).strip()
    return f"Rupees {words} Only"


def clean_display_name(name: str) -> str:
    """
    Cleans trailing hyphens, dashes, dots, and trailing whitespace from student or parent names.
    (e.g., 'Johan -' -> 'Johan').
    """
    if not name:
        return ""
    cleaned = re.sub(r"[\s\-_]+$", "", name.strip())
    return cleaned or name.strip()


def sanitize_receipt_filename(student_name: str, receipt_number: str) -> str:
    """
    Generates a sanitized filename adhering strictly to:
    StudentName_ReceiptNo.pdf (e.g. Aarav_Sharma_RCP-2026-0001.pdf).
    Strips path traversals and invalid filesystem characters.
    """
    clean_name = re.sub(r"[^\w\s-]", "", student_name or "").strip()
    clean_name = re.sub(r"[\s]+", "_", clean_name)
    clean_name = clean_name.strip("_") or "Student"

    clean_rec = re.sub(r"[^\w-]", "_", receipt_number or "").strip()
    clean_rec = re.sub(r"_+", "_", clean_rec).strip("_") or "Receipt"
    return f"{clean_name}_{clean_rec}.pdf"


def format_display_date(d_val) -> str:
    """Formats dates as '31 Oct 2026'."""
    if not d_val:
        return "—"
    if isinstance(d_val, str):
        try:
            d_val = datetime.strptime(d_val[:10], "%Y-%m-%d").date()
        except Exception:
            return d_val
    try:
        return d_val.strftime("%d %b %Y")
    except Exception:
        return str(d_val)


def format_inr_amount(amt: float | int) -> str:
    """Formats numeric amounts with Indian thousand commas without decimals if integer."""
    try:
        val = float(amt)
        if val == int(val):
            return f"{int(val):,}"
        return f"{val:,.2f}"
    except Exception:
        return str(amt)


def draw_vector_rupee(page, pt, fontsize: float, color, bold: bool = True) -> float:
    """
    Draws a mathematical precision vector ₹ (Indian Rupee) symbol adhering
    strictly to the official Reserve Bank of India (RBI) typographical standard.
    Uses continuous vector bezier paths with round caps and round joins to guarantee
    crisp, un-distorted vector rendering across all PDF viewers and printout DPIs.
    """
    x, y = pt.x, pt.y
    h = fontsize * 0.72
    w = fontsize * 0.52
    lw = fontsize * (0.135 if bold else 0.095)
    top_y = y - h
    stem_x = x + w * 0.20
    mid_y = top_y + h * 0.28
    junction_y = top_y + h * 0.52

    shape = page.new_shape()
    # 1. Top horizontal bar (Shirorekha)
    shape.draw_line(fitz.Point(x, top_y), fitz.Point(x + w, top_y))
    # 2. Second parallel horizontal bar (aligned with loop right apex)
    shape.draw_line(fitz.Point(x, mid_y), fitz.Point(x + w * 0.84, mid_y))
    # 3. Left vertical stem
    shape.draw_line(fitz.Point(stem_x, top_y), fitz.Point(stem_x, junction_y))
    # 4. Upper loop bezier arc
    p0 = fitz.Point(stem_x, top_y)
    p1 = fitz.Point(x + w * 0.94, top_y + h * 0.03)
    p2 = fitz.Point(x + w * 0.94, junction_y - h * 0.03)
    p3 = fitz.Point(stem_x, junction_y)
    shape.draw_bezier(p0, p1, p2, p3)
    # 5. Diagonal leg extending to baseline
    shape.draw_line(fitz.Point(stem_x + lw * 0.15, junction_y), fitz.Point(x + w * 0.86, y))

    shape.finish(color=color, width=lw, lineCap=1, lineJoin=1)
    shape.commit()
    return w + fontsize * 0.10


def insert_amount_with_rupee(
    page,
    pt,
    amount_num: float | int,
    fontsize: float,
    color,
    fontname: str = "hebo",
    right_align: bool = False,
    bold: Optional[bool] = None,
) -> float:
    """
    Inserts a formatted currency value prefixed with the precision vector ₹ symbol.
    Also injects an invisible (render_mode=3) text layer for accessibility, copy-paste, and test assertions.
    """
    if bold is None:
        bold = (fontname == "hebo")

    amt_str = format_inr_amount(amount_num)
    txt_len = fitz.get_text_length(amt_str, fontname=fontname, fontsize=fontsize)
    rw = fontsize * 0.52 + fontsize * 0.10
    tot_w = rw + txt_len
    start_x = pt.x - tot_w if right_align else pt.x

    try:
        val = float(amount_num)
        page.insert_text(fitz.Point(start_x, pt.y), f"Rs. {val:,.2f}", render_mode=3)
    except Exception:
        pass

    draw_vector_rupee(page, fitz.Point(start_x, pt.y), fontsize, color, bold=bold)
    page.insert_text(fitz.Point(start_x + rw, pt.y), amt_str, fontname=fontname, fontsize=fontsize, color=color)
    return tot_w


class ReceiptPdfService:
    """
    Authoritative PDF generation engine for fee receipts.
    Builds executive UI card-style A5 portrait vouchers strictly matching official screenshots.
    Features:
    - Official Fee Receipt Ribbon with Dark Navy Chevron
    - 4-Column Metadata Pill Container
    - Student Identification & Large Amount Received Display
    - Payment Method & Reference Pill Bar
    - Fee Account Summary with Circular Donut Gauge & Legend
    - Complete Previous Payment Details (Installments) Historical Register
    - Scannable Verification QR Code, Signatures, and Micro-Governance Footers.
    """

    # Executive Color Palette matching screenshot UI
    C_DARK_NAVY = (0.04, 0.16, 0.36)      # #0A295C
    C_ROYAL_BLUE = (0.05, 0.35, 0.75)     # #0D59BF
    C_LIGHT_BLUE = (0.88, 0.94, 0.99)     # #E0F0FC
    C_CARD_BG = (1.0, 1.0, 1.0)
    C_BORDER = (0.86, 0.90, 0.94)         # #DBE6F0
    C_TEXT_DARK = (0.08, 0.12, 0.20)      # #141F33
    C_TEXT_GRAY = (0.42, 0.48, 0.55)      # #6B7B8C
    C_GREEN = (0.08, 0.65, 0.35)          # #15A659
    C_GREEN_BG = (0.90, 0.98, 0.93)       # #E6FAEE
    C_GREEN_BORDER = (0.70, 0.92, 0.78)   # #B3EBC7
    C_RED = (0.75, 0.12, 0.12)            # #BF1F1F
    C_RED_BG = (0.99, 0.92, 0.92)         # #FCEBEB
    C_RED_BORDER = (0.96, 0.75, 0.75)     # #F5BFBF

    METHOD_NAMES = {
        "cash": "Cash",
        "upi": "UPI",
        "bank_transfer": "Bank Transfer",
        "cheque": "Cheque",
        "card": "Debit/Credit Card",
        "other": "Other",
    }

    @classmethod
    def generate_receipt_pdf(
        cls,
        receipt_data: Dict[str, Any],
        institution_data: Optional[Dict[str, Any]] = None,
    ) -> bytes:
        """
        Generates binary PDF bytes for a single fee receipt strictly matching the official screenshot.
        """
        doc = fitz.open()
        # Standard A5 portrait dimensions: 420.0 x 595.0 pt
        page = doc.new_page(width=420.0, height=595.0)

        inst = institution_data or {}
        inst_name = (str(inst.get("name") or "").strip() or "PRASHANT ACADEMY").upper()
        inst_tagline = str(inst.get("tagline") or "").strip() or "Learn • Practice • Achieve"
        inst_address = str(inst.get("address") or "").strip() or "Shop No16, 14, 12, Aquarius Taurus Building, Jankalyan Nagar, Malad West"
        inst_city = str(inst.get("city") or "").strip() or "Mumbai"
        inst_state = str(inst.get("state") or "").strip() or "Maharashtra"
        inst_pincode = str(inst.get("pincode") or "").strip() or "400095"
        inst_phone = str(inst.get("phone") or "").strip() or "+91-7021789907"
        inst_email = str(inst.get("email") or "").strip() or "tejam.prashnat@gmail.com"

        # Check settings for logo, tagline, sovereign trim, and verification seal visibility
        show_logo = inst.get("print_receipt_logo", True)
        if isinstance(show_logo, str):
            show_logo = show_logo.lower().strip() in ("true", "1", "yes")

        show_tagline = inst.get("print_receipt_tagline", True)
        if isinstance(show_tagline, str):
            show_tagline = show_tagline.lower().strip() in ("true", "1", "yes")

        show_sovereign_trim = inst.get("print_sovereign_trim", False)
        if isinstance(show_sovereign_trim, str):
            show_sovereign_trim = show_sovereign_trim.lower().strip() in ("true", "1", "yes")

        show_verification_seal = inst.get("print_verification_seal", False)
        if isinstance(show_verification_seal, str):
            show_verification_seal = show_verification_seal.lower().strip() in ("true", "1", "yes")

        # 0. Outer Card Border
        page.draw_rect(fitz.Rect(8, 8, 412, 587), color=cls.C_BORDER, radius=0.03, width=0.8)

        # 0.1 Top Sovereign Navy & Gold Accent Strip (Certificate Trim - Default: False)
        if show_sovereign_trim:
            page.draw_rect(fitz.Rect(8, 8, 412, 10.5), color=cls.C_DARK_NAVY, fill=cls.C_DARK_NAVY)
            page.draw_rect(fitz.Rect(8, 10.5, 412, 11.5), color=(0.83, 0.69, 0.22), fill=(0.83, 0.69, 0.22))

        # 1. Executive Header Block (y = 16 to 62)
        # Top-Left: Executive Dual-Ring Collegiate Crest
        if show_logo:
            cx_logo, cy_logo = 36, 38
            page.draw_circle(fitz.Point(cx_logo, cy_logo), 17.5, color=cls.C_DARK_NAVY, fill=cls.C_DARK_NAVY)
            page.draw_circle(fitz.Point(cx_logo, cy_logo), 15.0, color=(0.85, 0.69, 0.22), width=0.8)
            pa_l = fitz.get_text_length("PA", fontname="hebo", fontsize=11.5)
            page.insert_text(fitz.Point(cx_logo - pa_l / 2.0, cy_logo + 4.2), "PA", fontname="hebo", fontsize=11.5, color=(1, 1, 1))
            header_text_x = 62
        else:
            header_text_x = 20

        # Center-Left: Stately Academy Wordmark & Subtitle
        page.insert_text(fitz.Point(header_text_x, 26), inst_name, fontname="hebo", fontsize=12.5, color=cls.C_DARK_NAVY)

        if show_tagline and inst_tagline:
            sub_txt = f"{inst_tagline.upper()}   •   ESTD. 2018"
        else:
            sub_txt = "CENTRE FOR ACADEMIC EXCELLENCE   •   ESTD. 2018"
        page.insert_text(fitz.Point(header_text_x, 35), sub_txt, fontname="hebo", fontsize=5.2, color=(0.10, 0.35, 0.70))

        # Center-Left: Address & Contact Lines
        addr_str = f"{inst_address}, {inst_city}, {inst_state} - {inst_pincode}".strip(", -")
        page.insert_text(fitz.Point(header_text_x, 44), addr_str[:115], fontname="helv", fontsize=5.5, color=cls.C_TEXT_GRAY)

        contact_parts = []
        if inst_phone:
            contact_parts.append(f"Phone: {inst_phone}")
        if inst_email:
            contact_parts.append(f"Email: {inst_email}")
        contact_str = "    •    ".join(contact_parts)
        page.insert_text(fitz.Point(header_text_x, 53), contact_str[:105], fontname="helv", fontsize=5.5, color=cls.C_TEXT_GRAY)

        # Top-Right: Official Institutional Verification Seal (Balances header layout - Default: False)
        if show_verification_seal:
            cx_seal, cy_seal = 372, 38
            page.draw_circle(fitz.Point(cx_seal, cy_seal), 18.0, color=(0.70, 0.78, 0.88), width=0.6)
            page.draw_circle(fitz.Point(cx_seal, cy_seal), 15.0, color=(0.80, 0.86, 0.94), width=0.5)

            s_top = "★ OFFICIAL ★"
            s_top_l = fitz.get_text_length(s_top, fontname="hebo", fontsize=3.8)
            page.insert_text(fitz.Point(cx_seal - s_top_l / 2.0, cy_seal - 7.5), s_top, fontname="hebo", fontsize=3.8, color=(0.40, 0.50, 0.65))

            s_mid = "PA"
            s_mid_l = fitz.get_text_length(s_mid, fontname="hebo", fontsize=8.5)
            page.insert_text(fitz.Point(cx_seal - s_mid_l / 2.0, cy_seal + 3.0), s_mid, fontname="hebo", fontsize=8.5, color=(0.15, 0.30, 0.55))

            s_bot = "VERIFIED"
            s_bot_l = fitz.get_text_length(s_bot, fontname="hebo", fontsize=3.8)
            page.insert_text(fitz.Point(cx_seal - s_bot_l / 2.0, cy_seal + 11.0), s_bot, fontname="hebo", fontsize=3.8, color=(0.40, 0.50, 0.65))

        # 2. Official Fee Receipt Ribbon (y = 66 to 88)
        page.draw_rect(fitz.Rect(18, 66, 402, 88), color=None, fill=cls.C_LIGHT_BLUE, radius=0.08)
        poly = [fitz.Point(18, 66), fitz.Point(184, 66), fitz.Point(164, 88), fitz.Point(18, 88)]
        page.draw_polyline(poly, color=cls.C_DARK_NAVY, fill=cls.C_DARK_NAVY, closePath=True)
        page.insert_text(fitz.Point(26, 80), "OFFICIAL FEE PAYMENT RECEIPT", fontname="hebo", fontsize=7.8, color=(1, 1, 1))

        rec_num = str(receipt_data.get("receipt_number") or "RCP-2026-0001")
        rec_txt = f"RECEIPT NO.  {rec_num}"
        rec_len = fitz.get_text_length(rec_txt, fontname="hebo", fontsize=8.5)
        page.insert_text(fitz.Point(392 - rec_len, 80), rec_txt, fontname="hebo", fontsize=8.5, color=cls.C_DARK_NAVY)

        # 3. Metadata 4-Pill Bar (y = 96 to 122)
        page.draw_rect(fitz.Rect(18, 96, 402, 122), color=cls.C_BORDER, fill=(0.985, 0.99, 1.0), radius=0.08, width=0.5)

        # Payment Date
        page.insert_text(fitz.Point(28, 107), "PAYMENT DATE", fontname="hebo", fontsize=5.2, color=cls.C_TEXT_GRAY)
        disp_date = format_display_date(receipt_data.get("payment_date"))
        page.insert_text(fitz.Point(28, 117), disp_date, fontname="hebo", fontsize=7.2, color=cls.C_TEXT_DARK)

        # Academic Year
        page.insert_text(fitz.Point(120, 107), "ACADEMIC YEAR", fontname="hebo", fontsize=5.2, color=cls.C_TEXT_GRAY)
        ay_str = str(receipt_data.get("academic_year") or "2026-27")
        if " " in ay_str:
            ay_str = ay_str.replace(" ", "")
        page.insert_text(fitz.Point(120, 117), ay_str, fontname="hebo", fontsize=7.2, color=cls.C_TEXT_DARK)

        # Invoice Ref
        page.insert_text(fitz.Point(210, 107), "INVOICE REF.", fontname="hebo", fontsize=5.2, color=cls.C_TEXT_GRAY)
        inv_ref = str(receipt_data.get("invoice_number") or "INV-2026-0001")
        page.insert_text(fitz.Point(210, 117), inv_ref, fontname="hebo", fontsize=7.2, color=cls.C_TEXT_DARK)

        # Status Badge Pill & Watermarks
        is_voided = bool(receipt_data.get("is_reversed") or receipt_data.get("receipt_status") == "voided")
        is_superseded = bool(receipt_data.get("is_superseded") or receipt_data.get("receipt_status") == "superseded")

        if is_voided:
            paid_pill = fitz.Rect(275, 103, 396, 117)
            page.draw_rect(paid_pill, color=cls.C_RED, fill=cls.C_RED_BG, radius=0.3, width=0.8)
            page.insert_text(fitz.Point(281, 113.5), "✕  STATUS: CANCELLED / VOID", fontname="hebo", fontsize=6.2, color=cls.C_RED)
            page.insert_text(fitz.Point(60, 380), "VOID / CANCELLED", fontname="hebo", fontsize=34, color=(0.94, 0.50, 0.50), morph=(fitz.Point(60, 380), fitz.Matrix(-25)))
        elif is_superseded:
            paid_pill = fitz.Rect(285, 103, 396, 117)
            page.draw_rect(paid_pill, color=(0.85, 0.50, 0.20), fill=(1.0, 0.95, 0.88), radius=0.3, width=0.8)
            page.insert_text(fitz.Point(292, 113.5), "⚠  STATUS: SUPERSEDED", fontname="hebo", fontsize=6.2, color=(0.85, 0.50, 0.20))
            page.insert_text(fitz.Point(85, 380), "SUPERSEDED", fontname="hebo", fontsize=40, color=(0.90, 0.65, 0.35), morph=(fitz.Point(85, 380), fitz.Matrix(-25)))
        else:
            paid_pill = fitz.Rect(340, 103, 394, 117)
            page.draw_rect(paid_pill, color=cls.C_GREEN, fill=cls.C_GREEN_BG, radius=0.3, width=0.8)
            page.insert_text(fitz.Point(348, 113.5), "✓  PAID", fontname="hebo", fontsize=7.2, color=cls.C_GREEN)

        # 4. Student Details & Amount Received Box (y = 128 to 184)
        page.draw_rect(fitz.Rect(18, 128, 402, 184), color=cls.C_BORDER, fill=(1, 1, 1), radius=0.08, width=0.5)
        page.draw_line(fitz.Point(240, 134), fitz.Point(240, 178), color=(0.92, 0.94, 0.96), width=0.5)

        # Left Column: Student Details
        page.draw_circle(fitz.Point(38, 154), 13, color=(0.88, 0.92, 0.96), fill=(0.94, 0.96, 0.99))
        page.insert_text(fitz.Point(34, 157), "👤", fontname="helv", fontsize=9)
        page.insert_text(fitz.Point(58, 142), "STUDENT DETAILS", fontname="hebo", fontsize=5.5, color=cls.C_TEXT_GRAY)

        raw_student_name = str(receipt_data.get("student_name") or "Student")
        st_name = clean_display_name(raw_student_name)
        page.insert_text(fitz.Point(58, 155), st_name[:30], fontname="hebo", fontsize=13, color=cls.C_TEXT_DARK)

        adm_num = str(receipt_data.get("admission_number") or "—")
        page.insert_text(fitz.Point(58, 166), f"Admission No. {adm_num}", fontname="helv", fontsize=6.8, color=cls.C_TEXT_GRAY)

        std_raw = str(receipt_data.get("standard") or "—")
        clean_std = re.sub(r"^(?:Class|Standard|Std\.?)\s*", "", std_raw, flags=re.IGNORECASE).strip() or std_raw
        board_val = str(receipt_data.get("board") or "").strip()
        if board_val and board_val.lower() not in ("—", "none", "") and board_val.lower() not in clean_std.lower():
            display_class = f"{clean_std} ({board_val})"
        else:
            display_class = clean_std

        batch_val = str(receipt_data.get("division") or receipt_data.get("batch") or "—")
        page.insert_text(fitz.Point(58, 177), f"Class: {display_class}    Batch: {batch_val}"[:44], fontname="hebo", fontsize=6.8, color=cls.C_TEXT_DARK)

        # Right Column: Amount Received
        page.insert_text(fitz.Point(252, 142), "AMOUNT RECEIVED", fontname="hebo", fontsize=5.5, color=cls.C_TEXT_GRAY)
        amt_val = float(receipt_data.get("amount") or 0.0)
        insert_amount_with_rupee(page, fitz.Point(252, 162), amt_val, fontsize=17, color=cls.C_ROYAL_BLUE)
        in_words = number_to_words_inr(amt_val)
        page.insert_text(fitz.Point(252, 174), in_words[:50], fontname="helv", fontsize=6.8, color=cls.C_TEXT_GRAY)

        # 5. Payment Method & Transaction Ref Bar (y = 190 to 208)
        page.draw_rect(fitz.Rect(18, 190, 402, 208), color=cls.C_BORDER, fill=cls.C_LIGHT_BLUE, radius=0.15, width=0.4)
        raw_method = str(receipt_data.get("payment_method") or "cash").lower()
        method_label = cls.METHOD_NAMES.get(raw_method, raw_method.upper())
        page.insert_text(fitz.Point(26, 202), "Payment Method: ", fontname="helv", fontsize=6.8, color=cls.C_TEXT_GRAY)
        page.insert_text(fitz.Point(84, 202), method_label, fontname="hebo", fontsize=6.8, color=cls.C_TEXT_DARK)

        page.draw_line(fitz.Point(210, 194), fitz.Point(210, 204), color=(0.80, 0.86, 0.92), width=0.5)

        txn_ref = str(
            receipt_data.get("transaction_reference")
            or receipt_data.get("cheque_number")
            or receipt_data.get("invoice_number")
            or "Direct Voucher"
        )
        page.insert_text(fitz.Point(224, 202), "Transaction Ref: ", fontname="helv", fontsize=6.8, color=cls.C_TEXT_GRAY)
        page.insert_text(fitz.Point(284, 202), txn_ref[:30], fontname="hebo", fontsize=6.8, color=cls.C_TEXT_DARK)

        # 6. Fee Account Summary Box (y = 216 to 324)
        tab_poly = [fitz.Point(18, 216), fitz.Point(135, 216), fitz.Point(122, 230), fitz.Point(18, 230)]
        page.draw_polyline(tab_poly, color=cls.C_DARK_NAVY, fill=cls.C_DARK_NAVY, closePath=True)
        page.insert_text(fitz.Point(26, 226), "FEE ACCOUNT SUMMARY", fontname="hebo", fontsize=6.5, color=(1, 1, 1))

        page.draw_rect(fitz.Rect(18, 230, 402, 324), color=cls.C_BORDER, fill=(1, 1, 1), radius=0.08, width=0.5)

        fee_sum = receipt_data.get("fee_summary") or {}
        tot_fee = float(fee_sum.get("total_fee_amount") or receipt_data.get("total_fees") or amt_val)
        prev_paid = float(fee_sum.get("previous_payments_total") or receipt_data.get("previous_paid") or 0.0)
        curr_paid = float(fee_sum.get("current_payment_amount") or amt_val)
        tot_paid = float(fee_sum.get("total_paid_to_date") or receipt_data.get("total_paid") or (prev_paid + curr_paid))
        out_bal = float(fee_sum.get("outstanding_balance") or receipt_data.get("outstanding_after") or max(0.0, tot_fee - tot_paid))

        historical_payments = receipt_data.get("historical_payments") or []
        prev_count = len(historical_payments)

        # Left Side Rows
        conc_val = float(receipt_data.get("concession_amount") or 0.0)
        gross_val = float(receipt_data.get("gross_fee") or (tot_fee + conc_val))
        if conc_val > 0 and gross_val > tot_fee:
            page.insert_text(fitz.Point(26, 246), f"Net Payable (Gross Rs.{int(round(gross_val)):,} - Benefit Rs.{int(round(conc_val)):,})", fontname="helv", fontsize=6.2, color=cls.C_TEXT_GRAY)
        else:
            page.insert_text(fitz.Point(26, 246), "Total Fee (Current AY)", fontname="helv", fontsize=7.0, color=cls.C_TEXT_GRAY)
        insert_amount_with_rupee(page, fitz.Point(232, 246), tot_fee, fontsize=7.2, color=cls.C_TEXT_DARK, right_align=True)

        page.insert_text(fitz.Point(26, 260), f"Previous Paid ({prev_count})", fontname="helv", fontsize=7.0, color=cls.C_TEXT_GRAY)
        insert_amount_with_rupee(page, fitz.Point(232, 260), prev_paid, fontsize=7.2, color=cls.C_TEXT_DARK, right_align=True)

        page.insert_text(fitz.Point(26, 274), "Current Paid", fontname="helv", fontsize=7.0, color=cls.C_TEXT_GRAY)
        insert_amount_with_rupee(page, fitz.Point(232, 274), curr_paid, fontsize=7.2, color=cls.C_TEXT_DARK, right_align=True)

        # Highlight Row: Total Paid to Date
        page.draw_rect(fitz.Rect(24, 282, 236, 298), color=cls.C_GREEN_BORDER, fill=cls.C_GREEN_BG, radius=0.15, width=0.5)
        page.insert_text(fitz.Point(30, 293), "Total Paid to Date", fontname="hebo", fontsize=7.2, color=cls.C_GREEN)
        insert_amount_with_rupee(page, fitz.Point(232, 293), tot_paid, fontsize=7.5, color=cls.C_GREEN, right_align=True)

        # Highlight Row: Outstanding Balance
        page.draw_rect(fitz.Rect(24, 303, 236, 319), color=cls.C_RED_BORDER, fill=cls.C_RED_BG, radius=0.15, width=0.5)
        page.insert_text(fitz.Point(30, 314), "Outstanding Balance", fontname="hebo", fontsize=7.2, color=cls.C_RED)
        insert_amount_with_rupee(page, fitz.Point(232, 314), out_bal, fontsize=7.5, color=cls.C_RED, right_align=True)

        # Right Side Donut Chart (cx=318, cy=266)
        cx, cy = 318, 266
        page.draw_circle(fitz.Point(cx, cy), 22, color=(0.92, 0.94, 0.96), width=5)
        pct = (tot_paid / tot_fee) if tot_fee > 0 else 1.0
        pct = min(1.0, max(0.0, pct))
        steps = max(2, int(pct * 60))
        pts = [
            fitz.Point(
                cx + 22 * math.cos(-math.pi / 2 + i * (2 * math.pi * pct / steps)),
                cy + 22 * math.sin(-math.pi / 2 + i * (2 * math.pi * pct / steps)),
            )
            for i in range(steps + 1)
        ]
        for i in range(len(pts) - 1):
            page.draw_line(pts[i], pts[i + 1], color=cls.C_GREEN, width=5)

        p_str = f"{int(round(pct * 100))}%"
        p_l = fitz.get_text_length(p_str, fontname="hebo", fontsize=10.5)
        page.insert_text(fitz.Point(cx - p_l / 2.0, cy + 2), p_str, fontname="hebo", fontsize=10.5, color=cls.C_TEXT_DARK)
        pd_l = fitz.get_text_length("Paid", fontname="helv", fontsize=6.2)
        page.insert_text(fitz.Point(cx - pd_l / 2.0, cy + 9), "Paid", fontname="helv", fontsize=6.2, color=cls.C_TEXT_GRAY)

        # Chart Legend below
        page.draw_rect(fitz.Rect(266, 306, 272, 312), color=cls.C_GREEN, fill=cls.C_GREEN)
        page.insert_text(fitz.Point(276, 311.5), "Paid: ", fontname="helv", fontsize=5.8, color=cls.C_TEXT_GRAY)
        insert_amount_with_rupee(page, fitz.Point(294, 311.5), tot_paid, fontsize=5.8, color=cls.C_TEXT_DARK)

        page.draw_rect(fitz.Rect(334, 306, 340, 312), color=cls.C_BORDER, fill=(0.80, 0.84, 0.88))
        page.insert_text(fitz.Point(344, 311.5), "Balance: ", fontname="helv", fontsize=5.8, color=cls.C_TEXT_GRAY)
        insert_amount_with_rupee(page, fitz.Point(372, 311.5), out_bal, fontsize=5.8, color=cls.C_TEXT_DARK)

        # 7. Previous Payment Details (Installments) Table (y = 332 to dynamic bottom)
        ledger_entries = receipt_data.get("all_installments") or historical_payments
        use_all_installments = bool(receipt_data.get("all_installments"))
        entry_count = len(ledger_entries)

        table_title = "PAYMENT INSTALLMENTS HISTORY (TO DATE)" if use_all_installments else "PREVIOUS PAYMENT DETAILS (INSTALLMENTS)"
        page.insert_text(fitz.Point(26, 342), table_title, fontname="hebo", fontsize=7.2, color=cls.C_DARK_NAVY)
        cnt_str = f"{entry_count} Installment{'s' if entry_count != 1 else ''}"
        cnt_l = fitz.get_text_length(cnt_str, fontname="helv", fontsize=6.5)
        page.insert_text(fitz.Point(402 - cnt_l, 342), cnt_str, fontname="helv", fontsize=6.5, color=cls.C_TEXT_GRAY)

        # Dynamic table row height based on number of payments
        total_entries = len(ledger_entries) if ledger_entries else 0
        row_count = max(1, min(total_entries, 12)) if total_entries > 0 else 1
        if row_count > 8:
            row_h = 10.5
            font_size_row = 6.0
        elif row_count > 5:
            row_h = 11.5
            font_size_row = 6.3
        elif row_count > 3:
            row_h = 12.8
            font_size_row = 6.6
        else:
            row_h = 15.0
            font_size_row = 6.8

        tbl_header_h = 15.0
        tbl_total_row_h = 15.0
        tbl_h = tbl_header_h + (row_count * row_h) + tbl_total_row_h
        tbl_top = 348.0
        tbl_bottom = tbl_top + tbl_h

        page.draw_rect(fitz.Rect(18, tbl_top, 402, tbl_bottom), color=cls.C_BORDER, fill=(1, 1, 1), radius=0.08, width=0.5)

        # Header Row
        page.draw_rect(fitz.Rect(18, tbl_top, 402, tbl_top + tbl_header_h), color=cls.C_BORDER, fill=cls.C_LIGHT_BLUE, width=0.5)
        page.insert_text(fitz.Point(26, tbl_top + 10.5), "#", fontname="hebo", fontsize=6.5, color=cls.C_DARK_NAVY)
        page.insert_text(fitz.Point(44, tbl_top + 10.5), "DATE", fontname="hebo", fontsize=6.5, color=cls.C_DARK_NAVY)
        page.insert_text(fitz.Point(120, tbl_top + 10.5), "RECEIPT NO.", fontname="hebo", fontsize=6.5, color=cls.C_DARK_NAVY)
        page.insert_text(fitz.Point(210, tbl_top + 10.5), "PAYMENT METHOD", fontname="hebo", fontsize=6.5, color=cls.C_DARK_NAVY)
        a_l = fitz.get_text_length("AMOUNT", fontname="hebo", fontsize=6.5)
        page.insert_text(fitz.Point(392 - a_l, tbl_top + 10.5), "AMOUNT", fontname="hebo", fontsize=6.5, color=cls.C_DARK_NAVY)

        # Data Rows
        if ledger_entries:
            for idx, hp in enumerate(ledger_entries[:12], start=1):
                ry = tbl_top + tbl_header_h + (idx - 1) * row_h
                page.draw_line(fitz.Point(18, ry), fitz.Point(402, ry), color=(0.93, 0.95, 0.97), width=0.5)
                is_curr = bool(hp.get("is_current_receipt") or hp.get("receipt_number") == rec_num)

                num_col = cls.C_ROYAL_BLUE if is_curr else cls.C_TEXT_DARK
                page.insert_text(fitz.Point(26, ry + row_h - 3.5), str(idx), fontname="hebo" if is_curr else "helv", fontsize=font_size_row, color=num_col)
                hp_date = format_display_date(hp.get("date"))
                page.insert_text(fitz.Point(44, ry + row_h - 3.5), hp_date, fontname="hebo" if is_curr else "helv", fontsize=font_size_row, color=num_col)

                hp_rec = str(hp.get("receipt_number") or f"RCP-HIST-{idx}")
                if is_curr:
                    page.insert_text(fitz.Point(120, ry + row_h - 3.5), f"{hp_rec} ★", fontname="hebo", fontsize=font_size_row, color=cls.C_ROYAL_BLUE)
                else:
                    page.insert_text(fitz.Point(120, ry + row_h - 3.5), hp_rec, fontname="hebo", fontsize=font_size_row, color=cls.C_ROYAL_BLUE)

                hp_met = cls.METHOD_NAMES.get(str(hp.get("payment_method") or "cash").lower(), str(hp.get("payment_method") or "Cash").capitalize())
                page.insert_text(fitz.Point(210, ry + row_h - 3.5), hp_met, fontname="helv", fontsize=font_size_row, color=cls.C_TEXT_DARK)
                hp_amt = float(hp.get("amount") or 0.0)
                insert_amount_with_rupee(page, fitz.Point(392, ry + row_h - 3.5), hp_amt, fontsize=font_size_row, color=cls.C_ROYAL_BLUE if is_curr else cls.C_TEXT_DARK, right_align=True, bold=is_curr)
        else:
            ry = tbl_top + tbl_header_h
            page.draw_line(fitz.Point(18, ry), fitz.Point(402, ry), color=(0.93, 0.95, 0.97), width=0.5)
            msg = "No prior recorded installments. This is the first payment installment."
            page.insert_text(fitz.Point(26, ry + 11), msg, fontname="helv", fontsize=6.5, color=cls.C_TEXT_GRAY)

        # Total Row at bottom of table
        tot_ry = tbl_bottom - tbl_total_row_h
        page.draw_rect(fitz.Rect(18, tot_ry, 402, tbl_bottom), color=cls.C_BORDER, fill=(0.98, 0.99, 1.0), width=0.5)
        tot_label = "Total Installments Paid:" if use_all_installments else "Previous Payments Total:"
        tot_display_amount = tot_paid if use_all_installments else prev_paid
        page.insert_text(fitz.Point(220, tot_ry + 10), tot_label, fontname="hebo", fontsize=6.8, color=cls.C_TEXT_DARK)
        insert_amount_with_rupee(page, fitz.Point(392, tot_ry + 10), tot_display_amount, fontsize=7.2, color=cls.C_TEXT_DARK, right_align=True)

        # 8. Footer Section (positioned relative to tbl_bottom)
        footer_top = max(432.0, tbl_bottom + 10.0)
        qr = qrcode.QRCode(box_size=2, border=0)
        qr_payload = (
            f"PRATHAMONE-VERIFY:REC={rec_num};"
            f"STUDENT={adm_num};"
            f"AMT={amt_val};DATE={receipt_data.get('payment_date')}"
        )
        qr.add_data(qr_payload)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        img_bytes = io.BytesIO()
        img.save(img_bytes, format="PNG")
        page.insert_image(fitz.Rect(22, footer_top + 4, 68, footer_top + 50), stream=img_bytes.getvalue())

        page.insert_text(fitz.Point(76, footer_top + 12), "Thank you for your payment.", fontname="hebo", fontsize=7.2, color=cls.C_TEXT_DARK)
        page.insert_text(fitz.Point(76, footer_top + 21), "This is a computer-generated receipt and does not require a physical signature.", fontname="helv", fontsize=5.5, color=cls.C_TEXT_GRAY)
        page.insert_text(fitz.Point(76, footer_top + 29), "For any queries, contact the academy office.", fontname="helv", fontsize=5.5, color=cls.C_TEXT_GRAY)

        # Signature flourish on right
        sig_base_y = footer_top + 22
        sig_pts = [
            fitz.Point(290, sig_base_y + 4), fitz.Point(305, sig_base_y - 6), fitz.Point(315, sig_base_y + 6),
            fitz.Point(330, sig_base_y - 10), fitz.Point(345, sig_base_y), fitz.Point(365, sig_base_y - 4)
        ]
        for i in range(len(sig_pts) - 1):
            page.draw_line(sig_pts[i], sig_pts[i + 1], color=(0.15, 0.20, 0.30), width=0.8)

        as_txt = "AUTHORIZED SIGNATORY"
        as_l = fitz.get_text_length(as_txt, fontname="hebo", fontsize=6.8)
        page.insert_text(fitz.Point(335 - as_l / 2.0, sig_base_y + 16), as_txt, fontname="hebo", fontsize=6.8, color=cls.C_TEXT_DARK)

        ao_txt = "Accounts Officer"
        ao_l = fitz.get_text_length(ao_txt, fontname="helv", fontsize=5.8)
        page.insert_text(fitz.Point(335 - ao_l / 2.0, sig_base_y + 24), ao_txt, fontname="helv", fontsize=5.8, color=cls.C_TEXT_GRAY)

        # Royal Blue horizontal line (Pinned at absolute bottom margin)
        div_y = max(560.0, footer_top + 56.0)
        page.draw_line(fitz.Point(18, div_y), fitz.Point(402, div_y), color=cls.C_ROYAL_BLUE, width=1.5)

        # Single-Row Distributed Micro Footer:
        # Left: Official Fee Voucher & Document ID
        # Center: Neutral Pagination
        # Right: Understated Software Branding
        f_baseline_y = div_y + 13.0

        left_txt = f"Official Fee Voucher  •  Doc ID: DOC-REC-{rec_num}"
        page.insert_text(fitz.Point(18, f_baseline_y), left_txt, fontname="helv", fontsize=5.6, color=cls.C_TEXT_GRAY)

        center_txt = "Page 1 of 1"
        c_l = fitz.get_text_length(center_txt, fontname="helv", fontsize=5.6)
        page.insert_text(fitz.Point((420.0 - c_l) / 2.0, f_baseline_y), center_txt, fontname="helv", fontsize=5.6, color=cls.C_TEXT_GRAY)

        show_branding = institution_data.get("print_software_branding", True) if institution_data else True
        if show_branding:
            brand_txt = "PrathamOne EduOS  •  prathamone.com"
            b_l = fitz.get_text_length(brand_txt, fontname="helv", fontsize=5.2)
            page.insert_text(fitz.Point(402.0 - b_l, f_baseline_y), brand_txt, fontname="helv", fontsize=5.2, color=(0.58, 0.64, 0.72))

        return doc.tobytes()

    @classmethod
    def generate_bulk_receipts_zip(
        cls,
        receipt_items: List[Tuple[Dict[str, Any], Optional[Dict[str, Any]]]],
    ) -> bytes:
        """
        Generates individual PDFs for each receipt in receipt_items and packs them
        into a zip archive adhering to StudentName_ReceiptNo.pdf naming.
        """
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            used_filenames = set()
            for r_data, inst_data in receipt_items:
                pdf_bytes = cls.generate_receipt_pdf(r_data, inst_data)
                student_name = r_data.get("student_name") or "Student"
                receipt_number = r_data.get("receipt_number") or "Receipt"

                base_name = sanitize_receipt_filename(student_name, receipt_number)
                filename = base_name

                # Avoid duplicate names within the zip
                suffix = 1
                while filename in used_filenames:
                    name_part, ext = base_name.rsplit(".", 1)
                    filename = f"{name_part}_{suffix}.{ext}"
                    suffix += 1

                used_filenames.add(filename)
                zf.writestr(filename, pdf_bytes)

        return zip_buffer.getvalue()
