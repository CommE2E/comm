terraform {
  backend "s3" {
    region         = "us-east-2"
    key            = "terraform.tfstate"
    bucket         = "commapp-terraform"
    dynamodb_table = "terraform-lock"
    encrypt        = true
  }
}

provider "sops" {}

data "sops_file" "secrets_json" {
  source_file = "secrets.json"
}

locals {
  environment = terraform.workspace
  is_staging  = local.environment == "staging"

  secrets = jsondecode(data.sops_file.secrets_json.raw)

  target_account_id  = lookup(local.secrets.accountIDs, local.environment)
  terraform_role_arn = "arn:aws:iam::${local.target_account_id}:role/Terraform"
}

provider "aws" {
  region = "us-east-2"

  assume_role {
    role_arn    = local.terraform_role_arn
    external_id = "terraform"
  }

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
  source             = "../modules/shared"
  bucket_name_suffix = local.is_staging ? "-staging" : ""
}

