#requires -Version 7.0
<#!
.SYNOPSIS
  Provides an assisted upgrade workflow for an existing SCIMTool Azure Container App deployment.
.DESCRIPTION
  Fetches the currently running version (local) and compares it with an upstream GitHub release tag list.
  If a newer version exists, offers to run an az containerapp update using the chosen tag.

  This script is intentionally self-contained; it does not rely on a static manifest file.
  It queries the GitHub Releases API so each repo tag automatically becomes an available upgrade target.

.PARAMETER ResourceGroup
  Azure resource group containing the Container App
.PARAMETER AppName
  Azure Container App name
.PARAMETER Image
  Base image reference (e.g. myregistry.azurecr.io/scimtool)
.PARAMETER GitHubRepo
  GitHub repo in owner/name form (default: kayasax/SCIMTool)
.PARAMETER Prerelease
  Include pre-release versions (default: false)
.PARAMETER DryRun
  Show actions but do not perform update
.EXAMPLE
  ./upgrade-help.ps1 -ResourceGroup scimtool-rg -AppName scimtool-prod -Image myacr.azurecr.io/scimtool
.EXAMPLE
  ./upgrade-help.ps1 -ResourceGroup scimtool-rg -AppName scimtool-prod -Image myacr.azurecr.io/scimtool -Prerelease
#>
param(
  [Parameter(Mandatory)][string]$ResourceGroup,
  [Parameter(Mandatory)][string]$AppName,
  [Parameter(Mandatory)][string]$Image,
  [string]$GitHubRepo = 'kayasax/SCIMTool',
  [switch]$Prerelease,
  [switch]$DryRun
)

Write-Host "🔍 SCIMTool Upgrade Helper" -ForegroundColor Cyan
Write-Host "Resource Group: $ResourceGroup" -ForegroundColor Gray
Write-Host "App Name      : $AppName" -ForegroundColor Gray
Write-Host "Base Image    : $Image" -ForegroundColor Gray
Write-Host "GitHub Repo   : $GitHubRepo" -ForegroundColor Gray
Write-Host "Include Pre   : $($Prerelease.IsPresent)" -ForegroundColor Gray
Write-Host "Dry Run       : $($DryRun.IsPresent)" -ForegroundColor Gray
Write-Host "" 

# Validate az CLI auth
try {
  $acct = az account show --output json 2>$null | ConvertFrom-Json
  if (-not $acct) { throw 'Not authenticated' }
  Write-Host "✅ Azure CLI authenticated as $($acct.user.name)" -ForegroundColor Green
} catch {
  Write-Host "❌ You must run az login first" -ForegroundColor Red
  exit 1
}

# Get current FQDN & fetch local version endpoint
Write-Host "➡️  Retrieving current Container App info..." -ForegroundColor Cyan
$app = az containerapp show --name $AppName --resource-group $ResourceGroup --output json 2>$null | ConvertFrom-Json
if (-not $app) { Write-Host "❌ Could not retrieve container app." -ForegroundColor Red; exit 1 }
$fqdn = $app.properties.configuration.ingress.fqdn
$currentUrl = "https://$fqdn/scim/admin/version"

$currentVersion = $null
try {
  $currentVersion = Invoke-RestMethod -Uri $currentUrl -Headers @{ Authorization = 'Bearer ' + ($env:SCIM_SHARED_SECRET ?? 'changeme') } -TimeoutSec 15
  Write-Host "Current Running Version: $($currentVersion.version)" -ForegroundColor Yellow
} catch {
  Write-Host "⚠️  Could not query local version endpoint ($currentUrl). Proceeding anyway." -ForegroundColor Yellow
}

# Fetch release tags from GitHub
Write-Host "📥 Fetching GitHub releases..." -ForegroundColor Cyan
$releasesUri = "https://api.github.com/repos/$GitHubRepo/releases"
try {
  $releases = Invoke-RestMethod -Uri $releasesUri -Headers @{ 'User-Agent' = 'SCIMToolUpgradeScript' }
} catch {
  Write-Host "❌ Failed to fetch releases from GitHub: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

if (-not $Prerelease) {
  $releases = $releases | Where-Object { -not $_.prerelease }
}

if (-not $releases) { Write-Host "❌ No releases found." -ForegroundColor Red; exit 1 }

# Sort by published date descending
$sorted = $releases | Sort-Object {[DateTime]$_.published_at} -Descending

Write-Host "Available Versions:" -ForegroundColor Cyan
$index = 1
$sorted | ForEach-Object {
  $tag = $_.tag_name
  $mark = ''
  if ($currentVersion -and $currentVersion.version -eq $tag) { $mark = '(current)' }
  Write-Host ("  [{0}] {1} {2}" -f $index, $tag, $mark)
  $index++
}

$latest = $sorted[0].tag_name
if ($currentVersion -and $currentVersion.version -eq $latest) {
  Write-Host "✅ Already on the latest version: $latest" -ForegroundColor Green
  $proceed = Read-Host -Prompt "Upgrade anyway to a different version? (y/N)"
  if ($proceed -notin @('y','Y')) { exit 0 }
}

$choice = Read-Host -Prompt "Enter the number of the version to deploy (default 1)"
if ([string]::IsNullOrWhiteSpace($choice)) { $choice = 1 }
if ($choice -as [int] -le 0 -or $choice -as [int] -gt $sorted.Count) { Write-Host "❌ Invalid selection" -ForegroundColor Red; exit 1 }
$selected = $sorted[[int]$choice - 1]
$tag = $selected.tag_name

Write-Host ""; Write-Host "Selected Version: $tag" -ForegroundColor Yellow

# Image reference (assumes tag maps directly)
$imageRef = "$Image:$tag"
Write-Host "Image Reference: $imageRef" -ForegroundColor Gray

$cmd = @(
  'az containerapp update',
  '-n', $AppName,
  '-g', $ResourceGroup,
  '--image', $imageRef
) -join ' '

Write-Host "\nPlanned Command:\n$cmd\n" -ForegroundColor Cyan

if ($DryRun) { Write-Host "Dry run specified. Exiting without changes." -ForegroundColor Yellow; exit 0 }

$confirm = Read-Host -Prompt "Proceed with update? (y/N)"
if ($confirm -notin @('y','Y')) { Write-Host "Aborted." -ForegroundColor Yellow; exit 0 }

Write-Host "🚀 Updating container app..." -ForegroundColor Cyan
iex $cmd
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Update failed" -ForegroundColor Red; exit 1 }

Write-Host "✅ Update initiated. The new revision may take a minute to become active." -ForegroundColor Green
Write-Host "You can watch logs with: az containerapp logs show -n $AppName -g $ResourceGroup --follow" -ForegroundColor Gray
