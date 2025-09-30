#!/bin/sh
set -e

# Define paths
AZURE_FILES_BACKUP="/app/data/scim.db"
LOCAL_DB="/app/local-data/scim.db"
LOCAL_DIR="/app/local-data"

# Create local data directory if it doesn't exist
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

echo ""
echo "Running database migrations on local storage..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo "✓ Migrations completed successfully"
else
    echo "✗ Migrations failed"
    exit 1
fi

echo ""
echo "Starting application..."
echo "  └─ Primary DB: $LOCAL_DB (ephemeral, fast)"
echo "  └─ Backup to:  $AZURE_FILES_BACKUP (persistent)"
echo "  └─ Backup interval: 5 minutes"
echo ""

exec node dist/main.js
