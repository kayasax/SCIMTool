# 🔄 Migration Guide: Adding Persistent Storage to Existing Deployment

## Quick Answer

**You can upgrade in-place!** No need to start fresh. Your existing Container App will be updated to use persistent storage.

## ⚡ Quick Migration (Recommended)

Run this single command:

```powershell
.\scripts\add-persistent-storage.ps1 `
    -ResourceGroup "RG-FR-SCIMTOOL" `
    -AppName "scimtool-ms"
```

This will:
1. ✅ Keep your existing deployment
2. ✅ Add storage account + file share
3. ✅ Link storage to your environment
4. ✅ Update container app with volume mount
5. ⚠️ Restart container (current data lost, but that's already happening)

## 📋 What Happens During Migration

### Before Migration
```
Container App (ephemeral storage)
├── Database: /app/data.db (lost on restart)
└── Data: Temporary, gone on scale-to-zero
```

### After Migration
```
Container App + Azure Files
├── Storage Account: scimtoolmsstor
├── File Share: scimtool-data (5 GiB)
├── Mount: /app/data → Azure Files
└── Database: /app/data/scim.db (persistent)
```

## 🎯 Migration Options

### Option 1: Standard Migration (Easiest)
**Current data loss is acceptable** (it's happening anyway)

```powershell
# Simple upgrade
.\scripts\add-persistent-storage.ps1 `
    -ResourceGroup "RG-FR-SCIMTOOL" `
    -AppName "scimtool-ms"
```

**What it does:**
- Creates storage resources
- Updates container app
- Container restarts with new config
- Fresh start with persistent storage

**Downtime:** ~2-3 minutes during restart

### Option 2: With Backup Attempt
**Try to preserve current data** (may not work if database is locked)

```powershell
# Attempt backup before upgrade
.\scripts\add-persistent-storage.ps1 `
    -ResourceGroup "RG-FR-SCIMTOOL" `
    -AppName "scimtool-ms" `
    -BackupCurrentData
```

**What it does:**
- Tries to backup current database
- Creates storage resources
- Updates container app
- Saves backup to `./backups/scim-backup-TIMESTAMP.db`

**Note:** Backup may fail if database is in use. That's okay since data is already ephemeral.

### Option 3: Fresh Deployment (Clean Slate)
**Want a completely new setup**

```powershell
# Delete old deployment
az containerapp delete --name scimtool-ms --resource-group RG-FR-SCIMTOOL --yes

# Deploy fresh with storage
.\scripts\deploy-azure.ps1 `
    -ResourceGroup "RG-FR-SCIMTOOL" `
    -AppName "scimtool-ms" `
    -Location "francecentral" `
    -ScimSecret "your-secret"
```

**Use this if:**
- You want to change configuration
- You're having issues with current deployment
- You want a clean start

## 🔍 Pre-Migration Checklist

Before running the migration:

1. **Verify current deployment:**
   ```powershell
   az containerapp show --name scimtool-ms --resource-group RG-FR-SCIMTOOL
   ```

2. **Have your SCIM secret ready:**
   - Migration will ask for it
   - Use the same secret as before
   - Can't retrieve from existing deployment

3. **Check Azure subscription:**
   ```powershell
   az account show
   ```

4. **Ensure you're in the right directory:**
   ```powershell
   cd D:\WIP\SCIMTool
   ```

## 📊 Step-by-Step Process

### Step 1: Verify Existing Deployment
```powershell
# Check current app
az containerapp show --name scimtool-ms --resource-group RG-FR-SCIMTOOL --query "name"
```

### Step 2: Run Migration Script
```powershell
.\scripts\add-persistent-storage.ps1 `
    -ResourceGroup "RG-FR-SCIMTOOL" `
    -AppName "scimtool-ms"
```

### Step 3: Wait for Completion
- Script shows progress for each step
- Total time: ~5-10 minutes
- Container will restart automatically

### Step 4: Verify Migration
```powershell
# Check if storage is mounted
az containerapp show --name scimtool-ms --resource-group RG-FR-SCIMTOOL --query "properties.template.volumes"
```

### Step 5: Test Your App
```bash
# Test SCIM endpoint
curl https://scimtool-ms.REGION.azurecontainerapps.io/scim/v2/ServiceProviderConfig
```

## ⚠️ Important Notes

### Data Loss
- **Current data will be lost during migration**
- This is already happening on every restart
- You're not losing anything extra
- Future data will persist

### Configuration
- SCIM secret must be provided again
- Other env vars are preserved
- Current image version is maintained
- Scaling settings unchanged

### Costs
- **Additional cost: ~$0.35/month**
- Storage Account: ~$0.05
- File Share (5 GiB): ~$0.30
- Negligible transaction costs

### Downtime
- **Expected: 2-3 minutes**
- Container restarts during update
- SCIM endpoint temporarily unavailable
- Auto-recovers when ready

## 🔧 Troubleshooting

### "Container App not found"
```powershell
# List all container apps in subscription
az containerapp list --query "[].{name:name, resourceGroup:resourceGroup}" -o table
```

### "Storage account name already exists"
```powershell
# Script will reuse existing storage account
# This is safe and expected
```

### "Failed to link storage to environment"
```powershell
# Check if storage definition already exists
az containerapp env storage list --name ENVIRONMENT_NAME --resource-group RG-FR-SCIMTOOL
```

### "Cannot retrieve SCIM secret"
- Secret values cannot be read from Azure
- You must provide it during migration
- Use the same secret as before

## ✅ Post-Migration Verification

### 1. Check Volume Mounts
```powershell
az containerapp show `
    --name scimtool-ms `
    --resource-group RG-FR-SCIMTOOL `
    --query "properties.template.{volumes: volumes, volumeMounts: containers[0].volumeMounts}"
```

Expected output:
```json
{
  "volumes": [
    {
      "name": "data-volume",
      "storageType": "AzureFile",
      "storageName": "scimtool-storage"
    }
  ],
  "volumeMounts": [
    {
      "volumeName": "data-volume",
      "mountPath": "/app/data"
    }
  ]
}
```

### 2. Check Database Location
```powershell
az containerapp exec `
    --name scimtool-ms `
    --resource-group RG-FR-SCIMTOOL `
    --command "ls -la /app/data"
```

Expected: `scim.db` file present

### 3. Test Persistence
```powershell
# Scale to zero
az containerapp update --name scimtool-ms --resource-group RG-FR-SCIMTOOL --min-replicas 0

# Wait 5 minutes for scale-down

# Scale back up
az containerapp update --name scimtool-ms --resource-group RG-FR-SCIMTOOL --min-replicas 1

# Check if data persists (it should!)
```

## 🎉 Success Indicators

After successful migration:
- ✅ Storage account exists: `scimtoolmsstor`
- ✅ File share created: `scimtool-data`
- ✅ Volume mounted at: `/app/data`
- ✅ Database persists: `/app/data/scim.db`
- ✅ Container app running normally
- ✅ SCIM endpoint responding

## 📞 Need Help?

If you encounter issues:
1. Check the script output for specific errors
2. Verify Azure CLI is authenticated
3. Ensure resource group and app names are correct
4. Check Azure Portal for deployment status
5. Review container app logs

---

**Recommendation:** Use **Option 1 (Standard Migration)** for simplest, fastest upgrade with minimal risk.
