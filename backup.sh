#!/usr/bin/env bash
# /**
#  * @file        backup.sh
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
#  * @description Automated database backup script creating verified PostgreSQL dumps in backups/.
#  */

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/backups"
CONTAINER_NAME="prashant_academy_db"
DB_USER="postgres"
DB_NAME="prashant_academy"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/prathamone_backup_${TIMESTAMP}.sql"

echo "======================================================================"
echo "       PrathamOne Academy - Database Backup Utility                   "
echo "======================================================================"

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "[ERROR] Database container '${CONTAINER_NAME}' is not running."
    echo "Please start the stack with: docker compose up -d"
    exit 1
fi

echo "Creating PostgreSQL database dump..."
docker exec -i "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"

FILE_SIZE=$(wc -c < "$BACKUP_FILE" | tr -d ' ')
if [ "$FILE_SIZE" -lt 1000 ]; then
    echo "[ERROR] Backup file is unusually small (${FILE_SIZE} bytes). Aborting."
    rm -f "$BACKUP_FILE"
    exit 1
fi

echo -e "\n======================================================================"
echo "           BACKUP COMPLETED AND VERIFIED SUCCESSFULLY                "
echo "======================================================================"
echo "File Path: $BACKUP_FILE"
echo "File Size: ${FILE_SIZE} bytes"
echo "To restore: ./restore.sh '$BACKUP_FILE'"
echo "======================================================================"

