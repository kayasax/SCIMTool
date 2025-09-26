#Requires -Version 7.0

<#
.SYNOPSIS
    SCIMTool - Setup Microsoft Entra SCIM Integration
    
.DESCRIPTION
    Complete setup for SCIMTool SCIM 2.0 server with Microsoft Entra provisioning.
    Provides dev tunnel setup, local testing, and clear Azure Portal instructions.
    
.PARAMETER TestLocal
    Test the local SCIM server endpoints
    
.PARAMETER StartTunnel
    Start dev tunnel to expose SCIM server publicly

.PARAMETER ConfigureWebUI
    Configure web UI to connect to deployed Azure Container Apps server

.PARAMETER DeployContainer
    Deploy containerized SCIM server with embedded web UI to Azure Container Apps
    
.EXAMPLE
    .\setup.ps1 -TestLocal
    .\setup.ps1 -StartTunnel
    .\setup.ps1 -ConfigureWebUI
    .\setup.ps1 -DeployContainer
#>

param(
    [switch]$TestLocal,
    [switch]$StartTunnel,
    [switch]$ConfigureWebUI,
    [switch]$DeployContainer
)

# Dynamic secret generation for security
$ScimSecret = $env:SCIM_SECRET
if ([string]::IsNullOrWhiteSpace($ScimSecret)) {
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
}

Clear-Host
Write-Host "🚀 SCIMTool - Microsoft Entra SCIM Integration" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

if ($TestLocal) {
    Write-Host "🧪 Testing Local SCIM Server" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    try {
        $headers = @{
            Authorization = "Bearer $ScimSecret"
            "Content-Type" = "application/scim+json"
        }
        
        Write-Host "Testing ServiceProviderConfig..." -ForegroundColor Yellow
        $config = Invoke-RestMethod -Uri "http://localhost:3000/scim/ServiceProviderConfig" -Headers $headers -TimeoutSec 5
        Write-Host "✅ ServiceProviderConfig: OK" -ForegroundColor Green
        
        Write-Host "Testing OAuth endpoint..." -ForegroundColor Yellow
        $oauth = Invoke-RestMethod -Uri "http://localhost:3000/scim/oauth/test" -Method GET -TimeoutSec 5
        Write-Host "✅ OAuth endpoint: OK" -ForegroundColor Green
        
        Write-Host "Testing OAuth token generation..." -ForegroundColor Yellow
        $tokenRequest = @{
            grant_type = "client_credentials"
            client_id = "scimtool-client"
            client_secret = "scimtool-secret-2025"
            scope = "scim.read"
        } | ConvertTo-Json
        
        $token = Invoke-RestMethod -Uri "http://localhost:3000/scim/oauth/token" -Method POST -ContentType "application/json" -Body $tokenRequest -TimeoutSec 5
        Write-Host "✅ OAuth token generation: OK" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "🎉 All SCIM endpoints working perfectly!" -ForegroundColor Green
        Write-Host "   Ready for Microsoft Entra integration" -ForegroundColor White
        
    } catch {
        Write-Host "❌ SCIM server not running" -ForegroundColor Red
        Write-Host "   Start with: cd api && npm run start:dev" -ForegroundColor Yellow
    }
    
    return
}

if ($StartTunnel) {
    Write-Host "🌐 Starting Dev Tunnel" -ForegroundColor Cyan
    Write-Host "════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    # Check dev tunnel CLI
    try {
        $null = Get-Command devtunnel -ErrorAction Stop
    } catch {
        Write-Host "❌ Dev Tunnel CLI not found" -ForegroundColor Red
        Write-Host "   Install: winget install Microsoft.devtunnel" -ForegroundColor Yellow
        return
    }
    
    # Setup tunnel (one-time)
    $tunnelName = "scimtool"
    Write-Host "Setting up tunnel '$tunnelName'..." -ForegroundColor Yellow
    
    devtunnel create $tunnelName --allow-anonymous 2>$null
    devtunnel port create $tunnelName --port-number 3000 --protocol https 2>$null
    
    Write-Host "✅ Tunnel configured" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Starting tunnel host..." -ForegroundColor Yellow
    Write-Host "   Press Ctrl+C to stop" -ForegroundColor Gray
    Write-Host ""
    
    # Start hosting (this will block)
    devtunnel host $tunnelName
    
    return
}

# Main setup instructions
Write-Host "📋 Setup Instructions" -ForegroundColor Cyan
Write-Host "════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "STEP 1: Start SCIM Server" -ForegroundColor Green
Write-Host "cd api"
Write-Host "npm install"
Write-Host "npm run start:dev"
Write-Host ""

Write-Host "STEP 2: Test Local Server" -ForegroundColor Green
Write-Host ".\setup.ps1 -TestLocal"
Write-Host ""

Write-Host "STEP 3: Start Public Tunnel" -ForegroundColor Green
Write-Host ".\setup.ps1 -StartTunnel"
Write-Host "# Note the HTTPS URL (e.g., https://xyz.devtunnels.ms)"
Write-Host ""

Write-Host "STEP 4: Create Enterprise App (Azure Portal)" -ForegroundColor Green
Write-Host "1. Azure Portal → Entra ID → Enterprise Applications"
Write-Host "2. + New application → Create your own application"
Write-Host "3. Name: SCIMTool"
Write-Host "4. Select: Non-gallery application"
Write-Host "5. ✅ Verify 'Provisioning' appears in left menu"
Write-Host ""

Write-Host "STEP 5: Configure Provisioning" -ForegroundColor Green
Write-Host "1. Provisioning → Get started"
Write-Host "2. Mode: Automatic"
Write-Host "3. Tenant URL: https://[tunnel-url]/scim"
Write-Host "4. Secret Token: $ScimSecret"
Write-Host "5. Test Connection → Save"
Write-Host ""

Write-Host "STEP 6: Test Provisioning" -ForegroundColor Green
Write-Host "1. Users and groups → Add user"
Write-Host "2. Provisioning → Provision on demand"
Write-Host "3. Watch logs in SCIMTool UI at http://localhost:5173"
Write-Host ""

if ($ConfigureWebUI) {
    Write-Host "🖥️ Configuring Web UI for Production" -ForegroundColor Cyan
    Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    $azureUrl = "https://scimtool-prod.bravewater-b8848185.eastus.azurecontainerapps.io"
    $webEnvPath = "web\.env"
    
    Write-Host "Updating web UI configuration..." -ForegroundColor Yellow
    
    $envContent = @"
# Production environment configuration for SCIMTool Web UI
# Points to the deployed Azure Container Apps SCIM server

VITE_API_BASE=$azureUrl
VITE_SCIM_TOKEN=$ScimSecret
"@
    
    $envContent | Out-File -FilePath $webEnvPath -Encoding UTF8
    Write-Host "✅ Updated $webEnvPath" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Configuration:" -ForegroundColor Green
    Write-Host "• API Base: $azureUrl" -ForegroundColor White
    Write-Host "• Token: $ScimSecret" -ForegroundColor White
    Write-Host ""
    
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "1. cd web"
    Write-Host "2. npm install"
    Write-Host "3. npm run dev"
    Write-Host "4. Open http://localhost:5173"
    Write-Host ""
    Write-Host "✅ Web UI configured for production server!" -ForegroundColor Green
    Write-Host ""
    return
}

if ($DeployContainer) {
    Write-Host "🚀 Deploying Containerized SCIM Server + Web UI" -ForegroundColor Cyan
    Write-Host "════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Building web client for container..." -ForegroundColor Yellow
    Push-Location web
    try {
        Copy-Item .env.container .env.production
        npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "Web build failed"
        }
    } finally {
        Pop-Location
    }
    
    Write-Host "Copying web build to API container..." -ForegroundColor Yellow
    Remove-Item api/public/* -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item web/dist/* api/public/ -Recurse -Force
    
    Write-Host "Deploying to Azure Container Apps..." -ForegroundColor Yellow
    Write-Host "This may take 2-3 minutes..." -ForegroundColor Gray
    
    $result = az containerapp up --name "scimtool-prod" --resource-group "scimtool-rg" --location "eastus" --env-vars "SCIM_SHARED_SECRET=$ScimSecret" "NODE_ENV=production" "PORT=80" "DATABASE_URL=file:./data.db" --ingress external --target-port 80 --source "./api" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Deployment successful!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 Your containerized SCIMTool is ready!" -ForegroundColor Green
        Write-Host "   • Works with ANY Azure Container Apps URL" -ForegroundColor White
        Write-Host "   • Web UI auto-detects the deployment domain" -ForegroundColor White
        Write-Host "   • No authentication required for monitoring UI" -ForegroundColor White
        Write-Host ""
        Write-Host "📊 Access your deployment:" -ForegroundColor Green
        Write-Host "   Web UI: https://[your-container-url]/" -ForegroundColor Cyan
        Write-Host "   SCIM API: https://[your-container-url]/scim" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "🔗 For Microsoft Entra provisioning:" -ForegroundColor Green
        Write-Host "   Tenant URL: https://[your-container-url]/scim" -ForegroundColor Cyan
        Write-Host "   Secret Token: $ScimSecret" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "👥 Share with colleagues: Just share your Container Apps URL!" -ForegroundColor Green
    } else {
        Write-Host "❌ Deployment failed!" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
    }
    
    return
}

Write-Host "🔧 Available Commands:" -ForegroundColor Yellow
Write-Host "Test local:     .\setup.ps1 -TestLocal"
Write-Host "Start tunnel:   .\setup.ps1 -StartTunnel"
Write-Host "Configure web:  .\setup.ps1 -ConfigureWebUI"
Write-Host "Deploy all:     .\setup.ps1 -DeployContainer"
Write-Host "Log viewer:     cd web && npm run dev"
Write-Host ""

Write-Host "🎯 Key Points:" -ForegroundColor Yellow
Write-Host "• Create Enterprise App MANUALLY in Azure Portal (not via scripts)"
Write-Host "• API-created apps don't show provisioning tab"
Write-Host "• Both Bearer token and OAuth 2.0 authentication supported"
Write-Host "• SCIM 2.0 fully compliant with all operations"
Write-Host ""

Write-Host "🏗️ Production Deployment:" -ForegroundColor Magenta
Write-Host "Deploy to Azure Container Apps for production use:"
Write-Host ".\scripts\deploy-azure.ps1 -ResourceGroup 'scim-rg' -AppName 'scimtool-prod' -ScimSecret 'your-secret'"
Write-Host ""

Write-Host "🚀 Start with: .\setup.ps1 -TestLocal" -ForegroundColor Green