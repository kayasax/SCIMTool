import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { copyFile, stat, access, constants } from 'fs/promises';
import { existsSync, createReadStream } from 'fs';

// Optional blob backup support (policy-friendly) activated via env vars
// Required env vars for blob mode:
//   BLOB_BACKUP_ACCOUNT  -> storage account name
//   (optional) BLOB_BACKUP_CONTAINER (default: scimtool-backups)
//   BLOB_BACKUP_INTERVAL_MIN (default: 5)
// Uses DefaultAzureCredential (Managed Identity inside Azure) if available.
// Types are imported dynamically; declare minimal interfaces to satisfy TS when not installed
// We will import actual classes lazily to avoid crashing if feature not enabled.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
// Using unknown instead of any to satisfy strict lint rules while remaining flexible for dynamic import
type BlobContainerClient = { exists(): Promise<boolean>; create(): Promise<void>; getBlockBlobClient(name: string): unknown; listBlobsFlat(opts?: unknown): AsyncIterable<{ name: string }>; deleteBlob(name: string): Promise<void> };
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type BlobSvc = { getContainerClient(name: string): BlobContainerClient };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let BlobServiceClient: any; // runtime provided
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  BlobServiceClient = require('@azure/storage-blob').BlobServiceClient;
} catch {
  // Ignore if dependency not present yet; runtime log will warn if enabled but missing
}

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);
  // Primary ephemeral DB now standardized to /tmp/local-data
  private readonly localDbPath = '/tmp/local-data/scim.db';
  private readonly azureFilesBackupPath = '/app/data/scim.db'; // legacy persistent location
  private readonly blobAccount = process.env.BLOB_BACKUP_ACCOUNT;
  private readonly blobContainer = process.env.BLOB_BACKUP_CONTAINER || 'scimtool-backups';
  private readonly intervalMinutes = Number(process.env.BLOB_BACKUP_INTERVAL_MIN || '5');
  private blobClient: BlobSvc | null = null;
  private blobMode = false;
  private backupCount = 0;
  private lastBackupTime: Date | null = null;

  onModuleInit() {
    this.logger.log('Backup service initialized');
    this.logger.log(`Local DB (ephemeral): ${this.localDbPath}`);

    if (this.blobAccount) {
      if (!BlobServiceClient) {
        this.logger.error('Blob backup mode requested but @azure/storage-blob not installed.');
      } else {
        try {
          const endpoint = `https://${this.blobAccount}.blob.core.windows.net`;
          // DefaultAzureCredential chain is auto-resolved by SDK when no credential param passed (managed identity inside ACA)
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { DefaultAzureCredential } = require('@azure/identity');
          const credential = new DefaultAzureCredential();
          this.blobClient = new BlobServiceClient(endpoint, credential);
          this.blobMode = true;
          this.logger.log(`Blob backup mode enabled → container: ${this.blobContainer} (account: ${this.blobAccount})`);
        } catch (e) {
          this.logger.error('Failed to initialize blob backup mode:', e instanceof Error ? e.message : e);
        }
      }
    } else {
      this.logger.log(`Azure Files backup (persistent path): ${this.azureFilesBackupPath}`);
    }

    // Attempt an early initial backup after 10s; if local DB is not yet created,
    // it will be retried on the cron schedule.
    // Attempt restore then schedule first backup
    setTimeout(() => {
      this.initialRestore().then(() => this.performBackup())
        .catch(err => this.logger.error('Initial cycle failed:', err));
    }, 8000);
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
        this.logger.warn(`Local database not found at ${this.localDbPath}, skipping backup`);
        return;
      }

      // Get file stats before backup
      const stats = await stat(this.localDbPath);
      const fileSizeKB = (stats.size / 1024).toFixed(2);

      this.logger.log(`Starting backup #${this.backupCount + 1} (${fileSizeKB} KB)`);

      if (this.blobMode && this.blobClient) {
        await this.backupToBlob();
      } else {
        // Legacy Azure Files copy
        await copyFile(this.localDbPath, this.azureFilesBackupPath);
      }

      // Update counters
      this.backupCount++;
      this.lastBackupTime = new Date();

      this.logger.log(`✓ Backup #${this.backupCount} completed (${fileSizeKB} KB) @ ${this.lastBackupTime.toISOString()}`);
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
      blobMode: this.blobMode,
      blobAccount: this.blobAccount ?? null,
      blobContainer: this.blobMode ? this.blobContainer : null,
    };
  }

  /**
   * Manually trigger a backup (useful for testing or admin endpoint)
   */
  async triggerManualBackup(): Promise<void> {
    this.logger.log('Manual backup triggered');
    await this.performBackup();
  }

  private async ensureBlobContainer(): Promise<void> {
    if (!this.blobClient) return;
    const container = this.blobClient.getContainerClient(this.blobContainer);
    if (!(await container.exists())) {
      await container.create();
      this.logger.log(`Created blob container ${this.blobContainer}`);
    }
  }

  private async backupToBlob(): Promise<void> {
    if (!this.blobClient) return;
    await this.ensureBlobContainer();
    const container = this.blobClient.getContainerClient(this.blobContainer);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const blobName = `scim-${timestamp}.db`;
  const blockBlobUnknown = container.getBlockBlobClient(blobName);
  // Minimal shape we rely on (type relaxed with unknown)
  const blockBlob = blockBlobUnknown as { uploadStream: (s: NodeJS.ReadableStream, bufferSize: number, maxConcurrency: number, opts: unknown) => Promise<void> };
    if (!existsSync(this.localDbPath)) {
      this.logger.warn('Local DB disappeared before blob upload');
      return;
    }
    const stream = createReadStream(this.localDbPath);
    await blockBlob.uploadStream(stream, 4 * 1024 * 1024, 5, { blobHTTPHeaders: { blobContentType: 'application/octet-stream' } });
    this.logger.log(`Uploaded blob snapshot: ${blobName}`);
    await this.pruneOldBlobs(container);
  }

  private async pruneOldBlobs(container: BlobContainerClient) {
    // Keep most recent 20 snapshots to limit storage
    const blobs: { name: string }[] = [];
    for await (const b of container.listBlobsFlat({ prefix: 'scim-' })) {
      blobs.push({ name: b.name });
    }
    if (blobs.length <= 20) return;
    blobs.sort((a, b) => b.name.localeCompare(a.name)); // newest first
    const toDelete = blobs.slice(20);
    for (const del of toDelete) {
      try { await container.deleteBlob(del.name); } catch (e) {
        let msg: string;
        if (e instanceof Error) { msg = e.message; } else { try { msg = JSON.stringify(e); } catch { msg = String(e); } }
        this.logger.debug(`Failed to delete old blob ${del.name}: ${msg}`);
      }
    }
    if (toDelete.length) {
      this.logger.log(`Pruned ${toDelete.length} old blob snapshots`);
    }
  }

  private async initialRestore(): Promise<void> {
    if (!this.blobMode || !this.blobClient) return;
    if (existsSync(this.localDbPath)) {
      this.logger.log('Local DB already present, skipping restore');
      return;
    }
    this.logger.log('Attempting blob snapshot restore (local DB absent)');
    const container = this.blobClient.getContainerClient(this.blobContainer);
    if (!(await container.exists())) {
      this.logger.log('Blob container does not exist yet; no restore possible');
      return;
    }
    const blobs: { name: string }[] = [];
    for await (const b of container.listBlobsFlat({ prefix: 'scim-' })) {
      blobs.push({ name: b.name });
    }
    if (!blobs.length) {
      this.logger.log('No snapshots found to restore');
      return;
    }
    blobs.sort((a, b) => b.name.localeCompare(a.name));
    const latest = blobs[0];
    this.logger.log(`Restoring from snapshot: ${latest.name}`);
    // Dynamic import to keep types loose
    const block = container.getBlockBlobClient(latest.name) as any;
    const fs = await import('fs');
    const writeStream = fs.createWriteStream(this.localDbPath);
    const download = await block.download();
    await new Promise<void>((resolve, reject) => {
      download.readableStreamBody
        .pipe(writeStream)
        .on('finish', resolve)
        .on('error', reject);
    });
    this.logger.log('Restore complete');
  }
}
