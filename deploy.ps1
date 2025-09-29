#Requires -Version 7.0

<#
.SYNOPSIS
    SCIMTool - One-Click Deployment for Microsoft Colleagues

.DESCRIPTION
    Downloads and deploys SCIMTool SCIM 2.0 server to Azure Container Apps.
    No git clone needed - everything downloads automatically!

.EXAMPLE
    iwr https://raw.githubusercontent.com/kayasax/SCIMTool/master/deploy.ps1 | iex
#>

param(
    [string]$Branch = "master"
)

Write-Host "🚀 SCIMTool - One-Click Deployment" -ForegroundColor Green
Write-Host "═══════════════════════════════════" -ForegroundColor Green
Write-Host ""

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Cyan
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Azure CLI not found. Please install: https://aka.ms/InstallAzureCLI" -ForegroundColor Red
    exit 1
}

# Login check
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "🔐 Please login to Azure..." -ForegroundColor Yellow
    az login
    $account = az account show | ConvertFrom-Json
}

Write-Host "✅ Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host ""

# Subscription selection
Write-Host "📋 Azure Subscription" -ForegroundColor Yellow
Write-Host "Current subscription: $($account.name) ($($account.id))" -ForegroundColor Cyan
$ChangeSubscription = Read-Host -Prompt "Change subscription? (y/N)"

if ($ChangeSubscription -eq 'y' -or $ChangeSubscription -eq 'Y') {
    Write-Host "📋 Available subscriptions:" -ForegroundColor Cyan
    az account list --query "[].{Name:name, Id:id, IsDefault:isDefault}" --output table
    Write-Host ""
    $NewSubscriptionId = Read-Host -Prompt "Enter subscription ID or name"

    if (-not [string]::IsNullOrWhiteSpace($NewSubscriptionId)) {
        az account set --subscription $NewSubscriptionId
        $account = az account show | ConvertFrom-Json
        Write-Host "✅ Switched to: $($account.name)" -ForegroundColor Green
    }
}
Write-Host ""

# Generate secure secret
Write-Host "🔐 SCIM Secret Configuration" -ForegroundColor Yellow
Write-Host "For security, each deployment needs a unique secret token." -ForegroundColor Gray
$UserSecret = Read-Host -Prompt "Enter your SCIM secret token (press Enter for auto-generated)"

if ([string]::IsNullOrWhiteSpace($UserSecret)) {
    $ScimSecret = "SCIM-$(Get-Random -Minimum 10000 -Maximum 99999)-$(Get-Date -Format "yyyyMMdd")"
    Write-Host "✅ Generated secure random secret: $ScimSecret" -ForegroundColor Green
} else {
    $ScimSecret = $UserSecret
    Write-Host "✅ Using your custom secret" -ForegroundColor Green
}
Write-Host ""

# Helper function to suggest valid Container App name
function Get-ValidContainerAppName {
    param([string]$inputName)

    if ([string]::IsNullOrWhiteSpace($inputName)) {
        return "scimtool-prod"
    }

    # Convert to lowercase
    $suggested = $inputName.ToLower()

    # Replace invalid characters with hyphens
    $suggested = $suggested -replace '[^a-z0-9\-]', '-'

    # Remove consecutive hyphens
    $suggested = $suggested -replace '--+', '-'

    # Ensure starts with letter
    if ($suggested -match '^[^a-z]') {
        $suggested = "scim-$suggested"
    }

    # Ensure ends with alphanumeric
    $suggested = $suggested -replace '-+$', ''

    # Truncate if too long
    if ($suggested.Length -gt 32) {
        $suggested = $suggested.Substring(0, 32) -replace '-+$', ''
    }

    return $suggested
}

# Azure deployment configuration
Write-Host "🏗️ Azure Deployment Configuration" -ForegroundColor Yellow
Write-Host "Configure your Azure resources (press Enter for defaults):" -ForegroundColor Gray

$ResourceGroup = Read-Host -Prompt "Resource Group name (default: scimtool-rg)"
if ([string]::IsNullOrWhiteSpace($ResourceGroup)) {
    $ResourceGroup = "scimtool-rg"
}

# Container App name validation
do {
    $AppName = Read-Host -Prompt "Container App name (default: scimtool-prod)"
    if ([string]::IsNullOrWhiteSpace($AppName)) {
        $AppName = "scimtool-prod"
    }

    # Validate Container App naming requirements
    $isValidName = $true
    $validationErrors = @()

    if ($AppName.Length -lt 2 -or $AppName.Length -gt 32) {
        $isValidName = $false
        $validationErrors += "Name must be 2-32 characters long (current: $($AppName.Length))"
    }

    if ($AppName -notmatch '^[a-z][a-z0-9\-]*[a-z0-9]$' -and $AppName.Length -gt 1) {
        $isValidName = $false
        $validationErrors += "Must start with letter, contain only lowercase letters/numbers/hyphens, end with letter/number"
    }

    if ($AppName -match '--') {
        $isValidName = $false
        $validationErrors += "Cannot contain consecutive hyphens (--)"
    }

    if (-not $isValidName) {
        Write-Host ""
        Write-Host "⚠️  Invalid Container App name: '$AppName'" -ForegroundColor Red
        Write-Host ""
        Write-Host "📋 Azure Container Apps naming requirements:" -ForegroundColor Yellow
        Write-Host "• 2-32 characters long" -ForegroundColor Gray
        Write-Host "• Start with a letter (a-z)" -ForegroundColor Gray
        Write-Host "• Contain only lowercase letters, numbers, and hyphens" -ForegroundColor Gray
        Write-Host "• End with a letter or number" -ForegroundColor Gray
        Write-Host "• No consecutive hyphens (--)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "❌ Issues found:" -ForegroundColor Red
        foreach ($error in $validationErrors) {
            Write-Host "   • $error" -ForegroundColor Red
        }
        Write-Host ""

        # Suggest a valid name
        $suggestedName = Get-ValidContainerAppName -inputName $AppName
        Write-Host "💡 Suggested valid name: $suggestedName" -ForegroundColor Cyan
        Write-Host "   Or try: scimtool-prod, scim-monitor, my-scim-app" -ForegroundColor Gray
        Write-Host ""
    }
} while (-not $isValidName)

$Location = Read-Host -Prompt "Azure region (default: eastus)"
if ([string]::IsNullOrWhiteSpace($Location)) {
    $Location = "eastus"
}

Write-Host "✅ Will deploy to: $ResourceGroup / $AppName in $Location" -ForegroundColor Green
Write-Host ""

# Create temp directory
$TempDir = Join-Path $env:TEMP "SCIMTool-$(Get-Random)"
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
Push-Location $TempDir

try {
    Write-Host "📥 Downloading SCIMTool source..." -ForegroundColor Cyan

    # Download the source as ZIP
    $RepoUrl = "https://github.com/kayasax/SCIMTool/archive/refs/heads/$Branch.zip"
    $ZipPath = Join-Path $TempDir "scimtool.zip"

    Invoke-WebRequest -Uri $RepoUrl -OutFile $ZipPath -UseBasicParsing

    # Extract ZIP
    Expand-Archive -Path $ZipPath -DestinationPath $TempDir -Force
    $ExtractedDir = Get-ChildItem -Directory | Select-Object -First 1
    Set-Location $ExtractedDir.FullName

    Write-Host "✅ Source downloaded and extracted" -ForegroundColor Green
    Write-Host ""

    # Deploy to Azure
    Write-Host "🚀 Deploying to Azure Container Apps..." -ForegroundColor Cyan
    Write-Host "This may take 3-5 minutes..." -ForegroundColor Gray
    Write-Host ""

    # Use the deploy-azure.ps1 script from the SCIMTool project
    $deployResult = .\scripts\deploy-azure.ps1 -ResourceGroup $ResourceGroup -AppName $AppName -ScimSecret $ScimSecret -Location $Location
    $result = $deployResult

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Deployment successful!" -ForegroundColor Green
        Write-Host ""

        # Extract URL from az output
        $AppUrl = ($result | Where-Object { $_ -match "https://.*\.azurecontainerapps\.io" } | Select-Object -First 1) -replace '.*?(https://[^\s]+).*', '$1'

        if ($AppUrl) {
            Write-Host "🌐 Your SCIMTool is ready!" -ForegroundColor Green
            Write-Host "   URL: $AppUrl" -ForegroundColor Cyan
            Write-Host "   Secret Token: $ScimSecret" -ForegroundColor Cyan
            Write-Host "   Monitoring: $AppUrl (web UI embedded)" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "📋 Next Steps:" -ForegroundColor Yellow
            Write-Host "1. Go to Azure Portal → Entra ID → Enterprise Applications" -ForegroundColor White
            Write-Host "2. Create new application → Non-gallery application" -ForegroundColor White
            Write-Host "3. Configure SCIM provisioning with your URL and secret" -ForegroundColor White
            Write-Host ""
            Write-Host "🎉 Share this URL with your team for monitoring!" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ Deployment failed. Error details above." -ForegroundColor Red
        exit 1
    }

} finally {
    # Cleanup
    Pop-Location
    Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "✨ SCIMTool deployment complete!" -ForegroundColor Green