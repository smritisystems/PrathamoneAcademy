---
title: "User Management User Manual"
module: "12_RBAC_SECURITY"
category: "SPECIFICATION"
document_type: "SPECIFICATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-03"
updated_date: "2026-11-03"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["12-rbac-security", "specification"]
entities: ["User", "Role", "Permission", "UserRole"]
api_routes: ["/api/v1/users", "/api/v1/auth"]
related_modules: []
---

# User Management User Manual

**Target Audience**: Super Administrators, Branch Directors  

---

## 1. Creating a Staff Account
1. Click **Users** on the sidebar menu.
2. In the top-right corner, click **+ Add User Account**.
3. Fill in the required fields:
   - **First Name** & **Last Name**: Staff member's name.
   - **Username**: Unique login identifier (e.g., `rahul_teacher`).
   - **Email Address**: Institutional email.
   - **Password**: Initial password (min 8 characters).
   - **System Role**: Select from the role dropdown:
     - Super Admin / Owner
     - Institute Administrator
     - Accountant
     - Admission Counselor
     - Academic Coordinator
     - Teacher
     - Support Staff
4. Click **Create Account**.
5. Provide the credentials to the staff member.

---

## 2. Deactivating a User Account
1. Find the user row in the Users table.
2. Click the red **Delete** button.
3. Confirm the browser prompt. The user account is deactivated and will immediately be prevented from logging in.

