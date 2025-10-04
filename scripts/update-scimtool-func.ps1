# SCIMTool Container App Update Function
# NOTE: Saved as UTF-8 WITHOUT BOM. If remote fetch shows a leading invisible char, strip with -replace "^[\uFEFF]","".
# (BOM stripped; ensure saved UTF-8 no BOM)
# Usage: iex ((irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/update-scimtool-func.ps1') -replace "^[\uFEFF]","")

function Update-SCIMTool {
    param(
        [Parameter(Mandatory)]
        [string]$Version,
        [string]$ResourceGroup,
        [string]$AppName,
        [string]$Registry = "ghcr.io/kayasax",
        [string]$NamePattern = 'scim',
        [switch]$NoPrompt,
        [switch]$DryRun,
        [switch]$Quiet,
        [switch]$DebugDiscovery,
        [switch]$AutoSelect,
        [switch]$SelfTest
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

    if ($SelfTest) {
        Write-Log "SelfTest mode: faking Azure account context" 'INFO' Cyan
        $account = [pscustomobject]@{ user = @{ name = 'selftest@example.com' }; name = 'SELFTEST-SUB'; id = '00000000-0000-0000-0000-000000000000' }
    } else {
        try {
            Write-Log "Checking Azure CLI auth" 'INFO' Cyan
            $account = az account show --output json 2>$null | ConvertFrom-Json
            if (-not $account) { throw 'Not authenticated' }
            Write-Log "Authenticated: $($account.user.name) / $($account.name)" 'OK' Green
        } catch {
            Write-Log "Azure CLI authentication required (run az login)" 'ERROR' Red
            return
        }
    }

    # Ensure containerapp extension is installed (quietly)
    if (-not $SelfTest) {
        try {
            $ext = az extension show --name containerapp --query name -o tsv 2>$null
            if (-not $ext) {
                Write-Log "Installing containerapp CLI extension" 'INFO' Cyan
                az extension add --name containerapp -y --only-show-errors 2>$null | Out-Null
            }
        } catch {
            Write-Log "Unable to verify/install containerapp extension (continuing)" 'WARN' Yellow
        }
    }

    if (-not $NoPrompt -and -not $SelfTest) {
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

    # Helper: extract first JSON array or object from noisy az output (warnings etc.)
    function Get-CleanJson([string]$raw) {
        if (-not $raw) { return $null }
        # Fast path: if raw starts with [ or { and converts fine
        $trim = $raw.TrimStart()
        if ($trim.StartsWith('[') -or $trim.StartsWith('{')) {
            try { return $trim } catch { }
        }
        # Find first '[' or '{'
        $firstIdx = $raw.IndexOf('[')
        if ($firstIdx -lt 0) { $firstIdx = $raw.IndexOf('{') }
        if ($firstIdx -lt 0) { return $null }
        $candidate = $raw.Substring($firstIdx)
        # Heuristic: truncate after last ']' or '}' whichever is last in string
        $lastSq = $candidate.LastIndexOf(']')
        $lastCr = $candidate.LastIndexOf('}')
        $endIdx = [Math]::Max($lastSq, $lastCr)
        if ($endIdx -gt 0) { $candidate = $candidate.Substring(0, $endIdx + 1) }
        try { $null = $candidate | ConvertFrom-Json; return $candidate } catch { return $null }
    }

    # Auto-detect BOM in this script content when loaded via iex without manual replace.
    if (-not (Get-Variable -Name SCIMTool_BOMStripped -ErrorAction SilentlyContinue)) {
        $scriptText = $null
        try { $scriptText = (Get-Content -LiteralPath $PSCommandPath -Raw -ErrorAction SilentlyContinue) } catch { }
        if ($scriptText -and $scriptText.Length -gt 0 -and $scriptText[0] -eq [char]0xFEFF) {
            # Re-invoke without BOM
            $rebased = $scriptText.Substring(1)
            $env:SCIMTool_BOMStripped = '1'
            Invoke-Expression $rebased
            return
        }
        Set-Variable -Name SCIMTool_BOMStripped -Value 1 -Scope Script -Option ReadOnly -ErrorAction SilentlyContinue
    }

    if (-not $ResourceGroup -or -not $AppName) {
        Write-Log "Discovering SCIMTool container apps" 'INFO' Cyan
        # Collect full list (warnings may be mixed in) or simulate in SelfTest
        if ($SelfTest) {
            $rawList = @'
UserWarning: cryptography performance issue
Some other warning line
[
  {"name":"scimtool-app","resourceGroup":"rg-scim"},
  {"name":"otherapp","resourceGroup":"rg-other"},
  {"name":"scim-extra","resourceGroup":"rg-scim2"}
]
'@
            $LASTEXITCODE = 0
        } else {
            $rawList = az containerapp list -o json 2>$null
        }
        if ($DebugDiscovery -and $rawList) { Write-Host "--- RAW LIST (NOISY) ---`n$rawList`n-----------------------" -ForegroundColor DarkGray }
        $cleanJson = Get-CleanJson $rawList
        if ($DebugDiscovery -and $cleanJson) { Write-Host "--- CLEAN JSON ---`n$cleanJson`n-----------------------" -ForegroundColor DarkGray }
        $containerApps = $null
        if ($LASTEXITCODE -eq 0 -and $cleanJson) {
            try {
                $allApps = $cleanJson | ConvertFrom-Json
                $filtered = $allApps | Where-Object { $_.name -match $NamePattern }
                if ($filtered) {
                    $containerApps = @()
                    foreach ($app in $filtered) { $containerApps += [pscustomobject]@{ name = $app.name; rg = $app.resourceGroup } }
                }
            } catch {
                Write-Log "Primary JSON parse/filter failed: $($_.Exception.Message)" 'WARN' Yellow
            }
        }
        if (-not $containerApps -or $containerApps.Count -eq 0) {
            Write-Log "Primary discovery produced no results; attempting TSV fallback (sanitized)." 'INFO' Cyan
            if ($SelfTest) {
                $tsvRaw = "scimtool-app	rg-scim`notherapp	rg-other`nscim-extra	rg-scim2"; $LASTEXITCODE = 0
            } else {
                $tsvRaw = az containerapp list --output tsv 2>$null
            }
            if ($DebugDiscovery -and $tsvRaw) { Write-Host "--- RAW TSV (POSSIBLY NOISY) ---`n$tsvRaw`n---------------------" -ForegroundColor DarkGray }
            if ($LASTEXITCODE -eq 0 -and $tsvRaw) {
                $lines = $tsvRaw -split "`n" | Where-Object { $_ -match "\t" }
                $appsTmp = @()
                foreach ($line in $lines) {
                    $parts = $line -split "\t"
                    # Heuristic: name and one of resource group fields (some extra columns may exist); choose first two tokens
                    if ($parts.Count -ge 2) { $appsTmp += [pscustomobject]@{ name = $parts[0]; rg = $parts[1] } }
                }
                if ($appsTmp.Count -gt 0) { $containerApps = $appsTmp | Where-Object { $_.name -match $NamePattern } }
            }
        }
        if (-not $containerApps -or $containerApps.Count -eq 0) {
            Write-Log "No container apps auto-discovered. Provide -ResourceGroup and -AppName explicitly." 'ERROR' Red
            if (-not $Quiet) { Write-Host "Try adding -DebugDiscovery for more details." -ForegroundColor Gray }
            return
        }
        if ($containerApps.Count -eq 1) {
            $ResourceGroup = $containerApps[0].rg; $AppName = $containerApps[0].name
            Write-Log "Using $AppName ($ResourceGroup)" 'OK' Green
        } else {
            if ($NoPrompt -and $AutoSelect) {
                # Auto selection heuristic:
                # 1. Attempt to pick app whose image tag != target version.
                # 2. If still ambiguous, prefer app without volumes when updating to new backup model (or with volumes if only one has volumes).
                # 3. If still >1, abort with guidance.
                $desiredTag = $cleanVersion
                $candidates = @()
                foreach ($c in $containerApps) {
                    try {
                        $det = az containerapp show -n $c.name -g $c.rg -o json 2>$null | ConvertFrom-Json
                        $img = $det.properties.template.containers[0].image
                        $vols = $det.properties.template.volumes
                        $hasVols = $false; if ($vols -and $vols.Count -gt 0) { $hasVols = $true }
                        $tag = $null; if ($img -match ':' ) { $tag = ($img.Split(':')[-1]) }
                        $c | Add-Member -NotePropertyName image -NotePropertyValue $img -Force
                        $c | Add-Member -NotePropertyName tag -NotePropertyValue $tag -Force
                        $c | Add-Member -NotePropertyName hasVolumes -NotePropertyValue $hasVols -Force
                        $candidates += $c
                    } catch { }
                }
                $mismatch = $candidates | Where-Object { $_.tag -and $_.tag -ne $desiredTag }
                if ($mismatch.Count -eq 1) {
                    $ResourceGroup = $mismatch[0].rg; $AppName = $mismatch[0].name
                    Write-Log "AutoSelect: picked $AppName (image tag '$($mismatch[0].tag)' != target '$desiredTag')" 'OK' Green
                } else {
                    if (-not $ResourceGroup) {
                        $volPref = $candidates | Where-Object { -not $_.hasVolumes }
                        if ($volPref.Count -eq 1) {
                            $ResourceGroup = $volPref[0].rg; $AppName = $volPref[0].name
                            Write-Log "AutoSelect: picked $AppName (only app without volumes)" 'OK' Green
                        }
                    }
                    if (-not $ResourceGroup -and $candidates.Count -eq 1) {
                        $ResourceGroup = $candidates[0].rg; $AppName = $candidates[0].name
                        Write-Log "AutoSelect: single candidate after inspection $AppName" 'OK' Green
                    }
                    if (-not $ResourceGroup) {
                        Write-Log "AutoSelect unable to disambiguate between: $($candidates | ForEach-Object { $_.name } -join ', ')" 'ERROR' Red
                        Write-Log "Provide -ResourceGroup/-AppName or refine -NamePattern." 'ERROR' Red
                        return
                    }
                }
            } elseif ($NoPrompt) {
                Write-Log "Multiple apps found; supply -ResourceGroup/-AppName or adjust -NamePattern '$NamePattern' (or add -AutoSelect)" 'ERROR' Red; return }
            for ($i=0;$i -lt $containerApps.Count;$i++){ if (-not $Quiet) { Write-Host "[$($i+1)] $($containerApps[$i].name) (RG: $($containerApps[$i].rg))" -ForegroundColor Gray } }
            do { $sel = Read-Host -Prompt "Select [1-$($containerApps.Count)]"; $idx = [int]$sel - 1 } while ($idx -lt 0 -or $idx -ge $containerApps.Count)
            $ResourceGroup = $containerApps[$idx].rg; $AppName = $containerApps[$idx].name
            Write-Log "Selected $AppName ($ResourceGroup)" 'OK' Green
        }
    }

    $appDetails = $null
    if ($SelfTest) {
        $appDetails = [pscustomobject]@{ properties = @{ template = @{ volumes = @() } } }
    } else {
        $appDetails = az containerapp show -n $AppName -g $ResourceGroup -o json | ConvertFrom-Json
    }
    $hasVolumes = $false
    $primaryContainer = $null
    if ($appDetails -and $appDetails.properties -and $appDetails.properties.template) {
        $hasVolumes = $appDetails.properties.template.volumes -and $appDetails.properties.template.volumes.Count -gt 0
        if ($appDetails.properties.template.containers -and $appDetails.properties.template.containers.Count -gt 0) {
            $primaryContainer = $appDetails.properties.template.containers[0]
        }
    }

    $envMap = @{}
    if ($primaryContainer -and $primaryContainer.env) {
        foreach ($envEntry in $primaryContainer.env) {
            $name = $envEntry.name
            if (-not $name) { continue }
            $value = $envEntry.value
            if (-not $value -and $envEntry.secretRef) { $value = "(secret:$($envEntry.secretRef))" }
            $envMap[$name] = $value
        }
    }

    $blobAccount = $envMap['BLOB_BACKUP_ACCOUNT']
    $blobContainer = $envMap['BLOB_BACKUP_CONTAINER']
    $scimRgEnv = $envMap['SCIM_RG']
    $scimAppEnv = $envMap['SCIM_APP']

    if (-not $ResourceGroup -and $scimRgEnv) { $ResourceGroup = $scimRgEnv }
    if (-not $AppName -and $scimAppEnv) { $AppName = $scimAppEnv }

    $backupMode = if ($hasVolumes) { 'azureFiles' } elseif ($blobAccount) { 'blob' } else { 'none' }

    Write-Log "RG=$ResourceGroup App=$AppName NewImage=$imageRef" 'INFO' Cyan

    switch ($backupMode) {
        'azureFiles' { Write-Log 'Persistent storage detected (Azure Files volume)' 'OK' Green }
        'blob' {
            $blobSummary = if ($blobContainer) { "account: $blobAccount / container: $blobContainer" } else { "account: $blobAccount" }
            Write-Log "Blob snapshot backups detected ($blobSummary)" 'OK' Green
        }
        default { Write-Log 'No persistent storage (data ephemeral)' 'WARN' Yellow }
    }

    $updateCommand = "az containerapp update -n '$AppName' -g '$ResourceGroup' --image '$imageRef'"
    if (-not $Quiet) { Write-Host $updateCommand -ForegroundColor Yellow }

    if ($backupMode -eq 'none') {
        Write-Log "DATA WARNING: Existing data will be lost (no volume/snapshot)" 'WARN' Yellow
        if (-not $Quiet) { Write-Host "Add storage: scripts/add-persistent-storage.ps1" -ForegroundColor Gray }
    } elseif ($backupMode -eq 'blob' -and -not $Quiet) {
        Write-Host "Blob snapshot mode active – ensure retention meets your requirements." -ForegroundColor Gray
    }

    if ($DryRun -or $SelfTest) { Write-Log "DryRun/SelfTest: exiting before execution" 'INFO' Cyan; return }

    if (-not $NoPrompt) {
        if ($backupMode -eq 'none') {
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
            if ($paramName -in @('NoPrompt', 'DryRun', 'Quiet', 'DebugDiscovery')) {
                $params[$paramName] = $true
            } elseif (($i + 1) -lt $args.Count -and -not $args[$i + 1].StartsWith('-')) {
                $params[$paramName] = $args[$i + 1]
                $i++
            }
        }
    }

    if ($params.Count -gt 0 -and $params.ContainsKey('Version')) { Update-SCIMTool @params }
    else { Write-Host "Usage: Update-SCIMTool -Version 'v0.8.1' [-ResourceGroup rg] [-AppName app] [-NamePattern regex] [-NoPrompt] [-DryRun] [-Quiet] [-DebugDiscovery]" -ForegroundColor Yellow }
} else {
    Write-Host "SCIMTool update function loaded." -ForegroundColor Green
    Write-Host "Examples:" -ForegroundColor Gray
    Write-Host "  Update-SCIMTool -Version v0.8.1" -ForegroundColor Gray
    Write-Host "  Update-SCIMTool -Version v0.8.1 -ResourceGroup rg -AppName app -Quiet" -ForegroundColor Gray
}