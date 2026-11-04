#!/usr/bin/env bash
# /**
#  * @file        restore.sh
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
#  * @updated     2026-11-04
#  *
#  * @description Automated database restoration script for PostgreSQL container.
#  */

set -euo pipefail

CONTAINER_NAME="prashant_academy_db"
DB_USER="postgres"
DB_NAME="prashant_academy"

if [ $# -lt 1 ]; then
    echo "Usage: $0 <path_to_backup_file.sql>"
    exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
    echo "[ERROR] Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "======================================================================"
echo "       PrathamOne Academy - Database Restore Utility                  "
echo "======================================================================"
echo "Target Backup: $BACKUP_FILE"
read -r -p "WARNING: Restoring will overwrite existing database records. Proceed? (y/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[yY]([eE][sS])?$ ]]; then
    echo "Restoration cancelled by user."
    exit 0
fi

echo "Stopping application services..."
docker compose stop backend frontend || true

echo "Restoring database schema and records..."
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"

echo "Restarting application services..."
docker compose start backend frontend

echo -e "\n======================================================================"
echo "             DATABASE RESTORE COMPLETED SUCCESSFULLY                  "
echo "======================================================================"

