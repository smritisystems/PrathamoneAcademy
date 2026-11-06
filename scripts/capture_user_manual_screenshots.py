# /**
#  * @file        capture_user_manual_screenshots.py
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
#  * @description Source component for Capture User Manual Screenshots in the scripts module.
#  */

"""Playwright script to capture clean, high-resolution screenshots for PrathamOne Academy User Manuals.
Target: Live running container at http://localhost:80
Screenshots saved to docs/user_manual/screenshots/
"""
import sys
import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:80"
OUTPUT_DIR = "docs/user_manual/screenshots"

def capture_screenshots():
    print("Launching Chromium for User Manual Screenshot Capture...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # 1440x900 viewport with device_scale_factor 1.5 for crisp images
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=1.5
        )
        page = context.new_page()

        # 1. Login Screen
        print("Capturing 01_login_screen.png...")
        page.goto(f"{BASE_URL}/login")
        page.wait_for_selector('input[type="text"], input[name="username"]', timeout=10000)
        time.sleep(1)
        page.screenshot(path=f"{OUTPUT_DIR}/01_login_screen.png")

        # Perform Login
        print("Authenticating as Sysadmin...")
        page.fill('input[type="text"], input[name="username"]', "sysadmin")
        page.fill('input[type="password"]', "7)Yaw1dC_uQEfmYqmT")
        page.click('button[type="submit"]')
        page.wait_for_url("**/dashboard", timeout=15000)
        time.sleep(2)

        # 2. Dashboard Overview
        print("Capturing 02_dashboard_overview.png...")
        page.screenshot(path=f"{OUTPUT_DIR}/02_dashboard_overview.png")

        # 3. Academic Workspace
        print("Capturing 03_academic_workspace.png...")
        page.goto(f"{BASE_URL}/academic")
        time.sleep(2)
        page.screenshot(path=f"{OUTPUT_DIR}/03_academic_workspace.png")

        # 4. Courses Management
        print("Capturing 04_courses_management.png...")
        page.goto(f"{BASE_URL}/courses")
        time.sleep(2)
        page.screenshot(path=f"{OUTPUT_DIR}/04_courses_management.png")

        # 5. Subjects Management
        print("Capturing 05_subjects_management.png...")
        page.goto(f"{BASE_URL}/subjects")
        time.sleep(2)
        page.screenshot(path=f"{OUTPUT_DIR}/05_subjects_management.png")

        # 6. Students Directory
        print("Capturing 06_students_directory.png...")
        page.goto(f"{BASE_URL}/students")
        time.sleep(2)
        page.screenshot(path=f"{OUTPUT_DIR}/06_students_directory.png")

        # 7. Student Admission Form
        print("Capturing 07_student_admission_form.png...")
        page.goto(f"{BASE_URL}/students/add")
        time.sleep(2)
        page.screenshot(path=f"{OUTPUT_DIR}/07_student_admission_form.png")

        # 8. Student Detail & Profile
        print("Capturing 08_student_detail_profile.png...")
        page.goto(f"{BASE_URL}/students/129")
        time.sleep(2)
        page.screenshot(path=f"{OUTPUT_DIR}/08_student_detail_profile.png")

        # 9. Student Edit Profile Modal
        print("Capturing 09_student_edit_modal.png...")
        edit_btn = page.locator("button:has-text('Edit Profile')")
        if edit_btn.count() > 0:
            edit_btn.first.click()
            time.sleep(1)
            page.screenshot(path=f"{OUTPUT_DIR}/09_student_edit_modal.png")
            # Close modal
            close_btn = page.locator("button:has-text('Cancel')")
            if close_btn.count() > 0:
                close_btn.first.click()
                time.sleep(1)

        # 10. Student Exit / Withdrawal Modal
        print("Capturing 10_student_exit_modal.png...")
        exit_btn = page.locator("button:has-text('Exit Student'), button:has-text('Withdraw')")
        if exit_btn.count() > 0:
            exit_btn.first.click()
            time.sleep(1)
            page.screenshot(path=f"{OUTPUT_DIR}/10_student_exit_modal.png")
            # Close modal
            cancel_btn = page.locator("button:has-text('Cancel')")
            if cancel_btn.count() > 0:
                cancel_btn.first.click()
                time.sleep(1)

        # 11. Attendance Workspace
        print("Capturing 11_attendance_workspace.png...")
        page.goto(f"{BASE_URL}/attendance")
        time.sleep(2)
        page.screenshot(path=f"{OUTPUT_DIR}/11_attendance_workspace.png")

        # 12. Examinations & Results
        print("Capturing 12_examinations_results.png...")
        page.goto(f"{BASE_URL}/examinations")
        time.sleep(2)
        page.screenshot(path=f"{OUTPUT_DIR}/12_examinations_results.png")

        # 13. Fee Plans & Structures
        print("Capturing 13_fee_plans_structures.png...")
        page.goto(f"{BASE_URL}/fees")
        time.sleep(2)
        page.screenshot(path=f"{OUTPUT_DIR}/13_fee_plans_structures.png")

        # 14. Import Fee Register
        print("Capturing 14_import_fee_register.png...")
        page.goto(f"{BASE_URL}/fees/import")
        time.sleep(2)
        page.screenshot(path=f"{OUTPUT_DIR}/14_import_fee_register.png")

        # 15. Payments Ledger
        print("Capturing 15_payments_ledger.png...")
        page.goto(f"{BASE_URL}/payments")
        time.sleep(2)
        page.screenshot(path=f"{OUTPUT_DIR}/15_payments_ledger.png")

        # 16. Posted Payments Security Gate Modal
        print("Capturing 16_payments_lock_unlock_gate.png...")
        gate_btn = page.locator("button:has-text('Edit Posted Payment'), button:has-text('Posted Payment'), button:has-text('Permission Gate')")
        if gate_btn.count() > 0:
            gate_btn.first.click()
            time.sleep(1)
            page.screenshot(path=f"{OUTPUT_DIR}/16_payments_lock_unlock_gate.png")
            cancel_gate = page.locator("button:has-text('Cancel'), button:has-text('Close')")
            if cancel_gate.count() > 0:
                cancel_gate.first.click()
                time.sleep(1)
        else:
            # If button not found, screenshot ledger
            page.screenshot(path=f"{OUTPUT_DIR}/16_payments_lock_unlock_gate.png")

        # 17. Reports & Analytics Grid
        print("Capturing 17_reports_analytics_grid.png...")
        page.goto(f"{BASE_URL}/reports")
        time.sleep(2)
        page.screenshot(path=f"{OUTPUT_DIR}/17_reports_analytics_grid.png")

        # 18. User Management
        print("Capturing 18_user_management.png...")
        page.goto(f"{BASE_URL}/users")
        time.sleep(2)
        page.screenshot(path=f"{OUTPUT_DIR}/18_user_management.png")

        # 19. User Profile & RBAC Matrix
        print("Capturing 19_user_profile_rbac_matrix.png...")
        page.goto(f"{BASE_URL}/users/128")
        time.sleep(2)
        rbac_tab = page.locator("button:has-text('Access & Roles'), button:has-text('Permissions')")
        if rbac_tab.count() > 0:
            rbac_tab.first.click()
            time.sleep(1)
        page.screenshot(path=f"{OUTPUT_DIR}/19_user_profile_rbac_matrix.png")

        # 20. Staff Management
        print("Capturing 20_staff_management.png...")
        page.goto(f"{BASE_URL}/staff")
        time.sleep(2)
        page.screenshot(path=f"{OUTPUT_DIR}/20_staff_management.png")

        # 21. Sysadmin Center Overview
        print("Capturing 21_sysadmin_center_overview.png...")
        page.goto(f"{BASE_URL}/sysadmin")
        time.sleep(2)
        page.screenshot(path=f"{OUTPUT_DIR}/21_sysadmin_center_overview.png")

        # 22. Sysadmin Universal Data Editor
        print("Capturing 22_sysadmin_universal_editor.png...")
        uedit_tab = page.locator("button:has-text('Universal Data Editor'), button:has-text('Record Editor')")
        if uedit_tab.count() > 0:
            uedit_tab.first.click()
            time.sleep(1)
        page.screenshot(path=f"{OUTPUT_DIR}/22_sysadmin_universal_editor.png")

        # 23. Import / Export Center
        print("Capturing 23_import_export_center.png...")
        page.goto(f"{BASE_URL}/import-export")
        time.sleep(2)
        page.screenshot(path=f"{OUTPUT_DIR}/23_import_export_center.png")

        # 24. Forms & Documents Hub
        print("Capturing 24_forms_documents_hub.png...")
        page.goto(f"{BASE_URL}/forms")
        time.sleep(2)
        page.screenshot(path=f"{OUTPUT_DIR}/24_forms_documents_hub.png")

        # 25. Settings & Branding Preview
        print("Capturing 25_branding_settings_preview.png...")
        page.goto(f"{BASE_URL}/settings")
        time.sleep(2)
        page.screenshot(path=f"{OUTPUT_DIR}/25_branding_settings_preview.png")

        # 26. Communication Center
        print("Capturing 26_communication_center.png...")
        page.goto(f"{BASE_URL}/communication")
        time.sleep(2)
        page.screenshot(path=f"{OUTPUT_DIR}/26_communication_center.png")

        # 27. Releases & Version Audit
        print("Capturing 27_releases_and_version_audit.png...")
        page.goto(f"{BASE_URL}/releases")
        time.sleep(2)
        page.screenshot(path=f"{OUTPUT_DIR}/27_releases_and_version_audit.png")

        browser.close()
        print("\nAll 27 screenshots captured successfully!")

if __name__ == "__main__":
    capture_screenshots()
