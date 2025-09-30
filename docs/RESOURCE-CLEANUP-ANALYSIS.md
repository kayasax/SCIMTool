# 🧹 Azure Resource Cleanup Analysis - RG-FR-SCIMTOOL

**Date:** September 30, 2025  
**Resource Group:** RG-FR-SCIMTOOL  
**Analysis:** Which resources are still needed vs obsolete

---

## 📋 Current Resources Inventory

| Resource Name | Type | Status | Verdict |
|--------------|------|--------|---------|
| **ca05c8ab0efa3cr** | Container Registry (ACR) | ❌ OBSOLETE | **DELETE** |
| **scimtool-migrate** | Container App Job | ⚠️ ORPHANED | **DELETE** |
| **scimtool-ms** | Container App | ✅ ACTIVE | **KEEP** |
| **scimtool-ms-env** | Container Apps Environment | ✅ ACTIVE | **KEEP** |
| **scimtool-ms-logs** | Log Analytics Workspace | ❌ UNUSED | **DELETE** |
| **workspace-kk0u** | Log Analytics Workspace | ✅ ACTIVE | **KEEP** |
| **scimtoolmsstor** | Storage Account | ✅ ACTIVE | **KEEP** |

---

## 🔍 Detailed Analysis

### ❌ 1. Container Registry (ca05c8ab0efa3cr) - **DELETE**

**Why it exists:**
- Created during initial deployment when using Azure Container Registry

**Why it's obsolete:**
- ✅ **Confirmed:** Current deployment uses `ghcr.io/kayasax/scimtool:latest`
- ✅ **Evidence:** `deploy-azure.ps1` line 86, 251, 271 all reference `ghcr.io`
- ✅ **Active image:** Container App is running `ghcr.io/kayasax/scimtool:latest`

**Bicep reference:**
- `infra/acr.bicep` exists but is NOT used by current deployment scripts

**Cost impact:** ~$5-15/month for Basic tier ACR

**Action:**
```powershell
# Safe to delete
az acr delete --name ca05c8ab0efa3cr --resource-group RG-FR-SCIMTOOL --yes
```

**Recommendation:** Also delete `infra/acr.bicep` from repo since it's no longer used

---

### ⚠️ 2. Container App Job (scimtool-migrate) - **DELETE**

**Why it exists:**
- Likely created for database migration tasks during early development

**Why it's orphaned:**
- No references in current deployment scripts
- Not mentioned in README or documentation
- No clear purpose with current hybrid storage approach (SQLite + Azure Files)

**Risk assessment:** LOW - Jobs are one-time execution, not tied to running app

**Action:**
```powershell
# Safe to delete if not actively used
az containerapp job delete --name scimtool-migrate --resource-group RG-FR-SCIMTOOL --yes
```

**Recommendation:** Remove if you're not actively running migration jobs

---

### ❌ 3. Log Analytics Workspace (scimtool-ms-logs) - **DELETE**

**Why there are TWO workspaces:**
- **workspace-kk0u**: Currently ACTIVE (customerId: `ff1c3d72-f8ae-406c-a4a4-1b877689358d`)
- **scimtool-ms-logs**: NOT USED (customerId: `bac72acd-0462-4b02-88ef-ad97187bd487`)

**Evidence:**
```powershell
# Container Apps Environment is using workspace-kk0u:
az containerapp env show --name scimtool-ms-env --query "properties.appLogsConfiguration.logAnalyticsConfiguration.customerId"
# Output: "ff1c3d72-f8ae-406c-a4a4-1b877689358d" (matches workspace-kk0u)
```

**Why this happened:**
- Likely created during initial deployment attempts
- Environment ended up using a different workspace
- **scimtool-ms-logs** was created by Bicep but not actually attached

**Cost impact:** ~$2-5/month for idle workspace with 30-day retention

**Action:**
```powershell
# Safe to delete - not in use
az monitor log-analytics workspace delete --workspace-name scimtool-ms-logs --resource-group RG-FR-SCIMTOOL --yes
```

---

## ✅ Resources to KEEP

### ✅ scimtool-ms (Container App)
- **Status:** Running latest revision (scimtool-ms--0000020)
- **Image:** `ghcr.io/kayasax/scimtool:latest`
- **Health:** ✅ Responding on port 3000
- **Storage:** Mounted Azure File share at `/app/data` (9.0 MB database)

### ✅ scimtool-ms-env (Container Apps Environment)
- **Status:** Active with consumption plan
- **Logs:** Connected to **workspace-kk0u**
- **Apps:** Hosts scimtool-ms container app

### ✅ workspace-kk0u (Log Analytics Workspace)
- **Status:** ACTIVELY USED by Container Apps Environment
- **CustomerId:** `ff1c3d72-f8ae-406c-a4a4-1b877689358d`
- **Retention:** 30 days
- **SKU:** PerGB2018

### ✅ scimtoolmsstor (Storage Account)
- **Status:** Active with persistent SQLite database
- **File Share:** scimtool-data (contains scim.db - 9.0 MB)
- **Critical:** DO NOT DELETE - contains all provisioning history

---

## 🚀 Cleanup Commands (Safe Execution)

```powershell
# 1. Delete obsolete ACR (switched to ghcr.io)
az acr delete --name ca05c8ab0efa3cr --resource-group RG-FR-SCIMTOOL --yes

# 2. Delete orphaned migration job (if not needed)
az containerapp job delete --name scimtool-migrate --resource-group RG-FR-SCIMTOOL --yes

# 3. Delete unused Log Analytics workspace
az monitor log-analytics workspace delete --workspace-name scimtool-ms-logs --resource-group RG-FR-SCIMTOOL --yes

# Verify remaining resources
az resource list --resource-group RG-FR-SCIMTOOL --output table
```

**Expected result:** 4 resources remaining
1. scimtool-ms (Container App)
2. scimtool-ms-env (Container Apps Environment)
3. workspace-kk0u (Log Analytics - ACTIVE)
4. scimtoolmsstor (Storage Account)

---

## 💰 Cost Impact

**Before cleanup:** ~$15-25/month
- ACR Basic: ~$5/month
- Unused LAW: ~$2-5/month
- Migration job (idle): ~$0-2/month
- Active resources: ~$8-13/month

**After cleanup:** ~$8-13/month (47% reduction!)
- Container App (mostly idle): ~$3-5/month
- Storage: ~$1-2/month
- Log Analytics (active): ~$2-3/month
- Container Apps Environment: ~$2-3/month

---

## 📝 Follow-up Actions

### Code Repository Cleanup
```powershell
# Delete obsolete Bicep template
git rm infra/acr.bicep
git commit -m "chore: Remove obsolete ACR Bicep template (now using ghcr.io)"
git push
```

### Documentation Updates
- ✅ README already mentions ghcr.io (no changes needed)
- ✅ Deployment script uses ghcr.io (no changes needed)
- ⚠️ Update any old docs that mention Azure Container Registry

### Bicep Template Audit
Check if `containerapp-env.bicep` creates the correct workspace name or if we should standardize on one naming convention.

---

## ⚠️ CRITICAL - Do NOT Delete

1. **scimtoolmsstor** - Contains your 9.0 MB SQLite database with ALL provisioning history
2. **workspace-kk0u** - Active Log Analytics workspace for Container Apps monitoring
3. **scimtool-ms-env** - Container Apps Environment (required for running the app)
4. **scimtool-ms** - The actual running application

---

## 🎯 Summary

**Safe to delete immediately:**
- ❌ ca05c8ab0efa3cr (ACR - obsolete, using ghcr.io now)
- ❌ scimtool-ms-logs (unused Log Analytics workspace)
- ⚠️ scimtool-migrate (orphaned migration job - verify first)

**Estimated savings:** ~$7-12/month (47% cost reduction)

**Time to execute:** < 2 minutes

**Risk level:** LOW - None of these resources are in active use
