param(
    [string]$ResourceGroup,
    [string]$AppName,
    [string]$Location,
    [string]$ScimSecret,
    [string]$ImageTag,
    [switch]$EnablePersistentStorage
)

if (-not $Location -or $Location -eq '') { $Location = 'eastus' }
if (-not $ImageTag -or $ImageTag -eq '') { $ImageTag = 'latest' }
if (-not $PSBoundParameters.ContainsKey('EnablePersistentStorage')) { $EnablePersistentStorage = $true }

# --- Interactive Fallback ----------------------------------------------------
# Allow zero‑parameter one‑liner usage via: iex (irm <raw-url>/deploy-azure.ps1)
# Any missing required values are prompted for here. This replaces relying on
# [Parameter(Mandatory)] which blocks interactive prompting when invoked via
# the raw GitHub one-liner.

function New-RandomScimSecret { "SCIM-$(Get-Random -Minimum 10000 -Maximum 99999)-$(Get-Date -Format 'yyyyMMdd')" }

if (-not $ResourceGroup) {
    $ResourceGroup = Read-Host "Enter Resource Group name (will be created if missing)"
    if (-not $ResourceGroup) { Write-Host "Resource Group is required." -ForegroundColor Red; exit 1 }
}

if (-not $AppName) {
    $AppName = Read-Host "Enter Container App name"
    if (-not $AppName) { Write-Host "App Name is required." -ForegroundColor Red; exit 1 }
}

if (-not $ScimSecret) {
    $inputSecret = Read-Host "Enter SCIM shared secret (press Enter to auto-generate)"
    if ([string]::IsNullOrWhiteSpace($inputSecret)) {
        $ScimSecret = New-RandomScimSecret
    Write-Host "Generated secret: $ScimSecret" -ForegroundColor Yellow
    } else {
        $ScimSecret = $inputSecret
    }
}

if (-not $ImageTag) { $ImageTag = "latest" }

Write-Host ""; Write-Host "Configuration Summary:" -ForegroundColor Cyan
Write-Host "  Resource Group : $ResourceGroup" -ForegroundColor White
Write-Host "  App Name       : $AppName" -ForegroundColor White
Write-Host "  Location       : $Location" -ForegroundColor White
Write-Host "  Image Tag      : $ImageTag" -ForegroundColor White
Write-Host "  Persistent     : $($EnablePersistentStorage.IsPresent)" -ForegroundColor White
Write-Host "  SCIM Secret    : $ScimSecret" -ForegroundColor Yellow
Write-Host ""
Start-Sleep -Milliseconds 300

$ErrorActionPreference = "Stop"

Write-Host "SCIMTool Full Deployment to Azure Container Apps" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host ""

# Check Azure CLI
try {
    $account = az account show --output json 2>$null | ConvertFrom-Json
    if (-not $account) { throw "Not authenticated" }
    Write-Host "Azure CLI authenticated as: $($account.user.name)" -ForegroundColor Green
    Write-Host "   Subscription: $($account.name)" -ForegroundColor Gray
} catch {
    Write-Host "Azure CLI not authenticated" -ForegroundColor Red
    Write-Host "   Run: az login" -ForegroundColor Yellow
    exit 1
}

# Generate resource names
# Storage account names must be globally unique (3-24 chars, lowercase alphanumeric)
# Include resource group name to ensure uniqueness across deployments
$rgSuffix = $ResourceGroup.Replace("-", "").Replace("_", "").ToLower()
$appPrefix = $AppName.Replace("-", "").Replace("_", "").ToLower()
$storageName = $appPrefix + $rgSuffix + "stor"
$fileShareName = 'scimtool-data'

# Truncate to 24 characters if too long
if ($storageName.Length -gt 24) {
    # Keep app prefix + truncated RG suffix + "stor"
    $maxRgLength = 24 - $appPrefix.Length - 4  # 4 for "stor"
    if ($maxRgLength -gt 0) {
        $rgSuffix = $rgSuffix.Substring(0, [Math]::Min($rgSuffix.Length, $maxRgLength))
        $storageName = $appPrefix + $rgSuffix + "stor"
    } else {
        # If app name alone is too long, just truncate everything
        $storageName = $storageName.Substring(0, 24)
    }
}

# Final validation
if ($storageName.Length -gt 24) {
    Write-Host "   WARNING: Storage name too long after truncation: $storageName ($($storageName.Length) chars)" -ForegroundColor Yellow
    $storageName = $storageName.Substring(0, 24)
    Write-Host "   Truncated to: $storageName" -ForegroundColor Green
}

$envName = "$AppName-env"
$lawName = "$AppName-logs"

Write-Host ""
Write-Host "Deployment Configuration:" -ForegroundColor Cyan
Write-Host "   Resource Group: $ResourceGroup" -ForegroundColor White
Write-Host "   Location: $Location" -ForegroundColor White
Write-Host "   Container App: $AppName" -ForegroundColor White
Write-Host "   Environment: $envName" -ForegroundColor White
Write-Host "   Storage Account: $storageName" -ForegroundColor White
Write-Host "   Log Analytics: $lawName" -ForegroundColor White
Write-Host "   Image: ghcr.io/kayasax/scimtool:$ImageTag" -ForegroundColor White
$storageStatus = if($EnablePersistentStorage){'Enabled'}else{'Disabled'}
$storageColor = if($EnablePersistentStorage){'Green'}else{'Yellow'}
Write-Host "   Persistent Storage: $storageStatus" -ForegroundColor $storageColor
Write-Host ""

if (-not $EnablePersistentStorage) {
    Write-Host "WARNING: Persistent storage is disabled!" -ForegroundColor Yellow
    Write-Host "   Data will be lost when the container restarts or scales to zero." -ForegroundColor Yellow
    Write-Host ""
    $confirm = Read-Host "Continue without persistent storage? (y/N)"
    if ($confirm -ne 'y') {
        Write-Host "Deployment cancelled." -ForegroundColor Yellow
        exit 0
    }
}

# Step 1: Create or verify resource group
Write-Host "📦 Step 1/5: Resource Group" -ForegroundColor Cyan
$ErrorActionPreference = 'SilentlyContinue'
$rgJson = az group show --name $ResourceGroup --output json 2>$null
$rgExitCode = $LASTEXITCODE
$ErrorActionPreference = 'Continue'

if ($rgExitCode -ne 0 -or -not $rgJson) {
    Write-Host "   Creating resource group '$ResourceGroup'..." -ForegroundColor Yellow
    az group create --name $ResourceGroup --location $Location --output none 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Failed to create resource group" -ForegroundColor Red
        exit 1
    }
    Write-Host "   ✅ Resource group created" -ForegroundColor Green
} else {
    Write-Host "   ✅ Resource group exists" -ForegroundColor Green
}
Write-Host ""

# Step 2: Deploy storage (if enabled)
$storageAccountKey = ""
if ($EnablePersistentStorage) {
    Write-Host "💾 Step 2/5: Persistent Storage" -ForegroundColor Cyan

    # Check if storage account already exists
    $storageCheck = az storage account show --name $storageName --resource-group $ResourceGroup --query "name" --output tsv 2>$null
    $storageExists = $LASTEXITCODE -eq 0 -and -not [string]::IsNullOrEmpty($storageCheck)

    if ($storageExists) {
        Write-Host "   ✅ Storage account already exists" -ForegroundColor Green
        # Get the existing storage key
        $keys = az storage account keys list --account-name $storageName --resource-group $ResourceGroup --output json 2>$null | ConvertFrom-Json
        $storageAccountKey = $keys[0].value
        Write-Host "      Storage Account: $storageName" -ForegroundColor Gray
        Write-Host "      File Share: scimtool-data" -ForegroundColor Gray
    } else {
        Write-Host "   Deploying storage account and file share..." -ForegroundColor Yellow

        $rawStorageJson = az deployment group create `
            --resource-group $ResourceGroup `
            --template-file "$PSScriptRoot/../infra/storage.bicep" `
            --parameters storageAccountName=$storageName `
                         fileShareName=$fileShareName `
                         location=$Location `
            --output json 2>&1
        $storageExit = $LASTEXITCODE
        $storageDeployment = $null
        if ($storageExit -eq 0) {
            try { $storageDeployment = $rawStorageJson | ConvertFrom-Json } catch { }
        }
        if ($storageExit -eq 0 -and $storageDeployment -and $storageDeployment.properties.provisioningState -eq 'Succeeded') {
            $storageAccountKey = $storageDeployment.properties.outputs.storageAccountKey.value
            Write-Host "   ✅ Storage deployed successfully" -ForegroundColor Green
            Write-Host "      Storage Account: $storageName" -ForegroundColor Gray
            Write-Host "      File Share: $fileShareName (5 GiB)" -ForegroundColor Gray
        } else {
            Write-Host "   ❌ Storage deployment failed" -ForegroundColor Red
            if ($rawStorageJson) { Write-Host $rawStorageJson -ForegroundColor Red }
            exit 1
        }
    }
} else {
    Write-Host "⚠️  Step 2/5: Persistent Storage (Skipped)" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Deploy Container App Environment
Write-Host "🌐 Step 3/5: Container App Environment" -ForegroundColor Cyan

# Check if environment exists
$skipEnvDeployment = $false
$envCheck = az containerapp env show --name $envName --resource-group $ResourceGroup --query "name" --output tsv 2>$null
$envExists = $LASTEXITCODE -eq 0 -and -not [string]::IsNullOrEmpty($envCheck)

if ($envExists) {
    Write-Host "   ✅ Environment already exists" -ForegroundColor Green
    $skipEnvDeployment = $true
}

if (-not $skipEnvDeployment) {
    Write-Host "   Deploying environment with Log Analytics (this may take 1-2 minutes)..." -ForegroundColor Yellow
    $envDeploymentName = "containerapp-env-$(Get-Date -Format 'yyyyMMddHHmmss')"

    $envDeployOutput = az deployment group create `
        --resource-group $ResourceGroup `
        --name $envDeploymentName `
        --template-file "$PSScriptRoot/../infra/containerapp-env.bicep" `
        --parameters caeName=$envName `
                     lawName=$lawName `
                     location=$Location `
        --no-wait `
        --output json 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Failed to start environment deployment" -ForegroundColor Red
        Write-Host $envDeployOutput -ForegroundColor Red
        exit 1
    }

    # Poll environment deployment
    $maxWaitSeconds = 300
    $elapsed = 0
    $checkInterval = 10

    while ($elapsed -lt $maxWaitSeconds) {
        Start-Sleep -Seconds $checkInterval
        $elapsed += $checkInterval

        $status = az deployment group show `
            --resource-group $ResourceGroup `
            --name $envDeploymentName `
            --query "properties.provisioningState" `
            --output tsv 2>$null

        if ($status -eq "Succeeded") {
            Write-Host "   ✅ Environment deployed successfully" -ForegroundColor Green
            break
        } elseif ($status -eq "Failed") {
            Write-Host "   ❌ Environment deployment failed" -ForegroundColor Red
            $errorDetails = az deployment group show `
                --resource-group $ResourceGroup `
                --name $envDeploymentName `
                --query "properties.error" `
                --output json 2>$null
            Write-Host "   Error details: $errorDetails" -ForegroundColor Red
            exit 1
        } elseif ($status -in @("Running", "Accepted", "")) {
            Write-Host "   ⏳ Still deploying... ($elapsed seconds elapsed)" -ForegroundColor Gray
        }
    }

    if ($elapsed -ge $maxWaitSeconds) {
        Write-Host "   ⚠️  Environment deployment timeout" -ForegroundColor Yellow
        Write-Host "   Check Azure Portal for status: $ResourceGroup" -ForegroundColor Yellow
        exit 1
    }
}
Write-Host ""

# Step 4: Deploy Container App
Write-Host "🐳 Step 4/5: Container App" -ForegroundColor Cyan

# Check if container app already exists
$appCheck = az containerapp show --name $AppName --resource-group $ResourceGroup --query "name" --output tsv 2>$null
$appExists = $LASTEXITCODE -eq 0 -and -not [string]::IsNullOrEmpty($appCheck)

$skipAppDeployment = $false

if ($appExists) {
    Write-Host "   ✅ Container App already exists" -ForegroundColor Green

    # Check current image version
    $currentImage = az containerapp show --name $AppName --resource-group $ResourceGroup --query "properties.template.containers[0].image" --output tsv 2>$null
    $desiredImage = "ghcr.io/kayasax/scimtool:$ImageTag"

    Write-Host "      Current image: $currentImage" -ForegroundColor Gray
    Write-Host "      Desired image: $desiredImage" -ForegroundColor Gray

    if ($currentImage -eq $desiredImage) {
        Write-Host "   ✅ Already configured with the same image tag - skipping deployment" -ForegroundColor Green
        $skipAppDeployment = $true
    } else {
        Write-Host "   🔄 Updating to new version..." -ForegroundColor Yellow
    }
} else {
    Write-Host "   Deploying SCIMTool container..." -ForegroundColor Yellow
}

if (-not $skipAppDeployment) {
    $containerParams = @{
        appName = $AppName
        environmentName = $envName
        location = $Location
        acrLoginServer = "ghcr.io"
        image = "kayasax/scimtool:$ImageTag"
        scimSharedSecret = $ScimSecret
    }

    if ($EnablePersistentStorage) {
        $containerParams.storageAccountName = $storageName
        $containerParams.storageAccountKey = $storageAccountKey
        $containerParams.fileShareName = "scimtool-data"
    }

    # Create a temporary parameters file to avoid escaping issues with special characters
    $paramsFile = "$env:TEMP\scimtool-params-$(Get-Date -Format 'yyyyMMddHHmmss').json"
    $paramsJson = @{
        '$schema' = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
        contentVersion = '1.0.0.0'
        parameters = @{}
    }

    foreach ($key in $containerParams.Keys) {
        $paramsJson.parameters[$key] = @{ value = $containerParams[$key] }
    }

    $paramsJson | ConvertTo-Json -Depth 10 | Out-File -FilePath $paramsFile -Encoding utf8
    Write-Host "   Created parameter file: $paramsFile" -ForegroundColor Gray

    Write-Host "   Deploying container (this may take 2-3 minutes)..." -ForegroundColor Gray
    $deploymentName = "containerapp-$(Get-Date -Format 'yyyyMMddHHmmss')"

    # Use --no-wait and then poll with timeout to avoid hanging
    Write-Host "   Starting deployment: $deploymentName" -ForegroundColor Gray
    Write-Host "   (This runs asynchronously - polling for completion...)" -ForegroundColor Gray

    $deployOutput = az deployment group create `
        --resource-group $ResourceGroup `
        --name $deploymentName `
        --template-file "$PSScriptRoot/../infra/containerapp.bicep" `
        --parameters $paramsFile `
        --no-wait `
        --output json

    # Clean up temp file
    Remove-Item $paramsFile -ErrorAction SilentlyContinue

    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Failed to start container app deployment" -ForegroundColor Red
        Write-Host "   Error output:" -ForegroundColor Red
        Write-Host $deployOutput -ForegroundColor Red
        exit 1
    }

    # Poll deployment status with timeout
    Write-Host "   Waiting for deployment to complete (timeout: 5 minutes)..." -ForegroundColor Gray
    $maxWaitSeconds = 300
    $elapsed = 0
    $checkInterval = 10

    while ($elapsed -lt $maxWaitSeconds) {
        Start-Sleep -Seconds $checkInterval
        $elapsed += $checkInterval

        $status = az deployment group show `
            --resource-group $ResourceGroup `
            --name $deploymentName `
            --query "properties.provisioningState" `
            --output tsv 2>$null

        if ($status -eq "Succeeded") {
            Write-Host "   ✅ Container App deployed successfully" -ForegroundColor Green
            break
        } elseif ($status -eq "Failed") {
            Write-Host "   ❌ Container App deployment failed" -ForegroundColor Red
            Write-Host "   Getting error details..." -ForegroundColor Yellow
            $errorDetails = az deployment group show `
                --resource-group $ResourceGroup `
                --name $deploymentName `
                --query "properties.error" `
                --output json
            Write-Host "   Error details:" -ForegroundColor Red
            Write-Host $errorDetails -ForegroundColor Red
            exit 1
        } elseif ($status -in @("Running", "Accepted", "")) {
            Write-Host "   ⏳ Still deploying... ($elapsed seconds elapsed)" -ForegroundColor Gray
        } else {
            Write-Host "   ⚠️  Unknown status: $status" -ForegroundColor Yellow
        }
    }

    if ($elapsed -ge $maxWaitSeconds) {
        Write-Host "   ⚠️  Deployment timeout after $maxWaitSeconds seconds" -ForegroundColor Yellow
        Write-Host "   The deployment may still be running. Check Azure Portal:" -ForegroundColor Yellow
        Write-Host "   https://portal.azure.com/#@/resource/subscriptions/$((az account show --query id -o tsv))/resourceGroups/$ResourceGroup/deployments" -ForegroundColor Cyan
        exit 1
    }
}
Write-Host ""

# Step 5: Get deployment details
Write-Host "📊 Step 5/5: Finalizing" -ForegroundColor Cyan
Write-Host "   Retrieving deployment details..." -ForegroundColor Yellow

$appDetails = az containerapp show --name $AppName --resource-group $ResourceGroup --output json | ConvertFrom-Json

if ($appDetails -and $appDetails.properties.configuration.ingress.fqdn) {
    $url = "https://$($appDetails.properties.configuration.ingress.fqdn)"
    Write-Host "   ✅ Deployment complete!" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Could not retrieve app URL" -ForegroundColor Yellow
    $url = "Unable to retrieve URL"
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "🎉 Deployment Successful!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Deployment Summary:" -ForegroundColor Cyan
Write-Host "   App URL: $url" -ForegroundColor Yellow
Write-Host "   SCIM Endpoint: $url/scim/v2" -ForegroundColor Yellow
Write-Host "   Resource Group: $ResourceGroup" -ForegroundColor White
$storageStatus = if($EnablePersistentStorage){'Enabled ✅'}else{'Disabled ⚠️'}
$storageColor = if($EnablePersistentStorage){'Green'}else{'Yellow'}
Write-Host "   Persistent Storage: $storageStatus" -ForegroundColor $storageColor
Write-Host ""

if ($EnablePersistentStorage) {
    Write-Host "💾 Storage Information:" -ForegroundColor Cyan
    Write-Host "   Storage Account: $storageName" -ForegroundColor White
    Write-Host "   File Share: scimtool-data" -ForegroundColor White
    Write-Host "   Mount Path: /app/data" -ForegroundColor White
    Write-Host "   Database (persistent copy): /app/data/scim.db" -ForegroundColor White
    Write-Host "   Runtime primary DB: /tmp/local-data/scim.db (ephemeral)" -ForegroundColor White
    Write-Host "   Note: Data persists across container restarts and scale-to-zero" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Configure Microsoft Entra ID provisioning:" -ForegroundColor White
Write-Host "   • Tenant URL: $url/scim/v2" -ForegroundColor Yellow
Write-Host "   • Secret Token: [your configured secret]" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Test the SCIM endpoint:" -ForegroundColor White
Write-Host "   curl -H 'Authorization: Bearer YOUR_SECRET' $url/scim/v2/ServiceProviderConfig" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Monitor your deployment:" -ForegroundColor White
Write-Host "   • Azure Portal: https://portal.azure.com" -ForegroundColor Gray
Write-Host "   • Resource: $ResourceGroup > $AppName" -ForegroundColor Gray
Write-Host "   • Logs: $ResourceGroup > $lawName" -ForegroundColor Gray
Write-Host ""

Write-Host "💰 Estimated Monthly Cost:" -ForegroundColor Cyan
if ($EnablePersistentStorage) {
    Write-Host '   Container App: ~$5-15 (scales to zero when idle)' -ForegroundColor White
    Write-Host '   Storage Account: ~$0.30 (5 GiB file share)' -ForegroundColor White
    Write-Host '   Log Analytics: ~$0-5 (depends on log volume)' -ForegroundColor White
    Write-Host '   Total: ~$5.30-20/month' -ForegroundColor Yellow
} else {
    Write-Host '   Container App: ~$5-15 (scales to zero when idle)' -ForegroundColor White
    Write-Host '   Log Analytics: ~$0-5 (depends on log volume)' -ForegroundColor White
    Write-Host '   Total: ~$5-20/month' -ForegroundColor Yellow
}
Write-Host ""

Write-Host "🏁 Deployment complete!" -ForegroundColor Green
