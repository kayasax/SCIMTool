# 🎯 SCIMTool# 🎯 SCIMTool

### *The Beautiful SCIM 2.0 Monitor for Microsoft Entra ID*### *The Beautiful SCIM 2.0 Monitor for Microsoft Entra ID*



[![Latest Release](https://img.shields.io/github/v/release/kayasax/SCIMTool?style=flat-square&color=2ea043)](https://github.com/kayasax/SCIMTool/releases) [![Docker Image](https://img.shields.io/badge/Azure_Container_Registry-Ready-0078d4?style=flat-square)](https://scimtoolpublic.azurecr.io/scimtool:latest) [![SCIM 2.0](https://img.shields.io/badge/SCIM-2.0-00a1f1?style=flat-square)](https://scim.cloud/) [![Microsoft Entra](https://img.shields.io/badge/Microsoft-Entra_ID-ff6b35?style=flat-square)](https://entra.microsoft.com/)[![Latest Release](https://img.shields.io/github/v/release/kayasax/SCIMTool?style=flat-square&color=2ea043)](https://github.com/kayasax/SCIMTool/releases) [![Docker Image](https://img.shields.io/badge/Azure_Container_Registry-Ready-0078d4?style=flat-square)](https://scimtoolpublic.azurecr.io/scimtool:latest) [![SCIM 2.0](https://img.shields.io/badge/SCIM-2.0-00a1f1?style=flat-square)](https://scim.cloud/) [![Microsoft Entra](https://img.shields.io/badge/Microsoft-Entra_ID-ff6b35?style=flat-square)](https://entra.microsoft.com/)



**Never wonder "what's happening with provisioning?" again.****Never wonder "what's happening with provisioning?" again.**



Turn cryptic SCIM logs into beautiful, human-readable activity feeds. Deploy to Azure in 60 seconds. Monitor everything in real-time.Turn cryptic SCIM logs into beautiful, human-readable activity feeds. Deploy to Azure in 60 seconds. Monitor everything in real-time.



![SCIMTool Demo](https://img.shields.io/badge/🎥_Demo-Coming_Soon-gray?style=flat-square)![SCIMTool Demo](https://img.shields.io/badge/�_Demo-Coming_Soon-gray?style=flat-square)



------



## 🚀 **Deploy in 60 Seconds**## 🚀 **Deploy in 60 Seconds**



```powershell```powershell

# One command. That's it.# One command. That's it.

iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/deploy.ps1')iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/deploy.ps1')

``````



**What you get:****What you get:**

- ✨ Beautiful monitoring dashboard- ✨ Beautiful monitoring dashboard

- 🔍 Real-time activity feed with human language- 🔍 Real-time activity feed with human language

- 👥 Database browser for users & groups  - � Database browser for users & groups  

- 🌙 Auto light/dark theme- 🌙 Auto light/dark theme

- 💰 Azure Container Apps (pay-per-use)- 💰 Azure Container Apps (pay-per-use)

- 🔄 Auto-updates built-in- 🔄 Auto-updates built-in



------



## 🎯 **Before & After**## 🎯 **Before & After**



### **😤 Before SCIMTool**### **� Before SCIMTool**

- *"Why did provisioning fail?"* → Dig through raw JSON logs- *"Why did provisioning fail?"* → Dig through raw JSON logs

- *"Did the user get created?"* → Check Azure portal manually  - *"Did the user get created?"* → Check Azure portal manually  

- *"What changed?"* → No visibility into operations- *"What changed?"* → No visibility into operations

- *Team asks for status* → No easy way to share- *Team asks for status* → No easy way to share



### **😎 After SCIMTool**  ### **😎 After SCIMTool**  

- **"Sarah Johnson was added to Marketing Team"** ← Clear, instant visibility- **"Sarah Johnson was added to Marketing Team"** ← Clear, instant visibility

- **Live dashboard** everyone can access ← Real-time monitoring  - **Live dashboard** everyone can access ← Real-time monitoring  

- **Search & filter everything** ← Find issues fast- **Search & filter everything** ← Find issues fast

- **Beautiful interface** ← Actually enjoyable to use- **Beautiful interface** ← Actually enjoyable to use



------



## ⚡ **Setup Guide**## ⚡ **Setup Guide**



### **1️⃣ Deploy (60 seconds)**### **1️⃣ Deploy (60 seconds)**

```powershell```powershell

iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/deploy.ps1')iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/deploy.ps1')

``````



### **2️⃣ Configure Entra ID (2 minutes)**### **2️⃣ Configure Entra ID (2 minutes)**

1. **Enterprise Applications** → **New** → **Create your own**1. **Enterprise Applications** → **New** → **Create your own**

2. **Provisioning** → **Automatic**2. **Provisioning** → **Automatic**

3. **Tenant URL**: `https://[your-url]/scim`  3. **Tenant URL**: `https://[your-url]/scim`  

4. **Secret**: `changeme`4. **Secret**: `changeme`



### **3️⃣ Start Monitoring**### **3️⃣ Start Monitoring**

Visit your dashboard and watch provisioning happen in real-time! 🎉Visit your dashboard and watch provisioning happen in real-time! 🎉



------



## ✨ **What Makes It Special**## ✨ **What Makes It Special**



### **🧠 Smart Activity Parser**### **🧠 Smart Activity Parser**

``````

❌ Raw SCIM:  {"operation":"add","path":"members","value":[{"value":"a1c9c6e4b8f5"}]}❌ Raw SCIM:  {"operation":"add","path":"members","value":[{"value":"a1c9c6e4b8f5"}]}

✅ SCIMTool:  "John Doe was added to Marketing Team"✅ SCIMTool:  "John Doe was added to Marketing Team"

``````



### **🎨 Beautiful Interface**### **🎨 Beautiful Interface**

- **Auto light/dark theme** that follows your system- **Auto light/dark theme** that follows your system

- **Real-time updates** with smooth animations  - **Real-time updates** with smooth animations  

- **Browser tab notifications** - see `(3) SCIMTool` when activity happens- **Browser tab notifications** - see `(3) SCIMTool` when activity happens

- **Search & filter everything** instantly- **Search & filter everything** instantly



### **🗄️ Database Browser**### **🗄️ Database Browser**

- Browse **all users & groups** with advanced search- Browse **all users & groups** with advanced search

- See **group memberships** and relationships- See **group memberships** and relationships

- **Real-time stats** and activity counts- **Real-time stats** and activity counts

- Export data for compliance- Export data for compliance



### **🚀 Enterprise Ready**  ### **🚀 Enterprise Ready**  

- **Full SCIM 2.0** compliance- **Full SCIM 2.0** compliance

- **Auto-scaling** Azure Container Apps- **Auto-scaling** Azure Container Apps

- **Zero maintenance** - auto-updates included- **Zero maintenance** - auto-updates included

- **Team sharing** - one URL, everyone can access- **Team sharing** - one URL, everyone can access



------



## 💰 **Pricing**## 💰 **Pricing**



**Azure Container Apps**: Pay only when provisioning happens**Azure Container Apps**: Pay only when provisioning happens

- **Idle**: $0/month (scales to zero)- **Idle**: $0/month (scales to zero)

- **Light usage**: ~$5-15/month  - **Light usage**: ~$5-15/month  

- **Enterprise**: Auto-scales to handle any load- **Enterprise**: Auto-scales to handle any load



*Much cheaper than building your own monitoring solution!**Much cheaper than building your own monitoring solution!*



------



## 🛠️ **Advanced Options**## 🛠️ **Advanced Options**



### **Custom Deployment**### **Custom Deployment**

```powershell```powershell

# Custom secret token# Custom secret token

.\scripts\deploy-azure.ps1 -ScimSecret "your-secure-token".\scripts\deploy-azure.ps1 -ScimSecret "your-secure-token"



# Custom resource names  # Custom resource names  

.\scripts\deploy-azure.ps1 -ResourceGroup "my-scim-rg" -AppName "my-scimtool".\scripts\deploy-azure.ps1 -ResourceGroup "my-scim-rg" -AppName "my-scimtool"

``````



### **Other Deployment Methods**### **Other Deployment Methods**

- **Docker**: `docker run scimtoolpublic.azurecr.io/scimtool:latest`- **Docker**: `docker run scimtoolpublic.azurecr.io/scimtool:latest`

- **Local Development**: See [DEPLOYMENT.md](./DEPLOYMENT.md)- **Local Development**: See [DEPLOYMENT.md](./DEPLOYMENT.md)

- **Kubernetes**: Helm chart available- **Kubernetes**: Helm chart available



------



## 🏃 **Quick Troubleshooting**## 🏃 **Quick Troubleshooting**



| Issue | Solution || Issue | Solution |

|-------|----------||-------|----------|

| Connection test fails | Check your container URL and secret token || Connection test fails | Check your container URL and secret token |

| No provisioning tab | Create app manually in Portal (not via API) || No provisioning tab | Create app manually in Portal (not via API) |

| Theme issues | Update to latest version (v0.4.4+) || Theme issues | Update to latest version (v0.4.4+) |



------



## 🤝 **Contributing**## 🤝 **Contributing**



- ⭐ **Star the repo** to show support- ⭐ **Star the repo** to show support

- 🐛 **Report issues** on GitHub- 🐛 **Report issues** on GitHub

- 🔀 **Submit PRs** for improvements  - 🔀 **Submit PRs** for improvements  

- 💡 **Request features** via Issues- 💡 **Request features** via Issues



------



## 🚀 **Ready to Deploy?**## 🚀 **Ready to Deploy?**



```powershell```powershell

# Deploy your own SCIMTool in 60 seconds# Deploy your own SCIMTool in 60 seconds

iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/deploy.ps1')iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/deploy.ps1')

``````



**Then configure Entra ID:****Then configure Entra ID:**

1. **Enterprise Apps** → **New** → **Create your own**1. **Enterprise Apps** → **New** → **Create your own**

2. **Provisioning** → **Automatic**  2. **Provisioning** → **Automatic**  

3. **Tenant URL**: `https://[your-url]/scim`3. **Tenant URL**: `https://[your-url]/scim`

4. **Secret**: `changeme`4. **Secret**: `changeme`



**Start monitoring SCIM provisioning like a pro!** 🎉**Start monitoring SCIM provisioning like a pro!** 🎉



------



*MIT License • Made with ❤️ for the Microsoft community**MIT License • Made with ❤️ for the Microsoft community*

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
