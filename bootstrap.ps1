<#!
SCIMTool bootstrap loader to fetch the latest setup.ps1 while aggressively bypassing CDN / proxy caches.
Usage examples:
  # Always fetch latest master with cache-bust
  iex (iwr https://raw.githubusercontent.com/kayasax/SCIMTool/master/bootstrap.ps1).Content

  # Or explicitly call with -Branch and -NoCache
  iwr https://raw.githubusercontent.com/kayasax/SCIMTool/master/bootstrap.ps1 | iex; Invoke-SCIMToolBootstrap -NoCache

Deterministic version (commit pin):
  $sha = '<<commit-sha>>'
  iwr https://raw.githubusercontent.com/kayasax/SCIMTool/$sha/setup.ps1 | iex
!#>
param(
  [string]$Branch = 'master',
  [switch]$NoCache,
  [string]$CommitSha,
  [switch]$VerboseHeaders
)

function Invoke-SCIMToolBootstrap {
  param([string]$Branch='master',[switch]$NoCache,[string]$CommitSha,[switch]$VerboseHeaders)
  if ($CommitSha) { $target = $CommitSha } else { $target = $Branch }
  $cb = if ($NoCache) { "?cb=" + [guid]::NewGuid().ToString('N') } else { '' }
  $url = "https://raw.githubusercontent.com/kayasax/SCIMTool/$target/setup.ps1$cb"
  Write-Host "[Bootstrap] Fetching: $url" -ForegroundColor Cyan
  $headers = @{ 'Pragma'='no-cache'; 'Cache-Control'='no-cache'; 'User-Agent'='SCIMToolBootstrap/1.0' }
  try {
    $resp = Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing -ErrorAction Stop
    if ($VerboseHeaders) {
      Write-Host "[Bootstrap] Response Headers:" -ForegroundColor Gray
      $resp.Headers.GetEnumerator() | ForEach-Object { Write-Host ('  ' + $_.Name + ': ' + $_.Value) -ForegroundColor DarkGray }
    }
    if (-not $resp.Content) { Write-Host '[Bootstrap] Empty response content.' -ForegroundColor Red; return }
    Write-Host '[Bootstrap] Executing setup script...' -ForegroundColor Green
    Invoke-Expression $resp.Content
  } catch {
    Write-Host "[Bootstrap] Download failed: $($_.Exception.Message)" -ForegroundColor Red
  }
}

# Auto-run if this file was invoked directly (common iex pattern)
if ($MyInvocation.InvocationName -ne '.') {
  Invoke-SCIMToolBootstrap -Branch $Branch -NoCache:$NoCache -CommitSha $CommitSha -VerboseHeaders:$VerboseHeaders
}
