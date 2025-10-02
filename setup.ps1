<#
SCIMTool Deployment Bootstrap (PowerShell 5.1 compatible)

Purpose:
  Deploy or update the Azure Container App using an image from:
    ghcr.io/kayasax/scimtool:<tag>

Key Behaviors:
  - ALWAYS generates a NEW secret each run unless you explicitly pass -ScimSecret
  - Prompts for missing values (zero parameter friendly)
  - Persistent storage ON by default (stores backups under /app/data)

Usage (interactive):
  iex (irm https://raw.githubusercontent.com/kayasax/SCIMTool/master/setup.ps1)

Usage (non-interactive example):
  ./setup.ps1 -ResourceGroup my-rg -AppName scimtool-prod -ImageTag 0.7.11

Optional override secret (NOT recommended routinely):
  ./setup.ps1 -ResourceGroup my-rg -AppName scimtool-prod -ScimSecret MyStaticSecret123!

Disable persistent storage (NOT recommended):
  ./setup.ps1 -ResourceGroup my-rg -AppName scimtool-prod -DisablePersistentStorage

Security:
  A fresh high-entropy secret is generated when -ScimSecret is omitted. This enforces unique deployment tokens.
  Copy and store it securely; it cannot be recovered later from the script.

Notes:
  Runtime DB: /tmp/local-data/scim.db (ephemeral)
  Backup copy (if persistent enabled): /app/data/scim.db
  Re-run to upgrade image or rotate the secret.
#>

param(
  [string]$ResourceGroup,
  [string]$AppName,
  [string]$Location = 'eastus',
  [string]$ScimSecret,
  [string]$ImageTag = 'latest',
  [switch]$DisablePersistentStorage
)

$ErrorActionPreference = 'Stop'

# --- Helper: Strong secret generator (32 bytes -> base64 url safe) ---
function New-ScimSecret {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $b64 = [Convert]::ToBase64String($bytes)
  # Make URL safe & trim padding
  ($b64 -replace '\+', '-' -replace '/', '_' -replace '=' , '').Substring(0,48)
}

# Determine persistent storage
$persistentEnabled = -not $DisablePersistentStorage.IsPresent
# Interactive collection
if (-not $ResourceGroup) { $ResourceGroup = Read-Host 'Resource Group (will be created if missing)' }
if (-not $AppName)       { $AppName       = Read-Host 'Container App Name' }

# Secret handling: ALWAYS generate if user did not pass one
if (-not $PSBoundParameters.ContainsKey('ScimSecret')) {
  Write-Host 'Generating unique SCIM secret (no reuse).' -ForegroundColor Yellow
  $ScimSecret = New-ScimSecret
  Write-Host "Generated Secret: $ScimSecret" -ForegroundColor Green
  Write-Host 'Store this securely. It will NOT be shown again after this run.' -ForegroundColor Yellow
} elseif (-not $ScimSecret) {
  Write-Host 'Empty -ScimSecret provided. Aborting.' -ForegroundColor Red
  exit 1
} elseif ($ScimSecret.Length -lt 16) {
  Write-Host 'Provided -ScimSecret is too short (min 16 chars). Aborting.' -ForegroundColor Red
  exit 1
}

if (-not $ResourceGroup -or -not $AppName) {
  Write-Host 'Missing required values. Aborting.' -ForegroundColor Red
  exit 1
}

Write-Host ''
Write-Host 'Deployment Configuration' -ForegroundColor Cyan
Write-Host "  Resource Group : $ResourceGroup" -ForegroundColor White
Write-Host "  App Name       : $AppName" -ForegroundColor White
Write-Host "  Location       : $Location" -ForegroundColor White
Write-Host "  Image Tag      : $ImageTag" -ForegroundColor White
Write-Host "  Persistent     : $persistentEnabled" -ForegroundColor White
Write-Host "  SCIM Secret    : $ScimSecret" -ForegroundColor Yellow
Write-Host ''
Write-Host 'Starting Azure deployment...' -ForegroundColor Cyan

if (Test-Path "$PSScriptRoot\scripts\deploy-azure.ps1") {
  & "$PSScriptRoot\scripts\deploy-azure.ps1" -ResourceGroup $ResourceGroup -AppName $AppName -Location $Location -ScimSecret $ScimSecret -ImageTag $ImageTag -EnablePersistentStorage:$persistentEnabled
} else {
  Write-Host 'deploy-azure.ps1 not found locally. Attempting remote fetch...' -ForegroundColor Yellow
  $remote = 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/deploy-azure.ps1'
  try {
    $temp = Join-Path $env:TEMP "deploy-azure.ps1"
    Invoke-WebRequest -Uri $remote -OutFile $temp -UseBasicParsing
  & $temp -ResourceGroup $ResourceGroup -AppName $AppName -Location $Location -ScimSecret $ScimSecret -ImageTag $ImageTag -EnablePersistentStorage:$persistentEnabled
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