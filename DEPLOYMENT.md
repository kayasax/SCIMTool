# 🚀 SCIMTool Deployment Guide

**For Microsoft colleagues who want to deploy their own SCIMTool instance**

## 📋 Prerequisites

- Azure subscription with Container Apps access
- Azure CLI installed and authenticated
- PowerShell 7+ (Windows) or PowerShell Core (Linux/Mac)

## ⚡ One-Command Deployment

```powershell
# Clone the repository
git clone [your-scimtool-repo-url]
cd SCIMTool

# Deploy everything (SCIM server + monitoring web UI)
.\setup.ps1 -DeployContainer
```

## 🎯 What You Get

After deployment, you'll have:

- **📊 Monitoring Web UI**: `https://[your-container-url]/`
  - No authentication required
  - Real-time provisioning logs
  - Search and filter capabilities
  - Request/response details

- **🔗 SCIM API**: `https://[your-container-url]/scim`
  - Microsoft Entra compatible
  - Bearer token authentication
  - All SCIM 2.0 operations

## 🔧 Microsoft Entra Configuration

1. **Azure Portal** → **Entra ID** → **Enterprise Applications**
2. **+ New application** → **Create your own application**
3. **Name**: `SCIMTool - [Your-Name]`
4. **Type**: `Non-gallery application`
5. **Provisioning** → **Get started**
6. **Mode**: `Automatic`
7. **Tenant URL**: `https://[your-container-url]/scim`
8. **Secret Token**: `S@g@r2011`
9. **Test Connection** → **Save**

## 👥 Team Sharing

Simply share your container URL with colleagues:
- They can access the monitoring UI directly (no setup required)
- Full real-time visibility into your provisioning activities
- No local installation needed

## 🔄 Updates

To update your deployment:
```powershell
git pull
.\setup.ps1 -DeployContainer
```

## 🆘 Support

- Check the monitoring UI for real-time error details
- Review Azure Container Apps logs if needed
- All SCIM requests/responses are logged automatically

---

**✅ That's it! Your SCIMTool instance is ready for production use.**