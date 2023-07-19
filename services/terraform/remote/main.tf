variable "aws_profile" {
  default = "comm"
}

provider "aws" {
  region = "us-east-2"

  shared_config_files      = ["${pathexpand("~/.aws/config")}"]
  shared_credentials_files = ["${pathexpand("~/.aws/credentials")}"]
  profile                  = var.aws_profile

  # automatically add these tags to all resources
  default_tags {
    tags = {
      # Helps to distinguish which resources are managed by Terraform
      managed_by = "terraform"
    }
  }
}

# Shared resources between local dev environment and remote AWS
module "shared" {
  source = "../modules/shared"
}

