# ✨ SCIMTool
**Provisioning visibility & SCIM 2.0 monitor for Microsoft Entra — deploy in minutes, understand events instantly.**

[![Version 0.8.14](https://img.shields.io/badge/version-0.8.14-2ea043?style=flat-square)](https://github.com/kayasax/SCIMTool/releases/latest) [![SCIM 2.0](https://img.shields.io/badge/SCIM-2.0-00a1f1?style=flat-square)](https://scim.cloud/) [![Microsoft Entra](https://img.shields.io/badge/Microsoft-Entra_ID-ff6b35?style=flat-square)](https://entra.microsoft.com/)

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

## 🚀 5 minutes Cloud Deploy
Run in PowerShell (Windows PowerShell 5.1 or PowerShell 7+; macOS/Linux require PowerShell 7+). Prompts for RG / App / Region / Secret (or auto‑generate), then provisions Azure Container Apps + blob snapshot persistence.


```powershell
iex (iwr https://raw.githubusercontent.com/kayasax/SCIMTool/master/bootstrap.ps1).Content
```
Outputs (copy these, we will need them to configure the Entra app) :
* Public URL (web UI root)
* SCIM Base URL
* Generated / provided shared secret (reprinted at end)
* JWT signing secret (store securely for future redeploys)
* OAuth client secret for token requests

Example:
<img width="1144" height="111" alt="image" src="https://github.com/user-attachments/assets/fe47af5a-2e1f-451b-a9e4-492ae704646f" />

Cost: scale‑to‑zero + storage (low idle spend).

For information these resource types will be deployed  
<img width="468" height="328" alt="image" src="https://github.com/user-attachments/assets/6d99026d-7ba2-4ea1-b9bd-bea037ec6001" />



## 🔧 Configure Microsoft Entra Provisioning (Right After Deploy)
1. Entra Portal → Enterprise Applications → Create new Enterprise App (non-gallery)
<img width="1678" height="704" alt="image" src="https://github.com/user-attachments/assets/4cd0c21b-a637-4886-a787-ab932b900bcc" />



2.Open your app and create a new configuration, paste the SCIM endpoint and secret from the powershell output, ex:
<img width="1108" height="592" alt="image" src="https://github.com/user-attachments/assets/26e4a213-1617-4166-a8fa-4a614491bfe1" />


3. Test Connection → expect success
4. Turn provisioning ON & assign users / groups

Open the root URL (same host, no /scim) to watch events in near real-time. ex https://scimtool-app-1839.purplestone-a06f6cdf.eastus.azurecontainerapps.io/
>Note: copy the SCIM, JWT, and OAuth secrets shown at deployment time and keep them safe. They are not stored anywhere else.
---

## 🔄 Updating to a New Version
You will be notified when a new version is available and a powershell command will be provided so you can updat effortlessly :)

Use the lightweight update function (auto-discovery if you omit names):
```powershell
iex (irm https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/update-scimtool-func.ps1); \
	Update-SCIMTool -Version v0.8.13
```
Specify RG/App explicitly if you have multiple deployments:
```powershell
Update-SCIMTool -Version v0.8.13 -ResourceGroup scimtool-rg -AppName scimtool-prod
```
> v0.8.13 note: the direct-update script now auto-generates `JWT_SECRET` and `OAUTH_CLIENT_SECRET` if they are missing, applies them via `--set-env-vars`, and restarts revisions when only secrets change.
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
## 🤝 Contribute / Support
* Issues & ideas: [GitHub Issues](https://github.com/kayasax/SCIMTool/issues)
* Q&A / discussion: [Discussions](https://github.com/kayasax/SCIMTool/discussions)
* ⭐ Star if this saved you time debugging provisioning!

---

## 📜 License
MIT — Built for the Microsoft Entra community.

---
**Need more detail?** Extended docs & deployment variants: [DEPLOYMENT.md](./DEPLOYMENT.md)

