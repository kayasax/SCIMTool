import { Controller, Get, HttpCode, Post, Query, Param, NotFoundException } from '@nestjs/common';

import { LoggingService } from '../../logging/logging.service';

interface VersionInfo {
  version: string;
  commit?: string;
  buildTime?: string; // ISO string
  runtime: {
    node: string;
    platform: string;
  };
}

@Controller('admin')
export class AdminController {
  constructor(private readonly loggingService: LoggingService) {}

  @Post('logs/clear')
  @HttpCode(204)
  async clearLogs(): Promise<void> {
    await this.loggingService.clearLogs();
  }

  @Get('logs')
  async listLogs(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('method') method?: string,
    @Query('status') status?: string,
    @Query('hasError') hasError?: string,
    @Query('urlContains') urlContains?: string,
    @Query('since') since?: string,
    @Query('until') until?: string,
    @Query('search') search?: string,
    @Query('includeAdmin') includeAdmin?: string
  ) {
    return this.loggingService.listLogs({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      method: method || undefined,
      status: status ? Number(status) : undefined,
      hasError: hasError === undefined ? undefined : hasError === 'true',
      urlContains: urlContains || undefined,
      since: since ? new Date(since) : undefined,
      until: until ? new Date(until) : undefined,
      search: search || undefined,
      includeAdmin: includeAdmin === 'true'
    });
  }

  @Get('logs/:id')
  async getLog(@Param('id') id: string) {
    const log = await this.loggingService.getLog(id);
    if (!log) throw new NotFoundException('Log not found');
    return log;
  }

  @Get('version')
  getVersion(): VersionInfo {
    // Prefer explicit env vars injected at build/deploy time
    const version = process.env.APP_VERSION || this.readPackageVersion();
    const commit = process.env.GIT_COMMIT;
    const buildTime = process.env.BUILD_TIME;
    return {
      version,
      commit,
      buildTime,
      runtime: {
        node: process.version,
        platform: `${process.platform}-${process.arch}`
      }
    };
  }

  private readPackageVersion(): string {
    try {
      // Lazy load to avoid startup cost if env already provided
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pkg = require('../../../../package.json');
      return pkg.version || '0.0.0';
    } catch {
      return '0.0.0';
    }
  }
}
