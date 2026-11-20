---
title: "PrathamOne EduOS — Plug-and-Play WhatsApp & Omnichannel Communication Gateway Manual"
module: "15_INTEGRATIONS"
category: "USER-MANUAL"
document_type: "GUIDE"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.146.1"
doc_version: "1.0"
created_date: "2026-11-20"
updated_date: "2026-11-20"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["whatsapp-gateway", "telecom-dlt", "omnichannel-communication", "wati", "aisensy", "gupshup", "meta-cloud-api", "indian-coaching"]
entities: ["PrathamOneEduOS", "WhatsAppGateway", "CommunicationCenter"]
api_routes: ["/communication/gateways", "/communication/gateways/whatsapp", "/communication/settings", "/communication/diagnostics"]
related_modules: ["13_SYSADMIN_SETTINGS", "15_INTEGRATIONS", "09_FEES_PAYMENTS", "07_ATTENDANCE"]
---

# PRATHAMONE EduOS (Coaching Institute Edition)
## Plug-and-Play WhatsApp & Omnichannel Communication Gateway Manual

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Author:** Jawahar R. Mallah  
**Organization:** Smritisys & AITDL Networks  
**Target Audience:** Coaching Institute Administrators, IT Officers, and Center Directors  
**Date:** November 20, 2026  

---

## 1. Executive Overview

In the Indian education ecosystem, parents rarely open dedicated coaching mobile apps or email newsletters. **WhatsApp is the de-facto operating channel** for:
1. **Instant Fee Receipts:** PDF receipt links dispatched <3 seconds after payment.
2. **Attendance Absence Triggers:** Instant arrival & departure logs eliminating parent anxiety.
3. **Weekly Test Marks & Rank Cards:** NEET/JEE mock test rankings sent straight to parents.
4. **Automated Installment Reminders:** Gentle payment alerts scheduled 3 days before and 1 day after due dates.

PrathamOne EduOS provides a **Plug-and-Play Gateway Hub** (`/communication/settings`) supporting:
- **Zero-Cost Direct Dispatch (`wa.me`):** Instant desktop/mobile WhatsApp Web link generation requiring zero API setup or credentials.
- **Official Meta Cloud API:** Direct Graph API connection with zero third-party markups.
- **Popular Indian WhatsApp BSPs:** Pre-configured connectors for **WATI**, **AiSensy**, **Gupshup**, and **Interakt**.
- **Telecom DLT SMS Compliance:** TRAI-compliant Principal Entity (PE-ID), Telemarketer ID (TM-ID), and registered Header IDs (e.g. `PRASHT`).

---

## 2. Supported WhatsApp Providers & Configuration Matrix

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        SUPPORTED WHATSAPP GATEWAY PROVIDERS                            │
├─────────────────────┬──────────────────────┬───────────────────────────────────────────┤
│ Provider Name       │ Architecture / Mode  │ Required Authentication Fields            │
├─────────────────────┼──────────────────────┼───────────────────────────────────────────┤
│ 1. WhatsApp Web     │ Browser Deep-Link    │ None (Works out of the box, zero API fee) │
│    (wa.me Direct)   │                      │                                           │
├─────────────────────┼──────────────────────┼───────────────────────────────────────────┤
│ 2. Meta Cloud API   │ Official Graph API   │ • Phone Number ID                         │
│    (Direct)         │                      │ • WABA ID (Business Account ID)           │
│                     │                      │ • System User Access Token / API Key      │
├─────────────────────┼──────────────────────┼───────────────────────────────────────────┤
│ 3. WATI             │ Clare.ai Enterprise  │ • API Endpoint URL (e.g. live-server.wati)│
│                     │                      │ • Bearer Access Token                     │
├─────────────────────┼──────────────────────┼───────────────────────────────────────────┤
│ 4. AiSensy          │ Indian Smart BSP     │ • AiSensy Project API Key                 │
│                     │                      │ • Pre-approved Campaign Tag               │
├─────────────────────┼──────────────────────┼───────────────────────────────────────────┤
│ 5. Gupshup          │ Enterprise Tier      │ • Gupshup App Name                        │
│                     │                      │ • Enterprise API Key                      │
├─────────────────────┼──────────────────────┼───────────────────────────────────────────┤
│ 6. Interakt         │ Jio Haptik Suite     │ • Secret API Key                          │
└─────────────────────┴──────────────────────┴───────────────────────────────────────────┘
```

---

## 3. Step-by-Step Self-Service Setup Guide

### Option A: Instant Zero-Cost Mode (WhatsApp Web Deep Links)
1. Navigate to `/communication/settings`.
2. Set **Default Dispatch Channel** to `WHATSAPP (wa.me)`.
3. When staff collect fees or review overdue installments, clicking the **"WhatsApp"** badge opens WhatsApp Web with the parent's phone number and pre-filled message instantly.
4. *Cost: ₹0.00 / Zero API Approvals Needed.*

### Option B: Automated Meta WhatsApp Cloud API Setup
1. Log in to [Meta for Developers](https://developers.facebook.com/) and create a WhatsApp Business App.
2. In PrathamOne EduOS under `/communication/settings`:
   - Enter **Phone Number ID** (e.g. `1092837465...`).
   - Enter **WABA Business Account ID** (e.g. `198273645...`).
   - Enter **System User Token / API Key**.
3. Click **"Save Gateway Configuration"**.
4. Test connectivity using the diagnostic tester:
   - Destination: Enter your mobile number.
   - Click **"Send Verification Ping"**.
   - Confirmation receipt will arrive on WhatsApp within 2 seconds.

---

## 4. Telecom DLT SMS Regulatory Compliance (TRAI)

For coaching institutes requiring SMS fallback:
1. Register on your telecom DLT portal (Jio, Airtel, Vodafone-Idea, or BSNL DLT).
2. Enter your **6-character Header / Sender ID** (e.g. `PRASHT`).
3. Enter your **Principal Entity ID (PE-ID)** and **Telemarketer ID (TM-ID)**.
4. Registered templates (Fees, Attendance, OTP) are automatically matched to DLT Content Template IDs (CT-ID).

---

## 5. Automated Trigger Rules & Quiet Hours

Under `/communication/settings`, center directors can enforce:
* **Quiet Hours:** Block automated dispatches between **09:30 PM and 07:00 AM IST** to maintain parental privacy.
* **Throttle Limits:** Rate-limit dispatches to max 100 messages/minute to prevent WhatsApp number flagging.
* **Auto-Receipt Sharing:** Automatically trigger a WhatsApp receipt upon posting any fee collection.
* **Absence Alert Window:** Automatically dispatch an absentee alert 15 minutes after batch start time.
