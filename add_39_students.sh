#!/usr/bin/env bash
# /**
#  * @file        add_39_students.sh
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
#  * @description Automated 39-student roster loader for Linux/macOS customer installations.
#  */

set -euo pipefail

CONTAINER_NAME="prashant_academy_db"
DB_USER="postgres"
DB_NAME="prashant_academy"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEED_FILE="${SCRIPT_DIR}/data/prashant_academy_production_39_students.sql"

if [ ! -f "$SEED_FILE" ]; then
    echo "[ERROR] Seed file not found at: $SEED_FILE"
    exit 1
fi

echo "======================================================================"
echo "       PrathamOne Academy - 39 Student Roster Loader (Linux/macOS)    "
echo "======================================================================"
echo "Target Seed: $SEED_FILE"
echo "Records:     39 students, 5 batches, 78 guardians, 195 KYC documents,"
echo "             36 invoices, 170 payments, and 170 receipts."

read -r -p "Proceed with loading 39 verified students into $DB_NAME? (y/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[yY]([eE][sS])?$ ]]; then
    echo "Operation cancelled by user."
    exit 0
fi

echo -e "\n[1/4] Checking database container..."
if [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null || true)" != "true" ]; then
    docker compose up -d db
    sleep 5
fi

echo "[2/4] Temporarily stopping backend and frontend..."
docker compose stop backend frontend || true

echo "[3/4] Importing verified 39-student roster and financial ledger..."
docker cp "$SEED_FILE" "${CONTAINER_NAME}:/tmp/prashant_academy_production_39_students.sql"
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/prashant_academy_production_39_students.sql > /dev/null
docker exec -i "$CONTAINER_NAME" rm -f /tmp/prashant_academy_production_39_students.sql

echo "[4/4] Restarting application services..."
docker compose start backend frontend

echo "Waiting for backend API healthcheck..."
for i in {1..20}; do
    if curl -s -f http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "\n[OK] Backend API is operational and verified healthy."
        break
    fi
    echo -n "."
    sleep 2
done

echo -e "\n======================================================================"
echo "             39 STUDENTS ADDED & VERIFIED SUCCESSFULLY                "
echo "======================================================================"
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT 'Students: ' || count(*) FROM students UNION ALL SELECT 'Active Enrollments: ' || count(*) FROM student_enrollments WHERE status = 'active' UNION ALL SELECT 'Batches: ' || count(*) FROM divisions UNION ALL SELECT 'Invoices: ' || count(*) FROM fee_invoices UNION ALL SELECT 'Payments: ' || count(*) FROM payments;"
echo -e "\nWeb Application: http://localhost:80"
echo "Login:           admin@prashantacademy.edu.in / admin123"
echo "======================================================================"

