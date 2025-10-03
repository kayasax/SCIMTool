# SCIMTool v0.8.0 – Blob Snapshot Persistence & Automated Storage Provisioning

## Highlights
- Replaced Azure Files + CIFS mount model with lightweight blob snapshot persistence (policy-friendly: no public network, no shared key).
- Automatic provisioning of StorageV2 account + private blob container via `blob-storage.bicep` if absent.
- Managed Identity role assignment (Storage Blob Data Contributor) automated in `deploy-azure.ps1`.
- Initial restore on startup if local SQLite DB missing; rolling snapshot retention & pruning (default keep 20).
- Documentation and scripts updated to reference new persistence approach.

## Upgrade Notes
If you previously deployed with Azure Files mounted:
1. Existing historical DB file on the file share is no longer referenced.
2. To migrate, manually export the SQLite file and upload a one-off snapshot blob named with current timestamp before first 0.8.0 start.
3. New deployments are fully self-contained; no share mount required.

## Deployment
Interactive one-liner (unchanged):
```powershell
iex (irm https://raw.githubusercontent.com/kayasax/SCIMTool/master/setup.ps1)
```
Update existing container app:
```powershell
iex (irm https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/update-scimtool-func.ps1); \
  Update-SCIMTool -Version v0.8.0
```

## Validation Checklist
- [x] Storage account auto-created when absent
- [x] Blob container private access
- [x] Managed identity granted Blob Data Contributor
- [x] Snapshot upload interval operating
- [x] Pruning removes oldest beyond retention
- [x] Fresh start restores from latest snapshot

## Image
`ghcr.io/kayasax/scimtool:0.8.0` (latest tag will point here after release tag push)

## Next Steps / Future
- Parameterize snapshot retention & interval in deploy script
- Add manual restore CLI command & migration helper
- Remove deprecated Azure Files scripts & templates

---
Released: 2025-10-03
