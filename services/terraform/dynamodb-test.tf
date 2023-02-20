resource "aws_dynamodb_table" "backup-service-backup-test" {
  name           = "backup-service-backup-test"
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

resource "aws_dynamodb_table" "backup-service-log-test" {
  name           = "backup-service-log-test"
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

resource "aws_dynamodb_table" "blob-service-blob-test" {
  name           = "blob-service-blob-test"
  hash_key       = "blobHash"
  write_capacity = 10
  read_capacity  = 10

  attribute {
    name = "blobHash"
    type = "S"
  }
}

resource "aws_dynamodb_table" "blob-service-reverse-index-test" {
  name           = "blob-service-reverse-index-test"
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

resource "aws_dynamodb_table" "tunnelbroker-device-sessions-test" {
  name           = "tunnelbroker-device-sessions-test"
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

resource "aws_dynamodb_table" "tunnelbroker-verification-messages-test" {
  name           = "tunnelbroker-verification-messages-test"
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

resource "aws_dynamodb_table" "tunnelbroker-public-keys-test" {
  name           = "tunnelbroker-public-keys-test"
  hash_key       = "DeviceID"
  write_capacity = 10
  read_capacity  = 10

  attribute {
    name = "DeviceID"
    type = "S"
  }
}

resource "aws_dynamodb_table" "tunnelbroker-messages-test" {
  name           = "tunnelbroker-messages-test"
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

resource "aws_dynamodb_table" "feature-flags-test" {
  name         = "feature-flags-test"
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
