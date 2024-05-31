terraform {
  backend "s3" {
    region  = "us-east-2"
    key     = "terraform.tfstate"
    bucket  = "self-host-keyserver-terraform"
    encrypt = true
  }
}

provider "aws" {
  region = "us-east-2"

  default_tags {
    tags = {
      managed_by = "terraform"
    }
  }
}
