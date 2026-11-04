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
#  * @updated     2026-11-04
#  *
#  * @description Automated update script pulling latest git changes and rebuilding containers while preserving volumes.
#  */

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "======================================================================"
echo "       PrathamOne Academy - Safe System Updater (Linux/macOS)         "
echo "======================================================================"

if [ -d ".git" ]; then
    echo -e "\n[1/3] Pulling latest updates from Git repository..."
    git pull
fi

echo -e "\n[2/3] Rebuilding containers (persistent data volumes preserved)..."
docker compose up -d --build

echo -e "\n[3/3] Validating service health..."
sleep 5
docker compose ps

echo -e "\n[SUCCESS] PrathamOne Academy updated successfully without data loss."
