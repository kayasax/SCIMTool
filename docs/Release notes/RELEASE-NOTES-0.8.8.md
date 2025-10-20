# SCIMTool v0.8.8 – Keepalive Noise Reduction

## Highlights
- **Suppress Entra keepalive chatter** – Raw Logs view now auto-hides recurring `userName eq <GUID>` pings, with a per-user toggle and banner telling you what was filtered.
- **Activity feed parity** – The human-readable dashboard shares the same toggle, keeps badge counts honest, and ignores keepalive traffic in the summary cards.
- **Shared detection helper** – Keepalive identification now lives in a single utility used by both backend and frontend so we do not regress when Entra tweaks its polling cadence.

## Upgrade Command
```powershell
iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/update-scimtool-direct.ps1');
Update-SCIMToolDirect -Version v0.8.8 -ResourceGroup <rg> -AppName <app> -NoPrompt
```

## Verification Checklist
- [ ] Run `npm run build` in `api/` and `web/`
- [ ] Confirm Raw Logs toggle hides/reshows keepalive entries
- [ ] Confirm Activity Feed badge count ignores keepalive pings
- [ ] Validate auto-refresh still pulls fresh provisioning events
