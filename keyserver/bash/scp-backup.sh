#!/usr/bin/env bash

set -e

# Use like scp: bash/scp-backup.sh server:backup_src/ backup_dest/
# - Will scp the latest backup from backup_src/
# - Will make sure disk usage doesn't exceed $MAX_DISK_USAGE_KB in backup_dest/

# The maximum amount of space to spend on backups
MAX_DISK_USAGE_KB=5242880 # 5 GiB

SCP_SOURCE=$1
SCP_DEST_FOLDER=$2

SCP_SOURCE_SERVER=$(cut -d: -f1 <<< "$SCP_SOURCE")
SCP_SOURCE_FOLDER=$(cut -d: -f2 <<< "$SCP_SOURCE")
NEWEST_BACKUP=$(ssh "$SCP_SOURCE_SERVER" 'find "'"$SCP_SOURCE_FOLDER"'" -maxdepth 1 -name "comm.*.sql.gz" -type f -printf "%T+ %p\n" | sort | tail -n 1 | cut -d " " -f2')

function remove_oldest_backup {
  OLDEST_BACKUP=$(find "$SCP_DEST_FOLDER" -maxdepth 1 -name 'comm.*.sql.gz' -type f -printf "%T+ %p\n" | sort | head -n 1 | cut -d ' ' -f2- | cut -d '' -f1)
  if [[ ! "$OLDEST_BACKUP" ]]; then
    return 1
  fi
  rm -f "$OLDEST_BACKUP"
  return 0
}

RETRIES=2
while [[ $RETRIES -ge 0 ]]; do
  if scp "$SCP_SOURCE_SERVER":"$NEWEST_BACKUP" "$SCP_DEST_FOLDER"; then
    break
  fi
  rm -f "$SCP_DEST_FOLDER"/"$NEWEST_BACKUP"

  remove_oldest_backup || break
  ((RETRIES--))
done

while true; do
  TOTAL_USAGE=$(sudo du -cs "$SCP_DEST_FOLDER"/comm.*.sql.gz | awk '/total/ { print $1 }')
  if [[ $TOTAL_USAGE -le $MAX_DISK_USAGE_KB ]]; then
    break
  fi
  BACKUP_COUNT=$(find "$SCP_DEST_FOLDER" -maxdepth 1 -name "comm.*.sql.gz" -type f | wc -l)
  if [[ $BACKUP_COUNT -lt 2 ]]; then
    break
  fi
  remove_oldest_backup || break
done
