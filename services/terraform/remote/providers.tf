terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.7.0"
    }

    sops = {
      source  = "carlpett/sops"
      version = "0.7.2"
    }

    random = {
      source  = "hashicorp/random"
      version = "3.5.1"
    }

    dotenv = {
      source  = "germanbrew/dotenv"
      version = "1.1.2"
    }
  }
}
