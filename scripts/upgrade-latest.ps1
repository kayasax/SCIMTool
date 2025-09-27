#requires -Version 7.0
<#!
.SYNOPSIS
  Re-pulls the latest image tag (e.g. :latest) for the running Container App.
.DESCRIPTION
  Azure Container Apps resolves an image tag (e.g. myacr.azurecr.io/scimtool:latest) to an immutable digest
  at deployment time. Pushing a new image to the same tag does NOT automatically update the running revision.

  This helper updates (or re-updates) the container app to the specified tag so that ACA resolves it again
  to the *current* digest.

  If you push both semantic tags (v0.3.0) and a moving tag (latest), you can quickly roll forward by
  re-deploying :latest without needing to look up the newest semantic tag.

.PARAMETER ResourceGroup
  Resource group containing the Container App.
.PARAMETER AppName
  Container App name.
.PARAMETER Tag
  Image tag to deploy (default: latest).
.PARAMETER Image
  Full base image reference WITHOUT tag (e.g. myacr.azurecr.io/scimtool). If omitted, current image base will be inferred.
.PARAMETER DryRun
  Show the command only; do not execute.
.EXAMPLE
  ./upgrade-latest.ps1 -ResourceGroup scimtool-rg -AppName scimtool-prod
.EXAMPLE
  ./upgrade-latest.ps1 -ResourceGroup scimtool-rg -AppName scimtool-prod -Tag nightly
#>
param(
  [Parameter(Mandatory)][string]$ResourceGroup,
  [Parameter(Mandatory)][string]$AppName,
  [string]$Tag = 'latest',
  [string]$Image,
  [switch]$DryRun
)

Write-Host "🔄 SCIMTool Re-Pull Tag Helper" -ForegroundColor Cyan
Write-Host " Resource Group : $ResourceGroup" -ForegroundColor Gray
Write-Host " App Name      : $AppName" -ForegroundColor Gray
Write-Host " Desired Tag   : $Tag" -ForegroundColor Gray
Write-Host "" 

# Ensure logged in
try {
  $acct = az account show --output json 2>$null | ConvertFrom-Json
  if (-not $acct) { throw 'Not logged in' }
  Write-Host "✅ Azure CLI authenticated as $($acct.user.name)" -ForegroundColor Green
} catch {
  Write-Host "❌ Please run az login first." -ForegroundColor Red
  exit 1
}

Write-Host "➡️  Fetching current app definition..." -ForegroundColor Cyan
$app = az containerapp show --name $AppName --resource-group $ResourceGroup --output json 2>$null | ConvertFrom-Json
if (-not $app) { Write-Host "❌ Could not load container app." -ForegroundColor Red; exit 1 }

if (-not $Image) {
  $currentImageFull = $app.properties.template.containers[0].image
  if (-not $currentImageFull) { Write-Host "❌ Unable to determine current image from app definition." -ForegroundColor Red; exit 1 }
  # Strip tag/digest if present
  if ($currentImageFull.Contains('@')) { $base = $currentImageFull.Split('@')[0] }
  elseif ($currentImageFull.Contains(':')) { $base = ($currentImageFull.Split(':')[0]) }
  else { $base = $currentImageFull }
  $Image = $base
  Write-Host "Detected base image: $Image" -ForegroundColor Yellow
}

$newRef = "$Image:$Tag"
Write-Host "Planned image reference: $newRef" -ForegroundColor Yellow

$cmd = @(
  'az containerapp update',
  '-n', $AppName,
  '-g', $ResourceGroup,
  '--image', $newRef
) -join ' '

Write-Host "\nCommand:\n$cmd\n" -ForegroundColor Cyan

if ($DryRun) { Write-Host "Dry run only. Exiting." -ForegroundColor Yellow; exit 0 }

$confirm = Read-Host -Prompt "Proceed with update? (y/N)"
if ($confirm -notin @('y','Y')) { Write-Host "Aborted." -ForegroundColor Yellow; exit 0 }

Write-Host "🚀 Updating (forcing ACA to resolve fresh digest for tag '$Tag')..." -ForegroundColor Cyan
Invoke-Expression $cmd
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Update failed" -ForegroundColor Red; exit 1 }

Write-Host "✅ Update triggered. New revision should roll out shortly." -ForegroundColor Green
Write-Host "Tip: az containerapp revision list -n $AppName -g $ResourceGroup --output table" -ForegroundColor Gray
