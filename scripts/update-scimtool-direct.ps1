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
        [string]$ScimSecret,
        [string]$JwtSecret,
        [string]$OauthClientSecret,
        [string]$Registry = 'ghcr.io/kayasax',
        [switch]$NoPrompt,
        [switch]$Quiet,
        [switch]$DryRun,
        [switch]$Force,
        [switch]$ShowCurrent
    )

    $ErrorActionPreference = 'Stop'

    function Log([string]$m,[string]$t='INFO',[ConsoleColor]$c=[ConsoleColor]::Gray){ if(-not $Quiet){ Write-Host "[$t] $m" -ForegroundColor $c }}

    function New-RandomSecret([int]$length = 64) {
        $builder = ''
        while ($builder.Length -lt $length) {
            $builder += [Guid]::NewGuid().ToString('N')
        }
        return $builder.Substring(0, $length)
    }

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
    $appJson = $null
    try {
        $appJson = az containerapp show -n $AppName -g $ResourceGroup -o json 2>$null | ConvertFrom-Json
        if ($appJson) {
            $currentImage = $appJson.properties.template.containers[0].image
        }
    } catch { Log 'Could not fetch current app details (continuing)' 'WARN' Yellow }
    if($ShowCurrent -and $currentImage){ Log "Current image: $currentImage" 'INFO' Gray }

    if($currentImage -eq $imageRef){ Log 'Target image matches current image (no change)' 'OK' Green; if(-not $Force){ return } }

    $existingSecrets = @()
    try {
        $existingSecrets = az containerapp secret list -n $AppName -g $ResourceGroup -o json 2>$null | ConvertFrom-Json
    } catch { Log 'Could not list existing secrets (continuing)' 'WARN' Yellow }

    $hasScimSecret = $false
    $hasJwtSecret = $false
    $hasOauthSecret = $false
    foreach ($secret in $existingSecrets) {
        switch ($secret.name) {
            'scim-shared-secret' { $hasScimSecret = $true }
            'jwt-secret' { $hasJwtSecret = $true }
            'oauth-client-secret' { $hasOauthSecret = $true }
        }
    }

    if (-not $ScimSecret -and $hasScimSecret) { $ScimSecret = '<existing>' }

    $secretUpdates = @()
    $secretValues = @{}

    if (-not $hasJwtSecret -or $JwtSecret) {
        if (-not $JwtSecret) {
            if (-not $NoPrompt -and -not $Quiet) {
                $JwtSecret = Read-Host 'Enter JWT signing secret (leave blank to auto-generate secure value)'
            }
            if (-not $JwtSecret) {
                $JwtSecret = New-RandomSecret
                Log 'Generated JWT secret (store securely).' 'WARN' Yellow
            }
        }
        $secretUpdates += "jwt-secret=$JwtSecret"
        $secretValues['jwt-secret'] = $JwtSecret
        $hasJwtSecret = $true
    }

    if (-not $hasOauthSecret -or $OauthClientSecret) {
        if (-not $OauthClientSecret) {
            if (-not $NoPrompt -and -not $Quiet) {
                $OauthClientSecret = Read-Host 'Enter OAuth client secret (leave blank to auto-generate secure value)'
            }
            if (-not $OauthClientSecret) {
                $OauthClientSecret = New-RandomSecret
                Log 'Generated OAuth client secret (store securely).' 'WARN' Yellow
            }
        }
        $secretUpdates += "oauth-client-secret=$OauthClientSecret"
        $secretValues['oauth-client-secret'] = $OauthClientSecret
        $hasOauthSecret = $true
    }

    if (-not $hasScimSecret -and -not $ScimSecret) {
        if (-not $NoPrompt -and -not $Quiet) {
            $ScimSecret = Read-Host 'Enter SCIM shared secret (leave blank to keep existing)' 
        }
        if (-not $ScimSecret -or $ScimSecret -eq '<existing>') {
            Log 'SCIM secret not supplied; existing value will remain unchanged if present.' 'WARN' Yellow
        } else {
            $secretUpdates += "scim-shared-secret=$ScimSecret"
            $secretValues['scim-shared-secret'] = $ScimSecret
            $hasScimSecret = $true
        }
    }

    if ($secretUpdates.Count -gt 0) {
        Log 'Applying secret updates to Container App.' 'INFO' Cyan
        az containerapp secret set -n $AppName -g $ResourceGroup --secrets $secretUpdates --only-show-errors | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Log 'Failed to set required secrets.' 'ERROR' Red
            return
        }
        if (-not $Quiet -and $secretValues.Keys.Count -gt 0) {
            Log 'Secret values updated (store securely):' 'INFO' Cyan
            foreach ($key in $secretValues.Keys) {
                if ($key -eq 'scim-shared-secret' -and $secretValues[$key] -eq '<existing>') { continue }
                Write-Host "  $key = $($secretValues[$key])" -ForegroundColor Yellow
            }
        }
    }

    if (-not $hasJwtSecret -or -not $hasOauthSecret) {
        Log 'JWT and OAuth secrets must exist before updating image.' 'ERROR' Red
        return
    }

    $envList = @()
    $envUpdated = $false
    if ($appJson) {
        $envList = @($appJson.properties.template.containers[0].env)
    }

    if (-not $envList) { $envList = @() }

    if (-not ($envList | Where-Object { $_.name -eq 'JWT_SECRET' })) {
        $envList += [pscustomobject]@{ name = 'JWT_SECRET'; secretRef = 'jwt-secret' }
        $envUpdated = $true
    }
    if (-not ($envList | Where-Object { $_.name -eq 'OAUTH_CLIENT_SECRET' })) {
        $envList += [pscustomobject]@{ name = 'OAUTH_CLIENT_SECRET'; secretRef = 'oauth-client-secret' }
        $envUpdated = $true
    }

    $envJson = $null
    if ($envList) {
        $envJson = ($envList | ConvertTo-Json -Compress)
    }

    if(-not $NoPrompt -and -not $Force){
        $ans = Read-Host "Proceed updating $AppName in $ResourceGroup to $imageRef? (y/N)"
        if($ans -notmatch '^[Yy]$'){ Log 'Cancelled' 'CANCEL' Yellow; return }
    }

    if($DryRun){ Log 'DryRun: skipping update execution' 'INFO' Cyan; return }

    $cmd = "az containerapp update -n `"$AppName`" -g `"$ResourceGroup`" --image `"$imageRef`""
    $setArgs = @()
    if ($envUpdated -and $envJson) {
        $setArgs += '--set'
        $setArgs += "template.containers[0].env=$envJson"
        $cmd += " --set template.containers[0].env=$envJson"
    }
    if(-not $Quiet){ Write-Host $cmd -ForegroundColor Yellow }

    try {
        az containerapp update -n $AppName -g $ResourceGroup --image $imageRef @setArgs --only-show-errors | Out-Null
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
