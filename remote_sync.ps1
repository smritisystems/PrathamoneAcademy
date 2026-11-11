<#
.SYNOPSIS
    PrathamOne Academy - Remote One-Command Production Data Populator (Windows)
.DESCRIPTION
    Instantly downloads and applies the authoritative PrathamOne Academy complete dataset
    into a remotely running Docker deployment with zero manual clone steps.
.NOTES
    File:        remote_sync.ps1
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
    [string]$ContainerName = "prashant_academy_db",
    [string]$BackendContainer = "prashant_academy_backend",
    [string]$DbUser = "postgres",
    [string]$DbName = "prashant_academy"
)

$ErrorActionPreference = "Continue"

Write-Host "======================================================================" -ForegroundColor Blue
Write-Host "     PrathamOne Academy - Remote One-Command Data Populator            " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Blue

# 1. Check Docker
$dbRunning = docker inspect -f '{{.State.Running}}' $ContainerName 2>$null
if ($dbRunning -ne "true") {
    Write-Host "[ERROR] PostgreSQL container '$ContainerName' is not running." -ForegroundColor Red
    Write-Host "Please start the PrathamOne Academy containers first: docker compose up -d" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n[1/3] Downloading authoritative dataset from GitHub..." -ForegroundColor Cyan
$sqlUrl = "https://raw.githubusercontent.com/smritisystems/PrathamoneAcademy/master/data/prashant_academy_complete_production.sql"
$tempSql = Join-Path $env:TEMP "prashant_academy_production_data.sql"

try {
    Invoke-WebRequest -Uri $sqlUrl -OutFile $tempSql -UseBasicParsing
    $fileSize = (Get-Item $tempSql).Length
    Write-Host "[OK] Downloaded dataset ($([Math]::Round($fileSize / 1KB, 1)) KB)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to download dataset from GitHub: $_" -ForegroundColor Red
    exit 1
}

# 2. Import into container
Write-Host "[2/3] Importing complete production records into database..." -ForegroundColor Cyan
try {
    docker cp "$tempSql" "${ContainerName}:/tmp/remote_sync.sql"
    $res = docker exec -i $ContainerName psql -U $DbUser -d $DbName -v ON_ERROR_STOP=1 -f /tmp/remote_sync.sql 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] PostgreSQL import failed with exit code $LASTEXITCODE" -ForegroundColor Red
        Write-Host ($res | Select-Object -Last 10 | Out-String) -ForegroundColor Red
        exit 1
    }
    docker exec -i $ContainerName rm -f /tmp/remote_sync.sql
    Remove-Item -Path $tempSql -Force -ErrorAction SilentlyContinue
    Write-Host "[OK] Complete production dataset loaded into $DbName." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Database loading failed: $_" -ForegroundColor Red
    exit 1
}

# 3. Restart application services
Write-Host "[3/3] Restarting application services..." -ForegroundColor Cyan
docker restart $BackendContainer | Out-Null
docker restart prashant_academy_frontend 2>$null | Out-Null
Start-Sleep -Seconds 5

# 4. Verify Health and Counts
$counts = docker exec -i $ContainerName psql -U $DbUser -d $DbName -t -A -c "
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
" 2>$null

Write-Host "`n======================================================================" -ForegroundColor Blue
Write-Host "           REMOTE PRODUCTION DATA POPULATED SUCCESSFULLY              " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Blue
foreach ($line in $counts) {
    if ($line) {
        Write-Host "  - $line" -ForegroundColor White
    }
}
Write-Host "----------------------------------------------------------------------" -ForegroundColor Gray
Write-Host "Web Application: http://localhost:80" -ForegroundColor Cyan
Write-Host "Default Login:   admin@example.com / admin123" -ForegroundColor Yellow
Write-Host "======================================================================`n" -ForegroundColor Blue

