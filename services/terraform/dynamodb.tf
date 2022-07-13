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
  hash_key       = "SessionId"
  write_capacity = 10
  read_capacity  = 10

  attribute {
    name = "SessionId"
    type = "S"
  }

  ttl {
    attribute_name = "Expire"
    enabled        = true
  }
}

resource "aws_dynamodb_table" "tunnelbroker-verification-messages" {
  name           = "tunnelbroker-verification-messages"
  hash_key       = "DeviceId"
  write_capacity = 10
  read_capacity  = 10

  attribute {
    name = "DeviceId"
    type = "S"
  }

  ttl {
    attribute_name = "Expire"
    enabled        = true
  }
}

resource "aws_dynamodb_table" "tunnelbroker-public-keys" {
  name           = "tunnelbroker-public-keys"
  hash_key       = "DeviceId"
  write_capacity = 10
  read_capacity  = 10

  attribute {
    name = "DeviceId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "tunnelbroker-messages" {
  name           = "tunnelbroker-messages"
  hash_key       = "MessageID"
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

  global_secondary_index {
    name            = "ToDeviceID-index"
    hash_key        = "ToDeviceID"
    write_capacity  = 10
    read_capacity   = 10
    projection_type = "ALL"
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
}

resource "aws_dynamodb_table" "identity-tokens" {
  name           = "identity-tokens"
  hash_key       = "userID"
  range_key      = "deviceID"
  write_capacity = 10
  read_capacity  = 10

  attribute {
    name = "userID"
    type = "S"
  }

  attribute {
    name = "deviceID"
    type = "S"
  }
}
