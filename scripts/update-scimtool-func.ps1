# SCIMTool Container App Update Function
# This script is designed to be downloaded and executed remotely
# Usage: iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/update-scimtool-func.ps1')

function Update-SCIMTool {
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

    # Normalize version (remove v prefix)
    $cleanVersion = $Version.Trim().TrimStart('v','V')
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
        return
    }

    # Build the Azure CLI command
    $updateCommand = "az containerapp update -n '$AppName' -g '$ResourceGroup' --image '$imageRef'"

    Write-Host "Update command:" -ForegroundColor Cyan
    Write-Host "  $updateCommand" -ForegroundColor Yellow
    Write-Host ""

    # ⚠️ DATA WARNING
    Write-Host "⚠️  WARNING: EXISTING DATA WILL BE DELETED" -ForegroundColor Red -BackgroundColor Yellow
    Write-Host "   This update will replace the container with a new version." -ForegroundColor Red
    Write-Host "   All existing activity logs, users, and groups will be lost." -ForegroundColor Red
    Write-Host "   Make sure to backup any important data before proceeding." -ForegroundColor Red
    Write-Host ""

    if ($DryRun) {
        Write-Host "🔍 Dry run mode - command would execute but no changes made" -ForegroundColor Yellow
        return
    }

    if (-not $NoPrompt) {
        Write-Host "Please confirm you understand the data loss warning above." -ForegroundColor Yellow
        do {
            $response = Read-Host "Proceed with container app update and data deletion? [y/N]"
            if ([string]::IsNullOrWhiteSpace($response) -or $response -in @('n','N','no','No')) {
                Write-Host "❌ Update cancelled by user" -ForegroundColor Yellow
                return
            }
        } while ($response -notin @('y','Y','yes','Yes'))
    }

    Write-Host "🔄 Updating container app..." -ForegroundColor Cyan
    Write-Host ""

    # Execute the Azure CLI command
    try {
        Invoke-Expression $updateCommand
        
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
        }
    } catch {
        Write-Host "❌ Error during update: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Auto-execute with parameters if they were passed to the script
# This allows both: iex (irm 'script.ps1') and direct parameter passing
if ($args.Count -gt 0) {
    # Parse simple arguments like -Version v0.2.0 -NoPrompt
    $params = @{}
    for ($i = 0; $i -lt $args.Count; $i++) {
        $arg = $args[$i]
        if ($arg.StartsWith('-')) {
            $paramName = $arg.TrimStart('-')
            if ($paramName -in @('NoPrompt', 'DryRun')) {
                $params[$paramName] = $true
            } elseif (($i + 1) -lt $args.Count -and -not $args[$i + 1].StartsWith('-')) {
                $params[$paramName] = $args[$i + 1]
                $i++
            }
        }
    }
    
    if ($params.Count -gt 0) {
        Update-SCIMTool @params
    } else {
        Write-Host "Usage: Update-SCIMTool -Version 'v0.2.0' [-NoPrompt] [-DryRun]" -ForegroundColor Yellow
    }
} else {
    Write-Host "SCIMTool update function loaded. Usage:" -ForegroundColor Green
    Write-Host "  Update-SCIMTool -Version 'v0.2.0'" -ForegroundColor Gray
    Write-Host "  Update-SCIMTool -Version 'v0.2.0' -NoPrompt" -ForegroundColor Gray
    Write-Host "  Update-SCIMTool -Version 'v0.2.0' -DryRun" -ForegroundColor Gray
}