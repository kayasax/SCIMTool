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
        [switch]$DryRun,
        [switch]$Quiet
    )

    $ErrorActionPreference = 'Stop'

    function Write-Log {
        param([string]$Msg,[string]$Type='INFO',[ConsoleColor]$Color=[ConsoleColor]::Gray)
        if ($Quiet) { return }
        Write-Host "[$Type] $Msg" -ForegroundColor $Color
    }

    $cleanVersion = $Version.Trim().TrimStart('v','V')
    $imageRef = "$Registry/scimtool:$cleanVersion"

    if (-not $Quiet) {
        Write-Host "SCIMTool Update" -ForegroundColor Cyan
        Write-Host "Version: $cleanVersion" -ForegroundColor Gray
        Write-Host "Image  : $imageRef" -ForegroundColor Gray
    }

    try {
        Write-Log "Checking Azure CLI auth" 'INFO' Cyan
        $account = az account show --output json 2>$null | ConvertFrom-Json
        if (-not $account) { throw 'Not authenticated' }
        Write-Log "Authenticated: $($account.user.name) / $($account.name)" 'OK' Green
    } catch {
        Write-Log "Azure CLI authentication required (run az login)" 'ERROR' Red
        return
    }

    if (-not $NoPrompt) {
        Write-Log "Subscription: $($account.name) ($($account.id))" 'SUB' Cyan
        $ChangeSubscription = Read-Host -Prompt "Change subscription? (y/N)"
        if ($ChangeSubscription -match '^[Yy]$') {
            az account list --query "[].{Name:name,Id:id,Default:isDefault}" -o table
            $NewSubscriptionId = Read-Host -Prompt "Enter subscription ID or name"
            if ($NewSubscriptionId) {
                az account set --subscription $NewSubscriptionId | Out-Null
                $account = az account show | ConvertFrom-Json
                Write-Log "Switched to: $($account.name)" 'OK' Green
            }
        }
    }

    if (-not $ResourceGroup -or -not $AppName) {
        Write-Log "Discovering SCIMTool container apps" 'INFO' Cyan
        $containerApps = az containerapp list --query "[?contains(name,'scim')].{name:name,rg:resourceGroup}" -o json | ConvertFrom-Json
        if (-not $containerApps -or $containerApps.Count -eq 0) { Write-Log "No apps found. Specify -ResourceGroup and -AppName." 'ERROR' Red; return }
        if ($containerApps.Count -eq 1) {
            $ResourceGroup = $containerApps[0].rg; $AppName = $containerApps[0].name
            Write-Log "Using $AppName ($ResourceGroup)" 'OK' Green
        } else {
            if ($NoPrompt) { Write-Log "Multiple apps found; supply -ResourceGroup/-AppName" 'ERROR' Red; return }
            for ($i=0;$i -lt $containerApps.Count;$i++){ if (-not $Quiet) { Write-Host "[$($i+1)] $($containerApps[$i].name) (RG: $($containerApps[$i].rg))" -ForegroundColor Gray } }
            do { $sel = Read-Host -Prompt "Select [1-$($containerApps.Count)]"; $idx = [int]$sel - 1 } while ($idx -lt 0 -or $idx -ge $containerApps.Count)
            $ResourceGroup = $containerApps[$idx].rg; $AppName = $containerApps[$idx].name
            Write-Log "Selected $AppName ($ResourceGroup)" 'OK' Green
        }
    }

    Write-Log "RG=$ResourceGroup App=$AppName NewImage=$imageRef" 'INFO' Cyan

    $appDetails = az containerapp show -n $AppName -g $ResourceGroup -o json | ConvertFrom-Json
    $hasVolumes = $appDetails.properties.template.volumes -and $appDetails.properties.template.volumes.Count -gt 0
    if ($hasVolumes) {
        Write-Log "Persistent storage detected" 'OK' Green
    } else {
        Write-Log "No persistent storage (data ephemeral)" 'WARN' Yellow
    }

    $updateCommand = "az containerapp update -n '$AppName' -g '$ResourceGroup' --image '$imageRef'"
    if (-not $Quiet) { Write-Host $updateCommand -ForegroundColor Yellow }

    if (-not $hasVolumes) {
        Write-Log "DATA WARNING: Existing data will be lost (no volume)" 'WARN' Yellow
        if (-not $Quiet) { Write-Host "Add storage: scripts/add-persistent-storage.ps1" -ForegroundColor Gray }
    }

    if ($DryRun) { Write-Log "DryRun: exiting before execution" 'INFO' Cyan; return }

    if (-not $NoPrompt) {
        if (-not $hasVolumes) {
            $confirm = Read-Host "Proceed (data loss) [y/N]"
            if ($confirm -notmatch '^[Yy]$') { Write-Log "Cancelled" 'CANCEL' Yellow; return }
        } else {
            $confirm = Read-Host "Proceed update? [Y/n]"
            if ($confirm -match '^[Nn]$') { Write-Log "Cancelled" 'CANCEL' Yellow; return }
        }
    }

    Write-Log "Updating container app" 'INFO' Cyan
    try {
        Invoke-Expression $updateCommand
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Update successful" 'OK' Green
            if (-not $Quiet) {
                Write-Host "Revisions: az containerapp revision list -n $AppName -g $ResourceGroup -o table" -ForegroundColor Gray
                Write-Host "Logs:     az containerapp logs show -n $AppName -g $ResourceGroup --tail 20" -ForegroundColor Gray
                Write-Host "FQDN:     az containerapp show -n $AppName -g $ResourceGroup --query properties.configuration.ingress.fqdn -o tsv" -ForegroundColor Gray
            }
        } else { Write-Log "Update failed (exit $LASTEXITCODE)" 'ERROR' Red }
    } catch { Write-Log "Error: $($_.Exception.Message)" 'ERROR' Red }
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

    if ($params.Count -gt 0 -and $params.ContainsKey('Version')) { Update-SCIMTool @params }
    else { Write-Host "Usage: Update-SCIMTool -Version 'v0.8.1' [-ResourceGroup rg] [-AppName app] [-NoPrompt] [-DryRun] [-Quiet]" -ForegroundColor Yellow }
} else {
    Write-Host "SCIMTool update function loaded." -ForegroundColor Green
    Write-Host "Examples:" -ForegroundColor Gray
    Write-Host "  Update-SCIMTool -Version v0.8.1" -ForegroundColor Gray
    Write-Host "  Update-SCIMTool -Version v0.8.1 -ResourceGroup rg -AppName app -Quiet" -ForegroundColor Gray
}