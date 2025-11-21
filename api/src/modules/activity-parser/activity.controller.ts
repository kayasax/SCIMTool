import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityParserService, ActivitySummary } from './activity-parser.service';

@Controller('admin/activity')
export class ActivityController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityParser: ActivityParserService,
  ) {}

  @Get()
  async getActivities(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('search') search?: string,
    @Query('hideKeepalive') hideKeepalive?: string,
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const shouldHideKeepalive = hideKeepalive === 'true';

    // Build where clause for filtering logs
    // Include both legacy (/scim/Users) and versioned (/scim/v2/Users) plus any SCIM base rewrite variants
    const baseConditions: any = {
      AND: [
        {
          OR: [
            { url: { contains: '/Users' } },
            { url: { contains: '/Groups' } },
          ],
        },
        {
          NOT: { url: { contains: '/admin/' } }
        }
      ]
    };

    // Build WHERE clause with keepalive filtering if requested
    // Keepalive detection logic from isKeepaliveRequest:
    // - method === 'GET'
    // - url contains '/Users'
    // - identifier is null or empty
    // - status < 400
    // - filter contains 'userName eq <UUID>'
    //
    // To EXCLUDE keepalive (inverse logic), we need:
    // - method !== 'GET' OR
    // - url not contains '/Users' (but we need /Users for baseConditions, so this is complex) OR
    // - identifier is not null OR
    // - status >= 400 OR status is null OR
    // - no userName eq filter (URL parsing would be needed, omitted for now)
    //
    // Simplified approach: Exclude requests that match all of these conditions:
    // - method = 'GET' AND url contains '/Users' AND identifier IS NULL AND (status IS NULL OR status < 400)
    const keepaliveExclusionConditions: any = shouldHideKeepalive ? {
      OR: [
        { method: { not: 'GET' } },                      // Not a GET request
        { identifier: { not: null } },                   // Has an identifier
        { status: { gte: 400 } },                        // Error status
        { AND: [{ url: { contains: '/Users' } }, { NOT: { url: { contains: '?filter=' } } }] }, // /Users but no filter param
      ]
    } : undefined;

    let whereConditions: any[] = [...baseConditions.AND];

    // Add keepalive exclusion if requested
    if (keepaliveExclusionConditions) {
      whereConditions.push(keepaliveExclusionConditions);
    }

    // Add search conditions if present
    if (search) {
      whereConditions.push({
        OR: [
          { url: { contains: search } },
          { identifier: { contains: search } },
          { requestBody: { contains: search } },
          { responseBody: { contains: search } },
        ],
      });
    }

    const where: any = { AND: whereConditions };

    // Fetch logs from database
    const [logs, total] = await Promise.all([
      this.prisma.requestLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          method: true,
          url: true,
          status: true,
          requestBody: true,
          responseBody: true,
          createdAt: true,
          identifier: true,
        },
      }),
      this.prisma.requestLog.count({ where }),
    ]);

    // Parse each log into an activity summary
    let activities: ActivitySummary[] = await Promise.all(
      logs.map(async log =>
        await this.activityParser.parseActivity({
          id: log.id,
          method: log.method,
          url: log.url,
          status: log.status || undefined,
          requestBody: log.requestBody || undefined,
          responseBody: log.responseBody || undefined,
          createdAt: log.createdAt.toISOString(),
          identifier: log.identifier || undefined,
        })
      )
    );

    // Apply client-side filters
    if (type) {
      activities = activities.filter(activity => activity.type === type);
    }

    if (severity) {
      activities = activities.filter(activity => activity.severity === severity);
    }

    return {
      activities,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      filters: {
        types: ['user', 'group', 'system'],
        severities: ['info', 'success', 'warning', 'error'],
      },
    };
  }

  @Get('summary')
  async getActivitySummary() {
    // Get recent activity counts
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const selectFields = {
      method: true,
      url: true,
      status: true,
      identifier: true as const,
    };

    const [recentDayLogs, recentWeekLogs, userLogs, groupOperations, systemOperations] = await Promise.all([
      this.prisma.requestLog.findMany({
        where: {
          createdAt: { gte: oneDayAgo },
          url: { not: { contains: '/admin/' } },
        },
        select: selectFields,
      }),
      this.prisma.requestLog.findMany({
        where: {
          createdAt: { gte: oneWeekAgo },
          url: { not: { contains: '/admin/' } },
        },
        select: selectFields,
      }),
      this.prisma.requestLog.findMany({
        where: {
          url: { contains: '/Users' },
        },
        select: selectFields,
      }),
      this.prisma.requestLog.count({
        where: {
          url: { contains: '/Groups' },
        },
      }),
      this.prisma.requestLog.count({
        where: {
          url: { not: { contains: '/Users' } },
          AND: { url: { not: { contains: '/Groups' } } },
        },
      }),
    ]);

    const removeKeepalive = (logs: Array<{ method: string; url: string; status: number | null; identifier: string | null }>) =>
      logs.filter((log) => !this.activityParser.isKeepaliveLog(log)).length;

    const last24Hours = removeKeepalive(recentDayLogs);
    const lastWeek = removeKeepalive(recentWeekLogs);
    const userOperations = removeKeepalive(userLogs);

    return {
      summary: {
        last24Hours,
        lastWeek,
        operations: {
          users: userOperations,
          groups: groupOperations,
          system: systemOperations,
        },
      },
    };
  }
}