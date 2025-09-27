# SCIMTool

> SCIM 2.0 server for Microsoft Entra provisioning with real-time monitoring

## 🚀 For Microsoft Colleagues - 3 Simple Steps

### Step 1: Deploy the Container
```powershell
iwr https://raw.githubusercontent.com/kayasax/SCIMTool/main/deploy.ps1 | iex
```
*One command, no git clone needed! Takes 2-3 minutes. Works with any Azure subscription.*

### Step 2: Create Enterprise App
1. **Azure Portal** → **Entra ID** → **Enterprise Applications**
2. **+ New application** → **Create your own application**
3. **Name**: `SCIMTool - [Your Name]`
4. **Type**: `Non-gallery application`

### Step 3: Configure Provisioning
1. **Provisioning** → **Get started** → **Mode**: `Automatic`
2. **Tenant URL**: `https://[your-container-url]/scim`
3. **Secret Token**: `S@g@r2011`
4. **Test Connection** → **Save**

## ✅ Done!

- **Monitor provisioning**: `https://[your-container-url]/` (share with team)
- **Real-time logs** of all SCIM requests/responses
- **No local setup** required for your colleagues

---

## 🔧 Alternative: Local Development

*If you want to develop/modify the SCIM server:*

```powershell
cd api && npm install && npm run start:dev  # Start SCIM server
cd web && npm install && npm run dev        # Start monitoring UI
.\setup.ps1 -TestLocal                       # Test endpoints
```

## 🎯 What You Get

- **SCIM 2.0 Server** - All endpoints (Users, Groups, etc.)
- **Real-time Monitoring** - Web UI showing all provisioning activity
- **Team Sharing** - Colleagues can view logs without setup
- **Production Ready** - Hosted on Azure Container Apps

## � Container Image Sharing Options

**Option 1: Build from Source (Recommended)**
```powershell
git clone [this-repo]
.\setup.ps1 -DeployContainer
```

**Option 2: Azure Container Registry** *(coming soon)*
- Pre-built image ready for deployment
- `az acr import` to your subscription

**Option 3: Docker Hub** *(coming soon)*
- Public container image
- `docker pull scimtool:latest`

## ⚠️ Important Notes

- **Enterprise Apps must be created manually** in Azure Portal (not via API)
- **Secret Token**: Automatically generated unique per deployment (or provide your own)
- **Team Access**: Share your container URL - colleagues can monitor without setup

---

**Perfect for Microsoft colleagues - 3 steps and you're monitoring SCIM provisioning! 🚀**

## 📊 SCIM Endpoints

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/scim/ServiceProviderConfig` | GET | SCIM capabilities |
| `/scim/Users` | GET, POST | User management |
| `/scim/Users/{id}` | GET, PATCH, DELETE | Individual users |
| `/scim/Groups` | GET, POST | Group management |
| `/scim/Groups/{id}` | GET, PATCH, DELETE | Individual groups |
| `/scim/oauth/token` | POST | OAuth token endpoint |

## 🛠️ Configuration

**Environment Variables** (`api/.env`):
```
SCIM_SHARED_SECRET=S@g@r!2011
PORT=3000
DATABASE_URL=file:./dev.db
```

**Change Secret**:
1. Update `api/.env`
2. Restart server
3. Update Azure Portal provisioning config

## 🔍 Troubleshooting

| Issue | Solution |
|-------|----------|
| No provisioning tab | Create app manually in Portal (not via API) |
| Connection test fails | Check tunnel URL and secret token |
| 401 errors | Verify bearer token matches `.env` |
| Server won't start | Run `npm install` in `api/` directory |

## 🏗️ Production Deployment (Azure Container Apps)

For production use, deploy to Azure Container Apps for scalability and reliability:

### Quick Deploy Script
```powershell
# Use the included deployment script
.\scripts\deploy-azure.ps1 -ResourceGroup "scim-rg" -AppName "scimtool-prod" -ScimSecret "your-secure-secret"
```

### Manual Deploy (Alternative)
```bash
# Deploy to Azure Container Apps manually
az containerapp up \
  --name scimtool \
  --resource-group your-rg \
  --location eastus \
  --environment-variables SCIM_SHARED_SECRET=your-production-secret PORT=80 \
  --ingress external \
  --target-port 80 \
  --source ./api
```

### Benefits
- ✅ **Automatic HTTPS** with custom domain support
- ✅ **Auto-scaling** based on demand
- ✅ **High availability** with multiple replicas
- ✅ **Integrated monitoring** and logging
- ✅ **Secure secrets** management

### Configuration
1. **Custom Domain**: Point your domain to the Container App
2. **SSL Certificate**: Automatic with Azure-managed certificates
3. **Environment Variables**: Set via Azure Portal or CLI
4. **Scaling**: Configure min/max replicas based on load

### Azure Portal Setup
1. **Tenant URL**: `https://your-domain.com/scim`
2. **Secret Token**: Your production secret from Key Vault
3. **Authentication**: Bearer token or OAuth 2.0

### 🖥️ Configure Web UI for Production

After deploying to Azure Container Apps, configure the web UI to connect to your deployed server:

1. **Update Environment Configuration**:
   ```powershell
   # Edit web/.env
   VITE_API_BASE=https://scimtool-prod.bravewater-b8848185.eastus.azurecontainerapps.io
   VITE_SCIM_TOKEN=S@g@r2011
   ```

2. **Start Web UI**:
   ```powershell
   cd web
   npm install
   npm run dev
   # Opens at http://localhost:5173
   ```

3. **View Production Logs**:
   - Web UI now connects to your Azure Container Apps SCIM server
   - Monitor real-time provisioning requests from Microsoft Entra
   - Debug authentication and SCIM operations

## 🔧 Local Development vs Production

| Aspect | Local Development | Production (Container Apps) |
|--------|-------------------|------------------------------|
| **Hosting** | Dev tunnels | Azure Container Apps |
| **HTTPS** | Tunnel-provided | Azure-managed SSL |
| **Secrets** | `.env` file | Azure Key Vault |
| **Scaling** | Single instance | Auto-scaling |
| **Monitoring** | Console logs | Application Insights |
| **Domain** | Random tunnel URL | Custom domain |

## 🚀 Ready to Go!

**Local Development:**
```powershell
.\setup.ps1 -TestLocal
```

**Production Deployment:**
```powershell
.\scripts\deploy-azure.ps1 -ResourceGroup "scim-rg" -AppName "scimtool-prod" -ScimSecret "your-secret"
```

That's it! Your SCIM server is ready for Microsoft Entra provisioning.
## 🔄 Upgrading / New Releases
You do not need to maintain a manual version manifest. Each time you publish a GitHub Release (tag) and push a container image with the same tag (e.g. `v0.2.0`), you can upgrade your running Azure Container App to that version.

### Option A: Interactive Upgrade Helper (Recommended)
Run the helper script which discovers available versions live from GitHub Releases and performs the update:

```powershell
./scripts/upgrade-help.ps1 -ResourceGroup scimtool-rg -AppName scimtool-prod -Image myacr.azurecr.io/scimtool
```

Parameters:
* `-Prerelease` include pre-release tags
* `-DryRun` show the command without executing
* `-GitHubRepo owner/name` override repository (defaults to `kayasax/SCIMTool`)

What it does:
1. Reads current running version from `/scim/admin/version` (if reachable)
2. Fetches GitHub Releases (`https://api.github.com/repos/<repo>/releases`)
3. Lets you choose a target tag
4. Executes: `az containerapp update -n <AppName> -g <RG> --image <image>:<tag>`

### Option B: Manual Command
If you already know the tag:
```powershell
az containerapp update -n scimtool-prod -g scimtool-rg --image myacr.azurecr.io/scimtool:v0.2.0
```

### Frontend Upgrade Banner
The UI auto-fetches the latest GitHub release (no manifest needed). If the release tag is greater than the running version, a banner appears with a copyable `az containerapp update` command.

### Release Tag Discipline
1. Tag repo: `git tag v0.2.0 && git push origin v0.2.0`
2. Build & push: `docker build -t myacr.azurecr.io/scimtool:v0.2.0 .` then push
3. Run upgrade script (or manual update). Done.

### Rollback
Use the same update command with an older tag, or select an older release in the helper script.

### Verifying Upgrade
After a few minutes:
```powershell
curl -H "Authorization: Bearer <secret>" https://<fqdn>/scim/admin/version
```
Ensure `version` matches your target tag.
\n+## 🔄 Upgrading / New Releases
You do not need to maintain a manual version manifest. Each time you publish a GitHub Release (tag) and push a container image with the same tag (e.g. `v0.2.0`), you can upgrade your running Azure Container App to that version.
\n+### Option A: Interactive Upgrade Helper (Recommended)
Run the new helper script which discovers available versions live from GitHub Releases and performs the update:
\n+```powershell
./scripts/upgrade-help.ps1 -ResourceGroup scimtool-rg -AppName scimtool-prod -Image myacr.azurecr.io/scimtool
```
Parameters:
* `-Prerelease` include pre-release tags
* `-DryRun` show the command without executing
* `-GitHubRepo owner/name` override repository (defaults to `kayasax/SCIMTool`)
\n+What it does:
1. Reads current running version from `/scim/admin/version` (if reachable)
2. Fetches GitHub Releases (`https://api.github.com/repos/<repo>/releases`)
3. Lets you choose a target tag
4. Executes: `az containerapp update -n <AppName> -g <RG> --image <image>:<tag>`
\n+### Option B: Manual Command
If you already know the tag:
```powershell
az containerapp update -n scimtool-prod -g scimtool-rg --image myacr.azurecr.io/scimtool:v0.2.0
```
\n+### Frontend Upgrade Banner (Optional)
The UI currently supports an optional remote manifest (`VITE_REMOTE_MANIFEST_URL`) to show an in-app “Update available” banner. If you prefer zero-maintenance, simply skip that variable; the system works fine without it. A future enhancement may query GitHub Releases directly to eliminate the manifest entirely.
\n+### Release Tag Discipline
1. Tag repo: `git tag v0.2.0 && git push origin v0.2.0`
2. Build & push: `docker build -t myacr.azurecr.io/scimtool:v0.2.0 .` then `az acr login` & `docker push ...`
3. Run upgrade script (or manual update). Done.
\n+### Rollback
Use the same update command with an older tag, or select an older release in the helper script.
\n+### Verifying Upgrade
After a few minutes:
```powershell
curl -H "Authorization: Bearer <secret>" https://<fqdn>/scim/admin/version
```
Ensure `version` matches your target tag.
