import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ActivitySummary {
  id: string;
  timestamp: string;
  icon: string;
  message: string;
  details?: string;
  type: 'user' | 'group' | 'system' | 'error';
  severity: 'info' | 'success' | 'warning' | 'error';
  userIdentifier?: string;
  groupIdentifier?: string;
  // Structured membership change data (optional; present for group membership PATCH operations)
  addedMembers?: { id: string; name: string }[];
  removedMembers?: { id: string; name: string }[];
  isKeepalive?: boolean;
}

interface ScimPatchOperation {
  op: 'add' | 'remove' | 'replace';
  path?: string;
  value?: any; // Using any for SCIM values which can be complex objects
}

@Injectable()
export class ActivityParserService {
  constructor(private prisma: PrismaService) {}

  /**
   * Parse a SCIM request log into a human-readable activity summary
   */
  async parseActivity(log: {
    id: string;
    method: string;
    url: string;
    status?: number;
    requestBody?: string;
    responseBody?: string;
    createdAt: string;
    identifier?: string;
  }): Promise<ActivitySummary> {
    const timestamp = log.createdAt;
    const method = log.method.toUpperCase();
    const url = log.url;
    const status = log.status || 0;

    // Parse request and response bodies
    let requestData: any = {};
    let responseData: any = {};

    try {
      if (log.requestBody) {
        requestData = JSON.parse(log.requestBody);
      }
    } catch (e) {
      // Ignore parsing errors
    }

    try {
      if (log.responseBody) {
        responseData = JSON.parse(log.responseBody);
      }
    } catch (e) {
      // Ignore parsing errors
    }

    // Determine if this is a Users or Groups operation
    const isUsersOperation = url.includes('/Users');
    const isGroupsOperation = url.includes('/Groups');
    const isListOperation = method === 'GET' && !url.match(/\/[^/]+$/);
    const isGetOperation = method === 'GET' && !!url.match(/\/[^/]+$/);

    // Extract identifiers
    const userIdentifier = this.extractUserIdentifier(requestData, responseData, log.identifier);
    const groupIdentifier = this.extractGroupIdentifier(requestData, responseData, log.identifier);

    // Handle different operation types
    if (isUsersOperation) {
      return await this.parseUserActivity({
        id: log.id,
        timestamp,
        method,
        url,
        status,
        requestData,
        responseData,
        userIdentifier,
        isListOperation,
        isGetOperation,
        isKeepalive: this.isKeepaliveRequest({ method, url, identifier: log.identifier, status })
      });
    } else if (isGroupsOperation) {
      return await this.parseGroupActivity({
        id: log.id,
        timestamp,
        method,
        url,
        status,
        requestData,
        responseData,
        groupIdentifier: groupIdentifier || this.extractGroupIdFromUrl(url),
        isListOperation,
        isGetOperation,
      });
    } else {
      return this.parseSystemActivity({
        id: log.id,
        timestamp,
        method,
        url,
        status,
      });
    }
  }

  private async parseUserActivity(params: {
    id: string;
    timestamp: string;
    method: string;
    url: string;
    status: number;
    requestData: any;
    responseData: any;
    userIdentifier?: string;
    isListOperation: boolean;
    isGetOperation: boolean;
    isKeepalive: boolean;
  }): Promise<ActivitySummary> {
    const { id, timestamp, method, status, requestData, responseData, userIdentifier, isListOperation, isGetOperation, isKeepalive } = params;

    // Resolve user name for better display
    const resolvedUserName = userIdentifier ? await this.resolveUserName(userIdentifier) : undefined;
    const displayName = resolvedUserName || userIdentifier;

    // Handle errors first
    if (status >= 400) {
      return {
        id,
        timestamp,
        icon: '❌',
        message: `Failed to ${method.toLowerCase()} user${displayName ? `: ${displayName}` : ''}`,
        details: `HTTP ${status}`,
        type: 'user',
        severity: 'error',
        userIdentifier,
        isKeepalive: false,
      };
    }

    // Handle successful operations
    switch (method) {
      case 'POST':
        return {
          id,
          timestamp,
          icon: '👤',
          message: `User created${displayName ? `: ${displayName}` : ''}`,
          details: this.extractUserDetails(requestData),
          type: 'user',
          severity: 'success',
          userIdentifier,
          isKeepalive: false,
        };

      case 'PUT':
        return {
          id,
          timestamp,
          icon: '✏️',
          message: `User updated${displayName ? `: ${displayName}` : ''}`,
          details: this.extractUserDetails(requestData),
          type: 'user',
          severity: 'info',
          userIdentifier,
          isKeepalive: false,
        };

      case 'PATCH': {
        const operations = requestData?.Operations || [];
        const deactivateOp = operations.find((op: ScimPatchOperation) =>
          op.path === 'active' && (op.value === false || op.value === 'false' || op.value === 'False')
        );
        const activateOp = operations.find((op: ScimPatchOperation) =>
          op.path === 'active' && (op.value === true || op.value === 'true' || op.value === 'True')
        );

        if (deactivateOp) {
          return {
            id,
            timestamp,
            icon: '⚠️',
            message: `User deactivated${displayName ? `: ${displayName}` : ''}`,
            type: 'user',
            severity: 'warning',
            userIdentifier,
            isKeepalive: false,
          };
        } else if (activateOp) {
          return {
            id,
            timestamp,
            icon: '✅',
            message: `User activated${displayName ? `: ${displayName}` : ''}`,
            type: 'user',
            severity: 'success',
            userIdentifier,
            isKeepalive: false,
          };
        } else {
          // Parse specific changes for better details
          const changeDetails = await this.parseUserChanges(operations);
          return {
            id,
            timestamp,
            icon: '✏️',
            message: `User modified${displayName ? `: ${displayName}` : ''}`,
            details: changeDetails || `${operations.length} change${operations.length !== 1 ? 's' : ''}`,
            type: 'user',
            severity: 'info',
            userIdentifier,
            isKeepalive: false,
          };
        }
      }

      case 'DELETE':
        return {
          id,
          timestamp,
          icon: '🗑️',
          message: `User deleted${displayName ? `: ${displayName}` : ''}`,
          type: 'user',
          severity: 'warning',
          userIdentifier,
          isKeepalive: false,
        };

      case 'GET':
        if (isListOperation) {
          const totalResults = responseData?.totalResults || 0;
          return {
            id,
            timestamp,
            icon: '📋',
            message: `User list retrieved`,
            details: `${totalResults} user${totalResults !== 1 ? 's' : ''} found`,
            type: 'system',
            severity: 'info',
            isKeepalive: false,
          };
        } else if (isGetOperation) {
          return {
            id,
            timestamp,
            icon: '👁️',
            message: `User details retrieved${userIdentifier ? `: ${userIdentifier}` : ''}`,
            type: 'user',
            severity: 'info',
            userIdentifier,
            isKeepalive,
          };
        }
        break;
    }

    // Fallback
    return {
      id,
      timestamp,
      icon: '❓',
      message: `User operation: ${method}`,
      type: 'user',
      severity: 'info',
      userIdentifier,
      isKeepalive: false,
    };
  }

  private async parseGroupActivity(params: {
    id: string;
    timestamp: string;
    method: string;
    url: string;
    status: number;
    requestData: any;
    responseData: any;
    groupIdentifier?: string;
    isListOperation: boolean;
    isGetOperation: boolean;
  }): Promise<ActivitySummary> {
    const { id, timestamp, method, status, requestData, responseData, groupIdentifier, isListOperation, isGetOperation } = params;

    // Handle errors first
    if (status >= 400) {
      const resolvedGroupName = groupIdentifier ? await this.resolveGroupName(groupIdentifier) : 'group';
      return {
        id,
        timestamp,
        icon: '❌',
        message: `Failed to ${method.toLowerCase()} group: ${resolvedGroupName}`,
        details: `HTTP ${status}`,
        type: 'group',
        severity: 'error',
        groupIdentifier,
        isKeepalive: false,
      };
    }

    // Handle successful operations
    switch (method) {
      case 'POST': {
        const resolvedGroupName = groupIdentifier ? await this.resolveGroupName(groupIdentifier) : 'New group';
        return {
          id,
          timestamp,
          icon: '🏢',
          message: `Group created: ${resolvedGroupName}`,
          details: this.extractGroupDetails(requestData),
          type: 'group',
          severity: 'success',
          groupIdentifier,
          isKeepalive: false,
        };
      }

      case 'PUT': {
        const resolvedGroupName = groupIdentifier ? await this.resolveGroupName(groupIdentifier) : 'Group';
        return {
          id,
          timestamp,
          icon: '✏️',
          message: `Group updated: ${resolvedGroupName}`,
          details: this.extractGroupDetails(requestData),
          type: 'group',
          severity: 'info',
          groupIdentifier,
          isKeepalive: false,
        };
      }

      case 'PATCH': {
        const operations = requestData?.Operations || [];
        const memberOps = operations.filter((op: ScimPatchOperation) =>
          op.path === 'members' || op.path?.startsWith('members[')
        );

        if (memberOps.length > 0) {
          // Azure / various SCIM clients sometimes send op capitalized ("Add" / "Remove"). Treat op case-insensitively.
          const addOps = memberOps.filter((op: ScimPatchOperation) => (op.op || '').toLowerCase() === 'add');
          const removeOps = memberOps.filter((op: ScimPatchOperation) => (op.op || '').toLowerCase() === 'remove');

          // Extract and resolve member IDs for add operations
          const addedMemberIds: string[] = [];
          for (const op of addOps) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const opValue = (op as any).value;
            if (Array.isArray(opValue)) {
              // Multiple members in array: [{value: "id1"}, {value: "id2"}]
              for (const v of opValue) {
                if (v?.value) {
                  addedMemberIds.push(v.value);
                } else if (typeof v === 'string') {
                  addedMemberIds.push(v);
                }
              }
            } else if (opValue?.value) {
              // Single member: {value: "id"}
              addedMemberIds.push(opValue.value);
            } else if (typeof opValue === 'string') {
              // Direct string value
              addedMemberIds.push(opValue);
            } else if (!opValue && typeof op.path === 'string' && op.path.startsWith('members[')) {
              // Rare case: add with filter-style path (uncommon, but handle defensively)
              const filterMatch = op.path.match(/members\[\s*value\s+eq\s+"([^"]+)"\s*\]/i) || op.path.match(/members\[\s*value\s+eq\s+'([^']+)'\s*\]/i);
              if (filterMatch) {
                addedMemberIds.push(filterMatch[1]);
              }
            }
          }

          // Extract and resolve member IDs for remove operations
          const removedMemberIds: string[] = [];
          for (const op of removeOps) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const opValue = (op as any).value;
            if (Array.isArray(opValue)) {
              for (const v of opValue) {
                if (v?.value) {
                  removedMemberIds.push(v.value);
                } else if (typeof v === 'string') {
                  removedMemberIds.push(v);
                }
              }
            } else if (opValue?.value) {
              removedMemberIds.push(opValue.value);
            } else if (typeof opValue === 'string') {
              // Direct string value or path-based removal
              removedMemberIds.push(opValue);
            } else if (!opValue && typeof op.path === 'string' && op.path.startsWith('members[')) {
              // SCIM remove with filter path: members[value eq "<id>"] (no value payload provided)
              const filterMatch = op.path.match(/members\[\s*value\s+eq\s+"([^"]+)"\s*\]/i) || op.path.match(/members\[\s*value\s+eq\s+'([^']+)'\s*\]/i);
              if (filterMatch) {
                removedMemberIds.push(filterMatch[1]);
              }
            }
          }

          // Resolve all names
          const addedMemberNames = await Promise.all(
            addedMemberIds.map(async (id: string) => {
              if (id === 'Unknown') return id;
              return await this.resolveUserName(id);
            })
          );

          const removedMemberNames = await Promise.all(
            removedMemberIds.map(async (id: string) => {
              if (id === 'Unknown') return id;
              return await this.resolveUserName(id);
            })
          );

          const addedMembers = addedMemberIds.map((id, idx) => ({ id, name: addedMemberNames[idx] }));
          const removedMembers = removedMemberIds.map((id, idx) => ({ id, name: removedMemberNames[idx] }));

          const resolvedGroupName = groupIdentifier ? await this.resolveGroupName(groupIdentifier) : 'Group';

          // Build detailed message based on operations
          if (addedMemberIds.length > 0 && removedMemberIds.length === 0) {
            // Only additions
            return {
              id,
              timestamp,
              icon: '➕',
              message: `${addedMemberNames.join(', ')} ${addedMemberNames.length > 1 ? 'were' : 'was'} added to ${resolvedGroupName}`,
              details: `${addedMemberIds.length} member${addedMemberIds.length > 1 ? 's' : ''} added`,
              type: 'group',
              severity: 'success',
              groupIdentifier,
              addedMembers,
              isKeepalive: false,
            };
          } else if (removedMemberIds.length > 0 && addedMemberIds.length === 0) {
            // Only removals
            return {
              id,
              timestamp,
              icon: '➖',
              message: `${removedMemberNames.join(', ')} ${removedMemberNames.length > 1 ? 'were' : 'was'} removed from ${resolvedGroupName}`,
              details: `${removedMemberIds.length} member${removedMemberIds.length > 1 ? 's' : ''} removed`,
              type: 'group',
              severity: 'info',
              groupIdentifier,
              removedMembers,
              isKeepalive: false,
            };
          } else if (addedMemberIds.length > 0 && removedMemberIds.length > 0) {
            // Both additions and removals
            const changes: string[] = [];
            if (addedMemberNames.length > 0) {
              changes.push(`Added: ${addedMemberNames.join(', ')}`);
            }
            if (removedMemberNames.length > 0) {
              changes.push(`Removed: ${removedMemberNames.join(', ')}`);
            }
            return {
              id,
              timestamp,
              icon: '👥',
              message: `${resolvedGroupName} membership updated`,
              details: changes.join(' | '),
              type: 'group',
              severity: 'info',
              groupIdentifier,
              addedMembers: addedMembers.length ? addedMembers : undefined,
              removedMembers: removedMembers.length ? removedMembers : undefined,
              isKeepalive: false,
            };
          } else {
            // Couldn't extract member info, show generic message
            return {
              id,
              timestamp,
              icon: '👥',
              message: `${resolvedGroupName} membership updated`,
              details: `${memberOps.length} change${memberOps.length !== 1 ? 's' : ''}`,
              type: 'group',
              severity: 'info',
              groupIdentifier,
              isKeepalive: false,
            };
          }
        } else {
          return {
            id,
            timestamp,
            icon: '✏️',
            message: `Group modified${groupIdentifier ? `: ${groupIdentifier}` : ''}`,
            details: `${operations.length} change${operations.length !== 1 ? 's' : ''}`,
            type: 'group',
              severity: 'info',
            groupIdentifier,
            isKeepalive: false,
          };
        }
        break;
      }

      case 'DELETE': {
        const resolvedGroupName = groupIdentifier ? await this.resolveGroupName(groupIdentifier) : 'Group';
        return {
          id,
          timestamp,
          icon: '🗑️',
          message: `Group deleted: ${resolvedGroupName}`,
          type: 'group',
          severity: 'warning',
          groupIdentifier,
          isKeepalive: false,
        };
      }

      case 'GET':
        if (isListOperation) {
          const totalResults = responseData?.totalResults || 0;
          return {
            id,
            timestamp,
            icon: '📋',
            message: `Group list retrieved`,
            details: `${totalResults} group${totalResults !== 1 ? 's' : ''} found`,
            type: 'system',
            severity: 'info',
            isKeepalive: false,
          };
        } else if (isGetOperation) {
          return {
            id,
            timestamp,
            icon: '👁️',
            message: `Group details retrieved${groupIdentifier ? `: ${groupIdentifier}` : ''}`,
            type: 'group',
            severity: 'info',
            groupIdentifier,
            isKeepalive: false,
          };
        }
        break;
    }

    // Fallback
    return {
      id,
      timestamp,
      icon: '❓',
      message: `Group operation: ${method}`,
      type: 'group',
      severity: 'info',
      groupIdentifier,
      isKeepalive: false,
    };
  }

  private parseSystemActivity(params: {
    id: string;
    timestamp: string;
    method: string;
    url: string;
    status: number;
  }): ActivitySummary {
    const { id, timestamp, method, url, status } = params;

    if (url.includes('/ServiceProviderConfig')) {
      return {
        id,
        timestamp,
        icon: '⚙️',
        message: 'Service configuration retrieved',
        type: 'system',
        severity: 'info',
        isKeepalive: false,
      };
    }

    if (url.includes('/Schemas')) {
      return {
        id,
        timestamp,
        icon: '📋',
        message: 'SCIM schemas retrieved',
        type: 'system',
        severity: 'info',
        isKeepalive: false,
      };
    }

    if (url.includes('/ResourceTypes')) {
      return {
        id,
        timestamp,
        icon: '📋',
        message: 'Resource types retrieved',
        type: 'system',
        severity: 'info',
        isKeepalive: false,
      };
    }

    // Fallback for other system operations
    return {
      id,
      timestamp,
      icon: '🔧',
      message: `System operation: ${method} ${url}`,
      details: status >= 400 ? `HTTP ${status}` : undefined,
      type: 'system',
      severity: status >= 400 ? 'error' : 'info',
      isKeepalive: false,
    };
  }

  private isKeepaliveRequest(params: { method: string; url: string; identifier?: string; status?: number }): boolean {
    const { method, url, identifier, status } = params;
    if (!method || !url) return false;
    if (method.toUpperCase() !== 'GET') return false;
    if (!/\/Users/i.test(url)) return false;
    if (identifier && identifier.trim().length > 0) return false;
    if (typeof status === 'number' && status >= 400) return false;

    const queryStart = url.indexOf('?');
    if (queryStart === -1) return false;
    const query = url.slice(queryStart + 1);
    let paramsObj: URLSearchParams;
    try {
      paramsObj = new URLSearchParams(query);
    } catch {
      return false;
    }
    const rawFilter = paramsObj.get('filter') ?? paramsObj.get('Filter') ?? paramsObj.get('FILTER');
    if (!rawFilter) return false;
    const withSpaces = rawFilter.replace(/\+/g, ' ');
    let decoded = withSpaces;
    try {
      decoded = decodeURIComponent(withSpaces);
    } catch {
      // continue with original string if decoding fails
    }
    const match = decoded.match(/userName\s+eq\s+"?([^"\\]+)"?/i);
    if (!match) return false;
    const candidate = match[1].trim();
    if (!candidate) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidate);
  }

  isKeepaliveLog(log: { method: string; url: string; identifier?: string | null; status?: number | null }): boolean {
    return this.isKeepaliveRequest({
      method: log.method,
      url: log.url,
      identifier: log.identifier ?? undefined,
      status: log.status ?? undefined
    });
  }

  private extractUserIdentifier(requestData: any, responseData: any, logIdentifier?: string): string | undefined {
    // Use log identifier if available (already computed)
    if (logIdentifier) {
      return logIdentifier;
    }

    // Try to extract from request or response data
    const data = requestData || responseData || {};

    return data.userName ||
           data.name?.formatted ||
           data.displayName ||
           data.emails?.[0]?.value ||
           data.id ||
           undefined;
  }

  private extractGroupIdentifier(requestData: any, responseData: any, logIdentifier?: string): string | undefined {
    // Use log identifier if available (already computed)
    if (logIdentifier) {
      return logIdentifier;
    }

    // Try to extract from request or response data
    const data = requestData || responseData || {};

    return data.displayName ||
           data.id ||
           undefined;
  }

  /**
   * Extract group ID from URL path for group operations
   */
  private extractGroupIdFromUrl(url: string): string | undefined {
    const match = url.match(/\/Groups\/([^/?]+)/);
    return match ? match[1] : undefined;
  }

  private extractUserDetails(data: any): string | undefined {
    if (!data) return undefined;

    const details: string[] = [];

    if (data.name?.givenName || data.name?.familyName) {
      const fullName = `${data.name.givenName || ''} ${data.name.familyName || ''}`.trim();
      if (fullName) details.push(fullName);
    }

    // Extract title from root level
    if (data.title) {
      details.push(data.title);
    }

    // Extract department from enterprise extension
    const enterpriseExt = data['urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'];
    if (enterpriseExt?.department) {
      details.push(enterpriseExt.department);
    }

    if (data.active !== undefined) {
      details.push(data.active ? 'Active' : 'Inactive');
    }

    if (data.emails?.length > 0) {
      details.push(data.emails[0].value);
    }

    return details.length > 0 ? details.join(' • ') : undefined;
  }

  private extractGroupDetails(data: any): string | undefined {
    if (!data) return undefined;

    const details: string[] = [];

    if (data.members?.length > 0) {
      details.push(`${data.members.length} member${data.members.length !== 1 ? 's' : ''}`);
    }

    return details.length > 0 ? details.join(' • ') : undefined;
  }

  /**
   * Resolve user ID to display name
   */
  private async resolveUserName(userId: string): Promise<string> {
    try {
      const user = await this.prisma.scimUser.findUnique({
        where: { scimId: userId },
        select: { userName: true, rawPayload: true },
      });

      if (user) {
        // Try to get display name from raw payload first
        try {
          if (user.rawPayload && typeof user.rawPayload === 'string') {
            const payload = JSON.parse(user.rawPayload);
            if (payload.displayName) return payload.displayName;
            if (payload.name?.formatted) return payload.name.formatted;
            if (payload.name?.givenName && payload.name?.familyName) {
              return `${payload.name.givenName} ${payload.name.familyName}`;
            }
          }
        } catch (e) {
          // Fall back to userName if payload parsing fails
        }
        return user.userName;
      }
    } catch (e) {
      // If lookup fails, return the original ID
    }
    return userId;
  }

  /**
   * Resolve group ID to display name
   */
  private async resolveGroupName(groupId: string): Promise<string> {
    try {
      const group = await this.prisma.scimGroup.findUnique({
        where: { scimId: groupId },
        select: { displayName: true },
      });

      if (group?.displayName) {
        return group.displayName;
      }
    } catch (e) {
      // If lookup fails, return the original ID
    }
    return groupId;
  }

  /**
   * Parse SCIM PATCH operations to show specific changes
   */
  private async parseUserChanges(operations: ScimPatchOperation[]): Promise<string | undefined> {
    if (!operations || operations.length === 0) return undefined;

    const changes: string[] = [];

    for (const op of operations) {
      try {
        let path = op.path?.toLowerCase() || '';

        // Extract field name from URN format
        // e.g., "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:manager" → "manager"
        if (path.includes(':')) {
          const parts = path.split(':');
          path = parts[parts.length - 1];
        }

        // Handle manager changes
        if (path === 'manager' || path.includes('manager')) {
          if ((op.op === 'replace' || op.op === 'add') && op.value) {
            // Handle both nested format {value: "id"} and direct string
            const managerId = typeof op.value === 'object' ? op.value.value : op.value;
            if (managerId) {
              const managerName = await this.resolveUserName(managerId);
              changes.push(`Manager → ${managerName}`);
            }
          } else if (op.op === 'remove') {
            changes.push('Manager removed');
          }
          continue;
        }

        // Handle displayName changes
        if (path === 'displayname' || path.includes('displayname')) {
          if (op.op === 'replace' || op.op === 'add') {
            changes.push(`Display name → "${op.value}"`);
          }
          continue;
        }

        // Handle title changes
        if (path === 'title') {
          if (op.op === 'replace' || op.op === 'add') {
            changes.push(`Title → "${op.value}"`);
          }
          continue;
        }

        // Handle department changes
        if (path === 'department') {
          if (op.op === 'replace' || op.op === 'add') {
            changes.push(`Department → "${op.value}"`);
          }
          continue;
        }

        // Handle email changes
        if (path === 'emails' || path.includes('email')) {
          if (op.op === 'replace' || op.op === 'add') {
            const email = Array.isArray(op.value) ? op.value[0]?.value : op.value?.value || op.value;
            if (email) {
              changes.push(`Email → ${email}`);
            }
          }
          continue;
        }

        // Handle active/enabled status changes
        if (path === 'active' || path.includes('active')) {
          if (op.op === 'replace' || op.op === 'add') {
            changes.push(`Status → ${op.value ? 'Active' : 'Inactive'}`);
          }
          continue;
        }

        // Handle other common attributes
        if (path && (op.op === 'replace' || op.op === 'add') && op.value !== undefined) {
          // Make path more readable
          const readablePath = path.charAt(0).toUpperCase() + path.slice(1).replace(/([A-Z])/g, ' $1');
          const valueStr = typeof op.value === 'object' ? JSON.stringify(op.value) : String(op.value);
          if (valueStr && valueStr.length < 50) {
            changes.push(`${readablePath} → ${valueStr}`);
          } else {
            changes.push(`${readablePath} changed`);
          }
        }
      } catch (e) {
        // Ignore parsing errors for individual operations
      }
    }

    if (changes.length > 0) {
      return changes.join(', ');
    }

    return `${operations.length} change${operations.length !== 1 ? 's' : ''}`;
  }
}