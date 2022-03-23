#!/bin/bash

set -e

AWS_BACKUP_FOLDER="./aws_backup"
S3_DUMP_FILE="${AWS_BACKUP_FOLDER}/s3.dump"
DYNAMO_DB_TABLES_FOLDER="$AWS_BACKUP_FOLDER/dynamo_db_tables"

rm -rf $AWS_BACKUP_FOLDER
mkdir $AWS_BACKUP_FOLDER
mkdir $DYNAMO_DB_TABLES_FOLDER

# S3
touch $S3_DUMP_FILE
echo "backing up S3..."
BUCKETS=`aws s3 ls | cut -d ' ' -f 3`

for BUCKET in $BUCKETS; do
  echo $BUCKET >> $S3_DUMP_FILE
done

echo "backing up S3 - DONE"

# dynamoDB
echo "backing up database..."

AWS_PAGER=""
TABLES=`aws dynamodb list-tables | jq '.TableNames[]' | tr -d '"'`

TMP=`mktemp`
for TABLE in $TABLES; do
  echo " backing up table $TABLE..."
  aws dynamodb describe-table --table-name $TABLE > $TMP
  # todo treat this as generated in phabricator
  jq < $TMP '.Table | {TableName, KeySchema, AttributeDefinitions} + (try {LocalSecondaryIndexes: [ .LocalSecondaryIndexes[] | {IndexName, KeySchema, Projection} ]} // {}) + (try {GlobalSecondaryIndexes: [ .GlobalSecondaryIndexes[] | {IndexName, KeySchema, Projection} ]} // {}) + {BillingMode: "PAY_PER_REQUEST"}' > $DYNAMO_DB_TABLES_FOLDER/$TABLE
  echo " backing up table $TABLE - DONE"
done

rm $TMP

echo "backing up database - DONE"
