<#!
.SYNOPSIS
  Build and publish the unified SCIMTool (API + Web) container image to Azure Container Registry with optional anonymous pull enablement.

.PARAMETER Registry
  Name of the ACR (no FQDN, just the resource name).

.PARAMETER ResourceGroup
  Azure resource group containing (or to contain) the registry.

.PARAMETER Tag
  Image tag to push (default: value from api/package.json version or 'dev').

.PARAMETER Latest
  Additionally tag and push :latest.

.PARAMETER EnableAnonymous
  Ensure anonymous pull is enabled on the registry.

.PARAMETER UseRemoteBuild
  Use 'az acr build' instead of local docker (no local Docker engine needed).

Requires: Azure CLI logged in. For local docker mode, Docker daemon must be running.
#>
param(
  [Parameter(Mandatory=$true)][string]$Registry,
  [Parameter(Mandatory=$true)][string]$ResourceGroup,
  [string]$Tag,
  [switch]$Latest,
  [switch]$EnableAnonymous,
  [switch]$UseRemoteBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info($m){ Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Write-Warn($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Write-Err($m){ Write-Host "[ERR ] $m" -ForegroundColor Red }

if (-not (Get-Command az -ErrorAction SilentlyContinue)) { Write-Err 'Azure CLI (az) not found.'; exit 1 }

# Resolve version/tag
if (-not $Tag) {
  $apiPkgPath = Join-Path $PSScriptRoot '..' 'api' 'package.json'
  if (Test-Path $apiPkgPath) {
    $pkg = Get-Content $apiPkgPath | ConvertFrom-Json
    $Tag = $pkg.version
  }
  if (-not $Tag) { $Tag = 'dev' }
}

$fullName = "$Registry.azurecr.io/scimtool:$Tag"
Write-Info "Image will be pushed as $fullName"

# Ensure resource group exists
Write-Info "Ensuring resource group '$ResourceGroup' exists"
az group show -n $ResourceGroup 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  az group create -n $ResourceGroup -l eastus | Out-Null
  Write-Info 'Resource group created.'
}

# Ensure registry exists (Standard for anonymous pull)
Write-Info "Ensuring registry '$Registry' exists"
az acr show -n $Registry 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Info 'Creating registry (Standard)'
  az acr create -n $Registry -g $ResourceGroup --sku Standard --admin-enabled false | Out-Null
}

if ($EnableAnonymous) {
  Write-Info 'Enabling anonymous pull (if not already)'
  az acr update -n $Registry --anonymous-pull-enabled | Out-Null
}

if ($UseRemoteBuild) {
  Write-Info 'Performing remote ACR build'
  az acr build --registry $Registry --image scimtool:$Tag .
  if ($LASTEXITCODE -ne 0) {
    Write-Err 'Remote build failed. Rerun without -UseRemoteBuild to attempt local build.'
    exit 2
  }
  if ($Latest) {
    Write-Info 'Creating additional :latest tag via ACR import'
    az acr import --name $Registry --source "$Registry.azurecr.io/scimtool:$Tag" --image scimtool:latest --force | Out-Null
  }
} else {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Write-Err 'Docker CLI not found and --UseRemoteBuild not specified.'; exit 1 }
  Write-Info 'Logging in to registry'
  az acr login --name $Registry | Out-Null
  Write-Info 'Building local multi-stage image'
  docker build -t $fullName .
  Write-Info 'Pushing version tag'
  docker push $fullName
  if ($Latest) {
    $latestRef = "$Registry.azurecr.io/scimtool:latest"
    Write-Info 'Tagging and pushing :latest'
    docker tag $fullName $latestRef
    docker push $latestRef
  }
}

Write-Info 'Listing tags (recent)'
az acr repository show-tags -n $Registry --repository scimtool --orderby time_desc --top 10

if ($EnableAnonymous) {
  $anon = az acr show -n $Registry --query anonymousPullEnabled -o tsv
  Write-Info "Anonymous pull enabled: $anon"
  Write-Info "Anonymous test pull (logout first): docker logout $Registry.azurecr.io; docker pull $Registry.azurecr.io/scimtool:$Tag"
}

Write-Host "\nSuccess. Image reference: $fullName" -ForegroundColor Green
if ($Latest) { Write-Host "Also tagged: $Registry.azurecr.io/scimtool:latest" -ForegroundColor Green }