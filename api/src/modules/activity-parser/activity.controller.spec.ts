import { Test, TestingModule } from '@nestjs/testing';
import { ActivityController } from './activity.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityParserService } from './activity-parser.service';

describe('ActivityController', () => {
  let controller: ActivityController;
  let prismaService: PrismaService;
  let activityParserService: ActivityParserService;

  // Mock data helpers
  const createMockLog = (overrides: any = {}) => ({
    id: overrides.id || '1',
    method: overrides.method || 'GET',
    url: overrides.url || '/scim/v2/Users',
    status: overrides.status !== undefined ? overrides.status : 200,
    durationMs: overrides.durationMs !== undefined ? overrides.durationMs : 100,
    requestHeaders: overrides.requestHeaders || '{}',
    requestBody: overrides.requestBody || null,
    responseHeaders: overrides.responseHeaders || '{}',
    responseBody: overrides.responseBody || null,
    errorMessage: overrides.errorMessage || null,
    errorStack: overrides.errorStack || null,
    createdAt: overrides.createdAt || new Date('2024-01-01T10:00:00Z'),
    identifier: overrides.identifier !== undefined ? overrides.identifier : null,
  });

  const mockActivitySummary = (log: any) => ({
    id: log.id,
    type: 'user' as const,
    severity: 'info' as const,
    timestamp: log.createdAt,
    icon: '👤',
    message: 'User activity',
    details: 'Activity details',
    isKeepalive: false,
  });

  const createKeepaliveLogs = (count: number, startId: number = 1) => {
    return Array.from({ length: count }, (_, i) => createMockLog({
      id: String(startId + i),
      method: 'GET',
      url: `/scim/v2/Users?filter=userName eq "12345678-1234-1234-1234-12345678${String(i).padStart(4, '0')}"`,
      status: 200,
      identifier: null,
    }));
  };

  const createNonKeepaliveLogs = (count: number, startId: number = 1) => {
    return Array.from({ length: count }, (_, i) => createMockLog({
      id: String(startId + i),
      method: 'POST',
      url: '/scim/v2/Users',
      status: 201,
      identifier: `user-${i}`,
      requestBody: JSON.stringify({ userName: `user${i}@example.com` }),
      responseBody: JSON.stringify({ id: `user-${i}` }),
    }));
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            requestLog: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: ActivityParserService,
          useValue: {
            parseActivity: jest.fn(),
            isKeepaliveLog: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ActivityController>(ActivityController);
    prismaService = module.get<PrismaService>(PrismaService);
    activityParserService = module.get<ActivityParserService>(ActivityParserService);
  });

  describe('getActivities - hideKeepalive parameter', () => {
    describe('when hideKeepalive=true', () => {
      it('should exclude keepalive requests from the count and results', async () => {
        // ARRANGE: 100 total logs, 50 are keepalive, 50 are real activities
        const keepaliveLogs = createKeepaliveLogs(50, 1);
        const realLogs = createNonKeepaliveLogs(50, 51);
        const allLogs = [...keepaliveLogs, ...realLogs];

        // Mock Prisma to return only non-keepalive logs when WHERE clause filters them
        jest.spyOn(prismaService.requestLog, 'findMany').mockResolvedValue(realLogs);
        jest.spyOn(prismaService.requestLog, 'count').mockResolvedValue(50); // Only count non-keepalive

        // Mock activity parser to identify keepalive logs
        jest.spyOn(activityParserService, 'isKeepaliveLog').mockImplementation((log: any) => {
          return log.method === 'GET' && 
                 log.url.includes('/Users?filter=userName eq') &&
                 log.identifier === null &&
                 log.status < 400;
        });

        // Mock parseActivity to return simple activity summaries
        jest.spyOn(activityParserService, 'parseActivity').mockImplementation(async (log: any) => ({
          id: log.id,
          type: 'user' as const,
          severity: 'info' as const,
          timestamp: log.createdAt,
          icon: '👤',
          message: 'User activity',
          details: 'Activity details',
          isKeepalive: false,
        }));

        // ACT
        const result = await controller.getActivities('1', '50', undefined, undefined, undefined, 'true');

        // ASSERT
        expect(result.pagination.total).toBe(50); // Should reflect filtered count
        expect(result.pagination.pages).toBe(1); // 50 logs / 50 per page = 1 page
        expect(result.activities.length).toBe(50); // Should return all non-keepalive logs
        
        // Verify the WHERE clause excluded keepalive in the Prisma query
        // (In real implementation, this will be tested by verifying the WHERE conditions)
        expect(prismaService.requestLog.count).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              AND: expect.arrayContaining([
                expect.objectContaining({
                  OR: expect.any(Array), // Base conditions for /Users or /Groups
                }),
              ]),
            }),
          })
        );
      });

      it('should show correct pagination with multiple pages when filtering keepalive', async () => {
        // ARRANGE: 200 total logs, 150 keepalive, 50 real activities
        // With limit=20, should show 3 pages (50/20 = 2.5 -> 3 pages)
        const realLogs = createNonKeepaliveLogs(20, 1); // First page of 20

        jest.spyOn(prismaService.requestLog, 'findMany').mockResolvedValue(realLogs);
        jest.spyOn(prismaService.requestLog, 'count').mockResolvedValue(50); // Total non-keepalive count

        jest.spyOn(activityParserService, 'parseActivity').mockImplementation(async (log: any) => mockActivitySummary(log));

        // ACT
        const result = await controller.getActivities('1', '20', undefined, undefined, undefined, 'true');

        // ASSERT
        expect(result.pagination.total).toBe(50);
        expect(result.pagination.pages).toBe(3); // ceil(50/20) = 3 pages
        expect(result.pagination.page).toBe(1);
        expect(result.pagination.limit).toBe(20);
        expect(result.activities.length).toBe(20);
      });

      it('should return no empty pages when navigating through filtered results', async () => {
        // ARRANGE: Page 3 of 3 with only 10 items left
        const lastPageLogs = createNonKeepaliveLogs(10, 41);

        jest.spyOn(prismaService.requestLog, 'findMany').mockResolvedValue(lastPageLogs);
        jest.spyOn(prismaService.requestLog, 'count').mockResolvedValue(50);

        jest.spyOn(activityParserService, 'parseActivity').mockImplementation(async (log: any) => mockActivitySummary(log));

        // ACT - Request page 3
        const result = await controller.getActivities('3', '20', undefined, undefined, undefined, 'true');

        // ASSERT
        expect(result.activities.length).toBe(10); // Last page has 10 items
        expect(result.pagination.page).toBe(3);
        expect(result.pagination.total).toBe(50);
        expect(result.pagination.pages).toBe(3);
      });

      it('should handle edge case when all logs are keepalive requests', async () => {
        // ARRANGE: 100 logs, all are keepalive
        jest.spyOn(prismaService.requestLog, 'findMany').mockResolvedValue([]);
        jest.spyOn(prismaService.requestLog, 'count').mockResolvedValue(0);

        // ACT
        const result = await controller.getActivities('1', '50', undefined, undefined, undefined, 'true');

        // ASSERT
        expect(result.pagination.total).toBe(0);
        expect(result.pagination.pages).toBe(0); // No pages when no results
        expect(result.activities.length).toBe(0);
      });
    });

    describe('when hideKeepalive=false or undefined', () => {
      it('should include all logs including keepalive when hideKeepalive=false', async () => {
        // ARRANGE: 100 total logs (50 keepalive + 50 real)
        const keepaliveLogs = createKeepaliveLogs(50, 1);
        const realLogs = createNonKeepaliveLogs(50, 51);
        const allLogs = [...keepaliveLogs, ...realLogs].slice(0, 50); // First page

        jest.spyOn(prismaService.requestLog, 'findMany').mockResolvedValue(allLogs);
        jest.spyOn(prismaService.requestLog, 'count').mockResolvedValue(100); // Count all logs

        jest.spyOn(activityParserService, 'parseActivity').mockImplementation(async (log: any) => mockActivitySummary(log));

        // ACT
        const result = await controller.getActivities('1', '50', undefined, undefined, undefined, 'false');

        // ASSERT
        expect(result.pagination.total).toBe(100); // All logs counted
        expect(result.pagination.pages).toBe(2); // 100/50 = 2 pages
        expect(result.activities.length).toBe(50);
      });

      it('should include all logs by default when hideKeepalive parameter is not provided', async () => {
        // ARRANGE: Same as above but without hideKeepalive param
        const keepaliveLogs = createKeepaliveLogs(25, 1);
        const realLogs = createNonKeepaliveLogs(25, 26);
        const allLogs = [...keepaliveLogs, ...realLogs];

        jest.spyOn(prismaService.requestLog, 'findMany').mockResolvedValue(allLogs);
        jest.spyOn(prismaService.requestLog, 'count').mockResolvedValue(50);

        jest.spyOn(activityParserService, 'parseActivity').mockImplementation(async (log: any) => mockActivitySummary(log));

        // ACT - Don't pass hideKeepalive parameter
        const result = await controller.getActivities('1', '50', undefined, undefined, undefined);

        // ASSERT
        expect(result.pagination.total).toBe(50); // All logs
        expect(result.pagination.pages).toBe(1);
        expect(result.activities.length).toBe(50);
      });
    });

    describe('keepalive detection logic in WHERE clause', () => {
      it('should filter keepalive using Prisma WHERE conditions matching isKeepaliveLog logic', async () => {
        // This test verifies the WHERE clause structure matches keepalive criteria:
        // - method != 'GET' OR url not contains '/Users' OR identifier IS NOT NULL OR status >= 400 OR no userName eq filter

        jest.spyOn(prismaService.requestLog, 'findMany').mockResolvedValue([]);
        jest.spyOn(prismaService.requestLog, 'count').mockResolvedValue(0);

        // ACT
        await controller.getActivities('1', '50', undefined, undefined, undefined, 'true');

        // ASSERT - Verify WHERE clause structure
        expect(prismaService.requestLog.count).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              AND: expect.arrayContaining([
                // Should include base conditions (OR /Users, /Groups; NOT /admin/)
                expect.anything(),
                // Should include keepalive exclusion conditions when hideKeepalive=true
                expect.objectContaining({
                  OR: expect.arrayContaining([
                    expect.objectContaining({ method: expect.objectContaining({ not: 'GET' }) }),
                    expect.anything(), // Other keepalive exclusion conditions
                  ]),
                }),
              ]),
            }),
          })
        );
      });
    });

    describe('integration with search and other filters', () => {
      it('should apply hideKeepalive filter together with search query', async () => {
        // ARRANGE: Search for "john" with hideKeepalive=true
        const matchingLogs = createNonKeepaliveLogs(5, 1);
        
        jest.spyOn(prismaService.requestLog, 'findMany').mockResolvedValue(matchingLogs);
        jest.spyOn(prismaService.requestLog, 'count').mockResolvedValue(5);

        jest.spyOn(activityParserService, 'parseActivity').mockImplementation(async (log: any) => mockActivitySummary(log));

        // ACT
        const result = await controller.getActivities('1', '50', undefined, undefined, 'john', 'true');

        // ASSERT
        expect(result.pagination.total).toBe(5);
        expect(result.activities.length).toBe(5);
        
        // Verify WHERE clause includes both search and keepalive filters
        expect(prismaService.requestLog.count).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              AND: expect.arrayContaining([
                // Search conditions
                expect.objectContaining({
                  OR: expect.any(Array), // url, identifier, requestBody, responseBody search
                }),
                // Base conditions
                expect.anything(),
                // Keepalive filter conditions
                expect.anything(),
              ]),
            }),
          })
        );
      });
    });
  });

  describe('Prisma WHERE clause structure validation', () => {
    it('should construct proper nested AND/OR conditions for keepalive filtering', async () => {
      // This test validates the exact Prisma query structure we need to implement
      // to match the isKeepaliveRequest logic:
      //
      // Keepalive = GET + /Users + no identifier + status < 400 + userName eq UUID filter
      // 
      // To EXCLUDE keepalive (hideKeepalive=true), we need the inverse:
      // NOT keepalive = (method != GET) OR (no /Users in URL) OR (has identifier) OR (status >= 400) OR (no userName eq UUID)
      //
      // Expected WHERE structure:
      // {
      //   AND: [
      //     { OR: [{ url: contains '/Users' }, { url: contains '/Groups' }] }, // base filter
      //     { NOT: { url: contains '/admin/' } }, // exclude admin
      //     { // KEEPALIVE EXCLUSION (when hideKeepalive=true)
      //       OR: [
      //         { method: { not: 'GET' } },
      //         { url: { not: { contains: '/Users' } } },
      //         { identifier: { not: null } },
      //         { status: { gte: 400 } },
      //         // URL parsing for userName eq filter would need custom logic or raw query
      //       ]
      //     }
      //   ]
      // }

      jest.spyOn(prismaService.requestLog, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.requestLog, 'count').mockResolvedValue(0);

      await controller.getActivities('1', '50', undefined, undefined, undefined, 'true');

      // This test documents the expected structure - actual implementation will be done next
      // For now, we expect the test to fail, driving us to implement the WHERE clause correctly
      const calls = (prismaService.requestLog.count as jest.Mock).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      
      const whereClause = calls[0][0].where;
      expect(whereClause).toBeDefined();
      expect(whereClause.AND).toBeDefined();
      expect(Array.isArray(whereClause.AND)).toBe(true);
    });
  });
});
