provider "aws" {
  region = var.region

  default_tags {
    tags = {
      managed_by = "terraform"
    }
  }
}
