param(
  [string]$ResourceGroup,
  [string]$AppName,
  [string]$Location = 'eastus',
  [string]$ScimSecret,
  [string]$ImageTag = 'latest',
  [switch]$DisablePersistentStorage
)

$ErrorActionPreference = 'Stop'

function New-ScimSecret {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $b64 = [Convert]::ToBase64String($bytes)
  ($b64 -replace '\+', '-' -replace '/', '_' -replace '=' , '').Substring(0,48)
}

if (-not $ResourceGroup) { $ResourceGroup = Read-Host 'Resource Group (create if missing)' }
if (-not $AppName)       { $AppName       = Read-Host 'Container App Name' }

if (-not $PSBoundParameters.ContainsKey('ScimSecret')) {
  $ScimSecret = New-ScimSecret
  Write-Host "Generated SCIM Secret: $ScimSecret" -ForegroundColor Yellow
} elseif (-not $ScimSecret) {
  Write-Host 'Empty -ScimSecret provided.' -ForegroundColor Red; exit 1
}

if (-not $ResourceGroup -or -not $AppName) { Write-Host 'Missing required values.' -ForegroundColor Red; exit 1 }

$persistentEnabled = -not $DisablePersistentStorage.IsPresent

Write-Host "ResourceGroup=$ResourceGroup AppName=$AppName Location=$Location ImageTag=$ImageTag Persistent=$persistentEnabled" -ForegroundColor Cyan

$deployScript = Join-Path $PSScriptRoot 'scripts/deploy-azure.ps1'
if (-not (Test-Path $deployScript)) {
  $remote = 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/deploy-azure.ps1'
  $deployScript = Join-Path $env:TEMP 'deploy-azure.ps1'
  Invoke-WebRequest -Uri $remote -OutFile $deployScript -UseBasicParsing
}

& $deployScript -ResourceGroup $ResourceGroup -AppName $AppName -Location $Location -ScimSecret $ScimSecret -ImageTag $ImageTag -EnablePersistentStorage:$persistentEnabled

Write-Host "SCIM Endpoint: https://<fqdn>/scim/v2" -ForegroundColor Green
Write-Host "Use the secret shown above." -ForegroundColor Green