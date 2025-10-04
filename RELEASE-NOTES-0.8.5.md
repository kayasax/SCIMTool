````markdown
# SCIMTool v0.8.5 – Sync Versioned Artifacts

## Summary
Aligns every surfaced version string (API, web UI, scripts, and docs) to `0.8.5` so the upgrade banner, PowerShell helpers, and README examples stay in lockstep with the latest container image.

## Changes
- Bumped `scimtool-api` and `scimtool-web` packages to `0.8.5`.
- Updated UI footer fallback and session memory status to the new release.
- Refreshed documentation and workflow references (README, GHCR publish workflow) with the `v0.8.5` tag.
- Regenerated Vite build artifacts so `dist/` references the latest bundle hash.

## Upgrade
```
iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/update-scimtool-direct.ps1'); Update-SCIMToolDirect -Version v0.8.5 -ResourceGroup <rg> -AppName <app> -NoPrompt -ShowCurrent
```

## Verification
- Web UI footer displays `v0.8.5` when the `/scim/admin/version` endpoint is unreachable.
- Running `Update-SCIMToolDirect -ShowCurrent` returns the new version metadata.
````