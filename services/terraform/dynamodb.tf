resource "aws_dynamodb_table" "backup-service-backup" {
  name           = "backup-service-backup"
  hash_key       = "userID"
  range_key      = "backupID"
  write_capacity = 10
  read_capacity  = 10

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
    write_capacity     = 10
    read_capacity      = 10
    projection_type    = "INCLUDE"
    non_key_attributes = ["recoveryData"]
  }
}

resource "aws_dynamodb_table" "backup-service-log" {
  name           = "backup-service-log"
  hash_key       = "backupID"
  range_key      = "logID"
  write_capacity = 10
  read_capacity  = 10

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
  name           = "blob-service-blob"
  hash_key       = "blobHash"
  write_capacity = 10
  read_capacity  = 10

  attribute {
    name = "blobHash"
    type = "S"
  }
}

resource "aws_dynamodb_table" "blob-service-reverse-index" {
  name           = "blob-service-reverse-index"
  hash_key       = "holder"
  write_capacity = 10
  read_capacity  = 10

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
    write_capacity  = 10
    read_capacity   = 10
    projection_type = "ALL"
  }
}

resource "aws_dynamodb_table" "tunnelbroker-device-sessions" {
  name           = "tunnelbroker-device-sessions"
  hash_key       = "SessionID"
  write_capacity = 10
  read_capacity  = 10

  attribute {
    name = "SessionID"
    type = "S"
  }

  ttl {
    attribute_name = "Expire"
    enabled        = true
  }
}

resource "aws_dynamodb_table" "tunnelbroker-verification-messages" {
  name           = "tunnelbroker-verification-messages"
  hash_key       = "DeviceID"
  write_capacity = 10
  read_capacity  = 10

  attribute {
    name = "DeviceID"
    type = "S"
  }

  ttl {
    attribute_name = "Expire"
    enabled        = true
  }
}

resource "aws_dynamodb_table" "tunnelbroker-public-keys" {
  name           = "tunnelbroker-public-keys"
  hash_key       = "DeviceID"
  write_capacity = 10
  read_capacity  = 10

  attribute {
    name = "DeviceID"
    type = "S"
  }
}

resource "aws_dynamodb_table" "tunnelbroker-messages" {
  name           = "tunnelbroker-messages"
  hash_key       = "ToDeviceID"
  range_key      = "MessageID"
  write_capacity = 10
  read_capacity  = 10

  attribute {
    name = "MessageID"
    type = "S"
  }

  attribute {
    name = "ToDeviceID"
    type = "S"
  }

  ttl {
    attribute_name = "Expire"
    enabled        = true
  }
}

resource "aws_dynamodb_table" "identity-users" {
  name           = "identity-users"
  hash_key       = "userID"
  write_capacity = 10
  read_capacity  = 10

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
    write_capacity  = 10
    read_capacity   = 10
    projection_type = "KEYS_ONLY"
  }

  global_secondary_index {
    name            = "walletAddress-index"
    hash_key        = "walletAddress"
    write_capacity  = 10
    read_capacity   = 10
    projection_type = "KEYS_ONLY"
  }
}

# Identity users with opaque_ke 2.0 credentials
resource "aws_dynamodb_table" "identity-users-opaque2" {
  name           = "identity-users-opaque2"
  hash_key       = "userID"
  write_capacity = 10
  read_capacity  = 10

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
    write_capacity  = 10
    read_capacity   = 10
    projection_type = "KEYS_ONLY"
  }

  global_secondary_index {
    name            = "walletAddress-index"
    hash_key        = "walletAddress"
    write_capacity  = 10
    read_capacity   = 10
    projection_type = "KEYS_ONLY"
  }
}

resource "aws_dynamodb_table" "identity-tokens" {
  name           = "identity-tokens"
  hash_key       = "userID"
  range_key      = "signingPublicKey"
  write_capacity = 10
  read_capacity  = 10

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
  name           = "identity-nonces"
  hash_key       = "nonce"
  write_capacity = 10
  read_capacity  = 10

  attribute {
    name = "nonce"
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
