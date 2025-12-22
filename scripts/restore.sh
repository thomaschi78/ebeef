#!/bin/bash
#
# Database Restore Script for EBEEF
# Usage: ./restore.sh <backup_file>
#
# Environment variables:
#   DATABASE_URL - PostgreSQL connection string
#

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo "Example: $0 /backups/ebeef_backup_20231215_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Parse DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    exit 1
fi

# Extract components from DATABASE_URL
PGHOST=$(echo $DATABASE_URL | sed -e 's/.*@//' -e 's/:.*//')
PGPORT=$(echo $DATABASE_URL | sed -e 's/.*://' -e 's/\/.*//')
PGUSER=$(echo $DATABASE_URL | sed -e 's/postgresql:\/\///' -e 's/:.*@.*//')
PGPASSWORD=$(echo $DATABASE_URL | sed -e 's/.*:\/\/[^:]*://' -e 's/@.*//')
PGDATABASE=$(echo $DATABASE_URL | sed -e 's/.*\///')

echo "WARNING: This will overwrite all data in database: $PGDATABASE"
echo "Host: $PGHOST:$PGPORT"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

echo "Starting restore at $(date)"
echo "Backup file: $BACKUP_FILE"

# Restore the backup
export PGPASSWORD
gunzip -c "$BACKUP_FILE" | psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE"

if [ $? -eq 0 ]; then
    echo "Restore completed successfully at $(date)"
else
    echo "Error: Restore failed"
    exit 1
fi
