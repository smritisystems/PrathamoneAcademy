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
#  * @version     1.0.0
#  * @created     2026-11-09
#  * @updated     2026-11-09
#  *
#  * @description High-fidelity PDF generation engine and bulk export service for fee receipts using PyMuPDF.
#  */

import io
import re
import zipfile
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime

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


class ReceiptPdfService:
    """
    Authoritative PDF generation engine for fee receipts.
    Builds premium vector A5 portrait vouchers with dynamic institution headers,
    authoritative 'PA' Text Monogram Crest, complete student and transaction metadata matrix,
    financial allocation tables, mathematical ledger reconciliation summary,
    verification QR codes, official digital audit seal, and canonical governance footers.
    """

    # Executive Color Palette
    C_ROYAL = (0.04, 0.12, 0.28)      # Deep Royal Navy (#0A1F47)
    C_NAVY = (0.07, 0.16, 0.34)       # Rich Navy (#122E61)
    C_GOLD = (0.83, 0.62, 0.16)       # Warm Metallic Gold (#D49E29)
    C_GOLD_LIGHT = (0.98, 0.96, 0.90) # Faint Gold Tint
    C_SLATE = (0.35, 0.42, 0.50)      # Secondary Field Labels (#596B80)
    C_DARK = (0.10, 0.13, 0.18)       # Primary Charcoal Text (#1A212E)
    C_LIGHT = (0.96, 0.97, 0.99)      # Executive Tint Background (#F5F7FC)
    C_BORDER = (0.80, 0.84, 0.88)     # Boundary Lines
    C_GREEN = (0.04, 0.52, 0.24)      # Rich Emerald Green
    C_GREEN_BG = (0.92, 0.98, 0.94)   # Soft Green Tint
    C_RED = (0.76, 0.12, 0.12)        # Crimson Red
    C_RED_BG = (0.99, 0.94, 0.94)     # Soft Red Tint
    C_AMBER = (0.75, 0.45, 0.05)      # Amber

    METHOD_NAMES = {
        "cash": "Cash",
        "upi": "UPI (Digital)",
        "bank_transfer": "Bank Transfer (NEFT/RTGS/IMPS)",
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
        Generates binary PDF bytes for a single fee receipt in premium executive voucher format.
        """
        doc = fitz.open()
        # Standard A5 portrait dimensions: 420.0 x 595.0 pt
        page = doc.new_page(width=420.0, height=595.0)

        inst = institution_data or {}
        inst_name = (inst.get("name") or "PRASHANT ACADEMY").upper()
        inst_tagline = inst.get("tagline") or "Premier Coaching Institute for Academic & Competitive Excellence"
        inst_address = inst.get("address") or "Shop No16, 14, 12, Aquarius Taurus Building, Jankalyan Nagar, Malad West"
        inst_city = inst.get("city") or "Mumbai"
        inst_state = inst.get("state") or "Maharashtra"
        inst_pincode = inst.get("pincode") or "400095"
        inst_phone = inst.get("phone") or "+91-7021789907"
        inst_email = inst.get("email") or "tejam.prashnat@gmail.com"
        inst_tax_id = inst.get("tax_id") or "AABCP1234K"

        # 1. Luxury Double Security Border (Royal Navy Outer + Metallic Gold Inner)
        page.draw_rect(fitz.Rect(12, 12, 408, 583), color=cls.C_ROYAL, width=1.0)
        page.draw_rect(fitz.Rect(15, 15, 405, 580), color=cls.C_GOLD, width=0.5)
        # Corner security rosettes
        for cx, cy in [(15, 15), (405, 15), (15, 580), (405, 580)]:
            page.draw_circle(fitz.Point(cx, cy), 1.5, color=cls.C_GOLD, fill=cls.C_GOLD)

        # Check settings for Logo and Tagline visibility
        raw_logo_flag = inst.get("print_receipt_logo")
        if raw_logo_flag is None:
            show_logo = True
        elif isinstance(raw_logo_flag, bool):
            show_logo = raw_logo_flag
        else:
            show_logo = str(raw_logo_flag).lower().strip() not in ("false", "0", "no", "hide")

        raw_tagline_flag = inst.get("print_receipt_tagline")
        if raw_tagline_flag is None:
            show_tagline = True
        elif isinstance(raw_tagline_flag, bool):
            show_tagline = raw_tagline_flag
        else:
            show_tagline = str(raw_tagline_flag).lower().strip() not in ("false", "0", "no", "hide")

        # 2. Institutional Header Block (y = 16 to 74)
        page.draw_rect(fitz.Rect(16, 16, 404, 74), color=cls.C_LIGHT, fill=cls.C_LIGHT)
        page.draw_line(fitz.Point(16, 74), fitz.Point(404, 74), color=cls.C_BORDER, width=0.8)

        text_x = 74 if show_logo else 24

        if show_logo:
            # Vector Text Logo "PA" Monogram Crest (46x46 pt at x=22, y=21 to x=68, y=67)
            page.draw_rect(fitz.Rect(22, 21, 68, 67), color=cls.C_GOLD, fill=cls.C_ROYAL, width=1.0)
            page.draw_rect(fitz.Rect(24, 23, 66, 65), color=cls.C_GOLD, width=0.5)
            # Bold "PA" Monogram centered horizontally
            pa_len = fitz.get_text_length("PA", fontname="hebo", fontsize=18)
            page.insert_text(fitz.Point((22 + 68 - pa_len) / 2.0, 48), "PA", fontname="hebo", fontsize=18, color=(1, 1, 1))
            # Gold Subtitle inside Crest Badge
            estd_len = fitz.get_text_length("ESTD 2024", fontname="hebo", fontsize=4.6)
            page.insert_text(fitz.Point((22 + 68 - estd_len) / 2.0, 58), "ESTD 2024", fontname="hebo", fontsize=4.6, color=cls.C_GOLD)

        # Institute Name and Information
        name_y = 31 if show_tagline else 34
        page.insert_text(fitz.Point(text_x, name_y), inst_name, fontname="hebo", fontsize=11.5, color=cls.C_ROYAL)

        if show_tagline and inst_tagline:
            page.insert_text(fitz.Point(text_x, 43), inst_tagline, fontname="hebo", fontsize=7.2, color=cls.C_GOLD)
            addr_y = 53
            contact_y = 63
        else:
            addr_y = 48
            contact_y = 60

        addr_str = f"{inst_address}, {inst_city}, {inst_state} - {inst_pincode}".strip(", -")
        page.insert_text(fitz.Point(text_x, addr_y), addr_str[:115 if not show_logo else 105], fontname="helv", fontsize=6.6, color=cls.C_SLATE)

        contact_parts = []
        if inst_phone:
            contact_parts.append(f"Phone: {inst_phone}")
        if inst_email:
            contact_parts.append(f"Email: {inst_email}")
        if inst_tax_id:
            contact_parts.append(f"GSTIN / Tax ID: {inst_tax_id}")
        contact_str = " | ".join(contact_parts)
        page.insert_text(fitz.Point(text_x, contact_y), contact_str[:115 if not show_logo else 105], fontname="helv", fontsize=6.6, color=cls.C_SLATE)

        # 3. Document Title Ribbon & Status Badge (y = 74 to 92)
        page.draw_rect(fitz.Rect(16, 74, 404, 92), color=cls.C_ROYAL, fill=cls.C_ROYAL)
        page.draw_line(fitz.Point(16, 92), fitz.Point(404, 92), color=cls.C_GOLD, width=1.0)
        page.insert_text(fitz.Point(24, 86), "OFFICIAL FEE PAYMENT RECEIPT", fontname="hebo", fontsize=8.5, color=(1, 1, 1))

        # Status badge
        is_voided = bool(receipt_data.get("is_reversed") or receipt_data.get("receipt_status") == "voided")
        is_superseded = bool(receipt_data.get("is_superseded") or receipt_data.get("receipt_status") == "superseded")
        reprint_count = int(receipt_data.get("reprint_count") or 0)

        if is_voided:
            badge_text = "STATUS: CANCELLED / VOID"
            badge_color = (1.0, 0.4, 0.4)
        elif is_superseded:
            badge_text = "STATUS: SUPERSEDED"
            badge_color = (1.0, 0.75, 0.3)
        else:
            badge_text = "STATUS: VALID / POSTED"
            badge_color = (0.45, 0.95, 0.55)

        b_len = fitz.get_text_length(badge_text, fontname="hebo", fontsize=7.5)
        page.insert_text(fitz.Point(396 - b_len, 86), badge_text, fontname="hebo", fontsize=7.5, color=badge_color)

        # 4. Student & Receipt Metadata Block (y = 96 to 166)
        page.draw_rect(fitz.Rect(20, 96, 400, 166), color=cls.C_BORDER, fill=(0.99, 0.99, 1.0), width=0.5)
        page.draw_line(fitz.Point(210, 96), fitz.Point(210, 166), color=cls.C_BORDER, width=0.5)

        # Left Column: Student Details
        page.insert_text(fitz.Point(26, 107), "STUDENT IDENTIFICATION", fontname="hebo", fontsize=6.8, color=cls.C_ROYAL)
        
        # Student Name (Cleaned)
        page.insert_text(fitz.Point(26, 118), "Student Name:", fontname="helv", fontsize=7.0, color=cls.C_SLATE)
        cleaned_st_name = clean_display_name(str(receipt_data.get("student_name") or "—"))
        page.insert_text(fitz.Point(86, 118), cleaned_st_name[:32], fontname="hebo", fontsize=7.8, color=cls.C_DARK)

        # Admission No
        page.insert_text(fitz.Point(26, 129), "Admission No:", fontname="helv", fontsize=7.0, color=cls.C_SLATE)
        adm_no = str(receipt_data.get("admission_number") or "—")
        page.insert_text(fitz.Point(86, 129), adm_no[:32], fontname="hebo", fontsize=7.2, color=cls.C_DARK)

        # Roll Number
        page.insert_text(fitz.Point(26, 140), "Roll Number:", fontname="helv", fontsize=7.0, color=cls.C_SLATE)
        roll_no = str(receipt_data.get("roll_number") or "—").strip()
        page.insert_text(fitz.Point(86, 140), roll_no[:24], fontname="hebo", fontsize=7.2, color=cls.C_DARK)

        # Class / Standard & Batch
        page.insert_text(fitz.Point(26, 151), "Class / Batch:", fontname="helv", fontsize=7.0, color=cls.C_SLATE)
        std_name = str(receipt_data.get("standard") or "—")
        batch_name = str(receipt_data.get("division") or receipt_data.get("batch") or "—")
        std_div = f"{std_name} · {batch_name}"
        page.insert_text(fitz.Point(86, 151), std_div[:34], fontname="helv", fontsize=7.0, color=cls.C_DARK)

        # Board & Academic Year
        page.insert_text(fitz.Point(26, 162), "Board & Year:", fontname="helv", fontsize=7.0, color=cls.C_SLATE)
        board_val = str(receipt_data.get("board") or "ICSE")
        ay_val = str(receipt_data.get("academic_year") or "2026 – 2027")
        page.insert_text(fitz.Point(86, 162), f"{board_val} · AY {ay_val}"[:34], fontname="helv", fontsize=7.0, color=cls.C_DARK)

        # Right Column: Receipt Details
        page.insert_text(fitz.Point(216, 107), "TRANSACTION METADATA", fontname="hebo", fontsize=6.8, color=cls.C_ROYAL)
        
        # Receipt Number
        page.insert_text(fitz.Point(216, 118), "Receipt Number:", fontname="helv", fontsize=7.0, color=cls.C_SLATE)
        page.insert_text(fitz.Point(282, 118), str(receipt_data.get("receipt_number") or "—"), fontname="hebo", fontsize=7.8, color=cls.C_ROYAL)

        # Invoice Reference
        page.insert_text(fitz.Point(216, 129), "Invoice Ref:", fontname="helv", fontsize=7.0, color=cls.C_SLATE)
        page.insert_text(fitz.Point(282, 129), str(receipt_data.get("invoice_number") or "—")[:24], fontname="hebo", fontsize=7.0, color=cls.C_DARK)

        # Payment Date
        page.insert_text(fitz.Point(216, 140), "Payment Date:", fontname="helv", fontsize=7.0, color=cls.C_SLATE)
        page.insert_text(fitz.Point(282, 140), str(receipt_data.get("payment_date") or "—"), fontname="helv", fontsize=7.2, color=cls.C_DARK)

        # Payment Mode
        page.insert_text(fitz.Point(216, 151), "Payment Mode:", fontname="helv", fontsize=7.0, color=cls.C_SLATE)
        raw_method = str(receipt_data.get("payment_method") or "cash").lower()
        method_label = cls.METHOD_NAMES.get(raw_method, raw_method.upper())
        page.insert_text(fitz.Point(282, 151), method_label[:24], fontname="hebo", fontsize=7.0, color=cls.C_DARK)

        # Transaction Ref
        page.insert_text(fitz.Point(216, 162), "Transaction Ref:", fontname="helv", fontsize=7.0, color=cls.C_SLATE)
        ref_text = str(
            receipt_data.get("transaction_reference")
            or receipt_data.get("cheque_number")
            or receipt_data.get("invoice_number")
            or "Cash Voucher"
        )
        page.insert_text(fitz.Point(282, 162), ref_text[:28], fontname="cour", fontsize=6.8, color=cls.C_DARK)

        # 5. Fee Allocations Table (y = 172 to ~242)
        curr_y = 172
        table_hdr_h = 16
        page.draw_rect(fitz.Rect(20, curr_y, 400, curr_y + table_hdr_h), color=cls.C_BORDER, fill=cls.C_LIGHT, width=0.5)
        page.insert_text(fitz.Point(26, curr_y + 11), "#", fontname="hebo", fontsize=7.0, color=cls.C_ROYAL)
        page.insert_text(fitz.Point(44, curr_y + 11), "Fee Particulars / Allocation", fontname="hebo", fontsize=7.0, color=cls.C_ROYAL)
        page.insert_text(fitz.Point(216, curr_y + 11), "Installment / Reference", fontname="hebo", fontsize=7.0, color=cls.C_ROYAL)
        amt_hdr = "Amount (INR)"
        a_len = fitz.get_text_length(amt_hdr, fontname="hebo", fontsize=7.0)
        page.insert_text(fitz.Point(394 - a_len, curr_y + 11), amt_hdr, fontname="hebo", fontsize=7.0, color=cls.C_ROYAL)
        curr_y += table_hdr_h

        allocations = receipt_data.get("allocations") or []
        amount = float(receipt_data.get("amount") or 0.0)

        if allocations:
            for idx, alloc in enumerate(allocations[:4], start=1):
                row_h = 15
                page.draw_rect(fitz.Rect(20, curr_y, 400, curr_y + row_h), color=cls.C_BORDER, width=0.5)
                page.insert_text(fitz.Point(26, curr_y + 11), str(idx), fontname="helv", fontsize=7.0, color=cls.C_DARK)

                desc = alloc.get("particulars") or alloc.get("fee_head") or f"Fee Installment #{alloc.get('installment_number') or idx}"
                page.insert_text(fitz.Point(44, curr_y + 11), str(desc)[:40], fontname="helv", fontsize=7.0, color=cls.C_DARK)

                inst_ref = alloc.get("reference") or f"Term #{alloc.get('installment_number') or idx}"
                page.insert_text(fitz.Point(216, curr_y + 11), str(inst_ref)[:24], fontname="helv", fontsize=7.0, color=cls.C_SLATE)

                alloc_amt = float(alloc.get("amount") or 0.0)
                amt_str = f"Rs. {alloc_amt:,.2f}"
                amt_len = fitz.get_text_length(amt_str, fontname="hebo", fontsize=7.0)
                page.insert_text(fitz.Point(394 - amt_len, curr_y + 11), amt_str, fontname="hebo", fontsize=7.0, color=cls.C_DARK)
                curr_y += row_h
        else:
            row_h = 16
            page.draw_rect(fitz.Rect(20, curr_y, 400, curr_y + row_h), color=cls.C_BORDER, width=0.5)
            page.insert_text(fitz.Point(26, curr_y + 11), "1", fontname="helv", fontsize=7.0, color=cls.C_DARK)
            page.insert_text(fitz.Point(44, curr_y + 11), "Tuition & Academic Coaching Fee", fontname="helv", fontsize=7.0, color=cls.C_DARK)
            page.insert_text(fitz.Point(216, curr_y + 11), "Official Installment Allocation", fontname="helv", fontsize=7.0, color=cls.C_SLATE)
            amt_str = f"Rs. {amount:,.2f}"
            amt_len = fitz.get_text_length(amt_str, fontname="hebo", fontsize=7.2)
            page.insert_text(fitz.Point(394 - amt_len, curr_y + 11), amt_str, fontname="hebo", fontsize=7.2, color=cls.C_DARK)
            curr_y += row_h

        # Total Highlight Row
        tot_h = 17
        page.draw_rect(fitz.Rect(20, curr_y, 400, curr_y + tot_h), color=cls.C_BORDER, fill=cls.C_LIGHT, width=0.5)
        page.draw_line(fitz.Point(20, curr_y + tot_h), fitz.Point(400, curr_y + tot_h), color=cls.C_GOLD, width=0.8)
        page.insert_text(fitz.Point(26, curr_y + 12), "CURRENT PAYMENT RECEIVED (INCL. TAXES):", fontname="hebo", fontsize=7.5, color=cls.C_ROYAL)
        tot_str = f"Rs. {amount:,.2f}"
        tot_len = fitz.get_text_length(tot_str, fontname="hebo", fontsize=8.8)
        page.insert_text(fitz.Point(394 - tot_len, curr_y + 12), tot_str, fontname="hebo", fontsize=8.8, color=cls.C_ROYAL)
        curr_y += tot_h

        # Amount in Words Box
        curr_y += 5
        page.draw_rect(fitz.Rect(20, curr_y, 400, curr_y + 14), color=cls.C_BORDER, fill=(0.985, 0.99, 1.0), width=0.4)
        page.draw_line(fitz.Point(20, curr_y), fitz.Point(20, curr_y + 14), color=cls.C_GOLD, width=2.0)
        page.insert_text(fitz.Point(26, curr_y + 10), "Amount in Words:", fontname="hebo", fontsize=6.8, color=cls.C_SLATE)
        in_words = number_to_words_inr(amount)
        page.insert_text(fitz.Point(96, curr_y + 10), in_words[:72], fontname="heit", fontsize=7.0, color=cls.C_DARK)
        curr_y += 18

        # 6. Ledger Reconciliation Summary Box (4 distinct metric cards with guaranteed mathematical centering)
        page.draw_rect(fitz.Rect(20, curr_y, 400, curr_y + 44), color=cls.C_BORDER, fill=(0.985, 0.99, 1.0), width=0.5)
        page.insert_text(fitz.Point(26, curr_y + 10), "FEE OBLIGATION & LEDGER RECONCILIATION SUMMARY", fontname="hebo", fontsize=6.5, color=cls.C_ROYAL)

        fee_sum = receipt_data.get("fee_summary") or {}
        tot_fee = float(fee_sum.get("total_fee_amount") or receipt_data.get("total_fees") or amount)
        prev_paid = float(fee_sum.get("previous_payments_total") or receipt_data.get("previous_paid") or 0.0)
        curr_paid = float(fee_sum.get("current_payment_amount") or amount)
        out_bal = float(fee_sum.get("outstanding_balance") or receipt_data.get("outstanding_after") or max(0.0, tot_fee - (prev_paid + curr_paid)))

        col_w = (400 - 20) / 4.0
        by = curr_y + 14
        card_h = 26
        metrics = [
            ("TOTAL OBLIGATION", f"Rs. {tot_fee:,.2f}", (0.95, 0.97, 1.0), (0.78, 0.84, 0.92), cls.C_ROYAL),
            ("PREVIOUSLY PAID", f"Rs. {prev_paid:,.2f}", (0.96, 0.97, 0.98), (0.80, 0.84, 0.88), cls.C_DARK),
            ("PAID THIS RECEIPT", f"Rs. {curr_paid:,.2f}", cls.C_GREEN_BG, (0.55, 0.82, 0.65), cls.C_GREEN),
            ("REMAINING BALANCE", f"Rs. {out_bal:,.2f}", cls.C_RED_BG if out_bal > 0 else cls.C_GREEN_BG, (0.92, 0.65, 0.65) if out_bal > 0 else (0.55, 0.82, 0.65), cls.C_RED if out_bal > 0 else cls.C_GREEN),
        ]
        for i, (label, val, bg_col, bdr_col, text_col) in enumerate(metrics):
            bx = 20 + i * col_w
            # Draw card background
            page.draw_rect(fitz.Rect(bx + 2, by, bx + col_w - 2, by + card_h), color=bdr_col, fill=bg_col, width=0.5)
            # Mathematically centered label (never clipped)
            lbl_len = fitz.get_text_length(label, fontname="hebo", fontsize=5.6)
            page.insert_text(fitz.Point(bx + 2 + (col_w - 4 - lbl_len) / 2.0, by + 10), label, fontname="hebo", fontsize=5.6, color=cls.C_SLATE)
            # Mathematically centered amount (never clipped)
            val_len = fitz.get_text_length(val, fontname="hebo", fontsize=7.6)
            page.insert_text(fitz.Point(bx + 2 + (col_w - 4 - val_len) / 2.0, by + 21), val, fontname="hebo", fontsize=7.6, color=text_col)

        curr_y += 48

        # 7. Historical Payments mini-register (if present)
        hist_payments = receipt_data.get("historical_payments") or []
        if hist_payments:
            page.draw_rect(fitz.Rect(20, curr_y, 400, curr_y + 13), color=cls.C_BORDER, fill=cls.C_LIGHT, width=0.4)
            page.insert_text(fitz.Point(26, curr_y + 9), "PRIOR RECORDED PAYMENTS FOR THIS FEE OBLIGATION", fontname="hebo", fontsize=6.2, color=cls.C_ROYAL)
            curr_y += 13

            for hp in hist_payments[:3]:
                page.draw_rect(fitz.Rect(20, curr_y, 400, curr_y + 12), color=cls.C_BORDER, width=0.4)
                page.insert_text(fitz.Point(26, curr_y + 9), f"Receipt: {hp.get('receipt_number')}", fontname="cour", fontsize=6.2, color=cls.C_DARK)
                page.insert_text(fitz.Point(140, curr_y + 9), f"Date: {hp.get('date')} ({hp.get('payment_method')})", fontname="helv", fontsize=6.2, color=cls.C_SLATE)
                hp_amt = float(hp.get("amount") or 0.0)
                hp_str = f"Rs. {hp_amt:,.2f}"
                hp_len = fitz.get_text_length(hp_str, fontname="hebo", fontsize=6.2)
                page.insert_text(fitz.Point(394 - hp_len, curr_y + 9), hp_str, fontname="hebo", fontsize=6.2, color=cls.C_SLATE)
                curr_y += 12
            curr_y += 6

        # 8. Bottom Section: Authentic QR Code, Digital Seal & Signatures
        bot_y = max(curr_y + 6, 442)

        # Genuine QR Code
        qr = qrcode.QRCode(box_size=3, border=1)
        qr_payload = (
            f"PRATHAMONE-VERIFY:REC={receipt_data.get('receipt_number')};"
            f"STUDENT={receipt_data.get('admission_number')};"
            f"AMT={amount};DATE={receipt_data.get('payment_date')}"
        )
        qr.add_data(qr_payload)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        img_bytes = io.BytesIO()
        img.save(img_bytes, format="PNG")
        page.insert_image(fitz.Rect(22, bot_y, 76, bot_y + 54), stream=img_bytes.getvalue())

        page.insert_text(fitz.Point(22, bot_y + 62), "Official Verification QR", fontname="hebo", fontsize=6.0, color=cls.C_ROYAL)
        page.insert_text(fitz.Point(22, bot_y + 69), "Scan to verify authenticity", fontname="helv", fontsize=5.4, color=cls.C_SLATE)

        # Terms & Conditions (Center column)
        page.insert_text(fitz.Point(86, bot_y + 8), "Terms & Conditions:", fontname="hebo", fontsize=6.5, color=cls.C_ROYAL)
        page.insert_text(fitz.Point(86, bot_y + 17), "1. Fees once paid are non-refundable.", fontname="helv", fontsize=5.8, color=cls.C_SLATE)
        page.insert_text(fitz.Point(86, bot_y + 26), "2. Official immutable ledger record (IT Act).", fontname="helv", fontsize=5.8, color=cls.C_SLATE)
        page.insert_text(fitz.Point(86, bot_y + 35), "3. Retain for academic & Sec 80C tax records.", fontname="helv", fontsize=5.8, color=cls.C_SLATE)

        collector = str(receipt_data.get("collected_by") or "Accounts Desk")
        page.insert_text(fitz.Point(86, bot_y + 48), f"Received By: {collector}", fontname="hebo", fontsize=6.6, color=cls.C_DARK)

        # Digital Authenticity Seal Stamp (Center-Right at scx=266, scy=bot_y+28)
        scx, scy = 266, bot_y + 28
        page.draw_circle(fitz.Point(scx, scy), 25, color=cls.C_ROYAL, width=0.9)
        page.draw_circle(fitz.Point(scx, scy), 22, color=cls.C_GOLD, width=0.5)
        # Seal Text
        st1 = "★ PRASHANT ACADEMY ★"
        st1_l = fitz.get_text_length(st1, fontname="hebo", fontsize=3.8)
        page.insert_text(fitz.Point(scx - st1_l / 2.0, scy - 13), st1, fontname="hebo", fontsize=3.8, color=cls.C_ROYAL)

        st2 = "FEES PAID & VERIFIED"
        st2_l = fitz.get_text_length(st2, fontname="hebo", fontsize=4.4)
        page.insert_text(fitz.Point(scx - st2_l / 2.0, scy - 3), st2, fontname="hebo", fontsize=4.4, color=cls.C_GOLD)

        st3 = "OFFICIAL AUDIT SEAL"
        st3_l = fitz.get_text_length(st3, fontname="hebo", fontsize=4.0)
        page.insert_text(fitz.Point(scx - st3_l / 2.0, scy + 7), st3, fontname="hebo", fontsize=4.0, color=cls.C_ROYAL)

        st4 = "★ POSTED ★"
        st4_l = fitz.get_text_length(st4, fontname="hebo", fontsize=3.8)
        page.insert_text(fitz.Point(scx - st4_l / 2.0, scy + 16), st4, fontname="hebo", fontsize=3.8, color=cls.C_GOLD)

        # Signatory Box (Right side)
        sig_x1, sig_x2 = 306, 400
        for_str = f"For {inst_name}"
        f_len = fitz.get_text_length(for_str, fontname="hebo", fontsize=6.8)
        page.insert_text(fitz.Point(sig_x1 + (sig_x2 - sig_x1 - f_len) / 2.0, bot_y + 8), for_str, fontname="hebo", fontsize=6.8, color=cls.C_ROYAL)
        
        page.draw_line(fitz.Point(sig_x1 + 6, bot_y + 46), fitz.Point(sig_x2 - 6, bot_y + 46), color=cls.C_BORDER, width=0.8)
        
        sig_title = "Authorized Signatory"
        st_len = fitz.get_text_length(sig_title, fontname="hebo", fontsize=7.0)
        page.insert_text(fitz.Point(sig_x1 + (sig_x2 - sig_x1 - st_len) / 2.0, bot_y + 56), sig_title, fontname="hebo", fontsize=7.0, color=cls.C_ROYAL)

        sig_sub = "Computer-generated official voucher"
        ss_len = fitz.get_text_length(sig_sub, fontname="helv", fontsize=5.4)
        page.insert_text(fitz.Point(sig_x1 + (sig_x2 - sig_x1 - ss_len) / 2.0, bot_y + 65), sig_sub, fontname="helv", fontsize=5.4, color=cls.C_SLATE)

        # 9. Document Governance Footer (y = 562 to 576)
        page.draw_line(fitz.Point(16, 562), fitz.Point(404, 562), color=cls.C_ROYAL, width=0.6)
        page.draw_line(fitz.Point(16, 564), fitz.Point(404, 564), color=cls.C_GOLD, width=0.4)

        doc_id = f"DOC-REC-{receipt_data.get('receipt_number')}"
        footer_left = f"Confidential · Document ID: {doc_id} · Page 1 of 1"
        page.insert_text(fitz.Point(20, 574), footer_left, fontname="helv", fontsize=6.2, color=cls.C_SLATE)

        footer_right = "Generated by PrathamOne EduOS · © PrathamOne EduOS"
        fr_len = fitz.get_text_length(footer_right, fontname="helv", fontsize=6.2)
        page.insert_text(fitz.Point(400 - fr_len, 574), footer_right, fontname="helv", fontsize=6.2, color=cls.C_SLATE)

        # 10. Watermark Layer (rendered across center if voided/superseded/duplicate)
        if is_voided:
            page.insert_text(
                fitz.Point(60, 380),
                "VOID / CANCELLED",
                fontname="hebo",
                fontsize=32,
                color=(0.85, 0.20, 0.20),
                morph=(fitz.Point(60, 380), fitz.Matrix(32)),
            )
        elif is_superseded:
            page.insert_text(
                fitz.Point(80, 380),
                "SUPERSEDED",
                fontname="hebo",
                fontsize=34,
                color=(0.80, 0.50, 0.10),
                morph=(fitz.Point(80, 380), fitz.Matrix(32)),
            )
        elif reprint_count > 0:
            dup_txt = f"DUPLICATE COPY (Reprint #{reprint_count})"
            d_len = fitz.get_text_length(dup_txt, fontname="hebo", fontsize=6.5)
            page.insert_text(
                fitz.Point(396 - d_len, 107),
                dup_txt,
                fontname="hebo",
                fontsize=6.5,
                color=cls.C_SLATE,
            )

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
