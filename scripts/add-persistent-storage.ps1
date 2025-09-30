<#
.SYNOPSIS
    Add persistent storage to existing SCIMTool Container App deployment

.DESCRIPTION
    This script adds Azure Files persistent storage to an existing SCIMTool
    deployment without losing the deployment itself. Note: Current data will
    be lost during the upgrade (it's ephemeral anyway).

.PARAMETER ResourceGroup
    Existing resource group name

.PARAMETER AppName
    Existing container app name

.PARAMETER BackupCurrentData
    Attempt to backup current database before upgrade (requires app to be running)

.EXAMPLE
    .\add-persistent-storage.ps1 -ResourceGroup "RG-FR-SCIMTOOL" -AppName "scimtool-ms"

.EXAMPLE
    .\add-persistent-storage.ps1 -ResourceGroup "RG-FR-SCIMTOOL" -AppName "scimtool-ms" -BackupCurrentData
#>

param(
    [Parameter(Mandatory)]
    [string]$ResourceGroup,

    [Parameter(Mandatory)]
    [string]$AppName,

    [switch]$BackupCurrentData
)

$ErrorActionPreference = "Stop"

Write-Host "🔄 Adding Persistent Storage to Existing SCIMTool Deployment" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check Azure CLI
try {
    $account = az account show --output json 2>$null | ConvertFrom-Json
    if (-not $account) { throw "Not authenticated" }
    Write-Host "✅ Azure CLI authenticated as: $($account.user.name)" -ForegroundColor Green
} catch {
    Write-Host "❌ Azure CLI not authenticated" -ForegroundColor Red
    Write-Host "   Run: az login" -ForegroundColor Yellow
    exit 1
}

# Step 1: Verify existing deployment
Write-Host "🔍 Step 1/6: Verifying Existing Deployment" -ForegroundColor Cyan
$app = az containerapp show --name $AppName --resource-group $ResourceGroup --output json | ConvertFrom-Json

if (-not $app) {
    Write-Host "   ❌ Container App '$AppName' not found in resource group '$ResourceGroup'" -ForegroundColor Red
    exit 1
}

$envName = $app.properties.managedEnvironmentId.Split('/')[-1]
$location = $app.location
$currentImage = $app.properties.template.containers[0].image

Write-Host "   ✅ Found existing deployment" -ForegroundColor Green
Write-Host "      App: $AppName" -ForegroundColor Gray
Write-Host "      Environment: $envName" -ForegroundColor Gray
Write-Host "      Location: $location" -ForegroundColor Gray
Write-Host "      Image: $currentImage" -ForegroundColor Gray
Write-Host ""

# Check if storage is already configured
$hasStorage = $app.properties.template.volumes -and $app.properties.template.volumes.Count -gt 0
if ($hasStorage) {
    Write-Host "   ⚠️  Storage already configured!" -ForegroundColor Yellow
    Write-Host "      This app already has volume mounts." -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne 'y') {
        Write-Host "Migration cancelled." -ForegroundColor Yellow
        exit 0
    }
}

# Step 2: Backup current data (optional)
if ($BackupCurrentData) {
    Write-Host "💾 Step 2/6: Backing Up Current Data" -ForegroundColor Cyan
    Write-Host "   ⚠️  Note: This may fail if database is locked or in use" -ForegroundColor Yellow

    try {
        # Create backup directory
        $backupDir = "$PSScriptRoot/../backups"
        if (-not (Test-Path $backupDir)) {
            New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        }

        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $backupFile = "$backupDir/scim-backup-$timestamp.db"

        Write-Host "   Attempting to backup database..." -ForegroundColor Yellow
        Write-Host "   Note: This uses 'az containerapp exec' which may not work on all deployments" -ForegroundColor Gray

        # Try to copy database from running container
        az containerapp exec `
            --name $AppName `
            --resource-group $ResourceGroup `
            --command "cat /app/data.db" > $backupFile 2>$null

        if ($LASTEXITCODE -eq 0 -and (Test-Path $backupFile) -and (Get-Item $backupFile).Length -gt 0) {
            Write-Host "   ✅ Backup created: $backupFile" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Backup failed or database is empty" -ForegroundColor Yellow
            Write-Host "      Continuing without backup..." -ForegroundColor Gray
            if (Test-Path $backupFile) { Remove-Item $backupFile -Force }
        }
    } catch {
        Write-Host "   ⚠️  Backup failed: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "      Continuing without backup..." -ForegroundColor Gray
    }
} else {
    Write-Host "⏭️  Step 2/6: Skipping Data Backup" -ForegroundColor Yellow
    Write-Host "   Use -BackupCurrentData to attempt backup" -ForegroundColor Gray
}
Write-Host ""

# Step 3: Generate storage account name
Write-Host "📝 Step 3/6: Generating Storage Configuration" -ForegroundColor Cyan
$storageName = $AppName.Replace("-", "").Replace("_", "").ToLower() + "stor"
if ($storageName.Length > 24) {
    $storageName = $storageName.Substring(0, 24)
}
$fileShareName = "scimtool-data"

Write-Host "   Storage Account: $storageName" -ForegroundColor White
Write-Host "   File Share: $fileShareName" -ForegroundColor White
Write-Host "   Location: $location" -ForegroundColor White
Write-Host ""

# Check if storage account already exists
$existingStorage = az storage account list --resource-group $ResourceGroup --query "[?name=='$storageName']" --output json | ConvertFrom-Json
if ($existingStorage -and $existingStorage.Count -gt 0) {
    Write-Host "   ℹ️  Storage account '$storageName' already exists, will reuse it" -ForegroundColor Yellow
}

# Step 4: Deploy storage resources
Write-Host "💾 Step 4/6: Creating Storage Resources" -ForegroundColor Cyan

$storageDeployment = az deployment group create `
    --resource-group $ResourceGroup `
    --template-file "$PSScriptRoot/../infra/storage.bicep" `
    --parameters storageAccountName=$storageName location=$location `
    --output json | ConvertFrom-Json

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Storage deployment failed" -ForegroundColor Red
    exit 1
}

# Get storage account key (works whether storage is new or existing)
$storageKeys = az storage account keys list `
    --account-name $storageName `
    --resource-group $ResourceGroup `
    --output json | ConvertFrom-Json

$storageAccountKey = $storageKeys[0].value

if (-not $storageAccountKey) {
    Write-Host "   ❌ Failed to retrieve storage account key" -ForegroundColor Red
    exit 1
}

Write-Host "   ✅ Storage resources created" -ForegroundColor Green
Write-Host ""

# Step 5: Link storage to Container App Environment
Write-Host "🔗 Step 5/6: Linking Storage to Environment" -ForegroundColor Cyan

az containerapp env storage set `
    --name $envName `
    --resource-group $ResourceGroup `
    --storage-name "scimtool-storage" `
    --azure-file-account-name $storageName `
    --azure-file-account-key "$storageAccountKey" `
    --azure-file-share-name $fileShareName `
    --access-mode ReadWrite `
    --output none

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Storage linked to environment" -ForegroundColor Green
} else {
    Write-Host "   ❌ Failed to link storage to environment" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 6: Update Container App with volume mount
Write-Host "🔄 Step 6/6: Updating Container App" -ForegroundColor Cyan
Write-Host "   This will restart the container..." -ForegroundColor Yellow

# Get current app configuration
$currentScimSecret = $app.properties.configuration.secrets | Where-Object { $_.name -eq "scim-shared-secret" } | Select-Object -First 1

if (-not $currentScimSecret) {
    Write-Host "   ⚠️  Could not find SCIM secret in current config" -ForegroundColor Yellow
    $scimSecret = Read-Host "Please enter your SCIM shared secret"
} else {
    # Secret values are not returned, we need to ask for it
    Write-Host "   ⚠️  Secret values cannot be retrieved from existing deployment" -ForegroundColor Yellow
    $scimSecret = Read-Host "Please enter your SCIM shared secret (same as before)"
}

# Parse image: "ghcr.io/kayasax/scimtool:0.5.0" -> registry="ghcr.io", image="kayasax/scimtool:0.5.0"
$imageParts = $currentImage -split '/', 2
$registry = $imageParts[0]
$imageWithTag = $imageParts[1]

# Deploy updated container app configuration
az deployment group create `
    --resource-group $ResourceGroup `
    --template-file "$PSScriptRoot/../infra/containerapp.bicep" `
    --parameters `
        appName=$AppName `
        environmentName=$envName `
        location=$location `
        acrLoginServer=$registry `
        image=$imageWithTag `
        scimSharedSecret=$scimSecret `
        storageAccountName=$storageName `
        storageAccountKey=$storageAccountKey `
        fileShareName=$fileShareName `
    --output none

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Container App updated successfully" -ForegroundColor Green
} else {
    Write-Host "   ❌ Container App update failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 7: Verify deployment
Write-Host "✅ Step 6/6: Verifying Updated Deployment" -ForegroundColor Cyan
Start-Sleep -Seconds 5

$updatedApp = az containerapp show --name $AppName --resource-group $ResourceGroup --output json | ConvertFrom-Json
$hasVolumes = $updatedApp.properties.template.volumes -and $updatedApp.properties.template.volumes.Count -gt 0

if ($hasVolumes) {
    Write-Host "   ✅ Volume mount verified" -ForegroundColor Green
    $volumeInfo = $updatedApp.properties.template.volumes[0]
    Write-Host "      Volume: $($volumeInfo.name)" -ForegroundColor Gray
    Write-Host "      Storage: $($volumeInfo.storageName)" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  Volume mount not found (may take a moment to update)" -ForegroundColor Yellow
}

$url = "https://$($updatedApp.properties.configuration.ingress.fqdn)"
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "🎉 Migration Complete!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Updated Deployment:" -ForegroundColor Cyan
Write-Host "   App URL: $url" -ForegroundColor Yellow
Write-Host "   Resource Group: $ResourceGroup" -ForegroundColor White
Write-Host "   Storage Account: $storageName" -ForegroundColor White
Write-Host "   File Share: $fileShareName" -ForegroundColor White
Write-Host "   Database: /app/data/scim.db" -ForegroundColor White
Write-Host ""
Write-Host "💾 Storage Configuration:" -ForegroundColor Cyan
Write-Host "   Mount Path: /app/data" -ForegroundColor White
Write-Host "   Quota: 5 GiB" -ForegroundColor White
Write-Host "   Persistence: ✅ Enabled" -ForegroundColor Green
Write-Host "   Data now persists across container restarts and scale-to-zero" -ForegroundColor Gray
Write-Host ""

if ($BackupCurrentData -and (Test-Path "$backupDir/scim-backup-$timestamp.db")) {
    Write-Host "📦 Data Backup:" -ForegroundColor Cyan
    Write-Host "   Backup File: $backupDir/scim-backup-$timestamp.db" -ForegroundColor White
    Write-Host "   To restore (if needed):" -ForegroundColor Gray
    Write-Host "   1. Upload backup to Azure File Share" -ForegroundColor Gray
    Write-Host "   2. Restart container app" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "💰 Additional Monthly Cost:" -ForegroundColor Cyan
Write-Host '   Storage Account: ~$0.05/month' -ForegroundColor White
Write-Host '   File Share (5 GiB): ~$0.30/month' -ForegroundColor White
Write-Host '   Total: ~$0.35/month additional' -ForegroundColor Yellow
Write-Host ""

Write-Host "Migration complete! Your data will now persist." -ForegroundColor Green
