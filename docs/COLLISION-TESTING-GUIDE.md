# 🎯 SCIM Collision Testing Guide

## Understanding SCIM Identifiers

### What is a SCIM Collision?
A collision occurs when you try to create a SCIM resource (User or Group) with an identifier that already exists in your system. This triggers a `409 Conflict` response.

---

## 🔑 How Entra ID Determines Identifiers

### User Identifiers - Entra's Behavior

**Microsoft Entra ID sends SCIM user attributes based on your attribute mapping configuration:**

1. **Check Your Attribute Mapping** (Critical First Step):
   - Entra Portal → Enterprise Applications → Your SCIM App → Provisioning → Mappings
   - Click "Provision Azure Active Directory Users"
   - Look for these critical mappings:

   | Entra Attribute | SCIM Attribute | Notes |
   |----------------|----------------|-------|
   | `objectId` | `externalId` | ✅ **RECOMMENDED** - Unique GUID, never changes |
   | `userPrincipalName` | `userName` | ⚠️ Can change if user renamed |
   | `mailNickname` | `externalId` | ❌ Not recommended - can have duplicates |

2. **Common Entra Configurations**:

   **Configuration A - Recommended (Default)**:
   ```
   externalId: objectId            → "7b39476c-4bb9-4d7a-baa8-5ad9cfe7e58e"
   userName: userPrincipalName     → "john.doe@contoso.com"
   ```
   ✅ `externalId` is the unique identifier (objectId is always unique)

   **Configuration B - No externalId**:
   ```
   externalId: [Not Mapped]
   userName: userPrincipalName     → "john.doe@contoso.com"
   ```
   ⚠️ `userName` becomes the unique identifier (can cause issues if UPN changes)

   **Configuration C - Custom Mapping**:
   ```
   externalId: employeeId          → "EMP123456"
   userName: mail                  → "john.doe@company.com"
   ```
   ✅ `externalId` is the identifier (if employeeId is unique)

### How SCIMTool Determines the Identifier

**SCIMTool follows this priority logic** (matches SCIM 2.0 RFC):

```
IF externalId is present AND not empty:
    identifier = externalId
ELSE:
    identifier = userName
```

**Examples:**
```json
// Example 1: externalId takes priority
{
  "externalId": "7b39476c-4bb9-4d7a-baa8-5ad9cfe7e58e",
  "userName": "john.doe@contoso.com"
}
→ Identifier: "7b39476c-4bb9-4d7a-baa8-5ad9cfe7e58e"

// Example 2: No externalId
{
  "userName": "john.doe@contoso.com",
  "name": { "givenName": "John", "familyName": "Doe" }
}
→ Identifier: "john.doe@contoso.com"

// Example 3: Empty externalId (treated as absent)
{
  "externalId": "",
  "userName": "alice@company.com"
}
→ Identifier: "alice@company.com"
```

---

## 🧪 Creating Collision Scenarios

### Step 1: Discover What Entra Sends

**Method A - Check Raw Logs** (Easiest):
1. Open SCIMTool → **Raw Logs** tab
2. Assign a test user in Entra (trigger provisioning)
3. Find the POST `/Users` request
4. Click to view details → look at **Request Body**:
   ```json
   {
     "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
     "externalId": "7b39476c-4bb9-4d7a-baa8-5ad9cfe7e58e",  ← THIS
     "userName": "test.user@contoso.com",                    ← OR THIS
     "active": true,
     ...
   }
   ```
5. Note which fields Entra populated

**Method B - Check Attribute Mapping**:
1. Entra Portal → Enterprise Applications → Your App
2. Provisioning → Mappings → "Provision Azure Active Directory Users"
3. Find the mapping for `externalId`:
   - If mapped to `objectId` → Entra sends user's GUID as externalId
   - If not mapped → Entra doesn't send externalId
4. Find the mapping for `userName`:
   - Usually `userPrincipalName` → Entra sends UPN

### Step 2: Create the Collision

**Scenario A - externalId Collision** (Most Common):

Entra sends: `externalId = objectId`

1. Find an existing user's externalId from **Database → Users** tab
2. Go to **Manual Provision** tab
3. Create user with:
   ```
   externalId: [paste the existing externalId]
   userName: different.user@example.com  ← Different username!
   ```
4. Submit → Expect **409 Conflict** ✅

**Why this works**: SCIMTool sees `externalId` is already in database.

---

**Scenario B - userName Collision** (When externalId not mapped):

Entra sends: Only `userName` (no externalId)

1. Find an existing user's userName from **Database → Users** tab
2. Go to **Manual Provision** tab
3. Create user with:
   ```
   externalId: [leave empty]
   userName: [paste the existing userName]
   ```
4. Submit → Expect **409 Conflict** ✅

**Why this works**: No externalId provided, so userName becomes identifier.

---

**Scenario C - Mixed Collision** (Testing edge case):

1. First, create a user via Manual Provision:
   ```
   externalId: [empty]
   userName: collision-test@example.com
   ```
   → Creates user with identifier: `collision-test@example.com`

2. Then try to create another user:
   ```
   externalId: collision-test@example.com  ← Same value!
   userName: different@example.com
   ```
   → **409 Conflict** because externalId matches existing userName identifier

---

### Step 3: Verify the Collision

**Expected Behavior:**
- ✅ Status: `409 Conflict`
- ✅ Response body contains error message with `uniqueness` violation
- ✅ Activity Feed shows: "⚠️ Failed to create user - identifier already exists"
- ✅ Database remains unchanged (no duplicate created)

**In Raw Logs:**
```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
  "status": "409",
  "scimType": "uniqueness",
  "detail": "User with identifier 'xxx' already exists"
}
```

---

## 📋 Quick Reference: Collision Test Matrix

| Entra Config | Existing User Has | Collision Test | Manual Provision Input | Result |
|--------------|------------------|----------------|------------------------|--------|
| externalId=objectId | externalId="abc-123" | Duplicate externalId | externalId="abc-123", userName="new@test.com" | 409 ✅ |
| externalId=objectId | externalId="abc-123" | Different externalId | externalId="xyz-789", userName="new@test.com" | 201 Created ✅ |
| No externalId | userName="user@test.com" | Duplicate userName | [empty externalId], userName="user@test.com" | 409 ✅ |
| No externalId | userName="user@test.com" | Different userName | [empty externalId], userName="other@test.com" | 201 Created ✅ |

---

## 🔍 Group Identifier Logic

**Groups use `displayName` as their identifier** (SCIM 2.0 standard):

### Creating Group Collisions:

1. Check existing groups: **Database → Groups** tab
2. Note the `displayName` of an existing group (e.g., "Finance Team")
3. Go to **Manual Provision** → Group section
4. Create group with:
   ```
   displayName: Finance Team  ← Same as existing!
   ```
5. Submit → Expect **409 Conflict** ✅

**Note**: The optional "Custom SCIM Id" field is for testing only - Entra ignores it and generates its own IDs.

---

## 💡 Common Scenarios

### Scenario: Testing Entra Sync After Manual Creation

**Goal**: See what happens when Entra tries to provision a user you manually created.

1. **Manual Provision** a user:
   ```
   externalId: [future Entra user's objectId - get from Entra portal]
   userName: user@contoso.com
   displayName: Test User
   ```

2. In Entra, assign that user to your SCIM app

3. Observe in **Activity Feed**:
   - Entra sends POST /Users with same externalId
   - SCIMTool detects collision
   - Returns 409 Conflict
   - Entra should retry with GET (lookup) then PATCH (update)

**Expected Flow:**
```
POST /Users [collision detected] → 409
GET /Users?filter=... [Entra finds existing user] → 200
PATCH /Users/{id} [Entra updates instead] → 200
```

---

## 🎓 Best Practices

1. **Always check Raw Logs first** to see real Entra requests
2. **Use objectId → externalId mapping** for robust identifiers
3. **Test collision scenarios** before going to production
4. **Document your attribute mapping** in your team's runbook
5. **Use Database browser** to verify state before/after tests

---

## 🆘 Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Manual provision succeeds when expecting collision | Wrong identifier field | Check which field Entra actually maps - review Raw Logs |
| Both externalId and userName present, no collision | Using different values than existing user | Copy exact values from Database → Users tab |
| Collision returns 200 instead of 409 | Bug in uniqueness check | Check SCIMTool version, report issue on GitHub |
| Can't find externalId in Entra logs | Entra not configured to send it | Add mapping: objectId → externalId in provisioning config |

---

## 📚 Related Documentation

- [SCIM 2.0 RFC 7644 - Uniqueness](https://datatracker.ietf.org/doc/html/rfc7644#section-3.1)
- [Microsoft Entra SCIM Documentation](https://learn.microsoft.com/en-us/azure/active-directory/app-provisioning/use-scim-to-provision-users-and-groups)
- [SCIMTool Database Browser](../README.md#database-browser)
- [Raw Logs View](../README.md#raw-logs)

---

**Last Updated**: November 2025 | **Version**: 0.8.14+
