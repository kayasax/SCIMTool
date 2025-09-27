import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface UserQuery {
  page: number;
  limit: number;
  search?: string;
  active?: boolean;
}

interface GroupQuery {
  page: number;
  limit: number;
  search?: string;
}

@Injectable()
export class DatabaseService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsers(query: UserQuery) {
    const { page, limit, search, active } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { userName: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { givenName: { contains: search, mode: 'insensitive' } },
        { familyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (active !== undefined) {
      where.active = active;
    }

    const [users, total] = await Promise.all([
      this.prisma.scimUser.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userName: true,
          scimId: true,
          externalId: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          groups: {
            select: {
              group: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.scimUser.count({ where }),
    ]);

    return {
      users: users.map(user => ({
        ...user,
        groups: user.groups.map(ug => ug.group),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getGroups(query: GroupQuery) {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [groups, total] = await Promise.all([
      this.prisma.scimGroup.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          displayName: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              members: true,
            },
          },
        },
      }),
      this.prisma.scimGroup.count({ where }),
    ]);

    return {
      groups: groups.map(group => ({
        ...group,
        memberCount: group._count.members,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getUserDetails(id: string) {
    const user = await this.prisma.scimUser.findUnique({
      where: { id },
      include: {
        groups: {
          include: {
            group: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      ...user,
      groups: user.groups.map((ug: any) => ug.group),
    };
  }

  async getGroupDetails(id: string) {
    const group = await this.prisma.scimGroup.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                userName: true,
                active: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      throw new Error('Group not found');
    }

    return {
      ...group,
      members: group.members.map((gm: any) => gm.user),
    };
  }

  async getStatistics() {
    const [
      totalUsers,
      activeUsers,
      totalGroups,
      totalLogs,
      recentActivity,
    ] = await Promise.all([
      this.prisma.scimUser.count(),
      this.prisma.scimUser.count({ where: { active: true } }),
      this.prisma.scimGroup.count(),
      this.prisma.requestLog.count(),
      this.prisma.requestLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
      },
      groups: {
        total: totalGroups,
      },
      activity: {
        totalRequests: totalLogs,
        last24Hours: recentActivity,
      },
    };
  }
}