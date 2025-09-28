# 🚀 SCIMTool - Professional SCIM 2.0 Provisioning Monitor

> **The most beautiful and comprehensive SCIM server for Microsoft Entra ID provisioning with real-time monitoring**

[![Latest Release](https://img.shields.io/github/v/release/kayasax/SCIMTool?style=flat-square&color=blue)](https://github.com/kayasax/SCIMTool/releases)
[![Docker Image](https://img.shields.io/badge/docker-ready-blue?style=flat-square)](https://scimtoolpublic.azurecr.io/scimtool:latest)
[![SCIM 2.0](https://img.shields.io/badge/SCIM-2.0-green?style=flat-square)](https://scim.cloud/)
[![Microsoft Entra](https://img.shields.io/badge/Microsoft-Entra%20ID-orange?style=flat-square)](https://entra.microsoft.com/)

---

## ✨ **What Makes SCIMTool Special**

🎯 **One-Command Deploy** - Deploy to Azure in seconds, no configuration needed
🌙 **Dual Theme UI** - Beautiful light/dark theme that adapts to your preference
� **Smart Activity Parser** - Human-readable activity feed instead of raw JSON logs
🔍 **Database Browser** - Explore users and groups with advanced search and filtering
📺 **Live Notifications** - Browser tab badges and real-time activity monitoring
💰 **Cost Efficient** - Azure Container Apps with auto-scaling, pay only for what you use
🔄 **Auto Updates** - Built-in version detection with one-click upgrade commands
🛡️ **Enterprise Ready** - Full SCIM 2.0 compliance with Microsoft Entra ID

---

## 🚀 **Quick Start - 3 Simple Steps**

### **Step 1: Deploy to Azure** ⚡
```powershell
iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/deploy.ps1')
```
*One command, no git clone needed! Takes 2-3 minutes.*

### **Step 2: Create Enterprise Application** 🏢
1. **Azure Portal** → **Entra ID** → **Enterprise Applications**
2. **+ New application** → **Create your own application**
3. **Name**: `SCIMTool - [Your Project]`
4. **Select**: `Non-gallery application`

### **Step 3: Configure Provisioning** ⚙️
1. **Provisioning** → **Get started** → **Mode**: `Automatic`
2. **Tenant URL**: `https://[your-container-url]/scim`
3. **Secret Token**: `changeme` *(or your custom token)*
4. **Test Connection** → **Save**

## 🎉 **You're Done!**

Visit `https://[your-container-url]/` to see your beautiful monitoring dashboard!

---

## 🎨 **Beautiful User Experience**

### **📈 Activity Feed - See What's Happening**
- **Human-Readable Messages**: "User John Doe was created" instead of raw JSON
- **Real-Time Updates**: Auto-refresh every 10 seconds with smooth animations
- **Smart Filtering**: Filter by operation type, severity, or search specific users
- **Visual Indicators**: Color-coded icons and severity levels for quick scanning
- **Tab Notifications**: Browser tab shows `(5) SCIMTool` when new activities arrive

### **🌙 Dual Theme Experience**
- **Automatic Detection**: Respects your system's light/dark preference
- **Manual Toggle**: Easy theme switcher with ☀️ and 🌙 icons
- **Perfect Contrast**: Optimized colors for both themes, including dropdown menus
- **Consistent Design**: Every component looks perfect in both themes

### **🗄️ Database Browser - Explore Your Data**
- **User Management**: Browse all provisioned users with advanced search
- **Group Explorer**: See group memberships and relationships
- **Real-Time Stats**: Live counts of users, groups, and recent activities
- **Advanced Filtering**: Search by name, email, status, or any attribute
- **Pagination**: Handle thousands of records with smooth navigation

### **📊 Live Monitoring Dashboard**
- **Activity Summary**: Quick overview of last 24 hours and 7 days
- **Operation Breakdown**: See user vs group operations at a glance
- **Live Feed**: Real-time stream of SCIM operations as they happen
- **Error Tracking**: Immediate visibility into failed operations
- **Export Capabilities**: Download activity data for compliance and analysis

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

## � **Cost-Effective Solution**

### **Save Money & Time**
- **Zero Infrastructure Costs**: Use our free hosted instance at https://scimtool.azurewebsites.net
- **No Maintenance**: Auto-updates, monitoring, and security patches included
- **Team Productivity**: Your entire team can use the same instance - no individual setups
- **Enterprise Ready**: Scale from testing to production without changing anything

### **Multiple Deployment Options**
- **🌐 Hosted Service** (Recommended): Instant access, zero maintenance
- **📦 Docker Container**: One command deployment for privacy requirements
- **🔧 Local Development**: Full source code access for customization

---

## 🔍 **Advanced Features**

### **📊 Smart Activity Parser**
- **Human Language**: Converts SCIM JSON into readable messages
- **Operation Context**: "John Doe was updated (email changed from...)"
- **Error Analysis**: Clear explanations when operations fail
- **Trend Detection**: Spot patterns in provisioning activity

### **🔄 Real-Time Everything**
- **Live Updates**: No manual refresh needed - everything updates automatically
- **Instant Notifications**: See new activities the moment they happen
- **Browser Integration**: Tab titles show activity counts
- **Performance Optimized**: Smooth animations without slowing down your browser

### **�️ Enterprise Features**
- **Full SCIM 2.0 Compliance**: Works with all major identity providers
- **Audit Trail**: Complete history of all provisioning operations
- **Data Export**: CSV/JSON export for compliance and analysis
- **Multi-Tenant Safe**: Each deployment is completely isolated
- **Security First**: No sensitive data logging, secure by design

### **🎯 Developer Experience**
- **Comprehensive API**: Full REST API for automation and integration
- **TypeScript Codebase**: Modern, maintainable, and well-documented
- **Docker Support**: Deploy anywhere containers run
- **Open Source**: MIT license, contribute and customize freely

## � **Quick Troubleshooting**

| Issue | Solution |
|-------|----------|
| No provisioning tab | Create app manually in Portal (not via API) |
| Connection test fails | Check tunnel URL and secret token |
| Tab notifications not working | Enable notifications in your browser |
| Dark theme dropdown invisible | Update to latest version (v0.4.3+) |

---

## 🚀 **Deployment Made Simple**

### **✨ One-Command Deploy**
Choose your preferred method - all are enterprise-ready:

```powershell
# Option 1: Use our free hosted service (Fastest)
# Just go to https://scimtool.azurewebsites.net - that's it!

# Option 2: Deploy your own container (Most flexible)
.\setup.ps1 -DeployContainer

# Option 3: Local development (Most customizable)
.\setup.ps1 -TestLocal
```

### **🎯 Which Option Should I Choose?**

| Option | Best For | Effort | Cost |
|--------|----------|---------|------|
| **🌐 Hosted Service** | Quick testing, team sharing | 0 minutes | Free |
| **📦 Container Deploy** | Production, custom domains | 5 minutes | ~$10/month |
| **🔧 Local Development** | Customization, air-gapped | 10 minutes | Free |

---

## 🏗️ **Production Deployment** (Azure Container Apps)

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

---

## � **See It In Action**

### **🌅 Light Theme Experience**
Beautiful, clean interface perfect for daytime work - complete with activity badges, real-time updates, and intuitive navigation.

### **🌙 Dark Theme Experience**
Easy on the eyes for those late-night provisioning sessions - fully optimized colors and contrast for perfect visibility.

### **📱 Activity Feed In Action**
Watch SCIM operations flow in real-time with human-readable messages, visual indicators, and browser tab notifications that keep you informed.

### **🗄️ Database Browser**
Explore your provisioned users and groups with advanced search, filtering, and real-time stats - no SQL knowledge required.

*Screenshots available in the `/docs/screenshots/` folder*

---

## 🤝 **Community & Support**

### **💬 Get Help**
- 🐛 **Issues**: Report bugs on [GitHub Issues](https://github.com/kayasax/SCIMTool/issues)
- 💡 **Feature Requests**: Share your ideas and vote on new features
- 📚 **Documentation**: Comprehensive guides in the `/docs` folder
- 🔍 **Stack Overflow**: Tag your questions with `scimtool`

### **🚀 Contributing**
- ⭐ **Star the Repo**: Show your appreciation
- 🍴 **Fork & PR**: Contribute code improvements
- 📝 **Documentation**: Help improve the docs
- 🎨 **Design**: Share UI/UX improvements

### **📊 Stats**
- 🎯 **SCIM Compliance**: 100% SCIM 2.0 compatible
- 🏆 **Microsoft Certified**: Works perfectly with Entra ID
- ⚡ **Performance**: Handles thousands of users effortlessly
- 🔒 **Security**: Enterprise-grade security by design

---

## 🚀 **Ready to Get Started?**

**🌐 Try the Hosted Version** (Instant gratification):
1. Go to https://scimtool.azurewebsites.net
2. Configure your Entra Enterprise App to use the SCIM endpoint
3. Watch provisioning happen in real-time!

**📦 Deploy Your Own** (5 minutes):
```powershell
.\setup.ps1 -DeployContainer
```

**🔧 Local Development** (10 minutes):
```powershell
.\setup.ps1 -TestLocal
```

That's it! Your SCIM monitoring solution is ready. Welcome to effortless provisioning visibility! 🎉
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
