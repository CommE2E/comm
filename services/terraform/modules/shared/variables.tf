variable "is_dev" {
  type    = bool
  default = false
}

variable "bucket_name_suffix" {
  type        = string
  default     = ""
  description = "Suffix added to all bucket names"
}
