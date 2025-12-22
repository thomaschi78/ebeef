#!/bin/bash
#
# Database Backup Script for EBEEF
# Usage: ./backup.sh [backup_dir]
#
# Environment variables:
#   DATABASE_URL - PostgreSQL connection string
#   BACKUP_RETENTION_DAYS - Number of days to keep backups (default: 7)
#   AWS_S3_BUCKET - Optional S3 bucket for remote backups
#

set -e

# Configuration
BACKUP_DIR="${1:-/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="ebeef_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

# Parse DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    exit 1
fi

# Extract components from DATABASE_URL
# Format: postgresql://user:password@host:port/database
PGHOST=$(echo $DATABASE_URL | sed -e 's/.*@//' -e 's/:.*//')
PGPORT=$(echo $DATABASE_URL | sed -e 's/.*://' -e 's/\/.*//')
PGUSER=$(echo $DATABASE_URL | sed -e 's/postgresql:\/\///' -e 's/:.*@.*//')
PGPASSWORD=$(echo $DATABASE_URL | sed -e 's/.*:\/\/[^:]*://' -e 's/@.*//')
PGDATABASE=$(echo $DATABASE_URL | sed -e 's/.*\///')

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting backup at $(date)"
echo "Database: $PGDATABASE"
echo "Host: $PGHOST:$PGPORT"

# Perform backup
export PGPASSWORD
pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
    --format=plain \
    --no-owner \
    --no-acl \
    | gzip > "$BACKUP_DIR/$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo "Backup completed successfully: $BACKUP_FILE ($BACKUP_SIZE)"
else
    echo "Error: Backup failed"
    exit 1
fi

# Upload to S3 if configured
if [ -n "$AWS_S3_BUCKET" ]; then
    echo "Uploading to S3: $AWS_S3_BUCKET"
    aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "s3://$AWS_S3_BUCKET/backups/$BACKUP_FILE"
    if [ $? -eq 0 ]; then
        echo "S3 upload completed"
    else
        echo "Warning: S3 upload failed"
    fi
fi

# Clean up old backups
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "ebeef_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
REMAINING=$(ls -1 "$BACKUP_DIR"/ebeef_backup_*.sql.gz 2>/dev/null | wc -l)
echo "Remaining backups: $REMAINING"

echo "Backup process completed at $(date)"
