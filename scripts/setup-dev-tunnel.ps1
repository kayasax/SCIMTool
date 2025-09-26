[CmdletBinding()]
param(
  [string]$TunnelName = "scimtool",
  [int]$Port = 3000,
  [switch]$AllowAnonymous,
  [switch]$SkipInstall,
  [switch]$Https,
  [switch]$NoHost,
  [switch]$PrintEntra,
  [switch]$Json
)

$ErrorActionPreference = 'Stop'

function Write-Info($m){ Write-Host $m -ForegroundColor Cyan }
function Write-Warn($m){ Write-Host $m -ForegroundColor Yellow }
function Write-Err($m){ Write-Host $m -ForegroundColor Red }

Write-Info "==> Azure Dev Tunnel bootstrap"

if (-not $SkipInstall) {
  if (-not (Get-Command devtunnel -ErrorAction SilentlyContinue)) {
    Write-Warn "'devtunnel' CLI not found. Attempting winget install (only supported automated path)."
    if (Get-Command winget -ErrorAction SilentlyContinue) {
      $candidateIds = @('Microsoft.DevTunnel','Microsoft.DevTunnels')
      $success = $false
      foreach($id in $candidateIds){
        try {
          Write-Info " winget install $id ..."
          winget install -e --id $id -h --accept-package-agreements --accept-source-agreements 2>$null | Out-Null
          if (Get-Command devtunnel -ErrorAction SilentlyContinue){ $success = $true; break }
        } catch { }
      }
      if (-not $success) {
        Write-Err "winget could not locate a Dev Tunnel CLI package on this system."
        Write-Warn "Options: (1) Install Visual Studio 2022 (recent versions include Dev Tunnels), (2) Use an alternative tunnel like ngrok or cloudflared, (3) Manually follow docs: https://learn.microsoft.com/azure/developer/dev-tunnels/."; exit 1
      }
    } else {
      Write-Err "winget not available. Cannot auto-install devtunnel. Use another tunnel (ngrok/cloudflared) or install via Visual Studio."; exit 1
    }
  } else { Write-Info "'devtunnel' already installed" }
}

if (-not (Get-Command devtunnel -ErrorAction SilentlyContinue)) { Write-Err "devtunnel still not available. Aborting."; exit 1 }

# Ensure user is logged in (non-interactive detection is limited)
try {
  $user = devtunnel user show 2>$null | Select-String -Pattern "Principal" -SimpleMatch
  if (-not $user) {
    Write-Warn "You appear to be logged out. Launching login..."
    devtunnel user login
  }
} catch {
  Write-Warn "Login check failed; attempting sign-in."
  devtunnel user login
}

<#
  Tunnel creation / discovery
#>
$tunnelList = devtunnel list --output json 2>$null | ConvertFrom-Json -ErrorAction SilentlyContinue
$existing = $null
if ($TunnelName -and $tunnelList) { $existing = $tunnelList | Where-Object { $_.name -eq $TunnelName } | Select-Object -First 1 }

if (-not $existing) {
  $anon = $AllowAnonymous.IsPresent ? "--allow-anonymous" : ""
  if ($TunnelName) {
    Write-Info "Creating tunnel with requested name '$TunnelName'..."
    try { devtunnel create $TunnelName $anon | Out-Null }
    catch {
      $msg = $_.Exception.Message
      if ($msg -match 'allow custom tunnel names feature is disabled') {
        Write-Warn "Custom tunnel names not permitted; creating unnamed tunnel instead.";
        try { devtunnel create $anon | Out-Null; $TunnelName = '' }
        catch { Write-Err "Failed unnamed tunnel create: $($_.Exception.Message)"; exit 1 }
      } else { Write-Err "Tunnel create failed: $msg"; exit 1 }
    }
  } else {
    Write-Info "Creating unnamed tunnel..."
    try { devtunnel create $anon | Out-Null } catch { Write-Err "Tunnel create failed: $($_.Exception.Message)"; exit 1 }
  }
  $tunnelList = devtunnel list --output json 2>$null | ConvertFrom-Json -ErrorAction SilentlyContinue
  if ($TunnelName) { $existing = $tunnelList | Where-Object { $_.name -eq $TunnelName } | Select-Object -First 1 }
}

if (-not $existing) {
  # Fall back: pick newest (by created or lastUpdate property if present)
  $existing = ($tunnelList | Sort-Object -Property created -Descending | Select-Object -First 1)
}

if (-not $existing) { Write-Err "Could not resolve tunnel object after creation."; exit 1 }

$tunnelId = $existing.tunnelId
Write-Info "Using tunnel id: $tunnelId"

# Create port mapping (idempotent)
Write-Info "Configuring port $Port (HTTPS=$($Https.IsPresent))"
$proto = $Https.IsPresent ? "https" : "http"
try {
  if ($TunnelName) { devtunnel port create $TunnelName --port $Port --protocol $proto | Out-Null }
  else { devtunnel port create --tunnel-id $tunnelId --port $Port --protocol $proto | Out-Null }
} catch { Write-Warn "Port create may already exist: $($_.Exception.Message)" }

# Predict possible access URLs (patterns observed in CLI output)
$region = $existing.clusterId
$shortId = $tunnelId.Substring(0,8)
$urlWithPortHost = "https://$shortId.$region.devtunnels.ms:$Port"
$urlHyphenHost = "https://$shortId-$Port.$region.devtunnels.ms"
$entraUrls = @("$urlWithPortHost/scim", "$urlHyphenHost/scim")

if ($PrintEntra) {
  Write-Host "--- Entra Candidate URLs ---" -ForegroundColor Green
  $entraUrls | ForEach-Object { Write-Host $_ -ForegroundColor Magenta }
}

if ($Json) {
  $obj = [pscustomobject]@{
    tunnelId = $tunnelId
    region = $region
    port = $Port
    urls = @($urlWithPortHost, $urlHyphenHost)
    entraTenantUrls = $entraUrls
    timestamp = (Get-Date).ToString('o')
  }
  $obj | ConvertTo-Json -Depth 5 | Write-Output
  if ($NoHost) { exit 0 }
}

if ($NoHost) {
  Write-Info "NoHost specified: skipping 'devtunnel host'."
  Write-Host "Run manually when ready:" -ForegroundColor Cyan
  if ($TunnelName) { Write-Host " devtunnel host $TunnelName" } else { Write-Host " devtunnel host --tunnel-id $tunnelId" }
  exit 0
}

Write-Info "Starting tunnel host (Ctrl+C to stop)..."
if ($TunnelName) { devtunnel host $TunnelName | ForEach-Object { $_ } }
else { devtunnel host --tunnel-id $tunnelId | ForEach-Object { $_ } }

# After host starts, user will see the public URL in the output.
