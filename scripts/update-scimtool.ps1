#requires -Version 7.0
<#
.SYNOPSIS
  Update the SCIMTool Azure Container App to a specific semantic version.
.DESCRIPTION
  Pulls the public ACR image tagged with the supplied version (v-prefixed or bare),
  validates Azure CLI authentication, and triggers an ACA update.
.PARAMETER Version
  Version tag to deploy (accepts "0.2.0" or "v0.2.0").
.PARAMETER ResourceGroup
  Container App resource group (default: scimtool-rg)
.PARAMETER AppName
  Container App name (default: scimtool-prod)
.PARAMETER Image
  Base image reference without tag (default: scimtoolpublic.azurecr.io/scimtool)
.PARAMETER NoPrompt
  Skip confirmation.
.PARAMETER DryRun
  Show the az command without executing.
.EXAMPLE
  ./update-scimtool.ps1 -Version v0.2.0
.EXAMPLE
  ./update-scimtool.ps1 -Version v0.2.0 -NoPrompt
#>
param(
  [Parameter(Mandatory)][string]$Version,
  [string]$ResourceGroup = 'scimtool-rg',
  [string]$AppName = 'scimtool-prod',
  [string]$Image = 'scimtoolpublic.azurecr.io/scimtool',
  [switch]$NoPrompt,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Normalize-Version([string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw 'Version cannot be empty.'
  }
  return $value.Trim().TrimStart('v','V')
}

$cleanVersion = Normalize-Version $Version
$imageRef = "$Image:$cleanVersion"

Write-Host "🚀 SCIMTool Container App Updater" -ForegroundColor Cyan
Write-Host " Version       : $cleanVersion" -ForegroundColor Gray
Write-Host " ResourceGroup : $ResourceGroup" -ForegroundColor Gray
Write-Host " App Name      : $AppName" -ForegroundColor Gray
Write-Host " Image         : $imageRef" -ForegroundColor Gray
Write-Host ""

try {
  $acct = az account show --output json 2>$null | ConvertFrom-Json
  if (-not $acct) { throw 'Not logged in' }
  Write-Host "✅ Azure CLI authenticated as $($acct.user.name)" -ForegroundColor Green
} catch {
  Write-Host "❌ Please run 'az login' before invoking this helper." -ForegroundColor Red
  exit 1
}

$command = "az containerapp update -n `"$AppName`" -g `"$ResourceGroup`" --image `"$imageRef`""
Write-Host ""
Write-Host "Command:" -ForegroundColor Cyan
Write-Host $command -ForegroundColor Yellow
Write-Host ""

if ($DryRun) {
  Write-Host "Dry run requested. Exiting without executing." -ForegroundColor Yellow
  exit 0
}

if (-not $NoPrompt) {
  $response = Read-Host 'Proceed with update? (y/N)'
  if ($response -notin @('y','Y')) {
    Write-Host 'Aborted.' -ForegroundColor Yellow
    exit 0
  }
}

Invoke-Expression $command
if ($LASTEXITCODE -ne 0) {
  Write-Host '❌ az containerapp update failed.' -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "✅ Update triggered. Monitor revisions with:" -ForegroundColor Green
Write-Host "   az containerapp revision list -n $AppName -g $ResourceGroup --output table" -ForegroundColor Gray