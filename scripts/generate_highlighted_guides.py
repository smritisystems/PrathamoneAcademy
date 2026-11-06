# /**
#  * @file        generate_highlighted_guides.py
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
#  * @updated     2026-11-06
#  *
#  * @description Source component for Generate Highlighted Guides in the scripts module.
#  */

"""Generate visual step-by-step screenshots with highlights and callouts.

Demonstrates:
1. How to unlock Posted Payment / Receipt editing on /payments
2. The newly visible Edit button on payment rows
3. How to edit Fee Structures in the SysAdmin Center Universal Data Editor
"""
import os
import sys
import time
import shutil
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont

BASE_URL = "http://localhost:80"
OUTPUT_DIR = "docs/user_manual/screenshots"
ARTIFACT_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(ARTIFACT_DIR, exist_ok=True)

def draw_highlight_box(image_path, box, label="CLICK HERE", color="#ef4444", text_color="#ffffff"):
    """Draw a professional highlight rectangle with an indicator label pill."""
    im = Image.open(image_path).convert("RGBA")
    overlay = Image.new("RGBA", im.size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(overlay)

    x1, y1, x2, y2 = box
    # Outer glow / translucent fill
    draw.rectangle([x1, y1, x2, y2], fill=(239, 68, 68, 40), outline=color, width=4)

    # Label badge on top left of box
    badge_h = 28
    badge_w = len(label) * 9 + 18
    bx1 = x1
    by1 = max(0, y1 - badge_h - 4)
    bx2 = bx1 + badge_w
    by2 = by1 + badge_h

    draw.rounded_rectangle([bx1, by1, bx2, by2], radius=4, fill=color)

    # Load font or default
    try:
        font = ImageFont.truetype("arial.ttf", 14)
    except:
        font = ImageFont.load_default()

    draw.text((bx1 + 8, by1 + 5), label, fill=text_color, font=font)

    # Merge overlay
    result = Image.alpha_composite(im, overlay)
    result.convert("RGB").save(image_path, "PNG")
    print(f"Saved highlighted image: {image_path}")

def run():
    print("Starting Playwright for Guided Screenshots...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=1.0  # standard 1:1 scale for easy pixel bounding
        )
        page = context.new_page()

        # Login as SysAdmin
        print("Logging in as SysAdmin...")
        page.goto(f"{BASE_URL}/login")
        page.fill('input[type="text"], input[name="username"]', "sysadmin")
        page.fill('input[type="password"]', "7)Yaw1dC_uQEfmYqmT")
        page.click('button[type="submit"]')
        page.wait_for_url("**/dashboard", timeout=15000)
        time.sleep(2)

        # -------------------------------------------------------------
        # 1. PAYMENTS MODULE - STEP 1: LOCKED STATE & UNLOCK BUTTON
        # -------------------------------------------------------------
        print("Navigating to /payments...")
        page.goto(f"{BASE_URL}/payments")
        time.sleep(2)

        # Find the Protected badge
        badge_locator = page.locator("text='Posted Edits: Protected'")
        badge_box = None
        if badge_locator.count() > 0:
            badge_el = badge_locator.first
            # Parent container with unlock button
            container = badge_el.locator("..")
            box = container.bounding_box()
            if box:
                badge_box = (int(box["x"]), int(box["y"]), int(box["x"] + box["width"]), int(box["y"] + box["height"]))

        step1_path = os.path.join(OUTPUT_DIR, "guide_step1_payments_unlock.png")
        page.screenshot(path=step1_path)

        if badge_box:
            draw_highlight_box(
                step1_path,
                (badge_box[0] - 6, badge_box[1] - 6, badge_box[2] + 6, badge_box[3] + 6),
                label="STEP 1: CLICK UNLOCK HERE",
                color="#dc2626"
            )

        # -------------------------------------------------------------
        # 2. PAYMENTS MODULE - STEP 2: OPEN UNLOCK MODAL & UNLOCK IT
        # -------------------------------------------------------------
        print("Clicking Unlock button...")
        unlock_btn = page.locator("button:has-text('Unlock')")
        if unlock_btn.count() > 0:
            unlock_btn.first.click()
            time.sleep(1)

            # Screenshot modal
            step2_modal_path = os.path.join(OUTPUT_DIR, "guide_step2_unlock_modal.png")
            page.screenshot(path=step2_modal_path)

            # Fill in reason and submit
            reason_input = page.locator("textarea")
            if reason_input.count() > 0:
                reason_input.first.fill("Administrative receipt correction authorized by sysadmin")
            
            confirm_btn = page.locator("button:has-text('Grant Permission'), button:has-text('Confirm')")
            if confirm_btn.count() > 0:
                confirm_btn.first.click()
                time.sleep(2)

        # -------------------------------------------------------------
        # 3. PAYMENTS MODULE - STEP 3: UNLOCKED STATE WITH EDIT BUTTON
        # -------------------------------------------------------------
        step3_unlocked_path = os.path.join(OUTPUT_DIR, "guide_step3_payments_edit_active.png")
        page.screenshot(path=step3_unlocked_path)

        # Locate Edit button in first row of table
        edit_btn_locator = page.locator("button:has-text('Edit')")
        if edit_btn_locator.count() > 0:
            box = edit_btn_locator.first.bounding_box()
            if box:
                edit_box = (int(box["x"]) - 4, int(box["y"]) - 4, int(box["x"] + box["width"]) + 4, int(box["y"] + box["height"]) + 4)
                draw_highlight_box(
                    step3_unlocked_path,
                    edit_box,
                    label="STEP 2: EDIT BUTTON NOW VISIBLE!",
                    color="#16a34a"
                )

        # -------------------------------------------------------------
        # 4. SYSADMIN CENTER - UNIVERSAL DATA EDITOR (FEE STRUCTURE)
        # -------------------------------------------------------------
        print("Navigating to /sysadmin...")
        page.goto(f"{BASE_URL}/sysadmin")
        time.sleep(2)

        uedit_tab = page.locator("button:has-text('Universal Data Editor')")
        if uedit_tab.count() > 0:
            uedit_tab.first.click()
            time.sleep(1)

        # Select fee_structure in model dropdown
        model_select = page.locator("select:has(option[value='fee_structure'])")
        if model_select.count() > 0:
            model_select.select_option("fee_structure")
            time.sleep(1)

        # Enter Record ID
        id_input = page.locator("input[placeholder='e.g. 114']")
        if id_input.count() > 0:
            id_input.fill("1")

        # Click on total_amount chip tag
        amount_chip = page.locator("button:has-text('total_amount')")
        if amount_chip.count() > 0:
            amount_chip.click()
            time.sleep(1)

        # Enter reason
        reason_textarea = page.locator("textarea[placeholder*='Audit reason']")
        if reason_textarea.count() > 0:
            reason_textarea.fill("Annual inflation adjustment authorized by Academic Council")

        step4_ueditor_path = os.path.join(OUTPUT_DIR, "guide_step4_fee_structure_editor.png")
        page.screenshot(path=step4_ueditor_path)

        # Highlight Universal Editor control area
        draw_highlight_box(
            step4_ueditor_path,
            (40, 240, 960, 680),
            label="STEP 3: SELECT fee_structure, RECORD ID & FIELD HERE",
            color="#2563eb"
        )

        browser.close()
        print("All guide screenshots successfully captured and highlighted!")

        # Copy all guide images to Artifact Directory for Markdown Embedding
        guides = [
            "guide_step1_payments_unlock.png",
            "guide_step2_unlock_modal.png",
            "guide_step3_payments_edit_active.png",
            "guide_step4_fee_structure_editor.png"
        ]
        for g in guides:
            src = os.path.join(OUTPUT_DIR, g)
            dst = os.path.join(ARTIFACT_DIR, g)
            if os.path.exists(src):
                shutil.copy2(src, dst)
                print(f"Copied to Artifact Dir: {dst}")

if __name__ == "__main__":
    run()
