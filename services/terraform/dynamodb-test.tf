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
    name               = "blobHash-index"
    hash_key           = "blobHash"
    write_capacity     = 10
    read_capacity      = 10
    projection_type    = "ALL"
  }
}
