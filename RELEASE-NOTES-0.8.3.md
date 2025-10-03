# SCIMTool v0.8.3 – Structured Membership Change Data

## Summary
This release enhances the group membership activity visibility by:
- Adding structured `addedMembers` / `removedMembers` arrays to activity entries
- Rendering these arrays in the UI (Activity Feed) below the existing details
- Handling case-insensitive SCIM PATCH ops ("Add" / "Remove")

## Changes
### Backend (API)
- `ActivitySummary` interface extended with `addedMembers` and `removedMembers`
- Membership PATCH parsing now produces structured arrays alongside human-readable message
- Case-insensitive handling for PATCH `op` values

### Frontend (Web)
- Activity feed component detects and displays Added / Removed member name lists
- Falls back gracefully if arrays are absent (older logs)

## Upgrade
Use the direct update script (replace RG/App as appropriate):
```
iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/update-scimtool-direct.ps1'); Update-SCIMToolDirect -Version v0.8.3 -ResourceGroup <rg> -AppName <app> -NoPrompt
```

Container image tag:
```
ghcr.io/kayasax/scimtool:0.8.3
```

## Notes
- No schema migrations required.
- Existing activity entries remain compatible; new fields appear only for membership changes parsed after this version is deployed.
- Future Consideration: expose raw diff object for user attribute changes (potential v0.8.4+).

## Verification Checklist
- [x] Version bumped in `api/package.json` & `web/package.json`
- [x] New release notes file created
- [x] README and Session_starter updated with new version
- [x] Structured data visible in UI for new membership events
