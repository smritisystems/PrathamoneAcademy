---
title: "Administrator User Manual: Device-Wise Security Binding"
module: "13_SYSADMIN_SETTINGS"
category: "USER-MANUAL"
document_type: "MANUAL"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-19"
updated_date: "2026-11-19"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["device-binding", "settings", "user-manual", "security", "sysadmin"]
entities: ["UserDevice", "InstitutionSetting", "AuditLog"]
api_routes: ["/api/v1/security/device-binding/settings", "/api/v1/security/device-binding/devices"]
related_modules: ["12_RBAC_SECURITY", "16_DATABASE_API"]
---

# PRATHAMONE EduOS — ADMINISTRATOR USER MANUAL: DEVICE-WISE SECURITY BINDING

**Document:** `docs/13_SYSADMIN_SETTINGS/2026-11-19_SYSADMIN-SETTINGS_USER-MANUAL_DEVICE-BINDING-SECURITY-GUIDE_V1.md`  
**Audience:** Institute Administrators, Principals, System Administrators  
**Product:** PrathamOne EduOS (Coaching Institute Edition)  

---

## 1. OVERVIEW & SAFETY PRINCIPLES

Device-Wise Security Binding is an **optional security feature** designed to prevent unauthorized account sharing and ensure teachers, accountants, and staff access coaching operations only from approved hardware.

> [!IMPORTANT]
> **Optional by Design:** Device Binding is **never mandatory**. It is disabled by default for all institutions. Disabling this feature never affects subscription licenses, user accounts, or stored device records.

---

## 2. NAVIGATION & WORKSPACE ACCESS

1. Log in to the PrathamOne EduOS administrative portal.
2. In the navigation sidebar, click **Settings**.
3. Under the **System & Governance** group, click **Security & Device Binding** (or navigate to `Settings → Security → Device Binding`).
4. Activate **Edit Mode** using the top header action button to make configuration adjustments.

---

## 3. CONFIGURING SECURITY POLICIES

### 3.1 Policy Modes
Select one of the four flexible operational modes:

1. **1. Disabled (Default):**
   - Open access for all authorized accounts from any browser or hardware.
   - Recommended for initial onboarding and standard operations.

2. **2. Optional Registration:**
   - Staff can register and name their devices (e.g. "Teacher Laptop", "Front Desk PC").
   - Unregistered devices continue to work normally without interruption.

3. **3. Registered Devices Only:**
   - Only devices previously registered and in `Active` status can log in.
   - Unregistered hardware is refused with a 403 access restriction message.

4. **4. Admin Approval Required:**
   - New devices automatically enter a `Pending Approval` queue upon login attempt.
   - Administrators must verify and approve the device before access is granted.

### 3.2 Shadow Mode (Safe Rollout)
Enable the **Shadow Mode** toggle when transitioning between policies. In shadow mode, the system monitors and audits all unrecognized device logins in the audit log without blocking user access.

---

## 4. VERIFICATION CONTROLS

- **Verification Method:** Choose between browser fingerprinting, TOTP OTP verification, dual-factor verification, or hardware security keys.
- **Maximum Registered Devices:** Configure the upper limit of devices permitted per user (default is 3, adjustable up to 10).
- **New Device Approval Policy:** Choose whether new hardware is automatically approved or requires manual administrator review.
- **OTP Verification Requirement:** Toggle compulsory one-time passcodes for hardware enrollment.
- **Device Management Permissions:** Control whether regular users can manage their own devices or if administration is restricted to institute leaders.

---

## 5. MANAGING THE DEVICE INVENTORY

The **Registered Devices Inventory** table displays all enrolled hardware:
- **Device & Type:** Icon and label indicating laptop, desktop, mobile, or classroom smart board.
- **User:** Full name and email of the account owner.
- **Fingerprint:** Truncated cryptographic fingerprint.
- **Status:** Active (green), Pending Approval (amber), or Revoked (rose).
- **Actions:**
  - Click **Approve** to authorize a pending device.
  - Click **Revoke** to deactivate a lost or deprecated device.
  - Click **Delete** to permanently purge a device record.

---

## 6. SAFE DISABLE PROCEDURE

If your institution decides to stop using device binding:
1. In the **Security & Device Binding** workspace, click **Safely Disable Binding**.
2. Confirm the prompt.
3. The system immediately restores unrestricted open authentication.
4. **All registered device records, user credentials, and historical audit logs remain completely preserved.**
