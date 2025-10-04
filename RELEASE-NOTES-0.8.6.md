# SCIMTool v0.8.6 – Resilient Persistence & SCIM Guardrails

## Highlights
- **Blob restore bootstrap:** Container entrypoint now hydrates `/tmp/local-data/scim.db` from the latest blob snapshot when Azure Files backup is absent, preventing data loss on cold starts.
- **Duplicate handling groundwork:** Service-layer helpers land alongside schema uniqueness to enforce SCIM user identifiers and prepare for expanded RFC coverage.
- **Version alignment:** API, web UI, documentation, and workflows all reference `v0.8.6`, keeping upgrade helpers and banners in sync.

## Upgrade Notes
- Deployments using blob backups should redeploy to pick up the new entrypoint logic; restart after deployment to verify snapshot hydration.
- Managed identity must retain **Storage Blob Data Reader** access for the container app to restore snapshots successfully.

## Commands
```powershell
iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/update-scimtool-direct.ps1'); \
  Update-SCIMToolDirect -Version v0.8.6 -ResourceGroup <rg> -AppName <app> -NoPrompt
```
