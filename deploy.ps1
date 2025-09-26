#Requires -Version 7.0

<#
.SYNOPSIS
    SCIMTool - One-Click Deployment for Microsoft Colleagues
    
.DESCRIPTION
    Downloads and deploys SCIMTool SCIM 2.0 server to Azure Container Apps.
    No git clone needed - everything downloads automatically!
    
.EXAMPLE
    iwr https://raw.githubusercontent.com/kayasax/SCIMTool/main/deploy.ps1 | iex
#>

param(
    [string]$Branch = "main"
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
    
    $result = az containerapp up --name "scimtool-prod" --resource-group "scimtool-rg" --location "eastus" --env-vars "SCIM_SHARED_SECRET=$ScimSecret" "NODE_ENV=production" "PORT=80" "DATABASE_URL=file:./data.db" --ingress external --target-port 80 --source "./api" 2>&1
    
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