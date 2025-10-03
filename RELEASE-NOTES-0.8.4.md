# SCIMTool v0.8.4 – Enable Blob Snapshot Persistence

## Summary
Adds the `@azure/identity` dependency required for managed identity authentication so blob backup mode actually activates. Improves backup diagnostics by making mode visible in UI (from prior commit) and ensuring snapshots will now upload.

## Changes
- Added dependency: `@azure/identity`
- Version bump to 0.8.4
- (Pre-existing) Backup stats UI will now show blob mode once container updated to this image.

## Upgrade
```
iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/update-scimtool-direct.ps1'); Update-SCIMToolDirect -Version v0.8.4 -ResourceGroup <rg> -AppName <app> -NoPrompt -ShowCurrent
```

## Verification
After deploy, check logs for:
`Blob backup mode enabled → container: scimtool-backups`
Then within 1–5 minutes: `Uploaded blob snapshot: scim-...db`

## Notes
If no snapshot appears, ensure managed identity has `Storage Blob Data Contributor` on the storage account.
