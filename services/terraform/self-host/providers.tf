terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.32.0"
    }
    dotenv = {
      source  = "germanbrew/dotenv"
      version = "1.1.2"
    }
  }
}
