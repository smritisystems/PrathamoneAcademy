---
title: "Attendance Module User Manual"
module: "07_ATTENDANCE"
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
tags: ["07-attendance", "specification"]
entities: ["Attendance"]
api_routes: ["/api/v1/attendance"]
related_modules: []
---

# Attendance Module User Manual

**Target Audience**: Teachers, Class Coordinators, Administrators  

---

## 1. Marking Daily Class Attendance

1. Navigate to **Attendance** from the sidebar menu.
2. Select:
   - **Standard**: (e.g., `Standard 10`)
   - **Division**: (e.g., `Division A`)
   - **Attendance Date**: (defaults to today)
3. The student roster loads automatically.
4. All students default to **Present**.
5. Use quick buttons:
   - **✓ All Present**: Sets everyone to Present.
   - **✕ All Absent**: Sets everyone to Absent.
6. For individual students, click the corresponding status tag:
   - Green: `Present`
   - Red: `Absent`
   - Yellow: `Late`
   - Purple: `Half Day`
7. Add optional remarks (e.g., `Medical leave requested`).
8. Check the top summary bar: Total students, Present count, Absent count, and Attendance percentage.
9. Click **💾 Save Attendance Register** at the bottom right.
10. A success notification confirms the submission.

