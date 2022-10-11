locals {
  use_localstack = (terraform.workspace == "default")

  aws_settings = (
    local.use_localstack ?
    {
      region     = "us-east-2"
      access_key = "fake"
      secret_key = "fake"

      skip_credentials_validation = true
      skip_metadata_api_check     = true
      skip_requesting_account_id  = true
      s3_use_path_style           = true

      override_endpoint = "http://localhost:4566"
    } :
    {
      region     = null
      access_key = null
      secret_key = null

      skip_credentials_validation = null
      skip_metadata_api_check     = null
      skip_requesting_account_id  = null
      s3_use_path_style           = null

      override_endpoint = null
    }
  )
}

provider "aws" {
  region     = local.aws_settings.region
  access_key = local.aws_settings.access_key
  secret_key = local.aws_settings.secret_key

  skip_credentials_validation = local.aws_settings.skip_credentials_validation
  skip_metadata_api_check     = local.aws_settings.skip_metadata_api_check
  skip_requesting_account_id  = local.aws_settings.skip_requesting_account_id
  s3_use_path_style           = local.aws_settings.s3_use_path_style


  dynamic "endpoints" {
    for_each = local.aws_settings.override_endpoint[*]
    content {
      dynamodb = endpoints.value
      s3       = endpoints.value
    }
  }
}
