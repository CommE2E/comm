#!/usr/bin/env bash

set -euo pipefail

# Target user configuration
target_environment="production"
user_id="256"
keyserver_device_id="TKna1hvHBCty15Y0V3QjluiTt+iIWr+Qtd4CGwaPErg"

script_path=$(dirname "${BASH_SOURCE[0]}")

# Ensure we're not using localstack credentials
if [[ -n "${AWS_ACCESS_KEY_ID:-}" && "$AWS_ACCESS_KEY_ID" = "test" ]]; then
  echo "You are using localstack credentials! Unset AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to use AWS credentials."
  exit 1
fi

# Ensure we're on Terraform AWS account
current_account_id=$(aws sts get-caller-identity | jq -r '.Account')
# Terraform account begins with 319
if [[ "$current_account_id" != 319* ]]; then
  echo "You're using the wrong account! Check your AWS profile."
  echo "Your AWS_PROFILE is $AWS_PROFILE"
  exit 1
fi

# Get target account ID from SOPS-encrypted secrets.json
sops_output=$(sops -d "$script_path/../services/terraform/remote/secrets.json")
target_account_id=$(echo "$sops_output" | jq -r ".accountIDs.$target_environment")

# Using Terraform account, assume "Terraform" role on target account,
# to perform actions on its behalf
role_arn="arn:aws:iam::$target_account_id:role/Terraform"
role_session_name="CLI_KeyserverOwnerResetScript"
role_info=$(
  aws sts assume-role \
    --role-arn "$role_arn" \
    --role-session-name "$role_session_name" \
    --external-id terraform
)

# Extract credentials from the output
access_key=$(echo "$role_info" | jq -r '.Credentials.AccessKeyId')
secret_key=$(echo "$role_info" | jq -r '.Credentials.SecretAccessKey')
session_token=$(echo "$role_info" | jq -r '.Credentials.SessionToken')

# Export AWS credentials to the script,
# to be able to run commands on target environment
export AWS_ACCESS_KEY_ID="$access_key"
export AWS_SECRET_ACCESS_KEY="$secret_key"
export AWS_SESSION_TOKEN="$session_token"
export AWS_REGION="us-east-2"

echo "Will attempt to reset state for user $user_id. Querying DDB..."
# Query identity-tokens table for user, select only PK, filter-out keyserver
tokens_primary_keys=$(
  aws dynamodb query \
    --table-name identity-tokens \
    --key-condition-expression "userID = :user_id" \
    --projection-expression "userID, signingPublicKey" \
    --expression-attribute-values '{":user_id":{"S":"'"$user_id"'"}}' |
    jq '.Items[] | select(.signingPublicKey.S != "'"$keyserver_device_id"'")' | jq -s
)
# Query identity-devices table by prefix 'device-' for given user,
# select only PK, filter-out keyserver
device_primary_keys=$(
  aws dynamodb query --table-name identity-devices \
    --key-condition-expression "userID = :user_id AND begins_with(itemID, :prefix)" \
    --projection-expression "userID, itemID" \
    --expression-attribute-values '{":user_id":{"S":"'"$user_id"'"},":prefix":{"S":"device-"}}' |
    jq '.Items[] | select(.itemID.S != "device-'"$keyserver_device_id"'")' | jq -s
)
# Query backup-service-backup table for given user, select only PK
backup_primary_keys=$(
  aws dynamodb query \
    --table-name backup-service-backup \
    --key-condition-expression "userID = :user_id" \
    --projection-expression "userID, backupID" \
    --expression-attribute-values '{":user_id":{"S":"'"$user_id"'"}}' |
    jq '.Items[]' | jq -s
)

echo "Found $(echo "$tokens_primary_keys" | jq length) CSATs to remove"
echo "Found $(echo "$device_primary_keys" | jq length) Device keys to remove"
echo "Found $(echo "$backup_primary_keys" | jq length) Backups to remove"

csat_delete_requests=$(echo "$tokens_primary_keys" | jq -s '{ "identity-tokens": map({DeleteRequest: { Key: .[] } }) }')
device_delete_requests=$(echo "$device_primary_keys" | jq -s '{ "identity-devices": map({DeleteRequest: { Key: .[] } }) }')
backup_delete_requests=$(echo "$backup_primary_keys" | jq -s '{ "backup-service-backup": map({DeleteRequest: { Key: .[] } }) }')
# Merge objects into one big batch request
all_delete_requests=$(echo "$csat_delete_requests $device_delete_requests $backup_delete_requests" | jq -s add)

# Query identity-devices by prefix 'devicelist-' for given user,
# fetch only latest (sort descending, limit 1), select only PK
last_devicelist_primary_key=$(
  aws dynamodb query \
    --table-name identity-devices \
    --key-condition-expression "userID = :user_id AND begins_with(itemID, :prefix)" \
    --projection-expression "userID, itemID" \
    --expression-attribute-values '{":user_id":{"S":"'"$user_id"'"},":prefix":{"S":"devicelist-"}}' \
    --limit 1 \
    --no-scan-index-forward |
    jq '.Items[]'
)

# Prompt for confirmation
read -p "Do you want to continue? [y/N] " -n 1 -r
echo # move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Update device list to unsigned singleton of [keyserver_device_id]
  echo "Attempting to update device list with timestamp: $(echo "$last_devicelist_primary_key" | jq -r '.itemID.S')"
  aws dynamodb update-item \
    --table-name identity-devices \
    --key "$last_devicelist_primary_key" \
    --update-expression 'SET deviceIDs=:list REMOVE curPrimarySignature, lastPrimarySignature' \
    --expression-attribute-values '{":list":{"L":[{"S":"'"$keyserver_device_id"'"}]}}'

  # Remove CSATs, backups and devices keys
  echo "Attempting to remove non-keyserver CSATs, Backups and devices data"
  aws dynamodb batch-write-item \
    --request-items "$all_delete_requests" \
    --output text

  echo "All done"
fi

echo "Operation canceled by user"
exit 1
