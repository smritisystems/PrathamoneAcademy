# /**
#  * @file        sign_installer.ps1
#  * @project     PrathamOne EduOS Coaching Institute Management System
#  * @module      scripts.sign_installer
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-15
#  * @updated     2026-11-16
#  *
#  * @description Signs and verifies release binaries using a trusted production
#  *              Authenticode certificate; refuses self-signed certificates.
#  */

[CmdletBinding()]
param(
    [string]$InstallerPath = "dist\PrathamOne-EduOS-Setup-v1.0.0.exe",
    [Parameter(Mandatory = $true)]
    [string]$CertificateThumbprint,
    [string]$TimestampServer = "http://timestamp.digicert.com"
)

$ErrorActionPreference = "Stop"

$fullInstallerPath = Join-Path $PSScriptRoot "..\$InstallerPath"
if (-not (Test-Path $fullInstallerPath)) {
    Write-Error "Installer binary not found at: $fullInstallerPath"
    exit 1
}

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "       PRATHAMONE EduOS -- AUTHENTICODE CODE SIGNING UTILITY          " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

if (($CertificateThumbprint -replace '\s', '') -notmatch '^[A-Fa-f0-9]{40}$') {
    throw "Provide the thumbprint of the trusted production code-signing certificate."
}

$normalizedThumbprint = $CertificateThumbprint -replace '\s', ''
$cert = Get-ChildItem -Path Cert:\CurrentUser\My -CodeSigningCert |
    Where-Object { $_.Thumbprint -eq $normalizedThumbprint } |
    Select-Object -First 1
if (-not $cert) {
    throw "The requested code-signing certificate was not found in the current user's Personal store."
}
if (-not $cert.HasPrivateKey) {
    throw "The requested code-signing certificate has no accessible private key."
}
if ($cert.Subject -eq $cert.Issuer) {
    throw "Self-signed certificates are prohibited for customer release binaries."
}

$chain = New-Object System.Security.Cryptography.X509Certificates.X509Chain
if (-not $chain.Build($cert)) {
    throw "The code-signing certificate chain is not trusted or is not currently valid."
}

$signToolCommand = Get-Command signtool.exe -ErrorAction SilentlyContinue
$signToolPath = if ($signToolCommand) { $signToolCommand.Source } else { $null }
if (-not $signToolPath) {
    $windowsKitsBin = Join-Path ([Environment]::GetFolderPath("ProgramFilesX86")) "Windows Kits\10\bin\*\x64\signtool.exe"
    $signToolPath = Get-ChildItem -Path $windowsKitsBin -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending |
        Select-Object -First 1 -ExpandProperty FullName
}
if (-not $signToolPath) {
    throw "SignTool was not found. Install the Windows SDK before signing release binaries."
}

# Sign and verify binaries (launchers and installer).
$binariesToSign = @($fullInstallerPath)
$launcherExe = Join-Path $PSScriptRoot "..\installer\files\PrathamOne.exe"
$stopExe = Join-Path $PSScriptRoot "..\installer\files\StopPrathamOne.exe"
if (Test-Path $launcherExe) { $binariesToSign += $launcherExe }
if (Test-Path $stopExe) { $binariesToSign += $stopExe }

foreach ($binPath in $binariesToSign) {
    $binName = Split-Path -Leaf $binPath
    Write-Host "[SIGN] Signing $binName with SHA-256 and a trusted timestamp..." -ForegroundColor Yellow
    & $signToolPath sign /sha1 $normalizedThumbprint /s My /fd SHA256 /tr $TimestampServer /td SHA256 $binPath
    if ($LASTEXITCODE -ne 0) {
        throw "SignTool failed to sign $binName."
    }

    & $signToolPath verify /pa /all /v $binPath
    if ($LASTEXITCODE -ne 0) {
        throw "Authenticode verification failed for $binName."
    }
}

Write-Host "[SIGN SUCCESS] All release binaries are signed and verified." -ForegroundColor Green
