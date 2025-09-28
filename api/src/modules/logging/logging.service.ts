import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export interface CreateRequestLogOptions {
  method: string;
  url: string;
  status?: number;
  durationMs?: number;
  requestHeaders: Record<string, unknown>;
  requestBody?: unknown;
  responseHeaders?: Record<string, unknown>;
  responseBody?: unknown;
  error?: unknown;
}

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordRequest({
    method,
    url,
    status,
    durationMs,
    requestHeaders,
    requestBody,
    responseHeaders,
    responseBody,
    error
  }: CreateRequestLogOptions): Promise<void> {
    const errorMessage = this.extractErrorMessage(error);
    const errorStack = this.extractErrorStack(error);
    // Compute identifier once (cheap vs later bulk parsing). Works for Users (userName/email/externalId) & Groups (displayName)
    let identifier: string | undefined;
    try {
      const idCandidate = this.deriveReportableIdentifier(url, requestBody, responseBody) ||
        (/\/scim\/Groups/i.test(url) ? this.deriveGroupDisplayName(
          this.normalizeObject(requestBody) ?? null,
          this.normalizeObject(responseBody) ?? null
        ) : undefined) || this.deriveIdentifierFromUrl(url);
      if (idCandidate && typeof idCandidate === 'string') identifier = idCandidate;
    } catch {/* swallow */}

    const data: Prisma.RequestLogCreateInput = {
      method,
      url,
      status: status ?? null,
      durationMs: durationMs ?? null,
      requestHeaders: this.stringifyValue(requestHeaders) ?? '{}',
      requestBody: this.stringifyValue(requestBody),
      responseHeaders: this.stringifyValue(responseHeaders),
      responseBody: this.stringifyValue(responseBody),
      errorMessage,
      errorStack
    };

    try {
      const created = await this.prisma.requestLog.create({ data });
      if (identifier) {
        // Best-effort: attempt to persist identifier via raw SQL (ignore failure if column absent)
        try {
          await this.prisma.$executeRawUnsafe(
            'UPDATE RequestLog SET identifier = ? WHERE id = ?',
            identifier,
            created.id
          );
        } catch {/* ignore if column missing */}
      }
    } catch (persistError) {
      this.logger.error('Failed to persist request log', persistError as Error);
    }
  }

  async clearLogs(): Promise<number> {
    const result = await this.prisma.requestLog.deleteMany();
    return result.count;
  }

  async listLogs(filters: {
    page?: number;
    pageSize?: number;
    method?: string;
    status?: number;
    hasError?: boolean;
    urlContains?: string;
    since?: Date;
    until?: Date;
    search?: string;
    includeAdmin?: boolean;
  } = {}) {
    const pageSize = Math.min(Math.max(filters.pageSize ?? 50, 1), 200);
    const page = Math.max(filters.page ?? 1, 1);

  const where: Prisma.RequestLogWhereInput = {};
    if (filters.method) where.method = filters.method.toUpperCase();
    if (typeof filters.status === 'number') where.status = filters.status;
    if (filters.hasError === true) where.errorMessage = { not: null };
    if (filters.hasError === false) where.errorMessage = null;
    if (filters.urlContains) where.url = { contains: filters.urlContains };

    // By default, exclude admin endpoints and non-SCIM traffic to focus on SCIM provisioning
    if (!filters.includeAdmin) {
      const nonScimFilters = [
        { url: { not: { contains: '/scim/admin/' } } },
        { url: { not: { equals: '/' } } },
        { url: { not: { equals: '/health' } } }
      ];

      if (Array.isArray(where.AND)) {
        where.AND.push(...nonScimFilters);
      } else if (where.AND) {
        where.AND = [where.AND, ...nonScimFilters];
      } else {
        where.AND = nonScimFilters;
      }
    }

    if (filters.since || filters.until) {
      where.createdAt = {};
      if (filters.since) where.createdAt.gte = filters.since;
      if (filters.until) where.createdAt.lte = filters.until;
    }
    if (filters.search) {
      const s = filters.search;
      // Expand search to additional large text columns (stored as JSON strings)
      // Using mode: 'insensitive' when supported (ignored silently if not by connector)
      const textSearch: Prisma.RequestLogWhereInput[] = [
        { url: { contains: s } },
        { errorMessage: { contains: s } },
        { requestHeaders: { contains: s } },
        { responseHeaders: { contains: s } },
        { requestBody: { contains: s } },
        { responseBody: { contains: s } }
      ];
      // Merge with existing OR if already set (unlikely at this point, but safe)
      if (where.OR) {
        where.OR = [...where.OR, ...textSearch];
      } else {
        where.OR = textSearch;
      }
    }

    const skip = (page - 1) * pageSize;

    // Defensive: ensure no invalid Date objects slip through
    const isInvalidDate = (d: unknown): d is Date => d instanceof Date && isNaN(d.getTime());
    if (isInvalidDate(filters.since) || isInvalidDate(filters.until)) {
      const sinceStr = filters.since ? String(filters.since) : 'undefined';
      const untilStr = filters.until ? String(filters.until) : 'undefined';
      this.logger.warn(`Ignoring invalid date filter(s): since='${sinceStr}' until='${untilStr}'`);
      if (where.createdAt && Object.keys(where.createdAt as object).length === 0) {
        delete where.createdAt; // remove empty date filter
      }
    }

    let total = 0;
    type RequestLogRow = {
      id: string;
      method: string;
      url: string;
      status: number | null;
      durationMs: number | null;
      createdAt: Date;
      errorMessage: string | null;
    };
    let records: RequestLogRow[] = [];
    try {
      [total, records] = await Promise.all([
        this.prisma.requestLog.count({ where }),
        this.prisma.requestLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
          // Limit fields to mitigate potential large string conversion issues
          select: {
            id: true,
            method: true,
            url: true,
            status: true,
            durationMs: true,
            createdAt: true,
            errorMessage: true
          }
        })
      ]);
    } catch (err) {
      this.logger.error(
        'requestLog.findMany failed',
        err as Error,
        JSON.stringify({ where, page, pageSize })
      );
      throw err; // rethrow for controller to handle
    }

    // Try to pull identifiers in one raw query (ignore if column not present)
  const identifierMap: Record<string, string | null> = {};
    try {
      const ids = records.map(r => `'${r.id}'`).join(',');
      if (ids.length) {
        // Unsafe raw only over internal generated IDs (cuid) - controlled
        const rows: Array<{ id: string; identifier: string | null }> = await this.prisma.$queryRawUnsafe(
          `SELECT id, identifier FROM RequestLog WHERE id IN (${ids})`
        );
        for (const row of rows) identifierMap[row.id] = row.identifier;
      }
    } catch { /* column might not exist yet or query failed */ }

    return {
      total,
      page,
      pageSize,
      count: records.length,
      hasNext: skip + records.length < total,
      hasPrev: page > 1,
      items: records.map((r) => this.mapLog(r, identifierMap))
    };
  }

  private mapLog(r: {
    id: string;
    method: string;
    url: string;
    status: number | null;
    durationMs: number | null;
    createdAt: Date;
    errorMessage: string | null;
  }, identifierMap?: Record<string, string | null>) {
    const identifier = identifierMap?.[r.id] || this.deriveIdentifierFromUrl(r.url);
    return {
      id: r.id,
      method: r.method,
      url: r.url,
      status: r.status ?? undefined,
      durationMs: r.durationMs ?? undefined,
      createdAt: r.createdAt,
      errorMessage: r.errorMessage ?? undefined,
      reportableIdentifier: identifier
    };
  }

  async getLog(id: string) {
    const row = await this.prisma.requestLog.findUnique({ where: { id } });
    if (!row) return null;
    // Parse bodies once for identifier + returned payload
    const parsedRequest = this.safeParse(row.requestBody ? String(row.requestBody) : null);
    const parsedResponse = this.safeParse(row.responseBody ? String(row.responseBody) : null);
    const rid =
      this.deriveReportableIdentifier(row.url, parsedRequest, parsedResponse) ||
      this.deriveGroupDisplayName(
        parsedRequest as Record<string, unknown> | null,
        parsedResponse as Record<string, unknown> | null
      ) ||
      this.deriveIdentifierFromUrl(row.url);
    return {
      id: row.id,
      method: row.method,
      url: row.url,
      status: row.status ?? undefined,
      durationMs: row.durationMs ?? undefined,
      createdAt: row.createdAt,
      requestHeaders: this.safeParse(row.requestHeaders ? String(row.requestHeaders) : null),
      requestBody: parsedRequest,
      responseHeaders: this.safeParse(row.responseHeaders ? String(row.responseHeaders) : null),
      responseBody: parsedResponse,
      errorMessage: row.errorMessage ?? undefined,
      reportableIdentifier: rid
    };
  }

  private deriveReportableIdentifier(url: string, requestBody: unknown, responseBody: unknown): string | undefined {
    try {
      // If this is a SCIM User create/update, prefer response id or userName
      const isUserEndpoint = /\/scim\/Users/i.test(url) || /\/Users/i.test(url);
      if (!isUserEndpoint) return undefined;
      const rb = this.normalizeObject(requestBody);
      const resp = this.normalizeObject(responseBody);

      const extractEmail = (o?: Record<string, unknown>): string | undefined => {
        if (!o) return undefined;
        const raw = o['emails'];
        if (Array.isArray(raw)) {
          interface EmailEntry { value?: unknown; primary?: unknown; }
          const isEmailEntry = (e: unknown): e is EmailEntry => !!e && typeof e === 'object';
          const primary = raw.find((e) => isEmailEntry(e) && e.primary && typeof e.value === 'string');
          if (primary && typeof primary.value === 'string' && primary.value.trim()) return primary.value.trim();
          const first = raw.find((e) => isEmailEntry(e) && typeof e.value === 'string');
          if (first && typeof first.value === 'string' && first.value.trim()) return first.value.trim();
        }
        return undefined;
      };

      const candidates: (unknown)[] = [
        resp?.userName,
        extractEmail(resp),
        rb?.userName,
        extractEmail(rb),
        resp?.externalId,
        rb?.externalId,
        // fallbacks last: ids
        resp?.id,
        rb?.id
      ];

      for (const c of candidates) {
        if (typeof c === 'string') {
          const trimmed = c.trim();
          if (trimmed) return trimmed;
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  private deriveIdentifierFromUrl(url: string): string | undefined {
    // Attempt to pull last UUID-like or alphanumeric segment for context
    const parts = url.split('?')[0].split('/').filter(Boolean);
    if (parts.length === 0) return undefined;
    const last = parts[parts.length - 1];
    if (/^[0-9a-fA-F-]{8,}$/.test(last)) return last;
    return undefined;
  }

  private deriveGroupDisplayName(req: Record<string, unknown> | null, resp: Record<string, unknown> | null): string | undefined {
    const candidates: unknown[] = [
      resp && typeof resp === 'object' ? resp['displayName' as keyof typeof resp] : undefined,
      req && typeof req === 'object' ? req['displayName' as keyof typeof req] : undefined
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim()) return c;
    }
    return undefined;
  }

  // Removed persistent identifier logic; derivation now purely ephemeral.

  private normalizeObject(value: unknown): Record<string, unknown> | undefined {
    if (!value) return undefined;
    if (typeof value === 'object') return value as Record<string, unknown>;
    try {
      return JSON.parse(String(value));
    } catch { return undefined; }
  }

  private safeParse(value: string | null): unknown {
    if (!value) return undefined;
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }

  private stringifyValue(value: unknown): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    try {
      return JSON.stringify(value);
    } catch (error) {
      this.logger.warn('Failed to stringify log value', error as Error);
      return null;
    }
  }

  private extractErrorMessage(error: unknown): string | null {
    if (!error) {
      return null;
    }

    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return JSON.stringify(error);
  }

  private extractErrorStack(error: unknown): string | null {
    if (!error) {
      return null;
    }

    if (error instanceof Error) {
      return error.stack ?? null;
    }

    return null;
  }
}
