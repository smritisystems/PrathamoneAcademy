---
title: "User Management Changelog"
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

# User Management Changelog

## [1.0.0] - 2024-01-01
### Added
- User directory and credential management UI in `Users.tsx`.
- Role assignment and password hashing endpoints in `users.py`.
- Session token inspection and role validation dependencies in `deps.py`.

