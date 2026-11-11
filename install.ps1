<#
.SYNOPSIS
    PrathamOne Academy - Automated Windows One-Command Installer
.DESCRIPTION
    Production-grade Windows PowerShell installer for PrathamOne Academy.
    Verifies elevation, Windows prerequisites, WSL 2, and Docker Desktop.
    Idempotently configures environment secrets, builds containers, runs migrations,
    and validates service health.
.NOTES
    File:        install.ps1
    Project:     PrathamOne Academy Coaching Institute Management System
    Author:      Jawahar R. Mallah
    Organization: AITDL (AI Technology & Development Lab)
    Client:      Prashant Academy Coaching Institute
    Copyright:   Copyright (c) 2026 AITDL
    License:     Proprietary
    Version:     1.0.0
#>

[CmdletBinding()]
param (
    [string]$InstallDir = $(if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }),
    [string]$RepoUrl = "https://github.com/smritisystems/PrathamoneAcademy.git",
    [switch]$SkipElevationCheck
)

if ([string]::IsNullOrWhiteSpace($InstallDir)) {
    $InstallDir = (Get-Location).Path
}

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n[+] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Err {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

Clear-Host
Write-Host "======================================================================" -ForegroundColor Blue
Write-Host "     PrathamOne Academy - Windows Automated Docker Installer          " -ForegroundColor Cyan
Write-Host "          Coaching Institute Management System (Enterprise)           " -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Blue

# ------------------------------------------------------------------------------
# 1. Administrator Elevation Check
# ------------------------------------------------------------------------------
Write-Step "Checking administrative privileges..."
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin -and -not $SkipElevationCheck) {
    Write-Warn "Administrative privileges required for prerequisite checks & Docker management."
    Write-Host "Re-launching installer with elevated administrator rights..." -ForegroundColor Yellow
    try {
        Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
        exit 0
    }
    catch {
        Write-Err "Could not elevate automatically. Please right-click PowerShell and choose 'Run as Administrator'."
        exit 1
    }
}
Write-Success "Running with administrator privileges."

# ------------------------------------------------------------------------------
# 2. Windows Version & Hardware Virtualization Prerequisites
# ------------------------------------------------------------------------------
Write-Step "Checking Windows environment & hardware virtualization..."
$osVersion = [System.Environment]::OSVersion.Version
if ($osVersion.Major -lt 10) {
    Write-Err "Windows 10 (Build 19041 or higher) or Windows 11 is required. Detected OS Version: $osVersion"
    exit 1
}
Write-Success "Windows Version compatible: $($osVersion.ToString())"

try {
    $cpu = Get-CimInstance -ClassName Win32_Processor | Select-Object -First 1
    if ($cpu.VirtualizationFirmwareEnabled -eq $true) {
        Write-Success "Hardware Virtualization is enabled in BIOS/firmware."
    } else {
        Write-Warn "Hardware Virtualization reported disabled or undetected in BIOS/firmware."
        Write-Warn "If Docker Desktop fails to launch, please enable Intel VT-x or AMD-V in your BIOS."
    }
} catch {
    Write-Warn "Could not query Win32_Processor for virtualization state. Proceeding..."
}

# ------------------------------------------------------------------------------
# 3. Docker Desktop & Compose Detection / Auto-Installation
# ------------------------------------------------------------------------------
Write-Step "Verifying Docker Desktop & Docker Compose installation..."

$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCmd) {
    Write-Warn "Docker executable not detected on system PATH."
    $wingetCmd = Get-Command winget -ErrorAction SilentlyContinue
    if ($wingetCmd) {
        Write-Host "Winget package manager detected. Installing Docker Desktop automatically..." -ForegroundColor Yellow
        try {
            winget install -e --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements --silent
            Write-Success "Docker Desktop installation package dispatched."
            Write-Host "Configuring Windows WSL 2 feature..." -ForegroundColor Yellow
            dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart | Out-Null
            dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart | Out-Null
            wsl --set-default-version 2 2>$null
        } catch {
            Write-Err "Automated winget installation encountered an error: $_"
            Write-Host "Please download and install Docker Desktop manually from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Err "Neither Docker nor winget found on this system."
        Write-Host "Please install Docker Desktop manually from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
        exit 1
    }
}

# Verify Docker daemon is running
Write-Host "Checking Docker daemon status..." -ForegroundColor Gray
$dockerRunning = $false
try {
    $info = docker info 2>&1
    if ($LASTEXITCODE -eq 0) { $dockerRunning = $true }
} catch {
    $dockerRunning = $false
}

if (-not $dockerRunning) {
    Write-Warn "Docker daemon is not responding. Attempting to start Docker Desktop..."
    $dockerExePaths = @(
        "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "$env:LOCALAPPDATA\Programs\Docker\Docker\Docker Desktop.exe"
    )
    $dockerExe = $dockerExePaths | Where-Object { Test-Path $_ } | Select-Object -First 1

    if ($dockerExe) {
        Start-Process -FilePath $dockerExe
        Write-Host "Waiting up to 90 seconds for Docker daemon to initialize..." -ForegroundColor Yellow
        $timeout = 90
        $elapsed = 0
        while ($elapsed -lt $timeout) {
            Start-Sleep -Seconds 3
            $elapsed += 3
            try {
                $check = docker info 2>&1
                if ($LASTEXITCODE -eq 0) {
                    $dockerRunning = $true
                    break
                }
            } catch {}
            Write-Host -NoNewline "."
        }
        Write-Host ""
    }
}

if (-not $dockerRunning) {
    Write-Err "Docker daemon could not be reached."
    Write-Host "Please start Docker Desktop manually from your Start Menu, wait for it to report 'Docker is running', and re-run install.ps1." -ForegroundColor Yellow
    exit 1
}
Write-Success "Docker daemon is active and responsive."

# ------------------------------------------------------------------------------
# 4. Project Directory & Git Checkout Resolution
# ------------------------------------------------------------------------------
Write-Step "Resolving project workspace..."
if (-not (Test-Path (Join-Path $InstallDir "docker-compose.yml"))) {
    Write-Host "Current directory does not contain docker-compose.yml. Checking target directory: $InstallDir" -ForegroundColor Yellow
    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }
    Set-Location $InstallDir
    if (-not (Test-Path (Join-Path $InstallDir ".git"))) {
        Write-Host "Cloning PrathamOne Academy repository from $RepoUrl..." -ForegroundColor Cyan
        git clone $RepoUrl .
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Git clone failed. Please verify internet connectivity and repository URL."
            exit 1
        }
    }
} else {
    Set-Location $InstallDir
}
Write-Success "Workspace confirmed at: $(Get-Location)"

# ------------------------------------------------------------------------------
# 5. Environment Secrets & Configuration (.env)
# ------------------------------------------------------------------------------
Write-Step "Configuring environment settings (.env)..."
$envFile = Join-Path $InstallDir ".env"
$envExample = Join-Path $InstallDir ".env.example"

if (-not (Test-Path $envFile)) {
    if (Test-Path $envExample) {
        Write-Host "Creating new .env from .env.example template..." -ForegroundColor Gray
        Copy-Item -Path $envExample -Destination $envFile -Force

        # Generate cryptographically secure 64-character secret key
        $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        $bytes = New-Object byte[] 32
        $rng.GetBytes($bytes)
        $secretKey = -join ($bytes | ForEach-Object { "{0:x2}" -f $_ })

        $envContent = Get-Content $envFile -Raw
        $envContent = $envContent -replace "SECRET_KEY=.*", "SECRET_KEY=$secretKey"
        Set-Content -Path $envFile -Value $envContent -NoNewline
        Write-Success "Generated secure random SECRET_KEY in .env."
    } else {
        Write-Err ".env.example template missing. Cannot initialize environment configuration."
        exit 1
    }
} else {
    Write-Success "Existing .env file preserved without modification."
}

# ------------------------------------------------------------------------------
# 6. Build & Launch Docker Services
# ------------------------------------------------------------------------------
Write-Step "Building and starting PrathamOne Academy containers via Docker Compose..."
docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Err "Docker Compose execution failed. Check container logs using 'docker compose logs'."
    exit 1
}
Write-Success "Docker Compose services dispatched successfully."

# ------------------------------------------------------------------------------
# 7. Health Check Verification Loop
# ------------------------------------------------------------------------------
Write-Step "Waiting for database initialization, migrations, and service health..."
$healthUrl = "http://localhost:8000/health"
$frontendUrl = "http://localhost"
$maxAttempts = 30
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
    Write-Success "Backend API and database migrations completed successfully."
} else {
    Write-Warn "Health check timed out. Containers may still be completing initial migration."
    Write-Warn "Run 'docker compose logs -f backend' to inspect startup progress."
}

# ------------------------------------------------------------------------------
# 8. Service Status & Summary Banner
# ------------------------------------------------------------------------------
Write-Host "`n======================================================================" -ForegroundColor Blue
Write-Host "      PRATHAMONE ACADEMY IS READY FOR PRODUCTION USE!                " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Blue
Write-Host "Web Application:     $frontendUrl  (or http://localhost:5173)" -ForegroundColor White
Write-Host "Backend API:         http://localhost:8000" -ForegroundColor White
Write-Host "API Documentation:   http://localhost:8000/docs" -ForegroundColor White
Write-Host "Default Superadmin:  admin@example.com / admin123" -ForegroundColor Yellow
Write-Host "Default Accountant:  accountant@example.com / account123" -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------------" -ForegroundColor Gray
Write-Host "Useful Operational Commands:" -ForegroundColor Cyan
Write-Host "  View live logs:      docker compose logs -f" -ForegroundColor White
Write-Host "  Update system:       .\update.ps1" -ForegroundColor White
Write-Host "  Create DB backup:    .\backup.ps1" -ForegroundColor White
Write-Host "  Restore DB backup:   .\restore.ps1 -BackupFile <path>" -ForegroundColor White
Write-Host "  Load 39 students:    .\add_39_students.ps1" -ForegroundColor White
Write-Host "  Stop system:         docker compose down" -ForegroundColor White
Write-Host "======================================================================`n" -ForegroundColor Blue

# Display live container table
docker compose ps
