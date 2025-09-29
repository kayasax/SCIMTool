#Requires -Version 7.0

<#
.SYNOPSIS
    Deploy SCIMTool to Azure Container Apps

.DESCRIPTION
    Deploys the SCIM server to Azure Container Apps for production use with
    automatic HTTPS, scaling, and monitoring.

.PARAMETER ResourceGroup
    Azure resource group name

.PARAMETER AppName
    Container app name

.PARAMETER Location
    Azure region

.PARAMETER ScimSecret
    Production SCIM shared secret

.EXAMPLE
    .\deploy-azure.ps1 -ResourceGroup "scim-rg" -AppName "scimtool-prod" -Location "eastus" -ScimSecret "your-secure-secret"
#>

param(
    [Parameter(Mandatory)]
    [string]$ResourceGroup,

    [Parameter(Mandatory)]
    [string]$AppName,

    [string]$Location = "eastus",

    [Parameter(Mandatory)]
    [string]$ScimSecret
)

Write-Host "🚀 Deploying SCIMTool to Azure Container Apps" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

# Check Azure CLI
try {
    $account = az account show --output json 2>$null | ConvertFrom-Json
    if (-not $account) { throw "Not authenticated" }
    Write-Host "✅ Azure CLI authenticated: $($account.user.name)" -ForegroundColor Green
} catch {
    Write-Host "❌ Azure CLI not authenticated" -ForegroundColor Red
    Write-Host "   Run: az login" -ForegroundColor Yellow
    exit 1
}

# Check if resource group exists
Write-Host "🔍 Checking resource group..." -ForegroundColor Yellow
$rg = az group show --name $ResourceGroup --output json 2>$null | ConvertFrom-Json
if (-not $rg) {
    Write-Host "📝 Creating resource group '$ResourceGroup'..." -ForegroundColor Yellow
    az group create --name $ResourceGroup --location $Location --output none
    Write-Host "✅ Resource group created" -ForegroundColor Green
} else {
    Write-Host "✅ Resource group exists" -ForegroundColor Green
}

# Deploy to Container Apps
Write-Host "🏗️ Deploying to Azure Container Apps..." -ForegroundColor Yellow
Write-Host "   App Name: $AppName" -ForegroundColor Gray
Write-Host "   Location: $Location" -ForegroundColor Gray
Write-Host "   Resource Group: $ResourceGroup" -ForegroundColor Gray
Write-Host ""

# Deploy using source build with proper image naming
Write-Host "Running deployment command..." -ForegroundColor Gray
Write-Host "This may take several minutes..." -ForegroundColor Yellow

# Create a lowercase image name to avoid Docker registry naming issues
$ImageName = $AppName.ToLower() -replace '[^a-z0-9\-]', '-'

az containerapp up `
    --name $AppName `
    --resource-group $ResourceGroup `
    --location $Location `
    --image $ImageName `
    --env-vars "SCIM_SHARED_SECRET=$ScimSecret" "NODE_ENV=production" "PORT=80" `
    --ingress external `
    --target-port 80 `
    --source "./api"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""

    # Get the app details separately
    Write-Host "🔍 Getting app details..." -ForegroundColor Yellow
    try {
        $appDetails = az containerapp show --name $AppName --resource-group $ResourceGroup --output json | ConvertFrom-Json

        if ($appDetails -and $appDetails.properties.configuration.ingress.fqdn) {
            $url = "https://$($appDetails.properties.configuration.ingress.fqdn)"
        } else {
            Write-Host "⚠️  Could not get app URL from deployment" -ForegroundColor Yellow
            $url = "Unable to retrieve URL"
        }
    } catch {
        Write-Host "⚠️  Could not retrieve app details: $($_.Exception.Message)" -ForegroundColor Yellow
        $url = "Unable to retrieve URL"
    }

    Write-Host ""
    Write-Host "🎉 Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Deployment Details:" -ForegroundColor Cyan
    Write-Host "   App Name: $AppName" -ForegroundColor White
    Write-Host "   Resource Group: $ResourceGroup" -ForegroundColor White
    Write-Host "   URL: $url" -ForegroundColor Yellow
    Write-Host "   SCIM Endpoint: $url/scim" -ForegroundColor Yellow
    Write-Host ""

    # Test the deployed endpoint
    Write-Host "🧪 Testing deployed endpoint..." -ForegroundColor Yellow
    try {
        $headers = @{ Authorization = "Bearer $ScimSecret" }
        $config = Invoke-RestMethod -Uri "$url/scim/ServiceProviderConfig" -Headers $headers -TimeoutSec 30
        Write-Host "✅ SCIM endpoint responding correctly!" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Endpoint test failed (may take a few minutes to start)" -ForegroundColor Yellow
        Write-Host "   Test manually: $url/scim/ServiceProviderConfig" -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "📝 Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Create Enterprise App manually in Azure Portal"
    Write-Host "2. Configure provisioning with:"
    Write-Host "   • Tenant URL: $url/scim" -ForegroundColor Yellow
    Write-Host "   • Secret Token: [your-secret]" -ForegroundColor Yellow
    Write-Host "3. Test connection and start provisioning"
    Write-Host ""
    Write-Host "🔧 Manage your deployment:" -ForegroundColor Cyan
    Write-Host "   Azure Portal: https://portal.azure.com"
    Write-Host "   Resource: $ResourceGroup > $AppName"
    Write-Host ""

} else {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    Write-Host "Error details:" -ForegroundColor Red
    $deployResult | Write-Host -ForegroundColor Red
}

Write-Host "🏁 Deployment complete!" -ForegroundColor Green