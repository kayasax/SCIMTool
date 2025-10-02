﻿# SCIMTool simple setup (raw one-liner)
$ErrorActionPreference = 'Stop'

# Defaults
$Location = 'eastus'
$ImageTag = 'latest'
$persistentEnabled = $true

function New-ScimSecret {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $b64 = [Convert]::ToBase64String($bytes)
  ($b64 -replace '\+', '-' -replace '/', '_' -replace '=' , '').Substring(0,48)
}

if (-not $ResourceGroup) { $ResourceGroup = Read-Host 'Resource Group (will be created if missing)' }
if (-not $AppName)       { $AppName       = Read-Host 'Container App Name' }
if (-not $ResourceGroup -or -not $AppName) { Write-Host 'Missing required values.' -ForegroundColor Red; exit 1 }

$ScimSecret = New-ScimSecret
Write-Host "Generated Secret: $ScimSecret" -ForegroundColor Yellow
Write-Host "Summary: RG=$ResourceGroup App=$AppName Location=$Location Tag=$ImageTag Persistent=$persistentEnabled" -ForegroundColor Cyan

# Download fresh deploy script every run
$deployUrl = 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/deploy-azure.ps1'
$deployScript = Join-Path $env:TEMP 'deploy-azure.ps1'
Invoke-WebRequest -Uri $deployUrl -OutFile $deployScript -UseBasicParsing

try { az account show --output none 2>$null } catch { Write-Host 'Azure CLI not authenticated. Run: az login' -ForegroundColor Red; exit 1 }

& pwsh -NoLogo -NoProfile -File $deployScript -ResourceGroup $ResourceGroup -AppName $AppName -Location $Location -ScimSecret $ScimSecret -ImageTag $ImageTag -EnablePersistentStorage:$persistentEnabled
if ($LASTEXITCODE -ne 0) { Write-Host "Deployment failed (exit $LASTEXITCODE)" -ForegroundColor Red; exit $LASTEXITCODE }

Write-Host "SCIM Endpoint (replace with actual FQDN shown above): https://<fqdn>/scim/v2" -ForegroundColor Green
Write-Host "Secret: $ScimSecret" -ForegroundColor Green