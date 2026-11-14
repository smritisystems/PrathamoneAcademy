---
title: "Application Footer Product Edition and License Link"
module: "17_UI_UX_DESIGN"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-14"
updated_date: "2026-11-14"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Implemented"
tags: ["application-footer", "software-branding", "license-information"]
entities: []
api_routes: []
related_modules: ["UI/UX Design", "Help & About"]
---

# Application Footer Product Edition and License Link

## Implementation

The collapsed application footer now shows the PrathamOne product icon, the
Coaching Institute Edition label, and a link to software license information
on desktop. The expanded footer uses the full PrathamOne logo lockup beside
the edition label and the same license link.

Workspace, product edition, license link, connection status, and version are
visually grouped in a lightly tinted, bordered cluster in both footer states.
Tenant and branch identity stays outside that cluster.

The link opens **Help & About → Product & Version Information**
(`/help/version`), which already presents the live license status and validity.
The footer does not hard-code an active license, licensee, or expiry date.
Institution identity and its logo remain separate from software branding.

## Verification

- Footer component tests cover logo/edition rendering and the license link in
  both collapsed and expanded states.
- No license records, terms, or status values were changed.
- No deployment was performed.
