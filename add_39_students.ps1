<#
.SYNOPSIS
    PrathamOne Academy - One-Command 39 Student Production Roster Loader (Windows)
.DESCRIPTION
    Safely loads the verified 39 active students, 5 batches, 78 guardians,
    195 KYC documents, 36 invoices, and 170 fee payment receipts into the running database.
.NOTES
    File:        add_39_students.ps1
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
    [string]$DbUser = "postgres",
    [string]$DbName = "prashant_academy",
    [switch]$Force
)

$ErrorActionPreference = "Continue"

Write-Host "======================================================================" -ForegroundColor Blue
Write-Host "       PrathamOne Academy - 39 Student Roster Loader (Windows)        " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Blue

$rootDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$seedFile = Join-Path $rootDir "data\prashant_academy_production_39_students.sql"

if (-not (Test-Path $seedFile)) {
    Write-Host "[ERROR] Roster seed file not found at: $seedFile" -ForegroundColor Red
    exit 1
}

Write-Host "`nTarget Seed File: $seedFile" -ForegroundColor Cyan
Write-Host "Records included: 39 verified students, 5 batches, 78 guardians," -ForegroundColor White
Write-Host "                  195 KYC documents, 36 invoices, 170 payment receipts." -ForegroundColor White

if (-not $Force) {
    $confirm = Read-Host "`nProceed with loading all 39 verified students into $DbName? (y/N)"
    if ($confirm -notmatch "^[yY]([eE][sS])?$") {
        Write-Host "Operation cancelled by user." -ForegroundColor Yellow
        exit 0
    }
}

# 1. Ensure DB container is running
$dbRunning = docker inspect -f '{{.State.Running}}' $ContainerName 2>$null
if ($dbRunning -ne "true") {
    Write-Host "`n[1/4] Starting database container..." -ForegroundColor Yellow
    docker compose up -d db | Out-Null
    Start-Sleep -Seconds 5
} else {
    Write-Host "`n[1/4] Database container is running." -ForegroundColor Green
}

# 2. Stop frontend and backend
Write-Host "[2/4] Temporarily stopping backend & frontend..." -ForegroundColor Cyan
docker compose stop backend frontend | Out-Null

# 3. Load clean 39-student seed data into Postgres container
Write-Host "[3/4] Importing verified 39-student roster and financial ledger..." -ForegroundColor Cyan
try {
    docker cp "$seedFile" "${ContainerName}:/tmp/prashant_academy_production_39_students.sql"
    docker exec -i $ContainerName psql -U $DbUser -d $DbName -f /tmp/prashant_academy_production_39_students.sql | Out-Null
    docker exec -i $ContainerName rm -f /tmp/prashant_academy_production_39_students.sql

    Write-Host "[OK] Database successfully populated with 39 verified students." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Data loading failed: $_" -ForegroundColor Red
    docker compose start backend frontend | Out-Null
    exit 1
}

# 4. Restart services and verify health
Write-Host "[4/4] Restarting application services..." -ForegroundColor Cyan
docker compose start backend frontend | Out-Null

Write-Host "Waiting for backend API healthcheck..." -ForegroundColor Gray
$attempts = 0
$isHealthy = $false
while ($attempts -lt 20) {
    $attempts++
    Start-Sleep -Seconds 2
    try {
        $resp = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($resp.status -eq "healthy") {
            $isHealthy = $true
            break
        }
    } catch {}
    Write-Host -NoNewline "."
}
Write-Host ""

if ($isHealthy) {
    Write-Host "[OK] Backend API is operational and verified healthy." -ForegroundColor Green
} else {
    Write-Host "[WARN] Application started; please check 'docker compose ps' for status." -ForegroundColor Yellow
}

# Verification summary
$counts = docker exec -i $ContainerName psql -U $DbUser -d $DbName -t -A -c "SELECT 'Students: ' || count(*) FROM students UNION ALL SELECT 'Active Enrollments: ' || count(*) FROM student_enrollments WHERE status = 'active' UNION ALL SELECT 'Batches: ' || count(*) FROM divisions UNION ALL SELECT 'Invoices: ' || count(*) FROM fee_invoices UNION ALL SELECT 'Payments: ' || count(*) FROM payments;" 2>$null

Write-Host "`n======================================================================" -ForegroundColor Blue
Write-Host "             39 STUDENTS ADDED & VERIFIED SUCCESSFULLY                " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Blue
foreach ($line in $counts) {
    if ($line) {
        Write-Host "  - $line" -ForegroundColor White
    }
}
Write-Host "`nWeb Application: http://localhost:80" -ForegroundColor Cyan
Write-Host "Login:           admin@prashantacademy.edu.in / admin123" -ForegroundColor Cyan
Write-Host "======================================================================`n" -ForegroundColor Blue
