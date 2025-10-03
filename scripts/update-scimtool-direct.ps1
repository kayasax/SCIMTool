# SCIMTool Direct Update Script (UTF-8 no BOM)
# Minimal variant: requires explicit Resource Group and Container App name.
# Intended for generation by the running SCIMTool app so discovery is unnecessary.
# Usage example (app can render this ready to copy):
#   iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/update-scimtool-direct.ps1'); \
#     Update-SCIMTool -Version v0.8.1 -ResourceGroup my-rg -AppName scimtool-app -NoPrompt

function Update-SCIMToolDirect {
    [CmdletBinding()] param(
        [Parameter(Mandatory)][string]$Version,
        [Parameter(Mandatory)][string]$ResourceGroup,
        [Parameter(Mandatory)][string]$AppName,
        [string]$Registry = 'ghcr.io/kayasax',
        [switch]$NoPrompt,
        [switch]$Quiet,
        [switch]$DryRun,
        [switch]$Force,
        [switch]$ShowCurrent
    )

    $ErrorActionPreference = 'Stop'

    function Log([string]$m,[string]$t='INFO',[ConsoleColor]$c=[ConsoleColor]::Gray){ if(-not $Quiet){ Write-Host "[$t] $m" -ForegroundColor $c }}

    # Normalize version tag
    $cleanVersion = $Version.Trim().TrimStart('v','V')
    $imageRef = "$Registry/scimtool:$cleanVersion"

    Log "Update target image: $imageRef" 'INFO' Cyan

    # Auth check
    try { $acct = az account show -o json 2>$null | ConvertFrom-Json } catch { $acct=$null }
    if(-not $acct){ Log 'Not authenticated (run az login)' 'ERROR' Red; return }
    Log "Subscription: $($acct.name) ($($acct.id))" 'SUB' DarkCyan

    # Ensure extension
    try { $ext = az extension show -n containerapp --query name -o tsv 2>$null } catch { $ext=$null }
    if(-not $ext){ Log 'Installing containerapp CLI extension' 'INFO' Cyan; az extension add -n containerapp --only-show-errors | Out-Null }

    # Optionally show current image
    $currentImage = $null
    try {
        $appJson = az containerapp show -n $AppName -g $ResourceGroup -o json 2>$null | ConvertFrom-Json
        $currentImage = $appJson.properties.template.containers[0].image
    } catch { Log 'Could not fetch current app details (continuing)' 'WARN' Yellow }
    if($ShowCurrent -and $currentImage){ Log "Current image: $currentImage" 'INFO' Gray }

    if($currentImage -eq $imageRef){ Log 'Target image matches current image (no change)' 'OK' Green; if(-not $Force){ return } }

    if(-not $NoPrompt -and -not $Force){
        $ans = Read-Host "Proceed updating $AppName in $ResourceGroup to $imageRef? (y/N)"
        if($ans -notmatch '^[Yy]$'){ Log 'Cancelled' 'CANCEL' Yellow; return }
    }

    if($DryRun){ Log 'DryRun: skipping update execution' 'INFO' Cyan; return }

    $cmd = "az containerapp update -n `"$AppName`" -g `"$ResourceGroup`" --image `"$imageRef`""
    if(-not $Quiet){ Write-Host $cmd -ForegroundColor Yellow }

    try {
        az containerapp update -n $AppName -g $ResourceGroup --image $imageRef --only-show-errors | Out-Null
        if($LASTEXITCODE -eq 0){
            Log 'Update successful' 'OK' Green
            if(-not $Quiet){
                Write-Host "Revision list: az containerapp revision list -n $AppName -g $ResourceGroup -o table" -ForegroundColor Gray
                Write-Host "Logs (tail):  az containerapp logs show -n $AppName -g $ResourceGroup --tail 20" -ForegroundColor Gray
                Write-Host "FQDN:         az containerapp show -n $AppName -g $ResourceGroup --query properties.configuration.ingress.fqdn -o tsv" -ForegroundColor Gray
            }
        } else { Log "Update failed (exit $LASTEXITCODE)" 'ERROR' Red }
    } catch { Log "Error: $($_.Exception.Message)" 'ERROR' Red }
}

# Auto-execute if called with inline params after fetch
if($args.Count -gt 0){
    $p=@{}; for($i=0;$i -lt $args.Count;$i++){ $a=$args[$i]; if($a.StartsWith('-')){ $n=$a.TrimStart('-'); if($n -in @('NoPrompt','Quiet','DryRun','Force','ShowCurrent')){ $p[$n]=$true } elseif(($i+1) -lt $args.Count -and -not $args[$i+1].StartsWith('-')){ $p[$n]=$args[$i+1]; $i++ } } }
    if($p.ContainsKey('Version') -and $p.ContainsKey('ResourceGroup') -and $p.ContainsKey('AppName')){ Update-SCIMToolDirect @p } else { Write-Host "Usage: Update-SCIMToolDirect -Version v0.8.1 -ResourceGroup <rg> -AppName <app> [-Force] [-NoPrompt] [-Quiet] [-DryRun] [-ShowCurrent]" -ForegroundColor Yellow }
} else {
    Write-Host 'SCIMTool direct update function loaded (Update-SCIMToolDirect).' -ForegroundColor Green
    Write-Host 'Example:' -ForegroundColor Gray
    Write-Host '  Update-SCIMToolDirect -Version v0.8.1 -ResourceGroup my-rg -AppName scimtool-app -NoPrompt' -ForegroundColor Gray
}
