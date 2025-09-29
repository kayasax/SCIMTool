# SCIMTool Container App Update Function
# This script is designed to be downloaded and executed remotely
# Usage: iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/update-scimtool-func.ps1')

function Update-SCIMTool {
    param(
        [Parameter(Mandatory)]
        [string]$Version,
        [string]$ResourceGroup,
        [string]$AppName,
        [string]$Registry = "ghcr.io/kayasax",
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
    Write-Host ""

    # Check Azure CLI authentication
    try {
        Write-Host "Checking Azure CLI authentication..." -ForegroundColor Cyan
        $account = az account show --output json 2>$null | ConvertFrom-Json
        if (-not $account) {
            throw "Not authenticated"
        }
        Write-Host "✅ Authenticated as $($account.user.name)" -ForegroundColor Green
        Write-Host "   Current subscription: $($account.name)" -ForegroundColor Gray
        Write-Host ""
    } catch {
        Write-Host "❌ Azure CLI authentication required" -ForegroundColor Red
        Write-Host "   Please run: az login" -ForegroundColor Yellow
        return
    }

    # Subscription selection (unless NoPrompt)
    if (-not $NoPrompt) {
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
    }

    # Discover SCIMTool resources if not specified
    if (-not $ResourceGroup -or -not $AppName) {
        Write-Host "🔍 Discovering SCIMTool resources..." -ForegroundColor Cyan
        
        # Find container apps with 'scim' in the name
        $containerApps = az containerapp list --query "[?contains(name, 'scim')].{name:name, resourceGroup:resourceGroup}" --output json | ConvertFrom-Json
        
        if ($containerApps.Count -eq 0) {
            Write-Host "❌ No SCIMTool container apps found. Please specify -ResourceGroup and -AppName manually." -ForegroundColor Red
            return
        } elseif ($containerApps.Count -eq 1) {
            $ResourceGroup = $containerApps[0].resourceGroup
            $AppName = $containerApps[0].name
            Write-Host "✅ Found SCIMTool: $AppName in $ResourceGroup" -ForegroundColor Green
        } else {
            Write-Host "📋 Multiple SCIMTool apps found:" -ForegroundColor Yellow
            for ($i = 0; $i -lt $containerApps.Count; $i++) {
                Write-Host "   [$($i+1)] $($containerApps[$i].name) (RG: $($containerApps[$i].resourceGroup))" -ForegroundColor Gray
            }
            
            if ($NoPrompt) {
                Write-Host "❌ Multiple apps found but NoPrompt specified. Use -ResourceGroup and -AppName." -ForegroundColor Red
                return
            }
            
            do {
                $selection = Read-Host -Prompt "Select app to update [1-$($containerApps.Count)]"
                $index = [int]$selection - 1
            } while ($index -lt 0 -or $index -ge $containerApps.Count)
            
            $ResourceGroup = $containerApps[$index].resourceGroup
            $AppName = $containerApps[$index].name
            Write-Host "✅ Selected: $AppName in $ResourceGroup" -ForegroundColor Green
        }
        Write-Host ""
    }

    Write-Host "📋 Update Details:" -ForegroundColor Yellow
    Write-Host "   Resource Group: $ResourceGroup" -ForegroundColor Gray
    Write-Host "   App Name: $AppName" -ForegroundColor Gray
    Write-Host "   New Image: $imageRef" -ForegroundColor Gray
    Write-Host ""

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

    if ($params.Count -gt 0 -and $params.ContainsKey('Version')) {
        Update-SCIMTool @params
    } else {
        Write-Host "Usage: Update-SCIMTool -Version 'v0.4.9' [-ResourceGroup 'rg-name'] [-AppName 'app-name'] [-NoPrompt] [-DryRun]" -ForegroundColor Yellow
    }
} else {
    Write-Host "SCIMTool update function loaded. Usage:" -ForegroundColor Green
    Write-Host "  Update-SCIMTool -Version 'v0.4.9'" -ForegroundColor Gray
    Write-Host "  Update-SCIMTool -Version 'v0.4.9' -ResourceGroup 'my-rg' -AppName 'my-app'" -ForegroundColor Gray
    Write-Host "  Update-SCIMTool -Version 'v0.4.9' -NoPrompt" -ForegroundColor Gray
    Write-Host "  Update-SCIMTool -Version 'v0.4.9' -DryRun" -ForegroundColor Gray
}