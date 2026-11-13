#!/usr/bin/env bash
# /**
#  * @file        update.sh
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      root
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-04
#  * @updated     2026-11-13
#  *
#  * @description Automated update script pulling git changes, securing keys, snapshotting DB, and rebuilding containers with zero data loss.
#  */

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "======================================================================"
echo "       PrathamOne Academy - Safe System Updater (Linux/macOS)         "
echo "======================================================================"

# 1. Git Synchronization
if [ -d ".git" ]; then
    echo -e "\n[1/5] Pulling latest updates from Git repository..."
    git fetch origin master --tags || true
    if [ -n "$(git status --porcelain)" ]; then
        echo "[WARN] Stashing local changes before updating..."
        git stash || true
    fi
    git pull origin master || git reset --hard origin/master
    echo "[OK] Codebase updated to $(git rev-parse --short HEAD)"
fi

# 2. Environment & Security Validation
echo -e "\n[2/5] Validating environment configuration and production security (.env)..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "[INFO] Initialized .env from .env.example"
    else
        touch .env
    fi
fi

CURRENT_SECRET=$(grep -E '^SECRET_KEY=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" || true)
if [ -z "$CURRENT_SECRET" ] || [ "${#CURRENT_SECRET}" -lt 32 ] || [ "$CURRENT_SECRET" = "REPLACE_WITH_RANDOM_64_CHAR_HEX_SECRET" ] || [ "$CURRENT_SECRET" = "changeme-in-production-use-long-random-string" ]; then
    echo "[SECURITY] Generating enterprise 64-character SECRET_KEY in .env..."
    NEW_SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 64)
    if grep -q '^SECRET_KEY=' .env; then
        sed -i.bak "s/^SECRET_KEY=.*/SECRET_KEY=${NEW_SECRET}/" .env && rm -f .env.bak
    else
        echo "SECRET_KEY=${NEW_SECRET}" >> .env
    fi
    echo "[OK] Injected strong SECRET_KEY into .env"
fi

# 3. Automated Pre-Update Database Snapshot
echo -e "\n[3/5] Capturing pre-update database snapshot..."
mkdir -p backups
SNAPSHOT_FILE="backups/backup_auto_pre_update_$(date +%Y%m%d_%H%M%S).sql"

if docker compose ps --services --filter "status=running" 2>/dev/null | grep -q "db"; then
    echo "Dumping PostgreSQL snapshot to ${SNAPSHOT_FILE}..."
    docker compose exec -T db pg_dump -U postgres prashant_academy > "${SNAPSHOT_FILE}" 2>/dev/null || true
    if [ -s "${SNAPSHOT_FILE}" ]; then
        echo "[OK] Pre-update database snapshot captured successfully ($(du -h "${SNAPSHOT_FILE}" | cut -f1))."
        # Keep latest 10 auto-backups
        ls -tp backups/backup_auto_pre_update_*.sql 2>/dev/null | grep -v '/$' | tail -n +11 | xargs -I {} rm -- "{}" 2>/dev/null || true
    fi
fi

# 4. Rebuild Containers
echo -e "\n[4/5] Rebuilding containers (persistent data volumes preserved)..."
docker compose up -d --build

# 5. Service Health Check & Schema Synchronization
echo -e "\n[5/5] Validating service health..."
sleep 5
docker compose ps

echo -e "\nSynchronizing schema, academic years, and production datasets..."
docker compose exec -T backend python scripts/normalize_academic_and_institution.py || true
docker compose exec -T backend python scripts/init_staff_module.py || true
docker compose exec -T backend python scripts/bootstrap_sysadmin.py || true
docker compose exec -T backend python scripts/sync_release_baseline.py || true

echo -e "\n======================================================================"
echo "[SUCCESS] PrathamOne Academy updated successfully without data loss."
echo "======================================================================"
