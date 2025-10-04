#!/bin/sh
set -e

#############################################
# Unified ephemeral DB location strategy    #
# Primary (writable) DB: /tmp/local-data    #
# Persistent backup:     /app/data/scim.db  #
#############################################

AZURE_FILES_BACKUP="/app/data/scim.db"
LOCAL_DIR="/tmp/local-data"
LOCAL_DB="$LOCAL_DIR/scim.db"
BLOB_BACKUP_ACCOUNT="${BLOB_BACKUP_ACCOUNT:-}"

export LOCAL_DB_PATH="$LOCAL_DB"

mkdir -p "$LOCAL_DIR"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  SCIMTool - Hybrid Storage Initialization                 ║"
echo "╚════════════════════════════════════════════════════════════╝"

# Check if backup exists on Azure Files and restore it
if [ -f "$AZURE_FILES_BACKUP" ]; then
    BACKUP_SIZE=$(stat -f%z "$AZURE_FILES_BACKUP" 2>/dev/null || stat -c%s "$AZURE_FILES_BACKUP" 2>/dev/null || echo "unknown")
    BACKUP_DATE=$(stat -f%Sm "$AZURE_FILES_BACKUP" 2>/dev/null || stat -c%y "$AZURE_FILES_BACKUP" 2>/dev/null || echo "unknown")

    echo "✓ Found backup on Azure Files"
    echo "  └─ Size: $BACKUP_SIZE bytes"
    echo "  └─ Date: $BACKUP_DATE"
    echo "→ Restoring database from backup to local storage..."

    cp "$AZURE_FILES_BACKUP" "$LOCAL_DB"

    if [ $? -eq 0 ]; then
        echo "✓ Database restored successfully"
    else
        echo "✗ Failed to restore backup, starting with fresh database"
        rm -f "$LOCAL_DB"
    fi
else
    echo "⚠ No backup found on Azure Files"
    echo "→ Starting with fresh database on local storage"
fi

if [ ! -f "$LOCAL_DB" ] && [ -n "$BLOB_BACKUP_ACCOUNT" ]; then
    echo ""
    echo "Attempting blob snapshot restore before migrations..."
    if node dist/bootstrap/blob-restore.js; then
        if [ -f "$LOCAL_DB" ]; then
            echo "✓ Blob snapshot restore completed"
        else
            echo "⚠ Blob restore script finished but database file still missing"
        fi
    else
        echo "⚠ Blob restore script reported an error; continuing without snapshot"
    fi
fi

echo ""
echo "Configuring primary database environment..."

# Always point Prisma (runtime app) at the unified ephemeral DB path.
export DATABASE_URL="file:/tmp/local-data/scim.db"
echo "Using DATABASE_URL=$DATABASE_URL"

echo "Running database migrations on local storage..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo "✓ Migrations completed successfully"
else
    echo "✗ Migrations failed"
    exit 1
fi

# If we started without a backup but now have a local DB, create an initial backup copy.
if [ ! -f "$AZURE_FILES_BACKUP" ] && [ -f "$LOCAL_DB" ]; then
    echo "Creating initial Azure Files backup..."
    if cp "$LOCAL_DB" "$AZURE_FILES_BACKUP" 2>/dev/null; then
        echo "✓ Initial backup created"
    else
        echo "⚠ Failed to create initial backup (will retry on scheduled backup)"
    fi
fi

echo ""
echo "Starting application..."
echo "  └─ Primary DB: $LOCAL_DB (ephemeral in /tmp)"
echo "  └─ Backup to:  $AZURE_FILES_BACKUP (persistent Azure Files)"
echo "  └─ Backup interval: 5 minutes"
echo ""

exec node dist/main.js
