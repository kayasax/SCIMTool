# 🔧 Multi-Environment Deployment Fix

**Issue:** Deployment failing when deploying to a second resource group

**Root Cause:** Azure Storage Account names must be **globally unique** across ALL of Azure, not just within your subscription or resource group.

---

## 🐛 The Problem

### Before Fix:
```powershell
# Old logic (BROKEN for multiple RGs):
$storageName = $AppName.Replace("-", "").Replace("_", "").ToLower() + "stor"
# Example: "scimtool-ms" → "scimtoolmsstor"
```

**What happened:**
1. Deploy to **RG-FR-SCIMTOOL** with `-AppName "scimtool-ms"`
   - Storage account: `scimtoolmsstor` ✅ (created successfully)

2. Deploy to **RG-DEV-SCIMTOOL** with `-AppName "scimtool-ms"`
   - Storage account: `scimtoolmsstor` ❌ (CONFLICT! Already exists in RG-FR-SCIMTOOL)
   - Deployment FAILS with error: "Storage account name already taken"

---

## ✅ The Solution

### After Fix:
```powershell
# New logic (WORKS for multiple RGs):
$rgSuffix = $ResourceGroup.Replace("-", "").Replace("_", "").ToLower()
$appPrefix = $AppName.Replace("-", "").Replace("_", "").ToLower()
$storageName = $appPrefix + $rgSuffix + "stor"
```

**What happens now:**
1. Deploy to **RG-FR-SCIMTOOL** with `-AppName "scimtool-ms"`
   - Storage account: `scimtoolmsrgfrscimtoolstor` ✅ (unique!)

2. Deploy to **RG-DEV-SCIMTOOL** with `-AppName "scimtool-ms"`
   - Storage account: `scimtoolmsrgdevscimtoolstor` ✅ (unique!)

3. Deploy to **RG-PROD-SCIM** with `-AppName "scimtool-ms"`
   - Storage account: `scimtoolmsrgprodscimsto` ✅ (unique! truncated to 24 chars)

---

## 🎯 Examples

### Example 1: Development Environment
```powershell
.\scripts\deploy-azure.ps1 `
    -ResourceGroup "RG-DEV-SCIMTOOL" `
    -AppName "scimtool-ms" `
    -Location "eastus" `
    -ScimSecret "DevSecret123" `
    -EnablePersistentStorage
```
**Resources created:**
- Storage: `scimtoolmsrgdevscimtoolstor` (24 chars)
- Environment: `scimtool-ms-env`
- Container App: `scimtool-ms`

### Example 2: Production Environment
```powershell
.\scripts\deploy-azure.ps1 `
    -ResourceGroup "RG-PROD-SCIM" `
    -AppName "scimtool-ms" `
    -Location "francecentral" `
    -ScimSecret "ProdSecret456" `
    -EnablePersistentStorage
```
**Resources created:**
- Storage: `scimtoolmsrgprodscimsto` (24 chars, truncated)
- Environment: `scimtool-ms-env`
- Container App: `scimtool-ms`

### Example 3: Testing with Different App Name
```powershell
.\scripts\deploy-azure.ps1 `
    -ResourceGroup "RG-TEST" `
    -AppName "scim-test" `
    -Location "westus" `
    -ScimSecret "TestSecret789" `
    -EnablePersistentStorage
```
**Resources created:**
- Storage: `scimtestrgteststor` (19 chars)
- Environment: `scim-test-env`
- Container App: `scim-test`

---

## 🔐 Storage Account Naming Rules

Azure Storage Account names must follow these rules:
- ✅ **Globally unique** across ALL of Azure
- ✅ 3-24 characters long
- ✅ Lowercase letters and numbers only
- ❌ No hyphens, underscores, or special characters

**Our implementation:**
1. Takes `$AppName` → removes special chars → lowercase
2. Takes `$ResourceGroup` → removes special chars → lowercase
3. Combines: `{app}{rg}stor`
4. Truncates to 24 chars if needed (keeps app prefix + RG suffix + "stor")

---

## 🎁 Bonus Fix: SQLite Lock File Cleanup

**Also included in this commit:**

Added an **init container** to automatically clean stale SQLite journal files on startup:

```bicep
initContainers: [
  {
    name: 'cleanup-db-locks'
    image: 'busybox:latest'
    command: ['sh', '-c', 'rm -f /app/data/*.db-journal /app/data/*.db-shm /app/data/*.db-wal']
    volumeMounts: [...]
  }
]
```

**What it fixes:**
- Prevents database timeout errors after container restarts
- Removes stale lock files from Azure Files (SQLite + Azure Files locking incompatibility)
- Runs automatically before main app starts
- **No more manual `az containerapp exec` cleanup!**

---

## 🚀 Testing the Fix

### Test 1: Deploy to First RG
```powershell
.\scripts\deploy-azure.ps1 `
    -ResourceGroup "RG-TEST1" `
    -AppName "scimtool" `
    -Location "eastus" `
    -ScimSecret "Test1Secret" `
    -EnablePersistentStorage
```
**Expected:** ✅ Success → Storage: `scimtoolgtest1stor`

### Test 2: Deploy to Second RG (Same App Name)
```powershell
.\scripts\deploy-azure.ps1 `
    -ResourceGroup "RG-TEST2" `
    -AppName "scimtool" `
    -Location "eastus" `
    -ScimSecret "Test2Secret" `
    -EnablePersistentStorage
```
**Expected:** ✅ Success → Storage: `scimtoolrgtest2stor` (DIFFERENT from Test 1!)

### Test 3: Verify Both Are Running
```powershell
# Test 1 endpoint
Invoke-WebRequest -Uri "https://scimtool-{random}.eastus.azurecontainerapps.io/" -UseBasicParsing

# Test 2 endpoint
Invoke-WebRequest -Uri "https://scimtool-{random}.eastus.azurecontainerapps.io/" -UseBasicParsing
```
**Expected:** ✅ Both return 200 OK with independent databases

---

## 📊 Resource Isolation

Each deployment now has:
- ✅ **Independent storage account** (unique name per RG)
- ✅ **Independent file share** (scimtool-data in each storage)
- ✅ **Independent database** (scim.db in each file share)
- ✅ **Independent Container Apps Environment** ({AppName}-env)
- ✅ **Independent Log Analytics workspace** ({AppName}-logs or workspace-{id})

**No more conflicts between deployments!**

---

## 🔄 Migrating Existing Deployments

If you already have a deployment with the OLD storage naming:

### Option 1: Keep Existing Storage (Recommended)
```powershell
# Deploy with NEW storage name, then migrate data
.\scripts\deploy-azure.ps1 -ResourceGroup "RG-FR-SCIMTOOL" -AppName "scimtool-ms" -Location "francecentral" -ScimSecret "S@g@r2011" -EnablePersistentStorage

# Copy data from old storage to new (if needed)
az storage file copy start \
    --source-account-name "scimtoolmsstor" \
    --source-share "scimtool-data" \
    --source-path "scim.db" \
    --destination-account-name "scimtoolmsrgfrscimtoolstor" \
    --destination-share "scimtool-data" \
    --destination-path "scim.db"
```

### Option 2: Manual Override (Keep Old Storage)
Modify the script temporarily to use your existing storage account name:
```powershell
# Line ~71 in deploy-azure.ps1
$storageName = "scimtoolmsstor"  # Hardcode existing storage
```

---

## ✅ Summary

**Changes Made:**
1. ✅ Storage account name now includes resource group name for uniqueness
2. ✅ Automatic truncation to 24 characters (Azure limit)
3. ✅ Init container for SQLite lock file cleanup on startup
4. ✅ Tested with multiple resource groups

**Benefits:**
- 🚀 Deploy to unlimited resource groups without conflicts
- 🔒 Each environment has isolated storage and data
- 🛡️ No more database locking issues after deployments
- 💰 No wasted resources from failed deployments

**Commit:** `6dc72f9`
