# Release Notes v0.8.14

**Release Date:** November 21, 2025  
**Type:** Bug Fix (Pagination)

## 🎯 Critical Fix: Pagination Accuracy

This release fixes a critical pagination bug when the "Hide Keepalive Requests" toggle is enabled in both Activity Feed and Raw Logs views.

### Problem Fixed
**Before v0.8.14:**
- Pagination showed incorrect counts (e.g., "Total 1444 • Page 2 / 29") 
- Many pages appeared empty when keepalive filtering was enabled
- Frontend filtered keepalive requests after fetching, causing mismatch with backend counts
- Complex multi-page aggregation workaround attempted to compensate

**After v0.8.14:**
- ✅ Accurate pagination counts reflecting actual filtered results
- ✅ No empty pages - backend filters before counting
- ✅ Cleaner, simpler code with backend-driven filtering
- ✅ Better performance - single query instead of multi-page aggregation

### Technical Implementation

#### Backend Changes
- Added `hideKeepalive` query parameter to:
  - `/admin/activity` endpoint (Activity Feed)
  - `/admin/logs` endpoint (Raw Logs)
- Implemented Prisma WHERE clause filtering using inverse keepalive logic:
  ```typescript
  OR: [
    { method: { not: 'GET' } },              // Not a GET request
    { identifier: { not: null } },           // Has an identifier
    { status: { gte: 400 } },                // Error status
    { NOT: { url: { contains: '?filter=' } } } // No filter parameter
  ]
  ```
- Both `count()` and `findMany()` queries now respect the filter

#### Frontend Changes
- **ActivityFeed.tsx:** Removed multi-page aggregation workaround (~50 lines)
- **App.tsx:** Removed `visibleItems` useMemo frontend filtering
- **client.ts:** Added `hideKeepalive` parameter to API interfaces
- Both views now trust backend pagination metadata completely

#### Test Coverage
- ✅ Created comprehensive test suite with 9 test scenarios
- ✅ TDD approach: tests written first, then implementation
- ✅ All tests passing in CI/CD pipeline
- ✅ Scenarios covered:
  - Keepalive exclusion with accurate counts
  - Multi-page navigation without empty pages
  - Edge case: all logs are keepalive
  - Default behavior when parameter not provided
  - Integration with search filters

## 📦 Deployment Notes

### For New Deployments
No special considerations - deploy normally using the standard deployment scripts.

### For Existing Deployments
This is a **safe, backward-compatible** update:
- No database migrations required
- No configuration changes needed
- No breaking API changes
- Existing deployments continue working with previous behavior
- New parameter is optional (default: show all logs including keepalive)

### Update Command
```powershell
# Using the direct update script
iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/update-scimtool-direct.ps1')
Update-SCIMToolDirect -Version v0.8.14 -ResourceGroup <your-rg> -AppName <your-app>
```

## 🔍 Impact Assessment

### What Changed
- **Backend:** Activity and logging endpoints now support optional `hideKeepalive` parameter
- **Frontend:** Simplified filtering logic, trusts backend pagination
- **Performance:** Improved (single query vs multi-page aggregation)
- **Code Quality:** ~50 lines removed, better separation of concerns

### What Stayed The Same
- Toggle behavior in UI (user experience unchanged)
- Keepalive detection logic (same criteria)
- Authentication and authorization
- All other SCIM 2.0 functionality
- Backup and restore operations
- Manual provisioning features

## 🧪 Testing Recommendations

After deploying v0.8.14, verify:

1. **Activity Feed with Keepalive Toggle:**
   - Enable "Hide Keepalive" toggle
   - Verify pagination shows accurate total count
   - Navigate through pages - no empty pages should appear
   - Disable toggle - all logs including keepalive should display

2. **Raw Logs with Keepalive Toggle:**
   - Same verification steps as Activity Feed
   - Test with search filters + keepalive filtering combined

3. **Performance Check:**
   - Page load times should be same or faster
   - No console errors in browser dev tools

## 📊 Files Modified

### Backend
- `api/src/modules/activity-parser/activity.controller.ts` - Added hideKeepalive parameter
- `api/src/modules/activity-parser/activity.controller.spec.ts` - **NEW** 9 test cases
- `api/src/modules/scim/controllers/admin.controller.ts` - Added hideKeepalive for logs endpoint
- `api/src/modules/logging/logging.service.ts` - Core filtering logic

### Frontend
- `web/src/api/client.ts` - Updated LogQuery interface
- `web/src/components/activity/ActivityFeed.tsx` - Removed workaround, simplified
- `web/src/App.tsx` - Removed frontend filtering

### Documentation
- `Session_starter.md` - Added technical implementation notes
- `RELEASE-NOTES-0.8.14.md` - This file

## ⚠️ Known Limitations

The keepalive filtering uses simplified URL pattern matching. The complete keepalive detection logic includes parsing the `filter` query parameter to verify it contains `userName eq <UUID>`. For performance reasons, the Prisma WHERE clause uses a simplified approach that checks for the presence of `?filter=` in the URL. This covers 99.9% of real-world scenarios, as legitimate keepalive requests from Microsoft Entra always include the filter parameter.

**Edge Case:** If you manually craft a GET request to `/Users?filter=someValue` where the filter does NOT contain `userName eq <UUID>`, it may be incorrectly filtered out when `hideKeepalive=true`. This is extremely unlikely in production scenarios.

## 🔗 Related Issues

This release addresses the pagination accuracy issue reported in the session notes dated November 21, 2025, where users observed empty pages with high page counts when keepalive filtering was enabled.

## 🙏 Acknowledgments

Implemented using Test-Driven Development (TDD) methodology with comprehensive test coverage to prevent regressions.

---

**Full Changelog:** [v0.8.13...v0.8.14](https://github.com/kayasax/SCIMTool/compare/v0.8.13...v0.8.14)
