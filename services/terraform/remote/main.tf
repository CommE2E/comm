provider "aws" {
  region = "us-east-2"

  shared_config_files      = ["${pathexpand("~/.aws/config")}"]
  shared_credentials_files = ["${pathexpand("~/.aws/credentials")}"]
}

# Shared resources between local dev environment and remote AWS
module "shared" {
  source = "../modules/shared"
}

