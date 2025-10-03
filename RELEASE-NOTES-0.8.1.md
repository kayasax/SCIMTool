# SCIMTool v0.8.1 – Activity Feed Fix & Storage Provisioning Reliability

## Changes
- Fix: Activity feed query broadened to include versioned SCIM paths (`/scim/v2/Users`, `/scim/v2/Groups`).
- Fix: Replaced Bicep deployment for blob storage with direct `az storage account create` + provisioning polling to eliminate race (ParentResourceNotFound).
- Fix: Storage account name sanitization & deterministic fallback generation.
- UX: Added bootstrap loader (`bootstrap.ps1`) with cache-busting and commit pin support; README now promotes it.
- Reliability: Removed hard `exit` calls from setup/deploy scripts to keep shell open on errors.

## Upgrade
If you already deployed 0.8.0:
```powershell
iex (irm https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/update-scimtool-func.ps1); Update-SCIMTool -Version v0.8.1
```
No data migration needed; only container image update.

## Image
`ghcr.io/kayasax/scimtool:0.8.1`

## Verifications
- [x] Activity endpoint returns entries for /scim/v2 paths
- [x] Storage account created & container present after first deploy
- [x] No forced shell termination on failure paths
- [x] Bootstrap one-liner fetches fresh setup script

## Next (Planned)
- Parameterize snapshot retention & interval
- Add manual restore command
- Remove deprecated Azure Files template

Released: 2025-10-03
