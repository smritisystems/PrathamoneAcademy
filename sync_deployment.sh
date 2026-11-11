#!/usr/bin/env bash
# /**
#  * @file        sync_deployment.sh
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
#  * @description Safe and idempotent customer deployment synchronizer for Linux/macOS.
#  */

set -euo pipefail

CONTAINER_NAME="prashant_academy_db"
DB_USER="postgres"
DB_NAME="prashant_academy"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_FILE="${SCRIPT_DIR}/data/prashant_academy_complete_production.sql"
BACKUP_DIR="${SCRIPT_DIR}/backups"

PREVIEW_ONLY=0
FORCE=0

for arg in "$@"; do
    case $arg in
        --preview|-p)
            PREVIEW_ONLY=1
            ;;
        --force|-f)
            FORCE=1
            ;;
    esac
done

if [ ! -f "$DATA_FILE" ]; then
    echo "[ERROR] Authoritative dataset not found at: $DATA_FILE"
    exit 1
fi

echo "======================================================================"
echo "     PrathamOne Academy - Safe Customer Deployment Synchronizer        "
echo "======================================================================"

# 1. Check DB Container
if [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null || true)" != "true" ]; then
    echo "[1/5] Starting database container..."
    docker compose up -d db
    sleep 5
else
    echo "[1/5] Database container is running."
fi

# 2. Inspect Current Database State
echo "[2/5] Inspecting current customer database state..."
echo -e "\n======================================================================"
echo "            CUSTOMER DEPLOYMENT SYNCHRONIZATION PREVIEW               "
echo "======================================================================"
printf "%-26s | %14s | %14s\n" "Table Name" "Customer Count" "Target Count"
echo "----------------------------------------------------------------------"

declare -A EXPECTED=(
    ["students"]=39
    ["student_enrollments"]=39
    ["guardians"]=78
    ["student_documents"]=195
    ["divisions"]=5
    ["timetable_entries"]=38
    ["fee_invoices"]=36
    ["payments"]=170
    ["payment_receipts"]=170
    ["examinations"]=9
    ["exam_marks"]=312
    ["attendances"]=780
    ["study_materials"]=10
    ["announcements"]=4
    ["standards"]=12
    ["subjects"]=20
    ["users"]=45
)

for tbl in "${!EXPECTED[@]}"; do
    CUR=$(docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT count(*) FROM $tbl;" 2>/dev/null || echo "0")
    TGT=${EXPECTED[$tbl]}
    printf "%-26s | %14s | %14s\n" "$tbl" "$CUR" "$TGT"
done
echo "======================================================================"

if [ $PREVIEW_ONLY -eq 1 ]; then
    echo -e "\n[INFO] Preview mode only. No changes applied."
    exit 0
fi

# 3. User Confirmation
if [ $FORCE -ne 1 ]; then
    read -r -p "Proceed with synchronization? (y/N): " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[yY]([eE][sS])?$ ]]; then
        echo "Synchronization cancelled by user."
        exit 0
    fi
fi

# 4. Create Safety Backup
echo -e "\n[3/5] Creating automated safety backup of customer database..."
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/customer_pre_sync_backup_${TIMESTAMP}.sql"

docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" --clean --if-exists --no-owner --no-privileges -f "/tmp/cust_backup.sql" "$DB_NAME"
docker cp "${CONTAINER_NAME}:/tmp/cust_backup.sql" "$BACKUP_FILE"
docker exec "$CONTAINER_NAME" rm -f "/tmp/cust_backup.sql"
echo "[OK] Backup created: $BACKUP_FILE"

# 5. Apply Production Synchronization
echo -e "\n[4/5] Applying complete production dataset..."
docker compose stop backend frontend || true
docker cp "$DATA_FILE" "${CONTAINER_NAME}:/tmp/authoritative_sync.sql"
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/authoritative_sync.sql > /dev/null
docker exec -i "$CONTAINER_NAME" rm -f /tmp/authoritative_sync.sql
echo "[OK] Data synchronized."

# 6. Restart and Validate Health
echo -e "\n[5/5] Restarting application services & validating health..."
docker compose start backend frontend

for i in {1..25}; do
    if curl -s -f http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "\n[OK] Backend API is online and operational."
        break
    fi
    echo -n "."
    sleep 2
done

echo -e "\n======================================================================"
echo "             CUSTOMER SYNCHRONIZATION COMPLETED SUCCESSFULLY          "
echo "======================================================================"
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "
SELECT 'Students: ' || count(*) FROM students UNION ALL
SELECT 'Enrollments: ' || count(*) FROM student_enrollments WHERE status = 'active' UNION ALL
SELECT 'Batches: ' || count(*) FROM divisions UNION ALL
SELECT 'Fee Invoices: ' || count(*) FROM fee_invoices UNION ALL
SELECT 'Payments: ' || count(*) FROM payments UNION ALL
SELECT 'Attendance: ' || count(*) FROM attendances UNION ALL
SELECT 'Exams: ' || count(*) FROM examinations UNION ALL
SELECT 'Exam Marks: ' || count(*) FROM exam_marks UNION ALL
SELECT 'Study Materials: ' || count(*) FROM study_materials UNION ALL
SELECT 'Announcements: ' || count(*) FROM announcements;
"
echo -e "\nWeb Application: http://localhost:80"
echo "Login:           admin@example.com / admin123"
echo "======================================================================"

