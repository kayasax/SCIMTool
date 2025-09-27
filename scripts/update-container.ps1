# SCIMTool Container App Updater - Standalone version
# Downloads and executes the update script with proper parameter handling

param(
    [Parameter(Mandatory)]
    [string]$Version,
    [string]$ResourceGroup = "scimtool-rg", 
    [string]$AppName = "scimtool-prod",
    [string]$Registry = "scimtoolpublic.azurecr.io",
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
$imageRef = "$Registry/scimtool:$cleanVersion"

Write-Host "🚀 SCIMTool Container App Updater" -ForegroundColor Cyan
Write-Host "   Version: $cleanVersion" -ForegroundColor Gray
Write-Host "   Image: $imageRef" -ForegroundColor Gray
Write-Host "   Resource Group: $ResourceGroup" -ForegroundColor Gray
Write-Host "   App Name: $AppName" -ForegroundColor Gray
Write-Host ""

# Check Azure CLI authentication
try {
    Write-Host "Checking Azure CLI authentication..." -ForegroundColor Cyan
    $account = az account show --output json 2>$null | ConvertFrom-Json
    if (-not $account) { 
        throw "Not authenticated" 
    }
    Write-Host "✅ Authenticated as $($account.user.name)" -ForegroundColor Green
    Write-Host "   Subscription: $($account.name)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Azure CLI authentication required" -ForegroundColor Red
    Write-Host "   Please run: az login" -ForegroundColor Yellow
    exit 1
}

# Build the Azure CLI command
$updateCommand = @(
    "az", "containerapp", "update"
    "-n", $AppName
    "-g", $ResourceGroup  
    "--image", $imageRef
)

Write-Host "Update command:" -ForegroundColor Cyan
Write-Host "  $($updateCommand -join ' ')" -ForegroundColor Yellow
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 Dry run mode - command would execute but no changes made" -ForegroundColor Yellow
    exit 0
}

if (-not $NoPrompt) {
    do {
        $response = Read-Host "Proceed with container app update? [y/N]"
        if ([string]::IsNullOrWhiteSpace($response) -or $response -in @('n','N','no','No')) {
            Write-Host "❌ Update cancelled by user" -ForegroundColor Yellow
            exit 0
        }
    } while ($response -notin @('y','Y','yes','Yes'))
}

Write-Host "🔄 Updating container app..." -ForegroundColor Cyan
Write-Host ""

# Execute the Azure CLI command
try {
    & az containerapp update -n $AppName -g $ResourceGroup --image $imageRef
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Container app updated successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "• Monitor deployment: az containerapp revision list -n $AppName -g $ResourceGroup -o table" -ForegroundColor Gray
        Write-Host "• Check logs: az containerapp logs show -n $AppName -g $ResourceGroup --tail 20" -ForegroundColor Gray
        Write-Host "• Access app: az containerapp show -n $AppName -g $ResourceGroup --query properties.configuration.ingress.fqdn -o tsv" -ForegroundColor Gray
    } else {
        Write-Host "❌ Container app update failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Write-Host "❌ Error during update: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}