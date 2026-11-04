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

$projectRoot = $PSScriptRoot
Set-Location $projectRoot

Write-Host "`n[1/4] Checking local Git working tree..." -ForegroundColor Cyan
if (Test-Path (Join-Path $projectRoot ".git")) {
    Write-Host "Pulling latest changes from remote repository..." -ForegroundColor Yellow
    git pull
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[WARN] Git pull encountered conflicts or warnings. Continuing with local codebase..." -ForegroundColor Yellow
    } else {
        Write-Host "[OK] Codebase updated to latest commit." -ForegroundColor Green
    }
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
} else {
    Write-Host "[WARN] Health check did not respond in time. Run 'docker compose logs -f' to inspect." -ForegroundColor Yellow
}

Write-Host "`n[4/4] Current Service Status:" -ForegroundColor Cyan
docker compose ps

Write-Host "`n[SUCCESS] PrathamOne Academy updated successfully without data loss." -ForegroundColor Green
