#!/bin/sh
set -e

# Define paths
AZURE_FILES_BACKUP="/app/data/scim.db"
LOCAL_DB="/app/local-data/scim.db"
LOCAL_DIR="/app/local-data"

# Create local data directory with fallback if creation fails (avoid hard crash due to set -e)
if ! mkdir -p "$LOCAL_DIR" 2>/dev/null; then
    echo "⚠ Unable to create $LOCAL_DIR (permission denied). Falling back to /tmp/local-data"
    LOCAL_DIR="/tmp/local-data"
    LOCAL_DB="$LOCAL_DIR/scim.db"
    if mkdir -p "$LOCAL_DIR" 2>/dev/null; then
        echo "✓ Created fallback directory: $LOCAL_DIR"
    else
        echo "✗ Failed to create fallback directory. Exiting."
        exit 1
    fi
fi

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
echo "Configuring primary database environment..."

# Always point Prisma (runtime app) at the fast local ephemeral DB.
if [ "$LOCAL_DIR" = "/tmp/local-data" ]; then
    # Use absolute path when falling back to /tmp to avoid relative path confusion
    export DATABASE_URL="file:/tmp/local-data/scim.db"
else
    export DATABASE_URL="file:./local-data/scim.db"
fi
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
echo "  └─ Primary DB: $LOCAL_DB (ephemeral, fast)"
echo "  └─ Backup to:  $AZURE_FILES_BACKUP (persistent)"
echo "  └─ Backup interval: 5 minutes"
echo ""

exec node dist/main.js
