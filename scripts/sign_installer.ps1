# /**
#  * @file        sign_installer.ps1
#  * @project     PrathamOne EduOS Coaching Institute Management System
#  * @module      scripts.sign_installer
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-15
#  * @updated     2026-11-15
#  *
#  * @description Code-signing automation utility for PrathamOne EduOS installer.
#  *              Applies Authenticode digital signatures and exports local root certificates.
#  */

[CmdletBinding()]
param(
    [string]$InstallerPath = "dist\PrathamOne-EduOS-Setup-v1.0.0.exe",
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

# 1. Look for existing AITDL Code Signing Certificate in Local User Store
$cert = Get-ChildItem -Path Cert:\CurrentUser\My -CodeSigningCert | Where-Object { $_.Subject -like "*AITDL*" } | Select-Object -First 1

if (-not $cert) {
    Write-Host "[SIGN] Generating new AITDL Code Signing Certificate in Local User Store..." -ForegroundColor Yellow
    $certParams = @{
        Type = "CodeSigning"
        Subject = 'CN=AITDL (AI Technology and Development Lab), O=AITDL, C=IN'
        CertStoreLocation = "Cert:\CurrentUser\My"
        NotAfter = (Get-Date).AddYears(5)
    }
    $cert = New-SelfSignedCertificate @certParams
    Write-Host "[SIGN] Generated certificate thumbprint: $($cert.Thumbprint)" -ForegroundColor Green
} else {
    Write-Host "[SIGN] Using existing AITDL certificate: $($cert.Thumbprint)" -ForegroundColor Green
}

# 2. Sign the binary
Write-Host "[SIGN] Applying Authenticode signature to $InstallerPath..." -ForegroundColor Yellow
try {
    $sigResult = Set-AuthenticodeSignature -FilePath $fullInstallerPath -Certificate $cert -TimestampServer $TimestampServer
} catch {
    Write-Host "[SIGN WARN] Timestamp server unreachable, signing without timestamp..." -ForegroundColor DarkYellow
    $sigResult = Set-AuthenticodeSignature -FilePath $fullInstallerPath -Certificate $cert
}

Write-Host "[SIGN STATUS] $($sigResult.Status): $($sigResult.StatusMessage)" -ForegroundColor Green

# 3. Export Public Certificate for Local Windows Trust
$distDir = Split-Path -Parent $fullInstallerPath
$certExportPath = Join-Path $distDir "AITDL_CodeSigning_CA.cer"
Export-Certificate -Cert $cert -FilePath $certExportPath -Force | Out-Null
Write-Host "[SIGN] Public certificate exported to: $certExportPath" -ForegroundColor Cyan

# 4. Optional local installation into Trusted Root
Write-Host "`n----------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "LOCAL MACHINE TRUST INSTRUCTIONS (To eliminate Unknown Publisher):" -ForegroundColor White
Write-Host "Run this single command in PowerShell (Run as Administrator):" -ForegroundColor Yellow
Write-Host "  Import-Certificate -FilePath `"$certExportPath`" -CertStoreLocation `"Cert:\LocalMachine\Root`"" -ForegroundColor Green
Write-Host "Once imported, Windows UAC will show: Verified Publisher: AITDL" -ForegroundColor White
Write-Host "----------------------------------------------------------------------`n" -ForegroundColor DarkGray
