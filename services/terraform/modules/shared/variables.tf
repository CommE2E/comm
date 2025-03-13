variable "is_dev" {
  type    = bool
  default = false
}

variable "bucket_name_suffix" {
  type        = string
  default     = ""
  description = "Suffix added to all bucket names"
}

variable "vpc_id" {}

variable "cidr_block" {}

variable "subnet_ids" {}

variable "target_account_id" {
  type    = string
  default = ""
}
