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
    Builds vector A5 portrait vouchers with dynamic institution headers,
    student metadata, financial allocation tables, ledger summaries,
    verification QR codes, and canonical governance footers.
    """

    # Color Palette
    C_NAVY = (0.07, 0.16, 0.34)
    C_SLATE = (0.35, 0.42, 0.50)
    C_DARK = (0.10, 0.13, 0.18)
    C_LIGHT = (0.96, 0.97, 0.99)
    C_BORDER = (0.80, 0.84, 0.88)
    C_GREEN = (0.06, 0.52, 0.26)
    C_RED = (0.78, 0.15, 0.15)
    C_AMBER = (0.75, 0.45, 0.05)

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
        Generates binary PDF bytes for a single fee receipt.
        """
        doc = fitz.open()
        # Standard A5 portrait dimensions: 420.0 x 595.0 pt
        page = doc.new_page(width=420.0, height=595.0)

        inst = institution_data or {}
        inst_name = (inst.get("name") or "PRASHANT ACADEMY").upper()
        inst_tagline = inst.get("tagline") or "Premier Coaching Institute for Academic & Competitive Excellence"
        inst_address = inst.get("address") or "Plot 42, Sector 17, Vashi"
        inst_city = inst.get("city") or "Navi Mumbai"
        inst_state = inst.get("state") or "Maharashtra"
        inst_pincode = inst.get("pincode") or "400703"
        inst_phone = inst.get("phone") or "+91 98336 45512"
        inst_email = inst.get("email") or "admin@prashantacademy.in"
        inst_tax_id = inst.get("tax_id") or "AABCP1234K"

        # 1. Outer Perimeter Border
        page.draw_rect(fitz.Rect(16, 16, 404, 579), color=cls.C_BORDER, width=0.8)

        # 2. Institutional Header Block (y = 16 to 74)
        page.draw_rect(fitz.Rect(16, 16, 404, 74), color=cls.C_LIGHT, fill=cls.C_LIGHT)
        page.draw_line(fitz.Point(16, 74), fitz.Point(404, 74), color=cls.C_BORDER, width=0.8)

        page.insert_text(fitz.Point(24, 32), inst_name, fontname="hebo", fontsize=11.5, color=cls.C_NAVY)
        page.insert_text(fitz.Point(24, 43), inst_tagline, fontname="helv", fontsize=7.2, color=cls.C_SLATE)

        addr_str = f"{inst_address}, {inst_city}, {inst_state} - {inst_pincode}".strip(", -")
        page.insert_text(fitz.Point(24, 53), addr_str, fontname="helv", fontsize=6.8, color=cls.C_SLATE)

        contact_parts = []
        if inst_phone:
            contact_parts.append(f"Phone: {inst_phone}")
        if inst_email:
            contact_parts.append(f"Email: {inst_email}")
        if inst_tax_id:
            contact_parts.append(f"GSTIN / Tax ID: {inst_tax_id}")
        contact_str = " | ".join(contact_parts)
        page.insert_text(fitz.Point(24, 63), contact_str, fontname="helv", fontsize=6.8, color=cls.C_SLATE)

        # 3. Document Title Ribbon (y = 74 to 92)
        page.draw_rect(fitz.Rect(16, 74, 404, 92), color=cls.C_NAVY, fill=cls.C_NAVY)
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

        page.insert_textbox(fitz.Rect(250, 74, 396, 92), badge_text, fontname="hebo", fontsize=7.5, color=badge_color, align=fitz.TEXT_ALIGN_RIGHT)

        # 4. Student & Receipt Metadata Block (y = 96 to 162)
        page.draw_rect(fitz.Rect(20, 96, 400, 162), color=cls.C_BORDER, fill=(0.99, 0.99, 1.0), width=0.5)
        page.draw_line(fitz.Point(210, 96), fitz.Point(210, 162), color=cls.C_BORDER, width=0.5)

        # Left Column: Student Details
        page.insert_text(fitz.Point(26, 107), "STUDENT IDENTIFICATION", fontname="hebo", fontsize=6.8, color=cls.C_NAVY)
        page.insert_text(fitz.Point(26, 119), "Student Name:", fontname="helv", fontsize=7.2, color=cls.C_SLATE)
        page.insert_text(fitz.Point(86, 119), str(receipt_data.get("student_name") or "—"), fontname="hebo", fontsize=7.8, color=cls.C_DARK)

        page.insert_text(fitz.Point(26, 130), "Admission No:", fontname="helv", fontsize=7.2, color=cls.C_SLATE)
        page.insert_text(fitz.Point(86, 130), str(receipt_data.get("admission_number") or "—"), fontname="hebo", fontsize=7.2, color=cls.C_DARK)

        page.insert_text(fitz.Point(26, 141), "Class / Standard:", fontname="helv", fontsize=7.2, color=cls.C_SLATE)
        std_div = f"{receipt_data.get('standard') or '—'} · {receipt_data.get('division') or receipt_data.get('batch') or '—'}"
        page.insert_text(fitz.Point(86, 141), std_div, fontname="helv", fontsize=7.2, color=cls.C_DARK)

        page.insert_text(fitz.Point(26, 152), "Academic Year:", fontname="helv", fontsize=7.2, color=cls.C_SLATE)
        page.insert_text(fitz.Point(86, 152), str(receipt_data.get("academic_year") or "2026 – 2027"), fontname="helv", fontsize=7.2, color=cls.C_DARK)

        # Right Column: Receipt Details
        page.insert_text(fitz.Point(216, 107), "TRANSACTION METADATA", fontname="hebo", fontsize=6.8, color=cls.C_NAVY)
        page.insert_text(fitz.Point(216, 119), "Receipt Number:", fontname="helv", fontsize=7.2, color=cls.C_SLATE)
        page.insert_text(fitz.Point(282, 119), str(receipt_data.get("receipt_number") or "—"), fontname="hebo", fontsize=7.8, color=cls.C_NAVY)

        page.insert_text(fitz.Point(216, 130), "Payment Date:", fontname="helv", fontsize=7.2, color=cls.C_SLATE)
        page.insert_text(fitz.Point(282, 130), str(receipt_data.get("payment_date") or "—"), fontname="helv", fontsize=7.2, color=cls.C_DARK)

        page.insert_text(fitz.Point(216, 141), "Payment Mode:", fontname="helv", fontsize=7.2, color=cls.C_SLATE)
        raw_method = str(receipt_data.get("payment_method") or "cash").lower()
        method_label = cls.METHOD_NAMES.get(raw_method, raw_method.upper())
        page.insert_text(fitz.Point(282, 141), method_label, fontname="hebo", fontsize=7.2, color=cls.C_DARK)

        page.insert_text(fitz.Point(216, 152), "Transaction Ref:", fontname="helv", fontsize=7.2, color=cls.C_SLATE)
        ref_text = str(
            receipt_data.get("transaction_reference")
            or receipt_data.get("cheque_number")
            or receipt_data.get("invoice_number")
            or "Cash Voucher"
        )
        page.insert_text(fitz.Point(282, 152), ref_text[:28], fontname="cour", fontsize=7.0, color=cls.C_DARK)

        # 5. Fee Allocations Table (y = 168 to ~240)
        curr_y = 168
        table_hdr_h = 16
        page.draw_rect(fitz.Rect(20, curr_y, 400, curr_y + table_hdr_h), color=cls.C_BORDER, fill=cls.C_LIGHT, width=0.5)
        page.insert_text(fitz.Point(26, curr_y + 11), "#", fontname="hebo", fontsize=7.0, color=cls.C_NAVY)
        page.insert_text(fitz.Point(44, curr_y + 11), "Fee Particulars / Allocation", fontname="hebo", fontsize=7.0, color=cls.C_NAVY)
        page.insert_text(fitz.Point(216, curr_y + 11), "Installment / Reference", fontname="hebo", fontsize=7.0, color=cls.C_NAVY)
        page.insert_textbox(fitz.Rect(310, curr_y, 394, curr_y + table_hdr_h), "Amount (INR)", fontname="hebo", fontsize=7.0, color=cls.C_NAVY, align=fitz.TEXT_ALIGN_RIGHT)
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
                page.insert_textbox(fitz.Rect(310, curr_y, 394, curr_y + row_h), f"Rs. {alloc_amt:,.2f}", fontname="hebo", fontsize=7.0, color=cls.C_DARK, align=fitz.TEXT_ALIGN_RIGHT)
                curr_y += row_h
        else:
            row_h = 16
            page.draw_rect(fitz.Rect(20, curr_y, 400, curr_y + row_h), color=cls.C_BORDER, width=0.5)
            page.insert_text(fitz.Point(26, curr_y + 11), "1", fontname="helv", fontsize=7.0, color=cls.C_DARK)
            page.insert_text(fitz.Point(44, curr_y + 11), "Tuition & Academic Coaching Fee", fontname="helv", fontsize=7.0, color=cls.C_DARK)
            page.insert_text(fitz.Point(216, curr_y + 11), "Official Installment Allocation", fontname="helv", fontsize=7.0, color=cls.C_SLATE)
            page.insert_textbox(fitz.Rect(310, curr_y, 394, curr_y + row_h), f"Rs. {amount:,.2f}", fontname="hebo", fontsize=7.2, color=cls.C_DARK, align=fitz.TEXT_ALIGN_RIGHT)
            curr_y += row_h

        # Total Row
        tot_h = 17
        page.draw_rect(fitz.Rect(20, curr_y, 400, curr_y + tot_h), color=cls.C_BORDER, fill=cls.C_LIGHT, width=0.5)
        page.insert_text(fitz.Point(26, curr_y + 12), "CURRENT PAYMENT RECEIVED:", fontname="hebo", fontsize=7.5, color=cls.C_NAVY)
        page.insert_textbox(fitz.Rect(300, curr_y, 394, curr_y + tot_h), f"Rs. {amount:,.2f}", fontname="hebo", fontsize=8.5, color=cls.C_NAVY, align=fitz.TEXT_ALIGN_RIGHT)
        curr_y += tot_h

        # Amount in Words Line
        curr_y += 4
        page.insert_text(fitz.Point(22, curr_y + 8), "Amount in Words:", fontname="hebo", fontsize=6.8, color=cls.C_SLATE)
        in_words = number_to_words_inr(amount)
        page.insert_text(fitz.Point(92, curr_y + 8), in_words, fontname="heit", fontsize=7.0, color=cls.C_DARK)
        curr_y += 14

        # 6. Ledger Reconciliation Summary Box (4 metric boxes)
        page.draw_rect(fitz.Rect(20, curr_y, 400, curr_y + 44), color=cls.C_BORDER, fill=(0.98, 0.99, 1.0), width=0.5)
        page.insert_text(fitz.Point(26, curr_y + 10), "FEE OBLIGATION & LEDGER RECONCILIATION SUMMARY", fontname="hebo", fontsize=6.5, color=cls.C_NAVY)

        fee_sum = receipt_data.get("fee_summary") or {}
        tot_fee = float(fee_sum.get("total_fee_amount") or receipt_data.get("total_fees") or amount)
        prev_paid = float(fee_sum.get("previous_payments_total") or receipt_data.get("previous_paid") or 0.0)
        curr_paid = float(fee_sum.get("current_payment_amount") or amount)
        out_bal = float(fee_sum.get("outstanding_balance") or receipt_data.get("outstanding_after") or max(0.0, tot_fee - (prev_paid + curr_paid)))

        col_w = (400 - 20) / 4.0
        by = curr_y + 15
        metrics = [
            ("Total Fee Obligation", f"Rs. {tot_fee:,.2f}", cls.C_DARK),
            ("Previously Paid", f"Rs. {prev_paid:,.2f}", cls.C_DARK),
            ("Paid This Receipt", f"Rs. {curr_paid:,.2f}", cls.C_GREEN),
            ("Remaining Balance", f"Rs. {out_bal:,.2f}", cls.C_RED if out_bal > 0 else cls.C_GREEN),
        ]
        for i, (label, val, col) in enumerate(metrics):
            bx = 20 + i * col_w
            page.draw_rect(fitz.Rect(bx + 2, by, bx + col_w - 2, by + 24), color=cls.C_BORDER, fill=(1, 1, 1), width=0.4)
            page.insert_textbox(fitz.Rect(bx + 3, by + 2, bx + col_w - 3, by + 11), label, fontname="helv", fontsize=6.0, color=cls.C_SLATE, align=fitz.TEXT_ALIGN_CENTER)
            page.insert_textbox(fitz.Rect(bx + 3, by + 11, bx + col_w - 3, by + 22), val, fontname="hebo", fontsize=7.2, color=col, align=fitz.TEXT_ALIGN_CENTER)

        curr_y += 50

        # 7. Historical Payments mini-register (if present)
        hist_payments = receipt_data.get("historical_payments") or []
        if hist_payments:
            page.draw_rect(fitz.Rect(20, curr_y, 400, curr_y + 13), color=cls.C_BORDER, fill=cls.C_LIGHT, width=0.4)
            page.insert_text(fitz.Point(26, curr_y + 9), "PRIOR RECORDED PAYMENTS FOR THIS FEE OBLIGATION", fontname="hebo", fontsize=6.2, color=cls.C_NAVY)
            curr_y += 13

            for hp in hist_payments[:3]:
                page.draw_rect(fitz.Rect(20, curr_y, 400, curr_y + 12), color=cls.C_BORDER, width=0.4)
                page.insert_text(fitz.Point(26, curr_y + 9), f"Receipt: {hp.get('receipt_number')}", fontname="cour", fontsize=6.2, color=cls.C_DARK)
                page.insert_text(fitz.Point(140, curr_y + 9), f"Date: {hp.get('date')} ({hp.get('payment_method')})", fontname="helv", fontsize=6.2, color=cls.C_SLATE)
                hp_amt = float(hp.get("amount") or 0.0)
                page.insert_textbox(fitz.Rect(310, curr_y, 394, curr_y + 12), f"Rs. {hp_amt:,.2f}", fontname="hebo", fontsize=6.2, color=cls.C_SLATE, align=fitz.TEXT_ALIGN_RIGHT)
                curr_y += 12
            curr_y += 6

        # 8. Bottom Section: Authentic QR Code & Signatures (fixed y position)
        bot_y = max(curr_y + 6, 440)

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
        page.insert_image(fitz.Rect(24, bot_y, 84, bot_y + 60), stream=img_bytes.getvalue())

        page.insert_text(fitz.Point(24, bot_y + 68), "Official Verification QR", fontname="hebo", fontsize=6.2, color=cls.C_NAVY)
        page.insert_text(fitz.Point(24, bot_y + 75), "Scan to verify authenticity", fontname="helv", fontsize=5.8, color=cls.C_SLATE)

        # Institutional Terms & Staff Info
        page.insert_text(fitz.Point(100, bot_y + 8), "Terms & Conditions:", fontname="hebo", fontsize=6.5, color=cls.C_NAVY)
        page.insert_text(fitz.Point(100, bot_y + 17), "1. Fees once paid are non-refundable and non-transferable.", fontname="helv", fontsize=6.0, color=cls.C_SLATE)
        page.insert_text(fitz.Point(100, bot_y + 26), "2. This receipt is an official immutable ledger snapshot.", fontname="helv", fontsize=6.0, color=cls.C_SLATE)
        page.insert_text(fitz.Point(100, bot_y + 35), "3. Retain this voucher for academic and income tax records.", fontname="helv", fontsize=6.0, color=cls.C_SLATE)

        collector = str(receipt_data.get("collected_by") or "Accounts Desk")
        page.insert_text(fitz.Point(100, bot_y + 48), f"Received By: {collector}", fontname="hebo", fontsize=6.8, color=cls.C_DARK)

        # Signatory Box (Right side)
        sig_x1, sig_x2 = 270, 396
        page.insert_textbox(fitz.Rect(sig_x1, bot_y + 8, sig_x2, bot_y + 20), f"For {inst_name}", fontname="hebo", fontsize=6.8, color=cls.C_NAVY, align=fitz.TEXT_ALIGN_CENTER)
        page.draw_line(fitz.Point(sig_x1, bot_y + 55), fitz.Point(sig_x2, bot_y + 55), color=cls.C_BORDER, width=0.8)
        page.insert_textbox(fitz.Rect(sig_x1, bot_y + 58, sig_x2, bot_y + 68), "Authorized Signatory", fontname="hebo", fontsize=7.2, color=cls.C_NAVY, align=fitz.TEXT_ALIGN_CENTER)
        page.insert_textbox(fitz.Rect(sig_x1, bot_y + 68, sig_x2, bot_y + 76), "Computer-generated official voucher", fontname="helv", fontsize=5.8, color=cls.C_SLATE, align=fitz.TEXT_ALIGN_CENTER)

        # 9. Document Governance Footer (y = 560 to 574)
        page.draw_line(fitz.Point(16, 560), fitz.Point(404, 560), color=cls.C_BORDER, width=0.5)

        doc_id = f"DOC-REC-{receipt_data.get('receipt_number')}"
        footer_left = f"Confidential · Document ID: {doc_id} · Page 1 of 1"
        page.insert_text(fitz.Point(24, 571), footer_left, fontname="helv", fontsize=6.2, color=cls.C_SLATE)

        footer_right = "Generated by PrathamOne EduOS · © PrathamOne EduOS"
        page.insert_textbox(fitz.Rect(200, 563, 396, 575), footer_right, fontname="helv", fontsize=6.2, color=cls.C_SLATE, align=fitz.TEXT_ALIGN_RIGHT)

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
            page.insert_textbox(
                fitz.Rect(250, 96, 396, 108),
                f"DUPLICATE COPY (Reprint #{reprint_count})",
                fontname="hebo",
                fontsize=6.5,
                color=cls.C_SLATE,
                align=fitz.TEXT_ALIGN_RIGHT,
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
