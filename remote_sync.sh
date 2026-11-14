#!/usr/bin/env bash
# /**
#  * @file        remote_sync.sh
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
#  * @description Automated remote production data populator for Linux/macOS.
#  */

set -euo pipefail

CONTAINER_NAME="prashant_academy_db"
BACKEND_CONTAINER="prashant_academy_backend"
DB_USER="postgres"
DB_NAME="prashant_academy"
SQL_URL="https://raw.githubusercontent.com/smritisystems/PrathamoneAcademy/master/data/prashant_academy_complete_production.sql"

echo "======================================================================"
echo "     PrathamOne Academy - Remote One-Command Data Populator            "
echo "======================================================================"

if [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null || true)" != "true" ]; then
    echo "[ERROR] Database container '$CONTAINER_NAME' is not running."
    echo "Please start PrathamOne Academy containers: docker compose up -d"
    exit 1
fi

echo "[1/3] Downloading authoritative dataset from GitHub..."
TMP_SQL=$(mktemp /tmp/prashant_data.XXXXXX.sql)
curl -sSL "$SQL_URL" -o "$TMP_SQL"
echo "[OK] Downloaded dataset ($(du -h "$TMP_SQL" | cut -f1))"

echo "[2/3] Importing complete production records into database..."
docker cp "$TMP_SQL" "${CONTAINER_NAME}:/tmp/remote_sync.sql"
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/remote_sync.sql > /dev/null
docker exec -i "$CONTAINER_NAME" rm -f /tmp/remote_sync.sql
rm -f "$TMP_SQL"
echo "[OK] Complete production dataset loaded."

echo "[3/3] Restarting backend service..."
docker restart "$BACKEND_CONTAINER" > /dev/null
sleep 5

echo -e "\n======================================================================"
echo "           REMOTE PRODUCTION DATA POPULATED SUCCESSFULLY              "
echo "======================================================================"
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "
SELECT 'Students: ' || count(*) FROM students UNION ALL
SELECT 'Active Enrollments: ' || count(*) FROM student_enrollments WHERE status = 'active' UNION ALL
SELECT 'Batches: ' || count(*) FROM divisions UNION ALL
SELECT 'Fee Invoices: ' || count(*) FROM fee_invoices UNION ALL
SELECT 'Payments: ' || count(*) FROM payments UNION ALL
SELECT 'Attendance: ' || count(*) FROM attendances UNION ALL
SELECT 'Examinations: ' || count(*) FROM examinations UNION ALL
SELECT 'Exam Marks: ' || count(*) FROM exam_marks UNION ALL
SELECT 'Study Materials: ' || count(*) FROM study_materials UNION ALL
SELECT 'Announcements: ' || count(*) FROM announcements;
"
echo -e "\nWeb Application: http://localhost:80"
echo "======================================================================"

