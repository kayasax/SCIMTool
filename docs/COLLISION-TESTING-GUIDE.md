# 🎯 SCIM Collision Testing Guide

## ⚡ Quick Start (tl;dr)

**Prerequisites**
- Access to Entra portal with rights to edit provisioning mappings and restart sync
- SCIMTool deployed with Manual Provision + Database browser available
- Microsoft Graph permission `Synchronization.ReadWrite.All` (for the restart call)

**Steps to trigger a 409 collision**
1. **Confirm the joining attribute** in Entra → Provisioning → Mappings.
   - If `externalId` is mapped (recommended), the unique key is `externalId`.
   - If not, `userName` (UPN) is the unique key.
2. **Seed an existing record** in SCIMTool (Manual Provision):
   - For `externalId` mapping → create a user with the target user’s `objectId` in `externalId`.
   - For `userName` mapping → create a user with the target user’s UPN in `userName`.
3. **Break Entra’s cached match (when it keeps PATCHing):** temporarily set the matching precedence to `externalId` only, leave the manual record’s `externalId` blank, and restart provisioning with Graph:
   ```http
   POST https://graph.microsoft.com/beta/servicePrincipals/{spObjectId}/synchronization/jobs/{jobId}/restart
   { "criteria": { "resetScope": "Full" } }
   ```
4. **Run on-demand provisioning** for that user.
5. **Check Raw Logs / Activity Feed** → the `POST /Users` call returns `409` with `scimType: "uniqueness"`.
6. **Revert mapping changes** once you capture the collision.

Skip to the sections below for the “why” and troubleshooting details.

---

## 🔍 Key Concepts

- **Collision = HTTP 409** because a unique identifier already exists.
- **Identifier priority** inside SCIMTool:
  - Use `externalId` when present & non-empty.
  - Otherwise fall back to `userName`.
- **Entra behaviour** is driven by the attribute marked “Matching” in provisioning mappings. Whatever is first in matching precedence is what Microsoft Entra uses to find existing users.

---

## Scenario Playbook

### A. externalId (objectId) is the key
1. Grab the Entra user’s `objectId` (e.g., `7b39...e58e`).
2. Manual Provision in SCIMTool:
   ```
   externalId: 7b39...e58e
   userName: collision@test.com
   ```
3. Restart provisioning if needed (step 3 in Quick Start) and run on-demand.
4. See `409 Conflict` on `POST /Users`.

### B. userName (UPN) is the key
1. Copy the existing user’s UPN (e.g., `hulk@yespapa.eu`).
2. Manual Provision in SCIMTool:
   ```
   externalId: [leave blank]
   userName: hulk@yespapa.eu
   ```
3. If Entra keeps issuing PATCH, follow the “Force Re-POST” flow, then run on-demand.
4. Check logs for `409 Conflict` with message “A resource with userName ... already exists”.

### C. Optional mixed test
Use different combos (e.g., create a blank `externalId` record, then collide via `externalId` against the `userName`) to validate cross-field protections.

---

## 🔄 Force Entra to Re-POST when it insists on PATCH
1. **Edit matching precedence** → set slot 1 to `externalId` only; uncheck `userName` temporarily.
2. **Restart provisioning** with Graph (body shown in Quick Start).
3. **Run on-demand provisioning** for the user you seeded.
4. **Revert the mapping** back to normal once the collision is captured.

This breaks Entra’s cached linkage so the next cycle is a true create attempt.

---

## ✅ Verify the Result

Expected raw response for the collision:
```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
  "status": "409",
  "scimType": "uniqueness",
  "detail": "A resource with userName '...' already exists."
}
```

Activity Feed shows the failed `POST /Users` and no new user is inserted in the Database browser.

---

## 🧰 Troubleshooting Quick Reference

| Problem | What it means | Fix |
|---------|----------------|-----|
| Entra keeps PATCHing | Existing match still cached | Use **Force Entra to Re-POST** steps, then retry on-demand |
| Manual provision succeeds (201) | Wrong identifier duplicated | Confirm which field Entra marks as Matching (mappings + raw logs) |
| externalId missing in logs | Mapping not configured | Map `objectId` → `externalId` or adapt the scenario to userName |
| Still seeing 200 after collision | Uniqueness bug or different environment | Verify SCIMTool version and database state, then report issue |

---

## 📚 Need the Deep Dive?

- [SCIM 2.0 RFC 7644 – uniqueness rules](https://datatracker.ietf.org/doc/html/rfc7644#section-3.1)
- [Microsoft Entra SCIM provisioning guide](https://learn.microsoft.com/en-us/azure/active-directory/app-provisioning/use-scim-to-provision-users-and-groups)
- SCIMTool docs: [Database Browser](../README.md#database-browser) & [Raw Logs](../README.md#raw-logs)

---

**Last Updated**: November 2025 | **Version**: 0.8.15+

