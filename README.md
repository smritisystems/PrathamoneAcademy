---
title: "PrathamOne EduOS Installation and Quickstart"
module: "02_INSTALLATION_DEPLOYMENT"
category: "INSTALLATION-GUIDE"
document_type: "GUIDE"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-14"
updated_date: "2026-11-14"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["installation", "quickstart", "docker", "bootstrap-security"]
entities: ["User"]
api_routes: []
related_modules: ["01_ARCHITECTURE", "12_RBAC_SECURITY"]
---

# PrathamOne Academy — Coaching Institute Management System
**Enterprise Edition · Client Deployment: Prashant Academy**

[![Docker Compose](https://img.shields.io/badge/Docker-Compose%20v2-blue.svg)](https://docs.docker.com/compose/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-3178C6.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16--alpine-336791.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](#)

A high-integrity, production-ready Coaching Institute and Academy Management System engineered for multi-board curriculum structures (CBSE, ICSE, Maharashtra SSC/HSC), automated fee ledgers, atomic payment allocations, Excel-like analytical reporting grids, student portals, and centralized DPDP Act compliant KYC print forms.

---

## 1. One-Command Quickstart

### A. Windows (PowerShell)
Open an elevated PowerShell prompt (or standard PowerShell, which will auto-elevate) and run:

```powershell
git clone https://github.com/smritisystems/PrathamoneAcademy.git; cd PrathamoneAcademy; Set-ExecutionPolicy -Scope Process Bypass -Force; .\install.ps1
```

> **What this does automatically:**
> 1. Verifies Windows version, virtualization, and WSL 2 prerequisites.
> 2. Detects or installs Docker Desktop via `winget` and starts the daemon.
> 3. Generates a secure, cryptographically random `SECRET_KEY` in `.env`.
> 4. Prompts securely for the initial administrator password; it is passed only to a one-time seed command.
> 5. Runs migrations and one-time account seeding with the supplied password, then launches containers and verifies service health.
> 6. Displays live container status and application access URLs.

---

### B. Linux / macOS (Bash)
Run in your terminal:

```bash
git clone https://github.com/smritisystems/PrathamoneAcademy.git && cd PrathamoneAcademy && chmod +x *.sh && ./install.sh
```

---

### C. Standard Docker Compose (Universal)
If you already have Docker installed and running:

```bash
git clone https://github.com/smritisystems/PrathamoneAcademy.git
cd PrathamoneAcademy
cp .env.example .env
# Prefer install.sh or install.ps1 for the secure interactive password prompts.
# For a manual first install, set INITIAL_ADMIN_PASSWORD in the current shell
# through a hidden prompt (do not put it in .env or a command-line literal).
docker compose build backend
# Set INITIAL_ADMIN_PASSWORD using a hidden prompt, then run:
docker compose run --rm -e INITIAL_ADMIN_PASSWORD -e INITIAL_ACCOUNTANT_PASSWORD backend sh -c "alembic upgrade head && python seed.py --bootstrap-only"
# If an accountant account already exists, also set INITIAL_ACCOUNTANT_PASSWORD
# to rotate it. Clear both variables before starting the application.
unset INITIAL_ADMIN_PASSWORD INITIAL_ACCOUNTANT_PASSWORD
docker compose up -d --build
```

The one-time seed command requires an administrator password of at least 14 characters. If an accountant account exists from an older install, its password must also be rotated. The installer scripts perform this bootstrap interactively, pass secrets only to the temporary seed container, and clear them before starting the application.
The commands above are Bash examples; on Windows, use `install.ps1` or clear the variables with `Remove-Item Env:\INITIAL_ADMIN_PASSWORD, Env:\INITIAL_ACCOUNTANT_PASSWORD`.

---

## 2. Default Access & Ports

| Service | URL / Port | Credentials / Purpose |
| :--- | :--- | :--- |
| **Web Application** | [http://localhost](http://localhost) (or `:5173`) | Production Single Page Application |
| **Backend REST API** | [http://localhost:8000](http://localhost:8000) | FastAPI Core API Engine |
| **Interactive API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Swagger OpenAPI Specification |
| **Administrator Account** | `admin` | Password is chosen securely during initial setup |
| **PostgreSQL Database** | `localhost:5432` | User: `postgres`, Pass: `postgres`, DB: `prashant_academy` |

---

## 3. Technology Architecture

```
                    ┌─────────────────────────┐
                    │      Web Browser        │
                    └────────────┬────────────┘
                                 │ HTTP (Port 80)
                    ┌────────────▼────────────┐
                    │  Frontend (Nginx Proxy) │
                    └────────────┬────────────┘
                 /api/*          │           Static Assets
         ┌───────────────────────┘           (HTML5/React/Vite)
         │
┌────────▼────────────────┐         ┌─────────────────────────┐
│  Backend (FastAPI)      ├─────────►  PostgreSQL 16 Database │
│  Python 3.11 + AsyncIO  │ asyncpg │  (Persistent Docker Vol)│
└─────────────────────────┘         └─────────────────────────┘
```

- **Backend:** Python 3.11, FastAPI, SQLAlchemy 2.0 (asyncio + asyncpg), Alembic, Pydantic v2.
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, TanStack Query v5, Zustand, Recharts, Lucide Icons.
- **Data Persistence:** Dedicated Docker named volume `pgdata` persisting all transactional and master records across restarts and upgrades.
- **Security:** OAuth2 password flow with JWT (`HS256`), bcrypt password hashing, and sanitized client-side exports with formula-injection escaping.

---

## 4. Routine Operations & Maintenance

### Safe Updates (Zero Data Loss)
Pulls latest changes, rebuilds containers, runs pending migrations, and restarts services while preserving persistent database volumes:

- **Windows:** `.\update.ps1`
- **Linux / macOS:** `./update.sh`
- **Docker Compose:** `git pull && docker compose up -d --build`

### Database Backups
Creates verified, timestamped PostgreSQL dumps in the `backups/` directory:

- **Windows:** `.\backup.ps1`
- **Linux / macOS:** `./backup.sh`

### Database Restoration
Restores a previous database snapshot cleanly:

- **Windows:** `.\restore.ps1 -BackupFile "backups\prathamone_backup_YYYYMMDD_HHMMSS.sql"`
- **Linux / macOS:** `./restore.sh backups/prathamone_backup_YYYYMMDD_HHMMSS.sql`

---

## 5. System Prerequisites

- **Operating System:**
  - Windows 10 (Build 19041+) or Windows 11 with WSL 2 enabled.
  - Linux (Ubuntu 20.04+, Debian 11+, Fedora 36+, RHEL 9+).
  - macOS Monterey (12+) or newer with Docker Desktop.
- **Hardware Resources:**
  - Minimum 4 GB RAM (8 GB recommended).
  - 10 GB free disk space.
  - 64-bit CPU with Hardware Virtualization enabled in BIOS (VT-x / AMD-V).
- **Software Dependencies:**
  - Git 2.30+
  - Docker Engine 24.0+ and Docker Compose v2.0+ (auto-installed on Windows via `winget` if missing).

---

## 6. Troubleshooting

1. **Port 80 or 8000 Already in Use:**
   If another application is using port 80 or 8000, adjust `ports` in `docker-compose.yml`:
   ```yaml
   frontend:
     ports:
       - "8080:80"
   ```
2. **Inspect Container Logs:**
   ```bash
   docker compose logs -f backend
   docker compose logs -f db
   docker compose logs -f frontend
   ```
3. **Database Connection Errors:**
   Verify the database container is healthy:
   ```bash
   docker compose ps
   docker exec -it prashant_academy_db pg_isready -U postgres -d prashant_academy
   ```
4. **Re-seeding or Resetting Data:**
   Run the authoritative import script:
   ```bash
   docker compose exec backend python scripts/import_padata_excel.py
   ```

---

## 7. Clean Uninstallation

To stop services and remove containers while preserving your database:
```bash
docker compose down
```

To remove all containers, networks, and persistent database volumes:
```bash
docker compose down -v
```

---

## 8. Authorship & Governance

- **System:** PrathamOne Academy Management System
- **Client Deployment:** Prashant Academy Coaching Institute (Branch: Jankalyan Nagar, Malad West)
- **Author & Lead Architect:** Jawahar R. Mallah
- **Organization:** AITDL (AI Technology & Development Lab)
- **Copyright:** Copyright (c) 2026 AITDL. All rights reserved.
- **License:** Proprietary
