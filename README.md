# 🎯 SCIMTool
**A clean, fast SCIM 2.0 activity monitor for Microsoft Entra ID**

[![Latest Release](https://img.shields.io/github/v/release/kayasax/SCIMTool?style=flat-square&color=2ea043)](https://github.com/kayasax/SCIMTool/releases/latest) [![SCIM 2.0](https://img.shields.io/badge/SCIM-2.0-00a1f1?style=flat-square)](https://scim.cloud/) [![Microsoft Entra](https://img.shields.io/badge/Microsoft-Entra_ID-ff6b35?style=flat-square)](https://entra.microsoft.com/)

Stop parsing raw JSON provisioning logs. Get instant, human‑readable events, real‑time browser tab badges, and a searchable view of users & groups.

---

## ✨ Core Features

- 🔔 Favicon + tab title badge for new provisioning events
- 🧠 Human translation of SCIM operations ("Alice added to Finance Group")
- ⏱️ 10s auto-refresh background polling (baseline persists across reloads)
- 🗄️ Built‑in user & group browser (relationships & memberships)
- 🌓 Adaptive light/dark theme & mobile friendly UI
- 🚀 2‑minute zero-maintenance Azure deployment (auto scale-to-zero)
- 💾 **Persistent storage** - Data survives container restarts and scale-to-zero
- 📊 **Enhanced activity feed** - See detailed changes with resolved user/group names
- 🔐 Shared-secret SCIM authentication

---

## 🚀 Quick Start (Zero-Parameter One‑Liner)

Just run this from any PowerShell 7+ session (Windows, macOS, or Linux). You'll be interactively prompted for the required values (Resource Group, App Name, Secret, etc.), then a full Azure Container Apps deployment (with persistent storage) will be created:

```powershell
iex (irm https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/deploy-azure.ps1)
```

What happens:
- Prompts you for: Resource Group (created if missing), App Name, Region (defaults), Secret Token
- Builds/Deploys: Resource Group, Log Analytics, Container App Environment, Storage (Azure Files), Container App
- Outputs: Public URL, SCIM base URL (`/scim/v2`), reminder of your secret token
- Persistence: SQLite backup stored on Azure Files; primary DB runs on fast ephemeral storage

Typical cost: **~$5–15/month** (scale-to-zero keeps idle cost low; storage + minimal logs).

### Non‑Interactive / CI Variant
If you want a single copy/paste with no prompts (replace placeholder values):

```powershell
iex (irm https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/deploy-azure.ps1) -ResourceGroup "scimtool-rg" -AppName "scimtool-prod" -ScimSecret "REPLACE-ME-STRONG" -ImageTag "0.7.11"
```

Ephemeral (no persistence – NOT recommended for real usage):
```powershell
iex (irm https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/deploy-azure.ps1) -ResourceGroup "scimtool-test" -AppName "scimtool-ephemeral" -ScimSecret "TEMP-ONLY" -EnablePersistentStorage:$false
```

### Local Development Instead?
Clone the repo and run:

```powershell
.\setup.ps1 -TestLocal
```

Then:
- API: http://localhost:3000
- Web UI: http://localhost:5173

Or manual:
```powershell
cd api; npm install; npm run start:dev
cd ../web; npm install; npm run dev
```

---

---

## ⚡ One-Line Production Deployment

If you just want to deploy (or update) a production instance directly from PowerShell without cloning the repo first, run:

```powershell
iex (irm https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/deploy-azure.ps1) -ResourceGroup "scimtool-rg" -AppName "scimtool-prod" -ScimSecret "YOUR-SECRET" -ImageTag "0.7.11"
```

Parameters you must supply:
- `-ResourceGroup`  New or existing Azure resource group (will be created if missing)
- `-AppName`        Container App name (becomes part of the FQDN)
- `-ScimSecret`     Shared secret token you will also configure in Entra provisioning
- `-ImageTag`       (Optional) Image tag to deploy (defaults to `latest` if omitted)

Disable persistent storage (NOT recommended for real usage):
```powershell
iex (irm https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/deploy-azure.ps1) -ResourceGroup "scimtool-test" -AppName "scimtool-ephemeral" -ScimSecret "TEMP-SECRET" -EnablePersistentStorage:$false
```

After the script completes it will print:
- Public URL (open it to view Activity Feed UI)
- SCIM API base: `https://<fqdn>/scim/v2`
- Instructions to plug into Microsoft Entra provisioning

Need to rotate the secret? Re-run the same command with a new `-ScimSecret` and (optionally) a new `-ImageTag` if you want to force a redeploy.

---

---

## 🔧 Configure Microsoft Entra ID

After running `setup.ps1`, you'll get your SCIM endpoint URL and secret. Then:

1. Entra ID → Enterprise Applications → your app
2. Provisioning → Set up automatic provisioning
3. Tenant URL: `https://YOUR-APP.azurecontainerapps.io/scim/v2` (from setup output)
4. Secret Token: (from setup output)
5. Test Connection → expect ✅ success
6. Turn provisioning On & assign test users

Open the web root (same host, no `/scim`) to watch new events in real-time!

---

## � Updating

The setup script automatically detects existing deployments and updates them:

```powershell
.\setup.ps1
```

Your data is preserved thanks to persistent storage. See what's new in the [Releases](https://github.com/kayasax/SCIMTool/releases)!

---

## 🧪 Local Development

```powershell
.\setup.ps1 -TestLocal
```

This starts:
- Backend API: http://localhost:3000
- Web UI: http://localhost:5173

**Manual setup:**
```powershell
cd api; npm install; npm run start:dev
cd ../web; npm install; npm run dev
```

---

## 🩺 Troubleshooting

| Problem | Fix |
|---------|-----|
| Connection test fails | Check URL ends with `/scim/v2`; verify secret matches; ensure container is running |
| No activity events | Turn provisioning On; assign users; trigger a create/update in Entra |
| Favicon badge missing | Generate activity with tab in background; clear browser cache |
| Deploy fails | Run `az login`; verify Azure CLI is installed and you have permissions |
| Local CORS errors | Backend auto-allows localhost:5173 in dev mode |

For advanced scenarios, see [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 🤝 Community & Support

- 🐛 Bugs / 💡 Features: [Issues](https://github.com/kayasax/SCIMTool/issues)
- 💬 Questions: [Discussions](https://github.com/kayasax/SCIMTool/discussions)
- ⭐ Star the repo if it helps you!

---

## 📜 License

MIT • Built with ❤️ for the Microsoft / Entra community.

---

**Advanced deployment options, architecture details, and screenshots:** See [DEPLOYMENT.md](./DEPLOYMENT.md)

