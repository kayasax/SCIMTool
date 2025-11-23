# Changelog

All notable changes to SCIMTool will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.15] - 2025-11-22

### Changed
- Simplified `docs/COLLISION-TESTING-GUIDE.md` with a quick-start workflow for forcing Microsoft Entra to issue a SCIM `POST` and surface 409 collisions.
- Documented the Graph restart command and temporary matching precedence tweak needed to reproduce duplicate-user errors reliably.

## [0.8.14] - 2025-11-21

### Fixed
- **Critical Pagination Bug:** Fixed incorrect pagination counts and empty pages when "Hide Keepalive Requests" toggle is enabled
  - Backend now handles keepalive filtering before counting, ensuring accurate pagination metadata
  - Eliminated empty pages that occurred when all fetched logs were keepalive requests
  - Improved performance by replacing multi-page aggregation workaround with single backend query

### Changed
- Activity Feed (`/admin/activity`) now accepts optional `hideKeepalive` query parameter for backend-driven filtering
- Raw Logs endpoint (`/admin/logs`) now accepts optional `hideKeepalive` query parameter
- Simplified frontend code by removing ~50 lines of workaround logic in ActivityFeed.tsx and App.tsx
- Frontend now trusts backend pagination metadata completely

### Added
- Comprehensive test suite with 9 TDD test scenarios for keepalive filtering (activity.controller.spec.ts)
- Release notes documentation (RELEASE-NOTES-0.8.14.md)

### Technical Details
- Implemented Prisma WHERE clause with inverse keepalive logic for accurate filtering
- Backend filters: method != 'GET' OR identifier != null OR status >= 400 OR no filter parameter
- All tests passing - verified pagination accuracy across multiple scenarios

## [0.8.13] - 2025-10-28

### Fixed
- Direct update script environment variable handling
- Container restart automation when environment variables are updated

### Changed
- Improved direct update script to auto-provision JWT/OAuth secrets
- Enhanced deployment script to pass secrets to Container Apps via `--set-env-vars`

## [0.8.12] - 2025-10-28

### Fixed
- Direct update script environment configuration

## [0.8.11] - 2025-10-27

### Added
- Direct update script with auto-secrets provisioning and container restart

## [0.8.10] - 2025-10-27

### Security
- Runtime JWT/OAuth secret enforcement (no build-time secrets)

### Changed
- Azure deployment scripts now emit JWT & OAuth secrets and pass to Container Apps
- Development mode auto-generates secrets with warning logs

## [0.8.9] - 2025-10-20

### Fixed
- Activity feed pagination now aggregates multiple pages when hiding keepalive checks
- Page numbering remains intuitive even with keepalive filtering enabled

## [0.8.8] - 2025-10-20

### Added
- Keepalive suppression toggle in Activity Feed
- Activity summary metrics now exclude Entra ping checks

### Changed
- Raw log viewer can hide Entra keepalive GET pings with toggle and suppression banner

## [0.8.7] - 2025-10-05

### Added
- Manual provisioning UI for SCIM users and groups
- Blob snapshot bootstrap in Docker entrypoint (restores /tmp DB before migrations)

### Fixed
- Web UI upgrade helper now strips leading 'v' from version parameter

### Changed
- Deploy script now reuses existing VNet & DNS when already configured
- Setup script auto-registers Microsoft.App & Microsoft.ContainerService providers
- Networking template no longer pre-delegates subnets (consumption environment compatibility)
- Interactive prompt defaults to existing Container App name
- Bootstrap setup script auto-detects existing app/env names per resource group

## [0.8.6] - 2025-10-05

### Added
- Private storage endpoint rollout with VNet + DNS automation

## [0.8.5] - 2025-10-05

### Changed
- Version bump across API + Web + docs

## [0.8.4] - 2025-10-03

### Added
- Structured membership change data (addedMembers/removedMembers) in activity feed
- UI rendering for group membership changes

### Fixed
- PATCH operations now case-insensitive for better Entra compatibility

## [0.8.3] - 2025-10-02

### Added
- Unified image build (root Dockerfile ships API + Web)
- Token resilience: frontend clears bearer on 401 with modal guidance

## [0.8.2] - 2025-10-01

### Security
- Runtime token enforcement (no build-time secrets)

## [0.8.1] - 2025-09-30

### Added
- Hybrid storage architecture: local SQLite + timed Azure Files backups
- Backup route & persistence verification

### Fixed
- Environment / workload profile compatibility
- Timeout & PowerShell 5 compatibility issues

## [0.8.0] - 2025-09-28

### Added
- Favicon / activity badge system for new activity notifications

### Fixed
- PATCH Add operation for Entra compatibility

## [0.3.0] - 2025-09-27

### Added
- Full SCIM 2.0 compliance baseline
- Complete CRUD operations for Users and Groups
- ServiceProviderConfig and Schemas endpoints
- Real-time logging UI with search and filtering
- Bearer token + OAuth 2.0 authentication
- Dev tunnel integration for public HTTPS
- Microsoft Entra provisioning compatibility

---

## Version Format

SCIMTool follows semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR:** Incompatible API changes
- **MINOR:** Backward-compatible functionality additions
- **PATCH:** Backward-compatible bug fixes

## Links

- [Latest Release](https://github.com/kayasax/SCIMTool/releases/latest)
- [All Releases](https://github.com/kayasax/SCIMTool/releases)
- [Documentation](https://github.com/kayasax/SCIMTool/blob/master/README.md)
