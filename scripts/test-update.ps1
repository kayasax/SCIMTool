#Requires -Version 5.1
<#
.SYNOPSIS
    Test a pre-release version of SCIMTool without affecting other users.

.DESCRIPTION
    This script deploys a test image from GHCR to your Azure Container App
    without tagging it as 'latest'. This allows you to test new features
    before releasing them to users.

.PARAMETER TestTag
    The test tag to deploy (e.g., "test-collision-ui", "test-paging").
    Default: "test-latest"

.PARAMETER ResourceGroup
    Azure Resource Group name. If not provided, will search for Container Apps.

.PARAMETER AppName
    Azure Container App name. If not provided, will search in Resource Group.

.PARAMETER CreateRevision
    If specified, creates a new revision without deactivating the old one.
    Useful for A/B testing or quick rollback.

.PARAMETER Force
    Skip confirmation prompt and proceed immediately with deployment.

.EXAMPLE
    # Deploy from current branch (if build-test.yml workflow ran)
    .\scripts\test-update.ps1

.EXAMPLE
    # Deploy specific test tag
    .\scripts\test-update.ps1 -TestTag "test-collision-ui"

.EXAMPLE
    # Deploy without confirmation prompt
    .\scripts\test-update.ps1 -TestTag "test-collision-ui" -Force

.EXAMPLE
    # Deploy to specific app with revision mode
    .\scripts\test-update.ps1 -TestTag "test-paging" -ResourceGroup "scimtool-test-rg" -AppName "scimtool-test" -CreateRevision

.EXAMPLE
    # Rollback to production latest
    .\scripts\test-update.ps1 -TestTag "latest"
#>

[CmdletBinding()]
param(
    [string]$TestTag = "test-latest",
    [string]$ResourceGroup,
    [string]$AppName,
    [switch]$CreateRevision,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Gray
}

# Check Azure CLI
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Azure CLI not found. Install from: https://aka.ms/InstallAzureCLI" -ForegroundColor Red
    exit 1
}

# Check authentication
Write-Step "Validating Azure CLI authentication"
try {
    $account = az account show 2>$null | ConvertFrom-Json
    if (-not $account) { throw "Not authenticated" }
    Write-Info "Subscription: $($account.name) ($($account.id))"
} catch {
    Write-Host "❌ Not authenticated. Run: az login" -ForegroundColor Red
    exit 1
}

# Discover Resource Group if not provided
if (-not $ResourceGroup) {
    Write-Step "Discovering Container Apps"
    $apps = az resource list --resource-type "Microsoft.App/containerApps" --query "[].{name:name, rg:resourceGroup}" 2>$null | ConvertFrom-Json
    
    if (-not $apps -or $apps.Count -eq 0) {
        Write-Host "❌ No Container Apps found in subscription. Specify -ResourceGroup and -AppName." -ForegroundColor Red
        exit 1
    }
    
    if ($apps.Count -eq 1) {
        $ResourceGroup = $apps[0].rg
        $AppName = $apps[0].name
        Write-Info "Found: $AppName in $ResourceGroup"
    } else {
        Write-Host "`nMultiple Container Apps found:" -ForegroundColor Yellow
        $apps | ForEach-Object { Write-Host "  • $($_.name) [$($_.rg)]" -ForegroundColor Gray }
        $ResourceGroup = Read-Host "`nEnter Resource Group name"
        if (-not $AppName) {
            $AppName = Read-Host "Enter App name"
        }
    }
}

# Discover App Name if not provided
if (-not $AppName) {
    Write-Step "Discovering Container App in $ResourceGroup"
    $apps = az resource list --resource-group $ResourceGroup --resource-type "Microsoft.App/containerApps" --query "[].name" -o json 2>$null | ConvertFrom-Json
    
    if (-not $apps -or $apps.Count -eq 0) {
        Write-Host "❌ No Container Apps found in Resource Group: $ResourceGroup" -ForegroundColor Red
        exit 1
    }
    
    if ($apps.Count -eq 1) {
        $AppName = $apps[0]
        Write-Info "Found: $AppName"
    } else {
        Write-Host "`nMultiple apps in ${ResourceGroup}:" -ForegroundColor Yellow
        $apps | ForEach-Object { Write-Host "  • $_" -ForegroundColor Gray }
        $AppName = Read-Host "`nEnter App name"
    }
}

# Get current image
Write-Step "Current deployment status"
$currentImage = az containerapp show -n $AppName -g $ResourceGroup --query "properties.template.containers[0].image" -o tsv 2>$null
if ($currentImage) {
    Write-Info "Current image: $currentImage"
} else {
    Write-Warning "Could not determine current image"
}

# Build full image reference
# Construct image reference
$registry = "ghcr.io"
$imageName = "kayasax/scimtool"
$imageRef = "${registry}/${imageName}:${TestTag}"

# Check if tag looks like a branch name and provide helpful hint
if ($TestTag -match '^test-[^-]+-') {
    Write-Host ""
    Write-Host "💡 Tip: Branch 'test/xyz' creates tag 'test-test-xyz' (not 'test-xyz')" -ForegroundColor Cyan
    Write-Host "   If deploying from branch test/collision-ui-improvements, use:" -ForegroundColor Cyan
    Write-Host "   -TestTag test-test-collision-ui-improvements" -ForegroundColor Cyan
    Write-Host ""
}

# Confirm
Write-Host "`n📦 Deployment Plan:" -ForegroundColor Cyan
Write-Host "  Resource Group : $ResourceGroup" -ForegroundColor White
Write-Host "  App Name       : $AppName" -ForegroundColor White
Write-Host "  New Image      : $imageRef" -ForegroundColor Yellow
Write-Host "  Mode           : $(if ($CreateRevision) { 'New revision (keep old)' } else { 'Replace current' })" -ForegroundColor White

if ($TestTag -like "test-*") {
    Write-Warning "This is a TEST image - not a production release"
} elseif ($TestTag -eq "latest") {
    Write-Info "Rolling back to production 'latest' tag"
} else {
    Write-Warning "Non-standard tag: $TestTag"
}

if (-not $Force) {
    $confirm = Read-Host "`nProceed? (y/N)"
    if ($confirm -notmatch '^[Yy]$') {
        Write-Host "Cancelled." -ForegroundColor Yellow
        exit 0
    }
} else {
    Write-Info "Force mode enabled - skipping confirmation"
}

# Update Container App
Write-Step "Updating Container App"
try {
    if ($CreateRevision) {
        # Create new revision without deactivating old one
        Write-Info "Creating new revision..."
        $output = az containerapp update `
            -n $AppName `
            -g $ResourceGroup `
            --image $imageRef `
            --revision-suffix "test-$(Get-Date -Format 'yyyyMMdd-HHmmss')" `
            2>&1
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "`nAzure CLI Error Output:" -ForegroundColor Red
            Write-Host $output -ForegroundColor Red
        }
    } else {
        # Standard update (replaces current revision)
        # Always use revision suffix to force new revision creation
        $timestamp = Get-Date -Format 'HHmmss'
        Write-Info "Creating new revision with suffix: $timestamp"
        Write-Info "Deploying image: $imageRef"
        
        # Simple update - env vars handled by backend auto-detection
        $output = az containerapp update `
            -n $AppName `
            -g $ResourceGroup `
            --image $imageRef `
            --revision-suffix $timestamp `
            2>&1
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "`nAzure CLI Error Output:" -ForegroundColor Red
            Write-Host $output -ForegroundColor Red
        }
    }
    
    if ($LASTEXITCODE -ne 0) {
        throw "Update command failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Host "`n❌ Update failed: $_" -ForegroundColor Red
    Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Verify image exists: https://github.com/kayasax/SCIMTool/pkgs/container/scimtool" -ForegroundColor Gray
    Write-Host "  2. Check Container App logs: az containerapp logs show -n $AppName -g $ResourceGroup --tail 50" -ForegroundColor Gray
    Write-Host "  3. Verify GHCR permissions: Image must be public or you need ghcr.io credentials" -ForegroundColor Gray
    exit 1
}

Write-Success "Update completed!"

# Get new status
Write-Step "Deployment status"
Start-Sleep -Seconds 3
$newImage = az containerapp show -n $AppName -g $ResourceGroup --query "properties.template.containers[0].image" -o tsv 2>$null
$fqdn = az containerapp show -n $AppName -g $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv 2>$null

Write-Info "Deployed image: $newImage"
if ($fqdn) {
    Write-Info "App URL: https://$fqdn"
}

# Show active revisions if in revision mode
if ($CreateRevision) {
    Write-Host "`n📋 Active Revisions:" -ForegroundColor Cyan
    az containerapp revision list -n $AppName -g $ResourceGroup --query "[?properties.active].{Name:name,Traffic:properties.trafficWeight,Created:properties.createdTime}" -o table
    Write-Host "`nℹ️  To rollback, deactivate the new revision:" -ForegroundColor Gray
    Write-Host "   az containerapp revision deactivate -n $AppName -g $ResourceGroup --revision <revision-name>" -ForegroundColor DarkGray
}

Write-Host "`n🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Test the updated app at: https://$fqdn" -ForegroundColor White
Write-Host "  2. Verify new features work as expected" -ForegroundColor White
Write-Host "  3. Check logs for errors:" -ForegroundColor White
Write-Host "     az containerapp logs show -n $AppName -g $ResourceGroup --tail 50 --follow" -ForegroundColor DarkGray

if ($TestTag -like "test-*") {
    Write-Host "`n  4. When ready to release:" -ForegroundColor White
    Write-Host "     • Merge to master" -ForegroundColor DarkGray
    Write-Host "     • Create git tag: git tag -a v0.x.x -m 'vX.X.X'" -ForegroundColor DarkGray
    Write-Host "     • Push tag: git push origin v0.x.x" -ForegroundColor DarkGray
    Write-Host "     • This triggers production build with 'latest' tag" -ForegroundColor DarkGray
}

Write-Success "Done! 🚀"
