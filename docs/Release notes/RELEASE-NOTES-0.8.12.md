# SCIMTool v0.8.12 – Direct Update Patch

## Highlights
- Fixes the direct-update PowerShell script so Container App environment bindings are updated correctly using `properties.template.containers[0].env`, avoiding the invalid environment-variable error seen in v0.8.11.
- Keeps automatic generation of `jwt-secret` and `oauth-client-secret`, printing values once so operators can store them securely.
- Documentation and version metadata updated to point customers to the patched script.

## Upgrade Command
```powershell
iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/update-scimtool-direct.ps1'); Update-SCIMToolDirect -Version v0.8.12 -ResourceGroup <rg> -AppName <app> -NoPrompt
```

## Post-Upgrade Checklist
- [ ] GHCR publish workflow succeeds for tag `v0.8.12`
- [ ] Production deployment defines `SCIM_SHARED_SECRET`, `JWT_SECRET`, and `OAUTH_CLIENT_SECRET`
- [ ] Confirm direct-update command prints generated secrets (store them securely before closing the session)
