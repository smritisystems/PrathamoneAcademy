---
title: "Accessibility Gaps and Theme Acceptance Requirements"
module: "17_UI_UX_DESIGN"
category: "ACCESSIBILITY-AUDIT"
document_type: "AUDIT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-17"
updated_date: "2026-11-17"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "In Progress"
tags: ["accessibility", "contrast", "keyboard", "wcag"]
entities: ["DesignToken", "InteractiveControl"]
api_routes: []
related_modules: ["17_UI_UX_DESIGN", "18_TESTING_QA"]
---

# Accessibility Gaps and Theme Acceptance Requirements

## Audit qualification

This is a source-based risk assessment, not a complete WCAG conformance audit. No automated axe/pa11y scan, screen-reader test, keyboard audit, or full rendered-page contrast sampling was executed as part of the repository audit. Findings below are specific risks/evidence, not a claim that every instance fails.

## Color and visual risks

- Approved product default `#F16906` on white is approximately 3.10:1, below 4.5:1 for normal text; do not use it as normal-sized text on white.
- Accessible orange `#C85200` on white is approximately 4.50:1, leaving little margin. The dark-mode accessible orange is `#FDBA74`; verify all actual pairings.
- The requested navy `#0B2D6B` has strong estimated contrast on white (approximately 13.11:1), but contrast against the requested dark page background and colored surfaces still needs checking.
- Hardcoded hex values and one-off utility colors can bypass token-level contrast review.
- Charts and status chips may encode information only through color; inspect series distinguishability and add labels/patterns/markers where needed.

## Interaction and theme risks

- Theme mode now uses an explicit root class; the six pre-existing `dark:`-utility files and all other routes still require review for complete state consistency.
- Root classes and raw SVG fill/stroke values can bypass semantic color changes.
- Focus indicators, disabled states, placeholders, error text, overlays, and selection states need per-mode review.
- Theme control needs an accessible name, keyboard operation, visible focus, and announced state; mode changes must not rely on color alone.
- For a saved `system` choice, listen for operating-system preference changes and update without disrupting user interaction.

## Required acceptance criteria

- WCAG AA text contrast: 4.5:1 normal text and 3:1 large text.
- Meaningful non-text UI components and focus indicators: 3:1 against adjacent colors where applicable.
- Information is not conveyed by color alone; charts, status, errors, and selected states include text/icon/shape cues.
- Keyboard-only operation for theme selector, navigation drawer, menus, forms, and dialogs; clear focus appearance in both modes.
- Accessible names and state announcement for appearance controls; respect reduced motion and avoid flashing transitions.
- 200% zoom/reflow review and screen-reader spot check for the shared controls and shell.
- Print/PDF remains legible in grayscale and does not depend on background fills to convey meaning.

## Validation status and recommended tools

Light, dark, and System mode switching were checked in a local browser preview; focused store tests pass. No automated axe/pa11y scan, complete screen-reader test, keyboard audit, or full rendered-page contrast sampling was executed. Use existing test infrastructure; add no dependency without approval. Manual keyboard, screen-reader, and contrast checks remain necessary.
