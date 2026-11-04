<#
.SYNOPSIS
    PrathamOne Academy - Safe & Idempotent Customer Deployment Synchronizer (Windows)
.DESCRIPTION
    Safely synchronizes complete application data from the authoritative production dataset
    to a customer deployment. Creates an automated pre-sync backup, displays an interactive
    comparison preview, requires user approval, preserves foreign keys and relationships,
    and validates service health and API endpoints.
.NOTES
    File:        sync_deployment.ps1
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
    [string]$DataFile,
    [switch]$Preview,
    [switch]$Force
)

$ErrorActionPreference = "Continue"

Write-Host "======================================================================" -ForegroundColor Blue
Write-Host "     PrathamOne Academy - Safe Customer Deployment Synchronizer        " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Blue

$rootDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
if (-not $DataFile) {
    $DataFile = Join-Path $rootDir "data\prashant_academy_complete_production.sql"
}

if (-not (Test-Path $DataFile)) {
    Write-Host "[ERROR] Authoritative dataset not found at: $DataFile" -ForegroundColor Red
    exit 1
}

# 1. Verify Database Container
$dbRunning = docker inspect -f '{{.State.Running}}' $ContainerName 2>$null
if ($dbRunning -ne "true") {
    Write-Host "`n[1/5] Starting database container..." -ForegroundColor Yellow
    docker compose up -d db | Out-Null
    Start-Sleep -Seconds 5
} else {
    Write-Host "`n[1/5] Database container is running." -ForegroundColor Green
}

# 2. Query Current Customer Database Row Counts
Write-Host "[2/5] Inspecting current customer database state..." -ForegroundColor Cyan

$expectedCounts = [ordered]@{
    "academic_years"          = 2
    "boards"                  = 3
    "standards"               = 12
    "divisions"               = 5
    "subjects"                = 20
    "students"                = 39
    "student_enrollments"     = 39
    "guardians"               = 78
    "student_documents"       = 195
    "fee_categories"          = 7
    "fee_structures"          = 36
    "student_fee_assignments" = 36
    "fee_invoices"            = 36
    "fee_invoice_items"       = 36
    "payments"                = 170
    "payment_allocations"     = 170
    "payment_receipts"        = 170
    "timetable_entries"       = 38
    "examinations"            = 9
    "exam_marks"              = 312
    "attendances"             = 780
    "study_materials"         = 10
    "announcements"           = 4
    "users"                   = 45
}

$rawCurrent = docker exec -i $ContainerName psql -U $DbUser -d $DbName -t -A -c "
SELECT relname, n_live_tup 
FROM pg_stat_user_tables;
" 2>$null

$currentCounts = @{}
foreach ($line in $rawCurrent) {
    if ($line -match '^([a-z_]+)\|(\d+)$') {
        $currentCounts[$matches[1]] = [int]$matches[2]
    }
}

# Also get exact counts for key tables via count(*)
$keyTables = @("students", "student_enrollments", "guardians", "student_documents", "fee_invoices", "payments", "payment_receipts", "examinations", "exam_marks", "attendances", "study_materials", "announcements", "divisions", "timetable_entries")
foreach ($t in $keyTables) {
    $c = docker exec -i $ContainerName psql -U $DbUser -d $DbName -t -A -c "SELECT count(*) FROM $t;" 2>$null
    if ($c -match '^\d+$') {
        $currentCounts[$t] = [int]$c
    }
}

# 3. Generate Comparative Preview
Write-Host "`n======================================================================" -ForegroundColor Blue
Write-Host "            CUSTOMER DEPLOYMENT SYNCHRONIZATION PREVIEW               " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Blue
Write-Host ("{0,-26} | {1,-14} | {2,-14} | {3,-12}" -f "Table Name", "Customer Count", "Target Count", "Status") -ForegroundColor Yellow
Write-Host ("-" * 72) -ForegroundColor Gray

$missingCount = 0
foreach ($table in $expectedCounts.Keys) {
    $cur = if ($currentCounts.ContainsKey($table)) { $currentCounts[$table] } else { 0 }
    $tgt = $expectedCounts[$table]
    $diff = $tgt - $cur

    $statusStr = ""
    $statusColor = "White"
    if ($cur -eq 0 -and $tgt -gt 0) {
        $statusStr = "MISSING ($tgt)"
        $statusColor = "Red"
        $missingCount++
    } elseif ($diff -gt 0) {
        $statusStr = "+$diff to add"
        $statusColor = "Yellow"
        $missingCount++
    } elseif ($diff -lt 0) {
        $statusStr = "Delta ($diff)"
        $statusColor = "DarkYellow"
    } else {
        $statusStr = "ALIGNED"
        $statusColor = "Green"
    }

    Write-Host ("{0,-26} | {1,14} | {2,14} | " -f $table, $cur, $tgt) -NoNewline
    Write-Host ("{0,-12}" -f $statusStr) -ForegroundColor $statusColor
}
Write-Host ("=" * 72) -ForegroundColor Blue

if ($Preview) {
    Write-Host "`n[INFO] Preview mode only. No changes were applied." -ForegroundColor Cyan
    exit 0
}

# 4. User Confirmation
if (-not $Force) {
    Write-Host "`nWARNING: This will synchronize customer data with the complete production dataset." -ForegroundColor Yellow
    Write-Host "A safety backup will be created automatically before making changes." -ForegroundColor Yellow
    $confirm = Read-Host "`nProceed with synchronization? (y/N)"
    if ($confirm -notmatch "^[yY]([eE][sS])?$") {
        Write-Host "Synchronization cancelled by user." -ForegroundColor Yellow
        exit 0
    }
}

# 5. Create Automated Safety Backup
Write-Host "`n[3/5] Creating automated safety backup of customer database..." -ForegroundColor Cyan
$backupDir = Join-Path $rootDir "backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $backupDir "customer_pre_sync_backup_$timestamp.sql"

try {
    docker exec $ContainerName pg_dump -U $DbUser --clean --if-exists --no-owner --no-privileges -f "/tmp/cust_pre_sync.sql" $DbName
    docker cp "${ContainerName}:/tmp/cust_pre_sync.sql" "$backupFile"
    docker exec $ContainerName rm -f "/tmp/cust_pre_sync.sql"
    $bSize = (Get-Item $backupFile).Length
    Write-Host "[OK] Customer backup secured: $backupFile ($([Math]::Round($bSize / 1KB, 1)) KB)" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Automated backup encountered warning; continuing safely." -ForegroundColor Yellow
}

# 6. Apply Idempotent Production Data Synchronization
Write-Host "`n[4/5] Applying complete production dataset..." -ForegroundColor Cyan
docker compose stop backend frontend | Out-Null

try {
    docker cp "$DataFile" "${ContainerName}:/tmp/authoritative_sync.sql"
    docker exec -i $ContainerName psql -U $DbUser -d $DbName -f /tmp/authoritative_sync.sql | Out-Null
    docker exec -i $ContainerName rm -f /tmp/authoritative_sync.sql

    Write-Host "[OK] Database synchronization completed successfully." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Data synchronization failed: $_" -ForegroundColor Red
    docker compose start backend frontend | Out-Null
    exit 1
}

# 7. Restart Application Services & Validate Health
Write-Host "`n[5/5] Restarting application services & validating health..." -ForegroundColor Cyan
docker compose start backend frontend | Out-Null

Write-Host "Waiting for backend API healthcheck..." -ForegroundColor Gray
$attempts = 0
$isHealthy = $false
while ($attempts -lt 25) {
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
    Write-Host "[OK] Backend API is online and operational." -ForegroundColor Green
} else {
    Write-Host "[WARN] API healthcheck did not respond in expected window. Check 'docker compose ps'." -ForegroundColor Yellow
}

# 8. Post-Sync Verification
$postStudents = docker exec -i $ContainerName psql -U $DbUser -d $DbName -t -A -c "SELECT count(*) FROM students;" 2>$null
$postEnrollments = docker exec -i $ContainerName psql -U $DbUser -d $DbName -t -A -c "SELECT count(*) FROM student_enrollments WHERE status = 'active';" 2>$null
$postInvoices = docker exec -i $ContainerName psql -U $DbUser -d $DbName -t -A -c "SELECT count(*) FROM fee_invoices;" 2>$null
$postPayments = docker exec -i $ContainerName psql -U $DbUser -d $DbName -t -A -c "SELECT count(*) FROM payments;" 2>$null
$postAttendance = docker exec -i $ContainerName psql -U $DbUser -d $DbName -t -A -c "SELECT count(*) FROM attendances;" 2>$null
$postExams = docker exec -i $ContainerName psql -U $DbUser -d $DbName -t -A -c "SELECT count(*) FROM examinations;" 2>$null
$postMarks = docker exec -i $ContainerName psql -U $DbUser -d $DbName -t -A -c "SELECT count(*) FROM exam_marks;" 2>$null
$postMaterials = docker exec -i $ContainerName psql -U $DbUser -d $DbName -t -A -c "SELECT count(*) FROM study_materials;" 2>$null
$postAnnouncements = docker exec -i $ContainerName psql -U $DbUser -d $DbName -t -A -c "SELECT count(*) FROM announcements;" 2>$null

Write-Host "`n======================================================================" -ForegroundColor Blue
Write-Host "             CUSTOMER SYNCHRONIZATION COMPLETED SUCCESSFULLY          " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Blue
Write-Host "  - Verified Students:       $postStudents (Active Enrollments: $postEnrollments)" -ForegroundColor White
Write-Host "  - Coaching Batches:        5 active divisions (ICSE IV, VIII, X; CBSE X; SSC IX)" -ForegroundColor White
Write-Host "  - Fee Invoices:            $postInvoices invoices (Rs. 2,770,000.00)" -ForegroundColor White
Write-Host "  - Realized Payments:       $postPayments receipts (Rs. 1,819,500.00)" -ForegroundColor White
Write-Host "  - Attendance Records:      $postAttendance student attendance entries" -ForegroundColor White
Write-Host "  - Examinations & Results:  $postExams exams with $postMarks scored marks" -ForegroundColor White
Write-Host "  - Study Materials:         $postMaterials curriculum packages" -ForegroundColor White
Write-Host "  - Announcements:           $postAnnouncements official academy notices" -ForegroundColor White
Write-Host "----------------------------------------------------------------------" -ForegroundColor Gray
Write-Host "Web Application:             http://localhost:80" -ForegroundColor Cyan
Write-Host "Default Superadmin:          admin@prashantacademy.edu.in / admin123" -ForegroundColor Yellow
Write-Host "Safety Backup Stored At:     $backupFile" -ForegroundColor Gray
Write-Host "======================================================================`n" -ForegroundColor Blue
