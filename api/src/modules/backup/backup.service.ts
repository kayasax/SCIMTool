import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { copyFile, stat, access, constants } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);
  private readonly localDbPath = '/app/local-data/scim.db';
  private readonly azureFilesBackupPath = '/app/data/scim.db';
  private backupCount = 0;
  private lastBackupTime: Date | null = null;

  async onModuleInit() {
    this.logger.log('Backup service initialized');
    this.logger.log(`Local DB: ${this.localDbPath}`);
    this.logger.log(`Azure Files backup: ${this.azureFilesBackupPath}`);

    // Perform initial backup after 30 seconds to allow app to initialize
    setTimeout(() => {
      this.performBackup().catch(err =>
        this.logger.error('Initial backup failed:', err)
      );
    }, 30000);
  }

  /**
   * Backup database every 5 minutes
   * Cron: Every 5 minutes
   */
  @Cron('*/5 * * * *', {
    name: 'database-backup',
  })
  async handleBackupCron() {
    await this.performBackup();
  }

  private async performBackup(): Promise<void> {
    try {
      // Check if local database exists
      try {
        await access(this.localDbPath, constants.R_OK);
      } catch {
        this.logger.warn('Local database not found, skipping backup');
        return;
      }

      // Get file stats before backup
      const stats = await stat(this.localDbPath);
      const fileSizeKB = (stats.size / 1024).toFixed(2);

      this.logger.log(`Starting backup #${this.backupCount + 1}...`);

      // Perform the copy
      await copyFile(this.localDbPath, this.azureFilesBackupPath);

      // Update counters
      this.backupCount++;
      this.lastBackupTime = new Date();

      this.logger.log(
        `✓ Backup #${this.backupCount} completed successfully ` +
        `(${fileSizeKB} KB) at ${this.lastBackupTime.toISOString()}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Backup failed:', errorMessage);

      // Don't throw - we want the app to continue even if backup fails
      // This is important because Azure Files might be temporarily unavailable
    }
  }

  /**
   * Get backup statistics
   */
  getBackupStats() {
    return {
      backupCount: this.backupCount,
      lastBackupTime: this.lastBackupTime,
      localDbPath: this.localDbPath,
      azureFilesBackupPath: this.azureFilesBackupPath,
    };
  }

  /**
   * Manually trigger a backup (useful for testing or admin endpoint)
   */
  async triggerManualBackup(): Promise<void> {
    this.logger.log('Manual backup triggered');
    await this.performBackup();
  }
}
