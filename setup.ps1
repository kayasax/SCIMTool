<#!
SYNOPSIS
    Simplified deployment bootstrap for SCIMTool (PowerShell 5.1+ compatible)

DESCRIPTION
    This script now ONLY deploys/updates the Azure Container App using the
    GitHub Container Registry image (ghcr.io/kayasax/scimtool:<tag>).
    All previous flags (-TestLocal, -StartTunnel, etc.) have been removed to
    keep onboarding frictionless.

USAGE (Interactive zero‑parameter):
    iex (irm https://raw.githubusercontent.com/kayasax/SCIMTool/master/setup.ps1)

USAGE (Non‑interactive):
    ./setup.ps1 -ResourceGroup my-rg -AppName scimtool-prod -ScimSecret SUPER-SECRET -ImageTag 0.7.11

PARAMETERS
    ResourceGroup  : (optional) RG name (prompted if missing)
    AppName        : (optional) Container App name (prompted if missing)
    Location       : Azure region (default: eastus)
    ScimSecret     : Shared secret (auto-generated if omitted)
    ImageTag       : Image tag in ghcr.io/kayasax/scimtool (default: latest)
    EnablePersistentStorage : Switch (default: On). Use -EnablePersistentStorage:$false to disable.

NOTES
    Persistent storage mounts Azure Files at /app/data (backup copy) while runtime DB lives in /tmp/local-data.
    Rotating the secret: re-run with a new -ScimSecret and (optionally) new -ImageTag.
!>

param(
    [string]$ResourceGroup,
    [string]$AppName,
    [string]$Location = 'eastus',
    [string]$ScimSecret,
    [string]$ImageTag = 'latest',
    [switch]$EnablePersistentStorage = $true
)
# Dynamic secret generation for security
function New-RandomScimSecret { "SCIM-$(Get-Random -Minimum 10000 -Maximum 99999)-$(Get-Date -Format 'yyyyMMdd')" }

# Interactive prompts for missing values (so script works with zero parameters)
if (-not $ResourceGroup) { $ResourceGroup = Read-Host 'Resource Group (will be created if missing)' }
if (-not $AppName)       { $AppName       = Read-Host 'Container App Name' }
if (-not $ScimSecret)    { $ScimSecret    = Read-Host 'SCIM Secret (Enter for auto-generate)'; if (-not $ScimSecret) { $ScimSecret = New-RandomScimSecret; Write-Host "Generated Secret: $ScimSecret" -ForegroundColor Yellow } }

if (-not $ResourceGroup -or -not $AppName -or -not $ScimSecret) {
    Write-Host 'Missing required values. Aborting.' -ForegroundColor Red
    exit 1
}

Write-Host ''
Write-Host 'Deployment Configuration' -ForegroundColor Cyan
Write-Host "  Resource Group : $ResourceGroup" -ForegroundColor White
Write-Host "  App Name       : $AppName" -ForegroundColor White
Write-Host "  Location       : $Location" -ForegroundColor White
Write-Host "  Image Tag      : $ImageTag" -ForegroundColor White
Write-Host "  Persistent     : $($EnablePersistentStorage.IsPresent)" -ForegroundColor White
Write-Host "  SCIM Secret    : $ScimSecret" -ForegroundColor Yellow
Write-Host ''
Write-Host 'Starting Azure deployment...' -ForegroundColor Cyan

if (Test-Path "$PSScriptRoot\scripts\deploy-azure.ps1") {
  & "$PSScriptRoot\scripts\deploy-azure.ps1" -ResourceGroup $ResourceGroup -AppName $AppName -Location $Location -ScimSecret $ScimSecret -ImageTag $ImageTag -EnablePersistentStorage:$EnablePersistentStorage
} else {
  Write-Host 'deploy-azure.ps1 not found locally. Attempting remote fetch...' -ForegroundColor Yellow
  $remote = 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/deploy-azure.ps1'
  try {
    $temp = Join-Path $env:TEMP "deploy-azure.ps1"
    Invoke-WebRequest -Uri $remote -OutFile $temp -UseBasicParsing
    & $temp -ResourceGroup $ResourceGroup -AppName $AppName -Location $Location -ScimSecret $ScimSecret -ImageTag $ImageTag -EnablePersistentStorage:$EnablePersistentStorage
  } catch {
    Write-Host 'Failed to fetch remote deploy script.' -ForegroundColor Red
    exit 1
  }
}

Write-Host ''
Write-Host 'You can now configure Microsoft Entra provisioning:' -ForegroundColor Yellow
Write-Host '  Tenant URL  : https://<fqdn>/scim/v2' -ForegroundColor White
Write-Host '  Secret Token: (the one you provided/generated)' -ForegroundColor White
Write-Host ''
Write-Host 'Re-run this script to update image tag or rotate secret.' -ForegroundColor Gray