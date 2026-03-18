#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MIGRATION_FILE="$1"

if [ -z "$MIGRATION_FILE" ]; then
  echo "Usage: ./migrations/run.sh <migration_file.sql>"
  echo "Example: ./migrations/run.sh 001_add_box_groups.sql"
  exit 1
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-root}"
DB_NAME="${DB_NAME:-wms}"

echo "Running migration: $MIGRATION_FILE"
echo "Target: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$SCRIPT_DIR/$MIGRATION_FILE"

echo "Migration completed successfully."
