<#
.SYNOPSIS
    PrathamOne Academy - Database & Data Backup Utility (Windows)
.DESCRIPTION
    Creates a full, timestamped PostgreSQL database dump and verifies its integrity.
.NOTES
    File:        backup.ps1
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
    [string]$BackupDir = $(Join-Path (if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }) "backups"),
    [string]$ContainerName = "prashant_academy_db",
    [string]$DbUser = "postgres",
    [string]$DbName = "prashant_academy"
)

$ErrorActionPreference = "Stop"

Write-Host "======================================================================" -ForegroundColor Blue
Write-Host "       PrathamOne Academy - Automated Database Backup Utility          " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Blue

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "[OK] Created backup directory: $BackupDir" -ForegroundColor Gray
}

# Verify database container is running
$dbState = docker inspect -f '{{.State.Running}}' $ContainerName 2>$null
if ($dbState -ne "true") {
    Write-Host "[ERROR] Database container '$ContainerName' is not running." -ForegroundColor Red
    Write-Host "Please start the environment first: docker compose up -d" -ForegroundColor Yellow
    exit 1
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $BackupDir "prathamone_backup_$timestamp.sql"

Write-Host "Generating PostgreSQL database dump..." -ForegroundColor Cyan
try {
    docker exec -i $ContainerName pg_dump -U $DbUser $DbName > $backupFile
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] pg_dump failed with exit code $LASTEXITCODE" -ForegroundColor Red
        if (Test-Path $backupFile) { Remove-Item $backupFile -Force }
        exit 1
    }

    $fileInfo = Get-Item $backupFile
    if ($fileInfo.Length -lt 1000) {
        Write-Host "[ERROR] Backup file is unusually small ($($fileInfo.Length) bytes). Verification failed." -ForegroundColor Red
        exit 1
    }

    Write-Host "`n======================================================================" -ForegroundColor Blue
    Write-Host "           BACKUP COMPLETED AND VERIFIED SUCCESSFULLY                " -ForegroundColor Green
    Write-Host "======================================================================" -ForegroundColor Blue
    Write-Host "File Path: $($fileInfo.FullName)" -ForegroundColor White
    Write-Host "File Size: $($fileInfo.Length.ToString('N0')) bytes ($([Math]::Round($fileInfo.Length / 1KB, 2)) KB)" -ForegroundColor White
    Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
    Write-Host "To restore: .\restore.ps1 -BackupFile `"$($fileInfo.FullName)`"" -ForegroundColor Yellow
    Write-Host "======================================================================`n" -ForegroundColor Blue
}
catch {
    Write-Host "[ERROR] Backup failed: $_" -ForegroundColor Red
    exit 1
}
