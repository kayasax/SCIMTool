# SCIMTool v0.8.2 – Direct Update Flow & Metadata Injection

## Highlights
| Area | Change |
|------|--------|
| Update UX | Added `update-scimtool-direct.ps1` with explicit params (no discovery required). |
| Web UI | "Copy Update Command" now emits a fully parameterized one‑liner using new env metadata. |
| Infra | `containerapp.bicep` now injects `SCIM_RG`, `SCIM_APP`, `SCIM_REGISTRY`, `SCIM_CURRENT_IMAGE` env vars. |
| Scripts | Legacy discovery script retained for backwards compatibility; simplified direct path recommended. |

## One‑Liner (Direct)
```powershell
iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/update-scimtool-direct.ps1'); Update-SCIMToolDirect -Version v0.8.2 -ResourceGroup <rg> -AppName <app> -NoPrompt -ShowCurrent
```

## Container Image
`ghcr.io/kayasax/scimtool:0.8.2`

## Upgrade Notes
* Redeploy once to populate new metadata env vars.
* UI will automatically switch to direct update command when both RG and App metadata are present.
* Fallback continues to work via legacy function script if metadata absent.

## Changelog
- Added direct update script without discovery
- Added env metadata to container app
- Wired UI copy button to new script
- Updated documentation and session memory

---
Released: 2025-10-03