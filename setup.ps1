$ErrorActionPreference = 'Stop'

# Auto values (no prompts to avoid hanging under iex)
$Location = 'eastus'
$ImageTag = 'latest'
$persistentEnabled = $true

function New-ScimSecret {
	$b = New-Object byte[] 32
	[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
	$s = [Convert]::ToBase64String($b)
	$s = $s -replace '\+','-' -replace '/','_' -replace '='''
	if ($s.Length -gt 48) { return $s.Substring(0,48) } else { return $s }
}
function New-Suffix { (Get-Random -Minimum 1000 -Maximum 9999) }

$ResourceGroup = "scimtool-rg-$(New-Suffix)"
$AppName       = "scimtool-app-$(New-Suffix)"
$ScimSecret    = New-ScimSecret

Write-Host "AUTO CONFIG:" -ForegroundColor Cyan
Write-Host "  ResourceGroup : $ResourceGroup" -ForegroundColor White
Write-Host "  AppName       : $AppName" -ForegroundColor White
Write-Host "  Location      : $Location" -ForegroundColor White
Write-Host "  ImageTag      : $ImageTag" -ForegroundColor White
Write-Host "  Persistent    : $persistentEnabled" -ForegroundColor White
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
	@{ url = "$rawBase/infra/storage.bicep";       path = Join-Path $infraDir   'storage.bicep' },
	@{ url = "$rawBase/infra/containerapp-env.bicep"; path = Join-Path $infraDir 'containerapp-env.bicep' },
	@{ url = "$rawBase/infra/containerapp.bicep";  path = Join-Path $infraDir   'containerapp.bicep' }
)

foreach ($f in $files) {
	try {
		Invoke-WebRequest -Uri $f.url -OutFile $f.path -UseBasicParsing -ErrorAction Stop
	} catch {
		Write-Host "Failed to download $($f.url)" -ForegroundColor Red
		Write-Host $_.Exception.Message -ForegroundColor Red
		exit 1
	}
}

$deployScript = Join-Path $scriptsDir 'deploy-azure.ps1'

# Azure CLI check
if (-not (Get-Command az -ErrorAction SilentlyContinue)) { Write-Host 'Azure CLI not installed. Install first: https://learn.microsoft.com/cli/azure/install-azure-cli' -ForegroundColor Red; exit 1 }
try { az account show -o none 2>$null } catch { Write-Host 'Not logged in. Run: az login  then re-run the one-liner.' -ForegroundColor Red; exit 1 }

Write-Host 'Starting deployment...' -ForegroundColor Cyan
& pwsh -NoLogo -NoProfile -File $deployScript -ResourceGroup $ResourceGroup -AppName $AppName -Location $Location -ScimSecret $ScimSecret -ImageTag $ImageTag -EnablePersistentStorage:$persistentEnabled
if ($LASTEXITCODE -ne 0) { Write-Host "Deployment failed (exit $LASTEXITCODE)" -ForegroundColor Red; exit $LASTEXITCODE }

Write-Host 'Deployment finished. Retrieve the FQDN above to form:' -ForegroundColor Green
Write-Host '  SCIM Endpoint: https://<fqdn>/scim/v2' -ForegroundColor Green
Write-Host "  Secret: $ScimSecret" -ForegroundColor Green