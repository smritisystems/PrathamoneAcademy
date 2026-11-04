#!/usr/bin/env bash
# /**
#  * @file        install.sh
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
#  * @description Automated one-command deployment script for Linux and macOS environments.
#  */

set -euo pipefail

# ANSI Color Codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${CYAN}     PrathamOne Academy - Linux/macOS Automated Docker Installer      ${NC}"
echo -e "${BLUE}======================================================================${NC}"

# 1. Prerequisite Checks
echo -e "\n${CYAN}[1/5] Checking system prerequisites...${NC}"

if ! command -v docker >/dev/null 2>&1; then
    echo -e "${RED}[ERROR] Docker is not installed.${NC}"
    echo -e "${YELLOW}Please install Docker from https://docs.docker.com/engine/install/ before running this installer.${NC}"
    exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
    echo -e "${RED}[ERROR] Docker Compose (v2) is not installed or available.${NC}"
    echo -e "${YELLOW}Please install Docker Compose plugin: https://docs.docker.com/compose/install/${NC}"
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}[ERROR] Docker daemon is not running or accessible.${NC}"
    echo -e "${YELLOW}Please start Docker daemon (e.g., sudo systemctl start docker) and ensure current user is in 'docker' group.${NC}"
    exit 1
fi

echo -e "${GREEN}[OK] Docker and Docker Compose prerequisites satisfied.${NC}"

# 2. Workspace & Directory Resolution
echo -e "\n${CYAN}[2/5] Resolving project workspace...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}[ERROR] docker-compose.yml not found in current directory: $SCRIPT_DIR${NC}"
    exit 1
fi
echo -e "${GREEN}[OK] Workspace confirmed at: $SCRIPT_DIR${NC}"

# 3. Environment Configuration (.env)
echo -e "\n${CYAN}[3/5] Initializing environment configuration (.env)...${NC}"
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        RANDOM_SECRET=$(openssl rand -hex 32 2>/dev/null || date +%s%N | sha256sum | head -c 64)
        sed -i.bak "s/SECRET_KEY=.*/SECRET_KEY=${RANDOM_SECRET}/" .env && rm -f .env.bak
        echo -e "${GREEN}[OK] Created .env with secure random SECRET_KEY.${NC}"
    else
        echo -e "${RED}[ERROR] .env.example template missing.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}[OK] Existing .env preserved without modification.${NC}"
fi

# 4. Build & Start Containers
echo -e "\n${CYAN}[4/5] Building and launching PrathamOne Academy containers...${NC}"
docker compose up -d --build

# 5. Health Check Loop
echo -e "\n${CYAN}[5/5] Waiting for database initialization and service health...${NC}"
HEALTH_URL="http://localhost:8000/health"
MAX_ATTEMPTS=30
ATTEMPT=0
HEALTHY=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    if curl -s -f "$HEALTH_URL" | grep -q '"status":"healthy"' 2>/dev/null; then
        HEALTHY=1
        break
    fi
    echo -n "."
    sleep 3
done
echo ""

if [ $HEALTHY -eq 1 ]; then
    echo -e "${GREEN}[OK] PrathamOne Academy services are healthy and operational.${NC}"
else
    echo -e "${YELLOW}[WARN] Health check did not respond in time. Containers may still be migrating.${NC}"
    echo -e "${YELLOW}Inspect startup progress: docker compose logs -f backend${NC}"
fi

echo -e "\n${BLUE}======================================================================${NC}"
echo -e "${GREEN}      PRATHAMONE ACADEMY IS READY FOR PRODUCTION USE!                ${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo -e "Web Application:     http://localhost (or http://localhost:5173)"
echo -e "Backend API:         http://localhost:8000"
echo -e "API Documentation:   http://localhost:8000/docs"
echo -e "Default Superadmin:  admin@prashantacademy.edu.in / admin123"
echo -e "Default Accountant:  accountant@prashantacademy.edu.in / account123"
echo -e "${BLUE}----------------------------------------------------------------------${NC}"
echo -e "${CYAN}Useful Operational Commands:${NC}"
echo -e "  View logs:          docker compose logs -f"
echo -e "  Update system:      ./update.sh"
echo -e "  Create backup:      ./backup.sh"
echo -e "  Restore backup:     ./restore.sh <backup_file.sql>"
echo -e "  Stop system:        docker compose down"
echo -e "${BLUE}======================================================================${NC}\n"

docker compose ps

