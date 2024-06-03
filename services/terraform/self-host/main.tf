terraform {
  backend "s3" {
    region  = "us-east-2"
    key     = "terraform.tfstate"
    bucket  = "self-host-keyserver-terraform"
    encrypt = true
  }
}

provider "sops" {}

data "sops_file" "keyserver_secrets_json" {
  source_file = "keyserver_secrets.json"
}

locals {
  secrets = jsondecode(data.sops_file.keyserver_secrets_json.raw)
}

provider "aws" {
  region = "us-east-2"

  default_tags {
    tags = {
      managed_by = "terraform"
    }
  }
}
