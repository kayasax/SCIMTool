# Simple SCIMTool Container App Updater
# Usage: iex "& {$(irm https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/update-scimtool-simple.ps1)} -Version 'v0.2.0'"

param(
    [string]$Version = "latest",
    [string]$ResourceGroup = "scimtool-rg", 
    [string]$AppName = "scimtool-prod",
    [string]$Image = "scimtoolpublic.azurecr.io/scimtool",
    [switch]$NoPrompt
)

$ErrorActionPreference = 'Stop'

# Normalize version (remove v prefix)
$cleanVersion = $Version.Trim().TrimStart('v', 'V')
if ($cleanVersion -eq "latest") {
    $imageRef = "$Image`:latest"
} else {
    $imageRef = "$Image`:$cleanVersion"
}

Write-Host "🚀 SCIMTool Container App Updater" -ForegroundColor Cyan
Write-Host "   Version: $cleanVersion" -ForegroundColor Gray
Write-Host "   Image: $imageRef" -ForegroundColor Gray
Write-Host ""

# Check Azure CLI auth
try {
    $account = az account show --output json 2>$null | ConvertFrom-Json
    if (-not $account) { throw "Not authenticated" }
    Write-Host "✅ Authenticated as $($account.user.name)" -ForegroundColor Green
} catch {
    Write-Host "❌ Please run 'az login' first" -ForegroundColor Red
    return
}

# Build command
$cmd = "az containerapp update -n '$AppName' -g '$ResourceGroup' --image '$imageRef'"

Write-Host "Command: $cmd" -ForegroundColor Yellow
Write-Host ""

if (-not $NoPrompt) {
    $response = Read-Host "Proceed with update? (y/N)"
    if ($response -notin @('y', 'Y')) {
        Write-Host "Cancelled." -ForegroundColor Yellow
        return
    }
}

# Execute update
Write-Host "Updating container app..." -ForegroundColor Cyan
Invoke-Expression $cmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Update completed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Update failed" -ForegroundColor Red
}