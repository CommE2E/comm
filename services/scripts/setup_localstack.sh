#!/bin/bash

set -e

DYNAMO_DB_TABLES_FOLDER="./aws_backup/dynamo_db_tables"

# S3
echo "setting up S3..."
BUCKETS=`cat ./aws_backup/s3.dump || echo "error: there was a problem with the aws backup"`
for BUCKET in $BUCKETS; do
  echo " creating bucket $BUCKET"
  aws --endpoint-url=http://localhost:4566 s3 mb s3://$BUCKET > /dev/null
done

# dynamoDB
echo "setting up database..."
DYNAMO_DB_TABLES=`ls $DYNAMO_DB_TABLES_FOLDER`
for TABLE in $DYNAMO_DB_TABLES; do
  echo " creating table $TABLE"
  aws --endpoint-url=http://localhost:4566 dynamodb create-table --cli-input-json file://$DYNAMO_DB_TABLES_FOLDER/$TABLE > /dev/null
done


echo "setting up - DONE"
