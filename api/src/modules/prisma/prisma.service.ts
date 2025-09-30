import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Enable query logging for debugging
      log: ['warn', 'error'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    
    // Enable WAL mode for better concurrency and Azure Files compatibility
    // WAL mode reduces lock contention and is more tolerant of network latency
    try {
      this.logger.log('Configuring SQLite with WAL mode and optimized settings...');
      
      await this.$executeRawUnsafe('PRAGMA journal_mode = WAL;');
      await this.$executeRawUnsafe('PRAGMA busy_timeout = 30000;'); // 30 second timeout
      await this.$executeRawUnsafe('PRAGMA synchronous = NORMAL;'); // Balance safety and performance
      await this.$executeRawUnsafe('PRAGMA cache_size = 10000;'); // 10MB cache
      await this.$executeRawUnsafe('PRAGMA temp_store = MEMORY;'); // Use memory for temp tables
      await this.$executeRawUnsafe('PRAGMA mmap_size = 30000000000;'); // 30GB memory-mapped I/O
      await this.$executeRawUnsafe('PRAGMA page_size = 4096;'); // Optimize page size
      
      // Verify WAL mode is enabled
      const result = await this.$queryRaw`PRAGMA journal_mode;`;
      this.logger.log(`SQLite journal mode: ${JSON.stringify(result)}`);
      this.logger.log('SQLite configured successfully for Azure Files');
    } catch (error) {
      this.logger.error('Failed to configure SQLite settings:', error);
      // Don't throw - allow app to start even if pragma configuration fails
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
