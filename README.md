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

## 🚀 Quick Start

**One command to deploy everything:**

```powershell
.\setup.ps1
```

This interactive script:
- ✅ Checks prerequisites (Azure CLI, PowerShell)
- ✅ Deploys Azure Container App with persistent storage
- ✅ Creates public HTTPS endpoint
- ✅ Configures auto-scaling (scales to zero when idle)
- ✅ Provides your SCIM endpoint URL and secret
- ✅ **Typical cost: ~$5‑15/month** (mostly idle time = nearly free!)

**Want local dev/testing first?**

```powershell
.\setup.ps1 -TestLocal
```

That's it! The script handles everything else.

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

