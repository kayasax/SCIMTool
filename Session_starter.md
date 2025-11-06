## SCIMTool – Condensed Session Memory

This file intentionally trimmed for clarity. Full historic log kept in git history.

### Recent Key Achievements (Chronological)
| Date | Achievement |
|------|-------------|
| 2025-10-28 | v0.8.13 tagged (direct update script envvars fix) |
| 2025-10-28 | v0.8.12 tagged (direct update script env fix) |
| 2025-10-27 | v0.8.11 tagged (direct update script auto-secrets + restart) |
| 2025-10-28 | Diagnosed prod SQLite corruption; initiated blob snapshot restore workflow |
| 2025-10-27 | v0.8.10 tagged (runtime secret enforcement + deployment script updates) |
| 2025-10-20 | OAuth module now requires JWT/OAuth secrets from environment; dev auto-generation logs warnings |
| 2025-10-20 | Azure deploy/setup scripts emit JWT & OAuth secrets and pass to Container Apps template |
| 2025-10-20 | Activity feed aggregates multiple pages when hiding keepalive checks, keeping page numbering intuitive |
| 2025-10-20 | v0.8.9 tagged (activity feed keepalive pagination fix) |
| 2025-10-20 | Activity feed pagination skips keepalive-only pages when hide toggle is on |
| 2025-10-20 | publish-ghcr workflow description updated; YAML lint passing with version 0.8.8 example |
| 2025-10-20 | v0.8.8 tagged (keepalive suppression across logs + activity metrics) |
| 2025-10-20 | Activity feed shares keepalive suppression toggle; summary metrics exclude Entra ping checks |
| 2025-10-20 | Raw log viewer can hide Entra keepalive GET pings (toggle + suppression banner) |
| 2025-10-05 | Git tag v0.8.7 created and pushed to origin (manual provisioning release) |
| 2025-10-05 | Web UI upgrade helper now strips leading 'v' from version parameter; GHCR image 0.8.7 published via workflow_dispatch |
| 2025-10-05 | Blob snapshot bootstrap added to Docker entrypoint (restores /tmp DB before migrations) |
| 2025-10-05 | Initiated SCIM duplicate handling refinement: schema uniqueness enforced & service helpers in progress |
| 2025-10-05 | Private storage endpoint rollout: VNet + DNS automation baked into deploy-azure.ps1 |
| 2025-10-05 | Deploy script now reuses existing ACA virtual network & DNS when already configured |
| 2025-10-05 | Setup auto-registers Microsoft.App & Microsoft.ContainerService providers before deployment |
| 2025-10-05 | Networking template no longer pre-delegates subnets (consumption environment compatibility) |
| 2025-10-05 | Deployment script can now reuse existing VNets/DNS by creating only missing sub-resources |
| 2025-10-05 | Interactive prompt now defaults to existing Container App name to avoid accidental redeploys |
| 2025-10-05 | Bootstrap setup script auto-detects existing app/env names per resource group |
| 2025-10-05 | Resource discovery now uses az resource list to avoid extension noise and ensure reuse |
| 2025-10-05 | Web footer fallback version synced with package.json (0.8.3) |
| 2025-10-05 | Manual provisioning console (UI + admin API) for SCIM collision testing |
| 2025-10-05 | Version bumped to v0.8.6 (blob restore bootstrap + duplicate guardrails prep) |
| 2025-10-05 | Version bumped to v0.8.5 across API + Web + docs |
| 2025-10-05 | Version bumped to v0.8.4 across web assets |
| 2025-10-04 | Backup service telemetry + blob snapshot compile fix |
| 2025-10-04 | Upgrade command now auto-fills RG/App and acknowledges blob backups |
| 2025-10-04 | Added manual GHCR publish workflow (publish-ghcr.yml) |
| 2025-10-03 | v0.8.4 released: structured membership change data (addedMembers/removedMembers) & UI rendering; case-insensitive PATCH ops. |
| 2025-10-02 | Unified image build (root Dockerfile ships API + Web) |
| 2025-10-02 | Token resilience: frontend clears bearer on 401 + modal guidance |
| 2025-10-01 | Runtime token enforcement (no build-time secrets) |
| 2025-09-30 | Hybrid storage architecture: local SQLite + timed Azure Files backups |
| 2025-09-30 | Environment / workload profile + timeout & PS5 compatibility fixes |
| 2025-09-30 | Backup route & persistence verification (v0.7.2) |
| 2025-09-28 | Favicon / activity badge system finalized |
| 2025-09-28 | PATCH Add operation fix (Entra compatibility) |
| 2025-09-27 | v0.3.0: Full SCIM 2.0 compliance baseline |

Current Version: v0.8.13 (direct-update automation + envvars fix)

---

## Status
Production Ready (v0.8.13) – Adds keepalive suppression toggle + pagination auto-skip for keepalive-only activity feed pages, plus blob restore bootstrap and duplicate guardrails groundwork. OAuth tokens now enforced via unique runtime JWT/OAuth secrets (no baked-in credentials); direct upgrade script now provisions JWT/OAuth secrets automatically, applies env bindings via `--set-env-vars`, and restarts revisions when needed.

## Quick Commands
```powershell
# Publish latest image
pwsh ./scripts/publish-acr.ps1 -Registry scimtoolpublic -ResourceGroup scimtool-rg -Latest

# Customer update to latest (example)
iex (irm 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/update-scimtool-direct.ps1'); Update-SCIMToolDirect -Version v0.8.13 -ResourceGroup <rg> -AppName <app> -NoPrompt

> NOTE: Direct upgrade one‑liner integrated into UI copy button; user has not yet tested the copied command end‑to‑end.
```

## Project Summary

**Purpose:** SCIM 2.0 server with Microsoft Entra provisioning integration + real-time logging UI

**Key Components:**
- ✅ NestJS SCIM 2.0 server (all operations working)
- ✅ OAuth 2.0 + Bearer token authentication
- ✅ React log viewer UI
- ✅ Dev tunnel integration for public HTTPS
- ✅ Microsoft Entra provisioning compatible

## Single Entry Point

**Main Script:** `setup.ps1`
- Test local: `.\setup.ps1 -TestLocal`
- Start tunnel: `.\setup.ps1 -StartTunnel`
- Clear instructions for Azure Portal setup

**Core Technologies:**
- Node.js 20 LTS & TypeScript
- NestJS service layer with Prisma ORM
- SQLite (file-backed) for low-volume persistence
- React + Vite frontend
- Docker (local/dev) & Azure Container Apps (deployment target)

AI Assist Notes: Microsoft Docs MCP consulted for SCIM spec alignment when needed.

---

## Current Focus
Validate blob snapshot build fixes, confirm direct upgrade command copy includes deployment metadata, run GHCR publish workflow for tagged releases; ensure runtime secrets (SCIM/JWT/OAuth) configured per deployment. Rollout private network baseline (ensure customers recreate Container Apps environment for VNet support). Finish SCIM duplicate detection flow (uniqueness guardrails + regression coverage).

## Next Steps / Backlog
- [ ] Validate copied direct upgrade command in production environment
- [ ] Send guidance to existing customers on the v0.8.13 direct-update changes and the need to store generated JWT/OAuth secrets
- [ ] Add rollback command generation (capture previous image tag)
- [ ] Expose deployment metadata via API endpoint (optional runtime flexibility)
- [ ] CI checks: version/tag sync, BOM detection, lockfile sync
- [ ] Parameterize backup interval & retention (env + doc)
- [ ] Add release automation (GitHub Action) for drafts on tag push
- [ ] Provide migration helper to rebuild the Container Apps environment when moving to the private VNet baseline
- [ ] Add SCIM duplicate-handling regression tests (POST + PATCH scenarios)
## 🏗️ Architecture

**SCIM 2.0 Server:**
- NestJS controllers for `/Users`, `/Groups`, `/ServiceProviderConfig`, `/Schemas`
- Full CRUD operations: POST, GET, PUT, PATCH, DELETE
- Prisma + SQLite for data persistence and request logging
- Bearer token + OAuth 2.0 dual authentication

**Web UI:**
- React frontend with theme support (light/dark)
- Real-time log viewer with search, filtering, and detailed inspection
- Upgrade notifications with GitHub release integration
- Admin tools for log management and system monitoring

**Deployment:**
- Docker multi-stage build with proper permissions
- Azure Container Registry (public, anonymous pull)
- Azure Container Apps for production hosting
- PowerShell automation for customer updates

## Architecture Snapshot
| Date | Achievement |
|------|-------------|
| 2025-09-27 | ✅ **v0.3.0 Released** - Full SCIM 2.0 compliance + enhanced UX |
| 2025-09-27 | ✅ **Production Deployed** - Azure Container Apps updated with CORS fixes |
| 2025-09-27 | ✅ **Customer Tools** - PowerShell update function tested and working |
| 2025-09-25 | ✅ README.md created with setup & API documentation |
| 2025-09-25 | 🧪 Initial e2e test (Users create/list/get) added |
| 2025-09-25 | ✅ Logs listing endpoint & e2e test added |
| 2025-09-25 | 🎨 Frontend (React + Vite) scaffolded with log viewer |
| 2025-09-25 | 🚀 Log detail modal (headers/bodies + copy) added |
| 2025-09-25 | 🔍 Full‑text search expanded to include headers/bodies |
| 2025-09-25 | 🏷️ Identifier derivation (user/email/group displayName) implemented (ephemeral) |
| 2025-09-25 | ⚙️ Performance optimization: removed large body columns from list query |
| 2025-09-25 | 🧪 Iterated on persisted identifier column (rolled back pending stable client generation) |
| 2025-09-25 | 📉 Reduced log list latency from ~10s to sub‑second in local tests |
| 2025-09-25 | 📚 Added external exposure (tunnel) deployment guidance drafting |
| 2025-09-26 | 🚀 Azure Container Apps deployment successful - SCIM server running in production |
| 2025-09-26 | 🔧 CORS configuration added to enable web client connection to deployed API |
| 2025-09-26 | ✅ Production web UI monitoring working - full end-to-end deployment complete |
| 2025-09-26 | 🎯 **CONTAINERIZED CLIENT IMPLEMENTED** - Single URL for SCIM + Web UI for teams |
| 2025-09-26 | 📦 Complete containerized solution: SCIM API + monitoring UI in one deployment |
| 2025-09-26 | 🔧 **STATIC ASSETS FIX** - Web UI fully functional with proper CSS/JS serving |
| 2025-09-26 | ✅ **FINAL VERIFICATION** - Web UI accessible without authentication, assets working |
| 2025-09-26 | 🔧 **API URL FIX** - Resolved double /scim prefix issue in web client API calls |
| 2025-09-26 | 🎉 **COMPLETE SUCCESS** - Containerized SCIMTool fully functional and ready for teams |
| 2025-09-26 | 🌿 `feature/acr-automation` branch created and pushed to start Azure Container Registry automation work |
| 2025-09-26 | 🆕 Added /scim/admin/version endpoint (backend version reporting) |
| 2025-09-26 | 🔔 Frontend upgrade banner + remote manifest polling (L1+L2) implemented |
| 2025-09-26 | 🧩 Added dynamic upgrade helper script (GitHub Releases based) |
| 2025-09-26 | 🎨 Microsoft-inspired theming completed (dark/light parity, refined filters, log modal polish) |
| 2025-09-26 | 🔍 Admin log noise hidden from UI; SCIM request list now focused on provisioning traffic |
| 2025-12-29 | � **GITHUB REGISTRY MIGRATION** - Migrated from ACR to ghcr.io/kayasax/scimtool with automated builds |
| 2025-12-26 | 🛠️ **UNIFIED DOCKERFILE** - Multi-stage build (web+API) with fixed SQLite permissions |
| 2025-12-26 | 🚀 **CONTAINER DEPLOYMENT** - Production deployment working via public registry |
| 2025-12-26 | 🔧 **SQLITE PERMISSIONS FIX** - Resolved readonly database errors with proper user ownership |
| 2025-12-26 | 📋 **AUTOMATION SCRIPTS** - publish-acr.ps1, tag-and-release.ps1, update-scimtool.ps1 created |
| 2025-12-26 | 🎯 **UPGRADE BANNER COMPLETE** - Compact banner with modal, hosted PowerShell script integration |
| 2025-12-26 | 📖 **ADMIN DOCUMENTATION** - Complete release workflow and user update process documented |


---

## Priorities (Condensed)
Done: Activity parser, Database browser, Hybrid storage, Update automation.
Near-Term:
- WebSocket/live activity feed (optional)
- Identifier column stabilization
- Minimal health/diagnostics endpoint
Deferred:
- Advanced analytics + FTS
- Mobile polish

---

## Dev Quick Ref
Backend: `cd api && npm run start:dev`
Frontend: `cd web && npm run dev`
Tests: `cd api && npm test`

---

*This file serves as persistent project memory for enhanced AI assistant session continuity with MCP server integration.*
## Key Features (Snapshot)

**SCIM 2.0 Compliance:**
- Complete CRUD operations (POST, GET, PUT, PATCH, DELETE)
- Microsoft Entra ID provisioning compatible
- ServiceProviderConfig, Schemas, ResourceTypes endpoints
- Proper filtering, pagination, and error handling

**Monitoring & Debugging:**
- Real-time request/response logging
- Searchable log viewer with detailed inspection
- Admin endpoint filtering (hide non-SCIM traffic)
- Performance optimized (<1s load times)

**User Experience:**
- Light/dark theme support
- Upgrade notifications with GitHub integration
- Footer with credits and version info
- Responsive design for mobile/desktop

**DevOps Ready:**
- Docker containerization with proper permissions
- Public Azure Container Registry
- One-click customer updates via PowerShell
- Automated CI/CD with GitHub releases

**Performance Insights:**
- Expected request volume is low; focus on clarity of logs over throughput.
- Lightweight SQLite reduces operational overhead while supporting ad-hoc queries.
- Microsoft docs MCP confirmed Entra request patterns to optimize initial test coverage.
- Removing large text columns from primary list query yields major latency reduction.
- Persisting identifiers removes need to parse bodies repeatedly (final integration pending).
- Potential future improvements: FTS5 virtual table for deep search, cursor pagination, optional gzip.

**Known Constraints:**
- Must stay compliant with Microsoft Entra SCIM validator scenarios.
- Deployment must remain low-cost and easily reproducible for Microsoft engineers (Docker + optional ACA).
- Single-user admin workflow; no RBAC planned for MVP.
- Sensitive payload data retained in logs by design; rely on manual purge for case isolation.
- Rely on Microsoft docs MCP for authoritative SCIM updates; monitor for spec changes.
- Identifier persistence currently best-effort; older rows may lack derived names until backfilled.

---

## TODO (Lean)
[-] Investigate lighter framework (Fastify) for image size (deferred)
[ ] Health/diagnostics endpoint
[ ] Optional WebSocket live updates
[ ] Identifier persistence finalization/backfill
[ ] Consider distroless base image

---
*Condensed: older verbose narrative & future-dated/hallucinated entries removed for clarity.*