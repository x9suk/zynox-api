#!/usr/bin/env bash
set -euo pipefail

# MongoDB backup script
# Usage: ./scripts/backup-mongo.sh [output-dir]
# Default output: /backups/mongo/YYYY-MM-DD/

BACKUP_DIR="${1:-/backups/mongo/$(date +%Y-%m-%d)}"
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/zynox_tracking}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

echo "[$(date)] Starting MongoDB backup..."
echo "  URI:    $MONGODB_URI"
echo "  Output: $BACKUP_DIR"
echo "  Retention: $RETENTION_DAYS days"

mkdir -p "$BACKUP_DIR"

mongodump \
  --uri="$MONGODB_URI" \
  --out="$BACKUP_DIR" \
  --gzip \
  --numParallelCollections=4

echo "[$(date)] Backup written to $BACKUP_DIR"

# Compress
tar -czf "${BACKUP_DIR}.tar.gz" -C "$(dirname $BACKUP_DIR)" "$(basename $BACKUP_DIR)"
rm -rf "$BACKUP_DIR"

echo "[$(date)] Compressed to ${BACKUP_DIR}.tar.gz"

# Remove backups older than retention
find /backups/mongo -name "*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
echo "[$(date)] Pruned backups older than $RETENTION_DAYS days"

echo "[$(date)] Backup complete"
