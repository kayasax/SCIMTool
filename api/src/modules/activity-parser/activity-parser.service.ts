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
        groupIdentifier,
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
  }): Promise<ActivitySummary> {
    const { id, timestamp, method, status, requestData, responseData, userIdentifier, isListOperation, isGetOperation } = params;

    // For now, just mark as async without changing logic - can enhance later with user name resolution
    await Promise.resolve();

    // Handle errors first
    if (status >= 400) {
      return {
        id,
        timestamp,
        icon: '❌',
        message: `Failed to ${method.toLowerCase()} user${userIdentifier ? `: ${userIdentifier}` : ''}`,
        details: `HTTP ${status}`,
        type: 'user',
        severity: 'error',
        userIdentifier,
      };
    }

    // Handle successful operations
    switch (method) {
      case 'POST':
        return {
          id,
          timestamp,
          icon: '👤',
          message: `User created${userIdentifier ? `: ${userIdentifier}` : ''}`,
          details: this.extractUserDetails(requestData),
          type: 'user',
          severity: 'success',
          userIdentifier,
        };

      case 'PUT':
        return {
          id,
          timestamp,
          icon: '✏️',
          message: `User updated${userIdentifier ? `: ${userIdentifier}` : ''}`,
          details: this.extractUserDetails(requestData),
          type: 'user',
          severity: 'info',
          userIdentifier,
        };

      case 'PATCH':
        const operations = requestData?.Operations || [];
        const deactivateOp = operations.find((op: any) =>
          op.path === 'active' && op.value === false
        );
        const activateOp = operations.find((op: any) =>
          op.path === 'active' && op.value === true
        );

        if (deactivateOp) {
          return {
            id,
            timestamp,
            icon: '⚠️',
            message: `User deactivated${userIdentifier ? `: ${userIdentifier}` : ''}`,
            type: 'user',
            severity: 'warning',
            userIdentifier,
          };
        } else if (activateOp) {
          return {
            id,
            timestamp,
            icon: '✅',
            message: `User activated${userIdentifier ? `: ${userIdentifier}` : ''}`,
            type: 'user',
            severity: 'success',
            userIdentifier,
          };
        } else {
          return {
            id,
            timestamp,
            icon: '✏️',
            message: `User modified${userIdentifier ? `: ${userIdentifier}` : ''}`,
            details: `${operations.length} change${operations.length !== 1 ? 's' : ''}`,
            type: 'user',
            severity: 'info',
            userIdentifier,
          };
        }

      case 'DELETE':
        return {
          id,
          timestamp,
          icon: '🗑️',
          message: `User deleted${userIdentifier ? `: ${userIdentifier}` : ''}`,
          type: 'user',
          severity: 'warning',
          userIdentifier,
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
      return {
        id,
        timestamp,
        icon: '❌',
        message: `Failed to ${method.toLowerCase()} group${groupIdentifier ? `: ${groupIdentifier}` : ''}`,
        details: `HTTP ${status}`,
        type: 'group',
        severity: 'error',
        groupIdentifier,
      };
    }

    // Handle successful operations
    switch (method) {
      case 'POST':
        return {
          id,
          timestamp,
          icon: '🏢',
          message: `Group created${groupIdentifier ? `: ${groupIdentifier}` : ''}`,
          details: this.extractGroupDetails(requestData),
          type: 'group',
          severity: 'success',
          groupIdentifier,
        };

      case 'PUT':
        return {
          id,
          timestamp,
          icon: '✏️',
          message: `Group updated${groupIdentifier ? `: ${groupIdentifier}` : ''}`,
          details: this.extractGroupDetails(requestData),
          type: 'group',
          severity: 'info',
          groupIdentifier,
        };

      case 'PATCH':
        const operations = requestData?.Operations || [];
        const memberOps = operations.filter((op: any) =>
          op.path === 'members' || op.path?.startsWith('members[')
        );

        if (memberOps.length > 0) {
          const addOps = memberOps.filter((op: any) => op.op === 'add');
          const removeOps = memberOps.filter((op: any) => op.op === 'remove');

          if (addOps.length > 0 && removeOps.length === 0) {
            // Extract user names from SCIM payload (prefer display names)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const memberInfo = addOps.map((op: any) => ({
              id: op.value?.value || 'Unknown',
              display: op.value?.display || null
            }));
            
            const memberNames = await Promise.all(
              memberInfo.map(async (member: { id: string; display: string | null }) => {
                // Use display name from SCIM payload if available
                if (member.display) return member.display;
                // Try database lookup for known users
                if (member.id !== 'Unknown') {
                  const resolvedName = await this.resolveUserName(member.id);
                  if (resolvedName !== member.id) return resolvedName;
                }
                // Fallback to shortened ID for better readability
                return member.id.length > 8 ? `User ${member.id.substring(0, 8)}...` : member.id;
              })
            );
            const resolvedGroupName = groupIdentifier ? await this.resolveGroupName(groupIdentifier) : 'Group';

            return {
              id,
              timestamp,
              icon: '➕',
              message: `${memberNames.join(', ')} ${memberNames.length > 1 ? 'were' : 'was'} added to ${resolvedGroupName}`,
              details: `${addOps.length} member${addOps.length > 1 ? 's' : ''} added`,
              type: 'group',
              severity: 'success',
              groupIdentifier,
            };
          } else if (removeOps.length > 0 && addOps.length === 0) {
            // Extract user names from SCIM payload (prefer display names)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const memberInfo = removeOps.map((op: any) => ({
              id: op.value?.value || 'Unknown',
              display: op.value?.display || null
            }));
            
            const memberNames = await Promise.all(
              memberInfo.map(async (member: { id: string; display: string | null }) => {
                // Use display name from SCIM payload if available
                if (member.display) return member.display;
                // Try database lookup for known users
                if (member.id !== 'Unknown') {
                  const resolvedName = await this.resolveUserName(member.id);
                  if (resolvedName !== member.id) return resolvedName;
                }
                // Fallback to shortened ID for better readability
                return member.id.length > 8 ? `User ${member.id.substring(0, 8)}...` : member.id;
              })
            );
            const resolvedGroupName = groupIdentifier ? await this.resolveGroupName(groupIdentifier) : 'Group';

            return {
              id,
              timestamp,
              icon: '➖',
              message: `${memberNames.join(', ')} ${memberNames.length > 1 ? 'were' : 'was'} removed from ${resolvedGroupName}`,
              details: `${removeOps.length} member${removeOps.length > 1 ? 's' : ''} removed`,
              type: 'group',
              severity: 'info',
              groupIdentifier,
            };
          } else {
            return {
              id,
              timestamp,
              icon: '👥',
              message: `${groupIdentifier || 'Group'} membership updated`,
              details: `${memberOps.length} change${memberOps.length !== 1 ? 's' : ''}`,
              type: 'group',
              severity: 'info',
              groupIdentifier,
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
          };
        }

      case 'DELETE':
        return {
          id,
          timestamp,
          icon: '🗑️',
          message: `Group deleted${groupIdentifier ? `: ${groupIdentifier}` : ''}`,
          type: 'group',
          severity: 'warning',
          groupIdentifier,
        };

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
    };
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

  private extractUserDetails(data: any): string | undefined {
    if (!data) return undefined;

    const details: string[] = [];

    if (data.name?.givenName || data.name?.familyName) {
      const fullName = `${data.name.givenName || ''} ${data.name.familyName || ''}`.trim();
      if (fullName) details.push(fullName);
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
}