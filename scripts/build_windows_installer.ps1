<#
.SYNOPSIS
    PrathamOne EduOS - Windows Installer Build Automation
.DESCRIPTION
    PowerShell build wrapper for compiling frontend assets, staging embedded runtimes,
    and invoking the Inno Setup compiler to produce PrathamOne-EduOS-Setup-v1.0.0.exe.
.NOTES
    File:        build_windows_installer.ps1
    Project:     PrathamOne EduOS Coaching Institute Management System
    Author:      Jawahar R. Mallah
    Organization: Smritisys & AITDL Networks
    Client:      Prashant Academy Coaching Institute
    Copyright:   Copyright (c) 2026 AITDL
    License:     Proprietary
    Version:     1.0.0
    Created:     2026-11-15
#>

[CmdletBinding()]
param(
    [switch]$SkipFrontend,
    [switch]$DownloadPgsql
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  PrathamOne EduOS — Windows Installer Build Engine                   " -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Cyan

$pyArgs = @("$scriptDir\build_windows_installer.py")
if ($SkipFrontend) { $pyArgs += "--skip-frontend" }
if ($DownloadPgsql) { $pyArgs += "--download-pgsql" }

python @pyArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Build pipeline encountered an error (Exit Code: $LASTEXITCODE)." -ForegroundColor Red
    exit $LASTEXITCODE
}
