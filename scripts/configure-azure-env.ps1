#Requires -Version 5.1
<#
.SYNOPSIS
    Configure Azure environment variables for SCIMTool image auto-detection.

.DESCRIPTION
    Sets SCIM_RG, SCIM_APP, and AZURE_SUBSCRIPTION_ID environment variables
    in the Container App to enable auto-detection of the current image tag.

.PARAMETER ResourceGroup
    Azure Resource Group name (e.g., "RG-SCIMTOOL")

.PARAMETER AppName
    Azure Container App name (e.g., "scimtool")

.EXAMPLE
    .\scripts\configure-azure-env.ps1 -ResourceGroup "RG-SCIMTOOL" -AppName "scimtool"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,
    
    [Parameter(Mandatory=$true)]
    [string]$AppName
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n==>" -ForegroundColor Cyan -NoNewline
    Write-Host " $Message" -ForegroundColor White
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

# Get current subscription ID
Write-Step "Getting Azure subscription information"
$subId = az account show --query id -o tsv 2>$null
if (!$subId) {
    Write-Error "Failed to get subscription ID. Please run 'az login' first."
    exit 1
}
Write-Success "Subscription ID: $subId"

# Get current env vars to preserve them
Write-Step "Reading current environment variables"
$currentEnvVars = az containerapp show -n $AppName -g $ResourceGroup --query "properties.template.containers[0].env" -o json 2>$null | ConvertFrom-Json

if (!$currentEnvVars) {
    Write-Error "Failed to read current environment variables"
    exit 1
}

# Build env var updates - preserve existing
$envUpdates = @()
foreach ($var in $currentEnvVars) {
    # Skip Azure config vars (we'll set them fresh)
    if ($var.name -notin @('SCIM_RG', 'SCIM_APP', 'AZURE_SUBSCRIPTION_ID')) {
        if ($var.secretRef) {
            $envUpdates += "$($var.name)=secretref:$($var.secretRef)"
        } else {
            $envUpdates += "$($var.name)=$($var.value)"
        }
    }
}

# Add Azure config vars
$envUpdates += "SCIM_RG=$ResourceGroup"
$envUpdates += "SCIM_APP=$AppName"
$envUpdates += "AZURE_SUBSCRIPTION_ID=$subId"

Write-Success "Environment variables prepared"

# Update Container App
Write-Step "Updating Container App environment variables"
$envString = $envUpdates -join " "
Write-Host "Setting:" -ForegroundColor Yellow
Write-Host "  SCIM_RG=$ResourceGroup" -ForegroundColor Gray
Write-Host "  SCIM_APP=$AppName" -ForegroundColor Gray
Write-Host "  AZURE_SUBSCRIPTION_ID=$subId" -ForegroundColor Gray
Write-Host "  + $(($currentEnvVars | Where-Object { $_.name -notin @('SCIM_RG', 'SCIM_APP', 'AZURE_SUBSCRIPTION_ID') }).Count) existing variables" -ForegroundColor Gray

$result = az containerapp update -n $AppName -g $ResourceGroup --set-env-vars $envString 2>&1 | Out-String

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to update environment variables"
    Write-Host $result -ForegroundColor Red
    exit 1
}

Write-Success "Environment variables updated successfully"
Write-Host ""
Write-Host "The Container App will restart with the new configuration." -ForegroundColor Green
Write-Host "Test banner should now auto-detect the current image tag." -ForegroundColor Green
