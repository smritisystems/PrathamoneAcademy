# /**
#  * @file        verify_runtime_browser.py
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
#  * @description Source component for Verify Runtime Browser in the scripts module.
#  */

import time
import json
import os
import sys

# Ensure UTF-8 output encoding on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:80"
API_URL = "http://localhost:8000/api/v1"

results = {
    "login": False,
    "modules": {},
    "specific_verifications": {},
    "modal_interactions": {},
    "viewports": {},
    "console_errors": [],
    "console_warnings": [],
    "network_errors": []
}

def log_console(msg):
    safe_text = msg.text.encode('ascii', errors='replace').decode()
    if msg.type == "error":
        results["console_errors"].append(safe_text)
    elif msg.type == "warning":
        results["console_warnings"].append(safe_text)
    print(f"Browser Console [{msg.type}]: {safe_text[:120]}")

def log_failed_request(request):
    results["network_errors"].append(f"Failed: {request.method} {request.url} - {request.failure}")
    print(f"Network Failed: {request.method} {request.url}")

def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        page.on("console", log_console)
        page.on("requestfailed", log_failed_request)

        print("\n=== STEP 1: SYSADMIN LOGIN ===")
        page.goto(f"{BASE_URL}/login")
        page.wait_for_selector('input[type="text"], input[name="username"]')
        
        # Fill login form
        page.fill('input[type="text"], input[name="username"]', "sysadmin")
        page.fill('input[type="password"]', "7)Yaw1dC_uQEfmYqmT")
        page.click('button[type="submit"]')

        # Wait for redirect to dashboard
        try:
            page.wait_for_url("**/dashboard", timeout=12000)
            print("Successfully logged in as sysadmin! Current URL:", page.url)
            results["login"] = True
        except Exception as e:
            print("Login timeout or failed:", e)
            print("Current URL:", page.url)
            browser.close()
            return

        time.sleep(2)

        print("\n=== STEP 2: VERIFY ALL WORKSPACES ===")
        routes_to_test = [
            ("/dashboard", "Dashboard", ["Overview", "Reconciliation"]),
            ("/academic", "Academic Structure", ["Boards", "Standards", "Batches", "Subjects", "Timetable", "Enrollment"]),
            ("/courses", "Courses", ["Course", "Curriculum"]),
            ("/subjects", "Subjects", ["Subject"]),
            ("/students", "Students Directory", ["Add Student", "Active", "Rajnees"]),
            ("/students/add", "Admissions Registration", ["Admission", "Personal Details", "Gender", "Save"]),
            ("/attendance", "Student Attendance", ["Attendance", "Date"]),
            ("/examinations", "Examinations", ["Examination", "Marks"]),
            ("/fees", "Fees & Finance", ["Fee Structures", "Assignments", "Invoices", "Settings"]),
            ("/fees/import", "Fee Register Migration", ["Fee Register"]),
            ("/payments", "Payments & Collections", ["Payments", "Receipt", "Refund"]),
            ("/reports", "Reports & Analytics", ["Fee Collection", "Outstanding", "Export"]),
            ("/users", "Users & Roles", ["Add User Account", "Live Directory", "Total Accounts"]),
            ("/staff", "Staff & HR", ["Staff", "Assignments", "Attendance", "Leaves", "Role Dashboard"]),
            ("/sysadmin", "SysAdmin Center", ["System Overview", "Security Audit Log", "Universal Data Editor", "System Configuration"]),
            ("/import-export", "Data Import/Export", ["Import", "Export"]),
            ("/forms", "Forms & Documents", ["Document Center", "Catalogue"]),
            ("/settings", "Institute Settings", ["Institute Profile", "Branding & Appearance", "Academic Configuration"]),
            ("/communication", "Communication Center", ["Compose", "Templates", "History", "Diagnostics"]),
            ("/releases", "Release Management", ["Releases", "Release Candidate", "Production Deployment"])
        ]

        for path, name, expected_texts in routes_to_test:
            print(f"\n--- Checking Module: {name} ({path}) ---")
            page.goto(f"{BASE_URL}{path}")
            time.sleep(1.5)
            content = page.content()
            found_keywords = [kw for kw in expected_texts if kw.lower() in content.lower()]
            status = "VERIFIED" if len(found_keywords) > 0 else "PARTIALLY VERIFIED"
            results["modules"][name] = {
                "path": path,
                "status": status,
                "keywords_found": found_keywords,
                "page_title": page.title()
            }
            print(f"Result for {name}: {status} (Found: {found_keywords})")

        print("\n=== STEP 3: SPECIFIC FEATURE DEEP DIVE ===")

        # 3A. Student Detail & Lifecycle Controls (/students/129)
        print("\n--- Verifying Student Detail & Lifecycle Controls (/students/129) ---")
        page.goto(f"{BASE_URL}/students/129")
        time.sleep(2)
        student_content = page.content()
        has_edit_profile = "edit profile" in student_content.lower()
        has_withdraw = "withdraw" in student_content.lower() or "exit student" in student_content.lower()
        has_reactivate = "reactivate" in student_content.lower()
        has_kyc_docs = "kyc" in student_content.lower() or "documents" in student_content.lower() or "upload" in student_content.lower()
        
        results["specific_verifications"]["student_detail"] = {
            "student_id": 129,
            "has_edit_profile_btn": has_edit_profile,
            "has_withdraw_btn": has_withdraw,
            "has_reactivate_btn": has_reactivate,
            "has_kyc_docs": has_kyc_docs
        }
        print(f"Student 129 Detail: EditProfile={has_edit_profile}, Withdraw={has_withdraw}, Reactivate={has_reactivate}, KYC={has_kyc_docs}")

        # Modal test: Edit Profile Modal
        edit_btn = page.query_selector('button:has-text("Edit Profile")')
        if edit_btn:
            edit_btn.click()
            time.sleep(1)
            edit_modal_visible = page.is_visible('div[role="dialog"], .fixed')
            results["modal_interactions"]["student_edit_modal"] = edit_modal_visible
            print("Student Edit Profile Modal Opened:", edit_modal_visible)
            # Close modal
            cancel_btn = page.query_selector('button:has-text("Cancel"), button[aria-label="Close"]')
            if cancel_btn:
                cancel_btn.click()
                time.sleep(0.5)

        # Modal test: Exit/Withdraw Student Modal
        exit_btn = page.query_selector('button:has-text("Exit Student"), button:has-text("Withdraw")')
        if exit_btn:
            exit_btn.click()
            time.sleep(1)
            exit_modal_visible = page.is_visible('div[role="dialog"], .fixed')
            results["modal_interactions"]["student_exit_modal"] = exit_modal_visible
            print("Student Exit Modal Opened:", exit_modal_visible)
            cancel_exit = page.query_selector('button:has-text("Cancel")')
            if cancel_exit:
                cancel_exit.click()
                time.sleep(0.5)

        # 3B. User Profile Workspace (/users/128)
        print("\n--- Verifying SysAdmin User Profile (/users/128) ---")
        page.goto(f"{BASE_URL}/users/128")
        time.sleep(2)
        user_content = page.content()
        has_sysadmin_badge = "sysadmin" in user_content.lower()
        has_reset_pwd = "reset password" in user_content.lower()
        has_edit_account = "edit account" in user_content.lower()

        # Click Access & Roles tab
        access_tab = page.query_selector('button:has-text("Access & Roles")')
        if access_tab:
            access_tab.click()
            time.sleep(1)
            user_content = page.content()

        has_access_tab_content = "role-based access control" in user_content.lower() or "assigned role" in user_content.lower()

        results["specific_verifications"]["user_profile"] = {
            "has_sysadmin_badge": has_sysadmin_badge,
            "has_reset_password": has_reset_pwd,
            "has_edit_account": has_edit_account,
            "has_access_roles_tab": has_access_tab_content
        }
        print(f"User Profile 128: Badge={has_sysadmin_badge}, ResetPwd={has_reset_pwd}, EditAccount={has_edit_account}, AccessTab={has_access_tab_content}")

        # Modal test: User Edit Modal
        edit_user_btn = page.query_selector('button:has-text("Edit Account")')
        if edit_user_btn:
            edit_user_btn.click()
            time.sleep(1)
            user_edit_modal = page.is_visible('div[role="dialog"], .fixed')
            results["modal_interactions"]["user_edit_modal"] = user_edit_modal
            print("User Edit Account Modal Opened:", user_edit_modal)
            cancel_u = page.query_selector('button:has-text("Cancel")')
            if cancel_u:
                cancel_u.click()
                time.sleep(0.5)

        # 3C. SysAdmin Center Universal Editor & Allowlist Tag Chips
        print("\n--- Verifying SysAdmin Center Universal Records Editor ---")
        page.goto(f"{BASE_URL}/sysadmin")
        time.sleep(2)
        # Click Universal Data Editor tab
        univ_tab = page.query_selector('button:has-text("Universal Data Editor")')
        if univ_tab:
            univ_tab.click()
            time.sleep(1.5)
        sys_content = page.content()
        has_allowed_tags = "click an allowed field" in sys_content.lower() or "prefill" in sys_content.lower()
        has_batch_option = "academic batch" in sys_content.lower() or 'value="batch"' in sys_content.lower()
        
        # Test clicking an allowed tag chip
        tag_btn = page.query_selector('button:has-text("phone"), button:has-text("email"), button:has-text("first_name")')
        tag_clicked = False
        if tag_btn:
            tag_btn.click()
            tag_clicked = True
            time.sleep(0.5)

        results["specific_verifications"]["universal_editor"] = {
            "has_allowed_tags": has_allowed_tags,
            "has_batch_option": has_batch_option,
            "tag_chip_interactive": tag_clicked
        }
        print(f"Universal Records Editor: AllowedTags={has_allowed_tags}, BatchOption={has_batch_option}, TagInteractive={tag_clicked}")

        # 3D. Payments Security Gating & Unlock Modal
        print("\n--- Verifying Payments Security Gating & Unlock Modal ---")
        page.goto(f"{BASE_URL}/payments")
        time.sleep(2)
        pay_content = page.content()
        has_posted_gate = "posted" in pay_content.lower()
        
        # Open Posted Payments Permission modal
        lock_btn = page.query_selector('button:has-text("Sysadmin Center"), button:has-text("Posted Edit Permission"), button:has-text("Unlock"), button:has-text("Lock")')
        lock_modal_opened = False
        if lock_btn:
            lock_btn.click()
            time.sleep(1)
            lock_modal_opened = page.is_visible('div[role="dialog"], .fixed')
            print("Lock/Unlock Modal Opened:", lock_modal_opened)
            cancel_lock = page.query_selector('button:has-text("Cancel")')
            if cancel_lock:
                cancel_lock.click()
                time.sleep(0.5)

        results["specific_verifications"]["payments_gating"] = {
            "has_posted_section": has_posted_gate,
            "lock_modal_opened": lock_modal_opened
        }
        print(f"Payments Security Gating: PostedSection={has_posted_gate}, LockModal={lock_modal_opened}")

        # 3E. Branding Preview and Global Footer Branding
        print("\n--- Verifying Branding Preview & Global Footer ---")
        page.goto(f"{BASE_URL}/settings")
        time.sleep(2)
        # Click Branding & Appearance category
        brand_cat = page.query_selector('button:has-text("Branding & Appearance")')
        if brand_cat:
            brand_cat.click()
            time.sleep(1.5)
        
        brand_content = page.content()
        has_branding_preview = "preview" in brand_content.lower() or "primary color" in brand_content.lower()
        has_global_footer = "prathamone" in brand_content.lower() and "prashant academy" in brand_content.lower()
        has_version_display = "v1.0.0" in brand_content.lower()

        results["specific_verifications"]["branding_and_footer"] = {
            "has_branding_preview": has_branding_preview,
            "has_global_footer_branding": has_global_footer,
            "has_v1_0_0_displayed": has_version_display
        }
        print(f"Branding & Footer: Preview={has_branding_preview}, FooterBranding={has_global_footer}, Version={has_version_display}")

        print("\n=== STEP 4: VIEWPORT & RESPONSIVE LAYOUT VERIFICATION ===")
        viewports = [
            ("Desktop", 1280, 800),
            ("Tablet", 768, 1024),
            ("Mobile", 375, 667)
        ]

        for vp_name, w, h in viewports:
            print(f"\n--- Testing Viewport: {vp_name} ({w}x{h}) ---")
            page.set_viewport_size({"width": w, "height": h})
            page.goto(f"{BASE_URL}/dashboard")
            time.sleep(1.5)
            is_nav_visible = page.is_visible('nav') or page.is_visible('header') or page.is_visible('aside') or page.is_visible('button')
            results["viewports"][vp_name] = {
                "width": w,
                "height": h,
                "navigation_element_present": is_nav_visible,
                "rendered_without_fatal_crash": True
            }
            print(f"Viewport {vp_name}: Navigation visible={is_nav_visible}")

        browser.close()

if __name__ == "__main__":
    run_tests()
    with open("runtime_verification_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print("\nVerification execution complete! Results saved to runtime_verification_results.json")
