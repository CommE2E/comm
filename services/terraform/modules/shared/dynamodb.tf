resource "aws_dynamodb_table" "backup-service-backup" {
  name         = "backup-service-backup"
  hash_key     = "userID"
  range_key    = "backupID"
  billing_mode = "PAY_PER_REQUEST"

  attribute {
    name = "userID"
    type = "S"
  }

  attribute {
    name = "backupID"
    type = "S"
  }

  attribute {
    name = "created"
    type = "S"
  }

  global_secondary_index {
    name               = "userID-created-index"
    hash_key           = "userID"
    range_key          = "created"
    projection_type    = "INCLUDE"
    non_key_attributes = ["userKeys"]
  }
}

resource "aws_dynamodb_table" "backup-service-log" {
  name         = "backup-service-log"
  hash_key     = "backupID"
  range_key    = "logID"
  billing_mode = "PAY_PER_REQUEST"

  attribute {
    name = "backupID"
    type = "S"
  }

  attribute {
    name = "logID"
    type = "S"
  }
}

resource "aws_dynamodb_table" "blob-service-blob" {
  name         = "blob-service-blob"
  hash_key     = "blobHash"
  billing_mode = "PAY_PER_REQUEST"

  attribute {
    name = "blobHash"
    type = "S"
  }
}

resource "aws_dynamodb_table" "blob-service-reverse-index" {
  name         = "blob-service-reverse-index"
  hash_key     = "holder"
  billing_mode = "PAY_PER_REQUEST"

  attribute {
    name = "holder"
    type = "S"
  }

  attribute {
    name = "blobHash"
    type = "S"
  }

  global_secondary_index {
    name            = "blobHash-index"
    hash_key        = "blobHash"
    projection_type = "ALL"
  }
}

resource "aws_dynamodb_table" "blob-service-blobs" {
  name         = "blob-service-blobs"
  hash_key     = "blob_hash"
  range_key    = "holder"
  billing_mode = "PAY_PER_REQUEST"

  attribute {
    name = "blob_hash"
    type = "S"
  }

  attribute {
    name = "holder"
    type = "S"
  }

  attribute {
    name = "last_modified"
    type = "N"
  }

  attribute {
    name = "unchecked"
    type = "S"
  }

  global_secondary_index {
    name            = "unchecked-index"
    hash_key        = "unchecked"
    range_key       = "last_modified"
    projection_type = "KEYS_ONLY"
  }
}

resource "aws_dynamodb_table" "tunnelbroker-undelivered-messages" {
  # This table doesnt exist in prod
  count = var.is_dev ? 1 : 0

  name         = "tunnelbroker-undelivered-messages"
  hash_key     = "deviceID"
  range_key    = "createdAt"
  billing_mode = "PAY_PER_REQUEST"

  attribute {
    name = "deviceID"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "N"
  }
}

resource "aws_dynamodb_table" "identity-users" {
  name         = "identity-users"
  hash_key     = "userID"
  billing_mode = "PAY_PER_REQUEST"

  attribute {
    name = "userID"
    type = "S"
  }

  attribute {
    name = "username"
    type = "S"
  }

  # walletAddress not defined in prod
  dynamic "attribute" {
    # Create a dummy list to iterate over if is_dev is true
    for_each = var.is_dev ? [1] : []
    content {
      name = "walletAddress"
      type = "S"
    }
  }

  global_secondary_index {
    name            = "username-index"
    hash_key        = "username"
    projection_type = "KEYS_ONLY"
  }

  # walletAddress not defined in prod
  dynamic "global_secondary_index" {
    # Create a dummy list to iterate over if is_dev is true
    for_each = var.is_dev ? [1] : []
    content {
      name            = "walletAddress-index"
      hash_key        = "walletAddress"
      projection_type = "KEYS_ONLY"
    }
  }
}

# Identity users with opaque_ke 2.0 credentials
resource "aws_dynamodb_table" "identity-users-opaque2" {
  # This table doesnt exist in prod
  count = var.is_dev ? 1 : 0

  name         = "identity-users-opaque2"
  hash_key     = "userID"
  billing_mode = "PAY_PER_REQUEST"

  attribute {
    name = "userID"
    type = "S"
  }

  attribute {
    name = "username"
    type = "S"
  }

  attribute {
    name = "walletAddress"
    type = "S"
  }

  global_secondary_index {
    name            = "username-index"
    hash_key        = "username"
    projection_type = "KEYS_ONLY"
  }

  global_secondary_index {
    name            = "walletAddress-index"
    hash_key        = "walletAddress"
    projection_type = "KEYS_ONLY"
  }
}

resource "aws_dynamodb_table" "identity-tokens" {
  name         = "identity-tokens"
  hash_key     = "userID"
  range_key    = "signingPublicKey"
  billing_mode = "PAY_PER_REQUEST"

  attribute {
    name = "userID"
    type = "S"
  }

  attribute {
    name = "signingPublicKey"
    type = "S"
  }
}

resource "aws_dynamodb_table" "identity-nonces" {
  name         = "identity-nonces"
  hash_key     = "nonce"
  billing_mode = "PAY_PER_REQUEST"

  attribute {
    name = "nonce"
    type = "S"
  }

  ttl {
    attribute_name = "expirationTimeUnix"
    enabled        = true
  }
}

resource "aws_dynamodb_table" "identity-reserved-usernames" {
  name         = "identity-reserved-usernames"
  hash_key     = "username"
  billing_mode = "PAY_PER_REQUEST"

  attribute {
    name = "username"
    type = "S"
  }
}

resource "aws_dynamodb_table" "identity-one-time-keys" {
  name           = "identity-one-time-keys"
  hash_key       = "deviceID"
  range_key      = "oneTimeKey"
  billing_mode   = "PAY_PER_REQUEST"

  attribute {
    name = "deviceID"
    type = "S"
  }

  attribute {
    name = "oneTimeKey"
    type = "S"
  }
}

resource "aws_dynamodb_table" "feature-flags" {
  name         = "feature-flags"
  hash_key     = "platform"
  range_key    = "feature"
  billing_mode = "PAY_PER_REQUEST"

  attribute {
    name = "platform"
    type = "S"
  }

  attribute {
    name = "feature"
    type = "S"
  }
}
