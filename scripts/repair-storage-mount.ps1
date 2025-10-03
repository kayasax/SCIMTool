param(
    [Parameter(Mandatory)][string]$ResourceGroup,
    [Parameter(Mandatory)][string]$AppName
)

$ErrorActionPreference = 'Stop'

Write-Host "SCIMTool Storage Mount Repair" -ForegroundColor Cyan
Write-Host " RG  : $ResourceGroup" -ForegroundColor Gray
Write-Host " App : $AppName" -ForegroundColor Gray

# Derive names consistent with deploy-azure.ps1 logic
function Normalize($s){ return $s.Replace('-', '').Replace('_','').ToLower() }
$appPrefix = Normalize $AppName
$rgSuffix  = Normalize $ResourceGroup
$storageName = "$appPrefix$rgSuffix" + 'stor'
if ($storageName.Length -gt 24) {
    $maxRgLen = 24 - $appPrefix.Length - 4
    if ($maxRgLen -gt 0) { $rgSuffix = $rgSuffix.Substring(0, [Math]::Min($rgSuffix.Length, $maxRgLen)); $storageName = "$appPrefix$rgSuffix" + 'stor' }
    if ($storageName.Length -gt 24) { $storageName = $storageName.Substring(0,24) }
}
$envName = "$AppName-env"
$fileShare = 'scimtool-data'

Write-Host " Derived Storage Account: $storageName" -ForegroundColor Gray
Write-Host " Environment Name     : $envName" -ForegroundColor Gray

# Verify Azure CLI auth
try { az account show -o none 2>$null } catch { Write-Host 'Not logged in (az login required)' -ForegroundColor Red; exit 1 }

# Check storage account exists
$acct = az storage account show -n $storageName -g $ResourceGroup -o json 2>$null | ConvertFrom-Json
if (-not $acct) { Write-Host "Storage account $storageName not found. If you disabled persistence originally this script is not applicable." -ForegroundColor Red; exit 1 }

# Ensure shared key access is enabled
$allowShared = ($acct | Select-Object -ExpandProperty properties).allowSharedKeyAccess
if ($allowShared -eq $false) {
    Write-Host "Shared key access disabled. Re-enabling..." -ForegroundColor Yellow
    az storage account update -n $storageName -g $ResourceGroup --allow-shared-key-access true -o none
    $acct = az storage account show -n $storageName -g $ResourceGroup -o json | ConvertFrom-Json
    Write-Host "Shared key access re-enabled." -ForegroundColor Green
}

# Get current key
$key = az storage account keys list -n $storageName -g $ResourceGroup --query "[0].value" -o tsv 2>$null
if (-not $key) { Write-Host "Unable to retrieve storage key." -ForegroundColor Red; exit 1 }
Write-Host " Retrieved primary key length: $($key.Length)" -ForegroundColor Gray

# Ensure file share exists
$shareExists = az storage share exists --name $fileShare --account-name $storageName --account-key $key --query exists -o tsv 2>$null
if ($shareExists -ne 'true') {
    Write-Host "Creating file share $fileShare..." -ForegroundColor Yellow
    az storage share create --name $fileShare --account-name $storageName --account-key $key -o none
    Write-Host "File share created." -ForegroundColor Green
}

# Refresh environment storage mapping
Write-Host "Updating environment storage credentials..." -ForegroundColor Cyan
az containerapp env storage set `
  --name $envName `
  --resource-group $ResourceGroup `
  --storage-name scimtool-storage `
  --azure-file-account-name $storageName `
  --azure-file-account-key $key `
  --azure-file-share-name $fileShare `
  --access-mode ReadWrite -o none
if ($LASTEXITCODE -ne 0) { Write-Host "Failed to update environment storage." -ForegroundColor Red; exit 1 }
Write-Host "Environment storage updated." -ForegroundColor Green

# Restart container app (graceful)
az containerapp restart -n $AppName -g $ResourceGroup -o none 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Restart command not available or failed; triggering no-op revision update." -ForegroundColor Yellow
    $rand = Get-Random
    az containerapp update -n $AppName -g $ResourceGroup --set-env-vars SCIMTOOL_REFRESH=$rand -o none
}

Write-Host "Waiting 20s for restart..." -ForegroundColor Gray
Start-Sleep -Seconds 20

# Basic health probe: list revisions state
Write-Host "Revisions:" -ForegroundColor Cyan
az containerapp revision list -n $AppName -g $ResourceGroup --query "[].{name:name,active:properties.active,healthy:properties.healthState}" -o table

Write-Host "If mount still fails: regenerate a key (rotates) then re-run this script, or verify no networking restrictions were added." -ForegroundColor Yellow
Write-Host "Done." -ForegroundColor Green
