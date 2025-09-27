[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Version,

    [string]$TargetBranch = "master",

    [switch]$CreateRelease,

    [string]$ReleaseNotesPath
)

$ErrorActionPreference = "Stop"

function Write-Step($text) {
    Write-Host ""
    Write-Host "=== $text ===" -ForegroundColor Cyan
}

function Assert-NoTag([string]$tagName) {
    $ref = "refs/tags/$tagName"

    $local = git show-ref --tags --verify $ref 2>$null
    if ($local) {
        $summary = git show --stat --oneline $tagName
        throw "Tag $tagName already exists locally:`n$summary"
    }

    $remote = git ls-remote --tags origin $tagName
    if ($remote) {
        throw "Tag $tagName already exists on origin:`n$remote"
    }
}

Write-Step "Validating git status"
git status --short | ForEach-Object {
    throw "Working tree not clean. Commit or stash changes before tagging."
}

$currentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($currentBranch -ne $TargetBranch) {
    throw "Currently on '$currentBranch'. Checkout '$TargetBranch' (or pass -TargetBranch) before tagging."
}

Write-Step "Fetching latest changes"
git fetch origin

Write-Step "Ensuring local $TargetBranch is up to date"
git status -sb | Select-String "\[ahead|\[behind" | ForEach-Object {
    throw "Branch $TargetBranch is not synchronized with origin. Pull or push changes, then retry."
}

$tagName = "v$Version"

Write-Step "Checking for existing tag $tagName"
Assert-NoTag $tagName

Write-Step "Creating and pushing tag $tagName"
git tag -a $tagName -m $tagName
git push origin $tagName

if ($CreateRelease) {
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        throw "GitHub CLI (gh) not found in PATH. Install it or omit -CreateRelease."
    }

    Write-Step "Creating GitHub release for $tagName"
    $title = $tagName
    $notesArg = if ($ReleaseNotesPath) { "--notes-file `"$ReleaseNotesPath`"" } else { "--notes `"$title release`"" }

    $cmd = "gh release create $tagName --title `"$title`" $notesArg"
    Write-Host $cmd -ForegroundColor DarkGray
    Invoke-Expression $cmd
}

Write-Step "All done!"
Write-Host "Tag $tagName published. Next: publish the image and update Azure Container App." -ForegroundColor Green
