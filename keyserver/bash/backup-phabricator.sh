#!/usr/bin/env bash

# run as: ssh user on root wheel
# run from: wherever

# The path to Phabricator on our server
PHABRICATOR_PATH=/var/www/phacility/phabricator

# The path to the backup directory on our server
BACKUP_PATH=/mnt/backup

# The user that will be owning the backup files
BACKUP_USER=comm

# The maximum amount of space to spend on Phabricator backups
MAX_DISK_USAGE_KB=204800 # 200 MiB

set -e
[[ `whoami` = root ]] || exec sudo su -c "$0"

cd "$PHABRICATOR_PATH"

OUTPUT_FILE="$BACKUP_PATH/phabricator.$(date +'%Y-%m-%d-%R').sql.gz"

function remove_oldest_backup {
  OLDEST_BACKUP=$(find "$BACKUP_PATH" -maxdepth 1 -name 'phabricator.*.sql.gz' -type f -printf '%T+ %p\0' | sort -z | head -z -n 1 | cut -d ' ' -f2- | cut -d '' -f1)
  if [[ ! "$OLDEST_BACKUP" ]]; then
    return 1
  fi
  rm -f "$OLDEST_BACKUP"
  return 0
}

RETRIES=2
while [[ $RETRIES -ge 0 ]]; do
  if ./bin/storage dump --compress --overwrite --output "$OUTPUT_FILE" > /dev/null 2>&1; then
    break
  fi
  rm -f "$OUTPUT_FILE"

  remove_oldest_backup || break
  ((RETRIES--))
done

chown $BACKUP_USER:$(id -gn $BACKUP_USER) "$OUTPUT_FILE" || true

while true; do
  TOTAL_USAGE=$(sudo du -cs "$BACKUP_PATH"/phabricator.*.sql.gz | grep total | awk '{ print $1 }')
  if [[ $TOTAL_USAGE -le $MAX_DISK_USAGE_KB ]]; then
    break
  fi
  BACKUP_COUNT=$(ls -hla "$BACKUP_PATH"/phabricator.*.sql.gz | wc -l)
  if [[ $BACKUP_COUNT -lt 2 ]]; then
    break
  fi
  remove_oldest_backup || break
done
