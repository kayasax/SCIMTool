# SCIMTool setup script (safe header, no BOM)
$ErrorActionPreference = 'Stop'

# Optional deterministic overrides via environment variables:
#   SCIMTOOL_RG, SCIMTOOL_APP, SCIMTOOL_SECRET, SCIMTOOL_LOCATION, SCIMTOOL_IMAGETAG
# If provided, random generation is skipped.

# Auto values (no prompts to avoid hanging under iex)
if ($env:SCIMTOOL_LOCATION -and $env:SCIMTOOL_LOCATION.Trim().Length -gt 0) {
	$Location = $env:SCIMTOOL_LOCATION
} else {
	$Location = 'eastus'
}
if ($env:SCIMTOOL_IMAGETAG -and $env:SCIMTOOL_IMAGETAG.Trim().Length -gt 0) {
    $ImageTag = $env:SCIMTOOL_IMAGETAG
} else {
    $ImageTag = 'latest'
}
$persistentEnabled = $true # Legacy flag retained for compatibility but blob snapshot persistence is always enabled now

function New-ScimSecret {
	$b = New-Object byte[] 32
	[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
	$s = [Convert]::ToBase64String($b)
	$s = $s -replace '\+','-' -replace '/','_' -replace '='''
	if ($s.Length -gt 48) { return $s.Substring(0,48) } else { return $s }
}
function New-Suffix { (Get-Random -Minimum 1000 -Maximum 9999) }

function Get-ExistingAppCandidates {
	param([string]$ResourceGroupName)

	if ([string]::IsNullOrWhiteSpace($ResourceGroupName)) { return @() }

	$candidates = @()
	try {
		$appsJson = az resource list --resource-group $ResourceGroupName --resource-type "Microsoft.App/containerApps" --query "[].name" --output json --only-show-errors 2>$null
		if ($LASTEXITCODE -eq 0 -and $appsJson) {
			try { $candidates += ($appsJson | ConvertFrom-Json) } catch {}
		}
	} catch {}

	if ($candidates.Count -eq 0) {
		try {
			$envJson = az resource list --resource-group $ResourceGroupName --resource-type "Microsoft.App/managedEnvironments" --query "[].name" --output json --only-show-errors 2>$null
			if ($LASTEXITCODE -eq 0 -and $envJson) {
				try {
					$envNames = $envJson | ConvertFrom-Json
					foreach ($envName in $envNames) {
						if ([string]::IsNullOrWhiteSpace($envName)) { continue }
						if ($envName.EndsWith('-env')) {
							$candidates += $envName.Substring(0, $envName.Length - 4)
						} else {
							$candidates += $envName
						}
					}
				} catch {}
			}
		} catch {}
	}

	$filtered = $candidates | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
	if (-not $filtered) { return @() }
	return @($filtered | Sort-Object -Unique)
}

if ($env:SCIMTOOL_RG -and $env:SCIMTOOL_RG.Trim().Length -gt 0) {
	$ResourceGroup = $env:SCIMTOOL_RG
} else {
	$ResourceGroup = "scimtool-rg-$(New-Suffix)"
}
if ($env:SCIMTOOL_APP -and $env:SCIMTOOL_APP.Trim().Length -gt 0) {
	$AppName = $env:SCIMTOOL_APP
} else {
	$AppName = "scimtool-app-$(New-Suffix)"
}
if ($env:SCIMTOOL_SECRET -and $env:SCIMTOOL_SECRET.Trim().Length -gt 0) {
	$ScimSecret = $env:SCIMTOOL_SECRET
} else {
	$ScimSecret = New-ScimSecret
}

# Interactive prompting (unless explicitly disabled)
$interactive = $true
if ($env:SCIMTOOL_UNATTENDED -and $env:SCIMTOOL_UNATTENDED -in @('1','true','yes')) { $interactive = $false }

function Get-DefaultValue($label, $default) {
    $userInput = Read-Host "$label [$default]"
    if ([string]::IsNullOrWhiteSpace($userInput)) { return $default } else { return $userInput }
}

if ($interactive) {
	Write-Host "Interactive mode: Press Enter to accept values in brackets, or type a new value." -ForegroundColor Cyan
	# Show current subscription and allow switch before resource creation
	try {
		$currentSub = az account show --query "{name:name,id:id}" -o json 2>$null | ConvertFrom-Json
		if ($currentSub) {
			Write-Host "Current Subscription: $($currentSub.name) ($($currentSub.id))" -ForegroundColor Gray
			$switch = Read-Host 'Change subscription? (y/N)'
			if ($switch -match '^[Yy]$') {
				az account list --query "[].{Name:name,Id:id,IsDefault:isDefault}" -o table
				$newSub = Read-Host 'Enter subscription id or name'
				if ($newSub) {
					az account set --subscription $newSub 2>$null
					$currentSub = az account show --query "{name:name,id:id}" -o json 2>$null | ConvertFrom-Json
					if ($currentSub) { Write-Host "Switched to: $($currentSub.name)" -ForegroundColor Green }
				}
			}
		}
	} catch { Write-Host 'Subscription check skipped (az CLI not ready).' -ForegroundColor Yellow }

	$ResourceGroup = Get-DefaultValue 'Resource Group' $ResourceGroup
	$existingAppCandidates = @(Get-ExistingAppCandidates -ResourceGroupName $ResourceGroup)
	if ($existingAppCandidates.Count -gt 0) {
		Write-Host "Existing Container Apps detected in '$ResourceGroup':" -ForegroundColor Gray
		$existingAppCandidates | ForEach-Object { Write-Host "  • $_" -ForegroundColor Gray }
		if ($existingAppCandidates.Count -eq 1) {
			$AppName = $existingAppCandidates[0]
		} elseif ($AppName -like 'scimtool-app-*') {
			$AppName = $existingAppCandidates[0]
		}
	}
	$AppName       = Get-DefaultValue 'App Name'       $AppName
	$Location      = Get-DefaultValue 'Location'       $Location
	# Image Tag prompt removed: always using $ImageTag (default 'latest')
	$secretInput = Read-Host 'SCIM Shared Secret (leave blank to keep generated)'
	if (-not [string]::IsNullOrWhiteSpace($secretInput)) { $ScimSecret = $secretInput }
	# Persistent storage now always enabled via blob snapshots (no user choice)
	$persistentEnabled = $true
}

Write-Host "CONFIG:" -ForegroundColor Cyan
Write-Host "  ResourceGroup : $ResourceGroup" -ForegroundColor White
Write-Host "  AppName       : $AppName" -ForegroundColor White
Write-Host "  Location      : $Location" -ForegroundColor White
Write-Host "  ImageTag      : $ImageTag" -ForegroundColor White
Write-Host "  Persistence   : Blob snapshots (always on)" -ForegroundColor White
Write-Host "  Secret        : $ScimSecret" -ForegroundColor Yellow

<#
Stage a temporary directory structure so the deployment script's relative
references to ../infra/*.bicep resolve even when fetched remotely.
#>
$tempRoot = Join-Path $env:TEMP ("scimtool-" + ([guid]::NewGuid().ToString('N')))
$scriptsDir = Join-Path $tempRoot 'scripts'
$infraDir   = Join-Path $tempRoot 'infra'
New-Item -ItemType Directory -Path $scriptsDir -Force | Out-Null
New-Item -ItemType Directory -Path $infraDir -Force   | Out-Null

$rawBase = 'https://raw.githubusercontent.com/kayasax/SCIMTool/master'
$files = @(
    @{ url = "$rawBase/scripts/deploy-azure.ps1"; path = Join-Path $scriptsDir 'deploy-azure.ps1' },
	@{ url = "$rawBase/infra/networking.bicep"; path = Join-Path $infraDir   'networking.bicep' },
    @{ url = "$rawBase/infra/blob-storage.bicep"; path = Join-Path $infraDir   'blob-storage.bicep' },
    @{ url = "$rawBase/infra/containerapp-env.bicep"; path = Join-Path $infraDir 'containerapp-env.bicep' },
    @{ url = "$rawBase/infra/containerapp.bicep";  path = Join-Path $infraDir   'containerapp.bicep' }
)

foreach ($f in $files) {
	try {
		Invoke-WebRequest -Uri $f.url -OutFile $f.path -UseBasicParsing -ErrorAction Stop
	} catch {
		Write-Host "Failed to download $($f.url)" -ForegroundColor Red
		Write-Host $_.Exception.Message -ForegroundColor Red
		Write-Host "Aborting setup (no exit to keep shell open)." -ForegroundColor Yellow
		return
	}
}

$deployScript = Join-Path $scriptsDir 'deploy-azure.ps1'

# Azure CLI check
if (-not (Get-Command az -ErrorAction SilentlyContinue)) { Write-Host 'Azure CLI not installed. Install first: https://learn.microsoft.com/cli/azure/install-azure-cli' -ForegroundColor Red; Write-Host 'Setup stopped (shell preserved).' -ForegroundColor Yellow; return }
try { az account show -o none 2>$null } catch { Write-Host 'Not logged in. Run: az login then re-run the one-liner.' -ForegroundColor Red; Write-Host 'Setup stopped (shell preserved).' -ForegroundColor Yellow; return }

Write-Host 'Starting deployment...' -ForegroundColor Cyan
# Prefer pwsh if available, otherwise fall back to current powershell
if (Get-Command pwsh -ErrorAction SilentlyContinue) {
    & pwsh -NoLogo -NoProfile -File $deployScript -ResourceGroup $ResourceGroup -AppName $AppName -Location $Location -ScimSecret $ScimSecret -ImageTag $ImageTag -EnablePersistentStorage:$true
} else {
    & powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File $deployScript -ResourceGroup $ResourceGroup -AppName $AppName -Location $Location -ScimSecret $ScimSecret -ImageTag $ImageTag -EnablePersistentStorage:$true
}
if ($LASTEXITCODE -ne 0) { Write-Host "Deployment failed (code $LASTEXITCODE). Shell left open for inspection." -ForegroundColor Red; return }

# Try to retrieve FQDN (poll up to 90s) and echo final secret so user doesn't scroll
$fqdn = $null; $attempts = 0; $maxAttempts = 18 # 18 * 5s = 90s
while (-not $fqdn -and $attempts -lt $maxAttempts) {
	try {
		$fqdn = az containerapp show --name $AppName --resource-group $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv 2>$null
		if (-not [string]::IsNullOrWhiteSpace($fqdn)) { break }
	} catch {}
	Start-Sleep -Seconds 5
	$attempts++
}
if ($fqdn) {
	Write-Host "FINAL URL: https://$fqdn" -ForegroundColor Green
	Write-Host "SCIM Endpoint: https://$fqdn/scim/v2" -ForegroundColor Green
} else {
	Write-Host 'FINAL URL: <unavailable - check portal>' -ForegroundColor Yellow
}
Write-Host "Bearer Secret: $ScimSecret" -ForegroundColor Green

