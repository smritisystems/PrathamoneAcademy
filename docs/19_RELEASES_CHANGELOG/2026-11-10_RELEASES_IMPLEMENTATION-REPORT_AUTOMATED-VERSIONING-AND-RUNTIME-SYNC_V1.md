---
title: "Release & Change Management Runtime Synchronization Report"
module: "19_RELEASES_CHANGELOG"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.72.1"
doc_version: "1.0"
created_date: "2026-11-10"
updated_date: "2026-11-10"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["releases", "versioning", "semver", "docker", "governance", "audit"]
entities: ["SystemRelease", "ReleaseService"]
api_routes: ["/api/v1/releases/current", "/api/v1/releases/pending-changes"]
related_modules: ["01_ARCHITECTURE", "12_RBAC_SECURITY", "13_SYSADMIN_SETTINGS"]
---

# Release & Change Management Runtime Synchronization Report

## 1. Executive Summary

During operational audit of the **Release & Change Governance** workspace (`/releases`), an environmental mismatch was identified:
- The dashboard top card displayed `ACTIVE VERSION: v1.52.1 PROD` and `Build: 2026.11.09-REV-092-v1.52.1-E11B82E`.
- The Pending Changes card reported `Discovered 0 unreleased commits and 0 modified files since v1.52.1`, proposing `v1.52.2 (PATCH)`.
- Meanwhile, the application footer displayed `v1.60.1`, and host Git repository revision counting reported **v1.72.1** with **132 revisions**.

This report documents the forensic root-cause analysis, container-host decoupling architecture, manifest-based synchronization engine, and verification.

---

## 2. Root Cause Analysis (RCA)

1. **Docker Container Boundary Isolation:**
   - The backend container `prashant_academy_backend` is a lightweight Python runtime without the `git` binary installed and without the host `.git` repository folder mounted.
   - When `ReleaseService.get_git_commits()` or `ReleaseService.get_git_changed_files()` executed, `subprocess.check_output(["git", ...])` failed silently and caught exceptions, returning empty arrays `[]`.
   - Consequently, `pending_changes` reported `0` unreleased commits and proposed a minor patch to `1.52.1`.

2. **Database SystemRelease Synchronization Gap:**
   - The database table `system_releases` had its latest published release frozen at ID 6 (`v1.52.1`, published on 2026-11-10 07:27 UTC).
   - In `scripts/auto_version.py`, `run_database_release_sync` previously attempted `docker-compose exec -T backend python -c ...` which failed silently on Windows environments due to PowerShell multi-line argument formatting and command-line length limitations.

---

## 3. Engineering Solution & Implementation

### 3.1 Host-Side Release Manifest Generation (`auto_version.py`)
- Added `generate_release_manifest()` in `scripts/auto_version.py` that runs on the host with full Git access.
- Generates `backend/app/release_manifest.json` containing:
  - Authoritative SemVer version (`v1.72.1`)
  - Build identifier (`2026.11.10-REV-132-v1.72.1-D28473B`)
  - Complete list of chronological commits from baseline `c556dd9` to `HEAD` categorized into conventional semantic categories (`added`, `changed`, `fixed`, `security`, `database`, `deprecated`)
  - Tracked and modified files with affected module classification
  - Pre-rendered GitHub-Flavored Markdown release notes
- Since `./backend` is mounted into the container at `/app`, `release_manifest.json` is instantly available inside the container at `/app/app/release_manifest.json`.

### 3.2 Standard Input Container Database Sync
- Re-engineered `run_database_release_sync()` in `scripts/auto_version.py` to pipe Python execution directly through `stdin` using `docker exec -i prashant_academy_backend python -`.
- The container script reads metadata directly from `/app/app/release_manifest.json`, eliminating all shell escaping and parameter binding issues.

### 3.3 Containerized Runtime Fallback & Auto-Sync (`ReleaseService`)
- Added `ReleaseService.get_manifest_data()` in `backend/app/services/release_service.py` to seamlessly read `release_manifest.json` whenever `git` CLI is unavailable.
- Updated `ReleaseService.get_git_commits()`: if `git log` fails, it slices unreleased commits from the manifest's `all_commits` based on `since_commit`.
- Updated `ReleaseService.get_git_changed_files()`: if `git diff` fails, it loads changed files from the manifest.
- Enhanced `ReleaseService.get_current_release()` with automated database synchronization: if the database's published release is older than the deployed `settings.VERSION` or manifest, it automatically registers/updates the published release in `system_releases`.
- Aligned `ReleaseService.get_pending_changes()` to evaluate unreleased changes against the auto-synchronized current release.

---

## 4. Verification & Evidence

1. **HTTP API Verification:**
   - `GET /api/v1/releases/current` returns `v1.72.1`, `Build: 2026.11.10-REV-132-v1.72.1-D28473B`, `Status: published`.
   - `GET /api/v1/releases/pending-changes` accurately tracks commits against baseline commit `D28473B`.
2. **Backend Regression Test Suite:**
   - `docker exec prashant_academy_backend pytest tests/test_release_management.py` -> 6 passed in 11.74s.
3. **Frontend Production Build:**
   - `npm --prefix frontend run build` succeeded with zero TypeScript errors in 27.72s.
   - Deployed to `prashant_academy_frontend`.
4. **Visual Capture:**
   - Captured `live_releases_dashboard.png`: Active Version card, proposed bump, affected modules, and footer are 100% aligned to `v1.72.1` (`REV-132`).
   - Captured `live_releases_notes.png`: Official release notes display complete academic and financial baseline notes.
   - Captured `live_releases_history.png`: History reflects published `v1.72.1` GA release.
5. **Attribution & Header Verification:**
   - `python scripts/manage_headers.py check` -> 509 files checked, 100% compliant.
