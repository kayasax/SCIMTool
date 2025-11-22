# 🧪 Testing Pre-Release Changes

This guide explains how to test new features before releasing them to production users.

---

## 🎯 Goals

- ✅ Test changes in real Azure Container App environment
- ✅ Push to GitHub Container Registry without affecting other users
- ✅ No update notifications triggered for production users
- ✅ Easy rollback if issues found

---

## 📋 Workflow Overview

```
1. Create feature branch
   ↓
2. Make changes, commit, push
   ↓
3. GitHub Actions builds test image (test-branch-name tag)
   ↓
4. Deploy test image to YOUR Container App
   ↓
5. Test & verify
   ↓
6. If good → merge to master → create release tag → production build
   If bad → fix, push again (rebuilds test image)
```

---

## 🚀 Quick Start

### Step 1: Push to Test Branch

Create a branch with specific prefix to trigger test build:

```powershell
git checkout -b test/collision-ui-improvements
# OR
git checkout -b dev/pagination-fix
# OR
git checkout -b feature/diff-view
```

Make your changes, then:

```powershell
git add .
git commit -m "feat: add collision testing guide"
git push origin test/collision-ui-improvements
```

**GitHub Actions automatically builds** and pushes image as:
- `ghcr.io/kayasax/scimtool:test-collision-ui-improvements`
- `ghcr.io/kayasax/scimtool:sha-abc123def`

### Step 2: Deploy Test Image to Your Environment

**Option A - Auto-discover (easiest):**
```powershell
.\scripts\test-update.ps1
```

**Option B - Specify app:**
```powershell
.\scripts\test-update.ps1 -ResourceGroup "scimtool-rg" -AppName "scimtool-app-1234"
```

**Option C - Test specific tag:**
```powershell
.\scripts\test-update.ps1 -TestTag "test-collision-ui-improvements"
```

### Step 3: Test & Verify

1. Open your app URL: `https://your-app.azurecontainerapps.io`
2. Test the new features
3. Check Activity Feed, Manual Provision, etc.
4. Monitor logs:
   ```powershell
   az containerapp logs show -n scimtool-app-1234 -g scimtool-rg --tail 50 --follow
   ```

### Step 4: Iterate or Release

**If issues found:**
```powershell
# Fix the code
git add .
git commit -m "fix: handle edge case"
git push origin test/collision-ui-improvements
# Wait for GitHub Actions to rebuild
.\scripts\test-update.ps1  # Deploy again
```

**If all good:**
```powershell
# Merge to master
git checkout master
git merge test/collision-ui-improvements
git push origin master

# Bump version
# Edit api/package.json and web/package.json: "version": "0.8.15"
git add api/package.json web/package.json
git commit -m "chore: bump version to 0.8.15"
git push

# Create release tag (triggers production build with 'latest' tag)
git tag -a v0.8.15 -m "v0.8.15 - Collision testing improvements"
git push origin v0.8.15

# Create GitHub Release (triggers update notifications)
# Go to: https://github.com/kayasax/SCIMTool/releases/new
```

---

## 🔧 Advanced Usage

### Manual Workflow Trigger

Instead of pushing a branch, trigger build manually:

1. Go to: https://github.com/kayasax/SCIMTool/actions/workflows/build-test.yml
2. Click "Run workflow"
3. Enter test tag suffix (e.g., "manual-test")
4. Builds as: `ghcr.io/kayasax/scimtool:test-manual-test`

### Create Test Revision (A/B Testing)

Deploy test version alongside production without replacing it:

```powershell
.\scripts\test-update.ps1 -TestTag "test-diff-view" -CreateRevision
```

This creates a new revision with 0% traffic. To test:
- Traffic splitting: Route X% to test revision
- Direct revision URL: Get specific revision URL from Azure Portal

To rollback:
```powershell
az containerapp revision deactivate -n scimtool-app -g scimtool-rg --revision <test-revision-name>
```

### Rollback to Production

```powershell
.\scripts\test-update.ps1 -TestTag "latest"
```

Or specific version:
```powershell
.\scripts\test-update.ps1 -TestTag "0.8.14"
```

---

## 📊 GitHub Actions Workflows

### `build-test.yml` (Test Images)
**Trigger:** Push to `test/**`, `dev/**`, `feature/**` branches or manual
**Tags:** `test-<branch-name>`, `sha-<commit-hash>`
**Purpose:** Testing before release
**Does NOT tag:** `latest` (no update notifications)

### `build-and-push.yml` (Production Release)
**Trigger:** Push tag matching `v*` (e.g., `v0.8.15`)
**Tags:** `0.8.15`, `0.8`, `latest`
**Purpose:** Official releases
**Does tag:** `latest` (triggers update notifications)

### `publish-ghcr.yml` (Manual Build)
**Trigger:** Manual workflow dispatch
**Tags:** Specified version + `sha-<commit>`
**Purpose:** Emergency builds, hotfixes
**Optional:** Can tag as `latest`

---

## 🎓 Best Practices

### Branch Naming
✅ **Good:**
- `test/collision-guide`
- `dev/pagination-fix`
- `feature/diff-view`

❌ **Avoid:**
- `main`, `master` (reserved for production)
- Random names without prefix (won't trigger test build)

### Testing Checklist
- [ ] Backend compiles (`cd api && npm run build`)
- [ ] Frontend compiles (`cd web && npm run build`)
- [ ] Tests pass (`cd api && npm test`)
- [ ] Local testing done (if possible)
- [ ] Test image deployed to Azure
- [ ] Manual testing in real environment
- [ ] Logs checked for errors
- [ ] Database operations verified

### Version Bumping
- **Patch** (0.8.14 → 0.8.15): Bug fixes, small improvements
- **Minor** (0.8.15 → 0.9.0): New features, non-breaking changes
- **Major** (0.9.0 → 1.0.0): Breaking changes, major redesign

---

## 🔍 Troubleshooting

### Test image not built
**Check:**
1. Branch name has correct prefix (`test/`, `dev/`, `feature/`)
2. GitHub Actions tab: https://github.com/kayasax/SCIMTool/actions
3. Workflow run completed successfully

### Update fails with "image not found"
**Fix:**
1. Verify image exists: https://github.com/kayasax/SCIMTool/pkgs/container/scimtool
2. Check image is public (or configure GHCR credentials)
3. Wait for GitHub Actions to finish building

### App doesn't start after update
**Debug:**
```powershell
# Check logs
az containerapp logs show -n <app-name> -g <rg> --tail 100

# Check revision status
az containerapp revision list -n <app-name> -g <rg> -o table

# Rollback
.\scripts\test-update.ps1 -TestTag "latest"
```

### Changes not visible after update
1. Hard refresh browser (Ctrl+Shift+R)
2. Check deployed image tag matches expected:
   ```powershell
   az containerapp show -n <app-name> -g <rg> --query "properties.template.containers[0].image"
   ```
3. Verify revision is running:
   ```powershell
   az containerapp revision list -n <app-name> -g <rg>
   ```

---

## 📚 Related Documentation

- [admin.md](../admin.md) - Full release workflow
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Azure deployment details
- [GitHub Actions Docs](https://docs.github.com/en/actions)

---

**Last Updated:** November 2025 | **Version:** 0.8.14
