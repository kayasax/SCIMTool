# 📊 Persistent Storage Analysis for SCIMTool

## 🔍 Current Issue: Data Loss on Container Restart

**Confirmed Problem**: SQLite database is stored in ephemeral container storage and is lost when:
- Container App scales to zero
- Container updates/restarts
- Any replica restart

## 🆕 Microsoft.FileShares Preview - Analysis

### ✅ What It Is
- **New resource provider** (`Microsoft.FileShares`) announced Sept 9, 2025
- File shares as **top-level Azure resources** (like VMs, disks)
- **No Storage Account required** - simplified management
- Direct integration with Azure ecosystem (templates, policies, tags, cost management)

### ❌ Current Limitations for SCIMTool

| Feature | Status | Impact |
|---------|--------|--------|
| **SMB Protocol** | ❌ Not available in preview | **BLOCKER** - Can't use for SQLite |
| **NFS Protocol** | ✅ Available | ❌ SQLite requires SMB/local filesystem |
| **HDD Storage** | ❌ Not available (SSD only) | Cost concern |
| **Provisioned v2 Billing** | ✅ Only option | Different cost model |
| **Regional Availability** | ⚠️ Limited regions | May not be available everywhere |
| **Production Ready** | ❌ Preview only | Risk for production workloads |

### 💰 Cost Implications
- **Microsoft.FileShares**: SSD-only with Provisioned v2 billing
  - Must provision capacity, IOPS, and throughput upfront
  - Minimum: 32 GiB (~$6-12/month estimated)
  - Higher cost than classic SMB shares

### 🎯 Verdict for SCIMTool
**❌ NOT SUITABLE YET** because:
1. **SMB not supported** - Preview only has NFS, SQLite needs SMB
2. **Preview status** - Not recommended for production
3. **Higher cost** - SSD provisioned v2 vs pay-as-you-go SMB
4. **Limited regions** - May not be available where customers deploy

## ✅ Recommended Solution: Classic Azure Files (SMB)

### Why Classic Azure Files?

| Factor | Classic Azure Files | Microsoft.FileShares |
|--------|-------------------|---------------------|
| **SMB Support** | ✅ Yes | ❌ No (preview) |
| **Production Ready** | ✅ GA | ❌ Preview |
| **Cost** | ✅ Pay-as-you-go HDD (~$0.06/GB) | ❌ SSD provisioned (~$0.20+/GB) |
| **Regional Availability** | ✅ All regions | ❌ Limited |
| **Container Apps Support** | ✅ Full support | ⚠️ Limited |
| **SQLite Compatibility** | ✅ Works perfectly | ❌ NFS only |

### Implementation Approach

#### Phase 1: Add Azure Files Support (Classic)
1. **Create Bicep Module** for Azure Files
   - Storage Account (Standard tier, LRS/ZRS)
   - File Share with SMB protocol
   - Minimal size: 5 GiB (~$0.30/month)

2. **Update Container App Bicep**
   - Add storage mount configuration
   - Mount Azure Files share to `/app/data`
   - Update DATABASE_URL to use mounted path

3. **Update Deployment Scripts**
   - `deploy-azure.ps1`: Create storage account + file share
   - `setup.ps1`: Handle storage account creation
   - Handle existing deployments (migration path)

4. **Testing**
   - Verify data persistence across restarts
   - Test scale-to-zero scenarios
   - Performance validation

#### Phase 2: Documentation & Migration
1. **Update README.md**
   - Document persistent storage feature
   - Cost implications (~$5-8/month total)
   - Migration guide for existing deployments

2. **Create Migration Script**
   - Backup existing data (if any)
   - Update infrastructure
   - Restore data to new storage

3. **Update DEPLOYMENT.md**
   - Architecture diagrams with storage
   - Troubleshooting guide
   - Performance considerations

## 📋 Implementation Plan

### Files to Create/Modify

#### 1. New Bicep Module: `infra/storage.bicep`
```bicep
// Azure Storage Account + File Share for persistent SQLite database
// Uses classic Microsoft.Storage provider (GA, reliable)
```

#### 2. Update: `infra/containerapp.bicep`
```bicep
// Add volumeMounts configuration
// Add storage reference
```

#### 3. Update: `scripts/deploy-azure.ps1`
```powershell
# Add storage account creation
# Add file share creation
# Link storage to Container App environment
```

#### 4. Update: `scripts/update-scimtool-func.ps1`
```powershell
# Handle storage configuration during updates
# Preserve data during container updates
```

#### 5. New Script: `scripts/migrate-to-persistent-storage.ps1`
```powershell
# Backup existing data
# Create storage resources
# Restore data to new storage
```

### Estimated Costs

| Component | Before | After | Delta |
|-----------|--------|-------|-------|
| Container App | ~$5-15/month | ~$5-15/month | $0 |
| Storage Account | $0 | ~$0.05/month | +$0.05 |
| File Share (5 GiB) | $0 | ~$0.30/month | +$0.30 |
| Transactions | $0 | ~$0.01/month | +$0.01 |
| **Total** | **~$5-15/month** | **~$5.40-15.40/month** | **+~$0.36/month** |

### Migration Strategy

**For New Deployments:**
- Automatically create storage account + file share
- Mount on first deployment
- No migration needed

**For Existing Deployments:**
1. Create storage resources
2. Update container app configuration
3. Restart container (data loss acceptable since it's already happening)
4. Future updates preserve data

## 🔄 Future: Microsoft.FileShares

**When to Revisit:**
- ✅ SMB protocol support added
- ✅ General Availability (GA) announced
- ✅ Cost-competitive with classic Azure Files
- ✅ Available in all major regions

**Benefits When Available:**
- Simplified management (no storage account)
- Better integration with Azure tooling
- Potential performance improvements
- Granular security per share

## 📝 Next Steps

1. **Get User Approval** for implementation plan
2. **Create Bicep module** for storage account + file share
3. **Update deployment scripts** with storage provisioning
4. **Test thoroughly** with scale-to-zero scenarios
5. **Document migration** path for existing users
6. **Release as v0.6.0** with breaking change notice

## ⚠️ Breaking Change Notice

**For Existing Deployments:**
- Current data will be lost during upgrade (already happens on restart)
- Users should be notified to backup if they have important historical data
- After upgrade, data persists across restarts/updates

**Communication:**
- GitHub release notes
- README update
- Migration guide
- Deployment script warnings

---

**Decision:** Implement classic Azure Files (SMB) now, monitor Microsoft.FileShares for future migration when SMB support is added.
