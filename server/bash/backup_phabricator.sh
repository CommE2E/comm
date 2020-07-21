#!/bin/bash

# run as: ssh user on root wheel
# run from: wherever

# The path to Phabricator on our server
PHABRICATOR_PATH=/var/www/phacility/phabricator

# The path to the backup directory on our server
BACKUP_PATH=/mnt/backup

# The user that will be owning the backup files
BACKUP_USER=squadcal

set -e
[[ `whoami` = root ]] || exec sudo su -c "$0 $1"

cd "$PHABRICATOR_PATH"

OUTPUT_FILE="$BACKUP_PATH/phabricator.$(date +'%Y-%m-%d-%R').sql.gz"

RETRIES=2
while [[ $RETRIES -ge 0 ]]; do
  if ./bin/storage dump --compress --overwrite --output "$OUTPUT_FILE"; then
    break
  fi
  rm -f "$OUTPUT_FILE"

  # Delete most recent backup file
  rm -f $(find "$BACKUP_PATH" -maxdepth 1 -name 'phabricator.*.sql.gz' -type f -printf '%T+ %p\0' | sort -z | head -z -n 1 | cut -d ' ' -f2- | cut -d '' -f1)

  ((RETRIES--))
done

chown "$BACKUP_USER:$BACKUP_USER" "$OUTPUT_FILE" || true
