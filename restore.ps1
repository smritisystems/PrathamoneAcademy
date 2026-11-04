<#
.SYNOPSIS
    PrathamOne Academy - Database Restore Utility (Windows)
.DESCRIPTION
    Restores a PostgreSQL database dump from a specified backup file.
.NOTES
    File:        restore.ps1
    Project:     PrathamOne Academy Coaching Institute Management System
    Author:      Jawahar R. Mallah
    Organization: AITDL (AI Technology & Development Lab)
    Client:      Prashant Academy Coaching Institute
    Copyright:   Copyright (c) 2026 AITDL
    License:     Proprietary
    Version:     1.0.0
#>

[CmdletBinding()]
param(
    [string]$BackupFile,
    [string]$ContainerName = "prashant_academy_db",
    [string]$DbUser = "postgres",
    [string]$DbName = "prashant_academy",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host "======================================================================" -ForegroundColor Blue
Write-Host "       PrathamOne Academy - Database Restore Utility                  " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Blue

$backupDir = Join-Path $PSScriptRoot "backups"

# If no backup file specified, list available in backups/
if (-not $BackupFile) {
    if (Test-Path $backupDir) {
        $backups = Get-ChildItem -Path $backupDir -Filter "*.sql" | Sort-Object LastWriteTime -Descending
        if ($backups.Count -gt 0) {
            Write-Host "`nAvailable backup files:" -ForegroundColor Yellow
            for ($i = 0; $i -lt $backups.Count; $i++) {
                $b = $backups[$i]
                Write-Host "  [$i] $($b.Name) ($([Math]::Round($b.Length / 1KB, 1)) KB - $($b.LastWriteTime))" -ForegroundColor White
            }
            $selection = Read-Host "`nEnter selection index (0 for latest, or press Enter to cancel)"
            if ($selection -match "^\d+$" -and [int]$selection -lt $backups.Count) {
                $BackupFile = $backups[[int]$selection].FullName
            } else {
                Write-Host "Operation cancelled." -ForegroundColor Yellow
                exit 0
            }
        }
    }
}

if (-not $BackupFile -or -not (Test-Path $BackupFile)) {
    Write-Host "[ERROR] Valid backup file not found. Please provide -BackupFile <path>" -ForegroundColor Red
    exit 1
}

Write-Host "`nTarget Backup File: $BackupFile" -ForegroundColor Cyan
if (-not $Force) {
    $confirm = Read-Host "WARNING: Restoring will overwrite existing database data. Proceed? (y/N)"
    if ($confirm -notmatch "^[yY]([eE][sS])?$") {
        Write-Host "Restore cancelled by user." -ForegroundColor Yellow
        exit 0
    }
}

# Verify database container is running
$dbState = docker inspect -f '{{.State.Running}}' $ContainerName 2>$null
if ($dbState -ne "true") {
    Write-Host "Starting database container..." -ForegroundColor Yellow
    docker compose up -d db
    Start-Sleep -Seconds 5
}

Write-Host "Stopping web application to prevent concurrent database writes..." -ForegroundColor Cyan
docker compose stop backend frontend 2>$null

Write-Host "Restoring database from SQL dump..." -ForegroundColor Cyan
try {
    # Drop and recreate schema cleanly
    docker exec -i $ContainerName psql -U $DbUser -d $DbName -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    docker exec -i $ContainerName psql -U $DbUser -d $DbName < $BackupFile
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Database restoration encountered errors (exit code $LASTEXITCODE)." -ForegroundColor Red
        exit 1
    }

    Write-Host "[OK] Database restored successfully." -ForegroundColor Green
    Write-Host "Restarting application containers..." -ForegroundColor Cyan
    docker compose start backend frontend

    Write-Host "`n======================================================================" -ForegroundColor Blue
    Write-Host "             DATABASE RESTORE COMPLETED SUCCESSFULLY                  " -ForegroundColor Green
    Write-Host "======================================================================" -ForegroundColor Blue
}
catch {
    Write-Host "[ERROR] Database restore failed: $_" -ForegroundColor Red
    exit 1
}
