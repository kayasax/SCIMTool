import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

async function restoreFromBlob(): Promise<void> {
  const blobAccount = process.env.BLOB_BACKUP_ACCOUNT?.trim();
  if (!blobAccount) {
    return;
  }

  const containerName = process.env.BLOB_BACKUP_CONTAINER?.trim() || 'scimtool-backups';
  const localDbPath = process.env.LOCAL_DB_PATH || '/tmp/local-data/scim.db';

  if (existsSync(localDbPath)) {
    // Local database already present (likely restored via Azure Files); nothing to do.
    return;
  }

  // eslint-disable-next-line no-console
  console.log('Blob restore bootstrap: local database missing, attempting snapshot recovery.');

  mkdirSync(dirname(localDbPath), { recursive: true });

  // Lazy import to avoid crashing if optional packages missing in unsupported configurations.
  const { DefaultAzureCredential } = await import('@azure/identity');
  const { BlobServiceClient } = await import('@azure/storage-blob');

  const endpoint = `https://${blobAccount}.blob.core.windows.net`;
  const credential = new DefaultAzureCredential();
  const blobClient = new BlobServiceClient(endpoint, credential);
  const container = blobClient.getContainerClient(containerName);

  if (!(await container.exists())) {
    // eslint-disable-next-line no-console
    console.log(`Blob restore bootstrap: container '${containerName}' not found; skipping.`);
    return;
  }

  const blobs: string[] = [];
  for await (const blob of container.listBlobsFlat({ prefix: 'scim-' })) {
    if (blob.name) {
      blobs.push(blob.name);
    }
  }

  if (!blobs.length) {
    // eslint-disable-next-line no-console
    console.log('Blob restore bootstrap: no snapshots located.');
    return;
  }

  blobs.sort((a, b) => b.localeCompare(a));
  const latest = blobs[0];
  const blockBlob = container.getBlockBlobClient(latest);
  const response = await blockBlob.download();

  if (!response.readableStreamBody) {
    throw new Error(`Snapshot ${latest} did not provide a readable stream.`);
  }

  const writeStream = createWriteStream(localDbPath);
  await pipeline(response.readableStreamBody, writeStream);

  // eslint-disable-next-line no-console
  console.log(`Blob restore bootstrap: restored snapshot '${latest}' to ${localDbPath}.`);
}

restoreFromBlob().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.error(`Blob restore bootstrap failed: ${message}`);
  process.exitCode = 0; // Do not block container startup; runtime backup service will retry.
});