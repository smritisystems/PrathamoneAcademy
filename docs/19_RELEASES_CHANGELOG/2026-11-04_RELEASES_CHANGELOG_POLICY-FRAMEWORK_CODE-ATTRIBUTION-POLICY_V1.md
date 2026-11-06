---
title: "Source Code Attribution, Header, and Versioning Policy"
module: "19_RELEASES_CHANGELOG"
category: "POLICY-FRAMEWORK"
document_type: "POLICY-FRAMEWORK"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-04"
updated_date: "2026-11-04"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["19-releases-changelog", "policy-framework"]
entities: ["Release"]
api_routes: ["/api/v1/system/releases"]
related_modules: []
---

# Source Code Attribution, Header, and Versioning Policy

**Project:** Prashant Academy Coaching Institute Management System  
**Author:** Jawahar R. Mallah  
**Organization:** AITDL (AI Technology & Development Lab)  
**Client:** Prashant Academy Coaching Institute  
**Copyright:** Copyright (c) 2026 AITDL  
**License:** Proprietary  
**Current System Version:** 1.0.0  

---

## 1. Overview & Policy Objective

This policy establishes strict engineering governance across the **Prashant Academy Coaching Institute Management System** repository. Every first-party source code file is legally attributed to the creator and copyright owner, stamped with creation and modification timelines, categorized within the institute architecture, and governed under automated pre-commit and continuous integration checks.

---

## 2. Standard Source-Code Header Specification

Every first-party source file must begin with the standard attribution header using language-appropriate comment syntax.

### 2.1 Standard Header Template

```text
/**
 * @file        <filename>
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      <module name>
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     YYYY-MM-DD
 * @updated     YYYY-MM-DD
 *
 * @description <accurate file purpose>
 */
```

### 2.2 Language Syntax Standards

- **TypeScript / JavaScript / TSX / JSX / CSS (`c-style`)**:
  Enclosed within standard block comments: `/**` ... `*/`.
- **Python / Shell / Dockerfile (`hash-style`)**:
  Enclosed within hash comment prefixes: `# /**` ... `#  *` ... `#  */` or `# ` comments.
- **Shebang Preservation**:
  In scripts with shebang lines (e.g. `#!/usr/bin/env python3` or `#!/bin/sh`), the shebang line remains at line 1, and the header block immediately follows.

### 2.3 Required Header Fields & Verification Rules

| Field | Required Value / Format | Description |
| :--- | :--- | :--- |
| `@file` | Exact filename matching filesystem | Relative basename of the file (e.g. `Fees.tsx`) |
| `@project` | `PrathamOne Academy Coaching Institute Management System` | Official institutional project title |
| `@module` | Domain taxonomy (e.g. `frontend.pages`, `backend.app.api.v1`) | Architectural subsystem of the file |
| `@author` | `Jawahar R. Mallah` | Primary architect and author |
| `@organization` | `AITDL (AI Technology & Development Lab)` | Authoring technological organization |
| `@client` | `Prashant Academy Coaching Institute` | Client enterprise and beneficiary |
| `@copyright` | `Copyright (c) 2026 AITDL` | Legal copyright notice |
| `@license` | `Proprietary` | Proprietary software license restriction |
| `@version` | Semantic version string (defaults to `1.0.0`) | File-level version identifier |
| `@created` | ISO Date (`YYYY-MM-DD`) | Preserved historical authoring timestamp |
| `@updated` | ISO Date (`YYYY-MM-DD`) | Date of most recent meaningful change |
| `@description` | Descriptive sentence (> 5 characters) | Accurate, specific functional purpose |

---

## 3. Scope and Exclusions

The header system applies to **all first-party source code**. The following categories are strictly excluded:

1. **Third-Party Dependencies**:
   - `node_modules/`, `venv/`, `.venv/`, `env/`, `eggs/`, `__pycache__/`, `.pytest_cache/`, `.vitest_cache/`
2. **Build and Compilation Artifacts**:
   - `frontend/dist/`, `frontend/dist-ssr/`, `build/`, `dist/`
3. **Data Backups and Binary Assets**:
   - `backup_*.sql`, `.sqlite3`, `.db`, images (`.png`, `.jpg`, `.ico`), fonts (`.woff2`, `.ttf`)
4. **Formats Without Comment Syntax**:
   - Standard JSON (`package.json`, `package-lock.json`, `tsconfig.json`, `academic_settings.json`). Adding comment blocks to JSON invalidates `JSON.parse()` per RFC 8259.
5. **Git Internal Metadata**:
   - `.git/` objects, references, and logs.

---

## 4. Automation & Developer Tooling

### 4.1 CLI Header Manager (`scripts/manage_headers.py`)

A standalone, zero-dependency Python utility governs header enforcement:

```bash
# Verify compliance across all source files (exits 1 on missing/invalid headers)
python scripts/manage_headers.py check
# or
npm run headers:check

# Automatically insert missing headers or update timestamps
python scripts/manage_headers.py fix
# or
npm run headers:fix

# Check only Git-staged files
python scripts/manage_headers.py check --staged

# Update @updated timestamp on staged files
python scripts/manage_headers.py fix --staged --update-timestamp
```

### 4.2 Git Pre-Commit Hook (`.githooks/pre-commit`)

Automated Git pre-commit enforcement is configured at `.githooks/pre-commit`:
1. Inspects staged files before each commit.
2. Automatically inserts missing headers or updates `@updated` on changed files.
3. Stages the modified files before running the strict `headers:check` gate.
4. Prevents commits that violate attribution rules.

To activate the hook across developer environments:
```bash
git config core.hooksPath .githooks
```

### 4.3 Continuous Integration (`.github/workflows/header-check.yml`)

GitHub Actions automatically runs `python scripts/manage_headers.py check` on every push and pull request to `main`, `master`, and `develop` branches. Pull requests with missing or non-compliant headers fail CI immediately.

### 4.4 VS Code Snippets (`.vscode/header-snippets.code-snippets`)

When creating new files in VS Code, typing `header` and pressing `Tab` automatically populates the header with the active filename and date placeholders.

---

## 5. Semantic Versioning & Release Rules

The Prashant Academy platform adheres to **Semantic Versioning 2.0.0** (`MAJOR.MINOR.PATCH`).

### 5.1 Release Categories

- **MAJOR (`X.0.0`)**: Incompatible API changes, major architectural redesigns, or database breaking migrations requiring downtime.
- **MINOR (`1.X.0`)**: Backward-compatible new features, new pages, new REST endpoints, or non-breaking database schema additions.
- **PATCH (`1.0.X`)**: Backward-compatible bug fixes, UI styling refinements, test additions, or performance optimizations.

### 5.2 Release Automation Script (`scripts/version_bump.py`)

```bash
# Increment patch version (1.0.0 -> 1.0.1)
python scripts/version_bump.py patch

# Increment minor version (1.0.0 -> 1.1.0)
python scripts/version_bump.py minor

# Increment major version (1.0.0 -> 2.0.0)
python scripts/version_bump.py major

# Set an explicit version with an annotated git tag
python scripts/version_bump.py --set 1.2.0 --git-tag
```

### 5.3 Synchronized Version Manifests

The release tool synchronizes the version across:
1. `frontend/package.json` (`"version": "X.Y.Z"`)
2. `package.json` root workspace (`"version": "X.Y.Z"`)
3. `backend/app/core/config.py` (`VERSION: str = "X.Y.Z"`)
4. FastAPI OpenAPI metadata via `app = FastAPI(version=settings.VERSION)`

### 5.4 API Versioning Stability

- Public API endpoints reside under `/api/v1/`.
- All minor and patch releases must preserve backwards compatibility for `/api/v1/` routes.
- Any breaking contract changes require introducing a distinct versioned router namespace (e.g. `/api/v2/`).
