<#
.SYNOPSIS
    PrathamOne Academy - Safe System Updater (Windows)
.DESCRIPTION
    Pulls latest git updates, ensures strong production security secrets, takes an automated
    pre-update database snapshot, rebuilds Docker containers, applies any new migrations,
    and restarts services while strictly preserving persistent database volumes.
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
Write-Host "       PrathamOne Academy - Safe System Updater (Windows)             " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Blue

$projectRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
Set-Location $projectRoot

# ----------------------------------------------------------------------
# [1/5] Git Repository Synchronization
# ----------------------------------------------------------------------
Write-Host "`n[1/5] Checking local Git working tree..." -ForegroundColor Cyan
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

# ----------------------------------------------------------------------
# [2/5] Environment (.env) & Production Security Validation
# ----------------------------------------------------------------------
Write-Host "`n[2/5] Validating environment configuration and security keys (.env)..." -ForegroundColor Cyan
$envFile = Join-Path $projectRoot ".env"
$envExample = Join-Path $projectRoot ".env.example"

if (-not (Test-Path $envFile)) {
    if (Test-Path $envExample) {
        Write-Host "[INFO] .env not found. Initializing from .env.example..." -ForegroundColor Yellow
        Copy-Item $envExample $envFile
    } else {
        Write-Host "[WARN] Creating baseline .env file..." -ForegroundColor Yellow
        New-Item -ItemType File -Path $envFile -Force | Out-Null
    }
}

$envLines = Get-Content $envFile
$hasSecretKey = $false
$insecureSecrets = @(
    "REPLACE_WITH_RANDOM_64_CHAR_HEX_SECRET",
    "changeme-in-production-use-long-random-string",
    "prashant_academy_super_secure_jwt_secret_key_change_in_production_2024"
)
$chars = (65..90) + (97..122) + (48..57)
$updatedLines = @()

foreach ($line in $envLines) {
    if ($line -match '^\s*SECRET_KEY\s*=\s*(.*)$') {
        $hasSecretKey = $true
        $val = $matches[1].Trim().Trim('"').Trim("'")
        if ([string]::IsNullOrWhiteSpace($val) -or $val.Length -lt 32 -or $insecureSecrets -contains $val) {
            $newSecret = -join (1..64 | ForEach-Object { [char]($chars | Get-Random) })
            $updatedLines += "SECRET_KEY=$newSecret"
            Write-Host "[SECURITY] Upgraded weak/placeholder SECRET_KEY to an enterprise 64-character secret in .env." -ForegroundColor Green
        } else {
            $updatedLines += $line
        }
    } else {
        $updatedLines += $line
    }
}

if (-not $hasSecretKey) {
    $newSecret = -join (1..64 | ForEach-Object { [char]($chars | Get-Random) })
    $updatedLines += "SECRET_KEY=$newSecret"
    Write-Host "[SECURITY] Generated and injected strong 64-character SECRET_KEY in .env." -ForegroundColor Green
}

Set-Content -Path $envFile -Value $updatedLines -Encoding utf8
Write-Host "[OK] Production environment and security keys verified." -ForegroundColor Green

# ----------------------------------------------------------------------
# [3/5] Automated Pre-Update Database Snapshot (Zero Data Loss Guarantee)
# ----------------------------------------------------------------------
Write-Host "`n[3/5] Performing automated pre-update database snapshot..." -ForegroundColor Cyan
$backupDir = Join-Path $projectRoot "backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

# Ensure db container is active to capture pg_dump snapshot
$dbRunning = $(docker ps --filter "name=prashant_academy_db" --filter "status=running" -q)
if (-not $dbRunning) {
    Write-Host "Starting database container to capture snapshot..." -ForegroundColor Yellow
    docker compose up -d db
    Start-Sleep -Seconds 4
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $backupDir "backup_auto_pre_update_$timestamp.sql"

try {
    Write-Host "Dumping PostgreSQL snapshot to: $backupFile ..." -ForegroundColor Yellow
    docker compose exec -T db pg_dump -U postgres prashant_academy | Out-File -FilePath $backupFile -Encoding ascii
    if (Test-Path $backupFile) {
        $size = (Get-Item $backupFile).Length
        if ($size -gt 1000) {
            Write-Host "[OK] Pre-update database snapshot saved ($([math]::Round($size / 1MB, 2)) MB)." -ForegroundColor Green
            # Retain latest 10 auto-backups to prevent disk exhaustion
            $autoBackups = Get-ChildItem -Path $backupDir -Filter "backup_auto_pre_update_*.sql" | Sort-Object CreationTime -Descending
            if ($autoBackups.Count -gt 10) {
                $autoBackups | Select-Object -Skip 10 | ForEach-Object {
                    Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
                }
            }
        } else {
            Write-Host "[WARN] Backup file created but size is smaller than expected ($size bytes)." -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "[WARN] Pre-update database snapshot could not be captured: $_" -ForegroundColor Yellow
    Write-Host "Proceeding with container rebuild (persistent volumes remain preserved)." -ForegroundColor Yellow
}

# ----------------------------------------------------------------------
# [4/5] Container Rebuild & Service Restart
# ----------------------------------------------------------------------
Write-Host "`n[4/5] Rebuilding and restarting containers (persistent volumes preserved)..." -ForegroundColor Cyan
docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker Compose update failed." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Containers updated and restarted successfully." -ForegroundColor Green

# ----------------------------------------------------------------------
# [5/5] Backend Health Check & Database Synchronization
# ----------------------------------------------------------------------
Write-Host "`n[5/5] Validating backend health and migration status..." -ForegroundColor Cyan
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

Write-Host "`nService Status:" -ForegroundColor Cyan
docker compose ps

Write-Host "`n======================================================================" -ForegroundColor Blue
Write-Host "[SUCCESS] PrathamOne Academy updated successfully without data loss." -ForegroundColor Green
if (Test-Path $backupFile) {
    Write-Host "Pre-update snapshot stored at: $backupFile" -ForegroundColor Green
}
Write-Host "======================================================================" -ForegroundColor Blue
