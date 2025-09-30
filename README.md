# 🎯 SCIMTool
**A clean, fast SCIM 2.0 activity monitor for Microsoft Entra ID**

[![v0.6.0](https://img.shields.io/badge/Version-0.6.0-2ea043?style=flat-square)](https://github.com/kayasax/SCIMTool/releases/tag/v0.6.0) [![SCIM 2.0](https://img.shields.io/badge/SCIM-2.0-00a1f1?style=flat-square)](https://scim.cloud/) [![Microsoft Entra](https://img.shields.io/badge/Microsoft-Entra_ID-ff6b35?style=flat-square)](https://entra.microsoft.com/)

Stop parsing raw JSON provisioning logs. Get instant, human‑readable events, real‑time browser tab badges, and a searchable view of users & groups.

---

## ✨ Core Features

- 🔔 Favicon + tab title badge for new provisioning events
- 🧠 Human translation of SCIM operations ("Alice added to Finance Group")
- ⏱️ 10s auto-refresh background polling (baseline persists across reloads)
- 🗄️ Built‑in user & group browser (relationships & memberships)
- 🌓 Adaptive light/dark theme & mobile friendly UI
- 🚀 2‑minute zero-maintenance Azure deployment (auto scale-to-zero)
- � **Persistent storage** - Data survives container restarts and scale-to-zero
- 📊 **Enhanced activity feed** - See detailed changes with resolved user/group names
- �🔐 Shared-secret SCIM authentication

---

## 🚀 Quick Deploy (Azure Container Apps)

```powershell
iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/deploy.ps1')
```

Creates:
- Azure Container App with persistent storage (Azure Files)
- Public HTTPS endpoint
- Auto-scaling (0 → demand)
- SQLite database on persistent volume
- Typical cost: ~$5‑15/month (scales to zero when idle)

**New in v0.6.0:** Full Bicep-based deployment with persistent storage by default:

```powershell
# Full deployment with all infrastructure
./scripts/deploy-azure-full.ps1 `
    -ResourceGroup "scim-rg" `
    -AppName "scimtool" `
    -Location "eastus" `
    -ScimSecret "your-secure-secret"
```

**Upgrading existing deployment?** Add persistent storage to existing Container Apps:

```powershell
# Migrate existing deployment to persistent storage
./scripts/add-persistent-storage.ps1 `
    -ResourceGroup "your-rg" `
    -AppName "your-app"
```

See [MIGRATION-GUIDE.md](./docs/MIGRATION-GUIDE.md) for detailed upgrade instructions.

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

**Storage Modes:**
- **Persistent (v0.6.0+)**: `DATABASE_URL=file:/app/data/scim.db` (Azure Files mount)
- **Ephemeral (legacy)**: `DATABASE_URL=file:./data.db` (container filesystem)

Customization examples:

```powershell
# Custom secret
iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/deploy.ps1') -SecretToken "your-strong-secret"

# Custom resource names
./scripts/deploy-azure.ps1 -ResourceGroup my-scim-rg -AppName my-scimtool -ScimSecret my-secret
```

---

## 🔄 Updating

Redeploy with the same one‑liner; persistent storage preserves all data:

```powershell
iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/deploy.ps1')
```

**Upgrading from v0.5.0 or earlier?** Your deployment uses ephemeral storage. Add persistent storage:

```powershell
./scripts/add-persistent-storage.ps1 -ResourceGroup "your-rg" -AppName "your-app"
```

Release notes: [GitHub Releases](https://github.com/kayasax/SCIMTool/releases)

Current highlights:
- ✅ **v0.6.0**: Persistent storage with Azure Files
- ✅ **v0.5.0**: Enhanced activity feed with detailed changes
- ✅ Tab favicon + title badge
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
| Data lost after restart | Upgrade to v0.6.0 with persistent storage (see Migration Guide) |

More: [DEPLOYMENT.md](./DEPLOYMENT.md) • [MIGRATION-GUIDE.md](./docs/MIGRATION-GUIDE.md)

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

