variable "HOST" {
  type = string
}

provider "aws" {
  region                      = "us-east-2"
  access_key                  = "fake"
  secret_key                  = "fake"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  s3_use_path_style           = true

  endpoints {
    dynamodb = var.HOST
    s3 = var.HOST
  }
}
