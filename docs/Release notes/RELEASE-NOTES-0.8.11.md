# SCIMTool v0.8.11 – Direct Update Secret Automation

## Highlights
- PowerShell direct-update script now provisions `jwt-secret` and `oauth-client-secret` automatically when missing, ensuring upgrades succeed without manual Container Apps edits.
- Script restarts Container App revisions when only secrets change so new credentials take effect immediately.
- Documentation and version metadata refreshed to guide customers toward v0.8.11.

## Upgrade Command
```powershell
iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/update-scimtool-direct.ps1'); Update-SCIMToolDirect -Version v0.8.11 -ResourceGroup <rg> -AppName <app> -NoPrompt
```

## Post-Upgrade Checklist
- [ ] GHCR publish workflow succeeds for tag `v0.8.11`
- [ ] Production deployment defines `SCIM_SHARED_SECRET`, `JWT_SECRET`, and `OAUTH_CLIENT_SECRET`
- [ ] Confirm direct-update command prints generated secrets (store them securely before closing the session)
