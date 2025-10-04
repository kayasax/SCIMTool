# SCIMTool v0.8.7 – Manual Provisioning Superpowers

## Highlights
- **Manual provisioning console:** New admin tab lets you craft SCIM Users and Groups on demand, including duplicate-ready identifiers and membership payloads, without reaching for Postman.
- **Admin API helpers:** Fresh `/scim/admin/users/manual` and `/scim/admin/groups/manual` endpoints convert console submissions into full SCIM resources while honoring uniqueness guardrails.
- **Version sync:** API, web UI fallback text, docs, and workflows now reference `v0.8.7` so upgrade guidance stays in lockstep with the release.

## Upgrade Notes
- Redeploy the container to pick up the new admin endpoints and UI bundle; restart afterward to confirm blob snapshot hydration still succeeds.
- Manual provisioning requires the SCIM bearer token—ensure you’ve supplied a valid token in the UI before creating test resources.

## Commands
```powershell
iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/update-scimtool-direct.ps1'); \
  Update-SCIMToolDirect -Version v0.8.7 -ResourceGroup <rg> -AppName <app> -NoPrompt
```
