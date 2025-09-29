# 🎯 SCIMTool
**A clean, fast SCIM 2.0 activity monitor for Microsoft Entra ID**

[![v0.4.6](https://img.shields.io/badge/Version-0.4.6-2ea043?style=flat-square)](https://github.com/kayasax/SCIMTool/releases/tag/v0.4.6) [![SCIM 2.0](https://img.shields.io/badge/SCIM-2.0-00a1f1?style=flat-square)](https://scim.cloud/) [![Microsoft Entra](https://img.shields.io/badge/Microsoft-Entra_ID-ff6b35?style=flat-square)](https://entra.microsoft.com/)

Stop parsing raw JSON provisioning logs. Get instant, human‑readable events, real‑time browser tab badges, and a searchable view of users & groups.

---

## ✨ Core Features

- 🔔 Favicon + tab title badge for new provisioning events
- 🧠 Human translation of SCIM operations ("Alice added to Finance Group")
- ⏱️ 10s auto-refresh background polling (baseline persists across reloads)
- 🗄️ Built‑in user & group browser (relationships & memberships)
- 🌓 Adaptive light/dark theme & mobile friendly UI
- 🚀 2‑minute zero-maintenance Azure deployment (auto scale-to-zero)
- 🔐 Shared-secret SCIM authentication

---

## 🚀 Quick Deploy (Azure Container Apps)

```powershell
iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/deploy.ps1')
```

Creates:
- Azure Container App + persistent volume (SQLite)
- Public HTTPS endpoint
- Auto-scaling (0 → demand)
- Typical cost: ~$5‑15 / month (scales to zero when idle)

Other options (Docker Compose, hosted demo, local dev): see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## 🔧 Configure Microsoft Entra ID

1. Entra ID → Enterprise Applications → your app
2. Provisioning → Set up automatic provisioning
3. Tenant URL: `https://YOUR-APP.azurecontainerapps.io/scim/v2`
4. Secret Token: value used at deploy (default `changeme` — change it!)
5. Test Connection → expect ✅ success
6. Turn provisioning On & assign test users

Open the web root (same host) to watch new events; badge increments while tab is backgrounded.

---

## 🛠 Environment Variables

| Name | Purpose | Default |
|------|---------|---------|
| `SCIM_SHARED_SECRET` | Auth token for SCIM requests | `changeme` |
| `DATABASE_URL` | SQLite/Prisma connection string | `file:/app/data/scim.db` |
| `LOG_LEVEL` | Logging verbosity | `info` |
| `CORS_ORIGINS` | Allowed web origins | `*` |

Customization examples:

```powershell
# Custom secret
iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/deploy.ps1') -SecretToken "your-strong-secret"

# Custom resource names
./scripts/deploy-azure.ps1 -ResourceGroup my-scim-rg -AppName my-scimtool -ScimSecret my-secret
```

---

## 🔄 Updating

Redeploy with the same one‑liner; existing data persists:

```powershell
iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/deploy.ps1')
```

Release notes: [GitHub Releases](https://github.com/kayasax/SCIMTool/releases)

Current highlights:
- ✅ Tab favicon + title badge
- ✅ Persistent new-activity detection
- ✅ Polished production interface

---

## 🧪 Local Development (Quick Glance)

```powershell
git clone https://github.com/kayasax/SCIMTool.git
cd SCIMTool
./setup.ps1 -TestLocal
```

Manual:
```powershell
cd api; npm install; npm run start:dev
cd ../web; npm install; npm run dev
```
Backend: http://localhost:3000  |  Web UI: http://localhost:5173

---

## 🩺 Troubleshooting (Quick Reference)

| Problem | Fix |
|---------|-----|
| Connection test fails | URL ends with `/scim/v2`; secret matches; container running |
| No activity events | Provisioning On; users assigned; trigger a create/update |
| Favicon badge missing | Generate activity with tab in background; clear cache; check console |
| Deploy script fails | `az login`; verify CLI installed & permissions |
| Local dev CORS errors | Set `CORS_ORIGINS=http://localhost:5173` |

More: [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## 🤝 Community & Support

- 🐛 Bugs / 💡 Features: [Issues](https://github.com/kayasax/SCIMTool/issues)
- 💬 Questions: [Discussions](https://github.com/kayasax/SCIMTool/discussions)
- ⭐ Star the repo if it helps you

---

## 📜 License

MIT • Built with ❤️ for the Microsoft / Entra community.

---

Need screenshots, deployment comparisons, hosted demo, or scaling notes? See: [DEPLOYMENT.md](./DEPLOYMENT.md)

