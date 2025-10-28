# SCIMTool v0.8.13 – Direct Update EnvVars Fix

## Highlights
- Updates the direct-update PowerShell script to use `az containerapp update --set-env-vars`, fixing the invalid environment-variable error when applying JWT/OAuth secret bindings.
- Keeps automatic generation of `jwt-secret` and `oauth-client-secret` with secure output for operators to store.
- Documentation and tooling refreshed to point customers at the corrected release.

## Upgrade Command
```powershell
iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/update-scimtool-direct.ps1'); Update-SCIMToolDirect -Version v0.8.13 -ResourceGroup <rg> -AppName <app> -NoPrompt
```

## Post-Upgrade Checklist
- [ ] GHCR publish workflow succeeds for tag `v0.8.13`
- [ ] Production deployment defines `SCIM_SHARED_SECRET`, `JWT_SECRET`, and `OAUTH_CLIENT_SECRET`
- [ ] Confirm direct-update command prints generated secrets (store them securely before closing the session)
