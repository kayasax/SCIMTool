# ✨ SCIMTool
**Provisioning visibility & SCIM 2.0 monitor for Microsoft Entra — deploy in minutes, understand events instantly.**

[![Latest Release](https://img.shields.io/github/v/release/kayasax/SCIMTool?style=flat-square&color=2ea043)](https://github.com/kayasax/SCIMTool/releases/latest) [![SCIM 2.0](https://img.shields.io/badge/SCIM-2.0-00a1f1?style=flat-square)](https://scim.cloud/) [![Microsoft Entra](https://img.shields.io/badge/Microsoft-Entra_ID-ff6b35?style=flat-square)](https://entra.microsoft.com/)

Stop scrolling walls of JSON. SCIMTool turns raw provisioning calls into clean, human messages plus a fast searchable UI (users, groups, diffs, backup state).
<img width="1224" height="995" alt="image" src="https://github.com/user-attachments/assets/2ec5a4f2-1e23-4440-a317-6562e0961a5a" />

---

## ✨ Key Features (Essentials)
| | |
|---|---|
| 🧠 Human Event Translation | “Alice added to Finance Group” instead of opaque PATCH JSON |
| 🔍 Searchable Activity Feed | Filter & inspect SCIM requests and responses quickly |
| 👥 User & Group Browser | Memberships + derived identifiers |
| 🔔 Visual Change Alerts | Favicon + tab badge for new provisioning activity |
| 💾 Blob Snapshot Persistence | Fast local SQLite + periodic blob snapshots (no file share mount) |
| 🔐 Shared Secret Auth | Simple secure SCIM integration for Entra |
| 🌗 Dark / Light Theme | Clean responsive UI |
| 🚀 Scale to Zero | Low idle cost on Azure Container Apps |

---

## 🚀 60‑Second Cloud Deploy (Cache‑Safe One‑Liner)
Run in PowerShell (Windows PowerShell 5.1 or PowerShell 7+; macOS/Linux require PowerShell 7+). Prompts for RG / App / Region / Secret (or auto‑generate), then provisions Azure Container Apps + blob snapshot persistence.

Uses a bootstrap loader that forces a fresh fetch (avoids CDN caching of `setup.ps1`).

```powershell
iex (iwr https://raw.githubusercontent.com/kayasax/SCIMTool/master/bootstrap.ps1).Content
```

Force cache-bust explicitly (adds a GUID query + no-cache headers):
```powershell
iex (iwr https://raw.githubusercontent.com/kayasax/SCIMTool/master/bootstrap.ps1?cb=$(Get-Random)).Content
```

Pin to an exact commit (deterministic repeatable install):
```powershell
$sha = 'v0.8.3'  # or a full commit SHA
iwr https://raw.githubusercontent.com/kayasax/SCIMTool/$sha/setup.ps1 | iex
```

Outputs:
* Public URL (web UI root)
* SCIM Base URL: https://fqdn/scim/v2
* Generated / provided shared secret (reprinted at end)

Cost: scale‑to‑zero + storage (low idle spend).

## 🔧 Configure Microsoft Entra Provisioning (Right After Deploy)
1. Entra Portal → Enterprise Applications → Create new Enterprise App (non-gallery)
2. Provisioning → Set Provisioning Mode: Automatic
3. Tenant URL: `https://<your-app>.azurecontainerapps.io/scim/v2`
4. Secret Token: (printed by setup script)
5. Test Connection → expect success
6. Turn provisioning ON & assign users / groups

Open the root URL (same host, no /scim) to watch events in near real-time.

---

## 🔄 Updating to a New Version
Use the lightweight update function (auto-discovery if you omit names):
```powershell
iex (irm https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/update-scimtool-func.ps1); \
	Update-SCIMTool -Version v0.8.3
```
Specify RG/App explicitly if you have multiple deployments:
```powershell
Update-SCIMTool -Version v0.8.3 -ResourceGroup scimtool-rg -AppName scimtool-prod
```
Rotate secret? Redeploy with a new `SCIMTOOL_SECRET` using the bootstrap one‑liner (it will pull latest `setup.ps1`).

---

## 🩺 Troubleshooting (Fast Fixes)
| Issue | Try |
|-------|-----|
| Test Connection fails | Ensure URL ends with /scim/v2 & secret matches Entra config |
| No events appear | Turn provisioning ON and assign a user/group; wait initial sync |
| Deploy script exits | Run `az login`; confirm Azure CLI installed & subscription access |
| Data lost after update | Add persistent storage (default is enabled unless you disabled) |
| Favicon badge missing | Trigger an event in background tab; clear cache if stale |

More: see `DEPLOYMENT.md` for deeper architecture / options.

---
## 🧪 Local Development
Automated:
```powershell
./setup.ps1 -TestLocal
```
Manual:
```powershell
cd api; npm install; npm run start:dev
cd ../web; npm install; npm run dev
```
Backend: http://localhost:3000  |  Web UI: http://localhost:5173

---
## 🤝 Contribute / Support
* Issues & ideas: [GitHub Issues](https://github.com/kayasax/SCIMTool/issues)
* Q&A / discussion: [Discussions](https://github.com/kayasax/SCIMTool/discussions)
* ⭐ Star if this saved you time debugging provisioning!

---

## 📜 License
MIT — Built for the Microsoft Entra community.

---
**Need more detail?** Extended docs & deployment variants: [DEPLOYMENT.md](./DEPLOYMENT.md)

