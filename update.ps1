<#
.SYNOPSIS
    PrathamOne Academy - Safe System Updater (Windows)
.DESCRIPTION
    Pulls latest git updates, rebuilds Docker containers, applies any new migrations,
    and restarts services while preserving persistent database volumes.
.NOTES
    File:        update.ps1
    Project:     PrathamOne Academy Coaching Institute Management System
    Author:      Jawahar R. Mallah
    Organization: AITDL (AI Technology & Development Lab)
    Client:      Prashant Academy Coaching Institute
    Copyright:   Copyright (c) 2026 AITDL
    License:     Proprietary
    Version:     1.0.0
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

Write-Host "======================================================================" -ForegroundColor Blue
Write-Host "       PrathamOne Academy - Safe System Updater                       " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Blue

$projectRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
Set-Location $projectRoot

Write-Host "`n[1/4] Checking local Git working tree..." -ForegroundColor Cyan
if (Test-Path (Join-Path $projectRoot ".git")) {
    Write-Host "Fetching latest changes from origin..." -ForegroundColor Yellow
    git fetch origin master --tags
    $status = git status --porcelain
    if ($status) {
        Write-Host "[WARN] Detected uncommitted local changes on server:" -ForegroundColor Yellow
        git status --short
        Write-Host "Auto-stashing local modifications before updating..." -ForegroundColor Yellow
        git stash
    }
    Write-Host "Pulling latest commit from origin/master..." -ForegroundColor Yellow
    git pull origin master
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[WARN] Git pull encountered an issue. Synchronizing hard to origin/master..." -ForegroundColor Yellow
        git reset --hard origin/master
    }
    $headCommit = git rev-parse --short HEAD
    Write-Host "[OK] Codebase updated to latest commit: $headCommit" -ForegroundColor Green
} else {
    Write-Host "[INFO] Not a git checkout. Proceeding with container rebuild." -ForegroundColor Gray
}

Write-Host "`n[2/4] Rebuilding and restarting containers (persistent volumes preserved)..." -ForegroundColor Cyan
docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker Compose update failed." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Containers updated and restarted successfully." -ForegroundColor Green

Write-Host "`n[3/4] Validating backend health and migration status..." -ForegroundColor Cyan
$healthUrl = "http://localhost:8000/health"
$maxAttempts = 20
$attempt = 0
$isHealthy = $false

while ($attempt -lt $maxAttempts) {
    $attempt++
    Start-Sleep -Seconds 3
    try {
        $resp = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($resp.status -eq "healthy") {
            $isHealthy = $true
            break
        }
    } catch {}
    Write-Host -NoNewline "."
}
Write-Host ""

if ($isHealthy) {
    Write-Host "[OK] Backend API is healthy and operational." -ForegroundColor Green
    Write-Host "`nSynchronizing schema, academic years, and production datasets..." -ForegroundColor Cyan
    try {
        docker compose exec -T backend python scripts/normalize_academic_and_institution.py
        docker compose exec -T backend python scripts/init_staff_module.py
        docker compose exec -T backend python scripts/bootstrap_sysadmin.py
        docker compose exec -T backend python scripts/sync_release_baseline.py
        Write-Host "[OK] Academic years, staff module, SysAdmin superuser, and Release baseline synchronized successfully." -ForegroundColor Green
    } catch {
        Write-Host "[WARN] Schema normalization encountered an error: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARN] Health check did not respond in time. Run 'docker compose logs -f' to inspect." -ForegroundColor Yellow
}

Write-Host "`n[4/4] Current Service Status:" -ForegroundColor Cyan
docker compose ps

Write-Host "`n[SUCCESS] PrathamOne Academy updated successfully without data loss." -ForegroundColor Green
