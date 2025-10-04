# 🚀 SCIMTool Deployment Options

This document covers all deployment methods for SCIMTool. For the quickest start, use the container deployment method described in the main README.

---

## 📦 **Container Deployment** (Recommended)

### **Azure Container Apps** (Production Ready)
Deploy to Azure Container Apps for production use with automatic scaling and enterprise features:

```powershell
# Deploy with the included script
.\scripts\deploy-azure.ps1 -ResourceGroup "scim-rg" -AppName "scimtool-prod" -ScimSecret "your-secure-secret"

# Or use the quick deploy script
iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/deploy.ps1')
```

**Benefits:**
- **🔒 Enterprise Security**: Automatic HTTPS, managed certificates, secure secrets, and private storage endpoints by default
- **📈 Smart Scaling**: Automatically scales from 0 to handle any load
- **💰 Cost Efficient**: Pay only when active - perfect for testing and production
- **🌐 Global Reach**: Deploy to any Azure region worldwide
- **🔧 Zero Maintenance**: Automatic updates, monitoring, and health checks

> ℹ️ **New in v0.8.4+:** `deploy-azure.ps1` now provisions an isolated virtual network, private DNS zone, and blob storage private endpoint so the snapshot container never requires public access. If you're upgrading an older deployment, recreate the Container Apps environment to pick up the VNet integration.

### **Docker Compose** (Self-Hosted)
For on-premises or custom cloud deployments:

```yaml
version: '3.8'
services:
  scimtool:
    image: ghcr.io/kayasax/scimtool:latest
    ports:
      - "3000:3000"
    environment:
      - SCIM_SHARED_SECRET=your-secret-here
      - DATABASE_URL=file:/app/data/scim.db
    volumes:
      - ./data:/app/data
```

```powershell
# Start with Docker Compose
docker-compose up -d
```

### **Standalone Docker**
Simple Docker deployment:

```powershell
# Pull and run the container
docker run -d -p 3000:3000 \
  -e SCIM_SHARED_SECRET=your-secret \
  -v scim-data:/app/data \
  ghcr.io/kayasax/scimtool:latest
```

---

## 🌐 **Hosted Service** (Zero Setup)

For immediate testing and team collaboration:

### **Free Hosted Instance**
- **URL**: https://scimtool.azurewebsites.net
- **No Setup Required**: Just configure your Enterprise App to point to this URL
- **Team Sharing**: Multiple team members can use the same instance
- **Perfect For**: Testing, demonstrations, quick prototyping

### **Configuration**
1. **Tenant URL**: `https://scimtool.azurewebsites.net/scim`
2. **Secret Token**: `changeme` (default) or contact us for a custom token
3. **Monitoring URL**: `https://scimtool.azurewebsites.net`

---

## 🔧 **Local Development**

For developers who want to customize or contribute to SCIMTool:

### **Prerequisites**
- Node.js 18+ and npm
- Git
- PowerShell (for Windows) or bash (for Linux/Mac)

### **Quick Start**
```powershell
# Clone and setup
git clone https://github.com/kayasax/SCIMTool.git
cd SCIMTool
.\setup.ps1 -TestLocal
```

### **Manual Setup**
```powershell
# Backend (API)
cd api
npm install
npm run build
npm run start:dev

# Frontend (Web UI) - In another terminal
cd web
npm install
npm run dev
```

### **Environment Configuration**
Create `api/.env`:
```env
SCIM_SHARED_SECRET=changeme
PORT=3000
DATABASE_URL=file:./dev.db
CORS_ORIGINS=http://localhost:5173
```

Create `web/.env`:
```env
VITE_API_BASE=http://localhost:3000
VITE_SCIM_TOKEN=changeme
```

### **Development URLs**
- **SCIM API**: http://localhost:3000/scim
- **Web UI**: http://localhost:5173
- **Monitoring**: http://localhost:5173

---

## 📊 **Deployment Comparison**

| Method | Setup Time | Cost | Scalability | Maintenance | Best For |
|--------|------------|------|-------------|-------------|----------|
| **Hosted Service** | 0 min | Free | Shared | None | Testing, demos |
| **Azure Container Apps** | 5 min | ~$10/month | Auto | Minimal | Production |
| **Docker Compose** | 10 min | Infrastructure cost | Manual | Medium | Self-hosted |
| **Local Development** | 15 min | Free | Single instance | High | Development |

---

## 🛠️ **Troubleshooting**

### **Common Issues**

| Issue | Solution |
|-------|----------|
| Container won't start | Check environment variables and port availability |
| SCIM connection fails | Verify URL is accessible and secret token matches |
| UI not loading | Check CORS configuration and API base URL |
| Database errors | Ensure data directory is writable |

### **Debugging Commands**
```powershell
# Check container logs
docker logs <container-id>

# Test SCIM endpoint
curl -H "Authorization: Bearer your-secret" https://your-url/scim/Users

# Check container health
docker inspect <container-id>
```

---

## 🔗 **Next Steps**

Once deployed, configure your Microsoft Entra Enterprise Application:

1. **Create Enterprise App** in Azure Portal
2. **Set Tenant URL** to your deployment endpoint + `/scim`
3. **Configure Secret Token** to match your deployment
4. **Test Connection** and start provisioning
5. **Monitor Activity** through the web dashboard

For detailed configuration steps, see the main [README.md](./README.md).

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