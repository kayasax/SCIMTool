import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { BackupService } from './backup.service';
import { SharedSecretGuard } from '../auth/shared-secret.guard';

@Controller('scim/admin/backup')
@UseGuards(SharedSecretGuard)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  /**
   * Get backup statistics
   * GET /scim/admin/backup/stats
   */
  @Get('stats')
  getBackupStats() {
    return this.backupService.getBackupStats();
  }

  /**
   * Manually trigger a backup
   * POST /scim/admin/backup/trigger
   */
  @Post('trigger')
  async triggerBackup() {
    await this.backupService.triggerManualBackup();
    return {
      success: true,
      message: 'Backup triggered successfully',
      timestamp: new Date().toISOString(),
    };
  }
}
