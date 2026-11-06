---
title: "PrathamOne Academy — GitHub Integration & One-Command Deployment Report"
module: "02_INSTALLATION_DEPLOYMENT"
category: "IMPLEMENTATION-REPORT"
document_type: "IMPLEMENTATION-REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-04"
updated_date: "2026-11-04"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["02-installation-deployment", "implementation-report"]
entities: []
api_routes: ["/health"]
related_modules: []
---

# PrathamOne Academy — GitHub Integration & One-Command Deployment Report

**Document Reference:** `PRATHAMONE-GITHUB-DOCKER-DEPLOY-20261104`  
**Repository:** [`https://github.com/smritisystems/PrathamoneAcademy.git`](https://github.com/smritisystems/PrathamoneAcademy.git)  
**Client:** Prashant Academy Coaching Institute  
**System:** PrathamOne Academy Coaching Institute Management System  
**Lead Architect & Author:** Jawahar R. Mallah  
**Organization:** AITDL (AI Technology & Development Lab)  
**Date of Execution:** 2026-11-04  

---

## 1. Executive Summary

The local PrathamOne Academy project was connected and pushed to the newly provisioned GitHub repository under `smritisystems/PrathamoneAcademy`. Production-ready single-command automated installers, update scripts, and backup/restore utilities were engineered, validated, and tested for both Windows PowerShell and Linux/macOS environments.

All proprietary code attribution headers, test suites, and strict credential exclusion rules (`.gitignore`) were enforced. Zero database dumps, credentials, or environment secrets were committed.

---

## 2. GitHub Connection & Push Details

| Property | Value |
| :--- | :--- |
| **Owner** | `smritisystems` |
| **Repository Name** | `PrathamoneAcademy` |
| **Remote Origin URL** | `https://github.com/smritisystems/PrathamoneAcademy.git` |
| **Pushed Branches** | `master` (default) and `main` (synchronized) |
| **Initial Commit Message** | `Initial commit - PrathamOne Academy` |
| **Initial Commit Hash** | `50119c1ce43bbfd1c28bb1dc652e2b05be830aa4` |
| **Latest Release Commit** | `faaebaf` (`feat(installer): polish PowerShell deployment and backup utilities`) |
| **Total Files Tracked** | 248 source, documentation, test, and configuration files |
| **Files Excluded / Ignored** | `.env`, `.env.production`, `*.sql` database dumps, `backups/`, `node_modules/`, `frontend/dist/`, `__pycache__/`, `.pytest_cache/`, `.vscode/` |

---

## 3. One-Command Installation Workflows

### A. Windows (PowerShell)
Automated single-command installer for Windows 10/11 environments:

```powershell
git clone https://github.com/smritisystems/PrathamoneAcademy.git; cd PrathamoneAcademy; Set-ExecutionPolicy -Scope Process Bypass -Force; .\install.ps1
```

#### Capabilities of `install.ps1`:
1. **Administrative Elevation:** Detects execution privilege; auto-elevates if not currently running as administrator.
2. **Prerequisites Check:** Validates Windows 10 (Build 19041+) / Windows 11 and BIOS hardware virtualization.
3. **Docker Desktop Automation:** Detects Docker; installs Docker Desktop via `winget` if missing, activates WSL 2 features, launches Docker Desktop, and waits up to 90 seconds for the daemon to report healthy.
4. **Environment Initialization:** Safely provisions `.env` from [`.env.example`](file:///F:/PrashantAcademy/.env.example) and generates a cryptographically secure 64-character `SECRET_KEY`. Existing `.env` files are never overwritten.
5. **Docker Compose Execution:** Runs `docker compose up -d --build` with automatic dependency ordering and persistent volume attachments.
6. **Health Validation:** Polls `http://localhost:8000/health` and verifies database migration completion before printing access endpoints.

---

### B. Linux & macOS (Bash)
Automated single-command installer for Unix-like environments:

```bash
git clone https://github.com/smritisystems/PrathamoneAcademy.git && cd PrathamoneAcademy && chmod +x *.sh && ./install.sh
```

#### Capabilities of `install.sh`:
1. Verifies Docker Engine, Docker Compose v2, and daemon connectivity.
2. Creates `.env` with a secure random secret key generated via `openssl rand -hex 32`.
3. Dispatches multi-container build and launch via Docker Compose.
4. Polls service health and displays connection parameters.

---

## 4. Operational Scripts & Maintenance

All utilities are cross-platform, idempotent, and designed to guarantee zero data loss:

| Operation | Windows Script | Linux/macOS Script | Description |
| :--- | :--- | :--- | :--- |
| **Safe Update** | [`.\update.ps1`](file:///F:/PrashantAcademy/update.ps1) | [`./update.sh`](file:///F:/PrashantAcademy/update.sh) | Pulls git changes, rebuilds containers, runs pending migrations, preserves `pgdata` volume |
| **Database Backup** | [`.\backup.ps1`](file:///F:/PrashantAcademy/backup.ps1) | [`./backup.sh`](file:///F:/PrashantAcademy/backup.sh) | Executes atomic `pg_dump` into `backups/prathamone_backup_<timestamp>.sql` and verifies byte size |
| **Database Restore** | [`.\restore.ps1`](file:///F:/PrashantAcademy/restore.ps1) | [`./restore.sh`](file:///F:/PrashantAcademy/restore.sh) | Restores specified `.sql` snapshot cleanly with confirmation and safe service restarts |

---

## 5. Live Service Verification Results

Following the execution of `install.ps1`:

```
NAME                        IMAGE                      STATUS                            PORTS
prashant_academy_backend    prashantacademy-backend    Up (healthy)                      0.0.0.0:8000->8000/tcp
prashant_academy_db         postgres:16-alpine         Up (healthy)                      0.0.0.0:5432->5432/tcp
prashant_academy_frontend   prashantacademy-frontend   Up (healthy)                      0.0.0.0:80->80/tcp, 0.0.0.0:5173->80/tcp
```

- **Backend Health Check:** `http://localhost:8000/health` returned `{"status":"healthy"}` (HTTP 200).
- **Frontend SPA Routing:** `http://localhost/` returned `HTTP/1.1 200 OK` (Nginx reverse proxy).
- **Database Backup Verification:** [`backup.ps1`](file:///F:/PrashantAcademy/backup.ps1) generated `F:\PrashantAcademy\backups\prathamone_backup_20261104_165957.sql` (664,688 bytes) and confirmed database dump integrity.
- **Git Working Tree:** Clean on `master` and `main`, synchronized with remote `origin`.
