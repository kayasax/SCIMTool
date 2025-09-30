# 🎉 SCIMTool v0.6.0 - Persistent Storage Support

This release adds **persistent storage** support to ensure your SCIM monitoring data survives container restarts and scale-to-zero events.

## ✨ New Features

### Persistent Storage
- **Azure Files Integration**: Data now persists in Azure Files (SMB) storage
- **Automatic Migration**: Database schema migrations run automatically on container startup
- **Migration Script**: `add-persistent-storage.ps1` for upgrading existing deployments
- **No Data Loss**: Survives container restarts, scale-to-zero, and redeployments

### Enhanced Activity Parser
- Detailed change descriptions showing what exactly changed (e.g., "displayName: 'Old Name' → 'New Name'")
- Group member changes now show actual user names instead of just IDs
- URN path extraction for complex SCIM schema attributes
- Better handling of enterprise user extensions

## 🐛 Bug Fixes

- **Registry Authentication**: Fixed managed identity authentication issues with public registries (ghcr.io)
- **PowerShell 5 Compatibility**: Scripts now work correctly in PowerShell 5.1 (UTF-8 BOM encoding)
- **Error Handling**: Improved error messages and handling in deployment scripts
- **Storage Account Checks**: Use `az storage account list` instead of `show` to avoid unnecessary errors

## 📚 Documentation

- Added [Persistent Storage Implementation Guide](docs/persistent-storage-implementation.md)
- Added [Migration Guide](docs/MIGRATION-GUIDE.md) for upgrading existing deployments
- Updated deployment scripts with best practices

## 🚀 Deployment

### New Deployments (with persistent storage)
```powershell
.\scripts\deploy-azure-full.ps1 `
    -ResourceGroup "your-rg" `
    -AppName "scimtool" `
    -Location "francecentral" `
    -ScimSecret "your-secret"
```

### Upgrading Existing Deployments
```powershell
.\scripts\add-persistent-storage.ps1 `
    -ResourceGroup "your-rg" `
    -AppName "scimtool"
```

### Manual Update to v0.6.0
```powershell
az containerapp update `
    --name "scimtool" `
    --resource-group "your-rg" `
    --image "ghcr.io/kayasax/scimtool:0.6.0"
```

## 💰 Cost Impact

Persistent storage adds approximately **$0.35/month**:
- Storage Account: ~$0.05/month
- File Share (5 GiB): ~$0.30/month

## 🔧 Technical Details

- **Storage Type**: Azure Files (SMB) mounted at `/app/data`
- **Database Location**: `/app/data/scim.db` (persistent) or `./data.db` (ephemeral)
- **Automatic Migrations**: `npx prisma migrate deploy` runs on container startup
- **Volume Mount**: Conditional configuration in Bicep templates

## 📦 Docker Image

- **Registry**: `ghcr.io/kayasax/scimtool`
- **Tags**: `0.6.0`, `latest`
- **Size**: ~380MB (optimized multi-stage build)

## 🙏 Breaking Changes

⚠️ **Important**: If upgrading from v0.5.0 or earlier without persistent storage, existing data will be lost. Use the migration script to add persistent storage and preserve future data.

## 📝 Full Changelog

See the [commit history](https://github.com/kayasax/SCIMTool/compare/v0.5.0...v0.6.0) for detailed changes.

---

**Upgrade Recommendation**: Highly recommended for production deployments to prevent data loss during container restarts or scale-to-zero events.
