#!/bin/bash

set -e

AWSLOCAL="aws --endpoint-url=http://localhost:4566"

PAGER=cat

# clear the S3

echo "cleaning the S3 storage..."

$AWSLOCAL s3 rm s3://commapp-blob/testHash > /dev/null

# OBJECTS=`${AWSLOCAL} s3api list-objects --bucket commapp-blob --output text --query "Contents[].{Key: Key}"`

# for OBJECT in $OBJECTS; do
#   awslocal s3 rm s3://commapp-blob/${OBJECT}
# done

# clear the database

# $AWSLOCAL dynamodb query --table-name backup-service-backup --key-conditions '
# {
#   "userID": {
#     "ComparisonOperator":"BEGINS_WITH",
#     "AttributeValueList": [ {"S": "pvv"} ]
#   }
# }
# '

# $AWSLOCAL dynamodb query \
# --table-name backup-service-backup \
# --key-condition-expression "userID BEGINS_WITH :uid" \
# --expression-attribute-values '{
#    ":uid": {"S": "30"}
# }'

# $AWSLOCAL dynamodb query \
# --table-name backup-service-backup \
# --key-condition-expression "begins_with(#userID, :userID)" \
# --key-condition-expression "userID = :userID" \
# --expression-attribute-values  '{":userID":{"S":"3015"}}'

echo "cleaning the database..."

# backup-service-backup
$AWSLOCAL dynamodb delete-item \
  --table-name backup-service-backup \
  --key '{
    "userID": {"S": "0000"},
    "backupID": {"S": "test-backup"}
  }' > /dev/null

# backup-service-log
$AWSLOCAL dynamodb delete-item \
  --table-name backup-service-log \
  --key '{
    "backupID": {"S": "test-backup"},
    "logID": {"S": "test-log"}
  }' > /dev/null

# blob-service-blob
$AWSLOCAL dynamodb delete-item \
  --table-name blob-service-blob \
  --key '{
    "blobHash": {"S": "test-backup"}
  }' > /dev/null

# blob-service-reverse-index
$AWSLOCAL dynamodb delete-item \
  --table-name blob-service-reverse-index \
  --key '{
    "holder": {"S": "test-holder"}
  }' > /dev/null

echo "cleaning done"



# const params = {
#   TableName: 'user_details',
#   KeyConditionExpression: '#user_id = :user_id and begins_with(#user_relation, :user_relation)',
#   ExpressionAttributeNames:{
#     "#user_id": "user_id",
#     "#user_relation": 'user_relation'
#   },
#   ExpressionAttributeValues: {
#     ":user_id": "1234",
#     ":user_relation": "followed-by"
#   }
# }

# $AWSLOCAL dynamodb query --table-name backup-service-backup \
# --key-condition-expression "begins_with(userID, :beginsWith)" \
# --expression-attribute-values  '{ 
# ":tconst":{"S":"userID"},
# ":beginsWith":{"S":"pvv"} 
# }'

# aws dynamodb query  \
# --endpoint-url http://localhost:8000 \
# --table-name title    \
# --key-condition-expression "tconst = :tconst and begins_with(primaryTitle, :beginsWith)" \
# --expression-attribute-values  '{ 
# ":tconst":{"S":"movie"},
# ":beginsWith":{"S":"A"} 
# }'

