# SCIMTool Admin / Author Guide – Upgrade & Release Flow

Internal doc for you (the author) – not end-user facing. This captures the exact, repeatable steps to develop a change, test it, publish a new container image to the public ACR, and surface the upgrade to running environments via the built‑in banner.

---
## TL;DR Fast Path
1. Dev & test locally.
2. Bump `api/package.json` version (e.g. 0.1.0 -> 0.2.0) – keep semver.
3. Commit & push.
4. (Optional but recommended when you start using Releases) Create annotated git tag: `git tag -a v0.2.0 -m "v0.2.0"` then `git push origin v0.2.0`.
5. Build & push image to ACR: `pwsh ./scripts/publish-acr.ps1 -Registry scimtoolpublic -ResourceGroup scimtool-rg -Latest` (adds version + latest).
6. Update Container App: `az containerapp update -n scimtool-prod -g scimtool-rg --image scimtoolpublic.azurecr.io/scimtool:0.2.0`.
7. Open UI → banner should show if newer than running instance.
8. (Optional) Publish a GitHub Release for richer banner notes.

---
## Why Order Matters
- The publish script derives the image tag from `api/package.json` version if `-Tag` not supplied.
- Tagging the repo (vX.Y.Z) after committing the version ensures Git history matches the container version.
- The frontend checks:
  1. `GET /releases/latest` on GitHub. If a Release exists it uses `tag_name`.
  2. If no Releases exist (404) it falls back to the most recent git tag.
- Once you start creating Releases, only the latest Release will drive the banner (fallback tags ignored when Releases exist).

---
## Detailed Flow

### 1. Local Development
Run backend & frontend locally (your existing `setup.ps1` helpers):
```powershell
pwsh .\setup.ps1 -TestLocal   # or your preferred dev script
```
Validate new functionality & log capture.

### 2. Version Bump
Edit `api/package.json`:
```json
  "version": "0.2.0"
```
Keep to semantic versioning: MAJOR (breaking) / MINOR (feature) / PATCH (fix).

Stage & commit:
```powershell
git add api/package.json
git commit -m "chore: bump version to 0.2.0"
git push
```

### 3. (Optional) Tag & Release
If you are **not** using GitHub Releases yet and rely only on tags, this still lets the banner work (fallback path):
```powershell
git tag -a v0.2.0 -m "v0.2.0"
git push origin v0.2.0
```
When ready to leverage richer notes:
1. Go to GitHub → Releases → Draft new release.
2. Tag: `v0.2.0` (create if not existing).
3. Title: `v0.2.0`.
4. Notes: bullet changes.
5. Publish.

### 4. Build & Publish Container Image
Unified (web + api) image is built from repo root `Dockerfile`.

Local build (fast, if Docker installed):
```powershell
pwsh ./scripts/publish-acr.ps1 -Registry scimtoolpublic -ResourceGroup scimtool-rg -Latest
```
Flags:
- `-Latest` also tags `:latest` pointing to the same digest.
- Add `-Tag 0.2.0` to override auto-detected version (rarely needed).
- Add `-EnableAnonymous` only once (stay public).
- Use `-UseRemoteBuild` if you want ACR to perform the build (note: we previously saw remote build issues with unicode output & big context; local is currently more stable).

Resulting references:
```
scimtoolpublic.azurecr.io/scimtool:0.2.0
scimtoolpublic.azurecr.io/scimtool:latest
```

### 5. Deploy to Azure Container App
```powershell
az containerapp update -n scimtool-prod -g scimtool-rg --image scimtoolpublic.azurecr.io/scimtool:0.2.0
```
To always use the moving pointer (still need manual update):
```powershell
az containerapp update -n scimtool-prod -g scimtool-rg --image scimtoolpublic.azurecr.io/scimtool:latest
```

### 6. Verify
Logs:
```powershell
az containerapp logs show -n scimtool-prod -g scimtool-rg --tail 50
```
Version endpoint:
```powershell
Invoke-RestMethod -Headers @{ Authorization = 'Bearer S@g@r2011' } -Uri https://<FQDN>/scim/admin/version
```
Banner should show new version if the running instance version < latest release/tag.

### 7. User Experience - Streamlined Updates
The UI now provides a streamlined update experience:

**Compact Banner**:
- Shows: "New version available: [current] → [latest]"
- **More** button opens modal with release notes
- **Copy Update Command** button provides one-liner command

**Hosted PowerShell Script**:
Users can update with a single command (copied from banner):
```powershell
iex (irm https://scimtoolpublic.azurecr.io/scimtool/update-scimtool.ps1)
```

The hosted script:
- Validates Azure CLI authentication
- Prompts for confirmation before updating
- Normalizes version strings (removes 'v' prefix)
- Updates the Container App with proper error handling
- Shows progress and results

**Alternative**: Direct Azure CLI (still supported):
```powershell
az containerapp update -n scimtool-prod -g scimtool-rg --image scimtoolpublic.azurecr.io/scimtool:0.2.0
```

### 7. Rollback
List revisions:
```powershell
az containerapp revision list -n scimtool-prod -g scimtool-rg --query "[].{rev:name,img:properties.template.containers[0].image,active:active}" -o table
```
Roll back by updating image to the prior version tag:
```powershell
az containerapp update -n scimtool-prod -g scimtool-rg --image scimtoolpublic.azurecr.io/scimtool:0.1.0
```

### 8. Tagging & Releases Strategy
| Scenario | Action |
|----------|--------|
| Quick internal build, no public announcement | Tag only (optional) |
| Public / visible upgrade | Git tag + GitHub Release |
| Hotfix | Increment PATCH (0.2.1) |
| Feature batch | Increment MINOR (0.3.0) |
| Breaking API / contract | Increment MAJOR (1.0.0) |

### 9. Common Pitfalls
| Issue | Cause | Fix |
|-------|-------|-----|
| Banner never updates | No Release and no new tag | Push new git tag or create Release |
| Wrong image version deployed | Forgot to bump package.json | Bump version, rebuild, redeploy |
| Remote ACR build fails | Unicode log + large context | Use local build path |
| 404 from releases API | No Releases exist | Expected; fallback to tags active |
| Anonymous pull fails | Registry not public yet | Run: `az acr update -n scimtoolpublic --anonymous-pull-enabled` |

### 10. Local Smoke Test of Built Image
```powershell
docker run --rm -p 8080:80 scimtoolpublic.azurecr.io/scimtool:0.2.0
# Then: curl http://localhost:8080/scim/admin/version (with header if auth required)
```

### 11. CI/CD (Future Option)
Potential GitHub Actions workflow:
- Trigger on tag push `v*`.
- Install Azure CLI (& login via OIDC to Azure).
- Run `publish-acr.ps1` with `-Registry/-ResourceGroup`.
- Optionally auto update Container App (or open a PR / create a deployment job).

### 12. Security / Hygiene Notes
- Avoid embedding secrets in image; use env vars / Azure secrets.
- SQLite inside image is ephemeral; move to external persistence before multi-instance scaling.
- Consider scanning image (`az acr repository show-manifests` + Defender or Docker Scout) for vulnerabilities.

### 13. Quick Reference Commands
```powershell
# Version bump
git add api/package.json; git commit -m "chore: bump version"; git push

# Tag
git tag -a v0.2.0 -m "v0.2.0"; git push origin v0.2.0

# Build & push
pwsh ./scripts/publish-acr.ps1 -Registry scimtoolpublic -ResourceGroup scimtool-rg -Latest

# Deploy
az containerapp update -n scimtool-prod -g scimtool-rg --image scimtoolpublic.azurecr.io/scimtool:0.2.0

# Verify
az containerapp logs show -n scimtool-prod -g scimtool-rg --tail 50
Invoke-RestMethod -Headers @{ Authorization = 'Bearer S@g@r2011' } -Uri https://<FQDN>/scim/admin/version
```

---
## ASCII Flow
```
 Code edit → Local test → Bump version → Commit → (Tag + Release) → Publish image → Update Container App → Verify logs/version → Banner prompts consumers
```

---
## When to Rebuild
Rebuild any time you change:
- Backend TypeScript
- Frontend React code
- Prisma schema (requires `prisma generate` baked in build stage)
- Dependencies or Node version

---
## Notes
- `publish-acr.ps1` auto-detects version from `api/package.json` – override with `-Tag` only for exceptional cases.
- The Docker build is multi-stage: web → api → runtime. The final image is minimal (production deps only).
- Healthcheck is a simple HTTP GET to `/health` (add route implementation if not already present for accurate status).

---
Feel free to extend this doc when you formalize Releases or introduce CI automation.
