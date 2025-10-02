# SCIMTool v0.7.6 - SCIM v2 Path Compatibility & Deployment UX Improvements

**Release Date:** October 2, 2025  
**Type:** Minor Feature / Compatibility  
**Upgrade Priority:** MEDIUM (Needed if you rely on `/scim/v2` paths or the new dev secret behavior)

---

## ✅ Summary
This release focuses on aligning the runtime with the SCIM 2.0 expected base path (`/scim/v2`) surfaced by the setup script, improving first‑run experience, and smoothing post‑deployment discovery.

---

## ✨ Key Changes
| Area | Change | Impact |
|------|--------|--------|
| SCIM Routing | Added transparent rewrite so requests to `/scim/v2/*` are served by existing controllers mounted at `/scim/*` | Entra / any SCIM client using standard base path now works immediately |
| Dev Secret Handling | Automatic secure ephemeral `SCIM_SHARED_SECRET` generation in non‑production when unset | Removes startup friction; still fails fast in `NODE_ENV=production` if secret missing |
| Setup Script | Added FQDN polling (up to 90s) to reduce `<unavailable>` final URL cases | More reliable final output for provisioning |
| Deployment Script | Version marker in banner (`deploy-azure.ps1 v1.1`) | Easier troubleshooting across environments |
| Auth Guard | Removed legacy hardcoded default secret fallback | Security hardening |

---

## 🔄 Backward Compatibility
- Existing `/scim/*` endpoints continue to function unchanged.
- New `/scim/v2/*` path now works (rewrite). Future release may flip primary prefix to `scim/v2` and optionally redirect the legacy path.
- No database schema changes.

---

## 🚀 Upgrade Instructions
If you already pull `:latest` you only need to push / deploy the new image revision containing this tag.

**Update Container App to 0.7.6 (example):**
```powershell
az containerapp update `
  --name <your-app> `
  --resource-group <your-rg> `
  --image ghcr.io/kayasax/scimtool:0.7.6
```

**Or via existing deployment script (ensuring ImageTag override is respected if added):**
```powershell
# If/once script supports custom tag param
dotnet # (placeholder if .ps1 updated later)
```
(At the moment the setup script pins `latest`; if you want strict version pinning you can temporarily retag 0.7.6 as latest.)

---

## 🔐 Security / Operational Notes
- Production deployments MUST provide `SCIM_SHARED_SECRET` (container app secret). Missing secret now results in 401 instead of silent fallback.
- Ephemeral dev secret is logged once at startup (console) when auto-generated.

---

## 🧪 Verification Checklist
| Step | Command | Expected |
|------|---------|----------|
| Service Provider Config (new path) | `curl -H "Authorization: Bearer <secret>" https://<fqdn>/scim/v2/ServiceProviderConfig` | 200 + JSON with schemas |
| Legacy path still works | `curl -H "Authorization: Bearer <secret>" https://<fqdn>/scim/ServiceProviderConfig` | 200 |
| Users list | `curl -H "Authorization: Bearer <secret>" https://<fqdn>/scim/v2/Users` | 200 list response |
| Missing secret in prod | Remove secret & restart | 401 SCIM error |

---

## 🗺 Roadmap Hints (Not Included)
- Native prefix switch to `/scim/v2` + redirect middleware
- Optional teardown & secret rotation scripts
- CI build workflow for automatic image publish

---

## 🧾 Changelog
### Added
- `/scim/v2` compatibility rewrite
- FQDN polling in `setup.ps1`
- Deployment script version banner

### Changed
- Auth guard: strict handling of production secret absence
- Dev mode: auto secret generation

### Removed
- Legacy fallback secret value

---

## 📦 Image
`ghcr.io/kayasax/scimtool:0.7.6`

---

## 🆘 Support
Open issues: https://github.com/kayasax/SCIMTool/issues

---

**Upgrade Priority:** MEDIUM
