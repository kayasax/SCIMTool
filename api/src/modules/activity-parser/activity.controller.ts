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
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for filtering logs
    const baseConditions = {
      AND: [
        {
          OR: [
            { url: { contains: '/scim/Users' } },
            { url: { contains: '/scim/Groups' } },
          ],
        },
        {
          NOT: {
            url: { contains: '/admin/' }
          }
        }
      ],
    };

    const where = search ? {
      AND: [
        ...baseConditions.AND,
        {
          OR: [
            { url: { contains: search } },
            { identifier: { contains: search } },
            { requestBody: { contains: search } },
            { responseBody: { contains: search } },
          ],
        },
      ],
    } : baseConditions;

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

    const [last24Hours, lastWeek, userOperations, groupOperations, systemOperations] = await Promise.all([
      this.prisma.requestLog.count({
        where: {
          createdAt: { gte: oneDayAgo },
          url: { not: { contains: '/admin/' } },
        },
      }),
      this.prisma.requestLog.count({
        where: {
          createdAt: { gte: oneWeekAgo },
          url: { not: { contains: '/admin/' } },
        },
      }),
      this.prisma.requestLog.count({
        where: {
          url: { contains: '/Users' },
        },
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