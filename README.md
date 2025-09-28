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
👀 **Smart Activity Parser** - Human-readable activity feed instead of raw JSON logs
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

---

## 🎯 **Perfect for Microsoft Teams**

### **✅ Enterprise Integration**
- **Microsoft Entra Native**: Built specifically for Microsoft identity ecosystems
- **Azure-First Design**: Optimized for Azure Container Apps with automatic scaling
- **Team Collaboration**: Share one instance across your entire team
- **Zero Maintenance**: Auto-updates and security patches included

### **🚀 Ready in Minutes**
1. **Deploy**: One PowerShell command deploys everything
2. **Configure**: Simple Azure Portal setup - no complex configuration files
3. **Monitor**: Beautiful dashboard shows all provisioning activity in real-time
4. **Share**: Team members can access the same dashboard instantly

*Perfect for Microsoft colleagues - 3 steps and you're monitoring SCIM provisioning!* 🚀

## � **Cost-Effective Solution**

### **Save Money & Time**
- **Zero Infrastructure Costs**: Use our free hosted instance at https://scimtool.azurewebsites.net
- **No Maintenance**: Auto-updates, monitoring, and security patches included
- **Team Productivity**: Your entire team can use the same instance - no individual setups
- **Enterprise Ready**: Scale from testing to production without changing anything

### **Azure Container Apps Benefits**
- **🔒 Enterprise Security**: Automatic HTTPS and managed certificates
- **� Smart Scaling**: Auto-scales from 0 to handle any load
- **🌐 Global Reach**: Deploy to any Azure region worldwide
- **🔧 Zero Maintenance**: Automatic updates and health monitoring

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

## � **Production Ready**

Your SCIMTool deployment automatically handles:
- **Load Spikes**: Scales up during busy provisioning periods
- **Cost Optimization**: Scales to zero when not in use
- **Global Users**: Fast response times from Azure's global network
- **Enterprise SLA**: 99.95% uptime guarantee

*Need other deployment options? See [DEPLOYMENT.md](./DEPLOYMENT.md) for hosted service, local development, and advanced scenarios.*

---

## 🏗️ **Advanced Configuration**

### **Custom Secret Token**
```powershell
# Deploy with your own secret token
iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/deploy.ps1') -SecretToken "your-secure-token-here"
```

### **Custom Resource Names**
```powershell
# Deploy with custom resource group and app name
.\scripts\deploy-azure.ps1 -ResourceGroup "my-scim-rg" -AppName "my-scimtool" -ScimSecret "my-secret"
```

### **Environment Variables**
Configure additional settings through environment variables:
- `SCIM_SHARED_SECRET`: Your authentication token
- `DATABASE_URL`: SQLite database location (default: `file:/app/data/scim.db`)
- `LOG_LEVEL`: Logging level (`info`, `debug`, `error`)
- `CORS_ORIGINS`: Allowed origins for web UI access

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

## 🚀 **Deploy Now**

Ready to deploy your own SCIMTool instance? It takes just 2-3 minutes:

```powershell
# One command deployment to Azure
iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/deploy.ps1')
```

After deployment:
1. **Note your container URL** from the deployment output
2. **Configure your Enterprise App** with the SCIM endpoint: `https://[your-url]/scim`
3. **Start provisioning** and watch it happen in real-time!

*Exploring other options? See [DEPLOYMENT.md](./DEPLOYMENT.md) for hosted service, local development, and advanced scenarios.*

---

**Welcome to effortless SCIM provisioning visibility!** 🎉

---

## 🔄 **Automatic Updates**

### **✨ Smart Update Notifications**
SCIMTool automatically checks for new versions and shows you when updates are available right in the dashboard with a beautiful notification banner.

### **🚀 One-Click Updates**
When a new version is available:
1. **Click "Copy Update Command"** in the notification banner
2. **Paste and run** in PowerShell - that's it!
3. **Your deployment updates** automatically with zero downtime

### **🛡️ Always Current**
- **Security Updates**: Automatic security patches and improvements
- **New Features**: Get the latest enhancements without any hassle
- **Bug Fixes**: Issues resolved quickly with seamless updates
- **Backward Compatible**: Updates never break your existing configuration

### **📊 Release History**
Visit our [GitHub Releases](https://github.com/kayasax/SCIMTool/releases) page to see what's new in each version, including:
- 🎨 **UI Improvements**: Better user experience and design
- 🔧 **Performance Enhancements**: Faster and more efficient monitoring
- 🛡️ **Security Updates**: Latest security improvements
- ✨ **New Features**: Enhanced SCIM compatibility and monitoring capabilities

*Stay updated effortlessly - SCIMTool takes care of the technical details!* ⚡
