# User Management Module Specification

**Module**: Users, Roles & Authorization  
**Version**: 1.0.0  
**Status**: IMPLEMENTED  

---

## 1. Purpose & Scope
Provides staff account management, credential provisioning, role assignment, and access control enforcement for Prashant Academy personnel.

---

## 2. Features
- User directory with username, email, full name, role, and active status.
- Add user account modal with password hashing.
- Role assignments: Super Admin, Admin, Accountant, Counselor, Coordinator, Teacher, Staff.
- Deactivation of staff accounts.
- Audit log linking to all user-initiated state mutations.

---

## 3. Business Rules
- Only `superadmin` and `admin` roles can create or modify system users.
- Passwords must be at least 8 characters and are hashed using `bcrypt`.
- Active user tokens are validated on every authenticated HTTP request.

