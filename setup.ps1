# SCIMTool setup bootstrap version 2025-10-02-2 (param-less)
$ErrorActionPreference = 'Stop'

# Allow overrides via environment variables (optional)
$ResourceGroup = if ($env:SCIM_RG) { $env:SCIM_RG } else { $null }
$AppName       = if ($env:SCIM_APP) { $env:SCIM_APP } else { $null }
$Location      = if ($env:SCIM_LOCATION) { $env:SCIM_LOCATION } else { 'eastus' }
$ImageTag      = if ($env:SCIM_IMAGE_TAG) { $env:SCIM_IMAGE_TAG } else { 'latest' }
$PersistToggle = if ($env:SCIM_DISABLE_PERSIST) { $true } else { $false }

function New-ScimSecret {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $b64 = [Convert]::ToBase64String($bytes)
  ($b64 -replace '\+', '-' -replace '/', '_' -replace '=' , '').Substring(0,48)
}

if (-not $ResourceGroup) { $ResourceGroup = Read-Host 'Resource Group' }
if (-not $AppName)       { $AppName       = Read-Host 'Container App Name' }

if (-not $ResourceGroup -or -not $AppName) { Write-Host 'Missing required values.'; exit 1 }

# Always generate a new secret each run
$ScimSecret = New-ScimSecret
Write-Host "Generated SCIM Secret: $ScimSecret" -ForegroundColor Yellow

$persistentEnabled = -not $PersistToggle
Write-Host "RG=$ResourceGroup App=$AppName Loc=$Location Tag=$ImageTag Persistent=$persistentEnabled" -ForegroundColor Cyan

$deployScript = Join-Path $PSScriptRoot 'scripts/deploy-azure.ps1'
if (-not (Test-Path $deployScript)) {
  $remote = 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/deploy-azure.ps1'
  $deployScript = Join-Path $env:TEMP 'deploy-azure.ps1'
  Invoke-WebRequest -Uri $remote -OutFile $deployScript -UseBasicParsing
}

if ($env:SCIM_NO_DEPLOY) {
  Write-Host 'SCIM_NO_DEPLOY=1 -> Skipping Azure deployment step (validation only).' -ForegroundColor Yellow
} else {
  # Azure CLI auth check
  try {
    az account show --output none 2>$null
  } catch {
    Write-Host 'Azure CLI not authenticated (run: az login). Aborting deploy.' -ForegroundColor Red
    exit 1
  }
  try {
    az account show --output none 2>$null
  } catch {
    Write-Host 'Azure CLI not authenticated. Run: az login  (then re-run the one-liner)' -ForegroundColor Red
    Write-Host 'One-liner:' -ForegroundColor Yellow
    Write-Host '  iex (irm https://raw.githubusercontent.com/kayasax/SCIMTool/master/setup.ps1)' -ForegroundColor Yellow
    exit 1
  }

  & $deployScript -ResourceGroup $ResourceGroup -AppName $AppName -Location $Location -ScimSecret $ScimSecret -ImageTag $ImageTag -EnablePersistentStorage:$persistentEnabled
}

Write-Host "SCIM Endpoint: https://<fqdn>/scim/v2" -ForegroundColor Green
Write-Host "Secret (copy & store): $ScimSecret" -ForegroundColor Green